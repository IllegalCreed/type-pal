---
testingSchema: 2
id: runtime-battle-host
evidence: domains/runtime/battle/battle-host/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-battle-host","sourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"1162-1181","anchor":"const battleHost = new BattleHost","role":"caller","sha256":"b7c50edd82faa26bb710dfdb814ea07cff4183bb1729b9738f840707ea303c28"},{"path":"packages/reforge/src/battle/battle-host.ts","lines":"53-67","anchor":"async start(","role":"contract","sha256":"38a9dc227a35ac0292ccf25e95cfe59a2f9a8a21686fcef5a6d3e24a52c8cc2b"},{"path":"packages/reforge/src/battle/battle-host.ts","lines":"155-159","anchor":"this.ports.finishWorld(session, result)","role":"contract","sha256":"38a9dc227a35ac0292ccf25e95cfe59a2f9a8a21686fcef5a6d3e24a52c8cc2b"},{"path":"packages/reforge/src/battle/battle-host.test.ts","lines":"13-36","anchor":"test('commit consumes live inventory","role":"oracle","sha256":"5bcce095e611c8827a4cea2dba819fb1bebfb9503463a049625858ffb29a8154"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"375a1d94b6f6bdc79ea104a4d76744e96da5d7c70f866af8e71a8c0c1be6d5df"}],"publicCallers":["bootGame → BattleHost.start/cancel/active","BattleHost.start → BattleLaunchPreparation.prepare → commit → BattleSession"],"legalInputs":["当前 loader 验证的 team/world/content","真实准备资源端口","runner signal 与 captureScriptOwner 身份门"],"businessOracle":{"type":"runtime-battle-host","assertions":["await 准备完成后提交拍读取 world snapshot","旧 finally 只释放自身 active session","释放 active 与 finishWorld 同一 continuation"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/architecture-continuation-integration.md","domains/runtime/battle/battle-host/history/report.md"],"notes":"准备资源、宿主 identity、BattleSession 内部菜单/结算是不同合同；H9 随机败北固定输入为历史测试校正，不计本治理的新反控。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/runtime/battle/battle-host/evidence.json"}
-->

# 战斗宿主启动、取消与世界提交

## 复核范围与结论

历史候选 57794d15/348a50d1 被原子收尾 46287966 取代。历史单次严格 fast7972 与 warnings 数字不改写为当前质量。主壳当前 caller 仍消费该 owner；未复跑原反控、PAL 战斗或覆盖基线。

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## 真实 caller、输入与业务 oracle

- `packages/reforge/src/main.ts:1162-1181`（caller；anchor `const battleHost = new BattleHost`）
- `packages/reforge/src/battle/battle-host.ts:53-67`（contract；anchor `async start(`）
- `packages/reforge/src/battle/battle-host.ts:155-159`（contract；anchor `this.ports.finishWorld(session, result)`）
- `packages/reforge/src/battle/battle-host.test.ts:13-36`（oracle；anchor `test('commit consumes live inventory`）

公开调用链：bootGame → BattleHost.start/cancel/active；BattleHost.start → BattleLaunchPreparation.prepare → commit → BattleSession。合法输入：当前 loader 验证的 team/world/content；真实准备资源端口；runner signal 与 captureScriptOwner 身份门。

业务判据：await 准备完成后提交拍读取 world snapshot；旧 finally 只释放自身 active session；释放 active 与 finishWorld 同一 continuation。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

准备资源、宿主 identity、BattleSession 内部菜单/结算是不同合同；H9 随机败北固定输入为历史测试校正，不计本治理的新反控。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 d02278dc0154dd73b5db24388a35c30bb096cc81，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
