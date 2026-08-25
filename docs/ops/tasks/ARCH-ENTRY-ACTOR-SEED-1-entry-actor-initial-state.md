# ARCH-ENTRY-ACTOR-SEED-1 入口角色完整初始状态所有权与快照模型

> **状态**：draft（前提真值门未完成，禁止进入 build）
> **负责人**：Codex（Coding Owner，待准入）
> **参与审查**：Kimi（架构 / schema）、GLM（原版与数据覆盖）
> **能力格**：X7 项目数据与持久化语义
> **风险级别**：高（schema / save / migration / 新游戏初始化）

## 目标

明确“入口角色在新游戏开始时的等级、经验、HP/MP、基础属性、装备与技能”分别由哪一层持有，并在证据闭环后建立单一、稀疏且可解释的初始化模型。编辑器只能编辑权威输入，不得把可由角色定义、成长曲线或装备推导的战斗快照重复保存进入口。

本卡先回答所有权问题，再决定是否修改 schema。关键事实未核清前不得实现。

## 用户可见行为 / 工程前提

当前入口只暴露角色 HP/MP 覆盖，既为空又与角色等级、成长、装备之间关系不明；目标是让“开局设置”准确表达真正属于入口的覆盖项，并把属于角色本体的配置引导回角色页。

### before -> after（待真值门完成后请用户裁决）

- **before**：入口可写空白 HP/MP，但看不到初始等级、经验、装备或属性，也不知道空值继承什么。
- **after 候选**：入口默认只选择队员及顺序；角色本体提供等级 / 成长 / 初始装备等权威配置。只有原版或项目确有“同一角色因入口而不同”的值，入口才保存带明确“继承”语义的稀疏覆盖。

该候选尚未获准成为实现合同；原版与一阶段证据核清后必须再请用户确认。

## 前提真值矩阵

| 方向 | 当前结论 | 一手证据 | 状态 |
|---|---|---|---|
| 原版 / primary source | 新游戏初始化由 `PAL_LoadDefaultGame` 把 DATA.MKF chunk 3 的整张 PlayerRoles 表整体拷入运行时：等级/HP/MP/五维属性/装备 6 槽/魔法 32 槽全部为该表的 per-role 静态 authored 值；主经验 memset 0、八类隐藏经验 wLevel 初始化为角色等级；金钱/背包/队伍清零，队伍由开场脚本装配 | `reference/sdlpal/global.c:378-465`（PAL_LoadDefaultGame）；`data/extracted/data/player-roles.json` roleId 0（level 1、HP/MP 150/100 满、33/32/20/28/32、equipment [196,225,208,166,235,249]、magic[0]=296）；`docs/phase1/game-mechanics.md:65` | verified（Kimi 2026-08-24 直读） |
| 第一阶段 | 一阶段忠实同一链：`hydratePlayerRolesRuntime` 把 player-roles.json 基线逐字段拷入 PlayerRolesRuntime（等级/HP/MP/属性/装备/魔法 SoA）；`loadDefaultGame` 对齐 PAL_LoadDefaultGame 清零进度字段并设 8 类经验 wLevel=角色等级 | `packages/game/src/core/game-state.ts:1384-1442`（hydrate）；`packages/game/src/core/game-state.ts:1444-1465`（loadDefaultGame）；`docs/phase1/game-mechanics.md:65` | verified（Kimi 2026-08-24 直读） |
| 当前二阶段 | `StartWorld` 只提供 `party`、`money`、`learnedSkills`、`inventory`、`resources` 与仅含 `hp/mp` 的 `seedStats`；`buildWorld` 先实例化角色，再应用 HP/MP 覆盖 | `packages/content/src/character.ts:52`、`packages/content/src/character.ts:73`、`packages/content/src/character.ts:213`；`packages/content/src/validate.ts:87` | verified |
| 本任务目标 | 只保留不可从角色定义 / 成长 / 装备重算且确实需要按入口变化的稀疏覆盖；具体字段集合必须由前三向证据决定 | 本卡“目标”与“验收标准” | 候选已形成，待用户裁决（见下方 Kimi 独立审查节） |

### 最强替代解释

当前 HP/MP 并非残缺 schema，而是刻意支持“带伤开局”之类的入口级覆盖；等级、属性、装备则始终属于角色定义或运行时推导。若原版与一阶段证据支持此解释，正确修复应是补清继承提示、移除误导性的空输入，而不是把全部角色快照搬进入口。

### 什么观察会推翻当前候选

若发现同一角色在不同入口必须以不同等级、装备或基础属性开始，且该差异无法由场景脚本或角色定义表达，那么入口必须支持相应的稀疏覆盖；若所有入口都从同一角色定义与成长公式构造，则不得新增这些入口字段。

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

## 设计问题清单（真值核完后逐项裁决）

1. 初始等级与经验由 ActorDef、入口还是脚本持有？
2. HP/MP 空值的精确定义是“满值 / 按等级推导 / 保留定义值”中的哪一种？
3. 基础属性是否全部由等级、成长曲线、装备推导，是否允许显式覆盖？
4. 初始装备属于角色固有配置还是入口队伍快照？同一角色是否存在入口差异？
5. 初始技能与 `learnedSkills` 是角色级、队伍级还是入口级？现有模型是否重复？
6. 保存 / 撤销 / 重开如何保持稀疏覆盖与继承语义？
7. 迁移生成器如何产出 canonical 数据，如何证明二次生成零 diff？

## 分阶段实施草案（未授权）

1. **truth audit**：完成原版、一阶段、当前二阶段初始化调用链与代表角色数据矩阵。
2. **contract**：给出每个字段唯一 owner、默认 / 继承规则、序列化形状与用户可见文案。
3. **user decision**：提交明确 `before -> after` 与代表入口，请用户确认主动行为变化。
4. **schema + migration**：一次切换到 canonical 版本，重迁 PAL，删除旧字段与 fallback。
5. **editor**：在正确页面暴露权威输入；入口只显示真实入口覆盖。
6. **runtime / tests**：新游戏、保存重开、多入口差异、空值继承、派生属性与装备一致性闭环。

## 验收标准

- [ ] 原版 / 一阶段 / 当前二阶段 / 目标四向矩阵均有精确 `file:line` 或上游一手证据，关键项无 `unknown`。
- [ ] 每个初始字段只有一个权威 owner，并记录默认值、继承、显式覆盖、序列化和运行时应用时点。
- [ ] 三方分别签署有效 `premise verified` 与 `design agree`，且至少一位非 Coding Owner 提供独立证据与可证伪观察。
- [ ] 用户确认最终 `before -> after` 行为。
- [ ] 若修改 schema：当前工程一次性重迁 / 重生成，旧类型、旧 fixture、兼容 fallback 与旧产品入口同步删除。
- [ ] 同一角色默认入口与非默认入口的初始化有自动化测试；入口无覆盖时结果可由角色定义稳定重算。
- [ ] 编辑器不再展示无来源、无继承说明的空 HP/MP 框；字段放置与实际 ownership 一致。
- [ ] 保存、撤销、重开不把派生值固化成冗余快照。
- [ ] 全量验证与 PAL 代表入口 E2E 登记完成。

## 推进签字

### draft -> build

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | pending | pending | 已确认当前二阶段仅有 HP/MP 覆盖；原版与一阶段关键所有权仍 unknown，依法阻塞 |
| Kimi | **verified** | **pending（待用户裁决）** | 2026-08-24 真值门已独立完成：原版/一阶段/当前二阶段逐项 file:line 证据与七问答案见下方 Kimi 独立审查节；初始技能双写（actor.initialMagic vs entry.learnedSkills）为核心待裁决项；不提交 schema 实现，等用户拍板 before->after 后重签 design |
| GLM | **verified** | **pending（待用户裁决）** | 2026-08-24 独立数据矩阵完成，与 Kimi 结论互证（等级/属性/装备/法术=角色表；入口=party+money+稀疏 hp/mp）；发现 roleId 1 原版 hp=28/240 带伤开局实证；learnedSkills 双写待裁决与 Kimi 一致。见 GLM 数据矩阵节 |

**准入结论：不满足。禁止修改实现、schema、生成器或 `projects/pal`。**

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | pending | — |
| Kimi | pending | — |
| GLM | pending | — |

## 下一位 Agent 提示词

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
