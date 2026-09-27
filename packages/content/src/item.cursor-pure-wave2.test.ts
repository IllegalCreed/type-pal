/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C3：具名 resources 写入，不碰 collectValue。
 * 不重测 puppet/protect；item.test 只抽 collectValue。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { item, world } from './__tests__/glm-item-logic-fixtures.js'
import { resolveWorldItemUse } from './item.js'

describe('C3 item 剩余合同', () => {
  test('drawFromResourcePool 写 herb，collectValue 与源世界不动', () => {
    const gourd = item({
      id: 'gourd',
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'herb',
            maxRoll: 1,
            rewards: [{ itemId: 'reward', count: 1 }],
          },
        ],
      },
    })
    const items = { [gourd.id]: gourd }
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
