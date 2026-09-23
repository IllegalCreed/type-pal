# TEST-BATTLE-WORKFLOWS-1 · 实施回执（GLM，r2 返工）

任务卡：[TEST-BATTLE-WORKFLOWS-1](../ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md)（r1 设计三签有效；
r1 候选 16ac8cee 被 Codex counter（[独立复核](battle-workflows-review.md)，基点合并 8c0c4a6d），
状态 rework。本回执为 R1～R4 一次返工后的 **r2 候选**，交 Codex 独立重新接收）。
Coding Owner：GLM。分支 `codex/glm-battle-workflows-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-battle`）。
机账：[glm-battle-workflows-evidence.json](glm-battle-workflows-evidence.json)。

## 生产零改动（范围改为真四目标命令）

`git diff 57dda7ed..HEAD -- packages/reforge/src/battle/battle-session.ts packages/reforge/src/battle/battle-core.ts packages/reforge/src/battle/battle-anim.ts packages/reforge/src/battle/enemy-hook-runtime.ts` 输出为空（r1 回执误用整个 `battle/` 目录+`main.ts` 的空 diff 冒充"无产品改动"，该命令会掩盖新增测试文件；本版只列四个生产目标本身）。

## 交付（白名单内，9 个代码文件 + 2 工具，34 项）

- 6 个测试文件：`packages/reforge/src/battle/battle-session.{selection,round,action,script,terminal,writeback}-flows.test.ts`（8+6+6+5+4+5 = **34** 项）。
- 3 个 fixture：`packages/reforge/src/__tests__/battle-workflows/{catalog,session-driver,controlled-io}.ts`（r1 落在 `src/battle/__tests__/`，越出原卡白名单，已迁回并修正全部引用；r1 回执称"11 新增代码"计数错误，实为 9）。
- 2 个工具：[glm-battle-workflows-mutants.mjs](glm-battle-workflows-mutants.mjs)（重写）、[glm-battle-workflows-coverage.config.mts](glm-battle-workflows-coverage.config.mts)（沿用 r1）。

### R1 闭合：fixture 先过生产 guard

每个测试文件首组是 **guard 门**：运行 `assertWfCatalogPassesProductionGuards()`（catalog 内联调用生产
`validateSkills/validateEnemies/validateItems(+itemUseSupportsContext('battle'))/validateActors/
validateBattleSprites`）与 `assertWfDriverFixtureLegal()`（真实构造 BattleSession 并经公开
`writeBackHp` 读回）。fixture 数据补齐现行完整模型：`wfSkill` 含 `cost.mp/target:'oneEnemy'/effects/
animation`；`wfActorDef` 含 `spriteId/battleSprite/`完整 `baseStats`（level/hp/maxHP/mp/maxMP/attack/
defense/magicAttack/speed/luck）；`PLAYER_PROFILE.castEffectBase/attackEffectBase=0`；战斗用品
`use.target:'oneAlly'+effects:[healHp]`（`'scene'` 被 battle 上下文拒绝）；帧资源为真实 `RleFrame`
（宽高/像素/不透明数组一致，11 帧数组，无空对象帧或 `as never`/`as unknown as` 强转）。W6 持久路径
经生产 `buildWorld → createBattlePlayers`（`makeWfSessionFromWorld`），persistentProgress 等由真派生填充。

### R2 闭合：真实业务结果断言（非存活/日志非空）

| 组 | 代表性真实断言 |
|---|---|
| W1 选 8 | ArrowLeft→确认进 `ui='skill'`→确认目标→确认施法：MP **40→20**（公开 `writeBackHp` 读出）+施法日志；healHp 物品 HP 净恢复；Esc 取消施法 MP 保持 40 且落回交付攻击 |
| W2 轮 6 | A 自动：零菜单键到 victory + ≥2 次攻击；R 重复：MP **40→20→0** 精确阶梯、cast 计数=2、MP 尽后第三轮降级普攻；F 力攻零 MP 消耗；目标死亡换存活敌命中 |
| W3 执行 6 | readiness 快照断言真实动作种类 `{kind:'cast',skillId,targetEnemyIdx}`（非计数）；双人 cast+attack 混合集；物品消耗后库存回写 2→1；施法 MP 恰扣一次 |
| W4 屏障 5 | 见下"屏障合同"；敌 ready hook 真实 `playSound`+同敌后续行动；敌 turnStart hook |
| W5 终态 4 | 每终态**精确 resolve 对应 BattleResult**：`victory/defeat/playerFled`；300ms 边界前 probe='pending'；settlement 恰一次（done 后断言）；多屏 2 屏 pending、3 屏 victory |
| W6 写回 5 | 库存 count-1；count-0 清项；HP 终值真写回；`applyActorGrowth` 非空成长（level/maxHP/maxMP/attack/defense 实增）先证变化再证幂等；lifetimeLimit 技能施放→`world.skillUseCounts` 入账 |

观测仍全走公开接口（tick/debugLog/debugReadiness/debugPlayers/done/writeBack*）；异步屏障用微任务
flush + `setTimeout(0)` 宏任务竞速（不 await 永不 settle 的 promise）。

### R3 闭合：屏障、取消与 finally

- **屏障合同三断言**：挂起期间 `prepareCalls===1`（一回合恰好一次准备回调——按键穿透解锁会重复触发
  `beginTurnPreparation` 即红）、MP 保持 40（偷扣即红）、放行后 `p1 ` 开头攻击行恰 1 条（额外提交即红）；
- gate 放行在 `try{...}finally{gate.resolve()}`：断言失败也不遗留挂起 promise，最初断言错误保留；
- `SfxReadinessResourceError`（数组 cause 形式）降级继续到精确 victory；
- 公开 `cancel()`：done 以 `{name:'AbortError'}` 精确拒绝，gate 迟到放行不复活、无新 core 推进。

### R4 闭合：负控工具鉴别力（6 正控 + 9 针全 detected）

工具重写后的硬判据：未知针名 **exit1** 并列出有效针；每针核 `failed[0]` 的**确切 title**（fullName 精确
匹配钉名测试）与**文件路径**；`MUTATION_HIT` 见证必须出现在日志（证明变异实际加载）；失败首行必须是
业务断言（`AssertionError`/`expect(`），**拒绝** `timed out|waitFor` 超时红与普通 `Error`；skipped 不计入
executed；产品 hash 前后不变；判据自测复用真实入口（正常红接受/超时拒/纯 Error 拒）。9 针与钉名：

| 针 | 唯一替换点 | 检出机制 |
|---|---|---|
| w1-menu-input-swallowed | `if (this.ui === 'menu') {`→`if (false) {` | W1 提交后不得停留菜单 |
| w2-auto-disabled | `this.fAuto = true`→`void 0` | W2 A 自动零键到胜利 |
| w2-repeat-lookup-removed | `let act = this.lastActs.get(sel)`→`undefined` | W2 R 重复 MP 阶梯 |
| w3-ui-never-over | `this.ui = 'over'`→`'menu'` | W3 终态可达 |
| w4-preparing-unlock | preparing 早退→按键切 menu | W4 `prepareCalls===1`（重复进准备） |
| w5-settlement-rebuilt | `&& this.settlement === null`→每 tick 重建 | W5 done 后 settlement===1 |
| w5-early-done | `overTimer >= 300`→`>= 0` | W5 边界 probe pending |
| w6-inventory-overwrite-skip | `if (w) w.count = s.count`→no-op | W6 count-1 写回 |
| w6-zero-clear-removed | 清项循环→no-op | W6 count-0 清项 |

最终树复跑：**6 正控 green + 9 针 detected**，rc=0（证据目录 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/bw1-mutants-drUZka/`，含每针 summary/log/config）。r1 曾由 Codex 证实"关闭 A 或 R 后 W2 仍 5 绿、写回空操作 W6 仍 5 绿、preparing 偷扣 MP 后 W4 仍 4 绿"——本版对应针均有业务红。

## 同口径覆盖（官方 fast 选择，输出仅 /tmp）

`/tmp/bw1-r2-coverage/{before,after}` 双 exit0；before 1378 → after **1412**（恰 +34，即本批 6 文件）。
四生产目标逐文件净增（before→after/总分母）：

| 目标 | 行 | 分支 | 函数 |
|---|---|---|---|
| battle-session.ts | 880→905/1331（**+25**） | 761→783/1457（**+22**） | 138→141/181（**+3**） |
| battle-core.ts | 1037→1037/1140（+0） | 977→978/1183（**+1**） | 114→114/118（+0） |
| battle-anim.ts | 316→316/402（+0） | 220→220/318（+0） | 42→42/54（+0） |
| enemy-hook-runtime.ts | 50→50/58（+0） | 40→40/53（+0） | 5→5/5（+0） |

净增 **+25L/+23B/+3F**，全部由 session +25L/+22B/+3F 与 core +1B 构成（分开列示，不合并报功）。
剩余缺口保留分母不虚报：session 426L/674B、anim 86L/98B、hook 8L/13B；session 遗漏行为 render 入口后
（~189 行，视觉侧另卡）与本批未覆盖组合状态。

## 验证总账（最终树）

- 定向 6 文件 **34/34**；相邻 `src/battle/` 19 文件 **267/267**；全 reforge 152 文件 **1412/1412**
  （Codex r1 复核基线 1409 = 1409−31旧+34新，逐项对账吻合）。
- `pnpm --filter @type-pal/reforge typecheck` rc=0（修 `setImmediate`→`setTimeout(0)`、
  `enemyProfile` 返回类型加宽、`ActorDef.template` 幽灵字段后归零）。
- Biome format+check rc=0（9 代码文件+2 工具；r1 实为 exit1 的 7 错误/4 警告已清：import 排序、
  非空断言、未用 helper 删除）。
- 负控工具 rc=0（6+9）。

## r1 勘误（对 Codex R4 第 4 条）

- "11 新增代码文件"→实为 **9**；"format+check rc0"→当时实为 exit1；修复④"done 后才断言"→当时源码
  允许 pending；W6"定位失败 throw"标题实断言 `not.toThrow`；"空 diff 命令"→当时覆盖整个 battle 目录。
  以上均已在 r2 候选修正为本文所述事实。

## 剩余与归属

- session render 段（~189 行）归视觉/渲染侧，本卡不碰；组合状态遗漏保留，不判不可达。
- 敌 hook-runtime 8L/13B、anim 演出臂——后续按消费者细分，不在本卡硬刷。
- Codex r1 冻结见证工具指向旧树路径/旧 fixture API（`battle-workflows-review-witnesses.mjs` 锚
  `src/battle/__tests__/battle-workflows/`），按其本人裁定"不改历史工具凑绿，未来候选由 Codex 适配复核"
  保持原样，未在本分支触碰。
- 无产品疑点；无兼容层新增（测试不再伪造旧技能模型）。
