# 过场资源工作台与工程闭包设计

> 状态: done（2026-07-17），A7-3 实现、返工、三方 review 与用户验收均已完成。
> 任务卡: [`A7-3-cutscene-asset-workbench.md`](../../ops/tasks/A7-3-cutscene-asset-workbench.md)

## 1. 目标

把现在只读的“过场素材清单”改造成完整的工程资源工作台：

- 视频和原版 RNG 迁移出的帧动画全部位于工程目录并登记进唯一 catalog。
- 脚本只按稳定 AssetId 引用，不再用视频号、RNG chunk 下标或路径拼接。
- 视频可以导入、改名、替换、预览、检查引用和安全删除。
- 帧动画可以导入图片序列，并在中间时间轴逐帧编辑后保存。
- 原版迁移资源不是只读资源。第一次修改后保持 AssetId，物理所有权转为 `authored`，后续重迁不得覆盖。
- 运行时和编辑器不再读取 `/extracted/videos`、`/extracted/data/animation` 或外部 RNG 清单。

## 2. 现状证据

### 2.1 当前页面不是创作闭环

`packages/editor/src/ui/CutsceneTab.tsx` 当前存在以下结构性问题：

- 视频列表硬编码 1 至 6，RNG 列表裸 `fetch('/extracted/data/rng-frames.json')`。
- 预览直接调用全屏运行时播放器，中间主面板没有播放器或编辑器。
- 没有 catalog、AssetId、导入、改名、替换、删除、引用详情和右侧属性面板。
- RNG 仍以数字 `chunkIdx`、外部 `.rle` 和运行时调色板解释，不是新版工程资产。

### 2.2 数据规模

- 视频 6 个，共约 20 MB，全部是 H.264 + AAC MP4，分辨率 288 x 180。
- RNG 12 段、1,464 帧；当前 gzip RLE 共 3,970,927 B。
- PAL 迁移产物有 20 条 `playRng`，引用 0/1/2/3/4/5/7/8/9 共 9 段；6/10/11 当前无脚本引用。
- PAL 迁移产物当前没有 `playVideo` 命令。视频仍可登记为未引用资产，不能伪造引用来阻止删除。

> 实施口径补记(2026-07-16)：上面的“当前”是本设计起草时的迁移基线，不是最终运行工程的引用结论。
> A7-3 实施后，启动视频 001/002 由 `manifest.assets.roles` 绑定，入口剧情视频 003 由
> `entryPoints[].introVideo` 绑定，结尾视频 004/005/006 由 `quitToTitle.videos[]` 绑定；
> 因此引用面板必须扫描这三类入口。原版一个 RNG 被音效/对白/等待切成多个播放段时，它们仍属于同一作者脚本位置，
> UI 应显示一个引用位置并标注“本处调用 N 次”。

### 2.3 真彩编码体积实测

用 12 段真实 RNG、各段已考证的静态颜色表解码后，得到：

| 编码方式 | 总体积 | 相对当前 RLE |
|---|---:|---:|
| 每帧完整 RGBA PNG | 100,075,957 B | 25.20x |
| 首帧 + 连续脏矩形 PNG | 29,746,679 B | 7.49x |
| 每 32 帧关键帧 + 脏矩形 PNG | 31,525,705 B | 7.94x |

上表证明“不恢复 1,464 个散文件”，但不把脏矩形定为最终 codec。用户于 2026-07-16 明确：作者只编辑
完整帧，保存/加载层可以从全部完整帧选择更高效的无损压缩。随后以全部 1,464 张真实 RGBA8 完整帧追加实测：

| 编码方式 | 分块 | 总体积 | 最坏随机恢复 |
|---|---:|---:|---:|
| RGBA8 + 相邻帧 XOR + Deflate | 16 帧 | 9,066,635 B | 15 帧 |
| **RGBA8 + 相邻帧 XOR + Deflate（选型原型）** | **32 帧** | **8,271,766 B** | **31 帧** |
| RGBA8 + 相邻帧 XOR + Deflate | 64 帧 | 7,973,769 B | 63 帧 |
| RGBA8 + 相邻帧 XOR + Brotli | 32 帧 | 5,184,446 B | 31 帧 |

最终选择 32 帧 XOR + Deflate：原型比脏矩形 PNG 小约 73.8%；64 帧只再省约 0.30 MB，却把随机恢复步数和
单块解压内存翻倍；Brotli 虽再小约 3.09 MB，但迁移编码实测约 70.5 秒，浏览器侧写入兼容性也弱于
原生 Deflate。正式迁移器固定 zlib level 9 后，catalog 与 12 个物理文件逐项校验的总量为 7,960,282 B；
原型表用于选 block 间隔，正式数用于产物门禁。codec 输入和输出语义仍是完整 RGBA8 帧，XOR 与压缩仅存在
于容器内部。

## 3. 核心决策

### 3.1 作者模型只保留“视频”和“帧动画”

- `video`：MP4/WebM 等浏览器可播放视频，允许自带音轨。
- `frame-animation`：固定画布、多帧、可逐帧控制时长的真彩帧序列。
- `rng` 只作为 legacy family 和迁移输入术语存在，不进入新 catalog、脚本命令或编辑器作者模型。
- PAL 稳定 id：`video.pal.001` 至 `video.pal.006`、`frame-animation.pal.000` 至 `frame-animation.pal.011`。
- 自有新资源使用独立稳定 id；物理路径使用内容哈希，替换时保持 id 不变。

### 3.2 画面资产不绑定 BGM

视频/帧动画和配乐必须分层：

- 6 个现有 MP4 自带 AAC 音轨，不能再隐式绑定一首 MIDI。
- 20 条 RNG 调用中，有的前置 `playMusic`，有的只配 `playSound`，有的同一动画分段播放并在段间插入不同音效或对白。
- 同一帧动画允许被不同脚本以不同区间、帧率、音乐和音效复用。
- 右侧引用详情可以显示调用点及附近的音乐/音效命令，帮助理解编排，但不把这些关系写进资产。
- 将来需要复用整套“音乐 + 音效 + 画面 + 对白”时，应建立脚本模板或剧情编排对象，不污染素材定义。

### 3.3 不把 paletteId 带回作者模型

- PAL 原版 RNG 迁移时按已考证的每段静态颜色表烘焙为真彩；3/6/7 段分别使用其正确颜色表，其余使用标准表。不能把所有原版段强制改成 palette 0。
- 作者导入图片序列时提供“保留原色 / 贴合工程标准色彩”二选一；后者就是固定量化到 PAL palette 0 的颜色集合。
- UI 不显示颜色表编号，也不允许选择任意 palette。文案使用“工程标准色彩”。
- 量化输出仍是真彩像素，运行时不读取颜色表。
- 为保证断开外部目录后仍可导入，A7-3 需要先把唯一工程标准颜色表升为 catalog 角色，并让现有 palette 0 消费点统一读取该角色。RNG 烘焙后非 0 颜色表运行依赖归零，`color-table` family 才能完整退出 legacy。

### 3.4 完整帧编辑与存储压缩严格分层

- 作者和编辑器的语义永远是“一帧 = 一张完整画布”。时间轴、预览、选中、替换、重排、时长、撤销/重做和
  对外编辑 API 都只处理完整帧，不出现关键帧、脏矩形或补丁概念。
- 加载时由 TPFS 解码层解压目标 32 帧块，并从块首完整帧按相邻帧 XOR 还原完整帧后再交给编辑器；允许
  按需解码和缓存，但不能要求用户理解块或帧间依赖。
- 保存时由 Worker 接收完整帧，自动按 32 帧分块、生成相邻帧 XOR 数据并 Deflate。用户不选择压缩区域，
  也不维护帧间关系。
- undo 的结构共享、延迟解码和帧引用只是内存优化，不改变完整帧的作者模型。替换编码算法时，不得修改内容
  schema、脚本命令或编辑器交互。
- TPFS v1 只是当前落盘 codec，不是作者数据模型。后续选型必须从解码得到的全部完整帧重新实测体积、随机读取、
  编解码耗时、峰值内存和浏览器兼容性；若新算法更优，可通过“读旧版本、写新版本”的资产迁移重编码，不能把
  新压缩细节暴露给用户或反向污染内容契约。

## 4. 数据契约

### 4.1 资源记录

`AssetRecordV1` 继续保持“一条 catalog 记录对应一个物理文件”，不为了帧动画扩成数千个成员文件：

```ts
type AssetKind =
  | 'video'
  | 'frame-animation'
  | 'color-table'
  // 其他既有 kind

type AssetRole =
  | 'visual.standardColorTable'
  // 既有音频角色
```

`visual.standardColorTable` 只提供项目标准颜色，不出现在内容命令中。

### 4.2 TPFS v1 单文件容器

帧动画使用 `application/vnd.type-pal.frame-sequence`，扩展名 `.tpfs`。容器由以下部分组成：

1. 4 字节固定魔数 `TPFS`。
2. 1 字节版本 `1`、3 字节保留位（必须为 0）。
3. 4 字节无符号小端整数：UTF-8 JSON 索引长度。
4. JSON 索引正文。
5. 连续 Deflate block payload。

索引固定为：

```ts
interface FrameSequenceIndexV1 {
  version: 1
  codec: 'deflate-rgba8-xor-v1'
  pixelFormat: 'rgba8'
  width: number
  height: number
  defaultFrameMs: number
  blockFrames: 32
  colorTreatment?: 'preserve' | 'project-standard'
  frames: Array<{ durationMs?: number }>
  blocks: Array<{
    firstFrame: number
    frameCount: number
    offset: number
    bytes: number
    rawBytes: number
  }>
}
```

约束：

- 每块最多 32 帧。块内解压数据长度必须精确等于 `width × height × 4 × frameCount`。
- 块内第 0 段是完整 RGBA8；其余每段是当前完整帧与前一完整帧逐字节 XOR 的等长数据。恢复使用 XOR，
  不做 alpha 混合；RGBA 四通道逐字节保持。
- `offset/bytes` 只相对 payload。block 必须按帧和字节连续覆盖，无重叠、空洞、越界或尾随数据；
  `firstFrame/frameCount` 必须无缝覆盖全部 `frames`。
- Node 迁移使用固定 zlib 参数生成字节确定的 Deflate；浏览器只重编码被修改的动画，未修改资产零重写。
- 重新排序、插入或删除后由保存 Worker 从完整帧重新分块和编码；block/XOR 字段仅存在于 codec，
  不进入作者草稿、编辑命令、内容层或 UI。

### 4.3 脚本命令

旧数字命令一次性迁移为：

```ts
type PlayVideoCommand = {
  kind: 'playVideo'
  asset: AssetId
}

type PlayFrameAnimationCommand = {
  kind: 'playFrameAnimation'
  asset: AssetId
  startFrame?: number
  endFrame?: number
  frameRate?: number
}
```

- `frameRate` 是调用点的统一帧率覆盖；缺省时使用容器默认/逐帧时长。
- `startFrame/endFrame` 继续支持同一动画分段编排。
- `videoId`、`chunkIdx`、`playRng` 和 AssetId 推路径全部退役。
- typed asset reference walker 收集两类命令，删除保护与闭包检查只认这张引用表。

## 5. 迁移与工程闭包

### 5.1 PAL 视频

- `data/extracted/videos/1..6.mp4` 是迁移输入。
- 迁移器登记为 `video.pal.001..006`，物化到 `assets/migrated/videos/`。
- 保留 H.264/AAC 原字节，不二次转码。
- 迁移后播放器只从 `AssetResolver.urlFor(asset, 'video')` 取地址。

### 5.2 PAL RNG

- `pal-extract` 继续负责从合法原始数据提取 `.rle`，它只是迁移输入。
- `migrate` 解码 12 段，以每段已考证颜色表烘焙 RGBA，再编码 TPFS。
- 20 条 `playRng` 改写为 `playFrameAnimation`，`chunkIdx` 映射稳定 AssetId，原 speed 映射 `frameRate`。
- `rngPaletteId`、运行时 `getPalette(non-zero)` 和 RNG 外部 manifest 全部删除。
- `rng`、`video` 在成功物化与引用改写后从 `manifest.assets.legacy.families` 删除。

### 5.3 作者所有权

- 迁移资源首次修改前显示“原版迁移”。
- 第一次替换视频或修改帧动画后，AssetId 不变，record 改为 `origin.kind = authored`，路径转入 `assets/authored/**`。
- MG2 以 AssetId + origin 判所有权；重迁只能更新仍属于 `legacy-migrated` 的记录。
- 删除未引用资源时同时删除 catalog 记录与其物理文件；有引用时禁用删除并列出引用者。

## 6. 工作台 UI

### 6.1 三栏布局

```text
┌────────────左侧────────────┬──────────────中间工作区──────────────┬────────右侧────────┐
│ 视频列表                  │ 视频:黑底内嵌播放器 + controls       │ 公共属性           │
│ 搜索 / 导入 / 计数        │                                      │ 文件与媒体信息     │
│                           │ 帧动画:预览画布 + 播放控制            │ 引用列表           │
│ 帧动画列表                │          + 底部时间轴                 │ 替换 / 删除        │
│ 搜索 / 新建 / 计数        │                                      │ 诊断               │
└───────────────────────────┴──────────────────────────────────────┴───────────────────┘
```

- 左侧两个列表纵向排列，可单独滚动；列表项只显示名称和必要状态，不把路径/哈希塞进列表。
- 选中资源只切换中间和右侧内容，不自动播放。
- 保留全局左右面板宽度、折叠和拖动能力。

### 6.2 视频工作区

- 中间为稳定黑底、等比 `object-fit: contain` 的 `<video controls playsInline>`。
- 播放不创建 `position: fixed` 元素，不覆盖整个编辑器。
- 原生 controls 提供播放/暂停、进度、音量和全屏入口；列表预览动作只聚焦中间播放器。
- 右侧显示名称、AssetId、来源、媒体类型、路径、文件大小、分辨率、时长、是否有音轨和引用。
- 支持导入 MP4/WebM、改名、保持 AssetId 替换、受保护删除。
- 第一版不做视频裁切、拼接、转码或抽帧；修改视频内容通过替换文件完成。

### 6.3 帧动画工作区

中间上部：

- 黑底预览画布，像素图使用 nearest-neighbor，可切“适合窗口 / 100%”。
- 播放/暂停、上一帧、下一帧、首尾、循环、当前帧/总帧和当前时间。
- 全局帧率输入；选中帧可设单帧时长。

中间下部时间轴：

- 每个时间轴条目在用户视角和编辑 API 中都是一张完整帧；不能显示或要求编辑关键帧、补丁、脏矩形等存储信息。
- 横向缩略图轨道、时间刻度、播放头和选区。
- 410 帧等大列表必须虚拟化或使用等价可见区渲染，不能一次创建全部缩略图 DOM/canvas。
- 支持插入、替换、复制、删除、拖动重排和多选。
- 每个作者操作进入不可变 Command，可撤销/重做；二进制帧引用结构共享，禁止每步复制整份 30 MB 容器。
- 量化、缩略图生成和 TPFS 重编码放 Worker，主线程保持可交互并展示进度/失败原因。

### 6.4 导入向导

“新建帧动画”接收按自然文件名排序的 PNG/JPEG/WebP 多选序列：

1. 确认画布尺寸、缩放方式和默认帧率。
2. 预览文件排序，可手工重排或排除文件。
3. 选择“保留原色 / 贴合工程标准色彩”。
4. 贴合标准色彩时显示原图与量化结果对照；默认最近色，可选抖动，但不暴露颜色表编号。
5. 确认后创建稳定 AssetId 和编辑草稿，保存时生成 TPFS。

现有迁移动画直接打开为同一种草稿，可逐帧修改，不存在“原版只读模式”。

### 6.5 右侧引用与删除

- 引用必须来自 `collectAssetReferences`，UI 不再自己扫描字符串。
- 每条显示资源用途、场景/共享脚本、命令路径；能定位的引用提供“打开脚本”。
- 帧动画引用额外显示调用区间和帧率；附近音乐/音效只作为编排提示展示。
- 有引用：删除禁用，明确显示引用数和阻塞者。
- 无引用：删除前确认，说明会移除 catalog 记录和工程文件；支持取消，不能单击立即破坏。
- 替换保持 AssetId，因此不需要批量改调用脚本。

## 7. 运行时与编辑器边界

- 运行时 `playVideo` 继续使用全屏 Cinematic Layer，这是游戏表现；编辑器预览使用中间内嵌播放器，两者不能复用同一个 DOM 布局函数。
- `FrameSequenceReader` 解析 TPFS，按目标帧所在 32 帧块随机定位，解码 block Promise 在 `await` 前缓存。
- 运行时只保留当前解压 block 与最多 64 张完整帧的 ImageBitmap/画布 LRU，并预取后续一个 block；
  结束/切工程统一释放。
- 帧动画播放器继续输出到 Cinematic Layer，世界层在下、对话/UI 在上。
- 编辑器使用同一 TPFS 解析/合成纯核，但有自己的 transport、时间轴和草稿模型。

## 8. 分期

### A7-3A 契约与依赖

- 新 `frame-animation` kind、标准颜色表角色、TPFS parser/encoder 和校验。
- `playVideo.asset`、`playFrameAnimation.asset` 与 typed references。
- 现有 palette 0 消费点切到唯一颜色表角色；非 0 运行依赖由 RNG 烘焙消除。

### A7-3B PAL 迁移与运行时

- 6 视频、12 帧动画物化进工程。
- 20 条 RNG 命令改写，运行时 resolver 化。
- MG2 作者替换保护、双跑零计划和外部路径扫描。

### A7-3C 编辑器工作台

- 左侧双列表、中间视频播放器、右侧通用属性/引用/删除。
- 帧动画时间轴、导入向导、量化、编辑命令与保存重开。

### A7-3D 断外链验收

- 临时断开 `data/extracted/videos` 与 `data/extracted/data/animation`。
- HTTP 工程与 FSA 工程均可列表、预览、编辑、保存并由 Reforge 播放。
- 任务只有四段全部通过才可进入 done。

## 9. 验收门禁

- schema、坏容器、路径、hash、kind、引用缺失均 fail-loud。
- TPFS block/XOR/Deflate 逐像素回放与源 RGBA 一致；随机 seek 与顺序播放一致。
- 任意 TPFS 帧加载到编辑器后都是完整画布；修改任意帧再保存重开保持逐像素一致，且 UI/作者草稿不含
  block、XOR 或压缩概念。
- 20 条 PAL 动画调用和 6 个视频记录数量精确；9 个被引用动画与 3 个未引用动画口径精确。
- 视频/RNG 作者替换后 MG2 连跑两次仍保留 authored 记录，第二次零计划。
- 新增、替换、改名、重排帧、删除未引用项、阻止删除已引用项、保存重开全覆盖。
- 6010 在桌面与窄视口检查无重叠、长名称可截断、键盘焦点可见、图标按钮有可访问名称。
- 6051 播放代表性全段、分段、不同帧率、对话叠层与视频音轨；离开后无 DOM/音频/对象 URL 泄漏。
- 静态扫描运行时和编辑器中的 `/extracted/videos`、`/extracted/data/animation`、`playRng`、`chunkIdx`、`videoId` 为 0。

## 10. 明确不做

- 不把 BGM/SFX 嵌入帧动画资产。
- 不做完整剧情非线性剪辑器；时间轴只编辑帧动画本体，剧情编排仍由脚本负责。
- 不做浏览器内视频转码、裁切和拼接。
- 不保留 RNG/TPFS 双运行时、数字 id fallback 或外部路径兜底。
- 不在 A7-3 完成时冒充整个 A7 已完成；其他资源族仍按 A7-1/A7-2/A7-4 收口。

## 11. 实现结果(2026-07-16)

- A7-3A：`frame-animation`、`visual.standardColorTable`、稳定过场命令、typed 引用与 TPFS v1 已落地；
  parser/encoder 覆盖坏头、坏索引、坏块、坏长度、逐像素往返和流式 provider。
- A7-3B：PAL 已物化 6 视频、12 TPFS、1,464 帧并迁移 20 条命令；Reforge 只经 AssetResolver 播放，
  容器/block Promise 在 await 前缓存，完整帧 LRU 上限 64；旧 RNG 双运行时已删除。
- A7-3C：三栏工作台、视频 CRUD、帧动画导入/完整帧编辑/多选/时长/量化/Worker 保存、引用与删除保护
  已落地。410 帧动画时间轴实测只保留 12-15 个可见 DOM 条目。
- A7-3D：临时改名断开两个外部视频/RNG 目录后，6010 仍能播放视频并打开 410 帧动画；6051 `s066`
  实际全段播放、正常结束切场景和空格跳过清理通过。MG2 dry-run 为零计划。
- 第一阶段 `packages/game` 的 trademark fallback 属忠实还原参考引擎，不是第二阶段 Reforge 产品依赖；
  chunk 6 已物化为稳定资产，未来第二阶段商标流程不得回退到原版 chunk 读取。
