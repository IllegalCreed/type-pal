/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C3：未知物买拒绝与卖剩数量。
 * shop.test.ts 已证钱够叠加、钱不够 null、卖光移除。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, WAVE2_SHOP_ITEMS } from './__tests__/cursor-pure-wave2-fixtures.js'
import type { WorldState } from './character.js'
import { shopBuy, shopSell } from './shop.js'

function purse(money: number, inventory: WorldState['inventory']): WorldState {
  return { party: [], money, learnedSkills: {}, inventory }
}

describe('C3 shop 剩余合同', () => {
  test('钱够但未知物买为 null；卖 2 件剩 1，源世界不动', () => {
    const rich = purse(999, [])
    const richSnap = inputSnap(rich)
    expect(shopBuy(rich, 'item.ghost', WAVE2_SHOP_ITEMS)).toBeNull()
    expect(rich).toEqual(richSnap)

    const packed = purse(0, [{ itemId: 'item.sword', count: 2 }])
    const packedSnap = inputSnap(packed)
    expect(shopSell(packed, 'item.sword', WAVE2_SHOP_ITEMS)).toEqual({
      party: [],
      money: 25,
      learnedSkills: {},
      inventory: [{ itemId: 'item.sword', count: 1 }],
    })
    expect(packed).toEqual(packedSnap)
    expect(packed.inventory[0]?.count).toBe(2)
  })
})
