# 编辑器架构与工作台合同

类型：现行规范（current）。当前产品为 contentVersion 20 / SAVE8；格式与实现以源码常量和校验器为准。
本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/editor-design.md)，不作为当前执行入口。

## 模式即插件的外壳(第三根)

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

### 一级模块与稳定深链(ED-2,2026-07-14)

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

### 单一新版地图库与场景绑定（W7F，2026-07-14）

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

### 地图内容选择、Inspector 与可逆变换（W8，2026-07-18）

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

实现、测试矩阵和 27%/103% 浏览器证据统一记录在 [W8 任务卡](../../ops/archive/tasks/done/W8-map-content-selection-inspector.md)。

### 地图/组合共享编辑面与来源面板（2026-08-19）

- 地图与组合的中央区域直接渲染同一个 `IsometricEditorCanvas`，共享 base cache、裁剪、网格、图层显隐、
  pointer lattice 与 `IsometricEditorToolbar`；组合只提供锚点/局部选择 overlay，不准再建 adapter 或私有 renderer。
- 组合没有“查看/编辑”双状态：选中模板即进入同一编辑面，属性承载名称/分类/稳定 id/尺寸/锚点，引用独立成 Tab；
  图层控件复用地图版本。所有草稿只在“保存组合”时提交一笔 command，取消/离开先确认。
- 右栏“绘制”Tab 上下排列瓦片与组合。瓦片区先选择来源瓦片集，再从共享 `TilePickerGrid` 选 tile；默认侧栏宽度
  一行五项。地图和组合都能在同一次编辑中使用多个来源，来源切换只影响下一笔。
- 组合高度是相对 H，地图高度是绝对 H；共享工具栏仍只展示一个绘制高度选项。放置 ghost 与提交必须共用
  `base + relative` 解析，避免预览和落图漂移。

### 音乐资源工作台(A7-0,2026-07-15)

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
[`a7-0-music-resource-closure-report.md`](../archive/audits/a7-0-music-resource-closure-report.md)。

### 过场资源工作台(A7-3,2026-07-16)

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
[`cutscene-asset-workbench-design.md`](../archive/designs/cutscene-asset-workbench-design.md)。

### 战斗精灵资源库(A7-3B,2026-07-21，done)

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
[`A7-3B 任务卡`](../../ops/archive/tasks/done/A7-3B-battle-sprite-asset-closure.md)。

### manifest 项目工作台（X7-1；ARCH-ENTRYPOINT-CANONICAL-1 于 2026-08-22 更新）

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
  typed 资产闭包，错误按稳定入口 id 跳回字段的唯一作者。contentVersion 20 不合成入口、不接受旧顶层字段，
  也不保留任何 contentVersion 1..18 upgrader 或 fallback。
- “问题”页只消费统一 diagnostics，并按严重度、问题类型与资源类型分组；项目身份和版本信息归“概览”，
  不在问题页重复。locale 编辑与状态归未来独立本地化工作台，问题页不建立第二个入口。

### 有序作者集合与效果链（ED-REORDER-DRAG-1，2026-08-26）

- 物品使用/投掷/装备效果、技能基础/执行效果、毒回合、敌人 AI、商店货单与角色伤亡分支都是作者有序数据；
  它们统一使用 item 内公共 grip、键盘排序和公共精确移动按钮。领域页面只能适配 insert/swap/反向 stack/同父级
  等既有语义，不能再写私有上下箭头、`≡`、整行 native draggable 或 pointer 状态机。
- 普通效果链按 occurrence token 区分重复值，固定敌队槽使用 swap 且保留空槽，脚本命令只在同父级移动，
  behavior/hook/action 的显式 `order` 每次重排归一化为 `0..n-1`。一次落位只产生一条领域 command；原位、取消、
  revision/对象变化产生零命令，undo/redo 对称。
- 资源帧拖入动作槽仍是 copy transfer，不属于排序；地图实体坐标、面板 resize、视口 pan/zoom、成员归属和按等级
  派生顺序同样排除。生产采用矩阵与证据型 allowlist 是边界真源，不能从“底层恰好是数组”推导新交互能力。

### 统一工程引用边与安全删除地基（ED-3，2026-09-05 done）

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
  场景生命周期已由 ED-SCENE-LIFECYCLE-1 收口，商店 ED-SHOP-LIFECYCLE-1 三方终审、720宽补验与用户验收通过并收口；页面继续共用
  collector/locator/policy。
- 场景生命周期使用 `SceneIndexV1`：目录和所有场景选择器显示 `name + SceneId`，Scene Inspector 复用
  `DsInspectorTabs + DsReferencePanel`；新建/复制/危险删除使用 `DsListHeader` 与 `DsDialog`。名称只改目录
  元数据；复制共享地图/资产并通过 content typed transformer 改写复制体内部显式自引用；删除在 UI 与
  command apply/redo 两层消费 ED-3 current exact proof。列表内容区无额外面板内边距，表单仍使用标准
  Inspector 属性间距。

### 商店生命周期（ED-SHOP-LIFECYCLE-1，2026-09-05 done）

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

## UI 布局(React 外壳)—— 当前约束

现行布局、组件尺寸、响应式和操作层级统一遵守 [编辑器设计系统](editor-design-system.md)。
早期 HTML 草案只作为归档背景，不承担当前像素规范。

- **顶栏**(应用级):工程名 · 撤销/重做 · 保存(脏标记)。
- **左·模块导航**:场景/地图/剧情/角色/物品/战斗/资源/工程八个一级入口;展开时显示图标+中文名,折叠时只显示固定尺寸图标和 tooltip。窄窗口可强制折叠,不得覆盖画布或检查器。
- **模块子导航**:只显示当前模块的 1-4 个真实权威子页;不为凑数创建空页,也不恢复“数据”总容器。
- **左·Outliner(对象树)**:「场景里有什么」= 场景根 → 进场点 → 各实体;`＋` 加实体在此;下接图层/显隐。
- **中·工具栏 + 画布**:工具栏放**动作/工具**(选择·移动 / 添加实体 / 删除)+ 视图开关(网格 / 禁入 / 选中置顶 / 亮度);画布复用渲染器画场景 + 模式叠加层。
- **右·Inspector**：承载当前选中对象的属性、行为与引用，按通用 Inspector 合同呈现；不恢复旧调色板字段或早期 B2 占位。
- **底·状态条**:统一汇总内容跨表引用、manifest/入口不变式和资产闭包诊断；有待处理项时显示数量与摘要，只有零项时显示“引用与工程诊断无问题”。这里消费同 revision 的 diagnostics snapshot 与统一 `ProjectReferenceIndex`，不在状态条另建扫描器；异步地图正文引用另由带完整 coverage/revision 的 proof batch 提供，partial/failed 不得冒充零引用。

对象列表负责目录选择，Inspector 跟随当前对象；项目、目录与对象操作按设计系统分配。
作者数据修改继续通过领域命令与对应会话进入撤销历史，布局或视图临时状态不混入内容数据。
