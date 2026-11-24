/** In-world restoration, health scaling and effect results. */

import { describe, expect, test } from 'vitest'
import { hero, item as makeItem, poisonDefs, world } from './__tests__/item-world-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { ItemData, ItemDataMap, ItemUseEffect, UseSpec } from './item.js'
import { resolveWorldItemUse } from './item.js'

const useItem = (
  effects: ItemUseEffect[],
  use: Partial<Omit<UseSpec, 'effects'>> = {},
  id = 'use-item',
): ItemData =>
  makeItem({
    id,
    name: '试用物品',
    use: { target: 'oneAlly', consuming: true, effects, ...use },
  })

describe('healHp/healMp：资源上限', () => {
  test('healHp：不足上限加满差额；恰好上限 HP 零变化但消耗照扣', () => {
    const base = world([{ itemId: 'use-item', count: 1 }], 60)
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'healHp', amount: 50 }]),
    }
    const outcome = resolveWorldItemUse(base, 'hero', 'use-item', items)
    expect(outcome.status).toBe('success')
    expect(outcome.world.party[0]!.hp).toBe(100)
    // 恰好上限：HP 零变化但消耗本身使 changed=true；效果对 HP 无贡献。
    const atCap = world([{ itemId: 'use-item', count: 1 }], 100)
    const capOutcome = resolveWorldItemUse(atCap, 'hero', 'use-item', items)
    expect(capOutcome.status).toBe('success')
    expect(capOutcome.world.party[0]!.hp).toBe(100)
    expect(capOutcome.world.inventory).toEqual([])
  })

  test('healMp：加 MP 钳 maxMP（30+40 → maxMP 50）', () => {
    const base = world([{ itemId: 'use-item', count: 1 }], 100, 30)
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'healMp', amount: 40 }]),
    }
    const outcome = resolveWorldItemUse(base, 'hero', 'use-item', items)
    expect(outcome.world.party[0]!.mp).toBe(50)
  })

  test.each([
    true,
    false,
  ])('treats both allies while consuming=%s controls one shared inventory charge', (consuming) => {
    const base = world([{ itemId: 'group-tonic', count: 2 }], 60)
    base.party.push(hero(80, 50, 'ally'))
    const item = useItem(
      [{ kind: 'healHp', amount: 5 }],
      { target: 'allAllies', consuming },
      'group-tonic',
    )
    const before = deepSnapshot(base)
    const outcome = resolveWorldItemUse(base, 'hero', item.id, { [item.id]: item })
    expect(outcome.status).toBe('success')
    expect(outcome.consumed).toBe(consuming)
    expect(outcome.world.party.map(({ hp }) => hp)).toEqual([65, 85])
    expect(outcome.world.inventory).toEqual([{ itemId: 'group-tonic', count: consuming ? 1 : 2 }])
    expect(base).toEqual(before)
  })
})

describe('scaleCurrentHp：分数缩放', () => {
  test('scaleCurrentHp trunc 截断（99→49）与满血减半（100→50）', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'scaleCurrentHp', numerator: 1, denominator: 2 }]),
    }
    // 99 HP → trunc(49.5)=49。
    const base = world([{ itemId: 'use-item', count: 1 }], 99)
    const outcome = resolveWorldItemUse(base, 'hero', 'use-item', items)
    expect(outcome.world.party[0]!.hp).toBe(49)
    // 满血 100 → 50（真减半，非零变化）。
    const full = world([{ itemId: 'use-item', count: 1 }], 100)
    const half = resolveWorldItemUse(full, 'hero', 'use-item', items)
    expect(half.world.party[0]!.hp).toBe(50)
    expect(half.changed).toBe(true)
  })

  test('满血 ×2/1 仍钳 maxHP 不越界', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'scaleCurrentHp', numerator: 2, denominator: 1 }]),
    }
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }], 100),
      'hero',
      'use-item',
      items,
    )
    expect(outcome.world.party[0]!.hp).toBe(100)
  })
})

describe('菜单去向与携带状态', () => {
  test('menuAfterUse 透传到成功 outcome（close）', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'healHp', amount: 5 }], { menuAfterUse: 'close' }),
    }
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }], 50),
      'hero',
      'use-item',
      items,
    )
    expect(outcome.menu).toBe('close')
  })

  test('携带状态写入本次效果的目标世界', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'applyStatus', status: 'sleep', turns: 2 }]),
    }
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }]),
      'hero',
      'use-item',
      items,
    )
    expect(outcome.world.party[0]!.extraStatuses).toEqual([{ status: 'sleep', turns: 2 }])
  })
})

describe('复合链顺序与 gate 显式阈值', () => {
  test('gate 显式 chance=50：rng 命中（roll<50）放行后续 healHp', () => {
    const items: ItemDataMap = {
      'use-item': useItem([
        { kind: 'gate', chance: 50 },
        { kind: 'healHp', amount: 10 },
      ]),
    }
    // rng=0.25 → roll=26 < 50 → 放行。
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }], 60),
      'hero',
      'use-item',
      items,
      undefined,
      () => 0.25,
    )
    expect(outcome.status).toBe('success')
    expect(outcome.world.party[0]!.hp).toBe(70)
  })

  test('applyPoison 登记没有额外逐拍效果的已定义毒', () => {
    const items: ItemDataMap = {
      'use-item': useItem([{ kind: 'applyPoison', poisonId: '551' }]),
    }
    const outcome = resolveWorldItemUse(
      world([{ itemId: 'use-item', count: 1 }]),
      'hero',
      'use-item',
      items,
      poisonDefs(),
      () => 0,
    )
    expect(outcome.world.party[0]!.poisons).toEqual([{ poisonId: 551, tickIndex: 0 }])
    expect(outcome.world.inventory).toEqual([])
  })
})

test('an explicit poison cure removes only the named poison and preserves the other continuation', () => {
  const cure = useItem([{ kind: 'curePoison', poisonId: '551' }], {}, 'cure')
  const base = world([{ itemId: 'cure', count: 1 }])
  const target = base.party[0]
  if (!target) throw new Error('Missing target fixture')
  target.poisons = [
    { poisonId: 551, tickIndex: 0 },
    { poisonId: 552, tickIndex: 1 },
  ]
  const before = deepSnapshot(base)
  const outcome = resolveWorldItemUse(base, 'hero', 'cure', { cure })
  expect(outcome.world.party[0]?.poisons).toEqual([{ poisonId: 552, tickIndex: 1 }])
  expect(base).toEqual(before)
})
