import assert from 'node:assert/strict'
import { verifyGameAutoBatches } from './game-auto-contract.mjs'
import { verifyInterruptedMiaoRoute } from './interrupted-route-contract.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import {
  movementTransitions,
  readNpcTrace,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { verifyStoryMotion } from './story-motion-contract.mjs'

// Opt-in, byte-bound diagnostic counter; no recording is changed or certified here.
const paths = process.argv.slice(2)
assert.equal(paths.length, 2, 'usage: interrupted-route-counter.mjs GAME_006 REFORGE_006')
const [game, reforge] = await Promise.all(paths.map(readNpcTrace))
assert.equal(game.report.fragment, '006')
assert.equal(reforge.report.fragment, '006')
const g = { ...game.rawTrace, renderScope: game.trace.renderScope }
const r = { ...reforge.rawTrace, renderScope: reforge.trace.renderScope }
const prove = (left, right) => {
  const motion = verifyStoryMotion(
    right,
    verifyMotionSlotLifetimes(right.causes),
    [{ entity: 'e59', scene: 's003' }],
    movementTransitions,
  )
  return verifyInterruptedMiaoRoute(
    left,
    right,
    {
      motion,
      gameBatches: verifyGameAutoBatches(left),
      // Draw counts are coverage, never the motion/phase/selector oracle below.
      gamePresentation: [{ id: 'e59', draws: renderedPoseEvidence(left, 'e59', 's003').length }],
      presentation: {
        actors: [{ id: 'e59', draws: renderedPoseEvidence(right, 'e59', 's003').length }],
      },
    },
    { renders: renderedPoseEvidence },
  )
}
const baseline = prove(g, r)
assert(baseline && baseline.sourceLegs.length === 2 && baseline.authoredLegs.length === 2)
const second = r.causes.find(
  (event) =>
    event.phase === 'motion-slot-registered' && event.slotId === baseline.authoredLegs[1].slot,
)
const wrongTarget = {
  ...r,
  causes: r.causes.map((event) => {
    if (event.runId !== second.runId || event.occurrence?.id !== second.occurrence.id) return event
    const result = structuredClone(event)
    result.occurrence.command.command.to.row -= 1
    for (const slot of ['slot', 'current', 'input']) if (result[slot]?.to) result[slot].to.row -= 1
    return result
  }),
}
assert.deepEqual(wrongTarget.events, r.events, 'target counter must retain every actor/draw')
assert.throws(() => prove(g, wrongTarget), /route (differs from canonical|target differs)/)
const page = r.pages.find(
  (event) =>
    event.scene === 's003' &&
    event.sceneVisit === second.sceneVisit &&
    event.page &&
    event.actors?.e59?.visible,
)
assert(page)
const borrowedHold = {
  ...r,
  pages: r.pages.map((event) =>
    event === page
      ? {
          ...event,
          actors: {
            ...event.actors,
            e59: { ...event.actors.e59, position: [baseline.gameHold[0], baseline.gameHold[1], 0] },
          },
        }
      : event,
  ),
}
assert.throws(() => prove(g, borrowedHold), /leader projection is detached/)
const call = g.causes.find(
  (event) =>
    event.phase === 'auto-step' &&
    event.actor === 59 &&
    event.before.ip === 1166 &&
    event.after.frame === 1,
)
assert(call)
const wrongPhase = {
  ...g,
  causes: g.causes.map((event) =>
    event === call ? { ...event, after: { ...event.after, frame: 2 } } : event,
  ),
}
assert.throws(() => prove(wrongPhase, r), /interrupted source route lost current phase/)
const sourcePose = g.events.find((event) => event.order === call.poses.e59.commitOrder)
assert(sourcePose)
const missingActor = { ...g, events: g.events.filter((event) => event !== sourcePose) }
assert.throws(() => prove(missingActor, r), /latest same-visit source actor/)
const movement = movementTransitions(r, 'e59', 's003').find(
  (event) => event.order > second.order && event.sceneVisit === second.sceneVisit,
)
assert(movement)
const wrongStride = {
  ...r,
  events: r.events.map((event) =>
    event.order === movement.order
      ? {
          ...event,
          state: { ...event.state, position: [movement.to[0], movement.to[1] - 0.25, 0] },
        }
      : event,
  ),
}
assert.throws(() => prove(g, wrongStride), /motion differs from exact authored stride/)
console.log(
  JSON.stringify({
    kind: 'interrupted-route-counter',
    scope: 'diagnostic only; no acceptance',
    reports: [game, reforge].map((e) => ({ report: e.reportSha256, raw: e.traceSha256 })),
    baseline,
    counters: [
      'legal wrong target with identical actors/draws',
      'borrowed leader projection',
      'wrong native current phase',
      'missing source actor provenance',
      'wrong authored stride',
    ],
    result: 'rejected',
  }),
)
