# E2 内容校验边界解环与嵌套对话漏检修复

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 ARCH-CONTINUATION-1 E2 内容校验边界解环与嵌套对话漏检修复回执（2026-09-26，Codex 实施自验；用户授权架构治理；两项变更分提交：ebef3d5a 修真实缺陷、4cdefcf1 拆依赖）。

## Scope

- 缺陷不是架构推测：原 author-script-core.ts:712 调 checkBattleChoreography 漏传校验 options——作者对话 identity 合同由 author-script.ts 注入，直接 dialog 缺 identity 会拒绝、放进 startBattle.choreography 却放行（G06-D1 与本席反证均复现）。

## Execution and assertions

- **修复**：只补该调用 options：不改 runtime cue 方言、不改内容/存档版本；新增 author-battle-dialogue-boundary.test 13 项修前 9 业务红/4 合法对照绿；修后 13/13+content 全包 863/863；覆盖直接与七种递归容器完整错误路径、三种合法作者身份、实际 cue 引用与回调路径；runtime 无作者 identity 仍按既有合同通过
- **下层边界**：command-validation-options（仅类型协议旧模块 re-export）+enemy-validation-shapes（只含敌人原基础形状不与作者侧合并）+enemy-ai-condition-guard（AI 条件递归守卫不依赖作者命令）+battle-choreography（演出动作依赖上述下层与 script 基础规则）；enemy-script 保留 hook/onDefeated/rules，author-script-core 直接依赖新演出守卫反向边消失
- **审计复算**：content-validation-refactor-audit.mjs 按 TypeScript 擦除类型后 content 生产静态图：原 author-script-core↔enemy-script 二节点环→无环；旧入口导出集合 52/19 精确保持；以已修缺陷未拆结构的 ebef3d5a 为基点 50 个函数体逐 token 全等、11 个迁入下层——结构提交没有夹带第二处行为修正；动态调用关系不由静态无环证明
- **接入边界**：与 D1 统一执行本轮完整 check/ratchet/单次受保护 strict，不复用 r11 复核分支含四项 GLM 测试副本的统计；本次 E2 只计 13 项 Codex 回归；r11 原冻结诊断作为历史红保留，GLM 报告和候选不被改写或合入；最终门禁与指标见 D1 回执；full/Q1/Q2/剧情 E2E 不借此关闭

## Results

- E2 修复+四下层拆环：:712 漏传 options 嵌套对话放行真实缺陷 13 项先红后绿；50 函数体逐 token 等证无夹带；与 D1 统一门通过。

## Evidence

- 证据路径：本回执正文（quote 保全）；审计工具链接在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| E2 修复+解环 | 2026-09-26 | 13 项先红后绿+静态无环+逐 token 复算 | 与 D1 统一门 | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy content/authoring-and-runtime 的 E2 修复回执；固定来源与 source SHA 见下方保全节。

## 原始结论

嵌套对话校验漏检真实缺陷（options 漏传）修复+四下层拆环；50 函数体逐 token 等证无夹带。

## 当时证据

修复细节、下层边界与审计复算在 quote 保全。

## 当前有效性

historical。修复与拆分按当时提交；当前以现行实现为准。

## 继任文档

当前结论归 ARCH-CONTINUATION-1 完成卡与 D1 回执。

## 原文保全

固定源 revision `226f8cb90880b74c82f3c39b6e09d949f2a16e7b`，source SHA `df603641731518b8947636ed16196029649b5b237f028b5b04260d64dc4602f5`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
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
