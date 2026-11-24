/** World item completion after an external effect has succeeded. */
import { describe, expect, test } from 'vitest'
import { expectInputsUnchanged, item as makeItem, world } from './__tests__/item-world-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { WorldState } from './character.js'
import type { ItemDataMap } from './item.js'
import { completeExternalWorldItemUse, useItem } from './item.js'

const scriptItem = (
  over: { id?: string; consuming?: boolean; menuAfterUse?: 'keep' | 'close' } = {},
) =>
  makeItem({
    id: over.id ?? 'script-item',
    name: '脚本物品',
    use: {
      target: 'scene',
      consuming: over.consuming ?? true,
      menuAfterUse: over.menuAfterUse,
      effects: [{ kind: 'runScript', script: { chunk: 'shared', id: 'user/outer' } }],
    },
  })

const items: ItemDataMap = {
  'script-item': scriptItem(),
  closeScript: scriptItem({ id: 'closeScript', menuAfterUse: 'close' }),
  potion: makeItem({
    id: 'potion',
    name: '药',
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
  }),
  keepCharm: scriptItem({ id: 'keepCharm', consuming: false }),
}

describe('completeExternalWorldItemUse', () => {
  test('unknown-item 拒绝且 menu 缺省 keep', () => {
    const w = world([])
    let outcome: ReturnType<typeof completeExternalWorldItemUse> | undefined
    expectInputsUnchanged(() => {
      outcome = completeExternalWorldItemUse(w, 'gone-item', items)
    }, [w, items])
    expect(outcome?.status).toBe('failure')
    expect(outcome?.reason).toBe('unknown-item')
    expect(outcome?.menu).toBe('keep')
    expect(outcome?.world).toBe(w)
  })

  test('menuAfterUse close 在成功 outcome 上成形', () => {
    const w = world([{ itemId: 'closeScript', count: 1 }])
    let outcome: ReturnType<typeof completeExternalWorldItemUse> | undefined
    expectInputsUnchanged(() => {
      outcome = completeExternalWorldItemUse(w, 'closeScript', items)
    }, [w, items])
    expect(outcome?.status).toBe('success')
    expect(outcome?.menu).toBe('close')
  })

  test('consuming 扣 1 件：完整 world 结果 = 输入深克隆仅变库存', () => {
    const w: WorldState = {
      ...world([{ itemId: 'script-item', count: 1 }]),
      money: 37,
      resources: { herb: 2 },
      learnedSkills: { hero: ['100'] },
    }
    const expected = deepSnapshot(w)
    expected.inventory = []
    let outcome: ReturnType<typeof completeExternalWorldItemUse> | undefined
    expectInputsUnchanged(() => {
      outcome = completeExternalWorldItemUse(w, 'script-item', items)
    }, [w, items])
    expect(outcome?.status).toBe('success')
    expect(outcome?.consumed).toBe(true)
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world).not.toBe(w)
    expect(outcome?.world).toEqual(expected)
    expect(outcome?.effectResults).toEqual([{ index: 0, kind: 'runScript', changed: true }])
  })

  test('world 引用合同：consumedByExternal 与不消费都返回原 world 引用', () => {
    const consumedByHost = world([{ itemId: 'potion', count: 1 }])
    let outcome: ReturnType<typeof completeExternalWorldItemUse> | undefined
    expectInputsUnchanged(() => {
      outcome = completeExternalWorldItemUse(consumedByHost, 'script-item', items)
    }, [consumedByHost, items])
    expect(outcome?.consumed).toBe(true)
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world).toBe(consumedByHost)
    const keepCharmWorld = world([{ itemId: 'keepCharm', count: 1 }])
    expectInputsUnchanged(() => {
      outcome = completeExternalWorldItemUse(keepCharmWorld, 'keepCharm', items)
    }, [keepCharmWorld, items])
    expect(outcome?.consumed).toBe(false)
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world).toBe(keepCharmWorld)
    expect(outcome?.world?.inventory).toEqual([{ itemId: 'keepCharm', count: 1 }])
  })

  describe('useItem 兼容壳残差', () => {
    test('external 物品：不结算不消耗，返回原 world 引用', () => {
      const w = world([{ itemId: 'script-item', count: 1 }])
      let returned: WorldState | undefined
      expectInputsUnchanged(() => {
        returned = useItem(w, 'hero', 'script-item', items)
      }, [w, items])
      expect(returned).toBe(w)
      expect(w.inventory).toEqual([{ itemId: 'script-item', count: 1 }])
    })

    test('battleOnly 物品经预检失败：原 world 返回', () => {
      const battleItems: ItemDataMap = {
        battleOnly: makeItem({
          id: 'battleOnly',
          name: '战斗药',
          use: {
            target: 'oneAlly',
            consuming: true,
            battleOnly: true,
            effects: [{ kind: 'healHp', amount: 30 }],
          },
        }),
      }
      const w = world([{ itemId: 'battleOnly', count: 1 }])
      let returned: WorldState | undefined
      expectInputsUnchanged(() => {
        returned = useItem(w, 'hero', 'battleOnly', battleItems)
      }, [w, battleItems])
      expect(returned).toBe(w)
      expect(w.inventory).toEqual([{ itemId: 'battleOnly', count: 1 }])
    })
  })
})
