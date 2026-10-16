# docs/phase1/ — 第一阶段（忠实还原）文档

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: governance-index-v1 / 1.0.0

本页把 phase1 历史材料接入 `governance-index-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 目的

- 历史 phase1 索引与导航：phase1 foundation document full-text review: docs/phase1/ — 第一阶段（忠实还原）文档.

## 范围

- 当前包含：原始章节入口、阶段边界、历史决策或 status 导航。
- 明确不包含：当前缺陷台账、runtime/E2E/视觉/coverage 结论和未复核实现状态。

## 当前状态

- `status`: historical
- `lastReviewed`: 2026-10-17

## 入口与责任

- canonical 入口：当前 phase1 canonical 文档、代码、测试和审计台账。
- Owner：Codex（文档治理；不代签原执行）。
- 下游使用者：实现、审计和测试维护者。

## 证据与下一步

- 关键来源：`docs/phase1/README.md` 原始全文；source revision `d62602284cbfe2d9306f4acb006d15d944d1f6e2`；source SHA `1bc2f3b578845ad1d937c37749303a8742f40c0a09e1b8605c657d00370120ae`。
- 未决/阻塞：- （无新增；历史边界保持开放）
- 下一步：引用时带日期，并以当前 canonical 文档、代码和测试复核。

## 历史范围

- phase1 foundation archive；日期：2026-06-07；固定来源 `d62602284cbfe2d9306f4acb006d15d944d1f6e2`；source SHA `1bc2f3b578845ad1d937c37749303a8742f40c0a09e1b8605c657d00370120ae`。

## 原始结论

- The Phase1 index frames the stage as faithful restoration, distinguishes status snapshots/design/engineering/history, and warns that plans are historical and later defects belong to audit ledgers.

## 当时证据

- 标题锚点：索引；覆盖快照（v1.0 冻结时点；当前缺陷见审计台账）；设计 / 决策（主线，编号有序）；工程经验 / 运维；历史归档；怎么用；目录文件索引；原始正文、表格、状态词和链接在 quote 保全。

## 当前有效性

historical。do not promote historical claims to current truth without a current source or user decision
- 历史冲突/未决：
- （无新增；历史边界保持开放）

## 继任文档

- C；u；r；r；e；n；t； ；p；h；a；s；e；1； ；c；a；n；o；n；i；c；a；l； ；d；o；c；s；/；c；o；d；e；/；t；e；s；t；s； ；a；n；d； ；a； ；f；r；e；s；h； ；p；r；i；m；a；r；y；-；s；o；u；r；c；e； ；r；e；v；i；e；w；.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `1bc2f3b578845ad1d937c37749303a8742f40c0a09e1b8605c657d00370120ae`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # docs/phase1/ — 第一阶段（忠实还原）文档
>
> > v1.0.0 已上线、运行时冻结（根 README）。真值锚 = 大宇原版 `pal.exe` / 原始数据，
> > sdlpal C 源为参考实现。
> > **第二阶段（重制）**文档在 [`../phase2/`](../phase2/README.md)，两阶段世界观不混。
>
> > **状态表口径（2026-09-06 标注）**：下列 status 表是 **v1.0 冻结时点的覆盖快照**
> > （feature-status 2026-06-16、cutscene-status 2026-06-07 等），用于了解冻结时的完成度，
> > **不是当前缺陷台账**——上线后新发现的存档/切场景/战斗调用/离线缓存等问题以
> > [pre-E2E 审计](../ops/audits/pre-e2e/summary.md) 与后续修复卡为准。表中资源、公式等
> > 仍由源码与原始数据背书的条目继续作为专题真值。
>
> ## 索引
>
> ### 覆盖快照（v1.0 冻结时点；当前缺陷见审计台账）
>
> [状态快照目录](status/README.md) 统一说明各表的记录时点和有效范围。
> | 文件 | 内容 |
> |---|---|
> | [status/feature-status](status/feature-status.md) | 功能完成度总表 |
> | [status/opcode-status](status/opcode-status.md) | 事件 opcode 实现状态 |
> | [status/cutscene-status](status/cutscene-status.md) | 过场 / 演出状态 |
> | [status/item-status](status/item-status.md) · [status/magic-status](status/magic-status.md) | 物品 / 仙术状态 |
> | [status/resource-status](status/resource-status.md) | MKF 资源解析状态 |
> | [game-mechanics](game-mechanics.md) | 战斗 / 机制考证（标注 sdlpal 验证 vs pal.exe 推断） |
>
> ### 设计 / 决策（主线，编号有序）
> | 文件 | 内容 |
> |---|---|
> | [01-feasibility](01-feasibility.md) → [06-testing](06-testing.md) | 可行性 / 架构 / 开发计划 / **决策(04)** / 事件 schema(05) / 测试(06) |
>
> ### 工程经验 / 运维
> | 文件 | 内容 |
> |---|---|
> | [engineering-notes](engineering-notes.md) | 跨会话踩坑 + 方法论（CLAUDE.md「工程经验速查」节的展开版） |
> | [sdlpal-runbook](sdlpal-runbook.md) | sdlpal 参考 / 反汇编工具链 |
>
> ### 历史归档
> | 文件 | 内容 |
> |---|---|
> | [plans/](plans/README.md) | per-milestone 计划 / 审查快照（m0–m5 / d-series）——**过程记录，不反映现状**；查现状看上面的 status 表 |
>
> ## 怎么用
> - **冻结时的覆盖情况** → status 表；后续问题 → [审计台账](../ops/audits/pre-e2e/summary.md)
> - **为什么这么定** → [04-decisions](04-decisions.md)
> - **踩过的坑** → [engineering-notes](engineering-notes.md)
> - **当年怎么一步步做的** → [plans/](plans/README.md)（历史，慎用）
>
> ## 目录文件索引
>
> - [02-architecture.md](02-architecture.md)
> - [03-development-plan.md](03-development-plan.md)
> - [05-events-schema.md](05-events-schema.md)
>
> 历史计划的完整索引统一维护在 [plans/README](plans/README.md)。

<!-- original-source-quote:end -->
