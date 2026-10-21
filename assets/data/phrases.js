/**
 * PCS — Phrase Seed Bank (短語詞庫 · 種子資料)
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 香港小學詞彙課程常見的「場所 / 建築」短語。
 * 學生看到的呈現格式就是 `a bank`、`a cake shop` 這種（含冠詞）。
 *
 * ★ 為什麼要放冠詞？
 *   小學詞彙表通常以「a + 名詞」的形式呈現（a bank / a cinema / a clinic），
 *   這是課程詞彙表的慣例。冠詞本身不列入挖空測驗 —— 它是已掌握的結構，
 *   學生的學習焦點在內容詞（shop / station / office）。
 *
 * ★ 例句設計原則（對齊 Phase 2 的標準）：
 *   句長 4–9 字、只用小學詞彙、目標詞自然出現、BrE 拼寫。
 */

export const PHRASE_BANK = {

  // ═══════════════════════════════════════════════
  // 地點 Places（你的 10 個詞）
  // ═══════════════════════════════════════════════
  'a bank': {
    category: 'place',
    image: '🏦',
    sentences: [
      'My mum goes to the bank on Friday.',
      'The bank is next to the post office.',
    ],
    // 教學提示：bank 裡的 a 讀 /æ/（不是字母名）
    note: 'The A in bank is short /æ/',
  },

  'a cake shop': {
    category: 'place',
    image: '🍰',
    sentences: [
      'We go to the cake shop on Sunday.',
      'The cake shop has nice cakes.',
    ],
    note: 'cake shop is a compound word; shop is the head noun',
  },

  'a cinema': {
    category: 'place',
    image: '🎬',
    sentences: [
      'I go to the cinema with my mum.',
      'We watch a film at the cinema.',
    ],
    note: 'cinema is the BrE form (AmE usually movie theater)',
  },

  'a clinic': {
    category: 'place',
    image: '🏥',
    sentences: [
      'The clinic is next to the bank.',
      'My mum takes me to the clinic.',
    ],
    note: 'clinic starts with the blend cl — both letters are sounded',
  },

  'a fire station': {
    category: 'place',
    image: '🚒',
    sentences: [
      'My dad works at the fire station.',
      'The fire station is on my street.',
    ],
    note: 'fire + station; station is the head noun',
  },

  'a park': {
    category: 'place',
    image: '🌳',
    sentences: [
      'We play in the park after school.',
      'The park is near my school.',
    ],
    note: 'The ar in park is an r-controlled vowel',
  },

  'a police station': {
    category: 'place',
    image: '👮',
    sentences: [
      'The police station is near my school.',
      'My uncle works at the police station.',
    ],
    note: 'The silent e in police is the hardest structure in this set',
  },

  'a post office': {
    category: 'place',
    image: '📮',
    sentences: [
      'My mum goes to the post office.',
      'The post office is closed today.',
    ],
    note: 'The ff in office is a doubled consonant — the main target here',
  },

  'a restaurant': {
    category: 'place',
    image: '🍽️',
    sentences: [
      'We eat lunch at a restaurant.',
      'The restaurant is very busy.',
    ],
    note: 'The au in restaurant is a vowel team',
  },

  'a supermarket': {
    category: 'place',
    image: '🛒',
    sentences: [
      'She works in a supermarket.',
      'We buy food at the supermarket.',
    ],
    note: 'super- is the prefix; market is the head noun',
  },

  // ═══════════════════════════════════════════════
  // 補充詞庫（老師可自行擴充）
  // ═══════════════════════════════════════════════

  'a hospital': {
    category: 'place', image: '🏥',
    sentences: ['The hospital is very big.', 'My aunt works at the hospital.'],
  },
  'a library': {
    category: 'place', image: '📚',
    sentences: ['I borrow books from the library.', 'The library is very quiet.'],
    note: 'The r + y ending in library is a common spelling difficulty',
  },
  'a shop': {
    category: 'place', image: '🛍️',
    sentences: ['The shop opens at ten.', 'Mum buys bread at the shop.'],
  },
  'a school': {
    category: 'place', image: '🏫',
    sentences: ['My school is near my home.', 'I go to school by bus.'],
  },
  'a zoo': {
    category: 'place', image: '🦁',
    sentences: ['We visit the zoo on Sunday.', 'I like the pandas at the zoo.'],
  },
  'a museum': {
    category: 'place', image: '🏛️',
    sentences: ['We go to the museum on Sunday.', 'The museum is very old.'],
  },
  'a playground': {
    category: 'place', image: '🛝',
    sentences: ['We play football on the playground.', 'Children play on the playground.'],
  },
  'a police officer': {
    category: 'person', image: '👮',
    sentences: ['The police officer helps us.', 'A police officer is near my school.'],
  },
  'a postman': {
    category: 'person', image: '📬',
    sentences: ['The postman brings the letters.', 'The postman comes at nine.'],
  },
  'a fireman': {
    category: 'person', image: '🧑‍🚒',
    sentences: ['The fireman is very brave.', 'A fireman works at the station.'],
  },
  'a waiter': {
    category: 'person', image: '🧑‍🍳',
    sentences: ['The waiter brings the food.', 'A waiter works in a restaurant.'],
  },
  'a shop assistant': {
    category: 'person', image: '🧑‍💼',
    sentences: ['The shop assistant is very kind.', 'A shop assistant helps the customers.'],
  },
  'a bus stop': {
    category: 'place', image: '🚏',
    sentences: ['I wait at the bus stop.', 'The bus stop is near my house.'],
  },
  'a taxi stand': {
    category: 'place', image: '🚕',
    sentences: ['We wait at the taxi stand.', 'The taxi stand is outside the hotel.'],
  },
  'a coffee shop': {
    category: 'place', image: '☕',
    sentences: ['Mum drinks tea at the coffee shop.', 'The coffee shop opens early.'],
  },

  // ★ 2026-10-16 補（Bug 10）：以下兩個短語原本在片語庫裡缺席，
  //   老師建課填了會走 AI 或顯示 "still need a sentence"。
  'a swimming pool': {
    category: 'place', image: '🏊',
    sentences: ['We swim in the swimming pool.', 'The swimming pool is very deep.'],
    // 教學提示：swimming 是雙寫 m 的動名詞，小學常見錯點
    note: 'swimming doubles the m — swim + m + ing',
  },
  'a big mouse': {
    category: 'animal', image: '🐭',
    sentences: ['A big mouse runs under the desk.', 'The big mouse is very quick.'],
    // 教學提示：mouse 的複數是不規則 mice
    note: 'mouse → mice (irregular plural)',
  },

  // ═══════════════════════════════════════════════
  // 冠詞陷阱（教學用途）
  // ═══════════════════════════════════════════════

  // ★ a / an 的選擇是香港小學的常見錯點，這組特別收錄
  'an office': {
    category: 'place', image: '🏢',
    sentences: ['My dad works in an office.', 'She works in an office in the city.'],
    note: 'office begins with the vowel phoneme /ɒ/ so it takes an, not a',
    teachArticle: true,
  },
  'an airport': {
    category: 'place', image: '✈️',
    sentences: ['We go to the airport by bus.', 'The airport is very busy.'],
    note: 'airport begins with the vowel phoneme /eə/ so it takes an',
    teachArticle: true,
  },
  'a hotel': {
    category: 'place', image: '🏨',
    sentences: ['We stay in a hotel.', 'The hotel is near the beach.'],
    note: 'The h in hotel is silent, but the word starts with the vowel sound /əʊ/, so standard BrE is an hotel. Pupils often write a hotel — a useful discussion point',
    teachArticle: true,
  },
};

/** 取得短語資料 */
export function phraseInfo(phrase) {
  return PHRASE_BANK[String(phrase).toLowerCase().trim()] ?? null;
}

/** 所有短語 key */
export const PHRASE_KEYS = Object.keys(PHRASE_BANK).filter(k => PHRASE_BANK[k]);

/**
 * 轉成 Firestore words collection 的格式。
 * wordId 用短語本身做 slug（保留空格 → 底線），便於閱讀。
 */
export function toWordDoc(phrase) {
  const info = phraseInfo(phrase);
  const key = String(phrase).toLowerCase().trim();
  return {
    wordId: 'p_' + key.replace(/\s+/g, '_'),
    word: key,
    isPhrase: true,
    category: info?.category ?? 'place',
    imageUrl: null,
    imageDataUrl: null,
    imageEmoji: info?.image ?? '📘',   // Phase 4 前先用 emoji 佔位
    sentences: info?.sentences ?? [],
    note: info?.note ?? '',
    teachArticle: !!info?.teachArticle,
    active: true,
    source: 'seed',
    createdAt: null,     // 由 Firestore serverTimestamp 填
  };
}

/** 依分類統計 */
export function phraseCategoryCounts() {
  const out = {};
  for (const k of PHRASE_KEYS) {
    const c = PHRASE_BANK[k].category;
    out[c] = (out[c] || 0) + 1;
  }
  return out;
}