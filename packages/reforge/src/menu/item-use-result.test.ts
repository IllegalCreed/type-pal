import type { ItemDataMap, WorldItemUsePresentation } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  buildItemUseResultEntries,
  itemUseResultText,
  type ItemUseResultEntry,
} from './item-use-result.js'

describe('C8 · item use result presentation', () => {
  const items: ItemDataMap = {
    a: {
      id: 'a',
      name: '赤血蚕',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
    },
    b: {
      id: 'b',
      name: '灵葫仙丹',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
    },
  }

  test('配方多产物与资源池奖励严格保序并派生显示名', () => {
    const presentations: WorldItemUsePresentation[] = [
      {
        kind: 'item-result',
        source: 'craftRecipe',
        items: [
          { itemId: 'a', count: 2 },
          { itemId: 'missing', count: 1 },
        ],
      },
      {
        kind: 'item-result',
        source: 'drawFromResourcePool',
        items: [{ itemId: 'b', count: 1 }],
      },
    ]
    expect(buildItemUseResultEntries(presentations, items)).toEqual([
      { itemId: 'a', count: 2, title: '炼出', itemName: '赤血蚕' },
      { itemId: 'missing', count: 1, title: '炼出', itemName: 'missing' },
      { itemId: 'b', count: 1, title: '炼成', itemName: '灵葫仙丹' },
    ])
  })

  test('D14-3:reward-gain 单行文本(炼成/炼出 + 名 + 数量)', () => {
    const entry: ItemUseResultEntry = {
      itemId: 'a',
      count: 2,
      title: '炼出',
      itemName: '赤血蚕',
    }
    expect(itemUseResultText(entry)).toBe('炼出 赤血蚕 × 2')
    expect(itemUseResultText({ ...entry, count: 1 })).toBe('炼出 赤血蚕')
    expect(
      itemUseResultText({ ...entry, title: '炼成', itemName: '灵葫仙丹', count: 1 }),
    ).toBe(
      '炼成 灵葫仙丹',
    )
  })
})
