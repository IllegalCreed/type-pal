import { type ItemData, type ShopDef, validateItems, validateShops } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { migratePalShops, type SourceStore } from './pal-shop-projection.js'
import {
  assertPalAlchemyBoundaryInvariant,
  assertPalStoreBoundaryInvariant,
} from './pal-store-boundary.js'

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
            unavailableMessage: '炼蛊的材料不足',
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
            unavailableMessage: '无任何效果',
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

function validArgs(overrides: { shops?: ShopDef[]; items?: ItemData[] } = {}) {
  const stores = sourceStores()
  return {
    sourceStores: stores,
    shops: validateShops(overrides.shops ?? migratePalShops(stores)),
    items: validateItems(overrides.items ?? items()),
  }
}

describe('PAL generated shop and Store0 boundaries', () => {
  it('accepts twenty source shops and the complete Store0 reward and recipe inputs', () => {
    expect(() => assertPalStoreBoundaryInvariant(validArgs())).not.toThrow()
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

  it('rejects missing or duplicate source Store0 rows', () => {
    const stores = sourceStores()
    const withoutRewardTable = stores.filter(({ id }) => id !== 0)
    const rewardTable = { id: 0, items: rewards.map(Number) }
    expect(() =>
      assertPalAlchemyBoundaryInvariant({ sourceStores: withoutRewardTable, items: items() }),
    ).toThrow('PAL Store0 invariant: 源 Store0 数量 0 != 1')
    expect(() =>
      assertPalAlchemyBoundaryInvariant({
        sourceStores: [rewardTable, ...stores],
        items: items(),
      }),
    ).toThrow('PAL Store0 invariant: 源 Store0 数量 2 != 1')
  })

  it('rejects the first two source shops out of order', () => {
    const args = validArgs()
    const [store0, first, second, ...rest] = args.sourceStores
    if (!store0 || !first || !second) throw new Error('Expected the two source shops')
    expect(() =>
      assertPalStoreBoundaryInvariant({
        ...args,
        sourceStores: [store0, second, first, ...rest],
      }),
    ).toThrow('PAL Store0 invariant: 源真实商店 id/顺序漂移 2,1,3')
  })

  it('rejects a generated inventory that differs from its source shop', () => {
    const args = validArgs()
    const shops = validateShops(
      args.shops.map((shop) => (shop.id === 1 ? { ...shop, items: ['105'] } : shop)),
    )
    expect(() => assertPalStoreBoundaryInvariant({ ...args, shops })).toThrow(
      'PAL Store0 invariant: 生成商店 1 货单与源不一致',
    )
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
    expect(() =>
      assertPalAlchemyBoundaryInvariant({ sourceStores: sourceStores(), items: vesselDrift }),
    ).toThrow(/item268 craftRecipe/)
  })

  it.each([
    undefined,
    '当前没有可用资源',
    ' 无任何效果 ',
  ])('rejects item270 failure message drift: %s', (message) => {
    const changed = items()
    const gourd = changed.find(({ id }) => id === '270')!
    const pool = gourd.use!.effects[0]!
    if (pool.kind !== 'drawFromResourcePool') throw new Error('expected pool')
    if (message === undefined) delete pool.unavailableMessage
    else pool.unavailableMessage = message
    expect(() => assertPalStoreBoundaryInvariant({ ...validArgs(), items: changed })).toThrow(
      /item270 unavailableMessage/,
    )
  })

  it.each([
    undefined,
    '材料不足',
    ' 炼蛊的材料不足 ',
  ])('rejects item268 failure message drift: %s', (message) => {
    const changed = items()
    const vessel = changed.find(({ id }) => id === '268')!
    const craft = vessel.use!.effects[0]!
    if (craft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    if (message === undefined) delete craft.unavailableMessage
    else craft.unavailableMessage = message
    expect(() => assertPalStoreBoundaryInvariant({ ...validArgs(), items: changed })).toThrow(
      /item268 unavailableMessage/,
    )
  })

  it('rejects item268 recipe order or amount drift', () => {
    const changed = items()
    const vessel = changed.find(({ id }) => id === '268')!
    const craft = vessel.use!.effects[0]!
    if (craft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    craft.recipes[0]!.ingredients[0] = { itemId: '118', count: 1 }
    expect(() => assertPalStoreBoundaryInvariant({ ...validArgs(), items: changed })).toThrow(
      /item268 recipes drift/,
    )
  })
})
