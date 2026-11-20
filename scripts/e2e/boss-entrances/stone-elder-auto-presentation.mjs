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
  assert.deepEqual([commands[16978].opcode, commands[16978].operands], [0x8c, [26, 4, 65535]])
  const [role, sprite] = commands[ambush.start + 1].operands
  assert.deepEqual([commands[ambush.start + 1].opcode, role], [0x65, 0])
  return {
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
    'the first visible return is a red field without geometry behind the narration',
    Boolean(control.flatColor && control.flatColor[0] > Math.max(...control.flatColor.slice(1))),
    true,
  )
  return { issues, firstEntries, field, opening }
}
