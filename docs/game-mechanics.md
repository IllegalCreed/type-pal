# Game Mechanics · 原版底层机制真值

> 原版隐藏在数据/战斗逻辑里、玩家不可直接看见的底层规则。**真值基准 = sdlpal C 源**(`reference/sdlpal/*.c` / `*.h`),每条都带行号出处。
> 本文件只记"机制规则本身",ts 实现状态另在每节末尾的 **ts 实现状态** 小节标注(防止把"原版规则"和"我们做到哪"混淆)。
> 截图/印象只用来发现机制,**不作为依据** —— 一切以下方源出处为准。

## 索引

- [隐藏属性经验 / 等级系统](#隐藏属性经验--等级系统)
- [伤害计算:攻击力 vs 防御值](#伤害计算攻击力-vs-防御值)
- [暴击 与 李逍遥会心一击](#暴击-与-李逍遥会心一击)
- [防御机制:主动防御 / 自动防御 / 援护 / 护体](#防御机制主动防御--自动防御--援护--护体)
- [群体普攻伤害递减](#群体普攻伤害递减)
- [战后 HP / MP 恢复](#战后-hp--mp-恢复)
- [五灵 / 毒 抗性与五行机制](#五灵--毒-抗性与五行机制)
- [战斗场景对五灵仙术的影响](#战斗场景对五灵仙术的影响)
- [合击仙术](#合击仙术)
- [身法与出手顺序](#身法与出手顺序)
- [吉运(只影响逃跑成功率)](#吉运只影响逃跑成功率)
- [特殊技能成功率(秒杀 / 偷取 / 上状态)](#特殊技能成功率秒杀--偷取--上状态)
- [抗性体系总览 与 巫术命中判定](#抗性体系总览-与-巫术命中判定)
- [异常状态效果:眠 / 定身 / 疯魔 / 封技](#异常状态效果眠--定身--疯魔--封技)
- [毒系统:等级 / 每回合伤害 / 七大毒 / 相生相克](#毒系统等级--每回合伤害--七大毒--相生相克)

---

## 隐藏属性经验 / 等级系统

### TL;DR

除人物**主经验 / 主等级**外,原版给每个角色另设**一组隐藏属性经验池**。战斗中按角色执行的**动作种类**累计临时计数(`wCount`);**战斗胜利后**,把本场获得的主经验 **×2** 按各动作计数的**比例**分配进这些隐藏经验池,经验跨过阈值就**永久提升对应属性**(每级 +1~2)。

一句话:**普攻练武术/体力,法术练灵力/真气,防御练防御,逃跑(失败)练吉运** —— 玩家听到的说法方向正确。但有 4 个容易踩的坑,见下方 [重要约束](#重要约束容易误解的点)。

### 1. 数据结构

源:[global.h:475-493](../reference/sdlpal/global.h#L475-L493)。

```c
typedef struct tagEXPERIENCE {
   WORD wExp;       // 当前隐藏经验(余数,跨战斗持久)
   WORD wReserved;
   WORD wLevel;     // 当前隐藏等级(跨战斗持久)
   WORD wCount;     // 本场动作计数(临时权重,每战清零)
} EXPERIENCE;

typedef struct tagALLEXPERIENCE {
   EXPERIENCE rgPrimaryExp[MAX_PLAYER_ROLES];     // 主经验(= 人物等级)
   EXPERIENCE rgHealthExp[MAX_PLAYER_ROLES];      // 体力   → 最大HP   (rgwMaxHP)
   EXPERIENCE rgMagicExp[MAX_PLAYER_ROLES];       // 真气   → 最大MP   (rgwMaxMP)
   EXPERIENCE rgAttackExp[MAX_PLAYER_ROLES];      // 武术   → 攻击力   (rgwAttackStrength)
   EXPERIENCE rgMagicPowerExp[MAX_PLAYER_ROLES];  // 灵力   → 法术    (rgwMagicStrength)
   EXPERIENCE rgDefenseExp[MAX_PLAYER_ROLES];     // 防御   → 防御    (rgwDefense)
   EXPERIENCE rgDexterityExp[MAX_PLAYER_ROLES];   // 身法   → 身法    (rgwDexterity)  ← 见坑①
   EXPERIENCE rgFleeExp[MAX_PLAYER_ROLES];        // 吉运   → 逃跑率   (rgwFleeRate)
} ALLEXPERIENCE;
```

- 共 **8 组**:主经验 + 7 个隐藏属性,每组按角色(`MAX_PLAYER_ROLES`)一份。
- `wExp` / `wLevel` 写进存档、跨战斗保留;`wCount` 是单场临时权重。
- 隐藏等级 `wLevel` **初始 = 角色起始等级**(新游戏/读档时):[global.c:463](../reference/sdlpal/global.c#L463) 把每组 `wLevel` 初始化为 `rgwLevel[i]`。

### 2. 战斗中:按动作累计 `wCount`

源:[fight.c](../reference/sdlpal/fight.c),`PAL_BattlePlayerPerformAction` 各 action case。**全部** 6 个累计点(穷尽,无遗漏):

| 玩家动作 | sdlpal action | 源行号 | 累计 |
|---|---|---|---|
| 普通攻击 | `kBattleActionAttack` | [3756-3757](../reference/sdlpal/fight.c#L3756-L3757) | `rgAttackExp.wCount += 1`<br>`rgHealthExp.wCount += RandomLong(2,3)` |
| 施法 | `kBattleActionMagic` | [4328-4329](../reference/sdlpal/fight.c#L4328-L4329) | `rgMagicExp.wCount += RandomLong(2,3)`<br>`rgMagicPowerExp.wCount += 1` |
| 防御 | `kBattleActionDefend` | [4116](../reference/sdlpal/fight.c#L4116) | `rgDefenseExp.wCount += 2` |
| 逃跑(**失败时**) | `kBattleActionFlee` | [4170](../reference/sdlpal/fight.c#L4170) | `rgFleeExp.wCount += 2` |

> `RandomLong(2,3)` = 闭区间随机 2 或 3。
> **没有**为身法(Dexterity)、使用物品、投掷物品、合击、待机等累计任何 `wCount`(见坑①)。

### 3. 战斗胜利后:×2 经验按比例分配

源:[battle.c `PAL_BattleWon`](../reference/sdlpal/battle.c#L991),宏 `CHECK_HIDDEN_EXP` [battle.c:1238-1284](../reference/sdlpal/battle.c#L1238-L1284)。对每个**存活**队员([1093](../reference/sdlpal/battle.c#L1093) 跳过死亡角色):

**Step A — 主经验**([1098-1120](../reference/sdlpal/battle.c#L1098-L1120)):本场 `iExpGained`(= 击败的全部敌人 `wExp` 之和)直接加进 `rgPrimaryExp.wExp`,跨 `rgLevelUpExp` 阈值则升人物等级。

**Step B — 隐藏属性**([1226-1284](../reference/sdlpal/battle.c#L1226-L1284)):先把 7 个隐藏池的 `wCount` 求和为 `iTotalCount`(**不含主经验**,[1228-1234](../reference/sdlpal/battle.c#L1228-L1234));`iTotalCount > 0` 时,对每个隐藏属性按 `CHECK_HIDDEN_EXP` 结算:

```c
// 整数运算,注意 /iTotalCount 先于 *2
dwExp  = iExpGained * wCount / iTotalCount * 2;   // 本场经验 × 占比 × 2
dwExp += 该属性已有 wExp;                           // 加上以前的余数
while (dwExp >= rgLevelUpExp[wLevel]) {            // 跨阈值即升隐藏级
   dwExp -= rgLevelUpExp[wLevel];
   stat  += RandomLong(1, 2);                      // 对应属性 +1 或 +2
   if (wLevel < MAX_LEVELS) wLevel++;
}
wExp = dwExp;                                       // 余数留到下场
```

要点:

- **"两倍"是总量**:因为各属性 `wCount/iTotalCount` 之和 = 1,乘 2 后 → 每场胜利向隐藏池**总共**注入约 `2 × iExpGained` 的经验,按动作比例切分。所以本场怪给的主经验越高,分到隐藏属性的越多。
- **阈值表与主等级共用** `rgLevelUpExp`([1252](../reference/sdlpal/battle.c#L1252))。隐藏等级又初始 = 角色等级,所以练隐藏属性和升主级**成本同量级**,涨得慢。
- 每升一个隐藏级,属性 **+RandomLong(1,2)**;若有变化,战斗结算画面弹"XXX 属性 升一级"框([1264-1273](../reference/sdlpal/battle.c#L1264-L1273))。

### 4. 重要约束(容易误解的点)

- **坑①:身法(Dexterity)没有任何来源。** 穷尽全部 `.c`,`rgDexterityExp.wCount` 只有**读取 / 清零 / 初始化**,**没有任何 `+=` 累计点**。它有槽位、参与 `iTotalCount` 求和、也会在 `CHECK_HIDDEN_EXP` 里被结算,但因为永远是 0,该机制**永远不会**提升身法。身法只能靠**主等级升级表**(`PAL_PlayerLevelUp`)成长。
- **坑②:逃跑只在"失败"时给吉运。** `rgFleeExp.wCount += 2` 在 [fight.c:4170](../reference/sdlpal/fight.c#L4170) 的 `else`(逃跑失败)分支里;逃跑**成功**直接离开战斗,不给吉运、也不触发任何结算。
- **坑③:只有"战斗胜利"才结算。** `CHECK_HIDDEN_EXP` 只在 `PAL_BattleWon` 跑。整场积的 `wCount` 只是临时权重 —— 打输 / 逃跑成功 → 本场所有动作权重作废、不结算。
- **坑④:`wCount` 每场清零。** 战斗结束统一清零([battle.c:1579-1585](../reference/sdlpal/battle.c#L1579-L1585)),不跨场累计。真正跨场持久的是结算后的 `wExp`(余数)和 `wLevel`。
- **`wCount` 不是经验值本身**,是"本场动作占比权重";真正进账的隐藏经验来自本场主经验的二倍按权重切分。

### 5. ts 实现状态

> ⚠️ **整套隐藏经验机制目前未实现** —— 只有数据结构壳子。文档此节是 spec,不是"已做"记录。

- 数据结构:[game-state.ts:391-409](../packages/game/src/core/game-state.ts#L391-L409) 有 `AllExperience`(8 池),但 `ExpEntry` 只保留 `wExp`/`wLevel`,**`wCount` 被注释为"仅供兼容,运行时不需要"而丢弃**([game-state.ts:388-392](../packages/game/src/core/game-state.ts#L388-L392))。
- 累计 `wCount`:**未实现**。[defend.ts:6](../packages/game/src/core/battle/actions/defend.ts#L6) 明确标注"M3 不实现 exp count";其余动作同理。
- 胜利结算:[battle-system.ts](../packages/game/src/core/battle/battle-system.ts#L880-L905) 的 `PAL_BattleWon` 只把 `expGained` 加进 `rgPrimaryExp.wExp`,**连主等级 level-up loop 都还是 follow-up**(需注入 `rgLevelUpExp` 表 + 属性加成随机公式);**隐藏属性 `CHECK_HIDDEN_EXP` 分配完全没做**。

**要 1:1 还原需补**:① 4 个动作 case 累计 `wCount`(`ExpEntry` 加回 `wCount` 字段);② 注入 `rgLevelUpExp` 阈值表;③ `PAL_BattleWon` 补 Step B 的比例分配 + 隐藏升级 + 升级弹窗;④ 战斗结束清零 `wCount`。

### 附:源出处速查

| 内容 | 文件:行 |
|---|---|
| `EXPERIENCE` / `ALLEXPERIENCE` 结构 | [global.h:475-493](../reference/sdlpal/global.h#L475-L493) |
| 隐藏等级初始 = 角色等级 | [global.c:463](../reference/sdlpal/global.c#L463) |
| 普攻累计(武术+体力) | [fight.c:3756-3757](../reference/sdlpal/fight.c#L3756-L3757) |
| 施法累计(真气+灵力) | [fight.c:4328-4329](../reference/sdlpal/fight.c#L4328-L4329) |
| 防御累计 | [fight.c:4116](../reference/sdlpal/fight.c#L4116) |
| 逃跑失败累计(吉运) | [fight.c:4170](../reference/sdlpal/fight.c#L4170) |
| 胜利结算入口 `PAL_BattleWon` | [battle.c:991](../reference/sdlpal/battle.c#L991) |
| 主经验 + 主等级升级 | [battle.c:1098-1120](../reference/sdlpal/battle.c#L1098-L1120) |
| 隐藏池求和 `iTotalCount` | [battle.c:1226-1234](../reference/sdlpal/battle.c#L1226-L1234) |
| `CHECK_HIDDEN_EXP` 分配宏 | [battle.c:1238-1284](../reference/sdlpal/battle.c#L1238-L1284) |
| `wCount` 战后清零 | [battle.c:1579-1585](../reference/sdlpal/battle.c#L1579-L1585) |

---

## 伤害计算:攻击力 vs 防御值

### 核心:`PAL_CalcBaseDamage(攻, 防)` 三段公式

源:[fight.c:131-171](../reference/sdlpal/fight.c#L131-L171)。一切物理 / 法术伤害的底座(sdlpal 注释:Formula courtesy of palxex and shenyanduxing):

```c
if (攻 > 防)            sDamage = (SHORT)(攻*2 - 防*1.6 + 0.5);   // 高伤段
else if (攻 > 防*0.6)   sDamage = (SHORT)(攻 - 防*0.6 + 0.5);     // 残伤段
else                    sDamage = 0;                              // 完全被挡
```

- 攻 > 防 → 主力段:攻每 +1 约 +2 伤,防每 +1 约 -1.6 伤。
- 防×0.6 < 攻 ≤ 防 → 残伤段:只剩很小伤害。
- 攻 ≤ 防×0.6 → **基础伤 0**(后续 floor 兜底到 1)。

→ **防御值的意义 = 把攻击推向残伤段甚至归零**;攻防接近时伤害断崖式下跌。

### 攻击力 / 防御值由什么构成

- 玩家攻击力 `PAL_GetPlayerAttackStrength` = 角色 `rgwAttackStrength` + 全部装备加成([global.c:1736-1764](../reference/sdlpal/global.c#L1736-L1764));防御 / 灵力 / 身法 / 吉运同理(各 `PAL_GetPlayerXxx` = base + 装备)。
- **玩家攻击力不含等级项**:玩家打敌人 `str = PAL_GetPlayerAttackStrength(role)` 就这一项([fight.c:3630](../reference/sdlpal/fight.c#L3630))。等级影响已烤进基础属性成长(升级 + 隐藏经验),战斗公式里不再加。
- **敌人相反,有效攻 / 防都带等级项**:
  - 敌人打玩家:`str = 敌人攻击力 + (敌人等级+6)×6`([fight.c:4917-4918](../reference/sdlpal/fight.c#L4917-L4918))
  - 玩家打敌人:`def = 敌人防御 + (敌人等级+6)×4`([fight.c:3631-3632](../reference/sdlpal/fight.c#L3631-L3632))

### 物抗:为什么"敌人有物抗、我方没有"(你的观察正确)

- **敌人**有物理抗性 `wPhysicalResistance`([global.h:287](../reference/sdlpal/global.h#L287),仅敌人结构有)。玩家打敌人时 `PAL_CalcPhysicalAttackDamage` 内 `base /= res`(res≠0 时,[fight.c:279-285](../reference/sdlpal/fight.c#L279-L285))——敌人物抗是个**除数**,res=2 即受到的物理伤害减半。
- **玩家没有任何物理抗性属性**(grep 全 `global.c/.h` 无 player physical resistance)。敌人打玩家时 res **硬编码常量 2**([fight.c:5056](../reference/sdlpal/fight.c#L5056))——所有敌人物理一律 `base/2`,这是公式固定项,不是玩家可成长的抗性。
- 玩家**有**的是元素抗(`PAL_GetPlayerElementalResistance`)+ 毒抗(`PAL_GetPlayerPoisonResistance`),只作用于法术,不挡物理。

### 物理:玩家普攻打敌人(单体)

完整链 [fight.c:3623-3674](../reference/sdlpal/fight.c#L3623-L3674):

1. `str = PAL_GetPlayerAttackStrength(role)`(攻击力 + 装备)
2. `def = 敌人防御 + (敌人等级+6)×4`;`res = 敌人 wPhysicalResistance`
3. `sDamage = CalcBaseDamage(str, def) / res`
4. `sDamage += RandomLong(1, 2)`
5. 暴击 / 会心(下节):暴击 ×3、李逍遥额外 ×2
6. `sDamage = (SHORT)(sDamage × RandomFloat(1, 1.125))`(浮动 +0%~12.5%)
7. 下限 1
8. `kStatusDualAttack`(双重攻击)→ 整套跑 2 次

### 物理:敌人打玩家

完整链 [fight.c:4910-5076](../reference/sdlpal/fight.c#L4910-L5076):

1. `str = 敌人攻击力 + (敌人等级+6)×6`(< 0 归 0)
2. `def = PAL_GetPlayerDefense(role)`;若玩家**主动防御** → `def ×= 2`
3. **自动防御 / 援护判定**(下节)——若触发,本次 0 伤,跳过下面
4. `sDamage = CalcBaseDamage(str + RandomLong(0,2), def) / 2`(res 固定 2)
5. `sDamage += RandomLong(0, 1)`
6. **护体** `kStatusProtect` → `sDamage /= 2`([fight.c:5059-5062](../reference/sdlpal/fight.c#L5059-L5062))
7. clamp 到玩家当前 HP;下限 1
8. 伤害**永远落在被攻击者本人**([fight.c:5075](../reference/sdlpal/fight.c#L5075))——援护者绝不替挨打

### 法术(仙术)伤害:灵力 vs 防御

源 `PAL_CalcMagicDamage` [fight.c:174-249](../reference/sdlpal/fight.c#L174-L249)。施法方"灵力"= `PAL_GetPlayerMagicStrength`(`rgwMagicStrength` + 装备):

```c
灵力 ×= RandomFloat(10, 11); 灵力 /= 10;       // 灵力随机浮动 ×1.0~1.1
sDamage  = PAL_CalcBaseDamage(灵力, 防) / 4;    // ← 灵力 vs 防御 走同一三段公式,再 /4
sDamage += 法术.wBaseDamage;                     // 仙术固定威力(每个仙术自带)
if (法术.wElemental != 0) {                      // 带属性的仙术
   毒(elem>5):  sDamage ×= (10 - 目标毒抗 / 倍率);
   elem 1..5:    sDamage ×= (10 - 目标元素抗 / 倍率);
   sDamage /= 5;
   if (elem 1..5) sDamage = sDamage × (10 + 战场该元素加成) / 10;   // 战场环境
}
```

要点(灵力 / 防御 对仙术的影响):

- **灵力**:先随机浮动 ×1.0~1.1,再以 `CalcBaseDamage(灵力, 防)/4` 贡献伤害。注意 **/4**,灵力-vs-防御 这部分权重不大。
- **防御**:目标防御只作用在 `CalcBaseDamage(灵力, 防)` 这一段,且整段 /4 → 防御对仙术的减伤**远弱于**对物理。而且 **`法术.wBaseDamage`(仙术固定威力)完全不吃目标防御** —— 高级仙术主伤害来自固定威力 × 元素系数,所以"防御再高也扛不住强力仙术"。
- **元素抗 / 毒抗**:只对带属性仙术起作用,按 `(10 - 抗性/倍率)/5` 缩放;玩家被仙术击中用 `PAL_GetPlayerElementalResistance/PoisonResistance`(均 100 基准)。
- **战场环境**:`lprgBattleField[...].rgsMagicEffect[elem]` 给某元素 ±加成(`×(10+加成)/10`)——不同战斗场地对某系仙术有增减。
- 玩家被仙术击中减伤:`sDamage /= ((主动防御?2:1) × (护体?2:1)) + (法术自动防御?1:0)`([fight.c:4801-4803](../reference/sdlpal/fight.c#L4801-L4803))。

### ts 实现状态

- 公式核心 [formulas.ts](../packages/game/src/core/battle/formulas.ts):`calcBaseDamage` / `calcPhysicalAttackDamage` / `calcMagicDamage` 均 **1:1 ported**(PAL_CLASSIC);法术伤害编排 [magic-damage.ts](../packages/game/src/core/battle/magic-damage.ts) 已接。
- 物理攻击编排 [attack.ts](../packages/game/src/core/battle/actions/attack.ts) 是 **M3 简版**:
  - ⚠️ **玩家攻击力误加了 `(等级+6)×6`**([attack.ts:60](../packages/game/src/core/battle/actions/attack.ts#L60))——sdlpal 玩家攻击**不含**此等级项(那是敌人公式)。真值 bug,待修。
  - 未实现:`+RandomLong(1,2)` jitter、`RandomFloat(1,1.125)` 浮动、暴击 ×3、李逍遥 ×2、双重攻击、群体普攻递减。
  - 敌人打玩家:`def×2`(主动防御)✓、res=2 ✓;但**自动防御 / 援护 / 护体 /2 均未实现**。

---

## 暴击 与 李逍遥会心一击

你的判断对:这是**两套独立机制**,各自掷骰、可叠加。均见玩家单体普攻 [fight.c:3639-3656](../reference/sdlpal/fight.c#L3639-L3656)。

| | 暴击(Critical) | 会心一击(李逍遥专属 Bonus Hit) |
|---|---|---|
| 触发 | `RandomLong(0,5)==0`(1/6)**或** `kStatusBravery`(狂怒)> 0 | `wPlayerRole == 0`(**仅李逍遥**)**且** `RandomLong(0,11)==0`(1/12) |
| 倍率 | 伤害 **×3** | 伤害 **×2** |
| 源行 | [fight.c:3639-3647](../reference/sdlpal/fight.c#L3639-L3647) | [fight.c:3649-3656](../reference/sdlpal/fight.c#L3649-L3656) |

- 两者独立判定、**可叠加**:李逍遥同时触发 → ×3 再 ×2 = **×6**;两者都置 `fCritical=TRUE`(都播暴击动画 / 音效)。
- **狂怒状态**(`kStatusBravery`,"more power for physical attacks" [global.h:51](../reference/sdlpal/global.h#L51))= 物理攻击**必定暴击**(直接满足暴击条件,×3)。
- 群体普攻的暴击是**整轮一次性**判定(`RandomLong(0,5)==0` 或狂怒),命中则全体 ×3;**群体普攻没有李逍遥会心 ×2**([fight.c:3687-3717](../reference/sdlpal/fight.c#L3687-L3717))。

ts 实现状态:**未实现**(attack.ts 无 crit / bravery / 李逍遥分支)。

---

## 防御机制:主动防御 / 自动防御 / 援护 / 护体

四个常被混为一谈的减伤 / 免伤机制,实际完全不同。

### 主动防御 vs 自动防御

| | 主动防御(`fDefending`) | 自动防御(`fAutoDefend`) |
|---|---|---|
| 来源 | 玩家选「防御」指令([fight.c:4115](../reference/sdlpal/fight.c#L4115)) | 系统每次被敌人物理攻击时随机判([fight.c:4938](../reference/sdlpal/fight.c#L4938)) |
| 概率 | 玩家主动,100% 进入 | `RandomLong(0,16) >= 10` = **7/17 ≈ 41%**(掷 0~16 命中 10~16 共 7 个值) |
| 持续 | 整个回合(到下次轮到自己,回合末清 FALSE) | 仅当次这一下 |
| 物理效果 | **防御 ×2**([fight.c:4926-4929](../reference/sdlpal/fight.c#L4926-L4929))→ 走 CalcBaseDamage 非线性减伤 | 触发即**该次 0 伤**(完全格挡,跳过整个伤害块) |
| 法术效果 | 法术伤害 **/2**(除数含 `fDefending?2:1`) | 另有"法术自动防御"`RandomLong(0,2)==0`(1/3),给除数 +1([fight.c:4746-4757](../reference/sdlpal/fight.c#L4746-L4757)) |
| 隐藏经验 | 累计防御隐藏经验 +2([fight.c:4116](../reference/sdlpal/fight.c#L4116)) | 无 |
| 姿势 | 保持防御 frame=3([fight.c:977-979](../reference/sdlpal/fight.c#L977-L979)) | — |

一句话:**主动防御 = 玩家选的、整回合、减半伤;自动防御 = 系统随机、单次、完全免伤。**

**自动防御被状态压制**:被攻击者处于**混乱 / 睡眠 / 麻痹**且无人援护 → `fAutoDefend` 强制 FALSE([fight.c:4975-4985](../reference/sdlpal/fight.c#L4975-L4985))——失去行动力的角色不能自己格挡,只能靠援护。

### 援护(Cover)

源 [fight.c:4943-4969, 5012-5098](../reference/sdlpal/fight.c#L4943-L4969)。

- **触发条件(全满足)**:① 被攻击者**虚弱**(濒死 `PAL_IsPlayerDying` / 混乱 / 睡眠 / 麻痹);② 当次 `fAutoDefend` 判定成功(~41%);③ 该角色有指定援护者且援护者在队、自己不虚弱。
- **谁援护谁是数据写死的**:每角色 `rgwCoveredBy` 字段记录"谁来护我"([global.h:323](../reference/sdlpal/global.h#L323) "who will cover me when I am low of HP or not sane")。按原版剧情:**李逍遥可援护其他角色,但只有林月如能援护李逍遥**——即 `rgwCoveredBy[李逍遥] = 林月如`,其余角色援护者多为李逍遥。这是逐角色数据,非硬编码。
- **效果**:触发即该次攻击**完全免伤**(援护本质成立于 `fAutoDefend=TRUE`)。援护者跳到身前播挡身动画([fight.c:5090-5098](../reference/sdlpal/fight.c#L5090-L5098)),**但伤害并不转移给援护者**——`rgwHP` 减的永远是被攻击者本人,只是因 fAutoDefend 而没真正落伤。
- **援护的真正作用**:虚弱(混乱 / 睡眠 / 麻痹)角色本被强制 `fAutoDefend=FALSE`(必吃伤害),有援护者时此强制不生效 → 把"自动免伤"的机会**还给**失去行动力的队友。

### 护体(`kStatusProtect`,金刚咒)

- 一个**多回合状态**(`rgPlayerStatus[role][kStatusProtect] = 回合数`,[global.h:52](../reference/sdlpal/global.h#L52) "more defense value")。金刚咒等仙术施加它。
- **效果:受到的物理与法术伤害都减半。**
  - 物理:`sDamage /= 2`([fight.c:5059-5062](../reference/sdlpal/fight.c#L5059-L5062))
  - 法术:除数含 `(护体?2:1)`([fight.c:4802, 4837](../reference/sdlpal/fight.c#L4802))
- 属 "good status":再次施加取**较长持续回合**(不刷成更短),仅活人可得([global.c:2257-2269](../reference/sdlpal/global.c#L2257-L2269))。
- **与主动防御叠加**:护体(最终伤害 /2)与主动防御(防御 ×2)对物理**同时生效**;法术则除数 `(主动防御?2:1)×(护体?2:1)` 连乘。

ts 实现状态:`fDefending` 的 def×2 已在 [attack.ts:74-76](../packages/game/src/core/battle/actions/attack.ts#L74-L76) 实现;**自动防御 / 援护 / 护体 / 法术自动防御均未实现**。

---

## 群体普攻伤害递减

你的观察对:玩家选普攻但**不指定单一目标**(攻击全体)时,伤害逐个递减。源 [fight.c:3676-3748](../reference/sdlpal/fight.c#L3676-L3748)。

- 固定**空间命中顺序** `index[] = {2, 1, 0, 4, 3}`(中 → 左中 → 左 → 右 → 右中)。
- `division` 初值 1;**每打中一个敌人 `division ×= 2`**;每个敌人伤害 `sDamage /= division`。

| 命中序 | 除数 | 实际伤害 |
|---|---|---|
| 第 1 个 | ÷1 | 100% |
| 第 2 个 | ÷2 | 50% |
| 第 3 个 | ÷4 | 25% |
| 第 4 个 | ÷8 | 12.5% |
| 第 5 个 | ÷16 | 6.25% |

- 与单体普攻的差异:群体路径**没有** `+RandomLong(1,2)`、**没有**李逍遥会心 ×2、**没有** `RandomFloat` 浮动;暴击整轮一次性判定(命中则全体 ×3,在 /division **之前**应用)。每个目标下限 1。

ts 实现状态:**未实现**(attack.ts 仅单体 targetIdx)。

---

## 战后 HP / MP 恢复

源 `PAL_BattleWon` 尾部 [battle.c:1342-1372](../reference/sdlpal/battle.c#L1342-L1372)。**只在战斗胜利后**对每个队员执行(逃跑成功 / 战败不恢复)。

```c
#if 1//def PAL_CLASSIC      // ← #if 1 恒真,永远走 classic 分支(下面 #else 是死代码)
   HP += (maxHP - HP) / 2;  // 恢复"当前缺失 HP 的一半"
   MP += (maxMP - MP) / 2;  // 恢复"当前缺失 MP 的一半"
#else
   ... 基于 f = (rgLevelUpExp[level]/5)/iExpGained, clamp f>=2; HP += missing/f; MP += missing/f/1.2
#endif
```

- **公式 = 回满缺口的一半**(整数除法)。例 maxHP=100、当前 30 → 缺 70 → +35 → 战后 65;再打一场 → 缺 35 → +17 → 82,趋近但不靠这个回满。
- `#if 1//def PAL_CLASSIC`:`#if 1` 恒真(`//def PAL_CLASSIC` 只是注释),所以**两种 build 都走"回缺口一半"**;非 classic 的经验比例公式是被屏蔽的死代码。
- 升级另有补满:升级会把 HP/MP 直接补满([battle.c:1115-1116, 1289-1292](../reference/sdlpal/battle.c#L1115-L1116))。

ts 实现状态:**未实现**。[battle-system.ts](../packages/game/src/core/battle/battle-system.ts#L880-L905) 的 `PAL_BattleWon` 目前只加主经验,无战后恢复。

---

## 五灵 / 毒 抗性与五行机制

仙术分**无属性**和**带属性**两类。带属性的走"五灵"(5 系元素)或"毒",受目标对应抗性影响。回顾法术公式 [fight.c:223-247](../reference/sdlpal/fight.c#L223-L247) 的元素段:

```c
if (法术.wElemental != 0) {
   毒(elem > 5):  sDamage ×= (10 - 目标毒抗 / 倍率);
   elem 1..5:      sDamage ×= (10 - 目标元素抗[elem-1] / 倍率);
   sDamage /= 5;
   if (elem 1..5)  sDamage = sDamage × (10 + 战场该元素加成) / 10;
}
```

### 五灵 5 系 + 毒

- `NUM_MAGIC_ELEMENTAL = 5`。仙术的 `wElemental` 字段:**0 = 无属性**(不吃任何元素抗,只走 `基础/4 + 固定威力`);**1–5 = 五灵**;**> 5 = 毒**。
- 五灵的数据槽顺序(项目 / sdlpal 约定,见 [formulas.ts:131-152](../packages/game/src/core/battle/formulas.ts#L131-L152)):`index 1=风 / 2=雷 / 3=水 / 4=火 / 5=土`。具体中文显示标签在 `WORD.DAT`,此处只列数据顺序,不当作权威译名。
- 抗性数据:敌人 `wElemResistance[5]` + `wPoisonResistance`([global.h:286-287](../reference/sdlpal/global.h#L286-L287));玩家 `rgwElementalResistance[5][role]` + `rgwPoisonResistance`([global.h:319](../reference/sdlpal/global.h#L319)),均 base + 装备。

### 关键:玩家与敌人抗性是两套不同刻度

抗性缩放公式 `factor = 10 - 抗性 / 倍率`,而**倍率(`wResistanceMultiplier`)在两条路径不同**:

| 路径 | 倍率 | 传入抗性 | 等效 factor | 刻度 |
|---|---|---|---|---|
| 玩家施法打敌人 | **1**([fight.c:4016](../reference/sdlpal/fight.c#L4016)) | 敌人 `wElemResistance`(原值) | `10 - 敌抗` | **敌人抗性 0–10 制**:5=半伤、10=免疫、>10=吸收(被下限 1 兜底) |
| 敌人施法打玩家 | **20**([fight.c:4799](../reference/sdlpal/fight.c#L4799)) | `100 + 玩家抗性` | `5 - 玩家抗/20` | **玩家抗性 0–100 制**:每点 ≈ -1% 元素伤,100=免疫 |

- 玩家元素抗 / 毒抗都**上限 100**([global.c:1928-1931, 1969-1972](../reference/sdlpal/global.c#L1928-L1931)),即玩家最多把某系仙术的元素部分削到 0。
- 抗性只缩放**元素部分**;`法术.wBaseDamage`(固定威力)在元素乘法**之前**已加入,会一起被 `×factor/5` 缩放,但不吃目标普通防御。
- 毒系仙术(elem > 5)走同一公式,用毒抗替元素抗。另外毒抗还 gate 敌人"附带毒"效果:`PAL_GetPlayerPoisonResistance < RandomLong(1,100)` 才中毒([fight.c:5141](../reference/sdlpal/fight.c#L5141))。**中毒后的持续伤害 / 毒等级 / 七大毒 / 解毒,以及"下毒命中看巫抗不看毒抗"的区分,见 [毒系统](#毒系统等级--每回合伤害--七大毒--相生相克)。**

ts 实现状态:`calcMagicDamage` 的元素 / 毒缩放 + 战场加成已在 [formulas.ts:124-156](../packages/game/src/core/battle/formulas.ts#L124-L156) **1:1 ported**(倍率由调用方传)。玩家被敌人仙术击中的 `100+抗性 / mult=20` 路径取决于敌→玩家施法编排是否接入(当前战斗主走玩家→敌人)。

---

## 战斗场景对五灵仙术的影响

你的判断对:同一仙术在不同战斗场地伤害不同。源 [fight.c:242-246](../reference/sdlpal/fight.c#L242-L246) + `BATTLEFIELD` 结构 [global.h:377-381](../reference/sdlpal/global.h#L377-L381)。

```c
typedef struct tagBATTLEFIELD {
   WORD   wScreenWave;                        // 画面波动等级(视觉)
   SHORT  rgsMagicEffect[NUM_MAGIC_ELEMENTAL]; // 5 系仙术在本场地的增减(可负)
} BATTLEFIELD;
```

- 每个战斗场地有一组 `rgsMagicEffect[5]`,对**五灵各系**给一个 ±修正(SHORT,可正可负)。
- 只对**带元素属性的仙术(elem 1–5)**生效,在元素抗缩放之后再乘:`sDamage = sDamage × (10 + rgsMagicEffect[elem-1]) / 10`。
  - 加成 0 → ×1(中性);+10 → ×2(翻倍);-10 → ×0(归零,下限 1 兜底)。
  - 例:水边场地可能给水系 +、火系 −,即"水克火、场地助水"。**无属性仙术和毒不受场地影响**。
- 当前场地号 `wNumBattleField`([global.h:536](../reference/sdlpal/global.h#L536)):随场景设定,也可被脚本 opcode 改写(`wNumBattleField = operand[0]`,[script.c:1723](../reference/sdlpal/script.c#L1723)),并存入存档([global.c:609](../reference/sdlpal/global.c#L609))。同一 `wNumBattleField` 还决定画面波动 `wScreenWave`([battle.c:1563](../reference/sdlpal/battle.c#L1563))。

ts 实现状态:`calcMagicDamage` 已接受 `fieldEffect` 5 系参数并 1:1 应用 `×(10+effect)/10`([formulas.ts:145-155](../packages/game/src/core/battle/formulas.ts#L145-L155));`wNumBattleField` → `rgsMagicEffect` 的数据装填取决于战场数据提取是否接入。

---

## 合击仙术

全队合力放一个大招;威力随**参战成员的攻击力 + 灵力总和**成长。源 `kBattleActionCoopMagic` [fight.c:3856-4045](../reference/sdlpal/fight.c#L3856-L4045)。

### 触发条件(PAL_CLASSIC)

可用判定 `PAL_BattleUIIsActionValid(kBattleUIActionCoopMagic)` [uibattle.c:308-337](../reference/sdlpal/uibattle.c#L308-L337):

- 队伍 **≥ 2 人**(`wMaxPartyMemberIndex == 0` → 不可);
- 发起者本人 **healthy**,且全队 **healthy 成员 > 1**(至少 2 名)。
- `PAL_IsPlayerHealthy` [fight.c:52-74](../reference/sdlpal/fight.c#L52-L74) = 非濒死 **且** 无 睡眠 / 混乱 / 沉默 / 麻痹 / 傀儡 状态。
- 执行时再核一次:逐人 `coopContributors[i] = PAL_IsPlayerHealthy`,若健康者 ≤ 1 → **自动降级为普攻**([fight.c:3364-3378](../reference/sdlpal/fight.c#L3364-L3378))。

### 威力公式

[fight.c:3982-3995](../reference/sdlpal/fight.c#L3982-L3995):

```c
str = 0;
for (每个 coopContributor)            // 仅 healthy 成员计入
   str += 攻击力(role) + 灵力(role);   // PAL_GetPlayerAttackStrength + PAL_GetPlayerMagicStrength
str /= 4;
// 然后 str 作为 magStr 喂法术公式:
sDamage = PAL_CalcMagicDamage(str, 敌防, 敌元素抗, 敌毒抗, mult=1, 合击仙术);
```

- 即**合击威力 = (全部健康参战成员的 攻击力 + 灵力 之和) ÷ 4**,再走标准法术伤害公式(含元素 / 毒抗 / 战场加成)。健康成员越多、攻 / 灵越高 → 合击越强。
- 放哪个合击仙术:由发起者的 `PAL_GetPlayerCooperativeMagic(role)` 决定 = 角色 `rgwCooperativeMagic[role]`,装备可覆盖([global.c:2013-2045](../reference/sdlpal/global.c#L2013-L2045))。
- 可单体或 `kMagicFlagApplyToAll` 全体。

### 回合代价

合击回合 `fThisTurnCoop = TRUE`([fight.c:3858](../reference/sdlpal/fight.c#L3858))→ 该回合所有参与成员的**普攻 / 防御 / 逃跑 / 单独施法全部被跳过**(各 action case 开头 `if(g_Battle.fThisTurnCoop) break;`,见 [fight.c:3620, 4112, 4121, 4176, 4334](../reference/sdlpal/fight.c#L3620))。整队这一回合只做这一次合击。

ts 实现状态:**已实现**。`performCoopMagic` 会筛选 healthy 参与者、扣除 HP 代价、计算伤害并生成聚拢 / 施法 / 法术特效 / 归位动画;回合队列也会跳过同轮其他参与者动作。若执行前只剩一名 healthy 队员,会按原版退化成普通攻击并保留普攻动画。

---

## 身法与出手顺序

**出手顺序 = 按"有效身法"降序排队,每回合重排**;身法越高越先动。源 `PAL_BattleStartFrame` 的 PAL_CLASSIC 分支 [fight.c:1495-1585](../reference/sdlpal/fight.c#L1495-L1585)。

有效身法分三层算:

### 1. 基础身法

- 玩家 `PAL_GetPlayerActualDexterity` [fight.c:336-389](../reference/sdlpal/fight.c#L336-L389):身法属性 + 装备(`PAL_GetPlayerDexterity`)→ 若 **加速(haste)×3** → **上限 999**。
- 敌人 `PAL_GetEnemyDexterity` [fight.c:289-332](../reference/sdlpal/fight.c#L289-L332):`(敌等级+6)×3 + (SHORT)敌身法`。

### 2. 动作身法修正(玩家本回合所选动作)

源 [fight.c:1529-1556](../reference/sdlpal/fight.c#L1529-L1556) —— **你这回合选什么动作,会放大或缩小本回合的有效身法**:

| 所选动作 | 身法系数 |
|---|---|
| 合击仙术 | **×10** |
| 防御 | **×5** |
| 使用物品 | **×3** |
| 施法(辅助类:`wFlags` 无 `kMagicFlagUsableToEnemy`) | **×3** |
| 施法(攻击类:可对敌) | ×1(无加速) |
| 普通攻击 | ×1 |
| 逃跑 | **÷2** |

### 3. 收尾修正

- **濒死**(`PAL_IsPlayerDying`)→ 再 **÷2**([fight.c:1558-1561](../reference/sdlpal/fight.c#L1558-L1561))。
- 最后 × `RandomFloat(0.9, 1.1)` 随机抖动([fight.c:1563](../reference/sdlpal/fight.c#L1563);敌人也各摇一次 [fight.c:1474](../reference/sdlpal/fight.c#L1474))。
- 死亡 / 睡眠 / 麻痹的玩家 → 身法 = 0(排最后,若回合内被救活则自动普攻)([fight.c:1505-1516](../reference/sdlpal/fight.c#L1505-L1516));混乱 → 强制普攻([fight.c:1522-1527](../reference/sdlpal/fight.c#L1522-L1527))。

要点(身法如何影响出手):

- 排序按"基础身法 × 动作系数 × (濒死?÷2) × 随机0.9~1.1"降序([fight.c:1571-1585](../reference/sdlpal/fight.c#L1571-L1585) 选择排序)。
- **动作选择能逆转先手**:慢角色选防御(×5)或合击(×10)也能抢到先手;逃跑(÷2)必拖后。攻击仙术不加速,辅助 / 治疗仙术(不可对敌的)反而 ×3 先放。
- 随机 0.9~1.1 给同身法单位加抖动,顺序不完全固定。敌人 dualMove(双动)在队列出现两次(第二条 `fIsSecond`,排后)。

ts 实现状态:`getPlayerActualDexterity`(haste×3 + 999 上限)+ `getEnemyDexterity` 已 1:1 ported([formulas.ts:179-216](../packages/game/src/core/battle/formulas.ts#L179-L216));`buildActionQueue` 降序 + dualMove 双入列已实现([turn-queue.ts:51-79](../packages/game/src/core/battle/turn-queue.ts#L51-L79))。但 **动作身法系数(×10/×5/×3/÷2)、濒死 ÷2、`RandomFloat` 抖动当前未见应用** —— turn-queue 按调用方传入的 dex 排序,这层修正尚需补(否则所有动作同速,失去"选防御抢先手"的策略)。

---

## 吉运(只影响逃跑成功率)

你的判断对:吉运(`rgwFleeRate`,字段注释直译 "chance of successful fleeing" [global.h:317](../reference/sdlpal/global.h#L317))**唯一的战斗作用就是逃跑成功率**——不碰伤害 / 暴击 / 命中 / 防御 / 出手顺序。穷尽 grep `rgwFleeRate` / `PAL_GetPlayerFleeRate` 全部用点,只有:① 逃跑判定([fight.c:4124](../reference/sdlpal/fight.c#L4124));② 升级界面显示([battle.c:1209](../reference/sdlpal/battle.c#L1209));③ 隐藏经验成长([battle.c:1282](../reference/sdlpal/battle.c#L1282));④ getter([global.c:1868-1893](../reference/sdlpal/global.c#L1868-L1893));⑤ 道具 / 状态加成([global.c:2390](../reference/sdlpal/global.c#L2390))。**没有任何其它机制读它。**

> 名字叫"吉运 / 运"带运气色彩,但机制上**不影响掉落 / 暴击 / 命中** —— 只是逃跑率。

### 逃跑成功公式

源 [fight.c:4119-4148](../reference/sdlpal/fight.c#L4119-L4148):

```c
str = PAL_GetPlayerFleeRate(role);          // 吉运 + 装备
def = 0;
for (每个存活敌人) def += (SHORT)敌身法 + (敌等级+6)*4;
if (def < 0) def = 0;
逃跑成功 = (str >= RandomLong(0, def)) && !Boss战(fIsBoss);
```

- **吉运越高、敌人身法 / 等级越低 → 越容易逃。**
- **Boss 战(`fIsBoss`)永远逃不掉**,吉运再高也没用。
- 合击回合(`fThisTurnCoop`)逃跑被跳过。
- **逃跑失败 → 吉运隐藏经验 +2**([fight.c:4170](../reference/sdlpal/fight.c#L4170))——呼应 [隐藏属性经验](#隐藏属性经验--等级系统):逃不掉反而练高吉运,下次更易逃。

### ⚠️ 原始 bug:逃跑抵抗错用敌人身法,而非敌人吉运

逃跑公式里敌方那一项 `def += (SHORT)敌.wDexterity` 用的是敌人**身法**,但这几乎可以确定**本该是敌人吉运**。source 层证据:

- 敌人 `ENEMY` 结构**有独立的吉运字段** `wFleeRate`(注释 "chance for successful fleeing"),就紧挨在身法 `wDexterity` 后面([global.h:283-284](../reference/sdlpal/global.h#L283-L284))——和玩家 `rgwFleeRate` 一一对应。
- 但 **`e.wFleeRate` 在整个引擎 `.c` 里从未被读过**(穷尽 grep `.wFleeRate` 零命中):敌人吉运从数据加载、存进内存,却**没有任何代码消费它**,是死字段。
- 而逃跑抵抗公式 [fight.c:4134](../reference/sdlpal/fight.c#L4134) 取的是 `e.wDexterity`(身法)。身法本身另有正经用途(出手顺序 + 被各种敌人特例改写,[battle.c:1624-1666](../reference/sdlpal/battle.c#L1624-L1666))。

→ 合理推断:玩家逃跑判定本应是"**我方吉运 vs 敌方吉运**",却误写成对敌方**身法**求和,导致敌人吉运字段彻底闲置。**后果**:逃跑难度由敌人身法(而非设计者填的吉运值)决定——高身法敌人异常难逃,而数据里精心设的敌人吉运形同虚设。

> 注:sdlpal 以忠实原版为目标,此行为很可能**原样复刻自 1995 DOS 原版**(即 bug 出在原作而非 sdlpal)。仅凭 sdlpal source 无法 100% 区分两者,但"敌人 `wFleeRate` 死字段 + 公式用 `wDexterity`"的事实是确凿的。**type-pal 若要 1:1 忠实,应照搬此行为(用敌人身法),并在注释标明这是原版 bug**,不要"顺手修对"。

ts 实现状态(2026-06-13 更新):`actions/flee.ts` 已实现 —— 公式结构 1:1(含 `(SHORT)` cast / 死敌跳过 / boss 必失败恒消费 RNG)、失败累计吉运经验 +2、成功 16 步滑出动画。敌方抵抗项**采用修复版:用敌人吉运 `be.e.fleeRate`**(有意偏离原版,user 2026-06-13 拍板)——让数据里的敌人吉运死字段活过来,身法回归出手顺序正职;要还原原版 bug 行为,源码处换回 `be.e.dexterity` 一行即可(注释已标注)。

---

## 特殊技能成功率(秒杀 / 偷取 / 上状态)

像**夺魂、灵葫咒、回梦、鬼降、飞龙探云手**这类"特殊效果"仙术,效果(秒杀 / 偷东西 / 让敌人睡着昏迷)本身是写死的,真正决定"放出去到底成不成"的是技能脚本里的几道**关卡**。这些关卡只看 **技能自带的固定数值 + 敌人的法术抗性 + 有时还看敌人剩多少血**——

> **跟施法者的属性(吉运、灵力、等级)一点关系都没有。** 你练再高的吉运 / 灵力,也不会让夺魂更容易秒、飞龙探云手更容易偷。吉运只管逃跑(见上一节)。

### 三种"关卡"分别是什么

1. **固定概率关**:掷一个 1~100 的骰子,点数**小于技能设定值 N** 才过关,否则这次就失败。等于"约 (N-1)% 的成功率",N 是技能脚本里写死的,跟谁放、放给谁都无关。
2. **法术抗性关**(凡是"给敌人上状态"都有这道):掷一个 0~9 的骰子,点数**大于这个敌人的法术抗性**才上得中。所以**敌人法术抗性越高越难上**;抗性满(9)的敌人直接免疫,怎么放都上不了。这道关只看**敌人**的抗性,不看施法者。
3. **血量关**(只有灵葫咒有):敌人当前血量**高于满血的某个百分比就直接失败**。所以灵葫咒只能收掉**残血**的敌人,满血怪一点用没有。

> 注:这些技能脚本开头都有一道"现在是不是敌人在行动"的岔路——**玩家放(打敌人)**走一条分支,**敌人放(打我方)**走另一条。下面说的都是**玩家放出去打敌人**时的成功率。

### 逐个技能(玩家施放,数值为原版真值)

| 技能 | 效果 | 成功条件(全部满足才成) | 备注 |
|---|---|---|---|
| **飞龙探云手** | 偷敌人的钱 / 物 | 掷 0~10 ≤ **6** → 约 **64%**(7/11) | 偷到的量 = 敌身上的钱物 ÷ 掷(2 或 3),所以一次偷一部分 |
| **夺魂** | 直接秒杀敌人 | 过敌人**法术抗性** + 掷<**33**(约 **32%**) | 对任意血量都能秒,但要先过法抗这关 |
| **灵葫咒** | 秒杀 + 攒灵葫值 | 敌血 **≤ 满血 25%** + 掷<**60**(约 **59%**) | 只杀残血敌;杀掉还会**收集灵葫值**(给紫金葫芦炼丹用,见 L 段玩法) |
| **回梦** | 让敌人睡着 4 回合 | 掷<**60**(约 **59%**) + 过敌**法术抗性** | 睡着的敌人整回合不动 |
| **鬼降** | 让敌人陷入混乱 4 回合 | 掷<**44**(约 **43%**) + 过敌**法术抗性** | 混乱的敌人会乱打,可能打自己人 |

### 一句话总结

- **偷 / 秒 / 控** 的成功率 = 技能写死的固定概率 ×(上状态时再叠一道敌人法术抗性)×(灵葫咒还要敌人残血)。
- **施法者属性(吉运 / 灵力 / 等级)对这些成功率毫无影响。**
- 想更稳地控住 / 秒掉敌人,只能靠**挑法术抗性低的敌人**、或(灵葫咒)**先把敌人打残**。

### 源出处速查

- 偷取实际判定 `RandomLong(0,10) <= wStealRate`:[fight.c:5254](../reference/sdlpal/fight.c#L5254);触发 opcode `0x6A`:[script.c:2046](../reference/sdlpal/script.c#L2046)
- 固定概率关 `0x06`(掷 1~100 ≥ N 则失败跳走):[script.c:3575-3591](../reference/sdlpal/script.c#L3575-L3591)
- 法术抗性关 `0x2E`(掷 0~9 > 敌法抗才上状态,CLASSIC):[script.c:1377-1397](../reference/sdlpal/script.c#L1377-L1397)
- 血量关 `0x64`(敌血 > 满血 N% 则跳走):[script.c:1983-1995](../reference/sdlpal/script.c#L1983-L1995)
- 秒杀 `0x60` 敌 / `0x5F` 玩家(本身无条件,靠前面的关卡门着):[script.c:1942-1955](../reference/sdlpal/script.c#L1942-L1955)
- 收灵葫值 `0x33`:[script.c:1437-1450](../reference/sdlpal/script.c#L1437-L1450) / 技能脚本数据出处:`data/extracted/data/object-magics.json` 各技能 `scriptOnSuccess`(夺魂 obj304 / 灵葫咒 obj384 / 回梦 obj303 / 鬼降 obj305 / 飞龙探云手 obj377)

ts 实现状态:特殊技能的 `scriptOnSuccess` 走战斗脚本解释器(0x06/0x2E/0x60/0x6A 等 opcode);偷取 `0x6A` + 居中提示已做(见 [feature-status D22](feature-status.md)),秒杀 / 上状态 / 法抗关在战斗 opcode dispatch 内逐条对源实现。

---

## 抗性体系总览 与 巫术命中判定

> 承接上节[特殊技能成功率](#特殊技能成功率秒杀--偷取--上状态)的"法术抗性关":这里把**八种抗性**摆在一起辨清,并给出**巫术(给敌人上异常状态)命中**的精确公式 + 一个让成功率永远封顶 90% 的原版 bug。状态本身**上了之后干什么**(眠=不动、疯魔=打友军…)见下节[异常状态效果](#异常状态效果眠--定身--疯魔--封技)。

### 八种抗性 = 两套完全不同的机制

玩家口中的"抗性"(风 / 雷 / 水 / 火 / 土 / 毒 / 物 / 巫)挂在**不同字段、走不同公式**;**只有最后一种"巫"是概率关卡,其余七种都缩放伤害数值**:

| 抗性 | 字段 | 机制 | 影响的是 |
|---|---|---|---|
| 风·雷·水·火·土(五灵 5 系) | `wElemResistance[5]` | 伤害**缩放** `×(10-抗)/mult` | 元素仙术**伤害** |
| 毒 | `wPoisonResistance` | 伤害**缩放**(毒系仙术) + gate 附带中毒 | 毒系伤害 + 抗"中毒" |
| 物 | `wPhysicalResistance` | 伤害**除法** `÷物抗` | 物理**伤害** |
| **巫** | **`wResistanceToSorcery`** | **命中关卡**(掷骰 vs 抗性) | 异常状态 / 下毒**能否生效** |

- 前七种(五灵 + 毒 + 物)详见[五灵 / 毒 抗性](#五灵--毒-抗性与五行机制)与[伤害计算](#伤害计算攻击力-vs-防御值)——削的是**伤害数字**。
- **"巫"是异类**:它不削伤害,而是 gate"这个异常到底上不上得去"。字段 `wResistanceToSorcery`(注释直译 "resistance to sorcery and poison, 0 min, 10 max",[global.h:203](../reference/sdlpal/global.h#L203)),存在 **OBJECT_ENEMY** 表(项目 `enemy-objects.json`),与五灵 / 物抗那套战斗数值(ENEMY 表)**不是同一张表**。
- 数据实感(项目 `enemy-objects.json` 统计):巫抗要么低、要么拉满——**0**=106 个(史莱姆等)、2=7、3=1、4=7(凤凰)、5=2(赤鬼王)、**10**=30 个(灯笼等)。**没有 6~9 档**,设计上"要么基本能控、要么直接免疫"。

### 什么走"巫抗"这道关

凡是**给敌人加异常 / 下毒**的效果都过巫抗,典型:

| 来源 | 效果(状态) | opcode |
|---|---|---|
| 回梦 | **眠** `kStatusSleep`(整回合不动) | `0x2E` |
| 鬼降 | **疯魔(混乱)** `kStatusConfused`(乱打,可能打友军) | `0x2E` |
| 夺魂 | **即死**(先过巫抗关,再秒杀) | `0x2E` 关 → `0x60` 秒杀 |
| (各类) | 定身 / 迟缓 等 | `0x2E` |
| 下毒类仙术 / 道具 | 给敌人挂毒 | `0x28` |
| **投掷道具**上异常 | 同上各状态 | 道具脚本里的 `0x2E` |

> **投掷也吃同一道关**:投掷物品跑该道具的 `wScriptOnThrow`([fight.c:4361](../reference/sdlpal/fight.c#L4361)),脚本里若是"给敌人上异常"就还是 `0x2E`——**投掷上异常与巫术仙术受完全相同的判定和 bug,上限同样 90%**。投掷若是"下毒"则走 `0x28`(下文,无此 bug)。

### 巫术命中判定:`0x2E` 公式 + "上限 90%" bug

给敌人上状态 `0x2E`([script.c:1377-1397](../reference/sdlpal/script.c#L1377-L1397),PAL_CLASSIC):

```c
i = 9;                                              // CLASSIC 固定 9
if (RandomLong(0, i) > 敌.wResistanceToSorcery)     // 掷 0~9  >  巫抗  → 上状态成功
   敌.rgwStatus[状态] = 回合数;
else
   wScriptEntry = operand[2] - 1;                   // 失败:跳技能脚本的失败分支
```

- **成功条件** `掷(0~9) > 巫抗`;**失败条件** `掷(0~9) <= 巫抗`(正是你说的"小于等于则失败")。
- **拦截率** = `P(掷 <= 巫抗)` = `(巫抗+1)/10` = **巫抗×10% + 10%**。多出来的 **+10%** 就是 bug 根源。
- 掷最大只到 9,故 **巫抗 ≥ 9 → `> 巫抗` 永不成立 = 完全免疫**(数据干脆填 10)。

**bug:本该用 `<` 失败(即 `>=` 成功),却写成 `<=` 失败(`>` 成功)**,导致**即使巫抗 0、掷出 0 也算失败 → 成功率永远封顶 90%**:

- 巫抗 0:掷 1~9 成功 = **90%**(本应 100%)。
- "敌巫抗 0 + 技能 100% 命中,最后却只有 90%"——就是这个 `>` 多吞掉的 10%。
- **铁证(同引擎对照)**:同一个 `wResistanceToSorcery` 字段,**下毒 `0x28` 用的是"对的"写法** `RandomLong(0,9) >= 巫抗`([script.c:1193](../reference/sdlpal/script.c#L1193) / [1228](../reference/sdlpal/script.c#L1228))——巫抗 0 时 `>= 0` 恒真,**100% 中毒,无 10% 损耗**。两个 opcode 拿同一字段判同一件事,一个 `>=` 一个 `>`,**坐实 `0x2E` 的 `>` 是笔误**而非设计。

> **⚠️ 归属更正(原版后期已修,sdlpal 未跟进)**:这个 `>` 不是"原版最终设计"——**原版后期版本已把判定改成 `>=`(失败 `<`)**,只有 **sdlpal(及 DOS / 早期版本)仍停在 `>`**。所以这是"跟谁"的选择:
> - 保留 `>` = 忠实 **sdlpal / DOS-早期**;改 `>=` = 跟进 **原版最新修复**——**改 `>=` 不算偏离原版,反而是向原版最新对齐**。
> - 修复后拦截率变干净的 `巫抗/10`、通过率 `(10−巫抗)/10`:巫抗 0 → **100% 命中**(技能 100% 时)、巫抗 10 → 0%(免疫),**首尾对齐、唯有满值 10 才免疫**。而现行 `>` 下**巫抗 9 就已等于免疫**(满刻度顶端冗余一格)。
> - 只改 `0x2E` 这一处;`0x28` 下毒本就是 `>=`,不动。

### 完整成功率公式

把"技能自带固定概率关"(`0x06`,掷 1~100 < N,纯由脚本写死)和巫抗关串起来:

```
巫术最终成功率 = 技能固定成功率 × (1 − 巫抗拦截率)
             = 技能固定成功率 × (9 − 巫抗) / 10      // 巫抗 0~9;≥9 直接 0
```

| 敌人(巫抗) | 巫抗关通过率 `(9-抗)/10` | 技能 100% 时的最终命中 |
|---|---|---|
| 史莱姆(0) | 90% | **90%**(bug 上限) |
| 五毒巨蝎(2) | 70% | 70% |
| 凤凰(4) | 50% | 50% |
| 赤鬼王(5) | 40% | 40% |
| 灯笼(10) | 0% | **0%**(免疫) |

> **施法者属性(吉运 / 灵力 / 等级)对此毫无影响**(呼应上节):决定能不能控住的只有"技能写死的固定概率 × 敌人巫抗"。想稳控只能挑**巫抗低**的敌人。

**两关谁先过?** 两道关都在技能的 `scriptOnSuccess` 脚本里(`scriptOnUse` 为空);**数学上谁先谁后不改变最终成功率**(都要过、乘法可交换),但脚本实测**执行顺序因技能而异**(`object-magics.json` + `events/all.json` 反汇编):

| 技能 | 成功脚本 opcode 序列 | 顺序 |
|---|---|---|
| 回梦(眠,状态 2) | `0x06`(率 60≈59%) → `0x2E`(巫抗) | **先固定率、后巫抗** |
| 鬼降(混乱,状态 0) | `0x06`(率 44≈43%) → `0x2E`(巫抗) | **先固定率、后巫抗** |
| 夺魂(即死) | `0x2E`(巫抗) → `0x06`(率 33≈32%) → `0x60`(秒杀) | **先巫抗、后固定率** |

- 两关**任一不过都跳到同一失败分支**(无"半成功"/部分效果)。
- 所以你猜的"先过巫抗、再算技能成功率"对**夺魂**成立,对**回梦 / 鬼降**则相反(先固定率)——但因为是乘法,**三者最终成功率公式完全一致**,顺序只决定失败时先消耗哪个 RNG、走哪条分支。

### 敌我不对称:巫抗只保护敌人

- **敌人对我方上异常,跳过巫抗这道关**:给玩家上状态走 `0x2D`([script.c:1367-1375](../reference/sdlpal/script.c#L1367-L1375)),直接 `PAL_SetPlayerStatus`,**没有任何抗性掷骰**;玩家根本**没有 `wResistanceToSorcery` 字段**(巫抗是 OBJECT_ENEMY 专属,与"敌人有物抗、我方没有"同款不对称)。
- 那玩家为何不会被敌人状态技能轻易秒控?**平衡不在玩家抗性,而在敌方那侧的概率被压低**:敌人状态技能的**固定概率关(`0x06`)阈值通常设得很低**,普攻附带异常还要再过概率 + 玩家毒抗两道关(见下)。即"敌方相关技能成功率本就低很多",以补偿玩家无巫抗兜底。
  - (这是脚本 / 数据层的设计倾向,各技能 `scriptOnSuccess` 的具体阈值未逐一枚举;**引擎层确凿的是 `0x2D` 无抗性关**。)

### 敌人普攻附带异常(黑狗血 → 封技)

部分敌人普攻命中后,有概率追加一个异常(最典型是**封技**:`kStatusSilence`,注释 "cannot use magic" [global.h:49](../reference/sdlpal/global.h#L49),中招后不能用仙术)。判定 [fight.c:5139-5146](../reference/sdlpal/fight.c#L5139-L5146):

```c
if (iCoverIndex == -1 && !fAutoDefend &&                          // 没被援护、玩家没自动防御
    敌.wAttackEquivItemRate >= RandomLong(1, 10) &&               // ① 附带概率关
    PAL_GetPlayerPoisonResistance(role) < RandomLong(1, 100))     // ② 玩家毒抗关
{
   跑 敌.wAttackEquivItem(item) 的 wScriptOnUse,目标 = 该玩家;    // 脚本里 0x2D 给玩家上异常
}
```

- **① 附带概率 = `wAttackEquivItemRate / 10`**(字段 [global.h:276-277](../reference/sdlpal/global.h#L276-L277))。数据实感(项目 `enemies.json`):**125 个敌人填 0(根本不附带)**;带附带的集中在 **3(30%)** 与 **5(50%)** ——所以"一般 30%"对应字段 = 3,是带附带敌人里最常见档之一(整体范围约 10%~80%)。
- **② 玩家毒抗是第二道关**:`玩家毒抗 < 掷(1~100)` 才追加 → 该关通过率 `(100−毒抗)/100 = 1−毒抗`。**这道关对一切附带都生效**——不管附带的是毒、昏睡还是封技,统统过这道毒抗关。所以**毒抗 100%(如装备五毒珠)= 完全免疫一切普攻附带异常(毒 / 昏睡 / 封技…)**,这是玩家能主动堆的唯一抵抗手段。
  - 合并 ①②:**普攻附带触发概率 = 敌带毒率 ×(1 − 毒抗)**(即 `rate/10 ×(100−毒抗)/100`)。你提到"若第一道没拦住、施加时再过一次 `(1−毒抗)`"——果真如此总概率 ≈ 敌带毒率 ×`(1−毒抗)²`;这**第二道应在 equiv item 的 `wScriptOnUse` 脚本内**,我尚未定位到具体 item 脚本核实(fight.c 主判定只见 5141 这一道毒抗关)。
- **成功格挡 / 援护 → 整个附带块跳过**(`iCoverIndex == -1 && !fAutoDefend` 是前置):自动格挡(7/17)或被援护时,不仅免那一下伤害,**连普攻附带的毒 / 巫一起免掉**。
- 全过 → 跑"等价物品"`wAttackEquivItem`(一个 item)的 `wScriptOnUse`(目标 = 被打玩家),脚本用 `0x2D` 挂 `kStatusSilence`(或其它异常)——**到玩家身上同样无巫抗关**。

> **⚠️ 普攻附带能挡、仙术附带挡不住**:敌人**仙术**附带的毒 / 巫走另一条路——施法时状态 / 毒在 `wScriptOnSuccess` 里施加([fight.c:4768-4769](../reference/sdlpal/fight.c#L4768-L4769)),**在伤害块之前、且完全不检查 `fAutoDefend`/`fDefending`/护体**。所以主动防御、自动格挡、援护对**仙术附带的异常一概无效**(只有仙术**伤害本身**才受主动防御 /2、护体 /2、法术自防御减免,[fight.c:4801-4803](../reference/sdlpal/fight.c#L4801-L4803))。这就是"敌方仙术带毒 / 带巫,什么防御都没用"的根因。

### ts 实现状态

- `0x28` 下毒:`rangeInclusive(0,9) < 巫抗` 失败(即 `>= 巫抗` 成功),1:1([battle-opcodes.ts:477](../packages/game/src/core/battle/battle-opcodes.ts#L477))。
- `0x2E` 上状态:**已采用 `>=`**([battle-opcodes.ts:634](../packages/game/src/core/battle/battle-opcodes.ts#L634))——跟进原版后期修复(巫抗 0 也 100% 命中、满值 10 才免疫),**有意偏离 sdlpal**(它仍 `>`);源码注释 + 回归测试(actions.test.ts「夺魂成功:巫抗0、掷0也命中」)钉住,防被按 sdlpal 改回。`0x28` 下毒不动(本就是 `>=`)。`enemy-objects.json` 的 `resistanceToSorcery` 经 battle-system 注入敌人槽([battle-system.ts:326](../packages/game/src/core/battle/battle-system.ts#L326))。
- 投掷:`throw-item.ts` 跑 `wScriptOnThrow`,`0x28` / `0x2E` 复用同一 opcode dispatch,故投掷上异常自动同享 90% 上限。
- 敌人普攻附带(`wAttackEquivItem` + 毒抗第二关)、`0x2D` 给玩家上状态:取决于敌→玩家施法编排接入程度(当前战斗主走玩家→敌人;见 [feature-status](feature-status.md))。

### 源出处速查

- 巫抗字段 `wResistanceToSorcery`(0~10):[global.h:203](../reference/sdlpal/global.h#L203)
- 上敌状态 `0x2E`(掷 0~9 **>** 巫抗,CLASSIC `i=9`):[script.c:1377-1397](../reference/sdlpal/script.c#L1377-L1397)
- 下敌毒 `0x28`(掷 0~9 **>=** 巫抗,对照组,无 bug):[script.c:1193](../reference/sdlpal/script.c#L1193) / [1228](../reference/sdlpal/script.c#L1228)
- 上玩家状态 `0x2D`(无抗性关):[script.c:1367-1375](../reference/sdlpal/script.c#L1367-L1375)
- 普攻附带 equiv item(概率关 + 玩家毒抗关):[fight.c:5139-5146](../reference/sdlpal/fight.c#L5139-L5146);字段 [global.h:276-277](../reference/sdlpal/global.h#L276-L277)
- 封技 `kStatusSilence`("cannot use magic"):[global.h:49](../reference/sdlpal/global.h#L49)

---

## 异常状态效果:眠 / 定身 / 疯魔 / 封技

> 承接[抗性体系总览 与 巫术命中判定](#抗性体系总览-与-巫术命中判定):那节讲异常"能不能上",这节讲**上了之后干什么**。状态枚举 [global.h:40-60](../reference/sdlpal/global.h#L40-L60)。

### 状态全集 与 "睡眠 = 定身"

CLASSIC 下共 9 种:混乱 / 定身 / 睡眠 / 封技 / 傀儡 / 狂暴 / 护体 / 加速 / 连击([global.h:40-56](../reference/sdlpal/global.h#L40-L56))。

- **睡眠(`kStatusSleep`)与定身(`kStatusParalyzed`)在 CLASSIC 下是两个独立枚举值,但游戏效果完全相同**——凡"丧失行动力"的判断都成对写 `Sleep ‖ Paralyzed`(出手排序 [fight.c:1505-1507](../reference/sdlpal/fight.c#L1505-L1507)、自动防御压制 [fight.c:4977-4979](../reference/sdlpal/fight.c#L4977-L4979)、援护虚弱判定 [fight.c:4943-4946](../reference/sdlpal/fight.c#L4943-L4946) 等)。所以你说"本质没区别"对:**同义状态、占两个槽**。
- 反向佐证:**非 CLASSIC** 才 `#define kStatusParalyzed kStatusSleep` 真正合并两者,并把腾出的槽给"迟缓 `kStatusSlow`"([global.h:43-60](../reference/sdlpal/global.h#L43-L60))。CLASSIC 无迟缓,定身独立但等价睡眠。
- 状态是**回合计数**(`rgwStatus[x] = 剩余回合`),每回合自减、归 0 解除。设置规则 `PAL_SetPlayerStatus`([global.c:2221-2274](../reference/sdlpal/global.c#L2221-L2274)):眠 / 定身 / 封技 / 混乱属"坏状态"——**已有则不刷新**;护体 / 狂暴 / 加速 / 连击属"好状态"——取较长回合;傀儡只对死人。

### 眠 / 定身:丧失行动力

- 玩家睡眠 / 定身:身法置 0 排最后、本回合**强制普攻**(若回合内被救活),[fight.c:1505-1517](../reference/sdlpal/fight.c#L1505-L1517);且**自动防御被压制**(无援护时 `fAutoDefend` 强制 FALSE,[fight.c:4975-4985](../reference/sdlpal/fight.c#L4975-L4985))——详见[防御机制](#防御机制主动防御--自动防御--援护--护体)。
- 敌人睡眠 / 定身:行动直接跳过([fight.c:4582-4589](../reference/sdlpal/fight.c#L4582-L4589) `goto end`)。

### 封技(`kStatusSilence`):只封仙术

- 注释 "cannot use magic"([global.h:49](../reference/sdlpal/global.h#L49))。中招后**选仙术被判 invalid**([fight.c:3305-3311](../reference/sdlpal/fight.c#L3305-L3311) `fValid=FALSE`),随后**攻击仙术 → 退化普攻、辅助 / 治疗仙术 → 退化防御**([fight.c:3326-3358](../reference/sdlpal/fight.c#L3326-L3358))。
- **只封"仙术(Magic)"**:普攻、投掷道具、用道具、防御、逃跑都照常。来源最典型是敌人普攻附带(黑狗血,见上节"敌人普攻附带异常")。

### 疯魔(混乱 `kStatusConfused`):攻击队友

混乱单位改用专用动作 `kBattleActionAttackMate`(攻击同伴);**玩家版与敌人版抽签规则不同**:

| | 玩家混乱 | 敌人混乱 |
|---|---|---|
| 选目标 | `do { t=RandomLong(0,队伍上限) } while(自己 ‖ 死)` —— **重抽到"非自己的活队友",必打中** | 随机活敌人;**`if(==自己) goto end` 不打** |
| 抽到自己 | do-while 排除,**绝不打自己** | **直接跳过本回合**(这才是你说的"抽到自己就不打") |
| 全队只剩自己活 | 转 **Pass 不动** | 选不到他人 → 跳过 |
| 源 | validate [fight.c:3448-3479](../reference/sdlpal/fight.c#L3448-L3479) + perform [fight.c:3760-3854](../reference/sdlpal/fight.c#L3760-L3854) | [fight.c:4591-4654](../reference/sdlpal/fight.c#L4591-L4654) |

> 你口述的"我方范围抽签、抽到自己就不打"对应的是**敌人混乱**([fight.c:4594](../reference/sdlpal/fight.c#L4594));**玩家混乱**是 do-while **重抽必中队友**,只有全队仅剩自己时才不动。另:玩家混乱"只剩自己→Pass"是 sdlpal **有意偏离原版**的修改([fight.c:3469-3476](../reference/sdlpal/fight.c#L3469-L3476),注释 "original version behaviour is not same"——原版此时会转去打敌人)。

**混乱打友的伤害 / 减伤**(玩家版 [fight.c:3812-3835](../reference/sdlpal/fight.c#L3812-L3835)):

```c
str = 攻击者攻击力;
def = PAL_GetPlayerDefense(被打队友);
if (队友.fDefending) def *= 2;                       // 主动防御:def ×2
sDamage = PAL_CalcPhysicalAttackDamage(str, def, 2); // 物抗参数硬编码 = 2
if (队友[kStatusProtect] > 0) sDamage /= 2;          // 护体:再 /2
```

`PAL_CalcPhysicalAttackDamage` 里物抗是**除数**:`sDamage = CalcBaseDamage(str,def); if(res!=0) sDamage/=res;`([fight.c:279-285](../reference/sdlpal/fight.c#L279-L285))。res=2 → **基础伤害 /2**。

逐条对照你的口述(**以源码为准**):

| 你的说法 | 源码真值 | 判定 |
|---|---|---|
| 伤害 = 基础伤害/2 ×(1−物抗) | res 硬编码 **2**,公式 `基础伤害 / res` = **基础伤害/2**;玩家无物抗变量参与 | ✓ 退化结论对(物抗是除数 `/res`,非 `×(1−物抗)`) |
| 我方无物抗 → 退化成基础伤害/2 | 同上,res=2 写死 | ✓ |
| 攻击队友无法格挡 | 混乱打友**无 `fAutoDefend` 判定**(不同于敌人打玩家 [4938](../reference/sdlpal/fight.c#L4938)),无自动闪避 | ✓ |
| 护体 buff 不生效 | [3820-3823](../reference/sdlpal/fight.c#L3820-L3823) `kStatusProtect → /2` **仍生效** | ✗ 护体照常减半 |
| 主动防御:被队友 ×2、被敌方 ×4 | 混乱打友 [3816](../reference/sdlpal/fight.c#L3816) 与敌人打玩家 [4928](../reference/sdlpal/fight.c#L4928) **都是 `def*=2`**;**无 ×4** | ✗ 无 ×4(疑把"敌人作防御方时 `def+(等级+6)*4` 的等级构成"记串) |

**敌人混乱打敌人**伤害另算:`PAL_CalcBaseDamage(str,def) * 2 / 目标物抗`([fight.c:4634-4645](../reference/sdlpal/fight.c#L4634-L4645)),走目标敌人的真实物抗。

### 敌人混乱选目标:DOS / Win 原版 bug,sdlpal 已修

- 你说"DOS 只打右侧、Win 几乎不打友方"——那是**原版(DOS / Win95)的选目标 bug**。
- sdlpal 的 `PAL_BattleEnemySelectEnemyTargetIndex`([fight.c:4506-4517](../reference/sdlpal/fight.c#L4506-L4517))是**纯随机选活敌人**(重抽到存活),**未复刻**右侧偏向 / 不攻击。→ **type-pal 跟 sdlpal,本就没这个 bug**,符合你"希望咱们没有"。

### 解封技:引擎能解,"解不掉"在数据层

- 引擎层 `0x2F`([script.c:1399-1403](../reference/sdlpal/script.c#L1399-L1403))→ `PAL_RemovePlayerStatus(role, 状态)`([global.c:2280](../reference/sdlpal/global.c#L2280))**能解任意状态,含封技**——引擎没拦着。
- DOS 版"很多药 / 技能解不了封技"是**数据 / 脚本层**:那些道具 / 技能脚本里**没写"解 `kStatusSilence`"那条 `0x2F`**(只解了睡眠 / 中毒等)。
- **归属与取舍**(照本仓"考证真值 → 讲清归属 → 你拍板"惯例,同[逃跑吉运](#吉运只影响逃跑成功率)那节):sdlpal 忠实复刻原版数据,用同一份提取数据时 type-pal **行为会一样**。要"修"得**改具体道具的脚本数据**(补一条解 Silence),偏离 1:1 忠实——**建议先 1:1 照搬;若要让某几件药能解封技,你点名、我改数据并注明偏离**。(当前未改。)

### ts 实现状态

本节为**原版规则考证**;type-pal 对照实现程度见 [feature-status](feature-status.md) 战斗状态项。若实现 / 校准混乱 / 封技,须照搬上述真值:**混乱打友 res=2 → /2、护体仍 /2、`def*=2`(无 ×4)、玩家 do-while 必打活队友、敌人选目标纯随机、封技只禁仙术**;解封技属数据层,默认随原版(不擅改)。

---

## 毒系统:等级 / 每回合伤害 / 七大毒 / 相生相克

> 这节讲**中毒后的持续效果(DoT)与七大毒**,区别于[五灵 / 毒 抗性](#五灵--毒-抗性与五行机制)那节(讲毒系**仙术伤害**缩放)。下列数值除注明外均为 `object-poisons.json` + `events/all.json` 脚本反汇编**实测**。

### 先厘清:巫抗 ≠ 毒抗(下毒命中看巫抗,不看毒抗)

最容易混的两个字段,作用完全不同:

| | 巫抗 `wResistanceToSorcery` | 毒抗 `wPoisonResistance` |
|---|---|---|
| 谁有 | **仅敌人** | 敌我都有 |
| 管什么 | **中毒 / 中状态能否成功**(`0x28` 下毒 `掷0~9 >= 巫抗`;`0x2E` 上状态) | **毒系伤害缩放** |
| 敌方的作用 | gate 敌人是否中毒 / 中状态 | **只降毒系仙术伤害**(不参与中毒判定) |
| 我方的作用 | 玩家无此字段 | **降伤 + 降中毒概率**(被附带毒时 `玩家毒抗 < 掷1~100` 才中,[fight.c:5141](../reference/sdlpal/fight.c#L5141));装备 / 吃大蒜可加,上限 100 |

- **给敌人下毒能不能中,看敌人巫抗,跟毒抗无关**——巫抗满(10)的 boss 根本不中毒(下文"秒杀"用到)。
- 敌人毒抗高 ≠ 难毒到它,只是"你用毒系仙术砍它伤害低";真正挡中毒的是巫抗。我方则相反:毒抗**既降伤又降中毒率**,所以堆毒抗(装备 / 大蒜)对玩家防毒是实打实有用的。

### 数据结构 与 毒名

- `OBJECT_POISON`:`wPoisonLevel`(等级)/ `wColor`(头像染色)/ `wPlayerScript`(玩家中毒每回合跑)/ `wEnemyScript`(敌人中毒每回合跑)([global.h](../reference/sdlpal/global.h))。
- **毒名 = WORD.DAT 里的 object 名**(项目 `words.json` 的 `flat[毒id]`),**状态页直接显示当前所中毒名**。
- **敌我两套脚本**:同一种毒,玩家中 vs 敌人中**每回合效果不同**(`playerScript ≠ enemyScript`);我方扣血走 `0x1B`(改 HP,操作数补码负数),敌方走 `0x21`(扣敌 HP,正数)。

### 等级 + 每回合伤害(实测)

| id | 毒名 | 等级 | 我方每回合 | 敌方每回合 | 备注 |
|---|---|---|---|---|---|
| 551 | 赤毒 | 0 | −7 | −7 | |
| 552 | 尸毒 | 1 | −12 | −12 | |
| 553 | 瘴毒 | 1 | −20 | −20 | |
| 554 | **毒丝** | 2 | −32 | −32 | 你说的"丝毒"原名是**毒丝** |
| 555 | 三尸蛊毒 | 3 | 0→1→2→3→**200** | 111→222→333 | 逐回合递增,见下 |
| 556–560 | 鹤顶红 / 孔雀胆 / 血海棠 / 断肠草 / 金蚕蛊毒 | 3 | −50 / 回 | −100 / 回 | 约 5 回合 |
| 137 | 无影毒 | **173** | 见下 | 对敌:一次性半血(≤1000) | 爆发毒 |
| 561 / 562 | 食妖虫附 / 碧血蚕附 | 4 | — | 寄生 | 投掷寄生敌 9 回合、每回合 −1,到期掉道具(灵蛊 / 赤血蚕)——养蛊玩法;据你(561/562 自身 tick 脚本为空,寄生逻辑在投掷道具脚本) |
| 563 / 564 | HP回补 / MP回补 | **99** | 每回合回血 / 回蓝 | 同 | **伪毒**:寿葫芦等装备挂的正面效果;level 99 被 `IsPoisonedByLevel` 忽略,**不算"中毒"**(见下) |

- 赤 / 尸 / 瘴 / 毒丝(0–2 级)= **常规毒**,敌我数值相同(只是 opcode 不同)。
- 555 及以上是七大毒(3 级及以上),**常规解毒药解不了**(见"解毒")。

### 毒伤逐回合推进 + 三尸蛊

每回合跑 `wPoisonScript`,**执行到 `end` 后把脚本指针推进到下一条**——于是"同一种毒、不同回合扣不同血"。**三尸蛊**(555)最典型:

- **我方**:第 1–5 回合 `0 → −1 → −2 → −3 → −200`(末回合 `0x1B` 暴扣 200,随后 `0x2B` 把三尸蛊自我解除)。
- **敌方**:`−111 → −222 → −333`(`0x21`,随后 `0x2A` 自解)。

(数值与你口述完全一致;这也是"敌我两套脚本、效果不同"的范例。)

### 七大毒:六普通三级毒 + 无影毒

**七大毒 = 三尸蛊、鹤顶红、孔雀胆、血海棠、断肠草、金蚕蛊(以上 6 种 = 555–560,level 3)+ 无影毒(137,level 173)。**

- **无影毒 = 爆发毒**:不是逐回合 DoT,挂上后**一次性结算**——对敌走 `0x5B "Halve HP"`:`扣血 = 当前 HP/2 + 1`,**上限 1000**([script.c:1895-1905](../reference/sdlpal/script.c#L1895-L1905) 的 `w=HP/2+1; if(w>operand)w=operand`)。level **173** 远超任何解毒上限 → **谁都解不了**。(与你说的"半血、上限 1000、不能解"一致。)

### 相生相克 + 三对致死组合(脚本实证)

> 已逐脚本枚举(`all.json` 段内 ci 39419–39499):六大毒各对应一件**毒药道具**——鹤顶红(item 122)/ 孔雀胆(123)/ 血海棠(124)/ 断肠草(125)/ 三尸蛊(138)/ 金蚕蛊(139)。相克 + 致死全写在道具的 `wScriptOnUse`(对己/队友用)与 `wScriptOnThrow`(对敌投)里,用 `0x5D`/`0x5E`(按 kind 查玩家/敌是否已中某毒)配 `0x2B`(按 id 解我毒)/ `0x5F`(秒杀我)/ `0x60`(秒杀敌)。每件毒药的 **use 脚本是统一三段链**:

  `① 若身中【被本毒所克的毒】→ 解掉它(以毒攻毒)、结束 → ② 否则若身中【致死配对毒】→ 当场暴毙 → ③ 都没有 → 给自己下本毒`

- **相克闭环(单向 6 元环;use 毒药 A 可解身上被 A 所克的毒 B)**:
  **鹤顶红 → 血海棠 → 断肠草 → 三尸蛊 → 孔雀胆 → 金蚕蛊 →(回到)鹤顶红**
  逐边即:鹤顶红解血海棠、血海棠解断肠草、断肠草解三尸蛊、三尸蛊解孔雀胆、孔雀胆解金蚕蛊、金蚕蛊解鹤顶红——首尾相接,正好成一个闭环。
  - **方向固定(单向)**:金蚕蛊能解鹤顶红,但反过来 use 鹤顶红只查血海棠、不碰金蚕蛊 → 身中"金蚕蛊+鹤顶红"时只有 use **金蚕蛊**才解得掉鹤顶红。相克**只在主动 use 毒药时触发**,被动同时中两毒**不会自相克**(没有"新下的毒自动解旧毒"这回事)。
  - **以毒攻毒是"换"不是"叠"**:use 第①段解掉旧毒后立即 `end`,本毒**不会**再下到自己身上(拿 A 换掉 B,而非 A、B 并存)。
- **三对致死组合(双向,同时在身即暴毙)**:① 孔雀胆 ↔ 鹤顶红;② 血海棠 ↔ 三尸蛊;③ 金蚕蛊 ↔ 断肠草。**双向对称**:throw 脚本里"下 A 查 B 秒"与"下 B 查 A 秒"成对存在,use 第②段亦然(下/用任一方,若目标已中其配对毒 → 立即秒杀)。
- **对敌秒杀**:对敌**投掷**(`wScriptOnThrow`:`0x28` 下毒 A + `0x5E` 查敌是否已中配对毒 + `0x60` 秒)即可凑致死对秒敌。**但下毒命中看巫抗**(`0x28` 前置 `RandomLong(0,9) >= 巫抗`)——**巫抗满(10)的 boss 不会中毒,这招对它们无效**(呼应开头"巫抗 ≠ 毒抗")。
- **凑致死对的第二下必须用投掷**:致死检查只写在毒药**道具**的 throw/use 脚本里;用**三尸咒**(对敌下三尸蛊的**巫术**)作第二下**无效**——巫术下毒脚本只单纯 `0x28` 加毒,不带 `0x5E`+`0x60` 检查。(注:玩家**对自己 use** 毒药时若已中配对毒,第②段会让自己**当场暴毙**——use 同样带致死检查,只是作用对象是自己。)
- **投掷解毒道具不解敌人的毒**:相克解毒(`0x2B`)与按等级解毒(`0x2C`)都**只作用于玩家 / 队伍**;对敌投毒脚本里**只有秒杀(`0x60`),没有 `0x2A`(按 id 解敌毒)**——`0x2A` 仅供毒 DoT 脚本末尾自解(如三尸蛊到期自除)。所以拿解毒道具投敌,解不掉敌身的六大毒。

### 下毒途径:三尸蛊靠巫术,其余靠投掷

- **三尸蛊**:有**巫术**(magic,脚本里 `0x28` 对敌下毒)——七大毒里唯一能用仙术种下的。
- **其余毒**:靠**投掷道具**(item 的 `wScriptOnThrow` 里 `0x28`)。
- 两条途径的 `0x28` 都受敌**巫抗** gate(`掷0~9 >= 巫抗` 才中,见[巫术命中判定](#巫术命中判定0x2e-公式--上限-90-bug))。

### 解毒(按等级)

`0x2C` "Cure poisons by level" → `PAL_CurePoisonByLevel(role, wMaxLevel)`:移除**等级 ≤ wMaxLevel** 的毒([script.c:1349-1365](../reference/sdlpal/script.c#L1349-L1365) / [global.c:1604-1613](../reference/sdlpal/global.c#L1604-L1613))。

| 解毒来源 | wMaxLevel | 能解到 |
|---|---|---|
| **灵血咒**(magic 308) | **2**(实测 `0x2C [_,2]`,[scriptOnSuccess L_43082]) | 常规毒(赤 / 尸 / 瘴 / 毒丝,0–2 级) |
| **九节菖蒲**(item 89) | 2(据你,同灵血咒) | 同上 |
| **复活**(`0x22`,还魂类) | **3**([script.c:1071/1091](../reference/sdlpal/script.c#L1071)) | 顺带解 ≤3 级 → **连七大毒一起解**,但解不掉无影毒(173) |

- 结论:**专门解毒药(灵血咒 / 九节菖蒲)只解到 2 级,七大毒解不了**;中七大毒只能靠**复活类**(解到 3 级)、相克、或撑过持续回合。**无影毒(173)谁都解不了**。
- 另有 `0x2A` / `0x2B` 按毒**种类(id)**解(敌 / 我),供脚本精确点名解某毒(相克链、毒末尾自解都用它)。

### 风险解毒道具(毒龙胆 / 九阴散)与 寿葫芦白嫖

**毒龙胆**(item 278,`wScriptOnUse`=L_39765)、**九阴散**(item 136) 同款:脚本先 `0x61`"**没中毒就跳去 `0x5F` 秒杀自己**",否则 `0x2C` 解 **≤3 级**毒(含七大毒里的六种 level3,**不含**无影毒 173)并回血(九阴散回满)。

- **没中毒时吃 = 暴毙**(`0x61` → `0x5F`);有毒时吃 = 解毒 + 回血。高风险高回报。
- **"漏赤毒"归属**:`0x61` 调 `PAL_IsPlayerPoisonedByLevel(role, 0)`,sdlpal 用 `w >= wMinLevel`([global.c:1677](../reference/sdlpal/global.c#L1677)) → 赤毒 level0 满足 `0>=0` **算中毒、不漏**。你说的"毒龙胆漏赤毒被秒"疑是**原版早期**用 `>`(漏 level0)的 bug,**sdlpal 已修为 `>=`**;type-pal ts 更彻底(不看 level,任意毒都算)→ 也不会漏赤毒。
- **寿葫芦白嫖(原版早期 bug → 后期已修)**:寿葫芦(item 269)挂 **level 99 伪毒**(`HP回补`563 / `MP回补`564,每回合回血 / 回蓝)。这种 level99 毒在 sdlpal 被 `if (w >= 99) continue` **忽略**([global.c:1669](../reference/sdlpal/global.c#L1669),注释"装备效果")。三版行为:

  | | 寿葫芦 level99 伪毒算不算"中毒" | 装寿葫芦吃毒龙胆 / 九阴散 |
  |---|---|---|
  | **原版早期** | 算 | **不暴毙**,解毒 + 回满血(白嫖) |
  | **原版后期(判 bug 已修)= sdlpal** | 不算(`>=99 continue`) | **照样暴毙** |
  | **type-pal ts(已修)** | **不算**(`isPlayerPoisoned` ByLevel 补了 level≥99 豁免) | **照样暴毙**(对齐 sdlpal / 原版后期) |

  → **已修**:`isPlayerPoisoned`([event-system.ts:3241](../packages/game/src/core/event-system.ts#L3241))的 ByLevel 路径(`poisonKind===undefined`,即 `0x61`)补了 `level >= 99 → 跳过`,寿葫芦等装备伪毒不再算"中毒",装寿葫芦吃毒龙胆 / 九阴散**照样暴毙**(对齐 sdlpal / 原版后期);`0x60` 的 ByKind 路径(查特定毒 id)不动。回归测试见 event-system.test.ts「没中毒则跳:level≥99 伪毒」。与[巫术 `0x2E`](#巫术命中判定0x2e-公式--上限-90-bug)同属"跟进原版后期修复"。

### ts 实现状态

毒的**伤害缩放 + 中毒概率**(毒抗那套)实现见[五灵 / 毒 抗性](#五灵--毒-抗性与五行机制)节末。本节的**逐回合 DoT(`0x1B`/`0x21` + `end` 推进)、按等级 / 种类解毒(`0x2C`/`0x2A`/`0x2B`)、无影毒半血(`0x5B`)** 走战斗 opcode dispatch(`0x28` 下毒已实现,见 [battle-opcodes.ts](../packages/game/src/core/battle/battle-opcodes.ts));**相生相克 / 三对致死组合**取决于各七大毒 apply 脚本接入程度(`0x5E` 查毒 + `0x60`/`0x5F` 秒杀),实现时须照搬上述规则与数值。
