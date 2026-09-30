import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyPalGeneratedCraftMessages,
  applyPalGeneratedResourcePoolMessages,
  applyPalItemOverlays,
} from './pal-authored-overlays.js'

describe('PAL 已审计内容 overlay', () => {
  test('隐蛊使用效果在上游纯函数中回补且幂等', () => {
    const source = [{ id: '141', name: '隐蛊' }] as ItemData[]
    const once = applyPalItemOverlays(source)
    expect(once[0]?.use).toEqual({
      target: 'allAllies',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'hideParty', turns: 3 }],
    })
    expect(applyPalItemOverlays(once)).toEqual(once)
    expect(source[0]?.use).toBeUndefined()
  })

  test('傀儡状态用途由上游明确限制为战斗内使用', () => {
    const source = [
      {
        id: '152',
        name: '傀儡虫',
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'applyStatus', status: 'puppet', turns: 9 }],
        },
      },
    ] as ItemData[]
    const once = applyPalItemOverlays(source)
    expect(once[0]?.use?.battleOnly).toBe(true)
    expect(applyPalItemOverlays(once)).toEqual(once)
    expect(source[0]?.use?.battleOnly).toBeUndefined()
  })

  test('current publication 只同步同轮 producer 的 craft failure message', () => {
    const recipes = [
      {
        ingredients: [{ itemId: '117', count: 1 }],
        products: [{ itemId: '148', count: 1 }],
      },
    ]
    const current = [
      {
        id: '999',
        name: '作者标题',
        desc: ['作者说明'],
        buyPrice: 123,
        sellPrice: 45,
        sellable: true,
        use: {
          target: 'scene',
          consuming: false,
          effects: [{ kind: 'craftRecipe', recipes }],
        },
      },
    ] as ItemData[]
    const generated = [
      {
        ...structuredClone(current[0]!),
        name: 'producer 标题不得覆盖作者标题',
        use: {
          ...structuredClone(current[0]!.use!),
          effects: [
            {
              kind: 'craftRecipe' as const,
              recipes: structuredClone(recipes),
              unavailableMessage: '源失败原文',
            },
          ],
        },
      },
    ]

    const once = applyPalGeneratedCraftMessages(current, generated)
    expect(once).toEqual([
      {
        ...current[0],
        use: {
          ...current[0]!.use,
          effects: [{ kind: 'craftRecipe', recipes, unavailableMessage: '源失败原文' }],
        },
      },
    ])
    expect(applyPalGeneratedCraftMessages(once, generated)).toEqual(once)
    expect(current[0]!.use!.effects[0]).not.toHaveProperty('unavailableMessage')

    const generatedWithoutMessage = structuredClone(generated)
    const generatedCraft = generatedWithoutMessage[0]!.use!.effects[0]!
    if (generatedCraft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    Reflect.deleteProperty(generatedCraft, 'unavailableMessage')
    expect(applyPalGeneratedCraftMessages(once, generatedWithoutMessage)).toEqual(once)
  })

  test('producer craft message 的空白值或配方结构不一致时 fail-loud', () => {
    const current = [
      {
        id: '999',
        name: '作者物品',
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: '117', count: 1 }],
                  products: [{ itemId: '148', count: 1 }],
                },
              ],
            },
          ],
        },
      },
    ] as ItemData[]
    const generated = structuredClone(current)
    const generatedCraft = generated[0]!.use!.effects[0]!
    if (generatedCraft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    generatedCraft.unavailableMessage = '源失败原文'
    generatedCraft.recipes[0]!.products[0] = { itemId: '149', count: 1 }
    expect(() => applyPalGeneratedCraftMessages(current, generated)).toThrow(/recipes drift/)

    generatedCraft.recipes[0]!.products[0] = { itemId: '148', count: 1 }
    generatedCraft.unavailableMessage = '   '
    expect(() => applyPalGeneratedCraftMessages(current, generated)).toThrow(/message 非法/)
  })

  test('producer message ownership 的重复 id、缺 current 与 craft 数量歧义全部 fail-loud', () => {
    const current = [
      {
        id: '999',
        name: '作者物品',
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: '117', count: 1 }],
                  products: [{ itemId: '148', count: 1 }],
                },
              ],
            },
          ],
        },
      },
    ] as ItemData[]
    const generated = structuredClone(current)
    const generatedCraft = generated[0]!.use!.effects[0]!
    if (generatedCraft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    generatedCraft.unavailableMessage = '源失败原文'

    expect(() => applyPalGeneratedCraftMessages([...current, current[0]!], generated)).toThrow(
      /current 重复 item id/,
    )
    expect(() => applyPalGeneratedCraftMessages(current, [...generated, generated[0]!])).toThrow(
      /generated 重复 item id/,
    )
    expect(() => applyPalGeneratedCraftMessages([], generated)).toThrow(/current 缺物品 999/)

    const missingCraft = structuredClone(current)
    missingCraft[0]!.use!.effects = []
    expect(() => applyPalGeneratedCraftMessages(missingCraft, generated)).toThrow(/craft 数量漂移/)
  })

  test('current publication 只同步同轮 producer 的 resource-pool failure message', () => {
    const rewards = [
      { itemId: '100', count: 1 },
      { itemId: '105', count: 1 },
    ]
    const current = [
      {
        id: '888',
        name: '作者葫芦',
        desc: ['作者说明'],
        buyPrice: 321,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'collectValue',
              maxRoll: 2,
              rewards,
            },
          ],
        },
      },
    ] as ItemData[]
    const generated = structuredClone(current)
    generated[0]!.name = 'producer 标题不得覆盖作者标题'
    const generatedPool = generated[0]!.use!.effects[0]!
    if (generatedPool.kind !== 'drawFromResourcePool') throw new Error('expected pool')
    generatedPool.unavailableMessage = '无任何效果'

    const once = applyPalGeneratedResourcePoolMessages(current, generated)
    expect(once).toEqual([
      {
        ...current[0],
        use: {
          ...current[0]!.use,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'collectValue',
              maxRoll: 2,
              rewards,
              unavailableMessage: '无任何效果',
            },
          ],
        },
      },
    ])
    expect(applyPalGeneratedResourcePoolMessages(once, generated)).toEqual(once)
    expect(current[0]!.use!.effects[0]).not.toHaveProperty('unavailableMessage')
  })

  test('producer resource-pool message 的空白值或结构漂移时 fail-loud', () => {
    const current = [
      {
        id: '888',
        name: '作者葫芦',
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'collectValue',
              maxRoll: 1,
              rewards: [{ itemId: '100', count: 1 }],
            },
          ],
        },
      },
    ] as ItemData[]
    const generated = structuredClone(current)
    const generatedPool = generated[0]!.use!.effects[0]!
    if (generatedPool.kind !== 'drawFromResourcePool') throw new Error('expected pool')
    generatedPool.unavailableMessage = '无任何效果'
    generatedPool.resource = 'other'
    expect(() => applyPalGeneratedResourcePoolMessages(current, generated)).toThrow(
      /resource pool drift/,
    )

    generatedPool.resource = 'collectValue'
    generatedPool.unavailableMessage = ' 无任何效果 '
    expect(() => applyPalGeneratedResourcePoolMessages(current, generated)).toThrow(/message 非法/)
  })
})
