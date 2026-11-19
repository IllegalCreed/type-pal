# REFORGE-VIDEO-PLAY-RETRY-1 — 二阶段视频多次播放重试

Status: draft
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: 修复后在真实播放器使用失败、再失败、再开始的操作路径验收

## 目标

视频被浏览器拒绝播放后，只要重试提示仍在，就能再次点击并尝试播放。

## 范围

当前仅取证。`main.ts` 的 `playVideoAsset` 用当前工程资源目录解析地址，由启动和剧情演出共用 `video-player.ts`。第一阶段播放器的旧裁决不作为二阶段实现授权。不改 Host 协议、视频格式、资源管线、存档或 E2E。

## 前提与证据

实际二阶段 `playVideo` 与 JSDOM DOM，宿主 `HTMLMediaElement.play` 连续两次拒绝后允许运行。第一次点击后提示仍存在；第二次点击后宿主总调用仍为两次，应为三次。现行 `once` 监听已销毁且已有提示让拒绝分支不重新注册。测试模拟浏览器两次政策拒绝；不是设备实测回执。

## 验收

[单一执行归档](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 中 `video-player-retry.witness.test.ts`、`reforge-video-retry-witness/` 和 `reforge-video-receipt.json` 固定一项正式失败和同轮七项通过。若批准修复，将失败用例迁入正式专测，验证成功、失败、终止各自清理；重复跳过键的延迟回调另列生命周期检查，不以同一反例代替。

## 状态与交接

2026-11-19：取证完成；产品保持 review，未进入 build。独立的既有播放合同测试可按质量父卡收口。
