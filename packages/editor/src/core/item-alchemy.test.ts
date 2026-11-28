import { type ItemData, validateItems } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { EditSession } from './edit-session.js'
import {
  assertSingleInputOutputCraftRecipes,
  findItemAlchemyEffect,
  itemAlchemyOwners,
  mutateItemAlchemyEffect,
  resizeResourcePoolEffect,
} from './item-alchemy.js'
import { UpdateItemCommand } from './item-commands.js'

function item(id: string, effects: NonNullable<ItemData['use']>['effects']): ItemData {
  return {
    id,
    name: id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    ...(effects.length ? { use: { target: 'scene', consuming: false, effects } } : {}),
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

async function alchemySession(...owners: ItemData[]): Promise<EditSession> {
  const { state } = await loadBoundaryProject()
  const items = [...owners, ...['egg', 'egg-2', 'bug', 'a', 'b'].map((id) => item(id, []))]
  validateItems(items)
  return new EditSession({ ...state, items })
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
    const firstCopy = grown.rewards[2]
    if (!firstCopy) throw new Error('expected the first copied tier')
    firstCopy.count = 5
    expect(grown.rewards[3]?.count).toBe(1)
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

  it('mutates the latest item in one history step and preserves other effects', async () => {
    const session = await alchemySession(item('vessel', [{ kind: 'gate', chance: 50 }, craft]))
    const latest = session.getState().items[0]!
    session.dispatch(
      new UpdateItemCommand('vessel', {
        desc: ['latest'],
        use: {
          ...latest.use!,
          effects: [{ kind: 'gate', chance: 75 }, ...latest.use!.effects.slice(1)],
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
    expect(session.getState().items[0]!.use?.effects[0]).toEqual({ kind: 'gate', chance: 75 })
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

  it('a failed craft edit cannot publish a mutated value or history entry', async () => {
    const session = await alchemySession(item('vessel', [craft]))
    const before = session.getState()
    const version = session.getHistoryVersion()

    expect(() =>
      mutateItemAlchemyEffect(session, 'vessel', 'crafting', (effect) => {
        effect.recipes.length = 0
        throw new Error('edit cancelled')
      }),
    ).toThrow('edit cancelled')
    expect(session.getState()).toBe(before)
    expect(session.getState().items[0]?.use?.effects).toEqual([craft])
    expect(session.getHistoryVersion()).toBe(version)

    expect(() => mutateItemAlchemyEffect(session, 'bug', 'crafting', (effect) => effect)).toThrow(
      '物品 bug 缺 craftRecipe effect',
    )
    expect(session.canUndo()).toBe(false)
  })
})
