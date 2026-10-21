/**
 * PCS — Word Bank (詞庫載入)
 * Progressive Cloze Spelling · CPI 2026
 *
 * 詞庫來源（依優先順序）：
 *   1. Firestore words collection（老師上傳的，Phase 4 接上）
 *   2. 本機 seed 詞庫（assets/data/seed-words.json + sentences.js）
 *
 * 本機詞庫讓整站零依賴可跑 —— 這是 Phase 3 驗收的前提。
 */

import { sentencesFor, categoryFor, BANK_WORDS } from '../data/sentences.js';
import { PHRASE_KEYS, phraseInfo } from '../data/phrases.js';
import { analyseWord, analyseWordForm } from './blanking.js';
import { shuffle } from './scheduler.js';
import { analyseItem, buildItemInline } from './phrase.js';

// 重新導出，讓呼叫端只需 import wordbank.js 一個模組
export { shuffle, analyseItem, buildItemInline };

/** 內建詞庫：從 sentences.js 的鍵自動生成 */
export function localWordBank() {
  const single = BANK_WORDS
    .filter(w => /^[a-z]+$/.test(w))
    .map(w => ({
      wordId: 'w_' + w,
      word: w,
      isPhrase: false,
      sentences: sentencesFor(w),
      category: categoryFor(w),
      imageDataUrl: null,      // 老師上傳後才有
      imageUrl: null,
      imageEmoji: null,
      active: true,
    }));

  const phrase = PHRASE_KEYS.map(k => {
    const info = phraseInfo(k);
    return {
      wordId: 'p_' + k.replace(/\s+/g, '_'),
      word: k,
      isPhrase: true,
      sentences: info?.sentences ?? [],
      category: info?.category ?? 'place',
      note: info?.note ?? '',
      teachArticle: !!info?.teachArticle,
      imageDataUrl: null,
      imageUrl: null,
      imageEmoji: info?.image ?? '📘',
      active: true,
    };
  });

  return [...phrase, ...single];        // ★ 短語優先（課堂詞彙表的主體）
}

/**
 * 挑選一局的詞。
 *
 * ★ 短語優先（isPhrase）—— 你的 15 個目標詞都是「a + 名詞」這類短語，
 *   所以短語必須優先於單詞入選，否則會被 400+ 個單詞的詞庫稀釋掉。
 *
 * 之後依「最高權重 pattern」分組，讓學生接觸到最多樣的拼寫挑戰。
 */
export function pickWords(bank, n = 15, seed = '2026a', opts = {}) {
  const { phraseFirst = true } = opts;
  const all = bank.filter(w => w.active !== false && w.sentences?.length);

  // 短語優先：先把短語選完，不夠 n 才補單詞
  const phrases = all.filter(w => w.isPhrase);
  const singles = all.filter(w => !w.isPhrase);
  let pool = phraseFirst && phrases.length
    ? [...phrases, ...singles]
    : all;

  if (pool.length <= n) return pool;

  // 依「最高權重 pattern」分組，每組先取一個，再補剩下的
  const buckets = new Map();
  for (const w of pool) {
    const a = analyseItem(w.word);          // ★ 用 analyseItem 支援短語
    const key = a.levels[0]?.target.pattern ?? '_none';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(w);
  }

  // 依權重降序 → 高權重結構的詞優先入選
  const groups = [...buckets.values()].sort((a, b) => {
    const pa = analyseItem(a[0].word).levels[0]?.target.weight ?? 0;
    const pb = analyseItem(b[0].word).levels[0]?.target.weight ?? 0;
    return pb - pa;
  });

  const out = [];
  for (const g of groups) {
    if (out.length >= n) break;
    out.push(g[0]);                       // 每組先取一個 → 結構最多樣
  }
  for (const g of groups) {
    if (out.length >= n) break;
    for (const w of g) {
      if (out.length >= n) break;
      if (!out.includes(w)) out.push(w);
    }
  }
  return out.slice(0, n);
}

/**
 * ★ 課堂詞庫模式：只用短語。
 *
 * 你的 15 個目標詞全是「a + 名詞」這類場所短語，所以預設一局
 * **全部由短語組成** —— 這才對應你的研究設計。
 *
 * 若短語不足 n 個，才用單詞補齊。
 */
export function pickClassroomWords(bank, n = 15, seed = '2026a') {
  const active = bank.filter(w => w.active !== false && w.sentences?.length);
  const phrases = active.filter(w => w.isPhrase);

  // 短語夠 → 全部從短語選，依權重與結構多樣性排序
  if (phrases.length >= n) return pickWords(phrases, n, seed, { phraseFirst: true });

  // 短語不夠 → 短語全選 + 單詞補齊
  const rest = n - phrases.length;
  const singles = pickWords(
    active.filter(w => !w.isPhrase), rest, seed, { phraseFirst: false }
  );
  return [...phrases, ...singles].slice(0, n);
}

/**
 * 取得一局的詞。
 *
 * ★ 預設走課堂詞庫模式（只用短語）—— 對應你的研究設計：
 *   15 個目標詞全是「a + 名詞」這類場所短語。
 *
 * @param {object} o
 * @param {Array}  o.firestoreWords  老師上傳的詞庫（有就用這個）
 * @param {number} o.n
 * @param {string} o.seed
 * @param {boolean} o.mixed          true = 短語與單詞混合；false = 優先全短語
 */
export async function loadWordList({ firestoreWords = null, n = 15, seed = '2026a', mixed = false } = {}) {
  const bank = firestoreWords?.length ? firestoreWords : localWordBank();
  return mixed
    ? pickWords(bank, n, seed)
    : pickClassroomWords(bank, n, seed);
}

/**
 * 在例句中找出目標詞，把挖空的字母位置映射回句子中的字元索引。
 *
 * 例：word='apple', sentence='I eat an apple every day.', blanks=[1,2]
 * → 回傳 { 'I eat an a _ _ le every day.' 的分段結構 }
 *
 * 這是句子內聯挖空的核心。回傳分段陣列給 renderSentence() 用。
 */
export function buildInlineSentence(sentence, word, blanks) {
  const lowerSentence = sentence.toLowerCase();
  const lowerWord = word.toLowerCase();

  // 找到目標詞在句子中的位置（用單字邊界比對，避免 apple 匹配到 pineapple）
  let start = -1;
  let from = 0;
  while (from <= lowerSentence.length - word.length) {
    const i = lowerSentence.indexOf(lowerWord, from);
    if (i < 0) break;
    const before = i === 0 ? ' ' : lowerSentence[i - 1];
    const after = i + word.length >= lowerSentence.length ? ' ' : lowerSentence[i + word.length];
    if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) { start = i; break; }
    from = i + 1;
  }
  if (start < 0) return null;              // 句中沒有這個詞

  const blankSet = new Set(blanks);
  const segments = [];

  if (start > 0) segments.push({ t: 'text', v: sentence.slice(0, start) });

  [...word].forEach((ch, i) => {
    segments.push(blankSet.has(i)
      ? { t: 'slot', v: ch, index: i }
      : { t: 'given', v: ch });
  });

  if (start + word.length < sentence.length) {
    segments.push({ t: 'text', v: sentence.slice(start + word.length) });
  }

  return { segments, sentenceStart: start, sentenceWord: word };
}

/** 詞形資訊（供後台統計用） */
export function wordFormInfo(word) {
  return analyseWordForm(word);
}