import { describe, expect, it } from 'vitest'
import { codeToAbstractKey, KeyboardInputSource } from './input.js'

const inheritedNames = ['constructor', 'toString', '__proto__']

describe('undefined physical-key names', () => {
  it('returns null for inherited object names while keeping a defined direction', () => {
    for (const code of inheritedNames) expect(codeToAbstractKey(code)).toBeNull()
    expect(codeToAbstractKey('ArrowUp')).toBe('Up')
  })

  it('ignores inherited names without changing held keys or adding pressed edges', () => {
    const source = new KeyboardInputSource(window)
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
      source.nextSnapshot(0)
      for (const code of inheritedNames) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }))
        const snapshot = source.nextSnapshot(1)
        expect([...snapshot.held]).toEqual(['Up'])
        expect([...snapshot.pressed]).toEqual([])
        window.dispatchEvent(new KeyboardEvent('keyup', { code }))
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }))
      const next = source.nextSnapshot(2)
      expect([...next.held]).toEqual(['Up', 'Down'])
      expect([...next.pressed]).toEqual(['Down'])
    } finally {
      source.detach()
    }
  })
})
