import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { compareNpcStateTraces, readNpcTrace } from './npc-transition-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

const paths = process.argv.slice(2)
assert.equal(paths.length, 2, 'usage: inn-standing-counter.mjs GAME_002_REPORT REFORGE_002_REPORT')
const [game, reforge] = await Promise.all(paths.map(readNpcTrace))
for (const recording of [game, reforge]) assert.equal(recording.report.fragment, '002')
const compare = (trace) => compareNpcStateTraces(game.trace, trace, '002')
const positive = compare(reforge.trace)
assert.equal(positive.innTiming.status, 'passed')
assert.deepEqual(positive.findings, [])
const standing = positive.acceptedDifferences.find(
  (event) => event.id === 'e60' && event.type === 'explicit-take-before-first-draw',
)
const culled = positive.acceptedDifferences.find(
  (event) => event.id === 'e60' && event.type === 'offscreen-movement-draw',
)
assert(standing?.evidence.length && culled?.evidence.length, 'counter needs both actual proofs')
const overlay = standing.evidence[0]
const drawn = reforge.trace.events.find(
  (event) => event.kind === 'actor-render' && event.id === 'e60' && event.order === overlay.order,
)
assert(drawn && drawn.state.frame === overlay.frame, 'counter needs the actual taken idle draw')
const rejected = []
for (const frame of [overlay.suspendedFrame, overlay.frame + 1]) {
  const stride = reforge.trace.events.find(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === drawn.id &&
      event.order < drawn.order &&
      event.state.assetId === drawn.state.assetId &&
      event.state.frame === frame &&
      Number.isSafeInteger(event.state.frameResourceId),
  )
  assert(stride, 'counter needs an earlier actual stride resource')
  const mutated = {
    ...reforge.trace,
    events: reforge.trace.events.map((event) =>
      event === drawn
        ? {
            ...event,
            state: {
              ...event.state,
              frame: stride.state.frame,
              frameResourceId: stride.state.frameResourceId,
            },
          }
        : event,
    ),
  }
  const resources = await checkSpriteResources(
    {
      ...mutated,
      // Validate the changed NPC's actual resource. Historical party anchors may differ;
      // the full comparison still includes every participant and is diagnostic only.
      events: mutated.events.filter(
        (event) => event.kind !== 'actor-render' || event.id === drawn.id,
      ),
    },
    'reforge',
    fileURLToPath(new URL('../../', import.meta.url)),
  )
  assert.equal(
    resources.status,
    'proved',
    `mutated stride must remain legal: ${JSON.stringify(resources.witness)}`,
  )
  const counter = compare(mutated)
  assert.equal(counter.innTiming.status, 'needs-review')
  assert(counter.findings.some((event) => event.field === 'inn-authored-timing'))
  // Even the source-equal retained stride is wrong for the chosen taken-idle presentation.
  if (frame !== overlay.suspendedFrame)
    assert(
      counter.findings.some((event) => event.id === drawn.id && event.field === 'movement-frame'),
    )
  rejected.push({ frame, legalResource: resources.status, errors: counter.innTiming.errors })
}
console.log(
  JSON.stringify({
    status: 'passed',
    scope: 'diagnostic on recorded raw; no current E2E acceptance',
    draw: drawn.order,
    idle: drawn.state.frame,
    certifiedOffscreenCommits: culled.evidence.length,
    rejected,
  }),
)
