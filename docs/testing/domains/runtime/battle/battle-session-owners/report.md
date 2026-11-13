---
testingSchema: 2
id: runtime-battle-session-owners
evidence: domains/runtime/battle/battle-session-owners/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-battle-session-owners","sourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"220-222","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"13396fdb6f00dbe4e6dd3789c844bc0c64363e047a2ca248d637a1f1003c68ab"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"381-392","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"13396fdb6f00dbe4e6dd3789c844bc0c64363e047a2ca248d637a1f1003c68ab"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1212-1221","anchor":"this.selection.advance(context","role":"caller","sha256":"13396fdb6f00dbe4e6dd3789c844bc0c64363e047a2ca248d637a1f1003c68ab"},{"path":"packages/reforge/src/battle/battle-turn-readiness.test.ts","lines":"37-60","anchor":"describe('BattleTurnReadinessGate'","role":"oracle","sha256":"2bcc3e72cb6ddb16b56db2f99f18827548d66709c92f9e4cf3391349a0555fc7"},{"path":"packages/reforge/src/battle/battle-command-selection.test.ts","lines":"72-95","anchor":"describe('BattleCommandSelection'","role":"oracle","sha256":"51384d0cd23e0b11d4bc8ecaeea6869a73ccb00575ab53dfea060b1ff476fc70"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"0a67777ed9a2ee576a292cb7281936e4f5183542877fbb170be8c82d19249259"}],"publicCallers":["BattleSession constructor → readiness/settlement owners","BattleSession.tick → command selection and settlement","BattleSession.playTimeline → action scheduler"],"legalInputs":["当前 BattleContent 与 typed PlayerRuntime 投影","五敌槽与存活目标集合","真实 pressed key Set 与明确 dtMs"],"businessOracle":{"type":"runtime-battle-session-owners","assertions":["取消后迟到 prepare 无法提交","结算每屏 300ms 与 terminated 同拍边界","指令 LIFO 与 scripted playback 清理保持区别"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/runtime/battle/battle-session-owners/history/report.md"],"notes":"四 owner 共35条历史回归；与 BattleHost 的 launch/world 写回合同区分。AST 接线计数是结构合同，不能独立证明胜敗演出。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]},{"action":"content23-acquisition-source-rebinding","base":"0973c2c25795fd2aacf78daedebb8d8f2a5113fc","date":"2026-11-07","evidence":"docs/tasks/evidence/N6B-ITEM-FLOWS-1-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"209-211","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"361-372","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1162-1171","anchor":"this.selection.advance(context","role":"caller","sha256":"cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"scope":"核 content23、四类取物及其真实 caller 的来源适用性；保留原执行版本、候选、状态、断言与附件，不把历史录制改记为本轮通过。本轮运行与编辑器验证独立见 N6B-ITEM-FLOWS-1。"},{"action":"q2-battle-session-source-rebinding","base":"43fea71735236272cfb7f6a1c61c3ac2e691a349","date":"2026-11-11","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"210-212","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"818b2c6b19e1c98c2e2a33627e342f801378e5c3d3e090451baebdea50b83bbc"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"362-373","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"818b2c6b19e1c98c2e2a33627e342f801378e5c3d3e090451baebdea50b83bbc"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1163-1172","anchor":"this.selection.advance(context","role":"caller","sha256":"818b2c6b19e1c98c2e2a33627e342f801378e5c3d3e090451baebdea50b83bbc"}],"scope":"校准战斗会话的三个 caller。原候选、版本、业务义务与执行回执保持原出版身份。Q2 本轮独立结果见正常战斗覆盖报告。"},{"action":"q2-battle-session-mechanism-source-rebinding","base":"3a921678f20950cccee3f631dfbb1e60bb8efa3b","date":"2026-11-11","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"209-211","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"a684cfacbdb5bc8ab8c71a015ef6add169d30ed9986a2ebf23f554c54293f038"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"362-373","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"a684cfacbdb5bc8ab8c71a015ef6add169d30ed9986a2ebf23f554c54293f038"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1163-1172","anchor":"this.selection.advance(context","role":"caller","sha256":"a684cfacbdb5bc8ab8c71a015ef6add169d30ed9986a2ebf23f554c54293f038"}],"scope":"重绑三处已接收的会话归属 caller。敌普攻时间线改用直接物理伤害，既有归属合同及其历史执行身份按原记录保留。"},{"action":"q2-battle-session-portrait-source-rebinding","base":"18bfe998333912bf2b1449e534133ce73cafca44","date":"2026-11-11","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"209-211","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"4e77e5ee0c50144b19c5fe9bb316cb900532577eef508a696c6a0ccd4dcf203f"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"362-373","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"4e77e5ee0c50144b19c5fe9bb316cb900532577eef508a696c6a0ccd4dcf203f"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1163-1172","anchor":"this.selection.advance(context","role":"caller","sha256":"4e77e5ee0c50144b19c5fe9bb316cb900532577eef508a696c6a0ccd4dcf203f"}],"scope":"赤毒头像返工后的三个现行 caller 来源重绑。保留前两次适用性事件和原会话归属执行身份。"},{"action":"q2-battle-session-presentation-source-rebinding","base":"5a3093c93746d6e04e8f569ef526e07778aa439f","date":"2026-11-12","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"209-211","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"e71852534a1568874b7c8893bc7c58e976adba97349d0eaf3f160cb602c9b08c"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"362-373","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"e71852534a1568874b7c8893bc7c58e976adba97349d0eaf3f160cb602c9b08c"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1163-1172","anchor":"this.selection.advance(context","role":"caller","sha256":"e71852534a1568874b7c8893bc7c58e976adba97349d0eaf3f160cb602c9b08c"}],"scope":"回合末数值反馈、敌普攻起手声和受击复位使用同一 BattleSession。三个已接收 caller 片段逐字节相同，现行 SHA、行范围和主张指针随源码校准。"},{"action":"q2-battle-session-cadence-source-rebinding","base":"d0020e0749483651d9b0f86cf79ef738ac34663e","date":"2026-11-12","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"211-213","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"57fa83264a9418ea4e2b4a83ae57d44295c3fb550ea97b1bd6e588e627b2f0f1"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"365-376","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"57fa83264a9418ea4e2b4a83ae57d44295c3fb550ea97b1bd6e588e627b2f0f1"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1167-1176","anchor":"this.selection.advance(context","role":"caller","sha256":"57fa83264a9418ea4e2b4a83ae57d44295c3fb550ea97b1bd6e588e627b2f0f1"}],"scope":"普通行动的首拍接续音效准备启动的游戏帧。三个已接收 caller 的片段逐字节相同，现行 SHA、行范围及主张指针随源码校准。"},{"action":"q2-battle-session-casualty-source-rebinding","base":"58812c028ebd87dd75a9c5dda46a4ec997fb4b09","date":"2026-11-12","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"211-213","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"569d70d1b93c2799369433c4a5bb5b8c9734d8473b9937df1659472be73a401a"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"365-376","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"569d70d1b93c2799369433c4a5bb5b8c9734d8473b9937df1659472be73a401a"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1167-1176","anchor":"this.selection.advance(context","role":"caller","sha256":"569d70d1b93c2799369433c4a5bb5b8c9734d8473b9937df1659472be73a401a"}],"scope":"普通敌物攻增加本次伤亡音，胜利写回保留倒地 HP。三个已接收 caller 的片段逐字节相同，现行 SHA、行范围及主张指针随源码校准。"},{"action":"q2-battle-session-casualty-dialogue-source-rebinding","base":"f84bcd91dd71498e1099e7bf8f4b2d7900507090","date":"2026-11-12","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"211-213","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"0e12586ab29d9526f39bf14fd3c74c1cbc57c9ee5def27033d6e57ef74d8f476"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"365-376","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"0e12586ab29d9526f39bf14fd3c74c1cbc57c9ee5def27033d6e57ef74d8f476"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1167-1176","anchor":"this.selection.advance(context","role":"caller","sha256":"0e12586ab29d9526f39bf14fd3c74c1cbc57c9ee5def27033d6e57ef74d8f476"}],"scope":"定时伤亡对白与普通全灭接续世界死亡演出。三个已接收 caller 的片段逐字节相同，现行 SHA、行范围及主张指针随源码校准。"},{"action":"q2-battle-session-player-actions-source-rebinding","base":"faae7bde3078a06d5072326327459994107607e2","date":"2026-11-13","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"216-218","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"24315ad2cd70eaa1f1e5418e5d4df71eb13421707232318252e65d30d10a7181"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"375-386","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"24315ad2cd70eaa1f1e5418e5d4df71eb13421707232318252e65d30d10a7181"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1195-1204","anchor":"this.selection.advance(context","role":"caller","sha256":"24315ad2cd70eaa1f1e5418e5d4df71eb13421707232318252e65d30d10a7181"}],"scope":"玩家法术的超杀飘字使用计算值。投掷时间线接收角色起手音、站位与物品名称，归位沿用已有姿态选择。合击血量代价从飘字差分中排除。友方仙术按实际受术槽落点并执行辉光。三个已接收 caller 片段逐字节相同，现行指纹随源码校准。"},{"action":"q2-battle-session-cooperative-recovery-source-rebinding","base":"a86eea156e360bfb916a63afb8c8c7b5d5d0f018","date":"2026-11-13","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"216-218","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"8a64629ba6e2361e7981a0e33006c385c2e3d37ff7f507f0f449d58980cf321f"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"375-386","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"8a64629ba6e2361e7981a0e33006c385c2e3d37ff7f507f0f449d58980cf321f"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1191-1200","anchor":"this.selection.advance(context","role":"caller","sha256":"8a64629ba6e2361e7981a0e33006c385c2e3d37ff7f507f0f449d58980cf321f"}],"scope":"合击降级复用普通攻击，双击分别使用自己的暴击声与同一目标底锚。玩家攻击仙术在特效结束后显示伤害或完成收势。三个已接收 caller 片段逐字节相同，保留原归属和历史执行记录。"},{"action":"q2-battle-session-item-effects-source-rebinding","base":"398a930d2c1ddb4c0fe1a8a96271dba70e3aa93c","date":"2026-11-13","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"216-218","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"80e9c9e4775f3ad7b15cb59ea33ae6472d44dc3af66d601286188c0a69e5cd37"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"375-386","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"80e9c9e4775f3ad7b15cb59ea33ae6472d44dc3af66d601286188c0a69e5cd37"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1191-1200","anchor":"this.selection.advance(context","role":"caller","sha256":"80e9c9e4775f3ad7b15cb59ea33ae6472d44dc3af66d601286188c0a69e5cd37"}],"scope":"群体用物按实际目标显示辉光，复活者在结果帧更新姿态，投掷伤害与吸血回血数字共用结果帧。三个已接收调用片段逐字节相同，历史执行记录沿用原范围。"},{"action":"q2-battle-session-throw-feedback-source-rebinding","base":"5a5a02a2f56eb4748d0415e902c334999121dcdb","date":"2026-11-13","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"216-218","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"3730d55abbb4af06a419b3d3251b7a7d68aeedf53864f7426206c46933ccf50f"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"375-386","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"3730d55abbb4af06a419b3d3251b7a7d68aeedf53864f7426206c46933ccf50f"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1191-1200","anchor":"this.selection.advance(context","role":"caller","sha256":"3730d55abbb4af06a419b3d3251b7a7d68aeedf53864f7426206c46933ccf50f"}],"scope":"投掷结果在出手后等待中央提示。三个已出版归属调用片段逐字节相同，旧执行和归属范围沿用原证据。"},{"action":"q2-battle-session-enemy-cast-source-rebinding","base":"a4d04282dbbdaecff8e97e37528b5c0d67659550","date":"2026-11-14","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-session.ts","lines":"217-219","anchor":"private readonly selection = new BattleCommandSelection","role":"caller","sha256":"def44c8648f31c08eaba3de03c4da238011fa6a93cedd95eec11910366cb21d0"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"378-389","anchor":"this.readiness = new BattleTurnReadinessGate","role":"caller","sha256":"def44c8648f31c08eaba3de03c4da238011fa6a93cedd95eec11910366cb21d0"},{"path":"packages/reforge/src/battle/battle-session.ts","lines":"1209-1218","anchor":"this.selection.advance(context","role":"caller","sha256":"def44c8648f31c08eaba3de03c4da238011fa6a93cedd95eec11910366cb21d0"}],"scope":"敌方施法时间线增加实际移动、动作帧、FIRE 落点与受击后复位。三个已出版归属调用片段逐字节一致。"}]},"evidence":"domains/runtime/battle/battle-session-owners/evidence.json"}
-->

# 战斗会话 readiness、结算与指令选择

Owner: Codex
Status: current（source/publication；未新增动态验收）
Last reviewed: 2026-11-14
Template: test-domain-report-v1 / 1.1.0

## Domain scope

本报告范围为phase2/reforge。BattleSession 调用readiness、settlement、command selection与action scheduler；不重复BattleHost世界写回信用。
原revision、candidate与content/SAVE版本保持各次出版/执行范围；本次只迁移正文并修正文中已漂移的导航锚点。

2026-11-13 的来源校准先核伤亡与全灭候选，随后核玩家仙术及投掷候选。三个现行接线的源码片段保持相同，归属执行结论保留原时点。 [来源适用性回执](../../../../../tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md)

2026-11-13 追加核对合击降级与玩家攻击仙术收势。三个调用点的行范围和片段字节保持相同。配对证据记录新源码摘要与适用性历史。

2026-11-13 随群体用物、吸血和复活动作的演出改动复核三个会话调用片段，行范围与字节和 PR #63 合并版本一致。现行摘要与来源历史已同步，归属测试沿用原执行身份。

2026-11-14 随敌方施法演出补齐重新核对三个会话调用片段。只更新行范围与来源摘要，片段字节、归属测试的执行身份和结论沿用原记录。

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

- `packages/reforge/src/battle/battle-session.ts:220-222`（caller；anchor `private readonly selection = new BattleCommandSelection`）
- `packages/reforge/src/battle/battle-session.ts:381-392`（caller；anchor `this.readiness = new BattleTurnReadinessGate`）
- `packages/reforge/src/battle/battle-session.ts:1212-1221`（caller；anchor `this.selection.advance(context`）
- `packages/reforge/src/battle/battle-turn-readiness.test.ts:37-60`（oracle；anchor `describe('BattleTurnReadinessGate'`）
- `packages/reforge/src/battle/battle-command-selection.test.ts:72-95`（oracle；anchor `describe('BattleCommandSelection'`）

公开调用链：BattleSession constructor → readiness/settlement owners；BattleSession.tick → command selection and settlement；BattleSession.playTimeline → action scheduler。合法输入：当前 BattleContent 与 typed PlayerRuntime 投影；五敌槽与存活目标集合；真实 pressed key Set 与明确 dtMs。

业务判据：取消后迟到 prepare 无法提交；结算每屏 300ms 与 terminated 同拍边界；指令 LIFO 与 scripted playback 清理保持区别。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## Results and gaps

- 四owner的35条历史回归及三人成型最小试打不覆盖完整胜败/存档/剧情E2E。
- 直接读到battle-turn-readiness.test.ts:46的as unknown as BattleState；其最小snapshot fixture是否满足现行测试质量输入规则须独立测试卡判断，本次不改旧测试、不宣称其质量accept。

原content22/minimumSave11为10-04出版revision，现行源常量 content23/minimumSave12 单列；源核读刷新不升级旧实跑。

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
