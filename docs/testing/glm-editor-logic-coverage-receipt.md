# GLM编辑器命令与引用边界补测回执

任务：[TEST-EDITOR-LOGIC-COVERAGE-1](../ops/archive/tasks/done/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md)，r1/done（5ca9dad2三席accept，2026-09-18用户授权、Codex统一收口）。
起始产品`c1cec3adde5b0090acbc6bc1f325ca1301689873`，设计签字已齐、build准入a5df9fbc，设计不重签。
GLM原始回执见候选`d531aa24:docs/testing/glm-editor-logic-coverage-receipt.md`，返工回执见
`a3687b75:docs/testing/glm-editor-logic-coverage-receipt.md`（分支相对 467a5f41/c82b0d28 只改白名单；
已合入的 Q1 来自 27e605ef，不属于 GLM 贡献）。2026-09-18 两轮 counter 见
[独立复核](editor-logic-coverage-review.md)（原文保留，最新残项见其顶部）。官方门禁由 Codex 集成后统一执行。

## 残项返工（2026-09-18 第二轮，对应 c82b0d28 收窄 counter）

- **R1 残 1**：shared 手写 cue 补 `portrait.side: 'left'`（现存全部 cue 均经 `checkAuthorDialogueCue` 或含 side 手写）。
- **R1 残 2**：原 AddProjectMapLayer 用例 L3 改用与正控**同一** `legalL3()` 构造（tiles/sources 同非空、
  来源下标入界），不再存在两个同名 fixture 分叉。
- **R2 残**：B1 invert 半边补完整输入不变——invert 前独立 `deepSnapshot(s1)`、invert 后核 `s1` 全状态不变 +
  `s2` 与 apply 前深快照**全状态**相等（不再只比部分域或 key 存在）；**restore-input-mutation 见证转 detected**。
- **R4 残**：enemy 重复 ID 默认合同断言实际撤下，改合法唯一 ID（enemy-y）新增→undo 精确移除+输入不变；
  locale 标题对齐（补同值内容不变+新键新增 invert 移除的真实断言）；A2 物品/A3 敌队战场/A4 落点/A5 碰撞
  逐族表改精确已有测试名（item-commands:66/81/156/190/212、commands:709/749/769/2163/2191/2599、
  stamp-placement-command:160）；after 计数按最终树更正为 **2302**；Q1 来源单列。

## 返工总账（R1～R4 对账 · 2026-09-18）

- **R1 合法输入**：fixture `actorCue` 补 `portrait.side`/rows 对象并经 `checkAuthorDialogueCue` 正控（构造时校验）；
  item 私有脚本补固定 `id:'use'`/`target:'scene'`/`consuming:false`（经 `validateAuthorItemCore` 探针验证）；
  sharedScript.self 改 `'none'`；tinyMap 空格层 tiles/sources 同为 null（新增 `validateProjectMap` 正控用例）；
  L3 新层 sources 下标入界；**stamp 旧 proof 改真实状态变化**——带真实地图的状态经
  `ensureMapReferencesIndexed` 取证 → 真实 `PaintTilesCommand` 使事实过期 → 旧 proof 被生产拒绝
  （扫描不完整/覆盖失配）→ 重新取证放行（正控）；`Object.create` 伪造字段用例删除。
- **R2 断言钉住**：B1 补 actor 目标表断言（旧 key 移除/新 key 指**原 asset** `portrait.hero.angry`/
  未触表情与其它 actor 完整保留）+ apply 后**输入整状态深比较**（locale 侧漏红）+ invert 后输入不被改；
  PaintTiles 补 apply 后输入**整状态**深比较；`s1SnapshotSafe` 空壳删除。
  **Codex 三见证复跑（返工树）：rename-input-mutation / paint-input-mutation / broken-rename-target 均
  detected（业务红），control 绿**；real-closure-removal 维持 MISSED——按 R3 分类为 walker 同源保证的
  防御臂（见下），不伪造不可达不一致强测。
- **R3 负控语义**：`rename-rewrite-closure-removed`（+99）删除——其真实含义是「合法操作被误拒」证明闭合
  守卫存在，非漏改写检测；替换为 `rename-wrong-target-asset`（新 key 指向错误图 → B1 asset 断言红）。
  负控判定收紧为仅认 `AssertionError` 且排除 `TypeError:` 噪音；`asset-label` no-op 用例改显式
  `not.toThrow()` 使突变以业务断言红。closure 防御臂归类：**不可达防御（同源 walker 保证）**，
  不测不强测，回执如实分类。
- **R4 口径与账**：诊断配置改为**直接消费官方 `testSelection(editor,'fast')`** 的结构化
  excludes/testArgs（`coveragePackages` 导入），`vitest list` 核对：pal 测试 0 项、
  `enemy-defeated-events-boundary.test.mjs` 1 项在列——与官方 fast 选择一致，before/after 只差本批 8 文件。
  两条 unused `EditSession` import 清理；标题/声明对齐（assets「同值内容不变」、world 去掉「不留命令痕迹」
  越权声明、B1 补带首尾空格用例、B3 改「缺目标 actor no-op」）；D1 补非派生 key 拒绝用例。

## 逐族分类表（返工后 47 项 = 6/7/10/2/6/8/5/3）

| 族 | 新增测试（用例族） | 已有证据（精确锚点） | 缺陷 | 待证/分类 |
|---|---|---|---|---|
| A1 世界变量 | 缺目标 no-op/invert 占用拒绝/apply→invert→reapply+深快照自证/合法零值 | world-variable-commands.test.ts:64-121（增改 undo/同值 no-op/删除阻断与撤销） | 无 | — |
| A2 人物 | 重复 id 抛错/插入位 reapply/CopyActor 伴随 levelUp/缺来源/DeleteActor 实体引用阻断+占用拒绝 | actor-commands.test.ts（CRUD/undo 主体）；物品族已有=item-commands.test.ts:66「AddItem 深拷贝按位置插入拒绝 id 冲突」/:81「DeleteItem 外部引用 fail-loud」/:156「重算脚本引用」/:190「内部边随 owner 删除」/:212「redo 重验」 | 无 | 物品族不新增（已有六用例覆盖增删改/引用/redo 重验，无新边界） |
| A3 战斗目录 | 合法唯一 ID 新增→undo 精确移除+输入不变/Update 缺目标 no-op/patch invert 只回滚 patch 键 | battle-data-delete-commands.test.ts（删除引用阻断主体）；敌队已有=commands.test.ts:709 UpdateEnemyTeamsCommand 重表替换；战场已有=commands.test.ts:749/769 AddBattleField 追加与重复 id 拒绝 | 无 | 技能 Update 未新增（无独立边界用例，列待证候选）；AddEnemy 重复 ID 为调用方前置（EnemyTab.tsx:743-752），不作为默认回归合同 |
| A4 场景/地图目录 | 场景名缺目标抛错+同值 no-op+invert/Bind 三 no-op/Rename no-op 矩阵+invert/CreateProjectMap 缺场景 no-op | scene-lifecycle.test.ts（场景增删复制主体）；落点已有=commands.test.ts:2163「W4-1 命名落点增改、稳定 id 与 undo/redo 闭环」/:2191「改名/移动不改变引用稳定 id；引用落点禁止删除」 | 无 | — |
| A5 地图数据 | 图层增/删/移/尺寸 invert+Paint 未触格/未触层/整输入不变/validateProjectMap 正控 | edit-session.test.ts:105-125（paint 修订计数主体）；碰撞已有=commands.test.ts:2599「独立碰撞命令与视觉层正交并可撤销」；stamp 来源所有权已有=stamp-placement-command.test.ts:160「legacy Paint* 不能旁路 ownership」 | 无 | — |
| A6 资源/本地化 | locale invert/asset 标签 no-op 矩阵+invert | asset-reference-commands.test.ts（资源引用主体） | 无 | — |
| B1 表情重命名 | 空白+首尾空格/缺表情/冲突/同值+全部目标 cue 改写+其它 actor 不改+目标表/原 asset 钉住+输入不变+invert | actor-dialogue-commands.test.ts:103-117（重命名主体） | 无 | closure 臂=不可达防御（walker 同源） |
| B2 表情删除 | 被引用阻断/缺 actor 缺表情 no-op/删最后表情保默认+inverse | 同上:118-127（阻断/未引用删除主体） | 无 | — |
| B3 立绘组删除 | 无引用组删除+inverse/缺目标 no-op | 同上:118-127 | 无 | — |
| C1 组合 Add | 重复 id 抛错+manifest absent 路径登记/恢复 | stamp-commands.test.ts:59-72（首次登记主体） | 无 | — |
| C2 Replace | 缺目标/同值内容不变/authored 不倒回/migrated 接管+invert | 同上:73-87（接管主体） | 无 | — |
| C3 Duplicate | 缺来源/副本冲突走 Add 守卫/来源保持 | 同上:88-100 | 无 | — |
| C4 Delete | 无 proof 拒绝/**真实旧 proof 过期拒绝+重取证放行**/缺目标 no-op/invert 原索引+ID 占用 | 同上:149-156（删除可撤销主体） | 无 | — |
| D1 稳定 key | **非派生 key 拒绝**（新增用例） | project-reference.test.ts:32-44（键防碰撞主体） | 无 | — |
| D2 快照/索引 | 多目标多来源精确往返/顺序无关 | 同上:45-117（内嵌/locator 往返主体） | 无 | — |
| D3 删除分类 | blockers/warnings 分栏/scope 自删排除 | 同上:282-313（impact 基础+A↔B scope） | 无 | — |
| D4 current provider | 真实 state 查询+输入不污染 | project-reference-adapters.test.ts:89-305（结构边/命令域/legacy 主体） | 无 | script 版本/冷地图/扫描失败拒绝未新增——需真实 loader/失败注入域，列待证（D4 后续候选） |
| D5 真实删除闭环 | DeleteWorldVariable/DeleteActor 经 provider 阻断/放行→undo | 同上 | 无 | 保存/重开序列化链不在本批（需真实 save 链，Codex 集成域） |
| D-02 已知漏边 | 未新增默认红/未固化错误合同 | editor-workflows.md 审计反例 | 保持待修 | 按卡隔离 |

## 负控总账（可重建）

入口：`node docs/testing/glm-editor-logic-coverage-mutants.mjs` → **1 对照 exit0 + 10 针全部 exit1**
（判定收紧为 `AssertionError` 且排除 TypeError；MUTATION_HIT 见证+产品 hash 前后一致）。
每组≥2：A4（world 守卫/actor 守卫/paint invert/资产 no-op）、B2（expression 守卫/wrong-target-asset）、
C2（proof 移除/downgrade 放行）、D2（warn 误分类/scope 移除）。
Codex 三见证（rename/paint 输入污染+错误 asset）在返工树均 detected；real-closure-removal 按防御臂分类不强测。

## 覆盖对照（官方 fast 选择，输出 /tmp/ed1-cov2/）

- 配置：[入仓诊断配置](glm-editor-logic-coverage.config.mts) 直接消费 `testSelection(editor,'fast')`
  （R4 重建）；`vitest list` 与官方 fast 选择核对一致（pal 0 项/mjs 边界 1 项）；before/after 只差本批 8 文件。
- before：`GLM_ED_EXCLUDE_BOUNDARIES=1 pnpm --filter @type-pal/editor exec vitest run --config ../../docs/testing/glm-editor-logic-coverage.config.mts --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=<tmp>/before --coverage.include='**/src/core/commands.ts' --coverage.include='**/src/core/actor-dialogue-commands.ts' --coverage.include='**/src/core/stamp-commands.ts' --coverage.include='**/src/core/project-reference.ts' --coverage.include='**/src/core/project-reference-adapters.ts'`（2255 项 exit0）
- after：同命令去环境变量（**最终树实测 2302 项** exit0；上轮 2301 为提交前树计数，按最终树更正）。
- 结果（五目标文件，最终树 /tmp/ed1-cov3/ 重测）：**行 2572/2739 → 2594/2739（+22），分支 1730/2316 → 1776/2316（+46），
  语句 2871/3256 → 2919/3256（+48），函数 705/729 → 712/729（+7）**。旧正则口径 2256/2300 保留为历史实测，不再援引。
- **Q1 来源单列**：本分支经合并带入主线 27e605ef 的 Q1 main/17 项测试与基线，非 GLM 贡献亦非本包越界修改；
  编辑器产品相对 c1cec3ad 零变，但**全仓**相对 c1cec3ad 因 Q1 合入并非零 diff。
- 相邻既有（完整命令）：`pnpm --filter @type-pal/editor exec vitest run src/core/world-variable-commands.test.ts src/core/actor-commands.test.ts src/core/item-commands.test.ts src/core/actor-dialogue-commands.test.ts src/core/stamp-commands.test.ts src/core/project-reference.test.ts src/core/project-reference-adapters.test.ts src/core/scene-lifecycle.test.ts` → **76/76** exit0
  （Codex 自选集含 battle-data-delete-commands 替换 scene-lifecycle 为 77/77，亦绿）。

## GLM整批交付（返工）

- 定向 **47/47**（6/7/10/2/6/8/5/3）；tsc rc0；本人文件 Biome 0 error；witness 三针 detected；
  负控 10 针全业务红。白名单不变（8 测试+1 fixture+2 诊断+回执）；产品/旧测试/基线零修改。
- 失败记录（不计证据）：map 校验首版 L2 tiles=0/sources=null 非法（正控暴露后改 null/null）、
  stamp 旧 proof 首版经模板新增构造失配（不触 mapIndex/generation，改真实 PaintTiles）、
  config 首版正则口径 2256/2300（pal/mjs 选择漂移，重建后 2255/2301）。
- GLM 不作为自己测试贡献的独立第三方证明；Q1 检查点 17 项与本批分别对账，不混入。

## Codex接收复核（GLM不得填写）

Codex（2026-09-18，最终收口）：已核GLM eacf0a8b/Kimi f82d60b9与本席accept同钉5ca9dad2，候选后产品/测试/基线零漂移，无生效counter；用户授权done，已归档并同步看板/索引。后续归属照台账另推，上传WIP未触碰。以下保留历轮复核时点。

Codex（2026-09-18，来源8e8ae831，集成5ca9dad2）：**accept**，R1/R2/R4残项关闭、R3不重开。
实际fixture验证、47/76、tsc/Biome、10负控与**四**独立见证通过；原文“三见证”属早先返工时点，最终含restore-input-mutation。
集成只订正新测试标题与fixture术语注释，不改任何断言；首次check术语门失败保留，修正后完整check7282、官方ratchet和受保护单次严格fast6794/617通过。
八新测试/47项，旧editor210文件identity/计数与其它六包完整基线对象不变；五目标局部仍+22行/+46臂，另命中tileset-references 1行/1臂，官方全包增量为+23/+47。
Q1(27e605ef)17项与主工作区上传WIP均单列，GLM贡献身份披露；后续归属与完整证据见[最新接收复核](editor-logic-coverage-review.md)。
本席结论取代下列历史counter，不代签GLM/Kimi、不标done。

Codex（2026-09-18，a3687b75返工）：counter收窄为R1/R2/R4残项；47/76、tsc/Biome、10反控和原三见证通过，选择口径已修，实际2255→2302。R3关闭；不合入、不跑接收后官方门禁、不重签设计。证据见[最新复核](editor-logic-coverage-review.md)。

Codex（2026-09-18）：counter，d531aa24暂不接收、不集成。44/44与原负控退出码通过，但合法fixture、原输入/业务输出断言、负控语义和覆盖口径有R1～R4阻断；详见[复核与可重建见证](editor-logic-coverage-review.md)。官方基线未改，返工不重签设计。
