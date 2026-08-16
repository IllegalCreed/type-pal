# ED-DIAGNOSTIC-UI-1 - 属性面板问题与诊断呈现统一

Status: draft
Phase: phase2
Capability: Editor cross-cutting（本卡不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: TBD

## 目标

把右侧属性面板里重复出现的“问题 / 诊断 / 待迁移来源 / 放置问题明细”收敛成唯一诊断呈现合同：共享与
`DsReferenceRow` 相同的定位行视觉骨架、字体层级、长路径、尾部动作、hover/focus 和窄宽行为，但保留诊断独有的
严重级别、清零状态、问题计数、批量分页和修复语义。领域页面继续拥有 collector、严重级别、stable key、跳转命令
和工作流决策；design-system 不读取 `ProjectIssue`、迁移 sidecar、资产闭包或地图放置计划。

用户可见结果：截图中的工程“问题 152”不再是一整墙金色私有卡片和微型“跳转”按钮，而是先给出一条问题摘要，
再用与引用面一致的紧凑定位行展示“级别 / 可读问题 / 证据路径 / 跳转或静态状态”。切到过场、物品和组合放置时，
诊断行仍是同一视觉语言；错误与警告通过文字标签明确区分，不靠颜色猜测，也不被伪装成“引用”。

## 范围

- 范围内：
  - 新增唯一公开诊断 recipe：`DsDiagnosticPanel`、`DsDiagnosticList`、`DsDiagnosticRow`（最终命名须经 build 前
    架构审查确认，但只允许一套公开合同）。
  - 在 design-system 内部抽取不含业务含义的 locator-row frame，供 `DsReferenceRow` 与 `DsDiagnosticRow` 共享
    geometry、排版、根元素选择、尾部动作和长文本合同；Reference 与 Diagnostic 保持独立公开语义。
  - 迁移 Project `IssueList` 的全部消费点：右侧紧凑 Inspector、overview/advanced 主问题面板和入口 id 修复列表；
    保留 compact 30 条、full 80 条分批显示、查看全部与收起行为。
  - 迁移 Cutscene Inspector 的“诊断” Tab、Item Inspector 概览中的“待迁移来源”、Map 的
    `StampPlacementInspector` 问题明细。
  - 统一 exact count、error/warning 文本标签、empty/clear、jumpable/static、长 message/path/code、分页和焦点行为。
  - 更新 `editor-design-system-v1.md`、Design Lab `RF-17`、共享组件测试、四个领域回归和 static boundary。
- 范围外：
  - 项目诊断 collector、资产引用闭包校验、迁移 sidecar、地图放置 planner、severity 判定、stable identity、
    `EditorLocation`、保存/导出/阻断/覆盖策略。
  - App 底部全局状态条、toast、表单字段错误、modal 错误、脚本编辑器内部 warnings、资源预览内缺失提示。
  - Stamp Library 主工作区“悬空来源引用（信息）”、Image 的单个缺失聚焦目标、StampPreviewCanvas 的缺 tile 提示；
    它们不是本卡定义的 Inspector 列表形诊断面。
  - 新增自动修复、批量忽略、severity 筛选、排序、搜索、跨工程问题中心或新的业务跳转目标。
  - ED-3 引用图、schema/content/save/migration/asset pipeline 或 capability-map 状态变化。
- 明确不做：
  - 不直接用 `DsReferencePanel/Row` 渲染诊断，不给引用组件增加 `variant="diagnostic"`，不把“问题数”改写成
    reference occurrence。
  - 不建立 `ProjectIssue | MigrationDiagnostic | StampPlacementIssue` 的公共大联合类型，不把领域类型导入
    design-system。
  - 不让每条问题各自 `role="alert"`，不以红/黄圆点作为唯一严重级别，不用 disabled button 表达不可定位。
  - 不把项目列表强行改成 Reference 的 12 条展开合同；诊断继续使用 30/80 的规模策略。
  - 不与 `ED-REFERENCE-UI-1` 或 `ED-CATALOG-CONTROLS-1` 并行修改重叠实现文件；当前只开卡。

## 前提真值门

### 一句话行为 / 工程前提

当前二阶段至少有四个右侧 Inspector 诊断面重复实现“级别 + 说明 + 路径/证据 + 可选动作”，问题位于呈现层和
无障碍合同分裂；它们可以共享引用行的中性 locator 视觉骨架，但不能复用引用的 occurrence、影响或删除语义。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 用户直接指出截图中的“问题 152”组件也应参考刚统一的引用样式，并要求新开 `ED-DIAGNOSTIC-UI-1`。这是 Reforge 作者工具的新产品要求，不是原版游戏机制。 | 2026-08-16 用户本轮请求与两张随附截图；`docs/phase2/READ-FIRST.md:8-22` |
| 第一阶段 | N/A：第一阶段交付游戏运行时，不包含二阶段编辑器 Inspector、问题卡或定位交互。 | `CLAUDE.md:23-30`；`docs/phase2/READ-FIRST.md:20-22` |
| 当前二阶段 | Project、Cutscene、Item、Stamp Placement 分别维护四套 JSX/CSS；现行规范同时要求错误保留上下文、全局/字段问题分层，并明确诊断不是引用行。Reference 已形成可复用的定位行 geometry，但公开合同仍是引用专用。 | `ProjectWorkbenchTab.tsx:151-225,828-862,1648-1669`; `CutsceneTab.tsx:413-428,857-875`; `ItemTab.tsx:1909-1935`; `StampPlacementInspector.tsx:120-164`; `editor.css:1784-1864,8339-8353,11038-11055,12600-12672`; `editor-design-system-v1.md:379-413,421-427` |
| 本任务目标 | 四个 Inspector 诊断面使用唯一 Diagnostic Panel/List/Row 合同；Reference 与 Diagnostic 共享无业务含义的 locator frame，collector、计数单位、严重级别和工作流语义不变。 | 用户 2026-08-16 裁决；本卡 canonical 合同、迁移矩阵和验收条件 |

### 反证与替代解释

- 最强替代解释 1：直接把工程问题数据塞进 `DsReferenceRow`，改动最少。反证：引用行的 count 是 occurrence，
  Panel 说明 blocking/informational 影响；诊断的 count 是 finding，且拥有 error/warning、修复证据和清零状态。
  `editor-design-system-v1.md:381-397,409-413` 已明确诊断不是引用行。
- 最强替代解释 2：只给 `.project-issue` 换成 reference CSS。反证：Cutscene、Item、Stamp Placement 仍会保留
  独立 DOM、严重级别、focus、空态和长文本处理，下一次修改仍会漂移。
- 最强替代解释 3：所有错误/提示都应一次性迁入。反证：字段错误、预览缺失、全局状态条和 Inspector 列表的
  生命周期、密度和用户任务不同；扩成“所有 error UI”会制造错误的公共大组件。
- 什么观察会推翻当前前提：
  - 若某纳入面无法只靠展示 slots 表达，必须让 design-system 读取领域 model 或执行 collector/修复命令，说明
    公共 primitive 边界错误，任务退回 draft。
  - 若 reference row 抽取 locator frame 后改变其 button/link/article、12 条展开、occurrence 或 focus 合同，停止
    诊断迁移并先修复 reference 回归。
  - 若某“问题”其实是表单字段错误、preview 生命周期状态或业务确认步骤，而不是可枚举 finding，移出本卡，
    不为它新增领域 variant。
  - 若全行点击与现有选择/拖拽/覆盖动作冲突，则保留静态行或独立 canonical action，不用 nested button 硬套。
- audit 红项如适用，已排查的替代根因：
  - runtime 语义 / 命令分类：N/A；当前证据是 React/CSS 呈现分裂，本卡不改运行时。
  - 原版 / 第一阶段理解：N/A；第一阶段没有对应作者工具 UI。
  - extractor / 地图 / 数据解码：未发现上游数据缺陷证据；Stamp 问题来自现有 placement plan，本卡原样适配。
  - audit / test model：逐个读取生产 JSX、typed model 和现有测试；没有用 class 数量替代业务边界判断。

### 用户可见偏离

- 是否主动偏离已核真值：yes（用户明确要求统一当前诊断组件）
- `before -> after` 一句话：四套私有警告卡/列表 -> 唯一诊断摘要与定位行合同，诊断业务真值不变。
- 代表场景：工程 Inspector 显示 152 条未引用 AssetId，其中一部分可跳转、一部分只提供路径；切到 Cutscene、
  Item、Map Stamp 时仍使用同一行层级，但分别保留资产闭包、迁移来源和放置冲突语义。
- 用户裁决：2026-08-16 用户已批准统一方向并要求新开 `ED-DIAGNOSTIC-UI-1`；build 仍需三方签字。

## 当前 Inspector 诊断面审计（2026-08-16 工作树）

判定口径：纳入右侧 Inspector 内可枚举、可重复出现、具有 finding identity 的问题列表；同一组件在主工作区的
正式“问题面板”消费点也随组件一起迁移，防止保留双皮肤。领域 collector 与 action owner 不迁入 shared 层。

| 页面 / 诊断面 | 当前结构 | 必须保留的领域真值 | 本卡动作 | 直接证据 |
|---|---|---|---|---|
| project / IssueList | 私有 `project-issues/project-issue` div、颜色圆点、mini jump；compact 30、full 80 | `ProjectIssue` exact finding、error/warn、稳定 `code:path:message`、可选 EditorLocation、30/80 分批 | Panel/List/Row 全迁；可定位行用整行真实 button，静态行明确“无法定位”；所有 `IssueList` 消费点同源 | `ProjectWorkbenchTab.tsx:151-225,828-862,930-934,1648-1669`; `project-diagnostics.ts:35-72,486-505` |
| asset / cutscene / 诊断 Tab | 私有 `cutscene-diagnostic` div；只有 message 和 ok 文案 | selected asset 的 asset-reference closure finding；exact count；当前无 locator | 使用 shared Panel/List/Row 静态行；保留资产筛选逻辑和 Tab count | `CutsceneTab.tsx:403-428,857-875` |
| item / overview / 待迁移来源 | 私有 `item-diagnostic`，每项重复“在问题面板查看”按钮 | sidecar stable id、warn、target label、reason、legacy source/address；动作打开工程问题面板 | 嵌入 Diagnostic Panel/List/Row；可跳转时整行 button，否则静态状态写明旧源只读 | `ItemTab.tsx:650-708,1859-1935`; `migration-diagnostic.ts:1-39` |
| map / StampPlacementInspector / 问题明细 | 私有 section + `ul/li`；error 与 conflict 两种皮肤 | issue 阻止放置；conflict 允许用户另行选择覆盖；ref/value 是当前 preview 证据；列表本身无动作 | 保留 placement status/actions owner，只把 finding summary/list/row 迁入；error/warning 文字标签和 code/ref/value 顺序统一 | `MapMode.tsx:3838-3852`; `StampPlacementInspector.tsx:120-176`; `stamp-placement.ts:25-59,75-93` |

### 已审计并明确排除

| 相邻呈现 | 排除原因 | 证据 |
|---|---|---|
| App 底部“引用与工程诊断”状态 | 全局跨工程摘要，不是 Inspector finding list；保留为问题入口 | `App.tsx:2540-2552`; `project-diagnostics.ts:508-519` |
| Stamp Library 悬空来源引用 | 主工作区的信息性来源清单，不在右侧 Inspector；更接近 provenance/reference debt | `StampLibraryTab.tsx:281-306,519,528` |
| SharedScript warnings | 脚本引用查看流程内的文本 warnings，不是 canonical Inspector 诊断 Tab | `SharedScriptTab.tsx:414-419,1001-1005` |
| Image 缺失 focused target | 单个导航失败/资源缺失状态，不是 finding collection | `ImageTab.tsx:609-635` |
| Stamp preview 缺 tile | 预览组件内的即时缺失提示，不是 Inspector list | `StampPreviewCanvas.tsx:237-244` |
| 表单校验、toast、modal/error boundary | 生命周期与修复位置由 DS-C.8 分层；不得伪装成诊断行 | `editor-design-system-v1.md:415-427` |

## 上下文锚点

- 已拍板决策 / 铁律：
  - 第二阶段开工先读 `docs/phase2/READ-FIRST.md`；新用户可见 UI 合同必须先过 premise truth gate 和三方签字。
  - `ED-INSPECTOR-TABS-1` 已统一 Tab 导航；本卡只改 panel 内诊断呈现，不改 tab 数量、标签或选择状态。
  - `ED-REFERENCE-UI-1` 已确立 Reference Panel/List/Row 语义，本卡只能共享内部 locator frame，不能把诊断
    合并进 reference API。
  - 所有当前工作树改动属于用户；Coding Owner 不得 reset/restore/整文件重写或整理无关 diff。
- 代码锚点（`file:line`）：
  - Shared reference anatomy：`packages/editor/src/ui/design-system/recipes.tsx:159-392`；
    `packages/editor/src/ui/design-system/recipes.css` 中 `.ds-reference-*`。
  - Project diagnostic model/presentation：`packages/editor/src/core/project-diagnostics.ts:35-72,486-505`；
    `packages/editor/src/ui/ProjectWorkbenchTab.tsx:151-225`。
  - Cutscene：`packages/editor/src/ui/CutsceneTab.tsx:403-428,857-875`。
  - Item：`packages/content/src/migration-diagnostic.ts:1-39`；`packages/editor/src/ui/ItemTab.tsx:1909-1935`。
  - Stamp placement：`packages/editor/src/core/stamp-placement.ts:25-59,75-93`；
    `packages/editor/src/ui/StampPlacementInspector.tsx:120-176`。
- 已知坑 / 审计文档：
  - `docs/phase2/editor/editor-design-system-v1.md:379-413`：Reference count/impact/action 是引用专用合同。
  - `docs/phase2/editor/editor-design-system-v1.md:415-427`：错误与诊断必须保留上下文，并按全局/字段/短暂反馈分层。
  - 用户截图暴露 11px/9px 私有字号、金色整墙边框和微型 jump；对应 CSS 在
    `packages/editor/src/ui/editor.css:1784-1864`。
- 不得重新引入：
  - `variant="project|cutscene|item|stamp"`、领域类型 union、另一个 `.xxx-diagnostic` 皮肤、颜色-only severity、
    nested button、disabled fake action、数组下标作为可持久 finding identity。
  - 为兼容已迁页面保留旧 class alias；旧历史由 Git 保存，迁完即删私有 skin 和 fixture selector。
- 相关测试：
  - `packages/editor/src/ui/ProjectWorkbenchTab.test.tsx:133-169`（303/80、compact 30、view all、collapse）。
  - `packages/editor/src/ui/AssetInspectorTabs.test.tsx:205-222`（Cutscene canonical tabs）。
  - `packages/editor/src/ui/StampPlacementInspector.test.tsx:1-126`（conflict/error 明细与数量）。
  - `packages/editor/src/ui/design-system/recipes.test.tsx:204-332`（reference root、展开、长 path 回归）。
  - Item 诊断呈现当前缺独立 UI 回归；本卡必须补齐。

## Draft: 设计与风险

### Canonical 设计合同

#### 1. 公开语义与内部共享边界

- 公开层只新增 `DsDiagnosticPanel → DsDiagnosticList → DsDiagnosticRow`；业务页不得直接消费内部 locator frame。
- 内部 locator frame 只拥有：row padding/gap/radius/border、content min-width、labels/title/detail/path/trailing
  顺序、button/link/article 根、hover/focus-visible、长文本和窄宽布局。它不知道 reference、diagnostic、severity、
  occurrence、EditorLocation 或业务命令。
- `DsReferenceRow` 与 `DsDiagnosticRow` 分别把自己的业务 slots 映射到 frame。Reference 的 blocking/occurrence/
  read-only 合同不变；Diagnostic 才拥有 error/warning、finding code 和诊断状态。
- 若内部抽取会放大当前 review 风险，可以先用共享 CSS anatomy 落地，但 build 结束时必须只有一个 locator-row
  geometry owner；不接受复制整段 `.ds-reference-row` 为 `.ds-diagnostic-row`。

#### 2. Diagnostic Panel

- 状态固定为 `ready / clear / partial / failure`：
  - `ready`：collector 完整，显示 exact error/warning totals；总 finding 数为两者之和。
  - `clear`：完整且为 0，统一 success 摘要；不渲染空 row 壳。
  - `partial`：只显示当前下界和失败来源；不得冒充 exact Tab count。
  - `failure`：collector 失败，保留上下文与领域提供的 retry/action；不是“0 个问题”。
- 当前四面都能提供 complete/exact；`partial/failure` 先作为共享 contract/fixture，不能借机新增扫描器。
- Panel 只接收展示 count/state/summary/description/action；不计算严重级别、不持有修复命令。
- live region 只用于 Panel 总结或分页回执；不得给几十/几百行逐条 `role="alert"` 造成播报风暴。

#### 3. Diagnostic Row

- 固定顺序：`错误/警告`文字标签 → 可读 message/title → 可选 detail/code → 等宽 path/evidence → 尾部
  `跳转 ↗ / 在问题面板查看 ↗ / 无法定位 / 仅提示`。
- severity 只允许 `error | warning`；clear/success 属于 Panel，不造“成功诊断行”。
- 可定位行使用整行真实 `<button>` 或 `<a>`；不可定位行使用 `<article>`。行内不得再嵌套按钮。
- message 可换行；path/code 可选中复制并 `overflow-wrap:anywhere`；120 字符 path、200% zoom、窄 Inspector 无横滚。
- 颜色不是唯一信息；severity label 和 trailing status 始终有文本，icon 仅为冗余辅助。
- caller 继续提供 stable React key。Project 使用现有 `code:path:message`，Item 使用 sidecar `id`；Stamp 当前
  index key 只描述瞬时 preview，不可被误写成持久 identity，build 审查需确认同一次 plan 内重排不会错误保留状态。

#### 4. Diagnostic List 与大列表

- `DsDiagnosticList` 使用语义 list/listitem，统一 gap 与分页尾部；不负责筛选、排序、去重或 severity 统计。
- Project compact 初始 30，提供“查看全部 N 项”进入 advanced；full 初始 80，每次继续 80，支持显示全部和收起。
- Cutscene、Item、Stamp 当前数量小，使用无分页模式或高于实际量的默认阈值；不得被 Reference 的 12 条折叠截断。
- 分页后回执使用一个 polite status；焦点不突然跳到列表顶部，显示全部/收起的 handler 只触发一次。
- finding count 是 collector 去重后的行数，不是 reference occurrence；不在 shared 层二次聚合或跨面去重。

#### 5. 视觉方向

- 复用 Reference 的中性 panel/row 基线、12px 主文案层级、10/11px 次级文字、token border/background、8px
  radius、统一 trailing column 和 focus ring；不保留 Project 当前 9px path、11px message、4px radius。
- severity 主要通过小型文字 tag、Panel 摘要和左侧轻量 accent 表达；不要给每条 warning 整圈高饱和金边，避免
  152 条时形成“金色墙”。error 比 warning 更强，但两者都必须保持正文可读性和对比度。
- 行的视觉相似度来自 locator frame，不通过删掉诊断语义实现。Reference 仍显示来源/occurrence/影响，Diagnostic
  显示 severity/code/evidence。

### 页面适配规则

- Project：`IssueList` 可以保留为 typed adapter，也可以被小型 adapter 函数替代；不得继续拥有视觉 class。
  Inspector 用 compact list，主问题面板用 full list。target + callback 存在时整行跳转；否则 article 显示无法定位。
- Cutscene：保留 `selectedIssues` 的现有筛选和 Tab count；每条显示 severity/message，并把 `where` 作为可复制
  evidence。当前没有 locator，必须是静态 row，不造假跳转。
- Item：保留 sidecar label/reason/source/address 和 `onOpenProjectIssues`；action 存在时整行打开问题面板，不存在时
  静态说明旧脚本源只读。不得修改 migration diagnostic 的消解、删除或保存。
- Stamp Placement：`issues` 映射 error，`conflicts` 映射 warning；warning 只说明可覆盖冲突，真正“覆盖并放置”
  action 留在现有 workflow actions，不能塞进某一行。顶部 placement status 仍负责未映射/未 preview/ready 生命周期。

### 已知风险

- 风险：抽取 locator frame 可能回归已完成的 16 个 Reference 面。
  - 缓解：先冻结 `DsReferenceRow` DOM/role/focus/12 条展开契约测试；抽取前后逐项等价，Reference browser fixture
    `RF-16` 必须零语义变化。
- 风险：Project 152/303 条全部渲染造成性能与屏幕阅读器噪声。
  - 缓解：保留 30/80 分批和单一 live summary；行不使用 alert/live。
- 风险：统一样式掩盖 error 与 warning 的业务差异。
  - 缓解：文字 tag、Panel severity totals、对比度检查和混合严重级别 fixture；不只靠边框颜色。
- 风险：Item 与 Project 同一 sidecar 在两个地方出现，被误当重复 collector。
  - 缓解：明确它们是同一真源的全局视图与对象上下文视图；不改变数据、计数或消解命令。
- 风险：Stamp conflict 被误判为 blocking error，改变覆盖流程。
  - 缓解：conflict 固定 warning；现有 `canApply`、overwrite button 与 planner 测试不变。
- 风险：与 Reference/Catalog 卡同时编辑 `recipes.tsx/css`、Item、Cutscene 和 `editor.css` 造成覆盖。
  - 缓解：`ED-REFERENCE-UI-1` 先完成 review；本卡与 `ED-CATALOG-CONTROLS-1` 由 Codex 串行落地，build 前刷新
    工作树和锚点，不并行 Coding Owner。

### 主审立场

- Reviewer: Kimi（架构 / 视觉）主审；GLM 覆盖 / 测试复审。
- 结论: Kimi premise verified + design agree（2026-08-16，附 DK1）；GLM premise verified + design
  agree（2026-08-16，附 DK2——inventory 扩为 6 面，build 前必须先落卡）。
- 必改项: DK1（locator frame 抽取等价门禁：Reference 契约 + RF-16 零变化；build 结束单一
  geometry owner）；
  DK2（inventory 扩面：Image/Sound 的 closureIssues 诊断列表纳入审计表/验收/测试/boundary，
  呈现位置建议内联引用 panel 不开新 Tab，cf-err 通用 class 不得全仓禁，Kimi 轻量确认或用户豁免）。
- 是否建议进入 build: 是——DK2 落卡并确认后准入条件满足。

### 三方争议记录（按需）

- Codex: 公开 Reference/Diagnostic 分离，内部 locator frame 共享；当前不认为需要业务/schema 改动。
- Kimi: 同意分离 + frame 共享（DK1）；对 GLM DK2 扩面待轻量确认（Cutscene 同构机械扩展预期无异议）。
- GLM: 同意分离 + frame 共享；inventory 必须扩为 6 面（Image/Sound 漏网），呈现位置建议内联
  引用 panel；cf-err 划界须限定迁移上下文。
- 用户拍板: 2026-08-16 已批准新开本卡；若三方对“内部共享 frame vs 仅共享 tokens”无法收敛，再请用户裁决；
  Image/Sound 开诊断 Tab 与否若产生分歧，交用户裁决。

## 验收条件

### 功能

- 四个纳入面全部消费 canonical Diagnostic recipe，且 collector、severity、count、stable key、jump target、Item sidecar、
  Stamp overwrite 流程和保存结果与迁移前一致。
- Project 0/1/30/80/81/152/303 条均正确：compact 30、full 80、继续显示、显示全部、收起和“查看全部”不丢项，
  Tab count 保持 exact。
- jumpable row 只触发一次现有 callback；static row 不是 disabled button，明确显示无法定位/仅提示。
- Cutscene 0 条显示 clear，非 0 显示 severity/message/where；Item 显示 label/reason/source/address；Stamp error/conflict
  分级不变且 conflict 不阻断原有 overwrite 入口。
- Reference `RF-16` 和全部 16 个已迁引用面无 DOM/role/计数/交互回归。

### 测试

- Shared recipe：ready/clear/partial/failure、error/warning、button/link/article、长 message/path、单一 live region、
  accessible name、无 nested interactive、分页 30/80、show all/collapse、stable handler。
- Project：迁移现有 303/80 与 compact 30 测试，新增 jumpable/static、混合 severity、clear、长 path。
- Cutscene：新增 selected closure issue/clear/static evidence 测试；保留 canonical tabs/reference 回归。
- Item：新增 migration diagnostic 有/无 `onOpenProjectIssues`、source/address、callback 单次触发、业务 sidecar 不变。
- Stamp：现有 issue/conflict 数量与 value diff 回归；新增 shared row/severity 文本与 overwrite action 不嵌入行。
- Boundary：四个生产面必须使用 `DsDiagnostic*`；删除 `.project-issue*`、`.cutscene-diagnostic`、
  `.item-diagnostic`、`.stamp-placement-problems*` 中纯诊断皮肤；禁止 `DsReferenceRow` diagnostic variant、领域 union、
  新增 `.xxx-diagnostic` skin 和逐行 alert。
- 运行目标：相关定向 Vitest、`pnpm --filter @type-pal/editor test`、`pnpm lint`、`pnpm typecheck`、
  `pnpm format:check`（若仓库命令与当前文档不同，build 前以 `CLAUDE.md`/package scripts 为准）。

### 文档

- `editor-design-system-v1.md` 升级一个小版本，新增 Diagnostic contract，并明确与 DS-C.6a Reference、DS-C.8
  error/diagnostic 分层的边界。
- Design Lab 新增 `RF-17`：Project 152 代表态、mixed error/warning、jumpable/static、clear、partial/failure、
  long content、compact/full pagination；未知 fixture 文案同步更新。
- 任务卡 Build/Review、验证证据、截图路径、三方签字与实际文件行号在实现后更新。

### 视觉 / 手工验证

- 功能性界面开发期最小验证；使用本地 dev server/browser，不做剧情 E2E。
- 至少检查 1280px、900px、720px 窗口与浏览器等效 200% zoom；右 Inspector 取允许的最窄宽度。
- 场景：Project 152 条 warning、mixed error/warning、30/80 分页、单条长 message + 120 字符 path、jumpable focus、
  Cutscene clear/static、Item source/address、Stamp error + conflict。
- 通过标准：无横向页面滚动、无第二个无边界滚动 owner、focus ring 不裁切、severity 非颜色-only、正文/path 可读、
  152 条不形成高饱和边框墙。
- 截图目标：`artifacts/ed-diagnostic-ui-1/`（build 时创建并登记具体文件）。
- E2E 用例登记：N/A（编辑器功能性界面，使用开发期最小视觉验证）。

## 推进签字

### 进入 build 前：设计签字

- Codex:
  - premise: **verified（2026-08-16）**。直接读取 Project/Cutscene/Item/Stamp 生产 JSX、四类 typed model、
    私有 CSS、现有测试与 DS-C.6a/C.8；四面确有共同 locator anatomy，业务 count/severity/workflow 不同，证据见
    本卡真值矩阵与审计表。
  - design: **agree（2026-08-16）**。公开 Diagnostic 合同与 Reference 分离，内部共享中性 locator frame；保留
    30/80 分页、领域 owner 和所有业务语义。
- Kimi:
  - premise: **verified（2026-08-16，本人一手读码，非复述）**。四个纳入面 + typed model + 私有 CSS
    全部直读：Project IssueList（ProjectWorkbenchTab.tsx:151-230，私有 div 卡 + 颜色圆点 + mini 跳转 +
    30/80 分页 + 单一 polite 汇总）；Cutscene 闭包诊断（CutsceneTab.tsx:413-428 collector +
    :857-875 呈现）；Item 待迁移来源（ItemTab.tsx:1909-1935，含每行重复「在问题面板查看」与静态
    只读分支）；Stamp 放置明细（StampPlacementInspector.tsx:120-179，error/conflict 双皮肤 +
    index key + overwrite 动作在行外）。私有皮肤证据：editor.css:1791-1835（11px message、9px path、
    4px radius、severity 仅靠边框色 + 圆点，「! / ·」图标几乎无信息）——截图所述「金色墙」属实。
    Typed model（project-diagnostics.ts:35-72）：severity/code/message/path/可选 typed target
    （稳定 id、无下标身份）——全部可用纯展示值表达，design-system 无需 import 领域类型。
  - design: **agree（2026-08-16，附必落钉 DK1，不阻塞准入）**。「公开 Reference/Diagnostic 分离 +
    内部中性 locator frame」成立：几何/行为（padding、顺序、三根、hover/focus、长文本）同构，
    语义（occurrence+blocking vs severity+finding）不相交；符合 DS-IMP.3 第三次出现抽取规则；
    variant 方案被正确拒绝（DS-C.6a 已定性诊断不是引用行）；仅共享 tokens 的替代会留下 DOM/键盘/
    focus 双轨漂移。详见下方「Kimi 独立反证审查」。
- GLM:
  - premise: **verified（2026-08-16，本人一手读码，非代理；附一处 inventory 必改修正）**。四面
    premise 独立复核属实：Project `IssueList` 四消费点（ProjectWorkbenchTab.tsx:874,962,1689,1696）+
    30/80 常量（:154-155）+ 稳定 key `code:path:message`（:174）+ 单 polite 汇总（:192）+ 微型
    「跳转」按钮（:182-186）；Cutscene/Item/Stamp 三面结构与 typed model 逐字核对；
    `ProjectIssue.target` 是稳定 id 结构（project-diagnostics.ts:59-66），可纯展示值表达。
    **但 inventory 有缺口：Image 与 Sound 的 Inspector 引用 panel 内也渲染 `selectedIssues`
    `cf-err` 列表（ImageTab.tsx:525,744-747 / SoundTab.tsx:184,394-397），与 Cutscene 诊断面同源
    同构（同一 `closureIssues` collector、同 `code:where` key、无 locator）——按本卡自身纳入口径
    （右侧 Inspector 内可枚举、有 finding identity 的问题列表）它们是第 5/6 个纳入面，审计表与
    排除表均未覆盖。「至少四个面」的措辞保住了一句话前提，四面证据链成立；修正属范围级。
  - design: **agree（2026-08-16，附必落钉 DK2，不阻塞准入但 build 前必须先落卡）**。公开
    Diagnostic/Reference 分离 + 内部 locator frame 的合同对 6 面（含修正后的 Image/Sound）全部
    成立——Image/Sound 是 Cutscene 同构静态行，adapter 即可承载。DK1（frame 抽取等价门禁）本人
    同意并复述为最大回归风险。详见下方「GLM 独立覆盖审查」。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-16）+ GLM（2026-08-16，见下方）
  - 独立证据锚点: Kimi 见其审查节；GLM 见下方「GLM 独立覆盖审查」。
  - 可证伪观察: 见各审查节末。
- counter / 分歧处理: 任一方认为诊断必须复用 Reference 公开 API、需要扩大到所有 error UI、或会改变业务数据时，
  保持 draft/blocked，先更新边界与用户可见 `before -> after`，旧签字失效。
- 缺签豁免: N/A
- build 准入结论: **conditionally allowed（2026-08-16）——Codex + Kimi（DK1）+ GLM（DK2）三方签字
  齐；Codex 进 build 前必须先把 DK2 的 inventory 扩面落进审计表/页面适配/验收/boundary/测试矩阵
  （Cutscene 同构机械扩展），并经 Kimi 轻量确认或用户豁免后 Status 方可转 build。**

#### Kimi 独立反证审查（2026-08-16，架构/视觉主审；本人一手读码）

**「共享 locator frame、分离公开语义」判断 ✓：**
- DsReferenceRow 现行结构（recipes.tsx:288-364：labels/title/detail/path/reason + trailing +
  a/button/article 三根）与诊断所需（severity tag/message/detail=code/path=evidence/trailing）
  几何同构；抽中性 frame 后 Reference 的 blocking/occurrence 合同与 Diagnostic 的
  severity/finding 合同各自公开演进，互不污染。
- 卡文过渡条款正确：若抽取放大风险可先共享 CSS anatomy，但 build 结束必须单一 geometry owner，
  不接受 `.ds-reference-row` 整段复制。

**六项压力测试：**
1. **152 条密度 ✓**：保留 30/80 分页（不套 Reference 12 条）+ 单一 polite 汇总 + severity 文本
   tag + 轻 accent 替代金色整圈边框（现行 editor.css:1802-1823 待删）；正文 12px/次级 10-11px
   替代 11/9px，密度反而更健康。
2. **severity 非颜色-only ✓**：现行仅边框色 + 圆点（warn 圆点是「·」，几乎无信息）；合同要求
   错误/警告文字标签 + Panel 分级总数——真实改进。
3. **整行 action ✓**：现行每行 mini「跳转」按钮（ProjectWorkbenchTab.tsx:182-186）无行内其他
   交互，整行 button 化无嵌套冲突；Item 行 action 统一打开问题面板（:1919-1927），无 callback 时
   静态 article + 只读原因（:1929-1931 文案可直接进 status.reason）。
4. **SR alert 风险 ✓**：现行已有单一 polite 汇总（:192），无逐行 alert；合同禁止逐行 alert，
   分页回执单一 polite owner。
5. **Stamp conflict 不误判 ✓**：conflict→warning 固定，overwrite/放置动作留在行外 workflow
   （StampPlacementInspector.tsx:170-178 已核）；index key（:144,152）属瞬时 preview state
   （plan 随指针重建），卡文定位准确，不构成持久 identity 违规。
6. **Reference RF-16 回归**：缓解正确——先冻结 Reference 契约测试，frame 抽取前后逐项等价，
   RF-16 零语义变化（钉为 DK1）。

**必落钉（build 时落实，不阻塞准入）：**
- **DK1（frame 抽取等价门禁）**：抽取前冻结现有 reference 契约测试（recipes.test.tsx 的
  root/展开/长 path/焦点），抽取后 16 面 + RF-16 零 DOM/role/计数/交互变化；done 前检查
  「单一 locator geometry owner」是否达成，若停在共享 CSS 过渡态必须在 Build 节如实标注。

**可证伪观察：**
1. 若 frame 抽取改变 Reference 任一 DOM/role/focus/12 条展开合同 → 停止诊断迁移先修回归
   （DK1 门禁拦截）。
2. 若 Inspector compact 与主问题面板 full 两处同挂时出现双 live region 播报 → SR 审查抓住，
   调整为单一 live owner。
3. 若 Stamp 同一 preview 会话内 plan 重排导致行状态错乱（读码未见持久状态，plan 瞬时重建）→
   再升级 finding identity。
4. 若某纳入面必须让 design-system 读取 ProjectIssue/MigrationDiagnostic/StampPlacementIssue
   类型（读码未见——纯展示值足够）→ 公共边界错误，回 draft。

**主审立场**：建议进入 build（待 GLM 签字）。无 schema/业务/schema 变化；四面适配规则
（Project 分页 / Cutscene 静态 / Item sidecar / Stamp workflow 外行）与 typed model 逐一相容。

#### GLM 独立覆盖审查（2026-08-16，覆盖/测试；本人一手读码，非代理）

**premise verified — 四面 + 模型 + 测试盘点一手核实：**

| 卡文声称 | 本人实测 | 核对 |
|---|---|---|
| IssueList 四消费点 | ProjectWorkbenchTab.tsx:874（compact Inspector）/962（identityIssues）/1689+1696（overview/advanced 主面板） | ✓（卡文行号 :828-862,930-934,1648-1669 为 post-REFERENCE 前行号，量级一致） |
| compact 30 / full 80 分批 | :154-155 `ISSUE_PAGE_SIZE=80`、`COMPACT_ISSUE_LIMIT=30`；继续显示/显示全部/收起/查看全部四动作齐 | ✓ |
| 稳定 key + 单 polite + 微型跳转 | :174 `${code}:${path}:${message}`；:192 单一 `role="status" aria-live="polite"`；:182-186 mini「跳转」 | ✓ |
| severity 仅 `!`/`·` 图标 | :179 `project-issue-icon`，error='!' warn='·' | ✓（颜色-only + 近零信息图标属实） |
| ProjectIssue 模型可纯展示表达 | project-diagnostics.ts:35-72：severity/code union/message/path/target（稳定 id，无数组位） | ✓ |
| Stamp conflict 双皮肤 + 行外动作 | StampPlacementInspector.tsx:120-176：error/conflict 两 class、`currentValue → incomingValue`、覆盖动作在行外 workflow | ✓ |
| Item 无独立 UI 回归 | ItemTab.test 仅 4 处 `migrationSidecars: []` fixture 匹配（:721,834,962,1082），零呈现断言 | ✓（卡文自认属实） |
| 现有测试可迁移 | ProjectWorkbenchTab.test:135-158（303/80/继续/显示全部/收起/compact 查看全部）、StampPlacementInspector.test:1-126、AssetInspectorTabs.test:205-222（Cutscene 诊断 Tab） | ✓ |
| 排除面抽查 | App.tsx:2540-2552 全局 pill（跨工程摘要非 Inspector 列表）；StampLibraryTab.tsx:283 主工作区「悬空来源引用（信息）」 | ✓ 划界正确 |

**inventory 缺口（关键发现 → DK2）：**

- **Image/Sound 是被漏掉的第 5/6 个纳入面**。两者在 Inspector 引用 panel 内渲染
  `selectedIssues.map` 的 `cf-err` div 列表（ImageTab.tsx:525,744-747 / SoundTab.tsx:184,394-397），
  与已纳入的 Cutscene 诊断面**同源同构**——同一 `closureIssues` collector、同
  `${code}:${where}` key、无 locator、只有 message（CutsceneTab.tsx:422-428 对照）。按本卡口径
  （右侧 Inspector 内可枚举 finding 列表）必须纳入或显式排除并给理由；当前两者都不在审计表与
  排除表中。Music 无 selectedIssues（:230 仅 error 态），不涉。
- **cf-err 划界风险**：`cf-err` 是 9 个 TSX 文件共用的通用错误 class（预览错误、表单错误等），
  editor.css 2 处规则——boundary 不得全仓禁 cf-err，Image/Sound 迁移后其引用 panel 内的 cf-err
  诊断列表消失，但预览/表单用途保留。

**必落钉 DK2（build 前必须先落卡，不阻塞准入但先于 Status→build）：**

1. 审计表扩为 6 面：新增 Image/Sound 两行（当前结构 `cf-err` 静态 div；必须保留 closureIssues
   筛选与选中态联动；证据行号如上）。
2. 呈现位置显式决策：**建议保留在现有引用 panel 内作内联 Diagnostic 小节**（不开新 Tab）——
   开诊断 Tab 会改动 TABS 卡冻结的 24 页矩阵（image/sound 定型为「资源 / 引用 n」）并需重开
   AssetInspectorTabs 断言，得不偿失；若用户/Codex 坚持开 Tab，必须回 TABS 审计表补记录。
3. 验收/测试矩阵同步：AssetInspectorTabs.test 扩 Image/Sound 断言（closure issue 静态行 + clear
   态 + 与引用行同 panel 共存），与 Cutscene 诊断断言同文件落。
4. boundary 划界：诊断列表断言限定迁移上下文（Image/Sound 引用 panel 消费 DsDiagnosticList），
   **不禁 cf-err 通用 class**；其余私有皮肤删除清单（.project-issue*/.cutscene-diagnostic/
   .item-diagnostic/.stamp-placement-problems*）不变。
5. Kimi 对扩面做轻量确认（Cutscene 同构机械扩展）或用户豁免。

**其余核对项（无新增钉）：**

- **Stamp index key（:144,152）**：同意 Kimi 判定安全——plan 随指针移动瞬时重建、行内无持久
  状态、无交互元素，index key 仅描述瞬时 preview；卡文「不可误写成持久 identity」的钉法正确。
- **EditorLocation 不入 design-system**：现行 `ProjectIssue.target` 是稳定 id 结构，IssueList 的
  `onOpenLocation` callback 已把类型隔离在领域侧；build 时沿 REFERENCE 卡同款 purity 门禁
  （recipes 禁 import `../core/`、禁 EditorLocation/ProjectIssue 字样）即可。
- **计数语义**：finding count（去重行数）与 reference occurrence 分离正确；Project Tab「问题 n」
  exact（TABS 卡已断言 `/^问题 \d+$/`）；诊断不被 Reference 12 条折叠截断（30/80 独立策略）——
  条款齐备。
- **DK1 同意**：frame 抽取等价门禁是本卡最大回归风险；抽取前冻结 Reference 契约测试 +
  16 面 + RF-16 零变化，过渡态（仅共享 CSS）若出现必须在 Build 节如实标注。

**可证伪观察：**
1. 若 Image/Sound 的 closure issue 未来获得 locator，可平滑升级为可跳转行——不影响本合同。
2. 若引用 panel 内联诊断节导致长面板可用性问题（引用 + 诊断双列表），产品裁决开诊断 Tab →
   回 TABS 审计表补记录，不算本卡失败。
3. 若 frame 抽取使任一 Reference 面 DOM/role/focus/12 条展开变化 → DK1 拦截，先修回归。
4. 若 build 中发现第 7 个 Inspector 诊断面 → 回 draft 补 inventory（本人狩猎已覆盖
   cf-err/issue/diagnostic/问题 关键词全 UI 扫描，当前仅上述缺口）。

Evidence: ProjectWorkbenchTab.tsx:154-155,157-230,874,962,1689,1696 / project-diagnostics.ts:35-72 /
CutsceneTab.tsx:422-428,859-875 / ImageTab.tsx:525,744-747 / SoundTab.tsx:184,394-397 /
ItemTab.tsx:1909-1935 / StampPlacementInspector.tsx:120-176 / editor.css cf-err 2 处、9 文件消费 /
ProjectWorkbenchTab.test:135-158 / ItemTab.test:721,834,962,1082 / App.tsx:2540-2552 /
StampLibraryTab.tsx:283。只读审查，未改实现文件，未代签 Kimi，未标 build/done。

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## 额度 / 代班记录（如适用）

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（build 签字齐后）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 资源生成记录（如适用）

N/A：不生成图像或替代资源。

## 视觉验证记录（如适用）

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

- 2026-08-16 Codex: 用户要求新开 `ED-DIAGNOSTIC-UI-1`；完成四个 Inspector 诊断面、相邻排除项、typed model、
  CSS 和测试审计，确定“公开 Diagnostic / Reference 分离，内部 locator frame 共享”的设计。Evidence: 本卡真值矩阵、
  inventory、Canonical 设计合同。Next: Kimi 独立核 premise 并主审架构/视觉；签字前不得修改实现文件。
- 2026-08-16 Kimi: 独立 premise 反证 + 架构/视觉主审完成，签 premise verified + design agree
  （附 DK1）。一手直读四面生产 JSX + typed model + 私有 CSS：「金色墙」/9px path/颜色-only severity
  属实；六项压力测试（152 密度、severity 文本化、整行 action、SR 单 live、Stamp conflict 不误判、
  RF-16 回归门禁）全部通过；「共享 frame + 分离公开语义」判断成立。未改实现文件，未标 build/done。
  Next: GLM 覆盖/测试 build 前签字（提示词见下）。
- 2026-08-16 GLM: 覆盖/测试审查完成，签 premise verified（附 inventory 必改修正）+ design agree
  （附 DK2）。四面 premise/模型/测试盘点一手核实（IssueList 四消费点、30/80 常量、稳定 key、
  单 polite、303 测试可迁移、Item 零 UI 回归属实、排除面划界正确）；**关键发现：Image/Sound 的
  Inspector 引用 panel 内 closureIssues cf-err 列表是被漏掉的第 5/6 个纳入面**（与 Cutscene 诊断
  同源同构）——DK2 钉为 build 前必落卡（审计表扩 6 面、呈现位置建议内联引用 panel 不开新 Tab、
  AssetInspectorTabs 扩断言、cf-err 通用 class 不得全仓禁）；Stamp index key 同意 Kimi 瞬时安全
  判定；DK1 同意并为最大回归风险。未改实现文件，未代签 Kimi，未标 build/done。
  Next: Codex 先落 DK2 扩面 → Kimi 轻量确认或用户豁免 → Status 转 build。

## 下一位 Agent 提示词

### 给 Kimi（已完成）

Kimi 已于 2026-08-16 完成 premise 反证 + 架构/视觉主审并签字（premise verified + design agree，
附 DK1，见「Kimi 独立反证审查」），本节提示词不再适用。

### 给 GLM（覆盖 / 测试 build 前审查——已完成）

GLM 已于 2026-08-16 完成 build 前审查并签字（premise verified 附 inventory 修正 + design agree
附 DK2，见「GLM 独立覆盖审查」），本节提示词不再适用。

### 给 Codex（三签齐；先落 DK2 再进 build，可直接复制）

```text
接手任务: ED-DIAGNOSTIC-UI-1 属性面板问题与诊断呈现统一——DK2 落卡 + build 实现
任务卡: docs/ops/tasks/ED-DIAGNOSTIC-UI-1-inspector-diagnostic-presentation.md
当前状态: draft；三签齐（Codex + Kimi DK1 + GLM DK2），conditionally allowed。
第一步（先于任何实现）: 把 DK2 扩面落进任务卡——审计表新增 Image/Sound 两行
  （closureIssues cf-err 列表，证据 ImageTab.tsx:525,744-747 / SoundTab.tsx:184,394-397）、
  呈现位置定为引用 panel 内联 Diagnostic 小节（不开新 Tab）、验收/测试矩阵加 Image/Sound 断言
  （扩展 AssetInspectorTabs.test）、boundary 划界（cf-err 通用 class 不禁，仅断言迁移上下文消费
  DsDiagnosticList）；落卡后请 Kimi 轻量确认（或用户豁免）再转 build。
你的角色: Coding Owner——规范/RF-17 fixture → DsDiagnosticPanel/List/Row + 内部 locator frame +
  契约测试 → 四+二面迁移（Project/Cutscene/Item/Stamp + Image/Sound）→ CSS/boundary 收口 → 全量验证。
必落钉:
  Kimi DK1: frame 抽取前先冻结现有 Reference 契约测试（recipes.test root/展开/长 path/焦点），
    抽取后 16 面 + RF-16 零 DOM/role/计数/交互变化；结束必须单一 locator geometry owner，
    若停在共享 CSS 过渡态在 Build 节如实标注。
  GLM DK2: 见上；另 Image/Sound 与 Cutscene 同构静态行（无 locator 不造假跳转）。
其余红线: Project 0/1/30/80/81/152/303 分页全档；severity 文字标签非颜色-only；不逐行 alert；
  单一 live region；Stamp conflict 固定 warning 且覆盖动作留行外；Item sidecar 语义不变；
  design-system 禁 import ProjectIssue/MigrationDiagnostic/StampPlacementIssue/EditorLocation
  （沿 REFERENCE 卡 purity 门禁）；私有皮肤 .project-issue*/.cutscene-diagnostic/.item-diagnostic/
  .stamp-placement-problems* 零残留；30/80 分页不套 Reference 12 条；pnpm typecheck/test/
  相关 focused Vitest + 1280/900/720 + 等效 200% 视口。
不要做: 不与 ED-CATALOG-CONTROLS-1 并行改重叠文件；不 reset 用户脏树；不造 variant="diagnostic"
  于 Reference、不建领域大联合类型。
完成后: 写 Build 记录并自验，交 Kimi/GLM done 前复审。
```
