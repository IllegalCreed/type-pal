# B2 — 敌方 AI 真值 + 脚本驱动(D9 / D10残 / D24残 / D27残)详细 plan

> 总 roadmap:[2026-05-31-d-series-completion-roadmap.md](2026-05-31-d-series-completion-roadmap.md) B2。
> **read 清单(TOP 0)= workflow `b2-enemy-ai-understand` 18-agent 穷尽通读 + 对抗验证**完成;
> 完整真值见 task 输出。本 plan = 验证后差异 + 全 commit 切分。user 2026-05-31 拍板:**全做**(含物理闪避+守护+魔法减半)+ 全部额外保真项(dualMove/真show-once/敌群体魔法/D9 RNG对拍)。

---

## 0. workflow 纠正的 roadmap 错误假设(关键,防误改)

| 项 | roadmap 原假设(错) | 验证后真值 |
|---|---|---|
| D9 选目标偏好 | 补"低血/前排/Protect 偏好" | **纯均匀随机,sdlpal 无偏好**;ts 行为已对。**不实现偏好**。仅 RNG 流对拍(下 c10) |
| D9 Bug-1 死循环 | autotarget(4500-4517)加 safety | ts 预过滤已规避;4500-4517 实为 confused 选敌函数;`PAL_BattleSelectAutoTargetFrom`(79-128)有界无 bug → **不动** |
| D10 0x67 | "未真驱动" | **已真驱动**;剩 silence 漏判(真 bug)/0xFFFF/群体魔法 |
| D10 0x90 | "battle 未实现自禁" | 写 gs.rgObject 已对;**sdlpal 战斗内从不同步 rgObject→敌;真 show-once = 脚本返回值回写**(c7),0x90 与自禁无关 → 0x90 **不加 battle sync** |
| D10 0x79 | "battle 未实现" | **已 fallthrough 生效** → 仅清 stale 注释 |
| D27 cover | "Protect 伤害重定向" | cover 是**整次物理攻击全闪避**(非减伤/转移),iCoverIndex 只决定播挡动画的精灵 |
| D27 物理 def | 现 ts `defense+(level+6)*4` | **真值 = PAL_GetPlayerDefense(基础+装备防)×(defending?2:1),无 level 项**(global.c:1821-1826 亲核)→ ts 现有 bug,修 + 改测 |

---

## 1. 全 commit 切分(TDD,每行为先失败测,数据级断言)

> 依赖:c1-c2 改 enemy-ai/attack(基础);c3 依赖 c2(physical 公式先对再加闪避);c4 独立;
> c5/c6/c7/c8/c9/c10 大致独立。每 commit 引 sdlpal `file:行号`。

### c1 — 敌方 AI 状态门(D10):decideEnemyAction overhaul
sdlpal `PAL_BattleEnemyPerformAction` 4 分支(fight.c:4582-4910):
- 4582-4590:`sleep>0 || paralyzed>0 || iHidingTime>0 → goto end`(do-nothing)
- 4591-4655:`confused>0` → 打**随机活敌**(PAL_BattleEnemySelectEnemyTargetIndex 4488-4517)+ 自定物理 4634-4638
- 4656-4658:魔法门 `wMagic!=0 && RandomLong(0,9)<wMagicRate && silence==0`;4663 `wMagic==0xFFFF→goto end`
- 4910:else 物理
**ts**:enemy-ai.ts decideEnemyAction 扩 `DecideEnemyActionInput` 带敌 status + 全敌列表(confused 选敌)。sleep/paralyzed→pass;silence→强制物理(漏判是真 bug);confused→选随机活敌(预过滤,自带 safety,**非** sdlpal 无界 while);wMagic 0xFFFF→pass。
测:enemy-ai.test 各分支。

### c2 — enemy→player 物理公式修(D27)
sdlpal fight.c:4917-4929 + 5056-5075:
- str = e.attackStrength + (e.level+6)*6,<0→0(已对)
- **def = PAL_GetPlayerDefense(基础+装备防),defending→×2,无 level 项**(修 bug)
- physRes 硬编码 2
- sDamage = CalcPhysical(**str+RandomLong(0,2)**, def, 2);**+RandomLong(0,1)**;**Protect→/=2**;HP<sDamage→=HP;<=0→1
**ts**:actions/attack.ts enemy→player 分支(现 :221-232)。改 def(去 level 项)+ str jitter + damage jitter + Protect /=2。更新现有 "enemy 攻击 player" 测(旧断言编码 def bug)。

### c3 — 物理 fAutoDefend 闪避 + 守护 cover(D27,user 全做)
sdlpal fight.c:4936-4985 + 5052:
- `fAutoDefend = RandomLong(0,16)>=10`(7/17)
- 若 `(dying||confused>0||sleep>0||paralyzed>0) && fAutoDefend` → 查 rgwCoveredBy 找替挡 iCoverIndex;替挡者自身坏状态→iCoverIndex=-1
- 若 `iCoverIndex==-1 && 目标坏状态(confused/sleep/**paralyzed**(CLASSIC))` → `fAutoDefend=FALSE`(强制承伤)
- 伤害块 `if(!fAutoDefend){...HP-=...}` → **fAutoDefend 真 = 整次免伤(无人受伤,含替挡者)**
**ts**:BattleState player 加 `coveredBy` 字段(从 role.coveredBy seed);attack.ts enemy→player 加 fAutoDefend evade(命中→damage=0 跳过结算 + emit 挡动画 hook)。需 PAL_IsPlayerDying(hp<min(100,maxHP/5),已有)。
测:forceRoll 控制 fAutoDefend;坏状态+无替挡→强制承伤。

### c4 — 魔法 auto-defend + Protect 除数(D27)
sdlpal fight.c:4719-4757 + 4801-4838:
- 魔法 autoDefend = `RandomLong(0,2)==0`(1/3),门控 sleep==0 && paralyzed==0(CLASSIC) && confused==0
- divisor = `((fDefending?2:1)*(Protect>0?2:1)) + (autoDefend?1:0)`
**ts**:magic-damage.ts:211-217(敌→玩家)。Protect 因子(现硬编码 *1)→ `*(protect>0?2:1)`;autoDefend 已是 rng.range(0,3)===0(对)。
测:magic-damage.test Protect 减半 + autoDefend 除数。

### c5 — iHidingTime 隐身全套(D24,高)
sdlpal:script.c:1911 `iHidingTime=-(INT)op0`(负);fight.c:3529-3548 CLASSIC `iHidingTime=-iHidingTime`(**纯取反无 *20 无 bBattleSpeed**);fight.c:1670-1678 每轮 `if(>0){if(--==0)fade}`;1680/1716 `==0` 才跑敌 turnStart/ready+PerformAction。
**ts**:① battle-opcodes 0x5C 后 / tick 入口:`iHidingTime<0 → =-iHidingTime`(CLASSIC 无缩放)② tickPostAction turn++ 处 per-turn `--`③ tickPerformAction 敌分支 + runEnemyTurnStartScripts 加 `iHidingTime<=0` gate。**先做①否则②③对负值失效**。
测:0x5C→转正→每回合衰减→敌跳过。

### c6 — scriptOnBattleEnd 战后 resume(D10,高)
sdlpal battle.c:1334-1337(PAL_BattleWon 内,经验+升级显示**后**、半血恢复**前**;**仅胜利**;返回值**不回写**)。
**ts**:battle-system.ts finishBattleWon(:2168)半血恢复前、finalizeBattleCleanup 前,遍历 state.enemies 跑 `en.scriptOnBattleEnd>0` runScript(runtimeMode='battle',caster=enemy,返回值不回写)。扩 finishBattleWon 签名收 state/res/bus。
测:boss scriptOnBattleEnd 战后跑(给物品/设 flag);逃跑/战败不跑。

### c7 — 真 show-once / re-arm(D10,额外保真)
sdlpal:`rgEnemy[i].wScriptOnTurnStart = PAL_RunTriggerScript(wScriptOnTurnStart, i)`(fight.c:1689-1690 等);scriptOnReady 同(1719-1720)。脚本 end→返回 0→自禁;返回非 0→re-arm。
**ts**:runScript 返回"结束时 ip / 下一 entry";runEnemyTurnStartScripts / scriptOnReady 跑完回写 en.scriptOnTurnStart/scriptOnReady。替换现硬置 0 近似。
测:end-script→字段置 0(下轮不跑);re-arm 脚本→保留。

### c8 — dualMove 二动真值(额外保真)
sdlpal fight.c:1239-1242:`(wDualMove>=2) || (wDualMove!=0 && RandomLong(0,1))` → 第二行动入 queue。
**ts**:battle-system.ts:575 enemySlots 构造 + turn-queue dualMove 语义(现 `===1` 必二动)→ 改 `>=2 必 || !=0 时 RandomLong(0,1)`。
测:dualMove=2 必二动;dualMove=1 时 50%(seeded)。

### c9 — 敌群体魔法 target=-1(额外保真)
sdlpal fight.c:4719 `wType!=kMagicTypeNormal → sTarget=-1`(全队)。
**ts**:decideEnemyAction / 敌魔法 perform 按 magic.type 决定单体 vs 全队。需带 magic 表查 wType。
测:敌 AoE 魔法打全队。

### c10 — D9 RNG 对拍 + stale 注释清(额外保真 + 收尾)
- D9:enemy-ai.ts 目标选择改 `RandomLong(0, wMaxPartyMemberIndex) over full party + while(HP==0) 重摇`(对齐 sdlpal RNG 流);扩 input 带全 party + wMaxPartyMemberIndex。
- 清 stale 注释:battle-system.ts:1669-1670(0x67)/ :1427(0x79)/ 0x90 相关。
测:RNG 流逐抽对齐(同 seed 同序列)。

---

## 2. 落点文件
- `core/battle/enemy-ai.ts`(c1 状态门 / c9 群体 / c10 RNG)
- `core/battle/actions/attack.ts`(c2 物理公式 / c3 闪避守护)
- `core/battle/magic-damage.ts`(c4 魔法 autoDefend+Protect)
- `core/battle/battle-state.ts`(c3 coveredBy 字段 seed)
- `core/battle/battle-opcodes.ts`(c5 iHidingTime 转正)
- `core/battle/battle-system.ts`(c5 衰减+跳过 / c6 scriptOnBattleEnd / c7 re-arm / c8 dualMove / c10 注释)
- `core/battle/turn-queue.ts`(c8 dualMove)
- `core/event-system.ts`(c7 runScript 返回 entry)

## 3. 完成判据
- [ ] c1-c10 全绿 + typecheck;每 commit 引 sdlpal 行号
- [ ] enemy-ai/attack/magic-damage/battle-system/battle-opcodes test 覆盖每条
- [ ] 真实数据 e2e 抽验(boss scriptOnBattleEnd / 隐身回合 / 闪避率)
- [ ] feature-status D9/D10/D24/D27 → ✅ claimed;roadmap B2 勾完
- [ ] **不误改**:D9 偏好(不存在)/ autotarget(无 bug)/ 0x90 battle sync(不加)

## 4. 进度(2026-05-31)
- [x] **c1a** 敌方状态门 — sleep/paralyzed→pass + silence→强制物理(真bug) + 0xFFFF哨兵(enemy-ai.ts)
- [x] **c1b** 混乱敌打友敌(decideEnemyAction confused 选随机活敌 + performEnemyConfusedAttack CalcBaseDamage*2/physRes;复用 'attack-mate' 按 actor.isEnemy 路由)
- [x] **c2** enemy→player 物理公式修 — def 去 (level+6)*4(真bug) + str/damage jitter + Protect/=2(attack.ts)
- [x] **c3a** 物理 fAutoDefend 闪避 — 7/17 整次全免伤 + 坏状态强制挨打(attack.ts)
- [ ] c3b 守护 cover — rgwCoveredBy 替挡查找(需 BattleState player coveredBy 字段 + projection)
- [x] **c4** 魔法 autoDefend + Protect 除因子 ×2(magic-damage.ts)
- [x] **c5** iHidingTime 隐身全套(activateHidingEffect 取反 CLASSIC 无缩放 + decrementHidingEffect 每轮衰减 + 敌整轮跳过 gate)
- [x] **c6** scriptOnBattleEnd 战后 resume(finishBattleWon 半血前逐敌跑,仅胜利,返回值不回写)
- [ ] **c7 真 show-once / re-arm(唯一剩余项;已彻查 scope,见下)**
- [x] **c8** dualMove 二动真值(turn-queue 建队列 dualMove boolean = wDualMove>=2 || (!=0 && RandomLong(0,1)))
- [x] **c9** 敌群体魔法 target=-1 —— **核查已实现**(magic.ts:284 `magic.type==='normal'?targetIdx:'all'`,忠实 fight.c:4719)
- [x] **c10** D9 RNG 对拍(decideEnemyAction party reject 采样 RandomLong+while)+ 清 stale 注释(0x67/0x79/0x90)

> 已落 main(全绿 1500 测 + typecheck):c1a/c2/c3a/c4/c1b/c5/c6/c3b/c8/c10(+ c9 核查已实现)= **12/13**。

### c7 精确 scope(已彻查 sdlpal PAL_RunTriggerScript script.c:3140-3478,留专项做)
sdlpal **真 show-once = 返回值回写**:`wScriptOnTurnStart = PAL_RunTriggerScript(wScriptOnTurnStart, i)`(fight.c:1186/1689 等)。
PAL_RunTriggerScript 返回 `wNextScriptEntry`:**0x00 Stop → 起始 entry(每轮重跑)** / **0x01 → 该行+1(前移=show-once)** / **0x02 → operand[0](re-arm 指定)**。
**真实数据**:多数 boss scriptOnTurnStart 以 0x01 结尾(show-once);但 **enemyId 23/25 以 0x00 结尾(本该每轮重显)**。
**当前 ts**:`runEnemyTurnStartScripts` 跑完硬置 `en.scriptOnTurnStart=0`(观察上 0x01 类 show-once 等价,但 **0x00 类被错误禁掉**=真 gap)。
**c7 改动**:① `runScript`(event-system.ts:2286)返回 `number` = wNextScriptEntry('end' 处:advance→ip+1 / resetTo→target / 否则→opts.ip;explore 路径 1520-1526 已有同款 nextEntry 逻辑可参照)② `runEnemyTurnStartScripts` + scriptOnReady 调用点 `en.scriptOnTurnStart = runScript(...)` 写回(替换硬置 0)。
**风险**:runScript 多处 early-return(dialog 入队挂起 / call-return / 错误)都要返回合理 entry;dialog 入队中途返回的 nextEntry 语义需对齐。**故留专项谨慎做,不在 marathon turn 末仓促改核心函数**。
