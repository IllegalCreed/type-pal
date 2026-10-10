---
testingSchema: 2
id: runtime-active-scene
evidence: domains/runtime/scene/active-scene/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-active-scene","sourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"407-414","anchor":"const activeScene = new ActiveScene","role":"caller","sha256":"089fd2bf41c03eccf02846ddaa314cbfabe22772f8334bb0fe9b16f494c2a260"},{"path":"packages/reforge/src/main.ts","lines":"448-455","anchor":"const cameraSession = new WorldCamera","role":"caller","sha256":"089fd2bf41c03eccf02846ddaa314cbfabe22772f8334bb0fe9b16f494c2a260"},{"path":"packages/reforge/src/active-scene.ts","lines":"65-94","anchor":"commit(plan:","role":"contract","sha256":"fedb0fb7963600a85120ec2cc9a1ee5fe901748ad9ff1eb58d7b97a7a52fbf44"},{"path":"packages/reforge/src/active-scene.test.ts","lines":"53-77","anchor":"test('next scene clears old actions","role":"oracle","sha256":"ec3ea1276432a68cdf8110109d5c98f45a375fa38cae6c9c7d5cd30404b277cd"},{"path":"packages/reforge/src/world-camera.test.ts","lines":"108-125","anchor":"test('pre-aborted request rejects","role":"oracle","sha256":"08978bf5b4af768ab1d22a8adf7c2492f6f9429bcbe9fd74c0798cf071723721"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["bootGame → ActiveScene.commit(plan)","bootGame → WorldCamera.update/pan/advance/reset"],"legalInputs":["正式 ScenePreparer.prepare 产出的 ActiveScenePlan","GridPos 与 live bounds callbacks","当前 runner AbortSignal"],"businessOracle":{"type":"runtime-active-scene","assertions":["无恢复快照的换场清旧 action/baseline/wave 并兑现旧 waiter","新资源在 boundary cue 前发布，room/bounds 时机保留","pre-abort 不取代旧 pan；reset 不提前采样像素位置"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/architecture-continuation-integration.md","domains/runtime/scene/active-scene/history/report.md"],"notes":"17 项历史 owner 回归与 save/async/checkpoint 链职责不同；不将 80 个 AST 保护函数或 2560 步对照计作新增业务测试。当前 residual 文件属于后续测试包，本卡不重收/修改。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/runtime/scene/active-scene/evidence.json"}
-->

2026-10-10 当前源码核读：重新读取 main 的 ActiveScene 与 WorldCamera 端口；资源发布、场景所有权和 camera caller 合同保持上述范围。本轮 main 的 ride facing / 脚本 gait 修改归 E2E-CONTINUOUS-001-006 的独立定向验证，不回填本报告的历史运行结论。

# 活动场景资源与镜头所有权

2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核 main 的场景提交与 ActiveScene.commit：无快照时 replaceScene；有快照时先 restoreActions，再 syncBases 保留相同 binding 的相位。旧清场测试仅覆盖前一分支，不能作为 SAVE12 恢复验收；镜头 pre-abort/reset 判据不变。

2026-10-06：重新核读本页 sourceRefs 的实际 caller、合法输入及断言，并更新当前工作树的哈希/行号。此项只是源码证据刷新，不把历史执行升级为当前全量通过；本轮独立录制、帧差异与连续验收状态统一见 E2E-CONTINUOUS-001-006 任务卡。

## 复核范围与结论

历史正文 A3 未完成、53 warning/6 info 属于 2026-09-25 快照。后续全队列统一接收已由 architecture-continuation-integration 记载；本轮只核当前 owner 接线。历史临时日志/内联截图没有随隔离 checkout 入库，无法本轮复算原实跑。

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## 真实 caller、输入与业务 oracle

- `packages/reforge/src/main.ts:395-402`（caller；anchor `const activeScene = new ActiveScene`）
- `packages/reforge/src/main.ts:434-441`（caller；anchor `const cameraSession = new WorldCamera`）
- `packages/reforge/src/active-scene.ts:65-94`（contract；anchor `commit(plan:`）
- `packages/reforge/src/active-scene.test.ts:53-77`（oracle；anchor `test('next scene clears old actions`）
- `packages/reforge/src/world-camera.test.ts:108-125`（oracle；anchor `test('pre-aborted request rejects`）

公开调用链：bootGame → ActiveScene.commit(plan)；bootGame → WorldCamera.update/pan/advance/reset。合法输入：正式 ScenePreparer.prepare 产出的 ActiveScenePlan；GridPos 与 live bounds callbacks；当前 runner AbortSignal。

业务判据：无恢复快照的换场清旧 action/baseline/wave 并兑现旧 waiter；新资源在 boundary cue 前发布，room/bounds 时机保留；pre-abort 不取代旧 pan；reset 不提前采样像素位置。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

17 项历史 owner 回归与 save/async/checkpoint 链职责不同；不将 80 个 AST 保护函数或 2560 步对照计作新增业务测试。当前 residual 文件属于后续测试包，本卡不重收/修改。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；2026-10-04 核读内容22/保存11，历史内容20/保存8不升级；本次 SAVE12 源核验范围见页首。

2026-10-04：基线 d02278dc0154dd73b5db24388a35c30bb096cc81，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
