import assert from 'node:assert/strict'
import authorInn from '../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import {
  innDepartureTargets,
  verifyInnGamePresentation,
  verifyInnHoldSchedule,
  verifyInnPresentation,
  verifyInnReadyContinuations,
  verifyInnSourceDeparture,
} from './inn-presentation-intent.mjs'
import {
  verifyOpeningDialogue,
  verifyOpeningDrawClocks,
  verifyOpeningGameDialogue,
  verifyOpeningWaitReceipt,
} from './opening-hold-intent.mjs'
import { verifyFiniteScriptRuns } from './script-execution-contract.mjs'
import { authoredTerminalCursor, verifyScriptTerminalReceipt } from './script-terminal-intent.mjs'
import { requireTrace } from './trace-refinement.mjs'

const leaf = (event) => event.occurrence?.command?.command
const participants = ['e56', 'e59', 'e60', 'e61']

export function verifyInnExecutionBindings(events) {
  const bindings = verifyFiniteScriptRuns(
    events,
    [
      ['e56', 'interactive', 'default', '李大娘接客'],
      ['e56', 'auto', 'legacy-006', '李大娘离开柜台'],
      ['e59', 'auto', 'legacy-003', '苗人头领进房'],
      ['e60', 'auto', 'legacy-003', '苗人开门随从进房'],
      ['e61', 'auto', 'legacy-003', '苗人随行随从进房'],
    ].map(([id, timing, plan, label]) => ({
      name: `002 ${label}`,
      scene: 's003',
      self: { scene: 's003', entity: id },
      timing,
      author: {
        kind: 'entity-behavior',
        scene: 's003',
        entity: id,
        channel: timing === 'auto' ? 'auto' : 'trigger',
        behavior: plan,
      },
      flow: authorInn.entities.find((e) => e.id === id).behaviors[
        timing === 'auto' ? 'auto' : 'trigger'
      ][plan].flow,
    })),
  )
  const commands = events.filter(
    (e) => e.phase === 'command' && bindings.some((b) => b.runId === e.runId),
  )
  verifyInnWaitRegistrations(events, commands)
  return bindings
}

export function verifyInnWaitRegistrations(events, commands) {
  const waits = commands.filter((event) => leaf(event)?.kind === 'wait')
  const starts = events.filter(
    (event) =>
      event.phase === 'wait-start' &&
      participants.includes(event.occurrence?.self?.entity) &&
      leaf(event)?.kind === 'wait',
  )
  assert.equal(starts.length, waits.length, 'missing/extra actual wait receipt')
  for (const command of waits) {
    const receipts = starts.filter(
      (start) => start.runId === command.runId && start.occurrence?.id === command.occurrence.id,
    )
    assert.equal(receipts.length, 1, 'wait command lacks a unique timer registration')
    assert.deepEqual(receipts[0].occurrence, command.occurrence, 'timer command identity differs')
    assert.equal(
      receipts[0].now,
      receipts[0].clock?.now,
      'timer start is not its actual gameplay clock',
    )
  }
}

/** The two flows are concurrent. Prove which lease owns the terminal from committed
 * selection/cursor snapshots, never from the decision we are trying to validate.
 * A replacement overlapping the final safe point has no precise commit receipt here.
 */
export function verifyInnTriggerTerminal(trace) {
  const bindings = verifyInnExecutionBindings(trace.causes)
  const trigger = bindings.find((b) => b.command.occurrence.timing === 'interactive')
  const departure = bindings.find(
    (b) => b.command.occurrence.timing === 'auto' && b.command.occurrence.self.entity === 'e56',
  )
  const commands = trace.causes.filter((e) => e.phase === 'command')
  const first = commands.find((e) => e.runId === trigger.runId)
  const terminal = trace.causes.filter(
    (e) => e.phase === 'stage-settled' && e.runId === trigger.runId,
  )
  const endings = trace.causes.filter((e) => e.phase === 'run-ended' && e.runId === trigger.runId)
  assert.equal(terminal.length, 1, 'aunt trigger lacks unique terminal')
  assert.equal(endings.length, 1, 'aunt trigger lacks unique ending')
  const writers = commands.filter((e) => {
    const c = leaf(e)
    return (
      e.order > first.order &&
      c?.target?.scene === 's003' &&
      c.target.entity === 'e56' &&
      (c.kind === 'selectEntityPage' ||
        (c.kind === 'selectEntityBehavior' && c.channel === 'trigger'))
    )
  })
  assert.equal(writers.length, 1, 'aunt trigger has missing/competing selection writer')
  const change = writers[0]
  assert.equal(change.runId, departure.runId, 'aunt replacement is not authored departure')
  assert.deepEqual(leaf(change).selection, { kind: 'use', value: 'greet-after-guests' })
  const next = commands.find((e) => e.runId === change.runId && e.order > change.order)
  assert(next, 'aunt replacement has no own continuation snapshot')
  const slot = (event) => {
    requireTrace(
      event.worldSource === 'observe:causal' && event.world?.script?.behaviors,
      'aunt-terminal-world-snapshot',
      'actual causal world snapshot',
      event.order,
      'unknown',
    )
    return event.world.script.behaviors.entities?.s003?.e56?.trigger ?? {}
  }
  const replaced = { selection: { kind: 'use', value: 'greet-after-guests' } }
  assert.deepEqual(slot(first), {}, 'aunt trigger did not begin with canonical default')
  assert.deepEqual(slot(next), replaced, 'aunt replacement did not clear old cursor')
  let decision
  if (next.order < trigger.command.order) {
    decision = 'stop'
    for (const event of [trigger.command, terminal[0], endings[0]])
      assert.deepEqual(slot(event), replaced, 'stale aunt lease overwrote replacement')
  } else {
    requireTrace(
      endings[0].order < change.order,
      'aunt-replacement-safe-point-order',
      'disjoint replacement/terminal windows',
      { ended: endings[0].order, replacement: change.order, committed: next.order },
      'unknown',
    )
    decision = 'continue'
    const continued = { cursor: { behavior: 'default', at: authoredTerminalCursor(trigger.stage) } }
    for (const event of [terminal[0], endings[0], change])
      assert.deepEqual(
        slot(event),
        continued,
        'current aunt lease did not preserve authored cursor',
      )
  }
  return { decision, replacement: change.order, committed: next.order }
}

function verifyInnTerminals(trace, bindings) {
  assert.equal(bindings.length, 5, 'reception finite run count differs')
  return bindings.map(({ name, commands: count, command, stage }) => {
    assert(
      ['finishStep', 'releaseEntity'].includes(
        leaf(command)?.kind ?? command.occurrence.command.kind,
      ),
      'reception unclassified final command',
    )
    let decision = 'continue'
    if (command.occurrence.self.entity === 'e56' && command.occurrence.timing === 'interactive') {
      decision = verifyInnTriggerTerminal(trace).decision
    }
    return {
      name,
      commands: count,
      ...verifyScriptTerminalReceipt(command, trace.causes, trace.worldRenders, {
        cursor: authoredTerminalCursor(stage),
        decision,
      }),
    }
  })
}

/** Compare owed world steps, including each slow rest and explicit take, not polling intervals. */
export function verifyInnMotionCadence(trace, moves, renders, options = {}) {
  const active = options.actors ?? participants
  const events = trace.causes.filter((event) => event.scene === 's003')
  const commands = events.filter((event) => event.phase === 'command')
  const automatic = commands.filter(
    (event) =>
      event.occurrence?.timing === 'auto' && active.includes(event.occurrence.self?.entity),
  )
  const clocks = events.filter((event) => event.phase === 'clock')
  const cadence = events.filter((event) => event.phase === 'cadence')
  const heldAt = (id, order) => {
    let held = false
    for (const event of commands) {
      if (event.order >= order) break
      const command = leaf(event)
      if (command?.target?.entity === id && ['takeEntity', 'releaseEntity'].includes(command.kind))
        held = command.kind === 'takeEntity'
    }
    return held
  }
  const result = []
  const covered = new Set()
  for (const command of automatic.filter((event) => leaf(event)?.kind === 'moveEntity')) {
    const id = leaf(command).target.entity
    const next = automatic.find(
      (event) => event.runId === command.runId && event.order > command.order,
    )
    assert(next, `${id}: motion continuation missing`)
    const frames = cadence.filter(
      (event) => event.order > command.order && event.order < next.order,
    )
    assert(frames.length, `${id}: no actual movement clock`)
    for (const draw of trace.worldRenders.filter(
      (event) => event.order > command.order && event.order < next.order,
    )) {
      if (draw.causalFrame?.frameId === command.clock?.frameId) continue
      assert.equal(
        frames.filter((event) => event.clock.frameId === draw.causalFrame?.frameId).length,
        1,
        `${id}: movement frame lacks its cadence receipt`,
      )
    }
    const due = []
    let rest = false
    for (const [index, event] of frames.entries()) {
      const previousClock =
        clocks[clocks.findIndex((clock) => clock.clock.frameId === event.clock.frameId) - 1]?.clock
      assert(
        previousClock && !event.frozen && !event.clock.stepping,
        `${id}: unclassified movement gate`,
      )
      assert.equal(event.clock.now, previousClock.now + event.dt, `${id}: wrong gameplay clock`)
      assert.equal(
        event.dt,
        Math.min(Math.max(0, event.clock.realNow - previousClock.realNow), 100),
        `${id}: wrong frame delta`,
      )
      assert.equal(event.stepMs, 100, `${id}: changed world cadence`)
      if (index)
        assert.deepEqual(event.before, frames[index - 1].after, `${id}: lost cadence receipt`)
      const sum = event.before.accumulator + event.dt,
        step = sum >= 100
      assert.equal(event.after.tick, event.before.tick + Number(step), `${id}: missing world step`)
      assert.equal(
        event.after.accumulator,
        step ? (sum - 100 > 100 ? 0 : sum - 100) : sum,
        `${id}: wrong accumulator`,
      )
      if (!step || heldAt(id, event.order)) continue
      if (rest) {
        rest = false
        continue
      }
      due.push(event)
      rest = leaf(command).speed === 'slow'
    }
    const actual = moves(trace, id, 's003').filter(
      (event) => event.order > command.order && event.order < next.order,
    )
    const poses = renders(trace, id, 's003')
    const from = command.poses[id].state.position,
      to = leaf(command).to
    const noOp = from[0] === to.col && from[1] === to.row
    if (noOp) {
      assert.equal(due.length, 1, `${id}: no-op did not settle at first eligible batch`)
      assert.equal(actual.length, 0, `${id}: no-op displaced the actor`)
    } else {
      assert.deepEqual(
        actual.map((event) => event.tick),
        due.map((event) => event.after.tick),
        `${id}: missed/added eligible movement`,
      )
      assert(actual.length, `${id}: move never committed`)
      assert.deepEqual(actual[0].from, from.slice(0, 2), `${id}: wrong motion origin`)
      assert.deepEqual(actual.at(-1).to, [to.col, to.row], `${id}: wrong exact endpoint`)
    }
    for (const [index, commit] of actual.entries()) {
      const draw = trace.worldRenders.find((event) => event.order > commit.order)
      assert(
        draw &&
          commit.order > due[index].order &&
          draw.causalFrame?.frameId === due[index].clock.frameId,
        `${id}: movement missed its first draw`,
      )
      const pose = poses.find((event) => event.order > commit.order)
      assert(
        pose &&
          pose.renderId === draw.renderId &&
          pose.visible &&
          pose.frameSource === 'drawn' &&
          pose.drawStatus === 'drawn',
        `${id}: actual movement frame missing`,
      )
      assert.deepEqual(pose.position, commit.to, `${id}: draw bound to wrong movement`)
      const dx = 16 * (to.col - commit.from[0] - (to.row - commit.from[1]))
      const dy = 8 * (to.col - commit.from[0] + (to.row - commit.from[1]))
      const facing = dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
      assert.equal(pose.facing, facing, `${id}: movement facing differs from target direction`)
      const targetStep = index === actual.length - 1
      const frame =
        { down: 0, left: 3, up: 6, right: 9 }[facing] + (targetStep ? 0 : [1, 0, 2, 0][index % 4])
      assert.equal(
        pose.frame,
        heldAt(id, pose.order) ? { down: 0, left: 3, up: 6, right: 9 }[facing] : frame,
        `${id}: discontinuous actual walking frame`,
      )
      if (index)
        assert.deepEqual(commit.from, actual[index - 1].to, `${id}: position continuity lost`)
      const speed = { slow: 0.25, normal: 0.375 }[leaf(command).speed]
      assert(speed, `${id}: unclassified movement speed`)
      // Independent projected-distance oracle: exact authored target, bounded uniform ground speed.
      const distance = Math.hypot(dx, dy),
        maxStep = Math.hypot(16, 8) * speed
      const expected =
        distance <= maxStep
          ? [to.col, to.row]
          : [
              commit.from[0] + ((to.col - commit.from[0]) * maxStep) / distance,
              commit.from[1] + ((to.row - commit.from[1]) * maxStep) / distance,
            ]
      assert.deepEqual(commit.to, expected, `${id}: movement deviated from bounded target route`)
      {
        const nextPose = commands.find(
          (event) =>
            event.order > commit.order &&
            leaf(event)?.target?.entity === id &&
            ['setEntityFacing', 'setEntityFrame', 'setEntityState', 'moveEntity'].includes(
              leaf(event).kind,
            ),
        )
        const throughOrder = targetStep
          ? (nextPose?.order ?? trace.renderScope?.throughOrder ?? Infinity)
          : actual[index + 1].order
        for (const clock of trace.worldRenders.filter(
          (event) =>
            event.scene === 's003' && event.order > commit.order && event.order < throughOrder,
        )) {
          const held = heldAt(id, clock.order)
          const painted = poses.find((event) => event.renderId === clock.renderId)
          assert(
            painted?.visible && painted.frameSource === 'drawn' && painted.drawStatus === 'drawn',
            `${id}: intermediate actual draw missing`,
          )
          assert.deepEqual(
            painted.position,
            commit.to,
            `${id}: unexplained intermediate displacement`,
          )
          assert.equal(painted.facing, facing, `${id}: unexplained intermediate turn`)
          assert.equal(
            painted.frame,
            held ? { down: 0, left: 3, up: 6, right: 9 }[facing] : frame,
            `${id}: unexplained intermediate pose/stride reset`,
          )
        }
      }
      covered.add(commit.order)
    }
    result.push({
      actor: id,
      command: command.order,
      continuation: next.order,
      from: from.slice(0, 2),
      to: [to.col, to.row],
      speed: leaf(command).speed,
      steps: actual.length,
      eligibleTicks: due.map((event) => event.after.tick),
    })
  }
  assert.equal(result.length, options.routes ?? 14, 'automatic route missing/added')
  assert.equal(
    covered.size,
    active.reduce((sum, id) => sum + moves(trace, id, 's003').length, 0),
    'unclassified reception NPC motion',
  )
  return result
}
// Original L285 reception: redraws, two 0x85 delays, then 10/15/8/1 exploration beats.
const sourceWaits = [
  [290, 'redraw', 60],
  [291, 'delay', 320],
  [293, 'redraw', 60],
  [295, 'redraw', 60],
  [296, 'delay', 320],
  [298, 'redraw', 60],
  [303, 'redraw', 60],
  [308, 'frames', 10],
  [312, 'frames', 15],
  [343, 'redraw', 60],
  [346, 'frames', 8],
  [348, 'frames', 1],
]

export function verifyInnWaitPlan(game, reforge) {
  assert.deepEqual(
    game.map((event) => [
      event.occurrence?.ip,
      event.type,
      event.type === 'frames' ? event.frames : event.ms,
    ]),
    sourceWaits,
    'source reception wait plan changed',
  )
  assert.equal(reforge.length, sourceWaits.length, 'reception wait missing/added')
  return game.map((event, index) => {
    const source = event.occurrence.command
    assert.equal(source?.op, 'raw', 'source wait is not a raw instruction')
    assert.equal(
      source.opcode,
      { redraw: 5, delay: 0x85, frames: 9 }[event.type],
      'source wait opcode differs',
    )
    assert.deepEqual(
      source.operands,
      [
        event.type === 'delay'
          ? event.ms / 80
          : event.type === 'frames'
            ? event.occurrence.ip === 348
              ? 0
              : event.frames
            : 0,
        0,
        0,
      ],
      'source wait operands differ',
    )
    const ms =
      event.type === 'frames' ? event.frames * 100 : event.type === 'redraw' ? 100 : event.ms
    assert.equal(reforge[index].ms, ms, `reception wait L${event.occurrence.ip}: wrong duration`)
    return { ip: event.occurrence.ip, ms, game: event.order, reforge: reforge[index].order }
  })
}

/** These are single source operations, not six separately timed door mutations. */
export function verifyInnAtomicActions(events, draws) {
  const commands = events.filter((event) => event.phase === 'command')
  const result = []
  for (const id of ['e60', 'e61']) {
    const own = commands.filter(
      (event) => event.occurrence?.timing === 'auto' && event.occurrence.self?.entity === id,
    )
    const turns = own.filter(
      (event) => leaf(event)?.kind === 'setEntityFacing' && leaf(event).facing === 'up',
    )
    assert.equal(turns.length, 1, `${id}: missing/duplicate upward turn`)
    const turn = turns[0],
      next = own[own.indexOf(turn) + 1]
    assert.deepEqual(
      leaf(next),
      { frame: 0, kind: 'setEntityFrame', target: { scene: 's003', entity: id } },
      `${id}: turn/frame split`,
    )
    assert.equal(next.clock?.frameId, turn.clock?.frameId, `${id}: pose split across frames`)
    assert(
      !draws.some((draw) => draw.order > turn.order && draw.order < next.order),
      `${id}: intermediate wrong pose drawn`,
    )
    result.push({ actor: id, turn: turn.order, frame: next.order })
  }
  const doors = commands.filter(
    (event) =>
      event.occurrence?.self?.entity === 'e60' &&
      ['e73', 'e74'].includes(leaf(event)?.target?.entity),
  )
  assert.deepEqual(
    doors.map((event) => [leaf(event).target.entity, leaf(event).kind]),
    ['e73', 'e74'].flatMap((id) =>
      ['setEntityState', 'setEntityFacing', 'selectEntityPage'].map((kind) => [id, kind]),
    ),
    'door compound call missing/changed',
  )
  assert(doors[0].clock, 'door call lacks real frame')
  assert(
    doors.every((event) => event.clock?.frameId === doors[0].clock.frameId),
    'door call split across frames',
  )
  assert(
    !draws.some((draw) => draw.order > doors[0].order && draw.order < doors.at(-1).order),
    'half-open compound call drawn',
  )
  result.push({ doors: doors.map((event) => event.order), frameId: doors[0].clock.frameId })
  return result
}

/** A bounded timing receipt, not a waiver for movement or pose findings. Those remain independent. */
export function compareInnTimingIntent(game, reforge, renders, moves, states, position) {
  const result = {
    status: 'needs-review',
    fixedWaits: [],
    automaticWaits: [],
    dialogues: [],
    errors: [],
  }
  try {
    const a = (game.causes ?? []).filter((event) => event.scene === 's003')
    const b = (reforge.causes ?? []).filter((event) => event.scene === 's003')
    assert(a.length && b.length, 'missing inn causal receipts; record current runners')
    for (const trace of [game, reforge])
      assert(
        [...trace.events, ...trace.causes, ...trace.worldRenders, ...trace.pages].some(
          (event) =>
            event.order === trace.renderScope?.throughOrder ||
            event.throughOrder === trace.renderScope?.throughOrder,
        ),
        'story closing boundary has lost its last observation',
      )
    const draws = (trace) =>
      (trace.worldRenders ?? []).filter(
        (event) =>
          event.scene === 's003' &&
          (!trace.renderScope ||
            (event.order > trace.renderScope.afterOrder &&
              event.order <= trace.renderScope.throughOrder)),
      )
    for (const trace of [game, reforge]) {
      const completed = draws(trace)
      for (const [index, draw] of completed.entries()) {
        assert(Number.isSafeInteger(draw.renderId), 'draw lacks completed render identity')
        if (index && draw.sceneVisit === completed[index - 1].sceneVisit)
          assert.equal(
            draw.renderId,
            completed[index - 1].renderId + 1,
            'completed world draw missing',
          )
      }
      verifyOpeningDrawClocks(trace.causes, completed)
    }
    result.terminals = verifyInnTerminals(reforge, verifyInnExecutionBindings(b))
    const left = a.filter((event) => event.phase === 'wait-start')
    const right = b.filter(
      (event) =>
        event.phase === 'wait-start' &&
        participants.includes(event.occurrence?.self?.entity) &&
        leaf(event)?.kind === 'wait',
    )
    const foreground = right.filter(
      (event) =>
        event.occurrence.self.entity === 'e56' && event.occurrence.timing === 'interactive',
    )
    result.fixedWaits = verifyInnWaitPlan(left, foreground)
    result.settledWaitGates = []
    for (const [starts, events, trace] of [
      [left, a, game],
      [right, b, reforge],
    ])
      for (const start of starts) {
        const receipt = verifyOpeningWaitReceipt(start, events, draws(trace))
        if (receipt.wakeGate) {
          const { gate, ready, take, release, taken, released, after } = receipt.wakeGate
          result.settledWaitGates.push({
            runId: start.runId,
            occurrence: start.occurrence.id,
            waitId: start.waitId,
            gate: gate.order,
            ready: ready.order,
            take: take.order,
            release: release.order,
            taken: taken.order,
            released: released.order,
            firstReleaseDraw: after.order,
          })
        }
      }
    for (const [index, wait] of result.fixedWaits.entries()) {
      // Before anyone leaves the reception, each pause belongs to exactly the same presented pose.
      if (index >= 7) break
      wait.poses = {}
      for (const id of ['e54', 'e55', 'e56']) {
        const l = renders(game, id, 's003').find((event) => event.order > wait.game)
        const r = renders(reforge, id, 's003').find((event) => event.order > wait.reforge)
        assert(l && r, `reception L${wait.ip}: missing actual pose`)
        const pose = (event) => [event.position, event.facing, event.frame, event.visible]
        assert.deepEqual(pose(l), pose(r), `reception L${wait.ip}: ${id} pose differs`)
        wait.poses[id] = { game: l.order, reforge: r.order, pose: pose(l) }
      }
    }
    result.automaticWaits = right
      .filter((event) => event.occurrence.timing === 'auto')
      .map((event) => ({
        actor: event.occurrence.self.entity,
        order: event.order,
        ms: event.ms,
        deadline: event.deadline,
      }))
    result.atomicActions = verifyInnAtomicActions(b, draws(reforge))
    result.motionCadence = verifyInnMotionCadence(reforge, moves, renders)
    result.dialogues = verifyOpeningDialogue(
      b,
      draws(reforge),
      reforge.pages.filter((event) => event.page),
    )
    result.gameDialogueInputs = verifyOpeningGameDialogue(a)
    result.readyContinuations = verifyInnReadyContinuations(reforge, moves)
    result.sourceDeparture = verifyInnSourceDeparture(game, moves, states, position)
    assert.deepEqual(
      result.motionCadence.filter((event) => event.actor === 'e56').map((event) => event.to),
      innDepartureTargets,
      'authored departure differs from the six approved source waypoints',
    )
    result.gamePresentation = verifyInnGamePresentation(game, renders, states, position)
    result.presentation = verifyInnPresentation(reforge, renders, moves, result.motionCadence)
    result.holdSchedule = verifyInnHoldSchedule(reforge, result)
    result.status = 'passed'
  } catch (error) {
    result.errors.push(error.message)
  }
  return result
}
