import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'

const leaf = (event) => event.occurrence?.command?.command
const point = (value) => [value.col, value.row, value.height]
const steps = { down: [0, 0.25], left: [-0.25, 0], up: [0, -0.25], right: [0.25, 0] }
export function authoredMotionStep(from, command) {
  if (command.kind === 'stepEntity') {
    const delta = steps[command.dir]
    assert(delta, 'unclassified step direction')
    return {
      to: [from[0] + delta[0], from[1] + delta[1], from[2]],
      facing: command.dir,
      arrived: false,
    }
  }
  const to = point(command.to),
    speed = { slow: 0.25, normal: 0.375, fast: 0.5, run: 1 }[command.speed]
  assert(speed, 'unclassified authored motion speed')
  const dx = 16 * (to[0] - to[1]) - 16 * (from[0] - from[1])
  const dy = 8 * (to[0] + to[1]) - 8 * (from[0] + from[1])
  const facing = dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
  const distance = Math.hypot(dx, dy),
    maximum = Math.hypot(16, 8) * speed
  return distance <= maximum
    ? { to, facing, arrived: true }
    : {
        to: [
          from[0] + (to[0] - from[0]) * (maximum / distance),
          from[1] + (to[1] - from[1]) * (maximum / distance),
          from[2],
        ],
        facing,
        arrived: false,
      }
}

/** Every admitted slot owes the first available world step and its exact stride.
 * These authored commands bypass collision; a blocked/detoured path is not an excuse.
 * Prefixes ending at a real cancellation or the recording boundary remain prefixes.
 */
export function verifyStoryMotion(trace, slotProof, actors, movementTransitions, handoffs) {
  const events = trace.causes,
    result = [],
    used = new Set(),
    resumedCommands = []
  const until = trace.renderScope?.throughOrder ?? Infinity
  const cadences = events.filter((event) => event.phase === 'cadence')
  const clocks = events.filter((event) => event.phase === 'clock')
  for (const [index, cadence] of cadences.entries()) {
    const clockIndex = clocks.findIndex((event) => event.clock.frameId === cadence.clock?.frameId)
    const previous = clocks[clockIndex - 1]?.clock
    assert(clockIndex >= 0 && !cadence.clock.stepping, 'motion lacks normal frame clock')
    assert.equal(
      cadence.dt,
      previous ? Math.min(Math.max(0, cadence.clock.realNow - previous.realNow), 100) : 0,
      'motion elapsed time differs from actual frame delta',
    )
    if (previous)
      assert.equal(cadence.clock.now, previous.now + cadence.dt, 'motion gameplay time differs')
    if (index && cadence.sceneVisit === cadences[index - 1].sceneVisit)
      assert.deepEqual(cadence.before, cadences[index - 1].after, 'motion cadence continuity lost')
    const total = cadence.before.accumulator + cadence.dt
    const step = !cadence.frozen && total >= cadence.stepMs
    assert.equal(cadence.stepMs, 100, 'world motion interval changed')
    assert.equal(
      cadence.after.tick,
      cadence.before.tick + Number(step),
      'world cadence lost/added a step',
    )
    assert.equal(
      cadence.after.accumulator,
      cadence.frozen
        ? cadence.before.accumulator
        : step
          ? total - 100 > 100
            ? 0
            : total - 100
          : total,
      'world cadence changed accumulator',
    )
  }
  for (const command of events.filter((event) => event.phase === 'command')) {
    const input = leaf(command)
    if (
      !input ||
      !['stepEntity', 'moveEntity', 'ride'].includes(input.kind) ||
      !actors.some(
        (actor) => actor.entity === input.target.entity && actor.scene === input.target.scene,
      ) ||
      (input.kind === 'stepEntity' && command.occurrence.timing !== 'auto')
    )
      continue
    assert.equal(
      input.target.scene,
      command.scene,
      'motion for an inactive scene needs a separate contract',
    )
    const registrations = [...slotProof.slots.values()].filter(
      (slot) =>
        slot.registration.occurrence.id === command.occurrence.id &&
        slot.registration.runId === command.runId,
    )
    const drops = slotProof.dropped.filter(
      (event) => event.occurrence.id === command.occurrence.id && event.runId === command.runId,
    )
    if (!registrations.length && !drops.length && input.kind === 'stepEntity') {
      resumedCommands.push(command)
      continue
    }
    assert.equal(
      registrations.length + drops.length,
      1,
      'authored motion lacks unique actual registration',
    )
  }
  for (const receipt of slotProof.slots.values()) {
    const registration = receipt.registration,
      command = leaf(registration)
    if (
      !actors.some(
        (actor) => actor.entity === registration.entity && actor.scene === registration.scene,
      )
    )
      continue
    const end = receipt.events.find((event) =>
      ['motion-slot-settled', 'motion-slot-cancelled'].includes(event.phase),
    )
    const endOrder = Math.min(end?.order ?? Infinity, until)
    const origin = registration.poses?.[registration.entity]?.state?.position
    assert(origin?.length === 3, 'motion registration has no actual three-axis origin')
    const carrierFacing = registration.poses?.[registration.entity]?.state?.facing
    assert.equal(
      registration.slot.preserveFacing ?? false,
      command.kind === 'ride',
      'motion facing policy differs from its actual authored command',
    )
    if (command.kind === 'ride')
      assert(['down', 'left', 'up', 'right'].includes(carrierFacing), 'ride lacks carrier facing')
    let expected = [...origin],
      rest = registration.slot.slowRestPending ?? false,
      finished = false
    const actual = movementTransitions(trace, registration.entity, registration.scene).filter(
      (event) =>
        event.sceneVisit === registration.sceneVisit &&
        event.order > registration.order &&
        event.order < endOrder,
    )
    const owed = [],
      commits = [],
      restPhases = [],
      noOps = []
    for (const draw of (trace.worldRenders ?? []).filter(
      (draw) =>
        draw.order > registration.order &&
        (draw.order < endOrder || (!end && draw.order === endOrder)) &&
        draw.sceneVisit === registration.sceneVisit,
    )) {
      if (draw.causalFrame?.frameId === registration.clock?.frameId) continue
      assert.equal(
        cadences.filter((cadence) => cadence.clock?.frameId === draw.causalFrame?.frameId).length,
        1,
        'active motion draw lacks unique actual cadence',
      )
    }
    for (const cadence of cadences.filter(
      (event) => event.order > registration.order && event.order < endOrder,
    )) {
      if (
        cadence.sceneVisit !== registration.sceneVisit ||
        cadence.after.tick === cadence.before.tick ||
        finished
      )
        continue
      const authority = cadence.lifecycle?.authority
      assert(authority, 'motion cadence lacks ownership state')
      if (registration.slot.source === 'auto') {
        const own = registration.slot.activationOwnerId
        if (authority[registration.entity] || authority[own]?.kind === 'script') continue
        const activation = cadence.lifecycle.activations.find(
          (value) =>
            value.entity === own &&
            value.epoch === registration.slot.activationEpoch &&
            !value.aborted,
        )
        assert(activation, 'motion cadence lacks its live automatic activation')
        if (
          cadence.poses?.[registration.entity]?.state?.visible === false ||
          cadence.poses?.[own]?.state?.visible === false
        )
          continue
        assert(cadence.entityLifecycles, 'motion lacks lifecycle eligibility inputs')
        if (
          [registration.entity, own].some(
            (id) => cadence.entityLifecycles[cadence.scene]?.[id]?.phase === 'suspended',
          )
        )
          continue
      }
      const noOp = command.kind !== 'stepEntity' && same(expected, point(command.to))
      if (
        !noOp &&
        command.kind !== 'stepEntity' &&
        registration.slot.slowCadence &&
        command.speed === 'slow' &&
        rest
      ) {
        rest = false
        restPhases.push({ order: cadence.order, rest })
        continue
      }
      owed.push(cadence)
      if (noOp) {
        const commit = receipt.events.find((event) => event.phase === 'motion-slot-committed')
        assert(
          commit && commit.tick === cadence.after.tick && commit.order > cadence.order,
          'no-op endpoint lacks eligible actual commit',
        )
        noOps.push({ order: commit.order, tick: commit.tick })
        finished = true
        continue
      }
      const step = authoredMotionStep(expected, command)
      if (command.kind === 'ride') step.facing = carrierFacing
      assert.notDeepEqual(
        step.to.slice(0, 2),
        expected.slice(0, 2),
        'height-only story motion requires three-axis transition evidence',
      )
      const commit = actual[commits.length]
      assert(
        commit && commit.tick === cadence.after.tick,
        `${registration.entity}: missing or late eligible motion step`,
      )
      assert.deepEqual(commit.from, expected.slice(0, 2), 'motion lost exact preceding position')
      assert.deepEqual(commit.to, step.to.slice(0, 2), 'motion differs from exact authored stride')
      assert(commit.order > cadence.order, 'motion commit precedes its eligible world tick')
      const nextCadence = cadences.find((event) => event.order > cadence.order)
      assert(!nextCadence || commit.order < nextCadence.order, 'motion commit missed its frame')
      const key = `${registration.sceneVisit}/${registration.entity}/${commit.order}`
      assert(!used.has(key), 'one motion commit borrowed by two slots')
      used.add(key)
      commits.push({
        ...commit,
        ...step,
        epoch: registration.slot.commandEpoch,
        source: registration.slot.source,
        activationOwner: registration.slot.activationOwnerId ?? null,
      })
      expected = step.to
      rest = registration.slot.slowCadence && command.speed === 'slow'
      restPhases.push({ order: commit.order, rest })
      finished = command.kind === 'stepEntity' || step.arrived
    }
    assert.equal(actual.length, commits.length, 'motion has extra unowed displacement')
    if (end?.phase === 'motion-slot-settled' && end.outcome !== 'droppedByAuthority')
      assert(finished, 'motion acknowledged before exact completion')
    if (end?.outcome === 'droppedByAuthority')
      assert.equal(owed.length, 0, 'dropped step had an earlier eligible attempt')
    result.push({
      actor: registration.entity,
      scene: registration.scene,
      sceneVisit: registration.sceneVisit,
      slotId: registration.slotId,
      command: registration.order,
      end: endOrder,
      commits,
      owed: owed.map((event) => event.order),
      terminal: end?.phase ?? 'recording-prefix',
      target: command.to ?? null,
      restPhases,
      noOps,
      registration,
    })
  }
  result.resumedOneShots = resumedCommands.map((command) =>
    proveResumedOneShot(trace, command, slotProof, result, handoffs, movementTransitions, used),
  )
  return result
}

/** A committed relative step resumes its gate, not its displacement. This consumes a
 * verified capture/project chain and the original independently proved actual stride. */
function proveResumedOneShot(trace, command, slots, routes, handoffs, moves, used) {
  const input = leaf(command),
    events = trace.causes,
    start = events.find((event) => event.phase === 'run-started' && event.runId === command.runId),
    installed =
      start?.world?.script?.behaviors?.entities?.[command.scene]?.[input.target.entity]?.auto
        ?.cursor,
    frames = start?.resume?.frames,
    control = frames?.at(-1)?.control
  assert(
    start &&
      start.sceneVisit === command.sceneVisit &&
      same(start.self, input.target) &&
      start.resume?.digest === start.digest &&
      same(installed?.resume, start.resume) &&
      installed?.at?.stage === start.stage &&
      control?.kind === 'leaf' &&
      control.command === 'stepEntity' &&
      control.phase === 'continuation',
    'relative step lacks installed committed continuation',
  )
  const path = [start.stage]
  for (const [index, frame] of frames.entries()) {
    path.push(frame.index)
    if (index < frames.length - 1) {
      assert(
        ['loop', 'repeat', 'if'].includes(frame.control?.kind),
        'unsupported continuation address',
      )
      path.push(frame.control.kind === 'if' ? frame.control.arm : 'body')
    }
  }
  assert.deepEqual(
    command.occurrence.path,
    path,
    'continuation command uses another canonical path',
  )
  assert.equal(
    events.find((event) => event.runId === start.runId && event.phase === 'command' && leaf(event))
      ?.order,
    command.order,
    'continuation is not the first restored leaf',
  )
  const projections = (handoffs?.projections ?? []).filter(
    (projection) =>
      projection.scene === command.scene &&
      projection.sceneVisit === command.sceneVisit &&
      projection.endOrder < start.order &&
      same(projection.cursors[input.target.entity]?.auto?.cursor, installed) &&
      projection.poseReceipts?.some((pose) => pose.entity === input.target.entity),
  )
  assert.equal(projections.length, 1, 'continuation lacks unique verified projection')
  const projection = projections[0],
    capture = handoffs.snapshots.find((snapshot) => snapshot.snapshotId === projection.snapshotId)
  assert.equal(
    start.author?.sceneSession,
    projection.lifecycle?.sceneSession,
    'continuation uses another projected scene session',
  )
  assert(
    capture?.phase === 'runtime-captured' && capture.order < projection.order,
    'continuation lacks original in-window capture',
  )
  assert.deepEqual(
    capture.cursors[input.target.entity]?.auto?.cursor,
    installed,
    'continuation cursor differs from original capture',
  )
  const originals = [...slots.slots.values()].filter((receipt) => {
    const registration = receipt.registration,
      oldStart = events.find(
        (event) => event.phase === 'run-started' && event.runId === registration.runId,
      )
    return (
      registration.entity === input.target.entity &&
      registration.scene === command.scene &&
      registration.sceneVisit === capture.sceneVisit &&
      registration.order < capture.order &&
      same(registration.occurrence.path, path) &&
      same(leaf(registration), input) &&
      oldStart?.digest === start.digest &&
      ['kind', 'scene', 'entity', 'channel', 'behavior'].every(
        (field) => oldStart?.author?.[field] === start.author?.[field],
      ) &&
      oldStart?.author?.sceneSession === registration.slot.sceneSessionId &&
      capture.lifecycle?.sceneSession === registration.slot.sceneSessionId &&
      same(oldStart?.self, start.self) &&
      receipt.events.some(
        (event) => event.phase === 'motion-slot-committed' && event.order < capture.order,
      ) &&
      receipt.events.some(
        (event) =>
          ['motion-slot-cancelled', 'motion-slot-settled'].includes(event.phase) &&
          event.order > capture.order &&
          event.order < projection.order,
      )
    )
  })
  assert.equal(originals.length, 1, 'continuation lacks unique original committed slot')
  const original = originals[0],
    route = routes.find((route) => route.slotId === original.registration.slotId),
    commits = original.events.filter((event) => event.phase === 'motion-slot-committed')
  assert.equal(commits.length, 1, 'continuation lacks one actual commit')
  assert.equal(
    route?.commits.length,
    1,
    'continuation original stride was not independently proved',
  )
  assert.deepEqual(
    point(capture.positions[input.target.entity]),
    route.commits[0].to,
    'continuation capture differs from committed endpoint',
  )
  const completions = events.filter(
    (event) =>
      event.phase === 'leaf-completed' &&
      event.runId === command.runId &&
      event.occurrence?.id === command.occurrence.id,
  )
  assert.equal(completions.length, 1, 'continuation lacks actual leaf completion')
  const completion = completions[0]
  assert(
    completion.order > command.order && completion.sceneVisit === command.sceneVisit,
    'continuation completed in another visit',
  )
  assert.equal(
    moves(trace, input.target.entity, command.scene).filter(
      (move) =>
        move.sceneVisit === command.sceneVisit &&
        move.order > projection.order &&
        move.order <= completion.order,
    ).length,
    0,
    'continuation repeated relative displacement',
  )
  const key = `resume/${projection.snapshotId}/${original.registration.slotId}`
  assert(!used.has(key), 'original committed step consumed twice')
  used.add(key)
  return {
    runId: command.runId,
    occurrence: command.occurrence.id,
    sceneVisit: command.sceneVisit,
    command: command.order,
    completion: completion.order,
    snapshot: projection.snapshotId,
    projection: projection.order,
    slotId: original.registration.slotId,
    originalRun: original.registration.runId,
    originalOccurrence: original.registration.occurrence.id,
    commit: commits[0].order,
  }
}

/** Party scripted movement has a different queue, but the same exact stride/clock contract. */
export function verifyStoryPartyMotion(trace) {
  const events = trace.causes,
    slots = new Map(),
    result = []
  for (const event of events) {
    if (!event.phase.startsWith('party-motion-')) continue
    if (event.phase === 'party-motion-registered') {
      assert(!slots.has(event.slotId), 'party slot reused')
      assert.equal(leaf(event)?.kind, 'moveParty', 'party slot has wrong author')
      assert.deepEqual(event.to, leaf(event).to, 'party slot changed endpoint')
      assert.equal(event.speed, leaf(event).speed, 'party slot changed speed')
      assert(event.poses?.party?.state?.position?.length === 3, 'party slot lacks actual origin')
      slots.set(event.slotId, {
        registration: event,
        command: event.order,
        from: event.poses.party.state.position,
        commits: [],
        end: Infinity,
        done: false,
      })
      continue
    }
    const slot = slots.get(event.slotId)
    assert(
      slot &&
        slot.end === Infinity &&
        slot.registration.runId === event.runId &&
        slot.registration.occurrence.id === event.occurrence.id,
      'party receipt lacks live matching owner',
    )
    if (event.phase === 'party-motion-step') {
      assert(!slot.done, 'completed party movement stepped again')
      const actualFrom = point(event.from),
        expected = authoredMotionStep(slot.from, { ...leaf(slot.registration), kind: 'moveEntity' })
      assert.deepEqual(actualFrom, slot.from, 'party motion origin differs')
      assert.deepEqual(
        { to: point(event.to), facing: event.facing, arrived: event.done },
        expected,
        'party step differs from authored stride',
      )
      slot.commits.push(event)
      slot.from = expected.to
      slot.done = expected.arrived
    } else {
      assert(
        ['party-motion-settled', 'party-motion-cancelled'].includes(event.phase),
        'unknown party motion outcome',
      )
      if (event.phase === 'party-motion-settled')
        assert(slot.done, 'party motion settled before endpoint')
      slot.end = event.order
    }
  }
  for (const slot of slots.values()) {
    const cadences = events.filter(
      (event) =>
        event.phase === 'cadence' &&
        event.order > slot.command &&
        event.order < slot.end &&
        event.sceneVisit === slot.registration.sceneVisit &&
        event.after.tick > event.before.tick,
    )
    const last = slot.done
      ? slot.commits.at(-1).order
      : Math.min(slot.end, trace.renderScope?.throughOrder ?? Infinity)
    const due = cadences.filter((event) => event.order < last)
    assert.equal(slot.commits.length, due.length, 'party move lost/added eligible step')
    for (const [i, commit] of slot.commits.entries())
      assert.equal(
        commit.clock.frameId,
        due[i].clock.frameId,
        'party step missed first eligible frame',
      )
    result.push(slot)
  }
  return result
}
