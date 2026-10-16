---
testingSchema: 2
id: runtime-battle-session-owners
evidence: domains/runtime/battle/battle-session-owners/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-battle-session-owners","sourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"209-211","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"361-372","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1162-1171","anchor":"this.selection.advance(context","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/reforge/src/battle/battle-turn-readiness.test.ts","lines":"37-60","anchor":"describe('BattleTurnReadinessGate'","role":"oracle","sha256":"2bcc3e72cb6ddb16b56db2f99f18827548d66709c92f9e4cf3391349a0555fc7"},{"path":"packages/reforge/src/battle/battle-command-selection.test.ts","lines":"72-95","anchor":"describe('BattleCommandSelection'","role":"oracle","sha256":"51384d0cd23e0b11d4bc8ecaeea6869a73ccb00575ab53dfea060b1ff476fc70"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["BattleSession constructor → readiness/settlement owners","BattleSession.tick → command selection and settlement","BattleSession.playTimeline → action scheduler"],"legalInputs":["当前 BattleContent 与 typed PlayerRuntime 投影","五敌槽与存活目标集合","真实 pressed key Set 与明确 dtMs"],"businessOracle":{"type":"runtime-battle-session-owners","assertions":["取消后迟到 prepare 无法提交","结算每屏 300ms 与 terminated 同拍边界","指令 LIFO 与 scripted playback 清理保持区别"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/runtime/battle/battle-session-owners/history/report.md"],"notes":"四 owner 共35条历史回归；与 BattleHost 的 launch/world 写回合同区分。AST 接线计数是结构合同，不能独立证明胜敗演出。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/runtime/battle/battle-session-owners/evidence.json"}
-->

# 战斗会话 readiness、结算与指令选择

Owner: Codex
Status: current（source/publication；未新增动态验收）
Last reviewed: 2026-10-15
Template: test-domain-report-v1 / 1.1.0

## Domain scope

本报告范围为phase2/reforge。BattleSession 调用readiness、settlement、command selection与action scheduler；不重复BattleHost世界写回信用。
原revision、candidate与content/SAVE版本保持各次出版/执行范围；本次只迁移正文并修正文中已漂移的导航锚点。

### 复核范围与结论

旧 report/evidence 的 candidate、not merged、unified gates pending 已被 2026-09-26 统一集成回执 supersede；原文只留 history。三人成型最小试打不能扩大成完整胜败、存档或剧情 E2E。

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## Claim matrix

以下为原业务合同的义务投影，source-backed和静态接线不转为本次runtime-backed。

| 合同义务 | 一手范围 | 本次判定边界 |
|---|---|---|
| 取消后迟到prepare不能提交 | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |
| 结算每屏300ms与terminated同拍边界 | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |
| LIFO撤回与scripted playback两类清理有别 | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |

## Inputs and fixtures

输入仍限原typed/caller域，不造产品外fixture或改旧测试；每个sourceRef的当前hash/行号由真实配对consumer核验。
原正文列表中旧行号仅做下列有源更正，源Git blob与回执保留before→after，不改原业务结论。

### 真实 caller、输入与业务 oracle

- `packages/reforge/src/battle/battle-session.ts:209-211`（caller；anchor `private readonly selection = new BattleCommandSelection`）
- `packages/reforge/src/battle/battle-session.ts:361-372`（caller；anchor `this.readiness = new BattleTurnReadinessGate`）
- `packages/reforge/src/battle/battle-session.ts:1162-1171`（caller；anchor `this.selection.advance(context`）
- `packages/reforge/src/battle/battle-turn-readiness.test.ts:37-60`（oracle；anchor `describe('BattleTurnReadinessGate'`）
- `packages/reforge/src/battle/battle-command-selection.test.ts:72-95`（oracle；anchor `describe('BattleCommandSelection'`）

公开调用链：BattleSession constructor → readiness/settlement owners；BattleSession.tick → command selection and settlement；BattleSession.playTimeline → action scheduler。合法输入：当前 BattleContent 与 typed PlayerRuntime 投影；五敌槽与存活目标集合；真实 pressed key Set 与明确 dtMs。

业务判据：取消后迟到 prepare 无法提交；结算每屏 300ms 与 terminated 同拍边界；指令 LIFO 与 scripted playback 清理保持区别。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## Results and gaps

- 四owner的35条历史回归及三人成型最小试打不覆盖完整胜败/存档/剧情E2E。
- 直接读到battle-turn-readiness.test.ts:46的as unknown as BattleState；其最小snapshot fixture是否满足现行测试质量输入规则须独立测试卡判断，本次不改旧测试、不宣称其质量accept。

原content22/minimumSave11为10-04出版revision，现行源常量content22/minimumSave12单列；源核读刷新不升级旧实跑。

### 排重和处理理由

四 owner 共35条历史回归；与 BattleHost 的 launch/world 写回合同区分。AST 接线计数是结构合同，不能独立证明胜敗演出。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。


### 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；2026-10-04 核读内容22/保存11，历史内容20/保存8不升级；本次 SAVE12 源核验范围见页首。

2026-10-04：基线 d02278dc0154dd73b5db24388a35c30bb096cc81，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。

### 历次核读记录（原日期与范围）

以下日期段按原文保留；其中“当前”“本轮”指各原段落时点，不作为今天新执行或演出验收。




2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核 BattleSession 对 readiness、settlement、selection 与 action scheduler 的调用，以及迟到 prepare、300ms 结算、LIFO 撤回和两类播放清理断言；未将源码核读计作新的战斗实跑。


## Quality gate

本批只运行文档合同/链接/索引、source SHA、真实publication配对与全仓静态门；产品、旧测试、coverage只读。
原warnings、counter、缺raw、视觉/console限制均保留。后续质量或动态任务须独立核caller、合法输入、oracle与有效反控，
不能由模板或publication绿色替代；当前已核的source refs不是整个实现或旧测试质量的重新accept。
