# Resource Status · type-pal

> MKF + 非 MKF 资源(WORD.DAT / M.MSG / Musics / AVI / BDF)逐 chunk 提取覆盖率。**资源提取的单一真值源。**
> **职责**:本表 owns 每个 MKF / 非 MKF 资源每 chunk 的提取状态。runtime 功能(渲染 / 播放)→ [feature-status](feature-status.md);逐 opcode → [opcode-status](opcode-status.md)。
> **三表**:[feature-status](feature-status.md)(引擎功能)· [opcode-status](opcode-status.md)(事件 / opcode)· resource-status(资源提取,本表)
> **图例**:✅ done(已抽,byte-level 确认)· ⚠️ partial · ⬜ todo · N/A · ⬛ 空 chunk(0 字节,引擎从不加载,非 gap)· 🎵 同源冗余(已有其他格式覆盖)
> **最后更新**:2026-06-16 — 基线 2026-06-07 byte-level 复核(6-07 后仅新增 `asset-manifest.json` 派生清单 + WORD.DAT 剥尾标「1」,提取覆盖率不变);M4 提取实质 100% 完成,零真实数据 gap(全非空 chunk 已落地,skip 的都是引擎从不加载的空槽)。SSS chunk 2 的 **union-view**(`object-magics.json` / `object-poisons.json` / `object-players.json`,非新源数据,见下表 SSS chunk 2)供战斗 opcode 按 object id 解析。runtime 音频 wiring 已归 feature-status H1-H3 接入,soundfont 已随 public 提供,剩 per-track 听验 / 音量音色确认,非提取 gap。
>
> 数据来源:`reference/sdlpal/global.c::PAL_LoadDefaultGame` + 各 .c grep;状态列由 byte-level 复核(逐 MKF header chunk_count vs `data/extracted/` 实际输出数 + 追 parser 源码确认 dump-all)。提取入口:[packages/pal-extract/src/cli.ts](../packages/pal-extract/src/cli.ts)。
> MKF 文件存在性:STUFF.MKF / SAVE.MKF 在 `data/raw/` 中不存在(WIN95+ 用 .RPG 存档);`mus.mkf` 存在但与 MIDI 同源(见末段)。

---

## DATA.MKF

真实 chunk count = **15**(index 0–14)。chunk 7、8 为空(0 字节)。**13 个非空 chunk 全抽。**

| Chunk | 字节数 | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|---|
| 0 | 378 | `global.c:292 LOAD_DATA … chunk 0 fpDATA` | STORE 数组(21 条,9 个 WORD 商品槽/条) | ✅ | `data/stores.json`(parseStores,21 条) |
| 1 | 10780 | `global.c:293 LOAD_DATA … chunk 1 fpDATA` | ENEMY 数组(154 条,70 字节/条) | ✅ | `data/enemies.json` |
| 2 | 3800 | `global.c:294 LOAD_DATA … chunk 2 fpDATA` | ENEMYTEAM 数组(380 条,10 字节/条) | ✅ | `data/enemy-teams.json` |
| 3 | 900 | `global.c:428 PAL_MKFReadChunk … chunk 3 fpDATA` | PLAYERROLES(整块 900 字节,6 角色) | ✅ | `data/player-roles.json` |
| 4 | 3328 | `global.c:296 LOAD_DATA … chunk 4 fpDATA` | MAGIC 数组(104 条,32 字节/条) | ✅ | `data/magic.json` |
| 5 | 696 | `global.c:297 LOAD_DATA … chunk 5 fpDATA` | BATTLEFIELD 数组(58 条,12 字节/条) | ✅ | `data/battle-fields.json` |
| 6 | 400 | `global.c:299 LOAD_DATA … chunk 6 fpDATA` | LEVELUPMAGIC_ALL(20 级 × 5 角色 × {wLevel,wMagic}) | ✅ | `data/level-up-magic.json`(parseLevelUpMagic,20 条) |
| 7 | 0 | (no sdlpal reference) | 空 chunk | ⬛ | skip |
| 8 | 0 | (no sdlpal reference) | 空 chunk | ⬛ | skip |
| 9 | 25532 | `ui.c:75 CHUNKNUM_SPRITEUI=9 fpDATA` | UI sprite sheet(战斗/菜单通用) | ✅ | `images/ui/frame-NN.png` × 71 + `data/ui-sprite/spriteui.json`(原始 imagecount=72,末项 idx71 offset=0 "Bloody-Mouth Bug" pad;导出有效帧 0..70) |
| 10 | 17478 | `battle.c:1787 chunk 10 fpDATA → g_Battle.lpEffectSprite` | 战斗效果 sprite | ✅ | `images/magic/frame-NN.png` × 85 + `data/magic-sprite/effect.json`(原始 imagecount=86,末项 idx85 offset=0 pad;导出有效帧 0..84) |
| 11 | 40 | `global.c:301 LOAD_DATA … chunk 11 fpDATA → rgwBattleEffectIndex[10][2]` | 角色战斗效果索引(10 套 × 2 WORD) | ✅ | `data/battle-effect-index.json`(parseBattleEffectIndex,20 WORD) |
| 12 | 282 | `text.c:891 PAL_MKFReadChunk … chunk 12 fpDATA → bufDialogIcons` | 对话框图标 sprite | ✅ | `data/dialog-icons-raw.json`(raw base64,runtime 解 RLE) |
| 13 | 100 | `global.c:303 PAL_MKFReadChunk … chunk 13 fpDATA → EnemyPos` | 敌人出场位置表(5 队型 × 5 槽 × {x,y}) | ✅ | `data/enemy-pos.json` |
| 14 | 200 | `global.c:306 PAL_MKFReadChunk … chunk 14 fpDATA → rgLevelUpExp[100]` | 升级经验表(100 WORD) | ✅ | `data/level-up-exp.json`(parseLevelUpExp,100 条) |

---

## SSS.MKF

真实 chunk count = **5**(index 0–4)。**5 chunk 全消费。**

| Chunk | 字节数 | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|---|
| 0 | 162464 | `global.c:348 PAL_DOALLOCATE fpSSS chunk 0 EVENTOBJECT` | EVENTOBJECT 数组(5077 条,32 字节/条) | ✅ | `data/event-objects.json`(5077 obj / 295 sceneRange) |
| 1 | 2360 | `global.c:404 PAL_MKFReadChunk … chunk 1 fpSSS → rgScene` | SCENE 数组(295 条,8 字节/条) | ✅ | `data/scene/N.json` × 295 |
| 2 | 7910 | `global.c:408 PAL_MKFReadChunk … chunk 2 fpSSS → rgObject` | OBJECT 数组(565 条 × 7 u16 = 3955;物品/法术/敌人/毒/角色 **联合体**,`global.h tagOBJECT`) | ✅ | `data/items.json` / `spells.json` / `enemy-objects.json` + **union-views**:`object-magics.json`(565,magic-union:magicNumber/scriptOnSuccess/scriptOnUse/flags)· `object-poisons.json`(565,poison-union:level/color/playerScript/enemyScript)· `object-players.json`(6,player-union:scriptOnFriendDeath/scriptOnDying)。后三者是**同一 chunk 的衍生视图**(非新增源数据),供战斗 opcode / post-action check 按 object id 解析:`object-magics` 给 0x57/0x88(set magic damage by MP/money)+ performMagic scriptOnSuccess;`object-poisons` 给 0x28 apply poison(解 wEnemyScript 每回合 tick)/ 0x5E jump-if-no-poison;`object-players` 给队友死亡/濒死脚本。提取见 `cli.ts` 同一 `sssObjBuf` 上的 parseObjectMagics / parseObjectPoisons / parseObjectPlayers |
| 3 | 54056 | `text.c:795 PAL_MKFGetChunkSize chunk 3 fpSSS` | 消息偏移表(13514 个 DWORD → 13513 条消息) | ✅ | `parseSss` 内 `parseMessageOffsets` 全消费 → `lookup/strings.json`(13513 条)+ 嵌入 disasm |
| 4 | 348024 | `global.c:351 PAL_DOALLOCATE fpSSS chunk 4 SCRIPTENTRY` | 脚本字节码(43503 条 SCRIPTENTRY,8 字节/条) | ✅ | `events/scene-NNN.json` × 295 + `shared.json` + `objects.json`(disasm+recompile round-trip OK) |

---

## MGO.MKF

真实 chunk count = **637**(index 0–636);chunk 0 空,**636 非空全 dump**(M5.Sync.2 改 dump-first/filter-never)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 1–636 | `res.c:289 PAL_MKFDecompressChunk … fpMGO`;`res.c:327`(player sprite);`ending.c:321 chunk 571,572` | YJ2 压缩 sprite 集:地图 NPC/玩家行走精灵 + 过场动画 | ✅ | `images/world/npc/{id}/frame-NN.png`(636 dir,4133 PNG)+ `data/sprite/{id}.json` × 636(cli.ts:668-686 `for id<mgoChunkCount`) |

---

## MAP.MKF

真实 chunk count = **226**(index 0–225);空 chunk 0/168/171,**223 非空全抽**(含无 scene 引用的 #104/#164)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 0–225 | `map.c:60 PAL_MKFGetChunkCount fpMapMKF`;`map.c:70 PAL_MKFGetChunkSize(iMapNum fpMapMKF)` | 地图 tile 层数据(128×64×2,含障碍位 `&0x2000` map.c:298) | ✅ | `data/tilemap/{mapNum}.json` × 223(cli.ts:577-580 全非空 chunk) |

---

## GOP.MKF

真实 chunk count = **226**(index 0–225);与 MAP.MKF 1:1,空索引相同 → **223 非空全抽**。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 0–225 | `map.c:130 PAL_MKFReadChunk(iMapNum fpGopMKF)`;`res.c:234 "gop.mkf"` | tileset 瓦片位图组(`map->pTileSprite`,PAL_SpriteGetFrame 按 tile 取帧;raw 非 YJ2) | ✅ | `images/world/tileset/map-{n}/tile-XXXX.png`(223 dir,67715 tile PNG;parseMap 内消费) |

---

## F.MKF

真实 chunk count = **19**(index 0–18),**全非空全抽**(M5.Sync.2 改 dump-all,原仅 6 角色)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 0–18 | `battle.c:888 PAL_MKFGetDecompressedSize(s fpF)` → 玩家战斗精灵;`fight.c:3136 … fpF` → 召唤兽 | YJ2 压缩战斗精灵(chunk index = `rgwSpriteNumInBattle`) | ✅ | `images/battle/player/{id}/frame-NN.png`(19 dir,149 PNG)+ `data/battle-sprite/player/{id}.json` × 19(loadBattleMkf `for id<total`) |

---

## ABC.MKF

真实 chunk count = **154**(index 0–153);chunk 0 空,**153 非空全抽**。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 1–153 | `battle.c:879 "abc.mkf"`;`battle.c:930 PAL_MKFDecompressChunk(enemy.wEnemyID fp)` | YJ2 压缩敌人战斗精灵(chunk index = enemy.wEnemyID) | ✅ | `images/battle/enemy/{id}/frame-NN.png` × 153(loadBattleMkf dump-all) |

---

## FBP.MKF

真实 chunk count = **78**(index 0–77);空 chunk 5/58,**76 非空全抽**。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 0 | `ui.h:83 STATUS_BACKGROUND_FBPNUM=0`;`uigame.c:1089 … fpFBP` | 状态栏背景图(320×200) | ✅ | `images/battle/bg/000.png` |
| 2 | `uigame.c MAINMENU_BACKGROUND_FBPNUM (fIsWIN95?2:60)` | OpeningMenu 主菜单背景(WIN95) | ✅ | `images/battle/bg/002.png` |
| 3,4 | `main.c:261 BITMAPNUM_SPLASH_UP=WIN95?3:38`;`main.c:264 …DOWN=WIN95?4:39` | 标题画面上/下半(WIN95) | ✅ | `images/battle/bg/{003,004}.png` + 另写 `images/splash/splash-{up,down}-win95.png` |
| 5,58 | — | 空 chunk(0 字节) | ⬛ | skip |
| 其余 | `battle.c:982 PAL_MKFDecompressChunk(wNumBattleField fpFBP)`;`ending.c:76,183,315,318` | 各关卡战斗背景 / 过场 / 结局背景(按 wNumBattleField 动态索引) | ✅ | `images/battle/bg/{NNN}.png`(共 76 张;cli.ts:768-798 `for i<fbpChunkCount`) |

---

## PAT.MKF

真实 chunk count = **9**(index 0–8),**全抽**;#0/#5 = 1536B 含夜间半(2026-05-29 补 night)。

| Chunk | 字节数 | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|---|
| 0 | 1536 | `palette.c:53 "pat.mkf"`;`palette.c:58 PAL_MKFReadChunk(buf 1536 iPaletteNum fp)` | 调色板(白天 256 + 夜间 256) | ✅ | `data/palette/0.json`(含 `nightColors`×256) |
| 1–4 | 768 | 同上 | 调色板(纯白天) | ✅ | `data/palette/{1..4}.json` |
| 5 | 1536 | 同上 | 白天 + 夜间 | ✅ | `data/palette/5.json`(含 `nightColors`×256) |
| 6–8 | 768 | 同上 | 纯白天 | ✅ | `data/palette/{6..8}.json` |

> decodePalette(palette.ts:32-37)`buf>768` 时抽 day+night,匹配 sdlpal `PAL_GetPalette(n,fNight)`。

---

## RNG.MKF

真实 chunk count = **12**(index 0–11),**全解**(T18 `decodeRngAnim` port `PAL_RNGReadFrame` + `PAL_RNGBlitToSurface` opcode 0x00-0x13)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 0–11 | `rngplay.c:74 PAL_MKFGetChunkCount(fpRngMKF)`;`rngplay.c:416 PAL_RNGReadFrame(…)`;`main.c:200 PAL_RNGPlay(6 …)` | RLE 压缩片段动画(sub-MKF + delta 逐帧;片头等) | ✅ | `images/animation/rng-{NN}/frame-{NNN}.png`(12 dir,**1464 帧**)+ `data/rng-frames.json` |

> ✅ runtime serve(2026-06-02 对抗复核订正):RNG PNG 经 `packages/game/public/extracted` → `data/extracted` **软链** + vite `fs.allow`(vite.config.ts:26-30)直接服务全 1464 帧(live dev curl `rng-06/frame-000.png` 200 image/png)。**无需 asset-copy**;原"0 份/M6 步骤"备注 FALSE 已订正(项目从不 serve production build,dev/playwright 均 vite dev)。

---

## RGM.MKF

真实 chunk count = **92**(index 0–91);空 chunk 0/20/78/79,**88 非空全解**(M5.6 T10d RLE 修)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 1–91(非空)| `uigame.c:1132 PAL_MKFReadChunk(buf iPlayerRole.rgwAvatar fpRGM)`;`text.c:1285,1330 …(iNumCharFace)` | 角色立绘/头像(chunk index = rgwAvatar / iNumCharFace;skip 4B file header `02 00 00 00`)| ✅ | `images/portraits/{NN}.png` × 88 + `data/portraits.json`(decodeRgmPortrait) |

---

## BALL.MKF

真实 chunk count = **252**(index 0–251);chunk 0 空,**251 非空全解**(M5.6 T10b RLE 修)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 1–251 | `uigame.c:1155 PAL_MKFReadChunk(bufImage 2048 rgObject.item.wBitmap fpBALL)`;`itemmenu.c:202`;`script.c:1496` | 道具/法术 UI 图标(chunk index = OBJECT.item/magic.wBitmap;skip 4B header)| ✅ | `images/items/{NNN}.png` × 251 + `data/items-icons.json` + `data/ball-raw.json`(decodeBallIcon) |

---

## FIRE.MKF

真实 chunk count = **55**(index 0–54),**全非空全解**。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 0–54 | `fight.c:2480,2488 PAL_MKFGetDecompressedSize/PAL_MKFDecompressChunk(iEffectNum fpFIRE)` | 战斗特效 sprite(YJ2;chunk index = iEffectNum) | ✅ | `images/magic/fire-NN/frame-NN.png`(55 dir,**837 帧**)+ `data/fire-sprites.json`(parseFirSprite) |

---

## SOUNDS.MKF

真实 chunk count = **505**(index 0–504);142 空,**363 非空全 dump → WAV**(2026-05-29 补)。

| Chunk | sdlpal 引用 | 含义 | 状态 | 输出 |
|---|---|---|---|---|
| 0–504 | `sound.c:964 "sounds.mkf" func=SOUND_LoadWAVEData`;`sound.c:792 PAL_MKFReadChunk(buf iSoundNum player->mkf)` | 音效 WAV/RIFF(chunk index = iSoundNum) | ✅ | `sounds/{i}.wav` × 363 + `data/sounds-metadata.json`(cli.ts:480-486 loop-over-all) |

> runtime 音频**播放**已由 core intent + shell `AudioManager` 接入;soundfont(`soundfont.sf3` = TimGM6mb,≈6MB,GPL-2;手工放入 `packages/game/public`,非 pal-extract 产物)已随 public 提供,当前剩 per-track 听验 / 音量音色确认。数据侧已全落地。

---

## 非 MKF 资源

| 资源 | 含义 | 状态 | 输出 |
|---|---|---|---|
| **WORD.DAT** | 565 条词条(system36 / persons6 / battleUi19 / items235 / spells102 / enemies153 / scenes14);按 sdlpal `text.c:785-786` 剥词条结尾标记字符「1」(BIG5→GBK 残留) | ✅ | `lookup/words.json`(parseWordDat flat 565 + 7 category) |
| **M.MSG** | 对话字符串表(SSS chunk3 偏移索引) | ✅ | `lookup/strings.json`(13513 条) |
| **Musics/** | 86 MIDI(`{NNN}.mid`)+ 8 CD `TRACKxx.ogg` | ✅ | `music/` × 94 + `data/music-manifest.json`(纯拷贝) |
| **mus.mkf** | RIX/OPL(AdLib FM)乐库,88 chunk / 86 非空 | 🎵 | **无需解码** — 见下段 |
| **1–6.avi** | trademark / splash / opening / cutscene / 结局 | ✅ | `videos/{1-6}.mp4`(离线 ffmpeg H.264 CRF18 + AAC 96k) |
| **unifont-cn.bdf** | Unifont CN 字形 | ✅ | `data/font/glyphs.json`(57083 字形;仅丢 ENCODING 0 .notdef) |
| **asset-manifest.json** | 全 extracted 产物清单(SW 离线预缓存用):每文件 `{path,size}` + `version`(sha256 前 16 位,内容敏感)+ `totalBytes`/`fileCount`;**派生索引,非新源数据** | ✅ | `asset-manifest.json`(`pnpm extract` 末尾 `cli.ts` buildManifest;源 `resources/asset-manifest.ts`) |

### mus.mkf — 同源冗余,非 gap

`mus.mkf` 确实存在(331284 字节,header `356/4-1=88` chunk、86 非空、首非空 chunk magic `0xaa55` = RIX 签名),但 **set-diff 证明它的 86 个非空 chunk track 号 `{1..87}\{29}` 与已提取的 86 个 MIDI 完全一致**(连两边都缺的 track 29 都对上)。它是 RIX/OPL 格式,与 MIDI 是同一音乐的另一编码:`audio.c:304-305` 仅在 `MUSIC_RIX` 时开,WIN95 忠实乐源走 `midi.c:67-69` 的 `Musics/%.3d.mid`,同 track 号索引。packages/ 内无任何 RIX/OPL 解码器,也不需要。**故无需解码 mus.mkf。**

---

## 覆盖率自检(2026-05-30 byte-level 复核)

| MKF / 资源 | 总 chunk | 空 chunk | 非空 | 已抽 | 输出 |
|---|---|---|---|---|---|
| DATA | 15 | 7,8 | 13 | ✅ 13/13 | 13 表 + UI 71 帧 + magic 85 帧 |
| SSS | 5 | — | 5 | ✅ 5/5 | events 298 + scene 295 + strings 13513 |
| MGO | 637 | 0 | 636 | ✅ 636/636 | 636 JSON + 4133 PNG |
| MAP | 226 | 0,168,171 | 223 | ✅ 223/223 | 223 tilemap JSON |
| GOP | 226 | 0,168,171 | 223 | ✅ 223/223 | 223 tileset dir + 67715 tile PNG |
| F | 19 | — | 19 | ✅ 19/19 | 19 JSON + 149 PNG |
| ABC | 154 | 0 | 153 | ✅ 153/153 | 153 enemy dir |
| FBP | 78 | 5,58 | 76 | ✅ 76/76 | 76 bg PNG + 2 splash |
| PAT | 9 | — | 9 | ✅ 9/9 | 9 palette(#0/#5 含夜间) |
| RNG | 12 | — | 12 | ✅ 12/12 | 1464 帧 PNG |
| RGM | 92 | 0,20,78,79 | 88 | ✅ 88/88 | 88 头像 PNG |
| BALL | 252 | 0 | 251 | ✅ 251/251 | 251 图标 PNG |
| FIRE | 55 | — | 55 | ✅ 55/55 | 837 帧 PNG |
| SOUNDS | 505 | 142 个 | 363 | ✅ 363/363 | 363 WAV |
| WORD.DAT | — | — | 565 词 | ✅ | words.json |
| M.MSG | — | — | 13513 条 | ✅ | strings.json |
| Musics | — | — | 94 文件 | ✅ | 86 mid + 8 ogg |
| mus.mkf | 88 | 0,29 | 86 | 🎵 同源冗余 | 无需解码(MIDI 覆盖) |
| 1–6.avi | — | — | 6 | ✅ | 6 mp4 |
| unifont BDF | — | — | 57083 | ✅ | glyphs.json |
| asset-manifest | — | — | 派生 | ✅ | 全产物清单(SW 预缓存) |

> **结论:无真实数据 gap。** STUFF.MKF / SAVE.MKF 在 `data/raw/` 中不存在(DOS/WIN95 以 `.RPG` 存档),不计入。音频运行时接线见 feature-status H1-H3,soundfont 已有,当前剩 per-track 听验 / 音量音色确认(非数据)。(RNG PNG runtime mirror 原备注已订正:软链 + vite fs.allow 已服务全帧,非 gap。)
