import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createRouteProgressDeadline, navigateInnRoute } from './inn-navigation.mjs'
import {
  INN_DIRECTIONS,
  loadRouteMotionGeometry,
  planInnRoute,
  routeActorsBlock,
  routeFrontierOpened,
  TemporaryRouteObstruction,
} from './inn-route.mjs'
import { navigateMealRoute } from './meal-journey.mjs'

const openMap = () => ({
  version: 4,
  width: 12,
  height: 12,
  collision: Array.from({ length: 24 }, () => Array(12).fill(0)),
})
const source = readFileSync(
  new URL('../../packages/reforge/src/entity-motion.ts', import.meta.url),
  'utf8',
)

test('actual fractional village blocker is not an empty point: original counter becomes a safe detour', () => {
  const map = JSON.parse(
    readFileSync(new URL('../../projects/pal/content/maps/map-001.json', import.meta.url), 'utf8'),
  )
  const actors = [{ col: 94.75, row: 27.5, collide: true }],
    start = [95, 27]
  assert.equal(
    actors.some((a) => a.col === 95 && a.row === 28),
    false,
    'old point model falsely admitted this edge',
  )
  assert.equal(routeActorsBlock('reforge', start, [95, 28], actors), true)
  assert.equal(routeActorsBlock('reforge', start, [96, 27], actors), false)
  const path = planInnRoute(
    map,
    start,
    (c, r) => Math.max(Math.abs(c - 140), Math.abs(r - 26)) <= 3,
    actors,
    'reforge',
  )
  assert.notEqual(path[0], 'ArrowDown')
  let at = start
  for (const key of path) {
    const d = INN_DIRECTIONS.find((d) => d.key === key),
      next = [at[0] + d.col, at[1] + d.row]
    assert.equal(routeActorsBlock('reforge', at, next, actors), false)
    at = next
  }
})
test('game and RF retain their distinct body sizes and original overlap escape semantics', () => {
  const half = [{ col: 2.5, row: 0, collide: true }]
  assert.equal(routeActorsBlock('game', [2, 0], [3, 0], half), false)
  assert.equal(routeActorsBlock('reforge', [2, 0], [3, 0], half), true)
  assert.equal(routeActorsBlock('reforge', [2, 0], [1, 0], half), false)
  assert.equal(
    routeActorsBlock('game', [2, 0], [3, 0], [{ col: 2.75, row: 0, collide: true }]),
    true,
  )
  assert.equal(
    routeActorsBlock('reforge', [2, 0], [3, 0], [{ col: 4, row: 0, collide: true }]),
    false,
  )
  assert.throws(() => planInnRoute(openMap(), [2, 0], (c) => c === 3), /explicit engine/)
})
test('pure geometry loader rejects imports, top-level effects, changed declarations and parse loss', async () => {
  const geometry = await loadRouteMotionGeometry(source)
  assert.equal(geometry.COLLISION_EPSILON, 1e-6)
  for (const changed of [
    source.replace('import type', 'import'),
    `${source}\nconsole.log('side effect')`,
    `${source}\nexport const extra = 1`,
    `${source}\nclass Extra { static {} }`,
    `${source}\nfunction extra(){return import('node:fs')}`,
    `${source}\nexport function motionSweepsConflict(){}`,
    `${source}\nfunction`,
  ])
    await assert.rejects(loadRouteMotionGeometry(changed))
})
test('unchanged-position deadline is not refreshed by replanning or unrelated actor movement', () => {
  let now = 0
  const remaining = createRouteProgressDeadline(() => now)
  assert.equal(remaining([4, 0]), 5000)
  now = 4000
  assert.equal(remaining([4, 0]), 1000)
  now = 4999
  assert.equal(remaining([4, 0]), 1)
  now = 5000
  assert.throws(() => remaining([4, 0]), /deadline/)
  assert.equal(remaining([5, 0]), 5000)
})

function driveHarness({
  corridor = false,
  occupied = false,
  enterOnDown = false,
  permanent = false,
} = {}) {
  const map = openMap()
  if (corridor) {
    map.collision = map.collision.map((row) => row.map(() => 1))
    for (const col of [4, 5, 6]) map.collision[col][Math.floor(col / 2)] = 0
  }
  const state = {
    position: [4, 0],
    scene: 's001',
    ready: true,
    routeActors: occupied ? [{ col: 5, row: 0, collide: true }] : [],
  }
  let held,
    entered = false,
    polls = 0
  const inputs = [],
    replans = [],
    waits = []
  const read = async () => structuredClone(state)
  const options = {
    engine: 'reforge',
    map,
    read,
    grid: (s) => s.position,
    inScene: (s) => s.scene === 's001',
    ready: (s) => s.ready,
    destination: (c, r) => c === 6 && r === 0,
    finished: (s) => s.position[0] === 6 && s.position[1] === 0,
    health() {},
    onInput() {},
    onProgress() {},
    onReplan: (event) => replans.push(event),
    keyboard: {
      down: async (key) => {
        assert.equal(held, undefined)
        held = key
        inputs.push(['down', key])
        if (enterOnDown && !entered) {
          state.routeActors = [{ col: 5, row: 0, collide: true }]
          entered = true
        }
      },
      up: async (key) => {
        assert.equal(held, key)
        held = undefined
        inputs.push(['up', key])
      },
    },
    until: async (reader, accept, label, budget) => {
      waits.push({ label, budget })
      for (let tick = 0; tick < 20; tick++) {
        const current = await reader()
        if (accept(current)) return current
        polls++
        if (label === 'temporary route occupation clears') {
          assert.equal(held, undefined, 'occupied-route waiting must release input')
          state.routeActors = [
            { col: 5, row: permanent || tick < 2 ? 0 : 2, collide: true },
            { col: 20 + tick, row: 10, collide: true },
          ]
        } else if (held) {
          const d = INN_DIRECTIONS.find((d) => d.key === held),
            next = [state.position[0] + d.col, state.position[1] + d.row]
          if (!routeActorsBlock('reforge', state.position, next, state.routeActors))
            state.position = next
        }
      }
      throw new Error(`timeout: ${label}`)
    },
  }
  return { options, state, inputs, replans, waits, held: () => held, polls: () => polls }
}
for (const [name, driver] of [
  ['common', navigateInnRoute],
  ['game-boundary', navigateMealRoute],
]) {
  test(`${name}: actor entering next edge interrupts held input and replans a real detour`, async () => {
    const h = driveHarness({ enterOnDown: true })
    await driver(h.options)
    assert.deepEqual(h.inputs.slice(0, 2), [
      ['down', 'ArrowRight'],
      ['up', 'ArrowRight'],
    ])
    assert.equal(h.replans.length, 1)
    assert.equal(h.held(), undefined)
    assert.deepEqual(h.state.position, [6, 0])
  })
  test(`${name}: a temporarily occupied unique corridor waits passively, then holds through it`, async () => {
    const h = driveHarness({ corridor: true, occupied: true })
    await driver(h.options)
    assert.equal(h.replans.length, 1)
    assert.equal(h.waits[0].label, 'temporary route occupation clears')
    assert(h.waits[0].budget <= 5000)
    assert.deepEqual(h.inputs, [
      ['down', 'ArrowRight'],
      ['up', 'ArrowRight'],
    ])
  })
  test(`${name}: unrelated actor changes do not wake a sealed corridor or restart the deadline`, async () => {
    const h = driveHarness({ corridor: true, occupied: true, permanent: true })
    await assert.rejects(driver(h.options), /temporary route occupation/)
    assert.equal(h.replans.length, 1)
    assert.equal(h.waits.length, 1)
    assert.equal(h.polls(), 20)
    assert.deepEqual(h.inputs, [])
    assert.equal(h.held(), undefined)
  })
  test(`${name}: static terrain without a route fails immediately without a wait or key`, async () => {
    const h = driveHarness({ corridor: true, occupied: true })
    h.options.map.collision[5][2] = 1
    await assert.rejects(driver(h.options), /no normal collision-safe/)
    assert.equal(h.waits.length, 0)
    assert.deepEqual(h.inputs, [])
  })
}
test('blocked-frontier wake checks only real newly passable edges', () => {
  let obstruction
  try {
    planInnRoute(
      driveHarness({ corridor: true }).options.map,
      [4, 0],
      (c) => c === 6,
      [{ col: 5, row: 0, collide: true }],
      'reforge',
    )
  } catch (error) {
    obstruction = error
  }
  assert(obstruction instanceof TemporaryRouteObstruction)
  assert.equal(
    routeFrontierOpened('reforge', obstruction.frontier, [
      { col: 5, row: 0, collide: true },
      { col: 40, row: 40, collide: true },
    ]),
    false,
  )
  assert.equal(
    routeFrontierOpened('reforge', obstruction.frontier, [{ col: 5, row: 2, collide: true }]),
    true,
  )
})
