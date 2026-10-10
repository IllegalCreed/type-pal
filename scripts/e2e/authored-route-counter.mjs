import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { scopeNpcStoryTrace } from './npc-story-scope.mjs'
import {
  compareNpcStateTraces,
  movementTransitions,
  readNpcTrace,
} from './npc-transition-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

const [path, ...extra] = process.argv.slice(2)
assert(path && !extra.length, 'usage: authored-route-counter.mjs 005_ACCEPTANCE')
const acceptance = JSON.parse(await readFile(path, 'utf8'))
assert.equal(acceptance.fragment, '005')
const loaded = await Promise.all(
  acceptance.recordings.map((recording) => readNpcTrace(recording.report.path)),
)
for (const [index, evidence] of loaded.entries()) {
  assert.equal(evidence.reportSha256, acceptance.recordings[index].report.sha256)
  assert.equal(evidence.traceSha256, acceptance.recordings[index].trace.sha256)
}
const [game, reforge] = loaded
const resources = await checkSpriteResources(reforge.trace, 'reforge', process.cwd())
assert.equal(resources.status, 'proved')
const compare = (trace, raw) =>
  compareNpcStateTraces(game.trace, trace, '005', {
    rawGame: game.rawTrace,
    rawReforge: raw,
    frameCounts: resources.frameCounts,
  })
const baseline = compare(reforge.trace, reforge.rawTrace)
assert.equal(baseline.storyTiming.status, 'passed')
assert(
  baseline.acceptedDifferences.some(
    (proof) => proof.id === 'e84' && proof.type === 'causal-authored-route-progress',
  ),
  'positive actual route never exercised certificate',
)
assert.deepEqual(
  baseline.findings.filter((finding) => finding.id === 'e84'),
  [],
)
const moves = movementTransitions(reforge.trace, 'e84', 's004')
const move = moves[4]
assert(move && move.delta[0] === 0 && move.delta[1] === 0.25)
const actor = reforge.rawTrace.events.find((event) => event.order === move.order)
assert(actor)
const next = moves[5]
assert(next)
const variant = {
  ...reforge.rawTrace,
  events: reforge.rawTrace.events.map((event) => {
    if (
      event.kind !== 'actor' ||
      event.id !== 'e84' ||
      event.sceneVisit !== actor.sceneVisit ||
      event.order < actor.order ||
      event.order > next.order
    )
      return event
    const result = structuredClone(event)
    for (const field of ['state', 'before']) {
      if (JSON.stringify(result[field]?.position) === JSON.stringify(actor.state.position))
        result[field].position[1] += 0.125
    }
    return result
  }),
}
const scoped = scopeNpcStoryTrace(variant, reforge.report.storyScope)
const compactDirections = (trace) =>
  movementTransitions(trace, 'e84', 's004')
    .map((event) => event.delta.map(Math.sign))
    .filter(
      (direction, index, values) =>
        !index || JSON.stringify(direction) !== JSON.stringify(values[index - 1]),
    )
assert.deepEqual(compactDirections(scoped), compactDirections(reforge.trace))
assert.deepEqual(movementTransitions(scoped, 'e84', 's004')[0].from, moves[0].from)
assert.deepEqual(movementTransitions(scoped, 'e84', 's004').at(-1).to, moves.at(-1).to)
assert.deepEqual(
  variant.events.filter((event) => event.kind === 'actor-render'),
  reforge.rawTrace.events.filter((event) => event.kind === 'actor-render'),
)
const resource = await checkSpriteResources(scoped, 'reforge', process.cwd())
assert.equal(resource.status, 'proved')
const rejected = compare(scoped, variant)
assert(
  rejected.storyTiming.errors.some((error) =>
    error.includes('motion differs from exact authored stride'),
  ),
  JSON.stringify(rejected.storyTiming.errors),
)
assert(
  !rejected.acceptedDifferences.some(
    (proof) => proof.id === 'e84' && proof.type === 'causal-authored-route-progress',
  ),
)
assert(
  rejected.findings.some(
    (finding) => finding.id === 'e84' && finding.field === 'movement-leg-alignment',
  ),
)
console.log(
  JSON.stringify({
    kind: 'authored-route-counter',
    scope: 'diagnostic archived raw only; no acceptance',
    baseline: { entity: 'e84', findings: 0 },
    mutation: { order: actor.order, stride: [0.375, 0.125] },
    retained: [
      'compact directions',
      'initial/terminal position',
      'every actual draw and legal resource',
    ],
    errors: rejected.storyTiming.errors,
    result: 'rejected',
  }),
)
