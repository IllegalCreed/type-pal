import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { errandCausalObserverScript, installErrandObserver } from './errand-observer.mjs'
import { createEvidenceRecorder, evidenceObserverScript } from './evidence-recorder.mjs'
import { gameRouteActors, innCausalObserverScript, installInnObserver } from './inn-observer.mjs'
import { installMealObserver } from './meal-observer.mjs'
import { movementFrameEvidence } from './npc-transition-contract.mjs'

test('live inn progress never clones causal or resource archives; the final export still includes them', () => {
  let causalReads = 0
  let resourceReads = 0
  const cloned = []
  const context = vm.createContext({
    performance,
    TextEncoder,
    readResource: () => resourceReads++,
    structuredClone(value) {
      cloned.push(Object.keys(value))
      return structuredClone(value)
    },
    installCausal: () => ({
      clock: () => null,
      read: () => {
        causalReads++
        return [{ phase: 'retained' }]
      },
    }),
  })
  vm.runInContext(
    `(${installInnObserver.toString()})(installCausal, (options) => {
      const recorder = (${createEvidenceRecorder.toString()})(options)
      const resources = recorder.resources
      recorder.resources = () => { readResource(); return resources() }
      return recorder
    })`,
    context,
  )
  context.__e2eRecordSpriteFrame({ width: 1, height: 1, pixels: [7], opaque: [1] })
  context.__innPoint('render:world', {
    scene: 's003',
    actors: {},
    roomActors: [],
    money: 500,
    control: true,
  })
  cloned.length = 0
  const progress = context.__readInnProgress()
  assert.equal(causalReads, 0)
  assert.equal(resourceReads, 0)
  assert.equal(cloned.length, 1)
  assert.deepEqual(progress.errors, [])
  for (const field of ['causes', 'resources', 'events', 'worldRenders'])
    assert(!cloned[0].includes(field))
  assert.equal(progress.final.money, 500)
  progress.final.money = 0
  const full = context.__readInnEvidence()
  assert.equal(causalReads, 1)
  assert.equal(full.final.money, 500)
  assert.deepEqual(full.causes, [{ phase: 'retained' }])
  assert.equal(resourceReads, 1)
  assert.equal(full.resources.length, 1)
  assert.deepEqual(full.resources[0].pixels, [7])
  assert.equal(progress.eventCount, full.events.length)
})

test('002 observes actual causal clocks and wait ownership without changing actor state', () => {
  const context = vm.createContext({ structuredClone, performance, TextEncoder })
  vm.runInContext(innCausalObserverScript(), context)
  assert.equal(typeof context.__openingCauseFrame, 'function')
  const state = {
    scene: 's003',
    tick: 1,
    actors: {
      e56: { position: [124, 45, 0], facing: 'left', visible: true, frame: 0 },
    },
    roomActors: [],
    control: false,
    money: 0,
  }
  context.__innPoint('commit:scene-ready', state)
  const before = structuredClone(state)
  context.__openingCauseFrame({ now: 100, realNow: 100, frozen: false })
  const signal = {},
    timer = {},
    runner = {}
  context.__openingCauseRun(runner, signal, { self: { scene: 's003', entity: 'e56' } })
  context.__openingCauseStep(runner, {
    self: { scene: 's003', entity: 'e56' },
    command: { kind: 'leaf', command: { kind: 'wait', ms: 100 } },
  })
  context.__openingCauseTimer('wait-start', timer, signal, { now: 100, deadline: 200, ms: 100 })
  context.__innPoint('render:world', state)
  context.__openingCauseFrame({ now: 200, realNow: 200, frozen: false })
  context.__openingCauseTimer('wait-end', timer, signal, { reason: 'deadline' })
  const trace = context.__readInnEvidence()
  assert.deepEqual(state, before)
  assert.deepEqual(trace.errors, [])
  assert.equal(trace.overflow, false)
  assert.deepEqual(
    trace.causes.map((e) => e.phase),
    ['clock', 'run-started', 'command', 'wait-start', 'clock', 'wait-end'],
  )
  const start = trace.causes[3],
    end = trace.causes[5]
  assert.equal(start.runId, end.runId)
  assert.equal(start.waitId, end.waitId)
  assert.deepEqual(start.poses.e56.state, state.actors.e56)
  assert.deepEqual(trace.worldRenders[0].causalFrame, trace.causes[0].clock)
  assert(start.order < trace.worldRenders[0].order && trace.worldRenders[0].order < end.order)
})

test('game route actor projection excludes hidden and vanishing blockers, including stale scene copies', () => {
  const actors = gameRouteActors(
    [
      { id: 59, x: 2192, y: 584, sState: 2, sVanishTime: 800 },
      { id: 60, x: 2208, y: 592, sState: 2, sVanishTime: 0 },
      { id: 61, x: 2224, y: 600, sState: 2, sVanishTime: 0 },
      { id: 62, x: 2240, y: 608, sState: 1, sVanishTime: 0 },
    ],
    [{ id: 60, sState: 0, sVanishTime: 0 }],
  )
  assert.deepEqual(actors, [
    { col: (2224 / 16 + 600 / 8) / 2, row: (600 / 8 - 2224 / 16) / 2, collide: true },
  ])
})

test('all NPC collectors retain a real render after a move even when the displayed frame is unchanged', () => {
  for (const [install, prefix] of [
    [installInnObserver, 'inn'],
    [installMealObserver, 'meal'],
    [installErrandObserver, 'errand'],
  ]) {
    const context = vm.createContext({
      structuredClone,
      performance,
      TextEncoder,
      addEventListener() {},
    })
    vm.runInContext(
      install === installErrandObserver
        ? errandCausalObserverScript()
        : evidenceObserverScript(install),
      context,
    )
    const point = context[`__${prefix}Point`],
      read = context[`__read${prefix[0].toUpperCase()}${prefix.slice(1)}Evidence`]
    const state = (col, frame) => ({
      scene: 's003',
      renderEvidence: {
        engine: 'reforge',
        actors: { e59: { position: [col, 0, 0], facing: 'down', frame } },
      },
      actors: {
        e59: { position: [col, 0, 0], facing: 'down', visible: true, frame, frameRendered: frame },
      },
      roomActors: [],
      money: 0,
      control: true,
    })
    point('render:world', state(0, 0))
    point('commit:meta.entity.pos', state(0.25, 0))
    assert.equal(movementFrameEvidence(read(), 'e59', 's003')[0].frame, null)
    point('render:world', state(0.25, 0))
    point('render:world', state(0.25, 0))
    point('commit:meta.entity.pos', state(0.5, 0))
    point('render:world', state(0.5, 2))
    const trace = read()
    assert.deepEqual(trace.errors, [])
    assert.equal(trace.overflow, false)
    assert.equal(trace.events.filter((e) => e.kind === 'actor-render').length, 3)
    assert.deepEqual(
      movementFrameEvidence(trace, 'e59', 's003').map((e) => e.frame),
      [0, 2],
    )
  }
})
