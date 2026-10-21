/**
 * PCS — Phrase Blanking (短語挖空)
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 課堂上學 vocabulary 時，詞語常常是「冠詞 + 名詞短語」：
 *   a bank · a cake shop · a cinema · a clinic · a fire station
 *   a park · a police station · a post office · a restaurant · a supermarket
 *
 * 本模組處理三件事：
 *   1. 短語拆解：分出冠詞（a/an/the）與內容詞
 *   2. 關卡生成：每個內容詞各自貢獻關卡，挖空目標鎖定在「不會的詞」上
 *   3. 例句定位：在句子中找到短語，把空格映射回正確位置
 *
 * 設計重點：學生真正要學的是內容詞（shop / station / office），
 * 冠詞 a/an 是已掌握的結構，只顯示不挖空。
 */

import { analyseWord } from './blanking.js';

/** 冠詞：不列入挖空測驗 */
const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * 短語拆解。
 *
 * @param {string} phrase 例：'a cake shop' / 'fire station' / 'the police station'
 * @returns {{phrase, article, contentWords, headWord, headIndex}}
 *   article      冠詞（'a' / 'an' / 'the' / null）
 *   contentWords 內容詞陣列 ['cake', 'shop']
 *   headWord     中心語（'shop'）—— 名詞短語裡通常是最後一個名詞
 *   headIndex    中心語在原短語中的位置
 */
export function parsePhrase(phrase) {
  const raw = String(phrase || '').trim().toLowerCase();
  const parts = raw.split(/\s+/).filter(Boolean);

  let article = null;
  let contentWords = parts;
  if (parts.length && ARTICLES.has(parts[0])) {
    article = parts[0];
    contentWords = parts.slice(1);
  }

  // 中心語 = 最後一個詞（英文名詞短語的預設規則：dog house → house）
  const headWord = contentWords[contentWords.length - 1] ?? '';

  return {
    phrase: raw,
    article,
    contentWords,
    headWord,
    headIndex: parts.indexOf(headWord),
    isPhrase: contentWords.length > 1,
  };
}

/**
 * 短語的正字表達（用於錯誤訊息與語音朗讀）。
 * 'a' + 以母音音開頭的單音節詞 → 應該用 'an'（an office, an island）
 * 這是香港小學詞彙教學的常見點，值得提醒。
 */
export function normalizeArticle(phrase) {
  const p = parsePhrase(phrase);
  if (!p.article || p.article === 'the') return p.phrase;

  const first = p.contentWords[0] ?? '';
  if (!first) return p.phrase;

  // 判斷是否以「母音音素」開頭（用拼寫啟發式：母音字母開頭，或 a/e/i/o/u 開頭的常見縮寫）
  const needsAn = /^[aeiou]/.test(first) || /^(hour|honest|honour)/.test(first);
  const corrected = needsAn ? 'an' : 'a';

  return [corrected, ...p.contentWords].join(' ');
}

/**
 * 生成短語的所有關卡。
 *
 * 策略：**每個內容詞各自貢獻關卡**，依難度排序列出。
 * 例：'a cake shop' → shop 有 sh digraph、cake 沒有高權重 pattern
 *      → L1 = shop 的 sh，L2 = cake 的 k
 *
 * 這樣學生練的是「這個詞你還不會的那部分」，不是把整個短語挖爛。
 *
 * @param {string} phrase
 * @param {object} opts { maxLevels=3, perWord=true }
 */
export function buildPhraseLevels(phrase, opts = {}) {
  const { maxLevels = 3 } = opts;
  const p = parsePhrase(phrase);

  if (p.contentWords.length === 0) return [];

  // 單詞短語 → 直接走單詞演算法（保證行為一致）
  if (p.contentWords.length === 1) {
    const w = p.contentWords[0];
    const a = analyseWord(w);
    return a.levels.map(l => ({
      ...l,
      word: p.phrase,           // 顯示用整個短語
      phrase: p.phrase,
      targetWord: w,            // 實際被挖的詞
      contentIndex: 0,
      display: prefixArticle(p) + l.display,
      article: p.article,
    }));
  }

  // 多詞短語 → ★ 一組一組練，但「只挖不會的那幾個字母」。
  //
  // 走過兩次彎路，都記在這裡：
  //
  //   v1（初版）：每個內容詞各產一關、中心語（room）優先排序。
  //     症狀：an art room / a music room / a computer room 全部都在挖 room，
  //     學生連續填一大堆 room ——「不要給我摳一大堆 room 讓我填」。
  //
  //   v2（r27）：整個短語一次全挖（targetWord = 'art room'，全部字母挖空）。
  //     症狀：沒有勾 "Spell the whole word" 的作業，也變成「整句自己拼」——
  //     這是「Spell the whole word」這個勾選框獨有的行為，不該在 progressive 出現。
  //
  //   v3（現在）：
  //     · 短語仍以「整組」呈現（框橫跨整個短語：a post office →
  //       a [p][o][s][t] [o][f][f][i][c][e]），不再是孤零零一個 room。
  //     · 但只挖「一個內容詞裡最難的那個 pattern」，其餘字母照 progressive
  //       的慣例給出來當鷹架 —— 學生不是整句自己拼。
  //     · 每個內容詞最多出一關（不重複同一詞），依 pattern 權重排序。
  //
  //   要「整句自己拼」→ 老師在後台勾 "Spell the whole word"（advanced），
  //   那條路徑由 play.html 的 buildAdvancedLevel() 負責，與這裡無關。
  return buildGroupedPhraseLevels(p, maxLevels);
}

/**
 * ★ 多詞短語的 progressive 關卡（v3）。
 *
 * 每個內容詞挑一個「該詞最難的 pattern」當一關，同一詞不重複出關；
 * 關卡用該 pattern 的權重排序（越難越先練），權重相同時依詞序（由左至右）。
 *
 * 回傳的 level 有兩個關鍵欄位：
 *   targetWord —— 整個短語的內容詞（'post office'），**框橫跨整組**
 *   blanks     —— 只含被挖的那個詞的 pattern 字母（換算成整組的全域位置）
 *
 * 其餘字母在 play.html 會以 .slot-given 顯示，學生看到的是
 * 「一整組詞，其中幾個字母要填」，不是「整組都要自己拼」。
 */
function buildGroupedPhraseLevels(p, maxLevels = 3) {
  const content = p.contentWords.join(' ');
  if (!content) return [];

  // 每個內容詞在 targetWord（含詞間空格）裡的起始位置
  const starts = [];
  let pos = 0;
  p.contentWords.forEach((w) => { starts.push(pos); pos += w.length + 1; });

  // 逐詞只取「最高權重」的那一關 → 同一詞不會重複挖
  const perWord = [];
  p.contentWords.forEach((w, wi) => {
    const a = analyseWord(w);
    const levels = Array.isArray(a?.levels) ? a.levels.filter(l => l?.blanks?.length) : [];
    if (!levels.length) return;
    const best = levels.reduce((m, l) =>
      ((l.target?.weight ?? 0) > (m.target?.weight ?? 0) ? l : m), levels[0]);
    perWord.push({ wi, word: w, best });
  });

  if (!perWord.length) return [];

  // 越難的先練（pattern 權重降序），同權重時由左至右（閱讀順序）
  perWord.sort((x, y) =>
    (y.best.target?.weight ?? 0) - (x.best.target?.weight ?? 0) || x.wi - y.wi);

  const words = p.contentWords.map(w => [...w].map((_, k) => k));   // 逐詞的「詞內」序號

  return perWord.slice(0, Math.max(1, maxLevels)).map((entry, i) => {
    const offset = starts[entry.wi];
    return {
      level: i + 1,
      // ★ 全域位置（對齊 targetWord，含詞間空格）
      blanks: entry.best.blanks.map(k => offset + k),
      // 顯示字串（沿用既有的短語挖空渲染，後台預覽用）
      display: renderPhraseCloze(p, entry.word, entry.wi, entry.best.blanks),
      targetWord: content,          // ★ 整組呈現（不含冠詞）
      words,                        // ★ 給 inline 畫詞間分隔
      drilledWord: entry.word,      // 這一關在練哪個詞（研究資料用）
      contentIndex: entry.wi,
      target: entry.best.target,    // pattern / category / weight
      article: p.article,
      isPhrase: true,
      grouped: true,                // ★ 走 buildAdvancedInline（逐詞渲染、全域位置）
      phrase: p.phrase,
      word: p.phrase,
    };
  });
}

/**
 * ★ 舊的「整組全挖」關卡已移除（r27 的實驗版本）。
 *
 * 為什麼移除：它會讓**沒有勾選** "Spell the whole word" 的作業也變成整句自己拼。
 * 現在「整句全挖」只由 play.html 的 buildAdvancedLevel() 負責，
 * 那條路徑由後台的 "Spell the whole word" 勾選框決定 ——
 * progressive 模式一律只挖 pattern（見 buildGroupedPhraseLevels）。
 */

/** 冠詞前綴（若有的話） */
function prefixArticle(p) {
  return p.article ? p.article + ' ' : '';
}

/**
 * 把某個內容詞的挖空套進整個短語。
 * 例：phrase='a cake shop', w='shop', blanks=[1,2]
 *   → 'a cake s _ _ p'
 */
export function renderPhraseCloze(p, targetWord, contentIndex, blanks) {
  const blankSet = new Set(blanks);
  const out = [];

  if (p.article) { out.push(p.article); out.push(' '); }

  p.contentWords.forEach((w, wi) => {
    [...w].forEach((ch, ci) => {
      const isTarget = wi === contentIndex;
      const isBlank = isTarget && blankSet.has(ci);
      out.push(isBlank ? ' _' : ' ' + ch);
    });
    if (wi < p.contentWords.length - 1) out.push(' ');
  });

  return out.join('').trim();
}

/**
 * 在例句中找到短語，回傳分段結構供渲染。
 *
 * 難點：句子裡的短語可能沒有冠詞（'I go to the cake shop.' 裡有 the），
 * 也可能冠詞不同。所以要分兩層找：
 *   1. 先找完整短語（含冠詞）
 *   2. 找不到就找「內容詞序列」（忽略冠詞）
 *
 * 例：phrase='a cake shop', sentence='We go to the cake shop on Sunday.'
 *   → 完整短語 'a cake shop' 不存在 → 退回找 'cake shop' → 成功
 *
 * @returns {{segments, matched, span}|null}
 */
export function buildPhraseInline(sentence, phrase, targetWord, contentIndex, blanks) {
  const lowerS = sentence.toLowerCase();
  const lowerP = String(phrase).toLowerCase();

  const p = parsePhrase(phrase);

  // 嘗試三種匹配：完整短語 → 無冠詞的內容詞序列 → 單詞
  const candidates = [];
  if (p.article) candidates.push(lowerP);
  candidates.push(p.contentWords.join(' '));
  candidates.push(p.headWord);

  let matched = null, matchStart = -1;
  for (const c of candidates) {
    const r = findInflected(lowerS, c);
    // ★ 必須用 >= 0 判斷，不能用 if (r) —— 位置 0 是合法的起點但為 falsy。
    //   這是「所有多詞短語都找不到」的真正原因。
    if (r >= 0) { matched = c; matchStart = r; break; }
  }
  if (matchStart < 0) return null;

  // 知道 matched 覆蓋了短語的哪些部分
  const coversArticle = matched.startsWith(p.article + ' ') || matched === p.article;
  const firstContentIdx = coversArticle ? 0 : -1;

  const segments = [];
  if (matchStart > 0) segments.push({ t: 'text', v: sentence.slice(0, matchStart) });

  // 逐詞渲染（只保留 matched 覆蓋的詞）
  const matchedWords = matched.split(/\s+/);
  let ci = 0;   // 在 p.contentWords 中的游標
  for (let mi = 0; mi < matchedWords.length; mi++) {
    const mw = matchedWords[mi];
    // 這是冠詞嗎？
    if (ARTICLES.has(mw)) {
      segments.push({ t: 'given', v: mw });
      if (mi < matchedWords.length - 1) segments.push({ t: 'text', v: ' ' });
      continue;
    }
    // 這是第幾個內容詞？
    const idx = ci++;
    const isTarget = idx === contentIndex;
    // ★ 只用目標詞自己的 blanks，且不得超出該詞長度
    const limit = mw.length;
    [...mw].forEach((ch, k) => {
      const blank = isTarget && blanks.includes(k) && k < limit;
      segments.push(blank
        ? { t: 'slot', v: ch, index: k, contentIndex: idx, targetWord: p.contentWords[idx] }
        : { t: 'given', v: ch });
    });
    if (mi < matchedWords.length - 1) segments.push({ t: 'text', v: ' ' });
  }

  const endIdx = matchStart + matched.length;
  if (endIdx < sentence.length) segments.push({ t: 'text', v: sentence.slice(endIdx) });

  return { segments, matched, span: { start: matchStart, end: endIdx } };
}

/**
 * 單字邊界比對（避免 'shop' 匹配到 'workshop'）。
 * ★ 邊界字元除了空白，還要接受標點與句首句尾。
 * @param {number} from 從哪裡開始找（挖多個出現位置時用）
 */
function findWithWordBoundaries(haystack, needle, from = 0) {
  const isEdge = c => !/[a-z]/.test(c);       // 非字母即為邊界（含空格、標點、字串邊界）
  let i = from;
  while (i <= haystack.length - needle.length) {
    const j = haystack.indexOf(needle, i);
    if (j < 0) break;
    const before = j === 0 ? ' ' : haystack[j - 1];
    const afterIdx = j + needle.length;
    const after = afterIdx >= haystack.length ? ' ' : haystack[afterIdx];
    if (isEdge(before) && isEdge(after)) return j;
    i = j + 1;
  }
  return -1;
}

/**
 * ★ 容忍詞形變化：banana → bananas、dolphin → Dolphins、noodle → noodles。
 *
 * 為什麼需要：句庫裡的例句常用複數（I like bananas.），
 * 但目標詞是單數（banana）。若只做完全比對就找不到目標詞 →
 * buildItemInline 回傳 null → 呼叫端退回「整句原樣顯示」→
 * **答案直接洩漏在例句裡**（例如 "I love cake shops." 讓人看見 shop 的 s）。
 *
 * 策略：允許目標詞後面最多再接一個變化尾段（s / es / d / ed / ing），
 * 且必須是完整的詞（後面是邊界）。挖空位置只對應目標詞本身，
 * 所以多出來的字母會原樣顯示 —— 學生要填的那幾格仍然正確。
 */
const INFLECTIONS = ['s', 'es', 'd', 'ed', 'ing', 'ies'];

function findInflected(haystack, needle) {
  const direct = findWithWordBoundaries(haystack, needle);
  if (direct >= 0) return direct;

  for (const suf of INFLECTIONS) {
    const idx = findWithWordBoundaries(haystack, needle + suf);
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * 統一入口：給定一個單詞或短語，回傳完整分析。
 * play.html 用這個就好，不必分辨單詞還是短語。
 */
export function analyseItem(item) {
  const text = String(item).toLowerCase().trim();
  const p = parsePhrase(text);

  if (!p.isPhrase) {
    const a = analyseWord(p.headWord);
    const decorate = l => ({
      ...l,
      phrase: text,
      article: p.article,
      targetWord: p.headWord,
      contentIndex: 0,
      display: prefixArticle(p) + l.display,
    });
    return {
      ...a,
      isPhrase: false,
      phrase: text,
      article: p.article,
      contentWords: p.contentWords,     // ★ 單詞也要有，避免 undefined
      headWord: p.headWord,
      targetWord: p.headWord,
      contentIndex: 0,
      levels: a.levels.map(decorate),
    };
  }

  const levels = buildPhraseLevels(text);
  return {
    word: p.headWord,
    length: p.headWord.length,
    isPhrase: true,
    phrase: text,
    article: p.article,
    contentWords: p.contentWords,
    headWord: p.headWord,
    targetWord: p.headWord,
    contentIndex: p.contentWords.length - 1,
    graphemes: [],
    patterns: [],
    levels,
  };
}

/**
 * 例句內聯挖空（統一入口）。
 * @param {string} sentence
 * @param {string} item     單詞或短語
 * @param {object} level    buildLevels / buildPhraseLevels 回傳的一關
 */
export function buildItemInline(sentence, item, level) {
  // ★★ 逐詞渲染的兩條路徑：
  //   1. Advanced mode（整詞自行填寫的考試模式，level.advanced）
  //   2. Progressive 多詞短語（level.grouped）—— 框橫跨整組，但只挖 pattern
  //
  //   為什麼不能走下面的路徑：`buildPhraseInline` 只挖「一個」目標詞
  //   （contentIndex 指定的那個），而這兩種情況都要求逐詞渲染、
  //   且 index 必須是「整組裡的全域位置」。
  if (level?.grouped || level?.advanced) return buildAdvancedInline(sentence, item, level);

  const p = parsePhrase(item);
  const inline = p.isPhrase
    ? buildPhraseInline(sentence, p.phrase, level.targetWord, level.contentIndex, level.blanks)
    : buildInlineSingle(sentence, level.targetWord, level.blanks, p.article);

  if (!inline) return null;

  // ★ 保險：slot 的 index 必須落在目標詞長度內。
  //   舊版曾把「整個短語的長度」當成單詞的 blanks 傳進來，index 會爆掉。
  //
  //   ★ 注意：這裡「只能」用 index 判斷，不能用「seen > max」。
  //     例句裡同一個詞出現多次時（例如 "I say no, NO, No."），
  //     合法的 slot 數量本來就會超過詞長度3 個，
  //     用「累積數量」去砍會把後面兩處的正確挖空砍掉 —— 答案就直接露出来了。
  if (inline.segments.some(s => s.t === 'slot')) {
    const w = level.targetWord || p.headWord;
    const max = w.length;
    for (const s of inline.segments) {
      if (s.t === 'slot' && (s.index == null || s.index < 0 || s.index >= max)) {
        s.drop = true;
      }
    }
    inline.segments = inline.segments.filter(s => !s.drop);
  }

  return inline;
}

/**
 * ★★ 逐詞渲染的例句挖空（兩種模式共用）。
 *
 *   · Advanced（level.blanks = 全部字母）→ 每個內容詞全部挖空。
 *   · Progressive 多詞短語（level.grouped，blanks 只含被挖的 pattern）
 *     → 只有那幾個字母挖空，其餘字母照 progressive 慣例給出來當鷹架。
 *
 * 為什麼需要獨立一支：
 *   `buildPhraseInline` 的設計是「只挖一個詞」（contentIndex 指定的那個），
 *   那是單詞短語的 progressive 需求（挖 pattern 而已，其餘字母給線索）。
 *   多詞短語要逐詞渲染、且位置是「整組的全域序號」，所以走這裡。
 *
 * level.words 是「逐詞的字母索引分组」（詞內序號），
 * level.blanks 是「整組的全域序號」（對齊 targetWord，含詞間空格）。
 */
function buildAdvancedInline(sentence, item, level) {
  const p = parsePhrase(item);
  const lowerS = sentence.toLowerCase();

  // 候選：完整短語（含冠詞）→ 內容詞序列 → 中心語
  const candidates = [];
  if (p.article) candidates.push(String(item).trim().toLowerCase());
  candidates.push(p.contentWords.join(' '));
  candidates.push(p.headWord);

  let matched = null, matchStart = -1;
  for (const c of candidates) {
    const r = findInflected(lowerS, c);
    if (r >= 0) { matched = c; matchStart = r; break; }
  }
  if (matchStart < 0) return null;

  const groups = level.words || [];        // [[0,1,2,3],[0,1,2,3]]（每個詞的「詞內」序號）
  // ★ 要挖的位置（整組的全域序號）。Advanced 會是全部字母；
  //   progressive 多詞短語只有被挖的 pattern 那幾個。
  const blankSet = new Set(Array.isArray(level.blanks) ? level.blanks : []);
  const useBlanks = blankSet.size > 0;
  const segments = [];
  if (matchStart > 0) segments.push({ t: 'text', v: sentence.slice(0, matchStart) });

  const matchedWords = matched.split(/\s+/);
  let ci = 0;                               // 第幾個內容詞
  let offset = 0;                           // ★ 該詞在 targetWord（含量空格）裡的起始位置
  for (let mi = 0; mi < matchedWords.length; mi++) {
    const mw = matchedWords[mi];

    // 冠詞照樣顯示（學生不用寫 a / an / the）
    if (ARTICLES.has(mw)) {
      segments.push({ t: 'given', v: mw });
      if (mi < matchedWords.length - 1) segments.push({ t: 'text', v: ' ' });
      continue;
    }

    // ★ 只有「要挖的字母」是空格，其餘照 progressive 慣例顯示出來當鷹架。
    const group = new Set(groups[ci] || []);
    for (let k = 0; k < mw.length; k++) {
      const isBlank = useBlanks ? blankSet.has(offset + k) : group.has(k);
      segments.push(isBlank
        // ★ index 必須是「targetWord 裡的序號」（含前面的詞與空格），
        //   不能是詞內序號 —— 否則 cake 的 0 與 shop 的 0 撞號，
        //   syncInline() 配對時會兩個詞一起變色。
        ? { t: 'slot', v: mw[k], index: offset + k, contentIndex: ci, targetWord: mw }
        : { t: 'given', v: mw[k] });
    }
    ci++;
    offset += mw.length + 1;                // +1 = 詞間的空格
    if (mi < matchedWords.length - 1) segments.push({ t: 'text', v: ' ' });
  }

  const endIdx = matchStart + matched.length;
  if (endIdx < sentence.length) segments.push({ t: 'text', v: sentence.slice(endIdx) });

  return { segments, matched, span: { start: matchStart, end: endIdx } };
}

/**
 * ★ 單詞版例句挖空 —— 句中「所有」出現的目標詞都挖。
 *
 * 為什麼要全部挖：例句常把同一個詞重複好幾次（例如 "I say no, NO, No."）。
 * 只挖第一個位置的話，後面兩次就直接把答案送給學生了 ——
 * 等於變成填充題，難度歸零。
 *
 * index 欄位一律對應「目標詞自己的字母序號」，所以答案框永遠對得上。
 */
function buildInlineSingle(sentence, word, blanks, article) {
  const lowerS = sentence.toLowerCase();
  const first = findInflected(lowerS, word);
  if (first < 0) return null;

  const blankSet = new Set(blanks);
  const segments = [];
  let cursor = 0;

  // 掃描全句，把每一個目標詞（連同可能的變化尾段）都換成挖空片段
  while (cursor < sentence.length) {
    const at = findInflectedFrom(lowerS, word, cursor);
    if (at < 0) break;

    // 詞前面的文字
    if (at > cursor) segments.push({ t: 'text', v: sentence.slice(cursor, at) });

    [...word].forEach((ch, i) => {
      segments.push(blankSet.has(i)
        ? { t: 'slot', v: ch, index: i, contentIndex: 0, targetWord: word }
        : { t: 'given', v: ch });
    });

    // ★ 跳過實際出現的長度（可能是 shops 的 s）
    const matchLen = matchLengthAt(lowerS, word, at);
    cursor = at + Math.max(matchLen, word.length);
  }

  if (cursor < sentence.length) segments.push({ t: 'text', v: sentence.slice(cursor) });

  return { segments, span: { start: first, end: cursor } };
}

/** 從 from 開始找下一個目標詞（容忍變化尾段） */
function findInflectedFrom(haystack, needle, from = 0) {
  let best = -1;
  let at = from;

  while (at <= haystack.length - needle.length) {
    const r = findWithWordBoundaries(haystack, needle, at);
    if (r < 0) break;
    if (best < 0) best = r;
    at = r + 1;
  }
  // 直接命中優先（較短 = 完全比對）
  const direct = findWithWordBoundaries(haystack, needle, from);
  if (direct >= 0) return direct;

  if (best >= 0) return best;
  for (const suf of INFLECTIONS) {
    const r = findWithWordBoundaries(haystack, needle + suf, from);
    if (r >= 0) return r;
  }
  return -1;
}

/** 這個位置實際匹配到的長度（例如 shops = shop + s = 5） */
function matchLengthAt(haystack, needle, at) {
  const rest = haystack.slice(at);
  if (rest.startsWith(needle)) {
    for (const suf of INFLECTIONS) {
      if (rest.startsWith(needle + suf)) return needle.length + suf.length;
    }
    return needle.length;
  }
  return needle.length;
}

/** 短語的語音朗讀文字（供 TTS 讀出正確內容） */
export function speakableText(level) {
  return level.phrase || level.targetWord || level.word;
}