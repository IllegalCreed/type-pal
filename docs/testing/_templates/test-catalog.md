# 测试catalog原生合同说明源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`test-catalog-v1`的模板说明，本页自身使用reference-canon，不新增类型。解释JSON publication catalog的schemaVersion2/generatedBy/entries、逐id reading与原生治理；另分固定1838八键binding capture变体。

实际JSON例子见[test-catalog.json](test-catalog.json)。本页保全的说明不是另一份catalog，不抄成publication payload。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `8f005002a59947d7f94445f5a1fa8443be6a6e57`，SHA-256 `031e005e11f444d0fe4bd32215a71369b42193eeda5a6c7a647df13053d8f854`，2967B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `031e005e11f444d0fe4bd32215a71369b42193eeda5a6c7a647df13053d8f854`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](https://github.com/IllegalCreed/type-pal/blob/43403a826edcaf40509f55b51e6f6214723252ed/docs/ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：Catalog identity；Domain and lifecycle；Dependencies and publication rules；Frozen binding capture variant。

本文件是Markdown说明而非可发布catalog；JSON权威模板和registry不改。原始15类summary/unread与本次阅读分轴，冻结索引最多增量1不给1838源文授信。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

此处原说明用于比对，不是可发布的JSON；发布对象使用上面的原生JSON入口。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

## 当前版本适用性扩展（2026-10-30）

下方历史源块保持原字节；新建测试记录不填写活动 reviewBy。使用记录 revision 与 sourceRefs 比较版本适用性；lastVerified 只记真实核验日期，Quality gate 记录命令、原始诊断、evidence 与适用来源。详见[测试治理](../governance.md#版本适用性)。

<!-- template-source-example:start -->
````markdown
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

lastVerified/dependsOn 以及旧候选/版本/执行结论各按原范围保留。活动 reviewBy 已按2026-10-30用户裁决退休，只留历史；用 revision/sourceRefs 比较版本适用性。真实 consumer 强制 ID、路径、
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

````
<!-- template-source-example:end -->
