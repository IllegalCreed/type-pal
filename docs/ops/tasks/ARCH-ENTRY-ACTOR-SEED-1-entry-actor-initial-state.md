# ARCH-ENTRY-ACTOR-SEED-1 入口角色完整初始状态所有权与快照模型

> **状态**：review（2026-08-25 三方 `accept` 已齐；等待用户最终验收 / 收口）
> **负责人**：Codex（Coding Owner）
> **参与审查**：Kimi（架构 / schema）、GLM（原版与数据覆盖）
> **能力格**：X7 项目数据与持久化语义
> **风险级别**：高（schema / save / migration / 新游戏初始化）

## 目标

明确“入口角色在新游戏开始时的等级、经验、当前 HP/MP、最大 HP/MP、基础属性、装备与技能”分别由哪一层持有，并在证据闭环后建立单一、稀疏且可解释的初始化模型。编辑器只能编辑权威输入，不得把可由角色定义、成长曲线或装备推导的战斗快照重复保存进入口。

本卡先回答所有权问题，再决定是否修改 schema。关键事实未核清前不得实现。

## 用户可见行为 / 工程前提

当前入口只暴露角色 `hp/mp` 覆盖，但 UI 没有说明它们是“开局这一刻的当前值”，也没有说明空值继承角色定义；目标是让“开局设置”准确表达真正属于入口的覆盖项，并把最大 HP/MP、等级、属性、装备与初始技能等角色本体配置留在角色页。

### before -> after（用户 2026-08-25 已裁决）

- **before**：入口可写空白 `hp/mp`，但没有说明它们是当前值，也不知道空值继承什么；初始技能同时写在 `ActorDef.battler.initialMagic` 与 `StartWorld.learnedSkills`，runtime 只消费后者。
- **after**：
  - `ActorDef` 是等级、当前/最大 HP/MP 基线、基础属性、初始装备与初始技能的唯一配置权威；经验新游戏固定为 0。
  - `StartWorld` 持有队员选择与顺序、金钱、库存、世界资源，以及可选的当前 `hp/mp` 稀疏覆盖；`maxHP/maxMP` 绝不进入入口覆盖。
  - 当前 `hp/mp` 覆盖留空即继承角色定义，用于“同一角色在该入口带伤或缺蓝开始”；UI 必须写明“当前值”和继承来源。
  - 删除 `StartWorld.learnedSkills` 配置副本；首次实例化角色时从 `ActorDef.battler.initialMagic` 初始化运行时 `WorldState.learnedSkills`，后续学习、离队/归队与存档继续只修改/保存运行时状态。

用户确认按上述推荐执行，并明确其先前把入口 HP/MP 误解为最大值；本合同冻结为“入口只覆盖当前值，最大值归角色”。若未来出现同一角色必须因入口而拥有不同最大值、装备、属性或初始技能的真实工程需求，须另开前提真值审查，不在本卡预留重复字段。

## 前提真值矩阵

| 方向 | 当前结论 | 一手证据 | 状态 |
|---|---|---|---|
| 原版 / primary source | 新游戏初始化由 `PAL_LoadDefaultGame` 把 DATA.MKF chunk 3 的整张 PlayerRoles 表整体拷入运行时：等级/HP/MP/五维属性/装备 6 槽/魔法 32 槽全部为该表的 per-role 静态 authored 值；主经验 memset 0、八类隐藏经验 wLevel 初始化为角色等级；金钱/背包/队伍清零，队伍由开场脚本装配 | `reference/sdlpal/global.c:378-465`（PAL_LoadDefaultGame）；`data/extracted/data/player-roles.json` roleId 0（level 1、HP/MP 150/100 满、33/32/20/28/32、equipment [196,225,208,166,235,249]、magic[0]=296）；`docs/phase1/game-mechanics.md:65` | verified（Kimi 2026-08-24 直读） |
| 第一阶段 | 一阶段忠实同一链：`hydratePlayerRolesRuntime` 把 player-roles.json 基线逐字段拷入 PlayerRolesRuntime（等级/HP/MP/属性/装备/魔法 SoA）；`loadDefaultGame` 对齐 PAL_LoadDefaultGame 清零进度字段并设 8 类经验 wLevel=角色等级 | `packages/game/src/core/game-state.ts:1384-1442`（hydrate）；`packages/game/src/core/game-state.ts:1444-1465`（loadDefaultGame）；`docs/phase1/game-mechanics.md:65` | verified（Kimi 2026-08-24 直读） |
| 实现前当前二阶段 | `StartWorld` 只提供 `party`、`money`、`learnedSkills`、`inventory`、`resources` 与仅含 `hp/mp` 的 `seedStats`；`buildWorld` 先实例化角色，再应用 HP/MP 覆盖 | `packages/content/src/character.ts:52`、`packages/content/src/character.ts:73`、`packages/content/src/character.ts:213`；`packages/content/src/validate.ts:87` | verified |
| 本任务目标 | 角色定义持有等级、当前/最大 HP/MP 基线、属性、装备与初始技能；入口只持世界级初值及当前 HP/MP 稀疏覆盖，删除配置侧 `StartWorld.learnedSkills` 双写 | 本卡已裁决的 `before -> after`；`packages/content/src/actor.ts:67-82`；`packages/content/src/character.ts:52-63,213-249` | verified（用户 2026-08-25 裁决） |

### 最强替代解释

当前 `seedStats.hp/mp` 并非最大值或残缺 schema，而是刻意支持“带伤/缺蓝开局”的当前值覆盖；等级、最大 HP/MP、属性、装备与初始技能属于角色定义。原版、一阶段与当前调用链已支持该解释，正确修复是补清“当前值/继承”提示并删除技能双写，而不是把角色快照搬进入口。

### 什么观察会推翻当前候选

若发现真实工程中同一角色必须因入口而拥有不同最大 HP/MP、等级、装备、基础属性或初始技能，且该差异无法由角色定义或入口场景脚本表达，当前合同需重新开卡核验；在此观察出现前不得预留这些入口字段。

## 上下文锚点

- `AGENTS.md`：前提真值门、schema / save / migration 三方必审、开发期只保留 canonical 版本。
- `docs/phase2/READ-FIRST.md`：第二阶段开工纪律。
- `packages/content/src/character.ts:52`：`StartWorld` 当前字段。
- `packages/content/src/character.ts:73`：canonical entry / `defaultEntryId` 选择关系。
- `packages/content/src/character.ts:213`：`buildWorld` 角色实例化与 `seedStats` 应用顺序。
- `packages/content/src/validate.ts:87`：入口数据当前验证边界。
- `packages/editor/src/ui/ProjectWorkbenchTab.tsx:693`：队伍与开局配置 UI。
- `packages/editor/src/ui/ProjectWorkbenchTab.tsx:756`：物品、技能、资源与 HP/MP 编辑 UI。
- `docs/phase1/game-mechanics.md` 与 `docs/phase1/engineering-notes.md`：一阶段机制证据目录，审查时须补精确锚点。

## 不得重新引入

- 不得因为 UI 想展示更多字段就复制一份派生战斗快照。
- 不得让入口、角色定义、成长曲线和装备同时拥有同一数值的写权限。
- 不得直接手改 `projects/pal` 生成结果绕过迁移 / 生成源。
- 不得保留仅为旧版本服务的兼容分支；若切换 canonical schema，应在本卡内完成迁移、重生成与旧路径删除。
- 不得把本卡塞进 `ED-PROJECT-STARTUP-IA-1` 的普通布局改造中先做后审。

## 冻结的所有权合同（用户 2026-08-25 裁决）

1. 初始等级与当前/最大 HP/MP 基线、基础属性、初始装备、初始技能由 `ActorDef` 持有；新游戏经验固定为 0。
2. `StartWorld.seedStats[actorId].hp/mp` 只表示开局当前 HP/MP；缺字段即继承 `ActorDef.battler.baseStats.hp/mp`，入口不得覆盖 `maxHP/maxMP`。
3. `StartWorld` 继续持有入口级队伍顺序、金钱、库存与世界资源；不得新增等级、属性、装备、最大值或技能快照。
4. 配置侧删除 `StartWorld.learnedSkills`；runtime 的 `WorldState.learnedSkills` 保留为可变进度，并在角色首次实例化时深拷贝 `ActorDef.battler.initialMagic`。
5. 新游戏和后续首次入队都必须初始化该角色的初始技能；离队/归队与读档不得重新播种或覆盖已学习/遗忘的运行时技能。
6. 保存只持久化运行时角色与 `WorldState.learnedSkills`，不得回写 `ActorDef` 或 `StartWorld`；编辑器撤销/重开保持当前 HP/MP 覆盖的稀疏形状。
7. schema 切换只保留当前 canonical 版本；迁移器从角色表生成 `initialMagic`，停止向 manifest 双写 `learnedSkills`，重迁当前工程并以二次运行零 diff 证明收口，禁止直接手改 `projects/pal`。

## 分阶段实施合同（三签齐，已授权）

1. **truth audit（完成）**：原版、一阶段、当前二阶段初始化调用链与代表角色数据矩阵已由三方直接核验。
2. **contract + user decision（完成）**：唯一 owner、当前值/最大值边界、继承、序列化和用户可见文案已冻结。
3. **signature refresh（完成）**：Kimi / GLM 已按最终 `before -> after` 分别重签 `premise verified + design agree`；旧 premise 签字只作历史证据。
4. **schema + migration（完成）**：一次切换到 canonical content18，重迁 PAL，删除旧字段与 fallback。
5. **runtime（完成）**：新游戏与首次入队从 `initialMagic` 初始化运行时技能，保留进度与存档语义。
6. **editor（完成）**：在正确页面暴露权威输入；入口只显示当前 HP/MP 稀疏覆盖与真实入口级世界状态。
7. **tests（完成）**：新游戏、首次入队、离队/归队、保存重开、多入口、空值继承与二次迁移零 diff 闭环。

## 验收标准

- [x] 原版 / 一阶段 / 当前二阶段 / 目标四向矩阵均有精确 `file:line` 或上游一手证据，关键项无 `unknown`。
- [x] 每个初始字段只有一个权威 owner，并记录默认值、继承、显式覆盖、序列化和运行时应用时点。
- [x] 三方分别签署有效 `premise verified` 与 `design agree`，且 Kimi / GLM 均提供独立证据与可证伪观察。
- [x] 用户确认最终 `before -> after` 行为（2026-08-25，入口 HP/MP = 当前值覆盖，非最大值）。
- [x] 若修改 schema：当前工程一次性重迁 / 重生成，旧类型、旧 fixture、兼容 fallback 与旧产品入口同步删除。
- [x] 同一角色默认入口与非默认入口的初始化有自动化测试；入口无覆盖时结果可由角色定义稳定重算。
- [x] 编辑器不再展示无来源、无继承说明的空 HP/MP 框；字段放置与实际 ownership 一致。
- [x] 保存、撤销、重开不把派生值固化成冗余快照。
- [x] 全量验证与 PAL 代表入口 E2E 登记完成。

## Build / Review 证据（2026-08-25）

### 实现闭包

- `CONTENT_VERSION` 一次切到 18；配置侧删除 `StartWorld.learnedSkills`，validator 将旧字段作为未知字段拒绝，
  `WorldState.learnedSkills`、SAVE8 payload 与学习 / 遗忘运行态保持不变。
- `buildWorld` 与 `applySetParty` 共用首次播种合同：只在实例技能键严格为 `undefined` 时深拷贝
  `ActorDef.battler.initialMagic`；已有空数组、离队 / 归队、剧情学习 / 遗忘和读档均不重播。异步
  `setParty` 只在资源预载成功后原子提交 party / reserve / learnedSkills；debug 换队与试打预设同步收口。
- loader 对 `ActorDef.battler.initialMagic -> skills` 建立硬错误门；actor validator 拒绝空技能 id 和重复 id。
- 编辑器入口页删除技能副本，只显示“开局当前 HP / MP”与逐角色继承值；角色页独立编辑当前 / 最大
  HP/MP 基线和初始仙术，均走现有 command / draft 合同并可撤销。
- PAL 只改迁移上游 `pal-manifest.ts` 后完整重迁；demo 把有意的御剑术 `345` 迁入角色
  `initialMagic` 并补齐自包含 SkillData；e2e-own 同步 current schema。生成结果白名单只有
  `projects/pal/manifest.json`。

### 迁移与静态证据

- PAL 正式写入后的内建 replay 与独立第二次 dry-run 均为
  `managed=537 / writes=0 / deletes=0 / conflicts=0 / asset-deletes=0`；baseline 无漂移。
- 生产代码与三份 manifest 中配置侧 `startWorld.learnedSkills`、`entry-point-learned-skills`、
  `start-world-learned` 全部零命中；运行态 `WorldState.learnedSkills` 保留。`git diff --check` 通过。
- repo-wide `pnpm lint` 仍报告仓库既有 296 项诊断（包括本卡未触碰的历史格式与 callback 写法），不能作为
  当前绿色门禁；本卡新增原生 label 曾被 design-system boundary 精确拦截，改为 `DsDraftNumberField` 后
  静态测试与 `audit:design-system` 均复绿（84 files / 3 个有证据例外），未抬 allowlist。

### 自动化验证

- content 全量：33 files / 432 tests，typecheck 通过；额外三份核心聚焦复审 140/140 通过。
- reforge 全量：91 files / 842 tests，typecheck 通过；覆盖 loader 硬门、新游戏、首次入队、异步事务、
  debug 旁路与 SAVE8 空技能键 exact round-trip。
- migrate 全量：43 files / 355 tests，typecheck 通过；PAL publication / current-only / demo 345 闭包通过。
- editor 初次全量中 145 files / 1121 tests 通过，仅 design-system boundary 因新增两个 raw label 失败；
  改为 `DsDraftNumberField` 后先由 boundary 42/42、ProjectWorkbench 25/25 与 typecheck 复绿。收口时因误格式化
  噪声被机械重建为 HEAD 排版 + 语义 diff，为排除重建丢改而补跑当前全量，最终 146 files / 1122 tests、
  typecheck 与 `audit:design-system` 全绿；不再重复运行。
- `audit:sfx-readiness` 已按新 runtime 真值更新 legacy 全量预载反证为 77 / 83 / 100；当前只剩已登记的
  `fivePlayerTurnUpper=72`、`authorSixTurnUpper=74` 对预算 64 风险而按设计 exit 1。该风险早于本卡、
  不是 initialMagic 播种回归，禁止升预算或删门禁；后续须另开高风险卡拆分 battle-base readiness。

### 功能界面与 E2E 登记

- PAL 入口页实机：空 HP 显示 `继承 150`、空 MP 显示 `继承 100`，页面无入口技能编辑；HP 输入 88 后
  Enter 只产生一次可撤销提交，undo 恢复稀疏空值。
- PAL 角色页实机：当前 / 最大体力、当前 / 最大真气四项独立显示；初始仙术可添加且 undo 回到一项。
  1100x800 下 body / document / main 均无横向溢出，内部滚动可达初始仙术卡；全新页签控制台零 error。
- PAL 代表运行 E2E 已登记：`new-game` 应从李逍遥角色定义得到 150/150、100/100 与技能 296；后续
  赵灵儿首次 `setParty` 应得到其完整 `initialMagic`，离队归队和 SAVE8 重开不得重播。状态链已由本卡
  content / reforge 集成测试覆盖；剧情观感继续按项目纪律进入代码冻结后的集中 E2E。

## 推进签字

### draft -> build

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | **verified** | **agree** | 2026-08-25 独立直读 `reference/sdlpal/global.c:427-465`、`packages/game/src/core/game-state.ts:1394-1431`、`packages/content/src/actor.ts:67-82` 与 `packages/content/src/character.ts:52-63,218-249`；确认当前/最大值独立、角色表持技能、当前二阶段技能双写且 runtime 只认入口副本。用户已裁决按冻结合同消除双写。 |
| Kimi | **verified** | **agree**（附 KS1-KS3） | 2026-08-25 按冻结合同重签：端到端调用链直读核实（initialMagic 零 runtime 消费、入队播种缺口、离队/读档不覆盖逐点验证），见下方「Kimi 冻结合同重签节」 |
| GLM | **verified** | **agree**（附 GSeed1-GSeed3） | 2026-08-25 按冻结合同独立重签——primary source（global.c:427-465）/当前端到端链/双写现状/带伤开局 demo 实证/首次入队缺口全部一手核实，见 GLM 冻结合同重签节 |

**准入结论：build allowed（2026-08-25，Codex + Kimi + GLM 按冻结合同三签齐）。** GSeed1-GSeed3 与 KS1-KS3 为 build 必落钉；schema 切换、迁移与旧路径删除须同卡一次完成。

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | **accept** | 2026-08-25 自审 + 独立只读压力审查无 P0-P2；content 432、editor 1122、reforge 842、migrate 355 全绿，四包 typecheck 与 DS gate 通过；PAL replay / 二跑零计划，1100px 实机与撤销闭环通过。 |
| Kimi | **accept** | 2026-08-25 独立终审 0558819e：①播种合同双落点——`seedActorInitialSkills` 以键严格 `undefined` 为首次判据、深拷贝 initialMagic、无 battler fail-loud，同挂 buildWorld 与 applySetParty（character.ts:178-190,214-218,244）；已有空数组/离队归队/学忘/读档不重播，异步 setParty 原子提交 party+reserve+learnedSkills（main.ts:3247-3279）；②schema——StartWorld.learnedSkills 删除且 validator 拒未知字段，CONTENT_VERSION=18，SAVE8 envelope 不变（save/types.ts:13,45）；③迁移——pal-manifest 停写入口技能，demo 345 迁入角色 initialMagic（demo actors.json 实测 ['296','298','299','345']），三 manifest 均 content18 且无 learnedSkills 键；本人复跑 dry-run replay 537/0/0/0/0；④编辑器——入口页“当前 HP/MP、留空继承（继承 150/100 占位提示）”、无最大值输入无技能行；ActorMode 独立编辑当前/最大与初始仙术且可 undo；⑤loader 硬门 initialMagic→skills（project-loader.ts:247-248）+ actor validator 拒空/重复 id；⑥census 零命中配置侧 learnedSkills；KS1-KS3 全部落地。聚焦复跑：content/validate/save/loader/ProjectWorkbench/ActorMode 190/190 + migrate 14/14 全绿；全量采纳卡内记录未重复 |
| GLM | **accept** | 2026-08-25 done 前终审（提交 0558819e，95 文件 +879/-655）：**GSeed1 ✓**——`seedActorInitialSkills` 以 `learnedSkills[instanceId] !== undefined` 为唯一触发（character.ts），注释明示"已有键（包括空数组）表示运行进度，绝不重播"；applySetParty 首次入队（不在 party 也不在 reserve）才 instantiate+播种，reserve 搬回原样不触发；测试矩阵超钉——"已有空技能键首次入队也不重播"/"离队进 reserve 状态不丢"/"离队后学习/遗忘进度归队不被出厂技能覆盖"/"入队中途失败不留半提交"全在（character.test）；**GSeed2 ✓**——三工程 manifest `startWorld.learnedSkills` 全删（本人 node 复核 pal/demo/e2e-own）；pal-manifest.ts 迁移侧零命中；本人复跑 replay `managed=537 writes=0 deletes=0 conflicts=0`；六角色 initialMagic 逐项对照本人留档基线全吻合（1/10/2/10/10/7；jiu-jianxian/li-daniang 为 C1-3 NPC 无 battler 非原始表）；demo 的 4 技能副本已同步删且 seedStats hp:100/mp:30 保留（带伤开局语义保持）；**GSeed3 ✓**——UI 落于 ProjectWorkbenchTab"开局当前状态"区：DsHelpTip 明示"只覆盖开局当前 HP/MP；留空即继承角色定义的当前值，最大值始终由角色定义持有"+ 每字段 `placeholder=继承 N` + `aria-label=留空继承 N`（继承不可用降级）；无 maxHP/maxMP 入口控件；seedStats 稀疏形状（空对象删除键）+ "seedStats 的 0 是有效当前值"专项测试。focused content 140 tests + 双 typecheck 全绿（全量 146/1122 采纳记录）。 |

**done 准入结论：三方 `accept` 已齐且无 `counter`；任务保持 `review`，等待用户最终验收后由 Codex 收口。**

## 下一位 Agent 提示词

#### 当前交接状态（2026-08-25）

实现保持 `review`；Codex、Kimi、GLM 三方 `accept` 已齐且无 `counter`。当前没有待转交的审查席位，
等待用户对“当前 HP/MP 稀疏覆盖 + 角色定义持有完整初始状态”做最终验收后，由 Codex 标记 `done`。

#### 无下一位 Agent 提示词（当前）

三方实现终审已完成；等待用户最终验收 / 收口。

#### Kimi / GLM 合并实现终审提示词（历史，已完成）

> 请对任务卡 `docs/ops/tasks/ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state.md` 做 `review -> done`
> 合并终审，并把各自结论直接写回任务卡签字表。先完整阅读 `AGENTS.md`、`CLAUDE.md`、
> `docs/phase2/READ-FIRST.md`、本任务卡及其 Build / Review 证据，再审当前分支最新一笔本卡实现提交。
> 当前阶段只读审查，**不得修改实现文件、不得自行标记 done**。Kimi 重点核对 schema / save / runtime：
> `ActorDef` 单一 owner、`=== undefined` 首次播种、空数组与离队/归队/读档不重播、异步 setParty 失败
> 原子性、loader 硬引用门、debug 旁路和 current-only content18。GLM 重点核对数据 / 迁移 / 覆盖：demo
> 技能 345 语义闭包、PAL 只改上游并 replay + 二跑零计划、配置侧旧字段零残留、测试矩阵与 1100px
> 浏览器证据。两席都须确认 SFX 77/83 只是更新后的 legacy 全量预载反证，审计仍因既有 72/74 风险
> exit 1，禁止通过升 64 或删门禁消音。请各自输出并写回 `accept`，或签 `counter` 并给出精确
> `file:line`、复现命令和必改项；三方 accept 齐后才可由 Coding Owner 收口 done。

#### 合并设计复审提示词（历史，已完成）

> 请复审 `docs/ops/tasks/ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state.md` 的冻结合同，并把结论直接写回任务卡。先完整阅读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、`docs/phase1/game-mechanics.md`、本任务卡，以及卡内列出的一手代码锚点。用户已于 2026-08-25 裁决：`ActorDef` 持有等级、当前/最大 HP/MP 基线、属性、装备和初始技能；入口 `seedStats.hp/mp` 仅是开局**当前值**稀疏覆盖，空值继承角色，入口绝不持有 `maxHP/maxMP`；删除配置侧 `StartWorld.learnedSkills`，角色首次实例化时从 `ActorDef.battler.initialMagic` 深拷贝到运行时 `WorldState.learnedSkills`，离队/归队、读档不得重新播种。请独立核对至少一处 primary source 与当前端到端调用链，重点检查：①新游戏与后续首次入队均能初始化技能；②运行时学习/遗忘与保存重开不被覆盖；③迁移只改上游并删除旧 schema、fixture、fallback，PAL 完整重迁且二次运行零 diff；④编辑器明确“当前值/继承”，不把最大值或角色快照塞回入口；⑤ED-PROJECT-STARTUP-IA-1 只消费冻结 ownership，不代做本卡 schema。请分别输出并写回有效的 `premise verified + design agree`，或 `counter`、直接证据与必改项。**签字齐前不得修改实现/schema/生成器/projects/pal，不得标记 build 或 done。**

#### Kimi 独立审查（2026-08-24，架构/schema；原版 raw 表 + sdlpal + 一阶段 + 当前调用链全部直读）

**逐字段所有权矩阵（真值已核清，关键项无 unknown）：**

| 字段 | 原版 owner | 一阶段 | 当前二阶段 | 可由成长/装备/定义推导？ |
|---|---|---|---|---|
| 等级 | PlayerRoles 表 authored（roleId 0 = 1） | hydrate 拷贝（game-state.ts:1402） | `ActorDef.battler.baseStats.level`（actors.json li-xiaoyao level:1；instantiate 展开 baseStats，character.ts:168-179） | 否（成长表只在升级时加）；唯一 owner=角色定义 |
| 主经验 | memset 0（global.c:455） | 同（loadDefaultGame） | instantiate `exp: 0` 固定 | 是（常量 0）；无入口语义 |
| 隐藏经验 | 八类 wLevel=角色等级（global.c:455-465；game-mechanics.md:65） | 同 | `hiddenExp` 缺省=全 0（character.ts:120-125） | 可由等级推导；与原版初值不同属二阶段已接受的语义差（不改变玩法正确性，记录在案） |
| HP/MP | 角色表 authored（150/150、100/100 满） | hydrate（:1403-1406） | `baseStats` 基线 + `StartWorld.seedStats` 可选稀疏覆盖，buildWorld 先实例化后覆盖（character.ts:223-230） | 基线 owner=角色定义；入口覆盖已有真实使用例（demo seedStats hp100/mp30），空值=模板值（schema 注释 character.ts:62-63） |
| 基础属性（攻/防/灵/身法/吉运） | 角色表绝对值（33/32/20/28/32） | hydrate（:1407-1411） | `baseStats` 绝对值（非 modifier） | 否；装备加成运行时 live 派生不持久；owner=角色定义 |
| 装备 | 角色表 equipment[6]（196/225/208/166/235/249） | hydrate 6 槽（:1420-1425） | `battler.initialEquipment`（actor.ts:81；instantiate 拷贝进实例，character.ts:176） | 否；owner=角色定义；无任何“同角色按入口不同装备”证据 |
| 初始技能 | 角色表 magic[32] sparse（296） | hydrate 32 槽（:1426-1431） | **双写**：`battler.initialMagic`（actor 级，migrate-content.ts:311 自角色表迁入）+ `StartWorld.learnedSkills`（入口级，PAL manifest 同为 ['296']） | 原版唯一真值=角色表；当前 runtime `buildWorld` 只消费 `learnedSkills`（character.ts:245-247），`initialMagic` 仅被 editor 引用索引与 audit 消费（validate-refs.ts:1191-1196、battle-data-references.ts:52-56、audit-sfx-readiness.mts:219）——双权威中 actor 级在 runtime 无效 |

**序列化位置**：存档保存完整运行时 world（含实例化后的等级/HP/装备/技能），不回存配置；配置侧序列化 =
manifest entryPoints[].startWorld + actors.json，各自无对方字段副本（除上述技能双写）。
**新游戏应用时点**：boot 选择入口后 `buildWorld(entry.startWorld, actorsById, …)`（main.ts:657）。
**队伍**：入口持 `party` id 列表与顺序；成员状态全部来自角色定义——与原版“队伍清零、脚本装配、成员状态查表”同构。

**可证伪观察**：
- 若原版存在第二套按开局路径切换的初始角色数据（如二周目表），“角色定义唯一 owner”被推翻——
  DATA.MKF 只有一张 PlayerRoles 表，sdlpal 全局只有 PAL_LoadDefaultGame 一条新游戏链，未见。
- 若 runtime/editor 存在绕过 `learnedSkills` 直接以 `battler.initialMagic` 建世界的路径，双权威就有
  实际 runtime 语义、不能简单删一边——buildWorld 直读未见；GLM 复核时可全量 census `initialMagic`
  消费点。
- 若某真实工程需要“同角色不同入口不同装备/属性/技能”，稀疏覆盖字段集必须扩大——当前 PAL 单
  入口、demo 单人，除 seedStats hp/mp 外无真实使用。

**候选 before -> after（证据支撑版，待用户裁决，非实现合同）**：
- before：初始技能双写（actor.initialMagic 与 entry.learnedSkills 同值并存，runtime 只认后者）；
  入口 HP/MP 覆盖存在但空值语义无 UI 解释；等级/属性/装备在角色定义（本身健康）。
- after 候选：角色本体收敛为等级/属性/装备/初始技能的唯一权威；入口只保留队员选择与顺序 +
  有真实需求的稀疏覆盖（当前仅 HP/MP）；UI 对空覆盖显示“继承角色定义（如：满 HP/MP）”。
  具体字段集合、learnedSkills 与 initialMagic 的合并方向（单一字段落哪一侧）必须经用户裁决后
  再走三签，本卡不在此阶段给 schema 实现。

**结论：premise verified（真值矩阵四向全部 verified）；design 不签——设计问题清单 1/5 的裁决
（初始技能双写合并方向）与用户可见 before->after 需用户先拍板。build 继续 blocked。**

#### 原提示词（历史保留）

> 请审查任务卡 `docs/ops/tasks/ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state.md`。先完整阅读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、`docs/phase1/game-mechanics.md` 与 `docs/phase1/engineering-notes.md`，然后独立追踪原版提取数据、一阶段新游戏初始化和当前 `packages/content/src/character.ts` 调用链。请逐项回答等级、经验、HP/MP、基础属性、装备、技能的唯一 owner、默认 / 继承规则和可证伪观察，并把精确 `file:line` 写回真值矩阵。当前关键前提为 unknown，**不得开始实现、不得修改 schema / 生成器、不得标记 build 或 done**。输出有效的 `premise verified + design agree`，或给出 `counter` 与缺失证据。


#### GLM 数据矩阵（2026-08-24；与 Kimi 独立互证，非复述；只出候选，不签 design）

**本人一手核验**（原版 raw 表 + sdlpal global.c + 一阶段 hydrate + 当前 schema/buildWorld）：

| 字段 | 原版 owner（一手） | 当前二阶段 | GLM 候选 |
|---|---|---|---|
| 等级 | PLAYERROLES（global.c:428 整表拷贝） | BattlerSpec.baseStats.level（actor.ts:70） | 角色本体 ✓（现状已正确） |
| HP/MP | PLAYERROLES hp/mp；**roleId 1 = hp 28/maxHP 240——原版自带带伤开局实证** | baseStats + seedStats 覆盖（character.ts:227-229 条件应用） | 角色 baseStats 默认 + 入口稀疏覆盖（带伤开局合法）；空值=继承角色默认（语义已实现，UI 未表达） |
| 五维属性 | PLAYERROLES 各字段 | baseStats（actor.ts:75-79） | 角色本体 ✓ |
| 装备 6 槽 | PLAYERROLES equipment（roleId 0=[196,225,208,166,235,249] 本人解出） | initialEquipment（actor.ts:81） | 角色本体 ✓ |
| 法术 32 槽 | PLAYERROLES magic（roleId 0 magic[0]=296） | initialMagic（actor.ts:82）+ StartWorld.learnedSkills ——**双重表达**（与 Kimi 待裁决项一致） | 用户裁决：出厂 vs 剧情学会边界 |
| 抗性/合击/守护 | PLAYERROLES | cooperativeMagicSkillId/coveredBy（actor.ts:85-88） | 角色本体 ✓ |
| 现金 | dwCash=0（global.c:436） | StartWorld.money | 入口 ✓ |
| 队伍 | 开场脚本装配 | StartWorld.party | 入口 ✓ |

**与 Kimi 的差异/增量**：Kimi 已核"sdlpal 装备槽 SoA 语义 + 8 类 wLevel"——本人增量
为 ①roleId 1 hp=28/240 带伤开局的一手数据实证（直接支持最强替代解释成立，HP/MP 覆盖
是原版合法语义而非残缺 schema）；②迁移覆盖问题（learnedSkills vs initialMagic 在 PAL
生成器是否双写）列为 build 期核项。

**候选 before -> after（等用户裁决）**：
- before：入口 HP/MP 空框无继承提示；等级/装备/属性不可见。
- after 候选：**不新增**等级/装备/属性入口字段（原版/一阶段均无按入口差异证据）；
  入口保留 party 顺序 + money + learnedSkills + seedStats（hp/mp 稀疏覆盖带"空=继承角色
  默认"提示）；角色页为等级/属性/装备/法术出厂值的唯一作者入口。

**重复所有权检查**：baseStats/initialEquipment/initialMagic 均单点持有于 ActorDef，
buildWorld 只实例化+条件覆盖——无派生快照固化；唯一双表达 = learnedSkills vs initialMagic。


#### GLM 冻结合同重签（2026-08-25；独立核验，非沿用旧签）

**premise verified——五项独立核验：**

1. **primary source 重核**：`PAL_LoadDefaultGame`（global.c:427-465）把 PlayerRoles 整表
   （含 HP/MP 当前值与最大值的**独立字段**、魔法 32 槽）拷入运行时——当前值与最大值在
   原版就是分开的两个 per-role 字段（roleId 1 = hp 28 / maxHP 240），**入口"当前值覆盖、
   最大值归角色"的合同与原版结构一致**，非新发明。
2. **当前端到端链直读**：`buildWorld`（character.ts:213-249）先 instantiate 再条件应用
   seedStats hp/mp（**已实现"空=继承"语义**），`learnedSkills` 直接从
   `startWorld.learnedSkills` 深拷贝（:245-246）——runtime 只认入口副本，双写属实。
3. **双写现状 census（三工程）**：PAL `startWorld.learnedSkills={li-xiaoyao:[296]}` vs
   ActorDef 六角色全部已有 `battler.initialMagic`（本人 node 逐角色枚举：li=[296]、
   zhao=[312,316,...10 项]、lin=[298,337]…）——**配置侧双写且只有初始队员有入口副本**。
4. **带伤开局工程实证（本人一手）**：demo 工程 seedStats `hp:100/mp:30` vs 角色表
   `maxHP:150/maxMP:100`——当前值低于最大值正是合同条款 2 的"带伤/缺蓝开局"活用例；
   该语义在编辑器 UI 未说明（卡文 before 属实）。
5. **首次入队缺口实证（合同条款 5 的现状依据）**：PAL `learnedSkills` 只有 li-xiaoyao
   一个键——zhao-linger 等五名非初始角色首次入队时 `world.learnedSkills[actorId]`
   不存在；运行时 `learnSkill` 有 `??= []` 防空（main.ts learnSkill 回调）但**只会追加
   学到的技能，不会播种 initialMagic**——非初始角色入队即"裸技能"出场。条款 5"首次
   入队必须初始化"正是修此缺口。

**design agree（附 GSeed1-GSeed3）：**

- **GSeed1（首次入队播种的唯一时点机检）**：入队/首次实例化播种的判定必须以
  `world.learnedSkills[actorId] === undefined` 为**唯一**触发（防"离队清空后归队重新
  播种覆盖已遗忘技能"——条款 5 负例）；测试矩阵须含——新游戏初始队、**非初始角色
  首次入队（重点）**、离队→学习遗忘→归队（进度不丢）、保存重开（运行时技能从存档
  恢复不重播种）、多入口同角色（seedStats 稀疏差异正确）。
- **GSeed2（迁移收口与二次零 diff）**：`pal-manifest.ts` 停止写
  `learnedSkills: {'li-xiaoyao':['296']}`（当前 :52 一处，Codex 已定位）；ActorDef 的
  `initialMagic` 已在生成器输出中（六角色全有）——迁移只删入口侧副本；重迁后
  `startWorld.learnedSkills` 键为空/字段删除、三工程（pal/demo/e2e-own——demo 有
  4 技能入口副本需同步删）二次运行零计划；demo 的 seedStats hp/mp 保留（当前值语义）。
- **GSeed3（编辑器 UI 语义显式化）**：入口 HP/MP 控件必须标注"当前值 · 空白 = 继承
  角色默认（如 李逍遥 150/150）"——我核实的 demo 100/30 用例说明作者确实在用带伤开局，
  UI 不说明继承来源即误导（用户此前把当前值误解为最大值正是此因）；不得出现
  maxHP/maxMP 输入框。

**边界确认**：ED-PROJECT-STARTUP-IA-1 明确"不修改 StartWorld schema；角色等级/装备/
属性来源由本卡决策"（:30）且"角色 seed schema 完整留在本卡"（:141）——该卡只消费
冻结合同，未代做 schema。

**可证伪观察**：①若实现中入队播种以"角色不在 party"而非 learnedSkills undefined
  触发，离队归队即重播种（GSeed1 负例拦截）；②若重迁后任一工程 learnedSkills 残留或
  initialMagic 丢失（对照六角色清单快照：li=[296]/zhao=10 项/lin=[298,337]/wu=10 项/
  anu=10 项/gai=7 项——本节留档为 diff 白名单基线）；③若编辑器出现 maxHP/maxMP 入口
  控件（GSeed3 拦截）。
#### Kimi 冻结合同重签（2026-08-25；按用户裁决独立核验，非沿用旧签）

**premise verified（新证据，在 2026-08-24 真值门之外增量直读端到端调用链）**：

1. **初始技能双写与 runtime 单消费（复核+增量）**：PAL 当前 `battler.initialMagic` 六角色齐全
   （li=['296']、zhao=10 项、lin=['298','337']、wu=10 项、anu=10 项、gai=7 项——本人直读
   actors.json），而入口 `startWorld.learnedSkills` 只有 `li-xiaoyao:['296']`；
   **reforge 生产码对 `initialMagic` 零消费**（grep 排除 test/fixtures 后零命中）——
   初始技能配置真值只有角色表一侧被迁移，runtime 播种只认入口副本，合同第 4 条的删除方向
   （删入口副本、从 initialMagic 播种）是唯一不丢数据的方向。
2. **首次入队播种缺口真实存在**：技能播种当前只在 `buildWorld` 发生（character.ts:245-247）；
   后续入队走 `applySetParty`（character.ts:189-211）+ `instantiate`（:168-179），均不触碰
   `world.learnedSkills`；当前 PAL 中灵儿/月如等的 authored 初始技能因此完全依赖脚本
   `learnSkill` 或根本不到达 runtime（仅 6 个场景文件含 learnSkill）。冻结合同第 5 条
   “新游戏和后续首次入队都必须初始化”正中该缺口。
3. **离队/归队、读档不覆盖的现有语义**：`applySetParty` 以模板 id 池化保留既有实例
   （:194-210，离队进 reserve 不清数据）；`learnSkill` 只增不重置（main.ts:3208-3217，
   `??= []` + 去重 push）；`battle-session.ts:2522-2525` 的 lifetimeLimit 遗忘只删条目；
   读档恢复完整 world（save/types.ts:39-47），不经过 buildWorld——运行时技能进度不被
   覆盖的结论在当前代码链上成立，合同第 5 条只是把它钉成不变式。
4. **编辑器现状**：入口 seedStats 编辑确为 hp/mp 输入（ProjectWorkbenchTab 的
   StartWorldFields 区），无 maxHP/maxMP 控件；冻结合同要求补的是“当前值/空=继承角色定义”
   文案与删除初始技能行，属 UI 表达而非新 schema。
5. **ED-PROJECT-STARTUP-IA-1 边界**：该卡范围外明示“不修改 StartWorld schema；角色来源由
   本卡决策”，只消费冻结 ownership，未代做本卡 schema——直读其卡面确认。

**design agree（附 KS1-KS3，build 必落钉）**：
- **KS1（播种单一落点）**：`instantiate()` 看不到 `WorldState`，播种帮助函数必须同时被
  `buildWorld`（初始队伍）与 `applySetParty`（后续首次入队）调用，且以
  `world.learnedSkills[actorId] === undefined` 为“首次”判据——已有条目（含运行时学/忘后的
  形状）一律不重播种。两调用点各配一条播种 + 一条不重播种测试。
- **KS2（current-only 切版清单）**：删除 `StartWorld.learnedSkills` 须同卡完成——
  CONTENT_VERSION 升版；PAL 生成器停写入口 learnedSkills；demo 入口的
  `['296','298','299','345']` 迁入 demo 角色定义 initialMagic；e2e-own fixture 同步；
  validate-refs 的 entryPoints.startWorld.learnedSkills 校验、audit-sfx-readiness、
  editor StartWorldFields 技能行全部删除；PAL 完整重迁 + dry-run 二次零计划。
- **KS3（编辑器继承语义文案）**：入口 HP/MP 控件必须显示“当前值”与空态继承来源
  （如“留空 = 继承角色定义，当前为满值 150/100”）；不得出现 maxHP/maxMP 输入或
  “从角色复制快照”类动作（防止把派生值固化进入口）。

**可证伪观察**：若 `applySetParty`/`buildWorld` 之外存在第三条实例化路径（如读档重建实例），
播种合同漏盖——grep 未见，GLM 可复核；若 demo 或其他工程的初始技能无法由角色定义表达
（如按入口给不同技能），删除入口副本即丢语义——当前三工程均可由 initialMagic 承载；
若种子判据用“是否在队”而非 learnedSkills 条目存在性，离队归队即重播种（KS1 负例拦截）。
- 2026-08-25 GLM（终审）: 按冻结合同完成 done 前终审并签 **accept**。GSeed1 播种唯一时点
  + 超钉测试矩阵（空键不重播/离队归队保进度/中途失败零半提交）；GSeed2 三工程 learnedSkills
  删除 + 迁移零双写 + replay 537 零计划 + 六角色 initialMagic 基线全吻合 + demo 带伤开局
  seedStats 保留；GSeed3 UI"开局当前状态"区 HelpTip+placeholder+aria 三层继承说明、无最大值
  控件、0 值有效专项。focused 140+双 typecheck 全绿。未改实现，未代签 Kimi，未标 done。
