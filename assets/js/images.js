/**
 * PCS — Image upload helper
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 老師可以給單詞配圖。設計目標：**越簡潔越好**。
 *
 * 三種方式，都不需要離開鍵盤：
 *   ① 拖放（drag & drop）— 把圖片拖到詞那一列
 *   ② Ctrl/⌘ + V 貼上— 直接從 Finder / Google 圖片複製
 *   ③ 點一下選檔案— 備用
 *
 * ★ 為什麼存成 data URL 而不是 Firebase Storage：
 *   - 這是研究原型，圖片數量少（每個詞一張小圖）
 *   - Storage 需要另一套權限設定，會增加出錯面
 *   - data URL 直接存在 assignment 文档裡，讀取時零額外請求
 *   限制：Firestore 單文檔上限 1MB，所以我們會自動縮圖到 320px JPEG。
 */

export const IMAGE_MAX_EDGE = 400;      // 縮圖後的最長邊（學生端顯示 300px，2x 螢幕夠用）
export const IMAGE_QUALITY = 0.74;      // JPEG 品質

/** 支援的圖片格式 */
const OK_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];

/**
 * 讀取 File → 縮圖 → 回傳 data URL。
 * @param {File} file
 * @param {{maxEdge?:number, quality?:number}} [opts]
 *   ★ 2026-11-20：maxEdge 可調。
 *     圖片彈窗裡要先「裁成正方形」再存，裁切會丟掉一大塊面積，
 *     如果先把原圖壓到 400 再裁，正方形往往只剩 200px，投影到教室大屏就糊了。
 *     所以彈窗那條路徑用 800 當來源，裁完再輸出 ≤400 的方圖 ——
 *     存進 Firestore 的大小不變，但清晰度明顯較好。
 * @returns {Promise<string>} data URL
 */
export async function fileToDataUrl(file, opts = {}) {
  if (!file) throw new Error('No file');
  if (!OK_TYPES.includes(file.type)) {
    throw new Error('PNG, JPG, WEBP or GIF only');
  }
  const maxEdge = opts.maxEdge || IMAGE_MAX_EDGE;
  const quality = opts.quality || IMAGE_QUALITY;

  // SVG 是向量圖，沒有「原圖」概念，直接讀
  if (file.type === 'image/svg+xml') {
    return await readAsDataUrl(file);
  }

  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);

  // ★ 算縮圖尺寸：維持長寬比，最長邊不超過 maxEdge
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  // ★ 用 JPEG 編碼（PNG 轉 JPEG 體積小很多）。
  //   透明的 PNG 會變成黑底，所以先鋪白底。
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  const out = canvas.toDataURL('image/jpeg', quality);

  // ★ 還是太大就再降品質一次（避免撞 Firestore 1MB 上限）
  if (out.length > 900_000) {
    return canvas.toDataURL('image/jpeg', 0.5);
  }
  return out;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Could not read the file'));
    fr.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Not a valid image'));
    img.src = src;
  });
}

/**
 * 從 paste 事件取出圖片。
 * ★ 只有「剪貼簿裡有圖片」時才回傳值；純文字貼上回傳 null，
 *   這樣才能在同一個 paste 監聽器裡同時支援「貼例句」與「貼圖片」。
 */
export function imageFromClipboard(event) {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (const it of items) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

/** 從 drop 事件取出第一張圖片 */
export function imageFromDrop(event) {
  const files = event.dataTransfer?.files;
  if (!files?.length) return null;
  for (const f of files) {
    if (f.type.startsWith('image/')) return f;
  }
  return null;
}