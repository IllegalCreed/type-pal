# GLM物品六组：3da6002e收尾复核

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-ITEM-LOGIC-1 第 8 轮 Codex 收尾复核（2026-09-27，候选 3da6002e 本地/远端一致）：counter，仅 helper 与证据收尾；上一轮六处 tuple 和完整错误均接受；未合入、不计覆盖、不新增矩阵或针。

## Scope

这次真正通过：effects 五处与 external battleItems 已拍同一次调用的实际对象；ownership 三条错误改用 expectExactError（Error 且 message 全等）；八针接收检查 exit0（candidateMutationGate=true/missed=[]）；content 98 文件 1178/1178（新增 46）、相邻 executor 17/17、九文件 biome 0/0/0。仅余两个原事项：fixtures expectInputsUnchanged 相对 170283a0 零 diff 仍为旧签名（卡内 r7 声称已恢复无条件 run() 与实际提交不符，给出完整替换函数）；receipt 整文件零 diff 仍留 I2=7、净增 45、fullName 省略号与 targetIds 错定位（应为 I1–I6=8/8/6/8/10/6 总 46，停止针 from 为 stoppedTargets continue），r7 块须明确勘误。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| - 八针+定向+全包 | 八针接收检查 exit0；作者 10 判据自测+46 对照+六针通过；content 1178/1178、相邻 17/17、TC/Biome/docs 零诊断 | Codex | 六个新鲜 JSON 精确 fullName 原文（I1 effectiveStat/I2 equippableItems/I4 removeOwnedItems floor+max/I5 oneAlly 跳过/I6 库存深克隆/I6 引用合同） | 仅改 helper/receipt/evidence 并勘误 r7 块，六业务测试文件已接受不再改 |

## Results

历史结果（原卡时点，本页未复跑）：

counter 仅两事项（helper 旧签名零 diff、receipt 零 diff 与 r7 不实声明）；下一位 GLM 提示词在 quote 全文保全（含六 fullName 原文与替换函数）。

## Evidence

- 证据路径：本复核正文（quote 保全）；/tmp/codex-item-logic-r8-{required,author-mutants,content,adjacent,tc,docs}.log 与两临时目录在 quote 提及。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r8 收尾复核 | 2026-09-27 | 八针闭+两原事项 | counter（仅 helper/receipt 收尾） | r7 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy content/editor-workflows 的第 8 轮复核；固定来源与 source SHA 见下方保全节。

## 原始结论

counter 仅两事项（helper 旧签名零 diff、receipt 零 diff 与 r7 不实声明）；下一位 GLM 提示词在 quote 全文保全（含六 fullName 原文与替换函数）。

## 当时证据

日志前缀、临时目录与六精确 fullName 在 quote 保全。

## 当前有效性

historical。物品六组最终以 r8 后续闭合为准。

## 继任文档

当前结论归 TEST-GLM-ITEM-LOGIC-1-world-use-residuals 完成卡。

## 原文保全

固定源 revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `d35555222c2d9a01aae26e6a898df9a853187a93ac34ac58e76dbceb4f999503`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # GLM物品六组：3da6002e收尾复核
>
> 2026-09-27，候选`3da6002e503d07d421b48b963d0960dc588c521e`，本地/远端一致。
> Codex **counter，仅helper与证据收尾**；[上轮](../../editor/editor-workflows/item-logic-r7-review.md)的六处tuple和完整错误均接受。
> [任务卡](../../../../../ops/archive/tasks/done/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md)。未合入、不计覆盖，不新增矩阵或针。
>
> ## 这次真正通过
>
> - effects五处与external的battleItems已拍同一次调用的实际对象。
> - ownership三条错误改用现有`guard-leaf-fixtures.ts:17-25`的expectExactError，确为Error且message全等；
>   每次调用前后独立快照正确。多留一层重复快照只是冗余，不作为新counter。
> - 独立八针接收检查exit0，candidateMutationGate=true/missed=[]；作者10判据自测+46对照+六针通过。
> - 候选content98文件1178/1178（新增46），相邻executor17/17、content TC零诊断、九文件Biome
>   0error/0warning/0info/0跳过/0截断；docs/diff通过，产品未改。
> - 日志`/tmp/codex-item-logic-r8-{required,author-mutants,content,adjacent,tc,docs}.log`，
>   content/adjacent/Biome新鲜JSON同前缀。八针末目录`codex-item-logic-review-5Cj1O7`，
>   作者六针目录`type-pal-item-logic-mutants-kBwxUq`（本机临时目录）。
>
> ## 仅余两个原事项
>
> 1. `packages/content/src/__tests__/glm-item-logic-fixtures.ts:106-111`整文件相对170283a0 **零diff**，
>    仍为`run:(value:object)=>void`及`if(inputs.length>0) run(inputs[0] as object)`。
>    卡内r7声称已恢复无条件run()，与实际提交不符。只替换此函数为：
>
> ```ts
> export function expectInputsUnchanged(run: () => void, inputs: readonly object[]): void {
>   const snapshots = inputs.map((input) => deepSnapshot(input))
>   run()
>   inputs.forEach((input, index) => {
>     expect(input).toEqual(snapshots[index])
>   })
> }
> ```
>
> 2. `docs/testing/archive/legacy/batches/glm-item-logic/receipt.md`整文件同样 **零diff**，仍留I2=7、净增45、
>    fullName省略号、旧external标题与错误targetIds针。机账虽改若干段，
>    `oracle.needles`仍有前三针不完整fullName与`targetIds continue`错定位。
>    应为I1/I2/I3/I4/I5/I6 = **8/8/6/8/10/6，总46**；停止针from为
>    `if (stoppedTargets.has(next.id)) continue`，不是targetIds。当前正式helper名称为expectInputsUnchanged。
>    旧卡声称“全部同步”的r7块必须明确勘误，不再仅在尾部复述完成。
>
> 以下是本席新鲜Vitest JSON中的六个精确fullName，可直接用于回执/机账，无需猜标题：
>
> ```text
> I1 effectiveStat（content 内零直测的派生口） 同名 stat 累加、异 stat 与非 statBonus 不串扰，map 外装备 id 回退
> I2 equippedItemIds / equippableItems / usableItems 残差 equippableItems 过滤 count>0 与模板（count 0 不列）
> I4 removeOwnedItems 原地合同 需求 0/负数/非整数：floor+max 语义
> I5 目标类效果残差 oneAlly 跳过非目标；allAllies 复合链跳过已停表目标
> I6 completeExternalWorldItemUse 残差 consuming 扣 1 件：完整 world 结果 = 输入深克隆仅变库存
> I6 completeExternalWorldItemUse 残差 world 引用合同：consumedByExternal 与不消费都返回原 world 引用
> ```
>
> ## 下一位GLM提示词
>
> 在`codex/glm-item-logic-r1`基于3da6002e，先读取origin/main本文。只改helper、receipt、evidence，
> 并勘误本卡你自己的r7交付块；六个业务测试文件已接受，**不要再改**，不新增矩阵/用例/反控。
> helper按上方完整函数恢复；receipt改8/8/6/8/10/6=46、净增46和正确helper名；
> 六针fullName使用本文新鲜JSON原文，停止针钉stoppedTargets，机账同步。
> 提交前用`git diff 3da6002e..HEAD --name-only`确认helper与receipt确实出现在提交中，
> 再用`git show HEAD:<path>`核函数体与表格，不能用“八针通过”代替实际文件检查。
> 按卡复跑46/相邻/content/TC/九文件Biome/docs/diff/既有八针与作者六针，静态诊断全零。
> 推送完整SHA交Codex；不改产品/旧测试/基线/本席工具、不合main、不标done、不跑全仓coverage。
>
<!-- original-source-quote:end -->
