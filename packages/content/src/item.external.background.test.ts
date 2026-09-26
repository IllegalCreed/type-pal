/**
 * TEST-GLM-ITEM-LOGIC-1 I6：外部提交口与兼容壳残差
 * （item.external.background.test.ts）。
 * 去重：item.test.ts 已证 resolve 的 external 待执行请求、useItem 的回 HP/用光/非法/
 * 穿戴可用四例——本文件只补冻结池内：completeExternalWorldItemUse 的 unknown-item、
 * menu close 提前成形、consuming 扣件、consumedByExternal（脚本已搬走物品时上报消耗但
 * 保留 host 世界原引用）、consuming:false 不扣、多效果逐条 changed 保序；useItem 的
 * external 原引用路径。不伪造外部脚本执行：external 效果一律不在 content 层结算。
 */
import { describe, expect, test } from 'vitest'
import { item as makeItem, world } from './__tests__/glm-item-logic-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/guard-leaf-fixtures.js'
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

describe('I6 completeExternalWorldItemUse 残差', () => {
  test('unknown-item 拒绝且 menu 缺省 keep', () => {
    const w = world([])
    let outcome: ReturnType<typeof completeExternalWorldItemUse> | undefined
    expectAcceptsUnchanged((value) => {
      outcome = completeExternalWorldItemUse(value, 'gone-item', items)
    }, w)
    expect(outcome?.status).toBe('failure')
    expect(outcome?.reason).toBe('unknown-item')
    expect(outcome?.menu).toBe('keep')
    expect(outcome?.world).toBe(w)
  })

  test('menuAfterUse close 在成功 outcome 上成形', () => {
    const w = world([{ itemId: 'closeScript', count: 1 }])
    let outcome: ReturnType<typeof completeExternalWorldItemUse> | undefined
    expectAcceptsUnchanged((value) => {
      outcome = completeExternalWorldItemUse(value, 'closeScript', items)
    }, w)
    expect(outcome?.status).toBe('success')
    expect(outcome?.menu).toBe('close')
  })

  test('consuming 扣 1 件：世界为 clone、effectResults 全 changed 保序', () => {
    const w = world([{ itemId: 'script-item', count: 1 }])
    let outcome: ReturnType<typeof completeExternalWorldItemUse> | undefined
    expectAcceptsUnchanged((value) => {
      outcome = completeExternalWorldItemUse(value, 'script-item', items)
    }, w)
    expect(outcome?.status).toBe('success')
    expect(outcome?.consumed).toBe(true)
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world).not.toBe(w)
    expect(outcome?.world?.inventory).toEqual([])
    expect(outcome?.effectResults).toEqual([{ index: 0, kind: 'runScript', changed: true }])
  })

  test('world 引用合同：consumedByExternal 与不消费都返回原 world 引用', () => {
    const consumedByHost = world([{ itemId: 'potion', count: 1 }])
    let outcome: ReturnType<typeof completeExternalWorldItemUse> | undefined
    expectAcceptsUnchanged((value) => {
      outcome = completeExternalWorldItemUse(value, 'script-item', items)
    }, consumedByHost)
    expect(outcome?.consumed).toBe(true)
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world).toBe(consumedByHost)
    const keepCharmWorld = world([{ itemId: 'keepCharm', count: 1 }])
    expectAcceptsUnchanged((value) => {
      outcome = completeExternalWorldItemUse(value, 'keepCharm', items)
    }, keepCharmWorld)
    expect(outcome?.consumed).toBe(false)
    expect(outcome?.changed).toBe(true)
    expect(outcome?.world).toBe(keepCharmWorld)
    expect(outcome?.world?.inventory).toEqual([{ itemId: 'keepCharm', count: 1 }])
  })

  describe('I6 useItem 兼容壳残差', () => {
    test('external 物品：不结算不消耗，返回原 world 引用', () => {
      const w = world([{ itemId: 'script-item', count: 1 }])
      let returned: WorldState | undefined
      expectAcceptsUnchanged((value) => {
        returned = useItem(value, 'hero', 'script-item', items)
      }, w)
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
      expectAcceptsUnchanged((value) => {
        returned = useItem(value, 'hero', 'battleOnly', battleItems)
      }, w)
      expect(returned).toBe(w)
      expect(w.inventory).toEqual([{ itemId: 'battleOnly', count: 1 }])
    })
  })
})
