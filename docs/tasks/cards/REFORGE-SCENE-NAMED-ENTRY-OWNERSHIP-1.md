# REFORGE-SCENE-NAMED-ENTRY-OWNERSHIP-1 — 运行时只解析工程登记的命名落点

Status: draft
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: 仅校验错误分支；场景位置与朝向以确定性数据验收

## 目标

保证游戏与编辑器预览使用的运行时落点解析，在项目没有登记目标名称时按现有合同报缺失错误。

## 范围

当前仅取证。Reforge 的 `ScenePreparer.prepare` 与 Editor 的 `core/playback.ts` 调用同一个 `resolveSceneSpawn`。正式工程校验的命名落点取值已另行处理；不能拿它证明这个公开运行时入口会拒绝缺失目标。直接调用的反例不代表已完备校验的正常工程可以到达该分支。未改实现、作者格式、预览行为或存档。

## 前提与证据

带合法 `west` 落点的场景中，查找未登记的 `constructor` 时，普通对象的继承值绕过缺失检查，解析悄悄退回默认落点；实际登记同名数据时则正确解析。反例调用与两处宿主同一着陆解析函数，前者一红，后者一绿，未用 mock 代替解析。

## 验收

[单一执行归档](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 保存 `scene-transition-entry.witness.test.ts`、`reforge-scene-entry-ownership-witness/` 与逐文件收口索引。产品裁决后将反例纳入正式专测：未知落点要报已有错误，登记的同名落点与三种合法位置及朝向优先顺序保持原结果。

## 状态与交接

2026-11-19：实际解析入口红例已保存，产品保持 review。普通工程路径的可达性未确认。
