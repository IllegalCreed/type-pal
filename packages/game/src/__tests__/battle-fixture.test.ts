import { describe, expect, it } from 'vitest'
import { makeBattleFixture } from './battle-fixture.js'

describe('battle fixture defaults', () => {
  it('default battle RNG preserves its seed when no random draw is needed', () => {
    const rng = makeBattleFixture().state.rng
    expect(rng.getState()).toBe(7)
    expect(rng.range(5, 5)).toBe(5)
    expect(rng.getState()).toBe(7)
  })
})
