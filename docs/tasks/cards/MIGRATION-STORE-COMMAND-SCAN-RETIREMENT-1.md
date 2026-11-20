# MIGRATION-STORE-COMMAND-SCAN-RETIREMENT-1 — 旧商店指令计数退役

Status: done
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

核清 PAL 供应模块为何仍携带剧本买卖指令计数、重复递归与计数参数。当前发布保留实际商店的来源货单、源 Store0 奖励、炼蛊壶和灵葫约束。验证真实作者商店引用留在统一命令校验入口。

## 范围

当前 PAL 发布及其商店和奖励来源断言，另核实际买卖引用守卫与旧计数专测。

## 前提与证据

- 基点 `packages/migrate/src/pal-current-publication.ts:188–197` 的生产生成检查始终传空命令列表，返回的计数无人消费。
- 作者发布按实际内容解析各命令域，再运行统一引用校验。buy 引用检查由 `packages/content/src/command-target-reference.ts` 的 `openShop` 分支消费。源奖励与炼化由发布内存门另行检查。
- 基点 `packages/migrate/src/pal-store-boundary.ts` 的递归及计数选项仅服务专测。生产路径传入非空命令或读取计数的证据可推翻退役前提。

## 验收

保留原始奖励、材料和 20 家真实商店的产物约束。买引用与卖出命令走 Content 的命令及引用校验。已退役断言的有效合同逐条定位，旧快照名称和计数可从基点恢复。

## 状态与交接

2026-11-20 用户批准退役。已删除仅测试使用的扫描参数、计数回执和重复递归。固定来源 Store0、按序奖励、炼化和 1–20 店货单继续从真实发布与专测约束。定向迁移与 Content 引用相邻通过。原件、候选身份和测试合同去向见[现行窗口](QUALITY-REFORGE-PRESENTATION-1.md#上一窗口的-review)。本卡局部验收完成，集中门与合并取窗口卡的执行回执。
