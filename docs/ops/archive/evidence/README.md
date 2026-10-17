# 时点证据

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把历史材料接入 `evidence-receipt-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 证据身份

- `id`：原始证据记录的稳定 ID（保留于 quote）。
- `schemaVersion`：原始记录版本（保留于 quote）。
- `status`：historical receipt；不改写为当前 verified。
- candidate/source SHA：见本页 source/after SHA 和原始 quote。

## 来源与输入

- caller/source refs（file:line）：由原始证据记录保全；本页 source `docs/ops/archive/evidence/README.md`。
- 合法输入与版本：固定历史 source revision、原始数据/命令和记录环境。
- 执行时间和环境：以原始 receipt 为准；本次迁移不重跑。

## 断言与业务 oracle

- 业务 oracle：原始 receipt 的 caller、输入、断言和结果关系可追溯。
- 原子断言：quote 中每条机器/人工断言保持原样。
- 排重对象：当前 task card、同批 evidence 和 successor receipt。

## 结果

- 逐步结果、退出码、产物：保留原始记录；不把历史回执升格为当前通过。
- 失败：原始失败、rework、未执行和 unknown 信号继续保留。

## 限制与复核

- 未执行/未覆盖：- （无新增；历史边界保持开放）
- 不得外推的结论：不得外推 runtime、E2E、视觉、coverage 或当前产品完成。
- 复核条件：当前 consumer、source/oracle、task card 和独立验收重新齐全后才可重开。

## 历史范围

- phase2/lore archive；日期：2026-08-22；固定来源 `1cfb47719fd36122d73b3d1ac7642cec192ccc15`；source SHA `130a29fcb02778dac7142ec8e4caf0df3c4fbb2af00e186da21aecf5e0092114。

## 原始结论

- 时点证据：这是 evidence-receipt，当前文档状态为 historical。全文 23 行、3 个标题；摘要/首段为「报告、截图和测量产物按任务存放；其内容是产生时的事实，不承诺随后实现不变。媒体原始字节保留，当前判断应同时核对源码与任务状态。」。属于历史/归档材料，不能单独证明当前实现。

## 当时证据

- 原始标题/章节/HTML artifact 在 quote 或 artifact envelope 中保全。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：
- （无新增；历史边界保持开放）

## 继任文档

- Current evidence receipt, task card and verified consumer result when re-run.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `130a29fcb02778dac7142ec8e4caf0df3c4fbb2af00e186da21aecf5e0092114`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 时点证据
>
> 报告、截图和测量产物按任务存放；其内容是产生时的事实，不承诺随后实现不变。媒体原始字节保留，当前判断应同时核对源码与任务状态。
>
> 上级：[运维历史归档](../README.md)。
>
> ## 分类入口
>
> - [A7-3 · 历史证据](A7-3/README.md)
> - [文档结构整理证据](DOC-IA-2/README.md)
> - [ED-3 · 历史证据](ED-3/README.md)
> - [ED-REORDER-DRAG-1 · 历史证据](ED-REORDER-DRAG-1/README.md)
> - [ED-SHOP · 历史证据](ED-SHOP/README.md)
>
> ## 文档与附件
>
> - [ARCH-CURRENT-ONLY-1 current-only retention ledger](ARCH-CURRENT-ONLY-1-retention-ledger.md)
> - [C1-3 第一批 NPC 归档决策（用户已批准）](C1-3-first-batch-proposal.md)
> - [ED-3 A-C PAL 引用索引性能证据（2026-09-04 至 2026-09-05）](ED-3A-reference-index-performance-2026-09-04.md)
> - [ED-INPUT-PERF-1 PAL Chromium 性能与功能证据](ED-INPUT-PERF-1-pal-chromium-2026-08-25.md)
> - [OPS-TST-PERF-B → ARCH-CURRENT-ONLY-1 迁移 / proof 交接](OPS-TST-PERF-B-arch-current-only-handoff.md)
> - [OPS-TST-PERF current-only baseline（2026-08-22）](OPS-TST-PERF-current-only-baseline-2026-08-22.md)

<!-- original-source-quote:end -->
