# ED-SHARED-SCRIPT-UI-1 - 可复用脚本工作台与通用脚本控件收敛

Status: done
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
| 当前二阶段 | `SharedAuthorScriptV5` 按稳定 ScriptId 存在项目级库；当前规范要求所有正文 owner 复用 `CanonicalScriptBodyEditorV5`，只有场景工作台保留地图预览，共享脚本需要空间语境时应从具体调用点进入场景工作台。现实现却在库页任选 `s000...s293` 构造 `callScript` 包装并挂 `PreviewCanvas`。页面仅目录头使用 `DsCatalogControls`；列表 raw button、元数据 raw form。通用 editor 静态含 43 button/37 input/31 select/2 textarea，仅 1 个 `DsSelect`；委托的 `CommandForm` 另含 14/13/15/2。`DataMode` 仍保留 `SharedScriptTab` fallback，而当前启动链始终创建 canonical `ScriptV5EditSession`。 | `docs/phase2/archive/designs/script-system-design.md:26-29,98-111`；`packages/editor/src/ui/CanonicalSharedScriptTabV5.tsx:52-184,264-304,324-428,435-501`；`packages/editor/src/ui/CanonicalScriptEditorV5.tsx:38-45,828-930,1510-1545,2873-3089`；`packages/editor/src/ui/CommandForm.tsx:1-90,191+`；`packages/editor/src/ui/DataMode.tsx:499-592`；`packages/editor/src/main.tsx:72-109,124-136`；2026-08-17 `rg` production static census。 |
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
  - `docs/phase2/archive/designs/script-system-design.md:98-111`：正文唯一组件、owner 外壳、场景预览分层的当前规范。
  - `docs/ops/archive/tasks/done/N6-shared-script-authoring.md:293-300`：历史库页/预览设计；本卡明确记录其预览条款被当前规范和
    用户裁决取代，其余 ScriptId/self/引用语义保留。
  - `docs/phase2/specs/editor-design-system.md:59,478-489,724,771`：主任务层级、脚本 recipe、不得双系统。
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
  - premise: **verified（2026-08-17，本人一手读码，非复述）**。五点逐项独立核实：
    1. **共享脚本无场景 owner ✓**：`SharedAuthorScriptV5 = { name, description?, self, body }`
       （script-v5.ts:362-367）无 sceneId/mapId；库页预览任选场景——默认 `pairedScenes[0]`
       （CanonicalSharedScriptTabV5.tsx:84-87）+ 合成 `callScript` 包装（:88-103）+
       `Playback`/`PreviewCanvas`（:107-117,:378-397）。规范先后属实：N6:299「直接预览必须选
       测试场景」已被当前 canonical 规范 script-system-design.md:98-111（owner 分层、不为每种
       所有者复制地图/播放器）取代，用户 2026-08-17 再确认。删除 owner-less preview 正确；
       场景工作台预览与 runtime Playback 不在删除范围。
    2. **列表/元数据/布局缺口属实 ✓**：左栏私有三行 raw button（:287-300）；名称/ID 在目录行、
       中央头（:309-314）、正文标题与 Inspector（:438-443）四重重复；元数据 raw form（:446-501）。
    3. **公共层迁移边界正确 ✓**：census 逐字吻合（CanonicalScriptEditorV5 43/37/31/2 仅 1 个
       DsSelect；CommandForm 14/13/15/2 全 raw）；同一正文组件 7 宿主消费，只能公共层迁一次，
       逐页换皮必回流。与 GLM 复算双向互证。
    4. **fallback 无真实调用方 ✓**：`SharedScriptTab` 仅 DataMode.tsx:45 import + :561 fallback
       分支，测试只测纯 helper；main.tsx 两条启动链（dev/FSA）均无条件创建
       `ScriptV5EditSession`，fallback 在产品入口不可达。GLM 补出的 script-library-catalog 级联
       孤儿与 scriptIndex/scriptChunks 保留红线（GS1）我独立复核成立并完全携带。
    5. **行为语义约束准确 ✓**：三种 commit 粒度并存——name=本地 draft+显式保存
       （CanonicalSharedScriptTabV5.tsx:449-461）、description=逐键 dispatch（:465-469 经
       :218-220）、self=即改；focus 经 `focusRevision`+`lastAppliedFocusRevisionRef` 守卫
       （CanonicalScriptEditorV5.tsx:2911-2913）；`AuthorCommandPathV5` 是嵌套定位真值。
       GS2 的 characterization 先行与我 KSS2 同向，两钉互补。
  - design: **agree（2026-08-17，附必落钉 KSS1-KSS2，不阻塞准入）**。owner 决定预览位置、
    公共组件一次迁移、目录降噪、current-only fail-loud、行为冻结五条设计结论与现有代码结构
    相容；详见下方「Kimi 独立反证审查」。
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
  - 审查者: GLM（覆盖/测试，2026-08-17，见下方）+ Kimi（架构/交互，2026-08-17，见下方）。
  - 独立证据锚点: 见两方审查节——GLM：census/调用域/七宿主；Kimi：N6 与当前规范先后
    （N6-shared-script-authoring.md:299 vs script-system-design.md:98-111）、schema 无场景 owner
    （script-v5.ts:362-367）、preview 任选场景实现（CanonicalSharedScriptTabV5.tsx:84-117）、
    启动链（main.tsx:93-136）、commit 三粒度（:218-220,446-501）。
  - 可证伪观察: 见两方审查节末。
- counter / 分歧处理: 无。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-17）——Codex + Kimi（KSS1-KSS2）+ GLM（GS1-GS3）三方签字
  齐；各钉为 build 必落。由 Codex 转 build。**

### Codex done 前自验签字

- Codex: **accept（2026-08-19）**。owner-less 随机场景预览与旧 fallback/catalog 已删除；共享脚本工作台、
  `CanonicalScriptEditorV5` 与 `CommandForm` 已统一设计系统并保持命令提交、焦点和 undo 语义。批次测试
  选择器修复后，定向 19/19、editor typecheck 与全量 131 files / 975 tests 通过。

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

#### Kimi 独立反证审查（2026-08-17，架构/交互；本人一手读码）

**五项重点核验（与 GLM 独立互证，不复述其结论）：**

1. **N6 预览条款 vs 当前规范先后**：N6 卡（N6-shared-script-authoring.md:299）写于 canonical
   单一模型发布前；当前规范 script-system-design.md:98-111 明确「共享脚本库按所有者上下文编辑
   正文，需要空间语境时应从具体场景调用点打开或进入场景工作台预览，不能为每种所有者复制一套
   地图/播放器」。历史条款不再授权现实现，且用户 2026-08-17 再确认产品意图。删除方向成立。
2. **preview 是 owner-less 的实证**：`SharedAuthorScriptV5`（script-v5.ts:362-367）只有
   name/description/self/body；库页把 `pairedScenes[0]`（当前即 s000，CanonicalSharedScriptTabV5
   .tsx:84-87）当默认测试场景，再合成 `callScript` 包装播 selectedId（:88-103）——该场景与脚本
   无任何持久归属关系，预览结果不证明脚本在真实 caller 下的行为。
3. **目录/元数据/标题缺口**：左栏 raw 三行 button（:287-300）；名称/ID 四重重复（目录行 +
   :309-314 中央头 + 正文标题 + :438-443 Inspector 头）；元数据 raw form（:446-501）。
   降噪方案（行只留名称/ID/计数、中央一处对象标题、Inspector 不重复身份）与已发布
   DsCatalogRow/script workbench 合同一致。
4. **公共层一次迁移的必要性**：同一正文组件被 7 文件宿主消费；raw census 逐字吻合。逐页换皮
   会在 7 宿主间产生 7 套皮肤——公共层迁移是唯一不回流的路径。
5. **行为冻结的可执行性**：commit 三粒度现状（name draft+保存 / description 逐键 dispatch /
   self 即改）、focusRevision 守卫（CanonicalScriptEditorV5.tsx:2911-2913）、
   AuthorCommandPathV5 嵌套路径均是可测的 characterization 对象——「先钉语义再迁控件」可执行。

**必落钉 KSS1-KSS2（build 必落，不阻塞准入）：**

- **KSS1（键盘合同）**：正文树现行 mouse-only 的 `div onClick/onDoubleClick` 行（以 lint ignore
  绕过）必须迁为可聚焦行或 roving focus 等效合同，键盘行选择进实测验收；只给图标按钮加
  aria-label 不算完成。
- **KSS2（commit 语义冻结）**：name/description/self 三种现有粒度先补 characterization tests
  再迁控件，迁移前后逐字段对照；不得以 DS 统一为由改变任一字段的 commit 时机或 undo 粒度
  （与 GLM GS2 同向互补：GS2 管 CommandForm 边界值，KSS2 管共享页元数据三粒度）。

**可证伪观察：**

1. 若发现 `SharedAuthorScriptV5` 存在 canonical 场景 owner 字段（schema 没有）→ 删除 preview
   需重估。
2. 若启动链出现不建 ScriptV5EditSession 的真实产品路径（当前两条均无条件创建）→ fallback
   删除须按 current-only 规则请用户批准临时隔离。
3. 若公共迁移改变任一字段 commit 时机/焦点返回/嵌套路径/undo 粒度 → 越界停线拆卡。
4. 若 GS1 ③的 script-library-catalog 出现第二个生产消费点 → 级联删除停线重估（沿用 GLM）。

Evidence: script-v5.ts:362-369 / N6-shared-script-authoring.md:293-300 /
script-system-design.md:98-111 / CanonicalSharedScriptTabV5.tsx:52-131,264-323,435-501 /
CanonicalScriptEditorV5.tsx:2879-2926 / CommandForm.tsx:92,105,121 / DataMode.tsx:45,499-592 /
main.tsx:38,70-136。只读审查，未改实现文件，未代签 GLM，未标 build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-19）**。实现与验证证据见上方「Codex done 前自验签字」；批次测试
  选择器修复后，editor typecheck 与全量 131 files / 975 tests 通过。
- Kimi: **accept（2026-08-19 done 前架构/交互复审，本人一手读码 + 实机，非代理）**。逐项核验：
  - **owner-less preview 删除 ✓**：`CanonicalSharedScriptTabV5.tsx` 对 PreviewCanvas/Playback/
    pairedScenes/testScene rg 零命中；实机页面无场景大 select、无预览画布、无播放工具条；
    场景工作台预览不受影响（Codex 已实机确认，本席抽查场景页正常）。
  - **current-only 级联删除 ✓（GS1）**：`SharedScriptTab.tsx`、`script-library-catalog.ts` 及
    专属测试均不存在，生产码零引用；`state.scriptIndex/scriptChunks` 字段保留并仍被
    script-references.ts:73-83 消费（保留红线成立）；DataMode 缺 canonical session 时显示
    `canonical-script-load-error`（role=alert）fail-loud。
  - **公共层迁移 ✓**：三目标文件 raw button/input/select/textarea 全 0（本席 node census 复算）；
    实机左栏为 DsCatalogRow、元数据 DS 字段在位；列表名/ID/计数降噪完成。
  - **KSS1 键盘合同 ✓**：正文行 `role="treeitem"`（CanonicalScriptEditorV5.tsx:882）；
    实机 4 个 treeitem 存在。
  - **KSS2/GS2 characterization ✓**：`CommandForm.v14.test.tsx:181`「commit characterization」
    测试组存在；本席复跑该文件 + CanonicalSharedScriptTabV5.test 共 11/11 通过。
  - **GS3 净减分记 ✓**：census 脚本当前树可复现（迁移转化与文件删除两类分记已写卡）。
  - **实机**：1280 档无横向溢出；三档与 caller 往返由 Codex 视觉记录与本席抽查互补；真实
    callScript caller 往返待 GLM/用户按工程补验（Codex 已如实标注未覆盖原因）。
  未改实现文件，未代签 GLM，未标 done。
- GLM: **accept（2026-08-19 done 前覆盖/测试终审，本人一手读码 + 独立复跑，非代理）**。
  GS1-GS3 逐钉验证：GS1 删除级联完整落地——SharedScriptTab.tsx 与 script-library-catalog.ts
  及其测试全删（本席 rg 零残留），**state.scriptIndex/scriptChunks 保留红线遵守**
  （script-references.ts:73-76 仍消费，未被误删）；GS2 characterization 测试在修改文件清单中
  （CommandForm 三粒度）；GS3 净减账按"迁移转化 vs 文件删除"分记且数字可复算
  （331/198/123/8/205→254/143/71/2/129，checkbox 23→12，census 脚本通过）。DataMode
  fail-loud 无 fallback。focused（CanonicalSharedScriptTabV5 5/5）+ typecheck 本席复跑通过；
  其全量 126/939 为 build 时点数（见批次返工项）。
  - **批次级返工项（非本卡范围，关卡前须修）**：`a5e69100 unify catalog header icon buttons`
    将新建按钮迁为目录 header action 后，`EnemyTab.test:218` 与 `ItemTab.test` 的
    `button[title="新建敌人/新建物品"]` 选择器失效——main editor 全量当前 973/975（2 红），
    属六卡验收之后的范围外回归；六卡 focused 本席复跑 105/105 全绿。Codex 更新两处测试
    选择器为 header action 可访问名并复绿全量后，本批方可关卡/用户验收。
- counter / 返工处理: **resolved（2026-08-19）**。两处选择器已改用 header action 的 `aria-label`；
  定向 19/19、editor typecheck 与全量 131 files / 975 tests 通过。
- 缺签豁免: N/A
- done 准入结论: **allowed（2026-08-19）**——Codex + Kimi + GLM accept、批次返工清零、用户最终验收齐。

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
- 结论: GLM premise verified + design agree（2026-08-17，附 GS1-GS3）；Kimi premise verified +
  design agree（2026-08-17，附 KSS1-KSS2）
- 必改项: GS1（删除级联含 script-library-catalog + state.scriptIndex/scriptChunks 保留红线）、
  GS2（三粒度 commit characterization 含 Number('')===0 边界，先行后迁）、GS3（净减账两类分记）、
  KSS1（正文树键盘合同）、KSS2（共享页元数据三粒度 commit 冻结）；均为 build 必落
  Kimi KSS1-KSS2 落库后并入。
- 是否建议进入 build: 是——Kimi 签字落库后准入条件满足。

### 三方争议记录(按需)

- Codex: 当前 canonical 规范与用户裁决优先于历史 N6 直接预览条款；建议删除 owner-less preview，不改 runtime。
- Kimi: 同意当前 owner-context 分层与公共组件一次迁移；KSS1-KSS2 已落实并由 characterization / 键盘回归覆盖。
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

- Coding Owner: Codex
- 修改文件:
  - 工作台与公共编辑器：`CanonicalSharedScriptTabV5.tsx`、`CanonicalScriptEditorV5.tsx`、`CommandForm.tsx`、
    `DataMode.tsx` 及对应 characterization / host 回归测试。
  - 设计系统与样式：`design-system/overlays.tsx`、`primitives.css`、`boundary.test.ts`、`editor.css`。
  - current-only 清理：删除 `SharedScriptTab.tsx`、专属测试、`script-library-catalog.ts` 及专属测试；保留仍由
    引用收集器消费的 `state.scriptIndex/scriptChunks`。
  - 文档：本卡、`script-system-design.md`、`editor-ui-audit-2026-08-15.md`。
- 实现摘要:
  - 共享库页删除随机场景/实体选择、`Playback`、`PreviewCanvas` 和播放工具条，收敛为目录、canonical 正文、
    作者元数据三栏工作台；列表、元数据、新建/删除全部使用 DS recipe/primitive。
  - `CanonicalScriptEditorV5` 与 delegated `CommandForm` 的 raw form/旧按钮族迁入 DS；指令行建立可聚焦
    `treeitem` 及 Enter/Space 键盘选择合同，图标动作补齐可访问名称。
  - `DataMode` 缺少 canonical session 时 fail-loud，不再启动旧编辑器；dialog 补齐 jsdom/native fallback、
    居中与校验失败后的字段回焦。
  - GS3 净减已分记“当前文件迁移”和“旧文件删除”：全局 raw tags 从 331/198/123/8/205 降为
    254/143/71/2/129，native checkbox 从 23 降为 12；目标三个生产文件边界为 raw form/旧 token 零残留。
- 运行命令:
  - `pnpm --filter @type-pal/editor exec vitest run src/ui/CanonicalSharedScriptTabV5.test.tsx`：5/5 通过。
  - `pnpm --filter @type-pal/editor typecheck`：通过。
  - `pnpm --filter @type-pal/editor test`：126 files / 939 tests 全通过。
  - `pnpm exec biome check <12 changed UI files>`：通过；仅报告既存 CSS specificity / sr-only
    `!important` 警告，无 error。
  - `node packages/editor/scripts/audit-legacy-controls.mjs`、`git diff --check`：通过。
- 浏览器 / 手工检查:
  - `?ui_samples=1&module=story&page=scripts` 在 1280×720、900×720、720×720 检查目录、深嵌套树、搜索空态、
    新建/插入 dialog、Inspector 与危险动作；三栏无 document 横向溢出，dialog 无内部横向溢出，Console
    warning/error = 0。
  - `?ui_samples=1&module=scene&page=workspace&object=s000` 确认场景工作台 canvas / 场景控制仍存在，未被共享页
    current-only 清理误删。
  - 用户首轮看图指出正文 grid 的 implicit auto rows 均分剩余高度；已改为显式 `auto minmax(0, 1fr)`，实测
    1280 下 heading 高 47px、首条指令紧接于正文头后，无顶部大块空白。
  - 用户二轮看图指出“编辑”在旧 `.cmd-ops button` 的 20px 宽度内换成两行；当前 canonical 行动作已脱离该旧
    CSS，全部改为具 tooltip/aria-label 的单行 DS 图标按钮。1280 下 5 键均为 30px 高、无文字溢出；720 下通过
    container query 下沉到选中行第二行，保留完整指令文字，document `scrollWidth === innerWidth === 720`。
- 跳过的检查及原因: UI review fixture 没有真实 `callScript` caller，未能当场点击完成 caller → shared → return
  路径；`onOpenSharedScript` 宿主回归与 runtime tests 保持通过，场景工作台预览另已实机确认。该项留给 reviewer
  使用含真实 caller 的工程补验，不影响本卡 build 转 review。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: in-app Browser 实机 + DOM 尺寸/滚动测量 + Console 检查；1280/900/720 三档 viewport。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: 本次 Browser 会话内逐档截图人工检查，未生成需纳入仓库的持久截图资产。
- 结论: **build 视觉自验通过**；统一目录行、正文树、元数据与 dialog 呈现成立，共享页已无随机地图预览。
- 未完成项: 无阻塞项；当前工程缺少可用的真实 `callScript` caller fixture，未伪造该实机路径，既有
  caller/return 测试、三方审查及用户最终验收已覆盖本卡完成判断。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex、Kimi、GLM 均已独立签 accept。
- 必须返工项: 无；批次测试选择器回归已修复并由全量门禁复绿。
- Accept / rework: **accept**。

## 用户验收

- 用户结论: **accept（2026-08-19）**。用户明确确认本批验收全部通过。
- 后续任务: 无；本卡收口。

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
- 2026-08-17 Kimi（架构/交互）: 独立反证完成，签 **premise verified + design agree（附 KSS1-KSS2）**。
  五项一手核验：N6:299 预览条款已被 script-system-design.md:98-111 当前规范取代且用户再确认；
  schema 无场景 owner、库页默认 pairedScenes[0] 合成 callScript 预览属 owner-less 实证；目录/元数据/
  四重标题缺口属实；7 宿主公共层一次迁移必要；commit 三粒度 + focusRevision 守卫 + command path
  均为可 characterization 的行为冻结对象。完全携带 GLM GS1（script-library-catalog 级联孤儿 +
  scriptIndex/scriptChunks 保留红线我独立复核成立）。KSS1 正文树键盘合同、KSS2 共享页元数据三粒度
  冻结与 GS2 互补。三签齐，build 准入转 allowed。未改实现文件，未代签 GLM，未标 build/done。
  Next: Codex 转 build（GS1-GS3 + KSS1-KSS2 必落）。
- 2026-08-17 Codex（Coding Owner）: build 完成并转 `review`。删除共享库 owner-less preview、旧 fallback 与级联
  孤儿；共享页及公共正文/命令表单迁 DS，落实 treeitem 键盘合同、dialog focus 与 commit characterization。
  typecheck、editor 全量 126/938、Biome changed-files、audit、diff-check 全通过；1280/900/720 功能性视觉自验
  无溢出且 Console 0 warning/error。真实 caller 往返因 UI fixture 无 callScript 留给 review 补验。Next: Kimi/GLM
  独立代码审查并分别 accept/counter；审查前不得标 done。
- 2026-08-17 User + Codex（build follow-up）: 用户连续指出正文区域被纵向拉伸、行内“编辑”两字换行。Codex
  复核确认分别由 grid implicit auto track 拉伸与 canonical 行复用旧 `.cmd-ops button` 固定 20px 引起；已改为
  显式正文行轨道、独立 DS 图标动作区，并在 ≤460px 容器内把动作区排到选中行第二行。Chrome CDP 实测
  1280/720 无横向溢出、5 个动作均 28px client/scroll width；editor 全量更新为 126 files / 939 tests 通过。
  核心前提/范围未变，任务保持 `review`。Next: Kimi/GLM 审查最新 commit。

- 2026-08-19 GLM（覆盖/测试）: done 终审完成并签 **accept**。GS1 级联删除零残留+state 字段红线遵守；GS2 characterization；GS3 净减分记可复算。附批次返工项 a5e69100。

## 下一位 Agent 提示词

无下一位 Agent 提示词；三方 accept、用户验收与全量测试均已完成，本卡收口。

## 历史交接提示词（已完成）

```text
接手任务：ED-SHARED-SCRIPT-UI-1 可复用脚本工作台与通用脚本控件收敛
任务卡：docs/ops/archive/tasks/done/ED-SHARED-SCRIPT-UI-1-shared-script-workbench.md
当前状态：review；三方 build 前签字齐，Codex 已完成实现、自测与三档功能性视觉验证。
你的角色：Kimi，负责架构/交互代码审查并签 accept 或 counter；不得标记 done、不得代签 GLM。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、script-system-design.md:98-111、
editor-ui-audit-2026-08-15.md 的 GS3 净减账，以及本卡列出的全部修改文件与测试。
已完成：删除 owner-less preview 与旧 SharedScriptTab fallback/catalog；共享页、CanonicalScriptEditorV5、
CommandForm 已统一 DS；treeitem 键盘合同、dialog focus、三种 commit 粒度、四宿主回归已覆盖；typecheck 与
editor 全量 126 files / 939 tests 通过，1280/900/720 无横向溢出、Console 0 error/warning；用户指出的正文纵向
拉伸与行动作换行已在 build follow-up 修复，review 必须基于最新 commit。
请你做：独立检查 schema/runtime/save 未漂移、current-only 删除边界、command path/focus/undo/commit 语义、
DS 可访问性与 owner-context 分层。若可准备含真实 callScript caller 的工程，补验 caller → shared → return；
缺少该 fixture 不应以猜测代签。无阻塞则在 Review 写直接证据并签 accept；有问题签 counter/rework 并列最小返工项。
不要做：不得在 review 中顺手修改实现、不得恢复随机场景预览或旧 fallback、不得代签 GLM、不得标记 done。
输出要求：审查证据、结论、accept/counter 和剩余风险写回任务卡，并提供给 GLM 的下一位提示词。
```
