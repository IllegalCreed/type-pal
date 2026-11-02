# 证据回执模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`evidence-receipt-v1`的模板说明，本页自身使用reference-canon，不新增类型。用证据身份、来源输入、原子断言与业务oracle、结果、限制复核五节区分candidate/source与真实执行。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `10fc94432f41e847f2591b94d7803e56c7cd2464`，SHA-256 `9f5a395c74ae3dd8d449475cdb9172757daa47db1e2971b7a20e604dc7e3bb77`，864B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `5ad90121ffe8ceaf3b40f8787f354872fb1e1650e1418b21c02b5d8c08526a60`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../engineering/guides/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：证据身份；来源与输入；断言与业务 oracle；结果；限制与复核。

draft/recorded/verified/rework/superseded是此骨架提示，不覆盖具体变体状态合同；JSON必须选已冻结原生变体，不搬payload或照抄Markdown标题。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <证据标题>

## 证据身份
- `id`：
- `schemaVersion`：
- `status`：draft | recorded | verified | rework | superseded
- candidate/source SHA：

## 来源与输入
- caller/source refs（file:line）：
- 合法输入与版本：
- 执行时间和环境：

## 断言与业务 oracle
- 业务 oracle：
- 原子断言：
- 排重对象：

## 结果
- 逐步结果、退出码、产物：
- 失败：

## 限制与复核
- 未执行/未覆盖：
- 不得外推的结论：
- 复核条件：

原生JSON使用注册表中已冻结的格式变体；不复制本页Markdown标题、不移动原字段到payload。新增_governance映射上述五项证据内容，历史结果与本轮审查分轴；变体自有版本独立于默认Markdown版本。新格式仍须固定源、真实consumer与正反例pilot，不因本页存在就自动适配任意JSON。

````
<!-- template-source-example:end -->
