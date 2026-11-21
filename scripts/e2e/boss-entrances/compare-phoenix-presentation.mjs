import { isDeepStrictEqual } from 'node:util'
import {
  compareRenderedDialogue,
  inspectClearedDialogueFrames,
} from '../rendered-dialogue-comparison.mjs'

export function inspectPhoenixPresentation({ events, draws, bounds, source, spec, game }) {
  const { trigger, launch, entry, won, control } = bounds
  const { scene } = spec
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const world = events.filter(({ kind, visible }) => kind === 'world-drawn' && visible)
  const forest = world.filter((event) => event.scene === scene)
  const before = forest.filter(({ order }) => order > trigger.order && order < launch.order)
  const after = forest.filter(({ order }) => order > won.order && order < control.order)
  const next = world.filter((event) => event.scene === spec.world.handoff.scene)
  const first = next[0]
  const sprite = (id) => (typeof id === 'string' ? source.spriteChunks.get(id) : id)
  const party = (frame) =>
    frame?.party.map(({ id, spriteId, frame, world }) => [id, sprite(spriteId), world, frame])
  const checkpoint = forest.find(({ order }) => order < trigger.order)
  check(
    'same native checkpoint costume, feet and camera',
    [party(checkpoint), checkpoint?.camera],
    [[['li-xiaoyao', 2, [320, 272], 3]], [160, 160]],
  )

  const steps = distinct(before.map(({ leader, camera }) => [leader, camera])).filter(
    ([[x]]) => x >= 312,
  )
  check('the two recoil steps use the original coordinates and camera', steps, [
    [
      [312, 268],
      [152, 156],
    ],
    [
      [320, 272],
      [160, 160],
    ],
  ])
  const cue = events.filter(
    ({ kind, order, asset }) =>
      kind === 'sfx-start' &&
      order > trigger.order &&
      order < launch.order &&
      asset === source.phoenix.audition,
  )
  check('the Phoenix call actually reached the output once', cue.length, 1)
  const timings = steps.map(
    ([feet]) => before.find(({ leader }) => isDeepStrictEqual(leader, feet)).atMs,
  )
  check(
    'the recoil and battle entrance use the three world waits',
    Boolean(
      cue.length === 1 &&
        timings.length === 2 &&
        Math.abs(timings[0] - cue[0].atMs - 700) <= 65 &&
        Math.abs(timings[1] - timings[0] - 200) <= 65 &&
        Math.abs(launch.atMs - timings[1] - 300) <= 65,
    ),
    true,
  )

  const pose = (a) => a && [a.asset, a.position, a.frame]
  const flight = distinct(before.map(({ actors }) => pose(actors.e3116)).filter(Boolean))
  const approachFrames = Array.from({ length: 11 }, (_, i) => [
    522,
    [256, 152 + i * 8],
    (i + 1) % 4,
  ])
  check(
    'eleven actual approach steps fly toward the party',
    flight.filter((f) => f[1][1] >= 152 && f[1][1] <= 232),
    approachFrames,
  )
  const leave = distinct(after.map(({ actors }) => pose(actors.e3116)).filter(Boolean))
  check('Phoenix returns at the last prebattle position', leave[0], [522, [256, 240], 0])
  check(
    'Phoenix heads left at the original height and frame cycle',
    leave.slice(1, 13),
    Array.from({ length: 12 }, (_, i) => [522, [248 - i * 8, 242 + i * 2], (i + 1) % 4]),
  )

  const firstBand = events.find(({ kind, band }) => kind === 'entry-band' && band === 6)
  const clear = inspectClearedDialogueFrames(draws, [firstBand, entry].filter(Boolean), scene)
  if (clear.issue)
    issues.push({
      rule: 'No field dialogue remains on the fully painted battlefield',
      ...clear.issue,
    })

  const groups = source.phoenix.pages.map((group) =>
    game || group.rows[0].id !== 'dlg.9240'
      ? group
      : { ...group, rows: group.rows.map((row) => ({ ...row, id: 'dlg.9240.v-fff7a9a9' })) },
  )
  const dialogue = compareRenderedDialogue(
    draws.filter(
      (draw) => draw.scene === scene && draw.atMs > won.atMs && draw.atMs < control.atMs,
    ),
    groups,
    source.locale,
  )
  issues.push(...dialogue.findings)
  const beforePage = (id) => {
    const time = dialogue.checked?.find(({ rows }) => rows[0].id === id)?.firstComplete?.atMs
    return after.findLast(({ atMs }) => atMs <= time)
  }
  for (const [id, expected] of [
    ['dlg.9245', [448, [355, 379], 10]],
    ['dlg.9247', [448, [355, 379], 27]],
    ['dlg.9255', [448, [273, 504], 27]],
    ['dlg.9260', [448, [273, 504], 10]],
    ['dlg.9262', [448, [273, 504], 16]],
  ]) {
    check(
      `Anu is in position and holds the source pose during ${id}`,
      pose(beforePage(id)?.actors.e3113),
      expected,
    )
  }

  const cast = Object.fromEntries(
    ['e3112', 'e3113', 'e3117', 'e3118', 'e3119', 'e3120', 'e3121'].map((id) => [
      id,
      distinct(
        after.map(({ actors }) => {
          const actor = actors[id]
          return actor ? [...pose(actor), actor.facing] : null
        }),
      ),
    ]),
  )
  check('the egg vanishes once during the acted exchange', cast.e3112, [
    [517, [288, 240], 0, 'down'],
    null,
  ])

  const fall = after.filter(
    ({ camera, actors }) =>
      camera[0] === 106 && camera[1] >= 408 && camera[1] <= 1344 && actors.e3117,
  )
  const pan = distinct(fall.map(({ camera, actors }) => [camera, pose(actors.e3117)]))
  check(
    'the long pan follows forty actual descending poses',
    pan,
    Array.from({ length: 40 }, (_, i) => [
      [106, 408 + 24 * i],
      [520, [304, 586 + 25 * i], 6],
    ]),
  )
  const ledge = beforePage('dlg.9265')
  check(
    'all four authored images appear on the ledge at the right pose',
    ['e3118', 'e3119', 'e3120', 'e3121'].map((id) => pose(ledge?.actors[id])),
    [
      [448, [1008, 600], 28],
      [447, [1056, 608], 2],
      [447, [1072, 616], 5],
      [447, [1088, 624], 8],
    ],
  )

  const revealPos = [544, 1440]
  const revealCam = [384, 1328]
  check(
    'successor first reveal has the authored new sprite, exact feet and camera',
    [party(first), first?.camera],
    [[['li-xiaoyao', source.phoenix.entrySprite, revealPos, 0]], revealCam],
  )
  const seen = next.findIndex(({ party }) => party[0]?.frame === 1)
  check('the changed sprite plays its first gesture', seen > 0, true)
  if (seen >= 0) {
    for (const frame of next.slice(0, seen + 1)) {
      check(
        'the replacement costume and its location are stable through the first gesture',
        [frame.camera, party(frame).map(([id, asset, xy]) => [id, asset, xy])],
        [revealCam, [['li-xiaoyao', source.phoenix.entrySprite, revealPos]]],
      )
    }
  }
  const mapScore = events.find(
    ({ kind, order, track, context }) =>
      kind === 'music-start' &&
      order > won.order &&
      track === source.successorTrack &&
      context === 'running',
  )
  check(
    'the same forest music returns before the next scene',
    !!mapScore && mapScore.order < control.order,
    true,
  )
  return {
    issues,
    dialogue,
    reveal: first,
    firstGesture: next[seen],
    approach: flight,
    departure: leave,
    cast,
    pan,
  }
}

function distinct(items) {
  return items.filter((item, i) => !isDeepStrictEqual(item, items[i - 1]))
}
