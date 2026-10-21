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

/** 挑最合適的英式語音 */
function pickVoice(lang = 'en-GB') {
  if (!S.voices.length) loadVoices();
  const v = S.voices;
  if (!v.length) return null;

  const exact = v.find(x => x.lang === lang);
  if (exact) return exact;

  const region = lang.split('-')[0];
  const sameLang = v.filter(x => x.lang?.replace('_', '-').startsWith(region));
  // 優先 local（離線可用、延遲低）
  return sameLang.find(x => x.localService) || sameLang[0] || null;
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
function speak(text, { rate = 0.85, pitch = 1, lang = 'en-GB' } = {}) {
  if (!('speechSynthesis' in window)) return false;
  if (!text) return false;

  try {
    // 取消前一次，避免排隊
    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = pitch;
    u.lang = lang;
    const v = pickVoice(lang);
    if (v) u.voice = v;

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
  return speak(`${sentence} … ${word}`, opts);
}

/** 只朗讀例句 */
export function speakSentence(sentence, opts = {}) {
  return speak(sentence, opts);
}

/** 只朗讀目標詞（慢速，給學生跟讀） */
export function speakWord(word, opts = {}) {
  return speak(word, { ...opts, rate: 0.7 });
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