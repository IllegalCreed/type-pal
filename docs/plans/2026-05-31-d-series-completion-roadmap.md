# D 系列(战斗系统)完工 roadmap

> **目标(user 2026-05-31 原话)**:"先把 D 系列全部做完,测完,和 sdl 原版复核一遍逻辑,最后给我用例挨个测一遍"。
>
> **本文档性质**:总 roadmap(批次分解 + 顺序 + 依赖 + 完成判据)。**不是** bite-sized 实施 plan ——
> 按 CLAUDE.md TOP 0,每批的逐步 TDD plan(含完整代码)必须**先读完该批 sdlpal 全 callpath 才写得出来**,
> 故每批进入实施前另起一份 `docs/plans/2026-05-31-d-batchN-<name>.md` 详细 plan(read 清单 → 差异表 → TDD steps)。
>
> **权威状态来源**:[docs/feature-status.md](../feature-status.md) D 段 + [docs/opcode-status.md](../opcode-status.md)。
> 本 roadmap 完成后这些表的 D 段全部应从 ⚠️/⬜ 收口到 ✅(claimed,待 user 拍 verified)。

---

## 工作纪律(全程,违反即 bug)

1. **每批起手先读全 sdlpal callpath**:入口 fn 全文 + 递归 dep fn 全文 + 识别 loop/branch + 列 global state mutation。写到该批详细 plan 顶部"read 清单"。不 grep+stop。
2. **TDD**:每个行为先写失败单测(数据级:gs/battle state dump、字节 diff、log 对比),再写实现。不拿"vitest 全过"当"功能对",但回归测必须有。
3. **数据级测,不靠截图**:Claude 用 gs 状态 + log 验证;截图是 user 用来发现 bug 的,不是 Claude 的判据。
4. **不偷懒不推后**:每批"残"项要么本批做完,要么**明确**移到 M6(音频/手柄等已知 M6 项)并在 feature-status 标注,不私自降级。
5. **commit 节奏**:每个行为/子功能一个 commit,message 引 sdlpal `file:行号`。
6. **复核独立于实现**:每批实施完,跑一遍"逐 sdlpal 行复核"(差异表),user 拍板再标 ✅。

---

## 批次总览(推荐顺序:逻辑正确性优先,演出视觉殿后)

> 排序依据 [[architecture-before-features]] + [[correctness-over-speed]]:先把"战斗算得对不对"收口(Batch 1-4 + 6),
> 再补"好不好看"(Batch 5)。Batch 间依赖见下表"依赖"列。

| 批次 | 名称 | 覆盖 D 项 | 类型 | 依赖 | 预估 |
|---|---|---|---|---|---|
| **B1** | 玩家状态行为正确性 | D8 / D21 | 逻辑 | 无 | 中 |
| **B2** | 敌方 AI 真值 + 脚本驱动 | D9 / D10 / D24 / D27残 | 逻辑 | 无(D24 需 B2 内 D9 先做) | 大 |
| **B3** | 战斗内毒系统 | D15 / D20(紫色) | 逻辑+视觉 | 无 | 中 |
| **B4** | 缺失玩家动作类型 | D2 / D16 / D18残 | 逻辑+UI | B1(status 行为)| 大 |
| **B5** | 战斗演出视觉残留 | D17残 / D19 / D13视觉 / D20(Trance)| 视觉 | B2(D13 逃跑)/ B4(summon·trance 变身)| 大 |
| **B6** | 数值精度 + 装备 | D3残 / D14残 | 逻辑 | 无(建议早做,影响伤害正确性)| 小 |
| **B7** | 全 D 段 sdlpal 逐行复核 + 用例交付 | 全 D | 复核 | B1-B6 全完 | 中 |

> **顺序灵活**:B1 / B6 / B3 互不依赖,可任意先后;B2 早于 B5(D13 逃跑视觉);B4 晚于 B1。
> 若 user 想先看到效果可把 B5 提前,但违背 correctness-first 原则,默认殿后。

---

## B1 — 玩家状态行为正确性(D8 / D21)

**缺口**:
- D8: `confused`(混乱)攻友军 / `paralyzed`(麻痹)跳回合 行为**未在 selectAction 真接**;`boolean` 类状态(haste/protect/dualAttack)**不衰减**。
- D21: `finalizeBattle` **未** clear sleep/confused/paralyzed(整条 ⬜)。

**sdlpal 入口(待详细 plan 完整 read)**:
- `fight.c:1023 PAL_BattlePlayerCheckReady`(状态 gate 决定能否行动 / 自动行为)
- `fight.c:3577 PAL_BattlePlayerPerformAction` 内 confused/sleep/paralyzed 分支
- status 衰减全链(逐回合 kStatus 递减真值,fight.c turn 结算段)
- `global.c:2311 PAL_ClearAllPlayerStatus`(battle.c:1825 战斗结束调用点)

**ts 落点**:
- `core/battle/status.ts`(tickStatusEffects + boolean 衰减)
- `core/battle/battle-system.ts`(selectAction 接 confused/paralyzed 强制行为 + finalizeBattle 调 clearAllPlayerStatus)
- `core/battle/turn-queue.ts`(paralyzed 跳过排程?待 read 确认 sdlpal 真值)

**完成判据**:
- 混乱队员被强制攻击随机目标(含友军);麻痹队员该回合被跳过;睡眠同理。
- haste/protect/dualAttack 按 sdlpal 真值衰减(boolean 状态 sdlpal 是回合计数还是布尔?read 确认)。
- 战斗结束 sleep/confused/paralyzed 全清(其余 kStatus 按 sdlpal 真值保留/清)。
- status.test.ts + battle-system.test.ts 覆盖每条行为。

---

## B2 — 敌方 AI 真值 + 脚本驱动(D9 / D10 / D24 / D27残)

**缺口**:
- D9: 敌 AI 选 target 仍**简版 random + magicRate**;真值 target 偏好(`fight.c:4520 PAL_BattleSelectEnemyTargetIndex`)+ **Bug-1 死循环 safety**(fight.c:4500-4517 全敌死无退出 while)未做。
- D10: `0x67` 改 `wMagic` 后**未真驱动 PerformAction**(仍走 fallback decideEnemyAction);`0x90` 自禁(show-once)/ `0x79` 队伍条件分支在 battle 未实现;`scriptOnBattleEnd` 解析存了**未调**(挂战后 resume)。
- D24: 隐身回合(iHidingTime)"敌不可选队员为目标"未在 target/AI 接。
- D27残: Protect status 除因子 / 敌方目标偏好(并入 D9)。

**sdlpal 入口(待详细 plan 完整 read)**:
- `fight.c:4520 PAL_BattleSelectEnemyTargetIndex`(target 偏好真值)
- `fight.c:79/87 PAL_BattleSelectAutoTarget(From)`(Bug-1 死循环点 4500-4517)
- `fight.c:4551 PAL_BattleEnemyPerformAction`(wScriptOnReady / wMagic 驱动 magic 分支)
- `script.c` 0x67 / 0x90 / 0x79 case + battle gate
- `battle.c` scriptOnBattleEnd resume 调用点

**ts 落点**:
- `core/battle/enemy-ai.ts`(target 偏好 + iHidingTime 排除队员 + Bug-1 safety)
- `core/battle/battle-system.ts` tickPerformAction(0x67 wMagic 驱动 magic action)
- `core/battle/battle-opcodes.ts`(0x90 show-once / 0x79 队伍条件 battle 分支)
- `core/battle/battle-settlement.ts` / finalizeBattle(scriptOnBattleEnd resume)

**完成判据**:
- 敌选 target 按 sdlpal 真值偏好(非纯 random);全敌/全队死时 safety 不死循环。
- 0x67 设 wMagic 后敌人真按该 magic 行动(走 PerformAction magic 分支,非 fallback)。
- 0x90/0x79 battle gate 生效(嘲讽 show-once 不重复;队伍条件分支正确跳转)。
- scriptOnBattleEnd 战斗结束后真跑(剧情触发)。
- 隐身回合敌人 target 候选不含队员。
- enemy-ai.test.ts + battle-opcodes.test.ts 覆盖。

---

## B3 — 战斗内毒系统(D15 / D20 紫色)

**缺口**:
- D15: 战斗内毒 **5 函数**(抗性 `RandomLong` gate + 每回合 `PoisonDamage` 扣血 + 毒槽管理)⬜。大世界 rgPoisonStatus 已做(commit 6792dd8),战斗内未接。
- D20: 中毒**紫色 palette shift**(依赖 D15 战斗毒存在才显)⬜。

**sdlpal 入口(待详细 plan 完整 read)**:
- `global.c:1459-1735` 毒系统 5 fn(AddPoisonForPlayer / CurePoison* / PoisonDamage / etc — read 确认全 5 个名 + 行号)
- 战斗每回合毒结算调用点(fight.c turn 段)
- 中毒精灵 palette shift 真值(battle.c:505 `PAL_BattleDrawAllSpritesWithColorShift` 相关 / 毒色 index)

**ts 落点**:
- `core/battle/status.ts` 或新 `core/battle/poison.ts`(战斗毒槽 + 每回合扣血)
- `core/battle/battle-system.ts`(turn 结算挂毒 tick)
- `present/battle/draw-battle-sprites.ts`(中毒紫色 colorShift)

**完成判据**:
- 敌/我中毒后每回合按 sdlpal PoisonDamage 真值扣血;抗性 RandomLong gate 决定是否中毒。
- 中毒精灵显紫色(palette shift 真值)。
- poison battle 单测覆盖 + 中毒 colorShift 渲染测。

---

## B4 — 缺失玩家动作类型(D2 / D16 / D18残)

**缺口**:
- D2: `summon`(召唤)/ `trance`(变身)/ `equip-battle`(战斗中装备)/ `coop-magic`(协力)action type 这条旧缺口已过期;`R 重复 prevAction` 已做,并于 2026-06-06 修正跨战斗致死回合备份与 Repeat 本轮不覆盖缓存。
- D16: 协力法术 `PAL_GetPlayerCooperativeMagic`(global.c:2013)触发链 ⬜(action type 占位 + handler stub)。
- D18残: `R 重复上次动作` 已做(含跨战斗致死回合备份);自动战斗已做;友方死目标重选按 sdlpal 核验为 N/A。

**sdlpal 入口(待详细 plan 完整 read)**:
- `fight.c:3577 PAL_BattlePlayerPerformAction` 各 `kBattleAction*` case(Summon / CoopMagic / UseItem / Defend / Flee / Magic / Attack / Throw / Repeat)
- `global.c:2013 PAL_GetPlayerCooperativeMagic`(协力法术解算)
- `uibattle.c` 主菜单 R 键(repeat)/ auto-battle(`A` 键 / 0x8A opcode 已写 fAutoBattle 字段)分支
- trance(变身)action(仙剑 trance = 角色变身,read 确认 sdlpal 触发条件)

**ts 落点**:
- `core/battle/actions/`(新 summon.ts / coop-magic.ts / 扩 magic.ts)
- `core/battle/battle-system.ts` tickSelectAction(R 重复 / auto-battle;友方死目标重选旧项已核为 N/A)
- `core/battle/turn-queue.ts`(协力法术多人同步行动?待 read 确认)

**完成判据**:
- 协力法术触发链通(满足条件 → coop-magic action → 解算伤害)。
- summon/trance action type 真做(逻辑层,变身**动画**归 B5)。
- R 重复上次动作 / fAutoBattle 自动战斗 真接菜单;友方目标死后重选 N/A 注释不再作为缺口。
- actions/*.test.ts 覆盖。

---

## B5 — 战斗演出视觉残留(D17残 / D19 / D13视觉 / D20 Trance)

**缺口**:
- D17残: `iBlow` 吹飞位移(0x6B 已写状态,视觉 ⬜)/ `wWave` 屏波 / `keepEffect` 烙背景 / `Summon·Trance` 变身动画。
- D19: 战斗**入场**背景 fade-in + wave 扭曲 + palette cycle ⬜。
- D13: 敌人主动逃**逃跑动画/飞出屏**视觉 ⬜。
- D20: `Trance` 变身 colorShift cycle ⬜。

**sdlpal 入口(待详细 plan 完整 read)**:
- `fight.c` `PAL_BattleShowPlayer{Summon}MagicAnim` / iBlow 位移段 / wWave 屏波段 / keepEffect blit
- `battle.c:34 PAL_BattleDrawBackground` + 入场 fade-in 段
- `battle.c:1376 PAL_BattleEnemyEscape` 逃跑动画段
- Trance 变身 colorShift cycle 真值

**ts 落点**:
- `core/battle/anim-timeline.ts` + `battle-anim-driver.ts`(iBlow/wWave/summon/trance 时间线)
- `present/battle/draw-battle-bg.ts`(入场 fade-in + wave)
- `present/battle/draw-battle-sprites.ts`(Trance colorShift / 逃跑飞出)

**完成判据**:
- 吹飞敌人有位移视觉;屏波/烙背景按 sdlpal;召唤/变身有变身动画。
- 战斗入场背景渐入 + wave 扭曲。
- 敌人逃跑飞出屏动画。
- 实引擎 chrome-devtools 数据级验证(per [[verify-cutscene-bugs-in-real-engine]])+ 可测渲染单测。

---

## B6 — 数值精度 + 装备(D3残 / D14残)

**缺口**:
- D3残: `fight.c:3641 RandomLong(1,2)` 伤害抖动 + crit 系数简化(attack.ts 已 doc 注明)。
- D14残: `scriptOnEquip` 内 `0x2D`/`0x29` + Hand 卸下 `DualAttack` reset 未做。

**sdlpal 入口(待详细 plan 完整 read)**:
- `fight.c:3577 PAL_BattlePlayerPerformAction` 内 3641 附近 RandomLong(1,2) 抖动 + crit 段
- `global.c:1333 PAL_UpdateEquipments`(scriptOnEquip chain + DualAttack reset)

**ts 落点**:
- `core/battle/actions/attack.ts`(RandomLong(1,2) 抖动 + crit 系数真值)
- `core/battle/formulas.ts`(若公式层)
- `core/equip-effect.ts`(scriptOnEquip 0x2D/0x29 + Hand 卸 DualAttack reset)

**完成判据**:
- 物理伤害含 RandomLong(1,2) 抖动 + crit 真值系数。
- 装备 scriptOnEquip 副作用(0x2D/0x29)生效;卸 Hand 装备 reset DualAttack。
- attack.test.ts / equip-effect.test.ts 覆盖。

---

## B7 — 全 D 段 sdlpal 逐行复核 + 用例交付(收尾)

**前提**:B1-B6 全完。

**内容**:
1. **逐 D 项复核**:对 D1-D27 每条,列 sdlpal 真值 ↔ ts 实现差异表(已 ✅ 的也复核,确认无回归)。
2. **feature-status.md / opcode-status.md 更新**:D 段全部 ⚠️/⬜ → ✅ claimed(逐条引 sdlpal 行号 + commit)。
3. **全量回归**:`pnpm test`(game)全过 + typecheck。
4. **用例清单交付**:给 user 一份**可在真机(`?skip-intro` / devpanel B 键 battle picker / P 键三人入队)逐条手测**的用例表 —— 每条:触发步骤 + 预期 sdlpal 行为 + 验证点。覆盖 B1-B6 所有新行为。

**完成判据**:
- D 段权威表无 ⚠️/⬜(除明确移 M6 的音频项)。
- user 拿到用例表,挨个真机测通(user 拍 verified)。

---

## 进度跟踪

- [x] B1 — 玩家状态行为正确性(D8/D21)✅ 2026-05-31 commit 970ff88/3bb440f/42eda6b(详 d-batch1 plan;1343 测试绿)。注:D21 Extra 清不反转 0x30 直接 mutate(D23/0x30 残仍待 B6/D14,**不是** B1 解决)
- [x] B2 — 敌方 AI 真值 + 脚本驱动(D9/D10/D24/D27残)✅ 2026-06-01 commit(c1-c10 + c7;详 [d-batch2 plan](2026-05-31-d-batch2-enemy-ai.md) 13/13)。c1 状态门(sleep/paralyzed/silence/confused)/ c2-c4 enemy→player 物理+魔法公式(def 修/jitter/Protect/autoDefend)/ c3b cover 守护替挡 / c5 iHidingTime 隐身整轮跳过 / c6 scriptOnBattleEnd 战后 resume / c7 真 show-once/re-arm(runScript 返回 wNextScriptEntry 回写)/ c8 dualMove 二动 / c9 群体魔法 target=-1 / c10 D9 RNG 对拍。全绿 1506 + tsc。**不误改坐实**:D9 无 target 偏好(纯随机)/ autotarget 无 Bug-1 / 0x90 不加 battle sync。残:B2 内无
- [ ] B3 — 战斗内毒系统(D15/D20紫色)
- [ ] B4 — 缺失玩家动作类型(D2/D16/D18残)
- [ ] B5 — 战斗演出视觉残留(D17残/D19/D13视觉/D20 Trance)
- [x] B6 — 数值精度 + 装备(D3残/D14残)✅ 2026-05-31 commit(c1-c6:rng rangeFloat+单体公式 / 群攻 crit+division / DualAttack 双击 / 持久 gs.rgPlayerStatus 桥 / 0x2D+Hand reset / 0x29+Wear poison99)。全装备审计坐实特殊效果仅 DualAttack(仙女剑等5把)+ 寿葫芦 regen 未做,已收口;余皆既有 stat 系统已工作。详 [2026-05-31-d-batch6-numeric-equip.md](2026-05-31-d-batch6-numeric-equip.md)。残:enemy→player jitter/autoDefend/Protect → D27/B2;crit 视觉 → D17/M6
- [ ] B7 — 全 D 段 sdlpal 逐行复核 + 用例交付

> 每批进入实施前另起 `2026-05-31-d-batchN-<name>.md` 详细 TDD plan(read 清单 → 差异表 → bite-sized steps)。
