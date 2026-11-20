import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  compareRenderedDialogue,
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'

const scene = 's032'

const warmupPose = (performerFrame, performerPosition, opponentFrame, opponentPosition) => [
  performerFrame,
  ...performerPosition,
  opponentFrame,
  ...opponentPosition,
]

function readWarmupSequences(raw, performer, opponent, path) {
  const [base, forward, reset] = path(performer.position, [8176, 8180])
  const [start, firstStep, secondStep, exchangeEnd] = path(opponent.position, [8193, 8195, 8199])
  const [, retreat, retreatEnd, retreatReset] = path(opponent.position, [8202, 8207, 8208])
  const [, lunge, lungeEnd, lungeBack, lungeReset] = path(
    opponent.position,
    [8183, 8185, 8188, 8189],
  )
  assert.deepEqual([reset, exchangeEnd, retreatReset, lungeReset], [base, start, start, start])
  const pose = (performerIp, opponentIp, opponentPosition = start, performerPosition = base) =>
    warmupPose(
      raw(performerIp, 0x14)[0],
      performerPosition,
      raw(opponentIp, 0x14)[0],
      opponentPosition,
    )
  const waiting = pose(8148, 8198)
  const exchange = [
    pose(8148, 8192),
    pose(8151, 8192, firstStep),
    pose(8152, 8192, firstStep),
    pose(8153, 8192, secondStep),
    pose(8154, 8196, secondStep),
    pose(8155, 8196, secondStep),
    pose(8156, 8198, secondStep),
    ...[8157, 8158, 8159, 8160].map((ip) => pose(ip, 8198)),
  ]
  const last = exchange.at(-1)
  // Each auto command consumes a world beat. The chance commands either jump
  // within that beat or let the next one consume the following instruction.
  raw(8162, 0x06)
  raw(8163, 0x06)
  const [knockbackHold] = raw(8170, 0x09)
  const [recoveryHold] = raw(8178, 0x09)
  return [
    { poses: exchange, beats: [null, ...Array(9).fill(1)] },
    { poses: [last, waiting, exchange[0]], beats: [2, null] },
    {
      poses: [
        last,
        pose(8160, 8198, lunge),
        pose(8160, 8184, lunge),
        pose(8160, 8184, lungeEnd, forward),
        pose(8177, 8184, lungeEnd, forward),
        pose(8177, 8187, lungeEnd, forward),
        pose(8177, 8187, lungeBack, forward),
        pose(8177, 8187, start, forward),
        pose(8179, 8187, start, forward),
        waiting,
      ],
      beats: [3, 1, 1, 1, 1, 1, 1, recoveryHold - 2, 1],
    },
    {
      poses: [
        last,
        pose(8160, 8198, retreat),
        pose(8165, 8198, retreat),
        pose(8166, 8198, retreat),
        pose(8167, 8198, retreat),
        pose(8168, 8206, retreat),
        pose(8168, 8206, retreatEnd),
        pose(8168, 8206),
        pose(8168, 8210),
        exchange[0],
      ],
      beats: [4, 1, 1, 1, 1, 1, 1, 2, knockbackHold - 2],
    },
  ]
}

export function inspectRingWarmup(panning, sequences) {
  const transitions = new Map()
  for (const { poses, beats } of sequences)
    for (const [index, count] of beats.entries()) {
      const from = JSON.stringify(poses[index])
      const next = transitions.get(from) ?? new Map()
      next.set(JSON.stringify(poses[index + 1]), count)
      transitions.set(from, next)
    }
  const changes = []
  for (const { actors, atMs, order, camera } of panning) {
    const { e547: performer, e549: opponent } = actors
    if (!performer || !opponent) continue
    const pose = warmupPose(performer.frame, performer.position, opponent.frame, opponent.position)
    if (isDeepStrictEqual(pose, changes.at(-1)?.pose)) continue
    changes.push({ atMs, order, camera, pose })
  }
  const issues = []
  let stepsDrawn = 0
  const frameMs = 100
  const paintToleranceMs = 55
  for (const [index, current] of changes.entries()) {
    if (index === 0) continue
    const previous = changes[index - 1]
    const beats = transitions.get(JSON.stringify(previous.pose))?.get(JSON.stringify(current.pose))
    const elapsedMs = current.atMs - previous.atMs
    if (beats === undefined)
      issues.push({
        rule: 'ring warm-up joint pose follows the original sequence',
        previous,
        current,
      })
    else if (
      beats !== null &&
      (elapsedMs > frameMs * beats + paintToleranceMs ||
        (index > 1 && elapsedMs < frameMs * beats - paintToleranceMs))
    )
      issues.push({
        rule: 'ring warm-up holds each pose for its source beats',
        previous,
        current,
        beats,
        elapsedMs,
      })
    else stepsDrawn++
  }
  const last = changes.at(-1)
  if (last) {
    const nextBeats = [...(transitions.get(JSON.stringify(last.pose))?.values() ?? [])]
    const elapsedMs = panning.at(-1).atMs - last.atMs
    if (nextBeats.length && !nextBeats.includes(null)) {
      const maxHoldMs = frameMs * Math.max(...nextBeats) + paintToleranceMs
      if (elapsedMs > maxHoldMs)
        issues.push({
          rule: 'ring warm-up continues through the final pan frame',
          last,
          elapsedMs,
          maxHoldMs,
        })
    }
  }
  // Idle may legally repeat, but an idle-only recording does not exercise the exchange.
  const { poses: exchange } = sequences[0]
  const drawnPoses = changes.map(({ pose }) => pose)
  const completeExchanges = changes.filter((_, index) =>
    isDeepStrictEqual(drawnPoses.slice(index, index + exchange.length), exchange),
  ).length
  if (!completeExchanges)
    issues.push({
      rule: 'a complete ring warm-up exchange is evidenced during the pan',
      stepsDrawn,
    })
  return { issues, changes, stepsDrawn, completeExchanges }
}

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
  const warmupSequences = readWarmupSequences(raw, performer, opponent, path)
  return { dx, dy, steps, turnFrames, turnBeats, pages, liu, warmup, warmupSequences, patriarch }
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
  const warmupMotion = inspectRingWarmup(panning, expected.warmupSequences)
  issues.push(...warmupMotion.issues)
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
    warmupMotion,
  }
}
