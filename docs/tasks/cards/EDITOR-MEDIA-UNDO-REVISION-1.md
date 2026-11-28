# EDITOR-MEDIA-UNDO-REVISION-1 — 替换素材时撤销字节的版本归属

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0

## 目标

保证编辑器撤销替换时恢复的资源记录、路径和字节属于同一版本，维持保存校验要求。

## 范围

起点为图片库的替换输入和 UpsertAssetCommand。检查其它媒体的替换与删除调用是否存在同样的版本错配，按真实入口分别复现。保持资源文件格式和存档格式。

## 前提与证据

在合法空白项目导入原立绘。两次替换同一资源，等第二次先写入后放行第一次的文件读取，再撤销一次。元数据恢复到第二次替换，写回该路径的字节却仍是原立绘，实际 SHA 为 `2817c8f264b1ba439f7994a400e3b0dd3dc5f2aeac0ee353cd7eb54769bf5110`，记录要求 `1b6526b37c055050c10e00984d7ea9ce50091135eb375b391ccf06c27aa0f424`。正式替换输入、真实会话和命令均参与执行。只延迟了文件读取。

回执与失败测试原件由[媒体治理父卡](QUALITY-EDITOR-PREVIEW-LIFECYCLES-1.md)的集中归档保管，执行名为 `image-replacement-ownership-red`。

## 验收

先按当前撤销和落盘义务核版本判定。使用真实图片输入或对应媒体入口，比较撤销后的实际字节 SHA 与记录，并通过现行保存校验。验证适用的磁盘源、会话尚未保存的源、单次替换、删除后重建及原引用阻断。

## 状态与交接

2026-11-28 用户批准修正撤销版本并核对相邻媒体入口。命令撤销优先恢复提交前的会话 Blob。原始资源只有磁盘字节时仍由预读字节物化。真实图片替换、图片删除、WAV 替换、视频替换先行四红，修复后的当时快照有 117 项媒体和帧动画相邻测试通过，输出零诊断。最终格式整理后的用例随父窗口冻结门执行。正式失败与恢复执行分别为 `media-undo-and-music-owner-business-red` 的四项字节断言和 `media-undo-revision-green`。组合执行另有一项 MIDI 音色库夹具路径不合规，独立修正夹具后才取得播放器的正式红例。同期 `asset-catalog-commands.test.ts` 核过磁盘原件恢复和引用阻断。
