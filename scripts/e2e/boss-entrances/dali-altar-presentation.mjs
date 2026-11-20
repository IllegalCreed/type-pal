import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'
import { inspectWorldDialogueCoverage } from './world-dialogue-coverage.mjs'

function distinctPoseSequence(frames, readPose) {
  const poses = []
  for (const frame of frames) {
    const pose = readPose(frame)
    if (!isDeepStrictEqual(pose, poses.at(-1))) poses.push(pose)
  }
  return poses
}

const poseOf = (actor) => (actor ? [actor.asset, actor.position, actor.facing, actor.frame] : null)

function sourceArrivals(commands, visits) {
  const placement = [32039, 31850, 31880, 31904, 31972, 32065, 32093]
  assert.equal(placement.length, visits.length)
  assert.deepEqual([commands[31905].opcode, commands[31905].operands], [0x7f, [0, 2, 150]])
  assert.deepEqual([commands[32094].opcode, commands[32094].operands], [0x7a, [29, 74, 1]])
  return visits.map(({ scene }, index) => {
    const {
      opcode,
      operands: [col, row, half],
    } = commands[placement[index]]
    assert.equal(opcode, 0x46)
    // The first visible altar pose follows the initial step, while the camera
    // sweep in s244 has already advanced two increments when its world appears.
    const x = col * 32 + half * 16 - (scene === 's231' ? 16 : 0)
    const y = row * 16 + half * 8 + (scene === 's231' ? 8 : 0)
    return [scene, [x, y], [x - 160, y - 112 + (scene === 's244' ? 4 : 0)]]
  })
}

function chiefPoses(path) {
  let waiting = false
  return path.filter((pose, index) => {
    if (!pose) return index > 0
    if (!isDeepStrictEqual(pose[1], [912, 1272])) return true
    if (waiting) return false
    if (pose[2] === 'down') waiting = true
    return true
  })
}

export function inspectDaliAltar({ events, draws, boundaries, source, spec, game }) {
  const { trigger, launch, won, control } = boundaries
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const visits = [...spec.sceneRoute.visits, { ...spec.sceneRoute.return, scene: spec.scene }]
  const between = ({ order }) => trigger.order < order && order < launch.order
  const hooks = events.filter((event) => between(event) && event.kind === 'scene-hook')
  check(
    'original item route consumes every authored scene hook in order',
    hooks.map(({ scene, start, variant, stage }) =>
      game ? [scene, start] : [scene, variant, stage],
    ),
    visits.map(({ scene, start, variant, stage }) =>
      game ? [scene, start] : [scene, variant ?? 'default', stage ?? 'initial'],
    ),
  )
  const loads = events.filter(
    (event) => between(event) && event.kind === 'script-op' && event.target,
  )
  check(
    'each transfer comes from its authored script, including the second rain entrance',
    loads.map(({ scene, target, ip }) => (game ? [scene, target, ip] : [scene, target])),
    source.route.segments.map(({ scene, leave }, index) =>
      game ? [scene, visits[index].scene, leave] : [scene, visits[index].scene],
    ),
  )
  const world = events.filter(({ kind, visible }) => kind === 'world-drawn' && visible)
  const firstFrames = events.filter((event) => between(event) && event.kind === 'scene-first-drawn')
  check(
    'each scene has a visible frame from its first actual submission',
    firstFrames.map(({ scene }) => scene),
    visits.map(({ scene }) => scene),
  )
  const firstViews = firstFrames.map(({ scene, leader, camera }) => [scene, leader, camera])
  const expectedFirstViews = sourceArrivals(source.commands, visits)
  for (const [index, expected] of expectedFirstViews.entries()) {
    const first = firstFrames[index]
    check(
      `visit ${index + 1} has the original first visible party and camera`,
      firstViews[index],
      expected,
    )
    if (!first) continue
    const nativeFrame = world.find(({ order }) => order === first.order - 1)
    check(
      `visit ${index + 1} first receipt binds the actual submitted world`,
      nativeFrame && [nativeFrame.scene, nativeFrame.leader, nativeFrame.camera],
      expected,
    )
    if (game) continue
    const nextMotion = events.find(
      ({ kind, scene, order, op }) =>
        kind === 'script-op' &&
        scene === first.scene &&
        order > first.order &&
        [
          'moveParty',
          'nudgeParty',
          'cameraPan',
          'cameraSnap',
          'teleportParty',
          'loadScene',
        ].includes(op),
    )
    const next = Math.min(
      nextMotion?.order ?? Infinity,
      firstFrames[index + 1]?.order ?? launch.order,
    )
    const wrong = world.find(
      ({ scene, order, leader, camera }) =>
        scene === first.scene &&
        first.order < order &&
        order < next &&
        !isDeepStrictEqual([scene, leader, camera], expected),
    )
    if (wrong)
      issues.push({
        issue: 'wrong-visible-scene-frame',
        scene: first.scene,
        at: wrong,
        actual: [wrong.scene, wrong.leader, wrong.camera],
        expected,
      })
  }
  const entrance = hooks.find(({ scene }) => scene === spec.scene)
  const returnFrame = world.find(({ scene, order }) => scene === spec.scene && order > won.order)
  check('first visible altar frame after its entry hook', Boolean(firstViews.at(-1)?.[1]), true)
  check('first visible altar frame after victory', Boolean(returnFrame), true)
  const entryFrames = events.filter(
    ({ kind, order }) =>
      launch.order < order && order < won.order && ['entry-band', 'entry-complete'].includes(kind),
  )
  check(
    'the altar dialogue cleared before the battle transition',
    inspectClearedDialogueFrames(draws, entryFrames, spec.scene).issue,
    null,
  )
  const windows = [
    [
      'altar-challenge',
      entrance ?? trigger,
      launch,
      spec.sceneRoute.return.start,
      spec.disk.battle - 1,
    ],
    ['altar-return', won, control, spec.disk.battle + 1, spec.world.handoff.ip - 1],
  ]
  const coverage = windows.map(([phase, start, end, first, last]) =>
    inspectWorldDialogueCoverage({
      phase,
      scene: spec.scene,
      start: start.atMs,
      end: end.atMs,
      expected: sourceDialogueGroups(source.commands, [{ scene: spec.scene, first, last }]),
      actors: ['e4167', 'e4168'],
      events,
      draws,
      locale: source.locale,
      background: true,
    }),
  )
  const stageFrames = world.filter(
    ({ scene, order }) =>
      scene === spec.scene && order > (entrance?.order ?? trigger.order) && order < launch.order,
  )
  const actions = Object.fromEntries(
    spec.watched.map((id) => [
      id,
      distinctPoseSequence(stageFrames, ({ actors }) => poseOf(actors[id])),
    ]),
  )
  const edgeActors = {}
  for (const { edgeActors: culled, camera } of stageFrames) {
    for (const [id, { rect, cullVy, ...actor }] of Object.entries(culled ?? {})) {
      const [, y, , height] = rect
      const screenY = y - camera[1]
      const valid = screenY < 200 && screenY + height > 0 && cullVy === screenY + 4 && cullVy >= 200
      check(`${id} was omitted by the original bottom-edge culling rule`, valid, true)
      const pose = poseOf(actor)
      const witness = { pose, rect, camera, cullVy }
      edgeActors[id] ??= []
      const trace = edgeActors[id]
      if (!isDeepStrictEqual(trace.at(-1), witness)) trace.push(witness)
    }
  }
  const start = Object.fromEntries(
    source.originalSceneActors.map(({ id, x, y, spriteNum }) => [`e${id}`, [spriteNum, [x, y]]]),
  )
  const crowd = Object.fromEntries(
    Object.entries(actions)
      .filter(([id]) => Number(id.slice(1)) <= 4166)
      .map(([id, poses]) => {
        const first = poses.find(Boolean)
        check(`${id} appears at the original altar position`, first?.slice(0, 2), start[id])
        check(`${id} leaves the visible stage by battle entry`, poses.at(-1), null)
        const moving = poses.findIndex((pose) => pose && !isDeepStrictEqual(pose[1], start[id][1]))
        if (Number(id.slice(1)) <= 4155) {
          // These actors play repeatable ambient poses on one fixed foot point.
          check(`${id} remains on the original celebration mark`, moving, -1)
          check(
            `${id} always uses its own celebration sprite`,
            poses.filter(Boolean).every(([sprite]) => sprite === start[id][0]),
            true,
          )
          return [id, []]
        }
        // Pose evidence includes the renderer's actual margin dismissal. The
        // original culls the last four rows earlier than the Reforge blit.
        const escapePoses = distinctPoseSequence(stageFrames, ({ actors, edgeActors }) =>
          poseOf(actors[id] ?? edgeActors?.[id]),
        )
        const from = escapePoses.findIndex(
          (pose) => pose && !isDeepStrictEqual(pose[1], start[id][1]),
        )
        check(`${id} performs a seen escape movement`, from >= 0, true)
        return [id, escapePoses.slice(Math.max(0, from))]
      }),
  )
  const beast = actions.e4167.filter((pose) => pose && pose[3] < 6)
  check(
    'the earth beast is drawn from the first emergence frame through its final standing frame',
    beast,
    Array.from({ length: 6 }, (_, frame) => [...start.e4167, 'down', frame]),
  )
  check(
    'the first actual return shows the earth beast already sunk and the chief standing',
    returnFrame && ['e4167', 'e4168'].map((id) => poseOf(returnFrame.actors[id])),
    [
      [...start.e4167, 'down', 6],
      [start.e4168[0], [944, 1256], 'down', 0],
    ],
  )
  check(
    'the chief begins on the original mark and uses its original starting pose',
    actions.e4168.find(Boolean),
    [...start.e4168, 'up', 6],
  )
  return {
    coverage,
    issues,
    actions,
    edgeActors,
    comparable: {
      firstViews,
      returnView: returnFrame ? [returnFrame.leader, returnFrame.camera] : null,
      chief: chiefPoses(actions.e4168),
      crowd,
      beast,
    },
  }
}
