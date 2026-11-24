/**
 * PCS — Emoji resolver（單詞 → 預設 emoji）
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * ★ 為什麼要獨立成一支模組
 *   同一個詞的預設 emoji 必須在三個地方得到**完全一樣**的答案：
 *     1. 老師 create assignment（建立課程）時
 *     2. 老師 add new word（事後新增詞彙）時
 *     3. 學生端 play.html 出題時（舊課程沒有存到 emoji 的後備）
 *   若各處自己寫一份對照表，遲早會不一致。
 *   實際症狀：所有詞都掉到 category 的後備值，place → 🏠，
 *   於是整份作業每個詞都是房子（使用者回報「全都是房子」）。
 *
 * ★ 解析優先序（越前面越精準）
 *   1. 短語詞庫 phrases.js 的 image   → a cake shop → 🍰（人工挑選，最準）
 *   2. 關鍵字比對（去冠詞後整串）      → …shop → 🛍️
 *   2.5 逐詞再掃一次（短語用）          → a big mouse → mouse → 🐭
 *   3. 內建句庫 sentences.js 的類別   → food → 🍎（退而求其次）
 *   4. 全域後備                        → 📘
 *
 *   ★ 為什麼「關鍵字」要排在「類別」前面：
 *     類別太籠統。place 只會給 🏠（shop / station / park 全變房子），
 *     food 只會給 🍎（milk / bread / cake 全變蘋果）。實測把關鍵字
 *     提前之後，shop→🛍️、computer→💻、tiger→🐯、milk→🥛 才對得上。
 */

import { phraseInfo } from '../data/phrases.js?v=2026-11-24-r71';
import { categoryFor } from '../data/sentences.js?v=2026-11-24-r71';

/** 類別 → emoji（與學生端原本的對照表一致） */
export const CATEGORY_EMOJI = {
  food: '🍎', animal: '🐘', school: '🏫', family: '👨‍👩‍👧', action: '🏃',
  clothing: '👕', nature: '🌳', weather: '☀️', transport: '🚌', body: '🧍',
  place: '🏠', toy: '🧸', sport: '⚽', time: '📅', adjective: '⭐',
  number: '🔢', furniture: '🪑', tech: '💻', person: '🧑', extra: '📝',
};

/**
 * 關鍵字 → emoji（給「不在內建句庫、也不在短語庫」的詞用）。
 * ★ 順序很重要：越具體的排在越前面（coffee 要在 shop 之前，
 *   stationery 要在 station 之前），否則先命中的籠統規則會蓋掉精準的。
 * ★ 用 \b 邊界，避免 station 命中 stationery 這類誤判。
 */
const KEYWORD_EMOJI = [
  // ── 複合地點（先比最長的）──────────────────────────
  [/\bcoffee\b|\bcafe\b/, '☕'],
  [/\bcake\s*shop\b|\bbakery\b/, '🍰'],
  [/\bfire\s*station\b|\bfire\s*engine\b/, '🚒'],
  [/\bpolice\s*station\b|\bpolice\s*officer\b|\bpoliceman\b/, '👮'],
  [/\bpost\s*office\b|\bpostman\b|\bmail\b/, '📮'],
  [/\bbus\s*stop\b/, '🚏'],
  [/\btaxi\s*stand\b|\btaxi\b/, '🚕'],
  [/\bapartment\b|\bflat\b/, '🏢'],

  // ── 場所 ─────────────────────────────────────────
  [/\b(stationer|stationery)\w*/, '✏️'],
  [/\b(station|railway)\b/, '🚉'],
  [/\bschool\b|\bclassroom\b|\bclass\b/, '🏫'],
  [/\blibrary\b/, '📚'],
  [/\bmuseum\b/, '🏛️'],
  [/\bplayground\b/, '🛝'],
  [/\bpark\b|\bgarden\b/, '🌳'],
  [/\bzoo\b/, '🦁'],
  [/\bbank\b/, '🏦'],
  [/\bcinema\b|\bfilm\b|\bmovie\b/, '🎬'],
  [/\bhospital\b|\bclinic\b/, '🏥'],
  [/\boffice\b/, '🏢'],
  [/\brestaurant\b|\bdiner\b/, '🍽️'],
  [/\bsupermarket\b|\bmarket\b/, '🛒'],
  [/\bshop\b|\bstore\b/, '🛍️'],
  [/\bairport\b|\baeroplane\b|\bairplane\b/, '✈️'],
  [/\bhotel\b/, '🏨'],
  [/\b(beach|seaside)\b/, '🏖️'],
  [/\bfarm\b/, '🚜'],
  [/\bcity\b|\btown\b/, '🏙️'],
  [/\bhome\b|\bhouse\b|\bflat\b/, '🏠'],
  [/\b(toilet|washroom|restroom|wc)\b/, '🚽'],

  // ── 交通 ─────────────────────────────────────────
  [/\bbus\b/, '🚌'],
  [/\bcar\b|\bautomobile\b/, '🚗'],
  [/\bbike\b|\bbicycle\b/, '🚲'],
  [/\btrain\b|\bmetro\b|\bsubway\b|\bunderground\b/, '🚆'],
  [/\bplane\b|\bflight\b/, '✈️'],
  [/\bship\b|\bboat\b|\bferry\b/, '🚢'],
  [/\btruck\b|\blorry\b/, '🚚'],
  [/\broad\b|\bstreet\b/, '🛣️'],

  // ── 食物 ─────────────────────────────────────────
  [/\bapple\b/, '🍎'],
  [/\bbanana/, '🍌'],
  [/\borange\b/, '🍊'],
  [/\b(grape|watermelon|mango|peach|pear|fruit)\b/, '🍇'],
  [/\b(vegetable|carrot|tomato|potato|onion|cabbage)\b/, '🥬'],
  [/\bcake\b/, '🍰'],
  [/\b(bread|toast|bun)\b/, '🍞'],
  [/\b(rice|noodle|noodles|pasta)\b/, '🍚'],
  [/\b(milk|yogurt|cheese)\b/, '🥛'],
  [/\begg\b/, '🥚'],
  [/\bfish\b/, '🐟'],
  [/\b(chicken|meat|beef|pork|steak)\b/, '🍗'],
  [/\bsoup\b/, '🍲'],
  [/\b(sandwich|burger|hamburger|pizza)\b/, '🍔'],
  [/\b(candy|sweet|sweets|chocolate)\b/, '🍬'],
  [/\b(ice\s*cream|ice-cream)\b/, '🍦'],
  [/\b(tea|coffee)\b/, '🍵'],
  [/\b(water|juice|drink)\b/, '🥤'],
  [/\bcake\b/, '🍰'],

  // ── 動物 ─────────────────────────────────────────
  [/\bcat\b|\bkitten\b/, '🐱'],
  [/\bdog\b|\bpuppy\b/, '🐶'],
  [/\brabbit\b|\bbunny\b/, '🐰'],
  [/\bbird\b|\bchick\b|\bduck\b/, '🐦'],
  [/\btiger\b/, '🐯'],
  [/\belephant\b/, '🐘'],
  [/\bmonkey\b/, '🐵'],
  [/\blion\b/, '🦁'],
  [/\bpanda\b/, '🐼'],
  [/\bcow\b|\bcattle\b/, '🐮'],
  [/\bhorse\b|\bpony\b/, '🐴'],
  [/\bpig\b/, '🐷'],
  [/\bsheep\b|\blamb\b/, '🐑'],
  [/\bgoat\b/, '🐐'],
  [/\bbear\b/, '🐻'],
  [/\bsnake\b/, '🐍'],
  [/\bfrog\b/, '🐸'],
  [/\bturtle\b|\btortoise\b/, '🐢'],
  [/\bfox\b/, '🦊'],
  [/\bwolf\b/, '🐺'],
  // ★ 2026-10-09 補：內建句庫裡的 animal 有 25 個，這裡原本只列了 20 個，
  //   mouse / whale / dolphin / giraffe 全漏掉 → "a big mouse" 直接掉到 📘，
  //   單獨的 "mouse" 也只能靠類別拿到 🐘（大象）。使用者回報的就是這一個。
  [/\bmouse\b|\bmice\b/, '🐭'],
  [/\bwhale\b/, '🐳'],
  [/\bdolphin\b/, '🐬'],
  [/\bgiraffe\b/, '🦒'],
  // 句庫以外、但常見的動物（避免老師自己加詞時又掉到 🐘）
  [/\b(owl)\b/, '🦉'],
  [/\bpenguin\b/, '🐧'],
  [/\b(hen|rooster)\b/, '🐔'],
  [/\bspider\b/, '🕷️'],
  [/\b(dinosaur|dino)\b/, '🦕'],
  [/\bkangaroo\b/, '🦘'],
  [/\b(crocodile|alligator)\b/, '🐊'],
  [/\b(hippo|hippopotamus)\b/, '🦛'],
  [/\bsquirrel\b/, '🐿️'],
  [/\bdeer\b/, '🦌'],
  [/\bcamel\b/, '🐪'],
  [/\bparrot\b/, '🦜'],
  [/\bshark\b/, '🦈'],
  [/\boctopus\b/, '🐙'],
  [/\bcrab\b/, '🦀'],
  [/\b(bee|ant|butterfly|insect|bug)\b/, '🐝'],

  // ── 學校 / 文具 ──────────────────────────────────
  [/\b(book|story|read)\b/, '📚'],
  [/\b(pencil|pen|ruler|eraser|scissors|crayon)\b/, '✏️'],
  [/\b(bag|schoolbag|backpack)\b/, '🎒'],
  [/\b(teacher|tutor)\b/, '🧑‍🏫'],
  [/\b(student|pupil)\b/, '🧑‍🎓'],
  [/\b(paper|notebook|homework)\b/, '📄'],
  [/\b(art|draw|drawing|paint|painting)\b/, '🎨'],
  [/\bbaker\b|\bbakery\b/, '🥖'],
  [/\bcomputer\b|\blaptop\b|\btablet\b/, '💻'],
  [/\b(phone|telephone)\b/, '📱'],
  [/\bdesk\b|\bchair\b|\btable\b/, '🪑'],

  // ── 學科（★ 原本全部掉到 📘）──────────────────────
  [/\b(science|scientist)\b/, '🔬'],
  [/\b(history)\b/, '📜'],
  [/\b(geography)\b/, '🌍'],
  [/\b(maths|math|mathematics)\b/, '🔢'],

  // ── 家人 / 人物 ──────────────────────────────────
  [/\b(mother|mum|mom|mummy)\b/, '👩'],
  [/\b(father|dad|daddy)\b/, '👨'],
  [/\bsister\b/, '👧'],
  [/\bbrother\b/, '👦'],
  [/\bbaby\b/, '👶'],
  [/\b(grandmother|grandma|granny)\b/, '👵'],
  [/\b(grandfather|grandpa)\b/, '👴'],
  [/\bfamily\b/, '👨‍👩‍👧'],
  [/\b(doctor|nurse|dentist)\b/, '🧑‍⚕️'],
  [/\b(fireman|firefighter)\b/, '🧑‍🚒'],
  [/\b(cook|chef|waiter|waitress)\b/, '🧑‍🍳'],
  [/\b(farmer)\b/, '🧑‍🌾'],
  [/\b(singer)\b/, '🧑‍🎤'],
  [/\b(artist|painter)\b/, '🧑‍🎨'],
  [/\b(driver)\b/, '🚗'],

  // ── 身體 ─────────────────────────────────────────
  [/\beye\b|\beyes\b/, '👁️'],
  [/\bear\b/, '👂'],
  [/\bnose\b/, '👃'],
  [/\bmouth\b/, '👄'],
  [/\bhand\b|\bhands\b/, '✋'],
  [/\bfoot\b|\bfeet\b/, '🦶'],
  [/\b(tooth|teeth)\b/, '🦷'],
  [/\bhair\b/, '💇'],

  // ── 衣物 ─────────────────────────────────────────
  [/\bhat\b|\bcap\b/, '🧢'],
  [/\bshirt\b|\bt-shirt\b/, '👕'],
  [/\bdress\b|\bskirt\b/, '👗'],
  [/\b(shoe|shoes|trainers)\b/, '👟'],
  [/\bcoat\b|\bjacket\b/, '🧥'],
  [/\bsock\b|\bsocks\b/, '🧦'],
  [/\b(glasses|spectacles)\b/, '👓'],
  [/\b(shorts)\b/, '🩳'],
  [/\b(sweater|jumper)\b/, '🧥'],

  // ── 自然 / 天氣 ──────────────────────────────────
  [/\bsun\b|\bsunny\b/, '☀️'],
  [/\brain\b|\brainy\b|\bumbrella\b/, '🌧️'],
  [/\bcloud\b|\bcloudy\b/, '☁️'],
  [/\bsnow\b|\bsnowy\b/, '❄️'],
  [/\btree\b|\bforest\b/, '🌳'],
  [/\bflower\b|\bplant\b/, '🌸'],
  [/\bgrass\b|\bleaf\b|\bleaves\b/, '🌱'],
  [/\bsky\b/, '🌤️'],
  [/\bstar\b|\bstars\b/, '⭐'],
  [/\bmoon\b/, '🌙'],
  [/\b(wind|windy)\b/, '🌬️'],
  [/\b(weather|climate)\b/, '🌦️'],

  // ── 時間 ─────────────────────────────────────────
  [/\bmorning\b/, '🌅'],
  [/\bnight\b|\bevening\b/, '🌙'],
  [/\b(clock|watch|time|hour)\b/, '🕐'],
  [/\b(day|week|month|year|today|tomorrow)\b/, '📅'],

  // ── 運動 ─────────────────────────────────────────
  [/\b(football|soccer|ball|basketball|tennis|badminton|volleyball)\b/, '⚽'],
  [/\bswim\b|\bswimming\b/, '🏊'],
  [/\brun\b|\brunning\b|\brace\b/, '🏃'],
  [/\b(skipping|skipping\s*rope)\b/, '🤸'],
  [/\b(gym|exercise|workout)\b/, '🏋️'],

  // ── 動詞（盡量給具體 emoji，避免全掉到 🏃）────────
  //   ★ 注意：build 不放 "building"，否則會蓋掉下方「building/centre → 🏢」的名詞規則。
  [/\b(eat|eats|eating)\b/, '🍴'],
  [/\b(read|reads|reading)\b/, '📖'],
  [/\b(write|writes|writing)\b/, '✍️'],
  [/\b(dance|dances|dancing)\b/, '💃'],
  [/\b(walk|walks|walking)\b/, '🚶'],
  [/\b(ride|rides|riding)\b/, '🚴'],
  [/\b(fly|flies|flying)\b/, '✈️'],
  [/\b(climb|climbs|climbing)\b/, '🧗'],
  [/\b(catch|catches|throwing|throw|throws)\b/, '🤾'],
  [/\b(kick|kicks|kicking)\b/, '⚽'],
  [/\b(open|opens|opening)\b/, '🔓'],
  [/\b(close|closes|closing)\b/, '🔒'],
  [/\b(wash|washes|washing)\b/, '🧼'],
  [/\b(help|helps|helping)\b/, '🤝'],
  [/\b(laugh|laughs|laughing)\b/, '😂'],
  [/\b(learn|learns|learning|study|studies)\b/, '📚'],
  [/\b(make|makes|making)\b/, '🛠️'],
  [/\b(find|finds|finding)\b/, '🔍'],
  [/\b(think|thinks|thinking)\b/, '💭'],
  [/\b(grow|grows|growing)\b/, '🌱'],
  [/\b(build|builds|built)\b/, '🔨'],
  [/\b(cut|cuts|cutting)\b/, '✂️'],

  // ── 玩具 / 樂器 / 媒體（★ 原本這批全掉到 🧸 或 📘）────
  [/\b(doll|teddy|stuffed\s*toy)\b/, '🧸'],
  [/\b(toy|toys)\b/, '🧸'],
  [/\b(slide)\b/, '🛝'],
  [/\b(balloon)\b/, '🎈'],
  [/\bkite\b/, '🪁'],
  [/\brobot\b/, '🤖'],
  [/\b(puzzle|jigsaw)\b/, '🧩'],
  [/\b(drum)\b/, '🥁'],
  [/\bpiano\b/, '🎹'],
  [/\bguitar\b|\bviolin\b/, '🎸'],
  [/\bchess\b/, '♟️'],
  [/\b(game|videogame|video\s*game)\b/, '🎮'],
  [/\b(camera|photo|photograph)\b/, '📷'],
  [/\b(picture|image)\b/, '🖼️'],
  [/\b(tv|television)\b/, '📺'],
  [/\b(internet|wifi|website|online)\b/, '🌐'],
  [/\bemail\b/, '📧'],
  [/\bscreen\b|\bmonitor\b/, '🖥️'],
  [/\bbutton\b/, '🔘'],
  [/\b(money|cash|coin)\b/, '💰'],
  [/\bkey\b|\bkeys\b/, '🔑'],
  [/\bbox\b/, '📦'],
  [/\bticket\b/, '🎫'],
  [/\bbridge\b/, '🌉'],
  [/\btraffic\b/, '🚦'],
  [/\b(letter|envelope)\b/, '✉️'],

  // ── 大自然（★ 原本 river/mountain/sea 全被當「樹」🌳）──
  [/\b(river|lake|stream)\b/, '🏞️'],
  [/\bmountain\b|\bhill\b/, '⛰️'],
  [/\b(sea|ocean)\b/, '🌊'],
  [/\bisland\b/, '🏝️'],
  [/\bsand\b/, '🏖️'],
  [/\b(stone|rock)\b/, '🪨'],
  [/\b(field|farmland)\b/, '🌾'],
  [/\bearth\b/, '🌍'],
  [/\bplanet\b/, '🪐'],
  [/\brainbow\b/, '🌈'],
  [/\b(thunder|lightning)\b/, '⛈️'],
  [/\b(storm|stormy)\b/, '🌩️'],
  [/\b(fog|foggy|mist)\b/, '🌫️'],

  // ── 傢俱 / 家居用品 ───────────────────────────────
  [/\bbed\b/, '🛏️'],
  [/\bdoor\b/, '🚪'],
  [/\bwindow\b/, '🪟'],
  [/\b(sofa|couch)\b/, '🛋️'],
  [/\blamp\b|\blight\s*bulb\b/, '💡'],
  [/\b(spoon)\b/, '🥄'],
  [/\b(fork)\b/, '🍴'],
  [/\bknife\b/, '🔪'],
  [/\b(cup|mug|plate|bowl)\b/, '🍽️'],
  [/\b(mirror)\b/, '🪞'],
  [/\buniform\b/, '👔'],
  [/\b(question)\b/, '❓'],
  [/\b(board)\b/, '📋'],

  // ── 身體（避免整批掉到 👁）────────────────────────
  [/\b(head|face)\b/, '🧑'],
  [/\bleg\b|\bknee\b|\bfeet\s*legs?\b/, '🦵'],
  [/\barm\b|\bshoulder\b/, '💪'],
  [/\bfinger\b/, '👆'],
  [/\btail\b/, '🐾'],
  [/\bwing\b/, '🪶'],

  // ── 家人補充 ─────────────────────────────────────
  [/\buncle\b/, '👨'],
  [/\baunt\b/, '👩'],
  [/\bcousin\b/, '🧑'],
  [/\bparents\b/, '👨‍👩‍👧'],
  [/\bfriend\b/, '🤝'],

  // ── 人物 / 稱謂（避免掉到 📘）─────────────────────
  [/\b(boy)\b/, '👦'],
  [/\b(girl)\b/, '👧'],
  [/\b(hello|hi|bye|goodbye|wave)\b/, '👋'],
  [/\b(pet)\b/, '🐾'],

  // ── 調味 / 其他食物 ──────────────────────────────
  [/\b(sugar|salt|pepper)\b/, '🧂'],
  [/\bice\b/, '🧊'],
  [/\b(biscuit|cookie)\b/, '🍪'],
  [/\b(dinner|breakfast|lunch|meal)\b/, '🍽️'],
  [/\bhoney\b/, '🍯'],
  [/\bbutter\b/, '🧈'],

  // ── 心情 / 形容詞 ────────────────────────────────
  [/\b(happy|glad|smile)\b/, '😊'],
  [/\b(sad|cry)\b/, '😢'],
  [/\b(angry|cross)\b/, '😠'],
  [/\b(tired|sleep|sleepy)\b/, '😴'],
  [/\b(hot|warm)\b/, '🔥'],
  [/\b(cold|freezing)\b/, '🥶'],
  [/\bhungry\b/, '🍽️'],
  [/\bthirsty\b/, '🥤'],
  [/\b(birthday|party|present|gift)\b/, '🎁'],
  [/\b(music|song|sing)\b/, '🎵'],
  [/\b(holiday|travel|trip)\b/, '🧳'],

  // ── 顏色（放在食物之後，orange 仍歸水果 🍊）────────
  [/\b(red|blue|green|yellow|white|black|brown|pink|purple|grey|gray)\b/, '🎨'],
  [/\b(colour|color)\b/, '🎨'],

  // ── 其他常見詞（避免掉到類別的籠統 emoji）─────────
  [/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, '📅'],
  [/\b(christmas|festival|new year|easter)\b/, '🎉'],
  [/\b(english|chinese|language|speak)\b/, '🗣️'],
  [/\b(hong kong|china|country|world|map)\b/, '🗺️'],
  [/\bvillage\b/, '🏘️'],
  [/\bchurch\b|\btemple\b/, '⛪'],
  [/\b(building|centre|center)\b/, '🏢'],
];

/** 去掉開頭的冠詞（a / an / the） */
function stripArticle(word) {
  return String(word || '').toLowerCase().trim().replace(/^(a|an|the)\s+/, '');
}

/**
 * ★ 主要 API：取得一個詞的預設 emoji。
 *
 * @param {string} word      詞或短語（可含冠詞，例如 "a cake shop"）
 * @param {string} [category] 已知類別（有就用，省一次查表）
 * @returns {string} emoji
 */
export function emojiForWord(word, category = null) {
  const key = String(word || '').toLowerCase().trim();
  if (!key) return '📘';

  // 1) 短語詞庫（人工挑選，最精準）
  const info = phraseInfo(key);
  if (info?.image) return info.image;

  // 2) 關鍵字比對（用去冠詞後的詞；"an office" 已在步驟 1 命中）
  const bare = stripArticle(key);
  for (const [re, e] of KEYWORD_EMOJI) {
    if (re.test(bare)) return e;
  }

  // 2.5) ★ 逐詞再掃一次 —— 短語（"a big mouse" / "a tall giraffe"）
  //      在短語庫沒有收錄時，靠這層用「修飾詞以外的那個實詞」命中規則。
  //      整串比對已經涵蓋大部分情況，這層是保險（也是修飾詞順序顛倒時的
  //      唯一出路，例如 "a mouse that is big"）。
  const tokens = bare.split(/[\s\-–]+/).filter(Boolean);
  if (tokens.length > 1) {
    for (const [re, e] of KEYWORD_EMOJI) {
      if (tokens.some(t => re.test(t))) return e;
    }
  }

  // 3) 內建句庫的類別（較籠統，放後面當後備）
  //    ★ 短語（"a big mouse"）整串查不到類別，就拆成詞逐一查，
  //      並且優先採用「非形容詞」的那個詞 —— 名詞才是圖片的主體。
  let cat = category || categoryFor(key);
  if (!cat && tokens.length > 1) {
    const cats = tokens.map(t => categoryFor(t)).filter(Boolean);
    cat = cats.find(c => c !== 'adjective') || cats[0] || null;
  }
  if (cat && CATEGORY_EMOJI[cat]) return CATEGORY_EMOJI[cat];

  // 4) 後備
  return '📘';
}

/**
 * 取得一個詞的類別（短語庫優先，其次內建句庫）。
 * 用於寫入 assignment 的 category 欄位。
 * ★ 短語（"a big mouse"）整串查不到時，拆詞找出「非形容詞」的那個詞 ——
 *   名詞才是圖片的主體，也才不會讓整份作業的分類都變成 adjective。
 */
export function categoryForWord(word) {
  const key = String(word || '').toLowerCase().trim();
  if (!key) return null;
  const info = phraseInfo(key)?.category;
  if (info) return info;
  const whole = categoryFor(key);
  if (whole) return whole;
  const tokens = stripArticle(key).split(/[\s\-–]+/).filter(Boolean);
  if (tokens.length > 1) {
    const cats = tokens.map(t => categoryFor(t)).filter(Boolean);
    return cats.find(c => c !== 'adjective') || cats[0] || null;
  }
  return null;
}
