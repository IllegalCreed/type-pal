# CODE-QUALITY-3r - game event-system 事件解释器/脚本生命周期逐文件治理

Status: draft
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（剧情/演出视觉集中 E2E；本卡只验解释器/状态合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标

逐文件审计 `packages/game/src/core/event-system.ts`（5110 行）的全局脚本表、trigger/autoScript/event 主循环、raw opcode
解释、等待态/异步收尾、scene/battle/menu 接回、runEnterScript 与 poison/item 辅助 caller；所有高风险行为先以
SDLPal primary source、第一阶段状态所有权、真实 caller 和测试核真值，只有直接反例才修复。

## 范围

- 范围内：`event-system.ts` 全文件、其公开生产 callers 与已有 event-system/cross-module/scene/battle tests。
- 范围外：`scene-system.ts`（已由 CODE-QUALITY-3q 关闭）、battle-opcodes 全文件、save/schema/migration、生成物、剧情 E2E、UI 形态和 coverage runner。
- 明确不做：不重写事件格式，不把第一阶段解释器迁入 Reforge，不凭静态 opcode 数量或覆盖率改玩法，不改 `data/extracted`。

## 前提真值门

### 一句话行为 / 工程前提

事件脚本解释器必须保持 SDLPal 的 opcode 控制流、caller-owned 状态和阻塞/异步收尾语义；任何 cursor、waiting、sceneLoading、palette/fade、battle resume 错配都不得让脚本跳错、永久等待、重复触发或跨模式污染。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | SDLPal 单解释器 `PAL_InterpretInstruction`、`PAL_RunTriggerScript`、`PAL_RunAutoScript`、scene/battle/menu 同步返回点与 opcode 分支 | `reference/sdlpal/script.c` 对应 opcode/控制流段；`play.c:56-238`、`scene.c:779-847`、`global.h:75-121,512-531`；待逐段补精确行号 |
| 第一阶段 | 当前 TS `tickEventSystem`/`tickAutoScripts`/`applyRawOpcode`/`runEnterScript` 与 mode/bootstrap/scene/battle/menu/equipment/poison callers 的真实链 | `packages/game/src/core/event-system.ts` 全文、`mode.ts`、`shell/bootstrap.ts`、`scene-system.ts`、battle/menu/equipment/poison callers；主测试全文待读取 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 每个生命周期/解释段有 caller、primary source、可证伪反例和验证结果；未知项保留 review/blocked | 本卡、file ledger、定向/相邻测试和全仓门禁 |

### 反证与替代解释

- 最强替代解释：某些 `waiting`、global fallback、sceneLoading 清理、同步 `runEnterScript` 和 battle/menu resume 是已批准的异步化补偿或 dev-only caller 边界，不因静态复杂度删除。
- 什么观察会推翻前提：真实合法 raw opcode + 真实 caller 在同一输入下出现与 C 不同的 ip/callStack/waiting/mode/状态收尾；或移除 guard 后唯一业务 assertion 仍全绿。
- audit 红项替代根因：runtime 命令分类、原版/第一阶段理解、提取/数据解码、测试模型四类必须分别排查；大规模 script census 只证明 mismatch，不直接授权迁移。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：从“event-system 尚未逐文件治理”到“解释器与生命周期每段证据化；仅根因修复，不改变脚本格式/玩法/演出取舍”。
- 代表场景：trigger/autoScript/onEnter/event/battle-resume 脚本在合法 raw 输入下逐 tick 推进并正确收尾。
- 用户裁决：N/A（保持已核真值；证据冲突才停线请示）。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段忠实还原、C 阻塞异步化同帧后续、时间状态指定收尾人、硬零诊断、测试少而精。
- 代码锚点：`event-system.ts:1208-1470` auto/event tick、`:1471-1828` 主循环、`:3262-5110` raw opcode/同步入口；`mode.ts:20-92` 调度；`bootstrap.ts:778-887,1168-1180,1556-1584` 生产加载；`scene-system.ts:303-339,444-585` trigger caller。
- 已知坑 / 审计文档：`docs/phase1/engineering-notes.md:71-107` 双解释器/相机/sceneLoading/异步同帧后续；`docs/phase1/game-mechanics.md:1371-1380,1481-1485,1573-1581` 事件/毒/属性边界；Q3q scene-system card 的 global ip/trigger owner 证据。
- 不得重新引入：全局 ip 与 per-scene slice 混用、`sceneLoading`/fade 永久孤儿、TouchFar 首帧死锁、battle/menu 切回露帧、旧版本兼容 fallback、`applyRawOpcode` 与 caller 双写同一状态。
- 相关测试：`event-system.test.ts`、`event-system.glm-event-k*.test.ts`、`event-dialogue-pagination.test.ts`、`mode.test.ts`、`scene-system.test.ts`、`cross-module-boundaries.test.ts`、battle/menu/equipment/poison ownership tests。

## 验收条件

- 功能：event-system 全 5110 行按职责段登记 owner、caller、primary source、风险和结论；关键未知不标已验证。
- 测试：定向/相邻事件与生命周期 tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A（剧情视觉集中 E2E；本卡纯解释器/生命周期合同）。
- E2E 用例登记：N/A；若发现无法靠纯合同推进的实际视觉缺陷，另开 E2E 卡。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅 `event-system.ts` 与专属回归（若 direct evidence）。
- 前提核验：pending（需先完成本卡真值矩阵逐项读取）
- 范围、设计和验收条件：pending
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：blocked（完成前提门后再进入实现；审计读取可继续）

### 进入 done 前：独立验收

- 贡献者交付与自验：pending。
- Codex 独立复核：pending。
- 用户体验/产品验收：N/A（纯机制；剧情视觉延后）。
- done 准入结论：blocked。

## 交接日志

- 2026-10-05 Codex：Q3q 已归档；建立 event-system 高风险卡，先完成 5110 行实现、5973 行主测试、primary source 与真实 callers 的逐段核验；未获 build 准入前不得修改实现。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3r game event-system 事件解释器/脚本生命周期逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3r-game-event-system.md
当前状态：draft；前提真值门未完成，允许只读取证，**不得开始实现/不得标记 done**。
你的角色：Codex 先完成前提真值与独立证据核验。
先读：AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、event-system.ts 全文、event-system.test.ts 全文、script.c/play.c/scene.c/global.h、mode/bootstrap/scene/battle/menu/equipment/poison callers。
请你做：写完四向真值矩阵、替代解释和可证伪观察；逐段记录职责/owner/caller/风险；若发现 direct bug，先更新前提与 build 准入再改。
不要做：不得凭 opcode 数量改玩法，不得改 scene 数据/save/schema/迁移/生成物/E2E/coverage runner，不得把 Reforge 结构带回第一阶段。
输出要求：Codex `premise verified/counter`、`design agree/counter`、build allowed 或 blocked；若准入，运行定向/相邻与全部质量门；把证据写入卡和 file ledger。
```
