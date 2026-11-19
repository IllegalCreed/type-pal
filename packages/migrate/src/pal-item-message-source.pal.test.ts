import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, test } from 'vitest'
import { loadPalContentSupplySources } from './pal-content-supply-io.js'
import { buildPalItemMessageSources, type PalItemMessageSource } from './pal-item-message-source.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))

describe('从 PAL 提取命令读取实际物品失败提示', () => {
  let messages: PalItemMessageSource[]

  beforeAll(() => {
    const source = loadPalContentSupplySources(root)
    messages = buildPalItemMessageSources(
      source.migrate.items,
      source.migrate.commands,
      source.stores,
    )
  })

  test('炼蛊皿保留五条配方、消耗和原始失败文本', () => {
    expect(messages.find(({ id }) => id === '268')?.effect).toEqual({
      kind: 'craftRecipe',
      unavailableMessage: '炼蛊的材料不足',
      recipes: ['117', '118', '119', '120', '121'].map((itemId) => ({
        ingredients: [{ itemId, count: 1 }],
        products: [{ itemId: '148', count: 1 }],
      })),
    })
  })

  test('灵葫保留实际 Store0 的九档顺序与共享失败文本', () => {
    expect(messages.find(({ id }) => id === '270')?.effect).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 9,
      rewards: ['100', '105', '95', '112', '72', '131', '97', '102', '111'].map((itemId) => ({
        itemId,
        count: 1,
      })),
      unavailableMessage: '无任何效果',
    })
  })
})
