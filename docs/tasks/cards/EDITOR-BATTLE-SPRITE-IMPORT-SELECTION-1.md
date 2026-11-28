# EDITOR-BATTLE-SPRITE-IMPORT-SELECTION-1 — 战斗精灵导入只应用最后选择

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0
Visual Verification Timing: functional

## 目标

让最后选择的图片决定工作台预览和提交的帧源。

## 范围

战斗精灵库和敌人预览共用的 `BattleSpriteUploader`。以输出的真实帧源和失败提示核对图片归属。

## 前提与证据

用真实 PNG 先选一帧 8×8，再选两帧 12×12。第二张先完成并显示两帧。第一张解码迟到后，实际交付压缩容器解出一帧 8×8。最后选择失败时，另一条反例发现旧预览仍可提交。

## 验收

更新后的上传器只接收当前选择的解码结果。读新图开始时撤下旧帧带，失败保留提示，结束后不再接收过期结果。在真实 PNG、Canvas 和解码帧上复验两例，连同战斗库与敌人预览共 22 项通过，stderr 为空。红绿原件和统一门由[本轮治理卡](QUALITY-EDITOR-COMBAT-SPRITE-PREVIEWS-1.md)收存。

## 状态与交接

2026-11-28 用户裁定只应用最后选择的图片，Codex build allowed。两条正式失败回归及相邻入口的 22 项已通过，集中门见治理窗口。
