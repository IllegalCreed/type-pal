# 内容工程当前格式

Status: current
Owner: Codex（规格维护；本轮仅文档与静态核读）
Last reviewed: 2026-10-24
Template: design-spec-v1 / 1.0.0

## 问题与目标

本页定义当前内容工程入口、目录和等距地图的身份/存储边界，供loader、编辑器、运行时和供应链共同读取。旧R33把整份现行规范套成historical，不能据此废止原合同；本次恢复可用正文，原稿及旧执行只按原时点保留。实现是否完全满足合同仍须相应任务与真实测试，不能从本文current推导产品通过。

## 真值与约束

- 当前唯一内容格式为contentVersion 22；SAVE12及minimumSaveVersion 12是另一轴。直接来源为[CurrentManifest](../../../packages/content/src/character.ts)、[存档类型](../../../packages/reforge/src/save/types.ts)与[公开装配入口](../../../packages/reforge/src/project-loader.ts)。旧1..21内容、SAVE11等开发档不进入当前loader，不恢复upgrader/transition或脚本分片。
- manifest必须有非空entryPoints，每项完整保存稳定id、label、scene、可选introVideo和独立startWorld；defaultEntryId只选择真实入口，入口无继承/合成fallback。顶层entryScene/startWorld不是当前manifest字段；存档保存完整世界和玩家位置，不以入口id代替世界。
- 场景/共享/技能/敌AI正文按[READ-FIRST维护权](../READ-FIRST.md)作为canonical作者内容；资源/地图等仍归批准的窄供应分区。不能因文件位于projects/pal就恢复退役的完整脚本转换。
- 本轮静态核类型、目录guard和公开loader切片，未重跑PAL数据、上传/保存、渲染或迁移。固定原稿里的“已落地”与223/56等数量只属于原验收时点。

## 方案

### 世界与角色初值

ActorDef.battler拥有初始等级、HP/MP基线、属性、装备与技能；实例经验从0开始。StartWorld持队伍顺序、金钱、库存和世界资源，seedStats只稀疏覆盖当前hp/mp，seedConditions只用于该入口开局队员。buildWorld只在新建时消费；读档不重播种，learnedSkills键已存在（包括空数组）不得恢复出厂技能。

临时condition的运行时owner是CharacterInstance的poisons/extraStatuses/extraPoisonRes，不把它复制到入口或setParty。大世界不自行衰减；入战复制、战后清定时状态/临时毒抗并解到severe，incurable保留；恢复存档则清party和reserve全部condition。剧情施加/清除走稳定ActorId显式命令；规则细节回[脚本合同](script-system.md)。

SAVE12必需sceneRuntime，记录NPC朝向、姿态、运动/自动续跑现场；位置仍唯一在world.script.entityPos并同步捕获。它不进入作者场景/共享脚本、不新增作者状态方案，也不抬contentVersion。[存档合同](save-system.md)负责离场暂停、正常返回仍跑onEnter、读档不重跑的边界。

### 目录是真实发现与路径来源

| 目录 | 稳定身份与显示 | 路径/加载责任 |
|---|---|---|
| manifest.content.scenes目录内index.json（SceneIndex version1） | scenes条目为id/name/path；name不进入SceneDef正文，改名不改SceneId | 入口、脚本、URL、存档用id；查目录得到正文path，不能按id拼路径 |
| manifest.content.maps（MapIndex version1） | maps条目同样为id/name/path；SceneDef.mapId只存稳定id | 无场景引用地图也属于注册资产，参与编辑/保存/克隆/导出；列表不要求解析全部地图正文 |
| manifest.content.tilesets | 每条为id/name/category/asset，asset是catalog的tileset AssetId | ProjectMap.tilesetRefs→TilesetDef.id→asset→AssetRecord.path→AssetResolver/FileSource；不能让path或旧编号直通 |

[SceneIndex](../../../packages/content/src/scene-index.ts)与[MapIndex](../../../packages/content/src/map-index.ts)先规范化工程相对JSON路径，再拒重复和覆盖索引本身；绝对路径、反斜杠和父路径越界拒绝。`.//`等可归一化形式不能被误说成全部原样拒绝。目录缺正文、正文id不符、未知mapId或输出碰撞由相应loader/写入入口报错，不猜路径修复或静默覆盖。

### 地图、组合与图像资源分层

[ProjectMap](../../../packages/content/src/project-map.ts)唯一版本4，共享IsometricMapContent：width/height是逻辑尺寸，tiles/sources/heights及collision的lattice为2×height行、width列。tilesetRefs稳定id按字典序，sources逐格选择其下标；layers数组序决定z/tie-break，编辑引用使用layer.id。

单来源sources与全0 heights可按合同省略，加载时物化；多来源必须有sources。null瓦片对应null来源与0高度，每次放置的实例高度决定遮挡，不恢复flat/height图层分叉或tileId→height表。逻辑格对应两个子格collision任一非0即阻挡。

组合是带id/name/origin/category/anchor的局部共享内容，不是第二种地图。地图高度绝对、组合高度相对，放置actualHeight=placementBaseHeight+relativeHeight；组合collision的null是不参与、0是显式可通行。当前ProjectMap还可含version1的authoring.stampPlacements，记录地图局部放置身份/所属槽位，属于编辑器元数据，不改变地图v4或让运行时恢复旧packed Tilemap。

[TilesetDef](../../../packages/content/src/tileset.ts)只描述图像，注册表拒path和旧tiles高度字段。canonical二进制是gzip索引帧组，bytes/SHA针对存储gzip字节；PNG上传按工程标准色彩最近邻量化、alpha<128透明，再encodeSpriteChunk+gzip，不存RGBA副本、paletteId或调色板选择器。原稿56 effect资产/223旧地图是历史批次数量，不当今天完整盘点。

## 边界与风险

当前合同不等于跨版本兼容；旧工程由对应Git/获准供应链重建，不能在编辑器打开时猜格式升级。显示名、物理path、地图实例高度、存档现场和作者身份是不同事实权；任一混入其他层的设计需停线核真实caller。

本轮没有测试所有上传/克隆/导出与可选地图字段。发现代码/数据与本页矛盾先记录精确来源与候选，保留最强替代解释；不改产品或以文档反向为当前缺陷开豁免。

## 验收

静态oracle是版本常量/公开manifest、目录guard、ProjectMap与Tileset类型能支撑本页对应断言，原源/quote可精确回读，实际链接和模板有效。运行oracle另按合法canonical工程、重复id/规范化后路径碰撞、坏正文引用及地图矩阵边界验证；本轮未执行，不记PASS。

作者不得自签迁移完成。对应唯一review记录全文读域和限定源码范围，非作者按证据验收；全量硬门未过，父卡rework、不合main、不done。

## 历史范围

R33登记日期2026-07-14不是全部内容的发布日期；原稿含08-19地图、07-19 tileset及10月SAVE12后继。固定来源0d5311075b4f5e67362d1953a138d678c0a4aa42完整保留，不把旧日期截断现行合同。

## 原始结论

原稿明确content22、SAVE12分轴、SceneIndex/MapIndex稳定身份及ProjectMap4/tileset资产单路。R33按标题/行数生成的旧“deep-semantic/模板完成”已撤信；本次不沿用该接受，也不把旧SAVE11摘要残句当产品合同。

## 当时证据

原“已落地”、旧批次ID、数量和任务链接在原quote与固定Git中保留，只证明当时记录；本轮没有复跑旧数据或认证旧执行。

## 当前有效性

适用当前产品合同：contentVersion 22 / SAVE12 / minimumSaveVersion 12。

现行规格current；archive overlay只保留原时点材料。规范适用性、当前实现合规、本文独立接受、产品运行分别裁定。

## 继任文档

[作者脚本](script-system.md)负责内容执行语义，[工程生命周期](project-lifecycle.md)负责工作区/保存权，[存档](save-system.md)负责运行态；历史设计见[原设计快照](../archive/designs/content-schema.md)。无新版本、兼容入口或产品取舍由本次文档治理产生。

## 原文保全

固定原源revision `0d5311075b4f5e67362d1953a138d678c0a4aa42`及source SHA见唯一review记录。marker至EOF对本批基点逐字节保持；逆回只剥每行 `> ` / 空行裸 `>`，精确排除end marker前恰一个未引用分隔LF后等固定原源，不trim或全局替换。原稿中的current说明原合同，旧执行仍只按其日期读取。
<!-- original-source-quote:start -->
> # 内容工程当前格式
>
> 类型：现行规范（current）。当前产品为 contentVersion 22 / SAVE12；格式与实现以源码常量和校验器为准。
> 本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
> 原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/content-schema.md)，不作为当前执行入口。
>
> ## 当前 canonical 项目入口 contentVersion 22
>
> 当前产品只接受 contentVersion 22。`manifest.entryPoints` 必填且非空；每个真实入口完整保存稳定 `id`、
> 显示名、启动场景、可选开场视频和必填 `StartWorld`。`manifest.defaultEntryId` 必须命中其中一项，只决定无
> `menu` / `entry` 参数时直接启动哪一项；它不是父入口或模板。当前 manifest 不含顶层 `entryScene`、顶层
> `startWorld`，入口间也没有继承、合成或 fallback。SAVE 版本独立为12，`minimumSaveVersion`必须为12；
> payload记录完整世界、玩家位置和必需的`sceneRuntime`，不记录入口id。
> NPC位置唯一保存在`world.script.entityPos`，与场景现场的朝向、姿势、运动/动作进度和自动续跑数据同步捕获。
> `sceneRuntime`是运行时存档合同，不进入作者场景/共享脚本内容，不提升contentVersion，也不新增作者状态方案；
> 离场暂停、返回恢复与读档规则见[当前存档合同](save-system.md)。
>
> 角色初始化同样只有一组权威输入：`ActorDef.battler` 持有初始等级、当前/最大 HP/MP 基线、基础属性、
> 初始装备与初始技能；新实例经验固定从 0 开始。`StartWorld` 只持有队伍与顺序、金钱、库存、世界资源，
> 以及可选的 `seedStats[actorId].hp/mp` **当前值**稀疏覆盖和
> `seedConditions[actorId]` 当前临时状态快照。condition seed 只允许引用该入口的开局队员，包含稳定
> `PoisonDef.id`、单一 registry 中可携带的定时状态与临时毒抗；`puppet` 不可携带，毒从
> `tickIndex = 0` 开始。`buildWorld` 只在新建世界时消费一次，读档不重播种。入口不保存最大值、属性、
> 装备或技能副本。新游戏和后续首次入队仅在 `WorldState.learnedSkills[instanceId] === undefined` 时从
> `ActorDef.battler.initialMagic` 深拷贝播种；学习、遗忘、离队/归队和读档均继续以运行时世界态为准。
>
> 角色当前 condition 的运行时 owner 始终是 `CharacterInstance` 的 `poisons`、`extraStatuses`、
> `extraPoisonRes` 三个 carrier。大世界不自行衰减；进入战斗时复制，战后清除定时状态与临时毒抗并只解到
> `severe`（`incurable` 保留），从存档恢复时则对 party 与 reserve 全部清除，包括不可解毒。剧情变化使用
> 稳定 ActorId 的显式施加/清除命令，`setParty` 仍只负责阵容，不隐式播种或清理 condition。
>
> 旧内容版本 1..21、旧顶层字段、可选入口表和缺省 StartWorld 不属于当前输入合同；开发期历史由 Git 保存，不在产品
> loader、editor 或 migrate publication 中保留 upgrader。
>
> ### SceneIndex：发现、名称与路径真值（content22）
>
> `manifest.content.scenes` 指向场景目录，目录内 `index.json` 是唯一的场景发现、作者显示名和正文路径真值：
>
> ```jsonc
> {
>   "version": 1,
>   "scenes": [
>     { "id": "inn", "name": "余杭客栈", "path": "content/scenes/inn.json" }
>   ]
> }
> ```
>
> - `SceneAssetDefV1.id` 是脚本、入口、URL 与存档位置使用的稳定 SceneId；显示名修改不改变它。
> - `name` 只属于目录元数据，不进入 `SceneDef` 正文；列出场景不需要加载全部正文。
> - `path` 是规范化后的工程相对 JSON 路径。loader、保存、克隆和物理删除只能从 SceneIndex 解析，
>   不得从 SceneId 拼接文件名。
> - 重复/非法 id、空名称、重复/越界 path、缺正文、正文 id 不符和输出路径冲突全部 fail-loud。
> - PAL 初次迁移用地图可读名按稳定场景顺序确定性消歧；之后 publication 以 baseline-first 保留作者修改的
>   `name/path`。当前产品不保留旧版 string[] parser、upgrader 或 fallback。
>
> ## 共享等距内容与 ProjectMap v4（尺寸可变 + 多来源 + 实例高度 + 碰撞层）
>
> > ✅ **ProjectMap v4 / 共享等距内容已落地（2026-08-19，ED-STAMP-MAP-MODEL-1 +
> > ED-MAP-MULTI-TILESET-1）**：地图和组合直接消费同一个 `IsometricMapContent`；旧 packed Tilemap
> > 只允许出现在 pal-extract 和 migrate 输入侧，v2/v3、单 `tilesetId`、`depthMode` 与兼容 upgrader
> > 均已从 content、reforge、editor 当前版本删除。
>
> ```jsonc
> {
>   "version": 4,
>   "width": 24,
>   "height": 24,
>   "tilesetRefs": ["tileset-001", "tileset-020"],
>   "layers": [
>     {
>       "id": "floor",
>       "name": "地板",
>       "tiles": [/* 2 * height 行 × width 列；tileId | null */],
>       "sources": [/* 同尺寸；tilesetRefs 下标 | null */],
>       "heights": [/* 同尺寸；每次放置实例自己的非负整数高度 */]
>     }
>   ],
>   "collision": [/* 同尺寸；0 可通行，非 0 阻挡/预留地形类型 */]
> }
> ```
>
> `layers` 数组序就是 z/tie-break 序，编辑/引用使用稳定 `layer.id`；错排 lattice 行奇偶只负责几何，
> 不再暴露旧格式 `h`。`tilesetRefs` 按稳定 id 字典序排列；`sources` 与 `tiles` 同形并 lockstep，
> 非空来源值指向 `tilesetRefs`。单来源文档落盘时可省略完全可推导的 `sources`，加载后仍物化为完整矩阵；
> 多来源文档必须显式保存。全 0 `heights` 同样可省略。任何 `null` 瓦片的来源必须为 `null`、高度必须为 0。
> 所有图层的非空瓦片都按实例实际高度参与遮挡，不存在 `flat | height` 图层分叉。角色按逻辑格行走时，
> 该格对应的两个子格碰撞值任一非 0 即阻挡。
>
> 组合模板不是第二种地图文档，而是带 `id/name/origin/category/anchor` envelope 的局部
> `IsometricMapContent<number|null>`：地图 `heights` 是绝对高度，组合 `heights` 是相对高度，放置唯一公式为
> `actualHeight = placementBaseHeight + relativeHeight`。组合 nullable collision 中 `null` 表示不参与放置，
> `0` 表示显式可通行；地图 collision 则是完整 number 矩阵。
>
> ### 地图资产注册与场景绑定（W7F，2026-07-14）
>
> 地图的稳定身份不由文件路径或场景反向推导。当前 contentVersion 22 工程通过
> `manifest.content.maps` 指向 `content/maps/index.json`：
>
> ```jsonc
> {
>   "version": 1,
>   "maps": [
>     { "id": "home", "name": "家", "path": "content/maps/home.json" }
>   ]
> }
> ```
>
> - `MapAssetDefV1.id` 是场景、编辑器和缓存使用的稳定身份；`name` 可改，`path` 只负责存储。
> - `SceneDef.mapId` 直接保存稳定 id，例如 `"home"`；不存在原版复用、自有地图或路径引用分支。
> - 注册表是资产发现真值。没有任何场景引用的地图仍须加载到编辑器、参与保存、克隆和 ZIP 导出。
> - PAL 的 223 张旧地图由 migrate 一次性转换成独立 v4 文件；编辑器和运行时不得在打开时猜格式或
>   临时升级。开发期旧工程从迁移上游重新生成当前工程，编辑器不内置旧版本升级。
> - editor/reforge 先读 index，再按 map id 懒加载正文；显示地图列表不得解析全工程地图。
> - 非法/绝对/越界 path、重复 id/path、未知 `mapId`、索引缺文件和输出路径碰撞全部 fail-loud，
>   禁止猜测修复或静默覆盖。
>
> ## tileset 注册表（W7B；A7-3T done，2026-07-19）
>
> `manifest.content.tilesets` → `content/tilesets.json`:数组,条目精确为
> `{id, name, category, asset}`。
> - `id` 是地图/组合模板引用的稳定语义身份(不含 `/`)；`asset` 是不透明 AssetId，必须指向 catalog 中
>   `kind=tileset` 的记录。物理路径只允许出现在该 AssetRecord，禁止从任一 id 或原版编号推导。
> - 唯一加载链为 `ProjectMap.tilesetRefs[] -> TilesetDef.id -> TilesetDef.asset -> AssetRecord.path ->
>   AssetResolver -> FileSource`；运行时按引用并集加载 registry，逐格通过 `sources` 解析。canonical 文件是
>   gzip 包裹的 GOP 索引帧组，bytes/SHA 描述保存的 gzip 字节。
> - `path` 不属于任何 current 产品输入；只有 migrate 读取原始提取结果时可以把来源路径翻译成 AssetRecord。
>   canonical content、运行时、编辑器工作态和本地工程打开边界均拒绝 `path | asset` 双轨。
> - 上传管线:PNG → 网格切片 → **量化到工程标准色彩**(D25 第 4 条;最近邻,alpha<128 透明)→
>   `encodeSpriteChunk` + gzip 落盘 —— 存索引 1B/px,不烘 RGBA(D25 第 2 条),渲染与
>   原版同一条「索引帧 + 标准色彩 → bake」单路。tileset 不保存 `paletteId`，编辑器不暴露颜色表选择器。
> - `ProjectMap.tilesetRefs[]` 必须引用注册表稳定 id，不允许路径直通；删除任一被地图或组合逐格引用的
>   来源必须 fail-loud。
> - tileset 只描述图像资源，不拥有地图放置实例的高度；禁止恢复 `tileId -> height` 映射。

<!-- original-source-quote:end -->
