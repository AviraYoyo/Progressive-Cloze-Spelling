/**
 * PCS — Firebase Bootstrap
 * Progressive Cloze Spelling · CPI 2026
 *
 * 只做初始化，不含業務邏輯。SDK 版本集中在 config.js。
 * ★ 2026-10-21：SDK 從本地 assets/vendor/firebase/ 載入，且**全站只能有一種 URL 形式**
 *   （用 sdkUrl() 統一產生）—— 見下方雙斜槓事故的說明。
 */

import { firebaseConfig, FIREBASE_VERSION, PCS_CONFIG } from './config.js';

let app = null;
let auth = null;
let db = null;
let ready = null;

// ★★★ 學生端與老師端必須用「不同的 Firebase app」。
//
//  問題：同一個瀏覽器（同一次登入）如果先開老師後台再開學生頁，
//  兩邊會共用同一份登入狀態。老師是 Google/Email 登入 →
//  學生端 `if (!auth.currentUser)` 判斷為「已登入」→ 不做匿名登入 →
//  學生的作答寫入時 request.auth 是老師帳號，
//  rules 的 isAnonymous() 判定失敗 → **每一筆都被拒絕**。
//  症狀：學生端一直顯示「N 筆待上傳」，後台 Results 永遠是空的。
//
//  解法：學生端用名字不同的 app（[DEFAULT] 給老師，'student' 給學生）。
//  兩個 app 的登入狀態完全獨立，互不干擾。
const TEACHER_APP = '[DEFAULT]';
const STUDENT_APP = 'pcs-student';

// ★ 2026-10-16：SDK 改為本地 vendor（原本打 gstatic CDN，內地學校網絡常屏蔽 → 後台全掛）。
//   升級 SDK：替換 assets/vendor/firebase/ 裡的檔案 + 更新 config.js 的 FIREBASE_VERSION。
//
// ★★★ 2026-10-21 修復重大 bug：這裡原本是
//       const base = new URL('../vendor/firebase/', import.meta.url).href;   // 結尾自帶 "/"
//       return import(`${base}/${sdk}`);                                     // 又多一個 "/"
//     → 實際 URL 變成 ".../vendor/firebase//firebase-app.js"（**雙斜槓**）。
//     而其他模組（auth.js / leaderboard.js / analytics.js / admin.html）用的是
//     new URL('../vendor/firebase/x.js', …) → 單斜槓。
//     ES module 的 URL 是「字串嚴格比對」→ 同一份 SDK 被求值兩次 →
//     **兩個互相不認識的模組實例**。症狀：
//       · Firestore：`Expected first argument to collection() to be a
//         CollectionReference, a DocumentReference or FirebaseFirestore`
//         → Results / assignments 全部讀不到，看起來像「資料全沒了」（其實都在）
//       · Auth：兩個 auth 實例，popup 授權回來的 eventId 對不上 →
//         Google 登入一律 "The requested action is invalid."
//     現在全部走 new URL() 正規化，保證只有一種 URL、只有一份模組。
function sdkUrl(sdk) {
  return new URL(`../vendor/firebase/${sdk}`, import.meta.url).href;
}

async function load(sdk) {
  return import(sdkUrl(sdk));
}

/** 給其他模組共用：保證全站只會用「同一個 URL」載入 SDK */
export { sdkUrl };

/**
 * 取得（或建立）指定名稱的 app。
 * ★ 冪等：同一個名字重複呼叫不會拋 app/duplicate-app。
 */
async function getOrCreateApp(name, config) {
  const { getApp, getApps, initializeApp } = await load('firebase-app.js');
  const existing = getApps().find(a => a.name === name);
  return existing || initializeApp(config, name);
}

/**
 * 初始化 Firebase。
 * 學生端用匿名登入（signInAnonymously），免費且無限額。
 */
/**
 * 初始化 Firebase。
 *
 * @param {object}  o
 * @param {boolean} o.signIn   true = 學生端（用獨立的 student app + 匿名登入）
 *                            false = 老師端（用預設 app + Email/Google）
 */
export async function initFirebase({ signIn = true } = {}) {
  if (ready) {
    // ★ 一致性檢查：同一個頁面只該用一種身分。
    //   若學生端呼叫 initFirebase({signIn:false})，會把 teacher app 設成單例，
    //   導致後續的學生寫入被 rules 拒絕（症狀：一直「N 筆待上傳」）。
    //   這裡直接說清楚，而不是默默給錯身分。
    if (ready.role !== (signIn ? 'student' : 'teacher')) {
      console.warn(
        `[PCS] initFirebase 身分不一致：已初始化為 ${ready.role}，`
        + `現在要求 ${signIn ? 'student' : 'teacher'}。`
        + `學生端請改用 initFirestore()。`
      );
    }
    return ready;
  }

  ready = (async () => {
    const [{ getAuth, signInAnonymously }] = await Promise.all([
      load('firebase-auth.js'),
    ]);

    // ★ 學生端用獨立 app，老師端用預設 app —— 登入狀態互不干擾。
    app = signIn
      ? await getOrCreateApp(STUDENT_APP, firebaseConfig)
      : await getOrCreateApp(TEACHER_APP, firebaseConfig);
    auth = getAuth(app);

    if (signIn) {
      // ★ 學生端必須是「匿名」身分。
      //   若這台機器已有其他登入（例如老師後台），要先登出，
      //   否則 rules 的 isAnonymous() 會拒絕所有學生的寫入。
      const stillAnonymous = auth.currentUser
        && auth.currentUser.isAnonymous;
      if (!stillAnonymous) {
        try {
          if (auth.currentUser) await auth.signOut();
          await signInAnonymously(auth);
        } catch (e) {
          console.warn('[PCS] 匿名登入失敗（離線？或未啟用 Anonymous）', e?.message);
        }
      }
    }

    const { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } =
      await load('firebase-firestore.js');

    try {
      // 本地快取 → 詞庫離線可讀
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      db = getFirestore(app);       // 已被初始化過就退回
    }

    return { app, auth, db };
  })();

  ready.role = signIn ? 'student' : 'teacher';
  return ready;
}

/**
 * 取得 Firestore 模組（outbox 需要寫入）。
 * ★ 回傳 { mod, db }：
 *   mod = 整個 SDK 模組物件（含 doc / setDoc / collection / query…）
 *   db  = Firestore 實例
 *   ★ 不要把 db 掛在模組物件上 —— ES module 的 namespace 物件是 frozen 的，
 *     `mod.db = db` 會直接拋 TypeError，joinAssignment 整條流程就死掉，
 *     症狀是學生端「Cannot reach the class. Check your connection.」
 */
/**
 * ★ 拿到（或補回）匿名身分。
 *
 * 為什麼要單獨抽出來：
 *   舊版的匿名登入寫在 `if (!db) { ... }` 裡面，而且錯誤被 try/catch 吞掉。
 *   只要第一次登入失敗（開頁瞬間網路還沒好、從 bfcache 回來時 token 掉了），
 *   `db` 已經建好、下次呼叫就不會再試 → 這個分頁**永遠是「未登入」**，
 *   於是 rankBoard 的讀取被 rules 拒絕、寫入也全部失敗
 *   （症狀：排行榜突然變「Waiting for other pupils…」，而且不會自己好）。
 *
 * @returns {Promise<boolean>} true = 現在確實有匿名身分
 */
async function ensureAnonymous(au) {
  if (au.currentUser?.isAnonymous) return true;
  const { signInAnonymously } = await load('firebase-auth.js');
  try {
    // ★ 學生端必須是「匿名」身分。
    //   若這台機器已有其他登入（例如老師後台），要先登出，
    //   否則 rules 的 isAnonymous() 會拒絕所有學生的寫入。
    if (au.currentUser) await au.signOut();
    await signInAnonymously(au);
    return true;
  } catch (e) {
    console.warn('[PCS] 匿名登入失敗（離線？或未啟用 Anonymous）', e?.message);
    return false;
  }
}

export async function initFirestore() {
  const mod = await load('firebase-firestore.js');
  const { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = mod;

  if (!db) {
    // ★ 一律用學生 app（outbox 只在學生端呼叫）
    const app = await getOrCreateApp(STUDENT_APP, firebaseConfig);

    const { getAuth } = await load('firebase-auth.js');
    auth = getAuth(app);
    await ensureAnonymous(auth);

    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      db = getFirestore(app);      // 已被初始化過就退回
    }
  } else if (!auth?.currentUser) {
    // ★ 補救路徑：db 已經存在但沒有身分（第一次登入失敗、或 token 過期被清掉）。
    //   不補這一段，這個分頁之後所有讀寫都會被 rules 拒絕，而且不會自癒。
    await ensureAnonymous(auth ?? getAuth(await getOrCreateApp(STUDENT_APP, firebaseConfig)));
  }

  return { mod, db };
}

/**
 * 目前的登入 uid。
 * ★ Firestore rules 比對 authUid 用 —— 沒有登入時寫入必定被拒。
 */
export function currentAuthUid() {
  return auth?.currentUser?.uid ?? null;
}

/**
 * ★ 清掉 Firestore 本地快取（IndexedDB + localStorage）。
 *
 *  為什麼需要：persistentLocalCache 會把讀過的資料留在瀏覽器。
 *   老師在後台按「全部刪除」後，伺服器真的空了，
 *   但下一次讀取會先命中本地快取 → **已刪除的資料又冒出來**。
 *   使用者看到的就是「我明明清空了，東西又跑回來」。
 *
 *  呼叫時機：Reset（清空資料）之後必須呼叫，否則介面顯示的仍是舊資料。
 */
export async function clearFirestoreCache() {
  const report = { terminate: false, idb: false, ls: false, ok: false };
  try {
    // ★ Firestore 的本地快取是「記憶體 + IndexedDB」。
    //   persistentLocalCache 預設存在 IndexedDB，分頁一關就沒了 ——
    //   但**同一個分頁內** SDK 仍會保留記憶體裡的快照，
    //   所以只刪 IndexedDB 不足以讓「已刪除的資料」消失。
    //   必須先 terminate() 讓 SDK 清掉記憶體狀態。
    const appMod = await load('firebase-app.js');
    const apps = appMod.getApps();
    for (const a of apps) {
      try {
        const { terminate } = await load('firebase-firestore.js');
        await terminate(a);
        report.terminate = true;
      } catch (e) {
        // 該 app 沒啟用 Firestore（例如只有 Auth）→ 忽略
      }
    }

    // ★ Firestore persistence 用的是動態命名的 IndexedDB（帶 appId/資料庫名），
    //   名稱不固定，所以列出所有資料庫，把 firebase 開頭（非 firebaseLocalStorage）的
    //   一律刪掉 —— 那就是 Firestore 的快取。
    const kill = (db) => new Promise((resolve) => {
      try {
        const req = indexedDB.deleteDatabase(db);
        req.onsuccess = req.onerror = req.onblocked = () => resolve(true);
        setTimeout(() => resolve(false), 1500);
      } catch { resolve(false); }
    });

    try {
      const dbs = await indexedDB.databases?.();
      if (Array.isArray(dbs)) {
        for (const d of dbs) {
          const n = String(d.name || '');
          if (/firebase/i.test(n) && !/LocalStorage/i.test(n)) {
            if (await kill(n)) report.idb = true;
          }
        }
      }
    } catch { /* Safari 舊版沒有 databases() */ }

    // 清掉 localStorage 裡的 SDK 持久化標記
    try {
      const keys = Object.keys(localStorage).filter(k => /firestore|firebase-db/i.test(k));
      keys.forEach(k => localStorage.removeItem(k));
      report.ls = keys.length > 0;
    } catch { /* ignore */ }

    // ★ 模組層級的單例也要作廢，否則下次呼叫會拿到舊的 db 實例
    //   （那個實例還握著已終止的快取）。
    app = null; auth = null; db = null; ready = null;

    report.ok = true;
    return report;
  } catch (e) {
    console.warn('[PCS] 清本地快取失敗', e?.message);
    return report;
  }
}

export const firebaseReady = () => ready;
export const collections = PCS_CONFIG.collections;