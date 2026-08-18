# ED-STAMP-EDITOR-1 - 组合模板内容编辑闭环

Status: review
Phase: phase2
Capability: W7G correction（不新增 capability-map 格，不改 schema/runtime）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

## 目标

组合库不再只是预览、元数据登记和“从地图选区整项替换”的管理页。作者可以在组合库内新建或打开一个模板，
直接编辑其中的多个局部图层、不同高度、多个瓦片、独立碰撞与锚点；编辑过程是内存草稿，保存后作为一笔可撤销
命令替换模板，取消则零写入。地图中的既有放置组仍是非链接快照，不随模板修改。

## 范围

- 范围内:
  - 在组合库提供“新建组合”；选择已有组合即直接进入统一编辑工作台，不再区分查看/编辑状态；编辑迁移预置时沿用显式接管语义。
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
  - 空库可选 tileset 新建组合；选择已有 authored 模板即直接编辑；migrated 模板保存前要求显式接管。
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
  - premise: **verified（2026-08-17，本人一手读码，非代理）**。前提事实独立核实：
    1. **缺口成立**：StampLibraryTab 登记面板只编辑名称/分类（:540-548 实读）；「用当前地图选区
       更新」无 selectionSource 即禁用（:595-600 实读）——内容更新唯一路径依赖外部普通 cells 选区。
    2. **cells-only 暴露属实**：MapMode :412-417 仅 `selection.kind === 'cells'` 时向组合库
       onStampSelectionChange 传值，组内编辑状态不出地图。
    3. **反向转换强制 cells 输入**：`buildStampTemplateFromSelection`（stamp-template.ts:73-76）
       输入为 map + cells selection + anchor，无模板→草稿的正向转换入口——与 Kimi 第 3 点互证。
    4. **schema 不变量实读**：`dRow/du` 同奇偶（stamp.ts:65-68）、collision 是显式成员数组、
       视觉非空——与卡文已知坑逐条对应。
    5. **命令层 fail-closed**：ReplaceStampTemplateCommand 携 takeOwnership（stamp-commands.ts:65-71）
       ——接管语义在 command 层，draft 保存路径可复用。
    6. **lattice 可逆对实存**：relativeLatticeOffset / resolveRelativeLatticeOffset
       （map-transform.ts:86-100）互逆结构成立。
    7. **五份相关测试文件全部在位**（stamp/stamp-template/stamp-commands/StampLibraryTab/
       MapContentSelectionPreview）——测试矩阵有落点。
  - design: **agree（2026-08-17，附必落钉 SE1-SE3，不阻塞准入）**。内存 draft + 纯转换 + 单笔
    command + placement 非链接保持——与 schema/命令/变换三层现有边界相容，schema 零改动成立。
    详见下方「GLM 独立数据覆盖审查」。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-17，SK1-SK2）+ GLM（2026-08-17，SE1-SE3，见下方）。
  - 独立证据锚点: Kimi——签字块内联清单与下方恢复的独立审查节；GLM——见下方审查节。
  - 可证伪观察: 见「GLM 独立数据覆盖审查」末节。
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-17）——Codex + Kimi（SK1-SK2）+ GLM（SE1-SE3）三方签字齐。
  SE1 的 Kimi 审查节与 SK1/SK2 完整定义已于 2026-08-17 从既有签字证据恢复入卡；该补录不新增或代签
  Kimi 结论，GLM 已明确无需重审。**

#### Kimi 独立反证审查（2026-08-17，架构/交互；SE1 恢复记录）

> 本节由 Codex 依据 commit `db490d9c` 已落库的 Kimi 一手证据、签字结论和引用锚点恢复完整定义；只修复
> “签字块引用了缺失小节”的文档缺陷，不改变、扩张或代签 Kimi 的 premise/design 结论。

- **能力缺口反证**：`StampLibraryTab` 的内容更新强制依赖外部 cells selection；`MapMode` 不向组合库暴露
  placement group edit，且 placement Inspector 明示编辑真实地图快照、不从模板重建。唯一反向转换
  `buildStampTemplateFromSelection` 也只接受 map + cells selection。因而“放置→组内编辑→解组→重选区”虽然
  技术上能绕行，却必然污染并拆解真实地图，不是模板自身的非破坏 round-trip。
- **SK1——draft / 复用边界钉**：模板编辑 surface 只能接收内存 draft、tileset/投影只读资源和显式 patch
  callback；不得导入或伪造 `MapMode` session、写 `session.maps`、MapIndex、save 输入或临时持久地图。可复用
  `relativeLatticeOffset`、`resolveRelativeLatticeOffset`、投影/命中/tileset palette 等纯函数或小 surface，
  不能把 `MapMode` 的 dispatch、placement authoring、entity/map IO 状态机带进模板域。若不写持久地图便无法
  渲染/命中，立即 counter 并重新抽取纯 adapter，不得以隐藏临时地图兜底。
- **SK2——单一事务与作者交互钉**：打开/新建仅创建 draft；layer/tile/height/collision/anchor 的所有中间操作
  只改 draft，dirty 离开必须确认。保存先 canonicalize + validate，再且仅 dispatch 一次 Add/Replace command；
  migrated 的 `takeOwnership` 只能随确认保存发生，取消/校验失败不得改变来源。活动层、稳定 slot ID、独立
  collision 与固定可见 anchor 必须在同一工作区可达；窄屏可折叠/换区，但不得隐藏内容编辑能力或退回表格/JSON。
- **可证伪观察**：若 round-trip 破坏负 offset/奇偶，重复保存产生内容漂移，保存前 history/session maps/MapIndex
  发生变化，取消后 migrated 变 authored，或模板更新扫描并改写 placement，则 SK1/SK2 任一被推翻，任务必须
  停线返工。上述观察分别由 SE2 字节稳定与 SE3 六态持久数据不变矩阵机检。
- **结论**：`premise verified + design agree（SK1-SK2）` 保持有效；恢复小节后 build 准入前置满足。

#### GLM 独立数据覆盖审查（2026-08-17，数据不变量/测试矩阵；本人一手读码，非代理）

**premise 七点核实**（见签字块）。**必落钉 SE1-SE3：**

- **SE1（Kimi 审查节缺失——文档缺陷，落卡前置）**：Kimi 签字块三次引用「Kimi 独立反证审查」，
  但该节不存在于卡内；**SK2 无任何定义**，SK1 仅有行内半句（"抽取时把 session/dispatch 耦合带进
  draft——由 SK1 钉住"）。build 前 Codex 须补全该节（或由 Kimi 落其原始审查），SK1/SK2 完整定义
  入卡；纯文档补录，落卡后 GLM 无需重审（同 ED-CATALOG-CONTROLS-1 RK-A 模式）。
- **SE2（lattice 奇偶 + 字节稳定测试钉）**：draft 的 draftOrigin 平移不得破坏 dRow/du 奇偶
  （结构上 u=2col+rowParity 保证，但保存路径必须有不变量断言）；round-trip 测试须含负 offset
  多象限、anchor 在成员包围盒外部、**同一模板重复打开→保存两次的 no-op/字节稳定断言**
  （Replace 重复内容 no-op 是命令层既有行为，须测试钉住而非口头假设）。
- **SE3（placement 不变性四态矩阵）**：验收"已放置组值与 identity 不变"须展开为四态断言——
  模板编辑中 / undo / redo / 保存重开——每态断言 session maps、MapIndex、save 输入零变化
  （draft 隔离的机检形态）；取消与校验失败两态同表。

**可证伪观察：**
1. 若实现中发现 draft 需要写入 session maps 或 MapIndex 才能复用地图渲染（本人读码未见此需要，
   纯 adapter + draft reducer 应可承载），即违反 SE3/卡文设计结论 2 → 停线重估复用边界。
2. 若 canonicalize 确定性排序在某 fixture 上产生非稳定字节（如 key 顺序漂移），SE2 拦截。
3. 若迁移预置接管在 draft 取消后留下 authored 标记（接管只在确认保存时生效），SE3 的取消态断言
   拦截。

Evidence: StampLibraryTab.tsx:540-548,595-600 / MapMode.tsx:412-417 / stamp-template.ts:73-76 /
stamp.ts:65-68 / stamp-commands.ts:65-71 / map-transform.ts:86-100 / 五测试文件 ls 实存 /
Kimi 签字块与「独立反证审查」引用缺节 grep 实证。只读审查，未改实现文件，未代签 Kimi，未标
build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-18，二次返工后重新签）**。前两次 accept 分别被“查看/编辑分离”与“常驻选区命令、
  重复组合标题壳、View 层级”两轮用户 counter 推翻。当前选择即编辑；基础信息归属性；属性/引用/瓦片分栏；
  地图与组合共同消费 `LayerStackControls`、`IsometricEditorCanvas` 和 `IsometricEditorSurface`。地图常驻栏只保留
  主工具及当前主工具的附加项，复制/剪切/粘贴/移动/重复/删除/包含碰撞进入可键盘访问的画布右键菜单，View
  收为单一菜单。editor `129 files / 965 tests`、typecheck、build、定向 96 项和 1280×720 浏览器复验全绿；
  未触及 schema/runtime/placement 非链接语义。
- Kimi: pending
- GLM: pending
- counter / 返工处理: **2026-08-18 两轮用户 counter 均已完成返工；等待 Kimi/GLM 独立复审。**
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **一个编辑语义，两种入口**：组合库内“新建/选择即编辑”是主闭环；地图普通选区“保存/更新组合”继续作为
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

- Coding Owner: Codex（三签齐后实现）
- 修改文件:
  - `packages/editor/src/core/stamp-draft.ts`、`stamp-draft.test.ts`
  - `packages/editor/src/ui/StampContentEditor.tsx`
  - `packages/editor/src/ui/StampLibraryTab.tsx`、`StampLibraryTab.test.tsx`
  - `packages/editor/src/ui/LayerStackControls.tsx`、`IsometricEditorCanvas.tsx`、`IsometricEditorSurface.tsx`
  - `packages/editor/src/ui/MapMode.tsx`、`MapMode.test.tsx`、`TilesetTab.tsx`、`editor.css`
  - `packages/editor/src/ui/design-system/boundary.test.ts`
- 实现摘要:
  - 新增纯 draft 边界，直接复用既有 isometric lattice 互逆/移动函数；覆盖稳定 layer ID、图层 CRUD、
    flat/height、视觉/碰撞 0/1、选区移动、reanchor、确定性 canonicalize 与 tileId fail-loud。
  - 组合库新增空库新建，已有模板选择后直接进入唯一工作台；不再保留查看/编辑切换。所有中间操作留在内存，
    dirty 切换/取消先确认，migrated 只有“接管并保存”才转 authored。
  - 基础信息和模板动作进入“属性”，引用诊断进入“引用”，真实 tileset palette 进入右侧“瓦片”；删除“动作”页。
    图层管理抽为 `LayerStackControls`，地图与组合共用；等距投影/命中/绘制 surface 抽为
    `IsometricEditorCanvas`，中央画布同时承担编辑和合成预览，不再维护重复的 DOM 格子/预览画布。
  - 地图工具栏移除独立“放置组合”：右侧选择组合后直接进入放置；跨层选择只在选择工具中出现，变换含碰撞归入
    选区操作附加项，碰撞成为主工具且标记/清除只在该状态出现，网格/碰撞显示独立分组。
  - 第二轮工具栏返工移除常驻“选区操作”；复制/剪切/粘贴/移动/重复/删除与“包含碰撞”进入画布右键菜单，
    同时支持 ContextMenu / Shift+F10、方向键、Home/End、Escape 和既有快捷键。去掉“移动…”省略号；显示项
    收口为 `DsMenuBar` 的 View 菜单。
  - 新增 `IsometricEditorSurface` 统一 toolbar/viewport/overlay/footer 骨架；组合中央删除重复页面标题 Hero，
    直接从共享工具栏和等距画布开始，名称/分类/保存留在属性面板。
  - 用户新增的“同一地图多瓦片集、来源选择位于瓦片 Tab”会改变 map/stamp/save/runtime canonical 结构，已拆到
    `ED-MAP-MULTI-TILESET-1` 并完成 premise 核验；本卡不以移动单值下拉伪装为多来源闭环。
  - Tileset 页自有 header 改为共享 `DsObjectHero`；地图/组合图层按钮和状态语法统一。
  - 保存边界位于 `StampLibraryTab.tsx:288-299`，一次且仅一次派发 `AddStampTemplateCommand` 或
    `ReplaceStampTemplateCommand`；原地图选区导入捷径保留。
  - 响应式区使用内容高度 grid + 中央滚动；620px container query 重排图层、工具条和选区动作，tooltip
    向内/向上锚定，避免窄栏隐形溢出。
- 运行命令:
  - `pnpm --filter @type-pal/editor check`：通过；129 files / 965 tests passed。
  - `pnpm --filter @type-pal/editor build`：通过（仅既有 chunk >500k 提示）。
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/MapMode.test.tsx`：56/56 passed（最后工具栏语义修订后定向复验）。
  - `pnpm exec vitest run packages/editor/src/ui/MapMode.test.tsx packages/editor/src/ui/StampLibraryTab.test.tsx packages/editor/src/ui/design-system/boundary.test.ts`：96/96 passed。
  - changed-files `biome check`：通过；仅报告 `editor.css:10314-10317` 既有 `.visually-hidden !important`
    4 条 warning，本卡未新增。
  - `git diff --check`：通过。
- 浏览器 / 手工检查:
  - `?ui_samples=1&module=map&page=stamp`：选择组合即见编辑工作台；左侧列表和共享图层栈均可达；右侧瓦片网格
    独立滚动；中央共享等距画布填满剩余高度；无旧“编辑内容/退出编辑”状态。
  - `?ui_samples=1&module=map&page=editor`：选择工具才显示“跨层”；碰撞工具才显示“标记/清除”；选区命令不再
    常驻，右键菜单完整收在画布内；View 为单入口；右侧选择组合后出现放置 Inspector，工具栏不存在独立
    “放置组合”按钮。
  - `?ui_samples=1&module=map&page=stamp`：中央没有重复组合标题 Hero，顶部直接是共享编辑 surface；右侧属性
    保留名称/分类/保存，瓦片与引用各自归入 Tab。
  - 1280/900/720 × 720 三档 document 横向 overflow 均为 0；900 中央 416px、720 中央 260px，画布保持可滚动。
- 跳过的检查及原因: 无。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: in-app Browser + DOM 尺寸量化 + 三档截图 + 语义交互。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: 本轮浏览器内联截图（未把临时截图落库）；量化证据已写入上一节。
- 结论: **二次返工后通过**。查看/编辑分离、重复图层/画布、组合中央重复标题、常驻选区命令、View 层级和菜单
  越界均已按共享 surface 收口；最新 1280×720 复验右键菜单与组合中央布局通过。多瓦片集语义另见
  `ED-MAP-MULTI-TILESET-1`，不得用现有单值下拉搬家冒充完成。
- 未完成项: Kimi/GLM 独立 review 与用户最终验收。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: 2026-08-17 与 2026-08-18 两次 Codex accept 均曾被后续用户 counter 推翻；二次返工后 Codex
  重新 accept，Kimi/GLM pending。
- 必须返工项: 两轮用户 counter 项已完成；多瓦片集结构纠偏转 `ED-MAP-MULTI-TILESET-1`；以非 Coding Owner 复审为准。
- Accept / rework: review。

## 用户验收

- 用户结论: **counter（2026-08-18，第二轮）**：不得常驻选区命令；移动不应带省略号；View 需要统一样式；
  组合中央删除重复标题并继续复用地图编辑 surface。以上已返工，等待用户复验。用户同时要求来源瓦片集在“瓦片”
  Tab 选择且一张地图允许多个瓦片集；该 schema 产品铁律已进入 `ED-MAP-MULTI-TILESET-1`，尚未获得 build 三签。
- 后续任务: Kimi/GLM 独立复审 + 用户对返工版最终验收。

## 交接日志

- 2026-08-17 User: 指出组合库无法编辑多图层、多高度、多瓦片的模板内容，现有功能不闭环。Evidence:
  本轮用户反馈。Next: Codex 核验现状并开纠偏卡。
- 2026-08-17 Codex: 浏览器与源码核验确认属性编辑、placement 组内编辑、普通 cells 选区替换三者没有形成模板
  自身的非破坏性 round-trip；完成前提矩阵、候选架构、风险和验收条件并签 premise/design。Evidence:
  `StampLibraryTab.tsx:258-278,540-611`、`MapMode.tsx:412-417`、
  `StampPlacementSelectionInspector.tsx:138-225,244-382`。Next: Kimi 独立架构/交互反证并签字；未签前不得实现。
- 2026-08-17 GLM（数据不变量/测试矩阵）: 审查完成，签 **premise verified + design agree（附
  SE1-SE3）**。七点前提一手核实（登记面板只编辑名称分类、cells-only 暴露、反向转换强制 cells、
  奇偶不变量、takeOwnership 命令、lattice 互逆对、五测试文件在位）。**关键发现 SE1：Kimi 签字三次
  引用的「Kimi 独立反证审查」节未写入卡内，SK2 无定义**——Codex 须先落节（纯文档补录）。SE2 钉
  奇偶+字节稳定+重复保存 no-op 断言；SE3 钉 placement 不变性四态矩阵（含取消/校验失败态零写入
  断言）。三签齐（SE1 落卡为 build 前置）。未改实现文件，未代签 Kimi，未标 build/done。
- 2026-08-17 Codex: 完成组合模板内容编辑闭环并签 Codex accept。实现纯 draft、可视化多层/高度/碰撞/
  锚点编辑、新建/编辑/dirty 离开/迁移接管与单笔命令保存；补齐 SE2/SE3 机检。Evidence: editor
  129/948、content 42/484、typecheck、Biome/diff-check 全绿；1280/900/720 浏览器矩阵无文档横溢出，
  实测取消零写入与保存/undo/redo，Console 0。Next: Kimi/GLM 独立 review，未齐前不得标 done。
- 2026-08-18 User: counter 初版交互与复用边界：查看/编辑不应分离，基本信息应在属性，瓦片应在右栏；图层与
  中央地图编辑必须复用地图页面；地图工具栏移除独立放置组合并明确主工具/附加项/显示项。Evidence: 本轮多张
  UI 截图与连续反馈。Next: Codex 返工；旧 accept 失效。
- 2026-08-18 Codex: 完成返工并重新 accept。新增共享 `LayerStackControls` 与 `IsometricEditorCanvas`，组合选择即
  编辑，属性/引用/瓦片分栏，地图选组合即放置，工具栏按语义分组；Tileset hero 一并统一。Evidence: editor check
  129/965、build、MapMode 56/56、三档浏览器无横溢出、Console 0。Next: Kimi/GLM 独立复审；未齐前不得标 done。
- 2026-08-18 User: 第二轮 counter：常驻选区操作、移动省略号、View 呈现和组合中央重复标题仍不合格；要求组合
  中央继续沿用地图编辑组件。Next: Codex 继续同卡返工，上一轮 accept 失效。
- 2026-08-18 Codex: 新增共享 `IsometricEditorSurface`，删除组合中央 Hero；选区命令迁入带键盘替代路径的画布
  右键菜单，View 收为 `DsMenuBar`，完成菜单实测与 editor 129/965 + build，重新 accept。Next: Kimi/GLM 复审。
- 2026-08-18 User: 进一步裁决瓦片集语义：来源选择位于“瓦片”Tab，一张地图可混用多个瓦片集。Codex 核验
  当前单 tileset + 裸 tileId 横跨 map/stamp/runtime，拆出 `ED-MAP-MULTI-TILESET-1` 高风险卡；三签前不得实现。

## 下一位 Agent 提示词

```text
接手任务：ED-STAMP-EDITOR-1 组合模板内容编辑闭环
任务卡：docs/ops/tasks/ED-STAMP-EDITOR-1-stamp-template-content-editor.md
当前状态：review；用户两轮 counter 后，Codex 完成 shared surface、右键选区命令与 View 返工并于 2026-08-18 重新 accept；
Kimi/GLM done 前 accept pending；不得标 done。
你的角色：Kimi 或 GLM，负责独立代码审查与 done 前签字。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、
packages/editor/src/core/stamp-draft.ts、stamp-draft.test.ts、stamp-commands.ts，
packages/editor/src/ui/StampContentEditor.tsx、StampLibraryTab.tsx/test、LayerStackControls.tsx、
IsometricEditorCanvas.tsx、IsometricEditorSurface.tsx、MapMode.tsx/test、TilesetTab.tsx、design-system/boundary.test.ts 与 editor.css。
已完成：纯内存 draft；选择即编辑；属性/引用/瓦片分栏；地图/组合共享图层栈、等距画布和 surface 骨架；右侧
tile palette；地图选组合即放置；选区命令进画布右键菜单；View 单入口；editor 129/965、build 与浏览器复验全绿。
请你做：独立检查 SK1/SK2 与 SE2/SE3，并重点核对共享 surface 是否仍保持 draft/session 隔离、地图/组合投影与
命中是否一致、组合选择即放置是否无隐藏模式冲突、工具栏附加选项是否只在正确主工具下出现、窄栏布局是否可达；
复跑必要测试。
无阻塞则在 done 前签 accept；有问题签 counter/rework 并写出文件行号与最小返工项。
不要做：不得代签另一方，不得在三方 accept + 用户验收前标 done；审查阶段原则上不改实现文件。
输出要求：把证据、结论与签字写回任务卡；若仍缺另一方，附下一位 Agent 提示词。
```
