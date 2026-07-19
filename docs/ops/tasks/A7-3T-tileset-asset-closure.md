# A7-3T - 瓦片集索引资源闭包

Status: review
Phase: phase2
Capability: A7 / R3 / R7 / A4
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + Kimi
Unavailable Agents: none
Branch: main

## 目标

把 PAL、仓库示例工程和作者工程的瓦片集从 `TilesetDef.path + manifest.assets.legacy +
LegacyAssetAdapter` 双轨收敛为工程内 catalog 资源：地图和图章继续按稳定 `tilesetId` 引用瓦片集语义定义，
`TilesetDef.asset` 是该定义唯一的二进制 AssetId；运行时、编辑器预览、导入替换、保存重开和克隆只经
`AssetResolver/FileSource` 读取当前工程文件。瓦片继续使用 D25 已拍板的 gzip 索引 RLE，不烘 RGBA，
不向创作者暴露颜色表。

## 范围

- 范围内:
  - `TilesetDef` 明确分层：`{ id, name, category, asset }`；`id` 是地图/图章引用的瓦片集语义身份，
    `asset: AssetId` 是唯一二进制引用，删除 `path`。
  - `ProjectMap.tilesetId -> TilesetDef.id -> TilesetDef.asset ->
    assets/index.json[asset](kind=tileset) -> project-relative path -> AssetResolver -> FileSource ->
    indexed RLE bytes` 单链。语义对象与二进制各有稳定身份，不构成两个加载真值。
  - PAL 真实 `mapNum` 集合 `1..225 \ {168,171}` 的 223 个瓦片集确定性登记和项目内物化；gzip 源字节
    6,501,041 B、严格有效帧 67,715；禁止按连续 `1..223` ordinal 枚举。
  - PAL、demo、e2e-own、空白工程种子以及旧本地 contentVersion 3 工程的升级与回归。
  - 作者瓦片集导入、改名、替换、引用检查、删除、undo/redo、pending blob、保存重开和预览。
  - 该族退出 `manifest.assets.legacy.families`，删除 tileset 专用 root/path fallback；旧形态只允许在
    本地打开升级边界被识别一次。
  - catalog `.rle` 在 HTTP 克隆/FSA/保存/另存/ZIP 中逐字节复制，禁止沿用 legacy 克隆的静默解 gzip；
    `AssetRecord.bytes/sha256` 必须描述工程路径实际保存的 gzip 字节。legacy extracted 清单不得再重复复制
    已闭环 tileset。
  - 修复 catalog 化会立即触发的通用保存硬冲突：二进制增量签名不能只比较长度；新二进制先校验/写入，
    catalog 后写，manifest 最后提交。范围只覆盖本族闭环必需的公共原语，不冒领 A7-4 的总门禁。
  - MG2 作者接管、迁移器双跑零计划、断开 `/extracted/data/tileset` 后 HTTP/FSA/编辑器/引擎验证。
- 范围外:
  - 大世界 `sprite`、`battle-sprite`、`effect-sprite`；分别由后续 A7-3W/B/E 卡闭环。
  - generic `image`；它不是当前 AssetKind，归 X3 的 `showImage/scrollImage/ending` 内容模型，不在本卡
    创建假资源 kind 或批量登记不可达 FBP。
  - A7-4 的 contentVersion 4、删除整个 LegacyAssetAdapter、所有剩余 family 的 catalog-only clone/另存/ZIP
    总门禁；但本卡不能把已登记 tileset 交给会改字节或漏写同长度替换的旧通路。
  - 瓦片像素编辑器、自动地形、tileset 预置图章、地图高度/图层/图章交互的新能力。
- 明确不做:
  - 不把 RLE 烘成 RGBA，不把 `paletteId`、颜色表编号或调色盘选择器带回 schema/UI。
  - 不保留 `path | asset`、catalog miss 后回落数字/目录、map/stamp 直接存 AssetId，或
    `TilesetDef.asset` 之外的第二条二进制引用。
  - 不用 `tilesetId`、TilesetDef.id、AssetId 或文件名反推出物理路径；路径只来自 AssetRecord。
  - 不直接手改 `projects/pal` 作为修复；所有 PAL 产物必须由迁移器确定性生成。
  - 不让迁移器覆盖 `origin=authored` 的同 AssetId 记录或二进制。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：schema、migration、asset pipeline、跨包公共接口和 capability-map 变化必须三签；迁移
    问题先修上游，`projects/pal` 只允许由迁移器生成。
  - `docs/phase2/READ-FIRST.md`：架构优先、稳定 id、不得用数字/路径当身份；编辑器与运行时不得维持
    原版目录约定作为第二解释器。
  - `docs/phase2/decisions.md:332-372`（D25）：瓦片/精灵保持 gzip 索引数据并在运行时着色；不能烘死
    场景色彩，创作者不接触颜色表。
  - `docs/phase2/foundation/content-schema.md:324-330`：地图只存稳定 tileset id；高度属于地图实例；上传
    PNG 在导入边界量化后编码为 RLE。
  - `docs/phase2/foundation/a7-resource-closure-audit.md:323-465`：同一资源族不得长期保留 catalog 与
    数字/目录两套解析；每迁一族同时删除其旧字段和 fallback。
- 代码锚点(`file:line`):
  - `packages/content/src/tileset.ts:1-52`：当前 `{id,name,category,path}` 与 `id -> path` 解析器。
  - `packages/content/src/asset.ts:11-26,200-245,339-510`：`tileset` kind、legacy family、catalog/legacy
    互斥和 typed reference walker。
  - `packages/migrate/src/pal-migration.ts:176-201`：PAL 223 条 tileset 定义由 mapNum 和 legacy path 生成。
  - `packages/pal-extract/src/cli.ts:90-110,660-684`：提取器把 GOP chunk 以 gzip RLE 写入
    `data/extracted/data/tileset/*.rle`。
  - `packages/reforge/src/assets.ts:72-90`：当前 path 分支、legacy root 拼接、gzip 解码。
  - `packages/reforge/src/scene-map.ts:11-22`：map -> tileset registry -> path 的当前链。
  - `packages/reforge/src/loader.ts:221-265`：LegacyAssetAdapter/AssetBase 的 root 与 tilesets 注入。
  - `packages/editor/src/ui/TilesetTab.tsx:303-315,800-827`：当前上传写 `assets/tilesets/<id>.rle`，预览
    走内存 `tilesetBlobs` 或 path loader。
  - `packages/editor/src/core/commands.ts:1076-1151`：瓦片集定义与二进制的旧专用命令。
  - `packages/editor/src/core/edit-session.ts:37-49`、`project-io.ts:159-197`：`tilesetBlobs` 与通用
    `assetBlobs` 两套 pending binary store。
  - `packages/editor/src/core/editor-asset-reader.ts:18-66`：现成的 catalog + pending blob 单一读取器。
  - `packages/editor/src/core/open-local.ts:24-58`、`upgrade-local-v3-images.ts:268-360`：本地 v3 一次性、
    先预检后写盘、manifest 最后提交的升级模式。
  - `packages/editor/src/core/seed.ts:69-158,190-235`：空白工程仍把 tileset 放在 legacy；PAL clone 当前
    无过滤复制整个 extracted manifest。
  - `packages/editor/src/core/clone.ts:22-68`：legacy `.rle` 克隆会解 gzip 后落盘；catalog 资源不能沿用。
- 已知数据基线:
  - PAL 的权威集合来自 `data/extracted/data/tilemap/*.json` 的真实 `mapNum`：`1..225` 且仅缺
    `168/171`，共 223 个；tileset 定义、map 引用、AssetId 和文件名必须使用同一集合。
  - build 前 PAL `content/tilesets.json` 为 223 条 legacy path 定义；`content/maps/index.json` 为
    223 张地图、223 个唯一 tilesetId。
  - `data/extracted/data/tileset/*.rle` 为 223 个 gzip 文件，源字节合计 6,501,041 B，严格有效帧
    合计 67,715。每个 PAL GOP 容器有且仅有一个末尾 `0` offset sentinel；作者编码器无 sentinel 的
    容器也合法。
  - build 前 PAL catalog 为 848 records / 0 tileset；review 产物为 1,071 records /
    223 tileset records，定义、record 和 map refs 均为 223。
  - build 前 PAL 工程目录没有 tileset `.rle`，HTTP 完全依赖 extracted；review 产物已物化
    `projects/pal/assets/migrated/tilesets/*.rle` 223 个（受保护字节按仓库策略不纳入提交）。
  - demo/e2e-own/blank 原有 tileset 与标准颜色表 legacy fixture。本轮分别登记 tileset 和
    `color.project-standard`，绑定 `visual.standardColorTable`；demo 使用 migrated 来源，
    e2e-own/blank 使用 generated 来源，三者只保留 sprite legacy。
- 已知坑 / 审计文档:
  - `docs/phase2/foundation/a7-resource-closure-audit.md`：catalog、resolver、文件闭包、MG2 与 A7-4 总闸。
  - `docs/phase2/migrate/asset-pipeline.md:149-150`：`data/baked` 已退役；当前 extracted 只是迁移输入。
  - 当前 clone 的 `.rle` 解 gzip workaround 会改变字节；一旦 catalog 记录 bytes/hash 就会产生确定性
    mismatch。catalog 路径必须保持逐字节复制；若 Chrome 安全扫描仍拦截，必须停在 draft/build 并设计
    不改变资产字节的传输方案，不得篡改 catalog 或关闭 hash 校验。
  - 当前保存快照把二进制只记为 `bin:<byteLength>`；同路径、同长度、不同像素的替换会漏写 blob，却先写入
    新 catalog hash，制造确定性坏工程。本卡必须把二进制签名纳入 hash，并冻结二进制/catalog/manifest
    的提交顺序。
  - 旧本地 clone 中 `.rle` 可能已经是“无 gzip 头的裸 sprite chunk”；升级边界必须解码校验后规范化为
    canonical gzip，再计算新记录 hash，不能把历史 workaround 当新规范。
  - tileset **定义**可被地图和图章引用，tileset **二进制资产**可被一个或多个定义引用；两层引用必须分别
    检查，不能因删一个定义误删共享 catalog record/文件。
  - `TilesetDef.name` 是瓦片集工作台唯一的作者可编辑名称；`AssetRecord.label` 只允许作为资源页诊断标签，
    不得在同一界面伪装成第二个瓦片集名称，也不得由 label 反向覆盖领域名称。
  - 预览目前有三套 `tilesetBlobs[path] -> disk path` 手工分支；替换后若缓存只依赖稳定 id 而不依赖
    `AssetRecord.sha256`，工作台、地图和图章会继续显示旧像素。
- 不得重新引入:
  - `TilesetDef.path`、`legacy.tilesets`、`AssetBase.tilesets`、`loadTilesetByPath`、`assets/tilesets/<id>`
    作为新导入规范、`tilesetBlobs` 的 tileset 消费、map/stamp 直接越过定义表引用二进制 AssetId。
  - `paletteId`、按地图号拼 `tileset/<n>.rle`、catalog 404 后回退 legacy。
  - map 实例高度写进 tileset 元数据，或把 lower/upper 子格误作普通图层。
- 相关测试:
  - `packages/content/src/asset.test.ts`、`tileset.test.ts`、`project-map.test.ts`：catalog/引用/schema 基线。
  - `packages/reforge/src/assets.test.ts`、`scene-map.test.ts`、`loader.test.ts`：加载链与 legacy 基线。
  - `packages/editor/src/core/commands.test.ts`、`project-io.test.ts`、`open-local.test.ts`、`clone.test.ts`、
    `seed.test.ts`：编辑、升级、保存、克隆和种子。
  - `packages/editor/src/ui/TilesetTab.test.tsx`、`StampPreviewCanvas.test.tsx`：工作台与图章预览。
  - `packages/migrate/src/pal-migration-integration.test.ts`、`pal-assets.test.ts`、`migration-plan.test.ts`：
    PAL 物化、闭包、MG2 和双跑零计划。

## 验收条件

- 功能:
  - Canonical `TilesetDef` 精确为 `{ id, name, category, asset }`，不再含 `path`；`id` 在定义表内唯一，
    `asset` 必须存在于 catalog 且 kind 为 `tileset`。旧 path 只在一次性升级输入中出现。
  - PAL catalog 精确新增 223 个 tileset record；每条 path 位于 `assets/migrated/tilesets/**`，bytes/hash
    与实际工程文件逐项匹配，mediaType 为 `application/vnd.type-pal.rle`，origin 为 `legacy-migrated`，
    无 missing/kind mismatch。
  - PAL 定义继续保留既有 `tileset-001` 等语义 id，新增确定性 `tileset.pal.001` 等 AssetId；223 张地图的
    `tilesetId` 无需改写，全部经定义的 `asset` 解析到 catalog；没有 path 推导、数字补零或 legacy fallback。
  - runtime、地图编辑器、瓦片库、图章预览和试玩都经 AssetResolver/EditorAssetReader 按 AssetId 读取。
  - 新导入 tileset 同时创建稳定语义 id 与稳定 AssetId，使用 `origin=authored`、内容哈希路径
    `assets/authored/tilesets/**.rle` 和 `assetBlobs`；替换保持两种 id，改名只改 `TilesetDef.name`。
  - 若多个定义共享同一 AssetId，替换前必须显示完整影响范围并明确更新共享资产；不得静默只刷新当前定义。
    删除定义前完整扫描地图与图章引用；仅当无其它 `TilesetDef.asset` 引用时才允许连带删除 catalog record/
    文件；undo/redo 可恢复定义、record 和 bytes。
  - 替换为更少帧时，若任一地图或组合引用的最大 `tileId` 越界，必须 fail-closed，列出可跳转引用者，
    不得以“AssetId 未变”为由提交破图替换。
  - PAL/demo/e2e-own/空白工程的 canonical 工作态均不含 tileset legacy family、`legacy.tilesets` 或
    `TilesetDef.path`；其它尚未迁 legacy family 保持原样。
  - 旧本地 v3 工程支持 legacy-root gzip、历史 clone 裸 RLE、工程自有 path 三种输入；完整预检、解码、
    规范化、hash、冲突检查成功后才写二进制/catalog/tilesets，manifest 最后提交；写前失败零写入，
    close 中断只留可重试的单调前滚态，新增不得发布“新定义 + 旧 catalog”，删除不得
    发布“旧定义 + 已收缩 catalog”。
  - MG2 同 AssetId authored 接管后重迁不覆盖；迁移连续第二次 `writes=0 deletes=0 conflicts=0`。
  - catalog `.rle` 在 clone/另存/保存/ZIP 中逐字节保持；克隆结果全 catalog hash/bytes 一致，不重复携带
    `assets/extracted/data/tileset/**`。`FileSource.readBytes()` 返回值就是 record 所描述的 gzip 字节，
    传输层不得按扩展名或 HTTP Content-Encoding 改码。
  - 二进制增量快照至少等价于 `bin:<bytes>:<sha256>`；同路径同长度不同内容的二次保存必须写 blob。
    全部 pending bytes 在写盘前与 catalog 预验，固定按二进制 → old/new 并集 catalog → 内容 JSON →
    manifest（最后引用表）→ 目标 catalog 收缩（如有删除）→ 旧文件清理。
- 测试:
  - schema/guard：缺 catalog、kind mismatch、重复定义 id、空/坏 AssetId、旧 path、`path + asset`、
    map/stamp 悬空定义、catalog+legacy 同族全部 fail-loud；合法 metadata round-trip 稳定。
  - RLE：gzip 与旧裸输入均能在升级边界解析；空帧、坏 offset、损坏 gzip、非 sprite chunk 拒绝；canonical
    输出带 gzip 头且保存重开帧逐像素一致。
  - PAL 数据门禁：223 definitions / 223 records / 223 map refs；mapNum 集合精确为
    `1..225 \ {168,171}`；6,501,041 source gzip bytes / 67,715 严格有效帧；逐文件 hash、大小、
    gzip header 与跨缺口样本 `167 -> 169 -> 170 -> 172`、尾部 `223/224/225` 一致。
  - typed walker 从 `TilesetDef.asset` 收集 expected kind；闭包诊断、两层受引用删除、共享资产不误删、
    导入/替换/删除各自 undo/redo、pending blob、保存重开有专测。
  - 本地升级覆盖三类输入、id/kind/path/origin collision、共享源路径、孤儿
    `legacy.tilesets`、缺文件、坏 RLE、catalog/content/manifest close 中断及重试、二次打开零写入。
  - HTTP clone、FSA、Save As 与 ZIP 解包证明 catalog gzip 字节未被 transport 改写；覆盖 gzip header、篡改
    1 byte、截断、canonical 裸 RLE、错误 `Content-Encoding`、同长度替换；Chrome Safe Browsing 实测记录。
  - 替换缓存专项：相同帧数、相同文件长度但不同像素时，瓦片工作台、地图、图章预览均按 record sha 刷新；
    更少帧且仍被引用时阻断并可跳转。
  - `rg` 静态扫描目标包：`TilesetDef.path`、`loadTilesetByPath`、tileset legacy/root fallback、
    `assets/tilesets/` 新写入和 tileset 对 `tilesetBlobs` 的消费归零（历史升级拒绝 fixture 可白名单）。
  - content/reforge/editor/migrate 定向测试、四包 typecheck、editor/reforge production build、Biome、
    `git diff --check` 全绿；全量 `pnpm check` 若被现有未提交工作阻塞，须精确记录非本卡失败。
- 文档:
  - 更新 content schema、A7 闭包审计、asset pipeline、project lifecycle、roadmap/capability-map 的实际状态。
  - 明确 `source/raw -> extracted indexed RLE -> project-owned catalog RLE` 四层，禁止把 catalog 化写成 RGBA
    bake；把 generic image 从“四个真实 RLE 族”中分离，X3 欠账不被 A7-3T 冒领。
  - 记录 PAL 223 条 `tileset-xxx -> tileset.pal.xxx` 映射、总字节、hash/codec 契约、clone transport
    结论与 MG2 结果。
- 视觉 / 手工验证:
  - 编辑器瓦片集页：PAL、demo、e2e-own 与新导入项目均能预览、改名、替换、删除检查；共享资产影响范围、
    缩帧阻断、长名称/错误态无退化。
  - 地图画布、tileset palette、图章库/ghost 在切换瓦片集、保存重开后显示一致。
  - Reforge 代表性户外/室内地图启动正常，场景颜色变化仍由标准颜色表运行时着色，无烘色退化。
  - 临时改名 `data/extracted/data/tileset` 后，PAL HTTP seed、克隆出的 FSA 工程和 Reforge 仍能完成上述流程。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-19）**。只读普查确认四个真实剩余族中 tileset 最接近垂直闭环：已有稳定
  tileset id、地图/图章引用扫描、作者导入和 RLE decoder，但仍被 `path`、legacy root、专用 pending blob
  与 clone 解压 workaround 切成双轨。压力测试后建议保留 `TilesetDef.id/name/category` 作为领域真值，新增
  唯一 `asset: AssetId` 二进制引用；物理路径只在 catalog。保持 gzip indexed RLE；PAL 223 条一次迁完并
  同期完成本地升级、编辑器生命周期、MG2、clone/save byte-exact 和 transport hash 门禁。方案可实现；
  build 必须等待 Kimi/GLM 独立签字。
- Kimi: **agree（2026-07-19;附 R1-R3 build 必落钉,见「主审立场」）**。四问逐项核对并抽查代码/数据:
  分层优于 id 兼任(共享二进制可表达、名称域分离、删除语义分层、与 W7G placement/stamp 先例一致);
  共享资产两层引用检查与缩帧阻断成立;canonical gzip + 逐字节 transport + `bin:<bytes>:<sha256>`
  (长度签名 bug 实证 project-io.ts:237/:310);升级边界与 A7-4 分界诚实;`generated` 来源档已存在
  (asset.ts:71)非新概念;PAL 223/223/223 基线抽点一致。无架构 counter。
- GLM: **agree（2026-07-19;附 G1-G4 build 必落,见下）**。独立复算全部基线 + 代码逻辑审查（读源码逐路径推演 tileset.ts/asset.ts/pal-migration.ts/clone.ts/project-io.ts）。

  **基线独立复算** ✅：
  - tilesets.json **223 definitions** / 223 unique ids / 223 unique paths（`tileset-001`..`tileset-223` / `tileset/1.rle`..`tileset/223.rle`）✅
  - RLE files **223** / **6,501,041 B** ✅ 精确匹配
  - **223 maps** 全引用有效 tilesetId（map 文件内部 `tilesetId` 全是 `tileset-001`..`tileset-223` 子集，零悬空）✅
  - catalog **848** / tileset records **0** ✅
  - tileset 在 legacy families ✅
  - stamps.json **0** stamps（空表，非闭包问题）✅
  - 预期终态 catalog 848+223 = **1,071** ✅

  **代码逻辑审查** ✅：
  - **TilesetDef**（tileset.ts:6-14）：当前 `{id,name,category,path}` 无 `asset`；validateTilesets（:21-44）逐字段重建返回 `{id,name,category,path}` 丢弃未知——新增 `asset` 须同步改 allowlist。resolveTilesetPath（:47-51）直接返回 `t.path`。✅ 缺口确认。
  - **walker**（asset.ts:472-664）：**无 tileset 槽、无 tileset 分支**——AssetReferenceSource 须增加 `tilesets?: readonly TilesetDef[]`。`ASSET_KINDS`（:16-26）已含 `'tileset'`。✅ 缺口确认。
  - **pal-migration.ts:184-201**：1 tileset/map、path-only 生成——须加 `asset: palTilesetAssetId(mapNum)`（当前 `palTilesetAssetId` 全仓零命中，须新建）+ 路由 223 records 进 assetCatalog。✅
  - **clone.ts:28-33**：`.rle` 被 `decompressGzip` 后落盘（裸 RLE 无 gzip 头）——catalog 若记 gzip bytes/sha 会产生确定性 mismatch。**这是关键设计决策点。** ✅ 已识别。
  - **project-io.ts:237**：binary snapshot 只记 `bin:<byteLength>` 无 hash——同长度不同内容替换会静默漏写。**确定性 bug，A7-3T 必须修。** ✅ 已识别。

  **G1-G4 build 必落（非阻塞，纳入 build 范围）**：
  - **G1（关键）**：**clone gzip 决策须显式钉死**——两种一致选项：(a) catalog 记**解压后裸 RLE** bytes/sha，clone 保持解压落盘；或 (b) catalog 记 **gzip** bytes/sha，clone 停止解压 `.rle`（但 Chrome Safe Browsing 可能拦截）。Codex 需在 build 前选定并写明。卡内 §4-5 已指出此风险但未选定口径。
  - **G2（确定性 bug）**：project-io.ts binary snapshot 须从 `bin:<byteLength>` 升级为 `bin:<bytes>:<sha8>`（至少前 8 字符 sha256）——同长度不同内容替换必须触发写入。卡内 §8/§106/验收 §155 已提此风险，须有专测。
  - **G3**：walker 扩展后 `AssetReferenceSource` 增加 `tilesets` 槽——确认 `collectAssetReferences` 遍历每个 `TilesetDef.asset` 收集 `{asset, expectedKind:'tileset', where:'tilesets[N].asset', site}`；map `tilesetId`→`TilesetDef`→`asset` 间接引用是否也需穿透（当前 walker 不接 maps）。
  - **G4**：`palTilesetAssetId(n)` 构造器须确定性格式（如 `tileset.pal.${String(n).padStart(3,'0')}`），与 `tilesetIdFromSourceNumber(n)`（→`tileset-001`）一一映射且不可逆推导路径。

  **总结**：基线 223/223/223/6,501,041B 全独立冻结；map→tileset→path 引用链零悬空；schema/walker/migration 三处缺口定位；clone gzip 解压 workaround + 同长度替换 bug 两项确定性风险识别（G1/G2）。**agree。**

- counter / 分歧处理: Codex 内部「`TilesetDef.id` 直接兼任 AssetId」的更小建议已被 Codex 自己放弃并改分层;
  Kimi 审后同意分层,无 counter;GLM G1 的 clone gzip 口径已由 Kimi 在主审立场裁定为 (b)
  catalog=gzip bytes/clone 停止解压,Safe Browsing 走 transport 方案。当前无未决分歧。
- 缺签豁免: N/A
- build 准入结论: **allowed（Codex agree + Kimi agree + GLM agree,三签齐,2026-07-19）**;
  已由 Codex 翻转 draft→build 并同步看板;R1-R3 与 G1-G4 纳入 build 范围。
- build 数据纠正（Codex，2026-07-19）：GLM 设计签字和早期交接日志把 223 条误写成连续
  `tileset-001..223 / tileset/1.rle..223.rle`。权威集合应为 `1..225` 且仅缺 `168/171`；223 个 GOP
  末尾各有一个零 offset sentinel，严格有效帧总数为 67,715。该纠正不改变已签的分层/catalog/gzip
  架构结论，但 Kimi/GLM 在 done 审查中必须按纠正后的集合和帧数重新独立核验。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-19）**。实现与自验证证据见 Build、视觉验证记录；任务仅推进到 review。
- Kimi: pending
- GLM: **accept（2026-07-19;见下）**。独立复算全部产物数字 + 逐文件 SHA 验证 + 代码逻辑审查。

  **产物独立复算** ✅：
  - catalog **1,071** entries / **223 tileset records** / **6,501,041B** ✅
  - tileset id range 1..225 缺 [168,171] = 223 ✅
  - **全 223 文件 SHA256+bytes 逐项匹配**（not sampled—全量核验 ok=223 fail=0）✅
  - mediaType 统一 `application/vnd.type-pal.rle` / origin `legacy-migrated` ✅
  - **223 TilesetDef** 全有 `asset` 字段、零 `path` ✅
  - **223 map tilesetId refs** 全有效零悬空 ✅
  - MG2 dry-run `tilesets=223 bytes=6501041 frames=67715` + `writes=0 deletes=0 conflicts=0` ✅

  **代码逻辑审查** ✅：
  - TilesetDef（tileset.ts:8-16）= `{id,name,category,asset:AssetId}` 无 path；validateTilesets（:37）拒绝 path + 要求非空 asset + 有 catalog 时交叉校验 kind=tileset（:42-47）；resolveTilesetAsset（:58-62）返回 t.asset ✅
  - palTilesetAssetId（asset.ts:327）→ `tileset.pal.NNN` 确定性格式 ✅
  - loadTilesetByPath 全仓零命中（退役）✅
  - legacy.tilesets 零命中（退役）✅
  - tilesetBlobs 历史名称现为通用 pending blob（commands.ts:2675-2676），tileset 不消费 ✅

  **Legacy/status** ✅：tileset 退出 families（保留 sprite/battle-sprite/effect-sprite/image）；capability-map A7/R7 未提前标 done；task Status=review 非 done ✅

  **测试** ✅：content 241 / reforge 431 / editor 462 全 pass；migrate 222 pass + 1 fail（engine-chrome OFL hash drift = A7-2 scope 非本卡）+ 1 skip ✅

  **总结**：223/223/223/6,501,041B/67,715 frames 全独立冻结；全 223 文件 SHA 零 mismatch；MG2 零计划；schema `{id,name,category,asset}` 无 path 退役彻底；tileset 退出 legacy；静态归零；A7/R7 未提前 done。**accept**。

- counter / 返工处理: N/A（migrate 1 fail 是 A7-2 engine-chrome scope 非本卡）
- 缺签豁免: N/A
- done 准入结论: **Codex accept + GLM accept；等待 Kimi 独立 accept，三签未齐不得 done**

## Draft: 设计与风险

### 设计结论

1. **语义与字节分层**：`TilesetDef { id, name, category, asset }`；地图/图章只引用定义 id，定义只用
   `asset` 引用二进制，catalog 只管理字节。删除 `path`，但保留领域名称；这是单向引用链，不是双轨。
2. **单读取器**：新增/改造 `loadTileset(assetResolver, assetId)`；resolver 校验 `kind=tileset` 后读 bytes，
   RLE codec 只负责 gzip/parse，不知道 project root、目录或 PAL 编号。
3. **所有权分层**：PAL -> `assets/migrated/tilesets/**`；作者 -> `assets/authored/tilesets/<hash>.rle`；空白种子/
   e2e 生成资源 -> `assets/generated/**`。同一 AssetId 的 authored 记录优先并受 MG2 保护。
4. **canonical codec**：catalog 文件是严格 gzip indexed RLE；mediaType 固定为
   `application/vnd.type-pal.rle` 并明确表示 gzip-wrapped PAL sprite chunk，不新增容易分叉的 codec 字段；
   AssetRecord 的 bytes/hash 针对实际 gzip 字节。无 gzip 魔数只允许旧升级 adapter 容忍并规范化；canonical
   读取必须 fail-loud。运行时仍把索引帧按当前工程标准色彩着色。
5. **编辑事务**：tileset 定义、catalog record、assetBlobs 必须由同一可逆命令原子更新；磁盘旧字节在替换/
   删除前预读，保证保存后撤销仍可恢复。tileset 不再使用 `tilesetBlobs`。
6. **垂直退出**：迁移成功的工程立即删除 tileset legacy family/field/fallback；不得等 A7-4 再清本族。
   A7-4 只负责剩余 family 全归零后的公共适配器与总门禁。
7. **传输不改资产**：catalog 文件永远 byte-for-byte copy。clone/Save As/ZIP 不按 `.rle` 后缀解码，
   HTTP 不加 `Content-Encoding` 且声明 `no-transform`；codec 只在消费端。旧裸 RLE 只能在升级边界处理。
8. **提交与缓存按 hash**：pending bytes 必须与 record 预验；先发布 old/new 并集 catalog，再写内容和
   manifest 这张最后引用表，删除方向然后收缩 catalog/清理文件。任一 close 中断都不得产生悬空引用。
   保存快照和三个预览缓存都纳入 sha，不能只看路径/id/长度。
9. **替换 fail-closed**：同 AssetId 替换会影响所有共享定义，UI 先列影响；新帧数不足以覆盖地图/组合最大
   tileId 时阻断并提供跳转。

### 已知风险

- 风险:语义 id 与 AssetId 的映射被误当成可推导关系，或出现悬空/错误 kind。
  - 缓解:两个 id 都不透明；schema + typed walker 逐条检查 `TilesetDef.asset`，PAL/demo/e2e/blank 固定映射
    有精确测试，运行时只读取显式字段。
- 风险:`TilesetDef.name` 与 catalog label 在 UI 中形成双名称。
  - 缓解:瓦片集工作台只编辑/展示 `TilesetDef.name`；catalog label 只作资源诊断，不反向同步领域名称。
- 风险:Chrome 对 gzip magic 的 Safe Browsing 处理与逐字节 clone 冲突。
  - 缓解:真实 Chromium/FSA 验证；必要时改传输封装或服务端清单，不改变 catalog 文件、codec 或 hash。
- 风险:旧本地 clone 已把 `.rle` 解压，直接登记会使 canonical 混杂。
  - 缓解:升级先解码校验，再统一 gzip 编码到新 owned path；源文件只在事务成功后按明确删除计划清理。
- 风险:一个命令更新 definitions/catalog/blobs，撤销时误删共享文件。
  - 缓解:按 AssetId 引用和 path 共享分别计数；文件仅在零记录引用时进入删除集合，添加共享路径专测。
- 风险:替换为同长度不同像素时保存漏写，或稳定 id 缓存不刷新。
  - 缓解:增量签名与预览依赖均纳入 record sha；补同长度替换和三处画面刷新回归。
- 风险:替换后帧数少于地图/组合引用范围，引用形式合法但画面损坏。
  - 缓解:提交前统计所有引用者最大 tileId，越界时阻断并列出可跳转位置。
- 风险:只迁 PAL，demo/e2e/blank 仍让 loader 保留 fallback。
  - 缓解:四类种子/fixture 同卡升级，静态扫描和断外链测试不允许任何 canonical 工程继续声明 tileset legacy。
- 风险:工作树已有 A7-2、保存等待态与用户场景编辑等大量未提交修改。
  - 缓解:本卡 draft 只新增任务卡和看板；build 前重新审计 overlap，禁止覆盖/回退不属于本卡的修改，
    所有生成产物只通过上游迁移器更新。

### 主审立场

- Reviewer: Kimi（架构/schema/跨包主审）；GLM 负责数据、迁移与测试矩阵独立覆盖。
- 结论: **agree（2026-07-19）**——四问逐项成立,无阻塞;附 R1-R3 build 必落钉。
  1. **语义定义 + 二进制资产分层优于 id 兼任 AssetId**:成立。共享二进制(N 定义 → 1 AssetId)只有在
     分层下可表达;`TilesetDef.name`(领域名)与 `AssetRecord.label`(资源诊断)两个名称域不互相冒充;
     删除语义天然分层(定义删引用、零定义引用才删 record/bytes);与 W7G stamp template/placement/asset
     三层先例和 A7 系「AssetId=二进制身份」惯例一致。PAL 地图保留 `tileset-xxx` 语义 id 零改写,
     二进制新发 `tileset.pal.xxx` AssetId,单向引用链不是双轨。
  2. **共享资产替换/删除/接管**:成立。两层引用分别检查(定义←地图/图章、资产←定义);替换先列完整
     影响范围;删除仅在零其他定义引用时连带 record/文件;undo 恢复定义+record+bytes 三元组;
     缩帧替换按引用者最大 tileId fail-closed 并可跳转;authored 同 AssetId 整条受 MG2 保护。
  3. **canonical gzip / clone-save 契约**:成立。canonical 严格 gzip indexed RLE + 固定 mediaType,
     裸 RLE 只在升级边界解码校验→重编码→新 hash;catalog 逐字节 transport,不按扩展名/Content-Encoding
     改码。**G1 口径裁定**:选 (b)——catalog 记 gzip bytes/hash、clone 停止解压;裸 RLE 是历史
     workaround 不是第二 canonical(否则迁移=gzip、克隆=裸,一族两真值);Safe Browsing 拦截走
     transport 层方案(清单/封装),不改资产字节。同长度替换 bug 实证(project-io.ts:237/:310
     `bin:<byteLength>`),`bin:<bytes>:<sha256>` + 二进制→catalog→manifest 提交顺序正确;
     预览缓存按 record sha 失效。
  4. **升级边界 / A7-4 分界**:成立。三类输入(gzip/裸 RLE/工程自有 path)统一预检-解码-规范化-冲突
     检查后写盘,manifest 最后,失败零写入,重开幂等;HTTP 只读给可写化行动提示。tileset 族本卡即退
     legacy,其余四族与 LegacyAssetAdapter 总门禁留 A7-4,不冒领。`generated` 来源档(asset.ts:71)
     已有契约,空白种子/e2e 走 `assets/generated/` 不是新概念。
- 必落钉(R,不阻塞签字,build 验收核对):
  - **R1 同长度修复必须共用签名原语**:`bin:<bytes>:<sha256>` 升级要覆盖保存/另存/克隆/pending blob
    全部写路径(同一原语函数),专测同路径同长度不同像素必写 blob(G2 同项)。
  - **R2 裸 RLE 规范化必须重编码再登记**:升级产物必须带 gzip 魔数且 record hash 针对重编码后字节,
    禁止把历史裸字节直接登记为 canonical。
  - **R3 替换缓存统一按 record sha**:瓦片工作台、地图、图章预览三处缓存失效键只认
    `AssetRecord.sha256`,不认稳定 id/路径/长度;补同长度替换的三画面刷新回归。
- 是否建议进入 build: **是——Codex/GLM/Kimi 三签齐,build allowed**;Status 翻转与看板更新由
  Codex 执行。G1 按本节裁定 (b) 落地,G2/G3/G4 按 GLM 行纳入 build。

### 三方争议记录(按需)

- Codex: 推荐 `TilesetDef.id/name/category` 与 `TilesetDef.asset: AssetId` 分层，物理路径只在 catalog；
  canonical gzip bytes，clone/save/预览缓存按物理 sha 闭环。
- Kimi: **agree**。分层优于 id 兼任(共享二进制/名称域/删除分层/W7G 先例);共享资产两层检查与缩帧
  阻断成立;G1 裁定选 (b) catalog=gzip bytes、clone 停止解压、Safe Browsing 走 transport 方案;
  同长度 bug 实证 project-io.ts:237/:310;升级边界与 A7-4 分界诚实;generated 档已有契约。
  R1(签名原语统一)/R2(裸 RLE 重编码再登记)/R3(预览缓存只认 record sha) build 必落。
- GLM: **agree**。基线 223/223/223/6,501,041B 全独立冻结；map→tileset→path 零悬空；schema/walker/migration 三处缺口定位；clone gzip 解压 workaround + 同长度替换 bug 两项确定性风险识别（G1/G2）。G1(clone gzip 决策须选定口径)/G2(binary snapshot 须加 sha)/G3(walker tilesets 槽)/G4(palTilesetAssetId 确定性) build 必落。
- 用户拍板: 用户于 2026-07-19 同意开始按四个真实 RLE 族逐族推进；本卡先做 tileset。具体 schema 仍须
  三方设计签字。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（三方设计签字已齐，允许开始实现）
- 修改文件:
  - schema / codec / runtime：`packages/content/src/{asset,tileset,validate-refs}*`、
    `packages/shared/src/rle*`、`packages/reforge/src/{assets,loader,scene-map}*`。
  - migrate / 生成真值：`packages/migrate/src/**`、`packages/migrate/scripts/migrate-content.mts`、
    PAL baseline 与 `projects/pal/{assets/index.json,content/tilesets.json,manifest.json}`。
  - editor 生命周期：`packages/editor/src/core/{binary-signature,clone,commands,edit-session,
    editor-asset-references,export-zip,open-actions,open-local,project-io,seed,tileset-references,
    upgrade-local-v3-tilesets}*` 与相应测试。
  - editor UI / 预览：`TilesetTab`、`MapMode`、`MapStampPalette`、`StampLibraryTab`、
    `StampPreviewCanvas`、`scene-stage`、`App`、`editor-target` 及测试。
  - fixture / transport：demo、e2e-own 的 tileset/标准色表/catalog/manifest，三包 Vite 配置、
    `scripts/nginx-type-pal.conf`。
  - 文档：content schema、A7 审计、asset pipeline、project lifecycle、roadmap、capability map、看板与本卡。
- 实现摘要:
  - content/schema 将 `TilesetDef` 收敛为 `{id,name,category,asset}`，typed walker 与校验器按
    `expectedKind=tileset` 收集/验证。
  - shared/reforge 新增 canonical gzip + strict sprite chunk 加载；严格接受 PAL 唯一末尾 sentinel 和作者
    无 sentinel 容器，拒绝中间空洞、坏 offset、损坏 gzip、bytes/hash/kind/media mismatch。
  - migrate 按真实 mapNum 集合物化 223 个 PAL record/文件，冻结 6,501,041 B / 67,715 帧；tileset
    退出 legacy，MG2 authored 所有权不被覆盖。
  - editor 导入、改名、共享替换、缩帧引用证明、删除、undo/redo、pending blob、保存重开和三处预览
    全部改走 AssetId/catalog/EditorAssetReader；撤销新导入时同步修复 URL 对象定位，不留下失效深链。
  - clone、Save As、普通保存和 ZIP 对 catalog 二进制逐字节复制；二进制完整 SHA 签名和
    binary → union catalog → content → manifest → final catalog → removals 两阶段提交顺序共用。写前还对
    tileset pending bytes 做 gzip 魔数、解压与 strict RLE 校验。
  - 最终内部代码审计发现并返工：保存改为 union/final 两阶段 catalog，同时封住新增与删除方向；
    同 AssetId 只允许 authored
    接管或与当次迁移完全一致的 legacy-migrated 中断恢复；删旧源前检查其他 AssetId 的路径所有权；
    `legacy.tilesets` 孤儿字段也会触发退役。
  - 二次内部终审又把 manifest 引用与失败快照纳入事务：manifest 作为最后引用表先于
    final catalog 收缩/物理删除提交；`prevSnapshot` 在真实 IO 期间保留未触及的旧条目，并在每个成功
    close/remove 后原地更新，因而异常返回时仍是实际磁盘快照。UI 首存也传空 Map，中断后重选同一目录保留
    该恢复快照。回归覆盖 role 删除时
    manifest close、多文件删除中断→undo 恢复，以及新 blob close→catalog close 失败→undo 后清理孤儿。
  - 最终只读代码复核确认两个保存 P2 均闭环：`saveAttemptDirRef + isSameEntry` 只在换目录时重置首存恢复
    快照；快照 Map 不再清空未触及旧条目，成功 close 覆盖签名、成功或 NotFound remove 删除条目。
    复核未发现新增 P0/P1/P2。
  - PAL/demo/e2e-own/blank canonical fixture 全部退出 tileset legacy；demo/e2e/blank 同时把工程标准颜色表
    修复为 `visual.standardColorTable -> color.project-standard` catalog role，不恢复 palette schema/UI。
  - HTTP/Vite/nginx 为 `.rle` 声明固定 media type、`Cache-Control: no-transform`，且不设置
    `Content-Encoding`。
- 运行命令:
  - 测试：content **22 files / 241 tests**；shared **13 / 115**；reforge **49 / 431**；editor 最终
    **57 / 462** 全绿。migrate 的 A7-3T 定向矩阵 **3 files / 19 passed / 1 skipped**。
  - migrate 全套为 **222 passed / 1 failed / 1 skipped**；唯一失败是既有
    `engine-chrome-assets.test.ts` 的 OFL hash 期望 `869…`、实际 `ddd…`，与 tileset 资源链无关。
  - content/shared/reforge/editor/migrate 五包 `typecheck` 全绿。
  - editor/reforge/game 三个 production build 全绿；只有既有 Vite chunk-size warning。
  - `pnpm exec biome check .`：**767 files**，零问题；`git diff --check` 通过。
  - `pnpm --filter @type-pal/migrate migrate:content`：
    `tilesets=223 bytes=6501041 frames=67715`，随后
    `writes=0 deletes=0 conflicts=0`，`ref-warnings=0`。
  - 独立数据复算：definitions/catalog/map refs/project files/source files 五个集合均精确为
    `1..225 \ {168,171}`；逐文件 path/bytes/SHA/gzip/media/origin/source bytes/strict parse 零 mismatch，
    223 行 tuple digest 为 `3e959fd788e09d77eaffd90edd165cd084769d4698ea035829e715316e94e82c`。
- 浏览器 / 手工检查:
  - 本地 HTTP 同时验证 editor/reforge/game：代表文件 `001.rle` 三端字节 SHA 均为
    `beacbdf…e3751`，响应为 `application/vnd.type-pal.rle`、`no-transform`、无 Content-Encoding。
  - PAL editor 瓦片库显示 223/223 并渲染索引帧；Reforge `s066` 正常渲染。把
    `**/extracted/data/tileset/**` 路由强制为 503 后两者仍工作，实际请求只命中
    `projects/pal/assets/migrated/tilesets/**`，console 0 warning/error。
  - demo 显示 1/1、463 帧；e2e-own 显示 1/1、4 帧。上传现有 32×32 PNG 后预览切出 2 帧、入库变
    2/2；撤销恢复 1/1，并自动回到仍存在的 `e2e-kit`，不再进入“目标不存在”。console 0 error。
  - 临时浏览器 snapshot/截图与测试工作目录已全部删除；未把测试图片写入仓库。
- 跳过的检查及原因:
  - Playwright CLI 无法接管 Chromium 原生 `showDirectoryPicker`，因此 blank/FSA 的真实目录选择没有在此
    自动化会话重复；blank seed 的 catalog role/bytes/hash/legacy 退出由 `seed.test.ts` 与 editor 全套覆盖，
    HTTP clone/FSA/Save As/ZIP 的字节、hash 与提交顺序由 core 测试覆盖。Kimi review 仍可独立做真句柄抽验。
  - 未保留视觉截图：遵守用户“测试图片记得删掉”的要求；任务卡保留可复现 URL、数据与浏览器结论。
  - 用户无关脏文件 `projects/pal/content/ambiences.json` 未修改、未纳入本卡结论。

## 资源生成记录(如适用)

- Generation Owner: N/A（本卡只迁移/登记用户本地提取字节，不生成替代美术）
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: gzip indexed RLE；不烘 RGBA
- 资源登记位置: `assets/index.json`
- 验证方式: 逐文件 bytes/hash/解码 + 运行时预览

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Kimi
- 验证方式: 真实 Chromium + Playwright CLI；PAL/demo/e2e-own 瓦片工作台、PNG 导入/撤销、Reforge
  `s066`、extracted tileset 请求 503、三端 HTTP header/SHA 对照。
- 截图 / 像素检查路径: 临时截图由 Codex 用本地 image viewer 检查后已删除，不把测试图片留在仓库。
- 结论: Codex 视觉检查通过；PAL/demo/e2e 预览和 Reforge 画面均从 catalog 工程文件加载，未见黑图、旧像素
  或 legacy 请求；新导入和撤销交互闭环。
- 未完成项: Kimi 的独立视觉复验与真实 FSA 目录句柄抽验尚未签字；三方 accept 前保持 review。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自验证 accept；等待 Kimi/GLM 独立审查。
- 必须返工项: pending
- Accept / rework: review

## 用户验收

- 用户结论: 2026-07-19 同意开始 draft；尚未验收实现。
- 后续任务: A7-3W world sprite -> A7-3B battle sprite -> A7-3E effect sprite -> A7-4 总门禁。

## 交接日志

- 2026-07-19 Codex: 完成只读五族重分类，确认 4 个真实 RLE family + generic image/X3 占位；用户同意
  开始。创建 A7-3T draft，Codex 设计签 agree。Evidence: 本卡上下文锚点与基线。Next: Kimi/GLM 独立
  设计审查并写回 agree/counter；签字不齐不得实现。
- 2026-07-19 Codex: 三路只读压力测试补齐 schema/migration、编辑器生命周期、clone/save/hash 证据；将
  初稿从“definition id 兼任 AssetId”修订为 `TilesetDef.asset` 显式分层，并加入严格 gzip、同长度替换、
  sha 缓存失效、共享资产影响和缩帧阻断门禁。未修改实现文件。
- 2026-07-19 Kimi: 架构/schema/跨包设计主审完成,签 **agree**(R1-R3 build 必落钉)。
  四问逐项核对:分层优于 id 兼任(共享二进制可表达/名称域分离/删除分层/W7G 先例);共享资产两层
  引用检查与缩帧 fail-closed 成立;canonical gzip+逐字节 transport 成立,**G1 裁定选 (b)**
  catalog=gzip bytes、clone 停止解压、Safe Browsing 走 transport 方案(裸 RLE 只是历史 workaround,
  一族不得两真值);同长度替换 bug 实证(project-io.ts:237/:310);升级三类输入与 A7-4 分界诚实;
  `generated` 来源档已有契约(asset.ts:71)。锚点抽点:tilesets.json 223 defs/223 unique、
  extracted 223 RLE、maps 223。R1(签名原语统一覆盖保存/另存/克隆/pending blob)/R2(裸 RLE 重编码
  再登记)/R3(预览缓存只认 record sha)必落。Evidence:本卡主审立场、签字区、争议记录。
  三签齐,build 准入 allowed,Status 翻转与看板由 Codex 执行。未改实现文件。
- 2026-07-19 GLM: 数据覆盖/迁移/测试矩阵设计审查签 **agree**。独立复算：tilesets.json 223 definitions/223 unique ids/223 unique paths(`tileset-001`..`tileset-223`/`tileset/1.rle`..`tileset/223.rle`)；RLE 223 files/6,501,041B 精确匹配；223 maps 全引用有效 tilesetId 零悬空；catalog 848/0 tileset；tileset 在 legacy families；stamps.json 空(0 refs)。代码逻辑审查（读源码逐路径推演）：TilesetDef(tileset.ts:6-14) 当前 `{id,name,category,path}` 无 asset/validateTilesets 逐字段重建丢弃未知；walker(asset.ts:472-664) 无 tileset 槽无分支（ASSET_KINDS 已含 tileset）；pal-migration.ts:184-201 path-only 生成须加 asset + palTilesetAssetId（全仓零命中须新建）；clone.ts:28-33 `.rle` decompressGzip 后落盘裸 RLE（catalog 若记 gzip bytes 会 mismatch）；project-io.ts:237 binary snapshot 只 `bin:<byteLength>` 无 hash（同长度不同内容静默漏写）。**G1 关键**：clone gzip 决策须显式选定口径（catalog 记解压裸 RLE vs gzip+Chrome 风险）；**G2**：binary snapshot 须加 sha（`bin:<bytes>:<sha8>`）；**G3**：walker 扩展 tilesets 槽；**G4**：palTilesetAssetId 确定性格式。Evidence: 设计签字 GLM 行。Next: 待 Kimi 签后三齐 build allowed。未改实现文件。
- 2026-07-19 Codex: 核对 Codex / Kimi / GLM 三方设计签均为 **agree**，无未决 counter；按门禁把任务
  从 draft 推进到 build 并同步看板。R1-R3、G1-G4 均为实现必落项；尚未修改 A7-3T 实现，也不得标 done。
- 2026-07-19 Codex: A7-3T build 与自验证完成，状态推进到 review。PAL 产物冻结为
  223 definitions / 223 records / 223 map refs，真实 mapNum `1..225 \ {168,171}`，
  6,501,041 gzip bytes / 67,715 严格有效帧；修正了早期连续 `1..223` 的错误记录。
  demo/e2e-own/blank 的标准颜色表 fixture 已登记 catalog role，未恢复 palette 概念。
  Next: Kimi 主审架构/代码/视觉，GLM 独立核验数据/迁移/测试/文档；三方 accept 前不得标 done。
- 2026-07-19 Codex: 保存事务最终只读复核无阻断、无新增 P0/P1/P2；同目录首存重试保留恢复快照，换目录
  才重置；快照保留未触及磁盘条目并逐个记录成功 close/remove。定向 73 tests、editor 全量 57 files /
  462 tests、typecheck、build、Biome 767 files 与 `git diff --check` 均通过。Next 仍为 Kimi/GLM 独立验收。
- 2026-07-19 GLM: 数据/迁移/测试/文档终审签 **accept**。独立复算：catalog 1,071/223 tileset records/6,501,041B（mapNum 1..225 缺 [168,171]）；全 223 文件 SHA256+bytes 逐项零 mismatch（全量非抽样）；223 TilesetDef 全有 asset 零 path；223 map refs 全有效零悬空；MG2 writes=0/deletes=0/conflicts=0 tilesets=223 bytes=6501041 frames=67715。代码逻辑审查：TilesetDef {id,name,category,asset} 无 path + validateTilesets 拒绝 path 要求非空 asset + catalog 交叉校验 kind=tileset；palTilesetAssetId→tileset.pal.NNN；loadTilesetByPath/legacy.tilesets 全仓零命中。tileset 退出 legacy families（保留 4）；capability-map A7/R7 未提前 done。测试 content 241/reforge 431/editor 462 全 pass；migrate 222 pass + 1 fail(engine-chrome OFL hash=A7-2 scope) + 1 skip。Evidence: done 准入 GLM 行。Next: 待 Kimi 独立 accept 后三签齐交用户验收。未改实现文件。

## 下一位 Agent 提示词

### 给 Kimi（架构、代码与视觉主审）

```text
请审查 /Users/zhangxu/illegal/type-pal 的 A7-3T 实现。任务卡：
docs/ops/tasks/A7-3T-tileset-asset-closure.md，当前 Status=review；你负责架构/schema/跨包边界、代码与视觉主审。

必须先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/decisions.md 的 D25、
docs/phase2/foundation/a7-resource-closure-audit.md 和本任务卡（含 build 数据纠正与验证证据）。
本轮只读审查，禁止修改实现文件，禁止标记 done。

重点复核：
1. TilesetDef 语义 id 与 AssetId 分层、catalog-only 单链及 strict PAL 末尾 sentinel / 作者无 sentinel 规则；
2. 共享 AssetId 的两层引用、缩帧证明、Add/Replace/Remove/undo 原子性及撤销后的 URL 定位；
3. HTTP/FSA/clone/Save As/ZIP 的 gzip byte-exact、完整 SHA 签名和
   binary→union catalog→content→manifest→final catalog→removals 两阶段顺序；新增与删除方向的
   catalog/content/manifest close 中断是否都可重试且不发布悬空定义；恢复快照是否保留未触及条目，
   首存失败后重选同一目录是否保留日志、换目录才重置；
4. 工作台/地图/组合三处只按 AssetRecord.sha256 刷新；PAL/demo/e2e/blank 与 s066 视觉无旧路径/旧像素；
5. A7-3T 与 A7-4 边界，不能把 palette 概念或剩余 legacy 冒充已完成。

请把结论直接写回任务卡“进入 done 前:审查签字”的 Kimi 行：无阻断签 accept；有问题签 counter，并给
file:line、复现命令、影响与最小返工项。同步更新 Review 区。三方 accept 未齐不得标 done。
```

### 给 GLM（数据、迁移、测试与文档审查）

```text
请独立审查 /Users/zhangxu/illegal/type-pal 的 A7-3T 数据与迁移闭包。任务卡：
docs/ops/tasks/A7-3T-tileset-asset-closure.md，当前 Status=review；你负责数据/schema、MG2、测试矩阵和文档口径。

必须先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/decisions.md 的 D25、
docs/phase2/foundation/a7-resource-closure-audit.md 和本任务卡（特别是早期连续 1..223 假设的 build 数据纠正）。
本轮只读审查，禁止修改实现文件，禁止标记 done。

请独立复算并核对：
1. definitions/records/map refs/project/source 五个集合都精确等于 1..225 缺 168/171，各 223；
2. 逐文件 path/bytes/SHA/gzip/kind/media/origin/source byte-exact，合计 6,501,041 B / 67,715 严格有效帧，
   并检查跨缺口 167→169→170→172 与尾部 223/224/225；
3. MG2 authored 不覆盖、正式重迁后二跑 0/0/0、本地升级三输入/冲突/坏文件/失败零写/二开零写；
4. typed walker、两层引用、clone/save/ZIP/FSA、同长度替换、三预览 SHA 测试与静态残留扫描；
5. content schema、A7 审计、asset pipeline、lifecycle、roadmap、capability map 的 review/四项剩余口径一致。

请把结论直接写回任务卡“进入 done 前:审查签字”的 GLM 行：无阻断签 accept；有问题签 counter，并给
file:line、复算命令、差异和返工清单。同步更新 Review 区。三方 accept 未齐不得标 done。
```
