# TEST-GLM-CONTENT-GUARDS-2 · GLM 作者交付回执

2026-09-26，Owner：GLM；生产冻结 `51048353`，分支自含 `ef19ae7e` 的 origin/main 新建
`codex/glm-content-guards-wave2`（worktree `type-pal-glm-content-guards-wave2`）。
只新增三份白名单叶测试 + 一个 typed fixture + 本目录证据；产品、旧测试、scripts、基线、配置零 diff。

## 六组去重 / 新增表

| 组 | 目标 | 去重（既有证据，不复制） | 新增轴（精确 file） | 新增 |
|---|---|---|---|---:|
| G1 | shapes 六函数 | 全部经父入口（`enemy-script.wave2.test.ts` rules.when 表、`author-battle-dialogue-boundary.test.ts` 作者递归、`validate-enemy-crosscalls.test.ts` 三路递归）；六导出此前无任何直测 | `enemy-validation-shapes.leaf.test.ts`：record 原身份（toBe）+ falsy/数组/串叶；exactKeys 允许键子集合法 + 未知键精确路径 + 多未知按键序报首个；nonEmptyString trim/空/纯空白/非串 + 原值返回；finite 0/负/小数 + NaN/±Infinity/串；percent 端点 0/100 闭区间 + 越界走 percent 叶、非有限先走 finite 叶；positiveInteger 1/大整数 + 0/负/小数/非数 | 33 |
| G2 | AI 叶 | wave2 11 行表已证 chance 101 / hpBelow −1 / hpAbove Infinity / anyPlayerHpBelow 多余键 / turn `<`、0.5 / allyCount `==`、−1 / role trim / difficulty 空表、空元素 | `enemy-ai-condition-guard.leaf.test.ts`：四 kind 百分比共用叶的另一半界（hpAbove 101、hpBelow 100.5、anyPlayerHpBelow −1、chance −1，端点正控 100/100/0/0）+ 缺 percent 走有限数叶；turn 负整数；allyCount 非整数（与 turn 各自独立检查分支）；role 空串；difficulty 非数组、元素非串（索引路径 `in[1]`）；aloneAlive/firstOfKind 多余键；kind 缺失入口叶 | 11 |
| G3 | AI 组合 | wave2 合法嵌套已证 aloneAlive/firstOfKind/not(chance) | 同上 file：wave2 未覆盖的六类条件（turn/hpAbove/anyPlayerHpBelow/playerInParty/difficulty/not(allyCount)）嵌套 all/any/not 合法；`of: []` 空数组现状可过（容器形状合同，不涉求值）；`of` 非数组拒绝；坏子节点完整 where 路径（`of[1].percent`）+ 快照；not 缺 cond 报对象叶、坏 cond 走 `cond.` 子路径；未知 kind 精确报错 | 6 |
| G4 | choreography 动作 | G06-06/07 已证 dialog/playSound 正控与未知 kind（default 分支经 giveItem 拒绝，`enemy-script.test.ts`） | `battle-choreography.leaf.test.ts`：playMusic/fleeBattle/endBattle 三 result 合法正控 + endBattle 未知 result；wait 显式 0/分数 ms、stopMusic 缺席/显式 0 合法 + 负值/缺 ms/Infinity/NaN/多余键；revivePartyAll 0/5/10 + 负/11/7.5/串；increaseHpMp 负 delta/0/三池及缺省 + 非有限 delta/未知池；growth 八字段全负整数合法 + 八字段逐叶非整数精确路径 + 多余字段/非对象 delta；cast effect 错值与 actor trim；playSound trim asset | 28 |
| G5 | dialogue 委派 | `author-battle-dialogue-boundary.test.ts` 13 项已证作者身份矩阵、cue 转发（message 级）与 runtime 分支经 checkAuthorCommands/checkRuntimeCommands | 同上 file：直入口无 callback 走 runtime 分支（合法 cue.rows 通过 + 缺 rows 经 `checkCommands` 生产路径 `a[0]: dialog 缺非空 cue.rows`）；选中 callback 收到原 cue 对象（toBe）与精确路径 `a.cue`、正常返回即接受；callback 抛出原 Error 身份传播（catch+toBe，强于既有 message 匹配） | 3 |
| G6 | choreography 容器 | 既有经父入口只证 battleStart/turnStart+once 的合法组合（G06-06、`enemy-script.test.ts`） | 同上 file：三 hook 非空正控（at 两值 × once 两态 × when 有无 × body 多动作）+ 完整输入保真；只破中间 hook 单轴 → 叶错误定位 `[1].body[0].ms` + 其余保真；非数组整体/非对象 hook/未知字段；at 非法与缺席、once 非布尔、when 非法条件（容器→AI 委派路径）、body 非数组与缺席；body 直入口 | 10 |

合计 91 行；每行先同型合法正控、只破一轴、完整精确 Error 路径（G5 另证原 Error 身份）、`deepSnapshot` 前后输入深等。
卡面预估 30–50 行，实际 91：G1 六函数与 G4 八字段此前均无任何直接行，每行对应唯一精确路径或唯一合法端点，
无不可达内部组合、无凑数表。

## 反控（复用 codex-content-boundaries-mutants 判据）

[工具](guard-leaf-mutants.mjs)：1 个 91 项绿对照 + 6 个单点变异；Vite load 内存注入、不编辑生产源码；
判据钉恰 exit1 / 目标 title 唯一 + 预期 fullName+file / 注入点唯一 / 失败全为 AssertionError /
混错与 timeout 不算红 / 三生产文件 sha256 每跑不变。六针各自**恰好只红目标用例**：

| 针 | 生产注入 | 恰红用例（fullName） |
|---|---|---|
| shapes-trim | `value !== value.trim()` → includes | G1 nonEmptyString > 合法串原值返回；内部空格合法（只禁首尾空白） |
| ai-difficulty-index | `in[${index}]` → `in` | G2 离散叶轴 > difficulty 非数组与元素非串拒绝（空表/空元素轴 wave2 已证） |
| ai-of-recursion | all/any 子递归置空 | G3 组合容器 > 坏子节点在完整 where 路径上报告且同输入快照不变 |
| choreo-tenths-bound | `> 10` → `> 11` | G4 动作叶 > revivePartyAll tenths 越上界拒绝且输入不变 |
| choreo-cue-path | `${path}.cue` → `path` | G5 dialog 委派 > 选中 callback 收到原 cue 对象与精确路径，正常返回即接受 |
| choreo-once-gate | once 门 → `if (false)` | G6 容器三层 > once 非布尔拒绝且完整输入保真 |

明细见 [evidence.json](evidence.json)；临时报告目录 `/var/folders/.../type-pal-guard-leaf-mutants-5YAJIu`。

## 同口径覆盖（每侧各跑一次，官方 content/fast 口径）

[配置](guard-leaf-coverage.config.mjs)：两侧官方 content fast 的 include/exclude 完全相同
（`testSelection` 校验 args 仍为 `--passWithNoTests`），before 仅额外排除三份新文件；
`CONTENT_GUARDS_LEAF_DIR=/tmp/type-pal-guard-leaf-coverage`。before 76 文件 866 项、after 79 文件 957 项均 exit 0。
不覆盖官方 coverage/fast，不改全仓统计。

| 模块 | 行 | 语句 | 函数 | 分支 |
|---|---|---|---|---|
| enemy-validation-shapes | 15/16→**16/16** | 19/20→**20/20** | 6/6 不变 | 23/24→**24/24** |
| enemy-ai-condition-guard | 35/36→**36/36** | 37/39→**39/39** | 3/3 不变 | 34/36→**36/36** |
| battle-choreography | 44/61→**61/61** | 46/67→**67/67** | 6/6 不变 | 28/54→**54/54** |
| content 全包 | 4691/5183→4711/5183 | 5187/5856→5212/5856 | 787/831 不变 | 4160/5019→4190/5019 |

三目标模块四维全部到 100%；全包净增 20 行/25 语句/30 分支，分母零变化。

## 统一门禁（本批范围）

- 官方全 content：`pnpm --filter @type-pal/content run test` → 79 文件 **957/957** exit 0。
- TC：`pnpm --filter @type-pal/content run typecheck` exit 0。
- Biome（仅改动文件）：0 error；4 warning 均为 [guard-leaf-mutants.mjs](guard-leaf-mutants.mjs) 针内
  故意保留的生产源码模板字面量（`noTemplateCurlyInString`），与仓库既有 warning 容忍口径一致，不改针面。
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
