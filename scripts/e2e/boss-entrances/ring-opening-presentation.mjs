import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  compareRenderedDialogue,
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'

const scene = 's032'

export function readRingOpening(commands) {
  const raw = (ip, opcode) => {
    assert.equal(commands[ip].opcode, opcode)
    return commands[ip].operands
  }
  const signed = (word) => (word << 16) >> 16
  const [dx, dy, steps] = raw(7752, 0x7f).map(signed)
  assert.equal(raw(7750, 0x15)[2], 1)
  const turnFrames = [7812, 7814, 7816, 7818].map((ip) => {
    const [id, direction, frame] = raw(ip, 0x16)
    assert.equal(id, 549)
    return direction * 3 + frame
  })
  raw(7815, 0x05)
  const turnBeats = [raw(7813, 0x09)[0], 1, raw(7817, 0x09)[0]]
  const pages = sourceDialogueGroups(commands, [
    { scene, first: 7746, last: 7749 },
    { scene, first: 7808, last: 7810 },
    { scene, first: 7820, last: 7823 },
  ])
  return { dx, dy, steps, turnFrames, turnBeats, pages }
}

export function inspectRingOpening({ events, draws, launch, expected, locale }) {
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const normalized = (text) => text.replace(/\s/gu, '')
  const selectedPages = expected.pages.map(({ rows }) =>
    normalized(rows.map(({ text }) => text).join('')),
  )
  const dialogue = compareRenderedDialogue(
    draws
      .filter(({ atMs, scene: id }) => id === scene && atMs < launch.atMs)
      .map((draw) => ({
        ...draw,
        slots: draw.slots.filter(({ lines }) => selectedPages.includes(normalized(lines.join('')))),
      })),
    expected.pages,
    locale,
  )
  issues.push(...dialogue.findings)
  const [panCue, dismiss, challenge] =
    dialogue.checked?.map(({ firstComplete }) => firstComplete) ?? []
  const world = events.filter(
    ({ kind, scene: id, visible }) => kind === 'world-drawn' && id === scene && visible,
  )
  const origin = world.findLast(({ atMs }) => atMs <= panCue?.atMs)
  const pan = []
  for (const frame of world) {
    if (!origin || frame.atMs <= panCue.atMs || frame.atMs >= dismiss?.atMs) continue
    if (!isDeepStrictEqual(pan.at(-1)?.camera ?? origin.camera, frame.camera)) pan.push(frame)
  }
  const [x, y] = origin?.camera ?? []
  check(
    'every drawn opening camera step follows the source pan',
    pan.map(({ camera }) => camera),
    Array.from({ length: expected.steps }, (_, i) => [
      x + (i + 1) * expected.dx,
      y + (i + 1) * expected.dy,
    ]),
  )
  const cleared = inspectClearedDialogueFrames(draws, pan, scene)
  check('the dialogue and portrait are cleared on every panning frame', cleared.issue, null)

  const turns = []
  for (const frame of world) {
    if (frame.atMs <= dismiss?.atMs || frame.atMs >= challenge?.atMs) continue
    const yueru = frame.actors.e548
    if (yueru && turns.at(-1)?.frame !== yueru.frame)
      turns.push({ atMs: frame.atMs, order: frame.order, ...yueru })
  }
  check(
    'Lin Yueru draws all four standing poses before challenging the audience',
    turns.map(({ frame, facing, position }) => [frame, facing, position]),
    expected.turnFrames.map((frame) => [
      frame,
      ['down', 'left', 'up', 'right'][frame / 3],
      [1088, 688],
    ]),
  )
  const turnIntervals = turns.slice(1).map(({ atMs }, i) => atMs - turns[i].atMs)
  check(
    'each turn holds for the original world beats',
    turnIntervals.map((ms, i) => Math.abs(ms - 100 * expected.turnBeats[i]) <= 55),
    expected.turnBeats.map(() => true),
  )
  check(
    'the four turns draw without a retained dialogue slot',
    inspectClearedDialogueFrames(draws, turns, scene).issue,
    null,
  )
  return {
    issues,
    dialogue,
    cleared,
    origin: origin?.camera,
    pan: pan.map(({ atMs, camera, order }) => ({ atMs, camera, order })),
    turns,
    turnIntervals,
  }
}
