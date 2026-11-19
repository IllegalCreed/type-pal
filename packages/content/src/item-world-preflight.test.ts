/** World item ownership, context and target checks before applying effects. */

import { describe, expect, test } from 'vitest'
import {
  expectInputsUnchanged,
  hero,
  item as makeItem,
  world,
} from './__tests__/glm-item-logic-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { WorldState } from './character.js'
import type { WorldItemUseOutcome } from './item.js'
import { type ItemDataMap, preflightWorldItemUse, resolveWorldItemUse } from './item.js'

const items: ItemDataMap = {
  potion: makeItem({
    id: 'potion',
    name: '药',
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
  }),
  closePotion: makeItem({
    id: 'closePotion',
    name: '会关菜单的药',
    use: {
      target: 'oneAlly',
      consuming: true,
      menuAfterUse: 'close',
      effects: [{ kind: 'healHp', amount: 50 }],
    },
  }),
  battleOnly: makeItem({
    id: 'battleOnly',
    name: '战斗符',
    use: {
      target: 'oneAlly',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'healMp', amount: 20 }],
    },
  }),
  sceneCharm: makeItem({
    id: 'sceneCharm',
    name: '场景符',
    use: {
      target: 'scene',
      consuming: true,
      effects: [{ kind: 'runSceneHook', hook: 'onTeleport' }],
    },
  }),
}

/** 失败 outcome 统一形状断言：原 world 引用、零副作用、reason/menu 精确。 */
function expectFailure(
  outcome: WorldItemUseOutcome | undefined,
  input: WorldState,
  reason: NonNullable<WorldItemUseOutcome['reason']>,
  menu: WorldItemUseOutcome['menu'] = 'keep',
): void {
  expect(outcome?.status).toBe('failure')
  expect(outcome?.reason).toBe(reason)
  expect(outcome?.menu).toBe(menu)
  expect(outcome?.consumed).toBe(false)
  expect(outcome?.changed).toBe(false)
  expect(outcome?.effectResults).toEqual([])
  expect(outcome?.presentations).toEqual([])
  expect(outcome?.world).toBe(input)
}

describe('preflightWorldItemUse', () => {
  test('unknown-item：不在 map 或无 use 块都拒绝，menu 缺省 keep', () => {
    const w = world([{ itemId: 'potion', count: 1 }])
    let outcome: WorldItemUseOutcome | undefined
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(w, 'hero', 'gone-item', items)
    }, [w, items])
    expectFailure(outcome, w, 'unknown-item')
    const noUse = world([{ itemId: 'noUse', count: 1 }])
    const noUseCatalog: ItemDataMap = {
      noUse: makeItem({ id: 'noUse', name: '无用途' }),
    }
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(noUse, 'hero', 'noUse', noUseCatalog)
    }, [noUse, noUseCatalog])
    expectFailure(outcome, noUse, 'unknown-item')
  })

  test('wrong-context：battleOnly 用途拒绝', () => {
    const w = world([{ itemId: 'battleOnly', count: 1 }])
    let outcome: WorldItemUseOutcome | undefined
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(w, 'hero', 'battleOnly', items)
    }, [w, items])
    expectFailure(outcome, w, 'wrong-context')
  })

  test('not-owned：包里 0 件且未装备拒绝；装备中的件可通过所有权门', () => {
    const none = world([])
    let outcome: WorldItemUseOutcome | undefined
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(none, 'hero', 'potion', items)
    }, [none, items])
    expectFailure(outcome, none, 'not-owned')
    const equipped: WorldState = {
      ...world([]),
      party: [{ ...hero(), equipment: { accessory: 'talisman' } }],
    }
    const talismanItems: ItemDataMap = {
      talisman: makeItem({
        id: 'talisman',
        name: '护符',
        equip: {
          slot: 'accessory',
          equipableBy: ['hero'],
          effects: [{ kind: 'resistance', element: 'wind', percent: 10 }],
        },
        use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healMp', amount: 20 }] },
      }),
    }
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(equipped, 'hero', 'talisman', talismanItems)
    }, [equipped, talismanItems])
    expect(outcome).toBeUndefined()
  })

  test('missing-target：oneAlly 缺目标拒绝、同型合法对照（目标在场）通过', () => {
    const nobody = world([{ itemId: 'potion', count: 1 }])
    let outcome: WorldItemUseOutcome | undefined
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(nobody, 'nobody', 'potion', items)
    }, [nobody, items])
    expectFailure(outcome, nobody, 'missing-target')
    const withTarget = {
      ...world([{ itemId: 'potion', count: 1 }]),
      party: [hero(), hero(90, 45, 'mage')],
    } satisfies WorldState
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(withTarget, 'mage', 'potion', items)
    }, [withTarget, items])
    expect(outcome).toBeUndefined()
  })

  test('allAllies 豁免目标检查；非目标类效果（场景钩子）豁免', () => {
    let outcome: WorldItemUseOutcome | undefined
    const allAllies = {
      ...world([{ itemId: 'groupTonic', count: 1 }]),
      party: [hero()],
    } satisfies WorldState
    const allItems: ItemDataMap = {
      groupTonic: makeItem({
        id: 'groupTonic',
        name: '群药',
        use: {
          target: 'allAllies',
          consuming: true,
          effects: [{ kind: 'healHp', amount: 30 }],
        },
      }),
    }
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(allAllies, 'nobody', 'groupTonic', allItems)
    }, [allAllies, allItems])
    expect(outcome).toBeUndefined()
    const sceneW = world([{ itemId: 'sceneCharm', count: 1 }])
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(sceneW, 'nobody', 'sceneCharm', items)
    }, [sceneW, items])
    expect(outcome).toBeUndefined()
  })

  test('menu 在失败 outcome 上提前成形（close）', () => {
    const w = world([])
    let outcome: WorldItemUseOutcome | undefined
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(w, 'hero', 'closePotion', items)
    }, [w, items])
    expectFailure(outcome, w, 'not-owned', 'close')
  })
})

test('the actual resolver returns the preflight failure before healing or consuming the item', () => {
  const input = world([{ itemId: 'potion', count: 2 }], 40)
  const before = deepSnapshot(input)
  const result = resolveWorldItemUse(input, 'absent', 'potion', items)
  expectFailure(result, input, 'missing-target')
  expect(input).toEqual(before)
})
