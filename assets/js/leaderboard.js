/**
 * PCS — Class Leaderboard
 * Progressive Cloze Spelling · CPI 2026
 *
 * Wordwall 風格的班級排名，但計分刻意「鼓勵堅持」而非「鼓勵手快」。
 *
 * ★ 為什麼這樣計分？
 *   小學拼寫練習裡，手快的學生未必學到東西，答錯後自己改回來才代表真的掌握
 *   （這呼應 Karpicke & Roediger 2008 的 retrieval practice 理論）。
 *   所以「錯過但改回來」給的分數和一次答對相同。
 *
 * ★ 隱私設計
 *   只顯示**座號 + 名字**，不顯示完整成績明細。
 *   學生看不到同學答錯了什麼、用了多久。
 */

import { FIREBASE_VERSION, PCS_CONFIG } from './config.js';
import { initFirebase, initFirestore } from './firebase.js';

const V = FIREBASE_VERSION;

// ═══════════════════════════════════════════════
// 計分規則
// ═══════════════════════════════════════════════
/**
 * 評分規則
 *
 * ★ 2026-10-08 移除「快速答對加分」（原本：5 秒內全對 +5 分）。
 *   原因：這個設計對本研究有害 ——
 *   ① 研究要量的是「字母位置是否正確」，速度是與目標無關的額外變項，
 *      卻會影響排名，混淆了兩件事。
 *   ② 對小學生而言，鼓勵「快」會讓學生亂猜，
 *      反而降低逐字母的正確率（症狀：答錯率上升）。
 *   ③ 速度也受裝置、輸入法、學生個別差異影響，不是能力指標。
 *
 *   現在分數只反映「答對幾個字母」與「完成幾個詞」，
 *   與教學目標一致，也讓排名只代表掌握程度。
 */
export const SCORING = {
  correctLetter: 10,      // 每答對一個字母
  // fastBonus / FAST_SECONDS 已移除 —— 見上方說明
  retryBonus: 5,          // 錯過但改回來（答錯過才拿得到）
  wordComplete: 20,       // 完成整個詞
};

/**
 * 計算單次作答的分數。
 * @param {object} r { probes, durationMs, wordCompleted, hadError }
 */
export function scoreRound({ probes = [], durationMs = 0, wordCompleted = false, hadError = false }) {
  const correctCount = probes.filter(p => p.correct).length;

  let points = correctCount * SCORING.correctLetter;

  // 堅持分：這題有錯過，但最後有答對 → 給堅持分
  if (hadError && correctCount > 0) {
    points += SCORING.retryBonus * Math.min(correctCount, 2);
  }

  if (wordCompleted) points += SCORING.wordComplete;

  return {
    points,
    correctCount,
    wrongCount: probes.length - correctCount,
    // kept for backward compatibility with saved scores
    fastBonus: false,
    retryBonus: hadError && correctCount > 0,
  };
}

// ═══════════════════════════════════════════════
// 學生成績快取（本機）
// ═══════════════════════════════════════════════

/** 讀取自己的累計分數 */
export function loadMyScore(sessionId) {
  try {
    const raw = localStorage.getItem(`pcs.score.${sessionId}`);
    return raw ? JSON.parse(raw) : { points: 0, rounds: 0, correct: 0, wrong: 0, words: 0 };
  } catch {
    return { points: 0, rounds: 0, correct: 0, wrong: 0, words: 0 };
  }
}

/**
 * ★ 2026-11-20：把這一局的分數歸零。
 *
 * 為什麼需要：`pcs.score.<sessionId>` 的 key 只有「PIN + 學號 + 日期」，
 *   學生同一天重玩一次，分數會**接著上一局往上加**；
 *   但 `state.stats`（正確率的分母）是每一局從 0 開始的。
 *   結果就是排行榜寫出去的 points 是「今天所有局加起來」，
 *   accuracy 卻只是「最後一局」——
 *   症狀：正確率 43% 的學生，因為重玩過幾次，分數反而是全班最高。
 *
 * 現在：每一局開始時歸零 → 排行榜上的 points 與 accuracy 永遠同一段時間。
 * （多局之間不互相覆蓋：doc id 會帶局號，排行榜取「最高分那一局」）
 */
export function resetMyScore(sessionId) {
  try { localStorage.removeItem(`pcs.score.${sessionId}`); } catch { /* 忽略 */ }
}

/**
 * 本機日期 key（YYYY-MM-DD）。
 * ★ 不能用 toISOString().slice(0,10) —— 那是 UTC，香港早上 8 點前會算成前一天。
 *   排名板只比「今天的比賽」，日期錯了會出現「昨天的人還在榜上」。
 */
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 累加分數 */
export function addScore(sessionId, delta) {
  const cur = loadMyScore(sessionId);
  const next = {
    points: cur.points + (delta.points ?? 0),
    rounds: (cur.rounds ?? 0) + 1,
    correct: (cur.correct ?? 0) + (delta.correctCount ?? 0),
    wrong: (cur.wrong ?? 0) + (delta.wrongCount ?? 0),
    words: (cur.words ?? 0) + (delta.wordCompleted ? 1 : 0),
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(`pcs.score.${sessionId}`, JSON.stringify(next));
  } catch { /* 配額滿了不影響作答 */ }
  return next;
}

// ═══════════════════════════════════════════════
// 班級排名（從 Firestore 的 sessions 讀）
// ═══════════════════════════════════════════════

/**
 * ★★ 排名的分組依據（2026-10-16 修正 Bug 2）
 *
 *  原本用 `className` 分組，但建課表單從來沒有「班別」輸入框 →
 *  assignment.className 恆為 '' → 學生端 `if (!className) return []`
 *  → **班級排名對所有人都是空的**，只能看到自己。
 *
 *  現在改為**優先按課程 PIN（assignmentId）分組**：
 *   · Kahoot 模式本来就是「同一份作業內競賽」，PIN 内即同一班同一份卷
 *   · `assignmentId` 由 joinAssignment 一定帶回，永遠有值，不會再漏
 *   · 老師填了班別（className）時仍可用它作兜底，兼容舊資料
 *
 * @param {object} student  sessionStorage 的學生物件
 * @returns {{field:string, value:string}|null}  null = 兩者都沒有，無法分組
 */
function rankingKey(student) {
  if (student?.assignmentId) return { field: 'assignmentId', value: student.assignmentId };
  if (student?.className)    return { field: 'className',    value: student.className };
  return null;
}

/**
 * ★★ 排名的讀取來源（2026-10-16，Bug 2 第二個根因）
 *
 *  `sessions` 的 rules 是 `allow read: if teacherOrList()` —— 學生（匿名登入）
 *  **讀不到**。所以即使分組鍵修好了，即時排名依然拉不到任何資料
 *  （症狀：恆顯示 "Waiting for other pupils…"）。
 *
 *  解法：另建 `rankBoard` 集合，只放「排行榜 UI 本來就看得見的欄位」，
 *  read 放給已登入者。完整 sessions 仍鎖死，只有老師能讀。
 *
 * @returns {string} collection 名稱
 */
function rankingCollection() {
  return PCS_CONFIG.collections.rankBoard || 'rankBoard';
}

/**
 * 讀取班級排名。
 * ★ 只讀 rankBoard（每局一筆摘要），不是 raw exposures ——
 *   25 人 × 1 局 = 25 reads，不是 25 × 300 = 7500 reads。
 *
 * @param {object} student  學生物件（需要 assignmentId 或 className）
 * @returns {Promise<Array>} 排名陣列
 */
export async function fetchClassRanking(student) {
  const key = rankingKey(student);
  if (!key) return [];

  try {
    // ★ 這是學生端程式碼 → 必須用「學生 app」（initFirestore），
    //   不能用 initFirebase({signIn:false})，那會拿到老師 app 的身分。
    const { db } = await initFirestore();
    const { collection, getDocs, query, where, limit } =
      await import(new URL('../vendor/firebase/firebase-firestore.js', import.meta.url).href);

    const q = query(
      collection(db, rankingCollection()),
      where(key.field, '==', key.value),
      // ★ 只算「今天」—— 比賽是今天的比賽。
      //   少了這一條，前幾天留下的 rankBoard 會一直留在榜上，
      //   看起來就像「今天沒玩的人也有分數」。
      where('dateKey', '==', todayKey()),
      limit(120)          // 一班最多 50 人，綁個上限防止意外讀爆
    );

    const snap = await getDocs(q);

    // 依學生合併（一人可能有多局 → 取最高分那局做排名依據）
    const byStudent = new Map();
    for (const d of snap.docs) {
      const r = d.data();
      const k = `${r.classNo}|${r.studentName}|${r.difficulty === 'easy' ? 'easy' : 'difficult'}`;
      const prev = byStudent.get(k);
      const pts = r.points ?? 0;
      if (!prev || pts > prev.points) {
        byStudent.set(k, {
          classNo: r.classNo,
          name: r.studentName,
          difficulty: r.difficulty === 'easy' ? 'easy' : 'difficult',
          points: pts,
          accuracy: r.accuracy ?? 0,
          wordsMastered: r.wordsMastered ?? 0,
          finishedAt: r.endedAt ?? null,
        });
      }
    }

    return [...byStudent.values()]
      .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  } catch (e) {
    // 讀不到排名不影響學生繼續練習（可能是還沒貼 Security Rules）
    console.warn('[PCS] 排名讀取失敗（不影響作答）', e?.message);
    return [];
  }
}

/**
 * ★ 實時訂閱班級排名（Firestore onSnapshot）。
 * 任何同學提交新 session，正在看排行榜的學生會「立刻」收到更新，
 * 不必手動刷新抽屜 —— 這解決了原本 getDocs 一次性讀取、同學做完也不會動的問題。
 *
 * @param {object} student  學生物件（需要 assignmentId 或 className）
 * @param {(ranking:Array) => void} onUpdate 每次資料變動都會呼叫（含首次快照）
 * @param {(err:Error) => void} [onError]
 * @returns {Promise<() => void>} 取消訂閱的函式（關閉抽屜時要呼叫）
 */
export async function subscribeClassRanking(student, onUpdate, onError) {
  const key = rankingKey(student);
  if (!key) { onUpdate([]); return () => {}; }

  try {
    // ★ 學生端 → 必須用「學生 app」（initFirestore）
    const { db } = await initFirestore();
    const { collection, query, where, limit, onSnapshot } =
      await import(new URL('../vendor/firebase/firebase-firestore.js', import.meta.url).href);

    const q = query(
      collection(db, rankingCollection()),
      where(key.field, '==', key.value),
      where('dateKey', '==', todayKey()),     // ★ 只顯示今天的比賽
      limit(120)
    );

    const unsub = onSnapshot(q, (snap) => {
      // 依學生合併（一人可能有多局 → 取最高分那局做排名依據）
      const byStudent = new Map();
      for (const d of snap.docs) {
        const r = d.data();
        const key = `${r.classNo}|${r.studentName}|${r.difficulty === 'easy' ? 'easy' : 'difficult'}`;
        const pts = r.points ?? 0;
        const prev = byStudent.get(key);
        if (!prev || pts > prev.points) {
          byStudent.set(key, {
            classNo: r.classNo,
            name: r.studentName,
            difficulty: r.difficulty === 'easy' ? 'easy' : 'difficult',
            points: pts,
            accuracy: r.accuracy ?? 0,
            wordsMastered: r.wordsMastered ?? 0,
            finishedAt: r.endedAt ?? null,
          });
        }
      }

      const ranking = [...byStudent.values()]
        .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy)
        .map((s, i) => ({ ...s, rank: i + 1 }));

      onUpdate(ranking);
    }, (err) => {
      // 訂閱過程中出錯不影響作答，也不中斷頁面
      console.warn('[PCS] 排名即時訂閱失敗（不影響作答）', err?.message);
      onError?.(err);
    });

    return unsub;
  } catch (e) {
    console.warn('[PCS] 排名訂閱初始化失敗（不影響作答）', e?.message);
    onError?.(e);
    return () => {};
  }
}

/**
 * 自己的名次（不在前 N 名時也要知道自己排第幾）
 */
export function myRank(ranking, classNo, name) {
  const hit = ranking.find(s => String(s.classNo) === String(classNo) && s.name === name);
  return hit ? { rank: hit.rank, total: ranking.length, points: hit.points } : null;
}

/** 產生一個匿名的 session 摘要（給後台排名用） */
export function buildRankSession({ student, score, startedAt, endedAt, state }) {
  const s = state.stats;
  const accuracy = s.probes ? +(s.correct / s.probes).toFixed(4) : 0;
  return {
    schemaVersion: 2,          // ★ r43：加了 assignmentId / pin，排名改按 PIN 分組
    sessionId: student.sessionId,
    studentName: student.studentName,
    classNo: student.classNo,
    className: student.className,
    // ★ 2026-10-16：排名分組的主鍵。
    //   以前只靠 className，而建課表單沒這個欄位 → 恆為 '' → 排名永遠空的（Bug 2）。
    //   assignmentId 由 joinAssignment 一定帶回，不會再漏。
    assignmentId: student.assignmentId ?? null,
    pin: student.pin ?? null,
    group: student.group ?? 'exp',
    phase: student.phase || 'intervention',
    dateKey: todayKey(),          // ★ 本機日期（不是 UTC）→ 排行榜只比今天
    ladderVersion: PCS_CONFIG.experiment.version,

    startedAt, endedAt,
    durationMs: endedAt - startedAt,

    points: score.points ?? 0,
    accuracy,
    // ★ 2026-11-24（r68）：這一局是 easy 還是 difficult。
    //   排行榜要分上下兩欄；研究資料也要能分層（簡單組 / 困難組）。
    difficulty: state.difficulty === 'easy' ? 'easy' : 'difficult',
    probes: s.probes,
    correctProbes: s.correct,
    wordsMastered: state.masteredWords?.size ?? 0,
    avgProbeMs: s.probes ? Math.round(s.totalMs / s.probes) : 0,

    syncState: 'pending',
  };
}