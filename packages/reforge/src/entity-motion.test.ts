import type { GridPos } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  COLLISION_EPSILON,
  type MotionActor,
  MotionFairnessClock,
  type MotionIntent,
  type MotionSnapshotActor,
  motionActorKey,
  motionFootprintsOverlap,
  motionSweepsConflict,
  motionTerrainSweepBlocked,
  planEntityMotion,
  type SideStick,
} from './entity-motion.js'

const foot = [{ dcol: 0, drow: 0 }] as const
const open = () => false

function pos(col: number, row = 0, height = 0): GridPos {
  return { col, row, height }
}

function entity(id: string): MotionActor {
  return { kind: 'entity', id }
}

function party(at: GridPos, facing: MotionSnapshotActor['facing'] = 'down'): MotionSnapshotActor {
  return {
    actor: { kind: 'party' },
    pos: at,
    facing,
    footprints: foot,
    hasBody: true,
    yieldable: false,
  }
}

function partyIntent(
  from: GridPos,
  desired: GridPos,
  options: Partial<MotionIntent> = {},
): MotionIntent {
  return {
    actor: { kind: 'party' },
    source: 'player',
    collision: 'dynamic',
    from,
    desired,
    desiredFacing: 'right',
    floating: false,
    epoch: 1,
    quantum: 1,
    allowSidestep: true,
    ...options,
  }
}

function body(
  id: string,
  at: GridPos,
  options: Partial<Pick<MotionSnapshotActor, 'hasBody' | 'yieldable' | 'footprints'>> = {},
): MotionSnapshotActor {
  return {
    actor: entity(id),
    pos: at,
    facing: 'down',
    footprints: options.footprints ?? foot,
    hasBody: options.hasBody ?? true,
    yieldable: options.yieldable ?? true,
  }
}

function intent(
  id: string,
  from: GridPos,
  desired: GridPos,
  options: Partial<MotionIntent> = {},
): MotionIntent {
  return {
    actor: entity(id),
    source: 'auto',
    collision: 'dynamic',
    from,
    desired,
    desiredFacing:
      desired.col > from.col
        ? 'right'
        : desired.col < from.col
          ? 'left'
          : desired.row > from.row
            ? 'down'
            : 'up',
    floating: false,
    epoch: 1,
    quantum: Math.max(Math.abs(desired.col - from.col), Math.abs(desired.row - from.row)),
    allowSidestep: false,
    ...options,
  }
}

function outcomeKinds(plan: ReturnType<typeof planEntityMotion>): Record<string, string> {
  return Object.fromEntries(
    plan.outcomes.map((outcome) => [motionActorKey(outcome.actor), outcome.kind]),
  )
}

describe('entity motion continuous geometry', () => {
  test('footprint uses L-infinity distance, ignores height, and allows exact adjacency', () => {
    expect(motionFootprintsOverlap(pos(0), pos(1, 0, 99))).toBe(false)
    expect(motionFootprintsOverlap(pos(0), pos(1 - COLLISION_EPSILON * 2, 0, 99))).toBe(true)
    expect(motionFootprintsOverlap(pos(0), pos(0, 0, 99))).toBe(true)
  })

  test('exact swept check catches swap and perpendicular crossing', () => {
    expect(motionSweepsConflict(pos(0), pos(1), foot, pos(1), pos(0), foot)).toBe(true)
    expect(motionSweepsConflict(pos(-1), pos(1), foot, pos(0, -1), pos(0, 1), foot)).toBe(true)
  })

  test('same-speed convoy at exact one-grid spacing stays valid', () => {
    expect(motionSweepsConflict(pos(0), pos(0.375), foot, pos(1), pos(1.375), foot)).toBe(false)
  })

  test('different-speed pursuit that closes below one grid is rejected', () => {
    expect(motionSweepsConflict(pos(0), pos(1), foot, pos(1.5), pos(1.75), foot)).toBe(true)
  })

  test('terrain sweep samples run/snap segments at no more than 0.25 grid', () => {
    const visited: number[] = []
    const blocked = motionTerrainSweepBlocked(pos(0), pos(1), foot, (point) => {
      visited.push(point.col)
      return point.col === 0.5
    })
    expect(blocked).toBe(true)
    expect(visited).toEqual([0.25, 0.5])
  })

  test.each([
    0.25, 0.375,
  ])('pre-existing full overlap can escape monotonically by %s', (quantum) => {
    expect(motionSweepsConflict(pos(0), pos(quantum), foot, pos(0), pos(0), foot)).toBe(false)
  })

  test('partial overlap can move outward, but not hold distance or dip inward first', () => {
    expect(motionSweepsConflict(pos(0), pos(-0.25), foot, pos(0.5), pos(0.5), foot)).toBe(false)
    expect(motionSweepsConflict(pos(0), pos(0.25), foot, pos(0.5), pos(0.5), foot)).toBe(true)
    expect(motionSweepsConflict(pos(0), pos(0.25), foot, pos(0.5), pos(0.75), foot)).toBe(true)
    // It ends farther away, but first travels through the blocker.
    expect(motionSweepsConflict(pos(0), pos(1.5), foot, pos(0.5), pos(0.5), foot)).toBe(true)
  })

  test('compound footprints ignore their internal overlap and block on any external member', () => {
    const cluster = [
      { dcol: 0, drow: 0 },
      { dcol: 0.5, drow: 0 },
    ]
    expect(motionSweepsConflict(pos(0), pos(0), cluster, pos(1.5), pos(1.5), foot)).toBe(false)
    expect(motionSweepsConflict(pos(0), pos(0.25), cluster, pos(1.5), pos(1.5), foot)).toBe(true)
  })

  test('compound escape allows one old overlap to improve while another holds steady', () => {
    const cluster = [
      { dcol: 0, drow: 0 },
      { dcol: 0, drow: 1 },
    ]
    expect(
      motionSweepsConflict(pos(0, 0), pos(0, -0.25), cluster, pos(0.5, 0.5), pos(0.5, 0.5), foot),
    ).toBe(false)
  })
})

describe('entity motion deterministic arbitration', () => {
  test('same destination has one stable winner and ignores input order', () => {
    const actors = [body('a', pos(0)), body('b', pos(2))]
    const intents = [intent('a', pos(0), pos(1)), intent('b', pos(2), pos(1))]
    const forward = planEntityMotion({ tick: 0, actors, intents, terrainBlocked: open })
    const reversed = planEntityMotion({
      tick: 0,
      actors: [...actors].reverse(),
      intents: [...intents].reverse(),
      terrainBlocked: open,
    })
    expect(outcomeKinds(forward)).toEqual({ '1:a': 'moved', '1:b': 'blocked' })
    expect(reversed).toEqual(forward)
  })

  test('two-way swap and a three-actor cycle never exchange occupied positions', () => {
    const swap = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0)), body('b', pos(1))],
      intents: [intent('a', pos(0), pos(1)), intent('b', pos(1), pos(0))],
      terrainBlocked: open,
    })
    expect(outcomeKinds(swap)).toEqual({ '1:a': 'blocked', '1:b': 'blocked' })

    const cycle = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0, 0)), body('b', pos(1, 0)), body('c', pos(1, 1))],
      intents: [
        intent('a', pos(0, 0), pos(1, 0)),
        intent('b', pos(1, 0), pos(1, 1)),
        intent('c', pos(1, 1), pos(0, 0)),
      ],
      terrainBlocked: open,
    })
    expect(Object.values(outcomeKinds(cycle))).toEqual(['blocked', 'blocked', 'blocked'])
  })

  test('independent long paths that cross synchronously cannot both move', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(-1, 0)), body('b', pos(0, -1))],
      intents: [intent('a', pos(-1, 0), pos(1, 0)), intent('b', pos(0, -1), pos(0, 1))],
      terrainBlocked: open,
    })
    expect(Object.values(outcomeKinds(plan)).sort()).toEqual(['blocked', 'moved'])
    expect(plan.logicalSubphases).toHaveLength(1)
  })

  test('vacate dependencies are rebuilt globally and cannot admit two actors to one endpoint', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(-2, 1)), body('b', pos(-2, -2)), body('c', pos(-2, 0))],
      intents: [
        intent('a', pos(-2, 1), pos(-2, -1)),
        intent('b', pos(-2, -2), pos(-2, -1)),
        intent('c', pos(-2, 0), pos(-2, -2), { allowSidestep: true }),
      ],
      terrainBlocked: open,
    })
    const acceptedEndpoints = plan.outcomes
      .filter((outcome) => outcome.kind !== 'blocked')
      .map((outcome) => `${outcome.to.col},${outcome.to.row}`)
    expect(new Set(acceptedEndpoints).size).toBe(acceptedEndpoints.length)
    expect(
      plan.outcomes.filter(
        (outcome) =>
          (motionActorKey(outcome.actor) === '1:a' || motionActorKey(outcome.actor) === '1:b') &&
          outcome.kind === 'moved',
      ),
    ).toHaveLength(1)
  })

  test('a three-actor vacate chain is validated back-to-front in distinct phases', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(1)), body('b', pos(0)), body('c', pos(2))],
      intents: [
        intent('a', pos(1), pos(0)),
        intent('b', pos(0), pos(-1)),
        intent('c', pos(2), pos(1)),
      ],
      terrainBlocked: open,
    })
    expect(outcomeKinds(plan)).toEqual({ '1:a': 'moved', '1:b': 'moved', '1:c': 'moved' })
    expect(plan.logicalSubphases.map((phase) => phase.map(motionActorKey))).toEqual([
      ['1:b'],
      ['1:a'],
      ['1:c'],
    ])
  })

  test('an acyclic convoy vacates back-to-front, then commits as one result', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0)), body('b', pos(1)), body('c', pos(2))],
      intents: [
        intent('a', pos(0), pos(1)),
        intent('b', pos(1), pos(2)),
        intent('c', pos(2), pos(3)),
      ],
      terrainBlocked: open,
    })
    expect(outcomeKinds(plan)).toEqual({ '1:a': 'moved', '1:b': 'moved', '1:c': 'moved' })
    expect(plan.logicalSubphases.map((phase) => motionActorKey(phase[0]!))).toEqual([
      '1:c',
      '1:b',
      '1:a',
    ])
  })

  test('a follower cannot enter a dependency position when the leader is terrain-blocked', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0)), body('b', pos(1))],
      intents: [intent('a', pos(0), pos(1)), intent('b', pos(1), pos(2))],
      terrainBlocked: (point) => point.col === 2,
    })
    expect(outcomeKinds(plan)).toEqual({ '1:a': 'blocked', '1:b': 'blocked' })
  })

  test('shuffling a four-way contention 100 times is byte-identical', () => {
    const actors = [
      body('d', pos(1, 2)),
      body('b', pos(2, 1)),
      body('a', pos(0, 1)),
      body('c', pos(1, 0)),
    ]
    const intents = [
      intent('d', pos(1, 2), pos(1, 1)),
      intent('b', pos(2, 1), pos(1, 1)),
      intent('a', pos(0, 1), pos(1, 1)),
      intent('c', pos(1, 0), pos(1, 1)),
    ]
    const expected = JSON.stringify(
      planEntityMotion({ tick: 3, actors, intents, terrainBlocked: open }),
    )
    for (let i = 0; i < 100; i++) {
      const shift = i % actors.length
      const shuffledActors = [...actors.slice(shift), ...actors.slice(0, shift)].reverse()
      const shuffledIntents = [...intents.slice(-shift), ...intents.slice(0, -shift)].reverse()
      expect(
        JSON.stringify(
          planEntityMotion({
            tick: 3,
            actors: shuffledActors,
            intents: shuffledIntents,
            terrainBlocked: open,
          }),
        ),
      ).toBe(expected)
    }
  })

  test('rotated world priority prevents a fixed-id reservation winner', () => {
    const actors = [body('a', pos(0)), body('b', pos(2))]
    const intents = [intent('a', pos(0), pos(1)), intent('b', pos(2), pos(1))]
    const winners = new Set<string>()
    for (let tick = 0; tick < 8; tick++) {
      const plan = planEntityMotion({ tick, actors, intents, terrainBlocked: open })
      const winner = plan.outcomes.find((outcome) => outcome.kind === 'moved')
      if (winner) winners.add(motionActorKey(winner.actor))
    }
    expect(winners).toEqual(new Set(['1:a', '1:b']))
  })

  test('component-local eligible clock survives skipped cadence and changing leaf epochs', () => {
    const actors = [body('a', pos(0)), body('b', pos(2))]
    const fairnessClock = new MotionFairnessClock()
    const winners = new Set<string>()
    for (let attempt = 0; attempt < 8; attempt++) {
      fairnessClock.beginBatch()
      const plan = planEntityMotion({
        // Simulate slow/pacing gaps: these are the only ticks on which this component is eligible.
        tick: 1 + attempt * 2,
        actors,
        intents: [
          intent('a', pos(0), pos(1), { epoch: attempt + 1 }),
          intent('b', pos(2), pos(1), { epoch: attempt + 101 }),
        ],
        fairnessTickForGroup: (members) => fairnessClock.tickForGroup(members),
        terrainBlocked: open,
      })
      fairnessClock.commitBatch(new Set(['1:a', '1:b']))
      const winner = plan.outcomes.find((outcome) => outcome.kind === 'moved')
      if (winner) winners.add(motionActorKey(winner.actor))
    }
    expect(winners).toEqual(new Set(['1:a', '1:b']))
  })

  test('unrelated movers cannot perturb one contention component for eight ticks', () => {
    const contestedActors = [body('a', pos(0)), body('b', pos(2))]
    const contestedIntents = [intent('a', pos(0), pos(1)), intent('b', pos(2), pos(1))]
    const unrelatedActors = Array.from({ length: 10 }, (_, index) =>
      body(`u${index}`, pos(20 + index * 3)),
    )
    const unrelatedIntents = unrelatedActors.map((actor, index) =>
      intent(`u${index}`, actor.pos, pos(actor.pos.col + 0.25)),
    )
    const winners = new Set<string>()
    for (let tick = 0; tick < 8; tick++) {
      const plan = planEntityMotion({
        tick,
        actors: [...contestedActors, ...unrelatedActors],
        intents: [...contestedIntents, ...unrelatedIntents],
        terrainBlocked: open,
      })
      const winner = plan.outcomes.find(
        (outcome) =>
          (motionActorKey(outcome.actor) === '1:a' || motionActorKey(outcome.actor) === '1:b') &&
          outcome.kind === 'moved',
      )
      if (winner) winners.add(motionActorKey(winner.actor))
    }
    expect(winners).toEqual(new Set(['1:a', '1:b']))
  })

  test('side-candidate reservation contention rotates even when primaries are unrelated', () => {
    const actors = [
      body('a', pos(0, -2)),
      body('b', pos(0, 0)),
      body('a-wall', pos(1, -2), { yieldable: false }),
      body('b-wall', pos(1, 0), { yieldable: false }),
      body('b-other-side', pos(0, 1), { yieldable: false }),
    ]
    const intents = [
      intent('a', pos(0, -2), pos(1, -2), { allowSidestep: true }),
      intent('b', pos(0, 0), pos(1, 0), { allowSidestep: true }),
    ]
    const progressed = new Set<string>()
    for (let tick = 0; tick < 8; tick++) {
      const plan = planEntityMotion({ tick, actors, intents, terrainBlocked: open })
      for (const outcome of plan.outcomes) {
        if (outcome.kind === 'sidestepped') progressed.add(motionActorKey(outcome.actor))
      }
    }
    expect(progressed).toEqual(new Set(['1:a', '1:b']))
  })

  test('compound escape aggregation ignores a holding actor whose own intent is terrain-blocked', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('m', pos(0, 0)), body('a', pos(0, 0.5)), body('z', pos(0.5, 0))],
      intents: [intent('m', pos(0, 0), pos(-0.25, 0)), intent('a', pos(0, 0.5), pos(0, 1.5))],
      terrainBlocked: (point) => point.col === 0 && point.row > 0.5,
    })
    expect(outcomeKinds(plan)).toEqual({ '1:a': 'blocked', '1:m': 'moved' })
  })

  test('actor blockage permits a lateral step; primary terrain blockage does not', () => {
    const actorBlocked = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0)), body('wall', pos(1), { yieldable: false })],
      intents: [intent('a', pos(0), pos(1), { allowSidestep: true })],
      terrainBlocked: open,
    })
    expect(actorBlocked.outcomes[0]?.kind).toBe('sidestepped')

    const terrainBlocked = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0))],
      intents: [intent('a', pos(0), pos(1), { allowSidestep: true })],
      terrainBlocked: (point) => point.col > 0,
    })
    expect(terrainBlocked.outcomes[0]).toMatchObject({
      kind: 'blocked',
      reason: { kind: 'terrain' },
    })
  })

  test('floating pursuit bypasses both terrain and solid event-object bodies like original PAL', () => {
    const actor = body('a', pos(0))
    const terrainOnly = planEntityMotion({
      tick: 0,
      actors: [actor],
      intents: [intent('a', pos(0), pos(1), { floating: true })],
      terrainBlocked: () => true,
    })
    expect(terrainOnly.outcomes[0]?.kind).toBe('moved')

    const terrainAndSolid = planEntityMotion({
      tick: 0,
      actors: [actor, body('b', pos(1))],
      intents: [intent('a', pos(0), pos(1), { floating: true })],
      terrainBlocked: () => true,
    })
    expect(terrainAndSolid.outcomes[0]).toMatchObject({ kind: 'moved', to: pos(1) })
  })

  test('a non-body mover checks terrain but ignores actors and reservations', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('ghost', pos(0), { hasBody: false }), body('solid', pos(1))],
      intents: [intent('ghost', pos(0), pos(1))],
      terrainBlocked: open,
    })
    expect(plan.outcomes[0]?.kind).toBe('moved')
  })

  test.each([
    'script',
    'auto',
  ] as const)('authored %s movement bypasses terrain and bodies but remains explicit in the plan', (source) => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('scripted', pos(0)), body('solid', pos(1))],
      intents: [
        intent('scripted', pos(0), pos(1), {
          source,
          collision: 'scriptedBypass',
        }),
      ],
      terrainBlocked: () => true,
    })
    expect(plan.outcomes[0]).toMatchObject({ kind: 'moved', to: pos(1) })
  })

  test.each([
    ['authored', { source: 'script', collision: 'scriptedBypass', floating: false } as const],
    ['floating', { source: 'hostile', collision: 'dynamic', floating: true } as const],
  ])('%s bypass endpoint becomes a same-batch solid blocker for ground pursuit', (_, bypass) => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('bypass', pos(0)), body('ground', pos(2))],
      intents: [
        intent('bypass', pos(0), pos(1), bypass),
        intent('ground', pos(2), pos(1), { source: 'hostile' }),
      ],
      terrainBlocked: open,
    })
    expect(plan.outcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'moved', actor: entity('bypass'), to: pos(1) }),
        expect.objectContaining({
          kind: 'blocked',
          actor: entity('ground'),
          reason: expect.objectContaining({ kind: 'actor', actor: entity('bypass') }),
        }),
      ]),
    )
  })
})

describe('entity motion player/NPC yielding', () => {
  test('active party escape aggregates old overlap improvement across all external bodies', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [
        party(pos(0, 0), 'left'),
        body('held', pos(0, 0.5), { yieldable: false }),
        body('improved', pos(0.5, 0), { yieldable: false }),
      ],
      intents: [partyIntent(pos(0, 0), pos(-0.25, 0), { desiredFacing: 'left' })],
      terrainBlocked: open,
    })
    expect(outcomeKinds(plan)).toEqual({ '0:party': 'moved' })
  })

  test('static or hostile hard blockers do not get pushed and do not make the player slide', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [party(pos(0), 'right'), body('hard', pos(1), { yieldable: false })],
      intents: [partyIntent(pos(0), pos(1))],
      terrainBlocked: open,
    })
    expect(plan.outcomes).toEqual([
      expect.objectContaining({ kind: 'blocked', actor: { kind: 'party' } }),
    ])
  })

  test('an active ordinary NPC sidesteps first while the player waits', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [party(pos(0), 'right'), body('npc', pos(1), { yieldable: true })],
      intents: [
        partyIntent(pos(0), pos(1)),
        intent('npc', pos(1), pos(2), { allowSidestep: true }),
      ],
      terrainBlocked: open,
    })
    expect(outcomeKinds(plan)).toEqual({ '0:party': 'blocked', '1:npc': 'sidestepped' })
  })

  test('when the NPC cannot yield, player sidestep keeps visual input facing', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [party(pos(0), 'right'), body('npc', pos(1), { yieldable: true })],
      intents: [
        partyIntent(pos(0), pos(1)),
        intent('npc', pos(1), pos(2), { allowSidestep: true }),
      ],
      terrainBlocked: (point) => point.col === 1 && point.row !== 0,
    })
    const player = plan.outcomes.find((outcome) => outcome.actor.kind === 'party')
    expect(player).toMatchObject({ kind: 'sidestepped', facing: 'right' })
    if (player?.kind !== 'sidestepped') throw new Error('expected player sidestep')
    expect(player.actualDirection).not.toBe(player.facing)
  })

  test('blocked autonomous mover can atomically request one passive party yield', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [
        party(pos(1), 'left'),
        body('mover', pos(0), { yieldable: true }),
        body('upper', pos(0, -1), { yieldable: false }),
        body('lower', pos(0, 1), { yieldable: false }),
      ],
      intents: [intent('mover', pos(0), pos(1), { allowSidestep: true })],
      partyCanYield: true,
      terrainBlocked: open,
    })
    expect(outcomeKinds(plan)).toEqual({ '0:party': 'passive-yield', '1:mover': 'moved' })
    const player = plan.outcomes.find((outcome) => outcome.actor.kind === 'party')
    expect(player).toMatchObject({ kind: 'passive-yield', facing: 'left' })
    expect(plan.logicalSubphases.map((phase) => phase.map(motionActorKey))).toEqual([
      ['0:party'],
      ['1:mover'],
    ])
  })

  test('passive party yield replans every mover and cannot share its endpoint with a third actor', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [
        party(pos(0, 0), 'left'),
        body('requester', pos(-1, 0)),
        body('upper', pos(-1, -1), { yieldable: false }),
        body('lower', pos(-1, 1), { yieldable: false }),
        body('third', pos(0, 2)),
      ],
      intents: [
        intent('requester', pos(-1, 0), pos(0, 0), { allowSidestep: true }),
        intent('third', pos(0, 2), pos(0, 1)),
      ],
      partyCanYield: true,
      terrainBlocked: open,
    })
    expect(outcomeKinds(plan)).toEqual({
      '0:party': 'passive-yield',
      '1:requester': 'moved',
      '1:third': 'blocked',
    })
    const endpoints = plan.outcomes
      .filter((outcome) => outcome.kind !== 'blocked')
      .map((outcome) => `${outcome.to.col},${outcome.to.row}`)
    expect(new Set(endpoints).size).toBe(endpoints.length)
    expect(plan.logicalSubphases[0]?.map(motionActorKey)).toEqual(['0:party'])
  })

  test('party authority denial prevents passive yield and all player outcomes', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [party(pos(1), 'left'), body('mover', pos(0), { yieldable: true })],
      intents: [intent('mover', pos(0), pos(1), { allowSidestep: false })],
      partyCanYield: false,
      terrainBlocked: open,
    })
    expect(plan.outcomes).toEqual([
      expect.objectContaining({ kind: 'blocked', actor: { kind: 'entity', id: 'mover' } }),
    ])
  })
})

describe('entity motion side-stick', () => {
  test('holds one side for four eligible attempts instead of oscillating', () => {
    const actor = body('a', pos(0))
    const blocker = body('wall', pos(1), { yieldable: false })
    const move = intent('a', pos(0), pos(1), { allowSidestep: true, epoch: 7 })
    const first = planEntityMotion({
      tick: 0,
      actors: [actor, blocker],
      intents: [move],
      terrainBlocked: open,
    })
    expect(first.outcomes[0]?.kind).toBe('sidestepped')
    const stick = first.nextSideSticks[0]!
    expect(stick.remainingEligibleTicks).toBe(3)

    let sticks: readonly SideStick[] = [stick]
    for (let attempt = 0; attempt < 2; attempt++) {
      const heldSideRow = stick.side === 'negative' ? -1 : 1
      const heldBlocked = planEntityMotion({
        tick: attempt + 1,
        actors: [actor, blocker],
        intents: [move],
        sideSticks: sticks,
        terrainBlocked: (point) => point.row === heldSideRow,
      })
      expect(heldBlocked.outcomes[0]?.kind).toBe('blocked')
      sticks = heldBlocked.nextSideSticks
    }
    expect(sticks[0]?.remainingEligibleTicks).toBe(1)
  })

  test('the fifth eligible attempt may abandon a blocked held side', () => {
    const actor = body('a', pos(0))
    const blocker = body('wall', pos(1), { yieldable: false })
    const move = intent('a', pos(0), pos(1), { allowSidestep: true, epoch: 9 })
    const first = planEntityMotion({
      tick: 0,
      actors: [actor, blocker],
      intents: [move],
      terrainBlocked: open,
    })
    const initial = first.nextSideSticks[0]!
    const heldRow = initial.side === 'negative' ? -1 : 1
    let sticks: readonly SideStick[] = [initial]
    for (let attempt = 2; attempt <= 4; attempt++) {
      const held = planEntityMotion({
        tick: attempt,
        actors: [actor, blocker],
        intents: [move],
        sideSticks: sticks,
        terrainBlocked: (point) => point.row === heldRow,
      })
      sticks = held.nextSideSticks
    }
    expect(sticks).toEqual([])
    const fifth = planEntityMotion({
      tick: 5,
      actors: [actor, blocker],
      intents: [move],
      sideSticks: sticks,
      terrainBlocked: (point) => point.row === heldRow,
    })
    expect(fifth.outcomes[0]?.kind).toBe('sidestepped')
    expect(fifth.nextSideSticks[0]?.side).not.toBe(initial.side)
  })

  test('primary terrain hard-stop does not consume a held-side eligible tick', () => {
    const held: SideStick = {
      actor: entity('a'),
      epoch: 3,
      side: 'negative',
      remainingEligibleTicks: 2,
    }
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0))],
      intents: [intent('a', pos(0), pos(1), { allowSidestep: true, epoch: 3 })],
      sideSticks: [held],
      terrainBlocked: (point) => point.col > 0,
    })
    expect(plan.nextSideSticks).toEqual([held])
  })

  test('a new command epoch clears the held side immediately', () => {
    const oldStick: SideStick = {
      actor: entity('a'),
      epoch: 1,
      side: 'negative',
      remainingEligibleTicks: 3,
    }
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0)), body('wall', pos(1), { yieldable: false })],
      intents: [intent('a', pos(0), pos(1), { allowSidestep: true, epoch: 2 })],
      sideSticks: [oldStick],
      terrainBlocked: (point) => point.row < 0,
    })
    expect(plan.outcomes[0]?.kind).toBe('sidestepped')
    expect(plan.nextSideSticks[0]?.epoch).toBe(2)
    expect(plan.nextSideSticks[0]?.side).toBe('positive')
  })

  test('primary progress clears side-stick', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('a', pos(0))],
      intents: [intent('a', pos(0), pos(1), { allowSidestep: true, epoch: 3 })],
      sideSticks: [{ actor: entity('a'), epoch: 3, side: 'negative', remainingEligibleTicks: 3 }],
      terrainBlocked: open,
    })
    expect(plan.outcomes[0]?.kind).toBe('moved')
    expect(plan.nextSideSticks).toEqual([])
  })
})

describe('entity motion input contracts', () => {
  test('rejects duplicate actors, duplicate intents, and stale origins', () => {
    expect(() =>
      planEntityMotion({
        tick: 0,
        actors: [body('a', pos(0)), body('a', pos(0))],
        intents: [],
        terrainBlocked: open,
      }),
    ).toThrow(/duplicate snapshot actor/)
    expect(() =>
      planEntityMotion({
        tick: 0,
        actors: [body('a', pos(0))],
        intents: [intent('a', pos(0), pos(1)), intent('a', pos(0), pos(-1))],
        terrainBlocked: open,
      }),
    ).toThrow(/duplicate intent/)
    expect(() =>
      planEntityMotion({
        tick: 0,
        actors: [body('a', pos(0))],
        intents: [intent('a', pos(0.25), pos(1))],
        terrainBlocked: open,
      }),
    ).toThrow(/stale intent origin/)
  })

  test('rejects duplicate or malformed side-sticks instead of last-write winning', () => {
    const stick: SideStick = {
      actor: entity('a'),
      epoch: 1,
      side: 'negative',
      remainingEligibleTicks: 2,
    }
    expect(() =>
      planEntityMotion({
        tick: 0,
        actors: [body('a', pos(0))],
        intents: [intent('a', pos(0), pos(1))],
        sideSticks: [stick, { ...stick, side: 'positive' }],
        terrainBlocked: open,
      }),
    ).toThrow(/duplicate side-stick/)
    expect(() =>
      planEntityMotion({
        tick: 0,
        actors: [body('a', pos(0))],
        intents: [intent('a', pos(0), pos(1))],
        sideSticks: [{ ...stick, remainingEligibleTicks: 4 }],
        terrainBlocked: open,
      }),
    ).toThrow(/invalid side-stick duration/)
  })

  test('non-ASCII ids use locale-independent UTF-16 priority', () => {
    const plan = planEntityMotion({
      tick: 0,
      actors: [body('ä', pos(0)), body('z', pos(2))],
      intents: [intent('ä', pos(0), pos(1)), intent('z', pos(2), pos(1))],
      terrainBlocked: open,
    })
    expect(outcomeKinds(plan)).toEqual({ '1:z': 'moved', '1:ä': 'blocked' })
  })
})
