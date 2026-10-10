import assert from 'node:assert/strict'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import { automaticLanguageGraphs } from './automatic-language-receipts.mjs'

const one = (items, message) => {
  assert.equal(items.length, 1, message)
  return items[0]
}

function verifyEffectObservations(trace, binding, receipts, runIds, actors, leaves) {
  const entity = binding.entity,
    actorAt = (order, sceneVisit) =>
      actors.find((event) => event.order === order && event.sceneVisit === sceneVisit),
    latestBefore = (order, sceneVisit) =>
      actors.filter((event) => event.sceneVisit === sceneVisit && event.order < order).at(-1)
  for (const event of trace.causes.filter(
    (candidate) =>
      candidate.phase === 'command' &&
      runIds.has(candidate.runId) &&
      candidate.occurrence?.command?.kind === 'leaf',
  )) {
    const proof = one(
        leaves.filter((leaf) => leaf.command === event.order),
        'capture phase observation leaf lacks unique binding',
      ),
      command = event.occurrence.command.command
    if (command.kind === 'wait') continue
    assert.deepEqual(
      command.target,
      { scene: binding.scene, entity },
      'capture phase observation has another target',
    )
    if (command.kind === 'stepEntity') {
      const route = one(
        receipts.motion.filter(
          (candidate) =>
            candidate.registration.runId === event.runId &&
            candidate.registration.occurrence.id === event.occurrence.id,
        ),
        'capture phase observation step lacks unique actual route',
      )
      if (!route.commits.length) continue
      const acknowledgement = one(
        trace.causes.filter(
          (receipt) =>
            receipt.phase === 'motion-slot-committed' &&
            receipt.slotId === route.slotId &&
            receipt.runId === event.runId &&
            receipt.sceneVisit === event.sceneVisit,
        ),
        'capture phase observation step lacks unique acknowledgement',
      )
      const pose = acknowledgement.poses[entity],
        observed = actorAt(pose.commitOrder, event.sceneVisit),
        commit = one(route.commits, 'capture phase observation step lacks actual commit')
      assert(observed, 'capture phase step acknowledgement lacks actual actor observation')
      assert(
        pose.commitOrder >= commit.order && pose.commitOrder < acknowledgement.order,
        'capture phase step observation is outside commit acknowledgement window',
      )
      assert.equal(
        observed.order,
        latestBefore(acknowledgement.order, event.sceneVisit)?.order,
        'capture phase step acknowledgement borrowed an old actor observation',
      )
      assert.deepEqual(
        pose.state,
        observed.state,
        'capture phase step acknowledgement differs from its actor observation',
      )
      continue
    }
    assert.equal(
      command.kind,
      'animEntity',
      'capture phase observation leaf is not a register increment',
    )
    assert.notEqual(proof.completed, null, 'capture phase animation lacks actual completion')
    const completion = one(
        trace.causes.filter(
          (receipt) =>
            receipt.order === proof.completed &&
            receipt.phase === 'leaf-completed' &&
            receipt.runId === event.runId &&
            receipt.occurrence.id === event.occurrence.id &&
            receipt.sceneVisit === event.sceneVisit,
        ),
        'capture phase observation animation lacks actual completion',
      ),
      pose = completion.poses[entity],
      observed = actorAt(pose.commitOrder, event.sceneVisit)
    assert(observed, 'capture phase animation lacks actual actor observation')
    assert(
      event.order < observed.order && observed.order < completion.order,
      'capture phase animation observation is outside command completion window',
    )
    assert.equal(
      observed.order,
      latestBefore(completion.order, event.sceneVisit)?.order,
      'capture phase animation completion borrowed an old actor observation',
    )
    assert.deepEqual(
      pose.state,
      observed.state,
      'capture phase animation completion differs from its actor observation',
    )
  }
}

// A saved gait counter is cumulative, unlike the primary renderer's modulo
// phase. A capture/projection pair that both add one whole period is still wrong.
// This proof is deliberately limited to self step/animate words. It does not
// certify restored control flow, scene staging, draws, or the final comparison.
export function verifyAutomaticCapturePhase(trace, binding, receipts) {
  const graph = automaticLanguageGraphs(binding).authored,
    entity = binding.entity,
    root = objects.eventObjects.find((object) => `e${object.id}` === entity),
    runIds = new Set(binding.runs.map((run) => run.runId)),
    runs = trace.causes.filter((event) => event.phase === 'run-started' && runIds.has(event.runId)),
    actors = trace.events.filter(
      (event) => event.kind === 'actor' && event.id === entity && event.scene === binding.scene,
    )
  assert(
    graph.nodes.every(
      (node) => node.kind !== 'effect' || ['step', 'animate'].includes(node.value.kind),
    ),
    'capture phase word has another register writer',
  )
  assert.equal(runs.length, binding.runs.length, 'capture phase lost an activation')
  assert(runs.length && runs[0].resume === null, 'capture phase lacks its initial activation')
  const seed = runs[0].poses[entity],
    initial = actors.findLast((event) => event.order < runs[0].order)
  assert.equal(seed.commitOrder, initial.order, 'capture phase borrowed its initial pose')
  assert.deepEqual(seed.state, initial.state, 'capture phase initial pose differs')
  assert.equal(root.currentFrameNum, 0, 'capture phase nonzero initial register unsupported')
  for (const field of ['override', 'gait', 'explicit', 'action'])
    assert.equal(seed.state.frameDebug[field], null, 'capture phase initial register is not empty')
  const leaves = binding.runs.flatMap((run) => run.leaves),
    changes = []
  verifyEffectObservations(trace, binding, receipts, runIds, actors, leaves)
  for (const event of trace.causes.filter(
    (event) =>
      event.phase === 'command' &&
      runIds.has(event.runId) &&
      event.occurrence?.command?.kind === 'leaf',
  )) {
    const proof = one(
        leaves.filter((leaf) => leaf.command === event.order),
        'capture phase leaf lacks unique binding',
      ),
      command = event.occurrence.command.command
    assert.equal(proof.occurrence, event.occurrence.id, 'capture phase leaf has wrong occurrence')
    if (command.kind === 'wait') continue
    assert.deepEqual(
      command.target,
      { scene: binding.scene, entity },
      'capture phase has another target',
    )
    if (command.kind === 'stepEntity') {
      const route = one(
        receipts.motion.filter(
          (route) =>
            route.registration.runId === event.runId &&
            route.registration.occurrence.id === event.occurrence.id,
        ),
        'capture phase step lacks unique actual route',
      )
      assert.equal(route.slotId, proof.slot, 'capture phase route uses another slot')
      assert(
        route.commits.length <= 1 && !route.noOps.length,
        'capture phase step has extra displacement',
      )
      if (!route.commits.length) continue
      const commit = one(
        trace.causes.filter(
          (receipt) =>
            receipt.phase === 'motion-slot-committed' &&
            receipt.slotId === route.slotId &&
            receipt.runId === event.runId &&
            receipt.sceneVisit === event.sceneVisit,
        ),
        'capture phase step lacks unique commit acknowledgement',
      )
      assert.equal(
        commit.occurrence.id,
        event.occurrence.id,
        'capture phase commit belongs to another leaf',
      )
      changes.push({ order: commit.poses[entity].commitOrder, mode: 'gait' })
    } else {
      assert.equal(command.kind, 'animEntity', 'capture phase leaf is not a register increment')
      if (proof.completed === null) continue
      const completed = one(
        trace.causes.filter(
          (receipt) =>
            receipt.order === proof.completed &&
            receipt.phase === 'leaf-completed' &&
            receipt.runId === event.runId &&
            receipt.occurrence.id === event.occurrence.id,
        ),
        'capture phase animation lacks actual completion',
      )
      changes.push({ order: completed.poses[entity].commitOrder, mode: 'explicit' })
    }
  }
  changes.sort((a, b) => a.order - b.order)
  assert.equal(
    new Set(changes.map((change) => change.order)).size,
    changes.length,
    'capture phase counts an effect twice',
  )
  const expectedAt = (order) => {
    const prefix = changes.filter((change) => change.order < order)
    return { counter: prefix.length, mode: prefix.at(-1)?.mode ?? null }
  }
  const checkDebug = (state, expected) => {
    const debug = state.frameDebug
    assert.equal(debug.authority, 'world', 'capture phase has another authority')
    assert.equal(debug.action, null, 'capture phase has an independent action')
    assert.equal(debug.override, null, 'capture phase has an independent fixed frame')
    assert.equal(
      debug.gait,
      expected.mode === 'gait' ? expected.counter : null,
      'capture phase gait differs from actual effect word',
    )
    assert.equal(
      debug.explicit,
      expected.mode === 'explicit' ? expected.counter : null,
      'capture phase explicit register differs from actual effect word',
    )
    if (expected.mode === 'gait') {
      assert.equal(debug.gaitOwner?.source, 'auto', 'capture phase gait belongs to another channel')
      assert.equal(debug.gaitActivationOwner, entity, 'capture phase gait belongs to another actor')
    }
  }
  const captures = trace.causes.filter(
    (event) =>
      event.phase === 'runtime-captured' &&
      event.scene === binding.scene &&
      event.order > runs[0].order &&
      event.saved.automatic[entity],
  )
  assert(captures.length, 'capture phase lacks actual capture')
  const result = []
  for (const capture of captures) {
    const own = capture.poses[entity],
      observed = actors.findLast((event) => event.order < capture.order),
      expected = expectedAt(capture.order),
      motion =
        expected.mode === 'gait'
          ? { gait: { phase: expected.counter, source: 'auto', owner: entity } }
          : expected.mode === 'explicit'
            ? { explicitAnimation: expected.counter }
            : {}
    assert.equal(own.commitOrder, observed.order, 'capture phase borrowed an old observation')
    assert.deepEqual(own.state, observed.state, 'capture phase own observation differs')
    checkDebug(own.state, expected)
    assert.deepEqual(
      capture.saved.entities[entity].motion,
      motion,
      'capture phase saved motion differs from actual effect word',
    )
    const projections = trace.causes.filter(
      (event) =>
        event.phase === 'runtime-projection-pose' &&
        event.snapshotId === capture.snapshotId &&
        event.scene === binding.scene &&
        event.entity === entity,
    )
    for (const projection of projections) {
      assert(
        receipts.handoffs.projections.some(
          (proof) =>
            proof.snapshotId === capture.snapshotId &&
            proof.sceneVisit === projection.sceneVisit &&
            proof.poseReceipts.some(
              (pose) => pose.order === projection.order && pose.entity === entity,
            ),
        ),
        'capture phase projection lacks its actual handoff',
      )
      assert.deepEqual(projection.motion, motion, 'capture phase projection changed saved motion')
      assert.deepEqual(
        projection.actualMotion,
        motion,
        'capture phase restore changed saved motion',
      )
      const pose = projection.poses[entity],
        observed = actors.find((event) => event.order === pose.commitOrder)
      assert(
        observed && observed.order < projection.order,
        'capture phase projection borrowed a pose',
      )
      assert.deepEqual(pose.state, observed.state, 'capture phase projected observation differs')
      checkDebug(pose.state, expected)
      const run = one(
        runs.filter(
          (run) => run.sceneVisit === projection.sceneVisit && run.order > projection.order,
        ),
        'capture phase projection lacks unique resumed activation',
      )
      assert.deepEqual(
        run.resume,
        capture.saved.automatic[entity].cursor.resume,
        'capture phase resumed another cursor',
      )
      assert.deepEqual(run.poses[entity], pose, 'capture phase activation changed projected pose')
    }
    result.push({
      snapshotId: capture.snapshotId,
      order: capture.order,
      ...expected,
      projections: projections.map((projection) => projection.order),
    })
  }
  return { scene: binding.scene, entity, increments: changes.length, captures: result }
}
