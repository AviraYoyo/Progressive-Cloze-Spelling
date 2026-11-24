/**
 * PCS — Spelling Pattern Weight Table
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 拼寫模式權重表。每一條 pattern 的權重 = 五個「難度維度」加權求和，
 * 各維度 0–20 分，總分 0–100。權重代表「這個位置對拼寫的難度」，越高越優先被挖空。
 *
 * ★ 重要：五個維度全部是「難度」指標，數字越高越難。不可混用。
 *
 * 設計依據與完整論證見docs/SPELLING-PATTERNS.md
 * 拼寫體系：英式 BrE（organise / travelled / colour），對齊香港 KS2 考卷
 */

// ═════════════════════════════════════════════════════════════
// 五維度定義（全部為難度指標，0–20）
// ═════════════════════════════════════════════════════════════
export const DIMENSIONS = {
  g: '字母複雜度 — 這個音要寫幾個字母',
  a: '歧義度     — 同一個音有多少種拼法（Liberman & Shankweiler unreliable bi-uniqueness）',
  u: '位置難預測 — 能否從詞形猜出這裡填什麼',
  e: '例外負荷   — 例外詞有多少',
  m: '構詞依賴   — 是否需靠構詞變化推導（-ing/-ed/-er/-est, y→i）',
};

// ═════════════════════════════════════════════════════════════
// Pattern 類別
// ═════════════════════════════════════════════════════════════
export const CATEGORIES = {
  doubled_lexical: {
    label: '重複字母（詞彙型）',
    desc: '短母音 CVC + 詞尾單輔音 → 重複該輔音。例：ball, bell, grass, off。中古英語短母音壓縮的拼寫殘留。典型為 l / f / s / z。',
  },
  doubled_suffix: {
    label: '重複字母（後綴觸發型）',
    desc: '詞幹 + -ing / -ed / -er / -est 觸發重輔音。例：stopped, planned, hugged, bigger。真正繼承自古英語 gemination。典型為 p / t / n / d / g / b / m / r / c。',
  },
  vowel_team_ambig: {
    label: '元音組合（多讀音）',
    desc: '同一拼法有多種發音。最高難度類別 —— 學生無法從聲音推出拼法。',
  },
  vowel_team: {
    label: '元音組合（單讀音）',
    desc: '兩個元音（或元音+w）合起來發一個音。「兩元音同行，第一個出聲」。',
  },
  r_controlled: {
    label: 'r-控元音（Bossy R）',
    desc: '元音後接 r，發音變成第三個音。BrE 讀 /ɜː/ 或 /ɑː/。',
  },
  magic_e: {
    label: 'Magic e / Silent e',
    desc: '詞尾 C+e 的 e 不發音，但使前面元音變長音。cap→cape, hop→hope。規則可靠但例外詞少。',
  },
  consonant_digraph: {
    label: '輔音二合字母',
    desc: '兩個輔音合起來發一個音（不是 blend）。sh ch th wh ph ck ng nk qu。規則乾淨，學生只需知道「一音兩字母」。',
  },
  consonant_blend: {
    label: '輔音連綴（blend）',
    desc: '每個字母都發音，但快速滑過。bl br cl cr等；三字母 scr spr str thr。難點在字母數量，不在歧義。',
  },
  silent_letter: {
    label: '不發音字母',
    desc: 'wring 的 w、gnat 的 g。完全不可從聲音推出。',
  },
  y_as_vowel: {
    label: 'y 當元音',
    desc: 'y 在非首字母位置當元音用。極高頻錯誤（baby / happy 的 y 不是 /j/）。',
  },
  single_vowel: {
    label: '單一元音 / 單一輔音',
    desc: '閉音節短母音最基本，開音節長母音次之。規則可靠，權重最低。',
  },
};

/** 建構一條 pattern（自動加權重） */
const P = (pattern, category, d, opts = {}) => ({
  pattern, category, ...d,
  weight: d.g + d.a + d.u + d.e + d.m,
  ipa: opts.ipa ?? null,
  ambigIpa: opts.ambigIpa ?? [],
  examples: opts.examples ?? [],
  note: opts.note ?? '',
  reliability: opts.reliability ?? 'high',
  contextOnly: opts.contextOnly ?? null,
});

export const PATTERNS = [

  // ═══════════════════════════════════════════════════════════
  // 第一層 76–84：一音多拼的元音組合（最高難度）
  // 依據：Liberman & Shankweiler unreliable bi-uniqueness
  //═══════════════════════════════════════════════════════════
  P('ou', 'vowel_team_ambig',
    { g: 10, a: 20, u: 18, e: 18, m: 17 },
    { ipa: '/aʊ/', ambigIpa: ['/ʌ/', '/ʊ/', '/oʊ/'],
      examples: ['out', 'house', 'about', 'country', 'could', 'youth', 'cloud'],
      note: '四種讀音：/aʊ/ out house cloud；/ʌ/ country；/ʊ/ could；/oʊ/ youth。全表歧義最高。',
      reliability: 'high' }),

  P('ea', 'vowel_team_ambig',
    { g: 10, a: 19, u: 18, e: 17, m: 16 },
    { ipa: '/iː/', ambigIpa: ['/ɛ/', '/eɪ/', '/æ/'],
      examples: ['eat', 'sea', 'clean', 'teacher', 'meat', 'please'],
      note: '/iː/ eat sea clean meat；/ɛ/ bread head；/eɪ/ great break；/æ/ steak。極高頻例外。',
      reliability: 'high' }),

  P('ie', 'vowel_team_ambig',
    { g: 10, a: 19, u: 18, e: 17, m: 16 },
    { ipa: '/aɪ/', ambigIpa: ['/iː/', '/ɪ/'],
      examples: ['pie', 'field', 'friend', 'lie', 'tie', 'believe', 'piece'],
      note: '與 ei 完全互換，最著名的拼寫陷阱。/aɪ/ pie tie；/iː/ field believe；/ɪ/ friend。',
      reliability: 'high' }),

  P('ei', 'vowel_team_ambig',
    { g: 10, a: 19, u: 18, e: 17, m: 16 },
    { ipa: '/iː/', ambigIpa: ['/eɪ/', '/aɪ/'],
      examples: ['receive', 'eight', 'weight', 'neighbour', 'ceiling'],
      note: '與 ie 完全互換。/iː/ receive ceiling；/eɪ/ eight weight；/aɪ/ vein。',
      reliability: 'high' }),

  P('oo', 'vowel_team_ambig',
    { g: 10, a: 19, u: 16, e: 18, m: 16 },
    { ipa: '/uː/', ambigIpa: ['/ʊ/'],
      examples: ['moon', 'food', 'book', 'look', 'good', 'foot', 'zoo'],
      note: '/uː/ moon food zoo；/ʊ/ book look good foot。同拼法兩讀。',
      reliability: 'high' }),

  P('ow', 'vowel_team_ambig',
    { g: 10, a: 18, u: 15, e: 16, m: 16 },
    { ipa: '/aʊ/', ambigIpa: ['/oʊ/'],
      examples: ['cow', 'now', 'snow', 'know', 'low', 'window'],
      note: '/aʊ/ cow now；/oʊ/ snow know low window。',
      reliability: 'high' }),

  P('ear', 'vowel_team_ambig',
    { g: 16, a: 16, u: 15, e: 15, m: 15 },
    { ipa: '/ɪə/', ambigIpa: ['/ɜː/', '/eə/'],
      examples: ['hear', 'near', 'year', 'tear', 'bear', 'wear', 'pear'],
      note: '/ɪə/ hear near year；/ɜː/ earth；/eə/ bear wear pear。高度多讀音。',
      reliability: 'high' }),

  P('un', 'vowel_team_ambig',
    { g: 10, a: 18, u: 17, e: 16, m: 15 },
    { ipa: '/ʌ/', ambigIpa: ['/uː/', '/ʌn/', '/jə/', '/ʊ/'],
      examples: ['sun', 'cup', 'fun', 'run', 'country', 'moon', 'unit', 'unhappy'],
      note: '五種讀音：詞尾短母音後 /ʌ/（sun, cup, run）；前有 /j/ → /ʌ/（country）；'
          + '長元音後 → /uː/（moon）；前綴 → /ʌn/（unhappy, under）；-uni- → /jə/（unit, unite）。',
      reliability: 'high' }),

  // ═══════════════════════════════════════════════════════════
  // 第二層 66–75：重複字母 + gh
  // ★ 重複字母排在前面，因為「知道這個詞有雙寫輔音」本身就是
  //   詞彙特有的知識，而 magic e 是可靠規則。對應研究目標詞 apple 的 double p。
  // ★ 靜音 e 已於 2026-11-24 移出這一層（66 → 28），理由見該條目註解。
  // ═══════════════════════════════════════════════════════════

  P('ll', 'doubled_lexical',
    { g: 12, a: 14, u: 19, e: 12, m: 17 },
    { ipa: '/l/', ambigIpa: [],
      examples: ['ball', 'bell', 'bill', 'full', 'hill', 'still', 'jelly', 'well', 'troll'],
      note: '最典型的重複字母。短母音 CVC + ll。',
      reliability: 'high', contextOnly: 'closed syllable, short vowel' }),

  P('ss', 'doubled_lexical',
    { g: 12, a: 14, u: 19, e: 12, m: 17 },
    { ipa: '/s/', ambigIpa: [],
      examples: ['grass', 'dress', 'class', 'pass', 'miss', 'kiss', 'boss'],
      note: '短母音 CVC + ss。', reliability: 'high',
      contextOnly: 'closed syllable, short vowel' }),

  P('ff', 'doubled_lexical',
    { g: 12, a: 13, u: 19, e: 12, m: 17 },
    { ipa: '/f/', ambigIpa: [],
      examples: ['off', 'staff', 'stuff', 'muffin', 'coffee', 'buffalo'],
      note: '短母音 CVC + ff。', reliability: 'high',
      contextOnly: 'closed syllable, short vowel' }),

  P('pp', 'doubled_suffix',
    { g: 12, a: 13, u: 19, e: 12, m: 17 },
    { ipa: '/p/', ambigIpa: [],
      examples: ['apple', 'happy', 'stopped', 'hopping', 'cup', 'map', 'puppy', 'shopping'],
      note: '★ 本專案核心目標結構。apple/happy 屬短母音 CVC 型；stopped/hopping 屬後綴觸發型。'
          + '學生最常漏的就是「也要寫兩次」。',
      reliability: 'high', contextOnly: 'doubled consonant' }),

  P('tt', 'doubled_suffix',
    { g: 12, a: 13, u: 19, e: 12, m: 17 },
    { ipa: '/t/', ambigIpa: [],
      examples: ['letter', 'little', 'butter', 'stopped', 'sitting', 'putting'],
      note: '短母音 CVC + tt，或後綴觸發。', reliability: 'high',
      contextOnly: 'doubled consonant' }),

  P('nn', 'doubled_suffix',
    { g: 12, a: 13, u: 19, e: 12, m: 17 },
    { ipa: '/n/', ambigIpa: [],
      examples: ['dinner', 'penny', 'running', 'planned', 'winning', 'manner'],
      note: '短母音 CVC + nn，或後綴觸發。', reliability: 'high',
      contextOnly: 'doubled consonant' }),

  P('zz', 'doubled_lexical',
    { g: 12, a: 13, u: 18, e: 12, m: 17 },
    { ipa: '/z/', ambigIpa: [],
      examples: ['fizz', 'fuzz', 'buzz', 'jazz', 'puzzle', 'dizzy'],
      note: '短母音 CVC + zz。', reliability: 'high',
      contextOnly: 'closed syllable, short vowel' }),

  P('dd', 'doubled_suffix',
    { g: 12, a: 13, u: 18, e: 12, m: 17 },
    { ipa: '/d/', ambigIpa: [],
      examples: ['address', 'sudden', 'hidden', 'middle', 'added', 'pudding'],
      note: '短母音 CVC + dd，或後綴觸發。', reliability: 'high',
      contextOnly: 'doubled consonant' }),

  P('gg', 'doubled_suffix',
    { g: 12, a: 13, u: 18, e: 12, m: 17 },
    { ipa: '/ɡ/', ambigIpa: [],
      examples: ['egg', 'bigger', 'begged', 'hugging', 'muggy', 'frog'],
      note: '短母音 CVC + gg，或後綴觸發。', reliability: 'high',
      contextOnly: 'doubled consonant' }),

  P('bb', 'doubled_suffix',
    { g: 12, a: 13, u: 18, e: 12, m: 17 },
    { ipa: '/b/', ambigIpa: [],
      examples: ['rabbit', 'hobby', 'rubbed', 'bubbly', 'bubble', 'cabbage'],
      note: '短母音 CVC + bb，或後綴觸發。', reliability: 'high',
      contextOnly: 'doubled consonant' }),

  P('mm', 'doubled_suffix',
    { g: 12, a: 13, u: 18, e: 12, m: 17 },
    { ipa: '/m/', ambigIpa: [],
      examples: ['summer', 'mummy', 'swimming', 'coming', 'hammer', 'gym'],
      note: '短母音 CVC + mm，或後綴觸發。', reliability: 'high',
      contextOnly: 'doubled consonant' }),

  P('rr', 'doubled_suffix',
    { g: 12, a: 13, u: 18, e: 12, m: 17 },
    { ipa: '/r/', ambigIpa: [],
      examples: ['bigger', 'arrival', 'surround', 'current', 'terrier', 'marry'],
      note: '短母音 CVC + rr，或後綴觸發。', reliability: 'high',
      contextOnly: 'doubled consonant' }),

  P('cc', 'doubled_suffix',
    { g: 12, a: 13, u: 18, e: 12, m: 17 },
    { ipa: '/k/', ambigIpa: [],
      examples: ['success', 'occur', 'soccer', 'occupied', 'accompany'],
      note: '短母音 CVC + cc，或後綴觸發。', reliability: 'high',
      contextOnly: 'doubled consonant' }),

  P('gh', 'silent_letter',
    { g: 10, a: 12, u: 16, e: 13, m: 12 },
    { ipa: '/ (多不發音) /', ambigIpa: ['/ɡ/', '/f/', '/t/'],
      examples: ['high', 'night', 'light', 'eight', 'daughter', 'laugh'],
      note: 'gh 多數不發音，但 laugh 是 /f/、ghost 是 /ɡ/、thought 是 /t/。完全不可從聲音推出。',
      reliability: 'high' }),

  // ★ 2026-11-24：_e_silent 從 66 降到 20（原本 {g8,a15,u20,e8,m15}）。
  //
  //   原因（老師實測回報）：舊權重讓「幾乎所有 -e 結尾的詞都在挖 e」，
  //   而 e 是**最不需要動腦的格子** —— 它是可靠規則、例外極少，
  //   學生看到 r_d_ 這種題面基本不用想。詞彙裡一堆 e 輪流被挖，
  //   難度被人為抽空，老師的評語是「太無聊了」。
  //
  //   教學上真正有價值的是**它前面那個元音**（magic e 讓短母音變長母音），
  //   所以難度記在元音身上（見 blanking.js 的 VCe +18 加成），
  //   e 本身只保留象徵性權重，排在單輔音（30）之後。
  //
  //   注意：這個 pattern 仍然要留在表裡 —— segmentGraphemes 靠它把
  //   詞尾 e 標成 pattern（而不是普通單字母），後台的語音結構統計也靠它。
  P('_e_silent', 'magic_e',
    { g: 6, a: 5, u: 4, e: 2, m: 3 },
    { ipa: '/ (不發音) /', ambigIpa: [],
      examples: ['cape', 'kite', 'hope', 'cube', 'bike', 'note', 'home', 'rose'],
      note: 'a_e / e_e / i_e / o_e / u_e。e 完全不可從聲音推出，'
          + '但規則本身極可靠 —— 正因為「可靠」，它不該是主要挖空目標：'
          + '真正的難點在於前面那個元音發長音還是短音。'
          + '需排除 ee/ie/oe 結尾與 -le。',
      reliability: 'high',
      contextOnly: 'V+C+e, not ending ee/ie/oe' }),

  // ═══════════════════════════════════════════════════════════
  // 第三層 50–68：單讀音元音組合 + r-控元音
  // ═══════════════════════════════════════════════════════════

  P('eu', 'vowel_team',
    { g: 10, a: 14, u: 14, e: 13, m: 14 },
    { ipa: '/juː/', ambigIpa: ['/ɛ/', '/əʊ/'],
      examples: ['feud', 'beauty', 'queue', 'museum'],
      note: '/juː/ feud queue；/ɛ/ beauty。罕見。', reliability: 'medium' }),

  P('au', 'vowel_team',
    { g: 10, a: 13, u: 13, e: 12, m: 14 },
    { ipa: '/ɔː/', ambigIpa: ['/əʊ/'],
      examples: ['autumn', 'sauce', 'haul', 'fraud'],
      note: '/ɔː/ sauce haul；BrE 亦讀/əʊ/ autumn。', reliability: 'high' }),

  P('aw', 'vowel_team',
    { g: 10, a: 13, u: 13, e: 12, m: 14 },
    { ipa: '/ɔː/', ambigIpa: [],
      examples: ['saw', 'draw', 'law', 'jaw', 'yawn'],
      note: '讀音相當單一。', reliability: 'high' }),

  P('oy', 'vowel_team',
    { g: 10, a: 6, u: 11, e: 9, m: 14 },
    { ipa: '/ɔɪ/', ambigIpa: [], examples: ['boy', 'toy', 'enjoy', 'annoy'],
      note: '讀音單一。', reliability: 'high' }),

  P('oi', 'vowel_team',
    { g: 10, a: 6, u: 11, e: 9, m: 14 },
    { ipa: '/ɔɪ/', ambigIpa: [],
      examples: ['oil', 'coin', 'point', 'join', 'noise', 'boil'],
      note: '讀音單一。', reliability: 'high' }),

  P('igh', 'vowel_team',
    { g: 16, a: 8, u: 13, e: 11, m: 14 },
    { ipa: '/aɪ/', ambigIpa: [], examples: ['night', 'light', 'high', 'bright', 'sight'],
      note: 'igh 三字母一音。', reliability: 'high' }),

  P('ey', 'vowel_team',
    { g: 10, a: 13, u: 13, e: 11, m: 14 },
    { ipa: '/eɪ/', ambigIpa: ['/iː/'],
      examples: ['they', 'key', 'grey', 'money', 'honey', 'monkey'],
      note: '/eɪ/ they grey；/iː/ key money honey。', reliability: 'high' }),

  P('ue', 'vowel_team',
    { g: 10, a: 12, u: 13, e: 11, m: 14 },
    { ipa: '/juː/', ambigIpa: ['/uː/'],
      examples: ['blue', 'true', 'glue', 'tube', 'flute'],
      note: '/juː/ blue tube；/uː/ true（rude 例外）。', reliability: 'high' }),

  P('ui', 'vowel_team',
    { g: 10, a: 12, u: 13, e: 11, m: 14 },
    { ipa: '/uː/', ambigIpa: ['/ɪ/'],
      examples: ['build', 'fruit', 'suit', 'quiet', 'juice'],
      note: '/uː/ fruit suit juice；/ɪ/ build。', reliability: 'high' }),

  P('ew', 'vowel_team',
    { g: 10, a: 12, u: 13, e: 11, m: 14 },
    { ipa: '/juː/', ambigIpa: ['/uː/', '/oʊ/'],
      examples: ['new', 'few', 'knew', 'view', 'chew'],
      note: '/juː/ new few；/uː/ view；/oʊ/ sew。', reliability: 'high' }),

  P('air', 'vowel_team',
    { g: 16, a: 8, u: 12, e: 11, m: 13 },
    { ipa: '/eə/', ambigIpa: [], examples: ['hair', 'chair', 'stair', 'air', 'fair'],
      note: 'BrE 讀 /eə/，AmE 讀 /er/。', reliability: 'high' }),

  P('ore', 'vowel_team',
    { g: 16, a: 13, u: 13, e: 13, m: 14 },
    { ipa: '/ɔː/', ambigIpa: ['/əʊ/'],
      examples: ['more', 'before', 'store', 'score', 'shore'],
      note: '/ɔː/ more before store；/əʊ/ shore。', reliability: 'high' }),

  P('or', 'r_controlled',
    { g: 10, a: 12, u: 13, e: 12, m: 14 },
    { ipa: '/ɔː/', ambigIpa: ['/ə/', '/əʊ/'],
      examples: ['for', 'corn', 'horse', 'short', 'born', 'fork'],
      note: '/ɔː/ for corn horse；/ə/ word（w 不發音）；/əʊ/ pour。', reliability: 'high' }),

  P('er', 'r_controlled',
    { g: 10, a: 15, u: 14, e: 13, m: 14 },
    { ipa: '/ɜː/', ambigIpa: ['/ə/', '/eə/'],
      examples: ['her', 'bird', 'turn', 'person', 'teacher', 'never'],
      note: '/ɜː/ 是一音多拼的成員之一。非重讀時常弱讀為 /ə/：teacher、never。',
      reliability: 'high' }),

  P('ar', 'r_controlled',
    { g: 10, a: 8, u: 13, e: 11, m: 14 },
    { ipa: '/ɑː/', ambigIpa: ['/ə/'],
      examples: ['car', 'star', 'farm', 'hard', 'park', 'garden'],
      note: 'BrE 非捲舌，讀 /ɑː/。', reliability: 'high' }),

  P('ir', 'r_controlled',
    { g: 10, a: 8, u: 12, e: 9, m: 14 },
    { ipa: '/ɜː/', ambigIpa: [], examples: ['bird', 'girl', 'first', 'shirt', 'skirt'],
      note: '讀音單一，規則乾淨。', reliability: 'high' }),

  P('ur', 'r_controlled',
    { g: 10, a: 8, u: 12, e: 9, m: 14 },
    { ipa: '/ɜː/', ambigIpa: [], examples: ['turn', 'nurse', 'hurt', 'purse', 'burn'],
      note: '讀音單一。', reliability: 'high' }),

  P('ai', 'vowel_team',
    { g: 10, a: 6, u: 12, e: 10, m: 14 },
    { ipa: '/eɪ/', ambigIpa: [], examples: ['rain', 'train', 'mail', 'wait', 'paint', 'tail'],
      note: '讀音單一，規則乾淨。', reliability: 'high' }),

  P('ay', 'vowel_team',
    { g: 10, a: 6, u: 13, e: 11, m: 14 },
    { ipa: '/eɪ/', ambigIpa: [], examples: ['day', 'play', 'say', 'may', 'stay', 'way'],
      note: '多在詞尾。', reliability: 'high' }),

  P('oa', 'vowel_team',
    { g: 10, a: 6, u: 12, e: 9, m: 14 },
    { ipa: '/əʊ/', ambigIpa: [], examples: ['boat', 'coat', 'road', 'load', 'toast'],
      note: '讀音單一。', reliability: 'high' }),

  P('oe', 'vowel_team',
    { g: 10, a: 7, u: 13, e: 10, m: 14 },
    { ipa: '/əʊ/', ambigIpa: [], examples: ['toe', 'goes', 'home', 'nose', 'rose'],
      note: '詞尾 oe = to。', reliability: 'high' }),

  P('ee', 'vowel_team',
    { g: 10, a: 5, u: 10, e: 8, m: 14 },
    { ipa: '/iː/', ambigIpa: [], examples: ['see', 'tree', 'feet', 'green', 'sheep', 'sweet'],
      note: '讀音單一。雖與 ea/ie/ei 同音，但本拼法本身無歧義 → a維度最低。',
      reliability: 'high' }),

  P('y_to_i', 'magic_e',
    { g: 8, a: 12, u: 14, e: 12, m: 8 },
    { ipa: '/ɪ/', ambigIpa: [],
      examples: ['happy→happier', 'easy→easier', 'pretty→prettier', 'silly→sillier'],
      note: '重讀音節末尾的 y 在多音節 comparative/superlative 變 i。因重複規則只作用於輔音，y 不衝突。',
      reliability: 'medium' }),

  // ═══════════════════════════════════════════════════════════
  // 第四層 50–62：輔音二合字母（有真歧義者較高）
  // ★ 修正：Digraph 整體權重偏低。因為 sh/ch/ck 幾乎無歧義，
  //   學生只需知道「一音兩字母」，不必判斷讀哪個音。
  // ═══════════════════════════════════════════════════════════

  P('tch', 'consonant_digraph',
    { g: 18, a: 6, u: 15, e: 12, m: 11 },
    { ipa: '/tʃ/', ambigIpa: [],
      examples: ['watch', 'kitchen', 'catch', 'match', 'witch', 'lunchbox'],
      note: '難點在位置條件：短母音後用 t（cat vs catch），s/x 後才用 tch（snack hatch）。',
      reliability: 'high', contextOnly: 'after short vowel, or after s/x, or word-final' }),

  P('dge', 'consonant_digraph',
    { g: 18, a: 6, u: 14, e: 12, m: 11 },
    { ipa: '/dʒ/', ambigIpa: [],
      examples: ['bridge', 'edge', 'ledge', 'badge', 'judge', 'knowledge'],
      note: '短母音 + dge。受 -ge 拼法影響（gem, hinge 例外）。', reliability: 'medium' }),

  P('th', 'consonant_digraph',
    { g: 10, a: 10, u: 13, e: 12, m: 10 },
    { ipa: '/θ/', ambigIpa: ['/ð/'],
      examples: ['think', 'this', 'that', 'three', 'mother', 'bath'],
      note: '/θ/ think three；/ð/ this mother。有真歧義，故 a 維度較高。', reliability: 'high' }),

  P('ck', 'consonant_digraph',
    { g: 10, a: 7, u: 14, e: 12, m: 10 },
    { ipa: '/k/', ambigIpa: [],
      examples: ['duck', 'back', 'sock', 'rock', 'truck', 'pick'],
      note: '難點在位置條件：短母音後用 ck（back），s/x 後用 c 或 ke（back 但 cake）。',
      reliability: 'high', contextOnly: 'after short vowel, not after s/x' }),

  P('wh', 'consonant_digraph',
    { g: 10, a: 8, u: 11, e: 10, m: 9 },
    { ipa: '/w/', ambigIpa: ['/h/'],
      examples: ['what', 'when', 'where', 'white', 'wheel', 'why'],
      note: '/w/ what white；/h/ who whose。', reliability: 'high' }),

  P('ch', 'consonant_digraph',
    { g: 10, a: 6, u: 10, e: 8, m: 9 },
    { ipa: '/tʃ/', ambigIpa: ['/k/'],
      examples: ['chair', 'lunch', 'much', 'chip', 'teacher', 'school'],
      note: '/tʃ/ chair lunch；/k/ school（希臘借詞）。規則乾淨，例外少。', reliability: 'high' }),

  P('ng', 'consonant_digraph',
    { g: 10, a: 4, u: 10, e: 10, m: 9 },
    { ipa: '/ŋ/', ambigIpa: [], examples: ['sing', 'king', 'ring', 'long', 'thing', 'spring'],
      note: '規則乾淨。', reliability: 'high' }),

  P('nk', 'consonant_digraph',
    { g: 10, a: 4, u: 10, e: 10, m: 9 },
    { ipa: '/ŋk/', ambigIpa: [], examples: ['think', 'thank', 'sink', 'pink', 'drink', 'link'],
      note: '規則乾淨。', reliability: 'high' }),

  P('qu', 'consonant_digraph',
    { g: 10, a: 4, u: 9, e: 7, m: 9 },
    { ipa: '/kw/', ambigIpa: [], examples: ['queen', 'question', 'quick', 'quiet', 'quilt', 'quiz'],
      note: 'u 幾乎不發音。規則乾淨。', reliability: 'high' }),

  P('sh', 'consonant_digraph',
    { g: 10, a: 3, u: 8, e: 6, m: 8 },
    { ipa: '/ʃ/', ambigIpa: [], examples: ['ship', 'fish', 'shop', 'wash', 'sheep', 'shoe'],
      note: '無歧義，規則乾淨。DfE Letter and Sound Phase 3 教學，成功率全期最高。',
      reliability: 'high' }),

  P('ph', 'consonant_digraph',
    { g: 10, a: 3, u: 7, e: 5, m: 8 },
    { ipa: '/f/', ambigIpa: [], examples: ['phone', 'photo', 'graph', 'elephant', 'dolphin'],
      note: '規則乾淨。', reliability: 'high' }),

  // ═══════════════════════════════════════════════════════════
  // 第五層 33–50：聲母連綴（每字母都發音，歧義最低）
  // ═══════════════════════════════════════════════════════════

  P('spl', 'consonant_blend',
    { g: 18, a: 4, u: 11, e: 9, m: 10 },
    { ipa: '/spl/', ambigIpa: [], examples: ['split', 'splendid', 'sprinkle'],
      note: '三字母 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('scr', 'consonant_blend',
    { g: 18, a: 4, u: 11, e: 9, m: 10 },
    { ipa: '/skr/', ambigIpa: [], examples: ['screen', 'script', 'scribble', 'screw'],
      note: '三字母 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('spr', 'consonant_blend',
    { g: 18, a: 4, u: 11, e: 9, m: 10 },
    { ipa: '/spr/', ambigIpa: [], examples: ['spring', 'spray', 'spread', 'sprout', 'sprinkle'],
      note: '三字母 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('str', 'consonant_blend',
    { g: 18, a: 4, u: 11, e: 9, m: 10 },
    { ipa: '/str/', ambigIpa: [], examples: ['street', 'strong', 'stream', 'strap', 'straw'],
      note: '三字母 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('thr', 'consonant_blend',
    { g: 18, a: 4, u: 11, e: 9, m: 10 },
    { ipa: '/θr/', ambigIpa: [], examples: ['three', 'throw', 'through', 'throat', 'thread'],
      note: '三字母 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('shr', 'consonant_blend',
    { g: 18, a: 4, u: 11, e: 9, m: 10 },
    { ipa: '/ʃr/', ambigIpa: [], examples: ['shrimp', 'shrine', 'shrug', 'shrink'],
      note: '三字母 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('bl', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/bl/', ambigIpa: [], examples: ['black', 'blue', 'block', 'blow', 'blackboard'],
      note: '初始 blend，每字母都發音。', reliability: 'high', contextOnly: 'word-initial' }),

  P('br', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/br/', ambigIpa: [], examples: ['bring', 'brother', 'brown', 'bread', 'brush'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('cl', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/kl/', ambigIpa: [], examples: ['class', 'clean', 'clock', 'climb', 'close'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('cr', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/kr/', ambigIpa: [], examples: ['cry', 'cream', 'cross', 'crowd', 'crab'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('dr', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/dr/', ambigIpa: [], examples: ['dress', 'drink', 'draw', 'dream', 'dry'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('fl', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/fl/', ambigIpa: [], examples: ['fly', 'flag', 'floor', 'flame', 'flat'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('fr', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/fr/', ambigIpa: [], examples: ['friend', 'from', 'front', 'fruit', 'fresh'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('gl', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/ɡl/', ambigIpa: [], examples: ['glass', 'glow', 'glide', 'globe', 'glove'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('gr', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/ɡr/', ambigIpa: [], examples: ['green', 'great', 'grow', 'grass', 'grade'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('pl', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/pl/', ambigIpa: [], examples: ['play', 'please', 'plant', 'plate', 'plus'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('pr', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/pr/', ambigIpa: [], examples: ['present', 'press', 'price', 'prince', 'pretty'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('sk', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/sk/', ambigIpa: [], examples: ['school', 'skate', 'skin', 'sky', 'skirt'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('sl', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/sl/', ambigIpa: [], examples: ['sleep', 'slow', 'slide', 'slip', 'slight'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('sm', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/sm/', ambigIpa: [], examples: ['small', 'smile', 'smoke', 'smart', 'smell'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('sn', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/sn/', ambigIpa: [], examples: ['snake', 'snow', 'snack', 'sneaker', 'sniff'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('sp', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/sp/', ambigIpa: [], examples: ['spell', 'sport', 'spoon', 'spot', 'speak'],
      note: '初始 blend。與本專案主題 spelling 直接相關。', reliability: 'high',
      contextOnly: 'word-initial' }),

  P('st', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/st/', ambigIpa: [], examples: ['stop', 'star', 'story', 'stand', 'stone'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('sw', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/sw/', ambigIpa: [], examples: ['swim', 'sweet', 'swing', 'sweater', 'swallow'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('tr', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/tr/', ambigIpa: [], examples: ['tree', 'train', 'try', 'trip', 'truck'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  P('tw', 'consonant_blend',
    { g: 10, a: 3, u: 9, e: 6, m: 8 },
    { ipa: '/tw/', ambigIpa: [], examples: ['two', 'twin', 'twelve', 'twinkle', 'twist'],
      note: '初始 blend。', reliability: 'high', contextOnly: 'word-initial' }),

  // ═══════════════════════════════════════════════════════════
  // 第六層 33–62：不發音字母 / y 當元音 / soft c g / 音節類型
  // ═══════════════════════════════════════════════════════════

  P('y_vowel', 'y_as_vowel',
    { g: 8, a: 14, u: 15, e: 13, m: 12 },
    { ipa: '/ɪ/ 或 /aɪ/', ambigIpa: ['/ɪ/', '/aɪ/', '/j/'],
      examples: ['baby', 'happy', 'city', 'fly', 'cry', 'gym', 'rhythm'],
      note: 'y 在非首字母位置當元音。極高頻錯誤 —— 學生以為 y 只能當 /j/。',
      reliability: 'high' }),

  P('kn', 'silent_letter',
    { g: 10, a: 8, u: 11, e: 8, m: 9 },
    { ipa: '/n/', ambigIpa: [], examples: ['knee', 'know', 'knife', 'knight', 'kneel'],
      note: 'k 不發音。規則乾淨（只有 kn 開頭的少數詞）。', reliability: 'high' }),

  P('wr', 'silent_letter',
    { g: 10, a: 8, u: 11, e: 8, m: 9 },
    { ipa: '/r/', ambigIpa: [], examples: ['write', 'wrong', 'wrist', 'wrap', 'wreck'],
      note: 'w 不發音。規則乾淨。', reliability: 'high' }),

  P('mb', 'silent_letter',
    { g: 10, a: 8, u: 11, e: 8, m: 9 },
    { ipa: '/m/', ambigIpa: [], examples: ['climb', 'comb', 'lamb', 'thumb', 'numb'],
      note: 'b 不發音。規則乾淨。', reliability: 'high' }),

  P('c', 'single_vowel',
    { g: 6, a: 12, u: 12, e: 12, m: 10 },
    { ipa: '/k/ 或 /s/', ambigIpa: ['/k/', '/s/'],
      examples: ['cat', 'cent', 'city', 'ice', 'pen', 'face', 'cycle'],
      note: 'Soft c = /s/ (before e/i/y)，hard c = /k/。', reliability: 'high' }),

  P('g', 'single_vowel',
    { g: 6, a: 12, u: 12, e: 12, m: 10 },
    { ipa: '/ɡ/ 或 /dʒ/', ambigIpa: ['/ɡ/', '/dʒ/'],
      examples: ['go', 'gem', 'giant', 'game', 'gym', 'engine'],
      note: 'Soft g = /dʒ/ (before e/i/y)，hard g = /ɡ/。', reliability: 'high' }),

  P('open_syllable_vowel', 'single_vowel',
    { g: 6, a: 6, u: 10, e: 7, m: 8 },
    { ipa: '/ (長母音) /', ambigIpa: [],
      examples: ['go', 'no', 'he', 'she', 'me', 'open', 'tiger', 'paper'],
      note: '開音節：母音讀長音。', reliability: 'high' }),

  P('closed_syllable_vowel', 'single_vowel',
    { g: 6, a: 5, u: 8, e: 6, m: 8 },
    { ipa: '/ (短母音) /', ambigIpa: [],
      examples: ['cat', 'dog', 'sit', 'cup', 'hop', 'big', 'top'],
      note: '閉音節 CVC：母音短讀。最基本，規則可靠，權重最低。', reliability: 'high' }),
];

// ═════════════════════════════════════════════════════════════
// 查詢工具
// ═════════════════════════════════════════════════════════════

export const PATTERN_MAP = Object.fromEntries(PATTERNS.map(p => [p.pattern, p]));

/** 依權重降序（挖空優先順序） */
export const PATTERNS_BY_WEIGHT = [...PATTERNS].sort((a, b) => b.weight - a.weight);

/** 全部可重複的雙字母（演算法掃描時用） */
export const DOUBLED_LETTERS = PATTERNS
  .filter(p => p.category === 'doubled_lexical' || p.category === 'doubled_suffix')
  .map(p => p.pattern);

/** 最難的 N 條（後台顯示用） */
export function hardestPatterns(n = 10) {
  return PATTERNS_BY_WEIGHT.slice(0, n);
}

export function patternsByCategory() {
  const out = {};
  for (const p of PATTERNS) (out[p.category] ||= []).push(p);
  return out;
}

export function patternsByReliability() {
  const out = { high: [], medium: [], low: [] };
  for (const p of PATTERNS) out[p.reliability].push(p);
  return out;
}

// ═════════════════════════════════════════════════════════════
// 常見字母混淆（拼寫時的 substitution errors）
// 用於後台混淆熱力圖與「你把 p 寫成 q」類診斷
// ═════════════════════════════════════════════════════════════
export const CONFUSIONS = [
  { pair: ['b', 'd'], note: '右左鏡像，握筆姿勢影響' },
  { pair: ['p', 'q'], note: 'b/d 的旋轉對應' },
  { pair: ['m', 'n'], note: '筆劃數量差一條' },
  { pair: ['v', 'w'], note: '字形相似' },
  { pair: ['s', 'z'], note: '字形相似' },
  { pair: ['u', 'v'], note: '字形相似' },
  { pair: ['h', 'n'], note: '字形相似' },
  { pair: ['l', 'r'], note: '字形相似（尤其手寫體）' },
  { pair: ['l', 'i'], note: '筆劃差一條' },
  { pair: ['i', 'e'], note: '短母音標記選擇' },
  { pair: ['a', 'e'], note: '閉音節短母音選擇' },
  { pair: ['c', 'k'], note: '同一音的兩種拼法選錯' },
  { pair: ['f', 'ph'], note: '同一音的兩種拼法選錯' },
  { pair: ['ie', 'ei'], note: '兩種拼法完全互換，無規律可循' },
];

const CONFUSION_INDEX = new Map(
  CONFUSIONS.flatMap(c => [[c.pair[0], c.pair[1]], [c.pair[1], c.pair[0]]])
);

/** 判斷兩個字母/拼法是否為已知混淆對 */
export function isKnownConfusion(got, expect) {
  if (!got) return false;
  return CONFUSION_INDEX.get(got.toLowerCase())?.toLowerCase() === expect.toLowerCase();
}