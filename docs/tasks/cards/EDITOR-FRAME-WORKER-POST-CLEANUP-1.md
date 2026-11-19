# EDITOR-FRAME-WORKER-POST-CLEANUP-1 — 过场编码发送失败后的 Worker 释放

Status: draft
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

核清帧动画编码和调色请求在宿主同步拒绝发送时的释放归属。

## 范围

只读取证。`frame-animation-worker-client.ts` 的两个生产入口由 `CutsceneTab.tsx` 和 `FrameAnimationEditor.tsx` 调用。构造 Worker 成功后当前请求独占它；正常结果、Worker 错误及消息内错误会释放。无 Worker 时直接走同一个纯解码或调色内核。

## 前提与证据

在两个真实入口使用抛出同一 `OperationError` 的测试宿主，编码与调色各拒绝一次且均传播原错误，但两次均无 `terminate()`。实测是宿主失败注入；尚未查证真实浏览器或普通编辑能进入此路径。未改变宿主错误提示、取消行为、帧格式或公开接口。

## 验收

[单一执行归档](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 的 `editor-frame-worker-post-observation.mts` 和 `runs/editor-frame-worker-post-observation/` 固定实测。后续先核真实宿主可达的失败及旧错误语义，确定退出责任，再补正式定向失败回归。

## 状态与交接

2026-11-19：已复现测试宿主失败时不释放。产品文件保持 review，未进入 build。
