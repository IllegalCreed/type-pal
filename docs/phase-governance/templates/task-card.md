# 通用任务卡骨架源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`task-card-v1`的模板说明，本页自身使用reference-canon，不新增类型。目标和范围之后写前提、一手证据、最强替代解释，再写功能/测试/视觉验收与状态交接。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `d08694340522c20bbd9fbe58fff37a172a850d0a`，SHA-256 `1e686389466c03041e5a31efd34eebd1d9909f7ca96fef18c3d63c68e7ca3e34`，541B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `1e686389466c03041e5a31efd34eebd1d9909f7ca96fef18c3d63c68e7ca3e34`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：目标；范围；前提与证据；验收；状态与交接。

draft/build/review/done/blocked/rework/cancelled由任务事实与授权驱动，不由模板或数量驱动；Ops完整/轻量卡是此类型变体。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <TASK-ID> - <标题>

## 目标
- 可验收的工程或用户结果：

## 范围
- 范围内：
- 范围外：

## 前提与证据
- 行为/工程前提：
- 一手证据：
- 最强替代解释与可证伪观察：
- 当前状态：draft | build | review | done | blocked | rework | cancelled

## 验收
- 功能/文档：
- 测试与证据：
- 视觉或 E2E（如适用）：
- 不把历史回执、数量或覆盖率当作单独验收依据。

## 状态与交接
- 当前 Owner：
- 阻塞/决策：
- 下一步与交接提示词：

````
<!-- template-source-example:end -->
