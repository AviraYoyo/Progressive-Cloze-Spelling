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
// ★ 2026-11-24 新增：VCe（magic e）的「元音位」偵測
// ═════════════════════════════════════════════════════════════
//
// 為什麼需要它：
//   舊版把 magic e 的難度全部記在**詞尾那個 e** 身上（權重 66），
//   於是 ride / hope / cake / bike 幾乎每一個詞的第二關都在挖 e。
//   老師的評語是「所有的結尾帶 e 的都會抠這個，很無聊」。
//
//   但教學上 magic e 的重點從來不是 e —— e 不發音、規則可靠、例外極少，
//   學生看到 r_d_ 根本不用思考。真正的難點是**前面那個元音**：
//   有 e 才讀長音（ride /aɪ/），沒有 e 就讀短音（rid /ɪ/）。
//   所以難度應該記在元音身上，e 只留象徵性權重。
//
// 三道保險（缺一不可，否則 office / engine / have 會被誤判成 magic e）：
//   ① 必須是 [元音][輔音]e 結尾 —— 排除 -le（table / apple，e 屬成音節 /l/）
//   ② 元音組必須恰好 2 組 —— 排除 office / engine / police 這種多音節詞
//      （它們只是「剛好以 [元音]ce 結尾」，不是 VCe 結構）
//   ③ 例外表 —— have / give / come / some 等，拼法像 VCe 但元音读短音
const MAGIC_E_EXCEPTIONS = new Set([
  // 短元音（拼法像 VCe，但不發長音）
  'have', 'give', 'live', 'love', 'glove', 'dove', 'shove', 'above',
  'come', 'some', 'done', 'none', 'one', 'gone', 'done',
  'move', 'prove', 'lose', 'whose', 'use', 'vase', 'are', 'were',
  // e_e 這一支本身邊際（these / theme / complete），不給加成
  'these', 'theme', 'complete', 'delete', 'athlete', 'concrete', 'extreme',
]);

/**
 * 回傳 VCe 結構中「該加權的元音」下標；不是 VCe 就回 -1。
 *
 * @example magicEVowelIndex('ride')  → 1   ('i')
 *          magicEVowelIndex('hope')  → 1   ('o')
 *          magicEVowelIndex('apple') → -1  (-le，不是 VCe)
 *          magicEVowelIndex('have')  → -1  (例外表)
 *          magicEVowelIndex('office')→ -1  (三個元音組)
 */
function magicEVowelIndex(word) {
  const w = String(word).toLowerCase();
  if (w.length < 3) return -1;
  if (!/[aeiou][^aeiou]e$/.test(w)) return -1;      // ① 且排除 -le
  if (MAGIC_E_EXCEPTIONS.has(w)) return -1;          // ③

  const groups = w.match(/[aeiou]+/g) || [];
  if (groups.length !== 2) return -1;                // ② 多音節詞排除

  const idx = w.length - 3;
  // e_e（these / theme）不給加成 —— 這一支的「長音」不是靠 magic e 造出來的
  if (w[idx] === 'e') return -1;
  return idx;
}


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
  // ★ VCe 結構中「真正該挖的元音」下標（不是 VCe 就是 -1）
  const vceVowel = magicEVowelIndex(w);

  let weight = 0;
  let kind = 'single';
  let note = '';
  let category = 'single_letter';   // ★ 語音結構類別 → 進 exposure / 後台統計
  let pattern = null;               // ★ 對應的 pattern 名（可和 spelling-patterns 對照）

  // ★ 詞尾靜音 e 必須在「是否元音」之前判斷，因為 e 本身就是元音字母。
  //
  //   ★★ 2026-11-24 改：56 → 18（VCe）/ 8（-le）
  //
  //   舊版兩支都是 56，比單輔音（30）還高，於是任何 -e 結尾的詞都在挖 e。
  //   老師原話：「几乎所有的结尾带 e 的都会有抠这个，我觉得很无聊」。
  //   現在把難度移到前面的元音（下面 +18），e 只保留象徵性權重：
  //     · VCe（ride / hope / cake）→ 18，遠低於單輔音 30
  //     · -le（apple / table / little）→ 8，e 屬成音節 /l/，最不該挖
  //
  //   ★ 為什麼是 18/8 而不是 22/12：組裝時有「同類別降權 3 分」的多樣性
  //     懲罰，單輔音會被壓到 27。若 e 定在 22~28，就會在「已經挖了一個輔音」
  //     之後反過來贏過其他輔音 —— 實測會出現 d + e 這種沒意義的組合。
  //     壓到 18 以下才真的「永遠排最後」。
  const isSilentE = atEnd && ch === 'e' && w.length >= 3
    && (/[aeiou][^aeiou]e$/.test(w)          // VCe：母音 + 輔音 + e
      || /[^aeiou]le$/.test(w));             // -le：輔音 + le
  if (isSilentE) {
    kind = '_e_silent';
    category = 'magic_e';
    pattern = '_e_silent';
    if (/[^aeiou]le$/.test(w)) {
      weight = 8;
      note = '詞尾 -le，e 不發音（成音節 /l/）';
    } else {
      weight = 18;
      note = '詞尾靜音 e（VCe 規則，e 本身不發音）';
    }
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

    category = 'single_vowel';
    pattern = ch;

    // ★★ 2026-11-24：VCe 的元音加成 +18
    //
    //   ride 的 i：base 35（短母音 CVC 33 + 位置 2）→ 53，穩居第一
    //   這就是「ride 應該挖 i，不該挖 e」的實現方式。
    //   教學依據：有 e 才讀 /aɪ/、沒有 e 讀 /ɪ/，學生真正要想的是這個元音。
    if (vceVowel === index) {
      weight += 18;
      category = 'magic_e';
      pattern = `${ch}_e`;
      note = `VCe 長母音 ${ch.toUpperCase()}（難在元音、不在詞尾 e）`;
    }
  } else if (ch === 'y' && !atStart) {
    kind = 'y_vowel';
    category = 'y_as_vowel';
    pattern = 'y';
    weight = 62;
    note = 'y 當元音用（高頻錯誤）';
  } else {
    kind = 'single_consonant';
    category = 'single_consonant';
    pattern = ch;
    // 詞尾輔音略高於詞中（序位效應）。但極短詞（≤4 字母）只給 +6，
    // 且詞首不加分 —— 避免 'cat' 第一關挖 t、第二關又挖最可預測的詞首 c。
    const short = w.length <= 4 ? (atEnd ? 6 : 0) : (atEnd ? 8 : 0);
    weight = 30 + short;
    note = atEnd ? '詞尾輔音' : '單一輔音';
  }

  return { index, char: ch, weight, kind, note, category, pattern };
}

/** 單詞中所有單一字母位置的權重排序（降序） */
export function rankSingleLetters(word) {
  const w = word.toLowerCase();
  const out = [];
  for (let i = 0; i < w.length; i++) out.push(singleLetterWeight(w, i));
  return out.sort((a, b) => b.weight - a.weight || a.index - b.index);
}

// ═════════════════════════════════════════════════════════════
// 步驟 3：選取 — 靶點池 + 逐關組裝（2026-11-24 重寫）
// ═════════════════════════════════════════════════════════════
//
// 舊版是「一個 pattern 一關，按關號索引 levels[n-1]」，一關只有 1 個空
// （`ss` / `ea` 佔 2 格但仍是「一個結構」）。老師的回饋：
//   「這麼長的一個詞組，每次只摳 1 個字母，而且是一個 e，太無聊了」
//   而且靜態關卡根本做不到「這次答對的字母，下次不再摳」。
//
// 新模型：
//   collectWordTargets()  → 原子靶點池（pattern 靶點 + 單字母靶點）
//   composeFromPool()     → 每次組裝一關，目標 2–3 個空，可吃 mastery 記憶
//   levelCountFromPool()  → 關數（只依靶點池，所以一局內穩定）

/** 每關目標空數：短詞 2、長詞（≥7 字母）3 */
export function quotaFor(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().length >= 7 ? 3 : 2;
}

// ═════════════════════════════════════════════════════════════
// ★ 2026-11-25（r72）：構詞層 —— 前綴 / 後綴
// ═════════════════════════════════════════════════════════════
//
// 為什麼要单独一層：
//   語音層（scanPatterns）只看「這幾個字母發什麼音」，看不到構詞。
//   teacher 的 er 被當成 r-控元音、unhappy 的 un 被當成短母音 + n ——
//   學生答對之後學到的是「這裡有個怪音」，不是「這裡有個後綴」。
//   老師的要求是：前綴後綴都要挖，而且優先級要高。
//
// 三條防誤判規則（缺一不可）：
//   ① 詞幹長度門檻 —— un+it(2) 不算前綴（unit 不是 un+it）；
//      teach+er 才算（stem 5 格）
//   ② 詞幹必須含元音 —— 排除 cr+y 這種純輔音殘段
//   ③ 反例表 —— really / water / family 這種「拼法像、其實不是」的詞
//
// 權重刻意高於語音層最高分（ou = 83）：
//   構詞知識是「懂一個會一片」的知識，比單一拼寫模式更值得考。
const PREFIXES = [
  // 否定 / 反向 —— 教學價值最高（unhappy, dislike, impossible）
  // 分數刻意壓在所有語音模式之上（最高 ou = 83），確保「有前綴先挖前綴」
  { text: 'anti', weight: 88 },
  { text: 'under', weight: 86 },
  { text: 'inter', weight: 86 },
  { text: 'super', weight: 86 },
  { text: 'trans', weight: 86 },
  { text: 'semi', weight: 86 },
  { text: 'multi', weight: 86 },
  { text: 'micro', weight: 86 },
  { text: 'auto', weight: 86 },
  { text: 'tele', weight: 86 },
  { text: 'dis', weight: 88 },
  { text: 'non', weight: 88 },
  { text: 'mis', weight: 88 },
  { text: 'pre', weight: 86 },
  { text: 'sub', weight: 86 },
  { text: 'un', weight: 88 },
  { text: 'in', weight: 88 },
  { text: 'im', weight: 88 },
  { text: 'il', weight: 88 },
  { text: 'ir', weight: 88 },
  { text: 're', weight: 86 },
  { text: 'de', weight: 82 },
  { text: 'en', weight: 82 },
  { text: 'ex', weight: 82 },
  { text: 'co', weight: 80 },
].sort((a, b) => b.text.length - a.text.length);

/** 拼法像前綴、其實不是的詞（整詞比對，避免把 unit 拆成 un+it） */
const PREFIX_BLOCK = new Set([
  // un-
  'unit', 'unite', 'union', 'unique', 'uniform', 'universe', 'university',
  'uncle', 'under', 'unless', 'until', 'upon', 'urban', 'urgent', 'useful', 'usual',
  // im- / in- / ir-
  'image', 'imagine', 'imitate', 'impact', 'idea', 'ideal', 'item', 'iron',
  'island', 'issue', 'into', 'invite',
  // re-
  'really', 'reason', 'ready', 'recent', 'region', 'recipe', 'regular', 'reign',
  // de- / en- / ex- / co-
  'decide', 'delay', 'dentist', 'december', 'enough', 'engine', 'enter',
  'example', 'extra', 'come', 'cost', 'copy', 'colour', 'cover',
]);

const SUFFIXES = [
  { text: 'ation', weight: 84 },
  { text: 'ition', weight: 84 },
  { text: 'ction', weight: 84 },
  { text: 'ssion', weight: 84 },
  { text: 'ment', weight: 80 },
  { text: 'ness', weight: 80 },
  { text: 'less', weight: 80 },
  { text: 'able', weight: 80 },
  { text: 'ible', weight: 80 },
  { text: 'ship', weight: 78 },
  { text: 'hood', weight: 78 },
  { text: 'ward', weight: 78 },
  { text: 'ing', weight: 80 },
  { text: 'ful', weight: 80 },
  { text: 'ous', weight: 78 },
  { text: 'ive', weight: 78 },
  { text: 'est', weight: 78 },
  { text: 'ise', weight: 76 },
  { text: 'ize', weight: 76 },
  { text: 'ed', weight: 78 },
  { text: 'er', weight: 80 },
  { text: 'ly', weight: 78 },
].sort((a, b) => b.text.length - a.text.length);

/** 拼法像後綴、其實不是的詞（high-frequency 小學詞優先收錄） */
const SUFFIX_BLOCK = new Set([
  // -ing
  'sing', 'king', 'ring', 'bring', 'thing', 'spring', 'string', 'swing',
  'sting', 'cling', 'fling', 'wing', 'during', 'morning', 'evening',
  // -ed
  'bed', 'red', 'fed', 'led', 'shed', 'wed', 'need', 'seed', 'feed',
  'speed', 'weed', 'hundred',
  // -er（最容易被誤判：這些詞的 er 不是後綴）
  'water', 'under', 'over', 'other', 'never', 'ever', 'after', 'answer',
  'number', 'paper', 'finger', 'sister', 'brother', 'mother', 'father',
  'winter', 'summer', 'dinner', 'supper', 'letter', 'butter', 'tiger',
  // -est
  'best', 'rest', 'test', 'west', 'nest', 'vest', 'pest', 'guest',
  'forest', 'honest',
  // -ly
  'family', 'early', 'silly', 'belly', 'jelly', 'reply', 'apply', 'supply',
  // -ive
  'five', 'live', 'give', 'drive', 'arrive',
]);

/**
 * 找出這個詞的構詞靶點（最多一個前綴 + 一個後綴）。
 * 回傳的是「待轉成靶點」的描述，座標是詞內座標。
 */
function detectAffixes(w) {
  const out = [];

  // ── 前綴 ──
  // 詞長至少 6：前綴 2 格 + 詞幹 4 格（unit / until 這類靠長度就排除了）
  if (w.length >= 6 && !PREFIX_BLOCK.has(w)) {
    for (const p of PREFIXES) {
      if (!w.startsWith(p.text)) continue;
      const stem = w.slice(p.text.length);
      if (stem.length < 4) continue;          // ① 詞幹門檻
      if (!/[aeiou]/.test(stem)) continue;    // ② 詞幹要有元音
      out.push({
        kind: 'prefix', text: p.text, weight: p.weight,
        start: 0, end: p.text.length,
        note: `前綴 ${p.text}-（${stem}）`,
      });
      break;
    }
  }

  // ── 後綴 ──（複數 s / es 已在下面單獨排除，不進這張表）
  if (!SUFFIX_BLOCK.has(w)) {
    for (const s of SUFFIXES) {
      if (!w.endsWith(s.text)) continue;
      const stem = w.slice(0, -s.text.length);
      if (stem.length < 3) continue;
      if (!/[aeiou]/.test(stem)) continue;
      // 前綴和後綴不能貼在一起把整個詞吃光（un+ly 這種）
      if (out.length && stem.length <= out[0].end) continue;
      out.push({
        kind: 'suffix', text: s.text, weight: s.weight,
        start: w.length - s.text.length, end: w.length,
        note: `後綴 -${s.text}（${stem}）`,
      });
      break;
    }
  }

  return out;
}

/**
 * 複數 / 三單式的詞尾格位 —— 這些格子**不挖**。
 *
 * 老師的原話：「如果是複數形式，es 或者是 s 就不考這個填空，沒有意義」。
 * 教學上成立：學生知道 cake 怎麼拼，複數加 s 是語法知識而不是拼寫難點，
 * 挖它只會讓每一題都多一個「送分空」，稀釋真正要考的結構。
 *
 * 只排除「加出來的 s / es」，詞幹本身的字母照挖：
 *   cakes  → 排除尾格 s，cake 的 a_e 照樣是靶點
 *   boxes  → 排除 es 兩格，box 的 x 照樣是靶點
 *   stories→ 排除 es 兩格，保留 i（y→i 的變化有教學價值）
 */
function pluralTailIndexes(w) {
  const form = analyseWordForm(w);
  const out = new Set();
  if (!form.isPlural) return out;

  const suf = form.suffix || '';
  // 不規則複數（houses / cakes 之類在表裡的）suffix 是 '(irregular)'，
  // 所以「尾字母是不是 s」要直接看字面，不能只信 suffix。
  if (/s$/.test(w)) {
    out.add(w.length - 1);
    // cakes / houses / bikes：s 前面那個 e 是詞幹的靜音 e，
    // 挖它同樣沒意義（而且會害 pool 只剩兩三個空可選）。
    if (w[w.length - 2] === 'e') out.add(w.length - 2);
  }
  if (suf === 'es' || suf === 'ies' || suf === 'oes') out.add(w.length - 2);
  return out;
}

/**
 * 一個詞的原子靶點池（詞內座標 + 短語偏移）。
 *
 * 規則：
 *   · 前綴 / 後綴（構詞層）= 一個靶點，權重最高
 *   · 每個 scanPatterns() 命中的 pattern = 一個靶點（可跨 2–3 格）
 *   · 沒被任何 pattern 覆蓋的字母 = 一個單字母靶點
 *   · 複數尾部的 s / es 不成為靶點
 *   · 每個字母最多屬於一個靶點（構詞 > pattern > 單字母）
 *
 * @param {string} word
 * @param {number} wordIndex  在短語中是第幾個「可挖詞」（單詞 = 0）
 * @param {number} offset     該詞在整組 targetWord 裡的起始位置（含詞間空格）
 */
export function collectWordTargets(word, wordIndex = 0, offset = 0) {
  const w = String(word).toLowerCase();
  if (!w || !/^[a-z]+$/.test(w)) return [];

  const out = [];
  const covered = new Set();
  const noBlank = pluralTailIndexes(w);   // 複數尾：不挖

  // ── ① 構詞層（前綴 / 後綴）先行，佔住座標 ──
  for (const a of detectAffixes(w)) {
    const idxs = rangeOf(a.start, a.end);
    if (idxs.some(i => noBlank.has(i))) continue;
    out.push({
      key: `${wordIndex}:${a.start}-${a.end}`,
      kind: 'affix',
      pattern: a.text,
      category: a.kind,            // 'prefix' | 'suffix'
      note: a.note,
      weight: a.weight,
      blanks: idxs.map(i => offset + i),
      span: { start: a.start, end: a.end, text: w.slice(a.start, a.end) },
      wordIndex,
      localStart: a.start,
      ipa: null,
      ambiguity: 16,
      reliability: 'high',
    });
    idxs.forEach(i => covered.add(i));
  }

  for (const p of scanPatterns(w)) {
    const idxs = rangeOf(p.start, p.end);
    if (idxs.some(i => covered.has(i) || noBlank.has(i))) continue;
    out.push({
      key: `${wordIndex}:${p.start}-${p.end}`,
      kind: 'pattern',
      pattern: p.pattern,
      category: p.category,
      note: p.note,
      weight: p.weight,
      blanks: idxs.map(i => offset + i),
      span: { start: p.start, end: p.end, text: p.text },
      wordIndex,
      localStart: p.start,
      ipa: p.ipa,
      ambiguity: p.ambiguity,
      reliability: p.reliability,
    });
    idxs.forEach(i => covered.add(i));
  }

  for (let i = 0; i < w.length; i++) {
    if (covered.has(i) || noBlank.has(i)) continue;   // ★ 複數尾不補單字母靶點
    const s = singleLetterWeight(w, i);
    out.push({
      key: `${wordIndex}:${i}-${i + 1}`,
      kind: s.kind,
      pattern: s.pattern ?? s.char,
      category: s.category ?? s.kind,
      note: s.note,
      weight: s.weight,
      blanks: [offset + i],
      span: { start: i, end: i + 1, text: s.char },
      wordIndex,
      localStart: i,
      ipa: null,
      ambiguity: 0,
      reliability: 'high',
    });
  }

  return out.sort((a, b) => b.weight - a.weight || a.localStart - b.localStart);
}

/** mastery 對權重的影響（本局內「答對過 / 答錯過」） */
const MASTERY_PASS_FACTOR = 0.12;   // 答對 → 幾乎不再選（但不歸零，留兜底）
const MASTERY_FAIL_BONUS = 12;      // 答錯 → 下一關優先再挖它
const SAME_WORD_PENALTY = 6;        // 同一關已經有這個詞的靶點 → 降權
const SAME_CATEGORY_PENALTY = 3;    // 同一關已經有同類結構 → 降權（求多樣）

/**
 * 從靶點池組裝一關。
 *
 * @param {Array} pool    collectWordTargets 的輸出（可合併多個詞）
 * @param {object} opts
 *   quota       {number}  目標空數（2 或 3）—— 按「格子數」算
 *   targets     {number}  這一關最多挖幾個**結構/靶點**（Easy 模式用，見下）
 *   mastery     {Map}     targetKey → 'pass' | 'fail'（本局記憶，可省略）
 *   exclude     {Set}     要跳過的 targetKey（靜態預覽用；做「關與關不重複」）
 *   mustInclude {string[]} 一定要被挖的 targetKey（重測用，見下）
 *   rng         {function} 隨機來源（預設 Math.random；傳 () => 0 可還原成「永遠選最高分」）
 *   jitter      {number}   分數接近到什麼程度就視為「一樣好」（預設 6 分）
 * @returns {Array} 被選中的靶點，按選取順序
 */
export function composeFromPool(pool, opts = {}) {
  const { quota = 2, mastery = null, exclude = null, mustInclude = null, targets = null } = opts;
  // ★ r72：每次開局要有一點不同，所以選擇改成「接近分數裡隨機」。
  //   測試時傳固定 rng 就能重現，不必靠全域狀態。
  const rand = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const jitter = Number.isFinite(opts.jitter) ? opts.jitter : 4;

  // ★ 2026-11-24（r68）：Easy 模式「每關只挖一個結構」。
  //
  //   ★ 注意是「一個結構」不是「一個字母」—— `oo` 跨 2 格、`tch` 跨 3 格，
  //     但它們都是**一個** pattern，算一個空。
  //   所以不能把 quota 設成 1（quota 按格子數截斷，`oo` 會直接被排除），
  //   要按**靶點個數**限量：targets=1 → 只挑分數最高的那一個結構，
  //   它跨幾格就幾格。
  const byTargets = Number.isFinite(targets) && targets > 0;
  const maxTargets = byTargets ? targets : Infinity;

  // 短語時限制「同一個詞最多 2 個靶點」，避免整關都挖同一個詞；
  // 單詞時沒有這個限制（否則 quota 3 永遠填不滿）。
  const multiWord = new Set(pool.map(t => t.wordIndex)).size > 1;
  const maxPerWord = multiWord ? 2 : Math.max(2, quota);

  const picked = [];
  const used = new Set();
  const perWord = new Map();
  const perCat = new Map();

  const scoreOf = (t) => {
    let s = t.weight;
    const m = mastery?.get?.(t.key);
    if (m === 'pass') s *= MASTERY_PASS_FACTOR;
    else if (m === 'fail') s += MASTERY_FAIL_BONUS;
    s -= (perWord.get(t.wordIndex) ?? 0) * SAME_WORD_PENALTY;
    s -= (perCat.get(t.category) ?? 0) * SAME_CATEGORY_PENALTY;
    return s;
  };

  const take = (t) => {
    picked.push(t);
    t.blanks.forEach(i => used.add(i));
    perWord.set(t.wordIndex, (perWord.get(t.wordIndex) ?? 0) + 1);
    perCat.set(t.category, (perCat.get(t.category) ?? 0) + 1);
  };

  // ★★★ 2026-11-24（r67）：先放入「必須重測」的靶點。
  //
  //   重測時，上一次答錯的那個靶點一定要是空格，否則：
  //     · 學生看不到自己錯在哪裡，重測等於白做；
  //     · submit() 不會為那一格產生 probe → recordAnswer 刪不掉佇列項
  //       → 佇列永遠不空 → 這一局結束不了。
  //
  //   但**其餘名額照常重新組裝**，不是把上一次那一組原樣搬過來 ——
  //   那才是老師抱怨的「oo 明明寫對了，為什麼又挖一次」。
  //   答對過的靶點已被 mastery 壓到 0.12 倍，補進來的通常是
  //   這個詞裡還沒考過的另一個結構（例如換成 ride 的 i）。
  for (const key of mustInclude ?? []) {
    if (exclude?.has?.(key)) continue;
    const t = pool.find(x => x.key === key);
    if (!t) continue;
    if (t.blanks.some(i => used.has(i))) continue;
    take(t);
  }

  for (let guard = 0; guard < 24; guard++) {
    if (picked.length >= maxTargets) break;
    const slots = picked.reduce((n, t) => n + t.blanks.length, 0);
    // 按結構限量時（Easy）不看格子數，只看「已經挖了幾個結構」
    if (!byTargets && slots >= quota) break;

    // ★★ 2026-11-25（r72）：在「分數接近」的候選裡隨機挑，而不是永遠挑第一名。
    //
    //   老師的回饋：「現在第一輪每次都一樣」—— 因為舊版是純 argmax，
    //   同一個詞每次都由同一個結構開場，學生玩第二遍就背下來了。
    //
    //   做法：先算全部候選的分數，取「最高分往下 jitter 分」以內的一批，
    //   再從這批裡隨機抽一個。這樣：
    //     · 前綴 / 後綴（86 分）仍然穩贏一般結構（76 分），優先級沒被破壞
    //     · 同級別（例如 a、i、o 三個短母音）之間每次開局輪流出現
    //   分數差距大於 jitter（預設 6）就不會亂跳 —— 隨機只在「差不多好」之間發生。
    const cands = [];
    for (const t of pool) {
      if (exclude?.has?.(t.key)) continue;
      if (t.blanks.some(i => used.has(i))) continue;
      if ((perWord.get(t.wordIndex) ?? 0) >= maxPerWord) continue;
      // 已經選了東西 → 不准超過 quota+1（pattern 不能切半，留 1 格餘裕）
      if (!byTargets && slots > 0 && slots + t.blanks.length > quota + 1) continue;
      cands.push({ t, sc: scoreOf(t) });
    }

    if (!cands.length) break;

    // 同分時「靠右優先」：詞首輔音最可預測，不該優先挖（序位效應）
    cands.sort((a, b) => b.sc - a.sc || b.t.localStart - a.t.localStart);

    const top = cands[0].sc;
    // ★ 構詞靶點（前綴 / 後綴）一旦是最高分，就直接選它、不參與隨機 ——
    //   老師要求「前綴後綴優先級比較高」，不能讓 83 分的 ou 靠運氣搶走 86 分的 under。
    const band = cands[0].t.kind === 'affix' ? 0 : jitter;
    const near = cands.filter(c => c.sc >= top - band);

    // ★ r72：剩下的候選全都是「這一局已經答對過」的靶點時，寧可這一關少挖一個空，
    //   也不要再考一次同一個結構 —— 老師的原話是「第二次要出第一次沒出過的題目」。
    //   （以前會硬湊滿 quota，於是 L3 又冒出 L1 考過的 ea。）
    if (picked.length && near.every(c => mastery?.get?.(c.t.key) === 'pass')) break;
    const chosen = near.length > 1
      ? near[Math.floor(rand() * near.length)]
      : cands[0];

    take(chosen.t);
  }

  return picked;
}

/**
 * 一個詞/詞組能拆成幾關。
 *
 * 用「可挖字母總數 B」而不是「靶點個數」：teacher 只有 3 個 pattern
 * 但佔 6 格，按個數會只給 1 關（6 空一次挖完），按格數給 2 關更合理。
 * 餘量不足 2 就不多加一關，避免出現「最後一關只有 1 個空」。
 */
export function levelCountFromPool(blankTotal, quota, maxLevels = 3) {
  if (blankTotal <= 0) return 0;
  let n = Math.floor(blankTotal / quota);
  if (n < 1) n = 1;
  if (n < maxLevels && blankTotal - n * quota >= 2) n += 1;
  return Math.max(1, Math.min(maxLevels, n));
}

/** 把靶點轉成舊版 `level.target` 的形狀（後台/分析/診斷都吃這個） */
export function legacyTarget(t) {
  return {
    kind: t.kind,
    pattern: t.pattern,
    category: t.category,
    note: t.note ?? '',
    weight: t.weight,
    span: t.span ?? null,
    ipa: t.ipa ?? null,
    ambiguity: t.ambiguity ?? 0,
    reliability: t.reliability ?? 'high',
  };
}

/**
 * 把選中的靶點包成一個 level 物件。
 * 舊欄位（word / blanks / display / target）一律保留，play.html 與 admin 不用改。
 */
export function levelFromTargets(targets, opts = {}) {
  const { level = 1, word = '', length = 0, display = '', extra = {} } = opts;
  const blanks = [...new Set(targets.flatMap(t => t.blanks))].sort((a, b) => a - b);
  const primary = targets.reduce((m, t) => (!m || t.weight > m.weight ? t : m), null);

  return {
    level,
    word,
    length,
    blanks,
    blankCount: blanks.length,
    display: display || (word ? renderCloze(word, blanks) : ''),
    targets,
    target: primary ? legacyTarget(primary) : null,
    ...extra,
  };
}

/**
 * 建立一個單詞的所有挖空關卡（靜態預覽用）。
 *
 * ★ 真正出題時 play.html 不呼叫這支 —— 它用 composeFromPool + mastery
 *   動態組裝（見 play.html 的 render()）。這裡給的是「完全沒記憶」的版本，
 *   供後台預覽、admin.html 的扣空顯示、以及測試使用。
 *
 * 規則：
 *   · 每關 2 個空，詞長 ≥7 給 3 個
 *   · 關與關之間不重複用同一個靶點
 *   · 最多 3 關（PCS_CONFIG.experiment.maxLevels）
 */
export function buildLevels(word, opts = {}) {
  const { maxLevels = 3, mastery = null } = opts;
  const w = String(word).toLowerCase();
  if (!w || !/^[a-z]+$/.test(w)) return [];

  const pool = collectWordTargets(w, 0, 0);
  if (!pool.length) return [];

  const total = pool.reduce((n, t) => n + t.blanks.length, 0);
  const quota = quotaFor(w);
  const count = levelCountFromPool(total, quota, maxLevels);
  const exclude = new Set();

  return Array.from({ length: count }, (_, i) => {
    // ★ 靜態預覽（後台、扣空顯示、測試）要可重現 → rng 固定成 0（永遠取最高分）
    const picked = composeFromPool(pool, { quota, mastery, exclude, rng: () => 0 });
    picked.forEach(t => exclude.add(t.key));
    return levelFromTargets(picked, {
      level: i + 1,
      word: w,
      length: w.length,
      display: renderCloze(w, picked.flatMap(t => t.blanks)),
    });
  });
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