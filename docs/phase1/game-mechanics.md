# Game Mechanics · 原版底层机制真值

> 原版隐藏在数据/战斗逻辑里、玩家不可直接看见的底层规则。**真值基准 = sdlpal C 源**(`reference/sdlpal/*.c` / `*.h`),每条都带行号出处。
> 本文件只记"机制规则本身",ts 实现状态另在每节末尾的 **ts 实现状态** 小节标注(防止把"原版规则"和"我们做到哪"混淆)。
> 截图/印象只用来发现机制,**不作为依据** —— 一切以下方源出处为准。

## 索引

- [人物主等级升级：各属性随机成长](#人物主等级升级各属性随机成长)
- [隐藏属性经验 / 等级系统](#隐藏属性经验--等级系统)
- [伤害计算:攻击力 vs 防御值](#伤害计算攻击力-vs-防御值)
- [伤害公式的百分比口径与属性收益](#伤害公式的百分比口径与属性收益)
- [投掷武器与铜钱镖：等效灵力与伤害](#投掷武器与铜钱镖等效灵力与伤害)
- [暴击 与 李逍遥会心一击](#暴击-与-李逍遥会心一击)
- [防御机制:主动防御 / 自动防御 / 援护 / 护体](#防御机制主动防御--自动防御--援护--护体)
- [队友阵亡:援护者的台词与增益](#队友阵亡援护者的台词与增益)
- [群体普攻伤害递减](#群体普攻伤害递减)
- [战后 HP / MP 恢复](#战后-hp--mp-恢复)
- [五灵 / 毒 抗性与五行机制](#五灵--毒-抗性与五行机制)
- [战斗场景对五灵仙术的影响](#战斗场景对五灵仙术的影响)
- [合击仙术](#合击仙术)
- [身法与出手顺序](#身法与出手顺序)
- [吉运(只影响逃跑成功率)](#吉运只影响逃跑成功率)
- [特殊技能成功率(秒杀 / 偷取 / 上状态)](#特殊技能成功率秒杀--偷取--上状态)
- [紫金葫芦炼丹:灵葫值炼随机丹药](#紫金葫芦炼丹灵葫值炼随机丹药)
- [抗性体系总览 与 巫术命中判定](#抗性体系总览-与-巫术命中判定)
- [异常状态效果:眠 / 定身 / 疯魔 / 封技](#异常状态效果眠--定身--疯魔--封技)
- [毒系统:等级 / 每回合伤害 / 七大毒 / 相生相克](#毒系统等级--每回合伤害--七大毒--相生相克)
- [怪物刷新:消失倒计时与离屏复活](#怪物刷新消失倒计时与离屏复活)
- [大世界施加的状态如何带入战斗:护体 / 中毒 / 毒抗](#大世界施加的状态如何带入战斗护体--中毒--毒抗)

---

## 人物主等级升级：各属性随机成长

> **原版真值补充（用户核对，2026-09-05）**：用户提供的升级增量截图确认下列七项范围，原版各角色共用。
> Codex本次另核SDL参考实现 [global.c:2384-2390](../../reference/sdlpal/global.c#L2384)
> 与现有实现，数值一致；没有声称本次运行原版游戏独立实测。

这里说的是**人物主等级每提升1级时，基础属性增加多少**，不是升级所需经验，也不是隐藏属性经验涨点。
区间是**包含两端的整数区间**；固定成长可理解为上下限相同。

| 属性（统一术语） | 每级增量 | SDL参考公式 / 基础字段 |
|---|---|---|
| 体力上限 | +10～17 | `10 + RandomLong(0, 7)` → `rgwMaxHP` |
| 真气上限 | +8～13 | `8 + RandomLong(0, 5)` → `rgwMaxMP` |
| 武术 | +4～5 | `4 + RandomLong(0, 1)` → `rgwAttackStrength` |
| 灵力 | +4～5 | `4 + RandomLong(0, 1)` → `rgwMagicStrength` |
| 防御 | +2～3 | `2 + RandomLong(0, 1)` → `rgwDefense` |
| 身法 | +2～3 | `2 + RandomLong(0, 1)` → `rgwDexterity` |
| 吉运 | 固定 +2 | `2` → `rgwFleeRate`；不抽随机数 |

重要边界：

- 原版**每个角色采用同一组增量规则**，不是同一级必定得到相同数值；六项分别调用随机函数，吉运固定。
- 体力、真气在本表指**上限的永久成长**，不把当前HP/MP回复混进区间。正常经验升级后的回满，以及
  [战后缺口半恢复](#战后-hp--mp-恢复)，是另外的结算步骤；不能仅凭本表推断所有直接升等级道具都会回满。
- SDL的多级成长逐级循环（[global.c:2379](../../reference/sdlpal/global.c#L2379)），不是只抽一次后乘等级数；
  主升级七项属性最终封顶999（[global.c:2393](../../reference/sdlpal/global.c#L2393)）。等级上限和满级后的直接成长
  调用另受调用路径控制，不从截图扩展新的规则。
- [隐藏属性经验](#隐藏属性经验--等级系统)仍是另一套机制：按战斗行为分配经验，池升级时对应属性+1～2。
  剧情明确指定的固定属性增长（例如下文镇狱明王战赵灵儿觉醒）也不是本表的随机主升级。

实现锚点：第一阶段 [battle-system.ts:3627](../../packages/game/src/core/battle/battle-system.ts#L3627)
在经验升级时应用同一组区间；第二阶段当前 [rewards.ts:44](../../packages/content/src/rewards.ts#L44)
仍在`applyLevelGrowth`硬编码这组增量。用户另要求第二阶段编辑器允许逐角色配置这些区间；
**这属于新增作者能力，尚未实现，不改变本节记录的原版规则。**

---

## 隐藏属性经验 / 等级系统

### TL;DR

除人物**主经验 / 主等级**外,原版给每个角色另设**一组隐藏属性经验池**。战斗中按角色执行的**动作种类**累计临时计数(`wCount`);**战斗胜利后**,把本场获得的主经验 **×2** 按各动作计数的**比例**分配进这些隐藏经验池,经验跨过阈值就**永久提升对应属性**(每级 +1~2)。

一句话:**普攻练武术/体力,法术练灵力/真气,防御练防御,逃跑(失败)练吉运** —— 玩家听到的说法方向正确。但有 4 个容易踩的坑,见下方 [重要约束](#重要约束容易误解的点)。

### 1. 数据结构

源:[global.h:475-493](../../reference/sdlpal/global.h#L475-L493)。

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
- 隐藏等级 `wLevel` **初始 = 角色起始等级**(新游戏/读档时):[global.c:463](../../reference/sdlpal/global.c#L463) 把每组 `wLevel` 初始化为 `rgwLevel[i]`。

### 2. 战斗中:按动作累计 `wCount`

源:[fight.c](../../reference/sdlpal/fight.c),`PAL_BattlePlayerPerformAction` 各 action case。**全部** 6 个累计点(穷尽,无遗漏):

| 玩家动作 | sdlpal action | 源行号 | 累计 |
|---|---|---|---|
| 普通攻击 | `kBattleActionAttack` | [3756-3757](../../reference/sdlpal/fight.c#L3756-L3757) | `rgAttackExp.wCount += 1`<br>`rgHealthExp.wCount += RandomLong(2,3)` |
| 施法 | `kBattleActionMagic` | [4328-4329](../../reference/sdlpal/fight.c#L4328-L4329) | `rgMagicExp.wCount += RandomLong(2,3)`<br>`rgMagicPowerExp.wCount += 1` |
| 防御 | `kBattleActionDefend` | [4116](../../reference/sdlpal/fight.c#L4116) | `rgDefenseExp.wCount += 2` |
| 逃跑(**失败时**) | `kBattleActionFlee` | [4170](../../reference/sdlpal/fight.c#L4170) | `rgFleeExp.wCount += 2` |

> `RandomLong(2,3)` = 闭区间随机 2 或 3。
> **没有**为身法(Dexterity)、使用物品、投掷物品、合击、待机等累计任何 `wCount`(见坑①)。

### 3. 战斗胜利后:×2 经验按比例分配

源:[battle.c `PAL_BattleWon`](../../reference/sdlpal/battle.c#L991),宏 `CHECK_HIDDEN_EXP` [battle.c:1238-1284](../../reference/sdlpal/battle.c#L1238-L1284)。对每个**存活**队员([1093](../../reference/sdlpal/battle.c#L1093) 跳过死亡角色):

**Step A — 主经验**([1098-1120](../../reference/sdlpal/battle.c#L1098-L1120)):本场 `iExpGained`(= 击败的全部敌人 `wExp` 之和)直接加进 `rgPrimaryExp.wExp`,跨 `rgLevelUpExp` 阈值则升人物等级。

**Step B — 隐藏属性**([1226-1284](../../reference/sdlpal/battle.c#L1226-L1284)):先把 7 个隐藏池的 `wCount` 求和为 `iTotalCount`(**不含主经验**,[1228-1234](../../reference/sdlpal/battle.c#L1228-L1234));`iTotalCount > 0` 时,对每个隐藏属性按 `CHECK_HIDDEN_EXP` 结算:

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
- **阈值表与主等级共用** `rgLevelUpExp`([1252](../../reference/sdlpal/battle.c#L1252))。隐藏等级又初始 = 角色等级,所以练隐藏属性和升主级**成本同量级**,涨得慢。
- 每升一个隐藏级,属性 **+RandomLong(1,2)**;若有变化,战斗结算画面弹"XXX 属性 升一级"框([1264-1273](../../reference/sdlpal/battle.c#L1264-L1273))。

### 4. 重要约束(容易误解的点)

- **坑①:身法(Dexterity)没有任何来源。** 穷尽全部 `.c`,`rgDexterityExp.wCount` 只有**读取 / 清零 / 初始化**,**没有任何 `+=` 累计点**。它有槽位、参与 `iTotalCount` 求和、也会在 `CHECK_HIDDEN_EXP` 里被结算,但因为永远是 0,该机制**永远不会**提升身法。身法只能靠**主等级升级表**(`PAL_PlayerLevelUp`)成长。
- **坑②:逃跑只在"失败"时给吉运。** `rgFleeExp.wCount += 2` 在 [fight.c:4170](../../reference/sdlpal/fight.c#L4170) 的 `else`(逃跑失败)分支里;逃跑**成功**直接离开战斗,不给吉运、也不触发任何结算。
- **坑③:只有"战斗胜利"才结算。** `CHECK_HIDDEN_EXP` 只在 `PAL_BattleWon` 跑。整场积的 `wCount` 只是临时权重 —— 打输 / 逃跑成功 → 本场所有动作权重作废、不结算。
- **坑④:`wCount` 每场清零。** 战斗结束统一清零([battle.c:1579-1585](../../reference/sdlpal/battle.c#L1579-L1585)),不跨场累计。真正跨场持久的是结算后的 `wExp`(余数)和 `wLevel`。
- **`wCount` 不是经验值本身**,是"本场动作占比权重";真正进账的隐藏经验来自本场主经验的二倍按权重切分。

### 5. ts 实现状态

> ✅ **整套隐藏经验机制已完整实现**（E04/D11/D11b 修订后补齐;2026-07-29 逐行代码审计确认）。

- 累计 `wCount`：`battle-system.ts:2880-2956` 通过 `addHiddenExp` 闭包在 `performBattleAction` 中按动作类型累计（attack→武术+体力 R(2,3)、defend→防御+2、magic→真气+灵力 R(2,3)、flee-fail→吉运+2），均有 `!actor.isEnemy` 门控。
- 战前清零：`clearHiddenExpCounts(gs)` 在 `startBattle`（:401）清 7 个隐藏池,保留 `rgPrimaryExp.wCount`。
- `CHECK_HIDDEN_EXP` 分配：`applyHiddenExpGrowth`（:3532-3568）—— iTotalCount = Σ 7 池;`dwExp = trunc(expGained × wCount / iTotalCount) × 2 + wExp`;`while dwExp >= levelUpExp[wLevel]: dwExp -= threshold; stat += R(1,2); wLevel++`。按 Health→…→Flee 固定序消费 RNG。
- 主等级升级：`battleWonLevelUp`（:3585-3729）—— 读 `levelUpExp` 阈值表;`while dwExp >= threshold` 循环;属性成长 `maxHP += 10+R(0,7)` 等;STAT_LIMIT 999 封顶;升级回满 HP/MP。
- 隐藏涨点弹窗：`buildBattleWonSettlement`（:3324-3365）—— 逐属性 push `{ kind: 'hidden-exp-up', data: { roleId, name, statLabelWord, delta } }`;STAT_LABEL_WORD id 49-55。

### 附:源出处速查

| 内容 | 文件:行 |
|---|---|
| `EXPERIENCE` / `ALLEXPERIENCE` 结构 | [global.h:475-493](../../reference/sdlpal/global.h#L475-L493) |
| 隐藏等级初始 = 角色等级 | [global.c:463](../../reference/sdlpal/global.c#L463) |
| 普攻累计(武术+体力) | [fight.c:3756-3757](../../reference/sdlpal/fight.c#L3756-L3757) |
| 施法累计(真气+灵力) | [fight.c:4328-4329](../../reference/sdlpal/fight.c#L4328-L4329) |
| 防御累计 | [fight.c:4116](../../reference/sdlpal/fight.c#L4116) |
| 逃跑失败累计(吉运) | [fight.c:4170](../../reference/sdlpal/fight.c#L4170) |
| 胜利结算入口 `PAL_BattleWon` | [battle.c:991](../../reference/sdlpal/battle.c#L991) |
| 主经验 + 主等级升级 | [battle.c:1098-1120](../../reference/sdlpal/battle.c#L1098-L1120) |
| 隐藏池求和 `iTotalCount` | [battle.c:1226-1234](../../reference/sdlpal/battle.c#L1226-L1234) |
| `CHECK_HIDDEN_EXP` 分配宏 | [battle.c:1238-1284](../../reference/sdlpal/battle.c#L1238-L1284) |
| `wCount` 战后清零 | [battle.c:1579-1585](../../reference/sdlpal/battle.c#L1579-L1585) |

---

## 伤害计算:攻击力 vs 防御值

### 核心:`PAL_CalcBaseDamage(攻, 防)` 三段公式

源:[fight.c:131-171](../../reference/sdlpal/fight.c#L131-L171)。一切物理 / 法术伤害的底座(sdlpal 注释:Formula courtesy of palxex and shenyanduxing):

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

- 玩家攻击力 `PAL_GetPlayerAttackStrength` = 角色 `rgwAttackStrength` + 全部装备加成([global.c:1736-1764](../../reference/sdlpal/global.c#L1736-L1764));防御 / 灵力 / 身法 / 吉运同理(各 `PAL_GetPlayerXxx` = base + 装备)。
- **玩家攻击力不含等级项**:玩家打敌人 `str = PAL_GetPlayerAttackStrength(role)` 就这一项([fight.c:3630](../../reference/sdlpal/fight.c#L3630))。等级影响已烤进基础属性成长(升级 + 隐藏经验),战斗公式里不再加。
- **敌人相反,有效攻 / 防都带等级项**:
  - 敌人打玩家:`str = 敌人攻击力 + (敌人等级+6)×6`([fight.c:4917-4918](../../reference/sdlpal/fight.c#L4917-L4918))
  - 玩家打敌人:`def = 敌人防御 + (敌人等级+6)×4`([fight.c:3631-3632](../../reference/sdlpal/fight.c#L3631-L3632))

### 物抗:为什么"敌人有物抗、我方没有"(你的观察正确)

- **敌人**有物理抗性 `wPhysicalResistance`([global.h:287](../../reference/sdlpal/global.h#L287),仅敌人结构有)。玩家打敌人时 `PAL_CalcPhysicalAttackDamage` 内 `base /= res`(res≠0 时,[fight.c:279-285](../../reference/sdlpal/fight.c#L279-L285))——敌人物抗是个**除数**,res=2 即受到的物理伤害减半。
- **玩家没有任何物理抗性属性**(grep 全 `global.c/.h` 无 player physical resistance)。敌人打玩家时 res **硬编码常量 2**([fight.c:5056](../../reference/sdlpal/fight.c#L5056))——所有敌人物理一律 `base/2`,这是公式固定项,不是玩家可成长的抗性。
- 玩家**有**的是元素抗(`PAL_GetPlayerElementalResistance`)+ 毒抗(`PAL_GetPlayerPoisonResistance`),只作用于法术,不挡物理。

### 物理:玩家普攻打敌人(单体)

完整链 [fight.c:3623-3674](../../reference/sdlpal/fight.c#L3623-L3674):

1. `str = PAL_GetPlayerAttackStrength(role)`(攻击力 + 装备)
2. `def = 敌人防御 + (敌人等级+6)×4`;`res = 敌人 wPhysicalResistance`
3. `sDamage = CalcBaseDamage(str, def) / res`
4. `sDamage += RandomLong(1, 2)`
5. 暴击 / 会心(下节):暴击 ×3、李逍遥额外 ×2
6. `sDamage = (SHORT)(sDamage × RandomFloat(1, 1.125))`(浮动 +0%~12.5%)
7. 下限 1
8. `kStatusDualAttack`(双重攻击)→ 整套跑 2 次

### 物理:敌人打玩家

完整链 [fight.c:4910-5076](../../reference/sdlpal/fight.c#L4910-L5076):

1. `str = 敌人攻击力 + (敌人等级+6)×6`(< 0 归 0)
2. `def = PAL_GetPlayerDefense(role)`;若玩家**主动防御** → `def ×= 2`
3. **自动防御 / 援护判定**(下节)——若触发,本次 0 伤,跳过下面
4. `sDamage = CalcBaseDamage(str + RandomLong(0,2), def) / 2`(res 固定 2)
5. `sDamage += RandomLong(0, 1)`
6. **护体** `kStatusProtect` → `sDamage /= 2`([fight.c:5059-5062](../../reference/sdlpal/fight.c#L5059-L5062))
7. clamp 到玩家当前 HP;下限 1
8. 伤害**永远落在被攻击者本人**([fight.c:5075](../../reference/sdlpal/fight.c#L5075))——援护者绝不替挨打

### 法术(仙术)伤害:灵力 vs 防御

源 `PAL_CalcMagicDamage` [fight.c:174-249](../../reference/sdlpal/fight.c#L174-L249)。施法方"灵力"= `PAL_GetPlayerMagicStrength`(`rgwMagicStrength` + 装备):

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
- 玩家被仙术击中减伤:`sDamage /= ((主动防御?2:1) × (护体?2:1)) + (法术自动防御?1:0)`([fight.c:4801-4803](../../reference/sdlpal/fight.c#L4801-L4803))。

### 伤害公式的百分比口径与属性收益

> **用户公式截图补充（2026-09-05）**：两张图分别展示仙术与我方单体普攻的百分比表达，
> 并用“2灵力约增1伤害／1武术约增1伤害”解释属性收益。下列记录截图公式，并依据SDL参考源码
> 说明成立条件；没有声称本次运行原版游戏实测。

**截图采用的是高伤段。** 令A为普通攻击的有效武术，M为普通仙术的有效灵力，D为目标的有效防御；
这里普通物攻/仙术的属性来源包括适用的装备加成，不能与下文投掷武器的空装武术混用。
高伤段的实数概述为`B(X,D)=2×(X−0.8D)`，条件是`X>D`；中段、低段仍按本节开头的三段公式计算。

```text
仙术（带五灵属性的伤害部分）：
  M' = M × 随机倍率约[1, 1.1]
  伤害 ≈ (B(M',D) ÷ 4 + 仙术基础伤害) × (1 − 有效抗性) × (1 + 战场增益)

我方普通单体普攻（尚未计暴击/会心）：
  伤害 ≈ (B(A,D) ÷ 2 × (1 − 有效物抗) + 随机整数[1, 2]) × 随机倍率约[1, 1.125]
```

两个加法/乘法层不能混淆：仙术的**灵力贡献与固定基伤整体**受到抗性/战场乘数影响；
普攻的随机+1或+2在基础物抗处理**之后**加入，再参与后续倍率。
源码锚点：[仙术](../../reference/sdlpal/fight.c#L215)、[单体普攻](../../reference/sdlpal/fight.c#L3630)。
实际还包括`+0.5`取整、逐步整数/WORD/SHORT转换、伤害下限等；`≈`表示比例分析的实数概述，
不是可以直接替换现有整数实现的逐位等价代码。

**“有效抗性”需要先定义，不能直接塞原始数据字段。** 为与SDL乘子对齐，可以采用下面的等价百分比定义
（这是源码推导，不声称截图本身已说明其作者使用了这一具体换算）：

| 路径 | 源码原始口径 | 上式的百分比口径 |
|---|---|---|
| 我方物攻→敌，物抗除数d≠0 | 基础伤害`B/d` | 以`B/2`为基准，`有效物抗=1−2/d` |
| 我方法术→敌，原始元素/毒抗e | 乘数`(10−e)/5` | `有效抗性=(e−5)/5` |
| 敌方法术→我方，角色抗性p | 传`100+p`、倍率20，乘数`(10−(100+p)/20)/5` | `有效抗性=p/100`；受击防御等另算 |
| 战场对应元素字段f | 乘数`(10+f)/10` | `战场增益=f/10` |

百分比写成小数代入，例如50%为0.5。敌元素抗e=0/5/10分别对应上式−100%/0%/100%，
也就是乘数2/1/0；**不是直接用e/10**。原始物抗d=2/4分别对应上式0%/50%；
与前文“d=2使B减半”不矛盾，因为此处先把`B/2`当作基准。
d=0时源码跳过除法，结果同d=1为B，不能代入`1−2/d`；若仅为统一表达，可视为有效物抗−100%，
**不能把原始d=0称为上式的0%物抗**。源见 [fight.c:279](../../reference/sdlpal/fight.c#L279)、
[fight.c:223](../../reference/sdlpal/fight.c#L223)、[敌法术抗性入参](../../reference/sdlpal/fight.c#L4794)。
上述换写忽略了中间取整，不能在代码里先做一次整数`B/2`再乘比例来替代原始`B/d`。

**“加多少属性≈加多少伤害”是条件性近似。**

- 高伤段、有效物抗0（原始d=2）、无暴击/会心、固定其他条件时，物攻基础部分对武术的斜率为`2/2=1`。
  因此有“1武术约增1伤害”的直观说法；末尾随机倍率仍会影响结果。
- 高伤段、有效抗性0、战场增益0时，仙术灵力部分斜率约为`2/4=0.5`，
  因此有“2灵力约增1伤害”的说法；灵力随机修正仍在，固定法术基伤本身不会随人物灵力增长。
- 中段基础伤害斜率只有1，低段为0；跨分段、整数跳变、随机数变化、抗性/场地、暴击/会心或特殊技能
  都会改变实际收益。**不能保证两次独立攻击的伤害差正好等于加点数量**。
- 单体普攻的+1/+2是整数随机，不是连续小数；暴击×3及李逍遥会心×2在加此随机值之后、末尾浮动之前。
  群体普攻和敌方物攻有各自流程，不能照抄这条单体公式。
- 无属性仙术跳过抗性和战场修正；毒系用毒抗但不乘五灵战场增益；玩家受敌方法术还需结算主动防御、护体、
  自动防御等。乘数为0也不等于所有路径最终伤害必为0，须看该路径的最低伤害规则。

本补充只解释已有伤害规则，不修改数据刻度、战斗公式、角色成长区间或实现。

### 投掷武器与铜钱镖：等效灵力与伤害

> **用户真值补充（2026-09-05）**：用户提供五张公式截图，说明投掷武器先换算出“灵力”，再走仙术伤害公式，
> 并与铜钱镖比较。本次另读原始提取脚本/法术表及SDL参考源码核对字段、随机数与适用范围；
> 没有运行原版游戏独立实测。下列区分截图的数学概述、源码边界与当前实现差异。

**1. 投掷武器先计算等效灵力，不直接用人物灵力。**

```text
W = 武器投掷基础伤害参数（0x66 的第二操作数，即零基 op1）
A = 投掷者当前空装武术（永久基础值，不含装备和 Extra 临时加成）
K = 随机整数 0、1、2、3
投掷武器等效灵力 M = W × 5 + A × K
```

源 [script.c:2011-2013](../../reference/sdlpal/script.c#L2011)：直接读取
`PlayerRoles.rgwAttackStrength[当前行动者的角色ID]`，**不是**`PAL_GetPlayerAttackStrength`。
因此A不是人物灵力，也不是装备面板中含加成的武术，更不是角色开局时不可变的初始值。
`K`来自 [RandomLong](../../reference/sdlpal/util.c#L222)，含两端，不能误当0～3的连续小数。
`op0`另指定所模拟的法术对象，不能与W交换。

**2. 再走“灵力随机修正→三段基础伤害→除4→加模拟法术基伤”。**

令`M'`为随机修正后的灵力、`D`为目标用于本次结算的有效防御；截图的数学概述为：

```text
M' = M × 约1～1.1的随机倍率

M' > D              ：灵力基础伤害 B = (M' − 0.8D) × 2
0.6D < M' ≤ D       ：灵力基础伤害 B = M' − 0.6D
M' ≤ 0.6D           ：灵力基础伤害 B = 0

投掷武器仙术伤害 = B ÷ 4 + 所模拟仙术的基础伤害
```

这与上文`PAL_CalcBaseDamage`的三段公式是同一个底座，不是一套新的物理伤害公式。
参考 [fight.c:215-221](../../reference/sdlpal/fight.c#L215)；精确复算还需处理整型步骤：
三段非零分支有`+0.5`后转SHORT，`B/4`为整数除法，灵力变量还有WORD边界。
**截图概述不单独规定各版本的极端溢出行为，不能用一条浮点表达式声称位级等价。**
随机倍率与上一步K是两次不同的抽样；当前TS使用`1 + rng.next() × 0.1`，范围为`[1,1.1)`。

SDL模拟法术路径的敌防御为`max(0, SHORT(敌基础防御) + (敌等级+6)×4)`
（[fight.c:5381](../../reference/sdlpal/fight.c#L5381)），不是直接拿敌表的裸防御。
模拟函数的第三参数虽然叫`wBaseDamage`，实际传入`PAL_CalcMagicDamage`的**灵力参数**，
不能把`W×5+A×K`又额外加到最终伤害上（[fight.c:5389](../../reference/sdlpal/fight.c#L5389)）。
其他模拟法术若有元素属性，仍需接上文的抗性/战场修正；模拟路径下限0、普通攻击仙术下限1也不可混用。

**3. “铜钱镖基伤”是常见特例，“模拟法术基伤”才是通式。**

本地原始提取数据的32条`0x66`分为两组（`items.json`的`scriptOnThrow`→`events/all.json`，
再经`object-magics.json`→`magic.json`）：

| 模拟法术对象 | 条数 | 对应法术行 | 基础伤害 | 代表 |
|---|---:|---:|---:|---|
| 344 铜钱镖 | 29 | magic 53 | 198，无属性 | 木剑166：入口39271，`0x66 [344,0,0]` |
| 360 鞭击 | 3 | magic 28 | 40，无属性 | 长鞭163、九截鞭164、金蛇鞭165 |

三种鞭子的入口/参数分别为39275 `[360,32,0]`、39293 `[360,115,0]`、39303 `[360,255,0]`。
因此不能把所有投掷武器都写成“最后加198”，也不能把武器投掷参数W当成其装备武术加成。

**4. 与铜钱镖比较的正确条件。**

对模拟344的武器，若投掷等效灵力等于普通铜钱镖施法所用的有效灵力，且目标防御/修正条件相同，
两者走同一伤害计算。**固定上述输入后，相同随机抽样可得到相同伤害；独立抽取后续倍率只表示伤害分布相同，不能保证每次数字相等。**
正常非溢出范围内，B非负且198为无属性固定基伤，因此这一比较不受模拟路径0伤下限与普通施法1伤下限的区别影响。
模拟360的鞭子基伤不同，不在此等价结论内。

这里只比较伤害，不比较动作和消耗：`PAL_BattleSimulateMagic`直接播放/结算模拟法术，
**不执行该法术的scriptOnUse**，所以投掷模拟铜钱镖不等于也执行其扣500文脚本。
普通铜钱镖扣钱入口为原始脚本43062；投掷则按投掷流程消耗武器。

**当前实现差异（只记录，尚未修复）**：

一阶段 [battle-opcodes.ts:439-453](../../packages/game/src/core/battle/battle-opcodes.ts#L439)
的0x66注释把SDL取值误写成effective getter，实际也读取已投影、含装备加成的`ctx.playerRoles.roles[roleId].attackStrength`；
这与本节“空装基础武术”及SDL原字段读取不一致。后续应验证“基础武术不变、只换装备”的投掷对照，
不能把当前实现反过来当作原版真值。本次仅补文档，没有修改运行时、迁移器或武器数据。

### 特殊仙术:乾坤一掷(钱换伤害,林月如)

> 2026-07-31 用户提出核对并纠正扣钱上限;源码级确认([script.c:2547-2554](../../reference/sdlpal/script.c#L2547-L2554) 0x88 + [fight.c:174-249](../../reference/sdlpal/fight.c#L174-L249) PAL_CalcMagicDamage + object-magics scriptOnUse 入口)。

乾坤一掷(magic 394,林月如)的**唯一特殊之处**是:它的 `法术.wBaseDamage`(仙术固定威力)不是静态值,而是由当前金钱在 `scriptOnUse` 里**动态设定**。一旦 baseDamage 设好,后续伤害结算走的就是上面通用的 `PAL_CalcMagicDamage`,没有任何特殊公式。

**完整执行链**(scriptOnUse 入口 = `object-magics[394].scriptOnUse` = `@43068`,共 3 条有效命令):

```
@43068  0x1E [-1, 43064]    扣 1 文(占位检查);钱 < 1 则跳 @43064 失败("钱不够,只好作罢")
@43069  0x1E [1, 0]         加回 1 文(补回占位,钱数还原)
@43070  0x88 [394]          设 baseDamage = floor(min(当前钱, 5000) × 2 / 5),并扣 min(当前钱, 5000)
```

前两步是"够不够 1 文"的门槛检查(扣 1 再加回),**没有固定手续费**;真正的扣钱全在 0x88 一步完成。

**0x88 伤害基数公式**(0x88 = `OP_SET_MAGIC_DAMAGE_BY_MONEY`,[script.c:2547-2554](../../reference/sdlpal/script.c#L2547-L2554)):

```c
i = min(dwCash, 5000);                  // 当前钱与 5000 取小
dwCash -= i;                            // 扣掉 i(这就是实际扣钱,上限 5000)
法术.wBaseDamage = floor(i × 2 / 5);    // = i × 0.4
```

- baseDamage 的钱基数范围 **[0, 5000]** → baseDamage **[0, 2000]**(`floor(5000×2/5)=2000`)。
- **扣钱上限就是 5000**(用户 2026-07-31 纠正确认)。

**门槛**:
- 钱数 = 0 → 第一步 0x1E 扣 1 失败 → "钱不够,只好作罢",不放动画、不结算(MP 仍已扣,见 [fight.c:4217](../../reference/sdlpal/fight.c#L4217) `g_fScriptSuccess` gate)。
- 钱数 ≥ 1 → 通过门槛,0x88 扣 `min(钱, 5000)` 并设 baseDamage。

**最终伤害**(0x88 设好 baseDamage 后,走通用 `PAL_CalcMagicDamage`):

```
damage = calcBaseDamage(灵力, 防御) / 4 + baseDamage     // 灵力/4 + 仙术基础伤害
damage ×= (10 - 元素抗性 / 倍率) / 5                      // × (1 - 抗性)
damage ×= (10 + 战场元素加成) / 10                        // × (1 + 战场增强)
```

乾坤一掷的 `wElemental`(元素属性)需查 magic data;若带元素,抗性/战场加成照常生效。

**举例**(忽略灵力部分,只看 baseDamage 与扣钱):

| 当前钱 | 0x88 扣钱 | baseDamage | 说明 |
|---|---|---|---|
| 0 | 失败 | — | "钱不够,只好作罢",不能用 |
| 1 | 1 | 0 | floor(1×2/5)=0,只有灵力部分有伤害 |
| 2500 | 2500 | 1000 | floor(2500×2/5)=1000 |
| 5000 | 5000 | 2000 | 满基数,满 baseDamage |
| 99999 | 5000 | 2000 | min(99999,5000)=5000,扣钱封顶 5000 |

钱数 ≥ 5000 即可打出满 baseDamage(2000),扣钱恰为 5000。

### ts 实现状态

> ✅ **公式核心与攻击编排已完整实现**（2026-07-29 逐行代码审计确认）。

- 公式核心 [formulas.ts](../../packages/game/src/core/battle/formulas.ts):`calcBaseDamage` / `calcPhysicalAttackDamage` / `calcMagicDamage` 均 **1:1 ported**(PAL_CLASSIC);法术伤害编排 [magic-damage.ts](../../packages/game/src/core/battle/magic-damage.ts) 已接。
- 物理攻击编排 [attack.ts](../../packages/game/src/core/battle/actions/attack.ts) **已完整实现**:
  - `+RandomLong(1,2)` jitter ✅（:93）、`RandomFloat(1,1.125)` 浮动 ✅（:103）、暴击 ×3 ✅（:95-96）、李逍遥 ×2 ✅（:99-102）、双重攻击 ✅、群体普攻递减 ✅（:190-199）。
  - 玩家攻击力 `(等级+6)×6` bug **已修复**——玩家 str = `role.attackStrength` 不含等级项;等级项只用于敌人 str（:136）。2026-06-02 审计修正。
  - 敌人打玩家:`def×2`(主动防御)✓（:386）、res=2 ✓、**自动防御** ✅（:324,7/17 概率）、**援护** ✅（:331-351,coverBy 查找+免疫）、**护体 /2** ✅（:393-395）。
- **乾坤一掷**(钱换伤害)✅ 已实现:`0x88 OP_SET_MAGIC_DAMAGE_BY_MONEY`([battle-opcodes.ts:732-744](../../packages/game/src/core/battle/battle-opcodes.ts#L732-L744))按 `min(dwCash,5000)×2/5` 设 baseDamage 并扣钱;`scriptOnUse` 失败 gate(钱 <500 不结算)见 [magic.ts:258](../../packages/game/src/core/battle/actions/magic.ts#L258);reforge 战内 `moneyDelta` 追踪扣钱、战后并入 `world.money`([battle-core.ts:217-219](../../packages/reforge/src/battle/battle-core.ts#L217-L219))。全链测试 `乾坤一掷:scriptOnUse 0x88 set baseDamage by cash → E1 全体伤害`见 [magic-inline-damage.test.ts:596](../../packages/game/src/core/battle/__tests__/magic-inline-damage.test.ts#L596)。

---

## 暴击 与 李逍遥会心一击

你的判断对:这是**两套独立机制**,各自掷骰、可叠加。均见玩家单体普攻 [fight.c:3639-3656](../../reference/sdlpal/fight.c#L3639-L3656)。

| | 暴击(Critical) | 会心一击(李逍遥专属 Bonus Hit) |
|---|---|---|
| 触发 | `RandomLong(0,5)==0`(1/6)**或** `kStatusBravery`(狂怒)> 0 | `wPlayerRole == 0`(**仅李逍遥**)**且** `RandomLong(0,11)==0`(1/12) |
| 倍率 | 伤害 **×3** | 伤害 **×2** |
| 源行 | [fight.c:3639-3647](../../reference/sdlpal/fight.c#L3639-L3647) | [fight.c:3649-3656](../../reference/sdlpal/fight.c#L3649-L3656) |

- 两者独立判定、**可叠加**:李逍遥同时触发 → ×3 再 ×2 = **×6**;两者都置 `fCritical=TRUE`(都播暴击动画 / 音效)。
- **狂怒状态**(`kStatusBravery`,"more power for physical attacks" [global.h:51](../../reference/sdlpal/global.h#L51))= 物理攻击**必定暴击**(直接满足暴击条件,×3)。
- 群体普攻的暴击是**整轮一次性**判定(`RandomLong(0,5)==0` 或狂怒),命中则全体 ×3;**群体普攻没有李逍遥会心 ×2**([fight.c:3687-3717](../../reference/sdlpal/fight.c#L3687-L3717))。

ts 实现状态:**已完整实现**（attack.ts:95-102）。暴击 1/6 ×3 ✅、李逍遥 1/12 ×2 ✅、狂怒必暴击 ✅、群体普攻整轮一次暴击但无李逍遥 ×2 ✅。

---

## 防御机制:主动防御 / 自动防御 / 援护 / 护体

四个常被混为一谈的减伤 / 免伤机制,实际完全不同。

### 主动防御 vs 自动防御

| | 主动防御(`fDefending`) | 自动防御(`fAutoDefend`) |
|---|---|---|
| 来源 | 玩家选「防御」指令([fight.c:4115](../../reference/sdlpal/fight.c#L4115)) | 系统每次被敌人物理攻击时随机判([fight.c:4938](../../reference/sdlpal/fight.c#L4938)) |
| 概率 | 玩家主动,100% 进入 | `RandomLong(0,16) >= 10` = **7/17 ≈ 41%**(掷 0~16 命中 10~16 共 7 个值) |
| 持续 | 整个回合(到下次轮到自己,回合末清 FALSE) | 仅当次这一下 |
| 物理效果 | **防御 ×2**([fight.c:4926-4929](../../reference/sdlpal/fight.c#L4926-L4929))→ 走 CalcBaseDamage 非线性减伤 | 触发即**该次 0 伤**(完全格挡,跳过整个伤害块) |
| 法术效果 | 法术伤害 **/2**(除数含 `fDefending?2:1`) | 另有"法术自动防御"`RandomLong(0,2)==0`(1/3),给除数 +1([fight.c:4746-4757](../../reference/sdlpal/fight.c#L4746-L4757)) |
| 隐藏经验 | 累计防御隐藏经验 +2([fight.c:4116](../../reference/sdlpal/fight.c#L4116)) | 无 |
| 姿势 | 保持防御 frame=3([fight.c:977-979](../../reference/sdlpal/fight.c#L977-L979)) | — |

一句话:**主动防御 = 玩家选的、整回合、减半伤;自动防御 = 系统随机、单次、完全免伤。**

**自动防御被状态压制**:被攻击者处于**混乱 / 睡眠 / 麻痹**且无人援护 → `fAutoDefend` 强制 FALSE([fight.c:4975-4985](../../reference/sdlpal/fight.c#L4975-L4985))——失去行动力的角色不能自己格挡,只能靠援护。

### 援护(Cover)

源 [fight.c:4943-4969, 5012-5098](../../reference/sdlpal/fight.c#L4943-L4969)。

- **触发条件(全满足)**:① 被攻击者**虚弱**(濒死 `PAL_IsPlayerDying` / 混乱 / 睡眠 / 麻痹);② 当次 `fAutoDefend` 判定成功(~41%);③ 该角色有指定援护者且援护者在队、自己不虚弱。
- **谁援护谁是数据写死的**:每角色 `rgwCoveredBy` 字段记录"谁来护我"([global.h:323](../../reference/sdlpal/global.h#L323) "who will cover me when I am low of HP or not sane")。按原版剧情:**李逍遥可援护其他角色,但只有林月如能援护李逍遥**——即 `rgwCoveredBy[李逍遥] = 林月如`,其余角色援护者多为李逍遥。这是逐角色数据,非硬编码。
- **效果**:触发即该次攻击**完全免伤**(援护本质成立于 `fAutoDefend=TRUE`)。援护者跳到身前播挡身动画([fight.c:5090-5098](../../reference/sdlpal/fight.c#L5090-L5098)),**但伤害并不转移给援护者**——`rgwHP` 减的永远是被攻击者本人,只是因 fAutoDefend 而没真正落伤。
- **援护的真正作用**:虚弱(混乱 / 睡眠 / 麻痹)角色本被强制 `fAutoDefend=FALSE`(必吃伤害),有援护者时此强制不生效 → 把"自动免伤"的机会**还给**失去行动力的队友。

### 护体(`kStatusProtect`,金刚咒)

- 一个**多回合状态**(`rgPlayerStatus[role][kStatusProtect] = 回合数`,[global.h:52](../../reference/sdlpal/global.h#L52) "more defense value")。金刚咒等仙术施加它。
- **效果:受到的物理与法术伤害都减半。**
  - 物理:`sDamage /= 2`([fight.c:5059-5062](../../reference/sdlpal/fight.c#L5059-L5062))
  - 法术:除数含 `(护体?2:1)`([fight.c:4802, 4837](../../reference/sdlpal/fight.c#L4802))
- 属 "good status":再次施加取**较长持续回合**(不刷成更短),仅活人可得([global.c:2257-2269](../../reference/sdlpal/global.c#L2257-L2269))。
- **与主动防御叠加**:护体(最终伤害 /2)与主动防御(防御 ×2)对物理**同时生效**;法术则除数 `(主动防御?2:1)×(护体?2:1)` 连乘。

ts 实现状态:**全部已实现**（2026-07-29 逐行代码审计确认）。主动防御 def×2 ✅（attack.ts:386）、自动防御 7/17 概率 ✅（:324）、援护 coverBy ✅（:331-351,完整免疫+coverSound）、护体 /2 ✅（:393-395）。

---

## 队友阵亡:援护者的台词与增益

### TL;DR

战斗中有队员**当场阵亡**的瞬间,游戏找这名死者的**援护者(`coveredBy`,即[防御机制](#防御机制主动防御--自动防御--援护--护体)里"援护 / 护法"那套关系字段)**:若援护者还活着、且没被睡 / 定身 / 疯魔,就**喊一句台词 + 给自己一个只在本场战斗有效的临时增益**。全队只有 **李逍遥** 和 **林月如** 配了这套脚本(`scriptOnFriendDeath`),所以通常是这俩谁援护、谁开口。

### 触发([fight.c:775-819](../../reference/sdlpal/fight.c#L775-L819))

```c
for (每个队员 i):
   w = rgParty[i].wPlayerRole;
   if (rgwHP[w] < 本回合前HP[i] && rgwHP[w] == 0):   // i 这一刻刚死
      w = rgwCoveredBy[w];                            // ← 改指「死者的援护者」
      if (援护者 w 在队 && HP>0 && 无睡/定身/疯魔):
         跑 w 的 OBJECT_PLAYER.scriptOnFriendDeath    // 台词 + 增益,都给 w 自己
```

- **反应的是死者的 `coveredBy` 援护者,不是"全体幸存者"。** `coveredBy` 是和"低血援护 / 护法"共用的同一字段。
- 增益加在**援护者本人**身上(脚本里 `0x30` 的 operand[2]=0 → 作用于 `wEventObjectID` = 跑脚本的人)。
- 自动战斗(`fAutoBattle`)下不触发。

### 四种结局(三道概率门顺序掷,opcode `0x06`)

脚本开头三条 `0x06`(掷 `RandomLong(1,100)`,**≥ 阈值就跳到对应结局**,否则继续往下;[script.c:3575-3591](../../reference/sdlpal/script.c#L3575-L3591)),把四种结局按 ~26% / ~26% / ~24% / ~24% 切开:

| 掷点路径 | 概率 | 李逍遥(obj0 @43445) | 林月如(obj2 @43474) |
|---|--:|---|---|
| 门1 `r₁≥75` | 26% | "可恶的家伙！" → **真气回满 + 灵力 +10%** | "可恶～我替你报仇！" → **体力回满 + 武术 +5%** |
| 门2 `r₂≥66` | ~26% | "可恶～！" → **武术 +25% + 灵力 +25%** | "你真没用～看我的！" → **真气回满 + 灵力 +9%** |
| 门3 `r₃≥50` | ~24% | "啊..糟了～！" → **身法 +90% + 吉运 +90%** | "哇～怎么办！" → **身法 +50% + 吉运 +90%** |
| 全不跳(兜底) | ~24% | "啊～！" → **体力回满 + 武术 +5%** | "可恶～看招！" → **武术 +25% + 灵力 +25%** |

> 两人**四档增益的"类型"一样**(回血+武术5% / 回蓝+灵力~10% / 武术+灵力25% / 身法+吉运~90%),但**台词、概率分配、数值各有出入**:李逍遥灵力 +10% / 身法 +90%,林月如灵力 +9% / 身法 +50%。

### 增益怎么算(`0x30` / `0x1B` / `0x1C`)

- **`0x30` 临时按百分比加属性**([script.c:1406-1428](../../reference/sdlpal/script.c#L1406-L1428)):`Extra槽[属性] = 基础值 × operand[1] / 100`,写进 `rgEquipmentEffect[kBodyPartExtra]` 临时装备效果槽——所以 `operand[1]=25` = **当前战斗内 +25%**(战后该临时槽清空、不持久)。属性索引(PLAYERROLES SoA 行号):**17=武术、18=灵力、20=身法、21=吉运**(19=防御没用到)。
- **`0x1B` 回体力 / `0x1C` 回真气**([script.c:867](../../reference/sdlpal/script.c#L867) / [896](../../reference/sdlpal/script.c#L896)):operand[1]=9999 → 经 `PAL_IncreaseHPMP` clamp 到上限 = **回满**。

### 相关但不同:`scriptOnDying`(自己濒死的纯对白)

赵灵儿(obj1)配的是 **`scriptOnDying`**(@43374,自己 HP 掉到濒死时触发),**只有四段剧情对白("我支持不住了…"等)、没有任何增益**。林月如(obj2)也另有一份 `scriptOnDying`(@43400)。别和 `scriptOnFriendDeath`(队友死、给增益)混为一谈。

| 角色 | `scriptOnFriendDeath`(队友死 → 增益) | `scriptOnDying`(自己濒死 → 对白) |
|---|:--:|:--:|
| 李逍遥 | ✅ 43445 | — |
| 赵灵儿 | — | ✅ 43374 |
| 林月如 | ✅ 43474 | ✅ 43400 |
| 巫后 / 阿奴 / 盖罗娇 | — | — |

> 真值出处:角色脚本入口 `data/extracted/data/object-players.json`;脚本体 `all.json` `commands[43445..]`(李逍遥)/ `[43474..]`(林月如)。

ts 实现状态:**已实现**。`runPlayerCasualtyScript` 等([battle-system.ts:972-1019](../../packages/game/src/core/battle/battle-system.ts#L972-L1019))在队员死亡时取死者 `coveredBy` 援护者跑 `scriptOnFriendDeath`、濒死跑 `scriptOnDying`;`0x30` 临时百分比 buff([battle-opcodes.ts:304](../../packages/game/src/core/battle/battle-opcodes.ts#L304))与 `0x1B/0x1C` 回血回蓝均已对源实现。

---

## 群体普攻伤害递减

你的观察对:玩家选普攻但**不指定单一目标**(攻击全体)时,伤害逐个递减。源 [fight.c:3676-3748](../../reference/sdlpal/fight.c#L3676-L3748)。

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

ts 实现状态:**已实现**（attack.ts:155-246 attackAll 分支）。division 倍增递减 ✅（:190-199）、HIT_ORDER [2,1,0,4,3] ✅（:159）、群体无 +R(1,2)/李逍遥×2/RandomFloat ✅、暴击整轮一次在 /division 前应用 ✅（:189）、dualAttack 两次扫描 division 各自重置 ✅。

---

## 战后 HP / MP 恢复

源 `PAL_BattleWon` 尾部 [battle.c:1342-1372](../../reference/sdlpal/battle.c#L1342-L1372)。**只在战斗胜利后**对每个队员执行(逃跑成功 / 战败不恢复)。

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
- 升级另有补满:升级会把 HP/MP 直接补满([battle.c:1115-1116, 1289-1292](../../reference/sdlpal/battle.c#L1115-L1116))。

ts 实现状态:**已实现**(2026-06-26 核实,旧注"未实现"已过时)。`finishBattleWon`([battle-system.ts:3209-3218](../../packages/game/src/core/battle/battle-system.ts#L3209-L3218))在结算演出 + Phase E 脚本之后执行 `HP += ⌊(maxHP-HP)/2⌋`、`MP += ⌊(maxMP-MP)/2⌋`(PAL_CLASSIC 分支)。**只在胜利路径调用**——逃跑成功 / 战败走别的收尾,不调 `finishBattleWon` → 不恢复,与原版"逃跑不回血"一致。

---

## 五灵 / 毒 抗性与五行机制

仙术分**无属性**和**带属性**两类。带属性的走"五灵"(5 系元素)或"毒",受目标对应抗性影响。回顾法术公式 [fight.c:223-247](../../reference/sdlpal/fight.c#L223-L247) 的元素段:

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
- 五灵的数据槽顺序(项目 / sdlpal 约定,见 [formulas.ts:131-152](../../packages/game/src/core/battle/formulas.ts#L131-L152)):`index 1=风 / 2=雷 / 3=水 / 4=火 / 5=土`。具体中文显示标签在 `WORD.DAT`,此处只列数据顺序,不当作权威译名。
- 抗性数据:敌人 `wElemResistance[5]` + `wPoisonResistance`([global.h:286-287](../../reference/sdlpal/global.h#L286-L287));玩家 `rgwElementalResistance[5][role]` + `rgwPoisonResistance`([global.h:319](../../reference/sdlpal/global.h#L319)),均 base + 装备。

### 关键:玩家与敌人抗性是两套不同刻度

抗性缩放公式 `factor = 10 - 抗性 / 倍率`,而**倍率(`wResistanceMultiplier`)在两条路径不同**:

| 路径 | 倍率 | 传入抗性 | 等效 factor | 刻度 |
|---|---|---|---|---|
| 玩家施法打敌人 | **1**([fight.c:4016](../../reference/sdlpal/fight.c#L4016)) | 敌人 `wElemResistance`(原值) | `10 - 敌抗` | **敌人原始抗性 0–10 制**:计入后续÷5后，0→×2、5→×1、10→×0；>10产生负乘数，最终最低伤害按调用路径处理 |
| 敌人施法打玩家 | **20**([fight.c:4799](../../reference/sdlpal/fight.c#L4799)) | `100 + 玩家抗性` | `5 - 玩家抗/20` | **玩家抗性 0–100 制**:每点 ≈ -1% 元素伤,100=免疫 |

- 玩家元素抗 / 毒抗都**上限 100**([global.c:1928-1931, 1969-1972](../../reference/sdlpal/global.c#L1928-L1931)),即玩家最多把某系仙术的元素部分削到 0。
- 抗性只缩放**元素部分**;`法术.wBaseDamage`(固定威力)在元素乘法**之前**已加入,会一起被 `×factor/5` 缩放,但不吃目标普通防御。
- 毒系仙术(elem > 5)走同一公式,用毒抗替元素抗。另外毒抗还 gate 敌人"附带毒"效果:`PAL_GetPlayerPoisonResistance < RandomLong(1,100)` 才中毒([fight.c:5141](../../reference/sdlpal/fight.c#L5141))。**中毒后的持续伤害 / 毒等级 / 七大毒 / 解毒,以及"下毒命中看巫抗不看毒抗"的区分,见 [毒系统](#毒系统等级--每回合伤害--七大毒--相生相克)。**

ts 实现状态:`calcMagicDamage` 的元素 / 毒缩放 + 战场加成已在 [formulas.ts:124-156](../../packages/game/src/core/battle/formulas.ts#L124-L156) **1:1 ported**(倍率由调用方传)。玩家被敌人仙术击中的 `100+抗性 / mult=20` 路径取决于敌→玩家施法编排是否接入(当前战斗主走玩家→敌人)。

---

## 战斗场景对五灵仙术的影响

你的判断对:同一仙术在不同战斗场地伤害不同。源 [fight.c:242-246](../../reference/sdlpal/fight.c#L242-L246) + `BATTLEFIELD` 结构 [global.h:377-381](../../reference/sdlpal/global.h#L377-L381)。

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
- 当前场地号 `wNumBattleField`([global.h:536](../../reference/sdlpal/global.h#L536)):随场景设定,也可被脚本 opcode 改写(`wNumBattleField = operand[0]`,[script.c:1723](../../reference/sdlpal/script.c#L1723)),并存入存档([global.c:609](../../reference/sdlpal/global.c#L609))。同一 `wNumBattleField` 还决定画面波动 `wScreenWave`([battle.c:1563](../../reference/sdlpal/battle.c#L1563))。

ts 实现状态:`calcMagicDamage` 已接受 `fieldEffect` 5 系参数并 1:1 应用 `×(10+effect)/10`([formulas.ts:145-155](../../packages/game/src/core/battle/formulas.ts#L145-L155));`wNumBattleField` → `rgsMagicEffect` 的数据装填取决于战场数据提取是否接入。

---

## 合击仙术

全队合力放一个大招;威力随**参战成员的攻击力 + 灵力总和**成长。源 `kBattleActionCoopMagic` [fight.c:3856-4045](../../reference/sdlpal/fight.c#L3856-L4045)。

### 触发条件(PAL_CLASSIC)

可用判定 `PAL_BattleUIIsActionValid(kBattleUIActionCoopMagic)` [uibattle.c:308-337](../../reference/sdlpal/uibattle.c#L308-L337):

- 队伍 **≥ 2 人**(`wMaxPartyMemberIndex == 0` → 不可);
- 发起者本人 **healthy**,且全队 **healthy 成员 > 1**(至少 2 名)。
- `PAL_IsPlayerHealthy` [fight.c:52-74](../../reference/sdlpal/fight.c#L52-L74) = 非濒死 **且** 无 睡眠 / 混乱 / 沉默 / 麻痹 / 傀儡 状态。
- 执行时再核一次:逐人 `coopContributors[i] = PAL_IsPlayerHealthy`,若健康者 ≤ 1 → **自动降级为普攻**([fight.c:3364-3378](../../reference/sdlpal/fight.c#L3364-L3378))。

### 威力公式

[fight.c:3982-3995](../../reference/sdlpal/fight.c#L3982-L3995):

```c
str = 0;
for (每个 coopContributor)            // 仅 healthy 成员计入
   str += 攻击力(role) + 灵力(role);   // PAL_GetPlayerAttackStrength + PAL_GetPlayerMagicStrength
str /= 4;
// 然后 str 作为 magStr 喂法术公式:
sDamage = PAL_CalcMagicDamage(str, 敌防, 敌元素抗, 敌毒抗, mult=1, 合击仙术);
```

- 即**合击威力 = (全部健康参战成员的 攻击力 + 灵力 之和) ÷ 4**,再走标准法术伤害公式(含元素 / 毒抗 / 战场加成)。健康成员越多、攻 / 灵越高 → 合击越强。
- 放哪个合击仙术:由发起者的 `PAL_GetPlayerCooperativeMagic(role)` 决定 = 角色 `rgwCooperativeMagic[role]`,装备可覆盖([global.c:2013-2045](../../reference/sdlpal/global.c#L2013-L2045))。
- 可单体或 `kMagicFlagApplyToAll` 全体。

### 回合代价

合击回合 `fThisTurnCoop = TRUE`([fight.c:3858](../../reference/sdlpal/fight.c#L3858))→ 该回合所有参与成员的**普攻 / 防御 / 逃跑 / 单独施法全部被跳过**(各 action case 开头 `if(g_Battle.fThisTurnCoop) break;`,见 [fight.c:3620, 4112, 4121, 4176, 4334](../../reference/sdlpal/fight.c#L3620))。整队这一回合只做这一次合击。

ts 实现状态:**已实现**。`performCoopMagic` 会筛选 healthy 参与者、扣除 HP 代价、计算伤害并生成聚拢 / 施法 / 法术特效 / 归位动画;回合队列也会跳过同轮其他参与者动作。若执行前只剩一名 healthy 队员,会按原版退化成普通攻击并保留普攻动画。

---

## 身法与出手顺序

**出手顺序 = 按"有效身法"降序排队,每回合重排**;身法越高越先动。源 `PAL_BattleStartFrame` 的 PAL_CLASSIC 分支 [fight.c:1495-1585](../../reference/sdlpal/fight.c#L1495-L1585)。

有效身法分三层算:

### 1. 基础身法

- 玩家 `PAL_GetPlayerActualDexterity` [fight.c:336-389](../../reference/sdlpal/fight.c#L336-L389):身法属性 + 装备(`PAL_GetPlayerDexterity`)→ 若 **加速(haste)×3** → **上限 999**。
- 敌人 `PAL_GetEnemyDexterity` [fight.c:289-332](../../reference/sdlpal/fight.c#L289-L332):`(敌等级+6)×3 + (SHORT)敌身法`。

### 2. 动作身法修正(玩家本回合所选动作)

源 [fight.c:1529-1556](../../reference/sdlpal/fight.c#L1529-L1556) —— **你这回合选什么动作,会放大或缩小本回合的有效身法**:

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

- **濒死**(`PAL_IsPlayerDying`)→ 再 **÷2**([fight.c:1558-1561](../../reference/sdlpal/fight.c#L1558-L1561))。
- 最后 × `RandomFloat(0.9, 1.1)` 随机抖动([fight.c:1563](../../reference/sdlpal/fight.c#L1563);敌人也各摇一次 [fight.c:1474](../../reference/sdlpal/fight.c#L1474))。
- 死亡 / 睡眠 / 麻痹的玩家 → 身法 = 0(排最后,若回合内被救活则自动普攻)([fight.c:1505-1516](../../reference/sdlpal/fight.c#L1505-L1516));混乱 → 强制普攻([fight.c:1522-1527](../../reference/sdlpal/fight.c#L1522-L1527))。

要点(身法如何影响出手):

- 排序按"基础身法 × 动作系数 × (濒死?÷2) × 随机0.9~1.1"降序([fight.c:1571-1585](../../reference/sdlpal/fight.c#L1571-L1585) 选择排序)。
- **动作选择能逆转先手**:慢角色选防御(×5)或合击(×10)也能抢到先手;逃跑(÷2)必拖后。攻击仙术不加速,辅助 / 治疗仙术(不可对敌的)反而 ×3 先放。
- 随机 0.9~1.1 给同身法单位加抖动,顺序不完全固定。敌人 dualMove(双动)在队列出现两次(第二条 `fIsSecond`,排后)。

ts 实现状态:**已完整实现**（2026-07-29 逐行代码审计确认）。`getPlayerActualDexterity`(haste×3 + 999 上限)+ `getEnemyDexterity` 1:1 ported ✅;`buildActionQueue` 降序 + dualMove 双入列 ✅;**动作身法系数** ✅（battle-system.ts:700-722 `actionDexMultiplier`: coop×10/defend×5/辅助magic×3/item×3/flee×0.5,引用 fight.c:1529-1556）;**濒死 ÷2** ✅（:856,HP < min(100, maxHp/5)）;**RandomFloat(0.9,1.1) 抖动** ✅（:813,对敌我 dex 均应用）;玩家 baseDex **不含**等级项 ✅（:845-849,2026-06-02 审计修正旧 M3 `(level+6)*4` bug）。

---

## 吉运(只影响逃跑成功率)

你的判断对:吉运(`rgwFleeRate`,字段注释直译 "chance of successful fleeing" [global.h:317](../../reference/sdlpal/global.h#L317))**唯一的战斗作用就是逃跑成功率**——不碰伤害 / 暴击 / 命中 / 防御 / 出手顺序。穷尽 grep `rgwFleeRate` / `PAL_GetPlayerFleeRate` 全部用点,只有:① 逃跑判定([fight.c:4124](../../reference/sdlpal/fight.c#L4124));② 升级界面显示([battle.c:1209](../../reference/sdlpal/battle.c#L1209));③ 隐藏经验成长([battle.c:1282](../../reference/sdlpal/battle.c#L1282));④ getter([global.c:1868-1893](../../reference/sdlpal/global.c#L1868-L1893));⑤ 道具 / 状态加成([global.c:2390](../../reference/sdlpal/global.c#L2390))。**没有任何其它机制读它。**

> 名字叫"吉运 / 运"带运气色彩,但机制上**不影响掉落 / 暴击 / 命中** —— 只是逃跑率。

### 逃跑成功公式

源 [fight.c:4119-4148](../../reference/sdlpal/fight.c#L4119-L4148):

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
- **逃跑失败 → 吉运隐藏经验 +2**([fight.c:4170](../../reference/sdlpal/fight.c#L4170))——呼应 [隐藏属性经验](#隐藏属性经验--等级系统):逃不掉反而练高吉运,下次更易逃。

### `fIsBoss` 是「逐场战斗标志」,不是「看起来像不像 boss」

逃跑公式末尾那道 `&& !fIsBoss` 才是真正的"能不能逃"总闸。关键:**`fIsBoss` 是每场战斗触发时单独设的布尔,跟敌人是否独一无二 / 血厚 / 剧情强敌无关**。

- 触发战斗的脚本 opcode `0x0007`(start battle)调 `PAL_StartBattle(operand[0], !operand[2])`([script.c:3314-3333](../../reference/sdlpal/script.c#L3314-L3333))——即 `fIsBoss = !operand[2]`。
- `operand[2]` **身兼二职**:既是"可逃标志",又是"逃跑成功后跳转的脚本地址"。所以 `operand[2] != 0` ⇔ `fIsBoss = FALSE` ⇔ **可逃**(逃了就跳去 operand[2] 那段善后脚本);`operand[2] == 0` ⇔ boss 战、逃不掉。
- 脚本驱动的逃跑 opcode `0x003A` 走同一道闸([script.c:1588-1603](../../reference/sdlpal/script.c#L1588-L1603)):`fIsBoss` 时直接跳"逃不掉",否则才 `PAL_BattlePlayerEscape()`。

**实例:锁妖塔「七星磐龙柱」七神龙——长着 boss 的样子,却能逃。** 锁妖塔底层七星磐龙柱召出的七条神龙(毒 / 金 / 土 / 火 / 冰 / 风 / 雷神龙,enemy id 141–147 / 敌队 305–311)在玩家眼里是七场独一无二的 boss,但它们的 `0x0007` 触发操作数全是 `[队号, 41075, 41073]`——`operand[2] = 41073 ≠ 0` → `fIsBoss = FALSE` → **能逃**(逃跑旁白跳 41073)。真值出处:`data/extracted/events/all.json` `commands[24784..24802]`(紧邻前一行旁白 `commands[24781]` = "七星磐龙柱")。

> 教训:别拿"是不是 boss 怪 / 剧情强敌"反推能否逃跑——唯一真值是该场 `0x0007` 触发的 `operand[2]`。反过来,普通杂兵若某场被 `operand[2]=0` 触发,照样逃不掉。

### ⚠️ 原始 bug:逃跑抵抗错用敌人身法,而非敌人吉运

逃跑公式里敌方那一项 `def += (SHORT)敌.wDexterity` 用的是敌人**身法**,但这几乎可以确定**本该是敌人吉运**。source 层证据:

- 敌人 `ENEMY` 结构**有独立的吉运字段** `wFleeRate`(注释 "chance for successful fleeing"),就紧挨在身法 `wDexterity` 后面([global.h:283-284](../../reference/sdlpal/global.h#L283-L284))——和玩家 `rgwFleeRate` 一一对应。
- 但 **`e.wFleeRate` 在整个引擎 `.c` 里从未被读过**(穷尽 grep `.wFleeRate` 零命中):敌人吉运从数据加载、存进内存,却**没有任何代码消费它**,是死字段。
- 而逃跑抵抗公式 [fight.c:4134](../../reference/sdlpal/fight.c#L4134) 取的是 `e.wDexterity`(身法)。身法本身另有正经用途(出手顺序 + 被各种敌人特例改写,[battle.c:1624-1666](../../reference/sdlpal/battle.c#L1624-L1666))。

→ 合理推断:玩家逃跑判定本应是"**我方吉运 vs 敌方吉运**",却误写成对敌方**身法**求和,导致敌人吉运字段彻底闲置。**后果**:逃跑难度由敌人身法(而非设计者填的吉运值)决定——高身法敌人异常难逃,而数据里精心设的敌人吉运形同虚设。

> 注:sdlpal 以忠实原版为目标,此行为很可能**原样复刻自 1995 DOS 原版**(即 bug 出在原作而非 sdlpal)。仅凭 sdlpal source 无法 100% 区分两者,但"敌人 `wFleeRate` 死字段 + 公式用 `wDexterity`"的事实是确凿的。**type-pal 若要 1:1 忠实,应照搬此行为(用敌人身法),并在注释标明这是原版 bug**,不要"顺手修对"。

ts 实现状态(2026-06-13 更新):`actions/flee.ts` 已实现 —— 公式结构 1:1(含 `(SHORT)` cast / 死敌跳过 / boss 必失败恒消费 RNG)、失败累计吉运经验 +2、成功 16 步滑出动画。敌方抵抗项**采用修复版:用敌人吉运 `be.e.fleeRate`**(有意偏离原版,user 2026-06-13 拍板)——让数据里的敌人吉运死字段活过来,身法回归出手顺序正职;要还原原版 bug 行为,源码处换回 `be.e.dexterity` 一行即可(注释已标注)。

---

## 特殊技能成功率(秒杀 / 偷取 / 上状态)

像**夺魂、灵葫咒、回梦、鬼降、飞龙探云手**这类"特殊效果"仙术,效果(秒杀 / 偷东西 / 让敌人睡着昏迷)本身是写死的,真正决定"放出去到底成不成"的是技能脚本里的几道**关卡**。这些关卡只看 **技能自带的固定数值 + 敌人的法术抗性 + 有时还看敌人剩多少血**——

> **跟施法者的属性(吉运、灵力、等级)一点关系都没有。** 你练再高的吉运 / 灵力,也不会让夺魂更容易秒、飞龙探云手更容易偷。吉运只管逃跑(见上一节)。

### 四道"关卡"分别是什么

1. **固定概率关**:掷一个 1~100 的骰子,点数**小于技能设定值 N** 才过关,否则这次就失败。等于"约 (N-1)% 的成功率",N 是技能脚本里写死的,跟谁放、放给谁都无关。
2. **法术抗性关**(凡是"给敌人上状态"都有这道):掷一个 0~9 的骰子,点数**大于这个敌人的法术抗性**才上得中。所以**敌人法术抗性越高越难上**;抗性满(9)的敌人直接免疫,怎么放都上不了。这道关只看**敌人**的抗性,不看施法者。
3. **血量关**(只有灵葫咒有):敌人当前血量**高于满血的某个百分比就直接失败**。所以灵葫咒只能收掉**残血**的敌人,满血怪一点用没有。
4. **灵葫值关**(只有灵葫咒有):敌人**身上的灵葫值(`wCollectValue`)为 0 就直接失败**——灵葫咒本质是"把敌人收进葫芦",身上没"葫芦值"可收的敌人(多数普通杂兵 = 0)再残血也收不掉。过关时把这份灵葫值并入全局[灵葫值](#紫金葫芦炼丹灵葫值炼随机丹药)。这道关只看**敌人**有没有灵葫值,不看施法者。

> 注:这些技能脚本开头都有一道"现在是不是敌人在行动"的岔路——**玩家放(打敌人)**走一条分支,**敌人放(打我方)**走另一条。下面说的都是**玩家放出去打敌人**时的成功率。

### 逐个技能(玩家施放,数值为原版真值)

| 技能 | 效果 | 成功条件(全部满足才成) | 备注 |
|---|---|---|---|
| **飞龙探云手** | 偷敌人的钱 / 物 | 掷 0~10 ≤ **6** → 约 **64%**(7/11) | 偷到的量 = 敌身上的钱物 ÷ 掷(2 或 3),所以一次偷一部分 |
| **夺魂** | 直接秒杀敌人 | 过敌人**法术抗性** + 掷<**33**(约 **32%**) | 对任意血量都能秒,但要先过法抗这关 |
| **灵葫咒** | 秒杀 + 攒灵葫值 | 敌血 **≤ 满血 25%** + 掷<**60**(约 **59%**) + 敌**灵葫值 ≠ 0** | 三关全过才秒,**且全程不看法术抗性**;灵葫值=0 的敌人(多数杂兵)再残血也收不掉。秒掉时把敌灵葫值并入全局,供[紫金葫芦炼丹](#紫金葫芦炼丹灵葫值炼随机丹药)。脚本顺序见下方速查 |
| **回梦** | 让敌人睡着 4 回合 | 掷<**60**(约 **59%**) + 过敌**法术抗性** | 睡着的敌人整回合不动 |
| **鬼降** | 让敌人陷入混乱 4 回合 | 掷<**44**(约 **43%**) + 过敌**法术抗性** | 混乱的敌人会乱打,可能打自己人 |

### 一句话总结

- **偷 / 秒 / 控** 的成功率 = 技能写死的固定概率 ×(上状态时再叠一道敌人法术抗性)×(灵葫咒还要敌人残血)。
- **施法者属性(吉运 / 灵力 / 等级)对这些成功率毫无影响。**
- 想更稳地控住 / 秒掉敌人,只能靠**挑法术抗性低的敌人**、或(灵葫咒)**先把敌人打残**。

### 源出处速查

- 偷取实际判定 `RandomLong(0,10) <= wStealRate`:[fight.c:5254](../../reference/sdlpal/fight.c#L5254);触发 opcode `0x6A`:[script.c:2046](../../reference/sdlpal/script.c#L2046)
- 固定概率关 `0x06`(掷 1~100 ≥ N 则失败跳走):[script.c:3575-3591](../../reference/sdlpal/script.c#L3575-L3591)
- 法术抗性关 `0x2E`(掷 0~9 > 敌法抗才上状态,CLASSIC):[script.c:1377-1397](../../reference/sdlpal/script.c#L1377-L1397)
- 血量关 `0x64`(敌血 > 满血 N% 则跳走):[script.c:1983-1995](../../reference/sdlpal/script.c#L1983-L1995)
- 秒杀 `0x60` 敌 / `0x5F` 玩家(本身无条件,靠前面的关卡门着):[script.c:1942-1955](../../reference/sdlpal/script.c#L1942-L1955)
- 灵葫值关 + 收值 `0x33`(敌 `wCollectValue == 0` → 跳走 = **失败**;否则把它并入全局 `wCollectValue`):[script.c:1437-1450](../../reference/sdlpal/script.c#L1437-L1450)
- 灵葫咒成功脚本逐步(`all.json` `commands[43113..43117]`):血量关 `0x64[25]` → 概率关 `0x06[60]` → 灵葫值关 `0x33` → 秒杀 `0x60`。**注意秒杀在灵葫值关之后**——灵葫值=0 时在 `0x33` 就跳走,根本到不了 `0x60`,所以"残血也杀不掉"
- 技能脚本数据出处:`data/extracted/data/spells.json` / `object-magics.json` 各技能 `scriptOnSuccess`(夺魂 obj304 / 灵葫咒 obj384=43113 / 回梦 obj303 / 鬼降 obj305 / 飞龙探云手 obj377=43144)

ts 实现状态:特殊技能的 `scriptOnSuccess` 走战斗脚本解释器(0x06/0x2E/0x60/0x6A 等 opcode);偷取 `0x6A` + 居中提示已做(见 [feature-status D22](status/feature-status.md)),秒杀 / 上状态 / 法抗关在战斗 opcode dispatch 内逐条对源实现。

---

## 紫金葫芦炼丹:灵葫值炼随机丹药

### TL;DR

[灵葫咒](#特殊技能成功率秒杀--偷取--上状态)秒掉敌人时,把敌人的灵葫值(`wCollectValue`)累加进**全局灵葫值**(`gpGlobals->wCollectValue`,跨战斗持久、存档保存)。大世界用**紫金葫芦**(item 270)就把灵葫值**炼成一颗随机丹药**:灵葫值越高,越可能炼出高级货。

### 炼丹公式(opcode `0x34`,紫金葫芦 scriptOnUse → [script.c:1454-1477](../../reference/sdlpal/script.c#L1454-L1477))

原版(`#ifdef PAL_CLASSIC`,= 1995 DOS 真值)每按一次紫金葫芦:

```c
if (wCollectValue > 0) {
   i = RandomLong(1, wCollectValue);   // 1..当前灵葫值 均匀掷
   if (i > 9) i = 9;                    // 上限封顶 9
   wCollectValue -= i;                  // 消耗 i 点灵葫值
   AddItem(Store[0].items[i - 1], 1);   // 给第 i 档丹药(i=1→槽0 ... i=9→槽8)
}
```

- **掷出的 `i` 同时决定"给哪档药"和"扣多少灵葫值"**——`i` 越大,药越高级、扣得也越多。玩家**不能挑**,纯随机。
- **灵葫值越大 → 越容易出高级药**:`i = RandomLong(1, 灵葫值)` 封顶 9。灵葫值 ≤ 9 时只能掷到 `1..灵葫值`(永远出不了高于当前灵葫值的档);灵葫值 ≥ 9 后,`9..灵葫值` 全塌缩成 `i=9`,所以灵葫值越高,`i=9`(最高档灵葫仙丹)概率越大——灵葫值 18 时 P(i=9) = 10/18 ≈ 56%,灵葫值 100 时 = 92/100 = 92%。
- 灵葫值 = 0 时不会炼出物品；`0x34` 的 `else` 会跳 operand0 指向的共享失败臂，显示旁白
  **“无任何效果”**（item270 的 L39713 operand0=38780，L38780→L38782）。

### 九档丹药(`Store[0].items`,真值出处 `data/extracted/data/stores.json` store0 + `items.json`)

| 掷到 i / 消耗灵葫值 | 道具 |
|:--:|---|
| 1 | 行军丹 |
| 2 | 还神丹 |
| 3 | 还魂香 |
| 4 | 试炼果 |
| 5 | 舍利子 |
| 6 | 蜂王蜜 |
| 7 | 孟婆汤 |
| 8 | 蟠果 |
| 9 | 灵葫仙丹 |

> 玩家口中的"灵葫芦丹"= 第 9 档 **灵葫仙丹**(数据表内部名);"行军丹消耗 1"对得上。

### sdlpal 与原版的分歧(本节按原版 PAL_CLASSIC)

sdlpal 默认(非 CLASSIC)分支是 `i = RandomLong(1, 9); if (i > 灵葫值) i = 灵葫值;`——灵葫值 ≥ 9 后九档**等概率**,没有"越大越高级"的加权。**用户真机观察到的"灵葫值越大越容易出高级药"= PAL_CLASSIC = 原版行为**,与本仓库一致(以 pal.exe 实机为最终真值)。

ts 实现状态:**已实现**,走 PAL_CLASSIC 分支([event-system.ts](../../packages/game/src/core/event-system.ts#L3914) 0x34:`i=RandomLong(1, collectValue)` 封顶 9、`collectValue-=i`、给 `Store[0].items[i-1]` + 物品框)。灵葫值并入见 [battle-opcodes.ts](../../packages/game/src/core/battle/battle-opcodes.ts#L781) 0x33。

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
- **"巫"是异类**:它不削伤害,而是 gate"这个异常到底上不上得去"。字段 `wResistanceToSorcery`(注释直译 "resistance to sorcery and poison, 0 min, 10 max",[global.h:203](../../reference/sdlpal/global.h#L203)),存在 **OBJECT_ENEMY** 表(项目 `enemy-objects.json`),与五灵 / 物抗那套战斗数值(ENEMY 表)**不是同一张表**。
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

> **投掷也吃同一道关**:投掷物品跑该道具的 `wScriptOnThrow`([fight.c:4361](../../reference/sdlpal/fight.c#L4361)),脚本里若是"给敌人上异常"就还是 `0x2E`——**投掷上异常与巫术仙术受完全相同的判定和 bug,上限同样 90%**。投掷若是"下毒"则走 `0x28`(下文,无此 bug)。

### 巫术命中判定:`0x2E` 公式 + "上限 90%" bug

给敌人上状态 `0x2E`([script.c:1377-1397](../../reference/sdlpal/script.c#L1377-L1397),PAL_CLASSIC):

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
- **铁证(同引擎对照)**:同一个 `wResistanceToSorcery` 字段,**下毒 `0x28` 用的是"对的"写法** `RandomLong(0,9) >= 巫抗`([script.c:1193](../../reference/sdlpal/script.c#L1193) / [1228](../../reference/sdlpal/script.c#L1228))——巫抗 0 时 `>= 0` 恒真,**100% 中毒,无 10% 损耗**。两个 opcode 拿同一字段判同一件事,一个 `>=` 一个 `>`,**坐实 `0x2E` 的 `>` 是笔误**而非设计。

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

- **敌人对我方上异常,跳过巫抗这道关**:给玩家上状态走 `0x2D`([script.c:1367-1375](../../reference/sdlpal/script.c#L1367-L1375)),直接 `PAL_SetPlayerStatus`,**没有任何抗性掷骰**;玩家根本**没有 `wResistanceToSorcery` 字段**(巫抗是 OBJECT_ENEMY 专属,与"敌人有物抗、我方没有"同款不对称)。
- 那玩家为何不会被敌人状态技能轻易秒控?**平衡不在玩家抗性,而在敌方那侧的概率被压低**:敌人状态技能的**固定概率关(`0x06`)阈值通常设得很低**,普攻附带异常还要再过概率 + 玩家毒抗两道关(见下)。即"敌方相关技能成功率本就低很多",以补偿玩家无巫抗兜底。
  - (这是脚本 / 数据层的设计倾向,各技能 `scriptOnSuccess` 的具体阈值未逐一枚举;**引擎层确凿的是 `0x2D` 无抗性关**。)

### 敌人普攻附带异常(黑狗血 → 封技)

部分敌人普攻命中后,有概率追加一个异常(最典型是**封技**:`kStatusSilence`,注释 "cannot use magic" [global.h:49](../../reference/sdlpal/global.h#L49),中招后不能用仙术)。判定 [fight.c:5139-5146](../../reference/sdlpal/fight.c#L5139-L5146):

```c
if (iCoverIndex == -1 && !fAutoDefend &&                          // 没被援护、玩家没自动防御
    敌.wAttackEquivItemRate >= RandomLong(1, 10) &&               // ① 附带概率关
    PAL_GetPlayerPoisonResistance(role) < RandomLong(1, 100))     // ② 玩家毒抗关
{
   跑 敌.wAttackEquivItem(item) 的 wScriptOnUse,目标 = 该玩家;    // 脚本里 0x2D 给玩家上异常
}
```

- **① 附带概率 = `wAttackEquivItemRate / 10`**(字段 [global.h:276-277](../../reference/sdlpal/global.h#L276-L277))。数据实感(项目 `enemies.json`):**125 个敌人填 0(根本不附带)**;带附带的集中在 **3(30%)** 与 **5(50%)** ——所以"一般 30%"对应字段 = 3,是带附带敌人里最常见档之一(整体范围约 10%~80%)。
- **② 玩家毒抗是第二道关**:`玩家毒抗 < 掷(1~100)` 才追加 → 该关通过率 `(100−毒抗)/100 = 1−毒抗`。**这道关对一切附带都生效**——不管附带的是毒、昏睡还是封技,统统过这道毒抗关。所以**毒抗 100%(如装备五毒珠)= 完全免疫一切普攻附带异常(毒 / 昏睡 / 封技…)**,这是玩家能主动堆的唯一抵抗手段。
  - 合并 ①②:**普攻附带触发概率 = 敌带毒率 ×(1 − 毒抗)**(即 `rate/10 ×(100−毒抗)/100`)。你提到"若第一道没拦住、施加时再过一次 `(1−毒抗)`"——果真如此总概率 ≈ 敌带毒率 ×`(1−毒抗)²`;这**第二道应在 equiv item 的 `wScriptOnUse` 脚本内**,我尚未定位到具体 item 脚本核实(fight.c 主判定只见 5141 这一道毒抗关)。
- **成功格挡 / 援护 → 整个附带块跳过**(`iCoverIndex == -1 && !fAutoDefend` 是前置):自动格挡(7/17)或被援护时,不仅免那一下伤害,**连普攻附带的毒 / 巫一起免掉**。
- 全过 → 跑"等价物品"`wAttackEquivItem`(一个 item)的 `wScriptOnUse`(目标 = 被打玩家),脚本用 `0x2D` 挂 `kStatusSilence`(或其它异常)——**到玩家身上同样无巫抗关**。

> **⚠️ 普攻附带能挡、仙术附带挡不住**:敌人**仙术**附带的毒 / 巫走另一条路——施法时状态 / 毒在 `wScriptOnSuccess` 里施加([fight.c:4768-4769](../../reference/sdlpal/fight.c#L4768-L4769)),**在伤害块之前、且完全不检查 `fAutoDefend`/`fDefending`/护体**。所以主动防御、自动格挡、援护对**仙术附带的异常一概无效**(只有仙术**伤害本身**才受主动防御 /2、护体 /2、法术自防御减免,[fight.c:4801-4803](../../reference/sdlpal/fight.c#L4801-L4803))。这就是"敌方仙术带毒 / 带巫,什么防御都没用"的根因。

### ts 实现状态

- `0x28` 下毒:`rangeInclusive(0,9) < 巫抗` 失败(即 `>= 巫抗` 成功),1:1([battle-opcodes.ts:477](../../packages/game/src/core/battle/battle-opcodes.ts#L477))。
- `0x2E` 上状态:**已采用 `>=`**([battle-opcodes.ts:634](../../packages/game/src/core/battle/battle-opcodes.ts#L634))——跟进原版后期修复(巫抗 0 也 100% 命中、满值 10 才免疫),**有意偏离 sdlpal**(它仍 `>`);源码注释 + 回归测试(actions.test.ts「夺魂成功:巫抗0、掷0也命中」)钉住,防被按 sdlpal 改回。`0x28` 下毒不动(本就是 `>=`)。`enemy-objects.json` 的 `resistanceToSorcery` 经 battle-system 注入敌人槽([battle-system.ts:326](../../packages/game/src/core/battle/battle-system.ts#L326))。
- 投掷:`throw-item.ts` 跑 `wScriptOnThrow`,`0x28` / `0x2E` 复用同一 opcode dispatch,故投掷上异常自动同享 90% 上限。
- 敌人普攻附带(`wAttackEquivItem` + 毒抗第二关)、`0x2D` 给玩家上状态:取决于敌→玩家施法编排接入程度(当前战斗主走玩家→敌人;见 [feature-status](status/feature-status.md))。

### 源出处速查

- 巫抗字段 `wResistanceToSorcery`(0~10):[global.h:203](../../reference/sdlpal/global.h#L203)
- 上敌状态 `0x2E`(掷 0~9 **>** 巫抗,CLASSIC `i=9`):[script.c:1377-1397](../../reference/sdlpal/script.c#L1377-L1397)
- 下敌毒 `0x28`(掷 0~9 **>=** 巫抗,对照组,无 bug):[script.c:1193](../../reference/sdlpal/script.c#L1193) / [1228](../../reference/sdlpal/script.c#L1228)
- 上玩家状态 `0x2D`(无抗性关):[script.c:1367-1375](../../reference/sdlpal/script.c#L1367-L1375)
- 普攻附带 equiv item(概率关 + 玩家毒抗关):[fight.c:5139-5146](../../reference/sdlpal/fight.c#L5139-L5146);字段 [global.h:276-277](../../reference/sdlpal/global.h#L276-L277)
- 封技 `kStatusSilence`("cannot use magic"):[global.h:49](../../reference/sdlpal/global.h#L49)

---

## 异常状态效果:眠 / 定身 / 疯魔 / 封技

> 承接[抗性体系总览 与 巫术命中判定](#抗性体系总览-与-巫术命中判定):那节讲异常"能不能上",这节讲**上了之后干什么**。状态枚举 [global.h:40-60](../../reference/sdlpal/global.h#L40-L60)。

### 状态全集 与 "睡眠 = 定身"

CLASSIC 下共 9 种:混乱 / 定身 / 睡眠 / 封技 / 傀儡 / 狂暴 / 护体 / 加速 / 连击([global.h:40-56](../../reference/sdlpal/global.h#L40-L56))。

- **睡眠(`kStatusSleep`)与定身(`kStatusParalyzed`)在 CLASSIC 下是两个独立枚举值,但游戏效果完全相同**——凡"丧失行动力"的判断都成对写 `Sleep ‖ Paralyzed`(出手排序 [fight.c:1505-1507](../../reference/sdlpal/fight.c#L1505-L1507)、自动防御压制 [fight.c:4977-4979](../../reference/sdlpal/fight.c#L4977-L4979)、援护虚弱判定 [fight.c:4943-4946](../../reference/sdlpal/fight.c#L4943-L4946) 等)。所以你说"本质没区别"对:**同义状态、占两个槽**。
- 反向佐证:**非 CLASSIC** 才 `#define kStatusParalyzed kStatusSleep` 真正合并两者,并把腾出的槽给"迟缓 `kStatusSlow`"([global.h:43-60](../../reference/sdlpal/global.h#L43-L60))。CLASSIC 无迟缓,定身独立但等价睡眠。
- 状态是**回合计数**(`rgwStatus[x] = 剩余回合`),每回合自减、归 0 解除。设置规则 `PAL_SetPlayerStatus`([global.c:2221-2274](../../reference/sdlpal/global.c#L2221-L2274)):眠 / 定身 / 封技 / 混乱属"坏状态"——**已有则不刷新**;护体 / 狂暴 / 加速 / 连击属"好状态"——取较长回合;傀儡只对死人。

### 眠 / 定身:丧失行动力

- 玩家睡眠 / 定身:身法置 0 排最后、本回合**强制普攻**(若回合内被救活),[fight.c:1505-1517](../../reference/sdlpal/fight.c#L1505-L1517);且**自动防御被压制**(无援护时 `fAutoDefend` 强制 FALSE,[fight.c:4975-4985](../../reference/sdlpal/fight.c#L4975-L4985))——详见[防御机制](#防御机制主动防御--自动防御--援护--护体)。
- 敌人睡眠 / 定身:行动直接跳过([fight.c:4582-4589](../../reference/sdlpal/fight.c#L4582-L4589) `goto end`)。

### 封技(`kStatusSilence`):只封仙术

- 注释 "cannot use magic"([global.h:49](../../reference/sdlpal/global.h#L49))。中招后**选仙术被判 invalid**([fight.c:3305-3311](../../reference/sdlpal/fight.c#L3305-L3311) `fValid=FALSE`),随后**攻击仙术 → 退化普攻、辅助 / 治疗仙术 → 退化防御**([fight.c:3326-3358](../../reference/sdlpal/fight.c#L3326-L3358))。
- **只封"仙术(Magic)"**:普攻、投掷道具、用道具、防御、逃跑都照常。来源最典型是敌人普攻附带(黑狗血,见上节"敌人普攻附带异常")。

### 疯魔(混乱 `kStatusConfused`):攻击队友

混乱单位改用专用动作 `kBattleActionAttackMate`(攻击同伴);**玩家版与敌人版抽签规则不同**:

| | 玩家混乱 | 敌人混乱 |
|---|---|---|
| 选目标 | `do { t=RandomLong(0,队伍上限) } while(自己 ‖ 死)` —— **重抽到"非自己的活队友",必打中** | 随机活敌人;**`if(==自己) goto end` 不打** |
| 抽到自己 | do-while 排除,**绝不打自己** | **直接跳过本回合**(这才是你说的"抽到自己就不打") |
| 全队只剩自己活 | 转 **Pass 不动** | 选不到他人 → 跳过 |
| 源 | validate [fight.c:3448-3479](../../reference/sdlpal/fight.c#L3448-L3479) + perform [fight.c:3760-3854](../../reference/sdlpal/fight.c#L3760-L3854) | [fight.c:4591-4654](../../reference/sdlpal/fight.c#L4591-L4654) |

> 你口述的"我方范围抽签、抽到自己就不打"对应的是**敌人混乱**([fight.c:4594](../../reference/sdlpal/fight.c#L4594));**玩家混乱**是 do-while **重抽必中队友**,只有全队仅剩自己时才不动。另:玩家混乱"只剩自己→Pass"是 sdlpal **有意偏离原版**的修改([fight.c:3469-3476](../../reference/sdlpal/fight.c#L3469-L3476),注释 "original version behaviour is not same"——原版此时会转去打敌人)。

**混乱打友的伤害 / 减伤**(玩家版 [fight.c:3812-3835](../../reference/sdlpal/fight.c#L3812-L3835)):

```c
str = 攻击者攻击力;
def = PAL_GetPlayerDefense(被打队友);
if (队友.fDefending) def *= 2;                       // 主动防御:def ×2
sDamage = PAL_CalcPhysicalAttackDamage(str, def, 2); // 物抗参数硬编码 = 2
if (队友[kStatusProtect] > 0) sDamage /= 2;          // 护体:再 /2
```

`PAL_CalcPhysicalAttackDamage` 里物抗是**除数**:`sDamage = CalcBaseDamage(str,def); if(res!=0) sDamage/=res;`([fight.c:279-285](../../reference/sdlpal/fight.c#L279-L285))。res=2 → **基础伤害 /2**。

逐条对照你的口述(**以源码为准**):

| 你的说法 | 源码真值 | 判定 |
|---|---|---|
| 伤害 = 基础伤害/2 ×(1−物抗) | res 硬编码 **2**,公式 `基础伤害 / res` = **基础伤害/2**;玩家无物抗变量参与 | ✓ 退化结论对(物抗是除数 `/res`,非 `×(1−物抗)`) |
| 我方无物抗 → 退化成基础伤害/2 | 同上,res=2 写死 | ✓ |
| 攻击队友无法格挡 | 混乱打友**无 `fAutoDefend` 判定**(不同于敌人打玩家 [4938](../../reference/sdlpal/fight.c#L4938)),无自动闪避 | ✓ |
| 护体 buff 不生效 | [3820-3823](../../reference/sdlpal/fight.c#L3820-L3823) `kStatusProtect → /2` **仍生效** | ✗ 护体照常减半 |
| 主动防御:被队友 ×2、被敌方 ×4 | 混乱打友 [3816](../../reference/sdlpal/fight.c#L3816) 与敌人打玩家 [4928](../../reference/sdlpal/fight.c#L4928) **都是 `def*=2`**;**无 ×4** | ✗ 无 ×4(疑把"敌人作防御方时 `def+(等级+6)*4` 的等级构成"记串) |

**敌人混乱打敌人**伤害另算:`PAL_CalcBaseDamage(str,def) * 2 / 目标物抗`([fight.c:4634-4645](../../reference/sdlpal/fight.c#L4634-L4645)),走目标敌人的真实物抗。

### 敌人混乱选目标:DOS / Win 原版 bug,sdlpal 已修

- 你说"DOS 只打右侧、Win 几乎不打友方"——那是**原版(DOS / Win95)的选目标 bug**。
- sdlpal 的 `PAL_BattleEnemySelectEnemyTargetIndex`([fight.c:4506-4517](../../reference/sdlpal/fight.c#L4506-L4517))是**纯随机选活敌人**(重抽到存活),**未复刻**右侧偏向 / 不攻击。→ **type-pal 跟 sdlpal,本就没这个 bug**,符合你"希望咱们没有"。

### 解封技:引擎能解,"解不掉"在数据层

- 引擎层 `0x2F`([script.c:1399-1403](../../reference/sdlpal/script.c#L1399-L1403))→ `PAL_RemovePlayerStatus(role, 状态)`([global.c:2280](../../reference/sdlpal/global.c#L2280))**能解任意状态,含封技**——引擎没拦着。
- DOS 版"很多药 / 技能解不了封技"是**数据 / 脚本层**:那些道具 / 技能脚本里**没写"解 `kStatusSilence`"那条 `0x2F`**(只解了睡眠 / 中毒等)。
- **归属与取舍**(照本仓"考证真值 → 讲清归属 → 你拍板"惯例,同[逃跑吉运](#吉运只影响逃跑成功率)那节):sdlpal 忠实复刻原版数据,用同一份提取数据时 type-pal **行为会一样**。要"修"得**改具体道具的脚本数据**(补一条解 Silence),偏离 1:1 忠实——**建议先 1:1 照搬;若要让某几件药能解封技,你点名、我改数据并注明偏离**。(当前未改。)

### ts 实现状态

本节为**原版规则考证**;type-pal 对照实现程度见 [feature-status](status/feature-status.md) 战斗状态项。若实现 / 校准混乱 / 封技,须照搬上述真值:**混乱打友 res=2 → /2、护体仍 /2、`def*=2`(无 ×4)、玩家 do-while 必打活队友、敌人选目标纯随机、封技只禁仙术**;解封技属数据层,默认随原版(不擅改)。

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
| 我方的作用 | 玩家无此字段 | **降伤 + 降中毒概率**(被附带毒时 `玩家毒抗 < 掷1~100` 才中,[fight.c:5141](../../reference/sdlpal/fight.c#L5141));装备 / 吃大蒜可加,上限 100 |

- **给敌人下毒能不能中,看敌人巫抗,跟毒抗无关**——巫抗满(10)的 boss 根本不中毒(下文"秒杀"用到)。
- 敌人毒抗高 ≠ 难毒到它,只是"你用毒系仙术砍它伤害低";真正挡中毒的是巫抗。我方则相反:毒抗**既降伤又降中毒率**,所以堆毒抗(装备 / 大蒜)对玩家防毒是实打实有用的。

### 数据结构 与 毒名

- `OBJECT_POISON`:`wPoisonLevel`(等级)/ `wColor`(头像染色)/ `wPlayerScript`(玩家中毒每回合跑)/ `wEnemyScript`(敌人中毒每回合跑)([global.h](../../reference/sdlpal/global.h))。
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

- **无影毒 = 爆发毒**:不是逐回合 DoT,挂上后**一次性结算**——对敌走 `0x5B "Halve HP"`:`扣血 = 当前 HP/2 + 1`,**上限 1000**([script.c:1895-1905](../../reference/sdlpal/script.c#L1895-L1905) 的 `w=HP/2+1; if(w>operand)w=operand`)。level **173** 远超任何解毒上限 → **谁都解不了**。(与你说的"半血、上限 1000、不能解"一致。)

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

`0x2C` "Cure poisons by level" → `PAL_CurePoisonByLevel(role, wMaxLevel)`:移除**等级 ≤ wMaxLevel** 的毒([script.c:1349-1365](../../reference/sdlpal/script.c#L1349-L1365) / [global.c:1604-1613](../../reference/sdlpal/global.c#L1604-L1613))。

| 解毒来源 | wMaxLevel | 能解到 |
|---|---|---|
| **灵血咒**(magic 308) | **2**(实测 `0x2C [_,2]`,[scriptOnSuccess L_43082]) | 常规毒(赤 / 尸 / 瘴 / 毒丝,0–2 级) |
| **九节菖蒲**(item 89) | 2(据你,同灵血咒) | 同上 |
| **复活**(`0x22`,还魂类) | **3**([script.c:1071/1091](../../reference/sdlpal/script.c#L1071)) | 顺带解 ≤3 级 → **连七大毒一起解**,但解不掉无影毒(173) |

- 结论:**专门解毒药(灵血咒 / 九节菖蒲)只解到 2 级,七大毒解不了**;中七大毒只能靠**复活类**(解到 3 级)、相克、或撑过持续回合。**无影毒(173)谁都解不了**。
- 另有 `0x2A` / `0x2B` 按毒**种类(id)**解(敌 / 我),供脚本精确点名解某毒(相克链、毒末尾自解都用它)。

### 风险解毒道具(毒龙胆 / 九阴散)与 寿葫芦白嫖

**毒龙胆**(item 278,`wScriptOnUse`=L_39765)、**九阴散**(item 136) 同款:脚本先 `0x61`"**没中毒就跳去 `0x5F` 秒杀自己**",否则 `0x2C` 解 **≤3 级**毒(含七大毒里的六种 level3,**不含**无影毒 173)并回血(九阴散回满)。

- **没中毒时吃 = 暴毙**(`0x61` → `0x5F`);有毒时吃 = 解毒 + 回血。高风险高回报。
- **"漏赤毒"归属**:`0x61` 调 `PAL_IsPlayerPoisonedByLevel(role, 0)`,sdlpal 用 `w >= wMinLevel`([global.c:1677](../../reference/sdlpal/global.c#L1677)) → 赤毒 level0 满足 `0>=0` **算中毒、不漏**。你说的"毒龙胆漏赤毒被秒"疑是**原版早期**用 `>`(漏 level0)的 bug,**sdlpal 已修为 `>=`**;type-pal ts 更彻底(不看 level,任意毒都算)→ 也不会漏赤毒。
- **寿葫芦白嫖(原版早期 bug → 后期已修)**:寿葫芦(item 269)挂 **level 99 伪毒**(`HP回补`563 / `MP回补`564,每回合回血 / 回蓝)。这种 level99 毒在 sdlpal 被 `if (w >= 99) continue` **忽略**([global.c:1669](../../reference/sdlpal/global.c#L1669),注释"装备效果")。三版行为:

  | | 寿葫芦 level99 伪毒算不算"中毒" | 装寿葫芦吃毒龙胆 / 九阴散 |
  |---|---|---|
  | **原版早期** | 算 | **不暴毙**,解毒 + 回满血(白嫖) |
  | **原版后期(判 bug 已修)= sdlpal** | 不算(`>=99 continue`) | **照样暴毙** |
  | **type-pal ts(已修)** | **不算**(`isPlayerPoisoned` ByLevel 补了 level≥99 豁免) | **照样暴毙**(对齐 sdlpal / 原版后期) |

  → **已修**:`isPlayerPoisoned`([event-system.ts:3241](../../packages/game/src/core/event-system.ts#L3241))的 ByLevel 路径(`poisonKind===undefined`,即 `0x61`)补了 `level >= 99 → 跳过`,寿葫芦等装备伪毒不再算"中毒",装寿葫芦吃毒龙胆 / 九阴散**照样暴毙**(对齐 sdlpal / 原版后期);`0x60` 的 ByKind 路径(查特定毒 id)不动。回归测试见 event-system.test.ts「没中毒则跳:level≥99 伪毒」。与[巫术 `0x2E`](#巫术命中判定0x2e-公式--上限-90-bug)同属"跟进原版后期修复"。

### ts 实现状态

毒的**伤害缩放 + 中毒概率**(毒抗那套)实现见[五灵 / 毒 抗性](#五灵--毒-抗性与五行机制)节末。本节的**逐回合 DoT(`0x1B`/`0x21` + `end` 推进)、按等级 / 种类解毒(`0x2C`/`0x2A`/`0x2B`)、无影毒半血(`0x5B`)** 走战斗 opcode dispatch(`0x28` 下毒已实现,见 [battle-opcodes.ts](../../packages/game/src/core/battle/battle-opcodes.ts));**相生相克 / 三对致死组合**取决于各七大毒 apply 脚本接入程度(`0x5E` 查毒 + `0x60`/`0x5F` 秒杀),实现时须照搬上述规则与数值。

---

## 怪物刷新:消失倒计时与离屏复活

> 玩家只看到"打赢的怪过一阵、走开后又冒出来"。背后是**场景事件对象(EVENTOBJECT)**的两个隐藏字段在驱动:**引擎从不自动刷怪** —— "消失"这一步是怪物**自己的脚本在战斗胜利后**触发的,引擎只提供「倒计时」与「离屏复活」两个原语。"一段时间后 + 在可视区域外"正是这两个原语**叠加**的结果,但它们卡在**不同阶段**(见坑②)。

### TL;DR

怪物 = 地图上可见(明雷)的事件对象。打赢后,它的 trigger 脚本接着跑 opcode `0x52`,把自己 `sState` 取负(标记隐藏)、`sVanishTime` 设为倒计时帧数(默认 **800**)。此后在所属场景每次**世界逻辑 tick(100ms)**递减,归零前完全隐身且不可触发;倒计时归零后,引擎逐帧检查它**当前坐标是否在 320×320 视口外** —— 在视野内**不复活**(盯着实体当前位置它永远不冒头),走开使其离屏才 `sState` 转正、重新可见可触发(= 刷新)。默认需要 800 个有效世界 tick = **80 秒探索时间**；切场景、战斗、菜单或阻塞脚本暂停世界更新时不会用墙钟偷跑。

### 1. 怪物 = 场景事件对象(EVENTOBJECT)

源:[global.h:74-121](../../reference/sdlpal/global.h#L74-L121)。地图上的怪物、NPC、宝箱、机关**同属一种结构** `EVENTOBJECT`,靠字段区分行为:

```c
typedef struct tagEVENTOBJECT {
   SHORT  sVanishTime;     // 消失倒计时(本节主角):>0 隐身倒计时 / <0 可见但暂停自动行为 / 0 常态
   WORD   x, y;            // 地图世界坐标
   ...
   WORD   wTriggerScript;  // 触发脚本(走近/触碰时跑;怪物的"开战"就写在这里)
   WORD   wAutoScript;     // 自动脚本(每帧跑,做巡逻/动画)
   SHORT  sState;          // 状态:0=隐藏 1=正常 2=阻挡;<0=隐藏待复活(本节主角)
   WORD   wTriggerMode;    // 触发模式:>=4(kTriggerTouchNear)= 触碰自动触发(明雷怪)
   ...
} EVENTOBJECT;
```

- **状态 `sState`**([global.h:74-80](../../reference/sdlpal/global.h#L74-L80)):`kObjStateHidden=0` / `kObjStateNormal=1` / `kObjStateBlocker=2`。**负值**是"隐藏待复活"标记(复活时取 `abs` 还原)。
- **触发模式 `wTriggerMode`**([global.h:82-93](../../reference/sdlpal/global.h#L82-L93)):`>= kTriggerTouchNear(4)` 的对象**走近即自动触发** —— 地图上的明雷怪就是这一档(4~8 对应触发半径递增)。
- 各场景的事件对象是全局数组 `lprgEventObject` 的一段,由 `SCENE.wEventObjectIndex`([global.h:120](../../reference/sdlpal/global.h#L120))切片;脚本对 `sState`/`sVanishTime` 的修改**写在全局数组里、跨场景持久**(离开再回来,已消失的怪仍在倒计时)。

### 2. 时间基准:世界逻辑 FPS = 10 → 每有效 tick 100ms

倒计时按**当前场景的世界逻辑 tick**推进,换算基准是逻辑帧率:

- `#define FPS 10`([game.h:27](../../reference/sdlpal/game.h#L27)) → `FRAME_TIME = 1000/FPS = 100ms`([game.h:28](../../reference/sdlpal/game.h#L28))。
- 主循环每 100ms 调一次 `PAL_StartFrame`([game.c:80-85](../../reference/sdlpal/game.c#L80-L85)),后者每帧跑 `PAL_GameUpdate(TRUE)`([play.c:534](../../reference/sdlpal/play.c#L534)) —— 倒计时就在这里推进,**与玩家是否走动无关**(站着不动也照样倒计时)。

| opcode | 设定值 | 帧数 | ×100ms | 现象 |
|---|---|---|---|---|
| `0x4B` 短暂消失 | `sVanishTime = -15` | 15 | **1.5 秒探索时间** | 仍可见;暂停自动触碰触发与 autoScript,但 triggerMode 1–3 的手动确认搜索仍可触发 |
| `0x52` 隐藏(默认) | `sVanishTime = 800` | 800 | **80 秒** | 隐身;倒计时归零 + 离屏才重现 |
| `0x52` 隐藏(带操作数) | `sVanishTime = 操作数` | op | op × 0.1 秒 | 同上,**实际刷新间隔由脚本写的操作数决定** |

### 3. 引擎核心两段:倒计时 + 离屏复活

源 `PAL_GameUpdate`([play.c:87-106](../../reference/sdlpal/play.c#L87-L106)),逐事件对象:

```c
if (p->sVanishTime != 0) {                       // ① 每次有效世界 tick 向 0 推进
   p->sVanishTime += (p->sVanishTime < 0) ? 1 : -1;  //   正数-1 / 负数+1
   continue;                                      //   期间跳过复活/自动触碰/autoScript
}
if (p->sState < 0) {                             // ② 倒计时归零 + "隐藏待复活"
   if (p->x < PAL_X(viewport) || p->x > PAL_X(viewport) + 320 ||
       p->y < PAL_Y(viewport) || p->y > PAL_Y(viewport) + 320) {   // 离开 320×320 视口
      p->sState = abs(p->sState);                //   转正 → 重新可见可触发(= 刷新)
      p->wCurrentFrameNum = 0;                   //   复位站立帧
   }
}
```

而"消失"由怪物脚本主动设置([script.c:1798-1799](../../reference/sdlpal/script.c#L1798-L1799),opcode `0x52`,`pEvtObj` = 脚本宿主自己):

```c
pEvtObj->sState *= -1;                                  // 1 → -1,标记"隐藏待复活"
pEvtObj->sVanishTime = op0 ? op0 : 800;                 // 倒计时帧数,默认 800
```

### 4. 完整生命周期(从遭遇到刷新)

| 阶段 | 条件 / 触发 | 字段变化 | 时长 | 源 |
|---|---|---|---|---|
| ① 活动 | `sVanishTime==0 && sState>0` | 可见、走近自动触发、autoScript 跑 | — | [play.c:107](../../reference/sdlpal/play.c#L107) / [172](../../reference/sdlpal/play.c#L172) |
| ② 遭遇开战 | 走进触发区,trigger 脚本里 `0x07` startBattle | 同步进入战斗 | — | [play.c:153](../../reference/sdlpal/play.c#L153) |
| ③ 战后消失 | **胜利后脚本接着跑 `0x52`** | `sState*=-1`;`sVanishTime=800`(或操作数) | — | [script.c:1798](../../reference/sdlpal/script.c#L1798) |
| ④ 倒计时 | 所属场景每个世界逻辑 tick -1,**与玩家动不动无关** | `800 → … → 0` | 默认 **80 秒探索时间** | [play.c:87-94](../../reference/sdlpal/play.c#L87-L94) |
| ⑤ 离屏复活 | 倒计时归零后,坐标离开 320×320 视口 | `sState=abs()`、复位帧 | 取决于何时走开 | [play.c:96-106](../../reference/sdlpal/play.c#L96-L106) |
| ⑥ 回到 ① | | | | |

### 5. 重要约束(容易误解的点)

- **坑①:每次有效世界逻辑 tick 都推进,与可视区域和玩家是否走动无关。** `sVanishTime != 0` 直接递减并 `continue`([play.c:87-94](../../reference/sdlpal/play.c#L87-L94)),排在复活判定**之前**。站着不动、盯着实体,80 秒探索 tick 照样走完 —— 可视区域**不影响倒计时**。但切场景、战斗、菜单或阻塞脚本没有运行这段 world update 时必须暂停,不能换成墙钟/后台 timer。
- **坑②:"在可视区域外"只卡复活那一步(⑤),不是刷新的全部。** 倒计时归零后怪进入 `sState<0 && sVanishTime==0`,引擎才逐帧判它**当前坐标**是否离屏:在视野内 → **不复活**(死盯实体当前位置永远刷不出);离屏 → 立刻转正重现。所以体感"过一会儿 + 走开"= **先等够 `sVanishTime`、再走出视野**,两条件**依次**满足。
- **坑③:引擎不自动刷怪 —— 消失是脚本驱动的。** 没有任何"定时重生"逻辑;怪物消失是它**自己的 trigger 脚本在战斗胜利后接着跑 `0x52`**。引擎只提供倒计时 + 离屏复活两个原语,"多久刷、刷不刷"全由脚本写的 `sVanishTime` 操作数决定。
- **坑④:`sVanishTime` 正负是两套语义。** `>0`(如 800)= 隐身倒计时,present 层**不画**;`<0`(如 -15)= **仍可见**,跳过自动触碰触发与 autoScript。手动确认搜索不检查该字段,triggerMode 1–3 仍可触发。别把"短暂消失(`0x4B`)"和"隐藏刷新(`0x52`)"混为一谈。
- **坑⑤:复活的视口判定 y 也用 320(非屏高 200)。** [play.c:101](../../reference/sdlpal/play.c#L101) 的 y 边界写的是 `+ 320` 而非 200,疑为原版 typo;按"忠实复刻 sdlpal / 原版"惯例**照搬**(type-pal 已 1:1 复刻,见下)。
- **坑⑥:`0x52` 是 toggle,不是单向“设为隐藏”。** 它执行 `sState *= -1`:正态转负进入待复活;负态会转正;`0` 仍为 `0`。迁移到语义状态机时必须先证明调用前态或显式保留异常前态策略,不能无条件写成 `despawned`。
- **坑⑦:离屏判断使用实体当前坐标,不是出生点。** 重现只做 `abs(sState)` 与 `wCurrentFrameNum = 0`,不会把位置、朝向或碰撞类别重置回初始值。四条边界的端点仍算视野内,只有 `< vx` / `> vx + 320`（y 同理）才算离屏。

### 6. ts 实现状态

> ✅ **完整实现且节奏对齐**,非占位。

- **倒计时 + 离屏复活**:[scene-system.ts:199-216](../../packages/game/src/core/scene-system.ts#L199-L216) 逐行直译 play.c:87-106(`vx/vy` = `gs.camera`),含 y 用 `SCREEN_W(320)` 的 typo 复刻(注释已标注);触碰触发的 Manhattan 距离公式 [scene-system.ts:218-225](../../packages/game/src/core/scene-system.ts#L218-L225)。
- **消失 opcode**:`0x4B` `sVanishTime=-15`([event-system.ts:3930-3936](../../packages/game/src/core/event-system.ts#L3930-L3936))、`0x52` `sState=-sState; sVanishTime=op?op:800`([event-system.ts:3939-3947](../../packages/game/src/core/event-system.ts#L3939-L3947)),1:1。
- **可见性**:`sState<=0 || sVanishTime>0 → 不画`([present.ts:470-476](../../packages/game/src/present/present.ts#L470-L476)),与 `sVanishTime<0` 仍可见的语义一致。
- **autoScript gate**:仅 `sState>0 && sVanishTime==0` 才跑自动脚本([event-system.ts:1186-1189](../../packages/game/src/core/event-system.ts#L1186-L1189)),直译 play.c:172-192。
- **手动确认不受负倒计时 gate**:`scene-system-search.ts:69-98` 的 triggerMode 1–3 搜索不检查 `sVanishTime`;因此 `0x4B` 不是全面“禁止交互”。
- **节奏对齐(关键)**:explore 逻辑 tick = **100ms / 10fps**([main-loop.ts:40](../../packages/game/src/shell/main-loop.ts#L40),注释对齐 `game.c` 的 `FRAME_TIME`),与 sdlpal `FPS=10` 一致 → 80 秒 / 1.5 秒的刷新时间忠实,**无"60fps 每帧递减导致 1/6 缩水"的坑**。
- **相关修复**:`0x52` 隐藏怪写在 trigger 脚本里、需**战斗胜利后接回脚本**才会跑;早期因战末未接回导致"打完怪不消失",已由 `savePostBattleResume` / `resumePostBattleScript` 修复([event-system.ts:2077](../../packages/game/src/core/event-system.ts#L2077) / [3024](../../packages/game/src/core/event-system.ts#L3024))。回归测试见 scene-system.test.ts(倒计时递减不触发 / 离屏复活 / 触发区转向)。

### 附:源出处速查

| 内容 | 文件:行 |
|---|---|
| `EVENTOBJECT` 结构(sVanishTime / sState / wTriggerMode) | [global.h:95-113](../../reference/sdlpal/global.h#L95-L113) |
| 状态枚举 `OBJECTSTATE`(Hidden/Normal/Blocker) | [global.h:74-80](../../reference/sdlpal/global.h#L74-L80) |
| 触发模式 `TRIGGERMODE`(TouchNear=4 起自动触发) | [global.h:82-93](../../reference/sdlpal/global.h#L82-L93) |
| 当前场景每次世界逻辑更新递减 | [play.c:87-94](../../reference/sdlpal/play.c#L87-L94) |
| `sState<0` 离屏复活(320×320) | [play.c:96-106](../../reference/sdlpal/play.c#L96-L106) |
| 触碰自动触发距离公式 | [play.c:107-165](../../reference/sdlpal/play.c#L107-L165) |
| autoScript gate(`sState>0 && sVanishTime==0`) | [play.c:172-192](../../reference/sdlpal/play.c#L172-L192) |
| FPS=10 / FRAME_TIME=100ms | [game.h:27-28](../../reference/sdlpal/game.h#L27-L28) |
| 主循环每帧 `PAL_StartFrame → PAL_GameUpdate` | [game.c:80-85](../../reference/sdlpal/game.c#L80-L85) / [play.c:534](../../reference/sdlpal/play.c#L534) |
| `0x4B` 短暂消失(`sVanishTime=-15`) | [script.c:1730](../../reference/sdlpal/script.c#L1730) |
| `0x52` 隐藏(`sState*=-1; sVanishTime=op?op:800`) | [script.c:1798-1799](../../reference/sdlpal/script.c#L1798-L1799) |

---

## 大世界施加的状态如何带入战斗:护体 / 中毒 / 毒抗

> 大世界菜单里给自己用**金刚符**(上护体)、用**毒蛇卵 / 尸腐肉**(自我中毒)、吃**大蒜**(加毒抗),进战斗到底带不带?**全带**——仙剑**大世界与战斗共用同一套全局角色数据**,开战只读不重置。但三者挂在**三套不同结构**上,又被战斗结束的**同一处清理三件套**统一清掉,所以**都只保一场战斗**。本节把这条"大世界 → 战斗"边界讲透,串起[护体](#防御机制主动防御--自动防御--援护--护体)、[毒系统](#毒系统等级--每回合伤害--七大毒--相生相克)、[毒抗](#五灵--毒-抗性与五行机制)三节。

### TL;DR

| 大世界操作(item) | scriptOnUse(反汇编实测) | 写入的全局结构 | 进战斗 | 战斗结束清除(三件套) |
|---|---|---|---|---|
| **金刚符**(63) | `0x2D[6,7]` | `rgPlayerStatus[role][6]`(护体回合) | ✅ 带护体、回合数延续 | `PAL_ClearAllPlayerStatus()` |
| **毒蛇卵**(117,赤毒)/ 尸腐肉(116,尸毒)等 | `0x29[_,毒id]` | `rgPoisonStatus[毒][role]`(毒槽) | ✅ 带毒、每回合发作 | `PAL_CurePoisonByLevel(w,3)` |
| **大蒜**(84) | `0x17[17,22,30]` | `rgEquipmentEffect[6].rgwPoisonResistance`(Extra 格,+30) | ✅ 毒抗 +30、降中毒率 + 减毒伤 | `PAL_RemoveEquipmentEffect(w,Extra)` |

三件套同在 [battle.c:1822-1830](../../reference/sdlpal/battle.c#L1822-L1830),**胜 / 败 / 逃任意结局无条件执行** → 三类效果**统统只保这一场**。

> ⚠️ **纠正常见误解**:大蒜毒抗**不是"永久补品"**。它写的是 Extra 装备效果格(slot 6),和战斗内临时 buff(`0x30`)共用同一格,**战斗一结束就随三件套一起清**——和护体 / 中毒一样,只保一场。

### 1. 为什么"都带得进去":共用全局数组,开战只读不重置

仙剑**没有"大世界状态"和"战斗状态"两套**——玩家的状态 / 毒 / 装备效果都挂在 `gpGlobals` 的**全局数组**上,战斗逻辑**直接读这些全局数组**,大世界脚本也**直接写它们**:

| 数据 | 全局字段 | 战斗如何读 |
|---|---|---|
| 回合状态(护体 / 眠 / 狂暴…) | `rgPlayerStatus[role][9]` [global.h:522](../../reference/sdlpal/global.h#L522) | fight.c 全程直接读 `gpGlobals->rgPlayerStatus`(如护体减伤 [fight.c:5059](../../reference/sdlpal/fight.c#L5059)) |
| 中毒 | `rgPoisonStatus[毒][role]` [global.h:547](../../reference/sdlpal/global.h#L547) | 每回合跑 `gpGlobals->rgPoisonStatus[i][role].wPoisonScript`([fight.c:4454](../../reference/sdlpal/fight.c#L4454)) |
| 装备 / 食用效果(毒抗等) | `rgEquipmentEffect[7]` [global.h:521](../../reference/sdlpal/global.h#L521) | `PAL_GetPlayerPoisonResistance` 累加全部格 [global.c:1900](../../reference/sdlpal/global.c#L1900) |

- **玩家状态不进战斗副本**:`g_Battle` 只给**敌人**存状态副本(`rgEnemy[].rgwStatus`);玩家自始至终用全局 `rgPlayerStatus`。所以"大世界上的护体" = "战斗里的护体",同一个数。
- 故**任何大世界施加的效果天然带进下一场战斗**,无需特殊"传递"逻辑——它本就是同一份数据。

### 2. 三条施加链(大世界 → 写哪个全局结构)

第一手反汇编(`data/extracted/data/items.json` + `events/all.json`):

- **金刚符(63)** `scriptOnUse` = `0x2D[6,7]` → `PAL_SetPlayerStatus(role, 6, 7)`([script.c:1367](../../reference/sdlpal/script.c#L1367) / [global.c:2173](../../reference/sdlpal/global.c#L2173)):给**当前角色**上**护体**(`kStatusProtect`,CLASSIC 序 = 6)**7 回合**,写 `rgPlayerStatus`。属"好状态",再用取较长回合([global.c:2257](../../reference/sdlpal/global.c#L2257))。
- **毒蛇卵(117)→赤毒551 / 尸腐肉(116)→尸毒552** 等 `scriptOnUse` = `0x29[_,毒id]` → `PAL_AddPoisonForPlayer(role, 毒id)`([script.c:1257](../../reference/sdlpal/script.c#L1257) / [global.c:1459](../../reference/sdlpal/global.c#L1459)),写 `rgPoisonStatus`。**但先过毒抗 gate**(下文坑③)。
- **大蒜(84)** `scriptOnUse` = `0x17[17,22,30]` → `rgEquipmentEffect[17−0xB=6].rgwPoisonResistance[role] = 30`([script.c:752](../../reference/sdlpal/script.c#L752)):往 **Extra 格(slot 6)** 写**毒抗 +30**。

### 3. 战斗里如何生效

- **护体**:受到的物理 / 法术伤害**减半**(物理 [fight.c:5059-5062](../../reference/sdlpal/fight.c#L5059-L5062)、法术除数含护体项 [fight.c:4802](../../reference/sdlpal/fight.c#L4802))——详[护体节](#防御机制主动防御--自动防御--援护--护体)。
- **中毒**:每回合跑该毒的 `wPoisonScript`(DoT;赤毒 −7 / 回 等)——详[毒系统](#毒系统等级--每回合伤害--七大毒--相生相克)。
- **毒抗 +30**:`PAL_GetPlayerPoisonResistance(role)` = 角色基础 + Σ全部装备效果格(`i = 0 .. MAX_PLAYER_EQUIPMENTS`,**含 Extra 格**),上限 100。战斗里它**降低中毒概率**(`毒抗 < RandomLong(1,100)` 才中,[fight.c:5141](../../reference/sdlpal/fight.c#L5141))并**减免毒系仙术伤害**(`(10−毒抗/20)/5`)——详[五灵 / 毒抗性](#五灵--毒-抗性与五行机制)。所以**临阵嗑一瓣大蒜 = 这一场少中毒、少吃毒伤**。

### 4. 战斗结束:三件套统一清除(为何"只保一场")

[battle.c:1822-1830](../../reference/sdlpal/battle.c#L1822-L1830),注释 "Clear all player status, poisons and temporary effects",**胜 / 败 / 逃任意结局都跑**:

```c
PAL_ClearAllPlayerStatus();                       // ① 清 rgPlayerStatus(护体在内)
for (w = 0; w < MAX_PLAYER_ROLES; w++) {
   PAL_CurePoisonByLevel(w, 3);                    // ② 清 ≤3 级毒(毒等级上限 3 = 全部常规毒)
   PAL_RemoveEquipmentEffect(w, kBodyPartExtra);   // ③ 清 Extra 装备效果格(大蒜毒抗在内)
}
```

三件套**一一对应**第 2 节三套结构 → 大世界嗑的护体 / 毒 / 毒抗**全在战斗结束被清**,所以**都只生效一场**:

- ① `PAL_ClearAllPlayerStatus`([global.c:2311](../../reference/sdlpal/global.c#L2311)):清所有 ≤999 回合的状态(>999 留给装备常驻态)。
- ② `PAL_CurePoisonByLevel(w,3)`:清 level ≤3 的毒。常规毒(赤 / 尸 / 瘴 / 毒丝,0–2 级)+ 六大三级毒全在内;只有无影毒(173)清不掉(详[毒系统·解毒](#毒系统等级--每回合伤害--七大毒--相生相克))。
- ③ `PAL_RemoveEquipmentEffect(w, Extra)`([global.c:1372](../../reference/sdlpal/global.c#L1372)):把 Extra 格(slot 6)所有属性字段清零——大蒜毒抗、`0x30` 战斗临时 stat buff 一起清。

### 5. 大蒜的特殊性:Extra 格 + 两条清除路径

大蒜不可装备,却用 `0x17` 写 `rgEquipmentEffect`——因为 slot 6 是 **Extra 格(`kBodyPartExtra` [global.h:71](../../reference/sdlpal/global.h#L71) = MAX_PLAYER_EQUIPMENTS)**,一个**不绑定任何可穿戴装备的"杂项效果格"**,专给食用增益(`0x17`)和战斗临时 buff(`0x30`)用。毒抗 getter 遍历 `i = 0 .. MAX_PLAYER_EQUIPMENTS`(**含 slot 6**)累加,所以 Extra 格的 +30 照样计入总毒抗。

Extra 格有**两条清除路径**,大蒜毒抗撑到**两者谁先到**:

| 清除路径 | 触发 | 源 |
|---|---|---|
| **A. 战斗结束** | 任意战斗结束 `PAL_RemoveEquipmentEffect(w, Extra)` | [battle.c:1829](../../reference/sdlpal/battle.c#L1829) |
| **B. 换 / 卸装备、读档** | `PAL_UpdateEquipments` 开头 `memset` 全清 `rgEquipmentEffect`,再重跑装备 scriptOnEquip(大蒜不可装备 → 无人重新授予) | [global.c:1333](../../reference/sdlpal/global.c#L1333) / [1354](../../reference/sdlpal/global.c#L1354) |

→ **大蒜毒抗的寿命 = "下一场战斗结束" 或 "下一次换装 / 读档",谁先到**,绝非永久。(对照:真·永久补品如增体力丹写的是**角色基础属性** `rgwMaxHP`,不在 Extra 格,不受这两条路径影响。)

### 6. 重要约束(容易误解的点)

- **坑①:三件套只在"战斗结束"跑;大世界吃了不打架 → 一直挂着。** 护体回合数**只在战斗内每回合自减**,大世界不减;中毒在大世界**不发作扣血**(DoT 脚本只在战斗内跑),只在状态页显示毒名 + 头像染色;大蒜毒抗保留到路径 A / B。所以"大世界嗑好 buff 再进战斗"完全可行,且 **buff 满回合 / 满效果带入**。
- **坑②:大蒜 ≠ 永久。** 见第 5 节——与战斗临时 buff 共用 Extra 格,战斗 / 换装 / 读档都清。
- **坑③:大世界给自己下毒,可能"下不上"。** `0x29` 加毒同样过毒抗 gate(`玩家毒抗 < RandomLong(1,100)` 才中);毒抗高(刚吃完大蒜 / 装五毒珠)时,自我中毒可能失败。
- **坑④:C 玩家状态直接用全局,type-pal 拷了战斗副本 → ts 必须战后回清(DM2)。** 见下节。

### 7. ts 实现状态

> ✅ **三条施加链 + 战后三件套清除均已实现且对齐**;唯一实现差异(C 直接用全局 vs ts 拷副本)由 `finalizeBattleCleanup` 抹平。

- **施加**:`0x2D`→[event-system.ts:4295](../../packages/game/src/core/event-system.ts#L4295)(写 `rgPlayerStatus`)、`0x29`→[event-system.ts:4259](../../packages/game/src/core/event-system.ts#L4259)(`addPoisonForPlayer`,带毒抗 gate)、`0x17`→[event-system.ts:4043](../../packages/game/src/core/event-system.ts#L4043)(`writeEquipmentEffectField`,Extra 格)。
- **带入战斗**:开战 `seedBattleStatus(gs.rgPlayerStatus[role])` 把持久状态 seed 进战斗副本([battle-state.ts:805](../../packages/game/src/core/battle/battle-state.ts#L805));毒 / 毒抗读持久 `gs.rgPoisonStatus` / `getPlayerPoisonResistance`([equip-effect.ts:75](../../packages/game/src/core/equip-effect.ts#L75),遍历含 Extra 格)。
- **战后三件套**:`finalizeBattleCleanup`([battle-system.ts:3005](../../packages/game/src/core/battle/battle-system.ts#L3005),胜 / 败 / 逃都调)= ① `rgPlayerStatus` 清 ≤999 ② `curePlayerPoisonByLevel(role,3)` ③ `removeEquipmentEffect(role, 6)` 清 Extra 格,1:1 对齐 battle.c:1822-1830。
- **关键差异(已抹平)**:C 玩家状态**直接用全局**,战斗结束清全局即生效;ts **把状态 seed 成战斗副本**(`battleState.status`),副本随战斗丢弃、**不回写**持久 `gs.rgPlayerStatus` → 若战后不清,大世界 buff 每场开战重新 seed = **等效永久**(原 **DM2** bug)。`finalizeBattleCleanup` 补清持久数组后对齐原版"只保一场"。
- **换装 / 读档清 Extra**:`updateAllEquipments` 开头 `gs.rgEquipmentEffect = createInitialEquipmentEffect()` 全清(对齐 global.c:1354)→ 大蒜毒抗路径 B 对 ts 同样成立。

### 附:源出处速查

| 内容 | 文件:行 |
|---|---|
| `rgPlayerStatus` / `rgPoisonStatus` / `rgEquipmentEffect` 字段 | [global.h:522](../../reference/sdlpal/global.h#L522) / [547](../../reference/sdlpal/global.h#L547) / [521](../../reference/sdlpal/global.h#L521) |
| `kBodyPartExtra`(= MAX_PLAYER_EQUIPMENTS,Extra 格) | [global.h:71](../../reference/sdlpal/global.h#L71) |
| 上玩家状态 `0x2D` / `PAL_SetPlayerStatus` | [script.c:1367](../../reference/sdlpal/script.c#L1367) / [global.c:2173](../../reference/sdlpal/global.c#L2173) |
| 给玩家加毒 `0x29` / `PAL_AddPoisonForPlayer` | [script.c:1257](../../reference/sdlpal/script.c#L1257) / [global.c:1459](../../reference/sdlpal/global.c#L1459) |
| 设额外属性 `0x17`(写 Extra 格,`i=op0−0xB`) | [script.c:752](../../reference/sdlpal/script.c#L752) |
| 毒抗累加(含 Extra 格)`PAL_GetPlayerPoisonResistance` | [global.c:1900](../../reference/sdlpal/global.c#L1900) |
| 中毒概率 gate `毒抗 < RandomLong(1,100)` | [fight.c:5141](../../reference/sdlpal/fight.c#L5141) |
| **战后三件套** ClearAllStatus + CurePoisonByLevel(3) + RemoveEquip(Extra) | [battle.c:1822-1830](../../reference/sdlpal/battle.c#L1822-L1830) |
| `PAL_ClearAllPlayerStatus` / `PAL_RemoveEquipmentEffect` | [global.c:2311](../../reference/sdlpal/global.c#L2311) / [1372](../../reference/sdlpal/global.c#L1372) |
| `PAL_UpdateEquipments`(换装 / 读档 memset 全清) | [global.c:1333](../../reference/sdlpal/global.c#L1333) / [1354](../../reference/sdlpal/global.c#L1354) |
| 金刚符63 `0x2D[6,7]` / 毒蛇卵117 `0x29[_,551]` / 大蒜84 `0x17[17,22,30]` | `data/extracted/data/items.json` + `events/all.json` 反汇编 |

---

## 状态刷新 / 死亡 / 复活 / 梦蛇 / 明王觉醒（2026-07-14 作者补充）

> 作者指出四组一阶段反复调过的战斗状态机制，下列均为 sdlpal 源码直读 + 一阶段实现核实。

### 1. 回梦重复释放：我方不重置 vs 敌方重置

**我方**（`PAL_SetPlayerStatus` [global.c:2225](../../reference/sdlpal/global.c#L2225)）：坏状态（confused/sleep/silence/paralyzed）**已有(>0)则不刷新** → 重复对已睡眠的我方施回梦，**不重置睡眠回合数**（保持原剩余回合）。

**敌方**（0x2E [script.c:1391](../../reference/sdlpal/script.c#L1391)）：`g_Battle.rgEnemy[wEventObjectID].rgwStatus[op0] = op1` —— **直接赋值，无"已有不刷新"判断** → 重复对已睡眠的敌方施回梦，**重置睡眠回合数**。

这是**我方与敌方的状态设置规则不对称**——我方走 `PAL_SetPlayerStatus`（有坏状态保护），敌方走 `0x2E` 直接写（无保护）。一阶段 `battle-opcodes.ts:248` 的 `BAD_STATUS` Set 只覆盖我方 `0x2D` 路径；敌方 `0x2E` 走 `applyEnemyStatus` 直接赋值，**恰好忠实原版**。

### 2. 梦蛇死亡不清除，复活后仍在

梦蛇 = 完整脚本链（all.json [43024-43032]）：
- `0x22` 复活赵灵儿 + 林月如（10% HP）
- `0x31` 临时换战斗精灵（`rgwSpriteNumInBattle`，[battle-state.ts:73](../../packages/game/src/core/battle/battle-state.ts#L73)）
- `0x30` buffStat row=17(attackStrength) **100%** → 武术 +100% 空装基础值（写 Extra 槽 `rgEquipmentEffect[kBodyPartExtra]`）
- `0x30` buffStat row=20(dexterity) **100%** → 身法 +100% 空装基础值
- `0x2D` 设状态 kStatusDualAttack(6) duration=9 → 连击 9 回合

**死亡不清的部分**：
- `0x31` 换精灵写 `rgwSpriteNumInBattle` —— **不在 `rgPlayerStatus`** → 复活不清。
- `0x30` buffStat 写 `rgEquipmentEffect[Extra=6]` —— **不在 `rgPlayerStatus`** → 复活不清；只在战后三件套 `removeEquipmentEffect(role, kBodyPartExtra)` 时清。
- `0x2D` DualAttack 写 `rgPlayerStatus[kStatusDualAttack]` —— **在 `rgPlayerStatus`** → 复活 `0x22` 的 `PAL_RemovePlayerStatus(w, x)` 遍历全清 → **DualAttack 复活后清除**。

→ 梦蛇死后复活：**换精灵 + 武术/身法 buff 仍在**（Extra 槽 + sprite 不被复活清），但 **DualAttack 连击被清**（status 被复活清）。直到战斗结束三件套才全清。

### 3. 死亡不清 buff/debuff，复活才清

sdlpal 真值：
- **死亡**（HP→0）：**不清任何状态**。`rgPlayerStatus` 保留，只是 `canAct`/`canCastMagic` 跳过死人。
- **复活**（`0x22`）：`for (x=0; x<kStatusAll; x++) PAL_RemovePlayerStatus(w, x)` 遍历全清（[script.c:1071-1075](../../reference/sdlpal/script.c#L1071)）。

→ **傀儡虫控制的死者带着死前的 buff/debuff**：傀儡是 `kStatusPuppet`，死亡时保留（`PAL_SetPlayerStatus` 的 puppet 分支只检 HP==0 且取较长），复活时才被 `RemovePlayerStatus` 清。

### 4. 明王战赵灵儿觉醒 + 站位

**原始数据入口**：`data/extracted/data/enemy-objects.json` 中镇狱明王对象
`objectIndex=519` 的 `scriptOnTurnStart=42237`。第一次执行是 `all.json@42237-42298`
的战前对白，`end advance` 后脚本指针推进；下一阶段 `42299-42331` 才是觉醒。它与
`scene-146 onEnter` 无关，也不是 `43016-43140` 那组法术成功脚本。

觉醒核心是 `all.json@42309-42316` 连续八条 `0x19`。`0x19` 的原义见
[script.c:813](../../reference/sdlpal/script.c#L813)：把 `g.PlayerRoles` 当作按角色排列的 WORD 行表，执行
`row[role] += SHORT(delta)`；`operand[2]=2` 表示 `role=2-1=1`，即赵灵儿。

| 原始 entry | 指令 | PlayerRoles row | 固定增长 |
|---:|---|---:|---:|
| 42309 | `0x19 [7,170,2]` | maxHP | **+170** |
| 42310 | `0x19 [8,190,2]` | maxMP | **+190** |
| 42311 | `0x19 [6,11,2]` | level | **+11** |
| 42312 | `0x19 [17,100,2]` | attackStrength（武术） | **+100** |
| 42313 | `0x19 [18,155,2]` | magicStrength（灵力） | **+155** |
| 42314 | `0x19 [19,55,2]` | defense（防御） | **+55** |
| 42315 | `0x19 [20,80,2]` | dexterity（身法） | **+80** |
| 42316 | `0x19 [21,30,2]` | fleeRate（吉运） | **+30** |

随后 `42317: 0x22 [1,10,0]` 把全队死者按 `maxHP × 10/10` 复活并清毒/状态，
`42318: 0x1D [1,9999,9999]` 给全队 HP/MP 加 9999（封顶到新上限），
`42319: 0x92 [2,0,0]` 播赵灵儿所在队伍位置的施法/白闪演出，最后显示“赵灵儿力量觉醒”。

**结论**：原版确实让赵灵儿直接升 11 级并永久增加七项固定属性。这里完全不调用
`0x8D` / `PAL_PlayerLevelUp`，所以没有随机成长，也不是 `0x30` Extra 槽临时 buff；死亡、复活和
战后三件套都不会清掉。此前误判的原因是把 `data/extracted/data/spells.json` 引用的
`43016-43140` 法术脚本错当成明王的 `scriptOnTurnStart`。

一阶段实现已经覆盖该机制：`equip-effect.ts:96` 明确记录 `all.json@42309`，
`event-system.test.ts:1020` 钉住战内 `0x19` 写基础属性后立即回灌战斗 snapshot，避免新 maxHP/武术
只在菜单生效；`event-system.test.ts:4015` 另钉 PlayerRoles row 映射。

**站位**：明王开战链在 `all.json@24104` 执行 `0x75 [1,2,3]`，按
[script.c:2164](../../reference/sdlpal/script.c#L2164) 减一后队伍为
`[李逍遥(role 0), 赵灵儿(role 1), 林月如(role 2)]`；`24108` 才开始敌队 188 的战斗。
三人阵型 `g_rgPlayerPos[2]`（[battle.c:27](../../reference/sdlpal/battle.c#L27)）依次为
`(180,180) / (234,170) / (270,146)`，所以赵灵儿是 `party[1]` 的中间位，李逍遥并未离队。
一阶段 `event-system.ts:4935` 已按 `operand - 1` 实现该队伍顺序。
