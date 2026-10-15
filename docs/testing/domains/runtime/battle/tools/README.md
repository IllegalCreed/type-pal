# Testing tools: domains/runtime/battle/tools

Governance Owner: Codex / history_cards_a（本次文档候选，待非作者独立验收）
Last reviewed: 2026-10-16
Template: governance-index-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文没有显式 Owner / Status 元数据；治理负责人不冒作原作者，治理日期不倒填原发布日期。

## 目的

八份BattleHost/session/simulator/workflow历史工具导航；runner仅历史线索。

## 范围

本页仅列 8 个现存历史工具文件与原布局账入口。这里只按路径和完整字节 SHA 关联旧记录，不把文件名、mutant/config/witness 标签或旧 publicCallers 当成当前合法 runner。

## 当前状态

导航状态为 current；工具正文和结果仍属其历史范围。112 个域内脚本与旧 122 条工具记录分开：另 10 条是归档未决输入。此页不是质量门或执行回执，候选尚待独立验收。

## 入口与责任

- [battle-host-refactor-mutants.mjs](battle-host-refactor-mutants.mjs)
- [battle-host-rng-witness.mjs](battle-host-rng-witness.mjs)
- [battle-host-shell-parity.mjs](battle-host-shell-parity.mjs)
- [battle-session-owners-mutants.mjs](battle-session-owners-mutants.mjs)
- [battle-simulator-functional.mjs](battle-simulator-functional.mjs)
- [battle-simulator-runtime-mutants.mjs](battle-simulator-runtime-mutants.mjs)
- [battle-workflows-mutants.mjs](battle-workflows-mutants.mjs)
- [battle-workflows-r2-witnesses.mjs](battle-workflows-r2-witnesses.mjs)

[布局收口计划](../../../../archive/migrations/testing-layout-closeout-20261004.json)只保历史归属与提取线索；脚本各自 producer/Owner 不能由 README 或 catalog 推定。原账所列 2026-11-01 为历史保留期限，本次不续期。

任何重新执行都须另核真实 caller、合法输入、业务 oracle、imports/cwd、临时树隔离与 cleanup，按现行任务准入办理；本轮没有逐工具语义审查或执行。

## 证据与下一步

本页原源为 14 行，冻结读取基点 `2aebe7efd8cc8dea750bc0f05c5519ed74081b7d`，Git blob `ce958ad60eb0e21e443d4d7aec1b55d0777614dc`，SHA256 `d8f7437135805cb7d0ec5c634b957e88182c426174b8479b631b8e2207db609d`。逐篇来源、after 和限制见[本包作者回执](../../../../../ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-domain-navigation-k-20261016.json)；任务范围取[全量治理任务卡](../../../../../ops/tasks/DOCS-FULL-TEMPLATE-1.md)。

K0 已在本基点使两个旧批次正文 writer 主动退休，不能再用它们重生成本页。正文/模板与链接自验不能替代非作者验收或恢复旧工具执行。非作者逐篇核本页正文、原源与真实链接后，由根线程维护中央记录；本候选不自签接收。

## 历史范围

原 14 行工具索引没有独立发布日期或 Owner；关联布局账源 revision 为 `12247f7e389bad300e3b20388ae8a9196386e191`，原 2026-11-01 保留期限不延期。此处保留 8 项历史导航的完整原文。

## 原始结论

原文将这些文件称为按工程域归位的历史/反控工具，并明确不表示 runtime、E2E 或 coverage 通过；本页 8 项清单的源字节如下。

<!-- K-SOURCE-BEGIN -->

> # Testing tools: domains/runtime/battle/tools
>
> 这些脚本是按工程域归位的历史/反控工具，不代表当前 runtime、E2E 或 coverage 已通过。
> 每个工具的 source SHA、after SHA、caller/import/cwd/runner、合法输入、oracle、排重、截止日和停止线见
> [布局收口计划](../../../../archive/migrations/testing-layout-closeout-20261004.json)。
>
> - [battle-host-refactor-mutants.mjs](battle-host-refactor-mutants.mjs)
> - [battle-host-rng-witness.mjs](battle-host-rng-witness.mjs)
> - [battle-host-shell-parity.mjs](battle-host-shell-parity.mjs)
> - [battle-session-owners-mutants.mjs](battle-session-owners-mutants.mjs)
> - [battle-simulator-functional.mjs](battle-simulator-functional.mjs)
> - [battle-simulator-runtime-mutants.mjs](battle-simulator-runtime-mutants.mjs)
> - [battle-workflows-mutants.mjs](battle-workflows-mutants.mjs)
> - [battle-workflows-r2-witnesses.mjs](battle-workflows-r2-witnesses.mjs)

<!-- K-SOURCE-END -->

## 当时证据

原 README 的标题、原布局账链接和 8 个脚本入口完整保留。路径与 SHA 的对应不证明原 caller/oracle 合法，历史脚本、临时 JSON/raw 和截图未在本轮执行或重放，当前可用性 unknown。

## 当前有效性

历史清单继续用于溯源；当前文件仍在目录不授执行权。本页列出的 8 份工具保持原字节，使用前须单独核准。本候选待非作者验收，不把旧账 reviewed 或静态门当本次运行通过。

## 继任文档

[工程域总入口](../../../README.md)提供现有目录路由；[原布局账](../../../../archive/migrations/testing-layout-closeout-20261004.json)保原 provenance。今后若需现行 runner，先按[测试治理](../../../../governance.md)另核 caller/输入/oracle/隔离，不由此页重新启用旧命令。
