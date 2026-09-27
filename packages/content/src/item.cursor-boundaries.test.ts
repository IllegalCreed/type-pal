/**
 * TEST-CURSOR-PURE-WAVE-1 A04：puppet 不可带入世界使用。
 * C8 protect 双上下文与装备交换见既有 item 背景测试，不重做。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './cursor-pure-fixtures.js'
import { itemUseEffectSupportsContext } from './item.js'

describe('A04 item 剩余合同', () => {
  test('applyStatus(puppet) 仅 battle；protect 双上下文仍真；输入不变', () => {
    const puppet = { kind: 'applyStatus' as const, status: 'puppet' as const, turns: 1 }
    const protect = { kind: 'applyStatus' as const, status: 'protect' as const, turns: 2 }
    const puppetSnap = inputSnap(puppet)
    const protectSnap = inputSnap(protect)
    expect(itemUseEffectSupportsContext(puppet, 'world')).toBe(false)
    expect(itemUseEffectSupportsContext(puppet, 'battle')).toBe(true)
    expect(itemUseEffectSupportsContext(protect, 'world')).toBe(true)
    expect(itemUseEffectSupportsContext(protect, 'battle')).toBe(true)
    expect(puppet).toEqual(puppetSnap)
    expect(protect).toEqual(protectSnap)
  })
})
