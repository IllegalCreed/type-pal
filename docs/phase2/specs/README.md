# 第二阶段现行规范

Status: current
Owner: Codex
Last reviewed: 2026-11-04
Template: governance-index-v1 / 1.0.0

## 目的

设计、实现或审查二阶段能力时，从这里定位内容、编辑器、设计系统、工程生命周期、存档和脚本的现行合同。

## 范围

规范正文维护字段与版本；历史推导和旧版本在[归档](../archive/README.md)，具体操作在[指南](../guides/README.md)。本页只路由，不复制模型。

## 当前状态

本页是现行规范入口。规范存在不证明实现符合、缺陷已修或产品通过；发现差异须核具体来源与适用版本，写回对应任务。

## 入口与责任

| 要核什么 | 下一跳 |
|---|---|
| 内容工程字段与格式 | [内容工程当前格式](content-schema.md) |
| 编辑器职责、结构与工作台 | [编辑器架构与工作台合同](editor-architecture.md) |
| 编辑器视觉、组件与交互 | [设计系统与交互规范](editor-design-system.md)为唯一设计规范入口；实施前同步读[UI开工与验收流程](editor-architecture.md#编辑器ui开工与验收) |
| 工程、目录与工作区生命周期 | [工程与工作区生命周期](project-lifecycle.md) |
| 持久状态、保存与读取 | [当前存档合同](save-system.md) |
| 作者脚本语义与运行时接口 | [作者脚本与运行时合同](script-system.md) |

各正文维护对应合同，Codex维护本层路由。阶段方针与其他领域入口见[第二阶段首页](../README.md)。

## 证据与下一步

按实际变更进入对应规范，涉及schema/save切换须另核任务准入与验证，不能从目录标签取得执行信用。旧入口、治理流程和原文副本按需从[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/phase2/specs/README.md)恢复。
