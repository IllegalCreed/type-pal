# 已取消任务

Status: current
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-18
Template: governance-index-v1 / 1.0.0

本页是已取消归档任务的当前导航：定位卡顶部终态为 cancelled 的历史任务卡。取消理由、当时范围与替代任务从原卡及统一索引追溯；本页是 ops 导航页，不是任务卡，也不承担任何历史任务（包括 phase1 计划）的目标验收。

## 目的

- 定位已取消的归档任务卡；取消理由与替代任务见原卡及统一索引，不因归档而恢复旧方案。

## 范围

- 当前包含：本目录内卡顶部状态 cancelled 的任务入口，以及统一索引「已取消（superseded / historical）」分组的导航。
- 明确不包含：恢复旧方案或旧 build 授权；本页不是任务卡或 phase1 计划正文，也不重述各卡的取消裁决与替代项。

## 当前状态

- `status`: current（仅指导航）；目标卡保持 cancelled/historical 终态，取消决定不变。
- 2026-10-17 R32 曾把本页误绑 task-card-v1、phase1 与 `Status: cancelled`，属可复核的类型/phase/状态错误；2026-10-18 S13 逐篇治理将本页纠正回 ops 导航页，该错误与原源保真分别记录，不沿用 R32 旧审阅信用。重新考虑某项取消必须按当前规范创建新任务卡并核前提，不由本页 current 恢复执行。

## 入口与责任

- 父导航：[历史任务](../README.md)。
- 统一索引「已取消（superseded / historical）」分组：[统一任务索引](../../../tasks/index.md)；当前操作入口另有[任务卡说明](../../../tasks/README.md)、[活动看板](../../../board.md)与[协作流程](../../../agent-workflow.md)。
- Owner：Codex（文档治理）。统一索引中各取消卡说明列来自生成器 config 的固定摘要，不替代原卡内的取消裁决与替代项。

## 证据与下一步

- 关键来源：本页固定原源 revision `dce008a777bb45658e9d7a146624db9b57469f63`（258B/7LF，source SHA `a3d28f030ea60b18f34caedf6fb9416a5b1f568020c4a113ef089e142fb2cf2d`，逆回读规则见下方保全节）。R32 的类型/phase/状态错误已在本轮纠正并分别记录；其余取消卡的逐卡语义未随本页重审。
- 未决/阻塞：本页纠正不重授任何取消卡语义完成，也不把任何取消任务变为 current/build。
- 下一步：如需恢复被取消的工作，创建新任务卡读取当前 primary source、oracle 与用户裁决；本页与 quote 均不构成恢复授权。

### 原文保全

固定源 revision `dce008a777bb45658e9d7a146624db9b57469f63`，source SHA `a3d28f030ea60b18f34caedf6fb9416a5b1f568020c4a113ef089e142fb2cf2d`；下方 quote 逐行移除 `> ` 或空行裸 `>` 后得到 259B，end 标记前另有一条未加 `>` 的独立分隔 LF——精确排除这一个分隔 LF 后等于 258B 原源。不 trim、不做通用字符替换，不声称无条件直接逆回相等。
<!-- original-source-quote:start -->
> # 已取消任务
>
> 这里只保存顶部状态为 cancelled 的任务卡。取消理由与替代任务见原卡及总索引，不因归档而恢复旧方案。
>
> 上级：[历史任务](../README.md)。
>
> [打开统一任务索引](../../../tasks/index.md)。

<!-- original-source-quote:end -->
