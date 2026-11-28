# EDITOR-WORLD-SPRITE-IMPORT-LAYOUT-1 — 精灵导入只提供现行布局

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0
Visual Verification Timing: functional

## 目标

确保导入向导提供的初始用途能通过当前工程重开。全局定义保存行走或默认定格，循环取自预制动作。

## 范围

导入控件、初始布局推导、原专测与现行作者文档。历史工程修复与运行时布局类型退役由各自合同持有。

## 前提与证据

合法 PNG 经真实向导从空白工程提交。选择旧「自动循环」时提交成功，现行序列化能写出该定义，`loadCurrentProjectFrom` 按 `validateSprites` 拒绝 `layout.kind = loop`。正式反例为 `world-sprite-authorable-layout-reopen-red`。更早的单独保存前检查通过，不能证明可重开。

## 验收

用同一合法图集走遍向导提供的选项，分别序列化和重开。原专测按当前布局保持尺寸、帧序、草稿恢复及错误断言。未包括历史工程修复或共享运行时布局类型退役。执行原件归[治理窗口](QUALITY-EDITOR-COMBAT-SPRITE-PREVIEWS-1.md)。

## 状态与交接

2026-11-28 用户批准从导入向导移除旧选项，保留四向行走、默认定格与现有预制动作入口。Codex build allowed。两种现行布局已从真实界面导入、序列化并重开，布局及资产绑定一致。向导布局、登记、生命周期和换选专测集中 45 项通过。

普通图集按固定方向顺序保留额外源帧，当前定义以首帧站立。
