# Testing catalog 合同说明

状态：模板设计说明；实际 canonical 格式为 JSON，版本 `test-catalog-v1 / 1.1.0`。示例见
[test-catalog.json](test-catalog.json)，权威字段与冻结设计见
[registry](../../phase-governance/templates/registry.json) 和[设计补充](../../phase-governance/templates/registry-proposal-20261011.md)。

## Catalog identity

顶层保留 `schemaVersion: 2`、`generatedBy`、`entries`。`_governance` 记录模板身份、source SHA/Git blob、
逐条阅读、适用范围与历史；不能把原对象搬进 payload，也不自嵌 after SHA。

## Domain and lifecycle

每个 entry 原字段包括 id/kind/status/phase/engines/owner/provenance/domain/module/canonical/index/evidence/tags。
另保留 sourceRefs/publicCallers/legalInputs/businessOracle/dedupe/revision。分类必须由实际正文与 caller 支持，
不能从路径自动授予 reviewed；示例的空 entries 与空元数据是待填模板，不能作为正式证据发布。

## Dependencies and publication rules

lastVerified/reviewBy/dependsOn 以及旧候选/版本/执行结论各按原范围保留。真实 consumer 强制 ID、路径、
依赖、日期、source hash 和 report/evidence 配对；索引生成只投影 catalog。统一 envelope 的
runtimeExecutionPerformed 固定 false，逐条 reading 必须与 entries 一一对应；结构检查不替代语义审查或实跑。
