import assert from 'node:assert/strict'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import { verifyAutomaticCapturePhase } from './automatic-capture-phase.mjs'
import { canonicalPosition } from './coordinate-evidence.mjs'

const one = (items, message) => {
  assert.equal(items.length, 1, message)
  return items[0]
}

/** State-change collectors omit an assignment that restores the exact factory position. */
export function verifyRestoredPosition(
  staging,
  { entity, scene, rootPosition, capturedPosition, projecting, projection, ownOrder },
) {
  const writes = staging.filter(
    (event) =>
      event.source === 'commit:entity.pos' &&
      event.order > projecting.order &&
      event.order < ownOrder,
  )
  assert(writes.length <= 1, 'restored cycle has duplicate position restoration')
  const write = writes[0]
  if (write) {
    assert(write.order < projection.order, 'restored position missed native projection')
    return { kind: 'position-change', order: write.order }
  }
  assert.deepEqual(capturedPosition, rootPosition, 'restored cycle lacks own position restoration')
  const canonical = projection.world?.script?.entityPos?.[scene]?.[entity]
  assert.deepEqual(
    canonical,
    {
      col: rootPosition[0],
      row: rootPosition[1],
      height: rootPosition[2],
    },
    'unchanged restoration lacks actual canonical position',
  )
  assert(
    staging.length && staging[0].order < projecting.order,
    'unchanged restoration lacks actual factory observation',
  )
  for (const event of staging)
    assert.deepEqual(
      event.state.position,
      rootPosition,
      'unchanged restoration moved during staging',
    )
  return { kind: 'unchanged-factory-position', order: null }
}

/** Actual identity edges only. Currently supports captured command waits and
 * cancelled, uncommitted self steps; committed continuations decline here. */
export function verifyRestoredAutomaticActivations(game, reforge, binding, receipts) {
  const phase = verifyAutomaticCapturePhase(reforge, binding, receipts),
    entity = binding.entity,
    root = objects.eventObjects.find((object) => `e${object.id}` === entity),
    rootPosition = [...canonicalPosition([root.x, root.y]), 0],
    rootFacing = ['down', 'left', 'up', 'right'][root.direction],
    runs = binding.runs.map((proof) =>
      one(
        reforge.causes.filter(
          (event) => event.phase === 'run-started' && event.runId === proof.runId,
        ),
        'restored cycle lost its actual run',
      ),
    ),
    calls = binding.sourceCalls.map((proof) => ({
      before: one(
        game.causes.filter((event) => event.order === proof.from),
        'restored cycle source call missing',
      ),
      after: one(
        game.causes.filter((event) => event.order === proof.to),
        'restored cycle source return missing',
      ),
    })),
    sourceRun = calls[0]?.before.runId,
    results = []
  assert(runs.length > 1 && calls.length, 'restored cycle needs actual return activation')
  for (const [index, { before, after }] of calls.entries()) {
    assert.equal(before.phase, 'auto-before', 'restored source invocation phase differs')
    assert.equal(after.phase, 'auto-step', 'restored source return phase differs')
    assert.equal(before.runId, sourceRun, 'restored source replaced its native cursor owner')
    assert.equal(after.runId, sourceRun, 'restored source return replaced its native cursor owner')
    assert.equal(
      after.autoCallId,
      before.autoCallId,
      'restored source return belongs to another call',
    )
    if (index)
      assert.deepEqual(
        before.before,
        calls[index - 1].after.after,
        'restored source lost its carried phase',
      )
  }
  const usedSlots = new Set(),
    actorEvents = reforge.events.filter(
      (event) => event.kind === 'actor' && event.scene === binding.scene && event.id === entity,
    )
  for (const [index, run] of runs.entries()) {
    if (!index) {
      assert.equal(run.resume, null, 'restored cycle initial run is a continuation')
      continue
    }
    assert(run.resume, 'restored cycle returned without native continuation')
    const projection = one(
        receipts.handoffs.projections.filter(
          (projection) =>
            projection.scene === binding.scene &&
            projection.sceneVisit === run.sceneVisit &&
            projection.endOrder < run.order &&
            projection.poseReceipts.some((pose) => pose.entity === entity),
        ),
        'restored cycle lacks unique completed projection',
      ),
      capture = one(
        reforge.causes.filter(
          (event) =>
            event.phase === 'runtime-captured' && event.snapshotId === projection.snapshotId,
        ),
        'restored cycle lacks actual capture',
      ),
      saved = capture.saved.automatic[entity],
      poseReceipt = one(
        reforge.causes.filter(
          (event) =>
            event.phase === 'runtime-projection-pose' &&
            event.snapshotId === projection.snapshotId &&
            event.entity === entity &&
            event.sceneVisit === run.sceneVisit,
        ),
        'restored cycle lacks own projection pose',
      ),
      oldRun = runs[index - 1]
    assert(
      capture.order > oldRun.order && capture.order < projection.order,
      'restored cycle captured another activation',
    )
    assert(
      phase.captures.some(
        (proof) => proof.order === capture.order && proof.projections.includes(poseReceipt.order),
      ),
      'restored cycle lacks independent cumulative phase proof',
    )
    assert.deepEqual(
      run.resume,
      saved.cursor.resume,
      'restored cycle uses another saved continuation',
    )
    assert.deepEqual(
      run.world.script.behaviors.entities[binding.scene][entity].auto.cursor,
      saved.cursor,
      'restored cycle installed another cursor',
    )
    assert.deepEqual(
      projection.cursors[entity].auto.cursor,
      saved.cursor,
      'restored cycle projected another cursor',
    )
    assert.deepEqual(
      run.poses[entity],
      poseReceipt.poses[entity],
      'restored cycle seed lost its own projected pose',
    )
    const frames = run.resume.frames
    assert(
      frames.length >= 2 &&
        frames.length <= 16 &&
        frames.every(
          (frame, frameIndex) =>
            Number.isSafeInteger(frame.index) &&
            frame.index >= 0 &&
            (frameIndex === frames.length - 1
              ? !Object.hasOwn(frame, 'control')
              : frame.control?.kind === 'loop' && frame.control.phase === 'body'),
        ) &&
        saved.cursor.at.kind === 'stage',
      'restored cycle continuation shape unsupported',
    )
    const path = [saved.cursor.at.stage]
    for (const [index, frame] of frames.entries()) {
      path.push(frame.index)
      if (index < frames.length - 1) path.push('body')
    }
    const sourceActor = actorEvents
        .filter((event) => event.order < capture.order && event.sceneVisit === oldRun.sceneVisit)
        .at(-1),
      sourceCommand = reforge.causes
        .filter(
          (event) =>
            event.phase === 'command' &&
            event.runId === oldRun.runId &&
            event.order < capture.order &&
            event.occurrence?.path,
        )
        .at(-1)
    assert(sourceActor, 'restored cycle lacks source cursor observation')
    assert.deepEqual(
      sourceActor.state.behavior?.auto?.cursor,
      saved.cursor,
      'restored cycle saved cursor differs from its latest source actor observation',
    )
    assert(sourceCommand, 'restored cycle lacks source cursor command')
    assert.deepEqual(
      sourceCommand.occurrence.path,
      path,
      'restored cycle saved cursor is detached from its source occurrence path',
    )
    const firstLeaf = reforge.causes.find(
      (event) =>
        event.phase === 'command' &&
        event.runId === run.runId &&
        event.occurrence?.command?.kind === 'leaf',
    )
    assert(firstLeaf, 'restored cycle lacks actual resumed leaf')
    assert.deepEqual(firstLeaf.occurrence.path, path, 'restored cycle resumed another leaf')
    const ended = one(
      reforge.causes.filter((event) => event.phase === 'run-ended' && event.runId === oldRun.runId),
      'restored cycle old activation lacks unique end',
    )
    assert(
      ended.order > capture.order &&
        ended.order < projection.order &&
        ended.aborted &&
        !ended.resolved,
      'restored cycle old activation did not cancel after capture',
    )
    let pending = null
    if (saved.wait) {
      assert.equal(
        firstLeaf.occurrence.command.command.kind,
        'wait',
        'restored cycle saved wait resumed another effect',
      )
      const consumed = one(
        receipts.handoffs.consumed.filter(
          (receipt) =>
            receipt.runId === run.runId &&
            receipt.origin?.snapshotId === capture.snapshotId &&
            receipt.origin.entity === entity,
        ),
        'restored cycle lacks own saved wait consumption',
      )
      assert.equal(
        consumed.occurrence.id,
        firstLeaf.occurrence.id,
        'restored cycle wait belongs to another leaf',
      )
      assert.deepEqual(consumed.resumed, saved.wait, 'restored cycle changed saved wait')
    } else {
      assert.equal(
        firstLeaf.occurrence.command.command.kind,
        'stepEntity',
        'restored cycle unsaved leaf unsupported',
      )
      const old = one(
          receipts.motion.filter(
            (route) =>
              route.registration.runId === oldRun.runId &&
              route.registration.order < capture.order &&
              route.terminal === 'motion-slot-cancelled' &&
              route.end > capture.order,
          ),
          'restored cycle lacks unique captured pending step',
        ),
        next = one(
          receipts.motion.filter(
            (route) =>
              route.registration.runId === run.runId &&
              route.registration.occurrence.id === firstLeaf.occurrence.id,
          ),
          'restored cycle retry lacks unique new slot',
        )
      assert.equal(
        old.commits.length,
        0,
        'restored cycle committed continuation needs separate proof',
      )
      assert.equal(old.noOps.length, 0, 'restored cycle captured a no-op')
      assert(
        old.end < projection.order && old.slotId !== next.slotId && !usedSlots.has(old.slotId),
        'restored cycle reused a pending step',
      )
      assert.deepEqual(
        old.registration.occurrence.path,
        path,
        'restored cycle pending step has another path',
      )
      assert.deepEqual(
        old.registration.occurrence.command,
        firstLeaf.occurrence.command,
        'restored cycle retried another command',
      )
      assert.deepEqual(
        old.registration.poses[entity].state.behavior.auto.cursor,
        saved.cursor,
        'restored cycle pending slot belongs to another cursor',
      )
      assert.deepEqual(
        next.registration.poses[entity].state.position,
        capture.poses[entity].state.position,
        'restored cycle retry advances the uncommitted position',
      )
      assert(next.commits.length <= 1 && !next.noOps.length, 'restored cycle retry commits twice')
      for (const route of [old, next]) {
        assert.equal(
          route.registration.slot.source,
          'auto',
          'restored cycle slot has another channel',
        )
        assert.equal(
          route.registration.slot.activationOwnerId,
          entity,
          'restored cycle slot has another owner',
        )
      }
      usedSlots.add(old.slotId)
      pending = { oldSlot: old.slotId, newSlot: next.slotId, command: firstLeaf.order }
    }
    const staging = actorEvents.filter(
        (event) => event.sceneVisit === run.sceneVisit && event.order < run.order,
      ),
      scene = one(
        reforge.events.filter(
          (event) =>
            event.kind === 'scene' &&
            event.scene === binding.scene &&
            event.sceneVisit === run.sceneVisit,
        ),
        'restored cycle lacks actual scene entry',
      ),
      projecting = one(
        reforge.events.filter(
          (event) =>
            event.kind === 'scene-lifecycle' &&
            event.phase === 'projecting' &&
            event.scene === binding.scene &&
            event.sceneVisit === run.sceneVisit,
        ),
        'restored cycle lacks native projecting boundary',
      ),
      ownOrder = poseReceipt.poses[entity].commitOrder,
      positionRestoration = verifyRestoredPosition(staging, {
        entity,
        scene: binding.scene,
        rootPosition,
        capturedPosition: capture.poses[entity].state.position,
        projecting,
        projection,
        ownOrder,
      })
    assert(
      scene.order < staging[0].order &&
        projecting.order < projection.order &&
        (positionRestoration.order === null || projecting.order < positionRestoration.order) &&
        projecting.order < ownOrder &&
        ownOrder < poseReceipt.order &&
        poseReceipt.order < projection.endOrder,
      'restored cycle native projection order differs',
    )
    for (const draw of reforge.causes.filter(
      (event) =>
        event.phase === 'presentation-draw' &&
        event.scene === binding.scene &&
        event.sceneVisit === run.sceneVisit &&
        event.order >= projection.endOrder &&
        event.order < run.order,
    ))
      assert.deepEqual(
        draw.poses[entity],
        poseReceipt.poses[entity],
        'restored cycle mutated its projected pose before auto start',
      )
    for (const observed of staging) {
      const restoredPosition =
          positionRestoration.order !== null && observed.order >= positionRestoration.order,
        restoredPose = observed.order >= ownOrder
      assert.deepEqual(
        observed.state.position,
        restoredPosition ? capture.poses[entity].state.position : rootPosition,
        'restored cycle staging loses causal position',
      )
      assert.equal(
        observed.state.facing,
        restoredPose ? capture.poses[entity].state.facing : rootFacing,
        'restored cycle staging loses causal facing',
      )
      if (!restoredPose)
        for (const field of ['override', 'gait', 'explicit', 'action'])
          assert.equal(
            observed.state.frameDebug[field],
            null,
            'restored cycle factory has an unexplained frame input',
          )
      else
        assert.deepEqual(
          observed.state.frameDebug,
          poseReceipt.poses[entity].state.frameDebug,
          'restored cycle staging changes its projected motion',
        )
    }
    results.push({
      runId: run.runId,
      sceneVisit: run.sceneVisit,
      snapshotId: capture.snapshotId,
      capture: capture.order,
      projection: poseReceipt.order,
      pending,
      staging: staging.map((event) => event.order),
      positionRestoration,
    })
  }
  return { scene: binding.scene, entity, phase, restorations: results }
}
