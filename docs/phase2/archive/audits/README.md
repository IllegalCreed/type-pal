# 历史专项审计

Status: current
Owner: Codex（新增文档治理维护职责）
Last reviewed: 2026-10-16
Template: governance-index-v1 / 1.0.0

## 目的

检索25份时点审计、普查与复核，帮助读者把旧基线发现和当前修复台账分开。

## 范围

保留 A7资源闭包、资产迁移、战斗、菜单、实体、编辑器、第一阶段输入、文本事件、渲染与壳层等25项原标签；缺口仍按各自报告基线解释。

原入口的职责表述保持如下：

> 保留各领域的时点审计、普查和复核报告。报告中的缺口按其基线解释；当前修复台账在 ops/audits/pre-e2e。

## 当前状态

本页为 current 导航，报告保持历史时点。“三方逐函数”“复核”“普查”等标签不代表本轮重新读其源码、新三签、运行时或coverage通过；已接收材料仍只在其实际固定范围有效。

原页没有 Owner、审查日期或状态字段；上方信息仅表示本次文档治理维护责任与本页核读日期，没有续验下游结论。候选及独立接收范围以任务回执为准，本页不发布产品通过结论。

## 入口与责任

本页维护25个原报告入口；当前修复台账回 ops/audits/pre-e2e，具体报告保原结论、日期、证据与缺口。本页不是新增审计报告。

上级：[第二阶段历史归档](../README.md)。

### 文档与附件

- [A7-0 音乐资源闭包报告](a7-0-music-resource-closure-report.md)
- [A7-2 静态图闭包与 engine chrome 自包含结果报告](a7-2-static-images-engine-chrome-report.md)
- [A7/R7 工程资源闭包与稳定资源注册表审计](a7-resource-closure-audit.md)
- [资产 / 提取 / 迁移 八单元 三方逐函数对照审计(MKF / 精灵 / 字节码 / 资产管线 / manifest / 投掷物 / 战斗物品 / 数据 bug 补丁台账)](am-asset-migrate-audit.md)
- [攻击 / 法术系统 四单元 三方逐函数对照审计(物理攻击 / 法术攻击 / 召唤 / 混乱打友)](b-attack-magic-audit.md)
- [战斗核心逻辑三方逐函数审计(公式 / 状态机 / 回合队列 / 结算)](b-core-audit.md)
- [战斗子系统逐函数审计（B 单元 / phase2-foundation）](b-subsystem-audit.md)
- [战场/战斗乐默认值 · 待作者定值清单（2026-07-06，随 D24 三层化补丁产出）](battle-config-fills-review.md)
- [二阶段战斗演出审计 —— 一阶段知识移植清单（2026-07-05）](battle-presentation-audit-2026-07-05.md)
- [菜单系统 九单元 三方逐函数对照审计(框架 / 状态 / 装备 / 仙术 / 物品 / 商店 / 存档 / 开场 / 主菜单)](c-menu-audit.md)
- [实体/角色数据 八单元 三方逐函数对照审计(实体模型 / 角色数据 / 跟随者 / 装备效果 / 升级经验 / 技能 / 物品 / 敌人)](ec-data-audit.md)
- [编辑器/引擎全功能盘点 + 对标评审（2026-07-05）](editor-audit-2026-07-05.md)
- [编辑器创作闭环与一级模块审计（2026-07-13）](editor-authoring-closure-audit-2026-07-13.md)
- [编辑器整体翻新与质量审查后续备忘（2026-08-14）](editor-modernization-follow-up-2026-08-14.md)
- [编辑器视觉与工作台一致性巡检（2026-08-15）](editor-ui-audit-2026-08-15.md)
- [第一阶段引擎架构债审查报告（第二阶段重写输入）](engine-debt-audit.md)
- [对话/文本系统 三方逐函数审计(对话框渲染 / 控制符解析 / 文本数据)](n-dialog-text-audit.md)
- [事件 / 脚本系统三方逐函数审计(事件解释器 / autoScript / 触发器 / 走位骑乘相机 / 页切换状态机)](n-event-script-audit.md)
- [N1-1 对话控制码退役审计](n1-dialogue-migration-audit.md)
- [第一阶段深度审计跟踪表](phase1-audit-tracker.md)
- [原版事件脚本字节码普查(M3 设计输入,2026-07-02)](script-census.md)
- [字体 / 调色板 / 屏幕特效 — 三方逐函数对照审计](w-font-palette-audit.md)
- [渲染地基三方逐函数审计(瓦片 / 精灵 / 场景合成)](w-render-audit.md)
- [壳层 / 主循环 / 音频 / 过场 / 场景 / 存档 · 三方逐函数审计](x-shell-audit.md)
- [X3-1 场景入场迁移审计](x3-scene-entry-migration-audit.md)

## 证据与下一步

原页33行、2个标题、25个成员和26次 href；全部原标签/目标/顺序保留。当前问题台账与旧审计职责边界没有因本次整理而改变。

源身份：`69427d5d564366fc3f82e325d049e8bafa0fcda4:docs/phase2/archive/audits/README.md`，blob `1496f91e41e6830a4e3e45265964ff7414032a12`，SHA256 `b60863e6f6bd6c7cc02075047be4af5a36f3c8ad9dc64a82a5158aeaba97063f`。原202行中的本页完整字节保存在下方源快照；新正文状态与源时点分开阅读。

治理入口：[任务卡](../../../ops/tasks/DOCS-FULL-TEMPLATE-1.md)、[本包作者回执](../../../ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-phase2-navigation-p-20261016.json)、[冻结设计](../../../phase-governance/reviews/20261016-phase2-navigation-p-design.md)。

停止线：未核子报告或raw不得登记源码/执行新信用；本页治理不能替代实际审计、质量门或产品通过。

固定121ff正文及完整回执语义已获非作者接收；根当前行政/中央接入按[专属记录](../../../phase-governance/reviews/20261016-phase2-navigation-p.json)另验。原候选时点的下一步原文（接收进度现以前句为准）：“交本页候选独立复核，根同步 current导航状态和错类型；报告与raw若需后续治理仍须逐份真实核读。”

以下仅为可逆源快照，标题和链接不重复计入当前导航。原目标的日期、签字、版本和结论仍按其自身来源解释。

<!-- P-ORIGINAL-SOURCE-BEGIN docs/phase2/archive/audits/README.md -->
~~~~text
# 历史专项审计

保留各领域的时点审计、普查和复核报告。报告中的缺口按其基线解释；当前修复台账在 ops/audits/pre-e2e。

上级：[第二阶段历史归档](../README.md)。

## 文档与附件

- [A7-0 音乐资源闭包报告](a7-0-music-resource-closure-report.md)
- [A7-2 静态图闭包与 engine chrome 自包含结果报告](a7-2-static-images-engine-chrome-report.md)
- [A7/R7 工程资源闭包与稳定资源注册表审计](a7-resource-closure-audit.md)
- [资产 / 提取 / 迁移 八单元 三方逐函数对照审计(MKF / 精灵 / 字节码 / 资产管线 / manifest / 投掷物 / 战斗物品 / 数据 bug 补丁台账)](am-asset-migrate-audit.md)
- [攻击 / 法术系统 四单元 三方逐函数对照审计(物理攻击 / 法术攻击 / 召唤 / 混乱打友)](b-attack-magic-audit.md)
- [战斗核心逻辑三方逐函数审计(公式 / 状态机 / 回合队列 / 结算)](b-core-audit.md)
- [战斗子系统逐函数审计（B 单元 / phase2-foundation）](b-subsystem-audit.md)
- [战场/战斗乐默认值 · 待作者定值清单（2026-07-06，随 D24 三层化补丁产出）](battle-config-fills-review.md)
- [二阶段战斗演出审计 —— 一阶段知识移植清单（2026-07-05）](battle-presentation-audit-2026-07-05.md)
- [菜单系统 九单元 三方逐函数对照审计(框架 / 状态 / 装备 / 仙术 / 物品 / 商店 / 存档 / 开场 / 主菜单)](c-menu-audit.md)
- [实体/角色数据 八单元 三方逐函数对照审计(实体模型 / 角色数据 / 跟随者 / 装备效果 / 升级经验 / 技能 / 物品 / 敌人)](ec-data-audit.md)
- [编辑器/引擎全功能盘点 + 对标评审（2026-07-05）](editor-audit-2026-07-05.md)
- [编辑器创作闭环与一级模块审计（2026-07-13）](editor-authoring-closure-audit-2026-07-13.md)
- [编辑器整体翻新与质量审查后续备忘（2026-08-14）](editor-modernization-follow-up-2026-08-14.md)
- [编辑器视觉与工作台一致性巡检（2026-08-15）](editor-ui-audit-2026-08-15.md)
- [第一阶段引擎架构债审查报告（第二阶段重写输入）](engine-debt-audit.md)
- [对话/文本系统 三方逐函数审计(对话框渲染 / 控制符解析 / 文本数据)](n-dialog-text-audit.md)
- [事件 / 脚本系统三方逐函数审计(事件解释器 / autoScript / 触发器 / 走位骑乘相机 / 页切换状态机)](n-event-script-audit.md)
- [N1-1 对话控制码退役审计](n1-dialogue-migration-audit.md)
- [第一阶段深度审计跟踪表](phase1-audit-tracker.md)
- [原版事件脚本字节码普查(M3 设计输入,2026-07-02)](script-census.md)
- [字体 / 调色板 / 屏幕特效 — 三方逐函数对照审计](w-font-palette-audit.md)
- [渲染地基三方逐函数审计(瓦片 / 精灵 / 场景合成)](w-render-audit.md)
- [壳层 / 主循环 / 音频 / 过场 / 场景 / 存档 · 三方逐函数审计](x-shell-audit.md)
- [X3-1 场景入场迁移审计](x3-scene-entry-migration-audit.md)
~~~~
<!-- P-ORIGINAL-SOURCE-END docs/phase2/archive/audits/README.md -->
