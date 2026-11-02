# docs/phase1/status/ — 第一阶段覆盖快照

Status: current（仅指导航）
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-19
Template: governance-index-v1 / 1.0.0

本页是第一阶段状态快照目录的当前导航：把读者送到 v1.0 冻结时点的六张状态表。六张表均为 historical snapshot——用于了解冻结时完成度，不是当前缺陷台账；上线后新发现问题以 pre-E2E 审计与修复卡为准。表中仍由源码与原始数据背书的资源/公式条目继续作为专题真值。

## 目的

- 索引 v1.0 冻结时点（feature-status 2026-06-16、cutscene-status 2026-06-07 等）的功能/opcode/过场/物品/仙术/资源状态表；防止把冻结快照误读为当前缺陷台账，同时保住源数据背书条目的专题真值地位。

## 范围

- 当前包含：六张状态表——[cutscene-status](cutscene-status.md)（507 段演出）、[feature-status](feature-status.md)（玩家可感知功能 14 章）、[item-status](item-status.md)（235 物品）、[magic-status](magic-status.md)（102 仙术）、[opcode-status](opcode-status.md)（164 opcode 全集）、[resource-status](resource-status.md)（MKF/非 MKF 逐 chunk）。
- 明确不包含：当前缺陷台账、runtime/E2E/视觉/coverage 结论和未复核的实现状态。

## 当前状态

- `status`: current（仅指导航）；被索引的六张表为 historical snapshot（各自冻结日期见表内）。
- `lastReviewed`: 2026-10-19

## 入口与责任

- canonical 入口：本页 + 六张状态表；当前缺陷与修复以 pre-E2E 审计和修复任务卡为准。
- Owner：Codex（文档治理；不代签原执行）。
- 下游使用者：phase1 历史完成度追溯、资源/公式专题真值引用。

## 证据与下一步

- 关键来源：固定源 revision `642dd483`（保全节全量 pin）；原始类型声明「historical snapshot」与专题真值规则在 quote 保全。
- 未决/阻塞：无。
- 下一步：引用表内条目时带冻结日期；当前事实以现行代码、测试与新审计复核。

## 历史范围

- phase1/status 目录；v1.0 冻结快照集（feature 2026-06-16、cutscene 2026-06-07 等）；固定来源与 source SHA 见下方保全节。

## 原始结论

- 目录自述「类型：historical snapshot——用于了解冻结时完成度，不是当前缺陷台账」；资源/公式条目按源码与原始数据背书继续作专题真值。

## 当时证据

- 六张状态表入口与类型声明在 quote 保全。

## 当前有效性

- 导航 current（仅指导航）；六表为 historical 冻结快照，当前缺陷以 pre-E2E 审计与修复卡为准。

## 继任文档

- pre-E2E 审计与修复任务卡；现行代码与测试。

## 原文保全

固定源 revision `642dd483f0d6b982d5f074553a129bce374ffad5`，source SHA `2dc16fcb09bb80cceca8708bd129052ba51778e29cfa91037fbb61d87d8254cd`；下方 quote 逆回读规则：直接逆回多 1B；精确排除 end 标记前恰一个未引用分隔 LF 后与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # docs/phase1/status/ — 第一阶段覆盖快照
>
> v1.0 冻结时点的功能 / opcode / 过场 / 物品 / 仙术 / 资源状态表（feature-status
> 2026-06-16、cutscene-status 2026-06-07 等）。**类型：historical snapshot**——用于了解
> 冻结时完成度，不是当前缺陷台账；上线后新发现问题以
> [pre-E2E 审计](../../ops/audits/pre-e2e/summary.md) 与修复卡为准。表中仍由源码与原始
> 数据背书的资源/公式条目继续作为专题真值。
>
> ## 目录文件索引
>
> - [cutscene-status.md](cutscene-status.md)
> - [feature-status.md](feature-status.md)
> - [item-status.md](item-status.md)
> - [magic-status.md](magic-status.md)
> - [opcode-status.md](opcode-status.md)
> - [resource-status.md](resource-status.md)

<!-- original-source-quote:end -->
