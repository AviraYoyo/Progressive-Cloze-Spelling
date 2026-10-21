/**
 * PCS — Confetti
 * Progressive Cloze Spelling · CPI 2026
 *
 * 輕量、自包含的彩帶慶祝動畫。不依賴任何外部庫，
 * 用一個全螢幕 canvas + requestAnimationFrame 實作。
 *
 * 小學課堂很受用：
 *   · 拼對一個詞    → confettiBurst()   小簇彩帶，給即時肯定
 *   · 整局結束      → confettiCelebrate() 大範圍慶祝
 */

let canvas = null, ctx = null, raf = 0;
let parts = [];

const COLORS = ['#F97316', '#FB923C', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#22D3EE'];

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.id = 'pcsConfetti';
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '9998',
  });
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  return canvas;
}

function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** 在 (x, y) 噴出一簇彩帶 */
function spawn(x, y, n, opts = {}) {
  ensureCanvas();
  const spread = opts.spread ?? 8;   // 水平初速範圍
  const power = opts.power ?? 7;     // 向上初速
  const gravity = opts.gravity ?? 0.18;
  for (let i = 0; i < n; i++) {
    parts.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: -power * (0.5 + Math.random() * 0.8),
      g: gravity,
      size: 5 + Math.random() * 5,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
      decay: 0.008 + Math.random() * 0.01,
      shape: Math.random() < 0.5 ? 'rect' : 'circ',
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  if (!ctx) { raf = 0; return; }
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const p of parts) {
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= p.decay;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  parts = parts.filter(p => p.life > 0 && p.y < window.innerHeight + 60);
  if (parts.length) {
    raf = requestAnimationFrame(tick);
  } else {
    raf = 0;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

/** 在指定座標（或螢幕中央）噴一小簇彩帶 —— 拼對一個詞時用。 */
export function confettiBurst(x, y, n = 34) {
  spawn(
    x ?? window.innerWidth / 2,
    y ?? window.innerHeight * 0.42,
    n,
    { spread: 7, power: 8 },
  );
}

/** 大範圍慶祝 —— 整局結束時用（連續三波）。 */
export function confettiCelebrate() {
  ensureCanvas();
  let waves = 0;
  const fire = () => {
    spawn(
      window.innerWidth * (0.2 + Math.random() * 0.6),
      window.innerHeight * 0.3,
      60,
      { spread: 12, power: 11 },
    );
    if (++waves < 3) setTimeout(fire, 260);
  };
  fire();
}
