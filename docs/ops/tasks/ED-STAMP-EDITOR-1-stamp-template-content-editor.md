# ED-STAMP-EDITOR-1 - 组合模板内容编辑闭环

Status: draft
Phase: phase2
Capability: W7G correction（不新增 capability-map 格，不改 schema/runtime）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-stamp-editor-1

## 目标

组合库不再只是预览、元数据登记和“从地图选区整项替换”的管理页。作者可以在组合库内新建或打开一个模板，
直接编辑其中的多个局部图层、不同高度、多个瓦片、独立碰撞与锚点；编辑过程是内存草稿，保存后作为一笔可撤销
命令替换模板，取消则零写入。地图中的既有放置组仍是非链接快照，不随模板修改。

## 范围

- 范围内:
  - 在组合库提供明确的“新建组合”“编辑内容”入口；编辑已有迁移预置时沿用显式接管语义。
  - 中央区域进入可视化组合编辑工作区：显示真实 tileset，支持局部图层槽的新增、重命名、排序、删除与
    `flat/height` 模式；支持活动层、实例高度、瓦片绘制/擦除、选区/移动以及独立碰撞成员和值。
  - 以固定可见锚点和相对 lattice 坐标编辑；允许成员位于锚点任意方向，保存时确定性还原
    `StampLatticeOffsetV1`，不靠临时地图绝对坐标泄漏进模板。
  - 使用内存 draft 和纯转换边界承接 `StampTemplateV1 <-> 编辑草稿`；尽量复用地图已有的渲染、tileset
    palette、命中/选择与 patch 纯函数，不复制第二套瓦片坐标、投影或碰撞语义。
  - 保存使用现有 `AddStampTemplateCommand` / `ReplaceStampTemplateCommand` 形成单笔 history；取消、切换模板、
    关闭页面和校验失败均不得部分写入。现有“从地图选区创建/更新”保留为导入捷径，不再冒充唯一编辑入口。
- 范围外:
  - 不让模板更新自动回写已放置 placement；不把 soft provenance 改成 linked prefab。
  - 不修改游戏运行时、地图文件格式、`StampTemplateV1` schema 或迁移器。
  - 不把真实地图复制为模板专用工程文件，也不在 MapIndex 中登记临时地图。
- 明确不做:
  - 不以成员表格或直接编辑 JSON 代替空间画布；不要求作者先污染/解组一张真实地图才能编辑模板。
  - 不整组件嵌套完整 `MapMode` 并复制其页面状态机；若需要共享能力，先抽取领域纯函数或最小可复用 surface。
  - 不借机改变 W7G 已拍板的 placement 非链接语义、图层稳定 ID、显式映射和 collision 独立通道。

## 前提真值门

### 一句话行为 / 工程前提

- 当前只有“地图实例组编辑”和“普通地图选区整项替换模板”两条断开的路径；不存在不修改真实地图即可打开、
  编辑并保存同一个多层/多高度/多瓦片/碰撞模板的作者闭环。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：组合库是第二阶段全新作者工具，没有原版游戏 UI 或机制真值。 | `docs/phase2/READ-FIRST.md:1-16,38-41`。 |
| 第一阶段 | N/A：第一阶段没有 Reforge 的多层组合模板作者工作区。 | `CLAUDE.md:5-13`；本任务不改一阶段展示或运行行为。 |
| 当前二阶段 | `StampTemplateV1` 已能表达稳定局部图层槽、每个视觉成员的 tileId/height/offset，以及独立 collision；但组合库只直接编辑名称/分类，内容更新依赖一个外部普通 cells 选区。地图“进入组内编辑”修改的是 placement 对应的真实地图值，不是模板。`onStampSelectionChange` 又只向组合库暴露 `selection.kind === 'cells'`，组内编辑状态不能直接回写模板。 | `packages/content/src/stamp.ts:1-39,91-141`；`packages/editor/src/ui/StampLibraryTab.tsx:258-278,540-611,736-754`；`packages/editor/src/ui/MapMode.tsx:412-417`；`packages/editor/src/ui/StampPlacementSelectionInspector.tsx:138-156,198-225,244-382`。 |
| 本任务目标 | 在不改 schema/runtime/placement 语义的前提下，为上述既有字段提供组合库内的可视化 draft 编辑器，并以原子命令保存。 | 用户 2026-08-17 明确指出“不能编辑组合，功能不闭环；一个组合可能包含多个图层、多个高度、多个瓦片”；现有 command 和 validator 边界见 `packages/editor/src/core/stamp-commands.ts`、`packages/content/src/stamp.ts:74-154`。 |

### 反证与替代解释

- 最强替代解释: 可以先把模板放到真实地图，进入 placement 组内逐层编辑，再解组/重选并用“当前地图选区更新”，
  因而现状只是入口不明显而非能力缺失。
- 什么观察会推翻当前前提: 若存在一条已实现路径，能够在不修改/解组真实地图 placement 的情况下，以同一模板为
  输入完整编辑其局部图层、offset、tileId、height、collision 和锚点，并能取消零写入、保存原子回写模板，则本卡
  前提被推翻。当前代码与浏览器实测均未发现该路径。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 不适用；缺口位于编辑器 authoring workflow，运行时不消费模板编辑状态。
  - 原版 / 第一阶段理解: 不适用；这是二阶段新增作者工具。
  - extractor / 地图 / 数据解码: 已排除；样例与 schema 可完整表达多层/高度/碰撞，缺的是编辑入口和 draft 工作区。
  - audit / test model: 旧 W7G 测试分别证明 placement 编辑和 cells-selection 替换，但没有覆盖“模板自身打开→编辑→保存”的
    E2E；把两条路径合称闭环是验收模型遗漏。

### 用户可见偏离

- 是否主动偏离已核真值: yes（新增此前缺失的用户可见编辑路径，保持数据语义不变）
- `before -> after` 一句话: 组合库只能预览/改名/外部选区整项替换 -> 组合库可直接可视化编辑完整模板内容并原子保存。
- 代表场景: 打开“村口门楼”，在模板内新增“屋檐”高度层、绘制三个不同瓦片并设置 H2/H3，补一个显式
  collision=0 和一个阻挡格，移动锚点后保存；预览立即更新，既有地图放置组保持不变。
- 用户裁决: 2026-08-17 用户明确否定现状闭环并确认组合编辑必须覆盖多图层、多高度、多瓦片；详细交互仍须
  三方设计签字与开发期视觉验收。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`：二阶段架构优先、全新作者 UI、稳定 ID；无一阶段对应的新 UI 须先设计再实现。
  - `docs/ops/tasks/W7G-composite-tile-stamps.md:112-139,190-211,272-349,364-378`：模板与 placement 正交、
    图层槽/offset、组内编辑、soft provenance、原子命令和组合库职责。
  - `docs/phase2/capability-map.md:60-61`：W7G/W8 当前能力记账；本卡是 W7G 作者闭环纠偏，不新开能力格。
- 代码锚点(`file:line`):
  - `packages/content/src/stamp.ts:1-154`：canonical 模板字段、不变量与确定性 validator。
  - `packages/editor/src/core/stamp-template.ts:33-129`：普通地图 cells 选区到模板的现有转换。
  - `packages/editor/src/core/stamp-commands.ts`：模板新增/替换/删除及 undo 边界。
  - `packages/editor/src/ui/StampLibraryTab.tsx:258-278,529-611,736-815`：当前管理页与外部选区替换路径。
  - `packages/editor/src/ui/StampTemplateDialog.tsx:1-490`：当前“选区→模板”表单和接管规则。
  - `packages/editor/src/ui/MapMode.tsx:392-423,1420-1460,3480-3510`、
    `StampPlacementSelectionInspector.tsx:130-390`：地图 selection 暴露边界与 placement 实例编辑能力。
- 已知坑 / 审计文档:
  - W7G 的 placement 必须保持非链接快照；模板改变不能隐式修改地图。
  - lattice offset 允许负数且要求 `dRow/du` 同奇偶；临时画布原点平移不能破坏 round-trip。
  - `flat` 槽高度必须为 0；不能保存空视觉模板或无成员槽；collision=0 是显式成员而非缺省。
  - migrated 模板只有显式接管后才能变为 authored，失败/取消必须保持来源不变。
- 不得重新引入:
  - 第二套模板 schema、linked prefab、数组下标身份、隐藏的真实地图写入、旧版本兼容 fallback、
    页面私有基础控件皮肤、不可撤销的多步保存。
- 相关测试:
  - `packages/content/src/stamp.test.ts`、`packages/editor/src/core/stamp-template.test.ts`、
    `stamp-commands.test.ts`、`StampLibraryTab.test.tsx`、`MapMode.test.tsx`、`MapContentSelectionPreview.test.tsx`。

## 验收条件

- 功能:
  - 空库可选 tileset 新建组合；已有 authored 模板可直接“编辑内容”；migrated 模板保存前要求显式接管。
  - 同一草稿内可新增/重命名/排序/删除多个稳定图层槽，分别编辑 `flat/height`；可在不同槽放置不同 tileId，
    设置混合 height，编辑独立 collision（含显式 0），调整锚点和成员空间位置。
  - 删除最后视觉成员、保存无成员槽、flat 非零高度、非法 tileId/offset 等均 fail-loud 且草稿不丢失。
  - 保存是一笔模板 command，undo/redo 精确；取消、切页确认取消、校验失败零工程写入；保存后目录卡、预览、
    成员统计同步刷新，保存重开一致。
  - 已放置组在模板编辑、undo/redo 和保存重开后值与 identity 均不变。
- 测试:
  - 纯转换 round-trip 覆盖负 offset、错排奇偶、空锚点位置、多槽/混合高度/collision=0、确定性顺序。
  - draft reducer/command 覆盖 layer CRUD、paint/erase/select/move、最后成员守卫、接管、取消与单笔 history。
  - React 覆盖新建/编辑入口、dirty 离开确认、键盘/focus、错误恢复、保存/undo/redo，以及旧 cells-selection 导入捷径。
  - editor focused tests、typecheck、全量 test、Biome changed-files、`git diff --check` 全绿；content validator 回归全绿。
- 文档:
  - 回写本卡设计结论、实现文件与视觉证据；仅在三方 accept + 用户验收后修正 W7G/capability-map 的闭环备注。
- 视觉 / 手工验证:
  - 使用 `?ui_samples=1&module=map&page=stamp`，分别在 1280×720、900×720、720×720 验证多层/高度/碰撞编辑、
    canvas/palette/Inspector 可达、无横向溢出、focus ring 可见、Console warning/error 0。
  - 实测代表场景：三层、至少六个不同瓦片、H0/H2/H3、collision 0/1、锚点位于成员包围盒内部与外部各一次；
    保存、取消、undo/redo、保存重开、既有 placement 不变。
- E2E 用例登记: N/A；这是功能性编辑器界面，按 dev-functional 当卡完成最小视觉验证。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-17）**。直接读取 `stamp.ts:1-154`、`StampLibraryTab.tsx:258-278,540-611`、
    `MapMode.tsx:412-417`、`StampPlacementSelectionInspector.tsx:138-225,244-382` 并在浏览器实测：属性仅改名/分类，
    内容更新按钮无普通地图选区时禁用；地图组内编辑修改 placement，不能直接回写模板。
  - design: **agree（2026-08-17）**。同意“组合库内内存 draft + 复用地图领域 primitive + 单笔模板命令”的边界；
    不改 schema/runtime/placement 非链接语义，不接受真实地图作为必经临时画布。
- Kimi:
  - premise: **verified（2026-08-17，本人一手读码，非复述）**。逐项独立核实缺口成立：
    - 组合库属性面板只编辑名称/分类（StampLibraryTab.tsx:540-594）；「用当前地图选区更新」在
      无会话选区时禁用（:595-607），内容更新唯一路径依赖外部普通 cells 选区。
    - 地图仅向组合库暴露 `selection.kind === 'cells'`（MapMode.tsx:412-417），组内编辑状态不
      出地图；placement Inspector 编辑的是地图实际值且明示「不从来源模板重建」
      （StampPlacementSelectionInspector.tsx:144-156），非链接语义与 W7G 一致。
    - 无「打开模板→编辑内容→取消/原子保存」路径：全仓不存在模板→画布 draft 的任何转换入口
      （唯一反向转换是 `buildStampTemplateFromSelection`，输入强制为地图 cells 选区，
      stamp-template.ts:73-76）。
    - 最强替代解释（放置→组内编辑→解组→重选区替换）确实可走通但必须以污染/解组真实地图为
      中间物，违反卡文「明确不做」，不构成非破坏闭环——前提成立。
  - design: **agree（2026-08-17，附必落钉 SK1-SK2，不阻塞准入）**。内存 draft + 纯转换边界 +
    复用领域 primitive + 单笔命令的方案与现有边界逐一相容：
    - lattice 数学可逆：`relativeLatticeOffset`/`resolveRelativeLatticeOffset`
      （map-transform.ts:86-100）互逆，负 offset 天然支持；`u=2*col+rowParity` 使 du 与 dRow
      奇偶自动一致，draftOrigin 平移不破坏 round-trip。
    - 命令层已 fail-closed：`ReplaceStampTemplateCommand` 在 command 层强制接管语义
      （stamp-commands.ts:65-102）、exact invert、重复内容 no-op；单笔 history 成立。
    - schema 不变量（视觉非空/槽必须有成员/flat 高度 0/collision=0 显式/成员唯一键，
      stamp.ts:91-142）与 draft 编辑操作一一对应，保存前 canonicalize + validate 顺序正确。
    - 复用边界现实可行：`isLatticeInside`/`mapInstanceHeight`/投影与 palette 已以纯函数或小组件
      存在；风险只在抽取时把 session/dispatch 耦合带进 draft——由 SK1 钉住。
    详见下方「Kimi 独立反证审查」。
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-17，见下方「Kimi 独立反证审查」）
  - 独立证据锚点: 本席本次会话直接打开核实的 file:line——StampLibraryTab.tsx:540-643 /
    MapMode.tsx:412-417 / StampPlacementSelectionInspector.tsx:130-229 / stamp-template.ts:73-160 /
    stamp-commands.ts:15-102 / stamp.ts:63-154 / map-transform.ts:82-127 / StampTemplateDialog.tsx:194-214,428-433。
  - 可证伪观察: 见「Kimi 独立反证审查」末节。
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: **blocked——Kimi 已签（SK1-SK2），待 GLM 签 premise verified / design agree；
  不得修改实现文件。**

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **一个编辑语义，两种入口**：组合库内“新建/编辑内容”是主闭环；地图普通选区“保存/更新组合”继续作为
   从真实场景采样的快捷导入。两者最后都生成 canonical `StampTemplateV1` 并走同一 validator/command。
2. **内存草稿，不污染地图**：打开模板后将相对 offsets 映射到带安全 padding 的临时 lattice surface，另存
   `draftOrigin` 只负责画布坐标换算；它不进入 session maps、MapIndex、save 或 runtime。保存时以可见锚点为
   `(0,0)` 反算 offsets，转换必须可 round-trip 与确定性排序。
3. **复用领域 primitive，不嵌套页面**：复用/抽取地图已有投影、tileset palette、绘制/擦除、选择/移动、height、
   collision 和预览能力；组合编辑器持有自己的 draft reducer。不得直接复制 4000 行 `MapMode` 状态机，也不得
   让模板草稿获得地图实体、placement authoring、地图 IO 等无关能力。
4. **局部图层是真对象**：右侧管理稳定 slot ID、名称、顺序和 depthMode；画布每次只写活动槽，但始终能合成预览
   全部槽和 collision。删除槽必须同时展示受影响成员数并确认；最后一个视觉槽/成员不可删除。
5. **原子提交**：编辑期间不 dispatch 工程命令；dirty 离开先确认。保存先 canonicalize + validate，再一次 dispatch
   Add/Replace；migrated 直到确认保存才接管。已放置 placement 从不参与 draft，也不被模板更新扫描或重写。

### 已知风险

- 风险: 为复用 MapMode 而把临时模板伪装成持久地图，导致隐式 IO、脏状态或第二套语义。
  - 缓解: 纯 adapter + 独立 draft reducer；测试断言 session maps/MapIndex/save 输入零变化。
- 风险: offset 与临时画布平移破坏错排奇偶或负坐标 round-trip。
  - 缓解: 纯函数 property/fixture 测试覆盖多象限、anchor 在包围盒外、重复打开保存字节稳定。
- 风险: 多槽与 height/collision UI 在窄屏不可用。
  - 缓解: 中央 canvas + 可折叠右栏/底部 tileset palette 的响应式布局，三档实机作为 build 退出门禁。
- 风险: 直接编辑模板被误解为会同步更新 placement。
  - 缓解: 保存确认与预览固定显示“只影响未来放置；既有地图不变”，并以测试钉死 non-linked 语义。

### 主审立场

- Reviewer: Kimi（架构/交互主审）+ GLM（数据不变量/测试矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 候选方案是不改 `StampTemplateV1`，使用组合库内内存 draft；主入口必须直接编辑模板，真实地图只能是导入源。
- Kimi: pending
- GLM: pending
- 用户拍板: 用户已拍板“当前不能编辑组合不构成闭环”及多图层/多高度/多瓦片必需；若 reviewer 对工作区形态、
  复用边界或 anchor 语义 counter，收敛不了时再交用户裁决。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（待三签）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-17 User: 指出组合库无法编辑多图层、多高度、多瓦片的模板内容，现有功能不闭环。Evidence:
  本轮用户反馈。Next: Codex 核验现状并开纠偏卡。
- 2026-08-17 Codex: 浏览器与源码核验确认属性编辑、placement 组内编辑、普通 cells 选区替换三者没有形成模板
  自身的非破坏性 round-trip；完成前提矩阵、候选架构、风险和验收条件并签 premise/design。Evidence:
  `StampLibraryTab.tsx:258-278,540-611`、`MapMode.tsx:412-417`、
  `StampPlacementSelectionInspector.tsx:138-225,244-382`。Next: Kimi 独立架构/交互反证并签字；未签前不得实现。

## 下一位 Agent 提示词

```text
接手任务：ED-STAMP-EDITOR-1 组合模板内容编辑闭环
任务卡：docs/ops/tasks/ED-STAMP-EDITOR-1-stamp-template-content-editor.md
当前状态：draft；Codex 已完成 premise verified + design agree，Kimi/GLM pending；不得开始实现。
你的角色：Kimi，负责架构/交互独立反证与 build 前签字。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、
docs/ops/tasks/W7G-composite-tile-stamps.md 的用户语义/S1-S16/模板映射/组内编辑/UI 章节，
packages/content/src/stamp.ts、packages/editor/src/core/stamp-template.ts、stamp-commands.ts、
packages/editor/src/ui/StampLibraryTab.tsx、StampTemplateDialog.tsx、MapMode.tsx 的 selection 暴露段、
StampPlacementSelectionInspector.tsx。
已完成：确认当前只有模板元数据编辑、真实地图 placement 组内编辑、普通 cells 选区整项替换；组内编辑状态不直接
暴露给模板更新，不存在“打开模板→完整编辑→取消/原子保存”的无损闭环。候选方案是在组合库内建立内存 draft，
复用地图领域 primitive，不改 schema/runtime/placement 非链接语义。
请你做：独立读取一手代码，验证或反驳能力缺口；压力测试 draft adapter、MapMode 能力复用边界、负 offset/anchor、
多层/height/collision、迁移预置接管、单笔 history 与窄屏交互；写出最强反例和可证伪观察。无阻塞则在卡内签
premise verified + design agree；有问题签 counter 并给出可执行收敛方案。
不要做：不得修改实现文件，不得代签 GLM，不得把任务标 build/done，不得以真实持久地图作为编辑模板的必经中间物，
不得改变 StampTemplateV1 或 linked placement 语义。
输出要求：把证据、结论、风险和签字写回任务卡；若 agree，附可直接交给 GLM 的下一位 Agent 提示词。
```
