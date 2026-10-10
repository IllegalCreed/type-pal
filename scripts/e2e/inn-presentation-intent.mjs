import assert from 'node:assert/strict'
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }
import { archivedGameNpcFrame, gameNpcDrawEligible } from './game-pose-semantics.mjs'
import { initialPresentationGait } from './initial-presentation-source.mjs'

const leaf = (event) => event.occurrence?.command?.command
const actors = ['e54', 'e55', 'e56', 'e59', 'e60', 'e61', 'e73', 'e74']
const base = { down: 0, left: 3, up: 6, right: 9 }
export const innDepartureTargets = [
  [121, 45],
  [121, 49],
  [122, 49],
  [131, 52],
  [137, 52],
  [137, 66],
]
const facingTo = (from, to) => {
  const dx = 16 * (to[0] - from[0] - (to[1] - from[1]))
  const dy = 8 * (to[0] - from[0] + (to[1] - from[1]))
  return dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
}

/** No ready command may add an un-authored presentation beat between its neighbours. */
export function verifyInnReadyContinuations(trace, moves) {
  const commands = trace.causes.filter(
    (event) =>
      event.scene === 's003' &&
      event.phase === 'command' &&
      ['e56', 'e59', 'e60', 'e61'].includes(event.occurrence?.self?.entity),
  )
  const results = []
  for (const command of commands) {
    const next = commands.find(
      (event) => event.runId === command.runId && event.order > command.order,
    )
    if (!next) continue
    const kind = leaf(command)?.kind
    if (['wait', 'dialog'].includes(kind)) continue // Their real settlement/consumption is checked separately.
    const id = command.occurrence.self.entity
    const commits =
      kind === 'moveEntity'
        ? moves(trace, id, 's003').filter(
            (event) => event.order > command.order && event.order < next.order,
          )
        : []
    if (kind === 'moveEntity' && !commits.length) continue // No-op first eligible batch is checked by cadence.
    const ready = commits.at(-1) ?? command
    const draw = trace.worldRenders.find((event) => event.order > ready.order)
    if (
      kind === 'moveEntity' &&
      commits.length &&
      draw &&
      draw.order < next.order &&
      leaf(next)?.kind === 'wait'
    ) {
      results.push({
        command: command.order,
        ready: ready.order,
        next: next.order,
        draw: draw.order,
        reason: 'motion-complete-before-next-wait',
      })
      continue
    }
    assert(draw && next.order < draw.order, `${id}: ready ${kind} continuation missed first draw`)
    results.push({ command: command.order, ready: ready.order, next: next.order, draw: draw.order })
  }
  return results
}

/** Replay only authored pose effects and already independently checked motion commits.
 * Every actual draw, including stationary waits and hidden tails, must match. Raw evidence is untouched.
 */
export function verifyInnPresentation(trace, renders, moves, motion) {
  assert.deepEqual(
    sprites.find((sprite) => sprite.id === 'sprite-54')?.poses?.open?.steps,
    [{ frame: 1, durationMs: 100 }],
    'door open pose changed; re-evaluate presentation intent',
  )
  const commands = trace.causes.filter(
    (event) => event.scene === 's003' && event.phase === 'command',
  )
  const draws = trace.worldRenders.filter(
    (event) =>
      event.scene === 's003' &&
      event.order > trace.renderScope.afterOrder &&
      event.order <= trace.renderScope.throughOrder,
  )
  const results = []
  const standingOverlays = []
  for (const id of actors) {
    const poses = renders(trace, id, 's003')
    assert.equal(poses.length, draws.length, `${id}: incomplete full-scene draw coverage`)
    const initial = poses[0]
    assert(initial, `${id}: initial draw absent`)
    const expected = {
      position: initial.position,
      facing: initial.facing,
      frame: initial.frame,
      visible: initial.visible,
    }
    let heldFrame = null,
      gait = initialPresentationGait(trace, id, 's003', draws[0])
    const changes = commands
      .filter((event) => leaf(event)?.target?.scene === 's003' && leaf(event).target.entity === id)
      .map((event) => ({ ...event, kind: 'command' }))
    for (const route of motion.filter((event) => event.actor === id)) {
      const commits = moves(trace, id, 's003').filter(
        (event) => event.order > route.command && event.order < route.continuation,
      )
      for (const [index, commit] of commits.entries()) {
        const facing = facingTo(commit.from, route.to)
        changes.push({
          order: commit.order,
          kind: 'move',
          position: commit.to,
          facing,
          frame: base[facing] + (index === commits.length - 1 ? 0 : [1, 0, 2, 0][index % 4]),
        })
      }
    }
    changes.sort((a, b) => a.order - b.order)
    let cursor = 0
    for (const [index, draw] of draws.entries()) {
      const pose = poses[index]
      assert.equal(pose.renderId, draw.renderId, `${id}: missing/duplicate actor draw`)
      assert.equal(pose.sceneVisit, draw.sceneVisit, `${id}: draw from another visit`)
      while (cursor < changes.length && changes[cursor].order < draw.order) {
        const event = changes[cursor++]
        if (event.kind === 'move') {
          assert.equal(heldFrame, null, `${id}: displacement during explicit take`)
          Object.assign(expected, {
            position: event.position,
            facing: event.facing,
            frame: event.frame,
          })
          gait = true
          continue
        }
        const command = leaf(event)
        switch (command.kind) {
          case 'setEntityFacing':
            expected.frame += base[command.facing] - base[expected.facing]
            expected.facing = command.facing
            break
          case 'faceEntityToParty': {
            const from = event.poses[id].state.position.slice(0, 2)
            const to = event.poses.party.state.position.slice(0, 2)
            const dx = 16 * (to[0] - from[0] - (to[1] - from[1]))
            const dy = 8 * (to[0] - from[0] + (to[1] - from[1]))
            const facing =
              dx === 0 && dy === 0
                ? expected.facing
                : dx > 0
                  ? dy > 0
                    ? 'right'
                    : 'up'
                  : dy > 0
                    ? 'down'
                    : 'left'
            expected.frame += base[facing] - base[expected.facing]
            expected.facing = facing
            break
          }
          case 'setEntityFrame':
            expected.frame = base[expected.facing] + command.frame
            gait = false
            break
          case 'setEntityState':
            expected.visible = command.state > 0
            break
          case 'takeEntity':
            assert.equal(heldFrame, null, `${id}: duplicate take`)
            heldFrame = expected.frame
            if (gait) expected.frame = base[expected.facing]
            break
          case 'releaseEntity':
            assert.notEqual(heldFrame, null, `${id}: release without take`)
            if (gait) expected.frame = heldFrame
            heldFrame = null
            break
          case 'selectEntityPage':
            assert(
              ['e73', 'e74'].includes(id) &&
                command.selection.kind === 'use' &&
                command.selection.value === 'open',
              'unclassified page animation',
            )
            expected.frame = 1 // sprite-54 open action is one explicit frame, not a looping gait.
            gait = false
            break
        }
      }
      assert.deepEqual(pose.position, expected.position, `${id}: unexplained drawn displacement`)
      assert.equal(pose.facing, expected.facing, `${id}: unexplained drawn facing`)
      assert.equal(pose.visible, expected.visible, `${id}: unexplained drawn visibility`)
      assert.equal(
        pose.frame,
        expected.visible ? expected.frame : null,
        `${id}: unexplained actual pose at render ${pose.renderId}`,
      )
      assert.equal(
        pose.frameSource,
        expected.visible ? 'drawn' : 'none',
        `${id}: missing actual draw source`,
      )
      assert.equal(
        pose.drawStatus,
        expected.visible ? 'drawn' : 'not-drawn',
        `${id}: actual draw status differs`,
      )
      if (expected.visible) {
        const rect = pose.geometry?.worldRect
        assert(
          Array.isArray(rect) &&
            rect.length === 4 &&
            rect.every(Number.isFinite) &&
            rect[2] > 0 &&
            rect[3] > 0,
          `${id}: actual draw lacks valid sprite bounds`,
        )
        const [col, row] = expected.position
        assert.equal(
          rect[0],
          16 * (col - row) - Math.floor(rect[2] / 2),
          `${id}: sprite x detached from actor`,
        )
        assert.equal(rect[1], 8 * (col + row) + 7 - rect[3], `${id}: sprite y detached from actor`)
      }
      if (heldFrame !== null && gait && heldFrame !== expected.frame)
        standingOverlays.push({
          id,
          order: pose.order,
          renderId: pose.renderId,
          position: pose.position,
          facing: pose.facing,
          frame: pose.frame,
          suspendedFrame: heldFrame,
        })
    }
    assert.equal(heldFrame, null, `${id}: authority never released`)
    results.push({ id, draws: poses.length, first: poses[0].order, last: poses.at(-1).order })
  }
  return { actors: results, standingOverlays }
}

/** Original script data + Game's actual pixel walk, independently of RF's normalized route. */
export function verifyInnSourceDeparture(trace, moves, states, position) {
  const source = original.segments[0].commands
  const expected = []
  let point = [1264, 1352],
    frame = 0
  for (const [leg, target] of innDepartureTargets.entries()) {
    const ip = [374, 375, 376, 377, 381, 382][leg]
    if (leg === 3) {
      assert.deepEqual(source[379], { op: 'end', reset: true, resetTo: 377, idleFrames: 12 })
      for (let i = 0; i < 24; i++) {
        const nudgeIp = 377 + (i % 2),
          step = i % 2 ? 3 : 5
        assert.equal(source[nudgeIp].opcode, 108)
        assert.deepEqual(source[nudgeIp].operands, [65535, step, step])
        const from = point
        point = [point[0] + step, point[1] + step]
        frame = (frame + 1) % 4
        expected.push({
          ip: nudgeIp,
          from,
          to: point,
          frame,
          facing: 'right',
          source: 'commit:applyRawOpcode',
        })
      }
    } else {
      const cmd = source[ip]
      assert.equal(cmd.opcode, 16)
      const [x, y, h] = cmd.operands
      const end = [x * 32 + h * 16, y * 16 + h * 8]
      assert.deepEqual(position(end), target, 'original departure waypoint differs')
      while (point[0] !== end[0] || point[1] !== end[1]) {
        const from = point,
          dx = end[0] - from[0],
          dy = end[1] - from[1]
        const facing = dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
        const snap = Math.abs(dx) < 6 || Math.abs(dy) < 6
        point = snap ? end : [from[0] + (dx < 0 ? -6 : 6), from[1] + (dy < 0 ? -3 : 3)]
        frame = point[0] === end[0] && point[1] === end[1] ? 0 : (frame + 1) % 4
        expected.push({ ip, from, to: point, frame, facing, source: 'commit:npcWalkTo' })
      }
    }
    assert.deepEqual(position(point), target, 'source departure leg missed exact endpoint')
  }
  const actual = moves(trace, 'e56', 's003')
  const snapshots = states(trace, 'e56', 's003')
  assert.equal(actual.length, expected.length, 'source departure has missing/extra movement')
  for (const [index, event] of actual.entries()) {
    const state = snapshots.find((value) => value.order === event.order)
    const want = expected[index]
    assert(state, 'source movement has no actor state')
    assert.deepEqual(
      {
        ip: state.state.autoIp,
        from: state.before.position,
        to: state.state.position,
        frame: state.state.frame,
        facing: state.state.facing,
        source: state.source,
      },
      want,
      `source departure step ${index}: wrong route/stride`,
    )
  }
  const activation = snapshots.find((event) => event.state.autoIp === 373)
  assert(activation, 'source departure activation missing')
  let preceding = { position: [1264, 1352], frame: 0, facing: 'right' }
  const poseOf = (state) => ({ position: state.position, frame: state.frame, facing: state.facing })
  for (const event of snapshots.filter((value) => value.order >= activation.order)) {
    assert.deepEqual(poseOf(event.before), preceding, 'source departure lost preceding pose')
    const index = actual.findIndex((value) => value.order === event.order)
    if (index !== -1) {
      const step = expected[index]
      preceding = { position: step.to, frame: step.frame, facing: step.facing }
    }
    // L373–385 contains no separate turn/frame write: cursor/trigger changes cannot reset a held stride.
    assert.deepEqual(
      poseOf(event.state),
      preceding,
      'source departure contains an unauthored pose reset',
    )
  }
  return {
    targets: innDepartureTargets,
    steps: actual.length,
    first: actual[0].order,
    last: actual.at(-1).order,
    sourceIPs: [374, 375, 376, 377, 378, 379, 381, 382],
  }
}

/** Bind every reference draw to the latest committed logical pose, including waiting frames.
 * Game uses a four-phase local gait and a +4px cull anchor; neither is RF's display frame convention.
 */
export function verifyInnGamePresentation(trace, renders, states, position, options = {}) {
  const scene = options.scene ?? 's003'
  const result = []
  const draws = trace.worldRenders.filter(
    (event) =>
      event.scene === scene &&
      event.order > trace.renderScope.afterOrder &&
      event.order <= trace.renderScope.throughOrder,
  )
  for (const id of options.actors ?? actors) {
    const poses = renders(trace, id, scene)
    const commits = states(trace, id, scene)
    assert.equal(poses.length, draws.length, `${id}: Game actor draw coverage incomplete`)
    let cursor = -1
    let culled = 0
    for (const [index, pose] of poses.entries()) {
      const draw = draws[index]
      assert.equal(pose.renderId, draw.renderId, `${id}: Game draw identity differs`)
      assert.equal(pose.sceneVisit, draw.sceneVisit, `${id}: Game draw visit differs`)
      while (cursor + 1 < commits.length && commits[cursor + 1].order < pose.order) cursor++
      const commit = commits[cursor]
      assert(
        commit && commit.sceneVisit === pose.sceneVisit,
        `${id}: Game pose lacks same-visit commit`,
      )
      const state = commit.state
      assert.deepEqual(
        pose.position,
        position(state.position),
        `${id}: Game drawn position differs`,
      )
      assert.equal(pose.facing, state.facing, `${id}: Game drawn facing differs`)
      assert.equal(pose.visible, state.visible, `${id}: Game drawn visibility differs`)
      if (!state.visible || state.sprite === 0 || state.sprite === null) {
        assert.equal(pose.frame, null, `${id}: hidden Game actor was drawn`)
        assert.equal(pose.frameSource, 'none', `${id}: hidden Game actor has draw source`)
        assert.equal(pose.drawStatus, 'not-drawn', `${id}: hidden Game actor has draw status`)
        continue
      }
      const drawn = gameNpcDrawEligible(state.position, pose.geometry, draw.view)
      const frame = archivedGameNpcFrame(id, state)
      assert.equal(
        pose.frame,
        drawn ? frame : null,
        `${id}: Game unexplained actual frame at render ${pose.renderId}`,
      )
      assert.equal(
        pose.frameSource,
        drawn ? 'drawn' : 'none',
        `${id}: Game actual draw source differs`,
      )
      assert.equal(
        pose.drawStatus,
        drawn ? 'drawn' : 'not-drawn',
        `${id}: Game draw status differs`,
      )
      if (!drawn) culled++
    }
    result.push({
      id,
      scene,
      draws: poses.length,
      culled,
      first: poses[0]?.order ?? null,
      last: poses.at(-1)?.order ?? null,
      drawBindings: draws.map((draw, index) => ({
        order: draw.order,
        renderId: draw.renderId,
        sceneVisit: draw.sceneVisit,
        actorOrder: poses[index].order,
      })),
    })
  }
  return result
}

/** Attribute the entire presentation interval; an instantaneous command never buys a waiting frame. */
export function verifyInnHoldSchedule(trace, timing) {
  const commands = trace.causes.filter(
    (event) =>
      event.scene === 's003' &&
      event.phase === 'command' &&
      ['e56', 'e59', 'e60', 'e61'].includes(event.occurrence?.self?.entity),
  )
  const runs = [...new Set(commands.map((event) => event.runId))].map((runId) =>
    commands.filter((event) => event.runId === runId),
  )
  const draws = trace.worldRenders.filter(
    (event) =>
      event.scene === 's003' &&
      event.order > trace.renderScope.afterOrder &&
      event.order <= trace.renderScope.throughOrder,
  )
  const intervals = []
  for (const draw of draws) {
    const causes = []
    for (const run of runs) {
      const command = run.findLast((event) => event.order < draw.order)
      if (!command) continue
      const next = run[run.indexOf(command) + 1]
      if (!next) {
        const terminal = timing.terminals?.find((e) => e.runId === command.runId)
        assert(terminal && terminal.ended < draw.order, 'hold lacks verified finite script end')
        causes.push({
          runId: command.runId,
          command: command.order,
          reason: 'complete',
          ended: terminal.ended,
        })
        continue
      }
      const kind = leaf(command)?.kind
      let reason = kind
      if (kind === 'wait') {
        const start = trace.causes.find(
          (event) =>
            event.phase === 'wait-start' &&
            event.runId === command.runId &&
            event.occurrence?.id === command.occurrence.id,
        )
        const end = trace.causes.find(
          (event) => event.phase === 'wait-end' && event.waitId === start?.waitId,
        )
        const gate = timing.settledWaitGates?.find(
          (receipt) =>
            receipt.runId === command.runId &&
            receipt.occurrence === command.occurrence.id &&
            receipt.waitId === start?.waitId &&
            receipt.gate < draw.order &&
            draw.order < receipt.ready,
        )
        assert(
          start && end && start.order < draw.order && (draw.order < end.order || gate),
          'hold outside registered wait lifetime',
        )
        if (gate) reason = 'verified-wake-gate'
      } else if (kind === 'dialog') {
        const receipt = timing.dialogues.find((event) => event.command === command.order)
        const opened = trace.causes.find((event) => event.order === receipt?.opened)
        // Only independently checked resource-pending draws precede actual dialogue opening.
        const preparing = opened && receipt.preparation?.draws.includes(draw.order)
        assert(
          receipt && (receipt.opened < draw.order || preparing) && draw.order < receipt.closed,
          'hold outside actual dialogue lifetime',
        )
      } else {
        assert.equal(kind, 'moveEntity', 'unexplained frame after instantaneous command')
        assert(
          timing.motionCadence.some(
            (event) => event.command === command.order && draw.order < event.continuation,
          ),
          'hold outside checked motion lifetime',
        )
      }
      causes.push({ runId: command.runId, command: command.order, reason })
    }
    const key = JSON.stringify(causes)
    const previous = intervals.at(-1)
    if (previous?.key === key && previous.lastRenderId + 1 === draw.renderId) {
      previous.lastRenderId = draw.renderId
      previous.throughOrder = draw.order
      previous.draws++
    } else
      intervals.push({
        key,
        causes: causes.length ? causes : [{ reason: 'before-script-input' }],
        firstRenderId: draw.renderId,
        lastRenderId: draw.renderId,
        fromOrder: draw.order,
        throughOrder: draw.order,
        draws: 1,
      })
  }
  return intervals.map(({ key: _key, ...interval }) => interval)
}
