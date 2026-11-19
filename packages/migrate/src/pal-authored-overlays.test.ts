import { type ItemData, type ItemUseEffect, validateItems } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyPalGeneratedCraftMessages,
  applyPalGeneratedResourcePoolMessages,
  applyPalItemOverlays,
} from './pal-authored-overlays.js'

function item(id: string, changes: Partial<ItemData> = {}): ItemData {
  return {
    id,
    name: `作者物品 ${id}`,
    desc: ['作者说明'],
    buyPrice: 123,
    sellPrice: 45,
    sellable: true,
    ...changes,
  }
}

function craftItem(id = '999', message?: string, product = '148'): ItemData {
  return item(id, {
    use: {
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'craftRecipe',
          recipes: [
            {
              ingredients: [{ itemId: '117', count: 1 }],
              products: [{ itemId: product, count: 1 }],
            },
          ],
          ...(message === undefined ? {} : { unavailableMessage: message }),
        },
      ],
    },
  })
}

function poolItem(message?: string, reward = '100'): ItemData {
  const effect: ItemUseEffect = {
    kind: 'drawFromResourcePool',
    resource: 'collectValue',
    maxRoll: 2,
    rewards: [
      { itemId: reward, count: 1 },
      { itemId: '105', count: 1 },
    ],
    ...(message === undefined ? {} : { unavailableMessage: message }),
  }
  return item('888', { use: { target: 'scene', consuming: false, effects: [effect] } })
}

describe('PAL item-use overrides', () => {
  test('gives Hidden Gu the original three-turn whole-party battle effect', () => {
    const source = validateItems([item('141', { name: '隐蛊' })])
    const once = applyPalItemOverlays(source)
    expect(once).toEqual([
      item('141', {
        name: '隐蛊',
        use: {
          target: 'allAllies',
          consuming: true,
          battleOnly: true,
          effects: [{ kind: 'hideParty', turns: 3 }],
        },
      }),
    ])
    expect(applyPalItemOverlays(once)).toEqual(once)
    expect(source).toEqual([item('141', { name: '隐蛊' })])
    validateItems(once)
  })

  test('adds the battle-use restriction before final validation for the raw puppet effect', () => {
    const source = [
      item('152', {
        name: '傀儡虫',
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'applyStatus', status: 'puppet', turns: 9 }],
        },
      }),
    ]
    const before = structuredClone(source)
    const once = applyPalItemOverlays(source)
    expect(once[0]?.use).toEqual({
      target: 'oneAlly',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'applyStatus', status: 'puppet', turns: 9 }],
    })
    expect(applyPalItemOverlays(once)).toEqual(once)
    expect(source).toEqual(before)
    validateItems(once)
  })
})

describe('PAL generated failure texts', () => {
  test('overlays only the craft text and leaves existing text when the source has none', () => {
    const current = validateItems([craftItem()])
    const generated = validateItems([{ ...craftItem('999', '源失败原文'), name: '生成标题' }])
    const before = structuredClone(current)
    const once = applyPalGeneratedCraftMessages(current, generated)
    expect(once).toEqual([craftItem('999', '源失败原文')])
    expect(applyPalGeneratedCraftMessages(once, generated)).toEqual(once)
    expect(applyPalGeneratedCraftMessages(once, current)).toEqual(once)
    expect(current).toEqual(before)
  })

  test('rejects a craft text for a different recipe or a blank source message', () => {
    const current = validateItems([craftItem()])
    expect(() =>
      applyPalGeneratedCraftMessages(
        current,
        validateItems([craftItem('999', '源失败原文', '149')]),
      ),
    ).toThrow('PAL generated craft message: item999 recipes drift')
    expect(() => applyPalGeneratedCraftMessages(current, [craftItem('999', '   ')])).toThrow(
      'PAL generated craft message: item999 message 非法',
    )
  })

  test('requires unique current and generated items and a matching number of craft effects', () => {
    const current = craftItem()
    const generated = craftItem('999', '源失败原文')
    expect(() => applyPalGeneratedCraftMessages([current, current], [generated])).toThrow(
      'PAL generated craft message: current 重复 item id 999',
    )
    expect(() => applyPalGeneratedCraftMessages([current], [generated, generated])).toThrow(
      'PAL generated craft message: generated 重复 item id 999',
    )
    expect(() => applyPalGeneratedCraftMessages([], [generated])).toThrow(
      'PAL generated craft message: current 缺物品 999',
    )
    expect(() => applyPalGeneratedCraftMessages([item('999')], [generated])).toThrow(
      'PAL generated craft message: item999 craft 数量漂移',
    )
  })

  test('overlays only the source resource-pool text on the matching author item', () => {
    const current = validateItems([poolItem()])
    const generated = validateItems([{ ...poolItem('无任何效果'), name: '生成标题' }])
    const before = structuredClone(current)
    const once = applyPalGeneratedResourcePoolMessages(current, generated)
    expect(once).toEqual([poolItem('无任何效果')])
    expect(applyPalGeneratedResourcePoolMessages(once, generated)).toEqual(once)
    expect(current).toEqual(before)
  })

  test('rejects source pool text with a different reward or surrounding whitespace', () => {
    const current = validateItems([poolItem()])
    expect(() =>
      applyPalGeneratedResourcePoolMessages(
        current,
        validateItems([poolItem('无任何效果', '111')]),
      ),
    ).toThrow('PAL generated resource message: item888 resource pool drift')
    expect(() =>
      applyPalGeneratedResourcePoolMessages(current, [poolItem(' 无任何效果 ')]),
    ).toThrow('PAL generated resource message: item888 message 非法')
  })
})
