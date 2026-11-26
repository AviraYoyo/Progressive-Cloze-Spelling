/**
 * PCS — Exposure Record Builder
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * ★ 關鍵設計：一次 exposure（看到某詞某個挖空模式）= 一份 document，
 *   內含 probes 陣列。
 *
 *   為什麼不「一個字母 probe 一份 document」？
 *   Firestore 免費額度是每天 20,000 writes。按 probe 粒度，50 人 × 331 probes
 *   = 16,550 writes/日 = 83% 額度。一旦超標，Spark 方案是「整個月停用」，
 *   7 天介入實驗會直接泡湯。改成 exposure 粒度後峰值約 8,000（40%）。
 *
 * 這個檔案只負責「組資料」，不做任何網絡請求 —— 寫入交給 outbox.js。
 */

import { PCS_CONFIG } from './config.js';

/** 本地日期字串 YYYY-MM-DD（老師篩選用） */
function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 這個（session・班號・詞・exposureIndex）已經提交過幾次。
 *
 * ★ 為什麼要存在 localStorage 而不是只放在記憶體：
 *   學生「答完 → 重新載入 → 再玩一次」時是新的 JS 執行環境，
 *   記憶體計數會歸零，於是又拿回同一個 id → 又被 rules 拒絕。
 *   存 localStorage 才能跨重新載入遞增。
 * ★ 也保留一份記憶體計數：無痕模式 / 儲存空間滿了時 localStorage 會拋錯，
 *   至少同一頁內不會重複。
 */
const attemptMemo = new Map();
function nextAttemptNo(baseId) {
  const key = `pcs.exp.n.${baseId}`;
  let n = attemptMemo.get(baseId) ?? 0;
  try {
    const stored = Number(localStorage.getItem(key) || 0) || 0;
    n = Math.max(n, stored) + 1;
    localStorage.setItem(key, String(n));
  } catch {
    n += 1;                       // localStorage 不可用 → 只用記憶體
  }
  attemptMemo.set(baseId, n);
  return n;
}

/**
 * 建立一筆 exposure 記錄。
 *
 * @param {object} o
 * @param {object} o.student      { studentName, classNo, className, sessionId, phase, pin }
 * @param {string} o.word         目標詞
 * @param {string} o.wordId
 * @param {string} o.sentence     這次實際顯示的例句
 * @param {number} o.level        關卡編號（1-based）
 * @param {string} o.targetPattern被挖的 pattern
 * @param {string} o.targetCategory
 * @param {number} o.targetWeight
 * @param {Array}  o.targets     本關所有靶點 [{key,pattern,category,weight,kind,blanks}]
 * @param {number[]} o.blanks     挖空位置（0-based）
 * @param {Array}  o.probes       [{i, expect, got, correct, ms, attemptNo, phonClass, errorCode}]
 * @param {number} o.durationMs   整題用時
 * @param {number} o.exposureIndex
 * @param {boolean} o.isRetry     是否來自回溯佇列
 * @param {string} o.mode         progressive | dictation | advanced
 * @param {boolean} o.skipped
 */
export function recordExposure(o) {
  const {
    student, word, wordId, sentence, level,
    targetPattern, targetCategory, targetWeight,
    blanks, probes, durationMs, exposureIndex,
    isRetry, mode = 'progressive', skipped = false,
    targets = null,
  } = o;

  const now = Date.now();

  // ★ 2026-11-24：一關可能挖 2–3 個不同的語音結構（例：y_as_vowel + magic_e）。
  //   舊 schema 只有單一 targetPattern/targetCategory，多空時會被壓成一個 →
  //   「哪個結構最難」這個核心研究指標就失真了。
  //   現在 targets 逐個記錄，同時把「主靶點」（權重最高那個）填回舊欄位，
  //   舊的查詢與 CSV 不用改。
  const targetList = (Array.isArray(targets) ? targets : [])
    .filter(Boolean)
    .map(t => ({
      key: t.key ?? null,
      pattern: t.pattern ?? null,
      category: t.category ?? null,
      weight: t.weight ?? null,
      kind: t.kind ?? null,
      blanks: Array.isArray(t.blanks) ? t.blanks : [],
    }));

  const primary = targetList.reduce(
    (m, t) => (!m || (t.weight ?? 0) > (m.weight ?? 0) ? t : m), null);

  const pat = targetPattern ?? primary?.pattern ?? null;
  const cat = targetCategory ?? primary?.category ?? null;
  const wei = targetWeight ?? primary?.weight ?? null;

  // ★ 冪等鍵：同一 session 同一詞同一 exposureIndex 只會產生一份 document。
  //   離線重試時覆寫同一份，永不產生重複紀錄。
  //
  // ★★ r82：但「同一題被作答第二次」不是重試，是**另一筆資料**。
  //
  //   Try again、整局 Play again 都會讓同一組（session, 班號, 詞, exposureIndex）
  //   再提交一次。舊版 id 不含「第幾次」，所以第二次是 setDoc **覆寫**同一份 doc，
  //   而 rules 的 exposures 只允許 create（update 僅限改 serverTs）
  //   → permission-denied，資料卡在 outbox，學生看到「Upload failed (N)」，
  //   老師後台也就少了那幾筆（而且完全無聲）。
  //
  //   現在 id 加上遞增序號：第一次仍是原本的 id（舊資料、舊查詢都不受影響），
  //   之後每次多一筆 *_a2、*_a3。同一個 record 被 outbox 重送時 id 不變，
  //   幂等性完全保留。
  const baseId = [
    student.sessionId || 'nosession',
    student.classNo || 'noclass',
    wordId,
    String(exposureIndex ?? 0),
  ].join('_');

  const attemptNo = nextAttemptNo(baseId);
  const exposureId = attemptNo === 1 ? baseId : `${baseId}_a${attemptNo}`;

  // 逐字母錯誤統計（後台的「最常錯字母位置」直接用這個）
  const errByIndex = {};
  for (const p of probes) {
    if (!p.correct) errByIndex[p.i] = (errByIndex[p.i] ?? 0) + 1;
  }

  // 語音類別錯誤統計（研究核心：哪個語音結構最難）
  const errByPhonClass = {};
  for (const p of probes) {
    if (!p.correct && p.phonClass) {
      errByPhonClass[p.phonClass] = (errByPhonClass[p.phonClass] ?? 0) + 1;
    }
  }

  // 混淆對（b↔d、p↔q…）
  const confusions = {};
  for (const p of probes) {
    if (!p.correct && p.got) {
      const k = `${p.expect}→${p.got}`;
      confusions[k] = (confusions[k] ?? 0) + 1;
    }
  }

  return {
    // ── 追蹤 ──
    exposureId,
    // ★ 1 → 2（2026-11-24）：新增 targets 数组 + 逐 probe 的 targetKey/phonClass。
    //   分析時可以按版本分層，避免新舊口徑混在同一張圖。
    schemaVersion: 2,
    sessionId: student.sessionId || null,
    studentName: student.studentName || null,
    classNo: student.classNo || null,   // ★ 欄位名跟著 UI：Seat No. → Class No.
    className: student.className || null,
    phase: student.phase || 'intervention',
    dateKey: localDateKey(),

    // ★★★ 這筆作答屬於哪一個課程（PIN）。
    //   沒有這三個欄位，後台就無法「每個 assignment 分別打包」——
    //   所有課程的資料會混在一起，無法回答「Unit 5 那班錯最多的是什麼」。
    //   assignmentId = pin_1234（與 Firestore document id 相同）
    //   pin         = 4 位數字，老師一眼認得
    //   classTitle  = 課程名稱快照（改了名稱也不影響舊資料）
    assignmentId: student.assignmentId || (student.pin ? `pin_${student.pin}` : null),
    pin: student.pin || null,
    classTitle: student.assignmentTitle || student.classTitle || null,

    // ── 題目 ──
    mode,
    // ★ r68：這一題出自哪個難度（easy / difficult）。
    //   分析時必須分層 —— Easy 每題只有一個結構、每詞只兩遍，
    //   和 Difficult 的資料混在一起算「平均每關錯誤率」會失真。
    difficulty: o.difficulty === 'easy' ? 'easy' : 'difficult',
    wordId,
    word,                    // ★ 被挖的目標詞（短語時是 office，不是 a post office）
    phrase: o.phrase ?? null, // ★ 完整短語（單詞時為 null）
    isPhrase: !!o.isPhrase,
    sentence,
    level,
    // ── 主靶點（權重最高那個）—— 舊欄位，維持向後兼容 ──
    targetPattern: pat,
    targetCategory: cat,
    targetWeight: wei,
    // ★ 本關所有靶點（2026-11-24）。一關 2–3 個空，可能分屬不同語音結構；
    //   probes[].phonClass 會逐格對到自己所屬的靶點類別。
    targets: targetList,
    targetCount: targetList.length,
    blanks,
    blankCount: blanks.length,
    exposureIndex: exposureIndex ?? 0,
    // ★ r82：這是同一個（詞・關卡）的第幾次提交（1 = 第一次，2 = 按了 Try again…）。
    //   分析時可以用它算「一個詞要練幾次才對」，或只取第一次做前後測比較。
    attemptNo,
    isRetry: !!isRetry,
    skipped,

    // ── 作答 ──
    startedAt: now - durationMs,
    answeredAt: now,
    durationMs,
    probes,
    wordCompleted: probes.every(p => p.correct),
    supported: probes.some(p => p.correct && p.attemptNo > 1),

    // ── 統計（後台分析用）──
    errByIndex,
    errByPhonClass,
    confusions,

    // ── 環境 ──
    offline: !navigator.onLine,
    clientTs: now,
    // serverTs 由 Firestore 自動填
  };
}

/**
 * 由一局的 scheduler 狀態產生 session 摘要。
 * 後台分析讀這份（50 份），不掃 raw exposures（3.7 萬份）—— 省 99% reads。
 */
export function recordSession({ student, state, startedAt, endedAt }) {
  const s = state.stats;
  const accuracy = s.probes ? +(s.correct / s.probes).toFixed(4) : 0;

  // 各關卡表現（驗證「階梯越難正確率越低」這個設計假設）
  const byLevelMap = {};
  for (const p of state.probeLog ?? []) {
    const k = String(p.level);
    byLevelMap[k] ??= { level: p.level, probes: 0, correct: 0, ms: 0 };
    byLevelMap[k].probes += 1;
    if (p.correct) byLevelMap[k].correct += 1;
    byLevelMap[k].ms += p.ms ?? 0;
  }
  const byLevel = Object.values(byLevelMap)
    .sort((a, b) => a.level - b.level)
    .map(r => ({ ...r, avgMs: r.probes ? Math.round(r.ms / r.probes) : 0 }));

  return {
    schemaVersion: 1,
    sessionId: student.sessionId,
    studentName: student.studentName,
    classNo: student.classNo,
    className: student.className,
    group: student.group ?? 'exp',
    phase: student.phase || 'intervention',
    dayIndex: student.dayIndex ?? null,
    dateKey: localDateKey(),
    wordListId: student.wordListId ?? null,
    ladderVersion: PCS_CONFIG.experiment.version,

    startedAt, endedAt,
    durationMs: endedAt - startedAt,

    targets: {
      words: state.order.length,
      mastered: state.masteredWords.size,
      probes: s.probes,
    },
    accuracy,
    avgProbeMs: s.probes ? Math.round(s.totalMs / s.probes) : 0,

    byLevel,
    errByIndex: state.errByIndex ?? {},
    errByPhonClass: state.errByPhonClass ?? {},
    topConfusions: Object.entries(state.confusions ?? {})
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([k, n]) => ({ pair: k, n })),

    wordsMastered: state.masteredWords.size,
    syncState: 'pending',
  };
}