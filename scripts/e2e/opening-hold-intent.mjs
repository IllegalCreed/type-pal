import assert from 'node:assert/strict'
import bedroom from '../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import { verifyDialoguePresentation } from './dialogue-presentation-contract.mjs'
import { verifyFiniteScriptRuns } from './script-execution-contract.mjs'
import { authoredTerminalCursor, verifyScriptTerminalReceipt } from './script-terminal-intent.mjs'
import { requireTrace } from './trace-refinement.mjs'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const leaf = (event) => event.occurrence?.command?.command
const room = (trace) => (trace.causes ?? []).filter((event) => event.scene === 's001')

/** The bedroom entry and aunt's finite departure, not startup loadScene or ambient loops. */
function verifyOpeningRoomTerminals(trace) {
  const bindings = verifyFiniteScriptRuns(trace.causes, [
    {
      name: '001 卧房进场',
      scene: 's001',
      self: null,
      timing: 'interactive',
      flow: bedroom.hooks.onEnter.variants.default.flow,
    },
    {
      name: '001 李大娘离房',
      scene: 's001',
      self: { scene: 's001', entity: 'e10' },
      timing: 'auto',
      flow: bedroom.entities.find((e) => e.id === 'e10').behaviors.auto['leave-bedroom'].flow,
    },
  ])
  return bindings.map(({ name, commands, command, stage }) => ({
    name,
    commands,
    ...verifyScriptTerminalReceipt(command, trace.causes, trace.worldRenders, {
      cursor: authoredTerminalCursor(stage),
      decision: 'continue',
    }),
  }))
}

/** Associate each actual draw with the real frame that produced it. */
export function verifyOpeningDrawClocks(events, worldRenders) {
  const clocks = events.filter((event) => event.phase === 'clock')
  let index = -1
  for (const draw of worldRenders) {
    while (index + 1 < clocks.length && clocks[index + 1].order < draw.order) index++
    assert(index >= 0 && draw.causalFrame, 'world draw lacks a causal frame')
    assert.deepEqual(
      draw.causalFrame,
      clocks[index].clock,
      'world draw belongs to a different causal frame',
    )
  }
}

/** Check real movement eligibility against gameplay time, then require each owed step.
 * This does not compare browser draw counts or introduce an elapsed-time tolerance.
 */
export function verifyOpeningMotionCadence(
  events,
  worldRenders,
  movement,
  fromOrder,
  throughOrder,
) {
  const cadence = events.filter(
    (e) => e.phase === 'cadence' && e.order > fromOrder && e.order <= throughOrder,
  )
  assert(cadence.length > 0, 'missing real movement cadence')
  const clocks = events.filter((e) => e.phase === 'clock')
  const draws = worldRenders.filter((e) => e.order > fromOrder && e.order <= throughOrder)
  for (const draw of draws) {
    const inFrame = cadence.filter((e) => e.clock.frameId === draw.causalFrame.frameId)
    // The starting command can run after this frame's world batch. All later frames must be observed.
    if (
      draw.causalFrame.frameId ===
      events.findLast((e) => e.phase === 'clock' && e.order < fromOrder)?.clock.frameId
    )
      continue
    assert.equal(inFrame.length, 1, 'movement frame lacks its cadence receipt')
  }
  const due = []
  for (const [index, event] of cadence.entries()) {
    const frameIndex = clocks.findIndex((e) => e.clock.frameId === event.clock.frameId)
    assert(frameIndex > 0, 'movement cadence lacks its preceding frame')
    const previous = clocks[frameIndex - 1].clock
    assert.equal(event.frozen, false, 'unclassified movement freeze')
    assert.equal(event.clock.stepping, false, 'debug stepping is not normal movement')
    assert.equal(
      event.clock.now,
      previous.now + event.dt,
      'movement elapsed time differs from actual frame delta',
    )
    assert.equal(
      event.dt,
      Math.min(Math.max(0, event.clock.realNow - previous.realNow), 100),
      'movement frame delta differs from real clock',
    )
    assert.equal(event.stepMs, 100, 'opening movement cadence changed')
    if (index)
      assert.deepEqual(event.before, cadence[index - 1].after, 'movement cadence continuity lost')
    const sum = event.before.accumulator + event.dt
    const owesStep = sum >= 100
    assert.equal(
      event.after.tick,
      event.before.tick + Number(owesStep),
      'movement world step skipped/added',
    )
    assert.equal(
      event.after.accumulator,
      owesStep ? (sum - 100 > 100 ? 0 : sum - 100) : sum,
      'movement clock accumulator changed',
    )
    if (owesStep) due.push(event)
  }
  const commits = movement.filter((e) => e.order > fromOrder && e.order <= throughOrder)
  assert.equal(commits.length, due.length, 'active movement skipped/added an eligible step')
  for (const [index, commit] of commits.entries()) {
    const step = due[index]
    const draw = worldRenders.find((e) => e.order > commit.order)
    assert.equal(commit.tick, step.after.tick, 'movement commit belongs to the wrong world step')
    assert(
      commit.order > step.order && draw?.causalFrame.frameId === step.clock.frameId,
      'movement missed its eligible presentation frame',
    )
  }
  return { fromOrder, throughOrder, steps: commits.length, frames: cadence.length }
}

/** A settled auto timer can lose authority before its next leaf enters the real wake gate. */
function verifySettledWaitGate(start, end, resumed, events, worldRenders) {
  const owner = start.occurrence?.self
  assert(
    start.engine === 'reforge' && owner && start.occurrence.timing === 'auto',
    'delayed wait continuation is not an owned automatic runner',
  )
  const first = worldRenders.find((draw) => draw.order > end.order)
  const gates = events.filter(
    (event) =>
      event.phase === 'gate-wait' &&
      event.runId === start.runId &&
      event.order > end.order &&
      event.order < first.order,
  )
  assert.equal(gates.length, 1, 'settled wait lacks its first-frame wake gate')
  const gate = gates[0]
  const settlements = events.filter(
    (event) =>
      ['gate-ready', 'gate-rejected'].includes(event.phase) && event.gateId === gate.gateId,
  )
  assert.equal(settlements.length, 1, 'settled wait gate lacks unique settlement')
  const ready = settlements[0]
  assert.equal(ready.phase, 'gate-ready', 'settled wait gate was cancelled')
  for (const event of [gate, ready]) {
    assert.equal(event.runId, start.runId, 'settled wait gate invocation changed')
    assert.deepEqual(event.occurrence, start.occurrence, 'settled wait gate command changed')
    assert.equal(event.activityId, start.activityId, 'settled wait gate activity changed')
    assert.equal(event.signalActivityId, start.activityId, 'settled wait gate signal changed')
    assert.equal(event.scene, start.scene, 'settled wait gate scene changed')
    assert.equal(event.sceneVisit, start.sceneVisit, 'settled wait gate visit changed')
  }
  assert(Number.isInteger(start.activityId), 'settled wait lacks an actual activity')
  assert.equal(gate.clock.frameId, end.clock.frameId, 'settled wait gate missed deadline frame')
  const completed = events.filter(
    (event) =>
      event.phase === 'leaf-completed' &&
      event.runId === start.runId &&
      event.occurrence?.id === start.occurrence.id,
  )
  assert.equal(completed.length, 1, 'settled wait lacks unique leaf completion')
  assert(
    completed[0].order > end.order && completed[0].order < gate.order,
    'wake gate did not follow actual wait completion',
  )
  const authorityCommands = events.filter(
    (event) =>
      event.phase === 'command' &&
      ['takeEntity', 'releaseEntity'].includes(leaf(event)?.kind) &&
      same(leaf(event).target, owner) &&
      event.order > end.order &&
      event.order < ready.order,
  )
  assert.equal(authorityCommands.length, 2, 'settled wait gate lacks exact take/release callers')
  const [take, release] = authorityCommands
  assert.equal(leaf(take).kind, 'takeEntity', 'settled wait gate lacks actual take')
  assert.equal(leaf(release).kind, 'releaseEntity', 'settled wait gate lacks actual release')
  assert.equal(release.runId, take.runId, 'settled wait release caller changed')
  assert.notEqual(take.runId, start.runId, 'automatic runner took itself')
  assert(
    take.order < gate.order && release.order > gate.order,
    'settled wait gate is outside authored authority lifetime',
  )
  const changes = events.filter(
    (event) =>
      event.phase === 'authority-changed' &&
      event.actor === owner.entity &&
      event.order > take.order &&
      event.order < ready.order,
  )
  assert.equal(changes.length, 2, 'settled wait gate lacks exact authority mutations')
  const [taken, released] = changes
  assert.equal(taken.source, 'motion-runtime-coordinator', 'take lacks real authority source')
  assert.equal(released.source, taken.source, 'release authority source changed')
  assert.equal(taken.before, null, 'settled wait take replaced existing authority')
  assert.deepEqual(taken.after, { kind: 'script' }, 'settled wait take lacks script authority')
  assert.deepEqual(released.before, taken.after, 'settled wait release authority differs')
  assert.equal(released.after, null, 'settled wait release retained authority')
  assert.equal(taken.epochAfter, taken.epochBefore + 1, 'take epoch did not advance')
  assert.equal(released.epochBefore, taken.epochAfter, 'held authority epoch changed')
  assert.equal(released.epochAfter, taken.epochAfter + 1, 'release epoch did not advance')
  assert(
    taken.order < gate.order && release.order < released.order,
    'settled wait authority mutation is outside its caller',
  )
  const activation = (event) =>
    event.lifecycle?.activations.find(
      (entry) => entry.entity === owner.entity && entry.activityId === start.activityId,
    )
  const initial = activation(gate)
  assert(
    initial &&
      !initial.aborted &&
      gate.lifecycle.scene === owner.scene &&
      initial.sceneSession === gate.lifecycle.sceneSession,
    'settled wait gate lacks live scene activation',
  )
  for (const event of events.filter(
    (event) => event.order >= gate.order && event.order < released.order,
  )) {
    assert.equal(event.scene, start.scene, 'held wait crossed scene')
    assert.equal(event.sceneVisit, start.sceneVisit, 'held wait crossed visit')
    assert.deepEqual(activation(event), initial, 'held wait lost activation ownership')
    assert.deepEqual(
      event.lifecycle.authority[owner.entity],
      taken.after,
      'held wait lost authority before release',
    )
    assert.equal(
      event.lifecycle.epochs[owner.entity],
      taken.epochAfter,
      'held wait authority epoch changed before release',
    )
  }
  assert.deepEqual(activation(ready), initial, 'released wait activation changed')
  assert.equal(
    ready.lifecycle.authority[owner.entity],
    undefined,
    'wake gate resumed before actual release',
  )
  assert.equal(
    ready.lifecycle.epochs[owner.entity],
    released.epochAfter,
    'wake gate release epoch differs',
  )
  assert.equal(ready.clock.frameId, released.clock.frameId, 'wake gate missed first release frame')
  assert.equal(resumed.phase, 'command', 'gated wait lacks next actual command')
  assert.equal(resumed.activityId, start.activityId, 'gated continuation activity changed')
  assert.deepEqual(resumed.occurrence.self, owner, 'gated continuation owner changed')
  assert.equal(resumed.occurrence.timing, 'auto', 'gated continuation channel changed')
  assert.equal(resumed.clock.frameId, ready.clock.frameId, 'continuation missed wake frame')
  assert(resumed.order > ready.order, 'continuation preceded gate readiness')
  const after = worldRenders.find((draw) => draw.order > released.order)
  assert(
    after && ready.order < after.order && resumed.order < after.order,
    'released continuation missed its first available draw',
  )
  return { gate, ready, take, release, taken, released, completed: completed[0], after }
}

/** Verify the producer's own clock and its next real continuation/draw, not elapsed-ms equality. */
export function verifyOpeningWaitReceipt(
  start,
  events,
  worldRenders,
  terminalCursor,
  runtimeHandoffs,
  { requirePresented = true } = {},
) {
  const ends = events.filter((event) => event.phase === 'wait-end' && event.waitId === start.waitId)
  assert.equal(ends.length, 1, `wait ${start.waitId}: missing/duplicate settlement`)
  const end = ends[0]
  assert.equal(end.reason, 'deadline', `wait ${start.waitId}: aborted/cleared is not elapsed`)
  assert.equal(end.runId, start.runId, 'wait owner changed')
  assert(end.order > start.order && end.clock, 'missing wait clock')
  if (start.engine === 'reforge') {
    if (start.clock)
      assert.equal(start.now, start.clock.now, 'timer start is not its actual gameplay clock')
    else {
      assert(
        !events.some((event) => event.phase === 'clock' && event.order < start.order),
        'timer dropped an existing gameplay clock',
      )
      assert.equal(start.now, 0, 'pre-frame timer must use initial gameplay time zero')
    }
    assert.equal(end.now, end.clock.now, 'timer end is not its actual gameplay clock')
    assert.equal(leaf(start)?.kind, 'wait', 'unclassified runtime timer')
    const consumed = runtimeHandoffs?.consumed.find((event) => event.waitId === start.waitId)
    if (consumed) {
      assert.equal(consumed.durationMs, leaf(start).ms, 'restored wait changed authored duration')
      assert.equal(consumed.kind, 'command', 'restored wait changed command kind')
      assert.equal(consumed.runId, start.runId, 'restored wait changed invocation')
      assert.equal(consumed.occurrence.id, start.occurrence.id, 'restored wait changed occurrence')
      assert.equal(start.ms, consumed.remainingMs, 'timer differs from proven consumed remainder')
    } else assert.equal(start.ms, leaf(start).ms, 'declared wait differs from actual timer')
    assert.equal(start.deadline, start.now + start.ms, 'timer deadline differs from declared wait')
    let deadline = start.deadline,
      remaining,
      eligible
    for (const event of events.filter((e) => e.order > start.order && e.order <= end.order)) {
      if (['wait-pause', 'wait-resume'].includes(event.phase) && event.waitId === start.waitId) {
        assert.equal(event.runId, start.runId, 'paused wait owner changed')
        assert.equal(event.occurrence?.id, start.occurrence?.id, 'paused wait command changed')
        assert.equal(event.now, event.clock.now, 'pause/resume clock differs')
        const owner = start.occurrence?.self
        assert(
          owner && start.occurrence.timing === 'auto',
          'only an owned automatic wait can pause',
        )
        const authority = events.findLast(
          (e) =>
            e.order < event.order &&
            e.phase === 'command' &&
            ['takeEntity', 'releaseEntity'].includes(leaf(e)?.kind) &&
            same(leaf(e).target, owner),
        )
        if (event.phase === 'wait-pause') {
          assert.equal(remaining, undefined, 'wait paused twice')
          assert.equal(eligible, undefined, 'wait paused after already becoming due')
          assert.equal(leaf(authority ?? {})?.kind, 'takeEntity', 'pause lacks entity take')
          assert.equal(
            event.remainingMs,
            Math.max(0, deadline - event.now),
            'pause lost remaining time',
          )
          remaining = event.remainingMs
        } else {
          assert.notEqual(remaining, undefined, 'resume lacks pause')
          assert.equal(leaf(authority ?? {})?.kind, 'releaseEntity', 'resume lacks entity release')
          assert.equal(event.deadline, event.now + remaining, 'resume restarted/consumed the wait')
          deadline = event.deadline
          remaining = undefined
        }
      }
      if (
        event.phase === 'clock' &&
        remaining === undefined &&
        !event.frozen &&
        event.now >= deadline
      )
        eligible ??= event
    }
    assert.equal(remaining, undefined, 'wait settled while paused')
    assert(eligible, 'no eligible wait frame')
    assert.equal(
      end.clock.frameId,
      eligible.clock.frameId,
      'wait resumed later than its first eligible frame',
    )
  } else if (start.type === 'frames') {
    assert.equal(
      end.clock.frameId,
      start.clock.frameId + start.frames,
      'frame wait lost/added a game update',
    )
  } else {
    assert(['redraw', 'delay'].includes(start.type), 'unclassified Game wait')
    const eligible = events.find(
      (event) =>
        event.phase === 'event-before' && event.order > start.order && event.atMs >= start.deadline,
    )
    assert(eligible, 'no eligible Game delay tick')
    assert.equal(
      end.clock.frameId,
      eligible.clock.frameId,
      'Game delay resumed after eligible tick',
    )
  }
  const firstDraw = worldRenders.find((draw) => draw.order > start.order)
  if (requirePresented)
    assert(firstDraw && firstDraw.order < end.order, 'wait pose never actually displayed')
  const resumed = events.find(
    (event) =>
      ['command', 'stage-settled', 'run-ended'].includes(event.phase) &&
      event.runId === start.runId &&
      event.order > end.order,
  )
  if (resumed?.phase === 'stage-settled') {
    assert.equal(resumed.engine, 'reforge', 'unclassified terminal receipt')
    assert.deepEqual(resumed.occurrence, start.occurrence, 'terminal belongs to another command')
    assert.deepEqual(resumed.self, start.occurrence.self, 'terminal owner changed')
    assert.equal(resumed.stage, start.occurrence.path[0], 'terminal stage changed')
    assert(terminalCursor, 'terminal lacks independently checked author successor')
    assert.deepEqual(resumed.cursor, terminalCursor, 'terminal author successor differs')
    assert.equal(resumed.decision, 'continue', 'terminal activation stopped or lost ownership')
    assert.equal(resumed.timing, start.occurrence.timing, 'terminal execution channel changed')
    assert.equal(resumed.scene, start.scene, 'terminal scene changed')
    assert.equal(resumed.sceneVisit, start.sceneVisit, 'terminal scene visit changed')
    assert.deepEqual(resumed.clock, end.clock, 'terminal missed settlement frame')
    const ended = events.find(
      (e) => e.phase === 'run-ended' && e.runId === start.runId && e.order > resumed.order,
    )
    const draw = worldRenders.find((e) => e.order > end.order)
    assert(
      ended && ended.aborted === false && draw && ended.order < draw.order,
      'terminal flow did not finish before first draw',
    )
  }
  const after = worldRenders.find((draw) => draw.order > end.order)
  if (resumed?.phase === 'run-ended') {
    assert.equal(start.engine, 'reforge', 'unclassified cancelled continuation')
    assert.equal(start.occurrence.timing, 'auto', 'only scene-owned auto can cancel at exit')
    assert.equal(resumed.aborted, true, 'missing normal stage settlement')
    assert.deepEqual(resumed.occurrence, start.occurrence, 'cancelled continuation command changed')
    assert(
      after && after.sceneVisit !== start.sceneVisit && after.scene !== start.scene,
      'cancelled auto still has same-scene draw',
    )
    assert.equal(
      resumed.clock.frameId,
      end.clock.frameId,
      'auto cancellation missed its settled frame',
    )
  }
  assert(resumed && after, 'ready continuation lacks command/draw')
  const wakeGate =
    resumed.order < after.order
      ? null
      : verifySettledWaitGate(start, end, resumed, events, worldRenders)
  return { start, end, firstDraw, resumed, after: wakeGate?.after ?? after, wakeGate }
}

/** A cold portrait load can span frames; only the actual matching IO lifetime permits it. */
export function verifyDialoguePreparation(command, opened, events, draws) {
  const context = (e) => [e.engine, e.scene, e.sceneVisit]
  assert.deepEqual(context(opened), context(command), 'dialogue opened in another scene/visit')
  const pending = draws.filter((draw) => draw.order > command.order && draw.order < opened.order)
  const io = events.filter(
    (event) =>
      ['io-start', 'io-wake', 'io-end'].includes(event.phase) &&
      event.runId === command.runId &&
      event.occurrence?.id === command.occurrence?.id,
  )
  if (!io.length) {
    assert.equal(
      opened.clock.frameId,
      command.clock.frameId,
      'dialogue opening delayed without IO evidence',
    )
    assert.equal(pending.length, 0, 'cached dialogue opening has unexplained frames')
    return { draws: pending.map((draw) => draw.order), io: null }
  }
  assert.deepEqual(
    io.map((event) => event.phase),
    ['io-start', 'io-wake', 'io-end'],
    'dialogue IO receipt incomplete/repeated',
  )
  const [start, wake, end] = io
  for (const event of io)
    assert.deepEqual(context(event), context(command), 'dialogue IO scene/visit changed')
  assert.deepEqual(
    start.io,
    { kind: 'dialog-portrait', asset: leaf(command).cue.portrait?.asset },
    'dialogue IO is for another resource',
  )
  assert.deepEqual(end.io, start.io, 'dialogue IO resource changed')
  assert.deepEqual(wake.io, start.io, 'dialogue IO wake belongs to another resource')
  assert(
    command.order < start.order &&
      start.order < wake.order &&
      wake.order < end.order &&
      end.order < opened.order,
    'dialogue IO lifetime differs',
  )
  assert.equal(start.clock.frameId, command.clock.frameId, 'dialogue IO started late')
  assert.equal(
    wake.clock.frameId,
    opened.clock.frameId,
    'ready dialogue missed first available frame',
  )
  assert(
    pending.every((draw) => draw.order > start.order && draw.order < wake.order),
    'ready dialogue missed first available draw',
  )
  return {
    draws: pending.map((draw) => draw.order),
    io: { start: start.order, wake: wake.order, end: end.order, asset: start.io.asset },
  }
}

/** Dialogue dwell is controlled by actual typing/consumption, never by total wall duration. */
export function verifyOpeningDialogue(events, worldRenders, pages, terminalSpecifications = []) {
  const commands = events.filter(
    (event) => event.phase === 'command' && leaf(event)?.kind === 'dialog',
  )
  assert(commands.length > 0, 'missing dialogue command receipts')
  assert(pages?.length > 0, 'missing rendered dialogue pages')
  const observations = [],
    consumedPages = new Set()
  let finiteRuns
  for (const command of commands) {
    const phases = events.filter(
      (event) =>
        event.phase === 'dialogue' &&
        event.runId === command.runId &&
        event.occurrence?.id === command.occurrence.id,
    )
    const opened = phases.find((event) => event.source === 'open' && event.after)
    assert(opened, 'dialogue never opened')
    const preparation = verifyDialoguePreparation(command, opened, events, worldRenders)
    assert.equal(opened.after.pageIndex, 0, 'dialogue did not start from first page')
    assert.deepEqual(
      opened.after.rowTextIds,
      leaf(command).cue.rows.map((row) => row.text),
      'dialogue command/page mismatch',
    )
    let current = opened.after
    let closed
    let automatic
    for (const event of phases) {
      if (event.order <= opened.order || !['advance', 'render'].includes(event.source)) continue
      assert.deepEqual(event.before, current, 'dialogue phase chain missing a transition')
      current = event.after
      if (event.source === 'render' && event.after === null) {
        const cue = leaf(command).cue
        assert(
          cue.slot === 'narration' &&
            Number.isFinite(cue.autoAdvance) &&
            cue.autoAdvance >= 0 &&
            event.before?.phase === 'auto-advance' &&
            event.before.pageCount === 1,
          'unclassified render-driven dialogue ending',
        )
        const deadline = event.before.pageStartedAtMs + cue.autoAdvance
        const frames = worldRenders.filter(
          (draw) => draw.order > opened.order && draw.order < event.order,
        )
        const due = frames.find((draw) => draw.atMs >= deadline)
        // World draw precedes DialogBox.render. This proves the displayed frame bracket,
        // not its unrecorded nowMs argument. A deadline crossed inside that gap is unknown.
        requireTrace(
          due &&
            due === frames.at(-1) &&
            due.causalFrame?.frameId === event.clock?.frameId &&
            frames.at(-2)?.atMs < deadline,
          'automatic-narration-deadline-frame',
          'first successful world presentation crossing authored deadline',
          { deadline, closingFrame: event.clock?.frameId, due: due?.order },
          'unknown',
        )
        const update = phases.filter(
          (e) => e.source === 'update' && same(e.before, event.before) && e.after === null,
        )
        assert.equal(update.length, 1, 'automatic narration lacks unique actual update')
        assert(
          due.order < update[0].order &&
            update[0].order < event.order &&
            update[0].clock?.frameId === event.clock?.frameId,
          'automatic narration ended outside its rendering update',
        )
        const rendered = pages.find(
          (page) =>
            page.order > opened.order && page.order < event.order && same(page.page, event.before),
        )
        assert(
          rendered && !consumedPages.has(rendered.order),
          'automatic narration lacks unique full-page witness',
        )
        consumedPages.add(rendered.order)
        automatic = {
          deadline,
          previousFrame: frames.at(-2).order,
          dueFrame: due.order,
          update: update[0].order,
        }
        closed = event
      }
      if (event.source !== 'advance') continue
      assert(event.before, 'input without an active dialogue')
      if (event.before.phase === 'typing') {
        assert(
          event.after && same(event.before.pageTextIds, event.after.pageTextIds),
          'skip-typing falsely consumed a page/dialogue end',
        )
      } else {
        assert.equal(event.before.phase, 'waiting-input', 'non-input dialogue ended through input')
        const rendered = pages.find(
          (page) =>
            page.order > opened.order && page.order < event.order && same(page.page, event.before),
        )
        assert(rendered, 'page consumption lacks a rendered full page')
        assert(!consumedPages.has(rendered.order), 'page consumed twice')
        consumedPages.add(rendered.order)
        if (event.before.pageIndex + 1 < event.before.pageCount) {
          assert(
            event.after &&
              event.after.pageIndex === event.before.pageIndex + 1 &&
              event.after.phase === 'typing',
            'page consumption skipped a page or ended early',
          )
        } else {
          assert.equal(event.after, null, 'last page did not end the dialogue')
          closed = event
        }
      }
    }
    assert(closed, 'dialogue lacks an actual input or authored automatic ending')
    const full = phases.find(
      (event) =>
        event.order < closed.order &&
        event.after?.phase === (automatic ? 'auto-advance' : 'waiting-input'),
    )
    assert(full, 'dialogue did not reach a rendered/consumed full-text state')
    const next = events.find(
      (event) =>
        event.phase === 'command' && event.runId === command.runId && event.order > closed.order,
    )
    const draw = worldRenders.find((event) => event.order > closed.order)
    let terminal
    if (!next) {
      finiteRuns ??= verifyFiniteScriptRuns(events, terminalSpecifications)
      const run = finiteRuns.find(
        (run) => run.runId === command.runId && run.command.order === command.order,
      )
      assert(run, 'terminal dialogue lacks complete canonical author execution')
      terminal = verifyScriptTerminalReceipt(command, events, worldRenders, {
        ready: closed,
        cursor: authoredTerminalCursor(run.stage),
        decision: 'continue',
      })
    }
    assert(
      draw && (next?.order ?? terminal?.ended) < draw.order,
      'dialogue continuation missed first available draw',
    )
    observations.push({
      command: command.order,
      opened: opened.order,
      full: full.order,
      closed: closed.order,
      resumed: next?.order ?? terminal.ended,
      ...(terminal ? { terminal } : {}),
      preparation,
      ...(automatic ? { automatic } : {}),
      rows: leaf(command).cue.rows.map((row) => row.text),
    })
  }
  assert.equal(
    consumedPages.size,
    pages.length,
    'rendered page has no dialogue command/consumption receipt',
  )
  // Historical recordings keep their old, narrower scope. New all-slot recordings must
  // pass the visible-lifetime gate as well; active=null alone never proves clearing.
  if (
    events.some(
      (event) =>
        event.dialoguePresentationVersion === 1 ||
        event.phase === 'dialogue-presentation' ||
        event.afterSlots,
    )
  )
    verifyDialoguePresentation(events, worldRenders)
  return observations
}

/** Check each actual Game confirmation against its own input-dispatch interval. */
export function verifyOpeningGameDialogue(events) {
  const inputs = events.filter((event) => event.phase === 'dialog-input')
  const consumed = new Set()
  for (const before of events.filter(
    (event) =>
      event.phase === 'event-before' &&
      event.waiting === 'dialog' &&
      event.dialogue &&
      (event.dialogue.phase === 'typing'
        ? event.pressed.some((key) => ['Confirm', 'Menu'].includes(key))
        : event.pressed.length > 0),
  )) {
    const after = events.find(
      (event) => event.phase === 'event-after' && event.order > before.order,
    )
    assert(after, 'Game dialogue input lacks its dispatch completion')
    const actual = inputs.filter((event) => event.order > before.order && event.order < after.order)
    assert.equal(actual.length, 1, 'Game dialogue input missing/duplicate consumption')
    const input = actual[0]
    assert.equal(input.runId, before.runId, 'Game dialogue input changed owner')
    assert.equal(
      input.clock.frameId,
      before.clock.frameId,
      'Game dialogue input left its dispatch frame',
    )
    const expected = { 'waiting-page-key': 'page-advance', 'waiting-end-key': 'dialog-end' }[
      before.dialogue.phase
    ]
    if (expected) assert.equal(input.result, expected, 'Game dialogue consumed wrong phase')
    else
      assert(
        ['skip-typing', 'noop', 'page-advance', 'dialog-end'].includes(input.result),
        'unknown Game dialogue result',
      )
    consumed.add(input.order)
  }
  assert(inputs.length > 0 && consumed.size === inputs.length, 'Game dialogue input is unpaired')
  return inputs.map(({ order, result }) => ({ order, result }))
}

/** 001's explicit choreography contract. Source waits become either fixed beats or
 * awaited motion milestones; equal dwell totals cannot compensate a missing authored beat.
 */
export function compareOpeningHoldIntent(game, reforge, { renders, moves, position }) {
  const a = room(game),
    b = room(reforge)
  if (!a.length || !b.length)
    return { status: 'missing', reason: 'record current causal observations' }
  const result = {
    status: 'needs-review',
    fixedWaits: [],
    motionMilestones: [],
    dialogues: [],
    errors: [],
  }
  try {
    result.terminals = verifyOpeningRoomTerminals(reforge)
    const clocks = (trace) => trace.worldRenders.filter((event) => event.scene === 's001')
    for (const trace of [game, reforge]) verifyOpeningDrawClocks(trace.causes, clocks(trace))
    const waits = (events, trace) =>
      events
        .filter((event) => event.phase === 'wait-start')
        .map((start) => verifyOpeningWaitReceipt(start, events, clocks(trace)))
    const ga = waits(a, game),
      rb = waits(b, reforge)
    const moving = [],
      fixed = []
    for (const receipt of ga) {
      const changes = moves(game, 'e10', 's001').filter(
        (event) => event.order > receipt.start.order && event.order < receipt.end.order,
      )
      ;(changes.length ? moving : fixed).push({ ...receipt, changes })
    }
    // Source L_3649/3652/3656/3662: let aunt walk, change clothes, ask, turn/reply, then follow.
    // The new author waits for movement itself; these are not discarded timer observations.
    const expected = [
      [-23, -20, 8],
      [-20, -18.5, 4],
      [-18.5, -17, 4],
      [-17, -12.5, 12],
    ]
    assert.equal(moving.length, expected.length, 'unclassified moving wait')
    const motions = b.filter(
      (event) =>
        event.phase === 'command' &&
        event.occurrence?.self === null &&
        leaf(event)?.kind === 'moveEntity' &&
        leaf(event).target?.entity === 'e10',
    )
    assert.equal(motions.length, 4, 'missing/extra aunt motion milestone')
    result.motionCadence = []
    const allMoves = moves(reforge, 'e10', 's001')
    for (const [index, receipt] of moving.entries()) {
      const [from, to, ticks] = expected[index],
        motion = motions[index],
        target = leaf(motion).to
      assert.deepEqual(position(receipt.start.poses.e10.state.position), [60, from])
      assert.deepEqual(position(receipt.end.poses.e10.state.position), [60, to])
      assert.equal(receipt.start.frames, ticks)
      assert.equal(receipt.changes.length, ticks, 'original motion beat missing')
      assert.deepEqual(position(motion.poses.e10.state.position), [60, from])
      assert.deepEqual([target.col, target.row, target.height], [60, index === 3 ? -12.875 : to, 0])
      assert.equal(leaf(motion).speed, 'normal')
      const next = b.find(
        (event) =>
          event.phase === 'command' && event.runId === motion.runId && event.order > motion.order,
      )
      assert(next, 'motion has no actual continuation')
      result.motionCadence.push(
        verifyOpeningMotionCadence(
          reforge.causes,
          clocks(reforge),
          allMoves,
          motion.order,
          next.order,
        ),
      )
      result.motionMilestones.push({
        gameWait: receipt.start.order,
        reforgeCommand: motion.order,
        from: [60, from],
        to: [60, to],
        responsibility:
          index === 3
            ? 'release before next batch; party and aunt start together'
            : 'await actual movement',
      })
    }
    const party = moves(reforge, 'party', 's001').find((event) => event.order > motions[3].order)
    const together =
      party && renders(reforge, 'e10', 's001').find((event) => event.order > party.order)
    assert(
      together && same(together.position, [60, -12.5]) && together.frame === 0 && together.visible,
      'party did not begin in the intended aunt movement batch',
    )
    const release = b.find(
      (event) =>
        event.phase === 'command' &&
        event.order > motions[3].order &&
        leaf(event)?.kind === 'releaseEntity' &&
        leaf(event).target?.entity === 'e10',
    )
    assert(release, 'missing explicit aunt release')
    result.motionCadence.push(
      verifyOpeningMotionCadence(
        reforge.causes,
        clocks(reforge),
        allMoves,
        release.order,
        allMoves.at(-1).order,
      ),
    )
    assert.equal(
      result.motionCadence.reduce((sum, part) => sum + part.steps, 0),
      allMoves.length,
      'unclassified aunt motion',
    )
    const rfFixed = rb.filter(({ start }) => start.occurrence?.self === null)
    assert.equal(fixed.length, rfFixed.length, 'fixed pose beat missing/added')
    for (const [index, left] of fixed.entries()) {
      const right = rfFixed[index]
      const ms =
        left.start.type === 'frames'
          ? left.start.frames * 100
          : left.start.type === 'redraw' && left.start.ms === 60
            ? 100
            : left.start.ms
      assert.equal(right.start.ms, ms, `fixed beat ${index}: declared timing differs`)
      const poses = {}
      for (const id of ['e8', 'e10', 'e11']) {
        const l = renders(game, id, 's001').find((event) => event.order > left.start.order)
        const r = renders(reforge, id, 's001').find((event) => event.order > right.start.order)
        assert(l && r, `beat ${index}: ${id} draw missing`)
        const pose = (e) => ({
          position: e.position,
          facing: e.facing,
          frame: e.frame,
          visible: e.visible,
        })
        assert.deepEqual(
          pose(l),
          pose(r),
          `beat ${index}: ${id} wait belongs to a different displayed pose`,
        )
        poses[id] = { game: l.order, reforge: r.order, pose: pose(l) }
      }
      result.fixedWaits.push({
        game: left.start.order,
        reforge: right.start.order,
        ms,
        source:
          left.start.type === 'redraw'
            ? '60ms source redraw represented by one 100ms author beat'
            : 'source frame wait × 100ms',
        poses,
      })
    }
    const automatic = rb.filter(({ start }) => start.occurrence?.self !== null)
    assert.equal(automatic.length, 2, 'unexpected automatic waits')
    assert(
      automatic.every(({ start }) => start.ms === 100 && start.occurrence?.self?.entity === 'e10'),
      'aunt exit/visibility beats changed',
    )
    result.dialogues = verifyOpeningDialogue(
      b,
      clocks(reforge),
      reforge.pages.filter((event) => event.scene === 's001'),
    )
    result.gameDialogueInputs = verifyOpeningGameDialogue(a)
    result.status = 'passed'
  } catch (error) {
    result.errors.push(error.message)
  }
  return result
}
