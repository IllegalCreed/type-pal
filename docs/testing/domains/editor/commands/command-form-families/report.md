---
testingSchema: 2
id: editor-command-form-families
evidence: domains/editor/commands/command-form-families/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"editor-command-form-families","sourceRefs":[{"path":"packages/editor/src/ui/CommandForm.tsx","lines":"82-93","anchor":"export function CommandForm","role":"caller","sha256":"be02bf5a67b18e9f92901ec25013f4c7e16b36a24aeadc608d0b057bb042c3bb"},{"path":"packages/editor/src/ui/command-form-contract.ts","lines":"98-113","anchor":"export function createAuthorCommandFormBridge","role":"contract","sha256":"2ed252625cd4909141f6c72feb0d68b947a71e8686611eaae3b2692a3fc8d403"},{"path":"packages/editor/src/ui/command-form-family-ownership.test.ts","lines":"11-34","anchor":"describe('command form family ownership'","role":"oracle","sha256":"18047df99f35c1e630cf3849c1c8184d7739ba0fef5a23f866728463c3fcfc54"},{"path":"packages/editor/src/ui/command-form-contract.test.ts","lines":"8-25","anchor":"describe('author command form bridge'","role":"oracle","sha256":"5843e284c33f455c9c7b0309e3e29e3a72dd3586f5c4989816ed9a493df2eda8"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["ScriptEditor → createAuthorCommandFormBridge → CommandForm family dispatch","CommandForm → dialogue/actor/world/control typed subforms"],"legalInputs":["current typed AuthorCommand/SharedAuthorCommand","current editor project guards","family-specific form props and author bridge"],"businessOracle":{"type":"editor-command-form-families","assertions":["kind dialect cannot drift across bridge","family owner emits legal command shape","shared controls remain single implementation"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/editor/commands/command-form-families/history/report.md"],"notes":"B3 report/evidence are architecture ownership records; design-system and command-form mutant tools remain legacy until their relative imports and public runners are separately moved. No coverage credit is added by this source audit."},"revision":{"currentSha":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/editor/commands/command-form-families/evidence.json"}
-->

# 编辑器命令表单族所有权

## 复核范围与结论

Historical candidate was later unified by architecture-continuation integration; original candidate counters and strict numbers remain history. This report records current caller/source boundaries, not a new UI run.

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

2026-10-11 E2E 合入核读：sourceRefs 绑定当前 content22 / minimumSave12 源文件；candidateSha、versions、history、runtimeExecution 和历史计数保持原批次含义，不晋升为 SAVE12 运行时或 E2E 通过。

## 真实 caller、输入与业务 oracle

- `packages/editor/src/ui/CommandForm.tsx:82-93`（caller；anchor `export function CommandForm`）
- `packages/editor/src/ui/command-form-contract.ts:98-113`（contract；anchor `export function createAuthorCommandFormBridge`）
- `packages/editor/src/ui/command-form-family-ownership.test.ts:11-34`（oracle；anchor `describe('command form family ownership'`）
- `packages/editor/src/ui/command-form-contract.test.ts:8-25`（oracle；anchor `describe('author command form bridge'`）

公开调用链：ScriptEditor → createAuthorCommandFormBridge → CommandForm family dispatch；CommandForm → dialogue/actor/world/control typed subforms。合法输入：current typed AuthorCommand/SharedAuthorCommand；current editor project guards；family-specific form props and author bridge。

业务判据：kind dialect cannot drift across bridge；family owner emits legal command shape；shared controls remain single implementation。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

B3 report/evidence are architecture ownership records; design-system and command-form mutant tools remain legacy until their relative imports and public runners are separately moved. No coverage credit is added by this source audit.

工具逐项核对见 [wave2 tool audit](/docs/testing/archive/migrations/testing-domains-20261004-wave2-tool-audit.json)：mutants 的相对 import、`packages/editor` cwd、临时 Vite loader 和公开 runner 均已确认；工具保留在 legacy，待单独核清临时产物清理后再迁。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004-wave2.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 2aed1f0dbbbed8ce01cb3511315745ab1ccdf159，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
