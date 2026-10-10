import assert from 'node:assert/strict'

/** A finite identity graph, not a duration tolerance. Source wait -> capture -> store/load ->
 * cursor-filtered projection -> one-shot consumption -> actual timer registration. */
export function verifyRuntimeHandoffs(trace) {
  const snapshots = new Map(),
    current = new Map(),
    projected = new Map(),
    restored = new Map()
  const remainingReads = new Map(),
    waits = new Map(),
    completedProjections = [],
    consumed = [],
    captures = []
  const consumedTimers = new Set(),
    consumedImmediate = new Set()
  let pendingSave = null,
    assembled = null
  const key = (snapshotId, entity) => `${snapshotId}/${entity}`
  const equal = (actual, expected, message) => assert.deepEqual(actual, expected, message)
  const snapshot = (event) => {
    assert(snapshots.has(event.snapshotId), 'runtime snapshot origin missing')
    return snapshots.get(event.snapshotId)
  }
  for (const event of trace.causes ?? []) {
    if (event.engine !== 'reforge') continue
    if (event.phase === 'wait-start') {
      assert(!waits.has(event.waitId), 'runtime timer identity repeated')
      equal(event.deadline, event.now + event.ms, 'runtime timer deadline differs')
      waits.set(event.waitId, { ...event, settled: false, pausedRemaining: null })
    }
    if (['wait-pause', 'wait-resume', 'wait-end', 'wait-remaining'].includes(event.phase)) {
      const timer = waits.get(event.waitId)
      assert(timer, 'runtime timer source missing')
      if (event.phase === 'wait-pause') {
        equal(
          event.remainingMs,
          Math.max(0, timer.deadline - event.now),
          'runtime pause lost remaining time',
        )
        timer.pausedRemaining = event.remainingMs
      } else if (event.phase === 'wait-resume') {
        assert(timer.pausedRemaining !== null, 'runtime wait resumed without pause')
        equal(
          event.deadline,
          event.now + timer.pausedRemaining,
          'runtime resume lost remaining time',
        )
        timer.deadline = event.deadline
        timer.pausedRemaining = null
      } else if (event.phase === 'wait-end') timer.settled = true
      else {
        equal(event.deadline, timer.deadline, 'runtime remaining read uses wrong deadline')
        equal(
          event.pausedRemaining,
          timer.pausedRemaining,
          'runtime remaining read uses wrong pause',
        )
        equal(event.settled, timer.settled, 'runtime remaining read uses wrong settled state')
        equal(
          event.remainingMs,
          timer.settled ? 0 : (timer.pausedRemaining ?? Math.max(0, timer.deadline - event.now)),
          'runtime remaining read is not exact',
        )
        remainingReads.set(event.waitId, event)
      }
    }
    if (event.phase === 'runtime-captured') {
      assert(!snapshots.has(event.snapshotId), 'runtime capture identity reused')
      equal(event.source, 'captureSceneRuntime', 'runtime capture source differs')
      assert(Array.isArray(event.live), 'runtime capture lacks actual live entities')
      equal(
        Object.keys(event.saved.entities).sort(),
        event.live.map((e) => e.id).sort(),
        'runtime capture lost an entity',
      )
      for (const live of event.live) {
        equal(
          event.positions[live.id],
          live.pos,
          'runtime captured position differs from live entity',
        )
        equal(
          event.saved.entities[live.id].facing ?? null,
          live.facing,
          'runtime captured facing differs',
        )
        equal(
          event.saved.entities[live.id].fixedFrame ?? null,
          live.fixedFrame,
          'runtime captured frame differs',
        )
      }
      for (const [entity, automatic] of Object.entries(event.saved.automatic)) {
        equal(
          automatic.cursor,
          event.cursors[entity]?.auto?.cursor,
          'runtime captured cursor differs',
        )
        const witness = event.waits[entity]
        assert(witness, 'runtime captured wait provenance missing')
        equal(automatic.wait ?? null, witness.value, 'runtime captured wait value differs')
        if (automatic.wait) {
          assert(witness.origin, 'runtime captured wait origin missing')
          if (witness.origin.kind === 'timer') {
            const read = remainingReads.get(witness.origin.waitId)
            assert(read, 'runtime capture lacks actual remaining read')
            for (const field of ['remainingMs', 'now', 'deadline', 'pausedRemaining', 'settled'])
              equal(witness.origin.remaining[field], read[field], `runtime capture stale ${field}`)
            equal(
              automatic.wait.remainingMs,
              read.remainingMs,
              'runtime capture changed remaining time',
            )
            const registration = consumed.find((e) => e.waitId === read.waitId)
            assert(registration, 'captured automatic timer lacks actual consumer')
            equal(automatic.wait.kind, registration.kind, 'runtime capture changed wait kind')
            equal(
              automatic.wait.durationMs,
              registration.durationMs,
              'runtime capture changed original duration',
            )
          } else if (witness.origin.kind === 'restored') {
            const prior = restored.get(key(witness.origin.snapshotId, witness.origin.entity))
            assert(prior && !prior.consumed, 'runtime recapture lacks unconsumed restored wait')
            equal(automatic.wait, prior.value, 'runtime recapture changed restored wait')
          } else {
            equal(witness.origin.kind, 'immediate', 'unknown runtime capture origin')
            const immediate = consumed.find((e) => e.immediateId === witness.origin.immediateId)
            assert(
              immediate && immediate.remainingMs === 0,
              'runtime immediate capture lacks consumption',
            )
            equal(
              automatic.wait,
              { kind: immediate.kind, durationMs: immediate.durationMs, remainingMs: 0 },
              'runtime immediate capture changed wait',
            )
          }
        }
      }
      snapshots.set(event.snapshotId, event)
      captures.push(event)
    }
    if (event.phase === 'runtime-loaded') {
      assert(!snapshots.has(event.snapshotId), 'loaded runtime identity reused')
      equal(event.saved, event.input, 'loaded runtime snapshot differs from input')
      assert(
        (trace.restoreCommits ?? []).some(
          (restore) =>
            Number.isSafeInteger(event.loadId) &&
            restore.loadId === event.loadId &&
            JSON.stringify(restore.inputPayload?.sceneRuntime?.[event.scene]) ===
              JSON.stringify(event.saved),
        ),
        'loaded runtime snapshot lacks independently recorded restore payload',
      )
      snapshots.set(event.snapshotId, event)
      current.set(event.scene, event.snapshotId)
    }
    if (event.phase === 'runtime-stored') {
      const origin = snapshot(event)
      equal(event.saved, origin.saved, 'stored runtime snapshot changed')
      equal(event.scene, origin.scene, 'stored runtime snapshot changed scene')
      assert(['save', 'cache'].includes(event.destination), 'unknown runtime destination')
      if (event.destination === 'cache') current.set(event.scene, event.snapshotId)
      else {
        assert(!pendingSave, 'runtime save assembly missing')
        pendingSave = origin
      }
    }
    if (event.phase === 'runtime-save-assembled') {
      assert(pendingSave && !assembled, 'runtime assembly lacks unique current capture')
      const expected = Object.fromEntries(
        [...current].map(([scene, id]) => [scene, snapshots.get(id).saved]),
      )
      expected[pendingSave.scene] = pendingSave.saved
      equal(event.activeScene, pendingSave.scene, 'runtime save active scene differs')
      equal(event.scenes, expected, 'runtime save assembly differs from stored snapshots')
      assembled = event
    }
    if (event.phase === 'runtime-save-payload') {
      assert(assembled, 'runtime payload lacks save assembly')
      equal(event.scenes, assembled.scenes, 'runtime payload uses different assembly')
      equal(event.output, assembled.scenes, 'runtime payload changed assembled snapshots')
      assembled = null
      pendingSave = null
    }
    if (event.phase === 'runtime-projection-start') {
      if (event.snapshotId === null) {
        assert(!current.has(event.scene), 'stored runtime snapshot ignored')
        continue
      }
      equal(event.snapshotId, current.get(event.scene), 'runtime projected stale snapshot')
      const origin = snapshot(event)
      equal(origin.scene, event.scene, 'runtime projected wrong scene')
      assert(!projected.get(event.scene)?.pending, 'runtime projection missing its end')
      projected.set(event.scene, {
        ...event,
        saved: origin.saved,
        pending: true,
        poses: [],
        waits: [],
      })
    }
    if (event.phase === 'runtime-projection-pose') {
      const projection = projected.get(event.scene)
      assert(projection, 'runtime pose lacks projection start')
      equal(event.sceneVisit, projection.sceneVisit, 'runtime pose uses another scene visit')
      equal(event.snapshotId, projection.snapshotId, 'runtime pose uses wrong snapshot')
      const pose = projection.saved.entities[event.entity]
      assert(pose, 'runtime pose not present in stored snapshot')
      assert(!projection.poses.includes(event.entity), 'runtime projected entity twice')
      projection.poses.push(event.entity)
      projection.poseReceipts ??= []
      projection.poseReceipts.push({ entity: event.entity, order: event.order })
      if (pose.facing !== undefined) equal(event.facing, pose.facing, 'runtime facing not restored')
      equal(event.fixedFrame, pose.fixedFrame ?? null, 'runtime fixed frame not restored')
      const matches = (id) =>
        JSON.stringify(projection.saved.automatic[id]?.cursor) ===
        JSON.stringify(projection.cursors[id]?.auto?.cursor)
      const motion = structuredClone(pose.motion)
      if (motion.gait?.owner && !matches(motion.gait.owner)) delete motion.gait
      if (motion.move && !matches(motion.move.owner)) {
        delete motion.move
        delete motion.gait
      }
      equal(event.motion, motion, 'runtime owned motion projection differs')
      equal(event.actualMotion, motion, 'runtime motion restore did not apply its input')
    }
    if (event.phase === 'runtime-wait-restored') {
      const origin = snapshot(event),
        projection = projected.get(origin.scene)
      assert(projection, 'restored wait lacks projection')
      equal(event.snapshotId, projection.snapshotId, 'restored wait uses stale snapshot')
      const automatic = origin.saved.automatic[event.entity]
      assert(automatic?.wait, 'restored wait not stored')
      equal(
        automatic.cursor,
        projection.cursors[event.entity]?.auto?.cursor,
        'restored wait owner cursor mismatched',
      )
      equal(event.value, automatic.wait, 'restored wait changed value')
      const id = key(event.snapshotId, event.entity)
      assert(!restored.has(id), 'same snapshot wait restored twice')
      restored.set(id, { ...event, consumed: false })
      projection.waits.push(event.entity)
    }
    if (event.phase === 'runtime-projection-end' && event.snapshotId !== null) {
      const projection = projected.get(event.scene)
      assert(projection?.pending, 'runtime projection end without start')
      equal(event.sceneVisit, projection.sceneVisit, 'runtime projection ended in another visit')
      equal(event.snapshotId, projection.snapshotId, 'runtime projection ended with wrong snapshot')
      equal(
        projection.poses.sort(),
        event.entities.filter((id) => projection.saved.entities[id]).sort(),
        'runtime projection lost entity effects',
      )
      const expected = Object.fromEntries(
        Object.entries(projection.saved.automatic)
          .filter(
            ([id, automatic]) =>
              automatic.wait &&
              JSON.stringify(automatic.cursor) ===
                JSON.stringify(projection.cursors[id]?.auto?.cursor),
          )
          .map(([id, automatic]) => [id, automatic.wait]),
      )
      equal(
        projection.waits.sort(),
        Object.keys(expected).sort(),
        'runtime projection lost wait edges',
      )
      equal(event.waits, expected, 'runtime projected wait map differs')
      projection.pending = false
      projection.endOrder = event.order
      completedProjections.push(structuredClone(projection))
    }
    if (event.phase === 'runtime-wait-consumed') {
      let expected = event.durationMs
      if (event.origin) {
        const prior = restored.get(key(event.origin.snapshotId, event.origin.entity))
        assert(prior && !prior.consumed, 'runtime wait missing or consumed twice')
        const origin = snapshot({ snapshotId: event.origin.snapshotId })
        equal(event.scene, origin.scene, 'runtime wait consumed in wrong scene')
        equal(event.entity, event.origin.entity, 'runtime wait consumed by wrong entity')
        equal(event.resumed, prior.value, 'runtime consumption changed restored value')
        equal(event.kind, prior.value.kind, 'runtime consumption changed kind')
        equal(event.durationMs, prior.value.durationMs, 'runtime consumption changed duration')
        expected = prior.value.remainingMs
        prior.consumed = true
      } else equal(event.resumed, null, 'runtime resumed value lacks origin')
      equal(event.remainingMs, expected, 'runtime consumed wrong remaining time')
      if (expected === 0) {
        equal(event.waitId, null, 'zero runtime remainder must not start a timer')
        assert(Number.isSafeInteger(event.immediateId), 'zero runtime remainder lacks identity')
        assert(!consumedImmediate.has(event.immediateId), 'immediate wait consumed twice')
        consumedImmediate.add(event.immediateId)
      } else {
        const timer = waits.get(event.waitId)
        assert(timer && !timer.settled, 'runtime consumption lacks live actual timer')
        equal(timer.ms, expected, 'runtime scheduled wrong remaining time')
        equal(timer.runId, event.runId, 'runtime timer belongs to another invocation')
        assert(!consumedTimers.has(event.waitId), 'runtime timer consumed twice')
        consumedTimers.add(event.waitId)
      }
      consumed.push(event)
    }
  }
  assert(!pendingSave && !assembled, 'runtime save assembly/payload evidence incomplete')
  assert(
    [...projected.values()].every((e) => !e.pending),
    'runtime projection evidence incomplete',
  )
  return {
    snapshots: [...snapshots.values()],
    projections: completedProjections,
    consumed,
    captures,
  }
}

/** A completed proof belongs to one actual visit and its individual restore write. */
export function assertRestoredPoseHandoff(event, handoffs) {
  const matches = handoffs.projections.filter(
    (projection) =>
      projection.snapshotId === event.snapshotId &&
      projection.scene === event.scene &&
      projection.sceneVisit === event.sceneVisit &&
      projection.order < event.order &&
      event.order < projection.endOrder &&
      projection.poseReceipts?.some(
        (pose) => pose.entity === event.entity && pose.order === event.order,
      ),
  )
  assert.equal(matches.length, 1, 'restored pose lacks unique verified handoff')
}
