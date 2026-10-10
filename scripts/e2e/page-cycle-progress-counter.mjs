import assert from 'node:assert/strict'
import { verifyEntityActionTimelines } from './entity-action-contract.mjs'
import { scopeNpcStoryTrace } from './npc-story-scope.mjs'
import {
  actorTransitions,
  compareNpcStateTraces,
  readNpcTrace,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { pageCycleProgressCertificates } from './page-cycle-progress.mjs'
import { recompareRecording } from './recompare-recording.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'
import { storyProofPrefix } from './story-presentation-intent.mjs'

const paths = process.argv.slice(2)
assert.equal(paths.length, 2, 'usage: page-cycle-progress-counter.mjs GAME_006 RF_006')
const positive = await recompareRecording('006', ...paths)
assert.equal(positive.status, 'passed')
assert.deepEqual(positive.sourceChanges, [])
assert.deepEqual(positive.comparison.findings, [])
const timing = positive.comparison.storyTiming,
  receipt = positive.comparison.acceptedDifferences.find(
    (event) => event.id === 'e203' && event.type === 'causal-page-cycle-progress',
  )
assert(receipt, 'full comparison did not exercise actual island page cycle')
console.log(JSON.stringify({ phase: 'baseline', findings: 0, sourceChanges: 0, receipt }))
const [game, reforge] = await Promise.all(paths.map(readNpcTrace)),
  fullGame = storyProofPrefix(game.trace, game.rawTrace),
  fullReforge = storyProofPrefix(reforge.trace, reforge.rawTrace),
  actions = verifyEntityActionTimelines(fullReforge),
  access = { renders: renderedPoseEvidence, states: actorTransitions },
  participants = [{ scene: 's014', entity: 'e203' }],
  certificate = (trace) =>
    pageCycleProgressCertificates(fullGame, trace, participants, { ...timing, actions }, access)
assert.equal(certificate(fullReforge).proved.length, 1)
const raw = reforge.rawTrace,
  drawn = raw.events.find(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === 'e203' &&
      event.scene === 's014' &&
      event.state.drawStatus === 'drawn' &&
      event.state.frame === 1,
  )
assert(drawn, 'needs an actual moving page frame')
const replacement = raw.events.find(
  (event) =>
    event.kind === 'actor-render' &&
    event.id === 'e203' &&
    event.sceneVisit === drawn.sceneVisit &&
    event.state.drawStatus === 'drawn' &&
    event.state.frame === 0 &&
    event.state.frameResourceId < drawn.order,
)
assert(replacement, 'needs an earlier actual decoded frame-zero resource')
assert.deepEqual(drawn.state.geometry.worldRect, replacement.state.geometry.worldRect)
const wrongRaw = {
    ...raw,
    events: raw.events.map((event) =>
      event === drawn
        ? {
            ...event,
            state: {
              ...event.state,
              frame: replacement.state.frame,
              frameResourceId: replacement.state.frameResourceId,
            },
          }
        : event,
    ),
  },
  wrong = scopeNpcStoryTrace(wrongRaw, reforge.report.storyScope),
  resources = await checkSpriteResources(wrong, 'reforge', process.cwd())
assert.equal(resources.status, 'proved', JSON.stringify(resources.witness))
assert.equal(certificate(storyProofPrefix(wrong, wrongRaw)).proved.length, 0)
const counter = compareNpcStateTraces(game.trace, wrong, '006', {
  rawGame: game.rawTrace,
  rawReforge: wrongRaw,
  frameCounts: resources.frameCounts,
})
assert(
  counter.storyTiming.errors.some((error) =>
    error.includes('e203: incorrect actual rendered frame'),
  ),
)
assert(counter.findings.length)
assert(!counter.acceptedDifferences.some((event) => event.type === receipt.type))
console.log(
  JSON.stringify({
    phase: 'legal-wrong-draw',
    order: drawn.order,
    from: 1,
    to: 0,
    resources: resources.status,
    rejected: true,
  }),
)
const installation = fullReforge.causes.find(
    (event) => event.order === receipt.evidence.installation,
  ),
  gate = fullReforge.causes.find(
    (event) => event.phase === 'action-gate' && event.trackId === receipt.evidence.trackId,
  )
assert(installation && gate)
const mutations = [
  ['missing-installation', fullReforge.causes.filter((event) => event !== installation)],
  [
    'borrowed-installation-visit',
    fullReforge.causes.map((event) =>
      event === installation ? { ...event, sceneVisit: event.sceneVisit + 1 } : event,
    ),
  ],
  [
    'unrelated-cycle-held',
    fullReforge.causes.map((event) =>
      event === gate ? { ...event, paused: true, inputs: { ...event.inputs, held: true } } : event,
    ),
  ],
]
for (const [name, causes] of mutations) {
  const trace = { ...fullReforge, causes }
  assert.equal(certificate(trace).proved.length, 0, name)
  assert.throws(() => verifyEntityActionTimelines(trace), undefined, name)
}
console.log(
  JSON.stringify({
    status: 'passed',
    scope: 'actual raw diagnostic counter; no final E2E acceptance',
    baseline: { findings: 0, sourceChanges: 0, storyTiming: timing.status },
    receipt,
    rejected: ['legal-wrong-draw', ...mutations.map(([name]) => name)],
  }),
)
