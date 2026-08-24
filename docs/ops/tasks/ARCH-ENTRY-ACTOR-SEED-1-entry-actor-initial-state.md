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
| 原版 / primary source | 原版新游戏角色等级、经验、HP/MP、装备和基础属性的初始化所有权尚未逐项核清；不能仅凭编辑器缺字段推断应落在入口 | `packages/pal-extract/src/resources/parsers/player-roles.ts`；`data/extracted/data/player-roles.json`；原版新游戏初始化调用链待补行号 | **unknown / blocked** |
| 第一阶段 | 一阶段新游戏创建、角色成长与装备初始化的权威来源尚未逐项核清 | `packages/game/src/core/game-state.ts`；相关 new-game / role 初始化测试待补精确行号 | **unknown / blocked** |
| 当前二阶段 | `StartWorld` 只提供 `party`、`money`、`learnedSkills`、`inventory`、`resources` 与仅含 `hp/mp` 的 `seedStats`；`buildWorld` 先实例化角色，再应用 HP/MP 覆盖 | `packages/content/src/character.ts:52`、`packages/content/src/character.ts:73`、`packages/content/src/character.ts:213`；`packages/content/src/validate.ts:87` | verified |
| 本任务目标 | 只保留不可从角色定义 / 成长 / 装备重算且确实需要按入口变化的稀疏覆盖；具体字段集合必须由前三向证据决定 | 本卡“目标”与“验收标准” | pending |

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
| Kimi | pending | pending | 需独立核架构与原版 / 一阶段初始化调用链 |
| GLM | pending | pending | 需独立核数据表、代表角色与迁移覆盖 |

**准入结论：不满足。禁止修改实现、schema、生成器或 `projects/pal`。**

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | pending | — |
| Kimi | pending | — |
| GLM | pending | — |

## 下一位 Agent 提示词

> 请审查任务卡 `docs/ops/tasks/ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state.md`。先完整阅读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、`docs/phase1/game-mechanics.md` 与 `docs/phase1/engineering-notes.md`，然后独立追踪原版提取数据、一阶段新游戏初始化和当前 `packages/content/src/character.ts` 调用链。请逐项回答等级、经验、HP/MP、基础属性、装备、技能的唯一 owner、默认 / 继承规则和可证伪观察，并把精确 `file:line` 写回真值矩阵。当前关键前提为 unknown，**不得开始实现、不得修改 schema / 生成器、不得标记 build 或 done**。输出有效的 `premise verified + design agree`，或给出 `counter` 与缺失证据。
