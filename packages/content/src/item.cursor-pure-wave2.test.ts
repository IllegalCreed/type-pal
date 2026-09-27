/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C3：具名 resources 写入，不碰 collectValue。
 * 资源池奖励必须先过物品结构与引用闭包；不重测 puppet/protect。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { world } from './__tests__/glm-item-logic-fixtures.js'
import type { AuthorItemCore } from './author-item-core.js'
import type { ItemDataMap } from './item.js'
import { resolveWorldItemUse } from './item.js'
import { validateItems } from './validate.js'
import { type ContentBundle, validateReferences } from './validate-refs.js'

function itemClosureBundle(items: AuthorItemCore[]): ContentBundle {
  return {
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items,
    locale: {},
    sprites: [],
    battleSprites: [],
    entryPoints: [],
    mapIndex: { version: 1, maps: [] },
  }
}

describe('C3 item 剩余合同', () => {
  test('drawFromResourcePool 写 herb，reward 先过结构与引用闭包，collectValue 与源世界不动', () => {
    const prize = {
      id: 'reward',
      name: '奖',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
    } satisfies AuthorItemCore
    const gourd = {
      id: 'gourd',
      name: '葫芦',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'herb',
            maxRoll: 1,
            rewards: [{ itemId: prize.id, count: 1 }],
          },
        ],
      },
    } satisfies AuthorItemCore
    const authored = [gourd, prize]
    const catalog = validateItems(authored)
    const catalogSnap = inputSnap(catalog)
    const authoredSnap = inputSnap(authored)
    expect(catalog.map((entry) => entry.id)).toEqual(['gourd', 'reward'])
    expect(
      validateReferences(itemClosureBundle(authored)).filter((issue) => issue.severity === 'error'),
    ).toEqual([])
    expect(authored).toEqual(authoredSnap)
    expect(catalog).toEqual(catalogSnap)

    const items: ItemDataMap = Object.fromEntries(catalog.map((entry) => [entry.id, entry]))
    const initial = {
      ...world([{ itemId: 'gourd', count: 1 }]),
      resources: { herb: 3 },
      collectValue: 99,
    }
    const snap = inputSnap(initial)
    const outcome = resolveWorldItemUse(initial, 'hero', 'gourd', items, undefined, () => 0)
    expect(outcome.status).toBe('success')
    expect(outcome.world).not.toBe(initial)
    expect(outcome.world.resources?.herb).toBe(2)
    expect(outcome.world.collectValue).toBe(99)
    expect(outcome.world.inventory).toEqual(
      expect.arrayContaining([
        { itemId: 'gourd', count: 1 },
        { itemId: 'reward', count: 1 },
      ]),
    )
    expect(outcome.effectResults[0]).toMatchObject({
      kind: 'drawFromResourcePool',
      resourceDraw: { resource: 'herb', spent: 1, valueAfter: 2 },
    })
    expect(initial).toEqual(snap)
    expect(initial.resources?.herb).toBe(3)
  })
})
