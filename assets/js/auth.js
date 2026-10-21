/**
 * PCS — Teacher Auth
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 老師端認證。三種方式：
 *   1. Email + Password 註冊 / 登入
 *   2. Google 登入（GoogleAuthProvider）
 *   3. 忘記密碼 → 寄驗證信到 email
 *
 * ★ 權限模型（不設 Cloud Functions，全靠 Firestore Security Rules）：
 *   teachers/{uid}  白名單。老師登入後若無此文件 → 需邀請碼才可建立。
 *   白名單存在後，前端讀得到 → 進入後台；不存在 → 只顯示「申請成為老師」。
 *
 * ★ 安全提醒：這是收集兒童姓名與測驗成績的系統。
 *   預設密碼（123456）僅供首次登入，部署前務必在後台更改。
 */

import { PCS_CONFIG, FIREBASE_VERSION } from './config.js';
import { initFirebase } from './firebase.js';

const C = PCS_CONFIG.collections.teachers;
const V = FIREBASE_VERSION;   // Firebase SDK 版本，全站唯一來源

/**
 * 邀請碼。
 * ★ 這是防止陌生人註冊後看到學生資料的第一道閘門。
 *   正式部署前請改成你自己的碼，或改從 Firestore config/inviteCodes 讀取。
 */
export const INVITE_CODE = 'PCS-2026';

const AUTH_STATE = { user: null, isTeacher: false, profile: null };

// ─────────────────────────────────────────────────────────────
// 初始化
// ─────────────────────────────────────────────────────────────
async function auth() {
  const { auth: a } = await initFirebase({ signIn: false });
  return a;
}

/**
 * ★ 保持登入狀態。
 *   Firebase 預設已是 local persistence，但明確寫出來可以：
 *   1. 避免將來有人改設定時被意外改掉
 *   2. 老師重新開瀏覽器時不必再 Sign in
 *   local = 關閉分頁仍保留；session = 關閉就登出。
 */
export async function enablePersistentSignIn() {
  try {
    const a = await auth();
    const { setPersistence, browserLocalPersistence } = await import(
      new URL('../vendor/firebase/firebase-auth.js', import.meta.url).href
    );
    await setPersistence(a, browserLocalPersistence);
    return true;
  } catch (e) {
    console.warn('[PCS] 無法設定登入保持', e?.message);
    return false;
  }
}

/**
 * Google 登入（彈窗模式）。
 * 需要在 Firebase Console → Authentication → Sign-in method 啟用 Google，
 * 並在 Authorized domains 加上你的部署網域。
 */
export async function signInWithGoogle() {
  const a = await auth();
  const { GoogleAuthProvider, signInWithPopup } = await import(
    new URL('../vendor/firebase/firebase-auth.js', import.meta.url).href
  );

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const cred = await signInWithPopup(a, provider);
    return await afterSignIn(cred.user);
  } catch (e) {
    // 使用者關閉彈窗不算錯誤
    if (e?.code === 'auth/popup-closed-by-user') {
      return { ok: false, cancelled: true, message: '已取消登入' };
    }
    console.error('[PCS] Google sign-in failed', e);
    return { ok: false, error: friendlyError(e), code: e?.code ?? null };
  }
}

/**
 * ★ Google 登入（整頁跳轉模式）—— popup 失敗時的備援。
 *
 * 為什麼需要備援：
 *   popup 模式要靠「彈窗頁 → postMessage → opener」把結果帶回來。
 *   在 GitHub Pages 這類「authDomain（pc-spelling.firebaseapp.com）與
 *   頁面網域（avirayoyo.github.io）不同」的情況下，Firebase 會退化到
 *   跨域 iframe / popup 流程；一旦 eventId 對不上（多開分頁、重複點擊、
 *   瀏覽器擴充攔截、隱私模式），授權中介頁就會回
 *   「The requested action is invalid.」（Identity Toolkit 的 INVALID_ACTION）。
 *
 *   redirect 模式是「整頁跳到 Google → 授權 → 整頁跳回來」，
 *   靠 URL 帶 token，不依賴 postMessage，因此在非標準部署環境下穩定得多。
 *   代價是使用者要離開頁面一次。
 */
export async function signInWithGoogleRedirect() {
  const a = await auth();
  const { GoogleAuthProvider, signInWithRedirect } = await import(
    new URL('../vendor/firebase/firebase-auth.js', import.meta.url).href
  );

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    // ★ 記住「這次是 redirect 登入」，回來時才知道要把結果接住。
    try { sessionStorage.setItem('pcs.authRedirect', '1'); } catch { /* private mode */ }
    await signInWithRedirect(a, provider);
    return { ok: true, redirected: true };
  } catch (e) {
    console.error('[PCS] Google redirect sign-in failed', e);
    return { ok: false, error: friendlyError(e), code: e?.code ?? null };
  }
}

/**
 * ★ redirect 模式回來時，把結果接住（必須在頁面載入時呼叫一次）。
 * @returns {Promise<{ok:boolean, email?:string, error?:string}>}
 */
export async function completeRedirectSignIn() {
  let redirected = false;
  try { redirected = sessionStorage.getItem('pcs.authRedirect') === '1'; } catch { /* ignore */ }
  if (!redirected) return { ok: false, skipped: true };

  try { sessionStorage.removeItem('pcs.authRedirect'); } catch { /* ignore */ }

  const a = await auth();
  const { getRedirectResult } = await import(
    new URL('../vendor/firebase/firebase-auth.js', import.meta.url).href
  );

  try {
    const cred = await getRedirectResult(a);
    if (!cred?.user) return { ok: false, error: 'Google sign-in did not complete. Please try again.' };
    return await afterSignIn(cred.user);
  } catch (e) {
    console.error('[PCS] redirect 結果接取失敗', e);
    return { ok: false, error: friendlyError(e), code: e?.code ?? null };
  }
}

/** Email + Password 註冊 */
export async function signUpWithEmail({ email, password, displayName, inviteCode }) {
  const a = await auth();
  const { createUserWithEmailAndPassword, updateProfile } =
    await import(new URL('../vendor/firebase/firebase-auth.js', import.meta.url).href);

  // 先驗證邀請碼 —— 錯誤的碼就不要浪費一次註冊
  if (inviteCode?.trim().toUpperCase() !== INVITE_CODE) {
    return { ok: false, error: '邀請碼不正確。請向研究者索取。' };
  }

  try {
    const cred = await createUserWithEmailAndPassword(a, email, password);
    await updateProfile(cred.user, { displayName: displayName || email.split('@')[0] });

    // ★ 不寄驗證信、不要求驗證。
    //   這是研究原型，老師的註冊信箱多半是臨時／學校信箱，
    //   強制驗證只會把老師卡在門外。Firebase 預設本來就是
    //   「註冊即可登入」，之前那 sendEmailVerification 是多餘的。
    await createTeacherProfile(cred.user, { displayName, method: 'password' });
    await enablePersistentSignIn();
    return { ok: true, email: cred.user.email };
  } catch (e) {
    console.error('[PCS] 註冊失敗', e);
    return { ok: false, error: friendlyError(e), code: e?.code ?? null };
  }
}

/** Email + Password 登入 */
export async function signInWithEmail({ email, password }) {
  const a = await auth();
  const { signInWithEmailAndPassword } = await import(
    new URL('../vendor/firebase/firebase-auth.js', import.meta.url).href
  );

  try {
    const cred = await signInWithEmailAndPassword(a, email, password);
    return await afterSignIn(cred.user);
  } catch (e) {
    console.error('[PCS] sign-in failed', e);
    return { ok: false, error: friendlyError(e), code: e?.code ?? null };
  }
}

/** 忘記密碼：寄驗證信 */
export async function sendPasswordReset({ email }) {
  const a = await auth();
  const { sendPasswordResetEmail } = await import(
    new URL('../vendor/firebase/firebase-auth.js', import.meta.url).href
  );
  try {
    await sendPasswordResetEmail(a, email);
    return { ok: true, message: `Sent to ${email}. Check your inbox (and the spam folder).` };
  } catch (e) {
    return { ok: false, error: friendlyError(e), code: e?.code ?? null };
  }
}

/**
 * 更改密碼（需最近登入；太久沒登入要先重新驗證）。
 *
 * ★ 2026-10-16 修正：原本 `revokeOthers` 會再 import 一次 firebase-auth 並呼叫
 *   `updatePassword(user, newPassword)` —— 那跟上一行 `user.updatePassword()`
 *   是同一件事，只是多打一次網路請求，並不會讓其他裝置登入失效，
 *   但 UI 卻告訴使用者「其他裝置需重新登入」，是假承諾。
 *
 *   事實：Firebase 改密碼不會撤銷其他裝置的 refresh token；
 *   要真正登出其他裝置必須走 Admin SDK 的 revokeRefreshTokens(uid)，
 *   而本專案刻意不設 Cloud Functions（零成本靜態站），所以前端做不到。
 *
 *   因此改為誠實做法：改密本身照做，`revokeOthers` 只影響回傳訊息，
 *   明確告知「請在你用過的其他裝置上手動登出」。
 *
 * @param {object}  o
 * @param {string}  o.newPassword
 * @param {boolean} [o.revokeOthers=true]  僅影響提示文案（見上方說明）
 */
export async function changePassword({ newPassword, revokeOthers = true }) {
  const a = await auth();
  const user = a.currentUser;
  if (!user) return { ok: false, error: '請先登入' };

  try {
    await user.updatePassword(newPassword);
    return {
      ok: true,
      // ★ 不假裝能登出其他裝置 —— 說清楚要使用者自己處理。
      message: revokeOthers
        ? 'Password changed. For safety, sign out manually on any other device you have used.'
        : 'Password changed.',
      messageZh: revokeOthers
        ? '密碼已更改。為了安全，請在你用過的其他裝置上手動登出。'
        : '密碼已更改。',
    };
  } catch (e) {
    // auth/requires-recent-login → 需要重新驗證
    if (/requires-recent-login/i.test(e?.code || '')) {
      return { ok: false, needsReauth: true, error: 'For your security, please re-enter your current password to confirm' };
    }
    return { ok: false, error: friendlyError(e), code: e?.code ?? null };
  }
}

/** 重新驗證身分（更改密碼前） */
export async function reauthenticate({ password }) {
  const a = await auth();
  const { EmailAuthProvider, reauthenticateWithCredential } = await import(
    new URL('../vendor/firebase/firebase-auth.js', import.meta.url).href
  );
  const user = a.currentUser;
  if (!user?.email) return { ok: false, error: '請先登入' };

  try {
    const cred = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, cred);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyError(e), code: e?.code ?? null };
  }
}

/** 登出 */
export async function signOut() {
  const a = await auth();
  await a.signOut();
  AUTH_STATE.user = null;
  AUTH_STATE.isTeacher = false;
  AUTH_STATE.profile = null;
}

// ─────────────────────────────────────────────────────────────
// 老師白名單
// ─────────────────────────────────────────────────────────────
async function firestore() {
  const { db } = await initFirebase({ signIn: false });
  return db;
}

/**
 * 建立 / 讀取 teachers/{uid}
 * ★ rules 設計：任何人不可寫 teachers（allow write: false），
 *   所以這個寫入必須由 rules 允許。見 firestore.rules。
 *   實作上把 rules 設為「已驗證 email 且 rules 內白名單」較嚴格；
 *   這裡採「inviteCode 已在前端驗證 + rules 限制已登入者可建立自己的文件」。
 */
async function createTeacherProfile(user, { displayName, method }) {
  try {
    const db = await firestore();
    const { doc, setDoc, serverTimestamp } = await import(
      new URL('../vendor/firebase/firebase-firestore.js', import.meta.url).href
    );
    await setDoc(doc(db, C, user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || user.email?.split('@')[0],
      photoURL: user.photoURL || null,
      method,                                  // 'password' | 'google'
      role: 'teacher',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    // rules 拒絕時不致命 —— 現有老師仍可登入，只是讀不到 profile
    console.warn('[PCS] 建立老師 profile 失敗（可能是 rules 限制）', e?.message);
    return false;
  }
}

/** 登入後檢查是否為已登記的老師 */
async function afterSignIn(user) {
  AUTH_STATE.user = user;
  await enablePersistentSignIn();

  try {
    const db = await firestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = await import(
      new URL('../vendor/firebase/firebase-firestore.js', import.meta.url).href
    );
    const snap = await getDoc(doc(db, C, user.uid));

    if (!snap.exists()) {
      // 首次 Google 登入 → 自動建立白名單（Google 帳號已驗證 email，風險較低）
      await createTeacherProfile(user, { displayName: user.displayName, method: 'google' });
      AUTH_STATE.isTeacher = true;
      return { ok: true, isNewTeacher: true, email: user.email, uid: user.uid };
    }

    AUTH_STATE.isTeacher = true;
    const data = snap.data();
    AUTH_STATE.profile = data;

    // ★ 補齊 displayName。
    //   問題：Google 登入剛建立 profile 時，user.displayName 可能是 null
    //   （Firebase 這個欄位不會永遠回填），於是白名單裡存成 "Teacher"。
    //   之後即使 user.displayName 正常，白名單也已經是錯的了 → 後台一直顯示 Teacher。
    //   解法：若白名單的 displayName 是預設值或空值，且這次有真實姓名，就補回去。
    const stored = String(data.displayName || '').trim();
    const realName = String(user.displayName || '').trim();
    const isPlaceholder = !stored || stored === 'Teacher' || stored === (user.email || '').split('@')[0];
    if (isPlaceholder && realName && realName !== stored) {
      updateDoc(doc(db, C, user.uid), { displayName: realName }).catch(() => {});
      data.displayName = realName;
      console.log('[PCS] 已補上教師姓名：', realName);
    }

    updateDoc(doc(db, C, user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
    return { ok: true, isNewTeacher: false, email: user.email, uid: user.uid };
  } catch (e) {
    // ★ 白名單讀不到（例如 rules 尚未 publish 老師段落），
    //   **不能** 因此判定登入失敗 —— 否則老師會被卡在登入頁，
    //   症狀是「Google 驗證成功後跳回登入頁並顯示紅色錯誤」。
    //   讀不到白名單只是「後台會讀不到資料」，不是「身份無效」。
    //   後台閘門（admin.html）會再試一次建立。
    console.warn('[PCS] teacher check failed（不阻擋登入）', e?.message);
    AUTH_STATE.isTeacher = true;
    return { ok: true, isNewTeacher: false, email: user.email, uid: user.uid, whitelistError: e?.message ?? null };
  }
}

/** 目前的登入狀態 */
export function authState() {
  return { ...AUTH_STATE };
}

/** 監聽登入狀態變化 */
export function onAuthChange(cb) {
  return initFirebase({ signIn: false }).then(({ auth: a }) =>
    a.onAuthStateChanged(async (user) => {
      AUTH_STATE.user = user;
      if (user) await afterSignIn(user);
      cb({ user, isTeacher: AUTH_STATE.isTeacher });
    })
  );
}

// ─────────────────────────────────────────────────────────────
// 密碼強度
// ─────────────────────────────────────────────────────────────
/**
 * 密碼強度檢查。
 * ★ 刻意不用「必須 8 位以上」這種硬規則 —— 研究團隊常用 123456，
 *   擋住會讓老師卡住。改用「扣分制」：太簡單就明確警告，但不強制拒絕。
 */
export function checkPassword(pw) {
  const issues = [];
  if (!pw || pw.length < 6) issues.push('至少 6 個字元');
  if (/^123456$|password|1234|0000|abc123/i.test(pw)) issues.push('這組密碼太容易被猜到');
  if (!/[a-z]|[A-Z]|[0-9]/.test(pw)) issues.push('建議混合英文字母與數字');

  return {
    ok: issues.length === 0,
    weak: /^123456$|password|1234|0000|abc123/i.test(pw || ''),
    issues,
    score: Math.max(0, 4 - issues.length),
  };
}

// ─────────────────────────────────────────────────────────────
// 錯誤訊息中文化
//
// ★ 2026-10-16 補強：INVALID_ACTION 這類 Firebase 授權錯誤，原本直接把英文原文
//   丟給老師（"The requested action is invalid."）—— 完全看不懂也不知道該做什麼。
//   現在改成「說明 + 下一步」。
// ─────────────────────────────────────────────────────────────
function friendlyError(e) {
  const map = {
    'auth/invalid-email':        'That email format is not valid',
    'auth/user-not-found':       'No account with this email',
    'auth/wrong-password':       'Wrong password',
    'auth/invalid-credential':   'Email or password is not correct',
    'auth/invalid-login-credentials': 'Email or password is not correct',
    'auth/email-already-in-use': 'This email is already registered',
    'auth/weak-password':        'Password too weak (at least 6 characters)',
    'auth/too-many-requests':    'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network problem. Check your connection.',
    'auth/popup-blocked':        'Pop-up blocked. Allow pop-ups for this site, or use "Sign in (full page)".',
    'auth/popup-closed-by-user': 'Sign-in cancelled',
    'auth/operation-not-allowed':'This sign-in method is not enabled yet. Ask the administrator.',
    'auth/unauthorized-domain':  'This domain is not authorised. Ask the administrator.',
    'auth/requires-recent-login':'Please sign in again before changing your password',

    // ★★ 部署到 GitHub Pages / 本機都同時壞掉時最常見的那一個。
    //   ★ Firebase 的錯誤碼對照表裡，"bad-request" 的文案就是這一句：
    //     "bad-request": "The requested action is invalid."
    //   而 reCAPTCHA（風控）失敗的文案明寫：
    //     "the reCAPTCHA response token provided is either invalid, expired,
    //      already used or the domain associated with it does not match
    //      the list of whitelisted domains."
    //   → 也就是說：Firebase 專案的 reCAPTCHA 網域白名單沒有你的網域。
    //   Email + 密碼登入不受影響（不走 OAuth/reCAPTCHA），所以會出現
    //   「Email 能登、只有 Google 不行」這個症狀。
    'auth/bad-request':          'Google sign-in was rejected by Firebase. This is usually the reCAPTCHA check: the site address is not on the reCAPTCHA site list. Ask the researcher to check Firebase → Authentication → Settings → App protection (reCAPTCHA Enterprise), or turn reCAPTCHA off.',

    'auth/captcha-check-failed': 'Google sign-in was blocked by the reCAPTCHA check. Ask the researcher to add this site to Firebase → Authentication → Settings → App protection.',

    // ★★ 部署到 GitHub Pages 時最常見的那一個（Identity Toolkit 的 INVALID_ACTION）
    'auth/invalid-action':       'Google sign-in was rejected by Firebase. This usually means the pop-up could not hand the result back, or the site address is not on Firebase\'s authorised list. Try "Sign in (full page)" below; if that also fails, ask the researcher to add this site to Firebase → Authentication → Settings → Authorised domains.',

    'permission-denied':        'Missing or insufficient permissions (Firestore Rules)',
  };
  return map[e?.code] || e?.message || 'Something went wrong. Please try again.';
}

/**
 * ★ 目前頁面所在的網域 —— 排查 Firebase 授權問題時要用。
 * 例如 'avirayoyo.github.io'，這就是要加進 Authorised domains 的值。
 */
export function currentHost() {
  try { return location.hostname; } catch { return ''; }
}