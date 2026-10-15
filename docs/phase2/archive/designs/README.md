# 历史设计与规范快照

Status: current
Owner: Codex（新增文档治理维护职责）
Last reviewed: 2026-10-16
Template: governance-index-v1 / 1.0.0

## 目的

检索22份原始设计与混合规范快照，保留旧字段、取舍和增量记录的来源入口。

## 范围

全部22份设计保留原名和顺序，包括 E6“已评审”和内容Schema“现行契约 + 历史设计”等原标签。当前规范已提取到 specs，本目录不继续追加现行合同。

原入口的职责表述保持如下：

> 原始设计与混合规范的完整快照；保留当时字段、取舍和增量记录。当前规范已提取至 specs，本目录不继续追加现行合同。

## 当前状态

本页为 current 导航，集合按历史来源阅读。“已评审”、用户定调日期和混合规范标签只描述旧目标当时文字，不是本轮新reviewed/build/实现签字，也不表示所有技术设计被废弃。

原页没有 Owner、审查日期或状态字段；上方信息仅表示本次文档治理维护责任与本页核读日期，没有续验下游结论。候选及独立接收范围以任务回执为准，本页不发布产品通过结论。

## 入口与责任

本页维护历史设计入口；目标文档保其原字段、决策和后继范围。现行规范回 specs，旧推导回原设计，不从目录标签合成新产品方案。

上级：[第二阶段历史归档](../README.md)。

### 文档与附件

- [角色(Actor)与精灵动画模型设计](actor-model-design.md)
- [氛围系统(W6 昼夜)设计 — 全帧乘法滤镜 + 氛围数据表](ambience-design.md)
- [migrate 资产管线 — UI box 首切片（design + plan）](asset-pipeline.md)
- [M4 · 战斗系统设计(v1 骨架，数据/命令表待普查补全）](battle-model-m4-design.md)
- [内容 Schema（现行契约 + 历史设计）](content-schema.md)
- [过场资源工作台与工程闭包设计](cutscene-asset-workbench-design.md)
- [E6 · 实体定位权威 设计方案（2026-07-05 · **已评审**:决策①仅被接管实体暂停 auto/②位移指令才隐式接管;③④留 E7/C7 期再拍）](e6-position-authority-design.md)
- [E7 · 大世界跟随者 + 显式骑乘 —— 设计(2026-07-07)](e7-follower-riding-design.md)
- [编辑器整体架构设计(第二阶段 · 内容编辑器)](editor-design.md)
- [敌人 AI 设计(M4c)—— 策略/演出分层 × 条件规则列表(2026-07-04 用户定调)](enemy-ai-design.md)
- [物品 / 装备数据架构设计(item & equipment data)](item-data-design.md)
- [菜单系统设计（menu design）](menu-design.md)
- [对话系统结构化数据模型 · 设计](model-design.md)
- [毒系统设计（P2·2026-07-06）](poison-system-design.md)
- [工程化架构设计(engine project / 「一工程一游戏」)](project-design.md)
- [项目生命周期设计(新建 / 打开 / 保存本地 · 工程完全自包含)](project-lifecycle-design.md)
- [存档系统设计(save-system)](save-system-design.md)
- [M2 场景模型设计(全场景静态迁移 + 引擎多场景)](scene-model-m2-design.md)
- [M3 · 剧情脚本系统 — 翻译器 + 解释器设计(v1)](script-model-m3-design.md)
- [剧情脚本系统](script-system-design.md)
- [技能数据架构设计(skill data)](skill-data-design.md)
- [对话框外观 · ② 实现设计(Canvas2D 适配 + 完整技术点覆盖)](visual-design.md)

## 证据与下一步

原页30行、2个标题、22个成员和23次 href；22个原目标、完整标签及其顺序已保留。

源身份：`69427d5d564366fc3f82e325d049e8bafa0fcda4:docs/phase2/archive/designs/README.md`，blob `5bc12cea51cbac4d8a47a636662928ea43fae72b`，SHA256 `52c007f8b6f1a57716e56cfba39e55471eff4bd7c64c387169939ccdf821541a`。原202行中的本页完整字节保存在下方源快照；新正文状态与源时点分开阅读。

治理入口：[任务卡](../../../ops/tasks/DOCS-FULL-TEMPLATE-1.md)、[本包作者回执](../../../ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-phase2-navigation-p-20261016.json)、[冻结设计](../../../phase-governance/reviews/20261016-phase2-navigation-p-design.md)。

停止线：不得将 E6旧评审或旧Schema标签升格为今天批准；本页全文阅读不等22篇设计全文重审。

下一步：交导航候选独立接收，由根维护 current导航轴和错类型；子设计若需新结论，另核具体一手来源与适用范围。

以下仅为可逆源快照，标题和链接不重复计入当前导航。原目标的日期、签字、版本和结论仍按其自身来源解释。

<!-- P-ORIGINAL-SOURCE-BEGIN docs/phase2/archive/designs/README.md -->
~~~~text
# 历史设计与规范快照

原始设计与混合规范的完整快照；保留当时字段、取舍和增量记录。当前规范已提取至 specs，本目录不继续追加现行合同。

上级：[第二阶段历史归档](../README.md)。

## 文档与附件

- [角色(Actor)与精灵动画模型设计](actor-model-design.md)
- [氛围系统(W6 昼夜)设计 — 全帧乘法滤镜 + 氛围数据表](ambience-design.md)
- [migrate 资产管线 — UI box 首切片（design + plan）](asset-pipeline.md)
- [M4 · 战斗系统设计(v1 骨架，数据/命令表待普查补全）](battle-model-m4-design.md)
- [内容 Schema（现行契约 + 历史设计）](content-schema.md)
- [过场资源工作台与工程闭包设计](cutscene-asset-workbench-design.md)
- [E6 · 实体定位权威 设计方案（2026-07-05 · **已评审**:决策①仅被接管实体暂停 auto/②位移指令才隐式接管;③④留 E7/C7 期再拍）](e6-position-authority-design.md)
- [E7 · 大世界跟随者 + 显式骑乘 —— 设计(2026-07-07)](e7-follower-riding-design.md)
- [编辑器整体架构设计(第二阶段 · 内容编辑器)](editor-design.md)
- [敌人 AI 设计(M4c)—— 策略/演出分层 × 条件规则列表(2026-07-04 用户定调)](enemy-ai-design.md)
- [物品 / 装备数据架构设计(item & equipment data)](item-data-design.md)
- [菜单系统设计（menu design）](menu-design.md)
- [对话系统结构化数据模型 · 设计](model-design.md)
- [毒系统设计（P2·2026-07-06）](poison-system-design.md)
- [工程化架构设计(engine project / 「一工程一游戏」)](project-design.md)
- [项目生命周期设计(新建 / 打开 / 保存本地 · 工程完全自包含)](project-lifecycle-design.md)
- [存档系统设计(save-system)](save-system-design.md)
- [M2 场景模型设计(全场景静态迁移 + 引擎多场景)](scene-model-m2-design.md)
- [M3 · 剧情脚本系统 — 翻译器 + 解释器设计(v1)](script-model-m3-design.md)
- [剧情脚本系统](script-system-design.md)
- [技能数据架构设计(skill data)](skill-data-design.md)
- [对话框外观 · ② 实现设计(Canvas2D 适配 + 完整技术点覆盖)](visual-design.md)
~~~~
<!-- P-ORIGINAL-SOURCE-END docs/phase2/archive/designs/README.md -->
