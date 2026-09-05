# 编辑器整体架构设计(第二阶段 · 内容编辑器)

> 第二阶段 Reforge。2026-07-01 头脑风暴(用户 + Claude)+ 两份代码投查(渲染复用 / 数据模型)。
> **本文件 = 整个编辑器的架构设计(防返工用),非某一期实现。** 先读 [READ-FIRST](../READ-FIRST.md);工程地基见 [project-design.md](project-design.md)。
> 状态:设计(待用户审)。分工:核心/地基(非视觉)可交 GLM,壳+模式(canvas 视觉)Claude 做。

> 2026-08-15：本文件继续负责编辑器产品/数据/模式架构；视觉、组件、响应式、媒体、无障碍和验收的
> normative candidate 已迁到 [`editor-design-system-v1.md`](editor-design-system-v1.md)。两者冲突时，
> 先判断是产品架构还是界面合同；界面合同以新规范为准。

## 0. 这是什么 / 不是什么

**是**:一个网页版可视化内容编辑器(独立 vite app,`packages/editor`),把 `projects/<id>/` 的工程 JSON 变成「可视化编辑 → 落盘 → 游戏生效」。编辑器按业务域组织为八个一级模块;场景、地图等画布型模块保留中心画布和工具模式,表格型模块使用各自的权威编辑页。

**不是**:不是画像素的美术工具(精灵图复用原版,不新画);不是新引擎(渲染**复用** reforge,不重写);MVP 不是全功能(先一个模式跑通闭环)。

## 1. 决策记录(已拍板)

| 决策点 | 选择 | 理由 |
|---|---|---|
| UI 技术栈 | **React**(+ Vite + TS) | 用户拍板;文档/AI 支持最好。canvas 部分与框架无关。 |
| 落盘 | **File System Access API** | 授权一次文件夹直接读写;编辑器保持独立 app(非 dev-only);Chromium 专用(用户即是)。 |
| 渲染 | **复用 reforge**,不重写 | 投查确认 blitter(含遮挡算法)100% 原样可用;重写=双份维护+必然漂移。 |
| 交互模型 | **模式化外壳**(中心画布 + 模式切换 + 随模式变的面板) | 成熟做法(RPG Maker/Tiled/Godot);解掉「拖动歧义」——手势归当前模式管。 |
| 编辑状态 | **command/undo 模型第一天就进** | 最大返工点:后加 undo = 每个模式重写。 |
| `shared` 依赖 | **仅保留图像解码债**(编辑器经 reforge 间接使用 RleFrame/Palette) | W7F 已切断旧地图类型；剩余资产格式债按 D18 后续处理。 |
| B0 地基分工 | **GLM 做**(非视觉:补出口/schema/校验/command-undo 核);B1 视觉壳 Claude | 同 A 期分工;core 纯 TS 可 TDD。 |
| 精灵引用 | **语义注册表 `sprites.json`**(id→spriteNum+label);`EntityDef.sprite` 引用其 id | 保持语义 id(非裸数字)+ 给选择器人读标签 + 修引擎写死 2/16。 |
| MVP 模式数 | **只「布置」一个模式** | 已够压满五根地基;其余模式往壳里加,不返工。 |

## 2. 包 / 依赖形状

```
editor  (React vite app,新建)
├─ 依赖 content   ← schema + grid 数学 + validate(本就设计成 reforge+editor 共享)
├─ 依赖 reforge   ← 复用渲染器 / assets 加载 / loader(需先给 reforge 补包出口,见 §3)
│   └─(经 reforge 间接拉进 shared 的冻结图像类型 RleFrame/Palette —— 接受的 D18 债)
└─ src/
   ├─ core/     ← 纯 TS,无 React:编辑会话、command/undo 引擎、跨引用校验、工程 I/O(File System Access)
   ├─ render/   ← 画布视口:包 reforge 的 Canvas2DRenderer + 场景绘制 + 编辑器叠加层(网格/选中框/手柄)
   ├─ modes/    ← 每个模式一个插件(见 §5)
   ├─ ui/       ← React 外壳(布局 / 模式切换 / Inspector / 对话框 / 校验面板)
   └─ main.tsx
```

> **边界**:`core/` 是纯逻辑(可单测、无 React、无 DOM),React 只是它的视图——沿用本仓「纯逻辑与视图分离」惯例(如 reforge 的 state 机)。编辑器**不碰 game/pal-extract**；地图只使用 content 的当前 `ProjectMap` v4，组合直接复用其 `IsometricMapContent`，旧 packed Tilemap 只存在于 migrate 输入侧。

## 3. 渲染复用(第一根地基)—— 投查结论

reforge 的渲染是纯 blitter,零游戏状态耦合。复用需三步(都不重写逻辑):

1. **reforge 提供稳定包出口**：导出 `Canvas2DRenderer`、场景绘制类型、ProjectMap v4 地图加载/渲染、tileset registry、sprite/palette 资产加载、项目 loader 和碰撞查询；editor 不复制引擎逻辑。
2. **抽「画一帧场景」函数**:把 `main.ts:288-323`(clear → 定相机 → 组 `SpriteDraw[]` → scale+`renderScene`)抽成 `renderSceneFrame(ctx, renderer, {map, room, camera, sprites})`,reforge 自己的 main 也改调它(去重,单一真源)。
3. **editor 的 vite.config 复制 `serveDir` 中间件**(`/projects`、`/extracted` → 仓库根目录;和 game/reforge 同款,可抽成共享 vite 插件)。

- `content/grid.ts`(`gridToPixel/pixelToGrid/spriteScreenY` + `GridPos`)本就是纯叶子、共享设计,编辑器直接 import 做落点/命中测试。
- **注意缓存**:`Canvas2DRenderer` 按 palette/tileset 缓存烤图，换视觉资产须重建或失效 renderer；地图正文由 map id 独立懒加载，不与 tileset 路径混作身份。

## 4. 编辑会话 + 撤销/重做(第二根、也是最大返工点)

- **`EditSession`**(core,纯 TS):持有工程的**可变工作副本**(scenes/characters/skills/items/locale + manifest)+ 脏文件集 + undo/redo 栈。
- **所有改动 = `Command`**:`{ do(state), undo(state), label }`(或 patch+反 patch)。改任何东西都经 `session.dispatch(cmd)` —— 统一驱动 undo/redo、脏标记、「改完自动重画」。
- **铁律**:模式**不得**直接 mutate 数据,一律发 Command。否则以后加 undo = 全模式重写。
- React 经 `useSyncExternalStore` 订阅 session → 状态变则重渲染(面板 + 画布)。
- 纯 TS + 无 React → **重度单测**(command do/undo 往返、脏标记、栈边界)。这是地基,测厚。

## 5. 模式即插件的外壳(第三根)

```ts
interface EditorMode {
  id: string; label: string; icon?: ...
  onCanvasPointer(ev, ctx): void      // 画布手势 → dispatch command(仅当前模式生效 → 无歧义)
  renderOverlay(ctx, view): void       // 模式专属画布叠加(选中框/手柄/网格)
  Panel: React.FC                      // 侧面板(该模式的 Inspector/工具)
  Toolbar?: React.FC
}
```

- **外壳**管:画布视口(平移/缩放 + 复用渲染器画底图)、当前模式、选中态、command 派发、模式切换 UI、校验面板、保存。
- **模式**只贡献:画布手势含义 + 叠加层 + 侧面板。加模式 = 往注册表加一个,**不动壳**。
- 这正面回答用户的顾虑:要「工具列表」= 模式切换;拖动只在「布置模式」里生效,切到别的模式含义就变,彼此不打架。

### 5.1 一级模块与稳定深链(ED-2,2026-07-14)

“模式”只描述画布内工具行为,不再承担整个产品的信息架构。编辑器顶层固定为八个业务模块:

| 模块 | 稳定 id | 当前权威子页 |
|---|---|---|
| 场景 | `scene` | 场景工作区、氛围 |
| 地图 | `map` | 地图工作区、瓦片集 |
| 剧情 | `story` | 共享脚本、变量、指令手册 |
| 角色 | `actor` | 角色工作区 |
| 物品 | `item` | 物品、商店 |
| 战斗 | `battle` | 技能、敌人、毒、战场 |
| 资源 | `asset` | 精灵、音乐、过场素材 |
| 工程 | `project` | 概览、全局资源与启动、入口与开局、问题 |

- 唯一注册表位于 `packages/editor/src/ui/editor-navigation.ts`;一级导航、二级导航、URL 解析和覆盖测试均由它派生。旧 `DataMode` 仅保留为内部页面适配器,不再是可见一级模块。
- 统一位置类型为 `EditorLocation { module, subpage, objectId? }`,URL 形式为 `?module=<id>&page=<id>&object=<encoded-id>`。业务入口只能通过统一导航函数跳转,不得自行维护第二套路由状态。
- 普通跳转写入浏览器历史,初始化和归一化使用 replace,`popstate` 经同一 decoder 恢复。非法 module/subpage 回安全默认页;合法页面中的失效 `objectId` 显示明确空态,不得偷选数组第 0 项。
- 每个模块记忆最后子页、对象和合理的滚动位置;导航展开/折叠与现有分栏尺寸属于本地 UI 偏好。内容数据和选中对象的业务真值仍归 `EditSession`,不写入 localStorage。
- 每个业务页面只能在一个模块中登记一次,每模块可见子页不超过 5 个。引用处只深链到权威页,不得复制表单形成双真值。

### 5.2 单一新版地图库与场景绑定（W7F，2026-07-14）

- `EditorState.mapIndex` 保存完整 `MapIndexV1`，`state.maps` 以稳定 map id 为键；文件 path 只在
  序列化和磁盘回退时由 index 解析。
- 地图模块不再依赖“当前场景地图”才能工作：左栏列出全部地图，支持搜索、新建、深复制、改显示名、
  删除和按使用场景跳转；零引用地图也能编辑并保存重开。
- 场景检查器通过 `SceneDef.mapId` 选择已有地图，并提供创建并绑定、复制并绑定和打开地图。不存在
  “原版复用图”或只读分支；迁移图与作者图是同一种可编辑文档。多场景可共享一图。
- 创建、复制、改名、绑定、删除均走不可变 Command；删除命令同时维护 index、内存地图和文件 diff，
  被场景引用时先列出引用并阻止。ED-3 已由 current-author `ProjectReferenceIndex` 接管该判断，包含
  `scene.mapId` 与 canonical `setSceneMapOverride`；原 `mapAssetSceneReferences` 窄反查已删除。
- 编辑器启动只加载 map index；选择地图时异步 hydrate 正文。干净文档受 LRU 管理，脏文档和仍被
  undo/redo 栈引用的文档固定驻留；hydrate 不进入撤销历史。
- 保存、clone 与 ZIP 对未加载地图按原始字节 copy-through，不为输出而全量解析；修改过的地图使用
  content 公共包的确定性格式化器。运行时同样只按当前 `mapId` 懒加载。
- 图层列表与图层尺共享一个 currentLayerId；高度尺的值既是聚焦条件，也是下一笔的实例高度。图层作者顺序由
  公共排序手柄、键盘与精确移动按钮共同维护；领域 adapter 保留顶部优先的显示语义，锁定层不可移动，一次落位
  只产生一条地图 command 或一条组合 draft-history 更新。
  当前层/高度正常显示，其余瓦片变暗；吸管同时读取 tileId 与实例高度，聚焦状态不写入内容文件。

### 5.2.1 地图内容选择、Inspector 与可逆变换（W8，2026-07-18）

- 地图工作区的四条状态轴必须正交：瓦片面板素材、待盖图章模板、地图已有内容选区、活动图层不可复用同一状态。`MapSelection` 以稳定 `VisualSlotRef {layerId,row,col}` 和去重 `GridPointRef {row,col}` 分别表示视觉槽/独立碰撞格，按 mapId 存于临时 `MapWorkspaceState`，不进 `EditorState`、JSON、URL 或 undo 栈。
- 专用 select 工具支持 replace/Shift-add/Ctrl-or-Cmd-toggle/Esc/`Ctrl|Cmd+A`。`Ctrl|Cmd`
  命中的内容尚未全部入选时整批追加，已全部入选时整批移除；因此既能逐次组出不规则集合，又不会在框选部分重叠时意外反选旧成员。默认只命中活动层，“跨层选择”是显式 scope 开关且不改已有选区。全选只收集活动层非空视觉槽和非零碰撞格，不枚举无内容空格。
- 单击命中与渲染共用 `projectMapTileBlitRect` 和 `RleFrame.opaque`：活动层内高大 tile 的不透明像素源格优先于光标逻辑格；跨层像素只进 Alt 候选。候选固定按面板层自上而下，同层按 row/col；键盘可导航，Esc 返回 canvas。选区叠加同时画源格菱形与实际图像边界。
- 隐藏层不可见/不可命中/不可写，锁定层可见但普通命中和所有写入均禁止；聚焦/淡化和碰撞叠加显隐仅影响显示，不影响 hit policy 或“变换含碰撞”开关。活动层隐藏/锁定时不偷换层，而是显式进入只读并给出原因。
- Inspector 把 tileset 来源、tileId、实例 height 和 collision 分通道呈现/写入，多值显示“混合”。所有非空
  图层实例均可编辑高度；null 格没有来源且高度必须为 0。字段旁与全局底栏都有精确反馈，但只由底栏承担
  live region，避免辅助技术重复播报。
- 所有 Inspector/变换持久修改都走 channel-aware `ApplyProjectMapPatchCommand`：先完整校验坐标、图层、
  tile/source lockstep、隐藏/锁定权限和重复写入，再一次应用；失败零写入，invert 同时恢复视觉、来源、高度与
  碰撞 prev。no-op Command 不入 history、不置脏、不清 redo；undo/redo 执行失败不丢栈顶。
- 结构化地图剪贴板保留相对错排坐标、稳定图层映射、tilesetId/tileId/height 和显式 included/excluded
  collision；移动、复制、剪切、粘贴、重复、删除均先生成完整预览/冲突计划，取消/覆盖不静默，每个用户动作
  只一笔 undo。变换预览期间 Inspector 与破坏性快捷键被锁定。
- W8 只在 selection 代数类型中预留 `stamp-placement`。W7G 若要实现“保存重开后仍能整章选中”，必须另开三签 schema 任务持久化非链接 placement group；不得从相邻普通格猜组，不得让模板暗中回写已有放置。

实现、测试矩阵和 27%/103% 浏览器证据统一记录在 [W8 任务卡](../../ops/tasks/W8-map-content-selection-inspector.md)。

### 5.2.2 地图/组合共享编辑面与来源面板（2026-08-19）

- 地图与组合的中央区域直接渲染同一个 `IsometricEditorCanvas`，共享 base cache、裁剪、网格、图层显隐、
  pointer lattice 与 `IsometricEditorToolbar`；组合只提供锚点/局部选择 overlay，不准再建 adapter 或私有 renderer。
- 组合没有“查看/编辑”双状态：选中模板即进入同一编辑面，属性承载名称/分类/稳定 id/尺寸/锚点，引用独立成 Tab；
  图层控件复用地图版本。所有草稿只在“保存组合”时提交一笔 command，取消/离开先确认。
- 右栏“绘制”Tab 上下排列瓦片与组合。瓦片区先选择来源瓦片集，再从共享 `TilePickerGrid` 选 tile；默认侧栏宽度
  一行五项。地图和组合都能在同一次编辑中使用多个来源，来源切换只影响下一笔。
- 组合高度是相对 H，地图高度是绝对 H；共享工具栏仍只展示一个绘制高度选项。放置 ghost 与提交必须共用
  `base + relative` 解析，避免预览和落图漂移。

### 5.3 音乐资源工作台(A7-0,2026-07-15)

“资源 -> 音乐”是音乐的唯一权威编辑页，数据源是 `EditorState.assetCatalog`，不再维护
`content/music.json` 或数字别名表。

- 列表明确分开显示可编辑名称、稳定 AssetId、工程相对路径和操作；名称不充当 id，id 也不推导路径。
- 导入只接受有效 MIDI，使用浏览器 SHA-256 生成 `music.authored.<hash>` 和
  `assets/authored/<hash>.mid`；替换保留原 AssetId，只更新记录/字节，因此所有场景和脚本引用保持稳定。
- 改名、导入、替换、删除全部是不可变 Command，可 undo/redo。删除前复用 typed 引用 walker；有引用时
  禁止删除并展示引用数量，未引用条目才可删除。
- 场景检查器、脚本命令表单和共享脚本抽屉都复用同一 `MusicPicker`；“延续上一曲”“停止音乐”和具体
  AssetId 是三种不同语义，不能再用 `0` 或空字符串混写。
- 编辑器试听与游戏 BGM 共用 reforge 的 BGM player 和当前工程 `AssetResolver`，MIDI 与 soundfont 均从
  当前 `FileSource` 读取。全局只保留一条试听通道，切曲会停止前一首。
- serialize/save 同时写 `assets/index.json` 与 pending blob；本地 v2 工程先单向升级为 v3 再进入工作态。

浏览器验收以 6010 的 PAL 工程为准：86 首均显示 label/id/path；至少两首可切换试听；改名可撤销；
引用保护与未引用删除状态正确。完整闭包数据见
[`a7-0-music-resource-closure-report.md`](../foundation/a7-0-music-resource-closure-report.md)。

### 5.4 过场资源工作台(A7-3,2026-07-16)

“资源 -> 过场素材”由统一 catalog 派生，不再是 `/extracted` 浏览器：

- 左侧是可独立滚动、可搜索和导入的视频/帧动画双列表；中间按类型显示黑底原生视频播放器或完整帧时间轴；
  右侧显示名称、AssetId、来源、文件、媒体信息、typed 引用、替换、删除和诊断。
- 视频支持 MP4/WebM 导入、改名、保持 AssetId 替换与引用安全删除。编辑器播放器留在中间面板；游戏运行时
  仍使用 Cinematic Layer。
- 帧动画导入 PNG/JPEG/WebP 序列，初始自然排序，导入前可逐张上移、下移或排除；时间轴支持播放、帧率/
  单帧时长、插入、替换、多选、复制、删除、公共手柄重排和局部撤销/重做。手柄位于帧卡片内左上角，选择区与
  排序命中区分离；拖动、键盘和前后移动按钮共用一次 draft-history commit，并按稳定 frame id 保持多选与活动帧。
- 作者始终编辑完整 RGBA8 画布；时间轴只渲染可见缩略图。批量量化与 TPFS 重编码在 Worker 中完成，
  未修改旧帧保持惰性来源引用，保存时才恢复完整帧并自动压缩。
- “保留原色 / 工程标准色彩”只决定完整帧像素；不显示 palette 编号。标准色彩来自
  `visual.standardColorTable` 角色。
- 有未保存帧编辑时切换资源必须确认；有 typed 引用的资源禁删，无引用资源确认删除。首次修改迁移资产后
  AssetId 不变，路径转 `assets/authored/**`、来源转 authored，受 MG2 所有权保护。

完整格式、边界与验证矩阵见
[`cutscene-asset-workbench-design.md`](cutscene-asset-workbench-design.md)。

### 5.5 战斗精灵资源库(A7-3B,2026-07-21，done)

“资源 -> 精灵库”先按“大世界 / 战斗”切资源域；战斗域内再按“语义定义 / 二进制资源”切生命周期，
URL 使用 `domain=battle&view=definition|asset&object=<id>`，诊断和消费者跳转必须落到具体域、视图和对象。

- 左侧列表提供搜索、profile 过滤、共享/未引用状态和稳定选择回退；定义切到资源视图时聚焦当前定义实际引用的
  AssetId，不能回落到排序首项。中间面板复用运行时 indexed-RLE 解码，展示动画、逐帧尺寸与 profile 命名动作；
  右侧编辑标签、动作 ABI、来源/SHA、typed 引用与独立删除动作。
- Actor、Enemy、召唤、梦蛇、脚本 appearance 和装备 effect 使用 profile-aware picker；就地上传是
  `import asset + create definition + assign consumer` 的单一可撤销命令，不暴露 number/path 输入。
- 替换共享二进制前显示全部消费者，默认 no-shrink；stale SHA、路径冲突、消费者变化和越界 profile 均
  fail-closed。删除定义与删除未使用二进制是两个命令，save/undo/save/redo 保持 record、bytes 和引用一致。
- 长 AssetId/path 使用可换行或省略布局；窄面板不允许按钮文字溢出。输入框、视图切换和命名动作均提供
  accessible name/pressed state，键盘焦点与现有蓝色控件风格一致。

完整实现与验证见
[`A7-3B 任务卡`](../../ops/tasks/A7-3B-battle-sprite-asset-closure.md)。

### 5.6 manifest 项目工作台（X7-1；ARCH-ENTRYPOINT-CANONICAL-1 于 2026-08-22 更新）

“项目”模块固定为四个权威子页：概览、全局资源与启动、入口与开局、问题。不得再把
`startWorld` 暴露成与入口点并列的独立作者模块。

- “入口与开局”只列 `manifest.entryPoints` 中的真实入口，按稳定 `EntryPoint.id` 选择和深链接；每项在同一
  详情中编辑 `label`、`scene`、`introVideo` 与完整 `startWorld`。`manifest.defaultEntryId` 仅用徽标和
  “设为直接启动项”动作指出无 `menu` / `entry` 参数时使用哪一个真实入口，不产生额外的伪入口。
- `entryPoints` 必填且非空，每个入口的 `startWorld` 都必填、完整、自包含。入口之间没有继承、跟随、覆盖或
  隐式同步；新建 / 复制时可以一次性深拷贝当前入口作为起点，保存后两项完全独立。若未来需要持续共享，应另建
  有名字、有引用和解绑闭环的显式 preset，不能把 `defaultEntryId` 当父入口。
- `manifest` 字段只有一个作者：项目页拥有 `name`、`defaultEntryId`、`entryPoints` 和 `assets.roles`；资源页
  拥有 catalog 与二进制；场景/脚本页拥有 hooks 内的视频、RNG、BGM 和剧情编排。当前 manifest 不含顶层
  `entryScene` 或顶层 `startWorld`。
- “全局资源与启动”页由唯一的 typed role registry 生成角色、分组、中文名、类型、必选条件和帮助文案；角色
  数量与分组数量不得写死。已配置数量只是摘要，必选性和健康状态由同一 registry 与 validator 决定，不能
  要求可选角色全部存在。music / sound 在 AssetId 存在且 kind 正确时提供原位试听，并与音乐库、音效库共用
  一个编辑器试听 owner；video 提供资源页直达，SoundFont 和 color-table 明确标注当前只能绑定 catalog 已有项。
- “全局资源与启动”页只负责资源角色，不重复入口表或运行时启动链。概览固定用“默认开局”“标题菜单”“启动资源”
  三张人话卡说明队伍、金钱、库存、入口、视频与资源健康，并只提供“入口与开局”“全局资源与启动”两个编辑
  目的地；不得常驻显示 scene / role / query 等机器路径。默认入口的场景健康必须消费统一 diagnostics，不能在
  卡片里另写一套场景存在性判断。
- 开局队伍是有序列表，通过标题右侧的公共添加按钮打开搜索弹窗，选择角色并明确确认；正式 item 可用公共手柄、
  键盘或精确按钮调整顺序并原位移出。初始库存和初始世界资源使用同一“按钮 → 搜索选择 → 确认”合同，不得常驻
  宽下拉框、使用 checkbox 墙或默认添加第一项。集合为空时在面板正文居中说明，并根据 live 候选区分“可从右上角
  添加”与“当前没有可添加对象”，不重复标题区数量。队伍、库存、世界资源和当前 HP/MP 每个离散动作只提交一条
  `SetStartupEntriesCommand`。候选行必须帮助作者在确认前辨认对象：队员显示真实 face / portrait、稳定 ID、等级
  与当前/最大 HP/MP；道具显示真实 item icon、稳定 ID、简短用途和能力；世界资源没有独立资产模型，只显示真实
  使用方与抽取语义，禁止用物品图或装饰图标冒充资源图片。所有候选行保持固定两行，ID 不能被长说明先截掉。
  字段草稿继续服从共享 draft / validate / commit / cancel / resync 合同。角色
  初始技能仍由 `ActorDef.initialMagic` 唯一持有，入口页不得恢复技能快照。
- 每名开局队员在同一行显示“当前状态”摘要，并由一个共享弹层编辑中毒、可携带定时状态和临时毒抗。
  弹层使用中文名称与效果说明，不显示 `tickIndex`、`extraPoisonRes` 或裸状态枚举；“傀儡”不得出现在
  大世界携带选项。草稿取消/对象切换产生零命令，最终保存最多一条命令；移出队员时 HP/MP seed 与
  condition seed 必须在同一条命令中原子清除并可一次 undo 恢复。
- 剧情脚本对后续入队角色使用独立的“施加/清除角色当前状态”结构化表单；典型流程是先 `setParty`，再按
  稳定 ActorId 施加。该表单与入口弹层消费同一 condition registry 和毒引用目录，不建立页面私有词表。
- `?module=project&page=entrypoint` 无 object 时定位 `defaultEntryId` 命中的入口；附
  `object=<EntryPoint.id>` 定位指定真实入口。历史
  `page=startworld` 只做 URL 兼容归一化到 `entrypoint`，不保留旧页面。
- 保存前统一校验入口表非空、id 唯一、`defaultEntryId` 命中、入口 scene、每套 StartWorld 引用、资源角色与
  typed 资产闭包，错误按稳定入口 id 跳回字段的唯一作者。contentVersion 19 不合成入口、不接受旧顶层字段，
  也不保留任何 contentVersion 1..18 upgrader 或 fallback。
- “问题”页只消费统一 diagnostics，并按严重度、问题类型与资源类型分组；项目身份和版本信息归“概览”，
  不在问题页重复。locale 编辑与状态归未来独立本地化工作台，问题页不建立第二个入口。

### 5.7 有序作者集合与效果链（ED-REORDER-DRAG-1，2026-08-26）

- 物品使用/投掷/装备效果、技能基础/执行效果、毒回合、敌人 AI、商店货单与角色伤亡分支都是作者有序数据；
  它们统一使用 item 内公共 grip、键盘排序和公共精确移动按钮。领域页面只能适配 insert/swap/反向 stack/同父级
  等既有语义，不能再写私有上下箭头、`≡`、整行 native draggable 或 pointer 状态机。
- 普通效果链按 occurrence token 区分重复值，固定敌队槽使用 swap 且保留空槽，脚本命令只在同父级移动，
  behavior/hook/action 的显式 `order` 每次重排归一化为 `0..n-1`。一次落位只产生一条领域 command；原位、取消、
  revision/对象变化产生零命令，undo/redo 对称。
- 资源帧拖入动作槽仍是 copy transfer，不属于排序；地图实体坐标、面板 resize、视口 pan/zoom、成员归属和按等级
  派生顺序同样排除。生产采用矩阵与证据型 allowlist 是边界真源，不能从“底层恰好是数组”推导新交互能力。

### 5.8 统一工程引用边与安全删除地基（ED-3，2026-09-05 done）

- 引用能力固定为四层：content typed leaf rule 只识别 schema 语义；editor adapter 补稳定 target/source、
  relation、结构化 locator 和 delete policy；同一 builder 同时供 revision Worker 与破坏动作的同步
  current-author oracle；页面只用既有 Reference UI 呈现和跳转。`where` 是可读路径，不是身份或导航协议。
- 同步索引覆盖 scene/map/shop、asset、actor/item/skill/enemy/poison、battle field/team/ambience、
  entity address、world variable、behavior/hook/shared script 及 world/battle sprite；旧领域 Worker DTO、
  页面私有 scanner、媒体 `where/site` 解析与 App 专用 handler 已退役。
- 地图正文保持懒加载，不塞回 Worker。session 级 map/stamp facts 生成带 path/revision/generation/coverage 的
  edge batch；partial、failure、迟到读取和在途 hydrate 均不能授权删除。Tileset/Stamp 的领域 proof 继续
  额外约束 bytes/SHA/definition/frame/placement，并在 apply/redo 同步复核。
- 引用索引是当前 revision 的非持久化派生物，不写 graph 文件、不改 content20/SAVE8，也不保留旧版本 fallback。
  场景生命周期已由 ED-SCENE-LIFECYCLE-1 收口，商店生命周期已实现、待 ED-SHOP-LIFECYCLE-1 终审；页面继续共用
  collector/locator/policy。
- 场景生命周期使用 `SceneIndexV1`：目录和所有场景选择器显示 `name + SceneId`，Scene Inspector 复用
  `DsInspectorTabs + DsReferencePanel`；新建/复制/危险删除使用 `DsListHeader` 与 `DsDialog`。名称只改目录
  元数据；复制共享地图/资产并通过 content typed transformer 改写复制体内部显式自引用；删除在 UI 与
  command apply/redo 两层消费 ED-3 current exact proof。列表内容区无额外面板内边距，表单仍使用标准
  Inspector 属性间距。

### 5.9 商店生命周期（ED-SHOP-LIFECYCLE-1，2026-09-05 review）

- 保持现有货单派生目录标题和列表样式；Hero是复制、独立试买、删除的唯一动作owner。商店只存稳定数值id与
  有序items，复制保留重复项，新增id取max+1（空目录为0），redo固定首次捕获的id/货单。统计“种类”按去重数，
  不对真实货单去重。首店登记manifest路径，删空仍保存空表，undo恢复原位。
- 引用页复用ED-3与公共Inspector/Reference组件；只有current+index且无buy引用才允许确认，Command每次apply/redo
  冷复核current main+script作者态。sell的历史shop值不形成引用；不级联修改脚本或物品。
- PAL重迁沿用原有按id三方合并和纯theirs baseline。固定1..20/29buy/6sell/源Store0边界校验只约束生成种子；
  作者target按当前ShopDef结构和真实buy/货单物品引用校验，合法id0、增删店/指令与空表不再被固定census拒绝。
  item268/270原保护保持独立；content20/SAVE8不变。
- 独立试买沿同源play页加载已保存项目；有任何未保存作者改动时禁止开始并显示原因。公共弹窗用
  `DsFieldGroup + DsReadoutList + DsNumberField` 配置一次性金钱；正式`openShopUi/shopInput/shopBuy/drawShop`
  处理菜单、确认与结算，启动早分支不建立世界/SaveStore、不跑剧情。320×200菜单按可用窗口取1..4整数倍率；
  Escape退出清理输入/绘制，所有本次金钱与背包丢弃。它不是通用X5前置状态配置，也不改变旧试打/试放策略。

## 6. 校验层(第四根)—— 编辑器的核心价值

现 `content/validate.ts` 只查形状。**投查在 demo 数据里当场抓到 2 个悬空引用**:`skills.json` 的 `levelUp` 指向不存在的技能(349/311/…);土灵珠(267)的 `grantSkill` 指向不存在的 336。形状校验放过了它们。

→ 在 **content 加 `validateReferences(project): Issue[]`**(跨引用完整性,是模型知识、引擎 loader 也能用来告警):
- `EntityDef.interact` → 同场景 `Dialogue.id` 存在;
- `DialogueLine.text/.speaker` → `locale` 键存在(否则渲染成生 id);
- `startWorld.party` / `ActorDef.battler.initialMagic` / `inventory` / `equipableBy` / `grantSkill.skillId` / `LevelUpSkill.skillId` / `SkillCost.items` → 目标表 id 存在;
- 系统未落地的字段(`poisonId`/`triggerScript`/`teleport.target`)→ 标「未校验/进阶」,不误报。

编辑器加载/编辑/存盘时跑,结果进底部校验面板(可跳转)。**不做这层,编辑器只会把坏数据越积越多**。

## 7. Schema 缺口(第五根)—— 现在在 content 补

投查发现 schema 对「编辑」不完整,这俩是 MVP 阻塞项(不是可选):

1. **精灵解析**:`EntityDef.sprite`("ghost")**无解析表**,引擎自己写死 2/16([main.ts:180-183](../../../packages/reforge/src/main.ts#L180))。
   → 加**精灵注册表**(新 content 文件 `sprites.json`,进 manifest.content):`{ id, spriteNum, label }[]`。`EntityDef.sprite` 引用其 id;引擎 loader 据此解析(修掉硬编码);编辑器精灵选择器按 `label` 显示 + 渲染 `.rle` 预览(复用现 `?gallery` 调试逻辑)。
2. **场景调色板**:`SceneDef` **无调色板字段**,现靠 `?pal=` URL 兜([main.ts:123-124](../../../packages/reforge/src/main.ts#L123))。
   → 加 `SceneDef.paletteId: number`(默认 0 向后兼容)。引擎读它(去掉 URL hack);编辑器场景面板改它。

> 顺带修引擎潜伏坑。另记一个待修:菜单取角色名用 `` `name.${template}` `` 拼键而非读 `CharacterTemplate.name`([main.ts:235](../../../packages/reforge/src/main.ts#L235) 等 4 处)——编辑器数据模式要么钉死 `name === "name."+id` 不变式,要么先把这 4 处改成读 `.name`。

## 8. 坐标系 + 叠加层归属(已知复杂点,非新地基)

**两套坐标**:`SceneDef.map.room` = 老矩形瓦片格(32×16);`EntityDef.pos`/`entry.pos` = 菱形轴 `GridPos`(col/row/height,经 `gridToPixel`)。编辑器的画布渲染(复用 reforge)已正确处理两者;**命中测试/点击落点**要:实体放置用 `pixelToGrid`(菱形),房间裁剪框用瓦片格——`render/` 层同时管两套。`grid.ts` 提供菱形数学。

**渲染 vs 逻辑的边界(叠加层归属)**:网格 / 禁入(碰撞)格 / 进场点这些**可视化是编辑器的事,玩家端游戏从不画** → 编辑器 `render/` 画在「复用的场景底图」之上(叠加层)。但**碰撞逻辑留引擎**:`isBlockedAt`/`pixelToGrid`(reforge `collision.ts`)算哪格禁入——编辑器**复用**它(import,不重写)来决定画哪些禁入格,保证「编辑器显示的禁入 = 游戏真正用的判定」,同一套、不漂移。→ 复用面再加一处 `collision.ts`(§3)。引擎现有的 `DEBUG_COLLISION` 叠加层([main.ts:406-444](../../../packages/reforge/src/main.ts#L406))是编辑器前的临时拐杖,以后冗余,可当清理删(或留作无害 dev flag)。

## 9. 落盘 + 回读闭环

- **File System Access**:开工程时请求 `projects/<id>/` 目录句柄(句柄存 IndexedDB 便于再授权)。保存时按脏文件集只写变的 JSON。
- **闭环**:编辑器画布**已实时显示场景**(复用渲染器)→ 保存写盘 → 游戏(reforge dev,另一标签页)刷新 → loader 重取 JSON → 看到变化。
- **实跑预览**留后期(嵌 reforge 在编辑器内跑);MVP 用「另开标签页刷新」够。

## 10. 模式集 & 分期(历史实施基线)

本节记录编辑器早期从零搭建时的实施顺序。当前产品信息架构以 §5.1 的八个一级模块为准;下文“数据表模式”等名称不再代表可见一级导航。

**模式全集**:布置(实体/进场点/地图·调色板引用)· **角色**(统一 ActorDef:名字/头像/精灵帧标注/battler —— 见 [actor-model-design](../foundation/actor-model-design.md),C1)· 事件对话(对话 + locale 双写)· 数据表(技能/物品)· 地图(刷瓦片,最重)。

**分期**(每期一份 writing-plans 实现计划):

- **B0 · 地基就位**(多为非视觉 → 可 GLM):§3 reforge 补出口 + 抽 `renderSceneFrame`;§7 两个 schema 缺口(sprites 注册表 + scene 调色板)+ §6 `validateReferences`(都在 content,TDD);editor app 脚手架(React+Vite+serveDir);§4 EditSession + command/undo 核(纯 TS,TDD)。
- **B1 · 布置模式 MVP**(canvas 视觉 → Claude):外壳(画布视口 + 复用渲染 + 叠加层)+ 布置模式(选中/拖动/改属性/增删实体 + 改进场点)+ Inspector + File System Access 保存 + 校验面板。**验收**:可视化改 demo 场景 → 存 → 游戏刷新看到变化;undo/redo 通;控制台 0 报错;Claude 浏览器实测。
- **B2+**:事件对话模式 → 数据表模式 → 地图模式。每期只往壳加模式,不返工。

## 10.5 实体的动态模型(真实需求;B2 与事件系统一起设计)

现 `EntityDef` 是**扁平静态**(一个固定 pos/sprite)。真实 RPG 内容里实体是**条件+动态**的:同一实体按剧情标志在不同位置出现 / 不出现、跑不同巡逻脚本(原版 PAL 就有;一阶段做过 autoScript/waypoints + 全局事件)。这需要:

- **全局变量系统**:剧情标志 / 开关 / 计数器(一张新表)。
- **实体条件状态(pages,RPG Maker 那套)**:一个实体 = 一个或多个「状态」,每个挂一个变量条件 + 各自的 位置/精灵/行为/事件;引擎从上往下选**第一个条件成立**的状态(自动互斥)。**范围 = 同一场景内**——同一张图里按 flag 换位置/精灵/行为/对话或隐藏(位置也只在这张图坐标系里挪)。
  - ⚠ **层次边界(错不得)**:状态挂 entity、entity 挂 scene。**跨场景的「同一 NPC」不是多状态**——那是各场景各自的独立 entity(可各自引用同一「角色/actor」共享精灵/名字,免重复)。即「同场景条件变体 → 多状态(A);跨场景 → 各放各的」。所以「一实体多状态(A)」vs「多个同貌实体按变量激活(B)」之争**只在同场景内**——那里 A 赢(自动互斥 / 单一 id / 去重);跨场景根本不是 A/B 之争。
- **行为/巡逻**:状态上挂行为(静止 / 巡逻路点 / …),port 一阶段 autoScript。

**架构能否接住(关键结论)**:**贵的地基零返工**——模式壳 / command-undo / 校验 / 包拓扑 / 渲染复用**都与 schema 无关**:加全局变量 = `EditorState` 多一字段(加法);加巡逻路点 = 画布多一个 `renderOverlay`(壳本就留了);编条件/状态 = Inspector 多一个区。**便宜的是 `EntityDef` 数据形状长大**(扁 → 条件状态 + 行为),这该**和事件/变量系统一起设计(B2)**,现在盲定 schema 反而易错=更大返工。→ 结论:不是返工,是「地基已接住,数据模型按计划分期长」。

**对 B1 布置模式的约束**:按「实体有 pos/sprite」做,但**不把『实体=单状态』焊死**——Inspector 给「状态」留位、命令按「某状态的 pos」设计接口口径,以后加条件/巡逻是扩展非重写。

## 11. UI 布局(React 外壳)—— 当前约束

**布局定稿**:见 mockup [place-mode.html](mockups/place-mode.html)(2026-07-01 与用户逐版对齐 v1→v3)。5 区,IA 遵循 Godot / Tiled / RPG Maker 惯例。

- **顶栏**(应用级):工程名 · 撤销/重做 · 保存(脏标记)。
- **左·模块导航**:场景/地图/剧情/角色/物品/战斗/资源/工程八个一级入口;展开时显示图标+中文名,折叠时只显示固定尺寸图标和 tooltip。窄窗口可强制折叠,不得覆盖画布或检查器。
- **模块子导航**:只显示当前模块的 1-4 个真实权威子页;不为凑数创建空页,也不恢复“数据”总容器。
- **左·Outliner(对象树)**:「场景里有什么」= 场景根 → 进场点 → 各实体;`＋` 加实体在此;下接图层/显隐。
- **中·工具栏 + 画布**:工具栏放**动作/工具**(选择·移动 / 添加实体 / 删除)+ 视图开关(网格 / 禁入 / 选中置顶 / 亮度);画布复用渲染器画场景 + 模式叠加层。
- **右·Inspector**:**只放当前选中项的属性**(选实体→实体属性;选场景根→地图/调色板/进场点)。留 `▸ 状态/条件` 折叠位给 §10.5 的 B2。
- **底·状态条**:统一汇总内容跨表引用、manifest/入口不变式和资产闭包诊断；有待处理项时显示数量与摘要，只有零项时显示“引用与工程诊断无问题”。这里消费同 revision 的 diagnostics snapshot 与统一 `ProjectReferenceIndex`，不在状态条另建扫描器；异步地图正文引用另由带完整 coverage/revision 的 proof batch 提供，partial/failed 不得冒充零引用。

**IA 铁律(v1/v2 违反过,记牢)**:① Inspector 只放选中项属性,全局动作(增/删)一律进工具栏 / 对象树头;② 「场景里有什么」进 Outliner,不塞 Inspector;③ 选谁右侧就显谁。所有编辑动作 = Command → undo/redo(接 §4)。像素细节留 B1 实现时浏览器实测 + 逐版微调。

> 具体像素级布局(哪块多宽、面板长什么样)开 B1 前单独出 mockup 与用户逐版对齐(新 UI 惯例)。

## 12. 测试策略

- **core**(EditSession/command/undo/校验/工程 I/O)= 纯 TS,vitest 重度单测(地基,测厚)。
- **renderSceneFrame**(reforge)= 抽出后加 smoke/回归测。
- **render/ + React UI** = 轻单测 + Claude 浏览器实测(+ 后期 Playwright e2e)。

## 13. 待定 / 后期(不阻塞)

- 打包发布编辑器(File System Access 生产可用,但工程发现机制同引擎选单一起做)。
- 嵌 reforge 实跑预览(MVP 用刷新标签页)。
- 地图模式的瓦片调色板 UI(最重,最后)。
- zod 替换手写 guard(同引擎 §9 待定)。
- Firefox/Safari 降级(拖拽/导出 zip)——现只保 Chromium。

## 14. Self-Review

1. **防返工五根地基全立**:渲染复用 / command-undo / 模式插件壳 / 校验层 / schema 补口——每一根都是「做错要推翻」的点,现在定死。✅
2. **投查落地**:渲染可复用(补出口+抽函数)、schema 两缺口、2 个悬空引用样本,全进设计。✅
3. **范围克制**:MVP = 单模式,但压满五根地基;其余模式只往壳加。✅
4. **分工清晰**:B0 非视觉可 GLM,B1 视觉 Claude;core 纯 TS 可测。✅
5. **决策成文**:React / File System Access / 复用 reforge / 接受 shared 债——都有理由。✅
6. **未过度设计**:不做美术工具、不重写引擎、不先解 D18 大迁移、不先做实跑预览/打包发布。✅
