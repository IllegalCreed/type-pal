import { describe, it, expect, expectTypeOf } from 'vitest'
import type { AbstractKey, InputSnapshot, InputSource } from './input.js'

describe('input types', () => {
  it('AbstractKey 联合', () => {
    expectTypeOf<AbstractKey>().toEqualTypeOf<
      'Up' | 'Down' | 'Left' | 'Right'
      | 'Confirm' | 'Cancel' | 'Menu'
      | 'PgUp' | 'PgDn' | 'Home' | 'End'
      | 'Repeat' | 'Auto' | 'Defend'
      | 'UseItem' | 'ThrowItem' | 'Flee' | 'Force' | 'Status'
    >()
  })

  it('InputSnapshot 字段', () => {
    const snap: InputSnapshot = {
      held: new Set<AbstractKey>(),
      pressed: new Set<AbstractKey>(['Confirm']),
      frameNum: 42,
    }
    expect(snap.frameNum).toBe(42)
    expect(snap.pressed.has('Confirm')).toBe(true)
  })

  it('InputSource 接口', () => {
    const src: InputSource = {
      nextSnapshot(frameNum: number): InputSnapshot {
        return { held: new Set(), pressed: new Set(), frameNum }
      },
    }
    expect(src.nextSnapshot(0).frameNum).toBe(0)
  })

  it('InputSnapshot.held / pressed expose only ReadonlySet (no mutation)', () => {
    expectTypeOf<InputSnapshot['held']>().toEqualTypeOf<ReadonlySet<AbstractKey>>()
    expectTypeOf<InputSnapshot['pressed']>().toEqualTypeOf<ReadonlySet<AbstractKey>>()
  })
})
