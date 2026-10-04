---
testingSchema: 2
id: runtime-world-owners
evidence: domains/runtime/world/world-runtime/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-world-owners","sourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"413-424","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"8470d3bad27fca3c4d116fc309dc021690d441e8f776982c2a9000e6e71b6374"},{"path":"packages/reforge/src/world-motion-runtime.ts","lines":"145-168","anchor":"export class WorldMotionRuntime","role":"contract","sha256":"d32aa7d4c92bd18342fdd3a508c575834d706d2b6bffdaa04c3d555ae6cbbb6b"},{"path":"packages/reforge/src/world-scene-presentation.ts","lines":"71-88","anchor":"export class WorldScenePresentation","role":"contract","sha256":"708a17ca1c63fc18f636f2a5911b436c70d68df5b35af93c994f1599b090f205"},{"path":"packages/reforge/src/world-motion-runtime.test.ts","lines":"7-30","anchor":"describe('WorldMotionRuntime ownership'","role":"oracle","sha256":"51076a037f665a57d472ada1af68e91eb8dc08fef3a6619222e507f5d534bbe1"},{"path":"packages/reforge/src/world-scene-presentation.test.ts","lines":"82-105","anchor":"describe('WorldScenePresentation sprite ownership'","role":"oracle","sha256":"f2130f0547be77347d41e8d0548b8a6e62c956dbdae80e8fe168f424e6568a9e"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"375a1d94b6f6bdc79ea104a4d76744e96da5d7c70f866af8e71a8c0c1be6d5df"}],"publicCallers":["bootGame → WorldMotionRuntime + WorldScenePresentation","advanceMoves → canonical endpoint/live position/touch","render → scene presentation snapshot"],"legalInputs":["当前 scene session/authority/runner lineage","production MotionRuntimeCoordinator 与合法 GridPos","typed scene/renderer draw snapshot"],"businessOracle":{"type":"runtime-world-owners","assertions":["endpoint 先落 canonical，live 提交后 touch，再唤醒 continuation","party/实体取消释放监听器与 waiter","每帧自身锚点与 frame priority/shake/wave 保留"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/architecture-continuation-integration.md","domains/runtime/world/world-runtime/history/report.md"],"notes":"MotionRuntimeCoordinator 仍拥有 authority/slot；WorldMotionRuntime 管外围节拍和生命周期。ActiveScene 拥有资源、presentation 拥有绘制状态，不能把两份报告重复算整场景 E2E。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/runtime/world/world-runtime/evidence.json"}
-->

# 世界移动提交与绘制状态所有权

## 复核范围与结论

旧正文中的不合 main/未统一门仅为候选时点；当前由 unified integration 收口。未读取 console 的原最小功能过程保持未证，不倒填 console 零错误；完整剧情观感仍另归 E2E。

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## 真实 caller、输入与业务 oracle

- `packages/reforge/src/main.ts:413-424`（caller；anchor `const motion = new WorldMotionRuntime`）
- `packages/reforge/src/world-motion-runtime.ts:145-168`（contract；anchor `export class WorldMotionRuntime`）
- `packages/reforge/src/world-scene-presentation.ts:71-88`（contract；anchor `export class WorldScenePresentation`）
- `packages/reforge/src/world-motion-runtime.test.ts:7-30`（oracle；anchor `describe('WorldMotionRuntime ownership'`）
- `packages/reforge/src/world-scene-presentation.test.ts:82-105`（oracle；anchor `describe('WorldScenePresentation sprite ownership'`）

公开调用链：bootGame → WorldMotionRuntime + WorldScenePresentation；advanceMoves → canonical endpoint/live position/touch；render → scene presentation snapshot。合法输入：当前 scene session/authority/runner lineage；production MotionRuntimeCoordinator 与合法 GridPos；typed scene/renderer draw snapshot。

业务判据：endpoint 先落 canonical，live 提交后 touch，再唤醒 continuation；party/实体取消释放监听器与 waiter；每帧自身锚点与 frame priority/shake/wave 保留。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

MotionRuntimeCoordinator 仍拥有 authority/slot；WorldMotionRuntime 管外围节拍和生命周期。ActiveScene 拥有资源、presentation 拥有绘制状态，不能把两份报告重复算整场景 E2E。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 d02278dc0154dd73b5db24388a35c30bb096cc81，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
