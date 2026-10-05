---
testingSchema: 2
id: phase1-dependency-ownership
evidence: domains/phase1-runtime/dependencies/dependency-ownership/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"phase1-dependency-ownership","sourceRefs":[{"path":"packages/game/src/core/script-catalog.ts","lines":"33-40","anchor":"export function patchGiveItemZeroBugs","role":"owner","sha256":"15b8c7b86a9d2125198054a32305b4fb83ef8dff15ccde4865e5af2dc301606b"},{"path":"packages/game/src/core/inventory-state.ts","lines":"10-23","anchor":"export function addItemToInventory","role":"owner","sha256":"61bedc73a9a72cd587b7bb202162528b4c2ad5e1bd5dfd9c6d0eea35ec0d8d25"},{"path":"packages/game/src/core/equipment-state.ts","lines":"6-13","anchor":"export const MAX_PLAYER_EQUIPMENTS","role":"owner","sha256":"5ebe8ee7d1c0ad76f6867253aaaa9875ea473a776afb27a00edca9c21999ed5c"},{"path":"packages/game/src/core/player-poison-state.ts","lines":"12-19","anchor":"export function setObjectPoisons","role":"owner","sha256":"074b4318ac0b92d6e9a5621e23ea84303a335056b83a60803e6690a690de214c"},{"path":"packages/game/src/core/scene-identity.ts","lines":"6-13","anchor":"export function getCurrentMapNum","role":"owner","sha256":"8e47a8b7ff7e1d3b360f5984f819b207e480581b4c2042f98ef1abe0681b89ef"},{"path":"packages/game/src/core/menu/menu-stack.ts","lines":"12-19","anchor":"export function resumeAfterMenusClosed","role":"owner","sha256":"1a9681b2b26ccb5524486f25083659a0ab0fa4e4d765147e3b2702d0d0e5a7e2"},{"path":"packages/game/src/core/dependency-ownership.test.ts","lines":"26-45","anchor":"describe('D1 shared-state ownership","role":"oracle","sha256":"21ff3e7739eca1c54ce5d6000300cb82ee08ce8c8c44ddf11014226fb369bf1e"},{"path":"packages/game/src/core/cross-module-boundaries.test.ts","lines":"45-64","anchor":"describe('G07","role":"oracle","sha256":"9359f945fb2d77563326ccaca7f140250d747a0972aef46e15e91c2106a077e4"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"375a1d94b6f6bdc79ea104a4d76744e96da5d7c70f866af8e71a8c0c1be6d5df"}],"publicCallers":["game event/scene/equipment/battle/menu consumers → single lower owner modules","dependency-ownership and cross-module boundary tests"],"legalInputs":["current GameState","current event/battle/menu typed commands","PAL runtime data and synchronous scene identity"],"businessOracle":{"type":"phase1-dependency-ownership","assertions":["static runtime SCC is zero","old exports and function bodies retain contracts","inventory/poison/equipment/scene/menu state has one owner"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/phase1-runtime/dependencies/dependency-ownership/history/report.md"],"notes":"D1 report/evidence is a phase1 architecture audit; its audit/mutant scripts remain legacy tools with explicit package-relative imports. It does not close gameplay/E2E or coverage."},"revision":{"currentSha":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/phase1-runtime/dependencies/dependency-ownership/evidence.json"}
-->

# 第一阶段依赖所有权拆分

## 复核范围与结论

Historical D1 receipt records 161 function token checks, 8 ownership tests, 3 needles and a minimum browser check. Current source audit does not rerun PAL or reclassify the old warnings.

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## 真实 caller、输入与业务 oracle

- `packages/game/src/core/script-catalog.ts:33-40`（owner；anchor `export function patchGiveItemZeroBugs`）
- `packages/game/src/core/inventory-state.ts:10-23`（owner；anchor `export function addItemToInventory`）
- `packages/game/src/core/equipment-state.ts:6-13`（owner；anchor `export const MAX_PLAYER_EQUIPMENTS`）
- `packages/game/src/core/player-poison-state.ts:12-19`（owner；anchor `export function setObjectPoisons`）
- `packages/game/src/core/scene-identity.ts:6-13`（owner；anchor `export function getCurrentMapNum`）
- `packages/game/src/core/menu/menu-stack.ts:12-19`（owner；anchor `export function resumeAfterMenusClosed`）
- `packages/game/src/core/dependency-ownership.test.ts:26-45`（oracle；anchor `describe('D1 shared-state ownership`）
- `packages/game/src/core/cross-module-boundaries.test.ts:45-64`（oracle；anchor `describe('G07`）

公开调用链：game event/scene/equipment/battle/menu consumers → single lower owner modules；dependency-ownership and cross-module boundary tests。合法输入：current GameState；current event/battle/menu typed commands；PAL runtime data and synchronous scene identity。

业务判据：static runtime SCC is zero；old exports and function bodies retain contracts；inventory/poison/equipment/scene/menu state has one owner。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

D1 report/evidence is a phase1 architecture audit; its audit/mutant scripts remain legacy tools with explicit package-relative imports. It does not close gameplay/E2E or coverage.

工具逐项核对见 [wave2 tool audit](/docs/testing/archive/migrations/testing-domains-20261004-wave2-tool-audit.json)：audit/mutants 的 root 参数、Git/source 读取、cwd、runner 与 TypeScript import 已核；工具保留 legacy，不将 phase1 旧反控当当前产品 caller。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004-wave2.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 2aed1f0dbbbed8ce01cb3511315745ab1ccdf159，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
