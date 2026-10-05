# CODE-QUALITY-3w - game battle settlement/finalization 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（结算演出视觉集中 E2E；本卡只验状态/结算/清理合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标与范围

逐文件审计 `packages/game/src/core/battle/battle-finalization.ts`（67 行）与 `battle-settlement.ts`（246 行）的胜利结算、
Phase E `scriptOnBattleEnd`、半血恢复、资源/模式清理和失败/逃跑收尾；以 SDLPal `battle.c:991-1373,1822-1857`、真实
`battle-system.tickBattle` caller、settlement/finalization tests 和 progression 相邻 oracle 核真值。范围外：battle-system 全文件、
progression 实现、magic/item/throw/coop actions、save/schema/migration、生成物、E2E、UI 形态与 coverage runner。

## 前提真值门

### 一句话行为 / 工程前提

结算必须先回写战斗角色与战果，再按 SDLPal 顺序显示结算屏；Phase E 脚本只运行一次且在半血恢复前，最终 cleanup 必须恢复世界状态、释放 runtime context 并按 outcome 接回事件。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_BattleWon` exp/cash/level/hidden/learn screens、Phase E battle-end scripts、半血恢复、BattleCleanup | `reference/sdlpal/battle.c:991-1373,1822-1857` |
| 第一阶段 | `buildBattleWonSettlement`/`tickBattleSettlement` 建屏、hold、Phase E、半血与 cleanup；`finalizeBattle`/`finalizeBattleCleanup` 统一失败/逃跑/watchdog 收尾 | `battle-settlement.ts:1-246`、`battle-finalization.ts:1-67`、`battle-system.ts:390-530`、settlement/finalization tests |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 2 个实现文件逐段记录 owner/order/outcome/cleanup/caller/oracle；未知保留 review/blocked | 本卡、file ledger、定向/相邻 tests 与全仓门禁 |

### 替代解释与可证伪观察

- 最强替代解释：progression 负责升级/隐藏经验数值，settlement 只负责屏序与 hold；battle-system 负责 phase 入口，不能重复计 owner。
- 推翻前提的观察：合法胜利/失败/逃跑路径发生重复 Phase E、半血早于脚本、cash/HP/MP 丢失、资源未释放、mode/resume 错位或首帧残键误翻屏。

## 逐段证据与结论（2026-10-05 Codex）

已读取两个实现文件共 313 行、battle-system 真实 caller、battle.c primary source、finalization/settlement 专属测试全文及 progression 相邻段；未改实现。

| 实现段 | owner / 合同 | primary source 与 caller | oracle / 结论 |
|---|---|---|---|
| `battle-settlement.ts:1-108` | screen DTO、timeout、BattleResources/State ownership | `battle.c:991-1328`；`battle-system.ts:524-530` | settlement GLM tests；boss exp 5500ms/普通 3000ms、类型屏 3000ms、screen union 合同闭合 |
| `:109-205` | build battle won screens、runtime 回写、cash、升级/hidden/learn 顺序、Phase E、半血与 cleanup | `battle.c:1025-1372`；`battle-progression.ts`；`battle-system.ts:390-530` | settlement GLM + progression/battle-system adjacent tests；exp/cash 先回写、屏序、Phase E once、半血后 cleanup 均闭合 |
| `:213-246` | tick settlement hold、首帧吞键、任意键/超时、dialog hold、finish | `battle.c:1048,1218,1272,1324,1334-1372`；`tickBattle` top-level holds | settlement GLM tests；首帧/74+1 ticks/Phase E 对话 hold/半血恢复与资源释放均闭合 |
| `battle-finalization.ts:1-67` | forced/normal outcome、status/poison/equipment cleanup、wave/mode/battleState/runtime release、postBattle resume | `battle.c:1822-1857`；`battle-system.ts:415,530` | finalization test + settlement adjacent；lost/fled/won cleanup、wave restore、runner/resource release 与 resume 顺序闭合 |

定向/相邻实测：4 个 test files、196 tests 全绿（finalization、settlement GLM、battle-system lifecycle、battle-progression GLM）。本卡新增直接测试为 finalization.test.ts 与 settlement.glm-next-wave.test.ts；battle-system/progression 仅作相邻 oracle，不计入本卡关闭。

本批未发现直接缺陷；实现文件和 schema/save/生成物/UI 均未修改。

## 验收与收口证据

- `pnpm check`、official `pnpm coverage:ratchet`、`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`、Biome 零诊断均沿用本轮最新完整门禁结果；基线未变、coverage 无提升/无下降。
- 文档检查：`node scripts/docs/check.mjs --json` 0 issues，`git diff --check` 通过。
- 本卡关闭 3 条新增账本记录（2 product + 1 test）；`battle-finalization.test.ts` 已在 Q3u 关闭，本卡只复用其相邻 oracle，不重复计数；不得外推为全仓完成。

## 当前模式推进记录

- 前提：`premise verified`；设计：`design agree`；build：`build allowed`（只读审计，无实现变更）。
- Codex 独立验收：`accept`；用户体验验收：N/A；done：`accept`。

## 交接日志

- 2026-10-05 Codex：Q3v 已归档；完成 settlement/finalization 两文件全文、primary/caller/tests 对照与 196 定向/相邻测试，未发现直接缺陷，关闭 4 条记录并归档。

## 下一位 Agent 提示词

无下一位 Agent 提示词，Q3w 已由 Codex 独立验收并归档；继续从账本 pending 范围开下一张不重叠卡。
