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

## 待 audit(剩 43 个 .c)

接下来按 Tier 1 / Tier 2 顺序逐个审 — battle.c / fight.c / global.c / res.c / map.c / text.c / font.c / input.c / itemmenu.c / magicmenu.c / uigame.c / uibattle.c。
