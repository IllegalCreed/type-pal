/** Direct defend contracts; controller scheduling and browser presentation are separate. */
import { describe, expect, it } from 'vitest'
import { performDefend } from '../actions/defend.js'
import { makeActionFixture } from './action.test-fixtures.js'

describe('performDefend', () => {
  it('设 players[idx].defending = true', () => {
    const { state } = makeActionFixture({ defending: false })
    expect(state.players[0]!.defending).toBe(false)
    performDefend(state, 0)
    expect(state.players[0]!.defending).toBe(true)
  })
  it('对越界 idx 安全(不抛错)', () => {
    const { state } = makeActionFixture()
    expect(() => performDefend(state, 99)).not.toThrow()
  })
})
