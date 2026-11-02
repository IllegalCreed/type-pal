# 操作指南模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`guide-runbook-v1`的模板说明，本页自身使用reference-canon，不新增类型。从读者结果和权限/输入前提开始，给实际步骤、可预期失败、停止线、回滚接管与可观察完成条件。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `e94ee60cbfffc152b9d2e07a73848113aa4f823c`，SHA-256 `19a28276c117e3744cf17544f580b4e2db44f525b5cd252efee678ab6e21f29b`，311B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `19a28276c117e3744cf17544f580b4e2db44f525b5cd252efee678ab6e21f29b`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../engineering/guides/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：目的；前置条件；步骤；失败处理；完成定义。

空编号步骤或泛称成功不是可操作指南；完成必须有证据和复核人，不能把编写步骤当实际执行。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <指南或 Runbook 标题>

## 目的
- 读者和完成后得到的结果：

## 前置条件
- 权限、输入、版本和安全边界：

## 步骤
1. 

## 失败处理
- 可预期失败：
- 停止线：
- 回滚/人工接管：

## 完成定义
- 可观察的完成条件：
- 证据路径与复核人：

````
<!-- template-source-example:end -->
