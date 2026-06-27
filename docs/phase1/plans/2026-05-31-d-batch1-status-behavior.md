# B1 — 玩家状态行为正确性(D8 / D21)实施 plan

> roadmap: [2026-05-31-d-series-completion-roadmap.md](2026-05-31-d-series-completion-roadmap.md) Batch 1。
> **执行须 TDD**:每个行为先写失败单测(gs/battle state 数据级断言),再实现。commit 引 sdlpal `file:行号`。

**Goal**:把战斗状态(sleep/paralyzed/confused/silence + haste/slow/bravery/protect/dualAttack)的**逐回合递减**、**失能玩家自动行动**(睡眠/麻痹 Pass、混乱攻友军 AttackMate)、**战斗结束清状态/毒/临时装备效果** 1:1 对齐 sdlpal CLASSIC。

**Architecture**:统一 status 为计数器模型(对齐 sdlpal `WORD rgPlayerStatus[role][kStatusAll]`);失能行为在 selectAction(跳菜单+自动填)与 performAction(Pass/AttackMate 解算)两处接入;战末 cleanup 复用现有 poison/equip helper。

---

## sdlpal callpath read 清单(已完成 2026-05-31)

| sdlpal | 行 | 真值 |
|---|---|---|
| `global.h` STATUS enum | 40-60 | CLASSIC:`0 Confused / 1 Paralyzed / 2 Sleep / 3 Silence / 4 Puppet / 5 Bravery / 6 Protect / 7 Haste / 8 DualAttack`(无 Slow,Slow 是非 classic);kStatusAll=9 |
| `fight.c PAL_IsPlayerDying` | 47-48 | `HP < min(100, MaxHP/5)` |
| `fight.c` selectAction skip(CLASSIC)| 1398-1404 | KO‖sleep‖confused‖paralyzed → `continue`(不开动作菜单)|
| `fight.c` action queue 填充(CLASSIC)| 1505-1527 | KO‖sleep>0‖paralyzed>0 → ActionType=**Attack** wActionID=0 dex=**0**(注释:同回合恢复则攻);confused>0 → Attack wActionID=0 |
| `fight.c` perform 时解算(CLASSIC)| 1731-1747 | KO&&!puppet→Pass;sleep>0‖paralyzed>0→**Pass**;confused>0→dying?**Pass**:**AttackMate** |
| `fight.c PAL_BattlePlayerValidateAction` AttackMate prep | 3448-3479 | 未混乱→转 Attack 打敌;混乱→无活友军 then Pass(sdlpal mod 关"独自打敌")|
| `fight.c PAL_BattlePlayerPerformAction` AttackMate perform | 3760-3853 | fThisTurnCoop→break;随机活友军 `do RandomLong(0,maxIdx) while(self‖HP==0)`;`def=GetPlayerDefense(target)`,target 防御→def×2;`sDamage=CalcPhysicalAttackDamage(GetPlayerAttackStrength(self), def, 2)`;target Protect>0→÷2;`<=0→1`;clamp 到 target HP;扣血 + colorShift=6 受击 |
| `fight.c` 逐回合 status 递减 | 1632-1638(player)/ 1655-1661(enemy)| 回合**末**(全 action 后):`for j in 0..kStatusAll: if status[j]>0 status[j]--`(**所有** status 统一递减,含 bravery/protect/haste/dualAttack)|
| `battle.c` 战末 cleanup | 1822-1830 | **无条件**(won/lost/fleed):`PAL_ClearAllPlayerStatus()` + 每角色 `PAL_CurePoisonByLevel(w,3)` + `PAL_RemoveEquipmentEffect(w, kBodyPartExtra)` |
| `global.c PAL_ClearAllPlayerStatus` | 2311-2344 | 清所有 `<=999` 的 status(>999 = 装备永久效果,保留)|

---

## ts 现状 ↔ sdlpal 差异表

| # | sdlpal 真值 | ts 现状 | 差异 | 落点 |
|---|---|---|---|---|
| 1 | 所有 status 是 WORD 计数器,统一递减 | `haste/slow` = boolean;`bravery/protect/dualAttack` = boolean?(且后三者**无 set/consume**)| 类型不一致 → boolean 无法递减 | battle-state.ts:48-60/76-88 status 类型 |
| 2 | 回合末递减**全部** kStatusAll | status.ts `tickOwnerStatus` 只减 sleep/paralyzed/confused/silence/puppet | bravery/protect/haste/slow/dualAttack 不减 | status.ts:16-23 |
| 3 | 递减发生在回合**末**(全 action 后)| ts `tickStatusEffects` 在 tickPostAction(battle-system.ts:1778)turn++ 前调 | 时序 ✅ 已对(postAction = 回合末)| 无需改 |
| 4 | selectAction 跳过 KO/sleep/confused/paralyzed 玩家不开菜单 | `tickSelectAction` 等**所有活队员**都有 pendingAction;不跳失能、不自动填 | 失能玩家会卡 queue / 误开菜单 | battle-system.ts:460-535 |
| 5 | 失能玩家自动填 action(sleep/paralyzed/KO→Attack id0 dex0;confused→Attack id0)| 无 | 缺自动填 | battle-system.ts tickSelectAction |
| 6 | perform 时:sleep/paralyzed→Pass;confused→dying?Pass:AttackMate | `tickPerformAction` 玩家分支(1524-1531)直取 pendingActions,无解算 | 缺 Pass/AttackMate 解算 | battle-system.ts:1524-1531 |
| 7 | AttackMate = 随机活友军物理攻击(详上表 3760-3853)| 无 AttackMate action | 缺整个 action | 新 actions/attack-mate.ts |
| 8 | 战末清 status + 毒(level≤3)+ Extra 装备效果 | `finalizeBattleCleanup`(1834-1843)只清 dialogBox/mode/battleState | 缺毒清 + Extra 清(status 因 ts battle-local 随 state 丢弃自动清,但毒/Extra 持久)| battle-system.ts:1834 |

> 注 #3:ts status 是 battle-local(`BattlePlayer.status`),战末随 `gs.battleState=undefined` 丢弃 → "clearAllPlayerStatus" 对 status 本身自动满足。但**毒**(`gs.rgPoisonStatus` 持久)+ **Extra 装备效果**(0x30 持久 mutate)需显式清(D21 真正缺口 + 顺带解决 D23/0x30 文档化残)。

---

## Task 1:统一 status 计数器模型(boolean → number)

**Files:**
- Modify: `packages/game/src/core/battle/battle-state.ts:48-60`(BattlePlayer.status)+ `:76-88`(BattleEnemy.status)+ `:535/550` 初始化
- Modify: `packages/game/src/core/battle/formulas.ts:209`(`if (status.haste)` → `> 0`)
- Modify: `packages/game/src/core/battle/battle-system.ts:507-508`(传 haste/slow 给 dex)
- Modify: `packages/game/src/core/battle/battle-opcodes.ts:649-650`(set haste/slow)
- Test: `packages/game/src/core/battle/__tests__/status.test.ts`

**真值**:sdlpal `rgPlayerStatus[role][kStatusAll]` 全 WORD;消费方判 `> 0`。

- [ ] Step 1:status.test.ts 加失败测 —— 构造 player.status 全 9 项 = {confused:2,paralyzed:1,sleep:3,silence:1,puppet:1,bravery:5,protect:5,haste:5,slow:0,dualAttack:5},调 `tickStatusEffects`,断言每项 >0 的 -1(haste 5→4,protect 5→4 等),0 的不变。当前 boolean 类型 → 编译/断言失败。
- [ ] Step 2:battle-state.ts status 类型全改 `number`(haste/slow/bravery/protect/dualAttack: boolean → number)。注释引 sdlpal global.h:40-60。初始化 `{ confused:0, paralyzed:0, sleep:0, silence:0, puppet:0, bravery:0, protect:0, haste:0, slow:0, dualAttack:0 }`。
- [ ] Step 3:消费方改判 `>0` —— formulas.ts:209 `if (status.haste > 0)` / slow 同;battle-system.ts:507-508 传 `haste: player.status.haste > 0, slow: player.status.slow > 0`(若 getPlayerActualDexterity 仍收 boolean)或改签名收 number;battle-opcodes.ts:649-650 `= 0` 代替 `= false`。
- [ ] Step 4:`pnpm --filter @type-pal/game test status` 过 + `pnpm --filter @type-pal/game typecheck` 过。
- [ ] Step 5:commit `refactor(battle): status 统一计数器模型对齐 sdlpal rgPlayerStatus[kStatusAll](global.h:40-60)`。

## Task 2:逐回合递减全部 status

**Files:** Modify `status.ts:16-23` tickOwnerStatus;Test status.test.ts。

**真值**:fight.c:1632-1638 `for j in 0..kStatusAll: if(>0) --`。

- [ ] Step 1:status.test.ts Task1 的测已覆盖"全项递减";补一条 enemy 同样递减 + 已死 enemy 不递减(对齐 tickStatusEffects:28-30 `e.e.health>0` gate,sdlpal fight.c:1655 对全 enemy 但 wObjectID gate)。
- [ ] Step 2:重写 tickOwnerStatus 为遍历全 9 字段统一 `if(v>0) v-1`(或显式逐字段)。删旧"boolean 不衰减"注释,引 fight.c:1632-1638。
- [ ] Step 3:测过 + typecheck 过。
- [ ] Step 4:commit `fix(battle): 全 status 逐回合递减(fight.c:1632-1638),修 boolean 类不衰减`。

## Task 3:selectAction 跳过 + 自动填失能玩家

**Files:** Modify `battle-system.ts` tickSelectAction(460-535)+ startPlayerSelection/advance;Test battle-system.test.ts。

**真值**:fight.c:1398-1404(跳菜单)+ 1505-1527(自动填)。

- [ ] Step 1:battle-system.test.ts 加失败测 —— 3 队员,队员 1 sleep>0:run tickSelectAction 序列,断言 (a) 菜单 selectingPlayerIdx 不停在队员 1(跳过),(b) 队员 1 自动得 pendingAction `{type:'attack', actionId:0}`,(c) queue build 时队员 1 的 dex=0。confused 队员同测得 attack id0(dex 正常)。
- [ ] Step 2:tickSelectAction 起手:对每个活队员,若 `sleep>0‖paralyzed>0`(或 confused>0)且 `!pendingActions.has(i)` → 自动 set pendingActions[i] = `{type:'attack', actionId:0, target:autoTarget}`;sleep/paralyzed 额外标记使其 dex=0(playerSlots 映射时 sleep/paralyzed → dex=0,对齐 1513)。startPlayerSelection / advance 逻辑跳过这些 idx(不开菜单)。
- [ ] Step 3:playerSlots dex 计算(500-518):sleep>0‖paralyzed>0 的 idx → dex=0(覆盖倍率)。
- [ ] Step 4:测过(含原有 selectAction 测不回归)+ typecheck。
- [ ] Step 5:commit `feat(battle): 失能玩家 selectAction 自动填 action + 跳菜单(fight.c:1398-1404/1505-1527)`。

## Task 4:perform 时 sleep/paralyzed→Pass,confused→AttackMate/Pass

**Files:** Modify `battle-system.ts` tickPerformAction 玩家分支(1524-1531);需要 'pass' action type(查 BattleAction.type 是否已有,无则加)+ confused 解算。Test battle-system.test.ts。

**真值**:fight.c:1731-1747。

- [ ] Step 1:失败测 —— 队员混乱 + 有活友军 → perform 解算出 AttackMate(target=某活友军);队员混乱 + dying → Pass;队员 sleep → Pass(no-op,不掉敌血)。
- [ ] Step 2:tickPerformAction 取到 player action 后,按 role.status 解算覆盖:`hp==0&&puppet==0`→pass;`sleep>0‖paralyzed>0`→pass;`confused>0`→`isPlayerDying?pass:attack-mate`。引 fight.c:1731-1747。
- [ ] Step 3:'pass' 路径 = no-op action(不动 HP,正常推进 currentActionIndex)。
- [ ] Step 4:测过 + typecheck。
- [ ] Step 5:commit `feat(battle): perform 时失能解算 sleep/paralyzed→Pass confused→AttackMate(fight.c:1731-1747)`。

## Task 5:AttackMate 实现(随机友军物理攻击)

**Files:** Create `packages/game/src/core/battle/actions/attack-mate.ts`;wire 进 performBattleAction;Test actions 测 + attack-mate 专测。

**真值**:fight.c:3760-3853(详 read 清单表)+ 3448-3479(无活友军→Pass)。

- [ ] Step 1:attack-mate.test.ts 失败测 —— 攻者 str + 目标 def(含目标防御×2)→ `CalcPhysicalAttackDamage(str,def,2)`;目标 Protect>0 → ÷2;sDamage<=0→1;clamp 到目标 HP;扣目标 HP。随机目标用 state.rng 确定性:`do RandomLong(0,maxIdx) while(self‖HP==0)`(测注入固定 rng 验目标选定 + self/死友军排除)。无活友军 → Pass(不扣血)。
- [ ] Step 2:实现 performAttackMate(state, res, casterIdx):选随机活友军(state.rng,排 self + 死)→ 无则 Pass return;str=getPlayerAttackStrength(caster)、def=getPlayerDefense(target)(target.defending→×2)、dmg=calcPhysicalAttackDamage(str,def,2)、Protect→÷2、min1、clamp、扣 target HP;emit showDamageNum(blue)+ 受击 colorShift=6 动画(复用 D17 受击时间线)。引 fight.c:3760-3853。
- [ ] Step 3:performBattleAction 路由 'attack-mate' → performAttackMate;受击动画走 anim-timeline(对齐受击)。
- [ ] Step 4:测过 + typecheck。
- [ ] Step 5:commit `feat(battle): AttackMate 混乱攻随机友军(fight.c:3760-3853)+ Protect 减半`。

## Task 6:D21 战末清状态 / 毒 / Extra 装备效果

**Files:** Modify `battle-system.ts` finalizeBattleCleanup(1834-1843);复用 `equip-effect.ts removeEquipmentEffect` + event-system cure-poison-by-level 逻辑(抽 helper 或内联)。Test battle-system.test.ts。

**真值**:battle.c:1822-1830(无条件 won/lost/fleed)+ global.c:2311 ClearAll(≤999)。

- [ ] Step 1:失败测 —— 战前 gs.rgPoisonStatus 有 level≤3 毒 + level>3 毒 + 角色有 Extra 装备效果(rgEquipmentEffect[Extra]非零);finalize 后断言:level≤3 毒清、level>3 毒留、Extra 效果清零。
- [ ] Step 2:finalizeBattleCleanup 加:对每 party member `curePoisonByLevel(gs, roleId, 3)`(遍历 rgPoisonStatus,items[poisonId].poison.wPoisonLevel<=3 清)+ `removeEquipmentEffect(gs, roleId, kBodyPartExtra slot)`。注释引 battle.c:1822-1830。status 因 battle-local 随 state 丢弃 → 注释说明无需显式清(若未来 status 持久化再补 clearAllPlayerStatus≤999)。
- [ ] Step 3:确认三条战果路径(won finishBattleWon / lost / fleed / forced)都经 finalizeBattleCleanup(won 经 finishBattleWon:1902 调 cleanup ✓;lost/fleed/forced 经 finalizeBattle:1830 ✓)。
- [ ] Step 4:测过 + typecheck。
- [ ] Step 5:commit `feat(battle): 战末清毒(level≤3)+ Extra 装备效果(battle.c:1822-1830);解决 D23/0x30 残`。

---

## 完成判据(B1)

- [ ] 混乱队员被强制 AttackMate 打随机活友军(无活友军→Pass);濒死混乱→Pass。
- [ ] 睡眠/麻痹队员该回合 Pass,不开菜单,dex=0(同回合恢复则攻 — 边界:本回合仍失能则 Pass)。
- [ ] 全部 9 种 status 逐回合 -1 递减(player + alive enemy)。
- [ ] 战斗结束清 level≤3 毒 + Extra 装备效果(顺带修 D23/0x30 持久 mutate 残)。
- [ ] `pnpm --filter @type-pal/game test` 全过 + typecheck 过。
- [ ] feature-status.md D8 ⚠️→✅ claimed / D21 ⬜→✅ claimed,引 sdlpal 行号;opcode-status.md 0x30 残注更新。
- [ ] 给 user 的真机用例(B7 汇总,本批先记):①混乱队员看是否打友军 ②睡眠队员看是否跳过 ③战后中毒是否解。
