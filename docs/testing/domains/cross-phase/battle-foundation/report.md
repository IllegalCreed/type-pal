---
testingSchema: 2
id: q2-battle-foundation
evidence: domains/cross-phase/battle-foundation/evidence.json
---



# Q2 首批正常战斗闭环

Status: verified
Owner: Codex
Last reviewed: 2026-11-07
Template: test-domain-report-v1 / 1.1.0

<!-- testing-meta
{"schemaVersion":2,"id":"q2-battle-foundation","sourceRefs":[{"path":"scripts/e2e/battle-foundation.mjs","lines":"45","anchor":"await runBrowserJourney({","role":"caller","sha256":"7494783fc9ae92f230a104eb66990fce89ac931af54000f4b70e0b12206f564d"},{"path":"scripts/e2e/battle-foundation-scenarios.mjs","lines":"13","anchor":"function defineScenario(","role":"input-and-independent-oracle","sha256":"695f1e25cabd9c7fc3b7766064162523728277830f11e253e69c735c94b505ea"},{"path":"scripts/e2e/battle-game-adapter.mjs","lines":"215","anchor":"launch(input) {","role":"public-fixture-adapter","sha256":"a7119fc64a6d860a0c7825f87732ab6243946efe31114305a21dbd0ac3683bd8"},{"path":"scripts/e2e/battle-reforge-adapter.mjs","lines":"121","anchor":"running = runBattleTrial(","role":"public-trial-adapter","sha256":"906825f69dc5edb3f65dbcb650518890ddc8061d66a2395128525fe8a832b251"},{"path":"scripts/e2e/battle-trace-contract.mjs","lines":"558","anchor":"export function validateBattleTrace(","role":"oracle","sha256":"2cee6fda2ece4e7b189e2bd9ae70ba84155b0200c36dd54acd7b14eff16278d6"},{"path":"scripts/e2e/battle-foundation-compare.mjs","lines":"23","anchor":"export async function compareBattleReports(","role":"offline-caller","sha256":"488d425ec25444c28e30acff9a4387923bd2e61e2ec5de570d352b0cb6ee8c91"}],"publicCallers":["node scripts/e2e/battle-foundation.mjs --engine=game","node scripts/e2e/battle-foundation.mjs --engine=reforge","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=herb-settlement --repeat=1 --counter=double-herb"],"legalInputs":["Three explicit legal fixture setups: solo/team1, hero-WuHou-Anu/team3, injured hero-Anu/team1 with two herb99; battlefield7, normal manual battle, mulberry32 seed1729.","Each engine runs each setup twice in fresh contexts. Public Game applyFixture and Reforge runBattleTrial prepare the state; all later commands use real keyboard/menu selection.","Effective starting equipment/stats are read from each engine and compared; content23/minimumSAVE12, exact raw and author JSON source pool is hashed. No Q1 speed-win or user save data is used."],"businessOracle":{"type":"q2-finite-state-and-native-repeat","assertions":["Exact start state and five enemy slots, submitted command actor/target/order and completed action before/after state.","One/three distinct HP30 lanterns receive the selected lethal ordinary attacks, with no undeclared autonomous enemy action.","Herb99 heals hero50 to100 and consumes exactly one of two; formal victory yields hero125, exp1 and cash3. Party victory gives each member exp3 and cash9.","Formal settlement commits exactly once; all three cases pass independent state oracles, cross-engine effective-state comparison and same-engine native/rule-RNG repeat checks.","A real isolated double-consumption mutant fails business/action-after at actions[0].after with inventory2 tozero; restoring normal serve mode passes. Missing hashes, input receipts and fresh contexts are rejected by the offline entry."]},"dedupe":{"result":"bounded-distinct","against":["Q1 001-010 speed-win story verification","battle-host and battle-session source audits","existing rule/unit tests"],"notes":"New runtime entry/collector/comparison obligations only. No full-rule, raw-damage, AI, audiovisual or world/save lifecycle credit."},"revision":{"currentSha":"a8673cfcc9fc5767a6d02a3895964e7977bd7e16","contentVersion":23,"minimumSaveVersion":12,"history":[{"revision":"a8673cfcc9fc5767a6d02a3895964e7977bd7e16","date":"2026-11-07","action":"first-batch-native-normal-battle-foundation","scope":"12 clean native battles plus real item counter/restoration, original-byte offline comparison and entry integrity controls; human visual pending"}]},"evidence":"domains/cross-phase/battle-foundation/evidence.json"}
-->

Provenance: 两端原生执行、独立业务预期、原件离线重比和独立代码复核。
Primary source: [机器回执](evidence.json)与[唯一归档](../../../../tasks/evidence/E2E-Q2-1-battle-foundation-20261107.tar.gz)。
Scope: 正常战斗入口、采集器、比较器、覆盖台账和三个固定局面。
Revision: `a8673cfcc9fc5767a6d02a3895964e7977bd7e16`，content23 / minimumSAVE12。
History: 第一批首次发布；旧 Q1、source audit 与运行记录保持。
Supersedes: 无。
Stop line: 不授完整战斗规则、原始伤害一致、AI、音画、地图回流或存读信用。
Next step: 查看原速分屏，再按任务卡核第二批规则与操作的具体准入。

## Domain scope

本报告是首批覆盖台账的唯一事实源。Game 使用公开 `applyFixture`，Reforge 使用公开独立试打 `runBattleTrial` 与正式 `BattleSession`、胜利结算；准备完成后只发送真实方向键、攻击/物品菜单和确认键。没有调用速胜、改胜负、写入行动队列或在战斗中直接设体力。两端各三个样本、每例两个新浏览器上下文，共十二场正常战斗。

## Claim matrix

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

三个场景定义统一位于 [固定局面](../../../../../scripts/e2e/battle-foundation-scenarios.mjs)。队伍分别为逍遥、逍遥/巫后/阿奴、逍遥/阿奴；原队1或3对应 `enemy-399`，战场7，`mulberry32` seed1729。基础攻250、防100、法50、速度按队内槽为900/500/100，体力上限150、真气100、等级1、经验0、钱0；药物例逍遥开场50。继承默认装备并读取两边实际派生值比较，不以配置字段相同代替实际属性相同。

灯笼体力30、经验1、钱3和止血草单体治疗50/消耗一份，分别核原始数据及当前工程。可用原始/工程JSON池1401份按路径与SHA封存为依赖指纹，归档不复制原始资产。每次输入有真实键盘回执，菜单消费另采实际指令。观察器只拿准备参数和运行事实，不读取业务预期；行动前后、随机抽样和提交后结算在真实生产者位置采集。

```sh
node scripts/e2e/battle-foundation.mjs --engine=game
node scripts/e2e/battle-foundation.mjs --engine=reforge
node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY
node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=herb-settlement --repeat=1 --counter=double-herb
node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=herb-settlement --repeat=1
```

离线入口先核报告原字节、trace SHA/长度、依赖闭包及当前源码/JSON输入、真实输入回执和六个独立context，再重算业务判定。缺损或陈旧输入会拒绝；不能只改报告的passed字段。独立试打没有地图战后剧情和正式存档，此处不存在Q1前驱依赖，也不占用剧情编号011。

## Results and gaps

十二场正式运行、六组跨端比较和六组同端重复全部通过。独立双扣药运行准确失败于合法行动后的库存断言；恢复运行和入口反控恢复均通过。候选、命令、原件指纹及失败身份在机器回执和归档索引内。原件恢复：在仓库根解开归档，保留成员路径；使用记录的候选和同指纹本地原始资源复验。运行候选和贡献者Git对象的恢复bundle均在归档内。

Reforge原报告保留一条预期404提示：现有runner仅将 `/projects/pal/.type-pal/save-state.json` 的缺省状态404归入warnings，其它资源错误仍使运行失败；本批无浏览器errors，未把这一条运行提示称为静态门诊断或资产读取成功。

本轮选高攻、不同速度的简单局面证明入口与比较链有效，不把击杀结果当作伤害公式正确。已保留多人样本的原生差异：巫后340/354、阿奴857/908；Reforge日志保留未截断伤害，屏幕飘字显示有效扣血30。随机调用的分配与显示数字差异仍开放，分别进入后续规则和表现核对，未在本轮改机制。采到音效请求或render调用也不等于音画正确。

## Quality gate

贡献者分支由root独立复核，发现的六项入口/证据缺口已整改，最终只读复核无剩余项。22项定向工具测试、四个真实原件入口反控、原生业务反控与恢复原件均保留；全仓静态/测试与受保护CI按 [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md) 的最终回执核。代码治理新增21路径仍pending，未把本批工具验证冒充逐文件专项closed。

[独立入口与导航](README.md) · [E2E合同](../../../e2e/contract.md)
