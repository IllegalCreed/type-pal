# 质量门模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`quality-gate-v1`的模板说明，本页自身使用reference-canon，不新增类型。Gate scope固定命令/cwd/版本/文件集，Diagnostics policy要求error/warning/info全零，记录raw计数/SHA后作passed/failed/blocked/historical裁定。

测试发布另按[测试治理](../governance.md)核catalog身份、report/evidence和日期；本页的示例ID、metadata或YAML不构成实际登记。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `f2feaa219e3023cbc6ea9a34a56000b5eafb46a0`，SHA-256 `75dbb966043b3c3d6281ac31d4932d7faaac36b7e89d708e6693d31b7017ed89`，416B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `75dbb966043b3c3d6281ac31d4932d7faaac36b7e89d708e6693d31b7017ed89`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：Gate scope；Diagnostics policy；Commands and raw counts；Decision；Stop line。

exit0不能替代零诊断；静态门不授runtime/E2E/视觉/coverage，不新增ignore或降级规则换绿。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# Quality gate

## Gate scope
- command, cwd, tool version, file set, phase:

## Diagnostics policy
- error / warning / info all must be zero; no ignore or downgrade:

## Commands and raw counts
- command:
- raw output / artifact SHA:

## Decision
- passed | failed | blocked | historical
- acceptance / rejection reason:

## Stop line
- no static gate may be represented as runtime, E2E, visual, or coverage proof:

````
<!-- template-source-example:end -->
