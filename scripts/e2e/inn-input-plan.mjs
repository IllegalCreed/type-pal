import assert from 'node:assert/strict'
import { fixedRoutePlan } from './fixed-route-plan.mjs'

/** Fixed 002 scenario input: one Down hold to the door, one Left hold to Auntie's touch trigger.
 * Coordinates are exact expectations, never navigation goals or a replanning allowance.
 */
export function innInputPlan(engine, id) {
  assert(['game', 'reforge'].includes(engine))
  assert([0, 1].includes(id))
  return fixedRoutePlan(engine, {
    id,
    scene: id === 0 ? 's001' : 's003',
    start: id === 0 ? [60, -24] : [143, 45],
    holds: [[id === 0 ? 'ArrowDown' : 'ArrowLeft', id === 0 ? 11 : 17]],
    completion: {
      scene: 's003',
      position: id === 0 ? [143, 45] : [126, 45],
      mode: id === 0 ? 'ready' : 'dialogue',
    },
  })
}
