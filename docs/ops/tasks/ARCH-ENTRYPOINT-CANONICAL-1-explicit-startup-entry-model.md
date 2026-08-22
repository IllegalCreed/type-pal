# ARCH-ENTRYPOINT-CANONICAL-1 - 显式启动入口与独立开局配置

Status: done
Phase: phase2
Capability: X7（入口与开局；不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/arch-entrypoint-canonical-1

## 目标

把工程启动模型收敛为一套可见、可解释、无隐式联动的权威数据：`manifest.entryPoints` 只包含真实入口，
每个入口都拥有完整且独立的场景、开场视频与 `StartWorld`；`manifest.defaultEntryId` 只负责指定无菜单直接
启动时选哪一个真实入口。编辑器不再显示伪造的“默认入口”，也不再提供“跟随默认入口 / 独立开局”两套心智。

## 范围

- 范围内:
  - 把当前 manifest 切换到新的 canonical content 版本：新增必填 `defaultEntryId`，`entryPoints` 改为非空且
    每项 `startWorld` 必填；删除顶层 `entryScene`、顶层 `startWorld` 和所有合成 / 回退语义。
  - 同步 content 类型与校验、Reforge loader / boot、编辑器命令 / diagnostics / 引用扫描 / seed、PAL 当前
    发布生成器、当前工程与测试 fixture、开发期存档内容版本门禁、设计文档。
  - 入口编辑器只展示真实入口；当前直接启动项使用徽标标识，并提供“设为直接启动项”动作。
  - 新建 / 复制入口时允许一次性深拷贝当前或直接启动入口作为便捷起点；保存后永不继续联动。
  - 保持现有启动模式：无参数直接进入 `defaultEntryId`；`?entry=<id>` 直达指定入口；`?menu` 展示全部入口，
    菜单选中后才播放入口 `introVideo`；读档继续以存档中的世界与位置为准。
- 范围外:
  - 不新增可复用 `StartWorldPreset`、入口模板库或跨入口同步能力。
  - 不改变标题菜单视觉、不把菜单改成默认启动模式、不改变 `?scene` 开发直达优先级。
  - 不改变 SAVE envelope 结构或 `SAVE_VERSION`；只同步其 `contentVersion` 门禁。
  - 不改变 capability-map 完成状态，不顺带重构工程工作台其他页面。
- 明确不做:
  - 不保留 content16 loader、v16→v17 upgrader、旧字段 fallback、旧 fixture 或产品迁移入口。
  - 不以手改 `projects/pal/manifest.json` 代替上游生成器修复。
  - 不把 `defaultEntryId` 解释为模板、父入口或继承来源。

## 前提真值门

### 一句话行为 / 工程前提

启动时确实需要一个稳定入口选择器，但入口之间不需要继承：当前运行时会从所选 `StartWorld` 创建新世界快照，
读档则恢复完整世界和位置，因此顶层伪入口与隐式 fallback 只是双权威兼容层，不是运行时或存档的必要语义。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有 Reforge 工程 manifest、多入口作者模型或当前编辑器 IA，本任务不改变原版玩法机制。 | `docs/phase2/READ-FIRST.md`（二阶段作者工具边界）；当前任务仅重塑二阶段启动配置。 |
| 第一阶段 | N/A：第一阶段没有当前 `CurrentManifest` / 入口编辑器公共合同；启动演出仍沿用当前已实现策略，不以第一阶段猜测改玩法。 | `CLAUDE.md`（阶段边界）；`packages/reforge/src/main.ts:598-627`（当前菜单与 introVideo 的真实执行顺序）。 |
| 当前二阶段 | `CurrentManifest` 同时保存顶层 `entryScene + startWorld` 与可选 `entryPoints`；入口 `startWorld` 可缺省并回退顶层；runtime/UI 会合成兼容入口，形成两套作者真值。 | `packages/content/src/character.ts:73-99`；`packages/reforge/src/main.ts:566-574,631`；`packages/editor/src/core/project-diagnostics.ts:84-99`；`packages/editor/src/ui/ProjectWorkbenchTab.tsx:1207-1235,1341-1424`。 |
| 本任务目标 | 唯一真值为非空 `entryPoints`；每个入口完整自包含，`defaultEntryId` 只选择直接启动入口；不存在伪入口、继承、合成或兼容 fallback。 | 用户于 2026-08-22 明确批准“真实入口中的一个直接启动项 + 各入口独立配置”并要求实现；本卡“设计结论”与验收条件。 |

### 反证与替代解释

- 最强替代解释: 顶层 `startWorld` 可以减少重复 JSON，缺省入口覆盖也能方便多个入口同步修改；保留顶层
  `entryScene` 还能继续兼容单入口工程。
- 当前证据为何不支持该方案:
  - `buildWorld()` 会复制队伍技能、物品和资源，运行态不会保留对配置对象的活引用；继承只发生在 boot 选择期。
    Evidence: `packages/content/src/character.ts:213-250`。
  - 当前存档保存完整 `world + position`，没有依赖默认入口继续解析状态。Evidence:
    `packages/reforge/src/save/types.ts:38-47`。
  - 当前 UI 已必须额外解释“默认入口 / 标题菜单入口”“跟随 / 独立”，并维护两个编辑路径；这正是用户指出的
    额外心智负担。Evidence: `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1207-1235,1341-1424`。
  - 项目正式上线前只允许 current canonical 版本，兼容旧字段不是保留理由。Evidence: `AGENTS.md`“开发期版本纪律”。
- 什么观察会推翻当前前提: 若存在真实产品需求，要求一批入口在后续编辑中持续、显式地共享同一套开局配置，
  独立快照会造成维护问题。届时应另开卡设计有名字、有引用计数、可见可解绑的 `StartWorldPreset`，而不是恢复
  隐式“默认入口继承”。当前 PAL 只有 `new-game` 一项，未发现这种调用需求。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 已核对 boot、menu、`buildWorld` 与 save；继承不是运行时持续语义。
  - 原版 / 第一阶段理解: N/A；本任务不据此改变演出或玩法。
  - extractor / 地图 / 数据解码: N/A；PAL 初始世界由当前发布生成器明确生成，不涉及地图解码。
  - audit / test model: 现有 tests 大量固化双权威形状，但只能证明当前合同被覆盖，不能证明兼容层有产品必要性。

### 用户可见偏离

- 是否主动偏离已核真值: yes（主动移除当前二阶段兼容 / 继承 IA，不偏离原版玩法）
- `before -> after` 一句话: “伪默认入口 + 菜单入口可继承它” -> “只列真实入口，其中一个被明确标记为直接启动项，每个入口完整独立”。
- 代表场景: 工程有“新的故事”和“二周目”两个入口；修改“新的故事”的队伍和金钱后，“二周目”保持不变；
  无 `?menu` 启动选择被标记的直接启动项，菜单仍列出两个真实入口。
- 用户裁决: 2026-08-22 用户已批准。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`：二阶段以内容作者体验和唯一权威模型为目标。
  - `AGENTS.md`“开发期版本纪律”：切换 current schema 后同卡删除旧 upgrader、旧类型、旧 fixture、版本分支和 fallback。
  - `AGENTS.md`“数据迁移类缺陷”：先改 PAL 生成器 / seed 上游，再完整重生成；不得只补生成产物。
  - 用户裁决：入口之间独立配置；所谓“默认”只承担直接启动选择，不承担继承。
- 代码锚点(`file:line`):
  - `packages/content/src/character.ts:52-99`：`StartWorld`、可选入口世界与双权威 manifest。
  - `packages/content/src/character.ts:213-250`：从配置创建 fresh world 的复制语义。
  - `packages/reforge/src/project-loader.ts:162-182,240-257,311-336`：current16 校验、顶层入口场景加载与派生对象。
  - `packages/reforge/src/main.ts:566-631,1162-1171,7064`：入口合成、菜单 / 直达选择、fallback 与战斗预览默认队伍。
  - `packages/reforge/src/runtime-project-view.ts:28-32,198-205`：运行时视图仍投影 eager 默认场景。
  - `packages/reforge/scripts/audit-sfx-readiness.mts:168-233`：审计脚本也合成入口并读取顶层默认世界。
  - `packages/reforge/src/save/types.ts:38-47`：存档保存完整世界与位置，不保存 / 继承入口配置。
  - `packages/editor/src/core/commands.ts:3407-3521`：顶层 StartWorld 与入口表分离命令。
  - `packages/editor/src/core/project-diagnostics.ts:84-194`：旧字段白名单、入口合成和校验。
  - `packages/editor/src/core/project-io.ts:133-143`：保存前校验及兼容字段缺席策略。
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1207-1424`：伪默认行与“跟随 / 独立”UI。
  - `packages/editor/src/core/seed.ts:218-243`：空白工程仍生成顶层入口场景 / 世界且没有显式入口表。
  - `packages/editor/src/ui/ItemTab.tsx:1715-1727`：道具页直接修改顶层 `startWorld.resources`，是隐藏的第二作者。
  - `packages/editor/src/ui/App.tsx:457-499,1094,1404-1417,1897,2054-2063` 与
    `packages/editor/src/ui/DataMode.tsx:93-99,565-567`：默认场景、队长、入口修复与入口标记消费者。
  - `packages/content/src/validate-refs.ts:67-77,1223-1254,1422-1423`：引用校验只消费单一顶层 `startWorld`。
  - `packages/migrate/src/pal-manifest.ts:10-59`：PAL current manifest 唯一生成入口。
  - `packages/migrate/src/pal-current-publication.ts:143-163`：current16 发布门与入口世界校验。
  - `projects/pal/manifest.json:4-64`：当前生成结果确实是双权威形状。
  - `projects/demo/manifest.json`、`projects/e2e-own/manifest.json`：另外两份真实当前工程仍是旧形状。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-design.md:210-235` 固化了旧伪入口 / 继承设计，必须由本卡显式 supersede。
  - `?entry` 当前直达会跳过 `introVideo`，只有从 `?menu` 选择入口后播放；本卡必须保持该启动模式，不顺带改演出。
  - `?scene` 当前只覆盖场景，开局世界仍来自所选入口 / 直接启动入口；本卡保持该调试契约。
  - loader 在读 scene JSON 前就依赖顶层 `manifest.entryScene`；必须先校验 / 解析 `defaultEntryId` 后再决定读取路径。
  - `project.entryScene` 目前被多处当成已解析默认场景缓存；可以保留为派生加载结果，但不得再成为 manifest 第二真值。
  - `CurrentSavePayload.contentVersion` 当前写死 16；schema 切版必须与 current content 同步，但 SAVE8 envelope 不升版。
  - `EditorState.startWorld` 当前镜像 `manifest.startWorld`；canonical 后必须删除该第二真值，让作者、引用扫描和保存门
    统一按真实入口 id 工作。
  - 全仓约 463 处 `entryScene / entryPoints / startWorld` 命中，fixture 改造面大；不得仅修页面。
- 不得重新引入:
  - `entry.startWorld ?? manifest.startWorld`、`entryPoints ?? [synthetic]`、顶层入口场景回退。
  - UI 中不可选择的“默认入口”伪对象、跟随状态、删除覆盖来恢复继承的动作。
  - content16 产品 loader、自动 upgrader、兼容字段、双版本测试或旧 fixture。
  - 用数组首项隐式代表默认；重排不得改变直接启动项。
- 相关测试:
  - `packages/reforge/src/project-loader.test.ts`
  - `packages/reforge/src/save/*.test.ts`
  - `packages/editor/src/core/project-diagnostics.test.ts`
  - `packages/editor/src/core/project-io.test.ts`
  - `packages/editor/src/core/commands.test.ts`
  - `packages/editor/src/ui/ProjectWorkbenchTab.test.tsx`
  - `packages/content/src/validate-refs.test.ts`
  - `packages/migrate/src/demo-project.test.ts`
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/migrate/src/pal-current-publication.test.ts`

## 验收条件

- 功能:
  - canonical manifest 使用 `contentVersion: 17`、必填非空 `entryPoints`、必填 `defaultEntryId`；每个入口的
    `id / label / scene / startWorld` 完整，入口 id 唯一且 `defaultEntryId` 必须命中其中一项。
  - 顶层 `entryScene`、顶层 `startWorld`、可选 `entryPoints`、可选 `EntryPoint.startWorld` 从当前公共类型和当前工程删除。
  - loader 在读取默认场景 JSON 前先验证默认入口；所有入口 scene 与 StartWorld 的 shape、actor、skill、item、seedStats
    引用都被统一校验，错误可定位到稳定入口 id。
  - 无参数 boot 使用 `defaultEntryId`；有效 `?entry` 选指定入口；无效 `?entry` 保持当前“警告后走直接启动项”行为；
    `?scene` 仍为开发直达最高优先级。
  - `?menu` 仍列全部真实入口，菜单选择后播放该入口 `introVideo`；直接启动和 `?entry` 不新增视频播放。
  - battle preview 等需要默认队伍的工具从直接启动入口读取，代码中不存在 `manifest.startWorld`。
  - `?scene` 只覆盖启动场景，不更换所选 / 默认入口的 StartWorld；该现有调试语义有纯函数测试保护。
  - 编辑器列表只含真实入口；直接启动项有清楚徽标 / 状态；无 object 深链默认选中直接启动项；所有字段可编辑。
  - 新建入口一次性深拷贝当前入口（无当前项时拷贝直接启动项），复制入口深拷贝来源；后续修改互不影响。
  - 默认项不可在仍是默认时直接删除，先把其他入口设为直接启动项；最后一个入口不可删除。设置默认、增删、编辑
    使用同一原子命令边界，undo / redo 始终保持不变式。
  - 读档仍由 save 的完整 world / position 恢复；不因默认入口改变而改变已有同 contentVersion 开发存档结果。
  - `EntryPoint.id` 文档不再声称被存档引用；save payload 继续不保存入口 id，并有回归断言。
  - 道具页不再直接写顶层初始资源；初始资源的唯一作者归真实入口 StartWorld，其他页面只能深链到该入口。
- 测试:
  - content：manifest / 入口 shape 与所有 StartWorld 引用的正反例。
  - reforge：默认直启、`?entry`、无效 entry、`?menu`、introVideo 时机、读档覆盖、battle preview。
  - editor：新增 / 复制 / 设置默认 / 阻止删默认 / 编辑独立性 / 深链 / diagnostics / serialize / reopen / undo / redo。
  - migrate：PAL generator / publication 输出 content17；PAL 全量重生成后第二次执行零 diff。
  - 三份真实工程 `projects/pal`、`projects/demo`、`projects/e2e-own` 均通过统一 canonical conformance test。
  - current-only census：产品代码与 current fixture 中 `contentVersion: 16`、`manifest.entryScene`、`manifest.startWorld`、
    synthetic entry / fallback、v16 loader / upgrader 命中为 0（历史任务卡和 Git 历史不纳入）。
  - focused tests 和 typecheck 通过后只跑一次必要全量 gate，不重复运行同一 70 分钟级套件。
- 文档:
  - 更新 `docs/phase2/editor/editor-design.md` 的 X7-1，明确真实入口、直接启动 selector 和一次性复制。
  - 更新 current schema / publication / save 文档与 version 说明；历史任务卡保留历史事实，只追加 superseded 指针。
  - 更新 `docs/phase2/capability-map.md` 中 current version / 入口继承描述，但能力状态不变；看板、任务卡和
    交接日志反映三方签字与最终验证证据。
- 视觉 / 手工验证:
  - 功能界面最小检查：单入口工程、双入口工程、设置直接启动项、复制后独立修改、窄侧栏和键盘焦点。
  - 不为剧情演出重复跑浏览器；菜单视频时序用自动测试锁定，最终 E2E 批次只确认一次。
- E2E 用例登记（剧情 / 演出 / 内容观感必填：入口、准备数据、步骤、预期画面/时序、证据路径）:
  - `?menu&skip-startup=1`：选择带 `introVideo` 的入口，预期只在菜单选择后播放一次，然后按该入口世界进入其场景。
  - 无参数与 `?entry=<defaultEntryId>`：预期直接进入同一入口，不额外播放入口视频。
  - 证据路径待 build 后登记到本卡“视觉验证记录”。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（`packages/content/src/character.ts:73-99,213-250` 证明继承只在配置 / boot 层；
    `packages/reforge/src/save/types.ts:38-47` 证明存档持久化完整 world / position；
    `packages/reforge/src/main.ts:566-631` 证明当前双权威 fallback）
  - design: agree（非空真实入口 + stable `defaultEntryId` + 每入口完整 StartWorld；content17 current-only 切版）
- Kimi:
  - premise: verified（独立直读一手代码：`packages/reforge/src/save/current-codec.ts:58-90` 证明读档只消费 payload
    的完整 world/position，全程不触碰 manifest 入口配置；`packages/reforge/src/save/ops.ts:44` 证明存档由
    world+position 直接构成，无入口 id；`packages/content/src/character.ts:218-250` 证明 `buildWorld` 深拷
    learnedSkills/inventory/resources 产出 fresh world，运行态不回写配置；`packages/reforge/src/main.ts:569-574,631`
    证明合成入口与 `?? manifest.startWorld` fallback 仅存在于 boot 选择期；`packages/content/src/validate-refs.ts:67-84,
    1223-1257,1422-1430` 证明引用校验只消费单一顶层 `startWorld`，双权威是真实现状而非误报）
  - design: agree（非空真实入口 + stable `defaultEntryId` id 指针（符合铁律 5 杜绝位置身份）+ 每入口完整
    StartWorld；content17 current-only 切版与 SAVE8 不变符合 READ-FIRST 铁律 11；loader 先校验入口不变式再算
    scene path 的顺序修正是必要的——现 `project-loader.ts:311-336` 确实先按 `manifest.entryScene` 拼路径读 JSON；
    原子 command + 删默认 fail-closed 与现有 `SetEntryPointsCommand` 不变式风格一致）
- GLM:
  - premise: **verified（2026-08-22，本人一手读码 + 全仓 census 试跑，非代理）**。独立复核：
    1. **三工程双权威形状实测**：pal `cv16 + entryScene s000 + 顶层 startWorld + 1 入口
       new-game(无 startWorld=继承)`；demo `cv16 + entryScene guijie-minju + 顶层 startWorld +
       **entryPoints 完全缺失**`；e2e-own 同 demo（entryScene start）——卡文"另外两份仍是
       旧形状"属实且比描述更旧（连可选入口表都没有）。
    2. **双权威代码锚点复现**：`EntryPoint.startWorld?` 注释自认"缺省 = manifest.startWorld
       （兼容）"；`entryPoints?` 合成注释（character.ts:79-95 区域）；main.ts:631
       `bootEntry?.startWorld ?? project.manifest.startWorld` 与 :7064 battle preview
       直读顶层 startWorld 属实。
    3. **census 试跑（可执行性证明）**：`entryScene|startWorld|entryPoints` 全仓 **467 处/
       88 文件**（与卡文"约 463 处"吻合）；`contentVersion: 16` 字面量 33 处；v16 loader
       命中已为 0（ARCH 折叠后 project-loader 为唯一 loader）。
  - design: **agree（2026-08-22，附必落钉 GE1-GE4，不阻塞准入）**。content17 + 必填
    defaultEntryId（稳定 id 指针）+ 非空全自包含入口 + 一次切版无 upgrader——与三工程
    实测形状、生成器现状和 current-only 纪律相容。
  - **必落钉 GE1-GE4（build 时落实）：**
    - **GE1（Kimi 关注项 4 裁定：11-15 历史字面量本卡清零）**：本人实测恰 **11 处**——
      10 处 stale fixture（editor-history-coordinator:11 / actor-dialogue-commands:15 /
      actor-references:15 / actor-commands:13 / BattleFieldTab:13 / EnemyTab:13 /
      EnemyTeamTab:15 / catalog-controls-test-utils:110 / PoisonTab:13 /
      AssetInspectorTabs:15）+ 1 处 project-loader.test:182 **故意负例**（切版后负例字面量
      改用 16 继续守门）。census token 定 `contentVersion: 1[0-6]`（<17 全禁）成单规则；
      10 处机械替换，规模小，纳入本卡而非另开债卡。
    - **GE2（demo/e2e-own 迁移机制显式化 + ui_samples seed 裁定 N/A）**：两工程无
      entryPoints，须各自合成完整入口（顶层上移 + defaultEntryId）；机制（一次性脚本 vs
      authored fixture 手改）与三工程 conformance test 锚点写入 build 计划。
      **ui_samples seed 核实为 N/A**：ui-review-samples.ts 零触 manifest（本人 rg），
      样本叠加在已 boot 工程之上；build 确认后在卡内记 N/A。
    - **GE3（census 口径两处精确化）**：①`startWorld` token 区分形态——禁
      `manifest.startWorld`/顶层写法，**允许** `entry.startWorld`（新合同合法字段）；
      ②故意负例入 census 白名单显式登记。
    - **GE4（测试矩阵补 3 项 + 1 笔误）**：①seed 空白工程 canonical 形状断言（seed.test.ts
      实存，补进现有文件）；②runtime-project-view entryScene 派生缓存"标注派生 + 不回写"
      断言（Kimi 关注 3 机检形态）；③App 级"无 object 深链默认选中直接启动项"UI 测试；
      ④`pal-current-publication.test.ts` 实名 `pal-current-publication.pal.test.ts`。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi
  - 独立证据锚点: `packages/reforge/src/save/current-codec.ts:58-90`（读档 preflight/restore 只用 payload，
    contentVersion 不匹配 fail-loud，入口配置不参与）；`packages/reforge/src/main.ts:600-628`（introVideo 仅在
    `?menu` 选择后播放，直接启动与 `?entry` 不播）；`packages/reforge/src/main.ts:1164-1171`（`?scene` 只覆盖
    场景 id，世界仍来自所选入口）；`packages/migrate/src/pal-manifest.ts:51-58` + `projects/pal/manifest.json:57-64`
    （PAL 唯一入口无 `startWorld`，切版 = 顶层 startWorld 上移入入口 + `defaultEntryId: "new-game"`，上游生成器
    可完整重生成）；`packages/editor/src/core/commands.ts:3406-3434`（`UpdateStartWorldCommand` 同步镜像
    `EditorState.startWorld`，第二真值确实存在，设计已列入删除范围）
  - 可证伪观察: 若读档/世界恢复路径在 boot 之后仍需经 manifest 入口配置解析状态（例如按入口 id 重建世界或
    回读 `manifest.startWorld`），前提即被推翻——直读 `current-codec.ts:58-90` 与 `main.ts` 读档分支未见此调用；
    若当前 `?entry` 无效时是报错而非警告回退，验收条件“保持警告后走直接启动项”就是行为变更——`main.ts:573-574`
    证实确为 warn + fallback；若 PAL 或其他当前工程存在无法用上游生成器/seed 重建的真实输入，无 upgrader 的
    切版将丢数据——三份工程均由 `pal-manifest.ts` / editor seed / migrate 测试生成，可无转换器重切。
- counter / 分歧处理: 无；如 reviewer 发现真实的持续共享需求、存档依赖入口 id 或 introVideo 时序不同，立即保持 draft / blocked，由用户拍板后重签。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-22）——Codex + Kimi + GLM（GE1-GE4）三方签字齐；前置：ED-PAL-WORKSPACE-MODES-1 工作树收口后在干净分支 `codex/arch-entrypoint-canonical-1` 开始唯一 Coding Owner build。**

### 进入 done 前:审查签字

- Codex: accept（content17 schema / loader / runtime / editor / publication / current-only 边界自验完成；
  content 420、editor focused 75、reforge 828、migrate fast 330 全绿；PAL replay 537/0/0/0；最小浏览器
  功能与窄视口检查 PASS。SFX 审计仅报告既有 72/74 对 64 的容量风险，未发现入口模型回归。）
- Kimi: accept（2026-08-22，独立直读分支 ff5e3a96 一手代码复审，未复跑已通过套件）:
  - schema: `character.ts:73-100` —— `EntryPoint.startWorld` 必填、`defaultEntryId` + 非空 tuple `entryPoints`、
    顶层 `entryScene`/`startWorld` 消失、`CONTENT_VERSION = 17`；`EntryPoint.id` 注释已改“存档不保存入口 id”。
  - 无第二真值 / 继承 / 合成 / fallback: 全仓 grep `manifest.entryScene`、`manifest.startWorld`、`entryPoints ??`、
    `state.startWorld` 均 0 命中；`validate-refs.ts:78,1293-1294,1459-1461` —— `ContentBundle` 改持
    `entryPoints`，引用校验逐入口走 `validateEntryPointStartWorldReferences`（含 party/battler/learnedSkills/
    inventory/seedStats，错误路径用稳定入口 id），设计期发现的“入口级 StartWorld 只过形状校验”真实缺口已补。
  - loader fail-loud 顺序: `project-loader.ts:313-365` —— 原始 manifest 先过 `validateCurrentManifestStartup`
    （`validate.ts:151-237`：必填键 / 版本 / 入口非空 / id 唯一 / defaultEntryId 命中 / 每入口完整 startWorld
    shape），再读 scene index 复核场景存在性，再按入口读 scene JSON（错误归因到 `entryPoints[id].scene`），
    assemble 内统一校验所有入口场景与 StartWorld 引用；`entryScene` 派生缓存注释符合关注项 3
    （`project-loader.ts:89,100`）。
  - runtime 语义: `startup-entry.ts` 纯函数 + `startup-entry.test.ts` 锁定 —— 无参走 `defaultEntryId`；
    无效 `?entry` warn 后回直接启动项（`main.ts:576-579`）；introVideo 仅 `menu-entry` 路由播放
    （`main.ts:640`）；`?scene` 只覆盖场景不换世界（`main.ts:1180`）；battle preview 读直接启动入口
    （`main.ts:7073`）；菜单返回未知入口改为 fail-loud（`main.ts:637-638`）。
  - save: `types.ts:45` `contentVersion: typeof CONTENT_VERSION` 与常量同步；`current-codec.ts:63-81` preflight
    门禁同步 17 且 fail-loud；payload 仍只含 world+position，`ops.test.ts:31` 有“不带入口身份”回归断言；
    SAVE_VERSION 保持 8。
  - editor: `SetStartupEntriesCommand`（`commands.ts:3424-3502`）原子维护 defaultEntryId+entryPoints，
    apply/invert 均保不变式；UI 无伪默认行、徽标 + “设为直接启动入口”、删默认 / 删最后项 fail-closed、
    新增 / 复制一次性 structuredClone（`ProjectWorkbenchTab.tsx:1185-1225`）；保存门
    `assertProjectSaveValid` 先入口校验（`project-diagnostics.ts:655-659`）；ItemTab 顶层资源第二作者路径
    已整段移除（`worldResources`/`onSetWorldResource` 全仓 0 命中），初始资源唯一作者归入口
    StartWorldFields（`ProjectWorkbenchTab.tsx:663-967`）。
  - current-only: `current-only-product-boundary.test.ts:37,80-108` 覆盖三工程 conformance 与 v1[0-6]
    版本分支扫描；`contentVersion 1[0-6]` 字面量仅剩 2 处显式 v16 拒绝负例（卡内白名单允许）;
    三份工程 manifest 均为 canonical content17。
  - 语义偏差说明（已核，非返工）: 有效 `?scene` 现在会跳过 `?menu`（`startup-entry.ts:52-56` + 测试
    57-58 锁定）。旧代码仅 `?entry` 跳菜单，但旧注释与本卡“?scene 开发直达最高优先级”一贯如此声明；
    新行为与文档意图一致，属组合参数的收敛而非用户可见回归。
  - 遗留观察（不阻塞，交 GLM 裁量）: `content/enemy-script.test.ts:85` describe 名仍含
    “contentVersion 10 enemy script schema” 字样，是历史测试套件名而非版本分支代码；GE1 口径为
    11-15 字面量，请 GLM 确认其是否需顺带改名。
- GLM: **accept（2026-08-22 review 终审，本人一手读码 + focused 独立复跑，非代理；基于实现
  提交 ff5e3a96）**。按委托五项逐一验证：
  - **① GE4 三项补测真实落位 ✓**：seed.test:11-21 断言 canonical 形状（defaultEntryId
    'main' + 非空 entryPoints）；runtime-project-view.test:204-215 断言 entryScene 为派生
    缓存值；App.reference-navigation.test「入口页无 object 时使用非首项入口 / 显式 object
    优先」+ ProjectWorkbenchTab.test「无对象深链选中非首项入口，显式对象仍精确定位」——
    深链默认选中直接启动项的 UI 锚点在位。
  - **② GE1 清零 + census 口径 ✓**：`contentVersion: 11-15` 字面量本人 rg 复跑 **0 命中**
    （build 前 11 处全清）；`contentVersion < 17` 残留恰为两个故意负例（validate.test:1124
    期望 17 拒绝 + project-loader.test:261 old manifest 16）——与 build 记录一致。
    boundary 口径按 GE3 精确落地：:58 用 `manifest\.(?:entryScene|startWorld)` 限定形态
    （entry.startWorld 合法不误伤）、:82/:108 禁产品码版本分支 1-16、负例仅存于测试文件
    天然在产品码扫描域之外。
  - **②b Kimi 移交观察裁量（enemy-script.test.ts:85 describe 名）**：该 describe 名
    "contentVersion 10 enemy script schema" 实测导入并测试**当前** `validateEnemies`
    （validate.js），是**陈旧标签而非版本字面量**——不在 GE1 census token（值字面量）域内，
    零运行时/门禁影响。裁定：**非阻塞，登记为后续 content 触卡时的顺手改名债**（一行
    describe 字符串），不重开 accept。
  - **③ GE2 ✓**：三份 manifest 本人 node 实测全部 canonical（cv=17 + defaultEntryId
    new-game + 各 1 个全自包含入口 + 顶层 entryScene/startWorld 清除）；统一 conformance
    以 `test.each(['demo','e2e-own','pal'])('%s manifest is canonical content17 startup
    data')` 落在 boundary:37——三工程同测同门；ui_samples N/A 已记 build 节。
  - **④ 文档 ✓**：editor-design:210-235 重写为真实入口/直接启动选择器/无继承/显式 preset
    另卡；capability-map 补账 2026-08-22（content17/SAVE8 + 本卡摘要）且 N3 行同步
    content17；startup-entry.test 五用例锁定启动合同（含「入口 intro 仅在菜单选择新局时
    播放」——introVideo 时序的代码层锁定）。
  - **focused 独立复跑 ✓**（不重跑全量）：boundary 7/7 + startup-entry 5/5 + seed 9/9
    全绿；四类禁用形态 census 0 命中采纳 Kimi 复核 + build 记录，SFX 72/74 容量风险确认
    为既有、不动阈值。
- counter / 返工处理: 无阻塞项；一条登记债（enemy-script.test:85 describe 改名）。
- 缺签豁免: N/A
- done 准入结论: **allowed（2026-08-22）——Codex + Kimi + GLM 三方 accept 齐，用户验收通过。**

## Draft: 设计与风险

### 设计结论

1. **唯一 schema**

   ```ts
   interface EntryPoint {
     id: string
     label: string
     scene: string
     introVideo?: AssetId
     startWorld: StartWorld
   }

   interface CurrentManifest {
     id: string
     name: string
     contentVersion: 17
     defaultEntryId: string
     entryPoints: [EntryPoint, ...EntryPoint[]]
     content: Record<string, string>
     assets: ManifestAssetConfig
     minimumSaveVersion: 8
   }
   ```

   `defaultEntryId` 是稳定 id 指针而不是顺序；重排列表不改变 boot。没有 `entryScene` / `startWorld` 第二作者。

2. **loader / runtime 数据流**

   - 解析 manifest -> 验证非空 / 唯一 id / default 命中 -> 得到 `defaultEntry` -> 读取其 scene JSON -> 构造
     `LoadedCurrentProjectCore`。内部可保留“已解析默认场景”缓存，但命名 / 注释必须说明它是派生值。
   - boot 选择函数统一返回一个真实 `EntryPoint`：显式有效 `?entry` 优先，否则 default；menu 决策替换该值；读档
     在世界创建 / 场景提交阶段继续覆盖。
   - `buildWorld(entry.startWorld)` 仍是唯一开局建世界入口；工具预览显式取 `defaultEntry.startWorld`。

3. **编辑事务**

   - 用一个原子 command 同时维护 `defaultEntryId + entryPoints`，而不是让“改默认”和“改表”成为可短暂失效的
     两条历史记录；命令 apply / invert 都校验不变式并保持未知 manifest 字段。
   - 默认项删除采用 fail-closed：用户必须先设置另一个直接启动项；不根据数组顺序静默改默认。
   - 一次性复制使用结构化深拷贝策略并写测试证明 nested arrays / records 不共享引用。

4. **current-only 切版**

   - `CONTENT_VERSION` 升到 17，`SAVE_VERSION` 保持 8；save payload 的 `contentVersion` 与 canonical 常量同步。
   - 修改 PAL generator、editor seed / ui_samples seed、`projects/demo`、`projects/e2e-own` 与所有当前 fixture，
     再重生成 PAL；不提供 runtime / editor 旧工程转换器。旧开发存档因 contentVersion 不匹配明确拒绝，由
     Git 保存历史。

5. **不做隐式共享**

   如果未来需要跨入口共享开局配置，必须另建显式 preset 能力（有名字、引用、解绑与删除闭环）。本卡不会用
   `defaultEntryId` 偷渡继承，也不会保留 optional `startWorld`。

### 已知风险

- 风险: schema 跨 content / runtime / editor / migrate / save，遗漏一个顶层字段消费者会产生启动或预览回归。
- 缓解: 先做全量 symbol census，按 package matrix 修改；静态 current-only grep 与 package tests 双门禁。
- 风险: loader 当前在解析 manifest 后立即用顶层入口读 JSON，错误顺序可能让 defaultEntryId 的问题变成模糊 404。
- 缓解: 先纯校验入口不变式，再计算 scene path；为缺省 / 重复 / 悬空 default 和 scene 各写 fail-loud 测试。
- 风险: 编辑器增删 / undo 可能短暂形成 default 指向不存在入口。
- 缓解: 单一原子 command + 删除默认 fail-closed + serialize 前复验。
- 风险: 当前巨大脏工作树包含其他已验收 / 待审改动，直接 build 会混合任务和提交。
- 缓解: 本卡 draft 阶段只新增卡 / 看板；待现有分支收口并由用户完成三签后，在干净分支开始唯一 Coding Owner build。
- 风险: content17 会让现有开发期 save 无法继续加载。
- 缓解: 这是 current-only 规则下的预期切版；在变更说明中明确开发存档需重建，不加旧版本 fallback。

### 主审立场

- Reviewer: Kimi（架构 / schema / runtime 主审），GLM（覆盖 / current-only / 测试矩阵主审）
- 结论: Kimi agree（2026-08-22）+ GLM agree（2026-08-22，附 GE1-GE4；census 试跑 467 处/88 文件、三工程形状、11 处 11-15 字面量、ui_samples N/A 均本人实测）
- 必改项: 无
- Kimi build 期关注项（非门禁，供实现与 GLM 覆盖审查参考）:
  1. loader 现只 eager 读默认入口的 scene JSON（`project-loader.ts:311-336`）；canonical 后要统一校验所有入口
     scene/StartWorld 引用，需新增按入口读 scene JSON 的 IO 与错误定位，注意保持 fail-loud 顺序（先入口不变式，
     再 scene 路径）。
  2. `ContentBundle.startWorld` 是跨包公共消费形状（`validate-refs.ts:67-84`），改为按入口校验会触碰公共接口；
     实现时优先按入口组装校验输入，不要保留顶层单槽形状当兼容层。
  3. `RuntimeProjectView.entryScene`（`runtime-project-view.ts:198-205`）可保留为派生缓存，但命名/注释必须标明
     派生自 `defaultEntryId` 命中的入口，不得回写 manifest。
  4. 若干 editor 测试 fixture 仍写 `contentVersion: 11/13/14/15` 字面量（如
     `editor-history-coordinator.test.ts:33`、`catalog-controls-test-utils.ts:110`）；本卡 census 只要求 16 清零，
     这些历史字面量是否顺带清理由 GLM 覆盖审裁量，不阻塞本卡。
- 是否建议进入 build: 是（待 GLM 签字后开放）

### 三方争议记录(按需)

- Codex: 建议 content17 一次切断旧双权威模型；SAVE8 保持不变；不建立 upgrader。
- Kimi: 同意。补充两点独立观察：(a) 当前入口级 `startWorld` 只过 `validateStartWorldResources` 形状校验
  （`project-loader.ts:180-182`），actor/skill/item 引用校验只覆盖顶层 `startWorld`（`validate-refs.ts:1223-1257`），
  本卡“所有入口统一校验”是在补真实校验缺口，不是纯改名；(b) `character.ts:74` 注释声称入口 id 被“存档引用”，
  与 save payload 事实不符，验收条件要求修文档 + 回归断言是正确的，build 时一并落实。
- GLM: 同意设计；GE1 裁定 11-15 字面量本卡清零（11 处实测，含 1 故意负例改 16）、GE2 demo/e2e-own
  合成入口机制显式化、GE3 census token 精确化、GE4 测试矩阵补 3 项。
- 用户拍板: 2026-08-22 已批准取消伪默认入口和入口继承；其余若 reviewer counter 再单独拍板。

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
  - content / schema：`packages/content/src/character.ts`、`validate.ts`、`validate-refs.ts`、asset / actor
    引用扫描及其测试。
  - runtime / save：`packages/reforge/src/project-loader.ts`、`startup-entry.ts`、`main.ts`、
    `runtime-project-view.test.ts`、SAVE8 current codec / characterization；SFX readiness 当前审计入口。
  - editor：`startup-entries.ts`、commands / session / diagnostics / IO / seed / navigation / reference 图，
    `ProjectWorkbenchTab`、`EntryPointTab`、App / ItemTab 与相关组件测试。
  - publication：PAL generator / publication / migration tests、current-only boundary、demo / e2e-own / PAL 三份
    manifest；当前 schema / save / editor / capability 文档。
- 实现摘要:
  - `CONTENT_VERSION` 切到 17；manifest 只保留必填非空真实 `entryPoints` 与必填 `defaultEntryId`，每入口
    完整拥有 `startWorld`；顶层 `entryScene` / `startWorld`、入口合成、可选继承和 content16 产品路径删除。
  - loader 先校验入口不变式，再读取并统一校验所有入口 scene 与 StartWorld 引用；默认场景仅作为
    `defaultEntryId` 派生缓存。boot / menu / `?entry` / `?scene` / battle preview 共用真实入口解析。
  - 编辑器删除伪默认行和“跟随 / 独立”心智；新增、复制、设置直接启动和受保护删除走原子命令，新增从
    当前选择做一次性深拷贝；无 object 深链选择直接启动项；ItemTab 不再成为顶层初始资源第二作者。
  - PAL 上游生成器改为 canonical content17 后执行正式写入与内建 replay：`managed=537`，首次只写
    manifest，replay `writes=0 / deletes=0 / conflicts=0`；demo / e2e-own 由各自 fixture 直接发布真实入口。
  - `ui_samples` 仅叠加在已加载项目上且不生成 manifest，GE2 记为 N/A。
- 运行命令:
  - `pnpm --filter @type-pal/content check`：33 files / 420 tests PASS，typecheck PASS。
  - editor 六个入口相关 focused suites：6 files / 75 tests PASS；`pnpm --filter @type-pal/editor typecheck` PASS。
  - Reforge 全量：89 files / 828 tests PASS；`pnpm --filter @type-pal/reforge typecheck` PASS。本任务不重复
    运行同一全量套件。
  - `pnpm --filter @type-pal/migrate check:fast`：37 files / 330 tests PASS，typecheck PASS；PAL 重生成后
    原失败两文件复核 2 files / 59 tests PASS。
  - `pnpm --filter @type-pal/reforge audit:sfx-readiness`：当前 loader / sharedScripts 路径完整扫描成功；仅保留
    既有容量风险 `fivePlayerTurnUpper=72`、`authorSixTurnUpper=74`（预算 64），因此审计按设计 exit 1；无入口
    fallback、旧 loader 或 stale baseline violation。
  - current-only census：产品代码中 `manifest.entryScene` / `manifest.startWorld` / 合成 fallback 为 0；三份
    current manifest 顶层旧字段为 0；`contentVersion < 17` 仅保留 content / project-loader 两个显式 v16
    拒绝负例。`git diff --check` PASS。
- 浏览器 / 手工检查:
  - 本地 `http://localhost:6010/?module=project&page=entrypoint`：PAL 单入口只显示真实 `new-game` 与“直接启动”
    标识；新增入口一次性复制 scene / introVideo / StartWorld，切换直接启动项后列表和详情同步；随后两次 undo
    恢复原数据，未触发保存。
  - 1100×800 窄视口：body 与入口工作区 `clientWidth === scrollWidth === 1100`，无横向溢出；按钮、表单、
    tooltip 均暴露可访问名称。测试后关闭临时页并重置 viewport。
- 跳过的检查及原因:
  - 不重复运行已通过的 Reforge 89/828 全量套件；遵守用户“一次通过即可”的时间要求。
  - 不跑剧情菜单视频视觉 E2E；introVideo 时序由纯函数 / runtime 测试锁定，按项目纪律并入代码冻结后的集中 E2E。

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 本地浏览器 DOM / 交互检查 + 1100×800 overflow metrics；新增、设为直接启动、undo 均在内存完成，未保存 PAL。
- 集中 E2E 用例 / 批次: 菜单 introVideo 时序并入代码冻结后的启动 E2E 批次。
- 截图 / 像素检查路径: N/A（本轮为功能布局检查，记录 DOM 与尺寸指标即可）。
- 结论: PASS；真实入口、直接启动状态、一次性复制与窄视口均符合 canonical IA。
- 未完成项: 菜单 introVideo 观感 / 时序只在冻结后的集中 E2E 最终确认一次。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自验 accept；Kimi accept（2026-08-22，独立直读一手代码，无返工项）；GLM accept
  （2026-08-22，current-only / fixture / 文档 / 测试矩阵终审通过）。
- 必须返工项: 无
- Accept / rework: accept

## 用户验收

- 用户结论: 2026-08-22 确认三方审查签字齐，并明确同意验收通过。
- 后续任务: 如真实出现跨入口持续共享需求，另开显式 StartWorld preset 卡，不在本卡恢复继承。

## 交接日志

- 2026-08-22 Codex: 核对 content / runtime / loader / save / editor / migrate 一手证据，确认当前继承只在
  boot 配置层，创建完整高风险任务卡并签 Codex premise/design；未修改实现。Evidence: 本卡“前提真值门”与
  “上下文锚点”。Next: Kimi 独立核 runtime/save/schema 前提并签字，随后 GLM 覆盖审查。
- 2026-08-22 Codex: 三方 premise/design 签字齐；先将既有工作树以 `0ee277ab` 提交并推送，再从该干净提交
  创建 `codex/arch-entrypoint-canonical-1`，任务进入 build。Evidence: build 准入结论；`git status` clean。
  Next: Codex 作为唯一 Coding Owner 实现 content17 canonical 入口模型。
- 2026-08-22 Kimi: 独立直读一手代码（content schema/buildWorld、project-loader、main.ts boot/menu/?scene/
  battle preview、save types/ops/current-codec、editor diagnostics/commands/seed/ItemTab、migrate pal-manifest/
  publication、三份工程 manifest、validate-refs、audit-sfx-readiness），确认继承仅为 boot 配置层 fallback、
  读档完全不消费入口配置、introVideo 时序与 `?scene` 语义与卡内描述一致；签 premise verified / design agree，
  并作为非 Coding Owner 完成独立反证审查。另记录两条独立观察（入口级 StartWorld 引用校验缺口、EntryPoint.id
  注释与存档事实不符）与四条 build 期关注项，均见“主审立场/三方争议记录”；未修改实现文件，任务保持 draft。
  Next: GLM 做覆盖 / current-only / 测试矩阵主审并签字。
- 2026-08-22 GLM（覆盖/current-only/测试矩阵）: 审查完成，签 **premise verified + design agree
  （附 GE1-GE4）**。三工程双权威实测（demo/e2e-own 连 entryPoints 都没有）；census 试跑 467 处/
  88 文件与卡文吻合、cv:16 字面量 33 处、v16 loader 已零；**Kimi 关注 4 裁定：11-15 历史字面量
  11 处实测（10 stale + 1 故意负例）本卡清零**；ui_samples seed 裁定 N/A（零触 manifest）；
  GE3 token 形态精确化防误伤 entry.startWorld；GE4 补 seed/runtime-view/App 三测试锚点 + 1 笔误。
  三签齐，build 准入开放。未改实现文件，未代签。Next: Codex 在干净分支按提示词开工。
- 2026-08-22 Codex: 完成 content17 canonical 入口模型、runtime 启动语义、编辑器入口工作台、迁移发布器、
  三工程数据与 current-only 边界的一次切换；PAL 由上游重生成后 replay 为 537/0/0/0。验证：content
  420、editor focused 75、reforge 828、migrate fast 330 全绿，相关 typecheck 全绿；浏览器验证新增、深拷贝、
  设为直接启动、undo 与 1100px 窄视口通过且未保存 PAL。SFX audit 已迁到当前工程加载路径，仍如实报告既有
  72/74 > 64 容量风险，不改阈值掩盖。Codex 签 implementation accept，任务进入 review。Next: Kimi 独立
  复审 schema/runtime/save/current-only 落地；不得修改实现或重复跑 89/828 全量套件。
- 2026-08-22 Kimi: implementation review 完成，签 **accept**。独立直读分支 ff5e3a96：schema（character.ts
  73-100）、loader 顺序（project-loader.ts:313-365 + validate.ts:151-237）、startup-entry 纯函数与测试、
  main.ts 启动/菜单/?scene/battle preview 接线、save codec/types、editor 原子命令与 UI、ItemTab 第二作者
  移除、migrate 生成器与 current-only 边界、三份工程 manifest；census grep 四类禁用形态 0 命中。四条设计期
  关注项全部落地；记录一条已核语义收敛（有效 ?scene 跳过 ?menu，测试锁定，与文档一贯声明一致）和一条
  非阻塞观察（enemy-script.test.ts:85 历史 describe 名含 contentVersion 10 字样，交 GLM 裁量）。未修改
  实现文件，未标 done。Next: GLM 做 current-only / fixture / 文档 / 测试覆盖终审并签 review accept。
- 2026-08-22 GLM（覆盖/current-only/fixture/文档/测试矩阵）: review 终审完成并签
  **accept**。五项委托逐一验证：GE4 三补测真实落位（seed/runtime-view/App+ProjectWorkbench
  深链锚点）；GE1 11-15 字面量 rg 复跑 0 命中、<17 残留恰两个故意负例、boundary 按 GE3
  限定形态口径落地；**Kimi 移交观察裁定：enemy-script.test:85 describe 名为陈旧标签非版本
  字面量（测的是当前 validateEnemies），登记为后续顺手改名债、非阻塞**；GE2 三工程全部
  canonical（node 实测）+ test.each 统一 conformance + ui_samples N/A 在册；文档四处更新
  与实现一致。focused boundary 7 + startup-entry 5 + seed 9 独立复跑全绿。三方 accept 齐，
  待用户验收收口。
- 2026-08-22 User + Codex: 用户确认三方签字齐并验收通过；任务转 `done`，无返工项。Next:
  回到测试基础设施主线，先恢复 `OPS-TST-PERF-B`；B 转 `review` 后再解除 `OPS-TST-PERF-C` 阻塞。

## 下一位 Agent 提示词

### 当前：无下一位 Agent 提示词

本任务已完成三方 accept 与用户验收，等待仓库收口；后续工作转回 `OPS-TST-PERF-B`，不再从本卡交接。

### 历史：交 GLM 覆盖终审（已完成）

```text
接手任务: ARCH-ENTRYPOINT-CANONICAL-1 显式启动入口与独立开局配置——review 终审（覆盖/current-only/文档/测试矩阵）
任务卡: docs/ops/tasks/ARCH-ENTRYPOINT-CANONICAL-1-explicit-startup-entry-model.md
当前状态: review；Codex 自验 accept，Kimi 已签 implementation accept；分支
  codex/arch-entrypoint-canonical-1（ff5e3a96）。只差 GLM review accept。
你的角色: GLM，覆盖 / current-only / fixture / 文档 / 测试矩阵终审。
先读: 本任务卡全文（重点: 验收条件、Kimi 审查签字逐条证据、GE1-GE4 落钉要求）；
  packages/migrate/src/current-only-product-boundary.test.ts；packages/reforge/src/startup-entry.test.ts；
  packages/editor/src/core/seed.ts 与其测试；docs/phase2/editor/editor-design.md:210-235；
  docs/phase2/capability-map.md 的 current version 描述；projects/ 三份 manifest.json。
已核事实（勿重复全量复跑）: content 420 / editor focused 75 / reforge 828 / migrate fast 330 全绿；
  Kimi 已核 schema、loader 顺序、runtime 语义、save 独立性与编辑器原子命令；四类禁用形态 census 0 命中；
  SFX audit 72/74 > 64 为既有容量风险，不属本卡回归，不要改阈值。
请你做: (1) 复核验收条件的测试矩阵与 GE4 三项补测是否真实落在测试文件里；(2) 复核 GE1 的 11-15 字面量
  清零与 census 白名单口径，并裁量 Kimi 移交的非阻塞观察——packages/content/src/enemy-script.test.ts:85
  的 describe 名 “contentVersion 10 enemy script schema” 是否需顺带改名；(3) 复核 GE2 demo/e2e-own 入口
  合成机制与 ui_samples N/A 记录；(4) 复核文档更新（editor-design X7-1、capability-map、current
  schema/save 文档）与任务卡自身记录一致；(5) 在任务卡签 GLM review accept，或 counter 并写最小返工项
  及 file:line 证据。
不得做: 不修改实现文件；不标 done；不重跑已通过的全量套件。
输出要求: 签字后更新交接日志；若三方 accept 齐，给出交回用户验收的可复制提示词（done 由用户验收后收口）。
```

### 历史：交 Kimi implementation review（已完成，保留交接事实）

```text
接手任务: ARCH-ENTRYPOINT-CANONICAL-1 显式启动入口与独立开局配置——implementation review
任务卡: docs/ops/tasks/ARCH-ENTRYPOINT-CANONICAL-1-explicit-startup-entry-model.md
当前状态: review；Codex 已实现并自验 accept，Kimi / GLM review accept 尚缺；分支
  codex/arch-entrypoint-canonical-1。
你的角色: Kimi，架构 / schema / runtime 主审（先审，之后交 GLM 覆盖终审）。
先读: AGENTS.md；docs/phase2/READ-FIRST.md；本任务卡全文；重点看 packages/content/src/character.ts、
  validate.ts、validate-refs.ts；packages/reforge/src/startup-entry.ts、project-loader.ts、main.ts、
  runtime-project-view.test.ts、save/current-codec.ts；packages/editor/src/core/startup-entries.ts、commands.ts、
  project-diagnostics.ts、project-io.ts、ui/ProjectWorkbenchTab.tsx；packages/migrate/src/pal-manifest.ts、
  pal-current-publication.ts、current-only-product-boundary.test.ts。
已完成: content17 + 必填 defaultEntryId + 非空完整 entryPoints；顶层 entryScene/startWorld、继承、合成、
  content16 产品路径删除；所有入口 scene/StartWorld 统一校验；默认/?entry/?menu/?scene/读档/battle preview
  语义锁定；编辑器新增/复制/设默认/受保护删除/深链闭环；三工程 canonical；PAL replay 537/0/0/0。
验证证据: content 420、editor focused 75、reforge 828、migrate fast 330 全绿；浏览器单入口/新增深拷贝/
  切默认/undo/1100px 窄视口 PASS。SFX audit 当前路径跑通，但仍按既有预算报告 72/74 > 64，两项不要
  当作本任务新回归，也不要改阈值掩盖。
请输出: 独立核对 premise/design 落地与 runtime 语义，检查是否仍有第二真值/fallback/版本残留、loader
  fail-loud 顺序和 save 不依赖入口；在任务卡签 implementation accept，或 counter 并写最小返工项及证据。
不得做: 不修改实现文件；不标 done；不重跑已通过的 89/828 全量套件。若 accept，把可复制提示词交给 GLM
  做 current-only / fixture / 文档 / 测试覆盖终审。
```

### 历史：build 前 GLM / Codex 提示词（保留交接事实）

```text
接手任务: ARCH-ENTRYPOINT-CANONICAL-1 显式启动入口与独立开局配置
任务卡: docs/ops/tasks/ARCH-ENTRYPOINT-CANONICAL-1-explicit-startup-entry-model.md
当前状态: draft；Codex、Kimi premise/design 均已签 verified/agree，build 准入仍 blocked，只差 GLM 签字
你的角色: GLM，覆盖 / current-only / 测试矩阵主审
先读: AGENTS.md；docs/phase2/READ-FIRST.md（铁律 11）；本任务卡全文（重点: 验收条件、上下文锚点、Kimi 在
  “主审立场”记录的四条 build 期关注项）；packages/migrate/src/current-only-product-boundary.test.ts:38-50；
  packages/editor/src/core/seed.ts:218-243；packages/migrate/src/pal-manifest.ts:10-59；projects/pal、
  projects/demo、projects/e2e-own 三份 manifest.json。
已完成: 用户已批准方案；Codex 与 Kimi 分别用一手证据确认“继承不是 runtime/save 必需语义”、当前双权威形状、
  introVideo/?scene/读档语义和 loader 校验顺序问题；设计方案 = content17 + 必填 defaultEntryId + 非空
  entryPoints + 每入口完整 StartWorld，SAVE8 不变，无 upgrader/fallback。
请你做: (1) 核验收条件的测试矩阵是否覆盖任务卡列出的全部相关测试与三份真实工程 conformance；(2) 核
  current-only census 口径（contentVersion:16 / manifest.entryScene / manifest.startWorld / synthetic entry /
  v16 loader/upgrader 命中为 0）是否可执行、是否会漏 Kimi 关注项 4 提到的 contentVersion 11-15 历史测试字面量，
  并裁量其是否属本卡范围；(3) 核 seed / migrate / fixture 改造清单是否完整（含 ui_samples seed、demo-project、
  e2e-own）；(4) 在任务卡签 GLM premise/design（verified/agree 或 counter 并写最小返工项）。
不要做: 不得修改实现文件；不得把任务改为 build；不得只复述 Codex/Kimi 结论，覆盖清单须自己核。
输出要求: 签字附 file:line 证据；更新任务卡交接日志；若三方签齐，把 build 准入结论改为开放并给出交回
  Codex（Coding Owner）的可复制提示词；若 counter，写明返工项并保持 draft。
```


### 给 Codex（三签齐，build 开放——可直接复制）

```text
接手任务: ARCH-ENTRYPOINT-CANONICAL-1 显式启动入口与独立开局配置——build 实现
任务卡: docs/ops/tasks/ARCH-ENTRYPOINT-CANONICAL-1-explicit-startup-entry-model.md
当前状态: draft→build；Codex + Kimi + GLM（GE1-GE4）三签齐，准入已开放。
前置: ED-PAL-WORKSPACE-MODES-1 工作树收口后，在干净分支 codex/arch-entrypoint-canonical-1 开工；
  你是唯一 Coding Owner。
你的工作: content17 一次切版——必填 defaultEntryId + 非空全自包含 entryPoints、删顶层
  entryScene/startWorld/可选语义；loader 先验入口不变式再读 scene JSON；编辑器删伪默认/
  跟随心智与 EditorState.startWorld 第二真值；ItemTab 初始资源唯一作者归入口；SAVE8 不变
  只同步 contentVersion 门禁。
必落钉:
  Kimi 四条 build 期关注项（loader 顺序/ContentBundle 公共形状/runtime-view 派生标注/
    入口级 StartWorld 统一校验补真实缺口）。
  GLM GE1: 11-15 历史字面量 11 处本卡清零（10 处 stale 换 17 + project-loader.test:182
    负例改用 16）；census token = contentVersion: 1[0-6] 单规则。
  GLM GE2: demo/e2e-own 无 entryPoints，各自合成完整入口 + defaultEntryId，机制与三工程
    conformance test 锚点入 build 记录；ui_samples seed 已核 N/A（零触 manifest），确认后记卡。
  GLM GE3: census 区分 manifest.startWorld（禁）与 entry.startWorld（合法）；故意负例入白名单。
  GLM GE4: seed.test 补 canonical 形状断言；runtime-view 派生不回写断言；App 深链默认选中
    直接启动项测试；publication 测试实名 pal-current-publication.pal.test.ts。
验收红线: 467 处改造面按 package matrix 全覆盖；三工程 conformance 全过；重生成二跑零 diff；
  current-only census 全零；focused 后只跑一次全量 gate。
不要做: 不留 content16 loader/upgrader/fallback；不手改 projects/pal 代替上游生成器；
  不把 defaultEntryId 做成继承；SAVE8 envelope 不升版。
完成后: 写 Build 记录并自验，交 Kimi 架构复审 + GLM 覆盖终审 + 用户验收。
```


### 给用户（三方 accept 齐，验收提示词——可直接使用）

验收路径（本地 `http://localhost:6010/`）：
1. 工程 → 入口页：PAL 应只显示真实入口 new-game + "直接启动"徽标，无伪默认行、无"跟随/独立"。
2. 新增入口：应一次性深拷贝当前入口（场景/视频/StartWorld）；复制后分别修改两入口的队伍/金钱，
   互不影响；undo/redo 两步还原。
3. 把另一入口"设为直接启动项"：徽标迁移、列表不变；尝试删除仍是直接启动项的入口应被阻止，
   先切换默认后可删；最后一个入口不可删。
4. 道具页不再出现顶层初始资源编辑（唯一作者归入口 StartWorld）。
5. 启动：无参数与 ?entry=new-game 进同一入口且不播视频；?menu 列真实入口、选择后才播该入口
   introVideo；?scene=xxx 仍直达场景但世界来自所选入口。
6. 旧开发存档被明确拒绝（contentVersion 不匹配）属预期。
验收通过后在任务卡"用户验收"节写结论，Status 改 done。
