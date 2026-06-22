# 瓦片图集打包计划（tileset atlas packing）

> 起草日期:2026-06-22。性质:**第一阶段可落地的资源管线优化**(不破坏忠实性),同时为第二阶段 P0 schema §5 的「全局共享瓦片集」铺路。
> 阶段定位:第一阶段(忠实还原),不触碰 `docs/phase2/`。但本文末尾会写清第二阶段如何接续。
> 依赖前置:无。本计划与 [2026-06-22-phase1-engine-debt-audit.md](../phase2/2026-06-22-phase1-engine-debt-audit.md)(第二阶段架构债)正交 —— 那份是「引擎代码怎么重写」,本文是「资源怎么打包」,互不阻塞。
>
> **修订记录(2026-06-22,评审后)**:核对全部代码锚点属实(行号、函数签名)。本次修订把**主卖点从「体积」改为「请求数 / SW 条目 / 解码次数」**(后者确定,前者看内容);修正了「零拷贝切片」(网格布局下不成立,改加载时复制);把体积验证提前为门禁式探针 S0;补回被漏掉的 type-4 灰度+alpha 编码与 animation(92MB)范围说明。详见各节 `〔修订〕` 标注。

## 0. 问题陈述(数据驱动)

当前 `pnpm extract` 产出 75,497 张 PNG 共 392MB,其中 **`images/world/` 占 71,848 张 / 281MB(72%)= tileset 67,715 + npc 4,133**。本计划只动 tileset 这 67,715 张 / ~265MB。

| 维度 | 数值 | 说明 |
|---|---|---|
| tileset PNG 总数 | 67,715 | 每张 tile 一张 PNG |
| tileset 总大小 | ~265 MB | 占整个 extracted/ 的 68% |
| 单张 PNG 中位数 | 498 字节 | 平均 486,P99 = 893,最大 1030 |
| 单地图 tile 数 | 188–452 张 | 223 个 map,每 map 一目录(avg ~304) |
| manifest 总条目 | 77,624 | 含 tileset 67,715 + npc 4,133 + 其它 |

**碎文件的真实代价**(与单文件大小无关,与请求数有关):
- **PNG 头开销占比 ~20%**:500 字节文件里 ~100 字节是 signature+IHDR+PLTE+IDAT+zlib header+IEND。像素数据可能仅 300B。
- **每张 PNG 一次解码管线**:URL 解析 → SW cache 查找 → Response 构造 → `createImageBitmap` → PNG 解码 → canvas getImageData。单地图 188–452 次 `createImageBitmap` 调用累积成可感延迟(`createImageBitmap` 每次都有真实的异步解码开销),即使 HTTP/2 多路复用 + SW 全命中。
- **SW 全量预缓存 337MB / 77k 条**:本地数十秒、生产数分钟(README 已承认)。Cache Storage 的 entry 元数据膨胀,版本切换 GC 压力大。
- **manifest 6.9MB JSON / 77k 条**:光解析就不少开销。

**关键洞察**:「分场景」**已经做了**(loader.ts:198 按当前 map 的 `tilesetFiles[]` 拉)。真正的瓶颈是「**每个 tile 切成一张 PNG**」这个粒度,不是「分不分场景」。要解决的是文件粒度,不是加载粒度。

**〔修订〕范围旁注**:全 extracted 第二大消费者是 `images/animation/`(92MB / 1464 张,占总量 24%),走同一个 `encodeIndexedPng` 4× RGBA 路径。本计划**不动它**(它文件数少,不是请求数问题,atlas 帮不上忙),但它是 §5 「紧凑编码」杠杆的潜在受益者 —— 见 §5、§7。

## 1. 目标与非目标

### 目标(按确定性排序)

**确定性收益(本计划的真正卖点,与内容无关):**
1. **请求数**:单地图加载从 188–452 次 PNG fetch 降到 **1 次**(每地图一张图集)。tileset PNG 总数 67,715 → 223。
2. **解码次数**:单地图从 188–452 次 `createImageBitmap` 降到 **1 次**(再加载时切片,见 §2.2)。
3. **SW 条目数**:77,624 → **~10,000**(tileset 67k 消失,NPC 4,133 与其它不变;砍 ~87%),预缓存 / 版本切换开销大降。

**看内容的收益(实测才算数,见 §2.3 / S0 探针):**
4. **体积**:tileset 总体积砍 **≥35%(现实预期 40–55%)**。碎 PNG 头开销消失(确定但小)+ zlib 跨 tile 合并压缩(主力,但跨地图强冗余被推给第二阶段 §6,故本阶段红利有限)。**不把「砍到 100MB 以内」当硬指标**(理由见 §2.3)。

**底线(不可破坏):**
5. **不破坏忠实性**:tile 像素数据一字未改。运行时 `decodePngToIndices` 解出的 `IndexedImage` 逐像素不变(纯打包格式变更)。
6. **不破坏现有测试**:`pnpm check` 全绿;渲染输出逐像素不变,由 S5 snapshot 测试钉死。

### 非目标(明确不做)
- ❌ **不换渲染架构**:仍走 indexed framebuffer(`packages/game/src/present/framebuffer.ts`),不上 WebGL/GPU。那是第二阶段的事(debt-audit P1-1/P1-3)。
- ❌ **不做全局瓦片去重**:那是第二阶段 P0 schema §5 的活(见本文 §6)。本文只做「每地图一张图集」。**跨地图强冗余(共享地板/墙/水面)正是体积大头,但它是「资源组织」问题,不是「打包格式」问题,留第二阶段。**
- ❌ **不换文件格式(WebP/AVIF/KTX2)**:与合图正交,留第二阶段。可选的 type-4 灰度+alpha 见 §5。
- ❌ **不改 NPC sprite 打包**:npc 只 17MB / 4133 张,优先级低。NPC sprite 同构改造留作后续(见 §7)。
- ❌ **不改 animation / battle / magic / items**:animation 92MB 虽大但 1464 张(非请求数问题);battle 11MB、magic 5MB、items 1MB 占比小。本文聚焦 tileset 这个 68% 的大头 + 请求数瓶颈。紧凑编码(§5)若验证有效,可独立惠及它们。

## 2. 方案:每地图一张图集(per-map atlas)

### 2.1 图集布局

对每个 mapNum,把它所有 tile 拼成一张 PNG 图集:

```
tileset-atlas-{mapNum}.png
  布局: 16 列 × ceil(tileCount / 16) 行的网格
  每 tile: tile 原始尺寸(通常 16×16,但 GOP.MKF 解出的帧尺寸不一,见下)
  透明边距: padding = 0(见 §8 决策 2)
```

配套索引文件:

```json
// data/tilemap/{mapNum}.json(扩展现有 tilemap JSON)
{
  ...现有字段(width/height/cells/lower/upper)...,
  "atlas": {
    "image": "world/tileset/atlas-{mapNum}.png",
    "tileSize": 16,          // 多数 tile 尺寸;非 16 的 tile 见 tiles[].w/h
    "padding": 0,
    "tiles": [
      { "index": 0, "x": 0,  "y": 0,  "w": 16, "h": 16 },
      { "index": 1, "x": 16, "y": 0,  "w": 16, "h": 16 },
      ...
    ]
  }
}
```

**尺寸不一的处理**:GOP.MKF 的 sprite chunk 解出的帧尺寸不固定(不是所有都 16×16),所以 `tiles[].w/h` 是 per-tile 的,不假定统一 16。这是 `parseSpriteChunk` 的既有语义,Atlas 保留。

> **〔修订〕padding 改 0**:原计划留 1px「为第二阶段 GPU 采样」。但 §6 的第二阶段去重会把图集**拆掉重组**,现在留的 padding 注定丢弃;且 16 列网格留 1px 会让图集面积多 ~10–12%(与「体积优化」目标相悖)。本阶段 CPU blit 不需要 padding。第二阶段真上 GPU 时,在它自己的重组阶段加 padding,零损失。

### 2.2 改动面(已核实,精确到函数)

**extractor 侧(packages/pal-extract)—— 2 个文件**:

1. **`src/resources/sprite.ts`** — 新增 `packAtlas(frames: SpriteFrameOut[], cols=16, padding=0)`,返回 `{ width, height, pixels, opaque, rects: Array<{index,x,y,w,h}> }`,再交给一个 atlas 版编码器一次 `PNG.sync.write`。
   - 复用 `encodeIndexedPng:60` 的 RGBA 编码逻辑(R=G=B=index,A=opaque),只是输入从单帧变成「多帧 + 各自 rect 写进大 buffer」。
   - **注意**:`packAtlas` 的输入应是**解出的 `RleFrame`(含 pixels/opaque),不是已编码的 `pngBytes`**。当前 `framesToOut` 在 `map.ts:59` 就把帧编码成 PNG 了;atlas 路径要在编码**之前**截流(拿 `RleFrame[]`),否则得先解 PNG 再拼,白绕一圈。

2. **`src/cli.ts:601-630`(tileset 写盘循环)** — 改为:
   - 不再 `for (tile of mapResult.tiles) writeBinary(tile.pngBytes)`(67k 次)
   - 改成 `const atlas = packAtlas(mapResult.frames); writeBinary(atlasPath(mapNum), atlas.pngBytes)`(223 次)
   - `parseMap` 需同时返回 `frames`(原始 `RleFrame[]`)供 `packAtlas` 用,或在 CLI 侧直接 `parseSpriteChunk(gopBytes)`。
   - `tilemap JSON` 的 `tilesetFiles` 字段替换为 `atlas` 对象(见 §2.1 schema)。一刀切删除 `tilesetFiles`(见 §3)。

3. **`src/cli.ts:96 imageWorldTilesetRelPath`** — 新增 `imageWorldTilesetAtlasPath(mapNum)` 返回 `world/tileset/atlas-{mapNum}.png`。旧 `tile-{XXXX}.png` 命名函数删除(一刀切)。

**loader 侧(packages/game/src/assets)—— 2 个文件**:

4. **`src/assets/png.ts`** — 新增 `sliceIndexedImage(atlas: IndexedImage, rect: {x,y,w,h}): IndexedImage`。
   - **〔修订〕不是零拷贝**:tile 是大图里的矩形区域,行与行之间隔着 `atlas.width - w` 字节,**在 buffer 里不连续**,`subarray` 切不出来;且 `IndexedImage` 没有 stride 字段(`indices.length` 必须 == `width*height`)。所以必须 **new 一个 `w*h` 紧凑 buffer,逐行 copy**(`h` 次 `set`/`subarray` 拷贝)。成本:每地图加载时 ~300 次小 memcpy,一次性、微秒级,可忽略。
   - 现有 `IndexedImage` 类型不变(`png.ts:13-21`),下游因此无感。

5. **`src/assets/loader.ts:196-204`(tile 加载)** — 改为:
   - 读 `tilemap.atlas`(新字段)而非 `tilesetFiles[]`
   - `fetchPng(atlasUrl)` 一次拉整图 → `decodePngToIndices` 得到整张 atlas 的 `IndexedImage`(浏览器 canvas 解码,**一次** `createImageBitmap`)→ 对每个 `tile.rect` 调 `sliceIndexedImage` 复制出 per-tile `IndexedImage`
   - 填入现有 `tileImages: Map<number, IndexedImage>`(下游 `draw-tilemap.ts` 不变)
   - **下游零改动**:`draw-tilemap.ts`、`present.ts`、所有消费者拿到的还是 `Map<number, IndexedImage>`,完全无感。`decodePngToIndices` 走 `createImageBitmap`+canvas,**永远吐 RGBA**,与磁盘 PNG color type 无关 —— 这也是 §5 type-4 能运行时免费的原因。

**测试侧**:
- `packages/pal-extract/src/resources/__tests__/`(map 相关)新增 `packAtlas` 拼装 + `sliceIndexedImage` 切片 roundtrip 测试(拼图后切片 == 原始 tile 像素 + opaque)。
- `packages/game/src/assets/loader.test.ts`(如不存在新建)新增 atlas 加载测试。
- 现有 `draw-tilemap.test.ts`、`present.test.ts` **不需要改**(下游接口不变)。
- 加一个 snapshot 对比:同一 mapNum 用旧碎文件渲染 vs 新图集渲染,输出像素必须一致(S5)。

### 2.3 体积收益:能砍多少,凭什么

**确定但小的部分:**
- **PNG 头消失**:67,715 张各自的 ~100 字节头 → 1 张图集只算一次。67,715 × 100B ≈ 6.5MB,占 tileset 总量 ~2.5%。

**主力但看内容的部分(zlib 跨 tile 合并):**
每张 500B PNG 内 zlib 独立字典、独立 restart,跨 tile 的重复图案在碎文件里无法共享。合图后 zlib 一次扫全图,**地图内**重复 pattern 命中率上升。但 —— **强冗余(地板/墙/水面跨场景共享)是跨地图的,本计划不做(§6 推给第二阶段);地图内的 tile 多数彼此不同**(GOP chunk 是该 map 的去重瓦片集,见 `map.ts:58` `parseSpriteChunk(gopBytes)`)。所以本阶段拿到的是「地图内连贯像素 + 少量近似 tile」的红利,不是「同款地板压成一条」的红利。

**〔修订〕实测区间(pngjs 合成微基准,指示性,非权威 —— 真值看 S0):**

| 内容形态 | 现状 per-tile RGBA | atlas RGBA | 降幅 |
|---|---|---|---|
| 纯噪声(最坏) | 82,923 B | 52,430 B | −37% |
| **现实(连贯、彼此不同的 tile)** | 49,920 B | 25,329 B | **−49%** |
| 理想化(大量同款地板) | 33,300 B | 1,085 B | −97% |

→ 单靠 per-map atlas,现实区间 **40–55%**;要到 60%+ 需要地图内大量近似 tile。**故验收按 ≥35%(预期 40–55%)算,不把 100MB 当硬门禁。** 请求数 67k→223 才是确定性收益。

### 2.4 为什么仍然值得做

体积只是 bonus,真正的价值是**确定性的请求数 / 解码 / SW 三杀**:用户切场景从「一次性发 188–452 个请求 + 解 188–452 次 PNG」变成「1 个请求 + 1 次解码 + 一把内存切片」;SW 预缓存从 77k 条降到 ~10k 条。这些与地图内容无关,稳赚。即使体积只砍 35%,这三项也足以支撑本计划。

## 3. 迁移策略:一刀切

**一刀切(不做向后兼容)**。

理由:
- `data/extracted/` 是 gitignore 的生成物(`packages/game/public/extracted` 是软链),`pnpm extract` 重新生成即可。没有「线上旧数据要兼容」的问题。
- loader 控制完整加载链,改完 extractor + loader 同步发布即可。
- 留 `tilesetFiles` 字段做兼容反而增加复杂度(两条代码路径都要测)。

**唯一要处理的**:生产环境 `pal.illegalscreed.cn` 部署后,SW cache 会因 `manifest.version` 变化自动失效重拉(`sw.js:67 setCacheVersion`)。用户首次访问会重新预缓存,这是预期行为。部署说明里提一句。

## 4. 执行步骤(建议顺序)

每步独立 commit + `pnpm check` 全绿后再进下一步。

| 步骤 | 内容 | 改动文件 | 验证 / 门禁 |
|---|---|---|---|
| **S0(门禁)** | **真实数据探针**:对 1–2 个真实 mapNum 的 GOP chunk 跑一次 `packAtlas`(RGBA),量实际压缩比;顺带量一次 type-4 灰度+alpha(§5)。**不写完整管线,只是一段一次性脚本** | 临时脚本 | atlas RGBA 降幅 ≥40% → 按原方案推进;<40% → 回头审 scope(是否提前引入 §6 去重 / type-4) |
| **S1** | extractor 加 `packAtlas` + 测试 | `sprite.ts`(+ `map.ts` 暴露 frames) | roundtrip:拼图切片 == 原始像素 + opaque |
| **S2** | CLI 改用图集写盘(padding=0) | `cli.ts:601-630` | `pnpm extract` 跑通,生成 223 张图集 + atlas JSON |
| **S3** | loader 加 `sliceIndexedImage`(**逐行 copy,非 subarray**)+ 测试 | `png.ts` + 新测试 | 切片正确性测试(像素 + opaque) |
| **S4** | loader 改读 atlas | `loader.ts:196-204` | `pnpm --filter @type-pal/game dev` 进游戏,渲染正常 |
| **S5** | 像素一致性验证 | snapshot 测试 | 旧碎文件渲染 vs 新图集渲染,逐像素相同 |
| **S6** | 数据对比 + 文档更新 | `docs/resource-status.md` | 记录体积/请求数/解码次数 before/after |

**预估工时**:1-2 个工作日(S0 半小时,S1+S2 半天,S3+S4 半天,S5+S6 半天)。改动面小,主要时间在测试和像素验证。

## 5. 可选优化:紧凑像素编码(与合图正交,可独立做)

**现状**:`encodeIndexedPng`(sprite.ts:60)把 palette index 编成**灰度 RGBA(color type 6)**:`R=G=B=index, A=opaque`,4 字节/像素,其中 R/G/B 三通道完全冗余。`framesToOut`(sprite.ts:91)注释自己写了「磁盘代价 ×4 但实现简单;M3 视情况优化」—— 这就是那个待优化点。

### 5.1 真 8 位索引 PNG(color type 3)—— ❌ 不可行
理由(原计划判断正确):
- `pngjs` 不支持写 color type 3(已核 `packer.js`:仅支持 type 0/2/4/6),要换库。
- **per-pixel opaque mask 表达不了**:type-3 的 tRNS 是 per-调色板-条目 透明,不是 per-pixel。而 tile 的透明是 RLE-skip 的 per-pixel 语义,且 `png.ts:7` 注释明确依赖「opaque palette-0」(角色头发暗部 = palette 0 但 opaque)—— 没有一个「全局未用作 opaque 的空闲 index」可当透明哨兵。**结论:tile 不适合 type-3。**

### 5.2 灰度 + alpha PNG(color type 4)—— ✅ 可行,但收益看内容,值得量
**〔修订〕原计划漏了这条**。R=G=B 本就是灰度,所以 `gray=index, alpha=opaque` 是完美映射:
- **`pngjs` 支持**(`COLORTYPE_ALPHA:4`,已核 `constants.js`)。
- **per-pixel alpha 保留**(alpha 是真 per-pixel 通道,不是 type-3 的 per-entry)。
- **运行时零改动**:`decodePngToIndices` 走 `createImageBitmap`+canvas,无论磁盘存的是 type-4 还是 type-6,解出来都是 RGBA,`R` 仍 = index、`A` 仍 = opaque。只改 extractor 一个函数。
- **原始字节减半**:4 字节/px → 2 字节/px。

**但 —— 压缩后体积不保证更小**:实测 type-4 的 zlib 输出**看内容**(pngjs 自适应行滤波):合成噪声形态比 RGBA 小 ~40%,但空间连贯形态反而**大** ~41%。所以这是一个「**S0 里顺手量 30 分钟、改一个函数就能验**」的实验,**不是稳赚的杠杆,别预设结论**。

**若 S0 证明 type-4 在真实 tile 上更小**:它惠及**所有**走 `encodeIndexedPng` 的资源(tileset + animation 92MB + battle + magic),收益面远超 atlas;可作为独立小 PR 先行(改 `encodeIndexedPng` 一处,跑回归)。**若不更小或更大**:维持 RGBA 灰度,本计划照常(atlas 的请求数收益不依赖它)。

## 6. 第二阶段衔接(全局瓦片去重)

本计划做完后,第二阶段 P0 schema §5 的「全局共享瓦片集」接续:

**现状(本计划后)**:223 张 per-map 图集。但 map 之间 tile 重叠度极高 —— 地板、墙、水面跨场景共享。223 张图集里大量像素级重复。**这部分跨地图冗余正是体积大头,本计划(per-map)拿不到,留给第二阶段。**

**第二阶段做的事**(p0 schema §5):
1. **全局瓦片去重**:对所有 map 的 tile 做像素级 hash(或 perceptual hash),建立 `shared/assets/tile-pool/`(去重后,可能只剩几十张共享图集)。
2. **map 数据只存引用**:每个场景的 map 存 `tileId → 瓦片池 ref + UV`,不再存像素。
3. **仙剑原版本来就是这结构**:`reference/sdlpal/map.c` 的 `gpTilemap` 是全局瓦片集 + map 引用。当前 extractor 按 mapNum 隔离了,把共享关系丢了 —— 迁移器(p0 schema §8)恢复它。

**收益叠加**:A(本计划)做完 265MB → ~120-160MB(现实 40-55%);B(去重)再砍跨地图冗余,可能到 ~40-50MB。**体积大头在 B,不在 A** —— 这也是本计划不把体积当主卖点的根本原因。

**为什么不在第一阶段做 B**:
- 全局去重要改 tilemap 数据结构(tileId 命名空间从 per-map 变 global),影响面比合图大得多。
- 第二阶段内容工程本来就要重新组织资源(p0 schema §7),B 自然落在那里。
- 第一阶段做 A 已经能拿到**确定性收益**(请求数 67k → 223、SW 77k → 10k、解码 452 → 1)。

**A 不挡 B 的路**:A 做的事(每地图一张图集)是「打包格式」,B 做的事(去重 + 全局引用)是「资源组织」。B 实现时会把 A 的图集拆出来重新组织,A 的代码可逆。

## 7. 后续可做(非本计划范围)

- **type-4 紧凑编码全量铺开**:若 §5.2 的 S0 探针证明有效,改 `encodeIndexedPng` 一处即可惠及 tileset + animation(92MB)+ battle + magic,收益面大、改动小。优先级可能高于下面几条。
- **NPC sprite 合图**:`world/npc/{id}/frame-XX.png`(4133 张 / 17MB)可按 `spriteId` 合成每 sprite 一张图集。改动与 tileset 同构,但优先级低(17MB vs 265MB)。
- **animation 合图**:1464 张 / 92MB。文件数少(非请求数问题),atlas 收益主要在 zlib 合并;优先靠 type-4 紧凑编码。
- **battle/magic/items 合图**:占比小(battle 11MB、magic 5MB、items 1MB),收益有限,暂不做。
- **GPU 渲染时图集 UV**:第二阶段上 WebGL 后,图集天然适合 GPU 纹理采样(届时在第二阶段重组阶段加 padding)。A 是 GPU 渲染的前置之一。

## 8. 决策点(需确认)

1. **一刀切还是过渡期?** —— 「一刀切」(理由见 §3)。
2. **图集 padding 留不留?** —— **〔修订〕padding = 0**。原推荐留 1px「为 GPU」,但第二阶段重组会丢弃它、且现在留它增 ~10-12% 面积与体积目标相悖。GPU padding 在第二阶段它自己的重组阶段加(见 §2.1)。
3. **图集列数固定 16 还是按 tile 数自适应?** —— 「固定 16 列」(简单可预测;某些 map tile 少于 16 也无所谓,图集窄一点)。
4. **是否同时改 NPC sprite?** —— 「否,本计划只做 tileset」(聚焦 68% 大头,NPC 留后续)。
5. **〔新增〕type-4 灰度+alpha 编码做不做?** —— 「S0 里量,看真实数据再定」。更小则可作独立小 PR 先行铺全量;不更小则维持 RGBA(不阻塞本计划)。

## 9. 验收标准

**硬门禁(确定性,必须达成):**
- [ ] `pnpm extract` 产出:223 张 `world/tileset/atlas-{N}.png` + 223 个 `data/tilemap/{N}.json`(含 atlas 字段),不再有 `tile-{XXXX}.png`。
- [ ] manifest 条目数从 77,624 降到 **~10,000**(tileset 67k 消失,NPC 4,133 + 其它保留)。
- [ ] 单地图 PNG fetch 从 188–452 降到 1;`createImageBitmap` 调用同步降到 1。
- [ ] `pnpm check` 全绿(typecheck + 所有测试)。
- [ ] 像素一致性:任意 mapNum,旧碎文件渲染输出 == 新图集渲染输出(snapshot 测试)。

**软目标(看内容,记录实测即可,不作 fail 条件):**
- [ ] tileset 体积砍 **≥35%(预期 40–55%)**,实际数字记入 `docs/resource-status.md`。
- [ ] 生产部署后 SW 预缓存时间明显下降(从「数分钟」量级降到「数十秒」量级,实际网络测)。
