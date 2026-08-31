import type { ItemData, ShopDef } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { migratePalShops, type SourceStore } from './pal-derived-content.js'
import { assertPalStoreBoundaryInvariant } from './pal-store-boundary.js'

const rewards = ['100', '105', '95', '112', '72', '131', '97', '102', '111']

function baseItem(id: string, buyPrice = 1): ItemData {
  return {
    id,
    name: `物品 ${id}`,
    desc: [],
    buyPrice,
    sellPrice: 0,
    sellable: false,
  }
}

function items(): ItemData[] {
  const rewardItems = rewards.map((id) => baseItem(id, id === '112' || id === '72' ? 0 : 1))
  return [
    ...rewardItems,
    {
      ...baseItem('268'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: ['117', '118', '119', '120', '121'].map((itemId) => ({
              ingredients: [{ itemId, count: 1 }],
              products: [{ itemId: '148', count: 1 }],
            })),
          },
        ],
      },
    },
    {
      ...baseItem('270'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'collectValue',
            maxRoll: 9,
            rewards: rewards.map((itemId) => ({ itemId, count: 1 })),
          },
        ],
      },
    },
    ...['117', '118', '119', '120', '121', '148'].map((id) => baseItem(id)),
  ]
}

function sourceStores(): SourceStore[] {
  return [
    { id: 0, items: rewards.map(Number) },
    ...Array.from({ length: 20 }, (_, index) => ({ id: index + 1, items: [100 + index] })),
  ]
}

function validArgs(
  overrides: { shops?: ShopDef[]; items?: ItemData[]; commandRoots?: readonly unknown[] } = {},
) {
  const stores = sourceStores()
  return {
    sourceStores: stores,
    shops: overrides.shops ?? migratePalShops(stores),
    items: overrides.items ?? items(),
    commandRoots: overrides.commandRoots ?? [
      {
        kind: 'branch',
        then: [{ kind: 'openShop', shop: 1, mode: 'buy' }],
        else: [{ kind: 'openShop', shop: 0, mode: 'sell' }],
      },
    ],
    expectedBuyCalls: 1,
    expectedSellCalls: 1,
    expectedSellShopId: 0,
  }
}

describe('PAL Store0 / Shop boundary invariant', () => {
  it('accepts real shops, buy-only references, sell shop0, and exact item268/270 closure', () => {
    expect(assertPalStoreBoundaryInvariant(validArgs())).toEqual({ buyCalls: 1, sellCalls: 1 })
  })

  it('rejects publishing ShopDef0 or changing a real shop id', () => {
    expect(() =>
      assertPalStoreBoundaryInvariant({
        ...validArgs(),
        shops: [{ id: 0, items: rewards }, ...migratePalShops(sourceStores())],
      }),
    ).toThrow(/禁止发布 ShopDef0/)

    const changed = migratePalShops(sourceStores())
    changed[0] = { id: 2, items: changed[0]!.items }
    expect(() => assertPalStoreBoundaryInvariant({ ...validArgs(), shops: changed })).toThrow(
      /真实商店 id\/顺序漂移/,
    )
  })

  it('rejects a dangling buy reference but keeps sell shop0 legal', () => {
    expect(() =>
      assertPalStoreBoundaryInvariant({
        ...validArgs(),
        commandRoots: [{ kind: 'openShop', shop: 99, mode: 'buy' }],
        expectedSellCalls: 0,
      }),
    ).toThrow(/buy openShop 引用未知商店 99/)

    expect(
      assertPalStoreBoundaryInvariant({
        ...validArgs(),
        commandRoots: [{ kind: 'openShop', shop: 0, mode: 'sell' }],
        expectedBuyCalls: 0,
      }),
    ).toEqual({ buyCalls: 0, sellCalls: 1 })
  })

  it('rejects drift in the spirit-gourd tiers or mixing the vessel with a resource pool', () => {
    const gourdDrift = items()
    const gourd = gourdDrift.find(({ id }) => id === '270')!
    const pool = gourd.use!.effects[0]!
    if (pool.kind !== 'drawFromResourcePool') throw new Error('expected pool')
    pool.rewards[3] = { itemId: '100', count: 1 }
    expect(() => assertPalStoreBoundaryInvariant({ ...validArgs(), items: gourdDrift })).toThrow(
      /item270 奖励档位漂移/,
    )

    const vesselDrift = items()
    const vessel = vesselDrift.find(({ id }) => id === '268')!
    vessel.use!.effects.push({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 1,
      rewards: [{ itemId: '100', count: 1 }],
    })
    expect(() => assertPalStoreBoundaryInvariant({ ...validArgs(), items: vesselDrift })).toThrow(
      /item268 craftRecipe/,
    )
  })
})
