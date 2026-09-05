# 物品 / 装备数据架构设计(item & equipment data)

> 状态:设计(2026-06-29)。物品(装备 / 使用 / 投掷)的数据地基 —— 物品菜单(装备 / 使用拆分)、战斗投掷、装备属性计算都长在它上。
> 依据:roadmap §3(稳定 id / schema 留扩展口)、[D18](../../decisions.md);镜像 [skill-data-design](skill-data-design.md) 的三层做法。
> 本期**聚焦装备**;`use`/`throw` 只定基类口、细化留后。

## 0. 核心认识(已一手核验 items.json + item-status.md)

- 原版物品 = 一条定义 + **独立能力位** `flags{usable, equipable, throwable, …}`(不是互斥类型)。菜单**按能力过滤**:用 / 装 / 掷。
- **双重身份天然支持**:6 颗灵珠(圣/风/雷/水/火/土,`usable && equipable`)既能用又能装 —— 一条物品挂多个能力块即可,零特判。
- 234 件:可装 106 / 可用 100 / 可掷 83(装+掷重叠 32,多数武器能掷)。
- **槽位不在物品数据里**(原版靠 scriptOnEquip 的 0x18 运行时定槽)→ clean-rewrite **提成显式字段**。
- 装备效果来自 scriptOnEquip 的 opcode:`0x17` 属性加成 / `0x1A` 最大HP·MP·授法术·全体攻 / `0x2D` 永久状态。

## 1. 设计原则:一物多能力,拆分在菜单层

**"彻底拆分"发生在菜单过滤,不在数据层。** 一条 `ItemData` 挂可选能力块,菜单按能力块存在与否过滤:

| 能力块 | 进哪个菜单 | 触发 |
|---|---|---|
| `equip?` | 【装备】菜单(大世界) | 装备 → 跑 EquipEffect |
| `use?` | 【使用】菜单(大世界 + 战斗) | 使用 → 跑 ItemUseEffect |
| `throw?` | 【投掷】菜单(**战斗内**) | 投掷 → 战斗效果(phase3) |

灵珠同时有 `equip` + `use` → 两菜单都出现,自然。

## 2. ItemData 基类(content/src/item.ts)

```ts
interface ItemData {
  id: string          // demo=原版 oid 字符串;当不透明 string
  name: string
  desc: string        // 原版 scriptDesc → 直接文字
  icon: number        // 图标 bitmap(BALL.MKF chunk;渲染用)
  buyPrice: number    // 买价(原版 wPrice)
  sellPrice: number   // 卖价(原版=买价/2,但 clean-rewrite 显式存,可独立定)
  sellable: boolean   // 可卖(原版 flag)
  // —— 能力块(可叠加;有则进对应菜单)——
  equip?: EquipSpec   // 本期重点
  use?:   UseSpec     // 本期留口,使用菜单时细化
  throw?: ThrowSpec   // phase3 战斗投掷
}
```

## 3. 装备能力 EquipSpec + EquipEffect(本期重点)

```ts
// 6 装备槽,对齐原版 body part(kBodyPartHand/Head/Body/Shoulder/Feet/Wear)
type EquipSlot = 'weapon' | 'head' | 'body' | 'cloak' | 'feet' | 'accessory'
//                手(武器)   头      身      披风       足      手饰

interface EquipSpec {
  slot: EquipSlot
  equipableBy: string[]   // 角色模板 id(原 equipableBy[6] bitfield → 稳定 id 列表)
  effects: EquipEffect[]  // 穿戴时生效(有序)
}

// clean-rewrite scriptOnEquip 的 opcode 链;复用技能地基的 StatusId / skillId
type EquipEffect =
  | { kind: 'statBonus'; stat: CombatStat; delta: number } // 0x17(可负,如铁锁衣防御-10);CombatStat=attack/magicAttack/defense/speed/luck(对齐 CharacterInstance)
  | { kind: 'resistance'; element: 'poison'|'wind'|'thunder'|'water'|'fire'|'earth'; percent: number } // 0x17[22-27]
  | { kind: 'maxPool'; pool: 'hp'|'mp'; delta: number }   // 0x1A
  | { kind: 'grantStatus'; status: StatusId }             // 0x2D 永久(仙女剑→连击/dualAttack)
  | { kind: 'grantSkill'; skillId: string }              // 0x1A 授合击/召唤(圣灵珠→武神;土灵珠→山神)
  | { kind: 'attackAll' }                                // 0x1A(长鞭:全体攻击)
```

- **`statBonus` 本期就算**(见 §5 有效属性);`resistance/maxPool/grantStatus/grantSkill/attackAll` 本期**定形状、不跑引擎**(角色 resist 字段、授法术/状态的运行时 = phase3,同技能 effects 的引擎留后)。
- ✅ **已核实 row→属性**(equip-effect.ts 真值):row17=attack / 18=magicAttack / 19=**defense** / 20=dexterity(→speed)/ 21=fleeRate(运气)/ 22=毒抗 / 23-27=风雷水火土抗 / 65=授合击。**⚠ item-status.md 把 row19 误标"运气",实为 defense** —— demo 已据此(各防具是 defense+N)。

## 4. 装备槽对齐(要动状态板)

| 新 slot | 原版 body part | 状态板现状 | 动作 |
|---|---|---|---|
| `weapon` | part 3 Hand | weapon | 不变 |
| `head` | part 0 Head | head | 不变 |
| `body` | **part 2**(sdlpal 名 Shoulder,实装防具:布袍/铠甲) | body | 不变 |
| `cloak` | **part 1**(sdlpal 名 Body,实装身饰:披风/护肩) | (无,旧 accessory≈) | **新增披风槽** |
| `feet` | part 4 Feet | feet | 不变 |
| `accessory` | part 5 Wear(手饰) | amulet | **旧 amulet 改名 accessory** |

> ⚠ sdlpal 枚举名 `Body(1)`/`Shoulder(2)` 与中文类目相反(part1 实装身饰/披风、part2 实装防具)——按「实际装什么」命名 `cloak`/`body`;槽↔part 解码自 `0x18` operand(`EQUIPMENT_n` row 11-16 → part)已核验。

→ 改 `reforge/menu/menu-box.ts` 的 `EQUIP_SLOTS` + `content/locale.ts` 的 `equip.*` 标签 + `bake-assets` 的 equip-demo slot 名,统一到这 6 个。

## 5. 持有 / 穿戴 / 有效属性

```ts
// 持有(WorldState,跟存档)
WorldState.inventory: { itemId: string; count: number }[]   // 镜像 phase-1 InventoryEntry
// 穿戴(CharacterInstance,已存在)
CharacterInstance.equipment: Record<EquipSlot, string>      // slot → itemId
```

- **有效属性 = 基础 + Σ 已穿戴 statBonus**(纯函数,镜像 phase-1 equip-effect)。本期实现 `statBonus`,让状态板穿装即变数字 —— 装备才"有意义"。resist/grant 计算 phase3。
- 装备动作:从 inventory 取可装物(该角色 `equipableBy`)→ 放进对应 `slot`(原物退回 inventory)。

## 6. use? / throw?(本期留口,不细化)

```ts
interface UseSpec {
  target: 'oneAlly'|'allAllies'|'self'|'scene'    // 场景用途显式使用 scene
  consuming: boolean                               // 用后消耗(原 consuming flag)
  effects: ItemUseEffect[]
}
```

**`ItemUseEffect` 是独立联合,不等同 SkillEffect**(作者点明:用物品大量是脚本/剧情/场景):
- 回复重叠类(概念同 SkillEffect):`healHp / healMp / revive / curePoison / removeStatus / applyStatus`
- 物品独有:`permanentStatBoost`(0x19 舍利子防御+3)、`triggerScript`(桂花酒/玉佩等剧情)、`teleport`(引路蜂回迷宫口 0x38)、`giveItems`/`giveMoney`(包袱 0x1E)、`learnSkill`(手卷授技 0x55)、`scenePlace`(捕兽夹/芦苇漂 0x84 放置场景物)、`transform`(梦蛇变身)、`levelUp`(金蚕王)、`craft`(紫金葫芦炼丹)…
- **细化留到做使用菜单时**(本期只定 `use?` 口的形状,不实现)。

```ts
interface ThrowSpec { /* phase3 战斗投掷:对敌 damage/施毒/秒杀…,届时细化 */ }
```

## 7. demo 数据(本期)

李逍遥可装的 6 件(slot/delta 已解码 scriptOnEquip 字节码 + equip-effect.ts row 表;⚠ row19=defense,item-status 的"运气"是误标):

| oid | name | slot | icon/买/卖 | 效果(已核验) |
|---|---|---|---|---|
| 166 | 木剑 | weapon | 56 / 50 / 25 | attack+2, speed+3 |
| 196 | 头巾 | head | 176 / 40 / 20 | defense+1 |
| 208 | 布袍 | body | 78 / 100 / 50 | defense+3 |
| 225 | 披风 | cloak | 95 / 160 / 80 | defense+2 |
| 235 | 草鞋 | feet | 97 / 30 / 15 | defense+1 |
| 249 | 护腕 | accessory | 224 / 70 / 35 | defense+2 |

(全部 equipableBy 含李逍遥;demo equipableBy 仅填 `['li-xiaoyao']`,全量 6 角色映射留 migrate。)

+ **1 颗灵珠验证双重身份**:土灵珠(267)`equip{slot:accessory, effects:[resistance earth+50, grantSkill 山神(336)]}` + `use{triggerScript 剧情 stub}` —— 能力块模型 + grantSkill/resistance 形状(不跑引擎)。

## 8. 边界(现在 vs 后)

- ✅ **现在**:`ItemData` 基类 + `EquipSpec`/`EquipEffect` 全形 + 6 槽(改状态板)+ `inventory` + **statBonus 有效属性**(状态板反映)+ 装备菜单(单人:选装→穿/卸)+ 李逍遥 demo + 1 灵珠样例。
- ⏸ **后**:使用菜单(`ItemUseEffect` 细化)、战斗投掷、resist/grant/attackAll 计算引擎、买卖商店、物品分类 tab、migrate 全量 234 件。

## 9. Self-Review

1. **能力块覆盖**:equip/use/throw 三能力对三菜单;双重身份(灵珠)零特判。✅
2. **真值无臆测**:能力位/6 灵珠/6 槽/效果 opcode 均一手核验;delta 与 row 映射标注 plan 时核。✅
3. **镜像技能地基**:ItemData(=SkillData)/ EquipEffect(=SkillEffect 判别联合)/ DEMO_ITEMS(=DEMO_SKILLS Record)/ inventory(=learnedSkills 关系表)。一致。✅
4. **use ≠ skill**:ItemUseEffect 独立联合(含脚本/剧情/场景类),不强等同 SkillEffect。✅
5. **稳定 id / 扩展口**:id 不透明 string;能力块可选;effects 数组可加 kind;6 槽可扩。✅
6. **范围克制**:本期只 equip + statBonus 计算;use/throw/引擎/商店/分类留后。✅
