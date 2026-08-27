# ED-FIELD-LAYOUT-1 - 编辑器字段标签列与响应式布局合同

Status: build（queued；2026-08-27 三签齐：Codex + Kimi（KL1-KL4）+ GLM（FL1-FL3），准入 allowed；等待当前 Add Picker build 串行结束）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-project-startup-ia-1`

## 目标

把已经写入设计规范但没有被实现和门禁约束的字段布局真正落地：主工作区横排字段统一使用 `96px` 标签轨，
同一字段组的控件起点一致；容器不足 `480px` 时整组切换为“标签在上、控件在下”。业务页面不得再用
`60/72/84/92/...px` 等私有魔法数自行决定标签宽度，也不得让采用矩阵在页面仍使用 legacy `.field` 时误报
“已采用”。

## 范围

- 范围内：
  - 新增公共 responsive field-group owner，复用现有 `DsField` 的 label/control/help/error 语义；标准标签轨由公共
    token 持有，冻结为 `96px`。
  - 同一 field group 只允许一条共享标签轨；标签不得按单行文字长度自行推开后续控件。
  - 普通长标签在 `96px` 轨内自然换行；若整组标签普遍过长，整组改用 stacked，不提供业务页私自扩宽的逃生口。
  - `ProjectWorkbenchTab` 的入口信息、开局金钱、入口 ID 修复、项目显示名等 legacy `.field` 一次迁入公共 owner；
    截图中的“标签 / 起始场景 / 入口视频 / 金钱”必须共享相同控件起点。
  - 从生产 TSX/CSS 动态生成横向 label/control 轨 census；当前只读基线为 20 条 live page-private 轨、1 条重复
    Inspector bridge、1 条 live 私有只读属性轨和 3 条无 TSX 引用遗留规则。逐项归为公共主表单、Inspector
    紧凑属性行、非表单结构轨或应删除遗留，不能只修截图页面。
  - 明确 `DsPropertyGrid/DsPropertyRow` 是窄 Inspector 的紧凑属性语法；若保留 `60px`，必须在规范中登记为
    唯一命名例外、保持同组一致并覆盖长标签，而不能让业务页面借用该例外。
  - 修正 design-system adoption 真值和静态门禁：登记 owner 必须在生产源码真实出现；业务 CSS 自造字段标签轨
    默认失败，确属非表单结构轨的 allowlist 必须带 owner、理由、响应式证据和删除条件。
- 范围外：
  - 不改字段 draft/validate/commit/cancel/resync、命令数量、undo/redo 或输入性能合同。
  - 不改 schema、migration、runtime、项目内容、角色初始状态 ownership 或排序交互。
  - 不重开已 done 的 `ED-DS-3`、`ED-FIELD-COMMIT-1`、`ED-PROJECT-STARTUP-IA-1`；本卡修复的是新发现的
    规范执行与门禁缺口。
- 明确不做：
  - 不把 `72px` 简单改回 `60px`，也不为被截图点名的四行再写一个页面局部宽度。
  - 不用 JavaScript 测量最长标签后逐行或逐卡动态改宽；布局由 CSS grid/container query 持有。
  - 不把 `DsPropertyRow` 当作主工作区表单 owner，也不为了对齐把短数值输入拉成整行；控件宽度继续由
    `DsFieldMeasure` 等公共 measure 决定。

## 前提真值门

### 一句话行为 / 工程前提

现行规范已经要求主表单标签轨至少 `96px`、窄于 `480px` 转 stacked，但当前公共组件、项目页面、采用矩阵和
静态门禁没有共同执行这条合同，导致同一页面同时出现 `60px` 与 `72px` 标签轨且门禁仍为绿色。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：二阶段编辑器字段布局没有原版游戏作者工具可对照。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：一阶段没有 Reforge 编辑器设计系统或项目工作台。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | 规范要求同组控件起点对齐、横排 label 至少 96px、<480px stacked；入口信息实际命中 `.field=60px`，金钱被 `.project-field-grid` 覆盖为 72px；adoption 却宣称页面已使用 `DsField`。 | `docs/phase2/editor/editor-design-system-v1.md:194,320-327`；`packages/editor/src/ui/ProjectWorkbenchTab.tsx:783-799,1574-1657`；`packages/editor/src/ui/editor.css:1362-1371,1693-1698`；`packages/editor/src/ui/design-system/design-system-adoption.json:269-289` |
| 本任务目标 | 主工作区由公共 field group 持有统一 96px 标签轨与 480px 响应式降级；真实采用与登记一致，私有轨受证据化门禁约束。 | 本卡目标、设计结论与验收条件 |

### 反证与替代解释

- 最强替代解释：截图错位只是两个相邻卡片各自选择不同字段密度，统一成任意相同宽度即可；或采用矩阵只需声明
  控件族，不必证明布局 owner 真正出现。
- 什么观察会推翻当前前提：若计算样式证明两组字段实际 control `left` 相同；或生产源码确实在截图路径消费
  已登记的 `DsField` 布局 owner；或现行规范允许主工作区使用小于 96px 的私有标签轨。当前直接证据均相反。
- audit 红项如适用，已排查的替代根因：
  - runtime 语义 / 命令分类：N/A；纯编辑器布局，不改变命令与数据。
  - 原版 / 第一阶段理解：N/A；无对应作者 UI。
  - extractor / 地图 / 数据解码：N/A；不消费迁移数据。
  - audit / test model：已确认是门禁漏检：现有 adoption 测试检查声明，不证明登记 owner 在页面真实出现；现有
    boundary 反而把 Inspector `60px` 固化，未检查主工作区 `>=96px` 和 container query。

### 用户可见偏离

- 是否主动偏离已核真值：yes（修正当前不合规范的用户可见布局）。
- `before -> after` 一句话：同页标签轨由页面私有 `60/72px` 决定、控件起点错开 -> 主工作区统一 `96px`
  公共轨，窄容器整组转上下布局，业务页不能再自行改列宽。
- 代表场景：项目设置 → 入口点，同屏比较“标签 / 起始场景 / 入口视频 / 金钱”；默认宽度、479/480px 容器与
  100%/125%/150%/200% 缩放。
- 用户裁决：2026-08-27 用户指出同页错位，并明确质疑“有规范却不执行”的设计系统无效问题，要求给出并执行规则。

## 上下文锚点

- 已拍板决策 / 铁律：
  - 已完成旧卡不得重开；新发现的跨页面公共合同和门禁缺口独立开卡。
  - 同一时间只有 Codex 作为 Coding Owner 修改实现；三方 build 签字齐前不改实现文件。
  - 设计系统采用必须来自真实页面 registry，不能只靠声明字符串自证。
- 代码锚点（`file:line`）：
  - `packages/editor/src/ui/design-system/controls.tsx:375-425`（`DsField`）
  - `packages/editor/src/ui/design-system/primitives.css:434-449`（inline 目前为逐行 `auto`）
  - `packages/editor/src/ui/design-system/recipes.tsx:926-960`（Inspector-only PropertyRow）
  - `packages/editor/src/ui/design-system/recipes.css:719-733`（PropertyRow 当前 60px）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:783-799,1353-1378,1574-1657,1929-1941`
  - `packages/editor/src/ui/editor.css:1362-1371,1693-1698,14259-14292`
  - `packages/editor/src/ui/design-system/design-system-adoption.json:269-289`
  - `packages/editor/src/ui/design-system/boundary.test.ts:663,1151-1162`
- 已知坑 / 审计文档：
  - `docs/phase2/editor/editor-design-system-v1.md:194,320-327,487,778`
  - `docs/ops/tasks/ED-DS-3-editor-design-system-adoption-gate.md`
  - 2026-08-27 只读 census：20 条 live 私有横向标签轨，宽度谱含 58/60/72/84/88/92/120/190px 及
    auto/max-content/fraction；必须逐项分类，不能把所有 grid 第一轨机械当作表单。
- 不得重新引入：业务 `.field` 魔法数、单行自动扩宽、viewport/JS 测量代替 container query、逐字中文列、虚假
  adoption、无理由永久 allowlist、把短数值控件拉满整行。
- 相关测试：`design-system/boundary.test.ts`、`design-system/adoption.test.ts`、
  `ProjectWorkbenchTab.test.tsx` 及受影响页面聚焦测试。

## 验收条件

- 功能：
  - 公共 field-group recipe 在宽容器使用唯一 `96px + gap + minmax(0,1fr)` 轨，label/control/help/error 的
    关联、必填、错误和帮助语义继续由 `DsField` 持有。
  - 容器 `<=479px` 时整组 stacked；`>=480px` 时才允许横排。任何单行不得自行覆盖标签列。
  - 项目入口页所有 legacy 字段迁入公共 owner；宽布局中“标签 / 起始场景 / 入口视频 / 金钱”的 control
    `getBoundingClientRect().left` 差值不超过 `0.5px`。
  - 长标签在标准轨中自然换行但不逐字竖排；无法清晰容纳时使用整个 stacked group，不按单行加宽。
  - Inspector 紧凑属性行若保留 60px，规范、公共 recipe 和测试必须明确它是唯一命名例外；业务主表单无法借用。
  - 动态 census 覆盖全部生产 label/control 私有轨，逐项记录迁移、公共例外、非表单结构或死规则删除结论。
- 测试：
  - component/CSS 合同测试覆盖 479/480px、96px token、help/error grid placement、长中文标签和控件 `min-width:0`。
  - adoption 门禁验证登记 owner 在对应生产源码真实出现；ProjectWorkbench 禁止 `className="field"` 与
    `.project-field-grid` 回流。
  - 静态门禁默认禁止业务 CSS 为 field/label/property 自造 label/control 轨；allowlist 必须有 owner、理由、
    响应式证据和删除条件。
  - 每个切片先跑聚焦测试；最后只跑一次 editor 受影响包全量和 typecheck。
- 文档：
  - `editor-design-system-v1.md` 写清“主工作区 96px / <480 stacked / Inspector 命名例外 / 长标签策略”；
    设计系统版本、token、Design Lab 与 adoption registry 同步。
- 视觉 / 手工验证：
  - PAL 项目入口页 1280px、900px、720px，100%/125%/150%/200% 缩放；检查同起点、长标签、无横向溢出、
    focus ring、错误/帮助文案、选择器浮层和滚动。
- E2E 用例登记：N/A（功能性编辑器界面在 build 期做最小浏览器几何验证）。

## 推进签字

### 进入 build 前：设计签字

- Codex：
  - premise: **verified（2026-08-27）**。规范 `editor-design-system-v1.md:194,320-327` 明确 96px/480px
    合同；`ProjectWorkbenchTab.tsx:783-799,1574-1657` 与 `editor.css:1362-1371,1693-1698` 直接证明同页
    60/72px 分裂；`design-system-adoption.json:269-289` 与真实 JSX 不一致，门禁漏报成立。
  - design: **agree（2026-08-27）**。新增公共 responsive field-group owner，主工作区唯一标准轨 96px，
    <480px 整组 stacked；先按动态 census 分类再收口真实违规，不用页面补丁；Inspector 只允许经规范化的
    `DsPropertyRow` 紧凑例外。
- Kimi：
  - premise: **verified（2026-08-27 独立直读规范/页面/公共组件/采用矩阵，非代理）**。①双轨分裂实锤：
    `editor.css:1362-1371` legacy `.field` = `60px 1fr`，`:1693-1698` `.project-field-grid .field` 覆盖为
    `72px minmax(0,1fr)`；`ProjectWorkbenchTab.tsx:783-799` 金钱字段走 72px 轨，`:1578-1661` 入口信息
    （标签/起始场景/入口视频）走 60px 轨——同页同屏两轨。②规范冲突属实：DS-L.7（doc:320-327）要求
    标签列 ≥96px、容器 <480px 整组 stacked；DS-F.4（:194）要求标签列/输入起点逐行对齐；60/72px 均违规。
    ③采用矩阵误报实锤：adoption.json 的 project/entrypoint 与 project/overview 登记 field owner 为
    “DsField + …”，而上述 JSX 实际是 legacy `<label className="field">`/`<div className="field">`，
    不消费 DsField。④公共组件现状：`primitives.css:440-449` 的 `ds-field--inline` 为逐行 `auto` 轨，
    无法形成跨行合同；`recipes.css:719-733` Inspector `DsPropertyRow` 为 60px 紧凑语法。
  - design: **agree（2026-08-27，附 KL1-KL4，build 必落钉）**：
    - **KL1（断点必须 container query）**：`DsFieldGroup` 只持轨道与响应式降级，label/control/help/error
      语义仍归 `DsField`；479/480 断点必须基于容器（container query），不得用 viewport media query——
      drawer/Inspector 嵌套下两者不等价。
    - **KL2（Inspector 例外唯一命名 + inline 收口）**：`DsPropertyRow` 的 60px 若以“Inspector 紧凑属性行”
      保留，必须在规范、recipe、Design Lab 与测试中登记为唯一命名例外，业务主表单借用即红；
      `DsField layout="inline"` 的逐行 auto 轨要么退休生产用法，要么限制到明确无对齐场景并由门禁区分。
    - **KL3（adoption 真值门禁）**：登记 owner 必须在对应生产源码真实出现（防本次误报回流）；census
      输入域为全生产 TSX+CSS 动态派生，逐项分类为公共主表单/Inspector 紧凑/非表单结构/死规则删除，
      不允许只修截图四行。
    - **KL4（长中文标签策略）**：96px 轨内自然换行，不逐字竖排、不按单行扩宽；整组普遍过长时整组
      stacked；落成组件测试断言（长标签行高变化但控制起点不变）。
- GLM：
  - premise: **verified（2026-08-27，本人一手读码 + 独立机器 census，非代理）**：
    1. **60/72px 分裂实锤**：`editor.css:1362-1366` 通用 `.field` = `60px 1fr`；`editor.css:1693-1698`
       `.project-field-grid .field` = `72px minmax(0,1fr)`（双类选择器更高优先级）。JSX 侧：金钱字段
       被 `.project-field-grid` 包裹（`ProjectWorkbenchTab.tsx:784-785`）→ 72px；入口“标签 / 起始
       场景 / 入口视频”是裸 `.field`（`:1580-1601`）→ 60px——同页相邻卡片控件起点差 12px，
       before 属实。
    2. **违反现行规范实锤**：`editor-design-system-v1.md:194`（表单标签列、输入起点和尾部动作列必须
       逐行对齐）与 DS-L.7 `:322-323`（横排仅容器 >=480px 且标签列不得窄于 96px，不足转上下）。
       60 与 72 均低于 96px 下限且无 480px 容器降级——双重违规，非“两种合法密度”。
    3. **adoption 漏报实锤**：`design-system-adoption.json:269-289` `project/startup` 与
       `project/entrypoint` 的 field owner 声明 `"DsField + …"` 且 `status: adopted`，但生产 JSX
       （:785/:1580/:1590/:1361/:1936）全部是 `className="field"` legacy 标记——登记 owner 与源码
       不符，“已采用”为虚报。
    4. **门禁双缺口实锤**：`boundary.test.ts` 全文 grep `96px|480px` **零命中**——主工作区
       96px/480px 合同完全无断言；`:663-668` 反而把 Inspector 桥接 `:is(.inspector,…)
       :where(.field,.music-meta-row) = 60px minmax(0,1fr)`（editor.css:14259）冻结为现状。另
       `primitives.css:437-443` `.ds-field--inline` 是逐行 `auto minmax(0,1fr)`——构不成跨行起点
       合同，与卡文/ KL2 判断一致。
    5. **独立机器 census（本席复跑）**：扫 editor.css 全部 `grid-template-columns` 首轨共 **51 条**
       原始命中；按“可见 label 第一轨 + control 第二轨”语义过滤后约 25 条 label 轨候选，其余为
       序号（30px DsSequenceIndex 族）/图标/槽位/动作/选项结构轨——宽度谱 42/56/58/60/64/72/88/
       92/112/120/150/190px（:1986）及 auto/max-content，与卡文基线同域；**无 TSX 引用的死规则
       本席直接找到 3 条**：`.stamp-slot-list li`（:4734）、`.canonical-command-row`（:13720）、
       `.script-hook-initial`（:14176）；`.music-meta-row`（:7986）类名不在 TSX 但被 :14259 桥接
       选择器引用，需 census 判定动态引用或死规则。卡文 20/1/1/3 基线量级复现，精确数以 build 期
       动态 census 为准。
  - design: **agree（2026-08-27，附 FL1-FL3 必落钉；与 KL1-KL4 互补不冲突）**：
    - **FL1（census 产物化 + 分类判定轴冻结）**：动态 census 必须落成可复现产物（同
      field-commit-adoption.json 纪律）：脚本扫生产 TSX/CSS 全部横向首轨，逐条登记 selector、
      live/dead（TSX 引用核验，含动态类名）、分类（主表单迁移 / Inspector 紧凑例外 / 非表单结构轨 /
      死规则删除）与证据锚点。判定轴冻结为“可见 label/属性名第一轨 + control/value 第二轨”——
      本席 51→25 的过滤结果证明不做语义分类会误伤序号/媒体/动作结构轨。本席找到的 3 条死规则 +
      `.music-meta-row` 动态引用疑点必须进入 census 首轮分类结论。
    - **FL2（adoption 真值化 + 补齐 boundary 主工作区断言）**：adoption 门禁双向化——登记 owner
      必须在对应生产源码真实出现（本席已证 project/startup+entrypoint 的 DsField 声明为虚报），
      源码出现未登记同样失败；boundary 必须补上当前完全缺失的 `96px` token 与 `480px` container
      query 断言（grep 零命中为证），并把 Inspector 桥接 60px 合法性收紧到 `:is(.inspector,…)`
      作用域内——主工作区 .field 不得借道（与 KL1 container query、KL2 例外唯一命名同向）。
    - **FL3（测试矩阵）**：DsFieldGroup 组件/CSS 合同测试覆盖 479/480 切换、组内唯一共享轨（非
      逐行 auto）、长中文标签换行不逐字（与 KL4 同向）、stacked 态 help/error grid placement、
      control `min-width:0`；每个迁移页断言 `className="field"` / `.project-field-grid` 覆盖不
      回流；入口页四行 control left 差 ≤0.5px 在迁移后公共 owner 上实测，并保留“旧 60/72 双轨”
      负例断言（再出现双轨即红）。
  - 独立反证 / 可证伪观察：①若浏览器实测两组字段 control left 本已相等（更高优先级覆盖或容器
    差异），before 前提失效——本席特异性分析（双类 > 单类）表明 72px 必然生效于金钱、60px 必然
    生效于入口信息，分裂是结构性的；②若某主工作区表面的 `DsField layout="inline"` 逐行 auto 是
    承载语义（单字段无对齐场景），退休该用法须走 census 分类 + 命名例外，不得静默破坏；③若卡文
    “1 条 live 私有只读属性轨”实际可由 `DsPropertyRow` 表达，应迁移而非 allowlist——allowlist
    仅收真正非表单结构轨。
- 独立反证审查（至少一位非 Coding Owner 必填）：
  - 审查者：Kimi（2026-08-27）；GLM（2026-08-27，独立机器 census + 逐锚点直读，见 GLM 签节
    FL1-FL3 与可证伪观察①-③——两席反证独立完成，证据集合互补不重叠）。
  - 独立证据锚点：`editor.css:1362-1371,1693-1698`；`ProjectWorkbenchTab.tsx:783-799,1578-1661`；
    `editor-design-system-v1.md:194,320-327`；`design-system-adoption.json` project/* 四条；
    `primitives.css:434-449`；`recipes.css:719-733`。
  - 可证伪观察：若计算样式证明截图四行的 control `left` 实际相同，前提被推翻——两条私有轨（60/72px）
    的 CSS 直读已排除；若生产源码确在截图路径消费已登记 DsField owner，门禁误报不成立——JSX 直读为
    legacy `.field`；若现行规范允许主工作区 <96px 私有轨，本卡目标错误——DS-L.7 明文 ≥96px。另注意
    范围外纪律：本卡不重开 ED-DS-3/ED-FIELD-COMMIT-1/ED-PROJECT-STARTUP-IA-1 的已冻结合同，若
    DsFieldGroup 实施必须改 DsField 公共 props 或 draft 事务语义，相关卡签字须重开评估。
- counter / 分歧处理：N/A。
- 缺签豁免：N/A。
- build 准入结论：**allowed（2026-08-27，Codex + Kimi（KL1-KL4）+ GLM（FL1-FL3）三签齐、无 counter，
  两席非 Owner 独立反证完成；必落钉 KL1-KL4 / FL1-FL3 一并携带。转 `build`，Coding Owner 保持
  Codex；本卡仅授权字段布局合同范围，不得夹带改 DsField draft 事务语义——若实施必须改 DsField
  公共 props，按 Kimi 反证条款相关旧卡签字须重开评估。）**

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理：
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- 公共 owner 建议命名为 `DsFieldGroup`：父级持有 container query 和 `--ds-field-label-measure: 6rem`，直接子级
  继续使用现有 `DsField`/`DsDraft*Field`；业务页不接触轨道 CSS。
- 标准布局不按每行 label 的 intrinsic width 伸缩。这样相邻卡片只要使用相同 card padding 和公共 token，输入
  起点就稳定一致；短数值字段通过 `DsFieldMeasure` 收窄 control 本身，不改变 label track。
- `DsField` 当前 `layout="inline"` 的逐行 `auto` 不足以形成跨行合同：实施时要么退休该生产用法，要么只允许在
  单字段无对齐要求的明确场景使用，并由门禁区分。
- `DsPropertyGrid/DsPropertyRow` 是窄 Inspector 的独立紧凑语法，不得成为主工作区绕过 96px 的入口；其 60px
  保留与否以三方签字后的唯一结论为准，但无论哪种都必须在规范、recipe、Design Lab 和测试中一致。
- census 的判定对象是“可见 label/属性名第一轨 + control/value 第二轨”，不是所有多列 grid；避免误伤媒体、
  序号、图标或尾部动作等非标签结构。

### 已知风险

- 风险：全局正则把非表单结构 grid 误判为 label 轨。
- 缓解：以生产组件/DOM 语义和动态 census 为准；allowlist 仅接收命名 owner、理由、响应式证据和删除条件。
- 风险：强制 96px 可能让窄 Inspector 控件过窄，强制 stacked 又会显著增加纵向高度。
- 缓解：Inspector 走独立 `DsPropertyRow` 设计裁决并形成唯一命名例外，不把局部妥协扩散到主工作区。
- 风险：只验证截图四行，其他 20 条私有轨继续漂移。
- 缓解：采用矩阵从生产代码动态派生，门禁断言输入域闭合；实现按聚焦切片推进，最终只跑一次全量。

### 主审立场

- Reviewer：Kimi（公共 API、响应式和视觉规则）+ GLM（census、门禁与测试矩阵）。
- 结论：Codex agree；Kimi agree（KL1-KL4）；GLM agree（FL1-FL3），三签齐且无 counter。
- 必改项：KL1-KL4 + FL1-FL3，含容器断点、Inspector 命名例外、adoption 真值门禁、长标签策略和
  双轨负例矩阵。
- 是否建议进入 build：是；准入已开放，按单 Coding Owner 纪律排在当前 Add Picker build 之后。

## Build: 实现与自测

- Coding Owner: Codex（queued；当前不修改本卡实现文件，待 Add Picker 串行切片结束后接手）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录

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

- 2026-08-27 GLM: 完成独立审查并签 premise verified + design agree（附 FL1 census 产物化与分类轴
  冻结 / FL2 adoption 真值化 + boundary 补 96px/480px 断言 / FL3 测试矩阵含双轨负例）。一手实锤：
  .field 60px vs .project-field-grid .field 72px 同页分裂（特异性分析证明结构性）、双重规范违反
  （:194 对齐 + DS-L.7 96px/480px）、adoption 虚报 DsField、boundary 零 96px/480px 断言；独立
  census 51→25 条 label 轨候选 + 3 条死规则 + .music-meta-row 动态引用疑点。核验发现 Kimi
  （KL1-KL4）已同窗口签回，三签齐互证互补（KL1 container query / KL2-KL3 ↔ FL2 / KL4 ↔ FL3），
  准入 allowed，状态转 build。未修改实现，未代签 Kimi。
- 2026-08-27 Kimi：独立直读同页双轨（`.field` 60px / `.project-field-grid` 72px）、规范 DS-L.7/DS-F.4
  原文、adoption 登记与真实 JSX 的不一致、公共组件 inline 逐行 auto 轨与 Inspector 60px 紧凑语法；
  签 premise verified + design agree（附 KL1-KL4），完成独立反证。未修改实现文件，未代签 GLM。
  Next: GLM 核 census/门禁/测试矩阵并签字。
- 2026-08-27 Codex：完成规范、真实页面、公共组件、采用矩阵和业务 CSS 的只读审计；定位同页 60/72px
  分裂及 20 条 live 私有轨基线，创建独立横切任务卡。未修改实现文件。Evidence: 前提真值门与代码锚点。
  Next: Kimi + GLM 独立核真值并签 design；三签齐后 Codex build。

## 下一位 Agent 提示词

```text
接手任务：ED-FIELD-LAYOUT-1 编辑器字段标签列与响应式布局合同——build。
任务卡：docs/ops/tasks/ED-FIELD-LAYOUT-1-editor-field-label-layout-contract.md
当前状态：build（2026-08-27 Codex + Kimi（KL1-KL4）+ GLM（FL1-FL3）三签齐，准入 allowed）。
你的角色：Coding Owner（唯一实现者；本卡仅授权字段布局合同范围）。

先读：任务卡全文（范围/验收条件/三席签字 KL1-KL4 + FL1-FL3/Kimi 反证条款“若改 DsField 公共
props 须重开相关旧卡评估”）、editor-design-system-v1.md:194,320-327、ED-DS-3/ED-FIELD-COMMIT-1
已冻结合同边界。

必落钉（build 期完成，缺一即返工）：
- KL1 DsFieldGroup 只持轨道与 container query 降级（479/480 基于容器，非 viewport media query）；
  label/control/help/error 语义仍归 DsField。
- KL2 DsPropertyRow 60px 为唯一命名 Inspector 例外（规范/recipe/Design Lab/测试一致）；DsField
  layout="inline" 逐行 auto 退休或限制到命名无对齐场景并由门禁区分。
- KL3 adoption 真值门禁：登记 owner 必须在生产源码真实出现；census 由全生产 TSX+CSS 动态派生，
  逐项分类（主表单/Inspector 紧凑/非表单结构/死规则删除），不允许只修截图四行。
- KL4 长中文标签 96px 轨内自然换行不逐字、不按单行扩宽；整组过长整组 stacked；组件测试断言。
- FL1 census 落成可复现产物，分类轴冻结“可见 label 第一轨 + control 第二轨”（GLM 51→25 过滤
  证明必须语义分类）；3 条死规则（stamp-slot-list/canonical-command-row/script-hook-initial）
  与 .music-meta-row 动态引用疑点进首轮分类。
- FL2 boundary 补 96px token 与 480px container query 断言（当前零命中）；Inspector 桥接 60px
  收紧到 :is(.inspector,…) 作用域。
- FL3 测试矩阵：479/480/共享轨/长标签/stacked help-error placement/min-width:0；迁移页禁止
  className="field" 与 .project-field-grid 回流；入口四行 control left ≤0.5px 实测 + 旧 60/72
  双轨负例断言。

输出：聚焦测试先行 → editor 受影响包全量/typecheck 一次 → PAL 入口页 1280/900/720 与
100-200% 缩放几何验证 → build 摘要写回任务卡，转 review。未获三方 accept 前不得标 done。
```
