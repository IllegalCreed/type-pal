# Testing catalog 合同说明

状态：模板设计说明；实际 canonical 格式为 JSON，版本 `test-catalog-v1 / 1.2.0`。示例见
[test-catalog.json](test-catalog.json)，权威字段与冻结设计见
[registry](../../phase-governance/templates/registry.json) 和[设计补充](../../phase-governance/templates/registry-proposal-20261011.md)。

## Catalog identity

默认 publication catalog 顶层保留 `schemaVersion: 2`、`generatedBy`、`entries`。`_governance` 记录模板身份、source SHA/Git blob、
逐条阅读、适用范围与历史；不能把原对象搬进 payload，也不自嵌 after SHA。

## Domain and lifecycle

每个 entry 原字段包括 id/kind/status/phase/engines/owner/provenance/domain/module/canonical/index/evidence/tags。
另保留 sourceRefs/publicCallers/legalInputs/businessOracle/dedupe/revision。分类必须由实际正文与 caller 支持，
不能从路径自动授予 reviewed；示例的空 entries 与空元数据是待填模板，不能作为正式证据发布。

## Dependencies and publication rules

lastVerified/reviewBy/dependsOn 以及旧候选/版本/执行结论各按原范围保留。真实 consumer 强制 ID、路径、
依赖、日期、source hash 和 report/evidence 配对；索引生成只投影 catalog。统一 envelope 的
runtimeExecutionPerformed 固定 false，逐条 reading 必须与 entries 一一对应；结构检查不替代语义审查或实跑。

## Frozen binding capture variant

`frozen-document-binding-baseline-v1` 只适用固定 binding-baseline 路径，另以 JSON1.2 变体治理原八键捕获索引，
不伪造 schema2/publication ID、generatedBy 或 entryReadings。共用治理字段14项；default 专属完整16项与顺序不变，
默认 requiredFields/requiredValues/逐id reading 和真实 catalog consumer 责任保持。generatedBy 仅原必需键门，
其它字符串/null 保持旧接受；runtimeExecutionPerformed=false 是原 generic literal 门。

变体要求固定33cc Git Buffer root 与 strict UTF8/全层 decoded duplicate-key 拒绝，原八键/1838项及顺序深等；
治理19键/captureReading8键说明捕获语义、原15类summary、当前静态审查false及三个源文/当前绑定信用false。
文件自身不在1838项中，真实独立canonical接收后最多计增量1，不改变cohort或原unread/provisional状态。
原raw只供来源读取，不能计模板迁移；错路径/type/父或variant格式/metadata不能绕普通历史source守卫。

合同与来源见[F1冻结设计](../../phase-governance/reviews/20261016-binding-baseline-design.md)；
本轮实现与canonical候选见[专属记录](../../phase-governance/reviews/20261016-binding-baseline-contract.json)。
固定e136实现/canonical及dd377自然接入已分别获非作者独立接收；根后续行政与中央字节须另验。本页不授runtime/E2E/视觉/coverage信用，索引自身最多增量1，不给1838源文授审读信用。
