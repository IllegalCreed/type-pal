# ED-NUMBER-FIELD-1 - 编辑器数字控件与响应式数值字段密度合同

Status: done（2026-08-29 Codex / Kimi / GLM 当前实现 accept 与用户复验全部通过）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`

## 目标

把“技术上是 `type=number`、视觉上却像一条超长文本框”的数字字段收口成公共合同：主表单数字字段使用可识别、
有界且可访问的 NumberInput recipe；同类数字字段由公共 CSS grid 根据容器宽度自动分列，窄容器稳定回到单列。
同时从生产源码动态生成数字控件 census，逐项区分主表单、紧凑行内/表格、range/timeline、坐标和证据化例外，
不只修 Enemy 截图，也不把全部数字输入机械套成同一种布局。

本卡是 `ED-FIELD-LAYOUT-1` 用户验收反例暴露出的新增公共范围。旧卡已签的 `96px / 479-480px / Inspector
60px` 标签轨合同保留为历史；NumberInput 可见 affordance、数字字段默认宽度、自动分列算法与全生产数字 adoption
没有获得旧签字授权，必须在本卡重新三签。

## 范围

- 范围内：
  - 保留 `DsNumberInput / DsDraftNumberInput` 的原生 `type="number"`、`inputMode`、min/max/step 与既有
    draft/validate/commit/cancel/resync 语义；主表单通过公共 `DsNumberField / DsDraftNumberField` recipe
    获得统一标签、错误、帮助、宽度和数值 affordance。
  - 主表单 NumberField 默认使用公共 short-number measure；`10rem` 是整个数字控件壳的上限，不允许业务页把
    短整数输入随宽卡拉满。确需 fill 的场景必须由 census 分类并登记理由，不能靠漏套 wrapper 形成事实例外。
  - NumberField 提供明确、键盘可达且不依赖页面私画的增减 affordance。初始方案为设计系统持有的 `− / value / +`
    同壳 stepper：按钮与 ArrowUp/ArrowDown 共同尊重 `step/min/max/disabled/readonly`，每次按钮动作至多产生一条
    command；若 Kimi/GLM 以直接浏览器/无障碍证据否定该方案，必须在 build 前冻结同等清晰的公共替代方案。
  - 新增公共响应式数字字段网格 recipe（暂名 `DsNumberFieldGrid`）：使用 CSS grid/容器宽度与公共 token 自动
    形成 1/2/3/多列；候选基线为 `repeat(auto-fit, minmax(min(100%, 12rem), 1fr))`，control 仍由
    short-number measure 限宽。禁止 JavaScript 测量和页面私有 breakpoint。
  - 以 Enemy“战斗能力 / 战后结算”作为代表页面；按动态 census 迁移其他真实主表单违规，不把 111 个数字调用点
    全部默认判为同类。
  - 动态 census 覆盖生产 TSX 中所有 `DsNumberInput / DsDraftNumberInput / DsNumberField /
    DsDraftNumberField` 消费点，并分类为：
    1. 主表单短数字；
    2. 紧凑表格 / repeat-row / inline composer；
    3. range / timeline 的配套读写值；
    4. 坐标、帧号等高密度专用编辑；
    5. 看似数字但实际为 ID/code/只读值；
    6. 带 owner、理由、验证和删除条件的有界例外。
  - 新增可复算 adoption registry、Design Lab 场景、AST/CSS 门禁和几何回归；登记 owner 必须在真实 render 路径
    出现，新增未登记调用点 fail-closed。
- 范围外：
  - 不改 schema、save、migration、runtime、战斗公式、项目内容或 PAL 数值。
  - 不改变任何字段的合法范围、单位、特殊值或 normalize；这些必须以领域真值逐项决定，禁止全局补 `min=0`。
  - 不重写 `ED-FIELD-COMMIT-1` 已冻结的 IME、Enter、blur、Escape、对象切换、undo/redo 与单命令合同。
  - 不把数字形式的字符串 ID、资源编号或代码值强行改成 NumberInput。
  - 不把复杂混合表单、长文本或选择器为了“多列”强塞进数字网格。
- 明确不做：
  - 不只给 `.enemy-stat-grid` 写一条局部 `grid-template-columns` 后宣布全局完成。
  - 不恢复未经验证的 OS 私有 spinner 皮肤，也不允许各业务页各画一套增减箭头。
  - 不用 `111 - 20` 推断 91 个违规；`DsFieldMeasure` 仅是一个信号，最终分类必须读取真实上下文。
  - 不让 stepper 点击先 blur 提交旧草稿、再提交新值形成双命令。

## 前提真值门

### 一句话行为 / 工程前提

当前 Enemy 数值区已经使用语义正确的 `DsDraftNumberInput`，但公共 CSS 把所有 input 拉到 `100%`、主动隐藏
number spinner，业务 grid 又没有列定义；因此用户看到的是单列超长“文本框”。这同时证明旧字段布局验收漏掉了
真实 short-number 消费，也证明 NumberInput 可见 affordance、默认 measure 和数值字段组自动分列需要新的公共合同。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原版没有二阶段编辑器 UI 可对照；但 Enemy 值域同时含 `u16` 与 `s16`，武术/灵力/防御/身法可为负，不能因改控件顺手全局 clamp。 | `packages/pal-extract/src/resources/parsers/enemies.ts:103-129` |
| 第一阶段 | 一阶段没有 Reforge 设计系统 NumberField；其内容真值只要求数值不被 UI 布局迁移改变。 | `docs/phase2/READ-FIRST.md:32-37`；本卡不改一阶段包/数据 |
| 当前二阶段 | Enemy 已消费 `DsDraftNumberInput`，最终为 `type=number/inputMode=decimal`；`.ds-input` 默认 `width:100%`，数字 spinner 被隐藏，`.enemy-stat-grid` 只有单列 display/gap。现行规范却已要求短数值消费 `DsFieldMeasure`、不得无限拉伸。 | `packages/editor/src/ui/EnemyTab.tsx:868-895`；`packages/editor/src/ui/design-system/controls.tsx:707-760`；`packages/editor/src/ui/design-system/primitives.css:571-595`；`packages/editor/src/ui/editor.css:6974-7005`；`docs/phase2/specs/editor-design-system.md:189-190` |
| 本任务目标 | 主表单数字字段由公共 NumberField 持有可见 affordance 与 short measure；同类字段用公共 CSS grid 自动分列；全生产调用点有可复算分类与 fail-closed 门禁。 | 本卡目标、设计结论与验收条件 |

### 初步全局 census

- 2026-08-29 只读源码扫描：36 个业务 TSX 文件中有 111 个 `Ds*Number*` 生产调用点：
  `DsNumberInput` 59、`DsDraftNumberInput` 44、`DsDraftNumberField` 8；没有发现业务层裸
  `<input type="number">`，只读 ID / 目录第二行未计入。
- 44 处显式 `size="compact"`；19 处数字调用直接位于 `DsFieldMeasure short-number`，其中 1 处与 compact
  重叠；因此有 49 处默认尺寸且没有直接 measure。这个数字不能直接判为 49 个违规，range、timeline、table、
  repeat-row、坐标和紧凑 Inspector 可能已由父布局正确约束，必须逐项分类。
- 29 个明确 integer 的调用仍得到公共组件硬写的 `inputMode="decimal"`；Tileset / StampTemplate 等调用即使传
  `inputMode="numeric"` 也会被组件后置默认覆盖。wheel 防误改仅 26/111 由业务页逐处手写，证明 inputMode 与 wheel
  应由 primitive/recipe 统一持有。
- `battle/enemy` 的 design-system registry 聚合声明含 `DsFieldGroup`，但截图路径 `EnemyTab` 本身没有消费它；
  现有 owner 证据来自同 registry 下的其他组件，不能证明 Enemy 数值主表单已采用。
- 已确认的同类首批候选：Enemy 11 个战斗/奖励字段、Actor 10 项基础能力、BattleField 5 项五灵、Skill 4 项消耗、
  Item 买卖价。Ambience RGB、脚本/地图坐标、帧/切片、range/timeline、紧凑表格/repeat-row 是必须独立判断的
  专用布局或命名例外，不能被主表单 grid 机械覆盖。

### 反证与替代解释

- 最强替代解释：问题只是 Enemy 一处缺少 `DsFieldMeasure` 与列 CSS，其他 110 个数字调用点均已由表格/行内容器
  正确约束；NumberInput 不需要新的公共 affordance。
- 什么观察会推翻当前前提：若动态 census 证明除 Enemy 外没有第二个主表单短数字拉伸场景，全球迁移范围应缩到
  Enemy + 公共防回流；若受支持浏览器中现有输入在隐藏 spinner 后仍有稳定、可识别的 NumberInput affordance，
  stepper 方案应撤回；若公共 stepper 无法在不改变单命令/草稿合同的前提下实现，应保留原输入事务并冻结更小的
  视觉方案，不能绕过 `ED-FIELD-COMMIT-1`。
- 已排查的替代根因：
  - runtime / command：Enemy `draftKey + historyVersion + onCommit` 已使用共享事务，问题不是 command 分类。
  - 原版 / 第一阶段机制：无作者 UI 可对照；负数值真值反而约束本卡不得改值域。
  - extractor / migration：截图值来自合法 current content；不改变数据。
  - audit / test model：现有 boundary 只证明 short-number token/recipe 存在，没有验证真实页面消费；这是已确认漏检。

### 用户可见偏离

- `before -> after`：数字字段技术上是 number、视觉上却是无 affordance 的整行长框，字段组固定单列 -> 主表单数字
  使用公共有界 NumberField，宽容器自动多列、窄容器单列，增减/键盘/错误/焦点语义一致。
- 代表场景：PAL → 战斗 → 敌人 → 数值，选中含 `-1/-6` 修正值的敌人；在 1000/720/480/320px 容器和
  100%/125%/150%/200% 缩放下检查列数、控件宽度、负数、焦点与提交。
- 用户裁决：2026-08-29 用户明确指出超长数字框与固定单列不合理，要求形成 NumberInput 公共控件并全局检查。

## 上下文锚点

- 已拍板决策 / 铁律：
  - 设计系统公共组件、跨页面 adoption 与用户可见行为变化必须三签；签字齐前不改实现。
  - 已 done 的 `ED-FIELD-COMMIT-1` 不重开；本卡只能组合其事务能力，不能改变提交边界。
  - `ED-FIELD-LAYOUT-1` 原 accept 作为历史保留；其 Enemy short-number 反例转 rework，但旧签字不授权本卡新增
    stepper / auto-fit / registry API。
- 代码 / 规范：
  - `packages/editor/src/ui/design-system/controls.tsx:559-760,906-980`
  - `packages/editor/src/ui/design-system/primitives.css:571-595`
  - `packages/editor/src/ui/design-system/recipes.tsx:371-386`
  - `packages/editor/src/ui/design-system/recipes.css:872-885`
  - `packages/editor/src/ui/design-system/tokens.css:50-52`
  - `packages/editor/src/ui/EnemyTab.tsx:99-124,652-660,868-895`
  - `packages/editor/src/ui/editor.css:6974-7005,7249-7255`
  - `packages/editor/src/ui/EnemyTab.test.tsx:356-430`
  - `packages/editor/src/ui/design-system/field-layout-adoption.json`
  - `packages/editor/src/ui/design-system/field-layout-adoption.test.ts`
  - `packages/editor/src/ui/design-system/boundary.test.ts:260-265,304-350`
  - `docs/phase2/specs/editor-design-system.md:189-201,574-584,591-602`
- 外部界面基线：正确 input type/inputmode、程序化 label、visible focus、优先 CSS grid 而非 JS 测量。
  - `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- 不得重新引入：raw numeric input、页面私有 spinner/measure/breakpoint、全局非负 clamp、wheel 意外改值、
  Enter+blur 双提交、草稿串对象、JS 宽度测量、无证据永久 allowlist。

## 设计结论（Codex 初稿，待三方冻结）

1. **两层责任，不重写事务**
   - `DsNumberInput / DsDraftNumberInput` 继续持有 input 与草稿事务。
   - `DsNumberField / DsDraftNumberField` 成为主表单 canonical recipe，默认带 short-number measure、label/help/error
     与可见 stepper；业务页不再手工组合 `DsField + DsDraftNumberInput + DsFieldMeasure`。
   - primitive 根据整数/小数语义给出正确 `inputMode`，且不覆盖调用方明确值；wheel 防误改由公共 owner 统一，
     删除业务页 26 处重复写法时不得改变滚动与焦点语义。
2. **stepper 是同一控件壳的一部分**
   - 初始方案为 `− / value / +`，整个壳最大 `10rem`，两侧动作满足公共命中尺寸；input 仍可直接键入。
   - 按钮使用公共 step/min/max 语义；pointer 不得先触发 blur 旧值，按钮每次只提交一次；键盘、Escape、对象切换、
     undo/redo 继续走既有 draft contract。
   - 紧凑表格、range companion 等若不适合展示按钮，必须在 registry 归入命名模式，而不是业务 CSS 隐藏。
   - **K-NF6 已冻结**：鼠标/触控点击 `−/+` 是一次即时离散提交，恰好产生 0 或 1 条 command（到达边界或
     等值时为 0）；直接键入、ArrowUp/ArrowDown 仍属于文本草稿周期，维持 Enter/blur 提交、Escape 取消。
     stepper 的 pointerdown 必须保留 input 焦点，不能先 blur 提交旧草稿。
3. **数字集合用公共自适应网格**
   - `DsNumberFieldGrid` 只负责列与 gap，不拥有值域；列数由 CSS `auto-fit/minmax` 和容器实际宽度决定。
   - 公共最小列宽暂定 `12rem`，公共数字壳上限 `10rem`；320/480/720/1000px 基线为 1/2/3/4 列，精确值由
     Kimi/GLM 结合长中文 label、200% zoom 和浏览器证据在 build 前冻结。
4. **动态 adoption 而非手填计数**
   - 新建 `number-field-adoption.json`（或并入已有 field registry 的独立 versioned section），由 AST 从真实 production
     render/调用点复算；registry 记录 source/component/mode/control/measure/grid/owner/reason/verification/
     removalCondition。
   - 页面私有 `.ds-input[type=number]`、spinner、short width、numeric auto-fit 规则默认失败；Design System 自身与
     证据化专用 owner 除外。
5. **值域逐字段保持**
   - 本卡不补全局 `min/max`。Enemy 的有符号修正必须继续接受负数；单位、范围和特殊值应在 census 中记录缺口，
     但任何 schema/领域校验改动另卡处理。

## 验收条件

- 公共组件：
  - NumberField 在默认、compact、disabled、readonly、invalid、empty、negative、zero、large、min/max/step 状态下可用；
    label/description/error 与 input 程序化关联。
  - integer 字段使用 `inputMode="numeric"`，小数字段使用 `decimal`，调用方显式值不被公共组件反向覆盖；wheel
    在可滚动页面不意外改值，也不靠 26 处页面级 handler 漂移。
  - stepper 与输入共享一个 focus/视觉壳；按钮有 accessible name 和可见 focus，不只靠图标/颜色；按键与点击均不
    产生重复提交。
  - short-number measure 对真实 NumberField 默认生效，不再依赖业务页记得套 wrapper；fill/无 stepper 模式只有
    registry 已分类场景可用。
- 响应式：
  - Enemy 的 8 个战斗字段与 3 个奖励字段消费公共 `DsNumberFieldGrid`；1000/720/480/320px 下自动形成经三签冻结
    的多列/单列布局，输入壳不超过公共 measure，无横向 overflow。
  - 长中文 label、`HP`、`-1/-6`、五位数和 200% zoom 不遮挡、不逐字换行、不使相邻控件错位。
- 事务与数据：
  - 输入、IME、Enter、blur、Escape、对象切换、undo/redo 保持原合同；一次键入周期或一次 stepper 点击最多一条
    command，Enter + blur 不双提交。
  - Enemy 有符号字段继续可提交负数；本卡前后 schema/runtime/project JSON 零语义 diff。
- census / 门禁：
  - 生产数字调用点动态 census 闭合；当前 36 文件/111 调用点逐项分类，机器复算 count 与 registry 相等，新增、
    删除、改名、重复、陈旧或未命中条目 fail-closed。
  - 首批 Enemy/Actor/BattleField/Skill/Item 数字集合分别给出迁移或保留证据；Ambience RGB、脚本/地图坐标、
    帧/切片、range/timeline 与 compact repeat/table 逐项登记专用 owner，不能靠“没有 measure”自动失败。
  - 裸 `input[type=number]`、主表单 `DsField + Ds*NumberInput` 绕过 canonical NumberField、未登记 fill/no-stepper、
    业务 CSS 自造 number width/spinner/grid 均有负例测试。
  - route/component owner 不能借同 registry 其他组件的 NumberField 冒充当前页面已采用；EnemyTab 必须有自身证据。
- 测试 / 验证：
  - 公共 controls/recipes、number adoption、boundary、EnemyTab 聚焦测试先行；最后只运行一次受影响 editor 全量与
    typecheck，不重复耗时全量。
  - 功能性浏览器最小验证：1280/900/720/480/320px，100%/125%/150%/200% zoom；检查列数、滚动、焦点、
    keyboard、stepper、负数、错误、对象切换和 undo。
  - Design Lab 新增 NumberField 状态矩阵与 responsive 数字 grid 场景；规范版本按新增 pattern 升 minor。

## 推进签字

### 进入 build 前：设计签字

- Codex：
  - premise: **verified（2026-08-29）**。`EnemyTab.tsx:868-895` 已使用 `DsDraftNumberInput`，而
    `primitives.css:571-595` 的全宽 + 隐藏 spinner 和 `editor.css:7001-7005` 的无列 grid 直接解释截图；
    `editor-design-system-v1.md:189-190` 已禁止短数值无限拉伸，旧卡门禁只验 recipe 存在、未验真实消费。
    生产初扫为 36 文件/111 个 `Ds*Number*` 调用、8 文件/20 个 measure wrapper（其中 19 处直接包数字调用），
    必须分类而不能机械迁移。
  - design: **agree（2026-08-29）**。保留 draft/commit，主表单收敛到默认有界的 NumberField recipe；公共
    stepper 提供可见 affordance，公共 NumberFieldGrid 用 CSS auto-fit；动态 census + fail-closed gate 收口全局，
    值域/schema 保持不变。
- Kimi:
  - premise: **verified（2026-08-29，本人独立直读根因链 / 组件事务 / CSS / 先例，非复述 Codex / GLM）**:
    1. **根因四件套闭合**: `EnemyTab.tsx:882-894` 已是 `DsField + DsDraftNumberInput`(integer、
       `normalize=Math.floor`、draftKey+historyVersion 共享事务、手写 onWheel blur);`.ds-input
       { width: 100% }`(primitives.css:575)+ `appearance: textfield` 与 webkit spinner 隐藏
       (:587-595)+ `.enemy-stat-grid` 仅 `display:grid+gap` **无 grid-template-columns**
       (editor.css:7001-7006)——单列超长无 affordance 框的机制完全成立,不是 command/数据问题。
    2. **inputMode 覆盖实锤**: `controls.tsx:741-744` `{...controlProps}` 先展开、`type="number"
       inputMode="decimal"` 后写硬编——调用方显式值确被反向覆盖;`integer` prop(:714)存在但
       不派生 inputMode。
    3. **值域与事务红线**: `DsDraftNumberInput` 事务链(parse/validate/normalize/enforceRange,
       :735-761)完整,本卡不动;GLM 复算 39 个敌人负数 stats + pal-extract u16/s16 并存——
       不全局 clamp 是硬约束。ED-FIELD-COMMIT-1 合同零改动成立。
    4. **measure 现状**: `--ds-field-measure-short-number: 10rem` 已存在(tokens.css:52),
       `DsFieldMeasure`(recipes.css:877-886)需业务页手套——"recipe 默认化"的缺口成立;
       49 处无 measure 不能机械判违规(父布局约束域)立场正确。
  - design: **agree(2026-08-29，附 K-NF1-K-NF6 必落钉)**:
    - **K-NF1(stepper 事件顺序钉)**: stepper 按钮必须 `onPointerDown preventDefault()`——焦点
      不离 input、无 blur commit 旧值;先例已实锤(ProjectWorkbenchTab.tsx:912,1189 移出 /
      动作按钮、controls.tsx:1658 DsSelect option)。pointerdown→click 全序列 commit ≤1 条且
      值经 step/min/max 钳制,测试断言覆盖边界(min 处再点 − 不变值不产命令)。
    - **K-NF2(inputMode 修复钉)**: primitive 按 `integer` prop 派生 `numeric` / `decimal`,
      调用方显式 `inputMode` 优先于公共默认;修 controls.tsx:741-744 展开顺序必须配回归断言
      (29 处 integer 调用为代表)。
    - **K-NF3(wheel 公共语义钉)**: 26 处手写 onWheel 收口到 primitive / recipe;语义 =
      **不产生 commit、不阻断页面滚动**(非聚焦时页面照常滚)、聚焦时防误改的具体手法
      (preventDefault 或 blur)由浏览器证据二选一冻结;禁止"wheel 即 blur commit"。
    - **K-NF4(12rem / 10rem 实测冻结钉)**: 本人算术(gap≈12px 口径): 320→1、480→2、
      720→3、1000→4(5 列需 192×5+48=1008>1000)——与卡面基线吻合,但**必须以实际 gap
      token + 容器 padding 在 320/480/720/1000px × 100%/200% zoom 浏览器实测冻结为 DOM
      断言**,不得以算术代替实测;`min(100%, 12rem)` 在 <12rem 容器防横向溢出断言;
      200% zoom 不改 CSS px 布局(容器查询按 CSS px),10rem 壳内 −/+ 按钮 + 输入区须容
      6 字符等宽负数(-32768)实测。
    - **K-NF5(无障碍钉)**: stepper 按钮中文 accessible name(增加/减少)、可见 focus、
      min/max 边界 disabled、readonly 时禁用;壳与 input 共享 focus 视觉;不只靠图标 / 颜色。
    - **K-NF6(stepper 事务语义冻结钉)**: 按钮改值走"即时单命令 commit"还是"改 draft 遵循
      既有 commit 时机"必须 build 前写明冻结(二者都满足单命令,但 Escape/undo 语义不同);
      ED-FIELD-COMMIT-1 既有测试预期零改动。
    - 背书 GLM GN1(AST 派生 census)/ GN2(四类负例红先行)/ GN3(值域与事务红线)/
      GN4(首批 + 命名例外登记)全部。
  - 独立可证伪观察: ①若 1000px 实测列数 ≠ 4(gap/padding 偏差)→ 以实测修基线,K-NF4 防
    算术假绿;②若 preventDefault 在某浏览器仍触发 blur commit(Firefox pointer/focus 差异)→
    换 mousedown 兜底并补跨浏览器断言;③若 wheel 公共化阻断页面滚动(passive listener 误用)→
    K-NF3 返工;④若动态 census 证明除首批五页外无其他主表单拉伸场景 → 范围按 GN4 登记收口,
    不扩大。
- GLM：
  - premise: **verified（2026-08-29，本人独立脚本复算全 census + 根因四件套 + 值域/覆盖一手直读，非代理）**：
    1. **111/36 census 逐项复现** ✓：正则扫生产 TSX 恰 **36 业务文件 / 111 调用点**，分
       DsNumberInput 59 + DsDraftNumberInput 44 + DsDraftNumberField 8（零业务裸
       `<input type=number>`）；显式 `size="compact"` 恰 **44**；`DsFieldMeasure
       short-number` 块内数字调用恰 **19**——与卡面初扫数字完全一致。“49 处默认尺寸无
       measure 不能机械判违规”的立场正确（range/timeline/紧凑行可能由父布局正确约束）。
    2. **根因四件套实锤** ✓：EnemyTab.tsx:870-895 已用 `DsField + DsDraftNumberInput`
       （integer、draftKey 事务、手写 onWheel blur）——语义 number 在位；`.ds-input
       { width:100% }`（primitives.css:575）+ `.ds-input[type=number]` spinner 隐藏
       （:591-595）；`.enemy-stat-grid` 仅 `display:grid + gap` **无 grid-template-columns**
       （editor.css:7001-7005 截止于 gap）——单列超长框根因闭合。
    3. **inputMode 覆盖实锤** ✓：controls.tsx:741-744 `{...controlProps}` 先展开、
       `inputMode="decimal"` 硬写在后——调用方显式值确被公共默认反向覆盖；29 处 integer
       调用吃 decimal 与 wheel 仅 26/111 手写的缺口成立，“primitive/recipe 统一持有”
       的设计依据属实。
    4. **registry 借用假绿实锤** ✓：EnemyTab `DsFieldGroup` 出现 **0 次**——battle/enemy
       聚合声明确实借同 registry 其他组件冒充，与 Shop 假绿同型。
    5. **值域红线一手证据** ✓：PAL 当前 **39 个敌人含负数 stats**（enemy-398/400/401/403…），
       pal-extract enemies parser u16/s16 并存——“不得全局 clamp min=0”是硬约束非风格偏好。
    6. **非 Enemy 场景直读**：LevelingEditor 等级输入（手写 wheel blur + 无 measure）、
       ProjectWorkbenchTab HP/MP（short-number measure + DsFieldMeasure 正例）、44 处
       compact 表格族——第二场景确认“需分类而非机械迁移”。
  - design: **agree（2026-08-29，附 GN1-GN4 必落钉）**：
    - **GN1（census AST 派生 + 逐页证据）**：`number-field-adoption` registry 必须由 AST 从
      真实 render/调用点复算（多行 attrs 教训——ADD-PICKER 三次漏项根因均为行式正则）；
      六类分类轴冻结（主表单短数字/紧凑表格行/range-timeline 配套/坐标帧号高密度/ID-code
      只读/有界例外）；每条记录 source/component/mode/control/measure/grid/owner/reason/
      verification/removalCondition，机器 count 与 registry 相等，新增/删除/改名/陈旧
      fail-closed；**页级 owner 不得借同 registry 其他组件冒充（EnemyTab 自身证据钉）**。
    - **GN2（四类负例红先行）**：裸业务 `input[type=number]`、主表单 `DsField +
      Ds*NumberInput` 绕过 canonical NumberField、未登记 fill/no-stepper 模式、业务 CSS
      自造 number width/spinner/auto-fit grid——四类各有先红后绿的 gate 测试；Design
      System 自身与证据化专用 owner 例外须登记。
    - **GN3（值域与事务红线）**：不补全局 min/max（39 负数敌人证据）；integer→
      inputMode="numeric"、小数→"decimal"且**不覆盖调用方显式值**（修 controls.tsx:744
      的覆盖顺序要有回归断言）；wheel 统一由公共 owner 持有且不改变滚动/焦点语义；
      stepper 点击单命令（pointerdown 不先 blur 提交旧值——参照 Startup 移出按钮
      `onPointerDown preventDefault` 先例）；ED-FIELD-COMMIT-1 事务合同零改动。
    - **GN4（首批 + 命名例外登记）**：Enemy 11（战斗 8 + 奖励 3）/Actor 10/BattleField 5/
      Skill 4/Item 买卖价首批逐条给迁移证据；Ambience RGB、脚本/地图坐标、帧/切片、
      range/timeline、紧凑 repeat/table 逐项登记专用 owner + 理由——**不能靠“没有
      measure”自动失败**（与“49 不等于 49 违规”同一立场）。
  - 独立可证伪观察：①若动态 census 证明除 Enemy 外无第二个主表单短数字拉伸场景——范围应
    收缩为 Enemy + 防回流（本席 49-无-measure 域待分类，当前无法排除第二场景存在）；
    ②若受支持浏览器在 spinner 隐藏后仍有稳定可识别的 number affordance——stepper 方案
    应撤回换更小视觉方案（交 Kimi 浏览器证据裁决）；③若公共 stepper 无法在单命令/草稿
    合同内实现（出现双提交/串对象）——GN3 红线触发停线；④12rem auto-fit 与 10rem 壳在
    320px/200% zoom 下若出现逐字换行或横向溢出——布局基线须回炉（Kimi 席冻结数值）。
- 独立反证审查：GLM（2026-08-29，见上——Enemy 根因 + 三个非 Enemy 场景 + 39 负数敌人 +
  registry 借用四路一手证据；锚点：EnemyTab.tsx:870-895、editor.css:7001-7005、
  primitives.css:575/:591-595、controls.tsx:741-744、pal-extract enemies.ts:103-129、
  projects/pal/content/enemies.json 复算、LevelingEditor/ProjectWorkbenchTab 对照）。
- counter / 分歧处理：任一方 counter 则保持 draft/blocked；涉及 stepper 产品取舍无法收敛时交用户拍板。
- 缺签豁免：N/A。
- build 准入结论：**allowed（三方签字齐：Codex / GLM / Kimi 均 2026-08-29 verified + agree，无
  counter）**。实现期落实 GLM GN1-GN4 与 Kimi K-NF1-K-NF6 钉子（重点：stepper preventDefault 单
  命令、inputMode 派生与显式值优先、wheel 公共语义、12rem/10rem 浏览器实测冻结、stepper 事务语义
  build 前写明、ED-FIELD-COMMIT-1 零改动）；规范版本按新增 pattern 升 minor；done accept 另行计算。

### 进入 done 前：审查签字

- Codex：**accept（2026-08-29）**。公共 stepper、draft/commit/wheel/inputMode 合同、12rem auto-fit +
  10rem 控件壳、36 文件 / 111 调用点闭合 registry、代表页面迁移与真实技能页可选 `min=1` 往返反例均已
  闭合；未改 schema/runtime/project 数据。唯一一次 editor 全量暴露的 4 个 stale evidence/timeout 已逐项修正并
  由对应聚焦测试复核，不以重复全量掩盖证据。
- Kimi：**accept（2026-08-29，当前实现只读终审，本人独立直读组件 / CSS / registry 复算 + 聚焦复跑，
  非复述 Codex）**:
  1. **stepper 与单命令合同 ✓(K-NF1/K-NF6)**:`DsNumberStepper`(controls.tsx:791-832)
     `onPointerDown preventDefault + inputRef.focus()`——焦点不离 input、无 blur 旧值提交;
     `onStep → controller.replaceAndCommit(next)` 一次点击至多一条命令（即时单命令路线,
     K-NF6 已按 Build 摘要冻结);`nextDraft` 在等值 / 越界 / 非 integer 时返回 undefined
     (:786-787)→ 按钮 disabled(:990-991)零命令;commit 等值短路(:909,911);disabled /
     readonly 按钮禁用;中文 `aria-label`(减少/增加)+ `aria-controls` + 符号 aria-hidden。
  2. **draft / wheel / inputMode ✓(K-NF2/K-NF3)**:`inputMode={inputMode ?? (integer ? 'numeric'
     : 'decimal')}`(:954)显式优先 + 派生;wheel 由 `temporarilyProtectFocusedNumberInput`
     (:839-855,970-978)公共持有——聚焦瞬时 readOnly 防原生改值,**不 blur、不 commit、不
     preventDefault、不阻断页面滚动**,26 处手写 owner 收口。
  3. **12rem auto-fit + 10rem 壳 ✓(K-NF4)**:`--ds-number-field-column-min: 12rem`
     (tokens.css:53);`recipes.css:888-896` `repeat(auto-fit, minmax(min(100%, 12rem), 1fr))`;
     `primitives.css:597-601` `.ds-number-field > [data-ds-control-id]` 以
     `--ds-field-measure-short-number`(10rem)默认限宽——recipe 默认化落实,不再依赖业务页
     手套 wrapper;stepper 壳按钮 = control-height / compact hit-target,`:has(:focus-visible)`
     壳级 focus 环(K-NF5)。
  4. **真实页面采用 ✓**:EnemyTab import + :876 `<DsNumberFieldGrid className="enemy-stat-grid">`
     + `DsDraftNumberField`(:46,64)——截图页根因(无列 grid + 全宽 + 无 affordance)已由公共
     配方替换;Skill / Actor / BattleField / Item 同批迁移由 adoption registry 登记。
  5. **adoption 精确闭合 ✓(本人 node 复算)**:`number-field-adoption.json` baseline
     `{files:36, leafCalls:111, controls:{DsNumberInput:55, DsDraftNumberInput:29,
     DsNumberField:4, DsDraftNumberField:23}}` 与 Codex 声明逐字一致(55+29+4+23=111);
     entries=54 callsites × `renderMultiplicities`(5 个循环 callsite,如 ActorStatField 1×10)
     双口径自洽;六类 mode(main-form-short:12 / range-timeline:5 / coordinate-frame:15 /
     id-code-readout:3 / compact-repeat-row:14 / bounded-exception:5)分类轴冻结。
  6. **Skill"前置震屏帧"往返 ✓(验收点 4)**:`allowEmpty + min={1}` 公共回关闭逻辑
     (controls.tsx:927-938——current ≤ min 点减号返回空草稿);SkillAnimationEditor.tsx:192-228
     placeholder="关闭"、`preShake undefined` 即关闭、**强度字段条件渲染**(:212
     `{props.animation.preShake && (...)}`)随之出现/移除;SkillTab.test.tsx:434-451 真实回归
     断言 1→关闭(状态 undefined + value='' + placeholder='关闭')→1(恢复 {frames:1,
     level:3})双向闭合。
  7. **schema / runtime / 值域零变化 ✓**:validate 只在显式 min/max 时 enforceRange(:901-902),
     无全局 clamp;Enemy stats 保持 integer+normalize 可输负数;本卡 diff 不含 content /
     reforge / migrate / projects 语义文件。
  8. **复跑证据**:本人聚焦 5 文件(controls / number-field-adoption / field-layout-adoption /
     SkillTab / EnemyTab)**75/75 全绿**(17.5s);Codex 报告的全量一次 166/168(4 个 stale
     evidence / timeout 已逐项修正并聚焦复核)与既往 flake 模式一致,不构成阻断。
  - 无返工项。GLM accept 与用户验收前不得标记 done。
- GLM：**accept（2026-08-29，只读终审，本人一手直读公共实现/registry/代表页 + 独立复跑聚焦，非代理）**：
  1. **Stepper 单命令与事务合同（K-NF1/GN3）** ✓：`DsNumberStepper` 按钮
     `onPointerDown = preventDefault + focus(input)`（controls.tsx:801-804）——不先 blur 提交
     旧值；click 走 `controller.replaceAndCommit(next)`（:997-1000，replace+commit 单一控制器
     操作 = 至多一条命令）；`steppedDraft` 对 `step="any"`、等值、越界钳制、非整数返回
     undefined（:768-787）→ 按钮 disabled（零命令）；disabled/readonly 禁用（:989-990）。
     直接键入仍走 `controller.change/blur/keyDown` 原 draft 周期（:965-968）——
     ED-FIELD-COMMIT-1 合同零改动。
  2. **inputMode / wheel（K-NF2/K-NF3）** ✓：`:954 inputMode={inputMode ?? (integer ?
     'numeric' : 'decimal')}`——调用方显式值优先，修掉了旧 :741-744 后置覆盖；wheel 由
     `temporarilyProtectFocusedNumberInput`（:839-855，短暂 readOnly 保护）公共持有——
     不改值、不 blur、不阻断页面滚动。
  3. **用户反例复现（关闭→1→关闭）** ✓：`nextDraft`（:927-948）
     `allowEmpty && direction===-1 && current <= minimum → return ''`——min 点减号回到
     "关闭"；空态 `+` 走 `min ?? step` = 1；真实 SkillTab 回归测试在位
     （SkillTab.test.tsx:434"前置震屏帧可用步进按钮在关闭与 1 帧之间双向切换"，断言 value=''
     + placeholder='关闭'）。
  4. **12rem auto-fit + 10rem 壳 + 真实采用（K-NF4/GN4）** ✓：
     `tokens.css:52-53 --ds-field-measure-short-number: 10rem /
     --ds-number-field-column-min: 12rem`；`.ds-number-field-grid` =
     `repeat(auto-fit, minmax(min(100%, 12rem), 1fr))`（recipes.css:888-896）——min(100%)
     防窄容器溢出、无页面断点；DsNumberFieldGrid 生产消费 7 文件（Enemy/Skill/Actor/
     BattleField/Item/ProjectWorkbench/LevelCurve）；Enemy 数字块已消费
     DsDraftNumberField（EnemyTab 6 处），stats 字段无新增 min 钳制（负数语义保留——
     卡面 `min={1}` 均为震屏帧等原领域约束）。
  5. **registry 闭合（GN1/GN2）** ✓：`number-field-adoption.json` 含 version/baseline/
     modes/entries(54 组)/wrappers/renderMultiplicities/businessCssOwners/inlineWidthOwners；
     六类分布 main-form-short 12 / compact-repeat-row 14 / coordinate-frame 15 /
     range-timeline 5 / id-code-readout 3 / bounded-exception 5 = 54 组覆盖 111 leaf；
     每条带 mode/control/measure/grid/owner/reason/verification/removalCondition，
     AST 复算 count 相等 fail-closed。
  6. **值域红线（GN3）** ✓：content/reforge/projects 无本卡 diff（工作区 migrate/baseline
     改动属 MIG-PAL-MAP-NAME-1 卡）；39 负数敌人值域未动。
  7. **独立复跑**：`controls.test + SkillTab.test + number-field-adoption +
     field-layout-adoption` → **4 files / 66 tests 全绿**。
  - 无返工项。未修改实现文件，未代签 Kimi。
- 用户验收：**accept（2026-08-29）**。用户按交付清单复验通过，包括 Skill“前置震屏帧”
  `关闭 -> 1 -> 关闭` 往返，以及宽窄布局下数字字段的有界控件与响应式分列。
- done 准入结论：**allowed（2026-08-29）**。Codex + Kimi + GLM 三方当前实现 accept 与用户验收齐，
  无 counter，本卡收口。

## Build: 实现与自测

- Coding Owner: Codex（complete；唯一实现者）
- 修改文件:
  - 公共合同：`design-system/controls.tsx`、`recipes.tsx/.css`、`primitives.css`、`tokens.css`、`index.ts`、
    Design Lab RF25 与 `editor-design-system-v1.md`。
  - 采用闭包：`number-field-adoption.json/.test.ts`、`design-system-adoption.json`、
    `field-layout-adoption.json/.test.ts`、`field-layout-css-census.snapshot.txt`。
  - 代表消费面：Actor、Enemy、BattleField、Skill、Item、Cutscene、LevelCurve、Vars、Project Startup 及其
    helper/test；删除相应页面私有数字网格与 26 处业务 `onWheel={blur}` owner。
- 实现摘要:
  - 新增 `DsNumberField / DsDraftNumberField / DsNumberFieldGrid`。主表单数字使用固定 `10rem` 同壳
    `− / input / +` stepper；字段集合使用 `12rem` 最小列宽的 `auto-fit/minmax`，页面不再自行写数字断点。
  - stepper `pointerdown` 保留焦点，点击基于当前可见草稿即时提交至多一条命令；等值、越界、disabled、
    readonly 和 `step="any"` 为零命令。直接键入继续遵守 Enter/blur/Escape/resync 原事务合同。
  - `integer` 默认派生 `inputMode="numeric"`，其它数字默认 `decimal`，显式调用方值优先；wheel 防误改由
    公共 owner 持有且不阻断页面滚动。
  - `allowEmpty + min` 明确表示“关闭”位于最小值之前：`关闭 -> min`，在 `min` 点减号回到关闭。用户反馈的
    技能“前置震屏帧改成 1 后改不回去”已以公共逻辑修复，并补真实 `SkillTab` 回归测试。
  - AST registry 精确闭合 36 个生产 TSX / 111 个数字 leaf；55 `DsNumberInput`、29
    `DsDraftNumberInput`、4 `DsNumberField`、23 `DsDraftNumberField`，六类布局与例外均有 owner/reason，
    新增、漏登、伪 owner 和页面私有 numeric grid fail-closed。
- 测试:
  - 最终聚焦矩阵：**15 files / 250 tests passed**；其中公共 controls + 真实 Skill 往返反例为
    **55/55 passed**，number adoption、field-layout adoption、真实 route adoption 均独立通过。
  - `pnpm --filter @type-pal/editor typecheck`：passed。
  - `pnpm --filter @type-pal/editor audit:design-system`：passed（89 files；2 条证据化 exception）。
  - editor 全量按纪律只运行一次：**166/168 files、1367/1371 tests passed**；4 个失败均是本次迁移后的
    stale registry/snapshot 与重型 AST 测试 timeout，不是产品断言。随后修正 LevelCurve owner、CSS census 与
    聚焦 timeout budget，分别复跑 adoption **20/20**、field-layout **7/7** 通过；不再重复耗时全量。
- 浏览器 / 视觉证据:
  - Design Lab RF25：1280/900/720/480/320px 分别稳定为 6/4/3/2/1 列，stepper 实测宽 160px，
    `scrollWidth === clientWidth`；固定样例 1000/720/480/320px 为 4/3/2/1 列。
  - 截图：`/tmp/type-pal-ed-number-field-rf25-1280.png`、
    `/tmp/type-pal-ed-number-field-rf25-480.png`。
  - PAL 真实技能页：空值“关闭”点 `+` 得 1 并显示默认强度 3；点 `−` 回到“关闭”且强度字段移除；
    无 console error，未保存项目内容。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 结论: Codex + Kimi + GLM 当前实现 accept，用户复验通过，任务 done。
- 必须返工项: none。

## 交接日志

- 2026-08-29 Codex：完成公共 NumberField/stepper、响应式数字 grid、36 文件 / 111 leaf registry 与代表页面
  迁移。用户在真实 Skill 页发现 optional `min=1` 字段从“关闭”进入 1 后无法返回；修正公共 decrement 边界并补
  controls + SkillTab 双层回归，浏览器复验 `关闭 -> 1 -> 关闭` 通过。卡转 review，Codex accept；待 Kimi +
  GLM 当前实现终审和用户验收。

- 2026-08-29 Kimi: done 前只读终审。直读 `DsNumberStepper`(controls.tsx:791-832——pointerdown
  preventDefault + focus 保持 / replaceAndCommit 单命令 / 等值越界 disabled 零命令 / 中文 aria-label)、
  `allowEmpty + min` 回关闭公共逻辑(:927-938)、inputMode 派生(:954)、wheel 瞬时 readOnly 公共
  方案(:839-855,970-978);node 复算 `number-field-adoption.json` baseline {36 files, 111
  leafCalls, 55/29/4/23} 与 Codex 逐字一致,54 callsites × renderMultiplicities 双口径自洽;核
  SkillAnimationEditor.tsx:192-228 强度字段条件渲染与 SkillTab.test.tsx:434-451 关闭↔1 双向回归;
  复跑 5 文件 **75/75 全绿**。签 **accept**,无返工项,未修改实现文件。准入更新为待 GLM + 用户
  验收。Next: GLM 终审 -> 用户验收。

- 2026-08-29 User/Codex：用户按交付清单复验通过；确认可选数字字段可 `关闭 -> 1 -> 关闭`，宽窄布局下
  数字控件尺寸与自动分列符合预期。三方当前实现 accept 与用户验收齐，本卡 `review -> done`。

- 2026-08-29 Codex：核对任务卡实际记录，确认 Codex/Kimi/GLM 三方 premise/design 签字齐、无 counter，
  build allowed；将 K-NF6 冻结为“stepper 点击即时离散提交，直接键入仍走原 draft 周期”，任务转 build。

- 2026-08-29 Codex：完成截图路径、公共 NumberInput、field measure、Enemy grid、旧卡签字范围与全生产调用域的
  只读审计；确认“语义 number 已采用，但视觉/measure/grid/adoption 合同不足”。创建本卡，未修改实现文件。
- 2026-08-29 Kimi: 独立直读根因四件套(EnemyTab.tsx:882-894 语义 number 在位 / primitives.css:575
  全宽 + :587-595 spinner 隐藏 / editor.css:7001-7006 grid 无列)、controls.tsx:741-744(inputMode
  后置覆盖)、tokens.css:52(10rem measure 已在)、stepper 单命令先例(ProjectWorkbenchTab:912,1189
  onPointerDown preventDefault、controls.tsx:1658);算术验证 12rem auto-fit 在 gap≈12px 口径下
  320/480/720/1000 → 1/2/3/4 列与卡面基线吻合。签 premise verified + design agree,附 K-NF1
  (preventDefault 单命令)/ K-NF2(inputMode 派生 + 显式优先)/ K-NF3(wheel 公共语义)/ K-NF4
  (列数浏览器实测冻结,算术不代替实测)/ K-NF5(无障碍)/ K-NF6(stepper 事务语义 build 前冻结)
  六钉,背书 GLM GN1-GN4。三方签字齐、无 counter,build 准入 allowed;未修改实现文件。Next:
  Codex 按钉 build(K-NF6 事务语义先写明)-> 三方 done 终审。

## 下一位 Agent 提示词

无下一位 Agent 提示词：三方当前实现 accept 与用户验收齐，本卡已完成。
