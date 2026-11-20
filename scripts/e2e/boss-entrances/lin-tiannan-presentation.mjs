import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  compareRenderedDialogue,
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'
import { inspectWorldDialogueCoverage } from './world-dialogue-coverage.mjs'

const castByScene = {
  s118: ['e2168', 'e2169'],
  s117: ['e2153', 'e2154', 'e2155'],
}

const originalPartyPixel = ({ operands: [x, y, half] }) => [32 * x + 16 * half, 16 * y + 8 * half]

export function readLinTiannanPresentation(commands, spec) {
  const [audience] = spec.sceneRoute.visits
  const duel = spec.sceneRoute.return
  const windows = {
    audience: [{ scene: audience.scene, first: audience.start, last: audience.leave - 1 }],
    challenge: [{ scene: spec.scene, first: duel.start, last: spec.disk.battle - 1 }],
    battle: [
      { scene: spec.scene, first: 41496, last: 41501, initialSlot: 'top' },
      { scene: spec.scene, first: 41515, last: 41519, initialSlot: 'top' },
      { scene: spec.scene, first: 41505, last: 41508, initialSlot: 'top' },
      { scene: spec.scene, first: 41528, last: 41531, initialSlot: 'top' },
    ],
    return: [{ scene: spec.scene, first: spec.disk.battle + 1, last: spec.disk.last }],
  }
  assert.equal(commands[spec.sceneRoute.leave + 1].opcode, 0x46)
  assert.equal(commands[duel.start + 3].opcode, 0x46)
  assert.deepEqual(
    [commands[spec.disk.last - 2].opcode, commands[spec.disk.last - 2].operands],
    [0x75, [3, 1, 0]],
  )
  return {
    visits: [audience, { ...duel, scene: spec.scene }],
    groups: Object.fromEntries(
      Object.entries(windows).map(([phase, entries]) => [
        phase,
        sourceDialogueGroups(commands, entries).flatMap((group) => {
          // The long uninterrupted lower declaration fills a four-line page before continuing.
          if (group.rows[0].id !== 'dlg.6672') return group
          assert.equal(group.rows.length, 7)
          return [
            { ...group, rows: group.rows.slice(0, 4) },
            { ...group, rows: group.rows.slice(4) },
          ]
        }),
      ]),
    ),
    landing: [
      originalPartyPixel(commands[spec.sceneRoute.leave + 1]),
      originalPartyPixel(commands[duel.start + 3]),
    ],
  }
}

const positionAndPose = (actor) =>
  actor ? [actor.asset, actor.position, actor.facing, actor.frame] : null

function drawnCast(frame, cast) {
  return Object.fromEntries(cast.map((id) => [id, positionAndPose(frame.actors[id])]))
}

function presentedState(frame, chunks) {
  if (!frame) return null
  const { scene, leader, camera, party } = frame
  return {
    scene,
    leader,
    camera,
    party: Object.fromEntries(
      party?.map(({ id, spriteId, world, frame }) => [
        id,
        [typeof spriteId === 'string' ? chunks.get(spriteId) : spriteId, world, frame],
      ]) ?? [],
    ),
    actors: drawnCast(frame, castByScene[scene]),
  }
}

export function inspectLinTiannanPresentation({
  events,
  draws,
  boundaries,
  source,
  spec,
  game,
  facts,
}) {
  const { trigger, launch, won, control } = boundaries
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const hooks = events.filter(
    ({ kind, order }) => kind === 'scene-hook' && order > trigger.order && order < launch.order,
  )
  check(
    'both original foreground hooks ran exactly once',
    hooks.map(({ scene, start, variant }) => [scene, game ? start : variant]),
    facts.visits.map(({ scene, start, variant }) => [scene, game ? start : variant]),
  )
  const firstEntries = events.filter(
    ({ kind, order }) =>
      kind === 'scene-first-drawn' && order > trigger.order && order < launch.order,
  )
  check(
    'both target scenes have a first visible composite',
    firstEntries.map(({ scene }) => scene),
    facts.visits.map(({ scene }) => scene),
  )
  // The original executes a movement beat before revealing either destination.
  const expectedFeet = facts.landing.map(([x, y], index) =>
    index === 0 ? [x - 16, y - 8] : [x + 8, y - 4],
  )
  const paintedViews = new Map(
    events.filter(({ kind }) => kind === 'world-drawn').map((frame) => [frame.order, frame]),
  )
  for (const [index, frame] of firstEntries.entries()) {
    const [x, y] = expectedFeet[index] ?? []
    check(`${frame.scene} first visible party position`, frame.leader, expectedFeet[index])
    check(`${frame.scene} first visible camera`, frame.camera, [x - 160, y - 112])
    check(
      `no source dialogue visible at the first composite of ${frame.scene}`,
      inspectClearedDialogueFrames(draws, [frame], frame.scene).issue,
      null,
    )
    if (!game) {
      const firstMove = events.find(
        ({ kind, scene, order, op }) =>
          kind === 'script-op' &&
          scene === frame.scene &&
          order > frame.order &&
          op === 'moveParty',
      )
      const reveal = events.filter(
        ({ kind, scene, order, backdrop }) =>
          kind === 'world-render' &&
          scene === frame.scene &&
          order > frame.order &&
          order < firstMove?.order &&
          backdrop &&
          !backdrop.dark,
      )
      check(`${frame.scene} contains visible frames before movement`, reveal.length > 0, true)
      const expected = presentedState(frame, source.spriteChunks)
      const wrong = reveal.find(
        ({ view }) =>
          !isDeepStrictEqual(presentedState(paintedViews.get(view), source.spriteChunks), expected),
      )
      if (wrong)
        issues.push({
          issue: 'wrong-visible-scene-frame',
          scene: frame.scene,
          at: wrong,
          actual: presentedState(paintedViews.get(wrong.view), source.spriteChunks),
          expected,
        })
    }
  }
  const arrivals = firstEntries.map((frame) => presentedState(frame, source.spriteChunks))
  const briefingFollower = arrivals[0]?.party['li-xiaoyao']
  check(
    'Li Xiaoyao is in the expected first audience formation',
    briefingFollower?.[1],
    game ? expectedFeet[0] : facts.landing[0],
  )
  // Reforge seeds the authored walking trail. Game places the follower on the leader
  // at this first draw. Check each concrete foot before comparing the rest of the pose.
  if (briefingFollower) briefingFollower[1] = expectedFeet[0]
  const world = events.filter(({ kind, visible }) => kind === 'world-drawn' && visible)
  const firstReturn = world.find(({ scene, order }) => scene === spec.scene && order > won.order)
  check(
    'the duel returned to the world before releasing control',
    Boolean(firstReturn && firstReturn.order < control.order),
    true,
  )
  const firstBattleFrames = events.filter(
    ({ kind, order }) =>
      order > launch.order &&
      order < won.order &&
      (kind === 'entry-band' || kind === 'entry-complete'),
  )
  check(
    'the challenge cleared before the first battle composite',
    inspectClearedDialogueFrames(draws, firstBattleFrames, spec.scene).issue,
    null,
  )
  const changeScene = events.find(
    ({ kind, scene, target }) => kind === 'script-op' && scene === 's118' && target === spec.scene,
  )
  const windows = {
    audience: [trigger.atMs, changeScene?.atMs ?? 0],
    challenge: [changeScene?.atMs ?? 0, launch.atMs],
    battle: [launch.atMs, won.atMs],
    return: [won.atMs, control.atMs],
  }
  const battleDialogue = compareRenderedDialogue(
    draws.filter(({ atMs }) => atMs >= launch.atMs && atMs < won.atMs),
    facts.groups.battle,
    source.locale,
  )
  issues.push(...battleDialogue.findings.map((finding) => ({ phase: 'battle', ...finding })))
  const coverage = Object.entries(windows).flatMap(([phase, [start, end]]) => {
    if (phase === 'battle') return []
    const scene = facts.groups[phase][0].scene
    return inspectWorldDialogueCoverage({
      phase,
      scene,
      start,
      end,
      expected: facts.groups[phase],
      actors: castByScene[scene],
      background: true,
      events,
      draws,
      locale: source.locale,
    })
  })
  const returning = world.filter(
    ({ atMs, scene }) => scene === spec.scene && atMs >= won.atMs && atMs < control.atMs,
  )
  const returnWalks = castByScene[spec.scene].map((actor) => {
    const track = []
    for (const frame of returning) {
      const pose = positionAndPose(frame.actors[actor])
      if (!isDeepStrictEqual(pose?.[1], track.at(-1)?.[1])) track.push(pose)
    }
    return { actor, track }
  })
  return {
    issues,
    firstEntries,
    firstReturn,
    battleDialogue,
    coverage,
    comparable: {
      arrivals,
      return: presentedState(firstReturn, source.spriteChunks),
      returnWalks,
    },
  }
}
