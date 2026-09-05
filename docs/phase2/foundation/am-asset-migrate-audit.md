# 资产 / 提取 / 迁移 八单元 三方逐函数对照审计(MKF / 精灵 / 字节码 / 资产管线 / manifest / 投掷物 / 战斗物品 / 数据 bug 补丁台账)

| 字段 | 值 |
|---|---|
| 审计日期 | 2026-07-05 |
| sdlpal C 真值 | `reference/sdlpal/{palcommon.c, res.c, script.c, fight.c, itemmenu.c, uigame.c, yj1.c}`(monorepo HEAD 同 commit) |
| 一阶段 .ts | `packages/shared/src/{mkf,rle,yj2}.ts` + `packages/pal-extract/src/{io/mkf,io/sss,events/*,resources/{sprite,asset-manifest},resources/parsers/*}.ts` + `packages/game/src/core/event-system.ts`(patchGiveItemZeroBugs) + `packages/game/src/core/battle/actions/{throw-item,item}.ts` + `packages/game/src/assets/png.ts` |
| reforge .ts | `packages/reforge/src/{loader,assets}.ts` + `packages/reforge/src/text/palette-color.ts` + `packages/reforge/src/battle/battle-core.ts` + `packages/content/src/{character,item}.ts` |
| migrate .ts | `packages/migrate/src/{index,bake-indexed-rgba,translate-events,migrate-content,source-facts}.ts` |
| 审计单元 | 8(MKF 提取 / 精灵解码 / 事件字节码 / 资产管线 / 资源 manifest / 投掷物 / 战斗物品 / 数据 bug 补丁台账) |
| 方法 | sdlpal C 真值逐函数 → 一阶段逐函数对照(✅/⚠️/❌ + git fix 锚点)→ reforge/migrate 逐函数对照(✅/⚠️/❌/✨)→ 缺口 + 风险 + 行动 |

> **行号口径**:sdlpal 行号锚 C 文件 cat -n 行号;一阶段锚 `packages/{shared,pal-extract,game}/src/...` cat -n 行号;reforge/migrate 锚 `packages/{reforge,content,migrate}/src/...` cat -n 行号。所有锚点为本审计读取时 HEAD 真值。
>
> **状态图例**:✅ 完全对齐 / ⚠️ 部分偏离 / ❌ 缺失 / ✨ 新架构免疫(用 reforge 范式重做后该坑不存在或不适用)。
>
> **领域定位**:本审计 = reforge 8 领域之 **MG(迁移器)** + **A(资产/分发)** 主战场 + **B(战斗)遗留两单元(投掷物 / 战斗物品)**。前置必读 [phase1-knowledge-harvest §MG/§A](phase1-knowledge-harvest.md)。

---

## 总览矩阵(先看结论)

| 单元 | sdlpal 核心 | 一阶段 | reforge / migrate | 一阶段 fix 命中 | reforge 命中 |
|---|---|---|---|---|---|
| 1 MKF 提取 | palcommon.c PAL_MKF* + yj1.c | shared/mkf.ts + shared/yj2.ts | reforge 经 gzip blob,**不经 MKF** | 3/3(roundtrip/yj2/guard) | ✨ 免疫(资产形态变,不再读 MKF) |
| 2 精灵解码 | palcommon.c PAL_RLEBlitToSurfaceWithShadow + PAL_SpriteGetFrame + PAL_SpriteGetNumFrames | shared/rle.ts(decodeRle + parseSpriteChunk) | reforge 复用 shared parseSpriteChunk | 4/4(opaque/broken-sprite/skipPrefix/键一致) | ✅ 直接复用,broken-sprite guard 保留 |
| 3 事件字节码 | script.c PAL_InterpretInstruction + 跳转族 | pal-extract events/{disasm,recompile,slice,opcodes} + game/event-system 双解释器 | migrate/translate-events.ts 单向翻译 | 4/4(roundtrip/JUMP_TARGET/globalEntries/0xA2) | ⚠️ 单向无 oracle,跳转族 21 op 截断 |
| 4 资产管线 | res.c PAL_LoadResources + palcommon RLE | game/assets/png.ts(IndexedImage)+ pal-extract/sprite.ts(encodeIndexedPng) | migrate/bake-indexed-rgba.ts + reforge/assets.ts | 3/3(opaque mask/R=G=B/decode 端) | ✅ bake 正确(opaque→A=255,transparent→A=0) |
| 5 资源 manifest | res.c PAL_InitResources(装载清单)+ global.c 文件表 | pal-extract/asset-manifest.ts(SHA256 version)+ game/loader.ts | reforge/loader.ts manifest.json + content/character.ts LoadedManifest | 2/2(version 哈希/排除规则) | ⚠️ 工程级 manifest 已立,**资产 manifest(版本/CDN/SW)未立** |
| 6 投掷物品 | fight.c kBattleActionThrowItem(挥臂 → scriptOnThrow → 消耗) | game/battle/actions/throw-item.ts | ❌ reforge 未实现(ThrowSpec 占位) | 5/5(挥臂顺序/scriptOnThrow/消耗/0x42 注入/敌人不 track) | 0/5(占位) |
| 7 物品(战斗) | fight.c kBattleActionUseItem + uigame.c PAL_ItemUseMenu | game/battle/actions/item.ts | reforge/battle/battle-core.ts `act.kind==='item'` | 4/4(scriptOnUse/consuming 后扣/目标/敌人不 track) | ⚠️ 2/4(healHp/healMp/revive 直写,**scriptOnUse AST 未跑**) |
| 8 数据 bug 补丁台账 | script.c giveItem(0) 原版数据 bug + 6 类已拍板修复 | event-system.ts patchGiveItemZeroBugs(运行时层) | ❌ migrate 翻译期未烘焙补丁 | 1/1(giveItem-zero 修运行时层) | ❌ 0/1(无运行时层,须 migrate 烘焙,**当前直译 itemId:0**) |

---

## 审计单元 1:MKF 提取(res.c → 一阶段 shared/mkf.ts → reforge)

### 1.1 sdlpal C 真值

#### `PAL_MKFGetChunkCount`(palcommon.c:855-884)
- 头 4 字节 = `INT iNumChunk`(LE),`count = (iNumChunk - 4) >> 2`。
- NULL fp → 0;读失败 → 0。

#### `PAL_MKFGetChunkSize`(palcommon.c:887-936)
- 越界(`uiChunkNum >= uiChunkCount`)→ -1。
- 偏移 = `fseek(4*uiChunkNum)` 读两个 u32 LE,长度 = `uiNextOffset - uiOffset`(**不做对齐 / 不 cap**)。

#### `PAL_MKFReadChunk`(palcommon.c:939-1013)
- 越界 → -1;buffer 不够 → -2;零长 → -1;否则 `fread(lpBuffer, 1, uiChunkLen, fp)` 返回实读字节数。
- **不做解压** —— 调用方按文件类型决定是否再过 `PAL_MKFDecompressChunk`。

#### `PAL_MKFGetDecompressedSize`(palcommon.c:1016-1082)
- **双格式分支**:
  - `gConfig.fIsWIN95` → 头 4 字节 = u32 LE UncompressedLength,直接返回。
  - 否则(DOS)→ 读 8 字节,前 4 = magic,后 4 = 长度;magic != `0x315f4a59`("YJ_1") → -1。
- WIN95 路径 = type-pal 实际目标(1998 Win9x 版);DOS 路径在本项目不用。

#### `PAL_MKFDecompressChunk`(palcommon.c:1085-1136)
- `len = PAL_MKFGetChunkSize(...)`;`malloc(len)`;`PAL_MKFReadChunk(buf, len, ...)`;`len = Decompress(buf, lpBuffer, uiBufferSize)`;free(buf)。
- `Decompress` 函数指针在 `global.c:202`:`gConfig.fIsWIN95 ? YJ2_Decompress : YJ1_Decompress`。type-pal 走 **YJ2**(`yj1.c::YJ2_Decompress` —— 文件名历史遗留,YJ2 也在 yj1.c)。

#### `YJ2_Decompress`(yj1.c:129-)
- 适配 Huffman + LZSS;每解一个 symbol 调整树权重。Symbol 0..0xFF = 字面字节,0x100..0x140 = LZSS 回引(长度 = val - 0xFD,即 3..67),pos==0xFFF = 流结束。

### 1.2 一阶段实现

#### `packages/shared/src/mkf.ts`(43 行)
- `openMkf(buffer)`(mkf.ts:12-30):首 u32 LE = `firstOffset`,要求 `% 4 === 0`,`count = firstOffset/4 - 1`,一次性读完全部 offset 表。
- `chunkCount(mkf)`(mkf.ts:32-34)= `offsets.length - 1`。
- `readChunk(mkf, index)`(mkf.ts:36-43):越界抛错;返回 `buffer.subarray(start, end)` —— **零拷贝视图**。
- `packages/pal-extract/src/io/mkf.ts`:**纯 re-export**,注释明"已搬到 shared(extractor 与 runtime 共用;runtime 的 RNG 动画解码需要读 RNG chunk 内层 sub-MKF)"。

#### `packages/shared/src/yj2.ts`(200 行)
- 1:1 port 自 `yj1.c::YJ2_Decompress`,注释引 `global.c:202`。
- 文件头注释完整说明树结构(节点 0..0x140 叶子 / 0x141..0x280 内部 / 0x280 根 parent 指向自己)+ symbol 语义。

| C 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_MKFGetChunkCount | shared/mkf.ts openMkf + chunkCount | ✅ |
| PAL_MKFGetChunkSize | (隐式,readChunk 用 offsets[index+1]-offsets[index]) | ✅ |
| PAL_MKFReadChunk | shared/mkf.ts readChunk(subarray 零拷贝) | ✅(越界改抛错,非 -1) |
| PAL_MKFGetDecompressedSize | (在 yj2 解压入口隐式:首 u32 = UncompressedLength) | ✅(WIN95 路径) |
| PAL_MKFDecompressChunk | pal-extract CLI:readChunk → yj2.ts decompress | ✅ |
| YJ2_Decompress | shared/yj2.ts | ✅(1:1 port) |
| Decompress 函数指针(global.c:202) | shared 硬编 YJ2(type-pal 目标 = WIN95) | ✅(去 DOS 分支,合理简化) |

**一阶段 fix 命中**:
- `e205c26d`(roundtrip 43503 指令逐字节一致)— roundtrip 不变式已立(见单元 3)。
- shared 化决定(S1 tileset 资源管线优化):extractor 与 runtime 共用同一份解码,避免分叉。
- 越界改抛错(非 C 的 -1 返回)= TS 风格,调用方 try/catch 或先验 `index < chunkCount`。

### 1.3 reforge / migrate 实现

**reforge 不直接读 MKF**。资产形态在 migrate 阶段已转换:

- `packages/reforge/src/assets.ts:58-127`:`loadTilemap` / `loadSprite` / `loadBattleSprite` / `loadMagicEffectSprite` / `loadFireSprite` 全部走 `fetch(url) → decompressGzip(blob) → parseSpriteChunk(bytes)`。
- `decompressGzip`(assets.ts:170-):浏览器原生 `DecompressionStream('gzip')`,**含双解压防御**(无 `1f 8b` 魔数 = 上游已解,直接返回)。
- migrate 把原版 RLE blob **重新 gzip**(scripts/migrate-content.mts 的 bake 步骤),reforge 用浏览器原生 gzip 解。

| C 函数 | reforge 对照 | 状态 |
|---|---|---|
| PAL_MKF* | (不读 MKF;资产已离线迁移成 .rle gzip blob) | ✨ 免疫 |
| YJ2_Decompress | (不在运行时;YJ2 解压在 pal-extract 离线一次性完成) | ✨ 免疫 |
| Decompress 函数指针 | (静态决定:reforge 用 gzip,migrate 读已 YJ2 解压的产物) | ✨ |

**结论**:MKF/YJ2 是**离线提取期关注点**;reforge 运行时完全不接触,资产以 gzip RLE blob / baked RGBA PNG 形态分发。**双格式分支(DOS magic 校验)被合理去除**(type-pal 目标明确 = WIN95)。

---

## 审计单元 2:精灵解码(palcommon.c, res.c → shared/rle.ts → reforge)

### 2.1 sdlpal C 真值

#### `PAL_RLEBlitToSurfaceWithShadow`(palcommon.c:46-242)
- **跳 0x00000002 文件头**(palcommon.c:96-100):整 chunk RLE bitmap 首部带此 magic,sprite-group 帧经 `PAL_SpriteGetFrame` 取真 offset 后**无此 magic**。
- 帧头 4 字节:`uiWidth = b[0]|b[1]<<8`,`uiHeight = b[2]|b[3]<<8`(LE)。
- **指令字节 T**:
  - `T & 0x80 && T <= 0x80 + uiWidth` → 跳 `T - 0x80` 像素(透明,**uiSrcX 回绕触发 dy++ 换行**)。
  - else → 接下来 T 个字节是像素值,**逐字节写入 dst**(支持行末回绕)。
- **shadow 模式**:`p[x] = PAL_CalcShadowColor(p[x])` 逐像素降明度(`(src & 0xF0) | ((src & 0x0F) >> 1)`,palcommon.c:28-32)—— **不是固定黑**。
- **裁剪**:bitmap 与 surface 不相交直接 `goto end`;逐行处理 x<0 / x>=w / y<0 / y>=h 的越界像素。

#### `PAL_SpriteGetFrame`(palcommon.c:803-852)
- `imagecount = lpSprite[0] | (lpSprite[1] << 8)`(**注释明 "Hack for broken sprites like the Bloody-Mouth Bug"**,palcommon.c:834:原版应是 `-1`,被注释掉改成不减)。
- 越界(`iFrameNum < 0 || >= imagecount`)→ NULL。
- `offset = (lpSprite[iFrameNum*2] | lpSprite[iFrameNum*2+1]<<8) << 1`(u16 word offset 左移 1)。
- `if (offset == 0x18444) offset = (WORD)offset;`(palcommon.c:850)— 截断到 u16 的特殊修补。

#### `PAL_SpriteGetNumFrames`(palcommon.c:776-800)
- **关键分歧**:返回 `imagecount - 1`(`(lpSprite[0]|lpSprite[1]<<8) - 1`)。
- 即"帧数 = word0 - 1";但 `PAL_SpriteGetFrame` 用 word0 不减当上限 —— **二者差 1**,正好对应 broken-sprite 的那个尾帧(`PAL_SpriteGetFrame` 能取到 word0-1 索引,`PAL_SpriteGetNumFrames` 报少 1)。

#### `res.c::PAL_LoadResources` sprite 装载(res.c:277-298)
- 遍历场景 eventObject,`n = lprgEventObject[index].wSpriteNum`;n==0 → NULL。
- `l = PAL_MKFGetDecompressedSize(n, fpMGO)`;`malloc(l)`;`PAL_MKFDecompressChunk(...)` > 0 时**回填** `lprgEventObject[index].nSpriteFramesAuto = PAL_SpriteGetNumFrames(sprite)`(res.c:296-297)。
- **`nSpriteFramesAuto` 是装载回填字段,Dump 静态值恒 0** —— 误判死代码会冻 NPC idle 动画(harvest E2 锚点 `09ba1e04` 血池根因)。

### 2.2 一阶段实现

#### `packages/shared/src/rle.ts`(126 行)
- `decodeRle(buf, opts?)`(rle.ts:42-95):
  - `opts.skipFilePrefix`(默认 false):单帧整 chunk 跳 `0x00000002` 前缀(rle.ts:54-61);sprite-group 帧不跳。**这一个参数统一了原先 shared / game 两份分叉的 decodeRle**(rle.ts:1-10 注释)。
  - 帧头 LE width/height;指令字节 `b >= 0x80` → 跳 `b-0x80`(opaque 保持 0);else → 接下来 b 字节是像素值(opaque=1)。
  - **返回 `{width, height, pixels, opaque}`** —— `opaque` 数组显式区分 RLE-skip 透明 vs opaque-palette-0(rle.ts:21-29 注释明这是 M3.5 fix)。
- `parseSpriteChunk(buf)`(rle.ts:108-126):
  - `frameCount = view.getUint16(0, true)`;逐帧 `wordOffset = view.getUint16(i*2, true)`,`offset = wordOffset << 1`。
  - `offset === 0 || offset >= buf.byteLength` → `continue`(空缺帧不进数组)。
  - **dimensions sanity guard**(rle.ts:14-15, 96-99):`SPRITE_DIM_MAX = 400`,width/height 任一 > 400 或 == 0 → `continue`。注释明"sdlpal PAL_SpriteGetFrame 'Hack for broken sprites like the Bloody-Mouth Bug' —— imagecount 字段可能比实际帧数多 1,多出来的尾帧 offset 指向 chunk 内任意位置,被当作 RLE 解读会得到天文数字 width/height,decodeRle 死循环"。
  - **键一致性铁律**(rle.ts:101-104):返回数组下标 i = tile 索引,runtime 与 extractor 必须用同一份本函数。

| C 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_RLEBlitToSurfaceWithShadow(解码部分) | shared/rle.ts decodeRle | ✅(opaque mask 显式化) |
| PAL_RLEBlitToSurfaceWithShadow(shadow) | present 端 PAL_CalcShadowColor 等价 | ✅(blit 端,本单元不审) |
| PAL_SpriteGetFrame | shared/rle.ts parseSpriteChunk | ✅(+ broken-sprite guard) |
| PAL_SpriteGetNumFrames(imagecount - 1) | (隐式:parseSpriteChunk 跳过 imagecount 上限外的尾帧) | ✅(guard 等价) |
| res.c nSpriteFramesAuto 回填 | game loader 装载时填 EntityDef.frameCount | ⚠️(见 harvest E2:需核 migrate 是否烘帧数进 EntityDef) |
| 0x00000002 前缀跳过 | opts.skipFilePrefix 双模式 | ✅(rle.ts:54-61) |

**一阶段 fix 命中**:
- **opaque mask vs idx===0**(harvest W2,`0cbf7fe4`):早期 `idx===0 continue` 把 RLE-skip 与 opaque-palette-0 合并 → dense scene 16 通道 tile / 角色 sprite 头发暗部凡 palette 0 全被误判为透明。修法 = 分离两概念,`opaque` 数组显式。
- **broken-sprite guard**(harvest MG5,rle.ts:96-99):400 上限 + offset 越界 continue。
- **skipFilePrefix 双模式**(rle.ts:1-10):统一 shared / game 两份分叉的 decodeRle。
- **键一致性铁律**(rle.ts:101-104):返回数组下标 = tile 索引。

### 2.3 reforge / migrate 实现

- `packages/reforge/src/assets.ts:7`:`import { parseSpriteChunk } from '@type-pal/shared'` —— **直接复用 shared**,无第二份解码器。
- `loadTilemap` / `loadSprite` / `loadBattleSprite` / `loadMagicEffectSpriteSprite` / `loadFireSprite`(assets.ts:58-127):全部 `parseSpriteChunk(decompressGzip(blob))`。

| 函数 | reforge 对照 | 状态 |
|---|---|---|
| decodeRle(opaque mask) | (经 parseSpriteChunk 间接复用) | ✅ |
| parseSpriteChunk(broken-sprite guard) | reforge 直接 import shared | ✅(guard 保留) |
| 0x00000002 前缀 | (sprite-group 路径不传 skipFilePrefix;单帧整 chunk 在 pal-extract 端已展平) | ✅ |
| 键一致性 | reforge 与 extractor 共用 shared | ✅ |

**结论**:**MKF broken-sprite guard(400 上限)保留**(harvest 重点核对项 ✅)。reforge 不重新实现解码,与 pal-extract 同源,无分叉风险。

---

## 审计单元 3:事件字节码(script.c → pal-extract/events/ → migrate/translate-events.ts)

### 3.1 sdlpal C 真值

#### `PAL_InterpretInstruction`(script.c,3652 行全量)
- **每条指令 8 字节** = u16 LE opcode + 3×u16 LE operand。
- 大量条件跳转 opcode:`wScriptEntry = rgwOperand[N]` 设目标,`-1` 与外层 `wScriptEntry++` 抵消(`script.c:1864/1920/1938/...`,见 JUMP_TARGET_OPERAND 真值出处注释)。
- `0x00A2` 随机跳:`wScriptEntry += RandomLong(0, op0-1)`(script.c:3020)+ 末尾 +1 → 跳 [i+1, i+op0] 之一(相对)。
- `0x24 setAutoScript` / `0x25 setTriggerScript`:把 NPC 的 wAutoScript / wTriggerScript 指针设到 op1 指向的脚本(非跳转,但目标脚本若不收集会被剪)。

#### 字节码无显式入口表
- 入口 = `lprgEventObject[].wTriggerScript/wAutoScript` + `rgScene[].scriptOnEnter/scriptOnTeleport` + items/spells/enemyObjects 的 `scriptOn{Use,Equip,Throw,...}`(全局 SCRIPTENTRY 数组,script.c:3140 `PAL_RunTriggerScript(wScriptEntry, ...)`)。

### 3.2 一阶段实现

#### `packages/pal-extract/src/events/opcodes.ts`(311 行)
- `opcodeTable`(0..0x?? 的具名/raw 标记 + fields)。
- `JUMP_TARGET_OPERAND`(opcodes.ts:243-276):**27 个条件跳转 opcode → 目标在哪个 operand**(0-based)。注释引 sdlpal script.c 真值出处(`0x58:1864 / 0x5D:1920 / ...`)。
- L29 补 13 个(opcodes.ts:259-275,fix `b3b9c8b7`):此前缺失 → slice BFS 不跟随、disasm 不打 L_ 标签,仅经它们可达的块(实测 scenes +111 / shared +133 / 共 244 条)被切片丢弃。
- `RANDOM_JUMP_OPCODE = 0x00a2`(opcodes.ts:283)。

#### `packages/pal-extract/src/events/disasm.ts`(255 行)
- **两遍扫描**:第 1 遍翻指令 → Command + 收集跳转目标(指令下标);第 2 遍对被跳转的指令打 label 字段。
- 具名 op:end / goto / showDialog / giveItem / loadScene / setPalette / setDialogStyle{Center,Top,Bottom,Narration};其余落 RawCommand(字节平凡可逆)。
- `entryIps` 参数:入口 ip 本身未必被跳转指向,但运行时需从此进入,也打 label。

#### `packages/pal-extract/src/events/slice.ts`(241 行)
- BFS 从每场景入口 + globalEntries 收集可达指令下标。
- **M5.6 修(slice.ts:14-23 注释)**:`globalEntries` 参数 — items/spells/enemyObjects 的 scriptOn{Use,Equip,...} 入口单列,不属于任何 scene,**强制归 shared**。原 sliceByScene 漏收 → 整批 script bytecode 被切片丢弃 → 用物品没反应根因。
- 跨文件标签改写仅对具名 goto 生效;raw 命令数字 operand 不改写。

#### `packages/pal-extract/src/events/recompile.ts`(95 行)
- 命令清单 → 字节码,disasm 的逆操作,**严格对偶**。
- round-trip 不变量:disasm(bc, msgs) → recompile(_, msgs) 字节相等(recompile.ts:5-8)。
- 结构化命令(sequence / if / choice)throw —— 它们是 authored content,不参与 round-trip(recompile.ts:88-91)。

#### `packages/pal-extract/src/events/roundtrip.ts`(59 行)+ `roundtrip.test.ts`
- `roundtripCheck(sssBuf, msgBuf)`:disasm → recompile,逐字节比对;失败返回首字节偏移 / 指令下标 / opcode。
- 真实 SSS.MKF chunk 4 字节完全一致(`e205c26d` 43503 指令逐字节一致)。

#### `packages/game/src/core/event-system.ts` 双解释器
- `applyRawOpcode`(事件侧)+ `dispatchBattleOpcode`(战斗侧)—— 某 op 可能只实现一侧(0x8A 漏事件侧致石长老战变手动)。

| C 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_InterpretInstruction(跳转族) | JUMP_TARGET_OPERAND 27 op + RANDOM_JUMP_OPCODE | ✅(L29 补 13) |
| 入口扫描(scene + globalEntries) | slice.ts globalEntries 参数(M5.6 修) | ✅ |
| disasm ↔ recompile 字节级 | roundtrip.ts + 全量 SSS.MKF 测 | ✅(e205c26d) |
| 双解释器(事件 + 战斗) | applyRawOpcode + dispatchBattleOpcode | ⚠️(0x8A 曾漏事件侧) |

**一阶段 fix 命中**:
- `e205c26d`:roundtrip 全量回归门(43503 指令逐字节一致)。
- `b3b9c8b7`(L29):JUMP_TARGET_OPERAND 补 13 个条件跳转 opcode。
- M5.6 修:globalEntries 强制归 shared(用物品没反应根因)。
- 0x8A 双解释器漏一侧(战斗侧石长老战变手动)。

### 3.3 reforge / migrate 实现

#### `packages/migrate/src/translate-events.ts`(774 行)
- **单向翻译**:Command → 结构化 AST(Command 联合,content 包)。
- 具名 op 直译(showDialog / loadScene / goto / giveItem / setDialogStyle / end);raw op 部分翻译(0x15 setPartyFacing / 0x65 setActorSprite / 0x70 setPartyPos / ...),其余落 `unmigrated` 上报。
- **JUMP_FAMILY 截断**(translate-events.ts:69-72):21 个未实现跳转族(0x2e/0x33/0x34/0x38/0x3a/0x58/0x5d/0x5e/0x61/0x64/0x68/0x74/0x81/0x83/0x84/0x86/0x91/0x95/0x9c/0x9e/0xa2)命中即截断本段,**不猜控制流**(translate-events.ts:13-14 注释)。
- 分支臂内联深度上限 `MAX_ARM_DEPTH = 3`、单臂命令上限 `MAX_ARM_BODY = 200`、段体命令上限 `MAX_BODY = 800`(防组合爆炸)。
- `armMemo`(translate-events.ts:`TranslateCtx.armMemo`):同一游戏over/败臂被数百战斗共享,防重复走 + 堆爆。

| 函数 | migrate 对照 | 状态 |
|---|---|---|
| disasm ↔ recompile 字节级 | migrate **单向**,无 recompile | ⚠️(无 roundtrip oracle) |
| JUMP_TARGET_OPERAND 27 op | JUMP_FAMILY 21 op 截断(已实现 6:0x06/07/0A/1E/20/79/94) | ⚠️(全量翻译免疫切片问题,但未实现跳转族截断上报) |
| 0xA2 随机跳 | 在 JUMP_FAMILY 截断 | ⚠️(未实现) |
| 全量翻译免疫切片 | migrate 读 events/all.json 全量 + labelAt 全局索引 | ✨ 免疫(不再切片,无需 globalEntries) |
| fidelity oracle | ❌ **无**。translate-events.test.ts 仅手搓链单测,无"全量翻译后行为等价"门 | ❌ 缺口 |

**结论**:
- **JUMP_TARGET_OPERAND 切片表 — reforge 全量翻译免疫**(harvest 重点核对项 ✅):migrate 读 events/all.json 全量,labelAt 全局索引,不再切片,globalEntries 问题不存在。
- **roundtrip 不变式 — reforge 单向翻译,需 fidelity oracle**(harvest 重点核对项 ⚠️):当前 migrate 无"翻译后行为等价"的回归门。translate-events.test.ts 仅手搓链单测(开场三 op),migrate-content.test.ts 是 golden 测(demo 手作核真值),**无全量字节级或行为级 fidelity 检查**。
  - **风险**:翻译规则变更(如新增跳转族实现)可能静默改变数百场景行为,无门抓。
  - **行动**:建 fidelity oracle —— 至少对"已实现跳转族 + 具名 op"覆盖的场景,跑 migrate → 比对关键不变量(段数 / giveItem 总数 / loadScene 总数 / showDialog 顺序)。

---

## 审计单元 4:资产管线(res.c → assets/png.ts → migrate/bake-indexed-rgba.ts)

### 4.1 sdlpal C 真值

#### `PAL_LoadResources`(res.c:101-355)
- 三类装载 flag:`kLoadGlobalData`(DATA.MKF 全局表)/ `kLoadScene`(场景 map + eventObject sprite)/ `kLoadPlayerSprite`(队员 + 跟随者 sprite)。
- 场景 sprite 装载(res.c:277-298):遍历 eventObject,`wSpriteNum==0 → NULL`;否则 `PAL_MKFGetDecompressedSize` + `malloc` + `PAL_MKFDecompressChunk` + 回填 `nSpriteFramesAuto`。
- 队员 sprite(res.c:317-333):`wSpriteNum = PlayerRoles.rgwSpriteNum[wPlayerID]`,同套 decompress。
- 跟随者 sprite(res.c:335-348):`rgParty[wMaxPartyMemberIndex+i].wPlayerRole`,同套。

#### `PAL_GetCurrentMap`(res.c:357-) / `PAL_GetPlayerSprite`(res.c:405-) / `PAL_GetEventObjectSprite`(res.c:420-)
- 运行时按索引取已装载的 map / player sprite / eventObject sprite。

#### C 端无"资产清单"概念
- 装载是命令式的(按 sceneNum / spriteNum 即时 MKF 读);无 manifest / 版本哈希。

### 4.2 一阶段实现

#### `packages/game/src/assets/png.ts`(49 行)
- `IndexedImage = { width, height, indices, opaque }`(png.ts:13-21):**palette index + opaque mask** 两通道分离。
- `decodePngToIndices(source: Blob)`(png.ts:23-49):
  - `createImageBitmap` → canvas → `getImageData`。
  - `indices[i] = img.data[i*4]`(取 R 通道 = palette index)。
  - `opaque[i] = img.data[i*4+3] > 0 ? 1 : 0`(A 通道 = opaque mask)。
  - 注释明这是 M3.5 fix:之前忽略 A、永远当 opaque,运行时 blit `idx === 0 continue` 把 RLE-skip 透明与 opaque palette-0 合并。

#### `packages/pal-extract/src/resources/sprite.ts`(85 行)
- `encodeIndexedPng(width, height, pixels, opaque?)`(sprite.ts:25-42):
  - RGBA 四通道:**R = G = B = palette index**(运行时取 R),**A = opaque mask**(opaque[i] ? 255 : 0,缺省全 255)。
  - 注释明"磁盘代价 ×4 但实现简单;M3 视情况优化"(sprite.ts:22)。
- `framesToOut(frames)`(sprite.ts:51-58):每帧 encodeIndexedPng。
- `extractCharacterSprites(spriteIds, mgoChunks)`(sprite.ts:70-85):从 MGO.MKF 提取指定 sprite id 全部帧。

#### `packages/game/src/assets/loader.ts`(运行时)
- 装载 PNG → IndexedImage,运行时 blit 端按 opaque 判透明。

| C 函数 | 一阶段对照 | 状态 |
|---|---|---|
| PAL_LoadResources(场景 sprite) | pal-extract extractCharacterSprites + game loader | ✅ |
| PAL_LoadResources(回填 nSpriteFramesAuto) | game loader 装载时填 EntityDef.frameCount | ⚠️(harvest E2:需核) |
| 索引位图 + opaque mask | png.ts IndexedImage + sprite.ts encodeIndexedPng | ✅(M3.5 opaque fix) |

**一阶段 fix 命中**:
- `0cbf7fe4`:IndexedImage opaque mask(harvest A1/W2)—— alpha 通道载 opaque mask,分离 RLE-skip 与 opaque-palette-0。

### 4.3 reforge / migrate 实现

#### `packages/migrate/src/bake-indexed-rgba.ts`(21 行)
- `bakeIndexedRgba(src, palette)`(bake-indexed-rgba.ts:18-27):
  - 源像素 `R=G=B=palette index`、`A=opaque mask`。
  - 不透明像素(A>0):`out = palette[R] + A=255`。
  - 透明像素(A=0):保持全透明(out 默认 0)。
  - index 越界 → 黑兜底(`palette[src[i]] ?? [0,0,0]`)。
- 纯转换、无 PNG IO;PNG 编解码留在 CLI 层。

#### `packages/migrate/src/bake-indexed-rgba.test.ts`
- 三测:不透明像素 R=index → palette 真彩 A=255;透明像素保持全透明不查 palette;index 越界黑兜底。

#### `packages/reforge/src/assets.ts`(运行时,D15 全 RGBA)
- 不再 decodePngToIndices;直接用 baked RGBA PNG(经 fetch + createImageBitmap)。
- `decompressGzip` 用于 .rle gzip blob(tileset / sprite);baked RGBA PNG 走原生 PNG 解码。

| 函数 | reforge / migrate 对照 | 状态 |
|---|---|---|
| IndexedImage opaque mask | migrate bake-indexed-rgba:opaque→A=255,transparent→A=0 | ✅(bake 正确) |
| R=G=B=palette index | migrate 读 src[i](R 通道)查 palette | ✅ |
| palette-as-state 解耦 | reforge text/palette-color.ts DIALOG_RGBA/TITLE_RGBA/CURSOR_RGBA 固定快照 | ✅(D15) |

**结论**:
- **IndexedImage opaque mask — reforge bake 正确**(harvest 重点核对项 ✅):`opaque[i] ? 255 : 0` 严格对偶 bake 端 `A>0 ? palette[R]+255 : 全透明`,palette-0 实色像素 alpha=255(harvest W2 免疫条件满足)。
- **palette-as-state UI 色 — reforge 解耦(D15 固定 RGBA)**(harvest 重点核对项 ✅):`palette-color.ts:3` 注释明"原版 pal0 的 UI index 快照;D15:不再绑场景 palette",DIALOG_RGBA/TITLE_RGBA/CURSOR_RGBA 全部固定 RGBA 常量,不绑 runtime palette。⚠️ 待逐处核实 menu 组件未误绑(harvest A2 留的尾巴)。

---

## 审计单元 5:资源 manifest(res.c → pal-extract/asset-manifest → reforge)

### 5.1 sdlpal C 真值

#### C 端无 manifest 概念
- `PAL_InitResources`(res.c:101-)按 sceneNum / spriteNum 即时 MKF 读;`global.c` 维护 `gpGlobals->f.fpXXX` 文件表(MKF/MGO/MAP/SSS/FBP/BALL/... 打开一次常驻)。
- 无版本哈希、无 CDN、无 SW 预缓存。

### 5.2 一阶段实现

#### `packages/pal-extract/src/resources/asset-manifest.ts`
- `AssetEntry = { path, size }`(相对 extracted 根 POSIX 路径)。
- `AssetManifest = { version, totalBytes, fileCount, files }`(asset-manifest.ts:14-19):
  - `version` = SHA256(`<path>:<size>` 行拼接).slice(0,16) —— **稳定哈希**(仅 path+size,不含内容;排 `.DS_Store` + 自身 `asset-manifest.json`)。
- `buildManifest(entries)`(asset-manifest.ts:30-43):过滤 + 按 path 排序保证 version 稳定。
- `collectAssetEntries(rootDir)`(asset-manifest.ts:46-57):递归遍历。

#### `packages/game/src/assets/loader.ts`(运行时消费 manifest)
- 拉取 manifest → 按需 fetch /extracted/<path>。

#### SW 预缓存(一阶段壳层)
- `sw.js` + `asset-manifest.ts` 集成;5 坑(harvest A4):① cache.put fire-forget + 排 206;② startPrecache 缓冲 SW 未就绪;③ precacheAll event.waitUntil 保活;④ fetch handler caches.match 跨 cache;⑤ activate 按版本清。

| 关注点 | 一阶段对照 | 状态 |
|---|---|---|
| 资产清单(version 哈希) | pal-extract/asset-manifest.ts SHA256 | ✅ |
| 排除规则(.DS_Store + 自身) | isAsset | ✅ |
| SW 预缓存 5 坑 | sw.js + asset-manifest 集成 | ✅(harvest A4) |

### 5.3 reforge / migrate 实现

#### `packages/content/src/character.ts::LoadedManifest`(character.ts:29-55)
- **工程级 manifest**(不同于 pal-extract 的资产清单):
  - `id` / `name` / `contentVersion` / `entryScene`。
  - `content: Record<string, string>`(kind → 相对路径,如 scenes 目录)。
  - `assets: { root, maps, tilesets, sprites, palettes, sounds?, music?, portraits?, faces?, itemIcons?, ui? }`。
  - `startWorld: StartWorld`。
- 这是**工程入口描述**(一整套游戏),不是"文件清单 + 版本哈希"。

#### `packages/reforge/src/loader.ts`(运行时消费工程 manifest)
- `loadProject(root)`(loader.ts:151-):fetch manifest.json + content JSON + scenes index + 入口场景 → assembleProject。
- `assembleProject(manifest, jsons)`(loader.ts:86-):纯核,guard 校验 + 组装 LoadedProject。

#### ❌ 资产 manifest(版本/CDN/SW)未立
- reforge 当前是 dev server 直 fetch,无生产部署 / 无 SW / 无版本哈希清单。
- harvest A4 明"reforge 未见 SW/部署脚本。工程化到离线时必带,5 条逐条适用"。

| 关注点 | reforge / migrate 对照 | 状态 |
|---|---|---|
| 工程级 manifest(id/contentVersion/entryScene) | content/character.ts LoadedManifest | ✅ |
| 资产清单 + 版本哈希 | ❌ 未立(reforge dev 直 fetch) | ❌ |
| SW 预缓存 | ❌ 未立 | ❌(harvest A4:工程化到离线时必带) |

**结论**:**资源 manifest — reforge 未实现?(harvest 重点核对项 ❌ 确认)**。reforge 立了**工程级 manifest**(LoadedManifest,描述游戏入口),但**资产级 manifest**(版本哈希 / CDN / SW 预缓存)未立。当前 dev 阶段直 fetch 可用,生产部署 / 离线时必补 —— 直接复用 pal-extract/asset-manifest.ts 的 SHA256 思路 + 一阶段 SW 5 坑(harvest A4)。

---

## 审计单元 6:投掷物品(fight.c kBattleActionThrowItem → 一阶段 throw-item.ts → reforge 未实现)

### 6.1 sdlpal C 真值

#### `kBattleActionThrowItem` 三处(fight.c:1907/1967/3415/4332)

**action 校验**(fight.c:3415-3431,`PAL_BattlePlayerValidateAction`):
- `fToEnemy = TRUE`。
- `PAL_GetItemAmount(wObjectID) == 0` → 降级 attack(`ActionType = kBattleActionAttack`, `wActionID = 0`)。
- `item.wFlags & kItemFlagApplyToAll` → `sTarget = -1`(全体)。
- 否则 `sTarget == -1` → `PAL_BattleSelectAutoTargetFrom` 自动选敌。

**PAL_CLASSIC 路径消耗**(fight.c:1907-1916):`nAmountInUse++`(标记在用,不立即扣)。

**等待时间**(fight.c:1967):throw item `flRemainingTime = 0`(即时,与 attack/flee/useItem 同)。

**perform**(fight.c:4332-4376,`PAL_BattlePlayerPerformAction`):
1. `wObject = action.wActionID`。
2. **挥臂动画**(4 步前移,每步 `pos.x -= (4-i)`, `pos.y -= (4-i)/2`)+ `PAL_BattleDelay(1, 0, TRUE)` × 4(fight.c:4339-4346)。
3. `PAL_BattleDelay(2, wObject, TRUE)`(fight.c:4348)。
4. `wCurrentFrame = 5` + `AUDIO_PlaySound(PlayerRoles.rgwMagicSound[wPlayerRole])`(fight.c:4350-4351)。
5. `PAL_BattleDelay(8, wObject, TRUE)`(fight.c:4353)。
6. `wCurrentFrame = 6` + `PAL_BattleDelay(2, wObject, TRUE)`(fight.c:4355-4356)。
7. **跑 scriptOnThrow**:`PAL_RunTriggerScript(item.wScriptOnThrow, (WORD)sTarget)`(fight.c:4361-4362)—— **eventObjectID = 目标敌人**。
8. **消耗投掷物**:`PAL_AddItemToInventory(wObject, -1)`(fight.c:4367)—— **在脚本之后**。
9. `PAL_BattleDisplayStatChange` + `PAL_BattleDelay(4,0,TRUE)` + `PAL_BattleUpdateFighters` + `PAL_BattleDelay(4,0,TRUE)` + `PAL_BattleCheckHidingEffect`(fight.c:4369-4374)。

#### `PAL_BattleSimulateMagic`(fight.c:5301-5400)
- 投掷物 scriptOnThrow 几乎都跑 `0x42 SimulateMagic`。
- 伤害公式:`def = wDefense + (wLevel + 6) * 4`(fight.c:5358/5382);`sDamage = PAL_CalcMagicDamage(wBaseDamage, def, wElemResistance, wPoisonResistance, 1, wMagicObjectID)`(fight.c:5365-5366/5389-5390);`wHealth -= sDamage`。
- `PAL_CalcMagicDamage`(fight.c:173-):`wMagicStrength *= RandomFloat(10,11) / 10`(±10% 抖动);`sDamage = PAL_CalcBaseDamage(...) / 4 + magic.wBaseDamage`;元素抗性 `sDamage *= 10 - wPoisonResistance / wResistanceMultiplier`。

### 6.2 一阶段实现

#### `packages/game/src/core/battle/actions/throw-item.ts`(139 行)
- `performThrowItem(input)`(throw-item.ts:71-139):
  1. 查 item;队员投 → 检查 inventory(敌人不 track)。
  2. **挥臂动画前置**(throw-item.ts:86-93):`buildThrowWindupTimeline(casterIdx, posOriginal, magicSound, itemName)` —— 对齐 fight.c:4339-4356。无动画(敌投/旧 fixture)→ 退化即时。
  3. **跑 scriptOnThrow**(throw-item.ts:103-126):`runtimeMode='battle'` + `battleCtx` 注入 caster/target/magicTables/objectPoisons/playerRoles/gs/commands/runScript/enemySpriteFrameHeights;有动画时还传 `pendingAnimFrames` / `pendingDamageNums` / `magicSpriteFrameCounts`(0x42/0x66 把 OffMagic 特效帧 + HP-mutate 数字延迟进缓冲)。
  4. **消耗 1**(throw-item.ts:128-130):`entry.count--` —— **脚本之后**(对齐 fight.c:4367)。
  5. **拼挥臂 + OffMagic 特效 → startBattleAnim**(throw-item.ts:132-138):伤害数字延迟到动画末(对齐 fight.c:4369 DisplayStatChange)。DM11:`updateEnemyGesture = true`。

| C 步骤 | 一阶段对照 | 状态 |
|---|---|---|
| 校验(GetItemAmount==0 降级 attack) | (在 caller validateAction,本函数 inventory 检查早退) | ✅ |
| 挥臂 4 步前移 + frame5/6 + magicSound | buildThrowWindupTimeline | ✅ |
| scriptOnThrow(eventObjectID = 目标敌人) | runScript battleCtx.target | ✅ |
| 消耗在脚本之后 | entry.count-- 在 runScript 之后 | ✅ |
| 0x42 SimulateMagic 注入 magicTables | battleCtx.magicTables | ✅ |
| 敌人不 track inventory | casterIsEnemy 跳过 inventory 检查 | ✅ |
| 0x28 apply poison wEnemyScript | battleCtx.objectPoisons | ✅ |
| 0x66 throw weapon 算 w | battleCtx.playerRoles | ✅ |

**一阶段 fix 命中**:挥臂顺序 / scriptOnThrow / 消耗顺序 / 0x42 注入 / 敌人不 track —— 5/5。

### 6.3 reforge / migrate 实现

#### `packages/reforge/src/battle/battle-core.ts`
- `BattleAction`(battle-core.ts:101-106):`attack | cast | item | defend | flee` —— **无 throw kind**。

#### `packages/content/src/item.ts::ThrowSpec`(item.ts:54-56)
- `interface ThrowSpec { effects: ItemUseEffect[] }` —— **占位**,注释明"投掷效果届时可能独立联合"(item.ts:55)。

#### `packages/migrate/src/migrate-content.ts` mapItemsTable
- 不迁 throw(scriptOnThrow);migrate 报告无 pendingThrow 字段。

| C 步骤 | reforge 对照 | 状态 |
|---|---|---|
| kBattleActionThrowItem | ❌ 无 throw kind | ❌ |
| scriptOnThrow | ❌ ThrowSpec 占位,effects 复用 ItemUseEffect | ❌ |
| 投掷伤害公式(0x42 SimulateMagic) | ❌ 未实现 | ❌(oracle:PAL_CalcMagicDamage + def=(wLevel+6)*4) |
| 挥臂动画 | ❌ | ❌ |

**结论**:**投掷伤害公式(oracle,reforge 未实现)**(harvest 重点核对项确认 ❌)。reforge 当前连 throw action kind 都没有;ThrowSpec 是占位。落地时:
1. 加 `BattleAction.kind = 'throw'`(或独立 `throwItem`)。
2. ThrowSpec 独立联合(不复用 ItemUseEffect —— 投掷的目标是敌,效果语义不同)。
3. migrate mapItemsTable 补 throw 翻译(scriptOnThrow → ThrowSpec.effects,走 0x42 SimulateMagic 翻译为 `{ kind: 'damage', power: magic.baseDamage, elemental: magic.elemental }`,与 skill fallback 同套)。
4. **伤害公式 oracle**:`def = wDefense + (wLevel+6)*4`(fight.c:5358);`PAL_CalcMagicDamage` = `PAL_CalcBaseDamage(magicStr*RandomFloat(10,11)/10, def)/4 + magic.wBaseDamage` + 元素抗性。一阶段已实证(harvest B 段引 battle-audit)。

---

## 审计单元 7:物品(战斗)(fight.c kBattleActionUseItem, uigame.c PAL_ItemUseMenu → 一阶段 item.ts → reforge content/item.ts + battle-core.ts)

### 7.1 sdlpal C 真值

#### `kBattleActionUseItem` 三处(fight.c:1901/1966/3433/4378)

**action 校验**(fight.c:3433-3446):
- `PAL_GetItemAmount(wObjectID) == 0` → 降级 **defend**(`ActionType = kBattleActionDefend`,不同于 throw 降 attack)。
- `item.wFlags & kItemFlagApplyToAll` → `sTarget = -1`。
- 否则 `sTarget == -1` → `sTarget = wPlayerIndex`(对自己)。

**perform**(fight.c:4378-4400):
1. `wObject = action.wActionID`。
2. `PAL_BattleShowPlayerUseItemAnim(wPlayerIndex, wObject, sTarget)`(fight.c:4385)。
3. **跑 scriptOnUse**:`PAL_RunTriggerScript(item.wScriptOnUse, (sTarget==-1)?0xFFFF:rgParty[sTarget].wPlayerRole)`(fight.c:4390-4392)—— **eventObjectID = 目标队员**(throw 是敌,use 是己)。
4. **消耗**(fight.c:4395-4399):`if (item.wFlags & kItemFlagConsuming) PAL_AddItemToInventory(wObject, -1)` —— **仅 consuming flag 才扣,在脚本之后**。
5. `PAL_BattleCheckHidingEffect` + `PAL_BattleUpdateFighters` + `PAL_BattleDisplayStatChange` + `PAL_BattleDelay(8,0,TRUE)`(fight.c:4402-4406)。

#### `PAL_BattleShowPlayerUseItemAnim`(fight.c:2266-2337)
- 前移 15px(`pos.x -= 15, pos.y -= 7`)+ `wCurrentFrame = 5` + `AUDIO_PlaySound(28)`(fight.c:2287-2291)。
- **目标 colorShift 0→6→0**(7+6=13 帧):sTarget==-1 全队 else 单人 `iColorShift = i`(fight.c:2293-2322)。

#### `PAL_ItemUseMenu`(uigame.c:1289-)
- 选目标队员;8 项属性面板(Level/HP/MP/Attack/Magic/Defense/Resistance/Dexterity/FleeRate);`sSelectedPlayer` 静态记忆(uigame.c:1311)。

### 7.2 一阶段实现

#### `packages/game/src/core/battle/actions/item.ts`(119 行)
- `performItem(input)`(item.ts:60-119):
  1. 查 item;队员 cast → 检查 inventory(敌人不 track)。
  2. **跑 scriptOnUse**(item.ts:82-105):`runtimeMode='battle'` + `battleCtx` 注入 caster/target/playerRoles/gs。targetIdx==='all' → undefined(全体由 handler 循环);else `{ type: targetIsEnemy?'enemy':'player', idx }`。
  3. **消耗**(item.ts:107-108):`if (inventoryEntry && item.flags.consuming) inventoryEntry.count--` —— **仅 consuming,脚本之后**(对齐 fight.c:4395-4399)。

| C 步骤 | 一阶段对照 | 状态 |
|---|---|---|
| 校验(GetItemAmount==0 降级 defend) | (caller validateAction;本函数 inventory 检查早退) | ⚠️(降级 defend 在 caller,本函数仅 warn+早退) |
| scriptOnUse(eventObjectID = 目标队员) | runScript battleCtx.target(player) | ✅ |
| 消耗仅 consuming + 脚本之后 | item.ts:107-108 | ✅ |
| 目标全体循环 | targetIdx==='all' → undefined(handler 循环) | ✅ |
| 敌人不 track inventory | casterIsEnemy 跳过 | ✅ |

**一阶段 fix 命中**:scriptOnUse / consuming 后扣 / 目标 / 敌人不 track —— 4/4。

### 7.3 reforge / migrate 实现

#### `packages/reforge/src/battle/battle-core.ts` `act.kind==='item'`(battle-core.ts:476-503)
- 查 item + inventory;`item.use.consuming → slot.count -= 1`。
- **直写效果**(battle-core.ts:484-501):switch `eff.kind`:`healHp / healMp / revive` 直算;default → log "物品效果 ${eff.kind} 未接"。
- **不跑 scriptOnUse AST** —— content/item.ts 的 UseSpec.effects 是 migrate 翻译 scriptOnUse 后的扁平效果联合。

#### `packages/content/src/item.ts::UseSpec`(item.ts:52-)
- `ItemUseEffect` 联合:healHp / healMp / revive / applyStatus / removeStatus / applyPoison / curePoison / permanentStatBoost / gate / triggerScript / teleport(item.ts:33-44)。
- `UseSpec = { target?, consuming, effects }`(item.ts:111-)。

#### `packages/migrate/src/migrate-content.ts::translateUseScript`(migrate-content.ts:685-)
- 翻译 item.scriptOnUse → ItemUseEffect``;`pendingReason` / `lossyNotes` 上报不可翻项。

| C 步骤 | reforge 对照 | 状态 |
|---|---|---|
| scriptOnUse AST | reforge 不跑 AST,用 migrate 翻译的扁平 effects | ⚠️(范式转换:AST → 扁平效果) |
| healHp/healMp/revive | battle-core.ts 直算 | ✅ |
| applyStatus/removeStatus/applyPoison/curePoison/permanentStatBoost/gate/triggerScript/teleport | default → log "未接" | ⚠️(陆续接,战斗期) |
| consuming 后扣 | slot.count -= 1 | ✅ |
| 降级 defend(GetItemAmount==0) | ✅ 已修(2026-07-05):validatePlayerAction 出手时验证,库存空 → 降防御(fight.c:3433;执行分支的查 item+slot 守卫留作兜底) | ✅ |
| PAL_ItemUseMenu(选目标 + 8 属性面板) | (use-menu-state + use-box,见 c-menu-audit 单元 5) | ⚠️(单人 demo,见 c-menu-audit) |

**结论**:reforge 范式 = **migrate 把 scriptOnUse 翻成扁平 ItemUseEffect[],reforge 直算**(不跑 AST)。当前 `healHp/healMp/revive` 命中(2/4 +1),其余效果 `applyStatus/removeStatus/applyPoison/curePoison/permanentStatBoost` 战斗期陆续接(harvest C-8 卸装备清状态同坑)。**与一阶段"跑 scriptOnUse"语义等价但实现不同** —— 一阶段效果由 opcode handler 动态决定,reforge 由 migrate 静态翻译决定;**migrate 翻译覆盖度 = reforge 物品效果覆盖度**(强耦合)。

---

## 审计单元 8:原版数据 bug 补丁台账(giveItem-zero 等在 reforge migrate 的承接)

### 8.1 sdlpal C 真值 + 一阶段运行时层修法

#### giveItem-zero(扬州宝物屋)
- 原版 SSS.MKF 数据 bug:3 个箱脚本提示「获得X」但 `giveItem itemId=0`。
- sdlpal `AddItemToInventory(0) → FALSE` 也给空(忠实保留 bug)。
- 一阶段修在**运行时加载层**(harvest MG2 锚点 `event-system.ts:734-772` `patchGiveItemZeroBugs`):
  - 按**前一句 showDialog 的 messageIndex**(MSG.DAT 下标,稳定)把 giveItem(0) 补回真 id:
    - 12256「获得九节鞭」→ 九截鞭 164
    - 12347「获得紫青玉蓉膏」→ 紫菁玉蓉膏 103
    - 12408「获得腐尸肉」→ 尸腐肉 116
  - **提取器保持忠实**(disasm↔recompile roundtrip 不变式),修在 `setGlobalEvents` 加载后的运行时数据上。
  - 偏离原版 = 跟原版后期/修复版应给的真道具,属 tp 层有意修正。

#### 6 类已拍板忠实-vs-修复(harvest MG3,`engineering-notes.md:53-65` §2.2)
- 逃跑抵抗 / 巫术 0x2E / 寿葫芦 / 玉佛珠 / incapacacitated 守卫等。先查 sdlpal PR + 稳定锚点定位。

### 8.2 一阶段实现(event-system.ts:745-760)

```typescript
const GIVEITEM_ZERO_FIXUP: Record<number, number> = {
  12256: 164, 12347: 103, 12408: 116,
}
export function patchGiveItemZeroBugs(commands: Command[]): void {
  for (let i = 1; i < commands.length; i++) {
    const c = commands[i]
    if (c?.op !== 'giveItem' || c.itemId !== 0) continue
    const prev = commands[i - 1]
    if (prev?.op !== 'showDialog') continue
    const fix = GIVEITEM_ZERO_FIXUP[prev.messageIndex]
    if (fix !== undefined) c.itemId = fix
  }
}
// setGlobalEvents 调用:
patchGiveItemZeroBugs(commands) // tp 层:修原版宝物屋 giveItem 归零 bug
```

| 数据 bug | 一阶段修法 | 状态 |
|---|---|---|
| giveItem-zero(扬州宝物屋 3 处) | event-system.ts patchGiveItemZeroBugs(运行时层) | ✅ |
| 6 类已拍板修复 | engineering-notes §2.2 台账 | ⚠️(系统化台账,散落) |

### 8.3 reforge / migrate 实现

#### ❌ reforge 无运行时加载层可 patch
- reforge 不读 events/all.json 运行时 patch;events 经 migrate **一次性翻译**成 content/scenes/<id>.json 的结构化 AST。
- **必须在 migrate 翻译期烘焙补丁**(harvest MG2)。

#### 当前 migrate 状态
- ~~translate-events.ts 直译 itemId:0,bug 原样带入~~ **✅ 已修(2026-07-05)**:`GIVEITEM_ZERO_FIXUP` 修正表(键=前句 showDialog 的 MSG 下标,与一阶段 patchGiveItemZeroBugs 同表:12256→164 九截鞭 / 12347→103 紫菁玉蓉膏 / 12408→116 尸腐肉),giveItem 分支翻译期烘焙;表外 giveItem 0 原样直译(不越权)。单测钉双向。
- **当前数据同步单点补(D22 不重跑迁移器)**:projects/pal 现存 4 处(s092/s156/s166/s292 的 dlg.12347 紫菁玉蓉膏箱,共享脚本展开的复本)itemId "0"→"103" 已补;12256/12408 两箱所在脚本尚未进迁移集,待 MG2 全量迁移时由修正表自动烘焙。

| 数据 bug | migrate 对照 | 状态 |
|---|---|---|
| giveItem-zero | ✅ 翻译期 GIVEITEM_ZERO_FIXUP 烘焙 + 现存数据 4 处单点补 | ✅ 已修(2026-07-05) |
| 6 类已拍板修复 | ❌ 未见系统化台账模块(散落 engineering-notes §2.2;遇到再逐条核) | ⚠️ |

**结论**:giveItem-zero 已闭环(翻译期烘焙 + 存量单点补)。其余拍板修复项按台账遇到再核。

**行动**(优先级 **P0**,会重新引入用户已报过的 bug):
1. 在 `packages/migrate/src/translate-events.ts` 给 `op === 'giveItem'` 分支(translate-events.ts:325)加 zero-fixup:复用一阶段 `GIVEITEM_ZERO_FIXUP` 表(12256→164 / 12347→103 / 12408→116),按前一句 showDialog.messageIndex 补回真 id。
2. 建**原版数据 bug 补丁台账模块**(`packages/migrate/src/data-bug-patches.ts`):集中所有"原版数据 bug 在 migrate 翻译期烘焙"的补丁,每条带稳定锚点(messageIndex / opcode / sceneId)。
3. 把 harvest MG3 的 6 类已拍板修复逐条评估:哪些是数据 bug(→ migrate 烘焙)vs 哪些是引擎行为(→ reforge 实现)。
4. **fidelity oracle**:烘焙后,场景 giveItem 总数 + 真道具分布应与"修复后预期"一致(不是与原版一致)。

---

## 重点核对项汇总(用户指定 7 项)

| # | 重点核对项 | 结论 | 锚点 |
|---|---|---|---|
| 1 | roundtrip 不变式(disasm↔recompile)— reforge 单向翻译,需 fidelity oracle? | ⚠️ 一阶段 roundtrip 已立(e205c26d);reforge 单向,**无 fidelity oracle,需补** | migrate/translate-events.ts(无 roundtrip)+ translate-events.test.ts(仅手搓单测) |
| 2 | 原版数据 bug 修在 migrate 翻译期(giveItem-zero 烘焙)— reforge 缺! | ❌ 确认缺。translate-events.ts 直译 itemId:0,shared.json:17667 实测 bug 带入 | migrate/translate-events.ts:325-330;reforge/dist/extracted/events/shared.json:17667 |
| 3 | JUMP_TARGET_OPERAND 切片表 — reforge 全量翻译免疫? | ✅ 免疫。migrate 读 events/all.json 全量 + labelAt 全局索引,不切片 | migrate/translate-events.ts:TranslateCtx.labelAt |
| 4 | MKF broken-sprite guard(400 上限)— reforge 复用 shared 保留? | ✅ 保留。reforge 直接 import shared parseSpriteChunk,SPRITE_DIM_MAX=400 | shared/rle.ts:96-99;reforge/assets.ts:7 |
| 5 | IndexedImage opaque mask — reforge bake 正确? | ✅ 正确。opaque→A=255,transparent→A=0,palette-0 实色 alpha=255 | migrate/bake-indexed-rgba.ts:18-27;bake-indexed-rgba.test.ts |
| 6 | palette-as-state UI 色 — reforge 解耦(D15 固定 RGBA)? | ✅ 解耦。DIALOG_RGBA/TITLE_RGBA/CURSOR_RGBA 固定快照,不绑 runtime palette | reforge/text/palette-color.ts:3-23 |
| 7 | 投掷伤害公式(oracle,reforge 未实现) | ❌ 未实现。BattleAction 无 throw kind;ThrowSpec 占位;oracle = PAL_CalcMagicDamage + def=(wLevel+6)*4 | reforge/battle/battle-core.ts:101-106;content/item.ts:54-56;fight.c:5301-5400 |

---

## reforge 不读一阶段坑的实例汇总

| 坑 | 一阶段 fix | reforge / migrate 状态 | 是否自承认 |
|---|---|---|---|
| giveItem-zero(扬州宝物屋) | event-system.ts patchGiveItemZeroBugs | ❌ migrate 直译 itemId:0 | ❌ 未提(harvest MG2 已标缺口) |
| 6 类已拍板忠实-vs-修复台账 | engineering-notes §2.2 | ❌ 未见系统化台账模块 | ❌ |
| roundtrip fidelity oracle | pal-extract roundtrip.ts 全量测 | ❌ migrate 单向无 oracle | ❌ |
| nSpriteFramesAuto 装载回填 | game loader 填 EntityDef.frameCount | ⚠️ 需核 migrate 是否烘帧数进 EntityDef | ❌ |
| 资产 manifest(版本哈希/SW) | pal-extract asset-manifest.ts + sw.js | ❌ 工程级 manifest 已立,资产级未立 | ❌ |
| 投掷物(kBattleActionThrowItem) | throw-item.ts 5/5 命中 | ❌ BattleAction 无 throw kind | ❌ |
| 战斗物品效果全谱 | item.ts 跑 scriptOnUse AST | ⚠️ 扁平效果,healHp/healMp/revive 命中,余未接 | ✅ battle-core.ts:499 log "未接(战斗期陆续)" |

**结论**:reforge 在**架构免疫类坑**(MKF/YJ2/切片/JUMP_TARGET/opaque bake/palette 解耦)上系统性 ✅ —— 这些是"新形态不再踩"的典型;但在**翻译期烘焙类坑**(giveItem-zero / 数据 bug 台账 / fidelity oracle)和**功能未实现类坑**(投掷物 / 战斗物品余效果)上 ❌/⚠️,且**几乎无自承认注释** —— 印证 harvest MG 段"未系统化台账"判断。

---

## 故意分歧(非 debt)

- **reforge 不读 MKF**(单元 1):资产形态变(gzip RLE blob / baked RGBA PNG),运行时不接触 MKF/YJ2。**非"不读坑",是架构演进**。
- **reforge 单向翻译不 roundtrip**(单元 3):migrate 是一次性离线工具,产物是 content JSON,无需回到字节码。**但需 fidelity oracle 兜底**(重点核对项 1)。
- **战斗物品扁化效果**(单元 7):migrate 把 scriptOnUse 翻成 ItemUseEffect[],reforge 直算 —— 范式转换,非 debt;**但覆盖度强耦合 migrate 翻译能力**。

---

## 缺失功能(产品级,非 debt)

- **投掷物**(单元 6):整体未实现(ThrowSpec 占位),需 BattleAction 加 throw kind + migrate 翻 scriptOnThrow + 伤害公式 oracle。
- **资产 manifest + SW**(单元 5):生产部署 / 离线时必补,直接复用 pal-extract asset-manifest.ts + 一阶段 SW 5 坑。

---

## 优先行动(按影响排序)

1. **P0 · giveItem-zero 烘焙**(单元 8):migrate/translate-events.ts:325 加 zero-fixup,复用一阶段 GIVEITEM_ZERO_FIXUP 表。**会重新引入用户已报过的"开箱给空"bug**,优先级最高。
2. **P0 · 数据 bug 补丁台账模块**(单元 8):建 migrate/src/data-bug-patches.ts,集中所有"原版数据 bug 在翻译期烘焙"的补丁;把 harvest MG3 的 6 类已拍板修复逐条评估落地。
3. **P1 · fidelity oracle**(单元 3):migrate 翻译规则变更无门抓。建全量不变量比对(段数 / giveItem 总数 / loadScene 总数 / showDialog 顺序),至少覆盖"已实现跳转族 + 具名 op"的场景。
4. **P1 · 投掷物落地**(单元 6):BattleAction 加 throw kind + ThrowSpec 独立联合 + migrate 翻 scriptOnThrow + 伤害公式(fight.c:5301-5400 oracle)。
5. **P2 · 战斗物品效果全谱**(单元 7):applyStatus/removeStatus/applyPoison/curePoison/permanentStatBoost 陆续接(battle-core.ts:499 default 分批消除)。
6. **P2 · 资产 manifest + SW**(单元 5):生产部署前补,复用 pal-extract asset-manifest.ts SHA256 + 一阶段 SW 5 坑(harvest A4)。
7. **P2 · nSpriteFramesAuto 烘焙核实**(单元 2/4):核 migrate 是否把 sprite 真帧数烘进 EntityDef.frameCount(harvest E2 尾巴),防 NPC idle 动画冻 frame 0。
8. **P3 · palette-color 逐处核实**(单元 4):DIALOG_RGBA 已固定,但须逐处核实 menu 组件未误绑 runtime palette(harvest A2 尾巴)。
