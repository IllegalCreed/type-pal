# GLM物品六组：37027b2d固定清单复核

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-ITEM-LOGIC-1 r6 固定清单复核（候选 `37027b2d…7615`，2026-09-27，本地/远端一致）的 Codex 回执：仍 **counter**——本轮无新业务要求或新反控针，未合候选、未改贡献者测试、不计覆盖。

## Scope

- 候选 37027b2d89e671a4442d0a405d99f9ce9efb7615；对象=原 R3 固定清单执行核验；机账 item-logic-r6-review-evidence.json。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| 已过项 | external consuming 旧 effectResults 断言恢复、fixture 排序+块状 forEach、derived not-owned 保护、README 46/46 | 八针接收工具 | true/exit0/missed=[]；content 98 文件 1178/1178、executor 17/17、作者 46 对照+六针+10 自测均过；九文件 Biome 0/0/0 | R1/R2/八针/毒表/旧断言与零诊断不重开 |
| R3 残项 | derived:85-89/217-220（三次 effectiveStat、GrantedStatuses、attackAll 打包一个快照；:125-127 Resistances 只拍 c）、preflight:82-86（noUse 现场造匿名 catalog）、ownership:126-134（负数/非整数拒绝无 before/after、toThrow 子串）、effects 14 处单输入助手漏 catalog、external 五处只拍 world | git diff 核 | ownership/effects 相对 2796124b 零 diff | 任务卡「I3 已具名/I5/I6 全部保护/负数已补」声明与代码不符——是可直接核对的事实，不是复核加门槛 |
| R4 残项 | receipt 合计 I2=7/净增 45（真实 I2=8/净增 46）；resolve-stopped-skip 针 ID 改了但源码锚仍 targetIds（实际门为 stoppedTargets）；fullName 省略号；external 标题 | 回执核 | 数字/锚点不符 | 旧「已全部完成」须明确勘误；八针通过不代表未修改的输入保护自动成立 |
| helper 撤回 | expectInputsUnchanged 被改为 run:(value:object)=>void 且仅 inputs 非空才执行 | 契约核 | 所有现行调用是零参数闭包 | 恢复无条件 run()，保留 before 快照与块状 forEach；撤回无关契约改动 |

## Results

- 给 GLM 定点提示词：基于 37027b2d 逐行清表、不重做已过项、不新增矩阵；git show HEAD 逐项确认实际函数体；复跑八针门/定向/相邻/content/TC/九文件 Biome/docs/diff；静态诊断全零后推送完整 SHA。

## Evidence

- 证据路径：本回执正文（quote 保全）；日志 /tmp/codex-item-logic-r6-*.log 与机账 JSON。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r6 复核 | 2026-09-27 | 固定清单执行核 | counter | r5 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的 item-logic r6 复核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

counter：R3 五类清单未执行完+R4 数字/锚点不符+helper 无关改动应撤回；已过项不重做。

## 当时证据

锚点表、零 diff 事实与提示词在 quote 保全。

## 当前有效性

historical。counter 仅指当时候选；最终闭合见 item-logic-integration.md（26e7a269）。

## 继任文档

当前结论归 TEST-GLM-ITEM-LOGIC-1 完成卡与 canonical 测试。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `687064bde082a6f5e325791c6e07891d4ebfdcd141750fd041b60ceb78b4a68f`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # GLM物品六组：37027b2d固定清单复核
>
> 2026-09-27，候选`37027b2d89e671a4442d0a405d99f9ce9efb7615`（本地/远端一致），Codex仍 **counter**。
> [任务卡](../../../../../ops/archive/tasks/done/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md) /
> [上一轮固定清单](../../content/editor-workflows/item-logic-r5-review.md) / [机账](item-logic-r6-review-evidence.json)。
> 本轮没有新业务要求或新反控针；未合候选、未改贡献者测试、不计覆盖。
>
> ## 本轮确实通过，不重做
>
> - external consuming旧`effectResults`断言已恢复，完整world比较保持。
> - fixture导入排序与块状forEach恢复，九文件Biome0error/0warning/0info/0截断；content TC零诊断。
> - derived若干catalog及preflight的not-owned输入保护已经落盘；README总数46/46已改。
> - 八针接收检查再次 **true/exit0/missed=[]**；content98文件1178/1178、executor17/17、作者46对照+六针+10自测均过。
> - 产品/旧测试/配置/基线零改，docs/diff通过；R1/R2/八针/毒表/旧断言与零诊断不重开。
>
> ## 仍未执行完的原R3清单
>
> | 文件/当前锚 | 实际提交 | 只需完成的原要求 |
> |---|---|---|
> | derived:85-89、217-220 | 三次effectiveStat、GrantedStatuses与attackAll仍打包一个快照；:125-127的Resistances仍只拍c | 拆成逐次调用快照；Resistances加入实际items |
> | preflight:82-86 | noUse仍现场造匿名catalog，快照却拍外层items | 先具名noUseCatalog，调用与快照传同一个对象 |
> | ownership:126-134 | 本轮整文件零diff，负数/非整数拒绝仍无before/after；三种错误仍是toThrow子串 | 每次拒绝前拍实际world、后立即比，核完整错误 |
> | effects | 本轮整文件零diff；71/95/143/160/172/188/200/243/252/272/289/306/324/339的单输入助手仍漏catalog | 在这些已有调用中加入实际catalog，已修毒表不动 |
> | external:51/63/93/100/113/135附近 | 除consuming外，其它调用仍只拍world，没包含items/battleItems | 原调用改为同一次world+实际catalog快照 |
>
> 任务卡新交付块写“I3已具名noUseCatalog”“I5/I6全部保护”“负数/小数已补”，但上述代码并未落盘。
> 尤其ownership/effects相对2796124b零diff，是可直接核对的事实，不是复核增加门槛。
> 完整错误可用明确等值/首尾锚定断言；removeOwnedItems原地合同不改。无需新增矩阵或增加46用例数。
>
> ## R4仍不符
>
> - receipt合计仍I2=7、净增45；真实I2=8、净增46。
> - resolve-stopped-skip虽然改了针ID，源码锚仍写targetIds；实际runner删stoppedTargets门。
> - receipt/evidence的fullName仍有省略号，external标题仍非当前“完整world结果”标题。
> - 旧回执/卡的“已全部完成”应明确勘误，不能再只在尾部追加同一句声称。
>   八针通过只是八针通过，不代表尚未修改的这些输入保护自动成立。
>
> ## 非必要helper改动应撤回
>
> 本轮把`expectInputsUnchanged`从`run:()=>void; run()`改为`run:(value:object)=>void`，且仅当inputs非空才执行。
> 所有现行调用均是零参数闭包，不需要这个新参数；恢复无条件`run()`，保留已正确的before快照与块状forEach。
> 这是撤回无关契约改动，不增加业务范围，不要继续重写fixture。
>
> ## 证据与下一位提示词
>
> `/tmp/codex-item-logic-r6-{required-gate,content,tc,mutants,adjacent}.log`和新鲜content/executor/Biome JSON；
> 八针目录及逐候选结果见机账。本轮不跑全仓check/coverage、不启动浏览器，主树WIP保持。
>
> 给GLM：基于37027b2d，先fetch读取origin/main本文。只逐行清上表，不重做已过项，不新增矩阵。
> 先真正修改derived/preflight/ownership/effects/external的指定调用，再恢复helper无条件run()；
> 每一项用git show HEAD查看实际函数体，不以“文件已改”或“八针已过”代替清单检查。
> 最后改receipt/evidence/卡的真实46、I2=8、精确fullName、stoppedTargets锚和历史勘误。
> 复跑八针门、原卡定向/相邻/content/TC/九文件Biome/docs/diff/作者六针；静态诊断全零。
> 提交前逐条对照本表，不要提交“声明完成但函数体未改”的回执。推送完整SHA交Codex；
> 不改产品/旧测试/基线/Codex工具，不合main、不标done、不跑全仓coverage。
>
<!-- original-source-quote:end -->
