# REFORGE-SAVE-CURSOR-IDENTITY-1 — 读档时自动游标的等义比较

Status: draft
Phase: phase2
Owner: Codex
Last reviewed: 2026-11-27
Template: task-card-v1 / 1.0.0

## 目标

核定 SAVE12 中场景现场与世界状态的两份自动游标如何判等。当前归一化把 JSON 对象字段的写入顺序也算作身份，可能拒绝字段和内容都相同的载荷。

## 范围

仅登记 `normalizeCurrentSave` 对 `sceneRuntime[scene].automatic[id].cursor` 的合同。保持现行版本、保存字段、脚本身份和恢复前验证流程。产品修改涉及存档读取边界，等待相应 Owner 和有限准入。

## 前提与证据

同一合法工程、角色世界、场景和自动行为提供两份等值游标。按现行 builder 生成的载荷通过结构校验及归一化。只改变保存的场景游标内 `behavior/at` 及 `kind/stage` 的字段插入顺序，结构校验依然通过，正式 codec 拒绝并报“自动脚本续跑身份不一致”。后续 `runtime-script-project.ts` 的 `sameBehaviorCursor` 已有按字段比较。普通玩法生成的双份游标来自同一运行态，尚未实证它会产生不同字段顺序。

[窗口执行归档](../evidence/QUALITY-REFORGE-SCENE-OWNERSHIP-1.tar.gz) 的 `window/save-and-motion/runs/codec-order-probe/` 保存实际命令和输出。

## 验收

准入后确定同值不同顺序的行为。若采用当前续跑的字段判等，保留摘要、指令顺序、阶段和控制值改变时拒绝的 oracle。在正式读取链先复现失败再改，复验 codec、宿主预检和受影响的 E2E 来源。

## 状态与交接

现行 codec 保持 review。评审结论与本轮代码治理质量门分开。源入口为 [当前存档合同](../../phase2/specs/save-system.md#当前读档边界)与[本轮存档审查](QUALITY-REFORGE-SCENE-OWNERSHIP-1.md#存档与移动运行时)。
