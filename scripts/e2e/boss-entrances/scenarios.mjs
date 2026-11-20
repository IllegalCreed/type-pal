import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { readFireQilinSources } from './fire-qilin-presentation.mjs'
import { readGaiLuojiaoSources } from './gai-luojiao-presentation.mjs'
import { readGoldenToadSources } from './golden-toad-presentation.mjs'
import { readPhoenixSources } from './phoenix-presentation.mjs'
import { readPoisonLadySources } from './poison-lady-presentation.mjs'
import { readRingOpening } from './ring-opening-presentation.mjs'
import { readStoneElderAutoPresentation } from './stone-elder-auto-presentation.mjs'
import { readStoneElderSources } from './stone-elder-presentation.mjs'
import { readTowerMingSources } from './tower-ming-presentation.mjs'
import { readWoodTaoistSources } from './wood-taoist-presentation.mjs'

export const fieldMusic = 78
export const fieldMusicAsset = 'music.pal.078'

const musicId = (track) => String(track).padStart(3, '0')
export const nativeMusic = (track) => `music.pal.${musicId(track)}`
export const initialTrack = (spec) => spec.mapMusic?.track ?? fieldMusic
export const returnTrack = (spec) => spec.world.music?.track ?? initialTrack(spec)
export const returnedPosition = (spec) => spec.world.returned ?? spec.contact
export const departingPosition = (spec) => spec.world.departure ?? spec.start
export const battleOperands = (spec) => [spec.team, spec.disk.loss ?? 41075, spec.disk.flee ?? 0]
export const isBossBattle = (spec) => battleOperands(spec)[2] === 0
export const observesForeground = (spec) =>
  spec.prelude !== undefined ||
  spec.revisit !== undefined ||
  spec.world.join !== undefined ||
  spec.world.handoff !== undefined ||
  spec.world.scriptedReturn !== undefined ||
  spec.disk.victory !== undefined ||
  spec.disk.termination !== undefined

export const party = [
  {
    role: 'li-xiaoyao',
    roleId: 0,
    level: 35,
    hp: 730,
    maxHP: 730,
    mp: 100,
    maxMP: 100,
    attack: 660,
    defense: 170,
    speed: 210,
    magicAttack: 65,
    luck: 32,
  },
  {
    role: 'lin-yueru',
    roleId: 2,
    level: 35,
    hp: 690,
    maxHP: 690,
    mp: 90,
    maxMP: 90,
    attack: 535,
    defense: 165,
    speed: 190,
    magicAttack: 60,
    luck: 32,
  },
]

const cityParty = [party[0], { ...party[1], role: 'zhao-linger', roleId: 1 }]
const fullParty = [...cityParty, party[1]]
const mingParty = [
  { ...fullParty[0], hp: 2800, maxHP: 2800, attack: 990 },
  { ...fullParty[1], hp: 2800, maxHP: 2800, attack: 940 },
  { ...fullParty[2], hp: 2800, maxHP: 2800, attack: 910 },
]
const mingOpeningParty = [mingParty[0], mingParty[2]]
const taoyuanParty = [
  { ...party[0], hp: 990, maxHP: 990, mp: 220, maxMP: 220, defense: 350 },
  {
    ...party[1],
    role: 'anu',
    roleId: 4,
    hp: 970,
    maxHP: 970,
    mp: 410,
    maxMP: 410,
    attack: 360,
    magicAttack: 420,
    defense: 330,
  },
]
export function partyFor(spec) {
  const members =
    {
      xiaoyao: [party[0]],
      'xiaoyao-protected': [{ ...party[0], defense: 350 }],
      city: cityParty,
      tomb: fullParty,
      ming: mingOpeningParty,
      taoyuan: taoyuanParty,
      'anu-led': [taoyuanParty[1], taoyuanParty[0]],
    }[spec.party] ?? party
  return spec.initialHP === undefined
    ? members
    : members.map((member) => ({ ...member, hp: spec.initialHP }))
}
export function battlePartyFor(spec) {
  if (spec.party === 'ming') return mingParty
  if (spec.automatic) return spec.automatic.members
  const members = partyFor(spec)
  return spec.solo ? members.slice(0, 1) : members
}

export const statsFields = {
  level: 'rgwLevel',
  hp: 'rgwHP',
  maxHP: 'rgwMaxHP',
  mp: 'rgwMP',
  maxMP: 'rgwMaxMP',
  attack: 'rgwAttackStrength',
  defense: 'rgwDefense',
  speed: 'rgwDexterity',
  magicAttack: 'rgwMagicStrength',
  luck: 'rgwFleeRate',
}

export const growthPools = {
  maxHP: 'rgHealthExp',
  maxMP: 'rgMagicExp',
  attack: 'rgAttackExp',
  magicAttack: 'rgMagicPowerExp',
  defense: 'rgDefenseExp',
  speed: 'rgDexterityExp',
  luck: 'rgFleeExp',
}

const innLeader = {
  id: 'inn-miao-leader',
  scene: 's003',
  owner: 'e59',
  watched: ['e56', 'e57', 'e58', 'e60', 'e61', 'e62', 'e68'],
  team: 19,
  enemy: 'enemy-485',
  start: [137, 69, 0],
  contact: [137, 68, 0],
  approach: 'ArrowUp',
  party: 'city',
  music: 38,
  field: 24,
  slot: 1,
  seed: 4,
  settlementDwellMs: 180,
  disk: { entry: 2719, battle: 2721, last: 2872, owner: [1216, 1344, 2, 3] },
  predecessor: { scene: 's020', actor: 'e349', start: 4881, end: 4907 },
  mapMusic: { scene: 's004', ip: 1, track: 49 },
  entrance: {
    scene: 's004',
    owner: 'e94',
    ip: 43,
    key: 'ArrowUp',
    start: [95, 16, 0],
    contact: [95, 15, 0],
    landing: [137, 71, 0],
    walk: [
      [137, 70, 0],
      [137, 69, 0],
    ],
  },
  world: {
    inventory: [],
    returned: [142, 70, 0],
    scriptedReturn: { position: 2728, wait: 2741, members: ['li-xiaoyao'] },
    music: { ip: 2722, track: 30 },
  },
}

function innEscort(owner, originalPose, approach, walk, contact) {
  return {
    ...innLeader,
    id: `inn-miao-${owner}`,
    owner,
    watched: ['e56', 'e57', 'e58', 'e59', 'e60', 'e61', 'e68'].filter((id) => id !== owner),
    start: walk.at(-1),
    contact,
    approach,
    disk: { ...innLeader.disk, owner: originalPose },
    entrance: { ...innLeader.entrance, walk },
  }
}

function towerFox(scene, owner, start, contact, position, music, musicIp, mapMusic) {
  return {
    id: `tower-fox-${scene}`,
    scene,
    owner,
    team: 44,
    enemy: 'enemy-469',
    start: [...start, 0],
    contact: [...contact, 0],
    approach: 'ArrowDown',
    music,
    field: 40,
    slot: 1,
    seed: 4,
    settlementDwellMs: 180,
    disk: {
      entry: 41264,
      battle: 41264,
      victory: 41127,
      last: 41129,
      flee: 41073,
      music: musicIp,
      field: 22378,
      owner: [...position, 2, 5],
    },
    mapMusic,
    world: { gameState: -2, triggerMode: 5, inventory: [], exit: 'ArrowUp' },
  }
}

const gaiLuojiao = {
  scene: 's215',
  owner: 'e3657',
  watched: ['e3658', 'e3659', 'e3660', 'e3661', 'e3662', 'e3663', 'e3664'],
  team: 223,
  enemy: 'enemy-501',
  start: [52, -15, 0],
  contact: [53, -15, 0],
  approach: 'ArrowRight',
  party: 'xiaoyao',
  music: 38,
  field: 20,
  slot: 0,
  seed: 4,
  settlementDwellMs: 180,
  disk: {
    entry: 31158,
    battle: 31162,
    loss: 0,
    last: 31280,
    owner: [1152, 320, 2, 7],
    field: 30649,
    music: 31161,
  },
  mapMusic: { scene: 's215', ip: 30648, track: 70 },
  world: {
    gameState: 0,
    triggerMode: 7,
    exit: 'ArrowLeft',
    join: { ip: 31278, role: 'anu', roleId: 4 },
    music: { ip: 31279, track: 70 },
  },
}

export const scenarios = {
  'inn-leader': innLeader,
  'inn-e60': innEscort(
    'e60',
    [1184, 1312, 2, 3],
    'ArrowRight',
    [
      [136, 71, 0],
      [135, 71, 0],
      [134, 71, 0],
      [134, 70, 0],
      [134, 69, 0],
      [134, 68, 0],
      [134, 67, 0],
      [134, 66, 0],
      [134, 65, 0],
      [134, 64, 0],
      [134, 63, 0],
      [135, 63, 0],
    ],
    [136, 63, 0],
  ),
  'inn-e61': innEscort(
    'e61',
    [1152, 1344, 2, 3],
    'ArrowRight',
    [
      [138, 71, 0],
      [139, 71, 0],
    ],
    [140, 71, 0],
  ),
  snake: {
    id: 'hidden-dragon-snake',
    scene: 's041',
    owner: 'e671',
    team: 45,
    enemy: 'enemy-486',
    start: [75, 27, 0],
    contact: [75, 26, 0],
    music: 39,
    field: 27,
    slot: 0,
    seed: 4,
    disk: { entry: 9472, battle: 9492, last: 9494, owner: [816, 776, 1, 7] },
    world: { gameState: 1, triggerMode: 2, inventory: [] },
  },
  fox: {
    id: 'hidden-dragon-fox',
    scene: 's047',
    owner: 'e760',
    team: 44,
    enemy: 'enemy-469',
    start: [64, -23, 0],
    contact: [64, -24, 0],
    music: 38,
    field: 27,
    slot: 1,
    seed: 4,
    disk: { entry: 9498, battle: 9552, last: 9589, owner: [1440, 304, 2, 6], reward: 9554 },
    world: { gameState: 0, triggerMode: 6, inventory: [{ itemId: '289', count: 1 }] },
  },
  'fox-tower-s148': towerFox('s148', 'e2436', [83, 48], [83, 49], [512, 1056], 37, 22386, {
    scene: 's148',
    ip: 22385,
    track: 79,
  }),
  'fox-tower-s165': towerFox('s165', 'e2716', [49, 21], [49, 22], [432, 584], 43, 22379, {
    scene: 's146',
    ip: 22381,
    track: 80,
  }),
  'tian-ghost': {
    id: 'tower-tian-ghost',
    scene: 's148',
    owner: 'e2433',
    watched: ['e2432', 'e2429'],
    team: 293,
    enemy: 'enemy-529',
    start: [117, 61, 0],
    contact: [117, 62, 0],
    approach: 'ArrowDown',
    music: 37,
    field: 40,
    slot: 0,
    seed: 4,
    disk: {
      entry: 23512,
      battle: 23538,
      last: 23618,
      loss: 0,
      confirm: 23518,
      termination: 42235,
      music: 22386,
      field: 22378,
      owner: [864, 1440, 2, 2],
    },
    mapMusic: { scene: 's148', ip: 22385, track: 79 },
    world: {
      inventory: [],
      gameState: 2,
      triggerMode: 2,
      returned: [121, 62, 0],
      departure: [121, 61, 0],
      exit: 'ArrowUp',
    },
  },
  'tower-ming': {
    id: 'tower-ming',
    scene: 's145',
    owner: 'e2399',
    watched: ['e2400', 'e2401', 'e2402', 'e2851', 'e2852', 'e2853', 'e2854', 'e2476'],
    team: 188,
    enemy: 'enemy-519',
    start: [76, -19, 0],
    contact: [76, -20, 0],
    approach: 'ArrowUp',
    party: 'ming',
    music: 45,
    field: 32,
    slot: 1,
    seed: 4,
    disk: {
      entry: 23933,
      battle: 24108,
      last: 24112,
      music: 24107,
      field: 24106,
      owner: [1536, 432, 1, 5],
    },
    sceneRoute: {
      leave: 23971,
      visits: [
        { scene: 's169', start: 24710, leave: 24718 },
        { scene: 's170', start: 24734, leave: 24764 },
        { scene: 's171', start: 24693, leave: 24708 },
        { scene: 's169', start: 24720, stage: 'legacy-002', leave: 24731 },
      ],
      return: { start: 23975, variant: 'legacy-001', select: 24730 },
    },
    mapMusic: { scene: 's145', ip: 22593, track: 81 },
    world: {
      inventory: [],
      music: { ip: 24109, track: 36 },
      handoff: {
        scene: 's153',
        ip: 24111,
        position: [78, -27, 0],
        positionIp: 24151,
        members: ['li-xiaoyao'],
      },
    },
  },
  spider: {
    id: 'black-spider',
    scene: 's139',
    owner: 'e2346',
    watched: ['e2347'],
    team: 43,
    enemy: 'enemy-498',
    start: [66, 30, 0],
    contact: [67, 30, 0],
    approach: 'ArrowRight',
    music: 39,
    field: 11,
    slot: 0,
    seed: 4,
    disk: {
      entry: 21672,
      battle: 21690,
      last: 21691,
      owner: [608, 784, 1, 5],
      field: 21647,
      music: 21648,
      defeated: { ip: 42828, note: 13349, itemId: '152' },
    },
    mapMusic: { scene: 's139', ip: 21649, track: 36 },
    world: {
      gameState: 0,
      triggerMode: 5,
      returned: [69, 30, 0],
      departure: [70, 30, 0],
      exit: 'ArrowRight',
      inventory: [{ itemId: '152', count: 1 }],
    },
  },
  'poison-lady': {
    id: 'poison-lady',
    scene: 's138',
    owner: 'e2341',
    watched: ['e2337', 'e2338', 'e2339', 'e2340', 'e2342', 'e2343', 'e2372', 'e2374', 'e2375'],
    team: 42,
    enemy: 'enemy-435',
    start: [131, 41, 0],
    contact: [130, 41, 0],
    approach: 'ArrowLeft',
    music: 38,
    field: 42,
    slot: 0,
    seed: 4,
    disk: {
      entry: 21692,
      battle: 21805,
      last: 21878,
      loss: 0,
      owner: [1376, 1360, 1, 6],
      field: 21803,
      music: 21804,
      scriptedStop: 41553,
    },
    mapMusic: { scene: 's139', ip: 21649, track: 36 },
    world: {
      inventory: [],
      handoff: {
        scene: 's140',
        ip: 21877,
        position: [125, 41, 0],
        musicIp: 21900,
        members: ['li-xiaoyao'],
      },
    },
  },
  'stone-elder-guiyin': {
    id: 'stone-elder-guiyin',
    scene: 's067',
    owner: 'e1342',
    watched: [
      'e1340',
      'e1341',
      'e1343',
      'e1344',
      'e1345',
      'e1346',
      'e1347',
      'e1487',
      'e1488',
      'e1492',
    ],
    team: 34,
    enemy: 'enemy-496',
    start: [103, 24, 0],
    contact: [104, 24, 0],
    approach: 'ArrowRight',
    party: 'tomb',
    initialHP: 1,
    music: 40,
    field: 57,
    slot: 1,
    seed: 4,
    disk: {
      entry: 12655,
      battle: 12676,
      field: 12674,
      music: 12675,
      last: 12805,
      loss: 0,
      owner: [1344, 1040, 1, 7],
    },
    mapMusic: { scene: 's067', ip: 12925, track: 19 },
    world: {
      outcome: 'lost',
      inventory: [],
      music: { ip: 12677, track: 33 },
      handoff: {
        scene: 's077',
        ip: 12803,
        position: [99, 23, 0],
        positionIp: 12823,
        inheritsMusic: true,
        members: ['li-xiaoyao'],
      },
    },
  },
  'stone-elder-auto': {
    id: 'stone-elder-auto',
    scene: 's106',
    owner: 'e1970',
    watched: [
      'e1971',
      'e1972',
      'e1973',
      'e1974',
      'e1975',
      'e1976',
      'e1977',
      'e1978',
      'e1979',
      'e1980',
      'e1981',
      'e1982',
      'e1983',
      'e1984',
      'e1985',
      'e1986',
      'e1987',
      'e1988',
      'e1989',
      'e2056',
      'e2057',
      'e2058',
      'e2059',
      'e2060',
      'e2061',
      'e2062',
      'e2063',
      'e2064',
      'e2065',
      'e2066',
      'e2067',
      'e2068',
      'e2069',
      'e2070',
    ],
    team: 37,
    enemy: 'enemy-496',
    start: [94, 39, 0],
    contact: [93, 39, 0],
    approach: 'ArrowLeft',
    music: 18,
    field: 23,
    slot: 0,
    seed: 4,
    disk: {
      entry: 16385,
      battle: 16683,
      field: 16682,
      music: 16681,
      last: 16776,
      loss: 0,
      owner: [864, 1040, 1, 5],
    },
    automatic: {
      partyIp: 16677,
      enableIp: 16680,
      turnStart: 41473,
      stop: 41494,
      members: [
        { role: 'anu', roleId: 4 },
        { role: 'gai-luojiao', roleId: 5 },
        { role: 'anu', roleId: 4 },
      ],
    },
    sceneRoute: {
      leave: 16385,
      visits: [
        {
          scene: 's110',
          owner: 'e2061',
          arrivalHook: 'default',
          start: 16790,
          leave: 16966,
          positionIp: 16386,
          position: [75, 14, 0],
        },
      ],
      return: { start: 16627, variant: 'legacy-001', select: 16964 },
    },
    mapMusic: { scene: 's106', ip: 16375, track: 12 },
    world: {
      outcome: 'terminated',
      inventory: [],
      music: { ip: 16685, track: 18 },
      handoff: {
        scene: 's110',
        ip: 16775,
        start: 16974,
        select: 16774,
        variant: 'legacy-001',
        position: [0, 0, 0],
        positionIp: 16976,
        fieldPosition: [67, 15, 0],
        finalPosition: [67, 16, 0],
        untilReady: true,
        members: ['li-xiaoyao', 'lin-yueru'],
      },
    },
  },
  'golden-toad': {
    id: 'golden-toad',
    scene: 's103',
    owner: 'e1908',
    watched: ['e1909', 'e1910'],
    team: 36,
    enemy: 'enemy-500',
    maxRounds: 14,
    start: [86, 28, 0],
    contact: [85, 28, 0],
    approach: 'ArrowLeft',
    music: 45,
    field: 36,
    slot: 0,
    seed: 4,
    settlementDwellMs: 180,
    disk: {
      firstVisit: 21418,
      entry: 21515,
      battle: 21549,
      field: 21561,
      music: 21562,
      last: 21551,
      owner: [848, 856, 1, 8],
      defeated: { enemy: 'enemy-465', ip: 42828, note: 13349, itemId: '152' },
    },
    mapMusic: { scene: 's103', ip: 21563, track: 36 },
    revisit: {
      scene: 's101',
      hook: 'legacy-001',
      hookIp: 21484,
      checkpoint: [130, 96, 0],
      arrival: [84, 28, 0],
      departure: [84, 30, 0],
      into: { owner: 'e1904', ip: 21398, runs: [['ArrowDown', 3]] },
      out: { owner: 'e1843', ip: 21394, runs: [['ArrowUp', 4]] },
      cave: [
        ['ArrowUp', 21],
        ['ArrowLeft', 7],
        ['ArrowUp', 9],
        ['ArrowRight', 5],
        ['ArrowUp', 9],
        ['ArrowLeft', 13],
        ['ArrowUp', 7],
        ['ArrowLeft', 20],
        ['ArrowUp', 13],
        ['ArrowRight', 2],
        ['ArrowUp', 9],
        ['ArrowLeft', 11],
      ],
    },
    world: {
      gameState: 0,
      triggerMode: 8,
      inventory: [{ itemId: '152', count: 1 }],
      exit: 'ArrowRight',
      music: { ip: 21550, track: 82 },
    },
  },
  'gai-luojiao': {
    ...gaiLuojiao,
    id: 'gai-luojiao',
    party: 'xiaoyao-protected',
    accessory: '262',
    firstTarget: 'enemy-490',
    maxRounds: 24,
    disk: {
      ...gaiLuojiao.disk,
      defeated: { enemy: 'enemy-490', ip: 42828, note: 13349, itemId: '152' },
    },
    world: { ...gaiLuojiao.world, inventory: [{ itemId: '152', count: 1 }] },
  },
  'gai-luojiao-defeat': {
    ...gaiLuojiao,
    id: 'gai-luojiao-defeat',
    world: { ...gaiLuojiao.world, inventory: [], outcome: 'lost' },
  },
  phoenix: {
    id: 'gold-winged-phoenix',
    scene: 's185',
    owner: 'e3115',
    watched: [
      'e3112',
      'e3113',
      'e3114',
      'e3116',
      'e3117',
      'e3118',
      'e3119',
      'e3120',
      'e3121',
      'e3157',
      'e3158',
      'e3159',
    ],
    team: 203,
    enemy: 'enemy-464',
    learned: { 'li-xiaoyao': ['299'] },
    recovery: { turn: 6, skill: '299' },
    start: [27, 7, 0],
    contact: [26, 7, 0],
    approach: 'ArrowLeft',
    party: 'xiaoyao-protected',
    music: 42,
    field: 17,
    slot: 0,
    seed: 4,
    maxRounds: 12,
    settlementDwellMs: 180,
    disk: {
      entry: 26192,
      battle: 26202,
      field: 26200,
      music: 26201,
      last: 26312,
      owner: [256, 240, 1, 7],
    },
    mapMusic: { scene: 's186', ip: 27680, track: 70 },
    world: {
      inventory: [{ itemId: '263', count: 1 }],
      handoff: {
        scene: 's188',
        ip: 26311,
        position: [107, 73, 0],
        positionIp: 26370,
        inheritsMusic: true,
        members: ['li-xiaoyao'],
      },
    },
  },
  qilin: {
    id: 'fire-qilin',
    scene: 's201',
    owner: 'e3353',
    watched: ['e3361', 'e3362'],
    interact: true,
    team: 224,
    enemy: 'enemy-463',
    start: [140, 43, 0],
    contact: [140, 42, 0],
    approach: 'ArrowUp',
    party: 'anu-led',
    music: 42,
    field: 35,
    slot: 0,
    seed: 4,
    maxRounds: 16,
    settlementDwellMs: 180,
    disk: {
      entry: 29953,
      battle: 29972,
      field: 29970,
      music: 29971,
      last: 30215,
      owner: [1584, 1448, 2, 2],
    },
    mapMusic: { scene: 's201', ip: 28864, track: 83 },
    prelude: { wave: 28863 },
    world: {
      inventory: [
        { itemId: '266', count: 1 },
        { itemId: '276', count: 1 },
      ],
      gameState: 0,
      triggerMode: 2,
      returned: [141, 41, 0],
      departure: [141, 42, 0],
      exit: 'ArrowDown',
    },
  },
  'wood-taoist': {
    id: 'wood-taoist',
    scene: 's181',
    owner: 'e2979',
    watched: [
      'e2978',
      'e2980',
      'e2981',
      'e2982',
      'e2993',
      'e2994',
      'e2995',
      'e2996',
      'e2997',
      'e2998',
      'e2999',
      'e3000',
      'e3001',
    ],
    team: 221,
    enemy: 'enemy-474',
    start: [130, 81, 0],
    contact: [129, 81, 0],
    approach: 'ArrowLeft',
    party: 'taoyuan',
    music: 38,
    field: 14,
    slot: 1,
    seed: 4,
    firstTarget: 'enemy-512',
    maxRounds: 13,
    learned: { 'li-xiaoyao': ['299'], anu: ['374'] },
    settlementDwellMs: 180,
    disk: {
      entry: 27203,
      battle: 27241,
      field: 27239,
      music: 27240,
      last: 27413,
      owner: [688, 1656, 1, 8],
    },
    mapMusic: { scene: 's175', ip: 26785, track: 56 },
    prelude: { completedAt: 27201 },
    world: {
      inventory: [{ itemId: '261', count: 1 }],
      handoff: {
        scene: 's183',
        ip: 27412,
        position: [113, 48, 0],
        positionIp: 27556,
        musicIp: 27553,
        members: ['li-xiaoyao'],
      },
    },
  },
  thief: {
    id: 'yangzhou-rooftop-thief',
    scene: 's086',
    owner: 'e1629',
    watched: ['e1630'],
    team: 29,
    enemy: 'enemy-478',
    start: [54, -23, 0],
    contact: [55, -23, 0],
    approach: 'ArrowRight',
    music: 48,
    field: 31,
    slot: 0,
    seed: 4,
    settlementDwellMs: 180,
    disk: {
      entry: 13834,
      battle: 13838,
      last: 13867,
      owner: [1296, 280, 0, 7],
      field: 13868,
      music: 13837,
    },
    mapMusic: { scene: 's097', trigger: 'e1785', ip: 13705, track: 36 },
    prelude: {
      night: 13679,
      visible: { e1629: 13627, e1630: 13628 },
    },
    world: {
      gameState: 0,
      triggerMode: 0,
      returned: [58, -12, 0],
      departure: [58, -13, 0],
      exit: 'ArrowUp',
      inventory: [],
      music: { ip: 13866, track: 54 },
    },
  },
  'yueru-outside': {
    id: 'lin-yueru-outside',
    scene: 's021',
    owner: 'e397',
    watched: ['e400', 'e401', 'e402', 'e403', 'e404'],
    team: 21,
    enemy: 'enemy-480',
    start: [89, 36, 0],
    contact: [90, 36, 0],
    approach: 'ArrowRight',
    party: 'city',
    music: 37,
    field: 7,
    slot: 0,
    seed: 4,
    settlementDwellMs: 180,
    disk: {
      entry: 5636,
      battle: 5721,
      last: 5808,
      owner: [912, 1032, 0, 7],
      music: 7003,
      loss: 6186,
    },
    mapMusic: { scene: 's021', ip: 6998, track: 71 },
    prelude: { trigger: 'e395', states: { e395: 5633, e397: 5634 } },
    world: {
      gameState: 0,
      triggerMode: 0,
      returned: [93, 35, 0],
      departure: [93, 34, 0],
      exit: 'ArrowUp',
      inventory: [],
    },
  },
  'yueru-ring': {
    id: 'lin-yueru-ring',
    scene: 's032',
    owner: 'e550',
    watched: ['e547', 'e548', 'e549', 'e551'],
    team: 24,
    enemy: 'enemy-483',
    start: [85, 12, 0],
    contact: [85, 11, 0],
    approach: 'ArrowUp',
    party: 'city',
    solo: true,
    music: 14,
    field: 52,
    slot: 0,
    seed: 4,
    settlementDwellMs: 180,
    disk: { entry: 7703, battle: 8023, last: 8118, owner: [1200, 760, 2, 5] },
    mapMusic: { scene: 's032', ip: 9039, track: 14, cdFallback: true },
    world: { inventory: [], handoff: { scene: 's034', ip: 8117, position: [116, 39, 0] } },
  },
  'ghost-general': {
    id: 'general-tomb-ghost-general',
    scene: 's065',
    owner: 'e1302',
    team: 26,
    enemy: 'enemy-472',
    start: [35, 4, 0],
    contact: [35, 3, 0],
    party: 'tomb',
    music: 45,
    field: 21,
    slot: 0,
    seed: 4,
    settlementDwellMs: 180,
    disk: { entry: 12143, battle: 12162, last: 12165, owner: [544, 256, 1, 8] },
    mapMusic: { scene: 's060', ip: 12501, track: 78 },
    world: {
      inventory: [],
      handoff: {
        scene: 's066',
        ip: 12164,
        position: [33, 3, 0],
        musicIp: 12172,
        members: ['li-xiaoyao'],
      },
    },
  },
  'red-ghost': {
    id: 'blood-pool-red-ghost',
    scene: 's059',
    owner: 'e1048',
    watched: ['e1049'],
    team: 27,
    enemy: 'enemy-473',
    start: [35, -18, 0],
    contact: [34, -18, 0],
    approach: 'ArrowLeft',
    party: 'tomb',
    music: 44,
    field: 22,
    slot: 1,
    seed: 4,
    settlementDwellMs: 180,
    disk: { entry: 12356, battle: 12407, last: 12462, owner: [752, 104, 1, 8], reward: 12408 },
    mapMusic: { scene: 's059', ip: 12182, track: 83 },
    prelude: { states: { e983: 12239, e984: 12240 }, completedAt: 12241, wave: 12184 },
    world: {
      gameState: 0,
      triggerMode: 0,
      exit: 'ArrowRight',
      inventory: [{ itemId: '267', count: 1 }],
      music: { ip: 12413, track: 30 },
    },
  },
}

export const projectFile = (path) => new URL(`../../../${path}`, import.meta.url)
export const json = async (path) => JSON.parse(await readFile(projectFile(path), 'utf8'))
export const gameScene = ({ scene }) => Number(scene.slice(1)) + 1
export const grid = ([col, row, height]) => ({ col, row, height })

export function entranceSteps({ entrance }) {
  if (!entrance) return []
  const directions = {
    '-1,0': 'ArrowLeft',
    '1,0': 'ArrowRight',
    '0,-1': 'ArrowUp',
    '0,1': 'ArrowDown',
  }
  return entrance.walk.map((to, i) => {
    const from = i === 0 ? entrance.landing : entrance.walk[i - 1]
    const key = directions[[to[0] - from[0], to[1] - from[1]].join()]
    assert(key && to[2] === from[2], `non-cardinal entrance step ${from} → ${to}`)
    return { key, from, to }
  })
}

export async function readSources(spec) {
  const sceneNumber = gameScene(spec) - 1
  const mapMusic = spec.mapMusic ?? { scene: 's044', ip: 9673, track: fieldMusic }
  const files = {
    gameScene: `data/extracted/data/scene/${sceneNumber}.json`,
    commands: 'data/extracted/events/all.json',
    musicScene: `data/extracted/data/scene/${Number(mapMusic.scene.slice(1))}.json`,
    canonicalMusicScene: `projects/pal/content/scenes/${mapMusic.scene}.json`,
    ...(spec.mapMusic ? {} : { canonicalMaze: 'projects/pal/content/scenes/s046.json' }),
    actors: 'data/extracted/data/player-roles.json',
    ...(spec.learned ? { skills: 'projects/pal/content/skills.json' } : {}),
    enemies: 'data/extracted/data/enemies.json',
    objects: 'data/extracted/data/enemy-objects.json',
    teams: 'data/extracted/data/enemy-teams.json',
    rfScene: `projects/pal/content/scenes/${spec.scene}.json`,
    rfTeams: 'projects/pal/content/enemy-teams.json',
    ...Object.fromEntries(
      (spec.sceneRoute?.visits ?? []).flatMap(({ scene, owner }) => [
        [scene, `projects/pal/content/scenes/${scene}.json`],
        ...(owner
          ? [[`disk-${scene}`, `data/extracted/data/scene/${Number(scene.slice(1))}.json`]]
          : []),
      ]),
    ),
    ...(spec.sceneRoute?.visits.some(({ arrivalHook }) => arrivalHook)
      ? { sharedScripts: 'projects/pal/content/shared-scripts.json' }
      : {}),
    ...(spec.disk.termination !== undefined || spec.sceneRoute
      ? { rfEnemies: 'projects/pal/content/enemies.json' }
      : {}),
    ...(spec.predecessor
      ? { predecessor: `projects/pal/content/scenes/${spec.predecessor.scene}.json` }
      : {}),
    ...(spec.revisit
      ? {
          revisitScene: `projects/pal/content/scenes/${spec.revisit.scene}.json`,
          diskRevisitScene: `data/extracted/data/scene/${Number(spec.revisit.scene.slice(1))}.json`,
        }
      : {}),
    ...(observesForeground(spec) ? { sprites: 'projects/pal/content/sprites.json' } : {}),
    ...(spec.world.handoff
      ? {
          handoffScene: `projects/pal/content/scenes/${spec.world.handoff.scene}.json`,
          diskHandoffScene: `data/extracted/data/scene/${Number(spec.world.handoff.scene.slice(1))}.json`,
        }
      : {}),
    locale: 'projects/pal/content/locale.json',
  }
  const data = Object.fromEntries(
    await Promise.all(Object.entries(files).map(async ([kind, path]) => [kind, await json(path)])),
  )
  const actor = data.gameScene.eventObjects.find(({ id }) => `e${id}` === spec.owner)
  assert.deepEqual([actor.x, actor.y, actor.sState, actor.triggerMode], spec.disk.owner)
  if (!spec.predecessor)
    assert.equal(actor.triggerLabel, `L_${spec.disk.firstVisit ?? spec.disk.entry}`)
  const commands = data.commands.segments.flatMap(({ commands }) => commands)
  const fieldTrack = musicId(mapMusic.track)
  const musicOwner = mapMusic.trigger
    ? data.musicScene.eventObjects.find(({ id }) => `e${id}` === mapMusic.trigger)
    : null
  const initialScript = Number((musicOwner?.triggerLabel ?? data.musicScene.onEnterLabel).slice(2))
  const musicFlow = musicOwner
    ? data.canonicalMusicScene.entities.find(({ id }) => id === mapMusic.trigger).behaviors.trigger
        .default.flow
    : data.canonicalMusicScene.hooks.onEnter.variants.default.flow
  const musicBody = musicFlow.stages.flatMap(({ body }) => body)
  assert(mapMusic.ip >= initialScript)
  assert(!commands.slice(initialScript, mapMusic.ip).some(({ op }) => op === 'end'))
  assert.deepEqual(
    [commands[mapMusic.ip].opcode, commands[mapMusic.ip].operands[mapMusic.cdFallback ? 1 : 0]],
    [mapMusic.cdFallback ? 0xa3 : 67, mapMusic.track],
  )
  assert(
    musicBody.some(
      ({ kind, asset }) => kind === 'playMusic' && asset === nativeMusic(mapMusic.track),
    ),
  )
  const preludeStates = {}
  let preludeWave
  let preludePartyLayer
  if (spec.prelude) {
    const { night, visible, states, trigger, completedAt, wave } = spec.prelude
    if (night !== undefined) {
      assert.equal(commands[night].opcode, 0x50)
      assert(musicBody.some(({ kind, ambience }) => kind === 'setAmbience' && ambience === 'night'))
    }
    const actions = trigger
      ? data.rfScene.entities
          .find(({ id }) => id === trigger)
          .behaviors.trigger.default.flow.stages.flatMap(({ body }) => body)
      : musicBody
    for (const [entity, address] of Object.entries(states ?? visible ?? {})) {
      const command = commands[address]
      const entityId = Number(entity.slice(1))
      assert.equal(command.opcode, 0x49)
      assert.equal(command.operands[0], entity === trigger ? 0xffff : entityId + 1)
      const state = command.operands[1]
      assert(
        actions.some(
          (action) =>
            action.kind === 'setEntityState' &&
            action.target.scene === spec.scene &&
            action.target.entity === entity &&
            action.state === state,
        ),
      )
      preludeStates[entity] = state
    }
    if (completedAt !== undefined) {
      assert.deepEqual(commands[completedAt], { op: 'end', advance: true })
      assert.equal(
        data.rfScene.hooks.onEnter.variants.default.flow.stages.at(-1).next.kind,
        'complete',
      )
      const enter = Number(data.gameScene.onEnterLabel.slice(2))
      const placement = commands.slice(enter, completedAt).findLast(({ opcode }) => opcode === 0x6e)
      if (placement) {
        preludePartyLayer = placement.operands[2]
        assert(
          musicBody.some(({ kind, layer }) => kind === 'nudgeParty' && layer === preludePartyLayer),
        )
      }
    }
    if (wave !== undefined) {
      const [level, progression] = commands[wave].operands
      assert.equal(commands[wave].opcode, 0x71)
      assert(
        musicBody.some(
          (command) =>
            command.kind === 'setScreenWave' &&
            command.level === level &&
            command.progression === progression,
        ),
      )
      preludeWave = { level, progression }
    }
  }
  if (spec.party === 'tomb') {
    assert.deepEqual([commands[11986].opcode, commands[11986].operands[0]], [0x86, 274])
    const itemsPath = 'projects/pal/content/items.json'
    const jade = (await json(itemsPath)).find(({ id }) => id === '274')
    assert.deepEqual([jade.equip.slot, jade.equip.equipableBy], ['accessory', ['zhao-linger']])
  }
  if (spec.accessory) {
    const item = (await json('projects/pal/content/items.json')).find(
      ({ id }) => id === spec.accessory,
    )
    assert(item.equip.equipableBy.includes(partyFor(spec)[0].role))
    assert.deepEqual(
      [item.equip.slot, item.equip.effects],
      ['accessory', [{ kind: 'resistance', element: 'poison', percent: 100 }]],
    )
  }
  const { battle, entry, last, reward, defeated, victory, flee } = spec.disk
  const setMusic = commands[spec.disk.music ?? battle - 2]
  const setField = commands[spec.disk.field ?? battle - 1]
  assert.deepEqual([setMusic.opcode, setMusic.operands[0]], [69, spec.music])
  assert.deepEqual([setField.opcode, setField.operands[0]], [74, spec.field])
  assert.deepEqual([commands[battle].opcode, commands[battle].operands], [7, battleOperands(spec)])
  assert.equal(commands[last].op, 'end')
  if (reward)
    assert.deepEqual(
      [commands[reward].op, String(commands[reward].itemId)],
      ['giveItem', spec.world.inventory[0].itemId],
    )
  const team = data.teams.find(({ id }) => id === spec.team)
  const slots = team.enemyObjectIndexes.map((id) => (id > 0 && id < 65535 ? `enemy-${id}` : null))
  assert.equal(slots[spec.slot], spec.enemy)
  const rfTeam = data.rfTeams.find(({ id }) => id === `team-${spec.team}`)
  assert.deepEqual(
    Array.from({ length: 5 }, (_, i) => rfTeam.slots[i] ?? null),
    slots,
  )
  const boss = data.rfScene.entities.find(({ id }) => id === spec.owner)
  const setup = spec.predecessor ? readInnPredecessor(data.predecessor, commands, spec) : undefined
  const inn = spec.entrance ? readInnFrames(data, commands, setup, spec) : undefined
  const toad = spec.revisit ? readGoldenToadSources(data, commands, spec) : undefined
  const trigger =
    boss.behaviors.trigger[toad?.behavior ?? setup?.[spec.owner].triggerVariant ?? 'default'].flow
      .stages[0].body
  const route = spec.sceneRoute && readSceneRoute(data, commands, spec, trigger)
  const native = route?.battleBody ?? trigger
  const launch = native.find(({ kind }) => kind === 'startBattle')
  assert.deepEqual(
    [
      launch.boss ?? false,
      launch.fieldId ?? data.rfScene.battleFieldId,
      launch.music ?? data.rfScene.battleMusic,
      launch.enemyTeamId,
    ],
    [isBossBattle(spec), spec.field, nativeMusic(spec.music), `team-${spec.team}`],
  )
  assert.equal(launch.auto ?? false, Boolean(spec.automatic))
  let tower
  const towerAssets = []
  if (victory !== undefined) {
    assert.deepEqual([commands[22377].opcode, commands[22377].operands], [0x75, [1, 3, 0]])
    assert.deepEqual([commands[battle + 1].op, commands[battle + 1].to], ['goto', `L_${victory}`])
    assert.deepEqual(
      commands.slice(victory, last).map(({ opcode, operands }) => [opcode, operands]),
      [
        [0x52, [0, 0, 0]],
        [0x50, [0, 0, 0]],
      ],
    )
    assert.deepEqual([commands[flee].opcode, commands[flee].operands], [0x4b, [0, 0, 0]])
    assert.equal(commands[flee + 1].op, 'end')
    const owned = { scene: spec.scene, entity: spec.owner }
    assert.deepEqual(launch.onFlee, [
      { kind: 'suspendEntity', target: owned, ticks: 15 },
      { kind: 'finishStep', next: { kind: 'stay' } },
    ])
    assert.deepEqual(native.slice(native.indexOf(launch) + 1), [
      { kind: 'hideEntity', target: owned, ticks: 800 },
      { kind: 'fade', dir: 'out', ms: 600 },
      { kind: 'fade', dir: 'in', ms: 600 },
    ])
    const ambient = Number(actor.autoLabel.slice(2))
    assert.deepEqual([commands[ambient].opcode, commands[ambient + 1].to], [0x87, actor.autoLabel])
    const asset = actor.spriteNum
    towerAssets.push(
      `data/extracted/data/sprite/${asset}.rle`,
      `projects/pal/assets/migrated/sprites/${musicId(asset)}.rle`,
    )
    const [original, authored] = await Promise.all(
      towerAssets.map((path) => readFile(projectFile(path))),
    )
    assert.deepEqual(original, authored)
    const chunk = gunzipSync(original)
    const offsets = chunk.readUInt16LE(0)
    assert.equal(
      chunk.readUInt16LE((offsets - 1) * 2),
      0,
      'original sprite has a terminal empty slot',
    )
    tower = { asset, position: [actor.x, actor.y], frameCount: offsets - 1 }
  }
  if (spec.solo) {
    assert(
      commands
        .slice(entry, battle)
        .some(({ opcode, operands }) => opcode === 0x75 && operands.join() === '1,0,0'),
    )
    assert.deepEqual(
      native
        .slice(0, native.indexOf(launch))
        .filter(({ kind }) => kind === 'setParty')
        .at(-1)?.members,
      battlePartyFor(spec).map(({ role }) => role),
    )
  }
  if (spec.disk.loss) {
    assert.equal(commands[spec.disk.loss + 3].to, 'L_41075')
    assert.equal(
      launch.onLose[0].cue.rows[0].text,
      `dlg.${commands[spec.disk.loss + 2].messageIndex}`,
    )
  }
  let successorTrack
  if (spec.world.handoff) {
    const {
      scene,
      ip,
      position,
      positionIp,
      musicIp,
      inheritsMusic,
      start,
      select,
      variant = 'default',
    } = spec.world.handoff
    assert.equal(commands[ip].sceneId, gameScene({ scene }))
    assert.equal(native.at(-1).scene, scene)
    if (start !== undefined) {
      assert.deepEqual(
        [commands[select].opcode, commands[select].operands],
        [0x6d, [gameScene({ scene }), start, 0]],
      )
      const selected = native.findLast(({ kind }) => kind === 'selectSceneHooks')
      assert.deepEqual(
        [selected.scene, selected.selection.onEnter],
        [scene, { kind: 'use', value: variant }],
      )
    }
    const first = start ?? Number(data.diskHandoffScene.onEnterLabel.slice(2))
    const [x, y, half] = commands[positionIp ?? first].operands
    assert.deepEqual(position, [x + y + half, y - x, 0])
    const [landing] = data.handoffScene.hooks.onEnter.variants[variant].flow.stages
    const actions = [...(landing.entry?.prepare ?? []), ...landing.body]
    assert.deepEqual(actions.find(({ kind }) => kind === 'teleportParty')?.pos, grid(position))
    if (inheritsMusic || route) {
      successorTrack = returnTrack(spec)
    } else {
      const musicAddress = musicIp ?? first + 2
      successorTrack = commands[musicAddress].operands[0]
      assert.equal(commands[musicAddress].opcode, 0x43)
      if (musicIp === undefined) assert.equal(commands[musicAddress + 1].opcode, 0x05)
      assert(
        (musicIp === undefined ? landing.entry.prepare : actions).some(
          ({ kind, asset }) => kind === 'playMusic' && asset === nativeMusic(successorTrack),
        ),
        'successor music must be prepared before revealing the map',
      )
    }
  }
  if (spec.world.music) {
    const { ip, track } = spec.world.music
    assert.deepEqual([commands[ip].opcode, commands[ip].operands[0]], [0x43, track])
    assert(native.some(({ kind, asset }) => kind === 'playMusic' && asset === nativeMusic(track)))
  }
  const original = data.enemies.find(({ id }) => id === team.enemies[spec.slot])
  const nativeEnemies = team.enemies
    .filter((_, i) => slots[i] !== null)
    .map((id) => data.enemies.find((enemy) => enemy.id === id))
  const object = data.objects.find(({ objectIndex }) => `enemy-${objectIndex}` === spec.enemy)
  assert.equal(object.enemyId, original.id)
  const gai = spec.world.join && readGaiLuojiaoSources(data, commands, spec, object)
  if (spec.id === 'tower-ming') route.ming = readTowerMingSources(commands, object)
  const automatic = spec.automatic && {
    ...readAutomaticBattle(commands, object, spec),
    presentation: readStoneElderAutoPresentation(data, commands, spec),
  }
  const tian =
    spec.disk.termination === undefined
      ? undefined
      : tianSource(data, commands, spec, native, object)
  const scriptedStop =
    spec.disk.scriptedStop !== undefined
      ? readTurnStartStop(commands, object.scriptOnTurnStart, spec.disk.scriptedStop)
      : undefined
  const poisonLady =
    spec.id === 'poison-lady'
      ? readPoisonLadySources(commands, data.gameScene, data.diskHandoffScene)
      : undefined
  const stoneElder =
    spec.id === 'stone-elder-guiyin'
      ? readStoneElderSources(
          commands,
          data.gameScene,
          data.diskHandoffScene,
          object.scriptOnTurnStart,
        )
      : undefined
  const wood =
    spec.id === 'wood-taoist' ? readWoodTaoistSources(data, commands, spec, object) : undefined
  const phoenix =
    spec.id === 'gold-winged-phoenix' ? readPhoenixSources(data, commands, spec) : undefined
  const qilin =
    spec.id === 'fire-qilin'
      ? readFireQilinSources(data, commands, spec, partyFor(spec))
      : undefined
  const hook = spec.predecessor ? readInnBattleDialogue(commands, object, data.actors) : null
  const turnStart =
    hook ??
    (spec.party === 'city'
      ? commands.slice(
          object.scriptOnTurnStart,
          commands.findIndex(({ op }, ip) => ip >= object.scriptOnTurnStart && op === 'end'),
        )
      : [])
  if (defeated) {
    const id = defeated.enemy ?? spec.enemy
    assert(slots.includes(id))
    const dropper = data.objects.find(({ objectIndex }) => `enemy-${objectIndex}` === id)
    assert.equal(dropper.scriptOnBattleEnd, defeated.ip)
    assert.deepEqual(
      [commands[defeated.ip].op, String(commands[defeated.ip].itemId)],
      ['giveItem', defeated.itemId],
    )
    assert.equal(commands[defeated.ip + 2].messageIndex, defeated.note)
  }
  const summonScript = spec.team === 27 ? commands[42512] : null
  if (summonScript) assert.equal(summonScript.opcode, 0x9e)
  const summonObject = summonScript?.operands[0] ?? 403
  const summonedObject = data.objects.find(({ objectIndex }) => objectIndex === summonObject)
  const summoned = data.enemies.find(({ id }) => id === summonedObject.enemyId)
  const summonCount = summonScript?.operands[1] ?? (spec.team === 44 ? 4 : 0)
  const summonBonus = wood?.summonBonus ?? {
    exp: summonCount * summoned.exp,
    cash: summonCount * summoned.cash,
  }
  const battleTrack = musicId(spec.music)
  const outsideActors = ['e401', 'e402', 'e403']
    .map((id) => {
      if (spec.id !== 'lin-yueru-outside') return null
      const actor = data.gameScene.eventObjects.find((entry) => `e${entry.id}` === id)
      return {
        id,
        asset: actor.spriteNum,
        position: [actor.x, actor.y],
        frame: actor.nSpriteFrames * actor.direction + actor.currentFrameNum,
        facing: ['down', 'left', 'up', 'right'][actor.direction],
        stationary: id === 'e403',
      }
    })
    .filter(Boolean)
  const returnMusicPaths = spec.world.music
    ? [
        `data/extracted/music/${musicId(spec.world.music.track)}.mid`,
        `projects/pal/assets/migrated/music/${musicId(spec.world.music.track)}.mid`,
      ]
    : []
  const ring =
    spec.id === 'lin-yueru-ring'
      ? ringSource(commands, turnStart, data.gameScene.eventObjects, successorTrack)
      : undefined
  const ringAudioPaths = ring
    ? ['data/extracted', 'projects/pal/assets/migrated'].flatMap((root) => [
        `${root}/music/${musicId(ring.restartTrack)}.mid`,
        `${root}/music/${musicId(ring.successorTrack)}.mid`,
        `${root}/sounds/${ring.cue}.wav`,
      ])
    : []
  return {
    paths: [
      ...Object.values(files),
      'data/extracted/data/event-objects.json',
      'data/extracted/data/battle-fields.json',
      `data/extracted/data/tilemap/${data.gameScene.mapNum}.json`,
      `data/extracted/music/${battleTrack}.mid`,
      `data/extracted/music/${fieldTrack}.mid`,
      'projects/pal/content/actors.json',
      'projects/pal/content/enemies.json',
      'projects/pal/content/battle-fields.json',
      ...(spec.party === 'tomb' || spec.accessory ? ['projects/pal/content/items.json'] : []),
      `projects/pal/content/maps/${data.rfScene.mapId}.json`,
      `projects/pal/assets/migrated/music/${battleTrack}.mid`,
      `projects/pal/assets/migrated/music/${fieldTrack}.mid`,
      ...returnMusicPaths,
      ...ringAudioPaths,
      ...(ring ? ['scripts/e2e/boss-entrances/ring-opening-presentation.mjs'] : []),
      ...towerAssets,
      ...(stoneElder
        ? [
            'scripts/e2e/boss-entrances/stone-elder-presentation.mjs',
            'scripts/e2e/rendered-dialogue-comparison.mjs',
          ]
        : []),
      ...(toad
        ? [
            'scripts/e2e/boss-entrances/golden-toad-presentation.mjs',
            'scripts/e2e/rendered-dialogue-comparison.mjs',
            `data/extracted/data/tilemap/${data.diskRevisitScene.mapNum}.json`,
            `projects/pal/content/maps/${data.revisitScene.mapId}.json`,
          ]
        : []),
      ...(wood
        ? [
            'scripts/e2e/boss-entrances/wood-taoist-presentation.mjs',
            'scripts/e2e/rendered-dialogue-comparison.mjs',
            'data/extracted/data/scene/190.json',
            'projects/pal/content/scenes/s190.json',
            `data/extracted/data/tilemap/${data.diskHandoffScene.mapNum}.json`,
            `projects/pal/content/maps/${data.handoffScene.mapId}.json`,
          ]
        : []),
      ...(phoenix
        ? [
            'scripts/e2e/boss-entrances/phoenix-presentation.mjs',
            'scripts/e2e/rendered-dialogue-comparison.mjs',
            'data/extracted/data/scene/192.json',
            'projects/pal/content/scenes/s192.json',
            `data/extracted/data/tilemap/${data.diskHandoffScene.mapNum}.json`,
            `projects/pal/content/maps/${data.handoffScene.mapId}.json`,
          ]
        : []),
      ...(qilin
        ? [
            'scripts/e2e/boss-entrances/fire-qilin-presentation.mjs',
            'scripts/e2e/rendered-dialogue-comparison.mjs',
            'data/extracted/data/scene/205.json',
            'data/extracted/data/scene/206.json',
            'data/extracted/data/scene/212.json',
            'projects/pal/content/scenes/s205.json',
            'projects/pal/content/scenes/s206.json',
            'projects/pal/content/scenes/s212.json',
          ]
        : []),
      ...(gai
        ? [
            'scripts/e2e/boss-entrances/gai-luojiao-presentation.mjs',
            'scripts/e2e/rendered-dialogue-comparison.mjs',
          ]
        : []),
    ],
    preludeStates,
    preludeWave,
    preludePartyLayer,
    outsideActors,
    preludeBefore: Object.fromEntries(
      data.gameScene.eventObjects
        .filter(({ id }) => Object.hasOwn(preludeStates, `e${id}`))
        .map(({ id, sState }) => [`e${id}`, sState]),
    ),
    spriteChunks: new Map(
      data.sprites?.map(({ id, asset }) => [id, Number(asset.split('.').at(-1))]),
    ),
    hiddenLevels: Object.fromEntries(data.actors.roles.map(({ id, level }) => [id, level])),
    slots,
    original,
    nativeEnemies,
    setup,
    inn,
    successorTrack,
    turnStart,
    ring,
    tower,
    tian,
    scriptedStop,
    automatic,
    poisonLady,
    stoneElder,
    toad,
    gai,
    wood,
    phoenix,
    qilin,
    route,
    summonBonus,
    summoning: summonScript && {
      id: `enemy-${summonObject}`,
      count: summonCount,
      hp: summoned.health,
    },
    tomb:
      spec.id === 'general-tomb-ghost-general' || spec.id === 'blood-pool-red-ghost'
        ? tombSource(data, commands, spec, actor)
        : undefined,
    pre: commands.slice(route ? spec.sceneRoute.return.start : entry, battle),
    post: commands.slice(
      victory ?? battle + 1,
      spec.world.scriptedReturn ? spec.world.scriptedReturn.wait + 1 : last,
    ),
    defeatedNote: defeated ? commands[defeated.ip + 2].text : null,
    canonical: native,
    locale: data.locale,
  }
}

function readSceneRoute(data, commands, spec, trigger) {
  const { sceneRoute, scene, disk } = spec
  const { visits, leave, return: entry } = sceneRoute
  const segments = [
    { scene, start: disk.entry, leave, body: trigger },
    ...visits.map((visit) => {
      const loaded = data[visit.scene]
      const behavior = visit.owner
        ? loaded.entities.find(({ id }) => id === visit.owner).behaviors.trigger.default
        : loaded.hooks.onEnter.variants.default
      if (visit.owner) {
        const original = data[`disk-${visit.scene}`].eventObjects.find(
          ({ id }) => `e${id}` === visit.owner,
        )
        assert.equal(original.triggerLabel, `L_${visit.start}`)
        const command = commands[visit.positionIp]
        const [col, row, half] = command.operands
        assert.equal(command.opcode, 0x46)
        assert.deepEqual(visit.position, [col + row + half, row - col, 0])
        const entryId = trigger.find(
          ({ kind, scene }) => kind === 'loadScene' && scene === visit.scene,
        )?.entryId
        assert.deepEqual(loaded.entries[entryId]?.pos, grid(visit.position))
      }
      const stages = behavior.flow.stages
      const stage = stages.find(({ id }) => id === (visit.stage ?? 'initial'))
      if (!visit.arrivalHook) return { ...visit, body: stage.body }
      assert.equal(loaded.hooks.onEnter.initial, visit.arrivalHook)
      const arrival = loaded.hooks.onEnter.variants[visit.arrivalHook].flow
      const arrivalStage = arrival.stages.find(({ id }) => id === arrival.initial)
      assert.deepEqual(arrivalStage.next, { kind: 'complete' })
      assert.deepEqual(
        arrivalStage.body,
        stage.body,
        'entry and touch use the same foreground body',
      )
      const [shared] = stage.body
      assert.equal(shared.kind, 'callScript')
      return { ...visit, body: data.sharedScripts[shared.script].body }
    }),
  ]
  for (const [index, segment] of segments.entries()) {
    const destination = segments[index + 1]?.scene ?? scene
    assert.deepEqual(
      [commands[segment.leave].op, commands[segment.leave].sceneId],
      ['loadScene', gameScene({ scene: destination })],
    )
    assert(segment.body.some(({ kind, scene }) => kind === 'loadScene' && scene === destination))
  }
  if (visits.length > 1) {
    assert(commands[visits[0].leave + 1].advance)
    assert.equal(visits.at(-1).start, visits[0].leave + 2)
  }
  assert.deepEqual(
    [commands[entry.select].opcode, commands[entry.select].operands],
    [0x6d, [gameScene(spec), entry.start, 0]],
  )
  const selection = segments.at(-1).body.find(({ kind }) => kind === 'selectSceneHooks')
  assert.deepEqual(
    [selection.scene, selection.selection.onEnter],
    [scene, { kind: 'use', value: entry.variant }],
  )
  const battleBody = data.rfScene.hooks.onEnter.variants[entry.variant].flow.stages[0].body
  const members = battlePartyFor(spec)
  const partyCommand = commands[spec.automatic?.partyIp ?? disk.battle - 4]
  assert.deepEqual(
    [partyCommand.opcode, partyCommand.operands],
    [0x75, members.map(({ roleId }) => roleId + 1)],
  )
  const beforeBattle = battleBody.slice(
    0,
    battleBody.findIndex(({ kind }) => kind === 'startBattle'),
  )
  assert.deepEqual(
    beforeBattle.findLast(({ kind }) => kind === 'setParty')?.members,
    members.map(({ role }) => role),
  )
  return { segments, battleBody }
}

function readAutomaticBattle(commands, object, spec) {
  const { enableIp, turnStart, stop, members } = spec.automatic
  assert.equal(commands[enableIp].opcode, 0x8a)
  const branch = commands[object.scriptOnTurnStart]
  assert.deepEqual([branch.opcode, branch.operands[1]], [0x79, turnStart])
  assert(members.some(({ role }) => role === 'gai-luojiao'))
  return readTurnStartStop(commands, turnStart, stop)
}

function readTurnStartStop(commands, startAddress, stopAddress) {
  const terminal = commands[stopAddress]
  assert.deepEqual([terminal.opcode, terminal.operands], [0x89, [0, 0, 0]])
  const hook = commands.slice(startAddress, stopAddress + 1)
  const spells = []
  let spell = null
  for (const command of hook) {
    if (command.opcode === 0x67) {
      const [id] = command.operands
      spell = id > 0 && id < 65535 ? String(id) : null
    }
    if (command.advance) spells.push(spell)
  }
  assert(spells.length > 0, 'the scripted stop follows at least one complete turn')
  return { turns: spells.length, spells }
}

function tianSource({ gameScene, rfScene }, commands, spec, body, object) {
  const target = gameScene.eventObjects.find(({ id }) => id === 2432)
  const jar = gameScene.eventObjects.find(({ id }) => id === 2433)
  const gate = gameScene.eventObjects.find(({ id }) => id === 2429)
  assert.deepEqual([commands[22377].opcode, commands[22377].operands], [0x75, [1, 3, 0]])
  assert.deepEqual(
    [jar.spriteNum, jar.nSpriteFrames, target.spriteNum, target.sState],
    [506, 0, 12, 0],
  )
  assert.deepEqual(commands[spec.disk.confirm].operands, [23511, 0, 0])
  assert.equal(commands[spec.disk.confirm].opcode, 0x0a)
  assert.equal(commands[23511].op, 'end')
  assert(
    body.find(({ kind }) => kind === 'confirm')?.onNo.some(({ kind }) => kind === 'finishStep'),
  )
  const [x, y, half] = commands[23522].operands
  assert.deepEqual(spec.world.returned, [x + y + half, y - x, 0])
  assert.equal(commands[23522].opcode, 0x46)
  assert.deepEqual([commands[23523].opcode, commands[23523].operands], [0x15, [1, 0, 0]])
  assert.deepEqual(
    body.find(({ kind }) => kind === 'teleportParty')?.pos,
    grid(spec.world.returned),
  )
  assert.deepEqual([commands[23540].opcode, commands[23540].operands], [0x22, [1, 5, 0]])
  assert.equal(body.find(({ kind }) => kind === 'revivePartyAll')?.tenths, 5)
  assert.deepEqual([commands[23616].opcode, commands[23616].operands], [0x49, [2433, 0, 0]])
  assert.deepEqual([commands[23617].opcode, commands[23617].operands], [0x25, [2430, 23297, 0]])
  assert.equal(gate.triggerLabel, 'L_23294')
  const selected = body.find(({ kind }) => kind === 'selectEntityBehavior')
  assert.equal(selected.target.entity, 'e2429')
  const relocation = rfScene.entities.find(({ id }) => id === 'e2429')
  assert(relocation.behaviors.trigger[selected.selection.value])
  const { turns, spells } = readTurnStartStop(
    commands,
    object.scriptOnTurnStart,
    spec.disk.termination,
  )
  assert.equal(turns, 9)
  const resumed = commands[spec.disk.last].resetTo
  assert.equal(commands[resumed]?.op, 'setDialogStyleCenter')
  return {
    turns,
    spells,
    revive: { ip: 23540, tenths: commands[23540].operands[1] },
    resume: { ip: resumed, stage: 'legacy-002' },
    hookIntro: commands.slice(object.scriptOnTurnStart, 42215),
    hookEnd: commands.slice(42232, spec.disk.termination),
    target: { asset: target.spriteNum, position: [target.x, target.y] },
    jar: { asset: jar.spriteNum, position: [jar.x, jar.y] },
    gateId: selected.target.entity,
    gateVariant: selected.selection.value,
  }
}

function tombSource(data, commands, spec, owner) {
  const beforeBattle = commands.slice(spec.disk.entry, spec.disk.battle)
  const isGeneral = spec.world.handoff !== undefined
  const reveal = beforeBattle.find(({ opcode, operands }) => opcode === 0x49 && operands[1] === 1)
  const actor = isGeneral
    ? owner
    : data.gameScene.eventObjects.find(({ id }) => id + 1 === reveal.operands[0])
  const autoStart = isGeneral ? null : Number(actor.autoLabel.slice(2))
  const flow = isGeneral
    ? beforeBattle
    : commands.slice(
        autoStart,
        commands.findIndex(({ op }, i) => i >= autoStart && op === 'end'),
      )
  const poses = [
    0,
    ...flow.filter(({ opcode }) => opcode === 0x14).map(({ operands }) => operands[0]),
  ]
  const steps = flow.filter(({ opcode }) => opcode === 0x09).slice(0, poses.length - 1)
  assert.equal(steps.length, poses.length - 1)
  const beforeTalkMs = isGeneral
    ? flow.filter(({ opcode }) => opcode === 0x09).at(-1).operands[0] * 100
    : beforeBattle.find(({ opcode }) => opcode === 0x09).operands[0] * 100
  let arrival
  const arrivalActors = {}
  if (isGeneral) {
    const address = Number(data.diskHandoffScene.onEnterLabel.slice(2))
    const [sprite, party, facing] = commands.slice(address + 1, address + 4)
    assert.deepEqual([sprite.opcode, party.opcode, facing.opcode], [0x65, 0x75, 0x15])
    assert.deepEqual(party.operands, [1, 0, 0])
    arrival = { sprite: sprite.operands[1], frame: facing.operands[0] * 3 + facing.operands[1] }
    const facings = ['down', 'left', 'up', 'right']
    for (const actor of data.diskHandoffScene.eventObjects) {
      const { id, spriteNum, x, y, direction, nSpriteFrames, currentFrameNum } = actor
      assert.equal(actor.sState, 1)
      assert.equal(nSpriteFrames, 1)
      // The first visible arrival precedes the first world update of the stand-ins.
      let ticks = 1
      const turns = []
      for (let ip = Number(actor.autoLabel.slice(2)); commands[ip].op !== 'end'; ip++) {
        const { opcode, operands } = commands[ip]
        if (opcode === 0x09) ticks += operands[0] || 1
        else {
          assert.equal(opcode, 0x0f)
          assert.equal(operands[1], 0)
          turns.push({ ms: ticks * 100, frame: operands[0], facing: facings[operands[0]] })
          ticks++
        }
      }
      arrivalActors[`e${id}`] = {
        asset: spriteNum,
        position: [x, y],
        frame: direction * nSpriteFrames + currentFrameNum,
        facing: facings[direction],
        turns,
      }
    }
  }
  const afterBattle = commands.slice(spec.disk.battle + 1, spec.disk.last + 1)
  const quakeAt = afterBattle.findIndex(({ opcode }) => opcode === 0x35)
  let quake
  if (!isGeneral) {
    assert(quakeAt >= 0)
    const [shake, blend] = afterBattle.slice(quakeAt, quakeAt + 2)
    assert.equal(blend.opcode, 0x73)
    quake = {
      frames: shake.operands[0],
      level: shake.operands[1] || 4,
      stepMs: (blend.operands[0] + 1) * 10,
      steps: 72,
    }
  }
  return {
    actor: `e${actor.id}`,
    asset: actor.spriteNum,
    position: [actor.x, actor.y],
    poses,
    intervals: steps.map(({ operands }) => (operands[0] + (isGeneral ? 0 : 1)) * 100),
    beforeTalkMs,
    arrival,
    arrivalActors,
    quake,
    reward: spec.disk.reward && commands[spec.disk.reward + 2].text,
  }
}

function readInnPredecessor(scene, commands, spec) {
  const { actor, start, end } = spec.predecessor
  const author = scene.entities.find(({ id }) => id === actor)
  const body = author.behaviors.trigger.default.flow.stages.flatMap(({ body }) => body)
  const original = commands.slice(start, end + 1)
  const directions = ['down', 'left', 'up', 'right']
  const sceneActions = (id) =>
    body.filter(({ target }) => target?.scene === spec.scene && target.entity === id)
  assert.equal(commands[711].opcode, 0x49)
  assert.deepEqual(commands[711].operands, [0xffff, 0, 0])
  const states = { e62: { state: commands[711].operands[1] } }
  for (const id of ['e56', 'e59', 'e60', 'e61']) {
    const address = Number(id.slice(1)) + 1
    const field = (opcode) =>
      original.find(({ opcode: actual, operands }) => actual === opcode && operands[0] === address)
        ?.operands
    const authored = sceneActions(id)
    const state = field(0x49)[1]
    assert.equal(authored.find(({ kind }) => kind === 'setEntityState')?.state, state)
    if (id === 'e56') {
      states[id] = { state }
      continue
    }
    const [, x, y] = field(0x13)
    const facing = directions[field(0x16)[1]]
    const triggerIp = field(0x25)[1]
    const triggerMode = field(0x40)[1]
    const autoIp = field(0x24)[1]
    assert.equal(triggerIp, spec.disk.entry)
    const selection = (channel) =>
      authored.find(
        ({ kind, channel: actual }) => kind === 'selectEntityBehavior' && actual === channel,
      )?.selection
    const activation = authored.find(({ kind }) => kind === 'setEntityTriggerActivation')?.selection
    assert(activation?.kind === 'use' && activation.value.on === 'touch')
    states[id] = {
      state,
      x,
      y,
      facing,
      frame: field(0x16)[2],
      triggerIp,
      triggerMode,
      autoIp,
      pos: authored.find(({ kind }) => kind === 'setEntityPos')?.pos,
      triggerVariant: selection('trigger').value,
      activation,
      auto: selection('auto'),
    }
    assert(states[id].pos)
  }
  return states
}

function readInnFrames(data, commands, setup, spec) {
  const { entrance, world } = spec
  const taoist = data.rfScene.entities.find(({ id }) => id === 'e62')
  const gift = taoist.behaviors.trigger['c8-321c0a7d7de1'].flow.stages.flatMap(({ body }) => body)
  assert(
    gift.some(
      ({ kind, state, target }) =>
        kind === 'setEntityState' &&
        target.scene === spec.scene &&
        target.entity === taoist.id &&
        state === setup[taoist.id].state,
    ),
    'wine predecessor hides the Taoist before the later encounter',
  )
  const door = data.musicScene.eventObjects.find(({ id }) => `e${id}` === entrance.owner)
  assert.equal(door.triggerLabel, `L_${entrance.ip}`)
  const [x, y, half] = commands[entrance.ip].operands
  assert.equal(commands[entrance.ip].opcode, 0x46)
  assert.deepEqual(entrance.landing, [x + y + half, y - x, 0])
  assert.equal(commands[entrance.ip + 1].sceneId, gameScene(spec))
  const entry = data.canonicalMusicScene.entities.find(({ id }) => id === entrance.owner)
  const [load] = entry.behaviors.trigger.default.flow.stages[0].body
  assert.deepEqual(
    [load.kind, load.scene, data.rfScene.entries[load.entryId].pos],
    ['loadScene', spec.scene, grid(entrance.landing)],
  )
  assert.deepEqual(entrance.walk.at(-1), spec.start)
  const initialActor = (id, x, y, facing, offset) => {
    const actor = data.gameScene.eventObjects.find((entry) => `e${entry.id}` === id)
    const direction = ['down', 'left', 'up', 'right'].indexOf(facing)
    return {
      asset: actor.spriteNum,
      position: [x, y],
      facing,
      frame: actor.nSpriteFrames * direction + offset,
    }
  }
  const cameraAndActors = ([col, row], actors) => {
    const leader = [16 * (col - row), 8 * (col + row)]
    return { leader, camera: [leader[0] - 160, leader[1] - 112], actors }
  }
  const start = cameraAndActors(
    entrance.landing,
    Object.fromEntries(
      Object.entries(setup)
        .filter(([, state]) => state.state > 0)
        .map(([id, { x, y, facing, frame }]) => [id, initialActor(id, x, y, facing, frame)]),
    ),
  )
  const chase = Object.fromEntries(
    Object.entries(setup)
      .filter(([, state]) => state.autoIp)
      .map(([id, { autoIp, x, y }]) => {
        const command = commands[autoIp]
        assert.equal(command.opcode, 0x4c)
        const speed = command.operands[1] || 4
        const stride = [2 * speed, speed]
        const step = stride.map((size, i) => size * Math.sign(start.leader[i] - [x, y][i]))
        return [id, { stride, step }]
      }),
  )
  const afterVictory = commands.slice(spec.disk.battle + 1, world.scriptedReturn.wait + 1)
  const field = (opcode, id) =>
    afterVictory.find(
      ({ opcode: actual, operands }) =>
        actual === opcode && operands[0] === Number(id.slice(1)) + 1,
    )?.operands
  const actors = Object.fromEntries(
    ['e56', 'e59', 'e68'].map((id) => {
      const [, x, y] = field(0x13, id)
      const [, direction, frame] = field(0x16, id)
      return [id, initialActor(id, x, y, ['down', 'left', 'up', 'right'][direction], frame)]
    }),
  )
  for (const id of ['e60', 'e61']) assert.equal(field(0x49, id)[1], 0)
  const [a, b, h] = commands[world.scriptedReturn.position].operands
  assert.equal(commands[world.scriptedReturn.position].opcode, 0x46)
  const landed = [a + b + h, b - a, 0]
  assert.deepEqual(landed, world.returned)
  const predecessor = data.predecessor.entities.find(({ id }) => id === spec.predecessor.actor)
  const selector = predecessor.behaviors.trigger.default.flow.stages
    .flatMap(({ body }) => body)
    .find(({ kind, scene }) => kind === 'selectSceneHooks' && scene === spec.scene)
  const setupHook = selector?.selection.onEnter?.value
  if (setupHook) {
    const hook = data.rfScene.hooks.onEnter
    const stage = hook.variants[setupHook].flow.stages[0]
    assert.equal(hook.initial, undefined, 'ambush prep is selected by the story')
    assert.deepEqual(stage.next, { kind: 'complete' })
    assert.deepEqual(stage.entry.reveal, {
      kind: 'fade',
      outMs: load.transition.outMs,
      inMs: load.transition.inMs,
    })
    for (const [id, { facing, frame, pos, x, y }] of Object.entries(setup)) {
      if (!pos) continue
      const steps = stage.entry.prepare.filter(({ target }) => target?.entity === id)
      assert.deepEqual(steps, [
        { kind: 'setEntityFacing', target: { scene: spec.scene, entity: id }, facing },
        { kind: 'setEntityFrame', target: { scene: spec.scene, entity: id }, frame },
      ])
      assert.deepEqual([16 * (pos.col - pos.row), 8 * (pos.col + pos.row)], [x, y])
    }
  }
  return { start, returned: cameraAndActors(landed, actors), setupHook, chase }
}

function readInnBattleDialogue(commands, leader, actors) {
  const gate = commands[leader.scriptOnTurnStart]
  assert.equal(gate.opcode, 0x79)
  assert.equal(gate.operands[0], actors.roles[1].name)
  const start = gate.operands[1]
  const last = commands.findIndex(({ op }, ip) => ip > start && op === 'end')
  assert(last > start)
  return commands.slice(start, last)
}

function ringSource(commands, turnStart, actors, successorTrack) {
  const [stop, sound, delay, music] = [0x77, 0x47, 0x85, 0x43].map((opcode) =>
    turnStart.find((command) => command.opcode === opcode),
  )
  assert.equal(commands[8029].opcode, 0x46)
  const [col, row, half] = commands[8029].operands
  const leader = [col * 32 + half * 16, row * 16 + half * 8]
  const signed = (word) => (word << 16) >> 16
  const anchor = commands
    .slice(7703, 8023)
    .filter(({ opcode, operands }) => opcode === 0x7f && operands[2] !== 0xffff)
    .map(({ operands }) => operands)
    .reduce(
      (point, [dx, dy, count]) =>
        point.map((value, i) => value - signed(i === 0 ? dx : dy) * Math.max(count, 1)),
      [160, 112],
    )
  // 8119/8122 alternate a step with a yielding reset. Each 7911 camera
  // step updates the world and runs 8125 once.
  const rightFrames = commands
    .slice(7862, 7882)
    .filter(({ opcode }) => opcode === 0x09)
    .reduce((sum, { operands }) => sum + operands[0], 0)
  const beats = [
    [commands[7829].operands[0] / 2, -4],
    [Math.ceil(rightFrames / 2), 4],
    [commands[7911].operands[2], -4],
  ]
  const yueru = actors.find(({ id }) => id === 548)
  const movements = [[yueru.x, yueru.y]]
  for (const [count, dx] of beats) {
    for (let n = 0; n < count; n++) {
      const [x, y] = movements.at(-1)
      movements.push([x + dx, y + dx / 2])
    }
  }
  const patriarch = actors.find(({ id }) => id === 551)
  const [, dx, dy] = commands[8028].operands
  return {
    opening: readRingOpening(commands, actors),
    leader,
    camera: leader.map((value, i) => value - anchor[i]),
    movements,
    movementBeats: beats.map(([count], i) => ({ count, intervalMs: i === 2 ? 100 : 200 })),
    yueruSprite: yueru.spriteNum,
    patriarch: [patriarch.x + dx, patriarch.y + dy],
    fadeMs: stop.operands[0] ? stop.operands[0] * 3000 : 2000,
    cue: sound.operands[0],
    waitMs: delay.operands[0] * 80,
    restartTrack: music.operands[0],
    successorTrack,
  }
}
