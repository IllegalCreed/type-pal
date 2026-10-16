# 多 Agent 任务卡

Status: current
Last reviewed: 2026-10-15
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

任务卡保存目标、前提、范围、实施和交接，使下一位 Agent 能靠仓库继续工作。规则从[AGENTS](../../../AGENTS.md)和[现行工作流](../agent-workflow.md)进入，聊天仅作辅助。

## 范围

本目录保存当前任务和生成总索引；已归档任务保留[历史任务](../archive/tasks/README.md)的稳定路径。完整/轻量模板放在[templates](../templates/README.md)。新增任务完成后不因 done 自动移动；确需迁移时先有显式映射、source SHA 和全入链更新。

## 当前状态

Codex 分派并核准入，贡献者隔离实施，Codex 独立复核。固定三贤人 pending 席位不阻止当前模式，历史签字、counter 和用户裁决按原始范围保留。卡顶部 `Status:` 是唯一任务状态源，正文旧 build/review/交接不覆盖顶部终态。

## 入口与责任

### 建卡与准入

1. 非小改/跨 Owner 或跨会话任务先建卡；高风险复制[完整模板](../templates/TASK-template.md)，中等且前提简单复制[轻量模板](../templates/TASK-lite-template.md)。
2. 详细方案前完成前提门：原版/primary source、第一阶段、当前二阶段、本任务目标四向矩阵，每项 file:line 或一手来源。内部 ops/refactor 的 N/A 必须解释为什么不涉及行为、schema、数据或修复层。
3. schema/save/migration/资产、公共接口、新能力格/capability-map、关键公式、机制/移动/碰撞、大规模 generated rewrite、主动行为变化必须 full；从 lite 发现这些风险立即升级。
4. 大量 mismatch 先排查 runtime/分类、原版/一阶段理解、提取/地图/解码、audit/test model；关键 unknown 不 build。用户指出冲突先停线，前提变化使旧准入失效。主动偏离已核真值才提交 before→after 产品裁决，事实考证不转交用户。
5. Codex 在卡内记录前提、范围、Owner、白名单与验收的 `build allowed`；活动或阻塞任务进入[当前看板](../board.md)。

### 命名、状态与交接

沿用 `<领域>-<编号或能力格>-简短标题.md`，例如 `W7C-map-paint.md`、`A4-asset-import.md`、`OPS-0001-agent-workflow-bootstrap.md`。建新 ID 前检索[索引](index.md)与活动分支/worktree，避免身份碰撞，不重编号已存在的任务。

任务沿用 `draft → build → review → done` 和 `blocked/rework/cancelled`。`Status` 不代替前提、质量门或用户裁决；贡献者自验与 Codex 独立复核分开写。跨 Agent 交接提示词同时写卡和回复，包含角色、按序必读、证据、剩余风险、白名单、明确输出与停止线。

早期终态卡的原中文状态标签由检查器的精确名单读取，保留历史，不为统一工具而重写。已 done/cancelled 的任务不追溯重开；仍活动的高风险卡在下一次迁移前补齐前提门。

## 证据与下一步

[生成任务索引](index.md)只读取顶部状态；[看板](../board.md)仅活动分工，不手工维护另一份全量状态表。关闭卡里的下一位 Agent 指令不是当前授权；断链先追溯 Git，不恢复退役实现。

维护 Owner 在同一提交写回任务、索引、看板和相关 review/SHA；正文治理按[项目文档模型](../guides/documentation-model.md)。上级为[协作与工程维护](../README.md)。
