# Feature Status · type-pal

> 权威功能表。任何"完成度"表述以本文件为准,README 不再写百分比。
> 状态由 user 逐条 sdlpal 源核对后拍板,Claude 不自判。

## 状态定义

- **✓ verified**:Claude port 自认 1:1,**且** user 已逐行核对 sdlpal 源 + 拍板通过。
- **✓ claimed**:Claude port 自认 1:1,**但** user 尚未核对。带行号引用 sdlpal 待 user 拍。
- **⚠️ partial**:Claude 自知 / user 实测发现简版 / 缺真值 / 未完整 port。带具体差异说明。
- **✗ todo**:未做。
- **N/A**:by design 不 port(浏览器 canvas / Web Audio 替代 SDL/audio,DOS 兼容代码等)。

## 测试列定义(2026-05-29 user 要求加)

- **✓ unit**:有 unit test 覆盖核心数据 / 状态机 / 公式
- **✓ regress**:有专门防回归测试(user 反馈过的 bug 都有 unit case 钉死)
- **✓ partial**:部分有(eg 数据 state machine ✓ 但渲染层 ✗;或单 case 但不全)
- **✗ todo**:无测试
- **N/A**:不需要(by design 不 port / 渲染层难单测)

## audit 进度

- 核对中:user 让"先做完菜单"(暂停 Phase A,改 C 系列菜单补完)
- 菜单补完进度:**1/6**(C5 ✓ — EquipItemMenu fullscreen UI + scriptOnEquip 真接通 + D14 装备 effect 顺手补)
- 已 verified ✓:0 / 18 自认 ✓ claimed
- 已 verified ⚠️:0 / 31 自认 ⚠️ claimed
- L 段(特殊物品 / 剧情系统):待 Phase B.G7 grep sdlpal 入口

## 已知 follow-up

- mutatePlayerStat FIELD_MAP row index 偏移 -1 bug(event-system.ts:1956,2026-05-28 C5 audit 发现):
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
| A1 | Trademark Logo | ✗ todo | N/A | main.c:179 `PAL_TrademarkScreen` | — | dev mode `?skip-intro` 跳过 |
| A2 | Splash 屏 | ✗ todo | N/A | main.c:206 `PAL_SplashScreen` | — | dev mode `?skip-intro` 跳过 |
| A3 | 开场 AVI | ✗ todo | N/A | aviplay.c 全组 9 fn | — | ffmpeg→mp4 + `<video>` follow-up |
| A4 | OpeningMenu(新游戏/读档) | ⚠️ claimed | ✓ partial | uigame.c:83 `PAL_OpeningMenu` | core/menu/opening-menu.ts | 数据 state machine(opening-menu.test.ts),box 坐标 + 9-slice 真值未严格对齐 |

## B. 大世界探索

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| B1 | 玩家走路 4 方向 + 步频动画 | ⚠️ claimed | ✓ partial | scene.c:636 `PAL_UpdatePartyGestures` | core/scene-system.ts + present.ts | scene-system.test.ts;真值循环动画 priority 可能偏差 |
| B2 | NPC 跟随队伍 trail | ⚠️ claimed | ✓ partial | scene.c:779 `PAL_UpdateParty` | core/event-system.ts partyWalkTo | event-system.test.ts trail;多 NPC 完整 trail 时序未完整测 |
| B3 | NPC 自动行走 autoScript | ⚠️ claimed | ✗ todo | script.c:3482 `PAL_RunAutoScript` | core/scene-system.ts tickAutoScripts | 简版 1 op/tick;sdlpal 真值 4 状态循环未做 |
| B4 | 场景切换 door / trigger zone | ⚠️ claimed | ✓ partial | play.c:107-165 fTrigger 段 | core/scene-system.ts | M5.6 加 mode-dependent Manhattan threshold;未全场景验证 |
| B5 | 调查 Confirm 键 PAL_Search | ⚠️ claimed | ✓ partial | play.c:362-510 `PAL_Search` + `PAL_GetSearchTriggerRange` | core/scene-system.ts | scene-system-search.test.ts |
| B6 | NPC 对话触发 runScript | ✓ claimed | ✓ partial | text.c:1208 `PAL_StartDialog` 全套 | core/event-system.ts runScript + dialog 状态机 | event-system / dialog-box test;M5.Sync.2 完整 port(详见 C13) |
| B7 | 明雷怪 visible enemy | ⚠️ claimed | ✗ todo | script.c:310 `PAL_MonsterChasePlayer` | core/scene-system.ts contact 触发 | M3.5 跟随简版;MonsterChasePlayer ✗,只接触触发 |
| B8 | tilemap 遮挡 cover tile | ✓ claimed | ✗ todo | scene.c:77-180 `PAL_CalcCoverTiles` | present/draw-tilemap.ts addCoverTileEntries | 5×5 scan + iTileHeight bit 8-11/24-27 |
| B9 | tilemap 阻挡 block bit | ✓ claimed | ✓ partial | scene.c:512-635 `PAL_CheckObstacle*` | core/scene-system.ts isWalkable | scene-system test;bit 13 + sState>=2 NPC range |
| B10 | 295 个 scene 资源加载 | ✓ claimed | ✗ todo | res.c:191 `PAL_LoadResources` | assets/loader.ts | loader.test.ts(资源加载基础);无 295 scene 全 fixture |

## C. UI / 菜单系统(2026-05-29 全测试强化)

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| C1 | ESC 主菜单 InGameMenu | ⚠️ claimed | ✓ regress | uigame.c:944 `PAL_InGameMenu` | core/menu/in-game-menu.ts | in-game-menu.test.ts(2026-05-29 加):4 choice 真值 / cursor 记忆 / Up/Down;残:label hardcode 而非 PAL_GetWord lookup,WORD.DAT 链断 |
| C2 | 系统菜单 SystemMenu | ⚠️ claimed | ✓ regress | uigame.c:516 `PAL_SystemMenu` | core/menu/in-game-menu.ts SystemMenuState | in-game-menu.test.ts:5 choice + cursor 记忆;残:Quit 没弹 PAL_TripleMenu/ConfirmMenu 二次确认 |
| C3 | 物品菜单 InventoryMenu | ⚠️ claimed | ✓ regress | uigame.c:878-919 `PAL_InventoryMenu` + itemmenu.c:28-466 `PAL_ItemSelectMenu` | core/menu/inventory-menu.ts + script-desc.ts | **inventory-menu.test.ts** 26 用例(pickItemRowColor 6-case truth table / matchesFilter 各 filter / grid 8-key clamp / phase 状态机) + **script-desc.test.ts** 6 用例(scriptDesc chain 真值 + 边界);C5 session 4 修 filter color + scriptDesc 真做(getScriptDescLines pure helper) |
| C4 | 物品使用菜单 ItemUseMenu | ⚠️ claimed | ✓ partial | uigame.c:1289-1473 `PAL_ItemUseMenu` | core/menu/inventory-menu.ts use-target phase + present/menu/draw-inventory.ts | inventory-menu.test.ts use-target phase;渲染层 INNER while loop 真值 by user 实测 |
| C5 | 装备菜单 EquipItemMenu | ⚠️ claimed | ✓ regress | uigame.c:1793-2056 `PAL_EquipItemMenu` | core/menu/equip-menu.ts + present/menu/draw-equip.ts | **equip-menu.test.ts** 16 用例 + **equip-effect.test.ts** 14 用例(swap 链 / wLastUnequippedItem / playerCursor wrap / rgEquipmentEffect 写入);C5 (2026-05-28) 全屏 UI + scriptOnEquip 真接通 + D14 装备 effect 顺手补;session 2 修简版 → 复用 InventoryMenu grid;session 4 修 filter color + scriptDesc |
| C6 | 角色状态菜单 PlayerStatus | ⚠️ claimed | ✓ partial | uigame.c:1051-1288 `PAL_PlayerStatus` | core/menu/player-status.ts | player-status.test.ts(prev/next/cancel / done 边界);渲染层完整字段 + poison row ✗ 留 follow-up |
| C7 | 法术菜单 InGameMagicMenu | ⚠️ claimed | ✗ todo | uigame.c:654 `PAL_InGameMagicMenu` | core/menu/in-game-magic-menu.ts | 数据 state machine 在,渲染 placeholder + scriptOnUse 没真接通;**整 UI 没真做** |
| C8 | 存档菜单 SaveSlotMenu | ⚠️ claimed | ✓ regress | uigame.c:169 `PAL_SaveSlotMenu` | core/menu/save-slot-menu.ts | **save-slot-menu.test.ts** 8 用例(5 slot list / Up/Down / Current / mode);真 IO(IndexedDB) ✗ — 选 slot 不真存 |
| C9 | 商店 BuyMenu / SellMenu | ⚠️ claimed | ✗ todo | uigame.c:1615 + 1755 | core/menu/shop-menu.ts | 数据层 shop-menu.ts;渲染 placeholder + 真扣金 ✗;**整 UI 没真做** |
| C10 | 9-slice 边框 box 渲染 | ✓ claimed | ✓ partial | ui.c:131-240 `PAL_CreateBoxWithShadow` | present/menu/draw-box.ts | draw-box.test.ts;M5.6 完整 port |
| C11 | 中文字体渲染 Unifont | ⚠️ claimed | ✓ partial | font.c PALFONT 字模 | present/font.ts | font.test.ts;M4 P4 Unifont CN port,stroke 跟 sdlpal 原 PALFONT 字模不同 |
| C12 | 文字阴影 triple shadow | ✓ claimed | ✓ partial | text.c:1144-1155 TEXT_DisplayText shadow 段 | render-text.ts(在 font.ts 内) | font.test.ts 含 shadow 测;DOS triple / WIN95 single,sdlpal "fix" 统一 triple |
| C13 | Dialog 框 PAL_StartDialog | ✓ claimed | ✓ partial | text.c:1208-1817 全套 | present/dialog-box.ts + core/event-system.ts | dialog-box.test.ts;M5.Sync.2 完整 port |
| C14 | DrawNumber 数字 sprite | ✓ claimed | ✓ partial | ui.c:640 `PAL_DrawNumber` | present/draw-number.ts | draw-number.test.ts;digit sprite + 5 color align |
| C-cash | 金钱面板 drawCashBox | ✓ claimed | ✗ todo | uigame.c:451 `PAL_ShowCash` | present/menu/draw-menu.ts inline | M5.6 inline 在 drawCashBox(draw-menu.ts);残:抽 helper 后单测便于覆盖 — 留 follow-up |
| C-driver | menu-driver hub 输入路由 | ✓ claimed | ✓ partial | uigame.c 各 PAL_*Menu while loop | core/menu/menu-driver.ts | menu-driver.test.ts;dispatch 9 kind menu 输入 → 对应 state machine fn |

## D. 战斗系统

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| D1 | 战斗启动 StartBattle | ✓ claimed | ✓ partial | battle.c:1531 `PAL_StartBattle` | core/battle/battle-system.ts startBattle | battle-system.test.ts |
| D2 | 5 actions(攻/技/防/逃/物) | ⚠️ claimed | ✓ partial | fight.c:3577 `PAL_BattlePlayerPerformAction` | core/battle/actions/* | actions.test.ts;BlowAway / R 重复 prevAction ✗ |
| D3 | 物理伤害公式 | ✓ claimed | ✓ partial | fight.c:131-289 三公式 | core/battle/formulas.ts | formulas.test.ts;防 div by 0 |
| D4 | 法术伤害公式 | ✓ claimed | ✓ partial | fight.c:174 `PAL_CalcMagicDamage` | core/battle/formulas.ts calcMagicDamage | formulas.test.ts;5 元素 + 抗 + fieldEffect |
| D5 | 玩家 dex (haste*3 + 999) | ✓ claimed | ✓ partial | fight.c:336 `PAL_GetPlayerActualDexterity` | core/battle/formulas.ts | formulas.test.ts |
| D6 | 敌人 dex ((level+6)*3+dex) | ✓ claimed | ✓ partial | fight.c:289 `PAL_GetEnemyDexterity` | core/battle/formulas.ts | formulas.test.ts;SHORT signed cast |
| D7 | ActionQueue / turn order | ⚠️ claimed | ✓ partial | fight.c:1023 `PAL_BattlePlayerCheckReady` | core/battle/turn-queue.ts | turn-queue.test.ts |
| D8 | 玩家 status | ⚠️ claimed | ✓ partial | fight.c:1023 + status apply 全链 | core/battle/status.ts tickStatusEffects | status.test.ts |
| D9 | 敌人 AI 选 target | ⚠️ claimed | ✗ todo | fight.c:4520 `PAL_BattleSelectEnemyTargetIndex` | core/battle/enemy-ai.ts | enemy-ai.test.ts;简版 random,真值 + Bug-1 safety ✗ |
| D10 | 敌人 AI 脚本 wScriptOnReady | ✗ todo | ✗ todo | fight.c:4551 `PAL_BattleEnemyPerformAction` | — | 54 enemy 有 wScriptOnReady,runScript 接 battle ctx 未做 |
| D11 | 战斗胜利 BattleWon | ⚠️ claimed | ✓ partial | battle.c:991 `PAL_BattleWon` | core/battle/battle-system.ts finalizeBattle | battle-system test;levelup loop ✗ + 4 段视觉 box ✗ |
| D12 | 战斗逃跑 PlayerEscape | ⚠️ claimed | ✓ partial | battle.c:1438 `PAL_BattlePlayerEscape` | core/battle/actions/flee.ts | actions test;BOSS 不许逃 ✗ |
| D13 | 敌人主动逃 EnemyEscape | ✗ todo | ✗ todo | battle.c:1376 `PAL_BattleEnemyEscape` | — | opcode 0x69 stub |
| D14 | 装备 stat 加成 UpdateEquipments | ⚠️ claimed | ✓ regress | global.c:1333 `PAL_UpdateEquipments` | core/equip-effect.ts | **equip-effect.test.ts** 14 用例(writeEquipmentEffectField / removeEquipmentEffect / 6 stat getter + clamp / 完整 swap 模拟);C5 (2026-05-28) 顺手补;残:opcode 0x2D/0x29 未处理,Hand 卸下 DualAttack reset 未做 |
| D15 | poison 系统 rgPoisonStatus[16][6] | ✗ todo | ✗ todo | global.c:1459-1735 5 fn | — | M5 简版只 status field |
| D16 | 协力法术 CooperativeMagic | ✗ todo | ✗ todo | global.c:2013 `PAL_GetPlayerCooperativeMagic` | — | role.cooperativeMagic 已 dump,触发 ✗ |
| D17 | 法术动画 PreMagicAnim / RNG.MKF | ✗ todo | ✗ todo | fight.c 6 个 ShowMagic*Anim + rngplay.c 全组 | — | B-w3.b follow-up |
| D18 | 战斗 UI(PlayerInfoBox / MiscMenu) | ⚠️ claimed | ✓ partial | uibattle.c 12 函数 | present/battle/* + battle-system uiState | draw-battle-ui.test.ts;M3 vertical slice 简版 |
| D19 | 战斗背景 wave / cycle / fade | ⚠️ claimed | ✓ partial | battle.c:34 `PAL_BattleDrawBackground` + 609 BattleFadeScene | present/battle/draw-battle-bg.ts | draw-battle-bg.test.ts;wave/cycle ✗ |
| D20 | 死敌 colorShift / 中毒紫色 | ✗ todo | ✗ todo | battle.c:505 `PAL_BattleDrawAllSpritesWithColorShift` | — | follow-up |
| D21 | 战斗结束 status 清 | ✗ todo | ✗ todo | global.c:2311 `PAL_ClearAllPlayerStatus` | — | finalizeBattle 未 clear |
| D22 | 偷盗 StealFromEnemy | ✗ todo | ✗ todo | fight.c:5193 `PAL_BattleStealFromEnemy` + 含 Bug-2 | — | opcode 0x6A 未做 |

## E. 脚本 / Cutscene(opcode interpreter)

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| E1 | opcode interpreter 框架 | ✓ claimed | ✓ partial | script.c:587 `PAL_InterpretInstruction` | core/event-system.ts tickEventSystem | event-system.test.ts |
| E2 | 已具名 opcode 数量 | ⚠️ claimed | ✓ partial | script.c 100+ case | core/event-system.ts | event-system + battle-opcodes test;M5 具名约 35,完整 51 unique 多个未具名 |
| E3 | 0x70 PartyWalkTo | ✓ claimed | ✓ partial | script.c:101 `PAL_PartyWalkTo` | core/event-system.ts partyWalkTo | event-system test;D36 camera viewport 改造对齐 |
| E4 | 0x10/0x11/0x82 NPC walk | ✓ claimed | ✓ partial | script.c:31 `PAL_NPCWalkTo` | core/event-system.ts npcWalkTo helper | event-system test;三 opcode 共用 helper |
| E5 | 0x6C NPC walk one step | ✓ claimed | ✓ partial | scene.c:851 `PAL_NPCWalkOneStep` | core/event-system.ts:0x6C handler | event-system test |
| E6 | 0x73 SceneFade | ✓ claimed | ✗ todo | palette.c:262 `PAL_SceneFade` | core/event-system.ts fadeScreen | 72 帧 dither port — fadeState e2e 测留 follow-up |
| E7 | 0x35 ShakeScreen | ✗ todo | ✗ todo | video.c:1030 `VIDEO_ShakeScreen` | — | stub |
| E8 | OP_SET_PALETTE | ✓ claimed | ✗ todo | palette.c:25/93 `PAL_GetPalette` / `PAL_SetPalette` | core/event-system.ts OP_SET_PALETTE handler | fetchPalette 异步注入 |
| E9 | 0x4C MonsterChasePlayer | ✗ todo | ✗ todo | script.c:310 | — | scene-system 简版接触触发替代 |
| E10 | 0x55/0x56 AddMagic/RemoveMagic | ✗ todo | ✗ todo | global.c:2084/2139 | — | 未具名 |
| E11 | 0x2D SetPlayerStatus | ⚠️ claimed | ✗ todo | global.c:2173 `PAL_SetPlayerStatus` | core/event-system.ts | 直接 mutate field,无 helper |
| E12 | 0x42 SimulateMagic | ✗ todo | ✗ todo | fight.c:5301 | — | magic 模拟不消 MP |
| E13 | 0x69 EnemyEscape | ⚠️ claimed | ✗ todo | battle.c:1376 | core/event-system.ts | stub |
| E14 | I-w1.a 宝箱加物品 | ✓ claimed | ✓ partial | global.c:1063 `PAL_AddItemToInventory` | core/event-system.ts addItemToInventory | event-system test |
| E15 | RunAutoScript NPC 自动 | ⚠️ claimed | ✗ todo | script.c:3482 | core/scene-system.ts tickAutoScripts | 简版 1 op/tick,4 状态循环 ✗ |
| E16 | PartyRideEventObject 船 / 御剑 | ✗ todo | ✗ todo | script.c:203 | — | follow-up |

## F. 存档 / 读档

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| F1 | 默认新游戏初始化 | ⚠️ claimed | ✗ todo | global.c:378 `PAL_LoadDefaultGame` | shell/bootstrap.ts createInitialGameState | hardcode default;sdlpal 真值从 SAVEDGAME slot 0 load |
| F2 | 存档到 IndexedDB | ⚠️ claimed | ✓ partial | global.c:844 `PAL_SaveGame_WIN` | core/save/api.ts saveSlot | save/api.test.ts;未跟 UI SaveSlotMenu(C8)真接通 |
| F3 | 读档从 IndexedDB | ⚠️ claimed | ✓ partial | global.c:689 `PAL_LoadGame_WIN` | core/save/api.ts loadSlot | save/api.test.ts;未跟 UI 真接通 |
| F4 | sdlpal `*.RPG` 字节兼容 | N/A | N/A | — | — | D37 决策不做 |

## G. 视觉效果

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| G1 | RLE sprite blit | ✓ claimed | ✓ partial | palcommon.c:36-446 4 个 RLE fn | pal-extract io/rle.ts + present/draw-sprite.ts | rle-decode.test.ts + draw-sprite.test.ts |
| G2 | FBP 整图 blit | ✓ claimed | ✗ todo | palcommon.c:651 `PAL_FBPBlitToSurface` | pal-extract dump FBP → png | M4 P3 |
| G3 | sprite color shift | ⚠️ claimed | ✓ partial | palcommon.c:245 `PAL_RLEBlitWithColorShift` | pal-extract io/rle.ts | rle-decode test;runtime 死敌/状态 colorShift ✗ |
| G4 | tilemap 双层渲染 | ✓ claimed | ✓ partial | map.c 全 6 fn | present/draw-tilemap.ts | draw-tilemap.test.ts |
| G5 | palette 加载 / 切换 | ✓ claimed | ✗ todo | palette.c:25/93 | event-system.ts OP_SET_PALETTE | 同 E8 |
| G6 | palette cycle 水/火 动画 | ✗ todo | ✗ todo | palette.c 相关 | — | 大世界视觉 ✗ |
| G7 | FadeIn / FadeOut 全屏 | ✗ todo | ✗ todo | palette.c:123/193 | — | ✗ |
| G8 | SceneFade 72 帧 dither | ✓ claimed | ✗ todo | palette.c:262 / video.c:1130 | event-system.ts fadeScreen | 同 E6 |
| G9 | ShakeScreen | ✗ todo | ✗ todo | video.c:1030 | — | 同 E7 |
| G10 | FadeToRed 战斗结束 | ✗ todo | ✗ todo | palette.c:595 | — | ✗ |
| G11 | ApplyWave 战场水波 | ✗ todo | ✗ todo | scene.c:365 | — | ✗ |

## H. 音频

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| H1 | BGM(MIDI/MP3/OGG/OPUS) | ✗ todo | N/A | audio.c + midi*.c + mp3/ogg/opusplay.c 全组 | — | 游戏静音运行;M6 Web Audio + SpessaSynth |
| H2 | SFX sound.c | ✗ todo | N/A | sound.c 14 fn | — | M6 |
| H3 | CD audio | ✗ todo | N/A | audio.c CD 相关 | — | M6 |

## I. 通关 / Ending

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| I1 | Ending 动画 FBP scroll | ✗ todo | N/A | ending.c 5 fn | — | M7 |
| I2 | Credits | N/A | N/A | script.c:504 `PAL_AdditionalCredits` | — | N/A |
| I3 | 通关 AVI | ✗ todo | N/A | aviplay 全组 | — | M7 |

## J. 输入

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| J1 | 键盘 8 方向 + 6 键 | ✓ claimed | ✓ partial | input.c:350 `PAL_KeyboardEventFilter` | shell/keyboard.ts + shell/input.ts | input.test.ts;M5.6 真值修正 |
| J2 | 鼠标 | ✗ todo | N/A | input.c:436 `PAL_MouseEventFilter` | — | M6 |
| J3 | 手柄 / Joystick | ✗ todo | N/A | input.c joystick 全组 | — | M6 |
| J4 | 触屏 移动支持 | ✗ todo | N/A | input.c touch 全组 | — | M6 |

## K. 数据提取 (pal-extract)

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| K1 | 14 MKF 全 chunk dump | ✓ claimed | ✓ partial | palcommon.c:855-1170 MKF 5 fn | pal-extract io/mkf.ts | pal-extract 25 test files / 210 cases |
| K2 | 295 scene resource dump | ✓ claimed | ✓ partial | map.c + scene.c | pal-extract resources/scene.ts | pal-extract tests |
| K3 | items / spells / enemies | ✓ claimed | ✓ partial | SSS.MKF chunk 2 OBJECT | pal-extract resources/object.ts | pal-extract tests |
| K4 | WORD.DAT 全 label | ⚠️ claimed | ✗ todo | text.c:966 `PAL_GetWord` | pal-extract resources/word.ts | parseWordDat 只 dump 5/7 category 漏 55 条 — 是否已修待 user 核 |
| K5 | events.json 脚本反编译 | ✓ claimed | ✓ partial | script.c opcode encoding | pal-extract events/* | pal-extract events test |

## L. 特殊物品 / 剧情系统

> 2026-05-28 user 补提,初始清单漏列。多数特殊系统在 sdlpal 通过 **item.wScriptOnUse → events.json script chain** 实现,**不是**独立 sdlpal C fn。Phase B.G7 audit 三层:opcode 够不够 / events.json script 能不能跑 / UI 子菜单有没有。

| # | 功能 | 状态 | 测试 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|---|
| L1 | 炼丹系统(紫金葫芦 + 灵葫咒) | ✗ todo | ✗ todo | 待 Phase B.G7 grep sdlpal | — | 物品交互特殊菜单 |
| L2 | 蛊虫 / 练蛊皿系统 | ✗ todo | ✗ todo | 待 Phase B.G7 grep sdlpal | — | 物品交互特殊菜单 |
| L? | (待 user 补:其他特殊系统) | ✗ todo | — | — | — | 御剑/打铁/双修/小游戏/...想到再补 |

---

## 2026-05-29 新增测试一览(防回归)

| 测试文件 | 覆盖 | case 数 |
|---|---|---|
| [equip-menu.test.ts](../packages/game/src/core/menu/equip-menu.test.ts) | EquipMenu state machine(C5)防"简版退化"+ scriptOnEquip swap chain | 16 |
| [equip-effect.test.ts](../packages/game/src/core/menu/../equip-effect.test.ts) | rgEquipmentEffect 写/清 + 6 stat getter + 木剑 swap 模拟(D14) | 14 |
| [inventory-menu.test.ts](../packages/game/src/core/menu/inventory-menu.test.ts) | **pickItemRowColor 6-case truth table**(C3,防 EquipMenu 装备类全红 bug)+ matchesFilter × ItemFilter + grid 8-key clamp + phase | 26 |
| [save-slot-menu.test.ts](../packages/game/src/core/menu/save-slot-menu.test.ts) | SaveSlotMenu 5 slot + Up/Down/Current(C8) | 8 |
| [in-game-menu.test.ts](../packages/game/src/core/menu/in-game-menu.test.ts) | InGameMenu + SystemMenu choice / cursor 记忆(C1/C2) | 10 |
| [inventory-action-menu.test.ts](../packages/game/src/core/menu/inventory-action-menu.test.ts) | 1 级 box 子菜单(装备/使用)+ defaultCursor 记忆 | 3 |
| [script-desc.test.ts](../packages/game/src/core/menu/script-desc.test.ts) | getScriptDescLines 木剑/玉佛珠真值 + 边界(C3 防"只画 _name" bug) | 6 |

**计 83 新 case,613 → 674 + 2 skip 全过**。

## sdlpal 自身 bug(audit 过程发现,ts port 时显式 fix)

| # | 描述 | sdlpal 行 |
|---|---|---|
| Bug-1 | `PAL_BattleSelectAutoTarget` 死循环 — 全敌死时无退出 while | fight.c:4500-4517 |
| Bug-2 | `PAL_BattleStealFromEnemy` 无 dead target check — R 重复偷死敌时数值 underflow | fight.c:5193+ |
