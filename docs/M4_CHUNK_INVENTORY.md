# M4 chunk inventory

> 14 个 MKF 全 chunk 覆盖率明细。M1-M3.5 已抽部分 ✅,M4 P2 待抽部分 🔲,留 M5/M6 部分 ⏸。
>
> 数据来源:`reference/sdlpal/global.c::PAL_LoadDefaultGame` + 各 .c 文件 grep 真值(raw dump `/tmp/sdlpal-chunks-raw.md`)。
> MKF 文件存在性:STUFF.MKF 和 SAVE.MKF 在本项目 `data/raw/` 中不存在。
> 状态记录时间:2026-05-24(M4 P2 T1 阶段)。

---

## DATA.MKF

真实 chunk count = **15**(index 0–14)。chunk 7、8 为空(0 字节)。

| Chunk | 字节数 | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|---|
| 0 | 378 | `global.c:292 LOAD_DATA … chunk 0 fpDATA` | STORE 数组(21 条,每条 9 个 WORD 商品槽 = 18 字节,MAX_STORE_ITEM=9) | 🔲 P2.T2 | typed `stores.json` |
| 1 | 10780 | `global.c:293 LOAD_DATA … chunk 1 fpDATA` | ENEMY 数组(154 条,70 字节/条) | ✅ M1+M3 | typed `enemies.json` |
| 2 | 3800 | `global.c:294 LOAD_DATA … chunk 2 fpDATA` | ENEMYTEAM 数组(380 条,10 字节/条) | ✅ M3 | typed `enemy-teams.json` |
| 3 | 900 | `global.c:428 PAL_MKFReadChunk … chunk 3 fpDATA` | PLAYERROLES(整块 900 字节,MAX_PLAYER_ROLES=6,字段含 Level/HP/MP/Sprite 等) | ✅ M3 | typed `player-roles.json` |
| 4 | 3328 | `global.c:296 LOAD_DATA … chunk 4 fpDATA` | MAGIC 数组(104 条,32 字节/条) | ✅ M3 | typed `magic.json` |
| 5 | 696 | `global.c:297 LOAD_DATA … chunk 5 fpDATA` | BATTLEFIELD 数组(58 条,12 字节/条) | ✅ M3 | typed `battle-fields.json` |
| 6 | 400 | `global.c:299 LOAD_DATA … chunk 6 fpDATA` | LEVELUPMAGIC_ALL 数组(20 级档 × 5 角色 × LEVELUPMAGIC{wLevel,wMagic} = 400 字节) | 🔲 P2.T2 | typed `level-up-magic.json` |
| 7 | 0 | (no sdlpal reference) | 空 chunk | ⏸ N/A | skip |
| 8 | 0 | (no sdlpal reference) | 空 chunk | ⏸ N/A | skip |
| 9 | 25532 | `ui.c:75 CHUNKNUM_SPRITEUI=9 fpDATA` | UI sprite sheet(战斗/菜单通用 sprite 集) | 🔲 P2.T3 | raw sprite 导出 M5 |
| 10 | 17478 | `battle.c:1787 chunk 10 fpDATA → g_Battle.lpEffectSprite` | 战斗效果 sprite(非 YJ2 压缩,直接 read) | 🔲 P2.T3 | raw sprite 导出 M5 |
| 11 | 40 | `global.c:301 LOAD_DATA … chunk 11 fpDATA → rgwBattleEffectIndex[10][2]` | 角色战斗效果索引(10 套 × 2 WORD = 20 WORD = 40 字节) | 🔲 P2.T2 | typed `battle-effect-index.json` |
| 12 | 282 | `text.c:891 PAL_MKFReadChunk … chunk 12 fpDATA → bufDialogIcons` | 对话框图标 sprite(282 字节) | 🔲 P2.T3 | raw sprite 导出 M5 |
| 13 | 100 | `global.c:303 PAL_MKFReadChunk … chunk 13 fpDATA → EnemyPos` | 敌人出场位置表(5 队型 × 5 槽 × {x,y} = 100 字节) | ✅ M3.5 | typed `enemy-pos.json` |
| 14 | 200 | `global.c:306 PAL_MKFReadChunk … chunk 14 fpDATA → rgLevelUpExp[100]` | 升级经验表(100 WORD = MAX_LEVELS+1=100 条) | 🔲 P2.T2 | typed `level-up-exp.json` |

---

## SSS.MKF

真实 chunk count = **5**(index 0–4)。

| Chunk | 字节数 | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|---|
| 0 | 162464 | `global.c:348 PAL_DOALLOCATE fpSSS chunk 0 EVENTOBJECT` | EVENTOBJECT 数组(4512 条,36 字节/条;含场景坐标/触发脚本/精灵编号) | ✅ M1 | typed 嵌入 scene JSON |
| 1 | 2360 | `global.c:404 PAL_MKFReadChunk … chunk 1 fpSSS → rgScene` | SCENE 数组(295 条,8 字节/条;wMapNum/wScriptOnEnter 等) | ✅ M1 | typed `scene/N.json` |
| 2 | 7910 | `global.c:408 PAL_MKFReadChunk … chunk 2 fpSSS → rgObject` | OBJECT 数组(565 条,14 字节/条 WIN;物品/法术/敌人/角色 联合体) | ✅ M1 | typed `items.json` / `spells.json` |
| 3 | 54056 | `text.c:795 PAL_MKFGetChunkSize chunk 3 fpSSS` | 游戏对话消息偏移表(13514 个 DWORD → nMsgs=13513) | ⏸ M5/M6 | 配合 M.MSG 字符串数据 |
| 4 | 348024 | `global.c:351 PAL_DOALLOCATE fpSSS chunk 4 SCRIPTENTRY` | 脚本字节码(43503 条 SCRIPTENTRY,8 字节/条;wOperation + 3×wOperand) | ✅ M1 | typed `events/scene-NNN.json` |

---

## MGO.MKF

真实 chunk count = **637**(index 0–636)。按 chunk index 动态访问,无固定分段。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–636 | `res.c:289 PAL_MKFDecompressChunk … fpMGO`(event object sprite);`res.c:327`(player sprite);`main.c:267 SPRITENUM_SPLASH_TITLE=0x47`;`ending.c:321 chunk 571,572` | YJ2 压缩 sprite 集:地图 NPC/玩家行走精灵 + 过场动画 | ✅ M1 地图 NPC 行走读出;⏸ 全量 P3.T3 导出 | YJ2 decompress → sprite frame |

---

## MAP.MKF

真实 chunk count = **226**(index 0–225)。每 chunk 对应一个 map 的 tile 数据。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–225 | `map.c:60 PAL_MKFGetChunkCount fpMapMKF`;`map.c:70 PAL_MKFGetChunkSize(iMapNum fpMapMKF)` | 地图 tile 层数据(raw 格式,每个 tile 索引 2 字节,配合 GOP.MKF 渲染) | ✅ M1/M3 tilemap;⏸ 全量 P3 扩 | typed tilemap JSON |

---

## GOP.MKF

真实 chunk count = **226**(index 0–225)。与 MAP.MKF 1:1 对应。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–225 | `map.c:130 PAL_MKFReadChunk(iMapNum fpGopMKF)`;`res.c:234 UTIL_OpenRequiredFile("gop.mkf")` | tile sprite 图集(每张地图的 tile 贴图;raw,非 YJ2 压缩) | ✅ M1/M3 tilemap;⏸ 全量 P3 扩 | raw tile sheet |

---

## F.MKF

真实 chunk count = **19**(index 0–18)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–18 | `battle.c:888 PAL_MKFGetDecompressedSize(s fpF)` → 玩家战斗精灵;`fight.c:3136 PAL_MKFDecompressChunk … fpF` → 召唤兽精灵 | YJ2 压缩战斗精灵集(玩家战斗动画 + 召唤兽);chunk index = `PlayerRoles.rgwSpriteNumInBattle` | ⏸ P3/M5 sprite 导出 | YJ2 decompress → sprite frame |

---

## ABC.MKF

真实 chunk count = **154**(index 0–153)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–153 | `battle.c:879 UTIL_OpenRequiredFile("abc.mkf")`;`battle.c:930 PAL_MKFDecompressChunk(enemy.wEnemyID fp)` | YJ2 压缩敌人战斗精灵(154 条与 DATA.MKF chunk 1 ENEMY 数组 1:1 对应;chunk index = enemy.wEnemyID) | ⏸ P3/M5 sprite 导出 | YJ2 decompress → sprite frame |

---

## FBP.MKF

真实 chunk count = **78**(index 0–77)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0 | `ui.h:83 STATUS_BACKGROUND_FBPNUM=0`;`uigame.c:1089 PAL_MKFDecompressChunk … fpFBP` | 状态栏背景图(320×200 raw bitmap) | ⏸ P3 图片导出 | YJ2 decompress → bitmap |
| 3,4 / 38,39 | `main.c:261 BITMAPNUM_SPLASH_UP=WIN95?3:38`;`main.c:264 BITMAPNUM_SPLASH_DOWN=WIN95?4:39` | 标题画面上/下半(WIN95/DOS 双版本) | ⏸ P3 图片导出 | YJ2/raw → bitmap |
| 61,62 / 69,70 | `ending.c:315,318` | 结局背景图(DOS:61/62;WIN95:69/70) | ⏸ M6 | YJ2 decompress → bitmap |
| 其余 | `battle.c:982 PAL_MKFDecompressChunk(wNumBattleField fpFBP)`;`ending.c:76,183` | 各关卡战斗背景/过场背景(按 wNumBattleField 动态索引) | ⏸ P3 图片导出 | YJ2 decompress → bitmap |

---

## PAT.MKF

真实 chunk count = **9**(index 0–8)。

| Chunk | 字节数 | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|---|
| 0 | 1536 | `palette.c:53 UTIL_OpenRequiredFile("pat.mkf")`;`palette.c:58 PAL_MKFReadChunk(buf 1536 iPaletteNum fp)` | 调色板(256色 × 3字节 × 2 = day + night 各一份) | ✅ M1/M3 palette | typed `palette/N.json` |
| 1–4 | 768 | 同上 | 调色板(日间版,768=256×3;夜间无副本) | ✅/⏸ | typed |
| 5 | 1536 | 同上 | 日间+夜间调色板 | ⏸ | typed |
| 6–8 | 768 | 同上 | 日间调色板 | ⏸ | typed |

---

## RNG.MKF

真实 chunk count = **12**(index 0–11)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–11 | `rngplay.c:402 UTIL_OpenRequiredFile("rng.mkf")`;`rngplay.c:74 PAL_MKFGetChunkCount(fpRngMKF)`;`rngplay.c:416 PAL_RNGReadFrame(buf iNumRNG iStartFrame fp)`;`main.c:200 PAL_RNGPlay(6 …)` | RLE 压缩片段动画(12 段;PAL_RNGReadFrame 解压逐帧;包含片头动画等) | ⏸ M5/M6 | RNG decode → frame sequence |

---

## RGM.MKF

真实 chunk count = **92**(index 0–91)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–91 | `uigame.c:1132 PAL_MKFReadChunk(buf iPlayerRole.rgwAvatar fpRGM)`;`text.c:1285,1330 PAL_MKFReadChunk(buf iNumCharFace fpRGM)`;`global.h:455 "character face bitmaps"` | 角色立绘/头像 sprite(92 张;chunk index = `PlayerRoles.rgwAvatar` 或 iNumCharFace;非压缩 RLE) | 🔲 P2.T4 | raw sprite 解析,metadata JSON |

---

## BALL.MKF

真实 chunk count = **252**(index 0–251)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–251 | `uigame.c:1155 PAL_MKFReadChunk(bufImage 2048 rgObject.item.wBitmap fpBALL)`;`global.h:147 "bitmap number in BALL.MKF"`;`global.h:158 同上`(magic 也有 wBitmap);`itemmenu.c:202`;`script.c:1496` | 道具/法术 UI 图标 sprite(252 张;chunk index = OBJECT.item.wBitmap / OBJECT.magic.wBitmap;每张 ≤2048 字节) | 🔲 P2.T4 | raw sprite 解析,metadata JSON + 图标导出 M5 |

---

## FIRE.MKF

真实 chunk count = **55**(index 0–54)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–54 | `fight.c:2480,2488 PAL_MKFGetDecompressedSize/PAL_MKFDecompressChunk(iEffectNum fpFIRE)`;`fight.c:2642,2650`;`fight.c:2877,2885`;`global.h:454 "fire effect sprites"` | 战斗特效 sprite(YJ2 压缩;55 段;chunk index = iEffectNum,用于技能/法术 visual effect) | 🔲 P2.T4 | YJ2 decompress → sprite frame,metadata JSON |

---

## SOUNDS.MKF

真实 chunk count = **505**(index 0–504)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 抽法 |
|---|---|---|---|---|
| 0–504 | `sound.c:964 mkfs[0]="sounds.mkf" func=SOUND_LoadWAVEData`;`sound.c:777 PAL_MKFGetChunkSize(iSoundNum player->mkf)`;`sound.c:792 PAL_MKFReadChunk(buf iSoundNum player->mkf)`;`util.c:743 "voc.mkf"/"sounds.mkf"` | 音效 WAV 数据(505 个;每 chunk 一个独立 WAV/VOC 音效;chunk index = iSoundNum) | 🔲 P2.T5 | metadata JSON(文件名/大小/格式);WAV 导出 M6 |

---

## 覆盖率自检

| MKF | chunk 数 | ✅ M1-M3.5 已抽 | 🔲 P2 待抽 | ⏸ M5/M6 留 |
|---|---|---|---|---|
| DATA | 15 | 6(1-6,13) | 5(0,6,11,12,14) | 2(7,8 空;9,10 sprite) |
| SSS | 5 | 4(0,1,2,4) | 0 | 1(3 消息偏移) |
| MGO | 637 | 部分(M1 NPC) | 0 | 全量(P3.T3) |
| MAP | 226 | 部分(M1/M3) | 0 | 全量(P3) |
| GOP | 226 | 部分(M1/M3) | 0 | 全量(P3) |
| F | 19 | 0 | 0 | 全部(P3/M5) |
| ABC | 154 | 0 | 0 | 全部(P3/M5) |
| FBP | 78 | 部分(M3 palette/battle) | 0 | 全量(P3) |
| PAT | 9 | 部分(M1/M3) | 0 | 余量(P3) |
| RNG | 12 | 0 | 0 | 全部(M5/M6) |
| RGM | 92 | 0 | 全部 | — |
| BALL | 252 | 0 | 全部 | 图标导出 M5 |
| FIRE | 55 | 0 | 全部 | — |
| SOUNDS | 505 | 0 | metadata | WAV 导出 M6 |

> STUFF.MKF / SAVE.MKF 在 `data/raw/` 中不存在,DOS 版以 `.RPG` 文件存档,不计入 MKF 覆盖范围。
