# 文档治理入口

Status: current
Last reviewed: 2026-11-02
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

选择文档模板、核审查身份或排查跨阶段事实权时，从这里进入治理合同和对应记录；日常内容阅读从[文档总入口](../README.md)选领域。

## 范围

本目录维护全docs的模板、路由、文档注册与深审记录。任务状态取原任务卡，测试状态取testing catalog，治理registry不能替代它们；日志、raw、截图等仍按产生者和任务登记归属。

## 当前状态

[全量治理母卡](../tasks/cards/DOCS-FULL-TEMPLATE-1.md)已done并完成主线收口（[PR39](https://github.com/IllegalCreed/type-pal/pull/39)）。旧R波撤信及返工原件仍保留，不能用后继完成恢复被撤回的历史信用。后续新增、修改和清理继续按长期合同逐批验收。

## 入口与责任

| 要做什么 | 下一跳 |
|---|---|
| 定位置、事实权和写回路径 | [文档模型](../engineering/guides/documentation-model.md) |
| 交付正文或独立验收证据 | [文档质量合同](../engineering/guides/document-quality.md) |
| 选类型、模板与原生格式 | [模板入口](templates/README.md) |
| 核文档分类、审查范围与SHA | [注册表](document-registry.json)、[审查记录](reviews/README.md) |
| 查阶段/状态投影或阶段依赖冲突 | [阶段索引](by-phase.md)、[状态索引](by-status.md)、[阶段catalog](catalog.json)、[真值矩阵](cross-phase-matrix.md) |
| 核当前AGENTS路由、文件位置与本轮变更 | [当前迁移合同](document-locations.json)；[routing](routing.json)保留原接受身份与历史路由 |
| 查全量治理的最终范围、历史counter与原件 | [母卡](../tasks/cards/DOCS-FULL-TEMPLATE-1.md)、[证据入口](../tasks/evidence/DOCS-FULL-TEMPLATE-1/README.md) |

Codex负责中央接入和独立裁定；贡献者在获准范围交付，不自授接受。生成投影只表达已登记范围，不扩大证据结论。

## 证据与下一步

需要追溯入口旧rework表述时读取[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/phase-governance/README.md)；当前完成依据回母卡最终验收。新增差异进入自己的任务和review，静态治理不授runtime、E2E、视觉或coverage信用。
