/**
 * PCS — Blanking Algorithm
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 挖空演算法。純函數，不碰 DOM、不碰網絡、可獨立測試。
 * 這是整個專案的核心：把單詞中「最難拼寫的語音結構」挖空，讓學生填出。
 *
 * 三個步驟：
 *   1. 掃描 scanPatterns()  — 把單詞切成 grapheme，逐位置比對模式表
 *   2. 評分                — 每個匹配算出五維度加權 weight
 *   3. 選取 buildLevels()   — 按權重降序，每一關挖一個 target
 */

import { PATTERNS, PATTERN_MAP, DOUBLED_LETTERS, isKnownConfusion } from './spelling-patterns.js';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const CVC_SUFFIXES = /(ing|ed|er|est)$/;

/** 是不是元音字母 */
const isVowel = ch => VOWELS.has(ch);

/** 是不是輔音字母 */
const isConsonant = ch => /[a-z]/.test(ch) && !VOWELS.has(ch);

// ═════════════════════════════════════════════════════════════
// 步驟 1：掃描 — 找出單詞中所有可辨識的拼寫模式
// ═════════════════════════════════════════════════════════════

/**
 * 把單詞切成 grapheme 序列。
 * 例：'teacher' → ['t','ea','ch','er']
 *      'apple'  → ['a','pp','l','e']
 *
 * 關鍵：長模式優先匹配，避免 'tch' 被誤判成 'ch' + 't'
 */
export function segmentGraphemes(word) {
  const w = word.toLowerCase();
  const out = [];
  let i = 0;

  while (i < w.length) {
    let matched = null;

    // 從最長可能（4字母）往下試
    for (let len = Math.min(4, w.length - i); len >= 1; len--) {
      const slice = w.slice(i, i + len);

      if (len >= 3 && PATTERN_MAP[slice]) { matched = slice; break; }

      // 3 字母：tch dge sch scr spr str thr shr spl
      if (len === 3) {
        const t3 = w.slice(i, i + 3);
        if (PATTERN_MAP[t3]) { matched = t3; break; }
      }

      // 2 字母：先查 digraph / team / blend / doubled / magic-e
      if (len === 2) {
        const t2 = w.slice(i, i + 2);

        // ★ 優先偵測重複字母（doubled consonant）。
        //   必須在查任何其他 2 字母 pattern 之前判斷，否則 apple 會被切成 a·p·p·l·e。
        if (t2[0] === t2[1] && isConsonant(t2[0]) && DOUBLED_LETTERS.includes(t2)) {
          matched = t2; break;
        }

        // magic e：V + C + e 結尾（排除 ee / ie / oe 結尾）
        //★ 這裡 i 指的是「C」（輔音），但要挖的是它後面的那個 e。
        //   學生要猜的是看不見的 e（/keɪk/ 聽不出來有 e），
        //   輔音本身是聽得到的，挖它沒有教學價值。
        if (i === w.length - 2 && w[i + 1] === 'e'
            && isVowel(w[i]) === false && isVowel(w[i - 1] ?? '')) {
          if (PATTERN_MAP['_e_silent']) {
            // 從 e 的位置重新開始掃描，讓這個字母被標記為 pattern
            i += 1;
            continue;
          }
        }

        if (PATTERN_MAP[t2] && isPatternApplicable(t2, w, i)) { matched = t2; break; }
      }

      // 1 字母：重複字母（單字母本身不算）
    }

    // ★ 詞尾的 e：V+C+e 的最後一個字母，單獨標記成 _e_silent。
    //   必須在「推進 i」之前處理，否則會被當成一般單字母，
    //   magic_e 這個類別就永遠不會出現在分析結果裡。
    if (w[i] === 'e' && i === w.length - 1 && i >= 2
        && !isVowel(w[i - 1]) && isVowel(w[i - 2])) {
      out.push({ text: '_e_silent', start: i, len: 1, kind: 'pattern' });
      i += 1;
      continue;
    }

    if (matched) {
      // ★ matched 是「表格的 key」，不一定等於它涵蓋的字母數。
      //   `_e_silent` 是合成 key（用來標記「詞尾靜音 e」），
      //   它只對應 1 個字母 'e'，但字串長度是 9。
      //   若直接用 matched.length 當字母數，cake → e 的 len 變成 9，
      //   blanks 變成 [2..10]（9 格），遠超 4 字母的詞 →
      //   ① 例句挖空對不上 → buildItemInline 回傳 null → 整句例句原樣顯示（洩漏答案）
      //   ② 畫面上出現無法填的輸入框 → 學生按 Check 永遠卡住
      //   所以長度必須另外指定，不能從 key 推導。
      const spanLen = spanLengthOf(matched, w, i);
      out.push({ text: matched, start: i, len: spanLen, kind: 'pattern' });
      i += spanLen;
    } else {
      out.push({ text: w[i], start: i, len: 1, kind: 'single' });
      i += 1;
    }
  }

  return out;
}

/**
 * 這個 pattern 實際涵蓋幾個字母。
 * ★ 合成 key（開頭底線 `_`）不是真的字母串，必須用顯式長度。
 *   `_e_silent` = 詞尾的 e，1 個字母。
 *   同時保險：回傳值不可超過這個位置剩下的字母數。
 */
function spanLengthOf(pattern, word, start) {
  const remaining = word.length - start;
  const len = pattern.startsWith('_')
    ? SYNTHETIC_SPANS[pattern]
    : pattern.length;
  return Math.max(1, Math.min(len ?? 1, remaining));
}

/** 合成 pattern 的實際字母長度 */
const SYNTHETIC_SPANS = {
  _e_silent: 1,      // 詞尾靜音 e：只有 1 個字母
};

/**
 * 判斷某個 pattern 在這個位置是否成立（處理 contextOnly 條件）
 */
function isPatternApplicable(pattern, word, index) {
  const p = PATTERN_MAP[pattern];
  if (!p) return false;

  const ctx = p.contextOnly;
  if (!ctx) return true;

  const prev = word[index - 1] ?? '';
  const next = word[index + 1] ?? '';
  const atEnd = index + pattern.length === word.length;
  const atStart = index === 0;

  // 初始 blend 只在詞首
  if (p.category === 'consonant_blend' && ctx.includes('word-initial')) {
    return atStart;
  }

  // ck：短母音後，且不在 s/x 之後
  if (pattern === 'ck') {
    if (ctx.includes('not after s/x') && (prev === 's' || prev === 'x')) return false;
    if (ctx.includes('after short vowel')) return isVowel(prev);
    return true;
  }

  // tch：短母音後，或 s/x 之後，或詞尾
  if (pattern === 'tch') {
    if (ctx.includes('after short vowel') && isVowel(prev)) return true;
    if (ctx.includes('preceded by s/x')) return prev === 's' || prev === 'x';
    if (ctx.includes('at end') && atEnd) return true;
    return false;
  }

  // doubled_lexical：必須在封閉音節的 coda 位置（短母音 + 單輔音）
  if (p.category === 'doubled_lexical') {
    if (atStart) return false;
    // 檢查前面是否短母音 + 單輔音結構：xx 之後
    return true; // 簡化：對小學詞庫而言 ll/ss/ff/zz 出現在詞中即為典型
  }

  // doubled_suffix：必須在 CVC 詞幹 + CVC 後綴
  if (p.category === 'doubled_suffix') {
    if (ctx.includes('stem ends CVC + suffix')) {
      return CVC_SUFFIXES.test(word.slice(index + 1));
    }
    return true;
  }

  // doubled：兩個字母本身即為一個 pattern，不需位置條件驗證
  if (p.category === 'doubled_lexical' || p.category === 'doubled_suffix') {
    return true;
  }

  // magic e 條件
  if (pattern === '_e_silent') {
    if (word.length < 3) return false;
    if (/ee|ie|oe$/.test(word)) return false;
    if (!isVowel(word[index - 1] ?? '')) return false;
    return true;
  }

  return true;
}

/**
 * 掃描單詞中所有匹配到的 pattern（已扣除被更長 pattern 覆蓋的位置）
 * @returns {Array<{pattern, category, weight, start, end, text, dims, ...}>}
 */
export function scanPatterns(word) {
  const segs = segmentGraphemes(word);
  const found = [];

  for (const seg of segs) {
    if (seg.kind !== 'pattern') continue;
    const p = PATTERN_MAP[seg.text];
    if (!p) continue;
    found.push({
      pattern: p.pattern,
      category: p.category,
      weight: p.weight,
      dims: {
        g: p.graphemeComplexity, a: p.ambiguity,
        p: p.positionPredict, e: p.exceptionLoad, m: p.morphologyDep,
      },
      start: seg.start,
      end: seg.start + seg.len,
      text: seg.text,
      ipa: p.ipa,
      ambiguity: p.ambiguity,
      reliability: p.reliability,
      note: p.note,
      examples: p.examples,
    });
  }

  return found.sort((a, b) => b.weight - a.weight || a.start - b.start);
}

// ═════════════════════════════════════════════════════════════
// 步驟 2a：單一字母的權重
// ═════════════════════════════════════════════════════════════

/**
 * 單一字母位置的權重。
 * 這是退讓策略用的 — 當詞內高權重 pattern 不足時，用單字母補關數。
 */
export function singleLetterWeight(word, index) {
  const w = word.toLowerCase();
  const ch = w[index];
  const prev = w[index - 1] ?? '';
  const next = w[index + 1] ?? '';
  const atEnd = index === w.length - 1;
  const atStart = index === 0;

  let weight = 0;
  let kind = 'single';
  let note = '';

  // ★ 詞尾靜音 e 必須在「是否元音」之前判斷，因為 e 本身就是元音字母。
  //   兩種情形：(a) VCe 規則（cap→cape）；(b) -le 音節結尾（table, little, apple）。
  //   apple 的 e 屬於 -le；table 的 e 屬於 -le，兩者都不可發音。
  const isSilentE = atEnd && ch === 'e' && w.length >= 3
    && (/[aeiou][^aeiou]e$/.test(w)          // VCe：母音 + 輔音 + e
      || /[^aeiou]le$/.test(w));             // -le：輔音 + le
  if (isSilentE) {
    kind = '_e_silent';
    weight = 56;
    note = /le$/.test(w) ? '詞尾 -le，e 不發音' : '詞尾靜音 e（VCe 規則）';
  } else if (isVowel(ch)) {
    kind = 'single_vowel';
    // 閉音節的短母音比開音節的長母音更難猜
    const isClosed = isVowel(prev) === false && next !== '' && isVowel(next) === false;
    const isOpen = isVowel(prev) === false && (next === '' || isVowel(next));
    // 位置越後越難（序位效應），最高 +6
    const positionPenalty = Math.round((index / Math.max(1, w.length - 1)) * 6);

    if (isClosed) {
      weight = 33 + positionPenalty;
      note = `短母音 ${ch.toUpperCase()}，閉音節 CVC`;
    } else if (isOpen) {
      weight = 37 + positionPenalty;
      note = `長母音 ${ch.toUpperCase()}，開音節`;
    } else {
      weight = 43 + positionPenalty;   // 複合母音中間的字母（如 teacher 的 a）
      note = `複合母音中的 ${ch.toUpperCase()}`;
    }
  } else if (ch === 'y' && !atStart) {
    kind = 'y_vowel';
    weight = 62;
    note = 'y 當元音用（高頻錯誤）';
  } else {
    kind = 'single_consonant';
    // 詞尾輔音略高於詞中（序位效應）。但極短詞（≤4 字母）只給 +6，
    // 且詞首不加分 —— 避免 'cat' 第一關挖 t、第二關又挖最可預測的詞首 c。
    const short = w.length <= 4 ? (atEnd ? 6 : 0) : (atEnd ? 8 : 0);
    weight = 30 + short;
    note = atEnd ? '詞尾輔音' : '單一輔音';
  }

  return { index, char: ch, weight, kind, note };
}

/** 單詞中所有單一字母位置的權重排序（降序） */
export function rankSingleLetters(word) {
  const w = word.toLowerCase();
  const out = [];
  for (let i = 0; i < w.length; i++) out.push(singleLetterWeight(w, i));
  return out.sort((a, b) => b.weight - a.weight || a.index - b.index);
}

// ═════════════════════════════════════════════════════════════
// 步驟 3：選取 — 權重表排好隊，從頭搜，最多 3 次，超過就 break
// ═════════════════════════════════════════════════════════════

/**
 * 建立一個單詞的所有挖空關卡。
 *
 * 規則（依使用者指定）：
 *   - L1 挖掉整個最高權重的 pattern（例：apple 的 pp → `a _ _ le`）
 *   - 依權重降序，一關一個 pattern，**最多 3 關，超過就 break**
 *   - 若只有 1 個 pattern → L1 挖它，L2 用單一字母退讓補
 *   - 沒有 pattern 的短詞 → 只挖 1 關
 *
 * @param {string} word  目標詞（小寫）
 * @param {object} opts  { maxLevels=3 }
 * @returns {Array<Level>}
 */
export function buildLevels(word, opts = {}) {
  const { maxLevels = 3 } = opts;
  const w = String(word).toLowerCase();
  if (!w || !/^[a-z]+$/.test(w)) return [];

  // scanPatterns 本身已按權重降序 —— 直接從頭取，最多 3 個，超過即止
  const patterns = scanPatterns(w);
  const targets = [];

  for (const p of patterns) {
    if (targets.length >= maxLevels) break;      // ← 最多 3 次，超過 break
    targets.push({
      kind: 'pattern',
      pattern: p.pattern,
      category: p.category,
      note: p.note,
      weight: p.weight,
      // ★ 整個 pattern 一次挖掉，字母之間留空格
      blanks: rangeOf(p.start, p.end),
      span: { start: p.start, end: p.end, text: p.text },
      ipa: p.ipa,
      ambiguity: p.ambiguity,
      reliability: p.reliability,
    });
  }

  // ── 退讓 1：不足 2 關 → 用單一字母補 ──
  if (targets.length < 2) {
    const used = new Set(targets.flatMap(t => t.blanks));
    const singles = rankSingleLetters(w)
      .filter(s => !used.has(s.index))
      .slice(0, 2 - targets.length);

    for (const s of singles) {
      targets.push({
        kind: s.kind,
        pattern: s.char,
        category: s.kind,
        note: s.note,
        weight: s.weight,
        blanks: [s.index],
        span: { start: s.index, end: s.index + 1, text: s.char },
        ipa: null,
        ambiguity: 0,
        reliability: 'high',
      });
    }
  }

  // ── 退讓 2：完全找不到任何 pattern 的極短詞 → 只挖 1 關 ──
  if (targets.length === 0) {
    const s = rankSingleLetters(w)[0];
    if (s) {
      targets.push({
        kind: s.kind,
        pattern: s.char,
        category: s.kind,
        note: s.note,
        weight: s.weight,
        blanks: [s.index],
        span: { start: s.index, end: s.index + 1, text: s.char },
        ipa: null,
        ambiguity: 0,
        reliability: 'high',
      });
    }
  }

  return targets.map((t, i) => ({
    level: i + 1,
    word: w,
    length: w.length,
    blanks: t.blanks,
    blankCount: t.blanks.length,
    display: renderCloze(w, t.blanks),
    target: {
      kind: t.kind,
      pattern: t.pattern,
      category: t.category,
      note: t.note,
      weight: t.weight,
      span: t.span,
      ipa: t.ipa,
      ambiguity: t.ambiguity,
      reliability: t.reliability,
    },
  }));
}

/**
 * 複數 / 三單式詞形處理。
 *
 * 設計要點：
 * 1. 依「字面尾段長度」由長到短檢查，避免 houses 先撞上 -es。
 * 2. require / block 可指定檢查對象：'stem'（去掉尾段）或 'result'（換回原字母後）。
 * 3. -ves 分三種：lf/rf → f（wolves, shelves）、其他 → ve（knives, lives）。
 *
 * ★ 已知限制（研究上可接受的取捨，寫在文件供論文 limitation 引用）：
 *   - leaves 兩義（leaf 複數 / leave 三單），本函式判為 leave。
 *   - 不處理不規則複數（children, mice, feet, teeth）→ 見 IRREGULAR_PLURALS。
 */
const PLURAL_RULES = [
  // -ies → -y：stori+y = story, citi+y = city
  { suf: 'ies', to: 'y', stemMin: 3, requireOn: 'result', require: /[^aeiou]y$/ },
  // -oes → -o：tomato+o = tomato, hero+o = hero
  { suf: 'oes', to: 'o', stemMin: 3 },
  // -ves → f（僅原形以 lf / rf 結尾）：wolve+f = wolf, shelve+f = shelf
  { suf: 'ves', to: 'f', stemMin: 3, requireOn: 'result', require: /lf$/ },
  { suf: 'ves', to: 'f', stemMin: 3, requireOn: 'result', require: /rf$/ },
  // -ves → ve：knive+ve = knife, live+ve = live, leave+ve = leave
  { suf: 'ves', to: 've', stemMin: 4 },
  // -es：stem 以 s/x/z/ch/sh 結尾（boxes, buses, watches, teaches）
  { suf: 'es', to: '', stemMin: 3, requireOn: 'stem', require: /(s|x|z|ch|sh)$/ },
  // -s 一般式，避開 ss / us / is（bus, glass, yes）
  { suf: 's', to: '', stemMin: 3, block: /(ss|us|is)$/ },
];

export function analyseWordForm(raw) {
  const w = String(raw).toLowerCase();
  if (w.length < 4) return { word: w, base: w, isPlural: false, suffix: '' };

  // ★ 先查不規則表 —— 啟發式規則處理不了這些（houses 的 e 是靜音字母，不能隨便砍掉）
  if (IRREGULAR_PLURALS[w]) {
    return { word: w, base: IRREGULAR_PLURALS[w], isPlural: true, suffix: '(irregular)' };
  }

  const ordered = [...PLURAL_RULES].sort((a, b) => b.suf.length - a.suf.length);

  for (const r of ordered) {
    if (!w.endsWith(r.suf)) continue;

    const stem = w.slice(0, -r.suf.length);   // 去掉字面尾段
    const result = stem + r.to;                // 換回原字母
    if (stem.length < r.stemMin) continue;
    if (r.require && !r.require.test(r.requireOn === 'result' ? result : stem)) continue;
    if (r.block && r.block.test(w)) continue;

    return { word: w, base: result, isPlural: true, suffix: r.suf };
  }

  return { word: w, base: w, isPlural: false, suffix: '' };
}

/**
 * 不規則複數 / 三單式。
 * 英文的複數變化不是啟發式能完全涵蓋的（house→houses 只是加 s，不砍 e）。
 * 這份表交給老師在後台維護，涵蓋目標詞庫中出現的不規則形式。
 */
export const IRREGULAR_PLURALS = {
  // 不規則複數
  children: 'child', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth',
  mice: 'mouse', geese: 'goose', people: 'person', oxen: 'ox',
  sheep: 'sheep', fish: 'fish', deer: 'deer',
  // 只加 s、不砍字母（-e 結尾）
  houses: 'house', horses: 'horse', bikes: 'bike', cakes: 'cake',
  names: 'name', games: 'game', pictures: 'picture', apples: 'apple',
  // f → ves
  knives: 'knife', wives: 'wife', lives: 'life',
  wolves: 'wolf', calves: 'calf', shelves: 'shelf', halves: 'half',
  leaves: 'leaf', thieves: 'thief',
};

function rangeOf(a, b) {
  return Array.from({ length: b - a }, (_, i) => a + i);
}

/**
 * 渲染挖空字串。
 * 例：renderCloze('apple', [1, 2]) → 'a _ _ le'
 * ★ 每個空格之間留一個空格，對齊 Proposal mockup 的 `a _ _ le` 寫法
 */
export function renderCloze(word, blanks) {
  const set = new Set(blanks);
  return [...word].map((ch, i) => set.has(i) ? ' _' : ' ' + ch).join('').trim();
}

// ═════════════════════════════════════════════════════════════
// 診斷訊息 — 這是 PCS 相對 Quizlet 的核心差異
// ═════════════════════════════════════════════════════════════

/**
 * 生成精確到字母位置的錯誤診斷。
 * 對應 PPT 原文：「you missed the 3rd letter 'p'」
 *
 * @param {string} word
 * @param {number[]} blanks     本關挖空的位置
 * @param {number} wrongIndex   學生填錯的位置
 * @param {string} got          學生實際輸入
 * @param {object} target       本關的 target 資訊
 */
export function diagnose(word, blanks, wrongIndex, got, target = {}) {
  const ordinal = ordinalOf(wrongIndex + 1);
  const expected = word[wrongIndex];
  const i = wrongIndex + 1;

  const known = isKnownConfusion(got, expected);

  if (got === '') {
    return {
      code: 'omission',
      en: `you missed the ${ordinal} letter '${expected}'`,
      zh: `你漏了第 ${i} 個字母 '${expected}'`,
      ordinal: i,
      expected,
      got: null,
    };
  }

  if (known) {
    return {
      code: 'known_confusion',
      en: `you wrote '${got}' for the ${ordinal} letter, but it should be '${expected}'`,
      zh: `你把第 ${i} 個字母寫成 '${got}'，應該是 '${expected}'`,
      ordinal: i,
      expected,
      got,
      isKnownConfusion: true,
    };
  }

  return {
    code: 'substitution',
    en: `you missed the ${ordinal} letter '${expected}'`,
    zh: `你錯了第 ${i} 個字母，應該是 '${expected}'`,
    ordinal: i,
    expected,
    got,
  };
}

function ordinalOf(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ═════════════════════════════════════════════════════════════
// 便捷工具
// ═════════════════════════════════════════════════════════════

/** 一次取得某詞的完整挖空方案（含掃描結果，供分析與預覽） */
export function analyseWord(word) {
  const w = String(word).toLowerCase();
  return {
    word: w,
    length: w.length,
    graphemes: segmentGraphemes(w),
    patterns: scanPatterns(w),
    levels: buildLevels(w),
  };
}

/**
 * 全詞彙庫統計：哪些 pattern 在這個詞庫中最常出現、最難。
 * 這是後台分析的基礎 —「你的 15 個目標詞覆蓋了哪些拼寫結構」
 */
export function corpusStats(words) {
  const tally = {};
  for (const w of words) {
    for (const p of scanPatterns(w)) {
      if (!tally[p.pattern]) {
        tally[p.pattern] = { pattern: p.pattern, weight: p.weight, count: 0, words: [], category: p.category };
      }
      tally[p.pattern].count += 1;
      if (tally[p.pattern].words.length < 5) tally[p.pattern].words.push(w);
    }
  }
  return Object.values(tally).sort((a, b) => b.weight - a.weight);
}