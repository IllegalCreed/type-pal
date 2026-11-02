# 治理索引模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`governance-index-v1`的模板说明，本页自身使用reference-canon，不新增类型。用目的、范围、当前状态、入口责任和证据下一步五节组织导航；Owner与canonical入口明确，排除项防止入口越权。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `1fcf288201adec38cc817aad7c9c06e7a4f57e54`，SHA-256 `2509abf408cc5a3c0569183e53e96fdb60424626274ccc95f0b7d523a9eb032c`，365B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `2509abf408cc5a3c0569183e53e96fdb60424626274ccc95f0b7d523a9eb032c`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：目的；范围；当前状态；入口与责任；证据与下一步。

current/draft/historical标记索引适用性，不能替下游文档、任务或产品授通过；lastReviewed必须实取日期。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <索引标题>

## 目的
- 这份索引解决什么导航或治理问题？

## 范围
- 当前包含：
- 明确不包含：

## 当前状态
- `status`: current | draft | historical
- `lastReviewed`: YYYY-MM-DD

## 入口与责任
- canonical 入口：
- Owner：
- 下游使用者：

## 证据与下一步
- 关键来源：
- 未决/阻塞：
- 下一步：

````
<!-- template-source-example:end -->
