# 内容工程当前格式

类型：现行规范（current）。当前产品为 contentVersion 20 / SAVE8；格式与实现以源码常量和校验器为准。
本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/content-schema.md)，不作为当前执行入口。

## 当前 canonical 项目入口（contentVersion 20，2026-09-05）

当前产品只接受 contentVersion 20。`manifest.entryPoints` 必填且非空；每个真实入口完整保存稳定 `id`、
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

旧内容版本 1..19、旧顶层字段、可选入口表和缺省 StartWorld 不属于当前输入合同；开发期历史由 Git 保存，不在产品
loader、editor 或 migrate publication 中保留 upgrader。

### SceneIndex：发现、名称与路径真值（content20）

`manifest.content.scenes` 指向场景目录，目录内 `index.json` 是唯一的场景发现、作者显示名和正文路径真值：

```jsonc
{
  "version": 1,
  "scenes": [
    { "id": "inn", "name": "余杭客栈", "path": "content/scenes/inn.json" }
  ]
}
```

- `SceneAssetDefV1.id` 是脚本、入口、URL 与存档位置使用的稳定 SceneId；显示名修改不改变它。
- `name` 只属于目录元数据，不进入 `SceneDef` 正文；列出场景不需要加载全部正文。
- `path` 是规范化后的工程相对 JSON 路径。loader、保存、克隆和物理删除只能从 SceneIndex 解析，
  不得从 SceneId 拼接文件名。
- 重复/非法 id、空名称、重复/越界 path、缺正文、正文 id 不符和输出路径冲突全部 fail-loud。
- PAL 初次迁移用地图可读名按稳定场景顺序确定性消歧；之后 publication 以 baseline-first 保留作者修改的
  `name/path`。当前产品不保留 content19 string[] parser、upgrader 或 fallback。

## 共享等距内容与 ProjectMap v4（尺寸可变 + 多来源 + 实例高度 + 碰撞层）

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

### 地图资产注册与场景绑定（W7F，2026-07-14）

地图的稳定身份不由文件路径或场景反向推导。当前 contentVersion 20 工程通过
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
  临时升级。开发期旧工程从迁移上游重新生成当前工程，编辑器不内置旧版本升级。
- editor/reforge 先读 index，再按 map id 懒加载正文；显示地图列表不得解析全工程地图。
- 非法/绝对/越界 path、重复 id/path、未知 `mapId`、索引缺文件和输出路径碰撞全部 fail-loud，
  禁止猜测修复或静默覆盖。

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
