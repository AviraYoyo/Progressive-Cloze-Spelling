/**
 * PCS — Sound Effects
 * Progressive Cloze Spelling · CPI 2026
 *
 * 正確/錯誤音效用 WebAudio 即時合成 —— 零音檔、零網絡請求、零延遲。
 * 這對課堂弱網環境很重要：不會因為音檔載入失敗而沒有回饋。
 */

let ctx = null;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // iOS 需要使用者手勢後才能啟動
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** 單一音符 */
function tone(freq, start, dur, { type = 'sine', gain = 0.16 } = {}) {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

/** 正確：C5→E5→G5 上行三音（明亮、鼓勵） */
export function playCorrect() {
  tone(523.25, 0,    0.14, { type: 'sine' });     // C5
  tone(659.25, 0.09, 0.14, { type: 'sine' });     // E5
  tone(783.99, 0.18, 0.26, { type: 'sine' });     // G5
}

/** 錯誤：兩個下行短音（不嚇人，但明確表示不對） */
export function playWrong() {
  tone(392.00, 0,    0.18, { type: 'triangle', gain: 0.20 });  // G4
  tone(293.66, 0.15, 0.32, { type: 'triangle', gain: 0.20 });  // D4
}

/** 全部完成：三音上行 + 輕微延音 */
export function playComplete() {
  tone(523.25, 0,    0.13);
  tone(659.25, 0.10, 0.13);
  tone(783.99, 0.20, 0.13);
  tone(1046.5, 0.31, 0.42, { gain: 0.18 });
}

/** 點擊回饋（很輕） */
export function playTap() {
  tone(880, 0, 0.05, { type: 'sine', gain: 0.06 });
}

/** 首次互動時解鎖 iOS 音訊 */
export function unlockAudio() {
  audioCtx();
}

/** 依設定決定是否播放 */
export function sfx(kind) {
  if ({ correct: playCorrect, wrong: playWrong, complete: playComplete, tap: playTap }[kind]) {
    ({ correct: playCorrect, wrong: playWrong, complete: playComplete, tap: playTap })[kind]();
  }
}