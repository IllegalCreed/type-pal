# 审计报告模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`audit-report-v1`的模板说明，本页自身使用reference-canon，不新增类型。以具体审计问题界定读域，发现表逐ID连接证据、影响与状态，结论分能证明/不能证明，整改指定Owner与复核条件。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `8df11a2b1fa7f532d648331fce4741ffdeedc067`，SHA-256 `edbedd0493ce964473a70a7d4e40278d2ed367e479a50e52418c38cbda92ac0a`，389B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `edbedd0493ce964473a70a7d4e40278d2ed367e479a50e52418c38cbda92ac0a`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../engineering/guides/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：审计问题；范围与证据；发现；结论；整改与复核。

A-001/open只是占位；发现数量或报告存在不等于整改闭合，也不能把静态检查当执行通过。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <审计标题>

## 审计问题
- 要回答的具体问题：

## 范围与证据
- 版本/时间范围：
- 一手来源与命令：
- 排除项：

## 发现
| ID | 发现 | 证据 | 影响 | 状态 |
|---|---|---|---|---|
| A-001 |  |  |  | open |

## 结论
- 当前能证明：
- 当前不能证明：

## 整改与复核
- 修复 Owner：
- 复核条件：
- 继任/ supersedes：

````
<!-- template-source-example:end -->
