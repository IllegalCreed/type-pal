# 测试文档索引：阶段

Status: current
Owner: Codex（新增索引与 producer 治理维护职责）
Last reviewed: 2026-10-16
Template: governance-index-v1 / 1.0.0

## 目的

按 ops、第一阶段或第二阶段的适用范围查报告，不混用两阶段的真值和验收边界。

## 范围

当前 3 个适用阶段组、29 个成员关系、18 个唯一 ID：ops 1；phase1 11；phase2 17。跨组出现指向同一报告。

## 当前状态

phase 数组是适用范围，不是执行次数；第一阶段旧验证不能继承成第二阶段通过。早期 capture 的分组纠正已在本轮之前完成，本页沿用批准的来源。

页面 current 仅指导航投影有效；行的出版状态、历史验收与本轮深审分开。原视图没有文档级 Owner 或审查日期，上方责任是本次新增治理职责。
2026-10-16 只记录当时索引规则、来源与导航语义的审查；重新生成不会续期日期，也不授予变化后的正文或下游报告新的审查、runtime/E2E/视觉/coverage 信用。

## 入口与责任

catalog.phase 决定组别，报告分别提供各阶段 primary source 与执行边界；阶段冲突回事实源审查，不由 renderer 裁决。
本页由 [generate-testing-index.mjs](../../../scripts/docs/generate-testing-index.mjs) 生成，不能手工维护派生行；人工总入口是 [README](README.md)。

### ops

| ID | 文档 | 状态 | Owner |
|---|---|---|---|
| legacy-flat-audit | [Legacy flat 内容深审总账](../domains/ops/testing-governance/legacy-flat-audit.md) | current | Codex |


### phase1

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
| legacy-flat-audit | [Legacy flat 内容深审总账](../domains/ops/testing-governance/legacy-flat-audit.md) | current | Codex |
| phase1-dependency-ownership | [第一阶段依赖所有权拆分](../domains/phase1-runtime/dependencies/dependency-ownership/report.md) | current | Codex |


### phase2

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
| editor-command-form-families | [编辑器命令表单族所有权](../domains/editor/commands/command-form-families/report.md) | current | Codex |
| editor-map-workspace-sessions | [编辑器地图工作区会话所有权](../domains/editor/map/map-workspace-sessions/report.md) | current | Codex |
| legacy-flat-audit | [Legacy flat 内容深审总账](../domains/ops/testing-governance/legacy-flat-audit.md) | current | Codex |
| reforge-menu-session | [Reforge 菜单与物品会话所有权](../domains/runtime/menu/menu-session/report.md) | current | Codex |
| runtime-active-scene | [活动场景资源与镜头所有权](../domains/runtime/scene/active-scene/report.md) | current | Codex |
| runtime-battle-host | [战斗宿主启动、取消与世界提交](../domains/runtime/battle/battle-host/report.md) | current | Codex |
| runtime-battle-session-owners | [战斗会话 readiness、结算与指令选择](../domains/runtime/battle/battle-session-owners/report.md) | current | Codex |
| runtime-world-owners | [世界移动提交与绘制状态所有权](../domains/runtime/world/world-runtime/report.md) | current | Codex |

## 证据与下一步

业务来源为 [catalog.json](../catalog.json)；原始报告、SHA、输入、oracle 与执行证据须继续沿目标正文回读，不能由本索引补证。
模板与源保真边界见 [L 冻结设计](../../phase-governance/reviews/20261016-testing-index-design.md)。本轮只替换同路径索引版式，不 supersede 下游报告或其历史结论。
缺来源、成员或链接不一致、重生成丢章节时停止接收；先在对应事实源解释并审查变更，再运行公开生成命令及完整文档门。真实语义 scope 改变须新审查和 review 记录，不能刷日期或 SHA 代替核读。
