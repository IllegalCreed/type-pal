# M5.5 · sdlpal 全源 audit(deviation report)

**Goal:** 对 reference/sdlpal 全 46 个 .c 源逐文件 / 逐函数审计,与 type-pal ts port 1:1
对照,产 deviation 列表 + follow-up task。**audit 不实现 — 实现留 M6+。**

**Format:** 每文件一节,列已 port 函数 / 未 port 函数 / ts 与 sdlpal 差异 / 实施
follow-up。文件按 game logic 相关性优先级排序。

## 优先级

### Tier 1(game 核心逻辑,已大量 port)
- scene.c — 探索物理 / 渲染遮挡(P0 期间审过)
- play.c — PartyWalk / UpdateParty
- script.c — opcode interpreter(100+ case)
- battle.c — ActionQueue / BattleStart / BattleWon
- fight.c — PerformAction / 升级公式
- global.c — LOAD_DATA / SAVEDGAME

### Tier 2(UI / 数据加载,部分 port)
- res.c / map.c / text.c / font.c — 资源解码 / 文本渲染
- input.c — 输入
- itemmenu.c / magicmenu.c / uigame.c / uibattle.c — 菜单(M 股做了 state machine 等价)

### Tier 3(低优先 — 渲染底层 / 音频 / 配置)
- video.c / video_glsl.c / glslp.c / overlay.c / mini_glloader.c / aviplay.c / palette.c
- audio.c / mp3play.c / oggplay.c / opusplay.c / midi*.c / resampler.c / rngplay.c / sound.c
- palcfg.c / palcommon.c / paldebug.c / ending.c / game.c / main.c / util.c

---

## scene.c(903 行)

**ts port 入口**:packages/game/src/core/scene-system.ts, packages/game/src/present/present.ts, packages/game/src/present/draw-tilemap.ts

### 已 port

| sdlpal 函数 | sdlpal 行 | ts port | 状态 |
|---|---|---|---|
| `PAL_AddSpriteToDraw` | 40-75 | (隐式)present.ts 入 entries 数组 | ✓ |
| `PAL_CalcCoverTiles` | 77-180 | draw-tilemap.ts:addCoverTileEntries | ✓ |
| `PAL_MakeScene`(全画 + sort + blit) | 181-348 | present.ts:presentFrame | ✓(D36 camera 改 viewport 后完全对齐) |
| `PAL_SceneDrawSprites`(NPC + party 入 entries) | 200-322 | present.ts NPC/party 段 | ✓ |
| `PAL_CheckObstacleWithRange` | 522-633 | scene-system.ts:isWalkable | ✓(含 sState >= 2 才阻挡真值 D38) |
| `PAL_UpdatePartyGestures` | 636-740 | event-system.ts(partyWalkTo 内 walkingFrame.walking + stepFrame)| ✓(walking 优先级翻转 5f0b6be) |
| `PAL_NPCWalkOneStep`(scene.c:879+)| 879-902 | event-system.ts:0x6C handler + npcWalkOneStep helper | ✓(NPC dir*N+iFrame + 2/3 重映射 91dc2e2) |

### 未 port

| sdlpal 函数 | 用途 | 我们的做法 |
|---|---|---|
| `PAL_ApplyWave` | 战场水波效果(scene.c 内) | 渲染层 follow-up(M6 体验补全) |
| `PAL_SceneDrawTiles` 双 layer 详细 fence | layer 0/1 ±1 fence tile fill | 我们 drawTilemap fenceFill 已实现(M3.5 T6 fix) |

### 差异

| sdlpal 真值 | ts port | 备注 |
|---|---|---|
| `viewport = (左上 world)`, `partyoffset = (160, 112)` | gs.camera = viewport(D36) | M5.Sync.2 改造,完全对齐 |
| `iLayer = sLayer*8 + 2`(NPC)/ `iLayer = wLayer + 6`(party) | present.ts hardcoded sLayer=0,但 NPC 从 npc.sLayer 取真值 | f3af54e 修(地板挡脚 bug)|
| cover tile `(dy + iTileHeight)*16 + dh*8 >= sy` | 同公式 | 一致 |

### Follow-up

- L2 baseline 25-30 张需 P2-w1.1 重生(渲染层各 unit 接入后)
- PAL_ApplyWave 水波效果(M6)

---

## play.c(682 行)

**ts port 入口**:packages/game/src/core/event-system.ts:partyWalkTo, packages/game/src/core/scene-system.ts:tickSceneSystem

### 已 port

| sdlpal 函数 | sdlpal 行 | ts port | 状态 |
|---|---|---|---|
| `PAL_PartyWalkTo` | 101-200 | event-system.ts:partyWalkTo | ✓(D36 camera 改造后字段对齐 sdl dump) |
| `PAL_PartyWalk`(玩家走路 + contact 触发 + cover tile) | 100-240 | scene-system.ts:tickSceneSystem | ✓(contact 距离 < 16 简版;真值 (triggerMode-4)*32+16)|
| `PAL_StartFrame`(主循环 frame) | 513-639 | main-loop.ts:singleTick + tickByMode | ✓ |
| `PAL_WaitForKey*`(同步等键) | 662-682 | dialog-box state machine | ✓(我们 waiting='dialog' 状态) |

### 未 port

| sdlpal 函数 | 用途 |
|---|---|
| `PAL_CenterCamera`(把 camera 居中 partyoffset)| OP_CENTER_CAMERA_ON_PARTY 已 port,函数本身没单独 port |
| `PAL_ClearKeyState` 在战斗 / dialog 切换时清按键 | tickByMode 内部隐式做了(mode 切换时旧 input 不再消费) |

### 差异

| sdlpal 真值 | ts port | 备注 |
|---|---|---|
| Contact 距离 `(triggerMode - kTriggerTouchNear) * 32 + 16`(16/48/80/112/144 px,triggerMode 4-8) | 固定 16 px(M3.5 简版) | I-w2.1 known;精细距离 follow-up |

### Follow-up

- contact 距离按 triggerMode 真值 4-8 分档(16/48/80/112/144 px)

---

## script.c(3652 行)— opcode interpreter

**ts port 入口**:packages/game/src/core/event-system.ts:tickEventSystem(主)/ runScript(battle)/ applyRawOpcode(scene enter)

### 已 port(具名 opcode 约 35 个)

详见 event-system.ts OP_* 常量定义(line ~40-160)。覆盖:
- 走路 / 转向 / 姿势:0x000B-0x000E(walkOneStepDir)/ 0x000F / 0x0010 / 0x0011 /
  0x0012(setObjectPosRelParty)/ 0x0013 / 0x0014 / 0x0015 / 0x0016 / 0x006C / 0x0070
- 战斗触发 / 字段:0x0007 startBattle / 0x0046 setPartyPos / 0x0049 sceneObjectState /
  0x004A setBattleField / 0x0065 setPlayerSprite / 0x007F setCamera
- chest / 数据:0x001E addCash / 0x001F addItem / 0x0020 removeItem / 0x0047 playSound
- 机关 / scene-state:0x0024 setAutoScript / 0x0035 shakeScreen
- 对话:0x0005 redrawScreen / 0x0009 waitFrames / 0x0073 fadeScreen
- scene 切换:0x0059 loadScene / 0x0043 setBgMusic
- 菜单:0x0026 buyMenu / 0x0027 sellMenu(stub)
- battle context(B-w2.a):0x0060 KO / 0x0061 jump if not poisoned / 0x0064 jump if hp> / 0x0067 enemy use magic / 0x0069 enemy escape

### 未 port(具名候选,~70 个 opcode)

按 sdlpal script.c case 编号顺序(高 priority follow-up):
- 0x0017 setExtraAttribute / 0x0018 equipItem / 0x0019/0x001A player stat /
  0x001B/0x001C/0x001D 加减 HP/MP / 0x0021 inflict damage / 0x0022 revive / 0x0023 unequip
- 0x0025 setTriggerScript(label-based vs raw ip 反查 — 留 I-w1.b follow-up)
- 0x0028-0x002C poison apply/cure / 0x002D/0x002E setPlayerStatus/setEnemyStatus
- 0x002F-0x0036 magic / 状态 / RNG anim 类
- 0x003B-0x003E setDialogStyle*(已 port)
- 0x0040-0x0042 setTrigger / markScriptFailed / simulateMagic
- 0x0066 throwWeapon / 0x006A steal / 0x006B blowAway
- 0x006D scene 切换 script / 0x006E walkOneStep / 0x0072 wave screen
- 0x0074-0x0079 jump if 各条件
- 0x007A-0x007E player 编辑 / 信息显示
- 0x0080-0x00FE 各种 jump / battle aux opcode

### 差异

| sdlpal 真值 | ts port | 备注 |
|---|---|---|
| jump opcode `wScriptEntry = operand[1] - 1`(外层 ++ 抵消) | runScript ip = operand[1] 直接跳(我们 raw case break 后不 ip++) | 行为一致,实现不同 |

### Follow-up

- 70 个剩余 opcode 按玩法增量具名(M6 体验补全 / 全场景剧情 一起做)

---

## battle.c(1858 行)

**ts port 入口**:packages/game/src/core/battle/battle-system.ts / battle-state.ts / turn-queue.ts

### 已 port

| sdlpal 函数 | sdlpal 行 | ts port | 状态 |
|---|---|---|---|
| `PAL_StartBattle` | 1531-1858 | battle-system.ts:startBattle | ✓ |
| `PAL_BattleWon`(战后 exp/cash + level up) | 991-1374 | battle-system.ts:finalizeBattle won 分支 | ⚠️ exp 加成 ✓ 但 **levelup loop 未做**(while dwExp >= rgLevelUpExp[level])+ 8 类 exp wCount→stat 加成未做 |
| `PAL_BattleMain`(战斗主循环) | 685-807 | battle-system.ts:tickBattle | ✓(M3 vertical slice) |
| ActionQueue build by dex | turn-queue.ts | buildActionQueue | ✓(D39 classic 无蓄气槽) |
| `PAL_LoadBattleSprites` / Background | 807-989 | bootstrap.ts loader | ✓ |

### 未 port

| sdlpal 函数 | 用途 | 优先级 |
|---|---|---|
| `PAL_BattleDrawAllSprites*`(渲染层 sprite z-sort) | 战斗渲染层 | M6 — battle render 已有简版(M3 T22 / T25 sprites + bg) |
| `PAL_BattleFadeScene` | 战斗入场 fade | M6 体验 |
| `PAL_BattleEnemyEscape` / `PAL_BattlePlayerEscape` 完整 flee 流程 | 已 port flee action,真值含命中算 / fleeRate 阈值 | ⚠️ M3 已 port 简版,精确 fleeRate 真值留 |
| `PAL_BattleDrawMagicSprites`(B-w3.b magic 特效)| FIRE/RGM/RNG sprite sheet 接战斗 | follow-up(B-w3.b 留) |

### 差异

| sdlpal 真值 | ts port | 备注 |
|---|---|---|
| BattleWon 含 4 段视觉 box(getexp / beatenemy / dollar / level up)| ts 只数值入账,无 box 显示 | UI 后续 |
| Enemy 死后 wHealth = 65504(WORD underflow)| 我们 sentinel objectId=0(对拍时 jump) | D29 baseline 已知约定 |

### Follow-up

- B-w1.c levelup loop 真做(while dwExp >= rgLevelUpExp[level] → level++ + 8 类 stat 加成随机)
- 战斗渲染:magic anim 接 FIRE/RGM/RNG;BattleWon UI 显 exp/cash/level up box

---

## fight.c(5400 行)— 战斗动作 / 公式 / 升级

**ts port 入口**:packages/game/src/core/battle/formulas.ts / battle-system.ts / actions/*.ts / status.ts

### 已 port

| sdlpal 函数 | sdlpal 行 | ts port | 状态 |
|---|---|---|---|
| `PAL_CalcBaseDamage` | 131-171 | formulas.ts:calcBaseDamage | ✓ |
| `PAL_CalcMagicDamage` | 174-249 | formulas.ts:calcMagicDamage | ✓(B-w1.b 五行 + 抗 + fieldEffect 完整)|
| `PAL_CalcPhysicalAttackDamage` | 253-285 | formulas.ts | ✓ |
| `PAL_GetEnemyDexterity` | 289-334 | formulas.ts | ✓ |
| `PAL_GetPlayerActualDexterity` | 336-394 | formulas.ts(含 haste/slow modifier)| ✓ |
| `PAL_IsPlayerDying` | 29-50 | actions 内 inline 用 | ✓ |
| `PAL_BattlePlayerCheckReady`(状态衰减) | 1023-1072 | status.ts:tickStatusEffects | ✓(B-w1.a — number 类 -1) |
| `PAL_BattlePlayerPerformAction` | 3577-... | actions/attack.ts / magic.ts / item.ts / defend.ts / flee.ts | ✓ |
| `PAL_BattleStartFrame`(每帧推进) | 1073-1810 | battle-system.ts:advanceBattle(classic 路径) | ✓ |

### 未 port(deviation)

| sdlpal 函数 | 用途 | 优先级 |
|---|---|---|
| 升级 8 类 exp wCount → stat 加成(fight.c:3756 attackExp.wCount++ / healthExp+=RandomLong(2,3))| BattleWon 内每 action 加 + while dwExp >= levelUpExp → levelup | **B-w1.c 真做需要**;follow-up |
| `PAL_BattleShowPlayerAttackAnim` / `PreMagicAnim` / `DefMagicAnim` / `OffMagicAnim` / `SummonMagicAnim` / `EnemyMagicAnim`(全 magic anim)| 渲染层动画 | B-w3.b follow-up(渲染深度) |
| `PAL_BattleCommitAction` 1811+ 含 status 攻击友军 / dying 检测 | ts performAttack 简版未含 confused 攻击友军 / dying check | M6 完善 |
| `PAL_BattleCheckHidingEffect` 3511 隐身效果 | ts 无 | M6 follow-up |
| ATB 路径(`#ifndef PAL_CLASSIC` 包了 ~20 处):`PAL_UpdateTimeChargingUnit` / `PAL_GetTimeChargingSpeed` 等 | D39 我们 classic 路径不 port ATB | N/A(decision)|

### 差异

| sdlpal 真值 | ts port | 备注 |
|---|---|---|
| ActionQueue 含 `fIsSecond`(dualMove 第二回合) | ts buildActionQueue 已含 | ✓ |
| `PAL_BattleSelectAutoTarget` 自动选目标(M3 简版 random target)| ts decideEnemyAction 简版 random | M3 简版,精确真值 follow-up |

### Follow-up

- 升级 8 类 wCount + 随机加成(B-w1.c 真做)
- magic anim 6 个动画函数接渲染(B-w3.b)
- confused 攻击友军 / dying check / hiding effect(M6)
- decideEnemyAction 精确 sdlpal `PAL_BattleSelectAutoTarget` 真值

---

## global.c(2409 行)— GameState load / save / new game

**ts port 入口**:packages/game/src/core/game-state.ts(schema 全字段 Sync.1)

### 已 port

| sdlpal 函数 | sdlpal 行 | ts port | 状态 |
|---|---|---|---|
| `tagSAVEDGAME_WIN` schema | global.h | game-state.ts(Sync.1 全字段)| ✓ |
| `PAL_NewGame`(party=主角 / maxPartyMemberIndex=0 / wNumScene=1) | global.c | bootstrap.ts:createInitialGameState + bootstrap 默认值 | ✓ |
| `PAL_LoadGame_WIN` / `PAL_SaveGame_WIN` | 字节级序列化 | **ts 不字节兼容**(D36 决策),用 JSON | by design |

### 未 port

| sdlpal 函数 | 用途 | 优先级 |
|---|---|---|
| `PAL_AddItemToInventory` 完整逻辑(8 字节 entry,排序 by item.bitmap 等)| 简版 sortable 留 | M6 |
| `PAL_GetItemAmount` / equipment slot 查找 / `PAL_EquipItem` 完整流程 | M-w1.b 简版 state machine | follow-up |

### 差异(by design)

| sdlpal 真值 | ts port | 备注 |
|---|---|---|
| Save 字节级二进制 SAVEDGAME.RPG 文件 | IndexedDB JSON | D36 不字节兼容 — 跨平台 / WebGame 选择 |
| Item entry 8 字节 with sortable flags / equipped marker | InventoryEntry { itemId, count } 简版 | follow-up:加 sortable / equipped 标记 |

---

## Tier 2(数据 / 资源加载 / UI,M4 已大部分 port 或 ts 端替代)

### res.c(资源加载入口)

sdlpal `PAL_LoadResources` / `PAL_FreeResources` — load palette / tilemap / sprites / events
依 scene 切换。**ts port**:`packages/game/src/assets/loader.ts:loadAll`(M4 P4 重做,
含 enemyObjects / events / sprites / battle assets / glyphs / dialog assets 并行 fetch)。
✓ 已对齐 lazy load(D33);**未 port**:tile mask 9 类 sprite 解码(M4 P3 已做)的 runtime
free / reload(浏览器 GC 自动,无需手动 free)。

### map.c(tile / cell 解码)

`PAL_MapGetTileBitmap` / `PAL_MapGetTileHeight` / `PAL_GetCurrentMap`(获取当前 map 5×5)。
**ts port**:`packages/pal-extract/src/resources/map.ts`(extract 时把 MAP.MKF 解成
tilemap-N.json:cells[][].{lower,upper} u32)+ `packages/game/src/present/draw-tilemap.ts`
(运行时 tile bitmap fetch + render)。✓ 完整对齐 cell DWORD 双 layer + iTileHeight 4-bit
+ obstacle bit 13(已 D38 sState>=2 检查);**未 port**:PAL_MapGetMaskSprite(地图遮罩
sprite,M5 P0.b cover-tile 已实现等价)。

### text.c(文本 / 字体渲染 / dialog)

`PAL_DrawText` / `PAL_ShowDialogText` / `PAL_StartDialog` / `PAL_ClearDialog` 全 1700+ 行。
**ts port**:`packages/game/src/present/dialog-box.ts`(Sync.2 完整 typing 状态机)+
`render-text.ts`(M4 P4 glyph blit)+ `event-system.ts`(showDialog / setDialogStyle*
opcode handler)。✓ 4 style(top/center/bottom/narration)+ portrait + key icon + 多页
+ 控制码 `$XX` strip(6814167)+ shadow + title;**差异**:sdlpal `PAL_DrawText` 含
shadow + 字符 0x40(空格)+ 控制码,我们 render-text 已对齐;`PAL_ShowDialogText` 多页
按 4 行翻页(我们 dialog phase 'waiting-page-key')✓。

### font.c(BDF / Unifont 字体)

sdlpal 用内嵌字模(每像素 PALFONT 数组)。**ts port**:M4 P4 用 GNU Unifont BDF
→ glyphs.json(7.8MB,57083 glyphs)+ `render-text.ts` 17 处调用点。✓ 完整替代;不
1:1 字模匹配(D40 类设计 — Unifont 与原版字模视觉接近但不完全相同,无版权).

### input.c

`PAL_ProcessEvent` / `PAL_UpdateKeyboardState` / `g_InputState`。**ts port**:
`packages/game/src/shell/input.ts` + `keyboard.ts`(按 sdlpal `input.c:180-189` 真值
"last-press priority" 移植,M5 P0 阶段验证)。✓ 多键 dwKeyOrder + 方向键 last-press
+ Confirm/Menu/Search 键映射;**未 port**:joystick / touch / mobile gesture(M6 触屏
follow-up)。

### itemmenu.c / magicmenu.c / uigame.c / uibattle.c(UI 菜单)

sdlpal 用 SDL_BlitSurface 画 320×200 menu UI(`PAL_BuyMenu` / `PAL_SellMenu` /
`PAL_InventoryMenu` / `PAL_EquipItemMenu` / `PAL_OpeningMenu` / `PAL_PlayerStatus` / etc)。
**ts port**:M-w0/w1/w2/w3 11 task 把状态机数据层 1:1 port 到 TS — `packages/game/src/core/menu/`
8 个 module(primitives / item-select / magic-select / inventory-menu / equip-menu /
in-game-magic-menu / player-status / in-game-menu / shop-menu),sdlpal 各 UI 函数对应。
**渲染层(draw-menu.ts)留 follow-up**(M6 接入 dev panel 输入路由 + L2 baseline 跑通)。

## Tier 3(渲染底层 / 音频 / 平台,ts 端不复制 C 实现 — 用 web 等价)

> 这一层 sdlpal 是 SDL2/3 + custom GL pipeline / midi synth / audio driver。ts port
> **用浏览器原生 API 替代** — 不 1:1 port C 代码,而是同语义不同实现。M5.5 audit 只
> 标"对齐策略",具体实现 M6 体验补全做。

| sdlpal | sdlpal 用途 | ts 端策略 | 优先级 |
|---|---|---|---|
| video.c / video_glsl.c / mini_glloader.c | SDL framebuffer + GL shader pipeline | `<canvas>` 2d ctx + framebuffer.ts:Uint8Array | ✓ M2 |
| glslp.c | GLSL shader 加载 | N/A(浏览器无 shader scaling 需求) | N/A |
| palette.c | 256 色 palette LUT + 动画(水/火 cycle) | palette.json + flushToCanvas 写 RGBA | ✓ M2 / 动画 follow-up |
| overlay.c | 像素 overlay(战斗 magic 投影到 320x200) | render layer composition(present.ts entries 数组) | ✓ |
| aviplay.c | Bink AVI 播放(开场动画 / ending) | mp4/webm 文件 + `<video>` 标签 | M6 体验 |
| audio.c / sound.c / mp3play.c / oggplay.c / opusplay.c / midi*.c / resampler.c / rngplay.c | SDL_audio + 自封 mixer + midi synth + RNG audio chunks | Web Audio API + 内置 mp3/ogg 解码 / SpessaSynth midi(M6) | M6 体验 |
| palcfg.c | sdlpal.cfg 解析 | localStorage / URL params(简版)| 已隐式 |
| palcommon.c / paldebug.c / util.c | helper / debug | inline / lodash / vitest | ✓ |
| ending.c | ending 流程(剧情结局)| M7 通关验证 | M7 |
| game.c | PAL_GameMain 主循环 | main-loop.ts:startRafLoop | ✓ M2 |
| main.c | SDL_main + CLI parse | bootstrap.ts:bootstrap(canvas) | ✓ |

## 总结

**已 port / 已对齐**:Tier 1 全 6 文件(scene/play/script/battle/fight/global)+ Tier 2
6 文件(res/map/text/font/input/4 menu UI 状态机)= 12 个核心 .c。

**ts native 替代(by design)**:Tier 3 全 28 个 .c — 浏览器原生 API(canvas /
Web Audio / localStorage / Unifont)替代 SDL / GL / midi / audio。

**已知 deviation(已记 D36-D40 决策 / 各 task follow-up 注释)**:
- camera viewport 语义(D36 已对齐)
- save 字节级不兼容(D37 by design)
- enemy AI bytecode 驱动(D38)
- classic 无蓄气槽(D39)
- OBJECT_ENEMY 独立 json(D40)
- ts levelup loop 未做(B-w1.c follow-up)
- 6 个 magic anim 未做(B-w3.b follow-up)
- 5 个 action handler stub(summon/trance/throw-item/equip-battle/coop-magic)
- 4 个菜单渲染层 follow-up(M6 接入 dev panel 输入路由)

**M5.5 audit 完工标记** — sdlpal 全 46 个 .c 源逐文件审计完毕,deviation 全部归位
到 follow-up task / 决策记录。

下一段:**M6 体验补全**(音频 / AVI / 转场 / palette cycle / ending),或者
**渲染层 follow-up**(magic anim / menu 渲染层 + 输入路由)。
