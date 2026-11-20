/**
 * PCS — Offline Outbox
 * Progressive Cloze Spelling · CPI 2026
 *
 * 三層防線：
 *   Layer A  遊戲進度 → localStorage（重載/崩潰不丟）
 *   Layer B  待上傳作答 → IndexedDB outbox（冪等、背景重試）★ 本檔案
 *   Layer C  Firestore 本地快取 → 詞庫離線可讀（在 firebase.js）
 *
 * ★ 為什麼不只用 Firestore 內建離線佇列？
 *   內建佇列在「使用者清除網站資料」或「同步前分頁被關閉」時會丟，
 *   而且學生看不到「還有多少筆沒上傳」。對一個要產出論文資料的系統，
 *   看得見的 outbox + 冪等寫入值得多寫這150 行。
 */

const DB_NAME = 'pcs';
const STORE = 'outbox';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'key' });
        os.createIndex('queuedAt', 'queuedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  }));
}

const put = (rec) => tx('readwrite', s => s.put({ key: rec.exposureId, rec, queuedAt: Date.now(), tries: 0 }));
const del = (key) => tx('readwrite', s => s.delete(key));
const all = () => tx('readonly', s => s.getAll());
const count = () => tx('readonly', s => s.count());

/** 待上傳筆數（顯示在頂部徽章） */
export async function pendingCount() {
  try { return await count(); } catch { return 0; }
}

/**
 * 把一筆 exposure 排入上傳佇列。
 * ★ 同步、快速、永不失敗 —— 遊戲流程不應被網絡阻塞。
 */
export async function enqueue(rec) {
  try {
    await put(rec);
    scheduleFlush();
  } catch (e) {
    // IndexedDB 不可用（無痕模式等）→ 退回 localStorage 鏡像
    console.warn('[PCS] IndexedDB 不可用，改用 localStorage 鏡像', e);
    mirrorToLocalStorage(rec);
  }
}

/** localStorage 鏡像：IndexedDB 掛掉時的保險 */
function mirrorToLocalStorage(rec) {
  try {
    const key = 'pcs.outbox.mirror';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push(rec);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch { /* 配額滿了也沒辦法 */ }
}

/** 把鏡像裡的資料搬回來（下次登入時呼叫） */
export function drainMirror() {
  try {
    const key = 'pcs.outbox.mirror';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.removeItem(key);
    return arr;
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────
// Firestore 寫入（延遲載入 firebase.js，避免循環依賴）
// ─────────────────────────────────────────────────────────────
let firestoreMod = null;
async function getFirestore() {
  if (firestoreMod) return firestoreMod;
  try {
    const [fb, cfg] = await Promise.all([
      import('./firebase.js'),
      import('./config.js'),
    ]);
    firestoreMod = await fb.initFirestore();
    return firestoreMod;
  } catch (e) {
    console.warn('[PCS] Firestore 未就緒，資料留在本機', e?.message);
    return null;
  }
}

let flushing = false;
let flushTimer = null;
let backoff = 2000;

/**
 * 把 outbox 裡的資料寫到 Firestore。
 * ★ 冪等：用 set() 而非 add()，重試覆寫同一份 document。
 */
export async function flush() {
  if (flushing) return { ok: 0, failed: 0 };
  flushing = true;

  try {
    const items = (await all()) || [];
    if (!items.length) { updateBadge(0); return { ok: 0, failed: 0 }; }

    const fs = await getFirestore();
    if (!fs) return { ok: 0, failed: items.length };   // 還沒接上，保留資料

    const { mod, db } = fs;
    const { doc, setDoc, collection } = mod;
    const { PCS_CONFIG } = await import('./config.js');
    const col = collection(db, PCS_CONFIG.collections.exposures);

    // ★ authUid 必須在「寫入當下」取，不是組資料當下。
    //   Firestore rules 的 isStudentWrite() 比對 request.resource.data.authUid
    //   與 request.auth.uid，缺這個欄位（或不對）整份文件會被拒絕，
    //   症狀就是後台 Report 永遠是空的，但學生端沒有任何報錯。
    const fb = await import('./firebase.js');
    const authUid = fb.currentAuthUid();
    if (!authUid) {
      console.warn('[PCS] 尚未登入（匿名），先不寫入 Firestore');
      updateBadge(items.length, 'pending');
      return { ok: 0, failed: items.length };
    }

    let ok = 0, failed = 0;
    const failedKeys = [];

    for (const it of items) {
      try {
        // 8 秒逾時：不能讓 Firestore 卡住 UI
        await Promise.race([
          setDoc(doc(col, it.rec.exposureId), { ...it.rec, authUid, serverTs: Date.now() }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
        ]);
        await del(it.key);
        ok++;
      } catch (e) {
        failed++;
        failedKeys.push(it.key);

        // ★ 權限被拒就停止重試 —— 否則 25 台裝置會無限重試燒完 quota
        if (/permission-denied|PERMISSION_DENIED/i.test(e.message || '')) {
          console.error('[PCS] 權限被拒，停止重試 60 秒。請檢查 Firestore Rules。');
          failedKeys.forEach(k => reschedule(k));
          updateBadge(await pendingCount(), 'error');
          setTimeout(flush, 60_000);
          return { ok, failed };
        }
      }
    }

    failedKeys.forEach(k => reschedule(k));
    backoff = 2000;                       // 有成功就重設退避
    const left = await pendingCount();
    updateBadge(left, left ? 'pending' : 'ok');
    return { ok, failed };
  } catch (e) {
    console.warn('[PCS] flush 失敗', e);
    backoff = Math.min(backoff * 2, 30_000);
    scheduleFlush(backoff);
    return { ok: 0, failed: 1 };
  } finally {
    flushing = false;
  }
}

async function reschedule(key) {
  try {
    const items = (await all()) || [];
    const it = items.find(x => x.key === key);
    if (it) await put({ ...it.rec, key, queuedAt: it.queuedAt, tries: (it.tries ?? 0) + 1 });
  } catch { /* 忽略 */ }
}

/** 排程背景同步 */
function scheduleFlush(delay = 800) {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, delay);
}

// ─────────────────────────────────────────────────────────────
// UI 徽章
// ─────────────────────────────────────────────────────────────
/**
 * ★ 為什麼用「注入 t」而不是 import i18n.js？
 *
 *   各頁面用 `i18n.js?v=rNN` 載入模組，若這裡寫 `import './i18n.js'`，
 *   瀏覽器會視為**另一個 URL → 另一個模組實例**：那個實例的 `current`
 *   永遠停在初始值、`initLang()` 從沒在它身上跑過 → 切語言完全無效。
 *   而把 `?v=rNN` 硬編碼進本檔，下次升版漏改就會靜默退回英文（最難查）。
 *
 *   所以：本檔不依賴 i18n。頁面載入後呼叫 setBadgeTranslator(t) 注入，
 *   未注入時用內建英文兜底（安全失敗）。
 */
let translate = null;
let lastBadge = { n: 0, state: 'ok' };

const FALLBACK = {
  'sync.ok': 'Synced',
  'sync.pending': 'Saving {n}',
  'sync.error': 'Upload failed',
  'sync.okTitle': 'All answers have been uploaded to your teacher.',
  'sync.pendingTitle': '{n} answers are saved on this device and waiting to upload.\nClosing the tab will not lose them — they upload automatically when the connection returns.',
  'sync.errorTitle': 'Answers are saved on this device but cannot reach the server. Check the connection, or ask your teacher to check the Security Rules.',
};

function T(key, vars) {
  if (translate) return translate(key, vars);
  let s = FALLBACK[key] ?? key;
  for (const [k, v] of Object.entries(vars || {})) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** ★ 由頁面注入 t()：注入後立刻重畫（ESM 求值順序讓本檔早於 initLang 執行） */
export function setBadgeTranslator(fn) {
  translate = typeof fn === 'function' ? fn : null;
  updateBadge(lastBadge.n, lastBadge.state);
}

/**
 * 更新同步徽章。
 * ★ 「N 筆待上傳」對老師來說是看不懂的字眼。
 *   改成直接說明：資料已安全存在這台裝置、正在等上傳。
 *   如果上傳失敗則明確說「失敗」並提示原因 —— 靜默停在「待上傳」
 *   會讓人以為資料遺失了。
 */
function updateBadge(n, state = 'ok') {
  lastBadge = { n, state };
  const badge = document.getElementById('syncBadge');
  const text = document.getElementById('syncText');
  if (!badge || !text) return;

  badge.classList.remove('pending', 'error');
  if (state === 'error') {
    badge.classList.add('error');
    text.textContent = T('sync.error');
    badge.title = T('sync.errorTitle');
  } else if (n > 0) {
    badge.classList.add('pending');
    text.textContent = T('sync.pending', { n });
    badge.title = T('sync.pendingTitle', { n });
  } else {
    text.textContent = T('sync.ok');
    badge.title = T('sync.okTitle');
  }
}

/** 用真實待傳筆數重畫（頁面啟動時呼叫一次，不必等 20 秒定時器） */
export async function refreshBadge() {
  const n = await pendingCount();
  updateBadge(n, n > 0 ? 'pending' : 'ok');
}

// ─────────────────────────────────────────────────────────────
// 觸發時機
// ─────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { backoff = 2000; flush(); });
  // ★ 之前固定寫 updateBadge(1,'pending') → 0 筆待傳時也會顯示「儲存中 1」。
  //   離線只是「可能傳不上去」，不代表真的有待傳資料。
  window.addEventListener('offline', async () => {
    const n = await pendingCount();
    updateBadge(n, n > 0 ? 'pending' : 'ok');
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) flush();
  });

  // ★ 切換語言 → 立刻用同一份狀態重畫（不必等下一次 flush）
  document.addEventListener('pcs:lang-changed', () => {
    updateBadge(lastBadge.n, lastBadge.state);
  });

  // 首次進入：把徽章從 HTML 的佔位文字換成真實狀態
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { refreshBadge(); }, { once: true });
  } else {
    refreshBadge();
  }

  // 課堂中每 20 秒背景同步
  setInterval(() => { if (navigator.onLine && document.visibilityState === 'visible') flush(); }, 20_000);
}

/** session 結束時強制同步 */
export async function flushNow() {
  return flush();
}

/** 課堂開始時：把鏡像資料搬回來 */
export async function recoverMirror() {
  const mirrored = drainMirror();
  for (const rec of mirrored) {
    try { await put(rec); } catch { /* 忽略 */ }
  }
  if (mirrored.length) scheduleFlush();
  return mirrored.length;
}

export const outbox = {
  enqueue, flush, flushNow, pendingCount, recoverMirror, drainMirror,
  setBadgeTranslator, refreshBadge,
};