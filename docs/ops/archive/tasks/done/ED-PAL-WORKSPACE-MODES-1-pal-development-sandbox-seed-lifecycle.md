# ED-PAL-WORKSPACE-MODES-1 - PAL 开发基线、评审沙盒与种子晋升边界

Status: done
Phase: phase2
Capability: X6 / 编辑器工程生命周期（不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/ed-pal-workspace-modes-1

## 目标

把当前工程的用途与保存权限变成显式、不可混淆的工作区语义：`projects/pal` 以“PAL 开发基线模式”承载
E2E 期间的正式编辑并允许有意识地保存；评审副本与 `?ui_samples=1` 以“评审 / 沙盒模式”允许任意编辑、
保存和重开，但任何保存路径都不得写回 PAL；启动页把当前 PAL 明确标成尚未稳定的开发快照，只有未来经过
显式晋升的产物才能称为稳定用户种子。

## 范围

- 范围内:
  - 为一次编辑器会话引入显式、运行期不可变的 `WorkspaceContext` / 等价上下文，至少区分
    `pal-development`、`sandbox`、`local-project`，并由该上下文统一决定保存、另存为、最近工程和 UI 提示。
  - PAL 开发基线模式允许正式编辑和保存；首次绑定写入目录时必须明确提示这是开发基线，并在写任何文件前
    校验目标确为本次加载的 PAL 工程快照，不能靠目录名猜测。
  - 评审 / 沙盒模式允许自由编辑、保存、关闭和重开；首次落盘只能创建到新建或空目录，成功绑定后只写自己的
    沙盒句柄，不能覆盖 PAL、不能隐式合并回 PAL。
  - `?ui_samples=1` 强制进入沙盒保存策略。首次保存须走“创建 / 保存评审副本”语义，并在命令层和最终写盘边界
    都拒绝回写 PAL；不能只隐藏或禁用顶栏按钮。
  - 修正最近工程句柄身份：同一 `manifest.id` 派生出的 PAL 开发基线、多个沙盒和普通克隆不得互相覆盖句柄。
  - 启动页把当前入口改为“克隆当前 PAL 开发快照（尚未稳定）”的等价明确文案；稳定种子入口必须由显式
    promotion / build 配置开启，不能因为 `projects/pal` 存在就自动宣称稳定。
  - 更新项目生命周期设计文档、帮助文案和针对保存边界的测试。
- 范围外:
  - 不在本卡完成最终稳定种子的内容冻结、CDN 发布、版本下载页或发行打包。
  - 不修改剧情、地图、资源等 E2E 内容，也不替代 `OPS-TST-PERF-B/C`。
  - 不在本卡执行 PAL 迁移或处理新迁移冲突；只验证现有三方合并能正确承接合法作者改动。
  - 不引入账号、云端项目、后端数据库或多人协作。
- 明确不做:
  - 不把 `projects/pal` 一刀切成只读；E2E 开发期需要在编辑器中产生合法 `ours`。
  - 不给沙盒提供“同步 / 覆盖 / 晋升到 PAL”按钮。
  - 不把工作区角色塞进 canonical content / manifest schema，也不因此抬升 `contentVersion` 或存档版本。
  - 不保留旧 IndexedDB 结构的兼容 upgrader；上线前按 current-only 纪律直接切换当前结构并清理旧 recent 数据。
  - 不把“选了一个目录”当成权限证明；目录选择器本身不能替代写入目标校验。

## 前提真值门

### 一句话行为 / 工程前提

PAL 当前同时是迁移三方合并中的可编辑 `ours` 与 E2E 开发工程；评审样例只是内存投影，因此必须由工作区上下文
在产品写入边界区分“允许正式写 PAL”和“只能保存独立沙盒”，而不能由内容 schema 或用户所选目录临时猜测。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是第二阶段编辑器本地工程与开发流程，不存在原版游戏对应功能。 | `docs/phase2/archive/designs/project-lifecycle-design.md:1-6` 明确本文件属于 Reforge 项目生命周期设计。 |
| 第一阶段 | N/A：第一阶段没有 FSA 工程、最近目录、评审样例工作区或 PAL 三方迁移发布链。 | `docs/phase2/READ-FIRST.md` 的阶段边界；`docs/phase2/archive/designs/project-lifecycle-design.md:14-36` 把该能力定义为第二阶段 local-first 工程模型。 |
| 当前二阶段 | dev 自动加载从 `projects/${PROJECT_ID}` 读取 HTTP 工程；`?ui_samples` 只改变内存投影，但 `Booted` 没有工作区角色。没有句柄时，统一 `save()` 允许用户任选目录并写入；最近句柄只按 `manifest.id` 唯一存储。启动页把当前 `projects/pal` 当作可直接克隆的 pal 种子。迁移器已把 baseline / 当前工程 / current publication 显式作为 base / ours / theirs 三方合并；2026-08-20 直接重算三者各 537 个 managed files，当前 `ours-base=0`、`theirs-base=0`、`ours-theirs=0`，dry plan 为 `generated=0 kept=0 merged=0 writes=0 deletes=0 conflicts=0`。 | `packages/editor/src/main.tsx:29-42,68-112`；`packages/editor/src/ui/App.tsx:1441-1503`；`packages/editor/src/core/handle-store.ts:8-22,39-58`；`packages/editor/src/ui/ProjectPicker.tsx:18-20,50-53,104-108`；`packages/migrate/scripts/migrate-content.mts:55-70,99-133`；`packages/migrate/src/migration-plan.ts:134-185`；`packages/migrate/baselines/pal/_state.json` 与 `projects/pal/`。 |
| 本任务目标 | 正常 dev PAL 会话是可写开发基线；评审 / `ui_samples` 会话可以编辑、保存和重开但只能落独立空目录；稳定用户种子必须显式晋升后才展示。工作区语义是会话 / 打开来源元数据，不污染 canonical 工程内容。 | 用户 2026-08-20 明确批准本卡四项行为；本卡“目标 / 范围 / 设计结论”。 |

### 反证与替代解释

- 最强替代解释:
  - “直接把 PAL 全部设为只读”实现最简单，但会阻断用户已明确需要的 E2E 正式作者编辑，且让三方合并中的
    `ours` 永远无法产生。
  - “原生目录选择器已经足够安全”不成立：当前 HTTP PAL 与 `ui_samples` 共用同一首存路径，选择器不理解
    工作区用途，也不能证明用户没有选到 PAL。
  - “任何修改都先克隆，永不编辑 PAL”会把仍在频繁完善的 E2E 开发工程误当稳定分发种子，制造手工回灌链。
- 什么观察会推翻当前前提:
  - 若实现中已经存在一个在 `save` 命令以下、`writeProject` 以前强制执行的不可变 persistence policy，且能
    可靠区分 PAL 开发基线、评审副本和普通本地工程，并已验证 `ui_samples` 无法写回 PAL，则本卡前提不成立。
    当前上述代码路径未找到该能力。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 不涉及游戏 runtime；缺口位于编辑器打开 / 保存生命周期。
  - 原版 / 第一阶段理解: N/A；不是原版机制迁移。
  - extractor / 地图 / 数据解码: 当前三方 537 文件零差异，不能把缺少保存模式归因于迁移数据。
  - audit / test model: 现有 `main.tsx` 注释声称样例不改仓库，但没有写入边界测试；这是实现约束缺失，不是
    单纯文案或测试误报。

### 用户可见偏离

- 是否主动偏离已核真值: yes（修正现有含混且不安全的保存行为）
- `before -> after` 一句话: HTTP PAL、`ui_samples` 与普通工程共用通用首存流程，当前 PAL 还被称为稳定克隆源
  -> 工作区模式显式控制持久化：PAL 开发基线可正式保存，评审 / `ui_samples` 只能保存独立沙盒，启动页明确
  当前 PAL 尚未稳定。
- 代表场景: 用户打开 `?ui_samples=1` 任意编辑并点击保存，编辑器只能创建 / 更新评审副本；即使用户选择
  PAL 目录，核心写入边界也必须在首个文件落盘前拒绝。
- 用户裁决: 2026-08-20 用户已批准。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：save / migration / 公共边界属于三方必审高风险任务；开发期只留 current canonical 版本。
  - `docs/phase2/READ-FIRST.md`：先修上游，不手补生成的 `projects/pal`；完成切版后删除旧版本兼容链。
  - 用户 2026-08-20：PAL 开发基线允许正式编辑保存；评审 / 沙盒允许随意编辑保存重开但绝不写 PAL；
    `?ui_samples=1` 禁止保存回 PAL；启动页需声明当前克隆源是未稳定开发快照。
- 代码锚点(`file:line`):
  - `packages/editor/src/main.tsx:29-42,68-112`：dev / ui_samples 的会话装配与缺失的工作区上下文。
  - `packages/editor/src/ui/App.tsx:1441-1503`：统一首存目录选择、序列化和写盘路径。
  - `packages/editor/src/core/open-actions.ts:29-80`：打开、PAL 克隆、另存为和句柄登记。
  - `packages/editor/src/core/handle-store.ts:8-22,39-58`：IndexedDB v1 与按 manifest id 冲突的句柄身份。
  - `packages/editor/src/ui/ProjectPicker.tsx:18-20,50-53,104-108`：当前 PAL seed 默认值与稳定化误导文案。
  - `packages/migrate/scripts/migrate-content.mts:55-70,99-133`：PAL base / ours / theirs 读取、事务和 replay。
  - `packages/migrate/src/migration-plan.ts:134-185`：三方合并与作者改动 `kept` 语义。
- 已知坑 / 审计文档:
  - `docs/phase2/archive/designs/project-lifecycle-design.md:22-47,74-108` 仍把 PAL 描述成稳定种子，需要按“开发快照 ->
    显式晋升 -> 稳定种子”修订。
  - `main.tsx:4` 的“ui_samples 不改仓库工程”目前只有意图，没有持久化边界保证。
  - 同一 `manifest.id=pal` 的多个本地副本会覆盖 IndexedDB 最近句柄记录。
  - FSA 目录身份不能跨 HTTP 与本地文件系统直接凭路径比较；设计必须用可测试的目标证明 / 标记和首写
    preflight，而不是假设浏览器暴露绝对路径。
- 不得重新引入:
  - 旧 content / save / IndexedDB 兼容 upgrader；workspace role 写入 manifest；目录名白名单；仅 UI 禁按钮；
    沙盒回灌 PAL；将当前开发 PAL 自动宣传为稳定 seed。
- 相关测试:
  - `packages/editor/src/core/open-actions.test.ts`、`handle-store` 相邻测试、`project-io` / FSA fake 测试。
  - `packages/migrate/src/migration-plan.test.ts`、`migration-baseline.test.ts`、PAL publication / replay tests。

## 验收条件

- 功能:
  - 一次 boot / open 产生明确 `WorkspaceContext`，所有保存入口都使用同一 persistence policy；刷新 / 重开后
    本地沙盒仍保持沙盒身份，不能因 `manifest.id=pal` 退化为 PAL 开发基线。
  - PAL 开发基线模式可编辑、可保存；首次写入前有明确模式提示与目标 preflight，正常后续增量保存不受影响。
  - 评审 / 沙盒模式可编辑、可保存、可重开；首次只接受新建 / 空目录，之后只能更新自己的目录句柄。
  - `?ui_samples=1` 永远采用沙盒策略。顶栏、快捷键、工程菜单、另存为和底层写入口任一路径都不能回写 PAL。
  - 多个 PAL 派生工作区在最近工程中各自可见、各自重连，不因同一 manifest id 相互覆盖。
  - 启动页、工程状态与保存反馈能清楚区分“PAL 开发基线”“评审沙盒”“普通本地工程”；当前 PAL 克隆源
    标为未稳定开发快照，未显式 promotion 时不出现“稳定种子”承诺。
  - 普通本地工程、新建空白工程、另存为和增量保存行为保持不变。
- 测试:
  - 写入矩阵必须逐项覆盖，任何实际 FSA mutation sink 都不得接收未经 workspace policy 授权的裸目录句柄：

    | 工作区 / 操作 | 首存 | 增量保存 | Save As | `⌘/Ctrl+S` / 菜单 | newBlankProject | newFromPal | 重开 / 最近重连 |
    |---|---|---|---|---|---|---|---|
    | PAL 开发基线 | 仅可信 PAL sentinel + 固定指纹匹配后允许 | 仅已绑定 PAL 句柄 | 空目录，结果降为普通 local project | 与 Save 同门 | 空目录，结果 local | 空目录，结果 local | PAL 证明成立才恢复开发基线 |
    | sandbox / ui_samples | 空目录先写受限 marker，再写工程 | 仅同 workspaceId marker + 已绑定句柄 | 空目录 + 新 workspaceId / marker | 与 Save 同门 | 空目录，结果 local | 空目录，结果 local | marker 权威恢复；冲突 fail-closed |
    | local project | HTTP 首存仅空目录；FSA 打开已有目录后写原句柄 | 仅已绑定句柄 | 空目录，结果 local | 与 Save 同门 | 空目录，结果 local | 空目录，结果 local | workspaceId 定位，不按 manifest.id 覆盖 |

  - ZIP 导出只读目录并下载 blob，明确排除于“写目录”授权矩阵；sandbox marker 随原样 ZIP 导出，当前
    没有内置 ZIP importer，round-trip 仅指外部解包后再打开目录，身份冲突必须 fail-closed。
  - 纯单测覆盖 workspace × command 的允许 / 拒绝矩阵、非法模式 fail-closed、首次空目录、已绑定沙盒、
    PAL 目标 preflight、recent workspace identity 以及 promotion 文案门。
  - FSA fake 集成测试证明：`ui_samples` / sandbox 可保存并重开，而 PAL 快照 hash 不变；绕过 UI 直接调用保存
    命令仍被拒绝；首次保存失败不留下可误认成完整沙盒的 recent 句柄。
  - PAL 开发基线合法作者改动写入后，在 upstream publication 未变时，迁移计划把它识别为 `kept` 而不是
    覆盖；upstream 与作者修改同一原子 map / 同一叶子时仍产生 conflict。
  - 普通本地工程打开 -> 无修改保存 -> 重开保持零差异；全量 editor typecheck / test 通过。
  - 仅跑一轮足以覆盖本卡的完整门禁，不重复运行相同长测。
- 文档:
  - 更新 `project-lifecycle-design.md` 的 PAL 开发快照、沙盒保存、稳定 seed promotion 与当前状态。
  - 启动页 / 帮助文本不再把当前 PAL 写成已稳定用户种子。
  - 任务卡记录最终 workspace / persistence policy 表、验证证据和任何用户裁决。
- 视觉 / 手工验证:
  - 最小浏览器验证 dev PAL、`?ui_samples=1`、启动页和已保存沙盒重开四条路径；确认模式标识、保存反馈和
    禁止路径可见且不挤压现有顶栏 / 启动页布局。
  - 不做重复的剧情 E2E 视觉巡检。
- E2E 用例登记（剧情 / 演出 / 内容观感必填：入口、准备数据、步骤、预期画面/时序、证据路径）:
  - N/A：这是功能性编辑器生命周期；使用上述最小浏览器检查和 FSA 集成测试。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（`main.tsx:29-42,68-112` 没有 workspace role；`App.tsx:1441-1503` 对无句柄会话
    统一任选目录写盘；`handle-store.ts:8-22,39-58` 仅按 manifest id 存句柄；migration command
    `:55-70` 与 plan `:134-185` 证明 PAL 是三方合并中的可编辑 ours）
  - design: agree（工作区角色留在会话 / 打开来源，写入边界 fail-closed；不污染 canonical schema，符合
    current-only 与用户批准的开发 / 沙盒 / promotion 边界）
- Kimi:
  - premise: **verified（2026-08-20，本人一手读码，非复述）**。逐项独立核实：
    - **Booted 无工作区角色**（main.tsx:35-42：session/project/script/dir? 四字段）；
      `?ui_samples` 只改变内存投影（:32-33），不写任何会话级身份。
    - **统一首存无 policy**：App.tsx:1450-1453 无句柄即 `pickDir()` 任选目录写入；唯一校验是
      中断续传的 `isSameEntry`（:1454-1458），与写入目标合法性无关。
    - **句柄按 manifest.id 单键覆盖**：handle-store.ts:39-46 `saveHandle(id=工程标识)` +
      `createObjectStore(keyPath:'id')`（:19-21）；同一 pal id 的克隆/沙盒互相覆盖属实。
    - **启动页把当前 PAL 当稳定种子**：ProjectPicker.tsx:50-53「从仙剑（pal）克隆…直接开始
      改版」，无未稳定标记；seedBaseUrl 默认 `projects/pal`（:19）。
    - **PAL 是三方合并可编辑 ours**：migrate-content.mts:55-70 base=baseline/ours=project/
      theirs=publication；migration-plan.ts:134-185 kept/generated/merged 语义实存。
    - 另发现：open-actions.ts:67-80 `saveProjectAs` 同样任选目录且无目标校验——policy 必须
      同时收编 Save/Save As/首存三条路径（卡文设计结论 2 已含）。
  - design: **agree（2026-08-20，附必落钉 KP1-KP2，不阻塞准入）**。四个替代方案逐一压测
    后被正确否决（PAL 全只读杀 E2E ours、原生 picker 无身份证明、全走 clone 制造手工回灌链、
    workspace role 写 manifest 污染 canonical schema）；六条设计结论与现有 FSA/合并结构相容。
    详见下方「Kimi 独立反证审查」。
- GLM:
  - premise: **verified（2026-08-20，本人一手读码 + 写路径全集枚举，非代理）**。锚点复现：
    `Booted` 四字段无工作区角色（main.tsx:35-42）；`?ui_samples` 只改内存投影；App.tsx:1451
    无句柄即 `pickDir()` 任选目录、:1455 仅 `isSameEntry` 断点续传校验；handle-store
    `createObjectStore(keyPath:'id')` 按 manifest.id 单键覆盖（:19-21）；ProjectPicker
    `seedBaseUrl='projects/pal'` 无未稳定标记（:18-19）；open-actions 六导出中
    saveProjectAs/newBlankProject/newFromPal 均直通 writeProject。**537 基线复算：本席
    2026-08-20 在同分支独立复跑 `migrate:content` 得 `managed=537 writes=0 deletes=0
    conflicts=0`**（ARCH-CURRENT-ONLY-1 终审时），与卡文三方零差异一致。FSA fake 测试基建
    在位（handle-store.test / open-local.test / zip.test 的 fake dir handle）。
  - design: **agree（2026-08-20，附必落钉 GP1-GP3，不阻塞准入）**。上下文/内容分离、单一
    保存门、KP1 marker 权威形态、KP2 指纹归类与四替代否决均成立。**本人写路径全集枚举发现
    矩阵漏两条**（→GP1）。
  - **必落钉 GP1-GP3（build 时落实，不阻塞准入）：**
    - **GP1（写路径矩阵补全——关键漏项）**：卡文验收矩阵只列 Save/SaveAs/首存/快捷键/工程
      菜单，但 `writeProject` 全集是**三个调用点**：App.tsx:1478（统一保存）、
      open-actions.ts:48（**newBlankProject**）、open-actions.ts:79（saveProjectAs）；
      另有 **newFromPal**（:53）经自身 pickDir 写盘。**newBlankProject 现状可在任选目录
      直接落 blank manifest——若用户选中 PAL 仓库目录即覆写开发基线**，必须与 SaveAs 同门
      （非空目录/目标 preflight）；newFromPal 克隆目标同样不得命中 PAL 目录。zip 导出走
      下载 blob 不写 FSA 目录——在矩阵中显式标注"排除及理由"。测试矩阵按
      mode × {首存,增量,SaveAs,快捷键,菜单,newBlankProject,newFromPal,重开,最近重连}
      九操作全列。
    - **GP2（marker 边界测试面补全）**：KP1 钉 marker 不入 manifest/publication/canonical
      之外，本人补三条测试面——①**zip 导出/导入 round-trip**：marker 随沙盒导出时的包含
      策略与重导入后的身份保持须显式裁决并测试；②migrate:content 的 managed census 不受
      任何沙盒目录 marker 影响（现状只读 projects/pal，测试钉死该边界不扩大）；③marker 与
      IDB 冲突 fail-closed 回 local-project 后的"仍不可写 PAL"断言（KP1 尾句的机检形态）。
    - **GP3（PAL 指纹 preflight 可测性选型）**：目标证明的"关键内容快照"必须选**确定性
      固定文件集 hash**（建议 manifest.json + 受控抽样集，禁时间戳/顺序敏感序列化），
      使"HTTP dev PAL 首存绑定本地 PAL 目录"（无 isSameEntry 可用）用例可离线复算；
      指纹不匹配/无法证明 = fail-closed 拒写，测试矩阵含伪造指纹目录负例。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-20，KP1-KP2，见下方）+ GLM（2026-08-20，GP1-GP3，见上）。
  - 独立证据锚点: Kimi 见其节；GLM——main.tsx:35-42 / App.tsx:1451-1478 /
    handle-store.ts:19-21 / ProjectPicker.tsx:18-19 / open-actions.ts:18-79（六导出全集）/
    writeProject 三调用点枚举 / migrate:content 537 复跑（本席 2026-08-20）。
  - 可证伪观察: ①若 build 中 newBlankProject/newFromPal 任一绕过 policy 门（GP1 拦截，
    路径遍历测试直调命令）；②若 marker 进入 zip round-trip 后丢失或污染内容集（GP2 拦截）；
    ③若指纹选型在相同工程两次计算不稳定（GP3 拦截）；④若任一入口静默获得 PAL 写权限
    （KP2 拦截）。
- counter / 分歧处理: none
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-20）——Codex + Kimi（KP1-KP2）+ GLM（GP1-GP3）三方
  签字齐；GP1 两条漏项路径须先补进验收矩阵后转 build。**

#### Kimi 独立反证审查（2026-08-20，架构 / FSA 保存边界主审；本人一手读码）

**四替代方案压测（独立结论，与卡文一致）：**

1. **PAL 全只读**：三方合并的 `ours` 必须是可写的当前工程（migrate-content.mts:55-70 把
   `projects/pal` 读为 ours），只读即扼杀 E2E 正式作者编辑——用户已明确需要。否决正确。
2. **只靠原生 picker**：现行 save/saveAs 均证明 picker 无任何目标身份能力（App.tsx:1450-1453、
   open-actions.ts:67-80）；选择器不理解工作区用途。否决正确。
3. **所有修改只走 clone**：E2E 开发工程高频修改会变成手工回灌链，且把开发快照误当稳定种子。
   否决正确。
4. **workspace role 写 manifest**：会污染 canonical content schema（抬 contentVersion / 引入
   非内容字段）；工作区语义是打开来源元数据，不是工程内容。否决正确。

**关键边界逐项审查：**

- **单一保存门 ✓**：设计结论 2 要求 Save/Save As/快捷键/工程菜单汇入同一 policy/preflight；
  本席补证 open-actions.ts:67-80 的 saveAs 也是任选目录——三条路径必须同门，卡文已含。
- **ui_samples 强制沙盒 ✓**：policy 在命令层和写盘边界 fail-closed，不靠隐藏按钮（验收条件
  明确"顶栏、快捷键、工程菜单、另存为和底层写入口任一路径都不能回写 PAL"）。
- **沙盒首次空目录保证 ✓**：首存只接受新建/空目录——这是阻止沙盒落进 PAL 目录的关键机械
  保证（PAL 目录非空即拒），与"绑定后只写自己句柄"组合成立。
- **PAL 开发目标 preflight ✓（方向）**：不能靠目录名（卡文明禁白名单），须靠目标工程指纹
  （manifest id + 关键内容快照/hash）+ 已有句柄时 `isSameEntry`；无法证明时 fail-closed。
- **current-only IndexedDB ✓**：DB epoch 直接升级并清旧记录，无双读 fallback——符合版本纪律。

**必落钉 KP1-KP2（build 必落，不阻塞准入）：**

- **KP1（沙盒重开身份载体必须落定形态）**：卡文风险 2 的"持久身份载体"必须在 build 设计里
  定为具体形态——本席要求：**目录内非 canonical 标记文件为权威 + IndexedDB 为加速**（marker
  不得进入 manifest content map、publication managed set 或 canonical schema；clone/copy 时随
  目录自然携带）。清站点数据或换浏览器后以 marker 恢复 sandbox 身份；marker 与 IDB 冲突时
  fail-closed 回普通 local-project 且不允许写 PAL。无此载体的实现不得进 build。
- **KP2（任何入口打开 PAL 指纹目录的归类）**：无论经"打开本地工程"还是重连，目标目录经
  preflight 证明为 PAL 开发基线时按 `pal-development` 处理；证明不了 PAL 身份且非空的目录对
  sandbox 拒绝、对 local-project 保持现状语义——不得出现"sandbox/local-project 静默获得 PAL
  仓库目录写权限"的路径。

**可证伪观察：**

1. 若 build 中出现只存在 IndexedDB 的沙盒身份（无目录内载体），清站点数据后可作为
   local-project 写 PAL——KP1 拦截，停线。
2. 若 preflight 只能用目录名或路径字符串判断 PAL——违反卡文铁律（目录名白名单禁入），停线。
3. 若 saveAs/快捷键/工程菜单任一入口不经同一 policy 门——验收矩阵的路径遍历测试拦截。
4. 若 workspace role/seedStage 出现在 manifest 或 content schema——违反上下文/内容分离，停线。

Evidence: 上文全部 file:line 均为本席本次会话直接打开核实。只读审查，未改实现文件，未代签 GLM，
未标 build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-20）**。实现与最终门禁均完成；保存 / 身份 / PAL proof 三路内部只读压力审查
  结论均为 P0=0、P1=0、P2=0。最终只运行一轮完整 editor gate：134 files / 981 tests + typecheck 全绿。
- Kimi: **accept（2026-08-20 done 前架构/保存边界主审，本人一手读码 + focused 复跑 + 实机，
  基于实现提交 896a8751，非代理）**。逐项核验：
  - **capability 保存门 ✓**：写入 sink 只收不可伪造的冻结 capability（WeakMap 私有状态、
    单次消费 phase ready→verifying→active 同步转移防竞态、workspace 注册锁、verify→prepare→
    verify 双重校验）；嵌套 sink 只拿 mutation session（workspace-persistence.ts:142-172,
    178-216）；菜单与 Cmd/Ctrl+S 共用同一 file.save 门。
  - **PAL proof ✓**：sentinel + 启动时冻结的确定性指纹（路径只来自可信 boot manifest，
    workspace-context.ts:201-225,227-246）；指纹在 mutation scope 入口重读目标值，部分写只推进
    到实际观察完成的受控状态（workspace-persistence.ts:219-229），外部漂移 fail-closed。
  - **discovery/identity lock ✓（KP1 落地）**：`.type-pal/workspace.json` marker 为权威 +
    IndexedDB 加速；marker 在全局首存锁 + workspace 锁内作为首个 mutation 先于工程内容写入
    （:594-613），失败不会留下无限制评审副本；命名空间含大小写/尾部别名硬化（:13-19）。
  - **Save As TOCTOU ✓**：选目录时 preflight + 源/后代拒绝（assertSaveAsTargetOutsideSource），
    序列化后与首次真写前动态复验（additionalVerify 在 scope 入口与首 mutation 各跑一次）；
    `.type-pal` 无条件排除出复制（fsa-copy.ts:36）；sandbox 另存只产 sandbox-copy 新身份
    （:628-631），永远拿不到 PAL 权限。
  - **ui_samples 拒写 ✓**：`forceSandbox` 剥离任何已绑定目录/PAL 权限（:693-699）；沙盒首存
    只接受空目录 + 无 marker 无 sentinel（:528-536,579-582）。
  - **KP2 ✓**：`resolveOpenedWorkspaceContext`（:676-757）按 marker/sentinel/最近记录分类；
    受限工作区缺失 marker 时拒绝降级为普通本地工程（:752-753）；普通操作不能获得 PAL 写权限
    （:725-726）。
  - **复跑 ✓**：本席独立执行 workspace-persistence/open-actions/handle-store/fsa-copy 四文件
    53/53 通过；实机顶栏显示「PAL 开发基线」。
  - 文档 §20 已建立工作区模式表与非 canonical identity 旁车节。
  未改实现文件，未代签 GLM，未标 done。
- GLM: **accept（2026-08-20 done 前覆盖/测试终审，本人一手读码 + focused 独立复跑，非代理；
  基于实现提交 896a8751，39 文件 +4474）**。GP1-GP3 + KP1-KP2 逐钉独立验证：
  - **GP1（九操作矩阵）✓ 超额覆盖**：本人 build 前点名的两条漏项路径各有专项测试——
    `newBlankProject refuses a non-empty target before any project write`、`newFromPal
    refuses a non-empty target before clone mutation`、Save As 同款（open-actions.test）；
    快捷键/菜单/顶栏共用单命令 `file.save`（app-command-registry:1683 → App:1706 菜单
    :1766）；workspace-persistence.test 29 用例覆盖首存空目录/capability 单次防伪造
    （对象展开不可伪造）/绑定续写/指纹漂移零写拒绝/部分写同句柄恢复/marker 争用唯一胜出/
    SaveAs 模式边界（沙盒→新沙盒 identity，PAL/local→普通本地）/非法 marker 不降级/
    recent-marker 冲突 fail-closed。
  - **GP2（marker 三测试面）✓ 全落**：①ZIP round-trip——"沙盒 marker 作为目录身份旁车随原样
    ZIP 导出并逐字节 roundtrip"；②migrate managed-set——"工作区 identity 旁车不进入
    managed census，并作为非托管字节受保护"且显式断言 `.type-pal/workspace.json`
    not-managed/in-unmanaged-hash（migration-project-io.test:104-109）；③冲突回退——
    "recent identity 与目录 marker 不一致时 fail-closed" + "非法或试图升权的 marker
    不得降级为普通本地工程"。
  - **GP3（指纹确定性）✓**："canonical JSON 指纹忽略对象 key 顺序，但保留数组顺序"——
    直接回应本人"禁顺序敏感序列化"禁令；"PAL 首存要求可信 sentinel + boot 固定关键
    快照"+"数组变化会使二次校验失败"+"写入和删除都不能覆盖 identity 旁车"。
  - **KP1/KP2 ✓**：`.type-pal/pal-development.json` sentinel 实体在位（kind/version/
    workspaceId/projectId）；"PAL sentinel 不能单独授予权限，必须由可信 HTTP context
    复算目标指纹"；"force sandbox 打开可信 PAL 也只返回新的未绑定沙盒 authority"。
  - **ui_samples zero-write ✓**："即使选择完全匹配的 PAL 开发目录也拒绝写入"（断言
    `root.writes=0`）+"保存独立沙盒并按 marker 重开，PAL 受控快照保持不变"。
  - **recent/play identity ✓**：DB current-only v2（"drops the old store and keeps
    same-project workspaces separately"）+ 一目录一 identity/拒绝 blind-put 两条身份
    测试；play-workspace 以 workspaceId 定位 + projectId 三方校验。
  - **产品文案 ✓**：ProjectPicker:124 "从 PAL 开发快照创建本地工程"（稳定种子字样消失）；
    App:1477 首写模式提示 + :1689 "保存 PAL 开发基线…"；lifecycle-design:411 明确
    "不复制 sentinel/不继承写权限…稳定种子只能由未来内容冻结"。
  - **focused 独立复跑 ✓**：workspace-persistence/open-actions/handle-store/zip/
    play-workspace/clone/fsa-copy 7 files/68 tests + migrate 2 files/20 tests +
    typecheck 全绿（完整 134/981 gate 按"只跑一轮"纪律未重复）。
- counter / 返工处理: none
- 缺签豁免: N/A
- done 准入结论: **done allowed（2026-08-22）——Codex + GLM + Kimi 三方 accept 齐，用户验收通过。**

## Draft: 设计与风险

### 设计结论

1. **上下文与内容分离**：`WorkspaceContext` 是由 boot / open / clone 来源产生的运行期上下文，不写入
   `manifest.json`。建议最小字段包含 `mode`、`workspaceId`、`source`、`persistencePolicy` 与可选
   `seedStage`；其中 `seedStage` 来自构建 / 部署配置，不从工程内容反推。
2. **单一保存门**：Save、Save As、快捷键、工程菜单最终必须汇入一个可单测的 policy / preflight 边界。
   UI 可以根据 policy 改名称和提示，但安全不能依赖按钮是否可见。
3. **PAL 开发基线**：正常 dev PAL boot 明确进入 `pal-development`。首次选目录时先建立可信目标证明并校验
   当前工程身份 / 关键快照，确认后才写；之后使用绑定句柄增量保存。合法 E2E 作者修改成为三方合并中的
   `ours`，迁移缺陷仍必须修上游，二者不能混淆。
4. **评审沙盒**：`?ui_samples=1` 和显式“创建评审副本”进入 `sandbox`。初次持久化只接受空目录，写成功后
   分配独立 `workspaceId` 并记住句柄；后续可保存 / 重开，但 policy 永远不提供 PAL 回写或晋升命令。
5. **句柄身份**：recent / handle store 以 workspace identity 而非 manifest id 做主键，并记录足够的来源 / 模式
   元数据用于重开。项目尚未上线，直接升级当前 DB epoch 并清理旧记录，不保留双读 fallback。
6. **种子晋升**：当前 `projects/pal` 是 development snapshot。稳定种子必须由未来明确 promotion 产物或部署
   flag 指向；本卡只建立状态 / 文案门，不提前实现发布管线。

### 已知风险

- 风险: 浏览器 FSA 不提供可依赖的绝对路径，不能简单判断“是不是仓库里的 projects/pal”。
  - 缓解: Kimi build 前必须审查目标证明设计；使用明确 boot token / 可验证工程指纹 / `isSameEntry`（已有
    句柄时）与首写 preflight 组合，并保证无法证明时 fail-closed。
- 风险: 沙盒工作区若仅存在 IndexedDB，会因清站点数据丢模式而作为普通 PAL 工程重开。
  - 缓解: 设计必须给出不污染 canonical manifest 的持久身份载体或受控旁车，并明确 current-only 生命周期；
    未能在不同入口可靠恢复 sandbox mode 前不得 build。
- 风险: IndexedDB 主键切换导致旧最近工程丢失。
  - 缓解: 上线前按 current-only 直接清理，UI 给一次性提示；不为开发期 recent 数据背兼容债。
- 风险: 正式 PAL 编辑与迁移写盘并发造成快照竞争。
  - 缓解: 保留 migration precondition / transaction；补集成测试证明作者改动保留、同域冲突 fail-loud。
- 风险: 只改文案但仍能从快捷键 / Save As 绕过。
  - 缓解: policy 测试直接调用核心命令，要求任意入口共用同一保存门。

### 主审立场

- Reviewer: Kimi（架构 / FSA 保存边界主审）+ GLM（覆盖 / 测试矩阵主审）
- 结论: Kimi premise verified + design agree（KP1-KP2）+ GLM premise verified + design agree（GP1-GP3）
- 必改项: KP1（沙盒身份载体形态落定：目录内非 canonical marker 为权威 + IDB 加速）；
  KP2（PAL 指纹目录在任何入口的归类规则）
- 是否建议进入 build: 是——三签已齐，GP1 写路径矩阵已于 2026-08-20 补入验收条件

### 三方争议记录(按需)

- Codex: 支持显式 runtime workspace context、单一保存门和未来 seed promotion；反对 PAL 全只读、manifest
  污染、仅 UI 禁用和沙盒回灌。
- Kimi: 同意六条设计结论；KP1/KP2 两钉把"身份载体"和"PAL 目录归类"从风险描述升级为形态硬门。
- GLM: 同意六条设计结论；GP1 补 newBlankProject/newFromPal 两条漏项写路径入矩阵（含覆写
  PAL 风险）、GP2 marker 三测试面、GP3 指纹确定性选型。
- 用户拍板: 2026-08-20 批准本卡四项用户可见方向；实现细节仍需三方 build 前签字。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: no
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - 工作区身份 / 保存门：`workspace-context.ts`、`workspace-persistence.ts`、`handle-store.ts`、
    `project-io.ts`、`fsa-copy.ts`、`clone.ts`、`open-actions.ts`。
  - 会话 / 命令 / 试玩传播：`main.tsx`、`App.tsx`、`ProjectPicker.tsx`、`app-command-registry.ts`、
    `play-url.ts`、`play-workspace.ts`、`play.ts` 及各试玩调用方。
  - 当前 PAL 本地身份：`projects/pal/.type-pal/pal-development.json`。
  - 回归测试：上述 core / command 对应测试、migration kept/replay 与 marker managed-set 边界测试。
  - 文档：本卡与 `docs/phase2/archive/designs/project-lifecycle-design.md` §20。
- 实现摘要:
  - 引入不可变 `WorkspaceContext`，明确 `pal-development` / `sandbox` / `local-project`；
    `?ui_samples=1` 的打开路径强制降为未绑定 sandbox，已有合法 sandbox marker 可恢复并重开。
  - 所有目录写入 sink 只接收不可伪造、单次消费、workspace 锁内重验的授权 capability；菜单与
    `Cmd/Ctrl+S` 共用 `file.save`。首存、增量、Save As、空白工程、PAL 开发快照克隆均走同一 policy。
  - `.type-pal` 整个命名空间由 policy 独占；sandbox marker 在全局 discovery + workspace lock 内先于
    工程内容写入。PAL sentinel 只与启动时冻结的确定性受控指纹共同授予开发基线写权限。
  - IndexedDB current v2 以 `workspaceId` 为主键；同一物理 handle 只能绑定一个 identity，recent 仅在
    全部写后复验通过后提交。试玩 URL 用 workspaceId 定位句柄并三方校验 projectId。
  - PAL 保存以“本次实际成功 close 的受控 JSON”推导 post fingerprint，不采纳尾部 live reread；local / PAL
    部分写只允许精确同目录、同预期状态恢复，任何外部漂移 fail-closed。
  - Save As 在复制前拒绝 source 本身 / 后代并在真正首写前动态复验；目录复制先完整读取源树（含空目录与
    慢文件），再重验并首次创建目标，且无条件排除 `.type-pal`。
  - 启动页与顶栏明确“PAL 开发基线 / 评审沙盒 / 普通本地工程”；当前 PAL 只称尚未稳定的开发快照。
- 运行命令:
  - focused editor（累计）：11 files / 83 tests passed；最后新增空目录在慢文件前的 copy TOCTOU 反例为
    `pnpm --filter @type-pal/editor exec vitest run src/core/fsa-copy.test.ts`，1 file / 6 tests passed。
  - migration：`pnpm --filter @type-pal/migrate exec vitest run src/migration-plan.test.ts src/migration-project-io.test.ts`，
    2 files / 20 tests passed。
  - `pnpm --filter @type-pal/editor run typecheck`：passed（实现收口期）。
  - 最终完整 editor gate：`pnpm --filter @type-pal/editor run check`，typecheck passed，134 files / 981 tests
    passed；按用户要求仅运行这一轮，未重复同一长测。
- 浏览器 / 手工检查:
  - 只读检查正常 `/`：顶栏显示“PAL 开发基线”，保存语义为 PAL 基线。
  - 只读检查 `?ui_samples=1`：顶栏显示“评审沙盒”，保存语义为评审副本；启动页克隆文案明确“开发快照、
    尚未稳定”。布局未出现顶栏 / 启动页挤压。
  - 按用户对 PAL 污染的明确顾虑，没有在浏览器手工触发 PAL 写入；sandbox 保存 / 重开及 PAL 指纹不变由
    双向内存 FSA 集成测试完成。
- 跳过的检查及原因: 无。完整 editor gate 已在冻结后运行且只运行一次。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 本地 6010 页面只读检查正常 dev、`?ui_samples=1` 与启动页；写入闭环由 FSA 集成测试覆盖。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: N/A（模式文案与布局直接在浏览器检查，未新增视觉资产）。
- 结论: 模式标签、保存语义与开发快照文案清晰，现有布局无回归。
- 未完成项: 浏览器不手工写 PAL；安全结果以 zero-write / fingerprint 集成测试为准。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自验通过；Kimi / GLM 正式 review 签字 pending。内部并行压力审查仅作为返工证据，
  不替代三贤人签字：save path、workspace identity、PAL fingerprint 三路均报 P0/P1/P2 清零。
- 必须返工项: none
- Accept / rework: accept
- 非阻塞 P3 / 后续硬化: 可继续收窄 `authorizedDirectory` / `saveWorkspaceHandle` 等低层导出并给
  `finishOpen(...registrationMutation)` 增加同 physical entry 的显式 API 断言；当前生产调用均在受控锁域，
  无已知绕过。全局 discovery lock 覆盖首次 clone / write 是安全优先的吞吐取舍，可另卡用 reservation 优化。

## 用户验收

- 用户结论: 2026-08-22 实现验收通过，同意提交推送并转入下一任务。
- 后续任务: 最终稳定用户种子的内容冻结、promotion 与发布管线另卡处理。

## 交接日志

- 2026-08-20 Codex: 核验当前 editor boot / save / recent handle 与 PAL base-ours-theirs 链，按用户裁决开卡；
  未修改实现。Evidence: 本卡真值矩阵与代码锚点。Next: Kimi 独立核验架构与保存边界并签 premise / design，
  之后交 GLM 覆盖审查；三签齐前不得 build。
- 2026-08-20 Kimi: 架构/FSA 保存边界主审完成，签 **premise verified + design agree（附 KP1-KP2）**。
  一手核实：Booted 无 workspace 角色、save/saveAs 任选目录无 policy、句柄按 manifest.id 单键覆盖、
  启动页无未稳定标记、PAL 三方合并 ours 链实存；补证 saveProjectAs（open-actions.ts:67-80）同样
  无目标校验，必须纳入同一保存门。四替代方案压测结论与卡文一致。两钉：KP1 沙盒身份载体形态
  （目录内非 canonical marker 为权威 + IDB 加速，marker 不进 manifest/publication/canonical schema）；
  KP2 PAL 指纹目录在任何入口的归类规则（证明为 PAL 则 pal-development，证明不了对 sandbox
  fail-closed）。未改实现文件，未代签 GLM，未标 build。Next: GLM 覆盖/测试签字（提示词见下）。
- 2026-08-20 GLM（覆盖/测试矩阵）: 审查完成，签 **premise verified + design agree（附 GP1-GP3）**。
  锚点复现 + 537 基线本席同分支复跑一致。**关键发现 GP1：写路径矩阵漏 newBlankProject 与
  newFromPal 两条创建路径**——newBlankProject 现状可在任选目录覆写 manifest（选中 PAL 目录即
  破坏开发基线）；writeProject 全集三调用点 + zip 导出显式排除。GP2 补 marker 的 zip
  round-trip/census 边界/冲突回退三测试面；GP3 钉 PAL 指纹确定性可测选型。三签齐，GP1 落
  验收矩阵后转 build。未改实现文件，未代签 Kimi，未标 build/done。
- 2026-08-20 Codex: 已把 GP1 的三模式 × 九操作写路径矩阵及 ZIP 排除边界补入验收条件，任务转
  `build`，分支 `codex/ed-pal-workspace-modes-1`。Next: 以统一授权 target 覆盖 writeProject、clone 与
  目录复制三类实际写入 sink，落实 KP1-KP2 / GP2-GP3。
- 2026-08-20 Codex: 完成 workspace identity / persistence capability / PAL 受控 proof / current-only recent /
  试玩 identity / 启动与状态文案实现。三路内部只读压力审查 P0/P1/P2 清零；focused editor 累计 83、
  migrate 20 均通过；冻结后唯一一轮完整 editor gate 为 134 files / 981 tests + typecheck 全绿。任务转
  `review`，Codex 签 accept。Next: Kimi 审架构与保存边界、GLM 审矩阵 / 文档 / 测试覆盖；不得在两席
  accept 前标 done。

- 2026-08-20 GLM（覆盖/测试矩阵）: done 终审完成并签 **accept**。GP1 两条漏项路径
  （newBlankProject/newFromPal）均有专项拒绝测试；九操作矩阵经 29 用例 persistence 套件超额
  覆盖（capability 防伪造/指纹漂移零写/部分写恢复/SaveAs 模式边界）；GP2 三测试面全落（ZIP
  round-trip/migrate managed-set 排除/冲突 fail-closed）；GP3 指纹忽略 key 顺序保数组顺序
  （直接回应禁令）；KP1 sentinel 实体 + KP2 force-sandbox 拒绝升权；ui_samples 双向 zero-write
  断言；DB v2 current-only 多 identity；文案全部改口"开发快照"。focused 7/68 + migrate 2/20
  + typecheck 本席复跑全绿，完整 gate 按纪律未重复。未改实现文件，未代签 Kimi。
  Next: Kimi accept + 用户验收。
- 2026-08-20 Kimi: done 前架构/保存边界主审完成，签 **accept（896a8751，无返工项）**。
  一手核验：capability 单次消费 + 锁内双重 verify + 嵌套 sink 只持 mutation session；PAL proof
  冻结指纹 + 部分写只推进已观察状态；marker 双锁内先于内容写入（KP1）；Save As TOCTOU 复验 +
  源/后代拒绝 + `.type-pal` 排除 + sandbox-copy 新身份；ui_samples forceSandbox 剥离一切绑定权限；
  resolveOpenedWorkspaceContext 满足 KP2 归类与降级拒绝。本席复跑 workspace-persistence/
  open-actions/handle-store/fsa-copy 53/53；实机顶栏「PAL 开发基线」确认。未改实现文件，
  未代签 GLM，未标 done。Next: 用户验收。
- 2026-08-22 User: 验收当前实现并授权提交推送。Evidence: 当前会话“对，先提交推送，然后开工”。
  Next: Codex 收口 `codex/ed-pal-workspace-modes-1`，再切干净分支推进 ARCH-ENTRYPOINT-CANONICAL-1。

## 下一位 Agent 提示词

当前无下一位 Agent 提示词；三方 accept 与用户验收已齐，任务收口。

### 给 Kimi（build 前审查——已完成）

Kimi 已于 2026-08-20 完成架构/保存边界主审并签 premise verified + design agree（KP1-KP2，
逐项证据见签字节与「Kimi 独立反证审查」），本节提示词不再适用。

### 给 GLM（build 前覆盖/测试审查——已完成）

GLM 已于 2026-08-20 完成覆盖/测试矩阵审查并签 premise verified + design agree（GP1-GP3）；
三签齐，当前由 Codex 作为唯一 Coding Owner 实现，无下一位 Agent 提示词。

### 给 Kimi（实现审查）

请审查任务卡 `docs/ops/archive/tasks/done/ED-PAL-WORKSPACE-MODES-1-pal-development-sandbox-seed-lifecycle.md` 当前
`review` 实现。先读 `AGENTS.md`、`docs/phase2/READ-FIRST.md`、任务卡上下文锚点与
`docs/phase2/archive/designs/project-lifecycle-design.md` §20；重点核查 `workspace-context.ts`、
`workspace-persistence.ts`、`handle-store.ts`、`project-io.ts`、`fsa-copy.ts`、`open-actions.ts`、
`main.tsx`、`App.tsx`。已完成：三模式、单次不可伪造写 capability、全局 discovery / identity lock、PAL
预期 post fingerprint、部分写恢复、Save As TOCTOU、`ui_samples` 拒写、recent / play identity。证据：
focused editor 83、migrate 20；最终唯一一轮 editor gate 134 files / 981 tests + typecheck 全绿；三路内部
压力审查 P0/P1/P2 清零。请独立读实现并输出 `accept`，或给出带 `file:line` 的 counter / 返工项；可以补
只读审查和短定向测试，不要重复完整长测，不得改实现文件或标 done。

### 给 GLM（实现审查）

请审查任务卡 `docs/ops/archive/tasks/done/ED-PAL-WORKSPACE-MODES-1-pal-development-sandbox-seed-lifecycle.md` 当前
`review` 实现。先读 `AGENTS.md`、`docs/phase2/READ-FIRST.md`、任务卡验收矩阵与
`docs/phase2/archive/designs/project-lifecycle-design.md` §20；重点核查 workspace × 九操作矩阵、marker / ZIP /
migration managed-set 边界、`ui_samples` FSA zero-write、recent / play identity、current-only DB 与文案。
证据：focused editor 83、migrate 20；最终唯一一轮 editor gate 134 files / 981 tests + typecheck 全绿；
三路内部压力审查 P0/P1/P2 清零。请独立读实现并输出 `accept`，或给出带 `file:line` 的 counter / 覆盖缺口；
可以补只读审查和短定向测试，不要重复完整长测，不得改实现文件或标 done。
