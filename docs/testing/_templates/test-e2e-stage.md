# 统一E2E阶段模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`test-e2e-stage-v1`的模板说明，本页自身使用reference-canon，不新增类型。YAML示例把稳定id、phase、引擎、Owner、lastVerified/reviewBy、dependsOn和report/evidence分开；四节记录前置、当期结论、证据与依赖历史。

测试发布另按[测试治理](../governance.md)核catalog身份、report/evidence和日期；本页的示例ID、metadata或YAML不构成实际登记。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `189067924da05825e745858f8ad7f533227c2ea8`，SHA-256 `4bf659f7778f82b02ed2d4a5d1dfbd632e5278bc9e07ac993d043d136bcc036c`，520B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `4bf659f7778f82b02ed2d4a5d1dfbd632e5278bc9e07ac993d043d136bcc036c`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](https://github.com/IllegalCreed/type-pal/blob/43403a826edcaf40509f55b51e6f6214723252ed/docs/ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：入口与前置；当前结论；证据与状态；依赖与历史。

phase1|phase2和日期均待填，阶段页不是一次执行报告；过期日期不能手改续期、历史结论留report history，不复制一套canonical。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

## 当前版本适用性扩展（2026-10-30）

下方历史源块保持原字节；新建测试记录不填写活动 reviewBy。使用记录 revision 与 sourceRefs 比较版本适用性；lastVerified 只记真实核验日期，Quality gate 记录命令、原始诊断、evidence 与适用来源。详见[测试治理](../governance.md#版本适用性)。

<!-- template-source-example:start -->
````markdown
# E2E stage

```yaml
id: e2e-NNN
status: draft
phase: phase1|phase2
engines: [game, reforge]
owner: <owner>
lastVerified: YYYY-MM-DD
dependsOn: []
canonicalReport: report.md
evidence: evidence.json
```

## 入口与前置
- checkpoint / sourceRefs / public caller / legal inputs:

## 当前结论
- current revision only; historical claims stay in report history:

## 证据与状态
- report / machine evidence / visual timing / stop line:

## 依赖与历史
- dependsOn / supersedes / next step:

````
<!-- template-source-example:end -->

2026-10-30：活动reviewBy已退休，版本适用性按[测试治理](../governance.md#版本适用性)比较；原日期只保留历史，不自动重跑E2E。
