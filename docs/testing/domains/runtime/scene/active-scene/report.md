---
testingSchema: 2
id: runtime-active-scene
evidence: domains/runtime/scene/active-scene/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-active-scene","sourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"386-393","anchor":"const activeScene = new ActiveScene","role":"caller","sha256":"b7c50edd82faa26bb710dfdb814ea07cff4183bb1729b9738f840707ea303c28"},{"path":"packages/reforge/src/main.ts","lines":"425-432","anchor":"const cameraSession = new WorldCamera","role":"caller","sha256":"b7c50edd82faa26bb710dfdb814ea07cff4183bb1729b9738f840707ea303c28"},{"path":"packages/reforge/src/active-scene.ts","lines":"65-90","anchor":"commit(plan:","role":"contract","sha256":"b4a09715ebd57eba9062808e667d64466c2e10c1d355d0849a6d9b0b4438890c"},{"path":"packages/reforge/src/active-scene.test.ts","lines":"53-77","anchor":"test('next scene clears old actions","role":"oracle","sha256":"ec3ea1276432a68cdf8110109d5c98f45a375fa38cae6c9c7d5cd30404b277cd"},{"path":"packages/reforge/src/world-camera.test.ts","lines":"108-125","anchor":"test('pre-aborted request rejects","role":"oracle","sha256":"08978bf5b4af768ab1d22a8adf7c2492f6f9429bcbe9fd74c0798cf071723721"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"375a1d94b6f6bdc79ea104a4d76744e96da5d7c70f866af8e71a8c0c1be6d5df"}],"publicCallers":["bootGame → ActiveScene.commit(plan)","bootGame → WorldCamera.update/pan/advance/reset"],"legalInputs":["正式 ScenePreparer.prepare 产出的 ActiveScenePlan","GridPos 与 live bounds callbacks","当前 runner AbortSignal"],"businessOracle":{"type":"runtime-active-scene","assertions":["换场清旧 action/baseline/wave 并兑现旧 waiter","新资源在 boundary cue 前发布，room/bounds 时机保留","pre-abort 不取代旧 pan；reset 不提前采样像素位置"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/runtime/scene/active-scene/history/report.md"],"notes":"17 项历史 owner 回归与 save/async/checkpoint 链职责不同；不将 80 个 AST 保护函数或 2560 步对照计作新增业务测试。当前 residual 文件属于后续测试包，本卡不重收/修改。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/runtime/scene/active-scene/evidence.json"}
-->

# 活动场景资源与镜头所有权

## 复核范围与结论

历史正文 A3 未完成、53 warning/6 info 属于 2026-09-25 快照。后续全队列统一接收已由 architecture-continuation-integration 记载；本轮只核当前 owner 接线。历史临时日志/内联截图没有随隔离 checkout 入库，无法本轮复算原实跑。

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## 真实 caller、输入与业务 oracle

- `packages/reforge/src/main.ts:386-393`（caller；anchor `const activeScene = new ActiveScene`）
- `packages/reforge/src/main.ts:425-432`（caller；anchor `const cameraSession = new WorldCamera`）
- `packages/reforge/src/active-scene.ts:65-90`（contract；anchor `commit(plan:`）
- `packages/reforge/src/active-scene.test.ts:53-77`（oracle；anchor `test('next scene clears old actions`）
- `packages/reforge/src/world-camera.test.ts:108-125`（oracle；anchor `test('pre-aborted request rejects`）

公开调用链：bootGame → ActiveScene.commit(plan)；bootGame → WorldCamera.update/pan/advance/reset。合法输入：正式 ScenePreparer.prepare 产出的 ActiveScenePlan；GridPos 与 live bounds callbacks；当前 runner AbortSignal。

业务判据：换场清旧 action/baseline/wave 并兑现旧 waiter；新资源在 boundary cue 前发布，room/bounds 时机保留；pre-abort 不取代旧 pan；reset 不提前采样像素位置。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

17 项历史 owner 回归与 save/async/checkpoint 链职责不同；不将 80 个 AST 保护函数或 2560 步对照计作新增业务测试。当前 residual 文件属于后续测试包，本卡不重收/修改。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 d02278dc0154dd73b5db24388a35c30bb096cc81，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
