import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import authorInn from '../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import { verifyInnWaitPlan, verifyInnWaitRegistrations } from './inn-timing-intent.mjs'

test('reception wait plan preserves source units, order and every presentation beat', () => {
  const commands = JSON.parse(
    readFileSync(new URL('../../data/extracted/events/all.json', import.meta.url)),
  ).segments[0].commands
  const waits = [290, 291, 293, 295, 296, 298, 303, 308, 312, 343, 346, 348].map((ip) => {
    const command = commands[ip]
    assert.equal(command.op, 'raw')
    if (command.opcode === 5) return { occurrence: { ip, command }, type: 'redraw', ms: 60 }
    if (command.opcode === 0x85)
      return { occurrence: { ip, command }, type: 'delay', ms: command.operands[0] * 80 }
    assert.equal(command.opcode, 9)
    return { occurrence: { ip, command }, type: 'frames', frames: command.operands[0] || 1 }
  })
  const durations = [100, 320, 100, 100, 320, 100, 100, 1000, 1500, 100, 800, 100]
  const rf = durations.map((ms) => ({ ms }))
  assert.equal(verifyInnWaitPlan(waits, rf).length, 12)
  for (const index of [0, 7, 8, 10, 11]) {
    const wrong = structuredClone(rf)
    wrong[index].ms *= 0.4
    assert.throws(() => verifyInnWaitPlan(waits, wrong), /wrong duration/u)
  }
  assert.throws(() => verifyInnWaitPlan(waits, rf.slice(1)), /missing\/added/u)
  const wrongSource = structuredClone(waits)
  wrongSource[0].occurrence.ip++
  assert.throws(() => verifyInnWaitPlan(wrongSource, rf), /source reception wait plan changed/u)
  const wrongOpcode = structuredClone(waits)
  wrongOpcode[0].occurrence.command.opcode = 0x85
  assert.throws(() => verifyInnWaitPlan(wrongOpcode, rf), /source wait opcode differs/u)
})

test('every executed reception wait has one registration with the same occurrence and actual clock', () => {
  const flow = authorInn.entities.find((entity) => entity.id === 'e60').behaviors.auto['legacy-003']
    .flow
  const events = flow.stages[0].body.flatMap((command, index) => {
    const occurrence = {
      id: index,
      self: { scene: 's003', entity: 'e60' },
      timing: 'auto',
      path: [flow.initial, index],
      command: command.kind === 'finishStep' ? command : { kind: 'leaf', command },
    }
    const commandEvent = { phase: 'command', runId: 1, occurrence }
    return command.kind === 'wait'
      ? [commandEvent, { phase: 'wait-start', runId: 1, occurrence, now: 500, clock: { now: 500 } }]
      : [commandEvent]
  })
  const verify = (copy) =>
    verifyInnWaitRegistrations(
      copy,
      copy.filter((e) => e.phase === 'command'),
    )
  verify(events)
  for (const mutate of [
    (copy) => {
      copy.splice(
        copy.findIndex((event) => event.phase === 'wait-start'),
        1,
      )
    },
    (copy) => {
      copy.find((event) => event.phase === 'wait-start').now = -500
    },
    (copy) => {
      copy.push(structuredClone(copy.find((e) => e.phase === 'wait-start')))
    },
    (copy) => {
      const start = copy.find((e) => e.phase === 'wait-start')
      start.occurrence = { ...start.occurrence, id: 9999 }
    },
  ]) {
    const copy = structuredClone(events)
    mutate(copy)
    assert.throws(() => verify(copy))
  }
})
