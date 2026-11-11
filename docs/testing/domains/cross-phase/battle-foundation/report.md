---
testingSchema: 2
id: q2-battle-foundation
evidence: domains/cross-phase/battle-foundation/evidence.json
---



# Q2 正常战斗覆盖报告

Status: verified
Owner: Codex
Last reviewed: 2026-11-11
Template: test-domain-report-v1 / 1.1.0

<!-- testing-meta
{"schemaVersion":2,"id":"q2-battle-foundation","sourceRefs":[{"path":"scripts/e2e/battle-foundation.mjs","lines":"47","anchor":"await runBrowserJourney({","role":"caller","sha256":"495556ec6d335bdbeffffe55f53a98fbcfcccdf036207cb0af4fde2e05e0d249"},{"path":"scripts/e2e/battle-foundation-scenarios.mjs","lines":"13","anchor":"function defineScenario(","role":"input-and-independent-oracle","sha256":"ad02b557c9f985d38260d96ad0ba0449de33dc4fbe5bc2f825708a9b8e4451a1"},{"path":"scripts/e2e/battle-game-adapter.mjs","lines":"276","anchor":"launch(input) {","role":"public-fixture-adapter","sha256":"892923c81ed5ade7eee9d2d051127bbf0b02aca6f30ebc4ffc68c6b341e99724"},{"path":"scripts/e2e/battle-reforge-adapter.mjs","lines":"129","anchor":"running = runBattleTrial(","role":"public-trial-adapter","sha256":"0e615e73435fa4aba0083dfacce4ec897e0d76f343709fb64a98ca57e8c6c9fd"},{"path":"scripts/e2e/battle-trace-contract.mjs","lines":"621","anchor":"export function validateBattleTrace(","role":"oracle","sha256":"a3555b860df60e7a718c4101edc5ba033d2202e2a3b09918d2ef36901e698afc"},{"path":"scripts/e2e/battle-foundation-compare.mjs","lines":"34","anchor":"export async function compareBattleReports(","role":"offline-caller","sha256":"522349d1889d4a6be3e02cac43a85f2f402aeaddc5119b2729e9d7ec68feb1c1"},{"path":"scripts/e2e/battle-presentation.mjs","anchor":"export function validateBattlePresentation(","role":"render-oracle","lines":"70","sha256":"197630cbcd2499ce89203a04ad9e1a3b75b7ea39d8419bb701346f1bc4ce9725"},{"path":"scripts/e2e/battle-rules.mjs","anchor":"export function validateBattleRules(","role":"rule-oracle","lines":"90","sha256":"31dc15c28cbe50797de68ff9fb5c24759718705767ba40962a65a0661eedba0b"}],"publicCallers":["node scripts/e2e/battle-foundation.mjs --engine=game","node scripts/e2e/battle-foundation.mjs --engine=reforge","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=herb-settlement --repeat=1 --counter=double-herb"],"legalInputs":["Three explicit legal fixture setups: solo/team1, hero-WuHou-Anu/team3, injured hero-Anu/team1 with two herb99; battlefield7, normal manual battle, mulberry32 seed1729.","Each engine runs each setup twice in fresh contexts. Public Game applyFixture and Reforge runBattleTrial prepare the state; all later commands use real keyboard/menu selection.","Effective starting equipment/stats are read from each engine and compared; content23/minimumSAVE12, exact raw and author JSON source pool is hashed. No Q1 speed-win or user save data is used.","Two-round seed4: hero and Wu Hou, one ordinary team1 lantern, heal296 and two herb99, one guarded enemy hit and one confirmed ally retarget after Escape."],"businessOracle":{"type":"q2-finite-state-and-native-repeat","assertions":["Exact start state and five enemy slots, submitted command actor/target/order and completed action before/after state.","One/three distinct HP30 lanterns receive the selected lethal ordinary attacks, with no undeclared autonomous enemy action.","Herb99 heals hero50 to100 and consumes exactly one of two; formal victory yields hero125, exp1 and cash3. Party victory gives each member exp3 and cash9.","Formal settlement commits exactly once; all three cases pass independent state oracles, cross-engine effective-state comparison and same-engine native/rule-RNG repeat checks.","A real isolated double-consumption mutant fails business/action-after at actions[0].after with inventory2 tozero; restoring normal serve mode passes. Missing hashes, input receipts and fresh contexts are rejected by the offline entry.","Real rendered frames show the manual selection HUD, hide it during action and settlement, finish each enemy fade before the next action, and draw herb50 on the returned actor with the original recipient anchor.","The fixed ordinary attack cases check CLASSIC draw purposes, queue jitter, untruncated attack numbers and clamped enemy HP. Actual draws are logged at their producers.","The two-round case checks guard, real enemy damage, a single herb consumption, cancellation and same-actor retarget, heal296 MP and recipient HP, and single settlement."]},"dedupe":{"result":"bounded-distinct","against":["Q1 001-010 speed-win story verification","battle-host and battle-session source audits","existing rule/unit tests"],"notes":"New runtime entry/collector/comparison obligations only. No full-rule, raw-damage, AI, audiovisual or world/save lifecycle credit."},"revision":{"currentSha":"54d7b378d5094950c10b73bb38a81883cd3d375d","contentVersion":23,"minimumSaveVersion":12,"history":[{"revision":"a8673cfcc9fc5767a6d02a3895964e7977bd7e16","date":"2026-11-07","action":"first-batch-native-normal-battle-foundation","scope":"12 clean native battles plus real item counter/restoration, original-byte offline comparison and entry integrity controls; human visual pending"},{"revision":"54d7b378d5094950c10b73bb38a81883cd3d375d","date":"2026-11-11","action":"native-battle-presentation-and-two-round-rules","scope":"First-batch rendered regressions, ordinary single-target rolls and damage text, and manual two-round defend/use/cast/cancel/retarget.","predecessor":"a8673cfcc9fc5767a6d02a3895964e7977bd7e16","historicalReceiptRevision":"18fac8f47fbb002bf76a4c97283225c7156447f2","archive":"docs/tasks/evidence/E2E-Q2-1-battle-followup-20261111.tar.gz"}]},"evidence":"domains/cross-phase/battle-foundation/evidence.json"}
-->

Provenance: 两端原生执行、实绘时间线、独立业务预期、原件离线重比和独立代码复核。
Primary source: [机器回执](evidence.json)、[11-11 复验归档](../../../../tasks/evidence/E2E-Q2-1-battle-followup-20261111.tar.gz)与[首批原件](../../../../tasks/evidence/E2E-Q2-1-battle-foundation-20261107.tar.gz)。
Scope: 正常战斗入口、三个首批固定局面、绘制复验、单体普攻和多回合操作。
Revision: `54d7b378d5094950c10b73bb38a81883cd3d375d`，content23 / minimumSAVE12。
History: 2026-11-07 发布首批业务闭环。2026-11-11 根据用户反馈补实际绘制对照，并推进第二批规则与操作。
Supersedes: 无。
Stop line: 覆盖以下固定局面及所列机制。伤害仙术、全量 AI、异常状态、音频、地图回流及存读各按后续批次。
Next step: 按任务卡为第三批 AI、状态和特殊机制核合法局面与一手依据，复用现有双端输入、画帧和比较入口。

## 2026-11-11 首批表现返工

两端按相同三个局面各跑两次。先在旧运行时采实际画帧，再在候选 `1102c66d8d16f8f287c6dd3ac57b1029b47f4070` 复跑。
旧版的业务动作和结算可通过，新判据按首次异常帧拒绝 Reforge。候选的 12 场原生执行、六组双端和六组同端重比通过。

| 义务 | 旧 Reforge 原生反例 | 修复复验 |
| --- | --- | --- |
| 底部队员信息框 | 三人战执行阶段仍绘制槽 0、1、2。 | 手动选招与目标时实绘，行动及结算时隐藏。 |
| 死亡淡出 | 巫后首动画在第一只灯笼消失前约 917 ms 开始。第二只灯笼与阿奴的动作也重叠。 | 两次非末敌淡出约 1167 ms，下一动作均在实际消失后约 17 ms 开始。末敌保留作者选定的额外结算停拍。 |
| 止血草回位与黄字 | 逍遥位于 (185, 169) 时画黄字 50，右缘与起始 Y 为 (191, 94)，比归位早约 317 ms。 | 两端均在回位至 (200, 176) 的同一画帧画 50，右缘与起始 Y 为 (206, 101)。 |

比较以动作和敌实例关联淡出开始、最后实绘、消失和后续首帧。画帧时钟、实际底栏槽及用药数字保留在各端轨迹；使用各端真实时钟核顺序和量级。Game 使用分步淡出，Reforge 延续作者选择的 alpha 渐隐。

## 2026-11-11 第二批规则与操作

CLASSIC 的队列随机分配为先敌后我。单体普攻先加值、判暴击和角色加成，再乘浮动。本次普攻各击次完成后抽取体力经验权重。采集在真实随机调用处记录用途，队列另记回合、阵营、槽位和参与计算的身法。多人样本修复后两端原伤和实际绘制的蓝字均为 242、340、857，每只灯笼实际扣血 30。旧 Reforge 巫后和阿奴原伤为 354、908，蓝字均为 30。证据来源及反例见 [Q2 任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md)。

双回合样本固定种子 4。第一回合逍遥防御，巫后给逍遥用止血草，灯笼随后攻击逍遥并造成 1 点伤害。第二回合逍遥在选择自己的施法目标时取消，再施放气疗术给巫后。巫后普攻击败灯笼。两端实录四次玩家提交和五次实际行动，止血草库存 2→1，施法真气 100→94，防御在下一回合开始时清除。

冻结候选在四个固定局面中各用两个新上下文跑两端，共 16 场。八组双端及八组同端比较均通过独立业务、画帧和规则判定。两个额外测试工具误报各有原件，分别核实为最后一次提交后的同回合过渡和新一回合选招尚未开始。修正观测窗口后按同一条件复跑。

原速分屏与各端实际轨迹共同归档。比较报告可按场景、动作和对象定位首个差异。当前用药判定覆盖自用及对队友用药，施法判定覆盖这次气疗术。完整战斗节奏、伤害法术、致死敌普攻的随机用途和音画仍按对应后续范围核验。

## Domain scope

本报告持有 Q2 的覆盖台账。2026-11-07 首批原件使用公开 `applyFixture` 与独立试打 `runBattleTrial`、正式 `BattleSession` 和胜利结算。准备完成后使用真实方向键、攻击与物品菜单和确认键。该历史执行两端各三个样本，每例两个新浏览器上下文，共十二场正常战斗。

## Claim matrix

下表保留 2026-11-07 首次发布的执行边界。当前复验见上方日期段落。

| 合同 | 已验证 | 原件与限制 |
| --- | --- | --- |
| 单人单敌 `solo-lantern` | 逍遥实际提交一次普通攻击；指定灯笼30→0；经验+1、钱+3、结算一次 | 两端各2次；每次1指令/1动作/7次规则随机抽样。对应 trace 与比较见机器回执同名claim。 |
| 多人多目标 `party-lanterns` | 逍遥、巫后、阿奴依次选择三个不同槽位的灯笼；每人经验+3、钱+9 | 两端各2次；每次3指令/3动作/19次规则抽样。保留死亡槽与不同实例ID，检查实际生效装备/属性。 |
| 用药后结算 `herb-settlement` | 逍遥50→100；止血草2→1；阿奴攻击结束；战后逍遥125、经验+1、钱+3 | 两端各2次；每次2指令/2动作/7次规则抽样；结算只提交一次。 |
| 相同阶段重复与跨阶段有效状态 | 三例均通过独立完整快照预期、双端原件重比和同端逐抽/原生行动重复 | 输入、源码与判据变动后拒绝旧原件；不比较绘制层 `Math.random`。 |
| 比较器判别力 | 真实双扣药变体在 `actions[0].after` 报业务错误；正常模式恢复通过 | 库存实际2→0，采集无错。另四个入口反控拒绝缺SHA、缺真实输入回执、复用context及陈旧依赖；这些IO反控不算产品变异。 |
| 后四批 | 尚未验证 | 原始伤害/随机分配一致、完整规则与异常操作、敌AI/状态/特殊机制、完整音画、遇敌与世界/存读生命周期。 |
| 用户视觉 | 待验收 | 已生成三条原速静音双轨；左Game、右Reforge。较短一侧末帧停留，未调整动作速度。静音短片不授音频正确性。 |

## Inputs and fixtures

首批三个场景的队伍为逍遥、逍遥/巫后/阿奴、逍遥/阿奴，原队1或3对应 `enemy-399`，战场7，`mulberry32` seed1729。基础攻250、防100、法50、速度按队内槽为900/500/100，体力上限150、真气100、等级1、经验0、钱0。药物例逍遥开场50。新增 `two-round-commands` 用 seed4、逍遥和巫后、原队1，两人开场体力50。四例均继承默认装备并对照两端实际派生值。 [固定局面](../../../../../scripts/e2e/battle-foundation-scenarios.mjs)

灯笼体力30、经验1、钱3和止血草单体治疗50/消耗一份，分别核原始数据及当前工程。可用原始/工程JSON池1401份按路径与SHA封存为依赖指纹，归档不复制原始资产。每次输入有真实键盘回执，菜单消费另采实际指令。观察器只拿准备参数和运行事实，不读取业务预期；行动前后、随机抽样和提交后结算在真实生产者位置采集。

```sh
node scripts/e2e/battle-foundation.mjs --engine=game
node scripts/e2e/battle-foundation.mjs --engine=reforge
node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY
node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=herb-settlement --repeat=1 --counter=double-herb
node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=herb-settlement --repeat=1
```

离线入口先核报告原字节、trace SHA/长度、依赖闭包及当前源码/JSON输入、真实输入回执和对应场景矩阵的新 context，再重算业务、规则和画帧判定。当前矩阵每端八个独立 context。独立试打沿用专用测试快照。

## Results and gaps

以下是 2026-11-07 首版冻结时点的结论。

十二场正式运行、六组跨端比较和六组同端重复全部通过。独立双扣药运行准确失败于合法行动后的库存断言；恢复运行和入口反控恢复均通过。候选、命令、原件指纹及失败身份在机器回执和归档索引内。原件恢复：在仓库根解开归档，保留成员路径；使用记录的候选和同指纹本地原始资源复验。运行候选和贡献者Git对象的恢复bundle均在归档内。

Reforge原报告保留一条预期404提示：现有runner仅将 `/projects/pal/.type-pal/save-state.json` 的缺省状态404归入warnings，其它资源错误仍使运行失败；本批无浏览器errors，未把这一条运行提示称为静态门诊断或资产读取成功。

本轮选高攻、不同速度的简单局面证明入口与比较链有效，不把击杀结果当作伤害公式正确。已保留多人样本的原生差异：巫后340/354、阿奴857/908；Reforge日志保留未截断伤害，屏幕飘字显示有效扣血30。随机调用的分配与显示数字差异仍开放，分别进入后续规则和表现核对，未在本轮改机制。采到音效请求或render调用也不等于音画正确。

## Quality gate

2026-11-11 复验的实际候选、全仓检查和受保护 CI 取任务卡。首版质量回执如下。

贡献者分支由root独立复核，发现的六项入口/证据缺口已整改，最终只读复核无剩余项。22项定向工具测试、四个真实原件入口反控、原生业务反控与恢复原件均保留；全仓静态/测试与受保护CI按 [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md) 的最终回执核。代码治理新增21路径仍pending，未把本批工具验证冒充逐文件专项closed。

[独立入口与导航](README.md) · [E2E合同](../../../e2e/contract.md)
