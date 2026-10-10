import assert from 'node:assert/strict'
import { fixedRoutePlan } from './fixed-route-plan.mjs'

// The two independent 003 recordings (2026-10-07T14-28-05) agree on every
// player commit and settled endpoint. Freeze that route, not an adaptive search.
const legs = [
  {
    phase: 'stairs',
    scene: 's003',
    start: [126, 46],
    holds: [
      ['ArrowLeft', 5],
      ['ArrowDown', 3],
      ['ArrowRight', 1],
    ],
    completion: { scene: 's003', position: [131, 52], mode: 'ready' },
  },
  {
    phase: 'aunt',
    scene: 's003',
    start: [131, 52],
    holds: [
      ['ArrowDown', 12],
      ['ArrowRight', 4],
    ],
    completion: { scene: 's003', position: [135, 64], mode: 'dialogue' },
  },
  {
    phase: 'taoist',
    scene: 's003',
    start: [135, 64],
    holds: [
      ['ArrowDown', 8],
      ['ArrowRight', 2],
    ],
    completion: { scene: 's003', position: [137, 72], mode: 'ready' },
  },
  {
    phase: 'kitchen-entry',
    scene: 's003',
    start: [137, 72],
    holds: [
      ['ArrowLeft', 3],
      ['ArrowUp', 5],
      ['ArrowLeft', 9],
      ['ArrowUp', 5],
      ['ArrowLeft', 1],
    ],
    completion: { scene: 's001', position: [100, 59], mode: 'ready' },
  },
  {
    phase: 'kitchen',
    scene: 's001',
    start: [100, 59],
    holds: [
      ['ArrowLeft', 10],
      ['ArrowUp', 3],
      ['ArrowLeft', 1],
      ['ArrowUp', 10],
    ],
    completion: { scene: 's001', position: [89, 46], mode: 'ready' },
  },
]

export function kitchenInputPlan(engine, id, phase) {
  const leg = legs[id]
  assert(leg && leg.phase === phase, `unexpected 003 input-plan leg ${id}/${phase}`)
  return fixedRoutePlan(engine, { id, ...leg })
}
