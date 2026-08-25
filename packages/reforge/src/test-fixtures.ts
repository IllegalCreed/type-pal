// 测试共享 fixture:内联最小 demo 数据(替代已删的 initialWorld/DEMO_ITEMS/DEMO_SKILLS)。
// state 机测试验"行为"(换装/连用/光标),用等价内联数据即可,不依赖工程 JSON(避免引入 node fs)。
import {
  type ActorDef,
  buildWorld,
  type ItemData,
  type ItemDataMap,
  type SkillData,
  type SkillDataMap,
  type StartWorld,
  type WorldState,
} from '@type-pal/content'

// C0:CharacterTemplate → ActorDef(battler 包住战斗数据)
const hero: ActorDef = {
  id: 'li-xiaoyao',
  name: 'name.li-xiaoyao',
  spriteId: 'li-xiaoyao',
  battler: {
    baseStats: {
      level: 1,
      hp: 150,
      maxHP: 150,
      mp: 100,
      maxMP: 100,
      attack: 33,
      defense: 32,
      magicAttack: 20,
      speed: 28,
      luck: 32,
    },
    initialEquipment: { weapon: '166', accessory: '249' },
    initialMagic: ['296', '298', '299'],
    battleSprite: 'battle-sprite.li-xiaoyao',
  },
}

// 等价 demo items:护腕(起手穿戴 accessory)/土灵珠(背包,可装可用)/观音符(背包,单体回复)/茶叶蛋(背包,HP+MP)
const testItems: ItemDataMap = {
  '249': {
    id: '249',
    name: '护腕',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    equip: { slot: 'accessory', equipableBy: ['li-xiaoyao'], effects: [] },
  },
  '267': {
    id: '267',
    name: '土灵珠',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: {
      slot: 'accessory',
      equipableBy: ['li-xiaoyao'],
      effects: [{ kind: 'resistance', element: 'earth', percent: 50 }],
    },
    use: {
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'runScript', script: { chunk: 'shared/0', id: 'x' } }],
    },
  },
  '61': {
    id: '61',
    name: '观音符',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 150 }] },
  },
  '78': {
    id: '78',
    name: '茶叶蛋',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    use: {
      target: 'oneAlly',
      consuming: true,
      effects: [
        { kind: 'healHp', amount: 15 },
        { kind: 'healMp', amount: 15 },
      ],
    },
  },
}

// 等价 demo skills:气疗术/凝神归元/元灵归心术(起手习得,outdoor 治疗)
const testSkills: SkillDataMap = {
  '296': {
    id: '296',
    name: '气疗术',
    desc: '',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 27 },
  },
  '298': {
    id: '298',
    name: '凝神归元',
    desc: '',
    cost: { mp: 18 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 220 }],
    animation: { effectSprite: 29 },
  },
  '299': {
    id: '299',
    name: '元灵归心术',
    desc: '',
    cost: { mp: 40 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 500 }],
    animation: { effectSprite: 29 },
  },
}

const startWorld: StartWorld = {
  party: ['li-xiaoyao'],
  money: 0,
  inventory: [
    { itemId: '267', count: 1 },
    { itemId: '61', count: 2 },
    { itemId: '78', count: 1 },
  ],
  seedStats: { 'li-xiaoyao': { hp: 100, mp: 30 } },
}

export function makeTestWorld(): WorldState {
  return buildWorld(startWorld, { 'li-xiaoyao': hero })
}
export function makeTestItems(): ItemDataMap {
  return testItems
}
export function makeTestSkills(): SkillDataMap {
  return testSkills
}
// 标注抑制"未用 import"告警(ItemData/SkillData/WorldState 是类型,实际被签名用)
export type { ItemData, SkillData }
