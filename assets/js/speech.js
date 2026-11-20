/**
 * PCS — Speech
 * Progressive Cloze Spelling · CPI 2026
 *
 * 用 speechSynthesis 朗讀例句與目標詞。
 *
 * ★ iOS Safari 的已知問題與對策（Phase 3 必須在真實 iPad 測）：
 *   1. getVoices() 首次呼叫常回傳空陣列 → 內建 TTS 自檢 + 等待 voiceschanged
 *   2. speak() 必須在**同步的使用者手勢**中呼叫，任何 setTimeout 都會令它靜默失效
 *      → 所有 speak 呼叫都直接綁在 click/touchstart 的同步流程裡
 *   3. iPad 靜音模式會靜音 TTS → 登入頁提示老師確認
 *   4. 部分 iPad 無 en-GB 語音 → 退回 en-US，再退回任何 en
 */

const S = {
  voices: [],
  ready: false,
  unlocked: false,
  warned: false,
  logged: false,
};

/** 載入語音清單（iOS 需要等 voiceschanged） */
function loadVoices() {
  if (!('speechSynthesis' in window)) return [];
  const v = speechSynthesis.getVoices();
  if (v.length) {
    S.voices = v;
    S.ready = true;
  }
  return v;
}

if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    loadVoices();
    document.dispatchEvent(new CustomEvent('pcs:voices-ready'));
  });
  // Safari 舊版不支援 addEventListener，用 property fallback
  if (!speechSynthesis.addEventListener) {
    speechSynthesis.onvoiceschanged = () => {
      loadVoices();
      document.dispatchEvent(new CustomEvent('pcs:voices-ready'));
    };
  }
}

/* ─────────────────────────────────────────────────────────────
   ★ 2026-11-20：挑「女聲」。
   ─────────────────────────────────────────────────────────────
   症狀：老師說「不要原先這個男聲」。
   原因：舊版只挑「第一個 en-GB」—— iPad / macOS 的 en-GB 預設是
        **Daniel（男聲）**，所以永遠挑到男的。Chrome 亦然（Google UK English Male）。
   作法：不再「取第一個」，改成打分數：
        · 語言要對（en-GB > en-US > 其他 en）
        · 名稱含 female / 女性名字 → 加分；含 male / 男性名字 → 重扣
        · local（離線、延遲低）、enhanced/premium → 小幅加分
   取最高分。這樣在 iPad、Mac、Chrome、Windows 上都會落到女聲。
   ───────────────────────────────────────────────────────────── */

/** 常見的女聲名字（Apple / Microsoft / Google 三邊的交集） */
const FEMALE_NAMES = new Set([
  'female', 'samantha', 'karen', 'moira', 'tessa', 'fiona', 'serena', 'kate', 'stephanie',
  'martha', 'alison', 'libby', 'sonia', 'hazel', 'ava', 'susan', 'allison', 'victoria',
  'zoe', 'nicky', 'joelle', 'zira', 'aria', 'jenny', 'emma', 'salli', 'kendra', 'kimberly',
  'ivy', 'amy', 'olivia', 'sophie', 'nora', 'michelle', 'catherine', 'matilda', 'veena',
  'paulina', 'alice', 'amelie', 'anna', 'carmit', 'ellen', 'ioana', 'laura', 'lekha',
  'luciana', 'mariska', 'melina', 'milena', 'sara', 'satu', 'yelda', 'yuna', 'clara',
]);

/** 常見的男聲名字 —— 名字出現就重扣，避免又被挑成男聲 */
const MALE_NAMES = new Set([
  'male', 'daniel', 'alex', 'tom', 'fred', 'aaron', 'arthur', 'oliver', 'nathan',
  'evan', 'lee', 'gordon', 'reed', 'rocko', 'junior', 'ralph', 'albert', 'bruce',
  'diego', 'james', 'john', 'matthew', 'mark', 'david', 'george', 'guy', 'liam',
  'rishi', 'thomas', 'xander', 'jorge', 'juan', 'paul', 'peter', 'russell', 'eddy',
]);

/** 名稱 → 小寫單詞（"Google UK English Female" → [google, uk, english, female]） */
function voiceTokens(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/** 性別傾向：正數＝女、負數＝男 */
function genderScore(name) {
  const toks = voiceTokens(name);
  let s = 0;
  if (toks.some(t => FEMALE_NAMES.has(t))) s += 50;
  if (toks.some(t => MALE_NAMES.has(t))) s -= 70;
  // "English (Female)" 這種寫法被上面括號清掉了，再補一次全文比對
  if (/female/i.test(name)) s += 25;
  return s;
}

/** 給單一語音打分；非英文語音直接淘汰（-Infinity） */
function voiceScore(v, lang) {
  const vl = String(v.lang || '').replace('_', '-').toLowerCase();
  const want = String(lang).toLowerCase();
  let s = 0;
  if (vl === want) s += 40;
  else if (vl.startsWith(want.split('-')[0])) s += 20;
  else return -Infinity;

  s += genderScore(v.name);
  if (v.localService) s += 8;                       // 離線可用、延遲低
  if (/enhanced|premium|neural|natural|siri/i.test(v.name)) s += 12;  // 音質更好
  return s;
}

/** 挑最合適的語音（預設英文女聲） */
function pickVoice(lang = 'en-GB') {
  if (!S.voices.length) loadVoices();
  const v = S.voices;
  if (!v.length) return null;

  let best = null;
  let bestScore = -Infinity;
  for (const x of v) {
    const s = voiceScore(x, lang);
    if (s > bestScore) { bestScore = s; best = x; }
  }
  if (best) return best;

  // 完全沒有 en-* 語音（罕見）→ 退回任何一個，總比沒有好
  return v[0] || null;
}

/** 語音是否可用（登入頁自檢用） */
export function speechStatus() {
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const voices = supported ? (S.voices.length ? S.voices : loadVoices()) : [];
  const voice = pickVoice();
  return {
    supported,
    voiceCount: voices.length,
    voiceName: voice?.name ?? null,
    voiceLang: voice?.lang ?? null,
    enGB: voices.some(x => x.lang === 'en-GB'),
    ready: supported && voices.length > 0,
  };
}

/**
 * ★ 必須在使用者手勢的同步流程中呼叫。
 * 不要用 setTimeout 包起來 —— iOS Safari 會靜默失效。
 */
function speak(text, { rate = 0.8, pitch = 1.02, lang = 'en-GB' } = {}) {
  if (!('speechSynthesis' in window)) return false;
  if (!text) return false;

  try {
    // 取消前一次，避免排隊
    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = pitch;
    u.volume = 1;
    u.lang = lang;
    const v = pickVoice(lang);
    if (v) u.voice = v;

    // ★ 只印一次：之後要確認「到底用了哪個聲音」時，
    //   console 一句 [PCS] voice = … 比對十張設定截圖快得多。
    if (!S.logged) {
      S.logged = true;
      console.info('[PCS] voice =', v ? `${v.name} (${v.lang})` : '(browser default)');
    }

    speechSynthesis.speak(u);
    S.unlocked = true;
    return true;
  } catch (e) {
    console.warn('[PCS] speech failed:', e);
    return false;
  }
}

/**
 * 朗讀「例句 + 目標詞」—— 這是 Proposal 附錄描述的行為：
 * 「If the user presses the button, it will read the entire sentence and the keyword again.」
 */
export function speakSentenceAndWord(sentence, word, opts = {}) {
  // 一次 utterance 裡串起來，中間加停頓，比兩次 speak() 更可靠
  // ★ 句子的目標詞放慢一點再唸一次（逗號＝短停頓），小朋友才聽得清尾音
  return speak(`${sentence} … ${word} … ${word}`, { rate: 0.78, ...opts });
}

/** 只朗讀例句 */
export function speakSentence(sentence, opts = {}) {
  return speak(sentence, { rate: 0.78, ...opts });
}

/**
 * 只朗讀目標詞（慢速，給學生跟讀）
 * ★ 2026-11-20：0.7 → 0.62。老師回報「太快、聽不清」，
 *   0.62 大約是一般成人朗讀的 0.7 倍速，仍是小學生能跟上的區間。
 */
export function speakWord(word, opts = {}) {
  return speak(word, { rate: 0.62, ...opts });
}

/** 朗讀字母（單個字母，用於逐格回饋時） */
export function speakLetter(letter, opts = {}) {
  return speak(letter, { ...opts, rate: 0.8 });
}

/** 停止朗讀 */
export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/** 在第一次真實互動時解鎖（iOS 要求） */
export function primeSpeech() {
  if (S.unlocked) return;
  // 播一個極短的無聲 utterance 以解鎖
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
    S.unlocked = true;
  } catch { /* 忽略 */ }
}

export const speech = {
  status: speechStatus,
  say: speak,
  sentenceAndWord: speakSentenceAndWord,
  sentence: speakSentence,
  word: speakWord,
  letter: speakLetter,
  stop: stopSpeaking,
  prime: primeSpeech,
};