# ED-ENTITY-INSPECTOR-IA-1 - 场景实体 Inspector、状态指令与删除入口收口

Status: review
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

- Codex:
  - premise: verified（`reference/sdlpal/script.c:1726-1731,1794-1800`；
    `packages/content/src/runtime-script.ts:24-44`；`packages/reforge/src/main.ts:5287-5311`；
    current project zone.facing census = 0）
  - design: agree（单指令入口、“属性 / 行为 / 引用 n”、zone 无 facing、行尾删除）
- Kimi:
  - premise: verified（2026-08-23 独立直读一手代码 + 自跑 census）。已核：四种状态命令是
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
  - design: agree（唯一 ScriptEditor 收口到 current `AuthorCommand`；Inspector“属性/行为/引用 n”与
    ED-INSPECTOR-TABS-1 / ED-REFERENCE-UI-1 冻结合同一致；facing 从 EntityBase 移入可见分支 +
    validator 负例属零迁移 schema 收紧（census=0 已实测）；行尾删除 + 引用阻断 + 跨 session 原子 undo
    方向正确。GE1-GE3 落钉可执行）
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
- counter / 分歧处理: 无；任一方 counter 则保持 draft/blocked，用户裁决后重签。
- 缺签豁免: N/A
- build 准入结论: build allowed（2026-08-23；Codex/Kimi/GLM 三方 premise verified + design agree、
  独立反证与用户开放指令均已齐，无 counter）

### 进入 done 前:审查签字

- Codex: accept（2026-08-23；实现、自审、typecheck、content 422 项与 editor 聚焦 215 项通过）
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
  - current zone 类型与 validator 均拒绝 `facing`；指令插入、编辑目标选择及保存前 issue collector
    同时阻止 `setEntityFacing -> zone`，而暂停/隐藏/恢复/移除仍可作用于 zone。
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
- 跳过的检查及原因: 不重复运行耗时的 editor 全量测试；一次全量已有结果，最终变更由 215 项聚焦回归
  覆盖，遵守用户“不重复 70 分钟长跑”的明确要求。完整 viewport/缩放视觉矩阵留给 review 抽查。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 本地真实 PAL 工程最小浏览器交互检查，结合 UI/boundary 自动测试。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: 本轮为交互式检查，未保留新的仓库截图产物。
- 结论: 核心 IA、删除作用域、zone 字段与唯一脚本入口均符合本卡设计，可进入独立 review。
- 未完成项: Reviewer 可按需抽查 1280 宽和 150% 缩放；不阻塞代码 review。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- Codex 自审: accept（2026-08-23）。重点复核 authoritative reference snapshot、zone facing 三层阻断、
  删除后的焦点回落、命名落点/实体键盘删除、item/enemy/shared/world 引用路由及旧方言边界。
- Kimi 审查结论: pending
- GLM 审查结论: pending
- 必须返工项: pending（等待独立审查）
- Accept / rework: review；Kimi 与 GLM 均 accept 前不得标记 done。

## 用户验收

- 用户结论: pending
- 后续任务: Kimi/GLM 实现审查完成后交用户最终验收。

## 交接日志

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

## 下一位 Agent 提示词

```text
接手任务: ED-ENTITY-INSPECTOR-IA-1 场景实体 Inspector、状态指令与删除入口收口
任务卡: docs/ops/tasks/ED-ENTITY-INSPECTOR-IA-1-scene-entity-inspector-command-unification.md
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
