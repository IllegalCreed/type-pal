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
| 概率 | 玩家主动,100% 进入 | `RandomLong(0,16) >= 10` ≈ **41%** |
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
- 毒系仙术(elem > 5)走同一公式,用毒抗替元素抗。另外毒抗还 gate 敌人"附带毒"效果:`PAL_GetPlayerPoisonResistance < RandomLong(1,100)` 才中毒([fight.c:5141](../reference/sdlpal/fight.c#L5141))。

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

ts 实现状态:**未实现**(无 `kBattleActionCoopMagic` 编排 / `coopContributors` / `fThisTurnCoop`)。

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

ts 实现状态:`actions/` 下暂无独立 flee 动作(无 `flee.ts`),逃跑成功公式 + 失败累计吉运经验**未实现**。
