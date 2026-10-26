import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyOpeningWaitReceipt } from './opening-hold-intent.mjs'

// Evidence-reader IO fixture: the deadline/replacement ordering observed in 006.
// It does not claim a synthetic timeline is a runtime or product counterproof.
function receipt() {
  const self = { scene: 'scene', entity: 'actor' }
  const occurrence = {
    id: 3,
    self,
    timing: 'auto',
    command: { kind: 'leaf', command: { kind: 'wait', ms: 100 } },
  }
  const frame = { frameId: 1, now: 100 }
  const event = (order, phase, fields = {}) => ({
    engine: 'reforge',
    scene: 'scene',
    sceneVisit: 1,
    clock: frame,
    order,
    phase,
    ...fields,
  })
  const author = (behavior) => ({
    kind: 'entity-behavior',
    scene: 'scene',
    entity: 'actor',
    channel: 'auto',
    behavior,
    sceneSession: 'scene:1',
  })
  const start = event(1, 'wait-start', {
    runId: 1,
    activityId: 7,
    waitId: 4,
    occurrence,
    clock: { frameId: 0, now: 0 },
    now: 0,
    ms: 100,
    deadline: 100,
  })
  const gate = { runId: 1, activityId: 7, signalActivityId: 7, occurrence, gateId: 5 }
  const replacing = {
    id: 20,
    timing: 'interactive',
    self,
    command: {
      kind: 'leaf',
      command: {
        kind: 'selectEntityBehavior',
        target: self,
        channel: 'auto',
        selection: { kind: 'use', value: 'after' },
      },
    },
  }
  const events = [
    event(0.5, 'run-started', {
      runId: 1,
      activityId: 7,
      self,
      timing: 'auto',
      author: author('before'),
    }),
    start,
    event(2, 'clock', { now: 100, frozen: false }),
    event(3, 'wait-end', { runId: 1, waitId: 4, now: 100, reason: 'deadline' }),
    event(5, 'gate-wait', gate),
    event(6, 'command', { runId: 2, occurrence: replacing }),
    event(7, 'auto-aborted', {
      entity: 'actor',
      activationId: 7,
      sceneSession: 'scene:1',
      aborted: true,
      error: null,
    }),
    event(8, 'gate-rejected', { ...gate, aborted: true }),
    event(9, 'run-ended', { runId: 1, occurrence, aborted: true }),
    event(10, 'leaf-completed', {
      runId: 2,
      occurrence: replacing,
      source: 'script-runner-core',
    }),
    event(12, 'run-started', {
      runId: 3,
      activityId: 8,
      self,
      timing: 'auto',
      author: author('after'),
    }),
  ]
  const draws = [
    event(1.5, 'world-render', { clock: { frameId: 0, now: 0 } }),
    event(15, 'world-render'),
  ]
  return { start, events, draws }
}

test('a settled automatic wait may end by a proved same-scene binding replacement', () => {
  const { start, events, draws } = receipt()
  const result = verifyOpeningWaitReceipt(start, events, draws)
  assert.equal(result.resumed.phase, 'run-ended')
  assert.equal(result.replacement.successor, 12)
})

test('replacement receipts reject uncompleted, mismatched and illegally resumed activations', () => {
  for (const corrupt of [
    (events) =>
      events.splice(
        events.findIndex((event) => event.phase === 'leaf-completed'),
        1,
      ),
    (events) => {
      events.find((event) => event.phase === 'auto-aborted').activationId++
    },
    (events) => {
      events.find((event) => event.phase === 'gate-rejected').gateId++
    },
    (events) => {
      events.find((event) => event.phase === 'command').occurrence.command.command.target = {
        scene: 'scene',
        entity: 'other',
      }
    },
    (events) => {
      events.findLast((event) => event.phase === 'run-started').author.behavior = 'before'
    },
    (events) =>
      events.push({ ...events.find((event) => event.phase === 'command'), runId: 1, order: 14 }),
  ]) {
    const { start, events, draws } = structuredClone(receipt())
    corrupt(events)
    assert.throws(() => verifyOpeningWaitReceipt(start, events, draws))
  }
})
