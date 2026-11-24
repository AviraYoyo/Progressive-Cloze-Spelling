/**
 * PCS — Scheduler (回溯佇列 + 出題調度)
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * ★ 這是本專案的創新核心：答錯的字母位置會被排入佇列，
 *   程式繼續發新詞，隔 gap 個新詞後回頭重測，直到答對為止。
 *
 * 純函數 / reducer，不碰 DOM 與網絡，可單元測試。
 */

import { PCS_CONFIG } from './config.js';

const CFG = PCS_CONFIG.experiment;

/** 建立一個新的作答狀態 */
export function initState(wordIds, { advanced = false, difficulty = 'difficult' } = {}) {
  return {
    itemSeq: 0,
    // ★ 2026-11-24（r68）：這一局的難度。
    //   'easy'      → 每關只挖一個結構、每個詞只考兩遍（見 easy 旗標）
    //   'difficult' → 原規則（每關 2–3 個空、最多 3 關、回溯重測）
    //   難度會寫進 exposure / sessions / rankBoard —— 排行榜要分欄，
    //   研究資料也要能分層分析（簡單組 vs 困難組）。
    difficulty: difficulty === 'easy' ? 'easy' : 'difficult',
    easy: difficulty === 'easy',
    newWordsServed: 0,      // 已發過多少個「全新詞」→ 用來計算重測到期
    retryQueue: [],         // 待重測佇列
    consecutiveRetries: 0,
    masteredWords: new Set(),   // 已完成的詞（所有關卡都通過）
    exposureCount: new Map(),   // wordId → 該詞已出現幾次
    // ★ wordId → 這個詞已經答對到第幾關。
    //   Progressive 的核心：答對 L1 後要接著做 L2、L3，而不是直接跳過。
    levelProgress: new Map(),
    // ★ 還沒完成所有關卡的詞（答對 L1 但還有 L2 → 排進來，等新詞發完再輪回去）
    levelQueue: [],
    // ★★ 2026-11-24：本局內的「逐靶點記憶」。
    //   wordId → Map<targetKey, 'pass' | 'fail'>
    //
    //   為什麼需要：老師要求「這次答對的字母，下次不再挖；答錯的要再挖」。
    //   靶點（target）才是挖空的單位 —— 一個 pattern 可能跨 2 格，
    //   用字母記會把 ss 的兩個 s 拆散。
    //
    //   只在本局有效：initState 時是空的，換一局重新洗牌。
    //   （跨局記憶的難點是「同一個詞會越來越難湊夠空」，先不做。）
    targetMastery: new Map(),
    // ★★ 2026-11-24（r68）：這個詞「錯過哪些結構」——**只增不減**。
    //
    //   targetMastery 會被「後來答對」覆蓋成 'pass'，但老師要的
    //   「重玩時把之前錯的再考一次」需要一份不會被洗掉的錯誤紀錄。
    //   重玩（play again / 轉 difficult）時會把它轉成新一局的初始權重加成。
    wrong: new Map(),
    // ★★ Advanced mode：整詞自行填寫的考試模式。
    //   每個詞**只出現一次** —— 不排重測、不排 level 佇列、不回來。
    //   這是「像考試一樣」的關鍵：答錯就是錯了，沒有第二次機會。
    //   （對比 progressive：那個模式的核心正是回溯重測）
    advanced,
    // ★ 保險：一局最多發幾題。沒有上限的話，學生一直答錯就永遠不會結束
    //   （retryQueue 的項目永遠「已到期」），整節課卡在這一局。
    served: 0,
    wordIds: [...wordIds],
    order: shuffle(wordIds, CFG.shuffleSeed),
    poolIndex: 0,
    stats: { probes: 0, correct: 0, totalMs: 0 },
  };
}

/** 可重現的洗牌（Mulberry32 + seed），確保實驗可重現 */
export function shuffle(arr, seedStr) {
  let h = 1779033703 ^ String(seedStr).length;
  for (let i = 0; i < String(seedStr).length; i++) {
    h = Math.imul(h ^ String(seedStr).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 自適應重測間隔。
 * linear（預設）：gap = baseGap * (1 + 0.5*(failCount-1))，維持短節奏，適合 7 天介入
 * exponential：gap = baseGap * 2^(failCount-1)，更像 Leitner 間隔重複，但會拉長節課
 */
export function gapFor(failCount) {
  const g = CFG.gapStrategy === 'exponential'
    ? CFG.baseGap * (2 ** (failCount - 1))
    : CFG.baseGap * (1 + 0.5 * (failCount - 1));
  return Math.max(1, Math.min(CFG.maxGap, Math.round(g)));
}

/**
 * ★ 2026-11-24：本局內的逐靶點記憶讀寫。
 *
 * 出題時 composeLevel(analysis, n, masteryFor(state, wordId)) 會用它：
 *   答對過的靶點 → 權重 ×0.12（幾乎不再選）
 *   答錯過的靶點 → 權重 +12（下一關優先再挖）
 */
export function masteryFor(state, wordId) {
  return state.targetMastery?.get(wordId) ?? EMPTY_MASTERY;
}

/** 避免每次呼叫都新建 Map（composeFromPool 只讀） */
const EMPTY_MASTERY = new Map();

/** status: 'pass' | 'fail'（後寫入的覆蓋前面的 —— 錯了又答對就是掌握了） */
export function setTargetMastery(state, wordId, keys, status) {
  if (!state.targetMastery) state.targetMastery = new Map();
  let m = state.targetMastery.get(wordId);
  if (!m) { m = new Map(); state.targetMastery.set(wordId, m); }
  for (const k of keys) {
    if (k) m.set(k, status);
  }
}

/**
 * 取下一個要出的題。
 * @returns {{kind:'retry'|'new', wordId:string, probeIndex?:number, ...}}
 */
export function nextItem(state) {
  // ★ 硬上限：超過就結束這局。沒有這個上限，學生持續答錯會讓本局無限延長。
  if (state.served >= maxItemsFor(state)) return null;

  state.served += 1;

  const due = state.retryQueue.filter(
    q => state.newWordsServed - q.queuedAtNewWords >= q.gap
  );

  // 插隊上限：避免一個詞佔滿整節課
  if (due.length > 0 && state.consecutiveRetries < CFG.maxConsecutiveRetries) {
    // 錯得最多的先重測；同數則最早入隊的先測（確定性）
    due.sort((a, b) => b.failCount - a.failCount || a.itemSeq - b.itemSeq);
    const pick = due[0];
    state.consecutiveRetries += 1;
    // ★ 發重測也要推進 newWordsServed。
    //   否則這筆剛被發出來、又不斷重答錯的詞會「永遠到期」，
    //   nextItem 每次都回傳同一筆 → 學生按 Skip 也跳不出去（無限迴圈）。
    //   推進之後，它必須再等 gap 個新詞才會再到期，分散練習才有意義。
    state.newWordsServed += 1;
    // ★ 2026-11-24：必須帶 exposureIndex。
    //   舊版這裡沒回傳 → play.html 兜底成 0 → 所有重測都寫 exposureId = ..._0
    //   → 覆蓋該詞的第一條 exposure（新增的 targets 數組也會被覆蓋掉）。
    return { kind: 'retry', ...pick, exposureIndex: state.exposureCount.get(pick.wordId) ?? 0 };
  }

  // 否則發新詞
  if (state.poolIndex < state.order.length) {
    const wordId = state.order[state.poolIndex++];
    state.newWordsServed += 1;
    state.consecutiveRetries = 0;
    const exposureIndex = state.exposureCount.get(wordId) ?? 0;
    return { kind: 'new', wordId, exposureIndex };
  }

  // ★ 新詞都發完了 → 輪回尚未完成後續關卡的詞（Progressive 的第二輪）
  //   這裡是「答對 L1 後還有 L2/L3」的詞，不是錯了要重測的詞。
  if (state.levelQueue.length > 0) {
    const wordId = state.levelQueue.shift();
    state.newWordsServed += 1;
    state.consecutiveRetries = 0;
    const exposureIndex = state.exposureCount.get(wordId) ?? 0;
    return { kind: 'advance', wordId, exposureIndex };
  }

  // ★★★ 關鍵修正：沒有新詞可發時，尚未到期的重測也必須發。
  //
  //   症狀：學生 L1 答錯 → 進重測佇列 → 但班上詞很少（例：只有 2 個），
  //   newWordsServed 永遠達不到 gap → isFinished() 判定「沒有到期項目」
  //   → 這一局直接結束 → 學生**永遠沒有第二次機會**，L2 也永遠不會出現。
  //   （Results 就會顯示某個詞只有 L1、0%，永遠停在第一關。）
  //
  //   「隔 N 個新詞重測」的前提是「還有新詞」。新詞用完後這個前提消失，
  //   剩下的重測就必須全部發完，否則學生帶著錯誤離開這節課。
  //
  //   ★ 這不會造成無限迴圈：每發一題 served +1，而 maxItemsFor() 會封頂。
  if (state.retryQueue.length > 0) {
    // 錯得最多的先重測；同數則最早入隊的先測（確定性）
    const pending = state.retryQueue.slice().sort(
      (a, b) => b.failCount - a.failCount || a.itemSeq - b.itemSeq
    );
    const pick = pending[0];
    state.consecutiveRetries += 1;
    state.newWordsServed += 1;
    // ★ 2026-11-24：必須帶 exposureIndex。
    //   舊版這裡沒回傳 → play.html 兜底成 0 → 所有重測都寫 exposureId = ..._0
    //   → 覆蓋該詞的第一條 exposure（新增的 targets 數組也會被覆蓋掉）。
    return { kind: 'retry', ...pick, exposureIndex: state.exposureCount.get(pick.wordId) ?? 0 };
  }

  // 真的沒東西了
  return null;
}

/**
 * 記錄作答，決定是否入重測佇列。
 *
 * @param {object} state
 * @param {object} r { wordId, level, probeIndex, correct, expect, got, phonClass, ms, attemptNo, spec, targetKey }
 *
 * ★ 2026-11-24 新增 spec / targetKey：
 *   · targetKey = 這一格屬於哪個語音結構。重測時用它把「答錯的那個結構」
 *     重新挖出來，其餘名額重新組裝（不再把整組空原樣重播）。
 *   · spec = 整組空組的快照，只當**兜底**用（舊存檔沒有 targetKey 時、
 *     或重新組裝後那一格竟然不是空格時）。
 */
export function recordAnswer(state, r) {
  state.stats.probes += 1;
  state.stats.totalMs += r.ms ?? 0;
  if (r.correct) state.stats.correct += 1;

  // ★ 2026-11-24（r68）：這個詞錯過哪些結構，只增不減。
  //   重玩時（play again / 轉 difficult）用來把「之前錯的」排到最前面再考一次。
  if (!r.correct && r.targetKey) {
    if (!state.wrong) state.wrong = new Map();
    let set = state.wrong.get(r.wordId);
    if (!set) { set = new Set(); state.wrong.set(r.wordId, set); }
    set.add(r.targetKey);
  }

  // ★★ Advanced mode：每個詞只出現一次 → 答錯也不排重測。
  //   這是「像考試一樣」的關鍵：Unlike progressive，沒有回頭補救的機會。
  //   錯了就是錯了，成績如實反映。
  if (state.advanced) {
    if (r.correct) {
      const i = state.retryQueue.findIndex(q => q.key === (r.wordId + ':' + r.level + ':' + r.probeIndex));
      if (i >= 0) state.retryQueue.splice(i, 1);
    }
    return { queued: false, mastered: null };
  }

  const key = (r.wordId) + ':' + r.level + ':' + r.probeIndex;

  if (r.correct) {
    // 從佇列移除（若在裡面）
    const i = state.retryQueue.findIndex(q => q.key === key);
    if (i >= 0) state.retryQueue.splice(i, 1);
    return { queued: false, mastered: null };
  }

  // ★ 2026-11-24（r68）：Easy 模式「每個詞只考兩遍」。
  //
  //   第二遍就是補考（同一關、同一個結構）。如果補考又錯，
  //   不回佇列 —— 這個詞就結束了（記錄在案，重玩時再考）。
  //
  //   play.html 傳 retryAllowed=false 表示「這一題本身就是補考」，
  //   所以只在「第一次答錯」時排一次。用旗標而不是 state 內部計數，
  //   是因為一關可能同時有多個 space（oo 有 2 格）→ 會連續呼叫多次，
  //   內部計數會把第二格誤判成「已經補考過」。
  if (r.retryAllowed === false) return { queued: false, mastered: null };

  // 錯了 → 找現有項目累積 failCount，否則新建
  let item = state.retryQueue.find(q => q.key === key);
  if (!item) {
    state.itemSeq += 1;
    item = {
      key,
      itemSeq: state.itemSeq,
      wordId: r.wordId,
      level: r.level,
      probeIndex: r.probeIndex,
      expect: r.expect,
      phonClass: r.phonClass,
      failCount: 0,
      queuedAtNewWords: state.newWordsServed,
      gap: 0,
      spec: r.spec ?? null,     // ★ 這一關的空組快照（舊存檔的兜底，正常不再使用）
      // ★ 2026-11-24（r67）：這個空屬於哪個靶點。
      //   重測時靠它把「答錯的那個結構」重新挖出來，其餘名額重新組裝。
      targetKey: r.targetKey ?? null,
    };
    state.retryQueue.push(item);
  } else if (!item.spec && r.spec) {
    // 舊存檔續玩：佇列項沒有 spec 時補上，避免重測退化成重新組裝
    item.spec = r.spec;
  }
  if (!item.targetKey && r.targetKey) item.targetKey = r.targetKey;

  item.failCount += 1;
  item.gap = gapFor(item.failCount);
  return { queued: true, item };
}

/** 標記某詞已完全掌握（所有 level 都通過） */
export function markMastered(state, wordId) {
  state.masteredWords.add(wordId);
  // 清掉該詞所有待重測
  state.retryQueue = state.retryQueue.filter(q => q.wordId !== wordId);
  state.levelQueue = state.levelQueue.filter(id => id !== wordId);
}

/**
 * 排入「還有後續關卡」的佇列。
 * 答對 L1 但還有 L2/L3 → 排進去，等新詞發完一輪再輪回來。
 */
export function queueNextLevel(state, wordId) {
  // ★ Advanced mode：每個詞只出現一次 → 不排 level 佇列。
  if (state.advanced) return;
  if (!state.levelQueue.includes(wordId)) state.levelQueue.push(wordId);
}

/** 序列化（存 localStorage）—— Set/Map 要轉成一般物件 */
export function serialise(state) {
  return {
    ...state,
    masteredWords: [...state.masteredWords],
    exposureCount: [...state.exposureCount],
    levelProgress: [...state.levelProgress],
    levelQueue: [...state.levelQueue],
    // ★ 嵌套 Map：wordId → targetKey → 'pass'|'fail'
    targetMastery: [...(state.targetMastery ?? new Map())].map(([k, m]) => [k, [...m]]),
    // ★ 嵌套 Map：wordId → Set<targetKey>（只增不減的錯誤紀錄）
    wrong: [...(state.wrong ?? new Map())].map(([k, s]) => [k, [...s]]),
  };
}

/** 反序列化 */
export function deserialise(obj) {
  if (!obj) return null;
  return {
    ...obj,
    masteredWords: new Set(obj.masteredWords ?? []),
    exposureCount: new Map(obj.exposureCount ?? []),
    levelProgress: new Map(obj.levelProgress ?? []),
    levelQueue: [...(obj.levelQueue ?? [])],
    // ★ 舊存檔沒有這個欄位 → 空 Map（等於「這局還沒答對過任何靶點」）
    targetMastery: new Map(
      (obj.targetMastery ?? []).map(([k, arr]) => [k, new Map(arr ?? [])])
    ),
    // ★ 舊存檔沒有 → 空 Map（重玩時就沒有「之前錯的」可優先）
    wrong: new Map((obj.wrong ?? []).map(([k, arr]) => [k, new Set(arr ?? [])])),
    // ★ 舊存檔是 r67 以前開的局，那時只有 difficult 一種規則
    difficulty: obj.difficulty === 'easy' ? 'easy' : 'difficult',
    easy: obj.difficulty === 'easy',
    advanced: !!obj.advanced,       // ★ 舊的存档沒有這個欄位 → 當作一般模式
    served: obj.served ?? 0,          // ★ 舊的存档沒有這個欄位
  };
}

/**
 * 一局最多發幾題。
 *
 * ★ 2026-11-24：n*6+10 → n*9+12。
 *   舊上限是按「一關 1 個空」估的；現在一關 2–3 個空，答錯會為**每個空**
 *   各生成一條重測項，題量自然變多。舊上限會把整局提早截斷，
 *   學生明明還沒做完就被判定結束。
 *   這仍是保險，不是目標值 —— 一局正常約 n×(2~3 關) + 少量重測。
 */
function maxItemsFor(state) {
  const n = state.order?.length || 0;
  return n * 9 + 12;
}

/**
 * 一局是否結束
 *
 * ★ 三個條件必須「同時」成立才算結束：
 *   ① 新詞發完（poolIndex 到底）
 *   ② level 佇列清空（沒有「答對 L1 還要回去做 L2」的詞）
 *   ③ 重測佇列清空
 *
 * ★★ 第③項以前只看「有沒有**已到期**的重測」，這是錯的：
 *   詞少的班級（例：全班只有 2 個詞）會因為 newWordsServed 永遠
 *   達不到 gap 而判定結束 —— 學生答錯的那一格永遠沒有第二次機會，
 *   L2 也永遠不會出現（Results 顯示該詞只有 L1、0%）。
 *   現在只要 retryQueue 非空就還沒結束，讓 nextItem 把它發完。
 *   （但 served 硬上限仍會封頂，所以一直答錯也一定會結束。）
 */
export function isFinished(state) {
  if ((state.served ?? 0) >= maxItemsFor(state)) return true;
  if (state.poolIndex < state.order.length) return false;

  // ★ Advanced mode：所有詞都發完一次 = 結束。
  //   沒有重測、沒有 level 佇列 —— 這就是「像考試一樣」的行為。
  if (state.advanced) return true;

  if (state.levelQueue.length > 0) return false;
  return state.retryQueue.length === 0;
}

/** 進度百分比 */
export function progress(state) {
  const total = state.order.length + state.masteredWords.size;
  if (total === 0) return 0;
  return Math.min(100, Math.round((state.masteredWords.size / total) * 100));
}

/** 統計摘要（寫進 sessions 文件） */
export function summarise(state) {
  const { probes, correct, totalMs } = state.stats;
  return {
    probes,
    correct,
    accuracy: probes ? +(correct / probes).toFixed(4) : 0,
    avgProbeMs: probes ? Math.round(totalMs / probes) : 0,
    totalMs: Math.round(totalMs),
    wordsSeen: state.order.length,
    wordsMastered: state.masteredWords.size,
    retriesQueued: state.retryQueue.length,
  };
}