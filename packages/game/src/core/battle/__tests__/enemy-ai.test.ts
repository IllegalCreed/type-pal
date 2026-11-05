import { describe, expect, it } from 'vitest'
import { makeEnemyRecord } from '../../../__tests__/battle-records.js'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import { createSeedableRng } from '../../rng.js'
import { decideEnemyAction } from '../enemy-ai.js'

// The production caller supplies full slot arrays, including dead/empty entries.
const PARTY = [{ idx: 0, hp: 100 }]
const ENEMIES = [{ idx: 0, hp: 50 }]

describe('enemy action selection', () => {
  it.each([
    {
      name: 'no spell',
      magic: 0,
      magicRate: 0,
      silence: 0,
      expected: { type: 'attack', target: 0 },
    },
    {
      name: 'guaranteed spell',
      magic: 50,
      magicRate: 10,
      silence: 0,
      expected: { type: 'magic', actionId: 50, target: 0 },
    },
    {
      name: 'zero spell rate',
      magic: 50,
      magicRate: 0,
      silence: 0,
      expected: { type: 'attack', target: 0 },
    },
    {
      name: 'silenced',
      magic: 50,
      magicRate: 10,
      silence: 1,
      expected: { type: 'attack', target: 0 },
    },
    {
      name: 'no-op spell sentinel',
      magic: 0xffff,
      magicRate: 10,
      silence: 0,
      expected: { type: 'pass', target: 0 },
    },
  ])('$name keeps the target and consumes a magic draw only when a spell exists', ({
    magic,
    magicRate,
    silence,
    expected,
  }) => {
    const rng = recordingRng()
    const action = decideEnemyAction({
      enemy: makeEnemyRecord({ magic, magicRate }),
      party: PARTY,
      enemySlots: ENEMIES,
      selfIdx: 0,
      status: { silence },
      rng,
    })
    expect(action).toEqual(expected)
    // Silence is checked after the spell draw (SDLPal fight.c:4656–4658).
    expect(rng.calls).toEqual(
      magic === 0 ? ['rangeInclusive(0,0)'] : ['rangeInclusive(0,0)', 'range(0,10)'],
    )
  })

  it.each([
    'sleep',
    'paralyzed',
  ] as const)('%s passes after selecting a live player, without a magic draw', (status) => {
    const rng = recordingRng([1])
    const action = decideEnemyAction({
      enemy: makeEnemyRecord({ magic: 50, magicRate: 10 }),
      party: [
        { idx: 0, hp: 50 },
        { idx: 1, hp: 80 },
      ],
      enemySlots: ENEMIES,
      selfIdx: 0,
      status: { [status]: 1 },
      rng,
    })
    expect(action).toEqual({ type: 'pass', target: 1 })
    expect(rng.calls).toEqual(['rangeInclusive(0,1)'])
  })

  it('rejects dead party slots without prefiltering or losing their draws', () => {
    const rng = recordingRng([0, 1, 2])
    const action = decideEnemyAction({
      enemy: makeEnemyRecord(),
      party: [
        { idx: 0, hp: 0 },
        { idx: 1, hp: 0 },
        { idx: 2, hp: 50 },
      ],
      enemySlots: ENEMIES,
      selfIdx: 0,
      rng,
    })
    expect(action).toEqual({ type: 'attack', target: 2 })
    expect(rng.calls).toEqual(['rangeInclusive(0,2)', 'rangeInclusive(0,2)', 'rangeInclusive(0,2)'])
  })

  it.each([
    { name: 'empty party', party: [] },
    { name: 'dead party', party: [{ idx: 0, hp: 0 }] },
  ])('passes without draws for $name', ({ party }) => {
    const rng = recordingRng()
    const action = decideEnemyAction({
      enemy: makeEnemyRecord(),
      party,
      enemySlots: ENEMIES,
      selfIdx: 0,
      rng,
    })
    expect(action).toEqual({ type: 'pass', target: -1 })
    expect(rng.calls).toEqual([])
  })

  it.each([
    { picked: 0, expected: { type: 'attack-mate', target: 0 } },
    { picked: 1, expected: { type: 'pass', target: 0 } },
  ])('confusion selects enemy $picked; selecting self passes', ({ picked, expected }) => {
    const rng = recordingRng([picked])
    const action = decideEnemyAction({
      enemy: makeEnemyRecord(),
      party: PARTY,
      enemySlots: [
        { idx: 0, hp: 50 },
        { idx: 1, hp: 50 },
      ],
      selfIdx: 1,
      status: { confused: 1 },
      rng,
    })
    expect(action).toEqual(expected)
    expect(rng.calls).toEqual(['rangeInclusive(0,0)', 'rangeInclusive(0,1)'])
  })

  it('confusion rejects dead and empty enemy slots while the acting enemy remains alive', () => {
    const rng = recordingRng([0, 1, 2])
    const action = decideEnemyAction({
      enemy: makeEnemyRecord(),
      party: PARTY,
      enemySlots: [
        { idx: 0, hp: 0 },
        { idx: 1, hp: 0 },
        { idx: 2, hp: 50 },
        { idx: 3, hp: 50 },
      ],
      selfIdx: 3,
      status: { confused: 1 },
      rng,
    })
    expect(action).toEqual({ type: 'attack-mate', target: 2 })
    expect(rng.calls).toEqual([
      'rangeInclusive(0,0)',
      'rangeInclusive(0,3)',
      'rangeInclusive(0,3)',
      'rangeInclusive(0,3)',
    ])
  })

  it('uses the fixed seed-42 draws to select party slot 1 and spell 50', () => {
    // Existing PRNG vectors: first samples ≈0.6011 and ≈0.4483; 3 party slots, spell rate 5/10.
    const action = decideEnemyAction({
      enemy: makeEnemyRecord({ magic: 50, magicRate: 5 }),
      party: [
        { idx: 0, hp: 100 },
        { idx: 1, hp: 50 },
        { idx: 2, hp: 80 },
      ],
      enemySlots: ENEMIES,
      selfIdx: 0,
      rng: createSeedableRng(42),
    })
    expect(action).toEqual({ type: 'magic', actionId: 50, target: 1 })
  })
})
