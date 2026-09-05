> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行
> 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与
> 对应任务卡为准。

# 装备地基 实现计划(item.ts + 6 槽 + inventory + 有效属性)

> **For agentic workers:** 交 GLM 执行,Claude 审 + 深验。第二阶段 Reforge,先读 [READ-FIRST](../READ-FIRST.md)。
> 依据设计:[item-data-design.md](item-data-design.md)(**先读**)。本计划只做**装备地基数据/逻辑(纯 content,非视觉)**;装备菜单 UI、状态板接有效属性 = Claude 后续做。

**Goal:** 在 `@type-pal/content` 落地装备地基 —— ① `ItemData` 基类 + `EquipEffect` 联合 + 6 槽 + demo 装备、② `WorldState.inventory` + 李逍遥初始穿戴、③ 有效属性纯函数(base + Σ statBonus)。

**Architecture:** 纯 content 数据 + 类型 + 纯函数,**零引擎/reforge 依赖**。镜像技能地基(skill.ts):判别联合 effects、`Record<id,Data>` demo、关系态在 WorldState。

**Tech Stack:** TypeScript;vitest;包 `@type-pal/content`。

## Global Constraints

- **阶段隔离(D18)**:装备数据只在 content;`id`/`slot` 当不透明 string。
- **真值锚(已一手核验,勿改成猜测)**:DEMO_ITEMS 的 slot/effect/price/icon 全部解码自 `scriptOnEquip` 字节码 + `items.json` + `equip-effect.ts` row 表(见各注)。⚠ 注意 item-status.md 把 row19 误标"运气",**实为 defense**(equip-effect.ts `PLAYERROLES_ROW.DEFENSE=19` 真值)。
- **每 Task 收尾**:`pnpm --filter @type-pal/content run check` 绿;`pnpm --filter @type-pal/content exec biome check src/` 0/0。
- **自包含**:存值,不存 `scriptOnEquip` 指针。

---

## Task 1: item.ts —— ItemData 基类 + EquipEffect + 6 槽 + DEMO_ITEMS

**Files:** Create `packages/content/src/item.ts` + `item.test.ts`;Modify `packages/content/src/index.ts`(追加 re-export)。

**Interfaces produced:** `CombatStat`, `EquipSlot`, `EQUIP_SLOT_IDS`, `EquipEffect`, `EquipSpec`, `ItemUseEffect`, `UseSpec`, `ThrowSpec`, `ItemData`, `DEMO_ITEMS`。

- [ ] **Step 1: 写失败测试** —— `packages/content/src/item.test.ts`

```ts
import { describe, expect, test } from 'vitest'
import { DEMO_ITEMS, EQUIP_SLOT_IDS } from './item.js'

describe('ItemData / 装备数据', () => {
  test('6 槽对齐原版 body part', () => {
    expect(EQUIP_SLOT_IDS).toEqual(['weapon', 'head', 'body', 'cloak', 'feet', 'accessory'])
  })
  test('木剑(166):武器槽,攻击+2 身法+3', () => {
    const it = DEMO_ITEMS['166']
    expect(it?.name).toBe('木剑')
    expect(it?.equip?.slot).toBe('weapon')
    expect(it?.equip?.effects).toEqual([
      { kind: 'statBonus', stat: 'attack', delta: 2 },
      { kind: 'statBonus', stat: 'speed', delta: 3 },
    ])
    expect(it?.buyPrice).toBe(50)
    expect(it?.sellPrice).toBe(25)
  })
  test('布袍(208):身体槽 defense+3(非"运气")', () => {
    expect(DEMO_ITEMS['208']?.equip?.slot).toBe('body')
    expect(DEMO_ITEMS['208']?.equip?.effects).toEqual([{ kind: 'statBonus', stat: 'defense', delta: 3 }])
  })
  test('土灵珠(267):双重身份 —— 既可装(土抗+授山神)又可用', () => {
    const it = DEMO_ITEMS['267']
    expect(it?.equip?.slot).toBe('accessory')
    expect(it?.equip?.effects).toContainEqual({ kind: 'resistance', element: 'earth', percent: 50 })
    expect(it?.equip?.effects).toContainEqual({ kind: 'grantSkill', skillId: '336' }) // 山神
    expect(it?.use).toBeDefined() // 可用 → 也进使用菜单
  })
})
```

- [ ] **Step 2: 跑测试确认失败** — `pnpm --filter @type-pal/content exec vitest run src/item.test.ts` → FAIL(模块不存在)

- [ ] **Step 3: 写 `packages/content/src/item.ts`**

```ts
// 物品 / 装备数据 ① 层。见 docs/phase2/foundation/item-data-design.md。
// 阶段隔离(D18):纯 content 数据 + 类型,无 reforge/引擎依赖。
import type { StatusId } from './skill.js'

/** 战斗属性(对齐 CharacterInstance 的 5 项)。 */
export type CombatStat = 'attack' | 'magicAttack' | 'defense' | 'speed' | 'luck'

/** 6 装备槽(对齐原版 body part;名按"装什么"取,见 design §4)。 */
export const EQUIP_SLOT_IDS = ['weapon', 'head', 'body', 'cloak', 'feet', 'accessory'] as const
export type EquipSlot = (typeof EQUIP_SLOT_IDS)[number]

/** 装备效果 = clean-rewrite scriptOnEquip 的 opcode(0x17/0x1A/0x2D);复用技能地基 StatusId/skillId。 */
export type EquipEffect =
  | { kind: 'statBonus'; stat: CombatStat; delta: number } // 0x17(可负,如铁锁衣防御-10)
  | { kind: 'resistance'; element: 'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth'; percent: number } // 0x17[22-27]
  | { kind: 'maxPool'; pool: 'hp' | 'mp'; delta: number } // 0x1A
  | { kind: 'grantStatus'; status: StatusId } // 0x2D 永久(仙女剑→连击)
  | { kind: 'grantSkill'; skillId: string } // 0x1A row65 授合击/召唤(土灵珠→山神 336)
  | { kind: 'attackAll' } // 0x1A(长鞭)

export interface EquipSpec {
  slot: EquipSlot
  equipableBy: string[] // 角色模板 id(原 equipableBy[6] bitfield → 稳定 id);demo 仅 li-xiaoyao
  effects: EquipEffect[]
}

/** 使用效果 = 独立联合(≠ SkillEffect):回复类概念重叠 + 脚本/剧情/场景类。本期起步几个 kind,做使用菜单时扩充。 */
export type ItemUseEffect =
  | { kind: 'healHp'; amount: number }
  | { kind: 'healMp'; amount: number }
  | { kind: 'applyStatus'; status: StatusId; turns: number }
  | { kind: 'triggerScript'; scriptId: string } // 桂花酒/玉佩剧情;风灵珠场景互动
  | { kind: 'teleport'; target: string } // 引路蜂回迷宫口
// 待扩充:giveItems / giveMoney / learnSkill / scenePlace / transform / permanentStatBoost …(使用菜单时)

export interface UseSpec {
  target: 'oneAlly' | 'allAllies' | 'self' | 'scene'
  consuming: boolean
  effects: ItemUseEffect[]
}

/** 战斗投掷,phase3 细化。 */
export interface ThrowSpec {
  effects: ItemUseEffect[] // 占位:投掷效果届时可能独立联合
}

/** 物品基类。能力块(equip/use/throw)可叠加;菜单按能力块过滤(灵珠双重身份零特判)。 */
export interface ItemData {
  id: string // demo = 原版 oid 字符串;当不透明 string
  name: string
  desc: string
  icon: number // 图标 bitmap(BALL.MKF chunk)
  buyPrice: number
  sellPrice: number
  sellable: boolean
  equip?: EquipSpec
  use?: UseSpec
  throw?: ThrowSpec
}

/**
 * demo 物品 —— 李逍遥的 6 件装备 + 1 颗双重身份灵珠。
 * 真值:slot/effect 解码自 scriptOnEquip 字节码(events/all.json),delta 经 equip-effect.ts row 表确认:
 *   row17=attack / row20=dexterity(→speed) / row19=DEFENSE(⚠ item-status 误标"运气")/ row23-27=元素抗 / row65=授合击。
 *   icon/price = items.json;sellPrice = floor(price/2)。
 *   木剑166: 0x17[_,17,2]+0x17[_,20,3] = 攻+2 身法+3;头巾196 row19+1;布袍208 row19+3;披风225 row19+2;
 *   草鞋235 row19+1;护腕249 row19+2;土灵珠267 0x17[_,27,50]=土抗+50 + 0x1A[65,336]=授山神。
 */
export const DEMO_ITEMS: Record<string, ItemData> = {
  '166': {
    id: '166', name: '木剑', desc: '攻击+2 身法+3', icon: 56, buyPrice: 50, sellPrice: 25, sellable: true,
    equip: { slot: 'weapon', equipableBy: ['li-xiaoyao'], effects: [
      { kind: 'statBonus', stat: 'attack', delta: 2 },
      { kind: 'statBonus', stat: 'speed', delta: 3 },
    ] },
  },
  '196': {
    id: '196', name: '头巾', desc: '防御+1', icon: 176, buyPrice: 40, sellPrice: 20, sellable: true,
    equip: { slot: 'head', equipableBy: ['li-xiaoyao'], effects: [{ kind: 'statBonus', stat: 'defense', delta: 1 }] },
  },
  '208': {
    id: '208', name: '布袍', desc: '防御+3', icon: 78, buyPrice: 100, sellPrice: 50, sellable: true,
    equip: { slot: 'body', equipableBy: ['li-xiaoyao'], effects: [{ kind: 'statBonus', stat: 'defense', delta: 3 }] },
  },
  '225': {
    id: '225', name: '披风', desc: '防御+2', icon: 95, buyPrice: 160, sellPrice: 80, sellable: true,
    equip: { slot: 'cloak', equipableBy: ['li-xiaoyao'], effects: [{ kind: 'statBonus', stat: 'defense', delta: 2 }] },
  },
  '235': {
    id: '235', name: '草鞋', desc: '防御+1', icon: 97, buyPrice: 30, sellPrice: 15, sellable: true,
    equip: { slot: 'feet', equipableBy: ['li-xiaoyao'], effects: [{ kind: 'statBonus', stat: 'defense', delta: 1 }] },
  },
  '249': {
    id: '249', name: '护腕', desc: '防御+2', icon: 224, buyPrice: 70, sellPrice: 35, sellable: true,
    equip: { slot: 'accessory', equipableBy: ['li-xiaoyao'], effects: [{ kind: 'statBonus', stat: 'defense', delta: 2 }] },
  },
  // 双重身份样例:可装(土抗+授山神)+ 可用(剧情,本期 stub)。证明能力块模型两菜单都出现。
  '267': {
    id: '267', name: '土灵珠', desc: '土抗+50 授山神', icon: 6, buyPrice: 0, sellPrice: 0, sellable: false,
    equip: { slot: 'accessory', equipableBy: ['li-xiaoyao'], effects: [
      { kind: 'resistance', element: 'earth', percent: 50 },
      { kind: 'grantSkill', skillId: '336' },
    ] },
    use: { target: 'scene', consuming: false, effects: [{ kind: 'triggerScript', scriptId: 'lingzhu-tu' }] },
  },
}
```

- [ ] **Step 4: re-export** —— `packages/content/src/index.ts` 末尾加(与现有风格一致):

```ts
export * from './item.js'
```

- [ ] **Step 5: 跑测试 + check + biome**

`pnpm --filter @type-pal/content exec vitest run src/item.test.ts` → PASS
`pnpm --filter @type-pal/content run check` → 绿
`pnpm --filter @type-pal/content exec biome check src/item.ts src/item.test.ts` → 0/0

- [ ] **Step 6: commit**

```bash
git add packages/content/src/item.ts packages/content/src/item.test.ts packages/content/src/index.ts
git commit -m "feat(content): 物品/装备数据 ItemData + EquipEffect 联合 + 6 槽 + 李逍遥 demo 装备"
```

---

## Task 2: 有效属性纯函数(base + Σ statBonus)

**Files:** Modify `packages/content/src/item.ts`(追加);`item.test.ts`(追加用例)。

**Interfaces produced:** `effectiveStat(char, stat, items)`。

- [ ] **Step 1: 追加失败测试** —— `item.test.ts`

```ts
import { effectiveStat } from './item.js' // 合并到顶部 import
import { instantiate, LI_XIAOYAO } from './character.js'

describe('有效属性 = base + Σ 装备 statBonus', () => {
  test('李逍遥穿满 6 件:defense = base + (1+3+2+1+2)=+9,attack +2,speed +3', () => {
    const c = instantiate(LI_XIAOYAO) // 含 initialEquipment(Task 3 设)
    expect(effectiveStat(c, 'defense', DEMO_ITEMS)).toBe(c.defense + 9)
    expect(effectiveStat(c, 'attack', DEMO_ITEMS)).toBe(c.attack + 2)
    expect(effectiveStat(c, 'speed', DEMO_ITEMS)).toBe(c.speed + 3)
    expect(effectiveStat(c, 'luck', DEMO_ITEMS)).toBe(c.luck) // 无 luck 装备 → 不变
  })
}) // ⚠ 本测试依赖 Task 3 的 initialEquipment;Task 2 先实现函数,Task 3 落地后此测试转绿
```

- [ ] **Step 2: 跑确认失败**(`effectiveStat` 未导出)

- [ ] **Step 3: 在 `item.ts` 追加**

```ts
import type { CharacterInstance } from './character.js' // 合并到顶部 import

/** 有效属性 = 角色 base + Σ 已穿戴装备的 statBonus(该 stat)。纯函数,镜像 phase-1 equip-effect。
 *  resist/grant/maxPool/attackAll 的运行时计算 = phase3 引擎,本函数只算 statBonus。 */
export function effectiveStat(
  char: CharacterInstance,
  stat: CombatStat,
  items: Record<string, ItemData>,
): number {
  const base: Record<CombatStat, number> = {
    attack: char.attack,
    magicAttack: char.magicAttack,
    defense: char.defense,
    speed: char.speed,
    luck: char.luck,
  }
  let v = base[stat]
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'statBonus' && eff.stat === stat) v += eff.delta
    }
  }
  return v
}
```

- [ ] **Step 4: check + biome**(测试 Task 3 后转全绿;本 Task 先确保 typecheck + 函数单测可跑)
- [ ] **Step 5: commit** —— `feat(content): 有效属性纯函数(base + Σ 装备 statBonus)`

---

## Task 3: WorldState.inventory + 李逍遥初始穿戴 + 槽位 locale

**Files:** Modify `packages/content/src/character.ts`(WorldState +inventory;LI_XIAOYAO.initialEquipment);`locale.ts`(6 槽标签);`character.test.ts`。

- [ ] **Step 1: 改测试** —— `character.test.ts`:`initialWorld` 那个 test 追加:

```ts
import { DEMO_ITEMS, effectiveStat } from './item.js' // 顶部 import
// …在 initialWorld test 内追加:
    expect(w.inventory).toContainEqual({ itemId: '267', count: 1 }) // 土灵珠在背包
    expect(w.party[0]?.equipment.weapon).toBe('166') // 起手穿木剑
    // 穿戴生效:有效防御 = base + 9
    expect(effectiveStat(w.party[0]!, 'defense', DEMO_ITEMS)).toBe(w.party[0]!.defense + 9)
```

- [ ] **Step 2: 跑确认失败**

- [ ] **Step 3a:** `character.ts` `WorldState` 加 `inventory`:

```ts
export interface WorldState {
  party: CharacterInstance[]
  money: number
  learnedSkills: Record<string, string[]>
  /** 持有物品(跟存档):itemId → 数量。穿戴中的不在此(在 CharacterInstance.equipment)。 */
  inventory: { itemId: string; count: number }[]
}
```

- [ ] **Step 3b:** `LI_XIAOYAO.initialEquipment` 填 6 件(原 `{}`):

```ts
  initialEquipment: {
    weapon: '166', head: '196', body: '208', cloak: '225', feet: '235', accessory: '249',
  },
```

- [ ] **Step 3c:** `initialWorld` 播种 inventory(土灵珠 demo):

```ts
export function initialWorld(): WorldState {
  const li = instantiate(LI_XIAOYAO)
  return {
    party: [li],
    money: 0,
    learnedSkills: { [li.id]: [...LI_XIAOYAO.initialMagic] },
    inventory: [{ itemId: '267', count: 1 }], // 土灵珠(demo:验装备菜单可换装 + 双重身份)
  }
}
```

- [ ] **Step 3d:** `locale.ts` 6 槽标签对齐(原 `equip.weapon/head/body/feet/accessory/amulet` → 新 6 槽):

```ts
  'equip.weapon': '武器',
  'equip.head': '头部',
  'equip.body': '护甲',
  'equip.cloak': '披风',
  'equip.feet': '鞋',
  'equip.accessory': '手饰',
  'equip.empty': '—',
```
(删除旧的 `equip.amulet`;`equip.accessory` 语义从"饰品"改"手饰"。)

- [ ] **Step 4: check + biome**(全包 test 绿,确认 Task 2 测试转绿)

```bash
pnpm --filter @type-pal/content run check
pnpm --filter @type-pal/content exec biome check src/
```

- [ ] **Step 5: 全仓 check**(确认 reforge 状态板没因槽位改名编译失败 → 若 reforge 引用 `equip.amulet` 报错,**停下报告 Claude**,勿擅自改 reforge UI)

```bash
pnpm check
```
> ⚠ reforge `menu-box.ts` 的 `EQUIP_SLOTS` 仍用旧槽名(weapon/head/body/feet/accessory/amulet)+ 读 `equip.amulet`。槽位统一到 reforge 是 **Claude 的活**(状态板视觉 + 装备菜单),不在本计划。若 `pnpm check` 因此报错,GLM 停下报告,**不要动 reforge**。

- [ ] **Step 6: commit** —— `feat(content): WorldState.inventory + 李逍遥初始穿戴 + 6 槽 locale`

---

## Self-Review

1. **三层覆盖**:ItemData 定义①(Task1)/ 有效属性②(Task2)/ inventory+穿戴③(Task3)。✅
2. **真值无占位**:slot/effect/price/icon 全解码自字节码 + items.json;row19=defense(纠 item-status 误标)、336=山神 均核验。✅
3. **能力块 + 双重身份**:equip/use/throw 可叠加;土灵珠 equip+use 两块 → 两菜单都现(Task1 测试钉)。✅
4. **镜像技能地基**:ItemData=SkillData、EquipEffect=判别联合、DEMO_ITEMS=Record、inventory=关系态。✅
5. **跨包安全**:槽位改名可能波及 reforge → Task3 Step5 全仓 check 兜底 + 明令"reforge 报错则停、Claude 处理"。✅
6. **范围克制**:本期 equip + statBonus;use/throw 仅留口(ItemUseEffect 起步)、resist/grant 引擎/菜单 UI/商店/分类留后。✅
