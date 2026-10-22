// Directed real event ticks from legal scene-script cursors; not full-game E2E.
import assert from 'node:assert/strict'
import { createCommandBus } from '../../../../packages/game/src/core/command-bus.ts'
import { tickEventSystem } from '../../../../packages/game/src/core/event-system.ts'
import {
  createInitialGameState,
  npcFromEventObject,
} from '../../../../packages/game/src/core/game-state.ts'
import { setGlobalEvents } from '../../../../packages/game/src/core/script-catalog.ts'
import { originalScripts } from './raw-source.mjs'

const { commands: base, objects } = originalScripts()
let now = 0
Object.defineProperty(performance, 'now', { value: () => now, configurable: true })
function environment(commands) {
  const gs = createInitialGameState({ x: 1280, y: 640, facing: 'up' })
  gs.allEventObjects = objects.map((e) => npcFromEventObject(e))
  const bus = createCommandBus()
  setGlobalEvents(structuredClone(commands))
  return { gs, bus }
}
function ticks(env, ip, owner, stopAt, denies = 0) {
  const { gs, bus } = env,
    lines = [],
    actions = []
  let previous = ''
  let choices = 0
  gs.eventCursor = { ip, currentEventObjectId: owner, triggerOwnerId: owner }
  gs.mode = 'event'
  for (let frame = 0; frame < 5000 && gs.mode === 'event'; frame++) {
    if (gs.eventCursor?.ip === stopAt) break
    now += 1000
    gs.nowMs = now
    const isQuestion = gs.eventCursor?.waiting === 'confirm'
    const key = isQuestion && choices < denies ? 'Cancel' : 'Confirm'
    const pressed = new Set([key])
    if (isQuestion) {
      if (choices >= denies && !gs.eventCursor.confirmYes) pressed.add('Right')
      choices++
    }
    tickEventSystem(gs, { held: new Set(), pressed, frameNum: frame }, bus)
    const line = gs.dialogBox?.currentLineText
    if (line && line !== previous) {
      lines.push(line)
      previous = line
    }
    actions.push(...bus.drain())
    if (gs.eventCursor?.ip >= 14487 && gs.eventCursor?.ip < 14500 && stopAt === 14487) break
  }
  assert.ok(
    gs.mode !== 'event' || gs.eventCursor?.ip >= stopAt,
    `bounded event completion ${JSON.stringify(gs.eventCursor)}`,
  )
  return { lines, choices, actions: actions.filter((c) => ['playSound'].includes(c.type)) }
}
function court(commands) {
  const env = environment(commands)
  return ticks(env, 14457, 1518, 14487, 2)
}
const candidate = structuredClone(base)
candidate[14461] = { op: 'goto', to: 'L_14465' }
candidate[14465].label = 'L_14465'
const tail = candidate.length
candidate.push(
  { op: 'raw', opcode: 5, operands: [0, 0, 0], label: `L_${tail}` },
  { op: 'goto', to: 'L_14462' },
  { op: 'end' },
)
candidate[14462].label = 'L_14462'
candidate[14486].operands = [tail, 0, 0]
const courts = { before: court(base), candidate: court(candidate) }
function gates(commands, first) {
  const env = environment(commands)
  ticks(env, 14971, 1518)
  const ids = [first, ...[1599, 1600, 1601].filter((x) => x !== first), first]
  return ids.map((id) => {
    const n = env.gs.allEventObjects[id]
    const ip = n.triggerResume?.ip ?? Number(n.triggerLabel.slice(2))
    const result = ticks(env, ip, id)
    return {
      id,
      ip,
      lines: result.lines,
      gateX: env.gs.allEventObjects[1599].x,
      entries: [1599, 1600, 1601].map((j) => {
        const npc = env.gs.allEventObjects[j]
        return npc.triggerResume?.ip ?? Number(npc.triggerLabel.slice(2))
      }),
    }
  })
}
const gateCandidate = structuredClone(base)
// The supplied patch splits three otherwise shared entry blocks to avoid self-reassignment.
gateCandidate[14995].operands = [1601, 14999, 0]
for (const [callerIp, other] of [
  [14972, 1602],
  [14973, 1601],
]) {
  const entry = gateCandidate.length
  gateCandidate[callerIp].operands[1] = entry
  gateCandidate.push(
    ...structuredClone(base.slice(14990, 14995)),
    { op: 'raw', opcode: 37, operands: [1600, 14999, 0] },
    { op: 'raw', opcode: 37, operands: [other, 14999, 0] },
    { op: 'end', advance: true },
    { op: 'goto', to: 'L_14999' },
    { op: 'end' },
  )
  gateCandidate[entry].label = `L_${entry}`
}
const guardResults = [1599, 1600, 1601].map((first) => {
  const before = gates(base, first),
    candidate = gates(gateCandidate, first)
  const observable = (rows) => rows.map(({ id, lines, gateX }) => ({ id, lines, gateX }))
  assert.deepEqual(observable(candidate), observable(before))
  return { first, sameObservableBehavior: true, before, candidate }
})
console.log(
  JSON.stringify(
    {
      kind: 'directed-production-event-tick-diagnosis',
      limits: [
        'Cursors are isolated legal script boundaries, not provenance-linked full-play checkpoints.',
        'No visual/E2E acceptance.',
      ],
      courts,
      guardResults,
    },
    null,
    2,
  ),
)
