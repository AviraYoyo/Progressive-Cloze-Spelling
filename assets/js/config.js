/**
 * PCS — Config
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 全站唯一的設定來源。firebaseConfig 只在此處出現一次，
 * 其餘模組一律 import { PCS_CONFIG }。
 */

// ── Firebase SDK 版本（全站唯一，index.html 的 importmap 也用這個）──
export const FIREBASE_VERSION = '12.19.0';

/**
 * ★ 建置版本碼 —— 靜態網站的快取破壞用。
 *
 * 問題：這是沒有 build step 的靜態站，瀏覽器會長期快取 .js / .html。
 *   改了程式碼但使用者跑的是舊檔 → 「我明明修好了還是一樣錯」，
 *   而且無法從畫面看出來（症狀會被誤判成 rules 沒貼）。
 *
 * 解法：每個 HTML 開頭有一段同步檢查，比對 localStorage 裡的版本碼。
 *   不一致 → 強制 reload（並用 location.replace 繞過 history cache）。
 *
 * ★ 改任何程式碼之後，**務必把這裡的數字 +1**，否則使用者不會拿到新檔案。
 */
export const BUILD_ID = '2026-11-25-r75';

// ── Firebase 設定 ──
// ★ storageBucket 雖然填了，但我們**不使用 Cloud Storage**
//   （2026-02-03 起必須付費 Blaze 方案）。單詞圖片改用 base64 存Firestore。
export const firebaseConfig = {
  apiKey: 'AIzaSyCi_avydz2jKgvZI_bApdtBhvr737KaPjk',
  authDomain: 'pc-spelling.firebaseapp.com',
  projectId: 'pc-spelling',
  storageBucket: 'pc-spelling.firebasestorage.app',
  messagingSenderId: '75348534463',
  appId: '1:75348534463:web:b8f1a4a999c9bbeb4f920a',
};

export const PCS_CONFIG = {
  firebase: firebaseConfig,

  /** 實驗參數 —— 老師可在後台覆寫（存在 Firestore config/experiment） */
  experiment: {
    version: 'v1.0',
    // 階梯
    maxLevels: 3,              // 每詞最多 3 關，超過 break
    // 回溯重測
    baseGap: 2,                // 答錯後隔幾個「新詞」回頭重測
    maxGap: 5,
    gapStrategy: 'linear',     // linear | exponential
    maxConsecutiveRetries: 2,  // 連續重測上限，避免一個詞佔滿整節課
    maxLives: 2,               // 同一格連錯幾次後顯示正確字母
    // 一局
    targetWords: 15,           // 一局目標詞數
    shuffleSeed: '2026a',      // 重現用
  },

  ui: {
    sound: true,
    speech: true,
    /* ★ 2026-11-20：en-GB → en-US。
       老師決定用「好听的美式女聲」，而且要是小孩设备出厂就有的那种：
       Apple 的 Samantha、Windows 的 Zira 都是系统自带（不用下载）。
       注意：这只影响「发音口音」，不影响拼写标准（仍是 BrE 拼法）。 */
    lang: 'en-US',
    speechRate: 0.78,          // 小學生跟讀，語速放慢（2026-11-20：0.85 → 0.78）
  },

  /** Firestore collection 名稱 */
  collections: {
    words: 'words',
    wordLists: 'wordLists',
    assignments: 'assignments',   // 課程（老師建立，學生用 PIN 進入）
    exposures: 'exposures',   // 核心研究資料
    sessions: 'sessions',
    // ★ 2026-10-16：公開排名板（Bug 2 的第二個根因）。
    //   sessions 的 rules 是 `allow read: if teacherOrList()` —— 學生（匿名）
    //   **讀不到**，所以即使 className 修好了，即時排名依然拉不到資料。
    //   但班級排名的本質就是把同班成績顯示出來，因此另開一個只含
    //   「排行榜上本來就看得見的欄位」的集合，read 放給已登入者；
    //   完整 sessions 仍鎖死，只有老師能讀。
    rankBoard: 'rankBoard',
    rosters: 'rosters',
    allocations: 'allocations',
    config: 'config',
    teachers: 'teachers',
    drafts: 'drafts',         // AI 生成的例句草稿，待老師確認
  },
};

/** 依 className 分組的實驗組別設定 */
export const GROUPS = {
  exp: { label: '實驗組（PCS）', labelEn: 'Experimental' },
  ctl: { label: '對照組（傳統方法）', labelEn: 'Control' },
};

/** 本機儲存的 key 前綴 */
export const STORAGE_PREFIX = 'pcs.';

/**
 * ★ 快取破壞檢查（同步版，不能用 import —— 必須在 module 載入前跑）。
 *
 * 為什麼需要：靜態站沒有 build step，瀏覽器會快取舊 .js。
 *   使用者看到的是舊程式碼，卻以為修正沒生效 —— 這次連續三次
 *   「修好了但還是一樣」都是這個原因，不是程式邏輯問題。
 *
 * 用法：放在每個 HTML 的 <head>，第一個 inline <script>：
 *   if (window.__pcsCheckBuild) window.__pcsCheckBuild('2026-11-25-r75');
 *
 * 行為：版本不一致 → 記錄新版本 → 強制重整（繞過 bfcache）。
 *   已一致 → 什麼都不做，不影響正常瀏覽。
 */
export function installBuildGuard(currentId) {
  const KEY = 'pcs.build';
  try {
    const seen = localStorage.getItem(KEY);
    if (seen === currentId) return false;

    localStorage.setItem(KEY, currentId);

    // 只有在「曾经載入過別的版本」時才重整，避免第一次開啟多跳一次。
    // 同時清掉 Firestore 本地快取，否則舊的詞庫資料會留在本地。
    if (seen && seen !== currentId) {
      try {
        // 讓 reload 一定拿到新檔案
        const url = location.pathname + location.search + '?_r=' + Date.now();
        location.replace(url);
      } catch { location.reload(); }
      return true;
    }
  } catch { /* private mode */ }
  return false;
}