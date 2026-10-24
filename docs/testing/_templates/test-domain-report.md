# 测试域报告模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`test-domain-report-v1`的模板说明，本页自身使用reference-canon，不新增类型。Domain scope界定域/引擎/revision，Claim matrix连接证据/状态/限制，输入fixture、结果缺口与质量门分别记账。

测试发布另按[测试治理](../governance.md)核catalog身份、report/evidence和日期；本页的示例ID、metadata或YAML不构成实际登记。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `725a2689bc3c549275b2c55d4dfead29235c1e9f`，SHA-256 `1c8223c38a1a58c5c614a993f8cc11b29599f88d5d74e5cf3d9a917fb8953964`，652B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `1c8223c38a1a58c5c614a993f8cc11b29599f88d5d74e5cf3d9a917fb8953964`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：Domain scope；Claim matrix；Inputs and fixtures；Results and gaps；Quality gate。

源中的1.1.0与catalog-publication词表属于骨架提示，正式采用查registry；publication状态投影不等于执行通过，不能凭此为历史文档伪造新catalog身份。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# Testing domain report

Status: draft
Last reviewed: YYYY-MM-DD
Owner: <owner>
Template: test-domain-report-v1 / 1.1.0

Status is the catalog-publication projection for the front-matter id: draft/active/verified/rework/superseded/archived/proposal/current. Preserve the canonical catalog state; publication is not execution proof.

## Domain scope
- domain / phase / engine / revision:

## Claim matrix
| claim | evidence | status | limit |
|---|---|---|---|

## Inputs and fixtures
- legal inputs / caller / oracle:

## Results and gaps
- results:
- failures / rework / unresolved:

## Quality gate
- command / raw diagnostics / evidence / reviewBy:

````
<!-- template-source-example:end -->
