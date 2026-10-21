/**
 * PCS — AI Sentence Generation (Option C)
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 方案 C：老師在後台貼上自己的免費 Gemini API key，對「詞庫裡還沒有例句」的詞
 * 批次生成例句。生成的結果先進 drafts 集合，老師逐條確認才發佈到正式詞庫。
 *
 * ★ 安全設計：
 *   1. API key 只存在老師瀏覽器的 localStorage，**絕不寫進 Firestore**
 *   2. 老師隨時能手動改寫 AI 的輸出 —— AI 只是省力，不是自動權威
 *   3. 一次最多一批（預設 15 詞），避免觸發速率限制
 *   4. 失敗時保留已生成的草稿，可單詞重試
 *
 * 用法（瀏覽器 Console 或後台頁面）：
 *   import { generateSentences, hasKey, saveKey } from './ai-sentences.js';
 *   saveKey('AIza...');
 *   const drafts = await generateSentences(['zebra', 'quilt']);
 */

const MODEL = 'gemini-2.0-flash';      // 免費額度內；也可改 'gemini-2.5-flash'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const KEY_STORE = 'pcs.gemini.key';
const MAX_BATCH = 15;

/**
 * 給 Gemini 的 prompt。
 * 關鍵要求：CEFR Pre-A1–A1、4–9 字、只用小學詞彙、目標詞自然出現。
 */
const PROMPT = `You are an English teacher creating example sentences for Hong Kong primary school students (ages 6-12, CEFR Pre-A1 to A1).

For EACH word below, write ONE simple sentence that:
1. Is between 4 and 9 words long
2. Uses ONLY very common primary-school vocabulary (no advanced words)
3. Contains the target word naturally (do not force it)
4. Is grammatically correct British English
5. Reflects everyday Hong Kong life (school, family, food, animals, weather, play)

Words: %WORDS%

Return your answer as a JSON array ONLY, with no extra text or explanation:
[{"word": "...", "sentence": "..."}, ...]

Keep the same order as the input words. Use exactly one sentence per word.`;

export const keyStore = {
  save(apiKey) {
    localStorage.setItem(KEY_STORE, apiKey.trim());
  },
  load() {
    return localStorage.getItem(KEY_STORE) || '';
  },
  clear() {
    localStorage.removeItem(KEY_STORE);
  },
  exists() {
    return !!localStorage.getItem(KEY_STORE);
  },
};

export const hasKey = () => keyStore.exists();

/**
 * 生成一條例句（單詞）
 */
async function generateOne(apiKey, word) {
  const url = `${ENDPOINT}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = PROMPT.replace('%WORDS%', JSON.stringify([word]));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,        // 需要一點變化，但不要太發散
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = JSON.parse(text);
  const item = Array.isArray(parsed) ? parsed[0] : parsed;

  return {
    word: item.word?.toLowerCase() ?? word,
    sentence: String(item.sentence ?? '').trim(),
  };
}

/**
 * 批次生成例句（建議一次 ≤ MAX_BATCH 詞）
 *
 * @param {string[]} words  目標詞（小寫）
 * @returns {Promise<Array<{word, sentence, status, error?}>>}
 *          status: 'draft'（成功，待老師確認）| 'error'
 */
export async function generateSentences(words) {
  const apiKey = keyStore.load();
  if (!apiKey) throw new Error('請先貼上 Gemini API key');

  const batch = words.slice(0, MAX_BATCH);
  const out = [];

  for (const word of batch) {
    try {
      const r = await generateOne(apiKey, word);
      out.push({ ...r, status: r.sentence ? 'draft' : 'error', error: r.sentence ? undefined : '空回應' });
      // 免費層有速率限制，詞與詞之間稍等一下
      await new Promise(res => setTimeout(res, 400));
    } catch (e) {
      out.push({ word, sentence: '', status: 'error', error: e.message });
      // 遇到速率限制就停止，不要繼續燒額度
      if (/429|rate|quota/i.test(e.message)) break;
    }
  }

  return out;
}

/**
 * 品質檢查：把 AI 生成的句子過一遍篩
 * 回傳 { ok: string[], reject: [{word, sentence, reason}] }
 * 老師仍可忽略此篩選自行採用，但預設能擋掉明顯不合格的句子。
 */
export function qualityCheck(drafts, {
  minWords = 4,
  maxWords = 9,
  // 小學常見詞之外的生僻字黑名單（依需要增補）
  banned = ['utilise', 'utilize', 'endeavour', 'endeavor', 'aubergine',
            'quench', 'peruse', 'consequence', 'furthermore', 'nevertheless'],
} = {}) {
  const ok = [];
  const reject = [];

  for (const d of drafts) {
    const s = d.sentence || '';
    if (!s) { reject.push({ ...d, reason: '空句子' }); continue; }

    const words = s.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);
    if (words.length < minWords || words.length > maxWords) {
      reject.push({ ...d, reason: `句長 ${words.length} 超出 ${minWords}–${maxWords}` });
      continue;
    }
    if (!new RegExp(`\\b${d.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s)) {
      reject.push({ ...d, reason: '句中未出現目標詞' });
      continue;
    }
    const lower = s.toLowerCase();
    const hit = banned.find(b => lower.includes(b));
    if (hit) { reject.push({ ...d, reason: `含超出程度的詞：${hit}` }); continue; }

    ok.push(d);
  }

  return { ok, reject };
}

/**
 * 一鍵流程：找出缺例句的詞 → 生成 → 品質檢查 → 回傳草稿
 * 後台頁面呼叫這個即可。
 */
export async function fillMissingSentences(wordList) {
  const { wordsNeedingSentences } = await import('../data/sentences.js');
  const need = wordsNeedingSentences(wordList);

  if (!need.length) return { generated: [], skipped: [], message: '所有詞都已有例句' };
  if (need.length > MAX_BATCH) {
    return {
      generated: [], skipped: need,
      message: `有 ${need.length} 個詞缺例句，超過單批上限 ${MAX_BATCH}，請分批處理`,
    };
  }

  const drafts = await generateSentences(need);
  const { ok, reject } = qualityCheck(drafts);
  return {
    generated: ok,
    rejected: reject,
    skipped: need.filter(w => !drafts.some(d => d.word === w)),
    message: `生成 ${ok.length} 條草稿${reject.length ? `，${reject.length} 條未通過品質檢查` : ''}`,
  };
}