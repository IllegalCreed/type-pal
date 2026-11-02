# 创意叙事模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`narrative-idea-v1`的模板说明，本页自身使用reference-canon，不新增类型。区分探索目的、lore/阶段/法律约束、候选来源等级、待作者选择与升格canon门槛。

模板选择由实际内容职责决定；历史材料按archive规则保留原日期、结论与继任，不用通用封套替代逐篇判断。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `214afbb534c2a3f7cca607348111b6bd283e0478`，SHA-256 `504cf147b0fa2559ed5851c43c649273beab5a628c54370d2dab47089cc52d92`，445B，本轮逐行核读。旧source pin `7cfdccad9fd9299a7d839cc3047a6252e4474b50` / `504cf147b0fa2559ed5851c43c649273beab5a628c54370d2dab47089cc52d92`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../engineering/guides/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](README.md)提供统一选择入口。

## 当前真值

源结构：创意目的；已知约束；候选内容；未决选择；升级为 canon 的门槛。

纯创意、引用与已确认canon分开；用户未裁决的设定冲突不能因进入文档就发布为角色/时间线事实。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

复制时只取下面源块，另填真实标题、身份、范围与证据，不把本页说明复制成任务或结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# <创意/叙事草案标题>

## 创意目的
- 想探索的主题、情绪或玩法：

## 已知约束
- lore/阶段/法律/产品约束：

## 候选内容
- 候选设定、角色、场景或 beat：
- 每项注明来源等级或纯创意：

## 未决选择
- 冲突与待作者裁决：
- 不能提前当作 canon 的部分：

## 升级为 canon 的门槛
- 所需一手来源/用户裁决：
- 升格后需要更新的文档和下游：

````
<!-- template-source-example:end -->
