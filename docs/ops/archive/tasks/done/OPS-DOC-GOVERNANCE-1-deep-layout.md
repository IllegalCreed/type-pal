# OPS-DOC-GOVERNANCE-1 - 协作文档深度治理与入口收口

Status: done
Phase: ops
Capability: ops / collaboration-docs
Coding Owner: Codex
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Contributor: Codex
Branch: codex/ops-doc-governance
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 docs/ops 信息架构收口的历史记录：把历史 board、当前任务、审计探针、证据散件混置整理为可维护的协作结构；下述布局与门禁均为原卡时点陈述，本次文档治理未重跑。

## 目标

把 docs/ops 收口为“当前入口只展示当前责任、历史快照可追溯、审计工具与正文分离、任务证据按任务目录归档”的信息架构。

## 范围

- 范围内：docs/ops 根目录只保留 README、agent-workflow、board、archive、audits、evidence、guides、tasks、templates；board.md 只留当前活动任务与规则，旧历史快照迁 archive 原文不改写；audits/pre-e2e 的 39 个探针脚本与正文分离；evidence/ 根目录只留 README 与按任务分目录的证据，散件归位且引用可解析；tasks/board/index/archive/evidence/audit 状态一致。
- 范围外：产品源码、旧测试、coverage；把历史卡留在 active 目录或把旧回执改写成当前通过。

## 前提与证据

基线 origin/main 0438dcfdd；已确认乱点为 board.md 历史快照堆积、audits/pre-e2e 混入探针、evidence/ 散件。停止线：相对 import、历史路径或任务状态无法安全归位时保留原文件并记录 unresolved，不猜测或静默删除。移动探针保留 source/after SHA、cwd/import/runner、真实 caller、合法输入、oracle、排重、history/supersedes 和停止线。
- 当前状态：done（历史终态）

## 验收

原卡记录：Review accept——board、audit tools、task evidence 均按布局计划归位，source/after SHA、链接、静态 import 与质量门（check:docs、lint 零诊断、diff --check）通过；用户验收接受协作文档入口收口、历史 board 保留、当前 board 只展示活动任务。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡由 Codex 独立实施、验证、合并和推送，无下一位 Agent。S14 本页治理只改写泛化封套；该卡建立的目录职责现由文档模型与现行看板规则延续。

## 历史范围

基线 origin/main 0438dcfdd、分支 codex/ops-doc-governance（原卡未单列完成日期，按其验收记录时点读取）；2026-10-17 R42 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：docs/ops 布局收口经独立验收与用户接受；原文不改写的历史快照原则继续有效。原卡全文在下方 quote 保全。

## 当时证据

原卡正文自含目标、严格验收标准、基线盘点与验收记录；未引用独立 raw SHA。本页治理未新增任何执行。

## 当前有效性

historical。该卡固定的是当时的目录形态；当前 docs/ops 结构与职责已由后续治理（文档模型、S 批次）继续演化，以现行文档为准，不回退也不重授当时的布局快照。

## 继任文档

现行目录职责见[文档模型](../../../guides/documentation-model.md)与[看板规则](../../../board.md)；后续文档治理总卡为[DOCS-FULL-TEMPLATE-1](../../../tasks/DOCS-FULL-TEMPLATE-1.md)。

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
