// 物品 / 装备数据 ① 层。见 docs/phase2/foundation/item-data-design.md。
// 阶段隔离(D18):纯 content 数据 + 类型,无 reforge/引擎依赖。
import type { CharacterInstance, WorldState } from './character.js'
import type { StatusId } from './skill.js'

/** 战斗属性(对齐 CharacterInstance 的 5 项)。 */
export type CombatStat = 'attack' | 'magicAttack' | 'defense' | 'speed' | 'luck'

/** 6 装备槽(对齐原版 body part;名按"装什么"取,见 design §4)。 */
export const EQUIP_SLOT_IDS = ['weapon', 'head', 'body', 'cloak', 'feet', 'accessory'] as const
export type EquipSlot = (typeof EQUIP_SLOT_IDS)[number]

/** 装备效果 = clean-rewrite scriptOnEquip 的 opcode(0x17/0x1A/0x2D);复用技能地基 StatusId/skillId。 */
export type EquipEffect =
  | { kind: 'statBonus'; stat: CombatStat; delta: number } // 0x17(可负,如铁锁衣防御-10)
  | {
      kind: 'resistance'
      element: 'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth'
      percent: number
    } // 0x17[22-27]
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
  target?: 'oneAlly' | 'allAllies' | 'self' | 'scene'
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
    id: '166',
    name: '木剑',
    desc: '攻击+2 身法+3',
    icon: 56,
    buyPrice: 50,
    sellPrice: 25,
    sellable: true,
    equip: {
      slot: 'weapon',
      equipableBy: ['li-xiaoyao'],
      effects: [
        { kind: 'statBonus', stat: 'attack', delta: 2 },
        { kind: 'statBonus', stat: 'speed', delta: 3 },
      ],
    },
  },
  '196': {
    id: '196',
    name: '头巾',
    desc: '防御+1',
    icon: 176,
    buyPrice: 40,
    sellPrice: 20,
    sellable: true,
    equip: {
      slot: 'head',
      equipableBy: ['li-xiaoyao'],
      effects: [{ kind: 'statBonus', stat: 'defense', delta: 1 }],
    },
  },
  '208': {
    id: '208',
    name: '布袍',
    desc: '防御+3',
    icon: 78,
    buyPrice: 100,
    sellPrice: 50,
    sellable: true,
    equip: {
      slot: 'body',
      equipableBy: ['li-xiaoyao'],
      effects: [{ kind: 'statBonus', stat: 'defense', delta: 3 }],
    },
  },
  '225': {
    id: '225',
    name: '披风',
    desc: '防御+2',
    icon: 95,
    buyPrice: 160,
    sellPrice: 80,
    sellable: true,
    equip: {
      slot: 'cloak',
      equipableBy: ['li-xiaoyao'],
      effects: [{ kind: 'statBonus', stat: 'defense', delta: 2 }],
    },
  },
  '235': {
    id: '235',
    name: '草鞋',
    desc: '防御+1',
    icon: 97,
    buyPrice: 30,
    sellPrice: 15,
    sellable: true,
    equip: {
      slot: 'feet',
      equipableBy: ['li-xiaoyao'],
      effects: [{ kind: 'statBonus', stat: 'defense', delta: 1 }],
    },
  },
  '249': {
    id: '249',
    name: '护腕',
    desc: '防御+2',
    icon: 224,
    buyPrice: 70,
    sellPrice: 35,
    sellable: true,
    equip: {
      slot: 'accessory',
      equipableBy: ['li-xiaoyao'],
      effects: [{ kind: 'statBonus', stat: 'defense', delta: 2 }],
    },
  },
  // 双重身份样例:可装(土抗+授山神)+ 可用(剧情,本期 stub)。证明能力块模型两菜单都出现。
  '267': {
    id: '267',
    name: '土灵珠',
    desc: '土抗+50 授山神',
    icon: 6,
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: {
      slot: 'accessory',
      equipableBy: ['li-xiaoyao'],
      effects: [
        { kind: 'resistance', element: 'earth', percent: 50 },
        { kind: 'grantSkill', skillId: '336' },
      ],
    },
    use: {
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'triggerScript', scriptId: 'lingzhu-tu' }],
    },
  },
}

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

/** 背包里该角色可装的物品(equip 能力 + equipableBy 含其模板)。 */
export function equippableItems(
  world: WorldState,
  casterId: string,
  items: Record<string, ItemData> = DEMO_ITEMS,
): ItemData[] {
  const member = world.party.find((c) => c.id === casterId)
  if (!member) return []
  return world.inventory
    .filter((e) => e.count > 0)
    .map((e) => items[e.itemId])
    .filter((it): it is ItemData => it != null)
    .filter((it) => it.equip?.equipableBy.includes(member.template))
}

function addToInventory(
  inv: { itemId: string; count: number }[],
  itemId: string,
  n: number,
): { itemId: string; count: number }[] {
  if (inv.some((x) => x.itemId === itemId)) {
    return inv.map((x) => (x.itemId === itemId ? { ...x, count: x.count + n } : x))
  }
  return [...inv, { itemId, count: n }]
}

function removeFromInventory(
  inv: { itemId: string; count: number }[],
  itemId: string,
  n: number,
): { itemId: string; count: number }[] {
  return inv
    .map((x) => (x.itemId === itemId ? { ...x, count: x.count - n } : x))
    .filter((x) => x.count > 0)
}

/** 换装:itemId 入其 slot,旧件回包。返回新 WorldState(不可变);非法操作原样返回。 */
export function equipItem(
  world: WorldState,
  casterId: string,
  itemId: string,
  items: Record<string, ItemData> = DEMO_ITEMS,
): WorldState {
  const item = items[itemId]
  const slot = item?.equip?.slot
  const member = world.party.find((c) => c.id === casterId)
  if (!item?.equip || !slot || !member) return world
  if (!item.equip.equipableBy.includes(member.template)) return world
  if (!world.inventory.some((e) => e.itemId === itemId && e.count > 0)) return world

  const oldItemId = member.equipment[slot]
  const party = world.party.map((c) =>
    c.id === casterId ? { ...c, equipment: { ...c.equipment, [slot]: itemId } } : c,
  )
  let inventory = removeFromInventory(world.inventory, itemId, 1)
  if (oldItemId) inventory = addToInventory(inventory, oldItemId, 1)
  return { ...world, party, inventory }
}
