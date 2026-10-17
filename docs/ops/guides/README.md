# 工程维护指南

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: guide-runbook-v1 / 1.0.0

本页把历史材料接入 `guide-runbook-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 目的

- 读者和完成后得到的结果：按当前 ops guide/runbook 完成 Current ops guide/runbook; preserve purpose, prerequisites, steps, failure handling, stop line and completion evidence.。

## 前置条件

- 权限、输入、版本和安全边界：以当前 AGENTS、ops workflow、任务卡和仓库入口为准。
- 当前执行前必须确认：工具、版本、数据路径、Owner 和用户授权。

## 步骤

1. 先读取当前入口、前置条件和本页适用范围。
2. 按步骤执行并把结果写回当前 task/evidence 入口。
3. 对失败、边界和人工接管保留可复核证据。

## 失败处理

- 可预期失败：- （无新增；历史边界保持开放）
- 停止线：follow current repository routes and ownership; do not use historical instructions as current authorization
- 回滚/人工接管：停止当前操作，保留日志并交当前 Owner 裁决。

## 完成定义

- 可观察的完成条件：步骤结果、证据路径、Owner 和下一步均已写回。
- 证据路径与复核人：本页、当前 task card、evidence receipt 和 Codex 独立复核。

## 历史范围

- phase2/lore archive；日期：undated；固定来源 `f4c664a8cf0dd564f68857b393861f553e35c73f`；source SHA `c27aeac40cb42c31f5c6d8d47e17a3bfffc6c666967f5385b9807cd51c0ec9aa。

## 原始结论

- 仅新增项目文档模型入口，其余工程指南入口保留；目录是导航，不承担 runbook 事实权。

## 当时证据

- 原始标题/章节/HTML artifact 在 quote 或 artifact envelope 中保全。

## 当前有效性

historical。follow current repository routes and ownership; do not use historical instructions as current authorization
- 历史冲突/未决：
- （无新增；历史边界保持开放）

## 继任文档

- Current AGENTS/ops workflow, task cards and current project evidence.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `c27aeac40cb42c31f5c6d8d47e17a3bfffc6c666967f5385b9807cd51c0ec9aa`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 工程维护指南
>
> 开发服务、浏览器验证和文档维护的操作方法。覆盖率及 E2E 的跨阶段合同统一放 docs/testing。
>
> 上级：[协作与工程维护](../README.md)。
>
> ## 文档与附件
>
> - [Kimi 浏览器实测操作手册](browser-verification.md)
> - [本地开发服务器 · 端口与启动命令](dev-servers.md)
> - [文档维护与自动检查](documentation.md)
> - [type-pal 文档模型](documentation-model.md)：操作路由、事实权、模板与写回闭环。

<!-- original-source-quote:end -->
