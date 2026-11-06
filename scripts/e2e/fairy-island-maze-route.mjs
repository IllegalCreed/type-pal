import { fixedRoutePlan } from './fixed-route-plan.mjs'

const arrow = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' }
const raft = (id, holds, landing, entry, resume, { stage, waypoints }) => {
  const [col, row] = waypoints.at(-1)
  return {
    kind: 'raft',
    id,
    holds,
    landing,
    entry,
    resume,
    raftEnd: [16 * (col - row), 8 * (col + row)],
    ride: { entity: `e${id}`, stage, waypoints, landing },
  }
}
const hammer = (id, holds, landing) => ({ kind: 'hammer', id, holds, landing })
const search = (id, holds, landing) => ({ kind: 'search', id, holds, landing })
const gate = (id, holds, landing) => ({ kind: 'gate', id, holds, landing })
const exit = (id, holds, landing, dialogueAt) => ({ kind: 'exit', id, holds, landing, dialogueAt })

// Common Game and Reforge input holds, interaction landmarks, and original raft waypoints.
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
    {
      stage: 'initial',
      waypoints: [
        [100, 26],
        [100, 3],
      ],
    },
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
    { stage: 'initial', waypoints: [[101, -11]] },
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
    { stage: 'legacy-002', waypoints: [[101, -1]] },
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
    {
      stage: 'legacy-002',
      waypoints: [
        [100, 26],
        [94, 26],
      ],
    },
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
    { stage: 'initial', waypoints: [[90, 12]] },
  ),
  raft(250, [['right', 2]], [118, 26], 4110, 4115, {
    stage: 'initial',
    waypoints: [
      [103, 11],
      [103, 26],
      [117, 26],
    ],
  }),
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
    { stage: 'initial', waypoints: [[111, 45]] },
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
    { stage: 'legacy-002', waypoints: [[111, 21]] },
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
    { stage: 'initial', waypoints: [[95, 18]] },
  ),
  raft(253, [['left', 2]], [86, 18], 4135, 4138, { stage: 'initial', waypoints: [[87, 18]] }),
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
    {
      stage: 'initial',
      waypoints: [
        [87, -6],
        [78, -6],
      ],
    },
  ),
  raft(259, [['down', 2]], [76, -5], 4183, 4192, {
    stage: 'initial',
    waypoints: [
      [79, -4],
      [79, -8],
      [75, -8],
      [75, -5],
    ],
  }),
  raft(259, [['left', 1]], [63, -5], 4192, 4186, { stage: 'legacy-002', waypoints: [[64, -5]] }),
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
    { stage: 'legacy-003', waypoints: [[75, -5]] },
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
    { stage: 'initial', waypoints: [[77, -11]] },
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
    { stage: 'legacy-002', waypoints: [[77, -7]] },
  ),
  raft(255, [['right', 1]], [87, 11], 4155, 4151, {
    stage: 'legacy-002',
    waypoints: [
      [87, -6],
      [87, 10],
    ],
  }),
  raft(
    257,
    [
      ['left', 7],
      ['down', 1],
    ],
    [51, 17],
    4167,
    4171,
    {
      stage: 'initial',
      waypoints: [
        [80, 17],
        [52, 17],
      ],
    },
  ),
  hammer(237, [['left', 5]], [46, 17]),
  raft(257, [['right', 6]], [80, 11], 4171, 4167, {
    stage: 'legacy-002',
    waypoints: [
      [80, 17],
      [80, 12],
    ],
  }),
  raft(
    258,
    [
      ['up', 9],
      ['left', 7],
    ],
    [54, 2],
    4176,
    4179,
    { stage: 'initial', waypoints: [[55, 2]] },
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
    { stage: 'legacy-002', waypoints: [[73, 2]] },
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
    { stage: 'legacy-002', waypoints: [[92, 18]] },
  ),
  raft(252, [['right', 2]], [108, 18], 4131, 4128, { stage: 'legacy-002', waypoints: [[107, 18]] }),
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
    {
      stage: 'legacy-002',
      waypoints: [
        [103, 26],
        [103, 11],
        [92, 11],
      ],
    },
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
    { stage: 'legacy-002', waypoints: [[90, 20]] },
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
    { stage: 'initial', waypoints: [[80, 26]] },
  ),
  raft(244, [['up', 1]], [55, 12], 4062, 4066, {
    stage: 'initial',
    waypoints: [
      [79, 12],
      [56, 12],
    ],
  }),
  raft(249, [['down', 1]], [62, 29], 4101, 4105, {
    stage: 'initial',
    waypoints: [
      [55, 29],
      [61, 29],
    ],
  }),
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
    {
      stage: 'legacy-002',
      waypoints: [
        [55, 29],
        [55, 13],
      ],
    },
  ),
  raft(244, [['right', 1]], [79, 26], 4066, 4062, {
    stage: 'legacy-002',
    waypoints: [
      [79, 12],
      [79, 25],
    ],
  }),
  raft(243, [['right', 1]], [86, 26], 4058, 4055, { stage: 'legacy-002', waypoints: [[85, 26]] }),
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

export const FAIRY_MAZE_STATUES = Object.freeze([237, 238, 239, 240, 241, 242])
export const FAIRY_MAZE_LOOT = Object.freeze({ 235: [108], 263: [67, 68, 69, 70, 71] })

export function fairyMazePlan(engine) {
  let start = [90, 54]
  return actions.map((action, index) => {
    const { kind, holds, landing, dialogueAt } = action
    const scene = kind === 'exit' ? 's018' : 's017'
    const completion = {
      scene: kind === 'gate' ? 's018' : scene,
      position: dialogueAt ?? landing,
      mode: kind === 'exit' ? 'dialogue' : 'ready',
    }
    const route = fixedRoutePlan(engine, {
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
