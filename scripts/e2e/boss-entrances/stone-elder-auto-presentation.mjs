import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  compareRenderedDialogue,
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'

const directions = ['down', 'left', 'up', 'right']
const worldPosition = ([col, row]) => [16 * (col - row), 8 * (col + row)]
const cameraAt = ([x, y]) => [x - 160, y - 112]

const actorPose = (actor) =>
  actor && {
    asset: actor.asset,
    position: actor.position,
    facing: actor.facing,
    frame: actor.frame,
  }

export function readStoneElderAutoPresentation(data, commands, spec) {
  const { scene } = spec
  const { turnStart } = spec.automatic
  const {
    visits: [inn],
    return: ambush,
  } = spec.sceneRoute
  const onReturn = spec.world.handoff
  const originalInn = data[`disk-${inn.scene}`]
  const readPosition = (ip) => {
    const {
      opcode,
      operands: [x, y, half],
    } = commands[ip]
    assert.equal(opcode, 0x46)
    return [x + y + half, y - x, 0]
  }
  const readPose = (originalScene, id) => {
    const original = originalScene.eventObjects.find((actor) => `e${actor.id}` === id)
    return {
      asset: original.spriteNum,
      position: [original.x, original.y],
      facing: directions[original.direction],
      frame: original.nSpriteFrames * original.direction + original.currentFrameNum,
    }
  }
  const returnField = readPosition(16986)
  assert.deepEqual(returnField, onReturn.fieldPosition)
  assert.deepEqual(readPosition(17002), onReturn.finalPosition)
  const fadeOut = commands[16770]
  const fadeIn = commands[16978]
  assert.deepEqual([fadeOut.opcode, fadeOut.operands], [0x8c, [26, 2, 0]])
  assert.deepEqual([fadeIn.opcode, fadeIn.operands], [0x8c, [26, 4, 65535]])
  const matteColor = data.returnPalette.colors[fadeIn.operands[0]]
  assert.equal(matteColor.length, 3)
  const reveal = commands[16748]
  const shake = commands[16767]
  const windup = commands[16768]
  const sound = commands[16769]
  assert.deepEqual([reveal.opcode, ...reveal.operands], [0x49, 1985, 1, 0])
  assert.deepEqual([shake.opcode, ...shake.operands], [0x35, 30, 0, 0])
  assert.deepEqual([windup.opcode, ...windup.operands], [0x09, 14, 0, 0])
  assert.deepEqual([sound.opcode, ...sound.operands], [0x47, 175, 0, 0])
  const burstId = `e${reveal.operands[0] - 1}`
  const burstActor = data.gameScene.eventObjects.find(({ id }) => `e${id}` === burstId)
  const autoIp = Number(burstActor.autoLabel.slice(2))
  assert.equal(commands[autoIp].opcode, 0x87)
  assert.equal(commands[autoIp + 1].resetTo, autoIp)
  const [role, sprite] = commands[ambush.start + 1].operands
  assert.deepEqual([commands[ambush.start + 1].opcode, role], [0x65, 0])
  return {
    matteColor,
    burst: {
      id: burstId,
      pose: readPose(data.gameScene, burstId),
      frames: Array.from({ length: windup.operands[0] / 2 + 1 }, (_, frame) => frame),
      windupMs: windup.operands[0] * 100,
      fadeMs: fadeOut.operands[1] * 64 * 10,
      caption: commands[16766].text.split('~')[0].trim(),
      sound: sound.operands[0],
    },
    dialogueWorld: inn.scene,
    firstEntries: [
      { scene, position: spec.start },
      {
        scene: inn.scene,
        position: inn.position,
        cast: { [inn.owner]: readPose(originalInn, inn.owner) },
      },
      {
        scene,
        position: readPosition(ambush.start + 3),
        cast: Object.fromEntries(
          ['e1974', 'e1975', 'e1976', 'e1977', 'e1978'].map((id) => [
            id,
            readPose(data.gameScene, id),
          ]),
        ),
        sprite,
      },
      { scene: onReturn.scene, position: onReturn.position, cast: {}, sprite, matte: true },
    ],
    fieldCast: Object.fromEntries(
      [
        ['e2059', 2],
        ['e2060', 1],
        ['e2069', 0],
        ['e2070', 0],
      ].map(([id, frame]) => [id, { ...readPose(originalInn, id), frame }]),
    ),
    players: spec.automatic.members.map(({ role, roleId }) => {
      const { hp, mp } = data.actors.roles.find(({ id }) => id === roleId)
      return [role, hp, mp]
    }),
    battleDialogue: sourceDialogueGroups(commands, [
      {
        scene,
        first: turnStart,
        last: commands.findIndex(({ advance }, ip) => ip >= turnStart && advance) - 1,
      },
    ]),
  }
}

function inspectBurst({ events, draws, scene, won, control, facts, game, check }) {
  const postBattle = events.filter(({ order }) => won.order < order && order < control.order)
  const window = postBattle.filter((event) => event.scene === scene)
  const ops = window.filter(({ kind }) => kind === 'script-op')
  const shakes = ops.filter((event) => (game ? event.ip === 16767 : event.op === 'shakeScreen'))
  const [shake] = shakes
  const sound = ops.filter((event) =>
    game
      ? event.ip === 16769
      : event.op === 'playSound' && event.asset === `sound.pal.${facts.sound}`,
  )
  const fade = ops.find((event) =>
    game ? event.ip === 16770 : event.order > sound[0]?.order && event.op === 'fade',
  )
  const leave = ops.find((event) =>
    game ? event.ip === 16775 : event.op === 'loadScene' && event.target === 's110',
  )
  check(
    'one self-destruct begins and hands off to the return scene',
    [
      shakes.length,
      sound.length,
      Boolean(
        shake?.order < sound[0]?.order && sound[0].order < fade?.order && fade.order < leave?.order,
      ),
    ],
    [1, 1, true],
  )
  if (!shake || !fade || !leave) return undefined

  const world = window.filter(
    ({ kind, order, visible }) => kind === 'world-drawn' && order < leave.order && visible,
  )
  const first = world.findIndex(({ actors }) => actors[facts.id])
  const presented = first < 0 ? [] : world.slice(first)
  const states = presented.map(({ actors, atMs, order }) => ({
    atMs,
    order,
    pose: actorPose(actors[facts.id]) ?? null,
  }))
  check(
    'the first actual self-destruct pose is the original standing sprite',
    states[0]?.pose,
    facts.pose,
  )
  const incorrectPose = states.find(
    ({ pose }) =>
      !pose ||
      pose.asset !== facts.pose.asset ||
      pose.facing !== facts.pose.facing ||
      !isDeepStrictEqual(pose.position, facts.pose.position),
  )
  check(
    'the self-destruct sprite stays at its original feet through the fade',
    incorrectPose ?? null,
    null,
  )
  const changes = states.filter(
    ({ pose }, index) => index === 0 || pose?.frame !== states[index - 1].pose?.frame,
  )
  check(
    'the self-destruct is painted once without restarting',
    changes.map(({ pose }) => pose?.frame),
    facts.frames,
  )
  const steps = changes.slice(1).map(({ pose, atMs, order }) => ({
    frame: pose?.frame,
    order,
    elapsedMs: Math.round(atMs - shake.atMs),
  }))
  check(
    'all seven self-destruct poses finish at the original world beat before fading',
    steps.every(
      ({ frame, elapsedMs, order }, index) =>
        frame === index + 1 &&
        Math.abs(elapsedMs - (100 + index * 200)) <= 55 &&
        order < fade.order,
    ) && steps.length === facts.frames.length - 1,
    true,
  )
  const windupMs = Math.round(fade.atMs - shake.atMs)
  const fadeMs = Math.round(leave.atMs - fade.atMs)
  check(
    'the self-destruct windup uses the full original duration',
    Math.abs(windupMs - facts.windupMs) <= 55,
    true,
  )
  check(
    'the held final pose fades for the original duration',
    Math.abs(fadeMs - facts.fadeMs) <= 55,
    true,
  )

  const sounds = postBattle.filter(
    ({ kind, asset, order }) =>
      ['sfx-request', 'sfx-start'].includes(kind) && asset === facts.sound && order < leave.order,
  )
  check(
    'the self-destruct sound is requested and heard once',
    sounds.map(({ kind }) => kind),
    ['sfx-request', 'sfx-start'],
  )
  check(
    'the sound begins with the red fade',
    Boolean(sounds[1] && Math.abs(sounds[1].atMs - fade.atMs) <= 90),
    true,
  )
  const sceneDraws = draws.filter((draw) => draw.scene === scene && draw.atMs < leave.atMs)
  const title = sceneDraws.findLast(
    ({ atMs, slots }) =>
      atMs <= shake.atMs &&
      slots.some(({ lines }) => lines.some((line) => line.trim() === facts.caption)),
  )
  const cleared =
    title && sceneDraws.find(({ atMs, slots }) => atMs > title.atMs && slots.length === 0)
  check(
    'the last caption clears before the first moving self-destruct pose',
    Boolean(
      cleared &&
        cleared.atMs <= changes[1]?.atMs &&
        sceneDraws.every(({ atMs, slots }) => atMs < cleared.atMs || slots.length === 0),
    ),
    true,
  )
  return { shake, fade, leave, first: states[0], steps, windupMs, fadeMs, sounds, cleared }
}

export function inspectStoneElderAutoPresentation({ events, draws, bounds, source, spec, game }) {
  const { trigger, launch, prepared, won, control } = bounds
  const facts = source.automatic.presentation
  const [inn] = spec.sceneRoute.visits
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const firstEntries = events.filter(({ kind }) => kind === 'scene-first-drawn')
  check(
    'every scene arrives in the original order with the original first visible feet',
    firstEntries.map(({ scene, leader }) => [scene, leader]),
    facts.firstEntries.map(({ scene, position }) => [scene, worldPosition(position)]),
  )
  check(
    'the first visible cameras are aligned where the world geometry can be seen',
    firstEntries.filter((_, i) => !facts.firstEntries[i]?.matte).map(({ camera }) => camera),
    facts.firstEntries
      .filter(({ matte }) => !matte)
      .map(({ position }) => {
        const leader = worldPosition(position)
        return cameraAt(leader)
      }),
  )
  for (const [index, expected] of facts.firstEntries.entries()) {
    const draw = firstEntries[index]
    if (expected.cast) {
      const ids = Object.keys(expected.cast)
      const actual = ids.length
        ? Object.fromEntries(ids.map((id) => [id, actorPose(draw?.actors[id]) ?? null]))
        : ((draw && Object.keys(draw.actors)) ?? null)
      check(
        `actors at the first visible draw of scene entry ${index + 1}`,
        actual,
        ids.length ? expected.cast : [],
      )
    }
    if (expected.sprite !== undefined)
      check(
        `party resource at the first visible draw of scene entry ${index + 1}`,
        draw?.party?.map(({ id, spriteId, world }) => [
          id,
          typeof spriteId === 'string' ? source.spriteChunks.get(spriteId) : spriteId,
          world,
        ]),
        [['li-xiaoyao', expected.sprite, worldPosition(expected.position)]],
      )
    if (draw)
      check(
        `scene entry ${index + 1} starts with an empty dialogue layer`,
        inspectClearedDialogueFrames(draws, [draw], expected.scene).issue,
        null,
      )
  }
  const welcome = events.filter((e) =>
    game
      ? e.kind === 'scene-route-trigger' && e.scene === inn.scene
      : e.kind === 'scene-hook' && e.scene === inn.scene && e.variant === inn.arrivalHook,
  )
  check(
    'the arrival runs one real welcome before returning for battle',
    welcome.map((event) =>
      game ? [event.owner, event.ip, event.position] : [event.variant, event.stage],
    ),
    game ? [[inn.owner, inn.start, inn.position]] : [[inn.arrivalHook, 'initial']],
  )
  check(
    'welcome happens after entering and before the ambush outside',
    Boolean(
      trigger.order < firstEntries[1]?.order &&
        firstEntries[1]?.order <= welcome[0]?.order &&
        welcome[0]?.order < firstEntries[2]?.order &&
        firstEntries[2]?.order < launch.order,
    ),
    true,
  )
  const opening = compareRenderedDialogue(
    draws.filter(
      ({ atMs, scene }) => scene === spec.scene && atMs > prepared.atMs && atMs < won.atMs,
    ),
    facts.battleDialogue,
    source.locale,
  )
  issues.push(...opening.findings)
  const entryFrames = events.filter(
    ({ kind, band }) =>
      kind === 'entry-complete' || (kind === 'entry-band' && (band === 0 || band === 6)),
  )
  check('frozen and fully revealed battle entry frames were sampled', entryFrames.length, 3)
  const clearEntry = inspectClearedDialogueFrames(draws, entryFrames, spec.scene)
  check(
    'the battle transition freezes a world with the previous dialogue cleared',
    clearEntry.issue,
    null,
  )
  const returnDraws = events.filter(
    ({ kind, scene, visible, order }) =>
      kind === 'world-drawn' && scene === spec.world.handoff.scene && visible && order > won.order,
  )
  const field = returnDraws.find(({ leader }) => leader.some(Boolean))
  const face = worldPosition(spec.world.handoff.fieldPosition)
  check(
    'first inn interior after the red narration',
    [field?.leader, field?.camera],
    [face, cameraAt(face)],
  )
  check(
    'key inn actors at the first visible interior after the narration',
    Object.fromEntries(
      Object.keys(facts.fieldCast).map((id) => [id, actorPose(field?.actors[id]) ?? null]),
    ),
    facts.fieldCast,
  )
  if (field)
    check(
      'the held narration is cleared before the first inn interior',
      inspectClearedDialogueFrames(
        draws.map((draw) => ({
          ...draw,
          slots: draw.slots.filter(
            ({ lines, portrait, speaker }) =>
              portrait || speaker || lines.some((line) => line.trim()),
          ),
        })),
        [field],
        spec.world.handoff.scene,
      ).issue,
      null,
    )
  check(
    'the first visible return uses the original solid palette color',
    control.flatColor,
    facts.matteColor,
  )
  const battleEvents = events.filter(({ order }) => prepared.order < order && order < won.order)
  const actions = battleEvents.filter(({ kind }) => kind === 'action')
  const requests = battleEvents.filter(({ kind }) => kind === 'sfx-request')
  const starts = battleEvents.filter(({ kind }) => kind === 'sfx-start')
  check(
    'each battle cue is requested and starts once',
    starts.map(({ cue }) => cue).toSorted((a, b) => a - b),
    requests.map(({ cue }) => cue),
  )
  const battleAudio = requests.map(({ cue, asset, order, atMs }) => {
    const start = starts.find((event) => event.cue === cue)
    const deadline = actions.find((event) => event.order > order) ?? won
    const timing = {
      asset,
      cue,
      requestedMs: atMs,
      startedMs: start?.atMs,
      nextActionMs: deadline.atMs,
    }
    if (!start || start.asset !== asset || start.order <= order || start.order >= deadline.order)
      issues.push({ rule: 'battle cue starts before the next action', ...timing })
    return timing
  })
  const burst = inspectBurst({
    events,
    draws,
    scene: spec.scene,
    won,
    control,
    facts: facts.burst,
    game,
    check,
  })
  return { issues, firstEntries, field, opening, matteColor: control.flatColor, battleAudio, burst }
}
