# ED-ENTITY-INSPECTOR-IA-1 - 场景实体 Inspector、状态指令与删除入口收口

Status: done
Phase: phase2
Capability: 场景实体作者工作台 / current AuthorCommand
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-entity-inspector-ia-1

## 目标

场景实体只保留一个脚本指令编辑入口：暂停、隐藏、恢复、移除不再拥有独立“生命周期”页，而作为普通
`AuthorCommand` 在行为脚本中插入、编辑和排序。实体 Inspector 重组为“属性 / 行为 / 引用 n”，无外观触发区
不再显示或持久化无效朝向；实体与命名落点的删除从画布工具栏归位到左侧对应列表行，并保持引用阻断、键盘删除、
原子撤销和可达反馈。

## 范围

- 范围内:
  - current `ScriptEditor` / 指令插入器完整支持 `suspendEntity`、`hideEntity`、`restoreEntity`、
    `removeEntity`，包括嵌套分支正文和共享脚本。
  - 删除独立 `LifecycleCommandPanel`、`lifecycle-command-editor` 及只服务该第二入口的测试/CSS。
  - 场景实体 Inspector 固定为“属性 / 行为 / 引用 n”，并按本卡重新归属字段。
  - 多页实体的“当前页”是实体标题下、Tab 上方的共享上下文；切 Tab 不得各自维护不同页。
  - `zone` 不显示朝向；收紧 current 类型/校验，使 `facing` 只属于 actor/sprite 可见实体。
  - 删除实体与命名落点改为左侧相应行的尾部动作；移除中央画布工具栏中的泛化“删除选中对象”。
  - 实体引用 Tab 复用 `DsReferenceList`，与删除守卫使用同一 `EntityAddress` 引用集合。
- 范围外:
  - 不改变 Reforge 的实体暂停、隐藏、离屏恢复、永久移除运行时语义。
  - 不重做场景画布选择、拖动、触发区范围可视化或全局撤销栈。
  - 不改变地图/组合、资源页或其他对象工作台的信息架构。
- 明确不做:
  - 不保留“生命周期”兼容 Tab、第二套指令表单或旧/新命令方言双入口。
  - 不把 `setEntityState` 与生命周期命令合并；前者仍是脚本显隐/碰撞覆写，语义不同。
  - 不为未来可能的定向触发区滥用 `facing`；若以后需要扇形/方向触发，另建显式 `shape/direction` 能力。
  - 不新增旧工程 upgrader；当前工程与 fixture 直接保持 canonical 形状。

## 前提真值门

### 一句话行为 / 工程前提

所谓“生命周期”不是独立作者数据，而是同一脚本命令树中的四种叶指令；当前专页只是再次遍历和修改同一正文。
无外观 zone 的触发判定只看页触发方式、逻辑位置与半径，不读取朝向；场景画布工具栏也不是子项删除的正确作用域。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 短暂停与隐藏/离屏恢复由事件对象自己的脚本 opcode 驱动，不是独立属性编辑模型。 | `reference/sdlpal/script.c:1726-1731,1794-1800`；`reference/sdlpal/play.c:87-105` |
| 第一阶段 | 第一阶段仍在脚本解释器中执行 `0x4B/0x52`，分别写 `sVanishTime=-15` 与 `sState*=-1 + sVanishTime`。 | `packages/game/src/core/event-system.ts:241-242,4310-4326`；`docs/phase1/game-mechanics.md:1056-1152` |
| 当前二阶段 | 四种状态动作已经是 `RuntimeCommand/AuthorCommand` 叶；独立 Lifecycle UI 又遍历同一 command tree 并自建增删改命令。zone 明定为无外观，渲染跳过 zone，触发查找只读 trigger/range/pos。**静态作者字段 `zone.facing` 与脚本目标能力不是同一件事**：真实 PAL 的 `s056/e940` 是 zone，其自身脚本含 4 条 `setEntityFacing` 和 4 条 `setEntityFrame` 指向自己；Reforge runtime 会按目标实体执行朝向覆写。中央 toolbar 同时删除实体/命名落点。 | `packages/content/src/runtime-script.ts:24-44,137-144`；`projects/pal/content/scenes/s056.json`（`e940`）；`packages/reforge/src/script-host-adapter.ts:162-165`；`packages/reforge/src/main.ts:3113`；`packages/editor/src/ui/LifecycleCommandPanel.tsx:66-89,95-170`；`packages/editor/src/core/lifecycle-command-editor.ts:24-55`；`packages/content/src/index.ts:61-73,106-107`；`packages/reforge/src/main.ts:1001-1006,5287-5311`；`packages/editor/src/ui/App.tsx:1455-1472,2240-2276` |
| 本任务目标 | 单一 current 指令编辑器承载四种状态命令；实体 Inspector 使用“属性 / 行为 / 引用 n”；zone 无 facing；删除回到左侧所属行。 | 用户 2026-08-22 决策；`docs/phase2/specs/editor-design-system.md:320-327,449-466` |

当前工程 census：

```sh
find projects -path '*/content/scenes/*.json' -type f -print0 \
  | while IFS= read -r -d '' f; do
      jq -r --arg f "$f" \
        'if type == "object" then .entities[]? | select(.zone == true and has("facing")) | [$f,.id,.facing] | @tsv else empty end' \
        "$f"
    done
```

2026-08-22 输出为 0 行；因此收紧 zone 形状不需要迁移当前工程，也不允许为零真实输入保留 upgrader。

### 2026-08-23 前提纠正 / 真实 PAL 加载事故

- 上述 census 只证明持久化实体形状中没有静态 `zone.facing`，**不能证明脚本命令不得以 zone 为目标**。
- 真实 canonical PAL `scenes.s056.entities.e940` 是 zone，脚本中存在 4 条
  `setEntityFacing -> s056/e940`；Reforge runtime 和 host adapter 都会执行该命令。
- build 新增的 `collectScriptReferenceIssues` fatal 规则把两层语义错误合并，导致整个 PAL 工程加载失败：
  `scenes.s056.entities.e940...then[2].target: 触发区 "s056/e940" 不支持朝向`。
- 纠正后的契约：zone 仍不得显示或持久化**静态初始朝向字段**；新建脚本的目标选择器可继续不提供 zone，
  但现有 canonical `setEntityFacing -> zone` 必须可加载、保存和无损 round-trip。
- 该观察直接推翻原卡“持久化检查也应阻止 zone 命令目标”的前提；任务退回 `rework`，原 build/review
  签字仅保留为历史事实，不再授权 done。


#### 2026-08-23 GLM 前提纠正重签（重审 e9c96930 后）

- GLM 重签 **premise verified + design agree（纠正后契约）**：
  1. **两层语义区分成立 ✓（本人一手数据核实）**：`s056.e940` 为 `zone:true` 且**无静态
     facing 字段**，但其脚本正文确有 **4 条 `setEntityFacing -> {scene:s056,entity:e940}`**
     （本人 node 递归扫描 s056.json hooks+entities 独立计数 = 4，与卡文一致）——静态形状
     约束与脚本命令目标是两个不同语义；原 build 把它们合并为 fatal 是真实前提错误，
     PAL 全工程加载失败是被真实数据反证的事故。
  2. **修复边界精确 ✓**：e9c96930 对 script-editor.ts 是**纯删除 10 行**
     （collectScriptReferenceIssues 的 setEntityFacing→zone error 分支），零新增逻辑；
     静态禁令三层完好——content validator `zone 无朝向`（validate.ts:313）、命令层
     SetEntityFacingCommand 守卫（commands.ts:558）、ScriptEditor 新建目标选择器过滤
     （"触发区没有朝向"测试仍在）；**修复后 e940 仍无静态 facing**（本人复算
     facing=undefined）——没有为迁就命令打开静态字段。
  3. **boot 测试覆盖准确 ✓**：`pal-editor-boot.pal.test.ts` 经 loadCurrentProjectFrom +
     loadAllAuthorScenes 加载**全部 294 场景**（本人 node 复数 294 文件），按 main.tsx
     同构组装 canonical ScriptEditorState 并构造 ScriptEditSession——事故的确切复现
     路径；断言 e940 仍 zone + 4 条 facing 命令无损（测试内独立计数器与本人 node 扫描
     同构）。**这同时补上了本卡缺失的"真实 PAL 全工程编辑器启动边界"回归**。
  4. **focused 独立复跑 ✓**：boot 1/1、script-editor 20/20、content validate 81/81、
     editor typecheck 全绿（全量 138/1044 按"只跑一次"纪律采纳 Codex 记录）。
- **GLM 自我更正登记**：首轮 implementation accept 的③"zone facing 三层"把
  collectScriptReferenceIssues 的 fatal 误读为正确的守卫层——实际是**越权的第四层**
  （编辑器启动校验不应复述运行时合法的命令语义）。教训：审查"校验收紧"类改动必须
  问"这条校验会不会拒绝运行时合法的既有数据"；负例测试只证明校验存在，不证明校验
  边界正确。

### 反证与替代解释

#### 2026-08-23 Kimi 前提纠正重签（重审 e9c96930 后）

- Kimi 重签 **premise verified + design agree（纠正后契约）**：
  1. **两层语义区分成立 ✓（本人一手数据与 runtime 双路核实）**：本人 python 递归扫描
     `projects/pal/content/scenes/s056.json`——`e940` 为 `zone:true`、无静态 facing 字段，且确有
     **4 条** `setEntityFacing -> {s056/e940}`（behaviors.auto.default.flow.stages[0].body[1].then[2]、
     then[5]、body[3]、body[6]，均 facing=down）；runtime 侧 `script-host-adapter.ts:162-165` 经
     `activeEntity` 解析目标（zone 是合法实体）后调 `main.ts:3113-3116` 的 `setEntityFacing`
     （直接写 `e.facing`，对 zone 无任何拒绝）。结论：静态持久化字段与脚本命令目标是两层语义；
     原 census=0 只证明前者为空，不能推出后者非法——原卡把两层合并为 fatal 是真实前提错误。
  2. **修复边界精确 ✓**：e9c96930 对 `script-editor.ts` 为纯删除 10 行（fatal issue 分支），
     测试由负例翻转为 source-derived 命令可 dispatch/保存/读回的正例；`projects/pal` 零改动；
     静态禁令三层完好——content validator `zone 无朝向`（validate.ts，e001d567 引入、本轮未动）、
     `EntityRef` zone 分支 `facing?: never` 类型收窄未动、`UpdateEntityCommand` 命令层守卫未动、
     新建/编辑目标选择器的 zone 过滤与“触发区没有朝向”不可用理由未动。没有为迁就命令给 zone
     打开静态字段。
  3. **boot 测试边界准确 ✓**：`pal-editor-boot.pal.test.ts` 经真实 FileSource
     `loadCurrentProjectFrom` + `loadAllAuthorScenes` 加载全量场景（本人直读
     `content/scenes/index.json` 复数 = 294 且含 s056）；canonical ScriptEditorState 组装与
     `main.tsx:55-60` 同构；`ScriptEditSession` 构造经 `validateState`（script-editor.ts:852-858）
     首 issue 即 throw——正是事故的复现路径；断言 e940 仍 zone 且 4 条 facing 命令无损。
     这补上了本卡原验收矩阵缺失的“真实 PAL 全工程编辑器启动边界”。
  4. **独立复跑 ✓**：聚焦 boot 1/1 + script-editor 20/20（2.03s）；本人本轮另跑了一次完整
     editor 全量：138 files / 1044 tests 全绿（18.90s）—— Codex 的“全量已在一分钟内”记录属实，
     此前“70 分钟长跑”认知确已过时。
- **Kimi 自我更正登记**：首轮 accept 中我把 `collectScriptReferenceIssues` 的 setEntityFacing→zone
  fatal 当作正确的“validator 层”证据引用（原③），实际上它是把静态字段纪律错误复述到脚本命令
  目标的越权校验。教训与 GLM 同源：审查校验收紧改动时，负例测试只证明校验存在，不证明校验
  边界正确；必须先问“这条校验会不会拒绝 runtime 合法的既有 canonical 数据”。

### 反证与替代解释

- 最强替代解释 1：独立“生命周期”页能让作者更容易发现状态命令。反证：它仍在同一脚本正文上另建遍历、
  插入、更新、删除链，正文顺序与相邻指令上下文被拆散。发现性应由唯一指令插入面板的“实体状态”分组、搜索与
  命令说明解决，不能由第二写入口解决。
- 最强替代解释 2：zone 未来可能需要朝向。反证：当前 zone 无视觉，现有触发范围是对称切比雪夫半径，当前工程
  也没有 zone.facing。未来的定向触发应建立显式形状/方向模型，不能让当前无效字段先成为用户承诺。
- 最强替代解释 3：实体是完整对象，删除应进入中央 `DsObjectHero.actions`。反证：当前场景工作台的中央对象是
  场景画布，实体是左侧场景 outline 的子项，右侧只有 Inspector，并不存在实体中央 Hero；把实体删除塞进画布
  工具栏会让工具作用域与对象作用域混杂。若未来实体获得独立中央对象工作台，再按 DS-R.1 迁到其 Hero。
- 什么观察会推翻当前前提:
  - 找到当前 runtime/preview/validator 对 `zone.facing` 的真实消费；
  - 找到独立于脚本命令树持久化的生命周期作者数据；
  - current `ScriptEditor` 无法在不保留第二命令方言的前提下表达四种状态叶；
  - 当前场景 IA 已存在实体级中央 `DsObjectHero`，且列表行只是一处跨页面导航。
  出现任一项，任务转 `blocked`，更新前提与三方签字后再推进。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 四种命令已在 current runtime 词表，问题是编辑器仍以 `BaseAuthorCommand` 为主。
  - 原版 / 第一阶段理解: 两阶段都证明状态变化来自脚本 opcode。
  - extractor / 地图 / 数据解码: current 全工程 zone.facing census 为 0，不是迁移产物 mismatch。
  - audit / test model: 当前 UI 与代码可直接证明双入口和错误作用域，不依赖截图推断。

### 用户可见偏离

- 是否主动偏离已核真值: yes（主动移除已存在但冗余的 UI 入口，不改变运行时语义）
- `before -> after` 一句话: `属性 / 生命周期 / 行为` + 中央“删除选中对象” + zone 朝向 ->
  `属性 / 行为 / 引用 n` + 行为内唯一指令编辑 + 行尾删除 + zone 无朝向。
- 代表场景: 选中触发区 `e6`，属性页只看到触发区有效字段；到“行为”页为当前实体脚本插入“隐藏实体”；
  到“引用”页看到所有调用方。若无引用，从左侧 `e6` 行删除，状态栏提示可撤销，选择回落到场景。
- 用户裁决: 2026-08-22 用户已批准取消独立生命周期并入指令系统；Tab/zone/delete 采用本卡推荐设计，待三方签字。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 项目上线前只保留 current canonical 版本，不保留旧类型/兼容 fallback。
  - `ED-INSPECTOR-TABS-1` 已冻结唯一 `DsInspectorTabs`；本卡只更新场景实体这一项的业务分组。
  - `ED-REFERENCE-UI-1` 已冻结引用为独立 Tab/共享列表；实体引用不得继续只在删除时报错。
  - 对象/子项删除必须有明确作用域，危险动作需要确认或可撤销窗口。
- 代码锚点(`file:line`):
  - `packages/editor/src/ui/App.tsx:2064-2173,2412-2628,2964-3003,3075-3707`
  - `packages/editor/src/ui/ScriptEditor.tsx:569,626-650,1432-1455,2516-2941`
  - `packages/editor/src/core/entity-address-references.ts:1-72`
  - `packages/editor/src/core/commands.ts:449-485`
  - `packages/editor/src/core/script-editor.ts:875-913`
  - `packages/content/src/index.ts:61-73,106-107`
  - `packages/content/src/runtime-script.ts:24-44,137-172`
- 已知坑 / 审计文档:
  - `docs/ops/archive/tasks/done/ED-INSPECTOR-TABS-1-global-inspector-tabs.md`
  - `docs/ops/archive/tasks/done/ED-REFERENCE-UI-1-inspector-reference-presentation.md`
  - `docs/ops/archive/tasks/done/W9-entity-lifecycle-respawn.md`
  - `docs/phase2/specs/editor-design-system.md:310-331,449-466`
- 不得重新引入:
  - `BaseAuthorCommand` 与 `AuthorCommand` 两套可写 UI；
  - “状态命令摘要”伪装成第二编辑器；
  - zone 的无效 facing 控件或兼容字段；
  - `<button>` 列表行内再嵌套删除 `<button>`；
  - Inspector 底部或画布工具栏重复删除入口。
- 相关测试:
  - `packages/editor/src/core/author-command-edit.test.ts`
  - `packages/editor/src/core/script-editor.test.ts`
  - `packages/editor/src/ui/ScriptEditor.test.tsx`
  - `packages/editor/src/ui/App.reference-navigation.test.tsx`
  - `packages/editor/src/core/entity-address-references.test.ts`
  - `packages/editor/src/core/commands.test.ts`
  - `packages/editor/src/ui/design-system/boundary.test.ts`
  - `packages/content/src/validate.test.ts`
  - `packages/content/src/validate-runtime.test.ts`

## 验收条件

- 功能:
  - Scene entity 仅显示“属性 / 行为 / 引用 n”；标题和 Tab 固定，当前 panel 是唯一纵向滚动 owner。
  - 多页实体只维护一份当前页状态；在三个 Tab 之间切换不漂移。
  - “属性”只含实例身份/外观、位置、碰撞、初始显隐；只有 actor/sprite 可见实体显示朝向。
  - “行为”按二级 section 排列“触发与动画 / 敌对行为 / 脚本行为”；四种状态命令在通用指令搜索、插入、
    编辑、排序、复制/删除与嵌套正文中工作。
  - “引用 n”覆盖 scenes/sharedScripts/items/enemies/worlds 中指向当前实体的全部精确
    `{scene, entity}` 地址，支持跳转，数量与删除守卫同源。
  - 当前所有项目无 zone.facing；类型与校验拒绝以后写入该字段，不新增 upgrader。
  - entity 与 named entry 行尾有可键盘访问的 danger `DsIconButton`；行结构无嵌套 button。
  - 删除有引用对象时按钮禁用/说明阻断来源；无引用时行按钮和 Delete 键走同一原子命令，删除后选择回落到场景，
    状态栏以 `aria-live` 提示“已删除 …；可撤销”。
  - 中央画布 toolbar 不再显示“删除选中对象”。
- 测试:
  - content：zone facing 类型/validator 负例 + current project census。
  - editor core：四种状态命令在顶层、branch/loop/confirm/battle 分支、shared script 中可增删改并通过 current validator。
  - editor UI：三 Tab/计数/共享当前页、状态命令插入与表单、zone 不显示朝向、引用跳转。
  - 删除：实体/命名落点行按钮、hover/focus 可见、引用阻断、Delete 快捷键、undo/redo、选择恢复、无嵌套交互。
  - `pnpm --filter @type-pal/content typecheck`
  - `pnpm --filter @type-pal/content test`
  - `pnpm --filter @type-pal/editor typecheck`
  - 聚焦 Vitest 后只跑一次 `pnpm --filter @type-pal/editor test`；不重复全量长跑。
- 文档:
  - 更新 `ED-INSPECTOR-TABS-1` 的历史清单或增加 superseded 注记，避免它继续把“生命周期”写成正向基准。
  - 若 `EntityDef` 注释/作者手册涉及 zone facing，同步改为可见实体专属。
- 视觉 / 手工验证:
  - 真实工程 scene workspace，选 actor/sprite/zone 各一；宽屏、1280 三栏、Inspector 最窄宽度、150% zoom。
  - 键盘切 Tab、行删除 focus、Delete/undo、长实体 id、0/1/多引用、1/多页实体。
  - 确认中央 toolbar 无删除、zone 无朝向、引用计数与列表一致、状态栏反馈不遮挡焦点。
- E2E 用例登记: N/A（功能性编辑器界面，build 期做最小视觉验证）。

## 推进签字

### 进入 build 前:设计签字

- Codex（历史签字，2026-08-23 因真实 PAL 反证失效）:
  - premise: **invalidated**（原签字依据：`reference/sdlpal/script.c:1726-1731,1794-1800`；
    `packages/content/src/runtime-script.ts:24-44`；`packages/reforge/src/main.ts:5287-5311`；
    current project zone.facing census = 0）
  - design: **invalidated**（原设计：单指令入口、“属性 / 行为 / 引用 n”、zone 无静态 facing、行尾删除；
    其中把脚本目标能力一并禁用的推导错误）
- Kimi（2026-08-23 重审 e9c96930 后）: **premise verified + design agree（纠正后契约）+
  implementation accept**——重签依据见「2026-08-23 Kimi 前提纠正重签」节（s056/e940 一手数据
  扫描、runtime 执行链、纯删 10 行修复边界、boot 294 场景、全量 138/1044 本人复跑；含对原③
  误读的自我更正）。以下首轮签字按历史保留：
- Kimi（历史签字，2026-08-23 因真实 PAL 反证失效）:
  - premise: **invalidated**（原签字为 2026-08-23 独立直读一手代码 + 自跑 census）。已核：四种状态命令是
    `runtime-script.ts:24-44` 的 `EntityLifecycleCommand` 叶，属 `RuntimeCommand` 词表（:137-144）并有
    专用校验（:162-176）；current `AuthorCommand = RewriteAuthorDialogueTree<RuntimeCommand>`
    （`author-script.ts:37`）已含四叶，而 `ScriptEditor.tsx` 全文件 85 处钉在 `BaseAuthorCommand`——
    方言收窄是真实工作量而非猜测；`lifecycle-command-editor.ts:24-319` 确为独立第二写链（自遍历
    nestedCommandBodies/flowBodies + 自建 Insert/Update/Delete 命令类写同一正文），
    `LifecycleCommandPanel.tsx:66-170` 只汇总同一树再编辑；`App.tsx:2991` 确挂“生命周期”Tab，
    `:2266-2280` 中央 toolbar 确有泛化 danger“删除选中对象”；zone 无 facing 消费——`main.ts:5301-5319`
    findTrigger 只读 trigger/range/pos + lifecycle gates，reforge 全仓 grep zone×facing 零命中，
    `index.ts:61-107` facing 当前在 `EntityBase` 上对 zone 同样可选；本人实跑卡内 jq census：
    三工程全部 scene JSON 中 `zone==true && has(facing)` 输出 0 行。原版锚点复核
    `script.c:1726-1731`（0x4B sVanishTime=-15）、`:1794-1800`（0x52 sState*=-1 + vanishTime）。
  - design: **invalidated**（原设计：唯一 ScriptEditor 收口到 current `AuthorCommand`；Inspector“属性/行为/引用 n”与
    ED-INSPECTOR-TABS-1 / ED-REFERENCE-UI-1 冻结合同一致；facing 从 EntityBase 移入可见分支 +
    validator 负例属零迁移 schema 收紧（census=0 已实测）；行尾删除 + 引用阻断 + 跨 session 原子 undo
    方向正确。GE1-GE3 落钉可执行）
- GLM（2026-08-23 重审 e9c96930 后）: **premise verified + design agree（纠正后契约）+
  implementation accept**——重签依据见「2026-08-23 GLM 前提纠正重签」节（两层语义/
  4 条命令/修复纯删 10 行三层守卫完好/boot 294 场景四项独立核实；含对原③误读的自我
  更正）。以下首轮签字按历史保留：
- GLM（历史签字，2026-08-23 因真实 PAL 反证失效）:
  - premise: **invalidated（原签字为 2026-08-23，本人一手读码 + 三工程 census 复算，非代理）**：
    1. **四状态命令在 current 词表**：suspendEntity/hideEntity/restoreEntity/removeEntity
       均为 RuntimeCommand 叶（runtime-script.ts:25-28，词表 :139-140）——卡文属实。
    2. **双方言实锤**：lifecycle-command-editor.ts 以 BaseAuthorCommand 为基类型自建
       编辑链（13 处引用），与 script-editor.ts 的 AuthorCommand 链并存——第二写入口
       属实；LifecycleCommandPanel 遍历同一 command tree 另建增删改。
    3. **zone.facing census 复算（本人 node，比卡文更全）**：三工程 5078 实体 / 1382
       zone / **zone 带 facing = 0**——卡文结论确认且本人扩到 demo/e2e-own 也为零；
       收紧 schema 不需要迁移，current-only 纪律下不留 upgrader 成立。
  - design: **invalidated（原签字为 2026-08-23，附必落钉 GE1-GE3）**。单指令入口 +
    属性/行为/引用 n 三 Tab + zone 无 facing + 行尾删除——与 ED-INSPECTOR-TABS-1/
    REFERENCE-UI-1 冻结合同一致。
  - **必落钉 GE1-GE3：**
    - **GE1（方言消灭的判定测试）**：删除 LifecycleCommandPanel 后 boundary 加断言
      `BaseAuthorCommand` 仅存于 script-editor 内部（或全零）；四种状态命令在指令
      插入器可插入/编辑/排序（含 branch/loop/confirm 嵌套正文与共享脚本宿主）的
      用例矩阵各至少一条。
    - **GE2（zone facing 负例）**：validator 拒绝 zone.facing 的负例测试（含
      `zone:true, facing:'down'` 直接 fail）；三工程 conformance 断言 0 命中。
    - **GE3（删除事务矩阵）**：行尾删除/Delete 键/引用阻断/原子 undo-redo/选择回落
      场景各一条测试；引用 Tab 与删除守卫使用同一 EntityAddress 引用集合的断言。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi
  - 独立证据锚点: `packages/content/src/runtime-script.ts:24-44,137-176`；`packages/content/src/author-script.ts:37`；
    `packages/editor/src/ui/ScriptEditor.tsx:5,526,1303`（BaseAuthorCommand 方言）；`packages/editor/src/core/
    lifecycle-command-editor.ts:24-319`（第二写链）；`packages/editor/src/ui/App.tsx:2266-2280,2500,2991`；
    `packages/reforge/src/main.ts:5301-5319`（findTrigger 不读 facing）；`packages/content/src/index.ts:61-107`
    （EntityBase.facing 对 zone 可选）；2026-08-23 本人 jq census 输出 0 行（三工程 scenes/*.json 全量）。
  - 可证伪观察: 若 runtime/preview/validator 任一处按 zone 实体读 facing（渲染朝向、触发扇形、校验缺省），
    收紧前提即被推翻——grep 与 findTrigger 直读未见；若当前工程存在任一 zone.facing 数据，零迁移收紧即
    失效——本人 census 为 0；若四种状态命令在 AuthorCommand 树外还有独立持久化（如实体级独立字段），
    “同一命令树叶”前提失效——`runtime-script.ts` 词表与 `lifecycle-command-editor.ts` 的遍历目标证明
    它们只存在于脚本正文；若 ScriptEditor 已能无损表达四叶且第二入口无独立写路径，删除 Lifecycle 入口
    就是纯删功能——`:24-319` 的自建命令类证伪。
- counter / 分歧处理: Codex counter（2026-08-23）；真实 PAL `s056/e940` 与 primary source/runtime
  推翻“命令目标为 zone 即非法”。本轮为恢复已挂开发站点的紧急 rework；不倒填新三签，修复后重新审查。
- 缺签豁免: N/A
- build 准入结论: **historical build allowance invalidated / rework blocked for done**。旧三签只授权原方案；
  当前紧急修复已按用户现场故障指令执行，完成后必须以纠正后的契约重新 review，不得直接 done。

### 进入 done 前:审查签字

- Codex: **accept**（2026-08-23，针对 rework 提交 `e9c96930` 补签）。确认错误的
  `setEntityFacing -> zone` fatal 校验已删除，静态 `zone.facing` 禁令与新建目标过滤保持不变；
  `pal-editor-boot.pal.test.ts` 覆盖真实 PAL 全部 294 场景并锁定 `s056/e940` 的 4 条来源命令无损。
  采纳已记录的一次 editor 全量 138 files / 1044 tests、typecheck 与真实浏览器 PAL 启动证据，不重复跑门禁。
- Kimi: **accept**（2026-08-23 重审 rework 提交 e9c96930 后重签）。纠正后契约四项独立核实：
  - **两层语义 ✓**：本人 python 递归扫描 `s056.json`，e940 为 zone、无静态 facing，脚本含 4 条
    source-derived `setEntityFacing -> s056/e940`（then[2]/then[5]/body[3]/body[6]，均 down）；
    runtime 执行链 `script-host-adapter.ts:162-165` → `main.ts:3113-3116` 对 zone 无拒绝。
    静态字段纪律与脚本命令目标是两层语义，原 fatal 合并是真实前提错误。
  - **修复边界 ✓**：e9c96930 为纯删除 10 行 fatal 分支 + 负例转正例 + 新增 boot 测试；
    `projects/pal` 零改动；静态禁令（validate.ts zone 无朝向、EntityRef `facing?: never`、
    UpdateEntityCommand 守卫、插入/编辑选择器过滤）全部完好——没有给 zone 打开静态字段。
  - **boot 测试 ✓**：真实 FileSource 加载 PAL 全量 294 场景（本人复数 index.json），
    ScriptEditorState 组装与 main.tsx 同构，ScriptEditSession 构造的 validateState 首 issue 即
    throw——事故复现路径准确；断言 e940 zone + 4 命令无损。
  - **独立复跑 ✓**：聚焦 boot 1/1 + script-editor 20/20；本人本轮另跑完整 editor 全量
    138 files / 1044 tests 全绿（18.90s），Codex 的“全量约一分钟内”记录属实。
  历史 accept 记录（含原③误读）保留在下，自我更正见「2026-08-23 Kimi 前提纠正重签」节。
- Kimi（历史记录，accept 已失效）: **accept invalidated**（2026-08-23；以下审查记录作为历史保留，但其中“zone facing 多层阻断”结论已被真实 PAL 反证）。按委托六项：
  - **① 方言清零 ✓**：`lifecycle-command-editor.ts`、`LifecycleCommandPanel.tsx` 及专用测试整文件删除；
    editor src 全量 grep `BaseAuthorCommand` 仅余 `boundary.test.ts:1040` 的缺席断言（GE1 落钉成立）；
    `author-command-edit.ts`/`command-catalog.ts`/`item-references.ts` 全部改用 current `AuthorCommand`，
    无 union/cast 伪兼容（设计期关注项①）。
  - **② 四命令 canonical ✓**：目录实体组四入口（command-catalog.ts:377-414）；插入器“实体状态”分组
    （ScriptEditor.tsx:2746-2752，设计期关注项②落实）；通用 target 表单覆盖四命令（:2044-2047）；
    递归树编辑覆盖 then/else/body/onNo/onLose/onFlee/onFail 与共享脚本宿主；复制递归清 id
    （copyAuthorCommandAt）。
  - **③ zone facing 多层阻断 ✓**：类型层 `EntityRef` zone 分支 `facing?: never`（index.ts:64-68）；
    validator 层 `validate.ts:312-315` throw + `script-editor.ts:497-506` issue collector 拦截
    setEntityFacing→zone；插入层目标为 zone 时选项禁用并给原因（ScriptEditor.tsx:2661,2912-2918）；
    编辑层 `entitySupportsFacing` 过滤（:1014-1016,2064）；命令层 `UpdateEntityCommand` 对 zone+facing
    直接 throw（commands.ts:557）。四状态命令仍可作用于 zone（无 filter）。SceneSpawn.facing 等不相干
    用法未误伤（设计期关注项③）。
  - **④ 删除归位与事务 ✓**：中央 toolbar 泛化“删除选中对象”已消失（grep 零命中）；行尾 danger
    DsIconButton（App.tsx:2300-2307）；Delete/Backspace 与行尾共用同一入口且有输入控件豁免
    （:1448-1473）；`historyCoordinator.dispatch` 原子对（:1420-1423）；删除后选择回落场景 +
    aria-live“可撤销”提示 + rAF 焦点回场景行（:1424-1426,1442-1444）。
  - **⑤ 同一 authoritative snapshot ✓**：`entityReferenceState` 经
    `mergeEditorProjectionWithCurrentAuthorState(scriptState, state)` 合并 live 脚本会话（:1354-1357）；
    引用 Tab、行尾/键盘删除守卫、`DeleteEntityCommand` 构造期固化的 guardedReferences 三方同源
    （commands.ts:466-476,491-496）；自身脚本地址经 locator 过滤不再误阻断可原子删除对象。
  - **⑥ 引用路由 ✓**：六类 typed locator（entity-address-references.ts:5-16）；scene/scene-entity
    原地定位、shared-script/item/enemy 经 editorLinks 跳转、world 只读并显式说明（App.tsx:1373-1403），
    无漏计无假跳转。
  - **聚焦复跑 ✓**：卡列 7 文件 215/215 通过；content validate 双套 84/84 通过（本人本轮实跑；
    全量长跑按纪律未重复）。
  - 非阻塞观察：playback.ts 预览回退路径有一处 `as unknown as BaseRuntimeLeafCommand`，语义上是
    排除四生命周期叶后的收窄，属 reforge 运行时分层类型，非编辑器作者方言残留。
- GLM: **accept**（2026-08-23，重审 rework 提交 `e9c96930` 后重签）。独立核实
  `s056/e940` 的静态 zone 与 4 条脚本命令两层语义、纯删除 fatal 分支、真实 PAL 294 场景 boot 回归，
  focused 1+20+81 与 typecheck 全绿；详细证据见前提纠正重签及交接日志。
- GLM（历史记录，accept 已失效）: **accept invalidated（2026-08-23；真实 PAL 加载事故暴露测试矩阵缺少 canonical 工程加载；以下为历史审查记录；
  基于实现提交 e001d567，48 文件 +2778/-2250）**。按委托六项逐一验证：
  - **① 方言清零 ✓**：`lifecycle-command-editor.ts`（319 行）与
    `LifecycleCommandPanel.tsx` 及专用测试**整文件删除**（ls 零存在）；editor 生产码
    `BaseAuthorCommand` rg 复跑**零命中**——content/reforge 侧残留的 Base* 是内部
    类型/编译器 cast（scene-core/runtime-script-compiler），非编辑器写入口，符合卡文
    "editor 不再保留"边界。
  - **② 四命令 canonical 覆盖 ✓**：command-catalog 四入口（:377 suspend/:389 hide/
    :401 restore/:409 remove）；ScriptEditor.test 断言插入/编辑/禁用态
    （`[data-command-kinds="suspendEntity"]`）；author-command-edit.test 覆盖嵌套
    正文与共享脚本宿主的递归树（:27,:143-165 四命令在遍历输出中）；复制递归清 id。
  - **③ zone facing 三层 ✓**：validator 层 `zone 无朝向`（validate.ts:312-314，
    'zone' in eo && 'facing' in eo 即 throw）；命令层 SetEntityFacing apply 前守卫
    （commands.ts:557-558 同文案 fail）；插入/编辑层 ScriptEditor 目标选择器过滤
    （专项测试：facingChoice.disabled + "触发区没有朝向"，suspend 等四命令仍可选 zone）；
    validate-runtime.test 负例（:88-102）；PAL census 复跑 1382 zone / 0 facing。
  - **④ 删除归位 ✓**：实体/命名落点删除在左侧复合列表行尾（App:2224/:2300
    `删除命名落点/删除实体` label）；Delete 键与行尾动作共用同一 deleteEntity 入口
    （:1448 注释+实现）；守卫阻断（entityReferencesByTarget 非空即 return）；
    DeleteSceneEntityDefinitionCommand + DeleteEntityCommand 原子对经
    historyCoordinator（undo 对称）；删除后 setSelected(SCENE_SELECTION) +
    requestAnimationFrame 焦点回场景行。
  - **⑤ 同一 authoritative snapshot ✓（本卡的关键正确性改进）**：
    `entityReferenceState = scriptState ? mergeEditorProjectionWithCurrentAuthorState(...) : state`
    （App:1354-1356）——引用 Tab、删除守卫、DeleteEntityCommand 三者消费**同一
    merged live 态**，消除了我在 MEDIA 卡 GM1 指出的 stale shell 误判类缺陷在实体
    引用域的变体。
  - **⑥ 引用路径覆盖 ✓**：locator 联合含 scene/scene-entity/shared-script/item/
    enemy/world 六类（entity-address-references.ts:10-16）；collector 输入域
    scenes+items+enemies+sharedScripts+worlds 全枚举（:73-108 段实测）；world 类
    locator 在 UI 有明确"不可打开"降级（App:3136 canOpen 判断）而非假跳转。
  - **focused 独立复跑 ✓**：entity-address-references + author-command-edit +
    ScriptEditor 3 files/32 tests、content validate 双套 84 tests、editor typecheck
    全绿（全量长跑按纪律未重复，Codex 记录 content 422 + editor 聚焦 215 采纳）。
- counter / 返工处理: 无。
- 缺签豁免: N/A
- done 准入结论: **三方 implementation accept 已齐，待用户最终验收**；用户验收前保持 `review`，
  任何 Agent 不得自行标记 done。

## Draft: 设计与风险

### 设计结论

1. **唯一指令入口**：通用 ScriptEditor 的 public author command 类型收口到 current `AuthorCommand`。四种状态命令
   进入唯一命令 metadata、插入分类、表单和递归 command tree；删除 Lifecycle 专用 collector/command/UI，不能留 adapter
   继续写同一正文。
2. **Inspector IA**：对象标题下提供共享 page selector（仅多页时显示）；随后是 shared
   `DsInspectorTabs` 的“属性 / 行为 / 引用 n”。“行为”不是第二脚本模型，而是承载页触发、动作、敌对引擎行为、
   trigger/auto 槽和唯一脚本正文的任务分区。
3. **zone 形状**：从 `EntityBase` 移出 `facing`，只把它放在 actor/sprite 可见分支；validator 显式拒绝
   `{zone:true,facing:...}`。当前数据直接保持 canonical，不提供旧形状升级入口。
4. **删除作用域**：左侧每个 entity/named entry 用“选择按钮 + sibling 行尾动作”结构；删除按钮 selected 时常显、
   hover/focus-within 时显，布局预留固定宽度避免跳动。中央 toolbar 只保留画布模式/脚本工具。
5. **删除安全**：引用集合先算后展示；阻断态能进入“引用”Tab。成功删除走跨 session 原子历史，并以现有 valbar
   `aria-live` 提示可撤销，不为单个可撤销子项强加确认 modal。

### 已知风险

- 风险: ScriptEditor 当前广泛使用 `BaseAuthorCommand`，直接换型可能触及多个 public props 与测试。
  - 缓解: 先列出全部调用点和 command dialect；只保留 current `AuthorCommand`，同步编译门禁，不用 union/cast 伪兼容。
- 风险: 删除生命周期专用 collector 后，嵌套正文可能失去编辑能力。
  - 缓解: 将 branch/loop/confirm/startBattle/teleport 等递归路径测试迁到唯一 ScriptEditor。
- 风险: entity 引用路径只有字符串，部分来源尚无可导航 location。
  - 缓解: 在现有 exact collector 上增加 typed owner/location 投影；无法导航的真实来源仍显示路径，不得漏计。
- 风险: 列表行当前整体是 `<button>`，直接塞删除按钮会产生非法嵌套与键盘冲突。
  - 缓解: 先改为复合 row，selection 与 action 为 sibling；用 focus-within 和 shared icon-button contract 验证。
- 风险: 当前脏工作树含生命周期面板未收口改动。
  - 缓解: 三签前只提交本卡/看板；build Owner 接手前逐文件重读，不回滚用户改动。

### 主审立场

- Reviewer: Kimi（命令方言/类型边界/删除事务主审），GLM（覆盖矩阵/validator/census/测试主审）
- 结论: Kimi agree（2026-08-23）+ GLM agree（2026-08-23，GE1-GE3）；Codex 已 agree
- 必改项: 无新增；GE1-GE3 为 build 必落钉。
- Kimi build 期关注项（非门禁）: ①ScriptEditor 换型只保留 current `AuthorCommand`，不得用
  `BaseAuthorCommand | AuthorCommand` union 或 cast 伪兼容（卡内风险 1 同款，GE1 的 boundary 断言锁它）；
  ②四种状态命令的插入分类/搜索/说明文案是发现性替代品，build 时须确认指令插入器有“实体状态”分组；
  ③`EntityBase` 移出 facing 是 content 公共类型收窄，须同步检查 `SceneSpawn.inheritFacing` 等不相干
  facing 用法不被误伤；④行复合化（选择 button + sibling 行尾动作）是全列表共享结构变更，注意命名落点
  行与实体行同一合同。
- 是否建议进入 build: 是（三签已齐；按本轮用户指令保持 draft 与准入 blocked，开放决定留给用户）

### 三方争议记录(按需)

- Codex: 推荐取消第二指令入口；zone 朝向从 current 模型删除；删除归位列表行。
- Kimi: 同意。补充：第二写链的真实代价不只是双 UI，而是 `lifecycle-command-editor.ts` 自建命令类
  各自重做校验与漂移检测，删除后这些责任统一回到 ScriptEditor 的 current 命令链；zone facing 属于
  “无效字段先成为用户承诺”的典型，census=0 时收紧是零成本窗口。
- GLM: premise verified + design agree（2026-08-23，附 GE1-GE3；三工程 zone census=0 复算）
- 用户拍板: 2026-08-22 已同意生命周期并入指令系统；若审查方提出 IA/schema counter，再交用户裁决。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/content/src/index.ts`、`packages/content/src/validate.ts` 及相应 validator 测试；
  - `packages/editor/src/core/author-command-edit.ts`、`script-editor.ts`、`command-catalog.ts`、
    `entity-address-references.ts`、`commands.ts` 及相应测试；
  - `packages/editor/src/ui/App.tsx`、`ScriptEditor.tsx`、脚本 Inspector/Workspace 投影、
    `editor.css` 及相应 UI/boundary 测试；
  - 删除 `packages/editor/src/core/lifecycle-command-editor.ts`、
    `packages/editor/src/ui/LifecycleCommandPanel.tsx` 及其专用测试；
  - 同步 current command 投影的 content/reforge 调用方、设计系统任务说明与本卡/看板。
- 实现摘要:
  - 唯一 current `AuthorCommand` 编辑链完整承载暂停、隐藏、恢复、移除四种实体状态指令，支持搜索、
    插入、编辑、复制、嵌套正文与共享脚本；复制会递归清除 command id，未保留第二方言或兼容入口。
  - 场景实体 Inspector 收口为“属性 / 行为 / 引用 n”，多页实体在标题与 Tab 之间共享当前页上下文；
    行为页直接复用 canonical `ScriptEditor`，引用页复用 `DsReferenceList`。
  - current zone 类型与 validator 均拒绝静态 `facing`；本轮错误地让保存前 issue collector 也阻止
    `setEntityFacing -> zone`，已确认会拦死真实 PAL，转入 rework 修正。
  - 实体与命名落点删除归位左侧复合列表行；引用集合与删除守卫读取同一 authoritative editor
    snapshot，避免 shell/session 状态滞后；成功删除后焦点回到场景行，键盘删除、引用阻断、undo 保持闭环。
- 运行命令与结果:
  - `pnpm --filter @type-pal/content typecheck`：通过。
  - `pnpm --filter @type-pal/content test`：33 files / 422 tests 通过。
  - 各受影响 package typecheck：通过；最终再次运行 `pnpm --filter @type-pal/editor typecheck`：通过。
  - 最终聚焦回归：
    `pnpm --filter @type-pal/editor exec vitest run src/core/author-command-edit.test.ts
    src/core/script-editor.test.ts src/core/entity-address-references.test.ts src/core/commands.test.ts
    src/ui/ScriptEditor.test.tsx src/ui/App.reference-navigation.test.tsx
    src/ui/design-system/boundary.test.ts`：7 files / 215 tests 通过。
  - build 中已按约定只运行一次 editor 全量：135 files / 1025 tests 通过，另有 2 条旧 UI 文案/结构断言失败；
    两条断言已随最终 IA 修正并在上述聚焦回归中通过。
  - `git diff --check`：通过；三工程 `zone.facing` census：0。
- 浏览器 / 手工检查: 在真实 PAL 场景工作台做最小功能性检查：actor/sprite/zone Inspector 三 Tab、
  zone 无朝向、工具栏无泛化删除、左栏实体/命名落点行尾动作、引用计数与阻断入口均可达。
- 跳过的检查及原因: 此处沿用了已经过时的“全量耗时 70 分钟”判断；性能工作后当前 editor 全量已在
  一分钟内。rework 完成后直接运行一次当前全量门禁，不再以耗时为由跳过。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 本地真实 PAL 工程最小浏览器交互检查，结合 UI/boundary 自动测试。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: 本轮为交互式检查，未保留新的仓库截图产物。
- 结论: 核心 IA、删除作用域、zone 字段与唯一脚本入口均符合本卡设计，可进入独立 review。
- 未完成项: Reviewer 可按需抽查 1280 宽和 150% 缩放；不阻塞代码 review。

## Rework: 真实 PAL 启动回归修复（2026-08-23）

- 根因: `collectScriptReferenceIssues` 把静态 `zone.facing` 形状约束错误套到脚本命令目标，导致
  `ScriptEditSession` 构造真实 PAL canonical state 时以首个 issue 中止整个编辑器启动。
- 修复:
  - 删除 editor-only 的 `setEntityFacing -> zone` fatal issue；不修改 PAL 生成数据、不给 zone 增加静态
    facing 字段，也不改变 runtime/迁移语义。
  - 把错误负例改为 source-derived zone facing 命令可 dispatch、保存和读回。
  - 新增 `tests/pal-editor-boot.pal.test.ts`：真实读取 `projects/pal`、加载全部 294 个场景、按 `main.tsx`
    组装 canonical script state、建立 `ScriptEditSession`，并从 session state 断言 `s056/e940` 仍为 zone
    且 4 条 facing 命令无损保留。
- 验证:
  - 聚焦修复回归：2 files / 21 tests 通过，1.75s。
  - `pnpm --filter @type-pal/editor test`：138 files / 1044 tests 全通过，21.38s；本轮只运行一次全量。
  - `pnpm --filter @type-pal/editor typecheck`：通过。
  - 最终 canary：1 file / 1 test 通过，2.92s；`git diff --check` 通过。
  - 真实浏览器 `http://localhost:6010/`：PAL 开发基线成功进入“入口点”工作区，标题、菜单、保存状态、
    294 场景工程上下文均已加载；截图中的“触发区 s056/e940 不支持朝向”启动错误消失。
- 结论: 故障已修复且全量门禁恢复；任务仍保持 `rework`，等待 Kimi/GLM 按纠正后的前提重新签
  premise/design 与 implementation accept 后再进入 done。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 2026-08-23 用户验收细节修正: “外观 / 交互”中独占 value 行的 checkbox 统一占满属性值列；移除
  “初始显隐”仅用于 `title` 的中间 wrapper，使其与“碰撞”和输入/下拉右边缘一致；同时把
  `DsPropertyRow` 的直接子 `DsCheckbox` 纳入共享满宽合同，工具栏、列表选项和嵌套 compact checkbox
  保持内容宽。聚焦验证 `App.reference-navigation.test.tsx` + `design-system/boundary.test.ts` 共 56 项通过。
- 2026-08-23 用户验收细节修正: 普通 actor/sprite 的场景实例朝向由英文只读值改为可编辑的中文
  `DsSelect`，仍复用可撤销的 `UpdateEntityCommand`；zone 无静态朝向，继续不显示该字段。字段标题旁复用
  通用 `DsHelpTip`；用户复验后将图示进一步收成单个等距菱形与“左 / 上 / 下 / 右”四字，移除人物、
  箭头和重复副文案。聚焦验证 `App.reference-navigation.test.tsx` 与 editor typecheck 通过，并在真实 PAL
  场景 Inspector 完成最小浏览器交互与 tooltip 可视检查；未重复运行全量。
- 2026-08-23 用户验收细节修正: 单实体、批量实体及 legacy 指令表单的 `setEntityState` 统一改用共享
  中文语义选择器；规范选项为“隐藏（0）/ 显示，可通行（1）/ 显示，阻挡通行（2）”，树摘要同步显示
  中文语义。既有脚本若保存了 `3` 等非规范原值，选择器会展示并原样保留“当前原值”选项，只有用户主动
  改选时才写入规范值，避免在不改变显隐/碰撞的同时破坏精确状态条件。editor 全量 138 files / 1049 tests
  与 typecheck 通过；真实 PAL 脚本弹窗已检查三项中文选项、说明与当前值，未修改工程数据。
- 2026-08-23 用户验收细节修正: “添加指令”本身已使用共享 `DsButton`，视觉差异来自
  `.canonical-script-editor-heading span` 越界命中 `DsButton` 内部文字。摘要改用专属
  `.canonical-script-editor-summary`，不再覆盖共享按钮的字号与颜色；同链路移除空状态按钮的重复加号和
  私有皮肤，并将 ScriptTree 的“添加准备指令 / 插入第一条指令”迁至相同 `DsButton` 合同。聚焦验证
  ScriptEditor + ScriptTree + boundary 共 63 项、editor typecheck、真实 PAL 页面视觉与 computed style
  对比通过；“新建步骤 / 添加指令”均为 30px 高、12px/500 文字、6px 圆角。
- Codex 自审: counter / rework（2026-08-23）。真实 PAL `s056/e940` 证明脚本目标能力与静态 zone 字段
  不同；新增 fatal 校验使工程无法加载。
- Kimi 审查结论: 历史 accept 已失效；**2026-08-23 重审 e9c96930 后重签 premise verified +
  design agree（纠正后契约）+ implementation accept**（四项独立核实见前提纠正重签节；含对原③
  误读的自我更正；本轮另独立复跑完整 editor 全量 138/1044 全绿）。
- GLM 审查结论: 历史 accept 已按前提纠正失效；**2026-08-23 重审 e9c96930 后重签
  implementation accept**（四项独立核实见前提纠正重签节；附对原③项误读的自我更正）。
- 必须返工项: 已全部完成并复验（删 fatal、留静态禁令、补 s056/e940 回归、editor 全量与真实
  PAL 浏览器加载验证）。
- Accept / rework: Codex + Kimi + GLM 已按纠正后契约重审 accept；等待用户最终验收。

## 用户验收

- 用户结论: **accept（2026-08-23）**。用户确认推进，包含 Inspector IA、朝向帮助、中文状态选择、
  独占 checkbox 对齐和“添加指令”共享按钮样式等验收修正。
- 后续任务: 本卡完成；提交推送并合入 `main`，随后推进 `MIG-PAL-ACTOR-FACE-1`。

## 交接日志

- 2026-08-23 Codex（rework 收口）: 针对提交 `e9c96930` 补签 **implementation accept**。确认仅撤销
  错误的脚本目标 fatal 层，静态 zone 字段纪律未放宽；采纳已记录的一次 editor 全量 138/1044、
  typecheck、真实 PAL 全工程启动与 Kimi/GLM 独立复跑证据。三方 accept 已齐，任务回到 `review`，
  不重复跑测试。Next: 等待用户最终验收/收口。

- 2026-08-23 Kimi（按纠正后前提重审 rework 提交 e9c96930）: 重签 **premise verified + design agree
  （纠正后契约）+ implementation accept**。一手核实：python 递归扫描 s056.json 确认 e940 为 zone、
  无静态 facing、含 4 条 source-derived setEntityFacing（then[2]/then[5]/body[3]/body[6]）；runtime 执行链
  script-host-adapter.ts:162-165 → main.ts:3113-3116 对 zone 无拒绝——两层语义区分成立。修复为纯删
  10 行 fatal 分支，projects/pal 零改动，静态禁令三层（validator/类型/命令/选择器）完好。boot 测试经
  真实 FileSource 覆盖全 294 场景并精确复现事故路径。独立复跑：聚焦 21/21，另自跑完整 editor 全量
  138 files/1044 tests 全绿（18.90s）。登记自我更正：首轮 accept 误把越权 fatal 当正确守卫层。
  未修改实现文件，未标 done。Next: Codex 对 rework 补签 accept，用户验收后收口。

- 2026-08-23 Codex（rework）: 用户以真实 PAL 加载失败反证 `setEntityFacing -> zone` fatal 规则；确认
  `s056/e940` 有 4 条该命令且 runtime 支持。任务从 review 退回 rework，三方旧 accept 失效；将补真实
  canonical 工程回归并在修复后运行一次当前一分钟内的 editor 全量门禁。

- 2026-08-23 Kimi（implementation review）: 独立审查 e001d567 完整 diff 与现行实现，委托六项全部通过，
  签 **accept**。一手证据与逐条结论见“进入 done 前:审查签字” Kimi 段；聚焦复跑 editor 7 文件 215/215、
  content validate 双套 84/84 全绿（全量长跑按纪律未重复）。非阻塞观察一条：playback.ts 预览回退的
  BaseRuntimeLeafCommand cast 属运行时分层收窄，非作者方言残留。未修改实现文件，未标 done。
  三方 accept 已齐，任务待用户验收收口。
- 2026-08-23 Codex（Coding Owner）: build 完成并推进到 review。唯一 current AuthorCommand 入口、
  三 Tab、zone 无 facing、同源引用/删除守卫、行尾删除与焦点回落均已落地；content 422 项、editor
  最终聚焦 215 项及 typecheck 全绿。editor 全量只跑一次，最终未重复长跑。Next: Kimi/GLM 独立
  implementation review；不得在两方 accept 前标记 done。
- 2026-08-23 GLM（覆盖矩阵/validator/census/测试主审）: 审查完成，签 **premise verified
  + design agree（附 GE1-GE3）**。四命令词表/双方言/zone census=0（本人扩到三工程 5078 实体）
  全属实；GE1 钉方言消灭判定测试与四命令嵌套插入矩阵、GE2 钉 validator 负例、GE3 钉删除
  事务矩阵。未改实现，未代签 Kimi，未改准入结论。
- 2026-08-23 Kimi（命令方言/类型边界/删除事务主审）: 审查完成，签 **premise verified + design agree**。
  独立直读 runtime-script 词表与校验、author-script.ts:37 的 current AuthorCommand、ScriptEditor 的
  BaseAuthorCommand 方言（85 处）、lifecycle-command-editor 第二写链、App 生命周期 Tab 与中央 toolbar
  删除、findTrigger 触发域；自跑 jq census 三工程 zone.facing=0。恢复被前次编辑误删的“独立反证审查”
  小节头并完成独立反证。补四条 build 期关注项（禁 union/cast 伪兼容、指令插入器“实体状态”分组、
  公共类型收窄不误伤 SceneSpawn facing、行复合化同一合同）。三签已齐；按本轮用户指令保持 draft 与
  准入 blocked，开放决定留给用户。未修改实现文件。
- 2026-08-22 Codex: 完成前提核真与 draft 设计；没有修改实现。Evidence: 本卡真值矩阵、current project
  zone.facing census。Next: Kimi 独立核真并签 premise/design；不得开始实现。
- 2026-08-23 GLM（覆盖矩阵/validator/census/测试主审）: done 终审完成并签 **accept**。
  六项委托全过：方言 319+108 行整文件删零残留、四命令插入/编辑/嵌套/共享脚本矩阵、zone
  facing validator+命令+选择器三层（PAL 1382 zone/0 facing 复算）、删除行尾归位+Delete 共用
  入口+原子 undo+焦点回落、**引用 Tab/守卫/命令同源 merged live snapshot（GM1 类缺陷在实体域
  的正确解法）**、六类 locator 含 world 不可打开降级。focused 32+84+typecheck 独立复跑全绿。
  未改实现文件，未代签 Kimi。Next: Kimi accept + 用户验收后关卡。
- 2026-08-23 GLM（重审）: 按"2026-08-23 前提纠正"重审修复提交 e9c96930，重签 **premise
  verified + design agree + implementation accept**。四项独立核实：e940 静态无 facing + 脚本
  4 条 setEntityFacing（node 计数）；修复纯删 10 行、静态禁令三层完好、未开静态字段；boot
  测试经 loadAllAuthorScenes 覆盖全 294 场景且为事故确切复现路径；focused 1+20+81+typecheck
  复跑全绿。**附自我更正：原③把越权 fatal 误读为守卫层，已登记"校验收紧须验既有合法数据"
  教训**。未改实现文件，未代签 Kimi，未标 done。Next: Kimi 按纠正前提重审。

## 下一位 Agent 提示词

无下一位 Agent 提示词，等待用户最终验收/收口。

### 历史：真实 PAL 启动回归重审（已完成，保留交接事实）

```text
接手任务: ED-ENTITY-INSPECTOR-IA-1 真实 PAL 启动回归重审
任务卡: docs/ops/archive/tasks/done/ED-ENTITY-INSPECTOR-IA-1-scene-entity-inspector-command-unification.md
当前状态: rework；旧三方 premise/design/accept 已因真实 PAL 反证失效，Codex 紧急修复与验证完成
你的角色: Kimi 或 GLM；重新独立核对纠正后的前提，并审查本分支最新 rework 提交
先读: AGENTS.md；CLAUDE.md；docs/phase2/READ-FIRST.md；任务卡“2026-08-23 前提纠正”和 Rework 小节；
  projects/pal/content/scenes/s056.json 的 e940；packages/editor/src/core/script-editor.ts；
  packages/editor/tests/pal-editor-boot.pal.test.ts。
已完成: 删除错误的 editor-only `setEntityFacing -> zone` fatal 校验；保留静态 `zone.facing` 类型/validator
  禁止与新建目标选择过滤；真实 PAL 294 场景启动 canary 从 session state 锁定 e940 的 4 条命令；
  editor 全量 138 files / 1044 tests（21.38s）与 typecheck 全绿；真实 localhost 页面成功启动。
重点审查: 1) primary source、迁移器和 runtime 是否确实允许 source-derived zone facing command；
  2) 修复是否只撤销错误 fatal 层，未给 zone 增加静态 facing；3) real-PAL smoke 是否准确复刻 main 启动边界；
  4) 现有命令能无损加载/保存，而 UI 仍可不提供新建 zone-facing 目标。
不要做: 不得手改 projects/pal 删除 4 条命令；不得新增 upgrader/fallback；审查期间不得改实现文件或标记 done。
输出要求: 在任务卡按纠正后的前提重新签 `premise verified + design agree`，并签 implementation `accept`；
  或签 `counter`，给出一手证据、最小复现和返工项。另一审查方与用户验收前不得 done。
```

### 历史：交 Kimi/GLM implementation review（已完成，保留交接事实）

```text
接手任务: ED-ENTITY-INSPECTOR-IA-1 场景实体 Inspector、状态指令与删除入口收口
任务卡: docs/ops/archive/tasks/done/ED-ENTITY-INSPECTOR-IA-1-scene-entity-inspector-command-unification.md
当前状态: review；Codex build 与自审已完成，Kimi/GLM implementation accept 尚缺
你的角色: Kimi 或 GLM，按任务卡既定分工做独立实现审查
先读: AGENTS.md；CLAUDE.md；docs/phase2/READ-FIRST.md；docs/ops/agent-workflow.md；本任务卡；
  当前分支 `codex/ed-entity-inspector-ia-1` 的完整 diff。
已完成: 唯一 current AuthorCommand 编辑链、实体 Inspector 三 Tab、zone 无 facing、实体/命名落点行尾删除、
  authoritative 引用快照与删除焦点回落已经实现；content 422 项、editor 最终聚焦 215 项与 typecheck 全绿。
重点审查: 1) editor 生产代码不得残留 BaseAuthorCommand/生命周期第二写入口；2) setEntityFacing 对 zone
  在插入、编辑和持久化检查三层均被阻止，但四种状态指令仍支持 zone；3) 引用 Tab 与删除守卫同一集合，
  canonical session 已清引用时不被 stale shell 误阻断；4) entity/named-entry 行尾及 Delete 键事务、引用阻断、
  undo/focus；5) item/enemy/shared/world 引用路由与 nested command 覆盖。
验证约束: 只跑必要的聚焦测试；不要重复 editor 全量长跑。若发现 counter，给出最小复现与直接代码证据。
不要做: 未经 counter/rework 指令不要修改实现；Kimi 与 GLM 两方 accept 前不得标记 done。
输出要求: 在任务卡 Review 推进签字、Review 段和交接日志中签 `accept`，或签 `counter` 并列返工项；
  向用户返回可直接转交另一审查方的提示词。
```
