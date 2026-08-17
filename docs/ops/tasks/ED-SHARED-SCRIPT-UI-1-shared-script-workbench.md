# ED-SHARED-SCRIPT-UI-1 - 可复用脚本工作台与通用脚本控件收敛

Status: draft
Phase: phase2
Capability: N6 / canonical script editor correction（不改 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-shared-script-ui-1

## 目标

把“剧情 → 可复用脚本”收敛为项目级脚本作者工作台：左侧使用统一目录项，中间直接编辑 canonical 脚本正文，
右侧统一呈现作者元数据和危险动作；删除与脚本无稳定归属关系的随机场景地图预览。页面外壳和真正被复用的
`CanonicalScriptBodyEditorV5 / CanonicalCommandFormV5 / CommandForm` 同步采用现有设计系统控件，不能只给当前页
换皮。开发期只保留 canonical 路径，退役 `SharedScriptTab` 非 canonical fallback。

## 范围

- 范围内:
  - `CanonicalSharedScriptTabV5` 左栏保留 `DsCatalogControls`，把私有三行 raw button 列表迁为
    `DsCatalogRow`；名称为主信息、稳定 ScriptId 为次信息、顶层指令数使用统一 trailing 状态/计数表达。
  - 删除共享脚本库页的“预览场景 / 调用实体”工具条、`PreviewCanvas`、`Playback` 和播放控制；`self` 仍是
    脚本调用契约。需要地图/实体语境时，从具体场景调用点进入场景工作台预览。
  - 中央区使用统一对象标题/脚本工作台层级，正文编辑器占主空间；消除目录标题、中央标题、正文标题、
    Inspector 标题对同一名称/ID 的无意义四重重复。
  - 右栏作者元数据迁入 `DsTextInput / DsTextArea / DsSelect / DsButton` 等 canonical primitive；删除放在明确
    动作区，具有确认或可撤销反馈，错误提供下一步。
  - `CanonicalScriptEditorV5` 的正文树、指令插入/编辑 dialog、图标动作和所有 canonical custom forms 迁入
    `DsButton / DsIconButton / DsDialog / DsTextInput / DsNumberInput / DsTextArea / DsSelect`；图标动作具备
    可访问名称、focus-visible 和一致 disabled 状态。
  - `CanonicalCommandFormV5` 当前委托的 `CommandForm` 普通命令表单也迁共享控件，确保共享脚本、物品私有脚本、
    场景 Hook、实体 Behavior 等同一正文组件的可见路径不会回落到 `.in/.btn/.mini/pv-btn`。
  - 删除 `DataMode` 对 `SharedScriptTab` 的 fallback 及该文件、专属测试/样式；当前 canonical session 缺失时
    fail-loud 或显示明确加载错误，不启动第二套旧编辑器。
  - 同步 design-system boundary/census，让上述生产文件不再新增 raw form/旧按钮族，并把实际净减数字写回审计。
- 范围外:
  - 不改 `SharedAuthorScriptV5`、`AuthorCommandV5`、`self`、引用、保存、运行时编译与执行语义。
  - 不删除场景工作台自己的地图/演出预览，不改变场景 Hook/实体 Behavior 的 owner-context 工作流。
  - 不新增无场景 headless 模拟器、假 scene、默认实体或“选一个场景试跑”入口。
  - 不借机重写所有脚本命令表单的信息架构；本卡迁移交互 primitive、层级和可访问性，字段含义与命令覆盖不变。
  - `ScriptDrawer` 若仍有独立当前调用域，需另行核验后退役；本卡不凭文件名批量删除非直接调用方。
- 明确不做:
  - 不用业务 CSS 重画一套 select/input/button；不把 `DsSelect` 包在旧 `.in` 皮肤中。
  - 不把 294 个场景塞进新的 `DsSelect` 后保留错误的随机场景预览；正确修复是删除这段 owner-less preview。
  - 不把 current-only 清理做成隐藏 fallback；无当前真实调用方的旧文件、分支和测试一起删除。

## 前提真值门

### 一句话行为 / 工程前提

- 可复用脚本是项目级 `ScriptId -> body`，不属于任一固定场景；当前库页把随机测试场景当主预览既不代表脚本归属，
  也违反最新版 canonical 脚本 UI 分层，同时目录行、元数据和通用正文组件仍大量绕过已发布设计系统。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是第二阶段项目级脚本作者工具，没有原版游戏 UI 真值。 | `docs/phase2/READ-FIRST.md:1-16`；本卡不改原版/一阶段运行行为。 |
| 第一阶段 | N/A：第一阶段没有 canonical V5 可复用脚本库或作者工作台。 | `CLAUDE.md:5-13`；一阶段仅可提供具体场景观感，不定义本页信息架构。 |
| 当前二阶段 | `SharedAuthorScriptV5` 按稳定 ScriptId 存在项目级库；当前规范要求所有正文 owner 复用 `CanonicalScriptBodyEditorV5`，只有场景工作台保留地图预览，共享脚本需要空间语境时应从具体调用点进入场景工作台。现实现却在库页任选 `s000...s293` 构造 `callScript` 包装并挂 `PreviewCanvas`。页面仅目录头使用 `DsCatalogControls`；列表 raw button、元数据 raw form。通用 editor 静态含 43 button/37 input/31 select/2 textarea，仅 1 个 `DsSelect`；委托的 `CommandForm` 另含 14/13/15/2。`DataMode` 仍保留 `SharedScriptTab` fallback，而当前启动链始终创建 canonical `ScriptV5EditSession`。 | `docs/phase2/foundation/script-system-design.md:26-29,98-111`；`packages/editor/src/ui/CanonicalSharedScriptTabV5.tsx:52-184,264-304,324-428,435-501`；`packages/editor/src/ui/CanonicalScriptEditorV5.tsx:38-45,828-930,1510-1545,2873-3089`；`packages/editor/src/ui/CommandForm.tsx:1-90,191+`；`packages/editor/src/ui/DataMode.tsx:499-592`；`packages/editor/src/main.tsx:72-109,124-136`；2026-08-17 `rg` production static census。 |
| 本任务目标 | 以最新版 canonical owner-context 规则和现有 DS primitives 收敛共享脚本工作台；删除 owner-less preview 与旧 fallback，在公共正文/命令表单层一次迁移控件。 | 用户 2026-08-17 明确指出列表项不统一、Select 已翻新却仍有大量旧控件、共享脚本不属于具体场景不应地图预览，并要求核对整体布局与通用编辑器复用；`design-system/recipes.tsx:23-107,159-196`、`controls.tsx:27-68,256-411,449-603` 已提供目标 primitive。 |

### 反证与替代解释

- 最强替代解释 1: 历史 N6 设计明确写过“共享脚本直接预览时必须选择测试场景”，当前实现只是忠实落地，保留
  预览比删除更有验证价值。
- 反证结论: `N6-shared-script-authoring.md:293-300` 确有该历史决策；但 canonical 单一模型发布后的当前规范
  `script-system-design.md:98-111` 已明确 owner 分层：共享脚本库编辑正文，空间语境从具体场景调用点进入，不能为
  每种 owner 复制地图/播放器。用户本轮再次确认当前产品意图，因此历史 N6 预览约束不再授权现实现。
- 最强替代解释 2: 页面肉眼像旧控件只是 CSS 没同步，实际已经使用统一组件。
- 反证结论: JSX 与静态 census 直接证明 raw `<select>/<input>/<button>/<textarea>` 仍大量存在；
  `CanonicalSharedScriptTabV5` 只导入 `DsCatalogControls`，`CanonicalScriptEditorV5` 只导入一个 `DsSelect`。
- 什么观察会推翻当前前提:
  - 若 `SharedAuthorScriptV5` 存在 canonical `sceneId/mapId` owner，或所有合法调用都绑定同一场景，则库内场景预览
    有稳定归属，删除方向需 counter；当前 schema/引用均未发现。
  - 若真实启动/保存链仍必须消费非 canonical `ScriptIndexV1.library/chunks` 且不能由当前工程重新生成，则
    `SharedScriptTab` 暂不能删除，必须列出唯一真实输入、调用方和删除条件并请用户批准临时保留。
  - 若公共 editor 迁移导致字段语义、焦点返回、嵌套命令路径或 undo 粒度变化，则本卡超出纯 UI 边界，应停止并拆卡。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 不改；owner-less preview 是编辑器投影问题，运行时仍从实际 caller 获取场景/self。
  - 原版 / 第一阶段理解: N/A；全新作者 UI。
  - extractor / 地图 / 数据解码: 已排除；场景列表完整恰恰导致 294 项随机测试上下文，不是缺数据。
  - audit / test model: 历史浏览器验收只证明任意场景可启动播放器，没有证明该场景是共享脚本的稳定 owner。

### 用户可见偏离

- 是否主动偏离已核真值: yes（移除历史 N6 owner-less 预览并统一工作台呈现；脚本数据/执行语义不变）
- `before -> after` 一句话: 共享脚本库随机选择场景试播、目录和正文混用旧控件 -> 库页专注项目级正文编辑，
  需要地图语境时从真实调用点预览，全部可见控件使用统一 DS。
- 代表场景: 打开 `shared/ui-review/quest-branch`，左栏呈现统一选中行；中央直接看到正文树；右栏编辑名称、说明和
  self。页面不再默认 s000。若从 s042 某实体的 `callScript` 打开该脚本，返回场景工作台后由该真实 caller 预览。
- 用户裁决: **2026-08-17 用户已明确批准方向并要求单独开任务卡。**

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md` 开发期 current-only：当前 canonical 切换后删除旧 fallback、旧类型/fixture/test；历史由 Git 保存。
  - `docs/phase2/READ-FIRST.md`：架构优先、全新 UI、稳定 ID、无一阶段对应的新界面先设计。
  - `docs/phase2/foundation/script-system-design.md:98-111`：正文唯一组件、owner 外壳、场景预览分层的当前规范。
  - `docs/ops/tasks/N6-shared-script-authoring.md:293-300`：历史库页/预览设计；本卡明确记录其预览条款被当前规范和
    用户裁决取代，其余 ScriptId/self/引用语义保留。
  - `docs/phase2/editor/editor-design-system-v1.md:59,478-489,724,771`：主任务层级、脚本 recipe、不得双系统。
- 相关已完成卡:
  - `ED-CATALOG-CONTROLS-1:101,130,420-421`：只迁 canonical 目录头，明确把 legacy fallback 与领域列表留给后续；
    本卡接续，不修改已验收 recipe。
  - `ED-AUDIT-2` / `editor-ui-audit-2026-08-15.md:14-17,44-63,79-100`：脚本族 raw form 与旧按钮为下一批领域债。
  - `ED-DS-2`：`DsSelect/DsButton/DsIconButton/DsDialog/DsCatalogRow` 已发布并通过全局视觉验收。
- 代码锚点(`file:line`):
  - `CanonicalSharedScriptTabV5.tsx:52-184,264-428,435-591`：owner-less preview、私有列表、元数据、create dialog。
  - `CanonicalScriptEditorV5.tsx:88-122,828-930,947-2415,2873-3089`：私有 dialog、树动作、custom forms、正文。
  - `CommandForm.tsx:1-90,191+`：canonical editor 仍委托的普通命令表单。
  - `DataMode.tsx:499-592`、`main.tsx:72-109,124-136`：canonical 选择和非 canonical fallback 的真实调用域。
  - `design-system/controls.tsx:27-68,124-159,161-411,449-603,1001-1129`：目标 primitive；`DsSelect`
    长集合自动搜索/虚拟化，不能再以能力缺失为由保留 native select。
  - `design-system/recipes.tsx:23-107,159-196,724-813`：script workbench、object hero、catalog row/controls、Inspector recipe。
- 已知坑:
  - 指令树路径和递归 child arm 是编辑定位真值；改 DOM/按钮不能改 `AuthorCommandPathV5` 或 focus revision。
  - 当前行级 `<div onClick/onDoubleClick>` 依赖鼠标且以 lint ignore 绕过键盘；迁移需建立真正可聚焦行或明确的
    roving focus，不得只给图标按钮加 aria-label 就宣称可访问。
  - 直接 onChange 的 description/self/body 仍必须维持原 undo/session 语义；UI 迁移不得引入本地未提交副本丢失。
  - 删除共享脚本已有引用守卫；新增确认/反馈不能吞掉 fail-loud 错误。
- 不得重新引入:
  - 随机场景默认上下文、owner-specific PreviewCanvas、第二套脚本 editor、raw `.in/.btn/.mini/mini-txt/pv-btn`、
    native select fallback、旧 `SharedScriptTab` 条件分支、JSON 日常编辑入口、兼容旧版本的隐藏 UI。
- 相关测试:
  - `CanonicalSharedScriptTabV5.test.tsx`、`CanonicalScriptEditorV5.test.tsx`、`CommandForm.v14.test.tsx`、
    `DataMode`/`App` navigation tests、`design-system/{controls,recipes,boundary}.test.tsx`、census script。

## 验收条件

- 功能:
  - 共享脚本 CRUD、搜索、稳定 ID、名称/说明/self、正文嵌套编辑、focus path、undo/redo/save/reopen 保持。
  - 共享脚本库页 DOM/代码不再包含场景/实体选择、`PreviewCanvas`、`Playback` 或播放工具条；具体场景预览仍在
    场景工作台可用，运行时 `callScript/self` 不变。
  - 左栏全部为 `DsCatalogRow`，选中态为统一左强调线/表面，不出现整块灰/蓝私有按钮；长名称/ID 截断，计数稳定。
  - 页面元数据、create/delete、正文树、插入/编辑 dialog、canonical custom form、delegated `CommandForm` 普通字段
    使用 DS primitive；icon-only 操作具备明确 accessible name/tooltip 和键盘焦点。
  - `SharedScriptTab` fallback、import、分支、专属测试和仅供该页的 CSS 零残留；canonical session 缺失时明确报错，
    不静默展示旧编辑器。
- 测试:
  - 更新/补充共享页测试：无 preview DOM/props、DsCatalogRow、CRUD/self/body、删除确认/错误恢复、empty/search。
  - 通用正文组件在共享脚本、物品私有脚本、场景 Hook、实体 Behavior 至少各一个宿主 fixture 回归；嵌套
    branch/loop/startBattle、插入/移动/删除、focus revision、dialog focus return、键盘行选择全覆盖。
  - boundary 对目标文件禁止 raw form/旧按钮 token；audit census 记录实际净减且不以删文件误报重复消费。
  - editor focused、typecheck、全量 test、Biome changed-files、`git diff --check` 全绿。
- 文档:
  - 更新 `script-system-design.md` 的历史说明（若需）、设计系统 adoption/census 和本卡；不改 capability-map N6 ✅。
- 视觉 / 手工验证:
  - `?ui_samples=1&module=story&page=scripts` 在 1280×720、900×720、720×720 验证目录、长 ID、空正文、
    深嵌套正文、dialog、Inspector、焦点和滚动；无横向溢出，Console warning/error 0。
  - 交叉进入物品私有脚本和场景 Hook/实体 Behavior，确认公共 editor 统一而非只改共享页。
  - 从真实场景 caller 打开共享脚本，再返回场景工作台预览，确认 owner-context 路径可达；共享库不显示随机地图。
- E2E 用例登记: N/A；功能性编辑器界面按 dev-functional 当卡验证。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-17）**。实机 DOM 确认当前页有 294 项 native 场景 select、可选实体 select、
    `PreviewCanvas` 播放工具条、私有三行列表；源码核对当前规范、canonical/common editor/raw census 和启动调用域，
    证据见真值矩阵。
  - design: **agree（2026-08-17）**。同意 owner-less preview 删除、目录/页壳 DS 收敛、公共正文/CommandForm
    一次迁移、`SharedScriptTab` current-only 退役；字段/命令/运行时语义不变。
- Kimi:
  - premise: pending（用户提示词称 Kimi 已签 KSS1-KSS2，但截至 GLM 签字时代理仓库（本地 + origin，
    edec2097）尚无该版本——Kimi 签字落库后三签即齐，GLM 不代签不阻塞。）
  - design: pending
- GLM:
  - premise: **verified（2026-08-17，本人一手读码 + 独立复算，非代理）**。四项独立核验：
    1. **控件 census 逐字吻合**：本人 node 复算 `CanonicalScriptEditorV5` = 43 button / 37 input /
       31 select / 2 textarea + **仅 1 个 DsSelect**（DsButton/TextInput/NumberInput/TextArea/IconButton
       全 0）；`CommandForm` = 14/13/15/2 全 raw 零 DS；`CanonicalSharedScriptTabV5` = 5/3/3/1 raw
       （含 294 项场景 select）——与卡文真值矩阵完全一致。
    2. **SharedScriptTab 调用域穷尽枚举**：production 仅 DataMode.tsx:45 import + :561 fallback
       分支一处；测试仅 SharedScriptTab.test.ts——**注意它测的是纯 helper
       `resolveSharedScriptEditingId`（:109 导出）而非组件**，该 helper 全仓无 canonical 消费；
       boundary.test 的命中是 `CanonicalSharedScriptTabV5` 子串误报非引用。main.tsx 两条启动路径
       （dev :106 / opened :132）均无条件构造 `ScriptV5EditSession`，`scriptV5?` optional 类型面
       在 production 不可达 fallback——删除属 current-only 死路径清理。
    3. **公共正文编辑器宿主矩阵 = 7 文件级宿主**：CanonicalSharedScriptTabV5（共享）、ItemTab +
       ItemUseEffectEditor（物品私有）、ScriptV5SceneHookInspector（场景 Hook）、
       ScriptV5BehaviorInspector（实体 Behavior）、App + CanonicalSceneScriptWorkspaceV5（场景
       工作台）——卡的 4 owner-fixture 矩阵 + 交叉实机覆盖全部 7 宿主，无漏。
    4. **CommandForm commit 语义现状**：number `Number(e.target.value)` 即时转换（:92）、text
       每 keystroke 整指令替换（:105，:5 注释自认）、select `as T` 直转（:121）——三种粒度
       characterization 可执行且必要（详见 GS2）。
  - design: **agree（2026-08-17，附必落钉 GS1-GS3，不阻塞准入）**。owner 决定预览位置、公共组件
    源头一次迁移、current-only fail-loud、行为冻结四条设计结论成立；删除 owner-less preview 的
    方向与 script-system-design.md:98-111 当前规范一致。详见下方「GLM 独立覆盖审查」。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（覆盖/测试，2026-08-17，见下方）；Kimi 签字落库后补充。
  - 独立证据锚点: 见「GLM 独立覆盖审查」；须核对项已核（N6 历史 vs 当前规范先后关系由 Codex 锚定、
    main/DataMode 调用域由 GLM 穷尽、公共 editor 委托 CommandForm 的可见范围 = 7 宿主）。
  - 可证伪观察: 见「GLM 独立覆盖审查」末。
- counter / 分歧处理: 无。
- 缺签豁免: N/A
- build 准入结论: **blocked——GLM 已签；待 Kimi 签字落库（KSS1-KSS2）后三签即齐，方可转 build。**

### 进入 done 前:审查签字

- Codex: pending

#### GLM 独立覆盖审查（2026-08-17，覆盖/测试；本人一手读码 + node 复算，非代理）

**census 复算（与卡文逐字一致）：**

| 文件 | raw button/input/select/textarea | DS 采用 |
|---|---|---|
| CanonicalScriptEditorV5.tsx | **43/37/31/2** | 仅 1 个 DsSelect，其余 DS primitive 全 0 |
| CommandForm.tsx | **14/13/15/2** | 零 DS |
| CanonicalSharedScriptTabV5.tsx | 5/3/3/1（含 294 场景 select） | 仅 DsCatalogControls（目录头） |

净减断言可执行性：三文件进 boundary 既有 raw-free 门禁机制（migrated-object-workspaces 清单 +
legacy token 零）即可；census 净减用 `audit-legacy-controls.mjs` 前后对照。**注意**：净减账必须区分
「迁移转化」（EditorV5/CommandForm 的 125 处 raw → DS）与「文件删除」（SharedScriptTab.tsx 全文件
raw 随删除消失）两类，不得把删文件记成迁移成果。

**SharedScriptTab 删除清单（三层级联 + 一条保留红线）：**

| 层 | 对象 | 证据 |
|---|---|---|
| ① UI 入口 | DataMode.tsx:45 import + :561 fallback 分支 | 唯一 production 消费 |
| ② 组件与测试 | SharedScriptTab.tsx（1019 行）+ SharedScriptTab.test.ts | 测试只测纯 helper `resolveSharedScriptEditingId`（:109），helper 无 canonical 消费，随文件级联删 |
| ③ 孤儿模块 | **script-library-catalog.ts + 其测试** | rg 全仓仅 SharedScriptTab.tsx 消费 buildInternalScriptCatalog——卡文未列，必须补进删除清单 |
| 保留红线 | **state.scriptIndex / state.scriptChunks 字段** | script-references.ts:73-181（引用收集器，仍活跃）与 editor-asset-references.ts:14 持续消费——删 UI ≠ 删数据面，build 不得动这两个字段 |

Boot.scriptV5 类型面：main.tsx:38 optional，但 dev（:106）/opened（:132）两条路径均无条件构造
ScriptV5EditSession，error 路径走统一错误 UI——fallback 在 production 不可达，删除安全；类型收紧
（optional → required + 错误态显式）为 build 决策。

**七宿主矩阵（文件级 7 / owner 族 4 + 场景工作台）：**

CanonicalSharedScriptTabV5（共享）/ ItemTab + ItemUseEffectEditor（物品私有）/
ScriptV5SceneHookInspector（场景 Hook）/ ScriptV5BehaviorInspector（实体 Behavior）/
App + CanonicalSceneScriptWorkspaceV5（场景工作台）。卡的"4 owner fixture + 交叉实机"矩阵覆盖全部
宿主；嵌套 branch/loop/startBattle、focus revision、dialog focus return、键盘行选择四项与现有
CanonicalScriptEditorV5.test.tsx / 各宿主测试文件对齐，可执行。

**必落钉 GS1-GS3（build 时落实，不阻塞准入）：**

- **GS1（删除级联 + 保留红线按上表执行）**：删除清单必须含 script-library-catalog 模块（卡文漏列）；
  state.scriptIndex/scriptChunks 字段保留（引用收集器仍消费）。删除后 rg
  `SharedScriptTab|script-library-catalog` 生产码零命中（boundary 同步收 reference 的子串误报不需要，
  但 DataMode import 与 fallback 分支必须整删而非隐藏）。
- **GS2（commit 语义 characterization 含边界值）**：迁移前对 CommandForm 三粒度各补
  characterization——number 现状 `Number(e.target.value)` 即时转换（**空串 → 0 边界必须钉**：
  `Number('')===0`，迁移到带 integerInRange clamp 的 DsNumberInput 后行为可能不同）、text 每
  keystroke 整指令替换（undo 粒度=每字符，迁移后须保持或显式改变并记卡）、select `as T` 直转
  （非法值行为）。characterization 先行、迁移后全绿才许动字段模型。
- **GS3（净减账两类分记）**：audit census 更新时把「迁移转化」与「文件删除」两类减量分开记录，
  防止用删 SharedScriptTab 的文件级 raw 消失冒充 EditorV5/CommandForm 的迁移成果。

**可证伪观察：**

1. 若 SharedScriptTab 之外发现 script-library-catalog 的第二个生产消费点（本人 rg 仅 1 处），
   GS1 ③级联删除停线重估。
2. 若 CommandForm characterization 迁移后三粒度任一行为差异被宿主测试拦截且无法归为纯视觉，
   即越过"行为冻结"边界 → 停止并拆卡（卡文前提观察③沿用）。
3. 若 7 宿主中任一（如 ItemUseEffectEditor）实际未消费公共正文组件的可见路径（本人以 import
   静态判定，未逐宿主运行时验证），fixture 矩阵按实际宿主修正——4 owner 族结论不变。
4. 若删除 fallback 后某测试装配依赖 scriptV5 缺失走旧编辑器路径（当前测试文件清单未见此形态），
   按"修 fixture 不修产品"原则处理。

Evidence: CanonicalScriptEditorV5.tsx/CommandForm.tsx/CanonicalSharedScriptTabV5.tsx node census /
DataMode.tsx:34,45,561,564-565 / SharedScriptTab.tsx:49,109,202-206（1019 行）/ SharedScriptTab.test.ts
全文件 / main.tsx:38,106,132 / script-references.ts:73-181 / editor-asset-references.ts:14 /
script-library-catalog 消费面 rg / 7 宿主 import 矩阵。只读审查，未改实现文件，未代签 Kimi，
未标 build/done。

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **owner 决定预览位置**：共享库只编辑项目级正文和契约；地图/实体预览属于真实场景 caller。删除库页的测试
   scene wrapper，不删除 runtime Playback 或场景工作台预览。
2. **公共组件一次迁移**：共享页外壳消费现有 recipe；正文树、dialog 和命令表单在
   `CanonicalScriptEditorV5/CommandForm` 源头采用 DS。业务页不得覆写 DS 高度、颜色、popover 或 focus。
3. **目录信息降噪**：行只保留名称、稳定 ID、顶层命令计数；统一 selected/hover/focus。中央只保留一处对象标题，
   正文标题简化为“正文”；Inspector 不再重复对象身份。
4. **current-only fail-loud**：`main.tsx` canonical 构造为唯一产品入口。若 session 缺失是测试装配问题，修 fixture；
   若是加载错误，显示错误并停止。不能回退 `SharedScriptTab` 继续编辑旧 shape。
5. **行为冻结**：本卡只换 presentation/interaction primitive 与 owner-context 页面组合；脚本 command apply/invert、
   validation、reference、compiler、Playback 和存储字节均不变。

### 已知风险

- 风险: 公共 editor 迁移影响多个宿主，页面局部测试绿但场景/物品脚本退化。
  - 缓解: 四类 owner fixture + 全量 editor test + 三档交叉实机；Coding Owner 只能在公共层修一次。
- 风险: 删除 preview 后依赖场景语境的命令失去可发现的验证入口。
  - 缓解: 文案明确“从调用位置预览”，验证真实 caller 往返；必要时消费已有引用导航，不建立新模拟器。
- 风险: `CommandForm` 迁控件时改变 onChange 时机或数值空态。
  - 缓解: 先为 number/text/select 的 commit 语义补 characterization tests，再机械迁移；不顺带改字段模型。
- 风险: 旧 fallback 实际仍有测试或隐藏调用。
  - 缓解: 删除前做 production/import/test/fixture 调用域 census；测试装配切 canonical 后再删，发现真实不可重建输入则
    counter 并按 current-only 规则请用户批准临时隔离。

### 主审立场

- Reviewer: Kimi（canonical 分层/公共组件/旧 fallback 主审）+ GLM（控件 census/测试矩阵/调用域）
- 结论: GLM premise verified + design agree（2026-08-17，附 GS1-GS3）；Kimi pending（KSS1-KSS2
  待落库）。
- 必改项: GS1（删除级联含 script-library-catalog + state.scriptIndex/scriptChunks 保留红线）、
  GS2（三粒度 commit characterization 含 Number('')===0 边界，先行后迁）、GS3（净减账两类分记）；
  Kimi KSS1-KSS2 落库后并入。
- 是否建议进入 build: 是——Kimi 签字落库后准入条件满足。

### 三方争议记录(按需)

- Codex: 当前 canonical 规范与用户裁决优先于历史 N6 直接预览条款；建议删除 owner-less preview，不改 runtime。
- Kimi: pending（KSS1-KSS2 待落库）。
- GLM: 同意删除方向与公共组件一次迁移；补三条必落钉（GS1 级联删除与数据面保留红线 / GS2 commit
  语义边界 / GS3 净减账分记）。
- 用户拍板: **共享脚本不属于具体场景，库页不做随机地图预览；页面和通用脚本编辑组件需统一设计系统。**

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（待三签）
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

- 2026-08-17 User: 指出可复用脚本列表项未统一、Select/旧控件大量残留、项目级共享脚本不应随机绑定地图预览，
  并要求核对整体布局和正文组件复用。Next: Codex 独立核验后单独开卡。
- 2026-08-17 Codex: 浏览器与源码核验确认四项均成立；发现历史 N6 直接预览条款已被当前 canonical owner-context
  规范取代，且真实页面虽复用 `CanonicalScriptBodyEditorV5`，公共组件自身和委托 `CommandForm` 仍大量 raw 控件；
  完成前提矩阵、设计、风险、验收并签 premise/design。Next: Kimi 独立反证；三签前不得实现。
- 2026-08-17 GLM（覆盖/测试）: build 前审查完成，签 **premise verified + design agree（附 GS1-GS3）**。
  census 三文件逐字复算吻合（43/37/31/2+1、14/13/15/2、5/3/3/1）；SharedScriptTab 调用域穷尽（production
  仅 DataMode fallback 一处；测试只测纯 helper；scriptV5 optional 在 production 不可达）；公共正文编辑器
  7 文件级宿主全枚举；CommandForm 三粒度 commit 语义可 characterization。**三项增量发现**：①删除级联含
  script-library-catalog 孤儿模块（卡文漏列）；②state.scriptIndex/scriptChunks 必须保留（引用收集器仍
  消费——GS1 红线）；③净减账须分记迁移转化与文件删除两类（GS3）。备注：用户提示词称 Kimi 已签 KSS1-KSS2，
  但代理仓库（本地+origin，edec2097）尚无该版本——Kimi 落库后三签即齐。未改实现文件，未代签 Kimi，
  未标 build/done。Next: Kimi 签字落库 → 三签齐转 build。

## 下一位 Agent 提示词

```text
接手任务：ED-SHARED-SCRIPT-UI-1 可复用脚本工作台与通用脚本控件收敛
任务卡：docs/ops/tasks/ED-SHARED-SCRIPT-UI-1-shared-script-workbench.md
当前状态：draft；Codex 已签 premise verified + design agree，Kimi/GLM pending；不得开始实现。
你的角色：Kimi，负责 canonical 分层、公共组件边界与 current-only fallback 的独立架构/交互反证。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、
docs/phase2/foundation/script-system-design.md:98-111、
docs/ops/tasks/N6-shared-script-authoring.md:293-300、
docs/phase2/editor/editor-design-system-v1.md 的 script workbench/control/清旧规则、
ED-CATALOG-CONTROLS-1 的 story/scripts 与 fallback 边界，以及 CanonicalSharedScriptTabV5.tsx、
CanonicalScriptEditorV5.tsx、CommandForm.tsx、DataMode.tsx、main.tsx、design-system controls/recipes。
已完成：确认共享页当前随机选择 294 个场景之一构造 PreviewCanvas；当前 canonical 规范要求共享库只编辑正文，
空间语境从具体 caller 进入场景工作台。目录项/元数据/公共正文和 delegated CommandForm 仍大量 raw 控件；
产品启动始终创建 ScriptV5EditSession，但 DataMode 仍保留 SharedScriptTab fallback。
请你做：独立核对历史 N6 与当前规范的先后和用户裁决；确认删除 preview 是否会丢失唯一合法验证能力；枚举
SharedScriptTab 的真实 production/test/fixture 调用域；压力测试公共 DS 迁移是否会改变 command onChange、焦点、
嵌套路径或 undo 语义。写出最强替代解释和可证伪观察。无阻塞则在卡内签 premise verified + design agree；
有问题签 counter 并给出可执行收敛方案。
不要做：不得修改实现文件、不得代签 GLM、不得保留随机场景预览后只换 DsSelect、不得改 schema/runtime/save、
不得把旧 fallback 仅隐藏不删除。
输出要求：把直接证据、结论、必落钉和签字写回任务卡；若 agree，附可直接交给 GLM 的下一位提示词。
```
