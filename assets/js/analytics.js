/**
 * PCS — Analytics
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 後台分析運算。純函數（除 loadAnalytics 需要讀 Firestore）。
 *
 * ★ 研究設計考量：
 *   「字母位置錯誤熱區」與「語音結構錯誤分佈」是 PCS 相對 Quizlet
 *   的核心差異化指標 —— 全對全錯的系統無法回答「哪個位置最容易錯」，
 *   但 PCS 的逐字母資料可以。
 */

import { FIREBASE_VERSION, PCS_CONFIG } from './config.js';
import { initFirebase } from './firebase.js';

const V = FIREBASE_VERSION;

// ═══════════════════════════════════════════════
// 讀取
// ═══════════════════════════════════════════════

/**
 * 讀取 exposures（含篩選）。
 * ★ 只讀「需要的」資料 —— 避免讀爆每日 50,000 reads 免費額度。
 */
export async function loadAnalytics(filters = {}) {
  // ★ 已移除 phase（pretest / posttest / delayed）篩選。
  //   研究設計不需要前測後測，只做練習期的追蹤。
  const { className = '', word = '', date = '' } = filters;

  const db = (await initFirebase({ signIn: false })).db;
  const { collection, getDocs, query, where, orderBy, limit } =
    await import(new URL('../vendor/firebase/firebase-firestore.js', import.meta.url).href);

  const col = collection(db, PCS_CONFIG.collections.exposures);
  const clauses = [];

  // ★★★ 不要把 where 和 orderBy 混在同一个 query 裡。
  //   Firestore 會要求「複合索引」，沒建就整個查詢拋錯：
  //   "The query requires an index. You can create composite index here..."
  //   → 篩選功能整個不能用（使用者回報的問題）。
  //
  //   正確做法：**先只做 where（單欄位索引 Firestore 自動提供），
  //   排序在本地做**。資料量對研究原型來說很小（幾千筆），
  //   本地排序的成本遠低於要求使用者去 Console 建索引。
  if (className) clauses.push(where('className', '==', className));
  if (date)     clauses.push(where('dateKey', '==', date));
  if (word)     clauses.push(where('word', '==', word));

  let snap;
  if (clauses.length) {
    snap = await getDocs(query(col, ...clauses, limit(4000)));
  } else {
    // 沒有篩選時才用 orderBy（單欄位索引，不需要複合索引）
    snap = await getDocs(query(col, orderBy('clientTs', 'desc'), limit(4000)));
  }

  const exposures = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    // ★ 本地排序，取代 Firestore 的 orderBy（見上方說明）
    .sort((a, b) => (b.clientTs ?? 0) - (a.clientTs ?? 0));

  // ★★ 再加讀 sessions：這是「學生真的把一局做完了」的唯一權威紀錄。
  //
  //   為什麼需要：exposures 只看得到「作答過的詞」，判斷完成與否
  //   只能拿它跟「作業目前的詞數」相比 —— 老師事後新增詞彙、
  //   或學生續玩舊存檔時，兩者會對不起來，後台就誤報
  //   「unfinished / N words not attempted」，明明學生已經做完。
  //   sessions 文件是學生在結算頁（renderResult）才寫的，
  //   有它就代表那一局結束了，而且帶著結束時間。
  //
  //   讀 500 筆足夠一個班級規模；失敗也不影響其他統計。
  let sessions = [];
  try {
    const sSnap = await getDocs(
      query(collection(db, PCS_CONFIG.collections.sessions), limit(500)));
    sessions = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[PCS] sessions 讀取失敗（只影響「完成時間」欄）', e?.message);
  }

  return {
    exposures,
    sessions,
    filters,
    fetchedAt: Date.now(),
    truncated: snap.size >= 4000,
  };
}

// ═══════════════════════════════════════════════
// 聚合運算（純函數）
// ═══════════════════════════════════════════════

/** 整體統計 */
export function overallStats(exposures) {
  let probes = 0, correct = 0, totalMs = 0;
  const students = new Set(), words = new Set(), sessions = new Set();

  for (const e of exposures) {
    for (const p of (e.probes ?? [])) {
      probes++;
      if (p.correct) correct++;
      totalMs += p.ms ?? 0;
    }
    if (e.studentName && e.classNo) students.add(`${e.className}-${e.classNo}-${e.studentName}`);
    if (e.word) words.add(e.word);
    if (e.sessionId) sessions.add(e.sessionId);
  }

  return {
    exposures: exposures.length,
    probes,
    correct,
    accuracy: probes ? correct / probes : 0,
    avgProbeMs: probes ? Math.round(totalMs / probes) : 0,
    students: students.size,
    words: words.size,
    sessions: sessions.size,
  };
}

/**
 * ★ 字母位置錯誤熱區 — 研究核心指標之一。
 * 「哪一個序位最容易拼錯」
 */
export function errorByPosition(exposures) {
  const err = {}, tot = {};
  for (const e of exposures) {
    for (const p of (e.probes ?? [])) {
      tot[p.i] = (tot[p.i] ?? 0) + 1;
      if (!p.correct) err[p.i] = (err[p.i] ?? 0) + 1;
    }
  }
  return Object.keys(tot)
    .map(Number)
    .sort((a, b) => a - b)
    .map(i => ({
      position: i + 1,                  // 1-based（論文用的序位）
      index: i,
      errors: err[i] ?? 0,
      total: tot[i],
      rate: tot[i] ? (err[i] ?? 0) / tot[i] : 0,
    }));
}

/**
 * ★ 語音結構錯誤分佈 — 研究核心指標。
 * 直接回答「哪個語音結構最難」
 */
export function errorByPhonClass(exposures) {
  const m = {};
  for (const e of exposures) {
    for (const p of (e.probes ?? [])) {
      const k = p.phonClass ?? 'unknown';
      m[k] ??= { errors: 0, total: 0 };
      m[k].total++;
      if (!p.correct) m[k].errors++;
    }
  }
  return Object.entries(m)
    .map(([cls, v]) => ({
      class: cls,
      errors: v.errors,
      total: v.total,
      rate: v.total ? v.errors / v.total : 0,
    }))
    .sort((a, b) => b.rate - a.rate);
}

/** 逐日正確率趨勢（實驗組 vs 對照組） */
export function trendByDay(exposures) {
  const m = {};
  for (const e of exposures) {
    const k = `${e.dateKey}|${e.className ?? ''}`;
    m[k] ??= { date: e.dateKey, className: e.className ?? '—', probes: 0, correct: 0, ms: 0 };
    for (const p of (e.probes ?? [])) {
      m[k].probes++;
      if (p.correct) m[k].correct++;
      m[k].ms += p.ms ?? 0;
    }
  }
  return Object.values(m)
    .map(r => ({ ...r, accuracy: r.probes ? r.correct / r.probes : 0, avgMs: r.probes ? Math.round(r.ms / r.probes) : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 各階梯 level 的正確率與用時（驗證「階梯越難越容易錯」） */
export function byLevel(exposures) {
  const m = {};
  for (const e of exposures) {
    const L = e.level ?? 0;
    m[L] ??= { level: L, probes: 0, correct: 0, ms: 0, exposures: 0 };
    m[L].exposures++;
    for (const p of (e.probes ?? [])) {
      m[L].probes++;
      if (p.correct) m[L].correct++;
      m[L].ms += p.ms ?? 0;
    }
  }
  return Object.values(m)
    .sort((a, b) => a.level - b.level)
    .map(r => ({
      ...r,
      accuracy: r.probes ? r.correct / r.probes : 0,
      avgMs: r.probes ? Math.round(r.ms / r.probes) : 0,
    }));
}

/** 每個詞的正確率 */
export function byWord(exposures) {
  const m = {};
  for (const e of exposures) {
    const w = e.word ?? '(unknown)';
    m[w] ??= { word: w, probes: 0, correct: 0, ms: 0, targetPatterns: new Set() };
    if (e.targetPattern) m[w].targetPatterns.add(e.targetPattern);
    for (const p of (e.probes ?? [])) {
      m[w].probes++;
      if (p.correct) m[w].correct++;
      m[w].ms += p.ms ?? 0;
    }
  }
  return Object.values(m)
    .map(r => ({
      word: r.word,
      probes: r.probes,
      correct: r.correct,
      accuracy: r.probes ? r.correct / r.probes : 0,
      avgMs: r.probes ? Math.round(r.ms / r.probes) : 0,
      patterns: [...r.targetPatterns].join(', '),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);       // 最難的排前面
}

/** 字母混淆熱力圖（expected → got） */
export function confusions(exposures, minCount = 2) {
  const m = new Map();
  for (const e of exposures) {
    for (const p of (e.probes ?? [])) {
      if (p.correct || !p.got || p.got === p.expect) continue;
      const k = `${p.expect}→${p.got}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
  }
  return [...m.entries()]
    .filter(([, n]) => n >= minCount)
    .map(([pair, n]) => ({ pair, from: pair.split('→')[0], to: pair.split('→')[1], n }))
    .sort((a, b) => b.n - a.n);
}

/** 學生排名 */
export function byStudent(exposures) {
  const m = new Map();
  for (const e of exposures) {
    const key = `${e.className ?? '—'}|${e.classNo ?? '?'}|${e.studentName ?? '?'}`;
    m.set(key, {
      className: e.className ?? '—',
      classNo: e.classNo ?? '?',
      name: e.studentName ?? '?',
      probes: 0, correct: 0, ms: 0, words: new Set(), sessions: new Set(),
    });
  }
  for (const e of exposures) {
    const key = `${e.className ?? '—'}|${e.classNo ?? '?'}|${e.studentName ?? '?'}`;
    const r = m.get(key);
    if (e.word) r.words.add(e.word);
    if (e.sessionId) r.sessions.add(e.sessionId);
    for (const p of (e.probes ?? [])) {
      r.probes++;
      if (p.correct) r.correct++;
      r.ms += p.ms ?? 0;
    }
  }
  return [...m.values()]
    .map(r => ({
      ...r,
      words: r.words.size,
      sessions: r.sessions.size,
      accuracy: r.probes ? r.correct / r.probes : 0,
      avgMs: r.probes ? Math.round(r.ms / r.probes) : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

// ═══════════════════════════════════════════════
// 渲染
// ═══════════════════════════════════════════════

// ★★ 暫時隱藏的區塊（研究設計不需要／老師要求先藏起来）。
//    保留程式碼，日後要開回來只要把對應的 HIDE 改成 false即可。
//    目前只用「每個 assignment 分包」那張表（admin.html 裡），
//    這張總表先精簡到最小。
const HIDE = {
  trendByDay: true,      // 逐日正確率趨勢
  byWord: true,         // 各詞正確率
  byLevel: true,        // 各階梯 level 的正確率與用時
  errorByPosition: true, // ★ 字母位置錯誤熱區
  kpiRow: true,         // 頂部五個數字（整體正確率 / 格數 / 用時 / 學生 / 詞數）
};

export function renderAnalysis(data) {
  const { exposures, truncated } = data;
  const o = overallStats(exposures);
  const pos = errorByPosition(exposures);
  const cls = errorByPhonClass(exposures);
  const lv = byLevel(exposures);
  const wd = byWord(exposures);
  const cf = confusions(exposures);
  const stu = byStudent(exposures);
  const day = trendByDay(exposures);
  const phase = null;   // ★ 已移除 phaseComparison（前/後/延遲測）

  const pct = v => (v * 100).toFixed(1) + '%';
  const bar = (rate, w = 120) =>
    `<div style="display:flex;align-items:center;gap:8px">
       <div style="flex:1;height:7px;background:var(--line);border-radius:4px;overflow:hidden;max-width:${w}px">
         <div style="height:100%;width:${(rate * 100).toFixed(1)}%;background:${rate > .4 ? 'var(--wrong)' : rate > .2 ? '#F59E0B' : 'var(--correct)'}"></div>
       </div>
       <span style="font-size:12px;font-variant-numeric:tabular-nums;color:var(--ink-soft)">${pct(rate)}</span>
     </div>`;

  return `
  ${truncated ? '<div class="msg info show">⚠️ More than 4000 records — only the most recent are shown. Use the filters to narrow it down.</div>' : ''}

  ${HIDE.kpiRow ? '' : `
  <!-- KPI -->
  <div class="kpis" style="margin-bottom:18px">
    <div class="kpi"><div class="v">${pct(o.accuracy)}</div><div class="k">Overall accuracy</div></div>
    <div class="kpi"><div class="v">${o.probes}</div><div class="k">Letters answered</div></div>
    <div class="kpi"><div class="v">${(o.avgProbeMs / 1000).toFixed(1)}s</div><div class="k">Avg time per letter</div></div>
    <div class="kpi"><div class="v">${o.students}</div><div class="k">Students</div></div>
    <div class="kpi"><div class="v">${o.words}</div><div class="k">Words covered</div></div>
  </div>`}

  ${HIDE.errorByPosition ? '' : `
  <!-- ★ 字母位置錯誤熱區 -->
  <div class="card">
    <h2>★ Letter-position hotspots <span class="pill">core metric</span></h2>
    <p class="desc">Which letter slot students miss most. This is what separates PCS from all-or-nothing tools: they cannot answer it at all.</p>
    <div class="tbl-wrap"><table>
      <tr><th>Position</th><th>Errors</th><th>Attempts</th><th>Error rate</th><th></th></tr>
      ${pos.map(p => `<tr>
        <td><strong>Letter ${p.position}</strong></td>
        <td>${p.errors}</td><td>${p.total}</td>
        <td>${pct(p.rate)}</td>
        <td>${bar(p.rate)}</td>
      </tr>`).join('') || '<tr><td colspan="5">No data</td></tr>'}
    </table></div>
  </div>`}

  <!-- ★ 語音結構錯誤分佈（預設收起 —— 兩張表已經很長，老師要自己點開） -->
  <div class="card collapsible" data-card="sound">
    <h2 class="collapse-head" role="button" tabindex="0" aria-expanded="false">
      <span class="caret" aria-hidden="true">▸</span>
      ★ Errors by sound pattern <span class="pill">core metric</span>
    </h2>
    <div class="collapse-body">
    <p class="desc">Answers the research question directly: <strong>which sound structure is hardest</strong>.</p>
    <div class="tbl-wrap"><table>
      <tr><th>Sound pattern</th><th>Errors / Attempts</th><th>Error rate</th><th></th></tr>
      ${cls.map(c => `<tr>
        <td><code class="mono">${c.class}</code></td>
        <td>${c.errors} / ${c.total}</td>
        <td>${pct(c.rate)}</td>
        <td>${bar(c.rate)}</td>
      </tr>`).join('') || '<tr><td colspan="4">No data</td></tr>'}
    </table></div>
    </div>
  </div>

  ${HIDE.byLevel ? '' : `
  <!-- 各階梯 level 表現 -->
  <div class="card">
    <h2>Accuracy and time by level</h2>
    <p class="desc">Tests the design assumption: the higher the level (the harder the blank), the lower the accuracy and the longer the time.</p>
    <div class="tbl-wrap"><table>
      <tr><th>Level</th><th>Items</th><th>Accuracy</th><th>Avg time</th><th></th></tr>
      ${lv.map(r => `<tr>
        <td><strong>L${r.level}</strong></td>
        <td>${r.exposures}</td><td>${pct(r.accuracy)}</td>
        <td>${(r.avgMs / 1000).toFixed(1)}s</td>
        <td>${bar(r.accuracy)}</td>
      </tr>`).join('') || '<tr><td colspan="5">No data</td></tr>'}
    </table></div>
  </div>`}

  ${HIDE.byWord ? '' : `
  <!-- 最難的詞 -->
  <div class="card">
    <h2>Accuracy by word <span class="pill grey">hardest first</span></h2>
    <div class="tbl-wrap"><table>
      <tr><th>Word</th><th>Target pattern</th><th>Letters</th><th>Accuracy</th><th>Avg time</th></tr>
      ${wd.map(r => `<tr>
        <td><strong>${r.word}</strong></td>
        <td>${r.patterns ? `<code class="mono">${r.patterns}</code>` : '—'}</td>
        <td>${r.probes}</td>
        <td>${pct(r.accuracy)}</td>
        <td>${(r.avgMs / 1000).toFixed(1)}s</td>
      </tr>`).join('') || '<tr><td colspan="5">No data</td></tr>'}
    </table></div>
  </div>`}

  ${HIDE.trendByDay ? '' : `
  <!-- 逐日趨勢 -->
  <div class="card">
    <h2>Daily accuracy trend <span class="pill">main result</span></h2>
    <p class="desc">Does accuracy rise over the intervention days? This is the main figure in the thesis.</p>
    <div class="tbl-wrap"><table>
      <tr><th>Date</th><th>Assignment</th><th>Letters</th><th>Accuracy</th><th>Avg time</th><th></th></tr>
      ${day.map(r => `<tr>
        <td class="mono">${r.date}</td><td>${r.className}</td>
        <td>${r.probes}</td><td>${pct(r.accuracy)}</td>
        <td>${(r.avgMs / 1000).toFixed(1)}s</td>
        <td>${bar(r.accuracy)}</td>
      </tr>`).join('') || '<tr><td colspan="6">No data</td></tr>'}
    </table></div>
  </div>`}

  <!-- 字母混淆 -->
  ${cf.length ? `
  <div class="card">
    <h2>Letter confusions <span class="pill grey">seen ≥ ${2}×</span></h2>
    <p class="desc">Which letter students wrote instead. Useful for spotting look-alike letter pairs to teach.</p>
    <div style="display:flex;flex-wrap:wrap;gap:9px">
      ${cf.map(c => `<span class="pill" style="font-family:var(--font-mono);font-size:13px">
        ${c.from} → ${c.to} <strong>×${c.n}</strong></span>`).join('')}
    </div>
  </div>` : ''}

  <!-- 學生排名（預設收起） -->
  <div class="card collapsible" data-card="students">
    <h2 class="collapse-head" role="button" tabindex="0" aria-expanded="false">
      <span class="caret" aria-hidden="true">▸</span>
      Student results <span class="pill grey">highest first</span>
    </h2>
    <div class="collapse-body">
    <p class="desc">Read the trend only — do not publish these ranks. Public ranking does pupils' confidence no good.</p>
    <div class="tbl-wrap"><table>
      <tr><th>Assignment</th><th>No.</th><th>Name</th><th>Letters</th><th>Accuracy</th><th>Avg time</th><th>Words</th></tr>
      ${stu.map(r => `<tr>
        <td>${r.className}</td><td>${r.classNo}</td><td>${r.name}</td>
        <td>${r.probes}</td><td>${pct(r.accuracy)}</td>
        <td>${(r.avgMs / 1000).toFixed(1)}s</td><td>${r.words}</td>
      </tr>`).join('') || '<tr><td colspan="7">No data</td></tr>'}
    </table></div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════
// CSV 匯出
// ═══════════════════════════════════════════════

/**
 * 匯出兩份 CSV：
 *   1. exposures — 一行一個 probe（攤平），給 SPSS / Excel 做統計
 *   2. summary   — 一行一個 exposure，適合快速看
 *
 * ★ UTF-8 BOM：沒有 BOM 的話 Excel 開中文會亂碼。
 */
export function exportCsv(data) {
  const { exposures } = data;
  const stamp = new Date().toISOString().slice(0, 10);

  // ── CSV 1：逐 probe ──
  const probeRows = [];
  for (const e of exposures) {
    for (const p of (e.probes ?? [])) {
      probeRows.push({
        exposureId: e.exposureId,
        dateKey: e.dateKey,
        sessionId: e.sessionId,
        className: e.className,
        classNo: e.classNo,
        studentName: e.studentName,
        phase: e.phase,
        mode: e.mode,
        word: e.word,
        sentence: e.sentence,
        level: e.level,
        targetPattern: e.targetPattern,
        targetCategory: e.targetCategory,
        probeIndex: p.i + 1,          // 1-based，論文用的序位
        expected: p.expect,
        got: p.got,
        correct: p.correct ? 1 : 0,
        ms: p.ms,
        attemptNo: p.attemptNo,
        phonClass: p.phonClass,
        errorCode: p.errorCode ?? '',
        isRetry: e.isRetry ? 1 : 0,
        skipped: e.skipped ? 1 : 0,
        offline: e.offline ? 1 : 0,
      });
    }
  }
  downloadCsv(probeRows, `pcs_exposures_${stamp}.csv`);

  // ── CSV 2：逐 exposure 摘要 ──
  const sumRows = exposures.map(e => ({
    exposureId: e.exposureId,
    dateKey: e.dateKey,
    className: e.className,
    classNo: e.classNo,
    studentName: e.studentName,
    phase: e.phase,
    word: e.word,
    level: e.level,
    targetPattern: e.targetPattern,
    targetWeight: e.targetWeight,
    probes: (e.probes ?? []).length,
    correct: (e.probes ?? []).filter(p => p.correct).length,
    durationMs: e.durationMs,
    isRetry: e.isRetry ? 1 : 0,
    skipped: e.skipped ? 1 : 0,
    offline: e.offline ? 1 : 0,
  }));
  setTimeout(() => downloadCsv(sumRows, `pcs_sessions_${stamp}.csv`), 400);

  return { probeRows: probeRows.length, sumRows: sumRows.length };
}

/**
 * 把任意一組 rows 下載成 CSV。
 * ★ 從 downloadCsv 抽出來，這樣後台「每個 assignment 各自的 CSV」能重用。
 *   必須保留 UTF-8 BOM，否則 Excel 開中文會亂碼。
 */
export function downloadCsvRows(rows, filename) {
  if (!rows?.length) { alert('Nothing to export.'); return; }

  const headers = Object.keys(rows[0]);
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = '﻿'                      // BOM → Excel 中文不亂碼
    + [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv(rows, filename) {
  downloadCsvRows(rows, filename);
}