---
testingSchema: 2
id: reforge-menu-session
evidence: domains/runtime/menu/menu-session/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"reforge-menu-session","sourceRefs":[{"path":"packages/reforge/src/menu/menu-session.ts","lines":"105-128","anchor":"export class MenuSession","role":"contract","sha256":"85ae2bc5120c08bd3d20c6a44fadcc66da43e5f1bea265b2eeae8d4e92ac9e64"},{"path":"packages/reforge/src/menu/item-use-session.ts","lines":"2-19","anchor":"export class ItemUseSession","role":"contract","sha256":"30440de9697b2ed0e5bed5b102381da4fb95ac380e3062f61cbb37c599818f09"},{"path":"packages/reforge/src/menu/menu-session.test.ts","lines":"9-32","anchor":"test('closed menu ignores input","role":"oracle","sha256":"e4c4b3108a268d769814eabc2414f79ee8112ac3ef885a8348796f359fae81cf"},{"path":"packages/reforge/src/menu/item-use-session.test.ts","lines":"5-22","anchor":"test('item operation owns the pending slot","role":"oracle","sha256":"06e8fa00425ff2a6b199863a13fb8fa007ff121a743496ed44cd5b2795cc09a9"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"375a1d94b6f6bdc79ea104a4d76744e96da5d7c70f866af8e71a8c0c1be6d5df"}],"publicCallers":["main menu input → MenuSession","main item action → ItemUseSession → world/save ports"],"legalInputs":["typed menu input","current world/save port","AbortSignal and canonical item/skill/actor inputs"],"businessOracle":{"type":"reforge-menu-session","assertions":["cancelled item use remains owned until settle","menu pop restores the correct view","save/load completion is observed through real port events"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/runtime/menu/menu-session/history/report.md"],"notes":"A1 report/evidence covers menu/session ownership; historical parity and mutant tools remain legacy until caller/import audit. Runtime E2E and coverage are separate."},"revision":{"currentSha":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/runtime/menu/menu-session/evidence.json"}
-->

# Reforge 菜单与物品会话所有权

## 复核范围与结论

Historical A1 receipt states its original SAVE8/content20 scope and browser boundary. Current source audit does not rerun the PAL menu or storage chain.

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## 真实 caller、输入与业务 oracle

- `packages/reforge/src/menu/menu-session.ts:105-128`（contract；anchor `export class MenuSession`）
- `packages/reforge/src/menu/item-use-session.ts:2-19`（contract；anchor `export class ItemUseSession`）
- `packages/reforge/src/menu/menu-session.test.ts:9-32`（oracle；anchor `test('closed menu ignores input`）
- `packages/reforge/src/menu/item-use-session.test.ts:5-22`（oracle；anchor `test('item operation owns the pending slot`）

公开调用链：main menu input → MenuSession；main item action → ItemUseSession → world/save ports。合法输入：typed menu input；current world/save port；AbortSignal and canonical item/skill/actor inputs。

业务判据：cancelled item use remains owned until settle；menu pop restores the correct view；save/load completion is observed through real port events。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

A1 report/evidence covers menu/session ownership; historical parity and mutant tools remain legacy until caller/import audit. Runtime E2E and coverage are separate.

工具逐项核对见 [wave2 tool audit](/docs/testing/archive/migrations/testing-domains-20261004-wave2-tool-audit.json)：parity 使用冻结 Git 源，mutants 使用 root main loader，cwd/runner/import 已核；历史工具保留 legacy，不把旧 parity 当当前 caller。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004-wave2.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 2aed1f0dbbbed8ce01cb3511315745ab1ccdf159，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
