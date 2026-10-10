import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { scopeNpcStoryTrace } from './npc-story-scope.mjs'
import { compareNpcStateTraces, readNpcTrace } from './npc-transition-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

// A legal resource frame is not evidence of the effect that selected it.
// This opt-in raw mutation never writes a recording or publishes acceptance.
const [path, ...extra] = process.argv.slice(2)
assert(path && !extra.length, 'usage: automatic-draw-counter.mjs 005_ACCEPTANCE')
const acceptance = JSON.parse(await readFile(path, 'utf8'))
assert.equal(acceptance.fragment, '005')
const loaded = await Promise.all(acceptance.recordings.map((r) => readNpcTrace(r.report.path)))
for (const [index, evidence] of loaded.entries()) {
  assert.equal(evidence.reportSha256, acceptance.recordings[index].report.sha256)
  assert.equal(evidence.traceSha256, acceptance.recordings[index].trace.sha256)
}
const [game, reforge] = loaded
const resources = await checkSpriteResources(reforge.trace, 'reforge', process.cwd())
assert.equal(resources.status, 'proved')
const compare = (trace, rawTrace) =>
  compareNpcStateTraces(game.trace, trace, '005', {
    rawGame: game.rawTrace,
    rawReforge: rawTrace,
    frameCounts: resources.frameCounts,
  })
const baseline = compare(reforge.trace, reforge.rawTrace)
assert.equal(baseline.storyTiming.status, 'passed')
assert.deepEqual(
  baseline.findings.filter((e) => e.id === 'e93'),
  [],
)
assert(
  baseline.acceptedDifferences.some(
    (e) => e.id === 'e93' && e.type === 'causal-automatic-language-progress',
  ),
  'baseline never exercised the causal automatic language certificate',
)
const replacement = reforge.rawTrace.events.find(
  (e) => e.kind === 'actor-render' && e.id === 'e93' && e.state.frame === 13,
)
assert(replacement, 'actual earlier decoded frame-13 resource required')
const draw = reforge.rawTrace.events.find(
  (e) =>
    e.kind === 'actor-render' &&
    e.id === 'e93' &&
    e.state.frame === 10 &&
    e.order > replacement.state.frameResourceId &&
    e.order > reforge.trace.renderScope.afterOrder,
)
assert(draw, 'actual frame-10 e93 draw required')
assert.deepEqual(
  draw.state.geometry.worldRect.slice(2),
  replacement.state.geometry.worldRect.slice(2),
  'replacement must preserve actual draw dimensions',
)
const variant = {
  ...reforge.rawTrace,
  events: reforge.rawTrace.events.map((event) =>
    event === draw
      ? {
          ...event,
          state: {
            ...event.state,
            frame: 13,
            frameResourceId: replacement.state.frameResourceId,
          },
        }
      : event,
  ),
}
const scoped = scopeNpcStoryTrace(variant, reforge.report.storyScope)
const legal = await checkSpriteResources(scoped, 'reforge', process.cwd())
assert.equal(legal.status, 'proved', 'counter must retain valid resource pixels')
const rejected = compare(scoped, variant)
assert(
  rejected.storyTiming.errors.some((error) =>
    error.includes('e93: incorrect actual rendered frame'),
  ),
  `counter must fail the independent drawn-frame oracle: ${JSON.stringify(rejected.storyTiming.errors)}`,
)
const findings = rejected.findings.filter((e) => e.id === 'e93')
assert(findings.length, 'wrong actual draw was accepted')
assert(
  !rejected.acceptedDifferences.some(
    (e) => e.id === 'e93' && e.type === 'causal-automatic-language-progress',
  ),
  'wrong draw acquired a causal language certificate',
)
console.log(
  JSON.stringify({
    kind: 'automatic-draw-counter',
    scope: 'diagnostic only; immutable archived raw; no acceptance',
    baseline: { storyTiming: baseline.storyTiming.status, entityFindings: 0 },
    mutation: { order: draw.order, renderId: draw.renderId, from: 10, to: 13 },
    resourceProof: legal.status,
    result: 'rejected',
    causalErrors: rejected.storyTiming.errors,
    findings: findings.map(({ type, id, field }) => ({ type, id, field })),
  }),
)
