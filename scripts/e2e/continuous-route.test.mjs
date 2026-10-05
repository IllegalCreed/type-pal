import assert from 'node:assert/strict'
import test from 'node:test'
import { continuousRouteReached, receiptRouteTargets } from './continuous-route.mjs'

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

test('input release is separated from the scripted staircase settlement, without phase coordinates', () => {
  const receipt = {
    route: {
      inputs: [
        { kind: 'down', key: 'ArrowRight', scene: 's003', phase: 'stairs', atMs: 10 },
        {
          kind: 'up',
          key: 'ArrowRight',
          scene: 's003',
          phase: 'stairs',
          atMs: 20,
          reason: 'route effect',
        },
        { kind: 'down', key: 'ArrowDown', scene: 's003', phase: 'aunt', atMs: 40 },
        { kind: 'up', key: 'ArrowDown', scene: 's003', phase: 'aunt', atMs: 50, reason: 'turn' },
      ],
      steps: [
        { scene: 's003', atMs: 19, from: [121, 49, 0], to: [122.9375, 49.3125, 0] },
        { scene: 's003', atMs: 41, from: [131, 52, 0], to: [131, 53, 0] },
      ],
    },
  }
  const target = receiptRouteTargets(receipt).get('down:ArrowRight:10')
  assert.deepEqual(target, {
    startScene: 's003',
    scene: 's003',
    position: [122.9375, 49.3125, 0],
    committedSteps: 1,
    inputKey: 'ArrowRight',
    effect: true,
    settled: { scene: 's003', position: [131, 52, 0] },
  })
  assert.equal(receiptRouteTargets(receipt).get('down:ArrowDown:40').effect, false)
  assert.throws(
    () => receiptRouteTargets({ route: { inputs: [receipt.route.inputs[0]] } }),
    /missing key release/,
  )
})
