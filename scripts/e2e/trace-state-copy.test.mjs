import assert from 'node:assert/strict'
import test from 'node:test'
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

test('model-specific copying preserves the full failed-transition pre-state', () => {
  let copies = 0
  const entry = Object.freeze({ occurrence: Object.freeze({ id: 1 }), order: 0, runId: 1 })
  const model = {
    id: 'copy-isolation',
    initial: { count: 0, runs: {}, occurrences: {} },
    copyState: (state) => {
      copies++
      return { ...state, runs: { ...state.runs }, occurrences: { ...state.occurrences } }
    },
    transitions: {
      commit: (state) => {
        state.count++
        state.runs[1] = entry
        state.occurrences[1] = entry
        return state
      },
      fail: (state) => {
        state.count++
        state.runs[1] = { order: 2 }
        state.occurrences[2] = { order: 2 }
        requireTrace(false, 'intentional-failure', 1, 2)
      },
    },
    accept() {},
  }
  const events = [{ type: 'commit' }, { type: 'fail' }]
  const actual = checkTransitionTrace(model, events)
  assert.equal(copies, 2)
  const { copyState: _, ...baseline } = model
  assert.deepEqual(actual, checkTransitionTrace(baseline, events))
  assert.deepEqual(actual.witness.before, {
    count: 1,
    runs: { 1: entry },
    occurrences: { 1: entry },
  })
  assert.deepEqual(model.initial, { count: 0, runs: {}, occurrences: {} })
})
