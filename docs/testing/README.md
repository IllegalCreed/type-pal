# 跨阶段测试与验证

Status: current
Owner: Codex
Last reviewed: 2026-11-02
Template: governance-index-v1 / 1.0.0

## 目的

编写、审查或查找测试证据时，从这里进入对应合同、工程域或E2E记录，避免先读全部历史批次。

## 范围

本目录包含测试治理、catalog、领域报告、E2E、模板和历史证据。测试质量与覆盖率、运行结果、视觉验收分别判断，不能互相替代。

## 当前状态

本页是现行导航；[catalog](catalog.json)维护稳定ID、canonical路径、证据、依赖和状态，报告/evidence说明实际执行范围。本页不复制各批次的通过数、counter或待办，不授新的runtime、E2E、视觉或coverage信用。

## 入口与责任

| 要做什么 | 下一跳 |
|---|---|
| 写、改或审查测试 | [测试治理](governance.md) |
| 按阶段、状态、标签或Owner找记录 | [多维索引](indexes/README.md) |
| 核运行时、编辑器、内容等模块合同与证据 | [工程域记录](domains/README.md) |
| 执行剧情链、检查点或录像验证 | [E2E合同](e2e/contract.md)、[E2E专项入口](e2e/README.md) |
| 新建测试报告、阶段页或机器证据 | [模板](_templates/README.md) |
| 查迁移记录、旧批次与历史审查 | [历史归档](archive/README.md) |
| 核机器索引及旧平面路径的迁移归属 | [catalog](catalog.json)、[legacy登记](legacy-flat.json)、[分类账](legacy-flat-classification.json) |

新报告按治理合同进入canonical领域，不继续堆在testing根目录。Codex维护catalog与生成索引，贡献者按任务范围交付正文和配对证据。上级：[文档总入口](../README.md)。

## 证据与下一步

沿任务进入对应报告与原始证据；需追溯旧平面导航时读取[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/testing/README.md)，历史文件仍由归档与catalog定位。目录精简不删除原报告、不改变测试状态；legacy退役须另核实际consumer与接替映射。
