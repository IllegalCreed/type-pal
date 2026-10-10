import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { verifyAutomaticCapturePhase } from './automatic-capture-phase.mjs'
import { automaticLanguageGraphs } from './automatic-language-receipts.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import { movementTransitions, readNpcTrace } from './npc-transition-contract.mjs'
import { verifyRuntimeHandoffs } from './runtime-handoff-contract.mjs'
import { verifyStoryMotion } from './story-motion-contract.mjs'
import { storyProofPrefix } from './story-presentation-intent.mjs'

// Opt-in raw evidence counter. Never writes recordings or acceptance reports.
const { values } = parseArgs({ options: { acceptance: { type: 'string' } } })
assert(values.acceptance, 'actual acceptance required')
const acceptance = JSON.parse(await readFile(values.acceptance, 'utf8'))
assert.deepEqual(acceptance.sourceChanges, [])
assert.equal(acceptance.comparison.storyTiming.status, 'passed')
const recording = acceptance.recordings.find((recording) => recording.engine === 'reforge'),
  loaded = await readNpcTrace(recording.report.path)
assert.equal(loaded.reportSha256, recording.report.sha256)
assert.equal(loaded.traceSha256, recording.trace.sha256)
const trace = storyProofPrefix(loaded.trace, loaded.rawTrace),
  bindings = acceptance.comparison.storyTiming.automaticLanguages.bindings.filter((binding) => {
    const graph = automaticLanguageGraphs(binding).authored
    return (
      binding.runs.length > 1 &&
      graph.nodes.some((node) => node.value?.kind === 'step') &&
      graph.nodes.every(
        (node) => node.kind !== 'effect' || ['step', 'animate'].includes(node.value.kind),
      )
    )
  })
assert(bindings.length, 'actual restored increment-only word required')
function receipts(input, binding) {
  const slots = verifyMotionSlotLifetimes(input.causes),
    handoffs = verifyRuntimeHandoffs(input)
  return {
    handoffs,
    motion: verifyStoryMotion(input, slots, [binding], movementTransitions, handoffs),
  }
}
const results = []
let rejected = 0
for (const binding of bindings) {
  const positive = verifyAutomaticCapturePhase(trace, binding, receipts(trace, binding)),
    capture = trace.causes.find(
      (event) =>
        event.phase === 'runtime-captured' &&
        event.scene === binding.scene &&
        positive.captures.some((proof) => proof.order === event.order && proof.projections.length),
    ),
    entity = binding.entity
  assert(capture, 'actual projected capture required')
  for (const delta of [1, 2]) {
    const changedPoseOrders = new Set(),
      causes = trace.causes.map((event) => {
        const isCapture = event === capture,
          isStored = event.phase === 'runtime-stored' && event.snapshotId === capture.snapshotId,
          carriedFields = ['scenes', 'output'].filter(
            (field) =>
              event[field]?.[binding.scene]?.entities?.[entity]?.motion?.gait?.phase ===
              capture.saved.entities[entity].motion.gait.phase,
          ),
          isProjection =
            event.phase === 'runtime-projection-pose' &&
            event.entity === entity &&
            event.snapshotId === capture.snapshotId,
          isRun =
            event.phase === 'run-started' &&
            event.author?.entity === entity &&
            event.author.scene === binding.scene &&
            event.order > capture.order &&
            event.resume
        if (!isCapture && !isStored && !isProjection && !isRun && !carriedFields.length)
          return event
        const changed = structuredClone(event)
        for (const field of carriedFields)
          changed[field][binding.scene].entities[entity].motion.gait.phase += delta
        if (isCapture || isStored) changed.saved.entities[entity].motion.gait.phase += delta
        if (isProjection) {
          changed.motion.gait.phase += delta
          changed.actualMotion.gait.phase += delta
        }
        if (isCapture || isProjection || isRun) {
          changed.poses[entity].state.frameDebug.gait += delta
          changedPoseOrders.add(changed.poses[entity].commitOrder)
        }
        return changed
      }),
      events = trace.events.map((event) => {
        if (event.kind !== 'actor' || event.id !== entity || !changedPoseOrders.has(event.order))
          return event
        const changed = structuredClone(event)
        changed.state.frameDebug.gait += delta
        return changed
      }),
      variant = { ...trace, causes, events },
      native = receipts(variant, binding)
    // The old handoff and slot/effect proofs accept this consistent mutation.
    // The independent cumulative word must reject even +2 (same visible phase).
    assert.throws(
      () => verifyAutomaticCapturePhase(variant, binding, native),
      /capture phase gait differs from actual effect word/,
      `consistent capture/projection/activation phase +${delta}`,
    )
    rejected++
  }
  const borrowedCapture = {
    ...trace,
    causes: trace.causes.map((event) => {
      if (event !== capture) return event
      const changed = structuredClone(event)
      changed.poses[entity].commitOrder--
      return changed
    }),
  }
  assert.throws(
    () => verifyAutomaticCapturePhase(borrowedCapture, binding, receipts(borrowedCapture, binding)),
    /borrowed an old observation/,
    'capture must own its latest observed pose',
  )
  rejected++

  const actors = trace.events.filter(
      (event) => event.kind === 'actor' && event.id === entity && event.scene === binding.scene,
    ),
    animation = trace.causes.find(
      (event) =>
        event.phase === 'leaf-completed' &&
        event.runId !== binding.runs[0].runId &&
        event.occurrence?.command?.command?.kind === 'animEntity' &&
        event.occurrence.command.command.target?.entity === entity &&
        event.occurrence.command.command.target?.scene === binding.scene &&
        event.poses?.[entity],
    )
  assert(animation, 'actual resumed animation counter input missing')
  const animationCommand = trace.causes.find(
    (event) =>
      event.phase === 'command' &&
      event.runId === animation.runId &&
      event.occurrence?.id === animation.occurrence?.id,
  )
  assert(animationCommand, 'actual animation command counter input missing')
  const previousActor = actors.findLast(
    (event) => event.sceneVisit === animation.sceneVisit && event.order < animationCommand.order,
  )
  assert(previousActor, 'actual animation observation window is incomplete')
  const staleAnimation = {
    ...trace,
    causes: trace.causes.map((event) => {
      if (event !== animation) return event
      const changed = structuredClone(event)
      changed.poses[entity].commitOrder = previousActor.order
      return changed
    }),
  }
  assert.throws(
    () => verifyAutomaticCapturePhase(staleAnimation, binding, receipts(staleAnimation, binding)),
    /outside command completion window/,
    'animation completion cannot borrow a pre-command actor observation',
  )
  rejected++

  const changedAnimationState = {
    ...trace,
    causes: trace.causes.map((event) => {
      if (event !== animation) return event
      const changed = structuredClone(event)
      changed.poses[entity].state.facing =
        changed.poses[entity].state.facing === 'up' ? 'down' : 'up'
      return changed
    }),
  }
  assert.throws(
    () =>
      verifyAutomaticCapturePhase(
        changedAnimationState,
        binding,
        receipts(changedAnimationState, binding),
      ),
    /differs from its actor observation/,
    'animation completion must carry its own actor state',
  )
  rejected++

  const latestActor = actors.find(
      (event) =>
        event.sceneVisit === animation.sceneVisit &&
        event.order === animation.poses[entity].commitOrder,
    ),
    insertedLatest = structuredClone(latestActor)
  assert(latestActor, 'actual animation actor observation missing')
  insertedLatest.order = animation.order - 0.5
  const borrowedLatest = {
    ...trace,
    events: [...trace.events, insertedLatest].sort((a, b) => a.order - b.order),
  }
  assert.throws(
    () => verifyAutomaticCapturePhase(borrowedLatest, binding, receipts(borrowedLatest, binding)),
    /borrowed an old actor observation/,
    'animation completion must use the latest actor observation',
  )
  rejected++

  const step = receipts(trace, binding).motion.find(
    (route) => route.registration.order > capture.order && route.commits.length,
  )
  assert(step, 'actual resumed step counter input missing')
  const acknowledgement = trace.causes.find(
    (event) => event.phase === 'motion-slot-committed' && event.slotId === step.slotId,
  )
  assert(acknowledgement, 'actual resumed step acknowledgement missing')
  const stepActor = actors.findLast(
    (event) => event.sceneVisit === step.sceneVisit && event.order < step.commits[0].order,
  )
  assert(stepActor, 'actual step pre-commit actor observation missing')
  const borrowedStep = {
    ...trace,
    causes: trace.causes.map((event) => {
      if (event !== acknowledgement) return event
      const changed = structuredClone(event)
      changed.poses[entity].commitOrder = stepActor.order
      return changed
    }),
  }
  assert.throws(
    () => verifyAutomaticCapturePhase(borrowedStep, binding, receipts(borrowedStep, binding)),
    /outside commit acknowledgement window/,
    'step acknowledgement cannot borrow a pre-commit actor observation',
  )
  rejected++

  if (entity === 'e91') {
    const reviewerOrders = new Map([
      [53716, 21949],
      [53917, 21950],
    ])
    const reviewerVariant = {
      ...trace,
      causes: trace.causes.map((event) => {
        const order = reviewerOrders.get(event.order)
        if (order === undefined) return event
        const changed = structuredClone(event)
        changed.poses[entity].commitOrder = order
        return changed
      }),
    }
    assert.throws(
      () =>
        verifyAutomaticCapturePhase(reviewerVariant, binding, receipts(reviewerVariant, binding)),
      /outside command completion window|lacks actual actor observation/,
      'reviewer borrowed completion poses before capture',
    )
    rejected++
  }
  results.push(positive)
}
console.log(
  JSON.stringify({
    status: 'diagnostic-capture-phase-passed',
    results,
    rejected,
    note: 'No restored control-flow, staging, draw or final E2E credit.',
  }),
)
