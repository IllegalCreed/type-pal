# E2E正式报告starter源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`test-run-report-v1`的模板说明，本页自身使用reference-canon，不新增类型。保留testingSchema/id/evidence front matter与testing-meta、Scope/执行断言/结果/Evidence/Revision history配对结构。

测试发布另按[测试治理](../governance.md)核catalog身份、report/evidence和日期；本页的示例ID、metadata或YAML不构成实际登记。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `5e184070a0c6c86c4b3cdb5b191cf8f7acbc3d3e`，SHA-256 `2f9437856eda7cf46ca716b732bdf41b9c94ae3e68418677dc8e2d96485c2c0e`，1453B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `2f9437856eda7cf46ca716b732bdf41b9c94ae3e68418677dc8e2d96485c2c0e`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../engineering/guides/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：Scope；执行与断言；结果；Evidence；Revision history。

e2e-NNN、packages/...、示例SHA/日期/最低存档11都是待替换的示例或原时点值，不发布占位ID、不把截图存在当验收；正式词表以冻结registry及真实consumer为准。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
---
testingSchema: 2
id: e2e-NNN
evidence: e2e/evidence/e2e-NNN.json
---

# E2E-NNN · <正式报告标题>

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-NNN","sourceRefs":[{"path":"packages/...","lines":"1-10","role":"caller/source"}],"publicCallers":["pnpm ..."],"legalInputs":["..."],"businessOracle":{"type":"...","assertions":["..."]},"dedupe":{"result":"reviewed","against":["..."]},"revision":{"currentSha":"...","contentVersion":22,"minimumSaveVersion":11,"history":["..."]},"evidence":"evidence.json"}
-->

> `id`: e2e-NNN · `status`: draft/active/verified/rework/superseded

## Scope

- phase / engine / candidate SHA：
- 起始 checkpoint 及前驱：
- 结束条件及下游 checkpoint：
- verify / capture profile：

## 执行与断言

| step | 剧情用途名 | 输入/等待 | 机器断言 | 画面/日志证据 |
|---|---|---|---|---|

## 结果

- 业务结果：
- 关键 NPC 日志：
- 编排合理化与命名清单：实际执行 / 源码核读 / 未核分开写。
- 失败、rework 或产品裁决：

## Evidence

- `evidence.json`：逐步状态、fullName、exit code、hash、artifact 路径。
- 截图/trace/video 只写稳定路径和 SHA256，不把截图存在当成通过。
- `testing-meta` 与 `evidence.json` 必须逐字段配对；sourceRefs 要落到真实 file:line，缺 SHA 或未跑阶段要显式标记。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|

````
<!-- template-source-example:end -->
