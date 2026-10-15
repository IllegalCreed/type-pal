---
testingSchema: 2
id: editor-map-workspace-sessions
evidence: domains/editor/map/map-workspace-sessions/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"editor-map-workspace-sessions","sourceRefs":[{"path":"packages/editor/src/ui/MapMode.tsx","lines":"403-420","anchor":"} = useMapPointerGestureSession({","role":"caller","sha256":"a0f2dbdac3c4643cd68f8c6634b20989621860decfb83c561ec9339125ac4926"},{"path":"packages/editor/src/ui/map-pointer-gesture-session.ts","lines":"36-59","anchor":"export class MapPointerGestureSession","role":"contract","sha256":"15cbbf02f5c8001dae025a71d6e829228582f0dddb77578f7ef415db77f5925b"},{"path":"packages/editor/src/ui/map-pointer-gesture-session.test.tsx","lines":"31-48","anchor":"describe('map pointer gesture session ownership'","role":"oracle","sha256":"0c6fc2f314bc9095f43fcd72aeed698b1db1627d3ef722430e4fbb8a3550f227"},{"path":"packages/editor/src/ui/map-transform-session.test.ts","lines":"37-54","anchor":"describe('map transform session ownership'","role":"oracle","sha256":"c340d78c5656124ccd73fd5220e5d09c6e3048451ddb264fb80929892ced4df3"},{"path":"packages/editor/src/ui/map-workspace-view-session.test.tsx","lines":"30-47","anchor":"describe('map workspace view session ownership'","role":"oracle","sha256":"8ec0b5e77923d806c5647f0971ead8810c22e0b42a1f92e79ee75000b0cf708f"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["MapMode → pointer gesture session","MapMode → transform/view/stamp sessions → reducered command dispatch"],"legalInputs":["current MapMode project/map revision","trusted pointer session and pointerId","typed map command plan with revision guard"],"businessOracle":{"type":"editor-map-workspace-sessions","assertions":["pointer cancel/lost capture has zero command writes","clipboard/session state respects map and EditSession identity","stale structure confirmation cannot commit"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/editor/map/map-workspace-sessions/history/report.md"],"notes":"B2 report/evidence covers owner separation; pointer/transform/view tools remain legacy until their UI runner/cwd and temporary tree lifecycle are separately audited."},"revision":{"currentSha":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/editor/map/map-workspace-sessions/evidence.json"}
-->

# 编辑器地图工作区会话所有权

Owner: Codex
Status: current（source/publication scope；无新运行验收）
Last reviewed: 2026-10-15
Template: test-domain-report-v1 / 1.0.0

## Domain scope

本报告范围为 phase2/editor。MapMode → pointer/transform/view/stamp sessions；EditSession 与 map revision 是不同身份门。
本次按实际正文与 caller 核类型；catalog已纠正阶段/引擎分类，原候选、版本、日期和执行结论不改。

### 复核范围与结论

Historical browser path was a minimum functional check only; native clipboard and full visual matrix remain explicitly unverified. This source audit preserves that limit.

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

2026-10-11 E2E 合入核读：sourceRefs 绑定当前 content22 / minimumSave12 源文件；candidateSha、versions、history、runtimeExecution 和历史计数保持原批次含义，不晋升为 SAVE12 运行时或 E2E 通过。

## Claim matrix

下表是待由相应业务执行验证的合同义务，原配对 evidence 的 source-backed 不因本次排版变为 runtime-backed。

| 合同义务 | 原证据范围 | 本次停止线 |
|---|---|---|
| cancel/lost capture 不产生 command 写入 | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |
| clipboard/session 尊重 map 与 EditSession 身份 | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |
| 过期 structure confirmation 不提交 | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |

## Inputs and fixtures

合法输入为 当前 project/map revision、可信 pointerId 与 typed map command plan。损坏记录或内部突变反控不冒充产品合法输入；报告不新造fixture或测试数量。

### 真实 caller、输入与业务 oracle

- `packages/editor/src/ui/MapMode.tsx:403-420`（caller；anchor `} = useMapPointerGestureSession({`）
- `packages/editor/src/ui/map-pointer-gesture-session.ts:36-59`（contract；anchor `export class MapPointerGestureSession`）
- `packages/editor/src/ui/map-pointer-gesture-session.test.tsx:31-48`（oracle；anchor `describe('map pointer gesture session ownership'`）
- `packages/editor/src/ui/map-transform-session.test.ts:37-54`（oracle；anchor `describe('map transform session ownership'`）
- `packages/editor/src/ui/map-workspace-view-session.test.tsx:30-47`（oracle；anchor `describe('map workspace view session ownership'`）

公开调用链：MapMode → pointer gesture session；MapMode → transform/view/stamp sessions → reducered command dispatch。合法输入：current MapMode project/map revision；trusted pointer session and pointerId；typed map command plan with revision guard。

业务判据：pointer cancel/lost capture has zero command writes；clipboard/session state respects map and EditSession identity；stale structure confirmation cannot commit。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## Results and gaps

旧最小浏览器验证不覆盖原生剪贴板或完整视觉矩阵；本次没有操作地图。
下方原“当前内容22/保存11”描述2026-10-04出版审计revision；现行二阶段源常量为content22/minimumSave12，
不因此更新旧candidate/versions或授予新通过。D1的一阶段合同另有其GameState/原版轴，不从该出版元数据推导存档兼容。
原工具“remain legacy”说明按其审计日期读取，今天的位置/清理状态须查迁移账与实际caller，不能从旧叙述自动继承。

### 排重和处理理由

B2 report/evidence covers owner separation; pointer/transform/view tools remain legacy until their UI runner/cwd and temporary tree lifecycle are separately audited.

工具逐项核对见 [wave2 tool audit](/docs/testing/archive/migrations/testing-domains-20261004-wave2-tool-audit.json)：pointer/session mutants 的 `packages/editor` cwd、coverage environment import、临时 loader 和公开 runner 已核；工具保留 legacy，待临时树生命周期单独迁移。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。


### 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004-wave2.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 2aed1f0dbbbed8ce01cb3511315745ab1ccdf159，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。

## Quality gate

本次仅运行文档结构、链接、配对 publication consumer、source/after SHA 与全仓静态门；不改产品、旧测试或coverage。
缺当前runtime/UI/E2E/视觉/覆盖证据继续保留为限制，不以静态绿色关闭原历史counter或提升catalog状态。
