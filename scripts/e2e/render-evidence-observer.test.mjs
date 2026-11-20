import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { errandCausalObserverScript, installErrandObserver } from './errand-observer.mjs'
import { instrumentErrandTrace } from './errand-trace-plugin.mjs'
import { evidenceObserverScript } from './evidence-recorder.mjs'
import { installInnObserver } from './inn-observer.mjs'
import { installKitchenObserver } from './kitchen-observer.mjs'
import { assertMealCollector } from './meal-contract.mjs'
import { installMealObserver } from './meal-observer.mjs'
import { installOpeningMatrix } from './opening-matrix-observer.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

test('actual projection completion retains a repeated party pose after its redundant setter', () => {
  const file = 'packages/reforge/src/main.ts'
  const raw = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = instrumentErrandTrace(raw, file).code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const projections = []
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'refreshRuntimeProjection')
      projections.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(projections.length, 1)
  const source = ts.transpile(`const ${projections[0].getText(ast)};`, {
    target: ts.ScriptTarget.ES2022,
  })
  const run = (projectionSource) => {
    const context = vm.createContext({
      structuredClone,
      TextEncoder,
      performance,
      addEventListener() {},
    })
    vm.runInContext(errandCausalObserverScript(), context)
    const state = {
      scene: 's005',
      tick: 1,
      control: false,
      money: 0,
      persistent: {},
      hooks: {},
      actors: {
        party: { position: [124, 48, 0], facing: 'down', walking: false, sprite: 'li-xiaoyao' },
        e116: { position: [126, 51.75, 0], facing: 'up', sprite: 'sprite.pal.124' },
      },
    }
    context.__errandPoint('commit:scene-ready', state)
    const projection = new Function(
      'syncRuntimeScriptScratch',
      'activeScene',
      'isLifecycleRuntimeCommand',
      '__openingPoint',
      `${projectionSource}\nreturn refreshRuntimeProjection;`,
    )(
      () => {},
      { scene: { id: 's005' } },
      () => false,
      (source) => context.__errandPoint(source, state),
    )
    projection({ kind: 'setPartyFacing', facing: 'down', member: 1 })
    const afterMember = context.__readErrandEvidence().events.at(-1).order
    projection({ kind: 'setPartyFacing', facing: 'down' })
    const trace = context.__readErrandEvidence()
    assert.deepEqual(trace.errors, [])
    const party = trace.events.filter((event) => event.kind === 'actor' && event.id === 'party')
    assert.equal(party.length, 3, 'a redundant real setter still requires a fresh observation')
    assert(party.at(-1).order > afterMember)
    assert.equal(party.at(-1).source, 'commit:refreshRuntimeProjection')
    assert.deepEqual(party.at(-1).state, party.at(-2).state)
    assert.equal(
      trace.events.filter((event) => event.kind === 'actor' && event.id === 'e116').length,
      1,
      'unchanged NPC commits remain sparse',
    )
  }
  run(source)
  // Removing the real completion hook recreates the missing post-setter receipt.
  assert.throws(
    run.bind(null, source.replace('__openingPoint("commit:refreshRuntimeProjection");', '')),
    /fresh observation/,
  )
})

test('collectors retain viewport changes without splitting unchanged actor geometry or claiming a culled draw', () => {
  for (const [install, prefix] of [
    [installOpeningMatrix, 'openingMatrix'],
    [installInnObserver, 'inn'],
    [installKitchenObserver, 'kitchen'],
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
        : evidenceObserverScript(install, createScriptCausalObserver),
      context,
    )
    const point = context[`__${prefix}Point`]
    const read =
      context[
        prefix === 'openingMatrix'
          ? '__readOpeningMatrix'
          : `__read${prefix[0].toUpperCase()}${prefix.slice(1)}Evidence`
      ]
    const geometry = { worldRect: [10, 20, 8, 8] }
    const view = {
      camera: { x: 500, y: 500 },
      canvasSize: [320, 200],
      transform: [1, 0, 0, 1, 0, 0],
      pixelRounding: 'unrounded',
    }
    const state = {
      scene: prefix === 'openingMatrix' ? 's001' : 's003',
      tick: 1,
      actors: { e59: { position: [3, 4, 0], facing: 'down', visible: true } },
      roomActors: [],
      control: true,
      money: 0,
      persistent: {},
      inventory: [],
      renderEvidence: {
        engine: 'game',
        actors: {},
        candidates: { e59: { frame: 1, geometry } },
        view,
        atMs: 10,
      },
    }
    point('render:world', state)
    view.camera.x = 510
    state.renderEvidence.atMs = 20
    point('render:world', state)
    const trace = read(),
      poses = (trace.renders ?? trace.events).filter(
        (e) => e.kind === 'actor-render' && e.id === 'e59',
      )
    assert.deepEqual(trace.errors, [], prefix)
    assert.deepEqual(
      trace.worldRenders.map((e) => e.view?.camera?.x),
      [500, 510],
      prefix,
    )
    assert.equal(poses.length, 1, 'camera-only changes belong to draw clocks, not actor state')
    assert.deepEqual(poses[0].state.geometry, geometry, prefix)
    assert.equal(
      poses[0].state.frame,
      null,
      'selected candidate frame is not an actual drawn frame',
    )
    assert.equal(poses[0].state.drawStatus, 'not-drawn', prefix)
    assert.equal(poses[0].throughRenderId, 2, prefix)
    state.renderEvidence.actors.e59 = { position: [3, 4, 0], facing: 'down', frame: 1, geometry }
    state.renderEvidence.atMs = 30
    point('render:world', state)
    const drawn = (read().renders ?? read().events)
      .filter((e) => e.kind === 'actor-render' && e.id === 'e59')
      .at(-1)
    assert.equal(drawn.state.frame, 1, prefix)
    assert.equal(drawn.state.drawStatus, 'drawn', prefix)
    assert.deepEqual(drawn.state.geometry, geometry, prefix)
  }
})

test('scene lifecycle boundaries share the state log order and preserve initialization and draw evidence', () => {
  for (const [install, prefix] of [
    [installOpeningMatrix, 'openingMatrix'],
    [installInnObserver, 'inn'],
    [installKitchenObserver, 'kitchen'],
    [installMealObserver, 'meal'],
    [installErrandObserver, 'errand'],
  ]) {
    const context = vm.createContext({
      structuredClone,
      TextEncoder,
      performance,
      addEventListener() {},
    })
    vm.runInContext(
      install === installErrandObserver
        ? errandCausalObserverScript()
        : evidenceObserverScript(install, createScriptCausalObserver),
      context,
    )
    const point = context[`__${prefix}Point`]
    const read =
      context[
        prefix === 'openingMatrix'
          ? '__readOpeningMatrix'
          : `__read${prefix[0].toUpperCase()}${prefix.slice(1)}Evidence`
      ]
    const state = {
      scene: 's001',
      tick: 12,
      actors: { e19: { position: [89, 45, 0], visible: false, state: 0 } },
      control: false,
      roomActors: [],
      money: 0,
      persistent: {},
      inventory: [],
    }
    point('commit:scene-materialized', state)
    state.actors.e19.visible = true
    state.actors.e19.state = 2
    point('commit:scene-ready', state)
    point('render:world', { ...state, renderEvidence: { engine: 'reforge', actors: {}, atMs: 30 } })
    const trace = read(),
      events = trace.actors ?? trace.events
    assert.deepEqual(trace.errors, [], prefix)
    const lifecycle = trace.lifecycle ?? events.filter((event) => event.kind === 'scene-lifecycle')
    assert.deepEqual(
      lifecycle.map((event) => event.phase),
      ['materialized', 'ready'],
      prefix,
    )
    const actors = events.filter((event) => event.kind === 'actor' && event.id === 'e19')
    assert.deepEqual(
      actors.map((event) => event.state.visible),
      [false, true],
      prefix,
    )
    assert(actors[1].order < lifecycle[1].order, prefix)
    assert(lifecycle[1].order < trace.worldRenders[0].order, prefix)
    assert(
      lifecycle.every((event) => event.sceneVisit === 1 && event.tick === 12),
      prefix,
    )
    if (prefix === 'errand')
      assert.deepEqual(
        context
          .__readErrandNpcTrace(['e19'])
          .events.filter((event) => event.kind === 'scene-lifecycle')
          .map(({ seq, ...event }) => event),
        lifecycle.map(({ seq, ...event }) => event),
      )
    const all = Object.values(trace)
      .filter(Array.isArray)
      .flat()
      .filter((event) => Number.isSafeInteger(event?.order))
    assert.equal(new Set(all.map((event) => event.order)).size, all.length, prefix)
  }
})

test('one completed draw uses its boundary clock for all derived events and releases it before later observations', () => {
  for (const [install, prefix, scene] of [
    [installOpeningMatrix, 'openingMatrix', 's001'],
    [installInnObserver, 'inn', 's003'],
    [installKitchenObserver, 'kitchen', 's003'],
    [installMealObserver, 'meal', 's003'],
    [installErrandObserver, 'errand', 's003'],
  ]) {
    let clock = 100
    const context = vm.createContext({
      structuredClone,
      TextEncoder,
      performance: { now: () => ++clock },
      addEventListener() {},
    })
    vm.runInContext(
      install === installErrandObserver
        ? errandCausalObserverScript()
        : evidenceObserverScript(install, createScriptCausalObserver),
      context,
    )
    const read =
      context[
        prefix === 'openingMatrix'
          ? '__readOpeningMatrix'
          : `__read${prefix[0].toUpperCase()}${prefix.slice(1)}Evidence`
      ]
    context[`__${prefix}Point`]('render:world', {
      scene,
      tick: 9,
      renderEvidence: { engine: 'reforge', atMs: 10 },
      actors: { e59: { position: [3, 4, 0], facing: 'down', visible: true, frameRendered: 1 } },
      roomActors: [],
      control: true,
      money: 0,
      persistent: {},
      inventory: [],
    })
    const trace = read()
    const all = Object.values(trace)
      .filter(Array.isArray)
      .flat()
      .filter((event) => Number.isInteger(event?.order))
    assert(all.length > 3)
    assert(
      all.every((event) => event.atMs === 10),
      prefix,
    )
    assert.equal(trace.worldRenders[0].tick, 9, prefix)
    if (prefix === 'meal') assertMealCollector(trace)
    context.__openingCauseDialog('open', null, { phase: 'typing' })
    if (prefix === 'openingMatrix')
      context.__openingMatrixPage('reforge', scene, { lines: ['later'] })
    else if (prefix === 'inn') context.__innRendered({ phase: 'waiting-input', text: 'later' })
    else if (prefix === 'kitchen') context.__kitchenPartyFrame('reforge', { frame: 1 })
    else if (prefix === 'meal') context.__mealMenu('reforge', { active: true })
    else context.__errandRendered({ phase: 'waiting-input', text: 'later' })
    const later = read()
    const last = Object.values(later)
      .filter(Array.isArray)
      .flat()
      .filter((event) => Number.isInteger(event?.order))
      .sort((a, b) => a.order - b.order)
      .at(-1)
    assert(last.atMs > 100, prefix)
    if (prefix === 'meal') assertMealCollector(later)
  }
})

test('per-frame clocks do not consume state-change budgets and remain bounded', () => {
  for (const [install, prefix, scene] of [
    [installOpeningMatrix, 'openingMatrix', 's001'],
    [installInnObserver, 'inn', 's003'],
    [installKitchenObserver, 'kitchen', 's003'],
    [installMealObserver, 'meal', 's003'],
    [installErrandObserver, 'errand', 's003'],
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
        : evidenceObserverScript(install, createScriptCausalObserver),
      context,
    )
    const point = context[`__${prefix}Point`]
    const read =
      context[
        prefix === 'openingMatrix'
          ? '__readOpeningMatrix'
          : `__read${prefix[0].toUpperCase()}${prefix.slice(1)}Evidence`
      ]
    const state = {
      scene,
      tick: 1,
      actors: {},
      control: true,
      roomActors: [],
      money: 0,
      persistent: {},
      inventory: [],
    }
    for (let i = 0; i < 17000; i++) point('render:world', state)
    point('commit:control', { ...state, control: false })
    const trace = read()
    assert.equal(trace.overflow, false, prefix)
    assert.equal(trace.worldRenders.length, 17000, prefix)
    assert.deepEqual(trace.errors, [], prefix)
    const controls = trace.controls ?? trace.events.filter((event) => event.kind === 'control')
    assert.deepEqual(
      controls.map((event) => event.state),
      [true, false],
      prefix,
    )
  }
  const context = vm.createContext({ structuredClone, performance, TextEncoder })
  vm.runInContext(evidenceObserverScript(installOpeningMatrix, createScriptCausalObserver), context)
  const state = {
    scene: 's001',
    tick: 1,
    actors: {},
    control: true,
    renderEvidence: { engine: 'reforge' },
  }
  for (let i = 0; i < 60000; i++) context.__openingMatrixPoint('render:world', state)
  context.__openingMatrixPoint('commit:control', { ...state, control: false })
  const trace = context.__readOpeningMatrix()
  assert.equal(trace.overflow, false)
  assert.equal(trace.worldRenders.length, 60000)
  assert.deepEqual(
    trace.controls.map((event) => event.state),
    [true, false],
  )
  assert.deepEqual(trace.errors, [])
  context.__openingMatrixPoint('render:world', state)
  const overflow = context.__readOpeningMatrix()
  assert.equal(overflow.overflow, true)
  assert.equal(overflow.worldRenders.length, 60000)
  assert.match(overflow.errors[0], /world render evidence overflow/)
})

test('all collectors retain completed draw clocks and split identical poses across scene visits', () => {
  for (const [install, prefix, a, b] of [
    [installOpeningMatrix, 'openingMatrix', 's001', 's000'],
    [installInnObserver, 'inn', 's003', 's001'],
    [installKitchenObserver, 'kitchen', 's003', 's001'],
    [installMealObserver, 'meal', 's003', 's001'],
    [installErrandObserver, 'errand', 's003', 's001'],
  ]) {
    let now = 10
    const context = vm.createContext({
      structuredClone,
      TextEncoder,
      performance: { now: () => now },
      addEventListener() {},
    })
    vm.runInContext(
      install === installErrandObserver
        ? errandCausalObserverScript()
        : evidenceObserverScript(install, createScriptCausalObserver),
      context,
    )
    const point = context[`__${prefix}Point`]
    const read =
      context[
        prefix === 'openingMatrix'
          ? '__readOpeningMatrix'
          : `__read${prefix[0].toUpperCase()}${prefix.slice(1)}Evidence`
      ]
    const state = (scene) => ({
      scene,
      tick: 7,
      renderEvidence: {
        engine: 'reforge',
        actors: scene === a ? { e59: { position: [3, 4, 0], facing: 'down', frame: 1 } } : {},
      },
      actors: {
        party: { position: [2, 4, 0], facing: 'down', visible: true },
        ...(scene === a
          ? {
              e59: {
                position: [3, 4, 0],
                facing: 'down',
                visible: true,
                frame: 1,
                frameRendered: 1,
              },
            }
          : {}),
      },
      roomActors: [],
      money: 0,
      control: true,
    })
    point('render:world', state(a))
    now = 60
    point('render:world', state(a))
    now = 90
    point('render:world', state(b))
    now = 160
    point('render:world', state(a))
    const trace = read()
    const events = trace.events ?? [...trace.actors, ...trace.controls]
    const renders = (
      trace.renders ?? events.filter((event) => event.kind === 'actor-render')
    ).filter((event) => event.id !== 'party')
    assert.deepEqual(trace.errors, [], prefix)
    assert.equal(renders.length, 2, `${prefix}: same pose on return needs a new span`)
    assert.deepEqual(
      events
        .filter((event) => event.kind === 'actor' && event.id === 'party')
        .map((event) => event.sceneVisit),
      [1, 2, 3],
      `${prefix}: identical party coordinates still need a new visit observation`,
    )
    assert.deepEqual(
      renders.map((event) => event.sceneVisit),
      [1, 3],
      prefix,
    )
    assert.equal(renders[0].throughRenderId, 2, prefix)
    assert.equal(renders[0].throughAtMs, 60, prefix)
    assert.equal(renders[1].throughRenderId, 4, prefix)
    assert.deepEqual(
      trace.worldRenders.map((event) => [event.renderId, event.sceneVisit, event.tick, event.atMs]),
      [
        [1, 1, 7, 10],
        [2, 1, 7, 60],
        [3, 2, 7, 90],
        [4, 3, 7, 160],
      ],
      prefix,
    )
    assert.equal(renders[0].state.frameSource, 'drawn', prefix)
    assert.equal(renders[0].state.drawStatus, 'drawn', prefix)
    assert.deepEqual(
      events.filter((event) => event.kind === 'control').map((event) => event.sceneVisit),
      [1, 2, 3],
      prefix,
    )
    const snapshots = renders.filter((event) => event.sceneVisit === 1)
    assert.equal(snapshots[0].throughOrder, trace.worldRenders[1].order, prefix)
    if (prefix === 'errand') {
      const npc = context.__readErrandNpcTrace(['e59'])
      assert.deepEqual(npc.worldRenders, trace.worldRenders)
      assert.equal(npc.events.find((event) => event.kind === 'actor-render').throughRenderId, 2)
    }
    // A visit outside the collector's actor scope must still break identity.
    context.__e2eSceneBoundary({ scene: 's099', tick: 8 })
    context.__e2eSceneBoundary({ scene: a, tick: 9 })
    point('render:world', { ...state(a), tick: 9 })
    const last = read()
    assert.equal(last.worldRenders.at(-1).sceneVisit, 5, prefix)
    assert.equal(last.worldRenders.at(-1).tick, 9, prefix)
    // No render is invented for an actor missing from one completed world pass.
    point('render:world', { ...state(a), actors: {}, tick: null })
    point('render:world', { ...state(a), tick: null })
    const resumed = read()
    const resumedRenders =
      resumed.renders ?? resumed.events.filter((event) => event.kind === 'actor-render')
    assert.equal(resumedRenders.at(-1).renderId, 7, prefix)
    assert.equal(resumed.worldRenders.at(-1).tick, null, prefix)
  }
})

test('Game collector adapters consume renderer evidence and never use predicted pose as a drawn frame', () => {
  for (const [install, prefix] of [
    [installOpeningMatrix, 'openingMatrix'],
    [installInnObserver, 'inn'],
    [installKitchenObserver, 'kitchen'],
    [installMealObserver, 'meal'],
    [installErrandObserver, 'errand'],
  ]) {
    const context = vm.createContext({
      structuredClone,
      TextEncoder,
      performance,
      addEventListener() {},
    })
    vm.runInContext(
      install === installErrandObserver
        ? errandCausalObserverScript()
        : evidenceObserverScript(install, createScriptCausalObserver),
      context,
    )
    const id = prefix === 'openingMatrix' ? 10 : 59
    const all = [3, 8, 10, 11, 15, 16, 19, 20, 24, 25, 26, 56, 59, 60, 61, 62].map((id) => ({
      id,
      x: 40,
      y: 40,
      facing: 'right',
      sState: 2,
      spriteNum: 55,
      scriptedFrame: 1,
      nSpriteFrames: 3,
    }))
    const gs = {
      wNumScene: prefix === 'openingMatrix' ? 2 : 4,
      frameNum: 27,
      npcs: all.filter((actor) => actor.id === id),
      allEventObjects: all,
      party: { x: 10, y: 10, facing: 'down' },
      partyMembers: [0],
      PlayerRolesRuntime: { rgwSpriteNum: [1] },
      partyScriptedFrame: [],
      walkingFrame: { walking: false, stepFrame: 0 },
      wLayer: 0,
      dwCash: 0,
      inventory: [],
      mode: 'explore',
    }
    const draw = {
      frame: 0,
      position: [40, 40],
      facing: 'right',
      fallback: true,
      spriteSource: 'npcSpriteFrames',
      drawOrder: 0,
    }
    context[`__${prefix}Game`](gs, 'render:world', {
      engine: 'game',
      tick: 27,
      atMs: 3,
      actors: { [`e${id}`]: draw },
    })
    const read =
      context[
        prefix === 'openingMatrix'
          ? '__readOpeningMatrix'
          : `__read${prefix[0].toUpperCase()}${prefix.slice(1)}Evidence`
      ]
    const trace = read(),
      renders = trace.renders ?? trace.events.filter((event) => event.kind === 'actor-render')
    assert.deepEqual(trace.errors, [], prefix)
    const rendered = renders.find((event) => event.id === `e${id}`)
    assert.equal(rendered.state.frame, 0, prefix)
    assert.equal(rendered.state.frameSource, 'drawn', prefix)
    assert.equal(rendered.atMs, 3, prefix)
    context[`__${prefix}Game`](gs, 'render:world', {
      engine: 'game',
      tick: 27,
      atMs: 5,
      actors: {},
    })
    const hidden = read(),
      hiddenRenders =
        hidden.renders ?? hidden.events.filter((event) => event.kind === 'actor-render')
    const unrendered = hiddenRenders.filter((event) => event.id === `e${id}`).at(-1)
    assert.equal(unrendered.state.frame, null, prefix)
    assert.equal(unrendered.state.drawStatus, 'not-drawn', prefix)
  }
})

test('Reforge collectors consume only actual draws, not the selected-frame cache or a previous pass', () => {
  for (const [install, prefix] of [
    [installOpeningMatrix, 'openingMatrix'],
    [installInnObserver, 'inn'],
    [installKitchenObserver, 'kitchen'],
    [installMealObserver, 'meal'],
    [installErrandObserver, 'errand'],
  ]) {
    const context = vm.createContext({
      structuredClone,
      TextEncoder,
      performance,
      addEventListener() {},
    })
    vm.runInContext(
      install === installErrandObserver
        ? errandCausalObserverScript()
        : evidenceObserverScript(install, createScriptCausalObserver),
      context,
    )
    const read =
      context[
        prefix === 'openingMatrix'
          ? '__readOpeningMatrix'
          : `__read${prefix[0].toUpperCase()}${prefix.slice(1)}Evidence`
      ]
    const state = {
      scene: 's001',
      tick: 12,
      control: true,
      money: 0,
      persistent: {},
      inventory: [],
      roomActors: [],
      actors: { e19: { position: [3, 4, 0], facing: 'down', visible: true, frameRendered: 9 } },
      renderEvidence: {
        engine: 'reforge',
        atMs: 5,
        actors: {
          e19: {
            position: [3, 4, 0],
            facing: 'down',
            frame: 0,
            drawOrder: 2,
            spriteSource: 'shared',
          },
        },
      },
    }
    const rendered = () => {
      const trace = read()
      assert.deepEqual(trace.errors, [], prefix)
      return (trace.renders ?? trace.events.filter((event) => event.kind === 'actor-render')).at(-1)
        .state
    }
    context[`__${prefix}Point`]('render:world', state)
    assert.equal(rendered().frame, 0, prefix)
    assert.equal(rendered().frameSource, 'drawn', prefix)
    assert.equal(rendered().drawOrder, 2, prefix)
    context[`__${prefix}Point`]('render:world', {
      ...state,
      renderEvidence: { engine: 'reforge', atMs: 7, actors: {} },
    })
    assert.equal(rendered().frame, null, prefix)
    assert.equal(rendered().drawStatus, 'not-drawn', prefix)
  }
})
