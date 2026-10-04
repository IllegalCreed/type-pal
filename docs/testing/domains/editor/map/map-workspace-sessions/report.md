---
testingSchema: 2
id: editor-map-workspace-sessions
evidence: domains/editor/map/map-workspace-sessions/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"editor-map-workspace-sessions","sourceRefs":[{"path":"packages/editor/src/ui/MapMode.tsx","lines":"403-420","anchor":"} = useMapPointerGestureSession({","role":"caller","sha256":"a0f2dbdac3c4643cd68f8c6634b20989621860decfb83c561ec9339125ac4926"},{"path":"packages/editor/src/ui/map-pointer-gesture-session.ts","lines":"36-59","anchor":"export class MapPointerGestureSession","role":"contract","sha256":"15cbbf02f5c8001dae025a71d6e829228582f0dddb77578f7ef415db77f5925b"},{"path":"packages/editor/src/ui/map-pointer-gesture-session.test.tsx","lines":"31-48","anchor":"describe('map pointer gesture session ownership'","role":"oracle","sha256":"0c6fc2f314bc9095f43fcd72aeed698b1db1627d3ef722430e4fbb8a3550f227"},{"path":"packages/editor/src/ui/map-transform-session.test.ts","lines":"37-54","anchor":"describe('map transform session ownership'","role":"oracle","sha256":"c340d78c5656124ccd73fd5220e5d09c6e3048451ddb264fb80929892ced4df3"},{"path":"packages/editor/src/ui/map-workspace-view-session.test.tsx","lines":"30-47","anchor":"describe('map workspace view session ownership'","role":"oracle","sha256":"8ec0b5e77923d806c5647f0971ead8810c22e0b42a1f92e79ee75000b0cf708f"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"375a1d94b6f6bdc79ea104a4d76744e96da5d7c70f866af8e71a8c0c1be6d5df"}],"publicCallers":["MapMode → pointer gesture session","MapMode → transform/view/stamp sessions → reducered command dispatch"],"legalInputs":["current MapMode project/map revision","trusted pointer session and pointerId","typed map command plan with revision guard"],"businessOracle":{"type":"editor-map-workspace-sessions","assertions":["pointer cancel/lost capture has zero command writes","clipboard/session state respects map and EditSession identity","stale structure confirmation cannot commit"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/architecture-continuation-integration.md","domains/editor/map/map-workspace-sessions/history/report.md"],"notes":"B2 report/evidence covers owner separation; pointer/transform/view tools remain legacy until their UI runner/cwd and temporary tree lifecycle are separately audited."},"revision":{"currentSha":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/editor/map/map-workspace-sessions/evidence.json"}
-->

# 编辑器地图工作区会话所有权

## 复核范围与结论

Historical browser path was a minimum functional check only; native clipboard and full visual matrix remain explicitly unverified. This source audit preserves that limit.

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## 真实 caller、输入与业务 oracle

- `packages/editor/src/ui/MapMode.tsx:403-420`（caller；anchor `} = useMapPointerGestureSession({`）
- `packages/editor/src/ui/map-pointer-gesture-session.ts:36-59`（contract；anchor `export class MapPointerGestureSession`）
- `packages/editor/src/ui/map-pointer-gesture-session.test.tsx:31-48`（oracle；anchor `describe('map pointer gesture session ownership'`）
- `packages/editor/src/ui/map-transform-session.test.ts:37-54`（oracle；anchor `describe('map transform session ownership'`）
- `packages/editor/src/ui/map-workspace-view-session.test.tsx:30-47`（oracle；anchor `describe('map workspace view session ownership'`）

公开调用链：MapMode → pointer gesture session；MapMode → transform/view/stamp sessions → reducered command dispatch。合法输入：current MapMode project/map revision；trusted pointer session and pointerId；typed map command plan with revision guard。

业务判据：pointer cancel/lost capture has zero command writes；clipboard/session state respects map and EditSession identity；stale structure confirmation cannot commit。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

B2 report/evidence covers owner separation; pointer/transform/view tools remain legacy until their UI runner/cwd and temporary tree lifecycle are separately audited.

工具逐项核对见 [wave2 tool audit](/docs/testing/archive/migrations/testing-domains-20261004-wave2-tool-audit.json)：pointer/session mutants 的 `packages/editor` cwd、coverage environment import、临时 loader 和公开 runner 已核；工具保留 legacy，待临时树生命周期单独迁移。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004-wave2.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 2aed1f0dbbbed8ce01cb3511315745ab1ccdf159，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
