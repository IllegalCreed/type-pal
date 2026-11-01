# 协作与工程维护

Status: current
Last reviewed: 2026-11-01
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

为维护者按工作类型定位当前任务，再进入原任务卡和证据。上级为[文档总入口](../README.md)。

## 范围

活动看板与任务卡负责执行分工，guides 放可重复操作，audits 放仍在消费的审计，evidence 放任务证据，archive 保留历史路径。此页只路由，不复制任务进度或测试结论。

## 当前状态

当前采用 Codex 分派、贡献者执行、Codex 独立验收；固定三席签字已退休。历史协议与已关闭任务不自动构成当前授权。

## 入口与责任

| 要找的工作 | 唯一分类入口 | 进入后核对 |
|---|---|---|
| 代码治理、文档治理、仓库瘦身、测试与覆盖率 | [看板：长期质量治理](board.md#长期质量治理) | 阶段、当前批次、真实依赖和下一步 |
| E2E、共享脚本、实体预览初态、脚本整理与发布闭环 | [看板：第二阶段功能开发](board.md#第二阶段功能开发) | 已有能力、在途候选、后续实施顺序 |
| 完整美术构件还原等后续方向 | [看板：第三阶段储备](board.md#第三阶段储备) | 已确认方向与未准入实施的边界 |
| 按任务 ID 找卡或查历史 | [任务入口](tasks/README.md)、[生成总索引](tasks/index.md) | 卡顶部状态、固定候选及原证据 |

工作分类、依赖与执行下一步集中维护在看板；本页只导航，不再复制一份状态表。

- [工程代码质量与验收规范](code-quality.md)：两阶段所有开发与审查的八维标准、低成本复验和完成定义。
- [现行协作工作流](agent-workflow.md)、[当前任务看板](board.md)。
- [活动任务与生成索引](tasks/README.md)：状态从卡顶部读取。
- [完整/轻量任务模板](templates/README.md)：同一 task-card 类型的两个变体。
- [工程维护指南](guides/README.md)：先按职责选择操作方法。
- [当前审计与修复依据](audits/README.md)、[任务专属证据](evidence/README.md)。
- [运维历史归档](archive/README.md)、[历史任务看板快照](archive/board-history/README.md)。

## 证据与下一步

Owner 为对应任务 Coding Owner；改变准入或状态时同步任务卡、生成索引与看板。文档治理走[项目模型](guides/documentation-model.md)，技术审查不代替用户产品裁决，静态门不替代实跑。
