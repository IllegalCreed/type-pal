# 设计规范模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`design-spec-v1`的模板说明，本页自身使用reference-canon，不新增类型。把问题目标、primary约束、数据/接口方案、风险与验收oracle放在五节；最强反例与不做项限制设计外推。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `ac68d070d3169c823a0be2abf5087c964b993d4e`，SHA-256 `fc2671156e74512e2367511ff2e3f7dd81ed4a7921a63d574a4c636d5a577ee3`，442B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `fc2671156e74512e2367511ff2e3f7dd81ed4a7921a63d574a4c636d5a577ee3`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：问题与目标；真值与约束；方案；边界与风险；验收。

方案与可执行验收条件不等于实现已通过；未知版本、兼容或产品选择保持待决，不借模板自授build。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <设计/规范标题>

## 问题与目标
- 当前问题：
- 目标结果：

## 真值与约束
- 原版/primary source：
- 当前阶段证据：
- 不可违反的约束：
- 未知与冲突：

## 方案
- 数据/流程/接口：
- 选择理由：
- 明确不做：

## 边界与风险
- 风险：
- 可证伪观察：
- 迁移/兼容/法律边界：

## 验收
- 可执行验证：
- 业务 oracle：
- 复核 Owner 与截止条件：

````
<!-- template-source-example:end -->
