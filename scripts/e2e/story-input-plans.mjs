import assert from 'node:assert/strict'
import { fixedRoutePlan } from './fixed-route-plan.mjs'

// Authored from the independently reviewed Game receipts (2026-10-07), not replanned
// from the world under test. Each tuple is one continuous hold. Completion is a
// separate story boundary, including scripted movement/scene entry after the input.
const route = (scene, start, holds, endScene, end, mode = 'ready') => ({
  scene,
  start,
  holds: holds.map(([key, count]) => [
    { L: 'ArrowLeft', R: 'ArrowRight', U: 'ArrowUp', D: 'ArrowDown' }[key],
    count,
  ]),
  completion: { scene: endScene, position: end, mode },
})
const meal = {
  pickup: route(
    's001',
    [89, 46],
    [
      ['D', 5],
      ['R', 2],
    ],
    's001',
    [91, 51],
  ),
  'kitchen-exit': route(
    's001',
    [91, 51],
    [
      ['D', 7],
      ['R', 10],
    ],
    's003',
    [125, 61],
  ),
  'stairs-up': route(
    's003',
    [125, 61],
    [
      ['R', 6],
      ['U', 9],
      ['L', 1],
    ],
    's003',
    [121, 49],
  ),
  'stairs-upper-landing': route('s003', [121, 49], [['U', 1]], 's003', [121, 48]),
  'guest-room': route(
    's003',
    [121, 48],
    [
      ['U', 2],
      ['R', 12],
      ['U', 3],
    ],
    's001',
    [108, 30],
  ),
  'guest-room-exit': route('s001', [108, 26], [['D', 6]], 's003', [133, 45]),
  'stairs-down': route(
    's003',
    [133, 45],
    [
      ['L', 12],
      ['D', 4],
      ['R', 1],
    ],
    's003',
    [131, 52],
  ),
  'taoist-front': route(
    's003',
    [131, 52],
    [
      ['D', 15],
      ['R', 3],
      ['D', 5],
      ['R', 3],
    ],
    's003',
    [137, 72],
  ),
}
const dock = route(
  's004',
  [95, 17],
  [
    ['R', 5],
    ['D', 20],
    ['D', 1],
    ['R', 1],
    ['D', 3],
    ['R', 38],
    ['U', 12],
  ],
  's005',
  [111, 95],
)
const errand = {
  'kitchen-entry': route(
    's003',
    [137, 72],
    [
      ['L', 3],
      ['U', 5],
      ['L', 9],
      ['U', 5],
      ['L', 1],
    ],
    's001',
    [100, 59],
  ),
  aunt: route(
    's001',
    [100, 59],
    [
      ['L', 10],
      ['U', 3],
      ['L', 1],
      ['U', 10],
    ],
    's001',
    [89, 46],
  ),
  auntRepeat: route('s001', [89, 46], [], 's001', [89, 46]),
  'kitchen-exit': route(
    's001',
    [89, 46],
    [
      ['D', 10],
      ['R', 1],
      ['D', 2],
      ['R', 11],
    ],
    's003',
    [125, 61],
  ),
  'inn-exit': route(
    's003',
    [125, 61],
    [
      ['D', 6],
      ['R', 9],
      ['D', 5],
      ['R', 2],
      ['D', 2],
    ],
    's004',
    [95, 17],
  ),
  'dock-entry': dock,
  fish: route(
    's005',
    [111, 95],
    [
      ['U', 23],
      ['R', 3],
      ['U', 4],
    ],
    's005',
    [114, 68],
  ),
  water: route(
    's005',
    [114, 68],
    [
      ['R', 2],
      ['U', 11],
      ['R', 4],
    ],
    's005',
    [120, 57],
    'dialogue',
  ),
  zhang: route('s005', [120, 57], [['L', 2]], 's005', [118, 57], 'dialogue'),
  zhangReminder: route('s005', [118, 57], [['L', 2]], 's005', [116, 57]),
  zhangPrayer: route('s005', [116, 57], [], 's005', [116, 57]),
}
const boat = {
  's004/e94': route(
    's004',
    [140, 31],
    [
      ['L', 1],
      ['D', 10],
      ['L', 38],
      ['U', 3],
      ['L', 1],
      ['U', 1],
      ['U', 20],
      ['L', 5],
      ['U', 2],
    ],
    's003',
    [137, 71],
  ),
  's003/e49': route(
    's003',
    [137, 71],
    [
      ['L', 3],
      ['U', 4],
      ['L', 2],
      ['U', 17],
    ],
    's002',
    [86, 9],
  ),
  's002/e35': route(
    's002',
    [86, 9],
    [
      ['R', 2],
      ['U', 6],
    ],
    's002',
    [88, 3],
    'dialogue',
  ),
  'room-initial': route(
    's002',
    [88, 3],
    [
      ['U', 1],
      ['R', 4],
      ['U', 1],
    ],
    's002',
    [92, 1],
  ),
  'room-repeat': route('s002', [92, 1], [], 's002', [92, 1]),
  's002/e32': route(
    's002',
    [92, 1],
    [
      ['L', 5],
      ['D', 10],
    ],
    's003',
    [132, 51],
  ),
  's003/e59': route(
    's003',
    [132, 51],
    [
      ['D', 16],
      ['R', 2],
      ['D', 5],
      ['R', 1],
    ],
    's003',
    [135, 72],
    'dialogue',
  ),
  's003/e44': route(
    's003',
    [135, 72],
    [
      ['R', 1],
      ['D', 2],
    ],
    's004',
    [95, 17],
  ),
  's004/e95': dock,
  's005/e123': route(
    's005',
    [111, 95],
    [
      ['R', 2],
      ['U', 2],
      ['R', 3],
      ['U', 43],
      ['R', 5],
    ],
    's005',
    [121, 50],
  ),
  's005/e116': route('s005', [121, 50], [['R', 3]], 's014', [74, 27], 'dialogue'),
}

export function storyInputPlan(fragment, engine, id, caseName = 'story') {
  assert(['story', 'items', 'saves', 'guards'].includes(caseName), 'unknown input-plan case')
  let plan = { '004': meal, '005': errand, '006': boat }[fragment]?.[id]
  if (fragment === '004' && id === 'serve') {
    // Explicitly retained input discrepancy, NOT an accepted equivalence: Game's idle
    // touch already starts e15 on entry; RF currently requires moving into its range.
    plan =
      engine === 'game'
        ? route('s001', [108, 30], [], 's001', [108, 30], 'dialogue')
        : route('s001', [108, 30], [['U', 1]], 's001', [108, 29], 'dialogue')
  }
  if (fragment === '005' && id === 'news') {
    const guards = caseName === 'guards'
    plan = route(
      's005',
      guards ? [116, 57] : [118, 57],
      [
        ...(guards ? [] : [['L', 2]]),
        ['D', 5],
        ['L', 1],
        ['D', 14],
        ['L', 1],
        ['D', 1],
        ['L', 1],
        ['D', 19],
      ],
      's004',
      [140, 31],
      'dialogue',
    )
  }
  assert(plan, `missing fixed ${fragment} input plan: ${id}`)
  return fixedRoutePlan(engine, { ...plan, id: `${fragment}:${id}` })
}
