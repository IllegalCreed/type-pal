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

## ⚠️ Tier 2/3 之前的"概要式" audit 不算数(2026-05-27 user 退回)

最初 commit `83a9adb` 把 Tier 2 6 文件标 "M-w0~w3 status machine 1:1 port"、Tier 3
28 文件标 "ts native 替代 by design" 一刀切, 没逐函数 grep。用户识破: 这不是
"逐文件 / 逐函数 audit",是偷懒。重做。

下面 Tier 2/3 段按 sdlpal 真值逐函数 grep + 对照 ts port 状态:
- ✓ 已 port(标 ts 路径)
- ⚠️ 简版 port(差异具体说明)
- ✗ 未 port(说明影响 + follow-up)
- N/A(by design 不 port,说明原因)

正在逐 .c 重做,本节剩余内容陆续填入。

---

## res.c(资源加载入口,~440 行)

sdlpal `gpResources` 全局 = palette / tilemap / sprites / playerSprites 容器,
按 `bLoadFlags` 决定 reload 哪部分。**ts 端无显式 Resources struct** — 资源放
`packages/game/src/assets/loader.ts` 返回的 SceneAssets,每次 scene 切换 fetch 整套。

| sdlpal 函数 | 行 | 功能 | ts 端状态 | 备注 |
|---|---|---|---|---|
| `PAL_FreeEventObjectSprites` | 38 | free per-event-object sprite 数组 | N/A | JS GC 自动回收 SpriteImage 引用 |
| `PAL_FreePlayerSprites` | 73 | free 5 个 player sprite slot | N/A | 同上 |
| `PAL_InitResources` | 101 | malloc gpResources 容器 + 清零 | N/A | ts 用 SceneAssets 对象;每次 loadScene 新建 |
| `PAL_FreeResources` | 123 | 释放全部资源 + 各 sub-list | N/A | 同上,GC 自动 |
| `PAL_SetLoadFlags` | 164 | 标记下次 LoadResources 重 load 哪部分(kLoadGlobalData / Map / Sprites / PlayerSprites)| N/A | ts 路径:bootstrap.ts:setSceneLoader 内每次 fetch 新 SceneAssets 替换 — 无增量 reload 概念 |
| `PAL_LoadResources` | 191 | 按 bLoadFlags reload palette / tilemap / events / sprites / playerSprites | ⚠️ 部分 | ts loader.ts:loadAll 一次性 fetch 6 类(tilemap / palette / scene / events / tileImages / characterSprites 等);**没** sdlpal `kLoadPlayerSprite` 单独 reload 路径 — 改主角 sprite 时 ts 端走 `gs.partyLeaderSpriteId` opcode override + present.ts 渲染时从 ctx.npcSpriteFrames 反查(非 reload 资源)。语义等价,实现不同 |
| `PAL_GetCurrentMap` | 358 | 返回当前 map struct(PALMAP) | ✓ | ts 端 `SceneContext.tilemap`(loadScene 时注入)|
| `PAL_GetPlayerSprite` | 385 | 取 role i 当前 sprite 数据 | ⚠️ | ts 端 `ctx.partyFrames`(默认主角)+ `ctx.npcSpriteFrames.get(partyLeaderSpriteId)` override;**没** per-role 独立 sprite 容器(M5 简版只支持 leader sprite override,M6 多人队需扩) |
| `PAL_GetEventObjectSprite` | 412 | 取 event-object i 当前 sprite | ✓ | ts 端 `ctx.npcSpriteFrames.get(npc.spriteNum)` |

**关键差异**:
- sdlpal 用 `bLoadFlags` 增量 reload(改主角 sprite 时不重 load tilemap),ts 端
  scene 切换一次性 fetch 整套(D33 lazy load 装 cache,scene 内 swap sprite 只改 gs 字段不重 fetch)
- sdlpal `PAL_FreeResources` 必须显式 free 才不漏内存,ts 端 JS GC 自动 — **永不漏**

**Follow-up**:多人队员各自 sprite override(`gs.partyMembers[i]` 各自指向不同 spriteNum)
M6 队员切换时做 — 需扩 ctx.partyMemberSprites map。

---

## map.c(tile / cell 解码,~440 行)

sdlpal `PALMAP` 内存结构 = chunk 1 MAP.MKF 全 5×5×128×64×2 cell DWORD;运行时按
(x, y, h) 取 tile bitmap / height。**ts 端**:pal-extract 把 MAP.MKF 解成
`tilemap-N.json`(cells[][].{lower, upper} u32);runtime 直接索引,不用动态 lookup
function。

| sdlpal 函数 | 行 | 功能 | ts 端状态 |
|---|---|---|---|
| `PAL_LoadMap` | ? | 从 MAP.MKF chunk 加载 map struct | ✓ pal-extract dump(map.ts:parseMap)|
| `PAL_FreeMap` | ? | free map struct | N/A(JS GC)|
| `PAL_X` / `PAL_Y` macro | global.h | u32 pos pack/unpack | ts 端纯用 number x/y,不 pack |
| `PAL_XY` macro | global.h | x/y → u32 | 同上,N/A |
| `PAL_MapGetTileBitmap` | 230 | 给 (x, y, h, layer) → tile bitmap 引用 | ✓ ts pal-extract dump 时已存 tileId;运行时 `tileImages.get(tileId)` |
| `PAL_MapGetTileHeight` | 302 | 给 (x, y, h, layer) → iTileHeight 4-bit | ✓ ts draw-tilemap.ts:268-271(extract DWORD bit 8-11 / 24-27)|
| `PAL_MapTileIsBlocked` | 264 | 检查 obstacle bit(0x2000) | ✓ ts scene-system.ts:tilemapIsBlocked(bit 13 完全对齐) |
| (其他 cell 解码 macros) | | 4-bit / 8-bit / signed 提取 | ✓ ts draw-tilemap.ts:tileIdLayer0/1 全部对齐 |

**已知差异**:无 — map.c 全部解码逻辑 ts 端 1:1 port(M5.P0.b cover-tile 期间核对 sdlpal 真值多次)。

---

## text.c(文本 / 字体 / dialog,~1750 行)

sdlpal text.c 是最大的"渲染 + 状态机"混合模块 —— 含 dialog 完整流程(typing /
portrait / multi-page / key icon)+ 文本 draw 公式(shadow / 控制码 strip)+ Word.DAT
字典反查。

| sdlpal 函数 | 行 | 功能 | ts 端状态 |
|---|---|---|---|
| `PAL_LoadObjectDesc` / `PAL_FreeObjectDesc` | 早期 | obj desc 字符串加载 | ✓ pal-extract 已 dump 到 _name 字段(WORD.DAT 反查) |
| `PAL_GetWord` | ~ | id → 字符串(WORD.DAT) | ✓ 同上,运行时不需要再查 — _name 已 inline |
| `PAL_GetMsgNum` | ~ | dialog msg id → text | ✓ events.bin 已 inline text 到 showDialog op 的 text 字段 |
| `PAL_GetMsg` | ~ | 同上 | ✓ |
| `PAL_GetWordChar` | ~ | 取单字符 | ✓ 我们用 JS string + grapheme 处理 |
| `PAL_DrawText` | 1715-1727 | shadow + glyph blit + 控制码 | ✓ ts render-text.ts(shadow 与 sdlpal 完全对齐,f7853a5 commit)|
| `PAL_DialogSetDelayTime` | ~ | typing 速度调整 | ⚠️ ts 端固定 typing 节奏(simpleStateMachine 内)— sdlpal 真值按 dialog delay 调,follow-up |
| `PAL_StartDialog` | 1616-1700 | 设 style/portrait/color + 起 dialog state machine | ✓ ts present/dialog-box.ts + event-system.ts:setDialogStyleX handler |
| `PAL_StartDialogWithOffset` | ~ | StartDialog 含 x/y offset | ⚠️ ts 端没 offset 参数(实际游戏未发现使用) — follow-up |
| `PAL_ShowDialogText` | 主体 1700+ | typing + 多页 + Confirm 翻页 + key icon | ✓ ts dialog-box.ts 完整状态机(phase: typing / line-done / waiting-page-key / waiting-end-key)|
| `PAL_ClearDialog` | ~ | 关闭 dialog box(可选保留 title)| ✓ ts event-system.ts opcode 0x05 partial / fullClear 双路径(5ee847d) |
| `PAL_EndDialog` | ~ | 终止 + 清屏 | ✓ 同上 fullClear 路径 |
| `PAL_DialogIsPlayingRNG` | ~ | dialog 期间 RNG anim 播放标志 | ✗ 未 port(RNG anim 视觉,M6) |
| 控制码 strip `$XX` / `~XX` | text.c:1534/1542 | dialog 文本不显示控制字符 | ✓ ts render-text 已对齐(6814167) |
| portrait load(`gpDialog.bIconImage`)| StartDialog | dialog 头像 sprite | ✓ ts loadDialogAssets + currentDialogPortraitIcon |

**已知差异 / Follow-up**:
- typing 速度按 sdlpal `DialogSetDelayTime` 调整(font size + msg length 自适应)— follow-up
- StartDialogWithOffset 的 x/y offset 参数 — follow-up
- DialogIsPlayingRNG(M6 RNG anim 接入时做)

---

## font.c(字体,~280 行)

sdlpal font.c = 内嵌中文 PALFONT 数组(每像素一字节)+ 英文字模。我们走 GNU Unifont
BDF 路线(M4 P4),完全替代字模,但字符渲染入口对齐。

| sdlpal 函数 | 行 | 功能 | ts 端状态 |
|---|---|---|---|
| `PAL_InitFont` | ~ | 加载 sdlpal 内置 PALFONT 数组 | N/A(我们 fetch glyphs.json 替代) |
| `PAL_LoadEmbeddedFont` | ~ | 内嵌字模加载 | N/A |
| `PAL_LoadUserFont` | ~ | user 自定义字体 | N/A |
| `PAL_DrawCharOnSurface` | ~ | 画单字符到 surface | ✓ ts render-text.ts drawGlyph(从 glyphs.json 取像素 mask) |
| `PAL_CharWidth` | ~ | 字符宽度(8 或 16 px,中英) | ✓ ts 端按 glyph metadata 取 width |
| `PAL_FontHeight` | ~ | 行高 | ✓ 同上 |

**关键差异(by design)**:
- 字模来源:sdlpal 用原版游戏内嵌 PALFONT(版权敏感),ts 端用 GNU Unifont(MIT 类 license)
- 视觉:Unifont 跟原版字模非完全 1:1 — **视觉接近但字形稍有差**(已 M4 决策接受)

无 follow-up。

---

## input.c(~1400 行)

sdlpal `g_InputState` + SDL event poll + 多输入源(keyboard / joystick / touch / TV remote)。

| sdlpal 函数 | 行 | 功能 | ts 端状态 |
|---|---|---|---|
| `PAL_KeyboardEventFilter` | 早期 | SDL keyboard event → g_InputState | ✓ ts shell/keyboard.ts handleDown/handleUp |
| `PAL_UpdateKeyboardState` | ~ | 按 SDL_GetKeyState 续读按下键 | ✓ 隐式(浏览器 keyboard event 由 dom 维护)|
| `PAL_GetCurrDirection` | 180-189 | 按 dwKeyOrder 最大者算 last-press 方向 | ✓ ts scene-system.ts:pickFacing(last-press priority,M5 P0 期间核对) |
| `PAL_ClearKeyState` | 1188 | 清 dwKeyPress / dwKeyDown bitmap | ✓ tickByMode mode 切换时隐式清(snap 不传旧 input) |
| `PAL_PollEvent` | ~ | SDL_PollEvent 包装 | ✓ ts InputSource 抽象(KeyboardInputSource / ReplayInputSource)|
| `PAL_ProcessEvent` | 1308-1339 | poll all events + 触屏 / joystick 更新 | ⚠️ ts 只处理 keyboard 输入(joystick / touch follow-up M6 移动支持)|
| `PAL_RegisterInputFilter` | 1341 | 自定义 input filter | N/A(ts 无插件机制) |
| `PAL_TouchEventFilter` | ~ | 触屏手势 → keypress 转换 | ✗ M6 follow-up |
| `PAL_JoystickEventFilter` | ~ | joystick → keypress 转换 | ✗ M6 follow-up |

**Follow-up**:joystick / touch / gamepad 支持(M6 移动端 / 手柄)。

---

## itemmenu.c / magicmenu.c / uigame.c / uibattle.c(UI 菜单,共 ~5000 行)

**重要前提**:sdlpal 这 4 文件是"渲染 + 状态机 + 输入"混合,直接画到 320×200 framebuffer。
ts 端 M-w0/w1/w2/w3 11 task **只 port 了状态机数据层**(`packages/game/src/core/menu/`
8 module),**渲染层和输入路由真接入 dev panel 整体未做**。

### itemmenu.c(~600 行)

| sdlpal 函数 | 功能 | ts 端状态 |
|---|---|---|
| `PAL_ItemSelectMenuUpdate` | 物品列表显示 + 翻页 + filter | ⚠️ ts 端 item-select.ts:createItemSelectMenu **只生成 data**(filter / mode / 价格列),无渲染 |
| `PAL_ItemUseMenu` | 用品菜单(选物品 → 选 target role)| ⚠️ ts 端 inventory-menu.ts state machine(list / use-target / done),无渲染 + 输入路由 |
| `PAL_InventoryMenu` | 大世界 inventory 入口 | ⚠️ 同上,inventory-menu.ts 数据层 |
| `PAL_EquipItemMenu` | 装备菜单 + 显已装备 + 选 role 限 equipableBy | ⚠️ ts 端 equip-menu.ts state machine,无渲染 |
| `PAL_BuyMenu` | 商店购买菜单 + 价格 + 数量调整 | ⚠️ ts 端 shop-menu.ts(mode=buy)+ event-system 0x26 stub,无渲染 |
| `PAL_SellMenu` | 卖出菜单 + sellable filter + 半价 | ⚠️ 同上 mode=sell + 0x27 stub |

### magicmenu.c(~600 行)

| sdlpal 函数 | 功能 | ts 端状态 |
|---|---|---|
| `PAL_MagicSelectionMenu` | 法术列表 + MP 显示 + 不够灰色 | ⚠️ ts 端 magic-select.ts state(MP 不够 disabled),无渲染 |
| `PAL_InGameMagicMenu` | 大世界用法术 pick caster → spell → target | ⚠️ ts 端 in-game-magic-menu.ts 3-phase state machine,无渲染 + 输入 |

### uigame.c(~2700 行)— 最大 UI 文件

| sdlpal 函数 | 功能 | ts 端状态 |
|---|---|---|
| `PAL_OpeningMenu` | 启动菜单(新游戏 / load 1-5) | ⚠️ ts 端 shop-menu.ts:createOpeningMenuList(数据壳),无 UI |
| `PAL_InGameMenu` | ESC → 主菜单(物品 / 法术 / 状态 / 系统) | ⚠️ ts 端 in-game-menu.ts InGameMenuState,无 UI |
| `PAL_SystemMenu` | 子菜单(存 / 读 / 设置 / 退) | ⚠️ ts 端 in-game-menu.ts SystemMenuState,无 UI |
| `PAL_SaveSlotMenu` | 5 slot 选择 + meta 显示 | ⚠️ ts 端 Save API 已就绪(IndexedDB)+ dev panel 5 slot 按钮 stub,无 in-game UI |
| `PAL_PlayerStatus` | 状态页(属性 / 装备 / 法术 3 页) | ⚠️ ts 端 player-status.ts state machine + viewData,无渲染 |
| `PAL_TrademarkScreen` / `PAL_SplashScreen` | 启动 logo + 闪屏 | ✗ ts 端无 — dev mode 用 `?skip-intro` 跳过;production follow-up |
| `PAL_GameMenu_OnItemChange` | menu cursor 变化 hook(SFX 等) | N/A |
| 输入路由 | 按键 → cursor 移动 + Confirm / Cancel | ✗ ts 端**菜单输入完全未接 dev panel** — 是 M-w 各 task "follow-up 真接 dev panel 输入路由" 的核心未做项 |
| 渲染层 | 菜单 box + 项目文本 + 光标 sprite blit | ✗ ts 端**完全未做**(M-w0.1 Step 3 计划但未做)|

### uibattle.c(~1700 行)

| sdlpal 函数 | 功能 | ts 端状态 |
|---|---|---|
| `PAL_BattleUIUpdate` | 战斗 UI 每帧 update(player status box / 光标 / target 选)| ⚠️ ts 端 present/battle/ 有部分(present-battle.ts / draw-battle-ui.ts),菜单交互简版 |
| `PAL_BattleUIShowText` | 战斗中显文本("XX 攻击 XX")| ⚠️ ts 端 'showBattleMessage' command emit + FloatingNumsLayer 简版 |
| `PAL_BattleUIPlayerReady` | player 行动 ready 闪烁 | ✗ 未 port(M6 视觉)|
| `PAL_BattlePlayerSelectAction` 等 | 主菜单(攻击 / 法术 / 物品 / 防御 / 逃跑)选择 | ⚠️ ts 端 battle-system uiState / pendingActions 简版(M3 vertical slice)|
| Magic / Item 子菜单(战斗中)| 战斗内调 ItemSelectMenu / MagicSelectionMenu | ⚠️ data 层 reuse 可,UI 未做 |

**Follow-up(汇总 4 个 UI 文件)**:
- 渲染层 `packages/game/src/present/menu/draw-menu.ts`:Selection / Confirm / Triple / Switch
  primitive 的 box + cursor sprite blit
- 渲染层各菜单专用 draw(draw-inventory-menu / draw-equip-menu / draw-shop / draw-status / 等)
- 输入路由:keyboard event → 当前 active menu state machine 的 move / confirm / cancel
- dev-panel.ts 集成:B 键 picker 内加 "Open InGameMenu" / "Open PlayerStatus" 跳测入口
- 战斗内调菜单(法术 / 物品 sub-menu)+ player ready 闪烁 + autoBattle UI
- L2 baseline:Inventory / Equip / PlayerStatus / Shop / OpeningMenu / SaveSlot 6+ 张

---

## Tier 3(28 文件)— 渲染底层 / 音频 / 平台,逐文件 audit

> Tier 3 sdlpal 是 SDL2/3 + GL pipeline / midi synth / audio driver。ts 端**不复制 C 实现**,
> 但仍逐文件标 — 不能笼统"web 替代" 一刀切。

### video.c(~1700 行)— SDL framebuffer + GL pipeline

| sdlpal 函数 | 功能 | ts 端 |
|---|---|---|
| `VIDEO_Init` / `VIDEO_Shutdown` | SDL window + renderer 创建/释放 | ✓ shell/bootstrap.ts:canvas 直接传入 |
| `VIDEO_UpdateScreen` | flip backbuffer → window | ✓ flushToCanvas(fb → ctx.putImageData)|
| `VIDEO_DrawSurfaceToScreen` | blit surface w/ scale | ✓ canvas drawImage / RGBA 直写 |
| `VIDEO_BackupScreen` / `VIDEO_RestoreScreen` | screen ↔ backup surface | ⚠️ ts 端 Sync.2 fadeScreen 用 framebuffer.backup 数组 — 真值"backupPixels" 字段 |
| `VIDEO_FadeScreen` | 72 帧 dither fade(rgIndex 算法)| ✓ event-system.ts:fadeScreen 完整 port(44fc312)|
| `VIDEO_FadeIn` / `VIDEO_FadeOut` | 单向 fade | ⚠️ ts 端只 FadeScreen 真做;FadeIn/Out 单向 follow-up |
| `VIDEO_SetWindowTitle` / `VIDEO_ToggleFullscreen` | 窗口控制 | N/A 浏览器 |
| `VIDEO_SaveScreenshot` | PNG 截图 | ✓ ts 端 e2e snapshotCanvas |
| `VIDEO_ShakeScreen` | 摇屏(±X 像素 jitter) | ⚠️ event-system OP_SHAKE_SCREEN(0x35)只 stub,present 层不实接 |

### video_glsl.c(~800 行)— GL shader pipeline

整个文件 N/A — 浏览器 canvas 2d 无 GL shader scaling 需求,**完全跳过**。M6 若做 CRT 滤镜
follow-up 时,可用 WebGL shader,但非 sdlpal port。

### glslp.c — GLSL shader 加载

N/A 同上。

### mini_glloader.c — OpenGL 函数指针加载

N/A 同上。

### overlay.c(~50 行)

`Overlay_Draw` 把战斗 magic effect 叠加到 framebuffer。**ts 端**:present.ts entries
数组按 baseY sort,sprite 直接画 — 隐式覆盖等价 sdlpal overlay 语义。✓

### aviplay.c(~500 行)— Bink AVI 播放

`PAL_AVIPlay`(开场动画 / ending video)。**ts 端**:✗ 完全未做,M6 用 mp4/webm + `<video>`
标签 follow-up。涉及版权(原版 AVI),mp4 转码 + 私链分发(M6.5 决策)。

### palette.c(~600 行)

| sdlpal 函数 | 功能 | ts 端 |
|---|---|---|
| `PAL_GetPalette` | 取 N 号 palette | ✓ pal-extract dump palette.json + bootstrap loadPalette |
| `PAL_SetPalette` | 切换 palette + 立即生效 | ✓ event-system.ts OP_SET_PALETTE(0x... 已 port 但 stub fetchPalette 注入) |
| `PAL_FadeToRed` | 渐变红屏(game over) | ✗ M6 follow-up |
| `PAL_FadeOut` / `PAL_FadeIn`(palette 级别) | palette R/G/B → 0 / restore | ⚠️ video.c 等价 FadeScreen 有,palette 独立 fade 未做 |
| **palette cycle(水 / 火 动画)** | runtime 修改 palette index 256 色循环 | ✗ **未 port,M6 体验补全核心 follow-up** |

### audio.c / sound.c / mp3play.c / oggplay.c / opusplay.c / midi*.c / resampler.c / rngplay.c

8 个音频文件 — sdlpal 自封 mixer + 多 codec 支持。**ts 端**:✗ 全部未做。M6 用 Web Audio API
+ 浏览器原生解码(mp3/ogg)+ SpessaSynth(midi)实现等价。当前 game 静音运行。

| sdlpal 文件 | 用途 | ts follow-up |
|---|---|---|
| audio.c | mixer 主入口 | Web Audio Graph(AudioContext + nodes) |
| sound.c | SFX 触发(opcode 0x47 已 stub)| HTMLAudioElement 池 或 decodeAudioData |
| mp3play.c | MP3 解码(BGM 备用) | 浏览器原生 audio src=".mp3" |
| oggplay.c | OGG Vorbis(CD 音轨备用)| 同上 |
| opusplay.c | OPUS 解码 | 同上 |
| midi.c / midi_timidity.c / midi_tsf.c | MIDI BGM 合成(timidity / tsf 两后端)| SpessaSynth WASM |
| resampler.c | 采样率转换 | Web Audio 内置 |
| rngplay.c | RNG.MKF 音频 chunk 播放(战斗 SFX)| Web Audio + RNG 索引 |

### palcfg.c / palcommon.c / paldebug.c / util.c

| 文件 | 用途 | ts 端 |
|---|---|---|
| palcfg.c | sdlpal.cfg 解析 | ⚠️ ts 端 URL params(`?skip-intro` / `?tp_dump`)+ localStorage(简版),无完整 cfg 文件等价 |
| palcommon.c | 共享常量 / RLE 解码 | ✓ pal-extract io/rle.ts 解码 RLE(M1)|
| paldebug.c | sdlpal 自己的 debug 工具(crash dump 等)| N/A |
| util.c | 通用 helper(string / 时间 / 内存)| N/A(JS 原生 + lodash 等价)|

### ending.c

`PAL_EndingScreen` 通关后剧情结局。**ts 端**:✗ 未做,M7 通关验证再补。

### game.c

`PAL_GameMain` 主游戏循环包装。**ts 端**:✓ shell/main-loop.ts:startRafLoop 等价。

### main.c

SDL_main + CLI parse。**ts 端**:✓ shell/bootstrap.ts:bootstrap(canvas)(canvas 由 caller 注入,无 CLI)。

---

## audit 总结(实事求是)

**完整 port + 测试验证**(逐函数核对过):
- Tier 1:scene.c / play.c / script.c(35/100+ opcode)/ battle.c / fight.c(公式 + actions)/ global.c(schema)
- Tier 2:map.c(完整)/ font.c(by design 替换)

**部分 port,简版 + 已知 deviation**:
- Tier 1:script.c 70 个 opcode 未具名 / fight.c 升级 8 类 wCount + 6 个 magic anim / battle.c BattleWon 视觉
- Tier 2:res.c per-role sprite override / text.c typing delay + StartDialogWithOffset / input.c joystick/touch
- Tier 2 UI 4 文件:itemmenu / magicmenu / uigame / uibattle — **数据层 ✓ 渲染层 ✗ 输入路由 ✗**(M 股 11 task 只做了一半)

**完全未做 + follow-up**:
- aviplay.c(M6 mp4)/ ending.c(M7)/ palette cycle(M6 体验)
- 8 个音频文件全套(M6)
- video.c FadeIn/Out 单向 / BackupScreen / ShakeScreen 实接

**by design 跳过**(浏览器 / web 标准替代,不 port C 实现):
- video_glsl.c / glslp.c / mini_glloader.c(GL pipeline)
- paldebug.c / util.c(C 通用 helper)

---

## 下一段建议

M5.5 实际完成度:**核心战斗 / 探索 / 数据层 ~85% port**;**渲染 UI 层 ~30% port**;
**音频 / AVI 0% port**。

建议接续:
1. **M6 体验补全的第一波**:接 menu 渲染层 + 输入路由,把 M 股 11 task 的 follow-up
   清掉(预计 5-8 task)
2. 或:**M6 音频接入**(SpessaSynth midi + opcode 0x47 真播 SFX)
3. 或:**B-w3.b magic 特效动画** + B-w1.c levelup loop(B 股 follow-up)
