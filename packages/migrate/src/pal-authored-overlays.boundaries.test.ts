import { type ItemData, type ItemUseEffect, validateItems } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  applyPalGeneratedCraftMessages,
  applyPalGeneratedResourcePoolMessages,
} from './pal-authored-overlays.js'

function item(id: string, effects: ItemUseEffect[]): ItemData {
  return {
    id,
    name: `作者·${id}`,
    desc: ['作者说明'],
    buyPrice: 10,
    sellPrice: 5,
    sellable: true,
    use: { target: 'scene', consuming: false, effects },
  }
}

const firstCraft = {
  kind: 'craftRecipe',
  recipes: [
    {
      ingredients: [{ itemId: '117', count: 1 }],
      products: [{ itemId: '148', count: 1 }],
    },
  ],
} satisfies ItemUseEffect

const secondCraft = {
  kind: 'craftRecipe',
  recipes: [
    {
      ingredients: [{ itemId: '118', count: 1 }],
      products: [{ itemId: '149', count: 1 }],
    },
  ],
} satisfies ItemUseEffect

const pool = {
  kind: 'drawFromResourcePool',
  resource: 'collectValue',
  maxRoll: 1,
  rewards: [{ itemId: '100', count: 1 }],
} satisfies ItemUseEffect

test('matches craft messages by effect position while leaving the author and source unchanged', () => {
  const current = validateItems([item('700', structuredClone([firstCraft, secondCraft]))])
  const generated = validateItems([
    {
      ...item('700', [
        structuredClone(firstCraft),
        { ...structuredClone(secondCraft), unavailableMessage: '第二条的失败原文' },
      ]),
      name: '生成标题',
    },
  ])
  const currentBefore = structuredClone(current)
  const generatedBefore = structuredClone(generated)

  expect(applyPalGeneratedCraftMessages(current, generated)).toEqual([
    item('700', [firstCraft, { ...secondCraft, unavailableMessage: '第二条的失败原文' }]),
  ])
  expect(current).toEqual(currentBefore)
  expect(generated).toEqual(generatedBefore)
})

test('keeps each failure text bound to its item and effect kind even when the source order differs', () => {
  const current = validateItems([item('701', [firstCraft, pool]), item('702', [pool])])
  const generated = validateItems([
    item('702', [{ ...pool, unavailableMessage: '702 源失败' }]),
    item('701', [
      { ...firstCraft, unavailableMessage: '炼蛊失败' },
      { ...pool, unavailableMessage: '701 源失败' },
    ]),
  ])
  const currentBefore = structuredClone(current)
  const generatedBefore = structuredClone(generated)
  expect(applyPalGeneratedCraftMessages(current, generated)).toEqual([
    item('701', [{ ...firstCraft, unavailableMessage: '炼蛊失败' }, pool]),
    item('702', [pool]),
  ])
  const pools = applyPalGeneratedResourcePoolMessages(current, generated)
  expect(pools).toEqual([
    item('701', [firstCraft, { ...pool, unavailableMessage: '701 源失败' }]),
    item('702', [{ ...pool, unavailableMessage: '702 源失败' }]),
  ])
  pools[0]!.desc.push('玩家修改')
  expect(pools[1]?.desc).toEqual(['作者说明'])
  expect(current).toEqual(currentBefore)
  expect(generated).toEqual(generatedBefore)
})
