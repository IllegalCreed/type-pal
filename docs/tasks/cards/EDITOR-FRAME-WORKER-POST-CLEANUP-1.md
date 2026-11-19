# EDITOR-FRAME-WORKER-POST-CLEANUP-1 — 过场编码发送失败后的 Worker 释放

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
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

本轮 Codex build allowed。两个编辑器入口构造出的 Worker 均由单次请求持有。编码、量化分别补宿主发送失败的回归，原异常继续传播并确保 Worker 被释放。复核现有复制、消息身份和失败路径。

2026-11-19：已复现测试宿主失败时不释放。产品文件保持 review，未进入 build。

### 本轮验收

两入口共用单次 Worker 的消息身份与结束处理。发送同步失败先终止 Worker，再把同一异常对象交给调用者。两条宿主发送反例已转绿，实际 Chrome 的 Vite Worker 也完成真实 TPFS 编码。同步发送拒绝仍是测试宿主注入的异常路径。 逐文件复核、反例及实际命令见[本轮统一原件](../evidence/QUALITY-CONTENT-ASSET-REVIEW-CLOSEOUT.tar.gz)。发布结果取受保护 PR 的实际作业。
