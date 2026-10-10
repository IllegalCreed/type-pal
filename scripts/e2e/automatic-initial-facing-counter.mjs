import assert from 'node:assert/strict'
import { approvedAutomaticInitialFacing } from './automatic-initial-facing.mjs'
import { scopeNpcStoryTrace } from './npc-story-scope.mjs'
import {
  compareNpcStateTraces,
  observeNpcState,
  readNpcTrace,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

const paths = process.argv.slice(2)
assert.equal(paths.length, 2, 'usage: automatic-initial-facing-counter.mjs GAME_005 RF_005')
const [game, reforge] = await Promise.all(paths.map(readNpcTrace))
for (const recording of [game, reforge]) assert.equal(recording.report.fragment, '005')
const resources = await checkSpriteResources(reforge.trace, 'reforge', process.cwd())
assert.equal(resources.status, 'proved')
const compare = (trace, rawTrace = reforge.rawTrace) =>
  compareNpcStateTraces(game.trace, trace, '005', {
    rawGame: game.rawTrace,
    rawReforge: rawTrace,
    frameCounts: resources.frameCounts,
  })
const positive = compare(reforge.trace)
assert.equal(positive.storyTiming.status, 'passed')
assert.deepEqual(positive.findings, [])
const receipt = positive.acceptedDifferences.find(
  (event) => event.id === 'e84' && event.type === 'approved-automatic-initial-facing',
)
assert(receipt, 'full comparison did not exercise the approved initial interval')
console.log(JSON.stringify({ phase: 'baseline', findings: 0, receipt }))
const certificate = (trace) =>
  approvedAutomaticInitialFacing({
    fragment: '005',
    id: 'e84',
    game: game.trace,
    reforge: trace,
    gameTransitions: observeNpcState(game.trace, ['e84'], { e84: 's004' }).actors.e84.transitions,
    reforgeTransitions: observeNpcState(trace, ['e84'], { e84: 's004' }).actors.e84.transitions,
    gameRenders: renderedPoseEvidence(game.trace, 'e84', 's004'),
    reforgeRenders: renderedPoseEvidence(trace, 'e84', 's004'),
    storyTiming: positive.storyTiming,
  })
const raw = reforge.trace.events,
  prefixDraw = raw.find(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === 'e84' &&
      event.state.drawStatus === 'drawn' &&
      event.order < receipt.reforge.writer.observation,
  )
assert(prefixDraw, 'needs an actual initial draw')
const wrongPrefix = {
  ...reforge.trace,
  events: raw.map((event) =>
    event === prefixDraw ? { ...event, state: { ...event.state, facing: 'left' } } : event,
  ),
}
assert.equal(certificate(wrongPrefix), null)
const prefixResource = await checkSpriteResources(wrongPrefix, 'reforge', process.cwd())
assert.equal(prefixResource.status, 'proved')
const drawn = raw.find(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === 'e84' &&
      event.state.drawStatus === 'drawn' &&
      event.state.frame === 9 &&
      event.order > receipt.reforge.writer.observation &&
      raw.some(
        (other) =>
          other.kind === 'actor-render' &&
          other.id === 'e84' &&
          other.state.frame === 10 &&
          other.state.frameResourceId < event.order,
      ),
  ),
  replacement = raw.find(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === 'e84' &&
      event.state.frame === 10 &&
      event.state.frameResourceId < drawn.order,
  )
assert(drawn && replacement, 'needs an actual later draw and earlier legal replacement resource')
assert.deepEqual(
  drawn.state.geometry.worldRect.slice(2),
  replacement.state.geometry.worldRect.slice(2),
)
const wrongRaw = {
  ...reforge.rawTrace,
  events: reforge.rawTrace.events.map((event) =>
    event.order === drawn.order
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
}
const wrongDraw = scopeNpcStoryTrace(wrongRaw, reforge.report.storyScope)
const legal = await checkSpriteResources(wrongDraw, 'reforge', process.cwd())
assert.equal(legal.status, 'proved', JSON.stringify(legal.witness))
assert(certificate(wrongDraw), 'later draw must not be folded into the initial interval')
const counter = compare(wrongDraw, wrongRaw)
assert(
  counter.storyTiming.errors.some((error) =>
    error.includes('e84: incorrect actual rendered frame'),
  ),
)
assert(counter.findings.length)
assert(!counter.acceptedDifferences.some((event) => event.type === receipt.type))
const rejected = ['legal-wrong-initial-facing', 'legal-wrong-post-initial-draw']
for (const [name, trace] of [
  [
    'missing-real-writer',
    {
      ...reforge.trace,
      causes: reforge.trace.causes.filter(
        (event) => event.order !== receipt.reforge.writer.command,
      ),
    },
  ],
  [
    'borrowed-visit',
    {
      ...reforge.trace,
      events: raw.map((event) =>
        event === prefixDraw ? { ...event, sceneVisit: event.sceneVisit + 1 } : event,
      ),
    },
  ],
  [
    'wrong-post-initial-facing',
    {
      ...reforge.trace,
      events: raw.map((event) =>
        event.order === receipt.reforge.writer.observation
          ? { ...event, state: { ...event.state, facing: 'left' } }
          : event,
      ),
    },
  ],
]) {
  if (name === 'borrowed-visit')
    assert.throws(() => certificate(trace), /incomplete render span/, name)
  else assert.equal(certificate(trace), null, name)
  rejected.push(name)
}
console.log(
  JSON.stringify({
    status: 'passed',
    scope: 'current raw diagnostic counter; no final E2E acceptance',
    baseline: { findings: positive.findings.length, storyTiming: positive.storyTiming.status },
    receipt,
    mutation: {
      order: drawn.order,
      from: drawn.state.frame,
      to: replacement.state.frame,
    },
    resourceProof: legal.status,
    rejected,
  }),
)
