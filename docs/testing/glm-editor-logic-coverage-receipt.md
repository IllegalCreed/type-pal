# GLM编辑器命令与引用边界补测回执

任务：[TEST-EDITOR-LOGIC-COVERAGE-1](../ops/tasks/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md)，r1/build。
产品起点`c1cec3adde5b0090acbc6bc1f325ca1301689873`（分支`codex/glm-editor-logic-coverage-r1`自build准入`a5df9fbc`建立；
三签见任务卡）。GLM为白名单测试Coding Owner；官方check/ratchet/严格fast由Codex集成后统一执行。

## GLM设计与矩阵准备

已在任务卡本席完成（premise verified / design agree，04383fa7）：Command apply/invert 不可变合同、
四组目标源码锚点、覆盖缺口独立复算、白名单 8 文件不存在可新增。

## GLM A组 · 通用编辑命令（22 项）

- 测试：commands-world.boundaries(6) / commands-catalog.boundaries(7) / commands-map.boundaries(9) /
  commands-assets.boundaries(2)。
- 命令：`pnpm --filter @type-pal/editor exec vitest run src/core/commands-world.boundaries.test.ts src/core/commands-catalog.boundaries.test.ts src/core/commands-map.boundaries.test.ts src/core/commands-assets.boundaries.test.ts` → exit0。
- 新增（与既有去重后）：A1 世界变量缺目标 no-op/invert 占用拒绝/apply→invert→reapply 往返+深快照自证（既有
  world-variable-commands.test.ts 覆盖增改 undo/同值 no-op/删除阻断主体）；A2 人物重复 id 抛错/插入位与
  reapply/CopyActor 伴随 levelUp/缺来源抛错/DeleteActor 被实体引用阻断（既有 actor-commands 主体）；
  A3 敌人 Add 不查重（现行合同）/Update 缺目标 no-op/patch invert 只回滚 patch 键；A4 场景名缺目标抛错+
  同值 no-op+invert/BindSceneMap 三 no-op/RenameMapAsset no-op 矩阵+invert/CreateProjectMap 缺场景 no-op
  （既有 scene-lifecycle 主体）；A5 图层增/删/移/尺寸+PaintTiles 未触格精确恢复（既有 edit-session 主体）；
  A6 UpdateLocale invert/UpdateAssetLabel 缺目标 no-op+invert（既有 asset-reference-commands 主体）。
- 负控：world-delete-guard-removed、actor-delete-guard-removed、paint-invert-skipped、
  asset-label-missing-target-throws。

## GLM B组 · 角色立绘与表情引用（6 项）

- 测试：actor-dialogue-commands.boundaries(6)；命令：单文件定向 → exit0。
- 新增：B1 空白名/缺表情/同名冲突/同值 no-op + 改写命中全部目标 cue（scene/chunk/enemy）且**不改其它 actor
  引用**（item calm、sharedScripts other）+ invert 完整恢复；B2 被 cue 引用阻断/缺 actor 缺表情 no-op/
  删最后表情保留默认+inverse；B3 无引用立绘组删除+inverse 恢复/缺目标 no-op（既有 test 覆盖重命名主体与
  阻断基础）。引用面按 collector 实际支持域（scenes/items/sharedScripts/scriptChunks/enemies），无空对象假覆盖。
- 负控：expression-delete-guard-removed、rename-rewrite-closure-removed。

## GLM C组 · 组合库命令（7 项）

- 测试：stamp-commands.boundaries(7)；命令：单文件定向 → exit0。
- 新增：C1 重复 id 抛错+manifest absent 路径登记/恢复；C2 缺目标抛错/同值内容不变/authored 不得倒回
  migrated/migrated 显式接管+origin authored+invert 恢复迁移前整项；C3 缺来源抛错/副本 id 冲突走 Add 守卫/
  来源保持；C4 无 proof 拒绝+伪造 proof 引用数拒绝/缺目标 no-op/invert 原索引恢复/恢复时 ID 占用 no-op
  （既有 stamp-commands.test.ts 覆盖增删主体；proof 走真实 StampDeletionProof.fromBatch）。
- 负控：stamp-delete-proof-removed、stamp-downgrade-allowed。

## GLM D组 · 引用与删除守卫（7 项）

- 测试：project-reference.boundaries(4) / project-reference-adapters.boundaries(3)。
- 新增：D1/D2 稳定 key 必须由 owner/section 派生（非派生 key 拒绝）/多目标多来源精确往返（detail/where/
  locator 逐字段）/输入顺序无关；D3 blockers/warnings 分栏/warn 不阻断/replace-suggest 阻断/
  deletionScopeFor 自删来源排除与外部引用保留；D4 current provider 对最小真实 state 产出可查询索引+输入
  不污染；D5 真实 DeleteWorldVariable/DeleteActor 经 provider 阻断/放行→undo 闭环
  （既有 project-reference(-adapters).test.ts 覆盖键防碰撞/结构边/命令域主体）。
- 负控：deletion-warn-misclassified、deletion-scope-removed。
- **D-02 已知漏边按卡保持待修隔离**：本批未新增 disabled/inherit/transition 边的默认红测试，未固化错误合同。

## 负控总账（可重建）

入口：`node docs/testing/glm-editor-logic-coverage-mutants.mjs` → **1 对照 exit0 + 10 针全部 exit1 业务红**
（MUTATION_HIT 见证+4 个被替换产品文件 hash 前后一致）。每组≥2：A4/B2/C2/D2。10 针含 A 组四针
（世界变量守卫/actor 守卫/paint invert/资产缺目标）与 B/C/D 各两针。

## 覆盖对照（同树同 include，输出 /tmp/ed1-cov/）

- 配置：[入仓诊断配置](glm-editor-logic-coverage.config.mts)（复刻官方 editor fast 排除口径
  `coverageTestExcludes`；`GLM_ED_EXCLUDE_BOUNDARIES=1` 为 before 形态）。
- before：`GLM_ED_EXCLUDE_BOUNDARIES=1 pnpm --filter @type-pal/editor exec vitest run --config ../../docs/testing/glm-editor-logic-coverage.config.mts --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=<tmp>/before --coverage.include='**/src/core/commands.ts' --coverage.include='**/src/core/actor-dialogue-commands.ts' --coverage.include='**/src/core/stamp-commands.ts' --coverage.include='**/src/core/project-reference.ts' --coverage.include='**/src/core/project-reference-adapters.ts'`（2256 项 exit0）
- after：同命令去 `GLM_ED_EXCLUDE_BOUNDARIES=1`（2300 项 exit0）。
- 结果（五目标文件）：**行 2595/2739 → 2617/2739（+22），分支 1759/2316 → 1805/2316（+46）**。
  局部测量不冒称官方 fast/full。

## GLM整批交付

- 白名单恰 8 测试 + 1 fixture + 2 诊断/文档（mutants 脚本+诊断 config）+ 本回执；产品/旧测试/配置/基线零修改。
- 定向 **44/44**（6/7/9/2/6/7/4/3）；相邻既有 8 文件 **76/76** 绿；editor `tsc --noEmit` rc0；
  本人文件 Biome 0 error。
- 分类：新增=上表全部；已有证据=各组注记的既有测试锚点；**缺陷=0**（未发现现行合同与实现冲突；
  D-02 漏边保持既有审计归属）；待证=无新增（A3 AddEnemy 不查重为现行合同非缺陷，按合同断言）。
- GLM 不作为自己测试贡献的独立第三方证明；交 Codex 复核集成。

## Codex接收复核（GLM不得填写）

pending。独立复核后核定当前反例是否有效、哪些可合入及后续归属；不代签、不提前done。
