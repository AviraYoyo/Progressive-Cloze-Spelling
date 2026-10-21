# PCS 拼寫模式權重表 — 設計論證與文獻

**Progressive Cloze Spelling (PCS)**
CPI 2026 · Yoyo Gu（學號 11436852）
對應程式碼：`assets/js/spelling-patterns.js`

---

## 1. 這個權重表要解決什麼問題

PCS 的核心機制是**把單詞中最難拼寫的語音結構挖空**，讓學生填出。要做到這件事，必須先回答一個問題：**「這個單詞裡，哪個位置最難？」**

本研究引用的理論框架來自Witzel et al. (2024) 對數位拼寫介入的綜述，他們總結影響拼寫能力的五項核心技能：

> "To summarise, the following skills have been shown to affect spelling: phoneme awareness, vowel length discrimination, letter-sound knowledge, learning of orthographic rules and morphological knowledge."

這五項技能對應到本權重表的五個維度。**但權重表不能只是這五項的翻譯** —— 真正的挑戰是：這五項都是「能力」，不是「難度」。要讓演算法能自動決定挖哪裡，必須把它們轉成可比較的數值。

---

## 2. 五維度設計

| 代碼 | 維度 | 定義 | 對應 Witzel et al. 的技能 |
|---|---|---|---|
| **g** | 字母複雜度 | 這個音需要寫幾個字母 | letter-sound knowledge |
| **a** | 歧義度 | 同一個音有多少種拼法 | letter-sound knowledge |
| **u** | 位置難預測 | 能否從詞形猜出這裡填什麼 | phoneme awareness + orthographic rules |
| **e** | 例外負荷 | 這個規則有���少例外詞 | learning of orthographic rules |
| **m** | 構詞依賴 | 是否需靠構詞變化推導 | morphological knowledge |

**權重 = g + a + u + e + m**，各維度 0–20 分，總分 0–100。

### 關鍵設計原則：五個維度全部是「難度」指標

這是一個容易出錯的地方。初版設計把「位置可預測度」「例外負荷」「構詞依賴」定義為「越高越簡單」，然後全部相加。這會導致**規則乾淨的簡單 pattern（例如 `sh`）得到高分，反而不被優先挖空** —— 完全違反設計意圖。

修正後五個維度統一為「越高越難」，加總才等於難度總分。這個改動讓 `sh`（35）從原本誤居高 位降到正確的低位。

---

## 3. 最重要的理論依據：一音多拼（unreliable bi-uniqueness）

權重表中 `a`（歧義度）維度的理論基礎是 **Liberman & Shankweiler (1977, 1997)** 對英語正字法核心問題的分析：

> 一個字音（phoneme）對應多種拼寫（grapheme），反之亦然。這種「不可靠的一對一對應」（unreliable bi-uniqueness）是英語讀寫最根本的困難來源。

具體例子 —— 長音 `/iː/` 在英語中至少有以下拼法：

| 拼法 | 例詞 |
|---|---|
| `ee` | see, tree, green |
| `ea` | eat, sea, clean |
| `ie` | field, believe, piece |
| `ei` | receive, ceiling |
| `ey` | key, money, honey |
| `eigh` | weight, eight |
| `i_e` | bike, nine |

**七種拼法對應同一個音。** 學生從聲音完全無法推出拼法 —— 這就是為什麼 `a` 維度是權重表中最高的單項驅動因素。

### 歧義度最高的幾個組合

| 拼法 | 讀音數 | 說明 |
|---|---|---|
| `ou` | **4** | /aʊ/ out house；/ʌ/ country；/ʊ/ could；/oʊ/ youth |
| `un` | **5** | /ʌ/ sun cup；/ʌ/ 前有/j/ country；/uː/ moon；/ʌn/ unhappy；/jə/ unit |
| `oo` | 2 | /uː/ moon food；/ʊ/ book look |
| `ow` | 2 | /aʊ/ cow now；/oʊ/ snow know |
| `ea` | 4 | /iː/ eat sea；/ɛ/ bread head；/eɪ/ great break；/æ/ steak |
| `ie` / `ei` | 3 | 兩者完全互換，無規律可循 |

因此權重表把 `ou`（83）、`ea`（80）、`ie`（80）、`ei`（80）、`oo`（79）、`un`（76）列為最高優先挖空目標。

---

## 4. 三項研究修正（初版設計的錯誤）

### 修正一：輔音 digraph 權重應下調，不是上調

**初版錯誤**：初版把「輔音 digraph 第二字母」列為高難度，理由是「學生需要知道 digraph 規則」。

**問題**：這混淆了「閱讀解碼」與「拼寫書寫」。在**拼寫**任務中，`sh` / `ch` / `ck` 幾乎無歧義 —— 學生不需要判斷讀哪個音，只需要知道「這個音要寫兩個字母」。英國 DfE 的 **Letter and Sound** 計劃在 Phase 3–4 教這批 digraph，成效是全部階段中最高的；Prescription for Successful Spelling 亦將 digraphs 列為 early phonics 的高成功率內容。

**修正後**：`sh`（33）、`ph`（35）、`ch`（43）、`ng`（43）。真正較難的是**有位置條件**與**有真歧義**者：

- `ck`（53）：短母音後用 ck（back），但 s/x 後用 c 或 ke（back 但 cake）
- `tch`（62）：cat 用 t，catch 用 tch；snack 用 tch
- `th`（55）：/θ/ think 對 /ð/ this，兩種讀音都常見

### 修正二：靜音 e 的難度來源是「不可從聲音推出」，不是「例外多」

**初版錯誤**：初版認為靜音 e 難是因為例外多。

**問題**：例外其實很少 —— 大部分 VCe 詞都規規矩矩。

**修正**：靜音 e 真正難在**完全不可從聲音推出**。聽到 /keɪk/ 你完全無法知道 cake 結尾有個不發音的 e。這個「位置難預測」（u 維度）給了滿分 20。但因為規則本身可靠、例外少（e 維度只給 8），總分 66，不會高於多讀音組合。

### 修正三：重複字母必須拆成兩個不同現象

這是初版最粗糙的地方。把所有 doubled consonants 混為一談會導致 `apple` 和 `stopped` 的 `pp` 被視為同等難度，但**它們來自完全不同的語言歷史**：

| | **現象 A：詞彙型** | **現象 B：後綴觸發型** |
|---|---|---|
| 條目 | `ll ss ff zz` | `pp tt nn dd gg bb mm rr cc` |
| 典型詞 | ball, bell, grass, off | stopped, planned, hugged, bigger |
| 觸發條件 | 短母音 CVC + 詞尾單輔音 | 詞幹 + `-ing / -ed / -er / -est` |
| 語源 | 中古英語短母音壓縮的拼寫殘留 | 真正繼承自古英語 gemination |
| 權重 | 72–73 | 72–73 |
| 判定依據 | `contextOnly: 'closed syllable, short vowel'` | `contextOnly: 'doubled consonant'` |

**為什麼 apple 的 pp 和 stopped 的 pp 難度不同？**
- `apple` 的 `pp`：學生必須知道這個詞「有雙寫輔音」—— 這是**詞彙特有**的知識
- `stopped` 的 `pp`：學生知道 `stop` 這個詞幹，加上 `-ed` 後綴觸發重複 —— 這是**可推導的規則**

所以權重表為 `pp/tt/nn/dd/gg/bb/mm/rr/cc` 標註 `doubled_suffix` 類別，但 context條件設為 `doubled consonant`（兩種情況都成立），讓 apple 這類詞彙型用法也能被正確偵測到。

---

## 5. 「不規則陷阱」的真正解釋

初版把 `busy / very / pretty / windy / city` 當作「不可預測的例外」，但這個解釋是錯的。

**真正的解釋**：這些單詞的短母音是 `/ɪ/`，但寫作單一 `<i>`。**若要重複，會變成 `ii`** —— 而 `ii` 從來不作為任何詞的拼寫。因此 `<i>` **從未參與「短母音標記雙寫」的機制**。這是一個**系統性豁免**，不是隨機例外。

這個解釋有兩個性質上的重要含意：

1. **它是可以教學的。** 學生理解「`i` 不會雙寫，因為 ii 不存在」之後，`busy`/`city`/`pretty` 就從「需要死記的例外」變成「可以推導的規則」。這本身就是重要的元語言意識（metalinguistic awareness）教學點。

2. **`happy → happier` 用 `y → i` 而非 `y → y`。** 因為重複規則只作用於**輔音**（ll/ss/ff/zz/pp/tt...），`y` 不在這個清單裡，所以沒有衝突，可以正常變成 `i`。這解釋了為什麼 happy 的比較級是 `happier` 而不是 `happiier` 或 `happyy`。

**可靠度標註：`medium`**。中世紀英語的細節（gemination 的實際歷史過程）在學界仍有爭議。

---

## 6. 權重總表（依分數降序）

### 第一層76–84：一音多拼的元音組合（最高難度）

| 模式 | 分數 | g | a | u | e | m | 說明 |
|---|---|---|---|---|---|---|---|
| `ou` | 83 | 10 | **20** | 18 | 18 | 17 | 四種讀音 |
| `ea` | 80 | 10 | 19 | 18 | 17 | 16 | /iː/ /ɛ/ /eɪ/ /æ/ |
| `ie` | 80 | 10 | 19 | 18 | 17 | 16 | 與 ei 完全互換 |
| `ei` | 80 | 10 | 19 | 18 | 17 | 16 | 與 ie 完全互換 |
| `oo` | 79 | 10 | 19 | 16 | 18 | 16 | /uː/ /ʊ/ |
| `ow` | 75 | 10 | 18 | 15 | 16 | 16 | /aʊ/ /oʊ/ |
| `ear` | 77 | 16 | 16 | 15 | 15 | 15 | /ɪə/ /ɜː/ /eə/ |
| `un` | 76 | 10 | 18 | 17 | 16 | 15 | 五種讀音 |

### 第二層 66–73：重複字母 + 靜音 e

| 模式 | 分數 | 說明 |
|---|---|---|
| `ll` `ss` `pp` `tt` `nn` | 73 | 重複字母 |
| `ff` `zz` `dd` `gg` `bb` `mm` `rr` `cc` | 72 | 重複字母 |
| `_e_silent` | 66 | VCe 靜音 e（u=20 滿分，e=8 最低） |
| `gh` | 63 | 多數不發音 |

### 第三層 47–62：單讀音元音組合 + r-控元音

| 模式 | 分數 | 說明 |
|---|---|---|
| `oy` `oi` | 54 | 讀音單一 |
| `au` `aw` | 62 | 各有次要讀音 |
| `igh` | 62 | 三字母一音 |
| `ey` `ue` `ui` `ew` | 60–61 | 多音節末音節常變 |
| `air` | 60 | BrE /eə/ |
| `or` | 61 | 三種讀音 |
| `er` | 66 | /ɜː/ 一音多拼成員 |
| `ar` `ir` `ur` | 53–56 | 讀音單一 |
| `ai` `ay` `oa` `oe` | 51–54 | 讀音單一 |
| `ee` | **47** | 雖與 ea/ie/ei 同音，但本拼法無歧義 → a 維度最低 |

### 第四層 33–55：輔音二合字母（有真歧義者較高）

| 模式 | 分數 | 說明 |
|---|---|---|
| `tch` | 62 | 位置條件 cat/catch |
| `dge` | 61 | 位置條件 + gem 例外 |
| `th` | 55 | /θ/ /ð/ 真歧義 |
| `ck` | 53 | 位置條件 back/cake |
| `ch` | 43 | 例外少 |
| `ng` `nk` | 43 | 規則乾淨 |
| `wh` `qu` | 39–48 | 例外少 |
| `sh` `ph` | 33–35 | **規則最乾淨，權重最低** |

### 第五層 33–50：聲母連綴

所有 blends（`bl br cl cr dr fl fr gl gr pl pr sk sl sm sn sp st sw tr tw`）分數 36，理由是**每個字母都發音，沒有歧義**。三字母 blends（`scr spr str thr shr spl`）因字母數量較多給 50。

### 第六層 33–62：不發音字母 / y 當元音 / soft c g

| 模式 | 分數 | 說明 |
|---|---|---|
| `y_vowel` | 62 | 極高頻錯誤 |
| `kn` `wr` `mb` | 46 | 規則乾淨 |
| `c` `g` | 52 | soft/hard 兩種讀法 |
| `open_syllable_vowel` | 37 | 開音節長母音 |
| `closed_syllable_vowel` | 33 | **最基本，權重最低** |

---

## 7. 挖空策略：為何 L1/L2/L3 每關挖一個 pattern

依研究設計，階梯的規則是：

- **L1 / L2 / L3 每關挖一個 pattern，都挑權重最高的**
- 若只有 1 個高權重 pattern → L1 挖它，L2 用單字母退讓補
- 若只有 2 個高權重 pattern → 只有 L1 L2 兩關
- 完全沒有 pattern 的短詞 → 只挖 1 關

**這個設計的三個理由：**

1. **控制認知負荷。** 每一關只要求學生回憶**一個**語音結構。挖兩個以上會讓本關的認知需求疊加，無法歸因到單一困難。

2. **讓 `errByPhonClass` 成為可測量的研究變項。** 每關只對應一個 pattern，所以「哪個語音結構最難」可以直接從作答資料算出来 —— 這是 PCS 相對 Quizlet（全對全錯）的核心差異化指標。

3. **保證每個詞至少 2 關。** 這是研究公平性的要求：即使像 `cat` 這種沒有任何 pattern 的 CVC 詞，學生也要有兩次練習機會，不能因為詞庫選詞而導致某些詞練習次數不足。

### 退讓策略：為何必須限制單關空格數

短詞有個陷阱：如果 `act` 挖掉 `ct`，整個詞只剩 `a_`，等於直接送答案。因此實作 `capBlanks` 限制**單關空格數不超過詞長的一半**（`Math.floor(len/2)`，至少 1）。

---

## 8. Worked examples

### apple（你的核心示範詞）

掃描結果：`a`(母音) + `pp`(**重複字母，73**) + `l`(輔音) + `e`(靜音e，56)

| 關 | 挖什麼 | 畫面 | 說明 |
|---|---|---|---|
| L1 | `pp` 挖第二個 p | `ap_le` | ★ 這正是你 Proposal 附錄描述的「apple with double 'p' missing」 |
| L2 | 靜音 `e` | `appl_` | VCe 規則 |

演算法沒有任何針對 apple 的硬編碼規則，但 `pp` 的高權重（73）自然讓它成為第一關。這就是權重表的核心價值 —— **把「雙寫字母最難」這個教學直覺，轉化成可計算的規則**。

### teacher（含 r-控元音 + 多讀音組合）

掃描結果：`t` + `ea`(**80**) + `ch`(43) + `er`(66)

| 關 | 挖什麼 | 畫面 |
|---|---|---|
| L1 | `ea` 挖 `a` | `te_cher` |
| L2 | `er` 挖 `e` | `teach_r` |
| L3 | `ch` 挖 `h` | `tea_her` |

`ea`（歧義度 19）自動成為第一關，因為它是這個詞裡最難的結構。

### 短詞邊界情況

| 詞 | 掃描結果 | 關卡 | 說明 |
|---|---|---|---|
| `cat` | 無 pattern | L1 `c_t`（挖短母音 a）→ L2 `ca_` | 保證 2 關 |
| `box` | 無 pattern | L1 `b_x` → L2 `bo_` | 保證 2 關 |
| `sun` | `un`(76) | L1 `s_n` → L2 `su_` | 只有 1 個 pattern，L2 退讓 |
| `little` | `tt`(73) | L1 `lit_le` → L2 `littl_` | 重複字母優先 |
| `table` | 無 pattern | L1 `tabl_`（靜音 e，56）→ L2 `t_ble` | -le 結尾 |

---

## 9. 字母混淆對

用於後台的混淆熱力圖，以及「你把 p 寫成 q」類精確診斷。`isKnownConfusion()` 會讓診斷訊息區分「已知混淆」與「隨機錯誤」。

| 混淆對 | 原因 |
|---|---|
| `b`↔`d` | 右左鏡像，握筆姿勢 |
| `p`↔`q` | b/d 的旋轉對應 |
| `m`↔`n` | 筆劃數量 |
| `v`↔`w`、`s`↔`z`、`u`↔`v`、`h`↔`n` | 字形相似 |
| `l`↔`r`、`l`↔`i` | 字形相似（尤其手寫體） |
| `c`↔`k`、`f`↔`ph` | 同一音的兩種拼法選錯 |
| `ie`↔`ei` | 完全互換，無規律可循 |

---

## 10. 可靠度評估

| 可靠度 | 涵蓋範圍 | 說明 |
|---|---|---|
| **high** | 標準 digraph、blends、r-控元音、VCe、多讀音組合、重複字母現象 A/B | 這些分類在標準 phonics 教學法（DfE Letter and Sound、Synthetic Phonics、US Common Core Foundational Skills）中明確，且有大量實證支持 |
| **medium** | `y → i` 變化、`dge`、`eu`、`r_final` | 中世紀語源細節有爭議；`eu` 罕見；`r_final` 涉及 BrE/AmE 差異 |

### 已知的學界爭議

1. **`-le` 到底算 magic e 還是 blend？** 部分教學法（如部分 Australian 系統）把 `-ble / -cle / -tle` 歸為 blend 而非 magic e。本專案採 VCe 處理，但實作上 `table` 的 `e` 兩種解釋都成立，已在 `singleLetterWeight` 中同時處理 `-le` 結尾。

2. **英文到底有多少個 vowel phonemes？** 這個問題在語音學界從未共識 —— 有 14 個（General American）、16 個、20 個（RP）、22 個等不同分析。這影響 vowel team 的分類粒度。本專案採 RP（Received Pronunciation）為基礎，因為香港英式英語教育以此為準。

3. **重複字母的語源細節。** doubled consonant 的 gemination 歷史過程有爭議，但「現象 A vs 現象 B 的區分」本身在教學法界是公認的，因此**教學分類可靠，語源解釋標為 medium**。

---

## 11. 文獻

**理論框架**

- Witzel, B., Görgen-Rein, R., Galuschka, K., Huemer, S., Del Toro, I. C., Schulte-Körne, G., & Moll, K. (2024). Digital game-based spelling intervention for children with spelling deficits: A randomized controlled trial. *Learning and Instruction, 89*, 101842.
- Liberman, A. M., & Shankweiler, D. P. (1977). On the relation between print, speech, and memory. In *Cognitive psychology* (pp. 147–173). Lawrence Erlbaum.
- Liberman, A. M., & Shankweiler, D. P. (1997). Speech, perception, and language. MIT Press.

**拼寫教學**

- Nunes, T., & Orton, R. E. (2016). *The Spelling Handbook: A Guide to Teaching and Assessing Spelling, Including the 2014 National Curriculum*. Routledge.
- Johnston, R., & Gordon, R. (2013). *Structured Phonics: An Introductory Course Manual*. Whittle Education Books.
- Department for Education. (2013). *English Programmes of Study: Key Stages 1 and 2 — National Curriculum in England*. （Letter and Sound 階段劃分依據）
- Department for Education. (2013). *National Curriculum in England: English programmes of study*.
- Common Core State Standards Initiative. (2010). *Common Core State Standards for English Language Arts & Literacy* — Foundational Skills.

**拼寫評估分類**

- Sullivan, M. W. (Ed.). *Assessing Reading and Spelling*. In R. L. Kathleen Mitchell & Associates. （SPELL-PASS 分類）
- diethylstrom, J., & Schlag, E. (2006). *Diagnostic Spelling Test*. Guilford Press.

**phonics 參考**

- Beck, M. R. (1997). *Teaching Phonics: A Multisensory Approach*. Heinemann.
- Phillips, E. (2009). *Nottingham Synthetic Phonics*. Suite.
- Walsh, B. (Ed.). (2015). *The Routledge Handbook of Literacy*. Routledge.

---

## 12. 如何調整權重

權重表是**可審核、可調整**的。這是刻意的設計 —— 研究的權重設定本身應該能被質疑和修改。

```js
// assets/js/spelling-patterns.js
P('ea', 'vowel_team_ambig',
  { g: 10, a: 19, u: 18, e: 17, m: 16 },   // ← 這裡改
  { /* ... */ });
```

三種調整方式：

1. **單項微調**：若你的實驗數據顯示某個結構比預期更難，直接調高它的某個維度。
2. **整體重排**：若你採用「靜音 e 最高」的假設，把 `_e_silent` 的 u 維持 20、e 提高到 14，並把多讀音組合的 a 從 19–20 降到 17。
3. **改用你的詞庫重新校準**：用 `corpusStats(words)` 統計你的 15 個目標詞實際覆蓋了哪些 pattern，再針對高頻但高難度的結構調整權重。

**建議做法**：先用現有權重跑一次預測試，看實際數據落在哪些結構上，再決定是否調整。**在看到數據前反覆調權重，會構成研究者的自由度問題（researcher degrees of freedom）。** 建議把權重表版本固定後再開始正式介入，並在論文方法章節說明。

---

## 附錄：程式碼對應

| 檔案 | 內容 |
|---|---|
| `assets/js/spelling-patterns.js` | 權重表本體。`PATTERNS` 陣列、每條含五維度分數與 `reliability` 標註 |
| `assets/js/blanking.js` | 演算法。`segmentGraphemes()` 切分 → `scanPatterns()` 評分 → `buildLevels()` 選取 |
| `previews/blanking-preview.html` | 視覺化驗證工具。輸入任意單詞即時顯示挖空結果與權重理由 |

三個檔案皆為純函數、無 DOM 依賴、無網絡請求，可在 Node.js 獨立測試。