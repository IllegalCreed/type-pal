import assert from 'node:assert/strict'
import test from 'node:test'
import { continuousRouteReached } from './continuous-route.mjs'

test('a route cannot finish one cell early or confuse first-stage height with tile coordinates', () => {
  const target = { scene: 's003', position: [1200, 1336, 0] }
  assert.equal(continuousRouteReached({ scene: 4, position: [1200, 1336] }, target, 'game'), true)
  assert.equal(continuousRouteReached({ scene: 4, position: [1216, 1344] }, target, 'game'), false)
  assert.equal(continuousRouteReached({ scene: 2, position: [1200, 1336] }, target, 'game'), false)
  const tile = { scene: 's003', position: [121, 46, 0] }
  assert.equal(
    continuousRouteReached({ scene: 's003', position: [121, 46, 0] }, tile, 'reforge'),
    true,
  )
  assert.equal(
    continuousRouteReached({ scene: 's003', position: [122, 46, 0] }, tile, 'reforge'),
    false,
  )
})
