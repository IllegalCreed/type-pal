# GLM物品六组：2796124b收尾复核

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 3dc90ad8f6dde5a7ddcafc6b749b61dd53152751；本轮 R78。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- GLM物品六组：2796124b收尾复核：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `5ea9f699f2cbba36723680b37dedd5ee44c51cf9fba0e58894369f3ed86fee76`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # GLM物品六组：2796124b收尾复核
>
> 2026-09-27，候选`2796124bb7d582e9eb0016fb33ab5501691d3e70`（本地/远端一致）。
> Codex **counter：八针已闭，但上一轮固定清单/旧断言/回执/零诊断尚未齐**。
> [任务卡](../../../../../ops/archive/tasks/done/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md) /
> [上轮固定清单](../../editor/editor-workflows/item-logic-r4-review.md) / [机账](item-logic-r5-review-evidence.json)。
> 不改贡献者测试语义，不合候选、不计覆盖。本轮没有新增业务合同或矩阵。
>
> ## 已关闭，禁止重做
>
> - derived:148-152现具名learned并比较同一learned/c/items；ownership:110-112现于空键调用前拍world、调用后比。
> - 本席新鲜运行[八针接收检查](../../../../domains/editor/editor-workflows/tools/item-logic-required-witnesses.mjs)：**exit0，candidateMutationGate=true，missed=[]**。
>   所有原实现正控绿、8个candidate-mutant都exit1且为候选AssertionError；原独立oracle、源码/hash保护照常。
> - R1合法构造器、R2全部数值/完整world/RNG、毒表真实实参继续保持接受，不重开。
> - 本席content98文件1178/1178（新增46）、executor17/17、content TC0诊断；作者46对照+六针+10自测全过。
>   产品/旧测试/配置/基线零漂移，docs/diff通过。
>
> ## 原清单仍未落盘
>
> `3ac52586..2796124b`只动fixture、derived、ownership及receipt；preflight/effects/external/README/evidence均零diff。
> 因此上轮已列明的下列收尾仍未完成：
>
> 1. **R3实际数据实参**：I1除了learned/battleSprite映射例，effectiveStat/Resistances/GrantedStatuses/Regen等仍漏items，
>    多次调用仍打包后才比较；I3:83-87实际匿名catalog与快照的外层items不是同一对象，not-owned漏items；
>    I5/I6仅包world的已有调用仍漏实际catalog。按上轮固定列表逐调用补，不增加测试用例。
> 2. **R3拒绝路径**：ownership:126-134的负数/非整数仍无前后快照；三种拒绝的toThrow字符串仍只匹配子串。
>    每次调用前拍实际world、检查完整错误、后立即比较。空键的快照已修，不要改回。
> 3. **恢复旧断言**：external完整world用例仍未恢复原`effectResults`的单条runScript结果断言。
>    保留完整world比较，恢复上轮列出的原句；不是要求新多效果矩阵。
> 4. **R4最终账**：README仍45行/45对照；receipt仍I2=7、净增45、resolve-target-skip/targetIds与错误类别；
>    evidence仍targetIds和过时/省略fullName。1178与warning两处本轮已纠正，剩余正文及历史不实声明仍需勘误。
>    八针现在真通过，不追溯把前几轮候选绿改成历史红。
>
> ## 本轮新增2条硬质量错误
>
> 九文件Biome完整报告：**2error /0warning /0info /0截断**，都在
> `packages/content/src/__tests__/glm-item-logic-fixtures.ts`：
>
> - :7-13 `assist/source/organizeImports`，import顺序被本轮重写打乱；
> - :99 `lint/suspicious/useIterableCallbackReturn`，forEach表达式回调返回matcher调用结果。
>
> 恢复块状回调即可，不再无关重写fixture，不加ignore、不放宽规则：
>
> ```ts
> inputs.forEach((input, index) => {
>   expect(input).toEqual(snapshots[index])
> })
> ```
>
> TC和测试exit0不覆盖lint错误。主线QUALITY-ZERO规则保持；这是本候选新改动引入，不是可豁免存量。
>
> ## 证据与交接
>
> `/tmp/codex-item-logic-r5-{required-gate,content,tc,mutants,adjacent}.log`与新鲜content/executor/完整Biome JSON；
> 八针原始目录及各候选失败身份见机账。没有跑全仓check/coverage或浏览器，主树WIP未改。
>
> 给GLM：在原分支以2796124b收尾，先读origin/main本文与r4固定清单。八针/已接受业务不重开；
> 先逐调用补清单中遗漏的真实catalog等实参、负数/非整数拒绝快照与完整错误；恢复external旧effectResults断言；
> 把fixture导入排序和forEach改回零诊断形式。不要继续只改回执或无关重写fixture。
> 随后从实际提交树修README/receipt/evidence/卡的真实46/1178、I2=8、六针精确fullName/stoppedTargets/正确类别及历史勘误。
> 复跑八针接收检查（必须true/exit0）、原卡定向/相邻/content/TC/九文件Biome/docs/diff与作者反控；静态全零。
> 八针通过仅表示八针闭合，不能替代本清单验收。逐条git show HEAD核实后提交推送完整SHA。
> 不扩业务范围、不改产品/旧测试/基线/Codex工具、不跑全仓coverage、不合main、不标done；交Codex统一接收。
>
<!-- original-source-quote:end -->
