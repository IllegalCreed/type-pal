# CODE-QUALITY-3u - game battle-state/runtime-context/positions 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（战斗演出视觉集中 E2E；本卡只验状态/资源/位置合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标

逐文件审计 `packages/game/src/core/battle/battle-state.ts`（918 行）、`battle-runtime-context.ts`（98 行）和
`battle-positions.ts`（93 行）的 BattleState 工厂、战斗资源/运行时上下文 ownership、玩家/敌人站位表与边界；以
SDLPal `battle.h`/`global.h`/`fight.c`/`battle.c` primary source、真实 battle-system/finalization/anim/opcode callers
和 state/runtime/positions tests 核真值，只有直接反例才修复。

## 范围

- 范围内：上述 3 个实现文件、其直接工厂/清理/动画/inspect caller，以及 `battle-state`、`battle-runtime-context`、`battle-positions` 专属测试和必要 cross-module oracle；其中 `battle-positions.ts` 已在 CODE-QUALITY-3m 登记，`battle-runtime-context.test.ts` 已在 CODE-QUALITY-3s 登记，本卡只做相邻复核，不重复关闭。
- 范围外：`battle-system.ts`（CODE-QUALITY-3s 已关闭）、`battle-opcodes.ts`（CODE-QUALITY-3t 已关闭）、公式/magic/status/queue、save/schema/migration、生成物、剧情 E2E、UI 形态和 coverage runner。
- 明确不做：不改玩家/敌人容量、坐标常量或 BattleState 公共字段；若发现产品行为需变更，停线交用户裁决。

## 前提真值门

### 一句话行为 / 工程前提

BattleState 必须是每场战斗独立且可清理的工作状态，runtime context 只能由公开 battle owner 注入/清理，位置表必须按当前敌人数量和固定战斗坐标合同生成，不得以数组位置误认稳定对象身份。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | SDLPal `BATTLE`/`BATTLEPLAYER`/`BATTLEENEMY` 结构、EnemyPos 表和 start/cleanup 读写路径 | `reference/sdlpal/battle.h:49-119,158-206`、`global.h:395-404,441-444`、`battle.c:900-943,1531-1775,1838-1857`、`fight.c:117-127,2173-2190,3209-3245` |
| 第一阶段 | `createBattleState` 从 GameState/资源投影独立 players/enemies/field；runtime context 以 GameState owner 绑定 runScript/resources，finalization 清理；positions 只提供纯坐标表解析 | `battle-state.ts:461-918`、`battle-runtime-context.ts:1-98`、`battle-positions.ts:1-93`、`battle-system.ts:203-370,2760-3065`、`battle-finalization.ts:1-67`；state/runtime/finalization tests 已读取 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 3 个文件逐段登记字段 ownership、容量/空槽/坐标边界、caller、风险和验证结果；未知项保留 review/blocked | 本卡、file ledger、定向/相邻测试和全仓门禁 |

### 反证与替代解释

- 最强替代解释：部分 optional 字段是旧 fixture 兼容而非产品缺陷；runtime context 的模块级 owner 可能是为了避免把资源塞进每个 action 参数，不能仅凭“全局”字样判错。
- 什么观察会推翻前提：同一 GameState 的两场战斗共享可变 BattleState/runtime context；finalization 后仍有 caller 读到旧资源；合法敌人数/空槽/位置表输入得到越界、重复或错误坐标；或移除 guard 后业务 oracle 仍全绿。
- 审计红项替代根因：BattleState schema/owner 误读、SDL 结构与 TS 工作副本误读、敌人位置数据解码错误、测试 fixture/模型错误四类必须分别排查；大 census 不直接授权改 schema。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：从“3 个战斗基础文件尚未逐文件治理”到“字段/资源/位置 ownership 与边界均有直接证据；仅根因修复，不改变战斗容量、坐标或演出形态”。
- 代表场景：开战建立独立 BattleState，战斗结束清理 runtime context；同一敌队数量下每个 active slot 得到稳定合法位置，死亡/空槽不污染下一场。
- 用户裁决：N/A（若证据要求行为变化则暂停）。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段忠实还原、BattleState/runtime context 单一 owner、硬零诊断、测试少而精。
- 先读：`CLAUDE.md`、`docs/phase1/engineering-notes.md`、`docs/phase1/game-mechanics.md`、本卡、3 个实现文件全文、直接 callers/tests、`reference/sdlpal/battle.h/global.h/battle.c/fight.c` 对应段。
- 代码锚点：`battle-state.ts:461-918`；`battle-runtime-context.ts` 全文；`battle-positions.ts` 全文；`battle-system.ts:203-370,2760-3065`；`battle-finalization.ts:1-67`；`battle-anim-driver.ts:1-254`。
- 不得重新引入：探索态复用 BattleState、runtime 资源跨战斗残留、敌槽数量与稳定 objectId 混淆、位置表越界 fallback、数组位置充当对象身份、旧版本兼容字段扩张。
- 相关测试：`__tests__/battle-state.test.ts`、`battle-state.glm-next-wave.test.ts`、`battle-runtime-context.test.ts`、`battle-system.test.ts` 相关工厂段、`battle-finalization.test.ts`、`battle-anim-driver.test.ts`、`cross-module-boundaries.test.ts`。

## 逐段证据与结论（2026-10-05 Codex）

已读取 3 个实现文件共 1109 行、直接 owner/caller 与 primary source 对应段，以及 4 个本卡新增直接测试文件共 619 行；`battle-positions.ts` 与 `battle-runtime-context.test.ts` 的历史核验沿用原卡，不重复计数；未改实现。

| 实现段 | 责任 / owner | primary source 与真实 caller | 定向 oracle / 结论 |
|---|---|---|---|
| `battle-state.ts:1-207` | `BattleStatus`、BattlePlayer/BattleEnemy 快照、对象身份、毒/空槽/动画字段 | `battle.h:49-119` 的 action/fighter 结构；`battle-system.ts`、anim/opcode/status callers | `battle-state.test.ts`、`battle-state.glm-next-wave.test.ts`、`battle-anim-driver.test.ts`；字段 ownership 和 optional fixture fallback 明确，无 schema 反例 |
| `:208-460` | BattleAction union、动画 frame/overlay/summon/afterComplete 状态 | `battle.h:49-68`、`fight.c:2173-2190,3209-3245`；actions/anim driver callers | state/animation tests + Q3s/Q3t 相邻 oracle；目标 side、动画副作用和 pending damage ownership 闭合，无直接反例 |
| `:461-697` | BattleState phase/UI/queue、自动/重复/隐藏/逃跑/淡出/对话/结算字段 | `battle.h:170-206`、`battle-system.ts` phase callers、`battle-finalization.ts:20-67` | state tests、finalization tests、cross-module；初值/终态/清理责任清楚，未发现跨战斗残留 |
| `:698-808` | CreateBattleStateInput、3 人战斗上限、持久状态 seed、null enemy slot 与 EnemyPos 输入 | `battle.c:900-943,1566-1617,1716-1755`；`battle-system.ts:209-344`；`tables.ts:375-388` 固定 5 槽 | state main/GLM tests；>3 player fail-closed、0/0xFFFF 槽保留、空槽 defeated/objectId=0、不压缩 positions，均有直接 oracle |
| `:809-918` | `createBattleState` players/enemies shallow copy、maxHealth/objectId/scripts/resistance/positions 与完整初值 | `battle.c:913-943,1599-1720`；`battle-system.ts:287-344` | 55 个定向/相邻 tests；role mismatch、HP/MP snapshot、maxHealth、object identity、pos/posOriginal 独立对象、fallback positions 均闭合，无直接反例 |
| `battle-runtime-context.ts:1-98` | BattleResources 只读表、GameState 隐藏 stash、runner override、live-role identity、finalize release | `battle.c:1741-1754,1838-1857` 的战斗资源/cleanup 生命周期；`battle-system.ts:324-344`、`battle-finalization.ts:63` | `battle-runtime-context.test.ts` + `battle-finalization.test.ts`；精确 identity、runner 优先级、清理后 fallback/hidden-field 语义均通过，无直接反例 |
| `battle-positions.ts:1-93` | 3 人玩家固定布局、敌方 EnemyPos 选择、yPosOffset、fallback 与越界 undefined | `battle.c:900-907,934-943`、`global.h:395-404`；`createBattleState` caller | state positions tests；1/2/3 player 坐标、EnemyPos count-1 layout、offset、fallback 与独立 pos copy 均有 oracle；输入合法域由 `EnemyTeam` 5-tuple + `startBattle` 固定 5 槽守住 |

定向实测：7 个 test files、55 tests 全绿（state 主/GLM、runtime context、finalization、battle anim driver/integration、cross-module）；其中本卡新增直接测试全文核验为 state 主/GLM 与 finalization 3 个，runtime context test 仅沿用 Q3s 历史核验。测试包含 >3 player、未知 role、null 空槽、对象身份/满血快照、缺 EnemyPos、y offset、资源清理、runner override 和 post-battle resume 反例；不以数量或覆盖率单独验收。

本批未发现直接缺陷。`createBattleState` 的敌人输入在生产 caller 由 `EnemyTeam` 的 5-tuple 和 `startBattle` 的固定五槽循环约束；不凭内部 factory 的宽数组签名新增第二套容量规则。

## 验收条件

- 功能：3 个实现文件全文按职责/字段/owner/caller/primary source/risk/conclusion 登记；关键未知不标已验证。
- 测试：定向/相邻 state/runtime/positions/finalization/animation tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A；战斗演出视觉集中 E2E。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅本卡 3 个实现文件与专属回归（若 direct evidence）。
- 前提核验：`premise verified`（已直接读取 battle.h/global.h/battle.c/fight.c、第一阶段 owners/callers 与 state/runtime/finalization tests）
- 范围、设计和验收条件：`design agree`（只读审计无实现变更；发现行为反例才回到 rework/blocked）
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：`build allowed`（本批无实现改动；仅允许验证和文档/账本收口）。

### 进入 done 前：独立验收

- 贡献者交付与自验：`accept`（Codex 完成 3 个实现文件逐段读证；本卡新增直接测试为 3 个全文核验，另有历史记录复用）。
- Codex 独立复核：`accept`（全仓 check、official ratchet、protected fast、Biome 零诊断及账本/治理正文均已完成）。
- 用户体验/产品验收：N/A（纯状态/资源/位置合同）。
- done 准入结论：`accept`。

## 收口证据

- 定向/相邻：7 个 test files、55 tests 全绿；覆盖 BattleState 工厂、null 空槽/容量、持久状态 seed、runtime resource/runner ownership、finalization cleanup、动画 state 读取和 cross-module 边界。
- 全仓 `pnpm check`：docs 910 Markdown / 4704 links / 309 tasks；content 149/1490；shared 16/131；game 298/3403；pal-extract 69/421；reforge 325/8682；editor 606/4845；migrate 95/723；Biome 3198 files，0 errors / 0 warnings / 0 infos。
- `pnpm coverage:ratchet`：consolidated 726 files / 19,285 tests；statements 88.89% (68812/77410)，branches 82.67% (49777/60209)，functions 88.59% (13032/14710)，lines 90.80% (61540/67775)；baseline unchanged。
- `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：同一 consolidated metrics；coverage gate passed，0 improvements，未下降。
- 文档/静态：`node scripts/docs/check.mjs --json` 0 issues，`git diff --check` 通过；未修改实现文件、schema/save、生成物或 UI。
- 结论：3 个实现文件均有核验记录，但 `battle-positions.ts` 与 runtime context 测试为历史已闭合记录；本卡新增并关闭 5 条记录（2 个 product + 3 个 test），不能外推为全仓治理完成。

## 交接日志

- 2026-10-05 Codex：Q3t 已归档；建立 battle-state/runtime-context/positions 窄卡，先完成 918/98/93 行实现、真实 owners/callers、专属 tests 与 battle.h/global.h/battle.c/fight.c primary source 逐段核验；未获 build 准入前不得修改实现。
- 2026-10-05 Codex：完成前提门、逐段 primary/caller/oracle 核验与 55 个定向/相邻测试；无直接缺陷。全仓 check、official ratchet、protected fast、Biome 零诊断通过，账本关闭 7 条记录，卡转 done 后归档。

## 下一位 Agent 提示词

```text
无下一位 Agent 提示词，Q3u 已由 Codex 独立验收并归档；本卡未重复关闭 Q3m/Q3s 已有记录，全仓逐文件治理仍未完成。
```
