# E2 内容校验边界解环与嵌套对话漏检修复

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 226f8cb90880b74c82f3c39b6e09d949f2a16e7b；本轮 R77。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- E2 内容校验边界解环与嵌套对话漏检修复：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `226f8cb90880b74c82f3c39b6e09d949f2a16e7b`，source SHA `df603641731518b8947636ed16196029649b5b237f028b5b04260d64dc4602f5`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # E2 内容校验边界解环与嵌套对话漏检修复
>
> 2026-09-26，属于 [连续治理卡](../../../../../ops/archive/tasks/done/ARCH-CONTINUATION-1-remaining-queue.md)，Codex实施、自验。用户授权架构治理；两项变更分提交：`ebef3d5a`修真实缺陷，`4cdefcf1`拆依赖。
>
> ## 缺陷不是架构推测
>
> 原`author-script-core.ts:712`调用`checkBattleChoreography`却漏传校验options；作者对话的identity合同由`author-script.ts`注入，因此直接dialog缺identity会拒绝，放进startBattle.choreography却会放行。G06-D1与本席反证均复现；这不是“有环所以有bug”的推断。
>
> 修复只补该调用的options：不改变runtime cue方言，不改内容/存档版本。新增`author-battle-dialogue-boundary.test.ts`13项在修前9项业务红/4合法对照绿；修后13/13、content全包863/863。覆盖直接及七种递归容器的完整错误路径、三种合法作者身份、实际cue引用和回调路径，runtime无作者identity仍按既有合同通过。
>
> ## 下层边界
>
> - command-validation-options：仅类型协议，旧author模块re-export同一类型。
> - enemy-validation-shapes：只含敌人校验原来的基础形状规则；不擅自与作者侧不同规则合并。
> - enemy-ai-condition-guard：AI条件递归守卫，不依赖作者命令。
> - battle-choreography：演出动作类型/校验，只依赖上述下层及script基础规则。
> - enemy-script保留hook/onDefeated/rules政策，author-script-core直接依赖新的演出守卫，反向边消失。
>
> 运行 `node docs/testing/domains/content/authoring-and-runtime/tools/content-validation-refactor-audit.mjs` 可复算：按TypeScript擦除类型后的content生产静态图，原author-script-core↔enemy-script二节点环→无环；旧入口导出集合52/19精确保持。以已修缺陷、未拆结构的`ebef3d5a`为基点，50个函数体逐token全等，11个迁入下层，结构提交没有夹带第二处行为修正。动态调用关系不由静态无环证明。
>
> ## 接入边界
>
> 与[D1](../../../../domains/phase1-runtime/dependencies/dependency-ownership/report.md)统一执行本轮完整check、ratchet、单次受保护strict，不复用r11复核分支含四项GLM测试副本的统计；本次E2只计13项Codex回归。r11原冻结诊断作为历史红保留，GLM报告和候选不被改写或合入。
>
> 最终门禁与指标见D1回执；full/Q1/Q2/剧情E2E不借此关闭。
>
<!-- original-source-quote:end -->
