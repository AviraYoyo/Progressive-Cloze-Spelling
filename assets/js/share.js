/**
 * PCS — 作業分享 / 複製（純邏輯，不碰 DOM、不碰 Firebase）
 *
 * ★ 為什麼獨立成一個檔案？
 *   這一段最容易出錯的地方不是 UI，而是「payload 的每個欄位」：
 *   少剔一個 id 就會把 d.id 寫進文檔、某個欄位是 undefined 就會被
 *   Firestore 整份拒絕、stats 沒清零就會污染研究統計。
 *   抽成純函式後可以直接在 node 裡逐欄位驗證，不必開瀏覽器點。
 *
 * 語意：複製成**一份全新的獨立作業**（新 PIN、成績互不相通），
 *       不是共用同一份。
 */

/** Firestore 單文檔 1 MB；留一點餘量給欄位名與編碼開銷 */
export const MAX_COPY_BYTES = 850 * 1024;

/**
 * 給老師用的分享連結。
 * @param {string} baseHref  目前頁面的完整 URL（location.href）
 * @param {string|number} pin
 */
export function shareUrl(baseHref, pin) {
  // ★ 用 URL API 而不是字串拼接：歷史坑是 '?' 拼錯會毀掉既有 query
  const u = new URL('admin.html', baseHref);   // 相對解析 → 自動丟掉 ?share / ?_r
  u.searchParams.set('share', String(pin));
  return u.href;
}

/** 從網址參數取分享 PIN（只認 4 位數字，其餘視為沒有） */
export function sharePinFrom(search) {
  const v = String(new URLSearchParams(search || '').get('share') || '').trim();
  return /^\d{4}$/.test(v) ? v : '';
}

/** 正規化 items：重排 order、undefined → null、過濾非字串例句 */
export function normaliseItems(items) {
  return (Array.isArray(items) ? items : [])
    .slice()
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
    .map((it, i) => ({
      order: i,
      // ★ itemId 原樣保留（同一個 wordId）→ 跨作業的詞級分析才可比
      itemId: it?.itemId
        || `a_${String(it?.word || '').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      word: it?.word ?? '',
      sentences: Array.isArray(it?.sentences)
        ? it.sentences.filter(s => typeof s === 'string' && s.trim() !== '')
        : [],
      // ★ 一律 ?? null：Firestore 會拒絕 undefined
      imageDataUrl: it?.imageDataUrl ?? null,
      imageEmoji: it?.imageEmoji ?? null,
      category: it?.category ?? null,
      note: it?.note ?? null,
    }));
}

/**
 * 組出複製品的 payload（不含 pin / createdAt —— 那兩個由寫入端決定）。
 *
 * 刻意「逐欄位挑」而不是 `{...src}`：
 *   · src.id        是 listAssignments 拼出來的，展開會被寫進文檔
 *   · src.createdAt 是 Timestamp，抄過來會讓複製品排到列表最底
 *   · src.stats     是別人的計數，繼承會污染統計
 *   · src.expiresAt 可能早就過期
 *
 * @param {object} src      來源作業（listAssignments 的形狀）
 * @param {object} teacher  { uid, name?, email? }
 */
export function buildCopyPayload(src, teacher) {
  const items = normaliseItems(src?.items);
  const advanced = src?.advanced === true;

  return {
    title: src?.title ?? '',
    phase: src?.phase || 'practice',
    className: '',
    teacherId: teacher?.uid ?? null,
    teacherName: teacher?.name || teacher?.email || null,
    advanced,
    mode: src?.mode || (advanced ? 'dictation' : 'progressive'),
    wordCount: items.length,          // 重算，不抄源的
    items,
    active: true,
    expiresAt: null,                  // 不把源的截止時間帶過來
    stats: { sessions: 0, students: 0 },   // 成績必須從零開始
    copiedFrom: {
      // String() 归一：老資料的 pin 可能是 number，去重是 === 比較
      pin: String(src?.pin ?? ''),
      title: src?.title || '',
      teacherName: src?.teacherName || null,
    },
  };
}

/** 估算寫入大小（bytes）。超過 MAX_COPY_BYTES 就該擋下來 */
export function payloadBytes(payload) {
  const json = JSON.stringify(payload);
  if (typeof Blob !== 'undefined') return new Blob([json]).size;
  // node 環境沒有 Blob 的舊版本 → 用 Buffer 近似（UTF-8 位元組數）
  return typeof Buffer !== 'undefined' ? Buffer.byteLength(json, 'utf8') : json.length;
}

/** 這份 payload 是否小到能寫進 Firestore */
export function fitsInDocument(payload) {
  return payloadBytes(payload) <= MAX_COPY_BYTES;
}

/**
 * 這個作業是否「已經在某位老師的帳號裡」——
 * 用來給分享連結做「已添加過」的提示。
 *
 * @param {object} src        來源作業
 * @param {string} myUid      目前登入的老師
 * @param {Array}  mine       我帳號下的全部作業
 * @returns {{kind:'mine'|'copied'|'new', copy?:object}}
 */
export function classifyImport(src, myUid, mine) {
  if (!src) return { kind: 'new' };
  if (src.teacherId && myUid && src.teacherId === myUid) return { kind: 'mine' };

  const srcPin = String(src.pin ?? '');
  const copy = (Array.isArray(mine) ? mine : [])
    .find(a => a?.copiedFrom?.pin != null && String(a.copiedFrom.pin) === srcPin);
  return copy ? { kind: 'copied', copy } : { kind: 'new' };
}
