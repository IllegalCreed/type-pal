import type { ItemDataMap, WorldItemUsePresentation } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildItemUseResultEntries, itemUseResultLineLayout } from './item-use-result.js'

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

  test('单双字节混排按 PAL 半角单位居中', () => {
    expect(itemUseResultLineLayout('炼出')).toEqual({ boxX: 144, boxLen: 2, textX: 152 })
    expect(itemUseResultLineLayout('丹 × 2')).toEqual({ boxX: 132, boxLen: 4, textX: 144 })
  })
})
