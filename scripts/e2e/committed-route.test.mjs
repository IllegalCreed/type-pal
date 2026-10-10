import assert from 'node:assert/strict'
import test from 'node:test'
import {
  committedRouteReceipt,
  installCommittedRoutePlayback,
  recordFacingInput,
  replayCommittedRoute,
  replayFacingInput,
} from './committed-route.mjs'
import { continuousPlaybackActions, continuousStoryActions } from './continuous-story.mjs'

const move = (order, source, from, to) => ({
  order,
  source,
  scene: 's003',
  kind: 'actor',
  id: 'party',
  before: { position: from },
  state: { position: to },
})

test('003 stairs distinguishes the last player step, a fractional script frame, and the settled endpoint', () => {
  // Actual Reforge 003 sequence: player.pos to [122,49], then nudgeParty, then control at [131,52].
  const route = committedRouteReceipt({
    id: 0,
    engine: 'reforge',
    startOrder: 88,
    endOrder: 154,
    scene: 's003',
    ready: true,
    end: { scene: 's003', position: [131, 52, 0], runtime: { dialogue: null } },
    trace: {
      overflow: false,
      errors: [],
      events: [
        move(99, 'commit:player.input', [121, 49, 0], [122, 49, 0]),
        move(102, 'commit:nudgeParty', [122, 49, 0], [122.9375, 49.3125, 0]),
        move(153, 'commit:nudgeParty', [130.75, 51.75, 0], [131, 52, 0]),
        move(160, 'commit:player.input', [131, 52, 0], [131, 53, 0]),
      ],
    },
  })
  assert.equal(route.steps.length, 1)
  assert.deepEqual(route.steps[0].to, [122, 49, 0])
  assert.equal(route.steps[0].key, 'ArrowRight')
  assert.deepEqual(route.completion, { scene: 's003', position: [131, 52, 0], mode: 'ready' })
  const actions = continuousStoryActions({
    case: 'story',
    route: { legs: [{ replay: route }] },
    actions: [
      { kind: 'down', key: 'ArrowRight', atMs: 1, routeId: 0, phase: 'stairs' },
      { kind: 'up', key: 'ArrowRight', atMs: 2, routeId: 0, phase: 'stairs' },
      { key: 'Enter', atMs: 3, phase: 'stairs', reason: 'normal interaction' },
    ],
  })
  assert.equal(actions[0].routeReplay.id, 0)
  assert.equal(actions[1].routeReplay.id, 0)
  assert.equal(actions[2].routeReplay, undefined, 'same phase must not swallow dialogue/menu input')
  assert.deepEqual(continuousPlaybackActions(actions), [actions[0], actions[2]])
})

test('mount-derived player position writes are not replayed as direction-key steps', () => {
  const route = committedRouteReceipt({
    id: 10,
    engine: 'reforge',
    startOrder: 0,
    endOrder: 3,
    scene: 's005',
    ready: true,
    end: { scene: 's014', position: [74, 27, 0] },
    trace: {
      overflow: false,
      errors: [],
      events: [
        { ...move(1, 'commit:player.input', [126, 55, 0], [126, 54, 0]), scene: 's005' },
        { ...move(2, 'commit:player.pos', [126, 54, 0], [126, 53.75, 0]), scene: 's005' },
      ],
    },
  })
  assert.equal(route.steps.length, 1)
  assert.deepEqual(route.steps[0].to, [126, 54, 0])
  assert.deepEqual(route.completion, { scene: 's014', position: [74, 27, 0], mode: 'ready' })
})

test('a route crossing a scene is consumed once, without checking its old-scene turn inputs again', () => {
  const route = { id: 3, completion: { scene: 's001', position: [100, 59, 0], mode: 'ready' } }
  const inputs = [
    { kind: 'down', key: 'ArrowLeft', scene: 's003', routeId: 3, routeReplay: route },
    { kind: 'up', key: 'ArrowLeft', scene: 's003', routeId: 3, routeReplay: route },
    { kind: 'down', key: 'ArrowUp', scene: 's003', routeId: 3, routeReplay: route },
    { kind: 'up', key: 'ArrowUp', scene: 's003', routeId: 3, routeReplay: route },
    { kind: 'press', key: 'Escape', reason: 'open item menu' },
  ]
  assert.deepEqual(continuousPlaybackActions(inputs), [inputs[0], inputs[4]])
})

const browser = () => {
  const host = {}
  new Function('globalThis', `(${installCommittedRoutePlayback.toString()})()`)(host)
  const point = (position, { source = 'commit:player.input', ready = true, scene = 's003' } = {}) =>
    host.__routeObserve(source, {
      scene,
      actors: { party: { position } },
      routeReady: ready,
      routeDialogue: false,
    })
  const evaluate = (fn, arg) =>
    new Function('window', 'arg', `return (${fn.toString()})(arg)`)(host, arg)
  return { host, point, evaluate }
}

test('page closure during route failure preserves the original failure and still attempts key release', async (t) => {
  const { host, evaluate, point } = browser(),
    calls = []
  t.after(() => host.__routeCancel())
  const original = new Error('keydown partially delivered'),
    cleanup = new Error('page closed')
  point([1, 2, 0])
  await assert.rejects(
    replayCommittedRoute({
      page: {
        evaluate: (fn, arg) => {
          if (fn.toString().includes('__routeCancel')) throw cleanup
          return evaluate(fn, arg)
        },
        keyboard: {
          down: async () => {
            calls.push('down')
            throw original
          },
          up: async () => {
            calls.push('up')
          },
        },
      },
      route: {
        steps: [
          {
            scene: 's003',
            source: 'commit:player.input',
            key: 'ArrowRight',
            from: [1, 2, 0],
            to: [2, 2, 0],
          },
        ],
        completion: { scene: 's003', position: [2, 2, 0], mode: 'ready' },
      },
    }),
    (error) =>
      error instanceof AggregateError &&
      error.message.includes(original.message) &&
      error.message.includes(cleanup.message) &&
      error.errors[0] === original &&
      error.errors[1] === cleanup,
  )
  assert.deepEqual(calls, ['down', 'up'])
})

test('an already-triggered serving dialogue needs no invented movement; missing input evidence still fails', () => {
  const observation = {
    id: 5,
    engine: 'game',
    startOrder: 445,
    endOrder: 454,
    scene: 's001',
    ready: false,
    inputCount: 0,
    end: { scene: 2, position: [1248, 1104], dialog: { phase: 'printing' } },
    trace: { overflow: false, errors: [], events: [] },
  }
  const route = committedRouteReceipt(observation)
  assert.deepEqual(route.steps, [])
  assert.deepEqual(route.completion, { scene: 's001', position: [1248, 1104], mode: 'dialogue' })
  assert.deepEqual(
    continuousPlaybackActions(
      continuousStoryActions({
        route: { inputs: [], legs: [{ replay: route }] },
        actions: [{ key: 'Enter', reason: 'normal full-dialogue confirmation' }],
      }),
    ),
    [{ kind: 'press', key: 'Enter', reason: 'normal full-dialogue confirmation' }],
  )
  assert.throws(
    () => committedRouteReceipt({ ...observation, inputCount: 2 }),
    /inputs have no player position commits/,
  )
})

test('event replay holds a straight line once and awaits exact control restoration after script movement', async () => {
  const { host, point, evaluate } = browser(),
    keys = []
  const route = {
    steps: [
      {
        scene: 's003',
        source: 'commit:player.input',
        key: 'ArrowLeft',
        from: [126, 46, 0],
        to: [125, 46, 0],
      },
      {
        scene: 's003',
        source: 'commit:player.input',
        key: 'ArrowLeft',
        from: [125, 46, 0],
        to: [124, 46, 0],
      },
      {
        scene: 's003',
        source: 'commit:player.input',
        key: 'ArrowDown',
        from: [124, 46, 0],
        to: [124, 47, 0],
      },
    ],
    completion: { scene: 's003', position: [131, 52, 0], mode: 'ready' },
  }
  point([126, 46, 0])
  const page = {
    evaluate,
    keyboard: {
      down: async (key) => {
        keys.push(`down:${key}`)
        point(key === 'ArrowLeft' ? [126, 46, 0] : [124, 46, 0], { source: 'commit:player.facing' })
        for (const step of route.steps.filter((s) => s.key === key)) point(step.to)
        if (key === 'ArrowDown') {
          point([124.9375, 47.3125, 0], { source: 'commit:nudgeParty', ready: false })
          point([131, 52, 0], { source: 'commit:nudgeParty', ready: false })
        }
      },
      up: async (key) => {
        keys.push(`up:${key}`)
      },
    },
  }
  let done = false
  const run = replayCommittedRoute({ page, route }).then(() => {
    done = true
  })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(done, false, 'coordinate alone is not script completion')
  point([131, 52, 0], { source: 'render:world', ready: true })
  await run
  assert.deepEqual(keys, ['down:ArrowLeft', 'up:ArrowLeft', 'down:ArrowDown', 'up:ArrowDown'])
  // Already delivered endpoint is checked at registration too, without waiting for another move.
  host.__routeArm({ kind: 'end', target: route.completion })
  assert((await host.__routeWait()).value.ready)
  host.__routeCancel()
})

test('wrong position fails on the first commit, releases the held key, and does not reroute', async () => {
  const { point, evaluate } = browser(),
    keys = []
  point([121, 49, 0])
  await assert.rejects(
    replayCommittedRoute({
      page: {
        evaluate,
        keyboard: {
          down: async (key) => {
            keys.push(`down:${key}`)
            point([123, 49, 0])
          },
          up: async (key) => {
            keys.push(`up:${key}`)
          },
        },
      },
      route: {
        steps: [
          {
            scene: 's003',
            source: 'commit:player.input',
            key: 'ArrowRight',
            from: [121, 49, 0],
            to: [122, 49, 0],
          },
        ],
      },
    }),
    /first divergence/,
  )
  assert.deepEqual(keys, ['down:ArrowRight', 'up:ArrowRight'])
})

test('a transient endpoint is not a final receipt after its position or readiness changes', async () => {
  for (const drift of ['position', 'ready']) {
    const { host, point } = browser()
    point([3, 0, 0], { ready: false })
    host.__routeArm({
      kind: 'end',
      target: { scene: 's003', position: [3, 0, 0], mode: 'ready' },
    })
    point([3, 0, 0])
    assert((await host.__routeWait()).value.ready)
    point(drift === 'position' ? [4, 0, 0] : [3, 0, 0], {
      ready: drift !== 'ready',
      source: 'commit:script',
    })
    assert.match(host.__routeFinalize().error, /end target no longer holds/)
  }
})

test('arrival guard rejects extra player commits before release, even if they return to the target', async () => {
  for (const during of ['down', 'up', 'finalize']) {
    const { point, evaluate } = browser(),
      keys = []
    const extra = () => {
      point([123, 49, 0])
      point([122, 49, 0])
    }
    point([121, 49, 0])
    await assert.rejects(
      replayCommittedRoute({
        page: {
          evaluate: (fn, arg) => {
            if (during === 'finalize' && fn.toString().includes('__routeFinalize')) extra()
            return evaluate(fn, arg)
          },
          keyboard: {
            down: async () => {
              keys.push('down')
              point([122, 49, 0])
              if (during === 'down') extra()
            },
            up: async () => {
              keys.push('up')
              if (during === 'up') extra()
            },
          },
        },
        route: {
          steps: [
            {
              scene: 's003',
              source: 'commit:player.input',
              key: 'ArrowRight',
              from: [121, 49, 0],
              to: [122, 49, 0],
            },
          ],
          completion: { scene: 's003', position: [122, 49, 0], mode: 'ready' },
        },
      }),
      /extra player commit before release/,
    )
    assert.deepEqual(keys, ['down', 'up'])
  }
})

test('facing input is recorded and consumed as one event-driven hold, without inventing an interaction move', async () => {
  const inputs = [],
    keys = [],
    { host, evaluate } = browser()
  const state = { scene: 's005', position: [124, 61, 0], facing: 'down' }
  const observe = () =>
    host.__routeObserve('commit:player.facing', {
      scene: state.scene,
      actors: { party: { position: state.position, facing: state.facing } },
      routeReady: true,
      routeDialogue: false,
    })
  const page = {
    evaluate,
    keyboard: {
      down: async (key) => {
        keys.push(`down:${key}`)
        state.facing = 'up'
        observe()
      },
      up: async (key) => {
        keys.push(`up:${key}`)
      },
    },
  }
  observe()
  await recordFacingInput({
    id: 'face:1',
    engine: 'reforge',
    page,
    key: 'ArrowUp',
    facing: 'up',
    read: async () => state,
    onInput: (input) => inputs.push(input),
  })
  assert.deepEqual(
    inputs.map(({ kind, key }) => ({ kind, key })),
    [
      { kind: 'down', key: 'ArrowUp' },
      { kind: 'up', key: 'ArrowUp' },
    ],
  )
  const actions = continuousPlaybackActions(continuousStoryActions({ actions: inputs }))
  assert.equal(actions.length, 1)
  assert.deepEqual(actions[0].holdTarget, { scene: 's005', position: [124, 61, 0], facing: 'up' })
  state.facing = 'down'
  observe()
  await replayFacingInput(page, actions[0])
  assert.deepEqual(keys, ['down:ArrowUp', 'up:ArrowUp', 'down:ArrowUp', 'up:ArrowUp'])
})

test('recordings without authoritative route receipts fail closed instead of replaying sampled positions', () => {
  assert.throws(
    () =>
      continuousStoryActions({
        route: {
          inputs: [{ kind: 'down', key: 'ArrowRight', atMs: 10 }],
          steps: [{ from: [121, 49, 0], to: [122.9375, 49.3125, 0] }],
        },
      }),
    /requires committed receipt/,
  )
})

test('facing is anchored before input and rejects movement, scene revisits and a reverted pose', async () => {
  for (const mutation of ['position', 'visit', 'facing']) {
    const { host, evaluate } = browser(),
      actions = []
    let position = [124, 61, 0],
      sceneVisit = 1,
      facing = 'down'
    const observe = () =>
      host.__routeObserve('commit:player.facing', {
        scene: 's005',
        sceneVisit,
        actors: { party: { position, facing } },
      })
    observe()
    await assert.rejects(
      recordFacingInput({
        id: 'face',
        engine: 'reforge',
        key: 'ArrowUp',
        facing: 'up',
        read: async () => ({ scene: 's005', position, facing }),
        onInput: (action) => actions.push(action),
        page: {
          evaluate,
          keyboard: {
            down: async () => {
              facing = 'up'
              if (mutation === 'position') position = [125, 61, 0]
              else if (mutation === 'visit') sceneVisit++
              else {
                observe()
                facing = 'down'
              }
              observe()
            },
            up: async () => {},
          },
        },
      }),
      /moved or changed scene visit|target no longer holds/,
    )
    assert.deepEqual(
      actions.map((a) => a.kind),
      ['down', 'up'],
    )
    assert.deepEqual(actions[0].holdTarget.position, [124, 61, 0])
  }
})
