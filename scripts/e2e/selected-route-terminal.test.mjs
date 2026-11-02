import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifySelectedRouteTerminal } from './interrupted-route-contract.mjs'

// Evidence-reader fixtures only; these do not simulate or certify a runtime.
const completed = () => ({
  terminal: 'motion-slot-settled',
  commits: [
    { from: [137, 72.5], to: [137, 72.25, 0], arrived: false },
    { from: [137, 72.25], to: [137, 72, 0], arrived: true },
  ],
})

test('an exact completed first leg is distinct from a cancelled departing prefix', () => {
  assert.equal(verifySelectedRouteTerminal(completed(), 0, [137, 72]), true)
  const prefix = completed()
  prefix.terminal = 'motion-slot-cancelled'
  prefix.commits[1].arrived = false
  assert.equal(verifySelectedRouteTerminal(prefix, 1, [137, 52]), false)
})

test('completion cannot excuse a wrong leg, endpoint, stride, continuity or arrival', () => {
  assert.throws(() => verifySelectedRouteTerminal(completed(), 1, [137, 72]), /first leg/)
  assert.throws(
    () => verifySelectedRouteTerminal(completed(), 0, [137, 71]),
    /exact primary target/,
  )
  const cases = [
    (r) => {
      r.terminal = 'recording-prefix'
    },
    (r) => {
      r.commits = []
    },
    (r) => {
      r.commits[0].to[1] = 72
    },
    (r) => {
      r.commits[1] = { from: [137, 72.5], to: [137, 72.25], arrived: true }
    },
    (r) => {
      r.commits[0].arrived = true
    },
    (r) => {
      r.commits[1].arrived = false
    },
  ]
  for (const mutate of cases) {
    const route = completed()
    mutate(route)
    assert.throws(() => verifySelectedRouteTerminal(route, 0, [137, 72]))
  }
})
