# ED-ENEMY-1 - 敌人、敌队预制与结算/偷取编辑闭环

Status: build
Phase: phase2
Capability: B1 / B7 / B9（需重验现有完成声明，不预先改变能力状态）
Coding Owner: Codex
Reviewer: Kimi（架构/schema/运行时）+ GLM（数据覆盖/测试矩阵）
Visual Verification Owner: Codex + User
Blocked by: none（三方 build 前签字齐）
Branch: `codex/ed-enemy-1`

## 用户裁决与目标

用户于 2026-08-16 要求核清并闭合以下作者工作流：敌队是否是可复用预制、场景实体是否只引用敌队、
掉落/经验/偷取分别属于敌人还是敌队，以及上述数据能否完整创建、编辑、保存重开、引用、试玩和删除。

一句话 `before -> after`：当前敌队编辑入口藏在“包含当前敌人的敌队”Inspector 中，编辑器可创建
`team-c1` 之类的敌队 ID，而场景实体和运行时仍只接受 `team-数字`；改后敌人、敌队、场景各自只有一处
清晰的数据权威，场景只引用可用的敌队预制，奖励/偷取完整可编辑且可在运行时逐敌结算。

代表场景：创建一个含两只同种敌人的新敌队，保存重开后把场景敌对实体绑定到它并试打；胜利时经验、金钱、
收妖值和额外掉落按两只敌人结算，偷取目标来自敌人定义；删除被场景引用的敌队必须被引用清单阻断。

## 已核实的职责边界

- `EnemyDef` 是敌人预制：拥有战斗数值、经验、金钱、收妖值、可偷取内容、演出和 `onDefeated`。
- `EnemyTeamDef` 是敌队预制：只负责敌人槽位、顺序和空槽，不另存一份奖励或偷取数据。
- 场景敌对实体应只引用一个既有敌队预制，不在场景内重新拼敌人阵容。
- 普通胜利经验、金钱、收妖值属于敌人；相同敌人在队内出现两次时按两个敌人实例累计。
- 偷取属于敌人；原版同时支持偷钱和偷物品，数量也属于敌人定义。
- 当前内容模型没有单独的“敌队掉落表”。额外物品奖励由每个敌人的 `onDefeated` 处理；敌队页只能显示
  只读汇总，不能再创建第二份奖励权威。

## 前提真值门

| 维度 | 当前真值 | 一手证据 |
|---|---|---|
| 原版 / primary source | `ENEMY` 拥有经验、金钱、偷取物/数量和收妖值；`ENEMYTEAM` 只有敌人槽位。战斗胜利逐敌累计经验/金钱，偷取也针对具体敌人实例；偷取物 ID 为 0 时代表金钱。 | `reference/sdlpal/global.h:270-295`; `reference/sdlpal/fight.c:753-754`; `reference/sdlpal/fight.c:5253-5284` |
| 第一阶段 | 开战输入以 `enemyTeamId` 解析敌队再实例化成员；经验按已击败敌人之和结算。 | `packages/game/src/core/battle/battle-system.ts:211-228`; `packages/game/src/core/battle/battle-system.ts:296-304`; `docs/phase1/game-mechanics.md:85` |
| 当前二阶段数据/运行时 | `EnemyStats` 拥有 `exp/cash/collectValue`，`EnemyDef` 拥有 `steal/attackEquivItem/choreography/onDefeated`，`EnemyTeamDef` 拥有 `slots`。Reforge 逐敌执行偷取、经验/金钱累计和胜利后的 `onDefeated`。 | `packages/content/src/enemy.ts:23-48`; `packages/content/src/enemy.ts:86-105`; `packages/content/src/enemy.ts:119-133`; `packages/reforge/src/battle/battle-core.ts:621-655`; `packages/reforge/src/battle/battle-core.ts:1167-1175`; `packages/reforge/src/main.ts:2763-2799` |
| 当前二阶段编辑器 | 敌人页已经散落着数值、偷取、额外奖励编辑区；敌队编辑只存在于所选敌人的右侧 Inspector。它会创建 `team-cN`，但场景 hostile 仍存数字 team，场景 picker 和运行时只解析/查找 `team-N`。因此“能创建敌队”不等于“场景能引用该敌队”。 | `packages/editor/src/ui/EnemyTab.tsx:799-831`; `packages/editor/src/ui/EnemyTab.tsx:907-974`; `packages/editor/src/ui/EnemyTab.tsx:1043-1125`; `packages/editor/src/ui/EnemyTab.tsx:1135-1274`; `packages/editor/src/ui/App.tsx:2600-2604`; `packages/editor/src/ui/App.tsx:3181-3205`; `packages/content/src/index.ts:96-98`; `packages/reforge/src/main.ts:2363-2369` |
| 本任务目标 | 建立独立敌队预制工作台与稳定引用闭环；敌人保有所有逐敌奖励/偷取；场景只选择敌队；编辑器不再暴露无法被运行时引用的敌队。 | 用户 2026-08-16 本轮裁决；本卡冻结设计 |

### 最强替代解释与可证伪观察

最强替代解释：字段其实都已存在，本次只需把现有 Inspector 入口挪到更显眼的位置，无需 schema 或引用升级。

当前反证：`EnemyTab` 创建的 `team-cN` 无法通过 `parseTeamNum()`，Reforge 又只查找
`enemyTeamsById[\`team-${team}\`]`；这是可创建但不可被场景选用的真实断链，不是单纯可发现性问题。

可证伪观察：若独立审查证明所有可创建敌队 ID 都保证为 `team-数字`，所有场景/运行时路径都能精确引用它们，
且敌队已有独立 CRUD、引用阻断、保存重开和试玩入口，则无需改变引用模型，只做信息架构迁移。任一关键证据尚为
`unknown` 时，本卡保持 `draft/blocked`，不得猜测实现。

### 替代根因排查

- 运行时语义：已核逐敌奖励/偷取和按 team ID 解析；不是把敌队奖励误算成敌人奖励。
- 原版/第一阶段理解：已由 SDLPal 结构与第一阶段 `enemyTeamId` 调用链交叉核实。
- 提取/迁移：当前断链发生在编辑器新建 ID 与场景/runtime 地址模型之间，尚无证据表明 PAL 提取数据错误。
- 审计/测试模型：由具体 `team-cN -> parseTeamNum -> team-N lookup` 调用链证明，不是只凭 UI 截图推断。

## 冻结设计（待三方签字）

### 1. 唯一数据权威

- 敌人页负责：身份、战斗数值、经验、金钱、收妖值、偷取、额外掉落/演出和 AI。
- 敌队页负责：敌队身份、最多 5 个槽位、成员选择、顺序、空槽、试玩和引用清单。
- 场景敌对实体负责：只选择一个敌队预制；不得在场景属性面板内再次编辑敌队成员或奖励。
- 敌队页可展示成员合计经验/金钱/收妖值和可偷取/掉落摘要，但全部只读并跳回敌人定义。

### 2. 敌队工作台

- 在“战斗”模块提供独立的“敌队”目录/工作区，而不是依附于当前敌人的 Inspector。
- 支持创建、复制、改名/稳定 ID、最多 5 槽编组、排序、空槽、试玩、引用列表、删除阻断、撤销/重做。
- 场景、脚本和其他调用方的敌队选择器只列出已存在的敌队，缺失引用显示 invalid 且保留原值供修复。
- 删除有引用的敌队必须列出可跳转引用；删除未引用敌队后保存重开不得留下悬空引用。

### 3. 敌人奖励与偷取

- “战后结算”结构化编辑经验、金钱、收妖值。
- “偷取”明确区分“无 / 金钱 / 物品”，并编辑数量；不得把原版金钱偷取隐藏成神秘物品 ID。
- “额外掉落”结构化编辑物品、数量、概率；若底层仍由 `onDefeated` 表达，结构化 UI 与高级脚本必须共享同一
  数据权威，不能重复生成两份命令。
- 只有确实不能结构化表达的高级演出才进入脚本编辑；完成结构化覆盖后删除“JSON 兜底”作为普通作者入口。

### 4. 敌队引用模型决策门

优先方案：把场景 hostile 的敌队引用升级为稳定 `enemyTeamId: string`，与第一阶段和内容 ID 体系一致；同步升级
content schema、validator、migration、editor、runtime、save/load 和引用收集器。开发期只保留一个 canonical 路径，
不得长期并存数字 team 与字符串 team 两套逻辑。

备选方案：继续保留数字 `hostile.team`，但编辑器只能生成/重命名为 `team-N`，并以严格 validator 保证所有新敌队
都可被场景引用。该方案不允许继续创建 `team-cN`。

Kimi 必须独立判断两方案的跨包影响和最小正确边界；GLM 必须复算 PAL 全量敌队 ID、场景引用与迁移覆盖。
三签前不得选定并实现任一方案。

## 范围

### 范围内

- 敌人 / 敌队 / 场景三层职责和唯一权威。
- 独立敌队目录、工作台、场景引用器、试玩、引用与删除闭环。
- 敌人经验/金钱/收妖值、偷钱/偷物、额外掉落的结构化编辑与运行时对照测试。
- 任务卡签字后选定的敌队引用 schema/迁移（若采用字符串 ID）。
- 重验 capability-map 的 B1/B7/B9 声明；未通过七环不得维持“完成”。

### 范围外

- 不为敌队新增第二份奖励/掉落/偷取 schema。
- 不改变原版逐敌结算公式、槽位上限或战斗掉落概率语义。
- 不借本卡重写通用脚本编辑器或整个战斗运行时。
- 不手改 PAL 生成内容来掩盖 schema/迁移/引用模型缺陷。

## 实现顺序（签字后）

1. 冻结字符串 ID 或数字 ID 方案，写 schema/迁移/validator/runtime differential tests。
2. 建立敌队独立工作台与 typed reference collector，闭合 CRUD/undo/save/reopen/delete。
3. 把场景 hostile 改为只引用敌队，并验证缺失态、深链与试玩。
4. 收口敌人战后结算、偷取和额外掉落结构化编辑，删除普通 JSON 兜底。
5. 跑 PAL 全量数据审计、编辑器功能测试、Reforge 运行时测试和最小浏览器宽/中/窄验收。

## 验收矩阵

- 敌队：创建、复制、五槽/空槽、换序、保存重开、撤销重做、试玩、引用跳转、删除阻断全部成立。
- 场景：只能选择既有敌队；新建敌队立即可选；缺失 ID 明确报错；保存重开与运行时解析同一 ID。
- 结算：两只同种敌人累加两份 exp/cash/collect；失败/逃跑不误发胜利奖励。
- 偷取：无、金钱、物品三态与数量可编辑；disabled/空值/缺失物品有明确状态；运行时结果一致。
- 掉落：物品、数量、概率结构化；多成员、多次击败和 0%/100% 边界有确定测试。
- 权威：敌队无可编辑奖励字段；只读汇总来自成员；敌人和高级脚本不重复发同一奖励。
- 删除：敌人删除被敌队槽阻断；敌队删除被场景/脚本引用阻断；引用清单可跳转。
- 数据：PAL 全量敌队 ID、敌人成员、场景 hostile 引用 exact join；零不可达新建 ID、零悬空引用。
- UI：敌队入口可发现；1280/900/720 与 125/150/200% 无横滚/裁切，标题、列表、表单遵循现有 design system。
- Regression：相关 content/editor/reforge typecheck、unit/integration/build 全绿；保存后重开和 engine trial 均通过。

## 风险

- 把奖励错误上移到敌队会在敌人复用、重复成员和偷取时产生双权威。
- 字符串 ID 升级会触及 content/save/migration/runtime 公共边界，必须一次完成，不能留长期兼容分支。
- 仅移动 UI 不修 `team-cN` 引用断链，会让“能编辑敌队”继续成为假闭环。
- 仅保留 JSON 兜底会让普通作者无法理解奖励、偷取和掉落，也无法形成字段级验证/引用收集。

## 上下文锚点

- `AGENTS.md`
- `CLAUDE.md`
- `docs/phase2/READ-FIRST.md`
- `docs/phase2/capability-map.md`（B1 / B7 / B9）
- `docs/ops/tasks/B10-1-enemy-confused-attack.md`（其中已发布的五槽 `EnemyTeamDef.slots` 模型，不重开槽位决策）
- `docs/ops/tasks/ED-BATTLE-UI-1-skill-workbench-redesign.md`（只提供页面壳/视觉上下文，不替代本卡功能闭环）
- 本卡前提真值门列出的一手代码与 SDLPal 锚点

## 推进签字

### draft -> build

- Codex: **premise verified + design agree（2026-08-16）**。已直接读取 SDLPal `ENEMY/ENEMYTEAM`、
  第一阶段开战/结算、二阶段 schema/editor/runtime 调用链；确认奖励/偷取属于敌人、队伍只编组，并确认
  `team-cN` 创建与数字 scene/runtime 引用构成真实断链。允许在 Kimi/GLM 独立签字且敌队引用方案冻结后实现。
- Kimi: **premise verified + design agree（2026-08-16，本人一手读码 + PAL 全量复算；附增量必落钉
  EK1-EK3）**。**§4 引用模型裁决：采用优先方案——字符串 `enemyTeamId` 一次升级**；理由与证据见
  下方「Kimi 独立架构审查」。GLM G1-G5 全部携带。
- GLM: **premise verified + design agree（2026-08-16，本人一手读码+全量数据复算，非代理；附必落钉
  G1-G5 与跨卡更正）**。PAL 全量复算：380 敌队**全部 team-数字、0 非数字**；场景 hostile.team 828
  引用/266 队 + startBattle.team 174 引用/105 队，**全部 0 悬空**；合并后 68/380 未被引用（无碰撞）。
  team-cN 断链逐行核实（EnemyTab:1192 创建 → App:3193 picker 过滤 parseTeamNum → main.ts
  `team-${N}` 查找）。敌人字段 153/153 覆盖 exp/cash/collectValue；steal 117 全物品形（**PAL 零金钱
  偷取,但 runtime 已支持 itemId='0'=钱**）；onDefeated 15 例（giveItem×15+dialog×15+branch×4）。
  **跨卡更正**：DeleteEnemyCommand **已有** blockingEnemyReferences（ED-BATTLE-UI-1 GLM N1 中
  "Enemy 删除无阻断"结论已过时）。详见下方「GLM 独立数据覆盖审查」。
- build 准入: **allowed（2026-08-16）——Codex + GLM（G1-G5）+ Kimi（EK1-EK3）三方签字齐，
  引用模型已冻结为字符串 `enemyTeamId` 方案。由 Codex 按 G1-G5 + EK1-EK3 进 build。**

#### Kimi 独立架构审查（build 前，2026-08-16；本人一手读码 + PAL 全量复算）

**判断 1 — EnemyTeamDef 纯预制编组、奖励/偷取归 EnemyDef ✓（三向一致）：**
原版 `global.h:270-290`（ENEMY 拥有 wExp/wCash/wStealItem/nStealItem/wCollectValue）与
`:292-295`（ENEMYTEAM 仅槽位）；逐敌结算 `fight.c:753-754`、按实例偷取且 `wStealItem==0`=偷钱
`fight.c:5253-5284`。二阶段 `EnemyStats.exp/cash/collectValue`（enemy.ts:29-30,47）、
`EnemyDef.steal`（enemy.ts:99）、`EnemyTeamDef = { id: string; slots }`（enemy.ts:126-134）；
运行时逐敌累计防重（battle-core.ts:1167-1177）、偷钱/偷物分岔（:638-655）、胜利逐槽 onDefeated
（main.ts:2782-2799）。敌队持奖励 = 双权威，反证成立；卡文职责边界不用改。

**判断 2 — §4 裁决：字符串 `enemyTeamId`（方案 A），拒绝严格数字方案（方案 B）：**
- schema 早已半身字符串化：`EnemyTeamDef.id` 本就是 string；数字只残留在引用侧
  （`HostileBehavior.team: number` index.ts:98、`HostileBehaviorV13` 同形 scene-v13.ts:120-121、
  `startBattle.team: number` script-v5.ts:196）与运行时合成键 `enemyTeamsById[\`team-${team}\`]`
  （main.ts:2366)。数字模型正是 READ-FIRST 铁律 5 点名的下标身份过渡态。
- 方案 B 的「数据成本为零」（GLM）只算了存量数据；其真实代价是把命名约定当身份规则永久化——
  与 B2-1 已否决的「PAL id>=6 通用规则」同型，且与其他全部 content 域的稳定字符串 id 体系相悖。
  作者创建 team-cN 的行为本身证明语义 id 是真实需求；方案 A 下 PAL 380 队 id（全 team-N）作为
  字符串 id 继续有效，只有引用类型 number→string 由迁移器机械改写。
- 断链实证（与 GLM 独立互证）：EnemyTab.tsx:1189-1196 创建 team-cN → App.tsx:2600-2604
  parseTeamNum 拒绝 → :3191-3203 picker 过滤 → main.ts:2366 运行时查不到 → 试打 href
  （EnemyTab.tsx:1175 `battle=cN`）同样断。IA 调整修不了这四层，最强 counter 不成立。

**判断 3 — 存档/保存面实测安全：**
`WorldState`（character.ts:17-49）无任何 team 引用——明雷生命周期按实体 id 持久、收妖值/金钱为
世界单值；字符串升级不触 save schema，只触 content schema + 生成内容 + 运行时查找键。

**增量必落钉（GLM G1-G5 之外，build 必落）：**
- **EK1（startBattle.team 同卡同版本升级）**：卡文 §4 只写场景 hostile，但 startBattle.team 是同一
  引用域；只升 hostile 会留下两套引用模型，直接违反卡文「不得长期并存」。schema、v13 guard
  （scene-v13.ts:120-121 同款检查点）、脚本编辑器表单、PAL 174 处脚本引用必须纳入同一
  contentVersion 升级。
- **EK2（contentVersion 升级连带面清单）**：实现顺序第 1 步显式列出——migrate 输出 + 双跑幂等、
  editor loader/save、PAL 全量重迁（1002 处引用 N→"team-N" exact join + 0 悬空复算）、
  demo/e2e-own fixtures（仍 v12，见 ED-DS-2 K1）处置、与 ED-DS-2 旧版本链路删除的先后关系。
- **EK3（运行时与试玩入口同升）**：reforge host startBattle team 参数（main.ts:2363-2368）、
  v5/v13 脚本运行时传递、play.html `battle=` 参数与 EnemyTab:1175 试打 href、dev-only
  enemyOverride——缺任一处即「能编辑不能试玩」假闭环。
- （G1 补充说明，非新钉）：team typed collector 直接复用已落地的 `battle-field-reference.ts`
  模式（B2-1 产物，已含 hostile/startBattle root 分类），不另发明 walker。

**可证伪观察：**
1. 若 PAL 出现非 team-N 敌队 id 或任一数字引用无法 exact join（本人与 GLM 双方实测 380/1002/0
   悬空），字符串迁移机械性不成立 → 停线重估。
2. 若发现存档/world 持有 team 引用（本人读 WorldState 未见），EK2 风险升档重签。
3. 若用户拍板保留数字双模型，本裁决失效——但需用户明确推翻铁律 5 的适用，不建议。

Evidence: global.h:270-295 / fight.c:753-754,5253-5284 / enemy.ts:23-48,99,126-134 /
index.ts:96-107 / scene-v13.ts:109-132 / script-v5.ts:194-204 / character.ts:17-49 /
EnemyTab.tsx:799-831,907-973,1043-1125,1135-1274 / App.tsx:2600-2604,3170-3204 /
main.ts:2363-2368,2763-2799 / battle-core.ts:617-656,1167-1177 / battle-field-reference.ts /
本人 node 复算 projects/pal（380 teams 全 team-N / hostile 828 + startBattle 174 / 0 dangling /
slots≤5）。只读审查，未改实现文件，未标 build/done。

#### GLM 独立数据覆盖审查（2026-08-16，本人一手读码 + Node 全量复算；非代理）

**一、PAL 敌人/敌队/场景引用独立复算（五问之 1、3）：**

| 指标 | 实测 |
|---|---|
| 敌队总数 | **380**，**全部 `team-数字` 形态，0 非数字**（本人逐 id 正则复算） |
| 槽位 | 861 = 填充 757 + 空槽 104；不同成员敌 152 |
| 场景 hostile.team 引用 | **828 处 / 266 个不同 team 数字 / 73 个场景**；范围 0-378；**0 悬空** |
| 脚本 startBattle.team 引用 | **174 处 / 105 个不同 team**；**0 悬空** |
| 合并覆盖 | hostile+startBattle 后 68/380 未引用（如 team-20/41/48…无碰撞、无歧义） |
| 场景 picker 现状 | App.tsx:3193-3199 列出 `parseTeamNum(t.id)!==undefined` 的队——**team-cN 被过滤**；
  悬空数字已有"缺数据"兜底 option（:3197-3199） |

**断链逐行核实（卡文核心前提成立）**：`EnemyTab.tsx:1192-1193` `while (enemyTeams.some((t) =>
t.id === \`team-c${n}\`)) n++` 创建 team-cN → 场景 picker 过滤 → `main.ts` `enemyTeamsById[\`team-${team}\`]`
只解析数字 → **可创建但不可被场景/脚本引用**。可证伪观察不成立（断链真实存在）。

**二、exp/cash/collect/steal/onDefeated 覆盖（五问之 2）：**

| 字段 | 覆盖 | 异常值 |
|---|---|---|
| exp | 153/153 | =0 ×4 |
| cash | 153/153 | =0 ×41 |
| collectValue | 153/153 | — |
| steal | 117/153 `{itemId:string, count}` | itemId 全≠'0'（**PAL 零金钱偷取**）；count>1 ×47 |
| onDefeated | 15/153 | giveItem×15 + dialog×15 + branch×4（giveItem=奖励,dialog/branch=演出） |

**关键发现**：runtime **已支持金钱偷取**（battle-core.ts:619 注释 + :639 `itemId 空/'0' = 偷钱,
余量/(2+R(2,3)) 即时入 moneyDelta`）——但 PAL 数据零实例、schema `steal?: {itemId: string; count}`
无显式三态。结构化三态编辑（无/金钱/物品）**必须有 synthetic fixture 测试**，PAL replay 测不到金钱路径。

**三、七环缺口盘点（五问之 4）+ 跨卡更正：**

| 环 | 敌人 | 敌队 | 场景引用 |
|---|---|---|---|
| 创建 | AddEnemyCommand ✓ | **仅 whole-table UpdateEnemyTeamsCommand(:2675)，无 Add** | — |
| 编辑 | Update ✓ | whole-table 粗粒度 ✓ | hostile.team select ✓ |
| 保存重开 | ✓ | ✓（表级） | ✓ |
| 深链 | acceptsObject ✓ | **无独立页**（藏于敌人 Inspector） | ✓ |
| 引用 | **blockingEnemyReferences ✓（battle-data-references.ts:251 + BattleDataInUseError）** | **无 team 引用 collector** | picker 过滤非数字 ✓ |
| 删除 | **阻断 ✓**（敌队槽/变身/召唤,EnemyTab:1283 描述一致） | **无 Delete 命令、无阻断** | — |
| undo/redo | ✓ | whole-table invert ✓ | ✓ |

**跨卡更正**：本人在 ED-BATTLE-UI-1 审查中的 N1 称"Enemy 删除仅 confirm 无阻断"——**已过时**。
当前 `DeleteEnemyCommand.apply` 先查 `blockingEnemyReferences` 再删（commands.ts :2634-2646）。
ED-BATTLE-UI-1 的 N1 对 **Skill/Poison 仍成立**（无对象删除），Enemy 部分已由 battle-data-references
闭合。两张卡的 build 应协调避免重复建设/重复测试。

**四、引用模型决策门数据输入（供 Kimi 裁决 §4）：**
- **方案 B（保留数字,禁 team-cN）数据成本为零**：380/380 已 team-数字、828+174 引用 0 悬空、
  picker 已过滤非数字——只需 strict validator + 敌队工作台禁止生成非数字 id。
- **方案 A（升 string enemyTeamId）**：需 contentVersion 迁移 + validator + save/load + runtime
  `team-${N}` 改 string 查找 + editor picker + collector 全链；PAL 数据无收益（本就无碰撞）。
- GLM 不裁决架构;两方案均数据安全。若选 A，迁移矩阵必须覆盖 828 hostile + 174 startBattle +
  380 队 id 的 exact join 与 0 悬空不变式。

**五、JSON 兜底裁决建议（五问之 5）：删除普通入口,保留高级脚本入口。**
- 数据支撑：PAL 15 例 onDefeated = giveItem（结构化已覆盖,EnemyTab:608-640
  findDefeatedItemReward/replaceDefeatedItemReward + :1078-1100 count/probability）+ dialog/branch
  （**演出,非奖励**）。结构化奖励与 onDefeated 共享同一数据权威（replace 在原数组内改写,无第二份）。
- 建议：纯物品奖励的"复杂(JSON)"编辑作为普通作者入口**删除**;dialog/branch 演出经高级脚本入口保留
  （它们是 choreography 语义,不是奖励重复）。卡文 §3"删除 JSON 兜底作为普通作者入口"与此一致,
  补充明确"演出 dialog/branch 保留在高级脚本"防误删。

**必落钉 G1-G5（build 必落）：**
- **G1（敌队七环核心缺口）**：新建 Add/Delete enemy-team 命令 + **typed team 引用 collector**——
  消费面必须同时覆盖场景 `hostile.team`（828）与脚本 `startBattle.team`（174）两条路径;删除阻断
  引用清单可跳转;undo/redo;删除后保存重开无悬空。
- **G2（断链修复验证）**：无论 A/B 方案——strict validator 拒绝非 `team-N` 新建（B）或迁移后
  hostile.enemyTeamId exact join（A）;场景 picker 列出全部可用队;缺失 ID invalid 显示保留原值;
  "新建敌队立即可被场景选用"端到端测试（当前 team-cN 即此测试的反面教材）。
- **G3（偷取三态 + 金钱路径 synthetic 测试）**：无/金钱/物品结构化编辑;**金钱路径必须 synthetic
  fixture**（PAL 零实例）;count>1（47 实例）与余量耗尽语义对齐 runtime :631-641。
- **G4（奖励权威单源）**：结构化 giveItem 奖励编辑后 onDefeated 不产生重复 giveItem;删除普通
  JSON 入口后 dialog/branch 演出仍可经高级脚本编辑;0%/100%/多成员/多次击败边界测试。
- **G5（测试矩阵 + 跨卡协调）**：敌队 CRUD/引用/删除测试新建;与 ED-BATTLE-UI-1 N2（EnemyTab
  测试文件从零）协调分工——敌队功能测试归本卡,EnemyTab 页面壳/Hero 测试归 ED-BATTLE-UI-1,
  避免重复或互相假设对方覆盖。B1/B7/B9 完成声明重验：敌队七环闭合前 B9（明雷回流）与 B7（结算）
  的编辑侧证据不足,维持"需重验"。

**可证伪观察：**
① 若存在第三条 team 消费路径（本人只核 hostile+startBattle;若 validator-refs 或 save 侧还有）,
  G1 collector 覆盖面不足——build 前再 rg 一次 team 消费点。
② 若方案 A 迁移后 828+174 引用出现任一悬空或 380 exact join 失败,迁移矩阵拦截。
③ 若结构化奖励编辑后 onDefeated 出现两条 giveItem（双权威）,G4 拦截。
④ 若删除普通 JSON 入口导致 PAL 15 例 dialog/branch 演出不可编辑,G4"保留高级脚本"拦截。

Evidence: enemy-teams.json 380 队全 team-数字/861 槽/0 非数字（本人 node 正则复算）/ 场景扫描
hostile.team 828/266/73/0 悬空 + startBattle.team 174/105/0 悬空 + 合并 68 未引用 / enemies.json
153 敌字段覆盖 + steal 117 全物品 + onDefeated 15 例 / battle-core.ts:619,631-641 偷钱语义 /
enemy.ts:99 steal schema / EnemyTab.tsx:608-640,1078-1100,1192-1193,1283 / App.tsx:2601-2604,
3181-3205 / main.ts:2363-2369 / commands.ts:2634-2646,2675-2680 / battle-data-references.ts:251 /
global.h:270-295 / fight.c:753-754,5253-5284。只读审查,未改实现文件,未代签 Kimi,未标 build/done。

### review -> done

- Codex: pending
- Kimi: pending
- GLM: pending
- User: pending functional acceptance


- 2026-08-17 Codex: 接手前复核 Codex + Kimi（EK1-EK3）+ GLM（G1-G5）三方 premise/design
  签字与字符串 `enemyTeamId` 方案裁决，build 准入仍为 allowed；任务由 `draft` 转 `build`，分支为
  `codex/ed-enemy-1`。Codex 为唯一 Coding Owner，按“迁移/门禁 → 敌队七环 → 场景引用 → 奖励偷取 →
  全量审计/视觉”顺序推进。


- 2026-08-16 GLM: build 前数据覆盖审查签 premise verified + design agree（G1-G5）。全量复算：380 队
  全 team-数字/0 非数字;hostile 828 + startBattle 174 引用 0 悬空;team-cN 断链逐行核实。跨卡更正：
  Enemy 删除阻断已存在（ED-BATTLE-UI-1 N1 Enemy 部分过时）。JSON 兜底建议：删普通入口/留高级脚本
  （dialog/branch 是演出非奖励）。引用模型数据输入：方案 B 零迁移成本;方案 A 无 PAL 收益,若选须
  828+174+380 exact join 矩阵。Next: Kimi 架构签字 + §4 方案裁决。

## 下一位 Agent 提示词

### 给 Kimi（已完成）

Kimi 已于 2026-08-16 完成 build 前架构审查并签字（premise verified + design agree；§4 裁决为
字符串 `enemyTeamId` 方案；附 EK1-EK3，见「Kimi 独立架构审查」），本节提示词不再适用。

### 给 Codex（三方签齐后进 build，可直接复制）

```text
接手任务：ED-ENEMY-1 敌人、敌队预制与结算/偷取编辑闭环——build 实现
任务卡：docs/ops/tasks/ED-ENEMY-1-enemy-team-reward-authoring-closure.md
当前状态：三方 build 前签字齐（Codex + GLM G1-G5 + Kimi EK1-EK3）；引用模型已冻结为字符串
  enemyTeamId 一次升级方案；build allowed
你的角色：Coding Owner
先读：任务卡全文（冻结设计 §1-§4、GLM 独立数据覆盖审查、Kimi 独立架构审查）、
  packages/content/src/battle-field-reference.ts（typed collector 既有模式）、B10-1 五槽任务卡。
必落钉汇总：
  GLM G1: Add/Delete enemy-team 命令 + typed team collector（覆盖 hostile 828 + startBattle 174）;
  GLM G2: 断链修复端到端（新建立即可选、缺失 invalid 保留原值）;
  GLM G3: 偷取无/金钱/物品三态，金钱路径 synthetic fixture（PAL 零实例）;
  GLM G4: 奖励单源（结构化编辑不产生重复 giveItem；dialog/branch 演出留高级脚本）;
  GLM G5: 测试矩阵与 ED-BATTLE-UI-1 分工（敌队功能归本卡，页面壳归彼卡）;
  Kimi EK1: startBattle.team 与 hostile 同卡同 contentVersion 升级，含 scene-v13 guard 与脚本表单;
  Kimi EK2: contentVersion 连带面清单（migrate 双跑幂等、editor load/save、PAL 重迁 exact join
    0 悬空复算、demo/e2e-own fixtures 处置、与 ED-DS-2 K1 旧版本链路删除的先后关系）;
  Kimi EK3: 运行时/试玩同升（main.ts host 参数、v5/v13 传递、play.html battle=、EnemyTab 试打 href、
    dev enemyOverride）。
验收红线：不手改 PAL 生成产物掩盖迁移缺陷；不改原版逐敌结算公式/槽位上限/掉落概率语义；
  删除被场景/脚本引用的敌队必须阻断并可跳转；三档宽度无横滚。
完成后：Build 节证据 → Kimi/GLM done 前审查 → 用户功能验收（含代表场景试打）。
```

### 给 GLM

```text
接手任务：ED-ENEMY-1 敌人、敌队预制与结算/偷取编辑闭环——数据覆盖/测试矩阵审查
任务卡：docs/ops/tasks/ED-ENEMY-1-enemy-team-reward-authoring-closure.md
当前状态：draft；你负责 build 前独立 premise/design 签字。不得修改实现文件，不得标记 build/done。

先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡、
docs/phase2/capability-map.md 的 B1/B7/B9、B10-1 五槽任务卡；再直接读取 enemy schema、PAL enemies/teams/scenes、
EnemyTab/App、validate-refs、Reforge battle-core/main 和相关 tests。

请独立复算并报告：
1. PAL 全量 enemy team ID 形状、成员槽位、场景 hostile 引用、悬空/不可达引用；
2. exp/cash/collect/steal/onDefeated 的字段所有权与 editor/runtime 覆盖；偷钱(itemId=0)和额外掉落是否有结构化入口；
3. create/edit/save-reopen/reference/delete/trial 七环的缺口，B1/B7/B9 是否应继续标完成；
4. 若迁 stable string ID，migration/validator/reference/save tests 的精确矩阵；若保留数字 ID，如何证明新建 ID 永远可引用。

输出：在任务卡签 `premise verified + design agree`，或写 `counter`、一手证据、缺漏清单和必返工测试。
签字不齐前不得开始实现。
```

### 给 Codex（Kimi 签字 + 方案冻结后进 build，可直接复制）

```text
接手任务: ED-ENEMY-1 敌人、敌队预制与结算/偷取编辑闭环——build 实现
任务卡: docs/ops/tasks/ED-ENEMY-1-enemy-team-reward-authoring-closure.md
当前状态: draft;Codex+GLM 已签（GLM 附 G1-G5）;待 Kimi 架构签字 + §4 引用模型裁决
你的角色: Coding Owner——按冻结方案实现敌队七环 + 奖励/偷取结构化 + 引用闭环
必落钉:
  GLM G1: 新建 Add/Delete enemy-team 命令 + typed team 引用 collector（消费面 hostile.team 828 +
    startBattle.team 174 双路径）;删除阻断可跳转;undo/redo;保存重开无悬空。
  GLM G2: strict validator 禁 team-cN（B）或迁移 exact join（A,须 828+174+380 矩阵）;
    "新建敌队立即可被场景选用"端到端测试。
  GLM G3: 偷取三态（无/金钱/物品）结构化编辑;金钱路径 synthetic fixture（PAL 零实例）;
    count>1 ×47 与余量耗尽对齐 runtime。
  GLM G4: 结构化奖励与 onDefeated 单权威（不重复 giveItem）;删普通 JSON 入口但 dialog/branch
    演出保留高级脚本;0%/100%/多成员/多次击败边界。
  GLM G5: 与 ED-BATTLE-UI-1 N2 协调——敌队功能测试归本卡,EnemyTab 页面壳归 ED-BATTLE-UI-1;
    B1/B7/B9 声明重验结论写入卡内。
顺序: 方案冻结/迁移测试 → 敌队工作台+collector → 场景引用闭环 → 奖励/偷取结构化+JSON 收口 →
  PAL 全量审计+浏览器验收。
```
