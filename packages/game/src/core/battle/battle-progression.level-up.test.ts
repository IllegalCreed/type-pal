/** Main-level-up snapshots and full spell slots; hidden growth is tested separately. */
import { describe, expect, it } from 'vitest'
import { recordingRng } from '../../__tests__/scripted-rng.js'
import { createBattleLifecycleFixture } from './battle-lifecycle.test-fixtures.js'
import { battleWonLevelUp } from './battle-progression.js'

function fixture() {
  const fx = createBattleLifecycleFixture({
    role: { level: 1, hp: 50, maxHP: 100, mp: 10, maxMP: 30, attackStrength: 20 },
  })
  fx.gs.Exp.rgPrimaryExp[0] = { wExp: 50, wLevel: 1, wCount: 0 }
  return fx
}

describe('main level-up output', () => {
  it('full spell slots keep every existing spell and report no new spell', () => {
    const { gs } = fixture()
    for (let slot = 0; slot < 32; slot++) gs.PlayerRolesRuntime.rgwMagic[slot]![0] = 300 + slot
    const before = gs.PlayerRolesRuntime.rgwMagic.map((row) => [...row])
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100,
      levelUpExp: Array<number>(100).fill(100),
      levelUpMagic: [[{ level: 1, magic: 354 }]],
      rng: recordingRng([0, 0, 0, 0, 0, 0]),
    })
    expect(results[0]).toMatchObject({ fromLevel: 1, toLevel: 2, learnedMagics: [] })
    expect(gs.PlayerRolesRuntime.rgwMagic).toEqual(before)
  })

  it('attack snapshot contains the equipment bonus before and after main growth', () => {
    const { gs } = fixture()
    gs.rgEquipmentEffect[0]!.rgwAttackStrength[0] = 7
    const results = battleWonLevelUp({
      gs,
      partyMembers: [0],
      expGained: 100,
      levelUpExp: Array<number>(100).fill(100),
      levelUpMagic: [],
      rng: recordingRng([0, 0, 0, 0, 0, 0]),
    })
    expect(results[0]!.snapshot?.attack).toEqual({ old: 27, cur: 31 })
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(24)
  })
})
