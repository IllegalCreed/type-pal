# GLM物品六组：170283a0窄复核

2026-09-27，候选`170283a040e889f4388d0225a1b943983030118e`，本地/远端一致。
Codex **counter**；只剩原R3/R4清单，未增加矩阵或变异针。
[任务卡](../ops/archive/tasks/done/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md) / [上一轮](item-logic-r6-review.md)。

## 已闭，不重开

derived逐次快照、noUse具名输入、负数/小数实际world前后比较均已落地。
八针独立接收检查exit0、candidateMutationGate=true、missed=[]；候选content1178/1178、
候选TC零诊断、九文件Biome零error/warning/info。R1/R2/毒表/旧effectResults保持。
证据：`/tmp/codex-item-logic-r7-required.log`、`-candidate-content.json`、`-candidate-tc.log`、`-biome.json`。
注意未带candidate的content/TC日志来自主树，不作为本候选证明。

## 六处同一实参仍不符

| 候选锚点（packages/content/src/） | 真正消费的catalog | 当前快照 | 应修为 |
|---|---|---|---|
| item.effects.background.test.ts:143-144 | replayItems | replay, items | replay, replayItems |
| 同文件:172-173 | aliveItems | alive, items | alive, aliveItems |
| 同文件:200-201 | tierItems | defsMissing, items | defsMissing, tierItems |
| 同文件:252-253 | plainItems | plain, items | plain, plainItems |
| 同文件:289-290 | floorItems | floored, items | floored, floorItems |
| item.external.background.test.ts:136-137 | battleItems | w | w, battleItems |

改用多输入helper本身不等于保护了实际输入；上述五处仍拍外层同名items，第六处漏拍。
只替换现有调用的六个tuple，无需新增用例或重写其业务预期。

## 原收尾项仍在

- ownership:110/128/134三处`toThrow(string)`仍为子串匹配。按原清单改为完整错误等值或首尾锚定；
  新增的world快照已接受，不重做。
- fixture:106-111仍是新增的`run(value)`且空inputs不执行。恢复`run:()=>void`与无条件`run()`；
  保留before快照、块状forEach。当前调用均零参数闭包，不需要新契约。
- receipt:19仍写I2=7，:46净增45；实际I2=8、46项。:36/evidence的停止针仍写targetIds，
  真针为stoppedTargets。fullName省略号/旧external标题未修。旧“全部完成”声明须明确勘误。

## 给GLM的定点提示词

在`codex/glm-item-logic-r1`基于170283a0，先读origin/main本文。只闭上述六个tuple、
三条完整错误、helper恢复及回执勘误；不要再做新矩阵，不动已接受项/产品/旧测试/基线/Codex工具。
完成后用`git show HEAD:<file>`逐项确认实际提交树，不能以八针通过代替这份清单。
按原卡复跑八针接收工具、作者六针与自测、定向/相邻/content/TC/九文件Biome/docs/diff，
静态诊断全零；从新鲜JSON生成46/I2=8及精确fullName。提交推送完整SHA，交Codex接收。
不合main、不标done、不跑全仓coverage。Codex继续001，不让本包阻塞E2E。
