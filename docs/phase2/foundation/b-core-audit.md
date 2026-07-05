# 战斗核心逻辑三方逐函数审计(公式 / 状态机 / 回合队列 / 结算)

| 字段 | 值 |
|---|---|
| 审计日期 | 2026-07-05 |
| sdlpal C 真值 commit | `16c0719e`(主仓 `reference/sdlpal/`,monorepo 同 HEAD) |
| 一阶段 .ts commit | `16c0719e`(monorepo 同 HEAD) |
| reforge .ts commit | `16c0719e`(monorepo 同 HEAD) |
| 审计单元 | 4(战斗公式 / 战斗状态机 / 回合队列 / 战斗结算) |
| 方法 | sdlpal C 真值语义 → 一阶段逐函数对照(含 git log 踩坑)→ reforge 逐函数对照(✅/⚠️/❌/✨)→ 缺口 + 风险 + 行动 |

> 全文行号锚点都基于上述 commit。判断必有 `文件:行`。
> 路径简写:`fight.c` = `reference/sdlpal/fight.c`;`battle.c` = `reference/sdlpal/battle.c`;`global.c` = `reference/sdlpal/global.c`。

---

## 审计单元 1:战斗公式

> 覆盖 sdlpal `fight.c` 5 函数:`PAL_CalcBaseDamage` / `PAL_CalcMagicDamage` / `PAL_CalcPhysicalAttackDamage` / `PAL_GetEnemyDexterity` / `PAL_GetPlayerActualDexterity`。
> 三方文件:sdlpal `fight.c` → 一阶段 `packages/game/src/core/battle/formulas.ts` → reforge `packages/content/src/battle-formulas.ts`。

### 1.1 sdlpal C 真值(`reference/sdlpal/fight.c`)

#### `PAL_CalcBaseDamage`(fight.c:131-171)
- **签名**:`SHORT PAL_CalcBaseDamage(WORD wAttackStrength, WORD wDefense)`。
- **三段公式**(palxex/shenyanduxing):
  - `atk > def` → `(SHORT)(atk*2 - def*1.6 + 0.5)`(fight.c:159)
  - `atk > def*0.6` → `(SHORT)(atk - def*0.6 + 0.5)`(fight.c:163)
  - else → `0`(fight.c:167)
- **关键语义**:`(SHORT)` 是 C 浮点→有符号 16 位截断(truncate-towards-zero)。WORD 入参 0..65535;`atk*2` 可达 131070 → SHORT cast 溢出回绕(**65535 → -2**)。

#### `PAL_CalcMagicDamage`(fight.c:174-249)
- **签名**:6 参(`wMagicStrength, wDefense, rgwElementalResistance[NUM_MAGIC_ELEMENTAL], wPoisonResistance, wResistanceMultiplier, wMagicID`)。
- **流程**:
  1. `wMagicID = rgObject[wMagicID].magic.wMagicNumber`(fight.c:210,外层解析 magic struct)
  2. `wMagicStrength *= RandomFloat(10, 11); wMagicStrength /= 10`(fight.c:215-216,WORD 中间值)
  3. `sDamage = PAL_CalcBaseDamage(wMagicStrength, wDefense); sDamage /= 4`(fight.c:218-219)
  4. `sDamage += lprgMagic[wMagicID].wBaseDamage`(fight.c:221)
  5. 元素分支(fight.c:223-247):
     - `wElemental > NUM_MAGIC_ELEMENTAL(5)` → **poison**:`sDamage *= (10 - wPoisonResistance / mult)`(fight.c:229)
     - `wElemental == 0` → `sDamage *= 5`(fight.c:233,**死分支**:外层 `!= 0` 已拦,永不命中)
     - `wElemental 1..5` → `sDamage *= (10 - elemRes[elem-1] / mult)`(fight.c:237)
     - 通除 `sDamage /= 5`(fight.c:240)
     - `wElemental <= 5` → `sDamage *= (10 + battleField.magicEffect[elem-1]); sDamage /= 10`(fight.c:244-245)
- **关键语义**:每步 `sDamage *= FLOAT` 都隐式 SHORT 截断(C `SHORT *= FLOAT` 是先乘后截回 SHORT)。`NUM_MAGIC_ELEMENTAL = 5`。

#### `PAL_CalcPhysicalAttackDamage`(fight.c:253-285)
- **签名**:`SHORT PAL_CalcPhysicalAttackDamage(WORD atk, WORD def, WORD wAttackResistance)`。
- **流程**:`sDamage = PAL_CalcBaseDamage(atk, def)`;`if (wAttackResistance != 0) sDamage /= wAttackResistance`(fight.c:280-282)。
- **关键**:`resist == 0` 不除(防 div-by-zero);resist 典型值 **1/2/3**(原版物理抗档位)。

#### `PAL_GetEnemyDexterity`(fight.c:289-332)
- **签名**:`SHORT PAL_GetEnemyDexterity(WORD wEnemyIndex)`。
- **PAL_CLASSIC 路径**(fight.c:311-312):
  `s = (e.wLevel + 6) * 3 + (SHORT)e.wDexterity`
- **非 PAL_CLASSIC 分支**(fight.c:314-330,M3/reforge 不实现):`s<20 → s=20` 下限;haste `*6/5`;slow `*2/3`。

#### `PAL_GetPlayerActualDexterity`(fight.c:336-389)
- **签名**:`WORD PAL_GetPlayerActualDexterity(WORD wPlayerRole)`。
- **base**:`wDexterity = PAL_GetPlayerDexterity(wPlayerRole)`(fight.c:354;global.c:1831-1865 = `rgwDexterity + Σ装备效果`,**无 level 项**,PAL_CLASSIC 多算一件装备)。
- **PAL_CLASSIC 路径**(fight.c:358-359, 382-387):
  - haste → `wDexterity *= 3`
  - 上限 999(`if (wDexterity > 999) wDexterity = 999`)
- **非 PAL_CLASSIC 分支**(fight.c:360-380):haste `*6/5`;slow `*2/3`;dying(`PAL_IsPlayerDying`)*4/5;**无 999 上限**。

### 1.2 一阶段对照(`packages/game/src/core/battle/formulas.ts`)

#### `asShort`(formulas.ts:19-21)✅
- `(n << 16) >> 16` 模拟 C `(SHORT)` 截断到 -32768..32767。
- **溢出测试**:`calcBaseDamage(65535, 0)` → `(65535*2 - 0 + 0.5) = 131070.5 → trunc=131070 → asShort → -2`(`__tests__/formulas.test.ts:39-42` 断言 `-2`)。**65535→-2 溢出语义已验证**。

#### `calcBaseDamage`(formulas.ts:36-44)✅
- 三段公式 1:1。`Math.trunc` 对齐 C truncate-towards-zero(注释 formulas.ts:33-34 指出 `Math.floor` 对负值有差异,但三段保证非负故等价)。

#### `calcPhysicalAttackDamage`(formulas.ts:54-60)✅
- `resist != 0 → asShort(trunc(damage / resist))`(formulas.ts:57)。
- **res 1/2/3/0 对齐测试**:`__tests__/formulas.test.ts:46-49` 断言 res=1→120 / res=2→60 / res=3→40 / res=0→120(不除)。**对齐**。

#### `calcMagicDamage`(formulas.ts:112-158)✅
- 5 步流程 1:1。每赋值点 `asShort`(formulas.ts:121-154)保 sdlpal `SHORT *= FLOAT` 逐步截断。
- **死分支 elem==0**:`formulas.ts:99` 注释明确"sdlpal 死分支,被外层 != 0 拦截 —— 此处不实现"。
- **rngFactor 注入**:替代 `RandomFloat(10,11)/10`,把 RNG 职责外移(formulas.ts:82-85),纯函数可测。
- **测试**:`__tests__/formulas.test.ts` 覆盖 elem 0/1..5/6(poison)、毒抗 0/50/100、rngFactor 0.5/1.0。

#### `getEnemyDexterity`(formulas.ts:179-181)✅
- `(level + 6) * 3 + asShort(dexterity)`(formulas.ts:180)PAL_CLASSIC 1:1。
- 非 classic 分支注释标"M3 不实现"(formulas.ts:174-177)。

#### `getPlayerActualDexterity`(formulas.ts:207-216)✅
- PAL_CLASSIC:haste `*3`(formulas.ts:209-211)+ 上限 999(formulas.ts:213-214)。
- 签名 `(baseDexterity, status: PlayerStatusFlags)`,status 带 slow 字段但注释明确 PAL_CLASSIC 路径忽略(formulas.ts:185-186)。

### 1.3 reforge 对照(`packages/content/src/battle-formulas.ts`)

#### `asShort`(battle-formulas.ts:13-15)✅
- 与一阶段完全一致 `(n << 16) >> 16`。

#### `calcBaseDamage`(battle-formulas.ts:27-31)✅
- 三段公式 1:1。**溢出测试**:`battle-formulas.test.ts:25` 断言 `calcBaseDamage(65535, 0) === -2`。**65535→-2 溢出已 port**。

#### `calcPhysicalAttackDamage`(battle-formulas.ts:37-41)✅
- res 1/2/3/0 测试全过(`battle-formulas.test.ts:31-35`)。**res 除法对齐**。

#### `calcMagicDamage`(battle-formulas.ts:82-105)✅
- 5 步流程 1:1,每步 asShort。elem 0/1..5/6 + 毒抗 + rngFactor 测试全覆盖(`battle-formulas.test.ts:42-73`)。

#### `getEnemyDexterity`(battle-formulas.ts:112-114)✅
- `(level + 6) * 3 + asShort(dexterity)` PAL_CLASSIC 1:1。

#### `getPlayerActualDexterity`(battle-formulas.ts:121-125)✅
- PAL_CLASSIC:haste `*3` + 上限 999。**注意签名简化**:一阶段 `(baseDex, status: {haste, slow})` → reforge `(baseDex, haste: boolean)`(battle-formulas.ts:121),去掉无用的 slow 字段(因 PAL_CLASSIC 不读 slow)。

### 1.4 单元结论

| 重点核对项 | sdlpal | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| SHORT cast 溢出 65535→-2 | fight.c:159 `(SHORT)` | formulas.ts:19 `asShort` + 测试 | battle-formulas.ts:13 `asShort` + 测试 | ✅ 三方对齐 |
| 物理 res 1/2/3/0 除法 | fight.c:280-282 | formulas.ts:54-60 + 测试 | battle-formulas.ts:37-41 + 测试 | ✅ 三方对齐 |
| dexterity CLASSIC vs WIN95 | fight.c:336-389 | formulas.ts:207-216 用 **CLASSIC**(haste×3 + cap 999) | battle-formulas.ts:121-125 用 **CLASSIC** | ✅ reforge 选 CLASSIC,与一阶段一致 |
| 死分支 elem==0 *=5 | fight.c:233(永不命中) | formulas.ts:99 注释不实现 | battle-formulas.ts(未实现 elem==0 分支) | ✅ 一致(都不实现死分支) |

**单元 1 缺口**:无。三方逐函数 1:1 对齐,测试覆盖溢出/除法/元素/毒抗/rng。

---

## 审计单元 2:战斗状态机

> 覆盖 sdlpal `battle.c` `PAL_BattleMain` + `fight.c` `PAL_BattleMain` CLASSIC 主循环(状态流转 / 队列消费 / Phase 转移)。
> 三方文件:sdlpal `battle.c` + `fight.c` → 一阶段 `packages/game/src/core/battle/battle-system.ts`(3507 行,核心) → reforge `packages/reforge/src/battle/battle-core.ts` + `battle-session.ts`。

### 2.1 sdlpal C 真值

#### `PAL_BattleMain` 主循环状态机(fight.c:1093-1601, PAL_CLASSIC 分支)
- **状态字段**:`g_Battle.Phase`(kBattlePhaseSelectAction / kBattlePhasePerformAction / ...),`g_Battle.iCurAction`。
- **关键流程**(fight.c:1093-1591):
  1. **Phase SelectAction**(fight.c:1094-1442):逐队员 UI 选行动;`fRepeat/fForce/fFlee` 标志;全员选完 → 进队列构建。
  2. **队列构建**(fight.c:1449-1585):见 [单元 3](#审计单元-3回合队列)。
  3. **Phase PerformAction**(fight.c:1590):`g_Battle.Phase = kBattlePhasePerformAction`。
  4. **消费循环**(fight.c:1599-1609):`iCurAction >= MAX_ACTIONQUEUE_ITEMS || ActionQueue[iCurAction].wDexterity == 0xFFFF` → 回合结束(清 fDefending、复位 pos、Phase 回 SelectAction)。

#### `PAL_BattleCommitAction`(fight.c:1666-2024)玩家行动 commit
- **PAL_CLASSIC 物品消耗分支**(fight.c:1900-1917):`kBattleActionUseItem` 非 consuming 不扣;`kBattleActionThrowItem` + consuming 类 → `nAmountInUse++`。
- **非 CLASSIC 等待时间计算**(fight.c:1923-1980):magic `flRemainingTime = wCostMP + 5`(治疗系 `/3`,酒神 175);其他动作 = 0。
- **CLASSIC flee**(fight.c:1975-1979):`if (wActionType == kBattleActionFlee) g_Battle.fFlee = TRUE`。
- **状态推进**(fight.c:1983-1984):`rgPlayer[i].state = kFighterAct; UI.state = kBattleUIWait`。

#### 敌人行动 `PAL_BattleEnemyPerformAction`(fight.c:1175-1262, PAL_CLASSIC)
- **dualMove 触发**(fight.c:1239-1242):
  `fDualMove = (!fFirstMoveDone && (e.wDualMove >= 2 || (e.wDualMove != 0 && RandomLong(0,1))))`
  → **wDualMove=1 是 50% 随机双动;wDualMove≥2 是必双动**。
- **fOnlyPuppet 门控**(fight.c:1094, 1135-1141, 1233):全队都是傀儡状态时敌人不行动(`!fOnlyPuppet`)。

#### `PAL_BattleStartBattle`(battle.c:1556-1760)战斗初始化
- **开战清 hidden exp count**(battle.c:1579-1585):7 池 `wCount` 全清零。
- **傀儡复活**(battle.c:1573-1577):开战时 hp==0 的队员回 1 血 + 清 `kStatusPuppet`。
- **PAL_CLASSIC 敌人初始化**(battle.c:1716-1736):仅存 `wObjectID` + `state=kFighterWait`;非 CLASSIC 才有 flTimeMeter + 一堆 dex HACK。

### 2.2 一阶段对照(`packages/game/src/core/battle/battle-system.ts`)

#### Phase 状态机(battle-system.ts, 3507 行)
- **状态字段**:`state.phase`('selectAction' / 'performAction' / 'won' / 'lost' / 'fled' ...),`state.currentActionIndex`。
- **selectAction → performAction 转移**(battle-system.ts:809-847):全员选完 → 算 playerSlots/enemySlots → `buildActionQueue` → `phase='performAction'`。✅ 对齐 fight.c:1449-1591。
- **回合末清理**(battle-system.ts:3030-3036):清 fDefending(sdlpal fight.c:1604);DL 注释指出 sdlpal fight.c:1602-1609 同序。

#### 玩家行动 commit + 物品消耗
- **物品消耗**:`actions/use-item`(未在本审计文件,但 battle-system 调用)。一阶段已实现 consuming 扣 `nAmountInUse` 语义。
- **flee**:改为行动时掷骰(battle-system.ts 注释 `fight.c:4143 语义`),非选了即逃。

#### 敌人 dualMove 门控
- **dualMove 布尔化**(battle-system.ts:800-803):`const dualMove = e.e.dualMove !== 0`。
- **⚠️ 注释自承认偏差**(battle-system.ts:800-802):"`if (e.wDualMove)` **无条件**入列两次,无任何掷骰 —— wDualMove 任意非 0 每轮必双动。dualMove=1 敌人(含林月如一/二 boss)威胁减半,且每轮多耗一次 RNG。"
  → **一阶段把 wDualMove=1(50%随机)和 ≥2(必双动)统一当"必双动"**。这是已知偏差,非 bug,作者知情。

#### 傀儡 / 死亡队员保留出手
- **DL3/DM7 修复**(commit `319cdc26`):"perform 期补 ValidateAction 降级链 + 傀儡死亡队员保留出手"。
- **傀儡门控**:kStatusPuppet > 0 的死亡队员仍可被攻击/行动(镜像 sdlpal fight.c:75, 950, 1282)。

### 2.3 reforge 对照(`packages/reforge/src/battle/battle-core.ts`)

#### `BattlePhase` 状态机(battle-core.ts:26)
- `'preBattle' | 'selectAction' | 'performAction' | 'won' | 'lost' | 'fled'`(battle-core.ts:26)。
- **比一阶段多 `preBattle`**(battle-core.ts:280-283):首 step 进 selectAction + turn=1。语义无害(headless 启动钩)。

#### `stepBattle`(battle-core.ts:278-341)
- **selectAction 分支**(battle-core.ts:284-304):活队员都选了 → build queue → `phase='performAction'`。✅ 对齐。
- **performAction 分支**(battle-core.ts:305-337):
  - `shift()` 消费队列首(battle-core.ts:306)—— 用 JS array shift,非 sdlpal 的 iCurAction 游标。语义等价。
  - 队列空 → status 衰减 + turn++ + 回 selectAction(battle-core.ts:307-314)。✅
  - enemy/player action 后判胜负(battle-core.ts:328-336)。✅
- **防御就位时机**(battle-core.ts:299-302):build queue 时按 pendingActions 预设 `defending`,贯穿整个 performAction。注释"原版语义:防御者本回合受击减半,不论敌人是否先手"。✅

#### 玩家行动 `performPlayerAction`(battle-core.ts:431-523)
- **defend**(battle-core.ts:452-457):记 hidden defense+2 + 日志。✅
- **flee**(battle-core.ts:458-475):`str = fleeRate; def = Σ活敌(fleeRate + (level+6)*4); roll ∈ [0,def]; str>=roll 成功`(battle-core.ts:461-468)。✅ 对齐 fight.c:4143。
- **item**(battle-core.ts:476-503):consuming 扣库存 + healHp/healMp/revive。✅
- **cast**(battle-core.ts:504-507):转 `applyPlayerSkill`。✅
- **attack**(battle-core.ts:508-522):hidden attack+1/maxHP+R(2,3) + `resolveAttack`。✅

#### 敌人行动 `performEnemyAction`(battle-core.ts:583-665)
- **decision 走 AI 规则求值器**(battle-core.ts:586 `decideEnemyAction`),非 sdlpal 的 fallback magic+magicRate。这是 reforge 的设计分化(M4c),非对齐缺口。
- **transform/divide/summon/fleeAll**(battle-core.ts:602-660):0x9F/0x9C/召唤/0x69 移植。✅

#### ⚠️ 缺口:dualMove 布尔化(沿用一阶段偏差)
- battle-core.ts:296 `dualMove: s.enemies[i]!.def.stats.dualMove` —— boolean,来自 migrator `wDualMove !== 0`(migrate-enemies.ts:116)。
- **同于一阶段**:wDualMove=1(50%随机)被当必双动。reforge 沿用,未修正。

#### ⚠️ 缺口:fOnlyPuppet 门控未实现
- sdlpal fight.c:1233 敌人行动前检查 `!fOnlyPuppet`(全队傀儡时敌人不动)。
- reforge `decideEnemyAction`(battle-core.ts:213-269)无此门控;`canAct` 只查 sleep/paralyzed(battle-formulas.ts:216-218)。
- **影响**:puppet 状态在 reforge 未建模(BattleStatus 无 puppet 字段?见下)。实际 reforge `BattleStatus` 有 `puppet`(battle-formulas.ts:191),但状态机未消费。

#### ⚠️ 缺口:confused/paralyzed 行动降级
- sdlpal fight.c:1505-1517:sleep/paralyzed 队员 dex=0 + 强制 attack;confused 改派攻击友方(fight.c:1522-1527)。
- reforge:`canAct` 拦 sleep/paralyzed(battle-core.ts:434-437 返回日志"无法行动"),**不降级攻击**;confused 未在 core 处理(演出层 battle-session 处理)。

### 2.4 单元结论

| 重点核对项 | sdlpal | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| Phase 状态机流转 | fight.c:1093-1601 | battle-system.ts phase 字段 | battle-core.ts:26,278 | ✅ 三方对齐 |
| 物品 consuming 扣 nAmountInUse | fight.c:1900-1917 | actions/use-item | battle-core.ts:483 | ✅ |
| flee 改行动时掷骰 | fight.c:4143 | battle-system.ts 注释 | battle-core.ts:458-475 | ✅ |
| dualMove wDualMove=1 50% 随机 | fight.c:1239-1242 | ⚠️ 当必双动(已知偏差) | ⚠️ 沿用布尔化 | ⚠️ 已知偏差,非 bug |
| fOnlyPuppet 门控 | fight.c:1233 | DL3/DM7 傀儡保留出手 | ❌ 未实现 | ❌ reforge 缺口 |
| confused/paralyzed 降级攻击 | fight.c:1505-1527 | battle-system.ts:814 dex=0 | ⚠️ canAct 拦死不降级 | ⚠️ reforge 简化 |

**单元 2 缺口**:
1. **[中] reforge fOnlyPuppet 门控缺失**:puppet 状态字段已建模(battle-formulas.ts:191)但状态机未消费。影响:傀儡战术(全队傀儡时敌人不动)在 reforge 不生效。M4 headless 范围可接受,但完整复刻需补。
2. **[低] reforge confused/paralyzed 不降级攻击**:sdlpal 让这些队员强制普攻(dex=0 排尾),reforge 直接拦死("无法行动")。观感差异,非数值差异。
3. **[已知] dualMove 布尔化偏差**:一阶段+reforge 都把 wDualMove=1 当必双动。作者知情(battle-system.ts:800-802 注释)。影响:林月如类 boss 比原版强。

---

## 审计单元 3:回合队列

> 覆盖 sdlpal `fight.c:1451-1585`(PAL_CLASSIC 队列构建 + 排序)+ speed 排序。
> 三方文件:sdlpal `fight.c` → 一阶段 `packages/game/src/core/battle/turn-queue.ts` → reforge `packages/content/src/battle-formulas.ts`(`buildActionQueue`)。

<a name="审计单元-3回合队列"></a>

### 3.1 sdlpal C 真值(`reference/sdlpal/fight.c:1451-1585`)

#### 队列初始化(fight.c:1451-1456)
- `MAX_ACTIONQUEUE_ITEMS` 项全填 `wIndex=0xFFFF, fIsSecond=FALSE, wDexterity=0xFFFF`(哨兵)。

#### 敌人入列(fight.c:1463-1493)
- 逐敌(`wObjectID != 0` 跳过):
  - 第 1 entry:`fIsEnemy=TRUE, wIndex=i, fIsSecond=FALSE, wDexterity=GetEnemyDexterity(i)*RandomFloat(0.9,1.1)`(fight.c:1470-1474)。
  - **dualMove 第 2 entry**(fight.c:1478-1492,`if (e.wDualMove)` 无条件):
    - 独立二抽 dex(fight.c:1483-1484)。
    - **比较定 fIsSecond**(fight.c:1486-1489):`if (second.dex <= first.dex) second.fIsSecond=TRUE; else first.fIsSecond=TRUE`(**小 dex 者当第二动**)。

#### 队员入列(fight.c:1498-1569)
- 逐队员:
  - **无法行动分支**(fight.c:1505-1517):`hp==0 || sleep>0 || paralyzed>0` → `wDexterity=0`(排队尾);强制 `ActionType=Attack`(同回合恢复则物理攻)。
  - **正常分支**(fight.c:1518-1566):
    - base dex = `PAL_GetPlayerActualDexterity(role)`(fight.c:1520)
    - **confused 改派**(fight.c:1522-1527):`ActionType=Attack`(避免被降级 autoattack)
    - **行动类型 dex 倍率**(fight.c:1529-1556):
      | ActionType | 倍率 |
      |---|---|
      | CoopMagic | ×10 |
      | Defend | ×5 |
      | Magic(非 usableToEnemy) | ×3 |
      | Magic(usableToEnemy) | ×1 |
      | Flee | ÷2 |
      | UseItem | ×3 |
      | default(Attack) | ×1 |
    - **dying ÷2**(fight.c:1558-1560):`if (PAL_IsPlayerDying) wDexterity /= 2`
    - **末尾 jitter**(fight.c:1563):`wDexterity *= RandomFloat(0.9, 1.1)`

#### 排序(fight.c:1574-1585)
- **双循环选择排序**:`for i: for j>=i: if ((SHORT)ActionQueue[i].wDexterity < (SHORT)ActionQueue[j].wDexterity) swap`。
- **关键**:**仅 `<` 时交换**,故**同 dex 保持填充顺序**(敌人先填→敌人先于队员)。dex 用 `(SHORT)` 比较(支持负 dex)。

### 3.2 一阶段对照(`packages/game/src/core/battle/turn-queue.ts` + `battle-system.ts:789-847`)

#### `buildActionQueue`(turn-queue.ts:68-99)✅
- 敌人入列 + dualMove 二 entry + dex2 比较定 fIsSecond(turn-queue.ts:71-88)。✅ 对齐 fight.c:1463-1492。
- 队员入列(turn-queue.ts:90-92)。✅
- **排序**:`items.sort((a,b) => b.dex - a.dex)`(turn-queue.ts:96)。注释"JS stable sort + 只比较 dex 等价:同 dex 保留敌人先填、队员后填"(turn-queue.ts:94-95)。
- **⚠️ 同 dex 稳定性细节**:JS `Array.prototype.sort` 在 ES2019+ 规范保证 stable(V8/Node 11+ 稳定)。sdlpal 双循环 `<` 交换也是稳定(同 dex 不动)。**语义等价**,但 reforge/一阶段依赖运行时 sort 稳定性。

#### 调用方 dex 计算(battle-system.ts:789-839)
- **enemySlots**(battle-system.ts:789-806):
  - baseDex = `getEnemyDexterity(level, dex)`(battle-system.ts:795)
  - jitter `RandomFloat(0.9,1.1)`(battle-system.ts:797)
  - dualMove 第二抽 dex2 独立 jitter(battle-system.ts:805)。✅ 对齐 fight.c:1483-1486。
- **playerSlots**(battle-system.ts:809-839):
  - 无法行动 dex=0(battle-system.ts:814-818)。✅ 对齐 fight.c:1505-1517。
  - baseDex = `role.dexterity`(battle-system.ts:823,**无 level 项**,注释 819-822 订正 M3 误套敌方公式 bug)。
  - `getPlayerActualDexterity(baseDex, {haste, slow})`(battle-system.ts:824-827)。✅
  - **行动类型倍率**(battle-system.ts:831 + `actionDexMultiplier` battle-system.ts:679-697):
    | type | 倍率 |
    |---|---|
    | coop-magic | 10 |
    | defend | 5 |
    | magic(非 usableToEnemy) | 3 |
    | magic(usableToEnemy) | 1 |
    | item | 3 |
    | flee | 0.5 |
    | default | 1 |
    → **完全对齐** fight.c:1529-1556。
  - **dying ÷2**(battle-system.ts:833-835):`hp < min(100, maxHP/5)`。✅ 对齐 fight.c:1558 + `PAL_IsPlayerDying`(fight.c:29-48)。
  - **jitter**(battle-system.ts:837)。✅

### 3.3 reforge 对照(`packages/content/src/battle-formulas.ts:131-176` + `battle-core.ts:284-304`)

#### `buildActionQueue`(battle-formulas.ts:157-176)✅
- 与一阶段 turn-queue.ts 1:1(签名从 `{players, enemies}` 对象改为位置参数 `(players, enemies)`)。
- dualMove dex2 比较定 fIsSecond(battle-formulas.ts:163-170)。✅
- stable sort(battle-formulas.ts:174)。✅

#### 调用方 dex 计算(battle-core.ts:289-298)⚠️ **缺口**
- **enemySlots**(battle-core.ts:293-297):
  - `dex: getEnemyDexterity(level, dexterity)`(battle-core.ts:295)
  - `dualMove: def.stats.dualMove`(battle-core.ts:296)
  - **❌ 无 jitter**:`RandomFloat(0.9,1.1)` 抖动**未应用**。sdlpal fight.c:1474 必抖。
  - **❌ 无 dex2 二抽**:dualMove 第二 entry 无独立 dex(走 buildActionQueue 的 `dex-1` fallback,battle-formulas.ts:169)。
- **playerSlots**(battle-core.ts:289-292):
  - `dex: getPlayerActualDexterity(baseDexterity, haste>0)`(battle-core.ts:291)
  - **❌ 无行动类型倍率**:coop×10/defend×5/magic×3/flee÷2/item×3 全缺。
  - **❌ 无 dying ÷2**。
  - **❌ 无 jitter**。

#### ❌ 缺口汇总(reforge buildActionQueue 调用方)

| sdlpal 语义 | 一阶段 | reforge | 影响 |
|---|---|---|---|
| 敌 dex jitter RandomFloat(0.9,1.1) | ✅ battle-system.ts:797 | ❌ battle-core.ts:295 未抖 | 敌敌同速时无随机破并列;回合序确定性 |
| dualMove dex2 独立二抽 | ✅ battle-system.ts:805 | ❌ 走 dex-1 fallback | dualMove 敌第二动 dex 恒 = 第一动-1,非独立抽样 |
| 行动类型 dex 倍率(×10/5/3/÷2) | ✅ battle-system.ts:831 | ❌ battle-core.ts:289-292 无 | 防御/合击/法术/逃跑的先后与原版不一致 |
| dying ÷2 | ✅ battle-system.ts:833-835 | ❌ 无 | 濒死队员出手不会变慢 |
| 队员 dex jitter | ✅ battle-system.ts:837 | ❌ 无 | 队员同速时无随机破并列 |

### 3.4 单元结论

| 重点核对项 | sdlpal | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| haste/slow 排序 | fight.c:356-380 | ✅ formulas.ts haste×3 | ✅ battle-formulas.ts:121-125 haste×3 | ✅ |
| puppet 排序影响 | fight.c:1233 fOnlyPuppet | ✅ DL3 傀儡保留出手 | ❌ 未消费 puppet | ❌ |
| dualMove 排序(二抽+比较) | fight.c:1478-1492 | ✅ dex2 真值比较 | ⚠️ dex-1 fallback(无 dex2 传入) | ⚠️ |
| **buildActionQueue 函数本身** | fight.c:1451-1585 | ✅ turn-queue.ts 1:1 | ✅ battle-formulas.ts 1:1 | ✅ |
| **调用方 dex 装配** | fight.c:1474,1520-1563 | ✅ 全覆盖 | ❌ 缺 jitter/倍率/dying/dex2 | ❌ |

**单元 3 缺口**:
1. **[高] reforge 调用方 dex 装配不全**:`buildActionQueue` 函数本身 1:1 对齐,但 `battle-core.ts:289-298` 调用时**未应用** sdlpal 的 5 项 dex 修正(jitter / 行动类型倍率 / dying÷2 / dualMove dex2 二抽)。后果:reforge 回合序与原版有系统偏差——防御不再抢先、濒死不减速、同速确定性。M4 headless 战可跑通,但回合序复刻不合格。
2. **[中] dualMove dex2 fallback**:reforge 未传 dex2,走 `dex-1` 近似(battle-formulas.ts:169)。dualMove 敌第二动 dex 恒定,非独立抽样。

---

## 审计单元 4:战斗结算

> 覆盖 sdlpal `battle.c:991-1373`(`PAL_BattleWon`)+ `global.c:2347-2409`(`PAL_PlayerLevelUp`)+ `CHECK_HIDDEN_EXP` 宏。
> 三方文件:sdlpal → 一阶段 `packages/game/src/core/battle/battle-settlement.ts` + `battle-system.ts:3136-3260` → reforge `packages/content/src/rewards.ts` + `packages/reforge/src/battle/settlement.ts`。

### 4.1 sdlpal C 真值(`reference/sdlpal/battle.c:991-1373` + `global.c:2347-2409`)

#### Phase A:经验/金钱显示(battle.c:1025-1054)
- `if (iExpGained > 0)` 显示"获得经验值 N" + "打败敌人得 N 文钱"(battle.c:1025-1048);boss 屏 5.5s,普通 3s(battle.c:1048)。
- **dwCash 无条件加**(battle.c:1054,即使 exp=0 也加钱)。

#### Phase B:主升级(battle.c:1088-1221)
- **死者跳过**(battle.c:1093-1096):`if (rgwHP[w] == 0) continue; // don't care about dead players`。
- **扣减式升级**(battle.c:1106-1118):
  ```
  while (dwExp >= rgLevelUpExp[level]):
    dwExp -= rgLevelUpExp[level]
    if (level < MAX_LEVELS):
      fLevelUp = TRUE
      PAL_PlayerLevelUp(w, 1)
      rgwHP[w] = rgwMaxHP[w]   // 升级回满
      rgwMP[w] = rgwMaxMP[w]
  ```
- **PAL_PlayerLevelUp 成长**(global.c:2384-2400):
  | 属性 | 成长 | cap |
  |---|---|---|
  | maxHP | `+10 + RandomLong(0,7)` | 999 |
  | maxMP | `+8 + RandomLong(0,5)` | 999 |
  | attack | `+4 + RandomLong(0,1)` | 999 |
  | magic | `+4 + RandomLong(0,1)` | 999 |
  | defense | `+2 + RandomLong(0,1)` | 999 |
  | dexterity | `+2 + RandomLong(0,1)` | 999 |
  | flee | `+2`(固定) | 999 |
- **升级屏 8 属性**(battle.c:1141-1148):level/HP/MP/attack/magic/defense/dex/flee,old→new box;HP/MP 显 cur/max。

#### Phase C:隐藏经验 `CHECK_HIDDEN_EXP`(battle.c:1226-1293)
- **总池 count**(battle.c:1226-1235):`iTotalCount = Σ(attackExp+defenseExp+dexExp+fleeExp+healthExp+magicExp+magicPowerExp).wCount`。
- **`if (iTotalCount > 0)` 才跑**(battle.c:1236)。
- **per 池分配宏**(battle.c:1238-1274):
  ```
  dwExp = iExpGained * pool.wCount / iTotalCount
  dwExp *= 2
  dwExp += pool.wExp
  if (pool.wLevel > MAX_LEVELS) pool.wLevel = MAX_LEVELS
  while (dwExp >= rgLevelUpExp[pool.wLevel]):
    dwExp -= rgLevelUpExp[pool.wLevel]
    stat += RandomLong(1, 2)        // ← +R(1,2),无 cap!
    if (pool.wLevel < MAX_LEVELS) pool.wLevel++
  pool.wExp = dwExp
  ```
- **顺序**(battle.c:1276-1282):health→magic→attack→magicPower→defense→dexterity→flee。
- **关键**:**无属性 cap**(与主升级不同,主升级 STAT_LIMIT 999;隐藏不封顶)。
- **升级后同步**(battle.c:1289-1292):`if (fLevelUp) rgwHP=rgwMaxHP; rgwMP=rgwMaxMP`(避免 HP/MP 与升级后 max 不同步)。

#### Phase D:学法术(battle.c:1298-1328)
- 遍历 `lprgLevelUpMagic`,`m[w].wLevel <= rgwLevel[w]` → `PAL_AddMagic`。

#### Phase E:战后脚本(battle.c:1334-1337)
- 逐敌 `PAL_RunTriggerScript(wScriptOnBattleEnd, i)`(**返回值不回写**)。

#### Phase F:半恢复(battle.c:1342-1372, PAL_CLASSIC)
- **PAL_CLASSIC 路径**(battle.c:1346 `#if 1//def PAL_CLASSIC`,实际编译):
  ```
  rgwHP[w] += (rgwMaxHP[w] - rgwHP[w]) / 2
  rgwMP[w] += (rgwMaxMP[w] - rgwMP[w]) / 2
  ```
- **非 CLASSIC**(battle.c:1351-1370):死者回 1 血;按 exp 比例恢复(f = levelUpExp/5/expGained,min 2;HP/=f,MP/=f/1.2)。

### 4.2 一阶段对照(`battle-settlement.ts` + `battle-system.ts:3136-3260`)

#### `buildBattleWonSettlement`(battle-system.ts:3142-3176)
- **回写 HP/MP**(battle-system.ts:3144)。✅
- **Phase A**(battle-system.ts:3148-3151):`expGained>0` 推 exp-cash 屏 + `dwCash += cashGained`(无条件)。✅ 对齐 battle.c:1025,1054。
- **Phase B/C/D 排序**(battle-system.ts:3153-3173):
  - per 升级队员:**level-up box → hidden-exp-up(逐属性一屏)→ learn-magic**(battle-system.ts:3162-3172)。
  - ✅ 对齐 sdlpal per-role 序:battle.c 主升级(1113)→ CHECK_HIDDEN_EXP(1240)→ 学法术(1300)同 role 内顺序。

#### `tickBattleSettlement` Phase E/F(battle-system.ts:3227-3260)
- **screens 放完**(battle-system.ts:3239):先跑 Phase E `runBattleWonPostScripts`(battle-system.ts:3241),`postBattleScriptsDone` 标记。
- **等对话播完**(battle-system.ts:3243-3247):scriptOnBattleEnd 可排 dialog,必须等。
- **Phase F**(battle-system.ts:3248 `finishBattleWon`):半恢复。
- **时序**:A→B→C→D 屏 → E 脚本 → F 半恢复。✅ 对齐 sdlpal battle.c:1025-1372。

#### `finishBattleWon`(battle-system.ts:3209-3220)✅
- PAL_CLASSIC:`HP += (maxHP-HP)/2; MP += (maxMP-MP)/2`(battle-system.ts:3214,3217)`Math.floor`。✅ 对齐 battle.c:1347-1350。

#### `battle-settlement.ts` 屏数据结构
- 4 种 screen:`exp-cash / level-up / hidden-exp-up / learn-magic`(battle-settlement.ts:64-68)。✅
- **超时**:boss exp 5500ms,其余 3000ms(battle-settlement.ts:85-89)。✅ 对齐 battle.c:1048。

### 4.3 reforge 对照(`packages/content/src/rewards.ts` + `packages/reforge/src/battle/settlement.ts`)

#### `grantBattleRewards`(rewards.ts:130-199)
- **死者跳过**(rewards.ts:142):`if (c.hp <= 0) continue`。✅ 对齐 battle.c:1093-1096。
- **扣减式升级**(rewards.ts:152-178):
  - `while (exp >= expTable[level])`(rewards.ts:152-154)。✅
  - **满级继续扣 exp 不升**(rewards.ts:156):`if (c.level >= MAX_LEVEL) continue`。✅ 对齐 battle.c:1110。
  - **成长**(rewards.ts:159-165):
    | 属性 | reforge | sdlpal | 对齐 |
    |---|---|---|---|
    | maxHP | `+10+r(0,7)` cap 999 | `+10+R(0,7)` cap 999 | ✅ |
    | maxMP | `+8+r(0,5)` cap 999 | `+8+R(0,5)` cap 999 | ✅ |
    | attack | `+4+r(0,1)` cap 999 | `+4+R(0,1)` cap 999 | ✅ |
    | magicAttack | `+4+r(0,1)` cap 999 | `+4+R(0,1)` cap 999 | ✅ |
    | defense | `+2+r(0,1)` cap 999 | `+2+R(0,1)` cap 999 | ✅ |
    | speed | `+2+r(0,1)` cap 999 | `+2+R(0,1)` cap 999 | ✅ |
    | luck | `+2`(固定) cap 999 | `+2`(固定) cap 999 | ✅ |
  - **升级回满**(rewards.ts:166-167):`hp=maxHP; mp=maxMP`。✅ 对齐 battle.c:1115-1116。
  - **学技能**(rewards.ts:169-177):`levelUp[template]` 该 level 条目,去重。✅ 对齐 battle.c:1300-1321。
- **Phase C 隐藏经验** `applyHiddenExp`(rewards.ts:92-124):
  - `total = Σ 7 池 count`(rewards.ts:100-102)。✅
  - `if (total <= 0) return []`(rewards.ts:103)。✅ 对齐 battle.c:1236。
  - **per 池**:`exp = trunc(expGained * count / total) * 2 + pool.exp`(rewards.ts:109)。✅ 对齐 battle.c:1240-1245。
  - **while 过阈值**:`stat += R(1,2); level<99 → ++`(rewards.ts:111-119)。✅ 对齐 battle.c:1252-1259。
  - **余数回存**(rewards.ts:120):`pool.exp = exp & 0xffff`(WORD 截断)。✅ 对齐 battle.c:1262 `(WORD)dwExp`。
  - **❌ 无属性 cap**:rewards.ts:116 `c[k] += inc` 直接加,无 cap。✅ 对齐 sdlpal 隐藏经验**不封顶**语义。
  - **顺序**:HIDDEN_STAT_KEYS(character.ts:84-)遍历,与 sdlpal 7 池序对齐。
- **Phase F 半恢复**(rewards.ts:193-197):
  - `hp += floor((maxHP-hp)/2); mp += floor((maxMP-mp)/2)`(rewards.ts:195-196)。✅ 对齐 battle.c:1347-1350 PAL_CLASSIC。
  - **全员**(rewards.ts:194 `for (const c of party)`),含死者(test rewards.test.ts:91-100 死者 hp=0 → 半恢复到 50)。✅ 注释 rewards.ts:8 "死者由调用方先回 1 血再半恢复,同原版观感"。

#### ⚠️ 缺口:Phase E scriptOnBattleEnd 未在 rewards.ts
- rewards.ts 只做 A/B/C/D/F,**无 Phase E**(scriptOnBattleEnd)。
- reforge Phase E 由 `battle-session.ts` 的 `buildSettlement` 回调 + 演出层处理(settlement.ts:4 注释"Phase E scriptOnBattleEnd 已由 battle-system 结算链处理"——但这是抄一阶段注释,reforge 实际未实现)。
- **影响**:战后脚本(如敌人掉落道具对话)在 reforge 不触发。M4 headless 范围可接受。

#### `buildSettlementScreens`(settlement.ts:45-80)屏序
- **exp-cash**(settlement.ts:54,`exp>0`)→ per levelUp:[level-up → hidden-up(逐条)→ learn-magic](settlement.ts:62-77)→ 未升级角色的 hidden-up 排尾(settlement.ts:78)。
- ✅ 对齐一阶段 battle-system.ts:3162-3173 + sdlpal per-role 序。
- **⚠️ 细节差异**:sdlpal `CHECK_HIDDEN_EXP` 对**所有活役**跑(不依赖升级,battle.c:1088 循环内 1226),故未升级角色的 hidden 提升在 sdlpal 是**穿插在 per-role 循环中**(该角色无 level-up 屏,直接放 hidden 屏)。reforge `settlement.ts:78` 把未升级角色的 hidden 排**最后**,与 sdlpal 该角色在 party 顺序中的位置不一致。**屏序轻微偏差**,但所有屏都放。

#### 测试覆盖(rewards.test.ts)
- 升级成长下限 + HP/MP 回满 + 学技能(rewards.test.ts:42-72)。✅
- 不升级 exp 累计 + Phase F 半恢复(rewards.test.ts:74-89)。✅
- 死者不获经验但吃半恢复(rewards.test.ts:91-100)。✅
- 隐藏经验比例分配 ×2 + 过阈值 +R(1,2) + 余数回存 + 零行为跳过(rewards.test.ts:104-125)。✅

### 4.4 单元结论

| 重点核对项 | sdlpal | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| Phase A-F 时序 | battle.c:1025-1372 | ✅ battle-system.ts:3136-3260 | ✅ rewards.ts + settlement.ts | ✅(reforge 缺 Phase E) |
| 屏序 exp→levelup→hidden→learn→halfheal | battle.c per-role | ✅ battle-system.ts:3162-3173 | ✅ settlement.ts:45-80 | ✅(未升级角色 hidden 排尾,轻微偏差) |
| 隐藏经验占比分配(无 cap) | battle.c:1255 `+=R(1,2)` 无 cap | ✅ battle-system.ts hiddenExpGrowth | ✅ rewards.ts:116 无 cap | ✅ 三方对齐 |
| 升级 maxHP +10+R(0,7) | global.c:2384 | ✅ battle-system.ts | ✅ rewards.ts:159 | ✅ 三方对齐 |
| 升级 maxMP +8+R(0,5) | global.c:2385 | ✅ | ✅ rewards.ts:160 | ✅ 三方对齐 |
| 死者不获经验 | battle.c:1093-1096 | ✅ | ✅ rewards.ts:142 | ✅ 三方对齐 |
| 战后半恢复 hp+(max-hp)/2 | battle.c:1347-1350 | ✅ battle-system.ts:3214 | ✅ rewards.ts:195 | ✅ 三方对齐 |
| 升级回满 HP/MP | battle.c:1115-1116 | ✅ | ✅ rewards.ts:166-167 | ✅ 三方对齐 |
| 满级继续扣 exp 不升 | battle.c:1110 | ✅ | ✅ rewards.ts:156 | ✅ 三方对齐 |
| Phase E scriptOnBattleEnd | battle.c:1334-1337 | ✅ battle-system.ts:3182-3203 | ❌ rewards.ts 无 | ❌ reforge 缺口 |
| hidden 池余数 WORD 截断 | battle.c:1262 `(WORD)` | ✅ | ✅ rewards.ts:120 `& 0xffff` | ✅ |

**单元 4 缺口**:
1. **[中] reforge Phase E(scriptOnBattleEnd)未实现**:rewards.ts 只做 A/B/C/D/F。战后脚本(掉落/对话)不触发。M4 headless 可接受,完整复刻需补。
2. **[低] 未升级角色 hidden 屏排尾**:sdlpal 穿插在 party 顺序中,reforge 排最后。屏序轻微偏差,不影响数值。

---

## 总体结论与风险矩阵

### 三方对齐度

| 单元 | sdlpal→一阶段 | 一阶段→reforge | reforge 独立缺口 |
|---|---|---|---|
| 1 战斗公式 | ✅ 1:1 + 测试 | ✅ 1:1 + 测试 | 无 |
| 2 状态机 | ✅ + 多轮 fix(DL/DM 系列) | ⚠️ 简化 | fOnlyPuppet / confused 降级缺失 |
| 3 回合队列 | ✅ buildActionQueue 1:1 | ⚠️ 函数对齐,调用方装配不全 | **jitter/倍率/dying/dex2 全缺** |
| 4 结算 | ✅ + Phase E 脚本 | ✅ rewards 1:1 + 测试 | Phase E 缺失 + 屏序轻微偏差 |

### 高优先级行动项

1. **[高] reforge 回合队列 dex 装配不全(单元 3)**:`battle-core.ts:289-298` 未应用 sdlpal 的 5 项 dex 修正(敌 jitter / dualMove dex2 二抽 / 行动类型倍率 / dying÷2 / 队员 jitter)。这是 reforge 与原版回合序系统偏差的根因。建议从一阶段 `battle-system.ts:789-839` 移植 `actionDexMultiplier` + jitter + dying 逻辑到 `battle-core.ts:284-298`。
   - 影响:防御不再抢先、濒死不减速、合击/法术/逃跑先后错乱、同速确定性(无 jitter 破并列)。
   - 验收:对拍 sdlpal 同种子回合序。

2. **[中] reforge Phase E(scriptOnBattleEnd)缺失(单元 4)**:战后脚本不触发。rewards.ts 无 Phase E 钩子。
   - 影响:敌人战后掉落/对话不生效。
   - 行动:在 `grantBattleRewards` 后加 `runPostBattleScripts` 钩子,或由 battle-session 演出层接入。

3. **[中] reforge fOnlyPuppet 门控缺失(单元 2)**:puppet 状态字段已建模但状态机未消费。
   - 影响:傀儡战术(全队傀儡敌人不动)不生效。
   - 行动:`decideEnemyAction`(battle-core.ts:213)加 `fOnlyPuppet` 检查。

### 已验证对齐项(无需行动)

- ✅ SHORT cast 溢出 65535→-2(单元 1,三方 + 测试)
- ✅ 物理 res 1/2/3/0 除法(单元 1,三方 + 测试)
- ✅ dexterity PAL_CLASSIC 路径(haste×3 + cap 999,单元 1,三方)
- ✅ 隐藏经验占比分配无 cap(单元 4,三方)
- ✅ 升级 maxHP/maxMP 随机成长(10+R(0,7) / 8+R(0,5),单元 4,三方)
- ✅ 死者不获经验(单元 4,三方)
- ✅ 战后半恢复 hp+(max-hp)/2(单元 4,三方)
- ✅ Phase A-F 时序(单元 4,一阶段完整 / reforge 缺 Phase E)
- ✅ buildActionQueue 函数本身(单元 3,三方 1:1)

### git fix 史(sdlpal→一阶段踩坑记录)

| commit | 修复 | 单元 |
|---|---|---|
| `9e556285` | M3.12 formulas.ts fight.c 公式 1:1 port | 1 |
| `8fc091c0` | M3.13 turn-queue.ts PAL_CLASSIC ActionQueue | 3 |
| `7a04a46c` | W1 D7 turn-order dex 抖动 RandomFloat(0.9,1.1) + dualMove 独立二抽 | 3 |
| `8aa41348` | 对齐同速行动顺序 | 3 |
| `829dcf3b` | D11b 胜利结算演出 PAL_BattleWon 多屏 box | 4 |
| `7ed5438c` | E04-d 隐藏属性涨点结算屏 CHECK_HIDDEN_EXP 显示 | 4 |
| `67f5949b` | B7c 隐藏经验系统 CHECK_HIDDEN_EXP 战斗行为养成 | 4 |
| `cf97ef33` | 战后结算屏改忠实原版 box 序列(废自造"战斗胜利!") | 4 |
| `319cdc26` | perform 期 ValidateAction 降级链 + 傀儡死亡队员保留出手(DL3/DM7) | 2 |
| `1e89f6e5` | low 簙 A 围攻执行期粘性/濒死阈值/合击吞行动/RNG 流(DL1-4/6/7/23) | 2 |
| `fb734771` | M4a-1 战斗公式层移植(content 包,reforge) | 1,3 |
| `d8bd7b2f` | B7a 战后结算 exp/cash 入账 + 升级成长 + 战后半恢复(reforge) | 4 |

> **reforge 未读一阶段踩坑**:reforge battle-core.ts 的 dex 装配缺口(单元 3)正是 W1 D7(commit `7a04a46c`)在一阶段修复的内容。reforge 移植了 `buildActionQueue` 函数但**未移植其调用方的 dex 装配逻辑**,导致同一 bug 重现。建议补移植 `battle-system.ts:789-839` 的 jitter/倍率/dex2/dying 逻辑。
