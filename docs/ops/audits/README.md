# 当前审计与修复依据

Status: current
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: governance-index-v1 / 1.0.0

本页是 ops 审计与修复材料的当前导航入口。索引只负责把读者送到对应审计、任务和证据；每个目标的状态、source/after SHA、历史适用范围和执行信用由其自身 review record 与 consumer 决定。

## 目的

- 提供当前审计、架构债账本和 pre-E2E 审计的单一入口。
- 明确索引不授予产品、runtime、E2E、视觉或 coverage 通过。

## 范围

- 当前包含：architecture debt ledger、pre-E2E audit reports、与审计相关的任务/证据入口。
- 明确不包含：未由对应一手来源、当前 consumer 和独立回执支持的执行结论。

## 当前状态

- `status`: current（导航）；被索引的审计可为 open、historical、rework 或其它自身合同状态。
- `lastReviewed`: 2026-10-17

## 入口与责任

- canonical 入口：本页、[架构债账本](architecture-debt.md) 与 [pre-E2E 审计](pre-e2e/README.md)。
- Owner：Codex（文档治理；不代签原执行）。
- 下游使用者：任务卡、testing domain、证据 consumer 和文档治理账本。

## 证据与下一步

- 关键来源：各审计正文、当前 task card、testing catalog/evidence 与本批 review record。
- 未决/阻塞：历史审计不能单独证明当前产品行为；过时或无 consumer 的材料进入清理候选，先保留 SHA、successor 和分类账。
- 下一步：继续逐篇审查 audit/evidence/task 文档；完成 consumer 审计后再提出可逆归档或删除候选。

## 原文保全

固定 source revision `516872a827ed0f6321aa18162aa8a522edbab3c4`，source SHA `12754695f9e2c901c3ddaeec69522a47bb0e3dae2dbf12607f6f62d4f2b2e275`；以下 quote 可逆回原始 UTF-8 字节，导航链接和原始边界均保留。
<!-- original-source-quote:start -->
> # 当前审计与修复依据
>
> 这里只放仍在被当前工作消费的审计台账。已归档报告见 archive/audits；文档治理的结果见任务总索引。
>
> 上级：[协作与工程维护](../README.md)。
>
> ## 分类入口
>
> - [全仓架构债与分批治理](architecture-debt.md)（2026-09-24首轮盘点；第一阶段同样治理，重构与缺陷修复分开）
> - [全仓代码质量治理总纲](code-quality-governance.md)（CODE-QUALITY-1；逐文件清单、批次边界与首批 RLE 安全）
> - [逐文件代码治理账本](code-quality-file-ledger.md)（已直接核验文件、证据和待核计数）
> - [pre-e2e](pre-e2e/README.md)
>
<!-- original-source-quote:end -->
