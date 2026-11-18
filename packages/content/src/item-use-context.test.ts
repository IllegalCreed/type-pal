import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { itemUseEffectSupportsContext } from './item.js'

describe('item status effects by execution context', () => {
  test('applyStatus(puppet) 仅 battle；protect 双上下文仍真；输入不变', () => {
    const puppet = { kind: 'applyStatus' as const, status: 'puppet' as const, turns: 1 }
    const protect = { kind: 'applyStatus' as const, status: 'protect' as const, turns: 2 }
    const puppetSnap = deepSnapshot(puppet)
    const protectSnap = deepSnapshot(protect)
    expect(itemUseEffectSupportsContext(puppet, 'world')).toBe(false)
    expect(itemUseEffectSupportsContext(puppet, 'battle')).toBe(true)
    expect(itemUseEffectSupportsContext(protect, 'world')).toBe(true)
    expect(itemUseEffectSupportsContext(protect, 'battle')).toBe(true)
    expect(puppet).toEqual(puppetSnap)
    expect(protect).toEqual(protectSnap)
  })
})
