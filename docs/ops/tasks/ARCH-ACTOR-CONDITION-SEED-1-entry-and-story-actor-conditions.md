# ARCH-ACTOR-CONDITION-SEED-1 - 入口与剧情入队角色当前状态播种

Status: draft（build blocked：等待 Kimi / GLM 前提与设计签字；`ED-PROJECT-STARTUP-IA-1` 先完成 review 收口）
Phase: phase2
Capability: X7 / C7 / B10 / N3
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both（Kimi 主审 schema / 命令边界，GLM 主审原版数据 / 覆盖矩阵）
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: TBD（签字齐后新建独立 `codex/` 分支；不得在当前 Startup review 分支提前实现）

## 目标

让作者能够为“入口中已经在队的角色”和“剧情脚本刚加入队伍的角色”配置可读、可验证的当前临时状态：
中毒、带回合数的增益 / 减益，以及现有大世界临时毒抗。入口负责该入口的新游戏快照，剧情负责具体事件
发生时的状态变化；两者复用同一状态词汇和运行时 owner，不把状态塞进 `ActorDef`，也不复制装备派生状态或
战斗内百分比属性 buff。

## 范围

- 范围内:
  - `StartWorld` 为每名**开局队员**提供独立的当前 condition seed，至少覆盖：
    - 毒种（作者只选稳定 `PoisonDef.id`；运行时从首次发作 `tickIndex = 0` 开始）。
    - 可从大世界带入下一场战斗的定时 `StatusId + turns`。
    - 现有 `extraPoisonRes` 对应的临时毒抗；不得因前两个例子而遗漏第三种同生命周期 carrier。
  - 剧情脚本增加面向稳定 ActorId 的显式“施加 / 清除角色当前 condition”作者命令；典型顺序是
    `setParty` 完成后再对新成员施加状态。
  - schema、validator、typed 引用、runtime、save/restore 生命周期、editor、migration / current project
    重生成与测试闭环。
  - 入口成员行显示直观摘要 chip，并通过共享弹层 / 抽屉编辑；剧情脚本表单显示中文名称、效果解释和回合数。
- 范围外:
  - 角色等级、经验、当前 / 最大 HP/MP、基础属性、装备和初始技能的 owner；这些已由
    `ARCH-ENTRY-ACTOR-SEED-1` 冻结并收口。
  - 剧情脚本“精确设置指定角色 HP/MP”的新命令；本卡只处理毒、定时状态和临时毒抗。
  - 敌人 / 敌队的战斗初始状态、战场 preset 或每场战斗开场 modifier。
  - `BattlePlayerState.statBuffs` 的 `defense +N%` 等战斗局部属性增益。
- 明确不做:
  - 不给 `ActorDef` 增加默认毒 / 默认 buff；否则同一角色在所有入口和首次实例化路径都会被污染。
  - 不给 `setParty` 增加隐式状态参数，也不改变其现有 party / reserve 身份与状态保留合同。
  - 不暴露毒的内部 `tickIndex`、原版 role 下标、事件对象号或裸状态枚举给普通作者。
  - 不把装备 `grantStatus`、派生属性、临时战斗 `statBuffs` 固化进入口快照。
  - 不直接手改 `projects/pal`；若 schema 切版，只修迁移 / 生成上游并完整重迁。
  - 不重开已完成的 `ARCH-ENTRY-ACTOR-SEED-1`、C7 reserve 或 B10 毒机制卡。

## 前提真值门

### 一句话行为 / 工程前提

入口状态属于所选入口的新游戏当前快照；剧情入队状态属于具体事件脚本。角色首次入队的基础值继续来自
`ActorDef`，离队 / 归队继续搬运 reserve 原实例；`setParty` 只负责阵容，毒与状态由独立、具名目标命令表达。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 队伍、玩家定时状态和毒是三份独立全局结构；`0x75` 只重建队伍，随后按原版副作用清毒并重建装备效果。施毒 `0x29` 与设状态 `0x2D` 是独立 opcode，可在队伍调整后按脚本时序执行。战后清全部定时状态、清可解毒和 Extra；读档也主动清毒与玩家状态。 | `reference/sdlpal/global.h:521-547`；`reference/sdlpal/script.c:1257-1284,1367-1374,2164-2196`；`reference/sdlpal/battle.c:1822-1830`；`reference/sdlpal/global.c:626-631,930-953` |
| 第一阶段 | 一阶段忠实实现 `0x75`、`0x29`、`0x2D` 的独立时序：队伍调整与施毒 / 状态不是一个字段或命令；`0x75` 原版路径清毒。 | `packages/game/src/core/event-system.ts:4629-4685,4935-4951`；`packages/game/src/core/event-system.test.ts:4472-4482` |
| 当前二阶段 | `StartWorld` 只有 party / money / inventory / resources 与当前 HP/MP `seedStats`；`buildWorld` 不播种 condition。`setParty` 只有 members，首次入队从 ActorDef 实例化，reserve 归队保留原实例；作者脚本没有施加毒 / 状态命令。运行态已有 `poisons`、`extraStatuses`、`extraPoisonRes`，可带入战斗，战后清理；restore 仍显式清除三者。 | `packages/content/src/character.ts:52-60,99-139,164-175,190-245`；`packages/content/src/script.ts:122-125,234-236`；`packages/content/src/validate.ts:87-127`；`packages/reforge/src/main.ts:2292-2300,2612-2619,3185-3201,3247-3279,5691-5696` |
| 本任务目标 | 保留现有 ActorDef / StartWorld / setParty / reserve owner；为入口增加独立 per-member condition seed，并为剧情增加具名 ActorId condition 命令。两条作者入口落到现有三类 World carrier；大世界、入战、战后和读档生命周期不另造第二套规则。 | 本卡 `before -> after`、设计结论与验收条件；用户 2026-08-26 确认按此 ownership 开卡 |

### 反证与替代解释

- 最强替代解释:
  - 只在 `ActorDef` 增加“默认状态”看似更省 schema，但会让角色在所有入口和任何首次实例化路径都带同一状态，
    无法表达“这次剧情入队时受伤 / 中毒”，因此 owner 错误。
  - 把状态字段直接塞进 `setParty` 可让一条命令完成入队，但会混淆“阵容替换”和“事件效果”，并在 reserve
    归队时产生“是否重新初始化”的歧义；原版 / 一阶段也用独立命令表达。
  - 只做入口 UI 不做剧情命令，会让后续入队角色仍无法表达同类状态，形成第二个能力缺口。
- 什么观察会推翻当前前提:
  - 若 primary source 或现有迁移内容证明某类状态本质是角色模板永久属性、装备 live 派生或战斗 encounter
    modifier，而非 `CharacterInstance` 当前 condition，则该类必须从本卡移除。
  - 若 `extraStatuses` 中某个 `StatusId` 在大世界携带或从首回合开始时语义无效，不能直接开放整个 union，须用
    单一 typed registry 建立可携带 allowlist。
  - 若剧情必须在角色尚未实例化前写状态，当前“`setParty` 后施加、目标必须存在”的方案需退回重审；不得用
    隐式 pending seed 绕过。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: runtime carrier 和 battle bridge 已存在，缺口位于入口 schema 与作者命令，不是战斗状态计算缺失。
  - 原版 / 第一阶段理解: 已确认 party、poison、status 是独立命令域；当前 C7 reserve 保留是既有产品裁决，本卡不重开。
  - extractor / 地图 / 数据解码: 当前无迁移红项证明；如 PAL 内容需新命令，必须先从 opcode 直接证据核对再改 translator。
  - audit / test model: “运行时字段存在”不等于“作者可配置”；能力地图的能编判据要求 UI、保存与引擎消费全链闭合。

### 用户可见偏离

- 是否主动偏离已核真值: no（新增作者能力并沿用当前 runtime 生命周期；不改变已冻结 C7 / B10 行为）
- `before -> after` 一句话: 入口和剧情只能得到无 condition 的新角色 → 入口可为开局成员配置当前 condition，剧情可在 `setParty` 后给具名新成员施加 / 清除同一 condition。
- 代表场景:
  - 入口把李逍遥设为“赤毒 + 护体 7 回合”：新游戏立即形成当前状态，下一战按现有规则带入，战后按现有三件套清理。
  - 剧情先把赵灵儿加入队伍，再对 `zhao-linger` 施加“中毒”或“护体 N 回合”；离队 / 归队仍遵守 reserve 原实例保留，不由 `setParty` 重新播种。
- 用户裁决: 2026-08-26 用户认可“入口归入口、剧情归脚本”的 ownership 并要求开卡；读档清除与具体可携带状态 allowlist 仍须由三方用一手证据复核后再授权 build。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `ARCH-ENTRY-ACTOR-SEED-1` 已 done：ActorDef 持有角色基线；入口只持当前快照稀疏覆盖，不复制派生值。
  - C7 / D22 已 done：`setParty` 在 party / reserve 间搬实例，离队 / 归队不清状态；本卡不重开该产品裁决。
  - B10 已 done：毒独立于 `BattleStatus`；世界毒、定时状态和临时毒抗通过现有 bridge 带入战斗并按规则清理。
  - 开发期只保留 current canonical schema；切版后删除旧类型、upgrader、fixture 与兼容 fallback。
- 代码锚点(`file:line`):
  - `packages/content/src/character.ts:8-13,52-60,99-139,164-245`
  - `packages/content/src/skill.ts:17-27,40-45`
  - `packages/content/src/poison.ts:2-4,42-104`
  - `packages/content/src/script.ts:74-243`
  - `packages/content/src/item.ts:1040-1150`
  - `packages/content/src/validate.ts:87-127`
  - `packages/reforge/src/battle/battle-core.ts:350-365,658-668,1123-1148,2692-2696`
  - `packages/reforge/src/main.ts:2292-2300,2612-2619,3247-3279,5691-5696`
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:694-861`
  - `packages/editor/src/ui/CommandForm.tsx:1230-1274`
- 已知坑 / 审计文档:
  - `docs/ops/tasks/ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state.md`
  - `docs/ops/tasks/ED-PROJECT-STARTUP-IA-1-project-entry-startup-workbench.md`
  - `docs/phase1/game-mechanics.md:1172-1251`
  - `docs/phase2/capability-map.md:88,98,118,134`
  - `CharacterInstance` 注释写“随存档”，但实际 restore 会清除三类临时 condition；实现前必须统一代码、注释、UI 帮助与测试口径。
- 不得重新引入:
  - role 下标身份、事件对象号身份、`spriteNum === N` 式裸判定。
  - ActorDef / StartWorld / script / equipment 多 owner 双写。
  - `setParty` 状态副作用、reserve 归队重置、读取 seedStats 作为剧情 pending seed。
  - 页面私有状态词表、裸英文 enum、暴露 `tickIndex`、逐页面 CSS 补丁或第二套字段提交逻辑。
  - content18 兼容 parser、旧字段 fallback、产品升级入口或直接修 `projects/pal`。
- 相关测试:
  - `packages/content/src/character.test.ts`
  - `packages/content/src/item.test.ts`
  - `packages/reforge/src/battle/battle-core.test.ts`
  - `packages/reforge/src/script-runner.test.ts`
  - `packages/editor/src/ui/ProjectWorkbenchTab.test.tsx`
  - `packages/editor/src/ui/ScriptEditor.test.tsx`

## 验收条件

- 功能:
  - 入口的 condition 只允许引用该入口 `party` 中的 ActorId；移出队员时 condition 与既有 HP/MP seed
    在同一条命令内原子清除，单次 undo / redo 同步恢复 / 清除。
  - 毒只保存稳定 `PoisonDef.id`，不让作者编辑 `tickIndex`；构建世界时从 `tickIndex = 0` 开始，未知 / 重复毒引用 fail-loud。
  - 定时状态从单一 typed registry 提供中文名、好 / 坏分类、可携带性、回合范围和效果说明；`protect` 显示为
    “护体（受到的物理 / 法术伤害减半）”，不得写成含糊的“强化防御”。
  - 同一角色同一状态只有一个当前回合值；回合必须为正安全整数。互斥状态、死人专用状态和不适合携带的状态
    必须由 registry / validator 拦截或有证据地排除，不能把整个 `StatusId` union 无差别开放。
  - 临时毒抗与毒 / 定时状态遵循同一大世界 → 下一战 → 战后 / 读档生命周期；UI 用可读效果描述，不暴露
    `extraPoisonRes` 字段名。
  - 剧情命令按稳定 ActorId 定位当前已实例化角色，不接受队伍下标；目标不存在时 fail-loud 并给出诊断。
  - `setParty` 的 members-only schema、异步资源事务、party / reserve 状态保留与现有 102 处迁移语义保持不变。
  - 剧情可分别施加和清除毒、定时状态与临时毒抗；指令复用 content 的状态操作 / 验证函数，不在 runner
    再写一套叠加、互斥或清理规则。
  - 世界中 condition 不自行衰减；入战复制、战内衰减、战后清理和 restore 清理均复用当前 owner，并在帮助文案明确。
  - 装备授予的常驻状态继续 live 派生；战斗局部 `statBuffs` 不写回 World / StartWorld。
- 测试:
  - schema / validator 覆盖合法空值、未知 Actor / Poison / Status、非队员 key、重复项、非法 turns、互斥 / 不可携带状态。
  - `buildWorld` 覆盖每种 carrier、未配置继承空、毒首次 tick、多个入口隔离、移除成员原子清理。
  - script 覆盖 `setParty -> apply condition`、目标缺失、party / reserve 离归、清除、abort / command 顺序，证明
    `setParty` 本身不偷偷重置或播种 condition。
  - battle / save 覆盖大世界带入、战内衰减、胜 / 败 / 逃清理，以及保存后 restore 的既定清理口径。
  - editor 覆盖 draft / commit / cancel / resync、IME、Enter + blur 单提交、对象切换、undo / redo、长名称、无可选项和悬空修复。
  - 若 content schema 切版：聚焦测试后只跑一次受影响包全量；PAL 修迁移上游、完整重迁、生成白名单与第二次零 diff。
- 文档:
  - 更新入口 ownership、脚本命令手册、状态 registry / 生命周期说明及 capability map 对应格备注。
  - 修正 `CharacterInstance` 注释与 restore 实际清理口径的矛盾。
- 视觉 / 手工验证:
  - PAL 真实工程 1280 / 900 / 720px，检查成员行摘要、弹层边界、滚动 owner、窄宽度、缩放、焦点和 undo。
  - 脚本表单检查角色 / 毒 / 状态长名称、中文帮助、键盘可达、popup 不被裁切。
- E2E 用例登记（剧情 / 演出 / 内容观感必填：入口、准备数据、步骤、预期画面/时序、证据路径）:
  - 功能性入口 UI 在 build 期最小验证；剧情观感延后到集中 E2E。
  - 登记场景 A：测试入口给李逍遥“赤毒 + 护体 7 回合”→ 进入首战 → 状态生效 → 战后按规则清理。
  - 登记场景 B：测试脚本 `setParty` 加赵灵儿 → 施加具名 condition → 首战生效；证据路径由 build 阶段填写。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-26）**。已直读原版 `global.h:521-547`、`script.c:1257-1284,1367-1374,2164-2196`、
    一阶段 `event-system.ts:4629-4685,4935-4951` 与当前 `character.ts:52-60,99-139,190-245`、
    `script.ts:74-243`、`main.ts:5691-5696`；确认 runtime 已有 carrier，而入口与剧情作者链缺失，且 party / condition
    在原版和一阶段是独立命令域。
  - design: **agree（2026-08-26）**。入口使用独立 per-member condition seed；剧情使用具名 ActorId 显式命令，
    不改 `setParty`、ActorDef、reserve、装备派生或 battle-only statBuff。三类既有 carrier 必须系统覆盖。
- Kimi:
  - premise: pending
  - design: pending
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: pending
  - 独立证据锚点: pending
  - 可证伪观察: pending
- counter / 分歧处理: N/A（若任一方认为 restore 清理、可携带 allowlist 或剧情命令边界不成立，立即转 blocked 交用户裁决）
- 缺签豁免: N/A
- build 准入结论: **blocked**

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **两个作者入口，一个 runtime owner**：入口 seed 只在 `buildWorld` 创建新世界时应用；剧情命令只在脚本
   执行时修改已存在的 `CharacterInstance`。最终都写入 `poisons` / `extraStatuses` / `extraPoisonRes`。
2. **不扩张角色模板**：ActorDef 只持角色出厂基线；“这一次开局 / 入队带什么状态”不属于角色身份。
3. **不污染 `setParty`**：成员变更先完成并等待资源事务提交，随后独立 condition 命令按稳定 ActorId 修改；
   归队的 reserve 实例不会被隐式重置。
4. **单一可携带状态 registry**：从 content 层导出 typed 元数据，validator、入口 UI、脚本 UI、帮助和测试共同消费；
   registry 明确 carryable、好 / 坏、效果说明、合法回合和互斥关系。
5. **快照与操作分开建模**：入口保存确定性的当前 condition 快照；剧情保存显式 apply / clear 意图。二者共享词汇、
   引用和校验函数，但不强行复用一个会产生顺序副作用的 JSON 形状。
6. **生命周期保持现状**：大世界不 tick，下一战复制，战内衰减，战后按三件套清理；读档按当前 primary-source
   对齐路径清三类 condition。实现必须修正文档与 UI，不能继续声称它们“读档后保留”。
7. **当前版本一次切换**：若新增 manifest 字段触发 content version 变化，直接切唯一 canonical 版本，更新所有
   自包含工程与迁移器，删除旧版本分支 / upgrader / fixture / fallback，并用 PAL 二次迁移零 diff 证明闭包。

### 已知风险

- 风险: `StatusId` 中可能包含不适合大世界播种的状态（例如死人专用或互斥状态）。
  - 缓解: build 前由 Kimi / GLM 独立核 registry allowlist 与代表数据；validator 不直接接受整个 union。
- 风险: `CharacterInstance` 注释与 restore 实际行为冲突，作者可能误以为保存 / 读档仍保留状态。
  - 缓解: 以 primary source + 当前 restore 调用链为准，卡内测试、帮助和注释同时改正；若产品要改为保留，必须
    写新的 `before -> after` 交用户裁决并使旧签字失效。
- 风险: 只实现毒和护体会遗漏临时毒抗，继续形成同生命周期多入口不一致。
  - 缓解: 按现有三 carrier 做完整矩阵；任何排除都必须写明证据和后续卡。
- 风险: 剧情命令复刻 item effect 逻辑后叠加 / 互斥漂移。
  - 缓解: 抽取 / 复用 content 纯函数，runner 只解析目标与调用，不拥有规则。
- 风险: 当前 `ED-PROJECT-STARTUP-IA-1` 仍在 review，直接改同一页面会混卡、混提交。
  - 缓解: 本卡保持 draft；Startup 卡三方 review 与用户验收收口后才允许建立本卡 build 分支。

### 主审立场

- Reviewer: Kimi（schema / 跨包公共接口主审），GLM（原版数据 / 测试矩阵联合审）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 推荐“入口快照 + 剧情显式命令 + 三 carrier 完整覆盖”，保持 restore 清理和 C7 reserve 现状。
- Kimi: pending
- GLM: pending
- 用户拍板: 2026-08-26 已批准按 ownership 方向开卡；若三方对 restore / allowlist / 命令形状无法收敛，再提交具体分歧。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（签字齐且 Startup 卡收口后）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: 2026-08-26 已认可 ownership 并要求开卡；功能验收 pending
- 后续任务: pending

## 交接日志

- 2026-08-26 User: 确认“入口队员状态归入口、剧情入队状态归脚本”的方向并要求开卡。
  Evidence: 当前会话。Next: Codex 建卡并送 Kimi / GLM 设计审查。
- 2026-08-26 Codex: 完成原版 / 一阶段 / 当前二阶段只读 truth audit，建立四向矩阵、初始设计、风险和验收门禁；
  未修改任何实现文件。Evidence: 卡内锚点。Next: Kimi / GLM 独立核真值并签字。

## 下一位 Agent 提示词

```text
联合审查 ARCH-ACTOR-CONDITION-SEED-1「入口与剧情入队角色当前状态播种」。

任务卡：docs/ops/tasks/ARCH-ACTOR-CONDITION-SEED-1-entry-and-story-actor-conditions.md
当前状态：draft / build blocked；Codex 已完成初始 truth audit 与设计签字，Kimi、GLM 均 pending。
你的角色：
- Kimi：独立核原版/一阶段行为、StartWorld schema、setParty 与具名 condition 命令边界、save/restore 生命周期和 UI 风险。
- GLM：独立核毒/状态/临时毒抗三 carrier 覆盖、可携带 allowlist、PAL 代表数据、迁移与测试矩阵。

先完整阅读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本任务卡；并直接读取卡内 primary source、
packages/game 一阶段和 packages/content/reforge/editor 当前调用链。不要只复述 Codex 结论。

已完成：已确认当前入口只有 HP/MP seed，剧情 setParty 只有 members；runtime 已有 poisons、extraStatuses、
extraPoisonRes。初始设计要求入口快照归 StartWorld、剧情状态归 setParty 后的具名 ActorId 显式命令，且不修改
ActorDef、setParty、reserve、装备派生或 battle-only statBuff。

请你做：
1. 分别给出带直接 file:line/reference 的 premise verified 或 counter。
2. 审查并签 design agree 或 counter，重点回答：
   - 三类 carrier 是否应完整覆盖，哪些 StatusId 可安全从大世界携带；
   - 毒是否只允许从 tickIndex=0 开始；
   - restore 继续清 condition 是否与 primary source、当前产品合同一致；
   - 剧情命令应独立于 setParty、目标必须已实例化是否成立；
   - current-only schema 切版、迁移重生成、editor/测试矩阵是否有遗漏。
3. 至少一位非 Coding Owner 完成独立反证，写明证据锚点和能推翻前提的观察。
4. 把结论、钉子和签字直接写回任务卡，并刷新下一位 Agent 提示词。

不要做：不得修改实现/schema/迁移器/projects/pal，不得把任务标记 build/done；任何 counter 或关键 unknown 立即停线。
输出要求：明确写回 premise verified + design agree，或 counter + 理由/证据/待用户裁决问题；签字不齐时保持 build blocked。
```
