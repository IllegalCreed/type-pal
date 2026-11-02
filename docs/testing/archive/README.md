# 测试历史归档

Status: current（仅指导航；被索引材料为 historical）
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: governance-index-v1 / 1.0.0

本页是 testing archive 的当前导航入口：已被 canonical 文档或新汇总回执取代、但不能静默删除的迁移计划与历史审查按目录存放；归档材料不作为当前前驱、业务合同或覆盖率信用，当前结论回到 `catalog.json` 与对应 canonical 条目。

## 目的

- 提供 testing archive 全部历史材料与迁移台账的统一入口及历史边界合同（归档不授当前执行信用）。

## 范围

- 当前包含：架构回归实验历史索引与原文目录、五份机器迁移/审计台账 JSON（e2e 迁移、testing-domains wave2 迁移与工具审计、legacy 全量收口决策账与归档迁移计划）、legacy 按工程域目录。
- 明确不包含：当前 contract、runtime 或 coverage credit；证据重跑或升格。

## 当前状态

- `status`: current（仅指导航）；被索引材料 historical。
- `lastReviewed`: 2026-10-20

## 入口与责任

- 架构回归实验：[历次复核合并索引](architecture-regression-lab-history.md)、[原文目录](architecture-regression-lab/README.md)。
- 迁移台账：[E2E 路径迁移记录](migrations/e2e-20261004.json)、[Legacy runtime/editor 第二批迁移记录](migrations/testing-domains-20261004-wave2.json)、[第二批工具审计](migrations/testing-domains-20261004-wave2-tool-audit.json)、[Legacy 全量收口决策账](migrations/legacy-full-closeout-plan.json)（331 项逐项 domain/module/capability、源 SHA、caller/import/cwd、合法输入、oracle、排重、版本与停止线）、[全量归档迁移计划](migrations/legacy-full-closeout-relocation.json)（209 项非工具材料 SHA 锁定、122 个工具保留原入口）。
- 历史目录：[legacy/](legacy/README.md)（batches/content/e2e/editor/extraction/migration/ops/persistence/phase1-runtime/quality/runtime/unresolved-tools）。
- Owner：Codex（文档治理）；各归档材料原 Owner/贡献者保留于原文。

## 证据与下一步

- 关键来源：目录原导航正文（quote 保全）与各迁移台账 JSON（机器身份，只读）。
- 未决/阻塞：无（导航壳）。
- 下一步：无目录调整计划。

## 历史范围

- testing archive 导航入口；被索引迁移台账与 legacy 目录为历史时点材料；固定来源与 source SHA 见下方保全节。

## 原始结论

- 原文为导航声明：归档材料不作当前前驱/合同/覆盖率信用，当前结论回 `catalog.json`；列架构回归实验两入口、五份迁移台账 JSON 与 legacy 目录。

## 当时证据

- 原导航正文与条目链接在 quote 保全；台账数字（331 项决策账、209+122 归档迁移）以 JSON 原件为准。

## 当前有效性

- current（仅指导航）。被索引材料 historical；台账数字按各自冻结时点解释。

## 继任文档

- 当前测试身份与结论归 `docs/testing/catalog.json` 与对应 canonical report/evidence。

## 原文保全

固定源 revision `9fd4f914916bca56938c02adb12b4688dd5f8bdf`，source SHA `451b9059529bee3d19066ec8e078dd91d6b4a6a75bc3feedf899e63275cf7b16`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 测试历史归档
>
> 这里保存已经被 canonical 文档或新的汇总回执取代、但不能静默删除的迁移计划与历史审查。归档材料不作为当前
> 前驱、业务合同或覆盖率信用；需要当前结论时回到 `catalog.json` 与对应 canonical 条目。
>
> - [架构回归实验历次复核合并索引](architecture-regression-lab-history.md)：r2–r10 原始 counter 与可保留窄证据的 supersedes 关系。
> - [架构实验历史原文目录](architecture-regression-lab/README.md)：源文件 SHA、原始回执与当前汇总的关系。
> - [E2E 路径迁移记录](migrations/e2e-20261004.json)：源文件 SHA 与 canonical 迁移目标。
> - [Legacy runtime/editor 第二批迁移记录](migrations/testing-domains-20261004-wave2.json)：四组 report/evidence 的源 SHA、目标和退休关系。
> - [Legacy runtime/editor 第二批工具审计](migrations/testing-domains-20261004-wave2-tool-audit.json)：相对导入、cwd、runner、公开 caller 和保留 legacy 决策。
> - [Legacy 全量收口决策账](migrations/legacy-full-closeout-plan.json)：剩余 331 项逐项的 domain/module/capability、完整源 SHA、源码 inventory、caller/import/cwd、合法输入、业务 oracle、排重、版本、evidence、history、supersedes 与停止线。
> - [Legacy 全量归档迁移计划](migrations/legacy-full-closeout-relocation.json)：209 项非工具材料的 SHA 锁定归档目标；122 个工具保留原入口，直到各自停止线满足。
> - [按工程域划分的 legacy 历史归档](legacy)：不作为当前 contract、runtime 或 coverage credit；当前结论回到 `catalog.json` 与 canonical report/evidence。
>
<!-- original-source-quote:end -->
