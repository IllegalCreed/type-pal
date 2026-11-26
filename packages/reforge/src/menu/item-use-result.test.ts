import type { ItemDataMap, WorldItemUsePresentation } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildItemUseResultEntries, itemUseResultText } from './item-use-result.js'

describe('item use result presentation', () => {
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

  test('道具文字提示按原文送入居中卷轴', () => {
    const entries = buildItemUseResultEntries([{ kind: 'item-message', text: '无任何效果' }], items)
    expect(entries.map(itemUseResultText)).toEqual(['无任何效果'])
  })

  test('数量只出现在多件产物的结果行', () => {
    const entries = buildItemUseResultEntries(
      [
        {
          kind: 'item-result',
          source: 'craftRecipe',
          items: [
            { itemId: 'a', count: 2 },
            { itemId: 'a', count: 1 },
          ],
        },
        { kind: 'item-result', source: 'drawFromResourcePool', items: [{ itemId: 'b', count: 1 }] },
      ],
      items,
    )
    expect(entries.map(itemUseResultText)).toEqual([
      '炼出 赤血蚕 × 2',
      '炼出 赤血蚕',
      '炼成 灵葫仙丹',
    ])
  })
})
