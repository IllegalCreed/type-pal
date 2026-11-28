# REFORGE-SAVE-CURSOR-IDENTITY-1 — 读档时自动游标的等义比较

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0

## 目标

核定 SAVE12 中场景现场与世界状态的两份自动游标如何判等。修复前的归一化把 JSON 对象字段的写入顺序也算作身份，可能拒绝字段和内容都相同的载荷。

## 范围

处理 `normalizeCurrentSave` 对 `sceneRuntime[scene].automatic[id].cursor` 的等义比较。实现范围限保存 codec、正式入口回归和受影响的当前规范。保存版本、字段、脚本身份及恢复前验证流程沿用现行合同。

## 前提与证据

修复前，同一合法工程、角色世界、场景和自动行为提供两份等值游标。按现行 builder 生成的载荷通过结构校验及归一化。只改变保存的场景游标内 `behavior/at` 及 `kind/stage` 的字段插入顺序，结构校验依然通过，正式 codec 拒绝并报“自动脚本续跑身份不一致”。后续 `runtime-script-project.ts` 的 `sameBehaviorCursor` 已有按字段比较。普通玩法生成的双份游标来自同一运行态，尚未实证它会产生不同字段顺序。

[窗口执行归档](../evidence/QUALITY-REFORGE-SCENE-OWNERSHIP-1.tar.gz) 的 `window/save-and-motion/runs/codec-order-probe/` 保存实际命令和输出。

## 验收

接受成员和值相同但对象字段顺序不同的游标。保留摘要、指令帧顺序、阶段、控制值或实际字段改变时的拒收。用真实自动 runner 与保存屏障生成游标，在正式 codec 先复现失败，再核恢复预检及受影响的 E2E 来源。

## 状态与交接

首次发现时，codec 登记为 review。来源为 [当前存档合同](../../phase2/specs/save-system.md#当前读档边界)与[原窗口存档审查](QUALITY-REFORGE-SCENE-OWNERSHIP-1.md#存档与移动运行时)。

2026-11-28 用户要求先解决上轮唯一留审，范围以此前披露的等义游标拒绝为准。Codex 单一 Coding Owner，build allowed。治理树基点 `da4aefb13497330d86b7d4d1b173c4b5649e566d`。已核活动看板、参考卡、两棵工作树和远端 PR。E2E 客栈采集器直接对 codec 取源，历史执行按原指纹解释。

## 本轮验收

正式入口的失败反例取自真实自动脚本与保存屏障。比较按 JSON 可保存的对象成员及数组原序进行。游标对象换序接受，摘要、行为、阶段、执行帧及控制值的实际变化仍拒收。定向 Reforge 7 文件 163 项，E2E 工具 3 文件 56 项，原始退出均为 0、stderr 为空。见[窗口归档与执行索引](QUALITY-EDITOR-AUTHOR-COMMANDS-1.md#逐文件验收)。普通剧情产生异序双份游标的可达性尚未实证。
