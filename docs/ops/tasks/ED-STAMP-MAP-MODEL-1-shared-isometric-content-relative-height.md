# ED-STAMP-MAP-MODEL-1 - 组合/地图共享等距内容模型与相对高度

Status: draft
Phase: phase2
Capability: W7 / W8（地图与组合 canonical 内容模型纠偏）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

> 高风险门禁：本卡修改 content schema、save、runtime/editor 公共接口、组合放置公式与当前工程迁移。
> Codex / Kimi / GLM 三方分别签 `premise verified + design agree` 前不得进入 build。当前
> `ED-STAMP-EDITOR-1` 的共享画布 WIP 必须暂停；不能先用 UI adapter 固化现有 `StampTemplateV1` 再补数据模型。

## 目标

组合在作者模型中成为“可复用的局部小型等距地图”：它与普通地图共同消费一份 canonical 等距内容结构（稳定图层、
瓦片实例、实例高度和独立碰撞），但不成为 MapIndex 中的场景地图资产。地图实例高度是世界绝对高度；组合内部高度是
相对放置基面的高度，落图时统一按 `actualHeight = placementBaseHeight + relativeHeight` 解析。地图编辑和组合编辑随后
才能直接复用同一个中央编辑组件，而不是靠两套数据结构和两套画布逻辑互相转换。

## 范围

- 范围内：
  - 抽出地图与组合共同使用的 canonical 等距内容值对象，并确定 JSON/schema/validator/formatter。
  - 地图绝对高度、组合相对高度与放置基准高度的唯一公式。
  - 删除图层级 `flat | height` 分叉；所有非空瓦片实例都有实际高度并按实际高度参与遮挡。
  - 组合局部尺寸、显式锚点、稳定局部图层、瓦片实例、碰撞成员掩码与目标图层映射。
  - 地图选区导入组合、组合直接编辑、ghost、原子放置、placement ownership、undo/redo/save/reopen。
  - 与 `ED-MAP-MULTI-TILESET-1` 共用同一次 canonical 版本切换；不连续迁移两次地图/组合 schema。
  - 当前工程与预置组合的上游重迁/重生成；同卡删除旧类型、parser、fixture、fallback 和升级入口。
- 范围外：linked prefab；entity/触发区/脚本/场景绑定；autotile、terrain/Wang tile、随机笔刷。
- 明确不做：
  - 不新增进入 MapIndex、可被 Scene 绑定或由 runtime 独立加载的 `StampMap` 文档类型。
  - 不长期保留“组合稀疏 members + 地图矩阵”两套 canonical 结构，再靠 UI adapter 假装复用。
  - 不把高度变成 tile/tileset 固有属性；高度仍属于每次放置的瓦片实例。
  - 不让 `flat` 作为高度/遮挡豁免继续存在；图层数组顺序只保留稳定 z/tie-break 语义。
  - 不在三签前继续提交共享画布或数据 adapter 实现。

## 前提真值门

### 一句话行为 / 工程前提

当前组合是稀疏成员表、地图是定尺寸矩阵，且放置器把组合 `height` 原样写成地图绝对高度；未先确定共享内容结构与
`基准高度 + 相对高度` 公式前，组合页不可能真正复用地图编辑器，也无法得到用户要求的高度语义。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：组合库、可复用局部地图和相对高度是 Reforge 新作者能力，不由原版文件格式裁决。 | `docs/phase2/READ-FIRST.md:1-16,38-41`。 |
| 第一阶段 | N/A：第一阶段没有组合模板作者工作台；本卡不改变一阶段忠实还原数据。 | `docs/phase2/READ-FIRST.md:24-41`；`docs/phase2/foundation/phase1-knowledge-harvest.md` 无组合作者模型条目。 |
| 当前二阶段 | `StampTemplateV1` 保存 `layerSlots + visual[] + collision[]` 稀疏成员，成员高度为非负整数；`ProjectMap` 保存 `layers[].tiles/heights + collision` 定尺寸矩阵。placement 将 `member.height` 直接写入目标地图，输入中没有放置基准高度。图层仍以 `depthMode` 决定是否拥有高度、是否进入 cover。 | `packages/content/src/stamp.ts:3-39,91-152`；`packages/content/src/project-map.ts:1-24,147-203`；`packages/editor/src/core/stamp-placement.ts:95-106,231-289,332-343`；`packages/reforge/src/render.ts:291-357`。 |
| 本任务目标 | 组合与地图共享同一个等距内容结构；地图高度为绝对 H，组合高度为相对 H，放置为 `base + relative`；所有图层的非空实例按实际高度参与遮挡。 | 用户 2026-08-18 明确指出“组合就是局部可复用小型地图”“组合 H5 放到绘制 H5 应为实际 H10”“不管哪层都应按实际高度参与遮挡”，并要求先确定数据结构再复用编辑组件。 |

### 反证与替代解释

- 最强替代解释 A：保留 `StampTemplateV1` 稀疏表，只把 `member.height` 改成相对值，UI 继续通过 adapter 伪装
  `ProjectMap`。这能局部修公式，却仍保留两套 canonical 层/格/碰撞结构，patch、选择、填充、缩放和校验都要双分支。
- 最强替代解释 B：直接让组合存一份完整 `ProjectMap`。这会错误继承 MapIndex 身份、场景地图绝对高度、placement
  authoring 和全格 collision 语义；组合需要共享内容值对象，不是第二类地图文档。
- 最强替代解释 C：继续保留 `flat` 作为 H0 快捷层。这样地图与组合的层类型仍分叉，H0 瓦片也不能在以后改为非零高度，
  与“所有层按实例实际高度遮挡”冲突。
- 什么观察会推翻当前前提：若现有 `StampTemplateV1` 已保存与 ProjectMap 同形的局部尺寸/矩阵/锚点，placement 已接收
  `baseHeight` 并解析 `base + relative`，且地图/组合实际只消费一套 patch/render/hit-test，则本卡前提被推翻；当前读码
  显示均不成立。
- audit 红项替代根因排查：
  - runtime 语义 / 命令分类：runtime 正确只消费落图后的普通矩阵；缺口在作者 schema 与 placement planner。
  - 原版 / 第一阶段理解：两者没有该新作者能力，不作为模型依据。
  - extractor / 地图 / 数据解码：authored fixture 即可复现，不依赖 PAL 提取错误。
  - audit / test model：代码明确把 `member.height` 直接写入 patch，不是只由截图推断。

### 用户可见偏离

- 是否主动偏离已核真值：yes；替换 W7G/D26 已落地的稀疏模板、`flat|height` 与绝对模板高度模型。
- `before -> after` 一句话：组合成员高度直接覆盖地图高度、平面层永远 H0 -> 组合高度叠加放置基准，所有图层实例按
  实际高度参与遮挡。
- 代表场景：组合含本地 H0 地面与 H5 屋顶，选择地图绘制高度 H5 后放置，最终地面 H5、屋顶 H10；两者均按实际高度
  与人物/其他瓦片排序。
- 用户裁决：**2026-08-18 用户已批准目标语义，并要求先开卡确定结构。**

## 上下文锚点

- 已拍板决策 / 铁律：
  - `docs/phase2/READ-FIRST.md:1-16,69-89`：第二阶段架构优先、当前 canonical 单版本。
  - `docs/phase2/decisions.md:374-395`：高度属于格子实例，不属于 tileset；本卡保留该核心，只纠正绝对/相对空间和
    `flat` 分叉。
  - `docs/ops/tasks/W7G-composite-tile-stamps.md:20-25,138-188`：模板非链接、runtime 只消费普通矩阵、稳定局部层与
    显式 collision；旧三签只作为历史证据，不授权本卡的新前提。
  - `docs/ops/tasks/ED-MAP-MULTI-TILESET-1-multi-tileset-map-authoring.md`：Kimi/GLM 已用 223 图 / 4.0M 非空格
    证明 per-cell 对象落盘约膨胀 109MB，并推荐“裸 tileId + 同形 source-index matrix + 确定性 tilesetRefs”。
- 代码锚点：
  - `packages/content/src/project-map.ts:1-71,147-203`：地图矩阵、depthMode 与作者态 envelope。
  - `packages/content/src/stamp.ts:1-39,74-155`：组合稀疏 schema 与不变量。
  - `packages/editor/src/core/stamp-placement.ts:145-394`：layer mapping、ghost/patch/placement 唯一解析路径。
  - `packages/editor/src/core/stamp-template.ts:73-119`：地图选区转组合目前复制绝对实例高度。
  - `packages/reforge/src/render.ts:291-357`：当前 cover 排除 flat/H0。
- 已知坑：错排 lattice 为 `2 * height` 行；anchor/裁切必须保持奇偶可逆。collision 的显式 0 与“未纳入组合”不同。
  placement 是非链接快照。版本切换后不得保留双读/fallback。
- 不得重新引入：`StampMap` runtime 资产、第二套碰撞/渲染格式、模板与 placement 硬链接、层数组位置充当身份、
  全局拼接 tileId、多次连续 schema 迁移、为迁就当前 UI WIP 保留错误 schema。
- 相关测试：`project-map.test.ts`、`stamp.test.ts`、`stamp-placement.test.ts`、`stamp-template.test.ts`、
  `render.test.ts`、`scene-map.test.ts`、`MapMode.test.tsx`、`StampLibraryTab.test.tsx`。

## Draft: 设计与风险

### 设计结论（Codex 候选，待三方签字）

1. **共享内容，不共享地图文档身份**：抽出 `IsometricMapContent`（暂名），承载
   `width/height/tilesetRefs/layers/collision`。`ProjectMap` envelope 持有它并解释为绝对世界高度；`StampTemplate`
   envelope 持有它、显式 anchor，并解释为相对放置基面。runtime 不加载模板。
2. **落盘继续用紧凑并行矩阵**：每层保存 `tiles:(number|null)[][]`、同形
   `sources:(number|null)[][]`、同形 `heights:number[][]`；`sources` 指向 content 级确定性 `tilesetRefs:string[]`。
   tiles/source 非空严格 lockstep。内存 patch 可暴露逻辑 `{tilesetId,tileId,height}`，但禁止 per-cell 对象落盘。
3. **图层没有 depthMode**：局部层/地图层都只有稳定 `id`、可改 `name` 和三张实例矩阵；任何非空实例的 height 都是
   非负安全整数。所有实例按实际高度参与渲染/cover；图层顺序只作为 z/tie-break。
4. **组合相对高度公式唯一**：组合 `heights` 保存 `relativeHeight >= 0`；放置工具持有
   `placementBaseHeight >= 0`；ghost、冲突与提交共同消费一个 planner，唯一解析
   `actualHeight = placementBaseHeight + relativeHeight`，溢出 fail-loud。
5. **地图选区导入正规化基面**：默认取选区内最小实际高度为 `baseHeight`，每格保存
   `relativeHeight = actualHeight - baseHeight`；UI 显示并允许导入前确认基面，从而保持 relativeHeight 非负并保留高度差。
6. **显式局部锚点与尺寸**：组合保存 local surface 尺寸和 `anchor:{row,col}`。anchor 可为空格但必须在 surface 内；
   扩边/裁边需同步重算 anchor，放置继续使用同一错排 lattice 变换。
7. **collision 使用同形可空矩阵**：共享 content 的 collision cell 类型为 `number|null`；组合中 null=不参与放置，
   0=显式写可通行，非零=显式碰撞。ProjectMap envelope validator 要求所有格均为 number，保持 runtime 全覆盖。
8. **稳定层映射继续存在**：组合 content 的 layer 自身就是稳定局部层，不再另存 `layerSlots`；落图前显式映射
   `stamp.layers[].id -> map.layers[].id`。不再做 depthMode 匹配。
9. **placement 仍非链接**：实际 tile/source/height/collision 写入普通地图 content；placement 只存组 identity、软来源、
   anchor 和实际成员引用。模板修改/删除不改既有地图。
10. **共享编辑器以 schema 为前提**：地图和组合都把同一 content + height policy 传给同一 `IsometricMapEditor`。
    组合页只提供 metadata、anchor/relative policy 和保存命令；不得拥有私有 renderer、命中循环、viewport 或 patch 实现。
11. **一次切版**：新 canonical 版本落地后重迁/重生成当前工程，同卡删除 `StampTemplateV1`、旧 layer/depthMode、旧
    validator/formatter/fixture/upgrader/fallback。`ED-MAP-MULTI-TILESET-1` 的来源模型在这次切版一并实现。

### 方案可证伪点

- 若 nullable collision matrix 迫使地图/组合维护两套 patch/renderer，应改为同形 value + membership mask，不能复制编辑器。
- 若 source-index matrix 在真实 PAL 迁移后超过 Kimi/GLM 的 +2~3B/非空格预算，必须回到编码层重议，不能回退全图单源。
- 若删除 depthMode 后 H0 地板排序错误，须修正统一的实际高度/cover 判定，不得恢复 flat 逃逸。
- 若选区存在低于作者选定基面的成员，导入必须阻止或重新正规化，不能静默保存负高度。

### 已知风险

- 同时触及地图、组合和多瓦片来源。缓解：只做一次 version cut；顺序为 schema/formatter/placement fixtures →
  migration/runtime → editor shared component。
- 历史 W7G 三签与新产品语义冲突。缓解：旧签字失效，本卡重新三签。
- dense 局部 content 可能保存空白。缓解：deterministic trim，但必须保留 anchor。
- 所有层参与高度会改变遮挡。缓解：旧 flat 迁移为 H0，并以地板/墙/屋顶/跨层同高 fixture 验证。

### 主审立场

- Reviewer：Kimi（schema/公共接口/renderer/版本）+ GLM（迁移/数据不变量/测试矩阵）。
- 结论/必改项/是否进入 build：pending。

### 三方争议记录

- Codex：建议共享 content 值对象、紧凑并行矩阵、map absolute/stamp relative envelope、删除 depthMode；不直接嵌入
  ProjectMap，不保留稀疏 Stamp V1 adapter。
- Kimi：pending；其多瓦片集卡 KM1/KM2 可继承，KM3 的 per-member stamp 结论建立在旧稀疏模型上，需按本卡重审。
- GLM：pending；其 MT1-MT4 census/预算/引用/判别矩阵继续作为硬门。
- 用户拍板：已批准组合是局部小地图、H5+H5=H10、所有层按实际高度遮挡。

## 验收条件

- 地图与组合共同引用一份 canonical content 定义；不存在第二套 Stamp visual/layer/collision canonical schema。
- 组合 H0/H5 在基准 H5 放置后得到地图 H5/H10，ghost、提交、undo/redo、save/reopen 一致。
- 地图选区 H2/H5 导入后为 base H2 + relative H0/H3，再放到 H4 得到 H4/H7。
- 所有层实例都能编辑高度并按实际高度遮挡；属性面板不再出现平面/高度模式。
- 组合 collision null/0/nonzero 三态 round-trip；0 不得退化为未纳入。
- 中央地图/组合编辑直接消费同一个组件；组合源码无私有 renderer、lattice hit scan、viewport/redraw effect。
- 多瓦片来源同次迁移落地；同层两个 tileset 的同号 tileId round-trip 不混淆。
- content/placement/migration/renderer/editor focused tests 全绿；重迁二跑零 diff；旧类型/fallback census 为 0。
- 文档更新 decisions/content-schema/editor design/capability map/ED-STAMP-EDITOR-1/ED-MAP-MULTI-TILESET-1。
- 完成实现后只跑一次必要的最小浏览器验证和最终 build，不重复长时测试。

## 推进签字

### 进入 build 前：设计签字

- Codex：
  - premise: **verified（2026-08-18）**。证据见真值矩阵；现状确为稀疏/矩阵双模型、无 baseHeight、直接写绝对
    height 和 depthMode cover 分叉。
  - design: **agree（2026-08-18）**。同意本卡 11 点候选；吸收多瓦片卡 KM1/KM2 与 MT1-MT4，选择紧凑并行
    source matrix，不采用 per-cell 对象落盘。
- Kimi：
  - premise: pending
  - design: pending
- GLM：
  - premise: pending
  - design: pending
- 独立反证审查：审查者/证据/可证伪观察 pending；至少核验 collision 0 membership、placement height 写入、
  renderer depthMode cover 条件、223 图迁移预算和版本边界。
- counter / 分歧处理：pending。
- 缺签豁免：N/A。
- build 准入结论：**blocked——Kimi/GLM premise/design 与独立反证未完成；不得实现。**

### 进入 done 前：审查签字

- Codex/Kimi/GLM：pending。
- done 准入结论：blocked。

## Build: 实现与自测

- Coding Owner：Codex（三签齐后）。
- 修改文件/实现摘要/运行命令/浏览器检查：pending。
- 验证纪律：遵守用户“长时验证只跑一次”；先 focused/typecheck，最终只做一次必要全量/build。

## 用户验收

- 用户结论：2026-08-18 已批准产品前提；实现验收 pending。
- 后续任务：本卡模型落地后，恢复 ED-STAMP-EDITOR-1 的真正共享编辑组件收口。

## 交接日志

- 2026-08-18 User：指出不能先给组合页面打渲染补丁，必须先确定组合数据结构并开相对高度卡。
- 2026-08-18 Codex：核验稀疏/矩阵双模型、placement 直接绝对高度和 depthMode 分叉；提出共享 content、紧凑
  source matrix、map absolute/stamp relative、删除 depthMode并与多瓦片来源一次切版；三签前暂停实现。

## 下一位 Agent 提示词

```text
接手 ED-STAMP-MAP-MODEL-1 组合/地图共享等距内容模型与相对高度。
任务卡：docs/ops/tasks/ED-STAMP-MAP-MODEL-1-shared-isometric-content-relative-height.md
当前状态：draft / build blocked；Codex 已签 premise verified + design agree，Kimi/GLM 待签。
你的角色：独立 schema/架构或数据/迁移审查；不得修改实现文件。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡、W7G-composite-tile-stamps.md、
ED-MAP-MULTI-TILESET-1-multi-tileset-map-authoring.md、project-map.ts、stamp.ts、stamp-placement.ts、
stamp-template.ts、reforge/render.ts。
已完成：已核实 Stamp 稀疏 members / ProjectMap 矩阵双模型；placement 无 baseHeight 且直接写 member.height；
renderer 以 depthMode 排除 flat cover。用户已拍板组合是局部小地图、相对 H5 + 放置 H5 = 实际 H10、
所有层按实际高度遮挡。多瓦片全量 census 已排除 per-cell 对象落盘，推荐 source-index matrix。
请你做：独立核验 premise；压力测试共享 content（非 StampMap 文档）、紧凑并行矩阵、删除 depthMode、
map absolute/stamp relative envelope、nullable collision membership、选区导入按最小高度正规化、一次 version cut；
给出直接证据、最强反证、可证伪观察和测试钉。
不要做：不得实现，不得提交当前共享画布 WIP，不得用旧 W7G 签字授权新前提。
输出要求：在任务卡签 premise verified/counter + design agree/counter；counter 时写收敛方案和用户待拍板点。
```
