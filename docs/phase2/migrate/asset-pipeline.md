# migrate 资产管线 — UI box 首切片（design + plan）

> 状态：设计 + 计划（2026-06-28）。方向已定（作者选 A：正式启动 migrate、UI box 作首个资产迁移切片）。
> 依据：[roadmap](../roadmap.md) P0 迁移器、[D15](../decisions.md)（资产 RGBA 化）、[D18](../decisions.md)（migrate 包职责 + 阶段隔离）。

## 1. 背景

D17 菜单的 UI 黄框暴露了架构问题：reforge 直接 fetch 第一阶段的 indexed PNG（`/extracted/images/ui/frame-XX.png`，R = palette index），想自己运行时烤色——违背 de-palette 方针 + 阶段隔离。

正道（roadmap P0）：**migrate 把 indexed + palette 资产烤成 RGBA 内容工程，reforge 只吃 RGBA**。头像已先行（`scripts/bake-portraits.mts` 散装脚本）。本切片把这条管线正式收编进 migrate 包，UI box 作首个迁移资源。

## 2. 范围

- ✅ **资产迁移**（indexed + palette → RGBA）：核心 bake 函数 + 头像收编 + UI box `frame-00..08`。
- ❌ **数据迁移**（脚本 / 对话 / 数据表 → content schema 实例）：③ 阶段、schema 稳定后（roadmap），本切片不碰。
- ❌ 世界 sprite / tiles 烤色：reforge 现仍运行时 `bakeFrame`，本切片不动（后续同管线扩 RleFrame 版）。

> 资产迁移与数据 schema **正交** → 现在做不违 roadmap「schema 稳定后」的约束（那针对数据迁移）。

## 3. 地基决策（后续 sprite / tiles 复用同管线）

| # | 决策 | 理由 |
|---|---|---|
| D-a | **palette 0 = 资产标准 palette** | UI index 在 pal0 = 标准棕黄框；pal1/2 = 乱色（场景 palette，烤图验证为证）。`bake-portraits` 也用 pal0，一致。第二阶段 clean rewrite 不逐场景还原 UI 色。 |
| D-b | **pngjs 读写 PNG**（node 侧） | bake-portraits 既有路线，已是依赖。 |
| D-c | **核心 = 纯转换函数** `bakeIndexedRgba(src, palette)` | index → 真彩逐像素，无 PNG IO → 可单测。PNG 编解码留在 CLI 层。 |
| D-d | **输出 `reforge/public/`**（权宜） | 同 portraits；内容工程独立目录等**数据迁移**切片时正经建（那时「内容工程」概念才真正落地）。bake 脚本里路径集中常量，迁目录时只改一处。 |
| D-e | **reforge 零运行时烤 UI box** | 对齐头像（预烘 RGBA、`drawImage` 直接用）；撤掉 GLM 的 fetch-indexed + 运行时烤设想。 |
| D-f | **收编 `scripts/bake-portraits.mts`** 进 migrate 包 | 散装脚本归位；头像 + UI 共用核心 bake 函数。 |

## 4. 包结构 + 核心接口

```
packages/migrate/
  src/
    index.ts                  # 导出 bakeIndexedRgba
    bake-indexed-rgba.ts      # 核心纯函数
    bake-indexed-rgba.test.ts
  scripts/bake-assets.mts     # CLI:头像 + UI box(pngjs IO + 调核心 + 写 public)
  package.json                # + pngjs 依赖, script "bake"
```

```ts
/** indexed RGBA(R=G=B=palette index, A=opaque mask)→ 真彩 RGBA。无 PNG IO,纯转换,可测。 */
export function bakeIndexedRgba(
  src: Uint8Array,   // 源 RGBA, length = w*h*4
  palette: readonly (readonly [number, number, number])[],
): Uint8Array        // 真彩 RGBA, length = w*h*4(透明像素 A=0)
```

## 5. TDD Plan

- **Task 1 · 核心 `bakeIndexedRgba` + 单测**：纯函数（opaque 像素 R=index → `palette[index]`，A=0 透明保留）。测：构造 src（含不透明 index + 透明像素）+ 小 palette → 验输出 RGBA。
- **Task 2 · CLI `bake-assets.mts` + 收编**：pngjs 读源 → `bakeIndexedRgba` → pngjs 写 RGBA 到 `reforge/public/`。跑头像（chunk 1/2，收编 bake-portraits）+ UI box（`frame-00..08` → `public/ui/box/`）。删 `scripts/bake-portraits.mts`。package.json 加 pngjs + `"bake"` script。跑一次产出资产。
- **Task 3 · reforge `menu-box` 改吃 RGBA**：`loadMenuAssets` 的黄框从 `/extracted/images/ui/frame-XX.png` 改 `/ui/box/frame-XX.png`（预烘 RGBA），`drawImage` 直接用、零烤色。
- **Task 4 · 修 `drawSlicedBox` 3 bug**：
  1. **平铺**：中心 + 四边用 `createPattern` 重复填充（原版 RLEBlit 平铺），不 `drawImage` 拉伸。
  2. **阴影形状**：先把九宫格画到离屏 canvas，再以它为 alpha 源、`+6px` 偏移画半透明黑（框的镂空形状），替掉实心 `fillRect`。
  3. **不规则尺寸**：右列锚右（`x = boxRight - frame.width`）、底行锚下，各块用**自身 width/height**，不用统一 cornerW/H（frame TR=33 / R=23 / BR=31 ≠ 左列 22）。
- **Task 5 · 浏览器验收**：Esc 开菜单 → 黄框棕黄正确、四边/中心纹理不变形、阴影是框形状不是方块、右列不错位、×4 高清。截图自查。

## 6. 后续

- ~~世界 sprite / tiles RGBA 化~~ 已被 D25 否决：sprite/tiles 保持 gzip 索引 RLE，运行时按工程标准色彩
  着色，不烘 RGBA。
- 内容工程独立目录（数据迁移切片时落地，D-d 路径迁移）。
- migrate 数据迁移（脚本 / 对话 / 数据表 → content schema，③ 阶段）。

## 7. 地图数据管线现状（W7F，2026-07-14）

本文件前六节记录 UI box 首切片的历史设计。地图已经走完当时尚未落地的数据迁移边界：

- pal-extract 的 packed Tilemap 是迁移输入，不是内容工程资产；migrate 将 223 张源图转换成
  `content/maps/<map-id>.json` 的 `ProjectMapV2`，并生成 `content/maps/index.json`。
- 场景与脚本换图指令只保存稳定 map id；content、reforge、editor 不读取旧 word、mapNum 或
  `reuseOriginalMap`。
- A7-3T 后 tileset 图像保持 gzip `.rle` 索引帧资产；`content/tilesets.json` 用稳定语义 id 登记并以
  `asset: AssetId` 指向 catalog。地图不直通 AssetId/资产路径，也不把实例高度放进 tileset 元数据。
- 迁移输出使用 content 公共包的确定性行紧凑格式化器；单张地图是 MG2 原子合并单元，第二次同源
  迁移必须零写入、零删除、零冲突。

地图 schema 现行真值见 `../foundation/content-schema.md` §5 和 `../decisions.md` D26。

## 8. A7-0 音乐资产注册与物化(2026-07-15)

UI box 和地图章节记录各自历史切片；A7-0 开始补上统一的工程资产身份、所有权和闭包门禁：

- `loadPalAudioAssets` 从 `data/extracted/music/NNN.mid` 与选定 soundfont 读取源字节，生成稳定
  `music.pal.NNN` / `soundfont.default` 记录，并把真实 `bytes` 和 SHA-256 写入 `assets/index.json`。
- 二进制不进入 MG2 JSON baseline。`materializePalAudioAssets` 按 catalog 所有权原子写
  `projects/pal/assets/migrated/music/**` 与 `assets/runtime/**`，随后逐文件重读校验大小和哈希。
- `assets/index.json` 仍由 MG2 以 AssetId key 合并，但增加 catalog 专用所有权策略：
  `origin=authored` 的整条记录归作者，迁移器不能向其中拼入 migrated 字段；迁移记录只能指向
  `assets/migrated/**`，作者记录只能指向 `assets/authored/**`。
- PAL 的数字音乐引用只在迁移边界转换。最终产物使用 AssetId、`stopMusic` 和五个具名角色（含
  `audio.openingMenuMusic`）；
  `content/music.json` 不再生成。动态 `setSceneOnEnter` 根在注册前也必须剥离内部 battle 配置标记并把
  默认值烘回目标场景，避免旁路正常 finalize。
- 迁移写前运行 typed 资源引用闭包；缺 id 或 kind mismatch 阻断，未引用资源只告警。正式 `--write`
  后重新读取提取源再生成一次，第二轮必须 `writes/deletes/conflicts = 0`。

本切片结果：86 个 MIDI + 1 个 soundfont，共 6,737,214 字节；最终数据含 1,174 个 `playMusic`、
53 个 `stopMusic`、36 个场景音乐槽、81 个场景战斗音乐槽和 31 个显式 `startBattle.music` 字段，
旧字段和内部迁移标记均为 0。详见
[`a7-0-music-resource-closure-report.md`](../foundation/a7-0-music-resource-closure-report.md)。

## 9. A7-3 视频与帧动画物化(2026-07-16)

- `loadPalCutsceneAssets` 登记 6 个 `video.pal.001..006` 与 12 个
  `frame-animation.pal.000..011`。MP4 原字节物化到 `assets/migrated/videos/**`；原版 RNG 在迁移时按
  `{3:2,6:3,7:6}` 与其余标准颜色表烘焙 1,464 张完整 RGBA8 帧，再编码为 TPFS。
- TPFS v1 每 32 帧一块：块首保存完整帧，其余保存与前帧逐字节 XOR，整块以 zlib level 9 Deflate。
  全部正式产物总计 7,960,282 B（选型原型为 8,271,766 B）；作者层永远只接触完整帧，codec 可独立替换。
- 0x36/0x37 迁移为稳定 `playFrameAnimation.asset`，保留 `startFrame/endFrame/frameRate` 语义；最终
  20 条调用、9 个被引用动画、3 个未引用动画，旧 `playRng/chunkIdx/rngPaletteId` 不进入产物。
- 视频引用按运行语义分层：启动 001/002 写入 manifest 角色，入口剧情 003 写入
  `entryPoints[].introVideo`，结尾 004/005/006 写入 `quitToTitle.videos[]`；引用审计必须覆盖三类位置。
- 同一脚本位置内为插入音效/对白/等待而拆出的多个帧动画区段仍是一个作者引用位置，审计输出保留真实调用次数。
- catalog 仍以 AssetId 为 MG2 合并键。`origin=authored` 的视频/帧动画整条记录和二进制归作者，重迁不能
  覆盖；迁移器二次 dry-run 必须 `writes=0 deletes=0 conflicts=0`。
- Reforge 与 editor 只经 `AssetResolver/FileSource` 读取工程文件，不允许 `/extracted/videos`、
  `/extracted/data/animation` 或数字补零路径 fallback。
- `packages/game` 是第一阶段忠实还原参考引擎，其 trademark fallback 仍可消费原版 chunk 6；第二阶段
  Reforge 不继承该 bootstrap。chunk 6 已作为 `frame-animation.pal.006` 物化，未来若恢复商标流程只能引用
  该 AssetId。

实现与验证见
[`A7-3-cutscene-asset-workbench.md`](../../ops/tasks/A7-3-cutscene-asset-workbench.md)。

## 10. A7-2 静态图与 engine chrome 物化（2026-07-18）

前六节的 `public/ui`、`data/baked` 与双根 bake 描述是早期切片的历史记录，不再是现行输出契约。
现行管线明确分为两种所有权：

1. **工程内容静态图**由 `migrate:content` 从提取源和标准色表生成，登记到 `assets/index.json`，再物化到
   `projects/pal/assets/migrated/**`。PAL 的冻结结果为：portrait 88 / 768,841 B，face 6 / 10,392 B，
   item-icon 233 / 262,667 B，battle-background 52 / 4,422,281 B；合计 379 条记录、5,464,181 B、
   2,656 条引用、4 条未引用 warning、0 missing、0 kind mismatch。
2. **引擎默认 chrome**由 `pnpm --filter @type-pal/migrate run bake` 确定性重建到
   `packages/reforge/src/engine-chrome/assets/**`：85 个 UI PNG / 48,629 B，另含默认标题、对话光标、
   Unifont 许可与来源记录。它由 bundler 产 URL，不写入任何工程 catalog。

PAL 工程资源的正确物化命令是：

```bash
pnpm --filter @type-pal/migrate run migrate:content -- --write
pnpm --filter @type-pal/migrate run migrate:content # 可选 dry-run，期望 0/0/0
```

`data/baked` 已退役；`bake` 不是修复工程资源 404 的命令。当前 `data/extracted` 仍作为迁移输入；A7-3T
让 tileset 退出 runtime legacy，随后 A7-3W 已完成 sprite，A7-3B 实现候选已完成 battle-sprite。
现只为 `effect-sprite` 与 generic `image` 提供过渡源。任一单族切片都不等于 A7/R7 总体完成。

## 11. A7-3T 瓦片集索引资源物化（2026-07-19，done）

瓦片集不走 RGBA bake。现行四层固定为：

```text
用户本地原始数据
  -> pal-extract 的 extracted gzip indexed RLE（迁移输入）
  -> migrate 确定性登记/逐字节物化
  -> 工程 assets/migrated/tilesets/** + assets/index.json
```

- 权威源集合是 `mapNum 1..225 \ {168,171}`，共 223 个文件；迁移生成
  `tileset-xxx -> tileset.pal.xxx` 显式映射，不能用 ordinal 补缺口。冻结总量为 **6,501,041 B** 与
  **67,715** 个严格有效帧。
- `AssetRecord.bytes/sha256` 描述工程路径实际保存的 gzip 字节。物化逐文件校验源/目标大小、完整 SHA、gzip
  头与严格 RLE 结构；`origin=authored` 的同 AssetId 由 MG2 保护，不被重迁覆盖。
- runtime/editor 只按 `TilesetDef.asset -> AssetResolver/FileSource` 读取。extracted tileset 是迁移输入，
  不再是 PAL、demo、e2e-own 或空白工程的运行时后备目录。
- HTTP/FSA/Save As/ZIP 禁止按 `.rle` 后缀解压或重编码；服务端不得设置 `Content-Encoding`，并声明
  `no-transform`。旧本地 clone 的裸 RLE 只在一次性升级边界解码、重新 gzip 后登记。
- 正式 `--write` 后的最终 dry-run 为 `writes=0 deletes=0 conflicts=0`，报告为
  `tilesets=223 bytes=6501041 frames=67715`。

完整生命周期与 review 门禁见
[`A7-3T 任务卡`](../../ops/tasks/A7-3T-tileset-asset-closure.md)。

## 12. A7-3W 大世界精灵索引资源物化（2026-07-19，done）

大世界精灵沿用 indexed RLE，不转 RGBA、不重编码 PAL 源：

```text
用户本地 PAL 提取源 sprite/1..636.rle
  -> tuple/结构门禁
  -> sprite.pal.NNN catalog record
  -> projects/pal/assets/migrated/sprites/NNN.rle（逐字节物化）
```

- tuple 行固定为 `number + NUL + compressedBytes + NUL + sha256`，按 1..636 数字顺序、行间 LF、末尾无
  LF；冻结 digest 为 `c92c14b5dac5abc39006d94fdefaa699eb0bffddb925447ceb4070c32bb45d03`。
- 写前同时冻结 636 文件 / 1,332,725 B / 4,133 帧 / 30 个 legacy 坏尾、580 defs / 559 used /
  21 shared / 77 unused，以及 s102 followers `[]`、`["sprite-82"]`。任一集合漂移都先审计，不能直接写盘。
- 物化逐文件校验 id、path、kind、mediaType、origin、bytes、SHA、gzip 头和源/目标字节；非 authored 记录的
  origin 也参与零写入判定。全部 636 文件写入临时工程后必须 byte-exact，第二次物化 `written=0`。
- `legacy-migrated` parser 只容忍连续有效前缀后的不可解尾槽；606 个 canonical 源与 30 个异常源均与宽松
  真值逐帧对比。author/generated 使用 canonical profile，不能借 PAL 兼容吞掉损坏。
- MG2 先完成 JSON 冲突计划与全部字节预检，再物化二进制并提交 catalog/content/manifest。已有 authored
  同 AssetId 是明确作者接管：作者记录与字节获胜，迁移源不覆盖；二次运行必须零计划。
- `projects/pal/assets/migrated/**` 属受保护原版字节，继续由 `.gitignore` 排除；工程在本地物化后是运行时
  自包含，仓库只提交确定性生成器、catalog/内容结果与门禁，不分发原版二进制副本。

本轮唯一一次正式写入后，物化统计为 `writes=636 unchanged=1071`，事务随后报告二次迁移
`writes=0 deletes=0 conflicts=0`；再次 dry-run 仍严格为 0/0/0。

## 13. A7-3B 战斗精灵索引资源物化（2026-07-21，done）

PAL 的 `F.MKF` 玩家/召唤通道与 `ABC.MKF` 敌人通道按独立稳定身份物化，不能因数字重叠合并：

```text
F.MKF 0..18   -> battle-sprite.pal.player.NNN
ABC.MKF 1..153 -> battle-sprite.pal.enemy.NNN
                 -> assets/migrated/battle-sprites/{player|enemy}/NNN.rle
```

- 冻结 19 player + 153 enemy = **172 files / 900,973 gzip B / 2,313,598 raw B / 775 有效帧**；
  19 player 与 147 enemy 通过 canonical strict，6 个 enemy 只在 `legacy-migrated` 的连续前缀坏尾规则下通过。
  combined tuple digest 为 `ecbec106c6540de74adeec799bad19a22e7198272245c98b130522b0ac37a685`。
- 迁移器生成 **172 catalog records + 171 BattleSpriteDef**。enemy 98 保留为唯一未引用物理资源；
  直接语义引用精确为 **179 occurrences / 171 used / 5 shared / 1 unused**。最终 PAL catalog 为
  **1,879 records / 68,439,367 B**。
- 上游翻译把 7 条装备 row 1、3 条剧情 appearance、1 条 trance 和 9 条 summon 全部改成定义 id；
  player 0 是合法李逍遥精灵，summon 的 godId 0..8 确定性映射 player 10..18，不能套“0 表示缺席”的 helper。
- 旧 `battle-effect-index` 的 10×2 表在迁移期物化为 player-fighter profile 的 effect base，运行时不再按
  `spriteNum * 2` 查表。物理 effect-sprite 本身仍归 A7-3E。
- 写盘沿用 MG2：完整 JSON 冲突计划与所有源/目标字节预检 -> battle binary -> union catalog ->
  battle-sprites/content/scripts -> manifest -> final catalog -> legacy removals。author-owned 同 AssetId/路径
  接管不被迁移覆盖；二次迁移为 `writes=0 deletes=0 conflicts=0`。
- PAL 原版 battle RLE 与 world sprite 一样由本地提取源确定性重建，`projects/pal/assets/migrated/**` 不入 git；
  demo/e2e-own 使用提交的 generated placeholder，避免暗借 PAL player 0。

实现后 manifest 只剩 `effect-sprite/image` 两个 legacy family。C2-ACT 已把工程升级到
`contentVersion 4`（精灵预制动作语义）；N3-1 canonical P7 与 R13-1 cadence/save epoch 随后占用
contentVersion 5/6。全 legacy 归零、升级 `contentVersion 7` 和总闭包门禁仍属于 A7-4；
实现与审查证据见
[`A7-3B 任务卡`](../../ops/tasks/A7-3B-battle-sprite-asset-closure.md)。

## 14. R13-2 / R13-3 历史版本轴更新（2026-07-29）

R13-2 与 R13-3 后续分别占用 content 7、content 8；截至 2026-07-29，当时组合为
content 8 / SAVE 7 / minimum 7。A7-3B 完成时记录的“A7-4 计划 v7”以及随后记录的候选
v10 都只代表当时计划，current 口径见下一节。

## 15. R13-4 / R13-5 当前版本轴更新（2026-07-31）

R13-4 与 R13-5 分别占用 content 9、content 10；当前组合为 content 10 / SAVE 8 /
minimum 8。R13-5 只收紧敌人脚本和 battle context，未改变世界存档形状；SAVE8/content9
只做无 sidecar 的 identity normalization。A7-4 当前顺延为候选 v11，版本尚未冻结。
