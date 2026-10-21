/**
 * PCS — Assignments（課程 / 派發）
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 老師在後台建立「課程（assignment）」，每個課程包含一組詞。
 * 系統自動產生一個 4 位數字 PIN，學生在統一網站輸入即可進入該課程。
 *
 * ★ 為什麼用 PIN（Kahoot 模式）：
 *   香港小學課堂 25 台 iPad。老師把一條 URL 投影出來，全班輸入同一組
 *   4 位數字就能一起開始 —— 這是 Kahoot 的模式，學生已經熟悉，
 *   比逐台掃 QR 快得多（掃碼要拿手機瞄，平板要先開相機）。
 *
 * ★ 已移除 QR code：
 *   原本自行實作 QR 編碼器（ISO/IEC 18004），但實測無法被掃碼器解碼，
 *   與其交付一個掃不出來的壞功能，不如不做。日後若要 QR，
 *   應使用成熟的函式庫（qrcode.js / qr-code-styling），不要自寫。
 */

import { PCS_CONFIG } from './config.js';

const C = PCS_CONFIG.collections;

// ─────────────────────────────────────────────��───────────────
// PIN 生成
// ─────────────────────────────────────────────────────────────

/**
 * 產生 4 位純數字 PIN。
 * ★ 為什麼是 4 位數字（Kahoot 模式）：
 *   - 香港小學生抄寫 4 位數字比 6 位英數混雜快得多，也不容易抄錯
 *   - 10000 種組合，課堂同時使用的課程數量遠少於此
 *   - 老師可以自己指定（例如用日期 1015），所以 buildAssignment 支援傳入 pin
 */
export function makePin(random = Math.random) {
  // 首位不能是 0，避免學生以為是 4 位數卻少一位
  let pin = String(1 + Math.floor(random() * 9));
  for (let i = 1; i < 4; i++) pin += String(Math.floor(random() * 10));
  return pin;
}

/** PIN 正規化：學生可能打小寫、可能有空格、可能用全形 */
export function normalisePin(input) {
  return String(input || '')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))  // 全形數字
    .replace(/\s/g, '')
    .toUpperCase();
}

/** 檢查 PIN 格式：4 位純數字 */
export function isValidPinFormat(pin) {
  return /^\d{4}$/.test(normalisePin(pin));
}

// ─────────────────────────────────────────────────────────────
// Assignment 文件結構
// ─────────────────────────────────────────────────────────────

/**
 * 建立一份 assignment（尚未寫入 Firestore）。
 *
 * @param {object} o
 * @param {string} o.title        課程名稱，例如 "Unit 5 · Places"
 * @param {string} o.teacherId
 * @param {string} o.teacherName
 * @param {Array}  o.words        [{ word, sentences:[], imageDataUrl?, imageEmoji? }]
 * @param {string} o.phase        練習階段標記（研究設計已取消前/後測，固定用 practice）
 * @param {string} [o.pin]        不傳則自動產生
 * @returns {object} 可直接 setDoc 到 assignments/{id} 的文件
 */
export function buildAssignment({ title, teacherId, teacherName, words, phase = 'practice', pin, className = '', advanced = false }) {
  if (!title || !title.trim()) throw new Error('Assignment needs a title');
  if (!Array.isArray(words) || words.length === 0) throw new Error('Assignment needs at least one word');
  if (words.length > 30) throw new Error('An assignment can hold at most 30 words');

  const finalPin = pin ? normalisePin(pin) : makePin();
  if (!isValidPinFormat(finalPin)) throw new Error('PIN must be exactly 4 digits');

  // ★ advanced：整詞自行填寫的考試模式（預設 false）。
  //   存在 assignment 文件層級（不是每個 word），因為這是整份試卷的性質。
  //   學生端 play.html 讀 r.assignment.advanced 決定出題方式。
  const isAdvanced = !!advanced;

  // 詞彙 id 要穩定：同一個詞在該課程內固定，方便分析時追蹤
  const items = words.map((w, i) => {
    const text = String(w.word || '').trim().toLowerCase();
    return {
      order: i,
      itemId: w.itemId || `a_${text.replace(/[^a-z]+/g, '_')}`,
      word: text,
      sentences: (w.sentences || []).filter(s => s && s.trim()),
      imageDataUrl: w.imageDataUrl || null,
      imageEmoji: w.imageEmoji || null,
      category: w.category || null,
      note: w.note || null,
    };
  });

  return {
    pin: finalPin,
    title: title.trim(),
    phase,
    className: className || '',
    teacherId: teacherId || null,
    teacherName: teacherName || null,
    advanced: isAdvanced,
    // ★ 一鍵分析用的旗標：advanced 的作答不該跟日常練習混在一起比對
    mode: isAdvanced ? 'dictation' : 'progressive',
    wordCount: items.length,
    items,
    active: true,
    createdAt: null,        // 由 Firestore serverTimestamp() 填
    expiresAt: null,        // 可選：老師可設截止時間
    stats: { sessions: 0, students: 0 },
  };
}

/** Firestore 文件 id：用 PIN 做 key，學生查詢只需一次 getDoc */
export const assignmentDocId = pin => `pin_${normalisePin(pin)}`;

// ─────────────────────────────────────────────────────────────
// 學生端：解析 PIN 與啟動
// ─────────────────────────────────────────────────────────────

/** 從網址讀 PIN（?pin=XXXXXX） */
export function pinFromLocation(search = location.search) {
  const p = new URLSearchParams(search).get('pin');
  return p ? normalisePin(p) : '';
}

/**
 * 學生端啟動一局。
 * @param {object} o
 * @param {string} o.pin
 * @param {string} o.classNo
 * @param {string} o.studentName
 * @returns {Promise<{ok:boolean, error?:string, items?:Array, assignment?:object}>}
 */
export async function joinAssignment({ pin, classNo, studentName }) {
  const p = normalisePin(pin);
  if (!isValidPinFormat(p)) {
    return { ok: false, error: 'badpin' };
  }
  if (!classNo || !String(classNo).trim()) return { ok: false, error: 'noclass' };
  if (!studentName || !String(studentName).trim()) return { ok: false, error: 'noname' };

  try {
    // ★ 只呼叫 initFirestore()。它已經會建好「學生 app」+ 匿名登入。
    //   不要再呼叫 initFirebase({signIn:false}) —— 那會把 teacher app
    //   建成模組層級的單例（ready 快取），導致後續 initFirebase({signIn:true})
    //   直接回傳老師身分，學生的寫入全被 rules 拒絕（症狀：一直「N 筆待上傳」）。
    const { initFirestore } = await import('./firebase.js');
    const { mod, db } = await initFirestore();
    const { doc, getDoc } = mod;

    const ref = doc(db, C.assignments, assignmentDocId(p));
    const snap = await getDoc(ref);

    if (!snap.exists()) return { ok: false, error: 'notfound' };

    const a = snap.data();
    if (a.active === false) return { ok: false, error: 'closed' };

    const items = (a.items || []).slice().sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
    if (!items.length) return { ok: false, error: 'empty' };

    return { ok: true, items, assignment: { id: snap.id, ...a } };
  } catch (e) {
    console.error('[PCS] joinAssignment failed', e);
    return { ok: false, error: 'network' };
  }
}

// ─────────────────────────────────────────────────────────────
// 老師端：連結與 QR
// ─────────────────────────────────────────────────────────────

/** 學生入口網址（含 PIN） */
export function joinUrl(pin, base = location.origin + location.pathname.replace(/[^/]*$/, '')) {
  return `${base}?pin=${normalisePin(pin)}`;
}

/**
 * 老師後台用的派發資訊。
 * @returns {{ pin, url, qrSvg, words:Array }}
 */
export function buildDispatch(assignment, base) {
  return {
    pin: assignment.pin,
    url: joinUrl(assignment.pin, base),
    words: assignment.items.map(i => i.word),
    title: assignment.title,
    wordCount: assignment.items.length,
  };
}
