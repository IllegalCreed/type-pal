import { describe, expect, test } from 'vitest'
import { migratePalShops } from './pal-shop-projection.js'

describe('PAL 商店来源投影', () => {
  test('排除炼化奖励表，保留实际店号、货品身份与原顺序', () => {
    const source = [
      { id: 16, items: [220, 107, 220] },
      { id: 0, items: [100, 105, 95] },
      { id: 3, items: [197, 103] },
    ]
    expect(migratePalShops(source)).toEqual([
      { id: 16, items: ['220', '107', '220'] },
      { id: 3, items: ['197', '103'] },
    ])
  })
})
