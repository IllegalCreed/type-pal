# TEST-GLM-CONTENT-GUARDS-2 · GLM 作者交付回执（r3 返工版）

2026-09-26，Owner：GLM；生产冻结 `51048353`，分支自含 `ef19ae7e` 的 origin/main 新建
`codex/glm-content-guards-wave2`（worktree `type-pal-glm-content-guards-wave2`）。
r1 候选 `b8e037cb` 被 Codex intake 审查（`docs/testing/guard-leaf-intake-review.md`@`ca96d45a`，origin/main） counter（R1–R4）；
r2 候选 `99113d22` 被 Codex r2 复核（`docs/testing/guard-leaf-r2-review.md`@`7cac1d72`，origin/main） counter（仅 C1/C2）。
本回执对应 C1/C2 窄返工后的最终树；只含三份白名单叶测试 + 一个 typed fixture + 本目录证据，
产品、旧测试、scripts、配置/基线零 diff（含 Codex 反证工具不动）。

## r2 counter（C1/C2）的闭合

- **C1**：`expectAcceptsUnchanged` 七处调用改为比较生产实际消费的同一对象——record 正控、
  exactKeys 合法/未知键、G6 两处 `fullInput()`、body 直入口数组的闭包一律消费第二参数
  （`(value) => production(value)`）或引用同一具名 input；补 `['x']`（record）、`['x']/[null]`（G6）、
  坏 exactKeys 对象的实际输入快照；G1 合法 exactKeys 也走保真比较。
  另将 helper 执行包进 `expect(...).not.toThrow()`：正控意外抛出呈 AssertionError，
  不再让生产原始 Error 直接冒成测试失败。
- **C2**：G3 not 行正控改为同入口合法 `not(turn(op:'>=',value:1))`，坏输入从其 cond 复制仅改 op；
  未知 kind 行补同入口合法正控；G6 参数表每行带同形状 good/bad（不再用通用三 hook 代替单轴对照），
  when 行合法 turn 经同一容器入口执行、坏输入仅改 op。
- 复验（Codex r2 见证工具 `guard-leaf-review-witnesses.mjs`@`7cac1d72`，临时 loader 注入、生产 hash 不变）：
  control 91/91 绿；r1 旧三针（record 改写/cue 改写/路径前缀）保持 detected；
  r2 新三针（exactKeys 改写实际对象、body 数组 splice、嵌套 turn 恒拒）全部从 MISSED 转为 detected，
  失败均为候选自身 AssertionError。原 6 针 oracle（自测 10 例+对照+6 针）重跑全绿
  （once 针目标名随 G6 参数表重构同步为实际 fullName）。

## r1 counter 的闭合

- **R1**：所有拒绝断言改为 `expectExactError`——捕获实际 Error 对完整 message **全等**比较
  （`toThrow(string)` 是子串匹配，审查以 `when.in[1]`→`WRONG.when.in[1]` 证漏）；对象/数组实际输入
  （record 合法对象、G5 cue、合法正控动作数组、G3/G6 容器输入）调用前取 `deepSnapshot` 独立快照、
  调用后比较**同一对象**，原始值直接值断言不做空快照；G5 原 Error 身份保留 catch+toBe。
  审查席三个生产探针（record 改写 `ms=888`、callback 交付后改写 `cue.rows[0].text`、路径前缀污染）
  复验：control 91/91 绿，三探针各自恰好红在其对应新断言（`evidence.json` r1ProbeVerification）。
- **R2**：每个拒绝先跑**同 kind 同形状**合法正控且确实执行。修正：wait/stopMusic 表拆开，各行显式
  同 kind 正控（缺 ms 行不再用 stopMusic 顶替）；G6 when 行补 `value: 1`、从合法 turn 仅改 op；
  多 hook 单轴测试改为中间 hook 先以合法 `wait(0)` 过真实容器，再仅把 `body[0].ms` 改 -1（不再整体换动作）；
  G5 "缺 rows"改为对合法 dialog 真删 `cue.rows`（原输入实为整个 cue 缺席，标题已如实）；
  playSound 拒绝行正控改用同 kind playSound（原误用 playMusic）。G1/G3 各拒绝行补齐本型正控。
- **R3**：`guard-leaf-mutants.mjs` 判据重写为同一 `judge` 函数，实跑验收与自测共用：恰 exit（对照 0/变异 1）、
  **恰一红**、失败记录的**绝对文件**与 Vitest **实际 fullName**（describe+title 空格连接）都等于目标、
  其余 90 项全过且无 skip、逐条 failureMessages 拒混错与非 AssertionError。混错按行首错误构造符判定
  （vitest `not.toThrow` 引号内嵌 `'Error: …'` 是行中引用不构成混错）；timeout 按首行签名判定
  （堆栈行 `runWithTimeout` 不参与）。load 实际命中写运行态见证 `entered.json={id,target绝对路径}` 并逐针断言。
  自测 10 例：五反例（同消息混 TypeError、AssertionError 开头 timeout、目标+无关双红、同短 title 异
  describe 红、他根同后缀文件）+ 有效红 + exit2/null + 零执行 + 对照样本，全部按预期接受/拒绝。
  原六针产品变异保持不变。
- **R4**：`evidence.json` 按最终树重写并过 Biome（r1 的格式 error 不复存在）；回执/卡内作者块按最终
  实际正控、单轴、快照、精确路径、判据与文件检查校准。

## 六组去重 / 新增表

| 组 | 目标 | 去重（既有证据，不复制） | 新增轴（精确 file） | 新增 |
|---|---|---|---|---:|
| G1 | shapes 六函数 | 全部经父入口（`enemy-script.wave2.test.ts` rules.when 表、`author-battle-dialogue-boundary.test.ts` 作者递归、`validate-enemy-crosscalls.test.ts` 三路递归）；六导出此前无任何直测 | `enemy-validation-shapes.leaf.test.ts`：record 原身份（toBe）+ 独立快照内容保真 + falsy/数组/串叶；exactKeys 允许键子集合法 + 未知键精确路径（全等） + 多未知按键序报首个；nonEmptyString trim/空/纯空白/非串 + 原值返回；finite 0/负/小数 + NaN/±Infinity/串；percent 端点 0/100 闭区间 + 越界走 percent 叶、非有限先走 finite 叶；positiveInteger 1/大整数 + 0/负/小数/非数 | 33 |
| G2 | AI 叶 | wave2 11 行表已证 chance 上界(101) / hpBelow 下界(-1) / hpAbove 非有限(Infinity) / anyPlayerHpBelow 多余键 / turn `<`、0.5 / allyCount `==`、-1 / role 首尾空格 / difficulty 空表、空元素。**四 kind 共用同一 percent 调用（`enemy-ai-condition-guard.ts:8–14`），上下界合同已由父入口证毕**——本组百分比行是共享叶的直入口变体，凭独立入口、完整 message 路径与输入保真断言成立，不计作"新证上下界分支" | 同上 file：直入口变体（hpAbove 101、hpBelow 100.5、anyPlayerHpBelow -1、chance -1 + 端点正控）+ 缺 percent 走有限数叶；turn 负整数；allyCount 非整数（与 turn 各自独立检查分支）；role 空串；difficulty 非数组、元素非串（索引路径 `in[1]`）；aloneAlive/firstOfKind 多余键；kind 缺失入口叶 | 11 |
| G3 | AI 组合 | wave2 合法嵌套已证 aloneAlive/firstOfKind/not(chance) | 同上 file：wave2 未覆盖的六类条件（turn/hpAbove/anyPlayerHpBelow/playerInParty/difficulty/not(allyCount)）嵌套 all/any/not 合法；`of: []` 空数组现状可过（容器形状合同，不涉求值）；`of` 非数组拒绝；坏子节点完整 where 路径（`of[1].percent`）+ 同型合法对照 + 快照；not 行同入口合法 `not(turn >=1)` 先过、坏输入从其 cond 复制仅改 op 走 `cond.` 子路径、缺 cond 报对象叶；未知 kind 精确报错（同入口合法正控先过） | 6 |
| G4 | choreography 动作 | G06-06/07 已证 dialog/playSound 正控与未知 kind（default 分支经 giveItem 拒绝，`enemy-script.test.ts`） | `battle-choreography.leaf.test.ts`：playMusic/playSound/fleeBattle/endBattle 三 result 合法正控 + endBattle 未知 result；wait 显式 0/分数 ms、stopMusic 缺席/显式 0 合法 + 同 kind 正控下的负值/缺 ms/Infinity/NaN/多余键；revivePartyAll 0/5/10 + 负/11/7.5/串；increaseHpMp 负 delta/0/三池及缺省 + 非有限 delta/未知池；growth 八字段全负整数合法 + 八字段逐叶非整数精确路径 + 多余字段/非对象 delta；cast effect 错值与 actor trim；playSound trim asset（同 kind 正控） | 28 |
| G5 | dialogue 委派 | `author-battle-dialogue-boundary.test.ts` 13 项已证作者身份矩阵、cue 转发（message 级）与 runtime 分支经 checkAuthorCommands/checkRuntimeCommands | 同上 file：直入口无 callback 走 runtime 分支（合法 cue.rows 通过 + 对合法 dialog 真删 rows 后经 `checkCommands` 生产路径 `a[0]: dialog 缺非空 cue.rows` 拒绝）；选中 callback 收到原 cue 对象（toBe）与精确路径 `a.cue`、正常返回即接受且 cue/输入对独立快照保真；callback 抛出原 Error 身份传播（catch+toBe，强于既有 message 匹配） | 3 |
| G6 | choreography 容器 | 既有经父入口只证 battleStart/turnStart+once 的合法组合（G06-06、`enemy-script.test.ts`） | 同上 file：三 hook 非空正控（at 两值 × once 两态 × when 有无 × body 多动作）+ 完整输入保真；中间 hook 以合法 wait(0) 先过真实容器、仅改 `body[0].ms` 一轴 → 叶错误定位 `[1].body[0].ms` + 其余保真；非数组整体/非对象 hook/未知字段；at 非法与缺席、once 非布尔、when 非法条件、body 非数组与缺席——参数表每行带同形状 good/bad，when 行合法 turn 经同一容器入口执行、坏输入仅改 op；body 直入口（同一数组对象保真） | 10 |

合计 91 行（返工未增删行，只修构造/断言）。每拒绝行：先同型合法正控、只破一轴、完整 message 全等
（G5 另证原 Error 身份）、生产实际消费的对象/数组经 expectAcceptsUnchanged 与独立快照比较（正控意外抛出呈 AssertionError）；原始值输入直接值断言。行数本身不代表新增未命中
生产分支数；共享 percent 叶等父入口已证合同见上表去重列。

## 反控（复用 codex-content-boundaries-mutants 判据形态，判据经 R3 重写）

[工具](guard-leaf-mutants.mjs)：判据自测 10 例 + 1 个 91 项绿对照 + 6 个单点变异；Vite load 内存注入、
不编辑生产源码；load 命中写 `{id, target}` 运行态见证并逐针断言；三生产文件 sha256 每跑不变。
六针各自**恰好只红目标 fullName**（Vitest 实际 fullName = describe + 空格 + title）：

| 针 | 生产注入 | 恰红用例（fullName） |
|---|---|---|
| shapes-trim | `value !== value.trim()` → includes | G1 nonEmptyString 合法串原值返回；内部空格合法（只禁首尾空白） |
| ai-difficulty-index | `in[${index}]` → `in` | G2 离散叶轴 difficulty 非数组与元素非串拒绝（空表/空元素轴 wave2 已证） |
| ai-of-recursion | all/any 子递归置空 | G3 组合容器 坏子节点在完整 where 路径上报告且同输入快照不变（同型合法对照先过） |
| choreo-tenths-bound | `> 10` → `> 11` | G4 动作叶 revivePartyAll tenths 越上界拒绝且输入不变 |
| choreo-cue-path | `${path}.cue` → `path` | G5 dialog 委派 选中 callback 收到原 cue 对象与精确路径，正常返回即接受且 cue 不被改写 |
| choreo-once-gate | once 门 → `if (false)` | G6 容器三层 'once 非布尔'拒绝且完整输入保真（每行同形状good先过同容器） |

明细见 [evidence.json](evidence.json)；最近一次机账 `/var/folders/.../type-pal-guard-leaf-mutants-ERb8yb`。

## 同口径覆盖（作者 tmp 测量，r1 数字未被推翻）

[配置](guard-leaf-coverage.config.mjs)：两侧官方 content fast 的 include/exclude 完全相同
（`testSelection` 校验 args 仍为 `--passWithNoTests`），before 仅额外排除三份新文件；
`CONTENT_GUARDS_LEAF_DIR=/tmp/type-pal-guard-leaf-coverage`。before 76 文件 866 项、after 79 文件 957 项均 exit 0。
不覆盖官方 coverage/fast，不改全仓统计；Codex 本轮未独立重跑，此段不作为验收统计。

| 模块 | 行 | 语句 | 函数 | 分支 |
|---|---|---|---|---|
| enemy-validation-shapes | 15/16→**16/16** | 19/20→**20/20** | 6/6 不变 | 23/24→**24/24** |
| enemy-ai-condition-guard | 35/36→**36/36** | 37/39→**39/39** | 3/3 不变 | 34/36→**36/36** |
| battle-choreography | 44/61→**61/61** | 46/67→**67/67** | 6/6 不变 | 28/54→**54/54** |
| content 全包 | 4691/5183→4711/5183 | 5187/5856→5212/5856 | 787/831 不变 | 4160/5019→4190/5019 |

## 统一门禁（本批范围，最终树实测）

- 官方全 content：`pnpm --filter @type-pal/content run test` → 79 文件 **957/957** exit 0。
- TC：`pnpm --filter @type-pal/content run typecheck` exit 0。
- Biome（本批改动文件：三测试、fixture、本目录五文件**含 evidence.json**）：0 error；
  仅 [guard-leaf-mutants.mjs](guard-leaf-mutants.mjs) 四个 `noTemplateCurlyInString` warning——
  反控针内故意保留的生产源码模板字面量，单列不与 error 混算。全 src 扫描另有
  `runtime-script.ts:146` 既有 `noUnusedVariables` warning，属分支继承、非本批引入，不在此修。
- docs：`pnpm check:docs` exit 0（含本目录与任务卡交付块）。

## 边界与观察

- 未发现产品缺陷，无需缺陷诊断：三守卫行为与当前类型/正式 loader 合同一致。锁绿观察到的现状合同：
  `all/any` 接受空 `of` 数组（仅形状）；`wait.ms` 只要求非负有限（分数 ms 合法）；growth delta 整数符号自由；
  shapes 层 exactKeys 只禁多余键、不要求允许键在场。均按"当前生产实现定义合同"锁绿，不发明更严政策。
- 不启动浏览器（卡面 Visual N/A）；不跑全仓 check/ratchet/strict，统计由 Codex 统一执行。
- 作者自验不替代 Codex 独立验收；不合 main、不标 done。

复跑：

```sh
node docs/testing/glm-content-guards-wave2/guard-leaf-mutants.mjs
CONTENT_GUARDS_LEAF_PHASE=before CONTENT_GUARDS_LEAF_DIR=<tmp> pnpm exec vitest run --config docs/testing/glm-content-guards-wave2/guard-leaf-coverage.config.mjs
CONTENT_GUARDS_LEAF_PHASE=after CONTENT_GUARDS_LEAF_DIR=<tmp> pnpm exec vitest run --config docs/testing/glm-content-guards-wave2/guard-leaf-coverage.config.mjs
```
