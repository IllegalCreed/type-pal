# GLM物品六组：170283a0窄复核

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-ITEM-LOGIC-1 r7 窄复核（候选 `170283a0…118e`，2026-09-27，本地/远端一致）的 Codex 回执：**counter**——只剩原 R3/R4 清单（六处同一实参仍不符+三条收尾项），未增加矩阵或变异针要求。

## Scope

- 候选 170283a040e889f4388d0225a1b943983030118e；对象=packages/content item 六组测试；任务卡 TEST-GLM-ITEM-LOGIC-1；上一轮 r6。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| 已闭项 | derived 逐次快照/noUse 具名输入/负数小数 world 前后比较 | 八针接收工具 | exit0、candidateMutationGate=true、missed=[] | content 1178/1178、TC 零诊断、九文件 Biome 0/0/0 |
| 六处实参 | item.effects.background.test.ts:143/172/200/252/289、item.external.background.test.ts:136 | 多输入 helper（expectInputsUnchanged 类） | 五处仍拍外层同名 items、第六处漏拍 battleItems | 应改为 (replay, replayItems)/(alive, aliveItems)/(defsMissing, tierItems)/(plain, plainItems)/(floored, floorItems)/(w, battleItems) 六个 tuple |
| 收尾项 | ownership:110/128/134 toThrow(string)；fixture:106-111 run(value)；receipt:19/46/36 | 原清单 | 子串匹配/空 inputs 不执行/回执数字与真针名错误 | 应改完整错误等值、恢复 run:()=>void 无条件调用、勘误 I2=8 与 46 项、stoppedTargets 真针名 |

## Results

- 六 tuple 只替换现有调用，无需新增用例；八针通过不代替这份清单，须 `git show HEAD:<file>` 逐项确认实际提交树。
- 定点提示词：基于 170283a0 只闭六 tuple/三条完整错误/helper 恢复/回执勘误，不做新矩阵，不动已接受项/产品/旧测试/基线/Codex 工具；静态诊断全零后从新鲜 JSON 生成 46/I2=8。

## Evidence

- 证据路径：本回执正文（quote 保全）；日志 `/tmp/codex-item-logic-r7-*.log|json`（历史 /tmp，注意未带 candidate 的 content/TC 日志来自主树，不作为本候选证明）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r7 窄复核 | 2026-09-27 | 六实参+三收尾项 | counter（卡保持原清单） | r6 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的 item-logic r7 复核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

counter：六处同一实参不符+三条收尾项；已闭项不重开；候选证据口径（主树日志≠候选证明）已澄清。

## 当时证据

六 tuple 锚点表、收尾项行号与证据口径在 quote 保全。

## 当前有效性

historical。counter 仅指当时候选；后续轮次见同目录 r1-r8 系列与任务卡。

## 继任文档

当前结论归 TEST-GLM-ITEM-LOGIC-1 完成卡与 canonical 测试。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `75e026e6678e349598b3648d29d7912bbf9545b530f76d85a52f38fd7bb9fdbd`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # GLM物品六组：170283a0窄复核
>
> 2026-09-27，候选`170283a040e889f4388d0225a1b943983030118e`，本地/远端一致。
> Codex **counter**；只剩原R3/R4清单，未增加矩阵或变异针。
> [任务卡](../../../../../ops/archive/tasks/done/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md) / [上一轮](item-logic-r6-review.md)。
>
> ## 已闭，不重开
>
> derived逐次快照、noUse具名输入、负数/小数实际world前后比较均已落地。
> 八针独立接收检查exit0、candidateMutationGate=true、missed=[]；候选content1178/1178、
> 候选TC零诊断、九文件Biome零error/warning/info。R1/R2/毒表/旧effectResults保持。
> 证据：`/tmp/codex-item-logic-r7-required.log`、`-candidate-content.json`、`-candidate-tc.log`、`-biome.json`。
> 注意未带candidate的content/TC日志来自主树，不作为本候选证明。
>
> ## 六处同一实参仍不符
>
> | 候选锚点（packages/content/src/） | 真正消费的catalog | 当前快照 | 应修为 |
> |---|---|---|---|
> | item.effects.background.test.ts:143-144 | replayItems | replay, items | replay, replayItems |
> | 同文件:172-173 | aliveItems | alive, items | alive, aliveItems |
> | 同文件:200-201 | tierItems | defsMissing, items | defsMissing, tierItems |
> | 同文件:252-253 | plainItems | plain, items | plain, plainItems |
> | 同文件:289-290 | floorItems | floored, items | floored, floorItems |
> | item.external.background.test.ts:136-137 | battleItems | w | w, battleItems |
>
> 改用多输入helper本身不等于保护了实际输入；上述五处仍拍外层同名items，第六处漏拍。
> 只替换现有调用的六个tuple，无需新增用例或重写其业务预期。
>
> ## 原收尾项仍在
>
> - ownership:110/128/134三处`toThrow(string)`仍为子串匹配。按原清单改为完整错误等值或首尾锚定；
>   新增的world快照已接受，不重做。
> - fixture:106-111仍是新增的`run(value)`且空inputs不执行。恢复`run:()=>void`与无条件`run()`；
>   保留before快照、块状forEach。当前调用均零参数闭包，不需要新契约。
> - receipt:19仍写I2=7，:46净增45；实际I2=8、46项。:36/evidence的停止针仍写targetIds，
>   真针为stoppedTargets。fullName省略号/旧external标题未修。旧“全部完成”声明须明确勘误。
>
> ## 给GLM的定点提示词
>
> 在`codex/glm-item-logic-r1`基于170283a0，先读origin/main本文。只闭上述六个tuple、
> 三条完整错误、helper恢复及回执勘误；不要再做新矩阵，不动已接受项/产品/旧测试/基线/Codex工具。
> 完成后用`git show HEAD:<file>`逐项确认实际提交树，不能以八针通过代替这份清单。
> 按原卡复跑八针接收工具、作者六针与自测、定向/相邻/content/TC/九文件Biome/docs/diff，
> 静态诊断全零；从新鲜JSON生成46/I2=8及精确fullName。提交推送完整SHA，交Codex接收。
> 不合main、不标done、不跑全仓coverage。Codex继续001，不让本包阻塞E2E。
>
<!-- original-source-quote:end -->
