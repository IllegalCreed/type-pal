import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { verifyEntityActionTimelines } from './entity-action-contract.mjs'
import { instrumentEntityActions } from './entity-action-trace.mjs'
import { openingTracePlugin } from './opening-trace-plugin.mjs'
import { instrumentRuntimeHandoff } from './runtime-handoff-trace.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))

test('real page action player proves every installed frame, canonical binding, pause and identity-bound restored phase', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-actions-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    optimizeDeps: { noDiscovery: true, include: [] },
    root: fileURLToPath(new URL('../../packages/reforge', import.meta.url)),
    plugins: [openingTracePlugin()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  const savedGlobals = new Map(
    Object.getOwnPropertyNames(globalThis)
      .filter((key) => key.startsWith('__openingCause'))
      .map((key) => [key, globalThis[key]]),
  )
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
    for (const key of Object.getOwnPropertyNames(globalThis).filter((key) =>
      key.startsWith('__openingCause'),
    )) {
      if (savedGlobals.has(key)) globalThis[key] = savedGlobals.get(key)
      else delete globalThis[key]
    }
  })
  const { EntityActionPlayer, resolveSpriteActionBinding } = await server.ssrLoadModule(
    '/src/entity-action-player.ts',
  )
  const { RuntimeFrameSession } = await server.ssrLoadModule('/src/runtime-frame-session.ts')
  const causes = [],
    errors = []
  let order = 0,
    observedScene = 's009'
  createScriptCausalObserver({
    append: (list, event) => {
      const copy = structuredClone({ ...event, order: ++order })
      list.push(copy)
      causes.push(copy)
    },
    context: () => ({ scene: observedScene, sceneVisit: 1, tick: order, poses: {} }),
    snapshotGame() {},
    fail: (e) => errors.push(e),
    scenes: ['s009'],
  })
  globalThis.__openingCauseSnapshot = () =>
    globalThis.__openingCauseWorld({ script: { behaviors: { entities: {} } } })
  const action = {
    label: '合法非均匀循环',
    steps: [
      { frame: 0, durationMs: 100 },
      { frame: 1, durationMs: 180 },
      { frame: 0, durationMs: 20 },
    ],
    loopFrom: 1,
  }
  const definitions = [
    {
      id: 'sprite-test',
      asset: 'sprite.test',
      layout: { kind: 'static' },
      poses: { cycle: action, other: action },
    },
  ]
  const binding = { sprite: 'sprite-test', action: 'cycle', loop: true, startAtMs: 40 }
  const player = new EntityActionPlayer(),
    frames = new RuntimeFrameSession(100),
    fixed = new Set()
  const entity = {
      id: 'e203',
      hidden: false,
      initialPage: 'default',
      pages: [{ id: 'default', animation: binding }],
    },
    authority = new Map()
  const file = 'packages/reforge/src/main.ts',
    source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = instrumentRuntimeHandoff(instrumentEntityActions(source, file).code, file).code,
    ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  let callback, prepare, load
  const find = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'advanceEntityActions')
      callback = node.initializer.getText(ast)
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'prepareSceneActions')
      prepare = node.getText(ast)
    if (
      ts.isExpressionStatement(node) &&
      node.expression.getText(ast) === 'sceneRuntimeStates = structuredClone(payload.sceneRuntime)'
    ) {
      const statements = node.parent.statements,
        index = statements.indexOf(node)
      load = statements
        .slice(index, index + 2)
        .map((e) => e.getText(ast))
        .join('\n')
    }
    ts.forEachChild(node, find)
  }
  find(ast)
  assert(callback)
  const deps = {
    entityActions: player,
    battleHost: { active: null },
    activeScene: { scene: { id: 's009', entities: [entity] } },
    entityLifecycleGates: (e) => ({ visible: !e.hidden }),
    worldPresentation: { hasEntityFrame: (id) => fixed.has(id) },
    motion: { hasGait: () => false, hasExplicitAnimation: () => false },
    authority,
    project: { assetResolver: {} },
    spriteCache: { get: () => ({ frames: [{}, {}] }) },
    resolveSpriteActionBinding,
  }
  const advance = new Function(
    'deps',
    ts.transpile(`const {${Object.keys(deps).join(',')}}=deps; return ${callback}`, {
      target: ts.ScriptTarget.ES2022,
    }),
  )(deps)
  const restoreNative = new Function(
    'deps',
    ts.transpile(
      `const {${Object.keys(deps).join(',')}}=deps; let sceneRuntimeStates={};${prepare};return {prepareSceneActions,load(payload){${load}},cached:()=>sceneRuntimeStates};`,
      { target: ts.ScriptTarget.ES2022 },
    ),
  )(deps)
  const scenes = { s009: deps.activeScene.scene }
  const ports = {
    activateConfirm() {},
    resumeScriptGates() {},
    gameplayFrozen: () => false,
    advanceFade() {},
    settleClosedDialogue() {},
    consumePressed: () => new Set(),
    tickHostiles() {},
    advanceMoves() {},
    deriveMounts() {},
    advanceLifecycle() {},
    advanceEntityActions: advance,
    clearWorldTicks() {},
    presentBattle: () => false,
    routeInput() {},
    presentWorld: () => player.frame('e203'),
  }
  player.replaceScene([{ entity: 'e203', binding, action }])
  await frames.tick(1000, ports)
  await frames.tick(1060, ports)
  assert.equal(player.frame('e203'), 0)
  fixed.add('e203')
  await frames.tick(1140, ports)
  assert.equal(player.capture()[0].base.elapsedInStepMs, 60)
  fixed.clear()
  await frames.tick(1240, ports)
  assert.equal(player.frame('e203'), 1)
  await frames.tick(1340, ports)
  assert.equal(player.capture()[0].base.stepIndex, 1)
  assert.equal(player.capture()[0].base.elapsedInStepMs, 0)
  const input = [
    {
      entity: 'e203',
      base: {
        binding,
        source: 'automatic',
        awaited: false,
        stepIndex: 0,
        elapsedInStepMs: 60,
        finished: false,
        pendingLoopStartAtMs: 40,
      },
    },
  ]
  const inputPayload = {
    sceneRuntime: { s009: { entities: {}, automatic: {}, chaseClaims: [], actions: input } },
  }
  observedScene = 's000'
  const commitRestore = restoreNative.prepareSceneActions(
    deps.activeScene.scene,
    new Map([['e203', definitions[0]]]),
    inputPayload.sceneRuntime.s009,
  )
  restoreNative.load(inputPayload)
  observedScene = 's009'
  commitRestore()
  await frames.tick(1440, ports)
  assert.equal(player.capture()[0].base.elapsedInStepMs, 100)
  // A subsequent first visit consumes the clone installed by the earlier load,
  // not the payload object used by preflight preparation.
  const cached = restoreNative.cached().s009
  assert.notEqual(cached, inputPayload.sceneRuntime.s009)
  restoreNative.prepareSceneActions(
    deps.activeScene.scene,
    new Map([['e203', definitions[0]]]),
    cached,
  )()
  await frames.tick(1540, ports)
  assert.equal(player.capture()[0].base.elapsedInStepMs, 100)
  // Exercise fractional clock inputs after a clamped frame. Subtracting the
  // accumulated gameplayNow is not the inverse of its IEEE-754 addition.
  await frames.tick(8225.8, ports)
  await frames.tick(8242.5, ports)
  assert.deepEqual(errors, [])
  const restoreCommits = [
    { loadId: globalThis.__openingCauseRuntimeLoadId(inputPayload), inputPayload },
  ]
  const trace = {
    causes,
    restoreCommits,
    worldRenders: [{ scene: 's009', sceneVisit: 1, order: order + 1 }],
  }
  const proof = verifyEntityActionTimelines(trace, definitions, scenes)
  assert.equal(proof.tracks.size, 3)
  const fractionalStart = causes.length,
    fractionalFrames = new RuntimeFrameSession(100)
  player.replaceScene([{ entity: 'e203', binding, action }])
  await fractionalFrames.tick(8175.7, ports)
  await fractionalFrames.tick(8225.8, { ...ports, gameplayFrozen: () => true })
  await fractionalFrames.tick(8242.5, ports)
  const fractional = { causes: causes.slice(fractionalStart) }
  verifyEntityActionTimelines(fractional, definitions, scenes)
  const fractionalClocks = fractional.causes.filter((event) => event.phase === 'clock'),
    inverseDt = fractionalClocks[2].now - fractionalClocks[1].now,
    corruptedClock = structuredClone(fractional),
    lastActionFrame = corruptedClock.causes
      .filter((event) => event.phase === 'action-frame-start')
      .at(-1)
  assert.notEqual(
    inverseDt,
    lastActionFrame.dtMs,
    'native example must expose non-invertible clock addition',
  )
  lastActionFrame.dtMs = inverseDt
  assert.throws(
    () => verifyEntityActionTimelines(corruptedClock, definitions, scenes),
    /gameplay dt/,
  )
  // Keep the earlier restore trace isolated from the separate native clock run.
  causes.length = fractionalStart
  for (const corrupt of [
    (events) => {
      events.filter((e) => e.phase === 'clock').at(-1).now += 0.001
    },
    (events) => {
      events.filter((e) => e.phase === 'action-frame-start').at(-1).dtMs += 0.001
    },
    (events) => {
      events.find((e) => e.phase === 'action-advance-end').state.elapsedInStepMs++
    },
    (events) => {
      events.find((e) => e.phase === 'action-gate' && e.paused).paused = false
    },
    (events) => {
      const at = events.findIndex((e) => e.phase === 'action-advance-end')
      events.splice(at, 1)
    },
    (events) => {
      events.find((e) => e.phase === 'action-track' && e.origin.kind === 'restored').state
        .elapsedInStepMs++
    },
    (events) => {
      for (let i = events.length - 1; i >= 0; i--)
        if (events[i].phase.startsWith('action-') && events[i].clock?.frameId === 2)
          events.splice(i, 1)
    },
    (events) => {
      events.find((e) => e.phase === 'action-selected' && e.trackId).trackId = 999
    },
  ]) {
    const events = structuredClone(causes)
    corrupt(events)
    assert.throws(() =>
      verifyEntityActionTimelines({ ...trace, causes: events }, definitions, scenes),
    )
  }
  assert.throws(
    () =>
      verifyEntityActionTimelines(
        { ...trace, causes: causes.filter((e) => !e.phase.startsWith('action-')) },
        definitions,
        scenes,
      ),
    /missing page-action installation/,
  )
  const wrongBinding = structuredClone(trace)
  const rebind = (value) => {
    if (!value || typeof value !== 'object') return
    if (value.sprite === 'sprite-test' && value.action === 'cycle') value.action = 'other'
    for (const item of Object.values(value)) rebind(item)
  }
  rebind(wrongBinding)
  assert.throws(
    () => verifyEntityActionTimelines(wrongBinding, definitions, scenes),
    /entity page action binding differs/,
  )
  const future = structuredClone(trace)
  const restored = future.causes.find(
    (e) => e.phase === 'action-track' && e.origin.kind === 'restored',
  )
  future.restoreCommits = []
  future.causes.push({
    engine: 'reforge',
    phase: 'runtime-captured',
    order: order + 100,
    snapshotId: restored.origin.preparation.snapshotId,
    saved: inputPayload.sceneRuntime.s009,
  })
  assert.throws(
    () => verifyEntityActionTimelines(future, definitions, scenes),
    /earlier capture or identity-bound load/,
  )
  const wrongOwner = structuredClone(trace)
  const reown = (value) => {
    if (!value || typeof value !== 'object') return
    if (value.source === 'automatic') value.source = 'script'
    for (const item of Object.values(value)) reown(item)
  }
  reown(wrongOwner)
  assert.throws(
    () => verifyEntityActionTimelines(wrongOwner, definitions, scenes),
    /page base must use automatic/,
  )
  player.clearScene()
  await frames.tick(1540, ports)
  assert.throws(
    () =>
      verifyEntityActionTimelines(
        {
          causes,
          restoreCommits,
          worldRenders: [...trace.worldRenders, { scene: 's009', sceneVisit: 1, order: order + 1 }],
        },
        definitions,
        scenes,
      ),
    /world draw lost canonical page actions/,
  )
})
