# 瓦片资源管线优化:每地图 RLE blob（取代 atlas 方案）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: plan-status-v1 / 1.0.0

本页把 phase1 历史计划/审计接入 `plan-status-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 目标与时间范围

- 历史目标：Per-map gzip/RLE blob replacing atlas, measurements, migration and risks.
- 日期：2026-06-22；source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `ade58414e9128ba82dc65beaba7497d70bf4875dbbea83e6503f0953aef19d91`。

## 里程碑

- 原始章节：0. 问题陈述(数据驱动)；1. 目标；2. 方案:每地图 gzip RLE blob；2.1 存储格式；2.2 运行时解码(无 canvas)；2.3 改动面(锚点已核实)；3. 实测数据(真实 GOP.MKF,28 map / 9199 tile,外推到 265MB)；4. 忠实性论证。
- Task、checkbox、命令和 self-review 只保留为历史证据。

## 当前状态

- historical；瓦片资源管线优化:每地图 RLE blob（取代 atlas 方案）：这是 plan-status，当前文档状态为 historical。全文 127 行、15 个标题；摘要/首段为「> 起草日期:2026-06-22。性质:**第一阶段可落地的资源管线优化**(不破坏忠实性),为第二阶段 P0 schema §5「全局共享瓦片集」铺路。」。属于历史/归档材料，不能单独证明当前实现。

## 阻塞与决策

- 正文信号 8:> - **v1(atlas)—— 已否决**:每地图把 tile 拼成一张大 PNG。实测体积只砍 **13%**(见 §7),远低于预期。
- 正文信号 73:| atlas RGBA(v1,已否决) | 230 MB | 13.2% |
- 正文信号 74:| 原始 RLE(未压缩) | 133 MB | 49.9% |
- 正文信号 102:## 7. 被否决的方案(留痕)
- 正文信号 105:- **WebP/AVIF lossless**:需 Node 端编码器(sharp/cwebp,当前未装);且运行时仍走 `createImageBitmap`+canvas,解码开销一分不省;压缩比也不及 RLE+brotli。被支配。
- 正文信号 124:- [ ] 生产 SW 预缓存时间明显下降(数分钟 → 数十秒,实测)—— 待部署后验证。
- 停止线：do not promote historical claims to current truth without a current source or user decision

## 下一步

- 后继入口：Current resource pipeline/phase2 tileset decisions and measured evidence.。
- 若重新执行须新 task card、当前 source/oracle 和独立验收。

## 历史范围

- phase1 archive plan/audit；日期：2026-06-22；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `ade58414e9128ba82dc65beaba7497d70bf4875dbbea83e6503f0953aef19d91`。

## 原始结论

- 瓦片资源管线优化:每地图 RLE blob（取代 atlas 方案）：这是 plan-status，当前文档状态为 historical。全文 127 行、15 个标题；摘要/首段为「> 起草日期:2026-06-22。性质:**第一阶段可落地的资源管线优化**(不破坏忠实性),为第二阶段 P0 schema §5「全局共享瓦片集」铺路。」。属于历史/归档材料，不能单独证明当前实现。

## 当时证据

- 标题锚点：1:瓦片资源管线优化:每地图 RLE blob（取代 atlas 方案）; 12:0. 问题陈述(数据驱动); 24:1. 目标; 36:2. 方案:每地图 gzip RLE blob; 38:2.1 存储格式; 49:2.2 运行时解码(无 canvas); 61:2.3 改动面(锚点已核实); 68:3. 实测数据(真实 GOP.MKF,28 map / 9199 tile,外推到 265MB)；原始正文、代码、表格、状态词在 quote 保全。

## 当前有效性

historical。do not promote historical claims to current truth without a current source or user decision
- 历史冲突/未决：
- 正文信号 8:> - **v1(atlas)—— 已否决**:每地图把 tile 拼成一张大 PNG。实测体积只砍 **13%**(见 §7),远低于预期。
- 正文信号 73:| atlas RGBA(v1,已否决) | 230 MB | 13.2% |
- 正文信号 74:| 原始 RLE(未压缩) | 133 MB | 49.9% |
- 正文信号 102:## 7. 被否决的方案(留痕)
- 正文信号 105:- **WebP/AVIF lossless**:需 Node 端编码器(sharp/cwebp,当前未装);且运行时仍走 `createImageBitmap`+canvas,解码开销一分不省;压缩比也不及 RLE+brotli。被支配。
- 正文信号 124:- [ ] 生产 SW 预缓存时间明显下降(数分钟 → 数十秒,实测)—— 待部署后验证。

## 继任文档

- Current resource pipeline/phase2 tileset decisions and measured evidence.。
- 当前事实由继任规范、代码和新的 review 决定。

## 原文保全

固定源 SHA `ade58414e9128ba82dc65beaba7497d70bf4875dbbea83e6503f0953aef19d91`；quote 中用 `␠` 表示原始行尾空格、`⇥` 表示原始行尾 tab；逆向解码后得到相同 bytes。
<!-- original-source-quote:start -->
> # 瓦片资源管线优化:每地图 RLE blob（取代 atlas 方案）
>
> > 起草日期:2026-06-22。性质:**第一阶段可落地的资源管线优化**(不破坏忠实性),为第二阶段 P0 schema §5「全局共享瓦片集」铺路。
> > 阶段定位:第一阶段(忠实还原),不触碰 `docs/phase2/`。
> > 文件名保留 `atlas-packing`(已被 plans/README 索引),但**方案已变**,见下。
> >
> > **修订记录**
> > - **v1(atlas)—— 已否决**:每地图把 tile 拼成一张大 PNG。实测体积只砍 **13%**(见 §7),远低于预期。
> > - **v2(本文 · RLE blob)—— 采用**:扔掉 PNG 图片容器,每地图存一个 gzip 压缩的**原始 RLE 数据块**,运行时 `DecompressionStream` + 现有 `decodeRle` 解。实测体积砍 **80%(265MB → ~51MB)**,且请求数 / 解码次数 / SW 条目三项一并解决。**v2 严格优于 v1 的每一个维度。**
> > - **更正**:v1 文档 §5.2 曾称「pngjs 可写 type-4 灰度+alpha PNG」—— **错的**。实测 pngjs 无论传什么 `colorType`,写出的 IHDR colorType 字节恒为 6(RGBA)。type-4 路线不存在,已删。
>
> ## 0. 问题陈述(数据驱动)
>
> `pnpm extract` 从 MKF 提取后,tileset 占 **67,715 张 PNG / ~265MB(整个 extracted/ 的 68%)**:每个 tile 一张 PNG,单张中位数 498 字节;223 个地图,每地图 188–452 张 tile(tile 尺寸 32×15,斜视瓦片)。
>
> **根因(一句话)**:tile 是 palette-indexed 位图(256 色),运行时只需要 `index[] + per-pixel opaque mask`。但当前把它**包进了 4 字节/像素的 RGBA PNG 容器**(R=G=B=index,A=opaque)——3 个通道冗余 + 一整套图片编解码开销。**原版 RLE 数据全部只有 ~16MB(GOP.MKF),我们重新编码成 PNG 后膨胀到 265MB(~16×)。**
>
> **碎文件 + 图片容器的四重代价**:
> - 体积:4×RGBA + 每文件独立 PNG/zlib 头,跨 tile 无法共享压缩。
> - 解码:每张一次 `createImageBitmap` + canvas `getImageData`,单地图 188–452 次异步解码任务。
> - SW 预缓存:337MB / 77k 条,本地数十秒、生产数分钟(README 已承认)。
> - manifest:6.9MB JSON / 77k 条。
>
> ## 1. 目标
>
> | 指标 | 现状 | 目标 | 性质 |
> |---|---|---|---|
> | tileset 体积 | 265 MB | **~51 MB(gzip)/ ~38 MB(brotli)** | 实测,确定 |
> | 单地图请求数 | 188–452 | **1** | 确定 |
> | 单地图 `createImageBitmap` | 188–452 | **0** | 确定 |
> | SW 条目数 | 77,624 | **~10,000** | 确定 |
> | 像素输出 | — | **逐像素不变**(snapshot 钉死) | 底线 |
>
> **非目标**:不换渲染架构(仍 indexed framebuffer + CPU blit);不做跨地图全局去重(第二阶段 §8);不动 NPC/animation/battle(本文只做 tileset 这 68% 大头,但同样的「去图片容器」思路可后续推广,见 §8)。
>
> ## 2. 方案:每地图 gzip RLE blob
>
> ### 2.1 存储格式
> 对每个 mapNum,把它在 `GOP.MKF` 里的**原始 sprite chunk 字节**(即原版 RLE 瓦片数据)直接 gzip,写成一个文件:
>
> ```
> data/tileset/{mapNum}.rle     // = gzipSync(readChunk(gopMkf, mapNum))
> ```
>
> - 不解码、不重编码 —— 存的就是原版字节,**字节级忠实**。
> - chunk 自带帧偏移表 + 每帧 (w,h) 头,**无需额外 sidecar** 描述 tile 尺寸。
> - tilemap JSON(`data/tilemap/{mapNum}.json`)去掉 `tilesetFiles[]`,加一行 `"tileset": "tileset/{mapNum}.rle"`。
>
> ### 2.2 运行时解码(无 canvas)
> ```
> fetch(blobUrl)
>   → response.body.pipeThrough(new DecompressionStream('gzip'))  // 浏览器原生解压
>   → Uint8Array(gop chunk)
>   → parseSpriteChunk(chunk)         // 现有纯函数,返回 RleFrame[]
>   → frames.forEach((f, i) => tileImages.set(i, { width:f.width, height:f.height, indices:f.pixels, opaque:f.opaque }))
> ```
> - `RleFrame{pixels,opaque}` 与 `IndexedImage{indices,opaque}` 形状一致,适配器几行。
> - **键一致性铁律**:`tileImages` 的 key = `parseSpriteChunk` 返回数组的下标 `i`(= 当前 `framesToOut` 的 `index`,同一个过滤后序列)。地图 cells 引用的就是这个下标,**不可改**,须测试钉住。
> - **下游零改动**:`draw-tilemap.ts` / `present.ts` 拿到的还是 `Map<number, IndexedImage>`。
>
> ### 2.3 改动面(锚点已核实)
> 1. **`@type-pal/shared`** 新增 tile 解码模块:把 `decodeRle`([pal-extract/src/io/rle.ts](../../../packages/pal-extract/src/io/rle.ts))+ `parseSpriteChunk` + `RleFrame` 类型([pal-extract/src/resources/sprite.ts](../../../packages/pal-extract/src/resources/sprite.ts))搬进来(纯函数 + 已有测试一并搬)。pal-extract 改为从 shared re-export(避免改动 extractor 其它调用点)。game 从 shared import(game 已依赖 shared,且不依赖 pal-extract)。
> 2. **extractor** [cli.ts:601-630](../../../packages/pal-extract/src/cli.ts#L601):写盘循环从「逐 tile `encodeIndexedPng` + `writeBinary`」改成 `writeBinary('data/tileset/{mapNum}.rle', gzipSync(gopChunk))`;删 `imageWorldTilesetPath` / `tile-{XXXX}.png` 输出;tilemap JSON 写 `tileset` 字段。
> 3. **runtime** [loader.ts:196-204](../../../packages/game/src/assets/loader.ts#L196):删 `tilesetFiles` 分支,改 §2.2 流程。
> 4. **manifest / 预缓存**:`asset-manifest.ts` 须把新 `.rle` 纳入、旧 per-tile PNG 移除(SW precache 列表随之 67k→223)。
> 5. **`Tilemap` 类型**([shared/src/resources.ts](../../../packages/shared/src/resources.ts)):`tilesetImage`→`tileset` 字段调整。
>
> ## 3. 实测数据(真实 GOP.MKF,28 map / 9199 tile,外推到 265MB)
>
> | 方案 | 外推体积 | vs 现状 |
> |---|---|---|
> | 现状 per-tile RGBA PNG | 265 MB | — |
> | atlas RGBA(v1,已否决) | 230 MB | 13.2% |
> | 原始 RLE(未压缩) | 133 MB | 49.9% |
> | **RLE + gzip(推荐)** | **51 MB** | **80.7%** |
> | RLE + brotli | 39 MB | 85.1% |
> | index+mask 平面 + gzip | 52 MB | 80.5% |
> | index+mask 平面 + brotli | 38 MB | 85.8% |
>
> > RLE+gzip 与「index+mask 平面+gzip」几乎同分(51 vs 52MB),但 **RLE 字节级忠实原版、解码器已存在已测、无需 sidecar**,故选 RLE。brotli 再省 ~12MB 但需 nginx `Content-Encoding: br`(且 SW 缓存解码后变大),作为后续可选。
>
> ## 4. 忠实性论证
> 现状链路:RLE → (extract) decodeRle → encodePNG → (runtime) 浏览器解 PNG → RGBA → 取 R/A。
> 新链路:RLE → (runtime) decodeRle → index/opaque。**新链路少一道 PNG 编解码往返,结果逐像素相同**(两者最终都出自同一个 `decodeRle`)。S5 snapshot 测试钉死。
>
> ## 5. 迁移:一刀切
> `data/extracted/` 是 gitignore 的生成物(`packages/game/public/extracted` 软链),`pnpm extract` 重生成即可,无线上旧数据兼容问题。不留 `tilesetFiles` 兼容分支。生产部署后 SW 因 `manifest.version` 变化自动失效重拉,部署说明提一句。
>
> ## 6. 执行步骤(每步独立 commit + `pnpm check` 全绿)
>
> | 步骤 | 内容 | 验证 |
> |---|---|---|
> | **S1** | shared 新增 tile 解码模块(搬 `decodeRle`+`parseSpriteChunk`+类型 + 测试),pal-extract re-export | `pnpm check` 全绿,extractor 行为不变 |
> | **S2** | extractor 改写 gzip RLE blob + tilemap `tileset` 字段 + manifest | `pnpm extract` 跑通,产出 223 个 `.rle`,无 `tile-*.png` |
> | **S3** | runtime 加「fetch→DecompressionStream→parseSpriteChunk→Map」+ 单测 | gzip roundtrip + 键一致性测试 |
> | **S4** | loader 接入,删 `tilesetFiles` 分支 | `dev` 进游戏,多场景渲染正常 |
> | **S5** | 像素一致性 snapshot | 任意 mapNum:新链路 tile 像素 == 旧链路 |
> | **S6** | 数据记录 + 文档 | `docs/resource-status.md` 记 before/after |
>
> **预估**:~1 天(比 atlas 还小 —— 无拼图 / 切片 / atlas JSON)。
>
> ## 7. 被否决的方案(留痕)
> - **atlas(每地图一张大 PNG)**:实测仅 13%。原因:GOP chunk 已是该 map 去重过的瓦片集,map 内 tile 多数彼此不同,zlib 跨 tile 无重复 pattern 可榨;强冗余在**跨地图**(第二阶段去重的事)。atlas 在 PNG 这个错误维度上折腾。
> - **type-4 灰度+alpha PNG**:pngjs 写不出(IHDR colorType 恒为 6,`.data` 强制 4 字节 RGBA)。即便能写也只 2 字节/px,被「去图片容器」碾压。
> - **WebP/AVIF lossless**:需 Node 端编码器(sharp/cwebp,当前未装);且运行时仍走 `createImageBitmap`+canvas,解码开销一分不省;压缩比也不及 RLE+brotli。被支配。
> - **真 8 位索引 PNG(type-3)**:tRNS 只能 per-调色板条目 透明,表达不了 tile 的 per-pixel RLE-skip(且 `png.ts:7` 依赖 opaque palette-0)。不适用。
>
> ## 8. 第二阶段衔接 & 后续
> - **跨地图全局去重(第二阶段 P0 §5)在本方案上叠加**:同款地板/墙/水面跨 223 个 map 重复存储,去重后 ~38MB 可能再降到 ~15-20MB。本方案的 blob 是「打包格式」,去重是「资源组织」,可逆,不挡路。
> - **同思路推广(第一阶段后续)**:animation(92MB)/ NPC(17MB)/ battle / magic 同样被包进 RGBA PNG,可用相同「去图片容器 + gzip」改造,收益面更大。优先级看需求。
>
> ## 9. 风险
> - `DecompressionStream('gzip')`:Chrome 80+/Safari 16.4+/Firefox 113+,SW 上下文可用,已全覆盖。兜底可塞 ~8KB fflate,基本不需要。
> - 键一致性(§2.2)若错位 → 全图 tile 错乱。必须有测试钉死「`parseSpriteChunk` 下标 == 旧 `tile-{index}` 编号」。
> - broken-sprite 尾帧:`parseSpriteChunk` 的 `SPRITE_DIM_MAX` guard 在运行时同样生效(同一函数),与 extract 期一致,无新风险。
>
> ## 10. 验收标准
>
> - [x] `pnpm extract` 产出 223 个 `data/tileset/{N}.rle`,无 `tile-{XXXX}.png`;tilemap JSON 含 `tileset` 字段。
> - [x] tileset 体积 265MB → **6.7MB**(实测,远超预期的 ~51MB —— 原版 GOP.MKF 全部 RLE 仅 16.4MB)。
> - [x] manifest 条目 77,624 → **10,132**;单地图请求 188–452 → 1;`createImageBitmap` 调用 → 0。
> - [x] `pnpm check` 全绿(2219 tests)。
> - [x] 像素一致性:6 个真实 mapNum(1/6/12/50/100/200,2149 tile / 103 万 px)逐字节 0 diff(snapshot 测试)。
> - [ ] 生产 SW 预缓存时间明显下降(数分钟 → 数十秒,实测)—— 待部署后验证。
>
> > 全部步骤 S1-S6 已完成(2026-06-22),commit 链:`refactor` S1 → `feat` S2 → `feat` S3 → `feat` S4 → `test` S5 → `docs` S6。
<!-- original-source-quote:end -->
