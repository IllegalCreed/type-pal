# MIGRATION-STORE-COMMAND-SCAN-RETIREMENT-1 — 旧商店指令计数退役

Status: blocked
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

- `packages/migrate/src/pal-current-publication.ts:188–197` 的生产生成检查始终传空命令列表，返回的计数无人消费。
- 作者发布按实际内容解析各命令域，再运行统一引用校验。buy 引用检查由 `packages/content/src/command-target-reference.ts` 的 `openShop` 分支消费。源奖励与炼化由发布内存门另行检查。
- `packages/migrate/src/pal-store-boundary.ts` 的旧递归及其计数选项仍有专测。需要实际运行源/现行发布实验来界定可迁移的买卖断言。若能发现生产路径传入非空命令或读取计数，当前退役前提即不成立。

## 验收

用户产品裁决前保持现实现。若获准，保留原始奖励、材料和 20 家真实商店的产物约束；合法/非法买引用与卖出命令走现行 guard，保留原断言去向。各测试通过真实命令入口和实际内容形状复验。旧快照名称、计数和执行原件按旧提交保存。

## 状态与交接

2026-11-20 确认唯一生产调用传空。原始 Store0 与 1–20 的数据已核读。等待旧扫描接口退役裁决，其它已授权投影审查继续。
