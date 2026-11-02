# 历史归档模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`archive-record-v1`的模板说明，本页自身使用reference-canon，不新增类型。以历史范围、原始结论、当时证据、当前有效性和继任文档五节保留时点结论。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `7173ba1d2f7d22d9f299bc418f612aed229e571f`，SHA-256 `c9dbd9555e7103f4d31acb46fd5c1160c34e351ea52dbcc98d3a60d9e4541d33`，428B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `c9dbd9555e7103f4d31acb46fd5c1160c34e351ea52dbcc98d3a60d9e4541d33`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../engineering/guides/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：历史范围；原始结论；当时证据；当前有效性；继任文档。

current/historical/superseded/unknown描述有效性，不把归档时的完成变成当前通过；重新启用须重新核来源与Owner。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <历史归档标题>

## 历史范围
- 原始日期、版本、阶段：
- 归档原因：

## 原始结论
- 保留原文语义，不改写为当前事实：

## 当时证据
- 当时的来源、命令、SHA：

## 当前有效性
- current | historical | superseded | unknown
- 当前不得外推的部分：

## 继任文档
- 当前 canonical 文档：
- supersedes / superseded-by：
- 若重新启用的复核条件：

````
<!-- template-source-example:end -->
