# M4 pal-extract 实际提取清单 audit

> 触发动机:M5.6 v2 session 2 起 T17,我错说 "FBP 没 extract",被用户怼。
> 修法:通读 [packages/pal-extract/src/cli.ts](../../packages/pal-extract/src/cli.ts) 1-686 行,把所有 MKF / chunk 实际处理范围 + 输出 path 列清楚,留作后续 task 真做前查表的信源(不再 shallow grep 推断)。
>
> 日期:2026-05-27 · M5.6 v2 session 2
> 维护要求:每加新 pal-extract 流水线时同步本文件;落项目 T20 真值 audit v2 起点。

---

## 数据基线

- **数据文件**:[data/raw/](../../data/raw/) 14 个 MKF + 4 个 AVI + EXE/DLL/INI/RPG 等
- **build target**:fIsWIN95 = TRUE(YJ2 压缩,WIN95 data,自动检测 sdlpal `global.c:50-109 PAL_IsWINVersion`);sdlpal 源码编译用 PAL_CLASSIC(关 ATB)— `fIsWIN95` 和 `PAL_CLASSIC` 是两个独立维度
- **输出根**:[data/extracted/](../../data/extracted/) → 拷到 [packages/game/public/extracted/](../../packages/game/public/extracted/) 给 game runtime fetch

---

## 14 MKF · chunk 级处理表

| MKF | chunk | sdlpal 真值含义 | pal-extract 行为 | 输出 path |
|---|---|---|---|---|
| **SSS.MKF** | 1 | rgScene[] scenes 表 | sss.scenes (295) | events 流水线 |
| | 2 | rgObject[] OBJECT 表 | sss.objects → parseItems / parseSpells / parseEnemyObjects | `data/items.json` + `data/spells.json` + `data/enemy-objects.json` |
| | 3+ | bytecode + messageOffsets | sliceByScene + recompile round-trip | `events/scene-{NNN}.json` × 295 + `events/shared.json` + `events/objects.json` |
| **DATA.MKF** | **0** | **STORE 表**(`WORD rgwItems[MAX_STORE_ITEM]` × nStore)| ⚠ **未抽** | — |
| | 1 | ENEMY 战斗属性 | parseEnemies(配合 SSS chunk 2) | `data/enemies.json` |
| | 2 | ENEMYTEAM 敌队 | parseEnemyTeams + objectIndex→enemyId 翻译 | `data/enemy-teams.json` |
| | 3 | PlayerRoles 全字段(M5.B 扩) | parsePlayerRoles | `data/player-roles.json` |
| | 4 | MAGIC 法术详细 | parseMagicTable | `data/magic.json` |
| | 5 | BATTLEFIELD 战场背景 | parseBattleFields | `data/battle-fields.json` |
| | 6 | LEVELUPMAGIC_ALL × 5 角色 | parseLevelUpMagic | `data/level-up-magic.json` |
| | 7 | 空 | skip(0 字节) | — |
| | 8 | 空 | skip | — |
| | 9 | SPRITEUI sprite group(无 YJ2,raw)| parseSpriteChunk → 72 帧 | `images/ui/frame-NN.png` × 72 + `data/ui-sprite/spriteui.json` |
| | 10 | lpEffectSprite 战斗特效 sprite | parseSpriteChunk → 86 帧 | `images/magic/frame-NN.png` × 86 + `data/magic-sprite/effect.json` |
| | 11 | rgwBattleEffectIndex[10][2] | parseBattleEffectIndex | `data/battle-effect-index.json` |
| | 12 | bufDialogIcons 282B(text.c:891)| raw base64 dump,runtime 解 RLE | `data/dialog-icons-raw.json` |
| | 13 | ENEMYPOS 5×5 PALPOS | parseEnemyPos | `data/enemy-pos.json` |
| | 14 | rgLevelUpExp[100] WORD × 100 | parseLevelUpExp | `data/level-up-exp.json` |
| | 15 | 不存在(count=15,index 0-14)| — | — |
| **MGO.MKF** | 0-636 | NPC / cutscene sprite group YJ2 | dump-all(M5.Sync.2 改);633 / 637 chunk 可解 | `images/world/npc/{spriteId}/frame-NN.png` + `data/sprite/{id}.json` |
| **F.MKF** | 0-18 | player 战斗 sprite YJ2 | dump-all(M5.Sync.2 改)| `images/battle/player/{id}/frame-NN.png` + `data/battle-sprite/player/{id}.json` |
| **ABC.MKF** | 0-153 | enemy 战斗 sprite YJ2 | dump-all(M5.Sync.2 改)| `images/battle/enemy/{id}/frame-NN.png` + `data/battle-sprite/enemy/{id}.json` |
| **FBP.MKF** | 0-77 | 320×200 8-bit indexed bg | YJ2 全 dump(76 写 + 2 空 skip)| `images/battle/bg/{NNN}.png` × 76 + `data/battle-bgs.json` |
| | 2 | **OpeningMenu 主菜单背景**(WIN95)`MAINMENU_BACKGROUND_FBPNUM (fIsWIN95?2:60)` | 同上 | `images/battle/bg/002.png` ← **T17 用** |
| | 3 | Splash up(WIN95)`BITMAPNUM_SPLASH_UP (fIsWIN95?0x03:0x26)` | 额外单独写 splash 目录 | `images/splash/splash-up-win95.png` ← **T18 用** |
| | 4 | Splash down(WIN95)| 同上 | `images/splash/splash-down-win95.png` ← **T18 用** |
| | 60 | 结局 CG(DOS 主菜单背景,我们 WIN95 不用)| 同上 | `images/battle/bg/060.png` |
| **PAT.MKF** | 全 chunk(≥768B)| 调色板 6-bit RGB × 256 | decodePalette | `data/palette/{i}.json` × N |
| **MAP.MKF** | per mapNum YJ2 | 地图 layer | 配合 GOP.MKF parseMap | `data/tilemap/{mapNum}.json` |
| **GOP.MKF** | per mapNum | 障碍物层(gridObstacles?)| parseMap 内部消费 | (同上 tilemap json) |
| MAP + GOP | ~120 unique mapNum | 全 295 scene mapNum dedup | per mapNum dump tile + tilemap | `images/world/tileset/map-{n}/tile-XXXX.png` |
| **RNG.MKF** | 0-11 | sub-MKF + RLE delta 动画帧(rngplay.c)| ✓ T18 Step 2:`decodeRngAnim` port `PAL_RNGReadFrame` + `PAL_RNGBlitToSurface` opcode 0x00-0x13 → 1464 frame PNG | `images/animation/rng-{NN}/frame-{NNN}.png` + `data/rng-frames.json` |
| **RGM.MKF** | 0-91 | 单帧 RLE bitmap **角色头像** | ✓ `parsers/rgm.ts decodeRgmPortrait`(M5.6 T10d 修)RLE → PNG | `images/portraits/{NN}.png` × 88 + `data/portraits.json` |
| **BALL.MKF** | 0-251 | 单帧 RLE bitmap **物品图标** | ⚠ raw dump **未解 RLE 无 PNG** | `data/ball-raw.json` |
| **FIRE.MKF** | 0-54 | sprite group YJ2 法术动画 | 全 YJ2 + 帧抽 | `images/magic/fire-NN/frame-NN.png` + `data/fire-sprites.json` |
| **SOUNDS.MKF** | 0-504 | OGG 音效(M6)| metadata only | `data/sounds-metadata.json` |
| **M.MSG** | — | 字符串表(SSS.MKF.messageOffsets 索引)| parseMessages | `lookup/strings.json` |
| **WORD.DAT** | [0..35] 系统/UI 36 条(含 `MAINMENU_LABEL_NEWGAME=7` / `LOADGAME=8`)| 10 byte/word GBK | ⚠ **未抽** | — |
| WORD.DAT | [36..41] 人物名 6 条 | parseWordDat | `lookup/words.json.persons` |
| WORD.DAT | [42..60] 战斗/UI 19 条 | ⚠ **未抽** | — |
| WORD.DAT | [61..295] 物品名 235 条 | parseWordDat | `lookup/words.json.items` |
| WORD.DAT | [296..397] 仙术名 102 条 | parseWordDat | `lookup/words.json.spells` |
| WORD.DAT | [398..550] 敌人名 153 条 | parseWordDat | `lookup/words.json.enemies` |
| WORD.DAT | [551..564] 毒素/特殊 14 条 | parseWordDat | `lookup/words.json.scenes` |
| **SAVE.MKF** | — | **不存在**(WIN95+ 用 .RPG 存档)| — | — |
| **unifont-cn.bdf**(非 MKF)| — | Unifont CN BDF(M4.P4 ship)| parseBdf + glyphsToJson | `data/font/glyphs.json` |
| **1-6.avi**(6 个全)| — | trademark / splash / opening AVI / cutscene / 结局 | ✓ T18 Step 1:`pnpm extract:videos` 离线 ffmpeg H.264 CRF 18 + AAC 96k → mp4 | `data/extracted/videos/{1-6}.mp4` |

---

## 后续 task 资产真实状况

| task | 用到什么资产 | pal-extract 现状 | 实做前要不要补流水线 |
|---|---|---|---|
| **T17 OpeningMenu** | FBP chunk 2 主菜单 bg + SPRITEUI(chunk 9) + 字 | ✅ 全已 dump | 不需补 |
| **T18 Trademark + Splash + AVI** | Splash chunk 3/4 + 1.avi/2.avi/3.avi → mp4 | ⚠ splash PNG OK,**3 AVI 未转 mp4** | 需补 ffmpeg 离线流水线 |
| **T10b InventoryMenu fullscreen** | BALL 252 物品图标 + SPRITEUI | ⚠ **BALL 未解 RLE,无 PNG** | 需补 RLE 解 → PNG 流水线 |
| **T10d PlayerStatus** | RGM 92 角色头像 + SPRITEUI + LevelUpExp | ✅ 全已 dump(M5.6 T10d 已修 RGM RLE → 88 PNG) | 不需补 |
| **T10c InGameMagicMenu** | SPRITEUI + magic chunk 10 effect frames + magic.json | ✅ 全已 dump | 不需补 |
| **T10e EquipItemMenu** | BALL + SPRITEUI | ⚠ 同 T10b | 同 T10b(可一并补)|
| **T15 BattleWon** | SPRITEUI 9-slice box + 战斗结算文字 | ✅ | 不需补 |
| **T16 levelup** | LevelUpExp + LevelUpMagic + SPRITEUI | ✅ 数据 OK | 不需补 |
| **M5.M-w3 BuyMenu / SellMenu**(已部分做)| **STORE 表**(DATA chunk 0)| ⚠ **chunk 0 未抽** — 现在用 opcode operand stub | M5.M-w3 真做时补 |

---

## 真漏洞列表(实做对应 task 前必须补)

### 1. BALL.MKF RLE 解 → 252 物品图标 PNG — ✓ 已修(2026-05-27 T10b)
- **触发 task**:T10b InventoryMenu / T10e EquipItemMenu
- **修法**:[`parsers/ball.ts`](../../packages/pal-extract/src/resources/parsers/ball.ts) `decodeBallIcon` — 复用 `io/rle.ts decodeRle`,**skip 头 4 byte `02 00 00 00` file header**(sdlpal palcommon.c:96-100 真值),输出 `images/items/{NNN}.png` × 251(chunk 0 空槽位 skip)+ `data/items-icons.json` manifest。
- **典型尺寸**:48×47 indexed PNG with alpha mask(opaque=0 处 透明)。

### 2. RGM.MKF RLE 解 → 88 角色头像 PNG — ✓ 已修(2026-05-27 T10d session 3)
- **触发 task**:T10d PlayerStatus / DialogBox portrait
- **修法**:[`parsers/rgm.ts`](../../packages/pal-extract/src/resources/parsers/rgm.ts) `decodeRgmPortrait` —
  与 BALL 同模式(`palcommon.c:96-100` 4-byte file header `02 00 00 00` skip + decodeRle + encodeIndexedPng),
  输出 `images/portraits/{NN}.png` × 88(chunk 0 + 3 空 skip)+ `data/portraits.json` manifest。
- **典型尺寸**:78×91 indexed PNG with alpha mask(chunk 1 真值)。
- **runtime 接入**:loader 不重复 fetch(复用 `dialog-assets.portraitFrames` map)— DialogBox + PlayerStatus
  共享同一 chunkIndex → IndexedImage 映射。dialog-assets 已切换 PNG fetch path(取代 rgm-raw.json runtime RLE)。

### 3. 1-6.avi → mp4(ffmpeg 离线)— ✓ T18 Step 1 已修(2026-05-27)
- **触发 task**:T18 Trademark + Splash / T19 OpeningMenu AVI / 后续 cutscene
- **状态**:`pnpm -F @type-pal/pal-extract extract:videos` 走 [`scripts/extract-videos.ts`](../../packages/pal-extract/scripts/extract-videos.ts) — ffmpeg H.264 CRF 18 preset slow + AAC 96k,6 个 AVI 全转,输出 `data/extracted/videos/{1-6}.mp4`(总 ~21MB)。增量 build(mtime 比对 skip)。
- **memory 锚**:[avi-offline-ffmpeg-to-mp4](../../memory/avi-offline-ffmpeg-to-mp4.md)

### 4. DATA.MKF chunk 0 STORE 表抽取
- **触发 task**:BuyMenu / SellMenu 真做(M5.M-w3 已部分做,目前 opcode stub)
- **工作量**:加 `parsers/store.ts` 解 `WORD rgwItems[MAX_STORE_ITEM] × nStore` → `data/stores.json`
- **sdlpal 真值锚**:[global.c:292](../../reference/sdlpal/global.c#L292) `LOAD_DATA(lprgStore, nStore * sizeof(STORE), 0, fpDATA)`
- **STORE 结构**:[global.h:252-255](../../reference/sdlpal/global.h#L252-L255)
- **MAX_STORE_ITEM 值**:需 grep `common.h` 取 fixed 值

### 6. items/spells/enemyObjects scripts 切片丢弃 — ✓ 已修(2026-05-27 T10b 修 / session 3)
- **触发**:user 反馈"物品都没法使用" — 选完 use-target Confirm 后 console.debug stub。
- **根因**:[`sliceByScene`](../../packages/pal-extract/src/events/slice.ts) 只用 scene 入口 + eventObject 做 BFS,**漏收 items/spells/enemyObjects.scriptOn\* 作为 entry point**。
  验证:items.scriptOnUse 范围 39190..43028,原 shared.json label 范围 2201..42409 → 103 个 item scripts 全 miss。
  整批 script bytecode 被切片**丢弃**(任何 scene reach 不到的 cmd 自动丢)。
- **修法**:
  - sliceByScene 加 `globalEntries: number[]` 参数 — items/spells/enemyObjects.scriptOn{Use,Equip,Throw,Desc,Success,TurnStart,BattleEnd,Ready} BFS 单独 reachable 集合,强制归 shared。sdlpal 真值依据 [`script.c:3140 PAL_RunTriggerScript`](../../reference/sdlpal/script.c#L3140) → `gpGlobals->g.lprgScriptEntry[wScriptEntry]` 全局 SCRIPTENTRY 数组。
  - cli.ts 先 parseItems/parseSpells/parseEnemyObjects 再 sliceByScene,收集 globalScriptEntries 喂 sliceByScene + 加进 disasm entryIps 让命中点也打 L_<ip> 标签
  - 验证:items.scriptOnUse 103/103 hits in shared.json labelMap;shared.json 1999 → 4405 commands(+628 entry × BFS 后展开 2406 cmds)
- **配套**:event-system.ts `startOverworldItemScript` helper + menu-driver 用物品流程接入 event mode;Phase 3 opcode handler(HP/MP/status 等)按 sdlpal script.c case-by-case port。

### 5. WORD.DAT 系统/UI/战斗 menu label(55 条)dump — ✓ 已修(2026-05-27)
- **触发 task**:T17 OpeningMenu / SystemMenu / SaveSlot / battle UI / 任何 `PAL_GetWord(wNum)` 引用真字符串
- **修法**:`parseWordDat` 增加 `flat: string[]`(565 条 index = sdlpal word id)+ `system: string[]`(id 0-35)+ `battleUi: string[]`(id 42-60),全 565 条全 dump 进 `lookup/words.json`
- **真值锚**:`MAINMENU_LABEL_NEWGAME=7` → "新的故事" / `LOADGAME=8` → "旧的回忆" / `CASH_LABEL=21` → "金钱" / `LOADMENU_LABEL_SLOT_FIRST=43-47` → "进度一/二/三/四/五" 等
- **runtime 接入**:game runtime 暂仍硬编码字符串(与 sdlpal id 真值对应),loader 加 fetchWords + menu 走 lookup 留 follow-up(T20 真值 audit v2)

---

## 本 audit 没覆盖的事

- DATA.MKF chunk 15+(count=15 注释说 chunk 15 超出范围,但需 double-check `chunkCount(dataMkf)` 实际返回值是 15 还是 16)
- FBP.MKF chunk 5 + chunk 58 写 PNG 时空 skip 原因(可能是空 chunk / YJ2 fail / size ≠ 64000)— 看 [battle-bgs.json](../../packages/game/public/extracted/data/battle-bgs.json) ids 列表确实缺 5 和 58
- 14 个 MKF 是否覆盖 sdlpal 用的全部资产 — 还有 `MAP.MKF / GOP.MKF / FIRE.MKF` 这些 sdlpal 也有更细的 sub-chunk 解码可能未覆盖

这些等 T20(M5.5 真值 audit v2)再深扫。

---

## v2 session 2 shallow-推教训

本 audit 起源是我在 T17 准备阶段连续 4 次 shallow 推:
1. `find -name "fbp*"` 0 hit 就说 "FBP 没 extract" — **没去看 cli.ts 是不是把 FBP 当 battle bg routed 到 battle/bg/**
2. 看 sdlpal `(fIsWIN95 ? 2 : 60)` 三元 macro 推 "PAL_CLASSIC build → chunk 60" — **没查 fIsWIN95 实际值**,把 fIsWIN95 和 PAL_CLASSIC 混成一回事
3. 起手 msg 写 "OpeningMenu 3 选 1(新/读档/退出)" 我没怼,直到查 sdlpal `uigame.c:105-109` 才发现真值是 2 项
4. 本 audit doc 自己只"通读 cli.ts"没追 **parser 函数实现**,把 `parseWordDat` 当作"WORD.DAT 全 dump",实际只 dump 5/7 category 丢 55 条 sys/UI/battle menu label — **audit doc 本身 shallow,失去 single source of truth 价值** — user 用 "WORD.DAT 你又少提取东西了?" 揭穿

**修法**(行为约束):
- 看 sdlpal 三元 macro 必查 condition 实际值,不凭印象
- find filename 0 hit ≠ "没提取",要 grep extractor cli.ts 实际逻辑
- 用户起手 msg 与 sdlpal 真值冲突时立刻问,不擅自二选一
- **audit doc 不能只看 cli.ts 调用 — 必须追 parser 函数实现(看是否 dump-all vs 选 subset)**;cli.ts 调用 `parseX` 不代表 X 被全 dump
- 本 audit doc 是 single source of truth — 后续 task 真做前先查,不再 shallow grep;但 audit doc 自己也得真实(本文档已在 2026-05-27 由 WORD.DAT 漏洞触发第一次修订)

待存 memory:`shallow-extract-audit-lesson.md` — "凭 find filename / sdlpal 三元 macro 推 M4 是否提取 X = 错;只信 cli.ts 通读 + parser 函数实现追溯 + 本 audit doc"
