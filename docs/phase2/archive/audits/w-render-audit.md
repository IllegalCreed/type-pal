# 渲染地基三方逐函数审计(瓦片 / 精灵 / 场景合成)

| 字段 | 值 |
|---|---|
| 审计日期 | 2026-07-05 |
| sdlpal C 真值 commit | `6ddb4434047fc57ea56e11f7b5f7777929394a8c`(主仓 `reference/sdlpal/`,非独立 submodule,与 HEAD 同 commit) |
| 一阶段 .ts commit | `6ddb4434047fc57ea56e11f7b5f7777929394a8c`(monorepo 同 HEAD) |
| reforge .ts commit | `6ddb4434047fc57ea56e11f7b5f7777929394a8c`(monorepo 同 HEAD) |
| 审计单元 | 3(瓦片渲染 / 精灵渲染 / 场景合成 MakeScene) |
| 方法 | sdlpal C 真值语义 → 一阶段逐函数对照(含 git log 踩坑)→ reforge 逐函数对照(✅/⚠️/❌/✨)→ 缺口 + 风险 + 行动 |

> 全文行号锚点都基于上述 commit。判断必有 `文件:行`。

---

## 审计单元 1:瓦片渲染

### 1.1 sdlpal C 真值(`reference/sdlpal/map.c`)

#### `PAL_LoadMap`(map.c:25-154)
- **语义**:从 `map.mkf` 读 chunk → `Decompress` 到 `map->Tiles[128][64][2]`(map.c:103)→ 对每个 u32 做小端字节序交换(`SDL_SwapLE32`,map.c:118-125);再从 `gop.mkf` 读 chunk 作为 tile 位图 sprite 集 `map->pTileSprite`(map.c:130-146)。
- **数据布局**:`Tiles[y][x][h]`,y∈[0,128)、x∈[0,64)、h∈{0,1}。**h=0 = lower DWORD,h=1 = upper DWORD**(与 TS `TileCell.lower/upper` 一致,resources.ts:3-5)。
- **副作用**:填充 `map->iMapNum`。

#### `PAL_MapGetTileBitmap`(map.c:197-259)— **核心:tile id 提取公式**
- **输入**:`(x, y, h, ucLayer, map)`;越界返回 NULL。
- **取 DWORD**:`d = Tiles[y][x][h]`(map.c:242)。**h 直接选 DWORD**(不是 layer!)。
- **ucLayer=0(底层,low 16-bit 半字)**:
  `tileId = (d & 0xFF) | ((d >> 4) & 0x100)`(map.c:249)。
  → 9-bit id,**0 = 合法 tile**(map.c:412 NULL 时 fallback 到 tile(0,0,0,0))。
- **ucLayer=1(顶层,高 16-bit 半字)**:
  `d >>= 16; tileId = ((d & 0xFF) | ((d >> 4) & 0x100)) - 1`(map.c:256-257)。
  → **`-1` 后 id = -1 表示「无 tile」**(NULL,跳过);id≥0 才有效。
- **关键不变式**:h 选 DWORD,ucLayer 选半字;layer1 有 -1 哨兵,layer0 无。

#### `PAL_MapGetTileHeight`(map.c:301-353)— **核心:逻辑高度**
- `d >>= 8` 后取 `& 0xF`(map.c:351-352)。ucLayer=1 先 `d >>= 16`(map.c:346-349)。
- 即 **l=0 高度 = bits[8..11] of low half;l=1 高度 = bits[24..27] of full DWORD**。
- 用途(scene.c:159):判断 tile 是否「可能盖住精灵」(`iTileHeight > 0` + cover 检查)。
- 注释(map.c:312-313):「判断 tile 位图是否应盖住 sprite」。

#### `PAL_MapBlitToSurface`(map.c:355-418)— **核心:全图两层平铺公式**
- **视口→tile 范围**(map.c:389-392):
  `sy = srcRect->y/16 - 1; dy = (srcRect->y + srcRect->h)/16 + 2`
  `sx = srcRect->x/32 - 1; dx = (srcRect->x + srcRect->w)/32 + 2`
  → **±1/±2 fence**:左/上多扫 1 行/列,右/下多扫 2,避免边缘露黑。
- **y 起点偏置**(map.c:397):`yPos = sy*16 - 8 - srcRect->y`(每 row 前先 -8,即 lower tile baseline 上抬 8px)。
- **双重循环**(map.c:398-403):外层 `for y in [sy,dy)`,内层 `for h in {0,1}`(每 h 步进 yPos+=8),最内 `for x in [sx,dx)`(每 x 步进 xPos+=32)。
  `xPos = sx*32 + h*16 - 16 - srcRect->x`(map.c:402)。
- **绘制位最终公式**(map.c:397,402):
  - h=0(lower):screen = `(x*32 - 16, y*16 - 8)`(相对 srcRect 左上)
  - h=1(upper):screen = `(x*32, y*16)`(= col baseline,row baseline)
- **NULL tile 处理**(map.c:406-413):
  - ucLayer=0(bottom):fallback `PAL_MapGetTileBitmap(0,0,0,ucLayer,...)`(map.c:412)→ 永远不漏 NULL。
  - ucLayer=1(top):`continue`(map.c:410)→ NULL = 跳过(就是「无上层」)。
- **blit**:`PAL_RLEBlitToSurface`(map.c:414)— RLE 解码后按 opaque 写像素(透明像素跳过,见 rle.ts:31-32 真值)。

#### `PAL_MakeScene` 中瓦片部分(scene.c:472-481)
- **两层全画**(scene.c:480-481):先 `PAL_MapBlitToSurface(...,0)`,再 `PAL_MapBlitToSurface(...,1)`。
- **关键**:**`gpScreen` 不清屏**(scene.c:471 注释 + map.c 不调 clear)。两层叠画,顶层透明处露底层;两层都透明处露**上一帧残留**。

---

### 1.2 一阶段实现(`packages/game/src/present/draw-tilemap.ts`)

#### `tileIdLayer0 / tileIdLayer1`(draw-tilemap.ts:46-53)
- ✅ **完全对齐** map.c:249/257。layer1 `-1` 哨兵在 ts:52。

#### `blitTile`(draw-tilemap.ts:55-80)
- ✅ **opaque mask 用对了**(ts:73 `if (tile.opaque[srcOff] === 0) continue`)。
- 历史坑(注释 ts:25-28 + commit `0cbf7fe4` 「M3.5 fix」):之前用 `idx === 0 continue` 把 RLE-skip 与 opaque-palette-0 合并 → scene 16 dense tile 的 palette-0 像素被透明 → "梯子状"杂乱。修法:引入 `TileImage.opaque` Uint8Array(1=写,0=跳)。
- ✅ **coverage mask**(ts:60-62,77):可选记录被瓦片画过的屏幕像素,供 `repairTilemapSeams` 区分「漏黑」与「瓦片画的 opaque idx-0」。

#### `drawTilemap`(draw-tilemap.ts:92-151)— **核心:全图两层平铺**
- ✅ **坐标公式完全对齐** map.c:397,402(ts:135-147):
  - lower(h=0):blit 到 `(cellPxX - TILE_HALF_W, rowPxY - SUBROW_Y_STEP)`(ts:141),即 `(c*32-16, r*16-8)`。✅
  - upper(h=1):blit 到 `(cellPxX, rowPxY)`(ts:147),即 `(c*32, r*16)`。✅
- ✅ **±1 fence**(ts:121,128):`for r = -1; r <= map.height`、`for c = -1; c <= map.width`。等同 map.c:389-392 的 ±1/±2(整 row/col 维度,非 srcRect 像素维度,但效果一致:边缘多扫一圈)。
- ✅ **layer0 NULL fallback 到 tile(0)**(ts:140 `?? tiles.get(0)`),对齐 map.c:412。
- ✅ **layer1 NULL → `continue`**(ts:144-146:`upperId >= 0` 才画,id<0 跳过),对齐 map.c:410。
- ✅ **viewport clip**(ts:127,133):整 row/col 在屏外则跳过(性能优化,不改变正确性)。
- 历史坑(commit `fa0db6db` 「M2 tile 9-bit id」、`22a16937` 「M2 补 layer 1 + ROW_Y_STEP 16」、`6c1ee363` 「M3.5 ±1 fence + sub-row offset」):早期 lower 当 baseline、upper 偏(+16,+8),整体偏置反了 → scene 16 dense 全图错位+锯齿。

#### `repairTilemapSeams`(draw-tilemap.ts:169-208)— **一阶段独有:接缝漏黑修复**
- **背景**(ts:155-168 注释 + commit `55aecff0`):原版 `PAL_MakeScene` **不清屏**,瓦片美术接缝的透明像素被上一帧残留邻接地形遮住;一阶段每帧 `fb.clear()` 到 index 0 → 同样接缝露出**纯黑**(用户实测 map76 血池「黑色三角」)。
- **算法**:逐趟 dilation — 把 `coverage[i]===0`(确实没被任何瓦片画过)的像素,用最近已覆盖 8-邻居填上(ts:178-198);本趟收集统一落盘 + 提升为已覆盖(ts:200-207),向更深处扩散。
- **关键不变式**(ts:166-168):用 `coverage` 而非 `indices===0` 判漏黑 —— opaque palette-0 不是漏黑,绝不能动。
- ✨ **新架构特性**(非 sdlpal 真值,sdlpal 靠不清屏规避)。

---

### 1.3 reforge 实现(`packages/reforge/src/render.ts`)

#### `tileIdLayer0 / tileIdLayer1`(render.ts:17-23)
- ✅ **完全对齐** map.c + 一阶段。layer1 `-1` 在 render.ts:23。

#### `bakeFrame`(render.ts:25-45)— **tile + sprite 通用烘焙**
- ✅ **opaque mask 用对了**(render.ts:41 `img.data[o+3] = opaque[i] ? 255 : 0`)。alpha 通道 0 = 透明,Canvas2D `drawImage` 自然跳过 → **等价于 RLE-skip**。
- ✅ **palette-0 实心像素不被误判透明**:opaque[i]=1 时 alpha=255 即使 pixels[i]=0(render.ts:35-36 取 `colors[0]`)。
- ✨ **新架构免疫**:Canvas2D `drawImage` 把每个 tile 烘焙成独立 `<canvas>`,alpha 通道原生处理;不像一阶段手写 framebuffer 循环那样有机会把 opaque 与 palette-0 混淆。**M3.5 opaque-fix 这条坑,reforge 因架构不同天然免疫**(只要 bake 时 alpha 正确,本处正确)。

#### `Canvas2DRenderer.renderScene` step 1(基底两层全画,render.ts:157-173)
- ✅ **坐标公式完全对齐**(render.ts:168-170):
  - lower:`this.blit(loId, c*TILE_W - HALF_W + ox, r*TILE_H - SUBROW + oy)` = `(c*32-16, r*16-8)`。✅
  - upper:`this.blit(upId, c*TILE_W + ox, r*TILE_H + oy)` = `(c*32, r*16)`。✅
- ✅ **两层全画顺序**:layer0 后 layer1(render.ts:159 `for layer = 0; layer <= 1`),对齐 scene.c:480-481。
- ⚠️ **缺 ±1 fence**(render.ts:152-155):`r0 = max(0, view.row)`、`r1 = min(map.height, view.row+view.rows)`;`c0/c1` 同理。**只画 view 范围内,无 -1/+1 fence**。
  - 风险:与一阶段早期同坑(commit `6c1ee363` 修前),dense scene 右/底 strip 缺 fill → 边缘露黑。
  - 但是:reforge `renderScene` 由 `renderSceneFrame`(render-scene.ts:29-41)调用,调用方传 `room: CellRect`;**只要 room 足够大(覆盖整个可见区+1 圈),等价 fence**。当前 main.ts 用法是全 map(room = map 全尺寸)→ 实际不露黑。**风险 = 中**(取决于调用方,非引擎保证)。
- ❌ **缺 layer0 NULL fallback 到 tile(0)**(render.ts:168):`loId >= 0` 直接 blit,`bakedTile` 找不到帧时 `blit` 静默跳(render.ts:133-134 `if (img) this.ctx.drawImage`)。
  - **但**:layer0 的 tileId 永远 ≥0(无 -1 哨兵,见 map.c:249),只有 bakedTile 找不到帧(资产缺失)才漏。
  - sdlpal map.c:412 是「`PAL_SpriteGetFrame` 返回 NULL 才 fallback」,reforge `bakedTile` 返回 undefined 时**直接跳过**,不 fallback 到 tile(0)。
  - **风险 = 低**(正常资产不缺帧;缺帧时 sdlpal 也是黑,reforge 同)。但语义偏离:理论上 layer0 的 NULL 应 fallback tile(0,0,0,0),reforge 没有。
- ❌ **缺接缝修复**(全文件无 `repairTilemapSeams` 等价):
  - reforge `renderScene` 末尾 `clear()` 用 `fillStyle='#000'`(render.ts:139)→ 整幅黑底。瓦片美术接缝的透明像素会露黑。
  - **但**:Canvas2D `drawImage` 每个 tile 独立 canvas,两邻接 tile 透明像素相加还是透明 → 露出 `clear()` 的黑底。**与一阶段 fb.clear() 到 index 0 同坑**。
  - **风险 = 中**(dense scene / 崖边斜接缝处可见;当前 reforge 测试场景 scene 56 室内无斜崖,未暴露)。这是 commit `55aecff0` 修过的血池「黑色三角」同款坑,reforge 尚未移植修复。

#### `addCoverTiles`(render.ts:198-270)— 见审计单元 2.3。

---

### 1.4 瓦片渲染缺口清单

| # | 缺口 | reforge 状态 | 风险 | 行动建议 |
|---|---|---|---|---|
| T1 | **接缝漏黑未修复**(coverage mask + dilation) | ❌ 缺失 | **中** | 移植 `repairTilemapSeams`;或 Canvas2D 方案改为「先画一层邻接 tile 当底色」;最简方案 = clear 用首个 tile 的平均色而非纯黑(粗略)。**血池同款坑未踩到只因测试场景无斜崖。** |
| T2 | **layer0 NULL 不 fallback tile(0)** | ❌ 缺失 | 低 | render.ts:168 `this.bakedTile(loId) ?? this.bakedTile(0)`。正常资产不触发,语义对齐 sdlpal map.c:412 即可。 |
| T3 | **无 ±1 fence**(引擎层) | ⚠️ 部分(靠调用方 room 大小兜底) | 中 | renderScene 内部对 view 做 `r0 = max(0, view.row-1); r1 = min(map.height, view.row+view.rows+1)`(c 同理)。一阶段 draw-tilemap.ts:121,128 已有。 |

---

## 审计单元 2:精灵渲染

### 2.1 sdlpal C 真值(`reference/sdlpal/scene.c`)

#### `PAL_AddSpriteToDraw`(scene.c:39-74)
- **语义**:把 `(lpSpriteFrame, x, y, iLayer)` 推入 `g_rgSpriteToDraw[]`(scene.c:69-71),`g_nSpriteToDraw++`。
- **iLayer 用途**:进入**排序**(scene.c:358 blit 时 `y = pos.y - height - iLayer`)+ cover tile sx 偏移(scene.c:99 `sx = ... - iLayer/2`)。
- **关键**:`pos` 存的是**排序/anchor 用的 y**(= 脚底+偏置),不是 blit 左上角;blit 时再减 height+iLayer。

#### `PAL_CalcCoverTiles`(scene.c:77-178)— **核心:覆盖瓦片计算**
- **sx/sy/sh**(scene.c:99-101):
  `sx = viewport.x + pos.x - iLayer/2`(精灵水平中心的世界 x)
  `sy = viewport.y + pos.y - iLayer`(精灵排序世界 y)
  `sh = (sx % 32) ? 1 : 0`(sub-row 偏移标志)
- **扫描范围**(scene.c:113-115):
  `for y = (sy - height - 15)/16 .. sy/16`
  `for x = (sx - width/2)/32 .. (sx + width/2)/32`
  → **C 整数除法(向零截断)**,负数时与 `Math.floor` 分叉。
- **5 候选 (dx,dy,dh)**(scene.c:117-154):case 0..2 仅在最左列(`x == (sx-width/2)/32`)处理,其余列只 case 3..4。case 2/4 依 sh 切换 dh。
- **内层 l=0/1**(scene.c:156-174):
  - `lpTile = PAL_MapGetTileBitmap(dx,dy,dh,l,...)` — **dh 选 DWORD,l 选半字**。
  - `iTileHeight = (signed char)PAL_MapGetTileHeight(dx,dy,dh,l,...)`。
  - **cover 条件**(scene.c:164):`lpTile != NULL && iTileHeight > 0 && (dy+iTileHeight)*16 + dh*8 >= sy`。
  - 满足则 `PAL_AddSpriteToDraw(lpTile, dx*32+dh*16-16-vp.x, dy*16+dh*8+7+l+iTileHeight*8-vp.y, iTileHeight*8+l)`(scene.c:169-172)。
  - **iLayer = iTileHeight*8 + l**(scene.c:172)— cover tile 的 layer 偏置。

#### `PAL_SceneDrawSprites`(scene.c:180-362)— **核心:精灵入表 + 排序 + blit**
- **party**(scene.c:210-232):
  `PAL_AddSpriteToDraw(lpBitmap, party[i].x - width/2, party[i].y + wLayer + 10, wLayer + 6)`(scene.c:223-226)。
  → **pos.y = world.y + wLayer + 10**,**iLayer = wLayer + 6**。
  随后 `PAL_CalcCoverTiles`(scene.c:231)。
- **NPC/event object**(scene.c:237-322):
  - 帧:`iFrame = wCurrentFrameNum`;若 `nSpriteFrames == 3` 重映射(scene.c:268-276:`iFrame==2→0, ==3→2`)。
  - spriteIdx = `wDirection * nSpriteFrames + iFrame`(scene.c:279-280)。
  - **屏外剔除**(scene.c:290-311)— **在 AddSpriteToDraw 与 CalcCoverTiles 之前**:
    `x = eo.x - vp.x - width/2; if (x >= 320 || x < -width) skip`
    `y = eo.y - vp.y; y += sLayer*8 + 9; vy = y - height - sLayer*8 + 2; if (vy >= 200 || vy < -height) skip`
  - `PAL_AddSpriteToDraw(lpFrame, x, y, sLayer*8 + 2)`(scene.c:316)→ **pos.y = eo.y - vp.y + sLayer*8 + 9**,**iLayer = sLayer*8 + 2**。
  - 随后 `PAL_CalcCoverTiles`(scene.c:321)。
- **Y-sort**(scene.c:327-348):bubble sort by `PAL_Y(pos)` 升序(脚 y 大的排后 = 后画 = 盖上)。
- **blit**(scene.c:353-361):
  `x = pos.x; y = pos.y - PAL_RLEGetHeight(frame) - iLayer`(scene.c:357-358)。
  `PAL_RLEBlitToSurface(frame, screen, XY(x,y))`(scene.c:360)。
  → **blit 左上 y = pos.y - height - iLayer**。
  - **关键相消**:对 NPC,`pos.y - height - iLayer = (eo.y + sLayer*8 + 9) - height - (sLayer*8 + 2) = eo.y + 7 - height`。**sLayer*8 项相消,不进 blit**。
  - 对 party,`pos.y - height - iLayer = (world.y + wLayer + 10) - height - (wLayer + 6) = world.y + 4 - height`。**wLayer 项相消**。
  - → **blit y 对 NPC = world.y + 7 - height;对 party = world.y + 4 - height**。

#### `PAL_SpriteGetFrame` / 每帧自锚
- scene.c:213,279,358 多处 `PAL_RLEGetWidth/Height(lpBitmap)` —— 一律按**当前帧**宽高。
- party 帧索引由 `PAL_UpdatePartyGestures`(scene.c:636-776)按 `rgwWalkFrames[role]`(3 或 4)+ `s_iThisStepFrame` 步进计算。

---

### 2.2 一阶段实现

#### `draw-sprite.ts`
- ✅ `SpriteImage.opaque` 用对(draw-sprite.ts:9-10,50 `if (sprite.opaque[srcOff] === 0) continue`)。
- ✅ **每帧自锚**(draw-sprite.ts:26-37 `toSpriteImages`):`anchorX = floor(f.width/2); anchorY = f.height`,**每帧用自身宽高**(draw-sprite.ts:34-35)。
- 历史坑(commit `0045cbae` 「M5.Sync.2 精灵逐帧 anchor」、注释 draw-sprite.ts:18-24):之前三处 loader 用 `first.height`/`first.width/2`(frame[0])当整组 anchor → 爬行精灵 chunk193 各帧高 31~73,爬帧用 frame0 高 31 当锚 → 脚底向下溢出 42px = 密道攀爬「玩家偏下」。
- ✅ `drawSprite` blit 公式(draw-sprite.ts:45-46):`dstX = cx - anchorX; dstY = cy - anchorY`。cx/cy = 脚底中心(由 caller 传入的 sort-screen 坐标)。

#### `present.ts` 精灵组装
- ✅ **party blit +4 / cover iLayer = wLayer+6**(present.ts:353 `capturedSY + 4`、369 `gs.wLayer + 6`):
  对齐 scene.c:226 `wLayer+6`、blit 相消后 `world.y+4-height`。✅
  sort key = `gs.party.y + gs.wLayer + 10`(present.ts:352),对齐 scene.c:225。✅
- ✅ **NPC blit +7 / cover iLayer = sLayer*8+2**(present.ts:566 `capturedSY + 7`、559 `iLayer = sLayer*8 + 2`):
  对齐 scene.c:316 + 相消后 `world.y+7-height`。✅
  sort key = `npc.y + sLayer*8 + 9`(present.ts:558),对齐 scene.c:302。✅
- ✅ **屏外剔除在 cover 之前**(present.ts:554-557):
  `cullLeft = sx - floor(sprite.width/2); if (cullLeft >= SCREEN_W || cullLeft < -sprite.width) continue`
  `cullVy = sy + 11 - sprite.height; if (cullVy >= SCREEN_H || cullVy < -sprite.height) continue`
  对齐 scene.c:293/305(sLayer*8 相消后 +9-...+2 = +11)。✅
  历史坑(commit `9ebcafc9`「Sync.2」+ 2026-06-12 血池审查注释 present.ts:548-553):旧码无剔除 → 刚出屏的对象仍产 cover 条目,把 layer-0 地砖晚序盖到屏内 layer-1 墙体上 = 走动时屏缘「异常地块」忽隐忽现。
- ✅ **NPC 帧映射 nSpriteFrames==3 时 2/3 重映射**(present.ts:527-530),对齐 scene.c:268-276。
- ✅ **party 站立/走路帧选择**(present.ts:113-118,311-326),对齐 scene.c:678-685/750-755。
- ✅ **follower 位置偏移**(present.ts:382-460),对齐 scene.c:690-730(每 follower 不同 offX/offY + 障碍回退)。

#### `draw-tilemap.ts::addCoverTileEntries`(draw-tilemap.ts:255-383)
- ✅ **sx/sy/sh 含 iLayer**(draw-tilemap.ts:277-278):
  `sx = spriteWorldX - floor(spriteW/2) - floor(iLayer/2)`(对齐 scene.c:99 `-iLayer/2`)
  `sy = spriteWorldY - iLayer`(对齐 scene.c:100 `-iLayer`)
  注:caller 传入的 `spriteWorldY` 已含 wLayer+offset(party=+10,NPC=+9,见 present.ts:364,575)。
- ✅ **C 截断除法**(draw-tilemap.ts:283-286 `Math.trunc`),对齐 scene.c:113-115 整数除法。历史坑(commit `7f543c00`「L31 cover-tile 截断除法」):之前用 `Math.floor`,NPC 贴地图左/上边缘时与 floor 分叉。
- ✅ **5 候选 case 0..4**(draw-tilemap.ts:296-316),对齐 scene.c:127-154。
- ✅ **l=0/1 内层**(draw-tilemap.ts:332-379),对齐 scene.c:156-174。
- ✅ **dh 选 DWORD、l 选半字**(draw-tilemap.ts:329 `d = dh===0 ? cell.lower : cell.upper`),对齐 map.c:242。历史坑(commit `7ec68964`「dh/l 维度纠正」)。
- ✅ **cover 条件**(draw-tilemap.ts:344-346):`tileId<0 skip; iTileHeight<=0 skip; (dy+iTileHeight)*16+dh*8 < sy skip`,对齐 scene.c:164。
- ✅ **baseY**(draw-tilemap.ts:352):`dy*16 + dh*8 + 7 + l + iTileHeight*8`,对齐 scene.c:171(`+7+l+iTileHeight*8`)。
- ✅ **screenX/Y**(draw-tilemap.ts:365-366):`screenX = dx*32 + dh*16 - 16 + offsetX`,`screenY = dy*16 + dh*8 + 7 - img.height + offsetY`。对齐 scene.c:358 相消后真值。
- ✅ **layer0 缺帧回落 tile(0)**(draw-tilemap.ts:140)— 注:这是 drawTilemap 内,addCoverTileEntries 不回落(对齐 scene.c:164 NULL skip)。历史坑(commit `7f543c00`「L32 layer-0 缺帧回落」)。

---

### 2.3 reforge 实现(`packages/reforge/src/render.ts`)

#### `SpriteDraw` 类型(render.ts:59-68)
- ⚠️ **有 `baseYBias`**(render.ts:67):`/** 画序偏置(原版 sLayer 人工覆盖;加进 baseY 排序键,不动 blit 位置) */`。
- ✅ **每帧自锚**:main.ts:1440-1441,1462-1463 `anchorX = floor(f.width/2); anchorY = f.height`。对齐一阶段 draw-sprite.ts:34-35。
  历史坑(commit `6c5fc655` 之坑3):reforge 曾用组锚(首帧),爬行 193 高 31~73 溢出 42px → 已修(每帧自锚)。**一阶段同坑已修过,reforge 复踩后修**。

#### `renderScene` step 2(精灵入表,render.ts:182-190)
- ✅ **blit +7**(render.ts:186 `by = round(worldY - anchorY + 7 + oy)`):
  对齐 scene.c:358 相消后 `world.y + 7 - height`。历史坑(commit `6c5fc655` 之坑2):reforge 曾漏 +7,密道盖板与地板错半格 → 已修。
- ✅ **sort key = worldY + 9 + baseYBias*8**(render.ts:187):
  对齐 scene.c:302 `eo.y + sLayer*8 + 9`(`baseYBias*8` = `sLayer*8`)。历史坑(commit `6c5fc655` 之坑2):reforge 曾漏 ×8 → 已修。
- ⚠️ **缺 NPC sLayer 进 cover iLayer**:render.ts:189 `addCoverTiles(..., s.worldX, s.worldY, ...)` —— **没传 iLayer**。
  → render.ts:208 `sx = spriteWorldX - floor(spriteW/2)`(**缺 `-iLayer/2`**,scene.c:99 真值有)
  → render.ts:209 `sy = spriteWorldY`(**缺 `-iLayer`**,scene.c:100 真值有)
  **影响**:sLayer≠0(上桥/上下层 NPC)时,cover tile 的 sx/sy 扫描范围偏移 → cover 选择错位。**风险 = 低**(大部分 NPC sLayer=0;但 sdlpal 语义偏离明确)。
  注:reforge 的 `baseYBias` 已正确进 sort key(×8),但**没进 cover sx/sy** —— 这是 sdlpal iLayer 的两个用途(sort + cover offset),reforge 只接了一半。

#### `addCoverTiles`(render.ts:198-270)
- ❌ **缺 iLayer 参数 + sx/sy 偏移**(见上,render.ts:208-209)。
- ✅ **截断除法**(render.ts:211-214 `Math.trunc`),对齐 scene.c:113-115。
- ✅ **5 候选 case 0..4**(render.ts:223-249),对齐 scene.c:127-154。
- ✅ **l=0/1 内层**(render.ts:254-266),对齐 scene.c:156-174。
- ✅ **dh 选 DWORD**(render.ts:253 `d = dh===0 ? cell.lower : cell.upper`),对齐 map.c:242。
- ✅ **cover 条件**(render.ts:257-259),对齐 scene.c:164。
- ✅ **baseY**(render.ts:262):`dy*16 + dh*8 + 7 + l + iTileHeight*8`,对齐 scene.c:171。
- ✅ **screenX/Y**(render.ts:263-264),对齐 scene.c:358 相消后真值。
- ❌ **缺屏外剔除**:render.ts:182-190 精灵入表前**无剔除**(renderScene 只迭代 `sprites` 数组,不管是否在屏外)。render.ts:216-269 `addCoverTiles` 也不管 sprite 是否在屏外。
  - 影响:屏外精灵仍产 cover 条目 → 与一阶段 commit `9ebcafc9`/血池审查同坑(走动时屏缘异常地块)。
  - **但是**:reforge 当前 `sprites` 数组由 main.ts 装配,只含本场景实体 + 玩家(scene 全部),数量少且大多在屏内 → **实际未触发**。**风险 = 低**(NPC 多的大场景会暴露)。
- ❌ **cover tile bakedTile 缺帧不 fallback**:render.ts:260-261 `if (!img) continue`,对齐 scene.c:164 NULL skip(✅ 这里是对的——cover tile NULL 本就该 skip,不像 layer0 base tile 要 fallback tile(0))。

#### `drawSprite`(render.ts:272-286)— 单精灵直接画
- ⚠️ **缺 +7**(render.ts:283 `round(worldY - anchorY - camera.y)`):**没有 +7**。
  - 与 render.ts:186(`renderScene` 内 blit)**不一致**:renderScene 内精灵 +7,`drawSprite` 单独调用不 +7。
  - **影响**:任何用 `drawSprite` 直接画(不走 renderScene)的精灵会高 7px。当前 main.ts 精灵都走 renderScene(render.ts:183-190),`drawSprite` 似乎是未用的 API。**风险 = 低**(但接口语义不一致,将来误用会错)。
  - 注:这个 `drawSprite` 是 `Renderer` 接口方法(render.ts:93-100),editor / 其他调用方可能用。

---

### 2.4 精灵渲染缺口清单

| # | 缺口 | reforge 状态 | 风险 | 行动建议 |
|---|---|---|---|---|
| S1 | **cover tile sx/sy 缺 iLayer 偏移** | ❌ 缺失(`-iLayer/2` / `-iLayer`) | 低 | render.ts:198 `addCoverTiles` 加 `iLayer` 参数;render.ts:208-209 补偏移;render.ts:189 从 SpriteDraw 传 `baseYBias*8+2`(NPC)/`baseYBias*8+6`(party)。sdlpal scene.c:99-100 真值。sLayer≠0 的上桥 NPC 才暴露。 |
| S2 | **精灵屏外剔除在 cover 之前** | ❌ 缺失 | 低 | render.ts:183 入表前加 `if (bx+width<0 || bx>canvasW || by+height<0 || by>canvasH) { 仍入表? }`。sdlpal scene.c:290-311 + 一阶段 present.ts:554-557 真值。当前场景实体少未触发,大场景会暴露屏缘地块闪烁。 |
| S3 | **`drawSprite` 接口缺 +7** | ⚠️ 与 renderScene 不一致 | 低 | render.ts:283 补 `+ 7`(对齐 render.ts:186);或在接口注释明确「不含 +7,调用方自理」。否则 editor 误用会高 7px。 |
| S4 | **party blit +4 / NPC blit +7 区分** | ✨ 新架构统一 +7 | 低 | reforge 把 party 与 NPC 都用 +7(render.ts:186 统一),不区分 +4/+7。**party +4 是 sdlpal wLayer 相消后的特例(world.y+4-height),reforge 的 SpriteDraw.worldY 语义 = 脚底(已含 wLayer=0 假设)**。当前 reforge 无 wLayer 概念(height 是独立轴,grid.ts:64 `spriteScreenY = gridY - height*16`)。若 party 与 NPC 锚一致则 OK;**需确认 reforge 是否需要 wLayer 区分**(目前看不需要,height 轴已表达)。 |

---

## 审计单元 3:场景合成 MakeScene

### 3.1 sdlpal C 真值(`PAL_MakeScene`,scene.c:452-509)
- **流程**(scene.c:472-491):
  1. **Step 1**:`PAL_MapBlitToSurface(layer 0)`(scene.c:480)+ `PAL_MapBlitToSurface(layer 1)`(scene.c:481)。**两层全画,不清屏**。
  2. **Step 2**:`PAL_ApplyWave(gpScreen)`(scene.c:486)— 屏幕波动,**只波地图层**(在 sprite 之前)。
  3. **Step 3**:`PAL_SceneDrawSprites()`(scene.c:491)— 精灵 + cover tile 同表 Y-sort 后 blit。
  4. (debug)`PAL_ShowSearchTriggerRange`(scene.c:493-498,#if 保护)。
  5. **FadeIn 检查**(scene.c:503-508):`fNeedToFadeIn` 时 `VIDEO_UpdateScreen + PAL_FadeIn`。
- **关键序**:地图 → wave → sprite+cover。**wave 不波 sprite**。
- **副作用**:写 `gpScreen`(持久,不清屏);推进 `wScreenWave`/`sWaveProgression`(scene.c:389)。

---

### 3.2 一阶段实现(`presentFrame`,present.ts:166-686)
- ✅ **流程对齐**(present.ts:269-589):
  1. `fb.clear()`(present.ts:269)— **与 sdlpal 不同:sdlpal 不清屏,一阶段清**。用 `repairTilemapSeams` 补偿(present.ts:290)。
  2. `drawTilemap(layer 0, coverage)`(present.ts:282)+ `drawTilemap(layer 1, coverage)`(present.ts:285)。✅ 两层全画。
  3. `repairTilemapSeams`(present.ts:290)— **wave 之前**(注释 present.ts:288-289:coverage 对应未扭曲的地图像素)。✨ 新架构特性。
  4. `applyScreenWave`(present.ts:294-296)— **wave 在 sprite 之前**。✅ 对齐 scene.c:486。
  5. 精灵 + cover tile 入 entries(present.ts:303-582)→ Y-sort(present.ts:586)→ blit(present.ts:589)。✅
  6. `paletteFadeState.remap`(present.ts:595-601)— FadeToRed 像素重映射。
  7. `drawDialogOverlay`(present.ts:604)— 对话框最上层。
  8. `fadeState` dither(present.ts:628-643)— 72 帧 rgIndex dither。
  9. `drawMenuStack`(present.ts:655-675)— 菜单 modal。
  10. `applyScreenShake`(present.ts:683-685)— 屏幕摇晃,**最后**(输出阶段)。
- ✅ **Y-sort 稳定**(present.ts:586 `entries.sort((a,b) => a.baseY - b.baseY)`):Array.sort 稳定(ES2019+),对齐 scene.c:327-348 bubble sort 的稳定性。
- ✅ **wave 不波 sprite**:wave 在 sprite 之前(present.ts:294 vs 589),sprite 像素不被 wave 扭曲。✅
- ✅ **cover tile 与 sprite 同表 Y-sort**(present.ts:303,586,589):cover tile entry 与 sprite entry 推入同一 `entries[]`,统一 sort + blit。✅ 对齐 scene.c:181-362。
- ✨ **额外特效**(sdlpal 在 video.c 而非 scene.c):FadeToRed remap、dither fade、screen shake、dialog overlay、menu modal —— 一阶段把 sdlpal 分散在 scene.c/video.c/text.c/uigame.c 的输出阶段都收到 presentFrame。

---

### 3.3 reforge 实现(`renderScene`,render.ts:143-195)+ `renderSceneFrame`(render-scene.ts:29-41)
- ✅ **流程对齐 sdlpal 核心**(render.ts:157-194):
  1. `clear()`(render-scene.ts:35 → render.ts:137-141 `fillStyle='#000'`)。**清屏到黑**(与一阶段同,与 sdlpal 不清屏不同)。
  2. step 1 基底两层全画(render.ts:157-173)。✅
  3. step 2 精灵 + cover tile 入 entries(render.ts:182-190)。✅
  4. step 3 Y-sort + blit(render.ts:193-194)。✅
- ✅ **ctx 变换在 renderScene 外**(render-scene.ts:36-40):`save → scale(worldScale) → imageSmoothingEnabled=false → renderScene → restore`。**pixelated 保点阵锐利**。
- ✅ **Y-sort 稳定**(render.ts:193 `entries.sort((a,b) => a.baseY - b.baseY)`)。
- ✅ **cover tile 与 sprite 同表 Y-sort**(render.ts:182-194):sprite entry(render.ts:187)+ cover entry(render.ts:265)同入 `entries[]`。✅ 对齐 scene.c。
- ❌ **缺 wave**(全 render.ts 无 `applyScreenWave`):sdlpal scene.c:486 + 一阶段 present.ts:294-296 有。**风险 = 低**(reforge 当前定位是编辑器+切片,无 wave 需求;将来内容层需要时再补)。
- ❌ **缺接缝修复**(见 T1):与「不清屏」语义偏离叠加 → 接缝露黑。
- ✨ **新架构特性**:
  - **图层开关**(render.ts:76-81 `RenderLayerOpts`:`skipBase`/`skipCover`):编辑器图层显隐。sdlpal/一阶段无。
  - **烘焙缓存**(render.ts:104-130 `tileCache`/`frameCache`):tile/frame → `<canvas>` WeakMap/Map 缓存,避免每帧重 bake。sdlpal RLE 每帧解码(无缓存,但 C 快);一阶段每帧 blitTile 循环(无缓存)。reforge Canvas2D drawImage 用缓存,**性能更优**。
  - **菱形网格坐标系**(grid.ts:37-39 `x=16(col-row), y=8(col+row)`):**与 sdlpal/一阶段的 `x=col*32, y=row*16` 不同**。但 reforge 的 tile 平铺(render.ts:168-170)仍用 `c*TILE_W - HALF_W` = `c*32-16`,**与 sdlpal 一致**(没套菱形 grid 转换)。→ reforge 的「精灵用菱形 grid 坐标,瓦片用 sdlpal 像素坐标」是**两套坐标系共存**,main.ts:1433 `gridToPixel(e.pos)` 给精灵,render.ts 直接 `c*TILE_W` 给瓦片。**需确认两者在屏幕上对齐**(gridToPixel 的菱形坐标是否落在 tile 的 (c*32-16, r*16-8) 上)。这是 reforge 特有的潜在风险,非本次审计单元核心,标记待查。

---

### 3.4 场景合成缺口清单

| # | 缺口 | reforge 状态 | 风险 | 行动建议 |
|---|---|---|---|---|
| M1 | **wave(屏幕波动)** | ❌ 缺失 | 低 | 移植 `applyScreenWave`(present.ts:294 + screen-wave.ts)。opcode 0x71 设 wScreenWave 后生效。reforge 当前无剧情用到,可延后。 |
| M2 | **接缝修复**(与 T1 同根) | ❌ 缺失 | 中 | 见 T1。clear 到黑 + 无 repair = 接缝露黑。 |
| M3 | **FadeToRed / dither fade / screen shake / dialog / menu** | ❌ 缺失 | 低 | 这些是 sdlpal 分散在 video.c/text.c/uigame.c 的输出阶段,reforge 作为「渲染地基」可不包含,由上层壳层补。**不算 reforge 渲染引擎的缺口**,算分工边界。 |
| M4 | **菱形 grid 坐标 vs sdlpal 像素坐标共存** | ⚠️ 待确认 | 中 | reforge 精灵用 `gridToPixel`(菱形),瓦片用 `c*32-16`(sdlpal 直角)。需验证两者在屏幕对齐。若 gridToPixel 的 (col,row) 与 tile 的 (c,r) 不是同一坐标系,精灵会错位。**非本审计单元核心,标记为单独审查项**。 |
| M5 | **Y-sort 稳定性** | ✅ 对齐 | — | Array.sort ES2019+ 稳定。 |

---

## 总结:高危项复核(用户指定 7 项)

| # | 高危项 | sdlpal 真值 | 一阶段 | reforge | 判定 |
|---|---|---|---|---|---|
| H1 | **瓦片接缝漏黑**(coverage mask vs idx===0) | 不清屏规避(scene.c:471) | ✅ `repairTilemapSeams` + coverage(draw-tilemap.ts:169) | ❌ clear 到黑 + 无 repair | **reforge 中风险**(T1/M2);Canvas2D drawImage alpha 通道本身不漏黑,但**邻接 tile 都透明时露 clear 的黑底** = 同坑。测试场景无斜崖未暴露。 |
| H2 | **opaque mask**(RLE-skip vs palette-0) | `PAL_RLEBlitToSurface` 按 RLE 跳 | ✅ `TileImage.opaque`(draw-tilemap.ts:28) | ✅ `bakeFrame` alpha=opaque?255:0(render.ts:41) | **reforge ✅ 对齐**;Canvas2D alpha 原生处理,架构免疫(commit `0cbf7fe4` 的坑 reforge 不会踩)。 |
| H3 | **baseline 偏置 + ±1 fence** | map.c:397 `-8` + map.c:389-392 ±1/±2 | ✅ `ROW_Y_STEP`/`SUBROW_Y_STEP` + ±1 fence(draw-tilemap.ts:121,128) | ✅ 偏置对齐(render.ts:168-170)/ ⚠️ 缺 fence(render.ts:152-155) | **reforge 偏置 ✅,fence ⚠️**(T3);靠调用方 room 大小兜底,引擎层不保证。 |
| H4 | **精灵 blit y +7、sLayer×8 只进排序** | scene.c:358 +7 / sLayer×8 相消不进 blit | ✅ present.ts:566 `+7` / sort key `sLayer×8+9`(present.ts:558) | ✅ render.ts:186 `+7` / sort `baseYBias×8+9`(render.ts:187) | **reforge ✅ 对齐**(commit `6c5fc655` 之坑2 已修);但 cover iLayer 偏移仍缺(S1)。 |
| H5 | **每帧自锚(不用 frame[0])** | scene.c 按 `PAL_RLEGetWidth/Height(当前帧)` | ✅ draw-sprite.ts:34-35 每帧自锚 | ✅ main.ts:1440-1441,1462-1463 每帧自锚 | **reforge ✅ 对齐**(commit `6c5fc655` 之坑3 已修,复踩一阶段 commit `0045cbae` 的坑后修)。 |
| H6 | **cover tile 与精灵同表 Y-sort** | scene.c:181-362 同 `g_rgSpriteToDraw[]` | ✅ present.ts:303/586/589 同 `entries[]` | ✅ render.ts:182-194 同 `entries[]` | **reforge ✅ 对齐**。 |
| H7 | **屏外剔除在 cover tile 之前** | scene.c:290-311 剔除在 AddSpriteToDraw/CalcCoverTiles 之前 | ✅ present.ts:554-557 剔除在 addCoverTileEntries 之前 | ❌ render.ts:182-190 无剔除 | **reforge ❌ 缺失**(S2);当前场景实体少未触发,大场景会暴露屏缘地块闪烁(一阶段 commit `9ebcafc9`/血池审查同坑)。 |

---

## 行动建议优先级

### 高(应在 reforge 进入内容验证前补)
- **T1/M2 接缝漏黑**:移植 `repairTilemapSeams` 或等价 Canvas2D 方案。血池类场景(崖边斜接缝)才会暴露,但一旦内容用到就难查。
- **M4 坐标系共存审查**:菱形 grid vs sdlpal 像素,确认精灵/瓦片屏幕对齐。

### 中(进入大场景/NPC 密集场景前补)
- **T3 ±1 fence**:renderScene 内部对 view 扩 ±1。
- **S2 屏外剔除**:精灵入表前 + cover 之前剔除。
- **S1 cover iLayer 偏移**:sLayer≠0 的上桥 NPC 才暴露。

### 低(语义对齐 / 接口一致性)
- **T2 layer0 NULL fallback tile(0)**:正常资产不触发。
- **S3 `drawSprite` 接口 +7**:与 renderScene 不一致,防误用。
- **M1 wave / M3 输出阶段特效**:分工边界,可由壳层补。

---

## 附录:reforge 已正确移植的一阶段踩坑(避免重复犯错,这部分做得好)

reforge commit `6c5fc655`「开场演出渲染三坑」表明作者已主动照一阶段结论修了 3 个坑:
1. **NPC 走位朝向错**(象限规则作用像素轴)— 非渲染地基,本审计不覆盖。
2. **密道盖板错缝**(blit +7 + sLayer×8 进排序)= H4 — ✅ 已修(render.ts:186-187)。
3. **爬行帧瞬移**(每帧自锚)= H5 — ✅ 已修(main.ts:1440-1441)。

**但仍漏了 3 个一阶段已解决的渲染坑**:
- **接缝漏黑**(H1/T1)— 一阶段 commit `55aecff0`,reforge 未移植。
- **屏外剔除**(H7/S2)— 一阶段 commit `9ebcafc9` + 血池审查,reforge 未移植。
- **cover iLayer 偏移**(S1)— 一阶段 commit `9ebcafc9`(Sync.2 fix10),reforge 未移植(reforge 的 baseYBias 只进 sort 不进 cover)。

**根因**:reforge 作者读了一阶段「blit +7 / 每帧自锚」的结论(commit message 引用 present.ts:540-546、draw-sprite.ts:16-24),但**没读 `repairTilemapSeams`、屏外剔除、cover iLayer 这三条**。建议把这三条加入 `docs/phase2/READ-FIRST.md` 的「渲染地基铁律」。
