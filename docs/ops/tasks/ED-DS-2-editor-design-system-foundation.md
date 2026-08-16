# ED-DS-2 - 编辑器设计系统代码基础与 Design Lab

Status: done
Phase: phase2
Capability: Editor cross-cutting（本卡不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（架构/视觉主审）+ GLM（覆盖/测试主审）
Visual Verification Owner: Codex + User
Visual Verification Timing: dev-functional
Unavailable Agents: N/A（Kimi 额度已恢复，2026-08-15 用户要求后续带上 Kimi 审核）
Branch: TBD

## 目标

把用户已通过的 [`editor-design-system-v1.md`](../../phase2/editor/editor-design-system-v1.md) v2.1.0 代码化为
编辑器包内部唯一的 semantic tokens、基础 primitives、四类 workbench recipes 与独立 `Design Lab`；并让
主编辑器应用壳成为第一个真实采用者：以同级“文件 / 编辑 / 八模块”菜单和右侧固定常用操作替代左侧
`ModuleNav`、对象列表内 `ModuleSubnav` 与旧工程标题工具条。先让规范在固定 fixtures 中通过状态、键盘、
响应式、媒体、大列表和通用表单控件压力验证，再开始迁移角色、资源、战斗、场景等业务页面；不再让每个模块
重新发明按钮、select、checkbox、tab、drawer、媒体画布和断点。

## 范围

- 范围内:
  - 在 `packages/editor/src/ui/design-system/` 建立 v1.0.0 semantic tokens、legacy aliases、基础
    primitive components/CSS、四类 recipe shell 和内部版本标识。
  - 建立独立 Vite 多页入口 `design-lab.html`，使用固定本地数据展示 RF-01～RF-15；不读取或写入工程。
  - 基础 primitives：Button/IconButton、Tooltip、MenuBar/Menu、Toolbar、Tabs、Field、
    TextInput/TextArea/NumberInput、Select、Combobox、MultiSelect、Checkbox、RadioGroup、Switch、Card、
    ListHeader、Status/EmptyState、Dialog、Drawer、MediaViewport、VirtualList，以及组合它们的
    Object/Media/Script/Table workbench shell。
  - 为 primitives 提供语义 DOM、键盘、焦点、状态、reduced-motion、长文本和尺寸契约测试。
  - 在真实 Chromium 中验证 1280 / 900 / 720、125% / 150% / 200% zoom、DPR 1/2、媒体背景、
    dialog/drawer 和 500+ 列表性能。
  - 把 `editor.css` 当前 `--bg` / `--panel` / `--fg` 等旧 alias 映射到新 semantic tokens，使
    现有编辑器先采用用户通过的色板；保留旧 class/业务布局，逐模块迁移留给后续任务。
  - 代码化 `canvas → panel → raised → overlay` surface hierarchy 与 checkerboard/plain-dark/black/grid
    四种媒体 stage 背景；纹理只由共享 media primitive/class 生成。
  - 实现 app-shell command registry：菜单、快捷工具栏、快捷键共享稳定命令 id、label、icon、enabled/
    disabled reason、execute、scope 与默认 placement；不把业务命令执行逻辑下沉进 primitive。
  - 重构主应用壳为单行 Header：左侧工程名 + `文件 / 编辑 / 场景 / 地图 / 剧情 / 角色 / 物品 / 战斗 / 资源 / 项目设置`；
    右侧固定布局控制组 + 撤销 / 重做 / 保存。模块子页使用纵向 dropdown 与真实 href；Narrow 用显式“导航”菜单，
    不使用横向滚动。
  - Header 布局控制组统一开关左侧对象列表、场景工作区已有脚本面板与右侧 Inspector；新增“视图”菜单复用
    同一 command registry，并提供重置布局。中间开关必须复用 `App.drawer.open`，不得新建问题/诊断 drawer；
    状态栏继续只显示现有摘要。非场景页该命令禁用并给出原因。
  - 左右 panel sash 只负责鼠标/键盘 resize，不再常驻悬浮折叠按钮；面板显隐和尺寸记忆受主区最小宽度约束。
    Header 图标按钮收紧为 `28×28px` / `16px` icon，保存为 `30px` 高紧凑主按钮。
  - 删除左侧 `ModuleNav` 列、对象列表顶部 `ModuleSubnav` 及其 tabBar 透传；业务页面内部真正的 task tabs
    保持不变。工程名写入 `document.title` / 项目设置，并独立组成 Header 左侧紧凑窗口身份区；当前页面只由
    工作区自身标题表达，Header 不重复显示。
  - 把 `BattleFieldTab` 作为 surface hierarchy 生产 canary：中央工作平面改用 canvas，卡片/输入/Inspector
    分层，战场预览使用共享 black mode；不重排其字段、引用或业务命令。
  - Narrow 导航按模块分组并在空间允许时双栏；Header 层叠上下文必须高于分栏拖拽条与面板折叠按钮。
  - 为主编辑器 HTML 补暗色 `color-scheme` / `theme-color` 和与 tokens 一致的 preboot 背景，避免启动闪白。
- 范围外:
  - 不在本卡重排 Actor、Image、Battle、Scene、Item 等业务内容 JSX 或任务信息架构；仅删除应用壳导航
    `tabBar` plumbing，并由新 Header 保持相同 module/page 深链。
  - 不改 content schema、save、migration、asset pipeline、Reforge runtime 或项目数据。
  - 不把 design-system 变成跨 package 公共库；v1 仅供 `@type-pal/editor` 内部使用。
  - 不修改 `play.html` 或游戏试玩页视觉；它属于运行时 UX，不是作者工具设计系统。
  - 不建立完整 icon 资产库；只提供 primitives / Design Lab 所需的 code-native SVG 基础图标。
- 明确不做:
  - 不引入第三方 UI framework、CSS framework、router 或测试库来替代现有 React/Vite/Vitest 栈。
  - 不用业务 store、项目 I/O 或真实 PAL 数据驱动 Design Lab。
  - 不用一个 mega-component 通过几十个布尔 props 模拟四类 workbench；recipe 只负责槽位、响应式和滚动。
  - 不借机批量改写当前 15k+ 行 `editor.css`，也不声称旧 inline style 已经清理完成。
  - 不把截图通过当成功能闭环；本卡只证明设计基础，业务模块的 ED-1 七环另卡验收。
  - 不把现有“升级到 v13 / 升级对话身份到 v14”带进新 Header/File 菜单。开发期编辑器只打开当前
    canonical 工程；旧版本早失败并提示重新迁移/重新生成。本卡需审计这些入口的直接调用域：当前 PAL 与
    fixtures 已切换后，删除无调用的 upgrader、旧类型、专属测试和保存 activity 分支，而不是仅隐藏菜单。
    若发现仍有无法重建的真实输入，任务转 `blocked` 请求用户批准临时例外，不自行保留。

## 前提真值门

### 一句话行为 / 工程前提

模块迁移前必须先有一套不依赖业务数据、能在浏览器中独立验证的代码基础；否则规范仍只是文档，后续每个模块
会继续复制局部 CSS、交互和断点，并在真实页面里重复暴露白屏、挤压和焦点问题。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版游戏没有现代作者编辑器，也没有可复用的 editor component library / Design Lab；不能提供本任务代码形态真值。 | `docs/phase2/READ-FIRST.md:8-11,21-22` |
| 第一阶段 | N/A：第一阶段提供游戏运行时 UX 参考，不提供二阶段作者工具的 tokens/primitives；全新 UI 必须由用户先定形。 | `docs/phase2/READ-FIRST.md:20-22,33-35`; `CLAUDE.md:5-17` |
| 当前二阶段 | ED-DS-1 v1.0.0 已经由用户六项全部通过，但实现仍只有 `editor.css` 的旧颜色/字体变量；Vite 只有 main/play 两个入口，没有 Design Lab；当前生产 UI 直接散落至少 169 个 `<select>` 与 52 个 checkbox input，并有多套局部 CSS，未形成统一单选/多选/checkbox 合同；当前 600 项地图组合只是每次挂载 60 项的业务组件，并非通用 virtual list；现有保存 dialog 能证明原生 dialog/focus-return 可行，但仍是业务私有实现。 | `docs/phase2/editor/editor-design-system-v1.md:430-613`; `packages/editor/src/ui/editor.css:1-18,977,3050,4241,5168,6204,10912-10945`; 2026-08-15 `rg '<select' / 'type="checkbox"'` production census；`packages/editor/vite.config.ts:85-93`; `packages/editor/src/ui/MapStampPalette.tsx:7,33-65,98-130`; `packages/editor/src/ui/ProjectSaveDialog.tsx:18-43,69-107` |
| 本任务目标 | 在 editor 包内实现 foundations → primitives → recipes → app-shell extension 四层代码；Design Lab 固定实现 RF-01～RF-15；主应用壳采用工程名窗口身份区、同级菜单、纵向模块分组下拉、紧凑布局/历史/保存操作和统一命令注册表，并删除左侧/列表内两套旧导航与 sash 常驻按钮，作为后续全编辑器翻新的共同验收尺。当前页面只由工作区自身标题表达，不在 Header 重复显示。 | `docs/phase2/editor/editor-design-system-v1.md:199-278,478-603,附录 D-E`; 用户 2026-08-15 `ED-DS-1：六项通过`、v2 单行 Header 与 v2.1 布局控制实机裁决 |

### 反证与替代解释

- 最强替代解释 1：直接从 Image/Battle 页开始翻新，遇到重复再抽组件会更快。
  - 反证：用户要求“先有完整设计规范，再按规范实施”；dialog、drawer、媒体、500+ 列表和三档 recipe
    都是跨模块合同。先迁业务页会让第一个页面再次成为偶然标准，并把基础交互耦合进业务数据。
- 最强替代解释 2：只把 `editor.css` 的变量改名就已经是设计系统。
  - 反证：变量改名不能验证 keyboard/focus、dialog/drawer、scroll ownership、media controls、virtualization
    或四类 recipe；也没有独立复现用户连续指出的窄宽挤压、白屏和长文本问题。
- 最强替代解释 3：引入现成 UI framework 可以一次解决。
  - 反证：当前没有此依赖，用户已冻结自己的暗色、密度、断点、recipe 和媒体合同；引入 framework 会新增
    主题覆盖、bundle、无障碍适配和升级成本，并不能替代本项目特有工作台语法。若原生 React/CSS 无法在合理
    代码量内满足 dialog/virtualization，再另开依赖决策，不在本卡偷渡。
- 最强替代解释 4：一次把全编辑器都迁进新 primitives，能避免双系统。
  - 反证：这会把基础 API、视觉裁决、几十个业务页面和功能闭环混成无法审查的大提交；v1 rollout 已明确
    ED-DS-2 先建尺，ED-AUDIT-2 后审计，再分模块迁移。
- 什么观察会推翻当前前提:
  - 若仓库已存在被所有模块引用、覆盖 RF-01～RF-15 并通过用户验收的另一套内部 primitives/lab，应改为整合，
    不重复创建。
  - 若独立 Vite 多页入口无法与现有 dev/build 同源工作，应退为主编辑器内仅开发可见的隔离 route，但仍不得
    读取工程；当前 `vite.config.ts:85-93` 已证明多页输入可行。
  - 若映射 legacy aliases 会让主编辑器不可用，应保留 semantic tokens/Design Lab，暂缓 alias 切换并记录
    patch 级规范例外；不得因此退回硬编码新颜色。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类：N/A；本卡不改 Reforge 或业务命令。
  - 原版 / 第一阶段理解：READ-FIRST 明确此作者工具无既有 UX 形态可照搬；用户已完成六项产品定形。
  - extractor / 地图 / 数据解码：N/A；Design Lab 固定 fixture，不读取项目数据。
  - audit / test model：单一截图尺寸不能证明 responsive/accessibility，因此采用组件契约 + 多宽度浏览器证据；
    截图也不代替主编辑器启动烟测。

### 用户可见偏离

- 是否主动偏离已核真值: yes（把规范 v1.0.0 落成代码，并先切换全编辑器基础色板 aliases）
- `before -> after` 一句话: `旧颜色 alias + 每页私有控件 + 两行/侧栏导航 + sash 悬浮按钮 -> semantic tokens + 可复用 primitives/recipes + 单行紧凑 Header + 集中布局控制 + 独立 Design Lab`
- 代表场景: Header 左侧只显示工程名，随后是文件、编辑与八个同级模块；当前页面由下方工作区标题表达，
  右侧固定撤销、重做、保存。
  打开“战斗”显示“技能 / 敌人 / 毒 / 战场”真实链接；720px 以居中的模块分组导航面板承载全部入口，且不被
  分栏按钮遮挡。访问 `design-lab.html?fixture=RF-08` 可比较统一表单状态，RF-15 验单行 Header。
- 用户裁决: ED-DS-1 的色板、密度、断点、drawer、四类 recipe 和媒体背景已于 2026-08-15 全部通过；
  2026-08-15 实机后又冻结 v2 单行 Header、左侧工程名、右侧三操作、无 check 当前态；当前页面不在 Header
  重复显示。v1.1 build
  签字保留为历史但不授权剩余实现；Kimi / GLM 只需对 v2 delta 重签。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md:8-11,21-22,33-35`：二阶段架构第一；无一阶段对应的全新 UI 先由用户定形。
  - `docs/phase2/editor/editor-design-system-v1.md:199-257,478-603,附录 C`：Header 菜单/工具栏、统一控件、
    primitive 边界、Design Lab、RF-01～RF-15、性能和 rollout 合同。
  - `docs/phase2/editor/editor-design-system-v1.md:604-613`：用户通过的六项 v1.0.0 产品裁决。
  - `AGENTS.md`：跨模块公共实现合同与用户可见行为改变必须开卡、过前提真值和三方签字门。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/editor.css:1-18`：现有 legacy roots/tokens，本卡只改 foundations/aliases。
  - `packages/editor/vite.config.ts:85-93`：现有 main/play 多页 build input，可无路由依赖加入 lab。
  - `packages/editor/index.html:1-17`：主编辑器 preboot 色与 meta 当前未绑定设计系统。
  - `packages/editor/src/main.tsx`：主编辑器只导入 `editor.css`，design lab 应使用独立入口。
  - `packages/editor/src/ui/MapStampPalette.tsx:7,33-65,98-130` 与 `.test.tsx:63-105`：当前批量渲染先例。
  - `packages/editor/src/ui/ProjectSaveDialog.tsx:18-43,69-107`：native dialog、aria-live、焦点返回先例。
  - `packages/editor/src/ui/ActorMode.tsx`、`EnemyTab.tsx`、`LifecycleCommandPanelV13.tsx`、
    `StampTemplateDialog.tsx`：当前原生 select/checkbox 的多个业务实现；全仓 production census 为
    169 个 `<select>` / 52 个 checkbox，本卡需以统一 primitive 给后续迁移提供唯一入口。
  - `packages/editor/src/ui/editor.css:9573-9656`：战场中央区用私有 `color-mix(panel2, #111722)`，普通卡片
    另有私有 surface/shadow，预览直接硬编码 `#050608`；与角色页深 workspace → panel/card 的层级不一致。
  - `packages/editor/src/ui/PreviewCanvas.tsx`：现有业务媒体 stage/zoom 逻辑可供 adapter 参考，不下沉业务依赖。
  - `packages/editor/src/ui/ModuleNav.tsx:9-84`、`editor.css:489-529`：当前左侧一级导航 + 对象列表内二级导航；
    后者误用 tablist/button、2×2 grid + emoji + 大面积 active 背景。
  - `packages/editor/src/ui/App.tsx:1010-1145,1520-1615`：当前应用壳为左侧模块列、工程名菜单、独立撤销/重做/
    保存按钮和业务页 `tabBar` 透传；本卡替换壳，不复制业务命令。
  - `packages/editor/src/ui/editor-navigation.ts:155-192,385-399`：战斗 4 个稳定子页与可复制 URL 已存在，
    可直接生成真实 href，不需要新路由或数据 schema。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md`：视觉/交互、ED-1 七环、代码质量三线分开审。
  - 用户连续实机发现 tab 被压扁、字段逐字换行、引用跳转白屏、脚本页空间失衡；基础 lab 必须覆盖相应
    断点和故障状态，但不冒充已修完每个业务 bug。
  - [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)：
    作为 2026-08-15 重新读取的外部实现检查基线；不替代本项目已冻结的数值裁决。
- 不得重新引入:
  - emoji-only 功能按钮、`div/span onClick`、移除 outline 而无 focus-visible、placeholder 代 label。
  - `transition: all`、用字号缩小解决窄宽、让 tab/toolbar flex-shrink、页面双向滚动。
  - primitive 读取项目 store/id 或发 save command；recipe 知道 Actor/BattleField/Scene 业务。
  - 为单个 fixture 写 magic breakpoint；断点只用 Wide >=1200、Medium 840～1199、Narrow <840 CSS px。
  - 在静默 catch 后返回空数组；错误必须可见、有证据、有恢复动作。
  - 产品内 upgrade-to-vXX 命令、旧 schema/version 双读双写、legacy fallback 或静默 normalization；
    reviewer 必须按 `docs/ops/agent-workflow.md` 单列旧版本兼容审查结论。
- 相关测试 / 验证基线:
  - `packages/editor/src/ui/MapStampPalette.test.tsx`
  - `packages/editor/src/ui/ProjectSaveDialog.tsx`
  - `packages/editor/src/ui/panel-layout.test.ts`
  - `packages/editor/src/ui/ActorMode.test.tsx`
  - `packages/editor/src/ui/BattleFieldTab.test.tsx`

## Draft: 设计与风险

### 设计结论

#### 1. 文件与依赖边界

新增内部目录，允许按职责拆文件，不要求把所有 JSX 塞在一个文件：

```text
packages/editor/
  design-lab.html
  src/design-lab.tsx
  src/ui/design-system/
    version.ts
    tokens.css
    primitives.css
    recipes.css
    icons.tsx
    controls.tsx
    overlays.tsx
    media.tsx
    virtual-list.tsx
    workbench.tsx
    index.ts
    *.test.tsx
```

- `index.ts` 只作为 editor 内部显式 export surface；不改 workspace package exports。
- primitive 不 import `@type-pal/content`、`@type-pal/reforge`、editor core/store 或业务 UI。
- 不新增 npm dependency；沿用 React 19、native `<dialog>`、CSS、ResizeObserver 和 Vitest/jsdom。
- `design-lab.tsx` 只 import design-system 与固定 fixtures；不得 import `App`、project I/O 或 `projects/pal`。

#### 2. Token 与 legacy alias 策略

- `tokens.css` 精确代码化 DS-F/DS-L 的 semantic names，至少覆盖 surface、text、border、action/status/focus、
  type、space、control/tab sizes、radius、elevation、motion、z-index 和 Wide/Medium/Narrow recipe variables。
- 在同一文件底部提供兼容 alias：`--bg -> --ds-surface-canvas`、`--panel -> --ds-surface-panel` 等；
  只替换 `editor.css:2-18` 的值来源，不批量改业务 selectors。
- 默认 `color-scheme: dark`；主编辑器 `index.html` preboot 与 `theme-color` 使用静态同值，避免 CSS 加载前闪白。
- v1 不建立 light theme。Design Lab 可展示 token 表，但不得出现未冻结的第二套主题。
- primitives 内禁止直接 hex/rgb/hsl；透明 checkerboard 和 canvas 黑底也必须经语义变量表达。

#### 3. Primitive 合同

- `DsButton` / `DsIconButton`：native button；variant/size/busy/destructive；icon-only 必须有 accessible name。
- `DsTabs`：`tablist/tab/tabpanel`，ArrowLeft/Right、Home/End 与 roving tabindex；tab 高 40px、不可 shrink。
- `DsField`：显式 label、description、error id 关联；不把 placeholder 当 label；长 label 不逐字断行。
- `DsTextInput` / `DsTextArea` / `DsNumberInput`：共用 36px 输入壳、label/description/error、前后缀与单位；
  number 提供合法 range/step/inputMode，不在业务 CSS 中重画 spinner/单位布局。
- `DsSelect`：固定短枚举的单选；显式暗色背景/文字/箭头与 default/hover/focus/open/error/disabled/readonly。
  `DsCombobox`：可搜索单选和引用选择，名称优先、稳定 id 次要、未知引用 fail-visible。
- `DsMultiSelect`：同一输入壳 + chips/`+N` 摘要 + 搜索 checklist；支持全选/清空、计数、空/加载/缺失，
  Enter/Space/Arrow/Home/End/Esc 与关闭后的焦点归还；长列表采用同一 virtual/paged option source。
- `DsCheckbox` / `DsRadioGroup` / `DsSwitch`：完整 label 命中区和 focus-visible；checkbox 支持 indeterminate，
  radio 保证单选；switch 只表达即时设置，普通内容布尔值统一使用 checkbox。
- `DsCard` / `DsListHeader` / `DsStatus`：只表达层级、数量和恢复动作，不携业务语义。
- `DsDialog` / `DsDrawer`：共用 overlay/focus return；Esc、outside click、dirty/destructive 阻断由显式 props 控制；
  native dialog 优先，关闭后焦点回到仍存在且可用的触发器。
- `DsMediaViewport`：仅管理 fit/1:1/zoom/pan/reset/background 与 render slot，不解码业务 asset；toolbar 位于画布顶部；
  image/sprite 默认 checkerboard、opaque image plain-dark、battle/video black、map grid，可切换；背景实现只能
  消费 surface/media tokens，不允许业务模块复制纹理或硬编码黑底。
- `DsVirtualList`：固定或已知行高、稳定 item key、键盘选中可滚入可视区；500 项 fixture 挂载交互行 <=120。
- `DsIcon`：code-native SVG、`currentColor`、装饰图标 `aria-hidden`；不在本卡替换所有旧 emoji。

#### 4. Recipe 合同

- `DsObjectWorkbench`：对象列表 / 主任务 / Inspector / 辅助摘要槽位；Medium Inspector drawer，Narrow 列表/Inspector
  与主区互斥呈现。
- `DsMediaWorkbench`：对象/资源列表 + 最大化 canvas + metadata drawer；toolbar 保持在 canvas 顶部。
- `DsScriptWorkbench`：source/tree/form/preview 槽位；窄宽时 tree/form 分层但错误与 dirty 状态不丢。
- `DsTableWorkbench`：toolbar/table/details drawer；sticky header、数值/单位对齐和虚拟行容器。
- Recipe 只决定 layout、container query、scroll ownership 与 slot；不渲染业务字段，也不自行保存。

#### 4a. Header、命令注册表与首个生产采用

- `DsMenuBar` / `DsMenu` / `DsToolbar` / `DsTooltip` 只实现语义、焦点、键盘、popover positioning、overflow
  和视觉状态；不 import App/session/store。导航项使用真实 `<a href>`，动作使用 `<button>`。
- app-shell 新建 editor command registry adapter。文件/编辑菜单、工具栏与快捷键引用同一稳定 command id；
  disabled reason、busy/error、shortcut 和执行函数只有一份。模块导航数据继续来自 `EDITOR_MODULES`，不另建表。
- Wide/Medium 单行 Header 左侧显示工程名与十项同级菜单；有多个子页的模块打开纵向链接菜单。
  Narrow 将工程名截短，并保留文件/编辑/导航；导航按模块分组、双栏优先、极窄单栏，不出现横向 overflow。
- 同一行右侧固定撤销、重做、保存；不建立第二行或 toolbar localStorage 配置。菜单弹层所在 Header stacking
  context 必须高于主体 resizer/collapse controls，当前态用 soft accent，不用 check/硬蓝条/整块描边。
- 删除 `ModuleNav` body column、`ModuleSubnav` JSX/CSS 与各业务页 `tabBar` prop/plumbing；不改变原有
  module/page/object URL、业务组件挂载或内部 task tabs。工程名称在 Header 左侧显示，并继续写入
  `document.title`、出现在 File 菜单元数据。
- 添加 app-shell/menu/toolbar contracts：十项顺序和同级视觉；真实 href/aria-current/修饰键；menu keyboard/
  Esc focus return；720px 分组导航/层叠遮挡；命令唯一执行；单行操作区；无项目升级菜单。

#### 5. Design Lab 入口与 fixtures

- `vite.config.ts` 新增 `designLab: design-lab.html` build input；访问 `/design-lab.html`。
- Query 使用 `?fixture=RF-01`（缺失/非法时显示 gallery 与可恢复错误），URL 可复制；不引入 router。
- 用户确认 amendment 后，页面显示 `editor-design-system v2.0.0`、viewport CSS px、DPR、reduced-motion
  与当前 fixture；v1.0.0 六项历史裁决仍在规范附录单独保留。
- Foundation/Pattern/Recipe/Stress 四个 gallery 完整承载 RF-01～RF-15；固定数据必须包含：
  - 长中文、长英文/id/path、empty/filter-empty/missing/load-failure；
  - 11 状态；透明/宽/高/失败媒体；500+ object/table；
  - dialog/drawer/delete-blocked；reduced motion。
  - 通用表单控件的 default/hover/focus/open/filled/indeterminate/error/disabled/readonly/loading/empty；
    单选短枚举、可搜索单选、20 项多选与长中英文/id/chips overflow。
  - Header 在 1280/900 显示工程名与十项同级菜单，在 720 显示截短工程名/文件/编辑/导航；
    战斗下拉 4 个真实链接；右侧固定撤销/重做/保存，弹层不被分栏控件覆盖。
  - canvas/panel/raised/overlay 四层对照片；checkerboard/plain-dark/black/grid；战场工作区与角色工作区
    surface hierarchy 并排 canary，证明中央编辑平面没有被浅色卡片吞没。
- 浏览器尺寸、zoom 与 DPR 是验证环境，不用 JavaScript 读取 DPR 改断点；canvas backing store 才可使用 DPR。

#### 6. 自动门与人工门

- Static：类型边界、design-system CSS 不出现直接颜色/私有断点/`transition: all`；若仓库暂无 stylelint，
  用小型只读 contract test 扫本目录，不扩成全仓 lint 重构。
- Component：Vitest + jsdom，覆盖语义、键盘、focus return、error/live region、reduced motion、virtual mount budget。
- Visual：真实 Chromium 逐 fixture 检查 bounding box、overflow、scroll ownership、截图与 console/page errors。
- Performance：RF-10/RF-12 20 次过滤 p95 <=100ms、选择不晚于下一动画帧、3 秒连续滚动无 >100ms long task；
  保存浏览器版本、机器信息与原始测量 JSON。
- Manual：用户判断信息层级、主任务面积、色板和媒体工具位置；自动化不得冒充审美验收。

### 已知风险

- 风险：legacy aliases 会一次改变现有编辑器基础前景/边框/accent，可能暴露对旧低对比色的隐式依赖。
  - 缓解：主编辑器 1280/900/720 启动烟测、console 零 error、导航/保存可达；发现不可用 selector 只做最小
    compatibility fix，业务布局迁移另卡。
- 风险：一开始抽取过多 props，形成另一个难维护的通用组件层。
  - 缓解：primitive 只实现规范已列出的稳定语义；四类差异留 recipe slot，领域差异留模块 adapter。
- 风险：jsdom 测试通过但真实 dialog/focus/ResizeObserver 行为不同。
  - 缓解：组件测试之外必须跑真实 Chromium RF-13，主编辑器 dialog 也做烟测。
- 风险：Design Lab 与生产样式漂移。
  - 缓解：Lab 直接 import 同一 `index.ts` / CSS，不复制组件；版本常量和截图证据显示实际规范版本
    （amendment 经用户确认后为 v2.0.0）。
- 风险：500 项在开发机达标但低速机器不稳定。
  - 缓解：保存原始 20 次数据与环境；DOM 上限是确定性硬门，时延数据作为当前固定机器门，不报普适结论。
- 风险：外部指南建议复杂列表 50+ 即考虑虚拟化，而本项目规范硬门是预计 500。
  - 缓解：primitive 从任意规模可用；Design Lab 在 500 验硬门。50～499 是否启用由模块迁移卡基于复杂度决定，
    不在本卡静默修改 DS v1.0.0。
- 风险：菜单、工具栏、快捷键各自绑定执行函数，形成三套 enabled/busy/错误状态。
  - 缓解：app-shell command registry 是唯一命令源；primitive 只消费命令 view，不持有业务执行逻辑；测试断言
    同一 command id 从三个入口只触发同一 handler 一次。
- 风险：删除左侧/列表内导航后，模块入口在窄宽下不可发现。
  - 缓解：720px 使用始终可见的“导航”菜单并完整列出八模块/子页；禁止横向 scroll、hover-only 和屏外入口。
- 风险：主体 resizer/collapse control 的独立 z-index 穿透 Header 弹层。
  - 缓解：Header 使用专属 stacking token，浏览器以弹层/折叠按钮实际交叠点的 `elementFromPoint` 验证。

### 主审立场

- Reviewer: Kimi（架构/视觉主审）+ GLM（覆盖/测试主审）
- 结论: Kimi premise verified + design agree（2026-08-15，附必改项 K1-K3）；GLM v1.1.0 全 delta
  premise verified + design agree（附 N1-N2/G1-G3）。
- 必改项: GLM N1（15 变量显式 alias 表）、N2（alias 链验签）；Kimi K1（fixtures 未切换的事实修正 +
  旧版本删除调用域枚举）、K2（canary surface-only 可审查）、K3（alias 冒烟 >10 处即回卡的量化闸）。
  均为 build 时落实项，不阻塞准入。
- 是否建议进入 build: 三方签字齐，2026-08-15 已转 build。

## 验收条件

### 功能 / 架构

- `pnpm --filter @type-pal/editor build` 同时产出 main/play/designLab，且主编辑器入口未导入 lab fixture 数据。
- Design Lab 可通过 `?fixture=RF-01`～`RF-15` 直接打开；非法 fixture 显示可恢复错误而非白屏；
  RF-15 的生产 Header/Menu/Toolbar 与样板使用同一 primitive/CSS。
- Tokens/aliases 精确匹配规范 v1.0.0 foundations，Header/Menu/Toolbar/LayoutControls 精确匹配 v2.1.0
  amendment，页面显示 v2.1.0；primitive/recipe 无业务 package/store/I/O 依赖。
- 四类 recipe 在 1280/900/720 按规范降级；Medium Inspector 是 drawer；tab/toolbars 不压缩高度。
- 1280/900 Header 单行显示工程名、十项同级菜单与右侧布局/历史/保存操作；720 显示截短工程名/文件/编辑/导航且
  无横滚；导航按模块分组，战斗 4 项可见，普通点击 SPA 切换，修饰键保留原生链接行为。
- 同行布局三按钮具有 tooltip/`aria-pressed` 并与“视图”菜单共用命令；撤销/重做/保存具有
  label/tooltip/shortcut；弹层与主体分栏线交叠时菜单始终位于最上层。
- 左右 sash 无常驻按钮，仍支持 pointer/keyboard resize；问题 drawer、左右 panel 的显隐/尺寸恢复受主区
  `>=520px` 约束，重置布局可恢复默认值。
- MediaViewport 完成 fit/zoom+/zoom-/1:1/reset/pan/background，四类默认背景正确。
- Surface hierarchy 使用唯一语义层：主 workspace 为 canvas、结构面板/卡片为 panel、输入/选中为 raised、
  浮层为 overlay；BattleFieldTab 中央区不再是私有浅色 mix，预览不再私有硬编码纹理/黑底。
- VirtualList 的 500 项 fixture 同时挂载交互行 <=120，搜索、键盘选择与滚入视野保持 stable key。
- Dialog/drawer 的焦点 trap/return、Esc、dirty/destructive 阻断和 live region 通过。
- Input/Select/Combobox/MultiSelect/Checkbox/Radio/Switch 使用同一 token/尺寸/状态合同；RF-08 覆盖
  单选/多选键盘、checkbox indeterminate、radio 单选、switch 即时语义、长值/chips overflow、错误与禁用状态。
- 主编辑器采用 semantic palette aliases 后仍可启动、切换核心模块、打开/关闭保存 dialog，无白屏或 console error。

### 测试

- `pnpm --filter @type-pal/editor typecheck`
- `pnpm --filter @type-pal/editor test`
- `pnpm --filter @type-pal/editor build`
- 定向 primitive/component contracts 全绿；至少覆盖 Select/MultiSelect/Checkbox/Radio/Switch 的语义、键盘、
  focus return、label hit target、indeterminate、错误/禁用/readonly 与长选项；测试失败时必须复现根因，
  不得只更新 snapshot。
- 静态 boundary test 证明 design-system 不 import content/reforge/editor business core，不含直接颜色、私有断点、
  `transition: all` 或 emoji-only functional controls。
- 静态/组件门证明 Menu/Toolbar 不复制业务 handlers，command registry 不进入 design-system primitive，
  `ModuleNav`/`ModuleSubnav`/业务 `tabBar` plumbing 与 upgrade-to-vXX 菜单已删除且无产品调用残留。
- 浏览器 RF-10/RF-12 原始性能证据满足 DS-PERF.1；RF-01～RF-15 无 uncaught error / unhandled rejection。

### 文档

- 本卡记录最终 export surface、任何 SHOULD exception、测试命令、浏览器版本、证据路径和 main editor smoke。
- 若实现需要改动 normative token/断点/交互，先按 DS-G.4 升版并重新签字，不得边写边改合同。
- 后续 ED-AUDIT-2 / 模块迁移卡可引用稳定 primitive/fixture id，不依赖实现内部 class 名。

### 视觉 / 手工验证

- Design Lab 截图：RF-01 1280、RF-02 900、RF-03 720、RF-04 zoom、RF-05 DPR、RF-09 media、
  RF-13 overlay、RF-14 200%/reduced-motion、RF-15 Header/Menu/Toolbar 1280/900/720；其余 fixture 保存检查结果与必要截图。
- 主编辑器 1280/900/720 最小 smoke，确认 palette 切换没有导致文字不可读、tab 高度压缩、全局双向滚动或白屏。
- 用户验收聚焦基础层：foundations/states、四类 recipe、media controls、长文本/500+ 压力；不把未迁移业务页
  的旧布局当 ED-DS-2 失败，也不声称它们已经符合规范。
- E2E 用例登记: N/A；这是功能性编辑器 reference page，按 AGENTS.md 允许开发期最小视觉验证，不涉及剧情演出。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-15，v1.1.0 重新核）**。直接证据：规范实现层级与 fixtures；当前 legacy
    tokens `editor.css:1-18`；多页入口 `vite.config.ts:85-93`；`ModuleNav.tsx:9-84` 的左侧导航/二级宫格；
    `App.tsx:1010-1145,1520-1615` 的应用壳、工程名和分散动作；production 169 个 select / 52 个 checkbox；
    仓库没有现成 design-system/Design Lab/统一 command registry。
  - design: **agree（2026-08-15，按用户 Header/工具栏/统一控件裁决重签）**。独立 Vite lab + editor 内部
    foundations/primitives/recipes；app-shell 作为首个生产采用，第一行十项菜单、第二行可定制工具栏、唯一命令
    注册表、Narrow 显式导航；删除 ModuleNav/ModuleSubnav/tabBar plumbing 与旧升级入口，业务内容布局不迁；
    组件/浏览器/性能/主应用 smoke 四层证据。
- Kimi:
  - premise: **verified（2026-08-15，本人一手读码，非复述）**。独立证据：
    - 规范与现状 gap：`index.html:8-10` preboot `#1a1a1a` ≠ canvas `#1b1d23` 且无 color-scheme/
      theme-color；`main.tsx:44` 只 import `editor.css`；`vite.config.ts:85-93` main/play 双 input，
      追加 designLab 无结构障碍。
    - 控件分散现状：本人复算 production census `<select>`=169、`type="checkbox"`=52（排除 .test.tsx，
      与卡文逐数一致）；MapStampPalette `INITIAL_LIMIT=60` 分块渲染（:7,100）确非通用 virtual list；
      ProjectSaveDialog native dialog + focus return + 禁 Esc 写盘契约成立（:31-43,78）。
    - 应用壳现状：`App.tsx:1511-1619` 工程菜单（含工程名 + ⬆️ v13/v14 升级入口）；
      `ModuleNav.tsx:9-84` 左侧 button 列无真实 href；`ModuleSubnav`（ModuleNav.tsx:55-84 +
      editor.css:489-529）误用 tablist、2 列 grid、**font-size 11px 已违反 DS-F.3 12px 下限**、
      active 用 accent color-mix 大背景——删除有独立依据，不只是审美偏好。
    - 深链基础：`editor-navigation.ts:385-399` `editorLocationHref` 已能从 location 生成真实 URL，
      无需新 router；八模块 = scene/map/story/actor/item/battle/asset/project
      （editor-navigation.ts:1-10），与十项菜单（+文件/编辑）精确对应。
    - Surface 现状：`editor.css:9573-9656` 战场中央区私有 `color-mix(panel2 76%, #111722)`、
      预览硬编码 `#050608`、卡片私有 shadow + 12px 圆角（违 DS-F.4 卡片 10px/无阴影）；且
      `--ds-media-black` 候选值即 `#050608`，canary 是 token 级替换，不需动业务布局。
    - 业务 task tabs 独立性：`ActorMode.tsx:429-433` 内部分区用自有 `role="tablist"`，不经 tabBar
      plumbing——删除 plumbing 不伤业务页内真 tabs。
    - 版本事实：`CONTENT_VERSION = 14`（character.ts:114）；`projects/pal` 已 v14；**但
      `projects/demo` 与 `projects/e2e-own` 仍为 contentVersion 12**（本人逐 manifest 读取）；
      编辑器当前可打开 v12/v13（main.tsx:112-148、open-local.ts:219-269），reforge
      `loader-v5.pal.test.ts:18` 仍 glob pal/demo/e2e-own 三工程。
  - design: **agree（2026-08-15，附必改项 K1-K3，不阻塞准入）**。四层文件边界、primitive 不碰业务
    store、command registry 单 handler、Header 十项同级 + 真实 href + Narrow 显式导航、
    surface/media 矩阵与 BattleField surface-only canary、Design Lab 固定 fixture 隔离，均与
    DS-L.6/DS-F.2a/DS-IMP.3/附录 C 逐条对齐；editor 包内闭环、不扩跨包接口、不增依赖，规模受控。
    K1 是对「旧版本兼容清理」前提的事实修正与执行顺序钉死（fixtures 未切换），不是方案变更。
- GLM:
  - premise: **verified（2026-08-15 v1.1.0 重签，本人一手读码，非代理）**。v1.1.0 delta 全部独立
    核实成立：ModuleNav button 列无 href、ModuleSubnav 2×2 grid/11px 字号/accent 大背景、战场
    `color-mix(panel2 76%, #111722)` 私有表面 + `#050608` 硬编码预览、battle 4 稳定子页、
    editorLocationHref/pushState/popstate 深链基座、升级入口完整调用域、census 复算 171/55。
    详见下方「GLM v1.1.0 独立反证审查」。
  - design: **agree（2026-08-15 v1.1.0 重签，附必落钉 N1/N2/G1-G3，非阻塞准入）**。Header 十项
    同级菜单 + 纵向真实 href 下拉 + 可定制工具栏 + 唯一 command registry + 统一表单控件 +
    surface hierarchy + BattleField surface-only canary + ModuleNav/Subnav/tabBar 删除 + 升级入口
    同卡清理——与 DS-L.6/DS-F.2a/DS-C.5-6/DS-IMP/RF-15/附录 C 逐条对齐。上轮 N1/N2 携带有效；
    新增 G1 升级删除显式清单、G2 census 重钉、G3 back/forward 烟测。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-08-15 v1.1.0 重签 + 历史 v1.0.0）+ Kimi（2026-08-15，架构/视觉主审独立反证，见下方「Kimi 独立反证审查」）
  - 独立证据锚点: 见下方三节
  - 可证伪观察: 见下方各节
- counter / 分歧处理: 任一核心 API/alias/lab 边界 counter 时保持 draft，Codex 合并修订后重新签；产品形态分歧交用户。
- 缺签豁免: N/A。Kimi 额度已恢复，用户要求恢复 Kimi 审核；本卡走 Codex/Kimi/GLM 完整三签。
- build 准入结论: **allowed（2026-08-15）——Codex/Kimi/GLM 三方 premise verified + design agree
  齐（Kimi 附 K1-K3、GLM 附 N1/N2/G1-G3，均为 build 必落钉不阻塞准入）。由 Codex 转 build。**

#### v2.0.0 Header delta 重新签字（2026-08-15）

> 用户实机否决 v1.1 的两行/可定制工具栏，并新增左侧工程名窗口身份区。当前页面只保留下方工作区标题。
> 该变化删除既有布局与交互合同，
> 按 DS-G.4 升为 v2.0.0；上方 v1.1 签字保留为历史，但不授权继续剩余 build。

- Codex:
  - premise: **verified**。真实 720px 复现旧 Header：主体 `.panel-resizer` z=30 高于 Header z=10，菜单命中
    resizer/collapse control；独立第二行实际只剩撤销/重做/保存。用户截图与浏览器 `elementFromPoint` 一致。
  - design: **agree**。单行 Header 左侧工程名 + 菜单，右侧固定三操作；Narrow 截短工程名且 Header 不重复
    当前页面，导航按模块双栏分组；无 check，soft accent 当前态；Header 专属 z token 高于 resizer。
  - implementation evidence: `EditorAppHeader.tsx`、`navigation.tsx`、`primitives.css`、`editor.css` 已形成可审
    delta；typecheck 与 editor 106 files / 787 tests 通过；720px `headerHeight=41`、horizontalOverflow=0、菜单
    bounds 100..620，交叠点 top element 为 `.ds-menu-item`，resizer z=30 / Header z=35。
- Kimi: pending（只审 v2 Header delta；K1-K3 等 v1.1 非冲突结论继续携带）
- GLM: pending（只审 v2 覆盖/测试 delta；N1/N2/G1-G3 非冲突结论继续携带）
- v2 build 准入结论: **blocked——Kimi / GLM delta 重签齐前暂停剩余实现。**

#### v2.1.0 Layout controls / compact toolbar delta 重新签字（2026-08-15，当前）

> 用户继续实机否决 sash 常驻悬浮折叠按钮和过大的 Header 操作按钮，要求 Header 集中提供左/下/右面板
> 控制，“视图”菜单提供同源命令，并让下方按钮打开真实问题/诊断 drawer。该新增 pattern 使未完成的 v2
> delta 再次变化；v2.0 Codex 自验保留为历史，不授权当前 build。

- Codex:
  - premise: **verified**。一手证据：`PanelResizeHandle.tsx:100-144` 把 resize separator 与常驻 toggle button
    放在同一 sash；`editor.css:326-399` 让按钮悬浮跨在分栏线上；`EditorAppHeader.tsx:20-46` 当前只渲染三条
    toolbar command；`App.tsx:1489-1519,1569-1589,1613-1621` 尚无视图命令/底部问题 drawer。1280 Chromium
    实测 Header `41px`，两处 `.panel-resizer-toggle` 常驻；用户截图与 DOM 一致。
  - design: **agree**。保留单行 Header/菜单 IA；新增紧凑 layout group + View menu 同源命令；sash 仅 resize；
    状态栏摘要与 diagnostics drawer 分责；本机记忆受 layout clamp；按钮按 DS-L.6 v2.1 数值收紧。
  - 可证伪观察：若现有状态栏已经是可展开、可过滤并支持问题跳转的 drawer，或 sash toggle 是唯一可访问的
    面板恢复路径，则设计不成立；读码均未发现，实施必须补 View menu/shortcut 作为无指针恢复路径。
- Kimi: **premise verified + design agree（2026-08-15，审 v2.1 架构/视觉 delta，附必落钉 VK1-VK4，
  不阻塞准入）**。本人一手复核：Codex 三处现状证据逐字属实（见下方「Kimi v2.1 独立反证审查」）；
  command registry/menu/toolbar 单 handler 结构可直接承载 view.* 同源命令；sash 删除与恢复路径、
  Narrow 语义、pressed 合同扩展、底部 drawer clamp 四项已在 VK1-VK4 钉死。v1.1 的 K1-K3 与 v2.1
  不冲突，继续携带。
- GLM: **premise verified + design agree（2026-08-15 v2.1 delta 重签，附必落钉 G4-G9，非阻塞准入）**。
  一手核实：sash 常驻 toggle 属实（PanelResizeHandle Enter/Space→onToggle 分支 :107-110 + 悬浮按钮
  CSS editor.css:326-399 + App.tsx:2416-2444 两处 toggle props）；EditorAppHeader 现仅三条 toolbar
  命令、无布局组；无 diagnostics drawer；panel-layout.test.ts 仅 35 行 clamp 数学测试。**关键发现
  G4**：ScriptDrawer :1011/:1013/:1311/:1313 + CanonicalSceneScriptWorkspaceV5 :247/:249 共 6 处仍
  依赖 toggle API——删除边界必须精确到 App shell 两处，共享组件 API 与 `.panel-resizer-toggle`
  CSS 保留。详见下方「GLM v2.1 delta 独立反证审查」。
- v2.1 build 准入结论: **allowed（2026-08-15）——Codex + Kimi（VK1-VK4）+ GLM（G4-G9）三方 v2.1
  delta 签字齐；各钉为 build 必落。由 Codex 按 v2.1 实现切片推进。**

#### v2.2.0 Bottom panel premise correction 重新签字（2026-08-15，当前 authority）

> 用户实机明确指出：“底部面板”是场景画布下方已有的脚本/演出编辑面板。v2.1 把它理解为新建全局
> diagnostics drawer，属于核心用户可见前提错误。v2.1 的三方签字和其 diagnostics 相关必落钉仅保留为
> 历史，不再授权继续 build；任务退回 `rework`，按 v2.2 纠正后重新三签。

- Codex:
  - premise: **verified（2026-08-15，独立重读现有控制链）**。一手证据：
    - `App.tsx:476` 的 `drawer` 是场景底部脚本面板唯一应用级状态；`App.tsx:2127` 的“📜 脚本”按钮切换它。
    - `App.tsx:2183` 在 canonical 场景路径渲染 `CanonicalSceneScriptWorkspaceV5`，`App.tsx:2219`
      在旧路径渲染 `ScriptDrawer`，两者均消费同一个 `drawer.open`。
    - `CanonicalSceneScriptWorkspaceV5.tsx:67,242-249,316` 已有高度记忆、水平 resize 和“上方地图演出预览 ·
      下方编辑脚本”结构；`ScriptDrawer.tsx:601,1006-1013` 也已有同类高度/resize 结构。
    - 用户 2026-08-15 截图和纠正直接指向上述场景工作区面板；新建诊断 drawer 与该对象不一致。
  - strongest alternative: 把 Header 中间按钮保留为全局 diagnostics，同时另加一个场景脚本按钮。
    - 反证：这会让同一个“底部布局”图标控制两个不同对象、留下场景既有分栏的重复入口，并违背用户明确
      指定的截图对象。若未来确实需要问题中心，应另开功能/信息架构任务，不偷用本次布局按钮。
  - falsifier: 若 `drawer.open` 不能同时控制 canonical 与 legacy 场景脚本面板，或场景页存在另一个权威 bottom
    state，则本设计需再停线；逐处读码已证明两分支共享 `drawer.open`，未发现第二个应用级权威。
  - design: **agree（v2.2 draft）**。Header 中间按钮、`视图 > 脚本面板`、Cmd/Ctrl+Alt+B 和场景工具栏
    “脚本”必须调用同一 handler；pressed/checked 来自 `drawer.open`。非场景页命令保持可见但 disabled，
    disabled reason 为“当前页面没有底部脚本面板”。删除错误的 EditorDiagnosticsDrawer、新 `.editor` 底部
    grid row、diagnostics storage/state/tests；沿用现有 canonical/legacy 高度记忆，不迁移或伪造第二套状态。
    Header/View/shortcut 可恢复后，只移除场景底部水平 sash 的常驻收起按钮，保留 resize、键盘调整与
    `ScriptDrawer` 其他内部 resizer/toggle。
- Kimi: **premise verified + design agree（2026-08-15 v2.2 delta 重签，附增量钉 WK2；其余与 GLM
  G10-G14 合并）**。五个核对问题全部一手读码独立确认，结论与 GLM 在证据层收敛；详见下方
  「Kimi v2.2 独立反证审查」。v1.1 K1-K3 与 v2.1 VK1/VK3/VK4 非冲突部分继续携带。
- GLM: **premise verified + design agree（2026-08-15 v2.2 delta 重签，附必落钉 G10-G14，非阻塞准入）**。
  一手核实：`drawer.open` 唯一应用级状态（:477）+ 📜 按钮（:2115-2127）+ canonical/legacy 双分支
  （:2183/:2219）+ 两套既有高度记忆（canonical-script-drawer-height :67 / script-drawer-height
  :601）全部属实；**错误 diagnostics 实现确实存在且比卡文删除清单更大**——除组件/state/grid 行外
  还有 `.valbar-diagnostics-button` CSS（:1215-1236）、状态栏两处按钮（:2574/:2590）、
  app-layout-commands `view.toggle-diagnostics` 命令（:33-40）——**G13 扩充零残留清单**。详见
  下方「GLM v2.2 delta 独立反证审查」。
- v2.2 build 准入结论: **allowed（2026-08-15）——Codex + GLM（G10-G14）+ Kimi（WK2）三方 v2.2
  签字齐；各钉为 build 必落。由 Codex 按 v2.2 纠正推进。**

#### Kimi v2.2 独立反证审查（2026-08-15，架构/视觉主审；本人一手读码）

**问题 1 — `App.drawer.open` 唯一 owner ✓：**
`App.tsx:476-488` 唯一定义；`!drawer.open ? <SceneCanvas> : scriptV5Session ? canonical : legacy`
三态切换（:2134）让 canonical workspace(:2182-2217）与 legacy ScriptDrawer(:2218-）消费同一
`drawer.open`；两条 onClose 均回写 `open:false`(:2208-2216);N5 引用跳转写同一 state 的
src/focusRevision 字段。grep 无第二个应用级 bottom 权威；WIP 的 `diagnosticsVisible/Height`
(:1032-1039）即 v2.2 要删的错误第二套状态。

**问题 2 — 四入口同一 handler ✓（最小正确接法）：**
registry 每 render 重建、菜单 `commandItem`、Header `toolbarCommandView`、快捷键
`executeEditorLayoutShortcut`(app-layout-commands.ts:65-83）四通道已存在；中间命令从
toggleDiagnostics 改接 drawer toggle 即同源。⌘⌥B 键位沿用（:36,74)。

**问题 3 — 非场景页禁用语义 ✓：**
可见但 disabled + reason 优于隐藏：Header IA 跨页稳定、无布局跳动、可发现性不丢，符合 DS-C.1
「disabled 给原因」;enabled 由当前 location 推导（registry 每 render 重建天然支持）;Narrow/zoom
下按钮位置不变，无歧义。

**问题 4 — 删除边界 ✓（独立定位，与 GLM G13 收敛）：**
本人逐项定位的删除面：EditorDiagnosticsDrawer.tsx(85 行）+test、editor.css 诊断规则块、
App.tsx import(:137)/DIAGNOSTICS 常量（:183 起）/state(:1032-1039)/returnFocusRef(:1041-1057)/
渲染（:2534-2567)/valbar 按钮（:2572-2596)、`.editor` 第四 grid 行回退（editor.css:19-28)、
`layout-v2:diagnostics-*` 读写代码；GLM 补的 `.valbar-diagnostics-button` CSS(:1215-1236）本人
复核属实。`app-layout-commands.ts` 改接不删；outliner/inspector/reset 三命令与 pressed 合同保留。
状态栏恢复纯文本摘要（GLM ③ 的产品取舍：删点击入口留摘要，用户要保留点击入口须另行裁决）。

**问题 5 — sash 移除边界 ✓（与 GLM G14 逐字一致）：**
grep `toggleDirection` 全仓仅三处业务残留：底部水平 sash 两处
（CanonicalSceneScriptWorkspaceV5.tsx:247-249、ScriptDrawer.tsx:1011-1013，均 onToggle=onClose）
可移除；`ScriptDrawer.tsx:1311-1313` 侧栏内部 resizer toggle 必须保留；PanelResizeHandle 共享
toggle API(:81,170-181）与 `.panel-resizer-toggle` CSS 不动（两处不再传 toggle props 即可）。

**增量必落钉（GLM G10-G14 之外的一项）：**
- **WK2（共享 toggle 的 focus 字段语义）**：📜 按钮的 setDrawer(App.tsx:2116-2124）在翻转 open 时
  **保留 src、清空 internalScriptId/commandPath、保留 focusRevision**;G10 的「同一 toggle 函数」
  必须逐字携带这套字段语义，否则从 View 菜单/快捷键关闭再开会残留陈旧内部 focus。契约测试加一条：
  先经引用跳转带 src+focus 打开，再经 View 菜单 toggle 关→开，断言 src 保留且内部 focus 已清。

**可证伪观察：**
1. 若 rg 发现 App 之外还有 `setDrawer` 或第二套 bottom state（本人 grep 未发现）,owner 结论停线重核。
2. 若某入口需非纯开关语义（如打开时定位特定脚本），共享 handler 需参数化——现有入口读码均为纯开关。
3. 若用户想保留状态栏诊断点击入口作未来问题中心种子，与附录 F「状态栏保持不变」冲突——须用户裁决。

**最强替代解释与反证**：保留全局 diagnostics 按钮、另加场景脚本按钮——同一「底部」图标控制两个
不同对象、与场景既有分栏入口重复，且违背用户截图指定对象；未来问题中心另开 IA 任务。同意 Codex
此反证，也同意 GLM 的模式备注（用户可见布局的前提默认附截图/指认对象进真值矩阵）。

Evidence: App.tsx:183,476-488,1032-1057,1069,1291,1584-1586,1658-1667,1694-1705,2113-2128,2134,
2182-2217,2534-2567,2569-2596 / CanonicalSceneScriptWorkspaceV5.tsx:67-70,240-256,316 /
ScriptDrawer.tsx:601-612,1004-1020,1303-1320 / EditorDiagnosticsDrawer.tsx:1-75 /
app-layout-commands.ts:16-83 / editor.css:19-28,1215-1236,1263-1356 / 规范附录 F:731-742。
只读审查，未改实现文件，未代签 GLM，未标 done。

#### GLM v2.2 delta 独立反证审查（2026-08-15，本人一手读码；非代理）

**premise verified — 六项一手核实：**

| Codex 声称 | 本人实测 | 核对 |
|---|---|---|
| `drawer` 唯一应用级状态 | `App.tsx:476-480` useState{open,src,internalScriptId,commandPath}——grep 无第二个 bottom 权威 | ✓ |
| 📜 脚本按钮切换它 | `:2115-2127` className tool+active 随 `drawer.open`，onClick `setDrawer` | ✓ |
| canonical 分支 | `:2182-2183` `scriptV5Session && scriptV5State` → `CanonicalSceneScriptWorkspaceV5` | ✓ |
| legacy 分支 | `:2219+` fallback → `ScriptDrawer`（消费 `focusSrcKey={drawer.src}`） | ✓ |
| canonical 高度记忆/resize | `:67-69` `useStoredPanelNumber('type-pal:editor:canonical-script-drawer-height')` + `:242-252` PanelResizeHandle(水平/min-max/Home reset/toggle down→onClose) | ✓ |
| legacy 高度记忆/resize | `ScriptDrawer.tsx:601-603` `useStoredPanelNumber('type-pal:editor:script-drawer-height')` + `:1006-1013` script-height-resizer | ✓ |

**错误 diagnostics 实现的完整残留清单（本人 grep 实测，比卡文更全）：**

| 残留 | 位置 | 卡文是否点名 |
|---|---|---|
| EditorDiagnosticsDrawer 组件 | `EditorDiagnosticsDrawer.tsx` + `.test.tsx` | ✓ |
| App import/渲染 | `App.tsx:137` import、`:2535` 渲染 | 部分（storage/state） |
| diagnostics state | `App.tsx:1032-1037` visible+height（`layout-v2:diagnostics-*` key） | ✓ |
| **`.editor` grid 第 3 行** | `editor.css:19-22` `grid-template-rows: auto 1fr auto auto` + 注释"可选诊断 drawer" | ✓ |
| **`.valbar-diagnostics-button` CSS** | `editor.css:1215-1236` | **✗ 漏** |
| **状态栏两处按钮** | `App.tsx:2574`（warn）/`:2590`（is-ok），aria-expanded 绑 diagnosticsVisible | **✗ 漏** |
| **layout 命令** | `app-layout-commands.ts:33-40` `view.toggle-diagnostics`（label 问题面板/⌘⌥B/pressed=diagnosticsVisible） | **✗ 漏**（须改接脚本面板而非保留错命令） |
| state 传递 | `App.tsx:1586` diagnosticsVisible → createEditorLayoutCommands | 部分 |

**design agree — v2.2 correction 与附录 F 逐条对齐 ✓：**
用户纠正（底部面板=场景脚本面板，非新建诊断区）→ 四入口复用 `drawer.open` 单开关 → 沿用两套既有
高度记忆（键不同属既有形态，非第二套）→ 非场景页 disabled+原因 → 删 diagnostics → sash 收窄
（水平 sash 收起按钮在恢复路径可用后移除；ScriptDrawer 侧栏 resizer 保留）。这是本卡第二次
用户纠正前提（v2.1 rail→Header 后 diagnostics→脚本面板）——premise gate 机制起效。

**六项确认 + 必落钉 G10-G14：**

1. **四入口同一 execute ✓/G10**：**G10** 契约测试——Header 中间按钮、`视图>脚本面板`、
   Cmd/Ctrl+Alt+B、场景工具栏 📜 四路径各自激活时 `drawer.open` 恰好翻转一次且调用同一
   handler（registry 三入口 + 场景按钮共用同一 toggle 函数,不得 setDrawer 直调与 registry
   execute 并存两份逻辑）。
2. **三路径渲染 ✓/G11**：**G11** 测试覆盖 canonical（scriptV5Session 有）/legacy（fallback）/
   非场景（命令 disabled + reason"当前页面没有底部脚本面板",按钮可见但不可用）。
3. **不双源 ✓/G12**：**G12** 断言无新增 bottomVisible/bottomHeight;两把既有 storage key 不改;
   `layout-v2:diagnostics-*` 代码引用零残留（用户浏览器残留旧 key 无害,不迁移）。
4. **resize/键盘/Home/恢复 ✓/G14**：**G14** 边界钉——canonical `:247-249` 与 legacy `:1011-1013`
   **水平 sash** 的收起按钮在 G10 四入口验证后移除;两处 resize/Arrow/Home/dblclick 全保留;
   **ScriptDrawer `:1311-1313` 侧栏 resizer/toggle 不在删除面**（内部业务分栏,附录 F 明确保留）。
5. **diagnostics 零残留 ✓/G13（关键钉,扩充卡文清单）**：删除面必须含上表全部 8 行,特别是卡文
   漏掉的 3 项——`.valbar-diagnostics-button` CSS、状态栏两处按钮及 aria-expanded、
   `app-layout-commands.ts` 的 `view.toggle-diagnostics` 命令（**改接脚本面板并更名/改 label/
   改 pressed 来源为 drawer.open,不是保留旧命令**）。rg 零残留门覆盖：组件名、
   diagnosticsVisible/Height、valbar-diagnostics、view.toggle-diagnostics、`layout-v2:diagnostics`。
6. **浏览器矩阵 ✓**：grid 行删除后回到 3 行;1280/900/720 + 125/150/200% 下场景页面板开/合、
   非场景页 disabled 态无横溢/无整页滚动;并入 G9 式逐档断言。

**可证伪观察：**
① 若四入口任一走独立 setDrawer 而非共享 toggle,G10 计数测试红。
② 若 grid 行删除后状态栏/主区布局塌（auto 1fr auto auto→auto 1fr auto 的行语义变化）,浏览器
   矩阵拦截——删除时须同步确认第 4 行 auto 是状态栏而非 drawer 残留。
③ 若 valbar 诊断按钮删除后状态栏失去问题摘要显示（其文案本身有信息价值）,属产品取舍——本卡
   先删按钮保留纯文本摘要（无 aria-expanded/无点击）,完整问题列表交互未来另卡;若用户要保留
   点击入口则须用户裁决。
④ 若 ScriptDrawer 侧栏收合在删除后消失,G14 边界拦截。

**模式备注**：v2.2 是 ED-DS-2 第二次用户纠正核心前提（rail→Header、diagnostics→脚本面板）。
两次均为"实机看图后纠正文档理解"——后续涉及用户可见布局的前提,建议默认附截图/指认对象进真值
矩阵,降低第三次返工概率。

Evidence: App.tsx:476-480,1032-1037,137,1586,2115-2127,2182-2183,2219,2535,2574,2590 /
CanonicalSceneScriptWorkspaceV5.tsx:67-69,242-252 / ScriptDrawer.tsx:601-603,1006-1013,1311-1313 /
EditorDiagnosticsDrawer.tsx+.test.tsx 存在 / editor.css:19-22,1215-1236 /
app-layout-commands.ts:33-40 / 规范附录 F:731-742 + RF-15:597。只读审查,未改实现文件,
未代签 Kimi,未标 done。

#### GLM v2.1 delta 独立反证审查（2026-08-15，本人一手读码；非代理）

**premise verified — 八项一手核实：**

| 卡文/Codex 声称 | 本人实测 | 核对 |
|---|---|---|
| sash 常驻 toggle 按钮 | `PanelResizeHandle.tsx:107-110` Enter/Space→`props.onToggle` 分支 + toggle JSX；`editor.css:326-399` `.panel-resizer-toggle { position:absolute; z-index:1 }` 悬浮按钮 | ✓ |
| App shell 两处 toggle | `App.tsx:2424-2426`（outliner）`:2442-2444`（inspector）传 `toggleDirection`+`onToggle` | ✓ |
| Header 无布局组 | `EditorAppHeader.tsx`（49 行）仅 DsMenuBar + DsToolbar 三命令 | ✓ |
| 无 diagnostics drawer | App.tsx grep 零命中视图命令/问题 drawer | ✓ |
| 布局测试空白 | `panel-layout.test.ts` 仅 35 行 `clampPanelSize`/`fitSidePanelWidths` 数学 | ✓ |
| registry 支持 | `app-command-registry.ts` id 唯一性 throw + `toolbarCommandView` 适配 | ✓ |
| sash 键盘能力已在 | Arrow ±16 / Home reset / dblclick reset（:111-135） | ✓ |
| **业务 resizer 依赖 toggle** | **ScriptDrawer :1011,1013（高度收合）,1311,1313（侧栏收合）+ SceneScript :247,249（收合）共 6 处** | **G4 关键** |

**design agree — v2.1 delta 与规范逐条对齐 ✓：**
附录 E 用户裁决（否决 sash 悬浮按钮/过大按钮 → Header 集中布局控制 + View 菜单同源 + 真实问题
drawer + 28×28/30px 紧凑数值）→ DS-L.6 v2.1 全文落实 → RF-15 :594 断言更新。sash 收窄为纯
resize 后键盘路径由 View menu/shortcut 补齐——设计自洽。

**八项必查核对 + 必落钉 G4-G9：**

1. **三档+zoom 无横溢 ✓/G9**：**G9** 720+200% 下菜单栏+布局组+三操作共存单行无 wrap/scroll/溢出
   的浏览器断言；并证明菜单弹层 z 序高于 sash 线（`.panel-resizer-toggle z-index:1` 即旧覆盖
   实体，删除后仍须回归钉住 DS-F.4 语义层）。
2. **布局按钮可访问性 ✓/G6**：**G6** 契约测试钉 aria-pressed 与面板状态同步、tooltip、
   focus-visible、pressed 双表达（形状/背景+aria-pressed）、28×28 命中区。
3. **三入口单 handler ✓/G5**：**G5** 每条布局命令（左/下/右/重置）View 菜单/Header 按钮/快捷键
   三入口各触发一次同一 execute 的契约测试。
4. **sash 删除 ✓/G4（关键钉）**：**删除面精确为 App.tsx:2416-2444 两处 toggle props 及其实例
   渲染；PanelResizeHandle 组件、toggle API、`.panel-resizer-toggle` CSS 全部保留**——
   ScriptDrawer 4 处 + SceneScript 1 处仍在消费（业务收合功能，非 shell 面板折叠）。rg 零残留门
   只针对 App.tsx；ScriptDrawer/SceneScript 既有 resize 测试全绿为"不误删"证据；SceneScript 还
   消费 `useStoredPanelNumber`，模块整体不可删。业务 drawer toggle 若要收走属后续业务迁移卡。
5. **localStorage 恢复 ✓/G7**：`readStoredValue` 已有非法回落（:16-21）；**G7** 补三类——非法/
   旧格式回落默认、记忆尺寸违反 DS-L.2 主区最小约束时恢复被 clamp（复用 clamp/fit 数学）、
   窄窗口恢复不挤坏主区集成测。
6. **diagnostics drawer ✓/G8**：**G8** 开启焦点进入、Esc 关闭焦点返回、独立滚动、不整页滚动/
   不挤压 Header、问题跳转落到引用目标控件（复用 reference-jump 链）。
7. **层叠顺序 ✓**：并入 G9。
8. **业务 resizer 不误删 ✓**：即 G4。

**可证伪观察：**
① 任一入口绕过 registry 直调 setState → G5 单 handler 测试红。
② 删 App shell toggle 后 ScriptDrawer 收合按钮消失/测试红 → G4 拦截误删。
③ 200% 下十菜单+布局组+三操作无法共存单行 → 回规范层升版（DS-G.4），不得缩小字号偷偷解决。
④ drawer 打开整页滚动/挤压 Header → G8 拦截。

Evidence: PanelResizeHandle.tsx:16-21,107-135,137-144 / editor.css:326-399 / App.tsx:2416-2444 /
EditorAppHeader.tsx 全文 / app-command-registry.ts 全文 / panel-layout.test.ts 35 行 /
ScriptDrawer.tsx:1011,1013,1311,1313 / CanonicalSceneScriptWorkspaceV5.tsx:247,249 / 规范 v2.1
DS-L.6:223-278 + RF-15:594 + 附录 E:717-726。只读审查，未改实现文件，未代签 Kimi，未标 done。

#### Kimi v2.1 独立反证审查（2026-08-15，架构/视觉主审；本人一手读码）

**前提核实（逐项独立读码，非复述）：**
- `PanelResizeHandle.tsx:128-177`：sash 内确含常驻 toggle button（`panel-resizer-toggle`，
  `:160-175`）；`editor.css:326-398` 让它 `position:absolute` 悬浮跨在分栏线正中。✓
- `App.tsx:1619` toolbarCommandIds = `['edit.undo','edit.redo','file.save']`，
  `EditorAppHeader.tsx:20-46` 只渲染这三条；无视图菜单、无布局组。✓
- 状态栏（valbar,`App.tsx:2454-2485`）只显示摘要 pill + 前 2 条消息内联，**不是**可展开/可过滤/
  可跳转的 drawer——Codex 可证伪条件实测为「不成立」，设计前提成立。✓
- **对 Codex 可证伪观察的一处修正**：当前 sash toggle 恰恰**是**唯一的面板恢复路径
  （`App.tsx:2426,2444` 是仅有入口，separator 的 Enter/Space 也走同一 onToggle）。这不推翻设计，
  反而把「View 菜单 + Header 布局组」从增强升级为删除 sash 按钮的**硬前提**（见 VK2）。

**状态所有权与组件边界 ✓：**
- 面板状态单一所有权在 App 壳：`useStoredPanelBoolean/Number`（App.tsx:1010-1028 等），命令在
  `createEditorAppCommandRegistry`（App.tsx:1444-1520）以闭包引用同一 state/setter；菜单项经
  `commandItem(id)`（:1522-1531）派生，Header 经 `toolbarCommandView`（app-command-registry.ts:39-49）
  派生——三入口同一 execute，新增 view.* 命令沿用此结构即无 handler 复制、无状态双源。
- primitive 边界：`DsToolbarCommand`/`DsMenuItem`（design-system/navigation.tsx:5-15,221-232）是纯
  view 合同，不读业务 store；diagnostics drawer 内容（问题列表/过滤/跳转）属 app-shell adapter，
  消费 `collectEditorStatusIssues`（App.tsx:928），不进 DsDrawer primitive——分责正确。
- 业务页私有 panel（ScriptDrawer 等）是业务 overlay，与 app-shell 三面板命名/层级无冲突；
  view.* 命令 id 命名空间隔离。

**响应式与层叠 ✓（附 VK3 待钉）：**
- 恢复 clamp：左右宽度恢复已被 `fitSidePanelWidths` + `CENTER_MIN_WIDTH` 约束（App.tsx:1050-1056），
  localStorage 非法值经 parse fallback（PanelResizeHandle.tsx:14-22）不会破坏布局；底部高度维度
  目前不存在，新增时必须同等级 clamp（VK4）。
- 层叠：v2 已修 Header z=35 > resizer z=30；底部 drawer 若为在流面板则无新层叠问题，若为 overlay
  必须用语义 z token（DS-F.4）且不得压 Header/菜单 popover。

**必落钉（build 时落实，不阻塞准入）：**
- **VK1（toggle 合同扩展）**：`DsToolbarCommand` 无 `pressed`、按钮无 `aria-pressed`
  （navigation.tsx:261-283）；`DsMenuItem` 无 `checked`（:5-15）。布局三命令是 toggle——两处合同
  必须从同一 command 派生 pressed/checked，按钮满足 DS-L.6 v2.1「形状/背景 + aria-pressed 双表达」，
  并按 DS-IMP.3 补公共 props 契约测试。
- **VK2（恢复路径硬前提）**：删除 sash toggle 必须与 View 菜单三条同源命令 + Header 布局组在
  **同一变更**内交付，禁止先删后补；`PanelResizeHandle.tsx:106-110` 的 Enter/Space onToggle 分支与
  toggle props、`editor.css:326-398` 一并移除（含 dead test/class），separator 键盘保留方向键 +
  Home 重置。
- **VK3（Narrow 语义 + 底部 drawer 合同）**：DS-L.2/附录 E 未定义 <840px 下布局三按钮语义——build
  必须明确（建议：Narrow 下按钮切换对应 drawer 开合，pressed 反映开态）并写进 RF-15 720 断言；
  底部 drawer 需独立滚动容器、不挤压 Header、不制造整页滚动；状态栏只留摘要，且新代码不得携带
  现有 valbar 的 inline style 与 `fontSize: 11`（App.tsx:2466,2479-2484，违 DS-F.3/DS-IMP.2）。
- **VK4（记忆与重置完备性）**：新增 bottomVisible/bottomHeight 复用 useStoredPanelState 同款
  fail-safe；底部高度恢复须 clamp（保留主区可用高度，类比 CENTER_MIN_WIDTH）；「重置布局」必须
  同时复位左右宽度、左右显隐、底部显隐/高度全部五项，不只复位宽度。

**可证伪观察：**
1. 若 720px 实测「3 菜单 + 6 按钮」溢出（估算约 200px 可放下，RF-15 几何断言会抓住），则 Narrow
   布局组需收入「视图」菜单——属交互合同变化，须按 DS-G.4 升版，不得边写边改。
2. 若 `collectEditorStatusIssues` 的 issue 不带可跳转 locator，drawer 的「跳转」只能覆盖已有
   locator 范围；超出即新能力，不进本 delta。
3. 若发现某业务页（如 ScriptDrawer）占用了 bottom 区域或同名 storage key，VK4 的 key 命名与
   层叠须避让——读码未发现，build 期 grep 再证。

Evidence: PanelResizeHandle.tsx:14-22,100-177 / editor.css:326-398 / App.tsx:928,1010-1056,1444-1520,
1522-1531,1615-1619,2416-2451,2454-2485 / EditorAppHeader.tsx:13-48 /
app-command-registry.ts:3-49 / design-system/navigation.tsx:5-23,221-232,261-283 /
DS-L.6 v2.1、附录 E 逐条对照。只读审查，未改实现文件，未标 done。

#### GLM v1.1.0 独立反证审查（2026-08-15 重签，本人一手读码；非代理）

> 上方「GLM 独立反证审查」（v1.0.0/横向 rail 版）保留为历史材料；其 N1/N2 结论仍有效并携带
> 至本轮。以下为对 v1.1.0 全 delta（Header/命令注册表/统一控件/surface/媒体/canary/导航删除/
> 升级清理）的独立复核。

**标准 A — 真值矩阵 v1.1.0 delta 一手核实 ✓：**

| 卡文声称 | 本人实测 | 核对 |
|---|---|---|
| ModuleNav 左侧 button 列、无真实 href | `ModuleNav.tsx:9-84`：`<button onClick>` + aria-current，无 `<a>` | ✓ |
| ModuleSubnav 2×2 grid + emoji + active 大背景 | `editor.css:489-529`：`grid-template-columns: repeat(2,…)`、min-height 30px、active 底色 | ✓（Kimi 补充 11px 字号违 DS-F.3 亦核实） |
| 战场中央私有 surface + 硬编码黑底 | `editor.css:9573` `color-mix(in srgb, var(--panel2) 76%, #111722)`；`:9645` `bf-preview-frame background:#050608` | ✓ 逐字 |
| battle 4 稳定子页 + 可复制 URL | `editor-navigation.ts:155-192` skill/enemy/poison/battlefield；`:385-399` editorLocationHref | ✓ |
| SPA history 基座已存在 | App.tsx 含 pushState/replaceState + popstate 监听 + `editorLocationHref`/`decodeEditorLocation` | ✓ |
| production 169 select / 52 checkbox | 本人 rg 复算（含 ui/*.tsx 非 test）：**select 171 / checkbox 55** | ≈ 漂移（见 G2） |
| 无既有 design-system/lab | ls 验证不存在 | ✓ |

**标准 B — DsMenuBar/Menu/Toolbar/Tooltip + command registry 依赖边界 ✓：**
- 卡文 §4a："DsMenuBar/DsMenu/DsToolbar/DsTooltip 只实现语义/焦点/键盘/positioning/overflow，
  不 import App/session/store"；registry adapter 位于 **app-shell 层**（非 design-system primitive），
  primitive 只消费命令 view——与 DS-IMP.3（primitive 不读业务 store）一致。
- 单 handler 纪律有显式测试钉："同一 command id 从三个入口只触发同一 handler 一次"（风险节）——
  防三套绑定的可证伪断言，正确。
- 导航 `<a href>` 与动作 `<button>` 分离、修饰键/中键保留原生行为——与 DS-L.6 逐条一致。

**标准 C — 导航测试覆盖核对 ✓（七项全在验收条件）：**
真实 href/aria-current/修饰键（:333-334）、菜单键盘/Esc 焦点返回（:261/:334）、720 显式导航/
overflow 无横滚（:333/:334）、工具栏 customize/持久化/重载/恢复默认（:336）、无白屏/console error
（:344）。**G3 补一项**：从 button 导航改为真实 href 后 history 语义改变（每子页切换产生历史条目），
back/forward 现有 popstate 处理虽在，主编辑器 smoke 应加一条**浏览器 back/forward 往返不白屏、
location 与视图一致**断言——App.reference-navigation 既有测试文件已在基线列表，扩展即可。

**标准 D — 通用控件矩阵 ✓：**
- RF-08 + 验收 :342-343 覆盖 default/hover/focus/open/filled/indeterminate/error/disabled/
  readonly/loading/empty + 键盘 + label 命中区 + 长值/chips overflow + 单选/多选——完整。
- 169/52 存量迁移边界：本卡只提供 primitives 作为"后续迁移唯一入口"，不迁业务页——范围正确，
  防止一张卡变成全编辑器重写。
- 大候选集：Combobox/MultiSelect "长列表采用同一 virtual/paged option source"（§3）——与
  DsVirtualList 共用，无第二套虚拟化。

**标准 E — surface/media 测试 ✓：**
- 四层对照片 + 四背景 + 纹理禁入卡片 + 战场/角色并排 canary 全在 Design Lab fixtures（§5）；
  BattleFieldTab 验收钉"中央区不再是私有浅色 mix,预览不再私有硬编码"（:338-339）——与本人核实
  的两处私有值逐字对应，token 级替换可验证。
- 1280/900/720 + 125/150/200% + DPR1/2 在 RF-01~05/RF-14——DS-L.3 全矩阵保留。

**标准 F — ModuleNav/Subnav/tabBar 删除范围闭合 ✓：**
- tabBar plumbing 实测仅 App.tsx:1748/1801 两处传递 `tabBar={moduleSubnav}`——删除面小且集中。
- 业务页内真 task tabs（如 ActorMode 内部 role=tablist 分区）不经 tabBar——Kimi 已核
  `ActorMode.tsx:429-433`，本人确认 plumbing 与业务 tabs 无耦合。
- 深链保留：module/page/object URL 不变（验收 :353"相同 module/page 深链"）；引用跳转测试
  （App.reference-navigation.test.tsx）在基线列表。

**标准 G — 升级入口调用域（旧版本兼容审查）✓ + 必落钉 G1：**
本人 grep 实测完整调用域：App.tsx:1571/1586 两个按钮 → upgradeToV13(:1462)/upgradeToV14(:1487)
→ open-actions.ts:102 `upgradeProjectToV13`/:112 `upgradeProjectToV14` → upgrade-local-v12-v13.ts /
upgrade-local-v13-v14.ts（+各一测试文件）。open-local 主打开链**不直接调用**这两个 upgrader
（仅显式按钮路径）。

**旧版本兼容审查：pass（附 G1 执行钉）**。卡文"删除无调用的 upgrader…而非仅隐藏菜单"方向正确；
Kimi K1 已发现并钉死执行顺序前提（demo/e2e-own fixtures 仍 v12，须先重生成再删）。G1 补显式
删除清单：build 收口时删除面必须逐文件列出——App.tsx 两按钮+两 handler、open-actions.ts 两导出
函数、两个 upgrader 模块、两个专属测试、相关 saveActivity disabled 分支——并以 rg 零残留作为
静态门（与 tabBar 删除同标准）。若任何真实输入无法重建，按卡文转 blocked 请用户裁决，不保留兼容层。

**必落钉汇总（build 必落，不阻塞准入）：**
- **N1/N2（上轮携带）**：tokens.css 兼容 alias 表逐条显式覆盖 editor.css:2-18 全部 15 变量；
  静态门验全部 legacy alias 解析到非空 semantic 值（防 --acc→--accent→semantic 双层链 dangling）。
- **G1（升级删除显式清单）**：如上,删除面逐文件 + rg 零残留静态门。
- **G2（census 重钉）**：卡文 169/52 已漂移至本人实测 171/55（工作树演进）。census 只是规模语境
  非断言值——build 时重跑一次并把最终数字写回本卡，防后来者误当冻结基线。
- **G3（back/forward 烟测）**：真实 href 导航改变 history 语义；主编辑器 smoke 增加 back/forward
  往返断言（popstate 已有处理,但从未在按钮→链接切换后整链验证）。

**标准 H — Design Lab RF-01~RF-15 可验收性 ✓：**
15 个 fixture 逐项有：自动测试（component contracts + static boundary）、浏览器证据（真实
Chromium bounding box/overflow/console）、明确失败条件（非法 fixture 可恢复错误、性能 p95 数字、
挂载行数上限）。截图仅作说明性证据,不替代功能断言（§6 + 验收红线）——与 DS-T.3 自动检查矩阵
一致。fixture 全部固定本地数据,不读工程——测试可重复,不依赖 PAL 当前数据。

**premise verified — v1.1.0 delta 独立核实（5 项）：**
1. 规范 v1.1.0 实存（699 行;DS-F.2a:118-134、DS-L.6:223-258、RF-15:576、附录 C:683-690）。
2. 应用壳现状与卡文逐条吻合（ModuleNav/Subnav/App shell/工程名菜单/升级按钮）。
3. 深链基座（editorLocationHref + pushState/popstate）已存在,新 Header 无需新 router。
4. 升级调用域完整测绘（如上）。
5. 无既有 design-system/lab/registry（ls + rg 验证）。

**design agree — v1.1.0 全 delta 与规范对齐：**
Header/菜单/工具栏→DS-L.6；surface/media→DS-F.2a；统一控件→DS-C.5-6；primitive 边界→DS-IMP.3；
RF-15→DS-T.2；治理→附录 C/DS-G。"app-shell 首个生产采用 + 业务布局不迁"的窄边界正确控制爆炸半径。

**可证伪观察：**
① 若删除 tabBar plumbing 后某业务页隐藏依赖 moduleSubnav 渲染（本人只见 1748/1801 两处,但若有
  动态引用）,引用跳转测试会红——build 时以 App.reference-navigation 全绿为删除完成标准。
② 若真实 href 菜单在 Chromium 中 Cmd+Click 打开新 tab 后该 tab 无法独立恢复工程状态（URL 可恢复
  但 FSA 句柄不可跨 tab）,这是已知平台限制,菜单仍须保留原生修饰键行为并在新 tab 显示无工程空态,
  不得退回 onClick 按钮。
③ 若 command registry 在实现中被塞进 design-system primitive（违反 DS-IMP.3）,静态 boundary test
  应红——registry adapter 只能住 app-shell 层。
④ 若 v12/v13 升级入口删除后仍有 fixtures/测试链需要旧版本（Kimi K1 的 demo/e2e-own v12）,按 K1
  顺序先重生成 fixtures 再删,删除被阻塞时转 blocked 而非保留。

Evidence: 规范 v1.1.0:118-134,223-258,576,683-690 / ModuleNav.tsx:9-84 / editor.css:489-529,9573,
9645 / editor-navigation.ts:155-192,385-399 / App.tsx:1462,1487,1571,1586,1748,1801 + pushState/
popstate / open-actions.ts:102-119 / upgrade-local-v12-v13.ts+v13-v14.ts 存在 / census rg 171/55 /
ActorMode.tsx:429-433 业务 tabs 独立。只读审查,未改实现文件,未代签 Kimi,未标 build/done。

#### GLM 独立反证审查（2026-08-15，本人一手读码；非代理）

**标准 1 — 边界合理性（目录/API/lab 隔离）✓：**
- `vite.config.ts:85-93` 确认 main/play 双 build input——追加 `designLab` 条目零结构性风险。
- `main.tsx:44` 只 `import './ui/editor.css'`——lab 走独立 `design-lab.html`+`src/design-lab.tsx`
  即天然隔离，无共享 bundle 污染路径。
- `design-system/` 目录与 `design-lab.html` **均不存在**（本人 ls 验证）——无重复基础，卡文
  "仓库没有现成 design-system 目录"属实。
- primitive 禁 import content/reforge/editor core + lab 禁 import App/项目 I/O——依赖方向单向，
  与 DS-IMP.3 一致。
- 不新增 npm 依赖、native `<dialog>` 先例已在 ProjectSaveDialog 验证（:25-43 showModal + focus
  return + 禁 Esc-只关-UI 的写盘契约）——技术上可落地。

**标准 2 — legacy alias 全局影响量化 ✓（本人逐值对照，关键增量证据）：**

| legacy | 值 | → semantic | 值 | 结果 |
|---|---|---|---|---|
| --bg | #1b1d23 | --ds-surface-canvas | #1b1d23 | 同值 |
| --panel | #232732 | --ds-surface-panel | #232732 | 同值 |
| --panel2 | #2b303c | --ds-surface-raised | #2b303c | 同值 |
| --panel3 | #2f3542 | --ds-surface-overlay | #2f3542 | 同值 |
| --fg | #d7dce5 | --ds-text-primary | **#edf1f7** | **变更**（变亮） |
| --accent | #4c9aff | --ds-action-primary | **#5aa2ff** | **变更**（变亮） |
| --warn | #e2b340 | --ds-status-warning | #e2b340 | 同值 |
| --err | #e05b5b | --ds-status-danger | **#f27d84** | **变更**（变亮） |
| --ok | #58b37a | --ds-status-success | **#63c786** | **变更**（变亮） |

**4/9 值变更，全部朝向对比度提升**（ED-DS-1 终审已实测新值全部达标）；4 个 surface 不变意味着
布局/层级零变化，风险集中在文字/状态色可读性——主编辑器 1280/900/720 smoke + console 零 error +
最小 compat fix 的缓解策略与风险量级匹配。影响有界，受控。

**必落钉 N1（alias 表显式穷尽）**：卡文 §2 写"`--bg -> --ds-surface-canvas`、
`--panel -> --ds-surface-panel` 等"——"等"不可作为实现合同。build 时 tokens.css 底部的兼容
alias 表必须**逐条显式**覆盖 editor.css:2-18 全部 15 个变量，含 `--dim → --ds-text-secondary`、
`--faint → --ds-text-muted`、`--line → --ds-border-subtle`、`--mono`/`--sans`（保留原值）、
`--acc`（链至 --accent）。任何无对应语义名的 legacy 变量须在卡内记录处置。

**必落钉 N2（alias 链验签）**：`--acc: var(--accent)` 是双层链——--accent 改指 semantic 后
--acc 需经两层解析。静态边界测试除禁直接颜色外，应加一条"全部 legacy alias 解析到非空 semantic
值"的 contract 断言，防 dangling var 引用（jsdom 下 var 未定义会静默继承，浏览器才暴露）。

**标准 3 — RF-01～RF-14 / a11y / 浏览器 / 性能门禁完整性 ✓：**
- 14 个 RF fixture 覆盖 DS-T.2 全表 + 本卡追加的 zoom 200%（RF-14）；DS-L.3 六行矩阵全部有
  fixture 对应（RF-01~05）；a11y（键盘/焦点/reduced-motion/dialog trap）在 component 测试 +
  RF-13/RF-14 双层；性能按 DS-PERF.1 原文（20 次 p95/动画帧/long task + 环境证据）。
- 主编辑器 smoke（palette 切换后启动/切模块/开关保存 dialog/无白屏/console 零 error）已列入
  验收——这是 alias 全局影响的关键回归闸。
- 无剧情 E2E 越界（N/A 声明正确）。

**标准 4 — 过度抽象 / 漂移 / 测试自证 ✓：**
- 过度抽象：primitive 只实现规范已列语义、四类差异留 recipe slot、领域差异留模块——三段式
  职责切分明确；"不用 mega-component 模拟四类"写入明确不做。
- Lab/生产漂移：Lab 直接 import 同一 `index.ts`/CSS 不复制组件 + 版本常量入页面——无第二真源。
- 测试自证：jsdom + 真实 Chromium 双层 + "测试失败必须复现根因不得只更新 snapshot" + 性能须
  存原始 20 次 JSON 与环境信息。静态边界 test 扫自身目录（hex/私有断点/transition:all）是客观
  文本断言，可被独立复跑——不构成自证。
- 500 vs 50+ 虚拟化门槛差异已如实记录为规范既定值，不静默改 DS v1.0.0。

**premise verified — 独立核实：**
1. 无既有 design-system/lab（ls 验证）。
2. 多页入口可行（vite.config 实读）。
3. MapStampPalette `INITIAL_LIMIT=60` 分块 + filter —— 确非通用虚拟列表。
4. ProjectSaveDialog native dialog + focus-return —— 先例成立。
5. index.html preboot `#1a1a1a` ≠ canvas `#1b1d23`，且无 color-scheme/theme-color meta——
   卡文"未绑定设计系统"属实，本卡补齐正确。

**design agree：**四层文件结构、token/alias 策略、primitive/recipe 合同、lab fixtures、四层证据
门与规范 §9-11 逐条对齐；"先切 palette 不迁布局"的窄边界让主编辑器风险最小化。

**可证伪观察：**
① 若 build 中发现某 legacy selector 在新 4 个变亮色下不可读（如深色 badge 文字叠 --err 背景），
  smoke 应捕获；最小 compat fix 允许，但若需要改 >10 处业务 selector 即说明 palette 假设有误，
  应回卡重审 alias 策略。
② 若 design-lab.html 与 main 的 Vite dev/build 同源出现 HMR/端口冲突（main.tsx 独立 css import
  理论上无冲突），按卡文已列 fallback 退为开发可见隔离 route。
③ 若 VirtualList 在 Chromium 固定机上 20 次 p95 无法稳定 <100ms（jsdom 无法测此），性能门
  应保留原始数据并声明机器范围，不得静默放宽 DS-PERF.1。

Evidence: vite.config.ts:85-93 / editor.css:1-18 / index.html:1-17 / main.tsx:44 /
MapStampPalette.tsx:7,33-65 / ProjectSaveDialog.tsx:18-43 / ls design-system+design-lab.html 不存在 /
本人 9 组 palette 对照表。只读审查，未改实现文件，未代签 Kimi，未标 build/done。

#### Kimi 独立反证审查（2026-08-15，架构/视觉主审；本人一手读码）

**标准 1 — 架构边界与依赖方向 ✓：**
- design-system 仅 editor 包内、`index.ts` 显式 export surface、不改 package exports、不增依赖——
  跨包公共接口零膨胀。primitive 禁 import content/reforge/editor core，command registry 放
  app-shell、primitive 只消费 command view（id/label/icon/enabled/disabled reason/execute/scope/
  placement）——依赖方向单向，handler 只有一份；「菜单/工具栏/快捷键同一 command id 只触发同一
  handler 一次」已列入测试断言，handler 复制风险有门禁。
- mega-component 风险由「recipe 只管槽位/响应式/滚动 + 禁止几十个布尔 props 模拟四类」约束，
  与 DS-IMP.3 一致；模块导航数据继续用 `EDITOR_MODULES` 单一来源，不另建表。
- Design Lab 隔离：`vite.config.ts:85-93` 多页 input 先例、`main.tsx:44` 单 css import——
  lab 独立入口天然不共享 bundle；卡文禁 import App/项目 I/O/projects 数据，边界可静态测试守住。

**标准 2 — Header 信息架构与交互 ✓：**
- 文件/编辑与八模块同级：八模块实存（editor-navigation.ts:1-10），十项菜单与之一一对应；
  工程名移出 Header 改 document.title/文件菜单/项目设置页——当前工程名菜单（App.tsx:1511-1519）
  即被替换对象，无信息丢失（重命名/新建/打开/另存为/导出全部进入文件菜单）。
- 真实 href：`editorLocationHref`（editor-navigation.ts:385-399）已存在，模块/子页用 `<a href>` +
  SPA 点击拦截即可保留 Cmd/Ctrl+Click/中键/复制链接；当前 ModuleNav/ModuleSubnav 全是 button
  onClick（ModuleNav.tsx:21-35,70-80），新方案严格改善了深链语义。DS-L.6 键盘合同
  （Left/Right/Home/End、Down/Enter 打开、Esc 焦点归还）与 RF-15 断言完整。
- 720px：DS-L.6 明确「文件/编辑/导航」三入口 + 完整纵向列表，禁横滚/屏外入口；工具栏不换行不缩小、
  低频进「更多」——无隐藏入口路径。白屏风险由主编辑器三档 smoke + 页面 error boundary
  （DS-C.8）覆盖。
- 工具栏本机自定义：localStorage 带版本号 + 白名单 command id + 恢复默认；App.tsx 已有
  `useStoredPanelNumber/Boolean` localStorage 先例（App.tsx:1010-1028），模式一致，不写工程数据。

**标准 3 — surface/media 矩阵与 BattleField canary ✓（边界已钉死）：**
- 现状违规属实（editor.css:9573-9656：中央区私有 color-mix 浅底、预览硬编码 #050608、卡片私有
  shadow + 12px 圆角）；DS-F.2a 的 canvas→panel→raised→overlay 与四模式媒体背景可直接映射，
  `--ds-media-black` = `#050608` 与现有硬编码同值，canary 预期是纯 token/class 级替换。
- canary 范围：卡文明确「不重排字段、引用或业务命令」；BattleFieldTab 业务布局（左列表/中卡片/
  右引用）不在本卡动。

**标准 4 — 统一表单 primitives 合同 ✓：**
- DS-C.5/C.6 + RF-08 状态矩阵（11 状态、indeterminate、单/多选键盘、焦点归还、长值/chips overflow、
  未知引用 fail-visible）覆盖完整；169 select/52 checkbox 的 production census（本人复算）证明
  统一入口的真实需求。Select/Combobox/MultiSelect 分工（短枚举/可搜索单选/多选 chips）语义不重叠。

**标准 5 — 删除旧导航/tabBar plumbing 的边界 ✓：**
- 深链保留：URL query schema 不动、`editorLocationHref` 复用、acceptsObject 行为不变。
- 业务 task tabs 不受影响：ActorMode 内部分区是自有 tablist（ActorMode.tsx:429-433），与
  ModuleSubnav plumbing 无关；tabBar prop 摘除是纯机械删除（DataMode/ImageTab/EnemyTab 等约 20 处
  透传 + WorldSpriteLibrary.test.tsx:186 等测试），不改变业务组件挂载。
- ModuleSubnav 删除另有独立依据：11px 字号违反 DS-F.3 下限、2×2 宫格已被用户否决。

**标准 6 — 旧版本兼容审查结论（按 agent-workflow 单列）：**
- 当前编辑器**不是**只开 canonical v14：main.tsx:112-148 与 open-local.ts:219-269 仍在打开
  v13/v12 工程；App.tsx:1562-1587 提供 v12→v13、v13→v14 原地升级（handler App.tsx:1462-1507 →
  open-actions.ts:100-120 → upgradeLocalProjectV12V13/V13V14）；ProjectSaveDialog 有
  upgrading-v13/v14 分支（:9-10,50-67）；v13 双读分支散布于 App.tsx:1331,2260,2288、
  script-v5-editor.ts:863、project-diagnostics.ts:551,603、project-io-v5.ts:271。
- 政策方向（开发期只开当前 canonical、旧版本早失败提示重迁）已冻结，删除方向正确；migrate
  当前产出 v14（pal-c1 系列测试），PAL 已 v14。
- **但卡文前提「当前 PAL 与 fixtures 已切换」不成立**：projects/demo 与 projects/e2e-own 实测仍为
  contentVersion 12，且 reforge loader-v5.pal.test.ts:18 glob 消费这两个工程。→ 见必改项 K1。

**必改项（build 时落实，不阻塞准入）：**
- **K1（旧版本清理的前提修正与调用域闭环）**：build 第一步必须先处理 fixtures——demo/e2e-own
  切换/重建为 v14（并同步处理 reforge loader-v5.pal.test.ts 的 glob 输入变化；reforge runtime 本身
  不动），再删除 v12/v13 打开与升级链路；删除集按调用域枚举：App.tsx:1462-1507,1562-1587、
  open-actions.ts:100-120、main.tsx:112-148、open-local.ts:219-269、ProjectSaveDialog upgrading
  分支、App.tsx:1331/2260/2288、script-v5-editor.ts:863、project-diagnostics.ts:551/603、
  project-io-v5.ts:271，以及 content 包 v12→v13→v14 upgrader 与 LegacyV9/V11 历史类型
  （enemy.ts:108-119 等）的消费方审计（migrate 是否仍需要须用 grep 证据回答）。若 e2e-own 含
  不可重建的手工内容，按卡文既有条款转 blocked 请用户批准临时例外，不自行保留。
- **K2（canary 可审查性）**：BattleFieldTab 改动必须 surface-only——token/class/媒体背景级替换，
  不重组字段 JSX；review 按 diff 逐项核对，越界即返工。
- **K3（alias 冒烟量化闸）**：采纳 GLM 可证伪观察①为硬阈值——alias 切换后若需改 >10 处业务
  selector 才能恢复可读性，说明 palette 假设有误，回卡重审 alias 策略，不得继续堆 compat fix。
- 附记（非必改）：编辑菜单中剪切/复制/粘贴/查找/命令面板等项以现有真实命令为准，无真实 handler
  的命令不得作为占位项上菜单（防假功能入口）；命令面板按 DS-L.6 属未来入口，不在本卡。

**可证伪观察：**
1. 若 demo/e2e-own 可由既有生成流程确定性重建为 v14（blank seed 已是 v14），K1 的 fixtures 切换
   无阻塞；若 e2e-own 含手工内容且无生成器，则删除 v12 打开路径会毁真实输入——按卡文转 blocked
   请用户裁决。
2. 若 grep 证明 content 包 upgrader 链或 Legacy 类型仍被 migrate/测试消费，删除集必须缩小到
   editor 侧入口并保留被消费部分——不得为「清理干净」误删活代码。
3. 若 900px Medium 下十项菜单实测溢出（估算 ~24 个汉字 + padding 可放下，RF-15 会证伪），
   按规范应触发 DS-G.4 升版讨论，不得边写边改断点。
4. 若 design-lab 与 main 同源 dev/build 出现冲突（理论无共享 bundle），按卡文 fallback 退隔离
   route，仍不读工程。

**过度抽象/范围复核**：单包内部目录 + 无新依赖 + 四层证据门 + 「先建尺后迁移」顺序符合
DS-G.1；RF-01～RF-15 与 DS-T.2 一一对应，N1/N2 保留。规模是大的，但每一块都有冻结合同与
fixture 对应，未发现无合同的抽象层。

Evidence: editor.css:1-18,489-529,9573-9656 / App.tsx:1010-1077,1331,1440-1619,2260,2288 /
ModuleNav.tsx:9-84 / editor-navigation.ts:1-10,385-399 / index.html:8-10 / main.tsx:44,95-148 /
open-local.ts:219-269 / open-actions.ts:100-120 / ProjectSaveDialog.tsx:9-10,31-43 /
MapStampPalette.tsx:7,100 / ActorMode.tsx:429-433 / character.ts:114 / 三个工程 manifest 实测 /
loader-v5.pal.test.ts:18 / production census 169+52 本人复算。只读审查，未改实现文件，未代签
GLM，未标 build/done。

### 进入 done 前:审查签字

- Codex: **accept（v2.2 correction 自验通过，2026-08-15）**。四入口同源、非场景禁用、错误 diagnostics
  删除、水平 sash 收起按钮删除边界、WK2 focus 语义和全量 editor 回归均通过；不代签 Kimi / GLM。
- Kimi: **accept（2026-08-16 done 前架构/视觉复审，本人一手读码，非代理）**。
  只审 v2.2 correction，逐项复核：
  - **四入口同一 handler ✓**：View 菜单（App.tsx:1670）、Header 布局组（:1705）、⌘⌥B
    （app-layout-commands.ts:110）、场景工具栏 📜（App.tsx:2128）全部收敛到同一
    `toggleScriptPanel` useCallback（:1069-1072），唯一开关变换为
    `setDrawer(toggleSceneScriptPanelState)`；抽查其余 setDrawer 调用点（:535-541 落点选择关闭、
    :559-565 引用跳转带上下文打开）均为显式开合，无第二套 bottom authority。
  - **WK2 ✓**：`toggleSceneScriptPanelState`（app-layout-commands.ts:26-36）保 `src`/
    `focusRevision`、清 `internalScriptId`/`commandPath`，与旧 📜 按钮语义逐字一致；
    `resetLayout` 经 `closeSceneScriptPanelState`（App.tsx:1078）同样保 src。
  - **sash 边界 ✓**：canonical（CanonicalSceneScriptWorkspaceV5.tsx:251-262）与 legacy
    （ScriptDrawer.tsx:1002-1014）水平 sash 仅剩 resize/Home，无 toggle props；legacy 侧栏内部
    toggle（ScriptDrawer.tsx:1298-1314）完整；`.panel-resizer-toggle` CSS 16 处与共享 API 保留。
  - **非场景禁用与壳 ✓**：`scriptPanelAvailable` 按 location 推导（App.tsx:1060），命令
    disabled+reason（app-layout-commands.ts:71-73）、handler 双保险（:1070）；
    `.editor` grid 回三行（editor.css:21 `auto minmax(0,1fr) auto`）；diagnostics DOM/CSS/state
    rg 零命中（本人复跑）；状态栏恢复纯摘要 pill（App.tsx:2534-2537）。
  - **VK1 附验 ✓**：toolbar `aria-pressed`（navigation.tsx:278）、菜单 `menuitemcheckbox` +
    `aria-checked`（:337-338）。
  - 视觉/实机：采用 Codex Chromium 1280×720 四入口证据 + 用户实机验收 + GLM 独立复跑
    （118 files/872 tests），不重复跑已有证据的同一视觉流程（AGENTS.md 分层）。
  - 范围纪律：ED-INSPECTOR-TABS-1/ED-CATALOG-CONTROLS-1 进行中改动未计入本卡结论。
- GLM: **accept（2026-08-16 done 前覆盖/测试复审，本人一手读码 + 独立复跑，非代理）**。
  v2.2 correction 全部必落钉独立验证通过：
  - **G13/G12 零残留门本人 rg 复跑**：`EditorDiagnosticsDrawer|diagnosticsVisible|diagnosticsHeight|
    toggleDiagnostics|toggle-diagnostics|valbar-diagnostics|layout-v2:diagnostics|DIAGNOSTICS_` 与
    `bottomVisible|bottomHeight` 在 packages/editor/src 均零命中；两把既有 storage key 原名未动
    （ScriptDrawer.tsx:600 / CanonicalSceneScriptWorkspaceV5.tsx:68）；`.editor` grid 回到三行
    （editor.css `.editor` auto/minmax(0,1fr)/auto）。
  - **G10 单 toggle 审计**：全部 `setDrawer(` 调用点逐一核对——唯一开关变换是 App.tsx:1071
    `setDrawer(toggleSceneScriptPanelState)`；其余 10 处（:535,:559,:600,:635,:686,:752,:769,:819,:833
    及 resetLayout :1078）均为切场景/引用定位的显式开合（带明确字段值），非第二套 toggle。四入口
    （视图菜单 App.tsx:1670 / Header 布局组 :1705 / ⌘⌥B app-layout-commands.ts:110 / 场景工具栏 📜
    App.tsx:2128）收敛到同一 `toggleScriptPanel` useCallback（:1069-1072）。
  - **WK2 字段语义**：`toggleSceneScriptPanelState`（app-layout-commands.ts:26-36）保 `src`+
    `focusRevision`、清 `internalScriptId`/`commandPath`，逐字落地；契约测试
    `pure panel toggles preserve source context and clear stale internal focus`（test:67-85）覆盖
    关→开往返。
  - **G11 非场景禁用**：`enabled: scriptPanelAvailable` + `disabledReason:'当前页面没有底部脚本面板'` +
    pressed 门控（app-layout-commands.ts:71-73）+ handler 守卫（App.tsx:1070）+ 专项测试（test:52-65）。
  - **G14 sash 边界**：canonical（:251）与 legacy 高度 sash（:1002-1004）均无 toggle props 仅 resize；
    ScriptDrawer 侧栏内部 resizer（:1298-1308 toggleDirection/onToggle）完整保留；PanelResizeHandle
    共享 toggle API（:81-,:116-,:170-）与 `.panel-resizer-toggle` CSS（editor.css 16 处）未误删。
  - **VK1 附验**：toolbar 命令 `aria-pressed`（navigation.tsx:278）、菜单 pressed 命令渲染为
    menuitemcheckbox + aria-checked（:337-338）。
  - **回归本人独立复跑**：focused 2 files/7 tests、typecheck、全量 118 files/872 tests 全绿；v2.2
    核心文件（App.tsx/app-layout-commands/CanonicalSceneScriptWorkspaceV5/ScriptDrawer/PanelResizeHandle/
    editor.css/EditorAppHeader）git status 干净、已提交。备注：复跑中途曾抓到 ProjectWorkbenchTab
    `ProjectIssuesAside` 瞬时类型错误，属 ED-INSPECTOR-TABS-1/ED-CATALOG-CONTROLS-1 进行中工作树的
    并行编辑（数分钟后自愈、与 v2.2 改动面无关），已如实记录。
  - **遗留如实登记**：原验收清单中 900/720/zoom/Design Lab RF fixture 完整截图矩阵卡内未单独留证
    （Codex 记录"后续收口"）。用户已于 2026-08-16 明确验收通过（见用户验收节），该矩阵按用户裁决
    不再阻断 done；如需补证属收口动作。
- counter / 返工处理: 无（Kimi 侧亦无返工项）
- 缺签豁免: N/A
- done 准入结论: **met（2026-08-16）——Codex + GLM + Kimi 三方 accept 齐，用户已验收；整卡 done。**

## 额度 / 代班记录

- 缺席 Agent: 无（Kimi 额度已于 2026-08-15 恢复，本卡由 Codex/Kimi/GLM 完整三签）
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: 否——Kimi 已于 2026-08-15 完成 v1.1.0 build 前复审并签字，豁免路线已撤销
- 用户裁决: 2026-08-15 用户要求恢复 Kimi 审核；已执行

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: v2 Header / layout command / Scene workspace / canonical + legacy script drawer / editor CSS /
  design-system version 与对应测试。删除错误 `EditorDiagnosticsDrawer.tsx` 及测试。
- 实现摘要: v2.2 correction 已完成。`view.toggle-script-panel`、Header 中键、视图菜单、场景工具栏
  `📜 脚本` 与 `⌘⌥B` 共同调用 `toggleScriptPanel`，唯一修改 `App.drawer`。开关保留 `src` 与
  `focusRevision`，清空 `internalScriptId` / `commandPath`；非场景页 disabled 并显示原因。错误
  diagnostics state/storage/grid/CSS/status-button 全部删除；状态栏恢复摘要；canonical/legacy 水平 sash
  只保留 resize/Home，删除收起按钮，legacy 内部侧栏 toggle 保留。
- 运行命令: `pnpm --filter @type-pal/editor exec vitest run src/ui/app-layout-commands.test.ts
  src/ui/CanonicalSceneScriptWorkspaceV5.test.tsx`（2 files / 6 tests）；
  `pnpm --filter @type-pal/editor typecheck`；`pnpm --filter @type-pal/editor test`（109 files / 798 tests）；
  `pnpm --filter @type-pal/editor build`（main/play/designLab 三入口成功；仅既有 chunk-size warning）；
  `git diff --check`。
- 零残留门: `EditorDiagnosticsDrawer|diagnosticsVisible|diagnosticsHeight|toggleDiagnostics|toggle-diagnostics|
  valbar-diagnostics|layout-v2:diagnostics|DIAGNOSTICS_` 在 `packages/editor/src` 无命中。
- 浏览器 / 手工检查: Chromium 1280×720。场景页四入口逐一开关同一 canonical script workspace，Header
  `aria-pressed` 同步；水平 sash 收起按钮计数 0；无 diagnostics DOM。切换至
  `?module=battle&page=skill` 后脚本面板按钮 disabled、`aria-pressed=false`、tooltip 为
  “当前页面没有底部脚本面板 · ⌘⌥B”，无空底部行/抽屉；console error 0。浏览器最终留在
  `?module=scene&page=workspace&object=s000` 且真实脚本面板打开，供用户验收。
- 跳过的检查及原因: v2.2 correction 无跳过项；ED-DS-2 全卡的 900/zoom/Design Lab 完整截图矩阵仍按
  原验收清单在后续 build 收口，不以本次 1280 功能证据替代。

## 资源生成记录

N/A：本卡使用 CSS、React 和 code-native SVG，不生成位图资产。

## 视觉验证记录

- Visual Verification Owner: Codex + User
- Visual Verification Timing: dev-functional
- 验证方式: v2.2 correction complete；主编辑器真实 Chromium 1280×720 视觉、DOM 与四入口交互检查。
- 集中 E2E 用例 / 批次: N/A（功能性 Design Lab）
- 截图 / 像素检查路径: 本 Codex 任务 2026-08-15 in-app Browser 截图；浏览器保持在 s000 场景脚本面板
  打开状态。
- 结论: v2.2 底部面板纠正通过 Codex 功能/视觉自验；打开的是用户指定的既有地图下方脚本编辑面板，
  不再存在第二个诊断抽屉。
- 未完成项: 900/zoom/Design Lab 全矩阵仍随 ED-DS-2 剩余 build 收口；Kimi / GLM done 前独立复审待完成。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: v2.2 Coding Owner 自验通过；GLM done 前覆盖/测试复审 accept（2026-08-16）；
  Kimi done 前架构/视觉复审 accept（2026-08-16，四入口单 handler/WK2/sash 边界/非场景禁用/
  零残留/VK1 逐项一手复核，见推进签字 Kimi 条目）。
- 必须返工项: 无。
- Accept / rework: Codex accept + GLM accept + Kimi accept——三方齐，整卡收口。

## 用户验收

- 用户结论: **通过（2026-08-16）**。用户明确表示"我本人已经通过了"，覆盖 ED-DS-2 当前实现状态
  （v2.2 单行 Header + 布局控制 + 底部面板接场景既有脚本面板的形态）。原验收清单中 900/720/zoom/
  Design Lab 完整截图矩阵未单独留证，按用户本次验收裁决不再阻断 done。
- 后续任务: ED-AUDIT-2 全编辑器三线审计；随后资源图像、战斗等模块按优先矩阵迁移。

## 交接日志

- 2026-08-15 User: `ED-DS-1：六项通过`，冻结设计系统 v1.0.0，并要求继续推进。
- 2026-08-15 Codex: 读取规范、当前 Vite/CSS/批量列表/dialog 一手实现与最新 Web Interface Guidelines；
  建立 ED-DS-2 draft，明确独立 Design Lab、内部 primitive surface、palette alias 风险和 RF-01～RF-14 门禁。
  当时 Next: GLM 独立设计审查；该额度豁免路线已于 Kimi 额度恢复后撤销。
- 2026-08-15 GLM: 签 premise verified + design agree（附 N1-N2 build 必落钉）。一手核实：无既有
  design-system/lab、多页入口可行、MapStampPalette 确非虚拟列表、native dialog 先例成立、preboot
  未绑设计系统；量化 alias 漂移 4/9 值变更全部朝向对比度提升、surface 不变——影响有界。当时 Next:
  申请 Kimi 缺签豁免后 Codex 进 build；该路线现已撤销。N1（15 变量显式 alias 表）与
  N2（alias 链验签）仍作为 build 必落钉保留。
- 2026-08-15 User + Codex: 用户否决 2×2 emoji 二级入口，也否决狭窄区域横向 rail；最终定形为两行
  Header——第一行同级文件/编辑/八模块菜单，工程名移出；模块子页纵向 dropdown；第二行图标+tooltip 的
  可定制快捷工具栏，菜单/工具栏/快捷键共享命令注册表。用户同时要求统一 Select/MultiSelect/Checkbox 等
  常用控件，并冻结“开发期重迁后删除旧兼容代码”规则。规范升为 normative v1.1.0；旧 GLM rail 签字失效。
  Next: Kimi 与 GLM 分工独立复核新 delta；两方重签后进入 build。
- 2026-08-15 User + Codex: 用户对照战场/角色页指出 surface hierarchy 不一致：正常中央编辑平面应偏深，
  媒体纹理应按内容类型统一，战场页大片浅底不合格。规范新增 DS-F.2a，RF-09 扩为 surface/media matrix；
  ED-DS-2 将 BattleFieldTab 纳入 production canary，仅迁 surface role，不重排业务内容。
- 2026-08-15 User: Kimi 额度恢复，要求后续恢复 Kimi 审核。Codex 撤销缺签豁免路线；ED-DS-2 需 Kimi
  架构/视觉签字与 GLM 覆盖/测试签字均齐后才能进入 build。
- 2026-08-15 GLM: v1.1.0 全 delta 重签 premise verified + design agree（N1/N2 携带 + G1-G3 新钉）。
  一手核实 ModuleNav/Subnav/战场私有 surface/深链基座（editorLocationHref+pushState/popstate）/
  升级完整调用域（App 两按钮→open-actions 两导出→两 upgrader+测试）/census 171/55;旧版本兼容审查
  pass（附 G1 显式删除清单 + rg 零残留门）。三方签字齐,build allowed。Next: Codex 按 K1-K3 +
  N1/N2/G1-G3 进 build。
- 2026-08-15 Kimi（架构/视觉主审）: 一手读码完成 v1.1.0 复审，签 premise verified + design agree，
  附必改项 K1-K3。独立复算 production census 169 select/52 checkbox 与卡文一致；确认 ModuleSubnav
  11px 字号已违 DS-F.3、`editorLocationHref` 支持真实 href、ActorMode 内部 tabs 独立于 tabBar
  plumbing、BattleField 私有 surface/硬编码黑底属实且 canary 为 token 级替换。发现卡文前提
  「fixtures 已切换」不成立（demo/e2e-own 仍为 v12），按 K1 钉死执行顺序与删除调用域枚举。
  未改实现文件，未改 Status。Next: GLM 对 v1.1.0 全 delta 重签后进 build。
- 2026-08-15 User + Codex: 实机否决菜单 check 当前态、被分栏控件穿透的层叠和只承载三操作的第二行；
  用户改定单行 Header，工程名置于文件菜单左侧，当前页面只保留下方工作区标题，右侧固定撤销/重做/保存。
  Codex 完成并以 1280/720 浏览器复核；规范按 DS-G.4 升 v2.0.0，任务转 rework，等待 Kimi/GLM 只重签
  v2 delta。
- 2026-08-15 User + Codex: 用户进一步否决 sash 常驻悬浮折叠按钮与过大的 Header 操作按钮，定形
  Header 左/下/右布局控制、同源“视图”菜单、真实 diagnostics drawer、尺寸/显隐记忆和紧凑 28/30px
  操作密度；规范升 v2.1.0。Codex同时开始 ED-AUDIT-2 全页面只读巡检，技能页列为首批重做对象；生产
  实现继续等待 Kimi/GLM 对 v2.1 delta 重签。
- 2026-08-15 Kimi（架构/视觉主审）: 一手读码完成 v2.1 delta 复审，签 premise verified + design
  agree，附必落钉 VK1-VK4。逐项确认 Codex 现状证据（sash 常驻 toggle、Header 仅三命令、状态栏无
  drawer）；确认 command registry/menu/toolbar 单 handler 结构可承载 view.* 同源命令；修正 Codex
  一处可证伪观察——当前 sash toggle 实为唯一面板恢复路径，故 View 菜单 + Header 布局组是删除 sash
  按钮的硬前提（VK2）。另钉 toggle 合同 pressed/checked 扩展（VK1）、Narrow 语义与底部 drawer
  合同（VK3）、底部高度 clamp 与重置布局五项完备性（VK4）。未改实现文件，未标 done。
  Next: GLM 对 v2.1 覆盖/测试重签。
- 2026-08-15 GLM: v2.1 Layout controls/compact toolbar delta 重签 premise verified + design agree
  （G4-G9）。关键发现：ScriptDrawer/SceneScript 6 处依赖 toggle API——删除边界钉死为 App shell 两处,
  共享组件与 CSS 保留。三方 v2.1 签字齐（Kimi VK1-VK4 + GLM G4-G9）,v2.1 build allowed。
- 2026-08-15 User + Codex: 用户实机澄清“底部面板”指场景工作区地图/演出预览下方已有的脚本编辑面板，
  不是全局问题/诊断 drawer。Codex 承认前提错误并停线；一手读码确认 `App.drawer.open` 已统一控制场景工具栏、
  canonical workspace 与 legacy ScriptDrawer。规范提出 v2.2 correction，任务退回 `rework`；v2.1 diagnostics
  相关签字失效。Next: Kimi/GLM 只读重签 v2.2；签齐后 Codex 删除错误实现并接通既有面板。
- 2026-08-15 GLM: v2.2 Bottom panel correction delta 重签 premise verified + design agree（G10-G14）。
  关键发现：错误 diagnostics 残留比卡文清单大 3 项（valbar CSS/状态栏按钮/view.toggle-diagnostics
  命令）——G13 扩充零残留门;水平 sash 收起按钮删除边界钉死（canonical:247+legacy:1011 删,
  ScriptDrawer:1311 侧栏保留）;四入口单 handler 计数测试。v2.2 待 Kimi 重签。
- 2026-08-15 Kimi（架构/视觉主审）: 一手读码完成 v2.2 复审，签 premise verified + design agree。
  五个核对问题独立确认：drawer.open 唯一 owner（App.tsx:476-488，双分支共用）、四入口同一 handler
  为最小接法、非场景页 disabled 优于隐藏、删除边界与 GLM G13 收敛（本人复核 valbar CSS
  :1215-1236 属实）、sash 边界与 G14 逐字一致。新增增量钉 WK2：共享 toggle 必须携带 📜 按钮的
  focus 字段语义（保 src、清 internalScriptId/commandPath、保 focusRevision，App.tsx:2116-2124），
  并补「引用跳转打开 → View 菜单关→开」契约测试。三方 v2.2 签字齐，build 准入 allowed。
  未改实现文件，未标 done。Next: Codex 按 v2.2 实现切片推进。
- 2026-08-15 Codex: 完成 v2.2 correction。删除错误 diagnostics drawer/state/storage/grid/CSS/status
  交互，Header / View / 场景工具栏 / ⌘⌥B 四入口统一切换既有 `App.drawer`；非场景禁用；按 WK2
  保留 source/focusRevision 并清 stale internal focus；canonical/legacy 水平 sash 收起按钮删除且 resize
  保留。editor typecheck、109 files / 798 tests、三入口 build 与 diff-check 全绿；Chromium 实测四入口、
  战斗技能页 disabled reason、无空底行/diagnostics、console error 0。Codex 对 v2.2 slice 签 accept，
  Next: Kimi / GLM done 前独立复审；不得据此提前标整卡 done。
- 2026-08-16 User: 明确表示"我本人已经通过了"——用户验收通过，覆盖当前 v2.2 形态；900/zoom/
  Design Lab 截图矩阵按本次裁决不再阻断 done。已回填用户验收节。
- 2026-08-16 GLM（覆盖/测试）: done 前复审完成并签 **accept**。G10-G14 + WK2 全部必落钉一手
  独立验证：零残留门 rg 复跑双零命中；全仓 setDrawer 调用点审计确认唯一 toggle（App.tsx:1071），
  四入口收敛同一 useCallback；WK2 字段语义与 G11/G14/VK1 逐项属实；focused 7 tests、typecheck、
  全量 118/872 全部本人独立复跑通过；v2.2 核心文件已提交干净。备注：复跑期间工作树含
  ED-INSPECTOR-TABS-1/ED-CATALOG-CONTROLS-1 进行中改动（曾抓到一次瞬时类型错误后自愈），
  与 v2.2 改动面无关。未修改实现文件，未代签 Kimi。Next: Kimi done 前 accept；签齐即关卡。
- 2026-08-16 Kimi（架构/视觉）: done 前复审完成并签 **accept**。一手读码逐项复核：四入口
  （View/Header/⌘⌥B/场景 📜）收敛同一 `toggleScriptPanel`（App.tsx:1069-1072），抽查其余
  setDrawer 调用点均为显式开合；WK2 字段语义逐字落地（app-layout-commands.ts:26-36）；canonical/
  legacy 水平 sash 仅 resize/Home（:251-262 / :1002-1014），legacy 侧栏 toggle 完整
  （:1298-1314）；非场景 disabled+reason 双保险；`.editor` 三行 grid、diagnostics 零命中、
  状态栏纯摘要、VK1 pressed 合同（navigation.tsx:278,337-338）全部属实。视觉采信 Codex
  Chromium 证据 + 用户实机验收 + GLM 独立复跑，不重复跑已有证据流程。并行卡改动未计入结论。
  三方 accept + 用户验收齐，整卡 Status → done。无下一位 Agent 提示词——ED-DS-2 收口，
  后续按用户验收节：ED-AUDIT-2 三线审计与模块迁移批次。



## 下一位 Agent 提示词

### 给 Kimi（v2.2 实现架构/视觉验收——已完成）

Kimi 已于 2026-08-16 完成 done 前复审并签 accept；三方 accept + 用户验收齐，整卡已 done。
无下一位 Agent 提示词——ED-DS-2 收口，等待用户安排 ED-AUDIT-2 / 模块迁移批次。

### 给 GLM（v2.2 实现覆盖/测试验收，可直接复制）

```text
接手任务: ED-DS-2 v2.2 Bottom panel correction done 前覆盖/测试复审
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: build；Codex 已完成 v2.2 correction 并自验 accept，Kimi/GLM accept 未齐，不得标 done
你的角色: GLM，覆盖/测试主审；只读实现 diff，可更新任务卡 GLM 审查签字，不得修改实现文件
先读:
- AGENTS.md
- docs/phase2/editor/editor-design-system-v1.md：DS-L.6、RF-15、附录 F
- 任务卡 G10-G14、Build、视觉验证与交接日志
- packages/editor/src/ui/App.tsx
- packages/editor/src/ui/app-layout-commands.ts + test
- packages/editor/src/ui/CanonicalSceneScriptWorkspaceV5.tsx + test
- packages/editor/src/ui/ScriptDrawer.tsx
- packages/editor/src/ui/editor.css
必须核对:
1. G10 四入口同一 handler；command/shortcut/state 测试覆盖 enabled/pressed/focus 清理。
2. canonical、legacy、非场景三路径；非场景 disabled reason、无空底行。
3. G13 零残留：EditorDiagnosticsDrawer/diagnosticsVisible/Height/toggleDiagnostics/valbar/storage/第四 grid row。
4. G14 删除边界：仅水平 sash toggle 消失，resize/Home 与 legacy 内部侧栏 toggle 保留。
5. 测试与 browser 证据是否足以支持 v2.2 slice；缺口须给可执行测试名/file:line。
验证证据: editor typecheck；109/798 tests；Vite build；git diff --check；Chromium 四入口、非场景、console 0。
输出: 独立覆盖矩阵 + accept，或 counter；不得代签 Kimi，不得标整卡 done。
```

### 给 Kimi（v2.2 Bottom panel correction 架构/视觉重签——已完成）

Kimi 已于 2026-08-15 完成 v2.2 复审并签字（premise verified + design agree，附增量钉 WK2，
见「Kimi v2.2 独立反证审查」），本节提示词不再适用。

### 给 GLM（v2.2 Bottom panel correction 覆盖/测试重签，可直接复制）

```text
接手任务: ED-DS-2 v2.2.0 Bottom panel premise correction 覆盖/测试重签
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: rework；用户已否决 v2.1 diagnostics bottom panel，Kimi/GLM 重签齐前 build blocked
你的角色: GLM，覆盖/测试主审；只读核对调用域和回归矩阵，给 premise verified + design agree，或 counter
先读:
- AGENTS.md
- docs/phase2/editor/editor-design-system-v1.md 的 DS-L.6、RF-15、附录 E/F
- 本任务卡的 v2.2 correction
- packages/editor/src/ui/App.tsx:476,2089-2225
- packages/editor/src/ui/CanonicalSceneScriptWorkspaceV5.tsx:33-80,230-325
- packages/editor/src/ui/ScriptDrawer.tsx:580-620,990-1020
- packages/editor/src/ui/app-layout-commands.ts + tests
- packages/editor/src/ui/EditorDiagnosticsDrawer.tsx + tests（待删除错误实现）
必须给出矩阵:
1. 四入口（Header / View / 场景脚本按钮 / Cmd/Ctrl+Alt+B）一次触发同一 execute，pressed/checked 同步。
2. scene canonical、scene legacy、非 scene 三路径；非 scene 无空白 bottom row、命令 disabled reason 可见。
3. 打开/关闭后保持既有脚本 selection/state；canonical/legacy 高度恢复继续 clamp，不新增 storage 双源。
4. resize pointer/keyboard/Home、Esc/焦点如现有合同；移除水平常驻 toggle 后仍有 Header/View/shortcut 恢复路径。
5. 错误 `EditorDiagnosticsDrawer`、diagnosticsVisible/height/storage、`.editor` 第四 grid row、相关 CSS/test/import
   的逐项零残留门；状态栏功能/样式不回归。
6. 1280/900/720 + 125/150/200% Header 与场景上下分栏最小浏览器证据；非场景页烟测。
输出:
- 独立证据、测试缺口和可证伪观察
- premise verified + design agree，或 counter + 可执行返工项
- 只读审查，不得修改 packages/editor 实现，不得标 build/done
```

### 给 Kimi（v2.1 Layout controls / compact toolbar 架构与视觉重签——已完成）

Kimi 已于 2026-08-15 完成 v2.1 delta 复审并签字（premise verified + design agree，附必落钉
VK1-VK4，见「Kimi v2.1 独立反证审查」），本节提示词不再适用。

### 给 GLM（v2.1 Layout controls / compact toolbar 覆盖与测试重签，可直接复制）

```text
接手任务: ED-DS-2 v2.1.0 Layout controls / compact toolbar 覆盖/测试重签
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: rework；v2.1 build blocked，等待 Kimi/GLM 双签
你的角色: GLM，覆盖/测试主审；只读复核，写回 premise verified + design agree，或 counter
先读:
- AGENTS.md
- docs/phase2/editor/editor-design-system-v1.md 的 DS-L.2/L.4/L.6、DS-I.2、RF-15、附录 E
- 本任务卡 v2.1 重签节
- packages/editor/src/ui/EditorAppHeader.tsx
- packages/editor/src/ui/App.tsx / PanelResizeHandle.tsx / panel-layout.test.ts
- packages/editor/src/ui/app-command-registry.ts + tests
- packages/editor/src/ui/design-system/navigation.tsx / controls.test.tsx
必须给出矩阵:
1. 1280/900/720 + 125/150/200%：无横滚，主区宽度 clamp，三 panel 均可恢复。
2. layout buttons 的 aria-label/aria-pressed/tooltip/focus；View menu/keyboard 与同一 handler。
3. sash pointer/keyboard resize、Home reset、无常驻按钮；localStorage 旧值/非法值/窄窗恢复。
4. bottom diagnostics drawer 的 open/close/focus/scroll，status bar 摘要不消失；菜单/drawer/modal z 顺序。
5. 删除旧 toggle DOM/CSS 后无 dead prop/class/test；ScriptDrawer 私有 resizer 不被误删。
6. RF-15 浏览器 geometry 与 command registry component tests 的最小补充清单。
输出:
- 独立证据与可证伪观察
- premise verified + design agree，或 counter + 可执行返工项
- 不得修改 packages/editor 实现文件；不得标 done
```

以下 v2.0 提示词仅保留历史，不再是当前 build authority。

### 给 Kimi（v2 Header delta 架构 / 视觉重签，可直接复制）

```text
接手任务: ED-DS-2 v2.0.0 单行 Header delta 重签
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: rework；v1.1 build 签字因用户改变 Header 布局/交互合同而对该 delta 失效；剩余 build 已暂停
你的角色: Kimi，架构/视觉主审；只读复核 v2 delta，给 premise verified + design agree，或 counter
先读:
- AGENTS.md 的前提真值门/签字失效规则
- docs/phase2/editor/editor-design-system-v1.md（Status、DS-L.2、DS-L.6、DS-G.4、附录 D）
- 本任务卡「v2.0.0 Header delta 重新签字」
- packages/editor/src/ui/EditorAppHeader.tsx
- packages/editor/src/ui/App.tsx 的 EditorAppHeader props / navigationMenu
- packages/editor/src/ui/design-system/navigation.tsx
- packages/editor/src/ui/design-system/primitives.css 的 menubar/menu/toolbar + responsive rules
- packages/editor/src/ui/design-system/tokens.css 的 elevation/z tokens
- packages/editor/src/ui/editor.css 的 editor-app-header/context rules 与 panel-resizer z=30
用户新裁决:
- 删除第二行/可定制工具栏；单行 Header 右侧只留撤销/重做/保存
- 文件菜单左侧只显示当前工程名；当前页面只由工作区标题表达；Narrow 截短工程名
- 菜单当前页不打勾；当前态轻量；菜单不得被分隔线/折叠按钮覆盖；整体更现代
Codex 证据:
- typecheck PASS；editor tests 106 files / 787 tests PASS；build 三入口 PASS
- Chromium 1280: Header 41px、overflow=0；720: 当前页/文件/编辑/导航+右三操作，overflow=0
- 720 nav bounds left100/right620；resizer z30、Header z35；交叠点 elementFromPoint=.ds-menu-item
- viewport 已恢复 1280×720
请重点审:
1. Header stacking token 是否解决根因且不压过 drawer/modal；popover max-height/scroll 是否安全。
2. 1280/900/720 的工程名截断优先级；十菜单与右三操作可发现性；Header 不重复当前页面。
3. Narrow 分组双栏是否比旧重复前缀长列表更合理；current soft state/无 check 是否清楚。
4. command registry 是否仍保持 menu/toolbar/shortcut 单 handler；删除 localStorage 自定义是否无死代码。
输出并写回任务卡:
- 独立一手证据与可证伪观察；premise verified + design agree，或 counter + 返工清单
- 不得修改 packages/editor 实现文件；不得标 done；只决定 v2 delta 是否恢复 build 准入
```

### 给 GLM（v2 Header delta 覆盖 / 测试重签，可直接复制）

```text
接手任务: ED-DS-2 v2.0.0 单行 Header delta 覆盖/测试重签
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: rework；用户新裁决使 v1.1 Header/toolbar 签字对该 delta 失效；剩余 build 已暂停
你的角色: GLM，覆盖/测试主审；只读复核 v2 delta，给 premise verified + design agree，或 counter
先读:
- AGENTS.md
- docs/phase2/editor/editor-design-system-v1.md（DS-L.2/L.6、DS-G.4、RF-15、附录 D）
- 本任务卡「v2.0.0 Header delta 重新签字」
- packages/editor/src/ui/EditorAppHeader.tsx
- packages/editor/src/ui/App.tsx 的 menus/navigationMenu/Header 调用
- packages/editor/src/ui/design-system/navigation.tsx / primitives.css / tokens.css
- packages/editor/src/ui/design-system/controls.test.tsx
- packages/editor/src/ui/app-command-registry.ts + test
- packages/editor/src/ui/editor.css（Header/context/resizer）
核验矩阵:
1. 1280/900/720 单行无横滚；Narrow 工程名正确截断且 Header 不重复当前页面；右侧三操作始终可达。
2. menu trigger/item keyboard、Esc focus return、真实 href/修饰键、aria-current 不因去 check 失效。
3. Narrow section-grid 分组顺序完整，极窄单栏 fallback、max-height/scroll、popover 层叠不被 resizer/collapse 穿透。
4. 删除 toolbar localStorage 配置后无 dead import/export/storage key/test；菜单/toolbar/shortcut 仍共用 command handler。
5. 建议补充的最小自动测试和 RF-15 浏览器断言；不得用截图替代语义/层叠断言。
现有证据: typecheck PASS；106 files/787 tests PASS；build 三入口 PASS；浏览器 geometry/elements 见任务卡。
输出并写回任务卡:
- 独立一手证据、缺口、可证伪观察；premise verified + design agree，或 counter + 可执行返工项
- 不得修改 packages/editor 实现文件；不得标 done；只决定 v2 delta 是否恢复 build 准入
```

### 给 Kimi（已完成）

Kimi 已于 2026-08-15 完成复审并签字（premise verified + design agree，附 K1-K3），本节提示词不再适用。

### 给 GLM（覆盖 / 测试 build 前复审，可直接复制）

```text
接手任务: ED-DS-2 编辑器设计系统代码基础与 Design Lab——v1.1.0 Header/Toolbar/Controls delta 复审
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: draft；用户已确认 v1.1.0 产品形态并要求开始；GLM 的旧横向 rail 签字已失效；实现尚未开始
你的角色: GLM，独立核验前提、实现边界、fixtures、无障碍与测试矩阵，并给 build 前签字
先读:
- AGENTS.md
- docs/phase2/READ-FIRST.md
- docs/phase2/editor/editor-design-system-v1.md（重点 DS-L.2～L.7、DS-C.2/C.5/C.6、§9～§11、RF-08/RF-15、附录 B/C）
- docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
- packages/editor/vite.config.ts:85-93
- packages/editor/src/ui/editor.css:1-18
- packages/editor/index.html
- packages/editor/src/ui/MapStampPalette.tsx 及 MapStampPalette.test.tsx
- packages/editor/src/ui/ProjectSaveDialog.tsx
- packages/editor/src/ui/App.tsx（Header、body columns、undo/redo/save、upgrade-to-vXX、tabBar plumbing）
- packages/editor/src/ui/ModuleNav.tsx:9-84
- packages/editor/src/ui/editor-navigation.ts:155-192,385-399
- packages/editor/src/ui/editor.css:489-529
已完成:
- 用户已通过 ED-DS-1 六项基础裁决；v1.1.0 又定形 Header 第一行同级文件/编辑/八模块菜单、第二行
  可定制快捷工具栏、工程名移出、模块子页纵向 dropdown、Narrow 显式导航
- 用户要求统一 Select/MultiSelect/Checkbox 等常用控件；生产 census 至少 169 select/52 checkbox
- 用户冻结开发期版本政策：重迁后删除旧 upgrader/类型/test/分支/入口，不只隐藏菜单
- Codex 已将规范升为 normative v1.1.0，并把任务范围改为 design-system + app-shell 首个生产采用
请你做:
1. 必须本人读取上述一手代码，独立验证真值矩阵，不要只复述卡文。
2. 审查 DsMenuBar/Menu/Toolbar/Tooltip 与 app command registry 的依赖边界，确保菜单/工具栏/快捷键不复制 handler。
3. 审查真实 href、修饰键、菜单键盘/Esc 焦点返回、720px 显式导航/overflow、工具栏本机自定义与恢复默认。
4. 审查 Select/Combobox/MultiSelect/Checkbox/Radio/Switch 的状态、键盘、label hit target、长值/性能矩阵。
5. 审查删除 ModuleNav/ModuleSubnav/tabBar plumbing 与 upgrade-to-vXX 直接调用域是否范围闭合；历史代码不得
   仅因测试存在而保留。继续复核 N1/N2 alias、Design Lab 隔离、RF-01～RF-15、真实浏览器/性能证据。
6. 将独立证据、可证伪观察、必改项和新的 premise/design 签字直接写回任务卡。
不要做:
- 不得修改 packages/editor 实现文件；签字门未齐，不得把 Status 改为 build/done。
- 不得改 normative token/断点/交互数值；如认为必须改，签 counter 并说明需用户裁决的条款。
输出要求:
- `premise verified + design agree`，或 `counter` 与可执行返工清单；
- 明确是否建议进入 build；
- 给 Codex 的下一步提示词。
```

### 给 Codex（三方签字齐后进 build，可直接复制）

```text
接手任务: ED-DS-2 编辑器设计系统代码基础与 Design Lab——build 实现
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: draft；Codex/Kimi 已签；等待 GLM 对 v1.1.0 全 delta 重签后转 build
你的角色: Coding Owner——实现 tokens/primitives/recipes/Design Lab + Header/Menu/Toolbar 首个生产采用
先读: 本卡全文（尤其 GLM 独立反证 N1-N2 与 Kimi 独立反证 K1-K3）;
  docs/phase2/editor/editor-design-system-v1.md §2-§11;
  ProjectSaveDialog（native dialog 先例）;MapStampPalette（分块渲染反例）。
必落钉:
  N1 tokens.css 底部兼容 alias 表逐条显式覆盖 editor.css:2-18 全部 15 个变量（含 --dim/--faint/
    --line/--mono/--sans/--acc），无语义对应的记录处置，不写"等";
  N2 静态边界测试加"全部 legacy alias 解析到非空 semantic 值"断言，防 dangling var;
  K1 fixtures 前提修正：projects/demo 与 projects/e2e-own 实测仍为 contentVersion 12——先切换/重建
    fixtures 为 v14（同步处理 reforge loader-v5.pal.test.ts 的 glob 输入；reforge runtime 不动），
    再按调用域枚举删除 v12/v13 打开与升级链路（App.tsx:1462-1507,1562-1587、open-actions.ts:100-120、
    main.tsx:112-148、open-local.ts:219-269、ProjectSaveDialog upgrading 分支、App.tsx:1331/2260/2288、
    script-v5-editor.ts:863、project-diagnostics.ts:551/603、project-io-v5.ts:271），content 包
    upgrader/Legacy 类型须先 grep 消费方再删；e2e-own 若含不可重建手工内容，按卡文转 blocked 请用户例外;
  K2 BattleFieldTab canary 必须 surface-only（token/class/媒体背景级），diff 逐项可审;
  K3 alias 切换后若需改 >10 处业务 selector 才能恢复可读性，回卡重审 alias 策略，不堆 compat fix。
实现顺序建议: fixtures 切换(K1 前提) → tokens+alias → form/menu/toolbar primitives+contracts →
  recipes → design-lab + RF fixtures → app command registry/Header migration → 删除旧导航/upgrade
  直接调用域 → 真实 Chromium/性能证据 → 收口。
验收红线: 主编辑器三档无白屏/console error；RF-01~15 无 uncaught；菜单/工具栏/快捷键单 handler；
  720px 无横滚隐藏入口；统一控件状态矩阵；DS-PERF.1 原始数据保存;无真实 handler 的命令不上菜单;
  发现需改 normative 数值时停卡按 DS-G.4 升版,不边写边改。
完成后: Build 节证据 + Kimi/GLM 分工 done 前审查 + 用户基础层验收。
```

### 给 Codex（GLM v2.1 重签后恢复 build，可直接复制）

```text
接手任务: ED-DS-2 编辑器设计系统代码基础与 Design Lab——build 实现（含 v2.1 Layout controls delta）
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: Codex + Kimi（K1-K3、VK1-VK4）已签;等待 GLM 对 v2.1 覆盖/测试重签后恢复 build
你的角色: Coding Owner——按 Draft §1-§6 实现 design-system + Design Lab + app-shell 替换 + 升级清理,
  并交付 v2.1 布局控制/紧凑 Header delta
必落钉（合并两席）:
  Kimi K1-K3: fixtures 先重生成再删升级入口（demo/e2e-own 仍 v12）;（K2/K3 见卡内 Kimi 签字块）
  Kimi VK1: DsToolbarCommand/DsMenuItem 增加同源 pressed/checked 合同（aria-pressed + 形状/背景
    双表达）,按 DS-IMP.3 补契约测试;
  Kimi VK2: 删除 sash toggle 必须与 View 菜单三条同源命令 + Header 布局组同一变更交付;
    PanelResizeHandle toggle props/Enter-Space 分支/editor.css:326-398 一并移除,separator 键盘保留
    方向键 + Home 重置;
  Kimi VK3: 明确 Narrow(<840) 下布局三按钮语义并写进 RF-15 720 断言;底部 diagnostics drawer 独立
    滚动容器、不挤压 Header、不整页滚动;状态栏只留摘要,不携带 valbar 现有 inline style/fontSize:11;
  Kimi VK4: bottomVisible/bottomHeight 记忆 fail-safe + 恢复 clamp;「重置布局」复位左右宽度/显隐/
    底部显隐/高度共五项;
  GLM N1/N2: tokens.css 15 变量显式 alias 表 + alias 链非空解析静态门
  GLM G1: 升级删除显式清单——App 两按钮/handler、open-actions 两导出、两 upgrader、两测试、
    saveActivity 分支,逐文件列出 + rg 零残留静态门
  GLM G2: build 时重跑 select/checkbox census 并把最终数字写回本卡
  GLM G3: 主编辑器 smoke 加浏览器 back/forward 往返断言（真实 href 改变 history 语义）
实现顺序建议: tokens+alias → 主编辑器 palette smoke（最早暴露风险）→ primitives+contracts →
  recipes → Header/registry/app-shell 替换 + ModuleNav 删除 + v2.1 布局组/视图菜单/底部 drawer →
  Design Lab + RF-01~15 → fixtures 重生成 → 升级入口删除 + rg 零残留门 → 真实 Chromium +
  性能证据 → 全门禁收口。
验收红线: RF-01~15 无 uncaught;DS-PERF.1 原始数据保存;引用跳转全绿;720px 无横滚隐藏入口;
  sash 无常驻按钮且三面板均可从 Header/视图菜单恢复;改 normative 数值须停卡升版。
完成后: Build 节证据 → Kimi/GLM done 前审查 → 用户基础层验收。
```

### 给 Codex（v2.1 实现切片，可直接复制）

```text
接手任务: ED-DS-2 v2.1 Layout controls / compact toolbar 实现切片
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: v2.1 delta 三方签字齐（Kimi VK1-VK4 + GLM G4-G9）;v2.1 build allowed
你的角色: Coding Owner——实现 Header 布局按钮组 + View 菜单 + diagnostics drawer + sash 收窄
必落钉:
  GLM G4（最关键）: 删除面仅 App.tsx:2416-2444 两处 toggleDirection/onToggle;PanelResizeHandle
    组件/toggle API/.panel-resizer-toggle CSS 保留（ScriptDrawer 1011/1013/1311/1313 + SceneScript
    247/249 共 6 处业务依赖）;rg 零残留门只扫 App.tsx;业务 resize 测试全绿为不误删证据。
  GLM G5: 每条布局命令三入口（View 菜单/Header 按钮/快捷键）单 handler 契约测试。
  GLM G6: 布局按钮 aria-pressed 同步/tooltip/focus-visible/pressed 双表达/28×28 契约测试。
  GLM G7: localStorage 非法值回落/旧格式忽略/记忆尺寸超 DS-L.2 约束时 clamp/窄窗恢复集成测。
  GLM G8: drawer 焦点进出/Esc 返回/独立滚动/不整页滚动/问题跳转到目标控件。
  GLM G9: 720+200% Header 单行无 wrap/scroll + 菜单弹层 z 序高于 sash 浏览器断言。
  Kimi VK1-VK4: 见卡内 Kimi v2.1 签字块。
完成后: Build 节证据 → Kimi/GLM 分工 done 前审查 → 用户实机验收（用户已两次实机否决,验收以
  真实浏览器为准）。
```

### 给 Codex（v2.2 实现切片，三方签齐，可直接复制）

```text
接手任务: ED-DS-2 v2.2 Bottom panel correction 实现切片
任务卡: docs/ops/tasks/ED-DS-2-editor-design-system-foundation.md
当前状态: v2.2 三方签字齐（Codex + GLM G10-G14 + Kimi WK2）;v2.2 build allowed
你的角色: Coding Owner——四入口接 drawer.open + 删错误 diagnostics + sash 收窄
必落钉:
  GLM G10: 四入口（Header 按钮/View 菜单/⌘⌥B/场景 📜）单 handler 计数测试——场景按钮与 registry
    execute 共用同一 toggle 函数,不得两份 setDrawer 逻辑。
  Kimi WK2: 共享 toggle 必须逐字携带 📜 按钮的字段语义（保 src、清 internalScriptId/commandPath、
    保 focusRevision,App.tsx:2116-2124）;契约测试补「引用跳转带 src+focus 打开 → View 菜单关→开,
    src 保留且内部 focus 已清」。
  GLM G11: canonical/legacy/非场景三路径测试（非场景 disabled+原因可见）。
  GLM G12: 无新 bottomVisible/bottomHeight;两把既有 storage key 不改;layout-v2:diagnostics-* 代码零引用。
  GLM G13（关键）: 删除清单 8 项——组件+测试/App import+渲染/diagnostics state/`.editor` grid 第3行/
    `.valbar-diagnostics-button` CSS(:1215-1236)/状态栏两按钮(:2574,:2590)/
    `view.toggle-diagnostics` 命令（改接脚本面板并更名,label=脚本面板,pressed=drawer.open,enabled=场景页）/
    :1586 state 传递。rg 零残留门扫：EditorDiagnosticsDrawer/diagnosticsVisible/Height/
    valbar-diagnostics/view.toggle-diagnostics/layout-v2:diagnostics。状态栏纯文本摘要可保留但无点击。
  GLM G14: 水平 sash 收起按钮（canonical:247-249 + ScriptDrawer:1011-1013）在 G10 四入口验证后
    才移除;resize/Arrow/Home/dblclick 保留;ScriptDrawer:1311-1313 侧栏 resizer/toggle 不动。
  浏览器: grid 回 3 行后 1280/900/720+zoom 场景开/合/非场景 disabled 无横溢。
完成后: Build 证据 → Kimi/GLM done 前审查 → 用户实机验收。
```
