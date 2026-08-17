# ED-WORLD-VARIABLES-1 - 世界变量定义表与作者工作台

Status: review
Phase: phase2
Capability: N5 authoring closure / content schema successor（N5 状态不降格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-world-variables-1
Depends on: ED-SHARED-SCRIPT-UI-1（分支 `codex/ed-shared-script-ui-1`；公共脚本表单控件先收敛，再接变量选择语义）

## 目标

把“剧情 → 变量”从脚本字符串的只读反向索引升级为真正的世界变量作者工作台：工程拥有一份稳定 ID 的变量
定义表，左栏按开关/数值类型分组，中央编辑名称、说明和项目初始值，右栏用统一引用面板展示全工程每一处读取/
写入并精确跳转。变量定义与运行期值分层；已有脚本引用迁成定义，未声明、跨类型冲突和删除阻断必须 fail-loud，
不能继续靠“脚本里先随手写一个字符串，页面再猜它是变量”维持表面闭环。

## 范围

- 范围内:
  - 新增 canonical `WorldVariableRegistryV1` 内容表，建议单文件 `content/world-variables.json`，以稳定变量 ID 为
    record key；值为判别联合：
    - `kind: 'flag'`：`name`、`description`、`initial: boolean`；
    - `kind: 'number'`：`name`、`description`、`initial: number`。
  - `sys:` 命名空间保留给引擎内部状态（如屏波），作者变量禁止创建该前缀；系统内部值不伪装成作者定义。
  - 推进 current canonical content successor；manifest 必须登记 `worldVariables` 路径，loader/editor/save/runtime
    共享同一 validator。当前工程和 seed 工程生成该表，不保留“缺文件即从脚本猜定义”的产品 fallback。
  - 新开局按 registry 的 `initial` 构造 `world.script.flags/vars`；已有存档继续以已持久化运行态为真值，不在读档时
    用作者默认值覆盖。现有缺值求值 `flag=false / number=0` 仍只作为运行时防御，不再替代作者声明。
  - 一次性升级当前工程：递归扫描全部 canonical 作者脚本，把现有 flag/number 符号生成定义（`name=id`、说明空、
    初值 false/0），因此迁移前后运行行为相同；同一 ID 同时被当作 flag 与 number 时停止并列冲突，不猜类型。
  - 完成 current-only 切换后删除上一 content 版本的 loader/type/upgrader/fixture/test/产品升级入口；历史由 Git 保存。
    具体删除清单必须由 build 前调用域 census 确认，不以“测试还在用”作为保留理由。
  - `VarsTab` 改为 hybrid data/object workbench：
    - 左栏：`DsCatalogControls + DsCatalogGroupHeader + DsCatalogRow`，固定分组“开关”“数值”，显示分组计数、
      名称、稳定 ID、读/写计数；搜索覆盖名称、ID、说明；提供新增入口。
    - 中央：`DsObjectHero` + shared form sections，编辑显示名称、说明和项目初始值；稳定 ID 与类型创建后只读，
      不提供会偷偷改脚本字符串的普通文本重命名。
    - 右栏：固定“世界变量 / 当前名称”标题，使用 `DsReferencePanel / DsReferenceGroup / DsReferenceRow / List`，
      按“读取 / 写入”分组；每行展示 owner、源、精确命令路径和比较/赋值形态，可定位就“打开”，不可定位用
      静态状态而非 disabled button。
  - 新增/编辑/删除均走 command + undo/redo；被任何作者脚本引用的变量阻断删除，零引用定义允许删除并确认。
  - 用 canonical reference locator 重建变量引用扫描，覆盖场景 Hook、实体 Behavior、hostile onLose、共享脚本、
    物品私有脚本及所有递归 command/condition arm；旧 `sceneId/srcKey` 粗粒度 `RefEntry` 不再作为变量页真值。
  - 脚本条件与 `setFlag/setVar/addVar` 的变量字段消费定义表：按所需类型选择已有变量，并提供“打开变量”导航；
    不允许新增未声明字符串。该项在 ED-SHARED-SCRIPT-UI-1 的公共 `CommandForm` DS 迁移之后实施，避免双改控件。
  - 定义未引用是合法状态并显示“0 处”；发现使用但未登记的 ID 时在目录单列“未登记引用”诊断，保存门阻断，
    可从该诊断创建同 ID 定义；同 ID 跨类型使用为不可自动修复错误。
  - `?ui_samples=1&module=story&page=vars` 同时注入有名称、说明、初值和多 owner 引用的变量定义，且不修改工程
    工作副本；用户可稳定验收开关、数值、零引用、长名称、读写混合与错误态。
- 范围外:
  - 不新增 string/enum/vector/date/weather 专用运行类型；当前 runtime 只有 boolean flag 与 number var，本卡不以
    UI 标签虚构第三种可执行类型。时间/天气可先用 number/flag 表达，真正类型另开 schema 卡。
  - 不改 `AuthorCommandV5` 的 `flag/var: string` 运行时引用形状，不改脚本执行器的读写命令或存档中
    `world.script.flags/vars` 的值表形状。
  - 不做普通“改稳定 ID”；若以后需要 rename，应单开原子 rename command，同时更新全部 exact locators、校验和
    undo，不用本卡把显示名称编辑伪装成 ID rename。
  - 不做入口点级变量初值覆写；本卡 `initial` 是所有新开局共享的项目默认。若真实产品需求要求不同入口不同初值，
    必须 counter 并把初值移入 `StartWorld` 设计，不能在 build 中临时加双真值。
  - 不把调试工具中的运行时世界变量检视器并入作者定义页；作者默认值与当前存档值必须继续分层。
- 明确不做:
  - 不保留“没有定义表也能照常编辑”的兼容分支；不把引用索引当定义表；不从某次存档反推作者默认值。
  - 不把引用继续行内折叠在目录项下面；不继续使用 `.var-head/.ref-row/.rw` 私有组件和私有颜色。
  - 不用 native input/select/button 重画工作台；不复制 ED-REFERENCE-UI-1 已发布的引用面板。

## 前提真值门

### 一句话行为 / 工程前提

- 当前变量页没有变量数据模型，只把场景脚本里的字符串引用按 flag/number 临时分组；Phase 2 规范和既有闭环审计
  都要求独立的命名变量表，而用户本轮明确要求类型目录、基本信息编辑和逐变量引用，因此必须先建立作者定义真值，
  再重做三栏工作台。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有本任务这种命名世界变量作者库；原版对象状态迁移不由本页重新解释。 | `docs/phase2/foundation/content-schema.md:42-48` 明确记录原版以隐式对象状态表达进度；本卡不改原版迁移结果。 |
| 第一阶段 | N/A：第一阶段没有 Phase 2 编辑器、稳定变量 ID 注册表或作者 metadata。 | `CLAUDE.md` 忠实还原边界；本卡只新增二阶段作者内容，不改 `packages/game`。 |
| 当前二阶段 | 规范要求显式命名世界变量表；当前 runtime 只有 `flags: Record<string, boolean>` / `vars: Record<string, number>`，新世界为空表，缺值求值为 false/0。`VarsTab` 只收 `RefIndex`，左栏只有搜索和说明，中央把 `refIndex.flags/vars` 行内展开，右栏为空；索引只从 `scenes` 扫描，未覆盖共享脚本和物品私有脚本。2026-07-13 闭环审计已判定“只有脚本派生清单，无初始态/说明注册表”。 | `content-schema.md:35-48`；`script-v5.ts:75-92`；`character.ts:329-337`；`script-world-v5.ts:690-697`；`VarsTab.tsx:1-140`；`ref-index.ts:19-38,46-160,200-242`；`DataMode.tsx:207,493-495`；`editor-authoring-closure-audit-2026-07-13.md:145-155`；2026-08-17 1280×720 实机 DOM。 |
| 本任务目标 | 建立变量定义、初始化、校验、全 owner 引用和作者工作台的单一闭环；保留 runtime 值表与脚本字符串引用形状。 | 用户 2026-08-17 明确要求变量按类型分组、逐变量引用、说明和基本信息在中间编辑；`editor-design-system-v1.md:494-510` 的数据表工作台和当前 `DsObjectHero/DsReferencePanel/DsCatalogRow` 可直接承载。 |

### 反证与替代解释

- 最强替代解释 1：flag/var 天生是脚本首次使用即创建的动态符号，当前引用索引已经是变量库，只需把中栏排版做满。
  - 反证：当前页无法表达未使用定义、说明、显示名称和初值；脚本拼写错误会静默创建另一符号。Phase 2 规范明确说
    “显式化为一张命名世界变量表”，既有闭环审计也已把缺注册表列为未闭环。
- 最强替代解释 2：把 `name/description/initial` 直接塞进 `WorldScriptStateV5`，可以少一个内容文件。
  - 反证：`WorldScriptStateV5` 是每个存档的可变运行值，作者说明和定义是工程内容；混在一起会让存档携带编辑 metadata，
    并产生“工程定义 / 旧存档副本”双真值。定义必须在 content，存档只保存值。
- 最强替代解释 3：新增可选 `worldVariables` 而不升 content 版本，旧工程缺失时继续从引用推导。
  - 反证：这会永久保留两种产品行为，且无法区分“合法空定义表”与“旧工程没升级”。项目正式上线前只支持 current
    canonical，schema 改动必须显式切换并清旧。
- 什么观察会推翻当前前提:
  - 若全调用域证明某类作者变量必须按 `EntryPoint.startWorld` 拥有不同初值，则项目级 `initial` 设计不成立，任务回
    `blocked`，先设计入口点覆写而不是落双真值。
  - 若当前工程存在同一稳定 ID 同时按 flag 和 number 使用，自动迁移不可安全决定类型；列出全部冲突交用户裁决。
  - 若共享脚本/物品私有脚本的 canonical locator 无法表达变量 condition/command 的 exact path，则“逐引用跳转”
    前提不成立，须先扩公共 locator，不得降回 scene/srcKey 粗跳。
  - 若新开局初始化会改变未声明变量的现有运行结果，说明迁移 seed 不完整；停止 schema 切换并补全引用 census。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类：当前 boolean/number 与 false/0 fallback 明确；本卡不新增运行类型。
  - 原版 / 第一阶段理解：N/A；这是全新作者 UI，原版对象状态继续留在 entity lifecycle 域。
  - extractor / 数据解码：不是缺数据；当前 ui sample 的 4 个变量完全由脚本引用反推，正好证明定义表缺失。
  - audit / test model：浏览器 DOM 与 `VarsTab/ref-index/DataMode` 调用链相符，非截图裁切或 Inspector 被折叠造成。

### 用户可见偏离

- 是否主动偏离已核真值: yes。
- 历史结论: `ED-INSPECTOR-TABS-1:96` 曾因“页面只有目录 + 主引用表”判定 vars 无右栏；
  `ED-REFERENCE-UI-1` 也明确排除 `VarsTab` 私有 `ref-row`。这些结论只描述旧只读页，不授权新的定义工作台继续空
  Inspector；本卡保留历史事实并以用户新裁决取代 vars 页面边界。
- `before -> after` 一句话: 脚本引用自动冒出变量、中央行内展开、右栏空白 -> 变量先有正式定义，左侧按类型选择，
  中间编辑基本信息和初值，右侧查看并跳转全部读写引用。
- 代表场景: 选择 `review.quest.rewarded`，左栏位于“开关”；中央显示稳定 ID、名称“任务奖励已领取”、说明和
  初值 false；右栏分组显示 1 处读取、1 处写入并能打开精确命令。选择一个未使用变量时显示 0 处且允许删除。
- 用户裁决: **2026-08-17 用户明确要求重新设计，并点名类型分组、逐变量引用、说明和中间基本信息编辑。**

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：schema/save/公共接口属于高风险，必须三方 premise/design 签字；current-only 切换后清理旧版本。
  - `docs/phase2/READ-FIRST.md:7-16,44`：不能把迁移/运行态偶然形状当成新引擎合格架构；全局变量须显式审计。
  - `docs/phase2/foundation/content-schema.md:35-48`：稳定 ID 和显式命名世界变量表。
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md:154`：变量只有派生清单，缺初始态/说明注册表。
  - `docs/phase2/editor/editor-design-system-v1.md:494-510`：变量属于高密度数据表工作台；列表需保持可比较性。
- 相关已完成卡:
  - `ED-CATALOG-CONTROLS-1`：Vars 目录头已迁 `DsCatalogControls`，本卡不得重造搜索。
  - `ED-REFERENCE-UI-1`：已发布唯一引用 panel/row；其 Vars 排除因本卡用户行为变化而反转，build 更新 boundary。
  - `ED-INSPECTOR-TABS-1`：旧 Vars 无 Inspector 的判定只对旧派生页成立；新右栏仍只有单一“引用”任务，不虚构 Tab。
  - `ED-SHARED-SCRIPT-UI-1`：公共 `CommandForm` primitive 迁移先行；本卡只在其上增加变量 registry/picker 语义。
- 代码锚点(`file:line`):
  - `VarsTab.tsx:1-140`、`editor.css:8398-8470`：当前私有只读实现。
  - `ref-index.ts:19-38,46-160,200-242`：当前粗 locator、只扫 scenes 的引用索引。
  - `DataMode.tsx:207,493-495`：Vars 只拿 scenes-derived refIndex，未拿 canonical session/definition state。
  - `script-v5.ts:75-97`、`script-world-v5.ts:690-697`、`script-project-v5.ts:123-135`：运行值形状与读写语义。
  - `character.ts:84-134,329-337`：StartWorld 与新世界脚本态构造边界。
  - `loader-v15.ts:15-36`、`loader-v14.ts:38-68,167-225`：当前 manifest/author content 加载路径。
  - `edit-session.ts:28-52`、`project-io.ts:128-149,217-265`：编辑工作副本和内容表保存映射。
  - `design-system/recipes.tsx:21-107,203-455,783-813`：Workbench/Hero/Catalog/Reference/Inspector 公共合同。
  - `design-system/boundary.test.ts:300-346`：当前明确排除 Vars 的引用面，需由本卡反转为正向保护。
- 已知坑:
  - 当前 `RefList` 的 hostile 项用 disabled button 伪装不可定位状态；共享引用合同要求静态 article + 原因。
  - ref occurrence 不能只靠数组 index 作 identity；key/locator 必须来自 owner + exact command path。
  - metadata session 与 script session 是两个 undo owner；本卡不允许一次编辑动作跨 session 半成功。普通 metadata 只走
    EditSession；脚本变量选择只走 ScriptV5 session；删除前纯扫描阻断，不做跨 session 批量改写。
  - 初值只在创建新世界时读取；修改作者初值不能修改当前预览/存档世界，否则会污染运行态。
  - UI sample 必须是 opt-in 纯投影，禁止把评审变量写回 `projects/pal`。
- 不得重新引入:
  - implicit declaration、scene-only ref index、`var-head/ref-row/rw` 私有 UI、disabled 假引用行、native form、
    optional registry fallback、旧 content loader 常驻、把运行时值当作者默认、稳定 ID 的无守卫直接编辑。

## 验收条件

- schema / runtime:
  - registry validator 覆盖 exact keys、稳定 ID、保留前缀、判别联合、有限 number、重复/空白/超长文本。
  - current 工程/seed/loader/editor/save/打包均读写同一 `worldVariables`；无缺文件 fallback。
  - 新游戏按 initial 构造；已有存档不被 default 覆盖；false/0 迁移保证现有工程运行结果不变。
  - current-only 清理完成；仓库不存在上一 content 版本的生产 loader/type/upgrader/route/fixture 分支。
- 引用 / 校验:
  - 收集全部 owner 与递归 arm 的每一个读写 occurrence；共享脚本和物品私有脚本不漏，hostile 不冒充可跳。
  - 未登记引用、跨类型同 ID、引用类型与定义不符均进入统一 project diagnostics 并阻断保存。
  - 删除零引用定义可 undo/redo；有引用定义显示 exact count 和来源并阻断；不静默删除或批量改脚本。
  - 变量脚本字段只能选择同 kind 已登记定义；选择后可打开定义页，不能输入未知字符串。
- UI:
  - 左栏按“开关 / 数值”分组，每组计数正确；搜索名称/ID/说明；目录行统一，选中同步 URL object。
  - 中央只出现一次对象身份；稳定 ID/类型只读，名称/说明/初值可编辑且 undo/redo/save/reopen 正确。
  - 右栏使用统一引用合同，按读取/写入分组，显示精确 owner/路径/形态；0 引用、部分失败、不可定位、错误均有
    明确状态和下一步，不出现 disabled button 假行。
  - empty/unselected/zero-ref/undeclared/conflict/long-content 状态完整；无大面积空白、横向溢出或逐字折行。
- 测试:
  - content validator + current schema/load/serialize + new-world/existing-save + project generator/census。
  - reference collector owner×access×nested-arm 矩阵；exact locator 跳转和删除阻断。
  - Vars UI CRUD、分组、搜索、深链、undo/redo、save/reopen、空态/错误态/键盘/focus。
  - public boundary：Vars 加入 `DsCatalogRow/DsObjectHero/DsReferencePanel/Row` 正向清单；旧 class/raw form 零残留。
  - Content/Reforge/Editor focused + typecheck + 全量 tests + Biome changed-files + `git diff --check` 全绿。
- 视觉 / 手工验证:
  - `?ui_samples=1&module=story&page=vars` 在 1280×720、900×720、720×720 验证三栏/降级、长 ID/说明、
    开关/数值、0 引用、读写混合、未登记错误、键盘和滚动；Console warning/error 0。
  - 从右栏依次打开场景 Hook、实体 Behavior、共享脚本、物品私有脚本引用，再返回同一 variable object 深链。
  - 创建变量 -> 脚本选择 -> 引用出现 -> 保存重开 -> 删除被阻断；移除引用后删除并 undo，端到端闭环。
- E2E 用例登记: N/A；功能性编辑器界面按 dev-functional 当卡验证。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-17）**。1280×720 实机 DOM 确认 Vars 只有 1 个搜索框、4 个派生变量按钮、
    行内 ref 展开和空右栏；源码确认无变量 definition/metadata/initial command，refIndex 只收 scenes，而 current
    runtime 只有值表与 false/0 fallback。Phase 2 规范和 2026-07-13 审计均已点明显式表缺口。
  - design: **agree（2026-08-17）**。同意 content registry + current schema successor、定义/运行值分层、类型目录、
    中央 metadata/initial、右栏全 owner exact refs、引用阻断和 UI samples；不改命令运行形状或存档值表。
- Kimi:
  - premise: **verified（2026-08-17，本人一手读码，非复述）**。七点逐项独立核实：
    1. **定义/运行值分层正确**：`WorldScriptStateV5` 是纯运行值表（script-v5.ts:75-92），
       `emptyWorldScriptStateV5()` 新世界为空表；缺值求值 `?? false`/`?? 0` 在
       reforge/src/script-world-v5.ts:694-696（卡文锚点写 editor 侧，实际文件在 reforge，
       语义一致）。`sys:screenWave`/`sys:waveProgression` 内部值真实存在
       （script-project-v5.ts:134-135），`sys:` 保留前缀有现实依据。
    2. **initial 归属 registry 正确**：`StartWorld`（character.ts:84-98）当前完全没有
       flags/vars 通道——现存入口机制不含变量初值，无真实 per-entry 需求可考；把 initial 放
       项目 registry 是最小真值，塞入 StartWorld 反而是在无需求时新建第二真值。卡文已把
       「若现真实入口需求则 counter 改 StartWorld 方案」列为可证伪观察，我独立同意。
    3. **当前页确无定义模型**：VarsTab.tsx:85-140 只消费 `buildRefIndex(scenes)` 派生索引，
       行内展开、右栏缺失、hostile 行 disabled button 伪装（:18-26）逐项属实；
       `buildRefIndex` 只收 scenes（ref-index.ts:238-242 + DataMode.tsx:207），共享脚本与
       物品私有脚本确实漏扫。
    4. **引用可全 owner 覆盖**：`ScriptEditorStateV5` 已含 scenes（hooks/behaviors/hostile
       onLose，script-v5-editor.ts:283-320）、items（:323-329）、sharedScripts（:340），
       `visitCanonicalScriptCommandsV5` 精确 locator walker 已存在（:279，ED-ENEMY-1 已用）。
       exact locator 前提成立，无需降回 scene/srcKey 粗跳。
    5. **历史排除边界处理正确**：boundary.test.ts:340-344 当前把 VarsTab 钉为负向排除
       （必须有 `ref-row`、禁止 `DsReferencePanel`）；ED-INSPECTOR-TABS-1:96「vars 没有右栏」
       判定属实但只描述旧只读页。本卡以用户新裁决反转该边界并保留历史事实，程序正确。
  - design: **agree（2026-08-17，附必落钉 KV1-KV2，不阻塞准入）**。定义/值分层、双类型、
    初值只作用新世界、目录/registry 与引用/collector 双源、禁 rename 保双 session 原子性、
    依赖卡先行的七条设计结论均与现有结构相容；详见下方「Kimi 独立反证审查」。
- GLM:
  - premise: **verified（2026-08-17，本人一手读码 + 全量数据 census，非代理）**。关键事实独立核实：
    1. **VarsTab 现状属实**：DataMode:207/496 只喂 scenes-derived refIndex；ref-index 仅扫 scenes，
       共享/物品漏扫属实（与 Kimi 第 3 点独立互证）。
    2. **runtime 值形状属实**：flags/vars 值表 + `?? false/?? 0` 缺值回退（script-runner.ts:214-216；
       reforge script-world-v5.ts:694-696）。
    3. **setFlag/setVar/addVar 合法性核清（含一次自纠）**：三命令在 v4 `Command` 联合
       （script.ts:172-174），经 `AuthorLeafCommandV5 = Exclude<LegacyCommandV4,…>`（script-v5.ts:164）
       继承进 AuthorCommandV5——本人最初按字面正则提取 kind 列表漏掉继承成员，已纠；卡验收条款
       引用合法。条件侧 flag/var 只读比较（script-v5.ts:96-97，all/any/not 嵌套）。
    4. **sys: 前缀实证**：runtime 写 `sys:screenWave`（script-runner.ts:566）、存档清理
       `delete vars['sys:music']`（save/ops.ts:408）——保留前缀条款有真实依据。
    5. **hostile onLose owner 存在**（index.ts:106）——owner 清单准确。
    6. **PAL 全量 census（本人 node 宽松扫描 scenes/scripts/shared-scripts/items 一切带 flag/var
       字符串字段的节点）**：**PAL 工程 flag/var 符号使用量 = 0**——Codex 实机所见"4 个派生变量"
       全部来自 `?ui_samples=1` 注入（ui-review-samples.ts:104-132 注入 firstScene.hooks.onEnter +
       sharedScripts 的 review.* 符号），非 PAL 真实数据。premise 证据链成立，但**迁移将生成空
       registry**——影响见 GV1。
  - design: **agree（2026-08-17，附必落钉 GV1-GV3，不阻塞准入）**。定义/运行值分层、boolean/number
    严格两型、initial 只作用新世界（Kimi 的 StartWorld 无通道论证本人复核 character.ts:84-134
    属实）、全 owner exact locator（visitCanonicalScriptCommandsV5 已存在且 ED-ENEMY-1 已用）、零引用
    才可删、与 ED-SHARED-SCRIPT-UI-1 串行——与数据事实相容。详见「GLM 独立数据覆盖审查」。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-17，见下方「Kimi 独立反证审查」）+ GLM（2026-08-17，见下方「GLM 独立数据覆盖审查」）
  - 独立证据锚点: 本席本次会话直接打开核实——script-v5.ts:75-97,362-369 /
    reforge/src/script-world-v5.ts:690-700 / script-project-v5.ts:123-135 / character.ts:84-134,
    325-337 / ref-index.ts:19-60,162-243 / VarsTab.tsx:1-140 / DataMode.tsx:207 /
    script-v5-editor.ts:27-40,279-345 / boundary.test.ts:300-346 / ED-INSPECTOR-TABS-1:88-104。
  - 可证伪观察: 见「Kimi 独立反证审查」末节。
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-17）——Codex + Kimi（KV1-KV2）+ GLM（GV1-GV3）三方签字齐。前置：依赖卡 ED-SHARED-SCRIPT-UI-1 完成后按序 build；GV1 空表事实与 GV3 样本/保存门语义须先落卡。**

#### Kimi 独立反证审查（2026-08-17，schema/initial/版本切换/双 session 主审；本人一手读码）

**七问裁决：**

1. **分层 ✓**：registry 是 content、值表是 save——当前 `buildWorldV13` 以
   `emptyWorldScriptStateV5()` 构造新世界（character.ts:329-337），flags/vars 从不进 StartWorld；
   定义/metadata 放存档会产生「工程定义 vs 旧存档副本」双真值，卡文方向正确。
2. **initial 归属 ✓（项目 registry）**：现存 StartWorld 无变量通道（character.ts:84-98），
   PAL 迁移内容走 entityState 不用 flag/var（VarsTab.tsx:117-119 注释亦证），无现存
   per-entry 初值需求；项目级 initial 是唯一当前真值。若未来出现入口级需求，按卡文回
   blocked 走 StartWorld 设计，不落双真值。
3. **content successor / current-only ✓**：v15→v16 只触 content 轴；SAVE_VERSION 信封轴独立
   （character.ts:116-118）；注意 save/migration-v15.ts 的 `targetContentVersion: 15` 需随
   successor 同升（属卡文「loader/editor/save/runtime 共享同一 validator」面）。census 驱动
   删除清单、不以测试占用为保留理由，符合版本纪律。
4. **跨类型同 ID 停线 ✓**：迁移 false/0 等价于现行 fallback，行为不变；同 ID 跨类型不可
   自动定类，停线列冲突交用户——正确且必须。
5. **引用扫描覆盖 ✓**：canonical collector 可覆盖场景 Hook/Behavior/hostile onLose/物品私有/
   共享脚本（锚点见上），hostile 当前 disabled 假行（VarsTab.tsx:18-26）将由统一引用合同的
   静态 article + 原因取代。
6. **双 session 原子性 ✓**：禁 ID rename + 带引用删除阻断后，不存在跨 session 写路径；
   metadata/initial 只走 EditSession，脚本变量 picker 只走 ScriptV5 session，删除前纯扫描。
   「从诊断创建同 ID 定义」也只写 registry，不触脚本。
7. **三栏 IA ✓**：hybrid data/object workbench 与已发布 DsWorkbench/DsObjectHero/DsCatalogRow/
   DsReferencePanel 合同一致；Vars 从 boundary 负向排除反转为正向清单是本卡必做。

**必落钉（build 必落，不阻塞准入）：**

- **KV1（boundary 反转完整性）**：boundary.test.ts:340-344 的负向排除（`ref-row` 必有 +
  `DsReferencePanel` 禁止）必须在同卡删除并替换为正向清单成员资格；禁止「删负向、忘正向」的
  半迁态，Vars 的 DsCatalogRow/DsObjectHero/DsReferencePanel 消费须入正向断言。
- **KV2（迁移生成器与引用 collector 同源）**：一次性升级扫描器与运行时引用 collector 必须是
  同一定义、两个消费者（C1-1/B2-1 模式），不得各写一套递归 walk；否则迁移 census 与删除阻断
  可能漏不同的 owner。

**最强替代解释复核：** 「refIndex 即变量库，只需排版做满」不成立——无未使用定义、无说明/初值，
拼写错误静默生新符号；「metadata 塞进 WorldScriptStateV5」不成立——存档携带编辑 metadata 即双
真值；「可选 worldVariables 不升版本」不成立——无法区分合法空表与未升级旧工程，违反 current-only。

**可证伪观察：**
1. 若全调用域出现真实的 per-entry-point 变量初值需求 → 本席 initial 结论失效，回 blocked 改
   StartWorld 方案。
2. 若当前工程/seed 存在同 ID 跨类型使用 → 迁移停线，列冲突交用户裁决（卡文已含）。
3. 若 canonical locator 无法表达某 owner 的变量 condition/command exact path → 先扩公共 locator，
   不得降回粗跳（卡文已含）。
4. 若迁移后新开局运行结果与迁移前有任何差异（false/0 不等价于空表）→ seed 不完整，停线补
   census。

Evidence: 上文全部 file:line 均为本席本次会话直接打开核实。只读审查，未改实现文件，未代签 GLM，
未标 build/done。

#### GLM 独立数据覆盖审查（2026-08-17，数据/覆盖/测试矩阵；本人一手读码 + node census，非代理）

**premise verified——六点一手核实**（详见签字块）：VarsTab 只读派生索引、runtime 值形状与
false/0 回退、setFlag/setVar/addVar 经 v4 联合继承合法、sys: 前缀实证（screenWave/music）、
hostile onLose owner 存在、**PAL 工程 flag/var 使用量为零**（ui_samples 注入为实机所见唯一来源）。

**关键 census（卡文未含，GV1 的事实基础）：**

| 项 | 本人实测 |
|---|---|
| PAL flag 符号 | **0 符号 / 0 引用**（scenes+scripts+shared-scripts+items 全扫） |
| PAL var 符号 | **0 符号 / 0 引用** |
| 跨类型同 ID 冲突 | 0（可证伪观察②平凡通过） |
| 编辑器内可见符号 | 全部来自 ui-review-samples.ts:104-132 的 review.*（注入 firstScene.hooks.onEnter + sharedScripts） |

**必落钉 GV1-GV3（build 时落实；GV1/GV3 须先落卡）：**

- **GV1（空 registry 事实入卡 + 合成覆盖声明）**：卡的数据前提必须补记"PAL 当前 0 flag/var
  符号——迁移生成空表"。"迁移前后运行行为相同"不变式对 PAL 平凡成立、无真实判别力；
  generator/validator/collector/工作台整链的验收证据 **100% synthetic**（ui_samples + demo/
  e2e-own + 测试 fixture），Build 记录不得宣称"经 PAL 真实数据验证"；建议 e2e-own 升级为带
  真实 flag/var 用例（读写混合、嵌套 arm、跨类型反例）的主验证 fixture。
- **GV2（collector 覆盖矩阵以真实类型联合为准 + sys: 过滤）**：owner×access×arm 矩阵必须含——
  读：AuthorConditionV5 flag/var（含 all/any/not 递归）；写：setFlag/setVar/addVar（**v4 继承
  命令**，别只扫 V5 字面 kind）；owner：scene hooks/entries、entity behaviors、hostile onLose、
  sharedScripts、item 私有脚本；arm：branch.then/else、loop、confirm 等递归 arm。**另钉：collector
  与"未登记引用"诊断必须过滤 `sys:` 前缀**——`sys:screenWave` 是运行时内部写入，不能在作者页
  报未登记或进 registry（卡文只禁作者创建，未钉 collector 侧过滤）。
- **GV3（ui_samples 与保存门的互斥语义先裁决）**：sample 注入 review.* 符号到 scenes/sharedScripts，
  而验收规定"未登记引用阻断保存"——若用户在 `?ui_samples=1` 下保存，validator 会对 sample 符号
  报未登记并阻断（或污染工程）。build 前必须显式裁决二选一并落测试：① sample 模式注入的符号
  视作已登记（同步注入 registry 样本）；② sample 模式不触发保存门/禁止保存。不得边做边猜。

**测试矩阵可执行性 ✓**：验收节的 schema/引用/UI/boundary 四组条款与现有基建对齐——
visitCanonicalScriptCommandsV5 walker（ED-ENEMY-1 已用）、boundary 正反清单机制（Vars 从负向
排除反转为正向保护）、DsCatalogControls 目录头已迁（CATALOG 卡）。唯一补强即 GV1 的合成声明
与 GV3 的语义裁决。

**可证伪观察：**
1. 若 build census 发现 PAL 之外的 seed 工程存在 flag/var 使用（本人未扫 demo/e2e-own 内容），
   GV1 空表结论按该工程修正——不改变设计，只改 fixture 策略。
2. 若未来在 runtime 发现第三处 sys: 内部符号写入（已核 screenWave/music 两处），collector 过滤
   清单同步扩充。
3. 若 GV3 裁决为①且用户在 sample 模式保存后真实工程出现 review.* registry 项（sample 写回），
   违反"opt-in 纯投影"——测试必须断言 sample 不落盘。

Evidence: script.ts:165-180 / script-v5.ts:96-97,164-167 / script-runner.ts:214-216,566,650-656 /
reforge script-world-v5.ts:694-696 / script-project-v5.ts:123-135 / save/ops.ts:408 /
index.ts:106 / character.ts:84-134 / ui-review-samples.ts:104-132 / DataMode.tsx:207,496 /
PAL 四目录 node census（0/0/0）。只读审查，未改实现文件，未代签 Kimi，未标 build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-18）**。current 16 registry/loader/save/new-world 初始化、全 owner canonical
  collector、diagnostics/save gate、CRUD/undo、变量 picker 与三栏工作台均已实现；Content 490、Reforge 1025、
  Editor 949、Migrate fast 649 测试通过，Reforge/Editor production build 通过，三档浏览器布局无横向溢出。
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **定义与值分层**：registry 是工程作者真值，`WorldScriptStateV5` 是每档运行值。脚本继续引用稳定字符串 ID，
   validator 负责 join；不把 metadata 放进存档。
2. **只有两种当前类型**：UI 分组严格对应 runtime 的 boolean/number，不借“天气/时间”文案虚构 enum/string。
3. **初值只作用新世界**：编辑 initial 不改当前存档；迁移 false/0 与旧缺值 fallback 等价。入口点覆写不是本卡暗门。
4. **定义目录与引用索引并存**：左栏由 registry 驱动，右栏由 canonical 全 owner collector 驱动；未登记引用是诊断，
   不能反过来成为正常目录数据。
5. **稳定 ID 不普通改名**：可编辑 `name/description/initial`，kind/id 锁定。删除只允许零引用，避免跨 session 原子性债。
6. **混合工作台有真实三责**：左目录承担类型发现，中区承担作者定义，右栏承担影响/导航；这是用户明确的新职责，
   不再受旧“Vars 没有 Inspector”的历史页面描述限制。Medium/Narrow 仍按 DS recipe 降级，不硬挤三列。
7. **实施顺序去冲突**：ED-SHARED-SCRIPT-UI-1 先完成通用 CommandForm DS primitive；本卡后接变量 picker/registry，
   不在两张卡里并行重写同一表单 DOM。

### 已知风险

- 风险: initial 放在 project registry，未来多入口需要不同初值。
  - 缓解: 卡内明确共享项目默认；Kimi 必须独立审查真实入口需求。发现现存需求即 counter，改为 StartWorld 方案。
- 风险: 旧 ref index 漏共享/物品引用，迁移误判零引用并允许删除。
  - 缓解: generator、validator、UI 共用同一 canonical collector；owner×nested-arm 矩阵和 current project census 为硬门。
- 风险: content successor 与当前 v15 loader 链叠加成长期兼容层。
  - 缓解: current-only 删除清单和仓库负向 rg；升级完成后只留一个 production content version。
- 风险: registry metadata 与 ScriptV5 session 分属两个 undo owner。
  - 缓解: 本卡禁止 ID rename/带引用删除等跨 session 写操作；metadata 与 initial 单 session，脚本 picker 单 session。
- 风险: UI sample 变量污染工程或掩盖空态。
  - 缓解: `withUiReviewSamples` 输入输出不可变测试；无 query 时真实空表，query 时注入 definitions + references。

### 主审立场

- Reviewer: Kimi（schema/initial/版本切换/双 session 主审）+ GLM（全 owner 引用/迁移 census/测试矩阵主审）
- 结论: Kimi premise verified + design agree（2026-08-17，附必落钉 KV1-KV2）；GLM premise verified +
  design agree（2026-08-17，附必落钉 GV1-GV3）
- 必改项: KV1（boundary 负向排除同卡反转为正向清单）；KV2（迁移生成器与引用 collector 同源）
- 是否建议进入 build: 是——待 GLM 签字且 ED-SHARED-SCRIPT-UI-1 公共 CommandForm 收敛后准入

### 三方争议记录(按需)

- Codex: 建议项目级 definition registry（含共享新开局 initial）与存档值表分层；ID/kind 锁定，全 owner refs 阻断删除。
- Kimi: agree（KV1-KV2 已纳入实现验收）。
- GLM: agree（GV1-GV3 已纳入实现验收）。
- 用户拍板: **变量页必须按类型组织，变量有可编辑基本信息/说明，并能查看每一处具体引用。**

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
- Build-start（2026-08-17）:
  - 依赖 `ED-SHARED-SCRIPT-UI-1` 已完成实现、自测并以 merge commit `85b2888c` 合入本分支；本卡在其
    `CommandForm`/共享脚本工作台收敛结果上继续，不再维护旧私有脚本表单。
  - **GV1 落卡**：PAL 当前作者脚本 flag/var 使用量为 0，current successor 为 PAL 生成合法空 registry；
    registry/generator/collector/UI 的行为验证明确 **100% 使用 synthetic fixture 与 ui_samples**，不得宣称经
    PAL 真实变量数据验证。
  - **GV3 裁决 = 方案 ①**：`?ui_samples=1` 同时以纯内存投影注入 review.* registry definitions 和对应
    scenes/sharedScripts references；正常保存门仍严格运行，样例引用不是未登记引用；测试必须断言输入和磁盘
    工程均不被修改，review.* 不进入普通工程输出。
- 修改文件:
  - `packages/content/src/world-variable.ts`、`character.ts`、`index.ts` 及测试：新增 exact registry validator、
    current content 16 manifest/world 类型和按 initial 创建新世界；删除上一 content 版本的产品类型/upgrader。
  - `packages/reforge/src/loader-v16.ts`、`runnable-project-loader.ts`、`save/*`、`main.ts` 及测试：current-only
    loader/save/runtime 切换到 16；删除 v15 loader/migration 产品路径。
  - `packages/editor/src/core/world-variable-*`、commands/project IO/diagnostics/ui samples 与
    `VarsTab/CommandForm/DataMode/CanonicalScriptEditorV5/ScriptDrawer/App/editor.css`：同源引用索引、保存门、
    CRUD/undo、类型 picker/反向导航和统一三栏工作台。
  - `projects/{pal,demo,e2e-own}`：登记 `content/world-variables.json`；PAL 按 GV1 生成合法空表。
  - `packages/migrate`：current 16 fixture/oracle 与历史 seal rewind helper；删除旧 v15 产品迁移脚本入口。
- 实现摘要:
  - registry 是唯一作者定义真值，运行态 flags/vars 仍只保存值；新游戏读取 initial，旧存档不回填覆盖。
  - generator、diagnostics、删除阻断和 UI 共用 canonical occurrence collector；覆盖 scene hook、entity
    behavior、hostile onLose、item private、shared script 及递归 command/condition arm，过滤 `sys:`。
  - 变量脚本字段只能选择匹配 kind 的已登记定义，并可往返打开变量；未登记/跨类型/定义错型 fail-loud。
  - Vars 页使用 Catalog/Hero/Reference DS，提供类型分组、搜索、metadata/initial 编辑、精确读写引用与状态空面；
    ui samples 注入 7 个纯内存 definition 和多 owner refs，普通工程不落样例数据。
- 运行命令:
  - `pnpm --filter @type-pal/content check`：42 files / 490 tests passed。
  - `pnpm --filter @type-pal/reforge check`：100 files / 1025 tests passed。
  - `pnpm --filter @type-pal/editor check`：128 files / 949 tests passed。
  - `pnpm --filter @type-pal/migrate check:fast`：89 files / 649 passed、5 skipped，退出码 0。
  - `pnpm --filter @type-pal/reforge build && pnpm --filter @type-pal/editor build`：两项 production build 通过；
    仅保留既有 chunk-size warning。
  - changed-files `biome check`：0 error（2 warning / 23 info，均为既有提示级规则）；`git diff --check` 通过；
    v15 product path 负向 `rg` 通过。
- 浏览器 / 手工检查:
  - `?ui_samples=1&module=story&page=vars` 在 1280×720、900×720、720×720 实测，三栏职责稳定，
    `documentElement.scrollWidth === innerWidth`，长名称截断且无逐字折行/横向溢出。
  - 新建 `review.manual` 后 URL 同步，undo 删除并回落到有效 object；零引用变量显示“未发现引用”且可删除。
  - 从变量写入引用精确打开 `shared/ui-review/quest-start` 首条命令；双击编辑后 picker 仅列开关定义，
    “打开变量”返回原变量深链。
  - ui sample 页面未执行保存；不可变/不落普通工程由 `ui-review-samples` 与 project IO 测试覆盖。
- 跳过的检查及原因: 未对本地 HTTP 工程执行真实保存，避免污染用户工作副本；save/reopen 由 project IO、loader、
  serializer 与全量测试闭环。浏览器 Console 未提供独立历史捕获接口，页面交互无可见 runtime error；请 reviewer
  在独立复验时补一次 Console warning/error 记录。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: in-app browser 实机 DOM、三档 viewport capability、截图与交互往返；视口测试后已 reset。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: 当前任务浏览器证据（1280×720、900×720、720×720）；未写入仓库产物。
- 结论: pass。三档均无页面级横向滚动；目录/正文/引用在 720 仍保持分栏且可独立纵向滚动，900/1280 信息密度正常。
- 未完成项: reviewer 独立 Console 记录与真实磁盘 save/reopen spot-check（不得在 ui sample 投影上保存）。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自验 accept；待 Kimi + GLM 独立 review。
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-17 User: 指出变量页过于敷衍，要求至少按变量类型分组，每个变量有具体引用，并在中间编辑说明和
  基本信息。Next: Codex 核对现有数据模型与 UI 真值，独立开高风险卡。
- 2026-08-17 Codex: 实机与源码确认页面是 scenes-derived 只读索引，没有 definition/metadata/initial，右栏为空且
  shared/item refs 漏扫；既有 Phase 2 规范和闭环审计早已记录定义表缺口。完成 registry、初始化、全 owner refs、
  工作台、current-only 和验收设计并签 premise/design。Next: Kimi 独立审查；三签和依赖收敛前不得实现。
- 2026-08-17 GLM（数据/覆盖）: build 前审查完成，签 **premise verified + design agree（附 GV1-GV3）**。
  六点一手核实（含自纠：setFlag/setVar/addVar 经 v4 联合继承进 AuthorCommandV5）；**PAL 全量 census
  发现 flag/var 使用量为零**——实机所见变量全部来自 ui_samples 注入，迁移将生成空 registry（GV1：
  空表事实入卡 + 验收 100% synthetic 声明）；GV2 钉 collector 覆盖矩阵须按真实类型联合（v4 继承命令
  别漏）+ sys: 前缀过滤；GV3 钉 ui_samples 与保存门的互斥语义 build 前裁决。与 Kimi KV1-KV2 互补
  无重叠。未改实现文件，未代签 Kimi，未标 build/done。Next: GV1/GV3 落卡；依赖卡完成后按序 build。
- 2026-08-17 Kimi: 独立反证完成，签 premise verified + design agree（附 KV1-KV2）。七点裁决：
  定义/运行值分层正确（StartWorld 无变量通道、新世界空表 + false/0 fallback）；initial 属项目 registry
  （无现存 per-entry 需求，现需求出现则回 blocked 走 StartWorld）；current-only 删除面含 save
  migration target 同升；跨类型同 ID 停线正确；canonical collector 覆盖全 owner（hooks/behaviors/
  hostile/items/shared，walker 已存在）；双 session 无跨写路径（禁 rename + 阻断删除）；三栏 IA 与
  已发布 recipe 一致。注意：卡文 script-world-v5.ts 锚点实际在 reforge 包（语义一致）。未改实现文件，
  未代签 GLM。Next: GLM 覆盖/测试签字（提示词见下）；三签 + 依赖卡收敛前不得实现。
- 2026-08-18 Codex: 完成 current 16 registry/loader/save/new-world、canonical collector/diagnostics/CRUD、
  picker 与三栏变量工作台；GV1-GV3/KV1-KV2 均落实。Content/Reforge/Editor/Migrate 共 3113 个通过测试，
  两项 production build 和三档实机布局通过，签 Codex accept，任务转 review。Next: Kimi + GLM 独立 review；
  不得标 done，待三方 accept 与用户验收。

### 给 Kimi（已完成）

Kimi 已于 2026-08-17 完成独立反证并签字（premise verified + design agree，附 KV1-KV2，
见「Kimi 独立反证审查」），本节提示词不再适用。

### 给 GLM（build 前覆盖/数据/测试签字，可直接复制）

```text
接手任务：ED-WORLD-VARIABLES-1 世界变量定义表与作者工作台——build 前覆盖/数据/测试签字
任务卡：docs/ops/tasks/ED-WORLD-VARIABLES-1-world-variable-workbench.md
分支：codex/ed-world-variables-1
当前状态：draft；Codex 与 Kimi（KV1-KV2）已签，待 GLM；不得修改实现文件或开始实现
先读：AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全文（含 Kimi 独立反证审查）、
  docs/phase2/foundation/content-schema.md:35-48、editor-authoring-closure-audit-2026-07-13.md:145-155；
  再直读 script-v5.ts、character.ts、reforge/src/script-world-v5.ts:690-700、loader-v15.ts、
  edit-session.ts、project-io.ts、script-v5-editor.ts、ref-index.ts、VarsTab.tsx。
请独立复算/枚举：
1. 当前工程（pal/demo/e2e-own/seed）全部 canonical 作者脚本中的 flag/var 符号 census：符号总数、
   读写计数、是否存在同 ID 跨类型冲突（决定迁移是机械 false/0 还是停线）；sys: 前缀占用清单。
2. content successor 的调用域/删除清单：loader/type/upgrader/fixture/test/产品升级入口逐项枚举，
   标出 v15→v16 必须同升的 save migration targetContentVersion 面。
3. 引用 collector 的 owner×access×nested-arm 测试矩阵（场景 Hook/实体 Behavior/hostile onLose/
   共享脚本/物品私有脚本 × read/write × branch/loop/嵌套 arm），以及未登记引用/跨类型/删除阻断的
   保存门断言。
4. KV1 boundary 反转与 KV2 同源约束的可验证形态；ui_samples 注入不可变性测试。
输出：签 premise verified + design agree 或带 file:line 的 counter；写回任务卡推进签字与交接日志；
不得修改实现文件、不得代签。三签齐 + ED-SHARED-SCRIPT-UI-1 公共表单收敛后方可进 build。
```

### 给 Kimi + GLM（done 前独立 review，可直接复制）

```text
接手任务：ED-WORLD-VARIABLES-1 世界变量定义表与作者工作台——done 前独立 review
任务卡：docs/ops/tasks/ED-WORLD-VARIABLES-1-world-variable-workbench.md
分支：codex/ed-world-variables-1
当前状态：review；Codex 已实现并签 accept，Kimi/GLM 均未签 done；不得标 done
先读：AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全文，重点复核 KV1-KV2、GV1-GV3 与 Build 记录。
Kimi 主审：content 16 current-only 清理、registry/save/new-world 分层、双 session/删除原子性、三栏视觉与
  Console；确认旧存档不被 initial 覆盖、上一 production content path 无残留。
GLM 主审：canonical collector owner×access×nested-arm、sys: 过滤、未登记/跨型保存门、PAL 空 registry 与
  ui_samples 纯投影、测试矩阵和 oracle/seal 更新。
请直接读取一手代码并独立复跑必要测试；输出 accept，或带 file:line/复现步骤的 counter 与返工项；写回任务卡
推进签字和交接日志。允许审查性小改仅在明确归属后进行；任何 counter 都必须留在 review/rework，不得标 done。
```
