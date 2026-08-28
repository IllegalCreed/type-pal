# Type-Pal 编辑器设计系统与交互规范 v1

Status: implemented v2.14.1 section-grid navigation hierarchy（v2.1 历史规范中的“底部问题面板”前提已被用户纠正）

Owner: ED-DS-1（v1.0.0）/ ED-DS-2（v1.1.0～v2.2.0）/ ED-REFERENCE-UI-1（v2.3.0）/ ED-CATALOG-CONTROLS-1（v2.4.0）/ ED-DIAGNOSTIC-UI-1（v2.5.0）/ continuous UX consolidation（v2.6.0～v2.8.0、v2.10.2～v2.10.3、v2.14.1）/ ED-FIELD-COMMIT-1（v2.9.0）/ ED-DS-3（v2.10.0～v2.10.1）/ ED-PROJECT-STARTUP-IA-1（v2.11.0）/ ED-REORDER-DRAG-1（v2.12.0）/ ED-ADD-PICKER-DIALOG-1（v2.13.0）/ ED-FIELD-LAYOUT-1（v2.14.0）/ ED-CATALOG-ROW-IA-1（DS-C.4c 内容层级）/ ED-AUDIO-WORKBENCH-1（DS-R.2 音频合同）

Applies to: `packages/editor` 的全部功能性界面

Last updated: 2026-08-28

> 本文是后续编辑器界面实施和验收的唯一规范入口。它定义产品语言、可复用合同和验收方法，不定义
> content schema、业务命令、存档或运行时规则。角色模块与 B2 战场工作台是参考输入，不是自动正确的模板；
> 图像资源页和旧战斗页是压力反例，也不是唯一待修对象。

## 0. 规范语义与使用方法

### DS-0.1 规范词

- **必须 / MUST**：违反即不能通过相应任务验收。
- **应该 / SHOULD**：默认必须遵守；偏离时必须填写例外记录并给出直接证据。
- **可以 / MAY**：领域按需采用，不构成跨模块一致性要求。
- **禁止 / MUST NOT**：不得用例外记录绕过；如确需改变，必须修订本规范并重新取得产品裁决。

### DS-0.2 三层合同

编辑器界面只允许通过以下三层形成：

1. **Foundations**：语义 tokens、排版、密度、动效、主题和无障碍底线。
2. **Patterns**：控件、状态、应用壳、列表、表单、引用、反馈和媒体查看等可复用合同。
3. **Recipes**：对象型、媒体型、脚本/流程型、数据表型四类工作台组合方式。

模块可以在 recipe 上增加领域内容，但不得重新定义 foundations 或复制一套同义 pattern。无法由四类 recipe
表达的新界面必须先扩充本规范，不得硬塞进最相近页面。

### DS-0.3 条款引用

- 后续界面任务的设计、代码审查和验收必须引用具体条款编号，例如 `DS-L.4`、`DS-M.3`。
- “更统一”“更现代”“看起来更好”不是验收依据。
- 规范截图只用于说明；规则、状态和验收矩阵优先于截图。

## 1. 产品原则与信息层级

### DS-P.1 任务优先

每个页面必须有一个明确主任务。主工作区的可用面积和视觉优先级必须首先服务主任务；摘要、帮助、元数据、
诊断和低频设置不得把主任务挤成狭窄附属区。

### DS-P.2 一致不等于相同

跨模块统一以下内容：语义颜色、排版、间距、控件状态、选择反馈、危险操作、导航、响应式降级、错误反馈和
无障碍。不同领域可以采用不同 recipe，禁止把所有页面压成同一列数或同一信息密度。

### DS-P.3 信息层级

页面内容按以下五级组织，任何同屏区域不得颠倒顺序：

| 等级 | 内容 | 表达规则 |
|---|---|---|
| L1 | 当前对象与主任务 | 页面标题、主预览、主编辑器；占主要空间 |
| L2 | 主操作 | 创建、保存、应用、运行、主要选择器；靠近作用对象 |
| L3 | 结构与分组 | tab、章节、卡片、Inspector 分组 |
| L4 | 元数据与关系 | id、路径、引用、来源、尺寸、统计 |
| L5 | 帮助与诊断 | 简短说明、警告、错误详情；不得抢占 L1 空间 |

### DS-P.4 渐进披露

- 高频字段必须直接可见，不得默认折叠。
- 低频高级字段可以折叠，但折叠标题必须显示当前摘要和问题数。
- 有错误的折叠区必须自动显示错误标记；提交失败后应展开并聚焦第一个错误。
- 折叠不得用于掩盖布局空间不足。若一个字段对主任务必要，应调整 recipe，而不是折叠字段。

### DS-P.5 内容语言

- 按钮使用动词或“动词 + 对象”：`创建角色`、`替换图片`、`移除引用`。
- 标题和标签使用名词：`战斗数据`、`引用位置`。
- 不用裸 `确定` 表达破坏性或不可逆动作；应写 `删除战场`、`覆盖资源`。
- 中文为主；稳定 id、文件路径、枚举和代码使用等宽字体并允许复制。
- 不使用含糊占位词：`其他`、`更多`、`高级` 必须有明确范围或摘要。
- 产品界面统一使用“项目”，不得在同一语义上混用“工程”；代码、文件格式或第三方原文中的既有标识不强制翻译。

### DS-P.6 说明价值门与披露方式

任何说明文案在进入界面前必须回答“它会不会改变作者下一步的判断或操作”；不能回答则删除，不得用弱化颜色
把冗余文案继续留在页面。说明按以下唯一矩阵落位：

| 内容 | 表达方式 | 示例 |
|---|---|---|
| 当前状态、错误、风险、阻断原因、进度、空态与下一步 | 直接可见，并靠近作用对象 | `入口场景缺失`、`正在扫描 94/223`、`请先选择队员` |
| 字段约束、单位、范围、校验错误 | `DsField` 的 help/error，与字段建立 `aria-describedby` | `范围 1–256`、`0 表示不限` |
| 稳定概念、默认值、回退、职责边界等低频知识 | 标题或标签旁的圆形 `DsHelpTip` | 稳定 ID、默认入口、相对高度 |
| 重复标题、复述页面结构、无新信息的“这里可以……” | 删除 | 已有“问题”标题后再写“这里查看问题” |

- `DsHelpTip` 是概念帮助的唯一 primitive；视觉圆圈固定为 `18px`，命中区固定为 `32×32px`，不得让 `?` 因文字行高变成椭圆。
- 概念帮助支持 hover、键盘 focus 与触屏激活，Esc 关闭；必须有 accessible name、`aria-describedby`、viewport
  碰撞处理和 modal top-layer portal，禁止业务页再实现私有 tooltip。
- 图标/动作的短提示统一使用 `DsTooltip`，并与 `DsHelpTip`、select/popover 共用 `DsFloatingLayer`：普通页面 portal
  到 `document.body`，原生 modal 内 portal 到最近的 `dialog[open]`，再用 viewport `position: fixed` 坐标避碰。
- 业务页不得为 tooltip 写 `left/right/inset/transform/z-index` 修补。祖先的 `overflow` 会先裁切后代，局部提高
  `z-index` 无法跨越该边界；只能由共享 Portal 浮层脱离滚动/圆角裁切容器。
- tooltip、help tip 与 select/popover 统一使用 `--ds-z-popover`；`--ds-z-toast` 只保留给全局通知，不得拿来补救
  控件浮层的遮挡问题。
- tooltip 只解释，不承载完成任务所必需的信息；如果用户必须打开 tooltip 才知道为什么控件不可用，说明放置错误。

## 2. Foundations

### DS-F.1 主题策略

- v1 **冻结为暗色主题**；本轮不实现亮色主题和运行时主题切换。
- 所有 token 必须按语义命名，禁止把亮度或具体色名写进公开 token（例如禁止 `--gray-700-panel`）。
- 基础 palette 可以使用色阶名，但组件只能消费语义 alias。这样未来增加亮色主题时可替换 alias，不重写组件。
- 图片、地图、战场和精灵画布的棋盘格/黑底是内容背景，不等同于应用主题。

### DS-F.2 颜色 tokens

以下值是 v1 暗色主题候选值；冻结后由代码化 token 成为单一真源。正文、控件和状态不得继续直接写十六进制色值。

| 语义 token | 候选值 | 用途 |
|---|---:|---|
| `--ds-surface-canvas` | `#1b1d23` | 应用背景、主画布外背景 |
| `--ds-surface-panel` | `#232732` | 列表、Inspector、普通面板 |
| `--ds-surface-raised` | `#2b303c` | 卡片、输入、选中前景 |
| `--ds-surface-overlay` | `#2f3542` | drawer、popover、浮层 |
| `--ds-media-black` | `#050608` | 战场、视频等不透明媒体的真实黑底 |
| `--ds-border-subtle` | `#3b4251` | 非交互分隔线 |
| `--ds-border-control` | `#66728a` | 控件边界；与 panel 对比度至少 3:1 |
| `--ds-text-primary` | `#edf1f7` | 标题、正文、字段值 |
| `--ds-text-secondary` | `#aeb7c7` | 标签、次级说明 |
| `--ds-text-muted` | `#96a1b3` | 元数据；小字仍须满足 4.5:1 |
| `--ds-action-primary` | `#5aa2ff` | 链接、主按钮、当前选择 |
| `--ds-status-success` | `#63c786` | 成功状态 |
| `--ds-status-warning` | `#e2b340` | 警告状态 |
| `--ds-status-danger` | `#f27d84` | 错误、危险动作 |
| `--ds-focus-ring` | `#83b8ff` | 键盘焦点；不得与选中态混用 |

颜色规则：

- 普通文字与背景对比度必须至少 `4.5:1`；18px/700 或 24px 以上大字至少 `3:1`。
- 交互控件边界、焦点环和仅图形状态相对邻接背景至少 `3:1`。
- 状态不得只靠颜色表达；必须同时有文字、图标、形状或 `aria-*` 状态。
- `muted` 不是 disabled。禁用控件仍必须可读，并通过不可交互样式和语义表达。

#### DS-F.2a Surface hierarchy 与媒体纹理

- 中央主编辑区域必须使用最深的 `--ds-surface-canvas`，形成安静、连续的工作平面；不得为了“内容丰富”把
  整个中央区域抬成 panel/raised，也不得用任意 `color-mix` 造接近但不一致的浅底。
- Header、对象列表、Inspector 等结构面板使用 `--ds-surface-panel`；普通内容卡片在深工作平面上也使用
  panel，输入/选中项使用 raised，drawer/popover 使用 overlay。层级只能按 `canvas → panel → raised → overlay`
  上升，禁止同一页面每张卡自己选择灰阶。
- 普通卡片不使用纹理和阴影；它靠 surface + subtle border 建层级。大片连续浅色卡片不得吞掉中央深色工作平面，
  卡片之间和页面边缘必须保留可见 canvas gutter。
- 纹理只属于媒体 stage，不属于表单、卡片或普通编辑背景。透明图片、sprite、portrait 使用由
  `surface-canvas/surface-panel` 构成的统一 checkerboard；地图/空间编辑器可以使用统一 subtle grid；不透明
  图片使用 plain dark，战场/video 默认 `--ds-media-black`。同一媒体类型不得在模块间随机用纯灰/棋盘格/黑底。
- 媒体背景模式只能取 `checkerboard | plain-dark | black | grid`，由 `DsMediaViewport` 或共享 surface class
  实现；模块不得复制 linear-gradient、硬编码 `#050608` 或私有纹理尺寸。

### DS-F.3 排版

| token | 字号 / 行高 | 用途 |
|---|---|---|
| `--ds-font-title-lg` | `20px / 28px`, 700 | 页面主标题 |
| `--ds-font-title-md` | `16px / 24px`, 650 | 卡片/章节标题 |
| `--ds-font-title-sm` | `14px / 20px`, 650 | 字段组、列表对象名 |
| `--ds-font-body` | `14px / 20px`, 400 | 正文、字段值、按钮 |
| `--ds-font-label` | `12px / 18px`, 600 | 标签、短元数据 |
| `--ds-font-caption` | `12px / 18px`, 400 | 帮助、路径摘要；不得低于 12px |
| `--ds-font-mono` | `12px / 18px`, 400 | id、路径、代码、数值表 |
| `--ds-font-tag` | `10px / 14px`, 500 | 仅用于 `DsObjectHero` 的短状态胶囊 |
| `--ds-font-object-action` | `11px / 16px`, 500 | 仅用于 `DsObjectHero.actions` 的紧凑文字动作 |

- 中文和英文正文使用系统无衬线栈；代码使用系统等宽栈。
- 正文、字段、说明、列表内容禁止使用小于 12px 的文字。唯一例外是已验收的对象标题紧凑元数据：
  `DsTag` 使用 10px，`DsObjectHero.actions` 使用 11px；业务页不得继续增加更小字号或把该例外扩散到正文。
- 标题不得使用全大写英文；短标签可用 eyebrow，但必须有可读文本并限制字距。
- 可截断的单行必须有完整 `title`/tooltip 或可复制详情；重要名称优先换行，稳定 id 优先省略。

### DS-F.4 间距、尺寸、圆角与层级

- 间距阶梯：`2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48px`。模块样式只能使用该阶梯。
- 推荐语义：控件内距 `6/8/12`；字段间距 `12`；卡片内距 `16/20`；章节间距 `24/32`。
- 普通控件高度 `36px`，紧凑表格控件 `30px`，tab/工具条不得低于 `40px`。
- 同一属性行中的输入、选择器和尾部文字动作必须使用同一尺寸档并保持同高；`compact` 只能由整行、表格或工具条的
  明确密度上下文统一启用，业务页不得只缩小其中一个按钮。状态徽标不属于可操作控件，可保持自身紧凑尺寸。
- 自由文本、短高频操作或明确的“输入/选择后立即执行”可以使用 `DsInlineComposer`，并只在 recipe 父级选择一次
  `default | compact`；从 live 既有对象库选择候选并追加到集合时必须使用 `DsAddPickerDialog`，不得常驻宽 select +
  action。control/action 槽显式传 `size` 属于门禁违规，即使传入值与父级相同也不允许。
- 有序、可删除的表单项使用 `DsRepeatRow` 持有统一 density、边框和节奏，领域页只声明列语义；短数值字段使用
  `DsFieldMeasure measure="short-number"`，不得随宽卡无限拉伸。
- 仅图标按钮可视尺寸至少 `32×32px`；密集桌面工具条命中区域至少 `32×32px`。
- 圆角：输入/按钮 `6px`，卡片 `10px`，modal/drawer `12px`。同一容器层级不得混用随机圆角。
- 阴影只用于 overlay、popover、modal 和浮动工具条；普通卡片使用 surface + border，不用阴影堆层级。
- z-index 只允许通过语义层：base、sticky、popover、drawer、modal、toast；模块不得自造任意数字。
- 同一字段组的标签、控件、帮助/错误按 `6 / 8 / 12px` 的固定垂直节奏排列；相邻字段默认 `12px`，二级分区
  默认 `24px`。业务页不得靠零散 margin 修补某一行，也不得让相同尺寸档的输入和值行出现不同高度。
- 主工作区的横排字段必须由一个 `DsFieldGroup` 共享唯一 `96px` 标签轨；业务字段行不得覆盖标签列宽度，
  `DsFieldMeasure` 只约束 control 槽自身宽度，不改变共享标签轨。
- 主工作区和确认弹窗的只读名称/值信息使用 `DsReadoutList/DsReadoutRow`，共享同一 `96px` 名称轨与
  `479/480px` 容器降级；不得为了只读对齐借用 Inspector 的 `DsPropertyGrid/DsPropertyRow`。
- 同一 grid 行的同级卡片按该行最高内容等高，下一行重新计算；表单标签列、输入起点和尾部动作列必须逐行对齐。
- Inspector 中两个并列语义分区必须通过 `DsInspectorSection` 的 section padding 与边界分隔；只靠标题字号或空白
  猜分组不合格。单个连续表单内部不得滥加分割线。

### DS-F.5 图标

- 图标采用一套可访问的矢量图标资产；emoji 不得作为生产界面的唯一功能图标。
- 图标标准尺寸为 `16/20/24px`；同一工具条只用一个尺寸。
- 无文字图标按钮必须有 `aria-label` 和 tooltip；有文字按钮不得重复朗读装饰图标。
- 新建、复制、打开、删除、关闭、缩放等常用动作必须跨模块使用同一图标和方向。
- 图标按语义登记，不能按外形临时复用：`open/jump`、`copy/duplicate`、`import/upload`、`save`、`delete` 必须
  各自唯一；同一动作组要么全部使用“图标 + 文案”，要么全部纯文案，不得一半有图标一半没有。
- emoji 可以作为内容类别或装饰提示，但不得充当生产操作图标、列表身份的唯一信息或跨模块语义注册表。

### DS-F.6 动效

- 微交互时长：快速 `100ms`，普通 `160ms`，overlay `220ms`；只允许 opacity、transform、color。
- 禁止用动效推迟内容可用、制造布局抖动或表达唯一状态。
- `prefers-reduced-motion: reduce` 下必须关闭非必要动画、平滑滚动和循环 pulse；进度仍以静态状态可读。
- loading 骨架仅用于预计超过 `300ms` 的稳定布局；更短操作使用按钮 busy/进度状态，避免闪烁。

## 3. 应用壳与响应式布局

### DS-L.1 尺寸以 CSS pixel 为准

- 所有断点基于容器 **CSS pixel**，不得按物理像素或 `devicePixelRatio` 分支。
- 浏览器缩放和高 DPI 会改变有效 CSS 宽度；验收必须覆盖 100%、125%、150% zoom 与 DPR 1/2。
- 组件不得读取 DPR 决定布局；DPR 只用于 canvas 清晰度和像素资源采样。

### DS-L.2 三档应用壳

| 档位 | 有效内容宽度 | 壳行为 |
|---|---:|---|
| Wide | `>= 1200px` | 单行 Header、对象列表、主区、Inspector 可同时显示；两侧可调宽，主区不得小于 520px |
| Medium | `840–1199px` | 单行 Header 保持完整菜单；对象列表保留或可折叠；Inspector 默认进入右侧 overlay/drawer，不占主区永久列 |
| Narrow | `< 840px` | Header 模块组收进显式“导航”菜单；只保留主区，对象列表与 Inspector 为互斥 drawer；不得横向压缩三列 |

推荐默认值：对象列表 `220px`、Inspector `320px`；drawer 宽度 `min(400px, calc(100vw - 16px))`。
Header 替代旧 `136px/52px` 左侧一级导航列，业务工作区不得再为 `ModuleNav` 预留宽度。用户保存的面板宽度
必须受当前容器约束，不能恢复后挤坏主区。

### DS-L.3 720 / 900 / 1280 与缩放矩阵（G1）

以下组合都是必测档，不允许只调整浏览器窗口宽度：

| Fixture | 浏览器 viewport | zoom | 约等效 CSS 宽 | 预期 |
|---|---:|---:|---:|---|
| `shell-wide` | 1280 | 100% | 1280 | Wide 四区成立 |
| `shell-medium` | 900 | 100% | 900 | Medium；Inspector drawer |
| `shell-narrow` | 720 | 100% | 720 | Narrow；列表/Inspector drawer |
| `shell-zoom-125` | 1280 | 125% | ~1024 | Medium，不发生 tab/标签挤压 |
| `shell-zoom-150` | 1280 | 150% | ~853 | Medium 临界行为稳定 |
| `shell-dpr-2` | 900 CSS px | 100% / DPR 2 | 900 | 布局同 Medium；canvas 保持清晰 |

浏览器实际报告的 CSS viewport 是验收真值；表中等效宽度只用于解释，不用于代码计算。

### DS-L.4 滚动归属

- 应用外壳本身不得产生整页滚动；Header 固定不滚动，对象列表、主工作区和 Inspector 各自拥有明确滚动容器。
- 页面标题、主工具条和当前 tab 应 sticky，但不得覆盖焦点内容；滚动到错误字段时必须考虑 sticky offset。
- drawer/modal 打开时背景不得滚动；关闭后焦点和滚动位置返回触发点。
- 同一区域禁止嵌套两个同方向、无明显边界的滚动容器。

### DS-L.5 Tab 与导航尺寸

- tab 条最小高度 `40px`，`flex-shrink: 0`；内容变高时 tab 不允许被压扁。
- tab 文字不逐字换行。空间不足时依次采用横向滚动、`更多` 菜单或切换到 drawer，不得把中文压成两行。
- 当前 tab 同时使用文字强调、底边/背景和 `aria-selected=true`；禁止只靠颜色。
- tablist 支持左右方向键、Home/End；Tab 键只进入当前激活 tab panel。

### DS-L.6 单行 Header 菜单栏与固定常用操作（v2.2 draft）

编辑器采用常见桌面工具的单行 Header：左侧负责完整、稳定、可发现的信息架构，右侧只固定放置撤销、重做、
保存三个全局常用操作。三个动作不足以成立独立第二行，不为它们额外消耗垂直空间。旧左侧 `ModuleNav` 与各对象
列表顶部的 `ModuleSubnav` 均退役，不再占用工作区。

**左侧：菜单栏**

- Wide/Medium 顺序固定为：`文件　编辑　场景　地图　剧情　角色　物品　战斗　资源　项目设置`。十项使用同一
  高度、字号、padding、hover/open/focus 语法；文件/编辑与八个模块之间不得插竖线、品牌块或不同底色。
- “文件”菜单左侧是紧凑的窗口身份区，只显示项目名；当前页面由工作区自身的标题表达，Header 不重复显示。
  项目名单行省略且不形成第二行，并继续写入 `document.title`、显示在“项目设置”页。
- “文件”包含新建、打开、最近打开、保存、另存为、导入/导出、关闭；“编辑”包含撤销、重做、剪切、复制、
  粘贴、复制对象、删除、查找和命令面板。保存归“文件”，撤销/重做归“编辑”。
- 八个模块在菜单中保持同级。存在多个子页的模块打开纵向下拉菜单，例如“战斗 → 技能 / 敌人 / 毒 / 战场”；
  单子页模块可直接导航。下拉项必须是带真实 `href` 的链接，保留 Cmd/Ctrl+Click、中键、复制链接和深链。
- 菜单由点击和键盘打开，不得 hover-only。顶层支持 Left/Right/Home/End，Down/Enter/Space 打开，弹层支持
  Up/Down/Home/End/字符定位，Esc 关闭并把焦点还给触发器。当前模块/子页使用文字、`aria-current` 与单一
  视觉强调，禁止 emoji-only、2×2 宫格或大块 active 卡片。
- Narrow 不允许横向滚动或藏在屏外：保留 `文件　编辑　导航` 三个明确入口；“导航”按模块分组展示全部八个
  模块及子页，空间允许时双栏、极窄时单栏，弹层自行纵向滚动。不得重复模块前缀制造一条超长调试列表；顺序
  和 href 与 Wide/Medium 相同。
- Narrow 分组菜单中，模块名只是定位用的辅助层级，使用 muted caption；具体页面才是主导航目标，使用 primary
  small-title。当前页继续以 soft accent 背景、强调文字和 `aria-current` 表达。模块名不得比页面项更大、更粗或
  更亮，页面项也不得退化成与分组标题同权重的一串文字。
- 菜单弹层必须位于 Header 独立层叠上下文之上，不得被工作区分隔线或拖拽条覆盖。当前项使用 soft accent
  背景、文字强调与 `aria-current`；不额外显示 check，不使用左侧硬蓝条、整块描边或大面积 active 卡片。

**右侧：固定常用操作**

- 与菜单共用 `40px` 单行高度。撤销、重做使用 `16px` 单色 code-native SVG + tooltip，点击区 `28×28px`；
  保存使用图标 + 文字的紧凑主操作，`30px` 高、水平 padding `10px`、正文 `12px`。三个动作固定顺序、
  不可隐藏、不可排序，不再提供本地工具栏配置。
- 操作区不换行、不缩小、不横向滚动；Narrow 仍必须完整显示三个动作的 enabled/disabled/busy 状态。未来只有
  在真实高频动作明显超过单行容量时，才另开规范版本讨论可定制工具栏，不预埋不可见配置能力。
- 菜单、工具栏、快捷键和未来命令面板必须消费同一个 command registry。每条命令至少定义稳定 id、label、
  icon、shortcut、enabled/disabled reason、execute、default placement 与 scope；不得为四个入口复制执行逻辑。
- toolbar button 是动作 `<button>`；模块/子页是导航 `<a>`。焦点、tooltip、disabled reason、busy 与错误回执
  必须由共享 primitive 统一实现。

**布局控制与分栏线**

- Header 右侧在撤销/重做/保存之前提供一个紧凑“布局”按钮组，分别控制当前页面实际拥有的对象列表、上下
  分栏面板和 Inspector；入口只在对应 capability 存在时渲染。按钮使用统一的 `28×28px` 点击区、`16px`
  code-native SVG、tooltip 与 `aria-pressed`，不得使用 emoji。
- “视图”菜单提供与 Header 按钮相同的三条显隐命令和“重置布局”；菜单、按钮和快捷键消费同一 command
  registry，不复制状态或 handler。对象列表/Inspector 的可见性与宽度可在本机记忆；场景脚本面板沿用现有
  `drawer.open` 与既有 canonical/legacy 高度记忆，不新建第二套 bottom state。恢复时仍须受 DS-L.2 主区
  最小宽度/高度约束。
- 左右分栏线只负责拖拽调整宽度：默认是低对比 `1px` 结构线，hover/focus/drag 才显示 accent；不在分栏线上
  常驻悬浮箭头或按钮。键盘用户仍可聚焦 separator，用方向键调整、Home 重置。
- 底部按钮在场景工作区必须控制已经存在的脚本/演出编辑面板：与场景工具栏“脚本”按钮、`drawer.open`、
  `CanonicalSceneScriptWorkspaceV5` / `ScriptDrawer` 共用同一 handler；不得新造全局问题/诊断 drawer，状态栏
  继续只承担现有摘要。非场景工作区没有这个 capability 时不渲染底部按钮；只有 capability 存在但因临时状态
  暂不可用时才显示 disabled，并通过 tooltip 给出具体原因。对象列表、Inspector 与底部面板统一采用这条规则，
  不得一处隐藏、一处保留无效按钮，也不得凭空挤出空白底栏。
- 工具组内 gap `2–4px`，组间用轻量分隔线并留 `6–8px` 空间；默认按钮透明，仅 hover/focus/pressed
  抬升，保存才使用 primary surface。布局按钮的 pressed 状态必须同时由形状/背景和 `aria-pressed` 表达。

### DS-L.7 字段与卡片响应式

- 字段标签默认在输入上方；只有容器 `>= 480px` 且标签宽度稳定时可以使用左右两列。
- `DsFieldGroup` 在容器 `>= 480px` 时使用公共 `96px + gap + minmax(0, 1fr)` 双列轨；`< 480px`
  时整组切换为标签在上、控件在下，不允许单行独自改变断点或标签宽度。
- 标签列不得窄于 `96px`。普通长中文在轨内自然换行，不得压成逐字竖排；若整组标签普遍过长，整组显式使用
  stacked 布局，不为某一行扩宽轨道。
- 卡片网格以容器查询决定列数；单卡最小宽度 `280px`。不足时降列，不缩小输入和文字。
- 长 id/path 必须 `min-width: 0`，并在换行、省略、复制三者中选择明确策略。
- `DsInlineComposer` 在容器 `>= 480px` 时保持 `minmax(0,1fr) + intrinsic action`，尾部动作不得被拉成整行；
  只有 `< 480px` 时才转为单列并允许动作占满可用宽度。
- `DsPropertyGrid/DsPropertyRow` 的 `60px` 紧凑轨只在真实 DOM 祖先
  `[data-ds-inspector-host]` 内生效；只有公共 `DsInspectorHost`、`DsWorkbench` Inspector slot、
  `DsInspectorTabs` 或经 `DsInspectorPortal` 桥接的内容可以授予该上下文。`DsInspectorSection` 只负责分区和
  padding，不能自行授予 Inspector 语义。host 外的 `DsPropertyGrid` 在开发期直接报错；主工作区不得通过嵌套
  类名或改写 `--ds-inspector-property-label-track` 借用该例外。业务 shell 与 portal 必须进入
  `field-layout-adoption.json` 的动态精确 census，并由调用路径门禁证明属性表确实处于真实 host 内。

## 4. 共享组件与状态合同

### DS-C.1 状态全集

适用组件必须定义以下状态，不得只实现 default/hover：

`default`、`hover`、`focus-visible`、`active`、`selected`、`disabled`、`loading`、`empty`、`error`、
`warning`、`success`、`destructive`。

状态组合规则：

- focus-visible 优先于 hover，焦点环不得被 overflow 裁掉。
- selected 与 focus 是两种状态：selected 表示数据选择，focus 表示键盘位置。
- loading 控件禁止重复提交，并保留原尺寸；文字可变为“保存中…”，不得整块消失。
- error/warning 必须有可读说明和关联字段；success 不应永久占据主区域。
- disabled 控件必须给出原因，若原因重要应使用说明/tooltip，而不是只降低透明度。

### DS-C.2 按钮

按钮只允许四种层级：`primary`、`secondary`、`quiet`、`danger`。

| 层级 | 使用场合 | 状态要求 | 禁止用法 |
|---|---|---|---|
| `primary` | 当前可见作用域唯一的主要提交/创建动作 | hover/active 后仍保持主色与可读前景 | 同一区域并列多个 primary |
| `secondary` | 普通明确动作、以按钮外观呈现的导航动作 | hover 提升边框和表面层级 | 页面私造“普通按钮”颜色/圆角 |
| `quiet` | 低强调、可重复的小动作 | hover 才抬升表面，但命中区始终稳定 | 用悬空文本冒充按钮 |
| `danger` | 删除、解除绑定等破坏性入口 | default/hover/active 始终保持危险语义色 | 用普通 hover 覆盖成中性色；把所有删除都做成填充主按钮 |

- 每个可见区域原则上最多一个 primary；保存属于全局主操作时，局部动作使用 secondary。
- danger 默认不做 primary；只有确认对话框的最终破坏性动作可以提高危险强调级别。
- 对象标题区以物品工作台的已验收比例为统一基准：`DsObjectHero.actions` 内的文字按钮固定为 `32px`
  高、`11px/16px` 字号；`DsTag` 固定为 `18px` 最小高度、`10px/14px` 字号。它们是标题区密度，不能拿
  普通表单的 `36px` 控件或工具栏图标尺寸混用，也不得由业务页覆写。
- 原生语义不得为了视觉复用而改变：提交/命令使用 `DsButton`，导航使用真实 `<a>` 的
  `DsActionLink`，纯图标动作使用 `DsIconButton`，连续命令使用 `DsToolbar`，菜单项使用
  `DsMenuItem`。这些是五种语义入口，不是五套视觉皮肤；它们必须复用同一尺寸、圆角、状态 token 和焦点环。
- 图标按钮必须使用稳定命中区、tooltip 和 accessible name。
- 连续小动作采用 toolbar/button group；不能散落成无法判断作用域的 `×`、`↗`、`＋`。
- 完整对象的复制、重命名、删除等动作只能有一个 owner：列表本身是管理主面的，放在选中行尾部或其 overflow；
  中央工作区是编辑主面的，放在 `DsObjectHero.actions`。右侧 Inspector 只显示选中对象属性、引用、诊断和
  低频设置，不设“危险操作”“模板管理”或第二套保存/删除区。同一级动作不得在列表、Hero 和 Inspector 重复。
- hover 不得改变控件尺寸或语义色：primary 保持主色，secondary 提升边框/表面，quiet 提升表面，danger
  保持危险边框和文字。focus-visible 优先于 hover，disabled/busy 不响应 hover。
- `tool`、`btn`、`mini`、`mini-txt`、`pv-btn`、`item-action-button` 及业务页自造的
  `*-primary-action` / `*-danger-action` 都是迁移期遗留类，不是获准的新变体；新增代码禁止使用，存量只能减少。

### DS-C.3 列表头与对象列表

- 标准列表头顺序：标题 → flexible spacer → 计数徽标（含单位）→ 创建 → 复制/更多；搜索/过滤放在列表头
  下方，不与全局操作争抢同一行。
- 计数统一使用低强调紧凑徽标并写单位，例如 `6 位`、`52 个`，不得以突兀裸数字出现。列表头图标操作统一
  使用同一命中尺寸、间距、tooltip 与 accessible name。
- 对象行必须有主名称、稳定 id/摘要、状态 badge；图像只作为辅助，不承担身份。
- 对象列表行使用贯穿列表可用宽度的直角选中背景与左侧强调线；禁止把选中行做成内缩圆角卡片，也禁止
  通过行间外边距把连续列表切成卡片流。列表内不得再出现与选择同色的无关 badge。
- 空列表必须给出主创建动作；过滤为空应显示“无匹配项”并提供清除过滤，不能误导为数据库为空。
- 集合级创建/导入属于 `DsListHeader`；针对当前对象的复制/删除按 DS-C.2 归属到行尾或 Hero。列表标题旁如需
  解释低频集合概念，只能使用 `DsListHeader.help → DsHelpTip`，不得在标题下常驻一段复述列表用途的说明。

### DS-C.4 搜索与过滤

- 搜索框有可见或 accessible label、清除按钮和结果计数。
- 文本过滤默认不区分大小写并搜索名称/id；领域额外字段必须在提示中说明。
- 过滤不改变底层选择；当前选择被隐藏时明确提示，不可偷选第一项。
- 可叠加的多选过滤状态使用可移除 chips，并提供“一键清除”；固定单值枚举使用统一 Select，不能自画 button chips。

#### DS-C.4a 目录控制区合同（v2.4.0）

- 当前 canonical 的正式左侧目录统一使用 `DsCatalogControls` 组合列表标题、计数、标题动作、可选 scope、搜索与
  筛选器；业务页只持有查询、筛选、选择和深链状态，不复制标题后 padding、border、focus 或响应式布局。
- DOM 顺序固定为 header → optional scope → optional search → optional filter grid → list body。没有 scope、搜索或
  筛选器时不得渲染空 body；单个筛选器占满可用宽度，多个筛选器用纯 CSS `auto-fit/minmax` 自适应换行。
- 搜索只允许通过 recipe 的 `search` props 渲染 compact `DsCatalogFilter`；scope 和 filters slots 只能消费已批准的
  design-system controls。业务目录禁止 raw search/select、自画 button chips、页面私有搜索图标和 focus 皮肤。
- 控制区、搜索和筛选 slot 根必须满足 `box-sizing:border-box; width:100%; min-width:0`；窄侧栏不得横向滚动，
  不得用 JavaScript 测量或 `overflow-x:hidden` 掩盖溢出，focus ring 必须保持完整可见。
- recipe 只拥有结构和布局，不读取或改写筛选结果、当前选择、URL 深链、创建/导入、引用、撤销重做或计数口径。
  图像类型、精灵领域等结构切换属于 scope；缺失警告、错误和领域提示留在列表正文或既有状态位，不扩 notice variant。
- v2.4.0 的正式采用域为 8 模块 / 24 个 current-canonical 路由页，其中 17 个生产组件消费该 recipe；
  `MapStampPalette` 等主工作区临时 palette 与非 canonical fallback 不冒充正式左侧目录，也不得新增长期兼容皮肤。

#### DS-C.4b 目录行与全量采用门禁（v2.10.0）

- current-canonical 左侧对象行统一由 `DsCatalogRow` 持有结构、选中态、focus 和密度。标准行固定
  `68px`，紧凑行固定 `46px`；title / meta 各单行截断，trailing 不参与正文换行。业务页不得通过标签折行、
  私有 padding 或内容高度改变同一列表中某一项的行高。
- `leading` 是固定 `36px` 的公共槽位。一个列表族必须选择一致的媒体策略：音乐 / 音效用播放语义图标，
  精灵定义用预览或稳定占位图标；不能因某一项暂时没有媒体而让正文水平跳动。同一列表族若不需要媒体，所有项
  一起省略该槽，不允许有的有、有的无。
- 全量采用真源为 `design-system-adoption.json`，其 registry 集合必须与 `EDITOR_MODULES` 的 25 个可达子页
  双向闭合；数据页还必须与 `DataMode` 每个 return 的生产组件闭合。新增、删除或换挂载组件时，门禁必须要求
  同步更新，不允许靠人工记忆维护另一份页面清单。
- 每页必须登记 catalog / scroll / overlay / field / action 五个 owner 以及采用状态。页面只能消费公共 owner；
  canvas、虚拟列表或领域选择面确需原生 button 语义时，必须经无皮肤的 `DsPressable` 统一 type / ref 边界；
  标准文字动作与图标动作仍只能用 `DsButton` / `DsIconButton`，不得拿 `DsPressable` 逃避动作层级。
- 静态门禁拒绝 legacy class、raw form control、原生危险动作、私有 dialog / overlay portal 和可由 token / class
  表达的静态 inline style，并输出 `file:line + rule + found + 推荐 owner`。动态几何 style 保留；隐藏原生 file
  input 只能封装在 `DsFileInput` / `DsFilePicker` 内。
- 合理例外唯一真源为 `design-system-allowlist.json`，字段固定为
  `{file,line,rule,owner,reason,verification,removalCondition}`。行号失效、规则消失或字段损坏视为 stale，门禁
  以 exit 2 失败；未批准违规以 exit 1 失败；完全通过为 exit 0。

#### DS-C.4c 目录行内容层级门（2026-08-26）

- `title` 必须是作者识别和选择对象时使用的主名称；稳定 ID 默认进入 `meta`，不得把 `#006`、资源键等技术
  标识放进 `leading` 冒充媒体。没有独立显示名的对象可以用稳定 ID 作 `title`，但不得在另一槽重复一遍。
- `leading` 只承载真实缩略图、头像、色样、播放/资源类型等能帮助选择对象的语义媒体。媒体策略按列表族统一：
  同族全有或全无；资源暂缺时只能使用该列表族已经裁决的稳定语义 fallback，不得临时制造 emoji 或空白占位。
  若移除 `leading` 不会降低对象的识别或选择准确性，该列表族必须整体省略媒体槽；已由标题、`meta` 或 `trailing`
  明确表达的类型/状态，不得再用装饰图标或 emoji 重复。
- `trailing` 只承载选择时关键的分类、异常或立即行动状态，例如“默认”“待迁移”“不可解”。装备/使用等已有
  筛选 owner 的普通能力、总引用数和详情统计默认不常驻；它们继续由筛选器、Hero、Inspector 或引用面板表达。
- 统计只有能直接改变当前目录的选择判断、且没有等价筛选/详情 owner 时才可常驻，并必须在
  `catalog-row-content-adoption.json` 逐项写明理由。音频目录引用数用于选择替换/清理对象，ActorAvatar 的无头像
  fallback 属已裁决的稳定角色识别媒体，均是有边界的合规项，不可类推为任意统计或假图标许可。
- 内容采用矩阵必须递归扫描生产 TSX 中全部 `<DsCatalogRow>` 调用，以相对文件与规范化 opening-element
  fingerprint 绑定每个受审 surface，并记录列表族、四槽语义、裁决和证据理由；新增、删除、移动或修改调用而
  未同步矩阵时测试失败。alias、spread 与拖拽/排序属性在目录行消费点 fail-closed；排序手柄必须由独立
  reorder primitive 持有，不能扩张 `DsCatalogRow`。代表页还必须以 DOM 槽位和 `data-leading` 断言，不能只
  检查整行 `textContent`。

#### DS-C.4d 有序集合与排序手柄（v2.12.0）

- 只有作者维护的 canonical 顺序可以采用排序；搜索结果、按名称/ID 派生的目录顺序、集合/多重集、空间移动、
  数值拖动和资源 transfer 不得伪装成 reorder。生产采用真源为 `reorder-adoption.json`，合法原生 transfer 与
  空间移动例外为 `reorder-allowlist.json`；新增、删除或改名后未同步、重复或陈旧条目都必须 fail-closed。
- v2.12.0 的机器基线为 **17 个交互家族 / 29 个 adoption / 32 条数据路径 / 19 个领域 owner 文件**；这些数字是
  registry 自身复算结果，不是未来可手改的常量。每条 adoption 必须登记 adapter、身份、command/revision owner
  与验证文件；每条例外必须具备 `{file,rule,fingerprint,owner,reason,verification,removalCondition}` 七字段，
  fingerprint 缺失、重复、未命中或命中多次均视为无效/陈旧例外。
- 所有正式可移动项使用 `DsReorderCollection + DsReorderItem`。手柄是 item 的第一个交互槽，视觉上必须位于
  item 自身边界与背景内，不能悬在卡片/行外；它不得占用 `DsCatalogRow.leading` 媒体槽，也不得嵌进目录按钮、
  输入或整行点击目标。普通项由内容首根节点为内嵌 rail 留出空间；时间线使用 item 内左上 overlay。
- `grip` 使用公共矢量图标和至少 `32×32px` 命中区，只在手柄自身设置 `touch-action:none`。禁止整行
  `draggable`、文本 `≡`、领域私有 handle CSS 或复制 pointer 状态机。手柄必须有可见 hover/focus、
  `grab/grabbing`、disabled 与 picked/drop-target 状态。
- pointer 采用 Pointer Events、pointer capture 和统一 `6 CSS px` 阈值。pointermove/hover/边缘自动滚动只更新
  本地投影；有效 pointerup 才向领域 owner 发送一次 intent。原位、越界、不可落点、Escape、pointercancel、
  lost capture、window blur、document hidden、scope/revision/对象变化与 unmount 都取消且产生零命令。
- dragging 期间必须提供 Sortable 式实时预览：来源 item 跟随指针，其余 item 以 `transform` 动画让出来源项完整尺寸，
  DOM / 数据顺序与 history 在 pointerup 前保持不变。相邻 item 共享的插入缝只能显示一个居中的 indicator；光标经过
  该缝或来源占位区时不得因 `display: contents` 命中空白而抖回原位，原位投放不显示 indicator。滚动 owner 位移后
  占位与 indicator 必须同步修正；`prefers-reduced-motion: reduce` 下保留瞬时让位与静态 indicator，但关闭位移动画。
- 键盘在手柄上用 Space/Enter 拿起或落位，方向键、Home/End 选择位置，Escape 取消；共享 polite live region
  宣布当前位置与完成结果，live region 必须视觉隐藏且不占布局；提交后焦点跟随同一逻辑项。拖拽不能成为唯一入口：
  每项仍提供有常驻边框的公共 `secondary` 前移/后移按钮，或经审签的等价移动菜单；不得退回默认态只有悬空
  glyph、hover 后才显露按钮边界的 `quiet` 外观。移动按钮必须服从所在公共行的 density：default 行与同组
  `36px` 动作同高，compact 行使用公共紧凑命中区，业务页不得单独缩小其中一枚按钮。pointer、keyboard、click
  必须调用同一个 `canReorder/onReorder` owner。
- 当排序 item 把可选目录行与尾部移动动作组合为同一视觉表面时，动作区必须保留至少 `--ds-space-2` 的
  `inline-end` inset，使按钮边框与 focus outline 完整位于 item 内；尾部动作不得直接贴住或被外边界裁切。
- 普通数组用 insert，固定槽位用 swap，图层可按显示顺序适配反向索引，嵌套脚本只允许同父级，临时清单和时间线
  只进入各自 draft history。重复值必须使用既有稳定 ID 或 editor-local occurrence token；不得用裸 value/index
  作为手势身份，也不得为排序新增持久化 schema ID。
- 一次完成手势最多产生一条 command 或 draft-history entry；20 次 hover/自动滚动仍是零提交，undo 一次恢复
  完整旧序、redo 一次恢复新序。字段 blur/IME、popup、选择、多选和资源拖入不得因排序而误提交或串项。
- Design Lab `RF-21` 固定覆盖 default/compact、普通/catalog/fixed-slot/nested/timeline、disabled、empty、single、
  52 项长名称与真实滚动 owner；真实工程仍须在窄宽和 100%～200% 缩放验证边界、焦点、滚动和单步撤销。

#### DS-C.4e 候选对象添加弹窗（v2.13.0）

- “live 既有对象库 → 向集合追加、选择前不写 canonical”由 `DsAddPickerDialog` 统一持有；标题区只保留紧凑添加
  动作，弹窗正文直接显示搜索与 single-select listbox，不在 modal 内再嵌套 `DsSelect`。自由输入、编辑已有引用和
  创建默认行后再编辑不机械迁移，分类真源为 `add-picker-adoption.json`。
- 公共 API 必须提供静态 `adoptionId`、`scopeKey`、外部 `revision`、stable option id、loading/error/readOnly 与
  一次性 `onConfirm(id)` adapter。query、active 与 selected 都是 dialog-local draft；取消、关闭、分层 Escape、
  scope/revision/对象切换、undo/redo、readOnly 和 unmount 都产生零命令且清空 draft。
- 候选点击或 Enter 只更新 selected；footer 明确确认才允许调用一次 adapter。确认前必须以最新过滤后 addable 集
  重校验，隐藏、移除或 disabled 的 stale selection 不得提交；busy guard 必须防双击、双 Enter、IME Enter 与重复
  pointerup。adapter 返回 `false` 或抛错时 dialog 留在原位并显示邻近错误。
- 搜索覆盖主名称、稳定 ID 与领域次级信息，并复用 `filterDsCollection`。结果使用共享 virtual window；集合大小
  `<=80` 全量挂载，`>80` 虚拟化，234/500 项挂载不得超过可见 + overscan 预算。外部搜索 focus owner 只接管
  ArrowUp/ArrowDown/Enter，不能吞 Space/Home/End 的文本编辑语义；active descendant 必须始终指向已挂载 option。
- 候选行固定为 60px / 两行：首行是作者可读主名称，第二行先放不可收缩的稳定 ID，再放可单独 ellipsis 的领域
  detail；不得把长 description 放在 ID 前导致关键身份先被截掉。disabled reason 取代普通 detail，不能另开第三行
  破坏虚拟偏移。`leading` 媒体框固定 38px，只允许真实 item icon、actor face / portrait 等能提高选择准确性的语义
  资产；同一候选族无真实媒体时整体省略，不得补 emoji 或把使用方图片冒充对象自身。无图单项可显示明确“无图 /
  缺图”状态。`trailing` 至多一个短类型 / 数值标签并保持单行，搜索所需但未显示的说明必须进入 `searchText`。
- `DsDialog` 持有 native modal、唯一 title/description id、document scroll lock 与焦点归还。结果列表是 dialog 内
  唯一纵向滚动 owner，footer 固定；第一次 Escape 收起结果层，第二次关闭 dialog。关闭后优先回 opener；若 opener
  已消失/禁用，则回业务传入的 section 或新行首个非危险 fallback。
- 标题动作式集合在正式行数为 0 时必须在面板正文使用 `DsEmptyState layout="embedded"` 居中说明，不得只留一片
  无语义空白，也不得在空态重复标题区已有的 `0 项`。仍有候选时说明从右上角添加；根本没有候选时改为解释原因，
  不能显示虚假的“可添加”。已有正式行但候选全部用尽时，以邻近状态说明“已全部配置”，且不得移动标题、数量或按钮。
- v2.13.0 census 冻结为 **4 个 included + 7 个 append-first-default deferred owner**；ItemAmountList 的三条 data
  path 必须分别登记。静态门禁拒绝 alias、spread、动态 adoptionId、未登记 callsite 与陈旧 fingerprint；census 必须
  结合 JSX button↔handler、数组追加形态和 `first*`/`[0]` live registry 信号，禁止只靠单行动词 grep。
- Design Lab `RF-22` 固定覆盖 0/1/234、长名称、active/selected/disabled、all-disabled、搜索、键盘、明确确认与
  fixed footer；真实 PAL 仍须在 1280/900/720 和 100%/150%/200% 验证 focus、唯一滚动面和零横向溢出。

### DS-C.5 表单字段

- 每个输入必须有程序化 label；placeholder 不得代替 label。
- 帮助文字位于字段下方，错误文字替换或紧邻帮助文字，使用 `aria-describedby`。
- 数值字段必须说明单位、范围和特殊值；禁止让作者猜 `0`、`-1`、`65535` 的语义。
- 保存/失焦/即时校验策略由字段合同决定，并在同一表单一致；不得部分字段输入即提交、部分字段失焦提交而无提示。
- 多列字段使用 grid，并在窄宽下转单列；禁止用固定宽 label 挤压选择器。
- TextInput、TextArea、NumberInput、Select、Combobox、MultiSelect、Checkbox、RadioGroup 与 Switch 必须由
  design-system primitive 提供统一高度、边框、圆角、内边距、文字、图标、hover/focus/open/error/disabled/
  readonly 状态；业务模块不得复制原生控件后各自覆写一套皮肤。
- 同一尺寸档的输入壳默认 `36px` 高；checkbox/radio/switch 的标签与控件组成同一完整命中区。字段前后缀、
  单位和清除按钮属于输入壳，不得靠业务页面绝对定位拼装。
- `DsField.help` 只放当前字段的约束、单位、范围和输入后果；稳定概念或跨字段规则使用 DS-P.6 的
  `DsHelpTip`。两者不得复制同一句话，错误出现时不得被 tooltip 隐藏。

#### DS-C.5a 连续字段事务边界（v2.9.0）

- 项目数据中的 text / number / textarea 统一使用 `DsDraftTextInput`、`DsDraftNumberInput`、
  `DsDraftTextArea` 及其 `DsField` 组合版本。输入和 IME composition 只更新组件本地草稿；blur 或文本/数字
  字段的 Enter 才 validate 并提交，Escape 恢复 canonical 值。textarea 的普通 Enter 保留换行，
  `Ctrl/Cmd+Enter` 才按确认处理。
- 业务页必须提供稳定的 `draftKey`（对象身份 + 字段路径）与可用时的 session `syncToken`。对象切换、外部
  undo/redo 或 canonical 值变化时，旧草稿必须丢弃并显示新 canonical；不得把对象 A 的草稿提交给对象 B。
- 一次编辑周期最多调用一次 `onCommit`。Enter 引发的 blur 不得二次提交；等值提交不调用业务回调、不产生
  command、dirty 或通知。数字中间态（空、负号、小数点）可以留在草稿，只有通过 integer/min/max/领域校验
  后才能提交；已有字段的 floor/clamp 语义必须通过显式 `normalize` 适配器保留，事务收口不得借机改变业务值。
- compositionstart 到 compositionend 期间禁止提交或显示校验错误；若合成期间失焦，只能在 compositionend
  后执行一次待定提交。业务页不得再复制私有 `useState + onBlur`、debounce 或页面级保存按钮。
- 允许即时提交的离散动作仅限 checkbox、radio、select、toggle、颜色选择和拖拽完成事件；range/timeline
  等连续交互必须由领域组件明确拥有单次手势事务，不能借“即时预览”制造逐像素 undo。
- 采用清单与例外真源是 `field-commit-adoption.json`。例外必须具备
  `{file,line,rule,owner,reason,verification,removalCondition}` 七字段；未登记的连续控件
  `onChange -> dispatch/项目 patch` 由静态门禁拒绝。

### DS-C.6 选择控件、选择器与引用卡

- 单选固定短枚举使用统一 `Select`；需要搜索或展示“名称 + 稳定 id”的长列表使用 `Combobox`；不得用
  datalist、自由文本和私有弹层混出第三种选择语义。
- 多选使用统一 `MultiSelect`：触发器与单选同尺寸，选中值用可移除 chips/摘要呈现，空间不足显示 `+N`，
  弹层提供搜索、逐项 checkbox、全选/清空和选中计数；不得把一组无结构 checkbox 假装成下拉多选。
- Checkbox 必须覆盖 unchecked/checked/indeterminate，RadioGroup 必须保持单选，Switch 只用于即时生效设置；
  内容表单中的普通布尔字段默认使用 Checkbox，避免同一语义在模块间随机变成开关。
- 选择弹层支持 Enter/Space 打开、方向键/Home/End 导航、Esc 关闭并归还焦点；长选项截断但可通过
  tooltip/详情读取完整值。空、加载、缺失引用、禁用与错误必须是不同状态。
- 选择器显示可读名称 + 稳定 id；名称优先，id 作为次要文本。
- 引用选择不能退化成任意字符串输入。未知值保留并显示 `缺失引用`，不得静默清空。
- 具有权威编辑页的引用必须提供统一“打开”动作；成功跳转给出定位回执，失效 locator 明确报错。
- 引用卡按来源类型、名称、位置、状态组织；危险删除前复用同一 typed reference 数据，不写第二套统计。

#### DS-C.6a Inspector 反向引用合同（v2.3.0）

- Inspector 中的反向引用只允许使用 `DsReferencePanel → DsReferenceGroup/DsReferenceList →
  DsReferenceRow` 三层合同。Panel 拥有完整性与影响，Group/List 拥有组织、occurrence 计数和 12 条展开，Row
  拥有名称、说明、路径、状态与定位语义；领域页面不得复制卡面、hover/focus、展开按钮或另一套空态。
- Panel 状态固定为 `ready / empty / loading / partial / error`。扫描未完成或失败时必须显示
  `at-least / unknown`，不得把当前下界传成精确 Tab 数字；只有完整结果才向 Inspector Tab 提供 number count。
- Panel 总数和 Group 数均使用 occurrence 语义；同一稳定 site 的重复调用聚合为一行并显示 `N 次`，所有
  Group count 加和必须等于 Panel/Tab 的精确总数。React identity 使用稳定 `site/where/id`，禁止数组下标 key。
- 引用行只能有三种原生根：可分享定位用 `<a>`，命令式精确定位用 `<button>`，只读或不可定位用
  `<article>`。禁止用 disabled button 表达“只读 / 暂不可定位”；静态行必须写出状态和原因。
- 行内顺序固定为：来源/访问/影响标签 → 可读名称 → detail/occurrence → 等宽 path → 尾部打开动作或静态状态。
  颜色之外必须有文字；可定位行使用“打开”类文案 + 共享 `open` 图标，`只读`、`暂不可定位` 等静态状态
  占同一尾部位置。禁止把 `↗` 作为字符串塞入领域 label。
- 标题可单行省略但完整值必须通过 title/详情可达；path 必须 `overflow-wrap:anywhere` 且可选中复制。120 字符
  路径、200% zoom 和窄 Inspector 不得产生横向页面滚动或第二个无边界滚动 owner。
- design-system 只接收展示值、状态、callback/href，不读取 EditorState、collector、locator 类型或 Command。
  引用收集、删除/移除守卫、重试、资源替换和跳转命令继续由领域 owner 持有，并与列表复用同一 typed 数据。
- 诊断、删除按钮、筛选器和重试命令不是引用行。它们放在 Panel status/action 或领域 section，不得塞进 Row
  制造第二套行变体。Design Lab `RF-16` 是 simple/grouped/static/loading/partial/error/long-content 基准。

### DS-C.7 卡片、分组和折叠

- 卡片用于一组可独立理解的字段或摘要，不得为每个单字段造卡片。
- 卡片标题包括名称、可选摘要、状态/动作；低频动作放末尾或菜单，高频动作靠近对象。
- 默认展开主任务分组。仅高级/低频分组可折叠，并记忆用户选择但不写内容数据。
- “升级曲线与习得技能”这类主任务区域不得只剩折叠摘要；必须直接显示可编辑主内容。
- Inspector 只允许 `DsInspectorTabs → DsInspectorSection → DsPropertyGrid/DsPropertyRow` 组成主要信息层级。
  同级 section 自带统一 padding 和边界；业务页不得用裸 `h2 + p + div`、空白块或局部 margin 伪造二级面板。
- `DsPropertyGrid/DsPropertyRow` 的 `60px` 标签轨是唯一具名的 Inspector 紧凑例外，由
  `--ds-inspector-property-label-track` 持有；主工作区表单不得借用该 recipe 或另写 `60px` 私有轨。
- Inspector tab 按用户任务划分，例如“属性 / 引用 / 诊断 / 绘制”；不得按底层文件或重复主工作区信息划分。
  主区已有资源预览、完整编辑器或问题列表时，Inspector 不再复制一份只读镜像。

### DS-C.8 空、加载、错误与诊断

- 空状态区分：数据库为空、过滤为空、选择为空、资源缺失、权限不足。
- 加载保留结构；错误保留上下文并提供重试/返回，不允许抛异常后整页白屏。
- 页面根必须有 error boundary；错误视图显示模块、对象 id、可复制技术详情和安全返回入口。
- 全局问题条用于跨工程诊断；字段错误留在字段；toast 只用于短暂成功/失败回执，不承载必须处理的问题。

#### DS-C.8a 诊断呈现合同（v2.5.0）

- 页面级、Inspector 与工具内的诊断只允许使用 `DsDiagnosticPanel → DsDiagnosticList →
  DsDiagnosticRow`。Panel 默认拥有状态与错误/警告计数；仅当紧邻父级 `DsObjectHero` 已展示当前分组的同一精确
  总数时，完整 `ready + exact` 结果可用 `statusOwner="external"` 避免重复摘要，`partial / failure` 不得外移或隐藏。
  禁止页面 CSS 隐藏状态。List 拥有 `list/listitem` 和分页，Row 拥有严重度、消息、
  code/detail、证据路径与定位状态；领域页面不得继续用 `cf-err` 或私有卡片复制同义诊断列表。
- Panel 状态固定为 `ready / clear / partial / failure`。完整结果使用 exact 错误/警告计数；读取不全只允许
  `at-least`，失败使用 unknown，禁止把下界伪装成精确数量。每个 Panel 只保留一个 live region；Row 不得逐条
  使用 `role=alert`。
- Row 严重度固定为 `error / warning`，文字标签必须先于消息出现，不能只靠颜色。生产界面默认只显示“严重度 →
  一句作者可读中文问题 → 必要动作”；稳定对象 ID 可原样保留，机器 code、schema path 与英文 kind 必须留在数据层，
  不得常驻复述同一问题。只有位置或证据提供了标题之外的新信息时才可使用 detail/path，且展示标签必须中文化；
  尾部动作使用“跳转”或“在问题面板查看”+ 共享 `open` 图标，领域 label 禁止手写 `↗`。
- 定位行只允许三种原生根：可分享定位用 `<a>`，命令式定位用 `<button>`，静态或不可定位用 `<article>`。
  禁止嵌套交互控件和 disabled 假动作。Reference 与 Diagnostic 是两个公开语义合同，但二者必须通过内部中性
  locator row frame 共用根节点、padding、border、hover/focus、响应式和尾部几何；不得再复制第三套行骨架。
- Project 问题面板保持 30 条紧凑摘要与 80 条完整分页，保留继续显示、显示全部、收起和精确总数。Image 与
  Sound 的引用闭包诊断必须内联在既有“引用”面，不新增 tab；Cutscene 保留独立“诊断”tab；Item 迁移来源与
  Stamp 放置问题保持原 collector、严重度、稳定 key、定位/sidecar/覆盖命令语义。
- 诊断行使用中性 surface 与轻量严重度强调，不使用连续金色边框墙。120 字符 path、1280/900/720 三档与
  200% zoom 不得产生横向页面滚动。Design Lab `RF-17` 是 ready/clear/partial/failure、error/warning、
  button/link/article、152 条分页与长内容基准。

#### DS-C.8b 问题信息架构（v2.8.0）

- 专门的问题页只处理需要修复或关注的诊断；项目身份、版本、本地化统计等只读元数据回到项目概览或权威页面，
  不得因为“高级”而混进问题分类。
- 左侧先按严重度分成错误/警告，再按稳定 `code` 的问题族分组；同一问题族涉及多类资源时继续按资源类型分组。
  每级显示 occurrence 总数，零值使用紧凑空态，不制造可点击假分组。
- 右侧只显示当前组实例，不再重复“这是警告组、可跳转”等可从标题、计数和行操作直接读出的说明。分组标题、
  摘要和行消息不得三次复述同一信息。
- 只有单句问题与必要动作的低信息量列表使用 `DsDiagnosticList layout="adaptive-grid"`，由容器宽度自动排成一至
  多列；含长证据/技术详情的列表保持单列。禁止固定写死“两列”或让窄容器产生横向滚动。
- 问题分类必须由 collector 的稳定 code/type 驱动，禁止在 UI 按中文 message 解析；未知 code 明确进入“其他诊断”
  并保留原 code，不能静默丢失。

### DS-C.9 Modal、drawer 与危险操作

- modal 用于需要阻断背景的短决策；drawer 用于保留上下文的长表单/Inspector；不得互换滥用。
- modal 打开后焦点进入标题或首个字段，Tab 困在内部，Esc 可关闭非破坏性 modal；关闭返回触发点。
- 删除确认必须展示对象、影响和引用数量；输入确认词只用于高影响批量/不可恢复操作。
- 删除被引用对象默认阻断并给出引用清单，不得自动级联清理，除非领域任务明确设计并签字。

## 5. Workbench recipes

### DS-R.0 区域职责与去重

- 左侧列表回答“有哪些对象、当前选了谁、如何筛选和管理集合”；中间回答“当前对象是什么、主要编辑/预览任务
  如何完成”；右侧 Inspector 回答“当前选择的属性、引用、诊断和低频设置是什么”。
- 同一数据只能有一个权威编辑面。列表不得膨胀成表格主编辑器，主区不得再复制完整对象列表，Inspector 不得
  重复中央预览、中央表单、集合操作或项目级保存。
- 页面没有某一区域的真实任务时就不渲染该区域及其布局按钮；不得用空面板、禁用占位和“下一步”tab 填满壳。
- 同类页面优先复用完整 recipe 与领域组件，而不是只复制颜色或按钮。地图与组合的画布/图层/瓦片选择等同义
  能力，音乐与音效的列表/播放器，音频与氛围的工作台骨架，都应共享实现或显式差异接口。

### DS-R.1 对象型工作台

适用：角色、敌人、物品、场景实体、战场等“列表中选对象并编辑”的领域。

- 左：可搜索对象列表与创建/复制；中：当前对象主编辑；右：摘要、引用、诊断或低频 Inspector。
- Wide 可三栏；Medium/Narrow 的右侧必须 drawer 化，列表按 DS-L.2 折叠。
- 主编辑按任务 tab/section 分组，不能把全部字段塞入永久 Inspector。
- `DsObjectHero` 贯穿中央列并承载当前对象的 meta 与中央 owner 的对象级 actions；它不进入内容滚动层。
  若完整对象操作已由左侧管理列表持有，Hero 不重复；引用 Inspector 永不增加第二个删除入口。
- Hero + 长内容必须由 `DsObjectWorkspace` 组成：工作区根负责 `flex + min-height:0 + overflow:hidden`，
  `ds-object-workspace__content` 是中央列唯一滚动 owner，固定使用 `flex:1 1 auto`、`grid-auto-rows:max-content`
  与 `overflow:auto`。领域页面只可追加背景、内容宽度和排版 class，不得重建一套私有滚动壳，也不得让卡片
  在受限高度内压缩后用 `overflow:hidden` 吞掉内容。
- 正向参考：`ActorMode` 的对象列表头和明确任务分区、B2 的编辑卡/引用面板。
- 必须修正的参考缺陷：角色页仍需服从统一 tokens、字段密度、响应式和状态合同；不能复制私有 CSS。
- 反例：把行走图预览永久占据中央主位、把重要战斗/关系字段都挤入窄 Inspector。

### DS-R.2 媒体型工作台

适用：静态图像、精灵、地图、战场背景、视频和帧动画，以及以媒体或场景作为效果预览载体的滤镜定义。

- 左：资源列表/过滤与集合管理；中：对象标题、必要基本信息和占最大面积的预览/播放器；右：属性、引用、诊断
  和低频媒体设置。重命名、复制、删除等完整资源操作按 DS-C.2 只有一个 owner，不默认塞入 Inspector。
- 预览工具条属于画布，位置稳定；元数据不得覆盖内容。
- 音乐/音效使用同一音频工作台：左侧纵向列表，中间标题与基本信息，下方波形、时间线和播放控制，右侧只放
  引用与诊断；氛围沿用同一三段骨架，但中间主预览替换为可比较的场景滤镜效果，滤镜字段也留在中央主任务，
  右侧只放引用与生效说明，不能重复中央字段或预览。
- 滤镜/效果型工作台的预览上下文（场景、相机、缩放、A/B 模式）属于会话临时状态，不进入 content、undo 或保存。
  预览必须复用领域真实 renderer 与 runtime 同一效果 helper；允许缓存无效果底帧并只重做末端合成，禁止用 CSS
  色条、截图或页面私有公式伪装运行时效果。切换对象、场景或工程时必须丢弃过期异步结果，预览操作不得触发
  工程 dispatch。
- 音频目录行只显示名称、稳定 ID 与引用数；不得在行内放播放器、替换或删除，也不得为目录中的每个资源解码。
  当前选中资源才允许按 `projectId + AssetId + sha256` 懒加载，切换资源、替换内容、切工程或卸载必须停止旧播放、
  丢弃旧异步结果，并使用有界派生缓存。
- 时间轴必须声明真实数据来源：WAV 只显示实际解码 PCM 的峰值，MIDI 只显示由 note events 计算的“音符活动”，
  不得把音符密度命名为 PCM 波形。两类可视化均为临时派生状态，不写回资源记录或工程文件。
- 播放器必须共用播放/暂停、停止、可访问 seek、当前时间/总时长以及 loading/error/ready 状态合同；仅在播放时
  读取后端时钟。预览 transport 与游戏 BGM/SFX 的接管、fade、readiness 等运行时语义隔离。
- 音频 Inspector 只承载引用与诊断；格式、路径、来源、大小等只读元数据留在中央基本信息区，替换与删除按
  DS-C.2 由对象 Hero 单一持有，全局保存仍是唯一保存入口。
- Medium/Narrow 优先保留画布；列表和 Inspector 进入 drawer。媒体永远不能被压成面板顶部的小缩略图。
- 正向参考：场景/地图画布既有 pan/zoom 操作和资源工作台的 typed 引用思想。
- 反例修复：当前 `ImageTab` 将图片预览与表单共同挤在上部；应改为独立主画布，并复用 DS-M 合同。

### DS-R.3 脚本 / 流程型工作台

适用：Canonical script、场景脚本 drawer、伤亡脚本、流程/状态机。

- 三个语义区是 source/outline、command tree/graph、selected command form/preview；不是固定三列。
- Wide 可并列；Medium 用主树 + Inspector drawer；Narrow 以 tree/form 两级导航或 split view 切换。
- 当前路径、错误、未翻译状态和运行/预览上下文必须常显；JSON 只作明确的高级/诊断视图。
- 树选择、键盘导航和表单焦点必须保留；切换命令不得丢未提交输入。
- 正向参考：`CanonicalScriptEditorV5` / `ScriptDrawer` 已有 source/tree/form 分工。
- 反例：缩窄三列直到字段逐字换行，或让 JSON fallback 与结构化表单竞争同一主位。

### DS-R.4 数据表型工作台

适用：技能、毒、商店、变量、数值表等高密度数据。

- 使用列表/表格 + 详情，而不是默认复制对象型三栏；可批量比较的字段应留在表格。
- 表头 sticky，列有稳定单位和对齐；数值右对齐，名称左对齐，状态居中。
- 详情可在右侧 drawer 或中区下半，但不得让表格只剩无法比较的窄列。
- 500+ 项必须符合 DS-PERF.1；不允许一次渲染全部复杂行。
- 正向参考：现有各 Tab 的领域分组和结构化表单能力。
- 反例：每种表自行定义列表头、间距、危险按钮和空态，或用行内 style 修补列宽。

## 6. 交互、导航与反馈

### DS-I.1 选择与深链

- 页面 URL 使用权威 `module/page/object` 位置；选择对象必须同步可分享深链。
- 合法但不存在的 object id 显示明确失效空态，不得偷选第一个对象。
- 列表过滤、panel 宽度、折叠状态属于本地 UI 偏好；内容选择和内容数据不写入同一 localStorage 真值。
- 引用跳转应进入权威编辑页并聚焦目标；跳转成功/失败必须可见。

### DS-I.2 键盘

- Tab 顺序跟随视觉和任务顺序；禁止使用正 `tabindex` 改序。
- `Cmd/Ctrl+Z`、`Cmd/Ctrl+Shift+Z` 为全局 undo/redo；文本输入自身编辑历史与全局 command 边界必须明确。
- `Cmd/Ctrl+S` 保存；有 modal 时只作用于 modal 明确允许的提交，不穿透到背景。
- 列表/树支持方向键、Home/End；Enter 打开/编辑，Space 只用于符合平台惯例的选择，Delete 必须经过删除规则。
- 快捷键不得在文本输入、组合输入法或屏幕阅读器交互中误触。

### DS-I.3 Dirty、保存与长任务

- dirty 状态在全局固定位置显示；离开/关闭前有未保存改动必须阻止或确认。
- Header 右上角全局保存是项目持久化的唯一入口；连续字段只在确认后经 command/session 进入同一 dirty 状态，页面、
  Inspector、对象卡和底栏不得再出现泛化的“保存名称”“保存组合”“保存作者元数据”等局部保存按钮。
- 创建、导入、应用、生成、替换等有独立事务语义的局部动作可以保留准确动词，但执行后仍只更新全局 dirty，
  不得伪装成已经写盘；modal 的“创建/应用”提交只关闭该短决策，不替代全局保存。
- 保存必须是事务性：进行中、成功、失败都有稳定状态；失败不得清 dirty，也不得丢 undo/redo。
- 超过 `500ms` 的任务显示进度或明确 busy 状态；超过 `2s` 应给阶段说明或可取消能力（若安全）。
- 进度和结果通过 `role=status` / `aria-live=polite` 单一通道播报；错误使用 `role=alert`，避免重复播报。

### DS-I.4 Undo / redo

- 所有持久修改经过 command/session；临时选中、pan、zoom、panel 宽度不进入内容 undo。
- 一个用户意图应是一笔 undo；批量操作不能每行各入一笔，除非用户明确逐行操作。
- no-op 不入栈；失败命令零写入；redo 只有新持久命令成功后才清空。
- UI 文案显示可撤销动作名称，不只显示“撤销”。

### DS-I.5 错误恢复

- 已知错误必须转为页面/区域状态，禁止抛到根导致白屏。
- error boundary 提供：人类可读摘要、技术详情复制、重试、安全返回、当前对象定位信息。
- 解析或形状异常必须 fail-loud，不用空数组/默认对象掩盖，例如 `stages is not iterable` 类问题必须显示
  “数据形状不兼容”而非空白页。

## 7. 媒体查看合同

### DS-M.1 共同能力

图像、精灵、地图、战场和帧动画预览必须共享以下概念和默认操作：

- `适应窗口`（fit）：完整内容可见，默认进入。
- `1:1`：一个源像素对应一个 CSS pixel；像素资源使用 nearest-neighbor。
- `放大 / 缩小`：围绕指针或视口中心，显示当前百分比。
- `重置`：回到 fit、居中和默认帧/图层状态。
- `平移`：Space+拖动或中键拖动；触控板平移不得与页面滚动争抢。
- `缩放范围`：最小由 fit 决定但不低于 5%，最大 3200%；常用离散档可为 25/50/100/200/400%。

### DS-M.2 画布布局

- 画布必须是媒体 recipe 的主区，工具条固定在画布边缘，不因元数据长度移动。
- 画布背景在透明棋盘格、纯黑、主题背景间可切换；默认按资源类型选择。
- 宽图、高图、透明图和小像素图都必须可完整 fit；不得用 `object-fit: contain` 的小盒子代替可操作画布。
- 图片加载期间保留画布尺寸；加载失败显示资源 id/path、重试和替换入口。

### DS-M.3 领域扩展

- 精灵可以增加方向、动作、帧、播放速度和 hitbox overlay。
- 地图可以增加图层、网格、碰撞和编辑工具；共同 pan/zoom 语义不得改变。
- 战场可增加站位/安全区 overlay；静态背景查看仍使用共同控制。
- 视频/帧动画可增加时间轴、播放和帧率；fit/1:1/reset/pan 保持一致。

### DS-M.4 可访问性

- 画布必须有可读名称和文本摘要（尺寸、类型、当前帧/缩放）；不能只依赖视觉。
- 工具条支持键盘；缩放值可读且不只显示图标。
- 纯装饰预览使用空 alt；承载资源身份的缩略图 alt 使用资源名称，不重复周围文本。

## 8. 无障碍、国际化与长文本

### DS-A.1 语义与焦点

- 优先使用原生 `button/input/select/textarea`；自定义控件必须实现等价键盘和 ARIA 语义。
- 每页有唯一主标题和 `main`；导航、列表、Inspector、状态区使用合适 landmark/heading。
- `:focus-visible` 必须清晰，禁止无替代地移除 outline。
- DOM 顺序必须与视觉顺序一致；响应式 drawer 不得复制两份可聚焦内容。

### DS-A.2 长文本与国际化

- Fixtures 必须使用至少：20 个汉字名称、40 字符英文、64 字符 id、120 字符路径。
- 中文标签不逐字换行；英文/id 允许在语义边界换行或中间省略，并提供完整值。
- UI 不依赖固定字数、英文大小写或全角/半角字符定位。
- 数字、百分比、时长和文件大小使用一致格式；字段单位不得只写在 placeholder。

### DS-A.3 表单与反馈

- 错误摘要应链接到字段；字段错误与 input 通过 `aria-invalid` / `aria-describedby` 关联。
- 选择器、tab、tree、dialog、popover 遵循相应 ARIA pattern；不得给静态 div 伪造多余 role。
- toast 不获得焦点；需要用户决策的错误使用 inline 或 dialog。

### DS-A.4 动作目标与缩放

- 桌面编辑器的紧凑目标最小 `32×32px`；主要和危险动作建议 `36px` 高。
- 在 200% 浏览器缩放下，核心功能和文字仍可达；允许进入 Narrow recipe，不允许双向页面滚动。
- DPR 变化不得改变控件尺寸或断点，只影响 canvas backing store。

## 9. 实现合同与反模式

### DS-IMP.1 样式层级

生产实现应按以下顺序落地，后层只能组合或扩展前层：

1. `tokens.css`：foundations 与主题 alias；
2. `primitives.css` / primitive components：Button、Tabs、Field、TextInput、TextArea、NumberInput、Select、
   Combobox、MultiSelect、Checkbox、RadioGroup、Switch、Card、ListHeader、Drawer、Dialog、Status；
3. `recipes.css`：Object/Media/Script/Table workbench；
4. 模块样式：只描述领域内容，不重定义通用控件。

### DS-IMP.2 Inline style 边界

- 禁止用 inline style 写颜色、字体、间距、边框、常规宽高和响应式布局。
- 仅允许把运行时几何值、媒体尺寸、拖拽坐标或 CSS custom property 值通过 style 传入。
- 允许项必须有稳定 class 和注释说明为何无法由 token/class 表达。

### DS-IMP.3 Primitive 边界

- Primitive 不读取业务 store、不知道 Actor/BattleField/Scene id，也不执行保存命令。
- Recipe 只组织槽位、响应式和滚动；领域组件拥有数据和命令。
- 同一语义第二次出现时必须检索现有 primitive/recipe，第三次出现前必须完成抽取或登记正式例外；不得按视觉
  相似度复制 JSX 后再靠人工同步。修一个共享语义缺陷时必须搜索全仓同义 class/component/文案并列出迁移面。
- Shared primitive 的公共 props 变更属于跨模块接口，必须有契约测试和迁移清单。
- 已有局部组件被证实承担跨模块语义时，提升为 design-system primitive，并把行为、样式、ARIA、overlay 和测试
  一起迁移；禁止只复制 CSS。`DsHelpTip`、`DsReference*`、`DsDiagnostic*`、`DsCatalogControls` 均遵守此路径。

### DS-IMP.4 禁止的反模式

- 裸数字计数、emoji-only 动作、placeholder-as-label、只靠颜色表达状态。
- 用折叠隐藏主任务；用缩小字号解决空间；让 tab/工具条 `flex-shrink`。
- 在 render 中按名称/数组下标猜身份；引用选择器退化成裸 id 输入。
- 异常捕获后返回空数组造成“看似没数据”；错误必须保留证据并可恢复。
- 一个页面重复实现 pan/zoom、dialog focus trap、typed reference list 或 save 状态。
- 用原生 `title`、业务私有绝对定位气泡或页面内 clipped popup 替代共享 tooltip/popover；弹层必须使用语义
  z-index、viewport 碰撞和所属 modal 的 top layer。
- 为修单个宽度新增不可解释 magic breakpoint；断点必须属于 DS-L.2 或有正式例外。

### DS-IMP.5 自动与人工规则映射

每条 rollout 卡必须标出：

- **static**：stylelint/ESLint/类型检查可守（如禁止小字号、禁止直接颜色、inline style 边界）；
- **component**：Vitest/DOM contract 可守（ARIA、状态、键盘）；
- **visual**：Playwright screenshot/尺寸断言可守（断点、溢出、画布）；
- **manual**：只能由用户/审查者判断（信息层级、主任务是否突出）。

人工条款不得伪装为自动证明；自动条款也不得只靠截图人工看。

## 10. Reference fixtures 与验收矩阵

### DS-T.1 Design Lab 设计

规范落地阶段应建立与业务模块隔离的 `Design Lab`，使用固定本地 fixture 数据，不读真实工程、不写内容：

- `FoundationGallery`：颜色、排版、间距、图标、状态。
- `PatternGallery`：按钮、字段、tab、列表头、对象行、卡片、选择器、`DsHelpTip`、引用/诊断、空/错/加载、dialog/drawer。
- `RecipeGallery`：Object、Media、Script、Table 四类完整壳。
- `StressGallery`：长文本、大列表、错误、无图/宽图/高图、zoom/DPR 和 reduced motion。

Design Lab 是后续 ED-DS-2 的实现目标；本卡只冻结其输入和验收，不修改生产 UI。

### DS-T.2 必备 fixtures

| ID | 场景 | 关键断言 | 主要证明 |
|---|---|---|---|
| RF-01 | 1280 / 100% Object | 四区可见，主区 >=520px，tab 40px | Wide 壳 |
| RF-02 | 900 / 100% Object | Inspector drawer，字段不逐字换行 | Medium 壳 |
| RF-03 | 720 / 100% Object | 单主区，列表/Inspector 互斥 drawer | Narrow 壳 |
| RF-04 | 1280 / 125% 与 150% | 分别进入 Medium/临界 Medium，无溢出 | G1 浏览器缩放 |
| RF-05 | DPR 1/2 Media | 控件尺寸不变，canvas 像素清晰 | DPR 边界 |
| RF-06 | 长中英文/id/path | 标签不逐字换行；完整值可达/复制 | i18n/长文本 |
| RF-07 | 空/过滤空/缺引用/加载失败 | 四种状态文案与动作不同，无白屏 | 恢复能力 |
| RF-08 | 11 状态组件集 + 通用表单控件矩阵 | Button/Input/Select/MultiSelect/Checkbox/Radio/Switch 的 focus/open/selected/indeterminate/error/disabled/readonly 可区分；单/多选键盘与焦点返回正确 | 状态与表单合同 |
| RF-09 | 无图/宽图/高图/透明图 + surface hierarchy | 中央 workspace 最深；panel/card/input 层级依次抬高；checkerboard/plain-dark/black/grid 四模式正确，fit/1:1/pan/reset/背景切换正常 | Surface/媒体合同 |
| RF-10 | 500+ 对象列表 | DOM/延迟预算通过，选择和过滤稳定 | G3 性能 |
| RF-11 | Script tree/form | 三档布局、树键盘、错误聚焦、未提交保护 | Script recipe |
| RF-12 | Data table 500 行 | sticky header、单位/对齐、详情 drawer | Table recipe |
| RF-13 | Modal/drawer/delete blocked | 焦点 trap/return、Esc、引用阻断 | 危险操作 |
| RF-14 | reduced motion / 200% zoom | 无非必要动画，核心功能可达 | 无障碍 |
| RF-15 | 单行 Header 菜单 + 常用操作 + 布局控制，1280 / 900 / 720 | Wide/Medium 十项同级；Narrow 显式文件/编辑/导航与模块分组；战斗 4 子页可见且 href 正确；当前 capability 的布局按钮与撤销/重做/保存无 wrap/scroll；按钮/menu 共用命令；弹层不被分栏线覆盖；项目名不挤 Header；分栏线无常驻悬浮按钮；场景页底部按钮与既有脚本面板同源开关，无该 capability 的页面不渲染对应入口 | v2.8 应用壳纠正 |
| RF-16 | Reference simple/grouped/static/loading/partial/error/long-content | 精确与下界计数、occurrence、真实 button/link/article、长路径和静态原因符合 DS-C.6a | v2.3 引用合同 |
| RF-17 | Diagnostic ready/clear/partial/failure + 152 条 mixed severity | error/warning 文字、真实 button/link/article、30/80 分页、单 live region、长路径与窄宽度符合 DS-C.8a | v2.5 诊断合同 |
| RF-18 | Help/Inspector/action ownership + 1280/900/720/200% | 无效说明不存在；概念帮助为 18px 圆形视觉/稳定命中区，hover/focus/touch/Esc、viewport collision、modal top layer 与 ARIA 通过；Inspector section 节奏统一；完整对象动作与全局保存不重复 | v2.8 信息架构合同 |
| RF-19 | 86 MIDI / 363 WAV 音频工作台，1280/900/720 | 目录有界挂载；仅选中项加载；WAV 标“PCM 波形”、MIDI 标“音符活动”；play/pause/stop/seek、切换停止、loading/error、引用/诊断和无横向溢出通过 | DS-R.2 音频真实性与生命周期合同 |
| RF-20 | 25 registry 页面 + 标准/紧凑目录行 + allowlist 负例 | registry/DataMode 双向闭合；68/46px 行高、leading 策略、title/meta 截断一致；legacy/raw/static 违规 exit 1，损坏/stale allowlist exit 2，动态几何与 DS 内 file input 不误报 | v2.10 全量采用门禁 |
| RF-21 | Ordered collection default/compact + catalog/fixed/nested/timeline + disabled/empty/single/52 项长列表 | grip 位于 item 边界内且不占 media leading；insert/swap 实时让位只有一个 indicator，提交无回跳；pointer/keyboard/click 同 owner，nested scope、水平 timeline、真实 scroll owner 与长名称无裁切 | v2.12 排序合同 |
| RF-22 | Add Picker 0/1/234 + rich-row media/detail/trailing + active/selected/disabled/all-disabled/empty/long | 标题动作稳定；固定 ID + detail 截断、60px 两行 rich row、direct searchable listbox、80 阈值、明确 footer confirm、分层 Escape、single command、唯一滚动与 focus return 通过 | v2.13 候选追加合同 |
| RF-23 | 480px / 479px FieldGroup + 长中文/help/error/短数值 + Inspector PropertyRow 对照 | 480px 共享 96px 标签轨；479px 整组 stacked；长标签自然换行且 control 起点不漂移；help/error 与 control 同列；Inspector 仅以具名 60px 紧凑轨存在 | v2.14 字段布局合同 |

### DS-PERF.1 大列表性能合同（G3）

- 预计可见条目达到 `500` 时，复杂对象列表/表格必须虚拟化或分页；一次挂载的交互行不得超过 `120`（含 overscan）。
- 简单原生 option 等特殊控件若不适用虚拟化，必须用可搜索 picker 或分页，不得直接展开 500 个复杂选项。
- RF-10/RF-12 在项目固定 Playwright Chromium 环境中测 20 次：
  - 输入过滤到结果提交的 p95 不超过 `100ms`；
  - 键盘/指针选择的视觉反馈不晚于下一动画帧（无 I/O 条件）；
  - 连续滚动 3 秒不得出现超过 `100ms` 的主线程 long task。
- 性能数据、浏览器版本和 CI 机器信息必须随证据保存；只报“看起来不卡”不能通过。

### DS-T.3 自动检查矩阵

| 领域 | Static | Component | Visual/E2E | Manual |
|---|---|---|---|---|
| tokens | 禁直接颜色/小字号 | N/A | gallery snapshot | 语义命名 |
| layout | 禁私有断点 | drawer/tab contract | 6 个宽度/zoom fixtures | 主任务面积 |
| controls | props/type contract | 状态/ARIA/键盘 | focus/overflow screenshot | 文案层级 |
| media | shared view model | zoom/pan reducer | 宽/高/透明图 | 工具位置 |
| errors | no silent empty fallback | boundary/retry/live region | 故障注入不白屏 | 错误可理解性 |
| performance | bundle/lint 边界 | virtual list contract | RF-10/RF-12 trace | 体感复核 |

### DS-T.4 用户验收包

规范冻结前应向用户提供：

1. foundations/状态 gallery；
2. 四类 recipe 的 1280/900/720 对照；
3. Image/media 的 fit/1:1/pan/zoom 演示；
4. 长文本和 500+ 列表压力演示；
5. 角色/B2 映射表与 Image/旧战斗反例修复示意；
6. 条款变更摘要和仍待产品裁决项。

用户验收规范只代表设计合同冻结，不代表生产模块已经迁移完成。

## 11. Rollout、例外与版本治理

### DS-G.1 后续顺序

1. **ED-DS-1**：规范正文、审查、用户冻结（本卡）。
2. **ED-DS-2**：代码化 tokens、基础 primitives、Design Lab、static/component/visual gates。
3. **ED-AUDIT-2**：按本规范 + ED-1 七环 + 代码质量三线审计全部一级模块，形成优先矩阵。
4. **模块迁移批次**：优先资源图像与战斗，再按审计痛感拆小卡；每卡引用条款和 fixtures。
5. **质量收口**：删除旧 alias、重复 CSS、inline style 和无 owner primitive；不得长期维持双设计系统。

### DS-G.2 模块采用清单

每个迁移卡至少填写：

- 采用的 recipe 与条款编号；
- 主任务、L1-L5 信息层级；
- Wide/Medium/Narrow 行为；
- 使用的 primitives 与领域扩展；
- 状态、键盘、无障碍和错误恢复；
- 关联 reference fixtures；
- 旧样式/组件删除清单；
- ED-1 七环是否受影响；若受影响，另列功能测试，不用视觉测试替代。

### DS-G.3 例外记录

允许的 SHOULD 例外必须写入任务卡：

```md
Design-system exception:
- 条款:
- 模块/页面:
- 用户任务:
- 无法采用标准 pattern 的直接证据:
- 替代方案与可访问性/响应式验证:
- 期限: permanent | remove by <task>
- 产品裁决:
```

MUST/MUST NOT 条款如需改变，不能写例外；必须升级规范版本并重新 review。

### DS-G.4 版本

- 文案澄清、链接修复不改变版本。
- token 数值微调和不改变语义的 primitive 修复为 patch。
- 新 pattern/recipe 或响应式合同扩展为 minor。
- 改主题、布局档位、交互模型、无障碍底线或删除既有合同为 major。
- 规范版本与代码 token/primitives 版本必须在 Design Lab 显示；截图证据必须记录版本。

## 附录 A：现状映射（规范冻结前基线）

| 当前页面 | 参考价值 | 按本规范仍需复核 |
|---|---|---|
| ActorMode | 对象列表、任务 tab、内容分区清晰 | tokens、折叠主内容、窄宽、字段布局、统一 icons |
| BattleFieldTab | 卡片、空状态、引用面板形成第二个对象纵切 | inline/密集 JSX、三档壳、媒体查看复用、状态全集 |
| ImageTab | typed 资源列表、类型 tab、引用闭包已有基础 | 预览升为主画布、统一 zoom/pan、drawer、长图/高图压力 |
| CanonicalScriptEditorV5 / ScriptDrawer | source/tree/form 与预览语义较成熟 | 三档 recipe、焦点/树键盘、错误边界、JSON 降级边界 |
| 旧 Battle tabs | 已有领域数据入口 | 信息层级、列表头、字段密度、危险操作和 recipe 全面审查 |

## 附录 B：用户已验收的视觉裁决

2026-08-15，用户以 `ED-DS-1：六项通过` 全部确认以下 v1 合同：

1. v1 暗色 palette 的明度与蓝色 accent；
2. 普通控件 `36px`、tab `40px`、卡片圆角 `10px` 的密度；
3. Wide/Medium 分界 `1200px`、Medium/Narrow 分界 `840px`；
4. Medium 下 Inspector 默认 drawer，而非永久窄列；
5. 对象/媒体/脚本/数据表四类 recipe 是否覆盖全部真实工作台；
6. 资源媒体画布的 toolbar 位置和默认透明背景。

以上六项随 v1.0.0 冻结；后续修改按 DS-G.4 处理。

## 附录 C：v1.1.0 amendment（用户已定形）

2026-08-15，用户否决战斗模块“技能 / 敌人 / 毒 / 战场”的 2×2 emoji 二级入口，也否决窄区横向滚动 rail；
随后逐项定形：Header 第一行把文件、编辑与八个模块作为同级菜单，不显示工程名称；模块子页进入纵向下拉；
第二行提供图标 + tooltip 的高频快捷工具栏并允许本机自定义；保存属于文件菜单，撤销/重做属于编辑菜单，但三者
均可作为默认快捷按钮；单选、多选、checkbox 等通用表单控件必须统一；中央编辑工作平面必须深于结构面板和
内容卡片，媒体 checker/black/grid 纹理按类型统一，战场页作为反例 canary。用户在确认设计系统含义后要求
“开始”，故本 amendment 作为 v1.1.0 normative 合同冻结，不追改 ED-DS-1 v1.0.0 六项历史验收记录。

## 附录 D：v2.0.0 amendment（用户已定形）

2026-08-15 实机检查后，用户否决只承载撤销、重做、保存的独立第二行工具栏，改为单行 Header 左菜单、右常用
操作；同时指出 Narrow 导航弹层被分栏线/折叠按钮覆盖、旧 active 蓝条和长列表缺少设计感。v2 删除工具栏本机
自定义合同，新增 Header 层叠隔离、按模块分组的窄屏导航面板与 soft-accent/check 当前态。本变化属于布局与交互
模型删除，按 DS-G.4 升 major；v1.1 历史裁决保留，不再授权当前实现。

## 附录 E：v2.1.0 amendment（用户已定形）

2026-08-15 实机检查后，用户否决分栏线上常驻的悬浮收起按钮，并要求像现代桌面工具一样在 Header 快捷区
集中控制左、下、右三个面板；同时指出撤销、重做、保存按钮尺寸过大。v2.1 冻结以下增量：分栏线只负责
拖拽；Header 增加紧凑布局按钮组，“视图”菜单提供同源命令与重置布局；底部按钮打开真实问题/诊断 drawer；
左右宽度、底部高度和显隐状态可受约束地记忆；撤销/重做采用 `28×28px` 图标按钮，保存采用 `30px` 紧凑
主按钮。该变化新增布局控制 pattern，不改变 v2 的单行 Header、菜单信息架构或 v1 的断点，按 DS-G.4 升 minor。

> 2026-08-15 用户实机澄清：本节把“底部面板”解释为全局问题/诊断 drawer 是错误前提；该句以及由此派生的
> diagnostics drawer 设计只保留为历史，不再授权实现。正确对象见附录 F。

## 附录 F：v2.2.0 correction（用户已定形，待 Kimi / GLM 重签）

用户所指的“底部面板”是场景工作区中地图/演出预览下方已有的脚本编辑面板，而不是新的全局诊断区。
代码现状也已有唯一控制链：`App.drawer.open` 同时驱动场景工具栏“脚本”按钮、新版
`CanonicalSceneScriptWorkspaceV5` 与旧版 `ScriptDrawer`；两种实现各自已有水平 resize 和高度记忆。

v2.2 冻结以下纠正：Header 中间布局按钮、`视图 > 脚本面板`、场景工具栏“脚本”和 Cmd/Ctrl+Alt+B
必须复用这一条现有开关；场景页打开后沿用当前面板内容、选中项和高度，关闭后回到完整场景画布。不存在该
capability 的页面不渲染入口；capability 存在但临时不可用时才 disabled 并显示原因。不得新增全局 `.editor`
grid 行、第二套 bottomVisible/bottomHeight 或诊断 drawer。
场景脚本面板的水平分隔线继续负责 resize；在 Header/View/shortcut 恢复路径可用后，才可移除该分隔线上的
常驻收起按钮，且不得误删 `ScriptDrawer` 内部其他分栏的 resize/toggle 能力。

> 2026-08-22 用户实机纠正：不存在对应 panel capability 时，保留 disabled 入口会与“无 Inspector 即隐藏”
> 形成不一致。当前规则由 DS-L.6 / RF-15 覆盖为“capability 不存在则不渲染；仅临时不可用才 disabled + 原因”。

## 附录 G：依据与边界

- [`READ-FIRST.md`](../READ-FIRST.md)：二阶段架构、全新 UI 与用户定形边界。
- [`editor-design.md`](editor-design.md)：编辑器产品/数据/模式架构；不再承担视觉规范。
- [`editor-modernization-follow-up-2026-08-14.md`](editor-modernization-follow-up-2026-08-14.md)：
  用户拍板的设计规范先行与后续三线审查范围。
- [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)：
  无障碍、焦点、表单、动效、排版、状态、导航、触控与响应式外部基线。该外部基线不替代本项目产品裁决。

## 附录 H：v2.8.0 interaction / IA consolidation（用户已定形，待 Kimi / GLM 重签）

2026-08-22 连续实机审查暴露的不是孤立 padding，而是同义语义仍由业务页各自实现。v2.8 将以下裁决提升为
全编辑器合同：无帮助价值的说明删除；稳定概念通过共享圆形 `DsHelpTip` 渐进披露，状态/错误/风险/下一步继续
常显；字段与二级 section 使用统一垂直节奏；图标按语义登记；项目术语统一；完整对象操作只有一个 owner；
Inspector 不重复中央主任务；全局保存是唯一写盘入口；没有真实 capability 的 panel 入口隐藏；问题页按严重度、
稳定 code 和资源类型分组且不混入项目元数据；音乐/音效和氛围采用同一媒体工作台骨架。

这次增量同时把脚本私有帮助控件提升为 design-system primitive，并规定“第二次检索、第三次前抽取”的重复治理
门槛。后续发现同类问题必须修共享 owner 与采用面，不能继续逐截图打页面补丁。RF-18 是本次合同的最小回归面。
