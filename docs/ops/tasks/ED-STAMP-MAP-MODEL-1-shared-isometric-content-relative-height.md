# ED-STAMP-MAP-MODEL-1 - 组合/地图共享等距内容模型与相对高度

Status: done
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
- 结论/必改项/是否进入 build：Codex、Kimi、GLM 三方 premise verified + design agree；
  KS1-KS3、SM1-SM4 均为 build 必落钉，当前已准入 build。

### 三方争议记录

- Codex：建议共享 content 值对象、紧凑并行矩阵、map absolute/stamp relative envelope、删除 depthMode；不直接嵌入
  ProjectMap，不保留稀疏 Stamp V1 adapter。
- Kimi：agree；继承多瓦片集卡 KM1/KM2，KM3 的 per-member stamp 结论已按共享 content 重审并作废。
- GLM：agree；MT1-MT4 census/预算/引用/判别矩阵继续作为 build 硬门。
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
  - premise: **verified（2026-08-18，本人一手读码，非复述）**。逐项独立核实：
    - **双模型实锤**：`StampTemplateV1` 稀疏 members（stamp.ts:3-39）vs `ProjectMap` 定尺寸
      矩阵（project-map.ts:1-24）；`PlanStampPlacementInput` 无 baseHeight（stamp-placement.ts
      :95-106），patch 把 `member.height` 原样写入目标层（:332-343）——且仅在目标层
      `depthMode==='height'` 时写，flat 层成员高度被静默丢弃（:336-341 条件分支）。
    - **renderer cover 分叉实锤**：render.ts:344 `tile.depthMode !== 'height' || tile.height <= 0`
      直接跳过——flat 层永不参与遮挡。
    - **选区导入复制绝对高度实锤**：stamp-template.ts:101 `mapInstanceHeight(layer, …)` 原样
      拷贝实例高度，无基面正规化。
    - 可证伪观察核对：现有模型无 base+relative 解析路径、无双模型共享 patch/render——前提成立。
  - design: **agree（2026-08-18，附必落钉 KS1-KS3，不阻塞准入）**。共享 content 值对象 +
    envelope 分层（ProjectMap 绝对 / StampTemplate 相对+anchor）、紧凑并行矩阵、删 depthMode、
    nullable collision membership、base+relative 唯一公式、选区按最小高度正规化、一次切版——
    与现有结构和 MULTI-TILESET 的 KM1/KM2 相容；**KM3 按本卡重审结论：per-member 来源结论
    作废**，共享 content 的 sources 矩阵使 stamp 不再需要 per-member 引用，模板全局 tilesetId
    判据随之退役。详见下方「Kimi 独立反证审查」。
- GLM：
  - premise: **verified（2026-08-18，本人一手读码 + 全工程 census，非代理）**。四锚点实锤
    （与 Kimi 互证）：稀疏/矩阵双模型（stamp.ts:11,18,33-36 vs project-map.ts:7,163-172）；
    placement 无 baseHeight（stamp-placement.ts:95-106）且 flat 层成员高度被静默丢弃
    （Kimi 补充 :336-341，本人复核属实）；render :346 `depthMode !== 'height' || height <= 0`
    flat 与 H0 双重豁免；可证伪观察核对无既有 base+relative/共享路径。
  - **全工程 census（本卡新数据事实）**：
    - **组合模板 = 0**：PAL `stamps.json` 为 `[]`，demo/e2e-own 无该文件——组合侧 schema
      迁移是**零数据纯切换**（与 WORLD-VARIABLES GV1 空表同型）；模板侧不变式对真实工程
      平凡成立，验收 100% 依赖合成 fixture。
    - **地图 446 层全部 `height`、flat = 0**——depthMode 删除对 PAL 存量数据无损；但见 SM2。
  - design: **agree（2026-08-18，附必落钉 SM1-SM4，不阻塞准入）**。11 点候选与本人多瓦片卡
    MT1-MT4 及 source-index matrix 推荐一致（设计 2 禁止 per-cell 对象落盘）；共享 content
    值对象非 StampMap 文档、envelope 绝对/相对、planner 唯一公式、nullable collision 三态、
    一次 version cut——数据/迁移/测试三维成立。Kimi KM3 重审结论本人同意。
  - **必落钉 SM1-SM4：**
    - **SM1（零数据事实入卡 + 合成覆盖声明）**：组合模板全工程 0 写入卡；模板侧迁移/验收
      100% synthetic，Build 记录不得宣称"经真实组合数据验证"。
    - **SM2（H0 遮挡语义变化基线显式化——关键）**：现 render :346 把 **H0（height<=0）与
      flat 一并排除**出 cover；新模型"所有实例按实际高度参与遮挡"意味着 **PAL 大量 H0 地板
      将开始进入 cover 候选**——用户拍板的有意渲染行为变化，不是无损迁移。必须：①显式列出
      预期变化面与锚定 fixture（扩充"人物立于 H0 地板行"）；②迁移前后同场景最小实机对照
      截图入卡；③既有视觉/E2E 基线覆盖地图渲染的须登记重录，不得静默炸基线。
    - **SM3（迁移不变式双域精确化）**：**数据等价与渲染等价分离**——地图域数据等价（223 图/
      446 层/4.0M 非空格 tiles/sources/heights 逐格相同 + 幂等二跑 changed=0 + 0 悬空来源）
      为硬门；渲染像素等价仅对非 H0-cover 路径承诺，H0 cover 变化按 SM2 单独验收。组合域
      零数据 + 合成 round-trip（相对高度非负、最小基面正规化、null/0/非零三态）。
    - **SM4（一次切版合并清单 + 零残留 token 表）**：与 MULTI-TILESET 共用切版的合并 census
      断言一次跑：tiles/sources lockstep、heights 非负、地图 collision 全 number/组合三态、
      同层双源同号 tileId 判别（MT4）；旧 schema 零残留 rg 清单含
      `depthMode|layerSlots|StampVisualMemberV1|StampCollisionMemberV1` 及旧 StampTemplateV1
      形状 token，同卡删除不双轨。
  - GLM 反证可证伪观察：①nullable collision 若迫使两套 patch/renderer → 改 value+mask 不
    复制编辑器；②source matrix 实迁超 MT2 +2~3B/格预算 → 回编码层重议；③H0 进 cover 后
    PAL 实机非预期遮挡 → SM2 对照截图拦截并修 cover 判定，不得恢复 flat/H0 豁免。
- 独立反证审查：Kimi 与 GLM 均已完成一手证据审查，见各自签字与下方「Kimi 独立反证审查」。
- counter / 分歧处理：无未解决 counter。
- 缺签豁免：N/A。
- build 准入结论：**allowed（2026-08-18）——Codex + Kimi（KS1-KS3）+ GLM（SM1-SM4）三方签字齐；SM1 零数据事实与 SM2 基线策略须先落卡。**

#### Kimi 独立反证审查（2026-08-18，schema/公共接口/renderer/版本主审；本人一手读码）

**设计压力测试（七项）：**

1. **共享 content 值对象边界 ✓**：envelope 分层正确——ProjectMap envelope 持 MapIndex 身份与绝对
   高度语义，StampTemplate envelope 持 anchor/metadata 与相对高度语义；content 本身不含身份，
   不会变成可被 Scene 绑定或 runtime 加载的第二类地图文档（「明确不做」第 1 条成立且必须保持）。
2. **删 depthMode 的行为面 ✓（可控）**：现行 cover 判定本来就用 `tile.height <= 0` 排除零高度
   （render.ts:344）——flat 层迁移为全 0 heights 后 cover 候选集合不变，无回归；新增能力是
   原 flat 层可编辑非零高度并参与遮挡，这正是用户拍板语义。风险只在迁移正确性，由 fixture 覆盖
   （卡文已知风险第 4 条）。
3. **nullable collision membership ✓**：`null=不参与 / 0=显式可通行 / 非零=碰撞`与现行稀疏
   `collision[]`（缺席=未纳入、0 显式成员，stamp.ts:23-27 注释自认）表达力精确等价，不是新语义；
   地图 envelope 要求全 number 保持 runtime 全覆盖。dense 空白由 deterministic trim + anchor 保留
   控制体积。
4. **base+relative 唯一公式 ✓**：放置输入新增 `placementBaseHeight >= 0`，ghost/冲突/提交共同
   消费一个 planner；溢出 fail-loud；选区导入按最小实际高度正规化 + 作者确认基面 + 拒绝负
   relative——语义闭环。KS3 钉死「唯一高度解析路径」防 ghost 与提交分叉。
5. **紧凑并行矩阵 ✓**：与 MULTI-TILESET 的 KM1/KM2 直接合并——同形 sources 矩阵 + content 级
   确定性 tilesetRefs；per-cell 对象禁落盘沿用。**KM3 作废重签**：旧稀疏模型下的 per-member
   tilesetId 结论不再适用，共享 content 的 sources 矩阵天然携带每格来源。
6. **一次切版 ✓**：MULTI-TILESET 来源模型与本卡共享 content 同次切换，避免两次连续地图/组合
   迁移，符合版本纪律；旧 StampTemplateV1/depthMode/upgrader/fallback 同卡删除。
7. **W7G 旧签字处理 ✓**：稀疏模板 + flat|height 是 W7G 三签产物，本卡明示旧签字仅作历史证据、
   新前提重新三签——程序正确。

**必落钉 KS1-KS3（build 必落，不阻塞准入）：**

- **KS1（heights 落盘紧凑性）**：删 depthMode 后所有层拥有实例高度，但 canonical 序列化必须
  保持全 0 heights 可省略（沿用现行 `heights?` 省略 = 全 0 的确定性约定），不得给 223 张地图
  每层追加全零矩阵噪声；validator 继续钉「空瓦片高度必须为 0」。
- **KS2（cover 回归 fixture 硬门）**：迁移后 flat→全 0 层的 cover 行为必须与迁移前逐场景等价
  （地板/墙/屋顶/跨层同高 fixture），任何排序差异修统一高度判定，不得恢复 flat 逃逸或
  depthMode 影子字段。
- **KS3（唯一高度解析路径）**：ghost、冲突检测、提交、placement 记录必须调用同一个
  `base + relative` 解析函数；boundary/测试断言不存在第二条高度计算路径（含编辑器预览与
  runtime 读取各自重算）。

**可证伪观察：**

1. 若 nullable collision 迫使 patch/renderer 双分支 → 改同形 value + membership mask（卡文已列，
   本席同意）。
2. 若 PAL 重迁后 source matrix 超 +2~3B/格预算 → 回编码层重议（沿用 GLM MT2）。
3. 若全 0 heights 不可省略导致 maps 目录体积显著膨胀 → 违反 KS1，修序列化而非恢复 depthMode。
4. 若 ghost 与提交出现高度差 → KS3 拦截，合并解析路径。

Evidence: stamp.ts:3-39,91-152 / project-map.ts:1-24,147-203 / stamp-placement.ts:95-106,231-289,
332-343 / stamp-template.ts:73-119 / render.ts:291-357 / W7G:20-25,138-188 /
MULTI-TILESET 卡 KM1-KM3/MT1-MT4。只读审查，未改实现文件，未提交共享画布 WIP，未代签 GLM。

### 进入 done 前：审查签字

- Codex：**accept（2026-08-19）**。canonical v4、共享 content、relative H、nullable collision、
  多来源矩阵、runtime/placement/editor 与当前工程原子切版均已按 KS1-KS3、SM1-SM4 自验通过；旧
  schema/adapter/token census 为 0。最终证据见 Build 记录。
- Kimi：**accept（2026-08-19 done 前 schema/renderer/版本复审，本人一手读码 + 工程实测，非代理）**。
  逐项核验：
  - **共享 content ✓**：`IsometricMapContent<CollisionCell>`（project-map.ts:15）泛型承载
    dense/nullable collision；`ProjectMap extends IsometricMapContent<number>`（:56）；无第二类
    地图文档、无 StampMap 资产。
  - **KS1 ✓**：heights 全 0 可省略（:183 `hasNonZeroHeight` 条件写盘，:150 注释明示）；空瓦片
    高度 0 校验保留（:179）。
  - **KS3 ✓**：`stampPlacementActualHeight`（stamp-placement.ts:144-148）为唯一高度解析，
    负值/溢出 fail-loud；planner（:161,:299）共用；runtime 不二次解析（placement 是编辑侧，
    runtime 只读落图绝对值）。
  - **cover ✓（KS2）**：render.ts:350 只按 `tile.height <= 0` 排除，无 depthMode 门；全层按
    实际高度评估；`bakedTile(tilesetId, tileId)` 逐瓦片来源解析（:354）。
  - **旧模型零残留 ✓（本席 rg 复跑）**：非测试文件中 depthMode / StampTemplateV1 /
    layerSlots / stamp-draft-map 全 0。
  - **工程实测 ✓**：223 图 v4 单源省略形态与 GLM census 一致（本人 MULTI-TILESET 复审同扫）。
  - **复跑 ✓**：editor stamp-placement/stamp-template 13/13、content stamp 3/3、reforge
    render 5/5 全部通过。
  未改实现文件，未提交 WIP，未代签 GLM，未标 done。
- GLM：**accept（2026-08-19 done 前数据/迁移终审，本人一手读码 + 全工程独立 census，非代理）**。
  SM1-SM4 逐钉验证：SM1 零数据+synthetic 声明已落卡；SM3 数据等价硬门本人独立复算——
  **223 图/446 层/3,996,116 非空格与迁移前普查完全一致、0 悬空来源、负高度 0**、单源
  sources 省略语义合法（validator :150-156：单源由 tiles 唯一决定可省、多源强制显式、
  加载物化完整矩阵）；SM4 token 零残留本席 rg 复跑（depthMode/layerSlots/
  StampVisualMemberV1/StampCollisionMemberV1=0，ProjectMap 仅 v4）；**SM2 以"行为保持"
  解读收口**：render :350 保留 `height <= 0 continue` 是按实例实际高度值的判定而非层豁免
  （flat 已删），渲染行为与迁移前一致——GLM 原判"H0 进 cover 是行为变化"被实现的更优解读
  取代，基线担忧解除，该解读应记入 decisions。content/reforge 全量本席复跑通过。
  - **批次级返工项（非本卡范围，关卡前须修）**：`a5e69100 unify catalog header icon buttons`
    将新建按钮迁为目录 header action 后，`EnemyTab.test:218` 与 `ItemTab.test` 的
    `button[title="新建敌人/新建物品"]` 选择器失效——main editor 全量当前 973/975（2 红），
    属六卡验收之后的范围外回归；六卡 focused 本席复跑 105/105 全绿。Codex 更新两处测试
    选择器为 header action 可访问名并复绿全量后，本批方可关卡/用户验收。
- counter / 返工处理：**resolved（2026-08-19）**。两处选择器已改用 header action `aria-label`；
  定向 19/19、editor typecheck 与全量 131 files / 975 tests 通过。
- done 准入结论：**allowed（2026-08-19）**——Codex + Kimi + GLM accept、批次返工清零、用户最终验收齐。

## Build: 实现与自测

- Coding Owner：Codex（三签齐后）。
- 2026-08-19 canonical 一次切版已完成：
  - content 抽出 `IsometricMapContent`；`ProjectMap` 仅 v4，`StampTemplate` 直接包同形局部 content；删除
    稀疏成员模型、`depthMode`、v2/v3 parser/upgrader/fallback 与临时 `stamp-draft-map` adapter。
  - 地图 absolute H、组合 relative H、ghost/提交共用 `base + relative`；所有图层进入统一实际高度遮挡。
  - 地图/组合直接复用 `IsometricEditorCanvas`、`IsometricEditorToolbar`、图层控件、网格和 renderer cache；
    组合没有查看/编辑双状态，草稿只在保存时提交一笔 command。
  - 当前 PAL 工程 223 图/446 层原子迁移为 v4；当前工程没有真实组合模板，因此组合 schema/相对高度
    验收按卡文明确只使用 synthetic fixture，不宣称真实组合数据验证。
- 已通过：content/reforge/editor/migrate 四包 typecheck；content 全量 42 files / 482 tests；reforge 全量
  100 files / 1020 tests；editor 全量 131 files / 970 tests；migrate 定向 4 files / 32 tests；editor 关键
  定向 14 files / 266 tests。changed TypeScript/TSX Biome 与 `git diff --check` 通过；仅 `editor.css` 保留
  4 条既有 visually-hidden `!important` warning。
- Reforge 与 Editor production build 各执行一次并通过；均只有既有 chunk size warning，没有二次重复构建。
- 最小浏览器验收 `1280×720` 通过：组合页直接显示共享 toolbar/画布/图层，中央 surface `796×653`、viewport
  `796×577`，不再退回 120px；右侧“瓦片”Tab 有来源选择器与 452 个 tile，Console warning/error 0。
- 旧实现 census：`ProjectMapV1/V2/V3`、`StampTemplateV1`、`stamp-draft-map`、`layerSlots`、`depthMode`、
  `ProjectMap.tilesetId`、flat/height instance 统计在四个实现包中均为 0。
- 验证纪律：遵守用户“长时验证只跑一次”；先 focused/typecheck，最终只做一次必要全量/build。

## 用户验收

- 用户结论：**accept（2026-08-19）**。2026-08-18 已批准产品前提，现明确确认最终实现及本批验收全部通过。
- 后续任务：无；共享编辑组件收口已随 ED-STAMP-EDITOR-1 完成，本卡收口。

## 交接日志

- 2026-08-18 User：指出不能先给组合页面打渲染补丁，必须先确定组合数据结构并开相对高度卡。
- 2026-08-18 Codex：核验稀疏/矩阵双模型、placement 直接绝对高度和 depthMode 分叉；提出共享 content、紧凑
  source matrix、map absolute/stamp relative、删除 depthMode并与多瓦片来源一次切版；三签前暂停实现。
- 2026-08-18 GLM（迁移/数据不变量/测试矩阵）: 审查完成，签 **premise verified + design agree（附
  SM1-SM4）**。四锚点实锤并复核 Kimi 补充的 flat 层高度静默丢弃；**census：组合模板 0（零数据纯
  切换、验收 100% synthetic）、地图 446 层全 height flat=0**；SM2 关键钉：H0 进 cover 是有意渲染
  行为变化，基线策略/对照截图显式化；SM3 数据/渲染等价分离；SM4 一次切版合并 census 与旧 token
  零残留表。三签齐，SM1/SM2 落卡后可转 build。未改实现文件，未提交 WIP，未代签 Kimi。
- 2026-08-18 Kimi：独立反证完成，签 **premise verified + design agree（附 KS1-KS3）**。一手实锤：
  placement 无 baseHeight 且把 member.height 原样写入（flat 层静默丢弃）、renderer 以 depthMode/height<=0
  排除 cover、选区导入复制绝对高度。七项压测通过：envelope 分层不造成 StampMap 文档、删 depthMode 后
  cover 候选集合不变（height<=0 本已排除）、nullable collision 与稀疏 collision[] 表达力精确等价、
  base+relative 唯一公式闭环、紧凑矩阵合并 KM1/KM2（KM3 per-member 结论按本卡作废重签）、一次切版
  符合版本纪律、W7G 旧签字按历史处理程序正确。钉：KS1 全 0 heights 可省略、KS2 cover 迁移等价
  fixture、KS3 唯一高度解析路径。未改实现文件，未提交 WIP，未代签 GLM。Next: GLM 迁移/数据/测试
  签字后转 build。

- 2026-08-19 GLM（数据/迁移）: done 终审完成并签 **accept**。SM3 数据等价独立复算一致（223/446/3,996,116/0）；SM4 token 零残留；SM2 以行为保持解读收口（height<=0 是高度值判定非层豁免）。附批次返工项 a5e69100。

## 下一位 Agent 提示词

无下一位 Agent 提示词；三方 accept、用户验收与全量测试均已完成，本卡收口。

## 历史交接提示词（已完成）

```text
审查 ED-STAMP-MAP-MODEL-1 组合/地图共享等距内容模型与相对高度实现。
任务卡：docs/ops/tasks/ED-STAMP-MAP-MODEL-1-shared-isometric-content-relative-height.md
当前状态：review；Codex 已完成 canonical 切版、自测、一次 production build 和最小浏览器验收并签 accept。
你的角色：Kimi/GLM 独立实现审查；除非 counter 指向明确缺陷，否则不得扩范围改实现。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡、W7G-composite-tile-stamps.md、
ED-MAP-MULTI-TILESET-1-multi-tileset-map-authoring.md、project-map.ts、stamp.ts、stamp-placement.ts、
stamp-template.ts、reforge/render.ts。
请核验：唯一 v4、旧 token/adapter 零残留；共享 content/画布不是转换伪复用；H5+baseH5=H10；nullable
collision；所有层 actual H 遮挡；save/undo/reopen；当前工程切版与验证证据。
输出要求：在“进入 done 前”签 accept，或写 counter 的文件锚点、复现和最小返工项；不得标 done，仍需三方 accept。
```
