import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalPosition,
  compareNpcStateTraces,
  movementCadence,
  tracePartyContactEvents,
} from './npc-transition-contract.mjs'

const actor = (order, id, position, before, extra = {}) => ({
  kind: 'actor',
  order,
  atMs: order * 100,
  scene: 's003',
  source: 'observed:commit',
  id,
  before,
  state: { position, visible: true, state: 2, facing: 'down', ...extra },
})

test('canonical positions compare pixel and tile coordinates in one space', () => {
  assert.deepEqual(canonicalPosition([1264, 1096]), canonicalPosition([108, 29, 0]))
})

test('contact inference uses observed adjacency and dwell, not a command name', () => {
  const trace = {
    events: [
      actor(1, 'party', [126, 45, 0], null),
      actor(2, 'e60', [126.25, 45, 0], null),
      actor(30, 'party', [126, 46, 0], { position: [126, 45, 0] }),
    ],
  }
  assert.equal(tracePartyContactEvents(trace).length, 1)
  assert.equal(tracePartyContactEvents(trace)[0].npc, 'e60')
})

test('cadence exposes a compressed same-batch movement', () => {
  const trace = {
    events: [
      actor(1, 'e26', [100, 20, 0], null),
      actor(2, 'e26', [100.5, 20, 0], { position: [100, 20, 0] }),
      actor(3, 'e26', [101, 20, 0], { position: [100.5, 20, 0] }),
      actor(4, 'e26', [101.5, 20, 0], { position: [101, 20, 0] }),
    ],
  }
  trace.events.forEach((event, index) => {
    event.atMs = index
  })
  const cadence = movementCadence(trace, 'e26')
  assert.equal(cadence.count, 3)
  assert.equal(cadence.burstFraction, 1)
})

test('state-first comparison catches facing change and preserves all findings', () => {
  const otherActors = ['e62', 'e83', 'e84', 'e124', 'e127'].map((id) =>
    actor(1, id, [2, 2, 0], null, { frame: 0, sprite: 'npc' }),
  )
  const game = {
      events: [
        ...otherActors,
        actor(1, 'e123', [1, 1, 0], null, { facing: 'left', frame: 0, sprite: 'npc' }),
        actor(
          2,
          'e123',
          [1, 1, 0],
          { position: [1, 1, 0], facing: 'left' },
          { facing: 'right', frame: 1, sprite: 'npc' },
        ),
        { kind: 'control', order: 3, state: false },
      ],
      pages: [{ page: { lines: ['张四'] } }],
    },
    reforge = {
      events: [
        ...otherActors.map((event) => structuredClone(event)),
        actor(1, 'e123', [1, 1, 0], null, { facing: 'left', frame: 0, sprite: 'npc' }),
        { kind: 'control', order: 2, state: true },
      ],
      pages: [{ page: { lines: ['张四'] } }],
    }
  const comparison = compareNpcStateTraces(game, reforge, '005')
  assert.deepEqual(
    comparison.violations.map((finding) => finding.field ?? finding.type),
    ['facing', 'frame', 'control'],
  )
  assert.equal(comparison.violations[0].field, 'facing')
  assert.equal(
    comparison.findings.some((finding) => finding.type === 'actor-field'),
    true,
  )
  assert.equal(
    comparison.findings.some((finding) => finding.type === 'control'),
    true,
  )
})

test('an unlisted NPC and missing frame telemetry cannot silently pass', () => {
  const baseline = {
    events: [
      actor(1, 'e777', [10, 10, 0], null, { frame: 0, sprite: 'npc' }),
      { kind: 'control', order: 2, state: true },
    ],
    pages: [],
  }
  const candidate = structuredClone(baseline)
  candidate.events[0].state.facing = 'left'
  delete candidate.events[0].state.frame
  const comparison = compareNpcStateTraces(baseline, candidate, 'new-fragment')
  assert.deepEqual(comparison.actors, ['e777'])
  assert.deepEqual(
    comparison.findings.map(({ type, field }) => [type, field]),
    [
      ['actor-field', 'facing'],
      ['evidence-gap', 'frame'],
    ],
  )
  assert.deepEqual(comparison.violations, comparison.findings)
})
