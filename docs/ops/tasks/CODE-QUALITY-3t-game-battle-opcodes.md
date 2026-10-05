# CODE-QUALITY-3t - game battle-opcodes 战斗脚本解释器逐文件治理

Status: review
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
| 原版 / primary source | `PAL_InterpretInstruction` 战斗相关 opcode、`PAL_Battle*`/`PAL_StartBattle`/`PAL_BattleMain` 和 fight action callers | `reference/sdlpal/script.c:867-950,1026-1102,1175-1425,1437-1449,1573-1640,1848-2054,2547-2668,2776-2995,3267-3297`；`reference/sdlpal/fight.c:602-716,2387-2390,4214-4323,5193-5400`；`reference/sdlpal/battle.c:1397-1434` |
| 第一阶段 | `dispatchBattleOpcode` 由 `event-system.runScript` battle 分支调用，写 BattleState/CommandBus/queued animation，未消费项回退 `applyRawOpcode` | `packages/game/src/core/battle/battle-opcodes.ts:399-1528`、`packages/game/src/core/event-system.ts:3033-3104`；真实 action caller 为 `actions/item.ts:86-114`、`actions/magic.ts:188-242`、`actions/throw-item.ts:109-145`，敌方脚本入口为 `battle-system.ts:2193-2240,2526-2558` |
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
- 相关测试：`battle-opcodes.cov85.test.ts`、`battle-opcodes.glm-next-wave.test.ts`、`battle-opcodes.test.ts`、battle-system/action/magic/throw/coop/anim tests；本轮只运行并做结构清点，4 个 battle-opcodes 专属测试仍待逐文件全文核验。

## 逐段证据与结论（2026-10-05 Codex）

已读取实现文件 1528 行、真实 caller 和 primary source 对应 case；battle-opcodes 专属测试已运行并清点结构，但尚未逐文件全文核验，以下不把测试绿灯冒充全文审查：

| 实现段 | opcode family / owner | primary source 与真实 caller | 定向 oracle / 结论 |
|---|---|---|---|
| `battle-opcodes.ts:1-398` | `BattleCtx`、SHORT 转换、伤害数字/投掷特效 helper、常量与状态映射 | `event-system.ts:957-1040` 的 ctx ownership；`fight.c:602-716,5300-5400` | `battle-opcodes.test.ts`、`cov85`、`cross-module-boundaries.test.ts`；ctx 缺字段只走合同内 no-op/fallback，未发现越权写状态 |
| `:407-557` | 0x42/0x66 魔法模拟、0x21 伤害、0x28 敌毒 | `script.c:1026-1049,1175-1255,1630-1640`；`throw-item.ts:109-145` | `battle-opcodes.test.ts` + `cov85`；目标、活敌过滤、抗性、去重、毒入口脚本、`consumed` 均有正/负向 oracle，无直接反例 |
| `:557-710` | 0x2A/29/2B/2C 毒、0x2D/2E/2F 状态、0x5E 条件跳 | `script.c:1257-1425,1924-1940`；`game-mechanics.md:987-1074` 明确 0x2E 后期 `>=` 偏离 SDL `>` 的产品真值 | `battle-opcodes.test.ts`、`cov85`；目标解析、毒等级、状态刷新/失败和跳转均闭合；0x2E 的 `>=` 是已有明示产品决策，不回改 |
| `:711-846` | 0x57/88 伤害改写、0x5B/5F/5A/1B/1C/1D/22 HP/MP、0x5C/6B/89/8A/33/3A | `script.c:867-1102,1848-1912,2547-2569`；`fight.c:4214-4265` | `battle-opcodes.test.ts`、`cov85`、`actions.test.ts`；SHORT/clamp、成功标志、复活毒/状态边界、battle result/flee 均有 oracle，无直接反例 |
| `:847-999` | 0x30 临时属性、0x31 sprite、0x92 pre-magic、0x6A steal | `script.c:1406-1435,2042-2049,2637-2668`；`fight.c:2387-2389,5193-5297`；`magic.ts:188-242` | `battle-opcodes.test.ts`、`cov85`、`anim-timeline.test.ts`；Extra 槽/动画时序/偷窃资源与提示合同闭合，无直接反例 |
| `:1000-1201` | 0x5A/HP delta/revive、0x05/8E 清对话、0x39 drain、0x68/91 条件跳 | `script.c:867-1102,1573-1592,2025-2033,2613-2635,3267-3297`；`event-system.ts:2960-3110` | `battle-opcodes.test.ts`、`cov85`、`battle-opcodes.glm-next-wave.test.ts`；目标 fallback、`newIp`、对话清除标记和数字弹幕均闭合 |
| `:1202-1425` | 0x9C division、0x9F transform、0x9E summon | `script.c:2776-2995`；`battle-system.ts:2189-2240,2526-2558` | `battle-opcodes.test.ts`、`cov85`、`battle-summon-slot-reuse.glm-q.test.ts`、`battle-system.test.ts`；空槽、隐身/状态 gate、对象身份、脚本继承、阵型/动画均有边界 oracle，无直接反例 |
| `:1426-1528` | 0x64/67/61、0x69 enemy escape、0x60 immediate KO、default 未消费 | `script.c:1950-2038,2613-2635`；`battle.c:1397-1434`；`event-system.ts:3033-3104` | `battle-opcodes.test.ts`、`cov85`；满血阈值、目标敌、逃跑无奖励、未消费回退均闭合，无直接反例 |

定向/相邻实测：10 个 test files、470 tests 全绿（只证明当前运行结果）；已知结构包含合法输入、目标缺失/非法输入、资源缺失、边界值和 `consumed:false` 反控，但 4 个 battle-opcodes 专属测试文件未完成逐文件全文核验，因此保留 `review`。

本次只读核验未发现直接缺陷；实现文件保持不变。`0x2E` 的 SDL 与原版后期差异已按现有 `game-mechanics.md` 产品裁决保留，不能把“SDL 文本不同”误报成 TS 缺陷。

## 验收条件

- 功能：battle-opcodes 全 1528 行按 opcode family/owner/caller/primary source/risk/conclusion 登记；关键未知不标已验证。
- 测试：定向/相邻 battle opcode/action/anim tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A；战斗演出视觉集中 E2E。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅 `battle-opcodes.ts` 与专属回归（若 direct evidence）。
- 前提核验：`premise verified`（已直接读取 primary source、第一阶段 caller/ctx、相关测试；上表保留最强替代解释与可证伪观察）
- 范围、设计和验收条件：`design agree`（只读审计无实现变更；若后续发现反例，先回到 rework/blocked，不扩张范围）
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：`build allowed`（本批无实现改动；仅允许按卡范围执行验证和文档/账本收口）

### 进入 done 前：独立验收

- 贡献者交付与自验：`review`（实现文件逐段读证与 470 个定向/相邻测试已完成；测试文件全文核验尚缺）。
- Codex 独立复核：`review`（生产实现结论可接受；4 个专属测试记录不能标已验证）。
- 用户体验/产品验收：N/A（纯 opcode 合同）。
- done 准入结论：`blocked`（先逐文件全文读取 4 个专属测试并补直接 oracle；未完成前不得标记 done）。

## 已完成部分证据（尚未 done）

- 定向/相邻：10 个 test files、470 tests 全绿；覆盖主 dispatch、coverage branch contracts、GLM 反控、summon slot reuse、cross-module、actions、magic damage、throw item、coop magic、animation timeline。
- 全仓 `pnpm check`：docs 909 Markdown / 4703 links / 308 tasks；content 149/1490；shared 16/131；game 298/3403；pal-extract 69/421；reforge 325/8682；editor 606/4845；migrate 95/723；Biome 3198 files，0 errors / 0 warnings / 0 infos。
- `pnpm coverage:ratchet`：consolidated 726 files / 19,285 tests；statements 88.89% (68812/77410)，branches 82.67% (49777/60209)，functions 88.59% (13032/14710)，lines 90.80% (61540/67775)；baseline unchanged。
- `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：同一 consolidated metrics；coverage gate passed，0 improvements，未下降。
- 文档/静态：本轮全仓 check/ratchet/protected fast/Biome 均通过；未修改实现文件、schema/save、生成物或 UI。
- 当前结论：`battle-opcodes.ts` 全 1528 行生产实现完成逐段核验，未发现直接缺陷；4 个专属测试文件仅运行/清点，仍属 review，不计入已验证。

## 交接日志

- 2026-10-05 Codex：Q3s 已归档；建立 battle-opcodes 高风险卡，先完成 1528 行实现、真实 runScript caller、battle opcode tests 与 script/fight/battle primary source 逐段核验；未获 build 准入前不得修改实现。
- 2026-10-05 Codex：完成前提门、生产实现逐段 primary/caller 核验与 470 个定向/相邻测试；未完成 4 个专属测试文件全文核验，卡从 done 撤回为 review，禁止以运行绿灯代替逐文件审查。

## 下一位 Agent 提示词

```text
下一步提示词：先全文读取 `battle-opcodes.test.ts`、`battle-opcodes.cov85.test.ts`、`battle-opcodes.glm-next-wave.test.ts`、`battle-summon-slot-reuse.glm-q.test.ts`，逐个核对真实 caller、oracle、合法/非法输入和反控；不得修改实现文件或标记 done，完成后把 4 条 review 记录补成 `accept` 或写明 counter。
```
