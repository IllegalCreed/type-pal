---
testingSchema: 2
id: runtime-world-owners
evidence: domains/runtime/world/world-runtime/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-world-owners","sourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"434-445","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"089fd2bf41c03eccf02846ddaa314cbfabe22772f8334bb0fe9b16f494c2a260"},{"path":"packages/reforge/src/world-motion-runtime.ts","lines":"167-193","anchor":"export class WorldMotionRuntime","role":"contract","sha256":"a4088a8995b861377e03e98736ee8992fa018c57b031f377897fc9885dbdb2a6"},{"path":"packages/reforge/src/world-scene-presentation.ts","lines":"71-88","anchor":"export class WorldScenePresentation","role":"contract","sha256":"e6edaddf9e78747a11e409f6058d6f3014f169b799cda182a225827cc700efa0"},{"path":"packages/reforge/src/world-motion-runtime.test.ts","lines":"7-30","anchor":"describe('WorldMotionRuntime ownership'","role":"oracle","sha256":"2c8cf4c66b8e685b2a60abe43cf3bc55ce542f4e8dd8745987243cea26913559"},{"path":"packages/reforge/src/world-scene-presentation.test.ts","lines":"82-105","anchor":"describe('WorldScenePresentation sprite ownership'","role":"oracle","sha256":"0925a2b288cab4ba75f054c6880845e5ef800d80ba07d8dc2bd04c5dc8f716cd"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["bootGame → WorldMotionRuntime + WorldScenePresentation","advanceMoves → canonical endpoint/live position/touch","render → scene presentation snapshot"],"legalInputs":["当前 scene session/authority/runner lineage","production MotionRuntimeCoordinator 与合法 GridPos","typed scene/renderer draw snapshot"],"businessOracle":{"type":"runtime-world-owners","assertions":["endpoint 先落 canonical，live 提交后 touch，再唤醒 continuation","party/实体取消释放监听器与 waiter","每帧自身锚点与 frame priority/shake/wave 保留"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/runtime/world/world-runtime/history/report.md"],"notes":"MotionRuntimeCoordinator 仍拥有 authority/slot；WorldMotionRuntime 管外围节拍和生命周期。ActiveScene 拥有资源、presentation 拥有绘制状态，不能把两份报告重复算整场景 E2E。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/runtime/world/world-runtime/evidence.json"}
-->

# 世界移动提交与绘制状态所有权

Owner: Codex
Status: current（source/publication；未新增动态验收）
Last reviewed: 2026-10-15
Template: test-domain-report-v1 / 1.0.0

## Domain scope

本报告范围为phase2/reforge。WorldMotionRuntime管外围节拍/生命周期，MotionRuntimeCoordinator管authority/slot，presentation管绘制；不能与ActiveScene重复计整场景E2E。
原revision、candidate与content/SAVE版本保持各次出版/执行范围；本次只迁移正文并修正文中已漂移的导航锚点。

### 复核范围与结论

旧正文中的不合 main/未统一门仅为候选时点；当前由 unified integration 收口。未读取 console 的原最小功能过程保持未证，不倒填 console 零错误；完整剧情观感仍另归 E2E。

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## Claim matrix

以下为原业务合同的义务投影，source-backed和静态接线不转为本次runtime-backed。

| 合同义务 | 一手范围 | 本次判定边界 |
|---|---|---|
| canonical endpoint→live position→touch→continuation顺序 | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |
| 替换/取消释放相应waiter/listener | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |
| 每帧锚点/priority/shake/wave与实际绘制帧分开观察 | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |

## Inputs and fixtures

输入仍限原typed/caller域，不造产品外fixture或改旧测试；每个sourceRef的当前hash/行号由真实配对consumer核验。
原正文列表中旧行号仅做下列有源更正，源Git blob与回执保留before→after，不改原业务结论。

### 真实 caller、输入与业务 oracle

- `packages/reforge/src/main.ts:434-445`（caller；anchor `const motion = new WorldMotionRuntime`）
- `packages/reforge/src/world-motion-runtime.ts:167-193`（contract；anchor `export class WorldMotionRuntime`）
- `packages/reforge/src/world-scene-presentation.ts:71-88`（contract；anchor `export class WorldScenePresentation`）
- `packages/reforge/src/world-motion-runtime.test.ts:7-30`（oracle；anchor `describe('WorldMotionRuntime ownership'`）
- `packages/reforge/src/world-scene-presentation.test.ts:82-105`（oracle；anchor `describe('WorldScenePresentation sprite ownership'`）

公开调用链：bootGame → WorldMotionRuntime + WorldScenePresentation；advanceMoves → canonical endpoint/live position/touch；render → scene presentation snapshot。合法输入：当前 scene session/authority/runner lineage；production MotionRuntimeCoordinator 与合法 GridPos；typed scene/renderer draw snapshot。

业务判据：endpoint 先落 canonical，live 提交后 touch，再唤醒 continuation；party/实体取消释放监听器与 waiter；每帧自身锚点与 frame priority/shake/wave 保留。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## Results and gaps

- 旧最小浏览器未读取console，不倒填console零错误；119项定向记录属于原主任务，不代替本报告整体验收。
- save capture/restore、离场恢复与完整剧情另须真实任务证据；暂态命令frame不是实际renderer选帧。

原content22/minimumSave11为10-04出版revision，现行源常量content22/minimumSave12单列；源核读刷新不升级旧实跑。

### 排重和处理理由

MotionRuntimeCoordinator 仍拥有 authority/slot；WorldMotionRuntime 管外围节拍和生命周期。ActiveScene 拥有资源、presentation 拥有绘制状态，不能把两份报告重复算整场景 E2E。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。


### 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；2026-10-04 核读内容22/保存11，历史内容20/保存8不升级；本次 SAVE12 源核验范围见页首。

2026-10-04：基线 d02278dc0154dd73b5db24388a35c30bb096cc81，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。

### 历次核读记录（原日期与范围）

以下日期段按原文保留；其中“当前”“本轮”指各原段落时点，不作为今天新执行或演出验收。


2026-10-10 当前源码核读：重新读取 WorldMotionRuntime / presentation 真实 bootGame 接线。ride 的 preserveFacing 仅属于暂态 slot，不进入 save schema；同 script authority 下的单步 gait 保留至显式 release/pose/收尾边界。119 项当前定向 native/author/runtime 检查见主任务卡，不替代本报告的历史整体验收。



2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核 main 的 canonical endpoint → live position → touch → deferred continuation 顺序，motion 的取消释放和 presentation 的定帧优先级。新增 captureEntity/restoreEntity 保存步态、显式动画与 move 节拍；旧 owner 测试不因此覆盖 SAVE12 保存/离场恢复。

2026-10-06：重新核读本页 sourceRefs 的实际 caller、合法输入及断言，并更新当前工作树的哈希/行号。此项只是源码证据刷新，不把历史执行升级为当前全量通过；本轮独立录制、帧差异与连续验收状态统一见 E2E-CONTINUOUS-001-006 任务卡。


## Quality gate

本批只运行文档合同/链接/索引、source SHA、真实publication配对与全仓静态门；产品、旧测试、coverage只读。
原warnings、counter、缺raw、视觉/console限制均保留。后续质量或动态任务须独立核caller、合法输入、oracle与有效反控，
不能由模板或publication绿色替代；当前已核的source refs不是整个实现或旧测试质量的重新accept。
