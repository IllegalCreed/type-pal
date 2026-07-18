# A7-3T - 瓦片集索引资源闭包

Status: draft
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
  - PAL 223 个瓦片集的确定性登记和项目内物化；保留 gzip GOP/RLE 字节语义与运行时按工程标准色彩着色。
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
  - PAL `content/tilesets.json`：223 条、223 个唯一 id、223 个唯一 legacy path。
  - PAL `content/maps/index.json`：223 张地图；每张地图都有 `tilesetId`，合计 223 个唯一 tilesetId。
  - `data/extracted/data/tileset/*.rle`：223 文件、gzip 源字节合计 6,501,041 B。
  - 当前 PAL catalog：848 records，其中 `kind=tileset` 为 0；本卡完成后应为 1,071 records、
    223 个 tileset records（若上游其它已签任务改变基线，须在 build 前重算并写明差异）。
  - 当前 PAL 工程目录内 `.rle` 为 0，HTTP 运行完全依赖 `/extracted/data`。
  - demo/e2e-own 各有 1 个工程内 gzip tileset，但仍在 legacy、catalog 为 0；空白种子同样生成
    `assets/tilesets/starter.rle` 而未登记 catalog。
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
    规范化、hash、冲突检查成功后才写二进制/catalog/tilesets，manifest 最后提交；任一步失败零写入。
  - MG2 同 AssetId authored 接管后重迁不覆盖；迁移连续第二次 `writes=0 deletes=0 conflicts=0`。
  - catalog `.rle` 在 clone/另存/保存/ZIP 中逐字节保持；克隆结果全 catalog hash/bytes 一致，不重复携带
    `assets/extracted/data/tileset/**`。`FileSource.readBytes()` 返回值就是 record 所描述的 gzip 字节，
    传输层不得按扩展名或 HTTP Content-Encoding 改码。
  - 二进制增量快照至少等价于 `bin:<bytes>:<sha256>`；同路径同长度不同内容的二次保存必须写 blob。
    全部 pending bytes 在写盘前与 catalog 预验，二进制先写、catalog 后写、manifest 最后提交。
- 测试:
  - schema/guard：缺 catalog、kind mismatch、重复定义 id、空/坏 AssetId、旧 path、`path + asset`、
    map/stamp 悬空定义、catalog+legacy 同族全部 fail-loud；合法 metadata round-trip 稳定。
  - RLE：gzip 与旧裸输入均能在升级边界解析；空帧、坏 offset、损坏 gzip、非 sprite chunk 拒绝；canonical
    输出带 gzip 头且保存重开帧逐像素一致。
  - PAL 数据门禁：223 definitions / 223 records / 223 map refs / 6,501,041 source bytes；逐文件 hash、大小、
    解码帧数和首尾样本一致。
  - typed walker 从 `TilesetDef.asset` 收集 expected kind；闭包诊断、两层受引用删除、共享资产不误删、
    导入/替换/删除各自 undo/redo、pending blob、保存重开有专测。
  - 本地升级覆盖三类输入、id/kind/path collision、缺文件、坏 RLE、写盘失败、二次打开零写入。
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
- Kimi: pending
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

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: **agree**。基线 223/223/223/6,501,041B 全独立冻结；map→tileset→path 零悬空；schema/walker/migration 三处缺口定位；clone gzip 解压 workaround + 同长度替换 bug 两项确定性风险识别（G1/G2）。G1(clone gzip 决策须选定口径)/G2(binary snapshot 须加 sha)/G3(walker tilesets 槽)/G4(palTilesetAssetId 确定性) build 必落。
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

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
8. **提交与缓存按 hash**：pending bytes 必须与 record 预验；写二进制、再写 catalog、最后 manifest。
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
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 推荐 `TilesetDef.id/name/category` 与 `TilesetDef.asset: AssetId` 分层，物理路径只在 catalog；
  canonical gzip bytes，clone/save/预览缓存按物理 sha 闭环。
- Kimi: pending
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

- Coding Owner: Codex（签字未齐，不得开始）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

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
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

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
- 2026-07-19 GLM: 数据覆盖/迁移/测试矩阵设计审查签 **agree**。独立复算：tilesets.json 223 definitions/223 unique ids/223 unique paths(`tileset-001`..`tileset-223`/`tileset/1.rle`..`tileset/223.rle`)；RLE 223 files/6,501,041B 精确匹配；223 maps 全引用有效 tilesetId 零悬空；catalog 848/0 tileset；tileset 在 legacy families；stamps.json 空(0 refs)。代码逻辑审查（读源码逐路径推演）：TilesetDef(tileset.ts:6-14) 当前 `{id,name,category,path}` 无 asset/validateTilesets 逐字段重建丢弃未知；walker(asset.ts:472-664) 无 tileset 槽无分支（ASSET_KINDS 已含 tileset）；pal-migration.ts:184-201 path-only 生成须加 asset + palTilesetAssetId（全仓零命中须新建）；clone.ts:28-33 `.rle` decompressGzip 后落盘裸 RLE（catalog 若记 gzip bytes 会 mismatch）；project-io.ts:237 binary snapshot 只 `bin:<byteLength>` 无 hash（同长度不同内容静默漏写）。**G1 关键**：clone gzip 决策须显式选定口径（catalog 记解压裸 RLE vs gzip+Chrome 风险）；**G2**：binary snapshot 须加 sha（`bin:<bytes>:<sha8>`）；**G3**：walker 扩展 tilesets 槽；**G4**：palTilesetAssetId 确定性格式。Evidence: 设计签字 GLM 行。Next: 待 Kimi 签后三齐 build allowed。未改实现文件。

## 下一位 Agent 提示词

### Kimi

```text
接手任务: A7-3T 瓦片集索引资源闭包
任务卡: docs/ops/tasks/A7-3T-tileset-asset-closure.md
当前状态: draft；Codex 设计签 agree，Kimi/GLM pending，build blocked
你的角色: Kimi 架构/schema/跨包设计主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全文、docs/phase2/decisions.md D25、docs/phase2/foundation/a7-resource-closure-audit.md、docs/phase2/foundation/content-schema.md 的 tileset 段
已完成: Codex 已只读确认 tileset 是 223 个 gzip 索引 RLE，不应 RGBA bake；提出 TilesetDef { id, name, category, asset }，地图/图章引用语义 id，asset 是唯一二进制 AssetId，物理路径只在 catalog；并冻结 canonical gzip bytes、逐族退出 legacy、本地 v3 升级、clone/save hash 与缩帧阻断门禁。
请你做: 独立核对代码与数据，重点压力测试“语义定义 + 二进制资产”分层是否优于 id 兼任 AssetId、共享资产替换语义、TilesetDef 元数据归属、作者替换/删除事务、旧工程升级边界、gzip canonical、同长度保存、Chrome clone transport与 A7-4 分界。把结论和必改项写回任务卡 Kimi 设计签及主审立场。
不要做: 不得修改实现文件，不得迁移 projects/pal，不得把 image/其它 RLE family 扩入本卡，不得标 build/done。
输出要求: 明确签 agree，或 counter + 具体理由/替代契约；提醒用户随后把同一卡交 GLM。签字未齐不得开始实现。
```

### GLM

```text
接手任务: A7-3T 瓦片集索引资源闭包
任务卡: docs/ops/tasks/A7-3T-tileset-asset-closure.md
当前状态: draft；Codex 设计签 agree，Kimi/GLM pending，build blocked
你的角色: GLM 数据覆盖、迁移、测试矩阵设计审查
先读: AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全文、docs/phase2/foundation/a7-resource-closure-audit.md、docs/phase2/migrate/asset-pipeline.md，以及任务卡列出的 extractor/migrate/editor/clone 锚点
已完成: Codex 已冻结 PAL 223 definitions / 223 map refs / 223 RLE files / 6,501,041 B / 当前 catalog tileset=0 基线，并提出 `tileset-xxx -> tileset.pal.xxx` 显式映射、PAL/demo/e2e/blank/旧本地工程全覆盖、MG2、严格 gzip、同长度替换与断外链门禁。
请你做: 独立复算基线与引用覆盖，检查 PAL 迁移映射、TilesetDef.asset typed walker、旧 gzip/裸 RLE/作者 path 升级矩阵、失败零写入、MG2 作者保护、clone 精确字节、保存提交顺序、共享定义/资产删除、缩帧引用扫描、静态扫描和浏览器测试是否完整。把结论和必改项写回任务卡 GLM 设计签。
不要做: 不得修改实现文件，不得直接改生成产物，不得代替 Kimi 做架构签字，不得标 build/done。
输出要求: 明确签 agree，或 counter + 缺失数据/测试/迁移风险；三签齐前明确“不得开始实现”。
```
