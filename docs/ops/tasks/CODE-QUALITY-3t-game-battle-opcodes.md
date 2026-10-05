# CODE-QUALITY-3t - game battle-opcodes 战斗脚本解释器逐文件治理

Status: draft
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（战斗演出视觉集中 E2E；本卡只验 opcode/状态合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标

逐文件审计 `packages/game/src/core/battle/battle-opcodes.ts`（1528 行）的 battle-only opcode dispatch、目标/状态/伤害/毒、
敌人 summon/division/transform/escape、动画/偷窃/战斗结果和 `consumed/newIp` 控制流；以 SDLPal `script.c`/`fight.c`/`battle.c`
primary source、真实 `runScript(runtimeMode='battle')` caller 和 battle-opcodes/action/coverage tests 核真值，只有直接反例才修复。

## 范围

- 范围内：`battle-opcodes.ts` 全文件、`dispatchBattleOpcode` 公开 caller 与对应 battle opcode tests/anim/action callers。
- 范围外：`battle-system.ts`（CODE-QUALITY-3s 已关闭）、公式/magic/status/queue/positions（Q3m 已关闭）、event-system 全文件、save/schema/migration、生成物、剧情 E2E、UI 形态和 coverage runner。
- 明确不做：不把 event-side opcode 复制到 battle-side，不凭 opcode 数量改变玩法，不修改 `data/extracted`。

## 前提真值门

### 一句话行为 / 工程前提

battle opcode dispatch 必须保持 SDLPal 的 battle context、目标索引、资源/状态所有权及 `consumed/newIp` 控制流；未消费 opcode 必须按 caller 合同回退 event interpreter 或安全 no-op，不能静默吞掉会改变战斗结果的分支。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_InterpretInstruction` 战斗相关 opcode、`PAL_Battle*`/`PAL_StartBattle`/`PAL_BattleMain` 和 fight action callers | `reference/sdlpal/script.c`、`fight.c`、`battle.c`；待逐段补精确行号 |
| 第一阶段 | `dispatchBattleOpcode` 由 `event-system.runScript` battle 分支调用，写 BattleState/CommandBus/queued animation，未消费项回退 `applyRawOpcode` | `battle-opcodes.ts`、`event-system.ts:3032-3104`、battle-system/actions/anim callers；battle opcode tests 待读取 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 每个 opcode family 有 caller、primary source、目标/状态合同、可证伪反例和验证结果；未知项保留 review/blocked | 本卡、file ledger、定向/相邻测试和全仓门禁 |

### 反证与替代解释

- 最强替代解释：某些 `consumed:false` 是刻意交给 event-side fallback 的跨解释器 opcode；某些 no-op 只用于 raw 数据保留，不应因静态缺 case 删除。
- 什么观察会推翻前提：真实 battle caller + 合法 opcode 在 `consumed/newIp`、目标、资源扣除、动画/结果或 phase 接回上与 C 不一致；或移除防御 guard 后唯一业务 assertion 仍全绿。
- audit 红项替代根因：battle runtime 语义、原版/第一阶段理解、数据/资源解码、测试模型四类必须分别排查；大 census 不直接授权迁移。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：从“battle-opcodes 尚未逐文件治理”到“每个 battle opcode family 证据化；仅根因修复，不改玩法/演出/格式”。
- 代表场景：battle `runScript` 对合法 opcode 返回正确 `consumed/newIp` 并只修改其拥有的 BattleState/资源。
- 用户裁决：N/A（保持已核真值；证据冲突才停线请示）。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、双解释器边界、第一阶段忠实还原、战斗动画逻辑/render 分离、硬零诊断、测试少而精。
- 代码锚点：`battle-opcodes.ts:399-1528` dispatch；`event-system.ts:3032-3104` battle caller/fallback；battle-system/actions/anim/timeline callers。
- 已知坑 / 审计文档：`docs/phase1/engineering-notes.md:71-80,107-114` 双解释器与 animation timing；Q3m battle core/Q3s battle-system cards 的 owner/phase 证据。
- 不得重新引入：event/battle opcode 双写、battle context 缺失时半消费、目标索引把 player/enemy 混用、动画副作用早于逻辑完成、旧兼容 fallback。
- 相关测试：`battle-opcodes.cov85.test.ts`、`battle-opcodes.glm-next-wave.test.ts`、`battle-opcodes.test.ts`、battle-system/action/magic/throw/coop/anim tests。

## 验收条件

- 功能：battle-opcodes 全 1528 行按 opcode family/owner/caller/primary source/risk/conclusion 登记；关键未知不标已验证。
- 测试：定向/相邻 battle opcode/action/anim tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A；战斗演出视觉集中 E2E。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅 `battle-opcodes.ts` 与专属回归（若 direct evidence）。
- 前提核验：pending（需先完成本卡真值矩阵逐项读取）
- 范围、设计和验收条件：pending
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：blocked（完成前提门后再进入实现；审计读取可继续）

### 进入 done 前：独立验收

- 贡献者交付与自验：pending。
- Codex 独立复核：pending。
- 用户体验/产品验收：N/A（纯 opcode 合同）。
- done 准入结论：blocked。

## 交接日志

- 2026-10-05 Codex：Q3s 已归档；建立 battle-opcodes 高风险卡，先完成 1528 行实现、真实 runScript caller、battle opcode tests 与 script/fight/battle primary source 逐段核验；未获 build 准入前不得修改实现。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3t game battle-opcodes 战斗脚本解释器逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3t-game-battle-opcodes.md
当前状态：draft；前提真值门未完成，允许只读取证，**不得开始实现/不得标记 done**。
你的角色：Codex 先完成前提真值与独立证据核验。
先读：AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、battle-opcodes.ts 全文、event-system battle caller、battle-opcodes tests、script.c/fight.c/battle.c。
请你做：写完四向真值矩阵、替代解释和可证伪观察；逐段记录 opcode family/owner/caller/风险；若发现 direct bug，先更新前提与 build 准入再改。
不要做：不得凭 opcode 数量改玩法，不得修改 event-system 全文件、save/schema/迁移/生成物/E2E/coverage runner，不得把 Reforge 结构带回第一阶段。
输出要求：Codex `premise verified/counter`、`design agree/counter`、build allowed 或 blocked；若准入，运行定向/相邻与全部质量门；把证据写入卡和 file ledger。
```
