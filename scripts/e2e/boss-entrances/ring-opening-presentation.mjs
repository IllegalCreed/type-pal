import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  compareRenderedDialogue,
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'

const scene = 's032'

export function readRingOpening(commands, actors) {
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
  const sourceActor = (id) => {
    const { spriteNum: asset, x, y } = actors.find((actor) => actor.id === id)
    return { asset, position: [x, y] }
  }
  const interlocutor = actors.find(({ id }) => id === 550)
  assert.equal(interlocutor.triggerLabel, 'L_7703')
  assert.equal(interlocutor.nSpriteFrames, 3)
  const liu = {
    id: 'e550',
    ...sourceActor(550),
    // The normal touch at [1184, 768] makes the caller look southwest.
    facing: 'down',
    frame: 0,
  }
  const path = (position, steps) => {
    const points = [position]
    for (const ip of steps) {
      const [, dx, dy] = raw(ip, 0x7d).map(signed)
      const [x, y] = points.at(-1)
      points.push([x + dx, y + dy])
    }
    return points
  }
  const performer = sourceActor(547)
  const opponent = sourceActor(549)
  const warmup = {
    e547: {
      asset: performer.asset,
      positions: path(performer.position, [8176, 8180]),
      frames: [8148, ...Array.from({ length: 10 }, (_, i) => 8151 + i), 8168].map(
        (ip) => raw(ip, 0x14)[0],
      ),
    },
    e549: {
      asset: opponent.asset,
      positions: [
        ...path(opponent.position, [8193, 8195, 8199]),
        ...path(opponent.position, [8202, 8207, 8208]),
        ...path(opponent.position, [8183, 8185, 8188, 8189]),
      ],
      frames: [8192, 8198, 8196, 8206].map((ip) => raw(ip, 0x14)[0]),
    },
  }
  const patriarch = { ...sourceActor(551), facing: 'right', frame: 3 }
  return { dx, dy, steps, turnFrames, turnBeats, pages, liu, warmup, patriarch }
}

export function inspectRingOpening({ events, draws, trigger, launch, expected, locale }) {
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
  if (!panCue || !dismiss || !challenge) return { issues, dialogue }
  const world = events.filter(
    ({ kind, scene: id, colors }) =>
      kind === 'world-drawn' && id === scene && colors.some(([r, g, b]) => r || g || b),
  )
  const origin = world.findLast(({ atMs }) => atMs <= panCue.atMs)
  check('the last painted camera before the cue is recorded', Boolean(origin), true)
  if (!origin) return { issues, dialogue }
  const pan = []
  for (const frame of world) {
    if (frame.atMs <= panCue.atMs || frame.atMs >= dismiss.atMs) continue
    if (!isDeepStrictEqual(pan.at(-1)?.camera ?? origin.camera, frame.camera)) pan.push(frame)
  }
  const [x, y] = origin.camera
  check(
    'every drawn opening camera step follows the source pan',
    pan.map(({ camera }) => camera),
    Array.from({ length: expected.steps }, (_, i) => [
      x + (i + 1) * expected.dx,
      y + (i + 1) * expected.dy,
    ]),
  )
  const pose = (actor) => {
    if (!actor) return { visible: false }
    const { asset, position, facing, frame } = actor
    return { visible: true, asset, position, facing, frame }
  }
  const liuPose = (frame) => pose(frame.actors[expected.liu.id])
  const { id, ...liuStanding } = expected.liu
  const expectedLiu = { visible: true, ...liuStanding }
  const liuFrames = world.filter(
    ({ order, atMs }) => order > trigger.order && atMs <= pan.at(-1)?.atMs,
  )
  const earliestLiuIssue = liuFrames.find(
    (frame) => !isDeepStrictEqual(liuPose(frame), expectedLiu),
  )
  check(
    'Liu Jinyuan has drawn frames from touch through the full opening pan',
    !!liuFrames.length,
    true,
  )
  if (earliestLiuIssue)
    issues.push({
      rule: 'Liu Jinyuan faces the caller in every painted pose from touch through the opening pan',
      actor: id,
      order: earliestLiuIssue.order,
      camera: earliestLiuIssue.camera,
      atMs: earliestLiuIssue.atMs,
      actual: liuPose(earliestLiuIssue),
      expected: expectedLiu,
    })
  const firstPan = pan[0]
  const liuAtPan = firstPan && {
    order: firstPan.order,
    atMs: firstPan.atMs,
    camera: firstPan.camera,
    ...liuPose(firstPan),
  }
  const panning = world.filter(
    ({ order }) => order >= firstPan?.order && order <= pan.at(-1)?.order,
  )
  const cast = { e548: 0, e550: panning.length, e551: 0 }
  const reportActor = (rule, id, frame, expected) => {
    issues.push({
      rule,
      actor: id,
      order: frame.order,
      camera: frame.camera,
      atMs: frame.atMs,
      actual: pose(frame.actors[id]),
      expected,
    })
  }
  for (const [id, { asset, positions, frames }] of Object.entries(expected.warmup)) {
    cast[id] = panning.filter(({ actors }) => actors[id]).length
    const unexpected = panning.find(({ actors }) => {
      const actor = actors[id]
      return (
        !actor ||
        actor.asset !== asset ||
        actor.facing !== 'down' ||
        !frames.includes(actor.frame) ||
        !positions.some((position) => isDeepStrictEqual(actor.position, position))
      )
    })
    if (unexpected)
      reportActor(
        'The warm-up paints the original actors and reachable poses on each pan step',
        id,
        unexpected,
        {
          visible: true,
          asset,
          positions,
          frames,
          facing: 'down',
        },
      )
  }
  const earlyYueru = panning.find(({ actors }) => actors.e548)
  if (earlyYueru)
    reportActor('Lin Yueru stays hidden until the warm-up handoff', 'e548', earlyYueru, {
      visible: false,
    })
  const patriarch = { visible: true, ...expected.patriarch }
  const [px, py] = patriarch.position
  for (const frame of panning) {
    const [left, top] = frame.camera
    const centerIsOnScreen = px >= left && px < left + 320 && py >= top && py < top + 200
    const actual = pose(frame.actors.e551)
    if (actual.visible) cast.e551++
    if ((centerIsOnScreen || actual.visible) && !isDeepStrictEqual(actual, patriarch)) {
      reportActor(
        'Lin Tiannan holds the original pose as the camera reveals him',
        'e551',
        frame,
        patriarch,
      )
      break
    }
  }
  const cleared = inspectClearedDialogueFrames(draws, pan, scene)
  check('the dialogue and portrait are cleared on every panning frame', cleared.issue, null)
  const cameraFrames = world.filter((frame, i) => {
    const previous = world[i - 1]
    return (
      previous &&
      frame.order > trigger.order &&
      frame.order < launch.order &&
      isDeepStrictEqual(frame.leader, previous.leader) &&
      !isDeepStrictEqual(frame.camera, previous.camera)
    )
  })
  const allPansCleared = inspectClearedDialogueFrames(draws, cameraFrames, scene)
  check(
    'all relative cameras before battle draw without retained dialogue',
    allPansCleared.issue,
    null,
  )

  const turns = []
  for (const frame of world) {
    if (frame.atMs <= dismiss.atMs || frame.atMs >= challenge.atMs) continue
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
    allPansCleared,
    origin: origin?.camera,
    pan: pan.map(({ atMs, camera, order }) => ({ atMs, camera, order })),
    turns,
    turnIntervals,
    liuAtPan,
    liuFrames: liuFrames.length,
    castDuringPan: cast,
  }
}
