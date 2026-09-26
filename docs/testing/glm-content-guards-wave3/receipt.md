# TEST-GLM-CONTENT-GUARDS-3 · GLM 作者交付回执

2026-09-26，Owner：GLM；生产冻结 `8add8c66`（八目标模块 sha 见 [frozen-evidence.json](frozen-evidence.json)，
当前源码与冻结点零差异），分支自含本卡的 origin/main（`4c1c5038`）新建
`codex/glm-content-guards-wave3`（worktree 复用 `type-pal-glm-content-guards-wave2`，主工作树未动）。
只新增八份 `.guard-residual.test.ts` + 本目录证据（负控工具 + 回执 + 机账）+ 卡内作者交付块；
产品、旧测试、scripts、配置/超时/排除、官方 baseline、共享 README/看板零 diff。

## r2 counter（R1–R3）的闭合

- **R1**：loop 三行改由同一合法 loop 工厂派生（全部含 `cond`），仅改 mode/yield/maxIterations；
  runSceneHook/craftRecipe 空配方/modifyHostileAwareness 四行改挂 `target:'scene'` 的同型场景效果载体，
  坏输入只改所测字段；投掷行以**完整合法 magicDamage**（fixed 强度）为同型正控，未知元素/强度 kind/
  multiplier kind/min 负/min>max/bonus 负各行的坏输入只破坏所测单字段（multiplier 携带合法 min/max）。
  单轴自证探针（克隆实际坏输入仅修所测字段→同入口 `not.toThrow`）3/3 通过，等价于审查席
  loop-one-axis/use-one-axis/throw-one-axis 见证语义。
- **R2**：新增薄助手 `expectRejectUnchanged`（本次调用前独立快照→执行→立即比较同一实参），
  G3/G8 重写文件全面改用；其余五文件的所有 `expectExactError` 拒绝调用逐一核对，缺失位
  （G1 badInitial 与 next.kind/outcome 第二次调用、G3 startBattle 后三调用、G4 cue 五连/递归后续/
  loadScene 后续、G5 badEnemyId/badOnce/badValue/badFlag、G7 后续效果）全部补齐调用前/后快照对；
  原始标量不做空快照。审查席 label 污染探针（initial 未命中分支改写 `machine.label`）复跑：
  control 9/9 绿、probe 恰红在 badInitial 的深比较断言——候选已抓住。
- **R3**：负控两针描述按 runner 实情勘误（见下表），回执/机账合同声明与计数按最终树
  （111 行；全 content 1133）刷新。

## 八组交付（去重先行；合法 fixture 先过真实 guard；单轴负例配同入口正控；实际入参逐次快照比较）

| 组 | 文件（`packages/content/src/`） | 去重（既有证据，不复制） | 新增轴 | 行数 |
|---|---|---|---|---:|
| G1 | author-flow.guard-residual.test.ts | author-script-current.boundaries 7 条、author-script-core.test 转移/cadence/commandOutcome 引用/SCC/stage id/slot-aware entry、runtime-script-lifecycle/boundaries | stages 空表、machine 空 states、machine initial 未命中、非 initial machine state entry（开 allowSceneEntry 后 initial 合法 entry 正控）、未知 flow kind（经 runtime 入口正控）、stages body 数组门、嵌套重复 command id、非法 yield、未知 next kind、commandOutcome command/outcome 叶、stage entry reveal kind | 9 |
| G2 | author-state.guard-residual.test.ts | author-script-core.test canonical schema 前四条（组合实体正控、持久 selection、inherit 拒绝、vars NaN/扁平 entityState/未知字段） | 空/全量状态正控（follower/mapOverride/双型 cursor）、flags 布尔叶、嵌套 entityState/entityPos/entityLayer 数值叶、followers 数组门、mapOverride 空串、behavior 槽 cursor.at kind 叶 | 8 |
| G3 | author-command.guard-residual.test.ts | author-script-core.test（选择/循环/cursor handoff/legacy each/条件/战斗编排/openShop/transition/malformed control）、current-characterization 4 条、runtime-script-lifecycle/boundaries、对话边界 13 项、G06 跨校验器 | 裸实体 id（animEntity/releaseEntity）、setMultiEntityState entities 禁用与空 targets、loop mode/yield/maxIterations、startBattle enemyTeamId/auto/fieldId/music、callScript 合法正控、selectEntityBehavior channel、selectEntityPage selection 域、setEntityTriggerActivation on/range、selectSceneHooks 空选择与合法正控、loadScene entryId+pos 互斥/facing/modern 约束/未知过渡 | 11 |
| G4 | script-command.guard-residual.test.ts | script-library.test.ts 15 条（stages/pages/entry/资产 id/loadScene 目标/退役命令/动作绑定）、dialog.line 既有 runtime 覆盖之外的退役负例保留、portrait.icon/soundId/unmigrated/playRng 已证 | 数组/kind 门、cue rows text/speed/autoAdvance/portrait 叶、loadScene 空 scene/facing/pos NaN/source 负例/wipe、holdScreen color、revealScreen token、playMusic/playVideo asset、playEntityAction entity/wait、stopEntityAction、setActorAppearance/setFollowers、quitToTitle videos、playFrameAnimation 帧序/frameRate、stopMusic 带参、startBattle.onFlee/teleportOut.onFail/confirm.onNo 嵌套递归臂、checkStages 数组/next 叶/entry prepare 安全/reveal fade·wipe 叶、checkEntityPages animation 三叶/trigger.on、四个投影小函数现行合同（stageIndexFor 越界钳制、applyStageNext advance/number/undefined） | 21 |
| G5 | enemy-hook.guard-residual.test.ts | enemy-script.test 6 条、enemy-script.wave2（cond 11 行/do 正控/fallback/forbidden effect/onDefeated count）、enemy-script.boundaries（hook 基础/AI 结构门）、G06、wave2 叶守卫 91 行 | 未知 AI 动作、summon 缺 enemyId 正控、setFallback 缺省正控、同 state effect id 重复、branch 转移正控、commandOutcome outcome 叶、未知 transition、单 state 双 terminal、rules 数组门/once 叶、onDefeated 数组门/wait 叶/setVar·addVar·setFlag 正负控 | 7 |
| G6 | record-actors.guard-residual.test.ts | validate.test E18-1/C0、validate-actors.boundaries、rewards.boundaries | 非战斗人物+可选域全量正控、expressions 空表情名、casualty fallback 空文本、heal resource 域、tempStatBuff stat 域与 percent 非整数 | 6 |
| G7 | record-skills-poisons.guard-residual.test.ts | validate-skills-poisons.boundaries（毒 16 条矩阵/顶层形状）、validate.test 技能执行分支/敌方 execution/cost items/lifetimeLimit/音效 AssetId | execution.player.animation 正控与音效叶、prepare 未知 kind/剩余 MP 语义、animation effectSprite/落点/数值字段/keepEffect、summon·trance 新旧字段界、resourceDelta 资源域；validatePoisons 冻结零缺仅正控引用 | 9 |
| G8 | record-items.guard-residual.test.ts | validate.test C8 用途契约（合法三用途/gate 缺省/傀儡/15 条非法 each/投掷空效果/8 条安全整数 each/私有脚本/配方资源池/自消耗/装备映射）、validate-author-items.boundaries、validate-author.test | use 效果 kind 域与 extraPoisonRes/applyStatus/removeStatus/applyPoison/curePoison/permanentStatBoost/gate/runSceneHook/craftRecipe·products/drawFromResourcePool·maxRoll/modifyHostileAwareness/scaleCurrentHp/levelUp/dieIfNotPoisoned/placeEntityInFront 唯一效果各臂；checkThrowSpec 元素/强度 kind/casterAttack·multiplier 全分支/fixedDamage/applyPoison/currentHpDamage/applyStatus onResist/killIfHpAtMost/damageAndHealCaster/target/presentation；顶层 id/battleOnly/menuAfterUse/上下文组合/装备叶；作者物品核 kind/label/上下文叶 | 39 |

合计 **111 行**（G3 含一条精确性自证用例）。每拒绝行：先同入口同形状合法正控（确实执行）、只破一轴、`expectExactError` 完整 message
全等、对象/数组实际入参 `deepSnapshot` 前后比较；复用 wave2 已验收的
`__tests__/guard-leaf-fixtures.ts` 助手（expectExactError/expectAcceptsUnchanged，正控意外抛出呈
AssertionError），未新造 fixture 文件。行数为选题结果，不与新增分支数挂钩；池内疑似噪声行
（如 author-script-core:578/876/965、script:744 与既有正控矛盾）未作为负例目标。

## 代表负控（复用 wave2 已验收判据）

[guard-residual-mutants.mjs](guard-residual-mutants.mjs)：同一 judge 函数（恰 exit 对照 0/变异 1、
恰一红、失败记录绝对文件 + Vitest 实际 fullName、其余 109 项全过无 skip、逐条拒混错/timeout
——混错按行首错误构造符、timeout 按首行签名、运行态 load 命中写 entered.json={id,target} 逐针断言、
生产 sha256 每跑不变）+ 判据自测 10 例（五反例/有效红/exit2/null/零执行/对照）+ 1 个 110 项绿对照。
八针每组一针，各自**恰好只红目标 fullName**：

| 针 | 生产注入 | 恰红用例（fullName） |
|---|---|---|
| flow-stages-empty | stages 空表门 → `if (false)` | G1 author/runtime script flow 残差 stages 空数组拒绝且路径精确 |
| world-flags-bool | flags 布尔叶 → `if (false) continue` | G2 world script state 残差 flags 非布尔拒绝且实际输入不变 |
| bare-entity-release | releaseEntity 裸实体门收窄至 vanishEntity | G3 author/runtime command 残差 条件与命令里的裸实体 id 拒绝 |
| dialog-line-retired | dialog.line 退役门 → `if (false)` | G4 checkCommands 残差 dialog.line 退役与 cue rows/autoAdvance 叶拒绝 |
| effect-id-dup | effect id 重复门 → `if (false) void id`（删重复门，`void id` 防 if 吞行） | G5 enemy hook/AI/onDefeated 残差 setFallback 缺省正控与同 state effect id 重复拒绝 |
| actor-percent-int | tempStatBuff percent 整数门 → `if (false)` | G6 validateActors 残差 casualty tempStatBuff percent 非整数拒绝且实际输入不变 |
| skill-placement | 落点模式白名单 → `false` | G7 validateSkills/validatePoisons 残差 animation placement 非法拒绝 |
| item-status-dup | removeStatus 重复门 → `if (false)`（`seen.add` 成条件体，语义无害） | G8 validateItems use 效果残差 removeStatus 重复拒绝且实际输入不变 |

明细见 [evidence.json](evidence.json)；机账目录 `/var/folders/.../type-pal-guard-residual-mutants-rg8ko4`。

## 统一门禁（本批范围，最终树实测）

- 定向八文件：111/111 exit 0（新鲜 JSON，复跑两次均绿）。
- 全 content：**92 文件 1133/1133** exit 0（新鲜 JSON `/tmp/wave3r3-content.json`；基线 8add8c66 的
  content 已含主线资源批增量，本批净增恰 111 行测试身份）。
- TC：`pnpm --filter @type-pal/content run typecheck` exit 0。
- Biome（本批改动文件：八测试 + 本目录三文件）：0 error；仅 guard-residual-mutants.mjs 三个
  `noTemplateCurlyInString` warning——负控针内故意保留的生产源码模板字面量，单列不与 error 混算。
  全 src 另有 `runtime-script.ts:146` 既有 `noUnusedVariables` warning，属分支继承非本批引入。
- docs：`node scripts/docs/check.mjs` PASS；`git diff --check` 干净。
- 不跑全仓 check/ratchet/strict、不逐组跑 coverage（卡面允许的整包一次对照未使用：冻结池即选题依据）。

## 边界与观察

- 未发现产品疑似缺陷，无需缺陷诊断；全部负例为现行公开合同的非法输入，未发明缺失政策
  （未给 cue 行数/字符串长度添加上限，未假定不存在的字段约束）。
- 池内不可达臂如实不测：author-script-core:802（body 数组门被前置 guard 挡住）、:610-612（当前词表
  退役 kind 需直调 checkBaseAuthorCommands + 自定义 commandKinds，属防御性直测未列入）、
  validate assertNever 两处（TS 穷尽保护）、enemy-script `?? 0`/`?? []` 结构性右分支、
  validateStartWorld/manifest/sprites/locale 等非本卡八组区域。
- 视觉 N/A；作者自验不替代 Codex 独立验收；不合 main、不标 done。
