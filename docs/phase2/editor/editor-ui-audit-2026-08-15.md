# 编辑器视觉与工作台一致性巡检（2026-08-15）

Status: rebaseline complete（2026-08-17；ED-AUDIT-2 输入；不是任一页面的 build authority）

## 1. 结论

用户不应继续逐页指出基础问题。2026-08-15 首轮看到的“三代界面语言并存”已经被后续连续任务显著收窄：
`ED-DS-2`、`ED-BATTLE-UI-1`、`ED-INSPECTOR-TABS-1`、`ED-REFERENCE-UI-1`、
`ED-DIAGNOSTIC-UI-1`、`ED-CATALOG-CONTROLS-1`、`ED-SCENE-UX-1` 与 `ED-ENEMY-1` 已把 Header、
对象 Hero、目录筛选、Inspector Tab、引用、诊断和场景直接操作建立为共享合同。当前问题不再是“整页缺设计”，而是：

1. 若干专业子面板仍绕开共享控件，其中 `MapStampPalette` 是已复现的最小缺口；
2. 长目录没有统一的生产级虚拟化合同，敌队页会一次渲染 380 个对象行；
3. 脚本、工程、资源编辑器仍保留大量 raw form 与旧按钮族，需要按领域拆卡收敛；
4. 少量图像预览缺显式尺寸，仍有可访问性与布局稳定性债。

因此不再照旧矩阵重做已经迁移的页面。后续先完成独立的小缺口，再处理跨页性能合同和旧控件存量；每张实现卡
必须保持领域语义、深链和 ED-1 七环，不允许用一次全局机械替换掩盖交互差异。

## 2. 本轮证据

- 浏览器：本地生产编辑器 `http://localhost:6010/`，Chromium CSS viewport `1280×720`；2026-08-17 追加
  `900×720`、`720×720` Map/Palette 抽验，三档均无 document/body 横向溢出、Console warning/error 为 0。
- 实机页：Skill、Actor、BattleField、Shop、Image，以及 Story scripts/vars/events、Map tileset；用户本轮
  还提供了 Header、Shop、Skill、Actor/BattleField 对照截图。
- 代码巡检：`EDITOR_MODULES` 当前登记 8 个模块、**25** 个二级页面；`enemy-team` 是首轮报告后新增的第 25 页。
  重点读取 `App.tsx`、`SkillTab.tsx`、
  `ActorMode.tsx`、`BattleFieldTab.tsx`、`ShopTab.tsx`、`ItemTab.tsx`、`ImageTab.tsx`、`EnemyTab.tsx`、
  `PoisonTab.tsx`、`ProjectWorkbenchTab.tsx`、`PanelResizeHandle.tsx` 与相应 CSS。
- 浏览器观察：Header 高 `41px`。`1280/900/720` 下 App 三栏均未产生横向溢出；地图组合 Inspector 在三档可达。
  `MapStampPalette` 实机仍呈现 raw `.in` 搜索/分类与 `.mini`“管理组合”按钮。敌队 `team-0` 页面 DOM 可见
  380 个对象按钮，和源码 `shown.map(...)` 一致，不是仅由数据规模推断的风险。
- 静态规模（2026-08-17）：Skill `1362` 行、Enemy `1258`、Poison `625`、Item `2103`、
  ProjectWorkbench `1744`、MapMode `3968`。它们不是重构理由本身，但说明不能继续在单组件内叠加页面级
  布局和领域编辑器。

### 2.1 2026-08-17 共享合同覆盖与存量账

- GA1 复核前，实际共享消费者为 `18 catalog / 17 Inspector / 17 reference / 6 diagnostic`，静态门禁却只有
  `17/15/16/6`：EnemyTeam 缺 catalog/reference 保护，Enemy 与 App 场景实体缺 Inspector 保护。review 补齐
  三处清单后，`design-system/boundary.test.ts` 已按实际消费者完整钉住 `18/17/17/6`；Skill / Enemy /
  Poison / BattleField / Actor 五个已迁对象工作台继续禁止 raw form primitive。
- 当前生产 TSX 的只减不增基线为：`input=197`、`select=122`、`textarea=8`、`label=205`、原生 checkbox `23`。
- 旧按钮类仍有：`tool=62`、`btn=43`、`mini=18`、`mini-txt=34`、`pv-btn=16`、`mini-icon=3`；
  `item-action-button` 与 `media-zoom-controls` 已归零。
- production inline `style={{...}}` 共 72 处，集中于 SpriteFrames 16、LevelCurve 12、App 9；动态坐标/尺寸
  不自动算问题，只有页面级视觉或几何常量才进入迁移卡。
- 生产 `<img>` 共 6 处；Tileset 上传预览带显式宽高，其余 5 处需在所属领域卡核对固有尺寸/CLS 合同。

### 2.2 可复现 census 口径（GA2）

唯一发布命令：

```sh
node packages/editor/scripts/audit-legacy-controls.mjs
```

脚本只扫描 `packages/editor/src/ui/**/*.tsx` production source，排除 `*.test.tsx` 与
`src/ui/design-system/**`。旧按钮类只统计 `className=` 的静态字符串、字符串模板和简单 JSX 字符串表达式；
className 匹配器与 token 词界 `(?<![\\w-])TOKEN(?![\\w-])` 和 boundary test 完全同源。当前稳定输出为：
`tool/btn/mini/mini-txt/pv-btn/mini-icon = 62/43/18/34/16/3`，另两项
`item-action-button/media-zoom-controls = 0/0`。这一定义不把普通正文、测试 fixture 或
`some-tool-name` 子串误计为旧控件；后续“只减不增”以该脚本与 boundary ceiling 同时通过为准。

## 3. 跨页面公共红项

| ID | 红项 | 当前证据 | 统一处理 |
|---|---|---|---|
| U-01 | Header 操作过大，布局控制分散 | 用户截图；`EditorAppHeader` 仅三操作；sash 常驻 toggle | ED-DS-2 v2.1 紧凑工具栏 + View menu + 三面板控制 |
| U-02 | 列表选中语法不统一 | Actor 已改全宽方角；历史 Shop 等曾为 inset 圆角卡 | `DS-C.3`：全宽、方角、左 accent；模块不得私有 active 卡片 |
| U-03 | 中央工作平面与卡片层级不统一 | Actor/BattleField/Skill/Shop 明度和留白不同 | canvas 最深，panel/card/input 逐级抬高；统一 hero/section/card |
| U-04 | Inspector 没有统一职责 | Skill/Shop 右侧是贴边长说明；Actor/BattleField 已有摘要/引用 | Inspector 固定为摘要、引用、当前选择上下文和危险操作；正文帮助进 help/callout |
| U-05 | panel sash 同时承担 resize 与 toggle | `PanelResizeHandle.tsx` 与 `.panel-resizer-toggle` | sash 仅 resize；Header/View 提供显隐与恢复 |
| U-06 | 原生表单与局部 CSS 并存 | production 大量 `<select>`/checkbox；Skill 自有 grid/11px label | 按 primitive 迁移，禁止页面继续自造 control state |
| U-07 | 大量列表/option 缺统一性能策略 | Tileset 223 项；Skill 音效 picker 数百 option；Stamp DOM census 超时 | shared VirtualList/Combobox；复杂交互行 <=120，长 option 改可搜索 picker |
| U-08 | 空/错/加载/缺引用的恢复语法不统一 | 历史白屏、`stages is not iterable`；各页私有空态 | 统一 boundary + visible error + retry/open-source action；禁止静默空数组 |
| U-09 | 页面自身标题与主任务说明不稳定 | Skill 直接从“基础”表单开始；BattleField 有明确 hero | 每个对象页必须先有 hero：类型/id、名称、摘要、状态、主要动作 |
| U-10 | 页面级 inline layout 仍多 | Skill/Enemy/Ambience 等保留 inline style | 迁移卡逐页删除并记录例外；不得在 ED-DS-2 批量机械改写 |
| U-11 | 按钮体系尚未完成采用 | 2026-08-17 production census：raw `<button>` 329；`DsButton=116`、`DsIconButton=53`、`DsActionLink=3`；旧类仍有 tool/btn/mini/mini-txt/pv-btn/mini-icon = 62/43/18/34/16/3 | 公共入口只保留 `DsButton/DsActionLink/DsIconButton/DsToolbar/DsMenuItem`；先迁高频遗留族，再按文件拆解语义混杂的 `.btn`，最终用边界测试禁止新增遗留 token |
| U-12 | 对象级删除的位置随模块漂移 | Skill/Enemy/BattleField 在 hero，Actor 曾在 Inspector 底部；引用面板标题又重复写“引用与删除” | 对象级删除统一进入 `DsObjectHero.actions`；Inspector 只保留“引用”与阻断原因；子项删除留在所属行/卡片 |

### 3.1 2026-08-17 复核状态

| ID | 状态 | 当前结论 |
|---|---|---|
| U-01/U-02/U-04/U-05 | 已由专项卡闭合 | Header/View、目录行、Inspector Tab 与 App sash 已有共享合同；不再重开总卡。 |
| U-03/U-09/U-12 | 主对象页已闭合，领域长尾 | Battle/Actor/Item/Project 等已有 Hero/section/对象动作合同；专业媒体与脚本页按其 recipe 复核，不强套 Object Hero。 |
| U-06/U-11 | 仍 open | raw form 与旧按钮族的精确基线仍大，只减不增不等于完成采用。 |
| U-07 | 仍 open，优先级上升 | `DsVirtualList` 已存在但生产零调用；敌队 380 行 `shown.map` 是直接反例。必须先补焦点、选择、滚动定位和动态高度合同，不能机械套现有原型。 |
| U-08 | 已闭合 6 个诊断面，其余按页复核 | 共享诊断/引用状态已落地；普通空态、加载态和业务错误仍由各领域卡验证。 |
| U-10 | 部分 open | 72 个 inline style 需区分动态几何与页面皮肤，禁止按数量机械归零。 |

### 3.2 最新实现顺序

1. **`ED-MAP-PALETTE-CONTROLS-1`**：只把 `MapStampPalette.tsx:69-96,142-153` 的 raw 搜索、分类与
   `.mini` 操作迁入共享 `DsTextInput / DsSelect / DsButton`；它是 Inspector 内嵌 palette，不得错误套入带
   `DsListHeader` 的目录 recipe。保留图章卡片、兼容性禁用、最近排序和 60 条渐进显示。
2. **长目录性能合同（后续独立开卡）**：先修/扩 `DsVirtualList` 的可访问选择、受控滚动定位、变宽和测试合同，
   再接敌队等明确超 50 行目录。不得只加 `content-visibility` 就宣称虚拟化完成。
3. **脚本/工程/资源旧控件分批迁移**：以 `CanonicalScriptEditorV5`、`ProjectWorkbenchTab`、
   `BattleSpriteLibrary / Tileset / Cutscene` 为批次，不开“全局替换 197+122 控件”的巨型卡。
4. **图像固有尺寸与次级可访问性**：随对应资源卡修复，不阻塞前两批。

### 3.3 按钮迁移顺序（存量批次内约束）

按钮视觉只允许 `primary / secondary / quiet / danger` 四个层级；HTML 元素差异只表达语义，不得形成新皮肤。

1. P0：补齐共享按钮/link 的 hover、active、focus-visible、disabled 状态；列表头操作改为复用 compact icon action。
2. P1：机械迁移 `tool / mini / mini-txt / pv-btn`，先区分普通动作、导航、图标动作和 toolbar 命令。
3. P2：逐文件迁移 `.btn`；它在不同容器中语义和尺寸冲突，禁止用全局 alias 粗暴覆盖。
4. P3：清除 item/music/tileset/stamp/image/sprite 等业务按钮皮肤，只允许页面保留布局类。
5. 门禁：扫描非 design-system TSX/CSS，遗留 token 采用只减不增基线；禁止无 accessible name 的图标按钮、
   无 `:not(:disabled)` 的 hover，以及页面 CSS 重写按钮尺寸/边框/圆角/颜色/焦点环。

## 4. 首轮页面优先矩阵（历史输入，执行状态见 §3.2/§3.3）

| 批次 | 页面 | 现状判断 | 主要动作 |
|---|---|---|---|
| P0 foundation | 全局 Header / left-bottom-right panels / status | 用户刚拍板，当前实现未满足 | ED-DS-2 v2.1，先完成再迁业务页 |
| P0 first migration | Battle / Skill | 旧裸表单最典型；Inspector、效果链、预览和 hero 均需重做 | 新开 `ED-BATTLE-UI-1`，以 Data/Object hybrid recipe 重构 |
| P1 battle family | Enemy / Poison | 与 Skill 同代旧布局，领域字段复杂 | 共享 Battle data shell，分别保留领域扩展，不复制 Skill JSX |
| P1 item family | Item / Shop | Shop 已有三栏骨架但中央/右侧层级仍弱；Item 单文件过大 | 先统一 Shop recipe，再拆 Item 分区/引用/效果编辑器 |
| P1 assets | Image / Sprite / Music / Sound / Cutscene | Image 媒体画布仍需标准缩放；音频/过场页工作台语言分裂 | Media recipe + shared picker/preview/inspector |
| P1 map tools | Map / Tileset / Stamp | 专业画布保留；目录/预览/Inspector 和大列表需统一 | 不重做画布算法，只迁外壳、列表、panel 和反馈 |
| P1 story | Scripts | 专业脚本工作台，不能套普通表单；需独立代码质量审查 | Script recipe、错误聚焦、树键盘、drawer |
| P2 simple data | Ambience / Vars / Events | 结构较小但仍用旧裸列表/说明 | 作为 primitive 快速采用批次 |
| P1 project | Overview / Startup / Entrypoint / Advanced | 四页共用大组件，信息架构与危险操作需复核 | Object/Script recipe 分页采用；保留稳定深链 |
| P1 references | Actor / BattleField | 不是“已统一完成”，是双参考输入 | 统一 hero、列表、panel controls、spacing；保留各自主任务差异 |
| P1 complex scene | Scene | 高频核心页，涉及实体/脚本/引用闭环 | 在基础稳定后单独开卡，不和视觉批量迁移混写 |

## 5. Skill 页面重设计摘要

Skill 采用“数据目录 + 对象工作台”的 hybrid recipe：

- 左：搜索、类别/可用范围过滤、名称/id/目标/消耗摘要；选中行遵守 DS-C.3。
- 中：对象 hero（技能/id、目标、消耗、战内/战外、试放）后分为基础、消耗与说明、效果链、动画、施法分支。
- 效果链：每个 effect 是有序 card/row，显示序号、类型、可读摘要和紧凑 reorder/delete；字段在选中 effect
  的编辑区展开，不把所有复杂字段横向铺成一行。
- 媒体：召唤/变身/FIRE 预览使用统一 black media stage 和共享 fit/1:1/播放语法，不作为孤立大黑块插在字段间。
- 右：技能摘要、引用/被谁习得、当前 effect 上下文和删除阻断；帮助说明移到可关闭 callout/帮助入口。
- 功能闭环：创建、编辑、保存、重开、深链、被角色/敌人引用、删除阻断与战斗试放都要有测试；本卡不改
  content schema、Skill 运行时语义或原版数值。

## 6. 审计边界

- 本文不声称 25 页功能闭环已验收；功能七环仍由 ED-1/模块卡逐项验证。
- 本文不允许一次性重写全编辑器。顺序固定为 ED-DS-2 foundation → ED-AUDIT-2 完整矩阵 → 小批模块迁移。
- 用户后续指出的新问题要并入相应公共红项/页面卡，不再只做截图位置的局部补丁。

## 7. 2026-08-15 执行裁决：主动连续迁移，不等待逐页点名

用户明确指出“角色标题、技能、敌人等页面的重构”属于同一轮编辑器统一工作，否决把 ED-DS-2 的底部
面板纠错当作当前工作终点。执行方式调整为：仍用小批 diff 保证可审查和可回滚，但批次连续推进，Agent
主动巡检下一批，不再要求用户逐页提供截图。

1. `ED-BATTLE-UI-1`：共享 Object Hero + Actor/BattleField 基准迁移 + Skill/Enemy/Poison。
2. Item/Shop：共享对象目录、商品编排、引用/删除与 Inspector。
3. Assets：Image/Sprite/Music/Sound/Cutscene 统一 Media workbench、缩放和背景。
4. Map/Story/Project：保留专业画布/脚本语义，统一壳、列表、panel、错误与键盘。
5. Scene：最后单独处理高复杂工作台；保留地图/演出/脚本上下分栏能力。

“小批”只表示工程风险控制，不表示等待用户逐批提醒。每批完成自验后立即进入下一批设计/签字流程，直到
25 页矩阵完成。
