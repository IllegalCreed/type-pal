---
testingSchema: 2
id: editor-command-form-families
evidence: domains/editor/commands/command-form-families/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"editor-command-form-families","sourceRefs":[{"path":"packages/editor/src/ui/CommandForm.tsx","lines":"82-93","anchor":"export function CommandForm","role":"caller","sha256":"be02bf5a67b18e9f92901ec25013f4c7e16b36a24aeadc608d0b057bb042c3bb"},{"path":"packages/editor/src/ui/command-form-contract.ts","lines":"98-113","anchor":"export function createAuthorCommandFormBridge","role":"contract","sha256":"2ed252625cd4909141f6c72feb0d68b947a71e8686611eaae3b2692a3fc8d403"},{"path":"packages/editor/src/ui/command-form-family-ownership.test.ts","lines":"11-34","anchor":"describe('command form family ownership'","role":"oracle","sha256":"18047df99f35c1e630cf3849c1c8184d7739ba0fef5a23f866728463c3fcfc54"},{"path":"packages/editor/src/ui/command-form-contract.test.ts","lines":"8-25","anchor":"describe('author command form bridge'","role":"oracle","sha256":"5843e284c33f455c9c7b0309e3e29e3a72dd3586f5c4989816ed9a493df2eda8"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["ScriptEditor → createAuthorCommandFormBridge → CommandForm family dispatch","CommandForm → dialogue/actor/world/control typed subforms"],"legalInputs":["current typed AuthorCommand/SharedAuthorCommand","current editor project guards","family-specific form props and author bridge"],"businessOracle":{"type":"editor-command-form-families","assertions":["kind dialect cannot drift across bridge","family owner emits legal command shape","shared controls remain single implementation"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/editor/commands/command-form-families/history/report.md"],"notes":"B3 report/evidence are architecture ownership records; design-system and command-form mutant tools remain legacy until their relative imports and public runners are separately moved. No coverage credit is added by this source audit."},"revision":{"currentSha":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/editor/commands/command-form-families/evidence.json"}
-->

# 编辑器命令表单族所有权

Owner: Codex
Status: current（source/publication scope；无新运行验收）
Last reviewed: 2026-10-15
Template: test-domain-report-v1 / 1.0.0

## Domain scope

本报告范围为 phase2/editor。ScriptEditor → author bridge → CommandForm 各 family，不能由 Reforge 游戏通过替代编辑器输入合同。
本次按实际正文与 caller 核类型；catalog已纠正阶段/引擎分类，原候选、版本、日期和执行结论不改。

### 复核范围与结论

Historical candidate was later unified by architecture-continuation integration; original candidate counters and strict numbers remain history. This report records current caller/source boundaries, not a new UI run.

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

2026-10-11 E2E 合入核读：sourceRefs 绑定当前 content22 / minimumSave12 源文件；candidateSha、versions、history、runtimeExecution 和历史计数保持原批次含义，不晋升为 SAVE12 运行时或 E2E 通过。

## Claim matrix

下表是待由相应业务执行验证的合同义务，原配对 evidence 的 source-backed 不因本次排版变为 runtime-backed。

| 合同义务 | 原证据范围 | 本次停止线 |
|---|---|---|
| kind dialect 在桥接前后保持 | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |
| family owner 只输出合法 command shape | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |
| 共享控件保持单一实现 | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |

## Inputs and fixtures

合法输入为 typed AuthorCommand/SharedAuthorCommand 与作者桥接/家庭表单 props。损坏记录或内部突变反控不冒充产品合法输入；报告不新造fixture或测试数量。

### 真实 caller、输入与业务 oracle

- `packages/editor/src/ui/CommandForm.tsx:82-93`（caller；anchor `export function CommandForm`）
- `packages/editor/src/ui/command-form-contract.ts:98-113`（contract；anchor `export function createAuthorCommandFormBridge`）
- `packages/editor/src/ui/command-form-family-ownership.test.ts:11-34`（oracle；anchor `describe('command form family ownership'`）
- `packages/editor/src/ui/command-form-contract.test.ts:8-25`（oracle；anchor `describe('author command form bridge'`）

公开调用链：ScriptEditor → createAuthorCommandFormBridge → CommandForm family dispatch；CommandForm → dialogue/actor/world/control typed subforms。合法输入：current typed AuthorCommand/SharedAuthorCommand；current editor project guards；family-specific form props and author bridge。

业务判据：kind dialect cannot drift across bridge；family owner emits legal command shape；shared controls remain single implementation。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## Results and gaps

不重跑 UI、旧 mutant 或覆盖率；历史B3与design-system测试不同责。
下方原“当前内容22/保存11”描述2026-10-04出版审计revision；现行二阶段源常量为content22/minimumSave12，
不因此更新旧candidate/versions或授予新通过。D1的一阶段合同另有其GameState/原版轴，不从该出版元数据推导存档兼容。
原工具“remain legacy”说明按其审计日期读取，今天的位置/清理状态须查迁移账与实际caller，不能从旧叙述自动继承。

### 排重和处理理由

B3 report/evidence are architecture ownership records; design-system and command-form mutant tools remain legacy until their relative imports and public runners are separately moved. No coverage credit is added by this source audit.

工具逐项核对见 [wave2 tool audit](/docs/testing/archive/migrations/testing-domains-20261004-wave2-tool-audit.json)：mutants 的相对 import、`packages/editor` cwd、临时 Vite loader 和公开 runner 均已确认；工具保留在 legacy，待单独核清临时产物清理后再迁。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。


### 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004-wave2.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 2aed1f0dbbbed8ce01cb3511315745ab1ccdf159，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。

## Quality gate

本次仅运行文档结构、链接、配对 publication consumer、source/after SHA 与全仓静态门；不改产品、旧测试或coverage。
缺当前runtime/UI/E2E/视觉/覆盖证据继续保留为限制，不以静态绿色关闭原历史counter或提升catalog状态。
