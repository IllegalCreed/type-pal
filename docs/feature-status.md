# Feature Status · type-pal

> 权威功能表。任何"完成度"表述以本文件为准,README 不再写百分比。
> 状态由 user 逐条 sdlpal 源核对后拍板,Claude 不自判。

## 状态定义

- **✓ verified**:Claude port 自认 1:1,**且** user 已逐行核对 sdlpal 源 + 拍板通过。
- **✓ claimed**:Claude port 自认 1:1,**但** user 尚未核对。带行号引用 sdlpal 待 user 拍。
- **⚠️ partial**:Claude 自知 / user 实测发现简版 / 缺真值 / 未完整 port。带具体差异说明。
- **✗ todo**:未做。
- **N/A**:by design 不 port(浏览器 canvas / Web Audio 替代 SDL/audio,DOS 兼容代码等)。

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

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| A1 | Trademark Logo | ✗ todo | main.c:179 `PAL_TrademarkScreen` | — | dev mode `?skip-intro` 跳过 |
| A2 | Splash 屏 | ✗ todo | main.c:206 `PAL_SplashScreen` | — | dev mode `?skip-intro` 跳过 |
| A3 | 开场 AVI | ✗ todo | aviplay.c 全组 9 fn | — | ffmpeg→mp4 + `<video>` follow-up |
| A4 | OpeningMenu(新游戏/读档) | ⚠️ claimed | uigame.c:83 `PAL_OpeningMenu` | core/menu/opening-menu.ts | 数据 state machine,box 坐标 + 9-slice 真值未严格对齐 |

## B. 大世界探索

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| B1 | 玩家走路 4 方向 + 步频动画 | ⚠️ claimed | scene.c:636 `PAL_UpdatePartyGestures` | core/scene-system.ts + present.ts | 走路 + UpdatePartyGestures port;真值循环动画 priority 可能偏差 |
| B2 | NPC 跟随队伍 trail | ⚠️ claimed | scene.c:779 `PAL_UpdateParty` | core/event-system.ts partyWalkTo | trail.unshift port;多 NPC 完整 trail 时序未完整测 |
| B3 | NPC 自动行走 autoScript | ⚠️ claimed | script.c:3482 `PAL_RunAutoScript` | core/scene-system.ts tickAutoScripts | 简版 1 op/tick;sdlpal 真值 4 状态循环未做 |
| B4 | 场景切换 door / trigger zone | ⚠️ claimed | play.c:107-165 fTrigger 段 | core/scene-system.ts | M5.6 加 mode-dependent Manhattan threshold(mode 4=16/5=48/6=80/7=112/8=144);未全场景验证 |
| B5 | 调查 Confirm 键 PAL_Search | ⚠️ claimed | play.c:362-510 `PAL_Search` + `PAL_GetSearchTriggerRange` | core/scene-system.ts | M5.6 13-cell range port;range 内多 NPC 优先级 sdlpal 真值未严格核 |
| B6 | NPC 对话触发 runScript | ✓ claimed | text.c:1208 `PAL_StartDialog` 全套 | core/event-system.ts runScript + dialog 状态机 | M5.Sync.2 完整 port(详见 C13) |
| B7 | 明雷怪 visible enemy | ⚠️ claimed | script.c:310 `PAL_MonsterChasePlayer` | core/scene-system.ts contact 触发 | M3.5 跟随简版;MonsterChasePlayer ✗,只接触触发 |
| B8 | tilemap 遮挡 cover tile | ✓ claimed | scene.c:77-180 `PAL_CalcCoverTiles` | present/draw-tilemap.ts addCoverTileEntries | 5×5 scan + iTileHeight bit 8-11/24-27 |
| B9 | tilemap 阻挡 block bit | ✓ claimed | scene.c:512-635 `PAL_CheckObstacle*` | core/scene-system.ts isWalkable | bit 13 + sState>=2 NPC range,M5.Sync.2 D38 |
| B10 | 295 个 scene 资源加载 | ✓ claimed | res.c:191 `PAL_LoadResources` | assets/loader.ts | M4 全 295 scene dump + dev panel 294 可跳;无增量 reload |

## C. UI / 菜单系统

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| C1 | ESC 主菜单 InGameMenu | ⚠️ claimed | uigame.c:944 `PAL_InGameMenu` | core/menu/in-game-menu.ts | M5.6 加 hub 输入路由 + box 渲染;8 item 坐标 / 渐变高亮 / DrawText 真值未完整对齐 |
| C2 | 系统菜单 SystemMenu | ⚠️ claimed | uigame.c:516 `PAL_SystemMenu` | core/menu/menu-driver.ts | 数据 + 输入接通;渲染入口未严格 sdlpal port |
| C3 | 物品菜单 InventoryMenu | ⚠️ claimed | uigame.c:878-919 `PAL_InventoryMenu` | core/menu/inventory-menu.ts | M5.6 数据 + dispatcher;1 级 box 子菜单(装备/使用)session 3 刚补,user 反馈仍不齐 |
| C4 | 物品使用菜单 ItemUseMenu | ⚠️ claimed | uigame.c:1289-1473 `PAL_ItemUseMenu` | core/menu/inventory-action-menu.ts | session 3 刚补全屏渲染 + INNER while + amount live 读;applyToAll branch / 9 装备角色 swap 未实测 |
| C5 | 装备菜单 EquipItemMenu | ⚠️ claimed | uigame.c:1794 `PAL_EquipItemMenu` | core/menu/equip-menu.ts + present/menu/draw-equip.ts | C5 (2026-05-28) 1:1 port — FBP 背景 + 6 装备槽 + 5 stat cyan + 4-case color role list + wLastUnequippedItem swap loop + scriptOnEquip 真接通(via runEquipScript)。**装备 stat 加成已生效**(rgEquipmentEffect + 6 stat getter,顺手补 D14)。phase='list' 简版 SelectionMenu 而非 grid 留 follow-up。|
| C6 | 角色状态菜单 PlayerStatus | ⚠️ claimed | uigame.c:1051-1288 `PAL_PlayerStatus` | core/menu/player-status.ts | 数据 + 渲染简版;完整字段排版 + 装备格 / 习得法术格未严格 1:1 |
| C7 | 法术菜单 InGameMagicMenu | ⚠️ claimed | uigame.c:654 `PAL_InGameMagicMenu` | core/menu/in-game-magic-menu.ts | 数据 + 输入;大世界 castMagic→effect ✗(治疗/复活非战斗 magic 未生效) |
| C8 | 存档菜单 SaveSlotMenu | ⚠️ claimed | uigame.c:169 `PAL_SaveSlotMenu` | core/menu/save-slot-menu.ts | M5.6 简版 5 slot list + Up/Down/Confirm;真 IO(IndexedDB) ✗ — 选 slot 不真存 |
| C9 | 商店 BuyMenu / SellMenu | ⚠️ claimed | uigame.c:1615 + 1755 | core/menu/shop-menu.ts | 数据层;渲染 + 真扣金 ✗ |
| C10 | 9-slice 边框 box 渲染 | ✓ claimed | ui.c:131-240 `PAL_CreateBoxWithShadow` | present/menu/draw-box.ts | M5.6 完整 port |
| C11 | 中文字体渲染 Unifont | ⚠️ claimed | font.c PALFONT 字模 | present/font.ts | M4 P4 Unifont CN port;stroke 跟 sdlpal 原 PALFONT 字模不同 — 视觉不 1:1 但功能可读 |
| C12 | 文字阴影 triple shadow | ✓ claimed | text.c:1144-1155 TEXT_DisplayText shadow 段 | render-text.ts | DOS triple / WIN95 single,sdlpal "fix" 统一 triple |
| C13 | Dialog 框 PAL_StartDialog | ✓ claimed | text.c:1208-1817 全套(StartDialog/ShowDialog/WaitForKey*/ClearDialog/EndDialog) | present/dialog-box.ts + core/event-system.ts | M5.Sync.2 完整 port |
| C14 | DrawNumber 数字 sprite | ✓ claimed | ui.c:640 `PAL_DrawNumber` | present/draw-number.ts | digit sprite + 5 color align |

## D. 战斗系统

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| D1 | 战斗启动 StartBattle | ✓ claimed | battle.c:1531 `PAL_StartBattle` | core/battle/battle-system.ts startBattle | buildBattleState + mode='battle' + emit battleStarted |
| D2 | 5 actions(攻/技/防/逃/物) | ⚠️ claimed | fight.c:3577 `PAL_BattlePlayerPerformAction` | core/battle/actions/* | 5 handler 在;BlowAway / status apply 完整真值 + R 重复 prevAction 完整 validate ✗ |
| D3 | 物理伤害公式 | ✓ claimed | fight.c:131-289 三公式 | core/battle/formulas.ts | calcBaseDamage / calcPhysicalAttackDamage,防 div by 0 |
| D4 | 法术伤害公式 | ✓ claimed | fight.c:174 `PAL_CalcMagicDamage` | core/battle/formulas.ts calcMagicDamage | 5 元素 + 抗 + fieldEffect + poison |
| D5 | 玩家 dex (haste*3 + 999) | ✓ claimed | fight.c:336 `PAL_GetPlayerActualDexterity` | core/battle/formulas.ts | classic 路径 |
| D6 | 敌人 dex ((level+6)*3+dex) | ✓ claimed | fight.c:289 `PAL_GetEnemyDexterity` | core/battle/formulas.ts | SHORT signed cast |
| D7 | ActionQueue / turn order | ⚠️ claimed | fight.c:1023 `PAL_BattlePlayerCheckReady` | core/battle/turn-queue.ts | classic 路径 ts 等价;ATB D39 不 port,status 检 PlayerCheckReady 未严格走 |
| D8 | 玩家 status(sleep/paralyze/confuse/silence/puppet) | ⚠️ claimed | fight.c:1023 + status apply 全链 | core/battle/status.ts tickStatusEffects | 每回合 -1 port;confused → attack mate / Sleep auto-pass 完整真值未严格走 |
| D9 | 敌人 AI 选 target | ⚠️ claimed | fight.c:4520 `PAL_BattleSelectEnemyTargetIndex` | core/battle/enemy-ai.ts | 简版 random;完整真值 + Bug-1 safety 未做 |
| D10 | 敌人 AI 脚本 wScriptOnReady | ✗ todo | fight.c:4551 `PAL_BattleEnemyPerformAction` | — | 54 enemy 有 wScriptOnReady,runScript 接 battle ctx 未做 — 敌人按数据 random |
| D11 | 战斗胜利 BattleWon | ⚠️ claimed | battle.c:991 `PAL_BattleWon` | core/battle/battle-system.ts finalizeBattle | exp/cash 入 gs;levelup loop while dwExp >= rgLevelUpExp ✗ + 4 段视觉 box ✗ |
| D12 | 战斗逃跑 PlayerEscape | ⚠️ claimed | battle.c:1438 `PAL_BattlePlayerEscape` | core/battle/actions/flee.ts | 简版 fleeRate vs enemy.dex;BOSS 不许逃 + party 综合 fleeRate ✗ |
| D13 | 敌人主动逃 EnemyEscape | ✗ todo | battle.c:1376 `PAL_BattleEnemyEscape` | — | opcode 0x69 stub |
| D14 | 装备 stat 加成 UpdateEquipments | ⚠️ claimed | global.c:1333 `PAL_UpdateEquipments` | core/equip-effect.ts | C5 (2026-05-28) 顺手补 — `updateAllEquipments` bootstrap 起手调,跨 role × 6 part 同步跑 scriptOnEquip 写 rgEquipmentEffect;6 effective stat getter(`getPlayerAttackStrength` 等)消费。**player-status / item-use UI 已切真 getter**。opcode 0x17/0x18 真做 + RemoveEquipmentEffect helper port。**残留**:opcode 0x2D (5 次) / 0x29 (2 次) scriptOnEquip 内未处理(log skip,follow-up);Hand 卸下 DualAttack status reset 未做(留 D15 poison/status 整组)。|
| D15 | poison 系统 rgPoisonStatus[16][6] | ✗ todo | global.c:1459-1735 5 fn | — | M5 简版只 status field,真 poison 二维数组未做 |
| D16 | 协力法术 CooperativeMagic | ✗ todo | global.c:2013 `PAL_GetPlayerCooperativeMagic` | — | role.cooperativeMagic 已 dump,触发 ✗ |
| D17 | 法术动画 PreMagicAnim / RNG.MKF | ✗ todo | fight.c 6 个 ShowMagic*Anim + rngplay.c 全组 | — | B-w3.b follow-up |
| D18 | 战斗 UI(PlayerInfoBox / MiscMenu) | ⚠️ claimed | uibattle.c 12 函数 | present/battle/* + battle-system uiState | M3 vertical slice 简版;uibattle.c 12 函数完整真值未对齐 |
| D19 | 战斗背景 wave / cycle / fade | ⚠️ claimed | battle.c:34 `PAL_BattleDrawBackground` + 609 BattleFadeScene | present/battle/draw-battle-bg.ts | 静态;wave/cycle animate ✗ + BattleFadeScene ✗ |
| D20 | 死敌 colorShift / 中毒紫色 | ✗ todo | battle.c:505 `PAL_BattleDrawAllSpritesWithColorShift` | — | follow-up |
| D21 | 战斗结束 status 清 | ✗ todo | global.c:2311 `PAL_ClearAllPlayerStatus` | — | finalizeBattle 未 clear |
| D22 | 偷盗 StealFromEnemy | ✗ todo | fight.c:5193 `PAL_BattleStealFromEnemy` + 含 Bug-2 | — | opcode 0x6A 未做 |

## E. 脚本 / Cutscene(opcode interpreter)

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| E1 | opcode interpreter 框架 | ✓ claimed | script.c:587 `PAL_InterpretInstruction` | core/event-system.ts tickEventSystem | 主循环 + raw skip 兜底 |
| E2 | 已具名 opcode 数量 | ⚠️ claimed | script.c 100+ case | core/event-system.ts | M5 具名约 35 个;sdlpal 完整 51 unique,70+ raw skip 未具名 — 大量未实测 |
| E3 | 0x70 PartyWalkTo | ✓ claimed | script.c:101 `PAL_PartyWalkTo` | core/event-system.ts partyWalkTo | D36 camera viewport 改造对齐 |
| E4 | 0x10/0x11/0x82 NPC walk | ✓ claimed | script.c:31 `PAL_NPCWalkTo` | core/event-system.ts npcWalkTo helper | 三 opcode 共用 helper |
| E5 | 0x6C NPC walk one step | ✓ claimed | scene.c:851 `PAL_NPCWalkOneStep` | core/event-system.ts:0x6C handler | dir*N+iFrame + 2/3 重映射,M5.Sync.2 91dc2e2 |
| E6 | 0x73 SceneFade | ✓ claimed | palette.c:262 `PAL_SceneFade` | core/event-system.ts fadeScreen | 72 帧 dither port |
| E7 | 0x35 ShakeScreen | ✗ todo | video.c:1030 `VIDEO_ShakeScreen` | — | stub |
| E8 | OP_SET_PALETTE | ✓ claimed | palette.c:25/93 `PAL_GetPalette` / `PAL_SetPalette` | core/event-system.ts OP_SET_PALETTE handler | fetchPalette 异步注入 |
| E9 | 0x4C MonsterChasePlayer | ✗ todo | script.c:310 | — | scene-system 简版接触触发替代 |
| E10 | 0x55/0x56 AddMagic/RemoveMagic | ✗ todo | global.c:2084/2139 | — | 未具名 |
| E11 | 0x2D SetPlayerStatus | ⚠️ claimed | global.c:2173 `PAL_SetPlayerStatus` | core/event-system.ts | 直接 mutate field,无 helper |
| E12 | 0x42 SimulateMagic | ✗ todo | fight.c:5301 | — | magic 模拟不消 MP |
| E13 | 0x69 EnemyEscape | ⚠️ claimed | battle.c:1376 | core/event-system.ts | stub |
| E14 | I-w1.a 宝箱加物品 | ✓ claimed | global.c:1063 `PAL_AddItemToInventory` | core/event-system.ts addItemToInventory | M5 完整 port |
| E15 | RunAutoScript NPC 自动 | ⚠️ claimed | script.c:3482 | core/scene-system.ts tickAutoScripts | 简版 1 op/tick,4 状态循环 ✗ |
| E16 | PartyRideEventObject 船 / 御剑 | ✗ todo | script.c:203 | — | follow-up |

## F. 存档 / 读档

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| F1 | 默认新游戏初始化 | ⚠️ claimed | global.c:378 `PAL_LoadDefaultGame` | shell/bootstrap.ts createInitialGameState | hardcode default;sdlpal 真值从 SAVEDGAME slot 0 load |
| F2 | 存档到 IndexedDB | ⚠️ claimed | global.c:844 `PAL_SaveGame_WIN` | core/save/api.ts saveSlot | JSON;未跟 UI SaveSlotMenu(C8)真接通 |
| F3 | 读档从 IndexedDB | ⚠️ claimed | global.c:689 `PAL_LoadGame_WIN` | core/save/api.ts loadSlot | JSON;未跟 UI 真接通 |
| F4 | sdlpal `*.RPG` 字节兼容 | N/A | — | — | D37 决策不做,只 JSON+IndexedDB |

## G. 视觉效果

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| G1 | RLE sprite blit | ✓ claimed | palcommon.c:36-446 4 个 RLE fn | pal-extract io/rle.ts + present/draw-sprite.ts | extract 时解 RLE + runtime blit |
| G2 | FBP 整图 blit | ✓ claimed | palcommon.c:651 `PAL_FBPBlitToSurface` | pal-extract dump FBP → png | M4 P3 |
| G3 | sprite color shift | ⚠️ claimed | palcommon.c:245 `PAL_RLEBlitWithColorShift` | pal-extract io/rle.ts | extract 时已 port;runtime 死敌/状态 colorShift ✗ |
| G4 | tilemap 双层渲染 | ✓ claimed | map.c 全 6 fn | present/draw-tilemap.ts | M2/M5.P0 全 port |
| G5 | palette 加载 / 切换 | ✓ claimed | palette.c:25/93 | event-system.ts OP_SET_PALETTE | 同 E8 |
| G6 | palette cycle 水/火 动画 | ✗ todo | palette.c 相关 | — | 大世界视觉 ✗ |
| G7 | FadeIn / FadeOut 全屏 | ✗ todo | palette.c:123/193 | — | ✗ |
| G8 | SceneFade 72 帧 dither | ✓ claimed | palette.c:262 / video.c:1130 | event-system.ts fadeScreen | 同 E6 |
| G9 | ShakeScreen | ✗ todo | video.c:1030 | — | 同 E7 |
| G10 | FadeToRed 战斗结束 | ✗ todo | palette.c:595 | — | ✗ |
| G11 | ApplyWave 战场水波 | ✗ todo | scene.c:365 | — | ✗ |

## H. 音频

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| H1 | BGM(MIDI/MP3/OGG/OPUS) | ✗ todo | audio.c + midi*.c + mp3/ogg/opusplay.c 全组 | — | 游戏静音运行;M6 Web Audio + SpessaSynth |
| H2 | SFX sound.c | ✗ todo | sound.c 14 fn | — | M6 |
| H3 | CD audio | ✗ todo | audio.c CD 相关 | — | M6 |

## I. 通关 / Ending

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| I1 | Ending 动画 FBP scroll | ✗ todo | ending.c 5 fn | — | M7 |
| I2 | Credits | N/A | script.c:504 `PAL_AdditionalCredits` | — | N/A |
| I3 | 通关 AVI | ✗ todo | aviplay 全组 | — | M7 |

## J. 输入

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| J1 | 键盘 8 方向 + 6 键 | ✓ claimed | input.c:350 `PAL_KeyboardEventFilter` | shell/keyboard.ts + shell/input.ts | M5.6 真值修正(Esc/Alt/Insert → Menu) |
| J2 | 鼠标 | ✗ todo | input.c:436 `PAL_MouseEventFilter` | — | M6 |
| J3 | 手柄 / Joystick | ✗ todo | input.c joystick 全组 | — | M6 |
| J4 | 触屏 移动支持 | ✗ todo | input.c touch 全组 | — | M6 |

## K. 数据提取 (pal-extract)

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| K1 | 14 MKF 全 chunk dump | ✓ claimed | palcommon.c:855-1170 MKF 5 fn | pal-extract io/mkf.ts | M4;STUFF/SAVE.MKF N/A(WIN95+ .RPG) |
| K2 | 295 scene resource dump | ✓ claimed | map.c + scene.c | pal-extract resources/scene.ts | M4 |
| K3 | items / spells / enemies | ✓ claimed | SSS.MKF chunk 2 OBJECT | pal-extract resources/object.ts | M1(235/102/153) |
| K4 | WORD.DAT 全 label | ⚠️ claimed | text.c:966 `PAL_GetWord` | pal-extract resources/word.ts | M5.6 audit 发现 parseWordDat 只 dump 5/7 category,漏 55 条 sys/UI label — 是否已修待 user 核 |
| K5 | events.json 脚本反编译 | ✓ claimed | script.c opcode encoding | pal-extract events/* | M1 events schema + 全 295 scene |

## L. 特殊物品 / 剧情系统

> 2026-05-28 user 补提,初始清单漏列。多数特殊系统在 sdlpal 通过 **item.wScriptOnUse → events.json script chain** 实现,**不是**独立 sdlpal C fn。Phase B.G7 audit 三层:opcode 够不够 / events.json script 能不能跑 / UI 子菜单有没有。

| # | 功能 | 状态 | sdlpal 真值出处 | ts 路径 | 备注 / 差异 |
|---|---|---|---|---|---|
| L1 | 炼丹系统(紫金葫芦 + 灵葫咒) | ✗ todo | 待 Phase B.G7 grep sdlpal | — | 物品交互特殊菜单 |
| L2 | 蛊虫 / 练蛊皿系统 | ✗ todo | 待 Phase B.G7 grep sdlpal | — | 物品交互特殊菜单 |
| L? | (待 user 补:其他特殊系统) | ✗ todo | — | — | 御剑/打铁/双修/小游戏/...想到再补 |

---

## sdlpal 自身 bug(audit 过程发现,ts port 时显式 fix)

| # | 描述 | sdlpal 行 |
|---|---|---|
| Bug-1 | `PAL_BattleSelectAutoTarget` 死循环 — 全敌死时无退出 while | fight.c:4500-4517 |
| Bug-2 | `PAL_BattleStealFromEnemy` 无 dead target check — R 重复偷死敌时数值 underflow | fight.c:5193+ |
