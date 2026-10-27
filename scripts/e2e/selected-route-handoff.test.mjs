import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifySelectedRouteHandoff } from './interrupted-route-contract.mjs'

test('a queued motion acknowledgement cannot replace the actual pre-take completion boundary', () => {
  const take = { order: 20, runId: 5 },
    select = { order: 30, runId: 5 },
    release = { order: 50, runId: 5 },
    second = { from: 60 },
    first = { settled: true, lastCommitOrder: 19, to: 40 }
  verifySelectedRouteHandoff(take, select, release, first, second)
  for (const changed of [
    { ...first, lastCommitOrder: 21 }, // Still moving after foreground took ownership.
    { ...first, lastCommitOrder: undefined }, // Acknowledgement without displacement evidence.
    { ...first, to: 51 }, // Old completion survived its foreground release.
  ])
    assert.throws(() => verifySelectedRouteHandoff(take, select, release, changed, second))
  assert.throws(() =>
    verifySelectedRouteHandoff(take, select, { ...release, runId: 6 }, first, second),
  )
  assert.throws(() => verifySelectedRouteHandoff(take, select, release, first, { from: 49 }))
  verifySelectedRouteHandoff(take, select, release, { settled: false, to: 40 }, second)
  assert.throws(() =>
    verifySelectedRouteHandoff(take, select, release, { settled: false, to: 29 }, second),
  )
})
