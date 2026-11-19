# REFORGE-FRAME-SEQUENCE-INVALIDATION-1 — 过场素材换版后旧解码重写缓存

Status: draft
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: 修复后在编辑器素材复读入口核新版像素

## 目标

核清过场帧缓存失效后，旧异步解码与新素材版本的所有权。保留相同 AssetId 的正常替换。

## 范围

仅取证。`frame-animation-player.ts` 的 `FrameSequenceReader.invalidate` 现由 `FrameAnimationEditor.tsx` 在资源身份改变后执行，并复用惰性帧读取器。Runtime 的一次工程载入使用单一 reader。未变更产品、资源格式、Assets 协议或 E2E。

## 前提与证据

用 `encodeFrameSequence` 和真实 deflate 解码构造相同稳定资产 ID 的两个合法版本。先等旧任务进入解码阻塞，再失效并提交新像素 9。释放旧任务后，下一次同资产读取返回旧像素 1。定向反例唯一失败，原十八项通过。可稳定复现读侧组件竞态；编辑器完整页面上的普通用户路径尚未运行。

## 验收

[单一执行归档](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 的 `frame-sequence-invalidation.witness.test.ts`、`reforge-frame-invalidation-witness/` 和 `reforge-frame-playback-receipt.json` 固定原件。后续确认旧请求自身仍可收到原字节，新版本的缓存不被覆盖；有失效前尚未进入 inflate 和已进入 inflate 两个时序面。产品取舍确认后，将反例纳入正式专测，再修缓存归属，观察同 id 换版后的像素实图。

## 状态与交接

2026-11-19：已取真实像素与生产 reader 失败证据；产品保持 review，未进入 build。
