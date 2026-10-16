# E2E 专项总览

Status: current
Owner: Codex
Last reviewed: 2026-10-17
Template: governance-index-v1 / 1.0.0

本页接入统一 testing 模板；原 testing-meta、catalog identity、sourceRefs、历史日期与横向结论在 quote 中保全。本次不重跑产品、E2E、视觉或 coverage。

## 目的

提供两阶段 E2E 阶段报告、共用合同、路线和横向问题族的唯一导航入口。

## 范围

当前包含 001–006 阶段入口、共用合同、路线方案、横向问题和检查点目录；明确不把 verified 导航状态外推为完整主线或 capture-ready。

## 当前状态

status: current；lastReviewed: 2026-10-17；阶段状态由 testing catalog、阶段页和正式报告各自拥有。

## 入口与责任

canonical 入口：本页与 testing catalog；Owner：Codex；下游使用者：E2E runner、阶段报告、路线任务卡和证据 consumer。

## 证据与下一步

关键来源：各阶段 README/report、e2e contract、route-proposal、cross-stage/common-issues 和 catalog；下一步按当前 task card 与 fresh evidence 继续 Q 批次。

## 原文保全

固定 source revision `dc478db11c6b52c4e50a1d1135f8a4740796418c`，source SHA `310f5031be8e76964cbd1cf2d4e704c5bbfbd2cf4f6451d64a7109d93e67ca6f`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # E2E 专项总览
>
> 这里是两阶段 E2E 的唯一导航入口。先按阶段找报告，再按[多维索引](../indexes/README.md)按状态、引擎、Owner 或主题反查。
>
> ## 阶段报告
>
> | 阶段 | 状态 | 报告 | 依赖 |
> |---|---|---|---|
> | 001 开场 | verified | [阶段页](stages/001-opening/README.md) · [正式报告](stages/001-opening/report.md) | 新游戏 |
> | 002 客栈住客与赏银 | verified | [阶段页](stages/002-inn-guests-and-reward/README.md) · [正式报告](stages/002-inn-guests-and-reward/report.md) | E2E-001 |
> | 003 下楼/厨房 | verified | [阶段页](stages/003-kitchen/README.md) · [正式报告](stages/003-kitchen/report.md) | E2E-002 |
> | 004 端菜/赠酒 | verified | [阶段页](stages/004-meal/README.md) · [正式报告](stages/004-meal/report.md) | E2E-003 |
> | 005 买虾/报信 | verified | [阶段页](stages/005-shrimp/README.md) · [正式报告](stages/005-shrimp/report.md) | E2E-004 |
> | 006 求药/出海 | rework | [阶段页](stages/006-doctor-boat/README.md) · [正式报告](stages/006-doctor-boat/report.md) | E2E-005 |
>
> `verified` 只表示该阶段当前报告满足它自己的 verify 合同，不表示完整主线或 capture-ready。
> `rework` 阶段不能作为下游正式前驱；阶段页中的 `dependsOn` 和报告中的候选 SHA/检查点链是唯一判据。
>
> ## 共用合同与横向材料
>
> - [两阶段 E2E 与录像合同](contract.md)
> - [每段必查：编辑器预览初始状态](contract.md#每段核对编辑器预览初始状态用户2026-10-12)
> - [路线方案](route-proposal.md)
> - [001–005 共性问题族](cross-stage/common-issues.md)
> - [横向材料索引](cross-stage/README.md)
> - [检查点目录](../../../projects/pal/e2e-checkpoints/README.md)
> - [E2E 任务卡看板](../../ops/archive/board-history/board-20261004.md)
>
> ## Agent 快速检索
>
> 机器优先读 [`../catalog.json`](../catalog.json)，不要从文件名推断状态。每个条目包含稳定 `id`、
> `status`、`phase`、`engines`、`canonical`、`dependsOn`、`tags`、`owner`、`lastVerified` 和 `reviewBy`。
> 修改阶段报告必须同时更新 catalog、阶段 README 和对应证据；CI 会拒绝缺字段、过期或索引漂移。
>
<!-- original-source-quote:end -->
