/**
 * 臨時測試：找出「會產生 0 關（undefined level）」的詞。
 * 這正是 play.html 的 skipUnplayable() 路徑 —— 學生永遠看不到這個詞，
 * 但系統把他當成「已掌握」→ Results 顯示「N words not attempted」。
 */
import { analyseItem, parsePhrase } from './phrase.js';
import { analyseWord } from './blanking.js';
import { initState, nextItem, isFinished, markMastered } from './scheduler.js';

const CANDIDATES = [
  'a bank', 'a cinema', 'a clinic', 'a park', 'a post office', 'a restaurant',
  'a supermarket', 'a police station', 'a fire station', 'a cake shop',
  'an art room', 'a music room', 'a computer room',
  'ride a bicycle', 'drink juice', 'have a picnic', 'fly a kite', 'take photos',
  'a house', 'my house', 'go home', 'watch tv', 'listen to music',
  'play the piano', 'wash the dishes', 'visit my grandma', 'do homework',
  'read books', 'play football', 'draw a picture', 'sing a song',
];

console.log('=== 1) 每個候選詞的關卡數 ===');
const bad = [];
for (const w of CANDIDATES) {
  const a = analyseItem(w);
  const n = a?.levels?.length ?? -1;
  const nullLvl = (a?.levels ?? []).some(l => !l);
  const p = parsePhrase(w);
  const ok = n > 0 && !nullLvl && a.levels[0]?.blanks?.length > 0;
  if (!ok) bad.push(w);
  console.log(
    `${ok ? 'OK  ' : 'BAD '} ${w.padEnd(20)}`,
    `article=${String(p.article).padEnd(4)}`,
    `content=[${p.contentWords.join('|')}]`.padEnd(28),
    `levels=${n}`,
    nullLvl ? 'NULL-LEVEL!' : '',
    n > 0 && a.levels[0] ? `blanks=${JSON.stringify(a.levels[0].blanks)} targetWord=${JSON.stringify(a.levels[0].targetWord)}` : '',
  );
}
console.log('\nBAD =', bad);

console.log('\n=== 2) analyseWord 單詞層：內容詞是否可能 0 關 ===');
for (const w of ['a', 'an', 'the', 'ride', 'bicycle', 'drink', 'juice', 'have', 'picnic', 'fly', 'kite', 'take', 'photos', 'room', 'art', 'music']) {
  const a = analyseWord(w);
  console.log(`  ${w.padEnd(10)} levels=${a?.levels?.length}`);
}

console.log('\n=== 3) 模擬一整局：所有詞是否都會被發出去 ===');
const items = CANDIDATES.map((w, i) => ({ itemId: `a_${w.replace(/[^a-z]+/g, '_')}`, word: w, order: i }));
const bank = items.map(it => ({ wordId: it.itemId, word: it.word }));
const state = initState(bank.map(b => b.wordId), { advanced: false });

const served = new Set();
let guard = 0;
while (!isFinished(state) && guard++ < 500) {
  const item = nextItem(state);
  if (!item) break;
  const wordObj = bank.find(b => b.wordId === item.wordId);
  if (!wordObj) { console.log('  !! wordObj not found', item.wordId); continue; }
  const analysis = analyseItem(wordObj.word);
  if (!analysis?.levels?.length) {
    console.log(`  SKIP(no levels) ${wordObj.word}`);
    markMastered(state, wordObj.wordId);
    continue;
  }
  const done = state.levelProgress.get(wordObj.wordId) || 0;
  const level = item.kind === 'retry' ? item.level : Math.min(done + 1, analysis.levels.length);
  const lvl = analysis.levels[Math.min(level - 1, analysis.levels.length - 1)];
  if (!lvl) { console.log(`  SKIP(no level) ${wordObj.word} lvl=${level}`); markMastered(state, wordObj.wordId); continue; }
  served.add(wordObj.word);
  // 模擬答對 → 推進關卡
  const reached = Math.max(done, level);
  state.levelProgress.set(wordObj.wordId, reached);
  if (reached >= analysis.levels.length) markMastered(state, wordObj.wordId);
  else state.levelQueue.push(wordObj.wordId);
}
console.log(`  實際出現過的詞 (${served.size}/${CANDIDATES.length})`);
const never = CANDIDATES.filter(w => !served.has(w));
console.log('  從未出現：', never);
