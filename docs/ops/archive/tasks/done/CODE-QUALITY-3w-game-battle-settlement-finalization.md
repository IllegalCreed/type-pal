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
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05 settlement/finalization两文件313行只读审计：回写战果/HPMP、结算屏序、Phase E只一次、半血后cleanup与outcome resume按原caller；无直接缺陷或实现改动。

## 范围

仅67行finalization与246行settlement，progression/宿主只相邻oracle；不接完整battle-system、升级数值、其它actions、save/schema/生成物/演出或runner。finalization.test已Q3u关闭，不重复计新增。

## 前提与证据

原顺序是战果回写→结算屏→Phase E脚本→半血→清理/资源释放/接回，progression数值不由settlement重做。首帧残键、dialog hold与74+1 ticks是原特定超时oracle，不泛化成所有屏固定75tick；本轮未全文重读两实现/C/测试。

## 验收

原4files/196tests、313实现读域保留；50行称两新增测试、67行关闭4，而58行明确只新增2product+1test=3、finalization.test沿用Q3u。按58及总纲194–195/ledger252–254排重3，原4口径guarded。完整check/ratchet/protected/Biome沿用原同轮最新结果，不能写成本卡新跑一次。

## 状态与交接

原done和accept记录保持；旧相反新增计数原字节不动，后继由根治理共享来源，不用再次关闭finalization.test。2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex独立接收，旧producer命令不执行。

以下保留原标题入口。导航指向本卡历史原文或归纳；原命令、build/验收提示及分支操作只按其日期读取，不恢复执行。

### 目标与范围

历史内容见[原始结论](#原始结论)；按原时点读取。

### 前提真值门

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 一句话行为 / 工程前提

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 替代解释与可证伪观察

历史内容见[原始结论](#原始结论)；按原时点读取。

### 逐段证据与结论（2026-10-05 Codex）

历史内容见[原始结论](#原始结论)；按原时点读取。

### 验收与收口证据

历史内容见[原始结论](#原始结论)；按原时点读取。

### 当前模式推进记录

历史内容见[原始结论](#原始结论)；按原时点读取。

### 交接日志

历史内容见[原始结论](#原始结论)；按原时点读取。

### 下一位 Agent 提示词

历史内容见[原始结论](#原始结论)；按原时点读取。

## 历史范围

2026-10-05，原头无Base；4相邻files/196tests、2实现313行、3新增record与已读两专属测试不是同一分母。原沿用完整门未给独立执行SHA/场次，本次不补造fresh run。

## 当时证据

原卡41/50/56–58/67及[总纲](../../../audits/code-quality-governance.md)191–195、[账本](../../../audits/code-quality-file-ledger.md)245/252–254列排重。原raw/coverage或独立旧门日志未本轮回读，不把两文档一致当新的runtime证据。

## 当前有效性

historical，旧2新test/4记录与明确1新test/3记录冲突guarded，保留3新增排重边界。Phase E/半血/cleanup不靠文档重认证；旧完整门复用不是新执行，演出视觉与未知raw继续未验。

## 继任文档

[Q3u](CODE-QUALITY-3u-game-battle-state-runtime.md)提供finalization.test已关闭依据；后续progression等仍另批，不授本包阅读或完成信用。新反例依[现行工作流](../../../agent-workflow.md)另开互斥卡，无可执行旧提示词。

## 原始结论

保存2026-10-05 settlement/finalization两文件313行只读审计：回写战果/HPMP、结算屏序、Phase E只一次、半血后cleanup与outcome resume按原caller；无直接缺陷或实现改动。

当轮验收范围：原4files/196tests、313实现读域保留；50行称两新增测试、67行关闭4，而58行明确只新增2product+1test=3、finalization.test沿用Q3u。按58及总纲194–195/ledger252–254排重3，原4口径guarded。完整check/ratchet/protected/Biome沿用原同轮最新结果，不能写成本卡新跑一次。

完整原卡来自 Git blob `a3d6b073a116051f6a9e82ccd5a8cf7592d9622f`，source revision `83750d8425709257a609c1b9f62b8c6686d53987`；预审 `bb90428668808368e816bd8e2ddeb5da57e4b166` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3w - game battle settlement/finalization 逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality / phase1-mechanics
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: e2e-deferred（结算演出视觉集中 E2E；本卡只验状态/结算/清理合同）
> Contributor: Codex
> Branch: codex/code-quality-governance
>
> ## 目标与范围
>
> 逐文件审计 `packages/game/src/core/battle/battle-finalization.ts`（67 行）与 `battle-settlement.ts`（246 行）的胜利结算、
> Phase E `scriptOnBattleEnd`、半血恢复、资源/模式清理和失败/逃跑收尾；以 SDLPal `battle.c:991-1373,1822-1857`、真实
> `battle-system.tickBattle` caller、settlement/finalization tests 和 progression 相邻 oracle 核真值。范围外：battle-system 全文件、
> progression 实现、magic/item/throw/coop actions、save/schema/migration、生成物、E2E、UI 形态与 coverage runner。
>
> ## 前提真值门
>
> ### 一句话行为 / 工程前提
>
> 结算必须先回写战斗角色与战果，再按 SDLPal 顺序显示结算屏；Phase E 脚本只运行一次且在半血恢复前，最终 cleanup 必须恢复世界状态、释放 runtime context 并按 outcome 接回事件。
>
> | 维度 | 当前真值 | 直接证据 |
> |---|---|---|
> | 原版 / primary source | `PAL_BattleWon` exp/cash/level/hidden/learn screens、Phase E battle-end scripts、半血恢复、BattleCleanup | `reference/sdlpal/battle.c:991-1373,1822-1857` |
> | 第一阶段 | `buildBattleWonSettlement`/`tickBattleSettlement` 建屏、hold、Phase E、半血与 cleanup；`finalizeBattle`/`finalizeBattleCleanup` 统一失败/逃跑/watchdog 收尾 | `battle-settlement.ts:1-246`、`battle-finalization.ts:1-67`、`battle-system.ts:390-530`、settlement/finalization tests |
> | 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
> | 本任务目标 | 2 个实现文件逐段记录 owner/order/outcome/cleanup/caller/oracle；未知保留 review/blocked | 本卡、file ledger、定向/相邻 tests 与全仓门禁 |
>
> ### 替代解释与可证伪观察
>
> - 最强替代解释：progression 负责升级/隐藏经验数值，settlement 只负责屏序与 hold；battle-system 负责 phase 入口，不能重复计 owner。
> - 推翻前提的观察：合法胜利/失败/逃跑路径发生重复 Phase E、半血早于脚本、cash/HP/MP 丢失、资源未释放、mode/resume 错位或首帧残键误翻屏。
>
> ## 逐段证据与结论（2026-10-05 Codex）
>
> 已读取两个实现文件共 313 行、battle-system 真实 caller、battle.c primary source、finalization/settlement 专属测试全文及 progression 相邻段；未改实现。
>
> | 实现段 | owner / 合同 | primary source 与 caller | oracle / 结论 |
> |---|---|---|---|
> | `battle-settlement.ts:1-108` | screen DTO、timeout、BattleResources/State ownership | `battle.c:991-1328`；`battle-system.ts:524-530` | settlement GLM tests；boss exp 5500ms/普通 3000ms、类型屏 3000ms、screen union 合同闭合 |
> | `:109-205` | build battle won screens、runtime 回写、cash、升级/hidden/learn 顺序、Phase E、半血与 cleanup | `battle.c:1025-1372`；`battle-progression.ts`；`battle-system.ts:390-530` | settlement GLM + progression/battle-system adjacent tests；exp/cash 先回写、屏序、Phase E once、半血后 cleanup 均闭合 |
> | `:213-246` | tick settlement hold、首帧吞键、任意键/超时、dialog hold、finish | `battle.c:1048,1218,1272,1324,1334-1372`；`tickBattle` top-level holds | settlement GLM tests；首帧/74+1 ticks/Phase E 对话 hold/半血恢复与资源释放均闭合 |
> | `battle-finalization.ts:1-67` | forced/normal outcome、status/poison/equipment cleanup、wave/mode/battleState/runtime release、postBattle resume | `battle.c:1822-1857`；`battle-system.ts:415,530` | finalization test + settlement adjacent；lost/fled/won cleanup、wave restore、runner/resource release 与 resume 顺序闭合 |
>
> 定向/相邻实测：4 个 test files、196 tests 全绿（finalization、settlement GLM、battle-system lifecycle、battle-progression GLM）。本卡新增直接测试为 finalization.test.ts 与 settlement.glm-next-wave.test.ts；battle-system/progression 仅作相邻 oracle，不计入本卡关闭。
>
> 本批未发现直接缺陷；实现文件和 schema/save/生成物/UI 均未修改。
>
> ## 验收与收口证据
>
> - `pnpm check`、official `pnpm coverage:ratchet`、`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`、Biome 零诊断均沿用本轮最新完整门禁结果；基线未变、coverage 无提升/无下降。
> - 文档检查：`node scripts/docs/check.mjs --json` 0 issues，`git diff --check` 通过。
> - 本卡关闭 3 条新增账本记录（2 product + 1 test）；`battle-finalization.test.ts` 已在 Q3u 关闭，本卡只复用其相邻 oracle，不重复计数；不得外推为全仓完成。
>
> ## 当前模式推进记录
>
> - 前提：`premise verified`；设计：`design agree`；build：`build allowed`（只读审计，无实现变更）。
> - Codex 独立验收：`accept`；用户体验验收：N/A；done：`accept`。
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3v 已归档；完成 settlement/finalization 两文件全文、primary/caller/tests 对照与 196 定向/相邻测试，未发现直接缺陷，关闭 4 条记录并归档。
>
> ## 下一位 Agent 提示词
>
> 无下一位 Agent 提示词，Q3w 已由 Codex 独立验收并归档；继续从账本 pending 范围开下一张不重叠卡。
