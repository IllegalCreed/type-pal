import assert from 'node:assert/strict'
import test from 'node:test'
import { movementDrawOpportunity } from './movement-draw-opportunity.mjs'

test('only a complete successful scene replacement discharges an unavailable movement draw', () => {
  const move = { scene: 's001', sceneVisit: 6, order: 2597 }
  const trace = {
    errors: [],
    overflow: false,
    worldRenders: [
      { order: 2588, renderId: 318, scene: 's001', sceneVisit: 6 },
      { order: 2703, renderId: 319, previousRenderId: 318, scene: 's003', sceneVisit: 8 },
    ],
    events: [
      { kind: 'scene-lifecycle', phase: 'materialized', order: 2697, scene: 's003', sceneVisit: 8 },
      { kind: 'scene-lifecycle', phase: 'ready', order: 2699, scene: 's003', sceneVisit: 8 },
    ],
  }
  assert.equal(movementDrawOpportunity(trace, move).kind, 'scene-exit-before-draw')
  for (const corrupt of [
    (value) => {
      value.worldRenders[1].scene = 's001'
      value.worldRenders[1].sceneVisit = 6
    },
    (value) => {
      value.worldRenders[1].previousRenderId = 317
    },
    (value) => {
      value.worldRenders[1].renderId++
    },
    (value) => {
      value.events.pop()
    },
    (value) => {
      value.events[1].sceneVisit++
    },
    (value) => {
      value.events[1].order = 2690
    },
    (value) => {
      value.overflow = true
    },
  ]) {
    const changed = structuredClone(trace)
    corrupt(changed)
    assert.equal(movementDrawOpportunity(changed, move), null)
  }
})
