# 审计与修复依据

Status: current
Owner: Codex（导航维护）；对应任务Owner维护发现与修复
Last reviewed: 2026-11-02
Template: governance-index-v1 / 1.0.0

## 目的

查架构治理范围、逐文件代码审查或pre-E2E发现时，从这里进入原审计和实际修复依据。

## 范围

本页维护架构债、代码治理和pre-E2E的主题入口，不复制完成计数。任务授权与执行状态回[看板](../board.md)及[原卡](../cards/index.md)，执行原件从[证据入口](../evidence/README.md)定位。

## 当前状态

current只指导航。各账本与审计按自己的日期、候选和后继读取，不能用本页日期刷新旧行数、覆盖率或批次状态；只读发现不等于修复，旧done不代表全程序通过。

## 入口与责任

| 要判断什么 | 下一跳 |
|---|---|
| 架构队列、模块拆分与所有权 | [架构债与分批治理](architecture-debt.md) |
| 代码治理路线与模块范围 | [代码质量治理总纲](code-quality-governance.md) |
| 哪些文件已核、哪些仍待核 | [逐文件代码账本](code-quality-file-ledger.md) |
| 两阶段pre-E2E缺陷、疑点与可选优化 | [pre-E2E入口](pre-e2e/README.md) |
| 发现是否已有有限修复与后继回执 | [pre-E2E修复总览](pre-e2e/summary.md) |
| 追溯已归档报告 | [任务历史归档](../archive/README.md) |

Codex维护导航；审计作者对读取范围负责，修复Owner对合法输入、反例、验证与回写负责。实施与验收遵守[现行工作流](../../engineering/guides/agent-workflow.md)和相应质量合同，本目录不另造规范。

## 证据与下一步

发现冲突时记录具体path、候选和claim，回原审计或任务修正；保留来源SHA、历史日期、失败与撤回。失效链接先查显式迁移和后继，不直接删除历史材料。

旧分类、治理说明及原文可从[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/audits/README.md)恢复。新增审计按职责写回本入口和真实consumer；导航检查不替正文续验。上级：[任务与长期工作](../README.md)。
