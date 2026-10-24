# 测试合同模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`test-contract-v1`的模板说明，本页自身使用reference-canon，不新增类型。Contract question、Legal typed inputs、Caller and oracle、Dedupe and limits、Revision五节连接真实caller与业务断言。

测试发布另按[测试治理](../governance.md)核catalog身份、report/evidence和日期；本页的示例ID、metadata或YAML不构成实际登记。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `30ce75238e32cb0a3ccea6c528b9b7117096f6d6`，SHA-256 `e8abd04b1f0f59bb193b82bdb395f90d2bc22b84e347bb86c2407a2a3e7eb182`，466B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `e8abd04b1f0f59bb193b82bdb395f90d2bc22b84e347bb86c2407a2a3e7eb182`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：Contract question；Legal typed inputs；Caller and oracle；Dedupe and limits；Revision。

合法输入不能填运行结果，未跑项不作oracle；unknown显式保留，testing-meta与evidence需真实配对，不能用泛句补满章节冒充审查。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# Testing contract

<!-- testing-meta JSON must remain parseable and paired with evidence. -->

## Contract question
- 填写本节合同事实与证据；未核项显式标 unknown。

## Legal typed inputs
- 填写本节合同事实与证据；未核项显式标 unknown。

## Caller and oracle
- real caller:
- business oracle:

## Dedupe and limits
- dedupe against:
- known gaps / stop line:

## Revision
- source SHA / content version / history / supersedes:

````
<!-- template-source-example:end -->
