---
testingSchema: 2
id: q2-battle-foundation
evidence: domains/cross-phase/battle-foundation/evidence.json
---



# Q2 正常战斗覆盖报告

Status: verified
Owner: Codex
Last reviewed: 2026-11-12
Template: test-domain-report-v1 / 1.1.0

<!-- testing-meta
{"schemaVersion":2,"id":"q2-battle-foundation","sourceRefs":[{"path":"scripts/e2e/battle-foundation.mjs","lines":"55","anchor":"await runBrowserJourney({","role":"caller","sha256":"bd58c5e42c20f41fc947565a60c1d0d8a37628a6c32e460c2b2cac142fbe99ac"},{"path":"scripts/e2e/battle-foundation-scenarios.mjs","lines":"129","anchor":"function defineScenario(","role":"input-and-independent-oracle","sha256":"0d69f7d17541958944aca36e1aafb798faab6bc2f5515ce7409a0999fd522cc7"},{"path":"scripts/e2e/battle-game-adapter.mjs","lines":"368","anchor":"launch(input) {","role":"public-fixture-adapter","sha256":"bd6b812298a261d4e19f78749eb25c1c52afdd796174215d6709536e01c06cd2"},{"path":"scripts/e2e/battle-reforge-adapter.mjs","lines":"160","anchor":"running = runBattleTrial(","role":"public-trial-adapter","sha256":"bb56c139b614c1e96cda282b7bb4882b4b0705c2f198113cb3e933a5ce20a5d1"},{"path":"scripts/e2e/battle-trace-contract.mjs","lines":"803","anchor":"export function validateBattleTrace(","role":"oracle","sha256":"bfd60f7ccff77ca0da3ae01226cebaf35a349b4d9f06c7bb3bd6921b00d08f7e"},{"path":"scripts/e2e/battle-foundation-compare.mjs","lines":"34","anchor":"export async function compareBattleReports(","role":"offline-caller","sha256":"3416cf2ebd78dc900dad4da75a78157ab7d5545f4fb5c5bc5c6dcc95e3e491bd"},{"path":"scripts/e2e/battle-presentation.mjs","anchor":"export function validateBattlePresentation(","role":"render-oracle","lines":"969","sha256":"cd1417c20254734630795024be6759b0f6eb4c4d6e7120de4c3f7cf498947280"},{"path":"scripts/e2e/battle-rules.mjs","anchor":"export function validateBattleRules(","role":"rule-oracle","lines":"94","sha256":"6ae0910e42220f02ddabd5bbcf02cfdc070b2bd760f48d2a8b0c82d8d6b31002"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"audioStarted(cueId, assetId, buffer, context, source)","role":"native-audio-observer","lines":"198","sha256":"f9169de66e0d4c68e97fd5ff824bb06bc217d3c27da329d36a107a3960c33404"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"37","sha256":"1b71085e0366bdc038657650c3748ceae154aee515132298f8087c6820f5fae2"},{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"15","sha256":"38304c11c183165574b0c20440fe1d1222a05b8c160062dd6ff2d3bda3c52f13"}],"publicCallers":["node scripts/e2e/battle-foundation.mjs --engine=game","node scripts/e2e/battle-foundation.mjs --engine=reforge","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=herb-settlement --repeat=1 --counter=double-herb","node scripts/e2e/battle-foundation.mjs --engine=game --scenario=equivalent-poison --audio-review","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=equivalent-poison --audio-review","node scripts/e2e/battle-foundation.mjs --engine=game --scenario=automatic-block --audio-review","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=automatic-block --audio-review","node scripts/e2e/battle-foundation.mjs --engine=game --scenario=lantern-player-casualty --audio-review","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=lantern-player-casualty --audio-review"],"legalInputs":["Three explicit legal fixture setups: solo/team1, hero-WuHou-Anu/team3, injured hero-Anu/team1 with two herb99; battlefield7, normal manual battle, mulberry32 seed1729.","Each engine runs each setup twice in fresh contexts. Public Game applyFixture and Reforge runBattleTrial prepare the state; all later commands use real keyboard/menu selection.","Effective starting equipment/stats are read from each engine and compared; content23/minimumSAVE12, exact raw and author JSON source pool is hashed. No Q1 speed-win or user save data is used.","Two-round seed4: hero and Wu Hou, one ordinary team1 lantern, heal296 and two herb99, one guarded enemy hit and one confirmed ally retarget after Escape.","Solo hero/team294, field7, seed64, defend then attack. Full original two-entry enemy queue.","Level-six hero and Anu/team204, seed4, native enemy sleep. The awake actor defends and finishes the battle.","Solo hero/team115, seed72, two units of item87. Defend, self-use antidote through the item menu, then attack.","The PAL Li Xiaoyao portrait probe binds raw indexed UI frame 48, the actual authored face PNG and both standard color table sources. It samples the six fixed local coordinates while selecting in turns 1, 2 and 3.","Use the seven existing native fixtures for the audiovisual pass. The twenty-four original and authored WAV pairs bind byte identity and original mono PCM frame counts. Single-context browser audio reviews use the same candidate and normal input, with Game starting after its loading surface naturally detaches.","Healthy solo Li Xiaoyao against team115, seed11 and base speed1. The player submits attack; the enemy acts first and the native third draw reaches block threshold 10. The seed72 active-defend and poison fixture remains unchanged.","Two normal turns against raw team 1, field 7, seed 6, level-five Li Xiaoyao and Anu. Li enters with 40/40 HP and 9 equipped defense. Both defend in turn 1. Li defends and Anu attacks in turn 2. Li’s guardian is absent."],"businessOracle":{"type":"q2-finite-state-and-native-repeat","assertions":["Exact start state and five enemy slots, submitted command actor/target/order and completed action before/after state.","One/three distinct HP30 lanterns receive the selected lethal ordinary attacks, with no undeclared autonomous enemy action.","Herb99 heals hero50 to100 and consumes exactly one of two; formal victory yields hero125, exp1 and cash3. Party victory gives each member exp3 and cash9.","Formal settlement commits exactly once; all three cases pass independent state oracles, cross-engine effective-state comparison and same-engine native/rule-RNG repeat checks.","A real isolated double-consumption mutant fails business/action-after at actions[0].after with inventory2 tozero; restoring normal serve mode passes. Missing hashes, input receipts and fresh contexts are rejected by the offline entry.","Real rendered frames show the manual selection HUD, hide it during action and settlement, finish each enemy fade before the next action, and draw herb50 on the returned actor with the original recipient anchor.","The fixed ordinary attack cases check CLASSIC draw purposes, queue jitter, untruncated attack numbers and clamped enemy HP. Actual draws are logged at their producers.","The two-round case checks guard, real enemy damage, a single herb consumption, cancellation and same-actor retarget, heal296 MP and recipient HP, and single settlement.","Team294 consumes no singleton target draw. Native dual actions use 339 for HP94 then normal attack for HP44, with separate raw and rendered results.","Team204 consumes the native battle script chance draw. Sleep3 applies to hero, round ends tick 3→2→1, and the incapacitated slot passes without a submitted action.","Team115 passes the equivalent-item and 0x29 resistance rolls. Direct blue1 is separate from immediate poison HP7 and round-end HP7. Item87 consumes one and cures 551 before the next round.","The actual Li Xiaoyao portrait shows the original RGBA values before poison and after item87, and exact SDLPal palette-ramp RGBs while poison551 is active. Two transparent pixels preserve their drawn destination.","In team115, first actual round-end blue7 precedes the next selection HUD by the original eight-tick feedback hold. The cured round has no new number and opens selection on normal scheduling.","After the first native command, each of the 45 finite expected action cues has one real connected AudioBufferSourceNode start on a running context and the matching nonzero decoded WAV. Request order, repeated cue identity, actual action windows, enemy windup and enemy fade edges are checked.","In seed72, the first drawn impact and recoil use frame4. The first actual return and the remaining turn1 recovery use frame3, then the round-end poison number appears in idle frame0.","In seed11, the first drawn enemy charge already shows player frame3 and retains that pose through knockback. Recovery returns to the original idle frame. HP is unchanged, no damage number is drawn, and the actual strike cue starts the player cover WAV 015.","In seed72, the native active-defend commit, executed guard action, first drawn defense, first drawn enemy windup and first blue physical damage occur in that order. The two one-tick intervals must each lie in 20–65 ms; the attack-to-damage interval is 280–360 ms. Two native cross-engine pairs also verify a command-to-windup difference within one CLASSIC tick.","The lantern hits Li for 35 then 5. The actual impact frame 4 and two recoil positions precede first return frames 1 and 2. Native sound 019 starts after the dying pose; 023 starts around second recoil and before the fallen pose. Each appears once and the regular hit sound 352 still starts at each impact.","After lethal damage the native equivalent-item roll is consumed, with zero rate. Li’s selected action is skipped and Anu’s real 976 raw damage wins. The original victory reward leaves Li with zero earned EXP and 20 HP after half recovery, Anu with one EXP and 150 HP, and awards cash 3 once."]},"dedupe":{"result":"bounded-distinct","against":["Q1 001-010 speed-win story verification","battle-host and battle-session source audits","existing rule/unit tests"],"notes":"Finite browser/runtime/collector obligations only. AI, status and poison credit is restricted to the declared cases. Full rules, audiovisual conformance and world/save lifecycle remain open."},"revision":{"currentSha":"55d5512d81a87660185b17afad621a3d33e9e5a0","contentVersion":23,"minimumSaveVersion":12,"history":[{"revision":"a8673cfcc9fc5767a6d02a3895964e7977bd7e16","date":"2026-11-07","action":"first-batch-native-normal-battle-foundation","scope":"12 clean native battles plus real item counter/restoration, original-byte offline comparison and entry integrity controls; human visual pending"},{"revision":"54d7b378d5094950c10b73bb38a81883cd3d375d","date":"2026-11-11","action":"native-battle-presentation-and-two-round-rules","scope":"First-batch rendered regressions, ordinary single-target rolls and damage text, and manual two-round defend/use/cast/cancel/retarget.","predecessor":"a8673cfcc9fc5767a6d02a3895964e7977bd7e16","historicalReceiptRevision":"18fac8f47fbb002bf76a4c97283225c7156447f2","archive":"docs/tasks/evidence/E2E-Q2-1-battle-followup-20261111.tar.gz"},{"revision":"e746620556cf961eed871ec3f8038f5223d37357","date":"2026-11-11","action":"native-battle-enemy-ai-sleep-and-equivalent-poison","scope":"Fixed native PAL teams 294, 204 and 115, dual action, enemy sleep and equivalent poison application, decay and cure.","predecessor":"54d7b378d5094950c10b73bb38a81883cd3d375d","historicalReceiptRevision":"3a921678f20950cccee3f631dfbb1e60bb8efa3b","archive":"docs/tasks/evidence/E2E-Q2-1-battle-mechanisms-20261111.tar.gz"},{"revision":"4f1bea68f897ca59d4a2cd892e7619ffdebe479e","date":"2026-11-11","action":"native-equivalent-poison-portrait-colors","scope":"User-reported red poison portrait. Real selection-frame samples confirm four opaque shades, two holes and normal color after the antidote.","predecessor":"e746620556cf961eed871ec3f8038f5223d37357","historicalReceiptRevision":"18bfe998333912bf2b1449e534133ce73cafca44","archive":"docs/tasks/evidence/E2E-Q2-1-battle-poison-face-20261111.tar.gz"},{"revision":"5d42c84ffaa20fb5cb3b8df3a57c8c248342b7e3","date":"2026-11-12","action":"native-battle-round-feedback-and-action-audio","scope":"Seven fixed battle fixtures with actual rendered round boundaries and twenty-four source-bound WAVs. Runtime-backed feedback timing and named audio cues, with a separate browser-mix review.","predecessor":"4f1bea68f897ca59d4a2cd892e7619ffdebe479e","historicalReceiptRevision":"5a3093c93746d6e04e8f569ef526e07778aa439f","archive":"docs/tasks/evidence/E2E-Q2-1-battle-av-20261112.tar.gz"},{"revision":"3ac5c7b8b42c967b51ca12c9ddeeba6b1397ee9b","date":"2026-11-12","action":"native-physical-guard-pose-and-block-sound","scope":"Actual drawn fighter pose at ordinary impact, guard recovery and first auto-block charge, with independent native action, damage and audio receipts. Eight finite browser fixtures.","predecessor":"5d42c84ffaa20fb5cb3b8df3a57c8c248342b7e3","historicalReceiptRevision":"8cc7f427e64cdff70a12454f601c8c17747fd58e","archive":"docs/tasks/evidence/E2E-Q2-1-battle-guard-20261112.tar.gz"},{"revision":"f38df3e308b7b0c6df5a4fbb883fbb1f77cb864f","date":"2026-11-12","action":"native-defend-to-enemy-action-cadence","scope":"Command, actual defense pose, enemy onset and first physical damage in the same legal seed72 fight, with the eight-fixture matrix and independent stereo review.","predecessor":"3ac5c7b8b42c967b51ca12c9ddeeba6b1397ee9b","historicalReceiptRevision":"d0020e0749483651d9b0f86cf79ef738ac34663e","archive":"docs/tasks/evidence/E2E-Q2-1-battle-action-cadence-20261112.tar.gz"},{"revision":"55d5512d81a87660185b17afad621a3d33e9e5a0","date":"2026-11-12","action":"native-player-physical-casualties-and-survivor-continuation","scope":"Rendered direct physical dying, fallen poses and actual sounds, lethal RNG consumption and victory reward eligibility in a legal two-round fixture.","predecessor":"f38df3e308b7b0c6df5a4fbb883fbb1f77cb864f","historicalReceiptRevision":"58812c028ebd87dd75a9c5dda46a4ec997fb4b09","archive":"docs/tasks/evidence/E2E-Q2-1-battle-player-casualties-20261112.tar.gz"}]},"evidence":"domains/cross-phase/battle-foundation/evidence.json"}
-->

Provenance: 两端原生执行、实绘时间线、独立业务预期、原件离线重比和独立代码复核。
Primary source: [机器回执](evidence.json) · [玩家物攻伤亡原件](../../../../tasks/evidence/E2E-Q2-1-battle-player-casualties-20261112.tar.gz) · [行动节拍原件](../../../../tasks/evidence/E2E-Q2-1-battle-action-cadence-20261112.tar.gz) · [防御复位与自动格挡原件](../../../../tasks/evidence/E2E-Q2-1-battle-guard-20261112.tar.gz) · [动画与音效原件](../../../../tasks/evidence/E2E-Q2-1-battle-av-20261112.tar.gz) · [赤毒头像返工原件](../../../../tasks/evidence/E2E-Q2-1-battle-poison-face-20261111.tar.gz) · [第三批原件与分屏](../../../../tasks/evidence/E2E-Q2-1-battle-mechanisms-20261111.tar.gz) · [前两批复验](../../../../tasks/evidence/E2E-Q2-1-battle-followup-20261111.tar.gz) · [首批原件](../../../../tasks/evidence/E2E-Q2-1-battle-foundation-20261107.tar.gz)
Scope: 九个固定局面的正常战斗，涵盖实际绘制、单体普攻、多回合操作、敌双动、睡眠、附毒、赤毒头像、回合末反馈、防御和格挡、行动节拍、玩家物攻伤亡与具名动作音效。
Revision: `55d5512d81a87660185b17afad621a3d33e9e5a0`，content23 / minimumSAVE12。
History: 2026-11-07 发布首批业务闭环。2026-11-11 复验绘制、普攻和多回合操作，并加入三个敌方机制局面。2026-11-12 复验回合节拍、动作音效、防御复位、自动格挡、主动防御至首次命中的行动节拍及玩家物攻伤亡。
Supersedes: 无。
Stop line: 覆盖以下固定局面及所列机制。敌全体法术、变身召唤、普攻附带封技或昏睡、其它毒组合、玩家伤亡对白、法术及毒伤的玩家伤亡表现、背景音乐、地图回流及存读仍待对应局面。
Next step: 继续第四批的伤亡对白与其它音效分支、背景音乐，再按生命周期范围接世界回流。

## 2026-11-11 首批表现返工

两端按相同三个局面各跑两次。先在旧运行时采实际画帧，再在候选 `1102c66d8d16f8f287c6dd3ac57b1029b47f4070` 复跑。
旧版的业务动作和结算可通过，新判据按首次异常帧拒绝 Reforge。候选的 12 场原生执行、六组双端和六组同端重比通过。

| 义务 | 旧 Reforge 原生反例 | 修复复验 |
| --- | --- | --- |
| 底部队员信息框 | 三人战执行阶段仍绘制槽 0、1、2。 | 手动选招与目标时实绘，行动及结算时隐藏。 |
| 死亡淡出 | 巫后首动画在第一只灯笼消失前约 917 ms 开始。第二只灯笼与阿奴的动作也重叠。 | 两次非末敌淡出约 1167 ms，下一动作均在实际消失后约 17 ms 开始。末敌保留作者选定的额外结算停拍。 |
| 止血草回位与黄字 | 逍遥位于 (185, 169) 时画黄字 50，右缘与起始 Y 为 (191, 94)，比归位早约 317 ms。 | 两端均在回位至 (200, 176) 的同一画帧画 50，右缘与起始 Y 为 (206, 101)。 |

比较以动作和敌实例关联淡出开始、最后实绘、消失和后续首帧。各端轨迹记录画帧时钟、实际底栏槽及用药数字，比较器使用真实时钟核顺序和时长。Game 使用分步淡出，Reforge 延续作者选择的 alpha 渐隐。

三灯笼战斗和止血草用药两段分屏的用户验收见任务卡。 [验收记录](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#用户验收)

## 2026-11-11 第二批规则与操作

CLASSIC 的队列随机分配为先敌后我。单体普攻先加值、判暴击和角色加成，再乘浮动。本次普攻各击次完成后抽取体力经验权重。采集在真实随机调用处记录用途，队列另记回合、阵营、槽位和参与计算的身法。多人样本修复后两端原伤和实际绘制的蓝字均为 242、340、857，每只灯笼实际扣血 30。旧 Reforge 巫后和阿奴原伤为 354、908，蓝字均为 30。证据来源及反例见 [Q2 任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md)。

双回合样本固定种子 4。第一回合逍遥防御，巫后给逍遥用止血草，灯笼随后攻击逍遥并造成 1 点伤害。第二回合逍遥在选择自己的施法目标时取消，再施放气疗术给巫后。巫后普攻击败灯笼。两端实录四次玩家提交和五次实际行动，止血草库存 2→1，施法真气 100→94，防御在下一回合开始时清除。

冻结候选在四个固定局面中各用两个新上下文跑两端，共 16 场。八组双端及八组同端比较均通过独立业务、画帧和规则判定。两个额外测试工具误报各有原件，分别核实为最后一次提交后的同回合过渡和新一回合选招尚未开始。修正观测窗口后按同一条件复跑。

原速分屏与各端实际轨迹共同归档。比较报告可按场景、动作和对象定位首个差异。当前用药判定覆盖自用及对队友用药，施法判定覆盖这次气疗术。完整战斗节奏、伤害法术、致死敌普攻的随机用途和音画仍按对应后续范围核验。

## 2026-11-11 第三批敌方 AI、状态与特殊机制

七个局面的每一例，两端各用两个全新的浏览器上下文，共 28 场正常战斗。14 组双端原件比较和 14 组同端重复均通过固定业务、随机用途与所列实际绘制判定。

| 局面 | 实际动作与状态 | 日志判据 |
| --- | --- | --- |
| 镰刀鼬 `dual-sickle-weasel`，队 294，seed64 | 第一回合防御后，敌先弦月斩扣 94，再普攻扣 44。李逍遥 HP 400→306→262，第二回合普攻击败敌人。结算 HP331、经验110、钱220。 | 双动各自入队。一人队伍的选靶区间无 RNG 消费。核整场 19 抽及普攻蓝字 44、865，最后一击有效伤害 710。 |
| 半人树妖 `enemy-sleep`，队 204，seed4 | 回梦命中逍遥，HP 150→149，睡眠 3→2→1。第二回合逍遥的原生行动槽跳过，阿奴仍可选招和出手，第三回合击败敌人。 | Game 0x06 与 Reforge 敌侧效果门都按战斗种子掷 8。核四次玩家提交、七个真实行动结果、两个回合边界及 21 抽。结算清除逍遥睡眠。 |
| 血口虫 `equivalent-poison`，队 115，seed72 | 首击物理 1，赤毒立即扣 7，回合末再扣 7，HP 150→142→135。下一回合雄黄 2→1 并解毒，随后只受物理 1，回合末维持 HP134。结算 HP142、经验14、钱9。 | 分别采附带率 4、外层毒抗 83 和 0x29 毒抗 92。首击画蓝字 1，回合末画 7。以原生毒槽、回合快照和耗药回执验证实际状态，整场 21 抽。 |

实际回合事件由队列耗尽的生产者采集，包含前后状态、原生毒槽游标和全局序号。睡眠的跳过事件与玩家提交独立，血口虫的实际物理伤害与总 HP 变化独立。数字通过原生渲染对象追踪其首次绘制，避免把镰刀鼬前一招尚在屏幕上的 94 认作普攻 44。 [固定局面](../../../../../scripts/e2e/battle-foundation-scenarios.mjs) · [原版与运行时依据](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#2026-11-11-第三批准入)

基点 Reforge 的镰刀鼬仍结算胜利，离线业务判据在首个敌动作定位到普攻取代弦月斩。只去掉附毒内层毒抗时，血口虫在雄黄使用后重新上毒，第二回合普攻后 HP127，回合末 HP120，业务判据在该动作后拒绝。Game 旧随机源实跑的回梦结果为 HP150、无睡眠，下一回合仍向逍遥开放菜单。该反例核同输入至回梦的原生轨迹前缀，并由定向测试证实随机来源错误。 [反例回执](evidence.json)

赤毒回合末的 7 点已在两端绘制。到下次开放选招的间隔，两次 Game 为 348.2、348.5 ms，两次 Reforge 均为 16.6 ms。该差异保留在规则观察和第四批待验范围。附毒致死的受击动作另做定向回归，完整死亡音效与濒死姿态随音画专项核对。三个新增局面已生成正常速度可暂停的静音分屏，左 Game、右 Reforge。 [原件及比较](evidence.json)

## 2026-11-11 赤毒头像返工

用户在血口虫分屏发现赤毒头像过暗。SDLPal 将头像原像素的低四位和毒色高四位组合，按 16 色段绘制。旧 Reforge 取该色段单个 RGB 再乘亮度。PAL 五张小头像共 3,905 个实色像素，当前作者 RGBA 与原索引及标准色表一致，所有这些颜色均可恢复唯一亮度档。新版按原档位选择毒色段，自定义表外颜色按亮度选档。

固定原头像 36×35 的四个实色点和两个透明点。两端采集头像实际绘制前后像素，核 HP150 未中毒、HP135 赤毒和 HP134 雄黄解毒后的选招画面。Game 实读索引帧缓冲与当前色表，Reforge 实读画布。旧 Reforge 赤毒画帧被 `portrait-palette` 拒绝，四个点的红色通道为 33、24、14、0。修复后两端对应为 178、121、69、52，四点 RGBA 均与原盘红阶相同，透明处画前画后相同，解毒恢复原色。

冻结候选再跑 28 场，14 组跨端和 14 组同端比较通过。血口虫的四次执行均记录三个状态的实绘样本。归档包含正常速度分屏、两端各自 HP135 的画面截图、旧版失败与恢复原件。 [头像返工原件](../../../../tasks/evidence/E2E-Q2-1-battle-poison-face-20261111.tar.gz) · [机器回执](evidence.json)

## 2026-11-12 第四批动画节拍与音效

以相同血口虫局面的原生回合结束、新蓝字 7 首次实绘和下一次选招底栏核等待。基点 Reforge 两次均约 17 ms，被 `round-end-selection-early` 拒绝，原战斗正常结算。修复在会话表现时钟上等满 320 ms，再处理下一轮起手和选招。解毒后无新数字的回合从原生回合边界直接量到选招。 [原版节拍](../../../../../reference/sdlpal/fight.c#L1664) · [真实比较](evidence.json)

| 血口虫边界 | Game 两次 | Reforge 两次 |
| --- | --- | --- |
| 赤毒 7 点首绘至下一次选招 | 348.2、348.3 ms | 333.4、333.3 ms |
| 雄黄解毒后无新数字至下一次选招 | 50.5、49.8 ms | 16.7、16.7 ms |

原始和作者 WAV 的 24 个配对文件逐字节相同。采集记录真实请求、浏览器解码后 buffer 的路径、帧数和非零 PCM，以及 running context 上实际 `AudioBufferSourceNode.start()` 返回。比较按动作与原生绘制找声效，校验同一请求与 buffer、实际顺序、前摇和死亡的画面边沿，并记录冷缓存的请求到启动间隔。Game 客栈开场声 098 的原始记录保留，战斗音效义务从首个真实指令开始。 [配对回执和音源](evidence.json)

旧 Reforge 四个局面完成正式战斗，但音效比较分别报出灯笼 050、镰刀鼬 368、半人树妖 265 与血口虫 357 缺失。已配置的 `sounds.attack` 接入敌普攻原有首帧，之后仍有命中和死亡各自的声源。修复后同候选实跑 28 场，14 组双端和 14 组同端比较通过。全矩阵核到 180 次具名动作音效启动，血口虫两轮的 357 分别实际启动。

另用相同候选单场重录血口虫，两端都捕获并解码了非零 Web Audio 混音。7.55 秒分屏从各自录制中首个可见选招画面开始。Reforge 录制的第 0 帧已在选招，Game 剪去前 39.8 ms。左画面和声道是 Game，右画面和声道是 Reforge。复核剪辑保留原速，先结束的一侧停帧。动作判定取独立 verify 原件。 [带声分屏与执行原件](../../../../tasks/evidence/E2E-Q2-1-battle-av-20261112.tar.gz)

本次记录了起手、命中、施法、用物、敌死亡和回合反馈的具名边界。两端用物的起始位移时长有差异，声音都在各自举物演出时触发。Game 镰刀鼬施法起手音较 SDLPal 两段滑动后触发的源码顺序早一个逻辑帧。玩家濒死与阵亡、Win95 无法术敌方第二动的特殊音、音量与背景音乐轨的专项核验继续留在第四批。 [任务范围与来源](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#2026-11-12-第四批动画与音效)

## 2026-11-12 防御受击复位与自动格挡

血口虫主动防御局面的两端日志均只执行一次防御。普通命中实际扣 1 点，命中闪色及两段击退使用受击帧 4。旧 Reforge 击退后首个回位画出站姿帧 0，停约 200 ms 才恢复防御帧 3。修复后首个回位直接画防御帧 3，保持到回合结束，赤毒 7 点首次绘制时已回站姿帧 0。比较器以两段实绘击退和第一个归位为边界。 [SDLPal 物攻](../../../../../reference/sdlpal/fight.c#L4915) · [实绘回执](evidence.json)

同一血口虫以种子 11 先于低速李逍遥出手。李逍遥的唯一指令是攻击，原生第三次随机抽样达到自动格挡阈值 10。正常站姿持续到敌冲到目标前，随后格挡帧 3 贯穿冲锋、命中与击退，首次回位恢复站姿帧 0。两端 HP 均为 150，无受击数字。原始和作者的格挡 WAV 015 逐字节相同，已解码音源在浏览器上实际启动，普通命中使用 092。旧 Reforge 在首次冲锋仍画站姿，原件由比较器拒绝。 [格挡起姿与音效](../../../../../reference/sdlpal/fight.c#L5010) · [原件与两段原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-battle-guard-20261112.tar.gz)

冻结候选 `3ac5c7b8b42c967b51ca12c9ddeeba6b1397ee9b` 的八个局面共 32 场，16 组双端、16 组同端比较通过。核对 25 种原始音源上的 200 次动作音效启动。主动防御及自动格挡各自用同一候选重录带声分屏，两侧从同一条已提交指令对齐并保留原速。完整的玩家濒死与阵亡演出及背景音乐仍待专项复验。 [机器回执](evidence.json)

主动防御指令提交至血口虫首次命中飘字，Game 两次为 400.4、399.9 ms，Reforge 为 849.5、850.4 ms。差值主要位于敌人开始演出之前，选招后到动作启动的节拍仍待核。 [实绘原件](../../../../tasks/evidence/E2E-Q2-1-battle-guard-20261112.tar.gz)

## 2026-11-12 主动防御至首次命中的行动节拍

前一次两组实跑的约 450 ms 差值由两个普通队列等待造成。Reforge 从建队到执行防御、从执行防御到下一条敌人动作，各经过一次 240 ms 门。Game 在最后一条指令提交时建队，随后按 CLASSIC 40 ms 战斗帧派发。Reforge 复用同一个 40 ms 战斗帧长度，首拍计入开始准备时已经过去的游戏帧，音效准备期间继续阻塞。分开核对提交、原生防御、首次画出防御、敌起手和首个蓝色物理伤害数字。 [原版派发](../../../../../reference/sdlpal/fight.c#L1710) · [调度器](../../../../../packages/reforge/src/battle/battle-action-presentation-scheduler.ts) · [本次原件](../../../../tasks/evidence/E2E-Q2-1-battle-action-cadence-20261112.tar.gz)

| 局面 | 提交至防御（ms） | 防御至敌起手（ms） | 敌起手至命中（ms） | 提交至命中（ms） |
| --- | ---: | ---: | ---: | ---: |
| 1 Game | 50.9 | 36.0 | 313.6 | 400.5 |
| 1 Reforge | 51.1 | 50.0 | 332.7 | 433.8 |
| 2 Game | 50.8 | 35.8 | 315.0 | 401.6 |
| 2 Reforge | 49.6 | 50.6 | 332.4 | 432.6 |
| 带声 Game | 50.6 | 36.0 | 313.5 | 400.1 |
| 带声 Reforge | 50.7 | 50.8 | 333.1 | 434.6 |

两个正常复跑的提交至敌起手差值为 14.2、13.6 ms，提交至首个蓝色 1 的差值为 33.3、31.0 ms。实绘仍随浏览器刷新采样。前三段分别按 20–65、20–65、280–360 ms 判定，独立校验首个同对象伤害数字的身份和顺序。旧 Reforge 的两份实际完赛轨迹均只在前两段被拒绝，旧 Game 的两份轨迹通过。提前绘制相同数字的反例检出首个伤害画帧错误。 [机器回执](evidence.json)

冻结候选 `f38df3e308b7b0c6df5a4fbb883fbb1f77cb864f` 的八个局面共 32 场，16 组双端与 16 组同端比较通过，实际启动 200 次动作音效。防御、自动格挡、死亡淡出、回合反馈、物品与结算均在现有矩阵内复验。分屏由同候选的独立带声捕获生成，按第一次实际防御提交对齐，左侧和左声道为 Game，右侧和右声道为 Reforge，保留 1 倍速。 [原件、比较与分屏](../../../../tasks/evidence/E2E-Q2-1-battle-action-cadence-20261112.tar.gz)

## 2026-11-12 玩家物攻濒死和阵亡

固定为灯笼队 1、战场 7、种子 6，李逍遥与阿奴同队，林月如在队外。第一轮两人防御，第二轮李逍遥防御、阿奴普攻。两次敌普攻使李逍遥 40→5→0。两次命中都画受击帧 4，蓝字依次为 35 和 5，实绘两段击退后各自回位到濒死帧 1、倒地帧 2。普通受击音 352 照常。濒死声 019 在首次回位后启动，阵亡声 023 随第二段击退启动且早于倒地画面。两条音分别核声音请求和实际 AudioBufferSourceNode 启动，重复、早响和迟播各可拒绝。 [原版物攻](../../../../../reference/sdlpal/fight.c#L5052) · [原版濒死声](../../../../../reference/sdlpal/fight.c#L824) · [机器回执](evidence.json)

旧 Game 缺 019，023 在阿奴击杀和灯笼淡出后才发。旧 Reforge 两声均缺，致死后少一次灯笼附带率抽样，下一击原伤 984，倒地的李逍遥还获得经验 1。复验两端第 16 次随机抽样均用于致死一击的附带率，李逍遥的已提交防御被跳过，阿奴实际以原伤 976 击杀。结算李逍遥经验 0、半恢复至 20 HP，阿奴经验 1、150 HP，钱增加 3，结算一次。 [原版经验资格](../../../../../reference/sdlpal/battle.c#L1087) · [修前原件与修后复验](../../../../tasks/evidence/E2E-Q2-1-battle-player-casualties-20261112.tar.gz)

冻结候选 `55d5512d81a87660185b17afad621a3d33e9e5a0` 的九个局面共 36 场，18 组双端与 18 组同端比较通过。核对 27 种原始声源上的 236 次实际动作音效启动。灯笼局面从同候选独立带声捕获，按首次真实提交对齐，保留 1 倍速。两端正常队友续战已覆盖。队中守护者触发的伤亡对白、法术和毒造成的伤亡演出继续待对应原件。 [复验归档](../../../../tasks/evidence/E2E-Q2-1-battle-player-casualties-20261112.tar.gz)

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

离线入口先核报告原字节、trace SHA/长度、依赖闭包及当前源码/JSON输入、真实输入回执和对应场景矩阵的新 context，再重算业务、规则和画帧判定。当前矩阵每端十八个独立 context。独立试打沿用专用测试快照。

## Results and gaps

以下是 2026-11-07 首版冻结时点的结论。

十二场正式运行、六组跨端比较和六组同端重复全部通过。独立双扣药运行准确失败于合法行动后的库存断言；恢复运行和入口反控恢复均通过。候选、命令、原件指纹及失败身份在机器回执和归档索引内。原件恢复：在仓库根解开归档，保留成员路径；使用记录的候选和同指纹本地原始资源复验。运行候选和贡献者Git对象的恢复bundle均在归档内。

Reforge原报告保留一条预期404提示：现有runner仅将 `/projects/pal/.type-pal/save-state.json` 的缺省状态404归入warnings，其它资源错误仍使运行失败；本批无浏览器errors，未把这一条运行提示称为静态门诊断或资产读取成功。

本轮选高攻、不同速度的简单局面证明入口与比较链有效，不把击杀结果当作伤害公式正确。已保留多人样本的原生差异：巫后340/354、阿奴857/908；Reforge日志保留未截断伤害，屏幕飘字显示有效扣血30。随机调用的分配与显示数字差异仍开放，分别进入后续规则和表现核对，未在本轮改机制。采到音效请求或render调用也不等于音画正确。

## Quality gate

2026-11-11 复验的实际候选、全仓检查和受保护 CI 取任务卡。首版质量回执如下。

贡献者分支由root独立复核，发现的六项入口/证据缺口已整改，最终只读复核无剩余项。22项定向工具测试、四个真实原件入口反控、原生业务反控与恢复原件均保留；全仓静态/测试与受保护CI按 [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md) 的最终回执核。代码治理新增21路径仍pending，未把本批工具验证冒充逐文件专项closed。

[独立入口与导航](README.md) · [E2E合同](../../../e2e/contract.md)
