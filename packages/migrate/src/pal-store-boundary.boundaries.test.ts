/**
 * TEST-MIGRATION-BOUNDARIES-1 T09：pal-store-boundary 剩余独立拒绝轴。
 * 既有 pal-store-boundary.test 已钉 0 店/买引用/卖 0/奖励/recipes 漂移主干——不重复。
 * 本文件：嵌套 buy/sell 计数与路径域不串、sell shop 非 0 精确拒绝、源 Store0 缺失/重复、
 * 生成商店货单不一致、源 id 顺序漂移与实际输入不变。
 */
import type { ItemData, ShopDef } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { migratePalShops, type SourceStore } from './pal-derived-content.js'
import { assertPalAlchemyBoundaryInvariant, assertPalStoreBoundaryInvariant } from './pal-store-boundary.js'

const rewards = ['100', '105', '95', '112', '72', '131', '97', '102', '111']

function baseItem(id: string, buyPrice = 1): ItemData {
  return { id, name: `物品 ${id}`, desc: [], buyPrice, sellPrice: 0, sellable: false }
}

function items(): ItemData[] {
  return [
    ...rewards.map((id) => baseItem(id, id === '112' || id === '72' ? 0 : 1)),
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

function validArgs(overrides: { shops?: ShopDef[]; commandRoots?: readonly unknown[] } = {}) {
  const stores = sourceStores()
  return {
    sourceStores: stores,
    shops: overrides.shops ?? migratePalShops(stores),
    items: items(),
    commandRoots: overrides.commandRoots ?? [
      { kind: 'branch', then: [{ kind: 'openShop', shop: 1, mode: 'buy' }], else: [] },
    ],
    expectedBuyCalls: 1,
  }
}

describe('T09 pal-store-boundary 剩余轴', () => {
  it('嵌套深路径计数不串：三处 buy（含 sequence/if 嵌套）+ 两处 sell 各自精确；实际输入不变', () => {
    const roots: unknown[] = [
      {
        kind: 'sequence',
        steps: [
          { kind: 'openShop', shop: 2, mode: 'buy' },
          { kind: 'if', then: [{ kind: 'openShop', shop: 3, mode: 'buy' }], else: [] },
        ],
      },
      { kind: 'openShop', shop: 1, mode: 'buy' },
    ]
    const rootsSnapshot = structuredClone(roots)
    const report = assertPalStoreBoundaryInvariant({ ...validArgs({ commandRoots: roots }), expectedBuyCalls: 3 })
    expect(report).toEqual({ buyCalls: 3, sellCalls: 0 })
    expect(structuredClone(roots)).toEqual(rootsSnapshot)
    // 期望数不符精确拒绝
    expect(() =>
      assertPalStoreBoundaryInvariant({ ...validArgs({ commandRoots: roots }), expectedBuyCalls: 2 }),
    ).toThrow('PAL Store0 invariant: buy openShop 数量 3 != 2')
  })
  it('sell shop 非 0 精确拒绝；sell 计数独立', () => {
    expect(() =>
      assertPalStoreBoundaryInvariant({
        ...validArgs({ commandRoots: [{ kind: 'openShop', shop: 5, mode: 'sell' }] }),
        expectedBuyCalls: 0,
        expectedSellCalls: 1,
        expectedSellShopId: 0,
      }),
    ).toThrow('PAL Store0 invariant: sell shop 应为 0，收到 5')
    expect(
      assertPalStoreBoundaryInvariant({
        ...validArgs({ commandRoots: [{ kind: 'openShop', shop: 0, mode: 'sell' }] }),
        expectedBuyCalls: 0,
        expectedSellCalls: 1,
        expectedSellShopId: 0,
      }),
    ).toEqual({ buyCalls: 0, sellCalls: 1 })
  })
  it('源 Store0 缺失/重复、源 id 顺序漂移、生成货单不一致各自精确拒绝', () => {
    const noStore0 = sourceStores().filter(({ id }) => id !== 0)
    expect(() => assertPalAlchemyBoundaryInvariant({ sourceStores: noStore0, items: items() })).toThrow(
      'PAL Store0 invariant: 源 Store0 数量 0 != 1',
    )
    const duplicated = [{ id: 0, items: rewards.map(Number) }, ...sourceStores()]
    expect(() => assertPalAlchemyBoundaryInvariant({ sourceStores: duplicated, items: items() })).toThrow(
      'PAL Store0 invariant: 源 Store0 数量 2 != 1',
    )
    // 源真实商店顺序漂移（交换 1/2）
    const swapped = sourceStores()
    ;[swapped[1], swapped[2]] = [swapped[2]!, swapped[1]!]
    expect(() => assertPalStoreBoundaryInvariant({ ...validArgs(), sourceStores: swapped })).toThrow(
      'PAL Store0 invariant: 源真实商店 id/顺序漂移 2,1',
    )
    // 生成商店货单与源不一致（改 shop1 货单）
    const tamperedShops = migratePalShops(sourceStores())
    tamperedShops[0] = { id: 1, items: ['999'] }
    expect(() => assertPalStoreBoundaryInvariant({ ...validArgs({ shops: tamperedShops }) })).toThrow(
      'PAL Store0 invariant: 生成商店 1 货单与源不一致',
    )
  })
})
