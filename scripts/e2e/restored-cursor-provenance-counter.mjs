import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isDeepStrictEqual as same } from 'node:util'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import { movementTransitions, readNpcTrace } from './npc-transition-contract.mjs'
import { verifyRestoredAutomaticActivations } from './restored-automatic-cycle.mjs'
import { verifyRuntimeHandoffs } from './runtime-handoff-contract.mjs'
import { verifyStoryMotion } from './story-motion-contract.mjs'
import { storyProofPrefix } from './story-presentation-intent.mjs'

// Opt-in diagnostic on immutable real recordings. This never publishes acceptance.
const [path, ...extra] = process.argv.slice(2)
assert(path && !extra.length, 'usage: restored-cursor-provenance-counter.mjs 005_ACCEPTANCE')
const acceptance = JSON.parse(await readFile(path, 'utf8'))
assert.equal(acceptance.fragment, '005')
const loaded = await Promise.all(acceptance.recordings.map((r) => readNpcTrace(r.report.path)))
for (const [index, evidence] of loaded.entries()) {
  assert.equal(evidence.reportSha256, acceptance.recordings[index].report.sha256)
  assert.equal(evidence.traceSha256, acceptance.recordings[index].trace.sha256)
}
const [game, reforge] = loaded.map((e) => storyProofPrefix(e.trace, e.rawTrace))
const binding = acceptance.comparison.storyTiming.automaticLanguages.bindings.find(
  (b) => b.entity === 'e91',
)
assert(binding, 'actual restored e91 binding required')
const receipts = (trace) => {
  const slots = verifyMotionSlotLifetimes(trace.causes)
  const handoffs = verifyRuntimeHandoffs(trace)
  return {
    slots,
    handoffs,
    motion: verifyStoryMotion(trace, slots, [binding], movementTransitions, handoffs),
  }
}
const positive = verifyRestoredAutomaticActivations(game, reforge, binding, receipts(reforge))
const run = reforge.causes.find(
  (e) => e.phase === 'run-started' && e.runId === positive.restorations[0].runId,
)
const capture = reforge.causes.find(
  (e) => e.phase === 'runtime-captured' && e.order === positive.restorations[0].capture,
)
const cursor = capture.saved.automatic.e91.cursor
assert(same(cursor.resume, run.resume), 'counter does not use actual restoration')
const changed = structuredClone(cursor)
changed.resume.frames[1].index -= 1
assert(changed.resume.frames[1].index >= 0, 'actual loop has no alternate occurrence')
const pathFor = (value) => [
  value.at.stage,
  ...value.resume.frames.flatMap((frame, index, frames) =>
    index < frames.length - 1 ? [frame.index, 'body'] : [frame.index],
  ),
]
const oldPath = pathFor(cursor)
const newPath = pathFor(changed)
// Change every carried snapshot/cursor/resume/path consistently, while retaining
// the independent source actor and the capture's own live pose observation.
const replace = (value) => {
  if (!value || typeof value !== 'object') return value
  if (value.behavior && value.at && value.resume && same(value, cursor)) return changed
  if (value.digest && value.frames && same(value, cursor.resume)) return changed.resume
  if (Array.isArray(value)) {
    if (same(value, oldPath)) return newPath
    return value.map(replace)
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replace(child)]))
}
const variant = {
  ...reforge,
  causes: reforge.causes.map((event) => {
    if (event.order < capture.order) return event
    const altered = replace(event)
    return event === capture ? { ...altered, poses: event.poses } : altered
  }),
  events: reforge.events.map((event) => (event.order > capture.order ? replace(event) : event)),
}
const carried = receipts(variant)
assert.throws(
  () => verifyRestoredAutomaticActivations(game, variant, binding, carried),
  /saved cursor differs from its latest source actor observation/,
)
console.log(
  JSON.stringify({
    kind: 'restored-cursor-provenance-counter',
    scope: 'diagnostic only; immutable archived raw; no acceptance',
    positive: positive.restorations,
    mutation: { capture: capture.order, oldPath, newPath, digest: cursor.resume.digest },
    handoffs: 'proved',
    result: 'rejected-by-independent-source-cursor',
  }),
)
