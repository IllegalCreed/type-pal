# REFORGE-FSA-URL-OWNERSHIP-1 — 本地工程的对象 URL 归属

Status: draft
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

在本地工程读取和释放交错时，仍能回收该来源分配的所有对象 URL。

## 范围

目前仅取证。`packages/reforge/src/fsa-source.ts` 的 `urlFor` 与 `dispose`，以及 `FileSource` 的资源合同。实际消费者包括 `AssetResolver.urlFor`、游戏显示与编辑器试玩；编辑器 `open-local.ts` 和 `load-play-project.ts` 持有取消或失败时的释放入口。HTTP source、资产文件和磁盘格式不在本卡范围。

## 前提与证据

同一合法相对路径的两个读取在文件句柄返回前同时挂起；当前分配两个浏览器对象 URL，缓存只记后一个，释放后第一个仍能读取。另一条路径在读取挂起时先释放，之后返回的对象 URL 仍能读取。两条反例没有模拟对象 URL API，也不把调用次数当回收证明；用真实 `URL.createObjectURL` 与 `fetch(blob:)` 观察能否读到资源，并在 `finally` 清理观测中分配的所有对象 URL。

## 验收

[原件归档](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 的 `browser-file-sources-transfer.json` 指向 `browser-file-sources-ownership-final/` 两条正式观测失败与同批十条绿结果。切换前先确认现有生产消费者有无重新使用已经释放的 FileSource、取消时应接收何种结果，再就实际合同确定红例。相邻读取、保存状态及试玩撤离同时验证，无需更改内容格式。

## 状态与交接

2026-11-19：两个反例均成立，本地来源产品保持 review，未改公开接口或实现。普通交互是否已触发泄漏尚未证实；已完成的串行释放和逐段取消测试仍保留。下一步按真实工程切换生命周期定界，不继承本轮其它源的验收信用。
