# Feature Status · type-pal

> 引擎功能实现状态。**权威功能索引** —— 任何"完成度"表述以本文件为准,README 不写百分比。
> **职责**:本表 owns 玩家可感知功能(A-M 章)的实现状态。逐 opcode 明细 → [opcode-status](opcode-status.md)(E 章只留框架级 + 指针);逐 chunk 提取明细 → [resource-status](resource-status.md)(K 章只留框架级 + 指针)。
> **三表**:feature-status(引擎功能,本表)· [opcode-status](opcode-status.md)(事件 / opcode)· [resource-status](resource-status.md)(资源提取)
> **图例**:✅ done(verified=user 拍板 / claimed=Claude 自认)· ⚠️ partial · ⬜ todo · N/A。详见下方状态定义。
> **最后更新**:2026-05-30 — 全表对照 commit 大刷新(⬜ todo → ✅ 多章)+ E/K 章收敛为指针 + 新增 M 运行时架构章。
> 状态由 user 逐条 sdlpal 源核对后拍板,Claude 不自判。

## 状态定义

- **✅ verified**:Claude port 自认 1:1,**且** user 已逐行核对 sdlpal 源 + 拍板通过。
- **✅ claimed**:Claude port 自认 1:1,**但** user 尚未核对。带行号引用 sdlpal 待 user 拍。
- **⚠️ partial**:Claude 自知 / user 实测发现简版 / 缺真值 / 未完整 port。带具体差异说明。
- **⬜ todo**:未做。
- **N/A**:by design 不 port(浏览器 canvas / Web Audio 替代 SDL/audio,DOS 兼容代码,纯开发工具等)。

## 测试列定义(2026-05-29 user 要求加)

- **✅ unit**:有 unit test 覆盖核心数据 / 状态机 / 公式
- **✅ regress**:有专门防回归测试(user 反馈过的 bug 都有 unit case 钉死)
- **✅ partial**:部分有(eg 数据 state machine ✅ 但渲染层 ⬜;或单 case 但不全)
- **⬜ todo**:无测试
- **N/A**:不需要(by design 不 port / 渲染层难单测)

## audit 进度

- **2026-05-30 全表对照 commit 大刷新**(9-agent workflow audit,逐行核对 ts 源 + git log):
  - 表上次实质更新 2026-05-29,此后 ~40 commit 落地,A/C/E/G/I/K 多章严重过期。
  - 大批 `⬜ todo` → `✅ claimed`(基于已 ship commit + file:line 证据):A1/A2/A3 开场、I1/I3 结局、C9 商店、G7/G10/G11 特效、E 类多 opcode、K4 WORD.DAT 修复。
  - E 章重构:收敛为框架/架构级条目,逐 opcode 状态改由 [opcode-status.md](opcode-status.md) 单一维护(根治两表漂移)。
  - 新增 **M. 运行时架构 / 工具** 章 + B/C/G/K 缺失行(follower / camera / ConfirmMenu / 特效栈 / 音频资源提取等)。
  - **所有刷新状态一律 `claimed`/`partial`,不升 `verified`** — user 逐条核对仍 **0 verified**,本次只是把"已 ship 但表里标 todo"的漂移修正成"Claude 自认完成、待 user 核"。
- 菜单补完进度:**C5 ✅ + C7 ✅ + C8 ✅ + C9 ✅**(EquipItemMenu / InGameMagicMenu / Save-Load / 商店 全栈接入)
- L 段(特殊物品 / 剧情系统):真值已查清 = 战斗 E 类 opcode chain,gate 在战斗 opcode 未做(详见 L 章)

## 已知 follow-up

- mutatePlayerStat FIELD_MAP row index 偏移 -1 bug(event-system.ts,2026-05-28 C5 audit 发现):
  - sdlpal global.h 真值 5=Unknown1 / 6=Level / 17=AttackStrength
  - ts mutatePlayerStat 用 5=Level / 16=AttackStrength(全错位 -1)
  - 影响:opcode 0x19 (IncreasePlayerAttr) / 0x1A (SetPlayerStat) 大世界 trigger script 真值错
  - 修复策略:统一改成 sdlpal 真值 row(见 [equip-effect.ts `PLAYERROLES_ROW`](../packages/game/src/core/equip-effect.ts))
  - 优先级:中(实测可能没被触发,但 audit 时已发现就该修)

> 本表初版来自 [2026-05-28 chat 全功能清单](plans/2026-05-28-feature-audit-and-replanning.md);
> 状态变更走 plan Phase A/B audit 模板,commit message 引 sdlpal 行号。

---

## A. 启动 / 引导

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| A1 | Trademark Logo | ✅ claimed | ✅ partial | main.c:197-203 `PAL_TrademarkScreen` | shell/trademark-fallback.ts + bootstrap.ts | WIN95 build 播 1.mp4;DOS build `playTrademarkFallback`(palette chunk3 + RNGPlay(6,0,-1,25) + UTIL_Delay(1000) + FadeOut(1))。trademark-fallback.test.ts;commit b466d5f。dev `?skip-intro` 跳过 |
| A2 | Splash 屏 | ✅ claimed | ✅ partial | main.c:206-456 `PAL_SplashScreen` | shell/splash-fallback.ts + bootstrap.ts | DOS 卷轴(上/下半 FBP chunk3/4 滚动 + 9 仙鹤 MGO73 帧动画 + 标题 RLE MGO71 渐显 + palette 0→100% 15s + Menu/Search 快进);WIN95 播 2.mp4。splash-fallback.test.ts;commit b466d5f |
| A3 | 开场 AVI | ✅ claimed | ✅ partial | uigame.c:162 `PAL_PlayAVI("3.avi")` | shell/avi-player.ts + bootstrap.ts playOpeningAvi | by design 离线 ffmpeg→mp4(非 runtime port aviplay.c);1-6.mp4 全提取(data/extracted/videos/)。OpeningMenu 新游戏 → 播 3.mp4 `<video>` 全屏 + 跳过键;DOS build 无 3.avi 直接 return。avi-player.test.ts |
| A4 | OpeningMenu(新游戏/读档) | ⚠️ partial | ✅ partial | uigame.c:83 `PAL_OpeningMenu` | core/menu/opening-menu.ts | 数据 state machine(opening-menu.test.ts),box 坐标 + 9-slice 真值未严格对齐 |
| A5 | win95/dos 双版启动路由 | ✅ claimed | ✅ partial | main.c:545-546 流程 + `gConfig.fIsWIN95` | shell/bootstrap.ts buildFlag + showTrademarkAndSplash | `?build=win95`(默认)走 mp4 1/2/3/4/5/6;`?build=dos` 走 RNG/卷轴/FBP fallback 真做。sdlpal `fIsWIN95` runtime 检测,本项目用 URL flag 替代 |

## B. 大世界探索

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| B1 | 玩家走路 4 方向 + 步频动画 | ✅ claimed | ✅ partial | scene.c:636 `PAL_UpdatePartyGestures` | core/scene-system.ts + present.ts | scene-system.test.ts;真值循环动画 priority 可能偏差 |
| B2 | NPC 跟随队伍 trail | ✅ claimed | ✅ partial | scene.c:779 `PAL_UpdateParty` | core/event-system.ts partyWalkTo + present.ts | event-system.test.ts trail;进场景 0x46 setPartyPos 预填 rgTrail[0..4](commit f159e32);多 NPC 完整 trail 时序未完整测 |
| B3 | NPC 自动行走 autoScript | ⚠️ partial | ⬜ todo | script.c:3482 `PAL_RunAutoScript` | core/event-system.ts:885 tickAutoScripts | 见 E3(已搬到 event-system);0x00/0x01/0x02/0x03 控制流全 port + goto 同帧续跑(commit eaaa1d5 修张四划船);1 op/tick 本就是 sdlpal 真值。残少数 wScriptOnAnimate 态 |
| B4 | 场景切换 door / trigger zone | ✅ claimed | ✅ partial | play.c:81-166 fTrigger 段 | core/scene-system.ts updateEventObjectsAndTrigger | mode-dependent Manhattan threshold;多处转场黑屏根因已修(9791497 失败兜底解冻 / 9293dac onEnter cutscene 门控)。见 M3 |
| B5 | 调查 Confirm 键 PAL_Search | ✅ claimed | ✅ partial | play.c:362-510 `PAL_Search` + `PAL_GetSearchTriggerRange` | core/scene-system.ts | scene-system-search.test.ts |
| B6 | NPC 对话触发 runScript | ✅ claimed | ✅ partial | text.c:1208 `PAL_StartDialog` 全套 | core/event-system.ts runScript + dialog 状态机 | event-system / dialog-box test;trigger 脚本推进持久化(b479cab 修李大娘重播);详见 C13 |
| B7 | 明雷怪 visible enemy | ✅ claimed | ⬜ todo | script.c:309-501 `PAL_MonsterChasePlayer` + play.c:107-165 接触触发 | core/scene-system.ts contact + core/event-system.ts:4035 monsterChasePlayer | 0x4C MonsterChasePlayer 已 1:1 port(菱形回弹 / 4 向避障 / 驱魔香原地打转,经 autoScript 每帧驱动)+ 接触触发;明雷怪追玩家完整。commit ab56445 |
| B8 | tilemap 遮挡 cover tile | ✅ claimed | ⬜ todo | scene.c:77-180 `PAL_CalcCoverTiles` | present/draw-tilemap.ts addCoverTileEntries | 5×5 scan + iTileHeight bit;队员 + 0x98 follower 都接入 |
| B9 | tilemap 阻挡 block bit | ✅ claimed | ✅ partial | scene.c:512-635 `PAL_CheckObstacle*` | core/scene-system.ts isWalkable | scene-system test;菱形四分 + bit 13 + sState>=2 NPC range + 明雷怪不阻挡走路 |
| B10 | 295 个 scene 资源加载 | ✅ claimed | ⬜ todo | res.c:191 `PAL_LoadResources` | assets/loader.ts | loader.test.ts;无 295 scene 全 fixture |
| B11 | 0x98 额外跟随者视觉渲染 | ✅ claimed | ✅ unit | scene.c:210-226/732-771 + res.c:335-348(sprite=operand 直当 MGO chunk,非 role 表) | present/follower-render.ts computeFollowerRenderItems + present.ts | 临时同行 NPC(scene 102 书生 chunk 82/83)渲染:trail[3+k] 后槽 + 恒 3 帧步 + iStepFrameFollower[0,2,0,1]。跨场景持久(数据 / sprite / trail 三条腿)。follower-render.test.ts 6 用例;commit 5ef46c1 / 8df9777 |
| B12 | camera / viewport 移动 0x7F | ⚠️ partial | ⬜ todo | script.c:706-714 `PAL_SetViewport` / centerCameraOnParty | core/event-system.ts:2593 OP_SET_CAMERA | (0,0)→centerCameraOnParty ✅ / flag=0xFFFF 绝对设 ✅;"相对动画平滑移镜"分支仍 no-op(event-system.ts:2606)|

## C. UI / 菜单系统(2026-05-29 全测试强化)

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| C1 | ESC 主菜单 InGameMenu | ⚠️ partial | ✅ regress | uigame.c:944 `PAL_InGameMenu` | core/menu/in-game-menu.ts | in-game-menu.test.ts;残:label hardcode(IN_GAME_LABELS)而非 PAL_GetWord lookup,WORD.DAT 链断(全菜单通病) |
| C2 | 系统菜单 SystemMenu | ⚠️ partial | ✅ regress | uigame.c:516 `PAL_SystemMenu` | core/menu/in-game-menu.ts SystemMenuState | in-game-menu.test.ts:5 choice + cursor 记忆;残:Quit(menu-driver.ts:359)直接关菜单,没弹 PAL_TripleMenu/ConfirmMenu 二次确认(现有 C15 drawConfirmBox 可复用) |
| C3 | 物品菜单 InventoryMenu | ✅ claimed | ✅ regress | uigame.c:878-919 `PAL_InventoryMenu` + itemmenu.c:28-466 `PAL_ItemSelectMenu` | core/menu/inventory-menu.ts + script-desc.ts | inventory-menu.test.ts 26 用例 + script-desc.test.ts 6 用例 |
| C4 | 物品使用菜单 ItemUseMenu | ⚠️ partial | ✅ partial | uigame.c:1289-1473 `PAL_ItemUseMenu` | core/menu/inventory-menu.ts use-target + present/menu/draw-inventory.ts | inventory-menu.test.ts use-target phase;INNER while loop 真值 by user 实测 |
| C5 | 装备菜单 EquipItemMenu | ✅ claimed | ✅ regress | uigame.c:1793-2056 `PAL_EquipItemMenu` | core/menu/equip-menu.ts + present/menu/draw-equip.ts | equip-menu.test.ts 16 + equip-effect.test.ts 14;全屏 UI + scriptOnEquip 真接通 + 装备 effect |
| C6 | 角色状态菜单 PlayerStatus | ⚠️ partial | ✅ partial | uigame.c:1051-1288 `PAL_PlayerStatus` | core/menu/player-status.ts | player-status.test.ts;渲染层完整字段 + poison row ⬜ 留 follow-up |
| C7 | 法术菜单 InGameMagicMenu | ✅ claimed | ✅ regress | uigame.c:653-875 + magicmenu.c:413-484 + uibattle.c:31-269 | core/menu/in-game-magic-menu.ts + magic-script.ts + present/menu/draw-magic.ts | 全屏 UI + scriptOnUse/scriptOnSuccess 真接通 + MP 扣 + 循环 picker。in-game-magic-menu.test.ts 21 + magic-script.test.ts 19 |
| C8 | 存档菜单 SaveSlotMenu | ✅ claimed | ✅ regress | uigame.c:169-242 + 578-611 + global.c:844-911 | core/menu/save-slot-menu.ts + core/save/api.ts + indexed-db.ts | 真 IO 接通(cross-slot max+1 wSavedTimes);load 重切已接(bootstrap.ts:517-523 reslice 重建 npcs↔allEventObjects 引用);残:旧档无 allEventObjects 时 NPC sState 可能不齐。save-slot-menu.test.ts 15 |
| C9 | 商店 BuyMenu / SellMenu | ⚠️ partial | ✅ unit | uigame.c:1615 `PAL_BuyMenu` + 1755 `PAL_SellMenu` | core/menu/shop-menu.ts + menu-driver.ts applyShopTransaction + present/menu/draw-shop.ts | commit 3f5b644 全栈 1:1 接入(修曾伯卡主流程):状态机 + **真扣金/真改背包**(买 cash-=price+AddItem / 卖 cash+=price/2,menu-driver.ts:220)+ draw-shop 真渲染 + ITEMBOX 预览 + confirm 框。shop-menu.test.ts。残:卖菜单紧凑布局而非 sdlpal fullscreen PAL_ItemSelectMenu(功能等价) |
| C10 | 9-slice 边框 box 渲染 | ✅ claimed | ✅ partial | ui.c:131-240 `PAL_CreateBoxWithShadow` | present/menu/draw-box.ts | draw-box.test.ts |
| C11 | 中文字体渲染 Unifont | ⚠️ partial | ✅ partial | font.c PALFONT 字模 | present/font.ts | font.test.ts;Unifont CN stroke 跟 sdlpal 原 PALFONT 字模不同 |
| C12 | 文字阴影 triple shadow | ✅ claimed | ✅ partial | text.c:1144-1155 shadow 段 | render-text.ts(在 font.ts 内) | font.test.ts;DOS triple / WIN95 single,sdlpal "fix" 统一 triple |
| C13 | Dialog 框 PAL_StartDialog + 逐字符打字引擎 | ✅ claimed | ✅ partial | text.c:1208-1817 全套 + 1474-1611 控制符 + iDelayTime | present/dialog-box.ts + core/event-system.ts | dialog-box.test.ts。**2026-05-30 增量**:逐字符颜色控制符全套(`"`黄/`-`青0x8D/`'`红0x1A/`@`红alt toggle,消费 `()$~\`,色态跨行,commit 77f6c2e)+ 时间驱动打字($NN→iDelayTime 真变速 + ~NN 尾暂停,commit bea9475)+ 等键箭头/阴影对齐(0884ceb)|
| C14 | DrawNumber 数字 sprite | ✅ claimed | ✅ partial | ui.c:640 `PAL_DrawNumber` | present/draw-number.ts | draw-number.test.ts;digit sprite + 5 color align |
| C15 | 确认框 ConfirmMenu(否/是) | ✅ claimed | ⬜ todo | uigame.c:242-365 `PAL_ConfirmMenu` | present/menu/draw-confirm.ts + event-system.ts(waiting='confirm') + menu-driver.ts | drawConfirmBox 共享渲染:否(130,100)/是(205,100),默认否。两处消费:opcode 0x0A goto-if-no(commit 5c208d4)+ 商店 confirm phase |
| C16 | 三选菜单 TripleMenu | ⚠️ partial | ✅ unit | uigame.c:320 `PAL_TripleMenu` | core/menu/primitives.ts createTripleMenu | primitives.test.ts 有纯状态原语,但**未接 menu-driver / 无 draw 层 / 运行时无消费者**(预留)。关联 C2 quit 二次确认 |
| C-cash | 金钱面板 drawCashBox | ✅ claimed | ⬜ todo | uigame.c:451 `PAL_ShowCash` | present/menu/draw-menu.ts inline | 残:抽 helper 后单测便于覆盖 — 留 follow-up |
| C-driver | menu-driver hub 输入路由 | ✅ claimed | ✅ partial | uigame.c 各 PAL_*Menu while loop | core/menu/menu-driver.ts | menu-driver.test.ts;dispatch 各 kind menu 输入 → 对应 state machine fn |

## D. 战斗系统

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| D1 | 战斗启动 StartBattle | ✅ claimed | ✅ partial | battle.c:1531 `PAL_StartBattle` | core/battle/battle-system.ts startBattle + bootstrap startBattleHandler | battle-system.test.ts;opcode 0x07 全链通。enemyTeam slot 当 enemies.json id 直索引的简化映射(T23 对拍待) |
| D2 | 5 actions(攻/技/防/逃/物) | ⚠️ partial | ✅ partial | fight.c:3577 `PAL_BattlePlayerPerformAction` | core/battle/actions/* | actions.test.ts;5 基础 action 真做。残:BlowAway(0x6B)/ R 重复 prevAction ⬜;summon/trance/throw-item/equip-battle/coop-magic action type 是 stub |
| D3 | 物理伤害公式 | ✅ claimed | ✅ partial | fight.c:131-289 三公式 | core/battle/formulas.ts | formulas.test.ts;残:fight.c:3641 RandomLong(1,2) 抖动 + crit 系数简化(attack.ts doc 已注明) |
| D4 | 法术伤害公式 | ✅ claimed | ✅ partial | fight.c:174 `PAL_CalcMagicDamage` | core/battle/formulas.ts calcMagicDamage | formulas.test.ts;5 元素 + 抗 + fieldEffect |
| D5 | 玩家 dex (haste*3 + 999) | ✅ claimed | ✅ partial | fight.c:336 `PAL_GetPlayerActualDexterity` | core/battle/formulas.ts | formulas.test.ts |
| D6 | 敌人 dex ((level+6)*3+dex) | ✅ claimed | ✅ partial | fight.c:289 `PAL_GetEnemyDexterity` | core/battle/formulas.ts | formulas.test.ts;SHORT signed cast |
| D7 | ActionQueue / turn order | ⚠️ partial | ✅ partial | fight.c:1023 `PAL_BattlePlayerCheckReady` | core/battle/turn-queue.ts | turn-queue.test.ts;敌 dualMove 第二动作已传入 queue build |
| D8 | 玩家 status | ⚠️ partial | ✅ partial | fight.c:1023 + status apply 全链 | core/battle/status.ts tickStatusEffects | status.test.ts;number 类衰减真做;boolean 类(haste/protect/dualAttack)不衰减 + confused 攻友军 / paralyzed 跳回合行为未在 selectAction 真接 |
| D9 | 敌人 AI 选 target | ⚠️ partial | ⬜ todo | fight.c:4520 `PAL_BattleSelectEnemyTargetIndex` | core/battle/enemy-ai.ts | enemy-ai.test.ts;简版 random + magicRate,真值 target 偏好 + Bug-1 safety ⬜ |
| D10 | 敌人 AI 脚本 wScriptOnReady | ⚠️ partial | ⬜ todo | fight.c:4551 `PAL_BattleEnemyPerformAction` | core/battle/battle-system.ts:653 + battle-opcodes.ts | commit 4b85636:scriptOnReady runScript(runtimeMode='battle')+ 5 battle opcode(0x60/0x61/0x64/0x67/0x69)已接。残:0x67 改 wMagic 后未真驱动 PerformAction(仍走 fallback);scriptOnTurnStart/BattleEnd 解析存了未调 |
| D11 | 战斗胜利 BattleWon | ⚠️ partial | ✅ partial | battle.c:991 `PAL_BattleWon` | core/battle/battle-system.ts finalizeBattle | exp/cash 真写 gs.Exp.rgPrimaryExp / dwCash;残:levelup loop(查 rgLevelUpExp 阈值)+ 4 段视觉 box ⬜(注:event-system.ts:3706 有 PAL_PlayerLevelUp port 未被 finalizeBattle 调) |
| D12 | 战斗逃跑 PlayerEscape | ✅ claimed | ✅ regress | battle.c:1438 `PAL_BattlePlayerEscape` + fight.c:4119-4148 | core/battle/actions/flee.ts | BOSS 不许逃已做(flee.ts:29)+ actions.test.ts:289 钉死;逃跑公式对齐 fight.c |
| D13 | 敌人主动逃 EnemyEscape | ⚠️ partial | ⬜ todo | battle.c:1376 `PAL_BattleEnemyEscape` | core/battle/battle-opcodes.ts:88 | 0x69 简版 health=0 等价(不掉 exp/cash),battle-context only。残:逃跑动画/飞出屏视觉 ⬜ |
| D14 | 装备 stat 加成 UpdateEquipments | ⚠️ partial | ✅ regress | global.c:1333 `PAL_UpdateEquipments` | core/equip-effect.ts | equip-effect.test.ts 14;残:scriptOnEquip 内 0x2D/0x29 + Hand 卸下 DualAttack reset 未做 |
| D15 | poison 系统 rgPoisonStatus[16][6] | ⚠️ partial | ⬜ todo | global.c:1459-1735 5 fn | core/event-system.ts:3281 + game-state.ts:829 | commit 6792dd8:大世界 rgPoisonStatus 16-slot Record + 0x29 add / 0x2B cure kind / 0x2C cure level。残:战斗内 5 fn(抗性 RandomLong gate + 每回合 PoisonDamage 扣血 + 中毒紫色,见 D20)⬜ |
| D16 | 协力法术 CooperativeMagic | ⬜ todo | ⬜ todo | global.c:2013 `PAL_GetPlayerCooperativeMagic` | — | 'coop-magic' action type 占位 + handler stub;role.cooperativeMagic 已 dump,触发链 ⬜ |
| D17 | 法术动画 PreMagicAnim / RNG.MKF | ⬜ todo | ⬜ todo | fight.c 6 个 ShowMagic*Anim + rngplay.c | core 层 emit playMagicAnim(present 跳过) | present-battle.ts 只消费 showDamageNum,playMagicAnim/flashEnemy/playEnemyDeath 全跳过 |
| D18 | 战斗 UI(PlayerInfoBox / MiscMenu) | ⚠️ partial | ✅ partial | uibattle.c 12 函数 | present/battle/* + battle-system uiState | draw-battle-ui.test.ts;M3 vertical slice 简版 |
| D19 | 战斗背景 wave / cycle / fade | ⚠️ partial | ✅ partial | battle.c:34 `PAL_BattleDrawBackground` + 609 BattleFadeScene | present/battle/draw-battle-bg.ts | 背景静态全屏 blit;wave 扭曲 + palette cycle + BattleFadeScene 淡入 ⬜ |
| D20 | 死敌 colorShift / 中毒紫色 | ⬜ todo | ⬜ todo | battle.c:505 `PAL_BattleDrawAllSpritesWithColorShift` | — | grep colorShift 0 命中;死敌渐隐 / 中毒紫色 palette shift 未做 |
| D21 | 战斗结束 status 清 | ⬜ todo | ⬜ todo | global.c:2311 `PAL_ClearAllPlayerStatus` | — | finalizeBattle 未 clear sleep/confused/paralyzed |
| D22 | 偷盗 StealFromEnemy | ⬜ todo | ⬜ todo | fight.c:5193 `PAL_BattleStealFromEnemy` + 含 Bug-2 | — | opcode 0x6A 未做 |
| D23 | 战斗 opcode 子集(scripted enemy AI) | ⚠️ partial | ⬜ todo | script.c 0x60/0x61/0x64/0x67/0x69 | core/battle/battle-opcodes.ts dispatchBattleOpcode | commit 4b85636:5 个 battle-context opcode(简版:0x61 默认未中毒直 jump / 0x64 用 prevHp 近似 / 0x67 mutate 未真驱动)。**剩余未做战斗 E 类 opcode**:0x30/0x31/0x33/0x34/0x38/0x39/0x3A/0x42/0x57/0x5A/0x5B/0x5C/0x5F/0x66/0x6B/0x88/0x89/0x8A/0x91/0x92/0x9C/0x9E/0x9F(见 opcode-status.md E 类) |
| D24 | 战斗隐身 0x5C iHidingTime | ⬜ todo | ⬜ todo | script.c:1907-1911 `g_Battle.iHidingTime = -op0` | — | party 隐身回合机制未做(BattleState 无 hidingTime 字段) |

## E. 脚本 / Cutscene(opcode interpreter)

> **逐 opcode 实现状态以 [docs/opcode-status.md](opcode-status.md) 为单一真值源**(163 opcode 全集,2026-05-30:控制流 0x00-0x0A + A/B/C/S 类 + D 视觉类 全 ✅,剩 26 战斗 E 类 + 3 音频 D 类待战斗系统/M6)。
> 本章只列**框架 / 架构级**条目,不再逐 opcode 平铺(避免与 opcode-status.md 两表漂移)。
> 特效栈(fade / wave / FBP / RNG)→ 见 **G 章**;对话打字引擎 → 见 **C13**;follower → 见 **B11**。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| E1 | opcode interpreter 框架 | ✅ claimed | ✅ partial | script.c:587 `PAL_InterpretInstruction` | core/event-system.ts tickEventSystem + applyRawOpcode | event-system.test.ts;先按 cmd.op 解析分流,'raw' 再进 OP_ 具名大 switch |
| E2 | opcode 总体覆盖 | ✅ claimed | ✅ partial | script.c 0x00-0xA6 全集(减不存在 0x32/0x48/0x72/0x9D) | core/event-system.ts(122 个 OP_ 常量)+ battle-opcodes.ts | **122 OP_ 具名常量 / 约 134-of-163 opcode 有实现(含 stub)**;剩 ~26 战斗 E 类 + 3 音频 D 类未做。逐条状态 → opcode-status.md |
| E3 | RunAutoScript NPC 自动 | ⚠️ partial | ⬜ todo | script.c:3482-3515 `PAL_RunAutoScript` | core/event-system.ts:885 tickAutoScripts | 0x00 park / 0x01 advance / 0x02 reset(idleFrames)/ 0x03 goto(不消耗帧同帧续跑)/ call / wait 全 port;1 op/tick 对齐 sdlpal 真值。commit 2d5a8c5 / eaaa1d5 / 4701d34。残少数 wScriptOnAnimate 态 |
| E4 | 唯一全局脚本数组 / 行索引架构 | ✅ claimed | ✅ partial | script.c 单一 lprgScriptEntry 全局寻址 | core/event-system.ts:607 _globalCommands / resolveScriptLabel | commit 6b58f9e(P2#5 单一全局数组,cursor 只存 globalIp,根治存档膨胀)+ 1f99417(P0 唯一行索引,修 0x19/0x1A/0x9A 同 opcode 两套行为)+ 4701d34(116 处跨 scene 引用兜底) |

## F. 存档 / 读档

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| F1 | 默认新游戏初始化 | ⚠️ partial | ⬜ todo | global.c:378 `PAL_LoadDefaultGame` | shell/bootstrap.ts createInitialGameState | hardcode default + player-roles.json 注入;sdlpal 真值从 SAVEDGAME slot 0 反序列化 |
| F2 | 存档到 IndexedDB | ✅ claimed | ✅ regress | global.c:844 `PAL_SaveGame_WIN` | core/save/api.ts saveSlot + menu-driver.ts | C8 真 IO:Save → cross-slot max+1 wSavedTimes(uigame.c:589-597)→ IndexedDB put;deepClone 隔离 |
| F3 | 读档从 IndexedDB | ⚠️ partial | ✅ regress | global.c:689 `PAL_LoadGame_WIN` + 888 `PAL_ReloadInNextTick` | core/save/api.ts loadSlot + shell/bootstrap.ts loadGameFromSlot | C8 读档 IO + scene reload;OpeningMenu/SystemMenu/opcode 0x4E 共享 handler;eecfbc4 修读档卡死。残:rgEventObject sparse → 旧档 NPC sState 可能不齐 |
| F4 | sdlpal `*.RPG` 字节兼容 | N/A | N/A | — | — | D37 决策不做(IndexedDB 存 typed GameState JSON,非二进制 SAVEDGAME) |

## G. 视觉效果

> 调色板 ramp 引擎(G7/G10/G14)与 dither 引擎(G8)正交;modal 全屏渲染器(G12/G13)走 shell suspendRaf(见 M2)。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| G1 | RLE sprite blit | ✅ claimed | ✅ partial | palcommon.c:36-446 4 个 RLE fn | pal-extract io/rle.ts + present/draw-sprite.ts | rle-decode.test.ts + draw-sprite.test.ts |
| G2 | FBP 整图 blit | ✅ claimed | ⬜ todo | palcommon.c:651 `PAL_FBPBlitToSurface` | pal-extract dump FBP → png | M4 P3 提取层;运行时全屏显示/滚动见 G13 |
| G3 | sprite color shift | ⚠️ partial | ✅ partial | palcommon.c:245 `PAL_RLEBlitWithColorShift` | pal-extract io/rle.ts | rle-decode test;runtime 死敌/状态 colorShift ⬜(见 D20)|
| G4 | tilemap 双层渲染 | ✅ claimed | ✅ partial | map.c 全 6 fn | present/draw-tilemap.ts | draw-tilemap.test.ts |
| G5 | palette 加载 / 切换 | ✅ claimed | ⬜ todo | palette.c:25/93 + 0x8B / 0x53·0x54 | event-system.ts:2077 setPalette + 2765 昼夜 flag | 0x8B `_fetchPalette` 异步注入 + 0x53/0x54 昼夜 flag(commit 8fe20e4)。夜色经 resolveNightColors 在 fade target 生效 |
| G6 | palette cycle 水/火 动画 | ⬜ todo | ⬜ todo | palette.c `PAL_PaletteRotate` 类 | — | decodePalette cycles 始终空,present 不动色表段 — **真未做** |
| G7 | FadeIn / FadeOut 全屏(0x50/0x51) | ✅ claimed | ✅ partial | palette.c:163/176 | core/palette-fade.ts buildFadeOut/In + present.ts:124 stepPaletteFade | commit fec9a11:palette ramp 引擎 time-based + 夜色 target。palette-fade.test.ts |
| G8 | SceneFade 72 帧 dither(0x73/0x9B) | ✅ claimed | ⚠️ partial | video.c:1130 `VIDEO_FadeScreen` | present.ts:467-516 + event-system.ts | 72-step nibble dither(backupPixels 快照);0x9B 复用 fadeState。注:0x93 SceneFade 改走 palette ramp(buildSceneFade)。palette-fade.test.ts 覆盖 ramp 数学,dither e2e ⬜ |
| G9 | ShakeScreen 0x35 | ⚠️ partial | ⬜ todo | video.c:1030 `VIDEO_ShakeScreen` | core/event-system.ts:2776 | opcode 已派发解析(duration/intensity),但 present 层 viewport ±intensity 抖动 **未实接**(stub log) |
| G10 | FadeToRed 战斗结束(0x4F) | ✅ claimed | ✅ partial | palette.c:595/633-666 | core/palette-fade.ts buildFadeToRed + present.ts:445 | commit fec9a11:逐步收敛 ±8 + skip 文字色 idx 0x4F + fb 像素 0x4F→0x4E 重映射 |
| G11 | ApplyWave 水波(0x71) | ✅ claimed | ✅ partial | scene.c:365-450 `PAL_ApplyWave` | present/screen-wave.ts applyScreenWave + present.ts:166 | commit 8872b54:逐扫描线横向循环卷动 + 32 相位表;只波动地图层。screen-wave.test.ts |
| G12 | RNG.MKF 动画播放(0x36/0x37) | ✅ claimed | ✅ partial | rngplay.c:371-448 `PAL_RNGPlay` | shell/rng-player.ts + event-system OP_SET_RNG/PLAY_RNG | commit 8872b54:0x36 set iCurPlayingRNG(instant)+ 0x37 阻塞 modal 逐帧 PNG 直写 fb + Space 跳过(suspendRaf);全 12 chunk 提取。rng-player.test.ts。开场 trademark DOS 亦复用 |
| G13 | ShowFBP / ScrollFBP runtime(0x76/0xA4/0xA5) | ✅ claimed | ✅ partial | ending.c:48-150 `PAL_ShowFBP` + 152-279 `PAL_ScrollFBP` + g_wCurEffectSprite | shell/fbp-player.ts showFbp/scrollFbp/overlayEffectSprite | commit 5c7aece/046a583/f600c03:0x76 96 步 nibble dither 渐变 + 0xA4 220 步下滑卷入 + 0xA5 MGO effectSprite 叠加。本游戏 in-game 多 0 调用,结局编排 + devpanel 用。fbp-player.test.ts |
| G14 | ColorFade / PaletteFade 昼夜(0x8C/0x80 + 0x53/0x54) | ✅ claimed | ✅ partial | palette.c:432/494 + script.c:1802/1809 fNightPalette | core/palette-fade.ts buildColorFade/buildPaletteFade + resolveNightColors | commit fec9a11/ac8612e/8fe20e4:0x8C 场景↔纯色双向 64 步 + 0x80 昼夜 toggle 32 步 lerp;夜色经 PAL_GetPalette(n,fNight)选(PAT.MKF #0/#5 夜间半,已提取见 K8)。palette-fade.test.ts |

## H. 音频

> runtime 播放全部 ⬜(M6 Web Audio);**资源已提取落地**(见 K6 Musics / K7 SOUNDS),数据≠零进展但播放层待 M6。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| H1 | BGM(MIDI/MP3/OGG/OPUS) | ⬜ todo | N/A | audio.c + midi*.c + mp3/ogg/opusplay.c | — | opcode 0x43 playMusic 仅写 wNumMusic 字段不播;资源已提取(K6)。M6 Web Audio + SpessaSynth |
| H2 | SFX sound.c | ⬜ todo | N/A | sound.c 14 fn | — | opcode 0x47 playSound 仅 console.debug;363 WAV 已提取(K7)。M6 |
| H3 | CD audio | ⬜ todo | N/A | audio.c CD 相关 | — | 8 TRACKxx.ogg 已提取(K6);opcode 0xA3 未接播。M6 |

## I. 通关 / Ending

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| I1 | Ending 动画 + EndingScreen 全编排 | ✅ claimed | ✅ partial | ending.c:282-393 `PAL_EndingAnimation`(0x96) + 396-512 `PAL_EndingScreen` DOS | shell/ending-player.ts + fbp-player.ts + bootstrap.ts playDosEnding | commit d517919/75344f1/046a583/f600c03/cefb343:0x96 400 帧(背景上滚 + 妖兽 MGO571 + 女孩 MGO572 walk + wScreenWave 水波);DOS fallback 全 beat 编排(RNG 9/10/11 + Fade + ShowFBP + ScrollFBP + ColorFade + EndingAnim + WaitForKey + 演职员表卷动 67→59)。ending-player.test.ts。残:音乐 M6 |
| I2 | Credits | N/A | N/A | script.c:504 `PAL_AdditionalCredits` | — | N/A **仅指 sdlpal 引擎 GNU GPL 版权页**(user 决策跳过)。游戏内演职员表 scroll(ending.c:485-511 FBP 67→59)≠ 引擎页,已并入 I1 编排 |
| I3 | 通关 AVI | ✅ claimed | N/A | uigame.c PAL_EndingScreen AVI 序 | shell/avi-player.ts + bootstrap.ts setQuitHandler | commit 30a4822:opcode 0xA0 quit → WIN95 build 顺序播 4/5/6.mp4 → 回 OpeningMenu;DOS build 结局由前序 opcode/playDosEnding 跑完 → 直接回标题。4/5/6.mp4 已提取 |

## J. 输入

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| J1 | 键盘 8 方向 + 6 键 | ✅ claimed | ✅ partial | input.c:58-90 CODE_MAP + input.c:213 fRepeat | shell/input.ts(KeyboardInputSource) | input.test.ts;物理键映射真值 + e.repeat 过滤。(注:旧表写的 shell/keyboard.ts 不存在,键盘逻辑全在 input.ts) |
| J2 | 鼠标 | ⬜ todo | N/A | input.c:436 `PAL_MouseEventFilter` | — | 无 MouseInputSource。M6 |
| J3 | 手柄 / Joystick | ⬜ todo | N/A | input.c joystick 全组 | — | 无 GamepadInputSource。M6 |
| J4 | 触屏 移动支持 | ⬜ todo | N/A | input.c touch 全组 | — | 无 TouchInputSource。M6 |

## K. 数据提取 (pal-extract)

> **逐 chunk 提取覆盖明细以 [resource-status.md](resource-status.md) 为单一真值源**(14 MKF + 非 MKF 资源全 chunk + byte-level 覆盖率自检)。
> 本章只列提取器框架级条目;新增提取产物只维护 resource-status.md。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| K1 | pal-extract 提取器框架 | ✅ claimed | ✅ partial | palcommon.c MKF 5 fn + 各 resources parser | pal-extract io/ + resources/ + cli.ts | 14 MKF + M.MSG + WORD.DAT + Musics / SOUNDS / AVI;25 test 文件 / 210 cases |
| K2 | 提取总体覆盖 | ✅ claimed | ✅ partial | — | data/extracted/ | byte-level 复核:全非空 chunk 已落地,零真实数据 gap(逐 chunk 明细见 resource-status.md 覆盖率自检) |
| K3 | 已知残留 | ⚠️ partial | N/A | — | — | runtime 音频播放 wiring(M6,非提取 gap)+ RNG PNG 的 runtime mirror(asset-copy 步骤)+ WORD.DAT 新 55 条无 regress 测 |

## L. 特殊物品 / 剧情系统

> 2026-05-28 user 补提。真值已查清(byte-level 追 items/spells.json + all.json 脚本链):炼丹/蛊虫在 sdlpal **不是独立 C fn / 特殊菜单**,而是**战斗 E 类 opcode chain**。gate = 战斗 collect/transform/throw opcode 未做(见 D23 / opcode-status.md E 类)。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| L1 | 炼丹系统(紫金葫芦 + 灵葫咒) | ⬜ todo | ⬜ todo | script.c case 0x34/0x33 + 0x64/0x60 + fight.c collect | — | 紫金葫芦 scriptOnUse=0x34(transformEnemiesToItems);灵葫咒 scriptOnSuccess=0x64+0x33(collectEnemy)+0x60(KO)。这些战斗 opcode 全 default-skip。灵葫仙丹(纯治疗 0x1D)已能跑 |
| L2 | 蛊虫 / 练蛊皿系统 | ⬜ todo | ⬜ todo | script.c case 0x66/0x33/0x34 + fight.c PAL_BattleThrowWeapon | — | 蛊靠 flags.throwable → 战斗投掷 0x66;炼蛊皿(id 207)scriptOnUse=0x20 + 收妖 0x33/0x34。同 L1 gate=战斗 opcode |
| L? | 御剑 / 打铁 / 双修 / 小游戏 | N/A | N/A | — | — | 查无新独立系统:御剑术(spell 49/65)走普通战斗/移动魔法(0x3F/0x44/0x97 已做);打铁/双修是 dialog 文本 + 给物品 opcode(0x20 已做) |

## M. 运行时架构 / 工具

> 浏览器运行时基础设施 + 架构根因修复 + 开发工具。多数无直接 sdlpal 1:1 对应(SDL 单线程阻塞语义的等价替代)。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| M1 | 主循环 渲染/逻辑解耦 | ✅ claimed | ⬜ todo | main.c `PAL_GameUpdate` 帧语义(等价) | shell/main-loop.ts | commit 3ebf1cb:逻辑 tick 恒速(explore 100ms / battle 40ms),不被 scene 淡入提速;dither/paletteFade 进行中每 raf present(wall-clock 平滑)。修香兰 cutscene 走入/对话被加速 6× |
| M2 | suspendRaf modal 独占 canvas | ✅ claimed | ⬜ todo | —(浏览器特有,SDL 阻塞等价) | shell/main-loop.ts onPresent + bootstrap suspendRaf gate | commit a01cd73:modal 播放器(AVI/trademark/splash/RNG/FBP/结局)期间主循环 present 跳过,修闪烁。含阻塞 fade/colorFade/WaitForKey 工具(ending-player.ts)供 modal 编排 |
| M3 | scene 转场淡入门控 + 失败兜底解冻 | ✅ claimed | ⬜ todo | scene.c:503-508 `PAL_MakeScene` fNeedToFadeIn | core/event-system.ts:515 tickSceneAutoFadeIn | commit 9293dac/ef70491/9791497/39b5848:onEnter cutscene 黑屏真因=自动淡入门控旧码 explore-only → 对齐 PAL_GameUpdate;scene-load 失败兜底解冻 sceneLoading(架构根因);0x05 redraw 对齐(修仙灵岛靠岸黑屏) |
| M4 | devpanel 开发工具 | N/A | N/A | —(纯调试工具) | shell/dev-panel.ts | import.meta.env.DEV-gated:Videos(开场/结局 mp4 双版)、DOS 版按钮(trademark RNG + splash 卷轴 + 结局全片)、Effects opcode 触发、font/dialog 测试、Save/Load slot、B 键 battle picker、P 键强制三人入队、加道具/清背包 |

---

## 测试一览(防回归)

**2026-05-29 菜单/装备强化(123 case,613 → 714 + 2 skip)**

| 测试文件 | 覆盖 | case 数 |
|---|---|---|
| [equip-menu.test.ts](../packages/game/src/core/menu/equip-menu.test.ts) | EquipMenu state machine(C5)+ scriptOnEquip swap chain | 16 |
| [equip-effect.test.ts](../packages/game/src/core/equip-effect.test.ts) | rgEquipmentEffect 写/清 + 6 stat getter + 木剑 swap(D14) | 14 |
| [inventory-menu.test.ts](../packages/game/src/core/menu/inventory-menu.test.ts) | pickItemRowColor 6-case truth table + matchesFilter + grid 8-key clamp(C3) | 26 |
| [save-slot-menu.test.ts](../packages/game/src/core/menu/save-slot-menu.test.ts) | SaveSlotMenu 5 slot + cross-slot max+1 + roundtrip(C8) | 15 |
| [in-game-menu.test.ts](../packages/game/src/core/menu/in-game-menu.test.ts) | InGameMenu + SystemMenu choice / cursor 记忆(C1/C2) | 10 |
| [inventory-action-menu.test.ts](../packages/game/src/core/menu/inventory-action-menu.test.ts) | 1 级 box 子菜单(装备/使用) | 3 |
| [script-desc.test.ts](../packages/game/src/core/menu/script-desc.test.ts) | getScriptDescLines 木剑/玉佛珠真值 + 边界(C3) | 6 |
| [magic-script.test.ts](../packages/game/src/core/menu/magic-script.test.ts) | C7 magic 同步 runner(0x1B/0x1C/0x1D/0x22 + 气疗/还魂咒 chain) | 19 |
| [in-game-magic-menu.test.ts](../packages/game/src/core/menu/in-game-magic-menu.test.ts) | C7 state machine 4 phase + 测试发现 hasOutsideMagic code bug | 21 |

**2026-05-29~30 特效 / 商店 / 开场结局 / follower(新增,case 数见各文件)**

| 测试文件 | 覆盖 |
|---|---|
| [shop-menu.test.ts](../packages/game/src/core/menu/shop-menu.test.ts) | C9 商店买/卖状态机 + 扣金 |
| [follower-render.test.ts](../packages/game/src/present/follower-render.test.ts) | B11 0x98 跟随者 trail/帧/sprite(6 用例) |
| [palette-fade.test.ts](../packages/game/src/core/palette-fade.test.ts) | G7/G10/G14 ramp 数学(FadeIn/Out/ToRed/ColorFade/PaletteFade) |
| [screen-wave.test.ts](../packages/game/src/present/screen-wave.test.ts) | G11 ApplyWave 逐扫描线卷动 |
| [rng-player.test.ts](../packages/game/src/shell/rng-player.test.ts) | G12 RNG.MKF 逐帧播放 |
| [fbp-player.test.ts](../packages/game/src/shell/fbp-player.test.ts) | G13 ShowFBP/ScrollFBP dither |
| [ending-player.test.ts](../packages/game/src/shell/ending-player.test.ts) | I1 EndingAnimation 400 帧 |
| [trademark-fallback.test.ts](../packages/game/src/shell/trademark-fallback.test.ts) | A1 DOS trademark |
| [splash-fallback.test.ts](../packages/game/src/shell/splash-fallback.test.ts) | A2 DOS 卷轴 splash |
| [avi-player.test.ts](../packages/game/src/shell/avi-player.test.ts) | A3/I3 mp4 `<video>` 播放器 |

## sdlpal 自身 bug(audit 过程发现,ts port 时显式 fix)

| # | 描述 | sdlpal 行 |
|---|---|---|
| Bug-1 | `PAL_BattleSelectAutoTarget` 死循环 — 全敌死时无退出 while | fight.c:4500-4517 |
| Bug-2 | `PAL_BattleStealFromEnemy` 无 dead target check — R 重复偷死敌时数值 underflow | fight.c:5193+ |
