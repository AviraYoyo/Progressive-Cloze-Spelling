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
  lastStart: 0,       // 最近一次「真的開始出聲」的時間（0 = 從沒成功過）
  lastError: null,
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
   ★ 2026-11-20：改成「美式女聲，而且要出廠就有」
   ─────────────────────────────────────────────────────────────
   老師的需求（原話）：好听的美式、最好不用提前安装、小孩的设备直接能用。

   所以判斷順序是：
     ① 一律排除「列得出來但播不出聲」的語音
        —— macOS 上 Eddy / Flo / Sandy / Shelley / Grandma / Grandpa /
           Reed / Rocko 這一族，以及 Bells / Boing / Zarvox 這類趣味音效，
           Chrome 會顯示已開始朗讀，實際上是靜音（Mac 上沒聲音就是這個原因）。
     ② 語言優先 en-US（美式），其次其他 en
     ③ 指名優先「出廠就裝好」的常見女聲：
        Samantha（Apple 全系列預設）、Zira（Windows 10/11 預設）、
        Ava / Allison / Susan / Karen（Apple 常見安裝項）
     ④ 本地語音加分、系統預設加分；網路語音（Google 系列）扣分
        —— 內地學校常把 translate.googleapis.com 擋掉，網路語音等於沒聲音
     ⑤ 最後才看「名字像不像女聲」的啟發式規則
   ───────────────────────────────────────────────────────────── */

/** 出廠就有、而且聽起來自然的女聲 —— 順序＝優先度 */
const PREFERRED = [
  'samantha',   // Apple 全系列預設美式女聲（最穩）
  'zira',       // Windows 10/11 預設美式女聲
  'ava',        // Apple 美式女聲（較有感情）
  'allison',    // Apple 美式
  'susan',      // Apple 美式
  'karen',      // Apple 澳式
  'moira',      // Apple 愛爾蘭
  'tessa',      // Apple 南非
];

/** ★ 黑名單：這些名字在 Chrome / macOS 上會「假裝開始、實際沒聲音」 */
const SILENT_NAMES = new Set([
  'eddy', 'flo', 'sandy', 'shelley', 'grandma', 'grandpa', 'reed', 'rocko',
  'bells', 'boing', 'bubbles', 'cellos', 'jester', 'organ', 'superstar',
  'trinoids', 'whisper', 'wobble', 'zarvox', 'bahh', 'albert', 'ralph', 'junior',
  'bad', 'good',  // "Bad News" / "Good News"
]);

/** 常見的女聲名字（Apple / Microsoft / Google 三邊的交集） */
const FEMALE_NAMES = new Set([
  'female', 'samantha', 'karen', 'moira', 'tessa', 'fiona', 'serena', 'kate', 'stephanie',
  'martha', 'alison', 'libby', 'sonia', 'hazel', 'ava', 'susan', 'allison', 'victoria',
  'zoe', 'nicky', 'joelle', 'zira', 'aria', 'jenny', 'emma', 'salli', 'kendra', 'kimberly',
  'ivy', 'amy', 'olivia', 'sophie', 'nora', 'michelle', 'catherine', 'matilda', 'veena',
  'paulina', 'alice', 'amelie', 'anna', 'carmit', 'ellen', 'ioana', 'laura', 'lekha',
  'luciana', 'mariska', 'melina', 'milena', 'sara', 'satu', 'yelda', 'yuna', 'clara',
  'kathy',
]);

/** 常見的男聲名字 —— 名字出現就重扣，避免又被挑成男聲 */
const MALE_NAMES = new Set([
  'male', 'daniel', 'alex', 'tom', 'fred', 'aaron', 'arthur', 'oliver', 'nathan',
  'evan', 'lee', 'gordon', 'junior', 'ralph', 'albert', 'bruce',
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

/** 給單一語音打分；不該用的直接淘汰（-Infinity） */
function voiceScore(v, lang) {
  const name = String(v.name || '');
  const toks = voiceTokens(name);

  // ① 黑名單：列得出來但沒聲音
  if (toks.some(t => SILENT_NAMES.has(t)) || /zarvox|bells|boing/i.test(name)) return -Infinity;

  const vl = String(v.lang || '').replace('_', '-').toLowerCase();
  const want = String(lang).toLowerCase();
  let s = 0;
  // ② 美式優先：完全相符 +40；同語言（其他 en-*）+20
  if (vl === want) s += 40;
  else if (vl.startsWith(want.split('-')[0])) s += 20;
  else return -Infinity;

  // ③ 指名優先：出廠就有的女聲，越前面越高
  const idx = PREFERRED.findIndex(n => toks.includes(n));
  if (idx >= 0) s += 60 - idx * 5;

  s += genderScore(name);
  if (v.localService) s += 12;                      // 本地語音不會「列出來卻播不出聲」
  else s -= 30;                                     // 網路語音：學校網絡常被擋，等於沒聲音
  if (v.default) s += 10;                           // 系統預設最保險
  if (/enhanced|premium|neural|natural/i.test(name)) s += 8;  // 裝了更好，沒裝也不影響
  return s;
}

/** 挑最合適的語音（預設美式女聲；若學生在首頁選過音色，優先用那一個） */
function pickVoice(lang = 'en-US') {
  if (!S.voices.length) loadVoices();

  // ★ 首頁「Test sound」選過音色 → 全站都用它
  const pref = resolvePreferredVoice();
  if (pref) return pref;

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

/* ══════════════════════════════════════════════════════════════
   ★ 2026-11-20：首頁「Test sound」→ 選音色
   ─────────────────────────────────────────────────────────────
   老師要的：點開 Test sound 跳出彈窗，英式 / 美式各 3 個，
   選完之後「按 Start 進課就用那個音」。

   設計上的取捨：
     · 不硬寫死語音名字。每個口音給一串**偏好順序**，執行時挑出這台
       裝置真正有的前 3 個 —— 這樣 iPad、Mac、Windows 都不會出現
       「選了卻不存在」的空選項。
     · 存進 localStorage 的是「口音 + 序號 + 名字」三件事：
       換裝置時名字對不上，就用同一個序號重新對應，
       真的都沒有才退回預設（Samantha / Kate）。
   ══════════════════════════════════════════════════════════════ */
const VOICE_PREF_KEY = 'pcs.voice';

/** 每個口音的偏好順序（越前面越優先）。key 一律小寫，查表時也用小寫。 */
const SLOT_ORDER = {
  'en-gb': ['kate', 'serena', 'stephanie', 'martha', 'libby', 'moira', 'tessa', 'fiona', 'sonia', 'hazel', 'daniel'],
  'en-us': ['samantha', 'ava', 'allison', 'susan', 'victoria', 'kendra', 'zira', 'nicky', 'joelle', 'tom'],
};

/** 趣味音效 / 卡通音 —— 選單裡不要出現（不是給拼寫課用的） */
const NOVELTY = new Set([
  'bells', 'boing', 'bubbles', 'cellos', 'jester', 'organ', 'superstar', 'trinoids',
  'whisper', 'wobble', 'zarvox', 'bahh', 'albert', 'ralph', 'junior', 'fred',
  'good', 'bad', 'grandma', 'grandpa',
  // ★ 2026-11-20：老師指定隱藏 —— Kathy 音色偏機械，不列入選單
  'kathy',
]);

/** 這個口音在这台裝置上有哪些可選（預設 3 個） */
export function listVoiceChoices(lang, count = 3) {
  const all = (S.voices.length ? S.voices : loadVoices()) || [];
  const want = String(lang || '').replace('_', '-').toLowerCase();

  const pool = all.filter(v => {
    const vl = String(v.lang || '').replace('_', '-').toLowerCase();
    if (vl !== want) return false;
    const toks = voiceTokens(v.name);
    if (toks.some(t => NOVELTY.has(t) || SILENT_NAMES.has(t))) return false;
    if (/zarvox|bells|boing|trinoids|wobble|whisper/i.test(v.name || '')) return false;
    return true;
  });

  // 女聲優先 → 本地優先（同一組名字在 Windows 上可能是網路語音）
  const ranked = [...pool].sort((a, b) => {
    const fa = voiceTokens(a.name).some(t => FEMALE_NAMES.has(t)) ? 1 : 0;
    const fb = voiceTokens(b.name).some(t => FEMALE_NAMES.has(t)) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const la = a.localService ? 1 : 0;
    const lb = b.localService ? 1 : 0;
    if (la !== lb) return lb - la;
    return 0;
  });

  const used = new Set();
  const out = [];
  for (const key of (SLOT_ORDER[want] || [])) {
    if (out.length >= count) break;
    const hit = ranked.find(v => voiceTokens(v.name).includes(key) && !used.has(v.name));
    if (hit) { used.add(hit.name); out.push({ name: hit.name, lang: hit.lang }); }
  }
  // 不夠就用同口音的其他語音補
  for (const v of ranked) {
    if (out.length >= count) break;
    if (used.has(v.name)) continue;
    used.add(v.name);
    out.push({ name: v.name, lang: v.lang });
  }
  return out;
}

/** 讀取學生選過的口音與音色 */
export function getVoicePref() {
  try {
    const raw = localStorage.getItem(VOICE_PREF_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !o.lang) return null;
    return { lang: String(o.lang), name: String(o.name || ''), slot: Number(o.slot) || 0 };
  } catch { return null; }
}

/** 寫入 / 清除選擇（傳 null 就回到預設） */
export function setVoicePref(pref) {
  try {
    if (!pref) localStorage.removeItem(VOICE_PREF_KEY);
    else localStorage.setItem(VOICE_PREF_KEY, JSON.stringify(pref));
  } catch { /* 忽略 */ }
}

/** 把「存下來的偏好」對應到這台裝置上的實際語音 */
function resolvePreferredVoice() {
  const p = getVoicePref();
  if (!p) return null;
  const all = (S.voices.length ? S.voices : loadVoices()) || [];

  // ① 名字對得上（同一台裝置、最準）
  if (p.name) {
    const hit = all.find(v => v.name === p.name
      && String(v.lang || '').replace('_', '-').toLowerCase() === p.lang.toLowerCase());
    if (hit) return hit;
  }
  // ② 換裝置了 → 用同一個序號在新裝置上重新對應
  const list = listVoiceChoices(p.lang, 3);
  const pick = list[p.slot] || list[0];
  return pick ? (all.find(v => v.name === pick.name) || null) : null;
}

/** 用指定的語音唸一句（首頁試聽用；不受「已選偏好」影響） */
export function speakWithVoice(name, text, opts = {}) {
  const all = (S.voices.length ? S.voices : loadVoices()) || [];
  const v = all.find(x => x.name === name) || null;
  return speak(text, { ...opts, voice: v, lang: (v && v.lang) || opts.lang || 'en-US' });
}

/** 目前實際會用的語音（給 UI 顯示） */
export function currentVoiceName() {
  return pickVoice()?.name ?? null;
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
 *
 * ★★ 2026-11-20 第二版：老師回報「三個地方都沒聲音」——小喇叭、換新詞、
 *    答錯後都不出聲。原因是把聲音「指定成某個特定語音」之後，只要那一個
 *    語音在這個裝置上不能用（iOS 未下載 / 網路語音被擋 / 語言不符），
 *    `speak()` 會安安靜靜地失敗，而且**不會拋錯、不會有提示**。
 *
 *    所以現在做三件事：
 *      ① 只在「真的有人在講」時才 cancel，而且延後一拍再開口
 *         （iOS 上同一個 tick 內 cancel + speak，新的那句會直接被吞掉）
 *      ② 指定的語音要和 utterance 的 lang 一致（iOS 對不一致的組合會靜音）
 *      ③ 看門狗：900ms 內沒有 onstart → 改成「不指定語音」用系統預設再唸一次
 *         系統預設永遠可用，這是能保證發出聲音的最後一招
 */
let __speakSeq = 0;

/**
 * ★ 2026-11-20：绕开「被扩展替换过的 speak()」。
 *
 * 現象：同一個頁面，iPad 的 Chrome / Safari 有聲，Mac 的 Chrome 完全沒聲，
 *       但提示音（WebAudio）正常 —— 表示音效輸出沒問題，只有語音這條路死了。
 * 原因（最常見）：划詞翻譯 / 朗讀類擴展會在頁面裡接管
 *       `speechSynthesis.speak`，接管後既不報錯也不出聲。
 *       它們換掉的多半是**實例方法**，原型上的原生方法還在。
 * 對策：優先呼叫 `SpeechSynthesis.prototype.speak`，繞過被換掉的實例方法。
 */
const NATIVE_SPEAK = (() => {
  try {
    const p = window.SpeechSynthesis?.prototype;
    return p && typeof p.speak === 'function' ? p.speak : null;
  } catch { return null; }
})();

function rawSpeak(u) {
  try {
    if (NATIVE_SPEAK) NATIVE_SPEAK.call(window.speechSynthesis, u);
    else window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn('[PCS] rawSpeak failed:', e);
    try { window.speechSynthesis.speak(u); } catch { /* 放棄 */ }
  }
}

function speak(text, { rate = 0.8, pitch = 1, lang = 'en-US', voice = null } = {}) {
  if (!('speechSynthesis' in window)) return false;
  if (!String(text || '').trim()) return false;

  const mySeq = ++__speakSeq;
  const S2 = S;

  const build = (withVoice) => {
    const u = new SpeechSynthesisUtterance(String(text));
    u.rate = rate;
    u.pitch = pitch;
    u.volume = 1;
    u.lang = lang;
    const v = withVoice ? (voice || pickVoice(lang)) : null;
    if (v) {
      u.voice = v;
      // ★ utterance 的 lang 跟著語音走，避免「語言不符 → iOS 靜音」
      if (v.lang) u.lang = v.lang;
    }
    return u;
  };

  const fire = (u, onStart, allowRetry = true) => {
    u.onstart = () => { onStart(); S2.lastStart = Date.now(); };
    u.onerror = (e) => {
      const err = e?.error || 'error';
      S2.lastError = err;
      // interrupted / canceled 是自己換句造成的，屬正常，不要當成故障
      if (/interrupt|cancel/i.test(err)) return;
      console.warn('[PCS] speech error:', err);
      // ★ 真正的失敗訊號（voice-unavailable / language-unavailable / synthesis-failed）
      //   → 立刻換系統預設語音再唸一次
      if (allowRetry) retryWithDefault();
    };
    try { rawSpeak(u); } catch (e) {
      console.warn('[PCS] speech failed:', e);
    }
  };

  try {
    const u = build(true);
    let started = false;
    const startOnce = () => {
      if (started) return;
      started = true;
      S.unlocked = true;
      if (!S.logged) {
        S.logged = true;
        console.info('[PCS] voice =',
          u.voice ? `${u.voice.name} (${u.voice.lang})` : '(browser default)');
      }
    };

    const retryWithDefault = () => {
      if (mySeq !== __speakSeq || started) return;
      console.warn('[PCS] speech failed — retrying with the default voice');
      try {
        speechSynthesis.cancel();
        const u2 = build(false);           // 不指定語音 = 系統預設
        setTimeout(() => {
          if (mySeq !== __speakSeq) return;
          fire(u2, () => { S.unlocked = true; S.logged = true; }, false);
        }, 60);
      } catch { /* 忽略 */ }
    };

    // ① 有人正在講 → 先取消，稍等再開口
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
      setTimeout(() => { if (mySeq === __speakSeq) fire(u, startOnce); }, 80);
    } else {
      fire(u, startOnce);
    }

    /* ③ 最後一道保險：4 秒過去了，一句話既沒開始、也沒有任何錯誤 →
       引擎大概是卡住了，換系統預設語音。
       ★ 不要設太早：第一次出聲時瀏覽器要載入語音引擎，1～2 秒才 onstart 很常見，
         提早 cancel 只會把一句正常的話殺掉再重講（實測會看到 start 被延後 1 秒多）。 */
    setTimeout(() => {
      if (started || mySeq !== __speakSeq) return;
      retryWithDefault();
    }, 4000);

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
  // 一次 utterance 裡串起來：句子 → 停頓 → 這個詞（只唸一次）
  // ★ 2026-11-20：原本結尾會把詞再唸一次（… word … word），老師要求改成只唸一次。
  // 句號只是停頓，不會被唸出來；原本的「…」在部分語音引擎上會被讀成「dot dot dot」。
  // 例句本身常已帶句號 → 先去掉，免得唸成「jacket.. jacket.」
  const s = String(sentence || '').trim().replace(/[.!?]+$/, '');
  return speak(`${s}. ${word}.`, { rate: 0.78, ...opts });
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

/** 朗读是否「真的开始出过声」——用来判断 iOS 上首屏那次是不是被静音拦掉了 */
export function speechStarted() {
  return !!S.lastStart;
}

/** 在第一次真實互動時解鎖（iOS 要求） */
export function primeSpeech() {
  if (S.unlocked) return;
  try {
    // 已經有聲音在播 → 引擎本來就是解鎖的，不要再插一句把人家打斷
    if (speechSynthesis.speaking || speechSynthesis.pending) { S.unlocked = true; return; }
    // iOS 有時候會停在 paused → 先 resume，否則後面全部沒聲音
    if (speechSynthesis.paused) speechSynthesis.resume();
    // 手勢之後再取一次語音清單（iOS 在有人碰過畫面之前可能回空陣列）
    loadVoices();
    // 讓先前那句的看門狗失效 —— 否則它 900ms 後會把「解鎖用的無聲句」當成失敗，重唸一次舊的詞
    __speakSeq++;
    // 無聲的短 utterance 解鎖音訊（用 '.' 而不是空白：有些引擎會把純空白視為空字串拒播）
    const u = new SpeechSynthesisUtterance('.');
    u.volume = 0;
    u.lang = 'en-US';
    rawSpeak(u);
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