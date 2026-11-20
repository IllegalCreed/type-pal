import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { compareRenderedDialogue, sourceDialogueGroups } from '../rendered-dialogue-comparison.mjs'

const worldBeat = 100
const altar = 's067'
const treatment = 's077'

const rawPose = ({ spriteNum, x, y, direction, nSpriteFrames, currentFrameNum }) => [
  spriteNum,
  [x, y],
  direction * nSpriteFrames + currentFrameNum,
]

export function readStoneElderSources(commands, before, after, turnStart) {
  const actor = (scene, id) => scene.eventObjects.find((event) => event.id === id)
  const raw = (ip, opcode) => {
    assert.equal(commands[ip].opcode, opcode)
    return commands[ip].operands
  }
  const ticks = (ip) => raw(ip, 0x09)[0] * worldBeat
  const approach = Object.fromEntries(
    [1343, 1344, 1345].map((id) => {
      const event = actor(before, id)
      const ip = Number(event.autoLabel.slice(2))
      const [x, y, h] = raw(ip + 1, 0x82)
      const stand = id === 1343 ? raw(ip + 3, 0x14)[0] : 9
      return [`e${id}`, [event.spriteNum, [x * 32 + h * 16, y * 16 + h * 8], stand]]
    }),
  )
  const [dx, dy, count] = raw(12697, 0x7f)
  assert.deepEqual(raw(12702, 0x7f), [0x10000 - dx, 0x10000 - dy, count])
  const cameraTravel = Array.from({ length: count * 2 }, (_, i) => {
    const step = i < count ? i + 1 : count * 2 - i - 1
    return [dx * step, dy * step]
  })
  assert.deepEqual(raw(turnStart, 0x79), [41, 41473, 0])
  const pages = sourceDialogueGroups(commands, [
    { scene: altar, first: 12657, last: 12659 },
    { scene: altar, first: turnStart + 1, last: 41471 },
    { scene: altar, first: 12690, last: 12802 },
  ])
  assert.equal(pages.length, 32)
  const mengci = rawPose(actor(after, 1488))
  assert.equal(raw(Number(actor(after, 1488).autoLabel.slice(2)), 0x10)[2], 1)
  // The first incoming world beat advances the walking actor before the fade reveals the room.
  const [asset, [x, y], pose] = mengci
  return {
    pages,
    approach,
    signal: raw(12660, 0x47)[0],
    movingAt: ticks(12668) + ticks(12670),
    standBeforeBattle: ticks(12673),
    fall: [ticks(12684), ticks(12686)],
    cameraTravel,
    fallen: Object.fromEntries([1346, 1347].map((id) => [`e${id}`, rawPose(actor(before, id))])),
    successor: {
      e1487: rawPose(actor(after, 1487)),
      e1488: [asset, [x + 6, y - 3], pose + 1],
      e1492: rawPose(actor(after, 1492)),
    },
    injuredSprite: raw(12679, 0x65)[1],
    treatmentSprite: raw(12820, 0x65)[1],
    treatmentPose: raw(12822, 0x15)[1],
    continuation: 12677,
  }
}

const figure = (actor) => actor && [actor.asset, actor.position, actor.frame]
const nearby = (actual, expected) => Math.abs(actual - expected) <= 65
const visiblePart = ({ rect: [x, y, w, h] }, [cx, cy]) =>
  x < cx + 320 && x + w > cx && y < cy + 200 && y + h > cy

export function inspectStoneElderPresentation({ events, draws, boundaries, source, game }) {
  const { trigger, launch, won, control } = boundaries
  const facts = source.stoneElder
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const pages = compareRenderedDialogue(
    draws.filter(
      ({ scene, atMs }) => scene === altar && atMs >= trigger.atMs && atMs < control.atMs,
    ),
    facts.pages,
    source.locale,
  )
  issues.push(...pages.findings)
  check(
    'each complete page is drawn in its own world or battle interval',
    pages.checked?.map(({ firstComplete }) =>
      firstComplete === null
        ? null
        : firstComplete.atMs < launch.atMs
          ? 'warning'
          : firstComplete.atMs < won.atMs
            ? 'battle'
            : 'aftermath',
    ),
    ['warning', ...Array(8).fill('battle'), ...Array(23).fill('aftermath')],
  )
  const world = events.filter(({ kind, scene }) => kind === 'world-drawn' && scene === altar)
  const signal = events.find(
    ({ kind, asset, order }) =>
      kind === 'sfx-start' &&
      asset === facts.signal &&
      order > trigger.order &&
      order < launch.order,
  )
  check('ambush sound plays before opening battle', Boolean(signal), true)
  const warning = world.findLast(
    ({ visible, order, actors }) =>
      visible && order < (signal?.order ?? launch.order) && actors.e1342,
  )
  check('Han Mengci faces the party while warning them', figure(warning?.actors.e1342), [
    138,
    [1344, 1040],
    3,
  ])
  const march = world.filter(
    ({ visible, order }) =>
      visible && order > (signal?.order ?? launch.order) && order < launch.order,
  )
  const resolved = march.at(-1)
  const cast = (draw, ids) => Object.fromEntries(ids.map((id) => [id, figure(draw?.actors[id])]))
  check(
    'Stone Elder and two guards finish the ambush before battle',
    cast(resolved, Object.keys(facts.approach)),
    facts.approach,
  )
  check(
    'hidden civilians stay off the battle approach',
    [resolved?.actors.e1340, resolved?.actors.e1341],
    [undefined, undefined],
  )
  const visibleMarch = (id) => {
    const changes = []
    for (const { atMs, actors, camera } of march) {
      const pose = actors[id]
      if (!pose || !visiblePart(pose, camera)) continue
      const value = [pose.position, pose.frame]
      if (!isDeepStrictEqual(changes.at(-1)?.value, value)) changes.push({ atMs, value })
    }
    return changes
  }
  const elder = visibleMarch('e1343')
  check(
    'each visible step and the settled stance of Stone Elder',
    elder.map(({ value }) => value),
    [
      [[1152, 912], 0],
      [[1136, 920], 2],
      [[1120, 928], 0],
      [[1136, 936], 10],
      [[1152, 944], 9],
      [[1168, 952], 9],
      [[1168, 952], 12],
    ],
  )
  const marchAt = elder.slice(0, 6).map(({ atMs }) => atMs)
  check(
    'the ambush advances on consecutive world beats',
    marchAt.length === 6 &&
      marchAt.every((atMs, i) => i === 0 || nearby(atMs - marchAt[i - 1], worldBeat)),
    true,
  )
  const way = []
  for (const draw of march) {
    if (!isDeepStrictEqual(way.at(-1)?.leader, draw.leader)) way.push(draw)
  }
  check(
    'the party starts its walk after the ambush signal and holds at the battle spot',
    [
      nearby(way[1]?.atMs - signal?.atMs, facts.movingAt),
      nearby(launch.atMs - way.at(-1)?.atMs, facts.standBeforeBattle),
    ],
    [true, true],
  )
  check(
    'the party rounds the corner at the intended positions',
    way.map(({ leader }) => leader),
    [
      [1280, 1024],
      [1280, 1008],
      [1264, 1000],
      [1248, 992],
      [1232, 984],
    ],
  )
  const formation = way
    .slice(1)
    .map(({ party }) =>
      party
        .toSorted((a, b) => a.slot - b.slot)
        .map(({ world, frame }) => [world, Math.floor(frame / 3)]),
    )
  check('each follower uses the source feet and facing after the turn', formation, [
    [
      [[1280, 1008], 1],
      [[1280, 1024], 3],
      [[1280, 1024], 3],
    ],
    [
      [[1264, 1000], 1],
      [[1280, 1024], 1],
      [[1296, 1016], 1],
    ],
    [
      [[1248, 992], 1],
      [[1296, 1016], 2],
      [[1264, 1016], 2],
    ],
    [
      [[1232, 984], 1],
      [[1280, 1008], 1],
      [[1248, 1008], 1],
    ],
  ])
  if (formation.length === 4) {
    const gait = way
      .slice(1)
      .map(({ party }) => party.toSorted((a, b) => a.slot - b.slot).map(({ frame }) => frame % 3))
    // Either leg can lead following the fixture's input walk. The alternating stride is visible.
    check(
      'both moving poses alternate legs and both standing poses settle',
      [
        gait[0].every((frame) => frame === gait[0][0] && (frame === 1 || frame === 2)),
        gait[1].every((frame) => frame === 0),
        gait[2].every((frame) => frame === 3 - gait[0][0]),
        gait[3].every((frame) => frame === 0),
      ],
      [true, true, true, true],
    )
  }

  const retreat = world.filter(
    ({ visible, order }) => visible && won.order < order && order < control.order,
  )
  const first = retreat[0]
  const sprite = ({ spriteId }) =>
    typeof spriteId === 'number' ? spriteId : source.spriteChunks.get(spriteId)
  const lead = (draw) => draw?.party.find(({ slot }) => slot === 0)
  const fallen = retreat.filter((draw) => lead(draw) && sprite(lead(draw)) === facts.injuredSprite)
  const firstTwoPoses = [
    lead(first)?.frame,
    lead(fallen.find((draw) => lead(draw).frame === 1))?.frame,
  ]
  check(
    'first restored altar frame uses the fallen leader and one visible fallen companion',
    [
      first?.party.length,
      lead(first) && sprite(lead(first)),
      lead(first)?.world,
      firstTwoPoses,
      figure(first?.actors.e1347),
    ],
    [1, facts.injuredSprite, [1232, 984], [0, 1], facts.fallen.e1347],
  )
  const rises = fallen.find((draw) => lead(draw).frame === 1)
  const restored = retreat.find(
    (draw) => draw.order > rises?.order && lead(draw) && sprite(lead(draw)) !== facts.injuredSprite,
  )
  check(
    'both injured poses hold for the source number of beats',
    [
      nearby(rises?.atMs - first?.atMs, facts.fall[0]),
      nearby(restored?.atMs - rises?.atMs, facts.fall[1]),
    ],
    [true, true],
  )
  const camera = []
  for (const draw of retreat) {
    if (!isDeepStrictEqual(camera.at(-1)?.camera, draw.camera)) camera.push(draw)
  }
  const origin = [1072, 872]
  check(
    'camera pans out and back on the original offsets',
    camera.map(({ camera }) => camera),
    [origin, ...facts.cameraTravel.map(([dx, dy]) => [origin[0] + dx, origin[1] + dy])],
  )
  const companion = camera.find(({ actors }) => actors.e1346)
  check(
    'the camera reveals the other fallen companion in the source pose',
    figure(companion?.actors.e1346),
    facts.fallen.e1346,
  )
  for (const pan of [camera.slice(1, 9), camera.slice(9)]) {
    check(
      'camera pan holds each step for one world beat',
      pan.length === 8 &&
        pan.every(({ atMs }, i) => i === 0 || nearby(atMs - pan[i - 1].atMs, worldBeat)),
      true,
    )
  }
  check(
    'story defeat continues with the source branch',
    game
      ? [won.gameOver, won.continuation]
      : events.filter(({ kind }) => kind === 'script-result').map(({ arm }) => arm),
    game ? [false, facts.continuation] : ['onLose'],
  )
  check(
    'battle and aftermath music inherit through the first view of the treatment scene',
    events
      .filter(
        ({ kind, order }) =>
          kind === 'music-start' && order >= trigger.order && order < control.order,
      )
      .map(({ track }) => track),
    [40, 33],
  )
  const firstTarget = events.find(
    ({ kind, scene, visible }) => kind === 'world-drawn' && scene === treatment && visible,
  )
  check(
    'the treatment scene begins under cover',
    events.some(
      ({ kind, scene, order, visible }) =>
        kind === 'world-drawn' && scene === treatment && order < firstTarget?.order && !visible,
    ),
    true,
  )
  check(
    'first visible treatment frame uses the injured leader and all three actors',
    [
      firstTarget?.order,
      control.party?.length,
      lead(control) && sprite(lead(control)),
      lead(control)?.frame,
      cast(control, Object.keys(facts.successor)),
    ],
    [control.order - 1, 1, facts.treatmentSprite, facts.treatmentPose, facts.successor],
  )
  return { issues, pages, elder, march: way, fallenAt: first, camera, coverAt: firstTarget?.atMs }
}
