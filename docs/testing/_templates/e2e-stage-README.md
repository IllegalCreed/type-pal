# E2E阶段入口starter源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`test-e2e-stage-v1`的模板说明，本页自身使用reference-canon，不新增类型。YAML示例列稳定阶段id、引擎、Owner、验证/到期时间、依赖和canonicalReport；正文说明入口旁路、当前结论与报告/机器证据。

测试发布另按[测试治理](../governance.md)核catalog身份、report/evidence和日期；本页的示例ID、metadata或YAML不构成实际登记。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `aa6c8a8c82fdc93369e695070a28f78dad401a49`，SHA-256 `d2ff52e23c26644d72a0bb938c4b6de582550ee88d3d464adeeb2c82c7112527`，670B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `d2ff52e23c26644d72a0bb938c4b6de582550ee88d3d464adeeb2c82c7112527`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../ops/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：入口与前置；当前结论；证据。

这是旧starter，正式采用需满足统一E2E stage合同；不能重复计为新类型，不生成复制的新报告或借scene/entity编号命名公开阶段。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# E2E-NNN · <阶段名称>

```yaml
id: e2e-NNN
status: draft
phase: [phase1, phase2]
engines: [game, reforge]
owner: <owner>
lastVerified: YYYY-MM-DD
reviewBy: YYYY-MM-DD
dependsOn: []
tags: [story]
canonicalReport: report.md
```

## 入口与前置

- 起始 checkpoint / 来源链：
- 运行命令：
- 不允许的旁路：

## 当前结论

只写当前 revision 的结论；历史 revision 放报告的 `Revision history`，不要复制新文件。

## 证据

- [正式报告](e2e-report.md)
- [机器回执](evidence.json)

阶段名应表达剧情/业务用途；内部 scene/entity 编号只写入报告的 `sourceRefs`，不能成为 canonical 目录名。

````
<!-- template-source-example:end -->
