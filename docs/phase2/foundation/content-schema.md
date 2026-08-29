# P0 · 内容 Schema + 迁移器（设计初稿）

> 状态：草案（2026-06-18 起草）。第二阶段铁律见 [READ-FIRST.md](../READ-FIRST.md)；总纲见 [roadmap.md](../roadmap.md)；议题池见 [design-backlog.md](../design-backlog.md)。
> 本文定义**新引擎（reforge）与编辑器（editor）共用的内容数据模型**，以及从 `data/extracted/` 一次性迁移的方案。是 P1 / P2 的地基。
>
> **每条决策的「为什么旧引擎不行」证据**见 [engine-debt-audit.md](engine-debt-audit.md)（文末有「schema 决策 ↔ finding」反查表）。本文只定「应该长什么样」，那份定「为什么必须这样」。

## 当前 canonical 项目入口（contentVersion 19，2026-08-30）

当前产品只接受 contentVersion 19。`manifest.entryPoints` 必填且非空；每个真实入口完整保存稳定 `id`、
显示名、启动场景、可选开场视频和必填 `StartWorld`。`manifest.defaultEntryId` 必须命中其中一项，只决定无
`menu` / `entry` 参数时直接启动哪一项；它不是父入口或模板。当前 manifest 不含顶层 `entryScene`、顶层
`startWorld`，入口间也没有继承、合成或 fallback。SAVE 版本独立保持 8，payload 记录完整世界与位置，不记录入口 id。

角色初始化同样只有一组权威输入：`ActorDef.battler` 持有初始等级、当前/最大 HP/MP 基线、基础属性、
初始装备与初始技能；新实例经验固定从 0 开始。`StartWorld` 只持有队伍与顺序、金钱、库存、世界资源，
以及可选的 `seedStats[actorId].hp/mp` **当前值**稀疏覆盖和
`seedConditions[actorId]` 当前临时状态快照。condition seed 只允许引用该入口的开局队员，包含稳定
`PoisonDef.id`、单一 registry 中可携带的定时状态与临时毒抗；`puppet` 不可携带，毒从
`tickIndex = 0` 开始。`buildWorld` 只在新建世界时消费一次，读档不重播种。入口不保存最大值、属性、
装备或技能副本。新游戏和后续首次入队仅在 `WorldState.learnedSkills[instanceId] === undefined` 时从
`ActorDef.battler.initialMagic` 深拷贝播种；学习、遗忘、离队/归队和读档均继续以运行时世界态为准。

角色当前 condition 的运行时 owner 始终是 `CharacterInstance` 的 `poisons`、`extraStatuses`、
`extraPoisonRes` 三个 carrier。大世界不自行衰减；进入战斗时复制，战后清除定时状态与临时毒抗并只解到
`severe`（`incurable` 保留），从存档恢复时则对 party 与 reserve 全部清除，包括不可解毒。剧情变化使用
稳定 ActorId 的显式施加/清除命令，`setParty` 仍只负责阵容，不隐式播种或清理 condition。

旧内容版本 1..18、旧顶层字段、可选入口表和缺省 StartWorld 不属于当前输入合同；开发期历史由 Git 保存，不在产品
loader、editor 或 migrate publication 中保留 upgrader。

## 0. 这份文档定下什么（大白话）

一句话：**给「游戏内容」定一套干净的存放格式，再把原版内容搬进来。** 具体八件事：

1. 东西怎么分三层放（跟存档走的 / 属于某场景的 / 临时的）
2. 每个东西怎么起稳定名字（加删不串号）
3. 一张看得懂的「世界开关表」（剧情进度 / 时间 / 天气）
4. 一个「场景」里装什么（自包含）
5. 地图怎么存（多层 + 碰撞层）
6. 演出和触发器怎么存（时间线 + 触发分离）
7. 整个内容工程的目录长什么样
8. 怎么把原版内容搬进来（迁移器）

> 门外读者：看每节第一句和大白话即可，表格 / 字段是给实现用的。

## 1. 三层状态模型

新引擎的一切数据分三层，**这条边界是第二阶段最重要的设计**：

- **L1 世界态（存档层）** —— 跟着存档走、贯穿整局：队伍、角色属性（实例 + 组件模型，见 §9）、背包、金钱、经验，加上**世界变量**（剧情开关 / 时间 / 天气，见 §3）和**对象状态覆盖**（某 NPC 被剧情改成了什么样）。
- **L2 场景静态定义（内容层）** —— **编辑器编的就是这层**，只读、可版本化：一个场景的地图、对象初始摆放、脚本、演出、触发器。
- **L3 场景运行态（临时层）** —— 进场景时把 L2 静态定义 + L1 世界态合出来的「活」对象 + 演出播放状态 + UI，**出场景就扔**。

原则：**加载一个场景，只加载它的 L2 + 用到的素材；跨场景的影响一律走 L1。** 这就是「场景自包含」。

## 2. 稳定身份（杜绝下标）

铁律：**任何东西的身份都是稳定 id / 语义名，绝不用「数组第几个」。**

- 对象、场景、脚本、变量、演出各有稳定 id（人类可读语义名，如 `inn-keeper`，或 uuid）。
- 跨场景引用 = 稳定 ref，如 `scene:water-moon-palace / obj:inn-keeper`。
- 好处：加删内容不牵动别人；引用看得懂、能在编辑器里点选；可 diff。
- 迁移器负责把原版全局下标，一次性翻译成稳定 id（见 §8）。

## 3. 世界变量层（看得懂的开关）

原版没有集中的剧情变量，进度全靠「对象状态」隐式记。新引擎**显式化**为一张命名世界变量表：

- **种类**：剧情开关（拿到剑了 = true）、时间（流动的时刻 / 天数）、天气（晴 / 雨 / …）、任意自定义变量。
- **谁用**：事件 / 演出 / 触发器可读写；渲染 / 场景可订阅响应（时间 → 光照，天气 → 画面）。
- **意义**：编剧情写「if 拿到剑」而不是「if 第 247 号对象状态 == 2」；时间、天气也只是世界变量的特例，统一机制。

## 4. 场景包（自包含）

一个场景 = 一个自包含的包：

```
scene = {
  id, name,
  mapId: <稳定地图 id，见 §5>,
  entities: [ <实体：稳定 id、位置、精灵、可选 碰撞 / 交互 / AI…> ],
  cutscenes:[ <脚本 / 演出，见 §6> ],
  triggers: [ <触发器，见 §6> ],
  entry: <进场 / 归隐入口>,
}
```

**统一 entity 模型（重要）**：场景里一切「独立摆放的东西」—— 桌椅花瓶、宝箱、NPC、怪 —— 都是同一种 **entity**，区别只是挂了哪些可选组件：纯装饰（只有精灵）、挡路（+ 碰撞）、可交互（+ 脚本）、会动（+ AI / 移动）。这样原版割裂的「装饰 tile」和「EventObject」合一了（怎么选 tile 还是 entity，见 §5 末）。

加载只碰这个包 + 它引用的素材。跨场景影响 → 改 L1 世界态 / 世界变量，别的场景下次加载自然反映。

## 5. 共享等距内容与 ProjectMap v4（尺寸可变 + 多来源 + 实例高度 + 碰撞层）

> ✅ **ProjectMap v4 / 共享等距内容已落地（2026-08-19，ED-STAMP-MAP-MODEL-1 +
> ED-MAP-MULTI-TILESET-1）**：地图和组合直接消费同一个 `IsometricMapContent`；旧 packed Tilemap
> 只允许出现在 pal-extract 和 migrate 输入侧，v2/v3、单 `tilesetId`、`depthMode` 与兼容 upgrader
> 均已从 content、reforge、editor 当前版本删除。

```jsonc
{
  "version": 4,
  "width": 24,
  "height": 24,
  "tilesetRefs": ["tileset-001", "tileset-020"],
  "layers": [
    {
      "id": "floor",
      "name": "地板",
      "tiles": [/* 2 * height 行 × width 列；tileId | null */],
      "sources": [/* 同尺寸；tilesetRefs 下标 | null */],
      "heights": [/* 同尺寸；每次放置实例自己的非负整数高度 */]
    }
  ],
  "collision": [/* 同尺寸；0 可通行，非 0 阻挡/预留地形类型 */]
}
```

`layers` 数组序就是 z/tie-break 序，编辑/引用使用稳定 `layer.id`；错排 lattice 行奇偶只负责几何，
不再暴露旧格式 `h`。`tilesetRefs` 按稳定 id 字典序排列；`sources` 与 `tiles` 同形并 lockstep，
非空来源值指向 `tilesetRefs`。单来源文档落盘时可省略完全可推导的 `sources`，加载后仍物化为完整矩阵；
多来源文档必须显式保存。全 0 `heights` 同样可省略。任何 `null` 瓦片的来源必须为 `null`、高度必须为 0。
所有图层的非空瓦片都按实例实际高度参与遮挡，不存在 `flat | height` 图层分叉。角色按逻辑格行走时，
该格对应的两个子格碰撞值任一非 0 即阻挡。

组合模板不是第二种地图文档，而是带 `id/name/origin/category/anchor` envelope 的局部
`IsometricMapContent<number|null>`：地图 `heights` 是绝对高度，组合 `heights` 是相对高度，放置唯一公式为
`actualHeight = placementBaseHeight + relativeHeight`。组合 nullable collision 中 `null` 表示不参与放置，
`0` 表示显式可通行；地图 collision 则是完整 number 矩阵。

### 5.1 地图资产注册与场景绑定（W7F，2026-07-14）

地图的稳定身份不由文件路径或场景反向推导。`contentVersion: 2` 工程必须通过
`manifest.content.maps` 指向 `content/maps/index.json`：

```jsonc
{
  "version": 1,
  "maps": [
    { "id": "home", "name": "家", "path": "content/maps/home.json" }
  ]
}
```

- `MapAssetDefV1.id` 是场景、编辑器和缓存使用的稳定身份；`name` 可改，`path` 只负责存储。
- `SceneDef.mapId` 直接保存稳定 id，例如 `"home"`；不存在原版复用、自有地图或路径引用分支。
- 注册表是资产发现真值。没有任何场景引用的地图仍须加载到编辑器、参与保存、克隆和 ZIP 导出。
- PAL 的 223 张旧地图由 migrate 一次性转换成独立 v4 文件；编辑器和运行时不得在打开时猜格式或
  临时升级。旧工程必须先经过显式迁移，再进入编辑器。
- editor/reforge 先读 index，再按 map id 懒加载正文；显示地图列表不得解析全工程地图。
- 非法/绝对/越界 path、重复 id/path、未知 `mapId`、索引缺文件和输出路径碰撞全部 fail-loud，
  禁止猜测修复或静默覆盖。

突破原版「2 视觉层」+「定长尺寸」两重天花板，泛化成：

- **尺寸可变（每图自带 width/height）**：原版被 C 定长数组 `Tiles[128][64][2]`（sdlpal map.h:61，提取器 `map.ts:15` 把 64×128 写死成常量）焊成恒定 64×128，小场景也背满 8192 空格。新引擎把尺寸当**每张图自带的数据**，不是全局常量。**两个层次划清**：①每图一个有限矩形网格、尺寸可变 = **现在就做**（渲染 / 碰撞本就按 width/height 跑，近乎白送；小场景所见即所得，大场景突破天花板，编辑器画多大就是多大）；②超大无缝世界 / 分块（chunk）流式加载 = MMO 级，**现在不做、只留口**（别把「一张地图 = 单个有限 cells 网格、坐标单一原点」焊死到将来加不进分块）。
- **N 个视觉层**：数组序仅负责 z/tie-break；每层有稳定 id，原版两层只是迁移输入中的一个特例。
- **实例高度**：高度与坐标、图层、这次瓦片放置绑定，不属于瓦片元数据；同一 tileId 可在不同格使用不同高度。
- **独立碰撞 / 地形层**：不止「能不能走」，每格可带地形类型、移动属性、触发区。把原版藏在 tile 里的障碍 bit 独立出来（呼应你说的「算三层」）。
- **真立交 / 楼层**：靠「多层 + 每层可行走性 + 角色当前所在层」表达，不再 fake 成两张图。**schema 现在留足表达力；角色跨层行走的引擎实现是 P1 的活。**
- **多瓦片来源**：同图同层可以同时放置不同瓦片集的同号 tileId；切换绘制来源不会重新解释已有格。
- 字段：宽高尺寸（每图自带，非全局常量）、每层 tile/source/height 并行矩阵、内容级瓦片集引用表。

### tile（地）还是 entity（物）？

场景两种积木，分工清楚就不纠结：

- **tile 层 = 铺成片的「地」**：地板、水面、墙面、大片重复背景。网格对齐、可复用、能自动拼接。
- **entity（精灵物件）= 一件件独立的「物」**：桌椅、花瓶、宝箱、NPC。任意像素位置、自带锚点 + 遮挡基线、可选碰撞 / 交互 / AI（见 §4）。

口诀：**tile 砌「地基墙面」，entity 摆「家具和活物」。** 桌椅果断用 entity（一张精灵摆上去），不用拆成碎 tile 拼；拿不准默认用 entity，除非是大面积重复背景。

**遮挡**：视觉层和 entity 都带遮挡基线，引擎据此判断谁在角色前。被前景挡住时要不要把前景做半透明 / 给角色描轮廓（现代游戏常见处理）—— 这是 P1 渲染策略，schema 这层只保证「遮挡关系可判定」，见 [backlog](../design-backlog.md) 第 6 条。

## 6. 事件 & 演出建模

把旧引擎杂乱的演出，拆成三块正交的东西：

- **触发器（何时）**：条件（接触 / 范围 / 进场 / 世界变量变化）→ 启动一段演出或脚本。**只管「何时」，不管「演什么」。**
- **演出 / 时间线（演什么）**：一段演出 = 一串语义清晰的动作（action）：淡入淡出、移精灵、等待、显示文本、镜头、改世界变量、黑屏遮罩……可组合、能在编辑器里拖拽编排。
- **黑屏不再是魔法状态**：拆成正交两维 —— ①底层运行策略（冻结 / 继续跑）②遮罩层内容（纯黑 / 黑 + 文字）。你举的三种黑屏 = 这两维的不同组合。
- **原版 opcode 怎么办**（✅ 已决,2026-07-02；R2 于 2026-07-14 收口）：**迁移器把原版脚本翻译成结构化脚本**（[script-system-design](script-system-design.md) 的嵌套 AST），**不建永久 opcode 兼容执行器**。理由：①用户验收原话即「原版数据**经迁移器**进新数据结构」——要的是翻译，不是供旧字节码；②双解释器并存 = [engine-debt-audit](engine-debt-audit.md) P0-5/P0-6（三份 switch / 双解释器语义漂移）的债原样重生，恰是要修掉的不合理；③单人维护两套解释器不现实。可达且不能翻成 clean 命令的源指令只进入迁移期 `MigrationGap` 并阻断写盘；工程内容、编辑器命令目录和运行时均不得出现 `unmigrated` 或原 opcode 占位。旧工程若仍含这类节点，内容校验直接提示重新迁移。

### 6.1 场景脚本运行态

- `SceneDef.onEnter/onTeleport` 是工程里的静态默认绑定；存档中的 `world.script.sceneScriptOverrides[sceneId]`
  只覆写这两个槽，不与 `mapOverride` 混用。
- 每个槽是三态：字段缺席 = 继承静态绑定；`ScriptStage[] | ScriptRef` = 使用运行时覆写；`null` =
  显式禁用，绝不能用 `??` 回退静态绑定。
- 原版 `0x6D` 的 op1/op2 分别迁成 `setSceneOnEnter`/`setSceneOnTeleport`；both-zero 迁成
  `clearSceneScripts`，同时把双槽写成 `null`。
- 旧存档的 `world.script.onTeleport` 在读档时逐场景归一化到新结构；字段冲突、未知槽或异型绑定均拒绝猜测。

### 6.2 场景入场呈现事务(X3-1,2026-07-15)

场景 `onEnter` 的每个活动 stage 可选声明一个显式入场契约:

```ts
interface ScriptStage {
  entry?: {
    prepare: Command[]
    reveal:
      | { kind: 'dither'; ms: number; source: 'previousPresentedFrame' }
      | { kind: 'fade'; outMs: number; inMs: number }
      | { kind: 'cut' }
  }
  body: Command[]
  next?: 'advance' | number
}
```

- 执行顺序唯一且固定:`prepare → reveal → body`。`prepare` 修改的是尚未呈现的目标世界，
  `reveal` 是旧 presented frame 向目标画面的唯一提交边界，对话等正文只能在完成后执行。
- `entry` 只允许出现在 `SceneDef.onEnter` 或 `setSceneOnEnter` 安装的 stage。实体触发、auto、
  onTeleport 和普通共享脚本出现该字段时必须 fail-loud。
- `prepare` 的安全性由 content 命令目录的穷尽分类决定；分支、等待、对话、再次切场景等会
  阻塞或改变控制流的命令不得进入。新增 `Command.kind` 未分类时直接类型检查失败。
- 没有 `entry` 的普通 `loadScene` 仍使用默认淡出/切换/淡入。独立脚本中的 `ditherScreen`
  仍是通用屏幕命令，不会被误当成场景入场元数据。
- PAL 旧数据只在 migrate 边界把 onEnter 的“安全同步前缀 + 早期 `ditherScreen`”一次性
  提升为 `entry`；运行时禁止扫描 body 或穿透 `callScript` 猜入场效果。

迁移范围、反例集和产物门禁见
[`x3-scene-entry-migration-audit.md`](x3-scene-entry-migration-audit.md)。

### 6.3 对话命令(N1-1,2026-07-15)

content、reforge、editor 的唯一对话命令形态为:

```ts
type DialogCommand = { kind: 'dialog'; cue: DialogueCue }

interface DialogueCue {
  speaker?: TextId
  rows: { text: TextId; speed?: number }[]
  autoAdvance?: number
  slot?: 'top' | 'bottom' | 'narration' | 'center'
  portrait?: { icon: number; side: 'left' | 'right' }
  cursorFrame?: 0 | 1 | 2
}
```

- 一条 `row` 是显式行边界；新 locale 正文禁止用换行模拟多行。
- 时间字段均为真实毫秒，不保存 `$NN/~NN` 原参数。
- locale 只允许成对闭合的语义颜色标签；旧 `- ' @ "` toggle 只由 migrate 展开。
- 同一旧文本从不同颜色状态进入时，迁移器生成由内容哈希决定的 `.v-<hash>` 变体 id；命名不得依赖遍历顺序。
- `packages/migrate/src/legacy-dialog.ts` 是唯一旧控制码解码入口。PAL 产物必须重迁；旧作者工程只可在 loader
  边界把旧 `line` 结构单向搬成 cue，内存、保存产物、运行时和编辑器均不得保留双格式。

### 6.4 工程资产注册表与音乐引用(A7-0,2026-07-15)

`contentVersion: 3` 的新资源统一由 `manifest.assets.catalog` 指向 `assets/index.json`。catalog 是
`Record<AssetId, AssetRecordV1>`，每条记录显式保存 `kind/path/mediaType/bytes/sha256/label/origin`；
`AssetId` 是不透明稳定身份，任何消费者都不得从 id 猜文件名或目录。

- `AssetRecord.path` 只允许规范的工程相对路径；绝对路径、URL、盘符、反斜杠、query/fragment、`.` 和 `..`
  全部在 content 公共 guard 中拒绝。
- `manifest.assets.roles` 是封闭的运行角色映射。A7-0/A7-0A 固定五个音频角色：MIDI soundfont、
  默认战斗曲、首领胜利曲、普通胜利曲和标题菜单音乐；角色值仍是 AssetId，不是路径。标题菜单音乐是
  应用壳临时态，不进入 `WorldState.audio.currentMusic`。
- `manifest.assets` 只允许 `catalog` 与封闭的 `roles`；不存在 `assets.legacy`、数字目录或运行时 fallback。
  所有工程资源（包括 effect sprite）都必须先登记稳定 AssetId，再由 resolver/FileSource 读取 catalog 路径。
- `SceneDef.music?: AssetId | null`：缺省延续、字符串切曲、`null` 停曲。`battleMusic` 与
  `startBattle.music` 同样使用 AssetId/null；脚本停曲必须是显式 `stopMusic`，不再用数字 0。
- 持久音乐状态为 `WorldState.audio.currentMusic`。运行时内部不认识 `musicId/battleMusicId`、
  `content/music.json` 或 `sys:music`；v2 数据只允许在一次性升级边界转换为 v3。
- `collectAssetReferences` 与闭包校验负责检查引用存在、kind、文件 bytes 和 SHA-256。未引用资源是 warning，
  缺引用、类型错、缺文件或哈希不符均 fail-loud。

目录所有权固定为：`assets/migrated/**` 由迁移器维护，`assets/authored/**` 由作者维护，
`assets/runtime/**` 保存明确授权的工程运行资源。作者替换时保留 AssetId，只改记录和二进制；MG2 不得把
authored 记录拼回 migrated 字段。完整证据见
[`a7-0-music-resource-closure-report.md`](a7-0-music-resource-closure-report.md)。

### 6.5 视频与完整帧动画(A7-3,2026-07-16)

`video` 与 `frame-animation` 是 catalog 中两种独立的一等资产。视频允许浏览器原生 MP4/WebM；帧动画使用
`application/vnd.type-pal.frame-sequence` 的单文件 TPFS v1。`visual.standardColorTable` 是唯一颜色表角色，
只供迁移与作者量化使用，不进入内容命令。

```ts
type PlayVideoCommand = { kind: 'playVideo'; asset: AssetId }

type PlayFrameAnimationCommand = {
  kind: 'playFrameAnimation'
  asset: AssetId
  startFrame?: number
  endFrame?: number
  frameRate?: number
}
```

- `startFrame/endFrame` 是资产内部闭区间坐标，不是资源身份；越界、负数或 `start > end` 一律 fail-loud。
- `frameRate` 存在时覆盖容器逐帧时长；否则使用单帧 `durationMs`，再回落 `defaultFrameMs`。
- `playRng/chunkIdx/videoId/rngPaletteId` 已退出 content、reforge 和 editor；旧数字只允许在 migrate 输入边界出现。
- TPFS 解码后向作者层交付完整 RGBA8 帧；32 帧 block、XOR 与 Deflate 不进入 schema、脚本、草稿或 UI。
- `collectAssetReferences` 递归收集两类命令，并同时收集 manifest 角色、入口点 `introVideo` 与
  `quitToTitle.videos[]`；校验 `video` / `frame-animation` kind。删除保护和右侧引用面板共用同一张
  typed 边表。同一作者脚本位置拆成多个分段调用时，引用面板按 site 合并并显示调用次数，不伪造多个作者位置。

格式与创作工作台详见
[`cutscene-asset-workbench-design.md`](../editor/cutscene-asset-workbench-design.md)。

### 6.6 大世界精灵索引资源(A7-3W,2026-07-19)

大世界精灵定义与二进制身份严格分层：`SpriteDef.id` 是角色、实体和脚本引用的语义身份，
`SpriteDef.asset` 是到 catalog 二进制记录的唯一边，物理路径只存在于 `AssetRecord.path`。

```ts
interface SpriteDef {
  id: string
  asset: AssetId
  label: string
  layout: SpriteLayout
  poses?: Record<string, PoseDef>
}
```

- canonical 定义不再接受 `spriteNum/path`。Actor、Entity、`setActorSprite`、`setActorAppearance.spriteId`
  和 `setFollowers.sprites` 继续引用 `SpriteDef.id`，不能直接保存 AssetId；
  `WorldScriptState.followers` 同样是 `string[]`。原始数字身份只允许由 migrate 在读取 PAL 原始输入时翻译，
  不进入 current content、编辑器、运行时或存档边界。
- 同一个 `AssetId` 可以被多个 SpriteDef 共享；定义标签与 AssetRecord 标签属于两个独立命名域。
  删除定义必须先检查语义消费者，只有最后一个定义解除引用后才可单独删除二进制记录。
- `kind=sprite` 使用 gzip indexed RLE，mediaType 固定为 `application/vnd.type-pal.rle`。运行时与编辑器
  均经 `SpriteDef.asset -> AssetResolver/FileSource` 读取，并按 AssetRecord SHA-256 失效缓存。
- authored/generated 资源使用 canonical 严格容器规则；`origin=legacy-migrated` 只额外容忍 PAL 历史上
  “连续有效帧前缀 + 全部余槽不可解”的坏尾。兼容由 origin 与结构共同判定，不能按 AssetId 写特例。
- `layout` 是声明语义，不保证历史资产真的拥有声明的全部帧。所有 idle/walk/loop/anim 取帧最终必须用
  实际解码帧数收口；越界候选回到第 0 帧，不能依赖数组访问的隐式 `undefined` 回退。

PAL 冻结基线为 636 个 world sprite catalog 文件、580 个定义、559 个已用二进制、21 条共享关系和
77 个未引用 warning；压缩源共 1,332,725 B、有效帧 4,133，30 个历史坏尾槽。当前工程的所有
sprite/effect/image 读取均为 catalog-only；这组数字仅描述 world sprite 历史审计批次。

### 6.7 战斗精灵索引资源(A7-3B,2026-07-21，done)

战斗精灵同样区分业务定义与物理资产，但定义不是 `{id,asset}` 薄壳：动作帧和播放区段属于战斗表现 ABI，
必须与二进制文件登记分开保存。

```ts
interface BattleSpriteDef {
  id: string
  label: string
  asset: AssetId
  profile:
    | PlayerFighterBattleSpriteProfile
    | EnemyBattleSpriteProfile
    | SummonBattleSpriteProfile
}
```

- `player-fighter` profile 保存待机、濒死、死亡、防御、受伤、施法、攻击等命名帧，以及暂待 A7-3E
  语义化的 `castEffectBase/attackEffectBase`；`enemy` profile 保存连续 idle/magic/attack 区段与 40ms tick
  速度；`summon` 只声明“按全部帧现身”，技能自己的 speed/tint/sound 不进入定义。
- Actor、Enemy、装备效果、持久 appearance、summon、trance 和相关脚本只保存 `BattleSpriteDef.id`。
  `BattleSpriteDef.asset` 是到 `kind=battle-sprite` catalog 记录的唯一物理边；裸数字、path、`godId + 10`
  和按 id 反解路径只允许在 migrate、旧本地工程或旧存档输入边界出现一次。
- 玩家运行时 active appearance 的优先级固定为 base -> persistent -> `EQUIP_SLOT_IDS` 槽序最后覆写 ->
  battle transient trance。图像、动作 ABI 与 effect base 始终读取同一个 active 定义；trance 不因死亡/复活
  清除，战斗结束才恢复战前有效定义。
- 同一 AssetId 可以由多个定义共享；定义删除、二进制删除、替换缩帧和消费者修复是独立且可撤销的生命周期。
  authored/generated 必须通过 canonical indexed-RLE 严格解码；只有 `legacy-migrated` 可容忍 PAL 连续有效
  前缀后的全坏尾槽。
- 工程内容版本仍为 3；存档格式独立升到 v4，把 party/reserve 的持久战斗外观收敛为定义 id。

PAL 冻结结果为 172 个物理文件、171 个定义、179 条直接语义引用、171 个已用定义、5 个共享定义和唯一
未引用资源 enemy 98；压缩源 900,973 B、有效帧 775、历史坏尾槽 6，combined tuple digest 为
`ecbec106c6540de74adeec799bad19a22e7198272245c98b130522b0ac37a685`。本段是战斗精灵切片的历史冻结
结果；当前 content19 工程已完成全资源 catalog-only 收口。

## 7. 内容工程目录结构

独立、版本化（文本 + 稳定排序 + git 友好），初始化 = 迁移器从 `data/extracted/` 灌入：

```
content/
  world/          世界变量定义、角色、数据表（items/spells/enemies/…）
  scenes/<name>/  map / objects / cutscenes / triggers
  shared/         共享脚本 / 演出库
  assets/         sprite / tile / palette …（索引 PNG）
```

**这是独立内容源**，不是 `data/extracted/`（那个会被 `pnpm extract` 覆盖）。

## 8. 迁移器（extracted → content）

一次性导入，把原版内容翻进新格式：

- 拆 `all.json` 全局脚本 → 各场景 + `shared/`，label 局部化。
- `all.json.commands[n]` 的全局脚本地址就是数组下标 `n`；显式 `L_n` 只承担一致性校验，不能作为地址是否存在的前提。
- 全局对象下标 → 稳定 id。
- 素材引用归位到 `assets/`。
- 隐式对象状态记忆 → 尽量翻成显式世界变量；翻不动的保留对象状态机制 + 标注。
- **目标（按第二阶段铁律）**：导入后**能在新引擎正确跑仙剑内容** —— 不是逐状态对齐旧引擎。迁移不完美处先在上游补语义；未知且可达的指令必须阻断生成，不能把待办塞进可执行工程让编辑器或运行时兜底。

`TranslateReport` 的字段口径固定为：

- `notes`：信息性折叠或已知损耗，不阻断生成。
- `knownNoOps`：经一阶段/原引擎真值证明的 no-op，迁移期丢弃并计数。
- `resolved`：已映射为 clean 命令的原 opcode 统计。
- `resolvedAddressTargets`：没有显式 label、但已按 `all.json` 数组地址成功解析的目标及真实命令种类。
- `gaps`：可达且无法翻译的阻塞诊断，必须含源地址、opcode、operands、归属、引用路径和原因。
- `flowCuts`：因未实现控制流而截断的段数；正式 PAL 迁移必须为 0。

## 9. 角色 / 实体状态建模（实例 + 组件 + 外观解耦）

原版把「身份、属性、外观」三件事焊死在 `roleId`（固定 6 槽）上 —— 这正是 MMO 和换装的拦路虎。新引擎拆成三件可独立变化的东西：

- **身份 = 稳定实例 id**（不是「第几号角色槽」）。单机里李逍遥、赵灵儿是预置实例；MMO 里每个玩家 / NPC 都是一个实例。彻底去掉「按 roleId 全局 SoA」那套。
- **状态 = 实例自带的组件**：属性（HP/MP/等级/经验）、装备、技能、buff / 毒，外加**分类标签**（种族 / 门派 / 阵营…，驱动克制与相性，见 [backlog](../design-backlog.md) 第 7 条）。每个实例独立持有 —— 原版「两个队伍槽同一 roleId 共享 HP」的怪问题自然消失。
- **外观 = 由「基础造型 + 装备覆盖」算出来，id 不决定外观**。换装即换外观；武器 / 服装是外观覆盖层。大世界外观、战斗外观只是同一外观模型的两个视图（不再各存一份固定精灵号）。

一次满足三个诉求：**MMO**（实例 id）、**换装**（外观与 id 解耦）、**武器影响外观**（装备驱动覆盖，想在大世界 / 战斗哪显示都行，不受原版限制）。

**单机 / MMO 通用**：角色「模板」（李逍遥的初始数据 = 内容层 L2）与「实例运行态」（当前 HP / 装备 = 世界态 L1）分开。单机里模板 ≈ 预置实例；MMO 里模板是职业 / 原型、实例是每个玩家。**单机阶段就用这套，第三阶段 MMO 不重构** —— 兑现 roadmap「给 MMO 留口」。

## 10. 留给后续（不在 P0 拍死）

- 新事件命令的继续扩展 → P1；原 opcode 兼容层已经明确禁止。
- 多层地图的角色跨层行走 → P1 引擎。
- 演出 action 词汇表的完整清单 → P1 / P2。

## tileset 注册表（W7B；A7-3T done，2026-07-19）

`manifest.content.tilesets` → `content/tilesets.json`:数组,条目精确为
`{id, name, category, asset}`。
- `id` 是地图/组合模板引用的稳定语义身份(不含 `/`)；`asset` 是不透明 AssetId，必须指向 catalog 中
  `kind=tileset` 的记录。物理路径只允许出现在该 AssetRecord，禁止从任一 id 或原版编号推导。
- 唯一加载链为 `ProjectMap.tilesetRefs[] -> TilesetDef.id -> TilesetDef.asset -> AssetRecord.path ->
  AssetResolver -> FileSource`；运行时按引用并集加载 registry，逐格通过 `sources` 解析。canonical 文件是
  gzip 包裹的 GOP 索引帧组，bytes/SHA 描述保存的 gzip 字节。
- `path` 不属于任何 current 产品输入；只有 migrate 读取原始提取结果时可以把来源路径翻译成 AssetRecord。
  canonical content、运行时、编辑器工作态和本地工程打开边界均拒绝 `path | asset` 双轨。
- 上传管线:PNG → 网格切片 → **量化到工程标准色彩**(D25 第 4 条;最近邻,alpha<128 透明)→
  `encodeSpriteChunk` + gzip 落盘 —— 存索引 1B/px,不烘 RGBA(D25 第 2 条),渲染与
  原版同一条「索引帧 + 标准色彩 → bake」单路。tileset 不保存 `paletteId`，编辑器不暴露颜色表选择器。
- `ProjectMap.tilesetRefs[]` 必须引用注册表稳定 id，不允许路径直通；删除任一被地图或组合逐格引用的
  来源必须 fail-loud。
- tileset 只描述图像资源，不拥有地图放置实例的高度；禁止恢复 `tileId -> height` 映射。
