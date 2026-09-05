# ED-CATALOG-CONTROLS-1 - 编辑器全局目录筛选区统一

Status: done
Owner: Codex
Reviewer: Kimi（架构 / 视觉）+ GLM（覆盖 / 测试）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Visual Verification Timing: dev-functional

## 目标

以场景、地图和战斗目录当前已经采用的紧凑尺寸为视觉输入，建立唯一的 `DsCatalogControls` 目录控制区，统一
列表标题、数量、创建/更多动作、搜索、单项/多项筛选、二级分类/来源/用途筛选及其与列表正文之间的边界。
完成当前 canonical 的 8 模块 / 24 二级页全量审计与迁移，不把瓦片集、组合库、指令手册和精灵库四个首批页面
冒充全局完成；不改变筛选结果、选择、深链、撤销重做或任何业务数据。

## 范围

- 在 `packages/editor/src/ui/design-system/recipes.tsx` 新增唯一 `DsCatalogControls` recipe：内部复用
  `DsListHeader` 与 `DsCatalogFilter`，由共享 CSS 拥有标题后控制区的 padding、gap、border、`min-width: 0`、
  搜索全宽、多个筛选器自适应列与窄宽换行。
- canonical props/slots：列表标题、总数、单位、标题动作/更多动作；可选搜索 props；可选 full-row scope slot
  （图像类型、精灵领域等真正的结构切换）；可选筛选控件 slots（分类、来源、用途、能力等）。不提供 legacy
  class、embedded/private variant 或两套搜索 API。
- 搜索始终由 recipe 渲染 compact `DsCatalogFilter`；筛选 slots 只能消费共享 `DsSelect`、`DsTabs` 或其他
  已批准 design-system control，业务页不得放 raw `<input>/<select>` 或自画 button chips。
- 一个筛选器占满可用宽度；两个或更多使用 CSS grid `auto-fit/minmax`（或等价纯 CSS 合同）按容器可用宽度换行；
  不用 JavaScript 测量，不压缩中文，不制造横向滚动。搜索和所有控件必须 `box-sizing: border-box; width: 100%;
  min-width: 0`，focus ring 在侧栏边缘仍完整可见。
- 无搜索、scope 和筛选器时不渲染空控制区；已有 `DsListHeader` 且无任何目录控制的短页可以不机械包一层，
  但必须保留在 inventory 中说明理由。
- 当前 canonical 搜索/筛选目录全部迁入；清理对应私有搜索图标、输入/select/chip 皮肤和页面级 focus 规则。
- 保留现有过滤条件、默认值、结果集合、被过滤选择不偷换、创建/导入动作、深链、undo/redo 和目录选择语义。
- 不改 content schema、save/migration、asset pipeline、Reforge runtime 或项目数据；不处理 Inspector Tab；不扩展
  本批目录以外的全局 raw select 债务。
- 所有当前工作树改动均属用户。Coding Owner 必须在 build 前逐文件重读，只作最小增量，不 reset、checkout、
  restore、整文件重写、全库格式化或整理无关 diff。

## 现有任务卡覆盖判断

- `ED-DS-1` 冻结规范，不实现生产业务迁移；`editor-design-system-v1.md:690-710` 明确模块采用另开 rollout 卡。
- `ED-DS-2` 只授权基础 primitives/recipes、Design Lab 和应用壳，且明确“不在本卡重排 Actor、Image、Battle、
  Scene、Item 等业务内容 JSX，逐模块迁移留给后续任务”（`ED-DS-2-editor-design-system-foundation.md:14-68`）。
- `ED-AUDIT-2` 只做 24 页审计和批次规划，明确“不在本卡批量改业务实现”
  （`ED-AUDIT-2-editor-systematic-audit.md:10-23`）。
- 本任务新增跨 17 个生产组件消费的共享 recipe 公共 props，并改变这些页面的可见目录结构；旧卡的
  premise/design 签字不覆盖该 `before -> after`。因此必须新开 lite 卡并重新走 Codex/Kimi/GLM build 前三签。

## 前提真值门

### 一句话行为 / 工程前提

当前二阶段已有统一列表头、搜索输入和选择控件，但生产目录仍把这些 primitive 逐页用私有 wrapper/CSS 拼装；
将当前 canonical 目录迁入一个只负责布局和溢出合同的共享 recipe，可以统一视觉与无障碍，而无需改变任何筛选
或选择状态 owner。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：1995 游戏没有现代作者编辑器或左侧目录筛选交互，不能提供本任务 UI 真值。 | `docs/phase2/READ-FIRST.md:8-11,20-22` |
| 第一阶段 | N/A：第一阶段约束运行时忠实还原，不定义第二阶段作者工具的目录结构；本任务不改游戏机制。 | `CLAUDE.md:5-17`; `docs/phase2/READ-FIRST.md:20-22,33-35` |
| 当前二阶段 | `DsListHeader` 已统一标题/数量/动作，`DsCatalogFilter` 已统一 compact 搜索壳，`DsTextInput`/`DsSelect` 已有 full-width/min-width/focus 合同；Map/Skill/Enemy/Poison/BattleField 已消费共享搜索壳。与此同时 Tileset/Stamp/Event/WorldSprite/BattleSprite 及 Item/Image/Music/Sound/Cutscene/Vars/CanonicalSharedScript 仍存在 raw search/select、私有 wrapper、button chips 和多套 focus/尺寸 CSS。 | `controls.tsx:256-274,1131-1209`; `recipes.tsx:131-143`; `primitives.css:310-449,876-1011`; `recipes.css:454-465`; `MapMode.tsx:2794-2854`; `SkillTab.tsx:888-915`; `EnemyTab.tsx:679-720`; `PoisonTab.tsx:361-394`; `BattleFieldTab.tsx:228-274`; 逐页证据见 inventory |
| 本任务目标 | 当前 canonical 目录只保留 `DsListHeader + DsCatalogControls + shared controls` 一套结构；搜索全宽、筛选自适应换行、无 focus 裁切/横滚，业务筛选和选择结果不变。 | 用户 2026-08-16 本轮目标与测试/视觉矩阵；`editor-design-system-v1.md:326-389,553-590,660-679` |

### 当前 before -> 目标 after

`共享 primitive + 十余套页面私有 wrapper/尺寸/focus/换行 -> 唯一 DsCatalogControls 布局合同 + 页面只提供状态与筛选 slots`。

代表场景：把左侧面板缩到允许的最窄宽度，在组合库中同时显示搜索、分类和来源。搜索完整占满一行；两个筛选
按可用宽度并排或自动换行；focus ring 不越界；列表 `scrollWidth <= clientWidth`；切换筛选后的结果、当前选择和
深链与迁移前一致。

### 最强替代解释 / 什么观察会推翻前提

- 最强替代解释 1：只把四个已点名页面的 CSS 调成和地图页相似即可。反证：Item、Image、Music、Sound、
  Cutscene、Vars、CanonicalSharedScript 也在各自拼搜索壳；只改四页会立即保留同类漂移源。
- 最强替代解释 2：直接在 `.in`、`.kind-filter`、`.music-search-field` 等旧 class 上加一组全局规则更小。
  反证：页面仍各自拥有 DOM、图标、label、focus 和响应式排列，无法由组件契约或边界测试阻止回流。
- 最强替代解释 3：把全部原生 input/select 一起迁掉更彻底。反证：本任务只授权目录筛选区域；表单、脚本编辑器、
  media 上传 input 等有不同语义和 owner，混入会扩大行为风险并与其他迁移卡冲突。
- 推翻前提的观察：若当前正式路由不再调用 inventory 中某组件，或某个目录筛选无法在不改变其筛选结果/选择
  状态的前提下由 slot 表达，则该页必须回到 draft 分类并重新签字；不得在 build 中新增页面私有 variant。

### 是否主动偏离已核真值

yes，且用户已于 2026-08-16 明确裁决：目录控制区从页面私有排列迁为共享结构；筛选和选择业务语义保持不变。

## 全量 inventory（当前工作树，2026-08-16）

判定口径：以 `editor-navigation.ts:67-268` 的 8 模块 / 24 二级页为正式路由；asset/sprite 的 world/battle 两套
真实实现分别审计。`已共享`只表示当前符合本任务边界，不表示整页设计系统已迁完。

| 模块 / 页面 | 当前目录控制 | 风险 / 判定 | 本批动作 |
|---|---|---|---|
| scene / workspace | `DsListHeader` + compact searchable `DsSelect` 切换场景；无文本过滤 | 当前视觉基准；选择器是对象切换而非过滤，已 full-width/min-width | 保持，不为新 recipe 改业务选择结构；防回归参照 `App.tsx:1893-1932` |
| scene / ambience | `DsListHeader`；无搜索/筛选 | 短说明 + 主表，没有目录过滤需求 | 无需迁移；理由见 `AmbienceTab.tsx:49-75` |
| map / workspace | `DsListHeader + DsCatalogFilter` | 当前视觉基准，但 header/search 尚未由一个 recipe 共同拥有 spacing/border | 迁入 `DsCatalogControls`; `MapMode.tsx:2794-2854` |
| map / tileset | shared header；raw search、raw category select、私有图标/高度/focus | 点名问题；30px search、28px select、11px label 与共享控件不一致 | 迁移搜索 + `DsSelect`; `TilesetTab.tsx:465-515`; CSS `:3646-3702` |
| map / stamp | shared header；raw search + category/origin selects；私有 9/10px 密度 | 点名问题；固定双列和极小字号在窄面板/zoom 下风险最高 | 迁移搜索 + 两个 `DsSelect`; `StampLibraryTab.tsx:297-346`; CSS `:4232-4298` |
| story / scripts | canonical shared header；raw search + 私有 toolbar | current canonical 仍没有程序化 search label；private wrapper | 迁移 canonical `CanonicalSharedScriptTabV5.tsx:264-304`; legacy fallback 单列说明见下方边界 |
| story / vars | shared header；raw、无 label 搜索 | 可访问名称缺失，直接占 outliner 宽度 | 迁移；`VarsTab.tsx:95-112` |
| story / events | shared header；raw、无 label 搜索 | 用户点名横向溢出；没有 shrink-safe wrapper | 迁移并补 accessible label；`EventLibTab.tsx:33-46` |
| actor / workspace | `DsListHeader + DsCatalogRow`；无搜索/筛选 | 已共享且列表当前很短；创建表单不是目录筛选 | 无需迁移；`ActorMode.tsx:296-399` |
| item / item | shared header；raw search + 私有能力 chips | chips 自画 border/hover/active，违反共享皮肤边界 | 迁移搜索；能力筛选改共享 `DsSelect`，值和过滤逻辑不变；`ItemTab.tsx:1078-1111` |
| item / shop | `DsListHeader + DsCatalogRow`；无筛选 | 短数字目录；没有过滤需求 | 无需迁移；`ShopTab.tsx:44-75` |
| battle / skill | `DsListHeader + DsCatalogFilter + DsCatalogRow` | 当前视觉基准 | 迁入 `DsCatalogControls`; `SkillTab.tsx:888-915` |
| battle / enemy | 同上 | 当前视觉基准 | 迁入；`EnemyTab.tsx:679-720` |
| battle / poison | shared header/filter/row，但“新建毒”另放列表底部 | 标题动作未统一，滚动时创建入口漂移 | 迁入并把现有创建 handler移入 shared header action；`PoisonTab.tsx:361-394` |
| battle / battlefield | shared header/filter/row | 当前视觉基准 | 迁入；`BattleFieldTab.tsx:228-274` |
| asset / sprite (world) | shared header；私有 domain buttons、raw search、用途 chips | 点名问题；`calc(100%-16px)`、9px legend、私有 active skin | domain 用 shared `DsTabs`，用途用 `DsSelect`，搜索迁入；`WorldSpriteLibrary.tsx:496-550`; CSS `:5449-5532,5882-5886` |
| asset / sprite (battle) | 与 world 同族私有结构 | 同一页面两套真实实现，必须同时迁移 | 同上；`BattleSpriteLibrary.tsx:1153-1200` |
| asset / image | shared header + shared `DsTabs` / `DsTextInput`，但用 music 私有 wrapper 拼装 | 控件本身共享，spacing/border/过滤区仍私有；标题计数使用过滤结果必须保留 | 迁入，类型 tabs 走 scope slot；`ImageTab.tsx:520-568`; CSS `:9204-9220` |
| asset / music | shared header；raw search + 私有搜索图标/wrapper | 重复 30px input 皮肤 | 迁移；`MusicTab.tsx:185-222`; CSS `:8144-8149,8199-8220` |
| asset / sound | 与 music 复制同一私有结构 | 同族回流源 | 迁移；`SoundTab.tsx:192-229` |
| asset / cutscene | shared header；raw search + music 图标私有结构；两类资源各有域内导入动作 | 搜索区重复；视频/帧导入属于各分组动作，不强塞成同一全局“＋” | 只迁搜索/边界；保留域内动作语义；`CutsceneTab.tsx:569-621`; CSS `:8410-8426` |
| project / overview | shared header；固定摘要，无过滤 | 非对象目录，不需要搜索 | 无需迁移；`ProjectWorkbenchTab.tsx:1489-1535` |
| project / startup | shared header；固定 4 组用途摘要 | 非可筛选对象目录 | 无需迁移；`ProjectWorkbenchTab.tsx:1283-1314` |
| project / entrypoint | shared header/actions/rows；无过滤 | 入口数量低且选择结构已共享 | 无需迁移；`ProjectWorkbenchTab.tsx:1023-1066` |
| project / advanced | shared header；问题列表，无过滤 | 诊断面板而非目录筛选 | 无需迁移；与 overview 共用 `ProjectWorkbenchTab.tsx:1489-1535` |

### 邻接但不属于正式左侧目录的控制

- `MapStampPalette.tsx:67-97` 是地图主工作区内的临时组合 palette，不是 24 个路由页的左侧 outliner。本卡不把
  它塞进带 `DsListHeader` 的目录 recipe；它的 raw search/select 已以 `ED-MAP-PALETTE-CONTROLS-1` 登记在
  `docs/ops/board.md`，本卡不得新增同类样式。若 Kimi/GLM 认为“全局目录”必须含它，应在 build 前签字中明确
  扩 scope，不能边做边加。
- `CanonicalScriptEditorV5.tsx` 的“插入指令”搜索、NamedIdPicker、各资源 picker、Inspector 和表单字段不是
  shell 左侧目录，本卡不迁。
- `SharedScriptTab.tsx:460-518` 是非 canonical fallback，仍有私有 tab/search；开发期旧版本清理归现有
  canonical cleanup 调用域。本卡不为它新增兼容样式或第二套 API，也不把其存在冒充 current canonical 完成。
- MissingEditorTarget、DataMode 未实现占位是瞬时错误/占位状态，不是目录页。

## 设计与覆盖方案

### Canonical API / DOM

~~~tsx
<DsCatalogControls
  title="组合库"
  count={stamps.length}
  unit="项"
  search={{
    'aria-label': '搜索组合模板',
    placeholder: '搜索名称、ID 或瓦片集…',
    value: query,
    onChange: handleQuery,
  }}
  filters={[
    <DsSelect key="category" size="compact" aria-label="筛选组合分类" {...categoryProps} />,
    <DsSelect key="origin" size="compact" aria-label="筛选组合来源" {...originProps} />,
  ]}
/>
~~~

- `DsCatalogControls` 直接组合现有 `DsListHeader`；不复制其按钮、数量和 overflow DOM。
- `search` 是唯一目录搜索入口，内部固定渲染 compact `DsCatalogFilter`。业务页只传原有 state/handler/文案。
- `scope` 是可选 full-row slot，只允许真正的目录域/类型切换（world/battle、图像类型）；使用共享 `DsTabs`。
- `filters` 是可选、带 stable key 的共享 control slots。recipe 只管布局，不读取或修改筛选状态。
- DOM 顺序：header -> optional scope -> optional search -> optional filter grid -> list body。若某页现有顺序不同，
  只改变可见排列，不改变事件 handler、默认值或结果；Kimi 必须确认 sprite/image 的次序可接受。
- 无 scope/search/filters 时不渲染 `.ds-catalog-controls__body`；没有 filters 时不渲染
  `.ds-catalog-controls__filters`。
- `.ds-catalog-filter` 的外边距/padding 收归新 recipe；本批同时迁完现有五个直接消费者，不保留 standalone/private
  spacing 两套 API。组件仍只负责输入壳，不拥有业务状态。

### CSS 合同

- `.ds-catalog-controls` / `__body` / `__scope` / `__search` / `__filters` 是唯一目录控制布局 class。
- body `box-sizing:border-box; width:100%; min-width:0; flex:0 0 auto;`，使用 token padding/gap/border。
- search 和 control slot 根都 `min-width:0`; search 必须 `width:100%`。focus ring 的正 outline-offset 必须由共享
  容器 padding 留出空间，不用 outliner `overflow-x:hidden` 掩盖。
- filter grid 使用纯 CSS 自适应；一个 child 100%，两个及以上按 min column width 换行。不得写按页面命名的
  breakpoint 或固定 `repeat(2)`。
- 业务 CSS 只保留列表/缩略图/领域内容布局；删除本卡列出的搜索图标、input/select/chip skin 与 focus rules。

### 本批预计修改文件

- Shared：`packages/editor/src/ui/design-system/recipes.tsx`、`recipes.css`、`recipes.test.tsx`、
  `boundary.test.ts`；只有证明确有 primitive 缺口时才改 `controls.tsx/primitives.css`，不得另建第二组件。
- 生产迁移（17）：`MapMode.tsx`、`TilesetTab.tsx`、`StampLibraryTab.tsx`、
  `CanonicalSharedScriptTabV5.tsx`、`VarsTab.tsx`、`EventLibTab.tsx`、`ItemTab.tsx`、`SkillTab.tsx`、
  `EnemyTab.tsx`、`PoisonTab.tsx`、`BattleFieldTab.tsx`、`WorldSpriteLibrary.tsx`、
  `BattleSpriteLibrary.tsx`、`ImageTab.tsx`、`MusicTab.tsx`、`SoundTab.tsx`、`CutsceneTab.tsx`。
- CSS：`packages/editor/src/ui/editor.css`，只删除被 shared recipe/control 替代的私有皮肤；领域列表/预览布局保留。
- 现有页面测试：`MapMode.test.tsx`、`TilesetTab.test.tsx`、`StampLibraryTab.test.tsx`、
  `CanonicalSharedScriptTabV5.test.tsx`、`ItemTab.test.tsx`、`SkillTab.test.tsx`、`EnemyTab.test.tsx`、
  `PoisonTab.test.tsx`、`BattleFieldTab.test.tsx`、`WorldSpriteLibrary.test.tsx`、`BattleSpriteLibrary.test.tsx`。
- 新增/补齐渲染测试：EventLib、Vars、Image、Music、Sound、Cutscene；最终文件名按现有 Vitest 约定，不引入新库。

### 必须删除的私有样式 / selector

- Tileset：`.tileset-library-tools`、`.tileset-search-field`、`.tileset-search-icon`、
  `.tileset-category-filter` 及对应 input/focus skin。
- Stamp：`.stamp-library-tools`、`.stamp-search-field`、`.stamp-search-icon`、`.stamp-filter-grid` 的通用控件皮肤；
  只在真实领域列表需要时保留非控件布局。
- Sprite：`.battle-sprite-filter`、`.kind-filter`、`.sprite-domain-switch` 及 button/legend active skin。
- Asset：`.music-library-tools`、`.music-search-field`、`.music-search-icon`、`.cutscene-search` 中仅服务搜索壳的规则；
  `.image-kind-tabs` 的私有 filter layout。
- Item：`.item-catalog-tools`、`.item-filter-chips` 及 button hover/active skin。
- Canonical scripts：`.canonical-shared-script-outliner .shared-toolbar` 中仅服务 raw 搜索的规则。
- 测试中的 `.battle-sprite-filter`、`.kind-filter`、`.item-filter-chips` 私有 selector 改用 accessible role/name。

## 验证

### Shared component / static gate

1. `DsCatalogControls` 渲染 `DsListHeader` 的标题、数量、创建和更多动作；handler 每次只触发一次。
2. 搜索为 compact shared input，完整占据可用宽度；CSS contract 明确 `width:100%/min-width:0/box-sizing`。
3. 一个、两个、三个以上 filter slots 的 DOM 和 CSS grid contract；窄宽换行不靠 JS。
4. 无 scope/search/filter 时不渲染 body；只有 search 时不渲染空 filters 容器。
5. 搜索、scope 和每个 filter 均能通过 accessible name 查询；icon action 有 label/tooltip。
6. Boundary：17 个迁移组件必须消费 `DsCatalogControls`；迁移目录不得出现目录 raw search input/select、
   `.xxx-search/.xxx-filter input` 私有皮肤或已删除 selector；基准页不得退回 standalone 私有 wrapper。
7. 收紧 `boundary.test.ts` 的 raw input/select legacy ceiling，按实际删除量写精确新上限，不留回流空间；file upload、
   表单字段和非目录 picker 不误伤。

### 领域回归

- 每个有筛选的迁移页至少验证：初始全量、输入搜索、每个筛选值、组合筛选、过滤为空、当前选择不被偷换、清空
  后恢复；标题计数继续保持原先的“总数或过滤数”语义。
- Tileset/Stamp：分类/来源值、引用扫描、上传/替换/删除阻断、打开地图/瓦片集跳转不变。
- Item：能力筛选枚举与结果不变；创建、深链、引用、undo/redo 不回归。
- Sprite：world/battle domain、view/object/action 深链、用途筛选、上传和引用跳转不变。
- Image/Music/Sound/Cutscene：资源类型、搜索、导入/替换、引用禁删、选择与深链不变。
- Skill/Enemy/Poison/BattleField：创建动作、搜索结果、typed 引用阻断、试玩链接和选择不变；Poison 创建入口只移动
  到 shared header，不改变 handler。
- Story：canonical shared scripts/vars/events 搜索结果与引用跳转不变；无 label 的旧输入必须补 accessible name。

### 命令

- `pnpm --filter @type-pal/editor typecheck`
- `pnpm --filter @type-pal/editor exec vitest run <shared + affected page tests>`
- `pnpm --filter @type-pal/editor test`
- `git diff --check -- <本卡修改文件>`

按 pnpm skill：使用 workspace filter 与仓库已有 scripts；不改 lockfile、不安装依赖、无 `.npmrc` 特例。

### 浏览器最小验收

- build 完成后最后读取 `browser:control-in-app-browser` skill，再启动本地编辑器；签字前不提前制造视觉验收结论。
- 1920px、1280px、左侧面板缩到允许最窄宽度；覆盖 Tileset、Stamp、Event handbook、World/Battle sprite，另抽查
  Map baseline 与 Item/Asset 一个额外迁移页。
- 检查 `document/body/outliner/list` 的 `scrollWidth <= clientWidth`；搜索/筛选/列表正文不撑宽；focus ring 不裁切；
  compact 控件高度一致；一个 filter 铺满，两个/多个自动换行；列表仍拥有剩余高度且不坍塌。
- 逐页实际输入/切换筛选并确认结果与选择；console warning/error 为 0。记录 viewport、面板宽、元素几何、步骤和
  截图/证据路径。

## 上下文锚点

- 协作/阶段：`AGENTS.md`（跨会话非小改开卡、用户可见行为前提门、三签、单 Coding Owner、当前 canonical）；
  `CLAUDE.md`; `docs/phase2/READ-FIRST.md`; `docs/ops/agent-workflow.md`; `docs/ops/board.md`。
- 规范：`docs/phase2/specs/editor-design-system.md:326-389`（列表头/搜索/过滤）、`:553-590`
  （实现层级/primitive 边界）、`:660-679`（rollout/采用清单）。
- Foundation / audit：`ED-DS-1-editor-design-system-spec.md`; `ED-DS-2-editor-design-system-foundation.md:14-68`;
  `ED-AUDIT-2-editor-systematic-audit.md:10-23`; `ED-BATTLE-UI-1-skill-workbench-redesign.md:50-85,260-298`。
- Shared current：`packages/editor/src/ui/design-system/controls.tsx:256-274,449-620,1131-1209`;
  `recipes.tsx:64-143`; `primitives.css:310-449,876-1011`; `recipes.css:168-290,454-465`;
  `recipes.test.tsx:52-118`; `boundary.test.ts:130-191`。
- 路由/调用域：`packages/editor/src/ui/editor-navigation.ts:67-268`; `DataMode.tsx:234-634`; 逐页行号见 inventory。
- [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
  （2026-08-16 fresh fetch）：表单 accessible name、focus-visible、`min-width:0`、从源头修 overflow、优先 CSS
  responsive。只作为外部审计尺，不覆盖本项目冻结规范。
- 不得重新引入：raw 目录 search/select、placeholder-as-label、page-specific focus skin、固定双列 filter grid、
  `calc(100% - margin)` 搜索宽度、9/10/11px 目录正文、用 `overflow-x:hidden` 掩盖真实溢出、JS 测量换行、
  legacy/private component variant、Inspector Tab 改动。

## 推进签字

- build 准入:
  - Codex: **premise verified（2026-08-16）**。证据：24 页正式路由 `editor-navigation.ts:67-268`、
    DataMode production dispatch `:234-634`、shared header/filter/input/select 合同和 inventory 逐页 TSX/CSS；
    现状确有 shared/private/mixed 三种目录控制结构，额外受影响页不止用户点名四页。
    **design agree**：唯一 `DsCatalogControls` 组合现有 `DsListHeader/DsCatalogFilter`，scope/filter slots 只收
    shared controls；17 个 current canonical 生产组件同批迁移、私有 CSS/selector/legacy ceiling 同批收口；
    保持状态 owner 和业务行为，浏览器按 1920/1280/narrow 验证。
  - Kimi: **premise verified + design agree（2026-08-16，附必落钉 CK1-CK2，不阻塞准入）**。
    本人一手直读 baseline（MapMode.tsx:2794-2854、BattleFieldTab.tsx:228-274）、四个点名页
    （TilesetTab.tsx:465-515、StampLibraryTab.tsx:297-346、EventLibTab.tsx:33-46、
    WorldSpriteLibrary.tsx:496-550 + BattleSpriteLibrary.tsx:1153-1200）、三个额外迁移页
    （ItemTab.tsx:1078-1111、ImageTab.tsx:520-568、MusicTab.tsx:185-222）与 shared API/CSS
    （controls.tsx:256-274,1131-1209；recipes.tsx:64-143；recipes.css:454-465）。结论：slots 足够
    无需私有 variant、17 页清单与 GLM 复算独立互证、CSS 删除面逐项属实、MapStampPalette 排除成立
    但 debt 须落看板（CK1）。详见下方「Kimi 独立反证审查」。
  - GLM: **premise verified + design agree（2026-08-16，本人一手读码 + 独立复算，非代理；附必落钉
    GC1-GC5）**。24 页正式路由独立复算吻合（8 模块/24 二级页,本人 node 解析 editor-navigation.ts）;
    DataMode dispatch 覆盖全部 17 生产组件;raw search/select 抽查属实（Vars :102 无 label input、
    EventLib :36、Music raw+私有图标）;**测试缺口实测：Vars/EventLib/Image/Music/Cutscene 五个迁移页
    无测试文件,SoundTab.test 仅 38 行**;DsCatalogFilter/DsListHeader 已在 recipes:134/controls:1149
    存在,新 recipe 是组合不是重造。MapStampPalette/SharedScript fallback 排除判断见审查——**不使
    全局完成失真,但表述须限定为"24 个正式左侧目录页"**。详见下方「GLM 独立覆盖审查」。
  - 独立反证（至少一位非 Owner）: GLM（覆盖/测试）+ Kimi（架构/视觉）均已完成，见各自审查节。
  - 用户豁免: N/A
  - 结论: **allowed（2026-08-16）——Codex + GLM（GC1-GC5）+ Kimi（CK1-CK2）三方签字齐。
    由 Codex 按 GC1-GC5 + CK1-CK2 进 build。**

#### Kimi 独立反证审查（2026-08-16，架构/视觉主审；本人一手读码）

**问题 1 — slots 充分性 ✓（无需私有 variant）：**
- header：`DsListHeader`（controls.tsx:1149-1209）已含 title/count/unit/actions/overflowActions，
  recipe 直接组合即可，不复制 DOM。✓
- search：唯一入口，`DsCatalogFilter`（recipes.tsx:134-143）已是 compact 共享壳，
  CSS（recipes.css:454-465）已有 `width:100%/min-width:0/box-sizing/overflow:visible` 的
  focus-safe 合同。✓
- scope：sprite world/battle domain 与 image kind tabs 都是整目录域切换，full-row slot + 共享
  DsTabs 可表达；**注意**：sprite domain 切换是 URL 深联行为（DataMode.tsx:584-594,617-627 驱动
  `onSpriteLocation`/domain 参数），DsTabs 化后必须保持该深链，不得退化为内存态（回归已覆盖）。
- filters：Tileset 1 select、Stamp 2 select、Item chips→DsSelect、sprite kind chips→DsSelect——
  全部是单值枚举筛选，DsSelect 合同足够；无一页需要多选或私有控件形态。✓
- DOM 顺序 header → scope → search → filters 与 sprite（domain→search→kind）/image（kind→search）
  现有可见次序一致，同意。✓

**问题 2 — 筛选合同 ✓：** 一个筛选全宽、多个 auto-fit/minmax 纯 CSS 换行、不用 JS 测量、
focus ring 由容器 padding + `overflow:visible` 保证（现有 DsCatalogFilter 已示范）——与
DS-L/DS-IMP.2 一致；「不用 outliner overflow-x:hidden 掩盖」门禁正确。

**问题 3 — 17 页迁移清单 ✓（与 GLM 独立互证）：** 本人逐页 grep + 直读核对：5 个 baseline
（Map/Skill/Enemy/Poison/BattleField）目录区零 raw 控件、已消费共享壳；12 个迁移目标在卡文引用
行号处逐一确认 raw search/select 或私有 chips/icon/wrapper；7 个「无需迁移」页抽查
（Ambience/Shop/Actor/Project 系列）确无目录过滤需求。EventLibTab:36-41 的 placeholder-only
input（无 aria-label）是真实 a11y 缺口，迁移动机成立。

**问题 4 — MapStampPalette：排除成立。** 它是地图主工作区内的临时选择 palette
（MapStampPalette.tsx:67-97），不是 24 路由左侧目录；塞进带 DsListHeader 的目录 recipe 会混淆
两种 surface。但其 raw search/select 是同类漂移源——**CK1（必落钉）：把 map palette control
debt 写入 docs/ops/board.md 或后续任务卡号，不能只留在本卡文字里。**

**问题 5 — CSS 删除面与浏览器矩阵 ✓：** 卡文点名的私有 selector 全部在引用行号实证存在
（tileset :3646-3702、stamp :4232-4298、sprite :5449-5532,5882-5886、music :8144-8220、
cutscene :8413-8423、image :9207-9217、item :10661-10688）；ceiling 收紧按 GLM GC4 的目录 DOM
划界执行即可。浏览器矩阵（1920/1280/最窄面板 + scrollWidth≤clientWidth + focus ring + 逐页真实
输入/切换）覆盖完整。

**增量必落钉（GC1-GC5 之外）：**
- **CK1**：MapStampPalette palette control debt 落看板/后续卡号（见问题 4）。
- **CK2（BattleField 默认缺失警告的归宿）**：`BattleFieldTab.tsx:250-254` 的「缺少项目默认战场
  #024」按钮不是筛选控件——迁移时移入列表正文顶部（或既有状态位），**不得**为它给
  DsCatalogControls 增加 notice slot 或私有 variant（防 API 膨胀）。

**可证伪观察：**
1. 若某迁移页筛选无法由 slot 表达而不改状态语义（本人抽查 9 页全部可表达），该页回 draft 重签——
   卡文已有此条款，本次无需触发。
2. 若 sprite domain 的 DsTabs 化丢失 URL domain 深链（现行 DataMode.tsx:584-594,617-627），
   回归断言应抓住；抓不住则说明测试矩阵有洞，done 前补。
3. 若两 select 长中文 label 在最窄面板 + 200% zoom 下仍溢出，浏览器 scrollWidth 断言抓住——
   届时只调 minmax 最小列宽，不引入 JS 测量。

Evidence: 上述全部 file:line + 逐页 grep census（17 文件 raw input/select 计数与 shared 消费）/
DataMode.tsx:584-627 / MapStampPalette.tsx:67-97 / BattleFieldTab.tsx:250-254。
只读审查，未改实现文件，未代签 GLM，未标 build/done。

#### GLM 独立覆盖审查（2026-08-16，本人一手读码 + node 独立复算；非代理）

**标准 1 — 24 页路由独立复算（五问之 1）：**

本人用 node 正则解析 `editor-navigation.ts` 模块/subpages 结构，独立得到：
scene(workspace,ambience) / map(workspace,tileset,stamp) / story(scripts,vars,events) /
actor(workspace) / item(item,shop) / battle(skill,enemy,poison,battlefield) /
asset(sprite,image,music,sound,cutscene) / project(overview,startup,entrypoint,advanced)——
**8 模块 24 二级页，与卡文 inventory 逐项一致**。

shared/private/mixed/无需 独立分类（基于 DataMode :234-654 dispatch + 逐页抽查）：

| 分类 | 页面（复算确认） |
|---|---|
| 已共享基准（迁入 recipe） | map workspace、battle skill/enemy/poison/battlefield |
| **private/raw 须迁移** | map tileset/stamp、story scripts/vars/events、item item、asset world+battle sprite/image/music/sound/cutscene |
| 无需（无目录过滤） | scene workspace/ambience、actor workspace、item shop、project overview/startup/entrypoint/advanced |

mixed：asset image（shared 控件 + music 私有 wrapper 拼装）、story scripts（shared header + raw
search + 私有 toolbar）。**合计迁移 17 组件 = 卡文清单一致，无漏页、无多列。**

raw 抽查证实：VarsTab :102 `className="in"` 无 label input（过滤名字 placeholder 代 label）、
EventLibTab :36-41 同形态、MusicTab :185-200 raw search + 私有导入动作、MapStampPalette :70-82
raw input/select（邻接排除项属实）。

**标准 2 — 筛选 state/选择/深链/创建/引用/undo 核对（五问之 2）：**

- 筛选 state owner 全部在页面组件内（如 MusicTab query/category、ItemTab 能力 chips、
  StampLibrary query/category/origin）——设计"recipe 只管布局不读状态"与现状兼容 ✓。
- 选择/深链：DataMode 传 `focusObjectId`/`onObjectFocus`（:236-254 EnemyTab 签名可见）——
  迁移不动该链 ✓。
- 创建/导入：Music 导入（:193-198 actions）、Cutscene 分组导入、Poison 底部创建移 header——
  卡文已明确 handler 不变 ✓。
- 引用阻断/undo：本卡不触碰（Tileset/Stamp/Item/Sprite 的阻断已有各自 collector）——
  验收条件"typed 引用阻断不变"以现有测试回归保证 ✓。
- **风险点**：标题计数语义（Image 用过滤数、Vars 用 flags+vars 总数）——卡文已明确
  "保持总数或过滤数语义"，迁移时逐页对照 ✓。

**标准 3 — 缺失测试清单（五问之 3，本人 ls 实测）：**

| 组件 | 测试现状 | 需求 |
|---|---|---|
| VarsTab | **无文件** | 新建（搜索/过滤/accessible name） |
| EventLibTab | **无文件** | 新建（搜索 + 指令手册渲染） |
| ImageTab | **无文件** | 新建（类型 tabs scope/计数语义） |
| MusicTab | **无文件** | 新建（搜索/导入动作） |
| CutsceneTab | **无文件** | 新建（搜索/分组动作保留） |
| SoundTab | SoundTab.test.ts **仅 38 行** | 补齐到与迁移面匹配 |
| 其余 11 个 | 有测试 | 现有断言迁移后须绿 |

卡文"新增/补齐渲染测试：EventLib、Vars、Image、Music、Sound、Cutscene"——**Sound 列入补齐
但文件已存在（38 行）**，卡文表述"新增"不准确；实际是"5 新建 + 1 补齐"。

**标准 4 — boundary 与 raw ceiling 设计（五问之 4）：**
- 现有 boundary.test 已有 legacy checkbox bridge 模式（:96-101 splitTopLevelSelectors 逐 selector
  校验）——raw input/select ceiling 可复用同法：按文件枚举 `<input`/`<select` 出现次数上限，
  迁移后 17 页目录区为 0；file upload（Music :198 importRef、Image/Cutscene 导入）与表单/Inspector
  不在 outliner 目录 DOM 内，按"目录控制区"范围划界不误伤。
- **GC4（ceiling 精确化）**：boundary 须按"17 迁移组件的 outliner 目录 DOM 中 raw input/select
  为零"而非"整文件为零"（页面其他区域如表单仍有合法 input）；实现建议——对 17 文件的
  `<input[^>]*className="in"` / outliner 内 `<select` 做 source-scan 断言，配已删 selector
  （.tileset-search-field 等）全仓 rg 零残留。
- **GC5（五消费者收口验证）**：`.ds-catalog-filter` spacing 收归 recipe 后，现有五个直接消费者
  （Map/Skill/Enemy/Poison/BattleField）必须同批迁入——boundary 加"迁移页必须消费
  DsCatalogControls"正向断言，防半迁状态。

**标准 5 — SharedScript fallback / MapStampPalette 排除是否使"全局完成"失真（五问之 5）：**

- **SharedScriptTab :460-518 fallback**：本人核 SharedScriptTab.tsx 仍存在 raw input（:507,:906）;
  但它是非 canonical fallback（canonical 是 CanonicalSharedScriptTabV5）,DataMode dispatch 只调
  canonical。**排除正确**——为 fallback 新增兼容样式会违反"不留长期兼容分支"铁律。表述建议：
  完成声明限定为"24 个正式路由左侧目录页 current canonical"而非"编辑器全局"，并注明 fallback
  按现有 canonical cleanup 调用域另行清理。
- **MapStampPalette :67-97**：本人核 raw input/select 属实（:70-82）;但它是地图主工作区内的
  临时 palette，不在 24 路由 outliner 体系。**排除正确**——塞入带 DsListHeader 的目录 recipe 会
  混淆结构。已登记为后续 debt 且"本卡不得新增同类样式"约束合理。若扩 scope 需 Kimi/用户明确。
- **结论：不使完成失真，前提是表述精确限定为"24 正式路由目录页"**——卡文目标已如此限定 ✓。

**必落钉 GC1-GC5（build 必落）：**
- **GC1（5 新建 + 1 补齐测试）**：Vars/EventLib/Image/Music/Cutscene 五个测试文件从零新建,
  SoundTab.test（38 行）补齐到迁移面;每页至少覆盖搜索/过滤/accessible name/计数语义。
- **GC2（筛选回归矩阵）**：每个有筛选的迁移页按验收条件六步（初始/输入/每值/组合/空/清空恢复+
  选择不偷换）——卡文已列,build 逐页落测试而非只浏览器。
- **GC3（accessible name 补齐验证）**：Vars/EventLib 现状无 label input——迁移后 aria-label 必须
  存在且有契约断言（现状违规即迁移驱动修复的验收证据）。
- **GC4（ceiling 按目录 DOM 划界）**：boundary 的 raw input/select 上限按"17 文件 outliner
  目录 DOM 为零"精确化,不误伤 upload/表单/Inspector;已删 selector 全仓 rg 零残留。
- **GC5（五消费者同批正向断言）**：Map/Skill/Enemy/Poison/BattleField 五个现有 DsCatalogFilter
  直接消费者必须同批迁入 DsCatalogControls;boundary 加正向消费断言防半迁。

**可证伪观察：**
① 若 DataMode dispatch 存在 24 页之外的正式路由消费（本人核对 :234-654 的 tab 分发与
  editor-navigation 24 subpage 一致;若 build 时发现第 25 页）,inventory 漏页——回 draft。
② 若某页筛选无法由 slot 表达而不改结果（如 Item 能力 chips 的多选语义需 DsMultiSelect 而非
  DsSelect）,须停线重估——卡文"值和过滤逻辑不变"是硬约束。
③ 若五消费者迁移后 `.ds-catalog-filter` standalone API 仍有调用（半迁）,GC5 正向断言拦截。
④ 若 ceiling 误伤 upload input（Music :198 importRef hidden input）,GC4 目录 DOM 划界修正。

Evidence: editor-navigation.ts node 解析 8 模块/24 页 / DataMode.tsx:30-50 imports + :234-394
dispatch 逐组件 / VarsTab :95-112 raw input / EventLibTab :33-46 / MusicTab :185-222 /
MapStampPalette :70-82 raw / SharedScriptTab :460-518 fallback raw / recipes.tsx:134
DsCatalogFilter / controls.tsx:1131-1209 DsListHeader / boundary.test :16-101 现有模式 /
ls 17 测试文件（5 无 + Sound 38 行）。只读审查,未改实现文件,未代签 Kimi,未标 build/done。
- done 准入:
  - Codex: **accept（2026-08-16）**。`DsCatalogControls` 复用既有 header/search primitives；17 个
    current-canonical 目录全部迁入，GC1-GC5、CK1-CK2 均落地；筛选状态/选择/深链/计数继续由领域持有。
    Evidence: focused 19 files / 184 tests、editor full 124 files / 912 tests、typecheck、Vite production build、
    `git diff --check` 全绿；浏览器 1920/1280/min-193px 几何与交互通过，console warning/error 0。
  - Kimi: **accept（2026-08-16；先 counter 仅 RK-A，RK-A 经提交 0817317a 闭环后按预审承诺转 accept）**。
    done 前架构/视觉复审（本人一手读码 + Chromium 实机，见下方「Kimi 独立复审（done 前）」）：
    DsCatalogControls 唯一合同、17 页消费、CK2、sprite URL 深链、GC3/GC4/GC5 boundary 形态、
    typecheck/912 tests 复跑与浏览器几何全部通过；唯一返工 RK-A（CK1 看板补录）经 Codex 提交 0817317a
    落地——board.md:25 新增 ED-MAP-PALETTE-CONTROLS-1（draft/待排期、范围表述正确）、本卡「邻接控制」
    段已关联该 ID、build 日志失实表述已修正并追记 RK-A 闭环记录。本席 2026-08-16 复核上述三处属实，
    RK-A 闭环，转 accept。
  - GLM: **accept（2026-08-16 done 前覆盖/测试复审，本人一手读码 + 独立复跑，非代理；基于实现提交
    bb89c95e + follow-up 6f9d6379/0d7d875f）**。GC1-GC5 逐钉在当前树独立验证通过：
    - **GC1（5 新建 + 1 补齐）✓**：VarsTab.test（52 行）/ EventLibTab.test（41）/ ImageTab.test
      （81）/ MusicTab.test（63）/ CutsceneTab.test（63）五个从零新建；SoundTab.test.ts 38→104 行
      补齐——六文件全部存在且有实质断言。
    - **GC2（六步矩阵）✓**：catalog-controls-test-utils.ts 提供 catalogControlsEditorState/
      setCatalogSearch 共享 helper；ImageTab.test 抽样逐字核过——初始计数（2 项）→ 搜索输入（次要→
      1 项）→ 空（不存在→0 项）→ 清空恢复且**选择不偷换**（data-selected 仍为原选中「主要立绘」）→
      四个 scope 值逐一切换各有计数断言；计数语义为过滤数。
    - **GC3（accessible name）✓**：VarsTab:102「过滤变量名字」/ EventLibTab:40「搜索指令手册」
      aria-label 落地，页测试以 `input[aria-label=…]` accessible 查询断言。
    - **GC4（ceiling 精确化）✓**：boundary raw ceiling 收紧为**精确等值断言**（input 199 / select 123 /
      label 205，`toBe` 零回流空间）；目录 DOM 段落划界（每文件截取 `<DsCatalogControls` 到闭合标签
      的源码段断言无 raw `input|select`）——upload/表单/Inspector 不误伤，Music importRef 等保留。
    - **GC5（五消费者同批）✓**：生产码 standalone `DsCatalogFilter` 零命中；恰 17 个业务文件消费
      DsCatalogControls（本人 rg 实测 17 业务 + 1 定义处 = 18，无多无少）；boundary 正反双断言
      （必须 DsCatalogControls、禁止退回 DsCatalogFilter）。
    - **回归独立复跑**：focused（6 页测试 + utils + recipes/boundary）8 files/48 tests、editor
      typecheck、全量 124 files/912 tests 全绿（与 Codex/Kimi 声明计数一致）。
    - 备注：follow-up 两提交（6f9d6379/0d7d875f，App.tsx scene layer toggles/rows）不在本卡 17 文件
      范围内，属卡外视觉修正；全量绿下共存，已如实登记不归本卡。
  - GLM 对 Kimi counter 的表态：**同感 RK-A**——本人复核当前 board.md 仍无 MapStampPalette debt
    行、docs/ops/tasks/ 无对应卡，CK1 确未落地，build 日志「已落看板」表述与实际不符。RK-A 为纯文档
    补录，不涉及实现；本席 accept 不受其影响，但 done 关卡在 Kimi 转 accept（RK-A 落地后）+ 用户
    验收前保持 blocked。
  - 用户豁免: N/A
  - 用户验收: **accept（2026-08-16）**。用户明确回复“验收通过”。
  - 结论: **done 准入满足——Codex + GLM + Kimi 三方 accept 与用户验收齐（2026-08-16）。**

#### Kimi 独立复审（done 前，2026-08-16；本人一手读码 + Chromium 实机）

**逐项核验（除 RK-A 外全部通过）：**

1. **唯一合同 / 无 API 膨胀 ✓**：`DsCatalogControls`（recipes.tsx:159-197）只组合 `DsListHeader` +
   `search`（内部固定 compact DsCatalogFilter）+ `scope`/`filters` slots + `className`；无 variant、
   无 notice slot、无第二套搜索 API；DOM 顺序 header→scope→search→filters 与 DS-C.4a 一致；无
   scope/search/filters 时不渲染 body（:173,178）。17 个生产组件各恰 2 处引用（import+usage），全仓
   无 standalone `DsCatalogFilter` 消费残留（GC5 收口成立）。
2. **CSS 合同 ✓**：recipes.css 中 `__body` 具备 `box-sizing/width:100%/min-width:0/padding`，
   `__filters` 为 `repeat(auto-fit, minmax(min(100%, 9rem), 1fr))` 纯 CSS 换行；boundary.test.ts
   :171-249 同时钉死：17 文件正向消费 `DsCatalogControls`、退回 standalone `DsCatalogFilter`/
   `DsListHeader` 禁止、recipe JSX 边界内 raw `input/select` 为零、19 个已删 selector 在 editor.css
   零命中、全局 raw ceiling 精确化为 199/123/8/205。GC4 按目录 DOM 划界（逐文件取
   `<DsCatalogControls` 到自闭合标签源码段断言）不误伤表单/upload input。
3. **CK2 ✓**：`bf-default-warning` 留在 DsCatalogControls 之后的列表正文顶部
   （BattleFieldTab.tsx diff :245-252），recipe 未加 notice slot/variant。
4. **sprite URL 深链 ✓**：world/battle 域切换改共享 `DsTabs`（WorldSpriteLibrary scope slot、
   BattleSpriteLibrary.tsx:1155-1164），onChange → `onBattleDomain`/`onWorldDomain` →
   DataMode.tsx:584-594,617-627 → App.tsx:1862-1873 写 `domain` 进 URL；实机 round trip
   `domain=world`→`battle`→`world` 均反映到地址栏；WorldSpriteLibrary.test.tsx:217-226 有断言。
5. **GC3 ✓**：VarsTab/EventLibTab 搜索补 `aria-label`（"过滤变量名字"/"搜索指令手册"），且
   VarsTab.test.tsx:38、EventLibTab.test.tsx:30 按 accessible name 查询断言。
6. **自动化复跑 ✓**（本席实测当前树 bb89c95e）：editor typecheck passed；editor test
   **124 files / 912 passed**，与 Codex 声明计数一致。
7. **浏览器独立抽查 ✓**（Chromium，当前树 dev server）：Stamp 左栏 193px 下两个筛选各 169px 分两行
   换行、搜索满宽、outliner/页面零横向溢出；搜索 focus ring 2px outline + 2px offset，距容器边缘左右
   各 12px 不裁切；Tileset 1920px 单筛选满宽一行，搜索输入 223→"没有匹配的瓦片集。"空提示→清空恢复
   223（DS-C.4 空过滤提示成立）；Event 手册 accessible name 实机确认；全程 console error/warn 为 0；
   Codex 五张截图证据文件（/tmp/type-pal-ed-catalog-controls-1/）实测存在。本席认为 Codex 的
   1920/1280/min-193 证据充分，无需补验。

**返工项：**

- **RK-A（唯一，CK1 看板补录）**：把 MapStampPalette palette control debt 写入 `docs/ops/board.md`
  （或新建后续任务卡并在看板登记卡号）。当前 board.md 无该行、docs/ops/tasks/ 无对应卡，debt 只存在
  于本卡文字——正是 CK1 禁止的形态；build 交接日志"MapStampPalette debt 已落看板"与实际不符，须一并
  修正表述或补实际条目。纯文档改动，落地后本席转 accept。

Evidence: recipes.tsx:159-197 / recipes.css（ds-catalog-controls 块）/ boundary.test.ts:135-249 /
BattleFieldTab.tsx:228-252 / WorldSpriteLibrary.tsx（scope slot）/ BattleSpriteLibrary.tsx:1155-1164 /
DataMode.tsx:584-627 / App.tsx:1862-1873 / VarsTab.tsx:97-108 / EventLibTab.tsx:35-46 /
VarsTab.test.tsx:38 / EventLibTab.test.tsx:30 / WorldSpriteLibrary.test.tsx:217-226 /
docs/ops/board.md 全文（无 palette debt 行）/ Chromium 实机（Stamp 193px、Tileset 1920px、sprite
domain round trip、Event 手册）+ /tmp 截图文件清单。只读审查，未改实现文件，未代签 GLM，未标 done。

## 交接

- 2026-08-16 Codex: 完整读取协作/阶段/设计系统文档、ED-DS/ED-AUDIT/ED-BATTLE/Inspector 邻接卡，fresh
  web guidelines 与 pnpm skill；确认 ED-DS-2/ED-AUDIT-2 不授权本次业务迁移。按当前脏树完成 24 页 + 双 sprite
  implementation inventory、17 文件迁移/API/CSS/测试/浏览器方案；只新增本卡和看板行，未改实现、未跑测试或
  浏览器。Evidence: 本卡覆盖判断、前提矩阵、inventory。Next: Kimi/GLM 独立 build 前审查。


- 2026-08-16 GLM: 覆盖/测试审查签 premise verified + design agree（GC1-GC5）。24 页路由独立
  node 复算吻合;17 组件迁移清单无漏无多;测试缺口实测 5 无文件 + Sound 38 行;boundary ceiling
  按目录 DOM 划界;五消费者同批正向断言;SharedScript fallback/MapStampPalette 排除正确,
  完成表述限定"24 正式路由目录页"。等待 Kimi 架构签字。
- 2026-08-16 Kimi: 架构/视觉审查签 premise verified + design agree（CK1-CK2）。一手直读 2 个
  baseline + 4 个点名页 + 3 个抽查页 + shared API/CSS;回答独立反证题——scope/filter slots 足以
  覆盖 sprite/image 无需私有 variant;DOM 顺序与 sprite/image 现有次序一致;17 页清单与 GLM 独立
  互证;MapStampPalette 排除成立但 debt 须落看板（CK1）;BattleField 默认缺失警告不放 recipe、
  移列表正文顶部（CK2）。三方签字齐,build allowed。Next: Codex 按 GC1-GC5 + CK1-CK2 进 build。
- 2026-08-16 User + Codex: 用户确认三签齐；Codex 复核三方均为 `premise verified + design agree`、
  无 `counter`，`build 准入结论: allowed`。任务转 `build`，Coding Owner 为 Codex，分支为
  `codex/ed-catalog-controls-1`；按 GC1-GC5 + CK1-CK2 串行实施。
- 2026-08-16 Codex build: 新增唯一 `DsCatalogControls`（design-system v2.4.0），组合
  `DsListHeader + DsCatalogFilter`，提供 scope/search/filter slots 与 auto-fit/minmax 窄宽合同；17 个正式目录
  全部迁入，Tileset/Stamp/Item/Sprite 的私有 raw select/chips 改共享控件，Poison 创建入口归 header，
  BattleField 默认缺失警告留列表正文；删除点名私有 CSS。当时误记“MapStampPalette debt 已落看板”，实际
  于下方 2026-08-16 Codex RK-A 条目补录为 `ED-MAP-PALETTE-CONTROLS-1`。
- 2026-08-16 Codex verification: 新建 Vars/EventLib/Image/Music/Cutscene 5 个渲染测试并补齐 Sound；其余迁移页
  增补初始/输入/每个筛选值/组合/空结果/清空恢复/选择不偷换，sprite domain 保留 URL 深链断言；boundary
  固定 raw `input/select/textarea/label = 199/123/8/205`，17 recipe 内 raw input/select 为零，旧 selector 全仓零。
  Commands: `pnpm --filter @type-pal/editor typecheck`; focused 19 files / 184 tests; full 124 files / 912 tests;
  `pnpm --filter @type-pal/editor build`; `git diff --check`，全部通过。
- 2026-08-16 Codex browser: 1920×1080、1280×800 与允许最窄 193px 左栏覆盖 Tileset、Stamp、Event、
  World/Battle sprite、Map baseline、Item；document/control/list 均 `scrollWidth <= clientWidth`，Stamp 两筛选
  在 193px 下分两行（各 169px），搜索 focus outline 2px 且左右各留 12px；world→battle URL 从
  `domain=world` 更新为 `domain=battle`。验收中发现 Map 旧 tooltip 将 outliner 撑至 211px，已局部向内锚定并
  复验为 `193/193`，未扩 recipe API。console warning/error 0。截图证据：
  `/tmp/type-pal-ed-catalog-controls-1/{tileset-1920,tileset-1280-narrow-filter,stamp-1280-narrow-wrap,world-sprite-1280-filter,battle-sprite-1280-filter}.png`。
  任务转 `review`，Codex accept；Next: Kimi 架构/视觉复审 + GLM 覆盖/测试复审，二者不得改实现或标 done。
- 2026-08-16 Kimi（架构/视觉）: done 前复审完成，签 **counter（仅 RK-A 一项）**。DsCatalogControls
  唯一合同无 variant/notice slot、17 页正向消费与 standalone filter 收口、CSS 合同与 boundary 精确
  ceiling、CK2 警告留列表正文、sprite domain URL 深链 round trip、Vars/EventLib aria-label、editor
  typecheck + 124/912 复跑、Chromium 独立抽查（Stamp 193px 换行、focus ring 12px 间隙、Tileset 1920
  搜索空提示/清空恢复、console 0）全部通过。唯一返工 RK-A：CK1 未落地——MapStampPalette control debt
  未写入 board.md 也无后续卡号，只在卡文里；build 日志"已落看板"与实际不符须修正。纯文档补录，落地后
  Kimi 直接转 accept，无需重新全面复审。未改实现文件，未代签 GLM，未标 done。
  Next: Codex 落 RK-A（看板补录）→ Kimi 转 accept；GLM done 前覆盖复审并行；三签齐后用户验收。
- 2026-08-16 GLM（覆盖/测试）: done 前复审完成并签 **accept**。GC1-GC5 逐钉当前树独立验证：五个
  测试从零新建 + SoundTab 38→104 补齐；六步筛选矩阵抽样逐字核过（含清空恢复选择不偷换 + 逐 scope
  计数）；aria-label 补齐并被 accessible 查询断言；boundary ceiling 精确等值（199/123/205）+ 目录
  DOM 段落划界不误伤 upload/表单；恰 17 业务文件消费 DsCatalogControls、standalone DsCatalogFilter
  零残留。focused 48 + typecheck + 全量 124/912 本人独立复跑全绿。**同感 Kimi RK-A**：本人复核看板
  确无 palette debt 行，CK1 未落地属实——本席 accept 不受影响，但关卡保持 blocked 至 RK-A 落地、
  Kimi 转 accept、用户验收。未改实现文件，未代签 Kimi，未标 done。
- 2026-08-16 Codex（RK-A 返工）: 已在 `docs/ops/board.md` 新增 `ED-MAP-PALETTE-CONTROLS-1`，明确
  `MapStampPalette` 的 raw search/select 后续迁入共享控件，但不得混入带 `DsListHeader` 的目录 recipe；同时
  修正 build 交接日志的失实表述。RK-A/CK1 已闭环，未改实现文件。Next: Kimi 只核对看板条目与本记录后
  直接将 counter 转 accept；无需重新全面复审，任务仍不得标 done，等待 Kimi accept + 用户验收。
- 2026-08-16 Kimi（RK-A 复核）: 逐项核对 0817317a 三处——board.md:25 `ED-MAP-PALETTE-CONTROLS-1`
  条目（draft/待排期、范围表述与 CK1 一致）、本卡「邻接控制」段已关联该 ID、build 日志失实表述已修正
  并指向补录条目——全部属实，RK-A 闭环，按预审承诺将本席 counter 转 **accept**。至此 Codex + GLM +
  Kimi 三方 accept 齐，仅剩用户实机验收。未改实现文件，未代签用户验收，未标 done。
- 2026-08-16 User + Codex（验收 / 收口）: 用户明确回复“验收通过”；Codex 复核三方 done 前 accept
  与 RK-A/CK1 闭环记录齐全，将任务从 review 转 done。实现验证沿用已独立复跑的 editor 124 files / 912
  tests、typecheck、production build 与浏览器矩阵；本次仅更新验收文档。Next: 合并 main、删除完成分支。

## 下一位 Agent 提示词

### Kimi（架构 / 视觉——已完成）

Kimi 已于 2026-08-16 完成 build 前审查并签字（premise verified + design agree，附 CK1-CK2，
见「Kimi 独立反证审查」），本节提示词不再适用。

### GLM（覆盖 / 测试）

~~~text
接手任务: ED-CATALOG-CONTROLS-1 编辑器全局目录筛选区统一
任务卡: docs/ops/archive/tasks/done/ED-CATALOG-CONTROLS-1-global-catalog-controls.md
当前状态: draft；Codex premise verified + design agree；Kimi/GLM build 前签字均 pending，不得开始实现。
你的角色: GLM，独立审查 24 页覆盖、调用域、业务回归、static ceiling 与测试矩阵并签结论。
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、
docs/phase2/specs/editor-design-system.md、ED-DS-1、ED-DS-2、ED-AUDIT-2、本任务卡；再直接读
editor-navigation.ts:67-268、DataMode.tsx:234-654、design-system recipes/controls/boundary tests、inventory
列出的 17 个 TSX 和现有测试。工作树很脏，所有既有修改属用户。
请你做:
1. 用正式路由逐项复算 shared/private/mixed/无需筛选清单，确认没有漏掉 current canonical 左目录。
2. 核对每页筛选 state owner、结果语义、选择/深链、创建/导入、引用阻断、undo/redo；找出测试文件缺口。
3. 设计精准 boundary：17 页消费 DsCatalogControls、目录 raw search/select 和私有 selector 为零；收紧 raw
   input/select ceiling 但不误伤 upload input、表单和非目录 picker。
4. 核对 focused/full test 命令和浏览器几何断言可复跑；明确 SharedScript fallback/MapStampPalette 的处置是否
   会让“全局完成”表述失真。
若同意，在任务卡签 premise verified + design agree；若不同意签 counter，列漏页/误判/测试返工项。
不要做: 不修改 packages/editor 实现/CSS/测试，不整理用户 diff，不代签 Kimi；签字不齐不得标 build/done。
输出要求: 独立覆盖矩阵、直接 file:line、可证伪观察、agree/counter 和精确测试补充；写回任务卡。
~~~

### 给 Codex（三方签齐，进 build，可直接复制）

```text
接手任务: ED-CATALOG-CONTROLS-1 编辑器全局目录筛选区统一——build 实现
任务卡: docs/ops/archive/tasks/done/ED-CATALOG-CONTROLS-1-global-catalog-controls.md
当前状态: draft;三方签字齐（Codex + GLM GC1-GC5 + Kimi CK1-CK2）;build allowed
你的角色: Coding Owner——DsCatalogControls recipe + 17 组件迁移 + CSS/测试/boundary 收口
必落钉:
  GLM GC1: 新建 Vars/EventLib/Image/Music/Cutscene 五测试文件 + SoundTab.test 补齐（38 行→迁移面）。
  GLM GC2: 每个有筛选的迁移页六步回归（初始/输入/每值/组合/空/清空+选择不偷换）落测试,不只浏览器。
  GLM GC3: Vars/EventLib 迁移后 aria-label 契约断言（现状无 label 即修复证据）。
  GLM GC4: boundary raw input/select ceiling 按"17 文件 outliner 目录 DOM 为零"划界,不误伤
    upload/表单/Inspector;已删 selector（.tileset-search-field 等）全仓 rg 零残留。
  GLM GC5: Map/Skill/Enemy/Poison/BattleField 五个 DsCatalogFilter 消费者同批迁入;boundary
    加"迁移页必须消费 DsCatalogControls"正向断言防半迁。
  Kimi CK1: MapStampPalette control debt 写入 docs/ops/board.md 或后续任务卡号,不只留在本卡文字。
  Kimi CK2: BattleFieldTab.tsx:250-254 默认缺失警告移入列表正文顶部,不为它给 recipe 加 slot/variant。
  Kimi 观察: sprite domain 的 DsTabs 化必须保持 URL domain 深链（DataMode.tsx:584-594,617-627）。
顺序: recipe+contract 测试 → 五基准页迁入（GC5）→ 12 private/raw 页迁移（含 GC3 label 补齐）→
  CSS 删除+ceiling 收紧 → 六新测试+回归 → typecheck/test → 浏览器 1920/1280/narrow。
验收红线: 筛选结果/选择/深链/undo/计数语义逐页不变;scrollWidth<=clientWidth;console 0;
  不 reset/checkout 用户脏树文件。
```

### Kimi（RK-A 复核——已完成）

Kimi 已核对 `0817317a` 的看板条目、任务卡关联和日志修正，确认 RK-A 闭环并将 counter 转为 accept。

### Codex / GLM（本阶段已完成）

Codex 已完成 RK-A 文档返工；GLM 已完成 done 前覆盖/测试复审并签 accept；Kimi 已完成 RK-A 复核并
将 counter 转为 accept。三方 done 前签字齐。

无下一位 Agent 提示词；三方 accept 与用户验收齐，执行 git 收口。
