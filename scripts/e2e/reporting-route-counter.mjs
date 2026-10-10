import assert from 'node:assert/strict'
import { verifyGameAutoBatches, verifyGameAutoCycles } from './game-auto-contract.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import {
  movementTransitions,
  readNpcTrace,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { verifyReportingRoute } from './reporting-route-contract.mjs'
import { verifyRuntimeHandoffs } from './runtime-handoff-contract.mjs'
import { verifyStoryMotion } from './story-motion-contract.mjs'
import { storyProofPrefix } from './story-presentation-intent.mjs'

const paths = process.argv.slice(2)
assert.equal(paths.length, 2, 'usage: reporting-route-counter.mjs GAME_005 REFORGE_005')
const [game, reforge] = await Promise.all(paths.map(readNpcTrace))
assert.equal(game.report.fragment, '005')
assert.equal(reforge.report.fragment, '005')
const g = storyProofPrefix(game.trace, game.rawTrace)
const r = storyProofPrefix(reforge.trace, reforge.rawTrace)
const actors = [{ entity: 'e83', scene: 's004' }]
const prove = (left, right) =>
  verifyReportingRoute(
    left,
    right,
    {
      motion: verifyStoryMotion(
        right,
        verifyMotionSlotLifetimes(right.causes),
        actors,
        movementTransitions,
        verifyRuntimeHandoffs(right),
      ),
      gameCycles: verifyGameAutoCycles(left, actors, verifyGameAutoBatches(left)),
      // Counts claim coverage only. Full comparison additionally runs both pose/draw oracles.
      gamePresentation: [{ id: 'e83', draws: renderedPoseEvidence(left, 'e83', 's004').length }],
      presentation: {
        actors: [{ id: 'e83', draws: renderedPoseEvidence(right, 'e83', 's004').length }],
      },
    },
    { moves: movementTransitions, renders: renderedPoseEvidence },
  )
const baseline = prove(g, r)
assert.equal(baseline.status, 'proved')
const relative = r.causes.find(
  (event) =>
    event.phase === 'command' &&
    event.occurrence?.command?.command?.kind === 'setEntityPosRelParty' &&
    event.occurrence.self.entity === 'e83',
)
const wrongRelative = {
  ...r,
  causes: r.causes.map((event) => {
    if (event.order !== relative.order) return event
    const result = structuredClone(event)
    result.occurrence.command.command.dcol += 0.25
    return result
  }),
}
assert.deepEqual(wrongRelative.events, r.events)
assert.throws(() => prove(g, wrongRelative), /report occurrence differs from canonical author/)
const installed = g.causes.find(
  (event) =>
    event.phase === 'auto-selection-committed' && event.entity === 83 && event.label === 'L_886',
)
assert(installed)
assert.throws(
  () => prove({ ...g, causes: g.causes.filter((event) => event !== installed) }, r),
  /actual source selection\/cursor/,
)
const reset = g.events.find((event) => event.order === baseline.resets.game)
const wrongReset = {
  ...g,
  events: g.events.map((event) =>
    event === reset
      ? {
          ...event,
          state: {
            ...event.state,
            position: [event.state.position[0] + 4, event.state.position[1]],
          },
        }
      : event,
  ),
}
assert.throws(() => prove(wrongReset, r), /source reset borrowed its target/)
const page = r.pages.find(
  (event) => event.scene === 's004' && event.page && event.order > baseline.resets.reforge,
)
const borrowed = {
  ...r,
  pages: r.pages.map((event) =>
    event === page
      ? {
          ...event,
          actors: { ...event.actors, e83: { ...event.actors.e83, position: [139.5, 34.25, 0] } },
        }
      : event,
  ),
}
assert.throws(() => prove(g, borrowed), /report page borrowed its standing actor/)
assert.throws(
  () => prove(g, { ...r, pages: r.pages.filter((event) => event !== page) }),
  /complete approved dialogue/,
)
console.log(
  JSON.stringify({
    kind: 'reporting-route-counter',
    scope: 'diagnostic raw only; no acceptance',
    reports: [game, reforge].map((value) => ({
      report: value.reportSha256,
      raw: value.traceSha256,
    })),
    baseline,
    counters: [
      'legal wrong relative offset retaining every actor/draw',
      'missing actual primary selector',
      'wrong actual reset target',
      'borrowed quarter-tile page position',
      'missing real dialogue page',
    ],
    result: 'rejected',
  }),
)
