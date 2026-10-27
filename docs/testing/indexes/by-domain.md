# 测试文档索引：工程域

Status: current
Owner: Codex（新增索引与 producer 治理维护职责）
Last reviewed: 2026-10-16
Template: governance-index-v1 / 1.0.0

## 目的

按实际登记的工程域进入报告与证据，避免以目录或文件名猜测职责。

## 范围

当前 6 个工程域、20 个唯一 ID：cross-phase 1；e2e 9；editor 2；ops 1；phase1-runtime 2；runtime 5。每份登记记录在该维度只列一次。

## 当前状态

工程域只负责导航；各行 status 与 Owner 保留 catalog 原值。source audit 和历史实跑须按目标报告的边界分别阅读。

页面 current 仅指导航投影有效；行的出版状态、历史验收与本轮深审分开。原视图没有文档级 Owner 或审查日期，上方责任是本次新增治理职责。
2026-10-16 只记录当时索引规则、来源与导航语义的审查；重新生成不会续期日期，也不授予变化后的正文或下游报告新的审查、runtime/E2E/视觉/coverage 信用。

## 入口与责任

domain 字段决定组别；人和 Agent 从组内 canonical 继续查 evidence，域冲突回 catalog 解释，不在派生页重分类。
本页由 [generate-testing-index.mjs](../../../scripts/docs/generate-testing-index.mjs) 生成，不能手工维护派生行；人工总入口是 [README](README.md)。

### cross-phase

| ID | 文档 | 状态 | Owner |
|---|---|---|---|
| game-script-corrections | [两阶段脚本纠错与持久入口回归](../domains/cross-phase/script-corrections/report.md) | active | Codex |


### e2e

| ID | 文档 | 状态 | Owner |
|---|---|---|---|
| e2e-001 | [001 开场](../e2e/stages/001-opening/report.md) | verified | Codex |
| e2e-002 | [002 客栈住客与赏银](../e2e/stages/002-inn-guests-and-reward/report.md) | verified | Codex |
| e2e-003 | [003 下楼、道士与厨房交代](../e2e/stages/003-kitchen/report.md) | verified | Codex |
| e2e-004 | [004 端菜、赠酒与道士离场](../e2e/stages/004-meal/report.md) | verified | Codex |
| e2e-005 | [005 买虾、报信与返程](../e2e/stages/005-shrimp/report.md) | verified | Codex |
| e2e-006 | [006 求药、出海与仙灵岛入口](../e2e/stages/006-doctor-boat/report.md) | rework | Codex |
| e2e-common-issues | [001–005 共性问题族](../e2e/cross-stage/common-issues.md) | current | Codex |
| e2e-contract | [两阶段 E2E 与录像合同](../e2e/contract.md) | current | Codex |
| e2e-route | [双阶段快速通关路线方案](../e2e/route-proposal.md) | proposal | Codex |


### editor

| ID | 文档 | 状态 | Owner |
|---|---|---|---|
| editor-command-form-families | [编辑器命令表单族所有权](../domains/editor/commands/command-form-families/report.md) | current | Codex |
| editor-map-workspace-sessions | [编辑器地图工作区会话所有权](../domains/editor/map/map-workspace-sessions/report.md) | current | Codex |


### ops

| ID | 文档 | 状态 | Owner |
|---|---|---|---|
| legacy-flat-audit | [Legacy flat 内容深审总账](../domains/ops/testing-governance/legacy-flat-audit.md) | current | Codex |


### phase1-runtime

| ID | 文档 | 状态 | Owner |
|---|---|---|---|
| game-input-rotation | [第一阶段可选45°方向控制回归](../domains/phase1-runtime/control-rotation/report.md) | verified | Codex |
| phase1-dependency-ownership | [第一阶段依赖所有权拆分](../domains/phase1-runtime/dependencies/dependency-ownership/report.md) | current | Codex |


### runtime

| ID | 文档 | 状态 | Owner |
|---|---|---|---|
| reforge-menu-session | [Reforge 菜单与物品会话所有权](../domains/runtime/menu/menu-session/report.md) | current | Codex |
| runtime-active-scene | [活动场景资源与镜头所有权](../domains/runtime/scene/active-scene/report.md) | current | Codex |
| runtime-battle-host | [战斗宿主启动、取消与世界提交](../domains/runtime/battle/battle-host/report.md) | current | Codex |
| runtime-battle-session-owners | [战斗会话 readiness、结算与指令选择](../domains/runtime/battle/battle-session-owners/report.md) | current | Codex |
| runtime-world-owners | [世界移动提交与绘制状态所有权](../domains/runtime/world/world-runtime/report.md) | current | Codex |

## 证据与下一步

业务来源为 [catalog.json](../catalog.json)；原始报告、SHA、输入、oracle 与执行证据须继续沿目标正文回读，不能由本索引补证。
模板与源保真边界见 [L 冻结设计](../../phase-governance/reviews/20261016-testing-index-design.md)。本轮只替换同路径索引版式，不 supersede 下游报告或其历史结论。
缺来源、成员或链接不一致、重生成丢章节时停止接收；先在对应事实源解释并审查变更，再运行公开生成命令及完整文档门。真实语义 scope 改变须新审查和 review 记录，不能刷日期或 SHA 代替核读。
