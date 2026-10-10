import assert from 'node:assert/strict'
import { verifyMountedRowerDraws } from './mounted-rower-contract.mjs'
import { scopeNpcStoryTrace } from './npc-story-scope.mjs'
import {
  compareNpcStateTraces,
  readNpcTrace,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

const paths = process.argv.slice(2)
assert.equal(paths.length, 2, 'usage: mounted-rower-counter.mjs GAME_006 REFORGE_006')
const [game, reforge] = await Promise.all(paths.map(readNpcTrace))
assert.equal(game.report.fragment, '006')
assert.equal(reforge.report.fragment, '006')
const resources = await checkSpriteResources(reforge.trace, 'reforge', process.cwd())
assert.equal(resources.status, 'proved')
const compare = (trace, raw) =>
  compareNpcStateTraces(game.trace, trace, '006', {
    rawGame: game.rawTrace,
    rawReforge: raw,
    frameCounts: resources.frameCounts,
  })
const baseline = compare(reforge.trace, reforge.rawTrace)
assert.equal(baseline.storyTiming.status, 'passed')
assert.deepEqual(baseline.findings, [])
assert(
  baseline.acceptedDifferences.some(
    (proof) => proof.id === 'e117' && proof.type === 'causal-mounted-rower-frame-progress',
  ),
  'actual mounted frame proof was never exercised',
)
console.log(
  JSON.stringify({
    kind: 'mounted-rower-counter',
    positive: 'full actual comparison: zero findings',
    scope: 'diagnostic only; no acceptance',
  }),
)
const replacement = reforge.rawTrace.events.find(
  (event) => event.kind === 'actor-render' && event.id === 'e117' && event.state.frame === 1,
)
assert(replacement)
const draw = reforge.rawTrace.events.find(
  (event) =>
    event.kind === 'actor-render' &&
    event.id === 'e117' &&
    event.state.frame === 0 &&
    event.order > replacement.state.frameResourceId &&
    event.order > replacement.order,
)
assert(draw)
assert.deepEqual(
  draw.state.geometry.worldRect.slice(2),
  replacement.state.geometry.worldRect.slice(2),
  'counter must keep real draw dimensions',
)
const variant = {
  ...reforge.rawTrace,
  events: reforge.rawTrace.events.map((event) =>
    event === draw
      ? {
          ...event,
          state: { ...event.state, frame: 1, frameResourceId: replacement.state.frameResourceId },
        }
      : event,
  ),
}
const scoped = scopeNpcStoryTrace(variant, reforge.report.storyScope)
const legal = await checkSpriteResources(scoped, 'reforge', process.cwd())
assert.equal(legal.status, 'proved')
assert.throws(
  () => verifyMountedRowerDraws(scoped, renderedPoseEvidence),
  /actual draw differs from latest same-visit actor frame/,
)
const rejected = compare(scoped, variant)
assert.equal(rejected.storyTiming.status, 'needs-review')
assert(
  !rejected.acceptedDifferences.some(
    (proof) => proof.type === 'causal-mounted-rower-frame-progress',
  ),
)
assert(
  rejected.findings.some((finding) => finding.id === 'e117' && finding.field === 'movement-frame'),
)
console.log(
  JSON.stringify({
    kind: 'mounted-rower-counter',
    scope: 'diagnostic only; no acceptance',
    reports: [game, reforge].map((value) => ({
      report: value.reportSha256,
      raw: value.traceSha256,
    })),
    mutation: { order: draw.order, from: 0, to: 1, render: draw.state.renderId },
    retained: [
      'actual legal frame resource',
      'draw geometry',
      'every actor/effect/run/slot/wait',
      'all movement endpoints',
    ],
    errors: rejected.storyTiming.errors,
    result: 'rejected',
  }),
)
