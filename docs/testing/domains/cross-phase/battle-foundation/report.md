---
testingSchema: 2
id: q2-battle-foundation
evidence: domains/cross-phase/battle-foundation/evidence.json
---



# Q2 正常战斗覆盖报告

Status: verified
Owner: Codex
Last reviewed: 2026-11-17
Template: test-domain-report-v1 / 1.1.0

<!-- testing-meta
{"schemaVersion":2,"id":"q2-battle-foundation","sourceRefs":[{"path":"scripts/e2e/battle-foundation.mjs","anchor":"await runBrowserJourney({","role":"caller","lines":"61","sha256":"b6620a8b33c3d3103ace89d3890ceee0f3a6f795641af16aba5cb4616e71c8ca"},{"path":"scripts/e2e/battle-foundation-scenarios.mjs","anchor":"function defineScenario(","role":"input-and-independent-oracle","lines":"286","sha256":"5ac3e05bc0a6b80099c3b956256048832a974abdabc27757017eff9fea587ea3"},{"path":"scripts/e2e/battle-game-adapter.mjs","anchor":"launch(input) {","role":"public-fixture-adapter","lines":"486","sha256":"77340c8dfc43b751fb160fd1d44c677ce453a507af37cf439ac7be2b55f9a73a"},{"path":"scripts/e2e/battle-reforge-adapter.mjs","anchor":"running = runBattleTrial(","role":"public-trial-adapter","lines":"179","sha256":"dd90cb64282e9e2b32696418d288dff2334ea6c5440e06243108798b5131926f"},{"path":"scripts/e2e/battle-trace-contract.mjs","anchor":"export function validateBattleTrace(","role":"oracle","lines":"1014","sha256":"f475eba68766bd881c16938fe3413141cbf5e2c660e7851490c0999670a782eb"},{"path":"scripts/e2e/battle-foundation-compare.mjs","anchor":"export async function compareBattleReports(","role":"offline-caller","lines":"33","sha256":"072ff97dc30494bf8a11301a5e12cd3e9c4e743b216997d14accaa11b9ec3a70"},{"path":"scripts/e2e/battle-presentation.mjs","anchor":"export function validateBattlePresentation(","role":"render-oracle","lines":"1694","sha256":"1de64f86391efe35d22f15359d2ed913979002820de3561c574cf796c0960e4b"},{"path":"scripts/e2e/battle-rules.mjs","anchor":"export function validateBattleRules(","role":"rule-oracle","lines":"185","sha256":"6de10c44ba110295b380fdd9454c1133bdb1b0c6adab99fac49bb2e54fa4c134"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"audioStarted(cueId, assetId, buffer, context, source)","role":"native-audio-observer","lines":"204","sha256":"8f41bde0159f23642d4e27df77b83b42be569719d6366cc82429a058194a2c2b"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"42","sha256":"8742e3d5678a518fcc24127d389dbb2cd6fd899e36e43e4e2a56ce33093b851c"},{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"18","sha256":"a27b2d225e393e7b64f3f39d08ad3502810d1db353b7822f0b1f5242205d8254"},{"path":"scripts/e2e/battle-casualty-presentation.mjs","anchor":"export function compareCasualtyDialogue(","role":"casualty-oracle","lines":"39","sha256":"e1dd2aa55d510d94a865a4c01e934e9654a229afacd43b7770fd081b7b2f9201"},{"path":"scripts/e2e/battle-random-instrumentation.mjs","anchor":"export function instrumentBattleRandomDraws(","role":"native-random-producer-binding","lines":"28","sha256":"142d360697729a2006c38a5c36e8b2cef66a4ad50678ecea5071ea5f8571f683"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"magicOverlayDrawn(x, y, frameIndex, resource)","role":"native-magic-overlay-observer","lines":"309","sha256":"8f41bde0159f23642d4e27df77b83b42be569719d6366cc82429a058194a2c2b"},{"path":"packages/reforge/src/battle/battle-command-selection.ts","anchor":"export class BattleCommandSelection","role":"native-target-menu-caller","lines":"59","sha256":"3f09578da534395781360d9de73a6b0fb4c30e8d417695c5c7ce715aa7f350d9"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"'coop-fallback',","role":"native-cooperative-fallback-observer","lines":"336","sha256":"8742e3d5678a518fcc24127d389dbb2cd6fd899e36e43e4e2a56ce33093b851c"},{"path":"scripts/e2e/battle-enemy-cast-presentation.mjs","anchor":"export function compareEnemyCast(","role":"native-enemy-cast-oracle","lines":"10","sha256":"41e02e54abfa2b039bcf7aff4a2b8ab92b2da18ac30a2fa7f193333cd5ad81f9"},{"path":"scripts/e2e/battle-poison-items.mjs","anchor":"await runBrowserJourney({","role":"native-poison-caller","lines":"40","sha256":"f5aec93f96fa6d80f7d364e9cf2887e25c143186788ea827ecaeb4c007c3160c"},{"path":"scripts/e2e/battle-poison-sources.mjs","anchor":"export async function verifyPoisonSources(","role":"raw-and-authored-poison-inputs","lines":"29","sha256":"ef103f273b5e0c68afcb72cd78ce72301fb9eccd36892c351a1d3305dea4096d"},{"path":"scripts/e2e/battle-poison-compare.mjs","anchor":"export async function comparePoisonReports(","role":"native-poison-offline-oracle","lines":"376","sha256":"4f207ea95628c4a096c13c3067ac3a59545556c6a4943800c9edd5c076d5301a"},{"path":"packages/game/src/present/battle/draw-battle-settlement.ts","anchor":"function drawLearnMagicScreen(","role":"game-scroll-renderer","lines":"245","sha256":"86e247937a178a7052b7c30ed18fe842ba063b97cfdd27602598de9c2290450e"},{"path":"packages/reforge/src/battle/settlement.ts","anchor":"function drawLearnMagic(","role":"reforge-scroll-renderer","lines":"322","sha256":"a8cabfe0f8c62dbffcae25f379b9e5a7bb621c6bc8106c417ca8fa1018bd9be5"},{"path":"packages/reforge/src/menu/menu-box.ts","anchor":"export const SCROLL_LABEL_STYLE =","role":"reforge-scroll-style","lines":"169","sha256":"91c9d891419b35e01e61e8dd51547e1203d260a5b75f5a5ad78384f33f389f85"},{"path":"reference/sdlpal/battle.c","anchor":"PAL_XY(75 + 16 * (w1 + w2) - ww, 115), 0x1B","role":"original-settlement-color","lines":"1321","sha256":"45f38a01d08b864151390c99bcbb4622e3ba78a5da80a3657c276bf1c2fea33f"},{"path":"reference/sdlpal/uigame.c","anchor":"PAL_GetWord(CASH_LABEL), PAL_XY(10, 10), 0,","role":"original-cash-color","lines":"483","sha256":"f981b6a698b6248107ec7934b60ca988055bbab458e516e9aa2b113f8b5419c1"},{"path":"scripts/e2e/battle-status.mjs","anchor":"await runBrowserJourney({","role":"native-special-status-caller","lines":"52","sha256":"f230e6c7984705a238ad0666014a058d30e79dd9dab944d2d292405264ac922b"},{"path":"scripts/e2e/battle-status-scenarios.mjs","anchor":"export async function prepareBattleStatusInputs(","role":"native-status-legal-inputs","lines":"397","sha256":"18a7091d5d94c0340953f94328142b6c6c6f33188e3ed678021518edc9a7cae2"},{"path":"scripts/e2e/battle-status-rules.mjs","anchor":"export function checkStatusRules(","role":"native-status-action-and-frame-oracle","lines":"1138","sha256":"09f23b18627212aac98b70805e4ff5cbed459ffba8658a5f03e656af40ed166b"},{"path":"scripts/e2e/battle-status-compare.mjs","anchor":"export async function compareStatusReports(","role":"native-status-offline-oracle","lines":"222","sha256":"15b09c5b7fc1565672ee432c524e0d847f280c1dcb00150a2a7dec402820cb94"},{"path":"scripts/e2e/battle-world-bee-game.mjs","anchor":"await runBrowserJourney({","role":"native-game-world-caller","lines":"922","sha256":"640737430431148e69bbbe24a6114ddc9eca553170c7bea2c2d3850ba142a7af"},{"path":"scripts/e2e/battle-world-bee-reforge.mjs","anchor":"await runBrowserJourney({","role":"native-reforge-world-caller","lines":"367","sha256":"9cb90702d34b3889ec095d816625e41cc7ddeba81f5be7c9229eafb5c83cc022"},{"path":"scripts/e2e/battle-world-bee-scenario.mjs","anchor":"export const beeWorldInput = {","role":"native-world-legal-input","lines":"30","sha256":"c14d831b1826d394512622c7c53b0519203e59c9af223a6427da053d0b7654ba"},{"path":"scripts/e2e/battle-world-bee-compare.mjs","anchor":"export async function compareWorldBeeReports(","role":"native-world-offline-oracle","lines":"726","sha256":"2ec035cc77cf260794bb73f6568c87cbab9478adef21eff35617ea9f35aa1354"},{"path":"packages/reforge/src/battle/battle-host.ts","anchor":"private async finishEncounter(","role":"world-encounter-finalizer","lines":"289","sha256":"b48a9b7a158ab011f388ac805f7d82db343e74d50e7a55df3a2ecde064ab9099"},{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2506","sha256":"d157bb150c7678582a8cc82ab99d5e6eb51ff4a985907bed8e4ea397f07a1209"},{"path":"packages/content/src/rewards.ts","anchor":"export function recoverBattleParty(","role":"post-world-script-half-recovery","lines":"268","sha256":"3d7b878bebc001942c654e9253e9243eff935dfd83372d7639045dd62a116073"},{"path":"scripts/e2e/battle-world-bee-game.config.mts","anchor":"const start = '    src.start()'","role":"native-game-world-ambient-start","lines":"116","sha256":"6bc6092c2695fde597240fafe6010c8b3a58370b31bcf7bdaa7de9eefa705554"},{"path":"scripts/e2e/battle-world-bee-reforge.config.mts","anchor":"function observeAmbient(source: string)","role":"native-reforge-world-ambient-start","lines":"148","sha256":"25f983e8470931b957981925dfb09959d672ab05be07fdb8191fcb06a3e0be87"},{"path":"packages/reforge/src/battle/battle-entry-presentation.ts","anchor":"export class BattleEntryPresentation {","role":"normal-world-entry-draw","lines":"11","sha256":"58bd25c08443b0f7aaaa8aabe5160b4ae1edf9de2911dd31de8549c4f688bedf"},{"path":"packages/game/src/core/battle/battle-system.ts","anchor":"function tickPostAction(","role":"first-game-exhausted-queue-tick","lines":"2844","sha256":"29cbb0366cc3f2673c449440b1d58ed100cabb04edc92cc678ea20e2adb499fd"},{"path":"projects/pal/content/shared-scripts.json","anchor":"\"environment-sound-duet\": {","role":"pal-ten-mile-world-ambience","lines":"2","sha256":"93aed1ad4fd23c7761f8cc1ddfbccc5e582ea4e023e80368f554f02bbe0de816"},{"path":"projects/pal/manifest.json","anchor":"\"hostileVictoryTransition\": \"fade\"","role":"world-victory-default-inherited-by-pal-hostiles","lines":"7","sha256":"ec4b4ceb924edcf4e30756c22295c84474d38204602b93f2d4830052021820c4"},{"path":"scripts/e2e/battle-world-escape-compare.mjs","lines":"431","anchor":"export async function compareWorldEscapeReports(","role":"oracle","sha256":"303fa5e2f6283714c8afdfa867a1bd06ec2685a74f05170fda265315050f3cd8"},{"path":"scripts/e2e/battle-enemy-escape-compare.mjs","lines":"69","anchor":"function checkRun(","role":"oracle","sha256":"73ce2bddc7bf5afd6fc78c88498de44c2899fd06b816743585d7d2f570de822a"},{"path":"scripts/e2e/battle-scripted-defeat-compare.mjs","lines":"678","anchor":"export async function compareScriptedDefeat(","role":"oracle","sha256":"44b2c69733e14a3d37fc472d3d95937816c32bb3f4f32f0ee1ddc6f73bd461cd"},{"path":"scripts/e2e/battle-world-save-compare.mjs","lines":"559","anchor":"export async function comparePostBattleSave(","role":"oracle","sha256":"6411e87146ce94aecb0a4ecacffaff503eae313b78a3d2021c1fe14698d69b89"},{"path":"scripts/e2e/battle-world-review-split.mjs","anchor":"function nativeVideoEnd(path)","lines":"25","sha256":"492c257d49c673662a6aa2cbe5d047188f6ceab5fea18ad0b6773bf2a2fc7f4c","role":"visual-review"},{"path":"scripts/e2e/battle-world-escape.mjs","anchor":"export async function verifyWorldEscape({","lines":"85","sha256":"1cc55f66c0c6971c65573405041323a8dd5db5c32b967ea037e0ebcfb18ab458","role":"native-caller"},{"path":"scripts/e2e/battle-world-escape-exits-compare.mjs","anchor":"function judgeExit(engine, trace","lines":"17","sha256":"dcc4aaa8ecb161f45048fd61cd4c20dbbcfd8c1e5dbd612282eb864e51918a28","role":"oracle"},{"path":"scripts/e2e/battle-world-save.mjs","anchor":"function beginLoadPaintWitness(engine)","role":"native-save-paint-observer","lines":"54","sha256":"66fe531962f7d572e7557e141c7d41d46c17715dc8294a79736793e81630e57c"},{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5951","sha256":"f29814e0be6beb911245b97850a7aba8a08c9f7a80c938a6d0585b9e97499324"},{"path":"packages/reforge/src/menu/save-browser-box.ts","anchor":"export function drawSaveBrowser(","role":"saved-slot-menu-caller","lines":"184","sha256":"279e4ee44233fa6642c34c2fb402bdc8fb0d1c474cd58019bf608b661c26f72a"},{"path":"scripts/e2e/battle-misc-compare.mjs","anchor":"async function readReport","role":"围攻与状态双端事实和原生报告读取","lines":"19","sha256":"a093e171771aaba35398e28ba4de2e5a8303b8d1e5904f2cb7bb226159c3972f"},{"path":"scripts/e2e/battle-coop-support.mjs","anchor":"async function authoredFiles","role":"合法作者试打内容与合体技能配置","lines":"53","sha256":"76d6282f6ea3356b47abbef51297e4c9fee46d2d534d5f6bd6868ba4db5468c8"},{"path":"scripts/e2e/battle-world-save-respawn.mjs","anchor":"export async function verifyBeeRespawn","role":"真实存读档后按世界拍观察可见性及返回接敌","lines":"155","sha256":"5857ddc9607f2ff58249486776f2b1c931b7508dd292a4e74f9aadb96997a427"}],"publicCallers":["node scripts/e2e/battle-foundation.mjs --engine=game","node scripts/e2e/battle-foundation.mjs --engine=reforge","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=herb-settlement --repeat=1 --counter=double-herb","node scripts/e2e/battle-foundation.mjs --engine=game --scenario=equivalent-poison --audio-review","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=equivalent-poison --audio-review","node scripts/e2e/battle-foundation.mjs --engine=game --scenario=automatic-block --audio-review","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=automatic-block --audio-review","node scripts/e2e/battle-foundation.mjs --engine=game --scenario=lantern-player-casualty --audio-review","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=lantern-player-casualty --audio-review","node scripts/e2e/battle-foundation.mjs --engine=game --scenario=casualty-dialogue --audio-review","node scripts/e2e/battle-foundation.mjs --engine=reforge --scenario=casualty-dialogue --audio-review","node build/q2/av/casualty-presentations/world-loss.mjs --engine=<game|reforge> --from=<006 report>","node scripts/e2e/battle-foundation.mjs --engine=<game|reforge> --group=player-actions","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY --group=player-actions","node scripts/e2e/battle-foundation.mjs --engine=<game|reforge> --scenario=<registered-player-case> --audio-review","node scripts/e2e/battle-foundation.mjs --engine=<game|reforge> --group=coop-sleep-followup","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY --group=coop-sleep-followup","node scripts/e2e/battle-foundation.mjs --engine=<game|reforge> --group=item-effects","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY --group=item-effects","node scripts/e2e/battle-foundation.mjs --engine=<game|reforge> --scenario=<registered-item-case> --audio-review","node scripts/e2e/battle-foundation.mjs --engine=<game|reforge> --group=status-followup","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY --group=status-followup","node scripts/e2e/battle-foundation.mjs --engine=<game|reforge> --group=enemy-cast","node scripts/e2e/battle-foundation-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY --group=enemy-cast","node scripts/e2e/battle-poison-items.mjs <game|reforge> <priority|bounds|pairs|controls>","node scripts/e2e/battle-poison-compare.mjs GAME_REPORT REFORGE_REPORT NEW_DIRECTORY GROUP","node build/q2/learn-magic/run.mjs <game|reforge>","node build/q2/learn-magic/compare-runs.mjs GAME_REPORT REFORGE_REPORT","python3 build/q2/learn-magic/check-frames.py GAME_FOLDER REFORGE_FOLDER MENU_PNG","node build/q2/learn-magic/check-menu.mjs","node scripts/e2e/battle-status.mjs <game|reforge> <all|buff|puppet|confusion|silence|overlap>","node scripts/e2e/battle-status-compare.mjs SELECTOR GAME_REPORT REFORGE_REPORT NEW_OUTPUT_JSON","node scripts/e2e/battle-status.mjs <game|reforge> revival","node scripts/e2e/battle-world-bee-game.mjs [--capture --seed=99]","node scripts/e2e/battle-world-bee-reforge.mjs [--capture --seed=99]","node scripts/e2e/battle-world-bee-compare.mjs GAME_REPORT REFORGE_REPORT NEW_OUTPUT_JSON","node scripts/e2e/battle-world-bee-game.mjs --escape=success|failure and the matching Reforge entry","node scripts/e2e/battle-world-escape-compare.mjs success|failure GAME_REPORT REFORGE_REPORT NEW_JSON","node scripts/e2e/battle-enemy-escape.mjs game|reforge","node scripts/e2e/battle-enemy-escape-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON","node scripts/e2e/battle-scripted-defeat.mjs game|reforge","node scripts/e2e/battle-scripted-defeat-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON","node scripts/e2e/battle-world-bee-game.mjs --post-battle-save --seed=99 and the matching Reforge entry","node scripts/e2e/battle-world-save-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON","node scripts/e2e/battle-world-review-split.mjs CAPTURE_COMPARISON OUTPUT","node scripts/e2e/battle-world-bee-game.mjs --escape=success --escape-exits and the matching Reforge entry","node scripts/e2e/battle-world-escape-exits-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON","node scripts/e2e/battle-world-review-split.mjs SAVE_CAPTURE_COMPARISON OUTPUT --load-reveal","node scripts/e2e/battle-misc.mjs game|reforge","node scripts/e2e/battle-misc-compare.mjs GAME_VERIFY REFORGE_VERIFY","node scripts/e2e/battle-coop-support.mjs","node scripts/e2e/battle-world-save-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON verify --post-win-save"],"legalInputs":["Three explicit legal fixture setups: solo/team1, hero-WuHou-Anu/team3, injured hero-Anu/team1 with two herb99; battlefield7, normal manual battle, mulberry32 seed1729.","Each engine runs each setup twice in fresh contexts. Public Game applyFixture and Reforge runBattleTrial prepare the state; all later commands use real keyboard/menu selection.","Effective starting equipment/stats are read from each engine and compared; content23/minimumSAVE12, exact raw and author JSON source pool is hashed. No Q1 speed-win or user save data is used.","Two-round seed4: hero and Wu Hou, one ordinary team1 lantern, heal296 and two herb99, one guarded enemy hit and one confirmed ally retarget after Escape.","Solo hero/team294, field7, seed64, defend then attack. Full original two-entry enemy queue.","Level-six hero and Anu/team204, seed4, native enemy sleep. The awake actor defends and finishes the battle.","Solo hero/team115, seed72, two units of item87. Defend, self-use antidote through the item menu, then attack.","The PAL Li Xiaoyao portrait probe binds raw indexed UI frame 48, the actual authored face PNG and both standard color table sources. It samples the six fixed local coordinates while selecting in turns 1, 2 and 3.","Use the seven existing native fixtures for the audiovisual pass. The twenty-four original and authored WAV pairs bind byte identity and original mono PCM frame counts. Single-context browser audio reviews use the same candidate and normal input, with Game starting after its loading surface naturally detaches.","Healthy solo Li Xiaoyao against team115, seed11 and base speed1. The player submits attack; the enemy acts first and the native third draw reaches block threshold 10. The seed72 active-defend and poison fixture remains unchanged.","Two normal turns against raw team 1, field 7, seed 6, level-five Li Xiaoyao and Anu. Li enters with 40/40 HP and 9 equipped defense. Both defend in turn 1. Li defends and Anu attacks in turn 2. Li’s guardian is absent.","The two-round lantern fight uses Zhao Linger and her actual guardian Li Xiaoyao, field 7 and seed 6. Zhao enters at 24/24 HP. Both defend in round 1; Zhao defends and Li strikes in round 2.","Two normal enemy thunder spell fixtures use raw team 186 and seed 6. Li enters at 85 or 24 HP with Anu as the surviving teammate.","The raw team 115 encounter applies Red Poison through a normal native enemy hit. Actual turn-end poison then causes dying and death, with the same legal inputs and seed 50.","The ordinary e206 team-16 hostile battle is reached from the dock via the same committed moves. Li is the only fighter at 1 HP. Fixed seed 6, a physical defend input and one confirmation are observed. The latest valid slot is m01.","Field7, raw team115, Zhao Linger knows the five basic elemental spells. Equal level-5 fixtures and native equipment, each with mulberry32 seed50. Wind seed6 separates damage variance from cast growth.","Raw team116 with three bloodworms; level-7 Zhao knows 313, Anu knows 353. Both use the real all-enemy menu, seed2.","Raw team115 with seed6 for Zhao 381 and healthy Anu. Raw team115 with seed2 for Li throwing one spare wood sword166 while retaining his equipped wood sword. Both complete through the ordinary settlement menu.","Raw team62, seed4 for Zhao 303: cancel the first native target and choose the other. Actual sorcery resistance 0 and 10. Raw team1, seed3: one-ally protection309 or non-protecting cleanse306 with two matching enemy hits.","Raw team204, field7, seed25, Zhao Ling’er with Fairy Sword170 and Li Xiaoyao. Actual menu submits Explosion381, then enemy sleep303 disables Li before the action. The same two commands finish the legal fight after the fix.","Reuse both seed4 sleep fixtures and original elemental/group spell fixtures. A first spell number may follow the first rendered reaction by one logical 40ms tick, in the same reaction pose.","Seven normal field-7 fixtures use raw teams 1, 3, 80 and 115, fixed seeds, matched derived stats, registered PAL item IDs 95, 104, 116, 137, 145, 157, 158 and 67, and the actual item, throw and target menus. Revival follows a native defeat of the recipient during combat.","Five status followup fixtures use fixed field and seeds with actual menus. Lingxin Talisman clears sleep inflicted in an earlier enemy action. Party healing uses a real two-member party. Salt is an enabled whole-field throw with an explicitly empty effect list.","Ten enemy-cast fixtures use native formations, real turns and original ABC/FIRE. The opposing party issues the same keyboard commands in both engines.","Thirty-six poison fixtures use legal inventories and two or three genuine target slots, with no injected statuses or HP changes after launch. The four disjoint verification groups share original PAL data and the authored project.","A repeat of the shadowless-cap fixture uses the same seed and three real commands in both engines, followed by actual settlement confirmations. Menu cash uses a clean ordinary world entry and a real Esc press.","Twenty native PAL status fixtures repeat each engine in clean contexts with the same team, derived equipment stats, true items and skills, and deterministic seed. Every committed command has actual physical key receipts.","Three new revival scenarios start with legal PAL party, equipment, skills and items and acquire or clear the relevant statuses using committed actions. Three adjacent cases are repeated alongside them.","Fixed engine-native checkpoints put the same equipped Anu at (93,45) in s006. Four movement commits reach (97,45), native contact starts enemy team 4, the actual group attack wins, and native Escape toggles the world menu after return.","s006/e154 native team 4, four right steps, same Li/Zhao equipment and HP/MP, seeds 4 and 3 with a single Q per round.","s036/e602 native team 25, the predecessor visibility from s034, one right step, seed 6 and actual dialogue confirmation through first s037 dialogue.","s093/e1759 native team 29, one right step, HP 1 Li Xiaoyao with a healthy reserve and actual defend against the natural scripted defeat.","s006/e154 native team 4 seed 99, native world reward and manual slot 1/2, independent browser boot and malformed cash in its own disposable slot.","Use seed 4, the same native escape fixture and a fresh context per direction. Walk one exact tile toward the bee or in each other direction, then separately walk four tiles away along the approach path."],"businessOracle":{"type":"q2-finite-state-and-native-repeat","assertions":["Exact start state and five enemy slots, submitted command actor/target/order and completed action before/after state.","One/three distinct HP30 lanterns receive the selected lethal ordinary attacks, with no undeclared autonomous enemy action.","Herb99 heals hero50 to100 and consumes exactly one of two; formal victory yields hero125, exp1 and cash3. Party victory gives each member exp3 and cash9.","Formal settlement commits exactly once; all three cases pass independent state oracles, cross-engine effective-state comparison and same-engine native/rule-RNG repeat checks.","A real isolated double-consumption mutant fails business/action-after at actions[0].after with inventory2 tozero; restoring normal serve mode passes. Missing hashes, input receipts and fresh contexts are rejected by the offline entry.","Real rendered frames show the manual selection HUD, hide it during action and settlement, finish each enemy fade before the next action, and draw herb50 on the returned actor with the original recipient anchor.","The fixed ordinary attack cases check CLASSIC draw purposes, queue jitter, untruncated attack numbers and clamped enemy HP. Actual draws are logged at their producers.","The two-round case checks guard, real enemy damage, a single herb consumption, cancellation and same-actor retarget, heal296 MP and recipient HP, and single settlement.","Team294 consumes no singleton target draw. Native dual actions use 339 for HP94 then normal attack for HP44, with separate raw and rendered results.","Team204 consumes the native battle script chance draw. Sleep3 applies to hero, round ends tick 3→2→1, and the incapacitated slot passes without a submitted action.","Team115 passes the equivalent-item and 0x29 resistance rolls. Direct blue1 is separate from immediate poison HP7 and round-end HP7. Item87 consumes one and cures 551 before the next round.","The actual Li Xiaoyao portrait shows the original RGBA values before poison and after item87, and exact SDLPal palette-ramp RGBs while poison551 is active. Two transparent pixels preserve their drawn destination.","In team115, first actual round-end blue7 precedes the next selection HUD by the original eight-tick feedback hold. The cured round has no new number and opens selection on normal scheduling.","After the first native command, each of the 45 finite expected action cues has one real connected AudioBufferSourceNode start on a running context and the matching nonzero decoded WAV. Request order, repeated cue identity, actual action windows, enemy windup and enemy fade edges are checked.","In seed72, the first drawn impact and recoil use frame4. The first actual return and the remaining turn1 recovery use frame3, then the round-end poison number appears in idle frame0.","In seed11, the first drawn enemy charge already shows player frame3 and retains that pose through knockback. Recovery returns to the original idle frame. HP is unchanged, no damage number is drawn, and the actual strike cue starts the player cover WAV 015.","In seed72, the native active-defend commit, executed guard action, first drawn defense, first drawn enemy windup and first blue physical damage occur in that order. The two one-tick intervals must each lie in 20–65 ms; the attack-to-damage interval is 280–360 ms. Two native cross-engine pairs also verify a command-to-windup difference within one CLASSIC tick.","The lantern hits Li for 35 then 5. The actual impact frame 4 and two recoil positions precede first return frames 1 and 2. Native sound 019 starts after the dying pose; 023 starts around second recoil and before the fallen pose. Each appears once and the regular hit sound 352 still starts at each impact.","After lethal damage the native equivalent-item roll is consumed, with zero rate. Li’s selected action is skipped and Anu’s real 976 raw damage wins. The original victory reward leaves Li with zero earned EXP and 20 HP after half recovery, Anu with one EXP and 150 HP, and awards cash 3 once.","The two casualty branches keep their actual portrait frames, automatic pages and narration. The guardian heals and gains the temporary attack bonus only after the dialogue clears, before his own strike.","Enemy thunder consumes the same probability stream, drops Li from 85 to 27 or from 24 to zero, draws five impact beats and returns to the correct final pose with the respective actual native sound.","Turn-end poison numbers start from the returned position. The pre-poison pose persists eight beats before dying or falling, with no extra casualty cue or dialogue in these poison cases.","Ordinary defeat retains the last battle background across the red palette progression. The original death music starts, the game-over text waits for a real confirmation, black renders before the real restore, and fixed m01 returns the party to the dock with 1 HP.","Five matching single-enemy damages and MP costs. Wind seed6 draws enemy variance then cast growth, gives 82 damage and 3 hidden MP growth. Area skills draw once per enemy slot before growth; lethal damage numbers retain the full formula result.","Successful co-op pays 10 HP per healthy contributor, consumes the partner action, does 161 damage and no MP spend. The contributor HP cost changes battle state without player damage digits. Wood sword uses bare attack to do 219, spends one bag item and plays windup followed by its spell effect. The actual damage draw precedes four battle frames in release and four after returning, then the queue resumes.","Enemy target cancellation precedes native submission. Player sleep uses chance and target resistance before growth. The affected enemy actually passes and duration decrements even in a retained defeated slot. Resistance draws the original notice before the next action.","Protect applies for 7 turns, decrements to 6, halves the two fixed physical hits, and clears at victory. The cleanse control does not apply the buff. In both single-ally cases the rendered FIRE sequence is anchored to and painted in front of the selected ally, followed by that ally’s original glow.","Spell paint probes bind the original signed layer and byte-identical FIRE resource. Native draws must use that FIRE chunk, cover its source frames and paint in the original order against the relevant live fighters. The exact 381 position is (98,100) against enemy slot 0 at (100,110).","A cooperative submission that loses its only teammate executes a normal equipped attack. Each native hit, actual swing at the number birth, stable target anchor, per-hit sound, HP delta and RNG sequence is checked. No cooperative HP or MP cost.","Ordinary offensive spells retain the advanced cast pose through the original nine-tick recovery. Damage numbers appear within the first actual reaction pose, stable after return, then the same next actor starts. The two measured windows are cross-engine bounded.","Item settlement checks the same native command and target, one inventory deduction, each raw damage or restoration, effective HP and MP, poison changes, exact rule RNG order, and ordinary settlement. Throw numbers use the per-target signed raw change, including overkill and mixed throw steps.","Numbers and animation come from observed frames. Check whole-party glow, actual FIRE frames and paint order, same-frame drain damage and recovery at the acting foot, recovery pose on revival, and timing from raise through the first number to the next actor.","A queued attack after sleep cleanse must come from the expected native player slot after another actor uses Lingxin Talisman, with no submitted attack in that round.","Party healing draws FIRE28 once at each live actor anchor, with all declared recipients present and original paint order. Drain preserves the captured entry pose in all four approach steps.","A salt throw consumes one item, draws raise and release without effect feedback, and emits the throw cue without a rule draw. The following equipped double strike preserves both hits and their RNG on the same enemy slot after lethal damage.","Enemy casts must visibly approach in two PAL ticks, preserve their advanced position through actual FIRE frames, animate the correct delayed pose, show guard and net HP feedback at the intended boundaries, and return after five reaction ticks.","Real poison item commands verify six directed cures, three lethal pairs in both orders by use and throw, resistance and precedence, the first player/enemy poison entry, Dragon Gall and Shadowless Poison. Focused HP, poisons, RNG values and native number draws agree directly across engines.","Text in all seven paired native settlement screens agrees with the original bitmaps and PAL palette for glyph shape, adjacency inside each label, color and lack of text shadow. The separate Reforge main-menu cash label matches the original 0 color and no shadow.","Compare actions, effect counters, MP, stock, RNG order, settlement, status-specific rendered hits and audio. Exact bee reward script tail and loot are witnessed separately because the Reforge trial ends before world hooks.","Verify transformed revival and delayed actions, puppet attack counts and audio, natural expiration and clearing by revival using native actions and frames.","Read real RNG draws, visit both reward slots, compare actual overkill numbers and notice positions, hold HP and MP until the final reward closes, then assert half recovery, hidden count and the actual world menu round trip. The return transition has a separately observed pending discrepancy.","Read six changes on the actual canvas and the original-source hold; native sequencer track 37 starts after the last band and before the first drawn command. From the last battle frame, both runs prove actual darkening, an opaque black transition, the correct first map frame, the bright frame, and then actual return input.","Observe actual WAV starts for the two authored world sounds: no new map sound during contact/battle/return, and the appropriate 066 or 073 continues after the final map handoff according to whether the initial 066 already played. Raw opcodes protect the shared script clocks and random branches.","Read both actual actor sprites at the spell pose and dissolve, the fallen portrait palette, selected spell/item description rows, and the first drawn command after a casualty and completed round.","Compare whole-party escape commits, both outcomes and original action/RNG order; read all sixteen exit poses, label removal, one 045, zero rewards and exact world contact suspension.","Read all three active authored pages, three loaded portraits, retained slot clearance, one native 045, a width-derived leftward departure, automatic narration, zero rewards and real scene 37 continuation.","Read actual contents of six on-screen battle entry bands before the real MIDI start; real lethal skill, unique script loss arm, exact foot path, control restored to the original scene.","From the same native rewarded encounter, compare cash, experience, item stack, party HP/MP/equipment, Game recent battle actions, world coordinates and exact each-engine remaining hostile timer at each load; check both native malformed loads retain live state.","Observe each of the fifteen actual post-escape world steps with the visible enemy stationary. No repeat contact may start until the step after expiry.","Use the actual video presentation timestamps to preserve field return in both stereo clips even when one decoded audio stream is shorter.","Verify each walking and dialogue draw for the two actual party sprites in the original positions and the same dialogue cue.","Compare visible held-battle pixels across both identical reward scrolls and check the second reward is individually granted and displayed.","Compare five real post-flee direction routes tile by tile, with no contact during cooldown and matching recontact or a three-step clear window after expiry.","Require the actual loaded world to paint black and brighten over the measured fade ramp in manual reads from the world menu and title.","Draw all three PAL party names and levels at 1280 and 640 pixels, with full project title, time and save ordinal, including a 16-digit save ordinal."]},"dedupe":{"result":"bounded-distinct","against":["Q1 001-010 speed-win story verification","battle-host and battle-session source audits","existing rule/unit tests"],"notes":"Finite browser/runtime/collector obligations only. AI, status and poison credit is restricted to the declared cases. Full rules, audiovisual conformance and world/save lifecycle remain open. The item group covers seven native item/throw setups, with threshold and zero-script menu probes retained as historical diagnostics. The followup repeats the existing protect and drain fixtures and adds three distinct fixtures. The threshold and remaining throw/condition observations are separate bounded native diagnostics. The enemy-cast group reuses six existing fixtures and adds four distinct ones. The separate poison group adds 36 distinct action sequences. Media is captured separately for review. The typography replay reuses shadowless-cap, with exact bitmap and palette assertions on newly captured settlement pixels. It adds no new combat fixture. The 20 status scenarios add specific status interactions, group strikes, puppet and trance to the existing single-status and poison cases. Three revival combinations add natural death and expiration to the previous standalone status cases. The s006 matrix exercises world reward scripts and restored control beyond the isolated trial."},"revision":{"currentSha":"39d5bf7eb080a2a569421c50b79ebe60f38eecb0","contentVersion":23,"minimumSaveVersion":12,"history":[{"revision":"a8673cfcc9fc5767a6d02a3895964e7977bd7e16","date":"2026-11-07","action":"first-batch-native-normal-battle-foundation","scope":"12 clean native battles plus real item counter/restoration, original-byte offline comparison and entry integrity controls; human visual pending"},{"revision":"54d7b378d5094950c10b73bb38a81883cd3d375d","date":"2026-11-11","action":"native-battle-presentation-and-two-round-rules","scope":"First-batch rendered regressions, ordinary single-target rolls and damage text, and manual two-round defend/use/cast/cancel/retarget.","predecessor":"a8673cfcc9fc5767a6d02a3895964e7977bd7e16","historicalReceiptRevision":"18fac8f47fbb002bf76a4c97283225c7156447f2","archive":"docs/tasks/evidence/E2E-Q2-1-battle-followup-20261111.tar.gz"},{"revision":"e746620556cf961eed871ec3f8038f5223d37357","date":"2026-11-11","action":"native-battle-enemy-ai-sleep-and-equivalent-poison","scope":"Fixed native PAL teams 294, 204 and 115, dual action, enemy sleep and equivalent poison application, decay and cure.","predecessor":"54d7b378d5094950c10b73bb38a81883cd3d375d","historicalReceiptRevision":"3a921678f20950cccee3f631dfbb1e60bb8efa3b","archive":"docs/tasks/evidence/E2E-Q2-1-battle-mechanisms-20261111.tar.gz"},{"revision":"4f1bea68f897ca59d4a2cd892e7619ffdebe479e","date":"2026-11-11","action":"native-equivalent-poison-portrait-colors","scope":"User-reported red poison portrait. Real selection-frame samples confirm four opaque shades, two holes and normal color after the antidote.","predecessor":"e746620556cf961eed871ec3f8038f5223d37357","historicalReceiptRevision":"18bfe998333912bf2b1449e534133ce73cafca44","archive":"docs/tasks/evidence/E2E-Q2-1-battle-poison-face-20261111.tar.gz"},{"revision":"5d42c84ffaa20fb5cb3b8df3a57c8c248342b7e3","date":"2026-11-12","action":"native-battle-round-feedback-and-action-audio","scope":"Seven fixed battle fixtures with actual rendered round boundaries and twenty-four source-bound WAVs. Runtime-backed feedback timing and named audio cues, with a separate browser-mix review.","predecessor":"4f1bea68f897ca59d4a2cd892e7619ffdebe479e","historicalReceiptRevision":"5a3093c93746d6e04e8f569ef526e07778aa439f","archive":"docs/tasks/evidence/E2E-Q2-1-battle-av-20261112.tar.gz"},{"revision":"3ac5c7b8b42c967b51ca12c9ddeeba6b1397ee9b","date":"2026-11-12","action":"native-physical-guard-pose-and-block-sound","scope":"Actual drawn fighter pose at ordinary impact, guard recovery and first auto-block charge, with independent native action, damage and audio receipts. Eight finite browser fixtures.","predecessor":"5d42c84ffaa20fb5cb3b8df3a57c8c248342b7e3","historicalReceiptRevision":"8cc7f427e64cdff70a12454f601c8c17747fd58e","archive":"docs/tasks/evidence/E2E-Q2-1-battle-guard-20261112.tar.gz"},{"revision":"f38df3e308b7b0c6df5a4fbb883fbb1f77cb864f","date":"2026-11-12","action":"native-defend-to-enemy-action-cadence","scope":"Command, actual defense pose, enemy onset and first physical damage in the same legal seed72 fight, with the eight-fixture matrix and independent stereo review.","predecessor":"3ac5c7b8b42c967b51ca12c9ddeeba6b1397ee9b","historicalReceiptRevision":"d0020e0749483651d9b0f86cf79ef738ac34663e","archive":"docs/tasks/evidence/E2E-Q2-1-battle-action-cadence-20261112.tar.gz"},{"revision":"55d5512d81a87660185b17afad621a3d33e9e5a0","date":"2026-11-12","action":"native-player-physical-casualties-and-survivor-continuation","scope":"Rendered direct physical dying, fallen poses and actual sounds, lethal RNG consumption and victory reward eligibility in a legal two-round fixture.","predecessor":"f38df3e308b7b0c6df5a4fbb883fbb1f77cb864f","historicalReceiptRevision":"58812c028ebd87dd75a9c5dda46a4ec997fb4b09","archive":"docs/tasks/evidence/E2E-Q2-1-battle-player-casualties-20261112.tar.gz"},{"revision":"31002d214bb106272f34af46c86c57872b9b2849","date":"2026-11-13","action":"native-casualty-dialogue-thunder-poison-and-ordinary-defeat","scope":"Actual casualty dialogue, direct enemy thunder, round-end poison and normal world defeat in the documented legal scenarios.","predecessor":"55d5512d81a87660185b17afad621a3d33e9e5a0","historicalReceiptRevision":"f84bcd91dd71498e1099e7bf8f4b2d7900507090","archive":"docs/tasks/evidence/E2E-Q2-1-battle-casualty-presentations-20261113.tar.gz"},{"revision":"f03b46b2ae192f78d132ef933f86f0fa242dd0db","date":"2026-11-13","action":"native-player-spells-coop-throw-and-status","scope":"Fixed elemental damage and draws, area damage display, successful co-op, a thrown weapon, player sleep and Protect with an actual control.","predecessor":"31002d214bb106272f34af46c86c57872b9b2849","historicalReceiptRevision":"faae7bde3078a06d5072326327459994107607e2","archive":"docs/tasks/evidence/E2E-Q2-1-player-battle-actions-20261113.tar.gz"},{"revision":"4c7d4f9a78981f13a4c3ab3b9df441bc776eed23","date":"2026-11-13","action":"native-fighter-and-spell-paint-order","scope":"Restore ten original PAL spell offsets. Re-run existing 26 fixtures with native FIRE chunk, frames and actual fighter paint order. The previously published action and media receipts retain their original candidate.","predecessor":"f03b46b2ae192f78d132ef933f86f0fa242dd0db","counterCandidate":"9762136cb327ad483264bf56019987f86d674c7a","previousSourceRefs":[{"path":"scripts/e2e/battle-foundation-scenarios.mjs","lines":"143","anchor":"function defineScenario(","role":"input-and-independent-oracle","sha256":"fe304a07dad74a47b18942357d0bcf04a9a18624ada61718edab786b79edcc2d"},{"path":"scripts/e2e/battle-presentation.mjs","anchor":"export function validateBattlePresentation(","role":"render-oracle","lines":"1332","sha256":"cc3634667a65dc179caba7ebf95606073b1ffe42f2abe1db42a7bfe41992da0e"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"audioStarted(cueId, assetId, buffer, context, source)","role":"native-audio-observer","lines":"200","sha256":"1d5d0ce6c980151753ba0ae2387024e72f05c2c2c4e1b670015a520fcafec7eb"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"40","sha256":"79d6307bcb2ab10a0fe8b540af834905aca40d042cfa13358a1664967c847633"},{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"17","sha256":"d840ca3f867d6bada20714ba401244fc55c4d087d7c822625971185b7ad5a394"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"magicOverlayDrawn(x, y, frameIndex)","role":"native-magic-overlay-observer","lines":"256","sha256":"1d5d0ce6c980151753ba0ae2387024e72f05c2c2c4e1b670015a520fcafec7eb"}],"archive":"docs/tasks/evidence/E2E-Q2-1-spell-layer-recheck-20261113.tar.gz"},{"revision":"c0261df4ad87aff4d89a972a60c03a0f6eb9b294","date":"2026-11-13","action":"native-cooperative-fallback-and-player-cast-recovery","scope":"Fix and independently re-run the same-input two-hit fallback, sleep recovery and representative ordinary damaging spells. Preserve original reports and user acceptance for earlier batches.","predecessor":"4c7d4f9a78981f13a4c3ab3b9df441bc776eed23","counterCandidate":"6262428320fbf3ca839a2801dbf264dea3c8127b","previousSourceRefs":[{"path":"scripts/e2e/battle-foundation.mjs","lines":"57","anchor":"await runBrowserJourney({","role":"caller","sha256":"1846345c56a0059b5b67ec00378f1841ffeb7e9df821359e060c5fc1e9ff1376"},{"path":"scripts/e2e/battle-foundation-scenarios.mjs","lines":"184","anchor":"function defineScenario(","role":"input-and-independent-oracle","sha256":"c92af2fdd996c583226f0e14dcc3ad054d880489bdac798cd0e982f460afb583"},{"path":"scripts/e2e/battle-game-adapter.mjs","lines":"424","anchor":"launch(input) {","role":"public-fixture-adapter","sha256":"da14059d24ed48d17c9f209abaa5844f906ac895870c199fcd508a02daa71a33"},{"path":"scripts/e2e/battle-trace-contract.mjs","lines":"915","anchor":"export function validateBattleTrace(","role":"oracle","sha256":"4b9687ca95628d5f62b4ebac7303ba912f6057edb25fe365eeb85a9933b2a688"},{"path":"scripts/e2e/battle-foundation-compare.mjs","lines":"30","anchor":"export async function compareBattleReports(","role":"offline-caller","sha256":"46244b65e53179d8ec60033605e3c1e33f7f5d5909dbea59fe9ad9f2561b3cb2"},{"path":"scripts/e2e/battle-presentation.mjs","anchor":"export function validateBattlePresentation(","role":"render-oracle","lines":"1435","sha256":"f165af53d6ed3173f7663da7a026cb27499ec50059043acbcd8972813f43e1c5"},{"path":"scripts/e2e/battle-rules.mjs","anchor":"export function validateBattleRules(","role":"rule-oracle","lines":"117","sha256":"568609859d8850261f25f1e6a36b9589075db7aa3f5fd15c3b6307a7086e7ea1"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"40","sha256":"0a6c10c71310ae824236d94a3e839f855decfc298569587f5b3f1a1968e781ac"},{"path":"scripts/e2e/battle-random-instrumentation.mjs","anchor":"export function instrumentBattleRandomDraws(","role":"native-random-producer-binding","lines":"28","sha256":"79a4941d9a6a187291269c61c72baf4f726600e4ce42518288931e068008a2c4"}],"archive":"docs/tasks/evidence/E2E-Q2-1-cooperative-fallback-and-spell-recovery-20261113.tar.gz"},{"revision":"bd48eda19ab9e08b9c17c176c08ff1a9243862d4","date":"2026-11-13","action":"native-battle-item-effects-and-throw-feedback","scope":"Run seven same-input legal item and throw cases. Compare native actions, stock, HP and MP, poison, RNG, actual feedback and settlement. Earlier publications retain their execution identities.","predecessor":"c0261df4ad87aff4d89a972a60c03a0f6eb9b294","previousSourceRefs":[{"path":"scripts/e2e/battle-foundation.mjs","anchor":"await runBrowserJourney({","lines":"57","role":"caller","sha256":"6ed2583b6deaf81b6381923ea491a6f54422e185077eb3914bb19a0885780127"},{"path":"scripts/e2e/battle-foundation-scenarios.mjs","anchor":"function defineScenario(","lines":"184","role":"input-and-independent-oracle","sha256":"0088db6d70789b163416dfc7d7c45f6ca5aaac03b6d9280c0608606c8bfa1794"},{"path":"scripts/e2e/battle-reforge-adapter.mjs","anchor":"running = runBattleTrial(","lines":"178","role":"public-trial-adapter","sha256":"d2e3fadc45f419beaf729e70044345e58491c6bdc379a1fc4c2e51d4588f8e31"},{"path":"scripts/e2e/battle-trace-contract.mjs","anchor":"export function validateBattleTrace(","lines":"928","role":"oracle","sha256":"2ed591d1d0fe4347df58831233af4306a963925c9a7d080c88c930b1ec9fc6fb"},{"path":"scripts/e2e/battle-foundation-compare.mjs","anchor":"export async function compareBattleReports(","lines":"33","role":"offline-caller","sha256":"88031c6f5ef440c4d7ef7a93af89f0c6c857539f15a77b6f9fc617301d11a644"},{"path":"scripts/e2e/battle-presentation.mjs","anchor":"export function validateBattlePresentation(","role":"render-oracle","lines":"1533","sha256":"2f16a42f6b697eb1c8ec581a7d50129f8499636818afc3de13d064da235fc0cb"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"audioStarted(cueId, assetId, buffer, context, source)","role":"native-audio-observer","lines":"201","sha256":"2f2e41a8d5546c60dd2c89b18c505a28b6aaee69777553dd712f6033789992b5"},{"path":"scripts/e2e/battle-random-instrumentation.mjs","anchor":"export function instrumentBattleRandomDraws(","role":"native-random-producer-binding","lines":"28","sha256":"853f3d5b991596040dc9e0551f98f15088b88de7862fa8e1c05fa1a135d61bc0"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"magicOverlayDrawn(x, y, frameIndex, resource)","role":"native-magic-overlay-observer","lines":"269","sha256":"2f2e41a8d5546c60dd2c89b18c505a28b6aaee69777553dd712f6033789992b5"}],"archive":"docs/tasks/evidence/E2E-Q2-1-battle-item-effects-20261113.tar.gz"},{"revision":"5aa5cb252597dfaf6989e5d91f203b2253449770","date":"2026-11-13","action":"native-status-followup-and-throw-recovery","scope":"Five paired fixed fixtures, separate PAL empty throw and threshold diagnostics, independent status and protect expiry probes, and normal-speed stereo review.","predecessor":"bd48eda19ab9e08b9c17c176c08ff1a9243862d4","previousSourceRefs":[{"path":"scripts/e2e/battle-foundation.mjs","anchor":"await runBrowserJourney({","lines":"57","role":"caller","sha256":"909dc3bc5bdca4a078ab0593ef5b7845e1ecc476fb76a2d4cd33f4581f5a799d"},{"path":"scripts/e2e/battle-foundation-scenarios.mjs","anchor":"function defineScenario(","lines":"201","role":"input-and-independent-oracle","sha256":"ac1af4dedcce365d6ef699dbb7cf8017b1a401f257e9bbe6d1438f4610dd552b"},{"path":"scripts/e2e/battle-trace-contract.mjs","anchor":"export function validateBattleTrace(","lines":"928","role":"oracle","sha256":"42969391c5748190f0108960c67c5acc0f887fc1637b66851f3917b33c718fbc"},{"path":"scripts/e2e/battle-foundation-compare.mjs","anchor":"export async function compareBattleReports(","lines":"33","role":"offline-caller","sha256":"f3723de5c4ca7710b40fbb36579f08e34e61af03ea6568e86d95cffe2dcd87cd"},{"path":"scripts/e2e/battle-presentation.mjs","anchor":"export function validateBattlePresentation(","role":"render-oracle","lines":"1645","sha256":"31abad6f7154ab9561b49f35cbc6a7754e35aa737156f15b1b37d3d84667ce69"}],"archive":"docs/tasks/evidence/E2E-Q2-1-battle-status-and-throws-20261113.tar.gz"},{"revision":"9b524c4fa6657456347a2e78f76bbf7b8bf45444","date":"2026-11-14","action":"native-enemy-cast-and-poison-items","scope":"Ten fixed enemy cast cases repeated on both engines; thirty-six paired poison cases; original-speed stereo review.","predecessor":"5aa5cb252597dfaf6989e5d91f203b2253449770","previousSourceRefs":[{"path":"scripts/e2e/battle-foundation.mjs","anchor":"await runBrowserJourney({","lines":"61","role":"caller","sha256":"70f955a887524322cad20bb88b02aa895d73a54e04f62c950815c417f4c974a7"},{"path":"scripts/e2e/battle-foundation-scenarios.mjs","anchor":"function defineScenario(","lines":"209","role":"input-and-independent-oracle","sha256":"a8bd7a0e62174eb8bb5ae948e5749d1d0c092a16602b5f606d48dd1d32933800"},{"path":"scripts/e2e/battle-game-adapter.mjs","anchor":"launch(input) {","lines":"439","role":"public-fixture-adapter","sha256":"17a0de92a7f552ee5f5b61b3f0ca86f1709509b4f72e58520c0d15cc22eb697d"},{"path":"scripts/e2e/battle-reforge-adapter.mjs","anchor":"running = runBattleTrial(","lines":"179","role":"public-trial-adapter","sha256":"db8051383991ee9ea294c1fc08647fc510542fdb8a51d61f9a34ba639f7cfd24"},{"path":"scripts/e2e/battle-trace-contract.mjs","anchor":"export function validateBattleTrace(","lines":"972","role":"oracle","sha256":"11c879b510f79f58211463f8923fac66d00caa750f29f66e3f23fb9bf7e30d05"},{"path":"scripts/e2e/battle-foundation-compare.mjs","anchor":"export async function compareBattleReports(","lines":"33","role":"offline-caller","sha256":"18cd090eb4ee04a941e5ebf39f30cd978ae1144b8daec15c87a690cc4ffa71e1"},{"path":"scripts/e2e/battle-presentation.mjs","anchor":"export function validateBattlePresentation(","role":"render-oracle","lines":"1693","sha256":"dc5b1c467806c7b9317ebe269e00d12a069fc4d3862db9519b12bdc1e95ffdb2"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"42","sha256":"240ed081be898fd0500629bd6191e2d93d1e4b468fe09c303110ffd7091dfdf3"},{"path":"scripts/e2e/battle-random-instrumentation.mjs","anchor":"export function instrumentBattleRandomDraws(","role":"native-random-producer-binding","lines":"28","sha256":"c63e693e6b993559671ad4c98e9aec307fe29989491cb6b15cbd7a301933467b"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"'coop-fallback',","role":"native-cooperative-fallback-observer","lines":"277","sha256":"240ed081be898fd0500629bd6191e2d93d1e4b468fe09c303110ffd7091dfdf3"}],"archive":"docs/tasks/evidence/E2E-Q2-1-enemy-casts-and-poisons-20261114.tar.gz"},{"revision":"48a8ac4350208a5152d439c8d6e88f088bdcb34e","date":"2026-11-14","action":"native-horizontal-scroll-lettering","scope":"One paired settlement with seven exact screen text checks, plus the ordinary Reforge menu and renderer controls.","predecessor":"9b524c4fa6657456347a2e78f76bbf7b8bf45444","archive":"docs/tasks/evidence/E2E-Q2-1-scroll-text-20261114.tar.gz"},{"revision":"681040c59b1c6787cbaecb91e3dd20b9acd62b1d","date":"2026-11-14","action":"native-special-status-and-buffs","predecessor":"48a8ac4350208a5152d439c8d6e88f088bdcb34e","scope":"Twenty native fixtures, each repeated twice in both engines. Same-fixture battle, status, RNG, physical effects and audio with original-speed stereo review.","previousSourceRefs":[{"path":"scripts/e2e/battle-game-adapter.mjs","anchor":"launch(input) {","role":"public-fixture-adapter","lines":"442","sha256":"6a259e66c0cef6c6a8f433d2152650ff576ce2837faef692f588197deb2524cb"},{"path":"scripts/e2e/battle-reforge-adapter.mjs","anchor":"running = runBattleTrial(","role":"public-trial-adapter","lines":"179","sha256":"db8051383991ee9ea294c1fc08647fc510542fdb8a51d61f9a34ba639f7cfd24"},{"path":"scripts/e2e/battle-trace-contract.mjs","anchor":"export function validateBattleTrace(","role":"oracle","lines":"973","sha256":"63520bb34902e61e2d3c096713e3c36d8613297a8ee7fc7897f8c4c125d89b24"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"audioStarted(cueId, assetId, buffer, context, source)","role":"native-audio-observer","lines":"201","sha256":"24052f435d204bf60cbfb1b6e2e258f32e27aef8e6b08e774d640f2df78c3393"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"42","sha256":"05d322ad0f770041e4494a69a45e71d82d49d9783b68c1eeb368c072b0b46ec3"},{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"17","sha256":"23613b798c1c2f3e7de2b76ecafe143b349d11e52029f4f9b8b23d41dadda26e"},{"path":"scripts/e2e/battle-random-instrumentation.mjs","anchor":"export function instrumentBattleRandomDraws(","role":"native-random-producer-binding","lines":"28","sha256":"3337727809f514a2e00ab4e0bd31be11292a9e94de67041e5f4d0a7759efa9e2"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"magicOverlayDrawn(x, y, frameIndex, resource)","role":"native-magic-overlay-observer","lines":"269","sha256":"24052f435d204bf60cbfb1b6e2e258f32e27aef8e6b08e774d640f2df78c3393"},{"path":"packages/reforge/src/battle/battle-command-selection.ts","anchor":"export class BattleCommandSelection","role":"native-target-menu-caller","lines":"57","sha256":"863c052adec756a9481f34fb65283caf6d7a5826276d1a311d8e735753758d1d"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"'coop-fallback',","role":"native-cooperative-fallback-observer","lines":"298","sha256":"05d322ad0f770041e4494a69a45e71d82d49d9783b68c1eeb368c072b0b46ec3"},{"path":"scripts/e2e/battle-rules.mjs","anchor":"export function validateBattleRules(","role":"rule-oracle","lines":"180","sha256":"0b2053cf19e9f11a81c06bb9f9d127afebc58f62c579eae6b8cd0c747e81f97d"}],"archive":"docs/tasks/evidence/E2E-Q2-1-special-status-and-buffs-20261114.tar.gz"},{"revision":"840625b531130f6a9c4819c509ed3bf3a47353a5","date":"2026-11-14","action":"native-revival-and-world-rewards","predecessor":"681040c59b1c6787cbaecb91e3dd20b9acd62b1d","scope":"Three new revival combinations and three adjacent cases in 24 executions. Three actual world encounter seeds in 12 executions, with independently bound original-speed captures and a pending return transition discrepancy.","previousSourceRefs":[{"path":"scripts/e2e/battle-status.mjs","anchor":"await runBrowserJourney({","role":"native-special-status-caller","lines":"36","sha256":"67547376e2e476180e27ac11c96ee8ed5745cc66c1c50d004d192c9bf8cb7345"},{"path":"scripts/e2e/battle-status-scenarios.mjs","anchor":"export async function prepareBattleStatusInputs(","role":"native-status-legal-inputs","lines":"323","sha256":"353eaa477dc5c6f6f2e7dd36164a5c40f32f626ad2036ff7008a6757b58ef665"},{"path":"scripts/e2e/battle-status-rules.mjs","anchor":"export function checkStatusRules(","role":"native-status-action-and-frame-oracle","lines":"638","sha256":"7b5390179c71547dc6430a907f59d2ee403712aa824758a2eee6257baa2c0753"}],"archive":"docs/tasks/evidence/E2E-Q2-1-world-rewards-and-revival-20261114.tar.gz"},{"revision":"39d5bf7eb080a2a569421c50b79ebe60f38eecb0","date":"2026-11-14","action":"native-world-and-revival-presentation-recheck","predecessor":"840625b531130f6a9c4819c509ed3bf3a47353a5","scope":"24 independent status trials recorded at 31cfe538; 12 world encounters at the PAL project-default candidate. Both engines use the same source revision within each matrix; a fresh Reforge trial confirms loading with the project default.","previousSourceRefs":[{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"audioStarted(cueId, assetId, buffer, context, source)","role":"native-audio-observer","lines":"203","sha256":"a852f11e767ef80d34bc042cbe5f53d7a379ad86ccce3b71e19abfa9392117d3"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"42","sha256":"fc8af8b0a28b60dfa2a37722c787321bfc1fa4fb5fadfa43ba2de74448d6322d"},{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"17","sha256":"af6d7c4d01ab308190090c4c47dce18ee636a2ee20f9a3ad911adbd8292f3ac1"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"magicOverlayDrawn(x, y, frameIndex, resource)","role":"native-magic-overlay-observer","lines":"279","sha256":"a852f11e767ef80d34bc042cbe5f53d7a379ad86ccce3b71e19abfa9392117d3"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"'coop-fallback',","role":"native-cooperative-fallback-observer","lines":"305","sha256":"fc8af8b0a28b60dfa2a37722c787321bfc1fa4fb5fadfa43ba2de74448d6322d"},{"path":"scripts/e2e/battle-status.mjs","anchor":"await runBrowserJourney({","role":"native-special-status-caller","lines":"36","sha256":"7a8ce949dacd9f5a8a1e1c57f7bb4d07dcf629b61e4505eb6fd119e4e30bf1f1"},{"path":"scripts/e2e/battle-status-rules.mjs","anchor":"export function checkStatusRules(","role":"native-status-action-and-frame-oracle","lines":"886","sha256":"7a8e51251f13f7813361b26cc1ae813079c5657ab99649314d1aeefcbd79db5c"},{"path":"scripts/e2e/battle-world-bee-game.mjs","anchor":"await runBrowserJourney({","role":"native-game-world-caller","lines":"454","sha256":"691d1ad32f23fa9fe3da47b4a8673c6acb842d4959cf480401ce734c5f817dc3"},{"path":"scripts/e2e/battle-world-bee-reforge.mjs","anchor":"await runBrowserJourney({","role":"native-reforge-world-caller","lines":"197","sha256":"3e5e1050a919a41f51898cb75d1fdd3b0c454b6522b1ca0c45504710ae50a711"},{"path":"scripts/e2e/battle-world-bee-compare.mjs","anchor":"export async function compareWorldBeeReports(","role":"native-world-offline-oracle","lines":"482","sha256":"6326ced5044832b80a774fd90d0cf6356da38c7e39dcdb3aa758cb106220a9b7"},{"path":"packages/reforge/src/battle/battle-host.ts","anchor":"private async finishEncounter(","role":"world-encounter-finalizer","lines":"179","sha256":"2036702f08d8857c818becc4c93a0c2a430bb6872e5bafab98b99c212cd7ec11"}],"archive":"docs/tasks/evidence/E2E-Q2-1-battle-presentation-alignment-20261114.tar.gz"},{"action":"q2-battle-lifecycle-source-rebinding","base":"2d17adc064409630aa74415dc8195080d2344d28","date":"2026-11-15","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-command-selection.ts","anchor":"export class BattleCommandSelection","role":"native-target-menu-caller","lines":"58","sha256":"956996dc32ec66684fb825b44e721679405219e14fc979b922d11dfd62078c04"},{"path":"scripts/e2e/battle-world-bee-game.mjs","anchor":"await runBrowserJourney({","role":"native-game-world-caller","lines":"839","sha256":"5509989887d5f75fd30ad851ac5539648068e81fc028a7a2b115fe76d60f66b6"},{"path":"scripts/e2e/battle-world-bee-reforge.mjs","anchor":"await runBrowserJourney({","role":"native-reforge-world-caller","lines":"311","sha256":"2ec68ba111af9db46b4449c3273bd1e374e4ae68cdd9cfa652dca8cbd615365f"},{"path":"scripts/e2e/battle-world-bee-scenario.mjs","anchor":"export const beeWorldInput = {","role":"native-world-legal-input","lines":"19","sha256":"4920e3bb0b09ed47165869cf8e4cda4145a70fe92fd06a136af7dcd99d94edb2"},{"path":"packages/reforge/src/battle/battle-host.ts","anchor":"private async finishEncounter(","role":"world-encounter-finalizer","lines":"277","sha256":"c4174dcb8d909247d97539af0de939853823f5d725c6f5808d03c80eae38320f"},{"path":"scripts/e2e/battle-world-bee-game.config.mts","anchor":"const start = '    src.start()'","role":"native-game-world-ambient-start","lines":"100","sha256":"97f8fac61e9c8f384cb2e8d883d0634a7b9689f367edc8d2366ad1845b874be4"},{"path":"scripts/e2e/battle-world-bee-reforge.config.mts","anchor":"function observeAmbient(source: string)","role":"native-reforge-world-ambient-start","lines":"142","sha256":"0ed8e0b3700721e93a5761445db53e7f03e6bd2f91e645742a29885d33971b6a"},{"path":"packages/reforge/src/battle/battle-entry-presentation.ts","anchor":"export class BattleEntryPresentation {","role":"normal-world-entry-draw","lines":"11","sha256":"6d1ca3a1e7cc9e6915528b1761a2aa4f42a7b54ff18ca501fab5f762e2f43bee"},{"path":"packages/game/src/core/battle/battle-system.ts","anchor":"function tickPostAction(","role":"first-game-exhausted-queue-tick","lines":"2792","sha256":"0c9d9e3f3d5d4aec1450eed67f2906980e873202d7d0e7c022617709e14b8e42"}],"scope":"依据当前冻结源码，保全旧候选、调用片段、原件与运行结果。新的行为只由战斗生命周期证据证明。"},{"action":"q2-battle-visual-review-source-applicability","base":"761bc57b8c2420413580b209088db0b87d060cc2","date":"2026-11-15","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"42","sha256":"4fe1a44256f297ad562f323cc9290a6dc9c6f49f4261326af856bc88565a0534"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"'coop-fallback',","role":"native-cooperative-fallback-observer","lines":"314","sha256":"4fe1a44256f297ad562f323cc9290a6dc9c6f49f4261326af856bc88565a0534"},{"path":"scripts/e2e/battle-world-bee-game.mjs","anchor":"await runBrowserJourney({","role":"native-game-world-caller","lines":"879","sha256":"6b304af36c25dff9005f9bda4014ae986ed5093f7122909f47fd405a671f8ef4"},{"path":"scripts/e2e/battle-world-bee-reforge.mjs","anchor":"await runBrowserJourney({","role":"native-reforge-world-caller","lines":"354","sha256":"ce1d567dc068d1d164f57ae182b1eec2f58d3d11ec4a2fa6a4106d7c76716144"},{"path":"scripts/e2e/battle-world-bee-scenario.mjs","anchor":"export const beeWorldInput = {","role":"native-world-legal-input","lines":"19","sha256":"dfe5033d31f262efdf787911000ed2b6ec36fc3d453d38f8938203710e17b3b1"},{"path":"scripts/e2e/battle-world-escape-compare.mjs","lines":"397","anchor":"export async function compareWorldEscapeReports(","role":"oracle","sha256":"8dfb0f01507e0a4443d084fa7056b373e0a0493433f4dff083ebea152a781180"},{"path":"scripts/e2e/battle-scripted-defeat-compare.mjs","lines":"610","anchor":"export async function compareScriptedDefeat(","role":"oracle","sha256":"a4b121db49f1d352f639851d5684466f6fba4a5032a73cb11a3cede2753bdd03"},{"path":"scripts/e2e/battle-world-save-compare.mjs","lines":"276","anchor":"export async function comparePostBattleSave(","role":"oracle","sha256":"69e65e93308d47e7444f9268b0a326151b0bb127d9922456fa705af04cb2e2fc"}],"scope":"更新分屏返工与明雷逃跑五条路线涉及的运行入口与判据。旧执行及原片保留各自运行候选。"},{"action":"q2-save-load-presentation-source-applicability","base":"77e5e24e7a0769c26a507b91ffb4044d0295e0d4","date":"2026-11-15","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-world-bee-reforge.config.mts","anchor":"function observeAmbient(source: string)","role":"native-reforge-world-ambient-start","lines":"148","sha256":"61ff313108df54ed527fc3ab7ce776777ae2a5a6609c1989b3c884398cbccb40"},{"path":"scripts/e2e/battle-world-save-compare.mjs","lines":"339","anchor":"export async function comparePostBattleSave(","role":"oracle","sha256":"a068e7dd62bdf0b1f7c3a2cf3f120b6b2dc1099d7e1a600813b3a8800775495c"},{"path":"scripts/e2e/battle-world-review-split.mjs","anchor":"function nativeVideoEnd(path)","lines":"22","sha256":"9254fb89c6564dc3332f7e96f6e13f702311a90fe494e2e87f6dbf7013b9871e","role":"visual-review"}],"scope":"当前存档采集、画帧比较与复核视频采用新的来源绑定。每个旧运行、反例和媒体继续对应其原有版本。"},{"action":"q2-save-full-party-layout-applicability","base":"95f05c703bb1d0cfb2ee1e4fd3b1616609eec47f","date":"2026-11-15","evidence":"docs/tasks/cards/E2E-Q2-1-battle-foundation.md","previousSourceRefs":[{"path":"packages/reforge/src/menu/save-browser-box.ts","anchor":"export function drawSaveBrowser(","role":"saved-slot-menu-caller","lines":"154","sha256":"bbc087e6741faae5971b8293d1c38796d93487e3b760d3b80b61a1e77ab48f91"}],"scope":"当前共享存档槽绘制更新，前轮读档和单人排版的原件保留各自运行候选。"},{"action":"q2-battle-closure-source-rebinding","base":"4b2692d65917034f3743a348ca161d2ffb447b97","date":"2026-11-16","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"audioStarted(cueId, assetId, buffer, context, source)","role":"native-audio-observer","lines":"204","sha256":"1ba62d8232e68b519571ce77b2152a56bd4279159475a3193814462612cba92a"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"42","sha256":"222f6c3ec79526b3ddc55a136d8aa2cd843855f470953db15cf52fe6b36709d5"},{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"17","sha256":"8cc0c3623771f700bac6eff27d26fc9912649191529acd33e80549655cffce07"},{"path":"scripts/e2e/battle-random-instrumentation.mjs","anchor":"export function instrumentBattleRandomDraws(","role":"native-random-producer-binding","lines":"28","sha256":"4eac8413fbca36ab98e90555d2178b57ba0f523c52fa654351f05e494aae7226"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"magicOverlayDrawn(x, y, frameIndex, resource)","role":"native-magic-overlay-observer","lines":"307","sha256":"1ba62d8232e68b519571ce77b2152a56bd4279159475a3193814462612cba92a"},{"path":"packages/reforge/src/battle/battle-command-selection.ts","anchor":"export class BattleCommandSelection","role":"native-target-menu-caller","lines":"59","sha256":"7933e7ce24d7c92a83a95e2d43efd4fb449ffe0e1a6b38cf0b2b34754ebfd34b"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"'coop-fallback',","role":"native-cooperative-fallback-observer","lines":"322","sha256":"222f6c3ec79526b3ddc55a136d8aa2cd843855f470953db15cf52fe6b36709d5"},{"path":"packages/reforge/src/menu/menu-box.ts","anchor":"export const SCROLL_LABEL_STYLE =","role":"reforge-scroll-style","lines":"169","sha256":"43f9fd4ddd8d22c4d13e98f6dc4c0df6f9998ab0a62d39b4fe79ad43cbd954ea"},{"path":"scripts/e2e/battle-status.mjs","anchor":"await runBrowserJourney({","role":"native-special-status-caller","lines":"52","sha256":"7efd247d856fd4601d5f7025ca2b79b2635dee970a905fc1445d6c7101527351"},{"path":"scripts/e2e/battle-status-scenarios.mjs","anchor":"export async function prepareBattleStatusInputs(","role":"native-status-legal-inputs","lines":"377","sha256":"1d7c75d943a0248b3d5379b7d5b0a1c0521674542c2994da06d2a58d71c0aec6"},{"path":"scripts/e2e/battle-status-rules.mjs","anchor":"export function checkStatusRules(","role":"native-status-action-and-frame-oracle","lines":"1035","sha256":"ac8f8353f81ef9f388d718305de898301b4c0a63b7de32c4286751d52700e027"},{"path":"scripts/e2e/battle-status-compare.mjs","anchor":"export async function compareStatusReports(","role":"native-status-offline-oracle","lines":"222","sha256":"0dfd2a98bf2a680784e81f7e3e5dc4882976ff8ca27896e5044f5d2cc4399a41"},{"path":"scripts/e2e/battle-world-bee-game.mjs","anchor":"await runBrowserJourney({","role":"native-game-world-caller","lines":"880","sha256":"9f8a18addf544fccb777dfc7865d7652d8f0832f522c5055d4b16261d85d880b"},{"path":"scripts/e2e/battle-world-bee-reforge.mjs","anchor":"await runBrowserJourney({","role":"native-reforge-world-caller","lines":"355","sha256":"0a0c1514a6ad697ceafe45b82c02f5ac7574d96c569f591f205c2b7492a9a38e"},{"path":"scripts/e2e/battle-world-bee-scenario.mjs","anchor":"export const beeWorldInput = {","role":"native-world-legal-input","lines":"19","sha256":"a231ab2b3dd47d75e36888b819e971587ba28d75a67a5ea750747ac4d1df362b"},{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2445","sha256":"11de9d9c95f30ebfa6d1bdec717fe8c8ef90975a93935088f328c65531412c36"},{"path":"scripts/e2e/battle-world-bee-reforge.config.mts","anchor":"function observeAmbient(source: string)","role":"native-reforge-world-ambient-start","lines":"148","sha256":"683a26e637bc2f4e8d796d4dcf4ac740f0d62cb2735d505023101db0d0d396da"},{"path":"scripts/e2e/battle-world-save-compare.mjs","lines":"388","anchor":"export async function comparePostBattleSave(","role":"oracle","sha256":"788ac3b4fd1f547711fc55d3f03bd5f12f73e13f2cd76536a4519c5bfe846190"},{"path":"scripts/e2e/battle-world-save.mjs","anchor":"function beginLoadPaintWitness(engine)","role":"native-save-paint-observer","lines":"53","sha256":"42e5662d22d1e8255dd908e0ed3556261b83108e16c9e9b1a80fa9678a8650b9"},{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5769","sha256":"5af0d49fd26c095bb28f8c74b2e4c365febcf9881706fe6a25afa645f363d305"}],"scope":"本轮 Q2 继续使用原生执行与实际画帧。保留全部旧运行、反例、附件与审阅，追加收尾义务。"},{"action":"q2-battle-enemy-summon-source-rebinding","base":"b8b8dd2fcc551a782a2e90387bcf91170bc4899f","date":"2026-11-16","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"projects/pal/manifest.json","anchor":"\"hostileVictoryTransition\": \"fade\"","role":"world-victory-default-inherited-by-pal-hostiles","lines":"7","sha256":"5ee2caea36abb544410429368360faab614750a8bc38b016e86280d79e445361"}],"scope":"现行 PAL manifest 新增 212 音效角色。明雷胜利转场配置和原执行原件继续保留。"},{"action":"q2-summon-division-caller-rebinding","base":"62959793cf6fb2450806d12072608ce768d80c39","date":"2026-11-16","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"17","sha256":"c608bcddf38a66601253ae7dbf4a3ba6a8a0d235253f952fb8fcbd086a0f7ef9"},{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2473","sha256":"321e5a6980c0490f8f7265dcb37742c49ddde6416f85829261fdfd95b6d3e0f6"},{"path":"packages/game/src/core/battle/battle-system.ts","anchor":"function tickPostAction(","role":"first-game-exhausted-queue-tick","lines":"2788","sha256":"9deef69706a798c70ed6beaba4b869afef4f2e9400ff48e810cc679ab5744c80"}],"scope":"核对已有调用片段和采集锚点的字节。既有执行和反例继续对应其原候选。"},{"action":"q2-enemy-color-source-rebinding","base":"070e8145c20e3c2cc8cc77c1e696843d453a0a92","date":"2026-11-16","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"audioStarted(cueId, assetId, buffer, context, source)","role":"native-audio-observer","lines":"204","sha256":"8badd9f72542055e1340c37ca5a7e774a2a29731f14d03cc9d16a14093ae760a"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"export function instrumentGameBattle(","role":"game-audio-producer-binding","lines":"42","sha256":"00fe3f76c0be724b03c0cc82bfe8508e7d54f787f96c197a5448d0a403a98959"},{"path":"scripts/e2e/battle-trace-observer.mjs","anchor":"magicOverlayDrawn(x, y, frameIndex, resource)","role":"native-magic-overlay-observer","lines":"307","sha256":"8badd9f72542055e1340c37ca5a7e774a2a29731f14d03cc9d16a14093ae760a"},{"path":"scripts/e2e/battle-game-instrumentation.mjs","anchor":"'coop-fallback',","role":"native-cooperative-fallback-observer","lines":"336","sha256":"00fe3f76c0be724b03c0cc82bfe8508e7d54f787f96c197a5448d0a403a98959"}],"scope":"增加真实敌方实绘色偏及敌方召唤淡变的采集兼容后，四处旧调用片段保持原字节。原执行和反例继续对应其候选。"},{"action":"q2-enemy-spell-feedback-source-rebinding","base":"257296ec61b0dd8a6e103df9d26b8af374ca702b","date":"2026-11-16","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2466","sha256":"1918315cf7c47780d7746028054b9bde39b4740cf71f8a18c248269202da6814"}],"scope":"敌方施法失败卷轴修复后，既有调用片段保持原字节。原执行和反例各对应其冻结候选。"},{"action":"q2-enemy-transform-source-rebinding","base":"b0afdd9e54203fbe5f6d7a457acdf9958168be7f","date":"2026-11-17","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2466","sha256":"977390196d1f57aaa8efbd57fdfef2090fa7946c588f3f6a9865c366235df487"},{"path":"packages/game/src/core/battle/battle-system.ts","anchor":"function tickPostAction(","role":"first-game-exhausted-queue-tick","lines":"2824","sha256":"1a0d5c35ae790035fac21caf7b5629728da3b3bf0ce56c098dcf864bf1ef58e2"}],"scope":"核四条敌方变身的脚本续走、共用过渡与站位。已验行动接线按固定候选逐字节复核，历史执行仍指各自原件。"},{"action":"q2-scene-observer-source-rebinding","base":"53f5fc147de8e987365ef7531dade6c83958ca1f","date":"2026-11-17","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"17","sha256":"58c41b9a02887ce8270d8b4ec78ca5a7e2f71d92ed09663e5bee8f083e4ec679"}],"scope":"观察插入点由分支内部移到整条绘制链之前。既有音效观察函数入口保持原字节，历史图像由本次终帧复验校正。"},{"action":"q2-cooperative-roster-source-rebinding","base":"839c6829346a53d8e5e149986d034460aba10432","date":"2026-11-17","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2467","sha256":"dfabef69a1c08450739ca60c8edadaa5ebf4432852fd2703c9a2e45a4126f20a"},{"path":"packages/game/src/core/battle/battle-system.ts","anchor":"function tickPostAction(","role":"first-game-exhausted-queue-tick","lines":"2824","sha256":"0a59cf8973b1f6fe989e86f896b86d9c5b6d454ef0a58fe25afbac83b27e4414"}],"scope":"合击执行与归位前死亡淡出修复后，复核 Game 回合收尾、Reforge 群攻及会话调用片段。旧候选和实跑原件保留原版本。"},{"action":"q2-casualty-roster-source-rebinding","base":"dd4bd6afd23882b8777ba8b50c3bb8d10a534d17","date":"2026-11-17","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2469","sha256":"4566fa4ec4ec3349ddc0b09b010cf1ee8cb94f3c522539bafc33beb9f919d088"}],"scope":"伤亡增益复用临时属性槽，复核既有群攻函数声明逐字相同，保留原执行与反例各自的生产基点。"},{"action":"q2-learned-skills-source-rebinding","base":"23c111a58d091685b556b0dc8f69e861317592e4","date":"2026-11-17","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/settlement.ts","anchor":"function drawLearnMagic(","role":"reforge-scroll-renderer","lines":"334","sha256":"fb1e40799ca5d96010faa657b3832cdc64f3641f289e6487f2ca38439515c771"},{"path":"packages/content/src/rewards.ts","anchor":"export function recoverBattleParty(","role":"post-world-script-half-recovery","lines":"254","sha256":"b99050d17542d4c734740d61d28261f1abacf7a662feae2a3f57aea515042e14"}],"scope":"按当前等级补学仙术并按角色编排结算后，练成渲染和战后半恢复声明的片段逐字相同，旧执行及反例保持原候选。"},{"action":"q2-wind-blow-source-rebinding","base":"aa999b84470b487dfff963ddcc55a90e1df84d7b","date":"2026-11-18","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2465","sha256":"e2824c80aebd63f0772bd27e4c2c982a7f1f594aeb50ff93f90323e4adca3ebd"}],"scope":"风卷残云的吹飞步长先于伤害结算消耗。既有多目标物攻调用坐标迁移，片段逐字节复核相等，原始 Q2 执行及断言仍对应各自候选。"},{"action":"q2-conditional-spell-source-rebinding","base":"af55382a655a20b5c78095d0de52f4419d0bad71","date":"2026-11-18","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2490","sha256":"febe65792973d19ffa6ca17e55cc875a8be4330e4341bf7f2229500e269a384f"}],"scope":"零灵葫值的目标退出收妖及后续效果。既有群体物攻声明移动七行，片段逐字节相同，原执行、断言及反例保持固定来源。"},{"action":"q2-gu-and-confusion-source-rebinding","base":"839c1ede2ffff006b0fc67be3deb1c1674b1b303","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-random-instrumentation.mjs","anchor":"export function instrumentBattleRandomDraws(","role":"native-random-producer-binding","lines":"28","sha256":"70f5a39d6ce82e7b292914b644d0bd29f82ee8d1df0e79d79b73a1f5392e403f"},{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2497","sha256":"72d26dc049e0e32d0276e5154c98eb11c519f331e1052efe52726f9fc14ecc21"}],"scope":"记录有效耗材失败的成长抽样。群体物攻声明和随机观察入口逐字节相同，原始执行及断言保留。"},{"action":"q2-spell-currency-source-rebinding","base":"1805ef135a1238b5c75d152ec643a6ff56053c1d","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-reforge-adapter.mjs","anchor":"running = runBattleTrial(","role":"public-trial-adapter","lines":"179","sha256":"a2e14923f564ad68d1fd7d0f06b2b8ea8d5fc010c8b6d6fcf04b135c3a580ec7"},{"path":"packages/reforge/src/battle/battle-command-selection.ts","anchor":"export class BattleCommandSelection","role":"native-target-menu-caller","lines":"60","sha256":"b131a44e94e45b6b234266db42373042e327543fcac691ab3abc3764cc049bb3"},{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2500","sha256":"e6459591d94658306264bd2f964413e911aed164bbdd274c9abd9ef86d04acf8"}],"scope":"观察战内实时余额。试打入口、选招类声明与群体物攻函数声明片段相同，原始执行及断言保留。"},{"action":"q2-escape-spell-source-rebinding","base":"768c8de4ea02d931826e583d00dc108677adbbea","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-game-adapter.mjs","anchor":"launch(input) {","role":"public-fixture-adapter","lines":"480","sha256":"447808408e830036b990f165e4d3bc495b0ec90df1608942ca7baa318823af85"},{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2500","sha256":"a4b9bfc4b143ae95303466a9ffe147c17aa419b680ac0c2e2a4250f55cf3ef0b"},{"path":"packages/game/src/core/battle/battle-system.ts","anchor":"function tickPostAction(","role":"first-game-exhausted-queue-tick","lines":"2827","sha256":"a093b0c4cbf79bd58e9d7f477586c406ea4d9b60ae7b9ba1d7313c394d99214b"}],"scope":"前摇与退场接线更新。群攻声明、Game 回合收尾与测试入场片段逐字节相等，旧运行与断言保留。"},{"action":"q2-battle-item-use-source-rebinding","base":"89dab268613141283aa49ddb228351060607316e","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2500","sha256":"4d88bd7d9da13d5f97d082181076d446791bdf07cacead405f0b879270c77ee1"}],"scope":"用物失败结果先于后续群攻声明。群攻声明的新坐标仍引用同一原字节，旧运行与断言保留。"},{"action":"q2-battle-hiding-source-rebinding","base":"970731da74e22ee1aa7bf661f6e5be6481d26332","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/game/src/core/battle/battle-system.ts","anchor":"function tickPostAction(","role":"first-game-exhausted-queue-tick","lines":"2828","sha256":"72615052ac514abb6f770bc4aa6ab016383934b615f826313320cb33cb0240c9"}],"scope":"Game 在下一轮选招前等待隐蛊渐显。轮末声明使用新坐标，引用行逐字节相同。"},{"action":"q2-battle-throw-status-source-rebinding","base":"55fcc99d356c1bb0332e687019b495c6eb340052","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2501","sha256":"6efb3ffd980d6f1e605a0df7273027ce214a3329368ebb29d13b244669d076fe"}],"scope":"投掷巫抗失败写入结构化结果。战斗核的原有声明引用行逐字节相同。"},{"action":"q2-battle-poison-narration-source-rebinding","base":"aa2e8d2c69c714d050e0d0ae0f684a123a968007","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-core.ts","anchor":"function performAttackAll(","role":"native-reforge-sweep","lines":"2501","sha256":"3282f9337a3faba540df13fb8af46d20788578969f0020ef03afdd4c4cbdd4d6"}],"scope":"寄生毒把产物卷轴随入账结果交给演出层。全体攻击声明的引用行与固定前驱逐字节相同。"},{"action":"q2-world-incense-source-rebinding","base":"5e3c1f59de533fa43ceed1ac052c9bcd84f1849b","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5769","sha256":"8c8472f7c6aab17d385537406fcd6fa79fa1e50ded49d31bf2660fc937725df6"}],"scope":"核感知香候选后的七处现行片段。旧执行、原件、断言和发布身份按原记录。"},{"action":"q2-scene-item-exit-source-rebinding","base":"25b4d5430f7daa410cef5e91447ac02e1dc00c3d","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5784","sha256":"8a4af5f672f57bf901a7129645548fcf1f50541f5925f424a2e16987898d5db7"}],"scope":"核场景用物候选后的五处现行片段。旧执行、原件、断言和发布身份按原记录。"},{"action":"q2-story-presentation-source-rebinding","base":"759886346d091f3dc2c0b67f72547c6861b81b6a","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5841","sha256":"090dfdd1f275e9c00e6f94909b0ec91ee1433edb8b02649cf7c6b1791a9b7514"}],"scope":"重绑四组现行引用。旧执行按既有候选恢复，两处构造片段按震屏输出职责迁移逐字节核对。"},{"action":"q2-cliff-entry-source-rebinding","base":"abfc31fcfd9a4ef16380ef4ae054604ad6159762","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5833","sha256":"24c8c811af1b5d863dd45ca3346e93fa2a248f1aa0530589765c3bd9cb917a05"}],"scope":"核现行引用字节相同；仅将入场淡入与前景正文的并行能力接到现有呈现事务。旧执行保留原修订。"},{"action":"fragment-party-pose-source-rebinding","base":"aee2d69c439378a5be98b154c2b788fbfed0a594","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5840","sha256":"ac9ee1b342efa818b3f5ee98ac75c309570c473b347a26c0ef94f0fad86f38e7"}],"scope":"单次点名姿势落在当前队员实例。核主文件入口范围逐字等同；呈现宿主范围只增加队员临时姿势表，历史执行身份与 Q2 战斗结论原样保留。"},{"action":"q2-coverage-and-scene-fade-source-rebinding","base":"45e199287d99ed0e2e4ed3f0bb8dd716f6d9d335","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-game-adapter.mjs","anchor":"launch(input) {","role":"public-fixture-adapter","lines":"480","sha256":"9b6711b6b5503b55ecd1345170262f562336cc08647aed26813085e3e383a324"},{"path":"scripts/e2e/battle-reforge-adapter.mjs","anchor":"running = runBattleTrial(","role":"public-trial-adapter","lines":"179","sha256":"1dbaabeaac8b477dc937396e287feb7c8975ec6606b7a2e6af5674bd72e81a6d"},{"path":"scripts/e2e/battle-trace-contract.mjs","anchor":"export function validateBattleTrace(","role":"oracle","lines":"973","sha256":"f40524a5fbee76f46b7727bc40233bf0d3e0c3c80d213060fabc0a5390c24790"},{"path":"scripts/e2e/battle-reforge-instrumentation.mjs","anchor":"function observeSfx(","role":"reforge-audio-producer-binding","lines":"17","sha256":"de22d569969d296532986f263a1272a5139d7aaceb2ca86da70d7f814f522e24"},{"path":"packages/content/src/rewards.ts","anchor":"export function recoverBattleParty(","role":"post-world-script-half-recovery","lines":"260","sha256":"95338fd47c8029d0d1cf043258eb97e9306c4a8a2f463952bc4c085e101a07b8"},{"path":"scripts/e2e/battle-world-review-split.mjs","anchor":"function nativeVideoEnd(path)","lines":"25","sha256":"6f2c354008b765ff88778eccf0b1e627b600f31d58bb328a6810d33701ddebaf","role":"visual-review"},{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5854","sha256":"a8752599580032fc642a55272af92bff0ac2e4b0f7006424a07d8570a8e68ead"}],"scope":"核装备、原编队及场景淡出合入后的来源适用性。引用片段与固定前驱逐字相同，历史执行、输入与断言保留。"},{"action":"q2-placement-feedback-source-rebinding","base":"cb83b4f76a150915105121482cbef9e4edd58d58","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5869","sha256":"b4775126324865d875104f49c04c8794117393f2d2cb4bc2ad467dcf5692eb58"}],"scope":"核场景用物受阻修复后的来源适用性。原菜单所有权、测试入口、场景和战斗引用片段与前驱逐字节相同。"},{"action":"q2-peach-grove-source-rebinding","base":"b1d046a12de4ec4082a5acbae64be24253881990","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5878","sha256":"2c0b1b8dd4dfa65558dc01ad32d9d2387484643ced17494cee838a04e3fa6cc2"}],"scope":"桃花林沿用来源脚点和常规跟随状态。原场景、相机、战斗、世界动作及存档引用片段逐字相等。"},{"action":"q2-world-notice-source-rebinding","base":"0b315ffc89248b157112ca83ebf77d557d6224ad","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5890","sha256":"dd136bdc4e175f0273ba803cc3479ad3095455dae4585cd58f403a47f9b4441b"}],"scope":"战外定时叙述归并关闭入口。原场景、相机、战斗、世界动作及存档引用片段逐字相等。"},{"action":"q2-entry-auto-source-rebinding","base":"814bd6c6195232e432cd39ccbcd450e78b9e2f95","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5883","sha256":"f2cf272fba59ab7ec2a80126ec76a56dbd254c1a59d2978c86ba92d57718fcb2"}],"scope":"脚本换场收尾与已恢复自动等待按当前游标接线。原场景、相机、战斗、世界动作及存档引用片段逐字相等。"},{"action":"q2-yangzhou-rooftop-source-rebinding","base":"7488f2961b0ef59a6020b6fe8bf419ccda8f1bc9","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-host.ts","anchor":"private async finishEncounter(","role":"world-encounter-finalizer","lines":"289","sha256":"ef22b37ef9a3e2eeebc48881553b210b3e10cb8b0a772c3194f9a04f5b3b09ea"},{"path":"scripts/e2e/battle-world-review-split.mjs","anchor":"function nativeVideoEnd(path)","lines":"25","sha256":"1303221f282edd7af88a91ca5bb64507e15b80bdda7c7ceb6d4dd63577b592b0","role":"visual-review"},{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5893","sha256":"26fc300b36ff338585b5af66c8d9acfe504496de5f4e38cdec97d19c3d882392"}],"scope":"剧情战共享实绘结算输入门，落步触发先落实跟随队形，追逐转弯保留离格方向。分屏器接入原场景起战。九个既有引用片段逐字节相等。"},{"action":"q2-lin-family-ring-source-rebinding","base":"99e87957d4c286470a0a827d8b473b4c782d638c","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/battle/battle-host.ts","anchor":"private async finishEncounter(","role":"world-encounter-finalizer","lines":"289","sha256":"62bfff1e975011e5b619981418aef3c3fa3630fdc5b5c345cb8f8c93f3eabc4b"},{"path":"scripts/e2e/battle-world-review-split.mjs","anchor":"function nativeVideoEnd(path)","lines":"25","sha256":"1a2d06555204d47b4f0c1089665588fa3d16f99b350586b212d0a85f62c770b5","role":"visual-review"},{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5900","sha256":"0e51a001632f36bb50993d682fb24fb1f9f2f724f5cf83c313dacb00fa897b2a"}],"scope":"按原盘保留相对运镜锚点，依对白和等待顺序交战斗配乐命令，林家入场在揭示前提交配乐。现行引用的原片段逐字节相等，历史实跑及其结论仍绑定各自执行候选。"},{"action":"q2-inn-boss-source-rebinding","base":"19f77feda2bb26bc4bf69d479fb8e513c3277878","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-world-review-split.mjs","anchor":"function nativeVideoEnd(path)","lines":"25","sha256":"02e0cfea55d49be033b6253e56d6df43130157c9be0fa83992b7fdfc5db73460","role":"visual-review"}],"scope":"战中对白保留已确认的可见槽直至脚本清除，分屏器接入有脚本移位的胜利返场。现行引用的原片段逐字节相等，历史执行继续绑定原候选。"},{"action":"q2-inn-escorts-source-rebinding","base":"92ff3fcef43905f172b41fb5411b8852ef7f6bf3","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5918","sha256":"8801ac86c8e0d5c6e3e8fe47a9c89343bcd6c36156def4f6ed214b35730131b0"}],"scope":"角色的循环追逐可选世界拍节奏，原有推进和存读档入口的被引片段逐字节相等。复用既有历史执行并保留各自原候选。"},{"action":"q2-tomb-source-rebinding","base":"fa362b07eedf6d472e215d71b951bf22c9d8b826","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/battle-world-review-split.mjs","anchor":"function nativeVideoEnd(path)","lines":"25","sha256":"c8bf851b4fb1126a83439a42f4b53e9a66d8097a5a096a0c8955850bbbf4c750","role":"visual-review"},{"path":"packages/reforge/src/main.ts","anchor":"async function restorePayload(","role":"save-restore-caller","lines":"5953","sha256":"1d2576cff65085e30445d8937ed7078db8682b07aa513689c033e4c95e5331f3"}],"scope":"血池渐变按输出步震屏并恢复队伍渲染层，将军冢增加直接切场的分屏边界。存读档、世界归属、战斗宿主、分屏解码及 Game 绘制反控的被引片段逐字节相等，各自原执行仍绑定原候选。"}]},"evidence":"domains/cross-phase/battle-foundation/evidence.json"}
-->

Provenance: 两端原生执行、实绘时间线、独立业务预期、原件离线重比和独立代码复核。
Primary source: [机器回执](evidence.json) · [Q2 收尾原件和分屏](../../../../tasks/evidence/E2E-Q2-1-battle-closeout-20261116.tar.gz) · [敌方施法、毒道具和分屏原件](../../../../tasks/evidence/E2E-Q2-1-enemy-casts-and-poisons-20261114.tar.gz) · [投掷、状态和友方仙术原件](../../../../tasks/evidence/E2E-Q2-1-battle-status-and-throws-20261113.tar.gz) · [战斗道具原件与带声分屏](../../../../tasks/evidence/E2E-Q2-1-battle-item-effects-20261113.tar.gz) · [合击与回梦原件及分屏](../../../../tasks/evidence/E2E-Q2-1-cooperative-fallback-and-spell-recovery-20261113.tar.gz) · [层序复跑原件与带声分屏](../../../../tasks/evidence/E2E-Q2-1-spell-layer-recheck-20261113.tar.gz) · [玩家战斗动作原件](../../../../tasks/evidence/E2E-Q2-1-player-battle-actions-20261113.tar.gz) · [伤亡对白与全灭原件](../../../../tasks/evidence/E2E-Q2-1-battle-casualty-presentations-20261113.tar.gz) · [玩家物攻伤亡原件](../../../../tasks/evidence/E2E-Q2-1-battle-player-casualties-20261112.tar.gz) · [行动节拍原件](../../../../tasks/evidence/E2E-Q2-1-battle-action-cadence-20261112.tar.gz) · [防御复位与自动格挡原件](../../../../tasks/evidence/E2E-Q2-1-battle-guard-20261112.tar.gz) · [动画与音效原件](../../../../tasks/evidence/E2E-Q2-1-battle-av-20261112.tar.gz) · [赤毒头像返工原件](../../../../tasks/evidence/E2E-Q2-1-battle-poison-face-20261111.tar.gz) · [第三批原件与分屏](../../../../tasks/evidence/E2E-Q2-1-battle-mechanisms-20261111.tar.gz) · [前两批复验](../../../../tasks/evidence/E2E-Q2-1-battle-followup-20261111.tar.gz) · [首批原件](../../../../tasks/evidence/E2E-Q2-1-battle-foundation-20261107.tar.gz) · [本次转场与复活分屏原件](../../../../tasks/evidence/E2E-Q2-1-battle-presentation-alignment-20261114.tar.gz)
Scope: 主矩阵登记 41 个固定正常战斗局面。敌方施法复验其中 10 个，毒道具另有 36 个独立局面。横向卷轴重用其中一个无影毒局面。特殊状态与增益另有 20 个固定局面，后续增加三个复活组合及三个真实明雷掉落种子。历次执行核动作、结算、伤亡、法术、合击、投掷、状态与实际画面和声音。普通明雷全灭及读档沿用独立验收。
Revision: 收尾文档绑定候选 `f8bc4292b7b5e8dc1b39c77502fd9197d2474559`，content23 / minimumSAVE12。收尾各局实际 producer 见归档成员；历史逐批候选继续取各节与原件。
History: 2026-11-07 首批闭环。11-11 复验绘制、普攻与敌方机制。11-12 复验节拍、防御、物攻伤亡。11-13 复验伤亡对白、雷咒、毒伤、普通全灭、玩家战斗动作、法术遮挡、合击降级、回梦收招、战斗道具、状态解除与友方法术。 11-14 复验卷轴、状态、复活组合及真实明雷掉落。同日按原盘和双端实绘复验明雷转场与复活演出。11-15 复验战斗退出、剧情必败与原生存读。
Supersedes: 无。
Stop line: 固定局面的验收按各自原件记录。逐项战斗内容验收逐条绑定双端实跑、效果与演出判据。
Next step: 依逐项验收目录补实际入口和双端回执，复用已获验收的固定局面。

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

## 2026-11-13 伤亡对白、雷咒、毒伤和全灭

冻结候选 `31002d214bb106272f34af46c86c57872b9b2849`。13 个固定局面在两端各独立执行两次，共 52 场。输入、目标、动作和结算先比较，再核实际绘制、音频启动、对白显示与清除。普通全灭另外用世界真实遭遇复验。 [机器回执](evidence.json) · [原件与原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-battle-casualty-presentations-20261113.tar.gz)

| 固定局面 | 两端实际结果 |
| --- | --- |
| 单灯笼伤亡对白，赵灵儿与李逍遥，seed 6 | 灵儿 HP 24→3→0。回位后等 10 个战斗帧打开第一段，实际绘制底部肖像 002 与顶部肖像 015，两个页面各自等约 685 ms 自动结束。阵亡后显示肖像 005 和约 1.4 s 的旁白。伤亡对白各页自行推进，唯一确认属于胜利结算。页面清除后逍遥 HP 100→150、武术 902→947，随后实际攻击 1,035。 |
| 敌方雷咒，队 186，战场 7，seed 6 | 两个起点各复验。逍遥 HP 85→27，五拍受击后原地濒死，播放 019。HP 24→0 的变体在受击开始播放 023，归位后倒地。旧 Reforge 漏了玩家基础法术抗性 100，第一例错误阵亡。 |
| 血口虫回合末赤毒，seed 50 | 灵儿 HP 11→4→0。毒伤数字首帧已归位，保留原姿势 8 拍再切濒死或倒地。该毒伤边界没有额外伤亡对白或灵儿的 020／024。 |
| 普通全灭，仙灵岛入口 s015 的 e206，队 16，seed 6 | 由码头 s014 走实际同路，1 HP 的逍遥防御后被绿叶小妖击倒。保留最后一帧战斗画面渐红，播放一次死亡曲 001，显示「胜败乃兵家常事也」「大侠请重新来过吧」。一次确认后实绘黑幕，再恢复到码头，HP 回到 1。 |

普通全灭两端各走 44 步离开码头、14 步接敌，接敌落点均为列 117、行 77，七次随机状态顺序相同。去除额外 1.2 s 停拍后，按防御至红屏交接的差约 91 ms。末帧有 207 个背景取样点在各自画面上准确映射到红色。Game 死亡文案出齐较慢，最后一次采样约比 Reforge 多 0.29 s。两端均录到黑幕先于实际恢复。

普通全灭固定 m01 为最新有效测试存档。Game 使用已保留的 006 存档，只把逍遥当前 HP 改成 1。Reforge 通过当前世界和存档 builder 创建同码头起点的合法 Q2 快照，保留相同角色属性、装备、钱和库存，再走正式恢复入口。现行 Reforge 的最近存档策略在有更新的第二槽时可能与 Game 的当前槽产生差异。多槽、坏槽、剧情自定义败局和无档分支仍在生命周期台账。定时旁白提前确认也留待单独复验。

上一段物攻伤亡已通过用户视觉验收和 CI，合入 `5d69289f406ea40deacfaf57b394e44041eaf120`。用户于 2026-11-13 通过本段原速带声分屏，范围为上述四类和固定 m01 局面。两项必需检查通过后，本段合入 `c3b646acaedcb4f14b9262976edb5122be96b12c`。 [物攻伤亡 PR #60](https://github.com/IllegalCreed/type-pal/pull/60) · [伤亡与全灭 PR #61](https://github.com/IllegalCreed/type-pal/pull/61)

### 六名角色的队友阵亡联动

2026-11-17 在原始单灯笼队 1、战场 12 试打，进场参考 s006 的 e150。两端使用相同装备、初始属性、敌人、种子与实际指令。灯笼实际击倒 HP 24 的目标，同一个援护者在对白结束后完成尚未执行的攻击，之后进入正常胜利结算。 [原始阵亡判定](../../../../../reference/sdlpal/fight.c#L774-L819) · [原始遭遇在作者工程的来源](../../../../../projects/pal/content/scenes/s006.json) · [角色关系与效果](../../../../../projects/pal/content/actors.json)

| 阵亡角色 | 援护者 | 修后双端实跑 |
| --- | --- | --- |
| 李逍遥 | 林月如 | 四支全部通过。 |
| 赵灵儿 | 李逍遥 | 四支全部通过。 |
| 林月如 | 李逍遥 | 四支全部通过。 |
| 巫后 | 李逍遥 | 四支全部通过。 |
| 阿奴 | 李逍遥 | 四支全部通过。 |
| 盖罗娇 | 阿奴 | 阿奴与李逍遥都在场且正常。两端均无伤亡概率抽样、对白或增益，阿奴继续执行原先提交的攻击。 |

| 决定分支的实际掷点 | 李逍遥的效果 | 林月如的效果 |
| --- | --- | --- |
| 75 | 真气回满，灵力 +10% | 体力回满，武术 +5% |
| 68、66 | 武术和灵力各 +25% | 真气回满，灵力 +9% |
| 42、32、50 | 身法与吉运各 +90% | 身法 +50%，吉运 +90% |
| 7、38、37 | 体力回满，武术 +5% | 武术和灵力各 +25% |

修前用仍穿装备的李逍遥和林月如核八支另加盖罗娇无联动。Game 漏接 0x30 第 21 行，第三支的吉运仍是 46。Reforge 旧算式以装备后的 46 为基数，得到 87。修后两端按裸吉运 37 增加 33，实际有效吉运均为 79。两端其余三项的百分比、回满体力或真气和攻击伤害也与原始脚本一致。Reforge 复用现有 Extra 槽逻辑，同属性的后续写入覆盖前一增益。Game 战后 Extra 槽归零，Reforge 已提交的大世界角色持久属性核对为起始值。 [概率门与临时属性来源](../../../../phase1/game-mechanics.md#2026-11-17-队友阵亡后的临时增益)

修后正式候选 `8c80a0cea5c247348ab2dc73dc3ad057c15092e6` 的 21 个局面共 42 场，双端比较全通过。逐例核到实际倒地姿势、原始阵亡音、肖像、分支全文、自动清除、清除后只应用一次的增益、随后出手、胜利写回和整段原生抽样。正例中，攻击收势到对白首画为约 400–417 毫秒。援护者失能、缺席、已阵亡、自动战斗与同时阵亡的双端边界按原台账另行推进。回合末毒伤无联动由既有对照覆盖，赵灵儿和林月如的自身濒死对白由独立用例跟踪。 [既有伤亡复验](../../../../tasks/evidence/E2E-Q2-1-battle-casualty-presentations-20261113.tar.gz)

21 个局面再用全新会话执行一轮。12 组独立录制覆盖六名阵亡角色和八种联动结果，其余 9 组另走 verify。两轮共 84 场，42 组双端及 42 组同端比较通过。同端逐项核初末态、实际指令和动作、原生抽样、临时效果和声效启动顺序。按录制轨迹复算后合成约 64 秒的原速分屏。左侧和左声道为 Game，右侧和右声道为 Reforge。核成片中倒地、两端共 38 个完整对白页面和复归行动的取样，两声道均有可解码音轨。最后一章是盖罗娇的无联动。执行索引保留成片校验值和重录入口。 [双端原件与分屏重录](../../../../tasks/evidence/E2E-Q2-1-player-casualty-roster-20261117.tar.gz)

#### 战后练成仙术返工

用户发现上一份分屏的首条练成在 Game 显示、Reforge 缺失。旧比较只核经验金钱首屏及体力、真气等终态，漏了习得列表和后续卷轴。夹具两端同设 24 级、空的已学仙术。补采修前三个原局面，角色均未升级。Game 在胜利写入所有已达到门槛的仙术并逐条实绘。Reforge 的习得表只在升级循环内遍历，实际少了授予和卷轴。以首段为例，林月如的新增技能依次为一阳指、铜钱镖、七诀剑气、元灵归心术、乾坤一掷、斩龙诀，修前 Reforge 清单仍为空。 [原盘机制](../../../../phase1/game-mechanics.md#2026-11-17-胜利时按当前等级习得仙术)

现行 Reforge 在胜利时为存活角色按结算后等级补学，复用已有习得表，已学或限用次数耗尽的技能跳过。结算依参战顺序显示每人的主升级、隐藏成长和练成。冻结候选 `798548a2573a6867496009cc5fd3c0fdfb0eb811` 双端实跑原 21 个局面和已学齐对照，以原始习得表核算。两端各 143 张实际练成卷轴，逐页技能名、入账 ID 与顺序一致。存活且已学齐的李逍遥无重复提示，倒地的赵灵儿跳过，盖罗娇局里阿奴未达习得门槛。原比较器对 21 个阵亡局面的对白、增益和随机抽样复算仍通过。

从归档分别恢复及重比 22 组修后运行、4 组修前运行和两组独立录制。修前 3 组的 Reforge 均漏入账与卷轴，已学齐对照在两版本均通过。两组录制的原速带声补片长约 13.2 秒，左侧及左声道为 Game，右侧及右声道为 Reforge。解码核查林月如六门、李逍遥七门仙术的双端实绘及两声道。卷轴沿用各端既有位置。对应 4 份 Reforge 执行报告保留缺省项目存档的 404 提示，无页面错误。 [双端原件、反例与重录入口](../../../../tasks/evidence/E2E-Q2-1-victory-spell-learning-20261117.tar.gz)

## 战斗功能覆盖盘点

以物攻伤亡验收基点 `f84bcd91dd71498e1099e7bf8f4b2d7900507090` 的现行菜单、运行时与 PAL 内容为输入。作者工程有 234 项物品，含 100 项使用配置、76 项投掷配置、106 项装备配置。76 项投掷中单敌 65 项、全敌 11 项。原始标志另有糯米、盐巴、大蒜、黑狗血、雄黄酒、烧肉、腌肉七项投掷入口为 0。本批接入后共有 83 项投掷，单敌 71 项、全敌 12 项。103 条仙术定义中，当前初始、升级与剧本授予触达 63 条玩家可习得技能。另有 5 个不同合击技能、52 个不同敌方 AI 施法技能，三组存在交集。 [当前物品](../../../../../projects/pal/content/items.json) · [当前仙术](../../../../../projects/pal/content/skills.json)

| 功能 | 已有双端实跑 | 需继续实跑的合同 |
| --- | --- | --- |
| 选招、普通攻击与防御 | 单人和多人选敌、回梦取消后重选、普攻、仙女剑双击与第二击会心、首击致死后同槽完成第二击、主动防御、自然格挡和行动节拍、玄冥宝刀双挥及先击倒仍占原槽 | 其它动作的取消与重选、其它群体武器及多目标编队、援护成功与失能、自动与重复指令、目标先阵亡后改选 |
| 使用、投掷与道具效果 | 止血草、雄黄解赤毒、木剑166。灵蛊全体与鼠儿果单体回气、自然阵亡后还魂香、风灵符群体元素、雷火珠附带火伤与独立固定扣血、尸腐肉施毒、无影毒当前 HP、吸星锁吸血、毒龙砂群体混合与抵抗、七件仅消耗的投掷、化尸水阈值与未达标提示、六种大毒与毒龙胆、无影毒上限 | 其它武器和元素、其它独立定额、其它异常投掷的抵抗及无效反馈、缺库存、对活人用复活药、替换装备与战外带入 |
| 玩家仙术、召唤与合击 | 气疗术、五气朝元，五灵单体、旋风咒与御蜂术群攻，爆炸381正常合击的贡献者扣血、占用行动和飘字，两人队失能降级，回梦及代表性伤害法术的收招 | 无属性和其它毒系伤害、复活仙术、召唤、偷窃及炼化、钱和次数成本，真气不足、未学会、战内外可用性，未测仙术的收招、原盘图层偏移与实际遮挡。其它合击、三人资格、Game 长鞭降级和同回合已提交动作 |
| 特殊状态、增益与毒 | 双向昏睡的行动跳过，玩家回梦命中及抵抗，金刚咒护体实扣伤害、回合倒计时和终局清除，赤毒附着与伤亡及解毒，灵心符清除睡眠、定身、封咒，较短护体重施与自然过期，混乱、傀儡、勇气、加速、双动、梦蛇、封咒降级、蜘蛛附眠、重施及叠加解除，梦蛇阵亡及复活后的形态与连击，叠着勇气与双动的傀儡自然到期及提前复活 | 不同敌人的附带状态边界、毒槽、装备伪毒和战前后状态 |
| 敌 AI、伤亡与音画 | 双动、敌法与物攻、实绘与实播音、回合节拍、受击复位、物攻与雷咒伤亡及两段实际对白、七个敌方施法者的起手/受击/复位及三类群体落点、十里坡战斗和胜利曲实播 | 其它敌方特殊脚本、召敌/分身、变身、敌逃与强制结局，其余战斗与胜利配乐、各敌方专属演出与控制权 |
| 世界入口和结算 | 固定试打的胜利、奖励与半恢复，普通明雷全灭红屏及固定 m01 恢复，十里坡接敌换屏与战斗乐、蜜蜂逐槽掉落、战场提示、半恢复、明雷隐藏、胜利淡黑和淡入及回到原地图 | 成功和失败逃跑、剧情必败分流、世界成长与升级学技、其它物品掉落、其它世界恢复入口及中断、明雷计时到期重现、正常世界存读、多槽和坏档恢复 |

已重新执行 Game 的投掷、仙术、合击、状态与召唤定向测试 59 项，以及 Reforge 的对应规则、选招会话和动画定向测试 159 项。这些是各端现有测试的实跑结果。表中的双端实跑结论仅指带合法输入和独立原件的 E2E 场景。

### 玩家五灵单体仙术实跑发现伤害差

候选 `0a9f8a6d27d88483043425073be48396e1567ff8` 使用灵儿已会的五种仙术、同一只血口虫、战场 7 和 seed 50。两端都从真实仙术菜单选招，实际从 100 MP 扣除相同消耗。该历史候选五种伤害均有分歧。修复和定向反例见下方新候选。

| 仙术 | 实扣 MP | Game 伤害 | Reforge 伤害 |
| --- | ---: | ---: | ---: |
| 风咒 312 | 5 | 81 | 101 |
| 雷咒 316 | 7 | 104 | 128 |
| 冰咒 321 | 5 | 116 | 145 |
| 炎咒 327 | 8 | 155 | 187 |
| 土咒 332 | 6 | 172 | 212 |

血口虫的防御原值是 10，等级 12。CLASSIC 和 Game 在普通玩家法术伤害中使用加上等级项后的 82，该次 Reforge 候选使用 10。日志另显示施法成长抽样与法伤浮动的次序不同。现行实现与复跑结果见下一节。逐物品、技能和效果类型盘点见归档的 `battle-coverage-inventory.json`，该次原件见同归档 `spell-probe-compare.json`。 [原版施法](../../../../../reference/sdlpal/fight.c#L4284) · [Game 施法](../../../../../packages/game/src/core/battle/magic-damage.ts#L96) · [该候选的 Reforge 公式](https://github.com/IllegalCreed/type-pal/blob/0a9f8a6d27d88483043425073be48396e1567ff8/packages/reforge/src/battle/battle-core.ts#L1597-L1612) · [复验归档](../../../../tasks/evidence/E2E-Q2-1-battle-casualty-presentations-20261113.tar.gz)

## 2026-11-13 玩家仙术、合击、投掷与状态

冻结候选 `f03b46b2ae192f78d132ef933f86f0fa242dd0db` 使用公开 Game 试打与 Reforge 试打入口。每个局面准备相同队伍、实际装备和派生属性、原敌队、战场 7、技能、库存及种子，后续走两端真实按键。26 个局面各端各两次，共 104 场。原件重比通过 52 组跨端和 52 组同端，采到首条战斗指令之后的 712 次 Web Audio 音效启播。固定分组可使用 `--group=established` 或 `--group=player-actions`，采集和比较须使用同一组。 [机器回执](evidence.json) · [原件与分屏归档](../../../../tasks/evidence/E2E-Q2-1-player-battle-actions-20261113.tar.gz)

| 局面 | 双端复验 |
| --- | --- |
| 五灵单敌，队 115，seed 50 | 风、雷、冰、炎、土的实际伤害和飘字均为 81、104、116、155、172，实际真气分别扣 5、7、5、8、6。冰咒与土咒旧 Reforge 分别请求特效音 2、3 次。实际施法各请求并启播一次。时间线定向复验另核特效首帧挂音，沿用此前用户选定的时序。 |
| 风咒抽样，队 115，seed 6 | 三个队列抽样后，第 4 抽分给敌槽 0 的伤害，第 5 抽分给施法成长。两端都是 82 点和隐藏真气成长 3。旧 Reforge 用裸防并调换两抽，得到 105 点、成长 2。 |
| 旋风咒313、御蜂术353，队 116，seed 2 | 两次均为真实全敌指令。各按槽 0、1、2 分别抽倍率，然后抽本次成长。旋风咒 115/114/113。御蜂术完整伤害 346/354/348，原始数和实际飘字对齐，有效扣血分别为 195/196/197。三只同种敌同时死亡各请求一次死亡音，音频宿主对同一声音实际启动一次。 |
| 爆炸381，队 115，seed 6 | 赵灵儿和阿奴各付 10 HP，MP 保持 100。敌实际扣 161 并显示蓝字 161，参与者耗血没有飘字。阿奴当轮真实跳过行动，下一轮可以正常出手。旧 Reforge 伤害 193，且扣费曾额外绘制两名玩家各 10 的蓝字。 |
| 木剑166，队 115，seed 2 | 李逍遥裸武术 50，装备后 52。先抽投掷武术倍数 2，再抽命中倍率。伤害和飘字 219，背包只扣一把且装备槽保留。两端记录挥臂角色音 009、命中特效 347 的实际播放。 |
| 回梦303，队 62，seed 4 | 两场均真实取消一个敌目标再选另一敌。概率掷 24、巫抗掷 5，后续再抽成长。开膛鬼实际睡眠 4、当轮跳过、轮末减至 3，击倒后留存槽在下一轮末减至 2。灯笼抵抗并继续行动，原生画面显示约 1.4 秒「攻击无效」。均扣 20 MP。 |
| 金刚咒309与净衣咒306对照，队 1，seed 3 | 同目标、同抽样，护体应用 7 回合，第一轮末减为 6，胜利后清除。主动防御中命中 14 对 28，次轮主动防御已解除时命中 19 对 38。 |

旧版原始资料分别记录防御等级项、错误抽样分配、法术飘字钳成剩余 HP、木剑使用装备后武术、投掷起手音缺失和死亡敌槽状态停计。两份探索报告在采集中检测到声明的场景文件变化而失败，原件仅保留为诊断，正式通过取固定候选。用户复核影片分开采集原速画面与浏览器声轨，以首条实际提交对齐。投掷另核角色声至命中特效声的间隔。旧 Reforge 少了特效前的一拍，恢复后两端各两次的实际播放间隔约 433–452 ms，均在原版 11 个 40 ms 战斗帧的一拍以内。旧 Game 在首次显示 219 时已归位，旧 Reforge 多停一拍后才归位。两端依原版在伤害出现后等四拍归位，再等四拍结束投掷。最终两次执行中，出字到实际归位约 150–167 ms，归位到动画结束约 167 ms，另约 34–50 ms 后阿奴起手。离线判定分别核这两段和窗口内的实际姿态。 [原版投掷收尾](../../../../../reference/sdlpal/fight.c#L4369-L4372)

旧 Reforge 在金刚咒和净衣咒的真实队友目标局面把法术精灵画在施法者身上，也漏了受术者辉光，首个敌方动作早约 0.45 秒。两种法术用同一 FIRE 资源和偏移。旧版实际画在 (194,158)，新版双端逐帧核李逍遥受术底锚 (250,134)、连续资源帧 0–23 和辉光升降。另取已纠正落点和辉光的中间候选复跑，金刚咒特效先于受术者绘制，原本重叠的特效被遮挡。两条作者技能补入原盘图层偏移 99，实际比较按渲染调用顺序核特效盖在受术者前景。最终八份原件均完整，两端首次施法画面到下一敌方动作的间隔相差约 35 ms。自身和全队法术仍需双端实跑，原版对正在施法的受术者使用前移后坐标，Game 当前使用初始底锚。该候选两场回梦的实绘施法到后续敌动作仍有约 0.30 秒差异。该次记录核命中、抵抗、效果及提示清除，收招复验见下文。其它法术的原盘图层字段差异与完整收招节拍保留在台账。 [原版友方仙术](../../../../../reference/sdlpal/fight.c#L2448-L2606)

合击降级的 Game 探针已定位到合法反例。半人树妖先催眠队友时，赵灵儿回退到保留仙女剑双击的普通攻击。该候选 Reforge 的降级分支只结算一击，后续同输入修复见下文。原始投掷标志但无脚本的糯米、灵心符解除睡眠后当轮恢复、其它合击、投掷与状态也保留在台账。

## 2026-11-13 爆炸与同批法术图层返工

用户在先前分屏看到爆炸被血口虫盖住。前一候选只在两种友方仙术采层序，爆炸通过的是伤害、耗血、飘字和音效判据。新采集在两端完成实际绘制后记录同帧敌我与法术顺序。在该血口虫局面，爆炸原盘 FIRE 12 的底中锚为 (98,100)，加原盘层偏移 99 后按 199 排序，血口虫在 (100,110) 按 110 排序。Reforge 旧作者字段缺席时按 0 处理，实际是爆炸顺序 0、敌人顺序 1。两端各跑两次的旧版原件被新判据稳定区分。 [机制来源](../../../../phase1/game-mechanics.md#2026-11-13-玩家仙术合击与投掷武器)

旧版离线比较共拒绝 20 场，分布在十个现有局面，包含爆炸、旋风咒、气疗术、玩家雷咒、炎咒、土咒、两种敌雷咒伤亡和两种玩家回梦。旋风咒中柱与左下血口虫的素材存在实像素交叠，旧版已见错层。十条已触达的缺失字段逐一核原盘有符号字，作者工程只补这些图层值，木剑模拟法术 344 的零偏移保留。双端当前判据校验实际 FIRE 编号、全部源帧、落点和同帧绘制先后。

修复候选 `4c7d4f9a78981f13a4c3ab3b9df441bc776eed23` 的 26 个固定局面各端各跑两次，共 104 场。52 组跨端和 52 组同端比较通过，记录 64 个新增法术画序窗口。爆炸两端均实际绘制 FIRE 12 的 15 个源帧，画在血口虫之后。该轮另取爆炸、群攻、五灵中的雷炎土、气疗术及敌雷七个代表局面，使用同候选重录原速带声分屏。该轮验收范围包含上述层序。回梦节拍及合击降级在下方独立复验。 [层序复跑原件与带声分屏](../../../../tasks/evidence/E2E-Q2-1-spell-layer-recheck-20261113.tar.gz)

## 2026-11-13 合击降级与回梦收招

用户指定修复合击降级漏第二击和回梦后敌方过早出手。修前两端同队204、战场7、seed25，赵灵儿实装仙女剑170，提交爆炸381。半人树妖先令逍遥 HP150→149 并睡眠3。Game 降级为普通攻击，依次 141、437，第二击会心。旧 Reforge 实际只结算 141，敌剩 659。第二轮同输入后仍剩 367。原件在第三轮停于无后续指令的选择界面，首轮原生、实绘和 HP 差被独立判据拒绝。

修复复用普通武器攻击和成长。两端同场第一轮敌 HP800→222，无合击耗血或耗真气。第二轮普攻 138、146 后正常结算，两人各获 135 经验，队伍获得 60 钱。第一轮实绘两次挥击帧与蓝字，右缘均为 106。实际启动的角色音和兵器音为 038、002、006、002。规则另用合法林月如长鞭用例核 Reforge 武器扫目标。两端正式验证为仙女剑这一个降级局面。首条指令对齐后，Reforge 的半人树妖先手回梦在进入主特效前约早 0.18 秒，旧版同局面已如此。该敌方起手属于独立待核项。

| 回梦局面 | 旧版首次实际施法至敌起手 | 修复后特效消失至归位，Game / Reforge | 修复后首次施法至敌起手的最大跨端差 |
| --- | --- | --- | --- |
| 命中开膛鬼 | Reforge 早约 0.30 秒 | 366.9 / 366.6、366.7 / 366.7 毫秒 | 15.3 毫秒 |
| 灯笼抵抗 | Reforge 早约 0.28–0.32 秒 | 367.6 / 366.6、366.8 / 366.7 毫秒 | 2.1 毫秒 |

旧版无伤害仙术省略前四拍并提前归位。修复后的普通对敌仙术在主特效消失后完成九拍收势。五灵、旋风咒及两个回梦场景验证实际位置、站姿和后续行动，伤害法术另核首次受击姿的蓝字与目标底锚。Game 的渲染先于逻辑飘字时，蓝字须在同一受击姿及一个 40 毫秒逻辑帧内实绘。回梦命中无伤害数字，抵抗沿用两端归位后约 1.4 秒的原生旁白。

冻结候选 `c0261df4ad87aff4d89a972a60c03a0f6eb9b294` 的 27 个局面共 108 场。54 组跨端、54 组同端比较通过。回梦两种结果从特效消失至实际敌起手的跨端差最多 32.4 毫秒。三场另以同候选真实键盘重录原速带声分屏，左 Game、右 Reforge。合击多人及首击致死、Game 长鞭降级留在台账。 [合击与回梦原件及分屏](../../../../tasks/evidence/E2E-Q2-1-cooperative-fallback-and-spell-recovery-20261113.tar.gz)

## 2026-11-13 战斗道具与投掷

双方使用原队 1、3、80 或 115，战场 7、固定随机种子和相同有效装备。Game 走公开 fixture，Reforge 走公开试打，后续真实菜单与键盘操作。实际指令、库存、毒槽、各用途随机抽样、结算和目标画面均进入独立判定。

| 局面 | 关键结果 |
| --- | --- |
| 灵蛊与风灵符 | 两人真气 41/54 → 100/100，各自实绘青字 59/46，辉光同步。风灵符一次消耗命中三个灯笼，均显示 95，实际 HP 各 30 → 0。鼠儿果和止血草留在背包。 |
| 毒龙砂 | 白无常与僵尸兵 HP 300/330 → 245/214，显示 55/116。白无常抵抗施毒仍受固定 55，僵尸兵依次受毒系法术 41、毒入口 20、固定 55，只有其毒槽记录 553。 |
| 尸腐肉、无影毒、吸星锁 | 血口虫分别扣 12、156、180，尸腐肉新增毒 552。吸星锁同时显示敌蓝字 180 和施用者黄字 140，后者锚在出手位置 (190,172)，数字右缘 196、起始纵坐标 97。 |
| 鼠儿果与还魂香 | 鼠儿果真气 50 → 86，归位后显示青字 36，战后 93。灯笼先击倒逍遥，灵儿用还魂香把其 HP 从 0 提到 15，黄字出现时已由倒地帧 2 切换濒死帧 1，随后阿奴完成战斗。 |

旧 Game 毒龙砂同一敌槽出现 41、20、55 三个数字。旧 Reforge 对三个灯笼的风灵符各显示 30，灵蛊只有施用者辉光，吸星锁的黄色恢复比蓝色伤害晚约 316.6 毫秒，还魂香出字时仍是倒地帧。Game 原来在脚本前等待八拍，鼠儿果出字后约 30.7 毫秒就交给下一位。修正后从举物到变化数字的双端最大差约 16 毫秒，从数字到下一位最大差约 19 毫秒。已裁定的 Reforge 靠近动作保留六步，Game 保留原有单次位移。

还魂香分屏以第一轮首条真实指令对齐，Reforge 的黄字比 Game 晚约 465 毫秒。第二轮最后一条菜单指令提交晚约 200 毫秒，后续六步靠近也计入录像时间。分屏中的举物到出字为 Game 519、Reforge 533 毫秒。

原始模拟法术 24 的基础字段为 WORD 64537，按 SHORT 参与计算时为 −999。其调用仍抽逐敌浮动，结果钳零。29 件来源相同的投掷物在现有 `magicDamage` 结构保留该一步，正式双端局面验证用途顺序、值及后续攻击。七个局面各端各跑两次，14 组双端与 14 组同端比较通过，实播动作声 152 次。Game 首次完整矩阵在关闭浏览器时超时，独立重跑后与已完成的 Reforge 原件通过 34 局面的全矩阵比较，共 136 场、68 组双端与 68 组同端比较。 [道具原件与分屏](../../../../tasks/evidence/E2E-Q2-1-battle-item-effects-20261113.tar.gz) · [规则来源](../../../../phase1/game-mechanics.md#2026-11-13-战斗道具与投掷)

上一道具批次另做化尸水诊断。两只罗汉腿满血各 420，无影神针先令其中一只剩 20（4.76%），然后两端都实际投掷并消耗化尸水。Game 保留 20 HP，Reforge 按当前作者工程的逐敌 5% 配置击倒目标，同时生成「无任何效果」日志和提示字段，实际提示画面待核。交换低血量槽后同样复现。原始全体标志和单敌脚本共享旧版 last-event 上下文，Game 当前全体投掷没有该目标。七件原盘投掷标志存在、脚本为零的物品也实查菜单。Game 八项均可选，Reforge 只显示同袋的无影神针。该诊断停在七件空脚本物品的菜单资格，实际投掷和消耗待核。

道具组与全矩阵的归档原件可用同候选和同指纹输入重比。旧版吸星锁采集器已恢复为两端原报告共同记录的 6,525 字节，SHA-256 为 `6dc0c87b8a58dad9234e4b93123bdcaecce2667c30835f8e6b35d7001cdc5d06`。两份历史报告及轨迹保留原字节。空投掷脚本的初探及后续菜单对照保留各自驱动。四段原速带声分屏已获用户验收。 [原件与索引](../../../../tasks/evidence/E2E-Q2-1-battle-item-effects-20261113.tar.gz) · [用户验收](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#用户验收)

回读吸星锁分屏发现两端同为 10/150 HP，Game 初始实绘濒死帧 1，四步前移时切成站立帧 0。Reforge 保持帧 1 到举手帧 5。SDLPal 的前移阶段只改位置，举手前没有玩家姿态赋值。该轮已核吸血数值与出字锚点。前移姿态的修复见下方复验。 [原版挥臂](../../../../../reference/sdlpal/fight.c#L4338-L4356)

## 2026-11-13 投掷、异常解除和友方仙术

本批五个固定局面的两端各跑两次，共 20 场。10 组双端及 10 组同端原件比较均通过。检查真实指令、实际行动者、结算、逐次规则随机抽样及绘制和音效，观察点按技能、目标和动作定位。

| 局面 | 原件确认的结果 |
| --- | --- |
| 灵心符 `sleep-cleanse` | 半人树妖回梦使逍遥睡眠 3→2。阿奴从真实菜单用符，逍遥同回合醒来，按原排队自动攻击并造成 144 点伤害。比较器从两端实际行动来源核逍遥的槽位。 |
| 金刚咒 `player-protect` | 护体 7→6。两次物理伤害为 14、19 点，此前同种子净衣咒对照为 28、38 点，战斗结算清除护体。 |
| 五气朝元 `player-party-healing` | 灵儿真气扣 40，两名队员都回到 260 HP。原盘 FIRE28 共 24 帧，偏移 (−6,−18)，层偏移 +99。每帧两处按实时脚点绘制，覆盖两名队员。离线逐槽另核四份原件的帧序，各槽按 0 至 23 同步绘制。旧 Game 的施法者特效落回原位，旧 Reforge 特效被角色挡住。 |
| 吸星锁 `item-throw-drain` | 逍遥以 10/150 HP 前移四步，保持濒死帧 1 直到举臂；蓝字 180 和黄字 140 同帧。用旧 Game 原件反控，定位四次前移的错误站姿。 |
| 盐巴 `item-salt-throw` | 从实际全敌投掷菜单选择，耗一份、播放挥臂和投掷音效。两只敌人的 HP 和状态保持，动作无额外随机抽样。随后灵儿首击致死，仙女剑仍在同一敌槽完成第二击。旧 Reforge 漏击并改变下一位的伤害抽样。 |

旧比较器会接受解睡原件中被改错的行动槽，以及群疗同一帧同时少一名队友和其 FIRE 图的原件。补判据后两端原件通过，四个改动样本均在对应义务失败。反例脚本和原件字节随批归档。

七件入口为 0 的原盘投掷物均有独立真实操作。糯米、大蒜、黑狗血、雄黄酒、烧肉和腌肉单体投掷，盐巴投全敌。七件消耗各一份，实际出现举臂、出手和音效，双方数值、状态和规则随机抽样保持。Reforge 以显式空效果数组表达这类物品。实际编辑器保存重开可保留空效果配置。已恢复的吸星锁旧采集器按两份历史报告的 SHA-256 校验，复跑重现旧 Reforge 黄字比蓝字晚约 317 毫秒。 [旧采集器原件](../../../../tasks/evidence/E2E-Q2-1-battle-item-effects-20261113.tar.gz)

化尸水四局核继承槽 0、继承槽 1、双低血量和双满血。用本地原始 SSS、DATA 驱动 SDLPal 的完整触发解释器，30 个独立输入核到入口 0 也更新继承参数，420 HP 上限时 21 HP 达标、22 HP 超线。Game 按原脚本检查继承的一个敌槽。Reforge 依现行作者工程的全敌 5% 配置逐个判定，两敌均达标时两只都倒下。Reforge 在所有目标均未达标时显示一次「无任何效果」。Game 的提示条件是继承槽未达标。提示用中央小窗，保持出手姿势，手动确认或约 1.4 秒后继续收招。旧 Game 到出手后一拍才开框，双端首帧相差约 33.5 毫秒。Game 改在第二个出手拍结束时开框，本次实绘从出手首帧至开框为 83.0 和 83.4 毫秒，关框后 166.4 和 166.6 毫秒复位。 [原始规则](../../../../phase1/game-mechanics.md#2026-11-13-战斗道具与投掷)

固定中间版本 `b40d9f241` 的另五组 20 场实跑还确认了定身清除后当轮出手，封咒拒绝仙术操作、解封后可正常施术，较短护体重施时保留较长剩余回合，以及护体最后一轮伤害 13、过期后恢复到 27。相应日志各自绑定原执行版本。

原速分屏保留两端音轨，左 Game、右 Reforge。前一批验收已随 PR #64 合并。本批分屏待用户验收。 [本批原件与分屏](../../../../tasks/evidence/E2E-Q2-1-battle-status-and-throws-20261113.tar.gz) · [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#2026-11-13-投掷复核状态解除和护体)

## 2026-11-14 敌方施法和毒道具

敌方施法用 10 个固定局面各端各跑两次，40 场全部完成正式结算。20 组双端与 20 组同端比较通过。逐帧核施法者两步前移、实际姿态、FIRE 的帧序和落点、被动格挡的进入帧、目标飘字和受击、施法者归位，并核原生音效请求与播放。原盘 52 个可达敌方仙术的动画字段和敌方本体伤害与现行数据逐项校验。39 个技能补入原盘有符号层偏移，五个毒系技能补入原盘敌方本体伤害。 [原始机制](../../../../phase1/game-mechanics.md#2026-11-14-敌方施法与六种大毒)

| 局面 | 双端原件 |
| --- | --- |
| 半人树妖回梦 | 施法者从 (100,110) 先后到 (112,116) 和 (116,118)，帧 1 保持到 FIRE40 与受击结束，随后回 (100,110) 帧 0。起手到首张 FIRE 实绘 280–283 ms。旧 Reforge 持待机帧，旧 Game 在 FIRE 首帧提前回位。 |
| 镰刀鼬弦月斩、小雷公雷咒 | 核不同专属姿势、两步位置、实际起手与效果声、格挡首帧、伤亡及回位。弦月斩的背景烙印继续绘制，比较器从活动 FIRE 单独判帧。雷咒阵亡的音效与数字在同一逻辑拍，允许相邻浏览器刷新。 |
| 群体三类落点 | 黑衣道众旋风咒以三点同步绘制 40 帧，效果音只请求一次。芒刺鬼血魔神功在 FIRE 帧索引 14 切为攻击姿势。海螺女狂风术按三拍专属帧和动作帧运行，起手声存在，效果声依负值起手标志保持静音。 |
| 小巫师咒蛇 | 0x29 毒抗通过后瘴毒即时扣 20，再按原盘本体 166、实际防御与随机抽样算出 95 点。FIRE42 结束显示一个蓝字 115，逍遥从 800 降到 685。 |

毒道具另跑 36 个独立局面，每个引擎各 36 场。真实菜单选择、消耗、焦点目标 HP 和毒槽、随机用途及数值、实绘飘字先各端对原盘预期判定，再直接做 36 组双端比较。它们与施法矩阵共用真实入口、录制合同和输入回执。

| 范围 | 双端结果 |
| --- | --- |
| 六种大毒 | 六条定向解毒全部通过。三对致死组合分别从两个方向实际使用和投掷。反向相克、投掷不解已有毒、第二掷被抗仍触发致死、相克优先、重复上毒不重启均另有对照。 |
| 毒龙胆 | 保留其它队员状态。所选队员的赤毒和 3 级毒清除，HP 保持。无毒所选队员立即倒地。4 级和装备伪毒只按原始脚本及等级门说明，本批实战取干净、赤毒、3 级和两级并存的队员。 |
| 无影毒 | 自用实测 21→10 和 20→10。投掷实测 20→9、1997→998、1998→998、2000→1000，封顶值为 1000。两端当前毒槽均保持为空。 |
| 首次发作与游标 | 大蒜 30 毒抗抵消抽到的 24。新毒成功后鹤顶红即时扣 50、赤毒扣 7。三尸蛊首次挂毒零伤，玩家第一回合末仍零伤、第二回合末扣 1，敌人第一回合末扣 111。其余递增值及自解除取原始脚本。 |

旧原件保留缺位移、提前归位、毒抗缺抽、首次发作过晚和三尸蛊敌方游标抢跑。新判据拒绝篡改后的活动 FIRE、姿态、群体落点与蓝字。旧版毒比较器漏读可缺席的回合数组，修正后仅替换声明为离线判据的文件，逐项核原生生产闭包、Git 判据摘要和未改的两端轨迹。46 个局面的正式执行与比较各自保留身份。原速分屏取同一生产候选，左 Game、右 Reforge，音轨对应各边。前三段从实绘施法起手对齐，后两段从实绘用物或投掷起手对齐。待用户视觉验收。 [本批原件与分屏](../../../../tasks/evidence/E2E-Q2-1-enemy-casts-and-poisons-20261114.tar.gz) · [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#2026-11-14-敌方施法与毒道具复核)

## 2026-11-14 横向卷轴文字复核

用户从无影毒分屏发现两条练成仙术提示的字样不同。回看旧录制中的「天师符法」和「旋风咒」，两端使用的字模相同。Reforge 的米白标签、三处字形阴影、蓝色术名和段间空隙来自结算的绘制样式。类似样式也出现在修行提升标题、隐藏属性提升和主菜单金钱。原盘的浅底提示用黑色且没有字形阴影。练成术名用标准色板 0x1B，在项目中展开为 RGB (203, 89, 77)。 [文字与色号来源](../../../../phase1/game-mechanics.md#2026-11-14-横向卷轴的文字)

Reforge 将经验与金钱、修行与隐藏属性提示、练成仙术、主菜单金钱、单行旁白及世界取物的普通标签共用同一黑字无阴影样式。练成术名显式用红色，按字模宽度紧接前段。已有居中和卷轴自适应宽度继续使用。旁白的显式着色、可选项高亮、商店窗口和红底升级属性表各按现有样式绘制。 [共用标签样式](../../../../../packages/reforge/src/menu/menu-box.ts#L169) · [商店卷轴字色](../../../../../packages/reforge/src/menu/shop-box.ts#L43)

用同一支队伍、种子 4 和三次实际战斗指令重跑原场。两端都依次投两次无影毒，由阿奴攻击结束。敌方体力从 2250 降到 1250、624，两端抽样前缀及一次结算相符。每端七个结算画面都取实绘原件，用原字体位图及标准色板逐像素核对文字。经验和金钱三个标签、三人修行提升和阿奴体力提升的字形、纯黑笔画和无阴影均相符。「李逍遥练成天师符法」为 354 个黑色像素与 231 个红色像素，「赵灵儿练成旋风咒」为 294 个黑色像素与 200 个红色像素，两条在每端均与源字模相符。主菜单实按 Esc 打开，Reforge 的「金钱」实绘匹配 136 个纯黑像素。

拾取回归由真实提示队列交给画布，直接核笔画像素及其邻点。旁白回归通过正式作者对白解析器校验单行卷轴的黑色默认字、显式黄色和无阴影。显式黄字是合法作者样例，当前 PAL 项目的单行旁白未用此组合。反控分别恢复旧字色、字形阴影与段间空隙，或丢弃显式色标，核对应断言能报出差异。

原件保留两端输入回执、原生轨迹、屏幕 PNG、帧比较和字色、阴影、字距的定向反控。分屏从首个练成画面对齐，保留两端原速原声。左 Game，右 Reforge。用户于 2026-11-14 确认这份战后卷轴分屏通过。主菜单金钱、拾取、显式着色旁白各自的技术验证取本节原件。 [双端原件与分屏](../../../../tasks/evidence/E2E-Q2-1-scroll-text-20261114.tar.gz) · [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#2026-11-14-横向卷轴文字返工)

## 2026-11-14 特殊状态与增益

同阵容、实际装备、敌槽、背包、种子和真实选招下，20 个局面各端各跑两次。80 场原生运行、40 组双端比较和 40 组同端重比先核业务轨迹和战斗随机数，再核实际画帧与已启动的音效。代表性局面用相同生产字节单独重录原速带声分屏。 [执行回执](evidence.json) · [原件与分屏](../../../../tasks/evidence/E2E-Q2-1-special-status-and-buffs-20261114.tar.gz)

| 范围 | 实际验证 |
| --- | --- |
| 混乱 | 紫罂粟改派已提交的防御，逍遥误击阿奴 1 点，解混后当轮恢复攻击敌人。鬼降实打逍遥并在下一轮触发误击。敌方蜜蜂抽中自己跳过，抽中同伴时实扣目标血量，灯笼抵抗另有正控。打友武器声、剑帧与击退同拍，闪色后从受击位置出字，随后复位。 |
| 傀儡 | 灯笼自然击倒逍遥后用傀儡虫。逍遥 0 HP、傀儡 9，队尾普攻、只听见武器声，下一轮还魂香恢复 15 HP 并清傀儡。最后一名活队友倒下时直接失败，倒地傀儡没有继续补刀。 |
| 封咒、附眠和重施 | 黑衣道众附带黑狗血后，已排队的攻击仙术降普攻，辅助仙术降防御，真气不扣。灵心符解除后能当轮施法，大蒜作抗性对照。五彩蜘蛛附忘魂花时实际掉 2 HP、睡眠 3，只画物攻蓝字 1；大蒜对照实扣 1。银针解睡保留封咒及仙女剑连击，恢复当轮普攻。玩家坏状态保留原计数，敌方较短的重施覆盖旧计数。 |
| 勇气、加速与连击 | 勇气七回合，阿奴实际伤害 207、216，过期后 72。加速让原 20 身法在该局入队时成为 60，过期回到 20；临时连击第 2–6 回合生效，第 7 回合只攻击一次。 |
| 玄冥宝刀 | 群攻一次确认提交，每挥重抽暴击并按敌槽递减伤害。先致死的敌槽保留至同动作结束。两套种子核两挥的出剑位置、逐敌特效和四个数字。每挥有普通或会心人声，并播放一次武器声。 |
| 梦蛇 | 仙术 295 消耗 99 MP，实际换为战斗精灵 5。裸武术 92、裸身法 80，加装备后原为 100／86，施法后有效值 192／166；后续两击 138、137。两端实绘变身的特效帧 9–11，第二挥从上一击后的敌位绘制，数字右锚从 106 移至 100。 |

修前原件证实了 Reforge 的群攻漏第二挥、死亡傀儡误入队抽样和全灭后出手、普攻附带状态遗漏、梦蛇将装备计入翻倍基数。Game 的群攻曾将特效画在中央，梦蛇后仍用原形态的攻击特效。两端原先都没有让单体第二挥的特效与数字跟随第一击留下的位置。旧值、对应原盘指令和实绘反例保留在同一归档。 [原盘物攻](../../../../../reference/sdlpal/fight.c#L2038-L2247) · [原盘混乱打友](../../../../../reference/sdlpal/fight.c#L3760-L3854) · [状态与 Extra 槽规则](../../../../phase1/game-mechanics.md#2026-11-14-特殊状态和物攻)

邻接回归保留合击降级、回梦命中与抵抗、投盐巴后双击各两次双端运行。旧合击判据曾把两端的正确第二挥一同判错。按原盘三拍击退的净位移，复验第二挥相对首挥向左 6 像素、向上 3 像素，数字右缘与高度取第二挥实绘敌位。恢复旧数字坐标的八份反控各报一条对应动作错误。旧分屏与原判定仍按当时版本读取。 [单体击退](../../../../../reference/sdlpal/fight.c#L2250-L2263) · [实绘判据](../../../../../scripts/e2e/battle-rules.mjs#L120)

双蜜蜂局面另保留独立试打的战后差异。Game 的两个 SSS 41027 投点为 54／80 与 35／6，后一局获得蜂巢并显示提示。Reforge 的独立试打入口止于战斗结算。正常遭遇的后续复验见下节。群攻及混乱打友的结论限本次目标、状态与实绘边界。 [原始敌脚本校验](../../../../../scripts/e2e/battle-status-scenarios.mjs) · [真实明雷复验](#2026-11-14-复活组合与真实明雷掉落)

分屏左 Game、右 Reforge，左右声道对应，分章保留 1 倍速。待用户验收。 [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#2026-11-14-特殊状态与增益复核)

## 2026-11-14 投掷伤害公式核对

用户确认图中的仙术基础伤害指投掷道具附带的仙术。雷火珠 156 的原始脚本 SSS 39253 先由 `0x42 [381, 0, 0]` 模拟火系「爆炸」，基础伤害 100，灵力参数 0，再由 `0x21 [0, 135, 0]` 固定扣 135。两端用相同队伍、装备、原队 80、种子 1729 及实际投掷菜单，在两个原始战场分别投白无常和僵尸兵 A。 [原版公式与边界](../../../../phase1/game-mechanics.md#2026-11-14-投掷道具的附带仙术和固定伤害)

| 战场 | 白无常 | 僵尸兵 A |
| --- | --- | --- |
| 27，火系 −30% | 98 + 135 = 233，HP 300 → 67 | 126 + 135 = 261，HP 330 → 69 |
| 18，火系 −100% | 0 + 135 = 135，HP 300 → 165 | 0 + 135 = 135，HP 330 → 195 |

八场运行均通过，四组双端的行动、HP、库存、结算和抽样顺序一致，飘字分别为 233、261、135、135。两端均播放 FIRE 12，即使该场地将附带伤害降到 0。Reforge 行动日志可逐项读到火伤和固定 135，Game 原生动作与画面记录合计值。将蓝字替换成固定扣血误乘战场倍率的结果 192、220、0、0，八份反控均由实绘数字判据拒绝。生产运行版本为 `91bb478bc1d0480223e82db9ad8b9fab2e3b2c27`。 [采集与比较原件](../../../../tasks/evidence/E2E-Q2-1-throw-damage-formula-20261114.tar.gz)

## 2026-11-14 复活组合与真实明雷掉落

复活组沿用正常选招、动作和结算。三个新增局面和三组相邻回归各端各跑两次，24 场全部完整。12 组双端与 12 组同端比较核业务、随机数、实际绘制和音效。独立复核从原件核新增的 12 场。 [机器回执](evidence.json)

| 新增局面 | 双端结果 |
| --- | --- |
| 梦蛇阵亡和复活 | 灵儿先变身，再被章鱼自然击倒。还魂香恢复 24 HP，仍用战斗精灵 5、有效武术 192 和仙女剑连击。当轮无手选或入队身法抽样，在队尾打 142、140。下轮以濒死减半后的身法 163 入队，实打 142、137，阿奴随后收尾。 |
| 傀儡叠勇气和双动，提前复活 | 逍遥先实放天罡战气和醉仙望月步，老虎将其击倒后才用傀儡虫。0 HP 时队尾双击 12、16，只有武器声。还魂香恢复 18 HP 并同时清除三项临时状态，逍遥当轮只普攻一次，伤害 4，恢复攻击人声。 |
| 傀儡叠勇气和双动，自然到期 | 第 3–6 轮双击，第 7 轮只出一次勇气暴击 16，第 8–11 轮各普攻一次、伤害 4，第 12 轮仍倒地且不再出手。 |

判据反控分别替换复活后的战斗精灵、在还魂后留下勇气和将临时双动延长一轮。两端各三份反控均由对应规则拒绝。复活组产品行为沿用已存在的实现。

十里坡 s006 从 `[93,45]` 实走四格至 `[97,45]`，停下等待 e154 追到并接敌。两端都是一名装备玄冥宝刀的阿奴，体力 470/480、真气 400/410，用原生普攻群攻确认击败战场 12 上的两只蜜蜂。两端相同的三个种子各跑两次，12 场均获得经验 4、金钱 4，六组双端和六组同端原件比较通过。

| 种子 | 两敌槽投点 | 实际结果 |
| --- | --- | --- |
| 138 | 36、12 | 两槽均跳过，背包无蜂巢。 |
| 4 | 8、98 | 槽 0 给一个蜂巢并显示一条提示，槽 1 跳过。 |
| 99 | 2、11 | 两槽各给一个蜂巢，各显示一条提示。 |

旧 Reforge 用 89% 跳过的正向抽样，得到相同的 11% 总掉落率，但种子 4 把奖励落到槽 1，种子 99 两槽都无奖励。旧提示画在地图上，体力和真气已恢复。调整后 PAL 的四份概率掉落脚本直接表达 21%、19%、11%、15% 的命中率，编辑器原字段可读取、修改和摘要，既有跳出分支仍按原有控制流解释。普通战斗先绘胜利结算，逐槽执行脚本时保留战场帧。双端蜂巢卷轴各保持约 1.4 秒。Reforge 宿主另以实际确认键验证提前关闭。最后提示关闭后恢复为 475/405，e154 进入 800 世界拍的隐藏，两端都能在同一格打开并关闭原生主菜单。此次同场实跑核了蜜蜂的即时隐藏，期满重现仍待实跑。 [原始抽样与半恢复](../../../../phase1/game-mechanics.md#2026-11-14-敌槽战后掉落与群攻过量伤害) · [PAL 作者脚本](../../../../../projects/pal/content/enemies.json) · [宿主定向验证](../../../../../packages/reforge/src/main.battle-host-flows.test.ts)

群攻修正来自同场的飘字差异。种子 4 的槽 1 显示 747、249，槽 0 的 Game 原件为 373、124，旧 Reforge 为 374、125。Reforge 按 Game 的逐击扣减、向零取整和最低 0 HP 回写，仍保留第二挥的全部原敌槽。相邻未超杀的 404、135 保持原样。PAL DOS 二进制对无符号 HP 转换的边界仍待实测。

此冻结版本的分屏保留了已发现的差异：Game 半恢复后执行原盘胜利收尾 `41127 → 41128`，战场淡黑后地图淡入；旧 Reforge 直接回地图。原件保留，复验结果见下一节。 [当时的复跑、分屏和转场证据](../../../../tasks/evidence/E2E-Q2-1-world-rewards-and-revival-20261114.tar.gz)

## 2026-11-14 明雷转场与复活演出差异复验

明雷仍从十里坡的同一检查点按同一走位触碰 e154。两端读实际接敌、换屏六组像素、原生曲 037 启动、选招和输入；胜利后逐槽运行蜂巢脚本，从最后实际画过的战场帧淡到全黑，再用地图黑帧开始淡入。无掉落时没有蜂巢文字，两槽掉落时两条卷轴逐条关闭。每个种子都在全亮后用真实 Esc 打开并关闭原世界菜单。 [双端判据](../../../../../scripts/e2e/battle-world-bee-compare.mjs)

原盘 SSS 的三个胜利尾链分别从 41127、41176、41180 开始。按原事件对象所属场景、原战斗队号、胜利跳转及隐藏时长逐项核对：73 张地图的 828 个由引擎接敌的明雷都执行同一淡出淡入，统一沿用 PAL 的项目默认；826 个 800 拍隐藏及两个 150/100 拍特例仍由实体各自定义。另外 93 个采用相同原盘胜利尾段的触碰脚本入口继续执行脚本自己的淡出淡入。以后只有需要例外时，才在实体的「行为 → 胜利回场转场」覆盖项目默认。 [编辑与运行约定](../../../../phase2/specs/script-system.md) · [SDLPal 转场与战斗节拍](../../../../phase1/game-mechanics.md#2026-11-14-正常接敌与回合演出)

复听原始音轨时确认，先前右侧开头有原始 WAV 066；不是额外地图音乐。十里坡 e168 和山神庙 e173 的两个调用共用原盘 38641–38656。原盘等八个 100 ms 世界帧，旧稿写 420 ms，且自动脚本在 Reforge 战斗期间继续发声。共享脚本显式恢复原始等待、同拍跳转和 066/073 概率边界。正常遭遇暂停自动脚本，保留剩余等待。Reforge 首帧建立时钟前注册的等待不再把启动加载时间算进去。共享脚本更新遵循现有 SAVE12 摘要校验，带旧自动续跑摘要的开发检查点需重录，不在加载时迁移。

复活组继续沿用原有六个合法局面，另核梦蛇旧精灵的施法姿势、实际变身站位与逐步淡变、倒地头像的第 0 色带、选中物品和仙术的说明，以及自然阵亡后下一轮的出手节拍。Game 从行动队列耗尽的首拍进入回合结算，已有胜负、毒伤数字停留和旧快照阶段仍按原路径。已接受的用物接近、敌方死亡渐隐及结算停留保留。

| 复验 | 冻结范围与结果 |
| --- | --- |
| 十里坡普通明雷 | `39d5bf7eb080a2a569421c50b79ebe60f38eecb0`。两端各 6 局：种子 138、4、99 分别掉 0、1、2 份蜂巢，每种两次。6 组跨端与 6 组重复无判定差异。两端都在第六组像素带之后、首张选招菜单之前实际启播曲 037。Game 的菜单比 Reforge 晚 26–45 ms，保留清除提前按键后的原有调度拍。黑战场与黑地图都是全黑实绘；同组淡出、淡入时长最大相差 19、27 ms。 |
| 地图自动与虫鸣 | 正式 12 局均无接敌至回场全亮间的新 WAV 066 / 073 启声。正式样本的下一声 066 在 Game 全亮后 254–288 ms、Reforge 后 0.3–0.6 ms；这段包含 Game 的世界拍与同一 Esc 菜单间隔。前一候选另有一局 Reforge 在正常可控时先响一次（接敌前 15.7 ms），下次回场约 2.02 秒才响。比较器按源脚本分支分别判断，保留原先错误的 500 ms 上限判定和恢复后的反控。核的是新启声；接敌前已播的尾音不被截断。 |
| 状态与复活 | `31cfe5387c5d555b05b05dc1987e7ed31022f3a3`，两端各 12 局，12 组跨端与 12 组重复无判定差异。倒地到下轮菜单的双端差从 43–61 ms 缩到 10 ms 内；日志核对选招、复活、姿势、六个头像像素、菜单说明行及原生音效顺序。采集器等 Game 实际消费一次按键再送下一键，主动注入重复确认时独立拒绝误选。该组使用独立战斗，项目默认迁移后以同一梦蛇局面在 Reforge 另实跑两次。 |

两份分屏左 Game、右 Reforge，原速、双声道分别对应左右，均待用户视觉验收。实际证据按各自候选保留；本轮不把同一小场景推断为所有明雷的击败、重现、逃跑或存读已经做完。

邻近回归中，Game 使用正式 006 终档完成 007，三场击败后各自原格回场，迷宫存档可在新浏览器会话读回。Reforge 的历史 006 含 38 份旧摘要自动续跑状态，实际加载按现有 SAVE12 规则拒绝。另从当前合法仙灵岛入口存档实跑同样的 88 步，e206、e207、e209 的接敌格、经验和回场格与 Game 匹配；实绘确认三次淡黑再淡入，宿主实际提交 100、150、800 拍。没有将这次独立场景回归登记为正式双端 007。

## 2026-11-15 玩家逃跑成功与失败

两端从十里坡同一格出发，四步右移触碰 e154 的两只蜜蜂。逍遥和灵儿使用原始角色装备，从固定 HP/MP 开始。种子 4 首轮逃走，灵儿的 22 小于等于吉运 27。种子 3 首轮以 33、53 全队失败，第二轮灵儿再以 32 失败，最后逍遥以 25 成功。两端各局实跑两次，四组跨端、四组同端比较通过。成功局消耗 12 次抽样，失败续战局消耗 29 次，随机序、掉血及结算相符。

旧 Reforge 按一次 Q 只提交当前角色。改用全队的可用槽，快捷键和杂项菜单均覆盖已选动作。旧呈现还会在退回站位后多画一帧「逃跑失败」。修正后提示跟随三步移动后的濒死姿势，在归位时一并清掉。逃跑成功实绘 16 步右下位移，音效 045 在两个引擎均实际启播一次。四组正式对照中，比较器所核的提示停留、位移及回原地图的最大双端时差小于 15 ms。

逃出后无经验、金钱、蜂巢或半恢复。玩家返回同一地图同一格，蜜蜂仍可见，暂停接敌 15 世界拍，Esc 菜单可正常开关。机器回执保留单键失败反控和失败提示残留的原始对照。两条原速带声分屏待用户验收。

## 2026-11-15 敌方逃跑、剧情必败与战后存读

半人蛇妖使用 s036 的 e602 与原队 25。两端从同一存档位置 [72,10] 右移一格触发原始剧情，玩家无需选招。首段两行对白同屏，三个头像依原样分别在下、上、上。第二段保留上一张下方头像，原盘 0x05 清掉后再出第三张。音效 045 实际启播一次，蛇妖按首帧宽度向左移出，随后停约半秒，最后显示自动消失的滚轴旁白。结局不给经验和金钱，继续 s037 的进场脚本。Reforge 原有两段等待按 40 ms 折算，且昼夜过渡没有等完。该进场方案现按原 100 ms 世界拍等待，直接切入剧情坐标，第一段对白在昼夜调色板过渡完成后显示。Game 改用 40 ms 战斗拍采样逐字显示时钟，三页完成打字的双端时长差不超过 33 ms。从逃离结果提交到 s037 首句开始绘制，两轮复验的双端间隔差约 60–160 ms。验收停在 s037 第一段已画出的对白。

剧情必败使用扬州女飞贼 s093/e1759。逍遥以 1 HP 单独上阵，真实选择防御，敌方施法造成自然败北。原盘 13782 的败北地址与自然后继都是 13783。Reforge 原来在两处各写了一份退场，导致播两遍。去重后只接一次撤离剧情，伤害演出完成后才交回地图，林月如按剧情归队。两端都以原世界画面定格并分六带换到战场，实际曲 038 在揭场后开始；此处采用实绘最后一带和候选资产就绪的两个时钟核查。回场实核队伍、六页对白、十二步撤离、音效 201、原世界菜单；Reforge 普通全灭红屏另走宿主回归。

战后存读用十里坡 e154 的同一场双蜜蜂。种子 99 的实际攻击获金钱和经验各 4、蜂巢 2 个；半恢复保存为 HP 475、MP 405。每端单独验证两个原生槽位，含当场读回和新浏览器从标题读回。队伍、位置与朝向、装备、库存、剩余隐藏拍都按各端原生存档读取。Game 另核近期战斗动作从原生 Map 恢复。Game 已修正坏档金额写入当前世界的问题。分别用两端原生格式将金额改为非数字，均验证读档菜单和当前世界保留，随后仍可读取正常槽。界限为经验增长以及坏档金额项。后续升级、学仙术和蜜蜂计时到期重现另行取证。

玩家逃跑成功、失败、敌方逃跑、剧情必败、战后存读各有一份原速带声分屏。Game 在左声道，Reforge 在右声道；验证和录制用真实接敌与真实菜单输入，均待用户视觉验收。 [双端原件、离线比较、反例和分屏](../../../../tasks/evidence/E2E-Q2-1-battle-lifecycle-20261115.tar.gz) · [原始浏览器音画](../../../../tasks/evidence/E2E-Q2-1-battle-lifecycle-native-av-20261115.tar.gz)

## 2026-11-15 分屏返工与明雷暂停复验

旧 Reforge 逃跑日志已记录在十里坡完成回场和菜单开关。成功局约在 3.66 秒画出回场，逐帧解码发现旧浏览器录像的末帧仍是战斗，旧分屏沿用了该末帧。原速重录保留回场后站在明雷旁的画面。合成使用实际视频末帧，音轨间隙补静音。已解码两段新分屏验证左右结尾。

在十里坡 e154 同一接敌格保持静止，玩家首轮成功及首轮失败后再成功均为两端各两次。明雷在 15 到 1 拍可见且固定于 [98.25,45]，只保留原来的接敌，队伍停在 [97,45]。归零时 Game 已执行第一拍自动追逐，Reforge 在原位，双方都在随后下一世界拍重新接敌。正值的暂停窗口不允许进入第二场战斗。正式记录保留两次真实接敌及期间每一拍。

以种子 4 从两端各自的等价存档重跑，每端使用五个新浏览器上下文。朝蜜蜂走一格到 [98,45]，或朝左、上、下各走一格，倒计时期间均未重新接敌。停在一格落点时，右、上、下均在归零后的第一拍被接敌，左在第二拍被追上。沿左侧来路走四格至 [93,45]，两端在暂停结束后的三个观察拍内均未接敌。原件含实际方向键回执、每格移动和敌人坐标。复跑用两个 `battle-world-bee` 入口加 `--escape=success --escape-exits`，再用 [方向与接敌比较器](../../../../../scripts/e2e/battle-world-escape-exits-compare.mjs)。

扬州六页对白按实际页和角色素材对齐。原盘 13786 先摆队伍，13796 的两拍走位到达 [752,504]。原 SDLPal 走位和跟随代码以真实原盘参数复现，第二拍留林月如在 [752,504]，李逍遥在右下方 [768,512]。旧 Game 走完时复用了第一步的重叠位置，旧 Reforge 把李逍遥摆到了左前方 [736,496]。现在两端按实际最后一步更新跟随坐标。两端各重复两次，对照六页对白中的实绘角色、站位、帧号与相机；第一个行走拍的短暂重叠也与原版一致。

同一场双蜜蜂的种子 99 保留两个独立的蜂巢入账。旧 Reforge 两条同字卷轴之间没有实绘底图，原速看像一条接着留在屏上。原版会删除前一条卷轴后刷新战场。现行 Reforge 在连续相同文字之间保留一拍已画出的战场，再从第二条卷轴首次实绘起计时。正式两端各两次，原始像素和绘制记录均见到清屏，Game 两次间隔约 32、50 ms，Reforge 两次均约 50 ms。两个独立显示时点、背包两份、新会话读回和坏档金额拒绝均通过。 [复验日志与原速分屏](../../../../tasks/evidence/E2E-Q2-1-battle-lifecycle-visual-recheck-20261115.tar.gz) · [原始浏览器音画](../../../../tasks/evidence/E2E-Q2-1-battle-lifecycle-visual-native-20261115.tar.gz)

## 2026-11-15 读取进度的淡入与槽位布局

SDLPal 的标题和系统菜单读档先淡出旧画面，恢复后从黑屏淡入。Game 正常读档实绘为直接切黑，再用约 600 毫秒淡入存档场景。旧 Reforge 的局内菜单直接切到全亮场景，标题菜单退出时会先清黑，恢复后的第一帧场景直接全亮。前后用十里坡种子 99 的实际战后存档、两个菜单的物理按键和屏幕像素取证。 [系统菜单原始调用](../../../../../reference/sdlpal/uigame.c#L601-L610) · [场景淡入原始调用](../../../../../reference/sdlpal/scene.c#L500-L507)

Reforge 在有效槽位提交后的首次绘制全黑，按同一调色板淡入时长揭开存档场景，淡入结束再恢复玩家输入和自动脚本。离线比较器拒绝旧版局内读回的实绘轨迹。新版每端两次局内读回、四次标题读回。六组原件的每次淡入含 35–36 个不同亮度，Game 实测 600–617 ms，Reforge 599–617 ms。坏档保持原场景和菜单，存档与读回的数据断言同场通过。

Reforge 存档槽的右上直接调用黄色数字图集，按保存序号显示 `1`，左侧 `01` 是槽位。项目名和日期各自保留宽度并留出间距，常规 16 px 点阵可降到 12 px。《仙剑奇侠传·复刻》和完整月日时间能同排显示，更长的项目名在缩小后仍超宽时按字形边界截尾。绘制回归覆盖短标题、原截图标题和更长标题，旧槽位布局被同一回归拒绝。集成候选的实绘截图保留上述完整文字和数字，原速带声分屏同时验证局内选择槽位到淡入结束。 [原始数字绘制](../../../../../reference/sdlpal/uigame.c#L205-L216) · [双端原件与分屏](../../../../tasks/evidence/E2E-Q2-1-save-load-presentation-20261115.tar.gz)

补测 PAL 三人满队。旧布局把一人或两人的姓名和等级截掉。新布局在紧凑字号的一行仍放不下时，按成员换成两行，保存序号放首行右侧。Chromium 用实际 PAL 字模、数字图集与存档槽绘制入口，在 1280 和 640 像素画面核对了三名 99 级队员、完整项目名与时间。在 16 位保存序号压力样例中，三人也完整可见。 [前后实绘、边界和复跑入口](../../../../tasks/evidence/E2E-Q2-1-save-full-party-20261115.tar.gz)

## 2026-11-16 杂项菜单与作者合体技

原队 3 的三个灯笼由两端各跑两次。先真实选最后一个敌槽，再在第二名队员选招时进杂项状态。连续两名队员的头像、HP 和 MP 实绘，回到原选招后仍是第一回合，已提交指令仍为一条。随后在杂项开启围攻，自动选中的目标沿用末槽，实际出手按剩余目标依次重选。两端的 19 次随机抽样用途、数值与目标一致，正常结算经验 3、钱 9。Game 的测试采集器原来把独立提交语句粘到上一行，产生 TDZ 异常。改钩子后使用同一游戏代码复跑，保留失败原件。重开杂项时 Game 记住上次的菜单位置，Reforge 回到首行；两端首次从第一行按上键进入状态。重新打开后的 Game 需再按一次下键才回到围攻。

作者合体技从独立、通过加载器校验的试打内容读取。李逍遥指向治疗友方 37 点的合体技，和健康的赵灵儿各扣 120 点体力，钳到 1。濒死的林月如不贡献。实际选择赵灵儿，三人结算体力为 1、47、1，真气维持 4、3、5。受术位置实绘在赵灵儿槽，归位后显示黄字 37，并实际播气疗术音。旧版同样按键进入敌方选择，队伍体力为 1、10、1，缺恢复数字。自身和全队友方目标另走同一正式选择与结算路径的定向验证。

武神的作者试打控制复用 PAL 技能 351。两名贡献者扣体力，濒死队员跳过，先在 (232,187) 绘制实际神将帧 0–3，再独立在 (120,146) 绘 FIRE13。两只敌实际扣完 32 点体力并进入胜利结算。现有 PAL 作者数据让圣灵珠授予普通仙术 351，原盘 SSS 39157–39159 装备时设置合体技 351。这条装备分派差异留在覆盖边界内，武神实跑的来源是独立作者试打。

## 2026-11-16 飞龙探云手

从原队 11 的黑毛球实际施放两次。原盘 SSS 43144–43146 先播 174，再按 0–10 投点与 6 的上限判断，敌人只有一份十里香。双端原生记录曾同样在第一次施放获得物品，Reforge 战后漏写新背包槽。此次写回新增道具并保留原有消耗。两端冲刺的 7 个实绘位置相同，回原位再画一次居中获得提示。两次施放各实际播放 174 和角色声音 009。获得卷轴用显式文字段把物品名画为原版深红，保留道具名称中的字面字符。第二次仍消耗 9 真气但不再获得物品。 [同局面原始采集与分屏](../../../../tasks/evidence/E2E-Q2-1-battle-closeout-20261116.tar.gz)。

## 2026-11-16 召唤本体落点

WIN95 MAGIC 的两个有符号偏移属于召唤本体，FIRE 取后续法术的演出参数。旧版将后者用于本体。原盘九个召唤条目以独立偏移写入 canonical 技能，编辑器使用现有数字控件并区分本体与后续法术。Chromium 在 1360 和 1024 像素窗口真实载入武神，改变有符号偏移后保存重载，相关控件均为 30 px 高，素材选择整行显示。

风神按同一原队和种子在双端各两次实跑。曾仅在 Reforge 两次拒绝本体落点，(240,165) 对 (224,181)。修复后两端都在 (224,181) 实绘本体帧 0 和 1，随后 FIRE44 在 (160,200) 逐帧绘制。64 点真气、两只实际命中、风神声音、胜利和原生追踪重比通过。验证另记录 Game 在独立战斗结束时确实走过黑毛球的原盘掉落抽样，本场两只均无额外道具。 [原版召唤坐标](../../../../../reference/sdlpal/fight.c#L3142-L3147)

## 2026-11-16 升级、学会仙术和明雷重现

收尾归档按实跑候选绑定。围攻/状态正式重比使用 `f62e76003`，原生短录使用 `850645ba3`；作者治疗使用 `f62e76003`，武神用 `4653705da`。风神和飞龙探云手最后一轮正式重比用 `54d9f56bd`，风神录制来自已对齐落点的 `4653705da`。升级与存读的 verify、短录及重比均为 `48db3c7c2`。归档保留每次的候选、路径、依赖指纹、原始 trace 与对应声轨；一份原速分屏按章节汇集四组画面，左 Game、右 Reforge。

固定十里坡 e154 双蜜蜂原队 4、种子 6，阿奴从 29 级、10162 经验开始，以真实攻击和胜利推进。双端按相同顺序抽到成长值 0、5、1、0、1、0，获得 4 经验，跨过 10165 阈值后余 1 经验，升至 30 级并学会万蚁蚀象。旧 Reforge 的升级面板显示裸属性，旧存档和 Game 的成长数据本身一致。修复后两端依相同顺序显示装备加成后的旧值 270、224、172、260、268 和新值 275、228、175、262、270。区分实际面板与存档裸属性，另核每个增长字段、两个蜂巢和新仙术的持久读取。 [结算与升级流程](../../../../../reference/sdlpal/battle.c#L1098-L1120)

两端均使用真实菜单保存，并重新启动再从标题读回。胜利脚本将世界实体 e154 隐藏 800 拍，回场和保存记录当时余拍，读档恢复实际剩余拍数。实等至倒计时为零，角色在原位时仍保持隐藏。照同一条路线走到 [97,34]，目标仍在 320×320 判定区域；再走一步至 [97,33] 才重置为可见站立帧。两端实绘蜜蜂后沿原路返回，在 [97,42] 实际接敌，第二场的仙术列表绘出可用的万蚁蚀象（37 真气）。短录保留升级面板、存档及淡入；完整的实计时、路线和第二场操作在正式 verify 原件中。 [原版重现条件](../../../../../reference/sdlpal/play.c#L85-L108) · [正式回执、反例、音画](../../../../tasks/evidence/E2E-Q2-1-battle-closeout-20261116.tar.gz)

## 2026-11-16 逐项验收目录

以 `8fce7b6a485904d2b7e2adb076989fcb94ccb027` 的 PAL 工程进行只读盘点。103 条仙术定义、234 件道具、153 种敌人、52 个战场已按稳定 ID 列出。道具中有 68 个战斗使用入口、98 个战外使用入口、83 个投掷入口和 106 个装备入口，一件物品可以出现多个入口。五种角色默认合击在技能定义中另有角色来源。 [物品定义](../../../../../projects/pal/content/items.json) · [用物上下文](../../../../../packages/content/src/author-item-core.ts) · [仙术定义](../../../../../projects/pal/content/skills.json) · [战场定义](../../../../../projects/pal/content/battle-fields.json)

153 种敌人中，152 种在 380 个初始敌队中有位置。黄衣刀僧 `enemy-442` 由玉佛寺方丈在 `team-35` 进战后的行动前脚本 42795 召唤两名入场。现有 Boss 名单登记 33 个剧情编队，均能追溯到作者工程的剧情起战指令。七神龙等可逃 Boss 已在原名单中，另有 19 个带禁逃标志的编队要结合剧情核定。每场 Boss 以实际触发、原编队和使用场地定位，例如女飞贼所在的编队有两个场地不同的剧情入口。 [敌人定义](../../../../../projects/pal/content/enemies.json) · [剧情 Boss 名单](../../../../../packages/game/src/dev/dev-panel.ts#L511-L548) · [原版禁逃规则](../../../../phase1/game-mechanics.md)

盘点列出每个条目及已定位的入口和来源。19、26、28、38、46 号战场在现行场景默认和起战指令中均无直接引用，安排用能指定战场的正式试打入口验实际背景及效果。已能按原生动作将 21 种战斗用物、27 种投掷和 18 种玩家仙术链接到既有双端原件。角色默认合击的双端记录包括爆炸。仙女剑双击、玄冥宝刀双挥群攻及 18、27 号战场的火系场地加成各有对应验证。后续按具体入口复核原件适用性和剩余效果、演出义务。 [战斗道具](#2026-11-13-战斗道具与投掷) · [投掷伤害与场地加成](#2026-11-14-投掷伤害公式核对) · [双挥](#2026-11-14-特殊状态与增益)

## 2026-11-17 逐项对账与待测范围

重新从现行 PAL 定义提取稳定 ID、合法入口和全部剧情起战指针。首轮对账 45 份已经登记的 Q2 归档，下表叠加后续已验证的实测。标准轨迹要求原件 SHA 相符、同候选、同场景、同种子、同开局和同指令，再登记实际动作或在场事实。玉佛寺等专用录制器的结果按各报告核定的具体入口接入。旧候选和只定位到一次动作的条目保留原范围，未定位条目优先找可复用原件，其余补跑。

| 条目 | 已定位的双端实跑 | 待补的入口或判据 |
| --- | --- | --- |
| 玩家仙术与合击 | 63 招可获得的普通仙术均有双端实际施放回执，最新登记金蝉脱壳。5 种角色默认合击均有实际执行。 | 酒神缺酒提示、合击角色与资格等剩余分支继续按具体入口复验。 |
| 敌方仙术 | 52 招敌方 AI 可达仙术均有双端实战施放。最后登记拜月教主的爆炸蛊、大咒蛇和万蚁蚀象。 | 各招的伤害、失败反馈和剧情专属调用按具体分支核对。 |
| 道具使用 | 68 个战内及 98 个战外正向入口均有双端实用回执。最后补齐[情书、玉佩、香蕉与凤纹手绢](#2026-11-20-四件剧情道具的战外使用)。 | 剩余音画及具体分支按对应回执继续核对。破天锤的无目标提示退场已实跑复验，碎裂音相对击打确认的提前量继续待核。桃花林驱雾及土灵珠出口已在两处脚点复验，音效派发到目标画面的提前量见本批记录。 |
| 道具投掷 | 83 个入口均有双端实投回执。最后登记四种毒卵、毒粉与幻蛊、火蛊与暗器，以及食妖虫和碧血蚕的孵化。 | 投掷入口齐全。额外角色和战场组合按对应战斗义务核验。 |
| 装备 | 106/106 件均有双端实际装卸与同槽替换。每端 324 次操作按背包、槽位、属性和菜单实绘回执逐件复算。 | 身法负值的显示、七件装备给出的不同仙术入口及其战内效果分开验收。六个逐件目录批次各端一次完整入口，六槽和双人选人另有当前候选的同端重复与录制。 |
| 敌人 | 153/153 种均有双端出场记录，152 种实际执行了战斗行动。半人蛇妖核到出场、按剧情退场和返场。 | 按敌人补验 AI 的剩余分支、抗性、掉落与演出。剧情 Boss 的原场景起战另按各入口核对。 |
| 战场 | 52 个战场均实跑加载、背景、初始站位及五灵参数。5 个常驻波动战场另核了多帧。 | 背景加载无缺项。场效按具体元素和调用补验。已核到 18、26 号风，7、18、26 号雷，18、22、33 号水，17、18、27 号火及 7、18 号土的实伤。真实剧情的场地选择按剧情入口记录。 |
| 剧情 Boss | 名单 33 队对应 39 个作者起战入口。已实跑玉佛寺两战、扬州女飞贼 s093 和 [s086](#2026-11-20-扬州城墙女飞贼)、锁妖塔姜清 s147、七星盘龙柱七神龙、隐龙窟两战、黑蜘蛛、[城外林月如 s021](#2026-11-20-苏州城外林月如)、[擂台林月如 s032](#2026-11-20-林家擂台与返场)和余杭客栈的[苗人头领](#2026-11-20-余杭客栈苗人头领)、[两名随从](#2026-11-20-余杭客栈两名苗人随从)，并补齐[鬼将军与赤鬼王](#2026-11-20-将军冢鬼将军与血池赤鬼王)，共 22 个入口。毒神龙另核主动逃离和末柱胜利。19 队禁逃补查集合中，半人蛇妖 s036 已验敌逃与回场。 | 名单尚缺 17 个起战入口。补查集合另有 18 队待核剧情定位及入口。独立试打计实际覆盖的战斗义务。 |

首轮逐 ID 清单和对应报告、trace、动作序号或适用范围，见归档成员 `build/q2/elemental-talismans/coverage.json`。后续归档的执行索引按同一稳定 ID 记录增量。同物品的战内使用、战外使用、投掷和装备分别登记。 [逐项对账及原件](../../../../tasks/evidence/E2E-Q2-1-elemental-talismans-20261117.tar.gz)

### 雷水火土灵符投掷

沿原队 80 的白无常与僵尸兵 A，固定合法三人队、初始库存一份和战斗种子。使用真实键盘打开投掷菜单并提交全敌目标，随后用实际普攻完成胜利。原盘四条投掷入口 39567、39569、39571、39577 均由 0x42 模拟法术执行。以道具原始标志、法术表、敌人五灵抗性和战场系数算出两槽独立预期。 [原版模拟法术](../../../../../reference/sdlpal/fight.c#L5332-L5400) · [原版乘数](../../../../../reference/sdlpal/fight.c#L210-L247)

| 道具与战场 | 白无常伤害 | 僵尸兵 A 伤害 | 实绘 FIRE 与起播音 |
| --- | ---: | ---: | --- |
| 雷灵符，18 | 187 | 134 | FIRE 1，声音 323 |
| 水灵符，18 | 168 | 120 | FIRE 15，声音 338 |
| 火灵符，27 | 100 | 129 | FIRE 7，声音 312 |
| 火灵符，18 | 0 | 0 | 仍播放 FIRE 7 和声音 312，两槽无伤害飘字 |
| 土灵符，18 | 123 | 123 | FIRE 17，声音 121 |

候选 `de33ea3bebb7a9d7011c1607c97ded15a5aff889` 的 5 组双端 verify 先对照输入、行动与随机抽样、库存、真气、伤害、蓝字、实际特效帧序及落点、音效起播和胜利结算。再以五组独立录制重验相同业务状态、随机抽样及帧序，实际特效窗口的双端差值最大约 17 毫秒。离线仅篡改后一槽的伤害数字时，原判据按实绘数字拒绝。产品逻辑沿用基点实现。

首次 Game 录制在启动遮罩仍可见时开始，录制器同时报告被取消的世界音乐请求。采集沿用已有的启动遮罩脱离等待后重录。并行中的一份 Reforge 旧录制由依赖指纹拒绝，使用冻结采集脚本重跑后通过。两个失败回执保留。五章成片约 13.7 秒，左 Game、右 Reforge，保留各自声道及原速。逐章核对双端录像采样并完整解码。 [双端原件、复算与重录](../../../../tasks/evidence/E2E-Q2-1-elemental-talismans-20261117.tar.gz)

## 2026-11-18 五种治疗与复活仙术实测

Game 与 Reforge 用同一原队 1、战场 7、种子 4，从真实仙术菜单选招并指定目标。三场治疗使用有实际缺口的存活者。两场复活都由灯笼在第一回合把李逍遥从 20 HP 打到 0，第二回合实放复活后逍遥重新出手，第三回合可选招。五场均通过真实攻击胜利，各结算一次。

| 仙术与成功脚本 | 施法者 → 目标 | 目标 HP | 真气耗用 | 实绘 FIRE 与起播音 |
| --- | --- | ---: | ---: | --- |
| 观音咒 297，43022 | 赵灵儿 → 李逍遥 | 50 → 200 | 10 | FIRE 28，声音 141 |
| 凝神归元 298，43018 | 李逍遥 → 赵灵儿 | 50 → 270 | 18 | FIRE 29，声音 139 |
| 元灵归心术 299，43020 | 李逍遥 → 赵灵儿 | 50 → 550 | 40 | FIRE 29，声音 139 |
| 还魂咒 301，43024 | 赵灵儿 → 李逍遥 | 0 → 15 | 16 | FIRE 28，声音 141 |
| 赎魂 302，43026 | 阿奴 → 李逍遥 | 0 → 47 | 30 | FIRE 30，声音 170 |

原盘三条治疗脚本分别用 0x1B 回复 150、220、500 HP，两条 0x22 分别按 157 满血的 10% 和 30% 向下取整。修前 Game 开战夹具直接置换装备，留下赵灵儿原武器仙女剑授予的双击，导致凝神归元和元灵归心术场景多挥一击，随机抽样随之分叉。改为复用原手部卸装。随后从独立复活录像与实际绘制轨迹发现 Game 换姿态过早。修后两端贯穿起手、FIRE 与色移实绘倒地姿态，还魂咒在黄字首帧实绘濒死姿态，赎魂在黄字首帧实绘站立姿态。 [原版卸装](../../../../../reference/sdlpal/global.c#L1406-L1412) · [原盘播放与成功脚本次序](../../../../../reference/sdlpal/fight.c#L4184-L4242)

候选 `16003e21dc69e3ed9eecd811ad5a66df1bb45ab4` 的五组双端验证和五组独立录制均通过。同一判据从归档重新解析原件时检出旧装备状态和旧复活姿态。成片 18.9 秒，1 倍速，左 Game、右 Reforge，分别保留对应声道。已完整解码并逐章与双端原生录像抽帧核对。执行索引 `build/q2/healing-and-revival/execution.json` 记录五个仙术 ID、各端原生动作序号、实绘和重录命令。 [原始报告、反例与分屏重录](../../../../tasks/evidence/E2E-Q2-1-healing-and-revival-20261118.tar.gz)

## 2026-11-18 五种雷冰仙术与正负场效

以原队 28 的红衣喇嘛、智杖和尚、灰衣喇嘛及种子 4 实战。30 级赵灵儿从真实仙术菜单施放五招，分别核原始习得表的 11、22、26、9、17 级门槛，空装备的实际灵力为 50。另两名队员首轮防御，三敌正常行动后，由下一轮实际普攻完成胜利。天雷破只选中间槽，其余四招命中三个独立敌槽。

| 仙术与场地 | 红衣喇嘛伤害 | 智杖和尚伤害 | 灰衣喇嘛伤害 | 真气 | 实绘 FIRE 与起播音 |
| --- | ---: | ---: | ---: | ---: | --- |
| 五雷咒 317，26 号雷 +2 | 190 | 139 | 165 | 15 | FIRE 1，声音 325 |
| 天雷破 318，26 号雷 +2 | 无命中 | 304 | 无命中 | 28 | FIRE 35，声音 323 |
| 狂雷 319，26 号雷 +2 | 506 | 364 | 435 | 45 | FIRE 46，声音 107 |
| 玄冰咒 322，33 号水 +5 | 177 | 151 | 180 | 12 | FIRE 2，声音 110 |
| 风雪冰天 323，33 号水 +5 | 525 | 441 | 526 | 44 | FIRE 15，声音 338 |
| 五雷咒 317，7 号雷 −2 | 127 | 92 | 110 | 15 | FIRE 1，声音 325 |
| 风雪冰天 323，22 号水 −5 | 175 | 147 | 175 | 44 | FIRE 15，声音 338 |

逐敌预期从原盘防御、抗性、对应元素的战场字段及真实抽样独立算出。两组换场保留相同队伍和抽样，实际伤害按正负系数变化。五雷咒和玄冰咒各核三个固定落点，天雷破取目标脚点，狂雷与风雪冰天分别取全体和场地锚点。风雪冰天在 FIRE 第 8 帧切出手姿，随后四次循环 8–15 帧。蓝字在 FIRE 结束后的首段受击姿呈现，每槽数值和位置分别验算。 [原盘伤害与场效](../../../../../reference/sdlpal/fight.c#L215-L249) · [FIRE 循环与落点](../../../../../reference/sdlpal/fight.c#L2661-L2820)

旧 Reforge 的普通对敌仙术在起手末拍后直接开始 FIRE。原盘进入主特效时另等一拍，Game 与 Reforge 投掷路径已有该拍。修复后从实际施法姿到 FIRE 首帧约 517–534 毫秒，两端在相同局面的差值均小于一拍。旧浏览器轨迹和定向时间线回归均先拒绝缺拍，再以修后运行通过。离线只改最后一个可见伤害数字时，同一实绘判据拒绝。 [原盘主特效准备](../../../../../reference/sdlpal/fight.c#L2659)

候选 `f2607f9d10612336bc1d69eb90b6a185e55d2606` 的七组双端验证和七组独立录制均通过。21 份报告保留各次身份与结果，其中一次 Game 新建浏览器上下文超时，进程退出后重跑通过。新增回归初版使用的数组 API 被现有类型目标拒绝，已改用受支持写法并重新通过类型检查。首版解码抽样直接缩小原生视频，与拼接器的两次缩放路径不同，改为沿实际缩放路径后通过。原错误输出均随归档保留。

成片 17.2 秒，1 倍速，左 Game、右 Reforge，左右声道各保留对应原声。已完整解码并逐章对照原生录制。执行索引 `build/q2/player-elemental/execution.json` 记录五招增量、两组负场效、红衣喇嘛与智杖和尚的原生攻击序号，以及原件绑定和重录入口。 [双端原件、缺拍反例、场效与分屏重录](../../../../tasks/evidence/E2E-Q2-1-player-thunder-ice-20261118.tar.gz)

## 2026-11-18 解除状态、解毒与护体

Game 与 Reforge 使用原队 1、战场 7、种子 4 和同一支三人队。三人从无状态开局，经真实菜单使用道具或仙术，再以实际普攻胜利。原始角色表允许赵灵儿用冰心诀、阿奴用灵血咒，李逍遥在 20 级习得真元护体。

| 仙术 | 真气 | 原始脚本及实战结果 |
| --- | ---: | --- |
| 冰心诀 307 | 7 | SSS 39349 解除昏睡、封咒、定身和疯魔。四种状态由黑狗血、忘魂花、醍醐香和紫罂粟实际施加，分成两局重叠验证。两局施法时，金刚符护体的剩余计数 6 均保留。 |
| 灵血咒 308 | 10 | SSS 43082 先清 0–2 级毒，再接 39349。分别清除赤毒、尸毒、瘴毒、毒丝和同局的封咒。赤毒与鹤顶红共存时仅清赤毒，剩下的 3 级鹤顶红在回合末实际扣 50 HP。 |
| 真元护体 310 | 18 | SSS 43032 施加九回合护体。原队灯笼按同一随机序列命中李逍遥。第四轮和第九轮分别从 44、45 点减到 22 点，第九轮结算后解除，继续打到第十一轮获胜。 |

冰心诀两局中，李逍遥在第二轮选招时失能，赵灵儿赶在他行动前解状态。他在同一轮实际补出一击，把灯笼从 30 HP 打至 28，第三轮重新进入手动选招。睡眠局面还核到倒下姿态保留到 FIRE 与色移结束，随后站起。灵血咒的四组常见毒在施药当时分别扣 7、12、20、32 HP，清除后首轮结算没有这些毒的掉血。 [原程序当轮恢复](../../../../../reference/sdlpal/fight.c#L1508-L1518) · [解毒与解除状态](../../../../../reference/sdlpal/script.c#L1349-L1405)

真元护体的对照局把同一招施于赵灵儿，灯笼仍按相同随机值打中李逍遥。两端核了真实扣血、蓝字和每轮回合数。道具另逐件核了实际消耗、施加状态或首次毒伤，新增金刚符 63、醍醐香 126、尸腐肉 116、腹蛇涎 130、缠魂丝 159 的战内使用回执，并复验紫罂粟 128。 [原盘物攻护体计算](../../../../../reference/sdlpal/fight.c#L5050-L5062)

两端核 24 帧 FIRE、落点、层序、目标色移与原声音效。首版比较器按失能时的选招结果误判解除后的实际行动，并把前一件用物已经出现的蓝字算作灵血咒新发数字。现按原盘执行时状态和数字首次实绘判定。首轮 Reforge 单局遇页面导航中断，单局补跑和整组复验通过。旧回执与修正后的判据均保留。

候选 `43fc1eb8ad4b48456cf7e46b43c3cd37021f886e` 的九组双端确认和九组独立录制均通过。成片 26.9 秒，按实际动作对齐，1 倍速保留左右两端原声。十章均核了实绘与段尾的解码画面。执行索引 `build/q2/cleanse-protect/execution.json` 逐项绑定仙术、道具、原始动作序号与重录入口。 [实际状态、毒伤、减伤和录像原件](../../../../tasks/evidence/E2E-Q2-1-cleanse-and-protect-20261118.tar.gz)

## 2026-11-18 六种火土仙术与场效

原队 28 的红衣喇嘛、智杖和尚、灰衣喇嘛按原站位入场，战斗种子为 4。空装备的 30 级赵灵儿按原始习得表实放五招，阿奴用原始自带的炎杀咒选中间敌槽。其余两人首轮防御，三敌按实际 AI 行动，第二轮以普攻胜利。八个局面各结算一次。

| 仙术与场地 | 红衣喇嘛伤害 | 智杖和尚伤害 | 灰衣喇嘛伤害 | 真气 | 实绘 FIRE 与起播音 |
| --- | ---: | ---: | ---: | ---: | --- |
| 三昧真火 328，17 号火 +5 | 213 | 181 | 216 | 16 | FIRE 7，声音 312 |
| 炎杀咒 329，17 号火 +5 | 无命中 | 373 | 无命中 | 33 | FIRE 9，声音 116 |
| 炼狱真火 330，17 号火 +5 | 582 | 489 | 585 | 49 | FIRE 12，声音 117 |
| 飞岩术 333，18 号土 −2 | 99 | 84 | 100 | 13 | FIRE 4，声音 119 |
| 地裂天崩 334，18 号土 −2 | 185 | 156 | 187 | 26 | FIRE 20，声音 120 |
| 泰山压顶 335，18 号土 −2 | 281 | 236 | 283 | 45 | FIRE 17，声音 121 |
| 三昧真火 328，18 号火 −10 | 1 | 1 | 1 | 16 | FIRE 7，声音 312 |
| 泰山压顶 335，7 号土 0 | 352 | 296 | 354 | 45 | FIRE 17，声音 121 |

按原盘防御、五灵抗性、同槽实际抽样与战场系数独立算伤害。三昧真火在 18 号场地的原公式计算为 0，实际落到每槽 1 点下限。泰山压顶换到 7 号场地时，三个原始随机值均相同，各槽伤害随土系系数变化。两端分别核了选招、真气、HP、受击首帧蓝字以及实际 FIRE 帧序、锚点、画序和音效。 [原盘伤害与场效](../../../../../reference/sdlpal/fight.c#L215-L249)

旧 Reforge 的泰山压顶沿 `(110,142)` 实绘。作者工程缺了 MAGIC 26 的层偏移 69，使山体先于我方队员绘制，落在队员身后。Game 同局面已用原盘偏移。旧轨迹在每个泰山压顶局面都核到 13 帧相对三个队员的 39 处层序差异。补回该仙术的作者元数据后，两处场地的层序差异均归零。比较器还逐局变造最后一个实绘伤害数字以确认能检出。 [原盘画序](../../../../../reference/sdlpal/battle.c#L441-L442) · [全体仙术落点](../../../../../reference/sdlpal/fight.c#L2790-L2813)

候选 `bf0ed4d3a8bf0267f6cef55dc3d17fda0558eb82` 的八组双端验证和八组独立录制均通过。成片 20.4 秒，左 Game、右 Reforge，1 倍速保留对应原声。已完整解码音画并逐段对照原生录像。执行索引 `build/q2/player-fire-earth/execution.json` 逐项绑定六招、两组换场、旧层序反例和分屏重录入口。 [双端报告、反例和分屏重录](../../../../tasks/evidence/E2E-Q2-1-player-fire-earth-20261118.tar.gz)

## 2026-11-18 六种剑诀、震屏与战场留痕

Game 与 Reforge 都用原队 28、种子 4 和相同的空装备三人队。开局按原始初始表、习得表和 SSS 2309 准备合法已学仙术，真气和灵力在开战后从两端实际角色读取。林月如和李逍遥分别从真实仙术菜单提交六招，三敌按各自 AI 行动，次轮通过实际普攻胜利。七个局面各结算一次。

| 仙术与场地 | 红衣喇嘛伤害 | 智杖和尚伤害 | 灰衣喇嘛伤害 | 真气 | 实绘 FIRE 与起播音 |
| --- | ---: | ---: | ---: | ---: | --- |
| 气剑指 337，7 号 | 54 | 56 | 55 | 7 | FIRE 6，声音 129 |
| 一阳指 340，7 号 | 无命中 | 134 | 无命中 | 18 | FIRE 8，声音 130 |
| 七诀剑气 341，7 号 | 192 | 194 | 193 | 30 | FIRE 8，声音 131 |
| 斩龙诀 342，7 号 | 284 | 286 | 285 | 46 | FIRE 11，声音 132 |
| 御剑术 345，7 号 | 无命中 | 81 | 无命中 | 10 | FIRE 5，声音 123 |
| 万剑诀 346，7 号 | 174 | 176 | 175 | 25 | FIRE 21，声音 124 |
| 万剑诀 346，32 号 | 174 | 176 | 175 | 25 | FIRE 21，声音 124 |

六招都按无属性公式计算逐槽伤害，核实际耗蓝、扣血、首帧蓝字与真实施放动作。御剑术和万剑诀分别在 FIRE 第 10、16 帧切出手姿。两招旧 Reforge 配置缺少 MAGIC 10、30 的层偏移 99，旧日志分别观察到 130 处和每个战场 66 处相对画序偏差。补回后，七个局面的实际特效锚点和相对画序均通过。万剑诀两场的规则随机值、命中目标与伤害一致。 [原盘非属性伤害](../../../../../reference/sdlpal/fight.c#L215-L249) · [出手姿与特效层序](../../../../../reference/sdlpal/fight.c#L2673-L2755)

斩龙诀的 SSS 43111 设置 14 拍、默认 4 像素的纵向震屏。旧 Game 录像中每张 FIRE 帧保持同一方向，旧 Reforge 按输出时钟每 40 毫秒换向，原生录像测得 18 拍。修后两端原生录像及成片都捕捉到 14 拍，每拍约 50 毫秒，上下各 4 像素交替，特效结束后回到原位。判据用旧原生像素再次检出 18 拍，定向 Vitest 也先失败再通过。 [原盘震屏脚本](../../../../../reference/sdlpal/script.c#L1521-L1535) · [整屏位移](../../../../../reference/sdlpal/video.c#L571-L615)

像素核对使用原始 FIRE 末帧和对应战场调色板，按实际落点与波形对照受击后画面。7 号战场上一阳指、七诀剑气、斩龙诀和万剑诀均看得到末帧留痕。32 号战场的常驻屏波为 128，万剑诀结束后两端均恢复背景纹理。移除留痕和在强波画面加入留痕的离线反控均由同一像素判据拒绝。初版换场比较误把各自的运行 ID 纳入随机值对照，保留诊断并按实际抽样记录复算。 [原盘留痕条件](../../../../../reference/sdlpal/fight.c#L2807-L2821)

候选 `c209d141b270a49220e6373f90ccc334de3c00bd` 的七组双端验证和七组独立录制通过。成片 16.8 秒，左 Game、右 Reforge，保留两端各自的原速与声音。完整解码并逐章抽帧，另核末帧留痕、强波抑制及斩龙诀上下震屏。执行索引 `build/q2/player-sword-arts/execution.json` 绑定六招动作序号、修前画序和震屏原件、修后复验与分屏重录。 [原件和分屏重录](../../../../tasks/evidence/E2E-Q2-1-player-sword-arts-20261118.tar.gz)

## 2026-11-18 风卷残云与三种攻击仙术

两端以原队 28、种子 4 和相同的空装备三人队进入战斗。比对各角色的原习得门槛、实际开局灵力和选招输入。首轮由习得角色从真实菜单施法，另两人防御。三敌继续按各自 AI 行动，次轮由三名队员实际普攻取胜，每局结算一次。

| 实际施放与场地 | 红衣喇嘛伤害 | 智杖和尚伤害 | 灰衣喇嘛伤害 | 真气 | 实绘 FIRE 与起播音 |
| --- | ---: | ---: | ---: | ---: | --- |
| 风卷残云 314，26 号风场 +3 | 444 | 371 | 444 | 42 | FIRE 44，声音 103 |
| 天师符法 349，7 号 | 无命中 | 144 | 无命中 | 18 | FIRE 32，声音 159 |
| 万蚁蚀象 354，7 号 | 无命中 | 495 | 无命中 | 37 | FIRE 43，声音 082 |
| 爆炸蛊 374，17 号火场 +5 | 无命中 | 594 | 无命中 | 49 | FIRE 37，声音 168 |
| 风卷残云 314，18 号风场 −6 | 136 | 114 | 136 | 42 | FIRE 44，声音 103 |

天师符法按无属性公式结算。万蚁蚀象按敌槽毒抗结算，爆炸蛊按中槽火抗和战场系数结算。逐槽从原盘属性和原生随机值独立重算，同时核耗蓝、未命中槽、受击蓝字、自然后续行动和实际起播声。

旧 Game 在伤害抽样之后才消耗 48 个吹飞步长，末张 FIRE 已恢复站位。旧 Reforge 的敌人始终留在起点，也少抽 48 次。首次修正又因两招共用 FIRE 44 把配置写入风神条目，严格比较仍拒绝风卷残云零位移的 Reforge 轨迹。按原技能 ID 纠正后，两端先抽步长，再抽伤害与成长。两个风场的三个敌槽在最后一张攻击图均左移 41、上移 11 像素，之后在原落点显示受击。风场乘数影响伤害，同种子的 48 个步长相同。 [原盘吹飞与伤害顺序](../../../../phase1/game-mechanics.md#2026-11-18-风卷残云与风神的吹飞)

### 风神召唤后的吹飞

用原队 12 和种子 1，阿奴按原盘 SSS 31525 的教学准备仙术，再从双方真实菜单提交。修前两个引擎的黑毛球在全部 48 张 FIRE 帧都没有位移。修后两端先在 (224,181) 绘制本体，随后 48 张攻击帧按原盘 `-3` 至 0 逐次抽取，两个敌槽最后均左移 82、上移 29 像素。结束前神将仍定格在本体第 1 帧。FIRE 清除后从原站位受击，完整蓝字均为 325，各扣完现有 42 点体力。64 点真气、本体起播音 349、次级静音及一次自然胜利均通过。Game 独立战斗在结算还运行了两次原盘败敌掉落抽样，当前种子两次均无道具。Reforge 的独立试玩入口由实际世界宿主外的结算路径接管，现场同样获得 8 金钱、8 经验。真实剧情的 `onDefeated` 掉落另循世界宿主入口验收。 [原盘召唤接二次攻击](../../../../../reference/sdlpal/fight.c#L3142-L3187)

首轮已恢复位移的 Game 录制中，绘制先跨到首拍受击，蓝字晚约 35 毫秒出现。现行召唤时间线让逻辑先提交吹飞复位、伤害数字和受击，绘制随后同拍呈现。该进度约束保存在内存中的演出帧上。旧录制与独立时钟反例留档，最终验证逐帧检查首次清除 FIRE 的画面已有蓝字和首拍受击。 [原盘先提交数字](../../../../../reference/sdlpal/fight.c#L4322-L4325) · [演出帧与逻辑提交](../../../../../packages/game/src/core/battle/animation/summon.ts)

普通仙术五局的验收和录制使用 `5add3f551983e6fbd414b487396599808d163b03`，风神使用 `a8dc2f10e5f77b7a5c5c0dd3c35915937617942b`。20.2 秒成片含六章，左侧和左声道为 Game，右侧和右声道为 Reforge。对照两端原生录像解码 26 个取样，其中两招的吹飞尾段和归位受击都有独立样本。归档的 `build/q2/player-other-attacks/execution.json` 记录每局的打开方式、动作、原件与重录入口。 [两招吹飞、四招增量与原速分屏回执](../../../../tasks/evidence/E2E-Q2-1-player-other-attacks-20261118.tar.gz)

## 2026-11-18 夺魂、鬼降与灵葫咒

两端在 7 号场地用原队 3、28 和 48 逐局实际输入。阿奴用初始仙术施放夺魂、鬼降，李逍遥用原盘 16622 的教学准备灵葫咒。灵葫咒四局先由赵灵儿真实普攻压血，再实际施放。对照扣蓝、伤害数字、阶段先后、FIRE 的脚底锚和画序、原生声音、失败卷轴及自然胜利。灵葫值从真实退场后世界读取。

| 仙术 | 同局面实测 |
| --- | --- |
| 夺魂 304 | 巫抗 0 掷 0 后继续，概率掷到 29，指定智杖和尚从 1100 HP 到 0，显示蓝字 1100。灯笼巫抗 10 在第一关拦下，未再掷概率。过抗性后掷到 33 同样失败。两种失败都自动显示「失败　没有效果」。 |
| 鬼降 305 | 概率 21 后掷巫抗 0，智杖和尚实际混乱 4 回合，当轮转向灰衣喇嘛并造成 93 点伤害。另一局同样的掷数被灯笼巫抗 10 拦下。概率恰为 44 时停止，未再掷巫抗。两种失败都显示「攻击无效」。 |
| 灵葫咒 384 | 赤色小蛇 20/80、概率 17 时成功，扣完 20 HP，战后灵葫值由 0 增至 1。21/80 时在掷概率前失败，20/80 掷到 60 时失败。红衣喇嘛 125/800、概率 52 时抵达收妖步骤，其灵葫值为 0，保留 125 HP，战后仍为 0。三种失败均自动显示「失败　没有效果」。 |

旧 Reforge 的灵葫咒跳过了零收值时的失败退出，仍执行即死。引擎也缺少夺魂和灵葫咒的原失败卷轴，灵葫咒 FIRE 39 丢了 MAGIC 84 的层偏移 99。首轮复验的实绘轨迹中，Reforge 的新卷轴清除后还有约 50 毫秒的空等。现行版本在卷轴播放期间等待，清除后用已满足的队列节拍继续。 [原盘分支](../../../../phase1/game-mechanics.md#2026-11-18-夺魂鬼降与灵葫咒的失败分支)

最终候选 `a32bfe1a9e90a409227638d735bd7a0457d010c2` 十组实际输入全部胜利并通过逐动作比较。Game 的七条失败卷轴显示约 1,400 毫秒，Reforge 为 1,397–1,416 毫秒。Reforge 的五条处决类失败卷轴清除后约 16–21 毫秒开始下一动作。灵葫咒四场的相对画序偏差归零，零灵葫值的敌人仍按此战队列完成后续出手。

同候选的十组独立录制均与正式验证一致。46 秒分屏保留原速，左侧和左声道为 Game，右侧和右声道为 Reforge。四章灵葫咒保留前置普攻，鬼降成功章保留实际攻击同伴。按双方原生录制核 48 个解码取样。逐案打开方式、动作序号、原件和重录入口在归档成员 `build/q2/player-conditional-casts/execution.json`。 [实战、反例与分屏回执](../../../../tasks/evidence/E2E-Q2-1-player-conditional-casts-20261118.tar.gz)

## 2026-11-19 三尸咒与万蛊蚀天

在 7 号场地、种子 4 的原队 59 和 28，用同一队合法习得角色与空装备从两端实际选招。阿奴初始有三尸咒，万蛊蚀天在 35 级习得。首轮施法，另两人防御，第二轮完成实际普攻和胜利。验证扣真气、背包、按槽的上毒和直接伤害、回合末毒伤、随机序列及原生录制。

| 实际局面 | 直接伤害与首次回合末 |
| --- | --- |
| 原队 59，三尸咒点中槽 | 直接伤害 1 且上毒，回合末再扣 111。 |
| 原队 59，三尸咒点灯笼 | 巫抗抵抗上毒，直接伤害仍为 1。 |
| 原队 59，万蛊蚀天 | 三槽直接各扣 1，仅中、右槽上毒及各扣 111。 |
| 原队 28，三尸咒与万蛊蚀天分别施放 | 三尸咒中槽直接扣 121。万蛊蚀天三槽直接扣 186、217、186。 |
| 两招分别缺蛊 | 扣 22、34 真气。背包、毒状态和敌方体力保持施法前值。双方吟唱后显示约 1.4 秒的「道具不足无法使用」卷轴。 |

旧 Reforge 只有敌方效果定义含直接伤害，玩家上毒后漏掉伤害及相应随机数。将二者写入两侧共用的有序效果。缺蛊时旧 Game 略过起手，旧 Reforge 用横幅提示且漏了成长抽样。现行两端保留施法姿态直到卷轴关闭，再收招并推进。缺蛊复验中，Game 与 Reforge 在卷轴清除后约 400 与 367 毫秒绘出下一动作，差约一个 Game 更新拍。 [原盘耗材、伤害及收尾](../../../../phase1/game-mechanics.md#2026-11-19-三尸咒与万蛊蚀天的耗材门)

候选 `3714cc0bf4e49ef92057a5a24587e71d9173d2ea` 的七组动作与抽样序列匹配。实际主特效为 FIRE 25 的 20 张图，首播音 313，按脚点与层偏移 99 排序。万蛊蚀天上方图块的深度为 179，先于脚点 180 的李逍遥绘制。早期比较器误将所有 FIRE 判在队员前方，采用原盘排序后两个引擎的实绘次序均通过。七组另录的业务与抽样同正式验证一致。20.8 秒分屏有独立的回合末毒伤一章，左画面与左声道为 Game，右侧为 Reforge，共核 44 个解码取样。 [双端原件、判据及重录](../../../../tasks/evidence/E2E-Q2-1-player-gu-casts-20261119.tar.gz)

## 2026-11-19 铜钱镖与乾坤一掷

林月如在固定战场 7 通过真实菜单施放两招，原队 28 验缺钱、恰足和只掷一文，原队 269 验掷钱上限两侧。Game 的正余额由隔离存档经真实标题菜单读入，Reforge 从正式试打入场，随后各完成一轮守势及常规胜利。核对原盘 SSS 43062–43070、实际指令、真气、实时扣款、伤害、成长抽样、实绘及声音。 [金钱门来源](../../../../phase1/game-mechanics.md#2026-11-19-玩家仙术的金钱门)

| 仙术与开局余额 | 两端出手结果 |
| --- | --- |
| 铜钱镖 344，0 或 499 文 | 选招有效，扣 1 真气。实绘「钱不够，只好作罢」，余额保留，无主特效和伤害。 |
| 铜钱镖 344，500 文 | 扣 500 文和 1 真气，中槽蓝字 202。 |
| 乾坤一掷 394，0 文 | 扣 1 真气。显示同一缺钱卷轴，无主特效和伤害。 |
| 乾坤一掷 394，1 文 | 扣尽 1 文和 1 真气，播主特效及声音。三槽均无伤害，成长抽样前无逐敌浮动。 |
| 乾坤一掷 394，4999 或 5001 文 | 分别实扣 4999 或 5000 文，战中余额 0 或 1。全体各伤 1999 或 2000，正常结算后实余 630 或 631。 |

旧 Reforge 会禁止凑不够 500 文的铜钱镖确认，余额为零时会播乾坤一掷主特效，掷一文时三槽实际伤害 4、6、5。现行修复把金钱门放到实际扣蓝后的脚本结算，保留失败成长，并在零基础威力时跳过伤害抽样。实时余额的旧观察读到世界中的开局值，战后实际入账一致，现已按战内状态采集。修复前的合法实跑反例由同一业务判据检出。

候选 `a20e5e0b09ce42c8f0573c3a577f174041944de6` 的七组实战在完整动作和随机抽样上逐项一致。失败卷轴在两端实绘约 1.4 秒。成功施放的 FIRE 31 实绘八张图，深度顺序、落点、伤害数字及起手声音 011、主特效声音 347 均核对。五组录制与正式复验的业务和抽样一致。约 12 秒分屏原速保留，左画面与左声道为 Game，右侧为 Reforge，共核 30 处解码像素。 [双端原件、反例与重录入口](../../../../tasks/evidence/E2E-Q2-1-player-money-casts-20261119.tar.gz)

## 2026-11-19 敌方风咒、冰咒、玄冰咒与土咒

双端用战场 7、种子 4 和原盘单敌编队，李逍遥先真实防御，再实际攻击并胜利。敌方按自身 AI 掷点选招。四组完整动作、伤害及抽样一致。核对攻击者起手和归位、FIRE 图序、落点、图层、受击蓝字以及原生声音的首播边界。

| 原队与敌人 | 仙术 | 双端实伤 | 原生施法声音 |
| --- | --- | --- | --- |
| 83 伏地罗汉 | 风咒 312 | 10 | 399、101 |
| 85 青鬼 | 冰咒 321 | 15 | 384 |
| 121 蓝食火蟾 | 玄冰咒 322 | 31 | 075、110 |
| 192 猩猩 | 土咒 332 | 35 | 433 |

两场土咒的伤害与 FIRE 内容原本一致。旧 Reforge 将尾震的方向交给 40 毫秒的全局时钟，原速帧的背景像素实际捕到十七拍，Game 为九拍。修复后根据当前 FIRE 下标取纵移，两端同样维持最后一张图，每拍 70 毫秒，从向上 3 像素开始交替九拍。比较器用原始像素区域复算并拒绝旧版的十七拍，修后两端通过。 [原盘帧序与位移](../../../../phase1/game-mechanics.md#2026-11-19-敌方土咒的尾段震屏)

候选 `0b513733e659a64aef7c8eca20e6560b502d40b0` 的四组正式轨迹逐项匹配。前三章复用候选 `9cba55f6b2a1432a471572921a8d32fae3718717` 的同场实录，土咒章采用修后重录。四章的业务与抽样均复算到修后原件。8.3 秒分屏保留原速，左画面与左声道为 Game，右侧为 Reforge，共核 24 处解码像素。 [原件、震屏反例及重录入口](../../../../tasks/evidence/E2E-Q2-1-enemy-elemental-casts-20261119.tar.gz)

## 2026-11-19 金蝉脱壳的退场和禁逃

原队 28、战场 7、种子 4 的两组真实试打分别传入可逃和禁逃标志。李逍遥在三人队伍的正常菜单施放仙术 392。两端均实扣 33 点真气及记录相同的成长抽样。可逃局在首轮施法后实际退场，胜利结算为零。禁逃局两名队友继续防御，敌方照常行动。下一回合正常提交攻击并胜利。语义动作及随机抽样逐项一致。 [原盘 0x3A 和退场分支](../../../../phase1/game-mechanics.md#2026-11-19-金蝉脱壳)

修前两端均缺施法起手。Reforge 可逃时只播退场音，禁逃时使用小横幅且未实绘中央卷轴。固定候选 `9cba55f6b2a1432a471572921a8d32fae3718717` 复用两端的实际施法动作和吟唱音 009，保留无 FIRE 的技能定义。成功时退场音 045 与首步相邻，全队依次实绘 16 拍右下移动，再移出画面。禁逃卷轴「失败　没有效果」在两端约显示 1.4 秒，李逍遥随后归位，两道防御指令及敌方行动继续。该轮归位节拍以实际施法者的脚点取样。

两组独立录制均与正式验证的业务和随机轨迹一致。约 4.7 秒分屏原速保留，左画面与左声道为 Game，右侧为 Reforge，核对 12 处解码像素。覆盖至今为全部 63 招普通仙术的双端施放。装备、敌方 AI、道具和真实剧情入口按逐项表接续。 [双端原件和重录入口](../../../../tasks/evidence/E2E-Q2-1-player-escape-cast-20261119.tar.gz)

## 2026-11-19 暗器、气功与三种敌方震屏仙术

双端从原盘单敌编队起战，使用战场 7。同一局面从等值初态真实防御一次，再实选攻击并胜利。气功用种子 9，其余用 4，敌方均由原有 AI 选招。五组分别核对行动、随机抽样、FIRE 图帧与落点、伤害、归位和原生音效起播。

| 原队与敌人 | 仙术 | 双端实伤 | 原生施法声音 |
| --- | --- | --- | --- |
| 299 暗器手 | 暗器 343 | 11 | 478 |
| 177 紫兽人 | 气功 387 | 110 | 265、129 |
| 273 土蜘蛛 | 炼狱爪 357 | 52 | 152 |
| 278 青兽人 | 火龙掌 378 | 85 | 496 |
| 285 魔兽武士 | 横扫千军 380 | 102 | 402、132 |

修前实录从战场背景取样。炼狱爪、火龙掌和横扫千军分别量到 Game 11、7、14 拍与旧 Reforge 20、17、18 拍。修后脚本震屏随各自 FIRE 帧以 70、90、50 毫秒交替移动整屏 4 像素，两端分别吻合 11、7、14 拍。覆盖原生尾震与脚本前震重叠的优先级。像素判据拒绝三段旧 Reforge 原件。 [原盘 0x35 及 FIRE 时钟](../../../../phase1/game-mechanics.md#2026-11-19-敌方仙术的脚本震屏)

土蜘蛛另在「无底深渊2」从固定的原生存档读回，同一步走到 s292 的 e4998 接敌，实用战场 54。两端都防御、承受炼狱爪 52 点、真实攻击获胜。场景战后各显示「获得一只傀儡虫」，物品 152 从 0 变为 1。两端同获 550 经验，战后体力 1578，核对 23 次抽样、7 个隐藏成长池和新学仙术。e4998 进入 800 拍的隐藏状态，双端恢复走动并离开接触点。Reforge 的独立试打结算到战斗结束，真实场景继续由 `onDefeated` 发放战后物品。 [当前场景和动作入口](../../../../../projects/pal/content/scenes/s292.json)

候选 `19b2f45c4f45e0577b87158bed17520293200a3a` 的五组正式实战以及各自独立录制逐项复算。原速分屏共 18.3 秒，含五招和土蜘蛛完整接敌、掉落与返场，左画面与左声道为 Game，右侧为 Reforge。核对 38 处成片及原生解码取样。 [双端原件、旧版反例和分屏重录](../../../../tasks/evidence/E2E-Q2-1-enemy-direct-casts-20261119.tar.gz)

## 2026-11-19 七种投掷道具与捆仙绳抵抗

固定候选 `a4a90964f8ae2b4597521c27fdc9256ee5519d13` 以原队 28、战场 7、种子 4 实开投掷菜单。捆仙绳另以原队 80 的白无常建立巫抗失败。八个局面均走实际选敌、后续行动和胜利结算。双端逐项对照 100 次行动、377 次抽样、库存、特效帧序与落点、伤害蓝字和声音起播。

| 道具与原盘入口 | 实际效果 | 实绘 FIRE、帧数与起播音 |
| --- | --- | --- |
| 天师符 66，39563 | 首槽伤害 140 | 32，16 帧，159 |
| 蜂巢 115，39590 | 三槽伤害 180、210、180 | 16，40 帧，133 |
| 冰蚕蛊 142，39573 | 三槽伤害 345、288、345 | 15，48 帧，338 |
| 缠魂丝 159，39266 | 首槽加 554 并扣 32 | 24，7 帧，157 |
| 捆仙绳 160，39408 | 命中扣 4，定身 5 回合。抵抗时 HP 保持，显示「攻击无效」 | 24，7 帧，157 |
| 血玲珑 162，39250 | 三槽各扣 350 | 6，12 帧，129 |
| 短刀 167，39273 | 首槽伤害 204，先抽武器倍率再抽伤害浮动 | 31，8 帧，347 |

旧 Reforge 在巫抗失败后漏播中央卷轴。修后在出手姿结束前保留 FIRE 24 的第 6 帧，中央卷轴清除后继续投掷收招。正式候选的两端分别显示约 1.400 秒和 1.414 秒。旧版按缺少卷轴的同一判据拒绝。 [原盘投掷与巫抗](../../../../phase1/game-mechanics.md#2026-11-13-战斗道具与投掷)

八组独立原生录制复算正式候选的业务状态和全场抽样。抵抗段取冻结的修复候选录制，正式候选另跑同局对照。分屏约 16.3 秒，左侧和左声道为 Game，右侧和右声道为 Reforge。64 处画面取点通过解码对照。 [前后原件、复验和原速分屏](../../../../tasks/evidence/E2E-Q2-1-seven-throw-items-20261119.tar.gz)

## 2026-11-19 二十七件武器投掷

候选 `a4a90964f8ae2b4597521c27fdc9256ee5519d13` 在战场 7 载入原队 113 和 281，种子为 4。七组局面从真实投掷菜单逐件选中当前存活的敌槽，随后以实际行动完成胜利，两端共核对同样的 290 次行动和 1,135 次抽样。覆盖原始道具 ID 168–194，逐件对应实际动作和分屏章节。装备和普通攻击样本按各自入口登记。

逐件核原盘 0x66 的法术、加成操作数及两次独立抽样，再用裸武术、当前敌槽防御和原始法术伤害复算。四档武器倍率均有实际样本，伤害蓝字为 300–2,505。超过敌槽剩余体力时仍绘制计算所得伤害，体力下限为 0。每次消耗一件，对应 FIRE 31 的八张原生帧和音效 347。 [原版公式和动作](../../../../phase1/game-mechanics.md#2026-11-13-玩家仙术合击与投掷武器)

七组独立录制复算相同动作、抽样、目标、消耗和实绘帧。原速分屏 36.3 秒，按物品 ID 排列 27 章。左画面和左声道为 Game，右侧为 Reforge。独立从归档恢复十六份报告，重跑八组双端比较并核对 162 处原生画面。 [双端日志、逐件索引与带声分屏](../../../../tasks/evidence/E2E-Q2-1-weapon-throws-20261119.tar.gz)

## 2026-11-19 最后十四件投掷道具与养蛊孵化

固定候选 `cf1c8fc889711622a0cf1fe942381b0e475aecb1` 在原队 244、28、113、80 和战场 7 实开投掷菜单。五个局面均完成胜利，两端各核对 212 次行动和 751 次随机抽样。每次实际消耗一份，逐件核对目标、效果、FIRE、音效和蓝字。

| 道具 | 已验效果 |
| --- | --- |
| 毒蛇卵 117、毒蝎卵 118、毒蟾卵 119、蜘蛛卵 120 | 分别选中四个干净敌槽，各扣 7 并加赤毒 551 |
| 腹蛇涎 130、赤蝎粉 133、幻蛊 140 | 腹蛇涎扣 20 并加 553。赤蝎粉三槽扣 187、217、187 并加 551。幻蛊命中扣 1，目标进入 5 回合混乱并实际攻击同伴。抵抗分支保留末帧并显示卷轴 |
| 火蚕蛊 143、爆烈蛊 146、梅花镖 153、袖里剑 154、银针 255 | 实际伤害依次为 323、517、90、170、120 |
| 食妖虫 144、碧血蚕 147 | 投掷当拍体力不变。每条毒在八次回合末分别扣 1 到 8，累计 36。下一次回合末分别发放 145 和 149，各自解除，对应产物各一件带入战后背包 |

修前 Reforge 在投掷时立即扣 1，第八次扣血同拍发放产物，导致提前两轮。仅修时序的候选因漏播卷轴继续被同一判据拒绝。最终候选在第 9、10 轮发放产物，双端各显示约 1.4 秒中央卷轴。另以两位队员在同轮投掷，双端在第 9 轮依次显示两张卷轴，下一轮菜单在卷轴清除后开放。 [原盘毒脚本与卷轴](../../../../phase1/game-mechanics.md#2026-11-13-战斗道具与投掷)

五组独立录制复算相同指令、全场抽样和结算。原速分屏 25.7 秒，左画面和左声道为 Game，右侧为 Reforge。98 处成片解码画面经原生取点核对。 [双端原件、两次拒绝、同轮孵化及带声分屏](../../../../tasks/evidence/E2E-Q2-1-misc-throws-and-hatching-20261119.tar.gz)

## 2026-11-19 十三件战外恢复道具

从原场景 s006 的同一站位读取两端正式存档格式。每个局面重新建一份测试存档，只有李逍遥，体力 37/150、真气 15/100，背包只有待测道具的一份。两端逐件实走主菜单、用物和单人目标确认，核对原始用物入口、实际分派、库存减一及返回探索后的同一站位和角色状态。

| 道具 | 双端实际变化 |
| --- | --- |
| 止血草 99、行军丹 100 | 体力分别增加 50、100 |
| 金创药 101、蟠果 102、紫菁玉蓉膏 103 | 体力各增加 113，达到 150 |
| 鼠儿果 104、还神丹 105 | 真气分别增加 36、50 |
| 龙涎草 106、灵山仙芝 107、雪莲子 108、天仙玉露 109 | 真气各增加 85，达到 100 |
| 神仙茶 110、灵葫仙丹 111 | 体力增加 113，真气增加 85 |

在 `aa2e8d2c69c714d050e0d0ae0f684a123a968007` 实跑后，用 `cf1c8fc889711622a0cf1fe942381b0e475aecb1` 重新逐件实跑。两轮各十三组的体力、真气、消耗和探索状态一致。大剂量在这组局面覆盖封顶分支。录制逐件独立复算，将 Game 回到探索后的原生声音纳入窗口。分屏原速约 19.5 秒，左右声道分别来自 Game 和 Reforge，合计核 78 处解码像素。 [存档、双端原件、录制重试和分屏](../../../../tasks/evidence/E2E-Q2-1-world-recovery-items-20261119.tar.gz)

## 2026-11-19 战外选人与十一件恢复道具

同一场景 s006、同一站位，两人存档各持两份止血草。修前按下方向键后，Game 派发给赵灵儿，Reforge 派发给李逍遥。Reforge 的选人画板和实际派发都读队伍首位，菜单也缺方向键处理。修复后，画板、名字闪烁和派发共同使用当前槽位，菜单记住上次选择。

正式候选 `8a3c6a96210b4ea4fb800b02bbd673deefe27ef5` 两端均确认方向键环绕、取消后重进仍选赵灵儿、第一份用掉后继续选她。赵灵儿体力 38 → 88 → 138，李逍遥保持 37，止血草库存 2 → 1 → 0。最后回到同一地图站位。旧双端原件由目标分派断言拒绝。选人分屏约 4.5 秒，逐端核七个取样点。

同一候选另核下表十一件的原盘用物脚本、实际目标、消费一份及返场，并逐项复算前十三件。单体初态为李逍遥 37/150 体力、15/100 真气。全体道具加赵灵儿，初态 38/240 体力、16/240 真气。

| 道具与原盘入口 | 双端结果 |
| --- | --- |
| 观音符 61，43022；赤血蚕 149，39526 | 李逍遥体力恢复至 150 |
| 圣灵符 62，39554 | 两人体力分别恢复至 150、240 |
| 茶叶蛋 78，39584；鸡蛋 79，39582；糖葫芦 80，39552 | 体力和真气各增加 15、10、22 |
| 水果 92，39538；烧肉 93，39540；腌肉 94，39542 | 前两件体力和真气各增加 20、30。腌肉体力增加 85 |
| 蜂王蜜 131，39550 | 李逍遥体力和真气分别恢复至 150、100 |
| 灵蛊 145，39524 | 两人真气分别恢复至 100、240 |

十一件约 15.6 秒的分屏逐章核 66 处双端解码像素。它们的录制来自选人修复前的同一候选，正式修复版已重新实跑，业务比较结果与录制逐项一致。两条分屏均为原速，左 Game、右 Reforge，各保留对应声道。 [逐件原件、修前反例、两条分屏及恢复脚本](../../../../tasks/evidence/E2E-Q2-1-world-recovery-followup-20261119.tar.gz)

## 2026-11-19 战外复活与中毒致死

固定候选 `f51c2db9afecea32c209d22ebe63c9dac0e3582d` 载入同一场景 s006 和两人队伍。用真实菜单和方向键选赵灵儿。四件复活药均对 0/240 体力的赵灵儿实用，分别扣一份并回到同一站位。

| 道具与原盘入口 | 赵灵儿体力 |
| --- | ---: |
| 还魂香 95，43024 | 0 → 24 |
| 赎魂灯 96，43026 | 0 → 72 |
| 孟婆汤 97，39221 | 0 → 120 |
| 天香续命露 98，39223 | 0 → 240 |

另实跑三个边界。对存活的赵灵儿用还魂香，体力保持 38，库存保留一份。两条倒地路线均先实用三尸蛊 138，上三尸蛊毒 555。其一用鬼枯藤 129 把体力从 30 扣至 0，保留重毒。其二用血海棠 124 触发原盘指令 39439，把体力从 38 降至 0，并保留中毒状态。两条路线再实用还魂香，体力回到 24，毒槽清空，各次用物的消耗和返场一致。

修前的三组同场原件分别复现 Reforge 对活人扣还魂香、复活后残留重毒，以及 Game 漏执行战外致死 `0x5F`。定向测试另核复活保留不可解除的寄生毒及其续点。正式录像有一轮受香袋毒抗影响，保留该双端原件。两条带毒复验的正式存档都卸下香袋，并在实际载入后确认赵灵儿毒抗为 0。 [原版复活](../../../../../reference/sdlpal/script.c#L1052-L1103) · [原版致死](../../../../../reference/sdlpal/script.c#L1939-L1943)

四件复活的原速分屏约 5.7 秒，其录制与正式候选逐件复验结果一致。三个边界的正式原速分屏约 10 秒。左 Game、右 Reforge，分别保留对应声道，两条片共核 50 处双端解码像素。 [原始双端记录、反例、两条分屏与恢复入口](../../../../tasks/evidence/E2E-Q2-1-world-revival-and-poison-20261119.tar.gz)

## 2026-11-19 战外施毒、条件用物与永久成长

候选 `b52a2803b759ed1dcb1875d7ce41bd3f7eb1ba9d` 在场景 s006 载入同一格和同一两人队伍。逐件用真实菜单和方向键选择赵灵儿，核原盘执行入口、毒槽、体力及真气、基础属性、库存和回到原格。普通上毒局面双方实测毒抗为 0。另穿五毒珠，实测毒抗 100，三尸蛊仍消耗一份，体力保持 38 且未新增毒槽。

| 战外入口 | 双端原件核出的结果 |
| --- | --- |
| 尸腐肉 116，毒蛇卵至蜈蚣卵 117–121，腹蛇涎 130，缠魂丝 159 | 新增对应毒槽时分别扣体力 12、7、20、32。五种毒卵都加赤毒 551。 |
| 鹤顶红 122、孔雀胆 123、血海棠 124、断肠草 125、金蚕蛊 139，三尸蛊 138 | 前五件各扣 50，三尸蛊首拍只新增毒槽。另核血海棠和三尸蛊的正常施毒入口，此前已登记两件。 |
| 九阴散 136、毒龙胆 278 | 未中毒时两件均令体力归零。中赤毒时九阴散补满至 240 并保留赤毒。中三尸蛊毒时毒龙胆清毒，体力保持 90。 |
| 无影毒 137 | 体力 37 按原盘 0x5A 向下取半至 18。 |
| 舍利子 72、玉菩提 73、银杏子 74 | 最大真气分别加 3、5，银杏子最大体力加 3。当前体力和真气保持实测起始值。 |
| 试炼果 112、女娲石 113、八仙石 114、雪蛤蟆 132 | 试炼果灵力加 3，女娲石及八仙石防御加 3、2，雪蛤蟆武术、灵力、防御各加 2。 |

修前两端原件复现 Reforge 毒蛇卵漏扣首拍、五毒珠未挡住战外上毒以及 Game 漏执行无影毒的 0x5A。修后用同一合法输入复验，另核重复施毒不重扣首拍及装备与临时毒抗合并的定向回归。Game 成长组首次开浏览器上下文超时，同候选单组重试通过，故障原件与复验一起保留。 [原版施毒](../../../../../reference/sdlpal/script.c#L1257-L1285) · [原版体力取半](../../../../../reference/sdlpal/script.c#L1888-L1894)

27 段同候选带声录像逐段与独立正式验证对照。54.7 秒分屏按原速播放，左画面及左声道为 Game，右侧为 Reforge，核对 166 处双端解码像素。 [双端原件、三组修前反例和原速分屏](../../../../tasks/evidence/E2E-Q2-1-world-poison-and-growth-20261119.tar.gz)

## 2026-11-19 战外解毒、状态与升级道具

固定候选 `e8dada77acd7fb3e91632d4b4dee2bf3333168fb` 在 s006 两端分别读入当前合法存档，用真实菜单给药。解毒前先给角色施加对应毒，状态清除和混乱保留也通过真实给药准备。单项按原盘入口独立复算毒槽、体力、状态、临时毒抗、基础能力、库存和返场。

| 战外入口 | 双端实测结果 |
| --- | --- |
| 净衣符 64、九节菖蒲 89 | 同样的五种真毒进场。净衣符保留 554、555，九节菖蒲只保留 555。 |
| 糯米 75、糯米糕 76、酒 86、雄黄 87、雄黄酒 88 | 糯米类解除 552，糯米糕另补 25 体力。酒和雄黄解除 551，酒另补 15 体力。雄黄酒解除 551、553，保留 554。 |
| 盐巴 77 | 先给两名队员上赤毒，灵儿另中 552。掷到 49 时两人清赤毒，灵儿保留 552。掷到 50 时两人的毒槽保留，显示「无任何效果」。两个分支都扣一份盐巴。 |
| 金刚符 63、灵心符 65、大蒜 84、黑狗血 85 | 分别验证护体 7、清除混乱等四项状态且保留护体、临时毒抗加 30、封技 3。 |
| 醍醐香 126、忘魂花 127、紫罂粟 128、幻蛊 140 | 分别加定身 4、昏睡 3、混乱 3 和混乱 5，均扣 1 体力。混乱期间再用幻蛊，剩余混乱保持 3，实际扣 1 体力。 |
| 银针 255 | 解混乱、定身和昏睡，保留封技 3，体力由 87 降至 78。 |
| 金蚕王 150 | 5 级升至 6 级，经验 42 清零。六次成长抽样后最大体力和真气各加 11，武术、灵力、防御、身法、吉运分别加 4、5、2、3、2。99 级局面的基础属性封顶 999，两局的当前体力和真气均保持 90、16。 |

修前 Reforge 的盐巴掷到 50 时没有扣库存，并显示通用用物失败。现行完成原盘安排的反馈、扣库存和后效截断。两端各跑 21 组正式验证及 21 段独立录制，新增 18 个入口，累计 71/98。金蚕王观察工具的两次启动失败留原件，修正观察器后同一成长公式复验。盐巴分屏按实绘消息首帧对齐。Game 使用原旁白位置，Reforge 使用世界用物结果框。全片约 71 秒，左 Game，右 Reforge，实核独立声道和 188 处原生像素。 [原版盐巴语义](../../../../phase1/game-mechanics.md#2026-10-20-风险道具当前勘误) · [双端原始报告、旧版反例及原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-world-conditions-and-level-20261119.tar.gz)

## 2026-11-19 战外感知香、炼化与读物

两端都在十里坡 s006 蜜蜂路口实际使用。固定候选 `333bfeff7745597a9b9d66c52892023cd5786517` 核对临近追逐、驱魔香、十里香与到期恢复四个局面。临近的对照组从 (93,45) 走至 (96,45)，蜜蜂从 (102,45) 接近。十里香下，玩家留在 (93,45) 也能引来蜜蜂。两种香都扣一份库存。

驱魔香下，蜜蜂脚点仍在 (102,45)，两端依次实绘四个朝向的八张步态图，每张约 100 毫秒，每个朝向持续约 200 毫秒。两端完整运行 60 秒计时，Game 在 60,015 毫秒、Reforge 在 60,026 毫秒读到到期，随后恢复追击。修前 Reforge 固定朝下，原地转向的中间候选仍只画每个朝向的第一张图。两组原件均被现行判据拒绝。 [原盘计时及步态](../../../../phase1/game-mechanics.md) · [引擎用物时序](../../../../phase2/specs/script-system.md)

另在固定候选 `e8dada77acd7fb3e91632d4b4dee2bf3333168fb` 用真实菜单完成六个炼化和读物局面。各自与原盘脚本复算扣除和入账。

| 战外入口 | 双端实测结果 |
| --- | --- |
| 炼蛊皿 268 | 按原盘次序各用一种原料，五次各得到一只蛊。缺料时反馈并保留库存。 |
| 紫金葫芦 270 | 灵葫值为空时反馈「无任何效果」。值为 1 时扣 1、得行军丹。值为 15、掷到 14 时按 9 档结算，得灵葫仙丹，余额 6。 |
| 包袱 280、手卷 293 | 包袱入账 500 文及六件道具。随后实际用所得手卷，李逍遥习得飞龙探云手和冰心诀。两件各消耗一份。 |
| 天书 290 | 实际出现原文对白，关闭后返回原处并保留天书。 |

Game 沿用原图标框，Reforge 的炼化奖励走既定统一用物卷轴，缺条件走现有用物反馈。两端分别核反馈、对话、扣值、库存与返场。九段独立原生录制与正式局面复算相符。23.1 秒分屏按原速保留两侧原声，驱魔香到期章取原录制的最后一段。复核 66 处成片像素。 [统一奖励组件裁决](../../../../tasks/archive/done/D14-3-reward-event-bus.md#状态与交接) · [双端原件、反例和分屏](../../../../tasks/evidence/E2E-Q2-1-world-incense-alchemy-and-reading-20261119.tar.gz)

## 2026-11-19 引路蜂和石钥匙

固定候选 `f3163e1da5450080e958eb9f7adc1b72dc9d83c9` 的两端各实跑五组。引路蜂由逍遥和灵儿从十里坡 s006 使用，进入 s004 的 (93,79)。第一张目的场景绘制中，灵儿在队首上方一个原始像素。Game 与 Reforge 的 45 号音效分别比首张目的画面早 97、19 毫秒，两端各扣一件。无出口时，两端实际显示「无任何效果」，确认后仍在原处并保留道具。 [出口、音效与聚拢的原盘依据](../../../../phase1/game-mechanics.md) · [出口指令](../../../../phase2/specs/script-system.md)

石钥匙从隐龙窟石门 (77,47) 一侧实际调查，先看到「此石门已上锁」。面向门用钥匙后，两端都扣一件并在角色走动前完成开门。实绘帧 0、1、2、3 固定在原脚点，开门的两段间隔约 200 毫秒，155 号音效随第一张开门帧播放。左走穿门后到白河村 s048 的 (119,90)，剧情对白完成后恢复控制。面向错误或场景没有石门时，两端均显示失败旁白、保留钥匙。 [同局结果与分屏](../../../../tasks/evidence/E2E-Q2-1-world-scene-items-20261119.tar.gz)

修前两端原件复现 Reforge 扣钥匙后石门仍锁、引路蜂落地队形分散、无出口时只有顶部提示。两个在途候选的原生记录还分别复现 45 号音效缺失及晚于首个目的场景绘制约 600 毫秒。五组反例在归档回读时仍被现行判据拒绝。

五组独立原生录制复算到同候选验证局面。朝向错误局的隐龙窟静默，两次原声录制返回空编码。正式录像在同一局实际转身重试，核对第一次用物后保留钥匙和第二次开门，保留原静默及随后开门原声。12.7 秒分屏左 Game、右 Reforge，双声道均实测，逐段核 36 处解码像素。 [原件、反例与带声视频](../../../../tasks/evidence/E2E-Q2-1-world-scene-items-20261119.tar.gz)

## 2026-11-19 桂花酒和布包

固定候选 `e651e897e43bbfaaa639713431899c18349c9e50` 由 Game、Reforge 分别实际载入五个场景局面，再按键进用物菜单。三条有效分支核对白的实际内容及上下位置。布包三局另核逍遥和月如的开局坐标和朝向。收尾核持有物、可用技能、收物角色的坐标和显隐以及恢复操控。

| 局面 | 双端实测 |
| --- | --- |
| 桂花酒 272，s003 面向道士 e62 | 25 行对白。道士收酒并离开，李逍遥获得学剑邀约，技能栏维持原值。 |
| 布包 271，s097 面向古董商 e1782 | 24 行对白，开头三段在上方。交付后布包扣一，古董商移到 (68,−12) 并离场。 |
| 布包 271，s137 面向宋氏 e2332 | 38 行对白。扣一份布包，获得紫金葫芦 270，李逍遥学会灵葫咒 384。 |
| 两件分别在 s004 试用 | 两端均显示「无任何效果」，确认结束后保留对应道具。 |

旧 Reforge 对两条布包路线都只设置了角色触发。古董商分支未收物，宋氏分支先扣布包却没有给奖励。修复调用角色已有的触发脚本，并补古董商三段上方对白。复算同时拒绝两条旧路线和补触发后仍在下方显示的中间版本。 [用物原盘条件和消耗时点](../../../../phase1/game-mechanics.md) · [角色触发规范](../../../../phase2/specs/script-system.md)

最初直达存档遗漏了场景继承的音乐。正式验证和录像都通过正常读档使用来路的原始曲目，客栈 31、古董商场景 54，宋氏场景 53。最初 Game 复用的队伍轨迹让月如挡住了古董商。修正原生存档的随队方向后重跑，五组独立录像均复算同局结果。84.3 秒分屏保留原速和两端原声，左 Game、右 Reforge，核对 38 处解码像素。 [原始回执、反例与原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-world-quest-items-20261119.tar.gz)

## 2026-11-19 白河村钓竿和两条鱼的巡游

候选 `0d647586930527b011e750f47a089318af20f30f` 使用两端实际载入的 s049 局面。李逍遥从 [96,81] 朝上，经真实用物菜单用钓竿 284 触发 e830。按原盘自动脚本 35725–35797、35799–35856 核鲤鱼 e819 和小鱼 e820。给两端等效的短驻足随机输入，先实绘完整一圈，再执行用物。小鱼第 24 步穿过起点，至第 40 步才结束一圈。原速分屏按第一步实际鱼身绘制对齐。 [作者巡游](../../../../../projects/pal/content/scenes/s049.json) · [原版单步移动](../../../../../reference/sdlpal/script.c#L652-L660) · [原版自动行为控制](../../../../../reference/sdlpal/script.c#L3515-L3599)

第一次分歧在鲤鱼第 2 步。旧 Reforge 每次实际单步落定后又等 100 毫秒，原版一拍，Reforge 两拍。仅删除步后等待的试验在第 4 步漏画行进资源帧 2，先画出了驻足帧 3。现用一个循环表达每条鱼的完整路线和随机驻足，连续游动使用单步命令的实际完成节拍，游停交界显式保留各自应画的帧。两条鱼分别逐步比较 32、40 次位移、资源帧、方向和全部相邻移动的时间间隔。驻足与随机分支仍由各自的巡游负责。

上钩时原盘 9993 隐藏鲤鱼，9994 切换李逍遥的收竿帧 17。双端在同一绘制拍满足该关系，小鱼继续可见，钓获鲤鱼 282 一条，钓竿保留。复验李逍遥 33 次钓竿姿态及恢复操控。分屏 24.34 秒，58 个归档成员逐一回读验哈希，成片另逐帧完整解码并用原始精灵的颜色与遮罩核 20 处实绘落点。 [阶段一等待时钟](../../../../phase1/game-mechanics.md) · [双端原件、两组反例和原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-fishing-patrol-20261119.tar.gz)

## 2026-11-19 紫金丹客栈夜景与分屏验收

两端从 010 的已验证库存和病中李大娘局面使用紫金丹 273。原盘 1729 淡黑，1735 设夜间调色板，1736 由 0x05 重绘场景并完成 600 毫秒淡入。旧 Reforge 切成夜间调色板后维持不透明黑幕，首句「夜晚」及李大娘的后续对白只画了界面。双端调色状态和同句解码一致指向缺少淡入。s002 正文现明确先完成夜间揭幕，再显示「夜晚」。 [原盘重绘](../../../../../reference/sdlpal/script.c#L3267-L3298) · [场景合成与淡入](../../../../../reference/sdlpal/scene.c#L503-L508) · [客栈作者正文](../../../../../projects/pal/content/scenes/s002.json)

昏倒过程恢复七段原盘世界拍的等待。双端在相同落点实绘 0、3、6、9 四个转身帧，第一次画出倒地落点即使用精灵 193 的第 0 帧。李大娘 e39 在夜幕揭开前明确选用原盘静态精灵 215 的第 2 帧。旧 Reforge 第 0 帧的错姿态有独立实绘反例。两端躺姿裁片以实际世界相机和各自既有的队伍绘制落点定位，Game 绘制偏移 4 像素，Reforge 7 像素。 [原盘队伍绘制](../../../../../reference/sdlpal/scene.c#L211-L229) · [Reforge 共用绘制规则](../../../../../packages/reforge/src/render.ts#L96-L115)

候选 `6db18587bb6335c06c605a9eab49442e6be14978` 重跑两端真实用物、昏倒、夜间对白及回 s001。正式分屏入口按同句起止比对喝药阶段、夜间和卧房对白三个时段，原录像通过才合成，再逐帧复验合成画面。两端原生合计 2450 帧，成片合计 2466 帧。用原盘 RLE 的实际像素遮罩检验李大娘站姿与李逍遥倒地姿态，保留两个独立声道。上版背景全黑在原生首个夜间画帧即被拒绝，完整出片入口只写失败回执。录制器保存实际画布，验收将应显示的背景和角色列为判据。 [帧比较与发布入口](../../../../../scripts/e2e/inn-dialogue-review.mjs) · [原件、失败与新版原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-inn-night-visibility-20261119.tar.gz)

## 2026-11-19 紫金丹客栈逐句对白与首帧

旧紫金丹比较核了 25 条正文及记录槽位、用物和库存、起终点队形、习得与音乐。旧分屏的抽帧只核各侧成片与各自原录像的对应。五类演出缺口经本轮定位。夜谈背景、演员的连续实绘、带对白的整屏淡出、切场首帧的镜头与队首脚点、实际对白的姓名头像排版与全槽显隐都需要各自的判据。原录像已记录黑幕、错误镜头、亮着的对白和错头像，部分角色与镜头状态也已有日志。旧客栈 runner 没把 001–006 的全槽实绘回调接入报告。

另有一处同局起点错误。010 双端都保存了王小虎 e36 在 [1472,736] 朝下、精灵 32 帧 0。旧 Reforge 起点只恢复了实体显隐，实绘成默认朝左帧 3。新起点沿用 010 的队伍、物品、世界和 s002 演出态，使用本段前驱所需的 s002 实体行为与场景运行态。其它旧场景的自动脚本续点绑定了当时工程内容，完整搬入在当前引擎的存档预检被拒绝。卧房按当前正式 onEnter 入场。两端实绘从用物前一直核到卧房，包含夜间的李大娘和王小虎、卧房的 e8。 [实际绘制比较](../../../../../scripts/e2e/inn-dialogue-review.mjs)

原盘 SSS 1763 的 0x05 清掉姓名和头像，保留上槽和原文字起点。1764–1765 的失忆旁白如今按实际原盘布局绘制，文字从逻辑横坐标 96 开始。原盘 SSS 1771 淡出整张合成画面。Reforge 淡出开始时保留完整画帧，姓名、头像、正文和场景一同变暗。旧卧房画面首次亮起时镜头 [1040,248]，队首 [1200,360]。s001 在揭幕前准备镜头 [1168,136]、队首脚点 [1328,248]、精灵 193 帧 11。随后在夜间卧房实际起身六种姿态，直到 s001 后文。 [作者对白](../../../../../projects/pal/content/scenes/s002.json) · [卧房入场](../../../../../projects/pal/content/scenes/s001.json)

候选 `1a2995d0c2e7ae90ceb77c503a53c7e12df4cb51` 双端 14 组实绘对白与原盘逐组匹配，收录 176 张 Game 与 162 张 Reforge 切场送录帧。成片逐帧解码复核淡出、地图和镜头交接，原速约 28.67 秒，左 Game、右 Reforge 声道。历史双端原件分别复算出整屏淡出错误、错首帧和错说话人。现行发布入口另实跑缺姓名字段、仅一处错姓名与头像、仅第一帧错镜头三组改记录反例，及省略 s002 存档演出态的原生反例。四组均有失败回执，均未生成成片。此前客栈视频作为原时点证据。紫金丹仍只计一个已验战外入口，累计 84/98。 [回放说明、原件和最终带声分屏](../../../../tasks/evidence/E2E-Q2-1-inn-scene-handoff-20261119.tar.gz)

### 客栈柜面遮挡穿插

双端同为 s002、map-012、镜头 [1260,598]，队首脚点 [1420,710]，实绘精灵 2 的第 10 帧。分屏左 4.27 秒、右 3.43 秒可定位到各自原生送录帧 330 和 218。两端的柜子边缘盖住一部分人物，白色袖口又压在紧邻的柜面上。

Game 逐瓦片追到柜边和相邻柜面的深度 720 和 719，队首深度 720。柜面先画，人物居中，柜边最后盖上。Reforge 用同局输入和实际画布复算。仅移除队首时袖口位置恢复为柜面，关闭透视后白色像素仍然出现，柜边下的半透明像素才随透视消失。该穿插是双端共有的前景画序问题。现行分屏的角色状态、画面来源与切场检查可以确认两端画到同一局面，同物件内部的遮挡一致性需要独立判据。 [逐像素回执与复算入口](../../../../tasks/evidence/E2E-Q2-1-inn-cabinet-occlusion-20261119.tar.gz)

## 2026-11-19 最后六种战内道具

固定候选 `bc995df55ff2d5fdefc7c0477707b562e4fed3b4` 在战场 7 载入原队 1，从真实用物菜单逐局操作并打到胜利。七个局面核对 62 次行动和 152 次随机抽样。每次用物扣一份，两端结算及战后数据一致。

| 道具 | 双端实际结果 |
| --- | --- |
| 驱魔香 90、十里香 91 | 三名队员各达到色移峰值 6。退场后追敌范围倍率分别为 0、3，Game 保留 600 个节拍，Reforge 保留 60 秒。 |
| 九阴散 136 | 第一局先通过毒蛇卵上赤毒 551，再实际把逍遥的体力从 486 回到 800，保留赤毒并实绘黄字 314。第二局逍遥未中毒，体力从 500 到 0，实绘蓝字 500，由另外两人打完。 |
| 幻蛊 140 | 灵儿对逍遥使用，扣 1 点体力并加 5 回合混乱。逍遥在该轮实际误击阿奴 1 点，第二轮由灵儿用药解除混乱后恢复对敌攻击。 |
| 隐蛊 141 | 队伍渐隐，第二、三轮选招期间没有队员精灵。隐身计数按 3、2、1、0 递减，第四轮渐显结束后重新出指令菜单，敌方在第四轮才恢复行动。两段渐变各约 1.15 秒。 |
| 金蚕王 150 | 当场从 20 级升到 21 级，六次成长抽样后最大体力和真气各加 11，武术、灵力、防御、身法、吉运分别加 4、5、3、3、2。胜利时成长写回，另入账 1 点经验。 |

修前的 Reforge 两种香只照亮施用者，Game 金蚕王的成长调用绕过战斗随机流，隐蛊的 Game 缺少渐变，Reforge 渐隐期间继续处理战斗。修后两种香按全队绘制，战内成长消费相同随机序列，隐蛊在用物收尾与下一轮指令前同步等待渐变。交叉检查以实际绘制和原生状态拒绝旧记录。 [原盘用物及轮末时序](../../../../phase1/game-mechanics.md#2026-11-13-战斗道具与投掷)

七组独立原生带声重录逐案复算正式候选的行动与抽样。隐蛊录制由归档中的候选代码加载，安装后的固定候选独立复验。分屏约 15.2 秒，左侧和左声道为 Game，右侧和右声道为 Reforge。核对 50 处原生解码画面。 [前后双端原件、对照和分屏](../../../../tasks/evidence/E2E-Q2-1-final-battle-items-20261119.tar.gz)

## 2026-11-19 战内解毒道具和毒卵

基点 `89dab268613141283aa49ddb228351060607316e` 及归档所列的五个源码指纹组成固定候选。原队 1 在战场 7 正常开局，两端实开用物菜单并选定目标，以实际出手建立中毒状态，八组均打到胜利结算。双端对照 76 次行动和 184 次随机抽样。每件扣一份，台账新增 11 个不同物品入口。

| 实际入口 | 实际效果 |
| --- | --- |
| 糯米 75、糯米糕 76 | 两名各有尸毒 552 的队员分别用物，各清自己的毒槽。糯米糕另恢复 25 点体力。 |
| 酒 86、雄黄酒 88 | 酒清李逍遥赤毒 551，体力和真气各恢复 15。雄黄酒清赵灵儿的赤毒 551 与瘴毒 553。 |
| 九节菖蒲 89、鬼枯藤 129 | 九节菖蒲清赤毒 551 并保留鹤顶红 556。鬼枯藤清尸毒 552，同时扣赵灵儿 30 点体力。 |
| 盐巴 77 | 三人都实际中赤毒后用药。掷到 30 时三人清毒，88、97 时保留三人毒槽。三个分支均消耗一份。 |
| 毒蝎卵 118、毒蟾卵 119、蜘蛛卵 120、蜈蚣卵 121 | 分别从库存实际使用，对所选队员新增赤毒 551 并实扣 7 点体力。 |

旧 Reforge 的两次盐巴失败都漏画「无任何效果」，实际扣用与毒槽和 Game 相同。修复由行动结果交给用物时间线，在角色归位后显示旁白，清除后继续八拍收尾。修后两端实测约 1.4 秒自动关闭，另从同一局面实按一次方向键，两端均约 316 毫秒关闭并正常打完。抽样用途标记只在采集配置接入，随机值逐项比对。旧实录因缺失败旁白被正式判据拒绝。 [原盘盐巴使用脚本和复位时序](../../../../phase1/game-mechanics.md#2026-11-13-战斗道具与投掷)

十四份同候选独立重录与验证局复算一致，核用物起手、辉光、音效 028、归位和飘字。原速带声分屏一条保留盐巴成功及失败，时长 3.4 秒，另一条涵盖六件解毒道具与四种毒卵，时长 11.6 秒。左右画面和声道分别为 Game 与 Reforge，核对 72 处解码取样。 [双端原件、修前反例与重录](../../../../tasks/evidence/E2E-Q2-1-battle-antidotes-and-poison-eggs-20261119.tar.gz)

## 2026-11-19 十九件战内补血回气与复活道具

候选 `000d4c31fcb620b2fb10476e608a67f52b2d24f5` 使用原队 1、战场 7、种子 4。六组恢复局从体力 56、真气 31 的三人队开局，分别通过真实道具菜单对指定角色使用。两组复活局由灯笼把李逍遥的体力从 20 打到 0，赵灵儿第二轮选用复活道具。八组均完成胜利结算，双端 60 次行动、156 次随机抽样和库存逐条一致。

| 实际用途 | 道具与原生数值 |
| --- | --- |
| 同时补血、回气 | 茶叶蛋 78 各 15，鸡蛋 79 各 10，糖葫芦 80 各 22，水果 92 各 20，烧肉 93 各 30，蜂王蜜 131 各 150，神仙茶 110 各 440，灵葫仙丹 111 各 250。 |
| 补血 | 腌肉 94 恢复 85，金创药 101 恢复 200，蟠果 102 恢复 450。赤血蚕 149 按体力上限恢复 821，体力 56 → 877。 |
| 回气 | 还神丹 105 恢复 50，龙涎草 106 恢复 110，灵山仙芝 107 恢复 260，雪莲子 108 恢复 400，天仙玉露 109 恢复 700。 |
| 复活 | 赎魂灯 96 恢复 47，孟婆汤 97 恢复 78，对应 157 点体力上限的三成和五成取整。两局均实录倒地、复活及下一轮选招。 |

逐件核原盘脚本、扣用份数、指定目标、举物和目标辉光，以及音效 028 和归位飘字。黄色体力与青色真气各用原盘位置。离线把一次回气飘字移到补血行，由实绘位置判据拒绝。十六份独立录制各自与验证局复算一致。Game 有一次录制在创建浏览器上下文时超时，按同一局面重跑通过，失败报告随原件归档。分屏 29.0 秒，左画面和声道为 Game，右侧为 Reforge，核对 118 处解码取样。 [双端原件、回气飘字反例与原速重录](../../../../tasks/evidence/E2E-Q2-1-nineteen-battle-restorative-items-20261119.tar.gz)

## 2026-11-19 五件战内恢复道具

候选 `0022b7d5929f54059fba7e600cde331582978895` 的两端以原队 1、战场 7、种子 4 试打。四个局面均由角色实际开道具菜单、选中支持的目标并完成胜利结算。两端逐条复算 22 次行动及 61 次随机抽样，每次使用都从当前库存扣除一份。

| 道具 | 实际结果 |
| --- | --- |
| 观音符 61 | 赵灵儿体力 400 → 550，旁位体力保持。 |
| 圣灵符 62 | 李逍遥、赵灵儿、阿奴各恢复 300、80、0，飘字对应两名实际恢复者。 |
| 净衣符 64 | 李逍遥经真实用物染上四种毒。实清毒 551、552、553，保留毒 556。 |
| 天香续命露 98 | 李逍遥先被灯笼打倒，体力归零。赵灵儿使用后恢复到 157，李逍遥下一轮实选指令。 |
| 行军丹 100 | 李逍遥体力 740 → 800，达到上限。 |

核对举物位移、13 拍目标辉光、音效 028、恢复飘字和归位。李逍遥在复活道具辉光期间保持倒地，归位飘字时已站起。离线把辉光中的一帧改成站姿，正式姿态判据拒绝该帧。八份独立重录与正式验证的业务结果一致。四章原速分屏约 8.7 秒，左画面和声道为 Game，右侧为 Reforge，核过 32 处解码取样。 [双端原件、反例与重录](../../../../tasks/evidence/E2E-Q2-1-five-battle-recovery-items-20261119.tar.gz)

## 2026-11-19 拜月教主三招

候选 `701656321e2a9ec347395be253f691f320c74a48` 的双端在战场 48 用拜月原队 313，从正常战斗试打分别加载种子 7 和 42。李逍遥、赵灵儿、阿奴先实选两轮或三轮防御，再以普通攻击完成胜利。两个种子分别进入原盘行动前脚本 42953 的第 2 和第 8 个随机分支。两组共 27 条命令、37 次行动和 184 次随机抽样，逐项对照双端对象、顺序、用途和结算。两局均实收 12,800 文，三人各获 30,000 点经验。 [原盘随机跳转](../../../../../reference/sdlpal/script.c#L3016-L3021)

| 仙术 | 实际命中 | 实绘特效与起播音效 |
| --- | --- | --- |
| 爆炸蛊 374 | 种子 7 第 2 轮，阿奴损失 210 点体力。 | FIRE 37 的 25 帧，音效 168。 |
| 大咒蛇 395 | 种子 42 第 2 轮，李逍遥、赵灵儿、阿奴分别损失 186、188、188 点体力，三人新增毒 553。第 4 轮再次实伤 335、339、337。 | FIRE 42 的 38 帧，音效 173。 |
| 万蚁蚀象 354 | 种子 42 第 3 轮，阿奴损失 125 点体力。第 4 轮在大咒蛇之后再实伤 378。 | FIRE 43 的 6 帧，音效 082。 |

三招实核起手姿态、伤害数字、主特效、受击归位和效果音。删去爆炸蛊第 10 号主特效帧的离线反例由帧序判据拒绝。首轮探索发现空敌槽需预先声明采集别名，另一次测试因命令采集附加字段触发误报。正式复验按实际槽位和命令字段独立复算。四份同候选重录与正式验证一致。三章分屏约 7.7 秒，左侧画面及声道为 Game，右侧为 Reforge，核对 18 处解码取样。52 个敌方仙术施放义务全部有实战原件。 [双端原件、反例及重录入口](../../../../tasks/evidence/E2E-Q2-1-moon-leader-casts-20261119.tar.gz)

## 2026-11-19 六根龙柱与三种敌方仙术

六场从七柱仍在的合法存档分别加载，赵灵儿、李逍遥、林月如实际交互各柱。双端战场 32、曲 042。每场核对选招、行动、随机抽样和最终体力、真气、经验及金钱。相应柱体各自退场，原生音效 262 各一次，双端在 s144 实按右方向恢复走动。六场按独立入口登记。末柱及逃离的分支见毒神龙原件。

| 龙柱 | 正式入口与原队 | 实际行动 / 抽样 | 返场首步 |
| --- | --- | ---: | --- |
| 金神龙 | e2391 · 原队 306 | 19 / 84 | [100,70] → [101,70] |
| 土神龙 | e2392 · 原队 307 | 7 / 48 | [60,6] → [61,6] |
| 火神龙 | e2393 · 原队 308 | 11 / 60 | [139,65] → [140,65] |
| 冰神龙 | e2394 · 原队 309 | 7 / 48 | [100,45] → [101,45] |
| 风神龙 | e2395 · 原队 310 | 7 / 46 | [74,-17] → [75,-17] |
| 雷神龙 | e2396 · 原队 311 | 7 / 46 | [95,12] → [96,12] |

三组原队试打采用战场 7。半人蛇第 4 轮两次弦月斩 338 分别造成 14、22 点伤害，第 5 轮一次 14 点，均实绘 FIRE 10 的 10 张图并起播 485。338 与已验的 339 各按原盘 ID 登记。原始 81 次抽样数值一致，初轮对照定位 Reforge 采集少了四条敌方脚本条件标签。测试配置在原生抽样调用点补标后，数值和用途均匹配，保留补标前后的各自原件。 [三组原生轨迹](../../../../tasks/evidence/E2E-Q2-1-six-dragon-entrances-and-enemy-casts-20261119.tar.gz)

女飞贼第一轮爆炸实绘 FIRE 12 的 15 帧，李逍遥受 55 点伤害，林月如体力保持。起手和效果分别实播 477、117，第二轮脚本实播 193。石长老对 1 体力的李逍遥使用气魔焰，实扣 1 并进入原生败北，起播 501 和受致命伤的声音 023。气魔焰实绘 FIRE 45 的 7 帧，按起手脚本请求，在每张主特效上上下交替 4 像素，结束清零。 [原盘 FIRE 时序](../../../../../reference/sdlpal/fight.c#L2890-L3061)

两条分屏的 Game 和 Reforge 均为同候选原生录制，左画面和左声道为 Game，右侧为 Reforge。六场返场分屏 119.9 秒，六章分别完整从实际接敌到实走返场。三招分屏 7.2 秒，保留第 4 轮连续两次弦月斩。解码共核 66 处画面。龙柱的前一候选验证与本轮录制之间仅有文档差异，核全部采集依赖指纹及同端动作、随机值和出口。 [双端原件及分屏重录](../../../../tasks/evidence/E2E-Q2-1-six-dragon-entrances-and-enemy-casts-20261119.tar.gz)

## 2026-11-19 三种敌方仙术和七星盘龙柱

三组原队试打使用战场 7，玩家选防御并按实际菜单推进。林天南在第 7 轮施放斩龙诀，造成 140 点伤害，然后按剧情终止且没有胜利结算。金蟾鬼母第 7 轮的三尸咒造成 27 点伤害，毒槽由 553 变为 553、555。毒神龙首轮万蛊蚀天造成 52 点伤害并新增毒槽 555，两场蛊术均在后续普攻击败敌人后正常结算。

斩龙诀实绘 FIRE 11 的 14 帧，实际播放 265 和 132。原生像素见上下各 4 像素交替 14 次。两种蛊术各绘出 FIRE 25 的 20 帧，三尸咒实播 270、313，万蛊蚀天实播 230、313。录制与两端独立验证的动作、伤害、毒槽及随机抽样逐项一致。 [试打原件与分屏](../../../../tasks/evidence/E2E-Q2-1-three-enemy-spells-and-dragon-pillars-20261119.tar.gz)

毒神龙的正式返场从七星盘龙柱 s144 实际交互 e2390。原队为赵灵儿、李逍遥、林月如，场地 32、曲 042。首柱胜利和末柱胜利各核 11 次行动、9 次实际指令与 58 次随机抽样，三人各得 3108 经验。赵灵儿体力上限增至 1603，按增长后缺口半恢复至 1601，双方返场数据一致。Game 在半恢复后记录战斗结束，Reforge 在最终写回前记录结束。以双方返场数据核最终写回。

首胜只隐去毒神龙柱，实播 262 并渐变，另外六柱仍在。两端实按右方向从 [60,30] 到 [61,30]。主动按 Q 逃离走临时隐藏分支，保留全部七柱，回到同一落点并可移动。修前 Reforge 两种出口都实际跳到 s149，修后按分支结束。最后一柱样本从其余六柱已毁去的原生存档装载，胜利后才实播曲 023 并切到 s149 的 [91,39]。 [原盘分支](../../../../phase1/game-mechanics.md#2026-11-19-七星盘龙柱返场与倒塌演出)

末柱修前 Reforge 的八处等待为 416、250、167、83、250、167、83、250 毫秒。修后以原盘世界帧为判据，Game 为 1001、598、400、200、600、400、199、600 毫秒，Reforge 为 999、616、402、216、600、415、217、599 毫秒，独立重录亦通过。三招分屏 5.8 秒，沿用场景修复前同版本的双端试打实录，场景修复后再核同局。盘龙柱三条出口分屏 52.6 秒，全部取修后双端实录。两条分屏均原速、左 Game 右 Reforge，各有对应声道，共核 42 处解码取样。 [修前反例、实战和分屏重录](../../../../tasks/evidence/E2E-Q2-1-three-enemy-spells-and-dragon-pillars-20261119.tar.gz)

## 2026-11-19 姜清剧情与六种敌方仙术

四组双端单独试打使用原队、战场 7、种子 4 和相同队伍属性。实选防御和攻击，按原生抽样核伤害，再核逐帧起手、主特效、受击、落点和声音。林月如两场首轮各施法两次，彩依前两轮和姜清第四轮按脚本空过。

| 原队与敌人 | 仙术 | 首次实测轮次 | 双端实伤 | 原生声音 |
| --- | --- | --- | --- | --- |
| 24 林月如二 | 剑气 356 | 1 | 13 | 011、129 |
| 21 林月如一 | 鞭击 360 | 1 | 13 | 011、003 |
| 39 蝶精彩依 | 天女散花 355 | 3 | 54 | 457 |
| 163 姜清 | 御剑伏魔 361 | 3 | 87 | 265、123 |
| 163 姜清 | 气剑指 337 | 6 | 27 | 265、129 |
| 163 姜清 | 剑气斩 388 | 11 | 38 | 265、151 |

此前玉佛寺的两份同版本验证报告各含两轮完整剧情。回读四份原生轨迹，方丈在第 2 和第 4 轮各施放一次佛法无边，李逍遥体力分别由 940 降到 858、由 856 降到 691。对应 82 和 165 点实伤，四次执行一致，计入敌方覆盖。镰刀鼬实录使用的是弦月斩 339，同名的 338 仍待实测。 [玉佛寺双端原件](../../../../tasks/evidence/E2E-Q2-1-jade-buddha-victory-20261116.tar.gz)

姜清另从「锁妖塔迷宫3」的入战前存档实跑。李逍遥、林月如按原剧情从 [117,26] 交互 e2407，取得七星剑，从战场 40 完成 12 轮后获得天师道袍。双端 35 次行动、118 次抽样、24 次真实选招和 25 次音效起播逐项一致。两人各得 2500 经验，队伍得 2000 文，核过两人的战后成长及真气和体力。姜婉儿告辞后双方已恢复自由走动，实按右键从 [120,26] 走到 [121,26]。 [正式剧情入口](../../../../../projects/pal/content/scenes/s147.json)

修前 Reforge 的六个等待分别量到 156、48、51、49、382、250 毫秒，均由世界帧判据拒绝。按原盘 `0x09` 和每帧 100 毫秒修正后，两端实测分别为 Game 400、100、100、100、1001、601 毫秒及 Reforge 408、101、98、102、996、598 毫秒。修后独立录制再次通过六处等待和完整剧情。 [原盘世界等待](../../../../phase1/game-mechanics.md#2026-11-19-姜清剧情里的世界等待)

六招分屏 11.7 秒，沿用修前同候选的双端试打实录。修后四组试打再验相同动作、伤害、抽样及特效。依赖差异只命中锁妖塔的 e2407 场景等待。姜清剧情分屏 110.3 秒，全部取修后同候选的原生实录。两条分屏均为原速，左 Game、右 Reforge，各自声道同侧，共核 52 处解码像素。 [双端原件、等待反例和分屏重录](../../../../tasks/evidence/E2E-Q2-1-jiang-qing-enemy-casts-20261119.tar.gz)

## 2026-11-19 姜清退移与末柱倒塌复验

以 `759886346d091f3dc2c0b67f72547c6861b81b6a` 的同局原生存档复现，候选 `a91f7719560e5016d8103409e06fe5eb83052d4b` 重录。姜清对白「这里是不许进来的吗」时，两端李逍遥均在 [120,26]。修前 Reforge 将后退位移方向写入跟随轨迹，林月如在 [117,26] 向右。改用队伍当前朝向后，两端林月如均在 [119,26] 向左，相对李逍遥的实际脚点为 [-16,-8] 逻辑像素。该处定格的左向步态分别为 Game 帧 5 和 Reforge 帧 4。两端复验继续打完 12 轮、核七星剑与天师道袍，并实按方向键走到 [121,26]。 [退移原盘语义](../../../../phase1/game-mechanics.md#2026-11-19-姜清剧情里的世界等待)

从六柱已毁的存档打完最后一柱，旧 Reforge 的 1、2、3 像素震屏均约每 40 毫秒换向。修后 Game 三段均约 100 毫秒，Reforge 量到 99.9、100.7、99.8 毫秒，三段均先向上。s149 两段过场均首帧淡入，按素材逐帧震屏，双端实绘 RNG 005 的 0–81 帧和 RNG 002 的 0–92 帧。旧 Reforge 的 RNG 002 在不透明黑幕下合成。修后确认幕布退出，两段实际播至末帧，随后在 s150 画出并淡入新场景。 [原盘倒塌与过场](../../../../phase1/game-mechanics.md#2026-11-19-七星盘龙柱返场与倒塌演出)

姜清 111.7 秒和末柱 38.0 秒的分屏均用该候选的双端实录原速合成，左侧和左声道为 Game，右侧和右声道为 Reforge。采集回执、修前反例、末帧与声道解码随同归档。 [原件、判据与双端分屏](../../../../tasks/evidence/E2E-Q2-1-story-presentation-recheck-20261119.tar.gz)

## 2026-11-19 末柱倒塌红廊外观复验

用户指出旧分屏红廊内的队员外观和颜色有差异。旧 Reforge 录制起点从默认角色表构造世界，存档遗漏了 s144 进场写入的三套精灵和 2 级水波。Game 当时从实际进场存档开始，倒塌对白时赵灵儿、李逍遥、林月如分别绘制 534、532、533。Game 调色板 0 与 Reforge 标准色表的 256 项逐值一致，三套专用精灵的解码帧一致。红色像素来自这些精灵的色号。 [原盘换装与水波](../../../../phase1/game-mechanics.md#2026-11-19-七星盘龙柱返场与倒塌演出)

新回放从 Reforge 的 s144 正常进场实际确认「七星磐龙柱」旁白，取原生存档作为末柱起点。读档后核三套外观及水波，实打末柱后在「七根龙柱全部毁去」对白核最终画布的三套精灵和红色像素。旧起点由同一观察点检出默认精灵 3、2、7。赵灵儿在新分屏的对白抽样时为同一方向的相邻动作帧。新版分屏长 37.4 秒，约第 2.6 秒可看红廊及三人外观。两段过场均实际播至末帧，随后 s150 淡入。 [双端原件与新版分屏](../../../../tasks/evidence/E2E-Q2-1-dragon-pillar-party-appearance-20261119.tar.gz)

## 2026-11-19 末柱过场交接和走廊群像

用户在约 23 秒指出 Reforge 缺少走廊 NPC，并指出片尾一闪而过的空雪地。两端从同一合法末柱局面实跑。修前 Reforge 在第一段 RNG 期间执行 87 条自动指令，八名对象已经走动。按同一幕布阶段对齐，原版在走廊抽样点实绘七名 NPC，Reforge 只剩一名在屏内。第一段进出均曾提前露出 s149 地图。第二段收尾后又露出同一地图，随后从默认站位 [96,32] 淡入空雪地，才瞬移到剧情落点。原生录像分别解出 10 帧提前的旧地图和 7 帧错误雪地。 [原盘更新时机](../../../../phase1/game-mechanics.md#2026-11-19-七星盘龙柱返场与倒塌演出)

s149 从倒塌后的黑场直接进入第一段首图淡入，在播放及持末帧淡出期间留住八名对象的初始位姿，走廊开始揭幕时再接通其自动行为。修后两端首次全亮实绘同样五名 NPC，之后的同阶段样点实绘同样七名。各端仍有个别 NPC 的在途位置和走姿差异。第二段也持末帧淡到黑，s150 在黑幕后清震并定位到 [68,-2]，首个可见画面使用剧情构图。 [共用入场和持帧协议](../../../../phase2/specs/script-system.md#姿态condition与时间)

用另一组合法入口走共用宿主回归。提前释放影片层时，复验会在淡出前检出缓冲态。把定位挪回揭幕后时，复验会检出第一张错误站位。两个反控分别失败，恢复后相关 22 项通过。源数据核查另确认 s011 现用的相邻淡出已声明持末帧。

候选 `2db5b53ae06832fb80114a7cbd1449ba86416f4f` 实录重比末柱战斗、红廊角色、三段震屏、两个完整影片和场景交接。逐帧解码原生录像和 39.2 秒原速带声分屏，确认两段首图淡入，镜头提前回到走廊和默认雪地的匹配帧数均为零。约 23 秒看走廊，约 37 秒看雪崖切场。 [原生阶段记录、反例和新版分屏](../../../../tasks/evidence/E2E-Q2-1-dragon-pillar-cutscene-boundaries-20261119.tar.gz)

## 2026-11-19 雪崖剑圣入场正文

候选 `ddb9b6bee63f78e38136df210aca36a19445e049` 从同一末柱局面的原生存档开始：s144/e2390、六柱已毁、场地 32、种子 4。双端实际接敌、获胜，连续录到 s150 剑圣的第一句「你怎么不阻止他们呢！？」。原盘指针 24988–24989 执行右上位移与走帧，25000–25003 的世界等待和转向给出走满 15 步、站定四拍后转左的依据。 [原盘机制](../../../../phase1/game-mechanics.md#2026-11-19-七星盘龙柱返场与倒塌演出)

脚本裁定为本段改进。`s150/onEnter/default/initial`「雪崖：剑圣质问酒剑仙」持有整段开场：准备清震、定位队伍；600 毫秒淡入与「剑圣每拍走近酒剑仙」同时开始，剑圣每 100 毫秒位移 `(8,-4)` 并推进一帧步态，15 步完成后站定 400 毫秒再转身、说话。保留原步距、末步站姿和停顿理由。首步与淡入同一帧时钟发出。Reforge 在首句前执行 15 对前景位移/走帧，剑圣没有自动行为绑定或自动指令。旧候选的 15 步画面相符，但由剑圣自动执行，判据专门拒绝；两个中间候选则因全亮时只走 6 步被拒绝。 [入场编排合同与范围](../../../../tasks/cards/PAL-ENTRY-FADE-1.md)

Game 和 Reforge 全亮都到第 7 步 `(1080,596)`，第 15 步同到 `(1144,564)`；停到转身的实绘间隔分别为 400.3 和 425.6 毫秒。旧过场退场和走廊继续复验：两端都实绘 RNG 005 的 0–81 帧与 RNG 002 的 0–92 帧。逐帧解码 Reforge 原生录像及成片右屏，提前露出旧走廊或默认站位空雪地的匹配帧均为零。原速分屏 40.37 秒，左 Game、右 Reforge，各自声音在同侧；不按帧数拉齐两端的自然播放时长。约 36 秒起看雪崖步行，片尾保留首句。

编辑器实际打开该步骤，核默认使用「场景摆放」。酒剑仙 e2464 在 `[68,-2,0]` 朝上可见，剑圣 e2465 在 `[71,7,0]` 朝上可见，离场替身 e2466 在 `[71,-1,0]` 朝下隐藏。相关实体无额外碰撞或画序覆写。播放时在淡入中已走动，转左后显示首句；重置和重新加载编辑器后，三者恢复并保持上述初态。实跑覆盖到首句。核读发现 s149 的 e2456–e2463 各有一条有限群演路线，现只核了群像呈现，路线并行与退场待逐实体核对；s150 的 e2466 是首句后的离场替身，该编排未实跑，待核其收尾。按本次上下文更新逐步骤记录，未给后续台词、离场和其他战斗项目增加通过计数。 [逐步骤台账](../../../e2e/cross-stage/script-progress.md) · [双端日志、反例、编辑器和原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-cliff-sword-saint-walk-20261119.tar.gz)

## 2026-11-19 鬼降命中后的抖动

用户在上批分屏指出 Reforge 的鬼降受术者没有抖动。回读同局原件，Game 从起手就记录到横移 −1、0、+1，Reforge 在主特效结束后的收招期间三个偏移始终为 0。原版先完成攻击特效，再执行成功脚本。两端将新混乱的绘制起点对齐到主特效清除的第一拍。 [原盘成功脚本及画面取点](../../../../phase1/game-mechanics.md#2026-11-19-鬼降混乱抖动的起点)

候选 `1d84214d2395cd12cde31b651b7a67e1412fe70a` 重跑同一成功、巫抗抵抗和概率掷到 44 的局面。成功局在起手至最后一张主特效期间的横移均为 0，收招期间两端都实绘 −1、0、+1，纵向脚点和未受术敌槽站位一致。成功仍使智杖和尚进入 4 回合混乱并实际攻击灰衣喇嘛，蓝字 93。两种失败均无位移。两端原生行动与随机轨迹也分别复算到上批原始原件。新分屏约 4 秒，抖动约在 2.7 秒出现，开场、FIRE、收招和同伴受击各验两幅原生像素。 [修前索引、三组复验及带声分屏重录](../../../../tasks/evidence/E2E-Q2-1-ghost-confusion-20261119.tar.gz)

## 2026-11-16 战场载入与实绘

在 `00eae5bb2` 上用同一支队伍、灯笼敌队和种子，Game 的战斗 fixture 与 Reforge 的独立试打逐一指定 6–57 号战场。两端各执行 52 次真实起战，采集 62 张画布原件与 52 份原生轨迹。52 组的初始参战状态、实际绘制坐标和引擎读到的五灵系数一致，覆盖 19、26、28、38、46 号无直接剧情引用的战场。

按原盘背景的调色板索引和逐行循环卷动计算预期像素。每帧取画布未被精灵遮挡的 316×27 区域，124 帧全部吻合。18、22、32、35、50 号各拍三帧，两端五个战场都观察到不同波动相位。用 46 号画面替换 7 号实绘，再重复 32 号的首帧来模拟波形静止，两项反控均被比较器拒绝。首轮采集曾误将 Reforge 画布宽度固定为 960，改为按画布实际整数倍取样后重跑，失败报告随原件保留。

这轮覆盖战场定义、背景和常驻波动、固定阵容的初始站位及五灵系数传入。真实剧情的战场选择、其它队形与各系数参与伤害计算还按具体调用复验。 [双端轨迹、画布原件、比较器及复跑命令](../../../../tasks/evidence/E2E-Q2-1-battle-field-render-20261116.tar.gz)

## 2026-11-16 长鞭类的群攻和投掷

林月如分别装备长鞭、九截鞭和金蛇鞭，同一支三灯笼原队和种子下实际选招。群攻首挥依次命中敌槽 2、1、0，蓝字和扣血状态逐槽复核。另从战斗背包各投掷同名物品，选敌槽 1，只命中该槽并各消耗一件。Game 与 Reforge 各做 12 次，24 场都实际胜利并通过双端比较。

| 武器 | 群攻首挥蓝字 | 投掷蓝字 |
| --- | --- | --- |
| 长鞭 | 105、52、27 | 172 |
| 九截鞭 | 243、121、60 | 389 |
| 金蛇鞭 | 342、171、85 | 756 |

三把鞭子在修前的 Reforge 都于 EFFECT 6 提前绘制伤害数字，Game 于 EFFECT 7 绘制。原盘在第一帧更新 UI 后才入队伤害数字。群攻表现按同一规则改为在第二个特效帧绘制，武器音仍在第一帧。修后数值、随机抽样、位置、形象、效果帧和音效检查通过，旧候选的六次 Reforge 群攻保留为反例。另复跑玄冥宝刀双挥群攻和同局随后的单体普攻。

装备由两端正式试打准备入口加载，覆盖生效后的攻击、身法和群攻。战外菜单装卸和属性恢复继续按入口验证。原速分屏的两章为长鞭群攻和金蛇鞭投掷，实际指令时间对齐，左声道为 Game，右声道为 Reforge。 [修前、修后、回归、原声分屏及逐项明细](../../../../tasks/evidence/E2E-Q2-1-whip-attacks-20261116.tar.gz)

## 2026-11-16 玉佛寺连续两战

Game 与 Reforge 从玉佛寺 `s058` 的同一合法站位交互 `e958`，使用同样的 99 级李逍遥、装备、显式属性和种子 6。第一战用实际战斗输入赢得 `team-28`，继续原剧情触发 `team-35`。原盘 SSS 11490 设场地 56，11491、11535 之间没有第二次设置场地。修前 Game 两战都是 56，Reforge 第二战实际画出场景默认的 12 号图。

在作者工程的第二次起战显式设置场地 56。修后同候选两端各复跑两次，两战均实绘 56 号背景，战斗曲均按原剧情依次实际播放 42、45。第二战从方丈独占中间槽开始，提交防御后两名黄衣刀僧由方丈脚本真实召出，槽 0 与槽 2 在同一画帧显示，足点一致。

召唤音效仍待修。两轮 Game 都在成功召唤时实际播放 212，Reforge 的同一窗口均没有对应启动记录。首战后生命上限为 Game 1006、Reforge 999。复核保存输入发现 Game 隐藏生命经验池是 1 级，Reforge 夹具使用角色等级 99 初始化，战后成长要在相同隐藏经验初态另跑。此次两端停在召唤实绘，第二战后续行动、胜利和剧情退场仍待测。 [原剧情输入、修前反例及修后双端原件](../../../../tasks/evidence/E2E-Q2-1-jade-buddha-temple-20261116.tar.gz)

## 2026-11-16 玉佛寺召唤音与成长复验

重新准备了同一 99 级李逍遥、木剑、十种已学仙术和种子 6。七个隐藏经验池均设 20 级，生命池初值 4500，其余为 0。两端从 `s058/e958` 实际胜过首战再接方丈战。四次正式运行的有效抽样、实绘成长数值和世界写回一致。

首战得经验 350、金钱 673。生命经验池升到 21 级，剩余 247，武术池累计 186。体力上限 950→952，实绘卷轴为 +2。半恢复写回 HP 940/952、MP 490/500，两端以同一结果进入第二战。

方丈首次成功召唤时，槽 0 和槽 2 的两名黄衣刀僧同帧出现，音效 212 每端每次实际启动一次，解码帧数 83,025。四次声音启动都在两僧首次绘制的一帧内。两战都复验了 56 号战场。冻结旧候选的两轮原件复放均检出 Reforge 召唤声缺失，无空槽用例复验未播放。成长卷轴沿用 Reforge 的居中布局，两端位置有既有差异。本轮止于第二战两僧入场。 [双端结算、召唤、反控及原声分屏](../../../../tasks/evidence/E2E-Q2-1-temple-and-whip-follow-up-20261116.tar.gz)

## 2026-11-19 106 件装备装卸与选人

从六个已归档的装备目录批次恢复双端原件和输入回执。每件装备均有从空槽装入、替换时进入同槽、作为原装备返回背包，以及经真实场景交互卸下的记录。两端逐步复算同一装备实例、角色、库存、有效属性、选择和菜单实绘。每端共 324 次真实操作，覆盖集合与当前目录 106 个稳定 ID 一致。六批保留各自生产版本，逐件原件索引为归档成员 `archived-equipment-rejudged.json`。

在 `ce4ded54d4efa7420d17f57da5c649579a5fca7d` 的同一工作树复验六槽和双人选人。两端每个案例各跑两次正式验证，再各独立录制一次。旧双人例从队长名单漏掉另一位可装备角色，给第二人装上同一件合法装备的交互也失败。新运行分别核真实方向键切换、可装颜色、原装备回收及不可装角色的保留。首次录制被源码门拒绝的差异是四条道具用法草稿。正式验证使用提交中的物品输入，复验后核字节恢复草稿。

六槽分屏 10.72 秒，双人选人分屏 6.27 秒。两份分屏均为原速，左侧为 Game，右侧为 Reforge。两端每一张解码帧对照各自原生录像，单帧变白被比较器拒绝。四条声道与各自原生混音的解码相关系数均大于 0.998。

同槽换上玄铁剑后两端身法都是 -2。当前 Game 面板这格留空，Reforge 显示 0。六槽录像保留这个待处理的显示差异，双端状态与画到的具体数码已按各自时间定位。另有七件装备的技能入口不同，Game 覆盖合击，Reforge 将相应技能放入可施放列表。这里登记实际装卸和属性，战内使用及两种入口的设计裁定继续留在剩余范围。 [逐件原件、录制与差异](../../../../tasks/evidence/E2E-Q2-1-equipment-operations-20261119.tar.gz)

### 装备选人页的底色与外阴影

Game 在同局使用带阴影的固定背景。Reforge 使用自有木纹，并曾对该卷轴框传入 `shadow: false`。本次恢复共用九宫格外阴影，在选人页的背景层单独绘制一层 10% 暖色。采集器从正式选人画布取空白木纹、框外右侧及相邻未遮挡木纹的亮度。离线比较逐次绑定选中物、初选、换人或换回旧件。以同局 Game 的底色亮度为参考，允许 8% 差距。框外阴影区应为相邻木纹的 50% 至 85%。缺取样直接拒绝。

旧实现双端各跑两轮六槽。装卸和角色选择通过，36 组阶段取样均检出没有外阴影和底色暗两个差异。修后候选 `71ec9ab37` 双端各做两轮六槽与双人选人验证，再各做一轮录制，72 组阶段取样均通过。

同一局面换上玄铁剑、卷面显示回到背包的木剑 1 件。解码后的空白木纹均值从 Reforge 84.1 提升到 99.8，Game 在该局是 99.5，量程为 0–255。框外右侧由相邻木纹的 99% 回到 73%，Game 为 72%。录制按实际选中物、角色、属性和来源时钟定位。同场画布与录像另行核对。六槽分屏 10.78 秒及双人选人分屏 6.26 秒都保留原速、左 Game 右 Reforge，全部解码帧和左右原声通过各自原件校验。 [双端日志、旧版反例、像素回执与分屏](../../../../tasks/evidence/E2E-Q2-1-equipment-appearance-20261119.tar.gz)

## 2026-11-19 153 种敌人的出场与行动

复算新增批次的 54 个原编队、32 份报告和 216 份双端原生轨迹。每个原编队两端各两轮。新增的 71 个稳定 ID 逐槽确认开场、实际指令和出招实绘。相同敌种占多个槽时逐实例核对。先前 71 个标准记录和 11 个专用记录重新绑定原档、有效实例及行动。合集与当前 `enemies.json` 的 153 个 ID 一致。152 种有实际战斗行动，半人蛇妖 `enemy-502` 在原队 25 按专用剧情退场。逐项定位取归档中的 `rejudged-opponent-coverage.json`。 [敌人原件、重复回执与分屏](../../../../tasks/evidence/E2E-Q2-1-opponents-153-20261119.tar.gz)

五场代表战斗保留 85.25 秒原速带声分屏。旧拼接的音画时钟随章节偏移，第四场两侧各有一帧较早的画面回跳。修后由十份原生录制一次合成，在同一个 60 帧和 48 kHz 时钟上切换章节。两侧各 5,115 张解码帧逐一对照。故意变白的一帧两侧均能检出。十条分段声道与各自原始混音的相关系数均大于 0.99，采样位移为零。 [原生录像及捕获回执](../../../../tasks/evidence/E2E-Q2-1-opponents-native-media-20261119.tar.gz)

## 2026-11-19 隐龙窟两战与黑蜘蛛

重读双端起始存档、原场景触发、战斗准备和跑完后的输入回执。蛇妖男在 `s041/e671` 触发原队 45，狐妖女在 `s047/e760` 触发原队 44，战场均为 27。黑蜘蛛在 `s139/e2346` 触发原队 43，战场为 11，另核进战前四拍和前景中的蜘蛛移动。三例都核已实绘对白、首次战斗画面、同轮下令、出手、配乐和胜利奖励，再经实际方向键恢复场景控制。狐妖女战后实收 `289`，黑蜘蛛实收 `152`。 [两端完整日志与复算](../../../../tasks/evidence/E2E-Q2-1-boss-entrances-20261119.tar.gz)

三场由六份原生录像合成一份 127.58 秒原速带声分屏。双侧各 7,655 张已解码帧通过来源核对，六条分段声道相关系数均大于 0.99，采样位移为零。 [隐龙窟原生录像](../../../../tasks/evidence/E2E-Q2-1-hidden-dragon-bosses-native-20261119.tar.gz) · [黑蜘蛛原生录像](../../../../tasks/evidence/E2E-Q2-1-black-spider-boss-native-20261119.tar.gz)

## 2026-11-16 三把鞭子的战外装卸

两端以同一房间、木剑、丝衣和三把鞭子各一件开局。从游戏装备菜单选择林月如，逐件换成长鞭、九截鞭、金蛇鞭，再换回木剑。随后分别装备三件鞭子，由存档测试场景中的交互触发原生卸武器指令。固定原始武器槽及角色，逐步核对实体交互见证、角色属性、战斗精灵、背包数量和操作恢复。

| 武器 | 武术 | 身法 | 群攻 |
|---|---:|---:|---|
| 木剑 | 40 | 43 | 关闭 |
| 长鞭 | 58 | 60 | 开启 |
| 九截鞭 | 104 | 73 | 开启 |
| 金蛇鞭 | 137 | 100 | 开启 |
| 空武器槽 | 38 | 40 | 关闭 |

换装把旧武器退回背包。三次卸装均清空武器槽并退回鞭子，恢复空手属性，丝衣和防御 38 保持一致。卸甲槽对照真实移除丝衣，防御降至 35，比较器检出错误槽位、库存和属性差异。

初轮录像还检出 Reforge 选人页省略单件数量。改为正库存均绘青色数字。修后同一局面两端各跑两轮，每次选人实绘数量 1。录像终帧绑定最后一次脚本卸装后新开的选人面板，手持栏留空，退回背包的金蛇鞭绘 1。旧采集重复引用上一次相同画面的时间戳，重跑使用新绘制次序和实际输入回执核对。 [双端装卸、反控及原声分屏](../../../../tasks/evidence/E2E-Q2-1-temple-and-whip-follow-up-20261116.tar.gz)

## 2026-11-16 玉佛寺方丈胜利与离寺

从同一寺内入口实际打完两战，第二战继续用一次防御引出方丈施法，再使用原生自动普攻。实际目标依次为刀僧 0、方丈 1 两次、刀僧 2。首个比较版本的第二场种子重置规则不同，该轮只作世界演出与退场对照。正式夹具为两端的每场战斗各从种子 6 开始，复用首战已核的隐藏经验与角色配置。

同种子后，第二回合两端实算的身法都是僧 0 为 36、方丈为 36、僧 2 为 35、李逍遥为 2265。原盘把李逍遥和首个敌槽交换，方丈先于同速刀僧。旧 Reforge 使用稳定排序，先行动的刀僧取走一次格挡抽样，方丈的第一次佛法无边扣 55；Game 在主动防御下扣 82。共用队列改为按原盘逐对交换。 [原盘队列](../../../../../reference/sdlpal/fight.c#L1573-L1585) · [Reforge 队列](../../../../../packages/content/src/battle-formulas.ts)

庙内 11 个等待由原脚本的 100 毫秒世界拍计算。修前 Reforge 的智泽出声前等待约 50 毫秒，Game 约 100 毫秒；众人转身前各约 332 和 800 毫秒。作者脚本补齐每处时长。寺外落点后的首次自由移动需要在原始队形轨迹前记录出发位置。修前 Reforge 两个跟随者各多退一格，补记后恢复原盘的位置。 [原盘首步轨迹](../../../../../reference/sdlpal/scene.c#L817-L847) · [作者剧情](../../../../../projects/pal/content/scenes/s058.json)

修后三项以同一候选在 Game 和 Reforge 各跑两次。第二战 60 次规则抽样逐项相同，两次佛法无边分别扣 82 与 165。两端实际结算 240 经验、4789 文，隐藏经验池和半恢复写回一致，李逍遥体力为 821/952、真气 495/500。罗汉袍在战斗胜利脚本入袋，庙内小石头收服后再得玉佛珠，各一件。

两端按实绘完成寺外对白和 078 配乐启动。从 `s057 [72,-2,0]` 按下方向键实际走至 `[72,-1,0]`。赵灵儿脚下是 `[71,-2,0]`，李逍遥与林月如首步足点都在 `[72,-1,0]`，两个引擎的画面纵向基准相差 3 像素。同格叠画时 Game 让林月如在前，Reforge 按现行队长优先规则绘李逍遥在前。本例选择六回合胜利，方丈第九轮再召唤留作长战用例。 [双端原件、反控和原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-jade-buddha-victory-20261116.tar.gz)

## 2026-11-16 九种玩家召唤仙术

同一双黑毛球原队 12、战场 7、种子 1，从各技能的合法角色、习得条件和同一装备配置开战。赵灵儿在对应两局均带仙女剑，酒神两端开场均有一份酒。九招各两次，Game 和 Reforge 共 36 场用真实键盘施放并结算胜利。初态、扣费、六次战斗抽样及分配、两槽实际伤害、蓝字绘制、召唤本体和后续 FIRE 实绘帧逐项对照。使用 [原盘仙术伤害](../../../../../reference/sdlpal/fight.c#L174-L247) 和 [召唤坐标与帧序](../../../../../reference/sdlpal/fight.c#L3131-L3187) 作判据。

| 仙术 | 本体足点 | 两个敌槽各自的实绘伤害 |
| --- | --- | --- |
| 风神 | (224,181) | 325 |
| 雷神 | (240,175) | 456 |
| 雪妖 | (240,197) | 465 |
| 山神 | (212,178) | 470 |
| 天剑 | (248,160) | 318 |
| 武神 | (232,187) | 681 |
| 剑神 | (240,165) | 465 |
| 酒神 | (240,183) | 807 |
| 火神 | (240,165) | 513 |

酒神先扣常规 1 点真气并消耗一份酒，剩余 99 点真气乘 8 得到基础伤害 792，清空真气。两次逐槽抽样分别算出 15 点灵力和防御修正，实际伤害和蓝字均为 807。旧 Reforge 用 792 直接扣体力，在这场只显示有效扣血 42，并少取两次抽样。玩家专属效果的召唤本体也缺了纵向偏移 18。两处已分别校正。 [原盘酒神前置指令](../../../../../reference/sdlpal/script.c#L1848-L1857)

旧 Reforge 九种召唤都在神将退场后才绘出伤害数字，较 Game 晚约 1.3 秒。修后特效、伤害数字与敌人受击发生在神将仍在场的阶段。只比较能从原生动作、实绘与音频启动见证的施放范围。Game 的入战提示音属于开场入口，两端试打在出招前的入口表现各依原实现。酒神的缺酒和限次仍由原单测单独维护。本批的原始对照、判据和酒神 1 倍带声分屏已归档。 [九种召唤原件与酒神分屏](../../../../tasks/evidence/E2E-Q2-1-player-summons-20261116.tar.gz)

用户查看酒神分屏时看到右侧先闪白。原分屏按施法指令对齐，右侧约 3.083 秒提亮，左侧约 3.116 秒，两侧各有两帧。采集器已增加敌方实际绘制的色偏，旧原件保持原记录。九种召唤在原队 12、战场 7、种子 1 各重跑一次。两端每个受击对象的四拍位置与色偏都符合原盘顺序，第二拍提亮，第三拍复色，第四拍归位。蓝字在提亮时仍然可见，原动作、伤害和音效判据也通过复验。 [原盘受击](../../../../../reference/sdlpal/fight.c#L3210-L3245) · [受击提亮复验和原分屏抽帧](../../../../tasks/evidence/E2E-Q2-1-player-summon-hit-flash-20261116.tar.gz)

## 2026-11-16 红史莱姆和血云雾分裂

逐条对照原盘 `SSS.MKF` 和作者效果，PAL 有两种敌人实际使用分裂。红史莱姆的第二轮触发由原脚本 42596 提交。血云雾通过原脚本 42701 的概率门后由 42702 提交。分身从重置的敌槽入场，母体与分身各得向上取整的一半当前体力，获得各自的脚本游标，随后正常参与队列。 [原盘分裂](../../../../../reference/sdlpal/script.c#L2776-L2868)

| 原队与输入 | 双端实际结果 |
| --- | --- |
| 47 红史莱姆，首轮防御 | 第二轮分成 55、55。母体立即落到 (70,130)，分身从 (105,118) 滑到 (140,106)，较高的分身槽在第二轮继续执行起手脚本。 |
| 47 红史莱姆，首轮投掷蜈蚣卵 | 母体带赤毒，96 体力分为 48、48。次轮结束母体 41、分身 48，分身从无毒槽开始并真正出手。 |
| 84 血云雾，两轮防御后触发 | 同种子第三轮通过概率门，1200 分为 600、600。原队末尾空槽退出阵形，母体槽 1 位于 (140,110)，分身槽 0 滑至 (70,134)，已扫描过的槽 0 到第四轮执行起手。 |
| 123 双红史莱姆，持续防御 | 第二轮实际出现两次分裂尝试，均被存活数挡住。体力保持 110、110，槽位没有新增。 |

旧 Reforge 让分身继承毒、母体在动画末尾才跳到新站位，而且分裂新填入的后序槽少一次当轮扫描。两端都保留了血云雾的尾部空槽。血云雾展开时，旧 Reforge 还实际绘出了 29 帧选招箭头。修后两端分裂期间均为 0 帧，恢复选招时箭头同在 (232,96)。相同原队、场地、种子和真实输入各跑两轮，16 条原生轨迹通过 8 组跨端对照和 8 组同端重复。分身十帧滑动的足点符合原盘布局。两端闲站换帧相位仍有差异，红史莱姆从分裂首帧到恢复选招仍比 Game 长约 52 毫秒。 [原盘站位](../../../../../reference/sdlpal/battle.c#L931-L943) · [待机拍](../../../../../reference/sdlpal/fight.c#L496-L523) · [双端原件、反控与带声分屏](../../../../tasks/evidence/E2E-Q2-1-summon-and-division-20261116.tar.gz)

## 2026-11-16 方丈第九轮再召唤

原盘 `SSS.MKF` 的 32 条 `0x9E` 对应 11 种敌人，已逐条与作者效果、发动者和编队对账。首批实跑智修大师。沿同一玉佛寺原剧情起两战，李逍遥以实际按键防御，用定点普攻击倒召来的黄衣刀僧来获得空位。第九轮原有的 42810 与 42811 仍分别检查空位、入场和收色。第十轮继续防御，观察补进来的敌人真的参加战斗。 [原盘召唤行为](../../../../../reference/sdlpal/script.c#L2870-L2945)

| 第九轮留空槽 | 两次指令的实际结果 | 第九轮实播音效 212 | 第十轮灰衣喇嘛出手 |
| --- | --- | --- | --- |
| 0 | 两次失败 | 0 次 | 无 |
| 1 | 槽 0 入场，第二次失败 | 1 次 | 槽 0 |
| 2 | 槽 0、槽 2 各入场一名满体力 800 的灰衣喇嘛 | 2 次 | 先槽 2，后槽 0 |

旧 Game 把两次入场挤入一帧，旧 Reforge 相隔约 64 毫秒，两边第二声均因重叠未实际启动。两端现以每次独立的 72 步入场溶解、80 毫秒高亮保持和 72 步复色组成，再执行下一条。两孔实跑的指令间隔约 2400 和 2417 毫秒。首次修后还观测到 Game 第二次溶解错误取未复色的旧画面。该次录制保存为反例，修后通过前一名灰衣喇嘛区域 1672 个源像素稳定检查。第九轮的新单位不占旧队列，第十轮从各自槽位正常攻击。最终相同候选覆盖零孔各两轮、一孔与两孔各一轮。 [原盘战斗场景溶解](../../../../../reference/sdlpal/battle.c#L609-L681)

原速带声分屏包含方丈第九轮、红史莱姆、血云雾和菜刀婆婆四章。左声道是 Game，右声道是 Reforge。原盘召唤来源、逐条运行身份、比较结果和合成命令可从同一归档复验。 [召唤和分裂原件及分屏](../../../../tasks/evidence/E2E-Q2-1-summon-and-division-20261116.tar.gz)

## 2026-11-16 菜刀婆婆召唤飞头

从场景 s061 中实体 e1184 的原编队 64 和战场 44 启动独立试打。两端核对有效角色属性与六件装备，用种子 42 连续实际防御两轮。六次战斗抽样逐项相同，第二轮执行原指令 40991，把飞头填入槽 0。菜刀婆婆实绘第 1 帧手势，飞头入场后施法者结束手势并恢复第 0 帧。两端各实际起播 212 一次，召唤演出期间均隐藏指令箭头。 [原编队和战场](../../../../../projects/pal/content/scenes/s061.json) · [原盘指令](../../../../../reference/sdlpal/script.c#L2870-L2947)

飞头原地待机每三拍换帧。旧 Game 复用了空槽的闲站倒计时，提前在复色时换帧。旧 Reforge 用整场时钟选帧，入场时就可能从中间帧开始。新槽现在按自身的初始帧和倒计时，在两段溶解之间推进两拍。修后两端入场、高亮保持和复色均实绘飞头第 0 帧。入场到高亮保持约 1149 至 1150 毫秒，保持到复色约 83 至 84 毫秒。 [原盘待机推进](../../../../../reference/sdlpal/fight.c#L496-L523) · [修前原件、同候选复验和分屏](../../../../tasks/evidence/E2E-Q2-1-summon-and-division-20261116.tar.gz)

## 2026-11-16 敌方召唤逐项验收

原盘 11 种召唤者均已有同原队、场地、种子和实际指令的双端实跑。32 处原盘召唤地址已有 23 处实际触发并对照，包含容量不足的实测分支。覆盖台账保留每个地址的运行候选、原编队、命令和原始回执。多数入口沿用独立试打。跳跳蛙使用两端原场地都为 53 的 s168 入口，s156 的场地差另记。 [逐项原件、可恢复的采集程序与三段带声分屏](../../../../tasks/evidence/E2E-Q2-1-enemy-summoner-roster-20261116.tar.gz)

| 本轮对象 | 双端实测 |
| --- | --- |
| 跳跳蛙、大手、狐狸精 | 跳跳蛙原槽外自召，大手一次召两只扫把。狐狸精在两个脚本地址各实召四只蜜蜂，均核到后续行动。零空槽和仅一空槽时都按原指令拒绝整批召唤，后续攻击继续。 |
| 木灵道士、黑巫师、黑苗祭司 | 木灵在第三、四轮分别补位，先入场的敌人在第四轮出招。黑巫师和黑苗祭司各顺序召两次，实核两声 212、先入场单位在下一次溶解中的姿态和下一轮两个新单位的出手。 |
| 赤鬼王、镇狱明王、拜月教主 | 赤鬼实测三种补位和一孔失败后续夺魂。明王第十六轮在玩家选招前连续召两只巨斧，两只在同轮实际出手，第二十六轮一孔拒双生。拜月三个种子分别召鸟人、青兽人和铁棍魔兵，各有下一轮两个新槽的真实动作。 |

拜月的原脚本 42953 会随机跳转。修前 Game 绕开战斗种子，同一局面复跑可进入不同分支。修后战斗使用同一随机序列，原版单选项无需抽样的行为也保留。 [原盘随机跳转](../../../../../reference/sdlpal/script.c#L3016-L3021)

四蜂的复色使用最后一个染色姿态作为源帧，Reforge 按原盘在普通精灵之上重绘染色召唤物。原队 44 的同一复色源最终 64,000 个像素逐点相同。连续召唤修正先入场单位的待机计数，并固定施法者收势第一拍的姿态。明王首拍通过复验，进入复色时普通闲站仍随两端待机时钟相位偶有一帧差异。该局面的光影时长、实播音效和后续出手都通过双端对照。 [原盘召唤的两个待机拍](../../../../../reference/sdlpal/script.c#L2933-L2947) · [像素回执及反例](../../../../tasks/evidence/E2E-Q2-1-enemy-summoner-roster-20261116.tar.gz)

## 2026-11-16 拜月鬼降的失败卷轴

用户指出拜月召出铁棍魔兵后，Reforge 缺少「失败　没有效果」。原队 313、战场 48、种子 6 和三轮防御指令复现两次鬼降失败，目标依次是阿奴与赵灵儿。修前两端结算均未扣血或附加疯魔。原对照漏验卷轴，新判据据实际绘制拒绝旧 Reforge 的零次显示。

修复作用于敌方仙术的随机门失败。两端在角色归位后各实绘两次卷轴，每次约 1.4 秒。方向键提前关闭另经 Reforge 画面回归验证。新双端原件中 17 次行动与 57 次规则随机抽样逐项一致，随后铁棍魔兵均对李逍遥实绘蓝字 61。相同提示关闭至下一次可见起手，Game 为 318、317 毫秒，Reforge 为 382、336 毫秒。两处实测差为 64、19 毫秒。

生产候选 `d5da81104291894c48bd6b0e606fc22518d55fa9`。两份原始回执和轨迹供离线复算，旧失败原件、局面和采集入口引用上一轮已登记归档。原速双声分屏暂存供验收，左为 Game，右为 Reforge，两次提示和后续命中均在同一条视频内。验收视频的指纹和重录入口记在执行索引。 [双端记录和离线判据](../../../../tasks/evidence/E2E-Q2-1-enemy-spell-failure-20261116.tar.gz) · [原盘分支](../../../../phase1/game-mechanics.md#2026-11-14-敌方施法与六种大毒)

## 2026-11-17 敌方召唤剩余九处

使用同一候选 `a2b300f16408833dc25995b55adf504ed122bb0d`、原编队、场地、种子和真实菜单指令执行五组双端战斗。两端各接受 77 条指令、完成 227 次行动和 780 次规则随机抽样，逐项一致。离线对照同时核召唤前后槽位和体力、成功时的实绘位置和色偏、音效 212 的实际起播、下轮行动与恢复选招。

| 对象 | 补测地址 | 双端实测 |
| --- | --- | --- |
| 菜刀婆婆，原队 64 | 40996、40999 | 第四轮再召一只飞头，第五轮在剩余两槽各召一只开膛鬼。三次召唤各实播一次音效，新槽在下一轮出手。 |
| 大手，原队 175 | 42684、42692 | 种子 3 下第三轮再召两只扫把，四只扫把均在第四轮出手。种子 1 下第二轮自召，新大手第三轮从自己的脚本起点召来两只扫把。 |
| 赤鬼王，原队 27 | 42554 | 实际普攻击倒两只白无常后，第二十一轮各召一只飞头至槽 0 和 2。两只飞头第二十二轮都出手并实绘伤害。 |
| 木灵道士，原队 221 | 42740、42743、42769、42774 | 第三、四轮召入两名黑衣道众。第十一、十二、二十五、二十七轮因三槽满员拒绝补位，四次均无入场和 212 音效。用实际菜单用药续战至第二十九轮选招。 |

十一种召唤者的 32 处原盘召唤指令均有双端实跑记录。木灵道士本轮四个晚段地址覆盖满槽分支，前段两个成功地址核了入场和后续施法。两次探索在第十二、十四轮全灭，保留实际终击、指令与运行身份。正式复跑把药安排在回梦前及醒后使用。

菜刀婆婆首轮 Reforge 的第一段实绘渐变为 1074 毫秒，离线重算仍拒绝该回执。复录该段 Game 为 1167 毫秒、Reforge 为 1136 毫秒。五组成功召唤的入场到高亮阶段，两端时差最大为 31 毫秒。按首个召唤手势对齐后，菜刀婆婆段实际飘字的首个相差约 33 毫秒，末个累计约 368 毫秒。分屏保留这项时序差。

从归档恢复五组原件独立复算均通过，同一判据拒绝首次渐变反例。原速分屏取菜刀婆婆、大手自召和赤鬼王第四次召唤，Game 在左，Reforge 在右，两侧使用各自声轨，待用户视觉确认。 [双端原件、逐项回执与重录入口](../../../../tasks/evidence/E2E-Q2-1-enemy-summon-followup-20261117.tar.gz) · [原盘召唤规则](../../../../../reference/sdlpal/script.c#L2870-L2947)

## 2026-11-17 连续行动的累计节拍

同一菜刀婆婆局面用实绘飘字和调度器读数对照。两端第一次召唤手势对齐后，修前 Reforge 的最后一次飘字累计晚 351 毫秒。第 3 轮按各端实际接受防御为起点，第一击分别为 401、434 毫秒，第二击分别为 1251、1334 毫秒。排队条件显示 Reforge 30 次派发都累计到约 50 毫秒才清空，动画结束也丢掉该帧余量。菜刀婆婆同步起手结束后，其行动还再次排队等待。

普通队列继续按 40 毫秒派发，各个浏览器帧的余量跨相邻动作和动画收尾结转。积压到一整拍时清掉积压，每帧最多派发一个动作。同步起手脚本完成后直接执行该次行动。有演出、对白和恢复等待时沿用各自的计时点。异步起手、需要确认的反馈以及敌方施法恢复会重新起算普通行动节拍。 [原盘同步起手](../../../../../reference/sdlpal/fight.c#L1716-L1725) · [Game 的逐帧余量](../../../../../packages/game/src/shell/main-loop.ts#L123) · [Reforge 行动调度器](../../../../../packages/reforge/src/battle/battle-action-presentation-scheduler.ts)

候选 `b74ce91dda71a1f23494dd96ea8f49c16e29fbbd` 的原速录制双端同局面复跑，六条防御、20 次行动及 59 次抽样一致。菜刀婆婆的八次伤害飘字全部核首个实绘帧。按各轮防御提交对齐，最大时差由 151 降至 18 毫秒；按全段首个召唤手势对齐，末次差由 351 降至 16 毫秒，整段最大差 34 毫秒。旧版原始轨迹仍触发失败判据。判据覆盖每轮提交至命中 40 毫秒的容差，以及全段 80 毫秒的取样容差。

血口虫主动防御的提交至首次实绘伤害为 Game 400.6 毫秒、Reforge 400.8 毫秒。自动格挡从冲锋开始使用防御帧，受击移位期间维持防御，格挡音随命中。拜月两次失败卷轴实绘持续 1400 至 1416 毫秒，关闭到下一个实际起手为 317 至 335 毫秒。双端均命中后续 61 点伤害。617 个 Reforge 战斗单测及类型检查通过。归档只保存诊断、双端关键原件、比较器和重录入口。 [双端复验与旧版反例](../../../../tasks/evidence/E2E-Q2-1-consecutive-action-cadence-20261117.tar.gz)

## 2026-11-17 敌方变身与站位

原盘 `0x9F` 有四条指令。脚本保留当前血量及原敌的脚本游标，旧精灵在旧站位闪色六拍后播放音效 47，再按新形态的纵向偏移重新立位。`PAL_BattleFadeScene` 对两张战场快照作 72 步索引色渐变。 [变身指令](../../../../../reference/sdlpal/script.c#L2954-L2990) · [重载站位](../../../../../reference/sdlpal/battle.c#L918-L948)

原队 217、255、96 同场地、种子 42 的初跑，两端触发了四处地址共十次。Game 的血量、脚本身份和新站位正确，实际绘制却提前切成新精灵并省略了战场渐变。Reforge 闪旧形象，但原先通过精灵遮罩过渡，之后保留旧形态的脚底位置。牡丹精应从 Y110 到 Y134，蛟龙加 22，肥肥与小土鬼往返分别加 5、减 5。

Game 在六拍内使用旧精灵和原脚点，通过既有战场渐变及脚本挂起入口切到新形象。Game V1 的渲染字段为可选，既有存档字段名保持兼容。Reforge 根据新定义重新计算脚点，使用共享的战场快照渐变，固定最后一拍闪色为源画面。新形态的规则状态、实际脚本续走、音画和最终正常选招以同候选的双端记录复验。

候选 `f692f6546188221f8d827346669731bbb71bc851` 三组各跑一次同局面的真实攻击和防御。四条地址触发十次变身，22 条指令、66 次行动和 218 次规则抽样逐项一致。两端都保留已受伤的血量和原脚本游标，按新脚点实绘，并继续到正常选招。原速录像从六拍旧形象闪色跟到整张战场渐变，首个闪色帧到渐变开始的最大双端时间差为 35 毫秒。采样到的渐变窗为 1109 至 1151 毫秒，每次均实播音效 47，距首个渐变采样不超过 25 毫秒。

归档恢复后三个修后局面均通过，同一判据拒绝三个旧版局面。菜刀婆婆的三次召唤及后续行动也通过。Game 1258 项和 Reforge 617 项相关测试与两端类型检查均通过。分屏为三组原队的摘录，覆盖四条变身指令。 [双端轨迹、旧版反例与重录入口](../../../../tasks/evidence/E2E-Q2-1-enemy-transform-20261117.tar.gz)

### 变身的最终像素复核

用户从上一版分屏指出 Reforge 一帧换到终态。上面的首次复验核到了 Reforge 的渐变合成回调，漏检了同帧后续覆盖。试打采集器把素材观察调用插在 `else` 和后续 `if` 之间，后续普通战场绘制成为独立分支，覆盖了刚合成的渐变。旧版凤梨小妖首个渐变步的 12,868 个变化像素中，渐变合成只将 143 个画成终态，完整画帧和录像采集画布却都显示 12,868 个终态像素。观察插入点现位于完整绘制分支之前，两端游戏渲染代码保持原样。

候选 `cc32d9214288e559dab6f0d47293afd438807861` 同编队、同种子重跑三组并保留原有动作和声轨判据。Reforge 十次变身各在 12 个渐变区间核最终画布和录像采集像素，两处都与该步应画出的过渡一致。新分屏显示的七次变身均从成片解码核分段亮度进度，Game 与 Reforge 均通过。旧分屏的右屏七次均被同一判据拒绝。为检验共用链路，梦蛇两端各两轮正常战斗和独立录像的解码颜色复验通过，菜刀婆婆三次召唤的轨迹也通过。 [最终像素、旧版反例与重录入口](../../../../tasks/evidence/E2E-Q2-1-enemy-transform-pixels-20261117.tar.gz)

## 2026-11-17 角色默认合击复验

候选 `22e9bc60473ac401d94ec4f05a24d37407de13f1` 在仙剑原队 116 与原队 115、战场 53、seed 42 验证七个固定局面。两端各实跑一轮，另从同候选各重录一轮，14 组双端对照覆盖首轮的真实提交、入队身法、战斗随机序列、贡献者耗血、伤害、队形和实绘。赵灵儿的默认爆炸沿用先前原件。本轮有赵灵儿的试打按两端相同装备配置仙女剑，防止 Game 继承已有的装备双击状态。 [赵灵儿爆炸复验](#2026-11-13-爆炸与同批法术图层返工) · [本次原件与重录入口](../../../../tasks/evidence/E2E-Q2-1-cooperative-roster-20261117.tar.gz)

| 角色与技能 | 初态与实际结果 |
| --- | --- |
| 李逍遥的合体气功 | 三人每人扣 9 HP，指定血口虫蓝字 105，FIRE 50 的七帧均覆盖在血口虫图层上方。 |
| 林月如的弦月斩 | 三人每人扣 16 HP，指定血口虫蓝字 168。FIRE 10 的末帧继续画在背景，成片解码确认两端留痕。 |
| 巫后的爆炸蛊 | 两人每人扣 49 HP，血口虫受 357 点伤害，先播放死亡声并淡出，随后队伍归位。最后一敌变体从胜利卷轴正常退出，两人各得 14 经验，钱加 9。 |
| 阿奴的天女散花 | 三人每人扣 22 HP，三槽独立抽样得到 124、126、127。FIRE 18 共四轮 48 帧，效果音启动一次。 |
| 盖罗娇的爆炸 | 两人每人扣 10 HP，指定血口虫蓝字 94，确认盖罗娇本人的默认技能入口。 |
| 已提交的行动先于合击 | 李逍遥防御入队身法 330，林月如弦月斩 210。逍遥先进入防御并增加 2 点隐藏防御经验，月如随后聚拢施放。 |

修复采用原盘提交与执行边界。Game 保留队友已提交的动作，Reforge 在有效合击执行时才消费后续队友行动。Reforge 的 29 号起手音由蓄势移到聚拢首拍，正式运行中两端起手与聚拢相差最多 5 毫秒，录制运行的最大差为 26 毫秒。合体气功恢复 FIRE 层偏移 99。Reforge 的数字底锚在受击位移前取，纠正向左的 8 像素偏差。两端在四拍受击后保留五拍，再处理敌方死亡，最后六拍归位。Reforge 沿用用户此前裁定的透明度渐隐。 [合击排队](../../../../../reference/sdlpal/fight.c#L1409-L1424) · [合击起手与收尾](../../../../../reference/sdlpal/fight.c#L3856-L4106) · [死亡渐隐裁定](../../../../phase2/archive/audits/battle-presentation-audit-2026-07-05.md)

旧生产候选按相同装备、编队和输入重跑七局，同一判据给出起手声、层序、数值底锚、队友动作和淡出顺序的反例。成片 37.45 秒，60 帧/秒，左 Game、右 Reforge，声音分到对应声道。解码核合体气功可见像素、弦月斩留痕和击倒最后一敌的中间渐隐帧。用户于 2026-11-17 确认该分屏通过。

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

离线入口先核报告原字节、trace SHA/长度、依赖闭包及当前源码/JSON输入、真实输入回执和对应场景矩阵的新 context，再重算业务、规则和画帧判定。九局面的历史矩阵每端十八个独立 context，本轮正式道具组每端十四个独立 context，默认完整矩阵共三十四个局面。独立试打沿用专用测试快照。

## Results and gaps

以下是 2026-11-07 首版冻结时点的结论。

十二场正式运行、六组跨端比较和六组同端重复全部通过。独立双扣药运行准确失败于合法行动后的库存断言；恢复运行和入口反控恢复均通过。候选、命令、原件指纹及失败身份在机器回执和归档索引内。原件恢复：在仓库根解开归档，保留成员路径；使用记录的候选和同指纹本地原始资源复验。运行候选和贡献者Git对象的恢复bundle均在归档内。

Reforge原报告保留一条预期404提示：现有runner仅将 `/projects/pal/.type-pal/save-state.json` 的缺省状态404归入warnings，其它资源错误仍使运行失败；本批无浏览器errors，未把这一条运行提示称为静态门诊断或资产读取成功。

本轮选高攻、不同速度的简单局面证明入口与比较链有效，不把击杀结果当作伤害公式正确。已保留多人样本的原生差异：巫后340/354、阿奴857/908；Reforge日志保留未截断伤害，屏幕飘字显示有效扣血30。随机调用的分配与显示数字差异仍开放，分别进入后续规则和表现核对，未在本轮改机制。采到音效请求或render调用也不等于音画正确。

## Quality gate

2026-11-16 收尾的完整 fast coverage 为 20,607 项，范围与阈值按受保护基点验收。战内状态页实绘和召唤帧速作者表单的两个新增回归均有实测反控。  [任务卡质量回执](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md#2026-11-16-独立验收与交付边界)

2026-11-11 复验的实际候选、全仓检查和受保护 CI 取任务卡。首版质量回执如下。

贡献者分支由root独立复核，发现的六项入口/证据缺口已整改，最终只读复核无剩余项。22项定向工具测试、四个真实原件入口反控、原生业务反控与恢复原件均保留；全仓静态/测试与受保护CI按 [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md) 的最终回执核。代码治理新增21路径仍pending，未把本批工具验证冒充逐文件专项closed。

[独立入口与导航](README.md) · [E2E合同](../../../e2e/contract.md)

## 2026-11-19 六神丹医馆的第一次可见画面

从正式病中前驱的等价原生存档开始，在医馆 s053 对李大娘 e904 实际使用六神丹 286。两端消耗一份，再经黑幕重组。亮屏第一次实际画出逍遥、月如和灵儿时，镜头为 (1264, 488)，三人脚点为 (1424, 600)、(1440, 608)、(1456, 616)，实际资源帧为 0、3、3。后续站姿为 0、6、3。候选 `cb83b4f76a150915105121482cbef9e4edd58d58` 的双端原录像与成片分别复核首个可见帧到对话的 61 和 54 帧。

用实际黑幕结束定位可见首帧。旧固定取样在 Game 读到黑屏，并在旧 Reforge 读到前一画面。新判据拒绝旧 Reforge 未正确遮住重组的原录像。偏移首帧镜头、漏一名队员及残留旧头像三个反例也分别被拒绝。成片约 57.23 秒，队形、淡入和原声均核过。 [双端原件与原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-clinic-first-visible-20261119.tar.gz)

## 2026-11-19 捕兽夹与芦苇漂的放置提示

捕兽夹 285 和芦苇漂 294 都先走原始 0x84 放置判断。成功时扣一份，指定物体第一帧在正前方绘出。受阻时两者共享 39656–39659 的场景叙述和失败标志。Game 收起用物页，场景上方居中显示「此处无法放置」。约 1.4 秒后自动关闭，也可按键提前关闭，之后直接回到地图并保留库存。旧 Reforge 走菜单短提示并重开用物页，旧比较查到库存和提示正文但遗漏了实际绘制层和退场。 [原版放置判断](../../../../../reference/sdlpal/script.c#L2473) · [Game 提示与返回](../../../../../packages/game/src/core/event-system.ts#L1637)

修复后的放置失败复用世界叙述框，按真实超时或按键结束后退场。捕兽夹在 s048 鹿道 (73, 38) 同一脚点朝左测试可放、朝下测试受阻。旧脚点邻近鹿的触发区，双端原录像记录了不同的移动阶段。新局面从原版可达地形进入，实际绘制轨迹确认鹿在本段验收窗持续在画外。芦苇漂使用 s213 原版可走和前方受阻的合法局面。另有旧 Game 存档残留逍遥固定帧的反例，由实际绘制方向判据拒绝。

候选 `0cf4f7b3f4cc4d8719df96a17b4847486cd00513` 上，双端通过四个原生局面的录像与复算，也分别实跑两个受阻局面的方向键关闭。判据逐项核实际脚点、朝向、道具帧、库存、绘制槽、用物页显隐及地图控制恢复。旧提示原件被绘制层判据和解码帧判据拒绝。原速分屏 9.90 秒，四章共每侧 594 个输出帧，实际提示及左右原声均核过。分屏为归档成员 `build/q2/resume-20261119/world-completion/placement-verified/media/item-placement-original-speed.mp4`，SHA-256 为 `bdc2f6cbcab2bc32abcb28ac947c95fca03fd0ca163f9d7ac04dfbaa65c3b785`。 [双端原件、画面反例与带声分屏](../../../../tasks/evidence/E2E-Q2-1-world-item-placement-20261119.tar.gz)

当前候选归并定时叙述后重新实跑两种受阻情形。旧红底菜单提示和真实卷轴的错位帧均被解码位置判据拒绝，新的画面和输入回执见[战外用物的定时叙述](#2026-11-20-战外用物的定时叙述)。

## 2026-11-19 圣灵珠与五灵珠祭坛

双端用等价的 s241 原生存档恢复李逍遥、赵灵儿、阿奴和六颗珠子。用真实菜单和按键完成 7 次用物、41 步移动及石阶的实际触发。李逍遥在 (100, 43) 面朝右时，圣灵珠显示居中「无任何效果」，约 1.4 秒后自行收起并保留库存。两次移动后同一脚点面朝左，对石碑使用才消耗圣灵珠。石碑 e4280 退场，e4281 显示，五座珠台由状态 0 到 2。 [原版换镜与淡入](../../../../phase1/game-mechanics.md#2026-11-19-圣灵珠的换镜与淡入)

旧 Reforge 的圣灵珠脚本已写入状态和扣除，第二次淡黑后漏了淡入。旧 Game 在待揭幕状态下执行固定镜头 0x7F 时也漏了原版的重绘淡入，整段珠台开启被黑屏遮住。Game 在实际更新镜头后完成待执行的淡入。Reforge 在两个镜头落点各显式淡入。双端复验均先在镜头 (960, 944) 揭示空祭坛，随后实播 260 并渐变出珠台，最后回到地图。

按实际位置放入土、雷、火、水、风，分别写入原始珠台 e4285、e4284、e4283、e4286、e4282 的帧 5、2、1、3、4，每次只消耗对应一份。首四次都留在 s241，最后一颗满足五处条件才切换。Game 的最后一珠随完成后的场景第一次可见，Reforge 也会在原场景淡黑期间绘出该珠。旧 Reforge 切入 s227 时先显示 (96, 32)，才移动队伍。修复将换装放在黑幕内的来源脚本，目标场景先完成队伍、镜头及五座珠台再淡入。修后第一张可见画面已经是 (101, 29)、镜头 (992, 928)，队首实绘 232 号精灵的第 0 帧，五座珠台实绘 4、1、2、5、3。 [求雨入场](../../../../../projects/pal/content/scenes/s227.json)

候选 `cb69dbab0c214eb28f888cc866ae73d0857969fe` 的两端录像逐项复算通过。旧 Game 的空祭坛未亮与旧 Reforge 的 s227 错首帧均被指定判据拒绝。原速带声分屏约 21.05 秒，每侧 1263 个输出帧。成片分别核了空祭坛及求雨入口第一次可见画面，左右声道来自各自原录。分屏为归档成员 `build/q2/resume-20261119/world-completion/beads/media/bead-altar-original-speed.mp4`，SHA-256 为 `e3abe2255290048f7aad273143cc6d694f2335a94fbb26416733118e83fe3e62`。 [原件、反例与分屏](../../../../tasks/evidence/E2E-Q2-1-altar-bead-chain-20261119.tar.gz)

桃花林另有真实双端诊断。两端均保留风灵珠，写回 s186 的入口选择并切到 s180。Game 保持用物处 (158, 54)，旧 Reforge 落到该场景默认 (94, -16)。后续土灵珠均到 s186 的 (108, 32)，两次传送起点受驱雾落点差异影响。修复与两处脚点的实际复验见[桃花林驱雾与传送出口](#2026-11-20-桃花林驱雾与传送出口)。祭坛实用回执按本章的用物入口计数。 [支路原件](../../../../tasks/evidence/E2E-Q2-1-altar-bead-chain-20261119.tar.gz)

## 2026-11-20 桃花林驱雾与传送出口

从同一原生 s178 落点 (158, 54) 和合法的李逍遥、阿奴队伍起跑。一局朝下就地使用，另一局按左、左、上，实际走到 (156, 53) 朝上再用。原盘 `39829` 直接切至 s180，脚点、朝向和队伍轨迹仍沿用。旧 Reforge 两次均跳到默认 (94, -16)，第二局的 s180 原录像也被单独画面判据拒绝。修复以 `loadScene.pos: 'current'` 在读取目标资源前取得脚点和常规跟随状态，目标第一张实绘已经延续来源队形。逐帧核了队长及阿奴的实绘素材、朝向帧、脚点、地图及镜头。两端都显示驱雾两行旁白，保留风灵珠，恢复 035，并写回 s186:e3133 的驱雾后入口。 [原盘](../../../../phase1/game-mechanics.md#2026-11-20-桃花林原地驱雾与传送)

紧接着从各自相同的无雾脚点实际使用土灵珠。两端在原场景消失后于 s186 的 (108, 32) 开始揭示，镜头为 (1056, 1008)，队首与阿奴实绘的世界脚点为 (1216, 1120) 和 (1216, 1119)。旧 Reforge 先以分开的常规队形淡入，音效 45 在淡入后才派发。作者脚本复用传送目的地的聚队、音效选项，修后从首个可见帧起聚队，音效在揭示前派发一次。两端恢复配乐 070，两个道具都保留。

Reforge 统一精灵锚点在两处脚点均有纵向 3 像素差。采录中风声 103 的派发到有 s180 实绘的首帧，Game 约 2 毫秒，Reforge 约 104–108 毫秒。音效 45 到 s186 的第一次可见帧，Game 约 251–252 毫秒，Reforge 约 72–74 毫秒。该批对齐声效顺序与聚队时点，双端实际时差保留在原速分屏和台账。

候选 `07088c58275f9d78acdfcf9562468a2cfe77236e` 的四份原生录像复算通过。成片约 14.03 秒，逐一对照每侧 842 张解码帧。左右原声相关系数均大于 0.999，采样位移为零。两局无雾画面的地形匹配超过 0.999，旧版错落点的对照值为 0.137。分屏归档成员为 `build/q2/resume-20261119/world-completion/peach/media/peach-grove-original-speed.mp4`，SHA-256 为 `363492e186af78c337a20070ca60ee4d8ca56dc9717a0887a0cc89e3be472a2f`。 [原件、反例、实页与分屏](../../../../tasks/evidence/E2E-Q2-1-peach-grove-20261120.tar.gz)

## 2026-11-20 破天锤六次碎像与踏板开路

Game 使用已发布的 007 终档。Reforge 的旧 007 原件虽绑定相同迷宫地图，实际加载时拒绝过期的自动续跑摘要。按两端同一入口 (90, 54) 朝上组装当前 Reforge 原生存档，保留已验的队伍、库存、配乐、迷宫实体位置和初始绘制姿势。筏子的空闲动画由当前版本从入口启动。新浏览器分别通过正常存档入口恢复并回读起始状态。 [前驱业务范围](../../../../tasks/cards/E2E-008-1-fairy-island-maze.md)

两端按同一条路线执行 636 步、41 段、31 趟芦苇漂。在六个实际落点用原生菜单依次砸 e240、e242、e239、e237、e238、e241。六个目标的原画资源 66、实际帧号、像素与脚点逐项一致。每次只隐藏当前目标，观音像保持原状，前五次均保留 1 把锤。第六次显示「第六具石像亦应声而碎」「然而破天锤也断了」，两端解码实帧均为相同位置的两行黄字。随后扣一把并激活 e262，拍到闪烁后实际踩板，进入 s018 的 (89, 25)，通道背景关键区域匹配值为 0.9998。两端从通道继续走到正常可操作的桃花林，终档另开上下文实读。 [原盘触发](../../../../phase1/game-mechanics.md#2026-11-20-破天锤的对象触发)

另从相同入口朝上用锤，前方无石像可砸。两端均显示场景叙述「无任何效果」并保留锤。当时 Game 约 1.38 秒自动收回，Reforge 等到实际确认键才结束。关闭方式的复验见[战外用物的定时叙述](#2026-11-20-战外用物的定时叙述)。六次碎像的原声都辨认出音效 262，开路辨认出 260。以双方按下用物确认前的实时时钟对齐，六击的 Reforge 音效早约 0.34–0.42 秒。原盘 0x81 先改变对象触发方式，Reforge 由用物脚本显式调用石像触发。两端实际时差保留在分屏与原件。

候选 `8d17f003f` 按既有路线和因果判据复算。原速分屏 23.85 秒，每侧 1,431 张解码帧逐张和原录比对，左右原声音轨各自与原录相关系数大于 0.99，采样位移为零。原录的 14 段取景源保留原音画包和时间戳，分屏成员为 `build/q2/resume-20261119/world-completion/hammer-008/media/heaven-breaker-original-speed.mp4`，SHA-256 为 `bdc5e8800d357c93a0563528601d04cae8d3471579d15069eb79a1cb959dac0f`。 [原件、试锤差异与分屏](../../../../tasks/evidence/E2E-Q2-1-heaven-breaker-20261120.tar.gz)

## 2026-11-20 战外用物的定时叙述

原盘的放置失败和「无任何效果」都使用 0x3E 的场景叙述。Game 收起菜单，在 320×200 的地图画布上由 (112, 40) 起画「此处无法放置」的浅底卷轴，由 (120, 40) 起画五字的「无任何效果」。旧 Reforge 放置失败先在菜单上出现红底白字，旧比较只核了文本和库存。修前的试锤实录还显示两种关闭方式都多等了一个确认键。现行 Reforge 让定时场景叙述从实绘起计时，并消费已显示时收到的关闭键。 [原盘卷轴](../../../../../reference/sdlpal/text.c#L1663-L1710) · [前一轮放置受阻原件](#2026-11-19-捕兽夹与芦苇漂的放置提示)

候选 `9bea94e1c89f000d198a136884b5abe5fa864333` 从 11 个等价的原生起点，在真实用物菜单执行 16 件道具的失败分支，每端各 32 次。包括破天锤、圣灵珠与五灵珠、桂花酒、紫金丹、钓竿、六神丹、布包、玉佩、石钥匙、香蕉和凤纹手绢。实绘首帧至恢复普通画面的自动窗口，Game 约 1.38–1.40 秒，Reforge 约 1.40–1.42 秒。另在实际卷轴出现后按方向键提前收起。期间同一脚点、方向和库存保持一致，提示关闭后直接返还地图控制。桂花酒和香蕉两局的动态对象按原脚本待机帧、当前状态和触发设置核验。凤纹手绢使用从商人旁沿合法地形可达的 (118, 58)，首轮会误触商人对话的脚点保留失败回执。工作树另有用户的内容修改，16 件道具的实际失败 cue 已与固定候选逐项比较，正向覆盖仍为 94/98。

捕兽夹、芦苇漂受阻时，双端分别实跑超时和方向键关闭。捕兽夹在鹿道 s048 的 (73, 38)，芦苇漂在 s213 的 (83, -11)，均保留一份，当前放置对象保持隐藏。解码两端原录和交付分屏，从首帧到退场核卷轴边界、绘制期间菜单显隐和地图恢复。位置判据拒绝旧红底菜单提示和上移 24 像素的真实卷轴帧。原速带声分屏约 6.98 秒，含这两个受阻局面及破天锤两种关闭方式，每侧 419 张输出帧，左右原声与各自原录的相关系数均大于 0.999，采样位移为零。分屏归档成员为 `build/q2/resume-20261119/world-completion/notices/media/world-notice-original-speed.mp4`，SHA-256 为 `52b37bd0a636fc6adc2e37290d5dcc272372f82586fb9e25abf470efb79309f8`。 [原件、复算脚本和原速带声分屏](../../../../tasks/evidence/E2E-Q2-1-world-notices-20261120.tar.gz)

## 2026-11-20 四件剧情道具的战外使用

沿 s118、s100、s192、s273 的原盘脚本、实际朝向距离和继承配乐准备等价的同端原生测试档。每局从背包正常选物并由正常用物入口提交一次。剧情确认用实际键盘高亮和确认，进出位置、角色头尾姿势、库存及目标状态各有独立回执。Game 的场景模板曾残留之前剧情的队伍固定帧，按正常走到测试脚点后的站姿重新准备并核两名队员确实朝同一方向。最终候选 `538052a204ccd9794471da1f9f5c9641264f28ea` 两端各跑八局。逐句核实际正文、说话人、头像、槽和布局，共 85 行。 [原盘对象判定](../../../../../reference/sdlpal/script.c#L2390) · [实绘比较与用物原件](../../../../tasks/evidence/E2E-Q2-1-final-world-quest-items-20261120.tar.gz)

| 道具 | 实际入口与结果 |
| --- | --- |
| 情书 287 | s118 (70, -10) 交给阿香，两种回答均取走情书。应允时实际得到一枚玉佩，婉拒时本次空手返场。同场 (68, -5) 给尚书夫人出示时对白正常并保留情书。 |
| 玉佩 288 | s100 (32, 0) 对阿辉出示，库存保留，e1813/e1814 由 (2, 0) 切至 (0, 2)。从同一已验后继状态，在 (32, 13) 实际交回阿德后扣除玉佩。两局的李逍遥、林月如脚点与画帧已核。 |
| 香蕉 291 | s192 (102, 58) 与 (64, 19) 分别给两处猴子。北支逐帧核八次原盘位移及退场。南支主猴实绘三轮 4/3 帧，再由 9 帧推进至 15 帧。三只后出猴子先在世界像素 (768, 640) 站定才迈到 (760, 644)。旧 Reforge 的后两只初见已迈出半格，现行按一个世界拍显式保留初现姿势。 |
| 凤纹手绢 292 | s273 (122, 57) 面向船商交付后扣除。实际到山神庙，再回渡口。剧情收完后在 s273 (119, 57) 朝左恢复控制，配乐 059 延续。 |

凤纹手绢两次切场修前均实际亮出默认落点。首次到山神庙，旧 Reforge 镜头 (864, 912)，实际队首世界脚点 (1024, 1024)。回渡口，旧镜头 (512, 384)，实际队首脚点 (672, 496)。修后到山神庙直接切入镜头 (618, 283)、队首 (752, 376) 朝上。回渡口从黑幕揭示镜头 (784, 1272)、队首 (944, 1384) 朝右。目标入场先提交三名在场演员、队伍和镜头。双端实际首帧均含原盘对应的演员、资源帧和朝向，旧双录的两处错误均被相同位置判据拒绝。把八处原盘 0x09 的等待写回渡口演出。「上船吧」沿用有头像的文字布局及灵月宫主姓名，按此处重绘后的实帧去掉头像。 [场景准备的现行合同](../../../../phase2/guides/scene-entry-authoring.md) · [旧实绘、对白与续跑反例](../../../../tasks/evidence/E2E-Q2-1-final-world-quest-counters-20261120.tar.gz)

渡口较早候选已能正确亮屏，但回场时 e4723 投影了原默认行为 1200 毫秒等待，选择新方案后把旧余量送给了 100 毫秒指令。修复让恢复等待核对当前游标，物品切场接到同一入场收尾。最终双端验证和独立录像均通过，Reforge 额外记录默认方案投影与新方案首次 100 毫秒等待从整段开始。场景、库存和队伍均检查到正常完成。 [自动等待归属](../../../../../packages/reforge/src/main.ts#L4800)

五组双端原生录像供复算，前三件的录像在 `e456183e432eb40e6a801166f1eb6e5544999bbd`，凤纹手绢在最终候选。最终候选统一重跑全部八局。7 章成片约 33.2 秒，每侧 1993 张输出帧逐张对照原录，左右原声分别与各自原录相关系数大于 0.997，采样位移为零。分屏成员为 `build/q2/resume-20261119/remaining-world/media/quest-items-original-speed.mp4`，SHA-256 为 `aac6ceafccfac408ba1b75c91acb8acdf3e0195b62ce87b038d97e9bbc85730e`。原有作者未提交稿按实测文件哈希绑定并留在工作树，收录的是这组作者数据下的执行。战外正向入口累计 98/98。相关源目录运行时回归 82 项、全仓 typecheck、lint 以及作者工程检查通过。钓竿的既有回归仍有实稿 700 与测试期望 800 毫秒的差异，保留原失败。 [原速带声分屏与复算入口](../../../../tasks/evidence/E2E-Q2-1-final-world-quest-items-20261120.tar.gz)

## 2026-11-20 扬州城墙女飞贼

两端从 s086 夜间同一合法格点向右实际走一步，触发 e1629 和原盘 13838。起点保留前序 13627、13628 已显示的两个实体和 13705 的曲 036。原队 29、场地 31、战斗曲 048，逍遥与月如按种子 4 实打。两端首轮防御，随后普攻，第三回合获胜。56 次随机抽样、两次敌方施法及其目标、三次普攻和胜利入账一致，每人经验 1100，钱 3350。继续走原场景追赶，抵达 [58, −12] 后恢复操控，再用真实方向键离开一格。 [原盘战斗与结算](../../../../../reference/sdlpal/script.c#L3299-L3324) · [双端执行索引与原件](../../../../tasks/evidence/E2E-Q2-1-yangzhou-rooftop-20261120.tar.gz)

旧原件定位到触发朝向错误、开场句出现在下槽、夜色未退时抢先出对白，以及女飞贼在末句时仍可见。现把追赶和跳离写进同一条前景剧情。180 毫秒后的原生结算确认原先会被剧情战的 300 毫秒试打门吞掉，现和明雷共用实绘后的结算按键门。林月如过弯曾早到一格，修正新方向起步时的离格记录。重录前还抓到开战首画面位置相差 16×8 像素，修正触发器在停止走姿前先落实这一步的队形。旧触发实跑被同一比较器在 `contactFormation` 拒绝。 [剧情触发](../../../../../packages/reforge/src/main.ts#L5305) · [实绘结算](../../../../../packages/reforge/src/battle/battle-host.ts#L165) · [双端原件](../../../../tasks/evidence/E2E-Q2-1-yangzhou-rooftop-20261120.tar.gz)

冻结候选 `96a2628b06e9dd6f859c7d21496a4cdff2487536` 的 verify 与 capture 各实跑一组双端。首张接触画面核镜头 (1088, 144)，逍遥 (1248, 256)，月如 (1216, 240)，女飞贼和另一名在场实体核 Sprite 与动作帧。返场首画面仍在夜色下，昼夜渐变完成后才实绘对白。比较三页的实绘正文、说话人、头像和槽位，复算 21 个追逐状态、七次起跳像素位移与 14 个队形站位和步态。音效 045 实际启播一次，林月如开口前女飞贼已退场。 [比较器](../../../../../scripts/e2e/boss-entrances/compare.mjs) · [执行及反例](../../../../tasks/evidence/E2E-Q2-1-yangzhou-rooftop-20261120.tar.gz)

两端以同一接触锚点合成 23.93 秒原速分屏。每侧 1436 张成片对照各自原录，左右原声相关系数分别为 0.9947 和 0.9942，采样位移均为零。两侧在实际恢复走动后再录至少 0.5 秒。当前待用户视觉验收。 [分屏 SHA 与复算命令](../../../../tasks/evidence/E2E-Q2-1-yangzhou-rooftop-20261120.tar.gz)

相邻的 s093 必败在相同候选上两端各自跑完。该套离线比较按固定提交核全部申报输入，拒绝了现有作者稿 `items.json`。原生执行和来源拒绝均留证。 [回归原件](../../../../tasks/evidence/E2E-Q2-1-yangzhou-rooftop-20261120.tar.gz)

归档 102 个成员，SHA-256 为 `c5bd4ed662b637018ad6e00f3a1fa47f8d8de94c53e57e0274f8ad0e08ab52f1`。从归档重新计算双端轨迹和分屏音画后，清理四份临时原录及旧分屏，共 75,246,405 字节。新增归档 42,278,399 字节，净减少 32,968,006 字节。 [归档原件](../../../../tasks/evidence/E2E-Q2-1-yangzhou-rooftop-20261120.tar.gz)

## 2026-11-20 苏州城外林月如

从 e395 已换到 e397 的等价原生存档恢复。李逍遥和赵灵儿从 (89, 36) 朝右实际走一格，触发 s021/e397 与原盘 5721。原队 21、场地 7、配乐 037。种子 4 的首轮双人防御，林月如两次实放 360，各命中一名队员，分别伤害 13 和 20。第二轮李逍遥普攻获胜。双端 29 次随机抽样、实绘 Boss 出手及起播音一致，两名队员各获经验 200，队伍得钱 500。原盘败北入口 6186 及其作者指向已核读。此处实跑使用胜利分支。 [原生执行与反例](../../../../tasks/evidence/E2E-Q2-1-lin-yueru-outside-20261120.tar.gz)

旧 Reforge 把战斗开场写成九条无头像的逐行文本，进战前还吞了月如一步。现按原盘 41368–41384 组织五页上下槽对白，入战前六个实际脚点逐帧可见。战斗内外共核 31 页正文、标题、头像和槽位。返场第一张画面的镜头为 (768, 912)，逍遥脚点为 (928, 1024)，灵儿为 (912, 1032)。被绑月如 e403 的资源 229 第 4 帧已在首次呈现时就位。旧实录显示第 0 帧。Game 约一拍后出现返场首句，Reforge 在该次返场绘制中开始首句。 [城外脚本](../../../../../projects/pal/content/scenes/s021.json) · [战斗对白](../../../../../projects/pal/content/enemies.json)

银花与长贵从旧版的四次位移恢复为前景同拍离场，沿原盘 5779–5784 和 5809–5814 的四步缓走、十二步快走编排。双端都提交第 16 步，Game 在这一拍隐藏，Reforge 实绘该步后隐藏。旧存档引用的行为定义继续可解析。回场写入 e404 的状态 1 并可实际朝上离开一格。修前原件被月如进战步态、捆绑姿势、两名退场演员位移、末点和节拍判据拒绝。 [场景实绘比较](../../../../../scripts/e2e/boss-entrances/yueru-outside-presentation.mjs) · [原件与反例](../../../../tasks/evidence/E2E-Q2-1-lin-yueru-outside-20261120.tar.gz)

冻结候选 `6a40e2db952bf8ebb3516e0b5fb6a183767d643b` 两端分别执行 verify 和 capture。原速分屏约 107.78 秒。每侧 6467 张成片已与原录对照，左右原声与各自原录的相关系数均大于 0.99654，采样位移为零。分屏 SHA-256 为 `ad63c1c6d4cc6fa89e974f081ab64d7ad6582c43c98e78379af67afcc207442f`。归档保留可重建的原录、复算命令与输出索引，验收分屏仍供用户回看。回读验证后清理自有临时录像 129,708,903 字节，新增归档 96,227,541 字节，证据与临时材料的净变化为 -33,481,362 字节。 [归档原件](../../../../tasks/evidence/E2E-Q2-1-lin-yueru-outside-20261120.tar.gz)

## 2026-11-20 林家擂台同一入口诊断

两端从共同可达的 (85, 12) 朝上走入 (85, 11) 触发 s032/e550 和原盘 8023。原队 24、场地 52，逍遥实战独斗。两次 356、25 次随机抽样和胜利入账相等。回擂台时 Game 镜头在 (944, 584)，Reforge 在 (928, 576)。原盘 41410 的 038 已由 Reforge 起播，Game 仅起播 014。随后两端 s034 第一张可见画面的镜头均为 (1072, 1128)，队首均在 (1232, 1240)。Game 此时已启播 074，Reforge 当时仍静音。擂台入口继续返工。 [同局日志和各阶段差异](../../../../tasks/evidence/E2E-Q2-1-lin-yueru-outside-20261120.tar.gz)

## 2026-11-20 林家擂台与返场

沿[同一入口](#2026-11-20-林家擂台同一入口诊断)从 (85, 12) 朝上走一格。双端在实战中从独斗的李逍遥防御开始，林月如两次施放 356，分别打出 13、20 点，下一轮实际普攻取胜。25 次随机抽样、8 次实际起播的战斗音效与胜利入账一致。

移入前景的月如走位逐步核到 4、10、11 次实际位移，双端对应每步的脚点、朝向、资源帧与镜头都对齐。旧 Reforge 少走一步，另一次候选虽已走完整，最后一段却以约 17 毫秒一步播出，实际原件被现行节拍判据拒绝。最终录像里末段 Game 每步约 99–101 毫秒，Reforge 约 112–137 毫秒，包含前景步进和镜头提交的浏览器调度。旧自动行为的定义供已有行为引用解析，这四段一次性走位由擂台前景脚本执行。 [擂台脚本](../../../../../projects/pal/content/scenes/s032.json) · [原盘镜头与配乐](../../../../phase1/game-mechanics.md#2026-11-20-林家擂台的镜头与战斗配乐)

战中逐页核了六页实绘、四种头像和上下槽共现。014 于最后一页前停止，Game 走现行 Win95 MIDI 即停，Reforge 已在同一剧情点开始原盘参数的 3 秒淡出。收起末句后实际播 213，录制的换曲间隔分别为 1605 和 1637 毫秒，随后 038 起播。回擂台首个实绘镜头为 (928, 576)，队首、月如、林天南分别在 (1104, 696)、(1068, 678)、(1024, 688)。切到 s034 时先准备 074，首个可见画面两端均在镜头 (1072, 1128)、队首 (1232, 1240)。Game 切场初期记录的旧坐标处于黑幕，采样一次并对原录像整帧解码。 [离线逐帧判据](../../../../../scripts/e2e/boss-entrances/compare.mjs) · [林家入场](../../../../../projects/pal/content/scenes/s034.json)

候选 `5fc5c2b1b38c1cebf795e13db34ae23a30d19ec2` 两端分别通过 verify 和 capture。原速带声分屏约 187.78 秒，每侧 11,267 张解码帧核对原录。左右原声相关系数分别为 0.99766、0.99574，采样位移均为零。分屏 SHA-256 为 `54bc591eb10f9f39cf579d9509e313bd5285790373d8ce774d6f1004e92a5a51`。第 1 卷的复算索引列出两端原录的卷号、顺序、区间和恢复哈希。三卷按成员回读，并逐段复算完整原录 SHA-256。留存同一分屏，清理 10 份已归档原录或可重建的单侧转码及取帧。新增归档 226,106,751 字节，移除 367,130,760 字节，净变化 -141,024,009 字节。Game 和 Reforge 的 531 项相关定向回归通过。另行核了全量内容对照的 59 项失败，把本次三个数据文件投影到固定前驱后仍是相同的 59 项。 [原件第 1 卷](../../../../tasks/evidence/E2E-Q2-1-lin-family-ring-20261120-part1.tar.gz) · [原件第 2 卷](../../../../tasks/evidence/E2E-Q2-1-lin-family-ring-20261120-part2.tar.gz) · [原件第 3 卷](../../../../tasks/evidence/E2E-Q2-1-lin-family-ring-20261120-part3.tar.gz)

## 2026-11-20 余杭客栈苗人头领

按水月宫 e349 的原盘前置装配合法存档，固定李逍遥、赵灵儿和种子 4。双端从 s004 的 (95, 16) 朝上实际触发 e94，落到客栈 (137, 71)，再向上走三格触发 s003/e59。原盘 2721 使用原队 19、场地 24 和战曲 038。两端首轮防御，随后通过正常指令及目标菜单普攻取胜。12 次实际行动、70 次随机抽样、18 个实际起播的战斗音效和胜利结算一致，两名队员各得 162 经验并入账 336 文。 [原盘入口与战中脚本](../../../../phase1/game-mechanics.md#2026-11-20-余杭客栈的苗人伏击)

旧采集在 Game 淡出仍保留来源场景时，把旧像素记给了目标场景。Reforge 的采集按姿态去重，亮屏过程与上一张黑帧共用姿态时会错过第一张可见画面。采集现在绑定 Game 的世界绘制完成点，并在入场直到首张非黑画面前检查最终画布。用同样的路线重录旧内容后，Reforge 首帧实际把苗人头领 e59 画在 (1136, 1624)，朝右，e61 朝上。修改后入场准备一次性提交站姿，双端实际首帧队首 (1056, 1664)、镜头 (896, 1552) 和三名苗人的脚点、朝向、绘制矩形及精灵帧数据相符。 [入场指令](../../../../../projects/pal/content/scenes/s003.json) · [前置编排](../../../../../projects/pal/content/scenes/s020.json)

旧战中对白把 48 行逐条画在无头像槽。修复后核实际绘出的 20 页、头像、上下槽和各次清槽。仅修正文数据的中间实跑仍在第 11 页接第 12 页时整帧丢失应保留的上槽。战斗渲染改按槽的可见性绘制后，转换时持续绘出应保留的槽，直到脚本明确清除。双端胜利后转播 030，首张可见返场各核到李逍遥在 (1152, 1696)，镜头在 (992, 1584)，e59、e68、e56 实绘相符。原录尾段李大娘前七步的脚点、朝向和帧号相符，每步约 100 毫秒。 [战斗绘制入口](../../../../../packages/reforge/src/battle/battle-session.ts) · [逐页和首帧判据](../../../../../scripts/e2e/boss-entrances/compare.mjs)

进门后两名随从的追击步幅留有区别。Game 按世界拍以 8 像素横移，Reforge 脚本追击的一次提交横移 16 像素。两端在同一脚点触发 e59。首张返场实绘是本次剧情 Boss 的终点，随后录像保留短尾。李大娘下一段对白起步的旧等待差异在原始轨迹中可见，后续剧情由分片验收。

候选 `7a89aa6cd7c4a16883cd653c6aa01019e8f3657d` 的 verify 与录制两轮均双端通过。分屏约 90.93 秒，左 Game、右 Reforge，每侧核对 5,456 张解码帧，声道与各自的原录相关系数均高于 0.994 且采样位移为零。分屏归档路径为 `build/q2/resume-20261120/inn-leader/release/inn-leader-original-speed.mp4`，SHA-256 为 `abfadda35f6a20a94b16491b36628762dd71da652e37a0efc1d4b3b5dc661ca8`。对照原件、三次差异、分屏和原录恢复索引均已回读哈希。三卷共新增 104,985,552 字节，已清理 14 个可恢复或可重建的文件，释放 121,903,272 字节，净少 16,917,720 字节。 [原速分屏和执行索引](../../../../tasks/evidence/E2E-Q2-1-inn-miao-leader-20261120.tar.gz) · [Game 原录卷](../../../../tasks/evidence/E2E-Q2-1-inn-miao-leader-20261120-originals-1.tar.gz) · [Reforge 原录卷](../../../../tasks/evidence/E2E-Q2-1-inn-miao-leader-20261120-originals-2.tar.gz)

全仓 lint、typecheck、作者工程检查、478 项 E2E 工具测试和 36 项出版工具测试通过。相邻的 91 项运行时测试有 90 项通过，队友阵亡旁白的一项在固定前驱也于同一行报相同的布尔值差异，两个执行原件均入归档。

## 2026-11-20 余杭客栈两名苗人随从

从与苗人头领同一前驱的两端原生存档，在 s004 (95, 16) 朝上触发 e94 进入客栈。北绕从 (137, 71) 向左三格、向上八格、朝右两格，双端实际在 (136, 63) 由 e60 起战。向右三格则在 (140, 71) 由 e61 起战。输入回执核每格提交和真实触发者。两者共用原盘 2719，实际使用原队 19、战场 24、曲 038。两局各核到 20 页战中对白、12 次行动、70 次随机抽样、18 个战斗音效，胜利后每人经验 162、钱 336，续播 030 并核脚本移位后第一张可见画面。 [原盘入口](../../../../phase1/game-mechanics.md#2026-11-20-余杭客栈的苗人伏击)

同一右路的旧原件中，Game 的两名随从在前两步各横移 8、纵移 4 像素，Reforge 只实绘一步横移 16、纵移 8。比较器读首张实绘的位置及步态，两项旧错误均被拒绝。客栈持续追逐改用每个世界拍半格的脚本选项，移除额外等待和横向滑步，受阻时由碰撞裁定。北绕完整轨迹保留。e60 受 e59 脚点阻挡时，Game 会按旧碰撞格回弹，Reforge 在受阻脚点等到可走再追。用实绘脚点还原运动规划，移除 e59 的阻挡体作为反例时同一步立刻可走。Game 另有两次从左侧走到 (134, 66) 后停步的实跑。同一轴差为零时原算法随机选方向，两次分别由 e61 与 e60 起战。两次都留证。 [半格步幅与接触判据](../../../../../scripts/e2e/boss-entrances/compare.mjs) · [原盘追逐与碰撞](../../../../../reference/sdlpal/script.c#L331-L484)

冻结候选 `92bbb86d3aa25b830e7a335186a4531e206464eb` 两端各执行 verify 和 capture，两局分别通过比较。两份分屏依实际进门锚点对齐，保留各端原速。返场后继续核李大娘前七步、镜头和在场人员。左右声道独立复算了与各自原录的相关性及采样对齐。

| 起战 | 原速时长 | 每侧解码帧 | 分屏 SHA-256 |
| --- | --- | --- | --- |
| e60 | 92.16 秒 | 5530 | `13fce7d2b2f76cddf4cb26453e4def5293c11b8254b29fa54840d6195d55befc` |
| e61 | 91.18 秒 | 5471 | `90a6820c4118d52f5d17226abe5c05586bd4bc615b32f2cd6e77eb139a37b39f` |

[双端实测、原速带声分屏与复算索引](../../../../tasks/evidence/E2E-Q2-1-inn-miao-escorts-20261120.tar.gz) · [e60 原录](../../../../tasks/evidence/E2E-Q2-1-inn-miao-escorts-20261120-inn-e60-originals.tar.gz) · [e61 原录](../../../../tasks/evidence/E2E-Q2-1-inn-miao-escorts-20261120-inn-e61-originals.tar.gz)

全仓 lint、typecheck、作者工程检查、122 项定向运行时测试和 478 项 E2E 工具测试通过。归档逐个成员解压验哈希。保留原速分屏供复核，清理 8 个有恢复来源或可重建的临时文件，释放 213,536,912 字节。新增归档 189,228,820 字节，合计净变化 -24,308,092 字节。

## 2026-11-20 将军冢鬼将军与血池赤鬼王

两端从原生独立存档开始，李逍遥、赵灵儿、林月如在队，灵儿佩戴玉佛珠。碰撞图还原了将军冢和血池作者入口到存档格的通路，两局随后各用一次真实方向键步行触发。将军冢 s065/e1302 落在 (35, 3) 后经 12162 起战，原队 26、战场 21、曲 045。血池 s059/e1048 落在 (34, -18) 后经 12407 起战，原队 27、战场 22、曲 044。两局使用种子 4，记录实际操作、音效、随机分配及结算。

鬼将军逐帧核了棺椁 0 到 6 的实绘、脚点和精灵像素，修正 Reforge 约 80 毫秒的旧开合步后，双端每步约 200 毫秒。胜利实际增加每人 660 经验、金钱 1253。Reforge 把换装放在源场黑幕下，目标入口在揭幕前完成定位、队伍和朝向。两端实绘的 s066 第一个可见帧均为队首 (480, 288)、镜头 (320, 176)。实际队伍改为李逍遥单人，使用精灵 232 的朝下站帧。画面上的三人由场景对象 e1336、e1337、e1338 实绘。比较器拒绝旧替身朝向和未执行的转身，把三人的一次性回望写入前景时间线后，核了首帧和每人四次转向的站位、精灵像素及实绘节拍。曲 026 实际送入音频输出。捕获止于后续影片之前。

鬼将军返场时 Game 首帧已震屏，Reforge 在首个正常世界拍开始，实测相对揭幕晚约 66 毫秒。两侧之后均按约 100 毫秒换向。比较按 2350 毫秒返场窗口判定场景对象，留存的原生轨迹还包含视频结束后异步收尾期间的事件。

赤鬼王登场改成前景一次性演出。双端核到六张升起帧，距首张画面 2196、2226 毫秒时小石头开口，比较器核对称呼、肖像、对白槽及正文。原队同时实际召出两名随从，占槽 0、2，两者都实际出手。实领每人 968 经验、金钱 1764 和一颗土灵珠。Game、Reforge 的奖励提示分别实绘 1400、1431 毫秒。退出返场对白后，实际向右走一步。

旧画布原件中 Game 在同一渐变步内换向，并在结束后继续震屏。Reforge 先施加震屏，渐变输出又覆盖了这段位移。首次修复的原件还显示 Reforge 把未渐变的快照计作第一拍，导致余下各拍反相，末拍消失。最终两端逐步验证 72 个输出，分别耗时 4333、4311 毫秒，按原盘交替上下位移 4 像素，逐步核了外沿黑边，结束后保持稳定。一次 Reforge 捕获的开口延迟约 114 毫秒，超过本例的实绘时序判据，原始绘制记录另留在执行索引。 [原盘演出机制](../../../../phase1/game-mechanics.md#2026-11-20-将军冢与血池的起战和返场)

预览实帧时另发现 Reforge 的渐变保留已退场的奖励条，旧录像的首张渐变在面板内仍有 808 个浅色像素。依 12415 补足清框重绘的 60 毫秒，两端新画布直接核清框后的渐变快照。此前两端世界脚点与镜头相同，Reforge 在载入存档时却丢了 12186 的渲染层 6。该层接入现行存档，回归从正常作者命令、F5、新场景与 F9 核实写入、清零和恢复；两端的新实绘轨迹也核对队伍层。

鬼将军冻结在 `0028ef056fbb88e86f6c780b63d5b1e734632ddc`，赤鬼王冻结在 `be09d5d4b73b838df84939ccdc0c5f2032fed781`。每场 Game 与 Reforge 均有 verify 和独立 capture 通过离线比较。分屏按实际接触对齐，速度保持 1 倍。左为 Game，右为 Reforge，音频对应各自声道。核每帧与原录的像素误差及原声相关性。

| 入口 | 原速时长 | 每侧解码帧 | 分屏 SHA-256 |
| --- | --- | --- | --- |
| 鬼将军 | 28.96 秒 | 1738 | `b07499547fa4e94d899fc5a84cbfdae9ff8e1665b51423940c3d37901409471b` |
| 赤鬼王 | 89.71 秒 | 5383 | `956c5df39b205e9f3499c6c545a46886fb2f34decbefd51155d2d0e9fe6a0417` |

[双端实测、原速带声分屏与复算索引](../../../../tasks/evidence/E2E-Q2-1-tomb-bosses-20261120.tar.gz) · [鬼将军原录](../../../../tasks/evidence/E2E-Q2-1-tomb-bosses-20261120-ghost-general-originals.tar.gz) · [赤鬼王 Game原录](../../../../tasks/evidence/E2E-Q2-1-tomb-bosses-20261120-red-ghost-game-original.tar.gz) · [赤鬼王 Reforge原录](../../../../tasks/evidence/E2E-Q2-1-tomb-bosses-20261120-red-ghost-reforge-original.tar.gz)

全仓 lint、typecheck、作者工程检查、449 项定向运行时测试和 478 项 E2E 工具测试通过。归档逐成员解压核哈希。保留分屏供复核，清理 8 个可恢复或重建的临时文件、357,489,506 字节。新归档合计 257,204,649 字节，净变化 -100,284,857 字节。
