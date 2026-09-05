# 攻击 / 法术系统 四单元 三方逐函数对照审计(物理攻击 / 法术攻击 / 召唤 / 混乱打友)

| 字段 | 值 |
|---|---|
| 审计日期 | 2026-07-05 |
| sdlpal C 真值 | `reference/sdlpal/fight.c`(monorepo HEAD 同 commit) |
| 一阶段 .ts | `packages/game/src/core/battle/actions/{attack,magic,attack-mate,coop-magic}.ts` + `battle-system.ts` + `magic-damage.ts` + `magic-object.ts` + `formulas.ts` |
| reforge .ts | `packages/reforge/src/battle/battle-core.ts` + `packages/content/src/battle-formulas.ts` |
| 审计单元 | 4(物理攻击 / 法术攻击 / 召唤·法术对象 / 混乱打友) |
| 方法 | sdlpal C 真值逐函数 → 一阶段逐函数对照(✅/⚠️/❌)→ reforge 逐函数对照(✅/⚠️/❌/✨)→ 缺口 + 风险 + 行动 |

> **行号口径**:任务书给的行号(2008-2263 / 2337-3069 / 3072-3187 / 4596-4654)实际是**演出函数**(`PAL_BattleShowPlayer*Anim`)。本审计按真值逻辑层锚点重定位——逻辑真值在 `PAL_BattlePlayerPerformAction`(fight.c:3577-4486)、`PAL_BattlePlayerValidateAction`(fight.c:3249-3508)、`PAL_CalcPhysicalAttackDamage`(fight.c:253-285)、`PAL_CalcMagicDamage`(fight.c:174-250)、`PAL_BattleEnemyPerformAction`(fight.c:4551-5190)。演出已由 `battle-presentation-audit-2026-07-05.md` 覆盖,本篇只审逻辑。

---

## 审计单元 1:物理攻击

### 1.1 sdlpal C 真值(`reference/sdlpal/fight.c`)

#### `PAL_CalcBaseDamage`(fight.c:131-171)— 基础伤害骨架(物理/法术共用)
- 三段式(`atk`/`def`):
  - `atk > def` → `atk*2 - def*1.6 + 0.5`(SHORT 截断)
  - `atk > def*0.6` → `atk - def*0.6 + 0.5`
  - 否则 → `0`
- 注释「Formula courtesy of palxex and shenyanduxing」。

#### `PAL_CalcPhysicalAttackDamage`(fight.c:253-285)
- `sDamage = PAL_CalcBaseDamage(atk, def)`;`wAttackResistance != 0 → sDamage /= resist`。
- **无暴击 / 无闪避 / 无 protect 分支**——纯基础。修饰全在 caller(`PlayerPerformAction`)。

#### `PAL_BattlePlayerPerformAction` `kBattleActionAttack`(fight.c:3618-3758)— **核心**
分两条:sTarget != -1(单体)/ sTarget == -1(全体,需 `PAL_PlayerCanAttackAll`)。外层 `for t < (DualAttack?2:1)` 双击。

**单体伤害链**(fight.c:3630-3665):
```
str = PAL_GetPlayerAttackStrength(role)        // base + 装备,**无 level 项**(global.c)
def = enemy.wDefense + (enemy.wLevel+6)*4      // 等级项是"被打方"才有
res = enemy.wPhysicalResistance
sDamage = PAL_CalcPhysicalAttackDamage(str, def, res)
sDamage += RandomLong(1, 2)                     // 3637 jitter
if (RandomLong(0,5)==0 || Bravery>0) ×3         // 3639-3647 暴击(1/6 或勇敢)
if (role==0 && RandomLong(0,11)==0) ×2          // 3649-3656 李逍遥额外(1/12)
sDamage = (SHORT)(sDamage * RandomFloat(1, 1.125)) // 3658 末浮动 + SHORT 截断
if (sDamage<=0) sDamage = 1                      // 3660-3663
enemy.wHealth -= sDamage                         // 3665 WORD 下溢不钳
```

**全体伤害链**(fight.c:3681-3748):
- `fCritical = (RandomLong(0,5)==0 || Bravery>0)`(整轮摇一次,3687-3688)
- 命中序固定 `index[]={2,1,0,4,3}`(3684)
- `division` 初 1,每命中活敌后 `*= 2`(3719/3729,逐敌减半;首敌全额)
- **无 jitter / 无 RandomFloat / 无李逍遥**(真值即如此,与单体不同)

#### 暴击规则核对(任务重点①)
- **触发**:`RandomLong(0,5)==0 ‖ rgPlayerStatus[role][kStatusBravery] > 0`(fight.c:3639-3640)
- **倍率**:`sDamage *= 3`(fight.c:3645)
- **RNG 序**:`==0 || bravery` 左操作数先求值 → **即使 Bravery 恒暴击也照样消费一次 `RandomLong(0,5)`**(C 短路求值语义;测试脚本 RNG 喂值须按此序)。
- **李逍遥加成**(fight.c:3649-3656):`role==0 && RandomLong(0,11)==0` → `×2` 且置 `fCritical=TRUE`(只单体,全体无)。

#### 闪避 / 保护(cover)核对(任务重点②)
- **player→enemy 物理攻击:无闪避、无 cover**——攻击恒命中(fight.c:3618-3758 全段无 miss/cover 分支)。
- **enemy→player 物理攻击**(fight.c:4910-5149)才有「被动格挡 + 替挡」:
  - `fAutoDefend = RandomLong(0,16) >= 10`(fight.c:4938,7/17 概率全免伤,`!fAutoDefend` gate 罩住整段伤害块 5052)
  - **cover 替挡**(fight.c:4943-4968):目标濒死/坏状态 + fAutoDefend → 查 `rgwCoveredBy` 找健康替挡者;替挡者自身坏状态/濒死则挡不了(4961-4967)。
  - **Protect status**:`sDamage /= 2`(fight.c:5059-5062,truthy gate)。
- **濒死守护脚本**(fight.c:775-884,`PAL_BattlePostActionCheck`):队员跌入濒死/阵亡 → 守护者(`rgwCoveredBy`)在队且健康时跑 `ScriptOnDying`/`ScriptOnFriendDeath`(战斗内 cover 的演出体现,非免伤)。

#### 合击触发核对(任务重点⑥)
- sdlpal **合击是独立 ActionType `kBattleActionCoopMagic`**,玩家在菜单手选(fight.c:1531/3856),**不是物理攻击触发的**。
- 物理攻击分支(fight.c:3618-3758)**完全不检测 cooperativeMagic**。
- 唯一耦合点:CLASSIC 下 `fThisTurnCoop` 旗(本回合已合击 → 跳过其它动作,fight.c:3620)。

### 1.2 一阶段实现(`packages/game/src/core/battle/actions/attack.ts`)

#### `calcPhysicalAttackDamage`(`formulas.ts:54-60`)— ✅ 1:1 port
- `calcBaseDamage`(36-44)三段式逐行对齐 fight.c:157-168,每步 `asShort` 截断。
- `resist!=0 → /= resist`(57),`resist==0` 不除(防 div0)。

#### `applyPlayerAttackModifiers`(attack.ts:82-101)— ✅ **暴击链逐行对齐**
- `base + rng.rangeInclusive(1,2)`(88)↔ fight.c:3637
- `rng.rangeInclusive(0,5)===0 || bravery>0` → `×3` + `fCritical`(90-93)↔ fight.c:3639-3647
- `roleId===0 && rng.rangeInclusive(0,11)===0` → `×2`(94-96)↔ fight.c:3649-3656
- `asShort(Math.trunc(damage * rng.rangeFloat(1,1.125)))`(98)↔ fight.c:3658
- `<=0 → 1`(99)↔ fight.c:3660-3663
- **注释明确指出 RNG 消费序**(78-80):即使 Bravery 也照样摇 `RandomLong(0,5)`——对齐 C 短路求值。✅

#### 单体双击(attack.ts:242-297)— ✅
- `hits = dualAttack>0 ? 2 : 1`(247)↔ fight.c:3628
- 每 hit 独立 `applyPlayerAttackModifiers`(256,独立 RNG)↔ fight.c t-loop 内重摇
- `windup: t===0`(281)首击前摇 frame7+Delay(4)↔ fight.c:3667-3671
- WORD 下溢不钳:用算出的完整 `damage` 弹数字(266-269 注释)↔ fight.c:3665

#### 全体群攻(attack.ts:150-237)— ✅
- `HIT_ORDER = [2,1,0,4,3]`(154)↔ fight.c:3684
- 每 sweep `fCritical` 重摇、`division` 重置(168/175)↔ fight.c:3683-3688
- 命中活敌后 `division *= 2`(193)↔ fight.c:3729
- **无 jitter/RandomFloat/李逍遥**(注释 149 明示)↔ fight.c 真值
- 双击每 sweep 各建挥砍段(160-227)↔ fight.c:3745 每 sweep 调一次 ShowPlayerAttackAnim

#### 敌→我 物理(attack.ts:300-435)— ✅ 含 cover/autoDefend
- `fAutoDefend = rng.rangeInclusive(0,16) >= 10`(310)↔ fight.c:4938(7/17)
- cover 替挡(316-333):`coveredBy` 角色查找 + 替挡者坏状态/濒死则失效 ↔ fight.c:4943-4968
- `fAutoDefend` 命中 → 整次免伤(336-356,建格挡/替挡动画但不掉血)↔ fight.c:5052 gate
- `physRes = 2`(360)↔ fight.c:4934 硬编码 2
- `str + rng.rangeInclusive(0,2)` 入参(364)↔ fight.c:5056
- Protect `/= 2`(366-368)↔ fight.c:5059-5062
- 敌普攻 equivItem 中毒(380-406)↔ fight.c:5139-5146

#### 濒死守护脚本(battle-system.ts:972-1030)— ✅
- `runPlayerCasualtyScripts`:队友死 → 守护者 `ScriptOnFriendDeath`(995-998);自己濒死 → 守护者 `ScriptOnDying`(1011+)↔ fight.c:775-884
- 守护者失能/不在队 → 跳过(994 `playerBadForCasualtyScript`)↔ fight.c:794-798/860

#### 一阶段缺/差
- **无合击触发**(物理攻击不检测 coopMagic)——✅ **与 sdlpal 一致**(合击本就是独立 ActionType,见 `coop-magic.ts`)。

### 1.3 reforge 实现(`packages/reforge/src/battle/battle-core.ts`)

#### `resolveAttack`(battle-core.ts:165-172)— ❌ **无暴击 / 无 jitter / 无李逍遥**
- `Math.max(0, applyDefense(calcPhysicalAttackDamage(atk, def, physRes), defending))`
- **完全没有** `RandomLong(0,5)==0||Bravery` 的 ×3 暴击、`RandomLong(1,2)` jitter、李逍遥 ×2、`RandomFloat(1,1.125)` 末浮动。
- 物理攻击恒为基础伤害值(确定性),战斗节奏与 sdlpal 严重偏离。

#### 玩家攻击(battle-core.ts:508-522)— ❌
- `resolveAttack(p.attackStrength, e.def.stats.defense, e.def.stats.physicalResistance, e.defending)`
- **str 无 `(level+6)*6`**(sdlpal player→enemy 本就无 level 项,此项正确)✅
- **无全体群攻路径**(无 sTarget==-1 分支,无 `index[]={2,1,0,4,3}` 逐敌减半)❌
- **无 DualAttack 双击**❌

#### 敌→我 物理(battle-core.ts:661-664)— ❌
- `resolveAttack(e.def.stats.attackStrength, p.defense, 0, p.defending)` —— **physRes 硬编码 0**(sdlpal 是 2)
- **无 fAutoDefend 7/17 被动格挡**❌
- **无 cover 替挡**(`rgwCoveredBy` 在 reforge 数据模型不存在)❌
- **无 Protect `/=2`**(只 `defending` `/2`)❌
- **无濒死守护脚本触发**❌
- `applyDefense`(160-162)`defending ? trunc(dmg/2) : dmg` —— sdlpal `def` 是 `*=2`(乘在 def 上,再进 CalcPhysical),reforge 是 dmg 直接 `/2`,数值近似但口径不同(⚠️ 精度差)。

### 1.4 单元 1 结论
| 项 | sdlpal | 一阶段 | reforge |
|---|---|---|---|
| 基础公式 calcBaseDamage | fight.c:131 | ✅ formulas.ts:36 | ✅ content/battle-formulas.ts:27 |
| 暴击 (1/6‖Bravery)×3 | fight.c:3639 | ✅ attack.ts:90 | ❌ 无 |
| 李逍遥 (1/12)×2 | fight.c:3649 | ✅ attack.ts:94 | ❌ 无 |
| jitter R(1,2)+末浮动 | fight.c:3637/3658 | ✅ attack.ts:88/98 | ❌ 无 |
| 全体群攻逐敌减半 | fight.c:3681 | ✅ attack.ts:150 | ❌ 无 |
| DualAttack 双击 | fight.c:3628 | ✅ attack.ts:247 | ❌ 无 |
| enemy→player autoDefend 7/17 | fight.c:4938 | ✅ attack.ts:310 | ❌ 无 |
| cover 替挡(rgwCoveredBy) | fight.c:4943 | ✅ attack.ts:316 | ❌ 无 |
| Protect /=2 | fight.c:5059 | ✅ attack.ts:366 | ❌ 无(只 defending) |
| 濒死守护脚本 | fight.c:775 | ✅ battle-system.ts:972 | ❌ 无 |
| 合击触发(物理检测 coop) | 无(独立 ActionType) | 无(一致) | 无 |

**一阶段:逻辑层完全对齐**。**reforge:物理攻击是极简占位,缺全部暴击/闪避/cover 机制**(已知 M4 headless 占位,非 sdlpal port)。

---

## 审计单元 2:法术攻击

### 2.1 sdlpal C 真值(`reference/sdlpal/fight.c`)

#### `PAL_CalcMagicDamage`(fight.c:174-250)
```
wMagicStrength *= RandomFloat(10,11); wMagicStrength /= 10   // 215-216
sDamage = PAL_CalcBaseDamage(wMagicStrength, wDefense)        // 218
sDamage /= 4                                                   // 219
sDamage += lprgMagic[wMagicID].wBaseDamage                     // 221
if (elemental != 0):                                           // 223
  elem>NUM_ELEMENTAL(=5): sDamage *= (10 - poisonRes/mult)     // 229
  elem 1..5: sDamage *= (10 - elemRes[elem-1]/mult)            // 237
  sDamage /= 5                                                 // 240
  if elem<=5: sDamage *= (10 + fieldEffect[elem-1]); /= 10     // 242-246
```

#### `PAL_BattlePlayerValidateAction`(fight.c:3286-3359)— **MP/被封/未学降级链(任务重点③)**
法术动作合法性三检查,任一失败 `fValid=FALSE`:
1. **未学**(fight.c:3290-3301):遍历 `rgwMagic[i][role]`,找不到 `wObjectID` → 失效。
2. **被封魔**(fight.c:3305-3311):`rgPlayerStatus[role][kStatusSilence] > 0` → 失效。
3. **MP 不足**(fight.c:3313-3320):`rgwMP[role] < lprgMagic[w].wCostMP` → 失效。

**降级方向**(fight.c:3326-3358,按 magic flags):
- `kMagicFlagUsableToEnemy`(攻击系)→ **降普攻**(`ActionType=Attack`, `wActionID=0`,sTarget 沿用;3328-3332)
- 否则(辅助/治疗系)→ **降防御**(`ActionType=Defend`;3346-3349)
- applyToAll flag → sTarget=-1;单体无目标 → 自动选活敌(攻击系)/ 自己(辅助系)

**二次提交校验**(`PAL_BattleCommitAction` fight.c:1875-1898):菜单确认时 MP 不足同样降级(攻击系→Attack+选首敌;辅助系→Defend)。validate 是 perform 起手(fight.c:3611)再跑一次,防回合中被先手敌封魔/扣 MP。

#### `PAL_BattlePlayerPerformAction` `kBattleActionMagic`(fight.c:4174-4330)— **核心**
```
wObject = action.wActionID; wMagicNum = rgObject[wObject].magic.wMagicNumber
sTarget = FIGHT_DetectMagicTargetChange(wMagicNum, sTarget)   // 4182 AoE 规整
PAL_BattleShowPlayerPreMagicAnim(... fSummon)                  // 4184 前摇
rgwMP[role] -= wCostMP; <0 → 0                                 // 4189-4193 扣 MP
if (type ∈ {ApplyToPlayer, ApplyToParty, Trance}):             // 4196 防御分支
  wScriptOnUse = RunTriggerScript(... role)                     // 4214
  if (g_fScriptSuccess): DefMagic anim + wScriptOnSuccess(...w) // 4219-4222
else:                                                          // 攻击/召唤分支
  wScriptOnUse = RunTriggerScript(... role)                     // 4250
  if (g_fScriptSuccess):
    if summon: SummonMagicAnim else OffMagicAnim               // 4255-4262
    wScriptOnSuccess = RunTriggerScript(... sTarget)           // 4264
    if ((SHORT)wBaseDamage > 0):                                // 4270 伤害门
      单体/全体敌人 PAL_CalcMagicDamage(str=PAL_GetPlayerMagicStrength, ...) // 4284-4316
      sDamage<=0 → 1; wHealth -= sDamage
```
- **关键**:治疗/复活/特殊伤害真值在 **scriptOnSuccess**(气疗术 scriptOnUse=0 / scriptOnSuccess=0x1B 回血),不只 scriptOnUse。
- **scriptOnUse 失败 gate**(fight.c:4217/4253 `if(g_fScriptSuccess)`):没钱(乾坤一掷)/ 没道具(酒神)→ 不放动画、不结算、不跑 scriptOnSuccess。**MP 仍已扣**(fight.c:4190 在 scriptOnUse 前)。

#### 敌方法术(fight.c:4656-4910)— 镜像但差异大
- `wMagic!=0 && RandomLong(0,9)<wMagicRate && silence==0`(fight.c:4656-4658)门控
- `magStr = (SHORT)wMagicStrength + (wLevel+6)*6`(fight.c:4673,clamp>=0)—— 等级项是敌方专属
- `wResistanceMultiplier=20`(fight.c:4798/4833;player→enemy 是 1)
- 除因子 `((defending?2:1)*(Protect?2:1)) + (autoDefend?1:0)`(fight.c:4801-4803)
- autoDefend 1/3(fight.c:4727 `RandomLong(0,2)==0`,需非 sleep/paralyzed/confused)
- clamp `if(sDamage>hp) sDamage=hp`(fight.c:4805,**不钳最小 1**,与 player inline 不同)

### 2.2 一阶段实现

#### `calcMagicDamage`(`formulas.ts:112+`)— ✅ 1:1 port
逐行对齐 fight.c:215-246,每赋值点 `asShort` 截断;`rngFactor` 替代 `RandomFloat(10,11)/10`(调用方喂)。

#### `applyMagicDamage`(`magic-damage.ts:80-124`)— ✅ 共享核心
- player→enemy inline(fight.c:4270-4318)与 SimulateMagic(fight.c:5300-5400)共用,差 `minDamage`(inline=1,Simulate=0)。
- `def = asShort(enemy.defense) + (level+6)*4`(96)↔ fight.c:4285
- **逐敌独立 `rngFactor`**(102,群攻循环内各掷)↔ fight.c:215 在 CalcMagicDamage 内、fight.c:4288 逐敌调
- `resistMult=1`(108)↔ fight.c player→enemy
- WORD 下溢不钳,用完整 `damage`(120-121)

#### `applyEnemyMagicDamage`(`magic-damage.ts:195-270`)— ✅ 敌→我 镜像
- `magStr = asShort(magicStrength) + (level+6)*6`,clamp>=0(200-202)↔ fight.c:4673
- `resistMult=20`(250)↔ fight.c:4798
- 除因子 `(defending?2:1)*(Protect?2:1) + (autoDefend?1:0)`(258-260)↔ fight.c:4801-4803
- `rollAutoDefend`(170-193)1/3,失能无资格但不消费掷骰(短路序对齐)↔ fight.c:4727
- clamp `if(dmg>hp) dmg=hp`,**不钳最小 1**(263-264)↔ fight.c:4805
- **DM6 预掷**(211/236-240 magic.ts):scriptOnUse 之前掷 autoDefend ↔ fight.c:4723 在 4761 脚本前

#### `performMagic`(`magic.ts:123-435`)— ✅ 主流程
- 扣 MP(136-152,caster player only)↔ fight.c:4189
- `fScriptSuccess=true` → scriptOnUse(244)→ 失败 gate 早退(251-258)↔ fight.c:4217/4253
- scriptOnSuccess(278)↔ fight.c:4264
- E1 inline 伤害(305-333):`!casterIsEnemy && !defensive && (SHORT)baseDamage>0` → applyMagicDamage(minDamage=1)↔ fight.c:4270-4318
- E2 敌→我 伤害(343-365):`casterIsEnemy && (SHORT)baseDamage>0` ↔ fight.c:4772-4853
- AoE 按 `magicForcesAllTarget(type)`(`magic-damage.ts:46-48`,attackAll/attackWhole/attackField/applyToParty/summon)↔ `FIGHT_DetectMagicTargetChange`

#### MP/被封/未学 降级链(`battle-system.ts:2560-2607` DH3)— ✅ **完整 port**
- 三检查(2578-2580):`known`(rgwMagic 查)/ `silenced`(silence>0)/ `noMp`(mp<costMP)
- 降级方向(2581-2586):`offensive = spell.flags.usableToEnemy ?? true`;offensive→attack(沿用 target),else→defend
- throw-item 数量 0→attack(2587-2589);item 数量 0→defend(2590-2592)
- **二次规整**(2598-2605):降级落到 attack 时按 `attackAll` 规整全体↔单体 ↔ fight.c:3482-3498
- **死目标重选**(2618-2634):指向死敌的动作重选活敌 ↔ fight.c:3500-3507
- **performMagic 内 MP 不足仍 warn+return**(magic.ts:147-150)—— 防御性兜底(validate 已降级,正常路径不会到)

### 2.3 reforge 实现(`packages/reforge/src/battle/battle-core.ts`)

#### 玩家施法 `applyPlayerSkill`(battle-core.ts:345-429)— ⚠️ 公式对,**降级/演出缺**
- `calcMagicDamage`(386-395)用 content 公式 ✅,`resistMult=1` 敌侧抗性直用(393)⚠️(sdlpal 敌抗是 0-10 向量,reforge EnemyDef 也是 0-10,mult=1 等价直用,语义对)
- `rngFactor=1+rng()*0.1`(389)↔ fight.c:215 ✅
- **MP 不足 → log + return**(359-362):**只 skip 回合,不降级普攻/防御**❌(sdlpal validate 改 ActionType)
- **无 silence 检查**(applyPlayerSkill 内)❌ —— UI 过滤,core 无 fallback
- **无未学检查**❌(skills 预填,无运行时校验)
- **无 scriptOnUse/scriptOnSuccess 双脚本**(用 SkillEffect 枚举:380-428 damage/healHp/healMp/applyStatus)—— ⚠️ reforge 是内容驱动富模型,非 sdlpal 脚本移植(设计差异,非 bug)
- `healHp`/`applyStatus` 用于自己(单人队,404-424)—— ⚠️ 多人队友选择未实现(注释 344)
- summon 效果 `break`(378-379 纯演出)—— 见单元 3

#### 敌施法 `applyEnemySkill`(battle-core.ts:526-581)— ⚠️
- 公式对(545-558),`resistMult=10`(553,玩家抗 100+mod)✅
- **无 autoDefend 1/3**❌(只 `defending` `/2`)
- **无 Protect 除因子**❌
- `applyStatus` 无命中判定 rng(569-575 直接施加)⚠️(sdlpal 有 `rng(0,9)>=resistanceToSorcery`,reforge applyPlayerSkill 有 418,敌侧漏)
- clamp 最小 1(542,`Math.max(1,...)`)—— ❌ sdlpal 敌→我是 `if(dmg>hp)dmg=hp` **不钳最小 1**(fight.c:4805)

### 2.4 单元 2 结论
| 项 | sdlpal | 一阶段 | reforge |
|---|---|---|---|
| calcMagicDamage 公式 | fight.c:174 | ✅ formulas.ts:112 | ✅ content/battle-formulas.ts:82 |
| 逐敌独立 rngFactor | fight.c:215/4288 | ✅ magic-damage.ts:102 | ✅ battle-core.ts:389 |
| MP/被封/未学 降级→普攻 | fight.c:3328 | ✅ battle-system.ts:2583 | ❌ 只 skip(log) |
| MP/被封/未学 降级→防御 | fight.c:3348 | ✅ battle-system.ts:2585 | ❌ 只 skip(log) |
| 二次规整 attackAll↔单体 | fight.c:3482 | ✅ battle-system.ts:2598 | ❌ 无 |
| 死目标重选 | fight.c:3500 | ✅ battle-system.ts:2618 | ⚠️ 目标死空过(510) |
| scriptOnUse 失败 gate | fight.c:4217 | ✅ magic.ts:251 | ❌ 无脚本系统 |
| scriptOnSuccess 治疗真值 | fight.c:4264 | ✅ magic.ts:278 | ❌ 用 SkillEffect 枚举(设计差) |
| 敌→我 autoDefend 1/3 | fight.c:4727 | ✅ magic-damage.ts:170 | ❌ 无 |
| 敌→我 Protect 除因子 | fight.c:4801 | ✅ magic-damage.ts:258 | ❌ 无 |
| 敌→我 clamp 不钳最小1 | fight.c:4805 | ✅ magic-damage.ts:263 | ❌ Math.max(1,...) |

**一阶段:法术逻辑完全对齐**(含降级链、双脚本、敌→我减伤)。**reforge:公式对,但缺降级链、autoDefend、Protect,且敌→我 clamp 口径错**。

---

## 审计单元 3:法术对象 / 召唤

### 3.1 sdlpal C 真值(`reference/sdlpal/fight.c`)

#### 召唤魔法 perform(`kBattleActionMagic` summon 分支,fight.c:4255-4318)
- `type==kMagicTypeSummon` → `PAL_BattleShowPlayerSummonMagicAnim`(fight.c:4257)
- 否则 → `PAL_BattleShowPlayerOffMagicAnim`(fight.c:4261)
- **伤害结算与普通攻击魔法同**(fight.c:4270-4318,inline `PAL_CalcMagicDamage`),summon 不走特殊伤害路径。

#### `PAL_BattleShowPlayerSummonMagicAnim`(fight.c:3072-3187)— **special 层序(任务重点④)**
- **召唤神 chunk** = `lprgMagic[wMagicNum].wSummonEffect + 10`(fight.c:3135,F.MKF chunk)
- **二次法术效果** = `lprgMagic[wMagicNum].wEffect`(magic 编号,fight.c:3098-3105)→ 解析成 secondary magic → `PAL_BattleShowPlayerOffMagicAnim(-1, ..., -1, TRUE)`(fight.c:3186,全敌 + secondary 落点)
- **special 字段语义**:`wSummonEffect` 对召唤 = 召唤神精灵 chunk(非 sLayerOffset);二次法术 magic 的 `special` 才是 sLayerOffset(z 排序)。
- **层序风险**(battle-audit §2-2):手搭 magic 必传 `special`(二次法术的 sLayerOffset),否则 `layerOffset=0` → 法术精灵被敌堆遮挡。

#### `PAL_BattleSimulateMagic`(fight.c:5301-5400)— **投掷/0x66 共用**
- guard `lprgMagic[...].wBaseDamage > 0 || wBaseDamage > 0`(fight.c:5342,**无符号** WORD 比较)
- applyToAll flag → sTarget=-1;单体无目标 → 自动选首活敌(5334)
- `PAL_CalcMagicDamage(wBaseDamage=op1, ..., mult=1, magic)`(5365/5389)
- `sDamage<0 → 0`(fight.c:5368/5392,**允许 0**,与 inline 的 `<=0→1` 不同)

#### 法术对象解析(sdlpal)
`rgObject[id].magic` —— OBJECT union 的 magic 视图,`wMagicNumber` 指向 `lprgMagic[]`。边界对象(梦蛇 id=295)在 item 段但 magic view 仍有效。

### 3.2 一阶段实现

#### `resolveMagicObject`(`magic-object.ts:18-52`)— ✅
- 优先 `spells.json`(`spell.magicNumber → magics`)↔ OBJECT_MAGIC 296..397
- fallback `objectMagics.json`(边界对象如梦蛇 295)↔ rgObject[id].magic
- source 标记 `'spell'|'objectMagic'`(7)

#### `simulateMagic`(`magic-damage.ts:304-337`)— ✅ 0x42/0x66 共用核心
- 无符号 guard `magic.baseDamage>0 || magStr>0`(312)↔ fight.c:5342
- applyToAll → all;单体无目标 → 首活敌(320-326)↔ fight.c:5334
- `minDamage=0`(335)↔ fight.c:5368(`sDamage<0→0`)

#### 召唤 `buildAndStartSummonAnim`(`magic.ts:585-678`)— ✅
- `summonChunk = magic.special + 10`(592)↔ fight.c:3135
- `secondary = magics.find(m => m.id === magic.effect)`(613)↔ fight.c:3098-3105
- secondary OffMagic 落点全敌 casterIdx=-1(617-630)↔ fight.c:3186
- **DM9 special 透传**(621 `special: secondary.special`)—— 修 battle-audit §2-2 "召唤二次法术 layerOffset 落 0 被敌堆遮"(注释明示)
- 召唤神序列:fadeIn crossfade → 逐帧 loop → 二次效果 → **PostMagic 敌抖(神留场)** → fadeOut(664-675)↔ fight.c:4323 神在场 → 899 后淡出
- 复位全体队员挂 fadeOut 首帧(655-662)↔ fight.c:901 UpdateFighters 在 911 fadeOut 前

#### 召唤伤害(magic.ts:386-389 + 305-333)
- summon 走 E1 inline 路径(`!casterIsEnemy && baseDamage>0`),与普通攻击法术同 ↔ fight.c:4270-4318 summon 不走特殊伤害

#### 合击召唤 `buildAndStartCoopSummonAnim`(`coop-magic.ts:247-324`)— ✅
- 同结构,summon 型协力合击(天剑等)
- **DM9 special 透传**(291 `special: secondary.special`)—— 修 "合体二次法术 layerOffset 落 0"(4cf2258 漏网路径)

#### 法术对象 special 层序核对(任务重点④)
- **battle-audit §2-2 提的"漏传 special"已全部修复**:
  - magic.ts:526(主 OffMagic)/ 621(召唤二次)/ 784/809(DefMagic 两路径)
  - coop-magic.ts:223(合击主)/ 291(合击召唤二次)
- 所有 OffMagic/DefMagic builder 都透传 `special` → `sLayerOffset`(anim-timeline.ts:870/1383/1671 `layerOffset = asShort(special)`)↔ fight.c:2735/battle.c:441-442 PAL_Y+sLayerOffset 排序
- ✅ **一阶段对齐**

### 3.3 reforge 实现(`packages/reforge/src/battle/battle-core.ts`)

#### 召唤(battle-core.ts:635-653)— ✨ **语义完全不同(敌方 summon)**
- reforge summon = **敌人召唤新敌人加入战斗**(635-653,push 到 `s.enemies`),非 sdlpal 玩家召唤神。
- 槽位上限 `MAX_ENEMIES=5`(272),`n = min(count, slots)`(637)
- **无召唤神精灵 / 无二次法术效果 / 无 special 层序**——reforge 是 headless 状态机,无渲染层(sLayerOffset 概念不存在)。
- SkillEffect `summon`(378-379 `break` 纯演出)—— 玩家侧召唤在 reforge 无 gameplay 结算(注释明示"由链上 damage 结算")。

#### 法术对象解析
- reforge 无 spells.json/objectMagics 双源解析——用 `s.skills[skillId]`(content SkillData,353),`skillId` 是内容侧人类可读 id,非 sdlpal object id。
- **无 SimulateMagic 等价**(投掷 0x42/0x66)—— reforge throw-item 走 SkillEffect(battle-core.ts:476-503),无 magic 对象解析。

### 3.4 单元 3 结论
| 项 | sdlpal | 一阶段 | reforge |
|---|---|---|---|
| 召唤神 chunk=special+10 | fight.c:3135 | ✅ magic.ts:592 | ❌ 无(语义不同) |
| 二次法术 magic.effect | fight.c:3098 | ✅ magic.ts:613 | ❌ 无 |
| special 层序(§2-2) | fight.c:2735 | ✅ 全路径透传(已修) | ❌ 无渲染层 |
| 召唤伤害=inline 路径 | fight.c:4270 | ✅ magic.ts:386 | ❌ summon break(无结算) |
| SimulateMagic 0x42/0x66 | fight.c:5301 | ✅ magic-damage.ts:304 | ❌ 无 |
| 法术对象双源解析 | rgObject[id].magic | ✅ magic-object.ts:18 | ❌ 用 SkillData |
| 敌方 summon(加敌) | 无(sdlpal 玩家召唤神) | 无 | ✨ battle-core.ts:635(新语义) |

**一阶段:召唤/法术对象完全对齐**,§2-2 special 层序已修复。**reforge:summon 是"敌方召唤新敌人"的独立语义,与 sdlpal 玩家召唤神无关**(设计差异,非缺陷;headless 核无渲染层)。

---

## 审计单元 4:攻击队友(混乱)

### 4.1 sdlpal C 真值(`reference/sdlpal/fight.c`)

#### 混乱触发(`PAL_BattleStartFrame` fight.c:1308-1313)
```
else if (rgPlayerStatus[wPlayerRole][kStatusConfused] > 0):
  action.ActionType = (PAL_IsPlayerDying(role) ? kBattleActionPass : kBattleActionAttackMate)
  action.flRemainingTime = 0
```
- 混乱非濒死 → 强制 `kBattleActionAttackMate`(每帧重设,CLASSIC 行为)
- 混乱濒死 → Pass(不攻击)

#### `kBattleActionAttackMate` 伤害(fight.c:3812-3835)— **任务重点⑤**
```
str = PAL_GetPlayerAttackStrength(caster)                      // 3812 base+装备,无 level
def = PAL_GetPlayerDefense(target)                             // 3813 base+装备,无 level
if (target.fDefending) def *= 2                                 // 3814-3817
sDamage = PAL_CalcPhysicalAttackDamage(str, def, 2)             // 3819 res 硬编码 2
if (rgPlayerStatus[target][kStatusProtect] > 0) sDamage /= 2    // 3820-3823
if (sDamage <= 0) sDamage = 1                                   // 3825-3828
if (sDamage > target.hp) sDamage = target.hp                    // 3830-3833 clamp 到剩余血
target.hp -= sDamage                                            // 3835
```
- **"攻/2"口径**:`res=2` → `PAL_CalcPhysicalAttackDamage` 内 `sDamage /= 2`(fight.c:282)。即混乱打友伤害 ≈ 基础伤害/2(再叠 Protect 则再 /2)。**任务重点⑤成立**。
- **无暴击 / 无 jitter / 无李逍遥**(AttackMate 分支真值即如此,区别于普通单体物攻)。
- **clamp 到剩余血**(fight.c:3830-3833)—— 与 player→enemy 的 WORD 下溢不钳**相反**(故意不对称:打友不会超杀显示)。

#### 目标选择(fight.c:3768-3789)
- 检查是否有其他活友军(3768-3779);无 → 不进 do-while(Pass)
- `do sTarget = RandomLong(0, wMaxPartyMemberIndex) while (sTarget==self || HP[sTarget]==0)`(3786-3789)

#### validate 修正(fight.c:3448-3479)
- `kBattleActionAttackMate` + 非 confused → 改回 `kBattleActionAttack`(打敌,3449-3457)
- confused 但无活友军 → `kBattleActionPass`(3469-3477,注释"DISABLE since original version behaviour is not same")

#### 敌方混乱(fight.c:4591-4655)— **公式不同**
```
str = (SHORT)enemy.wAttackStrength + (wLevel+6)*6    // 4634-4635
def = (SHORT)enemy.wDefense + (wLevel+6)*4            // 4636-4637
sDamage = PAL_CalcBaseDamage(str, def) * 2 / enemy.wPhysicalResistance  // 4638
if (sDamage<=0) sDamage = 1                            // 4640
enemy.wHealth -= sDamage                               // 4645
```
- 敌混乱打**友敌**(随机活敌,排除自己,4593-4595),用 `CalcBaseDamage*2/physRes`(不是 `CalcPhysicalAttackDamage`)。
- 与玩家 AttackMate(res=2)是**两条不同公式**。

### 4.2 一阶段实现

#### `performAttackMate`(`attack-mate.ts:37-103`)— ✅ **逐行 port**
- 目标选择(48-65):`forcedTarget` 给定用之;否则随机活友军(`do rng.rangeInclusive(0,maxIdx) while self||hp==0`)↔ fight.c:3786-3789
- 无活友军 → return(60)↔ fight.c:3781
- str/def(71-75):`role.attackStrength`/`role.defense`(无 level 项,P0 修 2026-06-02)↔ fight.c:3812-3813
- `defending → def*=2`(75)↔ fight.c:3814-3817
- `calcPhysicalAttackDamage(str, def, 2)`(78)↔ fight.c:3819 **res=2**
- `Protect>0 → floor(dmg/2)`(79)↔ fight.c:3820-3823
- `<=0 → 1`(80)↔ fight.c:3825-3828
- **clamp 到剩余血**(82 `if(dmg>before) dmg=before`)↔ fight.c:3830-3833 ✅(与 player→enemy 不钳相反,口径对)
- 武器声(88,只武器声无起手/暴击声)↔ fight.c:3810
- 走入动画(95-99 buildAttackMateTimeline)↔ fight.c:3791-3858

#### 混乱触发(`battle-system.ts` `resolveConfusedAttack` 2670-2684)— ⚠️ **有意偏离 sdlpal CLASSIC**
- **一阶段选"原版"语义**(注释 2664-2668 明示):随机攻击**任一存活目标(敌方或友方,排除自己)**,非 sdlpal CLASSIC 的"只打友军"。
- sdlpal CLASSIC(只 AttackMate)源码注释 `since original version behaviour is not same` 已承认偏离原版 —— 一阶段改回原版随机敌/友。
- 池空 → Pass(2679)↔ fight.c:3469-3477
- **敌方目标 → performAttack**(完整动画);**友方目标 → performAttackMate**(打该友军,2681-2683)
- ⚠️ **设计决策非 bug**:用户 2026-05-31 拍板忠于原版。`performAttackMate` 内部 `forcedTarget` 参数(attack-mate.ts:42)即为此设计服务。

#### 敌方混乱 `performEnemyConfusedAttack`(`attack.ts:450-497`)— ✅
- `str = asShort(attacker.attackStrength) + (level+6)*6`(460)↔ fight.c:4634-4635
- `def = asShort(target.defense) + (level+6)*4`(461)↔ fight.c:4636-4637
- `calcBaseDamage(str,def)*2 / physRes`(462-463)↔ fight.c:4638 **(用 CalcBaseDamage 不是 CalcPhysical)**
- `physRes==0 → base2`(463 防 div0,sdlpal 敌 physRes 不会 0 但兜底)
- `<=0 → 1`(464)↔ fight.c:4640
- WORD 下溢不钳,用完整 `damage`(470 注释)↔ fight.c:4645
- 动画(474-489 buildEnemyConfusedAttackTimeline)↔ fight.c:4596-4654

### 4.3 reforge 实现(`packages/reforge/src/battle/battle-core.ts`)

#### 混乱 / AttackMate — ❌ **完全缺失**
- `canAct`(battle-core.ts:215 注释)「confused 由状态机改派攻击友方,不在此拦」—— **但状态机里没有改派逻辑**。
- `performPlayerAction`(431-523)/`performEnemyAction`(583-665)全段**无 confused 分支**。
- `BattleStatus` 有 `confused` 字段(content/battle-formulas.ts:187),`tickBattleStatus` 会衰减,但**无任何消费方**。
- ❌ 玩家混乱不会 AttackMate;❌ 敌方混乱不会打友敌;❌ 无伤害公式。

#### 单元 4 结论
| 项 | sdlpal | 一阶段 | reforge |
|---|---|---|---|
| 混乱→AttackMate 触发 | fight.c:1308 | ✅(改原版随机敌/友,有意偏离) | ❌ 无 |
| AttackMate 伤害 res=2(攻/2) | fight.c:3819 | ✅ attack-mate.ts:78 | ❌ 无 |
| AttackMate Protect/=2 | fight.c:3820 | ✅ attack-mate.ts:79 | ❌ 无 |
| clamp 到剩余血 | fight.c:3830 | ✅ attack-mate.ts:82 | ❌ 无 |
| 无暴击/jitter(AttackMate) | fight.c:3812-3835 | ✅(无修饰) | ❌ 无 |
| 敌混乱打友敌 CalcBase*2/res | fight.c:4638 | ✅ attack.ts:462 | ❌ 无 |
| 混乱濒死→Pass | fight.c:1311 | ✅ resolveConfusedAttack 池空 Pass | ❌ 无 |

**一阶段:AttackMate 公式逐行对齐;混乱触发有意用原版语义(用户拍板)**。**reforge:混乱机制完全缺失**(状态字段存在但无消费方)。

---

## 总体缺口与风险

### 一阶段(game/)— ✅ 逻辑层完全对齐
本审计 4 单元(物理/法术/召唤/混乱)的逻辑层与 sdlpal 逐函数对齐,含:
- 暴击/jitter/李逍遥 RNG 序(attack.ts:82-101)
- MP/被封/未学 降级链(battle-system.ts:2560-2607 DH3)
- 敌→我 autoDefend/cover/Protect(magic-damage.ts:170/258 + attack.ts:310-368)
- 召唤 special 层序(§2-2 已全路径修复)
- AttackMate res=2 攻/2(attack-mate.ts:78)
- 敌混乱 CalcBaseDamage*2/physRes(attack.ts:462)

**唯一有意偏离**:`resolveConfusedAttack`(battle-system.ts:2670)用原版随机敌/友,非 sdlpal CLASSIC 只打友军(用户 2026-05-31 拍板,注释充分)。

### reforge(reforge/)— ❌ 攻击/法术机制大面积缺失(已知占位)
reforge `battle-core.ts` 是 **M4 headless 回合战核**(设计文档 `battle-model-m4-design.md`),**非 sdlpal port**。基于 content 驱动的 SkillData/EnemyDef 规则求值,逻辑层与 sdlpal 差异大:

**完全缺失**(❌):
1. 物理暴击(1/6‖Bravery)×3 + 李逍遥 ×2 + jitter + 末浮动
2. 全体群攻逐敌减半(index[]={2,1,0,4,3})
3. DualAttack 双击
4. enemy→player autoDefend 7/17 + cover 替挡 + Protect /=2
5. 濒死守护脚本(ScriptOnDying/ScriptOnFriendDeath)
6. MP/被封/未学 降级链(只 skip 回合,不降级普攻/防御)
7. 敌→我 autoDefend 1/3 + Protect 除因子
8. 混乱 / AttackMate / 敌混乱打友敌(状态字段存在但无消费方)
9. 合击(coop magic)

**口径错**(⚠️/❌):
- 敌→我 物理攻击 physRes 硬编码 0(sdlpal 是 2,battle-core.ts:662)
- 敌→我 法术 clamp `Math.max(1,...)`(sdlpal 不钳最小 1,battle-core.ts:542)
- `applyDefense` 用 dmg/2(sdlpal 是 def*=2,精度近似但口径不同)
- 敌 applyStatus 无命中判定 rng(battle-core.ts:569,玩家侧 418 有)

**设计差异**(✨,非缺陷):
- summon = 敌方召唤新敌人(battle-core.ts:635),非 sdlpal 玩家召唤神(headless 核无渲染层)
- SkillEffect 枚举替代 sdlpal 脚本系统(内容驱动富模型)

### 风险评估
- **一阶段 → reforge 迁移风险高**:reforge 缺失的 9 项机制若直接用 reforge 核替换一阶段,战斗手感/数值/策略全变(无暴击、无闪避、无混乱、无合击)。迁移前必须逐项补齐或明确接受降级。
- **reforge 敌→我 clamp 口径错**会导致低伤情况显示 1 而非 0(与 sdlpal 不符),影响"免疫"观感。
- **reforge 混乱字段僵尸**:`BattleStatus.confused` 存在但无消费,迁移时易误以为已实现。

### 行动建议
1. **一阶段**:无需行动(逻辑层已对齐;`resolveConfusedAttack` 偏离已有用户拍板 + 注释)。
2. **reforge**(若计划用作生产战斗核):
   - 补物理暴击/jitter/李逍遥到 `resolveAttack` 或其 caller。
   - 补 enemy→player autoDefend/cover/Protect + physRes=2。
   - 补 MP/被封/未学 降级链(validate-time action mutation)。
   - 补混乱 AttackMate + 敌混乱打友敌(消费 `confused` 字段)。
   - 修敌→我法术 clamp(去 `Math.max(1,...)`,改 `if(dmg>hp)dmg=hp`)。
   - 或:明确 reforge 定位为"数值模拟器/单测核",生产战斗仍走一阶段 core(若已是此定位,本审计缺口 = 设计预期,无需补)。

---

## 附:三方文件锚点速查

| 逻辑 | sdlpal | 一阶段 | reforge |
|---|---|---|---|
| 基础伤害 | fight.c:131 `PAL_CalcBaseDamage` | formulas.ts:36 | content/battle-formulas.ts:27 |
| 物理伤害 | fight.c:253 `PAL_CalcPhysicalAttackDamage` | formulas.ts:54 | content/battle-formulas.ts:37 |
| 法术伤害 | fight.c:174 `PAL_CalcMagicDamage` | formulas.ts:112 | content/battle-formulas.ts:82 |
| 玩家物攻 perform | fight.c:3618 `kBattleActionAttack` | attack.ts:242(单体)/150(全体) | battle-core.ts:508 |
| 暴击修饰 | fight.c:3639-3656 | attack.ts:82-101 | ❌ 无 |
| 敌→我 物攻 | fight.c:4910-5149 | attack.ts:300-435 | battle-core.ts:661 |
| autoDefend/cover | fight.c:4938/4943 | attack.ts:310-356 | ❌ 无 |
| 濒死守护 | fight.c:775-884 | battle-system.ts:972 | ❌ 无 |
| 玩家施法 perform | fight.c:4174 `kBattleActionMagic` | magic.ts:123 | battle-core.ts:345 |
| validate 降级链 | fight.c:3286 `PAL_BattlePlayerValidateAction` | battle-system.ts:2560 | ❌ 无(battle-core.ts:359 只 skip) |
| 死目标重选 | fight.c:3500 | battle-system.ts:2618 | battle-core.ts:510(空过) |
| inline 法术伤害 | fight.c:4270-4318 | magic-damage.ts:80 `applyMagicDamage` | battle-core.ts:380 |
| 敌→我 法术伤害 | fight.c:4772-4853 | magic-damage.ts:195 `applyEnemyMagicDamage` | battle-core.ts:539 |
| 召唤 perform | fight.c:4255/3072 | magic.ts:585 `buildAndStartSummonAnim` | battle-core.ts:635(语义不同) |
| SimulateMagic | fight.c:5301 | magic-damage.ts:304 `simulateMagic` | ❌ 无 |
| 法术对象解析 | rgObject[id].magic | magic-object.ts:18 `resolveMagicObject` | ❌ 用 SkillData |
| 混乱触发 | fight.c:1308 | battle-system.ts:2670 `resolveConfusedAttack` | ❌ 无 |
| AttackMate 伤害 | fight.c:3812-3835 | attack-mate.ts:37 `performAttackMate` | ❌ 无 |
| 敌混乱打友敌 | fight.c:4591-4655 | attack.ts:450 `performEnemyConfusedAttack` | ❌ 无 |
| 合击 perform | fight.c:3856 `kBattleActionCoopMagic` | coop-magic.ts:92 `performCoopMagic` | ❌ 无 |
