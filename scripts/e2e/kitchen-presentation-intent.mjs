import assert from 'node:assert/strict'
import source from '../../data/extracted/events/all.json' with { type: 'json' }
import kitchen from '../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import hall from '../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import { initialPresentationGait } from './initial-presentation-source.mjs'
import { verifyOpeningWaitReceipt } from './opening-hold-intent.mjs'
import { verifyFiniteScriptRuns } from './script-execution-contract.mjs'
import { verifyScriptTerminalReceipt } from './script-terminal-intent.mjs'

const leaf = (e) => e.occurrence?.command?.command
const base = { down: 0, left: 3, up: 6, right: 9 }
const actors = [
  ['e56', 's003'],
  ['e62', 's003'],
  ['e19', 's001'],
]
export const kitchenTargets = [
  [129, 66],
  [129, 61],
  [124, 61],
]
const within = (trace, e) =>
  e.order > trace.renderScope.afterOrder && e.order <= trace.renderScope.throughOrder
const bodyOf = (id, timing) => {
  const scene = id === 'e19' ? kitchen : hall
  const name = {
    e19: 'serve-guests',
    e47: 'default',
    e56: timing === 'auto' ? 'go-to-kitchen' : 'greet-after-guests',
    e62: timing === 'auto' ? 'default' : 'beggar-first-talk',
  }[id]
  const flow = scene.entities.find((e) => e.id === id).behaviors[
    timing === 'auto' ? 'auto' : 'trigger'
  ][name].flow
  return flow.stages.find((stage) => stage.id === flow.initial)
}

export function kitchenTerminalCursor(wait) {
  if (wait.engine !== 'reforge') return undefined
  const stage = bodyOf(wait.occurrence.self.entity, wait.occurrence.timing)
  return typeof stage.next === 'object'
    ? { kind: 'completed' }
    : { kind: 'stage', stage: stage.next ?? stage.id }
}

/** Finite NPC/stair runs must actually finish, regardless of their final command kind. */
function verifyKitchenTerminal(trace, last) {
  const expected = kitchenTerminalCursor(last)
  const kind = leaf(last)?.kind ?? last.occurrence.command.kind
  let ready = last
  if (kind === 'wait') {
    const starts = trace.causes.filter(
      (e) =>
        e.phase === 'wait-start' &&
        e.runId === last.runId &&
        e.occurrence?.id === last.occurrence.id,
    )
    assert.equal(starts.length, 1, '003 final wait lacks unique registration')
    ready = verifyOpeningWaitReceipt(starts[0], trace.causes, trace.worldRenders, expected).end
  } else {
    // These are the actual finite endings in canonical 003; do not treat an unknown async
    // command (notably loadScene) as an instant same-scene completion.
    assert(
      ['finishStep', 'releaseEntity', 'setEntityFrame'].includes(kind),
      '003 unclassified final command',
    )
  }
  return verifyScriptTerminalReceipt(last, trace.causes, trace.worldRenders, {
    cursor: expected,
    decision: 'continue',
    ready,
  })
}

/** Bind executed leaves to canonical author content; do not infer a plan from observed poses. */
export function verifyKitchenBindings(trace) {
  const bindings = verifyFiniteScriptRuns(
    trace.causes,
    [
      ['e19', 'interactive', '厨房李大娘交代送菜'],
      ['e47', 'interactive', '楼梯演出'],
      ['e56', 'interactive', '李大娘柜台对话'],
      ['e56', 'auto', '李大娘回厨房'],
      ['e62', 'interactive', '醉道士讨酒'],
    ].map(([id, timing, label]) => {
      const scene = id === 'e19' ? 's001' : 's003',
        stage = bodyOf(id, timing)
      return {
        name: `003 ${label}`,
        scene,
        self: { scene, entity: id },
        timing,
        flow: { initial: stage.id, stages: [stage] },
      }
    }),
  )
  for (const binding of bindings) verifyKitchenTerminal(trace, binding.command)
  // The saved infinite auto continuation is not a finite path. Its source-cycle, wait
  // and actual presentation obligations remain separate, explicitly named contracts.
  const commands = trace.causes.filter(
    (e) =>
      e.phase === 'command' &&
      e.occurrence?.self?.entity === 'e62' &&
      e.occurrence.timing === 'auto',
  )
  const runs = new Map()
  for (const e of commands) {
    const { self, timing, path } = e.occurrence
    const stage = bodyOf(self.entity, timing)
    assert.equal(path[0], stage.id, '003 wrong author stage')
    let body = stage.body,
      authored
    for (let i = 1; i < path.length; i += 2) {
      authored = body[path[i]]
      assert(authored, '003 author path missing')
      if (i + 1 < path.length) {
        assert.equal(path[i + 1], 'body', '003 unexpected nested path')
        body = authored.body
      }
    }
    const command = leaf(e) ?? e.occurrence.command
    assert.equal(command.kind, authored.kind, '003 executed wrong command kind')
    if (!['dialog', 'repeat', 'loop'].includes(command.kind))
      assert.deepEqual(command, authored, '003 executed command differs from author')
    if (self.entity === 'e62' && timing === 'auto' && command.kind === 'wait')
      assert.equal(command.ms, path.at(-1) === 5 ? 1300 : 200, '003 Taoist source hold changed')
    if (!runs.has(e.runId)) runs.set(e.runId, [])
    runs.get(e.runId).push(e)
  }
  return [
    ...bindings.map(({ name, self, timing, commands, proof }) => ({
      name,
      actor: self.entity,
      timing,
      commands,
      proof,
    })),
    ...[...runs.values()].map((run) => ({
      actor: run[0].occurrence.self.entity,
      timing: run[0].occurrence.timing,
      commands: run.length,
    })),
  ]
}

/** Independently replay source pixel walk, including Game's last-half-cell acceleration. */
export function verifyKitchenSourceWalk(trace, moves, states, position) {
  const snapshots = states(trace, 'e56', 's003'),
    actual = moves(trace, 'e56', 's003')
  const ips = [
    ...new Set(actual.map((move) => snapshots.find((e) => e.order === move.order).state.autoIp)),
  ]
  assert.deepEqual(ips, [386, 387, 388], '003 source route has extra/missing leg')
  let point = [1136, 1624],
    frame = 0
  const expected = []
  for (const [index, ip] of ips.entries()) {
    const command = source.segments[0].commands[ip]
    assert.equal(command.opcode, 16, '003 source route is not NPCWalkTo speed3')
    const [x, y, h] = command.operands,
      end = [x * 32 + h * 16, y * 16 + h * 8]
    assert.deepEqual(position(end), kitchenTargets[index], '003 source waypoint differs')
    while (point[0] !== end[0] || point[1] !== end[1]) {
      const from = point,
        dx = end[0] - from[0],
        dy = end[1] - from[1]
      const facing = dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
      point =
        Math.abs(dx) < 6 || Math.abs(dy) < 6
          ? end
          : [from[0] + Math.sign(dx) * 6, from[1] + Math.sign(dy) * 3]
      frame = point === end ? 0 : (frame + 1) % 4
      expected.push({ ip, from, to: point, frame, facing })
    }
  }
  assert.equal(actual.length, expected.length, '003 source route step count differs')
  for (const [i, move] of actual.entries()) {
    const s = snapshots.find((e) => e.order === move.order)
    assert.deepEqual(
      {
        ip: s.state.autoIp,
        from: s.before.position,
        to: s.state.position,
        frame: s.state.localFrame,
        facing: s.state.facing,
      },
      expected[i],
      `003 source route step ${i} differs`,
    )
  }
  const poseOf = (state) => ({
    position: state.position,
    facing: state.facing,
    frame: state.localFrame,
  })
  let preceding = poseOf(snapshots.find((e) => e.order === actual[0].order).before)
  for (const event of snapshots.filter((e) => e.order >= actual[0].order)) {
    assert.deepEqual(poseOf(event.before), preceding, '003 source walk lost preceding pose')
    const index = actual.findIndex((e) => e.order === event.order)
    if (index !== -1)
      preceding = {
        position: expected[index].to,
        facing: expected[index].facing,
        frame: expected[index].frame,
      }
    assert.deepEqual(
      poseOf(event.state),
      preceding,
      '003 source walk has unauthored stationary pose reset',
    )
  }
  return { steps: expected.length, targets: kitchenTargets, ips }
}

/** Use actual auto invocations, not inferred eligibility (trigger-entry ticks can skip auto). */
export function verifyKitchenSourceCycle(
  trace,
  renders,
  currentFrame = (state) => state.localFrame,
) {
  const commands = source.segments[0].commands
  assert.deepEqual(
    commands.slice(734, 740),
    [
      { op: 'end', advance: true, label: 'L_734' },
      { op: 'raw', opcode: 20, operands: [1, 0, 0] },
      { op: 'end', advance: true },
      { op: 'raw', opcode: 20, operands: [0, 0, 0] },
      { op: 'raw', opcode: 9, operands: [10, 0, 0] },
      { op: 'end', reset: true, resetTo: 734, idleFrames: 0 },
    ],
    '003 original Taoist cycle changed',
  )
  const events = trace.causes.filter((e) => e.phase === 'auto-step' && e.actor === 62)
  assert(events.length, '003 missing actual Taoist auto calls')
  const changes = []
  for (const [index, e] of events.entries()) {
    const before = e.before,
      expected = { ...before }
    assert(before.ip >= 734 && before.ip <= 739, '003 Taoist auto escaped source cycle')
    if (before.ip === 738) {
      expected.idle++
      if (expected.idle === 10) {
        expected.idle = 0
        expected.ip++
      }
    } else {
      expected.ip = before.ip === 739 ? 734 : before.ip + 1
      if ([735, 737].includes(before.ip)) {
        expected.frame = before.ip === 735 ? 1 : 0
        expected.facing = 'down'
      }
    }
    assert.deepEqual(e.after, expected, '003 source auto frame/cursor cadence differs')
    assert.equal(
      currentFrame(e.poses.e62.state),
      e.after.frame,
      '003 source auto receipt detached from actor frame',
    )
    assert.equal(
      e.poses.e62.state.facing,
      e.after.facing,
      '003 source auto receipt detached from actor facing',
    )
    if (index)
      assert.deepEqual(
        before,
        events[index - 1].after,
        '003 lost auto invocation or unauthored pose write',
      )
    if (e.after.frame !== before.frame)
      changes.push({ index, order: e.order, frame: e.after.frame })
  }
  for (let i = 1; i < changes.length; i++)
    assert.equal(
      changes[i].index - changes[i - 1].index,
      changes[i - 1].frame === 1 ? 2 : 13,
      '003 source auto hold differs',
    )
  for (const pose of renders(trace, 'e62', 's003')) {
    const actual = events.findLast((e) => e.order < pose.order)?.after ?? events[0].before
    assert.equal(pose.facing, actual.facing, '003 actual Taoist facing detached from source auto')
    if (pose.frame !== null)
      assert.equal(pose.frame, actual.frame, '003 actual Taoist frame detached from source auto')
  }
  return { calls: events.length, changes }
}

/** Check complete timers plus the real restore/scene-exit partial cycles, without dropping either. */
export function verifyKitchenAutomaticWaits(trace) {
  const events = [...(trace.initialCauses ?? []), ...trace.causes]
  const starts = events.filter(
    (e) =>
      e.phase === 'wait-start' &&
      e.occurrence?.timing === 'auto' &&
      ['e56', 'e62'].includes(e.occurrence.self.entity),
  )
  const results = []
  for (const command of events.filter(
    (e) =>
      e.phase === 'command' &&
      e.occurrence?.timing === 'auto' &&
      ['e56', 'e62'].includes(e.occurrence.self.entity) &&
      leaf(e)?.kind === 'wait',
  )) {
    const receipts = starts.filter(
      (e) => e.runId === command.runId && e.occurrence.id === command.occurrence.id,
    )
    assert.equal(receipts.length, 1, '003 automatic wait command lacks unique timer')
  }
  for (const start of starts) {
    const end = events.find((e) => e.phase === 'wait-end' && e.waitId === start.waitId)
    if (end && end.order <= trace.renderScope.afterOrder) continue
    assert(end, '003 auto wait lacks settlement or scene-exit receipt')
    if (end.reason === 'deadline') {
      const receipt = verifyOpeningWaitReceipt(start, events, trace.worldRenders)
      results.push({
        actor: start.occurrence.self.entity,
        start: start.order,
        end: end.order,
        next: receipt.resumed.order,
        ms: start.ms,
      })
    } else {
      assert.equal(start.occurrence.self.entity, 'e62', '003 unexpected automatic cancellation')
      assert.equal(end.reason, 'abort', '003 automatic wait did not end at scene exit')
      const exit = trace.events.find(
        (e) => e.kind === 'scene' && e.order > start.order && e.scene !== start.scene,
      )
      assert(exit && end.order < exit.order, '003 cancelled wait lacks real scene exit')
      const ended = events.find(
        (e) => e.phase === 'run-ended' && e.runId === start.runId && e.order > end.order,
      )
      const nextDraw = trace.worldRenders.find((e) => e.order > end.order)
      assert(
        ended?.aborted &&
          nextDraw &&
          ended.order < nextDraw.order &&
          nextDraw.scene !== start.scene,
        '003 cancelled owner was not terminated before next scene draw',
      )
      const pending = trace.causes.filter(
        (e) => e.phase === 'clock' && e.order > start.order && e.order < end.order,
      )
      assert(
        pending.every((e) => e.now < start.deadline),
        '003 final cycle missed a due frame before leaving',
      )
      results.push({
        actor: 'e62',
        start: start.order,
        end: end.order,
        exit: exit.order,
        ms: start.ms,
        reason: 'scene-exit',
      })
    }
  }
  return results
}

/** Independently replay explicit poses and checked motion; every actual draw must be accounted for. */
export function verifyKitchenPresentation(trace, renders, moves, states, motion) {
  const result = []
  for (const [id, scene] of actors) {
    const draws = trace.worldRenders.filter((e) => e.scene === scene && within(trace, e))
    const poses = renders(trace, id, scene),
      baseline = states(trace, id, scene)[0].state
    const expected = {
      position: id === 'e19' ? [89, 45] : id === 'e56' ? [137, 66] : [137, 73],
      facing: id === 'e19' ? 'up' : 'down',
      visible: true,
      frame:
        id === 'e19'
          ? 6
          : id === 'e56'
            ? 0
            : leaf(
                trace.initialCauses.findLast(
                  (e) =>
                    e.phase === 'command' &&
                    leaf(e)?.target?.entity === id &&
                    leaf(e)?.kind === 'setEntityFrame',
                ),
              )?.frame,
    }
    if (id === 'e62') assert([0, 1].includes(expected.frame), '003 invalid initial automatic pose')
    assert.deepEqual(
      baseline.position.slice(0, 2),
      expected.position,
      '003 initial pose origin differs',
    )
    assert.equal(poses.length, draws.length, `${id}: incomplete actual draw coverage`)
    const changes = trace.causes
      .filter(
        (e) =>
          e.phase === 'command' && leaf(e)?.target?.scene === scene && leaf(e).target.entity === id,
      )
      .map((e) => ({ ...e, type: 'command' }))
    for (const route of motion.filter((r) => r.actor === id)) {
      const commits = moves(trace, id, scene).filter(
        (e) => e.order > route.command && e.order < route.continuation,
      )
      for (const [index, e] of commits.entries()) {
        const dx = route.to[0] - e.from[0] - (route.to[1] - e.from[1]),
          dy = route.to[0] - e.from[0] + route.to[1] - e.from[1]
        const facing = dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
        changes.push({
          order: e.order,
          type: 'move',
          position: e.to,
          facing,
          frame: base[facing] + (index === commits.length - 1 ? 0 : [1, 0, 2, 0][index % 4]),
        })
      }
    }
    changes.sort((a, b) => a.order - b.order)
    let cursor = 0,
      held = null,
      gait = initialPresentationGait(trace, id, scene, draws[0])
    for (const [index, draw] of draws.entries()) {
      while (cursor < changes.length && changes[cursor].order < draw.order) {
        const e = changes[cursor++],
          command = leaf(e)
        if (e.type === 'move') {
          assert.equal(held, null, `${id}: movement while taken`)
          Object.assign(expected, { position: e.position, facing: e.facing, frame: e.frame })
          gait = true
          continue
        }
        switch (command.kind) {
          case 'setEntityFacing':
            expected.frame += base[command.facing] - base[expected.facing]
            expected.facing = command.facing
            break
          case 'faceEntityToParty': {
            const a = e.poses[id].state.position,
              b = e.poses.party.state.position
            const dx = b[0] - a[0] - (b[1] - a[1]),
              dy = b[0] - a[0] + b[1] - a[1]
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
            assert.equal(held, null, `${id}: duplicate take`)
            held = expected.frame
            if (gait) expected.frame = base[expected.facing]
            break
          case 'releaseEntity':
            assert.notEqual(held, null, `${id}: release without take`)
            if (gait) expected.frame = held
            held = null
            break
        }
      }
      const pose = poses[index]
      assert.equal(pose.renderId, draw.renderId, `${id}: lost actual draw identity`)
      assert.equal(pose.sceneVisit, draw.sceneVisit, `${id}: wrong draw scene visit`)
      assert.deepEqual(pose.position, expected.position, `${id}: unexplained drawn position`)
      assert.equal(pose.facing, expected.facing, `${id}: unexplained drawn facing`)
      assert.equal(pose.visible, expected.visible, `${id}: unexplained drawn visibility`)
      assert.equal(
        pose.frame,
        expected.visible ? expected.frame : null,
        `${id}: unexplained actual animation frame at ${draw.order}`,
      )
      assert.equal(
        pose.frameSource,
        expected.visible ? 'drawn' : 'none',
        `${id}: actual draw source missing`,
      )
      assert.equal(
        pose.drawStatus,
        expected.visible ? 'drawn' : 'not-drawn',
        `${id}: actual draw status missing`,
      )
      if (expected.visible) {
        const rect = pose.geometry?.worldRect
        assert(
          rect?.length === 4 && rect.every(Number.isFinite) && rect[2] > 0 && rect[3] > 0,
          `${id}: invalid sprite bounds`,
        )
        assert.equal(
          rect[0],
          16 * (expected.position[0] - expected.position[1]) - Math.floor(rect[2] / 2),
          `${id}: detached sprite x`,
        )
        assert.equal(
          rect[1],
          8 * (expected.position[0] + expected.position[1]) + 7 - rect[3],
          `${id}: detached sprite y`,
        )
      }
    }
    assert.equal(held, null, `${id}: missing release`)
    result.push({ id, draws: poses.length, first: poses[0].order, last: poses.at(-1).order })
  }
  return result
}

/** Attribute each frame to an actual wait/dialogue/move or observed stage settlement. */
export function verifyKitchenHolds(trace, timing) {
  const events = [...(trace.initialCauses ?? []), ...trace.causes]
  const commands = events.filter(
    (e) =>
      e.phase === 'command' && ['e19', 'e47', 'e56', 'e62'].includes(e.occurrence?.self?.entity),
  )
  const runs = [...new Set(commands.map((e) => e.runId))].map((id) =>
    commands.filter((e) => e.runId === id),
  )
  const result = []
  for (const draw of trace.worldRenders.filter((e) => within(trace, e))) {
    const causes = []
    for (const run of runs) {
      const command = run.findLast((e) => e.order < draw.order && e.sceneVisit === draw.sceneVisit)
      if (!command) continue
      const terminal = events.find(
        (e) => e.phase === 'stage-settled' && e.runId === command.runId && e.order < draw.order,
      )
      if (terminal) {
        causes.push({ run: command.runId, reason: 'settled', order: terminal.order })
        continue
      }
      const kind = leaf(command)?.kind
      if (kind === 'wait') {
        const start = events.find(
          (e) =>
            e.phase === 'wait-start' &&
            e.runId === command.runId &&
            e.occurrence?.id === command.occurrence.id,
        )
        const end = events.find((e) => e.phase === 'wait-end' && e.waitId === start?.waitId)
        assert(
          start && end && start.order < draw.order && draw.order < end.order,
          '003 draw outside real wait lifetime',
        )
      } else if (kind === 'dialog') {
        const receipt = timing.dialogues?.find((e) => e.command === command.order)
        assert(
          receipt &&
            (receipt.opened < draw.order || receipt.preparation.draws.includes(draw.order)) &&
            draw.order < receipt.closed,
          '003 draw outside real dialogue lifetime',
        )
      } else if (kind === 'moveEntity') {
        assert(
          timing.motionCadence?.some(
            (e) => e.command === command.order && draw.order < e.continuation,
          ),
          '003 draw outside checked movement',
        )
      } else assert.fail(`003 unexplained draw after ${kind ?? command.occurrence.command.kind}`)
      causes.push({ run: command.runId, reason: kind, order: command.order })
    }
    result.push({
      order: draw.order,
      scene: draw.scene,
      causes: causes.length ? causes : [{ reason: 'awaiting-player-input' }],
    })
  }
  return result
}
