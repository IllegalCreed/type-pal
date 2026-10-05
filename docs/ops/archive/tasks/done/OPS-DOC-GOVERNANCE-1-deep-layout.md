# OPS-DOC-GOVERNANCE-1 - 协作文档深度治理与入口收口

Status: done
Phase: ops
Capability: ops / collaboration-docs
Coding Owner: Codex
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Contributor: Codex
Branch: codex/ops-doc-governance

## 目标

把 `docs/ops` 从“历史 board、当前任务、审计探针、证据散件混在一起”收口为可维护的协作信息架构：当前入口只展示当前责任，历史快照可追溯，审计工具与审计正文分离，任务证据按任务目录归档。

## 严格验收标准

- `docs/ops` 根目录只保留 README、agent-workflow、board、archive、audits、evidence、guides、tasks、templates；其余散落文件为 0。
- `board.md` 只保留当前活动任务与规则；旧历史快照迁入 archive，原文不改写。
- `audits/pre-e2e` 的正文与 tools 分离；所有移动探针保留 source/after SHA、cwd/import/runner、真实 caller、合法输入、oracle、排重、history/supersedes 和停止线。
- `evidence/` 根目录只保留 README 和按任务分目录的证据；现有 Kimi evidence 散件全部按任务归位，引用可解析。
- tasks、board、tasks/index、archive/tasks、evidence index、audit index 状态一致；没有历史卡留在 active 目录，也不把旧回执改写成当前通过。
- `pnpm check:docs`、`pnpm lint` 零诊断、`git diff --check` 全绿；不改产品源码、旧测试或 coverage。

## 当前证据与停止线

- 基线：`origin/main` 当前 `0438dcfdd`；本卡针对 docs/ops 信息架构，不改变产品行为。
- 已确认乱点：`board.md` 含大量历史快照；`audits/pre-e2e` 混有 39 个探针脚本；`evidence/` 有任务证据散件。
- 若相对 import、历史路径或任务状态无法安全归位，必须保留原文件并记录 unresolved/stopline，不得猜测或静默删除。

## 验收记录

- 进入 build：Codex 已完成基线盘点并建立独立 worktree。
- Review：accept；board、audit tools、task evidence 均按布局计划归位，source/after SHA、链接、静态 import 和质量门通过。
- 用户验收：接受协作文档入口收口；历史 board 保留，当前 board 只展示活动任务。

## 下一位 Agent 提示词

无下一位 Agent；本卡由 Codex 独立实施、验证、合并和推送。
