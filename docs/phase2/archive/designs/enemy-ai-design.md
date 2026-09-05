# 敌人 AI 设计(M4c)—— 策略/演出分层 × 条件规则列表(2026-07-04 用户定调)

> 方向(用户拍板):**战斗策略与剧情演出分开**——
> ① **敌人 AI = 纯战斗策略**(普攻/施法/变身/分裂/召唤),条件规则列表表达,行为默认对齐
> 原版(硬验收),**策略灵活性词汇留足**(目标选择/战场感知,难度分级与 DLC 敌人在编辑器配);
> ② **剧情演出借战斗舞台**(蛇女嘲讽逃跑/觉醒特效/boss 对白)= 战斗演出钩子,**复用事件脚本
> Command[] 词汇忠实执行**,不属于 AI。
> 取证:一阶段 `enemy-ai.ts`(fallback 四态)+ `battle-opcodes.ts`(~40 战斗 op,变身/召唤/
> 分裂/逃跑全在脚本层)+ reforge `battle-core.ts` 现状(敌人纯普攻桩)。

## 0. 目标 / 非目标

- 目标:153 敌全部有正确行为(85 会施法 + 54 带脚本);石长老变身、血云雾分裂可玩;
  嘲讽/逃跑类剧情演出忠实执行;编辑器可表格化编辑;难度分级留结构口。
- 非目标:**默认行为**变聪明(normal 档 = 原版笨行为,难度手感 = 复刻的一部分)——
  聪明策略是**编辑器里可配的能力**,不是引擎替内容做主;
  战后剧情脚本(`scriptOnBattleEnd`)不属于 AI,单列(§6);玩家施法指令(M4b-3 欠账)不在本设计,
  但施法**结算管线**共用(§5)。

## 1. Schema(content/enemy.ts)

```ts
/** 敌人 AI:条件规则列表。每个触发点从上到下取首条命中执行;行动类无命中 → 普攻。 */
interface EnemyAI {
  resistanceToSorcery: number      // 异常抗性(保留)
  rules?: AiRule[]                 // 缺省 = 纯普攻
}

interface AiRule {
  /** 触发点:turnStart = 每轮起手(演出/状态,不占行动);act = 轮到自己行动(决策)。 */
  at: 'turnStart' | 'act'
  /** 条件,缺省恒真(兜底)。 */
  when?: AiCond
  do: AiAction
  /** once = 整场只触发一次(boss 嘲讽只说一遍;原版 advance 返回值语义)。 */
  once?: boolean
}

type AiCond =
  | { kind: 'hpBelow'; percent: number }      // 原版 0x64 的补
  | { kind: 'hpAbove'; percent: number }      // 0x64
  | { kind: 'turn'; op: '==' | '>='; value: number }   // 0x68
  | { kind: 'chance'; percent: number }        // fallback magicRate 门
  | { kind: 'aloneAlive' }                     // 场上仅剩自己(0x9C 分裂前提)
  | { kind: 'firstOfKind' }                    // 同种敌首只(0x91)
  | { kind: 'anyPlayerHpBelow'; percent: number }  // 战场感知(灵活策略口:补刀/压制)
  | { kind: 'allyCount'; op: '<=' | '>='; value: number } // 己方数量(召唤/龟缩条件)
  | { kind: 'difficulty'; min: Difficulty }    // 难度口(§7)
  | { kind: 'all' | 'any'; of: AiCond[] }
  | { kind: 'not'; cond: AiCond }

/** 目标选择策略(灵活策略核心口)。原版 = random;其余给难度/DLC 敌人在编辑器配。 */
type AiTarget = 'random' | 'lowestHp' | 'highestHp' | 'lowestMp' | 'strongest'

type AiAction =
  | { kind: 'attack'; target?: AiTarget }       // 普攻(兜底;缺省 random = 原版)
  | { kind: 'cast'; skillId: string; target?: AiTarget }  // 施法(走 SkillEffect 管线)
  | { kind: 'summon'; enemyId?: string; count: number }   // 0x9E;缺省同种
  | { kind: 'transform'; enemyId: string }      // 0x9F:保当前 HP 换形态/数值
  | { kind: 'divide'; copies: number }          // 0x9C:血云雾分裂
  | { kind: 'flee' }                            // 逃出战场(无奖励;剧情性逃跑走 §1b 演出)
  | { kind: 'pass' }                            // 0xFFFF magic 哨兵

/** §1b 战斗演出钩子(剧情借战斗舞台,**不是 AI**;用户定调 2026-07-04):
 *  蛇女嘲讽→逃跑、boss 对白、觉醒特效等。复用事件脚本 Command 词汇忠实执行
 *  (dialog/wait/…,战斗对话条播放;战斗专用命令如 fleeBattle 少量新增)。 */
interface EnemyDef {
  // ...
  choreography?: { at: 'battleStart' | 'turnStart'; once?: boolean; when?: AiCond; body: Command[] }[]
}
```

要点:
- **choreography 不占行动、不进 AI 规则**;turnStart 钩子在进指令菜单前逐条播(原版同语义)。
- act 规则首条命中即本回合行动;目标策略缺省 random(原版),灵活策略编辑器配置。
- 原版 `0x67`(战中改 magic/magicRate)**消解**:翻译成带条件的 cast 规则,不需要"改参数"动作。
- `magic/magicRate` 字段退役:fallback 施法翻成两条规则
  `[act, chance magicRate×10] cast` + `[act] attack`(迁移器生成,行为概率分布对齐)。

## 2. 引擎执行语义(battle-core)

- **轮起手**(进指令菜单前):对全体活敌按槽序跑 `turnStart` 规则(隐身敌跳过)。
  say → 战斗对话条(§5);once 规则记 `firedRules: Set<ruleIdx>`(战斗态,不进存档)。
- **行动时**(队列轮到该敌):睡眠/麻痹 → pass;混乱 → 打友方(引擎内建,非规则);
  沉默 → 跳过 cast 规则继续匹配;否则从上到下取首条命中的 act 规则执行。
- 规则求值顺序 = 数组序;**RNG 流不承诺与原版逐骰一致**(clean 引擎,只对齐概率分布)。
- transform 语义(对齐原版 DM1):换 stats/精灵**保当前 HP**,规则列表换成新形态的,once 状态清零。
- divide 语义:仅 `aloneAlive && hp>1`;副本继承同 EnemyDef 与规则状态(fresh)。
- summon:空槽不足则不发(编辑器校验提示);同种缺省。

## 3. 迁移映射(migrate-enemies M4c 段)

| 原版 | 翻译去向 |
|---|---|
| fallback `magic+magicRate` | AI:`[act, chance rate×10] cast` + 兜底 attack(85 敌) |
| `0x64` HP% 跳 + `0x9F` | AI:`[act, hpBelow N] transform` |
| `0x9C` 分裂 | AI:`[act, aloneAlive] divide` |
| `0x9E` 召唤(常带 0x68 回合条件) | AI:`[act, turn≥N / chance] summon` |
| `0x67` 改参数 | AI:消解为条件 cast 规则 |
| `scriptOnTurnStart` 嘲讽/对白链 | **演出**:`choreography[turnStart, once] body=[dialog…]`(0x91 → firstOfKind;plain 返回 = 不带 once)|
| `0x69` 剧情逃跑链(蛇女等) | **演出**:`choreography body=[dialog…, fleeBattle]`(忠实保序) |
| `0x92` 特效 / 剧情战演出(灵儿觉醒等) | **演出**:能翻的进 choreography;翻不净 → unmigrated 标注 + 编辑器手修(同 M3 方针) |
| `scriptOnBattleEnd` | 不进 AI:翻成事件命令挂 `EnemyDef.onDefeated?: Command[]`(§6) |

**敌方法术数据缺口**:`magic` 是原版法术 id(如 339),不在玩家 80 技能表里。
迁移器补一段:敌用法术 → `skills.json` 增补(公式同 calcMagicDamage,效果走 SkillEffect;
id 规范 `skill-<num>` 与现有一致)。

## 4. 施法结算(与玩家共用的管线)

`applySkillEffect(caster, targets, skill, state)` 落 battle-core:cast 动作走它;
M4b-3(玩家施法/物品指令)之后复用同一管线,只差指令 UI。伤害走已端口的
`calcMagicDamage`(元素抗性 + 战场加成,12 golden 钉着)。

## 5. 战斗内对话条(say 的 UI)

battle-session 加极简对话横幅(顶部,按键推进;复用 locale)。turnStart 的 say 逐条播完
再进指令菜单(原版同语义:嘲讽在菜单前)。

## 6. 战后剧情钩(onDefeated)

`scriptOnBattleEnd`(胜利后对白/给物/旗标)= 事件脚本,不是 AI:
`EnemyDef.onDefeated?: Command[]`(复用场景脚本 Command 词汇与解释器,胜利结算时逐敌跑)。
迁移器能翻多少翻多少,翻不净标注。

## 7. 难度分级留口(用户预告 + 2026-07-04 扩展定调;本期只留结构)

**难度 = 预设(preset)= 规则开关集合,不是三档枚举。** 用户举例(全部"后续慢慢实现",
归难度正式立项;此处存底防丢):

- 数值/技能/伤害/奖励:按难度调敌人属性系数、敌人技能档(difficulty 条件规则)、奖励倍率;
- **硬核存档**:不能主动存档,仅退出时自动存档;
- **野怪不复活**:不能刷级(遭遇规则);
- **宝箱随机化**(randomizer 要素):野外宝箱物品随机。

地基(本期已落):
- `Difficulty = string`(预设 id,进存档;缺省 'normal'),预设 schema(各系统开关 +
  数值系数表)立项时定 —— 各系统读各自开关,互不耦合;
- 行为轴:`AiCond.difficulty { in: [预设…] }`(预设无全序,用集合命中)——
  normal 预设规则 = 原版行为(硬验收基线);
- 数值轴:startBattle 组装敌我数值处预留缩放点(纯乘法变换,不污染内容数据)。

## 8. 分片与验收

- **M4c-1**:schema(rules + choreography 双口)+ 规则求值器 + fallback 迁移(85 施法敌)+
  敌方法术迁入 skills + cast 结算管线。验收:含施法敌的真实敌队打一场,施法频率/伤害对齐一阶段同战。
- **M4c-2**:54 条脚本翻译(策略 → rules;对白/剧情逃跑/特效 → choreography)+ 战斗对话条 +
  onDefeated。验收:石长老变身链、血云雾分裂(AI)+ 蛇女嘲讽逃跑(演出)三个标志战逐拍可玩;
  翻不净清单出报告。
- **M4c-3**:编辑器敌人 AI 规则表格 + 演出钩子编辑(战斗数据面板扩展,同 C1 范式)。
- 回归:battle-core 测试扩展(规则求值/transform 保血/divide 条件/once 语义/目标策略),
  迁移 golden(样例敌规则快照)。
