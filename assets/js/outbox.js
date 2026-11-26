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
 * ★★ r81：認出「伺服器拒絕」的錯誤。
 *
 *   舊碼只比對 `e.message` 裡的 permission-denied，但 Firestore v9 的寫法錯誤是
 *   `e.code === 'permission-denied'`、message 只有 "Missing or insufficient
 *   permissions." —— 所以「被安全規則拒絕」從來沒被認出來，只會被當成一般失敗：
 *   每一輪 flush 都重試、徽章永遠停在「儲存中 N」。
 *   老師看到的就正是這個：明明沒在存，卻一直顯示 Saving 34。
 */
function isDenied(e) {
  const code = String(e?.code || '');
  const msg = String(e?.message || '');
  return code === 'permission-denied'
    || /permission[-_ ]denied|insufficient permissions/i.test(msg);
}

/** 重試也不會成功的錯誤（資料格式 / 規則 / 前置條件）→ 立刻停止猛打伺服器 */
function isPermanent(e) {
  const code = String(e?.code || '');
  return isDenied(e) || code === 'invalid-argument' || code === 'failed-precondition';
}

/** 佇列裡最舊那筆等了多久（毫秒）—— 用來分辨「網路慢」和「卡住了」 */
async function oldestAgeMs() {
  try {
    const items = (await all()) || [];
    if (!items.length) return 0;
    const oldest = items.reduce((m, it) => Math.min(m, it.queuedAt || Date.now()), Infinity);
    return Date.now() - oldest;
  } catch { return 0; }
}

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
    const failedItems = [];
    let permanent = null;
    let timeoutHit = false;

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
        failedItems.push(it);
        // ★ 權限被拒 / 格式被拒就別再往下打（25 台裝置會把 quota 燒完），
        //   但也**不能丟掉資料** —— 留在 outbox，規則修好後會自己傳上去。
        if (isPermanent(e)) { permanent = e; break; }
        // ★ r82：第一個就逾時 → 代表現在根本連不上，後面每一筆再等 8 秒
        //   只是白等（3 筆 = 24 秒）；直接收工，下一次 flush 再一起試。
        if (String(e?.message) === 'timeout') { timeoutHit = true; break; }
      }
    }
    failedItems.forEach(reschedule);
    backoff = 2000;                       // 有成功就重設退避
    // 逾時 = 現在連不上 → 4 秒後自己再試一次（不必等 20 秒的定時器）
    if (timeoutHit) scheduleFlush(4000);

    const left = await pendingCount();
    if (!left) { updateBadge(0, 'ok'); return { ok, failed }; }

    if (permanent) {
      // ★★ r82：這裡是「伺服器真的拒絕」，不是「網絡慢」。
      //   最常見的原因：Security Rules 與現在的資料格式不一致
      //   （例：schemaVersion / mode / probes 數量）。
      //   把 code 與第一筆的 document id 印出來，才有辦法查。
      lastError = {
        code: String(permanent.code || 'permission-denied'),
        message: String(permanent.message || ''),
        sampleId: failedItems[0]?.key || '',
        sampleWord: failedItems[0]?.rec?.word || '',
        at: Date.now(),
      };
      console.error('[PCS] 伺服器拒絕寫入（資料仍留在本機 outbox）', lastError);
      updateBadge(left, 'error');
      setTimeout(() => { flush(); }, 60_000);   // 規則修好後自動恢復
      return { ok, failed };
    }

    // ★★ r82：不再把「等了兩分鐘」當成「上傳失敗」。
    //   實測：學生機 Wi-Fi 弱的時候，一筆 write 可以 10 秒才拿到 ack，
    //   資料其實一直安全躺在 outbox（也常常在下一輪就全部傳完）。
    //   把它標成紅色 "Upload failed" 只會嚇到老師，而且事後看 Results
    //   資料明明是完整的 —— 於是「失敗」變成一個沒人相信的訊號。
    //   現在：只有「伺服器拒絕」才是紅色；網路慢是琥珀色的 "Still saving"。
    const stuck = navigator.onLine !== false && (await oldestAgeMs()) > 120_000;
    updateBadge(left, stuck ? 'slow' : 'pending');
    if (stuck) backoff = Math.min(backoff * 2, 30_000);
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

/**
 * 把失敗的那筆「原封不動」放回去，只把 tries +1。
 * ★ 舊碼是重新 put 一次 → queuedAt 被蓋成現在、tries 歸零，
 *   結果「等了多久」永遠是 0，也分不出重試了幾次。
 */
async function reschedule(it) {
  try {
    await tx('readwrite', s => s.put({ ...it, tries: (it.tries ?? 0) + 1 }));
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
/** 最後一次「伺服器拒絕」的細節（給 tooltip / console 診斷用） */
let lastError = null;

const FALLBACK = {
  'sync.ok': 'Synced',
  'sync.pending': 'Saving {n}',
  'sync.slow': 'Still saving {n}',
  'sync.error': 'Upload failed ({n})',
  'sync.okTitle': 'All answers have been uploaded to your teacher.',
  'sync.pendingTitle': '{n} answers are saved on this device and waiting to upload.\nClosing the tab will not lose them — they upload automatically when the connection returns.',
  'sync.slowTitle': 'The answers are saved on this device, but the server has not confirmed them yet — usually a weak Wi-Fi signal.\nThey will upload automatically. Tap this badge to try again now.',
  'sync.errorTitle': 'The server refused these answers (Security Rules), so they stay on this device.\nAsk your teacher to check the Firestore rules.',
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
    // ★ r81：帶上筆數 —— 只看「上傳失敗」會不知道有多少筆受影響
    text.textContent = T('sync.error', { n });
    // ★ r82：把伺服器實際回的原因附在 tooltip，才有辦法查（rules / 格式）
    badge.title = T('sync.errorTitle')
      + (lastError ? `\n\n${lastError.code}${lastError.sampleId ? ` · ${lastError.sampleId}` : ''}` : '');
  } else if (state === 'slow') {
    // ★ r82：網路慢 ≠ 上傳失敗。資料一直在 outbox，下一輪就會傳完。
    badge.classList.add('pending');
    text.textContent = T('sync.slow', { n });
    badge.title = T('sync.slowTitle');
  } else if (n > 0) {
    badge.classList.add('pending');
    text.textContent = T('sync.pending', { n });
    badge.title = T('sync.pendingTitle', { n });
  } else {
    text.textContent = T('sync.ok');
    badge.title = T('sync.okTitle');
  }
}

/** 診斷用：Console 裡打 pcsSyncStatus() 就能看到佇列狀態與被拒原因 */
export function syncStatus() {
  return { pending: lastBadge.n, state: lastBadge.state, lastError };
}
if (typeof window !== 'undefined') window.pcsSyncStatus = syncStatus;

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

  // ★ r82：點徽章 = 立刻重試（不必等 20 秒的定時器）。
  //   學生機常常「看起來沒在動」，給一個可以按的動作比解釋一堆有用。
  const badgeEl = document.getElementById('syncBadge');
  if (badgeEl) {
    badgeEl.style.cursor = 'pointer';
    badgeEl.addEventListener('click', () => { if (lastBadge.n > 0) flush(); });
  }

  // 首次進入：把徽章從 HTML 的佔位文字換成真實狀態
  // ★ r81：顯示完真實筆數後**立刻補傳一次** —— 上次（例如規則壞掉那天）
  //   卡住的資料不該等到有新作答、或 20 秒的定時器才開始傳。
  const boot = async () => {
    await refreshBadge();
    scheduleFlush(1200);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
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
  setBadgeTranslator, refreshBadge, syncStatus,
};