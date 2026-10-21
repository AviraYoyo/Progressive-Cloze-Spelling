/**
 * PCS — i18n
 * Progressive Cloze Spelling · CPI 2026
 *
 * ★ 語言策略
 *   這是英語教學工具，所以**預設英文**。
 *   右上角提供 中文 / EN 切換，讓看不懂英文介面的學生（或老師）
 *   能切到中文操作。
 *
 * ★ 絕不翻譯的東西（教學內容本身）：
 *   - 目標詞（apple / a post office）
 *   - 例句（I eat an apple every day.）
 *   - 錯誤診斷裡指出的字母（you missed the 3rd letter 'p'）
 *   - 單詞圖示
 *   這些是「考核內容」，翻譯會直接影響教學效果與研究效度。
 */

const STORAGE_KEY = 'pcs.lang';

const STRINGS = {
  en: {
    // ── 登入 ──
    'login.title': 'Progressive Cloze Spelling',
    'login.subtitle': 'Spelling practice for primary pupils',
    // ── 進入課程（PIN）──
    'app.title': 'Progressive Cloze Spelling',
    'app.tagline': 'Spell it. Hear it. Try again.',
    'join.pinLabel': 'PIN',
    'join.pinHint': 'Your teacher will show this on the board',
    'join.classNo': 'Student No.',
    // ★ 頂部身份晶片上的學號標籤（classNo 存的其實是學號，不是班級號）
    'chip.no': 'No.{n}',
    'join.name': 'Name',
    'join.start': 'Start',
    'join.finding': 'Finding your class…',
    'join.errBadPin': 'Please enter the 4-digit PIN from the board.',
    'join.errNotFound': 'That PIN was not found. Check with your teacher.',
    'join.errClosed': 'This class is closed. Ask your teacher for a new PIN.',
    'join.errEmpty': 'This class has no words yet.',
    'join.errNoClass': 'Please enter your Student No.',
    'join.errNoName': 'Please enter your name.',
    'join.errNetwork': 'Cannot reach the class. Check your connection.',
    'login.seatNo': 'Seat No.',
    'login.name': 'Name',
    'login.class': 'Class',
    'login.pickClass': 'Select class',
    'login.phase': 'Session',
    'login.classPractice': 'Class practice',
    'login.start': 'Start',
    'login.console': 'Teacher Console',
    'login.tryAudio': 'Test sound',
    'login.audioOk': 'Audio ready · British English',
    'login.audioLoading': 'Loading voices… tap again',
    'login.audioNone': 'No speech support here',
    'login.audioWarn': 'Ready · but no British voice',

    // ── 老師後台登入頁 admin-login.html（2026-10-16 補 i18n，Bug 9）──
    'auth.brand': 'Teacher Console',
    'auth.brandSub': 'Progressive Cloze Spelling · Researcher access',
    'auth.tabSignin': 'Sign in',
    'auth.tabSignup': 'Register',
    'auth.tabReset': 'Reset',
    'auth.email': 'Email',
    'auth.emailPh': 'Enter your email',
    'auth.password': 'Password',
    'auth.passwordPh': 'Enter your password',
    'auth.passwordNewPh': 'At least 6 characters',
    'auth.btnSignin': 'Sign in',
    'auth.or': 'or',
    'auth.btnGoogle': 'Sign in with Google',
    'auth.displayName': 'Display name',
    'auth.displayNamePh': 'e.g. Koo Ming',
    'auth.confirmPw': 'Confirm password',
    'auth.confirmPwPh': 'Enter it again',
    'auth.invite': 'Invite code',
    'auth.invitePh': 'Ask the researcher',
    'auth.inviteHint': 'Only invited teachers can register, to protect student data',
    'auth.pwHint': 'Mix letters and numbers',
    'auth.btnCreate': 'Create account',
    'auth.btnReset': 'Send reset link',
    'auth.btnBack': 'Back to sign in',
    'auth.noteTitle': '⚠️ Before first use',
    'auth.noteBody': 'This system collects student names and spelling results. Use a password only you know. Change the default password before deployment.',
    'auth.backLink': '← Back to student app',

    // ── 遊戲 ──
    'game.progress': 'Word {n} of {total}',
    'game.score': 'Correct',
    'game.retry': 'Try again',
    'game.check': 'Check',
    'game.next': 'Next',
    'game.skip': 'Skip',
    'game.finish': 'Finish',
    'game.tapToStart': 'Tap a box and type the missing letters',
    'game.needLetter': 'Fill in the missing letter',
    'game.needLetters': 'Fill in the {n} missing letters',
    'game.correct': 'Correct!',
    'game.wrongYouWrote': 'You wrote',
    'game.wrongAnswer': 'Correct answer',
    'game.skipped': 'Skipped',
    'game.listen': 'Listen to the sentence',
    'game.retrying': 'to review',
    'game.pendingReview': '{n} waiting',

    // ── 結算 ──
    'done.title': 'Well done!',
    'done.sub': 'You finished {n} words',
    'done.accuracy': 'Accuracy',
    'done.avgTime': 'Avg per letter',
    'done.words': 'Words',
    'done.correct': 'Letters correct',
    'done.recap': 'Words you practised',
    'done.back': 'Back',

    // ── 排名 ──
    'rank.title': 'Class Ranking',
    'rank.you': 'You',
    'rank.rank': 'Rank',
    'rank.points': 'Points',
    'rank.acc': 'Accuracy',
    'rank.waiting': 'Waiting for other pupils…',
    // ★ 2026-10-16：無法分組時的明確提示（正常流程不會出現，別讓學生以為網路壞了）
    'rank.noGroup': 'Ranking is not set up for this class yet. Ask your teacher.',
    'rank.readFail': 'Ranking could not be loaded right now. Check your connection, or ask your teacher to publish the Firestore rules.',
    'rank.howTitle': 'How to earn points',
    'rank.how1': '+10 for each correct letter',
    'rank.how3': '+5 for each letter you fix after a mistake (max +10)',
    'rank.how4': '+20 for finishing a whole word',
    'rank.refresh': 'Refresh',
  },

  zh: {
    // ── 登入 ──
    'login.title': 'Progressive Cloze Spelling',
    'login.subtitle': '小學英語拼寫練習',
    // ── 進入課程（PIN）──
    'app.title': '渐进式填空拼写',
    'app.tagline': '听一听、拼一拼、错了他告诉你',
    'join.pinLabel': 'PIN',
    'join.pinHint': '老师会在黑板显示这组号码',
    'join.classNo': '学号',
    // ★ 頂部身份晶片上的學號標籤（classNo 存的其實是學號，不是班級號）
    'chip.no': '学号 {n}',
    'join.name': '姓名',
    'join.start': '开始',
    'join.finding': '正在找你的班级…',
    'join.errBadPin': '请输入黑板上显示的 4 位数字。',
    'join.errNotFound': '找不到这组 PIN，请向老师确认。',
    'join.errClosed': '这节课已关闭，请向老师索取新的 PIN。',
    'join.errEmpty': '这节课还没有词。',
    'join.errNoClass': '请输入你的学号。',
    'join.errNoName': '请输入你的姓名。',
    'join.errNetwork': '连不上服务器，请检查网络。',
    'login.seatNo': '座號',
    'login.name': '姓名',
    'login.class': '班別',
    'login.pickClass': '請選擇班別',
    'login.phase': '測驗階段',
    'login.classPractice': '課堂練習',
    'login.start': '開始',
    'login.console': '老師控制台',
    'login.tryAudio': '試試語音',
    'login.audioOk': '語音可用 · 英式發音',
    'login.audioLoading': '正在載入語音…請再點一次',
    'login.audioNone': '此瀏覽器不支援語音',
    'login.audioWarn': '可用，但沒有英式語音',

    // ── 老師後台登入頁 admin-login.html（2026-10-16 補 i18n，Bug 9）──
    'auth.brand': '老師控制台',
    'auth.brandSub': '渐进式填空拼写 · 研究者专用',
    'auth.tabSignin': '登入',
    'auth.tabSignup': '注册',
    'auth.tabReset': '重设密码',
    'auth.email': '电子邮件',
    'auth.emailPh': '请输入你的电子邮件',
    'auth.password': '密码',
    'auth.passwordPh': '请输入密码',
    'auth.passwordNewPh': '至少 6 个字元',
    'auth.btnSignin': '登入',
    'auth.or': '或',
    'auth.btnGoogle': '使用 Google 帐号登入',
    'auth.displayName': '显示名称',
    'auth.displayNamePh': '例如 Koo Ming',
    'auth.confirmPw': '确认密码',
    'auth.confirmPwPh': '请再输入一次',
    'auth.invite': '邀请码',
    'auth.invitePh': '请向研究者索取',
    'auth.inviteHint': '只有受邀老師才能注册，以保护学生资料',
    'auth.pwHint': '建议混合英文字母与数字',
    'auth.btnCreate': '建立帐号',
    'auth.btnReset': '寄送重设連結',
    'auth.btnBack': '返回登入',
    'auth.noteTitle': '⚠️ 首次使用前',
    'auth.noteBody': '本系统会收集学生姓名与拼写成绩。请使用只有你知道的密码，并在部署前更改默认密码。',
    'auth.backLink': '← 返回学生端',

    // ── 遊戲 ──
    'game.progress': '第 {n} 個詞 / 共 {total} 個',
    'game.score': '答對',
    'game.retry': '再試一次',
    'game.check': '檢查',
    'game.next': '下一題',
    'game.skip': '跳過',
    'game.finish': '完成',
    'game.tapToStart': '點一個格子，輸入欠缺的字母',
    'game.needLetter': '把欠缺的字母填進去',
    'game.needLetters': '把 {n} 個欠缺的字母填進去',
    'game.correct': '答對了！',
    'game.wrongYouWrote': '你寫的是',
    'game.wrongAnswer': '正確答案',
    'game.skipped': '已跳過',
    'game.listen': '讀出例句',
    'game.retrying': '要複習',
    'game.pendingReview': '{n} 個待複習',

    // ── 結算 ──
    'done.title': '完成！',
    'done.sub': '你練完了 {n} 個詞',
    'done.accuracy': '正確率',
    'done.avgTime': '每字母平均',
    'done.words': '完成詞數',
    'done.correct': '答對字母',
    'done.recap': '你練過的詞',
    'done.back': '返回',

    // ── 排名 ──
    'rank.title': '班級排名',
    'rank.you': '你',
    'rank.rank': '名次',
    'rank.points': '分數',
    'rank.acc': '正確率',
    'rank.waiting': '等待其他同學…',
    // ★ 2026-10-16：無法分組時的明確提示（正常流程不會出現，別讓學生以為網路壞了）
    'rank.noGroup': '這個班還未設定排名，請向老師確認。',
    'rank.readFail': '排名暫時讀取不到，請檢查網絡，或請老師確認 Firestore 規則已發佈。',
    'rank.howTitle': '計分方式',
    'rank.how1': '每答對一個字母 +10',
    'rank.how3': '錯過但自己改正回來 +5（最多 +10）',
    'rank.how4': '完成整個詞 +20',
    'rank.refresh': '更新',
  },
};

let current = 'en';

// ── 語言偵測 ──
// ★ 一律預設英文，**不跟隨瀏覽器語言**。
//   這是英語教學工具，介面必須是學生看得懂的英文。
//   中文只能由使用者主動點「中文」按鈕切換。
//   （早期版本會跟隨 navigator.language，導致中文系統的使用者
//     看到中文介面 —— 已修正。）
function detect() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && STRINGS[saved]) return saved;
  return 'en';                    // ← 永遠英文，除非使用者自己選過
}

export function initLang() {
  current = detect();
  document.documentElement.lang = current === 'zh' ? 'zh-HK' : 'en';
  return current;
}

export const getLang = () => current;

/** 取得翻譯；支援 {n} 佔位符 */
export function t(key, vars = {}) {
  const table = STRINGS[current] ?? STRINGS.en;
  let s = table[key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

/** 切換語言並重繪 */
export function setLang(lang) {
  if (!STRINGS[lang]) return current;
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
  // 通知頁面重繪
  document.dispatchEvent(new CustomEvent('pcs:lang-changed', { detail: { lang } }));
  return current;
}

export function toggleLang() {
  return setLang(current === 'en' ? 'zh' : 'en');
}

/**
 * 自動翻譯 DOM。
 * 用法：<span data-i18n="game.check"></span>
 */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    // 格式：data-i18n-attr="placeholder:login.pickClass,aria-label:game.listen"
    for (const pair of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pair.split(':').map(s => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}

/**
 * 建立語言切換按鈕（右上角）。
 * 呼叫時傳入要掛載的容器。
 */
export function mountLangToggle(container, opts = {}) {
  const btn = document.createElement('button');
  btn.className = 'lang-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Switch language');

  const render = () => {
    // 顯示「要切過去的語言」，而不是當前語言
    btn.textContent = current === 'en' ? '中文' : 'EN';
    btn.dataset.next = current === 'en' ? 'zh' : 'en';
  };
  render();

  btn.addEventListener('click', () => {
    toggleLang();
    render();
    opts.onChange?.(current);
  });

  // 語言被別處改動時也更新
  document.addEventListener('pcs:lang-changed', render);

  container.appendChild(btn);
  return btn;
}

/**
 * 綁定可翻譯的動態元素。
 * 每次 render() 後呼叫一次，會套用 data-i18n。
 */
export function bindDynamic(root) {
  applyI18n(root);
}