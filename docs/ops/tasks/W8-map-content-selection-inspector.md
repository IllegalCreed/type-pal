# W8 - 地图内容选择、实例属性检查与可逆变换

Status: draft
Phase: phase2
Capability: W8
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus（交互/状态/图层主审）+ GLM（覆盖/测试矩阵复核）
Visual Verification Owner: Codex
Unavailable Agents: none
Branch: main（仅登记 draft；build 分支待三签后建立）

## 目标

让作者能在地图画布中选中一个或多个**已经放置的格子/实例**，在右侧检查器中只修改 tile、实例遮挡高度或独立碰撞等指定通道，并完成移动、复制、剪切、粘贴、删除、撤销/重做、保存/重开的闭环。选择行为必须在多图层、隐藏层、锁定层、重叠图块和 W7G 跨层图章下保持可预测，不能再用“取样后重画”代替编辑。

## 范围

- 范围内:
  - 专用地图选择工具：单击、拖拽框选、增选、减选、清空、全选当前作用域。
  - 单格/多格 Inspector：混合值、只改指定属性、精确错误/跳过反馈。
  - 活动层、隐藏层、锁定层、聚焦/淡化和重叠候选的命中规则。
  - 选区移动、复制、剪切、粘贴、重复、删除；每个用户动作一次 undo/redo。
  - 普通格与独立碰撞分通道；跨层批量 patch 的原子命令地基。
  - 高大/越界绘制瓦片的可见像素命中与真实源格反馈。
  - 为 W7G 预留 `stamp-placement` 选择扩展点和跨层原子操作契约。
- 范围外:
  - W7G 图章模板库、幽灵预览、盖章与持久放置组 schema 的实现；另开 W7G 三签卡。
  - linked prefab、模板更新联动既有放置、随机笔刷、autotile、规则瓦片。
  - 任意自定义 tile property schema；W8 只编辑当前 ProjectMapV2 已有的 tile、实例高度、图层归属与碰撞通道。
- 明确不做:
  - 不把普通地图选区写入 ProjectMapV2、存档或浏览器 URL。
  - 不让显示焦点、碰撞叠加层开关或肉眼最上层暗中改变编辑目标。
  - 不按图案相似度猜“这几格原来属于同一次图章放置”。
  - 不引入第二套地图格式，也不改第一阶段 `packages/game`。

## 上下文锚点

### 已拍板决策 / 铁律

- [`docs/phase2/READ-FIRST.md`](../../phase2/READ-FIRST.md)：第二阶段优先现代、可扩展架构；全新 UI 先设计；一阶段只在有对应 UX 时作参考。
- [`docs/phase2/editor/editor-design.md`](../../phase2/editor/editor-design.md) §4/§5/§5.2：所有持久修改经 Command；地图只认 ProjectMapV2；`currentLayerId` 与高度尺当前只服务绘制/聚焦。
- [`W7F-canonical-map-pipeline.md`](W7F-canonical-map-pipeline.md)：高度属于放置实例，碰撞与视觉层独立；W7F 完成的是地图库、基础绘制、吸管和图层/高度导航，不包含已有内容选区。
- 用户 2026-07-17 追加要求：能力地图必须登记“单格/多格选择后设置属性”的缺口；W7G 盖下的图章必须可整体选择；图层不得干扰选择；交互需参考成熟产品。

### 代码锚点

- `packages/editor/src/ui/MapMode.tsx:54`：工具集合只有 pan/eyedropper/brush/rect/fill/erase/collision，没有 select。
- `packages/editor/src/ui/MapMode.tsx:133-146`：只有 palette `selectedTile`、笔刷高度、活动层、隐藏层和 stroke/hover，没有地图内容选区。
- `packages/editor/src/ui/MapMode.tsx:304-320`：一次 tile 编辑总是同时写 tileId 与 height，无法只改高度并保留混合 tile。
- `packages/editor/src/ui/MapMode.tsx:343-353`、`:386-391`：矩形工具是矩形铺瓦，不是框选。
- `packages/editor/src/ui/MapMode.tsx:356-369`：取样读取 tile+高度后直接切回笔刷；这是形成下一笔，不是编辑已有实例。
- `packages/editor/src/ui/MapMode.tsx:527-534`、`:659-713`：图层只有本地 hidden/active，没有 locked；隐藏当前活动层不会阻止后续不可见写入。
- `packages/editor/src/ui/MapMode.tsx:1078-1118`：右侧只编辑图层深度和“笔刷高度”，没有选中格 Inspector。
- `packages/editor/src/core/edit-session.ts:26-47`：EditorState 是持久内容工作副本；普通选区应放在独立的临时 MapWorkspaceState，不污染内容。
- `packages/editor/src/core/commands.ts:703-789`：tile 与 collision 当前是两条独立命令；跨层/跨通道动作需要一个原子 map patch 命令或可证明原子的复合命令。
- `packages/content/src/project-map.ts:1-25`、`:107-121`：图层有稳定 id；碰撞按格点独立；空 tile 高度必须 0，flat 层高度必须 0。

### 已知坑 / 当前界面证据

| 现状 | 直接后果 |
|---|---|
| `selectedTile` 实际是瓦片面板选中的素材 | 名称看似 selection，实际上没有选择地图内容 |
| “矩形”直接生成一批 PaintTiles edit | 拖框会覆盖地图，不会得到选区 |
| 改已有高度只能“取样 → 改笔刷高度 → 原格重画” | 同时重写 tileId；多选混合 tile 无法只改高度 |
| hidden 只传给 renderer | 隐藏活动层后仍可能向不可见层写入 |
| focus/dim 只影响 alpha | 如果把它误作命中规则，会出现“看着变暗却被编辑”或相反 |
| tile/collision 分两次 dispatch | 跨层图章或“视觉+碰撞”变换可能只完成一半，undo 也分裂 |
| W7G 现有路线只说盖章后展开普通格 | 取消选择或保存重开后无法知道哪些格属于同一次放置 |

2026-07-17 使用 6010 PAL 工程做了只读 Playwright 核对：工具栏和右侧面板与上述代码普查一致；当前右栏只有“地图 / 选中图层 / 使用场景”，没有选区检查器。

### 成熟产品参考

- [Tiled · Editing Tile Layers](https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/)：选择工具与 Stamp Brush 分离；矩形/魔棒/同类选择以及添加、减去、求交都是选区操作。
- [Tiled · Layers](https://doc.mapeditor.org/en/stable/manual/layers/) 与 [Working with Objects](https://doc.mapeditor.org/en/stable/manual/objects/)：图层显隐/锁定独立；重叠对象可用 Alt 循环或候选列表选取。
- [Unity · Select tool](https://docs.unity3d.com/2023.2/Documentation/Manual/tile-palette-select-tool-howto.html)、[Grid Selection Inspector](https://docs.unity3d.com/2023.2/Documentation/Manual/tile-palette-grid-selection.html)：地图格选择后进入独立 Inspector，多选不同值显示混合态。
- [Unity · Pick tool](https://docs.unity3d.com/2023.2/Documentation/Manual/tile-palette-pick-tool.html)：Pick 形成画刷并切回绘制，证明“取样”和“编辑选中内容”不能混成同一状态。
- [Godot · Using TileMaps](https://docs.godotengine.org/en/4.5/tutorials/2d/using_tilemaps.html)：活动图层决定编辑目标，其他层淡化；Pattern 与地图格选区是不同概念。
- [Tiled · Templates](https://doc.mapeditor.org/en/stable/manual/using-templates/)：需要跨保存保留整体身份的复合内容必须有实例/分组元数据；单纯 stamp 展开不能恢复原始边界。

不得照搬任一产品的 UI 皮肤；只吸收共同交互原则：选择与取样分离、活动目标显式、混合值可见、隐藏/锁定不误写、重叠候选可控、所有破坏性操作可撤销。

### 不得重新引入

- 数组下标作为图层身份；选择、命令和未来图章成员都必须使用稳定 `layerId`。
- 运行时识别图章、linked prefab 暗中回写、StampMap/Tilemap 双格式。
- `height` 作为 tileId 固有属性；它仍是某层某格的放置实例遮挡高度。
- `collision` 假装属于视觉层；它仍是 `{row,col}` 唯一格点属性。
- 直接 mutate map 或绕开 EditSession 的 UI-only 修改。

## Draft: 设计与风险

### 1. 四条状态轴必须分离

```ts
type VisualSlotRef = { layerId: string; row: number; col: number }
type GridPointRef = { row: number; col: number }

type MapSelection =
  | { kind: 'none' }
  | {
      kind: 'cells'
      visualSlots: VisualSlotRef[] // 可指向 null，用于空格选择/粘贴目标
      gridPoints: GridPointRef[]   // 去重后的独立碰撞作用域
      hitScope: 'active-layer' | 'visible-unlocked-layers'
    }
  | { kind: 'stamp-placement'; placementId: string } // 仅 W7G 扩展
```

与它并列、不得复用的状态：

- `paletteSelection`：瓦片面板选中的素材，是下一笔普通画刷来源。
- `activeStampTemplate`：W7G 中准备盖下去的图章模板。
- `mapSelection`：地图上已经存在的视觉槽/格点，是 Inspector 和变换目标。
- `currentLayerId`：活动层与默认命中作用域，不是“选中了该层的内容”。

`MapSelection` 放在独立 `MapWorkspaceState` 中，按 mapId 管理，切图时清空或恢复同会话临时态；不进入 EditorState、工程 JSON、存档或 URL。属性修改、变换和 W7G 放置组身份才属于持久内容。

### 2. 工具与手势

| 输入 | 结果 |
|---|---|
| 选择工具 + 单击 | 替换为一个逻辑格选区；若命中图章组，W7G “对象粒度”先选整组 |
| 选择工具 + 拖拽 | 在当前 hit scope 中按 lattice 框选；空格也进入 gridPoints，因其可能有碰撞 |
| Shift + 单击/拖拽 | 增选 |
| Ctrl/Cmd + 单击/拖拽 | 减选；不得与浏览器默认快捷键冲突 |
| Esc | 取消当前拖拽；再次 Esc 清空选区；W7G 组内编辑时先退出组内层级 |
| Ctrl/Cmd+A | 只全选当前明确作用域，不跨隐藏/锁定层 |
| Alt/Option + 单击 | 打开/循环当前位置候选（层、坐标、tile、遮挡高度、未来图章组），用户确认后才可切活动层 |
| 双击图章成员或 Enter | W7G 中进入组内格编辑；普通单击仍保持整组选择 |

拖拽期间必须捕获指针并禁用页面文本选择；Esc/失焦/pointercancel 均能干净回滚预览。工具按钮要有语义按钮、可见 focus、`aria-label`/快捷键提示；不能只靠颜色表达选中。

### 3. 图层与命中规则

| 图层状态 | 可见 | 普通命中 | 可写 | 说明 |
|---|---:|---:|---:|---|
| 活动 + 显示 + 未锁 | 是 | 是 | 是 | 默认唯一普通命中目标 |
| 非活动 + 显示 + 未锁 | 是/可淡化 | 否 | 仅显式多层选区可写 | 只有显式“所有可见未锁层”或候选切换才进入；普通操作不写 |
| 隐藏 | 否 | 否 | 否 | 即使仍是 currentLayerId 也禁用绘制/粘贴并显示原因 |
| 锁定 | 是 | 否 | 否 | 候选列表可灰显说明，但不能误选误写 |
| 聚焦外/淡化 | 是 | 仍按上述规则 | 仍按上述规则 | focus/dim 只改变显示 alpha，不改变 hit policy |

- 图层列表新增显式锁定按钮；W8 首版锁定/显隐属于编辑器工作区状态，不写运行时 map schema。若后续要跨会话保存，只能进入独立作者 UI 偏好，不得混进游戏语义。
- 隐藏或锁定当前活动层时不偷偷切层；画布进入只读并在工具栏说明“当前层已隐藏/锁定”，由作者显式显示、解锁或切层。
- 所有 selection/command 按稳定 layerId；图层改名、重排不漂移。删除层、缩图、切图时由纯 reducer 对选区做裁剪/清空，不能留下悬空引用。
- 高大瓦片的位图会覆盖其逻辑源格之外的屏幕区域；单击既检查光标下的逻辑格，也对可见、未锁候选做透明像素命中。选中后同时画出源格菱形与可见图像轮廓/边界，避免“看得到却点到后方格”。实例 `height` 只影响遮挡深度，不伪装成几何抬升。

### 4. Inspector 与混合值

右侧从“地图/选中图层”上下文切换为“选区”，至少含三段：

1. **摘要**：选区类型、格数、视觉实例数、范围、涉及图层、隐藏/锁定成员警告。
2. **视觉实例**：layerId/层名、tileId、实例遮挡高度；单选显示精确值，多选共同值正常显示，不同值显示“混合”。
3. **格点/碰撞**：去重坐标数、collision 共同值/混合值；明确它不随视觉层复制出多份。

编辑规则：

- 修改 tileId 只改 tileId；修改高度只改 height；修改 collision 只改 collision。不得借用现有 PaintTiles 载荷顺手覆盖其他通道。
- 高度同时提供“全部设为 N”和“整体 ±N”；只处理非空且 depthMode=`height` 的视觉实例。
- 选区含 null tile 时，高度操作必须在提交前显示“将跳过 N 个空格”；flat 层高度只读为 0，并解释为何不可改。不得生成 schema 不允许的空 tile 非零高度。
- 多层选区批量换层前检查目标层存在、未锁、未隐藏；非零高度移入 flat 层整笔拒绝，不静默归零。
- 校验失败在字段附近和状态栏同时可见；不能只写 console。结果摘要可用 `aria-live` 告知辅助技术。

### 5. 变换、剪贴板与原子命令

- 新增 channel-aware `ApplyProjectMapPatchCommand`（名称可在 build 中调整）：同一命令可按稳定 layerId 修改 tile/height，并按 grid point 修改 collision；先完整校验，再全量 apply，任一前置不满足则零写入。
- Inspector 修改、移动、删除、剪切、粘贴、重复都各自只压入一次 undo；undo/redo 恢复所有涉及层和碰撞通道。
- 普通选区移动/复制/删除默认只包含视觉实例；工具栏/变换预览提供显式“包含碰撞”开关，默认关闭并在命令摘要中显示。碰撞叠加层显隐不得改变该开关。
- 剪贴板是编辑器内结构化 payload，保存 `{relative row/col, source layer identity or mapping, tileId, height}` 与显式选入的 collision；粘贴前显示完整幽灵预览、越界、锁层和覆盖冲突。
- 目的区域冲突不得静默覆盖；首版提供“取消 / 覆盖普通格”确认。涉及未来图章组的格必须交给 W7G 规则，不在 W8 中猜测拆组。
- 提交后选区跟随到新位置；失败保持原选区。兼容 undo/redo 后按仍存在的 stable refs 保持，否则裁剪并报告。

### 6. W7G 整章选择契约（W8 只留接口，不实现 schema）

W7G 盖章若只写普通格，最多只能在“刚盖完”的内存里知道本次成员；取消选择、相邻盖同款、局部覆盖或保存重开后都无法可靠恢复边界。用户要求的是跨保存的精确整体选择，因此 W7G 后续卡必须持久化**非链接的作者态放置组身份**：

```ts
type StampPlacementGroup = {
  id: string
  stampId: string
  anchor: GridPointRef
  members: VisualSlotRef[]
  collisionMembers: GridPointRef[]
}
```

这只是最小语义草图，不是未经签字的最终 schema。W7G 正式设计必须裁定并测试：

- 两个相邻同款图章仍是两个稳定 groupId；重叠时候选如何循环、是否首版阻止成员所有权冲突。
- 覆盖/擦除/移动单个成员时是缩减并标“残缺”、还是要求先进入组内/解组；不得产生悬空成员。
- 点击任一成员整组选中；双击/Enter 进入组内；“解组”只删身份，保留普通格内容。
- 跨层整体移动/复制/删除/undo 全有或全无；任一成员层隐藏、锁定、缺失时整笔拒绝并列出原因。
- 地图缩放、图层删除/重排/改名、模板删除/更新、保存重开和 MG2 的行为。
- template 改动不联动既有 placement；运行时继续只消费普通层/高度/碰撞，完全不认识图章组。

W8 的 `MapSelection` 和原子 patch 必须能由这个未来 `stamp-placement` 分支复用，但 W8 build 不得提前增加半套 group 字段。

### 7. 分期（同一 W8 卡内，全部完成才可标 done）

1. **W8-A 选择地基**：纯 selection reducer、选择叠加层、单击/框选/增减/清空、活动层命中。
2. **W8-B Inspector + 原子 patch**：混合值、tile/height/collision 分通道、undo/redo、保存重开。
3. **W8-C 变换与图层安全**：锁定、候选切换、移动/复制/剪贴板/删除、透明像素命中。
4. **W8-D 浏览器与文档收口**：6010 多层地图实测、键盘/焦点/缩放、设计文档与能力地图更新。

不得只做 W8-A 就把能力格标成半闭环或 done；W7G 可以在 W8-B/C 的稳定接口上另卡设计，但不能绕过门禁并行改同一实现。

## 验收条件

### 功能

- 选中一个现有非空格，把实例遮挡高度从 0 改为 3：tileId、碰撞和其他层不变；画布即时刷新；一次 undo/redo；保存重开仍为 3。
- 框选不同 tileId/高度的格，Inspector 显示混合值；“高度设为 2”只统一高度，原 tileId 各自保留。
- 框选空格可编辑独立 collision；对空格改高度显示跳过数且不生成非法数据；flat 层非零高度整笔拒绝。
- 上层遮住下层时，普通点击只选活动层；Alt/Option 候选可明确切到其他可见未锁层。focus/dim 开关不改变结果。
- 隐藏层、锁定层均不可被普通命中或写入；隐藏/锁定当前层时笔刷、粘贴和 Inspector 写操作禁用并说明原因。
- 点击越出源格的高大 tile 可选回真实 `{layerId,row,col}`，画布同时标出图像与源格。
- 多选移动、复制、剪切、粘贴、重复、删除均有幽灵/冲突反馈且一次 undo；“包含碰撞”开关开/关两条路径结果明确。
- 图层改名/重排不破坏选择；删层/缩图/切图不会留下悬空 refs；地图切换回来不污染其他地图选择。

### 测试

- 纯 reducer 表驱动：replace/add/subtract、空格、去重、跨层 scope、裁剪、稳定 layerId。
- 原子 patch 表驱动：单通道保持其他值、mixed 批量、null/flat/越界、隐藏/锁定、跨层失败零写、apply/invert 往返。
- 剪贴板/变换：视觉-only 与 include-collision、冲突取消/覆盖、跨层映射、undo/redo。
- React/交互：选择工具与取样互不污染、Inspector 混合态、字段错误、锁层/隐藏层禁用、候选列表、键盘与 focus。
- 浏览器：至少用 map-020 或等价多层/多高度 fixture 在 27% 与高倍缩放分别实测点击/框选；Console 新错误为 0。

### 文档

- 三签后把最终定案同步到 `docs/phase2/editor/editor-design.md`，不是只留在任务卡。
- capability-map 的 W8 只在完整验收后从 ❌ 改 ✅；W7 的“地图库与基础绘制”口径不回退成包揽全部地图编辑。
- W7G 任务卡必须引用本卡的 selection/hit/patch 契约并单独处理持久放置组 schema/MG2。

### 视觉 / 手工验证

- 选中叠加层在深色/浅色瓦片上均清晰，单选、多选、组选择、锁定、混合值不只靠颜色区分。
- 工具按钮、图层眼睛/锁、候选列表、Inspector 控件均有 hover/active/focus/disabled；文字不溢出，拖框不选中页面文本。
- 画布缩放/平移后命中与叠加层仍对齐；高大瓦片、相邻同款图章和跨层图章留给相应验收场景。

## 已知风险

| 风险 | 缓解 |
|---|---|
| 把 selection 塞进 EditorState 导致保存/undo/history 污染 | 独立 MapWorkspaceState；只有内容 patch 进入 EditSession |
| 普通格和 collision 共用一个“tile 属性”导致跨层重复写 | VisualSlotRef/GridPointRef 分模，Inspector 分区，命令按 channel 去重 |
| 多层可见时按肉眼顶层自动选中，操作目标漂移 | 默认 active-layer；显式 scope/候选切换；focus 纯显示 |
| 高大 tile 只能点逻辑菱形或误点后方 | 透明像素 hit + 源格双重反馈；候选循环 |
| tile 与 collision 两条命令造成半写/双 undo | 原子 map patch，提交前全量校验 |
| W7G 继续只展开普通格却承诺整章重选 | roadmap 明示持久非链接 group 要求；W7G 另卡三签 schema |
| 过早加入 linked prefab 或第二地图格式 | placement 只保存身份；普通矩阵继续运行时真值；模板不回写 |
| 视觉/键盘交互遗漏 | 按 Web Interface Guidelines 加语义控件、可见 focus、Esc cancel、aria-live 和 reduced-motion 检查 |

## 推进签字

签字是阶段门禁。本卡新增能力格并设计跨层原子命令扩展点，必须三方设计 `agree` 后才能进入 build。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-17）**。已完成 MapMode/EditorState/Command/ProjectMapV2 静态普查、6010 Playwright 界面核对和 Tiled/Unity/Godot 官方交互参考；结论是新增 W8、W7 收窄保持 ✅、W8 作为 W7G 前置，普通 selection 不持久化，W7G 的整章重选必须另卡设计持久非链接 placement group。
- Opus: **agree（2026-07-17,附 R1-R5 必改 + S1-S2 建议 + G3 答复,见主审立场）**。七个重点逐项压测,
  锚点抽验吻合(editFor :304-320 tileId+height 一体写实证/hiddenLayerIds 纯 UI Set 无 locked/双命令各持
  独立 prev/project-map 约束 :116-119):
  1. **四状态轴正交成立**:paletteSelection(下一笔素材)/activeStampTemplate(待盖模板)/mapSelection
     (已有内容)/currentLayerId(作用域)四者语义互斥,MapSelection 双成分(visualSlots+gridPoints)与
     变换"默认视觉-only、碰撞显式开关"自洽;MapWorkspaceState 按 mapId 独立、不进 EditorState/JSON/URL,
     与 X 系呈现态先例同构。Pick 工具"取样即切笔刷"(:356-369)与选择工具分离 = Tiled/Unity 共识,正确。
  2. **图层命中矩阵成立**:§3 五态表 + GLM 四维矩阵闭合;隐藏/锁定活动层→画布只读+显式说明不偷切层、
     focus/dim 纯 alpha 不进 hit policy、稳定 layerId+削剪 reducer——全部正确。
  3. **重叠候选成立**,附 R5(循环排序确定性)。
  4. **高大 tile 命中可落地**:**G3 关闭**——tiles = `Map<number, RleFrame>`(tilesFromChunkBytes,
     assets.ts:288),`RleFrame.opaque` 掩码(shared/rle.ts:13-21,1=不透明/0=RLE-skip)可直查像素命中,
     **不依赖渲染时 ImageBitmap、零额外预解码**;源格菱形+图像轮廓双反馈正确。附 R1(命中优先级钉死)。
  5. **混合值 Inspector 成立**:分通道/±N/跳过空格提示/flat 只读/换层前置校验全对;附 R4(批量换层
     冲突语义补齐)。
  6. **跨层原子命令成立**:前置全校验+零写入+一次 undo;与现存 PaintTiles/PaintCollision 并存不冲突
     (笔刷续用旧命令,Inspector/变换走新 patch,同一 EditSession undo 栈);GLM G2 双 prev 采纳。
  7. **不持久/持久边界成立**:普通选区会话态、W7G 非链接 placement group 另卡持久——§6 契约把
     "刚盖完才知道成员"的记忆缺陷说透了,划界正确;W8 只留 stamp-placement 类型分支,附 S2。
- GLM: **agree（2026-07-17;附 G1-G3 build 必落 + build 必落测试清单,见下）**。四维矩阵逐项核对 + 代码锚点全实证。

  **代码逻辑审查（读源码，非仅跑测试）** ✅：
  - **commands.ts:703-789**：`PaintTilesCommand`（:703-749）和 `PaintCollisionCommand`（:751-789）是两条独立 Command——前者写 `{layerId,col,row,tileId,height}` 一体（tile+height 原子但 collision 分离），后者写 `{col,row,value}`。跨通道原子 patch **当前不支持**，须新增复合命令。`prev` 快照模式可复用但双通道结构是真新工作。✅
  - **project-map.ts:1-25,107-121**：`MapLayerV2` 有稳定 `id`/`depthMode`/`tiles`/`heights?`；`ProjectMapV2.collision` 是独立矩阵。约束验证：null tile height≠0 throw（:116-117）、flat 层非零高度 throw（:118-119）、height 层须有 heights（:107-108）。lattice = `2*height` 行 × `width` 列。✅
  - **MapMode.tsx 全锚点确认**：:54 工具集无 select / :133-146 无选区状态 / :304-320 tileId+height 耦合写入 / :343-353 矩形=铺瓦非框选 / :527-534 只有 hidden 无 locked / :1078-1118 右栏只有 depthMode+笔刷高度。✅
  - **edit-session.ts:26-47**：EditorState 纯持久内容（maps/manifest/assets/scripts），无 MapWorkspaceState 概念。选区须放独立 UI 层状态（沿 hiddenLayerIds/activeLayerId 先例），不进 dispatch/undo/serialize。✅

  **四维矩阵核对** ✅：
  | selection 操作 | active 层 | non-active 层 | hidden 层 | locked 层 |
  |---|---|---|---|---|
  | replace（单击/框选） | ✅ 命中+可写 | ❌ 普通不命中（须显式 scope） | ❌ 不命中不写 | ❌ 不命中不写 |
  | add（Shift） | ✅ 增选 | ✅ 显式 scope 增选 | ❌ | ❌ |
  | subtract（Ctrl） | ✅ 减选 | ✅ | — | — |
  | clear（Esc/Esc） | ✅ | ✅ | ✅ | ✅ |

  | 内容类型 | tile 编辑 | height 编辑 | collision 编辑 | 约束 |
  |---|---|---|---|---|
  | null tile | ❌ 无 tile 可改 | ⚠ 跳过+提示 | ✅ 可改 | null+height≠0 → reject |
  | flat 层 tile | ✅ | ❌ 只读 0 | ✅ | flat+height≠0 → reject |
  | height 层 tile | ✅ | ✅ ±N 或设 N | ✅ | — |
  | mixed tileId | 只改 tile 各自保留 | 只改 height | 只改 collision | 分通道不串扰 |
  | collision-only 格 | — | — | ✅ | gridPoint 去重 |

  | command | apply | invert | fail-zero-write | save-reopen |
  |---|---|---|---|---|
  | 单通道 patch | ✅ | ✅ prev 快照 | ✅ 前置校验 | ✅ |
  | 跨通道 patch | ✅ 需新复合命令 | ✅ 双 prev | ✅ 任一通道失败全回滚 | ✅ |
  | 移动/复制/剪切/粘贴 | ✅ | ✅ | ✅ 目标层检查 | ✅ |
  | 删除 | ✅ | ✅ | ✅ | ✅ |

  **关键边界确认** ✅：
  - **collision 去重**：VisualSlotRef 按 `{layerId,row,col}` 去重，GridPointRef 按 `{row,col}` 去重——多视觉层共享同一格点时碰撞只一份。✅
  - **跨层原子失败**：设计 §5 "先完整校验，再全量 apply，任一前置不满足则零写入"——前置校验含目标层存在/未锁/未隐藏 + schema 约束。✅
  - **剪贴板 include-collision**：默认关，显式开关，payload 含 `{relative row/col, layer mapping, tileId, height}` + 选入 collision。✅
  - **缩图裁剪**：删层/缩图/切图时 reducer 对选区裁剪/清空，不留悬空 refs。✅

  **能力总数** ✅：capability-map.md 头部已写 **58 格**（W=8 含 W8），W8 已登记在 :61（引擎—/编辑器❌）。W8 done 时只改 ❌→✅，不改变总数。卡内"57→58"措辞 stale（已含 W8）。**G1**：修正卡内措辞"57→58"→"58（W8 已含）"。

  **W7/W8/W7G 边界** ✅：W7 ✅ 只覆盖地图库+画笔/吸管/擦除/碰撞+图层显隐/排序/高度尺（不包选区/Inspector/锁定）；W8 ❌ 新增选区+Inspector+锁定+候选+变换+W7G 接口；W7G 另卡持久 placement group schema（W8 只留 `stamp-placement` 分支不实现）。✅

  **总结**：代码锚点全实证（双命令/独立碰撞矩阵/耦合写入/无选区/无锁定/无 Inspector）；四维矩阵全闭合（selection×图层×内容×command 无漏格）；collision 去重/跨层原子/剪贴板/缩图裁剪设计正确；能力总数 58 已含 W8。**agree**。

  **G1-G3 非阻塞（纳入 build 范围）**：
  - **G1**：卡内"57→58"→"58（W8 已含）"。
  - **G2**：跨通道原子命令须确保 `invert` 恢复**双 prev**（tile prev + collision prev），不能只恢复一个通道——当前 PaintTilesCommand/PaintCollisionCommand 各自独立 prev，复合命令须协调两者。
  - **G3**：透明像素命中需读取 tileset 像素——确认命中计算不依赖渲染时 ImageBitmap（否则离屏 tileset 须预解码）。Opus 审查时确认。

  **build 必落测试清单**（纯函数 + 逻辑，非 UI 手测）：
  1. **selection reducer 表驱动**：replace/add/subtract/clear × 空格/非空/mixed/collision-only × 去重验证
  2. **selection 裁剪**：删层/缩图/切图后零悬空 refs（每项独立用例）
  3. **原子 patch 单通道**：只改 tileId 不变 height/collision；只改 height 不变 tileId（flat 层 reject + null tile skip + height 层 ±N）
  4. **原子 patch 跨通道**：tile+collision 同时改 apply/invert 双 prev 恢复 + 任一通道校验失败零写入
  5. **原子 patch 边界**：null+height≠0 reject / flat+height≠0 reject / 目标层隐藏或锁定 reject
  6. **剪贴板**：visual-only vs include-collision payload 形状 + 跨层映射 + 冲突取消/覆盖
  7. **变换**：移动/复制/剪切/粘贴/删除 各 apply/invert + 选区跟随新位置 + 失败保持原选区
  8. **undo/redo 后选区**：stable refs 仍存在则保持，否则裁剪

- counter / 分歧处理: 无；三方全 agree。GLM 标 G1-G3 build 必落 + 8 条测试;Opus 标 R1-R5 必落 + S1-S2
  建议,并关闭 G3(RleFrame.opaque 掩码直查,无 ImageBitmap 依赖);两处设计裁量(R1 所见即所选优先级/
  R3 全选收窄)已由 Opus 裁定,用户可在 build 前推翻。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R5 + G1-G2 +
  8 条 build 必落测试全部纳入 build 范围,交 Codex 按 W8-A→D 分段 build。

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

### 主审立场

- Reviewer: Opus
- 结论(Opus,2026-07-17): **agree——七问全立**(四轴正交/命中矩阵/候选/高大 tile 可落地且 G3 关闭/
  混合 Inspector/原子命令/持久边界),无架构 counter。
- 必改项(R,设计层面补明,build 必落):
  - **R1 命中优先级钉死**:同一次普通单击,active 层内"光标逻辑格非空"与"邻近高大 tile 透明像素命中
    指向他格"同时成立时,取**像素命中的源格**(所见即所选),光标逻辑格进 Alt 候选;跨层像素命中只进
    候选、不抢默认目标。此规则必须写进设计并有表驱动测试,否则实现各自漂移。
  - **R2 hitScope 显式切换控件**:`visible-unlocked-layers` 作用域在 §2 手势表中没有入口——需工具栏
    显式"跨层选择"开关(或等价 UI),且切换 scope 不得静默改动既有选区(保持或清空,二选一钉死并提示)。
  - **R3 全选语义收窄**:Ctrl/Cmd+A = 活动层全部**非空视觉槽** + **非默认 collision 格点**;不含
    "空且无碰撞"的格点——否则 128×128 图全选产生数万 lattice 格,叠加层与 Inspector 双爆。全选后
    27%/高倍缩放的叠加层渲染性能并入浏览器验收。
  - **R4 Inspector 批量换层的目标格冲突语义**:与粘贴一致(取消/覆盖普通格确认),不静默覆盖、不部分
    迁移;写进 §4 编辑规则。
  - **R5 Alt 候选循环排序确定性**:按图层面板顺序自上而下,同层内按源格 (row,col);可测、不随渲染序漂移。
- 建议项(S,不阻塞):
  - S1 §1 措辞"visualSlots 可指向 null"改为"视觉槽引用;槽可为空(空格选择/粘贴目标)"——引用永远指向
    槽位而非 tile,防"ref 为 null"误读。
  - S2 `stamp-placement` 分支在 W8 内是预留 dead branch:所有 switch 用 TS `never` 兜底穷尽,W7G 接入时
    编译期暴露全部需扩展位点。
- G3 答复(GLM 问透明像素命中依赖):**关闭**——命中直查 `RleFrame.opaque` 掩码(shared/rle.ts:13-21),
  编辑器画布与 reforge 渲染共用同一 `tilesFromChunkBytes` 解码产物,无 ImageBitmap 依赖、无额外预解码。
- 用户待裁决问题: **无阻塞裁决**。两处设计裁量已由本签字直接裁定,如与你的直觉不符可在 build 前推翻:
  ① R1 的"所见即所选"优先级(另一选项是"逻辑格优先、像素命中进候选");② R3 的全选收窄(另一选项是
  全选含全部空格碰撞点)。
- 是否建议进入 build: **是——三签齐,build allowed**(R1-R5 + G1-G3 + 8 条测试全纳入 build 范围)。

### 三方争议记录

- Codex: 建议 W8 不改 ProjectMapV2 schema；普通选区/显隐/锁定均为作者工作区态。W7G 为满足保存重开后整章选择，需要独立三签后增加非链接 placement group 作者元数据。
- Opus: **agree**。七问全立(四轴正交/命中矩阵/候选/高大 tile/混合 Inspector/原子命令/持久边界);
  G3 关闭(RleFrame.opaque 掩码直查,零 ImageBitmap 依赖);附 R1(像素命中优先级=所见即所选)/
  R2(跨层 scope 显式控件)/R3(全选收窄防 lattice 爆炸)/R4(换层冲突=粘贴语义)/R5(候选排序确定性)
  +S1-S2。两处裁量(R1 优先级/R3 收窄)已裁定,用户可在 build 前推翻。
- GLM: **agree**。代码锚点全实证(PaintTilesCommand/PaintCollisionCommand 双独立命令 + ProjectMapV2 独立碰撞矩阵 + tileId/height 耦合写入 + 无 select/无 locked/无 Inspector)；四维矩阵(selection×图层×内容×command)全闭合无漏格；collision 去重(VisualSlotRef/GridPointRef 分模)/跨层原子(前置校验零写入)/剪贴板 include-collision/缩图裁剪 设计正确；能力总数 58 已含 W8(卡内"57→58"stale)。G1(措辞57→58)/G2(跨通道 invert 双 prev)/G3(透明像素命中依赖)+ 8 条 build 必落测试。
- 用户拍板: 2026-07-17 要求新增能力、整章可选、图层不干扰并参考成熟产品；具体 schema/命令细节待三方签字。

## Build: 实现与自测

- Coding Owner: Codex（待 build allowed）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## Review

- 代码审查: pending
- 独立测试复跑: pending
- 视觉验证: pending
- capability-map 更新: pending

## 交接记录

- 2026-07-17 Codex: 新增 W8，完成现状普查、成熟产品参考、交互/状态/图层/命令/W7G 边界草案并签设计 agree。Evidence: 本卡、capability-map、roadmap、6010 Playwright snapshot。Next: Opus 做交互/架构主审，GLM 做覆盖/测试矩阵复核；三签前不得改实现文件。
- 2026-07-17 GLM: 覆盖/测试矩阵复核签 **agree**。代码逻辑审查(非仅跑测试)：commands.ts:703-789 PaintTilesCommand/PaintCollisionCommand 双独立命令(跨通道原子须新建复合命令)；project-map.ts 独立碰撞矩阵+null tile height=0/flat 层 height=0 约束验证(:116-119)；MapMode.tsx 全 6 锚点确认(无 select/无 locked/无 Inspector/tileId+height 耦合/矩形=铺瓦/hidden 无 locked)；edit-session.ts 纯持久内容选区须独立 UI 层。四维矩阵逐项闭合无漏格。collision 去重/跨层原子/剪贴板/缩图裁剪设计正确。能力总数 58 已含 W8。G1(57→58 stale)/G2(跨通道 invert 双 prev)/G3(透明像素命中)+ 8 条 build 必落测试清单。Evidence: 设计签字 GLM 行。Next: 待 Opus 签后三齐 build allowed。未改实现文件。
- 2026-07-17 Opus: 设计主审签 **agree,三签齐,build allowed**。七问全立并锚点抽验(editFor 耦合写入/
  hiddenLayerIds 纯 UI 无 locked/双命令独立 prev/project-map 约束);**G3 关闭**——透明像素命中直查
  `RleFrame.opaque` 掩码(shared/rle.ts:13-21),编辑器画布与 reforge 共用 tilesFromChunkBytes 解码产物,
  零 ImageBitmap 依赖零预解码。R1-R5 必落:像素命中优先级钉死(所见即所选,光标逻辑格进候选)/
  跨层 scope 显式控件(手势表缺入口)/全选收窄(非空槽+非默认碰撞点,防 128×128 全 lattice 爆炸,
  并入缩放性能验收)/Inspector 批量换层冲突=粘贴语义/Alt 候选排序=面板序+源格序。S1(visualSlots
  措辞防 null-ref 误读)/S2(stamp-placement dead branch 用 TS never 兜底)。两处裁量(R1/R3)已裁定,
  用户可 build 前推翻。Evidence: 设计签字 Opus 行+主审立场。Next: Codex 按 W8-A→D 分段 build
  (提示词见下);每段定向测试绿后进下段;实现完成自验后转 review。未改实现文件。

## 下一位 Agent 提示词

### 给 Codex(build)

```text
接手任务: W8 地图内容选择、实例属性检查与可逆变换,进入 build(Coding Owner)
任务卡: docs/ops/tasks/W8-map-content-selection-inspector.md
当前状态: draft → build allowed;三方设计签字齐(Codex/Opus/GLM 全 agree),按 W8-A→D 分段实现
先读: 本卡全部——重点 Draft 设计 §1-§7、Opus 主审立场(R1-R5+S1-S2+G3 答复)、GLM 签字(四维矩阵+G1-G2+8 条必落测试)
已拍板决策(不得偏离):
1. MapSelection 双成分(VisualSlotRef+GridPointRef)放独立 MapWorkspaceState(按 mapId,不进 EditorState/JSON/URL);
2. R1 命中优先级: active 层内像素命中(RleFrame.opaque 掩码直查,共用 tilesFromChunkBytes 解码产物——G3 已关)> 光标逻辑格,后者进 Alt 候选;跨层像素命中只进候选;
3. R2 跨层 scope 显式工具栏开关,切换不静默改选区;R5 候选排序=图层面板序+源格 (row,col);
4. R3 Ctrl/Cmd+A = 活动层非空视觉槽 + 非默认 collision 格点(不含空且无碰撞格),全选后 27%/高倍缩放性能并入验收;
5. 原子 ApplyProjectMapPatchCommand: 前置全校验零写入,invert 双 prev(G2),一动作一 undo;R4 批量换层冲突=粘贴语义(取消/覆盖);
6. 变换默认视觉-only,include-collision 显式开关;隐藏/锁定层不可命中不可写,隐藏/锁定活动层=画布只读+说明;
7. stamp-placement 分支仅留类型(S2: switch 用 TS never 兜底),不实现 group schema;普通选区不持久;
8. G1: 卡内"57→58"措辞改"58(W8 已含)";S1: visualSlots 注释改"槽可为空"措辞。
实现顺序: W8-A 选择地基 → W8-B Inspector+原子 patch → W8-C 变换与图层安全 → W8-D 浏览器与文档收口;每段定向测试绿后进下段;GLM 8 条必落测试+R1 优先级表驱动测试全落。
完成后: 全仓 pnpm check、editor build、6010 多层地图(map-020 或等价)27%/高倍缩放实测、Console 零新错,Build 节写分段证据块,签 done 前 Codex accept 转 review;不得标 done。
```
