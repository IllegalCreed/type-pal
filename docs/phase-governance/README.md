# 全 docs 文档治理

Status: current
Last reviewed: 2026-10-15
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

按文档职责管理入口、模板、内容深审与阶段一致性；从这里定位治理事实，不读取整个证据树来猜当前结论。

## 范围

全 docs 包括 ops、lore、三个阶段、testing、本治理目录和 docs 总入口；脚本、日志、raw、截图及压缩包也须登记 artifact/evidence 归属。用户批准的正文必审基线为 1838 份 Markdown/JSON/HTML，新增或变化的材料单列增量。

## 当前状态

全量治理进行中。旧 [document registry](document-registry.json)覆盖部分历史范围；其中 content-reviewed 和 governed-legacy 不代表全量模板迁移完成。[按阶段索引](by-phase.md)、[按状态索引](by-status.md)及[阶段 catalog](catalog.json)仍只表达其已登记范围。

## 入口与责任

- [项目文档模型](../ops/guides/documentation-model.md)：L0–L3、事实权、稳定路径、写回与完成条件。
- [路由检查投影](routing.json)：对应 AGENTS 的操作表，不保存任务或测试状态。
- [统一文档类型与模板](templates/README.md)：17 类模板合同及有效 pilot 门。
- [内容深审记录](reviews/README.md)：结论、适用范围、SHA 和历史，不代替执行证据。
- [跨阶段真值矩阵](cross-phase-matrix.md)：检查 ops、lore、阶段和 testing 之间的依赖与冲突。
- [治理任务](../ops/tasks/DOCS-FULL-TEMPLATE-1.md)：当前 Owner、实施事实、进度、counter 和下一步。
- 内容入口：[Lore](../lore/README.md)、[Phase 1](../phase1/README.md)、[Phase 2](../phase2/README.md)、[Phase 3](../phase3/README.md)、[Testing](../testing/README.md)、[Ops](../ops/README.md)。

## 证据与下一步

[1838 基线与接入证据](../ops/evidence/DOCS-FULL-TEMPLATE-1/README.md)区分自动枚举、真实阅读、保真样本和已验迁移。下一步按该任务的 pilot 和正文批次推进；未知内容不标 reviewed，静态治理不宣称 runtime/E2E/视觉/coverage 通过。
