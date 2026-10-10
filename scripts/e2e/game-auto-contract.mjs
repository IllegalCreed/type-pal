import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import original from '../../data/extracted/events/all.json' with { type: 'json' }

/** Scheduler census is separate from opcode semantics: even an entire lost invocation
 * must fail before its absent poses can be mistaken for a legitimate standing hold. */
export function verifyGameAutoBatches(
  trace,
  commands = original.segments[0].commands,
  { requireCaller = true } = {},
) {
  const events = trace.causes,
    results = []
  if (requireCaller) verifyGameAutoCallers(events)
  let owed = null,
    batch = null,
    visit = null,
    call = null
  const finishVisit = () => {
    if (!visit) return
    const blocked =
      visit.state <= 0 ||
      visit.vanish !== 0 ||
      (visit.actor === visit.triggerOwner && visit.waiting === null && !visit.startedExecution)
    const entry =
      visit.ip ??
      (visit.label ? commands.findIndex((command) => command.label === visit.label) : null)
    const eligible = !blocked && entry !== null && entry >= 0
    assert.equal(
      visit.called,
      eligible,
      `Game e${visit.actor}: omitted/extra eligible automatic invocation`,
    )
    if (!blocked && visit.ip === null && visit.label) {
      assert(visit.resolution, 'automatic label lookup unrecorded')
      assert.equal(
        visit.resolution.resolvedIp,
        entry < 0 ? null : entry,
        'automatic label resolved incorrectly',
      )
    }
    visit = null
  }
  for (const event of events) {
    if (event.phase === 'auto-owed') {
      assert(!owed && !batch, 'overlapping automatic caller')
      owed = event
    }
    if (event.phase === 'auto-batch-start') {
      assert(!batch, 'nested Game automatic batch')
      if (requireCaller)
        assert(
          owed && owed.order < event.order && owed.sceneVisit === event.sceneVisit,
          'automatic batch lacks actual caller',
        )
      assert.equal(
        event.commandsReady,
        commands.length > 0,
        'automatic batch source readiness changed',
      )
      assert.equal(new Set(event.npcIds).size, event.npcIds.length, 'automatic batch duplicate NPC')
      batch = { start: event, visits: [], calls: [] }
      owed = null
    }
    if (event.phase === 'auto-visit') {
      assert(batch && !call && event.batchId === batch.start.batchId, 'NPC visit outside its batch')
      finishVisit()
      assert.equal(
        event.actor,
        batch.start.npcIds[batch.visits.length],
        'automatic NPC census reordered/lost',
      )
      visit = { ...event, called: false }
      batch.visits.push(event.actor)
    }
    if (event.phase === 'auto-resolved') {
      assert(visit && !visit.resolution && event.actor === visit.actor, 'unowned label resolution')
      visit.resolution = event
    }
    if (event.phase === 'auto-before') {
      assert(
        visit && !visit.called && !call && event.actor === visit.actor,
        'automatic invocation outside unique NPC visit',
      )
      assert.equal(
        event.before.ip,
        visit.ip ?? visit.resolution?.resolvedIp,
        'automatic entry differs from cursor/resolver',
      )
      visit.called = true
      call = { start: event, commands: [] }
    }
    if (event.phase === 'command' && event.channel === 'auto') {
      assert(
        call && event.autoCallId === call.start.autoCallId && event.runId === call.start.runId,
        'automatic dispatch outside its invocation',
      )
      assert.deepEqual(
        event.occurrence.command,
        commands[event.occurrence.ip],
        'automatic dispatch differs from primary source',
      )
      call.commands.push(event)
    }
    if (event.phase === 'auto-step') {
      assert(
        call && event.autoCallId === call.start.autoCallId && event.runId === call.start.runId,
        'automatic end lacks same invocation',
      )
      assert.deepEqual(event.before, call.start.before, 'automatic call origin changed')
      batch.calls.push({ ...call, end: event })
      call = null
    }
    if (event.phase === 'auto-batch-end') {
      assert(
        batch && !call && !event.failed && event.batchId === batch.start.batchId,
        'automatic batch did not complete',
      )
      finishVisit()
      assert.deepEqual(
        batch.visits,
        batch.start.commandsReady ? batch.start.npcIds : [],
        'automatic batch NPC census incomplete',
      )
      results.push({ ...batch, end: event })
      batch = null
    }
  }
  assert(!owed && !batch && !visit && !call, 'automatic batch evidence ends mid-call')
  return results
}

/** Derive obligations before either caller's gates, not from whether its branch ran. */
export function verifyGameAutoCallers(events) {
  let eventDecision = null,
    explore = null
  const closeEvent = () => {
    if (eventDecision)
      assert.equal(
        eventDecision.called,
        !eventDecision.sceneLoading &&
          eventDecision.mode === 'event' &&
          [null, 'frame-wait', 'scene-fade', 'camera-pan'].includes(eventDecision.waiting),
        'event automatic caller skipped/added',
      )
    eventDecision = null
  }
  for (const event of events) {
    if (event.phase === 'auto-event-decision') {
      closeEvent()
      eventDecision = { ...event, called: false }
    }
    if (event.phase === 'auto-explore-start') {
      assert(!explore, 'overlapping explore automatic decision')
      explore = { ...event, called: false, triggered: null }
    }
    if (event.phase === 'auto-explore-triggered') {
      assert(
        explore &&
          !explore.triggered &&
          !explore.suppress &&
          !explore.sceneLoading &&
          !explore.paletteFade,
        'unexpected exploration trigger scan',
      )
      explore.triggered = event
    }
    if (event.phase === 'auto-owed') {
      const decision =
        event.caller === 'event' ? eventDecision : event.caller === 'explore' ? explore : null
      assert(decision && !decision.called, 'automatic call lacks unique gate decision')
      assert.equal(event.sceneVisit, decision.sceneVisit, 'automatic caller changed scene visit')
      decision.called = true
    }
    if (event.phase === 'auto-explore-end') {
      assert(explore, 'exploration automatic decision lacks entry')
      const blocked = explore.sceneLoading || explore.paletteFade
      assert.equal(
        !!explore.triggered,
        !blocked && !explore.suppress,
        'exploration trigger decision evidence missing/extra',
      )
      assert.equal(
        explore.called,
        !blocked && (explore.suppress || explore.triggered.mode === 'explore'),
        'exploration automatic caller skipped/added',
      )
      explore = null
    }
  }
  closeEvent()
  assert(!explore, 'exploration automatic decision lacks exit')
  for (const clock of events.filter((event) => event.phase === 'clock')) {
    assert.equal(
      events.filter((event) => event.phase === 'auto-event-decision' && event.tick === clock.tick)
        .length,
      1,
      'Game frame lacks unique automatic decision',
    )
    const dispatches = events.filter(
      (event) => event.phase === 'auto-mode-dispatch' && event.tick === clock.tick,
    )
    assert.equal(dispatches.length, 1, 'Game frame lacks unique mode dispatch')
    assert.equal(
      events.filter((event) => event.phase === 'auto-explore-start' && event.tick === clock.tick)
        .length,
      Number(dispatches[0].mode === 'explore'),
      'Game explore dispatch missing/extra',
    )
  }
}

const directions = ['down', 'left', 'up', 'right'],
  signed = (n) => (n > 32767 ? n - 65536 : n)
/** Finite, independently interpreted 004–006 source automatic domain. Unsupported
 * opcodes reject; actual post-state is never used to manufacture an expected state. */
export function verifyGameAutoCycles(
  trace,
  participants,
  batches,
  commands = original.segments[0].commands,
) {
  const result = []
  for (const { calls } of batches)
    for (const call of calls) {
      assert(
        trace.causes.includes(call.start) && trace.causes.includes(call.end),
        'automatic proof detached from source trace',
      )
      const start = call.start,
        end = call.end,
        id = `e${start.actor}`
      if (!participants.some((actor) => actor.entity === id && actor.scene === start.scene))
        continue
      let expected = structuredClone(start.before),
        executed = []
      const alternatives = []
      let completed = true
      const advanceFrame = () => {
        const n = expected.layout === 3 ? 4 : expected.layout || expected.autoFrames
        expected.frame = n ? (expected.frame + 1) % n : expected.frame
      }
      for (let budget = 0; budget < 256; budget++) {
        if (executed.length >= call.commands.length) {
          completed = false
          break
        }
        const ip = expected.ip,
          command = commands[ip]
        assert(command, 'automatic source instruction missing')
        executed.push(ip)
        if (command.op === 'end') {
          if (command.advance) expected.ip++
          else if (command.reset) {
            const n = command.idleFrames ?? 0
            if (n) expected.idle++
            if (!n || expected.idle < n)
              expected.ip = commands.findIndex((c) => c.label === `L_${command.resetTo}`)
            else {
              expected.idle = 0
              expected.ip++
            }
          }
          break
        }
        if (command.op === 'goto') {
          const n = command.frameDelay ?? 0
          if (n) expected.idle++
          if (n && expected.idle >= n) {
            expected.idle = 0
            expected.ip++
            break
          }
          expected.ip = commands.findIndex((c) => c.label === command.to)
          assert(expected.ip >= 0, 'auto goto target missing')
          assert(budget < 255, 'automatic source jump proof budget exceeded')
          continue
        }
        assert.equal(command.op, 'raw', 'unclassified automatic source operation')
        const op = command.opcode,
          [a, b, c] = command.operands
        if (op === 6) {
          // No RNG sample is recorded: prove membership in the independently defined
          // legal transition relation, not the actual sample or its distribution.
          // RandomLong(1,100) < a advances and ends this invocation.
          if (a > 1)
            alternatives.push({ after: { ...expected, ip: ip + 1 }, commands: [...executed] })
          if (a > 100) {
            completed = false
            break
          }
          // The >= a branch either parks or dispatches the target in this SAME call.
          if (!b) break
          const target = commands.findIndex((entry) => entry.label === `L_${b}`)
          expected.ip = target < 0 ? b : target
          assert(budget < 255, 'automatic source jump proof budget exceeded')
          continue
        }
        if (op === 9) {
          expected.idle++
          if (expected.idle >= (a || 1)) {
            expected.idle = 0
            expected.ip++
          }
          break
        }
        if (op === 0x10 || op === 0x11) {
          if (op === 0x11 && (((start.actor + 1) & 1) ^ (start.tick & 1)) === 0) break
          const to = [a * 32 + c * 16, b * 16 + c * 8],
            dx = to[0] - expected.position[0],
            dy = to[1] - expected.position[1],
            speed = op === 0x10 ? 3 : 2
          expected.facing = dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
          if (Math.abs(dx) < speed * 2 || Math.abs(dy) < speed * 2) expected.position = to
          else {
            expected.position = [
              expected.position[0] + Math.sign(dx) * speed * 2,
              expected.position[1] + Math.sign(dy) * speed,
            ]
            advanceFrame()
          }
          if (expected.position[0] === to[0] && expected.position[1] === to[1]) {
            expected.frame = 0
            expected.ip++
          }
          break
        }
        if (op >= 0xb && op <= 0xe) {
          const delta = [
            [-4, 2],
            [-4, -2],
            [4, -2],
            [4, 2],
          ][op - 0xb]
          expected.position = expected.position.map((v, i) => v + delta[i])
          expected.facing = directions[op - 0xb]
          advanceFrame()
        } else if (op === 0x87) {
          assert(
            [0, 65535, start.actor + 1].includes(a),
            'cross-target source animation requires target proof',
          )
          advanceFrame()
        } else if (op === 0xf) {
          if (a !== 65535) expected.facing = directions[a]
          if (b !== 65535) expected.frame = b
        } else if (op === 0x14) {
          expected.frame = a
          expected.facing = 'down'
        } else if (op === 0x6c || op === 0x7d) {
          assert(
            [0, 65535, start.actor + 1].includes(a),
            'cross-target source nudge requires target proof',
          )
          expected.position = [expected.position[0] + signed(b), expected.position[1] + signed(c)]
          if (op === 0x6c) advanceFrame()
        } else if (op === 0x6f) {
          const target = `e${a === 0 || a === 65535 ? start.actor : a - 1}`,
            input = start.poses?.[target]?.state?.state,
            own = start.poses?.[id]?.state?.state
          assert(
            Number.isInteger(input) && Number.isInteger(own),
            'automatic state sync lacks source state',
          )
          assert.equal(
            end.poses?.[id]?.state?.state,
            input === signed(b) ? signed(b) : own,
            'automatic conditional state synchronization differs',
          )
        } else if (op === 0x24) {
          if (a !== 0) {
            const receipts = trace.causes.filter(
              (event) =>
                event.phase === 'auto-selection-committed' &&
                event.autoCallId === start.autoCallId &&
                event.batchId === start.batchId &&
                event.order > start.order &&
                event.order < end.order,
            )
            assert.equal(receipts.length, 1, 'automatic selection lacks unique actual setter')
            const receipt = receipts[0],
              target = a === 65535 ? start.actor : a - 1,
              resolved = commands.findIndex((value) => value.label === `L_${b}`)
            assert.equal(receipt.sceneVisit, start.sceneVisit, 'automatic selection changed visit')
            assert.equal(receipt.entity, target, 'automatic selection targets another actor')
            assert.equal(receipt.operand, a, 'automatic selection operand differs')
            assert.equal(receipt.entry, b, 'automatic selection entry differs')
            assert.equal(receipt.label, b ? `L_${b}` : null, 'automatic selection label differs')
            assert.deepEqual(
              receipt.cursor,
              b && resolved >= 0 ? { ip: resolved } : null,
              'automatic selection did not reset its actual target cursor',
            )
          }
        } else assert.equal(op, 0x49, `unclassified automatic source opcode ${op}`)
        expected.ip++
        break
      }
      if (completed) alternatives.push({ after: expected, commands: executed })
      const actualCommands = call.commands.map((e) => e.occurrence.ip)
      const matchingCommands = alternatives.filter((candidate) =>
        isDeepStrictEqual(candidate.commands, actualCommands),
      )
      assert(matchingCommands.length, 'automatic goto/dispatch skipped or added a frame')
      const matched = matchingCommands.find((candidate) =>
        isDeepStrictEqual(candidate.after, end.after),
      )
      assert(matched, `${id}: automatic source state/pose differs`)
      expected = matched.after
      executed = matched.commands
      assert.deepEqual(end.after, expected, `${id}: automatic source state/pose differs`)
      const pose = end.poses?.[id]?.state
      assert(pose, 'automatic source call lacks state observation')
      assert.deepEqual(
        pose.position,
        expected.position,
        'automatic source position detached from state',
      )
      assert.equal(
        pose.localFrame ?? pose.scriptedFrame ?? pose.frame,
        expected.frame,
        'automatic source frame detached from state',
      )
      assert.equal(pose.facing, expected.facing, 'automatic source facing detached from state')
      result.push({
        scene: start.scene,
        sceneVisit: start.sceneVisit,
        actor: id,
        from: start.order,
        to: end.order,
        commands: executed,
        before: start.before,
        after: expected,
      })
    }
  return result
}
