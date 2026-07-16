# P0 · 内容 Schema + 迁移器（设计初稿）

> 状态：草案（2026-06-18 起草）。第二阶段铁律见 [READ-FIRST.md](../READ-FIRST.md)；总纲见 [roadmap.md](../roadmap.md)；议题池见 [design-backlog.md](../design-backlog.md)。
> 本文定义**新引擎（reforge）与编辑器（editor）共用的内容数据模型**，以及从 `data/extracted/` 一次性迁移的方案。是 P1 / P2 的地基。
>
> **每条决策的「为什么旧引擎不行」证据**见 [engine-debt-audit.md](engine-debt-audit.md)（文末有「schema 决策 ↔ finding」反查表）。本文只定「应该长什么样」，那份定「为什么必须这样」。

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

## 5. 地图 Schema（尺寸可变 + 多层 + 实例高度 + 碰撞层）

> ✅ **ProjectMapV2 已落地（2026-07-14，W7F）**：W7D 的 OwnMap v1 与 W7E 的双格式兼容
> 方案均已被本节取代。旧 packed Tilemap 只允许出现在 pal-extract 和 migrate 的输入侧；
> content、reforge、editor 只接受 `ProjectMapV2`。

```jsonc
{
  "version": 2,
  "width": 24,
  "height": 24,
  "tilesetId": "tileset-020",
  "layers": [
    {
      "id": "floor",
      "name": "地板",
      "depthMode": "height",
      "tiles": [/* 2 * height 行 × width 列；tileId | null */],
      "heights": [/* 同尺寸；每次放置实例自己的非负整数高度 */]
    }
  ],
  "collision": [/* 同尺寸；0 可通行，非 0 阻挡/预留地形类型 */]
}
```

`layers` 数组序就是 z 序，编辑/引用使用稳定 `layer.id`；错排 lattice 行奇偶只负责几何，
不再暴露旧格式 `h`。角色按逻辑格行走时，该格对应的两个子格碰撞值任一非 0 即阻挡。
`depthMode: "height"` 的瓦片实例按自己的高度参与遮挡；`flat` 层高度恒为 0，可省略
`heights`。任何 `null` 瓦片的高度都必须为 0。

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
- PAL 的 223 张旧地图由 migrate 一次性转换成独立 V2 文件；编辑器和运行时不得在打开时猜格式或
  临时升级。旧工程必须先经过显式迁移，再进入编辑器。
- editor/reforge 先读 index，再按 map id 懒加载正文；显示地图列表不得解析全工程地图。
- 非法/绝对/越界 path、重复 id/path、未知 `mapId`、索引缺文件和输出路径碰撞全部 fail-loud，
  禁止猜测修复或静默覆盖。

突破原版「2 视觉层」+「定长尺寸」两重天花板，泛化成：

- **尺寸可变（每图自带 width/height）**：原版被 C 定长数组 `Tiles[128][64][2]`（sdlpal map.h:61，提取器 `map.ts:15` 把 64×128 写死成常量）焊成恒定 64×128，小场景也背满 8192 空格。新引擎把尺寸当**每张图自带的数据**，不是全局常量。**两个层次划清**：①每图一个有限矩形网格、尺寸可变 = **现在就做**（渲染 / 碰撞本就按 width/height 跑，近乎白送；小场景所见即所得，大场景突破天花板，编辑器画多大就是多大）；②超大无缝世界 / 分块（chunk）流式加载 = MMO 级，**现在不做、只留口**（别把「一张地图 = 单个有限 cells 网格、坐标单一原点」焊死到将来加不进分块）。
- **N 个视觉层**：每层带 z 序（画的先后）和深度模式；原版两层只是迁移输入中的一个特例。
- **实例高度**：高度与坐标、图层、这次瓦片放置绑定，不属于瓦片元数据；同一 tileId 可在不同格使用不同高度。
- **独立碰撞 / 地形层**：不止「能不能走」，每格可带地形类型、移动属性、触发区。把原版藏在 tile 里的障碍 bit 独立出来（呼应你说的「算三层」）。
- **真立交 / 楼层**：靠「多层 + 每层可行走性 + 角色当前所在层」表达，不再 fake 成两张图。**schema 现在留足表达力；角色跨层行走的引擎实现是 P1 的活。**
- 字段：宽高尺寸（每图自带，非全局常量）、每层瓦片引用、瓦片集素材引用。

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
- 未迁移的资源族只能集中在 `manifest.assets.legacy` 债务区。同一资源族不能同时出现在 catalog 与 legacy；
  A7-0 后音乐和 soundfont 已完全退出 legacy。
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

## tileset 注册表(W7B,2026-07-10 落地)

`manifest.content.tilesets` → `content/tilesets.json`:数组,条目 `{id, name, category, path}`。
- `id` 稳定身份(不含 `/`);`path` = 资产相对路径(`.rle` = gzip GOP 索引帧组,与原版 tileset 同构)。
- 上传管线:PNG → 网格切片 → **量化贴盘 0**(D25 第 4 条;最近邻,alpha<128 透明)→
  `encodeSpriteChunk` + gzip 落盘 —— 存索引 1B/px,不烘 RGBA(D25 第 2 条),渲染与
  原版同一条「索引帧 + 盘 0 → bake」单路。
- `ProjectMapV2.tilesetId` 必须引用注册表稳定 id，不允许路径直通。
- tileset 只描述图像资源，不拥有地图放置实例的高度；禁止恢复 `tileId -> height` 映射。
