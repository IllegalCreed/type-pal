import assert from 'node:assert/strict'
import test from 'node:test'
import { continuousJourneyBudget, manualInteractionTarget } from './continuous-action-policy.mjs'

test('all current recorders distinguish manual interaction from dialogue confirmation', () => {
  // Actual reason grammar of kitchen/errand/boat callers, including the 005 timeout action.
  for (const reason of ['normal interaction e19', 'interact e19', 'interact s002/e36'])
    assert.deepEqual(manualInteractionTarget({ key: 'Enter', reason }), {
      entity: reason.endsWith('e19') ? 'e19' : 'e36',
      ...(reason.includes('s002/') ? { scene: 's002' } : {}),
    })
  for (const reason of [
    'normal full-dialogue confirmation',
    'open slot menu',
    'complete rendered dialogue confirmation',
  ])
    assert.equal(manualInteractionTarget({ key: 'Enter', reason }), null)
})

test('continuous deadline covers the bounded six-fragment workload, not a single-fragment window', () => {
  assert.equal(continuousJourneyBudget(1), 240_000)
  assert.equal(continuousJourneyBudget(6), 6 * 240_000)
})
