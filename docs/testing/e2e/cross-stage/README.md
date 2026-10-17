# E2E 横向材料

Status: current
Owner: Codex（横向材料导航维护）
Last reviewed: 2026-10-18
Template: governance-index-v1 / 1.0.0

## 目的

从跨阶段重复现象找到问题族、根因层和修复责任，再回到每个受影响片段核执行证据。横向材料集中记录公共问题与未闭合项，阶段正式报告保留各自的输入、结果和检查点链。

## 范围

现有主材料是 [001–005 共性问题族](common-issues.md)，对应 catalog 的 `e2e-common-issues`，涉及路线、演出、存档、控制权和工具边界。其登记依赖为 001–005；原材料还保存后续 006 条目与不同日期的判断，不能据此扩大该审计的 catalog 依赖范围或授予 006 通过。

本页只提供导航和回链职责，不替问题族正文重作业务裁定，也不复制各阶段的通过数字。

## 当前状态

`current` 只表示本导航入口有效。问题族材料的发布状态、日期、依赖与 canonical/evidence 配对以 [catalog.json](../../catalog.json) 为准；本页不是阶段 verified 或任务 build 的事实源。

源码核读、`source-backed` 与文档审计不能当作本次实跑。历史 raw、旧修复和旧 accept 只证明各自候选、版本、输入与时间范围；公共回归通过也不能直接关闭某段的演出、存档、预览或录像缺口。

## 入口与责任

| 要查什么 | 入口与职责 |
|---|---|
| 重复根因与未闭合问题 | [共性问题族](common-issues.md)：定位具体人物/剧情入口、差异、根因层及证据限制 |
| 公开身份与配对证据 | [catalog](../../catalog.json) 的 `e2e-common-issues` 与[配对 evidence](../evidence/e2e-common-issues.json)：核 publication、sourceRefs、revision 与实际执行范围；其 catalog `index` 仍指向 E2E 总览 |
| 受影响片段的正式结论 | [E2E 总览](../README.md)：按稳定 `e2e-NNN` 进入阶段页、canonical 报告与检查点链 |
| 共用验收义务 | [E2E 合同](../contract.md)：演出差异先归因，逐段核两阶段证据与编辑器预览起点，录像另核 capture 准入 |
| 公共批次与本次授权 | [E2E-R4-1 原卡](../../../ops/tasks/E2E-R4-1-route-and-checkpoint-foundation.md)和[当前看板](../../../ops/board.md)：核当前 Owner、范围、counter 与准入；旧批次结论不代替当前卡顶部 |

Codex 维护本页导航；具体问题族与阶段报告由当前任务指定的单一 Owner 写回，按[测试治理](../../governance.md)配对 catalog、报告和 evidence，再由非作者复核。这里的目录 README 不替代 catalog 的正式 `index`，不另建一套阶段状态账。

## 证据与下一步

维护问题族时先核现象与最强替代解释，区分作者内容、公共运行时、路线、采集器和比较器；不能因同一 NPC 名称或大量 mismatch 就判为同根。每项回链实际受影响的稳定阶段 ID、原任务与正式报告，写明具体入口、候选/版本、raw 来源、根因证据和未取证维度。同根反例重开对应公共问题；尚未证明同根的阶段差异分别保留。

缺原始证据、当前版本/前驱不合、归因未定或旧 counter 未闭合时，保留 `needs-review`，回原卡记录 rework/blocked 与解除条件；不以到达终点、静态断言或公共修复替代逐段验收。修改问题或状态时依测试治理同提交写回事实源及相关回链、重生成索引。

本次只全文核读本入口原文与改写正文，并窄读共性材料的导航、范围和归因/回链规则、相关 catalog/evidence 字段及 R4 准入；未全文重审共性问题业务，也未重跑 001–005、产品、E2E、视觉或 coverage。后续按当前原卡选定具体问题，补齐该项实际证据后再决定闭合。

## 历史与原文保全

下方是固定 revision `dc478db11c6b52c4e50a1d1135f8a4740796418c` 的 5 行原文，source SHA `14d8b6e5ae98f20a3be9eebe09e7ca4c4764bfd3cc92aaf2f78413af8efcaf7c`。整个 quote 块字节保持不变；剥离引用前缀后的直接 inverse 为 244 字节，不等于 243 字节原文。须剔除结束标记前既有分隔空行产生的恰一个 LF，再按固定 source SHA 验证；不作无条件 trim，也不恢复旧 exactRoundTrip 信用。
<!-- original-source-quote:start -->
> # E2E 横向材料
>
> - [001–005 共性问题族](common-issues.md)：跨阶段重复根因、批量治理与未闭合项。
>
> 横向材料不能替代阶段报告；发现同类问题时更新问题族记录，并回链受影响阶段 `id`。
>
<!-- original-source-quote:end -->
