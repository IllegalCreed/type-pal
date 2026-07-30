# 项目生命周期设计(新建 / 打开 / 保存本地 · 工程完全自包含)

> 第二阶段 Reforge。2026-07-08 设计(用户 + Claude 头脑风暴)。
> **本文件是设计(架构与决策),非实现。** 先读 [READ-FIRST](../READ-FIRST.md)——本阶段无「真值锚 / 对齐原版」,只要架构干净、好扩展。
> **定位**:[project-design.md](project-design.md) 定了工程化地基(content = 运行期 JSON、一工程一游戏、**工程自包含素材**),并**明确把「打包后选单 / 工程发现机制」留后**。本文件就是那块「留后」——**真实用户**的项目生命周期,并把「自包含」贯彻到素材加载层。
> 状态:设计(待用户复核 → 写实现计划)。

## 0. 背景:现状为什么用户用不了

- **加载写死**:[main.tsx:26](../../../packages/editor/src/main.tsx#L26) `loadProject('pal')` 走 HTTP 从开发服务器拉 `projects/pal/`(只读)。这是**开发脚手架**,真实用户没有这个开发服务器,用不了。
- **保存脱节**:[App.tsx save()](../../../packages/editor/src/ui/App.tsx#L182) 点 💾 弹 `showDirectoryPicker` 全量写回;句柄只在内存 `useRef`,**刷新即丢**。加载(HTTP)与保存(FSA)两条不通的路。
- **素材写死服务器**:[assets.ts](../../../packages/reforge/src/assets.ts) 的 `loadTilemap/loadSprite/loadPalette` 吃 `AssetBase` 后 `fetch(绝对URL)`;pal manifest.assets = `/extracted`、`/baked`(服务器绝对路径)。→ 渲染/运行**依赖服务器**,工程不自包含。

## 1. 部署模型 + 铁律(用户拍板)

编辑器是**托管在用户服务器上的网页应用**,匿名用户前端访问,来**改版 pal**(主流)。

> **核心铁律:工程完全自包含 —— 一个工程文件夹 = 该工程拥有的全部资源(内容 JSON + 项目素材)。**
> 克隆到本地后,引擎直接从本地跑,**零服务器运行时依赖**。服务器/CDN 只是克隆那一刻的**一次性下载源**,不长期挂共享素材。
> 默认字形、菜单皮、对话光标和默认标题属于运行壳，不复制进工程；独立发行由 A8 把“引擎壳 + 工程”组合。

```
用户的服务器 / CDN(只在「克隆」这一刻用到)
├── 编辑器网页 app(built 静态资源)
└── pal 种子包  完整一份:manifest + content/*.json + 全部项目素材
                (map/tileset/sprite/color/sound/music/立绘…)   ← 克隆时整包下载(CDN 加速)

每个用户的机器(本地,自包含)
└── 工程文件夹(FSA)—— 一夹即整个游戏
     ├── manifest.json     assets 路径 = **工程内相对**(非 /extracted 绝对)
     ├── content/*.json
     └── assets/…          克隆时下来的全部素材
   → 引擎/编辑器直接读这个夹渲染+跑,不碰服务器
```

要点:**工程自包含**(= project-design.md 原则),服务器只发只读 app + 一次性种子包;**零账号/零DB/零后端;克隆后零服务器依赖**。

## 2. 决策记录

| 决策点 | 选择 | 理由 |
|---|---|---|
| 用户项目落点 | **本地 FSA 文件夹**(local-first) | 用户「存在本地」;运营方零后端/零DB/零账号 |
| **素材归属** | **工程完全自包含**:克隆时**全部项目素材下到本地工程夹**;manifest.assets 使用**工程内相对路径**；engine chrome 留在应用壳 | project-design.md 的工程/引擎边界;引擎从本地工程读内容，同时由自身 bundle 提供默认界面 |
| pal 种子来源 | **服务器/CDN 静态种子包**(内容 + 全部素材);base URL **可配** | 克隆一次性整包下载,之后不依赖。base URL 可配 → **部署期指向 CDN 二级域名**(用户已有 CDN),`httpSource(baseUrl)` 天然支持 |
| 新建 | **两选一**:①从 pal 克隆(改版,主流)②空白骨架(从头做新游戏,高端) | 多数改 pal,但架构该允许从零起 |
| 打开 | `showDirectoryPicker`(read)→ 从句柄读 manifest+content+**素材** → 渲染 | 与保存共用同一句柄 → 「存回打开处」自动成立 |
| 保存 | **增量**(只写变了的文件)+ 句柄存 **IndexedDB** | 全量写卡;句柄持久化免每次重选。素材几乎不变 → 增量天然跳过 |
| **文件源抽象** | `FileSource` 接口(HTTP / FSA 两实现),覆盖**文本 + 二进制**;`loadProject` **与素材加载都读它** | 打开本地=换 source;素材(PNG/调色板)也经它 → 本地工程离线可渲染可跑。**这是本切片的技术大头** |
| 浏览器 | **先只做 Chromium**(Chrome/Edge);非 Chromium 退路(zip)留后 | FSA `showDirectoryPicker` 仅 Chromium。见 §5 |

## 3. 架构:FileSource 抽象(核心,覆盖内容+素材)

现状分裂:内容走 `loadProject` 里 `fetch(projects/${id}/...)`([loader.ts:170](../../../packages/reforge/src/loader.ts#L170)),素材走 `assets.ts` 里 `fetch(assetBase 绝对URL)`([assets.ts:36](../../../packages/reforge/src/assets.ts#L36))。要让本地工程**离线自包含**,两者统一到一个「从哪读」的接口:

```ts
interface FileSource {
  readText(rel: string): Promise<string>          // 内容 JSON
  readJson<T>(rel: string): Promise<T>             // = JSON.parse(readText)
  readBytes(rel: string): Promise<ArrayBuffer>     // 素材二进制(PNG/palette/音频…)
  urlFor(rel: string): Promise<string>             // 给 <img>/ImageBitmap 用的可加载 URL
}
// 两实现:
httpSource(baseUrl)   // readText=fetch.text;readBytes=fetch.arrayBuffer;urlFor=直接返回 URL       —— 种子 / dev
fsaSource(dirHandle)  // 逐段 getDirectoryHandle→getFile;urlFor=URL.createObjectURL(file)(blob URL) —— 本地工程
```

- `loadProject(source)` 重构吃 `FileSource`。
- **`assets.ts` 的 `AssetBase` 改由 `FileSource` 支撑**:`loadTilemap/loadSprite/loadPalette/…` 内部从 `source.readBytes/urlFor` 取,不再裸 `fetch`。→ 本地工程的素材从本地夹读。
- 写侧对称:`writeProject` 已吃 `FileSystemDirectoryHandle`([project-io.ts:106](../../../packages/editor/src/core/project-io.ts#L106)),扩成也能写二进制(素材克隆用)。
- blob URL 生命周期:fsaSource 的 `urlFor` 产的 objectURL 要在卸载时 `revokeObjectURL`(缓存层管理)。

## 4. 组件与数据流

### 4.1 启动屏 `ProjectPicker`(替换 main.tsx 的自动 loadProject)
入口:**新建工程** / **打开工程** / **最近工程**(列表可砍,见 §7)。选定后才建 `EditSession` → 进 `App`。

### 4.2 新建 —— 两条路(都以「选本地空夹 → 写入 → 打开」收尾)

#### 4.2a 从 pal 克隆(主流:改版)
```
下载 pal 种子包(内容 + 全部项目素材,CDN 加速;整包 or 分文件枚举,见 §5)
  → showDirectoryPicker({mode:'readwrite'})   // 用户选本地空夹(非空则警告确认)
  → 写入全部:content/*.json 原样 + assets/** 二进制 + manifest.json(assets 路径已是工程内相对)
  → 存句柄入 IndexedDB → loadProject(fsaSource(handle)) → App
```
克隆完:工程夹里有整套游戏,引擎直接读它跑,不依赖服务器。

#### 4.2b 空白项目(高端:从头做新游戏)
```
buildBlankSkeleton(name)  // 内置模板:最小 manifest + 各内容表空 + 一个占位空场景;assets 夹空
  → showDirectoryPicker → writeProject(骨架) → 存句柄 → 打开
```
- 骨架 = `manifest.json`(id/name/entryScene + 空 content 表 + 默认 startWorld + **空 assets/**)+ 各内容文件空 + `scenes/index.json` + **占位空场景**(entryScene 必须存在,否则 App 打不开)。
- ⚠ **空白项目真的没素材**(自包含 = 没共享可蹭)。占位场景在有自绘/导入地图前**无图可渲染** → 编辑器须容忍「无地图场景」= 空网格。真正可玩的从零新游戏(自绘地图 / 导入素材)**gated on 地图模块**。骨架本身便宜,归本切片必做。

### 4.3 打开本地
```
showDirectoryPicker({mode:'readwrite'}) → 校验有 manifest.json
  → 存句柄入 IndexedDB → loadProject(fsaSource(handle))(内容+素材都从本地读)→ App
```

### 4.4 保存(增量)
```
serializeProject(state)  // 内存:JS 对象 → {rel: JSON 值}(便宜);素材不动
  → 与「上次已存快照」逐文件比对(字符串相等则跳过)
  → 只 writeProject 变了的;删掉快照有、现在没有的(如删场景)→ 更新快照
```
- 快照 = `Map<rel, string>`,打开/新建后建立基线(打开未改 → 保存零写)。
- 慢的是 FSA 写盘,不是序列化;**不必额外算 MD5**(哈希也遍历字符串,不省)。素材是二进制、编辑器基本不改 → 增量天然只碰变化的内容 JSON。
- 备选(更省更侵入):`EditSession` 命令级记「脏文件集」。**先用快照-diff(简单稳)**,变慢再上命令级。

### 4.5 句柄持久化(IndexedDB)
- `FileSystemDirectoryHandle` 可结构化克隆存 IndexedDB → 刷新取回。取回后**权限可能过期** → `queryPermission`/`requestPermission`;失效回启动屏重选。
- 「最近工程」= IndexedDB 存的句柄列表(名字 + 句柄)。

## 5. 错误处理与约束

- **克隆是重操作**:整套素材(~几百 MB / 上千文件)下载 + 写盘。→ **种子建议打成单个归档(zip/tar)**:CDN 一次下载 + 浏览器端解包写本地,远快于上千次 per-file fetch(代价:加一个解压库 + 内存解包)。备选:分文件枚举(无依赖但慢)。**要有进度条**。
- **非 Chromium**(Firefox/Safari 无 `showDirectoryPicker`):启动屏检测缺失 → 明确提示「请用 Chrome/Edge」;zip 导入导出退路**留后**。
- **权限过期 / reload**:re-`requestPermission`;失败回启动屏。
- **克隆进非空文件夹**:枚举到已有文件 → 警告确认,防覆盖。
- **打开非工程夹**(无 manifest.json):校验失败 → 友好报错。
- **素材缺失**(工程夹被删了某素材):素材加载器报明确「缺 assets/xxx」,不静默黑图。

## 6. 测试

- `httpSource`/`fsaSource`(readText/readBytes/urlFor)、增量 `writeProject`、快照-diff:**纯逻辑单测**(内存 mock `FileSource` 与 `FileSystemDirectoryHandle`)。
- **round-trip 不变式**(命脉):`source 读 → serialize → diff` = 空(打开未改立即存=零写);种子枚举文件集完整。
- 克隆:source 读(含二进制)→ FSA 写 → 再 fsaSource 读回 = 原字节。
- **素材经 FileSource**:`loadTilemap/loadSprite/loadPalette` 喂 mock source 能出正确解码结果(原有解码测复用,只换取数来源)。
- 启动屏 / FSA 授权 / IndexedDB / 大包克隆进度:**Claude 浏览器实测**。

## 7. 范围(必做 vs 可砍)

**必做(本切片)**
- 启动屏(新建 / 打开)。
- 新建**二选一**:①从 pal 克隆(下载完整种子包 → FSA 写全部含素材)②空白骨架(内置模板 → FSA 写)。
- 打开本地(FSA 读内容+素材 → 渲染),`FileSource` 抽象 + `loadProject` 重构。
- **素材加载改经 FileSource**(assets.ts 不再裸 fetch;本地工程离线可渲染)—— **本切片技术大头**。
- 增量保存(快照-diff)+ 句柄存 IndexedDB。
- **pal 种子打包**:把 pal(现 data/extracted 分离)组装成自包含种子包(assets 路径工程内相对),供克隆下载。

**可砍 / 留后**
- 最近工程列表(有句柄持久化后加不难;先单个也行)。
- 种子归档(zip)优化:先能跑(哪怕分文件慢),归档加速可作为二步。
- 非 Chromium 的 zip 导入导出退路。
- **自绘地图 / 导入新素材**(空白项目要能真正脱离 pal)→ **地图模块**。
- 多工程管理 / 重命名删除。
- dev `loadProject('pal')` 快捷路径:保留作开发便利(env `VITE_PROJECT_ID`),与启动屏并存。
- 种子分发走 CDN:部署期把种子 base URL 指向用户 CDN。纯部署配置,`httpSource(baseUrl)` 已支持。

## 8. 与既有设计的调和 + 地图模块衔接

- **与 project-design.md 一致**:「工程自包含素材」本就是它的决策;本文件把它**贯彻到运行期**(素材加载经 FileSource 从工程夹读),不再有「服务器共享」这一说(那是我上一版的错,已纠正)。
- **地图模块衔接**:自包含就位后,①克隆的工程能改原版地图;②空白工程有地方装自产地图。地图模块的头号问题 = **作者如何产出新地图素材**(画 tileset / 导入图 → 写进工程 assets/,manifest 引用)—— 依赖本切片的 FSA 落地 + FileSource 素材读。

## 9. 落点(涉及包)

- `@type-pal/reforge` `loader.ts` + `assets.ts`:`FileSource` 接口 + `httpSource`/`fsaSource`;`loadProject(source)` 重构;**素材加载器改吃 source(readBytes/urlFor),去掉裸 fetch**;objectURL 缓存+回收。
- `@type-pal/editor` `core/project-io.ts`:`writeProject` 扩二进制;增量(快照)+ 种子枚举/下载 + 空白骨架模板。
- `@type-pal/editor` `core/handle-store.ts`(新):IndexedDB 句柄存取 + 最近列表 + 权限。
- `@type-pal/editor` `ui/ProjectPicker.tsx`(新):启动屏 + 克隆进度。
- `@type-pal/editor` `main.tsx`:自动 loadProject → 启动屏。
- **构建/打包**:pal 自包含种子包组装(assets 路径工程内相对),部署到服务器/CDN。

---

## 10. 审计补充(2026-07-08,GLM 复核)

> 架构核心判断成立(FileSource 抽象 + 自包含 + 增量保存)。以下 3 处实现前须补、1 处范围建议调整。§3/§4.5/§5 的相关约束已在 Claude 原稿中体现,此处为强调与展开。

### 10.1 blob URL 去重缓存(必须,防内存泄漏)

`fsaSource.urlFor` 每次产 `URL.createObjectURL(file)`。若不去重,同一张精灵被请求 100 次 → 100 个 blob URL → 内存泄漏(尤其场景切几百次后)。§3 提了"objectURL 缓存+回收"——实现时这层必须显式建:`Map<rel, objectURL>` 去重(首次创建后缓存,重复请求返同一个);切换工程/关闭时统一 `revokeObjectURL` 全部。**这不是可选项**——不去重跑一会儿内存爆。

### 10.2 zip 内存风险(几百 MB 解包可能 OOM)

§5「种子打成 zip + 浏览器端解包」—— JS 压缩库(fflate 等)全在内存,几百 MB zip 解包可能直接 OOM。**建议**:① 优先用流式方案(`DecompressionStream` 解 gzip/deflate 流 + 流式写 FSA,注意它不解 zip 容器,要流式优先选 `.tar.gz`);② 或接受「分文件 fetch 慢但安全」作默认,zip 作为可选加速。**别把 zip 全量内存解包当默认**——它有真实的内存上限风险。FSA 仅桌面 Chromium(手机进不来),但低端桌面仍需防。

### 10.3 句柄权限的手势约束(刷新后不能自动恢复)

§4.5 已写权限刷新,补充强调:`queryPermission` 返回 'prompt' 时,`requestPermission` **必须在用户手势内调用**(同 audio autoplay warmup 的浏览器约束)。刷新后若自动尝试恢复句柄 → 不在手势内 → 静默失败。**要求**:刷新后显示「🔌 重新连接工程」按钮,等用户点击(=手势)再 `requestPermission`。不要自动恢复,也别粗暴打回启动屏重选。

### 10.4 空白骨架范围(建议留用户定夺)

§4.2b + §7 把空白项目列「必做」。但空白项目没素材 = 空网格,真正能用得 gated on 地图模块(§4.2b 自己承认)。一个连地图都画不了的空壳,改版 pal 的主流用户(走克隆)不需要,高端用户在能画地图前也用不起来。

**两种取向**:① 砍到地图模块后(本切片工作量给克隆路径,那才是真正解锁用户价值的大头);② 保留但启动屏老实标注「高级:画地图前仅可编非地图内容(角色/道具/技能/属性/对白)」,化解"空壳误导"。**留用户拍板** —— 用户若明确要空白入口则保留(非地图创作本就能干,非死胡同),若优先级在克隆路径则后移。

## 11. A7-0 资源注册表落地更新(2026-07-15)

本文件前十节的 `FileSource` 判断仍成立，但“manifest 直接保存一组资源目录”只代表旧 v2 形态。
A7-0 起，v3 工程新增唯一物理资产链：

```text
内容 AssetId -> manifest.assets.catalog -> assets/index.json -> AssetResolver -> FileSource
```

- manifest 只保存 catalog 路径、封闭角色映射和尚未迁移资源族的 `legacy` 债务区。音乐族不得再通过
  `assets.music`、数字补零或应用根路径读取。
- HTTP 与 FSA 工程使用同一 `AssetResolver`。resolver 校验 id/kind/path，并复用 `FileSource` 字节与 URL；
  切换或关闭工程时统一 `dispose()`，FSA object URL 缓存和 revoke 已有专测。
- 编辑器 pending blobs 与 JSON 快照一起进入增量保存：导入/替换 MIDI 写到
  `assets/authored/<sha256>.mid`，catalog 与二进制要么一起保存，要么一起留在内存，不产生半套工程。
- 本地 v2 工程只在“打开本地”边界执行一次升级：复制旧 MIDI 与 soundfont、生成 catalog、改写引用，
  最后才原子写 v3 manifest。运行时和编辑器工作态只保留 v3，不维持双格式。
- 应用壳与工程资源的边界已钉死：MIDI worklet JavaScript 属于应用；MIDI、soundfont 和游戏音乐元数据
  属于工程。后续 A7-1 至 A7-4 以同一规则迁移其余资源族。

当前音乐族的文件数、字节数、哈希与迁移幂等证据见
[`a7-0-music-resource-closure-report.md`](../foundation/a7-0-music-resource-closure-report.md)。A7 总体仍未闭包，
克隆清单改为 catalog 真值和断开外部目录验收仍归 A7-4。

## 12. A7-2 生命周期边界更新（2026-07-18）

- `portrait`、`face`、`item-icon`、`battle-background` 四族已经退出 legacy，PAL catalog 新增 379 条
  静态图记录；打开、运行、编辑、保存和引用定位只接受 AssetId。
- PAL 的 ignored 二进制不是 `data/baked` 种子。fresh clone 在提取后执行
  `pnpm --filter @type-pal/migrate run migrate:content -- --write`，由 catalog 与迁移计划物化
  `projects/pal/assets/**`；随后 dry-run 应为 `writes=0 deletes=0 conflicts=0`。
- 默认标题、字形、光标和 85 个 UI slot 由 `packages/reforge/src/engine-chrome/registry.ts` 统一交给
  bundler；UI/标题/许可与来源记录位于其 `assets/**`。它们不进入工程 catalog、FSA 工程目录或 A5 ZIP，
  A8 发行包负责携带这部分引擎壳。
- 当前 clone/seed 已不读取 `data/baked` 或 `baked-manifest.json`，但仍需从 extracted 清单复制
  `sprite`、`battle-sprite`、`effect-sprite`、`image` 四个尚未迁移的 legacy 条目；A7-3T 后 tileset 已由
  catalog 逐字节复制，不再重复携带 extracted tileset。
  catalog-only 克隆、导出前全量闭包门禁和 A7-4 的 contentVersion 7 收口仍未完成；C2-ACT
  占用 v4，N3-1 canonical P7/R13 epoch 随后占用 v5/v6，不能据此提前把 A7/R7 标完成。

## 13. A7-3T 瓦片集生命周期更新（2026-07-19，done）

- `ProjectMap.tilesetId -> TilesetDef.id -> TilesetDef.asset -> assets/index.json ->
  AssetResolver/EditorAssetReader -> FileSource` 是唯一工作链；canonical 工程不再保存
  `TilesetDef.path`、`legacy.tilesets` 或 tileset root fallback。
- catalog `.rle` 在 HTTP clone、FSA、首次 Save As、普通保存和 ZIP 中逐字节复制。文件保持 gzip；
  transport 不得按扩展名解压，也不得用 `Content-Encoding` 改写 record 所描述的字节。
- pending 二进制先与 catalog record 做完整 bytes/SHA-256 预检，tileset 还必须通过 gzip 与
  strict RLE 校验。写盘先发布 old/new 并集 catalog，再写普通内容 JSON 与作为最后引用表的 manifest；
  删除方向然后收缩为目标 catalog，并清理旧文件。这样新增不会留下“新定义 + 旧 catalog”，
  删除也不会留下“旧定义 + 新 catalog”；同路径同长度不同内容通过
  `bin:<bytes>:<sha256>` 识别，不再漏写替换。
- 传入的增量快照在真实 IO 期间兼作实际磁盘恢复日志：未触及的旧条目继续保留，成功 close 即覆盖真实签名，
  成功或确认不存在的 remove 即删除记录。这样中断后撤销新导入时，下次 diff 仍能删掉已写但未发布的孤儿
  blob，多文件删除中断后也不会忘记尚未触及的旧文件；首存重选同一目录时必须保留同一恢复快照。
- PAL review 产物为 223 definitions / 223 records / 223 map refs；真实 mapNum 集合是
  `1..225 \ {168,171}`，gzip 总字节 6,501,041，严格有效帧 67,715。
- demo、e2e-own 和 blank seed 原先把工程标准颜色表留在 legacy fixture；本轮改为
  `visual.standardColorTable -> color.project-standard` catalog role。demo 使用 migrated color，
  e2e-own/blank 使用 generated color，三者都只保留尚未迁移的 sprite legacy。
- A7-3T 已完成三方审查和用户验收。该切片完成时尚有 `sprite`、`battle-sprite`、`effect-sprite`、`image`
  四项；随后 A7-3W 已完成 sprite，A7-3B 已完成 battle-sprite。全量断外链、contentVersion 7 与
  删除 LegacyAssetAdapter 仍归 A7-4；A7/R7 总体仍未完成。

## 14. A7-3W 大世界精灵生命周期更新（2026-07-19，done）

- 唯一读取链为 `SpriteDef.id -> SpriteDef.asset -> assets/index.json -> AssetResolver/FileSource`；
  canonical 工程不再保存 `SpriteDef.spriteNum/path`、`legacy.sprites` 或 sprite root fallback。
- PAL、demo、e2e-own 和 blank seed 都使用 catalog SpriteDef。作者导入在一个可撤销事务内创建定义、
  authored AssetRecord 和 `assetBlobs`；路径是 `assets/authored/sprites/<content-hash>.rle`，不从定义 id 推导。
- 替换保留定义 id 与 AssetId，按完整 SHA 刷新预览/运行时缓存；共享 AssetId 先列出全部消费者。
  删除定义与删除最后一份二进制是两个动作，默认禁止缩短有效帧数。
- 本地 v3 工程在打开边界先读取并校验全部旧数字/路径字节，再原子发布 binary/catalog/content/manifest；
  close 中断可重试，authored 同 AssetId 接管不被重迁覆盖，二次打开零写入。
- HTTP clone、FSA、Save As 与 ZIP 对 catalog `.rle` 原样复制，不能按扩展名解压或重编码。PAL 本地开发工程
  的 migrated 二进制由受保护提取源确定性物化且不入 git；克隆得到的用户工程则把这些文件完整写入目标目录，
  离线运行不再请求 extracted sprite。
- 存档与脚本中的编外跟随者保存 SpriteDef.id；旧数字只在本地升级和存档归一化边界出现，多义映射拒绝。

A7-3W 完成当时，PAL 仍有 `battle-sprite/effect-sprite/image` 三族；A7-3B 正式落地后移除了
`battle-sprite`。catalog-only 总门禁、contentVersion 7 与 LegacyAssetAdapter 总删除仍归 A7-4，
A7/R7 总体不能提前标 done。

## 15. A7-3B 战斗精灵生命周期更新（2026-07-21，done）

- 唯一读取链为 `BattleSpriteDef.id -> BattleSpriteDef.asset -> assets/index.json -> AssetResolver/FileSource`；
  canonical 工程不再保存 player/enemy number、path、summon godId 或 `legacy.battle-sprite`。
- 编辑器把“语义定义”和“二进制资源”做成同一战斗精灵库的两个视图。作者导入可原子创建 authored record、
  二进制 blob、定义并赋给 Actor/Enemy/Skill/Script/Item；定义与资产分别显示引用、共享、删除条件和深链。
- 替换保留 AssetId，预读并验证持久旧字节，使用完整 SHA + 全消费者 proof；默认禁止缩短有效帧数。
  显式修复式缩帧必须在同一可撤销命令里修复所有定义/消费者，undo/redo 恢复定义、record、bytes 与引用。
- 本地 v3 升级器以 journal 和完整 read-set 做 crash recovery：先验证旧 number/path、源别名、目录 inventory、
  catalog ownership 和所有目标路径，再按 binary -> union catalog -> content/scripts -> manifest -> final catalog
  -> removals 单调前滚。mixed/ambiguous/missing/tamper 均零写入拒绝，重试与二次打开零计划。
- HTTP clone、FSA、Save As、ZIP 和 pending blob 对 `.rle` 原字节复制，并校验 media/bytes/SHA/gzip/origin；
  battle-sprite 不再经过 `tilesetBlobs` 或 extracted descriptor。PAL 本地原版二进制受保护不入 git，克隆出的
  用户工程则完整持有所有 catalog 文件。
- 存档格式独立升至 v4，只把旧 party/reserve 持久 battle appearance 在输入边界映射为定义 id；该切片完成时工程
  `contentVersion` 仍是 3。随后 C2-ACT 为精灵预制动作把工程升级到 v4；当时 A7-4 曾计划顺延为 v5，
  后由 N3-1 canonical P7 和 R13-1 epoch 依次占用 v5/v6，当前 A7-4 目标为 v7。

本轮移除 legacy `battle-sprite` 后，PAL 只剩 `effect-sprite/image` 两族。A7/R7 总体仍未完成。

## 16. N3-1 开发期 content/save epoch 更新（2026-07-27）

- current 工程为 `contentVersion: 6`、`minimumSaveVersion: 6`，runtime 只加载 current v6。
- canonical 脚本 schema 仍是 V5；v5 → v6 只在本地打开边界验证完整 current loader 后发布
  manifest，不重写内容，也不生成 successor sidecar。
- SAVE 1..5 在任何历史 sidecar I/O 前早失败。历史 v4 → v5 descriptor、sidecar、ledger 只作为
  byte-pin 迁移证明保留。
- A7-4 的 catalog-only 总门禁、全 legacy 归零、删除 LegacyAssetAdapter 与断外链验收统一顺延到
  `contentVersion: 7`。

## 17. R13-2 / R13-3 历史版本轴更新（2026-07-29）

- 截至 2026-07-29，当时的 current 工程为 `contentVersion: 8` / SAVE 7 /
  `minimumSaveVersion: 7`。
- R13-2 发布的 content 7 / SAVE 7 保留为历史 byte-pin。
- R13-3 占用 content 8，只升级投掷内容 schema；SAVE 与 world shape 不变。
- SAVE7/content7 读档只做输入不变、无 sidecar 的 content epoch identity normalization。
- 当时 v7、v8、v9 已分别由 R13-2、R13-3、R13-4 占用，A7-4 曾顺延为候选 v10；
  后续 current 口径见下一节。

## 18. R13-4 / R13-5 当前版本轴更新（2026-07-31）

- 当前工程为 `contentVersion: 10` / SAVE 8 / `minimumSaveVersion: 8`。
- R13-4 发布 content 9 / SAVE 8；R13-5 用 content 10 收紧敌人脚本和 battle context，
  世界形状与 SAVE envelope 不变。
- 已发布的 SAVE8/content9 读档只做输入不变、无 sidecar 的 content9→10 identity
  normalization；更早的开发期 SAVE 在任何历史 sidecar I/O 前拒绝。
- 本地打开边界把 v4～v9 工程经各自纯升级器合成 current v10，完整预检后始终最后提交
  manifest；非法 battle/onDefeated 上下文在任何写盘前 fail-loud。
- contentVersion 5～10 已由 N3-1 P7/R13 占用；A7-4 当前顺延为候选 v11，版本尚未冻结。
