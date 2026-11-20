# MIGRATION-ITEM-SCHEME-ORDINAL-1 — PAL 物品方案编号归属

Status: done
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

验证既有 PAL 发布审计对编号物品方案的归属判断。

## 范围

`pal-item-scheme-labels.ts` 的只读方案图。生产调用由 `validatePalCurrentPublication` 发起，沿用既有的 49 个方案和 11 个物品根。

## 前提与证据

| 来源 | 已核事实 |
|---|---|
| 原盘与第一阶段 | 第一阶段保存原始事件脚本。人读方案标签是第二阶段作者数据的约定。 |
| 已核项目约定 | [原物品方案任务](../archive/done/MIG-PAL-ITEM-SCHEME-LABEL-1-pal-item-scheme-author-labels.md)记录凤纹手绢采用无后缀首项和 2–13 的顺序编号。 |
| 基点实现 | `pal-item-scheme-labels.ts` 的 `isCanonicalTopLabel` 只接受 2–9 起始的后缀，10–19 落在识别范围之外。实际 PAL 发布对只改标签的三个合法作者场景给出两绿一红。 |
| 目标 | 对合法编号统一要求有物品根，错误携原来的方案位置。 |

最强替代解释是该来源由总数门覆盖，或是普通作者命名。保留全部 49 个现有方案，只加入一个没有物品引用的合法变体。普通名称通过，第 9 项因无根拒绝，第 10 项通过发布。三种输入只差标签。

## 验收

先复现正式发布失败断言，获准后聚焦同一编号语法。普通标签、带根的实际 13 项、其余来源图和发布相邻测试继续通过。产品修复须单独验证，由原始发布入口决定结果。

## 状态与交接

2026-11-20 在 PR #72 主线 `b3f6104561d77ba270f08a3a7f4535aa63513350` 实跑。单元与真实 PAL 发布各两绿一红。普通正式工程存在同形孤儿尚未证实。

用户批准统一编号语义。候选保留无后缀的首项，无前导零的十进制编号 2 及以上均走原归属校验。普通作者名称仍通过，无根 9 和 10 均凭实际位置拒绝。实际 49/11 原盘计数仍通过。原件与全仓门状态见[现行窗口](QUALITY-REFORGE-PRESENTATION-1.md#上一窗口的-review)。本卡局部验收完成，集中门与合并取窗口卡的执行回执。
