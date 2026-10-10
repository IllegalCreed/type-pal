import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  canonicalPosition,
  compareNpcStateTraces,
  invisibleInitialFacingProjection,
  movementCadence,
  movementFrameEvidence,
  movementFrameParity,
  movementTransitions,
  readNpcTrace,
  renderedPoseEvidence,
  tracePartyContactEvents,
} from './npc-transition-contract.mjs'

const actor = (order, id, position, before, extra = {}) => ({
  kind: 'actor',
  order,
  atMs: order * 100,
  tick: order,
  sceneVisit: 1,
  scene: 's003',
  source: 'observed:commit',
  id,
  before,
  state: { position, visible: true, state: 2, facing: 'down', ...extra },
})

test('canonical positions compare pixel and tile coordinates in one space', () => {
  assert.deepEqual(canonicalPosition([1264, 1096]), canonicalPosition([108, 29, 0]))
})

test('invisible initial facing certificate requires a complete offscreen prefix and common pose', () => {
  const state = (facing) => ({
    position: [20, 30, 0],
    facing,
    visible: true,
    state: 2,
    frame: 0,
    sprite: 127,
  })
  const gameTransitions = [
    { order: 1, source: 'commit:scene-materialized', state: state('down') },
    { order: 5, source: 'commit:applyRawOpcode', state: state('right') },
  ]
  const reforgeTransitions = [{ order: 2, source: 'observe:causal', state: state('right') }]
  const offscreen = (facing, order) => ({
    facing,
    order,
    screenVisible: false,
    drawStatus: 'not-drawn',
  })
  const proof = invisibleInitialFacingProjection({
    id: 'e128',
    gameTransitions,
    reforgeTransitions,
    gameRenders: [offscreen('down', 3), offscreen('down', 4)],
    reforgeRenders: [offscreen('right', 6)],
  })
  assert.equal(proof.type, 'invisible-initial-facing-projection')
  for (const mutate of [
    (value) => {
      value.gameRenders[0].screenVisible = true
    },
    (value) => {
      value.gameTransitions.pop()
    },
    (value) => {
      value.reforgeTransitions[0].state.position = [21, 30, 0]
    },
    (value) => {
      value.reforgeRenders[0].screenVisible = true
    },
  ]) {
    const candidate = {
      id: 'e128',
      gameTransitions: structuredClone(gameTransitions),
      reforgeTransitions: structuredClone(reforgeTransitions),
      gameRenders: [offscreen('down', 3), offscreen('down', 4)],
      reforgeRenders: [offscreen('right', 6)],
    }
    mutate(candidate)
    assert.equal(invisibleInitialFacingProjection(candidate), null)
  }
})

test('001 report reader retains scene-ready boundaries before classifying author movement', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'pal-opening-reader-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const reportPath = join(dir, 'report.json')
  const a = (order, position, before) => ({
    ...actor(order, 'e10', position, before),
    scene: 's001',
  })
  await writeFile(
    reportPath,
    JSON.stringify({
      fragment: '001',
      storyScope: { start: { afterOrder: -1 }, end: { afterOrder: 7 } },
      matrix: {
        errors: ['collector lost receipt'],
        overflow: true,
        actors: [
          { kind: 'scene', order: 0, scene: 's001', sceneVisit: 1 },
          a(1, [0, 0, 0], null),
          a(3, [60, -23, 0], { position: [0, 0, 0] }),
          a(6, [60, -22.625, 0], { position: [60, -23, 0] }),
        ],
        lifecycle: [
          { kind: 'scene-lifecycle', phase: 'ready', order: 4, scene: 's001', sceneVisit: 1 },
        ],
        renders: [],
        pages: [],
        worldRenders: [],
        controls: [{ kind: 'control', order: 7, scene: 's001', sceneVisit: 1, state: false }],
      },
    }),
  )
  const { trace } = await readNpcTrace(reportPath)
  assert.deepEqual(trace.errors, ['collector lost receipt'])
  assert.equal(trace.overflow, true)
  assert.deepEqual(
    compareNpcStateTraces(trace, trace, '001')
      .findings.filter((e) => e.field === 'collector-integrity')
      .map((e) => e.engine),
    ['game', 'reforge'],
  )
  assert.equal(trace.events.find((event) => event.kind === 'scene-lifecycle')?.order, 4)
  assert.deepEqual(
    movementTransitions(trace, 'e10').map(({ from, to }) => ({ from, to })),
    [{ from: [60, -23], to: [60, -22.625] }],
  )
  const baseline = trace.events.find((event) => event.kind === 'actor')
  assert.equal(baseline.before, null)
  assert.deepEqual(baseline.state.position, [60, -23, 0])
})

function openingTerminalFixture(split) {
  const rows = split ? [-12.875, -12.5, -12.125, -12] : [-12.875, -12.5, -12],
    frames = split ? [2, 0, 1, 0] : [2, 0, 0],
    worldRenders = [],
    events = []
  for (const [index, row] of rows.entries()) {
    const state = {
      ...actor(
        index * 10,
        'e10',
        [60, row, 0],
        index ? { position: [60, rows[index - 1], 0] } : null,
        { sprite: 'sprite-21' },
      ),
      scene: 's001',
      tick: index,
    }
    events.push(state)
    for (const offset of [1, 3]) {
      const clock = {
        kind: 'world-render',
        order: state.order + offset,
        renderId: worldRenders.length + 1,
        scene: 's001',
        sceneVisit: 1,
        tick: index,
        atMs: index * 100 + offset,
        view: { camera: [1100, 300], canvasSize: [320, 200], transform: [1, 0, 0, 1, 0, 0] },
      }
      worldRenders.push(clock)
      events.push({
        ...state,
        ...clock,
        order: clock.order + 1,
        kind: 'actor-render',
        source: 'render:world',
        state: {
          ...state.state,
          frame: frames[index],
          frameSource: 'drawn',
          drawStatus: 'drawn',
          geometry: { worldRect: [16 * (60 - row) - 10, 8 * (60 + row) + 7 - 47, 20, 47] },
        },
      })
    }
  }
  return { events, worldRenders }
}

test('approved opening final half-cell is a local alignment, not an actor exemption', () => {
  const game = openingTerminalFixture(false),
    reforge = openingTerminalFixture(true),
    before = structuredClone([game, reforge]),
    compare = (candidate) => compareNpcStateTraces(game, candidate, '001')
  const result = compare(reforge)
  assert.equal(result.acceptedDifferences.length, 1)
  assert(
    !result.findings.some(
      ({ id, field }) =>
        id === 'e10' &&
        ['movement-leg-alignment', 'rendered-pose', 'movement-frame'].includes(field),
    ),
  )
  assert.deepEqual(
    [game, reforge],
    before,
    'approval must not edit, drop or shift original evidence',
  )

  const laterPose = structuredClone(reforge)
  laterPose.events.at(-1).state.frame = 2
  assert.equal(
    compare(laterPose).acceptedDifferences.length,
    1,
    'later frames are outside the local approval',
  )
  assert(
    compare(laterPose).findings.some(({ id, field }) => id === 'e10' && field === 'rendered-pose'),
  )
})

function openingViewportFixture(split) {
  const trace = openingTerminalFixture(split)
  const end = trace.events.filter((event) => event.kind === 'actor').at(-1)
  for (const step of [1, 2]) {
    const state = structuredClone(end)
    state.order += step * 10
    state.tick += step
    state.before = structuredClone(end.state)
    state.state.visible = step === 1
    trace.events.push(state)
    for (const offset of [1, 3]) {
      const clock = {
        kind: 'world-render',
        order: state.order + offset,
        renderId: trace.worldRenders.length + 1,
        scene: 's001',
        sceneVisit: 1,
        tick: state.tick,
        atMs: state.tick * 100 + offset,
      }
      trace.worldRenders.push(clock)
      trace.events.push({
        ...state,
        ...clock,
        order: clock.order + 1,
        kind: 'actor-render',
        source: 'render:world',
        state: { ...state.state, frame: 0, frameSource: 'drawn', drawStatus: 'drawn' },
      })
    }
  }
  for (const clock of trace.worldRenders) {
    const scale = split ? 4 : 1
    clock.view = {
      camera: { x: 1152 + clock.tick * 4, y: 176 + Math.min(clock.tick, 3) * 2 },
      canvasSize: [320 * scale, 200 * scale],
      transform: [scale, 0, 0, scale, 0, 0],
      pixelRounding: 'unrounded',
    }
  }
  for (const event of trace.events.filter((e) => e.kind === 'actor-render')) {
    const clock = trace.worldRenders.find((row) => row.renderId === event.renderId)
    event.throughRenderId = event.renderId
    event.throughOrder = clock.order
    event.throughAtMs = clock.atMs
    const [col, row] = event.state.position
    event.state.geometry = { worldRect: [(col - row) * 16 - 10, (col + row) * 8 - 40, 20, 47] }
    if (!event.state.visible || (!split && event.tick > end.tick)) {
      event.state.frame = null
      event.state.frameSource = 'none'
      event.state.drawStatus = 'not-drawn'
      if (!event.state.visible) event.state.geometry = null
    }
  }
  return trace
}

test('approved extra terminal tick explains clipping only with matching geometry and an intact stable tail', () => {
  const game = openingViewportFixture(false),
    reforge = openingViewportFixture(true)
  const compare = (r) => compareNpcStateTraces(game, r, '001')
  const poseIssues = (r) =>
    compare(r).findings.filter(
      (x) =>
        x.id === 'e10' &&
        [
          'rendered-pose',
          'movement-frame',
          'movement-leg-alignment',
          'render-evidence-source',
          'visible',
          'facing',
        ].includes(x.field),
    )
  assert.equal(poseIssues(reforge).length, 0)
  for (const [label, mutate] of [
    [
      'wrong camera',
      (t) => {
        t.worldRenders.find((x) => x.tick === 3).view.camera.x += 10
      },
    ],
    [
      'missing view',
      (t) => {
        delete t.worldRenders.find((x) => x.tick === 3).view
      },
    ],
    [
      'wrong intermediate camera',
      (t) => {
        t.worldRenders.find((x) => x.tick === 2).view.camera.x += 4
      },
    ],
    [
      'wrong endpoint geometry',
      (t) => {
        t.events.find(
          (x) => x.kind === 'actor-render' && x.tick === 3,
        ).state.geometry.worldRect[0] -= 4
      },
    ],
    [
      'offscreen flash',
      (t) => {
        t.events.find((x) => x.kind === 'actor-render' && x.tick === 4).state.frame = 2
      },
    ],
    [
      'early hide',
      (t) => {
        for (const e of t.events.filter((x) => x.tick === 4)) e.state.visible = false
      },
    ],
    [
      'missing hide',
      (t) => {
        for (const e of t.events.filter((x) => x.tick === 5)) e.state.visible = true
      },
    ],
    [
      'missing final visible draw',
      (t) => {
        t.events = t.events.filter((e) => !(e.kind === 'actor-render' && e.renderId === 10))
      },
    ],
    [
      'missing first hidden draw',
      (t) => {
        t.events = t.events.filter((e) => !(e.kind === 'actor-render' && e.renderId === 11))
      },
    ],
    [
      'hidden in another scene visit',
      (t) => {
        for (const e of [...t.events, ...t.worldRenders].filter((e) => e.tick === 5)) {
          e.sceneVisit = 2
          if (e.kind === 'actor') e.before = null
        }
      },
    ],
  ]) {
    const candidate = structuredClone(reforge)
    mutate(candidate)
    assert(poseIssues(candidate).length > 0, label)
  }
})

for (const [label, change] of [
  [
    'intermediate flash',
    (trace) => {
      trace.events.find(
        (event) => event.kind === 'actor-render' && event.order === 24,
      ).state.frame = 2
    },
  ],
  [
    'missing intermediate draw',
    (trace) => {
      trace.events = trace.events.filter(
        (event) => !(event.kind === 'actor-render' && event.order === 22),
      )
    },
  ],
  [
    'missing world clock',
    (trace) => {
      trace.worldRenders = trace.worldRenders.filter((clock) => clock.order !== 23)
    },
  ],
  [
    'matching draw and clock holes',
    (trace) => {
      trace.events = trace.events.filter((event) => event.order !== 24)
      trace.worldRenders = trace.worldRenders.filter((clock) => clock.order !== 23)
    },
  ],
  [
    'wrong endpoint',
    (trace) => {
      for (const event of trace.events.filter((event) => event.order >= 30))
        event.state.position[1] += 0.125
    },
  ],
  [
    'extra tick',
    (trace) => {
      for (const event of [...trace.events, ...trace.worldRenders])
        if (event.order >= 30) event.tick++
    },
  ],
  [
    'different scene visit',
    (trace) => {
      for (const event of [...trace.events, ...trace.worldRenders])
        if (event.order >= 20) event.sceneVisit++
    },
  ],
  [
    'changed height',
    (trace) => {
      for (const event of trace.events.filter((event) => event.order >= 20))
        event.state.position[2] = 1
    },
  ],
  [
    'changed sprite',
    (trace) => {
      trace.events.find((event) => event.kind === 'actor' && event.order === 20).state.sprite =
        'sprite-22'
    },
  ],
])
  test(`opening terminal approval rejects ${label}`, () => {
    const game = openingTerminalFixture(false),
      trace = openingTerminalFixture(true)
    change(trace)
    const result = compareNpcStateTraces(game, trace, '001')
    assert.deepEqual(result.acceptedDifferences, [], label)
    assert(
      result.violations.some(({ id, field }) => id === 'e10' && field === 'movement-leg-alignment'),
      label,
    )
  })

test('equal frame numbers cannot pass when either side lacks actual draw evidence', () => {
  const baseline = {
    events: [
      actor(1, 'e56', [124, 45, 0], null, { frame: 9, sprite: 55 }),
      {
        ...actor(2, 'e56', [124, 45, 0], null, {
          frame: 9,
          frameSource: 'drawn',
          drawStatus: 'drawn',
        }),
        kind: 'actor-render',
        source: 'render:world',
      },
    ],
  }
  const gaps = (a, b) =>
    compareNpcStateTraces(a, b, '002').findings.filter(
      ({ id, field }) => id === 'e56' && field === 'render-evidence-source',
    )
  assert.deepEqual(gaps(baseline, baseline), [])
  const selected = structuredClone(baseline)
  Object.assign(selected.events[1].state, {
    frameSource: 'selected',
    drawStatus: 'world-pass-only',
  })
  for (const [a, b] of [
    [baseline, selected],
    [selected, baseline],
    [selected, selected],
  ])
    assert.equal(gaps(a, b).length, 1)
  assert.equal(gaps(baseline, { events: [baseline.events[0]] }).length, 1)
  const absent = structuredClone(baseline)
  Object.assign(absent.events[1].state, {
    frame: null,
    frameSource: 'none',
    drawStatus: 'not-drawn',
  })
  assert.deepEqual(
    gaps(absent, absent),
    [],
    'an explicitly absent draw differs from missing instrumentation',
  )
})

test('animation comparison uses drawn frames, not direction-local state indices', () => {
  const make = (localStateFrames) => ({
    events: [
      ['up', 6],
      ['down', 0],
      ['up', 6],
    ].flatMap(([facing, frame], index) => {
      const state = actor(index * 2 + 1, 'e56', [124, 45, 0], null, {
        facing,
        frame: localStateFrames ? 0 : frame,
        sprite: 55,
      })
      return [
        state,
        {
          ...state,
          order: state.order + 1,
          kind: 'actor-render',
          source: 'render:world',
          state: { ...state.state, frame, frameSource: 'drawn', drawStatus: 'drawn' },
        },
      ]
    }),
  })
  const game = make(true),
    reforge = make(false),
    findings = (candidate) =>
      compareNpcStateTraces(game, candidate, '002').findings.filter(
        ({ id, field }) => id === 'e56' && field !== 'render-hold-attribution',
      )
  assert.deepEqual(findings(reforge), [])
  // The state indices remain unchanged; an actual wrong drawn frame must still fail.
  reforge.events[3].state.frame = 1
  assert.deepEqual(
    findings(reforge).map(({ type, field }) => [type, field]),
    [['actor-render-sequence', 'rendered-pose']],
  )
})

test('screen culling is separate from draw-call evidence', () => {
  const make = (drawStatus) => ({
    worldRenders: [
      {
        kind: 'world-render',
        scene: 's003',
        sceneVisit: 1,
        renderId: 1,
        order: 1,
        atMs: 1,
        tick: 1,
        view: {
          camera: { x: 200, y: 0 },
          canvasSize: [320, 200],
          transform: [1, 0, 0, 1, 0, 0],
          pixelRounding: 'unrounded',
        },
      },
    ],
    events: [
      {
        ...actor(1, 'e56', [124, 45, 0], null, {
          frame: drawStatus === 'drawn' ? 6 : null,
          frameSource: drawStatus === 'drawn' ? 'drawn' : 'none',
          drawStatus,
          geometry: { worldRect: [110, 20, 8, 8] },
        }),
        kind: 'actor-render',
        source: 'render:world',
        renderId: 1,
        throughRenderId: 1,
        throughOrder: 1,
        throughAtMs: 1,
        atMs: 1,
        tick: 1,
      },
    ],
  })
  assert.equal(renderedPoseEvidence(make('not-drawn'), 'e56', 's003')[0].screenVisible, false)
  assert.equal(renderedPoseEvidence(make('drawn'), 'e56', 's003')[0].screenVisible, false)
})

test('equal movement and frames do not conceal a translated NPC route', () => {
  const make = (offset, pixels = false) => ({
    events: [0, 0.25, 0.5].flatMap((delta, index) => {
      const position = (x) => (pixels ? [16 * (x - 45), 8 * (x + 45)] : [x, 45, 0]),
        move = actor(
          index * 2,
          'e56',
          position(124 + delta + offset),
          index ? { position: position(124 + delta - 0.25 + offset) } : null,
          { frame: index, sprite: 55 },
        )
      return [
        move,
        { ...move, order: move.order + 1, kind: 'actor-render', source: 'render:world' },
      ]
    }),
  })
  const findings = (candidate) =>
    compareNpcStateTraces(make(0, true), candidate, '002').findings.filter(
      ({ id, type }) => id === 'e56' && type === 'actor-position-boundary',
    )
  assert.deepEqual(findings(make(0)), [])
  assert.deepEqual(
    findings(make(1)).map(({ boundary, game, reforge }) => ({ boundary, game, reforge })),
    [
      { boundary: 'initial', game: [124, 45], reforge: [125, 45] },
      { boundary: 'final', game: [124.5, 45], reforge: [125.5, 45] },
    ],
  )
})

test('a move before scene exit cannot borrow a render from the next visit', () => {
  const move = actor(1, 'e56', [124.25, 45, 0], { position: [124, 45, 0] }, { frame: 10 }),
    render = { ...move, kind: 'actor-render', source: 'render:world' },
    events = [
      move,
      { kind: 'scene', order: 2, scene: 's001' },
      { kind: 'scene', order: 3, scene: 's003' },
      { ...render, order: 4 },
    ]
  assert.equal(movementFrameEvidence({ events }, 'e56', 's003')[0].frame, null)
  // The same position really presented before leaving remains valid evidence.
  events.splice(1, 0, { ...render, order: 1.5 })
  assert.equal(movementFrameEvidence({ events }, 'e56', 's003')[0].renderOrder, 1.5)
})

test('a new scene visit baseline is not a movement commit from an earlier visit', () => {
  const events = [
    { ...actor(1, 'e56', [124, 45, 0], null), sceneVisit: 1 },
    { kind: 'scene', order: 2, scene: 's001', sceneVisit: 2 },
    { kind: 'scene', order: 3, scene: 's003', sceneVisit: 3 },
    { ...actor(4, 'e56', [125, 45, 0], null), sceneVisit: 3 },
    {
      ...actor(5, 'e56', [125.25, 45, 0], { position: [125, 45, 0] }),
      sceneVisit: 3,
    },
  ]
  assert.deepEqual(
    movementTransitions({ events }, 'e56').map(({ order }) => order),
    [5],
  )
})

test('render evidence retains stationary holds and their original clocks', () => {
  const events = [
    { atMs: 100, tick: 1, renderId: 1 },
    { atMs: 800, tick: 8, renderId: 2 },
  ].map((clocks, index) => ({
    ...actor(index + 1, 'e56', [124, 45, 0], null, { frame: 9 }),
    kind: 'actor-render',
    source: 'render:world',
    sceneVisit: 1,
    ...clocks,
  }))
  assert.deepEqual(
    renderedPoseEvidence({ events }, 'e56', 's003').map((event) => ({
      order: event.order,
      atMs: event.atMs,
      tick: event.tick,
      renderId: event.renderId,
      sceneVisit: event.sceneVisit,
      position: event.position,
      frame: event.frame,
    })),
    events.map((event) => ({
      order: event.order,
      atMs: event.atMs,
      tick: event.tick,
      renderId: event.renderId,
      sceneVisit: event.sceneVisit,
      position: [124, 45],
      frame: 9,
    })),
  )
})

test('lossless render spans expand through each actual world draw and reject missing clocks', () => {
  const worldRenders = [
    { order: 10, renderId: 1, atMs: 100, tick: 1 },
    { order: 12, renderId: 2, atMs: 116, tick: 1 },
    { order: 13, renderId: 3, atMs: 200, tick: 2 },
  ].map((clock) => ({ ...clock, kind: 'world-render', sceneVisit: 1, scene: 's003' }))
  const events = [
    {
      ...actor(11, 'e56', [124, 45, 0], null, { frame: 9 }),
      kind: 'actor-render',
      source: 'render:world',
      renderId: 1,
      tick: 1,
      atMs: 100,
      throughRenderId: 3,
      throughAtMs: 200,
      throughOrder: 13,
    },
  ]
  assert.deepEqual(
    renderedPoseEvidence({ events, worldRenders }, 'e56').map(
      ({ order, renderId, atMs, tick }) => ({ order, renderId, atMs, tick }),
    ),
    [
      { order: 11, renderId: 1, atMs: 100, tick: 1 },
      { order: 12, renderId: 2, atMs: 116, tick: 1 },
      { order: 13, renderId: 3, atMs: 200, tick: 2 },
    ],
  )
  assert.throws(
    () => renderedPoseEvidence({ events, worldRenders: [worldRenders[0], worldRenders[2]] }, 'e56'),
    /incomplete render span/,
  )
})

test('hold duration keeps elapsed draws separate from engine-local tick counters', () => {
  const make = () => ({
    events: [9, 10, 9, 11, 9].flatMap((frame, index) => {
      const move = {
        ...actor(
          index * 2,
          'e56',
          [124 + index / 4, 45, 0],
          index ? { position: [124 + (index - 1) / 4, 45, 0] } : null,
          { frame, facing: 'right', sprite: 55 },
        ),
        sceneVisit: 1,
        tick: index,
        atMs: index * 100,
      }
      return [
        move,
        {
          ...move,
          kind: 'actor-render',
          source: 'render:world',
          order: move.order + 1,
          renderId: index + 1,
        },
      ]
    }),
  })
  const baseline = make(),
    delayed = make(),
    rephased = make(),
    sameTicksDelayed = make()
  for (const event of delayed.events)
    if (event.tick >= 2) {
      event.tick += 7
      event.atMs += 700
    }
  for (const event of rephased.events) if (event.tick >= 2) event.tick += 1
  for (const event of sameTicksDelayed.events) if (event.tick >= 2) event.atMs += 17
  const holds = (trace) =>
    compareNpcStateTraces(baseline, trace, '002').findings.filter(
      ({ id, field }) => id === 'e56' && field.startsWith('render-hold'),
    )
  for (const candidate of [baseline, rephased]) {
    const gaps = holds(candidate)
    assert.equal(gaps.length, 1, 'equal observed duration does not prove authored/input timing')
    assert.equal(gaps[0].field, 'render-hold-attribution')
    assert.deepEqual(
      gaps[0].reforge.map(({ elapsedMs }) => elapsedMs),
      [100, 100, 100],
    )
  }
  const findings = holds(delayed)
  assert.equal(findings.length, 1)
  assert.equal(findings[0].type, 'evidence-gap')
  assert.equal(findings[0].field, 'render-hold-attribution')
  assert.deepEqual(
    findings[0].game.map(({ elapsedMs }) => elapsedMs),
    [100, 100, 100],
  )
  assert.deepEqual(
    findings[0].reforge.map(({ elapsedMs }) => elapsedMs),
    [800, 100, 100],
  )
  const hiddenByTicks = holds(sameTicksDelayed)
  assert.equal(hiddenByTicks.length, 1, 'equal ticks cannot conceal a different draw duration')
  assert.equal(hiddenByTicks[0].reforge[0].elapsedMs, 117)
  assert.equal(hiddenByTicks[0].reforge[0].ticks, 1)
  const wrongFrame = structuredClone(sameTicksDelayed)
  wrongFrame.events.find(
    (event) => event.kind === 'actor-render' && event.order === 3,
  ).state.frame = 7
  const wrong = compareNpcStateTraces(baseline, wrongFrame, '002').findings.filter(
    ({ id }) => id === 'e56',
  )
  assert(wrong.some(({ field }) => field === 'render-hold-attribution'))
  assert(wrong.some(({ field }) => field === 'rendered-pose'))
})

test('different intermediate move samples require semantic leg alignment instead of global nth-frame matching', () => {
  const make = (positions) => ({
    events: positions.flatMap((col, index) => {
      const move = actor(
        index * 2,
        'e56',
        [col, 45, 0],
        index ? { position: [positions[index - 1], 45, 0] } : null,
        { frame: index % 3, sprite: 55 },
      )
      return [
        move,
        { ...move, kind: 'actor-render', source: 'render:world', order: move.order + 1 },
      ]
    }),
  })
  const findings = compareNpcStateTraces(
    make([124, 124.5, 125]),
    make([124, 124.375, 124.75, 125]),
    '002',
  ).findings.filter(({ id }) => id === 'e56')
  assert(
    findings.some(
      ({ type, field }) => type === 'evidence-gap' && field === 'movement-leg-alignment',
    ),
  )
  assert(
    !findings.some(({ type }) =>
      ['movement-count', 'actor-frame-sequence', 'actor-render-sequence'].includes(type),
    ),
  )
})

test('a later split endpoint cannot hide an earlier wrong pose at a common movement commit', () => {
  const make = (split) => {
    const positions = split ? [124, 124.5, 124.875, 125] : [124, 124.5, 125]
    return {
      events: positions.flatMap((col, index) => {
        const move = actor(
          index * 10,
          'e56',
          [col, 45, 0],
          index ? { position: [positions[index - 1], 45, 0] } : null,
          { sprite: 55 },
        )
        const render = {
          ...move,
          kind: 'actor-render',
          source: 'render:world',
          order: move.order + 1,
          state: { ...move.state, frame: index ? 6 : 1, frameSource: 'drawn', drawStatus: 'drawn' },
        }
        return [move, render]
      }),
    }
  }
  const game = make(false),
    reforge = make(true)
  const findings = () =>
    compareNpcStateTraces(game, reforge, '002').findings.filter(({ id }) => id === 'e56')
  assert(!findings().some(({ field }) => field === 'movement-frame'))
  const arrival = reforge.events.find(
    (event) => event.kind === 'actor-render' && event.order === 11,
  )
  reforge.events.push({ ...structuredClone(arrival), order: 12 })
  arrival.state.frame = 0
  assert(findings().some(({ field }) => field === 'movement-leg-alignment'))
  assert(
    findings().some(({ field }) => field === 'movement-frame'),
    'the extra arrival pose must fail independently of the later unmatched endpoint',
  )
  const shorter = make(false)
  shorter.events = shorter.events.slice(0, 4)
  const tail = structuredClone(shorter.events.at(-1))
  tail.order = 40
  tail.state.frame = 0
  shorter.events.push(tail)
  for (const [a, b] of [
    [shorter, game],
    [game, shorter],
  ]) {
    const fields = compareNpcStateTraces(a, b, '002')
      .findings.filter(({ id }) => id === 'e56')
      .map(({ field }) => field)
    assert(fields.includes('movement-leg-alignment'))
    assert(
      !fields.includes('movement-frame') && !fields.includes('rendered-pose'),
      'the unmatched stationary tail is not a shared-commit frame',
    )
  }
})

test('a later route difference cannot mask initial appearance or an inter-draw pose at a shared stop', () => {
  const make = (positions) => ({
    events: positions.flatMap((col, index) => {
      const state = actor(
        index * 10,
        'e56',
        [col, 45, 0],
        index ? { position: [positions[index - 1], 45, 0] } : null,
        { sprite: 55 },
      )
      return [
        state,
        ...[1, 2, 3].map((offset) => ({
          ...state,
          order: state.order + offset,
          kind: 'actor-render',
          source: 'render:world',
          state: {
            ...state.state,
            frame: index ? 6 : 3,
            frameSource: 'drawn',
            drawStatus: 'drawn',
          },
        })),
      ]
    }),
  })
  const game = make([124, 124.5, 125]),
    reforge = make([124, 124.5, 124.875, 125])
  const poses = (candidate) =>
    compareNpcStateTraces(game, candidate, '002').findings.filter(
      ({ id, field }) => id === 'e56' && field === 'rendered-pose',
    )
  assert.deepEqual(poses(reforge), [])
  const missingAppearance = structuredClone(reforge)
  missingAppearance.events = missingAppearance.events.filter(
    (event) => event.kind !== 'actor-render' || event.order >= 10,
  )
  assert.equal(poses(missingAppearance).length, 1)
  const flash = structuredClone(reforge)
  flash.events.find((event) => event.order === 12).state.frame = 0
  assert.equal(poses(flash).length, 1, 'first draw is correct, but the following flash must fail')
  assert(
    !compareNpcStateTraces(game, flash, '002').findings.some(
      ({ id, field }) => id === 'e56' && field === 'movement-frame',
    ),
  )
})

test('every stationary rendered pose is compared, even when both tracks already animated', () => {
  const trace = {
    events: [
      actor(1, 'e56', [124, 45, 0], null, { frame: 9, facing: 'right' }),
      ...[9, 6, 3, 9].map((frame, index) => ({
        ...actor(index + 2, 'e56', [124, 45, 0], null, {
          frame,
          frameSource: 'drawn',
          drawStatus: 'drawn',
          facing: ['right', 'up', 'left', 'right'][index],
        }),
        kind: 'actor-render',
        source: 'render:world',
      })),
    ],
  }
  assert.deepEqual(
    compareNpcStateTraces(trace, structuredClone(trace), '002').findings.filter(
      ({ id, field }) => id === 'e56' && field !== 'render-hold-attribution',
    ),
    [],
  )
  for (const [index, frame] of [10, 8, 5, 11].entries()) {
    const changed = structuredClone(trace)
    changed.events[index + 1].state.frame = frame
    assert(
      compareNpcStateTraces(trace, changed, '002').findings.some(
        ({ id, type }) => id === 'e56' && type === 'actor-render-sequence',
      ),
    )
  }
})

test('temporary disappearance is not equivalent to continuous visibility', () => {
  const make = (visibility) => ({
    events: visibility.map((visible, index) =>
      actor(index + 1, 'e56', [124, 45, 0], null, { visible, sprite: null }),
    ),
  })
  assert(
    compareNpcStateTraces(make([true, false, true]), make([true]), '002').findings.some(
      ({ id, field }) => id === 'e56' && field === 'visible',
    ),
  )
})

test('005 includes Xianglan movement frames, not only Zhang Si', () => {
  const make = (lastFrame) => ({
    events: [
      { ...actor(1, 'e83', [100, 50, 0], null, { frame: 0 }), scene: 's004' },
      ...[1, 0, lastFrame].flatMap((frame, index) => {
        const move = {
          ...actor(
            index * 2 + 2,
            'e83',
            [100 + (index + 1) / 4, 50, 0],
            { position: [100 + index / 4, 50, 0] },
            { frame },
          ),
          scene: 's004',
        }
        return [
          move,
          { ...move, kind: 'actor-render', order: move.order + 1, source: 'render:world' },
        ]
      }),
    ],
  })
  assert(
    compareNpcStateTraces(make(2), make(1), '005').findings.some(
      (e) => e.id === 'e83' && e.type === 'actor-frame-sequence',
    ),
  )
})

test('a trigger with explicitly no sprite has no frame contract but retains its state contract', () => {
  const make = (sprite) => ({
    events: [{ ...actor(1, 'e3', [0, 0, 0], null, { sprite }), scene: 's001' }],
  })
  const game = make(0),
    reforge = make(null)
  assert.deepEqual(
    compareNpcStateTraces(game, reforge, '001').findings.filter((e) => e.id === 'e3'),
    [],
  )
  reforge.events[0].state.visible = false
  assert(
    compareNpcStateTraces(game, reforge, '001').findings.some(
      (e) => e.id === 'e3' && e.field === 'visible',
    ),
  )
  reforge.events[0].state.sprite = 'sprite-55'
  assert(
    compareNpcStateTraces(game, reforge, '001').findings.some(
      (e) => e.id === 'e3' && e.type === 'evidence-gap',
    ),
  )
})

test('contact inference uses observed adjacency and dwell, not a command name', () => {
  const trace = {
    events: [
      actor(1, 'party', [126, 45, 0], null),
      actor(2, 'e60', [126.25, 45, 0], null),
      actor(30, 'party', [126, 46, 0], { position: [126, 45, 0] }),
    ],
  }
  assert.equal(tracePartyContactEvents(trace).length, 1)
  assert.equal(tracePartyContactEvents(trace)[0].npc, 'e60')
})

test('a contact cluster retains every repeated push, even inside the first dwell window', () => {
  const trace = {
    events: [
      actor(1, 'party', [126, 45, 0], null),
      actor(2, 'e60', [124.5, 45, 0], null),
      actor(30, 'party', [126, 46, 0], { position: [126, 45, 0] }),
      actor(31, 'e60', [125.5, 45, 0], { position: [124.5, 45, 0] }),
      actor(32, 'party', [125, 46, 0], { position: [126, 46, 0] }),
      actor(33, 'e61', [124.5, 45, 0], null),
      actor(34, 'party', [124, 46, 0], { position: [125, 46, 0] }),
    ],
  }
  assert.deepEqual(
    tracePartyContactEvents(trace).map(({ delta }) => delta),
    [
      [0, 1],
      [-1, 0],
      [-1, 0],
    ],
  )
})

test('cadence exposes a compressed same-batch movement', () => {
  const trace = {
    events: [
      actor(1, 'e26', [100, 20, 0], null),
      actor(2, 'e26', [100.5, 20, 0], { position: [100, 20, 0] }),
      actor(3, 'e26', [101, 20, 0], { position: [100.5, 20, 0] }),
      actor(4, 'e26', [101.5, 20, 0], { position: [101, 20, 0] }),
    ],
  }
  trace.events.forEach((event, index) => {
    event.atMs = index
  })
  const cadence = movementCadence(trace, 'e26')
  assert.equal(cadence.count, 3)
  assert.equal(cadence.burstFraction, 1)
})

test('frame sequence mismatch is a finding even when both sides animate', () => {
  const scenes = {
    e19: 's001',
    e62: 's003',
    e83: 's004',
    e84: 's004',
    e123: 's005',
    e124: 's005',
    e127: 's005',
    party: 's005',
  }
  const make = (frames) => ({
    events: [
      ...['e19', 'e62', 'e83', 'e84', 'e124', 'e127', 'party'].map((id) =>
        actor(1, id, [10, 10, 0], null, { frame: 0, sprite: 'npc' }),
      ),
      ...frames.flatMap((frame, index) => {
        const move = actor(
          index * 2 + 2,
          'e123',
          [10 + index * 0.5, 10, 0],
          index ? { position: [10 + (index - 1) * 0.5, 10, 0] } : null,
          { frame, sprite: 'npc' },
        )
        return [
          move,
          { ...move, kind: 'actor-render', order: move.order + 1, source: 'render:world' },
        ]
      }),
      { kind: 'control', order: 20, state: true },
    ],
    pages: [{ page: { lines: ['测试'] } }],
  })
  const game = make([0, 1, 0, 2, 0, 1, 0, 2, 0])
  const reforge = make([0, 1, 0, 1, 0, 1, 0, 1, 0])
  const wrongOrder = make([0, 1, 2, 0, 1, 2, 0, 1, 0])
  for (const trace of [game, reforge, wrongOrder])
    for (const event of trace.events) if (event.id) event.scene = scenes[event.id]
  const comparison = compareNpcStateTraces(game, reforge, '005')
  assert.equal(
    comparison.violations.some(
      (finding) => finding.type === 'actor-frame-sequence' && finding.id === 'e123',
    ),
    true,
  )
  assert(
    compareNpcStateTraces(game, wrongOrder, '005').violations.some(
      (finding) => finding.type === 'actor-frame-sequence' && finding.id === 'e123',
    ),
    'equal frame vocabulary must not hide a different playback order',
  )
})

test('movement frames bind to exact commits, not pauses, idle samples or stale pre-render caches', () => {
  const trace = {
    events: [
      actor(0, 'e59', [0, 0, 0], null, { frame: 0 }),
      actor(1, 'e59', [0.25, 0, 0], { position: [0, 0, 0] }, { frame: 0 }),
      {
        ...actor(2, 'e59', [0.25, 0, 0], { position: [0.25, 0, 0] }, { frame: 1 }),
        kind: 'actor-render',
        source: 'render:world',
      },
      {
        ...actor(3, 'e59', [0.25, 0, 0], { position: [0.25, 0, 0] }, { frame: 0 }),
        kind: 'actor-render',
        source: 'render:world',
      },
      actor(30, 'e59', [0.5, 0, 0], { position: [0.25, 0, 0] }, { frame: 1 }),
      {
        ...actor(31, 'e59', [0.5, 0, 0], { position: [0.5, 0, 0] }, { frame: 2 }),
        kind: 'actor-render',
        source: 'render:world',
      },
    ],
  }
  const evidence = movementFrameEvidence(trace, 'e59', 's003')
  assert.deepEqual(
    evidence.map(({ order, renderOrder, frame }) => ({ order, renderOrder, frame })),
    [
      { order: 1, renderOrder: 2, frame: 1 },
      { order: 30, renderOrder: 31, frame: 2 },
    ],
  )
  const missing = movementFrameEvidence(
    { events: trace.events.filter((e) => e.order !== 31) },
    'e59',
    's003',
  )
  assert.equal(
    missing[1].frame,
    null,
    'missing rendered evidence must not reuse the stale frame cache',
  )
})

test('offscreen movement needs actual same-visit draw geometry, never a missing visible frame', () => {
  const make = (drawn) => {
    const clock = {
      kind: 'world-render',
      order: 3,
      atMs: 3,
      tick: 1,
      renderId: 1,
      scene: 's003',
      sceneVisit: 1,
      view: { camera: [1120, 1264], canvasSize: [320, 200], transform: [1, 0, 0, 1, 0, 0] },
    }
    return {
      worldRenders: [clock],
      events: [
        actor(1, 'e60', [134, 43.5, 0], null),
        actor(2, 'e60', [134, 43.25, 0], { position: [134, 43.5, 0] }),
        {
          ...actor(4, 'e60', [134, 43.25, 0], null, {
            frame: drawn ? 8 : null,
            frameSource: drawn ? 'drawn' : 'none',
            drawStatus: drawn ? 'drawn' : 'not-drawn',
            geometry: { worldRect: [1442, 1377, 21, 48] },
          }),
          kind: 'actor-render',
          source: 'render:world',
          atMs: 3,
          tick: 1,
          renderId: 1,
          throughRenderId: 1,
          throughOrder: 3,
          throughAtMs: 3,
        },
      ],
    }
  }
  const game = make(false),
    reforge = make(true)
  assert.equal(movementFrameParity(game, reforge, 'e60', 's003').missing, false)
  assert.equal(movementFrameParity(game, reforge, 'e60', 's003').equal, true)
  for (const mutate of [
    (trace) => trace.events.pop(),
    (trace) => {
      trace.events[2].sceneVisit = 2
      trace.worldRenders[0].sceneVisit = 2
    },
    (trace) => {
      trace.events[2].state.visible = false
    },
    (trace) => {
      trace.events[2].state.position = [134, 43, 0]
    },
    (trace) => {
      trace.events[2].state.facing = 'up'
    },
    (trace) => {
      trace.events[2].state.geometry.worldRect[0] = 1439
    },
    (trace) => {
      trace.events[2].state.geometry.worldRect[2] = 0
    },
    (trace) => {
      trace.events[2].state.geometry.worldRect[3] = -48
    },
    (trace) => {
      trace.worldRenders[0].view.canvasSize = []
    },
    (trace) => {
      trace.worldRenders[0].view.canvasSize[0] = 0
    },
    (trace) => {
      trace.worldRenders[0].view.transform = [0, 0, 0, 0, 0, 0]
    },
    (trace) => {
      trace.worldRenders[0].view.transform = [Number.MAX_VALUE, 0, 0, Number.MAX_VALUE, 0, 0]
    },
    (trace) => {
      trace.worldRenders[0].view.transform = [Number.MAX_VALUE, 0, 0, 1, 0, 0]
    },
    (trace) => {
      trace.worldRenders.unshift({ ...trace.worldRenders[0], renderId: 0, order: 2.5 })
    },
  ]) {
    const changed = structuredClone(game)
    mutate(changed)
    assert.equal(movementFrameParity(changed, reforge, 'e60', 's003').missing, true)
  }
  const missingClock = structuredClone(game)
  missingClock.worldRenders = []
  assert.throws(
    () => movementFrameParity(missingClock, reforge, 'e60', 's003'),
    /incomplete render span/u,
  )
})

test('state-first comparison catches facing change and preserves all findings', () => {
  const otherActors = ['e19', 'e62', 'e83', 'e84', 'e124', 'e127', 'party'].map((id) =>
    actor(1, id, [2, 2, 0], null, { frame: 0, sprite: 'npc' }),
  )
  const game = {
      errors: [],
      overflow: false,
      events: [
        ...otherActors,
        actor(1, 'e123', [1, 1, 0], null, { facing: 'left', frame: 0, sprite: 'npc' }),
        actor(
          2,
          'e123',
          [1, 1, 0],
          { position: [1, 1, 0], facing: 'left' },
          { facing: 'right', frame: 1, sprite: 'npc' },
        ),
        { kind: 'control', order: 3, state: false },
      ],
      pages: [{ page: { lines: ['张四'] } }],
    },
    reforge = {
      errors: [],
      overflow: false,
      events: [
        ...otherActors.map((event) => structuredClone(event)),
        actor(1, 'e123', [1, 1, 0], null, { facing: 'left', frame: 0, sprite: 'npc' }),
        { kind: 'control', order: 2, state: true },
      ],
      pages: [{ page: { lines: ['张四'] } }],
    }
  const scenes = {
    e19: 's001',
    e62: 's003',
    e83: 's004',
    e84: 's004',
    e123: 's005',
    e124: 's005',
    e127: 's005',
    party: 's005',
  }
  for (const trace of [game, reforge]) {
    for (const event of trace.events) if (event.kind === 'actor') event.scene = scenes[event.id]
    trace.events.push(
      ...trace.events
        .filter((event) => event.kind === 'actor' && event.id !== 'party')
        .map((event) => ({
          ...event,
          order: event.order + 0.25,
          kind: 'actor-render',
          source: 'render:world',
          state: { ...event.state, frameSource: 'drawn', drawStatus: 'drawn' },
        })),
    )
  }
  const comparison = compareNpcStateTraces(game, reforge, '005')
  assert.deepEqual(
    comparison.violations.map((finding) => finding.field ?? finding.type),
    [
      'facing',
      'rendered-pose',
      'control',
      'story-authored-presentation',
      'npc-authority-admission',
      'follow-camera',
      'follow-camera',
      'gameLineage',
      'reforgeLineage',
      'reforgeInvocations',
      'gameDialogue',
      'dialogueCorrespondence',
      'automatic-lifecycle',
      'required-story-executions',
    ],
  )
  assert.equal(comparison.violations[0].field, 'facing')
  assert.equal(
    comparison.findings.some((finding) => finding.type === 'actor-field'),
    true,
  )
  assert.equal(
    comparison.findings.some((finding) => finding.type === 'control'),
    true,
  )
})

test('missing frame telemetry cannot silently pass', () => {
  const scenes = {
    e19: 's001',
    e62: 's003',
    e83: 's004',
    e84: 's004',
    e123: 's005',
    e124: 's005',
    e127: 's005',
    party: 's005',
  }
  const baseline = {
    errors: [],
    overflow: false,
    events: [
      ...['e19', 'e62', 'e83', 'e84', 'e124', 'e127', 'party'].map((id) =>
        actor(1, id, [10, 10, 0], null, { frame: 0, sprite: 'npc' }),
      ),
      actor(1, 'e123', [10, 10, 0], null, { frame: 0, sprite: 'npc' }),
      { kind: 'control', order: 2, state: true },
    ],
    pages: [{ page: { lines: ['测试'] } }],
  }
  const candidate = structuredClone(baseline)
  for (const trace of [baseline, candidate])
    for (const event of trace.events) if (event.kind === 'actor') event.scene = scenes[event.id]
  const candidateActor = candidate.events.find((event) => event.id === 'e123')
  candidateActor.state.facing = 'left'
  delete candidateActor.state.frame
  const comparison = compareNpcStateTraces(baseline, candidate, '005')
  assert.deepEqual(
    comparison.findings.map(({ type, field, id }) => [type, field, id]),
    [
      ['evidence-gap', 'render-evidence-source', 'e19'],
      ['evidence-gap', 'render-evidence-source', 'e62'],
      ['evidence-gap', 'render-evidence-source', 'e83'],
      ['evidence-gap', 'render-evidence-source', 'e84'],
      ['actor-field', 'facing', 'e123'],
      ['evidence-gap', 'render-evidence-source', 'e123'],
      ['evidence-gap', 'render-evidence-source', 'e124'],
      ['evidence-gap', 'render-evidence-source', 'e127'],
      ['evidence-gap', 'story-authored-presentation', undefined],
      ['evidence-gap', 'npc-authority-admission', undefined],
      ['evidence-gap', 'follow-camera', undefined],
      ['evidence-gap', 'follow-camera', undefined],
      ['evidence-gap', 'gameLineage', undefined],
      ['evidence-gap', 'reforgeLineage', undefined],
      ['evidence-gap', 'reforgeInvocations', undefined],
      ['effect-conformance', 'gameDialogue', undefined],
      ['evidence-gap', 'dialogueCorrespondence', undefined],
      ['evidence-gap', 'automatic-lifecycle', undefined],
      ['evidence-gap', 'required-story-executions', undefined],
    ],
  )
  assert.deepEqual(comparison.violations, comparison.findings)
})
