import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { verifyAutomaticWaitReceipt } from './automatic-language-receipts.mjs'
import { instrumentInnTrace } from './inn-trace-plugin.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import { openingTracePlugin } from './opening-trace-plugin.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'
import { assertRestoredPoseHandoff, verifyRuntimeHandoffs } from './runtime-handoff-contract.mjs'
import { instrumentRuntimeHandoff } from './runtime-handoff-trace.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { checkDeferredOwners } from './script-invocation-contract.mjs'
import { verifyStoryMotion } from './story-motion-contract.mjs'

const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))

const fixtureFile = 'packages/reforge/src/save/current-save.current-characterization.test.ts'
const fixtureSource = await readFile(new URL(`../../${fixtureFile}`, import.meta.url), 'utf8')
const fixtureAst = ts.createSourceFile(fixtureFile, fixtureSource, ts.ScriptTarget.Latest, true)
const fixtureDeclarations = fixtureAst.statements.filter(
  (node) =>
    ts.isFunctionDeclaration(node) && ['manifest', 'world', 'payload'].includes(node.name?.text),
)
assert.equal(fixtureDeclarations.length, 3)
const createSaveFixture = new Function(
  'SAVE_VERSION',
  'CONTENT_VERSION',
  'CURRENT_PROJECT_MINIMUM_SAVE_VERSION',
  ts.transpile(
    `${fixtureDeclarations.map((node) => node.getText(fixtureAst)).join('\n')}; return {manifest,payload};`,
    { target: ts.ScriptTarget.ES2022 },
  ),
)

async function currentSaveFixture(server) {
  const { SAVE_VERSION } = await server.ssrLoadModule('/src/save/types.ts')
  const { CONTENT_VERSION, CURRENT_PROJECT_MINIMUM_SAVE_VERSION } =
    await server.ssrLoadModule('@type-pal/content')
  return createSaveFixture(SAVE_VERSION, CONTENT_VERSION, CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
}

test('restore input matches the actual current codec defaults without losing nonempty save state', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-restore-input-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../packages/reforge', import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  })
  const { preflightCurrentSave, normalizeCurrentSave } = await server.ssrLoadModule(
    '/src/save/current-codec.ts',
  )
  const saveFixture = await currentSaveFixture(server)
  const references = new Map([['s001', new Set(['e001'])]])
  for (const omitted of [
    [],
    ['skillUseCounts'],
    ['entityLifecycles'],
    ['skillUseCounts', 'entityLifecycles'],
  ]) {
    const raw = saveFixture.payload()
    raw.world.skillUseCounts = { hero: { heal: 3 } }
    for (const field of omitted) delete raw.world[field]
    const original = structuredClone(raw)
    const resolver = await preflightCurrentSave({ manifest: saveFixture.manifest(), payload: raw })
    const inputPayload = normalizeCurrentSave(raw, resolver, references)
    const trace = {
      causes: [],
      restoreCommits: [{ loadId: 1, order: 1, source: 'commit:restorePayload', inputPayload }],
    }
    assertReforgeRestoreInput(trace, raw)
    assert.deepEqual(raw, original)
    for (const corrupt of [
      (input) => {
        input.world.skillUseCounts = { hero: { heal: 4 } }
      },
      (input) => {
        input.world.entityLifecycles = { s001: { e001: { phase: 'removed' } } }
      },
      (input) => {
        input.world.money++
      },
      (input) => {
        delete input.world.inventory
      },
      (input) => {
        delete input.world.skillUseCounts
      },
      (input) => {
        delete input.world.entityLifecycles
      },
    ]) {
      const changed = structuredClone(trace)
      corrupt(changed.restoreCommits[0].inputPayload)
      assert.throws(() => assertReforgeRestoreInput(changed, raw), /normalized current checkpoint/)
    }
  }
})

test('actual capture/project/automatic-wait callers preserve exact timer provenance across a scene cache and save load', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-handoff-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../packages/reforge', import.meta.url)),
    plugins: [openingTracePlugin()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  const globals = new Map(
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
      if (globals.has(key)) globalThis[key] = globals.get(key)
      else delete globalThis[key]
    }
  })
  const { RuntimeFrameSession } = await server.ssrLoadModule('/src/runtime-frame-session.ts')
  const { WorldMotionRuntime } = await server.ssrLoadModule('/src/world-motion-runtime.ts')
  const { ScriptRunnerCore } = await server.ssrLoadModule('/src/script-runner-core.ts')
  const { compileBaseScriptFlow } = await server.ssrLoadModule('/src/script-compiler-core.ts')
  const saveFixture = await currentSaveFixture(server)
  const frames = new RuntimeFrameSession(100),
    errors = [],
    causes = []
  let order = 0,
    observedScene = 's003',
    observedVisit = 1,
    readMotion = () => ({ tick: order, poses: {} })
  createScriptCausalObserver({
    append: (list, event) => {
      const copy = structuredClone({ ...event, order: ++order })
      list.push(copy)
      causes.push(copy)
    },
    context: () => ({
      scene: observedScene,
      sceneVisit: observedVisit,
      ...readMotion(),
    }),
    snapshotGame() {},
    fail: (error) => errors.push(error),
    scenes: ['s003'],
  })
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
    advanceEntityActions() {},
    clearWorldTicks() {},
    presentBattle: () => false,
    routeInput() {},
    presentWorld() {},
  }
  await frames.tick(0, ports)
  const cursor = {
    behavior: 'default',
    at: { kind: 'stage', stage: 'initial' },
    resume: { digest: 'a'.repeat(64), frames: [{ index: 0 }] },
  }
  const canonicalScript = {
    behaviors: { entities: { s003: { e62: { auto: { cursor } } } } },
    entityPos: {},
  }
  const entity = { id: 'e62', pos: { col: 137, row: 73, height: 0 }, facing: 'down' }
  const fixed = new Map([['e62', 1]]),
    autoActivations = new Map(),
    autoActivationBySignal = new Map()
  const deps = {
    frames,
    canonicalScript,
    world: { script: canonicalScript },
    activeScene: { scene: { id: 's003', entities: [entity] } },
    automaticActions: new Map(),
    entityActions: { capture: () => [] },
    restoredWaits: new Map(),
    automaticWaits: new Map(),
    autoActivations,
    autoActivationBySignal,
    pendingChaseTerminal: new Map(),
    motion: new WorldMotionRuntime(100),
    worldPresentation: {
      entityFrame: (id) => fixed.get(id),
      setEntityFrame: (id, value) => fixed.set(id, value),
      clearEntityFrames: () => fixed.clear(),
    },
    applyWorldEntityGatesToScene() {},
    applyWorldEntityPositionToScene() {},
    authority: new Map(),
    asyncIntentAbortError: (message) => new Error(message),
    emptyWorldScriptState: () => ({ behaviors: { entities: {} } }),
    currentMotionSceneSessionId: () => `s003:${observedVisit}`,
    entityMotionPermanentlyRemoved: () => false,
    abortAutoActivationForHiddenTarget: () => null,
    entityLifecycleGates: () => ({ autoAllowed: true }),
    pendingTouchTrigger: { blocksAutoSafePoint: false },
    presentation: { waitPassive: () => assert.fail('unheld continuation should be immediate') },
    waitForAutoTargetContinuation: (await server.ssrLoadModule('/src/motion-runtime-wiring.ts'))
      .waitForAutoTargetContinuation,
    currentWorldSnapshot: () => structuredClone(deps.world),
    player: { pos: { col: 0, row: 0, height: 0 } },
    facing: 'down',
    inputProject: { manifest: { id: 'test' } },
    buildCurrentSavePayload: (world, position, project, sceneRuntime) => ({
      world,
      position,
      project,
      sceneRuntime,
    }),
  }
  const file = 'packages/reforge/src/main.ts',
    source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  readMotion = () => ({
    tick: deps.motion.worldTick,
    poses: { e62: { state: { position: Object.values(entity.pos), visible: true } } },
  })
  const code = instrumentRuntimeHandoff(source, file).code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
    declarations = [],
    edges = {}
  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) &&
      [
        'captureSceneRuntime',
        'applyWorldToScene',
        'waitAutomaticDelay',
        'captureCurrentSavePayload',
        'scheduleAutoStep',
        'runAutoStepThroughContinuation',
        'waitForAutoMotionContinuation',
      ].includes(node.name?.text)
    )
      declarations.push(node.getText(ast))
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'rememberScene')
      edges.cache = node.getText(ast)
    if (
      ts.isExpressionStatement(node) &&
      node.expression.getText(ast) === 'sceneRuntimeStates = structuredClone(payload.sceneRuntime)'
    ) {
      const siblings = node.parent.statements,
        index = siblings.indexOf(node)
      edges.load = siblings
        .slice(index, index + 2)
        .map((e) => e.getText(ast))
        .join('\n')
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(declarations.length, 7)
  assert(edges.cache && edges.load)
  const body = `const {${Object.keys(deps).join(',')}}=deps; let sceneRuntimeStates={}; ${declarations.join('\n')}
    return { captureSceneRuntime,applyWorldToScene,waitAutomaticDelay,captureCurrentSavePayload,runAutoStepThroughContinuation,
      cache(rememberScene=true){${edges.cache}},load(payload){${edges.load}},sceneRuntime:()=>sceneRuntimeStates };`
  const actual = new Function('deps', ts.transpile(body, { target: ts.ScriptTarget.ES2022 }))(deps)
  const flow = compileBaseScriptFlow(
    {
      kind: 'stages',
      initial: 'initial',
      stages: [{ id: 'initial', body: [{ kind: 'wait', ms: 200 }], next: { kind: 'complete' } }],
    },
    { timing: 'auto', canonicalContentDigest: 'a'.repeat(64) },
  )
  async function runWait(controller) {
    let ready
    const entered = new Promise((resolve) => {
      ready = resolve
    })
    const done = new ScriptRunnerCore(
      {
        execute(command, context, signal) {
          assert.equal(context.timing, 'auto')
          assert.equal(command.kind, 'wait')
          const waiting = actual.waitAutomaticDelay(command.ms, 'command', signal)
          ready()
          return waiting
        },
      },
      controller.signal,
    ).runFlow(flow, {
      self: { scene: 's003', entity: 'e62' },
      cursorController: { reachSafePoint: () => 'continue' },
    })
    void done.catch(() => {})
    await entered
    return { done }
  }
  function activate() {
    const controller = new AbortController(),
      activation = { entityId: 'e62', controller }
    autoActivations.set('e62', activation)
    autoActivationBySignal.set(controller.signal, activation)
    return controller
  }
  let controller = activate()
  deps.motion.advanceExplicitAnimation('e62')
  const first = (await runWait(controller)).done.catch(() => {})
  await frames.tick(100, ports)
  // Paused wall time must not consume the automatic wait. The real getter supplies its value.
  deps.automaticWaits.get(controller.signal).timer.setPaused(true)
  await frames.tick(1100, ports)
  actual.cache()
  assert.equal(actual.sceneRuntime().s003.automatic.e62.wait.remainingMs, 100)
  controller.abort()
  await first
  autoActivations.clear()
  fixed.set('e62', 2)
  deps.motion.clearExplicitAnimation('e62')
  entity.facing = 'up'
  actual.applyWorldToScene()
  assert.equal(entity.facing, 'down')
  assert.equal(fixed.get('e62'), 1)
  assert.equal(deps.motion.explicitAnimation('e62'), 1)
  controller = activate()
  const resumed = (await runWait(controller)).done
  assert.equal(deps.restoredWaits.size, 0)
  const secondStart = causes.filter((e) => e.phase === 'wait-start').at(-1)
  assert.equal(secondStart.ms, 100)
  await frames.tick(1200, ports)
  await resumed
  // Completion before the script cursor advances is a real zero-remaining snapshot.
  actual.cache()
  autoActivations.clear()
  const zero = actual.sceneRuntime().s003
  assert.equal(zero.automatic.e62.wait.remainingMs, 0)
  const payload = { ...saveFixture.payload(), sceneRuntime: { s003: structuredClone(zero) } }
  const restoreCommits = []
  // The actual restore copies every cached scene before switching away from the
  // bootstrap scene. A world-level input receipt cannot depend on that old scene.
  observedScene = 's000'
  actual.load(payload)
  observedScene = 's003'
  actual.applyWorldToScene()
  const restoreCode = instrumentInnTrace(source, file).code
  const restoreAst = ts.createSourceFile(file, restoreCode, ts.ScriptTarget.Latest, true)
  let restoreCall
  const findRestore = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(restoreAst) === 'globalThis.__innRestoreCommitted'
    )
      restoreCall = node.getText(restoreAst)
    ts.forEachChild(node, findRestore)
  }
  findRestore(restoreAst)
  assert(restoreCall)
  new Function('globalThis', 'payload', 'captureCurrentSavePayload', restoreCall)(
    {
      __openingCauseRuntimeLoadId: globalThis.__openingCauseRuntimeLoadId,
      __innRestoreCommitted: (output, inputPayload, loadId) =>
        restoreCommits.push(
          structuredClone({
            payload: output,
            inputPayload,
            loadId,
            order: ++order,
            source: 'commit:restorePayload',
          }),
        ),
    },
    payload,
    actual.captureCurrentSavePayload,
  )
  controller = activate()
  const starts = causes.filter((e) => e.phase === 'wait-start').length
  await (await runWait(controller)).done
  assert.equal(causes.filter((e) => e.phase === 'wait-start').length, starts)
  actual.captureCurrentSavePayload()
  assert.deepEqual(errors, [])
  const proof = verifyRuntimeHandoffs({ causes, restoreCommits })
  assert.equal(proof.projections.length, 2, 'both actual scene restorations must remain available')
  const poseReceipts = causes.filter((event) => event.phase === 'runtime-projection-pose')
  for (const pose of poseReceipts) assertRestoredPoseHandoff(pose, proof)
  assert.throws(() =>
    assertRestoredPoseHandoff(poseReceipts[0], { projections: proof.projections.slice(1) }),
  )
  for (const change of [
    (p) => {
      p.sceneVisit++
    },
    (p) => {
      p.endOrder = poseReceipts[0].order
    },
    (p) => {
      p.poseReceipts[0].order++
    },
  ]) {
    const changed = structuredClone(proof)
    change(changed.projections[0])
    assert.throws(() => assertRestoredPoseHandoff(poseReceipts[0], changed))
  }
  assert.equal(checkDeferredOwners({ causes }).status, 'proved')
  const settledRead = causes.find((event) => event.phase === 'wait-remaining' && event.settled)
  assert(settledRead, 'actual post-deadline remaining getter must be exercised')
  for (const change of [
    (event) => {
      event.runId++
    },
    (event) => {
      event.settled = false
    },
    (event) => {
      event.remainingMs = 1
    },
    (event) => {
      event.phase = 'wait-end'
    },
    (event) => {
      event.phase = 'wait-pause'
    },
  ]) {
    const changed = structuredClone(causes)
    change(changed.find((event) => event.order === settledRead.order))
    assert.equal(checkDeferredOwners({ causes: changed }).status, 'rejected')
  }
  assert.equal(proof.consumed.length, 3)
  const zeroConsumed = proof.consumed.find((receipt) => receipt.remainingMs === 0),
    zeroCommand = causes.find(
      (event) =>
        event.phase === 'command' &&
        event.runId === zeroConsumed.runId &&
        event.occurrence?.id === zeroConsumed.occurrence.id,
    )
  assert.equal(
    verifyAutomaticWaitReceipt(zeroCommand, { causes }, { waits: [], handoffs: proof }),
    zeroConsumed.order,
  )
  assert.throws(
    () =>
      verifyAutomaticWaitReceipt(
        zeroCommand,
        { causes },
        { waits: [], handoffs: { ...proof, consumed: [] } },
      ),
    /verified zero remainder/,
  )
  for (const corrupt of [
    (e) => {
      e.runId++
    },
    (e) => {
      e.sceneVisit++
    },
    (e) => {
      e.occurrence.command.command.ms++
    },
  ]) {
    const changed = structuredClone(zeroCommand)
    corrupt(changed)
    assert.throws(
      () => verifyAutomaticWaitReceipt(changed, { causes }, { waits: [], handoffs: proof }),
      /verified zero remainder/,
    )
  }
  const extraDraw = {
    causes: structuredClone(causes),
    worldRenders: [{ order: zeroConsumed.order + 1 }],
  }
  for (const event of extraDraw.causes) if (event.order > zeroConsumed.order) event.order++
  assert.throws(
    () => verifyAutomaticWaitReceipt(zeroCommand, extraDraw, { waits: [], handoffs: proof }),
    /unexplained draw/,
  )
  assert(proof.consumed.every((e) => Number.isSafeInteger(e.runId)))
  assertReforgeRestoreInput({ causes, restoreCommits }, payload)
  for (const corrupt of [
    (trace) => {
      delete trace.restoreCommits[0].inputPayload
    },
    (trace) => {
      trace.restoreCommits[0].loadId++
    },
    (trace) => {
      trace.restoreCommits[0].inputPayload.sceneRuntime.s003.entities.e62.motion.explicitAnimation++
    },
    (trace) => {
      trace.causes = trace.causes.filter((event) => event.phase !== 'runtime-loaded')
    },
  ]) {
    const changed = structuredClone({ causes, restoreCommits })
    corrupt(changed)
    assert.throws(() => assertReforgeRestoreInput(changed, payload))
  }
  for (const corrupt of [
    (events) => {
      delete events.find((e) => e.phase === 'runtime-projection-pose').actualMotion
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-projection-pose').actualMotion.explicitAnimation++
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-stored').saved.automatic.e62.wait.remainingMs++
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-projection-start').cursors.e62.auto.cursor.resume
        .frames[0].index++
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-projection-start').snapshotId++
    },
    (events) => {
      const i = events.findIndex((e) => e.phase === 'runtime-wait-consumed' && e.origin)
      events.splice(i + 1, 0, structuredClone(events[i]))
    },
    (events) => {
      events.filter((e) => e.phase === 'wait-start')[1].ms = 200
    },
    (events) => {
      events.find((e) => e.phase === 'wait-remaining' && e.pausedRemaining !== null).remainingMs = 0
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-wait-consumed' && e.immediateId).waitId = 999
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-projection-pose').fixedFrame = 2
    },
    (events) => {
      for (let i = events.length - 1; i >= 0; i--)
        if (events[i].phase === 'runtime-projection-pose') events.splice(i, 1)
    },
    (events) => {
      events.splice(
        events.findIndex((e) => e.phase === 'runtime-save-assembled'),
        1,
      )
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-save-assembled').scenes.s003.entities.e62.fixedFrame =
        999
    },
    (events) => {
      const i = events.findIndex((e) => e.phase === 'runtime-wait-consumed')
      events.splice(i + 1, 0, structuredClone(events[i]))
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-captured').positions.e62.col = 999
    },
    (events) => {
      events.find((e) => e.phase === 'runtime-wait-consumed').runId++
    },
    (events) => {
      const loaded = events.find((e) => e.phase === 'runtime-loaded')
      loaded.saved.entities.e62.fixedFrame = 999
      loaded.input.entities.e62.fixedFrame = 999
    },
  ]) {
    const changed = structuredClone(causes)
    corrupt(changed)
    assert.throws(() => verifyRuntimeHandoffs({ causes: changed, restoreCommits }))
  }
  assert.throws(() => verifyRuntimeHandoffs({ causes }), /independently recorded restore/)

  // Real one-shot commit, scene capture/project and runner resume: the restored leaf must
  // cross main's continuation branch without submitting the relative displacement again.
  causes.length = 0
  deps.automaticWaits.clear()
  deps.restoredWaits.clear()
  autoActivations.clear()
  deps.motion.clearExplicitAnimation('e62')
  let stepController = activate()
  autoActivations.get('e62').epoch = 1
  globalThis.__openingCauseSnapshot = () => globalThis.__openingCauseWorld(deps.world)
  globalThis.__openingCauseLifecycleSnapshot = () => ({
    sceneSession: deps.motion.currentSceneSessionId('s003'),
    authority: Object.fromEntries(deps.motion.coordinator.authority),
    activations: [...autoActivations.values()].map((a) => ({
      entity: a.entityId,
      epoch: a.epoch,
      signal: a.controller.signal,
    })),
    restored: [],
  })
  const step = { kind: 'stepEntity', target: { scene: 's003', entity: 'e62' }, dir: 'down' }
  const stepFlow = compileBaseScriptFlow(
    {
      kind: 'stages',
      initial: 'initial',
      stages: [{ id: 'initial', body: [step], next: { kind: 'complete' } }],
    },
    { timing: 'auto', canonicalContentDigest: 'b'.repeat(64) },
  )
  cursor.resume = { digest: 'b'.repeat(64), frames: [{ index: 0 }] }
  const runStep = (resume) => {
    const runner = new ScriptRunnerCore(
      {
        execute(command, context, signal) {
          return actual.runAutoStepThroughContinuation(
            command.target.entity,
            command.dir,
            signal,
            context.autoMotionCheckpoint,
          )
        },
      },
      stepController.signal,
    )
    globalThis.__openingCauseBinding(runner, {
      kind: 'entity-behavior',
      scene: 's003',
      entity: 'e62',
      channel: 'auto',
      behavior: 'default',
      sceneSession: deps.motion.currentSceneSessionId('s003'),
    })
    return runner.runFlow(stepFlow, {
      self: step.target,
      cursor: cursor.at,
      ...(resume ? { resume } : {}),
      cursorController: {
        checkpointEnabled: true,
        reachSafePoint: () => 'continue',
        checkpoint(at, continuation) {
          cursor.at = at
          cursor.resume = structuredClone(continuation)
          return 'continue'
        },
      },
    })
  }
  globalThis.__openingCauseWorld(deps.world)
  globalThis.__openingCauseFrame({ now: 2000, realNow: 2000, frozen: false, stepping: false })
  deps.motion.advanceCadence(0, false)
  const originalStep = runStep()
  void originalStep.catch(() => {})
  await new Promise(setImmediate)
  const slot = deps.motion.coordinator.autoSlots.get('e62')
  assert(slot)
  globalThis.__openingCauseFrame({ now: 2100, realNow: 2100, frozen: false, stepping: false })
  assert(deps.motion.advanceCadence(100, false))
  const before = Object.values(entity.pos)
  entity.pos = (await server.ssrLoadModule('/src/entity-walk.ts')).stepEntityPos(
    entity.pos,
    step.dir,
  )
  canonicalScript.entityPos.s003 = { e62: structuredClone(entity.pos) }
  const displacement = {
    order: ++order,
    tick: deps.motion.worldTick,
    scene: 's003',
    sceneVisit: observedVisit,
    from: before.slice(0, 2),
    to: Object.values(entity.pos).slice(0, 2),
  }
  slot.commitAttempt()
  const draws = [
    {
      order: ++order,
      sceneVisit: observedVisit,
      causalFrame: causes.findLast((e) => e.phase === 'clock').clock,
    },
  ]
  assert.equal(cursor.resume.frames[0].control.phase, 'continuation')
  actual.cache()
  stepController.abort()
  await assert.rejects(originalStep)
  autoActivations.clear()
  observedVisit++
  deps.motion.coordinator.invalidateSceneSession()
  actual.applyWorldToScene()
  stepController = activate()
  autoActivations.get('e62').epoch = 2
  globalThis.__openingCauseWorld(deps.world)
  await runStep(structuredClone(cursor.resume))
  assert.equal(deps.motion.coordinator.autoSlots.size, 0)
  assert.deepEqual(Object.values(entity.pos).slice(0, 2), displacement.to)
  const resumedTrace = { causes, worldRenders: draws }
  const verifyResumed = (trace = resumedTrace, displacements = [displacement]) =>
    verifyStoryMotion(
      trace,
      verifyMotionSlotLifetimes(trace.causes),
      [step.target],
      () => displacements,
      verifyRuntimeHandoffs(trace),
    )
  assert.equal(verifyResumed().resumedOneShots.length, 1)
  for (const corrupt of [
    (trace) => {
      trace.causes = trace.causes.filter((e) => e.phase !== 'motion-slot-committed')
    },
    (trace) => {
      trace.causes.find((e) => e.phase === 'run-started' && e.resume).resume.frames[0].index++
    },
    (trace) => {
      trace.causes.find((e) => e.phase === 'run-started' && e.resume).resume.digest = 'c'.repeat(64)
    },
    (trace) => {
      trace.causes.find(
        (e) => e.phase === 'run-started' && e.resume,
      ).resume.frames[0].control.phase = 'done'
    },
    (trace) => {
      trace.causes.find((e) => e.phase === 'runtime-projection-start').snapshotId++
    },
    (trace) => {
      trace.causes.find((e) => e.phase === 'run-started' && e.resume).self.entity = 'other'
    },
    (trace) => {
      trace.causes.find((e) => e.phase === 'run-started' && e.resume).author.sceneSession = 's003:1'
    },
    (trace) => {
      trace.causes.find((e) => e.phase === 'run-started' && !e.resume).author.sceneSession =
        's003:2'
    },
    (trace) => {
      trace.causes = trace.causes.filter((e) => e.phase !== 'leaf-completed')
    },
  ]) {
    const changed = structuredClone(resumedTrace)
    corrupt(changed)
    assert.throws(() => verifyResumed(changed))
  }
  const resumedCommand = causes.findLast(
    (e) => e.phase === 'command' && e.occurrence?.command?.command?.kind === 'stepEntity',
  )
  assert.throws(
    () =>
      verifyResumed(resumedTrace, [
        displacement,
        {
          ...displacement,
          order: resumedCommand.order + 1,
          sceneVisit: observedVisit,
        },
      ]),
    /repeated relative displacement/,
  )
})
