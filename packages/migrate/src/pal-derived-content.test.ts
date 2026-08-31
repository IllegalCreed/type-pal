import { describe, expect, it } from 'vitest'
import { migratePalShops } from './pal-derived-content.js'

describe('migratePalShops', () => {
  it('publishes only real stores 1..20 without renumbering or changing stock', () => {
    const stores = [
      { id: 0, items: [100, 105, 95] },
      ...Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        items: [200 + index, 300 + index],
      })),
    ]

    const shops = migratePalShops(stores)

    expect(shops).toHaveLength(20)
    expect(shops.map(({ id }) => id)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1))
    expect(shops.map(({ items }) => items)).toEqual(
      stores.slice(1).map(({ items }) => items.map(String)),
    )
  })
})
