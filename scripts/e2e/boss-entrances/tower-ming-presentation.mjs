import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { sourceDialogueText } from '../causal-recording-contract.mjs'
import { compareRenderedDialogue } from '../rendered-dialogue-comparison.mjs'

// The original runner keeps portrait layout across some page clears, and paginates
// after four body rows. These windows identify the source instruction of each shown row.
const worldPages = [
  ['s145', 'bottom', 90, null, 23940, 23940],
  ['s145', 'bottom', null, 23953, 23954, 23955],
  ['s145', 'bottom', 90, null, 23958, 23961],
  ['s145', 'bottom', 90, null, 23962, 23962],
  ['s145', 'bottom', null, null, 23967, 23967],
  ['s145', 'bottom', null, null, 23970, 23970],
  ['s169', 'bottom', null, null, 24716, 24717],
  ['s170', 'bottom', null, null, 24743, 24743],
  ['s171', 'bottom', null, null, 24702, 24704],
  ['s169', 'bottom', null, null, 24729, 24729],
  ['s145', 'bottom', null, 23984, 23985, 23986],
  ['s145', 'bottom', 10, 23991, 23992, 23993],
  ['s145', 'bottom', 2, 23999, 24000, 24001],
  ['s145', 'bottom', null, 24005, 24006, 24006],
  ['s145', 'bottom', 5, 24009, 24010, 24012],
  ['s145', 'top', 21, null, 24060, 24060],
  ['s145', 'bottom', 6, 24063, 24064, 24064],
  ['s145', 'bottom', 90, 24067, 24068, 24068],
  ['s145', 'bottom', 21, 24071, 24072, 24074],
  ['s145', 'bottom', 21, 24071, 24076, 24077],
  ['s145', 'bottom', 90, 24080, 24081, 24081],
  ['s145', 'bottom', 21, 24085, 24086, 24086],
  ['s145', 'bottom', 21, 24085, 24088, 24089],
  ['s145', 'top', null, 24096, 24097, 24098],
]

const battlePages = [
  ['bottom', 5, 42238, 42239, 42240],
  ['top', null, 42243, 42244, 42246],
  ['bottom', 5, 42249, 42250, 42251],
  ['top', null, 42254, 42255, 42256],
  ['top', null, null, 42258, 42260],
  ['bottom', 5, 42263, 42264, 42266],
  ['bottom', 5, null, 42268, 42271],
  ['top', null, 42274, 42275, 42276],
  ['top', null, null, 42278, 42280],
  ['bottom', 91, 42283, 42284, 42286],
  ['top', null, 42289, 42290, 42291],
  ['top', null, null, 42293, 42296],
  ['top', null, null, 42297, 42297],
  ['bottom', null, 42385, 42386, 42387],
  ['bottom', 91, 42300, 42301, 42304],
  ['bottom', 91, null, 42306, 42307],
  ['center', null, null, 42322, 42322],
  ['bottom', 9, 42325, 42326, 42326],
  ['bottom', 21, 42329, 42330, 42330],
  ['bottom', null, 42390, 42391, 42391],
  ['narration', null, null, 42426, 42426],
]

function dialoguePages(disk, windows) {
  return windows.map(([scene, slot, portrait, title, first, last]) => ({
    scene,
    slot,
    portrait,
    portraitLayout: portrait !== null || first === 23967 || first === 23970,
    speaker: title === null ? null : sourceDialogueText(disk[title].text).replace(/∶$/u, ''),
    rows: disk.slice(first, last + 1).map(({ op, messageIndex, text }, i) => {
      assert.equal(op, 'showDialog')
      return {
        id: messageIndex === 8917 ? 'dlg.8917.v-bb63e515' : `dlg.${messageIndex}`,
        ip: first + i,
        text: sourceDialogueText(text),
      }
    }),
  }))
}

export function readTowerMingSources(disk, object) {
  assert.deepEqual(
    [object.scriptOnTurnStart, object.scriptOnReady, object.scriptOnBattleEnd],
    [42237, 42384, 42424],
  )
  const { op, itemId, count } = disk[object.scriptOnBattleEnd]
  assert.equal(op, 'giveItem')
  const disguise = disk[24100]
  assert.deepEqual([disguise.opcode, disguise.operands.slice(0, 2)], [0x1a, [1, 5]])
  return {
    worldPages: dialoguePages(disk, worldPages),
    battlePages: dialoguePages(
      disk,
      battlePages.map((page) => ['s145', ...page]),
    ),
    reward: [{ itemId: String(itemId), count: count || 1 }],
  }
}

// The first four looks come from 24710, 24734, 24693 and 24720. The tower
// camera is snapped by 23980; the last scene establishes solo control at 24151.
const firstViews = [
  ['s169', [416, 1376], [576, 1488], 193, 12, null],
  ['s170', [928, 1312], [1088, 1424], 361, 4, ['e2852', 339, 10, [1152, 1472]]],
  ['s171', [720, 904], [880, 1016], 228, 16, ['e2853', 230, 0, [912, 1032]]],
  ['s169', [992, 1040], [1152, 1152], 2, 0, ['e2851', 364, 0, [1200, 1144]]],
  ['s145', [1504, 64], [1552, 424], 2, 6, null],
  ['s153', [1520, 296], [1680, 408], 2, 9, ['e2476', 400, 3, [1648, 440]]],
]

const descentPoses = [
  [272, 1, 10],
  [288, 0, 10],
  [304, 1, 10],
  [320, 0, 10],
  [336, 1, 10],
  [352, 0, 10],
  [368, 1, 4],
  [384, 0, 3],
  [400, 1, 2],
  [416, 2, 0],
  [416, 3, 0],
  [416, 4, 0],
]

export function inspectTowerMingPresentation({ events, draws, boundaries, source, spec, game }) {
  const { trigger, launch, won, control } = boundaries
  const issues = []
  const worldSprite = (id) => source.spriteChunks.get(id) ?? id
  const describeParty = (party) =>
    party?.map(({ id, spriteId, frame, world }) => [id, worldSprite(spriteId), frame, world])
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const rows = (kind) => events.filter((event) => event.kind === kind)
  const visits = rows('scene-first-drawn').filter(({ order }) => order > trigger.order)
  const hooks = rows('scene-hook')
  const arrivals = [
    ...spec.sceneRoute.visits,
    { scene: spec.scene, ...spec.sceneRoute.return },
    { scene: spec.world.handoff.scene, start: 24148 },
  ]
  check(
    'visited scenes',
    visits.map(({ scene }) => scene),
    arrivals.map(({ scene }) => scene),
  )
  check(
    'original scene hooks',
    hooks.map((hook) => (game ? [hook.scene, hook.start] : [hook.scene, hook.variant, hook.stage])),
    arrivals.map((visit) =>
      game
        ? [visit.scene, visit.start]
        : [visit.scene, visit.variant ?? 'default', visit.stage ?? 'initial'],
    ),
  )
  const loads = rows('script-op').filter(({ target }) => target !== undefined)
  const loadIps = [
    spec.sceneRoute.leave,
    ...spec.sceneRoute.visits.map(({ leave }) => leave),
    spec.world.handoff.ip,
  ]
  check(
    'actual scene transfers',
    loads.map(({ target, ip }) => (game ? [target, ip] : target)),
    arrivals.map(({ scene }, index) => (game ? [scene, loadIps[index]] : scene)),
  )
  for (const [i, [scene, camera, leader, sprite, frame, actor]] of firstViews.entries()) {
    const draw = visits[i]
    const hook = hooks[i]
    if (!draw) continue
    const actors = Object.entries(draw.actors).map(([id, pose]) => [
      id,
      pose.asset,
      pose.frame,
      pose.position,
    ])
    check(
      `${scene} visit ${i + 1} first visible layout`,
      {
        camera: draw.camera,
        leader: draw.leader,
        party: describeParty(draw.party),
        actors,
      },
      {
        camera,
        leader,
        party: [['li-xiaoyao', sprite, frame, leader]],
        actors: actor ? [actor] : [],
      },
    )
    check(
      `${scene} visit ${i + 1} setup before reveal`,
      Boolean(hook && hook.order < draw.order && loads[i]?.order < hook.order),
      true,
    )
  }
  check('successor binds its first actual frame', control?.order, visits.at(-1)?.order + 1)
  const towerReturn = visits[4]
  const reunion = rows('world-drawn').filter(
    ({ order, visible }) => towerReturn?.order < order && order < launch.order && visible,
  )
  const actors = (id) =>
    reunion.reduce((poses, draw) => {
      const actor = draw.actors[id]
      if (actor && !isDeepStrictEqual(poses.at(-1)?.position, actor.position)) {
        poses.push({ ...actor, atMs: draw.atMs, order: draw.order })
      }
      return poses
    }, [])
  const king = actors('e2402')
  check(
    'the visible boss enters and reaches his mark before his speech',
    king.map(({ position }) => position),
    [
      [1872, 328],
      [1856, 336],
      [1840, 344],
      [1828, 350],
      [1816, 356],
      [1808, 360],
      [1800, 364],
      [1794, 367],
      [1788, 370],
      [1784, 372],
      [1780, 374],
      [1778, 375],
      [1776, 376],
    ],
  )
  const shakes = rows('scene-composite').filter(
    ({ scene, order, shift }) =>
      scene === 's145' && towerReturn?.order < order && order < launch.order && shift !== 0,
  )
  check(
    'ten actual foreground shake beats before battle',
    shakes.map(({ shift }) => shift),
    Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? 4 : -4)),
  )
  const lin = actors('e2401')
  check(
    'Lin Yueru is visible at the start and end of her walk',
    [lin[0]?.position, lin.at(-1)?.position],
    [
      [1600, 400],
      [1680, 424],
    ],
  )
  check(
    'Lin Yueru reaches the first mark before the boss entrance',
    Boolean(
      lin.some(({ position }) => isDeepStrictEqual(position, [1664, 432])) &&
        lin.at(-1)?.order < king[0]?.order,
    ),
    true,
  )
  const descent = []
  for (const draw of reunion) {
    if (draw.order >= (lin[1]?.order ?? launch.order)) break
    const leader = draw.party.find(({ slot }) => slot === 0)
    if (!leader || worldSprite(leader.spriteId) !== 511) continue
    const [x, y] = leader.world
    if (x !== 1696 || y < 272 || y > 416) continue
    const pose = [y, leader.frame, draw.partyLayer]
    if (!isDeepStrictEqual(descent.at(-1)?.pose, pose)) {
      descent.push({ pose, atMs: draw.atMs, order: draw.order })
    }
  }
  check(
    'Li Xiaoyao visible descent and landing poses',
    descent.map(({ pose }) => pose),
    descentPoses,
  )
  if (descent.length === descentPoses.length) {
    const delta = (first, second) => descent[second].atMs - descent[first].atMs
    const beats = descent.slice(2, 10).map((_, i) => delta(i + 1, i + 2))
    check(
      'one world beat per visible descent step',
      beats.every((ms) => ms >= 70 && ms <= 150),
      true,
    )
    const turnAt = delta(10, 11)
    check(
      'landing pose holds for three world beats before looking up',
      turnAt >= 240 && turnAt <= 365,
      true,
    )
    const afterLanding = lin[1]?.atMs - descent[9].atMs
    check(
      'Lin Yueru starts after Li Xiaoyao completes the landing',
      afterLanding >= 500 && afterLanding <= 710,
      true,
    )
  }
  const appearances = rows('party-battle-sprites').map(({ sprites }) => sprites)
  check(
    'active Zhao Linger battle installation',
    appearances[0]?.[1],
    game ? 5 : 'player-fighter-5',
  )
  const tracks = rows('music-start').filter(
    ({ order }) => trigger.order < order && order < control.order,
  )
  check(
    'music starts across dream, battle and handoff',
    tracks.map(({ track, context }) => [track, context]),
    [22, 45, 18, 2, 36].map((track) => [track, 'running']),
  )
  const recovery = rows('post-battle-party')[0]
  check(
    'real post-settlement recovery before removing followers',
    recovery?.party.map(({ id, hp, mp, level }) => [id, hp, mp, level]),
    [
      ['li-xiaoyao', 1936, 100, 35],
      ['zhao-linger', 2395, 280, 46],
      ['lin-yueru', 2107, 90, 35],
    ],
  )
  check('original equipment reward after victory', recovery?.inventory, source.route.ming.reward)
  check(
    'post-settlement boundary before successor transfer',
    Boolean(recovery && won.order < recovery.order && recovery.order < loads.at(-1)?.order),
    true,
  )

  const pages = source.route.ming
  const dialogue = [
    compareRenderedDialogue(
      draws.filter(({ atMs }) => trigger.atMs <= atMs && atMs < launch.atMs),
      pages.worldPages,
      source.locale,
    ),
    compareRenderedDialogue(
      draws.filter(({ atMs }) => launch.atMs <= atMs && atMs < control.atMs),
      pages.battlePages,
      source.locale,
    ),
  ]
  for (const { findings } of dialogue) issues.push(...findings)
  const challenge = dialogue[0].checked.at(-1)
  check(
    'the boss reaches his mark by the first complete dialogue page',
    Boolean(king.at(-1)?.atMs <= challenge.firstComplete?.atMs),
    true,
  )
  return { issues, visits, dialogue, recovery, appearances, tracks, king, shakes, lin, descent }
}
