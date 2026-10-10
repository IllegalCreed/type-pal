---
testingSchema: 2
id: runtime-battle-session-owners
evidence: domains/runtime/battle/battle-session-owners/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-battle-session-owners","sourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"209-211","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"361-372","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1162-1171","anchor":"this.selection.advance(context","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/reforge/src/battle/battle-turn-readiness.test.ts","lines":"37-60","anchor":"describe('BattleTurnReadinessGate'","role":"oracle","sha256":"2bcc3e72cb6ddb16b56db2f99f18827548d66709c92f9e4cf3391349a0555fc7"},{"path":"packages/reforge/src/battle/battle-command-selection.test.ts","lines":"72-95","anchor":"describe('BattleCommandSelection'","role":"oracle","sha256":"51384d0cd23e0b11d4bc8ecaeea6869a73ccb00575ab53dfea060b1ff476fc70"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["BattleSession constructor → readiness/settlement owners","BattleSession.tick → command selection and settlement","BattleSession.playTimeline → action scheduler"],"legalInputs":["当前 BattleContent 与 typed PlayerRuntime 投影","五敌槽与存活目标集合","真实 pressed key Set 与明确 dtMs"],"businessOracle":{"type":"runtime-battle-session-owners","assertions":["取消后迟到 prepare 无法提交","结算每屏 300ms 与 terminated 同拍边界","指令 LIFO 与 scripted playback 清理保持区别"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/architecture-continuation-integration.md","domains/runtime/battle/battle-session-owners/history/report.md"],"notes":"四 owner 共35条历史回归；与 BattleHost 的 launch/world 写回合同区分。AST 接线计数是结构合同，不能独立证明胜敗演出。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"domains/runtime/battle/battle-session-owners/evidence.json"}
-->

# 战斗会话 readiness、结算与指令选择

2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核 BattleSession 对 readiness、settlement、selection 与 action scheduler 的调用，以及迟到 prepare、300ms 结算、LIFO 撤回和两类播放清理断言；未将源码核读计作新的战斗实跑。

## 复核范围与结论

旧 report/evidence 的 candidate、not merged、unified gates pending 已被 2026-09-26 统一集成回执 supersede；原文只留 history。三人成型最小试打不能扩大成完整胜败、存档或剧情 E2E。

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## 真实 caller、输入与业务 oracle

- `packages/reforge/src/battle/battle-session.ts:209-211`（caller；anchor `private readonly selection = new BattleCommandSelection`）
- `packages/reforge/src/battle/battle-session.ts:361-372`（caller；anchor `this.readiness = new BattleTurnReadinessGate`）
- `packages/reforge/src/battle/battle-session.ts:1162-1171`（caller；anchor `this.selection.advance(context`）
- `packages/reforge/src/battle/battle-turn-readiness.test.ts:37-60`（oracle；anchor `describe('BattleTurnReadinessGate'`）
- `packages/reforge/src/battle/battle-command-selection.test.ts:72-95`（oracle；anchor `describe('BattleCommandSelection'`）

公开调用链：BattleSession constructor → readiness/settlement owners；BattleSession.tick → command selection and settlement；BattleSession.playTimeline → action scheduler。合法输入：当前 BattleContent 与 typed PlayerRuntime 投影；五敌槽与存活目标集合；真实 pressed key Set 与明确 dtMs。

业务判据：取消后迟到 prepare 无法提交；结算每屏 300ms 与 terminated 同拍边界；指令 LIFO 与 scripted playback 清理保持区别。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## 排重和处理理由

四 owner 共35条历史回归；与 BattleHost 的 launch/world 写回合同区分。AST 接线计数是结构合同，不能独立证明胜敗演出。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。

## 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；2026-10-04 核读内容22/保存11，历史内容20/保存8不升级；本次 SAVE12 源核验范围见页首。

2026-10-04：基线 d02278dc0154dd73b5db24388a35c30bb096cc81，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。
