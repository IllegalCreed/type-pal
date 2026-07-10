import { describe, expect, test } from 'vitest'
import type { CharacterInstance, WorldState } from './character.js'
import {
  describeEquipEffects,
  effectiveGrantedStatuses,
  effectiveRegen,
  effectiveResistances,
  effectiveSkills,
  equipGrantsAttackAll,
  equipItem,
  equippableItems,
  equippedItemIds,
  type ItemDataMap,
  usableItems,
  useItem,
} from './item.js'

// 内联 fixture(不再依赖已删的 DEMO_ITEMS/initialWorld —— 测逻辑用最小数据)
// weapon 攻+2 / body 防+3 / accessory 土灵珠(可装可用,双重身份)/ potion 回 HP
const items: ItemDataMap = {
  sword: {
    id: 'sword',
    name: '剑',
    desc: [],
    icon: 0,
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    equip: {
      slot: 'weapon',
      equipableBy: ['hero'],
      effects: [{ kind: 'statBonus', stat: 'attack', delta: 2 }],
    },
  },
  bead: {
    id: 'bead',
    name: '灵珠',
    desc: [],
    icon: 0,
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: {
      slot: 'accessory',
      equipableBy: ['hero'],
      effects: [{ kind: 'resistance', element: 'earth', percent: 50 }],
    },
  },
  potion: {
    id: 'potion',
    name: '药',
    desc: [],
    icon: 0,
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
  },
  noEquip: {
    id: 'noEquip',
    name: 'x',
    desc: [],
    icon: 0,
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
  },
}
function hero(hp = 100, mp = 50): CharacterInstance {
  return {
    id: 'hero',
    template: 'hero',
    level: 1,
    exp: 0,
    hp,
    maxHP: 150,
    mp,
    maxMP: 100,
    attack: 10,
    defense: 10,
    magicAttack: 10,
    speed: 10,
    luck: 10,
    equipment: { accessory: 'oldRing' },
    tags: [],
  }
}
function world(inv: { itemId: string; count: number }[], partyHp = 100, partyMp = 50): WorldState {
  return { party: [hero(partyHp, partyMp)], money: 0, learnedSkills: {}, inventory: inv }
}

describe('effectiveResistances(装备 live 派生;红线)', () => {
  const resItems: ItemDataMap = {
    earthBead: { id: 'earthBead', name: '土灵珠', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'accessory', equipableBy: ['hero'], effects: [{ kind: 'resistance', element: 'earth', percent: 50 }] } },
    poisonBead: { id: 'poisonBead', name: '五毒珠', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'body', equipableBy: ['hero'], effects: [{ kind: 'resistance', element: 'poison', percent: 100 }] } },
    fireBead2: { id: 'fireBead2', name: '火珠', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'weapon', equipableBy: ['hero'], effects: [{ kind: 'resistance', element: 'fire', percent: 80 }] } },
  }
  test('单件 → 对应元素抗;毒抗分离', () => {
    const c = { ...hero(), equipment: { accessory: 'earthBead' } }
    const r = effectiveResistances(c, resItems)
    expect(r.elemRes.earth).toBe(50)
    expect(r.elemRes.fire).toBe(0)
    expect(r.poisonRes).toBe(0)
  })
  test('多件叠加,毒抗与五灵各累;卸装即失效(不烙)', () => {
    const c = { ...hero(), equipment: { accessory: 'earthBead', armor: 'poisonBead', weapon: 'fireBead2' } }
    const r = effectiveResistances(c, resItems)
    expect(r.elemRes.earth).toBe(50)
    expect(r.elemRes.fire).toBe(80)
    expect(r.poisonRes).toBe(100)
    // 卸掉毒珠 → 毒抗归 0(live 派生,原对象无残留)
    const c2 = { ...c, equipment: { accessory: 'earthBead' } }
    expect(effectiveResistances(c2, resItems).poisonRes).toBe(0)
  })
  test('上限 100(fight.c 累加封顶)', () => {
    const twoPoison: ItemDataMap = {
      p1: { id: 'p1', name: '', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'accessory', equipableBy: ['hero'], effects: [{ kind: 'resistance', element: 'poison', percent: 70 }] } },
      p2: { id: 'p2', name: '', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'body', equipableBy: ['hero'], effects: [{ kind: 'resistance', element: 'poison', percent: 70 }] } },
    }
    const c = { ...hero(), equipment: { accessory: 'p1', armor: 'p2' } }
    expect(effectiveResistances(c, twoPoison).poisonRes).toBe(100) // 140 钳 100
  })
})

describe('effectiveSkills(装备授技 live 派生;红线)', () => {
  const skItems: ItemDataMap = {
    orb: { id: 'orb', name: '土灵珠', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'accessory', equipableBy: ['hero'], effects: [{ kind: 'grantSkill', skillId: '336' }] } },
  }
  test('已学 ∪ 装备授予,去重保序(学的在前)', () => {
    const c = { ...hero(), equipment: { accessory: 'orb' } }
    expect(effectiveSkills(['296', '308'], c, skItems)).toEqual(['296', '308', '336'])
  })
  test('已学含授予技 → 不重复', () => {
    const c = { ...hero(), equipment: { accessory: 'orb' } }
    expect(effectiveSkills(['336', '296'], c, skItems)).toEqual(['336', '296'])
  })
  test('卸装 → 授予技消失(不烙)', () => {
    const c = { ...hero(), equipment: {} }
    expect(effectiveSkills(['296'], c, skItems)).toEqual(['296'])
  })
})

describe('effectiveRegen(寿葫芦回血回蓝词条;正名替代 level99 伪毒 hack)', () => {
  const rItems: ItemDataMap = {
    gourd: { id: 'gourd', name: '寿葫芦', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'accessory', equipableBy: ['hero'], effects: [{ kind: 'regenHp', amount: 20 }, { kind: 'regenMp', amount: 20 }] } },
  }
  test('寿葫芦 → 每回合 +20 HP / +20 MP;卸装即失效(不烙)', () => {
    expect(effectiveRegen({ ...hero(), equipment: { accessory: 'gourd' } }, rItems)).toEqual({ hp: 20, mp: 20 })
    expect(effectiveRegen({ ...hero(), equipment: {} }, rItems)).toEqual({ hp: 0, mp: 0 })
  })
})

describe('effectiveGrantedStatuses / equipGrantsAttackAll(装备特效 live 派生)', () => {
  const gItems: ItemDataMap = {
    fairySword: { id: 'fairySword', name: '仙女剑', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'weapon', equipableBy: ['hero'], effects: [{ kind: 'grantStatus', status: 'dualAttack' }] } },
    whip: { id: 'whip', name: '长鞭', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, equip: { slot: 'weapon', equipableBy: ['hero'], effects: [{ kind: 'attackAll' }] } },
  }
  test('仙女剑 → 授连击 dualAttack;卸装即失效', () => {
    expect(effectiveGrantedStatuses({ ...hero(), equipment: { weapon: 'fairySword' } }, gItems)).toEqual(['dualAttack'])
    expect(effectiveGrantedStatuses({ ...hero(), equipment: {} }, gItems)).toEqual([])
  })
  test('长鞭 → 攻击全体;无则否', () => {
    expect(equipGrantsAttackAll({ ...hero(), equipment: { weapon: 'whip' } }, gItems)).toBe(true)
    expect(equipGrantsAttackAll({ ...hero(), equipment: { weapon: 'fairySword' } }, gItems)).toBe(false)
  })
})

describe('equippableItems', () => {
  test('背包里该角色可装的(equipableBy 命中 + 有 equip 块)', () => {
    const w = world([
      { itemId: 'bead', count: 1 },
      { itemId: 'potion', count: 1 },
      { itemId: 'noEquip', count: 1 },
    ])
    expect(equippableItems(w, 'hero', items).map((i) => i.id)).toEqual(['bead']) // potion 无 equip,noEquip 无 equip
  })
  test('equipableBy 不含该角色 → 不列', () => {
    const w = world([{ itemId: 'bead', count: 1 }])
    expect(equippableItems(w, 'someone-else', items)).toEqual([])
  })
})

describe('equipItem', () => {
  test('装 bead → 入 accessory 槽,旧件回包,原 world 不变(不可变)', () => {
    const w0 = world([{ itemId: 'bead', count: 1 }])
    const w1 = equipItem(w0, 'hero', 'bead', items)
    expect(w1.party[0]?.equipment.accessory).toBe('bead')
    expect(w1.inventory.find((e) => e.itemId === 'oldRing')?.count).toBe(1) // 旧件回包
    expect(w1.inventory.find((e) => e.itemId === 'bead')).toBeUndefined() // 出包
    expect(w0.party[0]?.equipment.accessory).toBe('oldRing') // 原 world 不变
  })
  test('不可装(未知物/非该角色/不在包)→ 原样返回', () => {
    const w = world([{ itemId: 'bead', count: 1 }])
    expect(equipItem(w, 'hero', 'noSuchItem', items)).toBe(w)
    expect(equipItem(w, 'nobody', 'bead', items)).toBe(w)
    expect(equipItem(w, 'hero', 'sword', items)).toBe(w) // sword 不在背包
  })
})

describe('usableItems + useItem', () => {
  test('usableItems:背包里有 use 能力块的', () => {
    const w = world([
      { itemId: 'potion', count: 2 },
      { itemId: 'bead', count: 1 },
      { itemId: 'noEquip', count: 1 },
    ])
    expect(usableItems(w, items).map((i) => i.id)).toEqual(['potion']) // 只有 potion 有 use
  })
  test('useItem:回 HP 夹上限 + 消耗 -1', () => {
    const w0 = world([{ itemId: 'potion', count: 2 }], 120, 50) // hp120,药+50 → 夹 maxHP150
    const w1 = useItem(w0, 'hero', 'potion', items)
    expect(w1.party[0]?.hp).toBe(150) // 120+50 夹满
    expect(w1.inventory.find((e) => e.itemId === 'potion')?.count).toBe(1) // 2→1
    expect(w0.party[0]?.hp).toBe(120) // 原 world 不变
  })
  test('useItem:用光 → 出包', () => {
    const w0 = world([{ itemId: 'potion', count: 1 }])
    expect(
      useItem(w0, 'hero', 'potion', items).inventory.find((e) => e.itemId === 'potion'),
    ).toBeUndefined()
  })
  test('useItem:非法(无 use/不在包/未知角色)→ 原样', () => {
    const w = world([{ itemId: 'potion', count: 1 }])
    expect(useItem(w, 'hero', 'bead', items)).toBe(w) // bead 无 use
    expect(useItem(w, 'hero', 'noSuch', items)).toBe(w)
    expect(useItem(w, 'nobody', 'potion', items)).toBe(w)
  })
  test('穿戴中的可用品仍可用(原版 itemmenu.c:穿着灵珠能用):bead 装上后 useItem 不消耗、不报错', () => {
    // bead 装 accessory(出背包),它无 use → useItem 应原样返回(不报错)
    const w = equipItem(world([{ itemId: 'bead', count: 1 }]), 'hero', 'bead', items)
    expect(equippedItemIds(w).has('bead')).toBe(true)
    expect(useItem(w, 'hero', 'bead', items)).toBe(w) // bead 无 use,原样
  })
})

describe('大世界自毒/解毒(useItem applyPoison/curePoison → char.poisons;毒源+携带桥)', () => {
  const poisonItems: ItemDataMap = {
    egg: { id: 'egg', name: '毒蛇卵', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'applyPoison', poisonId: '551' }] } },
    rice: { id: 'rice', name: '糯米', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'curePoison', curesTier: 'common' }] } },
  }
  const defs = {
    551: { id: 551, name: '赤毒', curability: 'common' as const, color: 16 },
    555: { id: 555, name: '三尸蛊', curability: 'severe' as const, color: 0 },
  }
  test('用毒蛇卵 → 队员中赤毒(char.poisons 有 551,带入战斗的源)', () => {
    const w = world([{ itemId: 'egg', count: 1 }])
    const w2 = useItem(w, 'hero', 'egg', poisonItems, defs)
    expect(w2.party[0]?.poisons).toEqual([{ poisonId: 551, tickIndex: 0 }])
    expect(w2.inventory.find((e) => e.itemId === 'egg')).toBeUndefined() // 消耗
  })
  test('用糯米(common)→ 解赤毒留三尸蛊(severe)', () => {
    const w0 = world([{ itemId: 'rice', count: 1 }])
    w0.party[0]!.poisons = [{ poisonId: 551, tickIndex: 0 }, { poisonId: 555, tickIndex: 0 }]
    const w2 = useItem(w0, 'hero', 'rice', poisonItems, defs)
    expect(w2.party[0]?.poisons).toEqual([{ poisonId: 555, tickIndex: 0 }]) // 赤毒解,三尸蛊留
  })
})

describe('大世界护体符/金刚符(useItem applyStatus → char.extraStatuses;带入战斗的源)', () => {
  const buffItems: ItemDataMap = {
    talisman: { id: 'talisman', name: '金刚符', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'applyStatus', status: 'protect', turns: 7 }] } },
    haste: { id: 'haste', name: '疾风符', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'applyStatus', status: 'haste', turns: 5 }] } },
  }
  test('用金刚符 → 队员 extraStatuses 有 protect 7(建态注入战斗的源),消耗 -1', () => {
    const w = world([{ itemId: 'talisman', count: 1 }])
    const w2 = useItem(w, 'hero', 'talisman', buffItems)
    expect(w2.party[0]?.extraStatuses).toEqual([{ status: 'protect', turns: 7 }])
    expect(w2.inventory.find((e) => e.itemId === 'talisman')).toBeUndefined()
  })
  test('已有 protect 再用 → 刷新回合数(不重复条目);不同状态 → 追加', () => {
    const w0 = world([{ itemId: 'talisman', count: 1 }, { itemId: 'haste', count: 1 }])
    w0.party[0]!.extraStatuses = [{ status: 'protect', turns: 2 }]
    const w1 = useItem(w0, 'hero', 'talisman', buffItems)
    expect(w1.party[0]?.extraStatuses).toEqual([{ status: 'protect', turns: 7 }]) // 刷新 2→7,单条
    const w2 = useItem(w1, 'hero', 'haste', buffItems)
    expect(w2.party[0]?.extraStatuses).toEqual([
      { status: 'protect', turns: 7 },
      { status: 'haste', turns: 5 },
    ]) // 追加
  })
  test('纯更新不改原 world(输入 extraStatuses 引用不被 mutate)', () => {
    const w0 = world([{ itemId: 'talisman', count: 1 }])
    const orig = [{ status: 'protect' as const, turns: 2 }]
    w0.party[0]!.extraStatuses = orig
    useItem(w0, 'hero', 'talisman', buffItems)
    expect(orig).toEqual([{ status: 'protect', turns: 2 }]) // 源数组未被改
  })
})

describe('大蒜临时毒抗(useItem extraPoisonRes → char.extraPoisonRes;缩敌附毒门的源)', () => {
  const garlic: ItemDataMap = {
    garlic: { id: 'garlic', name: '大蒜', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: true, use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'extraPoisonRes', amount: 30 }] } },
  }
  test('用大蒜 → extraPoisonRes=30(建态并入战斗 poisonRes 的源),消耗 -1', () => {
    const w = world([{ itemId: 'garlic', count: 1 }])
    const w2 = useItem(w, 'hero', 'garlic', garlic)
    expect(w2.party[0]?.extraPoisonRes).toBe(30)
    expect(w2.inventory.find((e) => e.itemId === 'garlic')).toBeUndefined()
  })
  test('已有更高毒抗再用 → 取高不降级', () => {
    const w0 = world([{ itemId: 'garlic', count: 1 }])
    w0.party[0]!.extraPoisonRes = 50
    expect(useItem(w0, 'hero', 'garlic', garlic).party[0]?.extraPoisonRes).toBe(50) // max(50,30)
  })
})

describe('describeEquipEffects(装备效果 → 派生文案:说明脱节的根治,单一真相源)', () => {
  test('长鞭:数值并排一行 + 攻击全体独占行(原迁移 desc 漏掉的 attackAll,派生补上)', () => {
    expect(
      describeEquipEffects([
        { kind: 'statBonus', stat: 'attack', delta: 20 },
        { kind: 'statBonus', stat: 'speed', delta: 20 },
        { kind: 'attackAll' },
      ]),
    ).toEqual(['武术+20　身法+20', '攻击全体'])
  })
  test('负数保留符号(短刀 身法-5)', () => {
    expect(
      describeEquipEffects([
        { kind: 'statBonus', stat: 'attack', delta: 6 },
        { kind: 'statBonus', stat: 'speed', delta: -5 },
      ]),
    ).toEqual(['武术+6　身法-5'])
  })
  test('数值全并一行:上限 + 抗性(避X率带%,照原版灵珠措辞)', () => {
    expect(
      describeEquipEffects([
        { kind: 'maxPool', pool: 'hp', delta: 50 },
        { kind: 'resistance', element: 'fire', percent: 30 },
        { kind: 'resistance', element: 'poison', percent: 20 },
      ]),
    ).toEqual(['体力上限+50　避火率+30%　避毒率+20%'])
  })
  test('授技能查名(缺 ctx 回退 id);常驻状态 + 回合回复各占一行', () => {
    expect(
      describeEquipEffects(
        [
          { kind: 'grantSkill', skillId: '336' },
          { kind: 'grantStatus', status: 'dualAttack' },
          { kind: 'regenHp', amount: 20 },
        ],
        { skillName: (id) => (id === '336' ? '山神' : undefined) },
      ),
    ).toEqual(['习得·山神', '常驻·连击', '每回合回体力+20'])
  })
  test('纯剧情装备(无机制效果)→ 空数组', () => {
    expect(describeEquipEffects([])).toEqual([])
  })
})
