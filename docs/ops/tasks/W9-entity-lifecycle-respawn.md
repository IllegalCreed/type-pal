# W9 - 实体暂离、重现与明雷逃跑冷却

Status: draft
Phase: phase2
Capability: W9 / B8 / B9 / X1
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none
Branch: main

## 目标

用干净、可保存的实体生命周期模型替代第二阶段当前的 `respawnSeconds + host.wait` 临时实现，完整承接迁移内容中的两类原始语义：实体可见但暂停交互的短冷却，以及实体隐藏、当前场景计时并在离开固定视野后重现。明雷战斗胜利和逃跑必须分别走正确生命周期，切换场景、保存读档或盯着出生点都不能绕过规则。

## 范围

- 范围内:
  - content schema 中语义明确、彼此分离的“暂停交互”和“隐藏待重现”能力。
  - 以稳定 `EntityAddress` 为身份的 WorldState 生命周期状态及其校验。
  - Reforge 当前场景生命周期 reducer、渲染/碰撞/trigger/auto/hostile gate、重现时动作帧复位。
  - SAVE / content epoch 升级与旧版本确定性迁移或明确拒绝策略。
  - `0x4B`、`0x52` 和标准明雷脚本折叠的上游迁移修复及全量 PAL 重生成。
  - 编辑器对明雷胜利策略、逃跑冷却和两类脚本能力的中文 CRUD。
  - B8 / B9 / X1 capability-map 口径修正。
- 范围外:
  - 敌人混乱攻击同伴；该纯战斗问题属于 backlog 18a。
  - 改写战斗胜负判定、伤害公式或战斗动画。
  - 把原版全局事件对象数组、负数状态或 `sVanishTime` 原样带入公共 schema。
- 明确不做:
  - 不继续用 detached `host.wait()` 维持实体生命周期。
  - 不把 `0x4B` 和 `0x52` 合并成同一个含糊的 `vanishEntity`。
  - 不直接修 `projects/pal` 生成产物。
  - 不以“当前模型功能上可用”为由放弃一阶段已记录的机制真值。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 用户于 2026-07-30 明确要求：涉及游戏机制优先参考 `docs/phase1/game-mechanics.md`，其中是一阶段已核实真值，不得自行猜测。
  - `docs/phase2/READ-FIRST.md` 铁律 9：战斗、数值与机制真值以一阶段 `game-mechanics.md` 为首选；铁律 10：迁移缺陷先修上游并全量重生成。
  - 本任务行为真值包含一阶段刻意保留的固定 `320×320` 离屏边界，`y + 320` 也不得擅自改成实际屏高；第二阶段只重建干净架构，不重猜行为。
  - 这是 schema / save / migration / 公共世界状态 / capability-map 变化，属于高风险任务；三方设计签字前不得修改实现文件。
- 代码锚点(`file:line`):
  - `docs/phase1/game-mechanics.md:1000-1111`：完整生命周期、10fps、`0x4B`、`0x52`、固定 `320×320` 离屏门和一阶段实现状态。
  - `packages/game/src/core/scene-system.ts:190-225`：一阶段倒计时、离屏重现和触发 gate 真值实现。
  - `packages/game/src/core/event-system.ts:1186-1189`：一阶段 autoScript gate。
  - `packages/game/src/core/event-system.ts:3930-3947`：一阶段 `0x4B` / `0x52` 真值实现。
  - `packages/content/src/index.ts:67-104`：当前 `EntityDef.hostile.respawnSeconds`。
  - `packages/content/src/script.ts:83-89`、`packages/content/src/script-v5.ts:74-85`：当前含糊的 `vanishEntity`。
  - `packages/reforge/src/main.ts:1454`、`packages/reforge/src/main.ts:3234-3263`：当前 runtime 隐藏与 detached wait。
  - `packages/reforge/src/save/types.ts:82-111`：当前 WorldScriptState / SAVE envelope。
  - `packages/migrate/src/translate-events.ts:1651-1657`：当前把 `0x4B` / `0x52` 合并的翻译。
  - `packages/migrate/src/migrate-content.ts:2441-2470`：当前标准明雷折叠。
  - `packages/editor/src/ui/App.tsx:2681`、`packages/editor/src/ui/App.tsx:2982-2990`：当前重生秒编辑入口。
- 已知坑 / 审计文档:
  - `docs/phase2/design-backlog.md` 议题 18b。
  - `docs/phase2/foundation/phase1-knowledge-harvest.md`：机制重写先读一阶段知识。
  - `docs/ops/audits/kimi-p7-r13-source-semantics-audit.md`：迁移源语义不能在折叠时丢失。
  - 当前 PAL 生成数据初步清点：73 个场景有 828 个 `respawnSeconds`（826 个 80 秒、1 个 10 秒、1 个 15 秒）；28 个场景仍有 193 个 `vanishEntity`（100 个来自错误翻成 2 秒隐藏的 `0x4B`，93 个来自 `0x52`）。进入 build 前由 GLM 复核并冻结正式账本。
- 不得重新引入:
  - 原版下标式实体身份、全局事件对象数组或正负数字哨兵进入 public schema。
  - 场景切换后丢状态、重新 clone 场景即复活、读档立即复活。
  - 只在同场景异步回调中成立的计时器。
  - “缺 `respawnSeconds` = 永久击杀”但 WorldState 无持久记录的虚假承诺。
  - 逃跑与胜利共用同一消失策略。
- 相关测试:
  - `packages/game/src/core/scene-system.test.ts:669`：一阶段倒计时 / 离屏重现测试。
  - `packages/game/src/core/event-system.test.ts:2013`：一阶段 opcode 与生命周期测试。
  - Reforge world、save、script runner、migrate 和 editor 各自新增覆盖；完整矩阵见下。

## 验收条件

- 功能:
  - “暂停交互”精确持续 15 个 100ms 逻辑 tick：实体仍可见并保持原碰撞，但 trigger、auto 和 hostile 遭遇均暂停；结束后原地恢复。
  - “隐藏待重现”期间不渲染、不碰撞、不触发、不跑 auto/hostile；倒计时只在所属场景为当前场景时推进。
  - 倒计时到零但实体仍在相对相机固定 `320×320` 边界内时继续隐藏；离开该边界后才重现并复位默认动作帧。
  - 生命周期状态跨场景、保存与读档保持；不得靠重新装载场景绕过。
  - 明雷胜利进入隐藏/重现策略；明雷逃跑进入可见的 1.5 秒交互冷却，不能立即重新开战。
  - 永久移除有显式、可保存的语义，不再依赖缺字段推测。
- 测试:
  - 生命周期 reducer 单测覆盖暂停、隐藏、当前场景计时、离屏门、边界值、帧复位和非法状态。
  - runtime 集成覆盖胜利、逃跑、原地等待、场景往返与触发/碰撞/渲染 gate。
  - save round-trip 覆盖暂停中、倒计时中、等待离屏、永久移除四类状态及剩余时间。
  - 迁移测试逐类钉死 `0x4B` / `0x52` operand、标准明雷 onWin/onFlee；正式账本所有站点有 disposition。
  - 全量重迁只写白名单，第二次迁移 `writes/conflicts/deletes = 0/0/0`。
  - 编辑器命令、撤销/重做、保存重开与删除/引用保护闭环。
- 文档:
  - 更新 content/save schema、迁移说明、capability-map B8/B9/X1 和 `design-backlog` 18b。
  - 任务卡记录冻结账本、版本决策、命令与完整验证证据。
- 视觉 / 手工验证:
  - 至少选一个标准明雷和一个特殊 `0x52` 实体，实际验证逃跑、胜利、80 秒计时、盯出生点、离屏重现、场景往返和保存读档。
  - 编辑器以中文区分“逃跑后短暂不可触发”和“胜利后隐藏并重现”，不向作者暴露 `sVanishTime`。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: agree（2026-07-30；设计可行，必须先冻结 schema/save 版本、迁移账本和测试矩阵）
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

以下是待 Kimi / GLM 压测并签字的设计基线，字段名可在不改变语义的前提下收敛：

1. `WorldScriptState` 增加以稳定 `EntityAddress` 为键的持久生命周期表。公共模型用语义状态表达，不复制原版 `sState × -1` 或 `sVanishTime` 数字协议。
2. 生命周期至少区分：
   - `suspended`：可见、保持原碰撞，暂停 trigger/auto/hostile，记录剩余逻辑 tick。
   - `despawned`：隐藏且退出碰撞/trigger/auto/hostile，记录剩余逻辑 tick。
   - `awaitingExit`：计时结束，仍隐藏，等待离开固定 `320×320` 边界。
   - `removed`：显式永久移除。
3. 所有推进由当前场景的统一生命周期 reducer 完成；离场冻结，回场从持久剩余 tick 继续。不得起 detached timer。
4. content 的作者命令将 `0x4B` 和 `0x52` 拆成两个中文可解释的语义能力；具体类型名由设计审查冻结。hostile policy 显式分开 onWin 隐藏/重现策略与 onFlee 交互冷却。
5. Reforge 的渲染、碰撞、trigger、auto、hostile 都查询同一派生生命周期状态；不能各自维护布尔副本。
6. 生命周期进入存档。设计审查必须明确 WorldState shape、SAVE envelope 与 contentVersion 的升级矩阵，旧 payload 要么确定性升级，要么在任何 sidecar I/O 前明确拒绝。
7. 迁移器先建立 `0x4B`、`0x52`、hostile 折叠的源账本，再改上游并全量重生成；生成产物不手修。
8. 18a 只在战斗内部产生正确 action / animation；W9 从 `BattleResult` 的 win/flee 边界开始，互不侵入。

### 已知风险

- 风险: WorldState 与 SAVE envelope 改动会影响 canonical 脚本 cursor 和当前 R13 内容版本。
- 缓解: W9 不与 R13-5 并行改 schema；等当前 R13 批次形成已审候选后再冻结 W9 版本矩阵。
- 风险: 旧 `vanishEntity` 同时承载两种源语义，不能仅靠 seconds 可靠反推所有作者意图。
- 缓解: 以原始 opcode provenance / R13 source disposition 建正式站点账本；歧义站点逐项列出，不猜测。
- 风险: hostile 折叠可能丢掉战斗逃跑分支和战后脚本接续。
- 缓解: onWin/onFlee 独立建模，并用生成前后源闭包与代表场景手工验收证明。
- 风险: 固定 `320×320` 与当前实际画布尺寸不同，容易被“修正”为自适应视口。
- 缓解: 任务卡明确这是用户指定采用的一阶段机制真值，写边界回归测试和代码注释。
- 风险: 828 + 193 处初步统计可能有重叠、已折叠或特殊编排。
- 缓解: GLM 在设计签字前冻结 mutually-exclusive disposition 和总数守恒。

### 主审立场

- Reviewer: Kimi（架构/save/schema）+ GLM（迁移账本/测试矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 采用语义生命周期表、统一 reducer、固定 `320×320` 行为真值；不复制原版数据结构。
- Kimi: pending
- GLM: pending
- 用户拍板: 2026-07-30，游戏机制以一阶段 `game-mechanics.md` 已核实真值为参考，不得猜测。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + User
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-30 Codex: 根据用户要求，对照一阶段机制真值和第二阶段实现完成只读审计并开 W9 高风险任务卡；确认 18b 是 world/save/migration/editor 的系统性缺口，不是 battle-core 小补丁。Evidence: `docs/phase1/game-mechanics.md:1000-1111`、本卡上下文与验收矩阵。Next: Kimi / GLM 分别完成设计签字；未三签不得实现。

## 下一位 Agent 提示词

```text
接手任务: W9 实体暂离、重现与明雷逃跑冷却
任务卡: docs/ops/tasks/W9-entity-lifecycle-respawn.md
当前状态: draft（build 准入 blocked）
你的角色: Kimi 做架构/schema/save 设计审查；GLM 做迁移账本/测试矩阵覆盖审查
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、docs/phase1/game-mechanics.md:1000-1111、docs/phase2/foundation/phase1-knowledge-harvest.md，以及任务卡列出的代码锚点
已完成: Codex 已确认第二阶段把 0x4B/0x52 合并、使用 respawnSeconds + detached wait，导致可见冷却、离场冻结、离屏门、保存持久和明雷逃跑语义丢失；已提出语义生命周期表、统一 reducer、固定 320×320 真值和上游重迁基线
请你做: Kimi 压测状态机、跨包边界、SAVE/content 升级；GLM 复核 828 hostile + 193 residual 的互斥源账、测试矩阵和生成白名单。把结论写回设计签字：agree，或 counter + 必改理由
不要做: 不得修改实现文件，不得直接改 projects/pal，不得把实际视口替代一阶段已记录的固定 320×320 行为，不得把任务标 build/done
输出要求: 更新任务卡设计签字、主审立场、必要争议和下一位提示词
```
