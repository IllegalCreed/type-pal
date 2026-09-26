/**
 * TEST-GLM-ITEM-LOGIC-1 I3：世界用途预检残差（item.preflight.background.test.ts）。
 * 去重：validate.test C8 已证 21 种 effect × world/battle 支持矩阵、空效果链、
 * battleOnly 上下文；item.test 已证 useItem 失败原样返回——本文件只补冻结池内：
 * preflightWorldItemUse 的 unknown-item/wrong-context/not-owned/missing-target 四种失败
 * 与 needsTarget 豁免（allAllies、非目标类效果）、menu 提前成形。预检为纯查询：
 * 失败 outcome 的 world 是原引用，实际入参逐次快照比较，同型合法对照必须通过。
 */
import { describe, expect, test } from 'vitest'
import {
  expectInputsUnchanged,
  hero,
  item as makeItem,
  world,
} from './__tests__/glm-item-logic-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/guard-leaf-fixtures.js'
import type { WorldState } from './character.js'
import type { WorldItemUseOutcome } from './item.js'
import { type ItemDataMap, preflightWorldItemUse } from './item.js'

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
  reason: string,
  menu = 'keep',
): void {
  expect(outcome?.status).toBe('failure')
  expect(outcome?.reason).toBe(reason)
  expect(outcome?.menu).toBe(menu)
  expect(outcome?.consumed).toBe(false)
  expect(outcome?.changed).toBe(false)
  expect(outcome?.effectResults).toEqual([])
  expect(outcome?.world).toBe(input)
}

describe('I3 preflightWorldItemUse 残差', () => {
  test('unknown-item：不在 map 或无 use 块都拒绝，menu 缺省 keep', () => {
    const w = world([{ itemId: 'potion', count: 1 }])
    let outcome: WorldItemUseOutcome | undefined
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(w, 'hero', 'gone-item', items)
    }, [w, items])
    expectFailure(outcome, w, 'unknown-item')
    const noUse = world([{ itemId: 'noUse', count: 1 }])
    expectInputsUnchanged(() => {
      outcome = preflightWorldItemUse(noUse, 'hero', 'noUse', {
        noUse: makeItem({ id: 'noUse', name: '无用途' }),
      })
    }, [noUse, items])
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
    expectAcceptsUnchanged((value) => {
      outcome = preflightWorldItemUse(value, 'hero', 'potion', items)
    }, none)
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
