# W7G - 组合地物图章与可持久放置组

Status: draft
Phase: phase2
Capability: W7 / W8 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex(Kimi 复验)
Unavailable Agents: none
Branch: main

> 高风险门禁:本卡会触及 content schema、地图作者态持久化、跨包公共接口、编辑器 Command、
> 工程 IO、MG2 和能力地图口径。Codex / Kimi / GLM 三方设计 `agree` 前不得修改实现文件、
> 不得提前加入半套字段,也不得把 `Status` 改成 `build`。

## 目标

让作者把树、桌椅、屋顶、岩壁等由多个 tile 组成的地物保存成可命名、分类和预览的图章。
图章以**多视觉层**为一等能力:一次落笔原子写入全部视觉层、实例高度和独立碰撞;保存重开后,
点击任一可命中成员仍能精确选中同一次放置的整个图章,并完成整组移动、复制、删除、撤销/重做、
组内逐层编辑以及“解组但保留普通格”的闭环。

运行时仍只消费普通 tile 矩阵、实例高度矩阵和独立 collision 矩阵。图章模板与放置组身份只服务作者,
不引入 `StampMap`、`Tilemap` 或第二套渲染/碰撞格式。

## 范围

- 范围内:
  - 图章模板 schema、加载边界校验、确定性格式化、工程 CRUD 和引用诊断。
  - 从 W8 单层或显式多层地图选区“保存为图章”。
  - tileset 预置图章的登记、发现、MG2 所有权和上游生成边界。
  - 模板局部视觉层槽到目标地图稳定 `layerId` 的显式映射。
  - `activeStampTemplate`、图章工具、完整幽灵预览、冲突列表和一次原子放置。
  - 非链接、可持久的 placement group;相邻同款图章仍保持不同身份。
  - 点击任一成员整组选中、进入/退出组内逐层编辑、解组。
  - 整组移动、复制、重复、删除及 undo/redo;所有跨层写入全有或全无。
  - collision 独立成员、权限、命中、Inspector 与整体变换语义。
  - Project IO、懒加载/copy-through、另存为、clone、ZIP、保存重开。
  - 图层删除、地图缩放、tileset 换绑/删除和地图删除的生命周期守卫。
  - 浏览器交互、键盘/焦点/可访问性、窄窗口和大量图章性能验证。
- 范围外:
  - linked prefab、模板更新自动回写既有 placement。
  - autotile、terrain/Wang tile、随机笔刷。
  - 自定义通用 tile property schema。
  - AI 生图或新增替代素材。
  - 未经本卡另行裁定的跨工程图章市场、在线包或 tileset 自动重映射。
- 明确不做:
  - 不用图案相似、邻接关系或“最近一次盖章”的内存记录猜 placement。
  - 不把 collision 复制成每个视觉层各一份。
  - 不把 height 变成 tile/tileset 的固有属性。
  - 不在 UI 里先写普通格、再第二次 dispatch 写 group metadata。
  - 不因部分目标层隐藏、锁定或缺失而静默只写其余成员。
  - 不只修改 `projects/pal` 等生成产物;迁移或预置缺陷必须修上游并重新生成。

## 上下文锚点

### 已拍板决策 / 铁律

- [`AGENTS.md`](../../../AGENTS.md):本卡属于 schema/save/migration/跨包/能力口径高风险任务,
  必须开卡、三方设计签字、唯一 Coding Owner、三方 done 审查签字。
- [`READ-FIRST.md`](../../phase2/READ-FIRST.md):第二阶段以作者内容为真值,新机制必须成为新内容模型,
  schema 先定、稳定 id 优先、原版只是测试集;迁移缺陷必须修上游。
- [`roadmap.md`](../../phase2/roadmap.md):201-228 已登记 W8/W7G 边界和用户拍板语义。
- [`editor-design.md`](../../phase2/editor/editor-design.md):117-128 是 W8 选择、命中、权限、原子 patch
  与 `stamp-placement` 扩展点的当前 UX 真值。
- [`capability-map.md`](../../phase2/capability-map.md):60-61 的 W7 只代表基础绘制闭环,W8 已完成;
  W7G 未经本卡验收不得借已有 `✅` 冒充完成。

### 历史任务 / 审计

- [`W8-map-content-selection-inspector.md`](W8-map-content-selection-inspector.md):98-204、215-259、
  446-482 定义普通选区临时态、稳定 layerId、错排 lattice 偏移、原子 patch、隐藏/锁定权限和
  W7G 的持久 placement 边界。
- [`W7B-tileset-library.md`](W7B-tileset-library.md):20-49 定义 tileset 稳定 id、图章与随机笔刷/
  autotile 的范围分界。
- [`W7F-canonical-map-pipeline.md`](W7F-canonical-map-pipeline.md):25-47 定义 ProjectMap 是唯一地图真值、
  按 map id 懒加载和 MG2 单地图原子合并。
- [`asset-pipeline.md`](../../phase2/migrate/asset-pipeline.md):78-91 定义迁移地图、tileset 注册和二跑零计划。

### 代码锚点

- `packages/content/src/tileset.ts:1-52`:当前 `TilesetDef` 刻意很小;不能未经签字把模板偷偷塞进去。
- `packages/content/src/project-map.ts:1-192`:ProjectMapV2、稳定层 id、实例高度、独立碰撞、校验与确定性格式化。
- `packages/content/src/validate-refs.ts:43-67`:跨内容引用诊断入口。
- `packages/reforge/src/loader.ts:168-205,282-344`:manifest/content 表加载与公共 guard。
- `packages/reforge/src/project-map.ts:1-365`:地图不可变编辑、缩放、图层生命周期。
- `packages/editor/src/core/map-selection.ts:28-78,157-235`:W8 选择代数与 `stamp-placement` dead branch。
- `packages/editor/src/core/map-transform.ts:8-35,78-178,243-538`:`{dRow,du}` 错排偏移、剪贴板和预检变换。
- `packages/editor/src/core/map-patch.ts:20-75,98-278`:跨层视觉 + 独立 collision 的全量预检原子 patch。
- `packages/editor/src/core/commands.ts:802-840,874-903`:W8 Command/history 接口。
- `packages/editor/src/core/project-io.ts:33-191`:EditorState、确定性保存、未加载地图 copy-through。
- `packages/editor/src/ui/MapMode.tsx:2194-2216`:地图工作区 Inspector/工具接缝。
- `packages/editor/src/ui/TilesetTab.tsx:77-110,324-410`:瓦片集库现有三栏工作区;不是图章库本身。
- `packages/migrate/src/migration-merge.ts:25-56`:内容表与地图文件的 MG2 所有权分界。
- `packages/migrate/src/migration-bootstrap.ts:46-59`:baseline 纳入规则。
- `packages/migrate/src/migration-plan.ts:72-103`:迁移计划和冲突分流。
- `packages/migrate/src/migration-project-io.ts:47-54`:工程落盘边界。
- `packages/migrate/src/pal-migration.ts:168-188`:tileset 注册表的当前上游生成点。

### 不得重新引入

- 视觉层数组下标、层名或 z 序充当身份;所有持久成员只认稳定 `layerId`。
- 图章模板与 placement 的硬链接回写,或模板删除连带删除地图内容。
- 运行时 `StampMap`、第二套 collision、第二条图章专用渲染路径。
- 普通选区持久化;只有图章放置组身份属于作者内容。
- placement 元数据与普通矩阵分两次命令写入。
- 隐藏/锁定层导致部分落笔、部分移动、部分撤销。
- 错排菱形地图用朴素 `dCol` 偏移造成奇偶行 16px 漂移。
- 未签字先改 ProjectMap/content schema、迁移器或生成产物。

## 用户已拍板语义

以下是产品真值,不是审查阶段重新讨论的备选:

1. 图章以多视觉层为一等能力;单层图章只是多层模型的特例。
2. W8 普通格选区默认只作用于活动层;显式跨层选择规则保持不变。
3. 点击已放置图章任一可命中成员,默认选择整个 placement,范围跨越它的全部成员层。
4. 双击或 Enter 进入组内编辑后恢复逐层语义:只编辑当前显式活动层中的组成员,
   不因图章身份自动向其他视觉层扩散。
5. collision 是独立 `{row,col}` 通道,不属于任一视觉层。
6. 模板修改或删除不联动既有 placement;图章不是 linked prefab。
7. 底层仍以普通 tile、实例高度和独立 collision 运行,运行时不依赖模板库或 placement 元数据。
8. 保存重开后仍可从任一成员精确恢复整组选择,禁止按图形或邻接猜组。
9. 整组跨层写操作必须全有或全无。
10. 支持“解组但保留普通格和碰撞值”。

## 术语与五条正交状态轴

| 名称 | 含义 | 是否持久 | 不能复用成 |
|---|---|---:|---|
| `paletteSelection` | tileset 中当前准备画的一块普通 tile | 否 | 地图已有内容选区 |
| `activeStampTemplate` | 当前准备盖下的图章模板与目标层映射 | 否 | 已放置图章身份 |
| `mapSelection` | W8 普通 cells 或 W7G placement 对象选择 | 否 | 模板选择 |
| `currentLayerId` | 普通命中与组内逐层编辑的活动视觉层 | 否 | 图章跨层范围 |
| `stampGroupEditContext` | 当前进入的 placement 以及其组内 cells 选择 | 否 | placement 持久元数据 |

模板是可复用内容;placement 是一次放置留下的**非链接作者态身份**;普通 tile/height/collision 矩阵
始终是实际地图值。工作区选择和编辑上下文都不写入工程文件。

## Draft:设计与风险

### Codex 候选内容模型(待 Kimi / GLM 审查)

下面的形状是 Codex 的设计投票,不是三签前可落地的最终 TypeScript:

```ts
interface StampTemplateV1 {
  id: string
  name: string
  category?: string
  tilesetId: string
  origin: 'authored' | 'migrated'
  layerSlots: Array<{
    id: string
    name: string
    depthMode: 'flat' | 'height'
  }>
  visual: Array<{
    layerSlotId: string
    offset: { dRow: number; du: number }
    tileId: number
    height: number
  }>
  collision: Array<{
    offset: { dRow: number; du: number }
    value: number
  }>
}

interface StampPlacementGroupV1 {
  id: string // map-local stable id
  sourceStampId?: string // soft provenance, never used to reconstruct members
  sourceStampName?: string // display-only snapshot
  anchor: { row: number; col: number }
  visualSlots: VisualSlotRef[] // absolute, exclusive membership
  gridPoints: GridPointRef[] // absolute collision membership
}
```

- 模板值使用 W8 已验证的 `{dRow,du}` 相对错排坐标,不存朴素 `dCol`。
- placement 只存身份、来源提示、锚点和绝对成员引用;tileId/height/collision 的实时值只在普通矩阵中。
- `sourceStampId` 是软来源信息,模板缺失不影响 placement 的选择、变换或运行。
- collision 模板记录**显式纳入**的格点和值,值允许为 `0`;“未包含该格点”和“包含且写 0”是不同语义。
  首版仍不接受 collision-only 图章。
- 图层映射是落笔前工作区态:`layerSlotId -> target layerId`;placement 写入后只保存实际稳定 layerId。

### S1-S16 不可逆设计题

三方必须逐项给出 `agree` 或 `counter`。Codex 建议不是已生效 schema。

| ID | 设计题 | Codex 建议 | 必须验证的影响 | Kimi | GLM |
|---|---|---|---|---|---|
| S1 | 模板存放位置 | 独立 `content/stamps.json`,模板显式引用 `tilesetId`;不扩展 `TilesetDef` | manifest、loader、EditorState、引用图、MG2 | agree | pending |
| S2 | placement 存放位置 | `ProjectMapV2` 增加可选、具版本的 `authoring.stampPlacements`;普通矩阵仍是唯一运行真值 | 校验/格式化/copy-through/运行时忽略作者字段 | agree | pending |
| S3 | 版本策略 | 保持 map `version:2` 与当前 `contentVersion:3`,只新增可选 `authoring.version:1`;A7-4 的 v4 不被本卡抢占 | 旧工程不物化空字段、未知 authoring 版本 fail-loud、旧二进制前向风险写清 | **counter**（见下「S2/S3 特别风险」Kimi 裁定） | pending |
| S4 | 多层表达 | 模板使用局部稳定 `layerSlotId + depthMode`,落笔前显式映射地图 `layerId` | 单层退化、重排/改名、缺层/flat-height | agree | pending |
| S5 | 使用范围 | 首版仅允许同一 `tilesetId`;不做自动 remap、跨工程粘贴 | tileId 语义、导入/克隆、错误提示 | agree | pending |
| S6 | group id / 来源 | group id map-local;move/redo/地图 clone 保留,同图 copy/duplicate 重建;来源是可悬空软信息 | 相邻同款、复制地图、模板删除 | agree | pending |
| S7 | placement 成员 | 保存绝对视觉/碰撞成员 + anchor,不保存模板值快照,也不从当前模板重建 | 组内编辑、模板变更、存储体积 | agree | pending |
| S8 | 成员所有权/重叠 | 一个视觉槽和一个 collision 点最多属于一个 placement;普通值冲突可确认覆盖,已有 placement 成员冲突必须阻止并要求先解组/删组 | 确定性命中、覆盖与解组策略 | agree（钉 P1） | pending |
| S9 | 选择代数 | 扩为 `{kind:'stamp-placements'; placementIds:string[]}`;允许多组、不允许普通 cells 与 groups 混选;组内上下文只容纳单组 | Shift/Ctrl、Alt 候选、批量变换 | agree | pending |
| S10 | 组内结构编辑 | 组内擦除会原子缩减成员;若将变成零视觉成员则阻止并提示“删除整组/解组”;组外画笔撞到成员先阻止并提示“进入组内/解组” | 残缺组、隐形碰撞、普通画笔、undo | agree（钉 P2） | pending |
| S11 | collision 整组变换 | placement 的 collision 总随整组移动/复制/删除,不可隐式排除;collision-only 图章首版不支持 | collision 权限、重叠、预览一致性 | agree | pending |
| S12 | Command 形态 | 新建复合 placement transaction,内部复用 `prepareProjectMapPatch`;普通矩阵 + metadata 一次 dispatch/invert | no-op、redo、错误零写、跨地图暂不支持 | agree（钉 P3） | pending |
| S13 | 地图结构生命周期 | 影响完整性的删层/缩图/换 tileset 默认阻止;对话只提供“取消/先解组/删除整组后继续”,禁止静默裁剪 | 原子确认、undo、悬空引用 | agree | pending |
| S14 | 模板删除 | 允许删除并保留 placement 的 id/name 来源快照;诊断为 info 而非坏引用 | 引用保护文案、重命名/删除 | agree | pending |
| S15 | migration / MG2 | 预置模板由上游按稳定 id 生成并按 id 合并;修改 migrated 模板需显式接管为 authored;placement 永远归作者,重迁不得覆盖 | baseline、冲突、二跑零计划 | agree | pending |
| S16 | 能力地图口径 | W7G 是 W7 基础绘制上的独立增强任务并依赖 W8;不新增能力格、不改现有 `✅/❌`,done 后只补 W7/W8 备注与证据 | 避免 schema 先行冒充闭环 | agree（注） | pending |

#### S2 / S3 特别风险

Codex 倾向把 placement 放进地图,因为它与普通矩阵必须同一命令、同一保存单元、同一 clone/delete 生命周期,
也能自然继承未加载地图文本 copy-through。`authoring` 是非运行真值,不会形成 `StampMap`。

但当前 `validateProjectMapV2` 会规范化并丢弃未知字段;旧版本编辑器打开新地图再保存可能擦掉 authoring。
Kimi 必须判断“`version:2 + authoring.version`”是否足够,或应改为 map v3 / 每地图 sidecar。
如果 counter,必须同时给出旧工程升级、懒加载、copy-through、clone/ZIP、MG2 和运行时无第二格式的完整方案;
不能只换字段位置而遗漏消费方。

**Kimi 裁定（2026-07-18）：S2 agree；S3 counter，附完整收敛方案。**

代码实证：`validateProjectMapV2`（content/project-map.ts:75-148）与 `formatProjectMapV2`（:166-189）都逐字段
重建返回对象，未知字段（含未来 `authoring`）在加载和保存两侧都被**静默丢弃**；`version !== 2` 则直接 throw
（:77-78）。因此 Codex 方案「保持 `version:2` + 把旧二进制擦除风险写清」会让任何 pre-W7G 二进制
（本仓多 Agent、跨会话 resume 是日常，陈旧 checkout/build 并不 exotic）在「加载 → 修改 → 保存」一张带章地图时
**静默销毁全部 placement 作者数据**。项目自身先例（A7-0 manifest `contentVersion` 2→3 单向升级）在语义增长时
选择 fail-loud，本条不得降格为「写清即可」。

收敛方案（替代 S3 原文「保持 version:2」；其余主张保留）：

- **R-S3-1 版本按内容条件发出**：`authoring.stampPlacements` 非空 → 地图写 `version:3`；
  无图章 → 写 `version:2` 且绝不物化空 `authoring`（旧地图字节稳定、零 diff）。
  `version:3` 的语义就是「v2 + 可选 authoring」；无章地图对旧工具零成本。
- **R-S3-2 全部消费方同 build 升级（W7G-A）**：`isProjectMapV2`/`validateProjectMapV2`/
  `formatProjectMapV2`/reforge `loadProjectMap`/migrate 接受 `2|3`；`authoring` 仅允许随 3 出现；
  `authoring.version` 未知 → fail-loud。格式化器保留确定性成员顺序。
- **R-S3-3 运行时零第二格式**：runtime 忽略 `authoring`；带/不带 authoring 的渲染与碰撞逐字节一致
  （测试矩阵 E 已含）。
- **R-S3-4 副作用钉**：旧二进制遇带章地图 fail-loud（「仅支持 2，收到 3」），静默擦除路径关闭；
  sidecar 方案否决——它把原子保存单元拆成两个写单元，且需平行补齐懒加载/copy-through/clone/ZIP，
  而 in-map authoring 免费继承全部既有路径（project-io.ts:142/:196 copy-through 不 JSON.parse；
  migration-merge.ts:43-57 单图 atomic 三方合并不解析内部字段）。

build 必落钉（不阻塞签字，W7G-A→F 各段验收时核对）：

- **P1（S8）**：所有权排他**按通道**钉死——视觉槽互斥、collision 点互斥、跨通道（A 的视觉槽 vs B 的
  collision 点）允许；写进 validator 与测试。
- **P2（S10）**：所有权守卫覆盖**全部**组外写路径——画笔/矩形/填充/擦除之外，W8 cells 的移动/粘贴/删除
  也必须在 plan/prepare 阶段做 ownership 预检，不能只挡画笔。
- **P3（S12）**：ghost/变换计划的失效键 `map revision` 必须包含 undo/redo 引起的 revision 变化
  （W8 审查 P2 教训：预览不得跨过 history 变化存活）。
- **P4（S7）**：placement 存储体积进 build 检查——大型章 × 数百 placement 的格式化体积 +
  二次格式化字节稳定，进测试矩阵 A。

### 模板到地图的映射

1. 从选区保存模板时,以显式 anchor 为原点,按 `relativeLatticeOffset` 计算每个成员的 `{dRow,du}`。
2. 单层模板默认建议映射到当前活动层,但 `depthMode` 不兼容时必须阻止。
3. 多层模板第一次在某地图使用时必须展示全部 layer slot 的映射;不得按层名或数组顺序猜。
4. 映射目标使用稳定 `layerId`;图层改名/重排不改变本次配置或既有 placement。
5. 缺层、重复映射到同一视觉槽、flat 层承载非零 height、tileset 不匹配都在预览阶段整笔拒绝。
6. 映射是工作区设置,不是 placement 身份;保存重开后的 placement 直接认实际 `layerId` 成员。

### 选择与组内编辑状态机

| 当前状态 | 操作 | 结果 |
|---|---|---|
| 普通选择 | 单击普通格 | 沿用 W8,默认只选活动层 |
| 普通选择 | 单击 placement 的可命中成员 | 选择该整个 placement;不收窄到活动层 |
| 整组选择 | Shift/Ctrl/Cmd 单击另一 placement | 按 S9 增加/减少完整 groupId |
| 整组选择 | Alt/Option 单击重叠位置 | 候选列出普通实例与 placement;显示层、组名、锁定状态 |
| 单个整组选择 | Enter 或双击成员 | 进入 `stampGroupEditContext`,活动层只呈现该组在本层的成员 |
| 组内编辑 | 切换活动层 | 只切换本次逐层目标;不修改其他层 |
| 组内编辑 | Esc | 先退出组内,恢复外层整组选择 |
| 外层整组选择 | Esc | 清空 placement 选择 |
| 任一整组选择 | “解组” | 一笔命令仅删除 group identity;普通 tile/height/collision 保持原值 |

普通 cells 与 placements 首版不混选。多组选择可整体 move/copy/delete,但进入组内编辑要求只选一个 placement。

### 命中、图层与 collision 矩阵

| 上下文 | 默认视觉范围 | 活动层作用 | 隐藏/锁定层 | collision |
|---|---|---|---|---|
| 普通格选择 | 活动单层 | 决定默认命中/写目标 | 沿用 W8:隐藏不命中,锁定可见但不可命中/写 | 独立通道,显式包含 |
| 图章预览/放置 | 模板全部 layer slot | 单层特例可默认映射;多层必须显式映射 | 任一目标隐藏/锁定/缺失则整笔拒绝 | 模板独立成员,不属于某层 |
| placement 整组选中 | placement 全部成员层 | 不能把整组收窄成活动层 | 隐藏成员不命中,锁定成员可见但不直接命中;经其他可命中成员/列表选中后摘要仍包含全部成员;任一成员层隐藏或锁定时所有**整组写操作**零写并提示原因 | 显示该组全部 collision membership |
| 图章组内编辑 | 当前显式活动层中的组成员 | 决定本次逐层目标 | 当前目标层隐藏/锁定则只读;其他层不扩大本次逐层写范围;涉及整个 placement 的动作仍执行上行的全组权限检查 | 经独立 collision 入口编辑;值写 0 不等于移出 membership |
| 整组变换 | 全部成员层 | 只参与权限/锚点,不裁剪范围 | 任一成员目标层不可写则零写 | 按 S11 强制随组变换 |

所有 collision patch 继续声明 `requiredWritableLayerIds`:整组操作要求 placement 涉及的全部视觉层可写;
collision 叠加层是否可见不改变数据作用域。若 placement 仅剩 collision 成员,按 S10 删除整个 group,
首版不保留 collision-only placement。

### 幽灵预览、冲突计划与原子 Command

图章工具先生成只读 `StampPlacementPlan`,再允许提交:

1. 解析模板、anchor、tileset 和 layer mapping。
2. 用 `{dRow,du}` 解析全部绝对视觉/碰撞目标。
3. 一次性检查越界、layer 缺失、隐藏/锁定、depthMode/height、tileId 范围、普通内容冲突、
   placement 所有权冲突和 collision 冲突。
4. ghost 必须使用计划中的最终 tile/height/collision,不能另走一套近似坐标或渲染逻辑。
5. 计划失败只更新问题列表和画布反馈,不改 EditorState/history/dirty。
6. 提交时以同一计划构造普通 `ProjectMapPatch` 与 placement metadata patch。
7. 一次 `dispatch` 全量预检后同时应用;任一问题失败零写、不入 history、不清 redo。
8. `invert` 同时恢复普通矩阵和 group identity;redo 恢复原 groupId。

普通格冲突首版可提供“取消 / 覆盖普通格”。已有 placement 成员冲突**没有覆盖分支**:必须阻止并引导
先解组/删除整组,任何确认动作都不得偷偷拆组。整个决策最终受 S8、S10 审查结论约束。

### 生命周期政策

| 事件 | 候选政策 |
|---|---|
| 模板改名/分类 | 只改模板;placement 的来源快照不自动更新 |
| 模板内容更新 | 只影响未来放置;既有 placement 不变 |
| 模板删除 | 允许并提示已有 placement 数;placement 保留、来源变成软悬空 info |
| placement move | 保留 groupId,原子移动全部成员 |
| placement copy/duplicate | 新建 groupId,来源信息保留 |
| 地图 clone | 因 groupId 以 map 为命名空间,保留 placement id;新 mapId 已构成新身份 |
| 解组 | 删除 metadata,保留所有当前普通值 |
| 删除/擦除部分成员 | 只能在组内做,原子缩减成员;tile 置空移除视觉 membership;collision 值(包括 0)与 membership 分轴,只有显式“移出图章碰撞成员”才缩减 membership 且不暗改当前值;若会剩零视觉成员则阻止并要求“删除整组/解组” |
| 删除成员层/缩小地图/换 tileset | 默认阻止;显式先解组或删除受影响整组后再执行 |
| 删除地图 | 地图内 authoring 元数据随地图一起删除 |

每个结构操作都必须是一笔可逆命令;确认对话不能先改一半再等用户选择。

### 工程 IO、MG2 与运行时边界

- `stamps.json` 由 content 公共包校验/格式化,reforge loader 只加载为作者内容;运行游戏无需模板库也能渲染地图。
- 具体 placement schema 若落在 ProjectMap,content formatter 必须保留确定性成员顺序,编辑器 map copy-through
  自动保留未加载地图原文本;若审查改为 sidecar,必须补等价的懒加载/copy-through/clone/ZIP 路径。
- 地图加载后未修改不得仅因规范化空 authoring 产生 diff;旧地图无图章字段时不能自动物化空数组。
- PAL 预置图章必须来自迁移/生成真源,不得手补 `projects/pal/content/stamps.json`。
- 预置模板按稳定 id 做 MG2 合并;作者接管后迁移器不覆盖。placement 是地图作者态,迁移器不得根据
  当前模板重新生成或删除。
- 单张地图普通矩阵与 placement metadata 必须属于同一个 MG2 原子单元;不能普通矩阵 theirs、group ours
  后静默拼出不一致文件。
- 全量重迁完成后连续第二次必须 `writes=0 deletes=0 conflicts=0`。
- runtime `scene-map`、render、collision 不读图章模板,也不按 placement 分支;有/无 authoring 元数据的
  普通地图渲染和碰撞结果必须完全一致。

### UI / UX

图章不塞回当前“瓦片集详情”长列表。建议形成三个清楚入口:

1. **地图工作区图章面板**:普通瓦片 / 图章两个同级模式;图章支持搜索、分类、缩略图和最近使用。
2. **从选区保存为图章**:W8 Inspector/选区操作区提供入口,随后设置 anchor、名称、分类和 layer slot。
3. **图章库管理页**:独立 CRUD、预览、来源 tileset、使用诊断和显式“用当前选区更新模板”。

落笔前画布显示跨层完整 ghost、anchor、碰撞覆盖和逐项错误;右侧显示 layer slot 映射,而不是让作者
猜活动层会落到哪里。整组选中时 Inspector 显示来源、成员层/数量、collision 数、锁定原因以及
“进入组内 / 解组 / 在库中定位模板”。组内状态必须有明显面包屑和 Esc 提示。

错误与选中不能只靠颜色;按钮使用语义元素、`focus-visible`,状态只由一个 `aria-live` 区域播报。
Enter/Esc/Alt/Shift/Ctrl(Cmd) 都必须在画布焦点下工作,对话关闭后焦点返还画布。

交互借鉴成熟工具时只取已验证的心智模型,不照搬其数据格式:

| 成熟工具惯例 | W7G 采用的部分 | 明确不照搬 |
|---|---|---|
| Tiled / RPG 地图编辑器的 stamp palette | 模板库与画布已有内容选择分离;完整 ghost 后一次落笔 | 不按单活动层摊平跨层模板,不引入第二地图格式 |
| Figma / Illustrator 的 group 选择 | 单击对象先选整组,Enter/双击进入内部,Esc 退出,显式 Ungroup | 不让组内改单格自动传播到其他层 |
| Photoshop / Tiled 的图层显隐与锁定 | 显隐、命中和写权限是三条独立规则;锁定不等于隐藏 | 不因活动层变化静默裁剪整组 |
| Unity prefab 的 Unpack 心智模型 | “解组”后保留当前展开内容 | 不采用 linked prefab、override 或模板回写实例 |

这些类比只定义交互预期;最终按本卡的多层、独立 collision、稳定 placement 身份和原子事务实现。

### 性能模型

- 从 placement metadata 派生 `visualSlotKey/gridPointKey -> placementId` 反向索引;索引是内存派生物,
  不重复持久化。
- 加载/每次原子命令后增量重建受影响键;点击不能对数千 placement 全表扫描。
- 模板缩略图与搜索虚拟化/分页,数百模板不能每次 pointer move 全量重渲染。
- ghost 计划只在 template/anchor/mapping/permission/map revision 变化时重算。
- 100 次连续盖章、数千 placement、27% 与 100% 以上缩放必须保持可交互;性能阈值由 build 前三方补定。

## 分期与退出门禁

1. **W7G-A 数据地基**:三签后的 schema、validator、formatter、loader、版本策略、MG2 和升级测试。
2. **W7G-B 模板库**:CRUD、地图选区保存模板、预置模板与引用诊断。
3. **W7G-C 放置**:多层 mapping、ghost、冲突规划、一次原子放置。
4. **W7G-D 组身份**:持久命中、整组选中、组内逐层编辑、解组。
5. **W7G-E 生命周期**:整组变换、删层/缩图/换 tileset、clone/ZIP/save-reopen。
6. **W7G-F 收口**:浏览器、性能、runtime 回归、文档、能力口径和三方 review。

A-F 可各自留退出测试,但未全部完成前不得把本卡标 `done`,也不得更新能力地图完成状态。
build 期间只有 Codex 修改实现文件;Kimi/GLM 只读审查并把结论写回任务卡。

## 验收条件

### 功能

- 从活动单层选区和显式跨层选区分别创建模板;tileId、height、collision 精确快照。
- 单层模板一次落笔;跨两层且含 collision 的模板一次落笔;ghost 与最终像素/属性完全一致。
- 连续相邻盖两个同款模板得到两个不同 groupId,点击任一成员选中正确整组。
- 普通 W8 选择仍默认活动层;图章整组选中天然跨层;组内编辑重新按活动层逐层作用。
- 整组 move/copy/duplicate/delete、undo/redo 全有或全无;冲突/隐藏/锁定/缺层失败零写。
- 解组只删除身份;所有 tile/height/collision 保持。
- 修改或删除模板不改变既有 placement;保存关闭重开后仍能精确整组选中和变换。
- 图层改名/重排不漂移;删层、缩图、换 tileset 等结构事件无悬空成员。
- runtime 在没有模板库的情况下仍按普通地图值运行。

### 测试矩阵

#### A. content / schema

- 旧 ProjectMap 无 authoring 字段正常读写且不物化空字段;新字段 round-trip 和二次格式化字节稳定。
- 模板/placement 重复 id、空 id、非法 offset/tile/height/collision、缺 layer slot、越界成员 fail-loud;
  collision 未包含与显式包含值 `0` 必须 round-trip 后仍可区分。
- flat 层非零 height、空视觉成员、重复视觉槽/碰撞点、成员所有权冲突拒绝。
- `sourceStampId` 悬空按 S14 只产生预期 info;未知 authoring 版本 fail-loud。

#### B. 模板 CRUD / 映射

- 单层、多层、visual-only 模板;collision-only 是否拒绝按 S11 钉死。
- 改名、分类、复制、显式更新、删除及 undo/redo;预置与作者模板同库发现。
- 奇/偶行 `{dRow,du}` 往返无 16px 漂移;层改名/重排后映射不漂移。
- 缺层、重复映射、hidden/locked、flat-height、tileset 不同整笔拒绝。

#### C. ghost / placement identity

- 预览不改 state/history/dirty;越界、普通内容、collision 和 placement ownership 冲突齐全。
- ghost 与提交的 tile/height/collision 一致;普通格取消/覆盖与实际 policy 一致,placement 冲突绝不出现覆盖按钮。
- 相邻同款、重叠候选、保存重开、模板删除、图层改名/重排后 group 命中稳定。
- 反向索引与直接扫描在测试 fixture 上结果一致,派生索引不写入 JSON。

#### D. 组内编辑 / history

- Enter/双击进入,Esc 先退出组内再清空整组;焦点返还画布。
- 组内只编辑活动层成员;切层后编辑对应成员;collision 走独立入口。
- 组内改 tile/height/collision、擦除成员、最后成员删除、组外画笔阻止按 S10 钉死。
- 一次盖章/移动/复制/删除/解组各是一笔 undo;失败/no-op 不入 history、不置 dirty、不清 redo。
- undo/redo 同时恢复普通值和 metadata;move/redo/copy/地图 clone 的 groupId 行为符合 S6。
- 普通 W8 cells 选择、剪贴板、移动和 patch 无回归。

#### E. 生命周期 / IO / MG2

- 删层、缩图、换 tileset、删除地图及其 undo/redo 不留下悬空 ref。
- `toEditorState -> serializeProject -> load`、未加载地图 copy-through、目录保存、另存、clone、ZIP
  全部保留或按策略重建 groupId。
- 加载但未改地图不产生无意义 diff;旧/新 manifest/content key 按 S1-S3 行为明确。
- 预置模板 ours/theirs/both、作者接管、placement ours-only、单地图冲突和二跑零计划齐全。
- 带/不带 placement authoring 的地图渲染、碰撞结果完全相同;运行时无图章分支。

#### F. React / 浏览器 / 视觉 / 性能

专用 fixture 至少包含 flat 地板层、两个 height 物件层、一枚跨两层并含 collision 的树/屋顶章、
两个相邻同款 placement、隐藏/锁定/缺失映射场景。

- 实测单层/多层建章、完整 ghost、连续盖章、普通单层选择对照、整组跨层选择、组内逐层编辑、
  collision 独立编辑、undo/redo、解组、保存重开。
- 实测 Alt 候选、Enter/Esc、焦点返还、27%/100% 以上缩放、窄窗口和 Console 新错误为 0。
- 选中/错误不只靠颜色;语义控件、focus-visible、唯一 aria-live、reduced-motion 检查通过。
- 数百模板搜索、100 次连续盖章、数千 placement 命中不做全表逐组扫描,无明显输入卡顿。

### 文档

- content schema、editor design、migration/MG2 文档与最终 S1-S16 一致。
- capability-map 只在完整验收和三方 done `accept` 后按 S16 更新备注,不提前改状态。
- 任务卡记录每阶段测试、浏览器截图、迁移二跑、审查结论与用户验收。

## 已知风险

| 风险 | 后果 | 缓解 |
|---|---|---|
| authoring 字段版本选错 | 旧编辑器保存时擦除 placement 或形成第二格式 | Kimi 主审 S2/S3;兼容/升级/copy-through 测试先于 UI |
| 成员 ownership 不唯一 | 点击同一格无法确定选哪个组 | S8 明确排他不变量 + validator + Alt 候选 |
| 普通矩阵与 metadata 双 dispatch | 半写、undo 分裂、悬空身份 | 单一 prepared transaction;失败零写 |
| collision 被误当图层属性 | 多层章复制碰撞或权限含糊 | 独立成员/入口;所有整组动作显式测试 |
| 组内编辑自动扩散 | 改一层意外改多层 | group context + currentLayerId 独立;逐层测试 |
| 结构事件静默裁剪 | 保存后成员悬空、整组无法重选 | 默认阻止 + 显式解组/删组 + 原子 undo |
| 模板更新联动 | 既有地图不可预测变化 | soft provenance;placement 不从模板重建 |
| 预置只手补生成产物 | 下次迁移覆盖 | MG2/upstream 先行,二跑零计划 |
| 大量 placement 全表命中 | 画布交互卡顿 | 派生反向索引、增量更新和性能 fixture |

### 主审立场

- Reviewer: Kimi(schema、版本、状态机、生命周期和跨包接口主审);GLM(消费方、MG2、数据不变量、
  测试矩阵和文档覆盖主审)。
- 结论(Kimi,2026-07-18): **counter——仅 S3 一项;S1-S2、S4-S16 全部 agree**。
  架构主线成立:独立模板表(S1)沿用 A7-0 新表先例;placement 入 map authoring(S2)与命令/保存/
  clone/delete 同一原子单元,copy-through 与 MG2 单图 atomic 已实证,sidecar 否决;多层 slot 显式映射、
  排他所有权、单复合事务、生命周期默认阻止均与用户十条语义和 W8 原子 patch 地基自洽。
  唯一阻塞:Codex 的「保持 `version:2` + 风险写清」在旧二进制「加载→修改→保存」带章地图时静默销毁
  placement;收敛方案 R-S3-1~4(版本按内容条件发 3、消费方同 build 接受 2|3、运行时零第二格式、
  sidecar 否决)已写入「S2/S3 特别风险」节。
- 必改项(R,design 层面,Codex 收敛后 Kimi 复核重签):
  - **R-S3-1~4**:按「S2/S3 特别风险」节改写 S3 行与本节——版本条件发出、W7G-A 消费方清单、
    运行时一致性、静默擦除路径关闭的明确表述。
- 建议项/必落钉(P,不阻塞签字,build 验收核对):P1 按通道排他(S8)/P2 所有权守卫覆盖全部组外
  写路径(S10)/P3 ghost revision 含 undo/redo(S12)/P4 placement 存储体积 fixture(S7)。
- GLM: **agree（2026-07-18;附 G1-G3 build 必落,见下）**。S1-S16 消费方清单逐项核对 + 代码逻辑审查 + S3 收敛方案独立数据/MG2 复核。

  **代码逻辑审查（读源码逐路径推演）** ✅：
  - **validateProjectMapV2**（project-map.ts:75-148）：逐字段重建返回对象（:147），无 spread 原始输入，未知字段静默丢弃。`version!==2` throw（:77-78）。
  - **formatProjectMapV2**（:166-189）：先 validate 再逐字段发射 JSON，version 硬编 2（:179），authoring 不在发射列表。旧编辑器加载带章地图→保存=静默擦除。
  - **Kimi S3 counter 条件实证成立**。✅

  **S1-S16 消费方逐项核对** ✅（重点 S1/S2/S3/S7/S8/S15）：
  - **S1** stamps.json 独立表：沿 A7-0 新 content 表先例，按 id MG2 合并。当前零代码零产物。✅
  - **S2** placement 入 map authoring：copy-through（project-io.ts:140-142 raw text 不 parse）免费继承。✅
  - **S3** 条件 v3：5 处 map 版本消费方全列出（isProjectMapV2:32/validate:77/format:179/loadProjectMap:assets.ts:51/serializeProject:project-io.ts:139），R-S3-2 "同 build 接受 2|3" 覆盖全 5 处零遗漏。✅
  - **S7** 不存模板值快照：普通矩阵唯一运行真值。✅
  - **S8** 排他所有权：P1 按通道钉死。✅
  - **S15** migration/MG2：预置模板 id 合并 + placement ours-only + 单地图 atomic 整文件 sha256 三方（mergeAtomicMapFile:90-134 不解析内部字段）。✅

  **S3 收敛方案独立数据/MG2 复核——agree Kimi counter** ✅：条件 v3 不引入新消费方遗漏或二跑零计划风险；copy-through/MG2 atomic 免费继承；sidecar 否决正确（in-map 免平行补齐全部路径）；旧工程零 diff（无章保持 v2 不物化空 authoring）。

  **G1-G3 build 必落（非阻塞）**：
  - **G1（关键）**：`serializeMigrationJson`（migration-baseline.ts:27-28）对 map 路径调 formatProjectMapV2——迁移器 canonicalize 带章 v3 地图时 format 须保留 authoring 并输出 version:3。**R-S3-2 消费方清单须显式纳入此第二 format 调用点。**
  - **G2**：stamps.json MG2 合并模式——确认在 arrayMode 中登记为 id-mode（沿 content 表先例），否则 atomic 整文件替换作者模板。
  - **G3**：manifest.content.stamps 指向 stamps.json——确认 manifest content key 注册不与 A7-4 v4 冲突。

  **总结**：消费方清单零遗漏；S3 收敛方案从数据/MG2 视角 agree；代码逻辑审查确认 Kimi counter 实证成立；stamps.json 零代码零产物；W8 stamp-placement dead branch 干净。**agree。**

- 是否建议进入 build: **否——Codex 接受 R-S3-1~4 收敛 S3 + Kimi 重签后三签齐方可 build**。GLM 已 agree；G1-G3 纳入 build 范围。
  若 Codex 接受 R-S3-1~4 并改卡,Kimi 可直接重签 agree,无需用户拍板;若 Codex 坚持原案,
  请用户拍板「条件 v3(Kimi)vs v2+风险写清(Codex)」。

### 三方争议记录

- Codex:建议采用独立模板表 + ProjectMap 可选 authoring placement;多层局部 layer slot 显式映射;
  placement 绝对排他成员;多组但不与普通 cells 混选;单一复合 Command。完整立场见 S1-S16。
- Kimi:pending。
- GLM: **agree**。S1-S16 消费方清单逐项核对零遗漏(5 处 map 版本消费方+stamps 表/MG2/IO 全链)；S3 收敛方案(条件 v3)从数据/MG2 视角独立复核 agree——不引入新消费方遗漏或二跑零计划风险，copy-through/MG2 atomic 免费继承，sidecar 否决正确；代码逻辑审查确认 validate/format 逐字段重建丢未知字段(Kimi counter 实证成立)；stamps.json 零代码零产物(W7G 新建)；W8 stamp-placement dead branch 干净(assertNever 编译期暴露)。G1(serializeMigrationJson 第二 format 调用点)/G2(stamps.json MG2 id-mode 登记)/G3(manifest content key 注册)build 必落。
- 用户拍板:已拍板的十条产品语义见上;schema 分歧若三方无法收敛再请用户裁决。

## 推进签字

签字是阶段门禁,`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-18）**。已通读第二阶段铁律、W7B/W7F/W8、roadmap、editor design、
  capability map 和 content/reforge/editor/migrate 代码锚点;同意“用户已拍板语义”以及 S1-S16 的
  Codex 建议方案。S2/S3 旧二进制擦除风险已显式暴露给 Kimi,不是默认忽略。
- Kimi: **counter（2026-07-18,仅 S3;S1-S2、S4-S16 agree,逐项见上表与「主审立场」）**。
  锚点抽验:`validateProjectMapV2`/`formatProjectMapV2` 逐字段重建、未知字段双侧静默丢弃
  (content/project-map.ts:75-148/:166-189),`version!==2` fail-loud(:77-78)——旧二进制「加载→修改→
  保存」带章地图会静默擦除全部 placement;copy-through(project-io.ts:142/:196)与 MG2 单图 atomic
  (migration-merge.ts:43-57)实证支持 S2 入图方案、否掉 sidecar。S3 收敛方案 R-S3-1~4 与 build 必落钉
  P1-P4 已写入「S2/S3 特别风险」节。Codex 按该节收敛 S3 后 Kimi 重签;若 Codex 坚持原案请用户拍板。
- GLM: **agree（2026-07-18;附 G1-G3 build 必落,见「主审立场」GLM 行）**。消费方清单零遗漏+S3 收敛方案数据/MG2 视角 agree+代码逻辑审查确认 Kimi counter 实证。
- counter / 分歧处理:Kimi 对 S3 签 counter(版本策略),任务留 draft;收敛路径:R-S3-1 版本按内容条件
  发出(有章 v3/无章 v2)、R-S3-2 消费方 W7G-A 同 build 接受 2|3、R-S3-3 运行时零第二格式、
  R-S3-4 sidecar 否决。Codex 接受并改卡 → Kimi 重签 agree;Codex 反 counter → 用户拍板
  「条件 v3(Kimi)vs 保持 v2+风险写清(Codex)」。
- 缺签豁免:N/A。
- build 准入结论:**blocked(Kimi S3 counter 待 Codex 收敛 R-S3-1~4 并改卡后 Kimi 重签；GLM 已 agree 附 G1-G3)**。

### 进入 done 前:审查签字

- Codex: pending。
- Kimi: pending。
- GLM: pending。
- counter / 返工处理:N/A。
- 缺签豁免:N/A。
- done 准入结论:**blocked**。

## 额度 / 代班记录

- 缺席 Agent:none。
- 代班安排:N/A。

## Build:实现与自测

- Coding Owner:Codex(设计三签前不得开始)。
- 修改文件:尚无。
- 实现摘要:尚未开始。
- 运行命令:尚无。
- 浏览器 / 手工检查:尚无。
- 跳过的检查及原因:设计门禁未满足。

## 视觉验证记录

- Visual Verification Owner:Codex;Kimi 复验。
- 验证方式:待 build 后使用专用 fixture、本地 dev server、Playwright/浏览器截图与 Console 检查。
- 截图 / 像素检查路径:待定。
- 结论:未开始。
- 未完成项:全部 W7G 视觉验收。

## Review:审查与返工

- Reviewer:Kimi + GLM。
- 审查结论:pending。
- 必须返工项:pending。
- Accept / rework:pending。

## 用户验收

- 用户结论:已要求“按顺序开始”;当前仅授权先收口 git、再起草 W7G 和走三方设计签字。
- 后续任务:三方设计签齐后才进入 build。

## 交接日志

- 2026-07-18 Codex:完成 W7G 上下文重建、产品语义固化、S1-S16 设计投票、交互/权限/生命周期/
  MG2/测试矩阵草案并签设计 `agree`。Evidence:本卡、W8/W7F/W7B 和列出的代码锚点。
  Next:Kimi 做架构/schema 主审,GLM 做数据/MG2/测试覆盖审查;两方都不得改实现文件。
- 2026-07-18 Kimi:架构/schema/版本/状态机/生命周期主审完成,签 **counter(仅 S3)**。
  S1-S2、S4-S16 逐项 agree(见表);锚点实证:validate/format 逐字段重建丢未知字段
  (project-map.ts:75-148/:166-189)、copy-through(project-io.ts:142/:196)、MG2 单图 atomic
  (migration-merge.ts:43-57)。S3 收敛方案 R-S3-1~4(版本按内容条件发 3/消费方同 build 接受 2|3/
  运行时零第二格式/sidecar 否决)与必落钉 P1-P4 写入「S2/S3 特别风险」节。Codex 接受并改卡 →
  Kimi 重签 agree;Codex 反 counter → 用户拍板。Evidence:本卡 S 表、S2/S3 节、主审立场、签字区。
  Next:Codex 收敛 S3 章节;GLM 并行做数据/MG2/覆盖审查(提示词见下,含 S3 counter 通报)。
  未改实现文件。
- 2026-07-18 GLM: 数据/MG2/覆盖审查签 **agree**。代码逻辑审查（读源码逐路径推演）：validateProjectMapV2(:75-148)逐字段重建丢未知字段+version!==2 throw；formatProjectMapV2(:166-189)逐字段发射 version 硬编 2——Kimi S3 counter 实证成立。S1-S16 消费方逐项核对零遗漏：5 处 map 版本消费方(isProjectMapV2/validate/format/loadProjectMap/serializeProject)全列出，R-S3-2 覆盖全部；copy-through(project-io.ts:140-142 raw text 不 parse)免费继承；MG2 单地图 atomic(mergeAtomicMapFile:90-134 整文件 sha256 不解析内部字段)不受影响；stamps.json 零代码零产物(W7G 新建)；W8 stamp-placement dead branch 干净(assertNever 编译期暴露)。**S3 收敛方案独立数据/MG2 复核 agree Kimi**：条件 v3 不引入新消费方遗漏或二跑零计划风险，sidecar 否决正确。**G1 关键**：serializeMigrationJson(migration-baseline.ts:27-28)对 map 路径调 formatProjectMapV2 是第二 format 调用点——R-S3-2 消费方清单须显式纳入。G2 stamps.json MG2 id-mode 登记；G3 manifest content key 注册。Evidence: 主审立场 GLM 行。Next: Codex 接受 R-S3-1~4 收敛 S3→Kimi 重签→三签齐 build allowed。未改实现文件。

## 下一位 Agent 提示词

### 给 Codex（S3 收敛）

```text
接手任务:W7G 组合地物图章与可持久放置组——S3 版本策略收敛
任务卡:docs/ops/tasks/W7G-composite-tile-stamps.md
当前状态:draft；Codex/Kimi 已签,GLM pending；Kimi 对 S3 签 counter,build 准入 blocked
背景:Kimi 逐项审查 S1-S16,仅 S3 counter,其余全 agree(含 S2 入图方案,sidecar 已否决)。
      阻塞点:「保持 version:2 + 风险写清」下,旧二进制「加载→修改→保存」带章地图会静默擦除
      全部 placement(validate/format 逐字段重建丢未知字段,project-map.ts:75-148/:166-189)。
请你做:按「S2/S3 特别风险」节的 R-S3-1~4 改写 S3 行与该节表述——版本按内容条件发出
      (authoring.stampPlacements 非空→version:3,否则 version:2 且不物化空 authoring)、
      W7G-A 消费方(isProjectMapV2/validate/format/loadProjectMap/migrate)同 build 接受 2|3、
      运行时零第二格式、静默擦除路径关闭的口径;P1-P4 必落钉并入对应分期验收。
      改完在任务卡记录收敛内容,Kimi 复核后直接重签 agree,无需用户拍板。
不要做:不要修改实现文件;不要把 Status 改为 build;不要碰 GLM/Kimi 已签内容。
分支:若你不同意 R-S3-1(条件 v3),在任务卡写明反 counter 理由,转用户拍板
      「条件 v3(Kimi)vs 保持 v2+风险写清(Codex)」。
```

### 给 GLM

```text
接手任务:W7G 组合地物图章与可持久放置组——数据/MG2/覆盖审查
任务卡:docs/ops/tasks/W7G-composite-tile-stamps.md
当前状态:draft；Codex agree、Kimi counter(仅 S3,收敛方案 R-S3-1~4 已写入「S2/S3 特别风险」节)、
        GLM pending，build 准入 blocked
你的角色:消费方清单、数据不变量、确定性序列化、迁移/MG2、工程 IO 与测试矩阵主审
先读:AGENTS.md；docs/phase2/READ-FIRST.md；本任务卡全文(含 Kimi 的 S 表逐项结论、S2/S3 节与主审立场)；
      docs/ops/tasks/W8-map-content-selection-inspector.md；
      docs/ops/tasks/W7B-tileset-library.md；docs/phase2/migrate/asset-pipeline.md；
      本卡列出的 content/editor/migrate 代码锚点
已完成:用户十条语义已固化；Codex 给出候选 schema、S1-S16 立场、状态/权限矩阵、MG2 和 A-F 测试草案;
      Kimi 已完成架构/schema 主审(仅 S3 counter)
请你做:逐项核对 S1-S16 的所有读写消费者,重点审查 S1/S2/S3/S7/S8/S15、旧工程/懒加载/copy-through/
      clone/ZIP、单地图原子合并、作者接管和二跑零计划;补齐遗漏测试。
      特别请你从数据/MG2 视角复核 Kimi 的 S3 收敛方案(条件 v3 + 消费方同 build 接受 2|3)是否引入
      新的消费方遗漏或二跑零计划风险——若你也有 S3 异议,请独立签 counter 并给出你的方案。
      无阻塞则在“进入 build 前”GLM 行签 agree;有问题签 counter 并给精确返工项
不要做:不要修改任何实现文件,不要把 Status 改为 build,不要把 build 准入改 allowed;三签未齐
输出要求:任务卡内留下覆盖证据和 agree/counter;明确是否存在未登记消费者、数据丢失路径或迁移不可逆风险
```

### 历史提示词（已完成轮次,存档）

<details>
<summary>给 Kimi（设计主审）—— 已完成,签 counter(仅 S3)</summary>

```text
接手任务:W7G 组合地物图章与可持久放置组——设计主审
任务卡:docs/ops/tasks/W7G-composite-tile-stamps.md
当前状态:draft；Codex 已签设计 agree，Kimi/GLM pending，build 准入 blocked
你的角色:架构/schema/版本/跨包接口/选择状态机/图层与 collision 权限/生命周期主审
先读:AGENTS.md；docs/phase2/READ-FIRST.md；本任务卡全文；
      docs/ops/tasks/W8-map-content-selection-inspector.md；
      docs/ops/tasks/W7F-canonical-map-pipeline.md；docs/phase2/editor/editor-design.md §5.2.1；
      本卡列出的 content/reforge/editor 代码锚点
已完成:用户十条语义已固化；Codex 给出候选 schema、S1-S16 立场、状态/权限矩阵、事务与测试草案
请你做:逐项审查 S1-S16，重点裁定 S2/S3 的 ProjectMap authoring 与版本前向风险、S8-S13 的
        ownership/选择/组内结构编辑/原子命令/生命周期；发现问题直接在任务卡写 counter 与可执行收敛方案，
        无阻塞则在“进入 build 前”Kimi 行签 agree，并补主审证据
不要做:不要修改任何实现文件，不要把 Status 改为 build，不要把 build 准入改 allowed；GLM 尚未签字
输出要求:任务卡内留下逐项结论和 agree/counter；回复一段可直接交给 GLM 的提示词；若 counter，列明需 Codex
        收敛的准确章节和用户待拍板问题
```

</details>
