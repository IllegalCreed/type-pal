# OPS-DOC-GOVERNANCE-1 - 协作文档深度治理与入口收口

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `dc89d92d061bac9a5b83ddf8bbe8b8bf1176e27b77c2f092565b90a086fe2a30`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # OPS-DOC-GOVERNANCE-1 - 协作文档深度治理与入口收口
>
> Status: done
> Phase: ops
> Capability: ops / collaboration-docs
> Coding Owner: Codex
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Contributor: Codex
> Branch: codex/ops-doc-governance
>
> ## 目标
>
> 把 `docs/ops` 从“历史 board、当前任务、审计探针、证据散件混在一起”收口为可维护的协作信息架构：当前入口只展示当前责任，历史快照可追溯，审计工具与审计正文分离，任务证据按任务目录归档。
>
> ## 严格验收标准
>
> - `docs/ops` 根目录只保留 README、agent-workflow、board、archive、audits、evidence、guides、tasks、templates；其余散落文件为 0。
> - `board.md` 只保留当前活动任务与规则；旧历史快照迁入 archive，原文不改写。
> - `audits/pre-e2e` 的正文与 tools 分离；所有移动探针保留 source/after SHA、cwd/import/runner、真实 caller、合法输入、oracle、排重、history/supersedes 和停止线。
> - `evidence/` 根目录只保留 README 和按任务分目录的证据；现有 Kimi evidence 散件全部按任务归位，引用可解析。
> - tasks、board、tasks/index、archive/tasks、evidence index、audit index 状态一致；没有历史卡留在 active 目录，也不把旧回执改写成当前通过。
> - `pnpm check:docs`、`pnpm lint` 零诊断、`git diff --check` 全绿；不改产品源码、旧测试或 coverage。
>
> ## 当前证据与停止线
>
> - 基线：`origin/main` 当前 `0438dcfdd`；本卡针对 docs/ops 信息架构，不改变产品行为。
> - 已确认乱点：`board.md` 含大量历史快照；`audits/pre-e2e` 混有 39 个探针脚本；`evidence/` 有任务证据散件。
> - 若相对 import、历史路径或任务状态无法安全归位，必须保留原文件并记录 unresolved/stopline，不得猜测或静默删除。
>
> ## 验收记录
>
> - 进入 build：Codex 已完成基线盘点并建立独立 worktree。
> - Review：accept；board、audit tools、task evidence 均按布局计划归位，source/after SHA、链接、静态 import 和质量门通过。
> - 用户验收：接受协作文档入口收口；历史 board 保留，当前 board 只展示活动任务。
>
> ## 下一位 Agent 提示词
>
> 无下一位 Agent；本卡由 Codex 独立实施、验证、合并和推送。
<!-- original-source-quote:end -->
