import assert from 'node:assert/strict'
import test from 'node:test'
import { committedInnMoves, navigateInnRoute } from './inn-navigation.mjs'
import { INN_DIRECTIONS } from './inn-route.mjs'

function harness({ destination = (c) => c >= 5, batch = 1, blocked = [] } = {}) {
  const map = {
    version: 4,
    width: 12,
    height: 12,
    collision: Array.from({ length: 24 }, () => Array(12).fill(0)),
  }
  for (const [c, r] of blocked) map.collision[c + r][Math.floor((c - r) / 2)] = 1
  const state = { scene: 's001', position: [2, 0], routeActors: [], busy: false, done: false }
  const inputs = [],
    progress = [],
    commits = []
  let held,
    effect = () => {}
  const read = async () => structuredClone(state)
  const keyboard = {
    down: async (key) => {
      assert.equal(held, undefined, 'previous direction must be released before turning')
      held = key
      inputs.push(['down', key])
    },
    up: async (key) => {
      assert.equal(held, key)
      inputs.push(['up', key])
      held = undefined
    },
  }
  const commit = (position) => {
    const before = structuredClone(state.position)
    state.position = position
    commits.push({
      kind: 'actor',
      id: 'party',
      source: 'commit:input',
      before: { position: before },
      state: { position: structuredClone(position) },
    })
  }
  const until = async (reader, accept, label) => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const current = await reader()
      if (accept(current)) return current
      for (let cell = 0; cell < batch; cell++) {
        if (held && !state.busy && !state.done) {
          const d = INN_DIRECTIONS.find((d) => d.key === held)
          const [c, r] = state.position
          const next = [c + d.col, r + d.row]
          const occupied = state.routeActors.some((a) => a.col === next[0] && a.row === next[1])
          if (
            !occupied &&
            map.collision[next[0] + next[1]]?.[Math.floor((next[0] - next[1]) / 2)] === 0
          )
            commit(next)
        }
        effect({ state, held, commit })
      }
    }
    throw new Error(`timeout: ${label}`)
  }
  const options = {
    keyboard,
    map,
    read,
    until,
    health() {},
    grid: (s) => s.position,
    inScene: (s) => s.scene === 's001',
    ready: (s) => !s.busy,
    destination,
    finished: (s) => s.done,
    onInput() {},
    onProgress: (sample) => progress.push(sample),
  }
  effect = () => {
    if (destination(...state.position)) state.done = true
  }
  return {
    state,
    inputs,
    progress,
    commits,
    options,
    commit,
    held: () => held,
    setEffect: (next) => {
      effect = next
    },
  }
}

test('a straight normal route holds one down/up pair across three actual cells', async () => {
  const h = harness()
  await navigateInnRoute(h.options)
  assert.deepEqual(h.inputs, [
    ['down', 'ArrowRight'],
    ['up', 'ArrowRight'],
  ])
  assert.equal(h.progress.length, 3)
  assert.equal(h.commits.length, 3)
  assert.equal(h.held(), undefined)
})

test('turn releases the old direction and replans against the current actor obstacle', async () => {
  const h = harness({ destination: (c, r) => c === 5 && r === 1, blocked: [[2, 1]] })
  h.setEffect(({ state }) => {
    if (state.position[0] === 3 && state.position[1] === 0)
      state.routeActors = [{ col: 4, row: 0, collide: true }]
    if (state.position[0] === 5 && state.position[1] === 1) state.done = true
  })
  await navigateInnRoute(h.options)
  assert.deepEqual(h.inputs, [
    ['down', 'ArrowRight'],
    ['up', 'ArrowRight'],
    ['down', 'ArrowDown'],
    ['up', 'ArrowDown'],
    ['down', 'ArrowRight'],
    ['up', 'ArrowRight'],
  ])
  assert.deepEqual(h.state.position, [5, 1])
})

test('slow observations may aggregate moves but actual commit evidence retains every cell', async () => {
  const h = harness({ destination: (c) => c >= 6, batch: 2 })
  await navigateInnRoute(h.options)
  assert.equal(h.progress.length, 2)
  assert.deepEqual(committedInnMoves({ events: h.commits, overflow: false, errors: [] }), h.commits)
  assert.equal(h.commits.length, 4)
  assert.deepEqual(h.inputs, [
    ['down', 'ArrowRight'],
    ['up', 'ArrowRight'],
  ])
})

test('a sampled turn point may be missed; replan from actual position, never invent intermediate cells', async () => {
  const h = harness({ destination: (c, r) => c === 5 && r === 2, batch: 2, blocked: [[2, 1]] })
  await navigateInnRoute(h.options)
  assert.deepEqual(h.state.position, [5, 2])
  assert.deepEqual(h.progress[0], { key: 'ArrowRight', from: [2, 0], to: [4, 0] })
  assert(h.inputs.some(([kind, key]) => kind === 'down' && key === 'ArrowDown'))
  assert.equal(h.held(), undefined)
})

test('scene transition releases held input before waiting for the destination scene to settle', async () => {
  const h = harness()
  h.setEffect(({ state, held }) => {
    if (state.scene === 's001' && state.position[0] === 3) {
      state.scene = 's003'
      state.busy = true
    } else if (state.scene === 's003') {
      assert.equal(held, undefined)
      state.busy = false
      state.done = true
    }
  })
  await navigateInnRoute(h.options)
  assert.deepEqual(h.inputs, [
    ['down', 'ArrowRight'],
    ['up', 'ArrowRight'],
  ])
})

test('a new script with unchanged position still releases input before the script settles', async () => {
  const h = harness()
  h.options.until = async (read, accept, label) => {
    if (label === 'normal input committed progress') {
      h.state.busy = true
      assert(accept(await read()))
      return read()
    }
    assert.equal(h.held(), undefined)
    h.state.busy = false
    h.state.done = true
    const next = await read()
    assert(accept(next))
    return next
  }
  await navigateInnRoute(h.options)
  assert.equal(h.commits.length, 0)
  assert.deepEqual(h.inputs, [
    ['down', 'ArrowRight'],
    ['up', 'ArrowRight'],
  ])
})

test('observation and partially failed keyboard operations both release in finally', async () => {
  for (const fault of ['observe', 'down']) {
    const h = harness()
    if (fault === 'observe')
      h.options.until = async () => {
        throw new Error('observe failed')
      }
    else {
      const down = h.options.keyboard.down
      h.options.keyboard.down = async (key) => {
        await down(key)
        throw new Error('down failed')
      }
    }
    await assert.rejects(navigateInnRoute(h.options), new RegExp(`${fault} failed`))
    assert.equal(h.held(), undefined)
    assert.deepEqual(h.inputs, [
      ['down', 'ArrowRight'],
      ['up', 'ArrowRight'],
    ])
  }
})

test('overflow/error/non-commit movement cannot become a normal route census', () => {
  const h = harness()
  h.commit([3, 0])
  const trace = { events: h.commits, overflow: false, errors: [] }
  assert.throws(() => committedInnMoves({ ...trace, overflow: true }), /overflow/)
  assert.throws(() => committedInnMoves({ ...trace, errors: ['missing commit'] }), /error/)
  assert.throws(
    () =>
      committedInnMoves({
        ...trace,
        events: [{ ...h.commits[0], source: 'render' }],
      }),
    /unobserved/,
  )
  assert.deepEqual(
    committedInnMoves({
      ...trace,
      events: [
        { ...h.commits[0], before: null },
        { ...h.commits[0], id: 'npc' },
        { ...h.commits[0], state: h.commits[0].before },
      ],
    }),
    [],
  )
})
