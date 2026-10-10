import assert from 'node:assert/strict'
import test from 'node:test'
import { createEvidenceRecorder } from './evidence-recorder.mjs'

test('recording kernel owns identity, clones caller data, and budgets span growth atomically', () => {
  let overflow = false
  const errors = [],
    events = [],
    pages = []
  const recorder = createEvidenceRecorder({
    context: () => ({ atMs: 1, sceneVisit: 1 }),
    errors,
    onOverflow: () => {
      overflow = true
    },
    budgets: { events: 360 },
  })
  const value = { kind: 'actor-render', state: { position: [1, 2] }, seq: 44, order: 99 }
  const event = recorder.append(events, value, 2)
  value.state.position[0] = 200
  assert.deepEqual(event.state.position, [1, 2])
  assert.equal(event.order, 0)
  assert.equal(event.seq, 0)
  const page = recorder.append(pages, { kind: 'page', instance: 1 }, 2)
  assert.equal(page.order, 1)
  assert.equal(page.seq, 0)
  const before = recorder.byteSizes().events
  assert(recorder.extend(event, { throughRenderId: 1, throughOrder: 1, throughAtMs: 2 }))
  assert(recorder.byteSizes().events > before)
  assert.throws(() => recorder.extend(event, { order: 200 }), /invalid render span/)
  const retained = structuredClone(event)
  assert.equal(recorder.extend(event, { throughAtMs: 'x'.repeat(400) }), false)
  assert.equal(overflow, true)
  assert.deepEqual(event, retained, 'over-budget extension must not partially change evidence')
  assert.equal(recorder.append(pages, { kind: 'page' }, 2), undefined)
  assert.equal(recorder.nextOrder, 2, 'rejected evidence cannot consume an order')
})

test('count overflow seals all streams; large causes and atomic snapshots have independent budgets', () => {
  const errors = [],
    events = [],
    causes = [],
    snapshots = []
  let overflow = false
  const recorder = createEvidenceRecorder({
    context: () => ({ atMs: 1 }),
    errors,
    onOverflow: () => {
      overflow = true
    },
    budgets: { events: 100, causes: 600, atomicSnapshots: 600 },
  })
  assert(recorder.append(events, { kind: 'actor' }, 1))
  assert(recorder.append(causes, { kind: 'cause', data: 'x'.repeat(200) }, 1))
  assert(recorder.append(snapshots, { payload: { value: 'x'.repeat(200) } }, 1))
  assert.equal(overflow, false)
  assert.equal(recorder.append(events, { kind: 'actor' }, 1), undefined)
  assert.equal(overflow, true)
  assert.equal(recorder.append(causes, { kind: 'cause' }, 2), undefined)
  assert.equal(recorder.nextOrder, 3)
  recorder.fail(new Error('source failure'))
  assert.match(errors[0], /source failure/)
})
