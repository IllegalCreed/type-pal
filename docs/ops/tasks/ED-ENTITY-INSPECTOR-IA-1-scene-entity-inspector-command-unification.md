# ED-ENTITY-INSPECTOR-IA-1 - 场景实体 Inspector、状态指令与删除入口收口

Status: draft
Phase: phase2
Capability: 场景实体作者工作台 / current AuthorCommand
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: TBD（当前 `codex/ed-pal-workspace-modes-1` 有未收口改动；三签前不得混入本卡实现）

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
| 当前二阶段 | 四种状态动作已经是 `RuntimeCommand/AuthorCommand` 叶；独立 Lifecycle UI 又遍历同一 command tree 并自建增删改命令。zone 明定为无外观，渲染跳过 zone，触发查找只读 trigger/range/pos。中央 toolbar 同时删除实体/命名落点。 | `packages/content/src/runtime-script.ts:24-44,137-144`；`packages/editor/src/ui/LifecycleCommandPanel.tsx:66-89,95-170`；`packages/editor/src/core/lifecycle-command-editor.ts:24-55`；`packages/content/src/index.ts:61-73,106-107`；`packages/reforge/src/main.ts:1001-1006,5287-5311`；`packages/editor/src/ui/App.tsx:1455-1472,2240-2276` |
| 本任务目标 | 单一 current 指令编辑器承载四种状态命令；实体 Inspector 使用“属性 / 行为 / 引用 n”；zone 无 facing；删除回到左侧所属行。 | 用户 2026-08-22 决策；`docs/phase2/editor/editor-design-system-v1.md:320-327,449-466` |

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
  - `docs/ops/tasks/ED-INSPECTOR-TABS-1-global-inspector-tabs.md`
  - `docs/ops/tasks/ED-REFERENCE-UI-1-inspector-reference-presentation.md`
  - `docs/ops/tasks/W9-entity-lifecycle-respawn.md`
  - `docs/phase2/editor/editor-design-system-v1.md:310-331,449-466`
- 不得重新引入:
  - `BaseAuthorCommand` 与 `AuthorCommand` 两套可写 UI；
  - “状态命令摘要”伪装成第二编辑器；
  - zone 的无效 facing 控件或兼容字段；
  - `<button>` 列表行内再嵌套删除 `<button>`；
  - Inspector 底部或画布工具栏重复删除入口。
- 相关测试:
  - `packages/editor/src/ui/LifecycleCommandPanel.test.tsx`
  - `packages/editor/src/ui/App.reference-navigation.test.tsx`
  - `packages/editor/src/core/entity-address-references.test.ts`
  - `packages/editor/src/core/commands.test.ts`
  - `packages/content/src/runtime-script-lifecycle.test.ts`

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

- Codex:
  - premise: verified（`reference/sdlpal/script.c:1726-1731,1794-1800`；
    `packages/content/src/runtime-script.ts:24-44`；`packages/reforge/src/main.ts:5287-5311`；
    current project zone.facing census = 0）
  - design: agree（单指令入口、“属性 / 行为 / 引用 n”、zone 无 facing、行尾删除）
- Kimi:
  - premise: pending
  - design: pending
- GLM:
  - premise: **verified（2026-08-23，本人一手读码 + 三工程 census 复算，非代理）**：
    1. **四状态命令在 current 词表**：suspendEntity/hideEntity/restoreEntity/removeEntity
       均为 RuntimeCommand 叶（runtime-script.ts:25-28，词表 :139-140）——卡文属实。
    2. **双方言实锤**：lifecycle-command-editor.ts 以 BaseAuthorCommand 为基类型自建
       编辑链（13 处引用），与 script-editor.ts 的 AuthorCommand 链并存——第二写入口
       属实；LifecycleCommandPanel 遍历同一 command tree 另建增删改。
    3. **zone.facing census 复算（本人 node，比卡文更全）**：三工程 5078 实体 / 1382
       zone / **zone 带 facing = 0**——卡文结论确认且本人扩到 demo/e2e-own 也为零；
       收紧 schema 不需要迁移，current-only 纪律下不留 upgrader 成立。
  - design: **agree（2026-08-23，附必落钉 GE1-GE3，不阻塞准入）**。单指令入口 +
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
  - 独立证据锚点: pending
  - 可证伪观察: pending
- counter / 分歧处理: 无；任一方 counter 则保持 draft/blocked，用户裁决后重签。
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

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
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 推荐取消第二指令入口；zone 朝向从 current 模型删除；删除归位列表行。
- Kimi: pending
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
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录(如适用)

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

- 2026-08-23 GLM（覆盖矩阵/validator/census/测试主审）: 审查完成，签 **premise verified
  + design agree（附 GE1-GE3）**。四命令词表/双方言/zone census=0（本人扩到三工程 5078 实体）
  全属实；GE1 钉方言消灭判定测试与四命令嵌套插入矩阵、GE2 钉 validator 负例、GE3 钉删除
  事务矩阵。未改实现，未代签 Kimi，未改准入结论。
- 2026-08-22 Codex: 完成前提核真与 draft 设计；没有修改实现。Evidence: 本卡真值矩阵、current project
  zone.facing census。Next: Kimi 独立核真并签 premise/design；不得开始实现。

## 下一位 Agent 提示词

```text
接手任务: ED-ENTITY-INSPECTOR-IA-1 场景实体 Inspector、状态指令与删除入口收口
任务卡: docs/ops/tasks/ED-ENTITY-INSPECTOR-IA-1-scene-entity-inspector-command-unification.md
当前状态: draft，Codex 已签 premise verified / design agree；build 准入仍 blocked
你的角色: Kimi，架构与 current schema/公共指令编辑边界主审，并承担独立反证审查
先读: AGENTS.md；CLAUDE.md；docs/phase2/READ-FIRST.md；docs/ops/agent-workflow.md；本任务卡；
  docs/phase2/editor/editor-design-system-v1.md:310-331,449-466；
  packages/content/src/runtime-script.ts:24-44,137-172；packages/content/src/index.ts:61-73,106-107；
  packages/editor/src/ui/App.tsx:2064-2173,2412-2628,2964-3707；
  packages/editor/src/ui/ScriptEditor.tsx；packages/editor/src/core/entity-address-references.ts；
  reference/sdlpal/script.c:1726-1731,1794-1800；packages/reforge/src/main.ts:5287-5311
已完成: 已证明生命周期四动作是同一 AuthorCommand 树的叶而非独立数据；当前 zone 无视觉且触发不读 facing；
  全 current projects 的 zone.facing census 为 0；已提出“属性 / 行为 / 引用 n”、行尾删除和单指令入口设计。
请你做: 必须直接读取一手代码，独立核对 1) ScriptEditor 从 BaseAuthorCommand 收口到 AuthorCommand 是否会制造
  双方言/公共 API 风险；2) 生命周期专用入口能否彻底删除；3) zone facing 类型/validator 收紧是否正确；
  4) scene entity/named entry 行尾删除与引用阻断/跨 session undo 是否完整。写出最强反证和可证伪观察，
  然后在任务卡签 premise verified + design agree，或签 counter 并列出必须修改项。
不要做: 不得修改实现文件，不得把任务改为 build，不得用旧兼容层或第二编辑器化解类型问题。
输出要求: 更新任务卡的 Kimi 签字、独立反证审查、主审立场和交接日志；若 agree，给出下一位 GLM 的可复制提示词；
  若 counter，明确阻塞原因和需要用户裁决的问题。
```
