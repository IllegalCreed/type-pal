import type { ItemData } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { UpdateItemCommand } from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import {
  assertSingleInputOutputCraftRecipes,
  findItemAlchemyEffect,
  itemAlchemyOwners,
  mutateItemAlchemyEffect,
  resizeResourcePoolEffect,
} from './item-alchemy.js'

function item(id: string, effects: NonNullable<ItemData['use']>['effects']): ItemData {
  return {
    id,
    name: id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: { target: 'scene', consuming: false, effects },
  }
}

const craft = {
  kind: 'craftRecipe' as const,
  recipes: [
    {
      ingredients: [{ itemId: 'egg', count: 1 }],
      products: [{ itemId: 'bug', count: 1 }],
    },
  ],
}

const pool = {
  kind: 'drawFromResourcePool' as const,
  resource: 'collectValue',
  maxRoll: 2,
  rewards: [
    { itemId: 'a', count: 1 },
    { itemId: 'b', count: 1 },
  ],
}

function state(items: ItemData[]): EditorState {
  return {
    items,
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

describe('item alchemy canonical owner', () => {
  it('derives independent crafting and spirit-gourd owners and fails on duplicate effects', () => {
    const items = [item('vessel', [craft]), item('gourd', [pool]), item('plain', [])]
    expect(itemAlchemyOwners(items, 'crafting').map(({ id }) => id)).toEqual(['vessel'])
    expect(itemAlchemyOwners(items, 'spirit-gourd').map(({ id }) => id)).toEqual(['gourd'])
    expect(findItemAlchemyEffect(items[0]!, 'crafting')?.index).toBe(0)
    expect(findItemAlchemyEffect(items[1]!, 'spirit-gourd')?.index).toBe(0)
    expect(() =>
      findItemAlchemyEffect(item('bad', [pool, structuredClone(pool)]), 'spirit-gourd'),
    ).toThrow(/重复 2 个 drawFromResourcePool/)
  })

  it('resizes reward tiers exactly in one immutable effect value', () => {
    const grown = resizeResourcePoolEffect(pool, 4, 'fallback')
    expect(grown.maxRoll).toBe(4)
    expect(grown.rewards).toEqual([
      { itemId: 'a', count: 1 },
      { itemId: 'b', count: 1 },
      { itemId: 'b', count: 1 },
      { itemId: 'b', count: 1 },
    ])
    const shrunk = resizeResourcePoolEffect(grown, 1, 'fallback')
    expect(shrunk).toMatchObject({ maxRoll: 1, rewards: [{ itemId: 'a', count: 1 }] })
    expect(pool).toMatchObject({ maxRoll: 2, rewards: [{ itemId: 'a' }, { itemId: 'b' }] })
    for (const invalid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1000])
      expect(() => resizeResourcePoolEffect(pool, invalid, 'fallback')).toThrow(/1\.\.999/)
  })

  it('accepts PAL one-in-one-out recipes and rejects composite shapes without rewriting them', () => {
    expect(() => assertSingleInputOutputCraftRecipes(craft, 'vessel')).not.toThrow()
    for (const [ingredients, products] of [
      [[], [{ itemId: 'bug', count: 1 }]],
      [
        [
          { itemId: 'egg', count: 1 },
          { itemId: 'egg-2', count: 1 },
        ],
        [{ itemId: 'bug', count: 1 }],
      ],
      [[{ itemId: 'egg', count: 1 }], []],
      [
        [{ itemId: 'egg', count: 1 }],
        [
          { itemId: 'bug', count: 1 },
          { itemId: 'bug-2', count: 1 },
        ],
      ],
    ] as const) {
      const composite = {
        ...structuredClone(craft),
        recipes: [{ ingredients: [...ingredients], products: [...products] }],
      }
      expect(() => assertSingleInputOutputCraftRecipes(composite, 'vessel')).toThrow(
        /炼蛊 owner vessel 的规则 1 必须恰有 1 项材料和 1 项产物/,
      )
    }
  })

  it('mutates the latest item through exactly one UpdateItemCommand and preserves other effects', () => {
    const session = new EditSession(state([item('vessel', [{ kind: 'healHp', amount: 1 }, craft])]))
    const latest = session.getState().items[0]!
    session.dispatch(
      new UpdateItemCommand('vessel', {
        desc: ['latest'],
        use: {
          ...latest.use!,
          effects: [{ kind: 'healHp', amount: 2 }, ...latest.use!.effects.slice(1)],
        },
      }),
    )
    const before = session.getHistoryVersion()
    mutateItemAlchemyEffect(session, 'vessel', 'crafting', (effect) => ({
      ...effect,
      recipes: [
        ...effect.recipes,
        {
          ingredients: [{ itemId: 'egg-2', count: 1 }],
          products: [{ itemId: 'bug', count: 1 }],
        },
      ],
    }))
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(
      findItemAlchemyEffect(session.getState().items[0]!, 'crafting')?.effect.recipes,
    ).toHaveLength(2)
    expect(session.getState().items[0]!.desc).toEqual(['latest'])
    expect(session.getState().items[0]!.use?.effects[0]).toEqual({ kind: 'healHp', amount: 2 })
    expect(session.undo()).toBe(true)
    expect(
      findItemAlchemyEffect(session.getState().items[0]!, 'crafting')?.effect.recipes,
    ).toHaveLength(1)
    expect(session.redo()).toBe(true)
    expect(
      findItemAlchemyEffect(session.getState().items[0]!, 'crafting')?.effect.recipes,
    ).toHaveLength(2)

    const noOpVersion = session.getHistoryVersion()
    expect(
      mutateItemAlchemyEffect(session, 'vessel', 'crafting', (effect) => structuredClone(effect)),
    ).toBe(false)
    expect(session.getHistoryVersion()).toBe(noOpVersion)
  })
})
