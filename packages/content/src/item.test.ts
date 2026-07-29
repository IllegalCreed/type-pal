import { describe, expect, test } from 'vitest'
import type { ActorDef } from './actor.js'
import type { CharacterInstance, WorldState } from './character.js'
import {
  describeEquipEffects,
  effectiveBattleSpriteId,
  effectiveGrantedStatuses,
  effectiveRegen,
  effectiveResistances,
  effectiveSkills,
  equipGrantsAttackAll,
  equipItem,
  equippableItems,
  equippedItemIds,
  type ItemDataMap,
  type ItemUseContext,
  type ItemUseEffect,
  itemUseEffectSupportsContext,
  itemUseSupportsContext,
  ownedItemCount,
  removeOwnedItems,
  resolveWorldItemUse,
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
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
  },
  noEquip: {
    id: 'noEquip',
    name: 'x',
    desc: [],
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

describe('effectiveBattleSpriteId(基础→持久→固定槽位→战中 transient)', () => {
  const actor = {
    id: 'hero',
    name: 'hero',
    spriteId: 'hero',
    battler: { battleSprite: 'base', baseStats: {}, initialEquipment: {}, initialMagic: [] },
  } as unknown as ActorDef
  const appearanceItems: ItemDataMap = {
    weapon: {
      id: 'weapon',
      name: '武器',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'weapon',
        equipableBy: ['hero'],
        effects: [{ kind: 'battleSprite', sprite: 'weapon' }],
      },
    },
    accessory: {
      id: 'accessory',
      name: '配饰',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'accessory',
        equipableBy: ['hero'],
        effects: [{ kind: 'battleSprite', sprite: 'accessory' }],
      },
    },
  }

  test('后层覆盖前层，装备严格按 EQUIP_SLOT_IDS 而非对象插入顺序', () => {
    const character = {
      ...hero(),
      appearance: { battleSprite: 'persistent' },
      equipment: { accessory: 'accessory', weapon: 'weapon' },
    }
    expect(effectiveBattleSpriteId(character, actor, appearanceItems)).toBe('accessory')
    expect(effectiveBattleSpriteId(character, actor, appearanceItems, 'trance')).toBe('trance')
  })

  test('卸装/transient 结束后即时恢复下一层，不回写实例', () => {
    const character = { ...hero(), appearance: { battleSprite: 'persistent' }, equipment: {} }
    expect(effectiveBattleSpriteId(character, actor, appearanceItems)).toBe('persistent')
    expect(character.appearance.battleSprite).toBe('persistent')
    expect(
      effectiveBattleSpriteId({ ...character, appearance: undefined }, actor, appearanceItems),
    ).toBe('base')
  })
})

describe('effectiveResistances(装备 live 派生;红线)', () => {
  const resItems: ItemDataMap = {
    earthBead: {
      id: 'earthBead',
      name: '土灵珠',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'accessory',
        equipableBy: ['hero'],
        effects: [{ kind: 'resistance', element: 'earth', percent: 50 }],
      },
    },
    poisonBead: {
      id: 'poisonBead',
      name: '五毒珠',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'body',
        equipableBy: ['hero'],
        effects: [{ kind: 'resistance', element: 'poison', percent: 100 }],
      },
    },
    fireBead2: {
      id: 'fireBead2',
      name: '火珠',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'weapon',
        equipableBy: ['hero'],
        effects: [{ kind: 'resistance', element: 'fire', percent: 80 }],
      },
    },
  }
  test('单件 → 对应元素抗;毒抗分离', () => {
    const c = { ...hero(), equipment: { accessory: 'earthBead' } }
    const r = effectiveResistances(c, resItems)
    expect(r.elemRes.earth).toBe(50)
    expect(r.elemRes.fire).toBe(0)
    expect(r.poisonRes).toBe(0)
  })
  test('多件叠加,毒抗与五灵各累;卸装即失效(不烙)', () => {
    const c = {
      ...hero(),
      equipment: { accessory: 'earthBead', armor: 'poisonBead', weapon: 'fireBead2' },
    }
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
      p1: {
        id: 'p1',
        name: '',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        equip: {
          slot: 'accessory',
          equipableBy: ['hero'],
          effects: [{ kind: 'resistance', element: 'poison', percent: 70 }],
        },
      },
      p2: {
        id: 'p2',
        name: '',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        equip: {
          slot: 'body',
          equipableBy: ['hero'],
          effects: [{ kind: 'resistance', element: 'poison', percent: 70 }],
        },
      },
    }
    const c = { ...hero(), equipment: { accessory: 'p1', armor: 'p2' } }
    expect(effectiveResistances(c, twoPoison).poisonRes).toBe(100) // 140 钳 100
  })
})

describe('effectiveSkills(装备授技 live 派生;红线)', () => {
  const skItems: ItemDataMap = {
    orb: {
      id: 'orb',
      name: '土灵珠',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'accessory',
        equipableBy: ['hero'],
        effects: [{ kind: 'grantSkill', skillId: '336' }],
      },
    },
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
    gourd: {
      id: 'gourd',
      name: '寿葫芦',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'accessory',
        equipableBy: ['hero'],
        effects: [
          { kind: 'regenHp', amount: 20 },
          { kind: 'regenMp', amount: 20 },
        ],
      },
    },
  }
  test('寿葫芦 → 每回合 +20 HP / +20 MP;卸装即失效(不烙)', () => {
    expect(effectiveRegen({ ...hero(), equipment: { accessory: 'gourd' } }, rItems)).toEqual({
      hp: 20,
      mp: 20,
    })
    expect(effectiveRegen({ ...hero(), equipment: {} }, rItems)).toEqual({ hp: 0, mp: 0 })
  })
})

describe('effectiveGrantedStatuses / equipGrantsAttackAll(装备特效 live 派生)', () => {
  const gItems: ItemDataMap = {
    fairySword: {
      id: 'fairySword',
      name: '仙女剑',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'weapon',
        equipableBy: ['hero'],
        effects: [{ kind: 'grantStatus', status: 'dualAttack' }],
      },
    },
    whip: {
      id: 'whip',
      name: '长鞭',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: { slot: 'weapon', equipableBy: ['hero'], effects: [{ kind: 'attackAll' }] },
    },
  }
  test('仙女剑 → 授连击 dualAttack;卸装即失效', () => {
    expect(
      effectiveGrantedStatuses({ ...hero(), equipment: { weapon: 'fairySword' } }, gItems),
    ).toEqual(['dualAttack'])
    expect(effectiveGrantedStatuses({ ...hero(), equipment: {} }, gItems)).toEqual([])
  })
  test('长鞭 → 攻击全体;无则否', () => {
    expect(equipGrantsAttackAll({ ...hero(), equipment: { weapon: 'whip' } }, gItems)).toBe(true)
    expect(equipGrantsAttackAll({ ...hero(), equipment: { weapon: 'fairySword' } }, gItems)).toBe(
      false,
    )
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

describe('C8 · 用途上下文与结构化 world outcome', () => {
  test('21 种 effect × world/battle/throw 的消费矩阵完整且唯一', () => {
    const effects = {
      healHp: { kind: 'healHp', amount: 1 },
      healMp: { kind: 'healMp', amount: 1 },
      revive: { kind: 'revive', hpPercent: 50 },
      applyStatus: { kind: 'applyStatus', status: 'protect', turns: 1 },
      removeStatus: { kind: 'removeStatus', statuses: ['protect'] },
      applyPoison: { kind: 'applyPoison', poisonId: '551' },
      curePoison: { kind: 'curePoison', curesTier: 'common' },
      permanentStatBoost: { kind: 'permanentStatBoost', stat: 'attack', delta: 1 },
      gate: { kind: 'gate', chance: 50 },
      dieIfNotPoisoned: { kind: 'dieIfNotPoisoned' },
      runScript: {
        kind: 'runScript',
        script: { chunk: 'shared/c00', id: 'shared/user/demo' },
      },
      runSceneHook: { kind: 'runSceneHook', hook: 'onTeleport' },
      craftRecipe: {
        kind: 'craftRecipe',
        recipes: [
          {
            ingredients: [{ itemId: 'a', count: 1 }],
            products: [{ itemId: 'b', count: 1 }],
          },
        ],
      },
      drawFromResourcePool: {
        kind: 'drawFromResourcePool',
        resource: 'collectValue',
        maxRoll: 1,
        rewards: [{ itemId: 'reward', count: 1 }],
      },
      extraPoisonRes: { kind: 'extraPoisonRes', amount: 1 },
      hideParty: { kind: 'hideParty', turns: 3 },
      modifyHostileAwareness: {
        kind: 'modifyHostileAwareness',
        rangeMultiplier: 0,
        durationMs: 60_000,
      },
      scaleCurrentHp: { kind: 'scaleCurrentHp', numerator: 1, denominator: 2 },
      levelUp: { kind: 'levelUp', levels: 1 },
      placeEntityInFront: {
        kind: 'placeEntityInFront',
        target: { scene: 's001', entity: 'e1' },
        state: 2,
      },
    } satisfies Record<ItemUseEffect['kind'], ItemUseEffect>
    const allowed = {
      healHp: ['world', 'battle'],
      healMp: ['world', 'battle'],
      revive: ['world', 'battle'],
      applyStatus: ['world', 'battle'],
      removeStatus: ['world', 'battle'],
      applyPoison: ['world', 'battle'],
      curePoison: ['world', 'battle'],
      permanentStatBoost: ['world'],
      gate: ['world', 'battle'],
      dieIfNotPoisoned: ['world', 'battle'],
      runScript: ['world'],
      runSceneHook: ['world'],
      craftRecipe: ['world'],
      drawFromResourcePool: ['world'],
      extraPoisonRes: ['world', 'battle'],
      hideParty: ['battle'],
      modifyHostileAwareness: ['world', 'battle'],
      scaleCurrentHp: ['world', 'battle'],
      levelUp: ['world', 'battle'],
      placeEntityInFront: ['world'],
    } satisfies Record<ItemUseEffect['kind'], ItemUseContext[]>
    const contexts: ItemUseContext[] = ['world', 'battle']
    for (const [kind, effect] of Object.entries(effects) as [
      ItemUseEffect['kind'],
      ItemUseEffect,
    ][]) {
      for (const context of contexts)
        expect(itemUseEffectSupportsContext(effect, context), `${kind} @ ${context}`).toBe(
          (allowed[kind] as readonly ItemUseContext[]).includes(context),
        )
    }
    expect(
      itemUseSupportsContext(
        {
          target: 'oneAlly',
          consuming: false,
          battleOnly: true,
          effects: [{ kind: 'healHp', amount: 1 }],
        },
        'world',
      ),
    ).toBe(false)
  })

  test('驱魔香、无影毒和金蚕王使用公共 effect；世界执行不回满 HP/MP', () => {
    const genericItems: ItemDataMap = {
      incense: {
        id: 'incense',
        name: '驱魔香',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [{ kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 60_000 }],
        },
      },
      poison: {
        id: 'poison',
        name: '无影毒',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'scaleCurrentHp', numerator: 1, denominator: 2 }],
        },
      },
      level: {
        id: 'level',
        name: '金蚕王',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'levelUp', levels: 1 }],
        },
      },
    }
    const initial = world([
      { itemId: 'incense', count: 1 },
      { itemId: 'poison', count: 1 },
      { itemId: 'level', count: 1 },
    ])
    initial.party[0]!.exp = 77
    const afterIncense = resolveWorldItemUse(initial, 'hero', 'incense', genericItems).world
    expect(afterIncense.hostileAwareness).toEqual({ rangeMultiplier: 0, remainingMs: 60_000 })
    const afterPoison = resolveWorldItemUse(afterIncense, 'hero', 'poison', genericItems).world
    expect(afterPoison.party[0]!.hp).toBe(50)
    const afterLevel = resolveWorldItemUse(
      afterPoison,
      'hero',
      'level',
      genericItems,
      undefined,
      () => 0,
    ).world
    expect(afterLevel.party[0]).toMatchObject({
      level: 2,
      exp: 0,
      hp: 50,
      mp: 50,
      maxHP: 160,
      maxMP: 108,
      attack: 14,
      magicAttack: 14,
      defense: 12,
      speed: 12,
      luck: 12,
    })
  })

  test('有序配方选择第一条充足材料；失败不扣工具或材料', () => {
    const craftItems: ItemDataMap = {
      vessel: {
        id: 'vessel',
        name: '炼制器',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: 'a', count: 1 }],
                  products: [{ itemId: 'reward-a', count: 1 }],
                },
                {
                  ingredients: [{ itemId: 'b', count: 1 }],
                  products: [{ itemId: 'reward-b', count: 1 }],
                },
              ],
            },
          ],
        },
      },
    }
    const initial = world([
      { itemId: 'vessel', count: 1 },
      { itemId: 'a', count: 1 },
      { itemId: 'b', count: 1 },
    ])
    const success = resolveWorldItemUse(initial, 'hero', 'vessel', craftItems)
    expect(success.status).toBe('success')
    expect(success.world.inventory).toEqual([
      { itemId: 'vessel', count: 1 },
      { itemId: 'b', count: 1 },
      { itemId: 'reward-a', count: 1 },
    ])
    expect(success.effectResults).toEqual([
      {
        index: 0,
        kind: 'craftRecipe',
        changed: true,
        recipe: {
          recipeIndex: 0,
          ingredients: [{ itemId: 'a', count: 1 }],
          products: [{ itemId: 'reward-a', count: 1 }],
        },
      },
    ])
    expect(success.presentations).toEqual([
      {
        kind: 'item-result',
        source: 'craftRecipe',
        items: [{ itemId: 'reward-a', count: 1 }],
      },
    ])
    expect(initial.inventory).toHaveLength(3)

    const missing = world([{ itemId: 'vessel', count: 1 }])
    const failure = resolveWorldItemUse(missing, 'hero', 'vessel', craftItems)
    expect(failure).toMatchObject({
      status: 'failure',
      reason: 'missing-materials',
      world: missing,
    })
  })

  test('材料计数覆盖背包与装备，扣除顺序固定为背包→队伍→槽位', () => {
    const w = world([{ itemId: 'mat', count: 1 }])
    w.party = [
      {
        ...hero(),
        id: 'first',
        equipment: { head: 'mat', body: 'mat', accessory: 'mat' },
      },
      { ...hero(), id: 'second', equipment: { weapon: 'mat' } },
    ]
    expect(ownedItemCount(w, 'mat')).toBe(5)
    expect(removeOwnedItems(w, 'mat', 3)).toBe(3)
    expect(w.inventory).toEqual([])
    expect(w.party[0]!.equipment).toEqual({ accessory: 'mat' })
    expect(w.party[1]!.equipment).toEqual({ weapon: 'mat' })
  })

  test.each([
    { value: 0, rng: 0, status: 'failure', tier: 0, left: 0 },
    { value: 1, rng: 0.9, status: 'success', tier: 1, left: 0 },
    { value: 9, rng: 0.999, status: 'success', tier: 9, left: 0 },
    { value: 18, rng: 0.999, status: 'success', tier: 9, left: 9 },
  ])('资源池 value=$value 按 1..value 掷后封顶', ({ value, rng, status, tier, left }) => {
    const rewards = Array.from({ length: 9 }, (_, index) => ({
      itemId: `reward-${index + 1}`,
      count: 1,
    }))
    const poolItems: ItemDataMap = {
      gourd: {
        id: 'gourd',
        name: '炼丹葫芦',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'collectValue',
              maxRoll: 9,
              rewards,
            },
          ],
        },
      },
    }
    const initial = { ...world([{ itemId: 'gourd', count: 1 }]), collectValue: value }
    const outcome = resolveWorldItemUse(initial, 'hero', 'gourd', poolItems, undefined, () => rng)
    expect(outcome.status).toBe(status)
    expect(outcome.world.collectValue ?? 0).toBe(left)
    if (tier > 0) {
      expect(outcome.world.inventory).toContainEqual({ itemId: `reward-${tier}`, count: 1 })
      expect(outcome.effectResults[0]?.resourceDraw).toEqual({
        resource: 'collectValue',
        valueBefore: value,
        rolled: value,
        tier,
        spent: tier,
        valueAfter: left,
        reward: { itemId: `reward-${tier}`, count: 1 },
      })
      expect(outcome.presentations).toEqual([
        {
          kind: 'item-result',
          source: 'drawFromResourcePool',
          items: [{ itemId: `reward-${tier}`, count: 1 }],
        },
      ])
    } else {
      expect(outcome.world).toBe(initial)
      expect(outcome.presentations).toEqual([])
    }
  })

  test('allAllies 不依赖已选角色 id，仍对全队执行', () => {
    const initial = world([{ itemId: 'meal', count: 1 }], 10)
    initial.party.push({ ...hero(20), id: 'friend' })
    const allItems: ItemDataMap = {
      meal: {
        id: 'meal',
        name: '全体药',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'allAllies',
          consuming: true,
          effects: [{ kind: 'healHp', amount: 5 }],
        },
      },
    }
    const outcome = resolveWorldItemUse(initial, 'missing-character', 'meal', allItems)
    expect(outcome.status).toBe('success')
    expect(outcome.world.party.map((member) => member.hp)).toEqual([15, 25])
    expect(outcome.effectResults[0]).toMatchObject({
      kind: 'healHp',
      changed: true,
      targetCharIds: ['hero', 'friend'],
    })
  })

  test('外部脚本只返回待执行请求，content 不伪执行也不提前消耗', () => {
    const scriptItems: ItemDataMap = {
      letter: {
        id: 'letter',
        name: '信物',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'runScript',
              script: { chunk: 'shared/c00', id: 'shared/user/letter-use' },
            },
          ],
        },
      },
    }
    const initial = world([{ itemId: 'letter', count: 1 }])
    const outcome = resolveWorldItemUse(initial, 'hero', 'letter', scriptItems)
    expect(outcome).toMatchObject({
      status: 'external',
      world: initial,
      consumed: false,
      changed: false,
      externalEffects: scriptItems.letter!.use!.effects,
    })
  })

  test('allAllies 逐个结算；普通回复跳过死亡队员且不会把负数扣成负 HP', () => {
    const party = world([{ itemId: 'meal', count: 1 }])
    party.party = [hero(10, 5), { ...hero(0, 9), id: 'dead' }]
    const allItems: ItemDataMap = {
      meal: {
        id: 'meal',
        name: '全体药',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'allAllies',
          consuming: true,
          effects: [
            { kind: 'healHp', amount: 20 },
            { kind: 'healMp', amount: -999 },
          ],
        },
      },
    }
    const outcome = resolveWorldItemUse(party, 'hero', 'meal', allItems)
    expect(outcome).toMatchObject({ status: 'success', consumed: true })
    expect(outcome.world.party.map((member) => [member.hp, member.mp])).toEqual([
      [30, 0],
      [0, 9],
    ])
  })

  test.each([
    {
      name: '重复施加同一种毒',
      effect: { kind: 'applyPoison', poisonId: '551' } as const,
      prepare: (target: CharacterInstance) => {
        target.poisons = [{ poisonId: 551, tickIndex: 0 }]
      },
    },
    {
      name: '刷新为相同回合数的状态',
      effect: { kind: 'applyStatus', status: 'protect', turns: 7 } as const,
      prepare: (target: CharacterInstance) => {
        target.extraStatuses = [{ status: 'protect', turns: 7 }]
      },
    },
    {
      name: '已经死亡时再次执行未中毒致死',
      effect: { kind: 'dieIfNotPoisoned' } as const,
      prepare: (target: CharacterInstance) => {
        target.hp = 0
        target.poisons = []
      },
    },
  ])('$name 不误报世界变化', ({ effect, prepare }) => {
    const probe: ItemDataMap = {
      probe: {
        id: 'probe',
        name: '探针',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: { target: 'oneAlly', consuming: false, effects: [effect] },
      },
    }
    const initial = world([{ itemId: 'probe', count: 1 }])
    prepare(initial.party[0]!)
    const outcome = resolveWorldItemUse(initial, 'hero', 'probe', probe)
    expect(outcome).toMatchObject({ status: 'success', changed: false, consumed: false })
    expect(outcome.world).toBe(initial)
    expect(outcome.effectResults[0]).toMatchObject({ kind: effect.kind, changed: false })
  })

  test('0x06 概率门严格按 1..100 < N；世界失败保持原 world 且不消耗', () => {
    const gated: ItemDataMap = {
      salt: {
        id: 'salt',
        name: '盐巴',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [
            { kind: 'gate', chance: 50 },
            { kind: 'healHp', amount: 1 },
          ],
        },
      },
    }
    const initial = world([{ itemId: 'salt', count: 1 }], 10)
    expect(resolveWorldItemUse(initial, 'hero', 'salt', gated, undefined, () => 0.48).status).toBe(
      'success',
    ) // roll 49
    const failure = resolveWorldItemUse(initial, 'hero', 'salt', gated, undefined, () => 0.49) // roll 50
    expect(failure).toMatchObject({ status: 'failure', reason: 'gate-failed', consumed: false })
    expect(failure.world).toBe(initial)
    expect(initial.inventory).toEqual([{ itemId: 'salt', count: 1 }])
  })
})

describe('大世界自毒/解毒(useItem applyPoison/curePoison → char.poisons;毒源+携带桥)', () => {
  const poisonItems: ItemDataMap = {
    egg: {
      id: 'egg',
      name: '毒蛇卵',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'applyPoison', poisonId: '551' }],
      },
    },
    rice: {
      id: 'rice',
      name: '糯米',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'curePoison', curesTier: 'common' }],
      },
    },
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
    w0.party[0]!.poisons = [
      { poisonId: 551, tickIndex: 0 },
      { poisonId: 555, tickIndex: 0 },
    ]
    const w2 = useItem(w0, 'hero', 'rice', poisonItems, defs)
    expect(w2.party[0]?.poisons).toEqual([{ poisonId: 555, tickIndex: 0 }]) // 赤毒解,三尸蛊留
  })
})

describe('大世界护体符/金刚符(useItem applyStatus → char.extraStatuses;带入战斗的源)', () => {
  const buffItems: ItemDataMap = {
    talisman: {
      id: 'talisman',
      name: '金刚符',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'applyStatus', status: 'protect', turns: 7 }],
      },
    },
    haste: {
      id: 'haste',
      name: '疾风符',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'applyStatus', status: 'haste', turns: 5 }],
      },
    },
  }
  test('用金刚符 → 队员 extraStatuses 有 protect 7(建态注入战斗的源),消耗 -1', () => {
    const w = world([{ itemId: 'talisman', count: 1 }])
    const w2 = useItem(w, 'hero', 'talisman', buffItems)
    expect(w2.party[0]?.extraStatuses).toEqual([{ status: 'protect', turns: 7 }])
    expect(w2.inventory.find((e) => e.itemId === 'talisman')).toBeUndefined()
  })
  test('已有 protect 再用 → 刷新回合数(不重复条目);不同状态 → 追加', () => {
    const w0 = world([
      { itemId: 'talisman', count: 1 },
      { itemId: 'haste', count: 1 },
    ])
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
    garlic: {
      id: 'garlic',
      name: '大蒜',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: true,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'extraPoisonRes', amount: 30 }],
      },
    },
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
