/**
 * PCS — Image Compression
 * Progressive Cloze Spelling · CPI 2026
 *
 * 老師上傳的單詞圖片壓縮後轉 base64，存進 Firestore words collection。
 *
 * ★ 為什麼不用 Cloud Storage？
 *   自2026-02-03 起 Cloud Storage 強制要求付費 Blaze 方案，
 *   Spark 免費專案上傳會返回 402/403。
 *   base64 方案：15 個詞約 1.4MB，佔免費額度 1GB 的 0.14%，單文檔離 1MiB 上限很遠。
 *
 * ★ 前端壓縮參數的理由：
 *   512px  = 實際顯示約 200–280px CSS，2x Retina 剛好
 *   q=0.72 = 平面剪貼-art 無漸層，肉眼看不出壓縮痕跡
 *   JPEG   = 一張 512px PNG 常有 200–500KB，base64 後會逼近 1MiB 上限
 */

export const IMAGE_BUDGET = {
  maxSide: 512,
  quality: 0.72,
  mime: 'image/jpeg',
  targetBytes: 110_000,    // 目標上限（base64 後 ≈ 147KB）
  hardMaxBytes: 700_000,   // 超過就拒收，絕不讓單文檔逼近 1MiB
};

/**
 * 壓縮圖片並轉成 data URL。
 * @param {File|Blob} file
 * @returns {Promise<{dataUrl, bytes, width, height}>}
 */
export async function compressImage(file, opt = IMAGE_BUDGET) {
  const bmp = await loadBitmap(file);
  const scale = Math.min(1, opt.maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { alpha: false });

  // ★ 補白底：直接 toDataURL('image/jpeg') 會把透明區變成黑色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();

  let dataUrl = cv.toDataURL(opt.mime, opt.quality);
  let bytes = dataUrlBytes(dataUrl);

  // 還太大 → 降一級
  if (bytes > opt.targetBytes) {
    const s2 = 400 / Math.max(w, h);
    cv.width = Math.max(1, Math.round(w * s2));
    cv.height = Math.max(1, Math.round(h * s2));
    ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    dataUrl = cv.toDataURL(opt.mime, 0.62);
    bytes = dataUrlBytes(dataUrl);
  }

  if (bytes > opt.hardMaxBytes) {
    throw new Error(
      `圖片 "${file.name || '未命名'}" 壓縮後仍有 ${Math.round(bytes / 1024)}KB，太大了。請換一張簡單的圖片。`
    );
  }

  return { dataUrl, bytes, width: cv.width, height: cv.height };
}

/** data URL 的實際位元組數 */
export function dataUrlBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] ?? '';
  return Math.round((b64.length * 3) / 4);
}

/** data URL → 大致檔案大小（KB） */
export function kb(dataUrl) {
  return Math.round(dataUrlBytes(dataUrl) / 1024);
}

/**
 * 批次處理多張圖片，依檔名自動比對單詞。
 * 檔名 "apple.jpg" → "apple"；"cake_shop.png" → "cake shop"
 */
export async function compressBatch(files, opt = IMAGE_BUDGET) {
  const out = new Map();
  const errors = [];

  for (const f of files) {
    if (!f.type.startsWith('image/')) {
      errors.push({ file: f.name, reason: '不是圖片檔' });
      continue;
    }
    try {
      const r = await compressImage(f, opt);
      const key = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().toLowerCase();
      out.set(key, r);
    } catch (e) {
      errors.push({ file: f.name, reason: e.message });
    }
  }

  return { images: out, errors };
}

/** 讀檔 → ImageBitmap（自動 strip EXIF，含 GPS） */
async function loadBitmap(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      return await createImageBitmap(file);   // Safari 舊版不吃選項
    }
  }
  // Fallback：<img>
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片讀取失敗')); };
    img.src = url;
  });
}

/**
 * 估算一整批圖片會佔用多少 Firestore 額度。
 * 回傳給老師看，避免不知不覺寫爆 1GB。
 */
export function budgetReport(images) {
  const sizes = [...images.values()].map(i => i.bytes);
  const total = sizes.reduce((a, b) => a + b, 0);
  return {
    count: sizes.length,
    totalBytes: total,
    totalKB: Math.round(total / 1024),
    avgKB: sizes.length ? Math.round(total / sizes.length / 1024) : 0,
    maxKB: sizes.length ? Math.round(Math.max(...sizes) / 1024) : 0,
    pctOfFreeTier: +(total / (1024 * 1024) * 100).toFixed(3),   // 免費額度 1 GiB
  };
}