import { fixedRoutePlan } from './fixed-route-plan.mjs'

const arrow = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }
const raft = (id, holds, landing, entry, resume, raftEnd) => ({
  kind: 'raft',
  id,
  holds,
  landing,
  entry,
  resume,
  raftEnd,
})
const hammer = (id, holds, landing) => ({ kind: 'hammer', id, holds, landing })
const search = (id, holds, landing) => ({ kind: 'search', id, holds, landing })
const gate = (id, holds, landing) => ({ kind: 'gate', id, holds, landing })
const exit = (id, holds, landing, dialogueAt) => ({ kind: 'exit', id, holds, landing, dialogueAt })

// Grid landmarks, real input holds, and the raw script endpoints verified in the Game.
const actions = [
  raft(
    245,
    [
      ['up', 15],
      ['left', 1],
      ['up', 5],
      ['right', 1],
      ['up', 8],
      ['right', 4],
    ],
    [100, 2],
    4071,
    4075,
    [1552, 824],
  ),
  raft(
    247,
    [
      ['up', 1],
      ['right', 1],
      ['up', 2],
    ],
    [101, -12],
    4087,
    4090,
    [1792, 720],
  ),
  search(
    235,
    [
      ['up', 1],
      ['left', 2],
      ['up', 1],
    ],
    [99, -14],
  ),
  raft(
    247,
    [
      ['down', 1],
      ['right', 2],
      ['down', 2],
    ],
    [101, 0],
    4090,
    4087,
    [1632, 800],
  ),
  raft(
    245,
    [
      ['down', 2],
      ['left', 1],
      ['down', 1],
    ],
    [93, 26],
    4075,
    4071,
    [1088, 960],
  ),
  raft(
    248,
    [
      ['left', 1],
      ['up', 1],
      ['left', 1],
      ['up', 1],
      ['left', 1],
      ['up', 4],
    ],
    [90, 11],
    4094,
    4097,
    [1248, 816],
  ),
  raft(250, [['right', 2]], [118, 26], 4110, 4115, [1456, 1144]),
  hammer(
    240,
    [
      ['up', 7],
      ['right', 1],
      ['up', 11],
      ['left', 10],
      ['up', 1],
      ['left', 1],
      ['up', 1],
      ['left', 1],
      ['up', 8],
    ],
    [107, -2],
  ),
  raft(
    251,
    [
      ['down', 8],
      ['right', 1],
      ['down', 1],
      ['right', 1],
      ['down', 1],
      ['right', 10],
      ['down', 11],
      ['left', 8],
      ['down', 2],
    ],
    [111, 46],
    4121,
    4124,
    [1056, 1248],
  ),
  hammer(
    242,
    [
      ['down', 1],
      ['right', 1],
      ['down', 1],
      ['right', 1],
      ['down', 1],
      ['right', 10],
      ['up', 1],
      ['right', 1],
      ['up', 1],
      ['right', 1],
      ['up', 1],
      ['right', 1],
      ['up', 10],
    ],
    [126, 36],
  ),
  raft(
    251,
    [
      ['down', 13],
      ['left', 13],
      ['up', 1],
      ['left', 1],
      ['up', 1],
      ['left', 1],
      ['up', 2],
    ],
    [111, 20],
    4124,
    4121,
    [1440, 1056],
  ),
  raft(
    252,
    [
      ['up', 2],
      ['left', 4],
    ],
    [94, 18],
    4128,
    4131,
    [1232, 904],
  ),
  raft(253, [['left', 2]], [86, 18], 4135, 4138, [1104, 840]),
  raft(
    255,
    [
      ['up', 7],
      ['right', 1],
      ['up', 1],
    ],
    [77, -6],
    4151,
    4155,
    [1344, 576],
  ),
  raft(259, [['down', 2]], [76, -5], 4183, 4192, [1280, 560]),
  raft(259, [['left', 1]], [63, -5], 4192, 4186, [1104, 472]),
  search(
    263,
    [
      ['left', 3],
      ['up', 3],
      ['right', 7],
      ['up', 4],
      ['right', 1],
      ['up', 1],
      ['right', 2],
      ['up', 4],
      ['left', 1],
      ['right', 1],
    ],
    [70, -17],
  ),
  raft(
    259,
    [
      ['down', 5],
      ['left', 3],
      ['down', 5],
      ['left', 7],
      ['down', 2],
      ['right', 4],
    ],
    [76, -5],
    4186,
    4192,
    [1280, 560],
  ),
  raft(
    256,
    [
      ['right', 1],
      ['up', 2],
    ],
    [77, -12],
    4160,
    4163,
    [1408, 528],
  ),
  hammer(
    239,
    [
      ['up', 17],
      ['left', 12],
    ],
    [65, -29],
  ),
  raft(
    256,
    [
      ['right', 12],
      ['down', 18],
    ],
    [77, -6],
    4163,
    4160,
    [1344, 560],
  ),
  raft(255, [['right', 1]], [87, 11], 4155, 4151, [1232, 776]),
  raft(
    257,
    [
      ['left', 7],
      ['down', 1],
    ],
    [51, 17],
    4167,
    4171,
    [560, 552],
  ),
  hammer(237, [['left', 5]], [46, 17]),
  raft(257, [['right', 6]], [80, 11], 4171, 4167, [1088, 736]),
  raft(
    258,
    [
      ['up', 9],
      ['left', 7],
    ],
    [54, 2],
    4176,
    4179,
    [848, 456],
  ),
  hammer(
    238,
    [
      ['down', 6],
      ['left', 8],
      ['up', 9],
      ['left', 14],
    ],
    [32, -1],
  ),
  raft(
    258,
    [
      ['right', 14],
      ['down', 9],
      ['right', 7],
      ['up', 1],
      ['right', 1],
      ['up', 5],
      ['right', 1],
    ],
    [74, 2],
    4179,
    4176,
    [1136, 600],
  ),
  raft(
    253,
    [
      ['right', 6],
      ['down', 7],
      ['right', 1],
      ['down', 2],
      ['right', 5],
      ['down', 6],
      ['right', 1],
      ['down', 1],
    ],
    [93, 18],
    4138,
    4135,
    [1184, 880],
  ),
  raft(252, [['right', 2]], [108, 18], 4131, 4128, [1424, 1000]),
  raft(
    250,
    [
      ['right', 4],
      ['down', 1],
      ['right', 6],
      ['down', 7],
      ['left', 1],
    ],
    [91, 11],
    4115,
    4110,
    [1296, 824],
  ),
  raft(
    248,
    [
      ['left', 1],
      ['down', 1],
    ],
    [90, 21],
    4097,
    4094,
    [1120, 880],
  ),
  raft(
    243,
    [
      ['down', 5],
      ['left', 5],
    ],
    [79, 26],
    4055,
    4058,
    [864, 848],
  ),
  raft(244, [['up', 1]], [55, 12], 4062, 4066, [704, 544]),
  raft(249, [['down', 1]], [62, 29], 4101, 4105, [512, 720]),
  hammer(
    241,
    [
      ['right', 3],
      ['down', 12],
      ['right', 1],
      ['down', 1],
      ['right', 1],
      ['down', 1],
      ['right', 10],
    ],
    [77, 43],
  ),
  raft(
    249,
    [
      ['left', 10],
      ['up', 1],
      ['left', 1],
      ['up', 1],
      ['left', 1],
      ['up', 12],
      ['left', 4],
    ],
    [55, 12],
    4105,
    4101,
    [672, 544],
  ),
  raft(244, [['right', 1]], [79, 26], 4066, 4062, [864, 832]),
  raft(243, [['right', 1]], [86, 26], 4058, 4055, [944, 888]),
  gate(
    262,
    [
      ['right', 1],
      ['up', 1],
      ['right', 2],
    ],
    [89, 25],
  ),
  exit(265, [['up', 52]], [61, 42], [89, -27]),
]

export const FAIRY_MAZE_GAME_STATUES = Object.freeze([237, 238, 239, 240, 241, 242])
export const FAIRY_MAZE_GAME_LOOT = Object.freeze({ 235: [108], 263: [67, 68, 69, 70, 71] })
export const FAIRY_MAZE_GAME_SOURCES = [
  'data/extracted/events/all.json',
  'data/extracted/data/event-objects.json',
  'data/extracted/data/items.json',
  'data/extracted/lookup/strings.json',
  'data/extracted/lookup/words.json',
  ...['016', '017', '018'].map((scene) => `data/extracted/events/scene-${scene}.json`),
  ...[16, 17, 18].map((scene) => `data/extracted/data/scene/${scene}.json`),
  ...[6, 25, 119].map((map) => `data/extracted/data/tilemap/${map}.json`),
]

export function fairyMazeGamePlan() {
  let start = [90, 54]
  return actions.map((action, index) => {
    const { kind, holds, landing, dialogueAt } = action
    const scene = kind === 'exit' ? 's018' : 's017'
    const completion = {
      scene: kind === 'gate' ? 's018' : scene,
      position: dialogueAt ?? landing,
      mode: kind === 'exit' ? 'dialogue' : 'ready',
    }
    const route = fixedRoutePlan('game', {
      id: index,
      scene,
      start,
      holds: holds.map(([direction, count]) => [arrow[direction], count]),
      completion,
    })
    start = landing
    return { ...action, route, scene }
  })
}
