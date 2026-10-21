/**
 * PCS — Primary School Sentence Bank
 * Progressive Cloze Spelling · CPI 2026 · Yoyo Gu (11436852)
 *
 * 方案A：手寫高頻小學詞例句庫。零依賴、零成本、離線可用。
 *
 * ★ 選詞原則：每個詞至少含一個「值得挖空的拼寫結構」，
 *   優先收錄含重複字母（apple, rabbit, letter）、多讀音元音組合
 *   （tea, sea, rain, moon）、r-控元音（bird, girl, turn）、
 *   靜音e（cake, kite, home, nose）、聲母連綴（stop, swim, play）
 *   的詞 —— 這些正是研究要測量的變項。
 *
 * ★ 句長控制：4–9 個字，只用小學已學詞彙。
 * ★ 目標詞必須自然出現，不硬塞。
 *
 * 對應詞彙類別（供研究分析 phonClass 分佈）：
 *   food / animal / school / family / action / adjective / body / clothing /
 *   transport / nature / weather / time / number / place / toy / sport
 */

export const SENTENCE_BANK = {

  // ═══════════════════════════════════════════════════
  // 動物 Animals（含大量重複字母與 r-控元音）
  // ═══════════════════════════════════════════════════
  apple:      { cat: 'food',  s: ['I eat an apple every day.', 'She puts the apple in her bag.'] },
  rabbit:     { cat: 'animal',s: ['The rabbit runs very fast.', 'A rabbit has long ears.'] },
  banana:     { cat: 'food',  s: ['I like bananas for breakfast.', 'The monkey eats a banana.'] },
  orange:     { cat: 'food',  s: ['This orange is sweet.', 'She peels the orange.'] },
  egg:        { cat: 'food',  s: ['I have an egg for breakfast.', 'The hen lays an egg.'] },
  cake:       { cat: 'food',  s: ['We eat cake on my birthday.', 'The cake is on the table.'] },
  milk:       { cat: 'food',  s: ['I drink milk every morning.', 'The cat drinks milk.'] },
  bread:      { cat: 'food',  s: ['My mum makes fresh bread.', 'He eats bread and egg.'] },
  rice:       { cat: 'food',  s: ['We eat rice for dinner.', 'She puts rice in a bowl.'] },
  noodles:    { cat: 'food',  s: ['I eat noodles with soup.', 'The noodles are very hot.'] },
  chicken:    { cat: 'food',  s: ['We eat chicken for lunch.', 'The chicken has many feathers.'] },
  beef:       { cat: 'food',  s: ['My dad likes beef noodles.', 'The beef is on the plate.'] },
  fish:       { cat: 'food',  s: ['The fish swims in the water.', 'We eat fish on Friday.'] },
  elephant:   { cat: 'animal',s: ['The elephant has a long nose.', 'An elephant is very big.'] },
  tiger:      { cat: 'animal',s: ['The tiger runs in the forest.', 'A tiger has black stripes.'] },
  monkey:     { cat: 'animal',s: ['The monkey climbs the tree.', 'The monkey likes to eat bananas.'] },
  bird:       { cat: 'animal',s: ['A bird sings in the tree.', 'The bird can fly high.'] },
  duck:       { cat: 'animal',s: ['The duck swims in the pond.', 'A duck says quack quack.'] },
  cow:        { cat: 'animal',s: ['The cow gives us milk.', 'The cow is in the field.'] },
  pig:        { cat: 'animal',s: ['The pig is pink and fat.', 'The pig sleeps in the mud.'] },
  horse:      { cat: 'animal',s: ['I ride a horse on Sunday.', 'The horse runs very fast.'] },
  sheep:      { cat: 'animal',s: ['The sheep has white wool.', 'A sheep says baa baa.'] },
  bear:       { cat: 'animal',s: ['The bear is very strong.', 'A bear likes to eat honey.'] },
  lion:       { cat: 'animal',s: ['The lion lives in the forest.', 'The lion has a big head.'] },
  cat:        { cat: 'animal',s: ['My cat is black and white.', 'The cat sits on my bed.'] },
  dog:        { cat: 'animal',s: ['My dog can run and jump.', 'The dog sleeps in the garden.'] },
  mouse:      { cat: 'animal',s: ['A little mouse lives here.', 'The mouse runs away fast.'] },
  snake:      { cat: 'animal',s: ['The snake is long and thin.', 'A snake can crawl quietly.'] },
  butterfly:  { cat: 'animal',s: ['The butterfly has pretty wings.', 'A butterfly flies over the flowers.'] },
  bee:        { cat: 'animal',s: ['The bee likes to drink honey.', 'A bee can buzz loudly.'] },
  ant:        { cat: 'animal',s: ['A small ant carries food.', 'The ant walks in a line.'] },
  frog:       { cat: 'animal',s: ['The frog jumps very high.', 'A frog lives near the water.'] },
  panda:      { cat: 'animal',s: ['The panda is black and white.', 'A panda eats bamboo every day.'] },
  fox:        { cat: 'animal',s: ['The fox is clever and quick.', 'The fox runs into the woods.'] },
  whale:      { cat: 'animal',s: ['The whale is very big.', 'A whale swims in the deep sea.'] },
  dolphin:    { cat: 'animal',s: ['The dolphin can jump high.', 'Dolphins are very clever animals.'] },
  giraffe:    { cat: 'animal',s: ['The giraffe has a long neck.', 'A giraffe eats leaves from tall trees.'] },

  // ═══════════════════════════════════════════════════
  // 食物 Food
  // ═══════════════════════════════════════════════════
  water:      { cat: 'food',  s: ['I drink water after running.', 'Please give me a cup of water.'] },
  juice:      { cat: 'food',  s: ['She drinks apple juice.', 'The juice is cold and sweet.'] },
  tea:        { cat: 'food',  s: ['My grandma drinks tea every morning.', 'I have tea with my dinner.'] },
  coffee:     { cat: 'food',  s: ['My dad drinks coffee at work.', 'The coffee is very hot.'] },
  soup:       { cat: 'food',  s: ['The soup is warm and nice.', 'We eat soup with bread.'] },
  noodle:     { cat: 'food',  s: ['The hot noodles smell good.', 'I eat noodles every Friday.'] },
  potato:     { cat: 'food',  s: ['I like potato chips very much.', 'The potato is in the bag.'] },
  tomato:     { cat: 'food',  s: ['The tomato is red and round.', 'She puts a tomato in the salad.'] },
  carrot:     { cat: 'food',  s: ['Rabbits love to eat carrots.', 'The carrot is orange and long.'] },
  sugar:      { cat: 'food',  s: ['Please do not add too much sugar.', 'The tea has no sugar.'] },
  salt:       { cat: 'food',  s: ['We put a little salt in the soup.', 'The salt is in the box.'] },
  ice:        { cat: 'food',  s: ['The ice is very cold.', 'I drink a cold ice drink.'] },
  candy:      { cat: 'food',  s: ['I have one candy after lunch.', 'The candy is sweet and small.'] },
  biscuit:    { cat: 'food',  s: ['She likes chocolate biscuits.', 'We have biscuits with tea.'] },
  sandwich:   { cat: 'food',  s: ['I eat a sandwich for lunch.', 'My mum makes a cheese sandwich.'] },
  dinner:     { cat: 'food',  s: ['We have dinner at seven.', 'Dinner is ready now.'] },
  breakfast:  { cat: 'food',  s: ['I eat breakfast every morning.', 'Breakfast is very important.'] },
  lunch:      { cat: 'food',  s: ['I have lunch at school.', 'We eat lunch at twelve.'] },
  fruit:      { cat: 'food',  s: ['Fruit is good for your health.', 'I eat fruit every day.'] },
  sweets:     { cat: 'food',  s: ['Too many sweets are bad for you.', 'The sweets are in the box.'] },
  chocolate:  { cat: 'food',  s: ['I love chocolate cake.', 'The chocolate is very sweet.'] },

  // ═══════════════════════════════════════════════════
  // 學校 School
  // ═══════════════════════════════════════════════════
  school:     { cat: 'school',s: ['My school is near my home.', 'I go to school by bus.'] },
  classroom:  { cat: 'school',s: ['Our classroom is on the second floor.', 'The classroom is very clean.'] },
  teacher:    { cat: 'school',s: ['My teacher is kind and helpful.', 'The teacher speaks English well.'] },
  student:    { cat: 'school',s: ['I am a student in Class Three.', 'She is a good student.'] },
  pencil:     { cat: 'school',s: ['I write with a pencil.', 'The pencil is very sharp.'] },
  pen:        { cat: 'school',s: ['Can I borrow your pen?', 'The pen has a blue cap.'] },
  book:       { cat: 'school',s: ['I read a book every night.', 'This book has many pictures.'] },
  bag:        { cat: 'school',s: ['My bag is very heavy.', 'I put my books in the bag.'] },
  desk:       { cat: 'school',s: ['My desk is clean and tidy.', 'I do my homework at the desk.'] },
  chair:      { cat: 'school',s: ['Please sit on the chair.', 'The chair is made of wood.'] },
  paper:      { cat: 'school',s: ['I draw on a piece of paper.', 'The paper is white.'] },
  ruler:      { cat: 'school',s: ['I measure with a ruler.', 'The ruler is thirty centimetres long.'] },
  scissors:   { cat: 'school',s: ['We cut paper with scissors.', 'The scissors are sharp.'] },
  glue:       { cat: 'school',s: ['I stick the paper with glue.', 'The glue is very strong.'] },
  crayon:     { cat: 'school',s: ['I colour with new crayons.', 'The crayon box has many colours.'] },
  notebook:   { cat: 'school',s: ['I write my homework in this notebook.', 'My notebook is new.'] },
  homework:   { cat: 'school',s: ['I do my homework after school.', 'My homework is not hard.'] },
  lesson:     { cat: 'school',s: ['We have four lessons in the morning.', 'This lesson is very interesting.'] },
  playground: { cat: 'school',s: ['We play football on the playground.', 'The playground is very big.'] },
  library:    { cat: 'school',s: ['I borrow books from the library.', 'The library is quiet.'] },
  // ★ 2026-10-16 補（Bug 10）：這兩個詞原本在句庫裡缺席，
  //   老師建課填了會顯示 "still need a sentence"，內建詞庫選詞時也會被過濾掉。
  //   bank：n-k 是常見的 nasal+stop 收尾，值得挖。
  bank:       { cat: 'place', s: ['My mum goes to the bank on Friday.', 'The bank is next to the post office.'] },
  //   toilet：oi 讀 /ɔɪ/，是小學常見的拼寫陷阱。
  toilet:     { cat: 'place', s: ['The toilet is next to the classroom.', 'I wash my hands in the toilet.'] },
  uniform:    { cat: 'school',s: ['I wear a school uniform every day.', 'My uniform is blue and white.'] },
  name:       { cat: 'school',s: ['My name is Yoyo.', 'Write your name on the paper.'] },
  question:   { cat: 'school',s: ['I answer the question carefully.', 'The teacher asks a good question.'] },
  story:      { cat: 'school',s: ['I like this story very much.', 'She reads a story before bed.'] },
  picture:    { cat: 'school',s: ['Look at the picture on the board.', 'She draws a nice picture.'] },
  board:      { cat: 'school',s: ['The board is behind the teacher.', 'I look at the board.'] },
  class:      { cat: 'school',s: ['I am in Class Three.', 'Our class has thirty students.'] },
  English:    { cat: 'school',s: ['I like English lessons very much.', 'She speaks English every day.'] },
  Chinese:    { cat: 'school',s: ['I read Chinese books too.', 'Chinese is my favourite subject.'] },
  maths:      { cat: 'school',s: ['Maths is my favourite subject.', 'Maths is not difficult for me.'] },
  music:      { cat: 'school',s: ['I like music class very much.', 'We sing in music class.'] },
  art:        { cat: 'school',s: ['Art class is my favourite.', 'I draw a picture in art class.'] },
  sport:      { cat: 'school',s: ['We do sports after school.', 'Sport helps us stay healthy.'] },

  // ═══════════════════════════════════════════════════
  // 家庭 Family
  // ═══════════════════════════════════════════════════
  family:     { cat: 'family',s: ['I love my family very much.', 'My family has four people.'] },
  mother:     { cat: 'family',s: ['My mother cooks very well.', 'My mother works in a hospital.'] },
  father:     { cat: 'family',s: ['My father drives a taxi.', 'My father likes to read the newspaper.'] },
  mum:        { cat: 'family',s: ['Mum makes a cake for me.', 'I tell Mum everything.'] },
  dad:        { cat: 'family',s: ['Dad takes me to school.', 'My dad makes breakfast on Sunday.'] },
  brother:    { cat: 'family',s: ['My brother is two years older.', 'My brother likes football.'] },
  sister:     { cat: 'family',s: ['My sister is in primary school.', 'My sister can sing very well.'] },
  baby:       { cat: 'family',s: ['The baby is sleeping now.', 'My baby brother is one year old.'] },
  grandma:    { cat: 'family',s: ['Grandma tells me old stories.', 'I visit Grandma every week.'] },
  grandfather:{ cat: 'family',s: ['Grandfather likes to walk in the park.', 'Grandfather is very wise.'] },
  uncle:      { cat: 'family',s: ['My uncle lives in another city.', 'Uncle gives me a present.'] },
  aunt:       { cat: 'family',s: ['My aunt is a teacher.', 'Aunt makes delicious food.'] },
  cousin:     { cat: 'family',s: ['My cousin is in my class.', 'I play with my cousin after school.'] },
  friend:     { cat: 'family',s: ['She is my best friend.', 'I play with my friends at recess.'] },
  home:       { cat: 'family',s: ['I go home at five o clock.', 'My home is not far from school.'] },
  house:      { cat: 'family',s: ['Our house has three bedrooms.', 'My house is near a park.'] },
  parents:    { cat: 'family',s: ['My parents love me very much.', 'My parents work very hard.'] },
  husband:    { cat: 'family',s: ['My husband works in an office.', 'She helps her husband cook.'] },
  wife:       { cat: 'family',s: ['My wife is a nurse.', 'She has a kind wife.'] },

  // ═══════════════════════════════════════════════════
  // 動作 Actions
  // ═══════════════════════════════════════════════════
  jump:       { cat: 'action',s: ['I can jump very high.', 'The rabbit can jump over the box.'] },
  run:        { cat: 'action',s: ['I run to school every day.', 'She runs very fast.'] },
  walk:       { cat: 'action',s: ['We walk to the park.', 'He walks his dog after dinner.'] },
  swim:       { cat: 'action',s: ['I can swim very well.', 'We swim in summer.'] },
  try:        { cat: 'action', s: ['Please try again.', 'I can try this puzzle.'] },
  tried:      { cat: 'action', s: ['She tried her best.', 'He tried the new game.'] },
  trying:     { cat: 'action', s: ['I am trying to be good.', 'She is trying again.'] },
  swing:      { cat: 'action', s: ['We swing on the swing.', 'The swing is very high.'] },
  slide:      { cat: 'action', s: ['We slide down the slide.', 'I slide on the ice.'] },
  whistle:    { cat: 'action', s: ['The boy has a whistle.', 'He blows a whistle loudly.'] },
  paddle:     { cat: 'action', s: ['We paddle the small boat.', 'She can paddle a kayak.'] },
  skip:       { cat: 'action', s: ['We skip rope in the yard.', 'I can skip a stone.'] },
  hop:        { cat: 'action', s: ['The rabbit can hop.', 'He hops on one leg.'] },
  paint:      { cat: 'action', s: ['We paint a picture.', 'She likes to paint flowers.'] },
  count:      { cat: 'action', s: ['I count to ten.', 'We count the apples.'] },
  sort:       { cat: 'action', s: ['We sort the cards.', 'Put the books in order.'] },
  talk:       { cat: 'action', s: ['We talk about school.', 'Please talk to your teacher.'] },
  push:       { cat: 'action', s: ['Push the door gently.', 'I push my bike up the hill.'] },
  pull:       { cat: 'action', s: ['Pull the door open.', 'He pulls the rope.'] },
  dry:        { cat: 'action', s: ['The towel is dry.', 'Let the clothes dry.'] },
  brush:      { cat: 'action', s: ['I brush my teeth.', 'She brushes her hair.'] },
  comb:       { cat: 'action', s: ['She combs her hair.', 'I comb my hair at school.'] },
  stir:       { cat: 'action', s: ['Stir the soup slowly.', 'Dad stirs the tea.'] },
  pour:       { cat: 'action', s: ['Pour the milk in.', 'I pour water in a cup.'] },
  bake:       { cat: 'action', s: ['We bake cakes at home.', 'Mum bakes bread.'] },
  taste:      { cat: 'action', s: ['The soup tastes good.', 'Can you taste it?'] },
  play:       { cat: 'action',s: ['We play football after school.', 'The children play happily.'] },
  read:       { cat: 'action',s: ['I read a book before bed.', 'She reads English every night.'] },
  write:      { cat: 'action',s: ['I write a letter to Grandma.', 'He writes with a pencil.'] },
  draw:       { cat: 'action',s: ['I draw a picture of my cat.', 'She draws very nicely.'] },
  sing:       { cat: 'action',s: ['We sing an English song.', 'She sings very beautifully.'] },
  dance:      { cat: 'action',s: ['They dance at the school show.', 'I like to dance with my friends.'] },
  listen:     { cat: 'action',s: ['Please listen to the teacher.', 'I listen to music on the bus.'] },
  look:       { cat: 'action',s: ['Look at the blackboard.', 'She looks at the picture.'] },
  watch:      { cat: 'action',s: ['We watch TV after dinner.', 'I watch birds in the morning.'] },
  eat:        { cat: 'action',s: ['I eat breakfast at seven.', 'We eat dinner together.'] },
  drink:      { cat: 'action',s: ['I drink water after running.', 'She drinks a glass of milk.'] },
  sleep:      { cat: 'action',s: ['I sleep for ten hours.', 'The baby sleeps all day.'] },
  smile:      { cat: 'action',s: ['Her smile is very sweet.', 'He smiles at me.'] },
  laugh:      { cat: 'action',s: ['We laugh together at jokes.', 'The funny story makes me laugh.'] },
  cry:        { cat: 'action',s: ['The little baby starts to cry.', 'Do not cry, be brave.'] },
  stop:       { cat: 'action',s: ['Stop at the red light.', 'The bus stops in front of my school.'] },
  wait:       { cat: 'action',s: ['Wait for me at the gate.', 'I wait for the bus.'] },
  help:       { cat: 'action',s: ['Can you help me please?', 'We help each other.'] },
  work:       { cat: 'action',s: ['My parents work hard every day.', 'I work hard at school.'] },
  study:      { cat: 'action',s: ['I study English every evening.', 'She studies very hard for the test.'] },
  learn:      { cat: 'action',s: ['I want to learn English well.', 'We learn new words every day.'] },
  teach:      { cat: 'action',s: ['My aunt teaches in a school.', 'Teachers teach us many things.'] },
  open:       { cat: 'action',s: ['Please open your book.', 'She opens the window.'] },
  close:      { cat: 'action',s: ['Please close the door.', 'I close my book after reading.'] },
  begin:      { cat: 'action',s: ['The lesson begins at nine.', 'We begin with a song.'] },
  finish:     { cat: 'action',s: ['I finish my homework at six.', 'She finished her lunch already.'] },
  climb:      { cat: 'action',s: ['The monkey climbs the tree.', 'I climb up the slide.'] },
  throw:      { cat: 'action',s: ['He throws the ball to me.', 'Do not throw stones.'] },
  catch:      { cat: 'action',s: ['I can catch a ball well.', 'She catches the ball fast.'] },
  kick:       { cat: 'action',s: ['He kicks the football.', 'I can kick a ball very hard.'] },
  ride:       { cat: 'action',s: ['I ride a bike to school.', 'We ride horses on Sunday.'] },
  drive:      { cat: 'action',s: ['My dad drives a taxi.', 'He drives carefully every day.'] },
  fly:        { cat: 'action',s: ['A bird can fly high.', 'We fly to Hong Kong in summer.'] },
  sit:        { cat: 'action',s: ['Please sit down now.', 'I sit next to my friend.'] },
  stand:      { cat: 'action',s: ['Please stand in a line.', 'He stands very straight.'] },
  live:       { cat: 'action',s: ['I live in Hong Kong.', 'They live near the school.'] },
  love:       { cat: 'action',s: ['I love my family very much.', 'She loves reading books.'] },
  like:       { cat: 'action',s: ['I like English lessons.', 'He does not like cold water.'] },
  want:       { cat: 'action',s: ['I want to be a teacher.', 'She wants more time to play.'] },
  need:       { cat: 'action',s: ['I need a new pencil.', 'We need more paper.'] },
  put:        { cat: 'action',s: ['Put your bag on the desk.', 'I put my book in the bag.'] },
  give:       { cat: 'action',s: ['Please give me a pen.', 'She gives me a present.'] },
  take:       { cat: 'action',s: ['I take a bus to school.', 'Take off your shoes here.'] },
  buy:        { cat: 'action',s: ['We buy bread at the market.', 'Mum buys fruit every week.'] },
  wash:       { cat: 'action',s: ['I wash my hands before lunch.', 'She washes the dishes.'] },
  clean:      { cat: 'action',s: ['I clean my desk every day.', 'We clean the classroom after class.'] },
  carry:      { cat: 'action',s: ['I carry my bag to school.', 'He can carry two boxes.'] },
  show:       { cat: 'action',s: ['Show me your new book.', 'The teacher shows us a picture.'] },
  tell:       { cat: 'action',s: ['Tell me the truth please.', 'I tell my mum everything.'] },
  ask:        { cat: 'action',s: ['I ask the teacher a question.', 'She asks me about my day.'] },
  call:       { cat: 'action',s: ['Please call me tonight.', 'Can you call my mother now?'] },
  come:       { cat: 'action',s: ['Please come here for a minute.', 'The bus comes at eight.'] },
  go:         { cat: 'action',s: ['I go to school by bus.', 'We go to the park on Sunday.'] },
  make:       { cat: 'action',s: ['Mum makes a cake for me.', 'I make my bed every morning.'] },
  use:        { cat: 'action',s: ['May I use your pencil?', 'I use a ruler for maths.'] },
  find:       { cat: 'action',s: ['I cannot find my pencil.', 'She finds her bag under the chair.'] },
  lose:       { cat: 'action',s: ['Do not lose your ticket.', 'He loses his pen at school.'] },

  // ═══════════════════════════════════════════════════
  // 形容詞 Adjectives（含多讀音組合，最難的挖空目標）
  // ═══════════════════════════════════════════════════
  happy:      { cat: 'adjective', s: ['I am happy every day.', 'She has a happy smile.'] },
  hungry:     { cat: 'adjective', s: ['I am hungry now.', 'The hungry baby starts to cry.'] },
  thirsty:    { cat: 'adjective', s: ['The children are thirsty after running.', 'I am thirsty in summer.'] },
  tired:      { cat: 'adjective', s: ['I am tired after school.', 'My legs feel tired now.'] },
  busy:       { cat: 'adjective', s: ['My mother is busy today.', 'I am busy doing homework.'] },
  pretty:     { cat: 'adjective', s: ['The flower is very pretty.', 'She has a pretty dress.'] },
  quiet:      { cat: 'adjective', s: ['The library is very quiet.', 'Please be quiet in class.'] },
  noisy:      { cat: 'adjective', s: ['The street is noisy at night.', 'The classroom is not noisy today.'] },
  big:        { cat: 'adjective', s: ['The elephant is very big.', 'They live in a big house.'] },
  small:      { cat: 'adjective', s: ['A small mouse lives here.', 'I have a small bag.'] },
  tall:       { cat: 'adjective', s: ['The giraffe is very tall.', 'My father is tall and strong.'] },
  short:      { cat: 'adjective', s: ['I have a short pencil.', 'The pencil is too short now.'] },
  long:       { cat: 'adjective', s: ['The snake is very long.', 'The ruler is thirty centimetres long.'] },
  fast:       { cat: 'adjective', s: ['My bike is very fast.', 'The rabbit runs fast.'] },
  slow:       { cat: 'adjective', s: ['The old bus is slow.', 'We walk very slowly.'] },
  strong:     { cat: 'adjective', s: ['The bear is very strong.', 'My brother is strong.'] },
  weak:       { cat: 'adjective', s: ['The small bird is weak.', 'My arm feels weak now.'] },
  clean:      { cat: 'adjective', s: ['The classroom is very clean.', 'I keep my desk clean.'] },
  dirty:      { cat: 'adjective', s: ['My shoes are very dirty.', 'He does not like a dirty room.'] },
  new:        { cat: 'adjective', s: ['I have a new bag.', 'She wears a new dress.'] },
  old:        { cat: 'adjective', s: ['My grandpa is very old.', 'This is an old photo.'] },
  young:      { cat: 'adjective', s: ['My brother is very young.', 'Young people like new ideas.'] },
  hot:        { cat: 'adjective', s: ['The soup is too hot.', 'It is very hot in summer.'] },
  cold:       { cat: 'adjective', s: ['The water is very cold.', 'It gets cold at night.'] },
  warm:       { cat: 'adjective', s: ['The morning is warm and sunny.', 'She keeps her hands warm.'] },
  cool:       { cat: 'adjective', s: ['The evening air is cool.', 'The water is cool and clean.'] },
  bright:     { cat: 'adjective', s: ['The sun is very bright.', 'She has bright eyes.'] },
  dark:       { cat: 'adjective', s: ['It is dark in the room.', 'The night is very dark.'] },
  light:      { cat: 'adjective', s: ['The room is light and clean.', 'The bag is light to carry.'] },
  heavy:      { cat: 'adjective', s: ['My school bag is heavy.', 'The box is too heavy to lift.'] },
  easy:       { cat: 'adjective', s: ['This question is very easy.', 'It is easy to learn English.'] },
  hard:       { cat: 'adjective', s: ['This question is too hard.', 'The desk is made of hard wood.'] },
  soft:       { cat: 'adjective', s: ['The cat has soft fur.', 'My bed is very soft.'] },
  sweet:      { cat: 'adjective', s: ['The cake is very sweet.', 'She has a sweet voice.'] },
  sour:       { cat: 'adjective', s: ['The lemon is very sour.', 'This soup tastes sour.'] },
  salty:      { cat: 'adjective', s: ['The soup is too salty.', 'I do not like salty food.'] },
  funny:      { cat: 'adjective', s: ['The story is very funny.', 'He tells funny jokes.'] },
  scary:      { cat: 'adjective', s: ['That film is a bit scary.', 'The dark room feels scary at night.'] },
  silly:      { cat: 'adjective', s: ['Do not say silly things.', 'We laughed at his silly hat.'] },
  kind:       { cat: 'adjective', s: ['My teacher is very kind.', 'She is kind to everyone.'] },
  friendly:   { cat: 'adjective', s: ['My classmates are friendly.', 'He is friendly to new students.'] },
  brave:      { cat: 'adjective', s: ['The boy is very brave.', 'She is brave when she is scared.'] },
  clever:     { cat: 'adjective', s: ['The fox is clever and quick.', 'My sister is very clever at maths.'] },
  careful:    { cat: 'adjective', s: ['Be careful on the stairs.', 'She is careful with her work.'] },
  lazy:       { cat: 'adjective', s: ['The cat is lazy today.', 'Do not be lazy with homework.'] },
  favourite:  { cat: 'adjective', s: ['Blue is my favourite colour.', 'This is my favourite book.'] },
  beautiful:  { cat: 'adjective', s: ['The sunset is beautiful.', 'She has a beautiful voice.'] },
  different:  { cat: 'adjective', s: ['We have different ideas.', 'Every child is different.'] },
  difficult:  { cat: 'adjective', s: ['This question is quite difficult.', 'Spelling new words is difficult.'] },
  important:  { cat: 'adjective', s: ['Health is very important.', 'It is important to be kind.'] },

  table:      { cat: 'furniture', s: ['The bowl is on the table.', 'Please clean the table after dinner.'] },
  bed:        { cat: 'furniture', s: ['I sleep in my own bed.', 'The cat sleeps under the bed.'] },
  door:       { cat: 'furniture', s: ['Please close the door.', 'The door is open.'] },
  window:     { cat: 'furniture', s: ['I open the window for fresh air.', 'She looks out of the window.'] },
  thin:       { cat: 'adjective', s: ['The book is very thin.', 'He has a thin pencil.'] },
  thick:      { cat: 'adjective', s: ['This book is very thick.', 'She has a thick coat.'] },
  blue:       { cat: 'adjective', s: ['The sky is blue today.', 'I like my blue bag.'] },
  red:        { cat: 'adjective', s: ['The apple is red and sweet.', 'I wear a red jacket today.'] },
  green:      { cat: 'adjective', s: ['The leaves are green in spring.', 'My bag is light green.'] },
  yellow:     { cat: 'adjective', s: ['The sun is yellow and bright.', 'She has a yellow pencil.'] },
  white:      { cat: 'adjective', s: ['The rabbit is white and soft.', 'My shirt is white today.'] },
  black:      { cat: 'adjective', s: ['My cat is black and white.', 'The night sky is black.'] },
  brown:      { cat: 'adjective', s: ['The bear is brown and big.', 'She has brown hair.'] },
  pink:       { cat: 'adjective', s: ['The pig is pink and fat.', 'She likes her pink bag.'] },
  purple:     { cat: 'adjective', s: ['I have a purple pencil box.', 'The flower is purple.'] },
  grey:       { cat: 'adjective', s: ['The sky is grey today.', 'My cat is grey and small.'] },

  // ═══════════════════════════════════════════════════
  // 身體與外觀 Body & Appearance
  // ═══════════════════════════════════════════════════
  hand:       { cat: 'body',  s: ['Wash your hands before eating.', 'She raised her hand.'] },
  head:       { cat: 'body',  s: ['The lion has a big head.', 'Put the hat on your head.'] },
  hair:       { cat: 'body',  s: ['She has long black hair.', 'My hair is short now.'] },
  eye:        { cat: 'body',  s: ['Close your eyes and rest.', 'She has bright eyes.'] },
  ear:        { cat: 'body',  s: ['Rabbits have long ears.', 'I can hear with my ears.'] },
  nose:       { cat: 'body',  s: ['The elephant has a long nose.', 'My nose is cold in winter.'] },
  mouth:      { cat: 'body',  s: ['Open your mouth and say ah.', 'Her mouth is very small.'] },
  foot:       { cat: 'body',  s: ['My foot hurts a little.', 'I wash my feet before bed.'] },
  leg:        { cat: 'body',  s: ['My leg feels tired now.', 'A bird stands on one leg.'] },
  arm:        { cat: 'body',  s: ['She holds the baby in her arms.', 'My arm is very strong.'] },
  finger:     { cat: 'body',  s: ['Point with your index finger.', 'The baby has ten small fingers.'] },
  tooth:      { cat: 'body',  s: ['Brush your teeth every morning.', 'My tooth hurts a little.'] },
  face:       { cat: 'body',  s: ['Wash your face with warm water.', 'He has a round face.'] },
  skin:       { cat: 'body',  s: ['The frog has smooth skin.', 'My skin feels dry in winter.'] },
  tail:       { cat: 'body',  s: ['The dog wags its tail.', 'A monkey has a long tail.'] },
  wing:       { cat: 'body',  s: ['The butterfly has pretty wings.', 'A bird can move its wings.'] },
  knee:       { cat: 'body',  s: ['My knee hurts after running.', 'He fell and hurt his knee.'] },
  shoulder:   { cat: 'body',  s: ['I carry my bag on one shoulder.', 'She touches my shoulder gently.'] },

  // ═══════════════════════════════════════════════════
  // 衣物 Clothing
  // ═══════════════════════════════════════════════════
  shirt:      { cat: 'clothing', s: ['My shirt is white and clean.', 'He wears a blue shirt today.'] },
  dress:      { cat: 'clothing', s: ['She wears a pretty red dress.', 'My dress is very comfortable.'] },
  skirt:      { cat: 'clothing', s: ['She has a blue school skirt.', 'The skirt is short and simple.'] },
  trousers:   { cat: 'clothing', s: ['I wear black trousers to school.', 'His trousers are too long.'] },
  shoes:      { cat: 'clothing', s: ['My new shoes are very comfortable.', 'Please clean your shoes.'] },
  socks:      { cat: 'clothing', s: ['I wear long socks in winter.', 'These socks are very warm.'] },
  hat:        { cat: 'clothing', s: ['Put on your hat before you go out.', 'She wears a straw hat.'] },
  coat:       { cat: 'clothing', s: ['I wear a coat in winter.', 'My coat is warm and long.'] },
  jacket:     { cat: 'clothing', s: ['The jacket is too big for me.', 'He takes off his jacket.'] },
  scarf:      { cat: 'clothing', s: ['She wears a red scarf in winter.', 'The scarf keeps my neck warm.'] },
  gloves:     { cat: 'clothing', s: ['Put on your gloves in the cold.', 'My gloves are made of wool.'] },
  glasses:    { cat: 'clothing', s: ['He wears glasses when he reads.', 'These glasses are new.'] },
  watch:      { cat: 'clothing', s: ['My watch says it is four o clock.', 'She wears a silver watch.'] },
  umbrella:   { cat: 'clothing', s: ['Take an umbrella with you today.', 'I open my umbrella in the rain.'] },

  // ═══════════════════════════════════════════════════
  // 交通工具 Transport
  // ═══════════════════════════════════════════════════
  bus:        { cat: 'transport', s: ['I go to school by bus.', 'The bus stops in front of my school.'] },
  car:        { cat: 'transport', s: ['My family has a small car.', 'The car is very fast on the road.'] },
  taxi:       { cat: 'transport', s: ['We take a taxi to the airport.', 'My dad drives a taxi.'] },
  train:      { cat: 'transport', s: ['The train leaves at three o clock.', 'I ride a train to the city.'] },
  plane:      { cat: 'transport', s: ['The plane flies very high.', 'We go to Japan by plane.'] },
  bike:       { cat: 'transport', s: ['I ride my bike to the park.', 'Her bike is red and small.'] },
  boat:       { cat: 'transport', s: ['The small boat is on the lake.', 'We go fishing by boat.'] },
  ship:       { cat: 'transport', s: ['The big ship is at the harbour.', 'A ship can travel very far.'] },
  subway:     { cat: 'transport', s: ['I take the subway to school.', 'The subway is very fast.'] },
  traffic:    { cat: 'transport', s: ['There is heavy traffic at eight o clock.', 'The traffic moves slowly today.'] },
  road:       { cat: 'transport', s: ['The road is closed today.', 'We walk on the side of the road.'] },
  bridge:     { cat: 'transport', s: ['There is a long bridge over the river.', 'We cross the bridge by bus.'] },
  station:    { cat: 'transport', s: ['The station is very busy.', 'I meet my mum at the station.'] },
  ticket:     { cat: 'transport', s: ['Please show your ticket.', 'I buy a ticket before I travel.'] },

  // ═══════════════════════════════════════════════════
  // 大自然 Nature
  // ═══════════════════════════════════════════════════
  sun:        { cat: 'nature', s: ['The sun is very bright today.', 'Plants need sun and water.'] },
  moon:       { cat: 'nature', s: ['The moon is bright tonight.', 'The moon comes out at night.'] },
  star:       { cat: 'nature', s: ['I can see many stars tonight.', 'One star is very bright.'] },
  sky:        { cat: 'nature', s: ['The sky is clear and blue.', 'Birds fly in the sky.'] },
  tree:       { cat: 'nature', s: ['The tree has many green leaves.', 'A bird sits on the tree.'] },
  flower:     { cat: 'nature', s: ['The flower is very pretty.', 'She picks a yellow flower.'] },
  grass:      { cat: 'nature', s: ['The grass is green after rain.', 'We sit on the grass.'] },
  leaf:       { cat: 'nature', s: ['A leaf falls from the tree.', 'The leaves turn yellow in autumn.'] },
  rain:       { cat: 'nature', s: ['The rain stops at last.', 'I take an umbrella in the rain.'] },
  snow:       { cat: 'nature', s: ['The snow is white and cold.', 'We play in the snow.'] },
  wind:       { cat: 'nature', s: ['The wind blows very strong today.', 'The wind closes the door.'] },
  cloud:      { cat: 'nature', s: ['The cloud looks like a sheep.', 'There is a cloud in the sky.'] },
  river:      { cat: 'nature', s: ['The river is very long.', 'Fish swim in the river.'] },
  mountain:   { cat: 'nature', s: ['The mountain is very high.', 'We climb the mountain on Sunday.'] },
  sea:        { cat: 'nature', s: ['The sea is blue and wide.', 'We swim in the sea in summer.'] },
  island:     { cat: 'nature', s: ['The island is small and quiet.', 'We visit the island by boat.'] },
  beach:      { cat: 'nature', s: ['We play on the beach.', 'The beach is very sandy.'] },
  sand:       { cat: 'nature', s: ['The sand is warm and soft.', 'We build a castle in the sand.'] },
  stone:      { cat: 'nature', s: ['This stone is very hard.', 'The wall is made of stones.'] },
  field:      { cat: 'nature', s: ['The cows are in the field.', 'The green field looks wide.'] },
  garden:     { cat: 'nature', s: ['There are many flowers in the garden.', 'We grow vegetables in the garden.'] },
  park:       { cat: 'nature', s: ['I run in the park every day.', 'The park is green and quiet.'] },
  forest:     { cat: 'nature', s: ['The forest is very dark inside.', 'Many animals live in the forest.'] },
  earth:      { cat: 'nature', s: ['We live on the earth.', 'We must protect the earth.'] },
  planet:     { cat: 'nature', s: ['Earth is our planet.', 'There are eight planets.'] },

  // ═══════════════════════════════════════════════════
  // 天氣 Weather
  // ═══════════════════════════════════════════════════
  sunny:      { cat: 'weather', s: ['It is sunny today.', 'We go to the beach on a sunny day.'] },
  rainy:      { cat: 'weather', s: ['It is rainy this morning.', 'A rainy day makes me sleepy.'] },
  cloudy:     { cat: 'weather', s: ['It is cloudy but warm.', 'The cloudy sky looks grey.'] },
  windy:      { cat: 'weather', s: ['It is windy near the sea.', 'The windy weather is cold.'] },
  snowy:      { cat: 'weather', s: ['It is snowy in winter.', 'A snowy day is very cold.'] },
  foggy:      { cat: 'weather', s: ['It is foggy this morning.', 'The foggy road is not clear.'] },
  stormy:     { cat: 'weather', s: ['The stormy night is noisy.', 'A stormy day keeps us at home.'] },
  rainbow:    { cat: 'weather', s: ['A rainbow appears after the rain.', 'The rainbow has seven colours.'] },
  thunder:    { cat: 'weather', s: ['The thunder is very loud tonight.', 'I hear thunder and lightning.'] },

  // ═══════════════════════════════════════════════════
  // 時間與數字 Time & Numbers
  // ═══════════════════════════════════════════════════
  morning:    { cat: 'time', s: ['I get up early in the morning.', 'The morning air is fresh.'] },
  afternoon:  { cat: 'time', s: ['We have sports in the afternoon.', 'It is warm in the afternoon.'] },
  evening:    { cat: 'time', s: ['We watch TV in the evening.', 'I read a book every evening.'] },
  night:      { cat: 'time', s: ['The night is quiet and dark.', 'Good night, sleep well.'] },
  today:      { cat: 'time', s: ['Today is my birthday.', 'I feel happy today.'] },
  tomorrow:   { cat: 'time', s: ['Tomorrow we go on a trip.', 'I feel nervous about tomorrow.'] },
  yesterday:  { cat: 'time', s: ['Yesterday was my birthday.', 'I played with friends yesterday.'] },
  Monday:     { cat: 'time', s: ['We have English on Monday.', 'Monday is the first day of a week.'] },
  Tuesday:    { cat: 'time', s: ['I have maths on Tuesday.', 'Tuesday is a busy day for me.'] },
  Wednesday:  { cat: 'time', s: ['We have music on Wednesday.', 'Wednesday is in the middle of the week.'] },
  Thursday:   { cat: 'time', s: ['I have PE on Thursday.', 'Thursday is almost Friday.'] },
  Friday:     { cat: 'time', s: ['Friday is my favourite day.', 'We are happy on Friday.'] },
  Saturday:   { cat: 'time', s: ['We go to the park on Saturday.', 'Saturday is a free day.'] },
  Sunday:     { cat: 'time', s: ['My family eats out on Sunday.', 'Sunday is a rest day.'] },
  week:       { cat: 'time', s: ['There are seven days in a week.', 'Next week we have a holiday.'] },
  month:      { cat: 'time', s: ['There are twelve months in a year.', 'My birthday is in this month.'] },
  year:       { cat: 'time', s: ['A new year starts in January.', 'I am nine years old this year.'] },
  hour:       { cat: 'time', s: ['The lesson lasts an hour.', 'I wait for an hour at the station.'] },
  minute:     { cat: 'time', s: ['Wait a minute please.', 'The minute hand is short.'] },
  clock:      { cat: 'time', s: ['The clock says half past three.', 'I look at the wall clock.'] },
  birthday:   { cat: 'time', s: ['Today is my birthday.', 'We eat cake on my birthday.'] },
  holiday:    { cat: 'time', s: ['We have a holiday in summer.', 'The summer holiday starts in July.'] },
  Christmas:  { cat: 'time', s: ['We get presents at Christmas.', 'Christmas is in December.'] },
  time:       { cat: 'time', s: ['What time is it now?', 'I do not have much time.'] },
  one:        { cat: 'number', s: ['I have one brother.', 'Put one apple on the plate.'] },
  two:        { cat: 'number', s: ['I have two sisters.', 'Two books are on the desk.'] },
  three:      { cat: 'number', s: ['There are three books here.', 'I am in Class Three.'] },
  four:       { cat: 'number', s: ['A cat has four legs.', 'I have four pencils.'] },
  five:       { cat: 'number', s: ['A hand has five fingers.', 'I get up at five.'] },
  six:        { cat: 'number', s: ['There are six eggs in the box.', 'We leave at six o clock.'] },
  seven:      { cat: 'number', s: ['There are seven days in a week.', 'I read seven pages tonight.'] },
  eight:      { cat: 'number', s: ['I get up at eight every morning.', 'There are eight planets.'] },
  nine:       { cat: 'number', s: ['I am nine years old.', 'Nine children are in the room.'] },
  ten:        { cat: 'number', s: ['I can count to ten in English.', 'We have ten fingers altogether.'] },
  eleven:     { cat: 'number', s: ['My brother is eleven years old.', 'The game starts at eleven.'] },
  twelve:     { cat: 'number', s: ['There are twelve months in a year.', 'Twelve students are in my group.'] },
  twenty:     { cat: 'number', s: ['I count twenty birds in the tree.', 'It is twenty degrees today.'] },
  first:      { cat: 'number', s: ['I am first in my class.', 'This is my first day at school.'] },
  second:     { cat: 'number', s: ['Wait a second please.', 'He came second in the race.'] },

  // ═══════════════════════════════════════════════════
  // 地點 Places
  // ═══════════════════════════════════════════════════
  'hong kong':{ cat: 'place', s: ['I live in Hong Kong.', 'Hong Kong is a very busy city.'] },
  China:      { cat: 'place', s: ['I am from Hong Kong, China.', 'China has many beautiful cities.'] },
  city:       { cat: 'place', s: ['Hong Kong is a busy city.', 'The city is bright at night.'] },
  village:    { cat: 'place', s: ['My grandma lives in a small village.', 'The village is quiet and green.'] },
  town:       { cat: 'place', s: ['We shop in the town centre.', 'The town is small and clean.'] },
  shop:       { cat: 'place', s: ['Mum goes to the shop after work.', 'This shop sells bread and milk.'] },
  market:     { cat: 'place', s: ['We buy fruit at the market.', 'The market is busy on Sunday.'] },
  hospital:   { cat: 'place', s: ['The hospital is near my home.', 'Nurses work in the hospital.'] },
  cinema:     { cat: 'place', s: ['We watch a film at the cinema.', 'The cinema is very big.'] },
  restaurant: { cat: 'place', s: ['We eat dinner at a restaurant.', 'The restaurant is on the second floor.'] },
  farm:       { cat: 'place', s: ['My uncle works on a farm.', 'There are many cows on the farm.'] },
  zoo:        { cat: 'place', s: ['We visit the zoo on Sunday.', 'I like the pandas at the zoo.'] },
  church:     { cat: 'place', s: ['There is an old church in my town.', 'The church bell rings at noon.'] },
  centre:     { cat: 'place', s: ['The shopping centre is very big.', 'We meet at the town centre.'] },
  building:   { cat: 'place', s: ['That is a tall building.', 'The building has many windows.'] },

  // ═══════════════════════════════════════════════════
  // 玩具與遊戲 Toys & Play
  // ═══════════════════════════════════════════════════
  ball:       { cat: 'toy',  s: ['We play with a ball in the park.', 'The ball is red and small.'] },
  doll:       { cat: 'toy',  s: ['My little sister has a doll.', 'The doll has a pretty dress.'] },
  kite:       { cat: 'toy',  s: ['My kite flies very high.', 'We fly a kite in the park.'] },
  balloon:    { cat: 'toy',  s: ['The red balloon floats away.', 'I hold the balloon string.'] },
  robot:      { cat: 'toy',  s: ['My robot toy can walk and talk.', 'I put the robot on the desk.'] },
  puzzle:     { cat: 'toy',  s: ['This jigsaw puzzle is difficult.', 'We do the puzzle together.'] },
  drum:       { cat: 'toy',  s: ['He can play the drum very well.', 'We make a drum sound.'] },
  piano:      { cat: 'toy',  s: ['She plays the piano beautifully.', 'I practise the piano after school.'] },
  guitar:     { cat: 'toy',  s: ['My uncle plays the guitar.', 'The guitar has six strings.'] },
  camera:     { cat: 'toy',  s: ['I take photos with my camera.', 'The camera is small and light.'] },
  computer:   { cat: 'toy',  s: ['I do my homework on the computer.', 'The computer is on my desk.'] },
  game:       { cat: 'toy',  s: ['We play a game after school.', 'This game is very interesting.'] },
  bicycle:    { cat: 'toy',  s: ['My bicycle is red and new.', 'I ride my bicycle to school.'] },
  skipping:   { cat: 'toy',  s: ['We play skipping rope at recess.', 'I can skip one hundred times.'] },
  chess:      { cat: 'toy',  s: ['We play chess in the park.', 'My brother wins at chess.'] },

  // ═══════════════════════════════════════════════════
  // 運動 Sport
  // ═══════════════════════════════════════════════════
  football:   { cat: 'sport', s: ['We play football on the playground.', 'He is a good football player.'] },
  basketball: { cat: 'sport', s: ['She plays basketball very well.', 'The basketball match starts at four.'] },
  swimming:   { cat: 'sport', s: ['Swimming is good exercise.', 'I go swimming every Sunday.'] },
  running:    { cat: 'sport', s: ['Running is good for your health.', 'She wins the running race.'] },
  badminton:  { cat: 'sport', s: ['We play badminton after school.', 'Badminton is easy to learn.'] },
  tennis:     { cat: 'sport', s: ['My dad plays tennis on Saturday.', 'The tennis ball bounces high.'] },
  ping_pong:  { cat: 'sport', s: ['We play ping pong at recess.', 'He is our ping pong champion.'] },
  cycling:    { cat: 'sport', s: ['Cycling is good exercise.', 'I go cycling with my dad.'] },
  exercise:   { cat: 'sport', s: ['I do exercise every morning.', 'Exercise makes me strong.'] },
  gym:        { cat: 'sport', s: ['My mum goes to the gym after work.', 'The gym is near my home.'] },
  team:       { cat: 'sport', s: ['Our team is very strong.', 'I play on my school team.'] },
  race:       { cat: 'sport', s: ['The race starts at nine.', 'I won second place in the race.'] },
  skate:      { cat: 'sport', s: ['The children skate on the ice.', 'Skating looks very cool.'] },

  // ═══════════════════════════════════════════════════
  // 科技與日常 Technology & Daily Life
  // ═══════════════════════════════════════════════════
  phone:      { cat: 'tech', s: ['I use my phone to call Mum.', 'My phone has a clear screen.'] },
  television: { cat: 'tech', s: ['We watch television after dinner.', 'The television is very large.'] },
  internet:   { cat: 'tech', s: ['We search for information on the internet.', 'The internet helps me learn English.'] },
  email:      { cat: 'tech', s: ['I send an email to my cousin.', 'Please reply to my email.'] },
  screen:     { cat: 'tech', s: ['Do not look at the screen too long.', 'The screen is very bright.'] },
  button:     { cat: 'tech', s: ['Press the green button.', 'The button is broken.'] },
  money:      { cat: 'tech', s: ['Mum gives me some pocket money.', 'I save my money in a box.'] },
  letter:     { cat: 'tech', s: ['I write a letter to my pen friend.', 'The letter arrives this morning.'] },
  present:    { cat: 'tech', s: ['I get a present on my birthday.', 'She gives me a nice present.'] },
  card:       { cat: 'tech', s: ['I make a card for Mum.', 'The card has a flower on it.'] },
  photo:      { cat: 'tech', s: ['I take a photo of the class.', 'This photo is from last year.'] },

  // ═══════════════════════════════════════════════════
  // 其他常用詞 Extra high-frequency words
  // ═══════════════════════════════════════════════════
  and:        { cat: 'extra', s: ['I like apples and bananas.', 'My mum and dad work hard.'] },
  but:        { cat: 'extra', s: ['It is small but very useful.', 'I want to go but I am busy.'] },
  because:    { cat: 'extra', s: ['I am happy because it is Friday.', 'We stayed inside because of the rain.'] },
  together:   { cat: 'extra', s: ['We play together after school.', 'The family eats dinner together.'] },
  always:     { cat: 'extra', s: ['He always helps his classmates.', 'She is always early.'] },
  never:      { cat: 'extra', s: ['I never give up.', 'He never forgets his homework.'] },
  often:      { cat: 'extra', s: ['We often visit Grandma.', 'I often read English stories.'] },
  sometimes:  { cat: 'extra', s: ['Sometimes we eat out.', 'I sometimes walk to school.'] },
  every:      { cat: 'extra', s: ['I brush my teeth every morning.', 'We have English every day.'] },
  another:    { cat: 'extra', s: ['Can I have another apple?', 'She has another chance.'] },
  better:     { cat: 'extra', s: ['I am better at English now.', 'This one is better than that one.'] },
  best:       { cat: 'extra', s: ['This is the best day of the week.', 'She is my best friend.'] },
  good:       { cat: 'extra', s: ['You are a good student.', 'The weather is good today.'] },
  well:       { cat: 'extra', s: ['You sing very well.', 'She does the work well.'] },
  still:      { cat: 'extra', s: ['He is still waiting for the bus.', 'I still remember that day.'] },
  already:    { cat: 'extra', s: ['I have already finished my homework.', 'She has already eaten.'] },
  almost:     { cat: 'extra', s: ['I almost forgot my book.', 'We almost won the game.'] },
  suddenly:   { cat: 'extra', s: ['Suddenly the bell rang.', 'The dog suddenly ran away.'] },
  quickly:    { cat: 'extra', s: ['Eat quickly, the food is hot.', 'She answered the question quickly.'] },
  slowly:     { cat: 'extra', s: ['Please speak more slowly.', 'The old man walks very slowly.'] },
  loudly:     { cat: 'extra', s: ['Do not talk loudly in class.', 'The baby cries loudly at night.'] },
  quietly:    { cat: 'extra', s: ['Please close the door quietly.', 'He enters the room quietly.'] },
  carefully:  { cat: 'extra', s: ['Write your name carefully.', 'She holds the baby carefully.'] },
  really:     { cat: 'extra', s: ['That is really a good idea.', 'I really like this book.'] },
  perhaps:    { cat: 'extra', s: ['Perhaps it will rain later.', 'Perhaps you are right.'] },
  everything: { cat: 'extra', s: ['Everything is ready now.', 'I like everything in this shop.'] },
  everyone:   { cat: 'extra', s: ['Everyone is very kind.', 'Everyone knows this song.'] },
};

/**
 * 查表：取得某詞的例句
 * @param {string} word 小寫單詞
 * @returns {string[]} 例句陣列（找不到回傳空陣列）
 */
export function sentencesFor(word) {
  return SENTENCE_BANK[String(word).toLowerCase()]?.s ?? [];
}

/** 取得某詞的分類（food / animal / school ...） */
export function categoryFor(word) {
  return SENTENCE_BANK[String(word).toLowerCase()]?.cat ?? null;
}

/** 詞庫總清單 */
export const BANK_WORDS = Object.keys(SENTENCE_BANK);

/**
 * 找出「尚未有例句」的詞。
 * 後台批次生成（方案 C）時對這批詞呼叫 AI。
 */
export function wordsNeedingSentences(wordList) {
  return wordList
    .map(w => String(w).toLowerCase().trim())
    .filter(w => w && !sentencesFor(w).length);
}

/** 依分類統計詞庫分佈（研究分析用） */
export function categoryCounts() {
  const out = {};
  for (const [w, v] of Object.entries(SENTENCE_BANK)) {
    out[v.cat] = (out[v.cat] || 0) + 1;
  }
  return out;
}