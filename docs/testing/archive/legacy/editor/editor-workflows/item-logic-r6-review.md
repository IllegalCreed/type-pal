# GLM物品六组：37027b2d固定清单复核

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 85c462ffd5a6d8514604d346abd96212340c5dfa；本轮 R79。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- GLM物品六组：37027b2d固定清单复核：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `687064bde082a6f5e325791c6e07891d4ebfdcd141750fd041b60ceb78b4a68f`；下方 quote 可逆回原始 UTF-8 字节。
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
