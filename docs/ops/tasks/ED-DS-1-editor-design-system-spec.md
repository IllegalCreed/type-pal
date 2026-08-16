# ED-DS-1 - 编辑器设计系统与交互规范

Status: done
Phase: phase2
Capability: Editor cross-cutting（本卡不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: GLM（Kimi 因额度缺席，用户已批准不等待）
Visual Verification Owner: Codex + User
Visual Verification Timing: dev-functional
Unavailable Agents: Kimi
Branch: TBD

## 目标

先于任何模块级视觉翻新，建立一份可执行、可验证、可持续演进的编辑器设计规范：冻结设计 tokens、
应用壳与布局语法、共享组件模式、交互与状态规则、媒体预览合同、无障碍基线、reference fixtures、
实施与例外流程。后续角色、战斗、资源、场景等模块必须引用具体规范条款实施，而不是继续按页面局部感觉
调整；角色模块和 B2 战场工作台作为正向参考输入，资源图像和旧战斗页作为反例输入，但没有任何现有页面
自动成为不可质疑的标准答案。

本卡最终产物是**规范与验收基线**，不是一次性重做整个编辑器；只有用户验收规范后，才拆分后续
shared primitives 与模块迁移任务。

## 范围

- 范围内:
  - 设计基础：语义颜色、字体、字号/行高、间距、尺寸、圆角、描边、阴影、图标、动效和状态 tokens。
  - 布局语法：应用壳、一级导航、对象列表、主工作区、Inspector、drawer/modal、滚动归属和
    1280 / 900 / 720 三档响应式规则。
  - 组件模式：列表头、数量、搜索、tab、卡片/分组、字段行、选择器、引用卡、创建/复制/删除、
    空/加载/错误/禁用/聚焦状态、危险操作和长任务反馈。
  - 交互规则：选择与深链、焦点与键盘、dirty/save、undo/redo、删除保护、跳转回执、文案和命名。
  - 媒体规则：图像、精灵、地图和战场预览的 fit、缩放、平移、1:1、重置、透明背景及元数据分区。
  - 实现合同：CSS variables、shared primitives、模块级扩展边界、反模式和例外审批。
  - 验收样板：宽/中/窄、长中文/英文、空库/大库、无图/宽图/高图以及各交互状态的 reference fixtures。
  - 制定后续三线审查的统一尺：视觉与交互、ED-1 七环、代码质量。
- 范围外:
  - 不在本卡翻新角色、资源、战斗、场景等业务模块。
  - 不修改 content schema、save、migration、asset pipeline、Reforge runtime 或 capability-map 状态。
  - 不在规范完成前建立覆盖所有页面的大型组件库。
  - 不把产品视觉规范伪装成“照搬原版/第一阶段编辑器”；原版没有本编辑器这一作者工具。
- 明确不做:
  - 不用几张效果图代替可执行规则和状态矩阵。
  - 不把角色模块逐像素复制到所有领域，也不因其当前最受用户认可就跳过自身复核。
  - 不把 `editor.css` 继续堆叠模块私有魔法数当作设计系统。
  - 不在规范中规定业务 schema、领域命令或保存格式。

## 前提真值门

### 一句话行为 / 工程前提

编辑器整体风格要真正统一，必须先冻结一套由产品认可、实现可复用、状态可验证的设计系统，再以它为尺
迁移各模块；逐模块模仿一个“看起来最好”的页面只能产生新的局部方言。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版游戏没有本项目的现代内容创作编辑器，不能为作者工具提供布局与交互真值。原版只在具体游戏内 UI 有对应时提供内容/UX 参考。 | `docs/phase2/READ-FIRST.md:8-11,21-22` |
| 第一阶段 | N/A：第一阶段实现的是游戏运行界面，不是当前二阶段的项目编辑器；只有具体运行时 UI 有对应时才是 UX 真值，全新 UI 必须先由用户定形。 | `docs/phase2/READ-FIRST.md:20-22,33-35` |
| 当前二阶段 | 编辑器已有应用壳、可调左右栏和少量颜色 tokens，但设计合同没有覆盖完整间距、排版、组件、媒体与状态体系；样式和视图持续按模块增长。当前 `editor.css` 15,519 行、`App.tsx` 3,839 行，仍存在大量 inline style；图像工作台拥有独立列表/预览结构但缺统一媒体画布合同。角色页与 B2 战场页已提供较清晰的信息架构参考。 | `packages/editor/src/ui/editor.css:2-18,207-223,9114-9161`; `packages/editor/src/ui/App.tsx:1008-1077,2514-2529,3355-3429`; `packages/editor/src/ui/ImageTab.tsx:220-257,332-390`; `packages/editor/src/ui/ActorMode.tsx:282-330`; `packages/editor/src/ui/BattleFieldTab.tsx:280-314`; 文件行数由 `wc -l` 复核（2026-08-15） |
| 本任务目标 | 由一份规范统一定义 foundations、layout、components、interaction、media、accessibility、implementation contract 与 reference fixtures；用户验收后，所有模块翻新引用条款并记录例外。 | 用户 2026-08-15 拍板“先有一个完整的设计规范，然后按照规范来实施”；`docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md:13-41,81-87` |

### 反证与替代解释

- 最强替代解释 1：角色模块已经令人满意，直接复制它的布局/CSS 到全部模块最快。
  - 反证：角色、地图、脚本、图像和战场的主任务不同，三栏比例、信息密度和媒体空间不能相同；
    角色页本身仍是模块私有实现。应抽取其成功原则并用反例压力测试，而不是把偶然结构当通用规则。
- 最强替代解释 2：先重构 `editor.css` / `App.tsx`，在代码里自然长出规范。
  - 反证：没有先冻结产品规则，重构只能固化当前不一致，并让用户在实现后继续指出布局意图；规范必须先于
    shared primitive 与模块迁移。
- 最强替代解释 3：现有颜色变量已经是设计系统，只需补更多 CSS variables。
  - 反证：颜色变量不能定义滚动归属、信息层级、响应式降级、键盘/焦点、错误/加载、媒体查看或危险操作。
- 什么观察会推翻当前前提:
  - 若仓库已有另一份覆盖上述七层、已被用户验收且所有模块正在引用的规范，本卡应改为审计/补缺，不另建体系。
  - 若用户决定各模块有意采用完全不同的产品语言，只要求最低无障碍与功能一致性，本卡应缩为跨模块基线。
  - 若参考 fixtures 无法在不先大改业务模块的情况下表达规范，应先建独立 design-lab/reference page，不把业务页
    当规范测试容器。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类：N/A；本卡不改变运行时或业务命令语义。
  - 原版 / 第一阶段理解：已由 READ-FIRST 明确，全新作者工具没有可照搬的一阶段形态。
  - extractor / 地图 / 数据解码：N/A；本卡不处理内容数据。
  - audit / test model：用户连续实机指出 tab 挤压、文字换行、白屏、布局失衡和媒体预览问题；现状不是仅由
    单一截图尺寸造成，规范必须覆盖状态与宽度矩阵。

### 用户可见偏离

- 是否主动偏离已核真值: yes（从局部页面自行形成样式，转为规范先行）
- `before -> after` 一句话: `每个模块独立堆布局和样式 -> 所有模块按同一规范、共享 primitive 与可重复 fixture 实施`
- 代表场景: 同一 1280 / 900 / 720 宽度下，角色列表、战场工作台和图像资源页使用一致的列表头、tab、
  字段密度、焦点与错误状态；媒体页保留真正的主预览画布而不是被摘要面板压缩。
- 用户裁决: 2026-08-15 用户明确批准“先有完整设计规范，再按规范实施”。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md:8-11,21-22,33-35`：二阶段架构第一；全新 UI 先由用户定形。
  - 用户 2026-08-14：角色模块是当前最满意的正向参考；资源图像和战斗模块布局需要系统翻新。
  - 用户 2026-08-15：B2 已完成；下一步必须先做完整设计规范，再按规范实施。
  - `AGENTS.md`：本卡属于跨模块、用户可见且影响公共实现合同的高风险任务，必须开卡并过前提/设计门。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/editor.css:2-18`：当前基础颜色/字体变量。
  - `packages/editor/src/ui/editor.css:207-223`、`packages/editor/src/ui/App.tsx:1008-1077`：当前应用壳与可调面板。
  - `packages/editor/src/ui/ActorMode.tsx:282-330`：角色对象列表头和创建/复制参考。
  - `packages/editor/src/ui/BattleFieldTab.tsx:280-314`：B2 卡片/空状态/引用区参考。
  - `packages/editor/src/ui/ImageTab.tsx:220-257,332-390`、`packages/editor/src/ui/editor.css:9114-9161`：资源图像现状。
  - `packages/editor/src/ui/App.tsx:2514-2529,3355-3429`：局部 inline style 与模块内状态表达实例。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md`：三条后续审查线和规范先行边界。
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`：功能闭环仍沿用 ED-1 七环，不与视觉规范混为一谈。
  - [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)：作为可访问性、焦点、表单、动效、排版、状态、导航和响应式的外部检查基线；不替代本项目产品裁决。
- 不得重新引入:
  - 仅靠页面截图/主观“好看”验收；只有宽屏 happy path，没有窄宽和长文本状态。
  - 用 emoji 替代有语义的统一图标合同；无 focus-visible、无 label、无错误说明的裸控件。
  - 模块私有颜色/间距/控件复制，或通过无限增加 `editor.css` 选择器解决架构问题。
  - 将 ED-1 七环、数据 schema、运行时真值混进视觉规范并一次性重做。
- 相关测试 / 验证基线:
  - `packages/editor/src/ui/ActorMode.test.tsx`
  - `packages/editor/src/ui/BattleFieldTab.test.tsx`
  - `packages/editor/src/ui/App.reference-navigation.test.tsx`
  - 后续新增 design reference fixtures、keyboard/focus/component contract tests 和 1280/900/720 浏览器截图矩阵。

## 验收条件

### 规范产物

- 一份唯一 normative 设计规范，至少包含：原则与信息层级、tokens、应用壳/布局、组件模式、交互/状态、
  媒体查看、无障碍、响应式、实现合同、验收 fixtures、采用/例外流程。
- tokens 采用语义命名并给出用途与禁止用法，不只列十六进制值；覆盖 typography、spacing、sizes、radii、
  borders、elevation、color、motion、z-index 和 density。
- 1280 / 900 / 720 三档明确规定：列的保留/折叠顺序、最小主区宽度、tab 高度、字段换行、滚动容器、
  Inspector/drawer 行为；不得只写“响应式适配”。
- 所有 pattern 必须覆盖 default、hover、focus-visible、active/selected、disabled、loading、empty、error、
  warning、success 和 destructive（适用者）状态。
- 媒体查看器明确 fit、zoom in/out、1:1、reset、pan、键盘/触控、透明背景、加载/错误、尺寸/引用元数据，
  并说明图像/精灵/地图/战场可复用部分及领域扩展点。
- 无障碍基线至少覆盖语义控件、label、键盘顺序、focus-visible、dialog 焦点管理、live region、颜色对比、
  reduced motion、点击目标和图像 alt/装饰语义。

### Reference fixtures 与审查方式

- 给出可以独立验证规范的 reference page/fixture 设计，不依赖修改真实业务数据；至少覆盖：
  - 1280 / 900 / 720；
  - 长中文、长英文/ID、空列表、500+ 项列表；
  - 无图、超宽图、超高图、透明图、加载失败；
  - 表单聚焦/错误/禁用/dirty/save、删除阻断、深链跳转反馈；
  - 键盘操作和 `prefers-reduced-motion`。
- 角色页与战场页逐条映射到规范，分别记录“保留 / 调整 / 例外”；图像页与旧战斗页逐条列出反例，
  证明规范能指导修复而不是只描述现状。
- 规范文档中必须给出后续 rollout 顺序、每批迁移的验收清单和 exception 记录格式。
- 用户完成规范级产品验收后才可标 done；此验收不等于各模块已翻新。

### 测试 / 文档 / 视觉

- 文档链接、条款编号和术语自洽，运行 `git diff --check`；若提供代码化 token 样例，只允许无业务依赖的
  reference artifact，不改生产 UI。
- Codex 做规范结构与现有代码可实施性自审；GLM 独立审查覆盖矩阵、无障碍、可证伪验收与遗漏状态。
- Kimi 因额度缺席不阻塞，用户已明确批准不等待；由 Codex + GLM 代班架构/视觉压力测试，风险记录本卡。
- 本卡没有剧情/演出 E2E；视觉验收是功能性 design reference，允许开发期用浏览器最小验证。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-15）**。直接证据：`docs/phase2/READ-FIRST.md:8-11,21-22,33-35`；
    当前基础变量/壳 `editor.css:2-18,207-223`、`App.tsx:1008-1077`；模块差异与局部样式
    `ActorMode.tsx:282-330`、`BattleFieldTab.tsx:280-314`、`ImageTab.tsx:332-390`、
    `App.tsx:2514-2529,3355-3429`；用户 2026-08-15 规范先行裁决。
  - design: **agree**。先冻结规范和 reference fixtures，再开 shared primitives 与模块迁移卡；本卡不改业务实现。
- Kimi:
  - premise: N/A（额度缺席；用户 2026-08-15 明确“不用等 Kimi 了，继续推进”）
  - design: N/A（同上）
- GLM:
  - premise: **verified（2026-08-15，本人一手读码核证，非代理）**。真值矩阵"当前二阶段"行逐项
    属实：editor.css 实测 15,519 行、App.tsx 实测 3,839 行（与卡文逐字一致）；`editor.css:2-18`
    确实只有颜色 + 字体栈（无 spacing/typography/component token 体系）；`:207-223` 应用壳 +
    `App.tsx:1008-1077` 可调面板属实；inline style 全 UI 层 ~80+ 处（SpriteFrames 16 /
    LevelCurveEditor 12 / App 10 / ScriptDrawer 8 / EnemyTab 6 等 20 文件）。四类工作台真实存在
    （对象 ActorMode / 媒体 ImageTab / 脚本 CanonicalScriptEditorV5 / 数据表 15+ 个 Tab 文件）。
    详见下方「GLM 独立反证审查」。
  - design: **agree（2026-08-15，附必落钉 G1-G3，非阻塞准入）**。规范先行于 shared primitives
    与模块迁移、三层合同（Foundations/Patterns/Recipes）、四类 workbench recipe、11 态覆盖、
    reference fixtures 独立于业务数据、rollout/exception 流程——方向与结构全部正确。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-08-15，本人）
  - 独立证据锚点: 见下方「GLM 独立反证审查」
  - 可证伪观察: 见下方末节
- counter / 分歧处理: 任一核心原则 counter 时停在 draft，由用户裁决后更新规范范围。
- 缺签豁免: **Kimi 用户已批准缺签豁免**；Codex + GLM 代班，ED-DS-1 完成后不要求额度恢复补审，
  但用户保留最终产品验收。
- build 准入结论: **allowed（2026-08-15）——Codex premise verified + design agree 齐；GLM premise
  verified + design agree 齐（附 G1-G3 build 必落钉）；Kimi 用户批准豁免。可开始 normative 规范正文。**

### 进入 done 前:审查签字

- Codex: **accept（2026-08-15）**。规范正文、G1-G3、14 个 fixtures、链接/条款/对比/格式证据完整；
  用户六项产品裁决全部通过，v1.0.0 已冻结。
- Kimi: N/A（用户批准缺签豁免）
- GLM: **accept（2026-08-15，本人覆盖/无障碍/验收矩阵终审，非代理）**。规范正文 622 行逐章
  通读 + 量化复核全部通过（见下方「GLM done 前终审证据」）。G1-G3 忠实落实且无矛盾；四类
  recipe + 正反例证明"统一但不相同"；颜色对比全部实测达标；条款编号 60 条零重复；链接解析
  全过；git diff --check clean。附录 B 六项视觉裁决正确保留给用户。规范候选达到用户验收标准。
- counter / 返工处理: none（GLM 侧无未决项）
- 缺签豁免: Kimi 同 build 前记录；Codex + GLM 代班。
- done 准入结论: **done allowed（2026-08-15）——Codex accept + GLM accept；Kimi 用户豁免；
  用户以 `ED-DS-1：六项通过` 完成规范级产品验收。**

#### GLM done 前终审证据（2026-08-15，本人；非代理）

**标准 1 — G1 响应式矩阵（DS-L.1/DS-L.3）✓ 可实现且无矛盾：**
- DS-L.1 明确"断点基于容器 CSS pixel,组件不得读取 DPR 决定布局;DPR 只用于 canvas"——与
  CSS 媒体/容器查询语义天然一致，可实现。
- DS-L.3 六行矩阵内部一致：1280@125% = 1024 CSS px → Medium(840-1199)✓;1280@150% ≈ 853 →
  Medium 临界（>840）✓;"浏览器实际报告的 CSS viewport 是验收真值;等效宽度只用于解释"——
  防止把等效值写进代码的陷阱。无矛盾。
- 断点 1200/840 显式列入附录 B 第 3 项待用户裁决，未偷渡。

**标准 2 — G2 主题与对比（DS-F.1/DS-F.2）✓：**
- DS-F.1 显式决策"v1 冻结暗色;不实现亮色/切换"——不是沉默继承；语义 alias + 色阶双层命名
  划清未来主题边界。
- 本人 WCAG 相对亮度复算（11 组关键配对）：

| 配对 | 实测 | 要求 |
|---|---:|---|
| text-primary / canvas | **14.86** | ≥4.5 |
| text-primary / panel | 13.16 | ≥4.5 |
| text-secondary / panel | 7.39 | ≥4.5 |
| text-muted / panel | **5.72**（最差正文） | ≥4.5 |
| status danger/warning/success / panel | 5.71 / 7.64 / 7.13 | ≥4.5 |
| action-primary / canvas | 6.45 | ≥3 |
| focus-ring / panel | 7.29 | ≥3 |
| border-control / panel | **3.08** | ≥3（与卡文自报逐字一致） |

全部达标；卡文"正文/状态色 ≥4.71"保守声明成立。

**标准 3 — G3 性能合同（DS-PERF.1）✓ 可重复验收：**
- 500+ 必须虚拟化/分页；一次挂载交互行 ≤120（含 overscan）；原生 option 例外要求可搜索
  picker/分页。
- 固定 Playwright Chromium、20 次采样、p95 ≤100ms、下一动画帧反馈、3 秒滚动无 >100ms long
  task；**性能数据 + 浏览器版本 + CI 机器随证据保存**——可重复。RF-10/RF-12 双 fixture 钉住。

**标准 4 — 逐章检查 ✓：**11 章全在（0 语义 + 1 原则 + 2 Foundations + 3 壳 + 4 Patterns +
5 四类 Recipes + 6 交互 + 7 媒体 + 8 无障碍 + 9 实现 + 10 fixtures + 11 governance）；60 条
DS-* 条款编号唯一零重复；DS-IMP.5 static/component/visual/manual 四级映射防"人工条款伪装自动"。

**标准 5 — 正反例"统一但不相同" ✓：**DS-P.2 显式"一致不等于相同"；四类 recipe 主布局分化
（对象三栏 / 媒体画布主位 / 脚本树-表单 / 数据表 sticky）；附录 A 对 ActorMode/B2 同时列参考
价值**与仍需复核缺陷**（"角色页不能复制私有 CSS"），ImageTab/旧 Battle 列为反例——没有任何
页面被神化。

**标准 6 — 编号/链接/格式 ✓（本人实跑）：**条款 60 条零重复；3 个本地链接全部解析；
`git diff --check` clean。

**附录 B 六项正确保留用户裁决**：palette/密度/断点/Medium drawer 策略/recipe 覆盖度/媒体
toolbar——均为产品口味而非工程可判项，不属于 GLM 席位代决。

Evidence: editor-design-system-v1.md 全文 + 本人 WCAG 复算 11 组 + uniq -d 零重复 + 链接解析 +
git diff --check。只读终审，未改实现/规范文件，未代签 Kimi/用户，未标 done。

## Draft: 设计与风险

### 设计结论

规范采用“三层合同”，避免把视觉值、组件结构和业务布局混成一团：

1. **Foundations**：语义 tokens 与全局可访问性/动效/密度规则。
2. **Patterns**：应用壳、列表/工作区/Inspector、表单、引用、反馈、媒体等可复用模式；pattern 定义行为和
   状态，不绑定 Actor/BattleField 业务。
3. **Recipes**：对象型工作台、媒体型工作台、脚本/流程型工作台、数据表型工作台四类页面组合配方；业务页
   选择 recipe 并只声明领域扩展。

规范先写成带稳定条款编号的 Markdown，并配 design-lab/reference fixtures 设计。规范经用户定形后，另开任务
把 tokens/primitives 落到生产代码，再按审计优先级迁移模块；这样可避免本卡在尚未定形时制造大范围代码 diff。

### 预定规范目录

1. 产品原则与信息层级
2. Foundations / tokens
3. 应用壳与响应式布局语法
4. Components / patterns 状态合同
5. Workbench recipes
6. 交互、导航、反馈与危险操作
7. 媒体查看合同
8. 无障碍与国际化/长文本
9. 实现合同与反模式
10. Reference fixtures 与验收矩阵
11. Rollout、例外与版本治理

### 已知风险

- 风险: 规范过度抽象，无法指导资源/脚本等差异巨大的页面。
  - 缓解: 每条关键模式必须同时映射一个正例和一个压力反例，并以四类 workbench recipe 验证。
- 风险: 规范变成视觉愿望清单，不能落到代码。
  - 缓解: 每条规则写语义、状态、尺寸/响应式、primitive 映射和可验证 fixture；禁止“适当、优雅、统一”等
    无判据形容词作为验收条款。
- 风险: 为了统一破坏业务效率或把所有页面压成同一三栏模板。
  - 缓解: 统一的是层级、tokens、状态和交互合同；recipe 允许对象、媒体、脚本、数据表采用不同主布局。
- 风险: Kimi 缺席导致架构/视觉压力测试少一席。
  - 缓解: 用户已批准不等待；GLM 做独立覆盖审查，Codex 用现有代码和外部 guideline 做可实施性审查，
    用户做最终产品裁决。

### 主审立场

- Reviewer: GLM（覆盖、文档、验收矩阵；兼任 Kimi 缺席下的第二审查席）
- 结论: **premise verified + design agree（2026-08-15）**
- 必改项: G1 浏览器缩放与 DPR；G2 显式主题策略；G3 500+ 大列表性能合同。均为 build 正文必落钉。
- 是否建议进入 build: **yes**

### 三方争议记录(按需)

- Codex: 规范必须先于 shared primitives 和模块迁移；角色/B2 只作为参考输入。
- Kimi: 缺席（用户豁免）。
- GLM: premise verified + design agree（附 G1-G3）。
- 用户拍板: 2026-08-15 明确“先有完整设计规范，然后按照规范实施”。

## 额度 / 代班记录

- 缺席 Agent: Kimi
- 缺席原因: 订阅额度尚未恢复；用户明确要求不再等待。
- 代班 Agent: Codex + GLM
- 代班范围: Codex 负责产品/实现可行性和规范起草；GLM 负责覆盖、无障碍、测试矩阵与独立反证。
- 风险: 缺少 Kimi 的架构/视觉压力测试；由规范条款编号、reference fixtures、外部 guideline 和用户最终验收缓解。
- 是否需要补审: 不需要；用户本次已批准缺签豁免。
- 用户裁决: 2026-08-15 “B2 已经算完成了，不用等 Kimi 了，继续推进吧”。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `docs/phase2/editor/editor-design-system-v1.md`（新增并冻结为 normative v1.0.0）
  - `docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md`（登记规范入口）
  - `docs/phase2/editor/editor-design.md`（划清产品架构与界面合同边界）
  - 本任务卡与 `docs/ops/board.md`
- 实现摘要:
  - 完成带稳定条款编号的 11 章规范：产品原则、Foundations、应用壳、Patterns、四类 Recipes、交互、
    Media、Accessibility、实现合同、Reference fixtures、Rollout/Governance。
  - G1 已落为 CSS-pixel + 1280/900/720 + 125%/150% zoom + DPR 1/2 矩阵；G2 已明确 v1 暗色主题、
    语义 alias 预留未来主题边界；G3 已落为 500+ 虚拟化/分页、DOM 上限和量化延迟/long-task 门槛。
  - 角色/B2/Image/Script/旧 Battle 均有正例/反例映射；Design Lab 与 14 个 RF fixture 已定义，但本卡
    不实现生产 UI 或 reference page。
- 运行命令:
  - 本地 Node 条款/相对链接检查：PASS；所有 `DS-*` 标题 id 唯一，关联本地文档存在。
  - 候选色最差背景对比计算：正文/状态色均 `>=4.71:1`，control border `3.08:1`，PASS。
  - G1-G3 文本 presence 审计：PASS。
  - `git diff --check`：PASS；改动文档无尾随空白。
- 浏览器 / 手工检查: 本卡只产出规范和 fixture 设计，不产出页面；浏览器 Design Lab 验证属于规范冻结后的
  ED-DS-2。用户已完成六项条款/视觉候选值的规范级产品验收。
- 跳过的检查及原因: 未运行 editor TypeScript/Vitest/浏览器，因为没有改生产代码；未生成效果图，因为本卡要求
  可执行规则先于视觉样片，真正 Design Lab 由 ED-DS-2 实现。

## 视觉验证记录

- Visual Verification Owner: Codex + User
- Visual Verification Timing: dev-functional
- 验证方式: reference fixtures 的 1280 / 900 / 720 浏览器检查 + 用户规范级产品验收。
- 集中 E2E 用例 / 批次: N/A（功能性设计参考，不是剧情/演出）。
- 截图 / 像素检查路径: N/A（本卡无 UI 实现；Design Lab 证据由 ED-DS-2 产出）
- 结论: **规范级视觉裁决通过**。用户确认 palette、密度、断点、Medium drawer、四类 recipes 和媒体画布
  合同；实际 Design Lab 浏览器验证属于 ED-DS-2，不冒充本卡已实现生产视觉。
- 未完成项: 无（本卡范围）；14 个 reference fixtures 的代码化实现转 ED-DS-2。

## Review: 审查与返工

- Reviewer: GLM（Kimi 缺席豁免）
- 审查结论: **GLM accept（2026-08-15）**——规范候选忠实实现设计签字与 G1-G3；60 条款零重复、
  11 组颜色对比实测达标、四类 recipe 正反例闭环、六行响应矩阵内部一致、DS-PERF.1 可重复验收；
  附录 B 六项正确保留用户裁决。详见 done 前「GLM done 前终审证据」。
- 必须返工项: none（GLM 侧）
- Accept / rework: **Codex accept；GLM accept；Kimi 用户豁免；done allowed**

## 用户验收

- 用户结论: **2026-08-15 `ED-DS-1：六项通过`**。暗色 palette、36/40/10 密度、1200/840 断点、
  Medium Inspector drawer、四类 recipes、媒体 toolbar/背景合同全部通过。
- 后续任务: ED-DS-2 代码化 tokens、shared primitives 与 Design Lab；随后按规范进行全编辑器 A/B/C
  三线审计和分批模块迁移。

## 交接日志

- 2026-08-15 Codex: B2 按用户裁决 done；记录“规范先行”并完成当前代码/文档前提盘点，ED-DS-1 开卡为
  draft。Evidence: 本卡真值矩阵、`editor-modernization-follow-up-2026-08-14.md`。Next: GLM 独立 premise/design 审查。
- 2026-08-15 GLM: 签 premise verified + design agree（附 G1-G3 build 必落钉）。一手核实行数/tokens/
  inline style 分布/四类工作台全部属实；三层合同与四类 recipe 足以约束跨域差异。Next: Codex 开始
  normative 规范正文起草，G1-G3 落入对应章节。
- 2026-08-15 Codex: 完成 `editor-design-system-v1.md` normative candidate；11 章、14 个 RF fixtures、
  G1-G3、角色/B2/Image/Script/Battle 映射与 rollout/exception 均落盘。条款/链接、色彩对比、格式自审通过。
  Evidence: Build 节。Next: GLM done 前 review；随后用户确认附录 B 六项视觉裁决。
- 2026-08-15 User + Codex: 用户以 `ED-DS-1：六项通过` 接受附录 B 全部产品裁决；Codex 签 accept，
  规范状态冻结为 v1.0.0，任务 done。Next: ED-DS-2 另行开卡。

#### GLM 独立反证审查（2026-08-15，本人一手读码；非代理）

**premise verified — 真值矩阵逐项一手核实：**

| 卡文声称 | 本人实测 | 核对 |
|---|---|---|
| editor.css 15,519 行 | **15,519**（wc -l） | ✓ 逐字 |
| App.tsx 3,839 行 | **3,839** | ✓ 逐字 |
| 基础变量仅颜色+字体 | `:2-18` 确认：--bg/--panel/--panel2/--panel3/--line/--fg/--dim/--faint/--accent/--acc 别名/--warn/--err/--ok/--mono/--sans——**无 spacing/typography/radii/elevation/motion token** | ✓ |
| 应用壳 + 可调面板 | `:207-223` grid 四列 + `App.tsx:1008-1077` useStoredPanelNumber/Boolean | ✓ |
| inline style 持续增长 | 全 UI 层 `style={{` 计数：SpriteFrames 16 / LevelCurveEditor 12 / App 10 / ScriptDrawer 8 / EnemyTab 6 / AmbienceTab 6 / ShopTab 5 / SkillTab 4 等 **20 文件 ~80+ 处** | ✓ |
| ImageTab 独立列表/预览 | `:332-352` image-library-outliner + image-kind-tabs tablist | ✓ |
| Actor/B2 参考结构 | ActorMode `:282-300` outliner+catalog-head+count+actions；BattleFieldTab 三栏 | ✓ |
| 四类工作台真实存在 | 对象(ActorMode)/媒体(ImageTab)/脚本(CanonicalScriptEditorV5/SceneScriptWorkspace)/数据表(**15+ 个 Tab 文件**——最大群体) | ✓ |

**"颜色变量≠设计系统"确认**：现有 `--acc` 兼容别名注释自认旧样式片段兼容——正是卡文反证 3 所述
"补更多 CSS variables 不等于系统"的实证。

**design agree — 四类工作台约束充分性：**
- Recipes 显式覆盖对象/媒体/脚本/数据表四类（设计结论 §3）；数据表型是最大群体（15+ Tab），
  recipe 分化防止"角色页三栏压一切"（风险 3 已列缓解）。
- 1280/900/720 验收写明"列保留/折叠顺序、最小主区宽度、tab 高度、字段换行、滚动容器、
  Inspector/drawer 行为;不得只写'响应式适配'"——可验收 ✓。
- 11 态（default/hover/focus-visible/active-selected/disabled/loading/empty/error/warning/
  success/destructive）显式列出 ✓。
- 无障碍基线覆盖语义控件/label/键盘顺序/focus-visible/dialog 焦点/live region/对比度/
  reduced-motion/点击目标/alt ✓。
- fixtures 独立于业务数据（design-lab/reference page）✓；rollout/exception 为目录 §11 ✓。

**必落钉 G1-G3（build 起草规范正文时落入对应章节，非阻塞准入）：**

- **G1（浏览器缩放档）**：响应式矩阵应把**浏览器 zoom 125%/150%**（等价有效宽度 ~1024/853）
  与 `devicePixelRatio` 差异并入 720 档验收口径——用户实机抱怨的"窄宽挤压"多数发生在高 DPI
  笔记本默认缩放，纯 1280/900/720 宽度矩阵会漏掉这个真实触发面。
- **G2（主题策略显式化）**：当前编辑器 dark-only（--bg #1b1d23）。规范 Foundations 应**显式
  决定**"冻结 dark-only"或"token 层预留 light 主题"，不能沉默继承现状——否则后续有人做 light
  主题时 token 语义命名（--panel/--line）会变成阻碍。
- **G3（大列表渲染合同）**：fixtures 有 500+ 项列表，但规范应加一条明确合同：500+ 列表是否
  要求虚拟化/分页/骨架，或仅要求"交互不卡"的性能底线（如首次渲染 < X ms）。否则验收时
  "500 项能显示"与"500 项可用"会混淆。

**可证伪观察：**
① 若起草中发现某类 workbench（最可能是脚本型——CanonicalScriptEditor 的树/表单/JSON 三态）
  无法用四类 recipe + 领域扩展表达，须回卡扩 recipe 分类，不得硬塞。
② 若 reference fixtures 在不碰业务模块的前提下无法表达 720 档 Inspector 折叠（壳的真实行为
  依赖 App.tsx 而非独立 page），须按卡文已列反例升级为独立 design-lab 壳容器，不能拿业务页
  当测试容器再放松"不改业务模块"边界。
③ 若规范条款无法映射为可自动检查（lint/测试/截图 diff 任一），验收方式退化为人工逐条——
  届时须在 rollout 章节明确哪些条款自动、哪些人工，不得含糊。

Evidence: wc -l editor.css=15519 App.tsx=3839 / editor.css:2-18,207-223 / App.tsx:1008-1077,
2514-2529 / ActorMode:282-300 / ImageTab:332-352 / inline style 全 UI grep 计数 20 文件 /
15+ Tab 文件清单。只读审查，未改实现文件，未标 build/done。

## 下一位 Agent 提示词

无下一位 Agent 提示词：ED-DS-1 已完成 Codex / GLM accept、Kimi 用户豁免和用户最终验收。以下提示词只
保留为已执行的历史交接记录；下一项 ED-DS-2 应另行开卡，不在本卡修改生产 UI。

```text
接手任务: ED-DS-1 编辑器设计系统与交互规范 build 前独立审查
任务卡: docs/ops/tasks/ED-DS-1-editor-design-system-spec.md
当前状态: draft；Codex 已签 premise verified / design agree；Kimi 因额度缺席，用户明确批准不等待；GLM 尚未签。
你的角色: GLM，独立核对前提、覆盖、无障碍、验收矩阵与可证伪性，并给出 premise verified/design agree 或 counter。
先读: AGENTS.md；docs/phase2/READ-FIRST.md；docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md；
packages/editor/src/ui/editor.css:1-223,9114-9161；App.tsx:1008-1077,2514-2529,3355-3429；
ActorMode.tsx:282-330；BattleFieldTab.tsx:280-314；ImageTab.tsx:220-257,332-390；
Vercel Web Interface Guidelines（任务卡已链接）。
已完成: B2 已用户验收 done；用户拍板必须先完成完整设计规范再翻新模块；任务卡已冻结范围、三层合同、
预定目录、验收条件、Kimi 缺席代班和最强替代解释。
请你做: 直接读取一手代码，审查规范范围是否足以约束对象/媒体/脚本/数据表四类工作台；检查 1280/900/720、
长文本、键盘/焦点、状态、媒体、危险操作、reference fixtures、rollout/exception 是否可验收；指出漏项或冲突，
然后把独立证据、可证伪观察和签字写回任务卡。
不要做: 不得修改 packages/editor 实现、schema/save/migration/capability-map；不得以“角色页好看”代替跨领域验证；
签字不齐不得开始 normative 规范正文或标记 build/done。
输出要求: 明确给出 `premise verified + design agree`，或逐条 counter/必改项；若 agree，将 build 准入更新为
build allowed，并提供给 Codex 的下一步提示词。
```

### 给 Codex（规范正文起草，可直接复制）

```text
接手任务: ED-DS-1 编辑器设计系统与交互规范——normative 正文起草
任务卡: docs/ops/tasks/ED-DS-1-editor-design-system-spec.md
当前状态: draft 转 build；Codex + GLM premise/design 齐，Kimi 用户批准豁免；build allowed
你的角色: Coding Owner——按本卡"预定规范目录"11 节起草 normative 规范正文 + reference fixtures 设计
先读: 本卡全文（尤其 GLM 独立反证审查 G1-G3 必落钉）；docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md；
  Vercel Web Interface Guidelines；ActorMode/BattleFieldTab/ImageTab/CanonicalScriptEditorV5 现状。
必落钉:
  G1 响应式矩阵并入浏览器 zoom 125%/150% 与 devicePixelRatio（720 档验收口径）；
  G2 Foundations 显式决定 dark-only 冻结或 light 预留（不得沉默继承）；
  G3 大列表渲染合同（500+ 虚拟化/分页/性能底线三选一，写明验收口径）。
请你做: 按目录 1-11 起草规范（条款编号稳定）；四类 workbench recipe 各配一个正例映射 +
  一个反例修复；reference fixtures 设计独立于业务模块；完成后自审 + 交 GLM 覆盖复审 + 用户规范级验收。
不要做: 不改 packages/editor 生产实现/schema/save/migration；规范验收前不建大型组件库；
  不用"适当/优雅/统一"等无判据形容词作验收条款。
输出: 规范文档（docs/phase2/editor/ 下）+ fixtures 设计 + 本卡 Build 节证据。
```

### 给 GLM（done 前规范审查，可直接复制）

```text
接手任务: ED-DS-1 编辑器设计系统与交互规范 done 前独立审查
任务卡: docs/ops/tasks/ED-DS-1-editor-design-system-spec.md
规范正文: docs/phase2/editor/editor-design-system-v1.md
当前状态: review；Codex 完成 normative candidate 与自审；Kimi 用户批准缺席豁免
你的角色: GLM——审查规范正文是否忠实实现设计签字和 G1-G3，并给出 accept 或 counter
先读: 任务卡全文（尤其验收条件、GLM 独立反证 G1-G3、Build）；规范正文全文；
docs/phase2/editor/editor-modernization-follow-up-2026-08-14.md；Vercel Web Interface Guidelines
请你做:
1. 核 G1：CSS pixel、1280/900/720、125%/150% zoom、DPR 1/2 是否可实现且不自相矛盾；
2. 核 G2：dark-only 决策与语义 token 未来主题边界是否清楚，候选色与对比声明是否成立；
3. 核 G3：500+ 列表的虚拟化/分页、DOM/延迟/long-task 门槛是否可重复验收；
4. 逐章审查 Foundations/Patterns/四类 Recipes/Interaction/Media/Accessibility/Implementation/
   Fixtures/Governance 是否有漏项、冲突、不可执行形容词或错误业务耦合；
5. 核角色/B2 正例和 Image/Script/Battle 压力反例是否证明“统一但不相同”；
6. 复跑/复核条款编号、链接、颜色对比和 git diff 格式证据。
不要做: 不改 packages/editor 生产代码，不实现 Design Lab，不把本卡标 done，不代替用户决定附录 B 六项视觉裁决
输出要求: 将审查证据写回任务卡 Review 与 done 前 GLM 签字；明确 `accept` 或逐条 `counter`。若 accept，
提供给用户的六项产品验收摘要和给 Codex 的收口提示词。
```

### 交接日志补记

- 2026-08-15 GLM: done 前终审签 **accept**。622 行规范逐章通读 + WCAG 11 组对比复算（最差正文
  5.72:1、控件边界 3.08:1 与自报一致）+ 60 条款零重复 + 链接全解析 + git diff clean。G1 六行矩阵
  内部一致（1024→Medium / 853→Medium 临界），G2 暗色冻结+语义 alias 边界清楚，G3 ≤120 行挂载 +
  p95≤100ms 可重复。Next: 用户完成附录 B 六项验收 → Codex 签 done → ED-DS-2。

### 给 Codex（用户验收后收口，可直接复制）

```text
接手任务: ED-DS-1 收口——用户完成附录 B 六项规范级验收后签 done
任务卡: docs/ops/tasks/ED-DS-1-editor-design-system-spec.md
当前状态: review；Codex 自审 + GLM accept 齐，Kimi 用户豁免；仅待用户附录 B 六项裁决 + Codex done 签字
你的角色: Coding Owner——落实用户对附录 B 的裁决（若有调整按 DS-G.4 记版本），然后收口。
用户六项验收摘要（向用户呈现）:
  1. v1 暗色 palette 明度与 #5aa2ff 蓝 accent 是否认可；
  2. 控件 36px / tab 40px / 卡片圆角 10px 密度；
  3. Wide≥1200 / Medium 840-1199 / Narrow<840 断点；
  4. Medium 档 Inspector 默认 drawer 化（非永久窄列）；
  5. 对象/媒体/脚本/数据表四类 recipe 是否覆盖全部真实工作台；
  6. 媒体画布 toolbar 位置与默认透明背景。
请你做: 把用户逐项裁决记入用户验收节（如调整候选值，同步规范并按 DS-G.4 记 patch/None）；用户通过后
  签 Codex accept、Status 转 done、更新 board；ED-DS-2（tokens 代码化 + primitives + Design Lab）
  另开卡引用本规范条款。
不要做: 不替用户决定六项；不在本卡实现 Design Lab 或生产 UI；不跳过 GLM 已核的 G1-G3 条款。
```
