# E2E / 测试文档多维索引：按阶段

Status: current
Owner: Codex（新增索引与 producer 治理维护职责）
Last reviewed: 2026-10-30
Template: governance-index-v1 / 1.0.0

## 目的

选择稳定 E2E 阶段的正式报告，继续查其前驱、checkpoint 与证据；这张表不是顺序执行 runner。

## 范围

当前仅投影 kind=e2e-stage 的 6 个阶段、6 个稳定 ID。跨阶段合同、路线建议和共性审计不混入阶段表。

## 当前状态

阶段行状态来自 catalog：rework 1；verified 5。页面 current 不改变任何阶段的 rework、verified 或其它原状态，也不恢复旧运行授权。

页面 current 仅指导航投影有效；行的出版状态、历史验收与本轮深审分开。原视图没有文档级 Owner 或审查日期，上方责任是本次新增治理职责。
2026-10-16 只记录当时索引规则、来源与导航语义的审查；重新生成不会续期日期，也不授予变化后的正文或下游报告新的审查、runtime/E2E/视觉/coverage 信用。

## 入口与责任

catalog 的 kind 决定是否入表；阶段报告负责合法输入、前驱和录像证据，维护者需先核报告/evidence 配对。
本页由 [generate-testing-index.mjs](../../../scripts/docs/generate-testing-index.mjs) 生成，不能手工维护派生行；人工总入口是 [README](README.md)。

2026-10-30只审版本适用性投影与取消日历期限，不刷新下游执行。

| ID | 文档 | 状态 | Owner |
|---|---|---|---|
| e2e-001 | [001 开场](../e2e/stages/001-opening/report.md) | verified | Codex |
| e2e-002 | [002 客栈住客与赏银](../e2e/stages/002-inn-guests-and-reward/report.md) | verified | Codex |
| e2e-003 | [003 下楼、道士与厨房交代](../e2e/stages/003-kitchen/report.md) | verified | Codex |
| e2e-004 | [004 端菜、赠酒与道士离场](../e2e/stages/004-meal/report.md) | verified | Codex |
| e2e-005 | [005 买虾、报信与返程](../e2e/stages/005-shrimp/report.md) | verified | Codex |
| e2e-006 | [006 求药、出海与仙灵岛入口](../e2e/stages/006-doctor-boat/report.md) | rework | Codex |

### 已记录版本

| ID | 候选 SHA | content | minimumSave | sourceRefs | lastVerified |
|---|---|---|---|---|---|
| e2e-001 | d02278dc0154dd73b5db24388a35c30bb096cc81 | 22 | 11 | 7 | 2026-09-28 |
| e2e-002 | d02278dc0154dd73b5db24388a35c30bb096cc81 | 22 | 11 | 6 | 2026-10-02 |
| e2e-003 | d02278dc0154dd73b5db24388a35c30bb096cc81 | 22 | 11 | 7 | 2026-10-02 |
| e2e-004 | d02278dc0154dd73b5db24388a35c30bb096cc81 | 22 | 11 | 7 | 2026-10-02 |
| e2e-005 | d02278dc0154dd73b5db24388a35c30bb096cc81 | 22 | 11 | 8 | 2026-10-02 |
| e2e-006 | d02278dc0154dd73b5db24388a35c30bb096cc81 | 22 | 11 | 3 | 2026-10-03 |

只读对比：在仓库根运行 `node scripts/docs/testing-revisions.mjs`。HEAD不同不单独判过时；matching/changed/unknown按[版本适用性](../governance.md#版本适用性)解释，不授新的E2E信用。

## 证据与下一步

业务来源为 [catalog.json](../catalog.json)；原始报告、SHA、输入、oracle 与执行证据须继续沿目标正文回读，不能由本索引补证。
模板与源保真边界见 [L 冻结设计](../../phase-governance/reviews/20261016-testing-index-design.md)。本轮只替换同路径索引版式，不 supersede 下游报告或其历史结论。
缺来源、成员或链接不一致、重生成丢章节时停止接收；先在对应事实源解释并审查变更，再运行公开生成命令及完整文档门。真实语义 scope 改变须新审查和 review 记录，不能刷日期或 SHA 代替核读。
