# 参考真值模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`reference-canon-v1`的模板说明，本页自身使用reference-canon，不新增类型。用适用范围与一手file:line确定事实权，当前真值区分确认/候选，未知冲突与使用边界限制能支持的结论。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `a739a63f5d08479733a318211677ba80bbd9c431`，SHA-256 `0e3483d961cb333dfe615005c3e37f5b92861dfd9c382d723327014bb5b68edd`，398B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `0e3483d961cb333dfe615005c3e37f5b92861dfd9c382d723327014bb5b68edd`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../engineering/guides/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：适用范围；一手来源；当前真值；未知与冲突；使用边界。

有来源链接不等于源已全文读或原版实测；具体事实/推断/历史必须分层，升格需当前Owner和证据。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <参考/真值标题>

## 适用范围
- 阶段、版本、受众和使用场景：

## 一手来源
- source/primary refs（file:line 或外部出处）：
- 证据等级：

## 当前真值
- 已确认：
- 仅为历史/候选：

## 未知与冲突
- 未知：
- 冲突双方与待裁决问题：

## 使用边界
- 可以支持的结论：
- 不得推出的结论：
- 复核/升格条件：

````
<!-- template-source-example:end -->
