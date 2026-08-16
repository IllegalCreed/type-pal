# ED-SCENE-UX-1 - 场景画布直接操作与取消选择

Status: review
Phase: phase2
Capability: Editor scene workspace（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（交互/视觉主审）+ GLM（覆盖/测试审查）
Visual Verification Owner: Codex + User
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-scene-ux-1`

## 目标

删除场景工具栏中常驻且不对应真实互斥状态的“选择/移动”按钮，把普通画布明确为直接操作：点实体或落点选中、
拖实体或落点移动、拖空白平移；单击空白和 Esc 可取消实体/落点选择。只有新增实体期间进入临时放置态，并显示
“正在放置实体”和“取消放置”。

## 范围

- 范围内:
  - 场景工作区工具栏、放置态状态命名与 UI。
  - `SceneCanvas` 的空白单击/拖动判定、普通/悬停/拖动/放置光标。
  - Esc 在场景工作区取消放置或取消实体/落点选择。
  - App 状态接线、组件测试和最小浏览器手势复验。
- 范围外:
  - 地图编辑器的专用选择工具、框选或多选合同。
  - 场景实体移动 Command、地图碰撞、坐标换算、脚本面板行为。
  - schema/save/migration/runtime 与 capability-map 状态。
- 明确不做:
  - 不拆分“选择”和“平移”两个互斥模式。
  - 不为普通直接操作保留隐藏的 `select` 工具状态或常驻 pressed 按钮。
  - 不让空白拖动在 pointerdown 时抢先取消选择；只有未越过平移阈值的完整点击才取消。

## 前提真值门

### 一句话行为 / 工程前提

当前“选择/移动”并非独立工具：普通态已经同时承担选中、移动和平移，唯一真实的模态是短暂的实体放置态；因此
常驻 pressed 按钮表达了不存在的互斥模式，并且空白点击/Esc 缺失使实体或落点无法自然取消选中。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是二阶段作者工具的场景编排交互，原版游戏没有对应编辑器工具栏。 | `docs/phase2/READ-FIRST.md:33-35`；用户 2026-08-16 对目标交互的逐项确认 |
| 第一阶段 | N/A：第一阶段没有这套二阶段场景作者工具；不能提供“选择/移动”模式真值。 | `docs/phase2/READ-FIRST.md:33-35` |
| 当前二阶段 | 状态类型只有 `select | add`；普通 `select` 分支同时点选实体/落点、拖动它们和拖空白平移；空白 pointerup 直接返回而不清选中；Canvas 光标在普通态固定为 `grab`；App 常驻渲染 pressed“选择/移动”，没有 Esc 清选择。 | `packages/editor/src/ui/SceneCanvas.tsx:28,79,479-583,636-649`；`packages/editor/src/ui/App.tsx:411-412,1270-1302,2103-2135` |
| 本任务目标 | 普通态不是工具模式；只保留布尔式临时放置态。空白 click 清实体/落点，空白 drag 只平移；Esc 优先取消放置，否则清实体/落点；工具栏只在放置态显示状态和取消动作。 | 用户 2026-08-16 明确重申的七项交互；本卡验收条件 |

### 反证与替代解释

- 最强替代解释: 保留“选择/移动”作为回到普通态的显式出口，能让用户知道如何退出添加。
  - 反证：显式出口应是仅在放置期间出现的“取消放置”；普通态常驻 pressed 按钮错误暗示它与平移或脚本存在
    工具互斥。`tool === 'select'` 的全仓消费只在 App/SceneCanvas，不承担其他业务合同。
- 什么观察会推翻当前前提:
  - 若全仓存在第三个消费者把 `select` 作为命令模式、或空白拖动无法用现有 3px 阈值与 click 稳定区分，需停线
    重新设计；当前 `rg` 只发现 App/SceneCanvas，现有 `panDragRef.moved` 已直接提供可证伪的 click/drag 区分。
  - 若脚本面板打开时仍存在可交互画布，则 Esc owner 需要重新分域；当前 `!drawer.open ? <SceneCanvas> : ...` 证明
    两者互斥渲染。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: N/A；不改 runtime 或移动 Command。
  - 原版 / 第一阶段理解: N/A；无对应作者工具。
  - extractor / 地图 / 数据解码: N/A；问题完全位于 UI 状态与 pointer/keyboard 接线。
  - audit / test model: 代码直接证明伪模式和缺失取消路径；浏览器只负责复验真实手势，不作为根因唯一证据。

### 用户可见偏离

- 是否主动偏离已核真值: yes（纠正现有二阶段作者工具行为）
- `before -> after` 一句话: `常驻 pressed“选择/移动” + 空白/Esc 不清选择 -> 无普通工具模式 + click/Esc 可取消 + 仅放置时显示取消`
- 代表场景: 先点选一个实体；单击空白后 Inspector 与高亮回到场景级，拖空白 20px 只平移且保持选中；点击
  “添加实体”后工具栏显示“正在放置实体 / 取消放置”，Esc 或按钮退出且不新增实体。
- 用户裁决: 2026-08-16 用户明确要求把此前已给出的这套改法实际落地。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md:33-35`：全新作者 UI 无一阶段对应时由用户定形；本次用户已逐项定形。
  - `AGENTS.md`：跨会话用户可见行为修正必须开卡、过前提真值门和三方签字。
  - `docs/phase2/editor/editor-design.md:124-132`：地图内容选择工具是另一套专用多选合同，不得把它混入场景画布。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/SceneCanvas.tsx:28,79,479-583,636-649`：现有伪工具类型、pointer 分支与固定光标。
  - `packages/editor/src/ui/App.tsx:411-412,1270-1302,1331-1361,1986-1997,2103-2183,2253-2271`：状态 owner、键盘、放置完成、入口、工具栏、Canvas/Inspector 接线。
  - `packages/editor/src/ui/App.reference-navigation.test.tsx:434-469`：已有“实体分组新增后进入放置 Inspector”测试，可扩展工具栏/Esc 接线。
- 已知坑 / 审计文档:
  - 当前工作区 `App.tsx` 与 `editor.css` 有 ED-DS-2 等未提交改动；实现必须在现有 worktree 上做最小补丁，
    不回退或覆盖用户其他改动。
  - `PAN_DRAG_THRESHOLD_PX = 3` 已是 click/drag 分界；清选择必须放在 pointerup 且读取 `moved`。
- 不得重新引入:
  - “选择”和“平移”两个互斥场景模式、常驻伪 pressed 状态、空白 pointerdown 即清选择。
  - 脚本面板与画布工具共用 mode 状态。
  - 为这项 UI 修正新增 schema、持久化偏好或旧版本 fallback。
- 相关测试:
  - `packages/editor/src/ui/App.reference-navigation.test.tsx`
  - 新增 `packages/editor/src/ui/SceneCanvas.test.tsx` 或等价的 pointer click/drag 契约测试。

## 验收条件

- 功能:
  - 常态工具栏不再出现“选择/移动”；“脚本”仍是独立面板开关。
  - 实体/落点点击与拖动行为保持；空白单击取消选中，越过阈值的空白拖动只平移、不取消。
  - Esc 在放置态只取消放置；普通态只取消实体/默认落点/命名落点选择；输入场景脚本时不抢快捷键。
  - 放置态只临时显示“正在放置实体”和“取消放置”，成功放置后自动退出。
  - 光标：放置 `crosshair`、空白 `grab`、空白拖动 `grabbing`、实体/落点 hover/drag `move`。
- 测试:
  - App 级测试覆盖无伪按钮、放置状态/按钮、取消按钮、Esc 优先级和 Canvas 清选择接线。
  - SceneCanvas 级测试覆盖空白 click 与空白 drag 分流，并断言选择回调次数。
  - `pnpm --filter @type-pal/editor typecheck` 和相关 Vitest 通过。
- 文档:
  - 任务卡写入实现、自测与浏览器证据；本任务不改 capability-map。
- 视觉 / 手工验证:
  - 本地 6010 场景工作区最小复验常态、放置态、按钮/状态文字和四类 cursor；实体点击/拖动、空白点击/拖动、Esc。
- E2E 用例登记: N/A；这是功能性作者界面，开发期做最小验证，不属于剧情/演出集中 E2E。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-16）**。直接证据：`SceneCanvas.tsx:28,479-583,636-649` 与
    `App.tsx:411-412,1270-1302,2103-2135`；当前只有 `select/add`，普通分支已同时处理三种直接操作，
    空白 pointerup/键盘均无清选择路径。
  - design: **agree（2026-08-16）**。将 `Tool` 收敛为 `placingEntity: boolean`，由 App 独占状态；Canvas 通过
    `onClearSelection` 上报空白 click，App 统一把实体/落点恢复为 `SCENE_SELECTION`；Esc 与临时 UI 同一取消函数。
- Kimi:
  - premise: **verified（2026-08-16，本人一手读码，非复述）**。独立证据：
    - `SceneCanvas.tsx:28` `Tool = 'select' | 'add'`；普通 select 分支确实同时承担点选实体/落点
      （:487-521)、拖动它们（:556-564,577-581）与空白平移（:522-537)——伪互斥成立。
    - 空白 pointerup 直接 return 不清选中（:566-570)；光标固定 `grab`/crosshair（:647)；
      `PAN_DRAG_THRESHOLD_PX = 3` + `panDragRef.moved`(:26,544-547）已提供可靠 click/drag 分界。
    - `App.tsx:412` 唯一 tool state;`:2104-2113` 常驻 `aria-pressed`「选择/移动」按钮属实;
      键盘 handler(:1270-1302）有 Delete/undo/布局快捷键、**无 Esc**。
    - `Tool` 全仓消费域本人 grep 穷尽：仅 App(:163,412,2107,2134,2151,2253-2254)+ SceneCanvas
      (:79,111,481,573,647);MapMode 的 `MapTool` 是独立类型（MapMode.tsx:173,352)，不构成本卡
      第三消费域；`App.reference-navigation.test.tsx:38-39` 仅 mock 整个 SceneCanvas，不受 props
      收敛影响。
    - 脚本面板与画布互斥渲染：`!drawer.open ? <SceneCanvas> : …`(App.tsx:2137),Esc 分域前提成立。
  - design: **agree（2026-08-16，附必落钉 SK1，不阻塞准入）**。`placingEntity` 布尔收敛、
    `onClearSelection` 空白 click 上报（pointerup + `moved===false`)、Esc 优先级、临时 role=status +
    取消放置、四态 cursor，均与现有 pointer/keyboard 结构兼容；`addAt` 现行 `setTool('select')`
    (:1356）自然映射为放置成功自动退出。SK1 见下方独立反证审查。
- GLM:
  - premise: **verified（2026-08-16，本人一手读码，非复述）**。真值矩阵全部锚点独立复核属实：
    `Tool='select'|'add'`(:28)、select 分支三合一(:481-581)、空白 pointerup 不清选择(:566-570
    panDrag return + `!d?.target return`)、固定 cursor(:647 二态)、App :412 唯一 tool state、
    :2104-2113 常驻 aria-pressed 按钮、键盘 handler 无 Esc（:1270-1302 仅 Delete/undo）、
    脚本面板互斥渲染(:2137)。**Tool 消费域本人独立穷尽**：SceneCanvas 4 处 + App 13 处
    （1 声明 + 11 恢复 + 1 进入），MapMode `MapTool` 同名不同型(:173,:352)；reference-navigation
    整组件 mock(:38-39) 不受 props 收敛影响。SceneCanvas.test **不存在**，须新建（与卡文一致）。
  - design: **agree（2026-08-16，附必落钉 G1-G3，非阻塞准入）**。placingEntity 布尔收敛 +
    onClearSelection（pointerup + moved===false）+ Esc 优先级 + 临时状态/取消 + 四态 cursor——
    与现有 pointer/keyboard 结构完全兼容，验收条件全部可执行。G1 十一处恢复点分类测试、
    G2 放置态与脚本面板共存语义显式化、G3 mock 更新检查。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-16）
  - 独立证据锚点: 上方 Kimi premise 全部 file:line 均为本人本次会话打开核实；`Tool` 消费域用 grep
    穷尽（含 MapMode 独立类型排除与测试 mock 排除）。
  - 可证伪观察:
    1. 若 rg 发现 `Tool`/`'select'` 的第三个业务消费域（本次穷尽 grep 只命中 App/SceneCanvas;
       MapMode MapTool 同名不同型），收敛方案停线重估。
    2. 若 3px 阈值在真实触控板/高倍 zoom 下把慢速短拖误判为 click（阈值是屏幕 px 常量，不随 zoom
       缩放——DS-L.1 要求 CSS px 语义，现行实现一致），浏览器手势复验会抓住；届时只调阈值，不改
       click/drag 分流结构。
    3. 若 DsMenu/Dialog 的 Esc 内部处理未 preventDefault，App 级 Esc 会在关菜单的同一次按键顺带
       清选择——SK1 要求以 `!e.defaultPrevented` 为前提；若实测菜单 Esc 已阻断则该风险不成立。

#### GLM 独立覆盖审查（2026-08-16，本人一手读码；非代理）

**premise verified — 真值矩阵锚点逐项独立复核：**

| 卡文声称 | 本人实测 | 核对 |
|---|---|---|
| `Tool = 'select' \| 'add'` | `SceneCanvas.tsx:28` | ✓ |
| select 分支三合一（点选/拖动/平移） | :481-521 点选（anchor/entity 命中）、:556-581 拖动、:540-560 panDrag 平移——均在 select 路径 | ✓ |
| 空白 pointerup 直接 return 不清选择 | :566-570 panDrag 分支 return + `if (!d?.target) return`——无任何清选择调用 | ✓ |
| 固定 cursor | :647 `tool === 'add' ? 'crosshair' : 'grab'`——仅二态,无 grabbing/move | ✓ |
| App 常驻 aria-pressed 按钮 | :2104-2113 `aria-pressed={tool === 'select'}` + `onClick={() => setTool('select')}` + "↖ 选择/移动" | ✓ |
| 键盘无 Esc | :1270-1302 handler 仅 Delete/Backspace(:1278)与 ⌘Z undo/redo(:1290) | ✓ |
| 脚本面板互斥渲染 | :2137 `!drawer.open ? <SceneCanvas> : …` | ✓ |
| Tool 消费域穷尽 | SceneCanvas :28,:481,:573,:647 + App :412 声明、:1996 进入('add')、:2108 伪按钮、**11 处恢复**(:468,:534,:599,:632,:685,:732,:767,:808,:962,:1356 + :2108)；MapMode MapTool(:173,:352) 同名不同型 | ✓ |
| SceneCanvas.test 不存在 | ls 零命中——须新建 | ✓ |

**G1 — 11 处 setTool 恢复点分类改造面（build 必落测试矩阵）：**

| 恢复路径 | 现状锚点 | 收敛后 |
|---|---|---|
| 切换放置场景 | :468 switchPlaceScene | setPlacingEntity(false) |
| 外部定位/引用跳转（8 处） | :534,:599,:632,:685,:732,:767,:808,:962（selection/locator 系列） | 同上 |
| 放置成功 | :1356 addAt 完成后 | 同上（自动退出） |
| 伪按钮删除 | :2108 | **删除该按钮**（唯一进入点 :1996 保留） |

每类至少一条恢复测试；:1996 是唯一 `setTool('add')` 进入点——收敛后 `setPlacingEntity(true)`
单入口单语义，测试断言进入/退出对称。

**G2 — 放置态与脚本面板共存语义（设计未明确,build 前写入卡）：**
现状 `toggleScriptPanel`(:1069-1072) **不复位 tool**——用户在放置态点"脚本"，画布卸载，
`tool='add'` 残留；关闭脚本面板后仍在放置态。收敛后 placingEntity 同样残留。这是有意的
"回来继续放置"还是应复位，设计结论节未列。**两种都可接受，但必须显式选择并写入卡 + 测试钉住**，
防止成为隐性差异（例如外部定位跳转清了 placing 而脚本面板不清,行为不一致）。

**G3 — mock 更新检查：**
`App.reference-navigation.test.tsx:38-39` `vi.mock('./SceneCanvas.js', () => ({ SceneCanvas: () => <div/> }))`
整组件替换——props 收敛**不影响该 mock**（Kimi 已核,本人确认 mock 不读 props）。但若新
SceneCanvas.test 直接渲染真组件,须用新 props（placingEntity/onClearSelection）而非旧 tool；
build 时检查是否有其他文件断言 `data-testid="scene-canvas"` 的 props 传递。

**测试矩阵确认（验收条件可执行性）：**
- **click/drag 分流**：pointerup + `moved===false` → onClearSelection 恰 1 次；越 3px 阈值拖动 →
  0 次 + 平移 + 选中保持。`panDragRef.moved`(:544-547 阈值判定)直接可测。
- **Esc 优先级**：放置 > 实体/落点清选 > 无动作;SK1 `!e.defaultPrevented` 防护 + "菜单开时 Esc
  不清选择"契约测试；输入场景不清（handler 现有 `typing` 判定可复用,:1273）。
- **cursor 四态**：`style.cursor` 属性可在 jsdom 直接断言（crosshair/grab/grabbing/move）——
  不需要浏览器即可契约测试;浏览器复验仅做真实手势兜底。
- **回归面**：无伪按钮、放置状态/取消按钮仅在 placing 时出现、删除按钮放置时禁用、脚本按钮由
  drawer.open 独立、添加实体入口保留——全部在验收条件且可 DOM 断言。

**可证伪观察：**
① 若 11 处恢复点改造后任一遗漏（placing 残留导致画布回不到普通态）,G1 分类测试拦截。
② 若 placing 态经脚本面板往返后行为与外部定位路径不一致,G2 语义钉拦截。
③ 若 3px 阈值在高倍 zoom 下误判（阈值是屏幕 px,不随 zoom 缩放——与 DS-L.1 CSS px 语义一致）,
  浏览器手势复验抓;届时只调阈值不改分流结构（Kimi 已列）。

Evidence: SceneCanvas.tsx:26-28,481-521,540-581,636-649 / App.tsx:412,468,534,599,632,685,732,767,
808,962,1069-1072,1270-1302,1356,1996,2104-2113,2137 / MapMode.tsx:173,352 /
App.reference-navigation.test.tsx:38-39,434-469 / ls SceneCanvas*.test 零命中。只读审查,未改实现文件,
未代签 Kimi,未标 build/done。

#### Kimi 独立反证审查补充：必落钉与交互边界判断（2026-08-16）

- **SK1（Esc 与浮层共存的防护，build 必落）**：App 级 Esc handler 除「画布可见（`!drawer.open`)+
  非 typing」外，必须以 `!e.defaultPrevented` 为前提——菜单（DsMenu）、PlacePalette 内控件、
  未来 drawer 各自消费 Esc 时，App 不得在同一次按键里再清选择。放置态 Esc 取消放置的优先级最高，
  但也同样受 defaultPrevented 防护（放置期间若菜单开着，先关菜单）。契约测试补一条：菜单打开时
  按 Esc，选择不被清除。
- **交互边界判断（均同意设计）**：
  - click/drag 分流放 pointerup 读 `moved` 是唯一正确时点；pointerdown 抢清选择会破坏拖动保持选中，
    卡文「明确不做」第 3 条方向正确。
  - cursor 四态由放置态 + pointer capture + 命中结果派生，不引入业务状态——正确；panDrag 期间
    `grabbing`、实体/落点 hover/drag `move` 的复位必须挂 pointerup/cancel/leave（卡文风险节已含，
    浏览器复验兜底）。
  - 实体/落点拖动现行无阈值（SceneCanvas.tsx:556-559 任意 move 即 moved=true，可能抖动产生 no-op
    MoveEntityCommand）——既有行为，本卡不改，仅登记观察。
  - 删除「选择/移动」按钮后，键盘用户仍经左树/大纲点选实体，无可达性回退。
- **主审立场**：建议进入 build（待 GLM 签字）。必改项仅 SK1，属实现期防护，不改变设计形态。
- counter / 分歧处理: 任一审查方发现 select 有未列消费域、Esc 与其他场景编辑合同冲突或 pointer click/drag
  无法可靠区分，任务保持 draft 并回写证据；不边改边猜。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-16）——Codex + Kimi（SK1）+ GLM（G1-G3）三方 premise
  verified + design agree 齐；各钉为 build 必落。由 Codex 转 build。**

### 进入 done 前:审查签字

- Codex: **accept（2026-08-17，实现提交 `20dcf96f`）**。本人逐项自审 SK1 + G1-G3：App 只保留
  `placingEntity` 布尔态，伪 `Tool` / 常驻“选择/移动”零残留；11 类恢复点均收敛；Esc 先检查
  `defaultPrevented`，放置优先于选择清空，脚本面板打开时不抢；G2 采用“打开脚本即取消放置”。
  `SceneCanvas` 仅在空白 pointerup 且 `moved=false` 清选择，超过 3px 的平移保持选择；cursor 由放置/
  pointer/命中派生。专项 2 files / 10 tests、全量 125 files / 930 tests 与 typecheck 全绿；6010 实机
  常态/放置态、click/drag、Esc、脚本切换与三种静态 cursor 通过，console warning/error 0。
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- App 不再维护 `'select' | 'add'` 伪工具枚举，只维护 `placingEntity` 临时布尔态；切场景、外部定位、成功放置、
  取消按钮和 Esc 都回到 `false`。
- `SceneCanvas` 接收 `placingEntity` 和 `onClearSelection`。空白 pointerdown 仍建立 pan candidate；pointerup 时仅当
  `moved === false` 调 `onClearSelection`，从而不改变拖动平移的选中。
- Canvas 根据放置态、pointer capture、命中结果更新 cursor，不为 hover 引入业务状态或持久化。
- App 的场景级 keydown 先处理 Esc：画布可见时，放置态优先取消放置，否则仅当选择为实体/落点时清除；随后才是
  Delete、undo/redo 与布局快捷键。脚本面板互斥渲染时不处理本次 Canvas Esc。
- 工具栏移除“选择/移动”。放置期间插入 `role=status` 提示与“取消放置”按钮；删除按钮在放置时禁用；脚本按钮
  仍由 `drawer.open` 独立控制。
- G2 裁决（2026-08-17）：打开脚本面板时取消放置。理由是脚本面板会互斥卸载画布，继续保留隐藏的放置模态
  会让用户关闭脚本后意外回到放置态；这与切场景、外部定位和成功放置都会回到普通态的规则保持一致。关闭脚本
  面板不进入放置态，测试钉住“放置中打开脚本 -> `placingEntity=false`”。

### 已知风险

- 风险: 现有 App 大文件有并行未提交改动，机械全局替换可能覆盖别的工作或把非场景语义混在一起。
- 缓解: 只用小块 `apply_patch`，修改前后对相关 hunk 做 diff；不格式化整个 App/CSS。
- 风险: pointermove cursor 状态在 capture/离开边界时残留。
- 缓解: pointerdown/up/cancel/leave 都明确复位，并用浏览器检查 capture 后状态。
- 风险: Esc 在 Inspector 输入中与原生控件行为冲突。
- 缓解: 只在画布工作区可见时接管；放置态 Esc 即使焦点在 PlacePalette 也取消，普通态的输入控件不清选择。

### 主审立场

- Reviewer: Kimi（交互/视觉）
- 结论: premise verified + design agree（2026-08-16，附必落钉 SK1：App 级 Esc 须以
  `!e.defaultPrevented` 防护浮层已消费的情形，并补「菜单打开时 Esc 不清选择」契约测试）
- 必改项: SK1（实现期防护，不改设计形态）
- 是否建议进入 build: 是——待 GLM 覆盖/测试签字后准入条件满足

### 三方争议记录(按需)

- Codex: 无争议；用户已明确目标交互。
- Kimi: pending
- GLM: pending
- 用户拍板: 2026-08-16 已拍板目标形态；尚未批准缺签豁免。

## 额度 / 代班记录(如适用)

N/A；看板记录 Kimi、GLM 当前可用。

## Build: 实现与自测

- Coding Owner: Codex（三签齐，2026-08-17 进入 build）
- 修改文件:
  - `packages/editor/src/ui/App.tsx`
  - `packages/editor/src/ui/SceneCanvas.tsx`
  - `packages/editor/src/ui/App.reference-navigation.test.tsx`
  - `packages/editor/src/ui/SceneCanvas.test.tsx`（新增）
  - `packages/editor/src/ui/editor.css`
- 实现摘要:
  - 删除场景 `Tool = 'select' | 'add'` 与常驻“选择/移动”按钮；App 改为唯一临时布尔态
    `placingEntity`，全部切场景、外部定位、放置成功、取消、Esc 与脚本打开路径统一恢复 `false`。
  - 工具栏常态只保留删除/脚本与直接操作提示；放置态显示单一 `role=status`“正在放置实体”及
    “取消放置”，删除按钮和 Delete 快捷键均禁用，成功放置自动退出。
  - Esc 以 `!defaultPrevented` 为总前提；放置态优先取消，普通态清实体/默认落点/命名落点，输入控件
    和脚本面板不抢。DsMenu 实际打开后消费 Esc 的测试证明选择保持。
  - `SceneCanvas` 新增 `onClearSelection`；空白 pointerdown 只建 pan candidate，pointerup 仅在未越过
    3px 阈值时清选择。cursor 为 `crosshair / grab / grabbing / move`，并在 up/cancel/leave/模态切换复位。
- 运行命令:
  - `pnpm --filter @type-pal/editor typecheck`：PASS。
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/SceneCanvas.test.tsx src/ui/App.reference-navigation.test.tsx`：
    2 files / 10 tests PASS。
  - `pnpm --filter @type-pal/editor check`：125 files / 930 tests PASS（含 typecheck）。
  - `pnpm exec biome format <5 个修改文件>`：PASS；未写入额外格式化变化。
- 浏览器 / 手工检查: localhost:6010 实机完成；详情见视觉验证记录。
- 跳过的检查及原因: 全仓 Biome lint 非本卡门禁，且 `App.tsx` / `editor.css` 存在 main 既有 baseline
  （conditional hook、历史 `!important` 等）；本卡修改文件的 formatter 检查通过，新增/修改逻辑由
  typecheck、专项和 editor 全量测试闭环。

## 资源生成记录(如适用)

N/A；不涉及资源生成。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + User
- Visual Verification Timing: dev-functional
- 验证方式: Codex in-app Chromium，复用 localhost:6010 当前工程 `pal`，场景工作区 `s000`；真实点击、
  拖动、键盘 Esc、脚本面板切换，并读取 canvas inline cursor 与 console。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: 本轮浏览器内检查常态与放置态截图；未持久化仓库文件（功能验证不需新增资产）。
- 结论: PASS。常态无“选择/移动”，工具栏只显示删除/脚本与直接操作提示；放置态状态文字、取消按钮、
  禁用删除与右侧 PlacePalette 层级清晰。实测 `crosshair`（放置）、`move`（落点 hover）、`grab`（空白）；
  空白 drag 后仍选中默认落点，空白 click 回场景级；Esc 分别清落点和取消放置；打开脚本后放置状态清空且
  Canvas 卸载，关闭脚本不复活；console warning/error 0。`grabbing` 的 pointerdown/drag/cancel 状态由
  `SceneCanvas.test.tsx` DOM 契约覆盖，真实空白拖动手势已通过。
- 未完成项: 用户实机验收与 Kimi/GLM done 前独立审查。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自审 accept；等待 Kimi + GLM 独立审查。
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-16 Codex: 根据用户指出的未落地问题重读 App/SceneCanvas 一手实现，确认伪模式、空白不清选中、
  Esc 缺失和固定 cursor 均仍存在；建立完整任务卡并给出最小实现/测试设计。Evidence: 本卡真值矩阵与代码锚点。
  Next: Kimi/GLM build 前独立签字；签字未齐不得改实现。
- 2026-08-16 Kimi: 一手读码 + 穷尽 grep 完成独立反证：Tool 消费域仅 App/SceneCanvas（MapMode MapTool
  同名不同型，测试仅整组件 mock）；伪 pressed、空白 pointerup 不清选择、无 Esc、固定 cursor 逐项属实；
  3px 阈值 + panDragRef.moved 可稳定分流 click/drag。签 premise verified + design agree，附必落钉
  SK1（Esc 须 `!e.defaultPrevented` 防护 + 菜单开时 Esc 不清选择的契约测试）。建议进入 build。
  未改实现文件，未代签 GLM。Next: GLM 覆盖/测试签字。


- 2026-08-16 GLM: 覆盖/测试审查签 premise verified + design agree（G1-G3）。真值矩阵锚点全部独立
  复核;Tool 消费域独立穷尽（SceneCanvas 4 + App 13）;G1 列 11 处恢复点分类改造面与测试矩阵;
  G2 发现 placing 态与脚本面板共存语义未定义（现状 toggleScriptPanel 不复位 tool）——build 前须
  显式裁决并钉测试;G3 mock 更新检查。SceneCanvas.test 须新建,cursor 四态可 jsdom 契约断言。
  三方签字齐,build allowed。Next: Codex 按 SK1+G1-G3 进 build。

- 2026-08-17 Codex: 接手前复核三方 premise/design 签字与 build 准入，结论仍为 allowed；任务由
  `draft` 转 `build`，分支为 `codex/ed-scene-ux-1`。G2 裁决为“打开脚本面板即取消放置”，避免画布
  卸载后隐藏保留模态，并与切场景/外部定位的恢复规则一致。Next: Codex 作为唯一 Coding Owner 落实
  SK1 + G1-G3、测试和最小浏览器验证。
- 2026-08-17 Codex: build 完成并转 `review`，实现提交 `20dcf96f`。伪 Tool/按钮退役，布尔放置态、
  空白 click/drag 分流、Esc/defaultPrevented、G2、四态 cursor 与五类恢复测试全部落地。专项 10 tests、
  editor 全量 125 files / 930 tests 和 typecheck 全绿；6010 实机常态/放置态/click/drag/Esc/脚本与
  console 通过。Next: Kimi 交互/视觉审查签 accept 或 counter；随后 GLM 覆盖/测试终审。审查者不得
  修改实现文件或标 done。

## 下一位 Agent 提示词

### 给 Kimi（已完成）

Kimi 已于 2026-08-16 完成 build 前独立反证并签字（premise verified + design agree，附 SK1），
本节提示词不再适用。

### 给 GLM（build 前覆盖 / 测试审查——已完成）

GLM 已于 2026-08-16 完成 build 前审查并签字（premise verified + design agree，附 G1-G3），
本节旧提示词不再适用。

### 给 Codex（build——已完成）

Codex 已于 2026-08-17 完成 build、自测和实机验证，实现提交 `20dcf96f`，任务已转 `review`。

### 给 Kimi（done 前交互 / 视觉审查，可直接复制）

```text
接手任务: ED-SCENE-UX-1 done 前交互/视觉审查
任务卡: docs/ops/tasks/ED-SCENE-UX-1-scene-canvas-direct-manipulation.md
当前状态: review；实现提交 20dcf96f；Codex 自审 accept，Kimi/GLM done accept 待签
分支: codex/ed-scene-ux-1
你的职责: 一手读码 + 最小 6010 实机复核 Kimi SK1 和用户可见交互：
  1) App/SceneCanvas 是否彻底没有场景伪 Tool 与常驻“选择/移动”，MapMode 专用工具不在本卡范围；
  2) 空白 click 清选择、超过 3px 的空白 drag 保持选择；实体/落点 click/drag 行为不变；
  3) Esc 是否以 defaultPrevented 为前提，放置优先、普通选择其次，输入/菜单/脚本不被误伤；
  4) 放置状态/取消按钮/删除禁用/成功退出/G2 打开脚本取消放置是否一致；
  5) crosshair/grab/grabbing/move 与 toolbar/PlacePalette 的视觉层级是否自然。
已有证据: typecheck；专项 2 files/10 tests；全量 125 files/930 tests；6010 常态/放置态、真实 click/drag、
Esc、脚本切换通过，console 0。请在任务卡写一手证据 + accept，或 counter/返工项；只允许更新审查记录，
不得修改实现文件、不得标 done。Kimi accept 后交 GLM 覆盖/测试终审。
```

### 给 GLM（done 前覆盖 / 测试终审；Kimi accept 后使用，可直接复制）

```text
接手任务: ED-SCENE-UX-1 done 前覆盖/测试终审
任务卡: docs/ops/tasks/ED-SCENE-UX-1-scene-canvas-direct-manipulation.md
当前状态: review；实现提交 20dcf96f；先确认 Kimi done 前 accept 已落卡
分支: codex/ed-scene-ux-1
你的职责: 一手读码并独立复跑，逐项核验 GLM G1-G3：
  1) 原 11 类恢复路径是否全部收敛到 setPlacingEntity(false)，唯一进入点为添加实体；
  2) G2“打开脚本取消放置”是否有真实测试且关闭脚本不复活；G3 mock props 已更新；
  3) SceneCanvas.test 是否直接钉空白 click=1 次、drag=0 次及四态 cursor；
  4) App 测试是否覆盖伪按钮缺席、按钮/成功放置/Delete 禁用、Esc 两级、actual DsMenu、输入、
     defaultPrevented、外部定位、切场景与脚本面板；
  5) schema/save/runtime/MapMode/capability-map 是否零越界。
已有证据: typecheck；专项 2 files/10 tests；全量 125 files/930 tests；formatter 通过；6010 实机通过。
请在任务卡写一手证据 + accept，或 counter/返工项；只允许更新审查记录，不得修改实现文件、不得标 done。
三方 accept 齐后交用户验收。
```
