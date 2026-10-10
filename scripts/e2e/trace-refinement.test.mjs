import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import ts from 'typescript'
import { assertActorRecording } from './actor-recording-contract.mjs'
import { authoredOwnership } from './automatic-lifecycle-contract.mjs'
import { cameraProfile, checkFollowCamera } from './camera-trace-model.mjs'
import {
  checkDialogueCorrespondence,
  checkGameDialogueCausality,
  checkOccurrenceLineage,
  sourceDialogueText,
} from './causal-recording-contract.mjs'
import { evidenceObserverScript } from './evidence-recorder.mjs'
import { gameNpcRequestedFrame } from './game-pose-semantics.mjs'
import { installInnObserver } from './inn-observer.mjs'
import { instrumentInnTrace } from './inn-trace-plugin.mjs'
import { checkTerminalSubdivision } from './motion-refinement.mjs'
import { installOpeningMatrix } from './opening-matrix-observer.mjs'
import { instrumentOpeningTrace } from './opening-trace-plugin.mjs'
import { checkPersistentEffects } from './persistent-effect-model.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { expectedScriptCommands, verifyFiniteScriptRuns } from './script-execution-contract.mjs'
import { storyExecutionSpecifications } from './story-execution-specs.mjs'
import {
  checkTransitionTrace,
  compareTimedObservations,
  requireTrace,
} from './trace-refinement.mjs'

const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))
async function runtime(t, name = 'reforge') {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-refinement-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL(`../../packages/${name}`, import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  })
  return server
}

function causalObserver(t) {
  const old = new Map(
    Object.entries(globalThis).filter(([key]) => key.startsWith('__openingCause')),
  )
  let order = 0
  const observer = createScriptCausalObserver({
    append: (list, event) => list.push(structuredClone({ ...event, order: ++order })),
    context: () => ({ scene: 'room', sceneVisit: 1, tick: 0, poses: {} }),
    snapshotGame: () => {},
    fail: (e) => {
      throw e
    },
    scenes: ['room'],
  })
  t.after(() => {
    for (const key of Object.keys(globalThis).filter((key) => key.startsWith('__openingCause')))
      if (old.has(key)) globalThis[key] = old.get(key)
      else delete globalThis[key]
  })
  return { read: observer.read, next: () => ++order }
}

test('001/002 actual projection commit captures each real selection immediately, with detached native state and scene identity', async (t) => {
  const server = await runtime(t),
    api = await server.ssrLoadModule('/src/script-world.ts'),
    { emptyWorldScriptState } = await server.ssrLoadModule('/../content/src/author-script-core.ts'),
    file = 'packages/reforge/src/main.ts',
    raw = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
    flow = { kind: 'stages', initial: 'a', stages: [{ id: 'a', body: [] }] }
  for (const [instrument, install, read] of [
    [instrumentOpeningTrace, installOpeningMatrix, '__readOpeningMatrix'],
    [instrumentInnTrace, installInnObserver, '__readInnEvidence'],
  ]) {
    const host = {},
      world = { party: [], script: emptyWorldScriptState() },
      entities = ['e3', 'e8', 'e10', 'e11'].map((id) => ({
        id,
        pos: { col: 0, row: 0, height: 0 },
        initialPage: 'home',
        pages: [{ id: 'home', trigger: 'a' }, { id: 'away' }],
        behaviors: {
          trigger: { a: { label: 'A', order: 0, flow }, b: { label: 'B', order: 1, flow } },
        },
      })),
      activeScene = { scene: { id: 's001', entities } },
      target = { scene: 's001', entity: 'e10' }
    new Function('globalThis', evidenceObserverScript(install, createScriptCausalObserver))(host)
    const transformed = instrument(raw, file).code,
      ast = ts.createSourceFile(file, transformed, ts.ScriptTarget.Latest, true),
      parts = []
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === '__openingPoint')
        parts.push(node.getText(ast))
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'refreshRuntimeProjection')
        parts.push(`const refreshRuntimeProjection = ${node.initializer.getText(ast)};`)
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.equal(parts.length, 2)
    const scope = {
      globalThis: host,
      world,
      activeScene,
      player: { pos: { col: 0, row: 0, height: 0 } },
      facing: 'down',
      motion: {
        worldTick: 1,
        gaitPhase: () => undefined,
        explicitAnimation: () => undefined,
        gaitOwner: () => undefined,
        gaitActivationOwner: () => undefined,
        lastMovedWorldTick: () => undefined,
      },
      motionRuntime: { authority: new Map() },
      autoMotionSlots: new Map(),
      scriptMotionSlots: new Map(),
      currentMotionSceneSessionId: () => 1,
      host: { getEntityState: () => 2 },
      worldPresentation: { renderedEntityFrame: () => 0, entityFrame: () => 0 },
      entityActions: { frame: () => 0 },
      runner: null,
      dialogBox: { active: false, observe: () => null },
      presentation: { busy: () => false },
      frames: { now: 0 },
      sceneRuntimeStates: {},
      syncRuntimeScriptScratch() {},
      isLifecycleRuntimeCommand: () => false,
      bumpEntityTriggerRevision() {},
      refreshCurrentCanonicalBindings() {},
      restartAutoRunner() {},
    }
    if (instrument === instrumentInnTrace) {
      const { WorldMotionRuntime } = await server.ssrLoadModule('/src/world-motion-runtime.ts')
      const { WorldScenePresentation } = await server.ssrLoadModule(
        '/src/world-scene-presentation.ts',
      )
      scope.motion = new WorldMotionRuntime(100)
      scope.motionRuntime = scope.motion.coordinator
      scope.autoMotionSlots = scope.motion.coordinator.autoSlots
      scope.scriptMotionSlots = scope.motion.coordinator.scriptSlots
      scope.worldPresentation = new WorldScenePresentation({})
      scope.worldPresentation.setEntityFrame('e10', 1)
      scope.motion.setExplicitAnimation('e10', 2)
    }
    const commit = new Function(
      'scope',
      `with(scope) { ${ts.transpile(parts.join('\n'), { target: ts.ScriptTarget.ES2022 })}; return refreshRuntimeProjection; }`,
    )(scope)
    const actorEvents = () =>
      (host[read]().actors ?? host[read]().events).filter(
        (e) => e.kind === 'actor' && e.id === 'e10',
      )
    for (const selection of [
      { kind: 'use', value: 'a' },
      { kind: 'use', value: 'b' },
      { kind: 'inherit' },
    ]) {
      api.selectEntityBehavior(world.script, entities[2], target, 'trigger', selection)
      commit({ kind: 'selectEntityBehavior', target, channel: 'trigger', selection })
      assert.deepEqual(
        actorEvents().at(-1).state.behavior?.trigger?.selection ?? null,
        selection.kind === 'inherit' ? null : selection,
      )
    }
    api.setEntityTriggerActivation(world.script, entities[2], target, {
      kind: 'use',
      value: { on: 'touch', range: 2 },
    })
    commit({ kind: 'setEntityTriggerActivation', target })
    api.selectBaseEntityPage(world.script, entities[2], target, { kind: 'use', value: 'away' })
    commit({ kind: 'selectEntityPage', target })
    const events = actorEvents(),
      last = events.at(-1)
    assert.deepEqual(
      events.map((e) => e.state.behavior?.trigger?.selection ?? null),
      [{ kind: 'use', value: 'a' }, { kind: 'use', value: 'b' }, null, null, null],
    )
    assert.equal(last.state.behavior.page, 'away')
    assert.equal(last.state.behavior.triggerActivation, undefined)
    assert.equal(last.state.behavior.auto?.selection, undefined)
    assert(
      events.every((e) => e.source === 'commit:refreshRuntimeProjection' && e.sceneVisit === 1),
    )
    assert(events.every((e, i) => i === 0 || e.order > events[i - 1].order))
    assertActorRecording(host[read](), 'reforge')
    if (instrument === instrumentInnTrace)
      assert.deepEqual(
        last.state.frameDebug,
        {
          override: 1,
          gait: null,
          gaitOwner: null,
          gaitActivationOwner: null,
          lastMovedWorldTick: null,
          explicit: 2,
          action: 0,
          authority: 'world',
          autoSlot: null,
          scriptSlot: null,
        },
        '002 actual instrumented commit must record independent frame inputs',
      )
    if (instrument === instrumentInnTrace) {
      scope.worldPresentation.clearEntityFrame('e10')
      scope.motion.markGait('e10', 'auto', 17)
      scope.motion.coordinator.setAuthority('e10', { kind: 'script' })
      commit({ kind: 'setEntityTriggerActivation', target })
      const actual = actorEvents().at(-1).state.frameDebug
      assert.deepEqual(
        [actual.override, actual.gait, actual.gaitOwner, actual.explicit, actual.authority],
        [null, 3, { source: 'auto', epoch: 17 }, null, 'script'],
        '002 records retained automatic inputs even while authority hides their draw',
      )
      assert.equal(last.state.frameDebug.override, 1, 'collector snapshot remains detached')
    }
    const missing = host[read](),
      list = missing.actors ?? missing.events
    delete list.find((e) => e.kind === 'actor' && e.id === 'e10').state.behavior
    assert.throws(() => assertActorRecording(missing, 'reforge'), /missing actor behavior/)
  }
})

test('001 actual Game snapshot preserves equal-visibility state and script changes; state-only overflow fails the producer gate', () => {
  const host = {}
  new Function(
    'globalThis',
    evidenceObserverScript(installOpeningMatrix, createScriptCausalObserver),
  )(host)
  const gs = {
    wNumScene: 2,
    frameNum: 1,
    party: { x: 0, y: 0, facing: 'down' },
    PlayerRolesRuntime: { rgwSpriteNum: [21] },
    partyMembers: [0],
    partyScriptedFrame: [],
    npcs: [3, 8, 10, 11].map((id) => ({
      id,
      x: 0,
      y: 0,
      facing: 'down',
      sState: 1,
      spriteNum: 21,
      triggerMode: 0,
    })),
  }
  gs.allEventObjects = gs.npcs
  for (const state of [1, 2, 1]) {
    gs.npcs[2].sState = state
    host.__openingMatrixGame(gs, 'commit:applyRawOpcode')
  }
  let trace = host.__readOpeningMatrix(),
    events = trace.actors.filter((e) => e.kind === 'actor' && e.id === 'e10')
  assert.deepEqual(trace.errors, [])
  assert.deepEqual(
    events.map((e) => e.state.state),
    [1, 2, 1],
  )
  assert(events.every((e) => e.state.visible))
  assertActorRecording(trace, 'game')
  gs.npcs[2].triggerResume = 7
  host.__openingMatrixGame(gs, 'commit:applyRawOpcode')
  assert.equal(
    host
      .__readOpeningMatrix()
      .actors.filter((e) => e.id === 'e10')
      .at(-1).state.resume,
    7,
  )
  delete events[0].state.state
  assert.throws(() => assertActorRecording(trace, 'game'), /missing numeric state/)
  for (let n = 0; n < 2401; n++) {
    gs.npcs[2].sState = (n % 2) + 1
    host.__openingMatrixGame(gs, 'commit:applyRawOpcode')
  }
  trace = host.__readOpeningMatrix()
  assert.throws(() => assertActorRecording(trace, 'game'), /overflow/)
})

test('actual causal observer permits repeated IP but rejects a lost, late or forged dispatch', (t) => {
  const baseline = new Function(
    'checkTransitionTrace',
    'requireTrace',
    'same',
    'causes',
    `return (${checkOccurrenceLineage})`,
  )(
    (model, events) => {
      const { copyState: _, ...plain } = model
      return checkTransitionTrace(plain, events)
    },
    requireTrace,
    isDeepStrictEqual,
    (trace) =>
      [...(trace.initialCauses ?? []), ...(trace.causes ?? [])].sort((a, b) => a.order - b.order),
  )
  const freeze = (value) => {
    if (value && typeof value === 'object') {
      Object.freeze(value)
      for (const child of Object.values(value)) freeze(child)
    }
    return value
  }
  const observer = causalObserver(t),
    owner = {},
    state = {},
    command = { op: 'raw', opcode: 9, operands: [1, 0, 0] }
  for (let i = 0; i < 2; i++) {
    globalThis.__openingCauseGame(state, 'command', owner, { ip: 42, command })
    globalThis.__openingCauseGame(state, 'event-after', owner, {})
  }
  const causes = observer.read()
  assert.equal(checkOccurrenceLineage({ causes }).status, 'proved')
  assert.deepEqual(checkOccurrenceLineage(freeze({ causes })), baseline({ causes }))
  for (const mutate of [
    (events) => events.splice(0, 1),
    (events) => {
      events[1].occurrence = null
    },
    (events) => {
      events[0].order = 2.5
    },
    (events) => {
      events[1].occurrence.command.operands[0] = 2
    },
  ]) {
    const copy = structuredClone(causes)
    mutate(copy)
    assert.equal(checkOccurrenceLineage({ causes: copy }).status, 'rejected')
    assert.deepEqual(checkOccurrenceLineage(freeze({ causes: copy })), baseline({ causes: copy }))
  }
})

test('actual Game dialog lifecycle binds source text, drawn page, consumption and cross-engine row identity', async (t) => {
  const server = await runtime(t, 'game'),
    api = await server.ssrLoadModule('/src/present/dialog-box.ts')
  const observer = causalObserver(t),
    owner = {},
    gs = {},
    raw = '$10甲-乙-\\"丙~20尾'
  assert.equal(sourceDialogueText(raw), api.parseDialogText(raw, 0x4f, false).text)
  globalThis.__openingCauseGame(gs, 'command', owner, {
    ip: 7,
    command: { op: 'setDialogStyleTop' },
  })
  globalThis.__openingCauseGame(gs, 'command', owner, {
    ip: 8,
    command: { op: 'showDialog', messageIndex: 9, text: raw },
  })
  gs.dialogBox = api.startDialogLine(raw, { now: 0, style: 'top' })
  api.tickDialog(gs.dialogBox, 10000)
  api.setWaitingEndKey(gs.dialogBox)
  globalThis.__openingCauseGame(gs, 'event-after', owner, {})
  const draw = { order: observer.next(), scene: 'room', sceneVisit: 1, renderId: 1 }
  const page = {
    order: observer.next(),
    scene: 'room',
    page: { lines: [gs.dialogBox.currentLineText], slot: 'top' },
  }
  globalThis.__openingCauseGame(gs, 'event-before', owner, {})
  const result = api.confirmDialog(gs.dialogBox, 10001)
  globalThis.__openingCauseGame(gs, 'dialog-input', owner, { result })
  const trace = { causes: observer.read(), worldRenders: [draw], pages: [page] }
  const good = checkGameDialogueCausality(trace)
  assert.equal(good.status, 'proved')
  assert.equal(good.consumptions, 1)
  const rf = {
    worldRenders: [draw],
    pages: [{ ...page, page: { pageTextIds: ['dlg.9'], pageText: page.page.lines.join('\n') } }],
  }
  assert.equal(checkDialogueCorrespondence(good, rf).status, 'proved')
  rf.pages[0].page.pageTextIds[0] = 'dlg.9.v-1234abcd'
  assert.equal(checkDialogueCorrespondence(good, rf).status, 'proved')
  for (const id of ['dlg.9', 'dlg.9.v-1234abcd']) {
    const wrong = structuredClone(rf)
    wrong.pages[0].page.pageTextIds[0] = id
    wrong.pages[0].page.pageText = '别的正文'
    assert.equal(checkDialogueCorrespondence(good, wrong).status, 'rejected')
  }
  for (const id of ['dlg.10', 'dlg.10.v-1234abcd']) {
    const wrong = structuredClone(rf)
    wrong.pages[0].page.pageTextIds[0] = id
    assert.equal(checkDialogueCorrespondence(good, wrong).status, 'rejected')
  }
  const absentText = structuredClone(rf)
  delete absentText.pages[0].page.pageText
  assert.equal(checkDialogueCorrespondence(good, absentText).status, 'unknown')
  const invalidId = structuredClone(rf)
  invalidId.pages[0].page.pageTextIds[0] = 'dlg.9.not-a-variant'
  assert.equal(checkDialogueCorrespondence(good, invalidId).status, 'unknown')
  rf.pages[0].page.pageTextIds[0] = 'dlg.10'
  assert.equal(checkDialogueCorrespondence(good, rf).status, 'rejected')
  const late = structuredClone(trace)
  late.pages[0].order = observer.next()
  assert.equal(checkGameDialogueCausality(late).witness.rule, 'dialogue-first-draw-coverage')
  const wrongText = structuredClone(trace)
  wrongText.pages[0].page.lines[0] = '别的字'
  assert.equal(checkGameDialogueCausality(wrongText).witness.rule, 'dialogue-page-state')
  const narration = {},
    secondOwner = {}
  globalThis.__openingCauseGame(narration, 'command', secondOwner, {
    ip: 10,
    command: { op: 'setDialogStyleNarration' },
  })
  globalThis.__openingCauseGame(narration, 'command', secondOwner, {
    ip: 11,
    command: { op: 'showDialog', messageIndex: 10, text: '得到物品' },
  })
  narration.dialogBox = api.startDialogLine('得到物品', { now: 10002, style: 'narration' })
  assert.equal(narration.dialogBox.charsRevealed, 0)
  globalThis.__openingCauseGame(narration, 'event-after', secondOwner, {})
  trace.worldRenders.push({ ...draw, order: observer.next(), renderId: 2 })
  trace.pages.push({
    order: observer.next(),
    scene: 'room',
    page: { lines: ['得到物品'], slot: 'narration' },
  })
  trace.worldRenders.push({ ...draw, order: observer.next(), renderId: 3 })
  assert.equal(checkGameDialogueCausality(trace).status, 'proved')
  const lateNarration = structuredClone(trace)
  lateNarration.pages[1].order = observer.next()
  assert.equal(
    checkGameDialogueCausality(lateNarration).witness.rule,
    'dialogue-first-draw-coverage',
  )
})

test('persistent override model consumes actual world selection effects, inherit and page reset; missing evidence never proves effects', async (t) => {
  const server = await runtime(t),
    api = await server.ssrLoadModule('/src/script-world.ts')
  const { emptyWorldScriptState } = await server.ssrLoadModule(
    '/../content/src/author-script-core.ts',
  )
  const target = { scene: 'room', entity: 'person' },
    flow = { kind: 'stages', initial: 'a', stages: [{ id: 'a', body: [] }] }
  const entity = {
    id: 'person',
    pos: { col: 0, row: 0, height: 0 },
    initialPage: 'home',
    pages: [{ id: 'home', trigger: 'talk' }, { id: 'away' }],
    behaviors: { trigger: { talk: { label: 'Talk', order: 0, flow } } },
  }
  const world = emptyWorldScriptState(),
    trace = {
      initialEvents: [
        {
          kind: 'scene',
          order: 0,
          scene: 'room',
          sceneVisit: 1,
          source: 'commit:scene-materialized',
        },
      ],
      causes: [],
      events: [],
    }
  const apply = (command, run) => {
    const order = trace.causes.length * 2 + 1
    trace.causes.push({
      phase: 'command',
      order,
      runId: 1,
      scene: 'room',
      sceneVisit: 1,
      engine: 'reforge',
      world: { script: structuredClone(world) },
      worldSource: 'observe:causal',
      poses: trace.events.length
        ? {
            person: {
              state: structuredClone(trace.events.at(-1).state),
              commitOrder: trace.events.at(-1).order,
            },
          }
        : {},
      occurrence: {
        id: trace.causes.length + 1,
        command: { kind: 'leaf', command: { ...command, target } },
      },
    })
    run()
    trace.events.push({
      kind: 'actor',
      order: order + 1,
      scene: target.scene,
      sceneVisit: 1,
      source: 'observe:causal',
      id: target.entity,
      state: { state: 1, behavior: structuredClone(world.behaviors.entities.room.person) },
    })
  }
  for (const selection of [
    { kind: 'disabled' },
    { kind: 'inherit' },
    { kind: 'use', value: 'talk' },
  ])
    apply({ kind: 'selectEntityBehavior', channel: 'trigger', selection }, () =>
      api.selectEntityBehavior(world, entity, target, 'trigger', selection),
    )
  const activation = { kind: 'use', value: { on: 'touch', range: 2 } }
  apply({ kind: 'setEntityTriggerActivation', selection: activation }, () =>
    api.setEntityTriggerActivation(world, entity, target, activation),
  )
  const page = { kind: 'use', value: 'away' }
  apply({ kind: 'selectEntityPage', selection: page }, () =>
    api.selectBaseEntityPage(world, entity, target, page),
  )
  trace.causes.push({
    phase: 'stage-settled',
    decision: 'continue',
    order: trace.events.at(-1).order + 1,
    runId: 1,
    scene: 'room',
    sceneVisit: 1,
    engine: 'reforge',
    worldSource: 'observe:causal',
    world: { script: structuredClone(world) },
    poses: {
      person: {
        state: structuredClone(trace.events.at(-1).state),
        commitOrder: trace.events.at(-1).order,
      },
    },
  })
  assert.equal(checkPersistentEffects(trace, [target]).status, 'proved')
  const wrong = structuredClone(trace)
  wrong.causes[3].world.script.behaviors.entities.room.person.trigger.selection = {
    kind: 'disabled',
  }
  assert.equal(checkPersistentEffects(wrong, [target]).witness.rule, 'persistent-effect-deadline')
  const reset = structuredClone(trace)
  reset.causes.at(-1).world.script.behaviors.entities.room.person.triggerActivation = activation
  assert.equal(checkPersistentEffects(reset, [target]).status, 'rejected')
  const missing = structuredClone(trace)
  for (const e of missing.causes) delete e.world
  assert.equal(checkPersistentEffects(missing, [target]).status, 'unknown')
  const anonymous = structuredClone(trace)
  delete anonymous.causes[3].worldSource
  assert.equal(checkPersistentEffects(anonymous, [target]).status, 'unknown')
  const late = structuredClone(trace)
  // Preserve the final value, but delay the first selection past its own next command.
  late.causes[1].world = structuredClone(late.causes[0].world)
  assert.equal(checkPersistentEffects(late, [target]).status, 'rejected')
  const offscene = structuredClone(trace)
  for (const event of offscene.causes) {
    event.scene = 'elsewhere'
    event.poses = {}
  }
  assert.equal(checkPersistentEffects(offscene, [target]).status, 'proved')
  offscene.causes[1].world = structuredClone(offscene.causes[0].world)
  assert.equal(
    checkPersistentEffects(offscene, [target]).status,
    'rejected',
    'returning later cannot repair a late offscene effect',
  )
  const noOp = structuredClone(trace)
  noOp.causes[0].world = structuredClone(noOp.causes[1].world)
  assert.equal(
    checkPersistentEffects(noOp, [target]).status,
    'proved',
    'writing the existing value needs no new delta',
  )
  const notSampled = structuredClone(trace)
  for (const event of notSampled.causes) event.poses = {}
  assert.equal(checkPersistentEffects(notSampled, [target]).status, 'proved')
  const borrowed = structuredClone(trace)
  for (const event of borrowed.causes) event.order *= 2
  borrowed.causes.splice(1, 0, {
    ...structuredClone(borrowed.causes[0]),
    order: borrowed.causes[0].order + 1,
    runId: 2,
  })
  assert.equal(checkPersistentEffects(borrowed, [target]).witness.rule, 'effect-competing-write')
  const preexistingWriter = structuredClone(trace)
  preexistingWriter.initialCauses = [{ ...structuredClone(trace.causes[0]), order: 0, runId: 2 }]
  assert.equal(
    checkPersistentEffects(preexistingWriter, [target]).witness.rule,
    'effect-competing-write',
  )
  const cancelled = structuredClone(trace)
  cancelled.causes.at(-1).world = structuredClone(cancelled.causes.at(-2).world)
  cancelled.causes.at(-1).phase = 'run-ended'
  cancelled.causes.at(-1).aborted = true
  assert.equal(
    checkPersistentEffects(cancelled, [target]).witness.rule,
    'effect-uncompleted-prefix',
  )
  const sceneExit = structuredClone(trace)
  sceneExit.causes[1].occurrence.command = {
    kind: 'leaf',
    command: { kind: 'loadScene', scene: 'elsewhere' },
  }
  assert.equal(checkPersistentEffects(sceneExit, [target]).status, 'proved')
  sceneExit.causes[1].world = structuredClone(sceneExit.causes[0].world)
  assert.equal(checkPersistentEffects(sceneExit, [target]).status, 'rejected')
})

test('finite author model accepts actual compiler/runner entry and nested repetition; every lost command is a counterexample', async (t) => {
  const server = await runtime(t)
  const { ScriptRunnerCore } = await server.ssrLoadModule('/src/script-runner-core.ts')
  const { compileBaseScriptFlow } = await server.ssrLoadModule('/src/script-compiler-core.ts')
  const target = { scene: 'room', entity: 'someone' }
  const flow = {
    kind: 'stages',
    initial: 'hello',
    stages: [
      {
        id: 'hello',
        entry: { prepare: [{ kind: 'takeEntity', target }], reveal: { kind: 'cut' } },
        body: [
          {
            kind: 'repeat',
            count: 2,
            label: 'editor-only label',
            body: [
              { kind: 'setEntityFacing', target, facing: 'left' },
              { kind: 'repeat', count: 2, body: [{ kind: 'setEntityFrame', target, frame: 1 }] },
            ],
          },
          { kind: 'releaseEntity' },
          { kind: 'stepEntity', target, dir: 'down' },
        ],
        next: { kind: 'complete' },
      },
    ],
  }
  const executed = []
  const runner = new ScriptRunnerCore(
    { execute: (command) => executed.push(command), revealSceneEntry: async () => {} },
    new AbortController().signal,
  )
  const events = []
  runner.onStep = (step) =>
    events.push({
      phase: 'command',
      engine: 'reforge',
      scene: 'room',
      sceneVisit: 1,
      order: events.length + 1,
      runId: 7,
      occurrence: {
        ...structuredClone(step),
        id: events.length + 1,
        self: null,
        timing: 'interactive',
        scope: 'flow',
      },
    })
  await runner.runFlow(
    compileBaseScriptFlow(flow, {
      timing: 'interactive',
      canonicalContentDigest: 'd'.repeat(64),
      allowSceneEntry: true,
    }),
    {
      runSceneEntry: true,
      allowSceneEntry: true,
      cursorController: { reachSafePoint: () => 'continue' },
    },
  )
  assert.equal(executed.length, 9)
  const specifications = [
    { name: 'arbitrary scene', scene: 'room', self: null, timing: 'interactive', flow },
  ]
  assert.equal(verifyFiniteScriptRuns(events, specifications)[0].commands, events.length)
  for (let i = 0; i < events.length; i++)
    assert.throws(
      () =>
        verifyFiniteScriptRuns(
          events.filter((_, j) => i !== j),
          specifications,
        ),
      /execution-transition|execution-complete/,
    )
  for (const mutate of [
    (copy) => copy.splice(2, 0, structuredClone(copy[2])),
    (copy) => {
      ;[copy[2], copy[3]] = [copy[3], copy[2]]
    },
    (copy) => {
      copy[2].occurrence.self = target
    },
    (copy) => {
      copy[2].occurrence.command.command.facing = 'right'
    },
    (copy) => {
      copy[1].occurrence.command.count++
    },
  ]) {
    const copy = structuredClone(events)
    mutate(copy)
    assert.throws(() => verifyFiniteScriptRuns(copy, specifications), /execution-/)
  }
  assert.throws(() => verifyFiniteScriptRuns([], specifications), /required finite run/)
})

test('all six independent author paths are supported before any matching recording is available', () => {
  for (const fragment of ['001', '002', '003', '004', '005', '006']) {
    for (const spec of storyExecutionSpecifications(fragment))
      assert(expectedScriptCommands(spec).length > 0, spec.name)
  }
  const spec = structuredClone(
    storyExecutionSpecifications('006').find((s) => s.name === '上岛后逍遥与张四告别'),
  )
  spec.flow.stages.find((s) => s.id === spec.flow.initial).body.unshift({ kind: 'futureEffect' })
  assert.throws(() => expectedScriptCommands(spec), /unsupported command/)
})

test('persistent own-deadline proof checks real host money, inventory, music and appearance effects before the next command', async (t) => {
  const server = await runtime(t)
  const { executeScriptHostEffect } = await server.ssrLoadModule('/src/script-host-adapter.ts')
  const { removeOwnedItems } = await server.ssrLoadModule('/../content/src/item.ts')
  const source = readFileSync(
    new URL('../../packages/reforge/src/main.ts', import.meta.url),
    'utf8',
  )
  const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true)
  let declaration
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(ast) === 'host' &&
      node.type?.getText(ast) === 'ScriptHost'
    )
      declaration = node
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert(declaration)
  const world = {
    script: {},
    money: 500,
    inventory: [],
    party: [{ template: 'li-xiaoyao', equipment: {} }],
  }
  const intent = { capture: () => 1, begin: () => 1, assertCurrent: () => {} }
  const deps = {
    world,
    removeOwnedItems,
    worldMutationIntent: intent,
    scriptMutationIntent: intent,
    actorAppearanceMutationIntents: new Map(),
    actorMutationIntent: () => intent,
    assertRunnerActive: (signal) => signal.throwIfAborted(),
    awaitRunner: async (p) => p,
    atScriptMutation: (_signal, run) => run(),
    prepareItemSounds: async () => {},
    requireSpriteDef: (id) => ({ asset: id }),
    spriteCache: { load: async () => [] },
    project: { assetResolver: {} },
    bgm: { play: () => {}, stop: () => {} },
    asyncIntentAbortError: (message) => new Error(message),
  }
  const kinds = [
    'giveMoney',
    'giveItem',
    'loseItem',
    'playMusic',
    'stopMusic',
    'setActorAppearance',
  ]
  const host = {}
  for (const name of kinds) {
    const method = declaration.initializer.properties.find((p) => p.name?.getText(ast) === name)
    assert(method)
    const code = ts.transpile(`const actual = ${method.initializer.getText(ast)};`, {
      target: ts.ScriptTarget.ES2022,
    })
    host[name] = new Function(...Object.keys(deps), `${code};return actual`)(...Object.values(deps))
  }
  const commands = [
    { kind: 'giveMoney', delta: 50 },
    { kind: 'giveItem', itemId: '272', count: 1 },
    { kind: 'loseItem', itemId: '272', count: 1 },
    { kind: 'playMusic', asset: 'music-005' },
    { kind: 'stopMusic' },
    { kind: 'setActorAppearance', actor: 'li-xiaoyao', spriteId: 'sprite-208' },
  ]
  const trace = { causes: [], events: [] }
  const observe = (phase, command) =>
    trace.causes.push({
      phase,
      order: trace.causes.length + 1,
      runId: 1,
      engine: 'reforge',
      scene: 's001',
      sceneVisit: 1,
      worldSource: 'observe:causal',
      world: structuredClone(world),
      ...(phase === 'stage-settled' ? { decision: 'continue' } : {}),
      occurrence: { id: trace.causes.length + 1, command: { kind: 'leaf', command } },
    })
  for (const command of commands) {
    observe('command', command)
    await executeScriptHostEffect(
      host,
      command,
      { timing: 'interactive' },
      new AbortController().signal,
      { currentSceneId: () => 's001' },
    )
  }
  observe('stage-settled', commands.at(-1))
  const result = checkPersistentEffects(trace, [])
  assert.equal(result.status, 'proved')
  assert.equal(result.checked, 6)
  for (const index of commands.keys()) {
    const changed = structuredClone(trace)
    changed.causes[index + 1].world = structuredClone(trace.causes[index].world)
    assert.equal(checkPersistentEffects(changed, []).status, 'rejected', commands[index].kind)
  }
  const missing = structuredClone(trace)
  delete missing.causes[0].world
  assert.equal(checkPersistentEffects(missing, []).status, 'unknown')
})

test('party replacement retains live instances and seeds new templates; relative positioning uses actual host coordinates', async (t) => {
  const server = await runtime(t)
  const { applySetParty, instantiate } = await server.ssrLoadModule('/../content/src/character.ts')
  const { BaseProjectScriptRuntimeHost } = await server.ssrLoadModule('/src/script-project-core.ts')
  const actors = JSON.parse(
    readFileSync(new URL('../../projects/pal/content/actors.json', import.meta.url)),
  )
  const templates = Object.fromEntries(actors.map((a) => [a.id, a]))
  const [first, second] = actors
    .filter((a) => a.battler)
    .slice(0, 2)
    .map((a) => a.id)
  const world = {
    script: {},
    party: [instantiate(templates[first])],
    reserve: [],
    learnedSkills: { [first]: [] },
  }
  world.party[0].hp = 1
  const trace = { causes: [] }
  const observe = (phase, command, poses = {}) =>
    trace.causes.push({
      phase,
      order: trace.causes.length + 1,
      runId: 1,
      engine: 'reforge',
      scene: 's004',
      sceneVisit: 1,
      worldSource: 'observe:causal',
      world: structuredClone(world),
      decision: 'continue',
      poses,
      occurrence: { id: trace.causes.length + 1, command: { kind: 'leaf', command } },
    })
  for (const members of [[first, second], [second], [first, second]]) {
    observe('command', { kind: 'setParty', members })
    applySetParty(world, members, templates)
  }
  observe('stage-settled')
  assert.equal(checkPersistentEffects(trace, []).status, 'proved')
  for (const field of ['party', 'reserve', 'learnedSkills']) {
    const wrong = structuredClone(trace)
    const index = field === 'reserve' ? 2 : 1
    wrong.causes[index].world[field] = structuredClone(trace.causes[index - 1].world[field])
    assert.equal(checkPersistentEffects(wrong, []).status, 'rejected', field)
  }
  trace.causes = []
  const source = readFileSync(
    new URL('../../packages/reforge/src/main.ts', import.meta.url),
    'utf8',
  )
  const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true)
  let resolver
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'entityPosRelativeToParty')
      resolver = node.initializer
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert(resolver)
  const player = { pos: { col: 140, row: 26.5, height: 0 } },
    entity = { id: 'e83', pos: { col: 0, row: 0, height: 0 } }
  const resolvePosition = new Function(
    'player',
    'activeScene',
    `${ts.transpile(`const resolver=${resolver.getText(ast)};`, { target: ts.ScriptTarget.ES2022 })};return resolver`,
  )(player, { scene: { id: 's004', entities: [entity] } })
  const command = {
    kind: 'setEntityPosRelParty',
    target: { scene: 's004', entity: 'e83' },
    dcol: -0.5,
    drow: 7.5,
  }
  observe('command', command, {
    party: { state: { position: [140, 26.5, 0] } },
    e83: { state: { position: [0, 0, 0] } },
  })
  const host = new BaseProjectScriptRuntimeHost(
    world.script,
    {},
    { entityPosRelativeToParty: resolvePosition, executeEffect: () => {} },
  )
  await host.execute(command, {}, new AbortController().signal)
  observe('stage-settled')
  assert.equal(checkPersistentEffects(trace, []).status, 'proved')
  trace.causes.at(-1).world.script.entityPos.s004.e83.col++
  assert.equal(checkPersistentEffects(trace, []).status, 'rejected')
})

test('authority effect projection follows actual host-adapter dispatch for implicit and explicit NPC takes', async (t) => {
  const server = await runtime(t)
  const { executeScriptHostEffect } = await server.ssrLoadModule('/src/script-host-adapter.ts')
  const self = { scene: 'room', entity: 'self' },
    target = { scene: 'room', entity: 'target' }
  for (const kind of [
    'takeEntity',
    'moveEntity',
    'stepEntity',
    'nudgeEntity',
    'chasePlayer',
    'releaseEntity',
    'setEntityFrame',
  ]) {
    const calls = []
    const command = {
      kind,
      target,
      to: { col: 1, row: 2, height: 0 },
      speed: 'normal',
      frame: 0,
      dir: 'left',
      dx: 0,
      dy: 0,
    }
    const host = Object.fromEntries(
      [
        'takeEntity',
        'moveEntity',
        'stepEntity',
        'nudgeEntity',
        'chaseStep',
        'releaseEntity',
        'setEntityFrame',
      ].map((name) => [name, (id) => calls.push({ name, id })]),
    )
    await executeScriptHostEffect(host, command, { self }, new AbortController().signal, {
      currentSceneId: () => 'room',
    })
    const start = { scene: 'room', occurrence: { self }, lifecycle: { authority: {} } }
    const effect = authoredOwnership(command, start)
    assert.deepEqual(calls, [
      {
        name: kind === 'chasePlayer' ? 'chaseStep' : kind,
        id: kind === 'chasePlayer' ? 'self' : 'target',
      },
    ])
    assert.deepEqual(
      effect,
      kind === 'setEntityFrame'
        ? {}
        : { [calls[0].id]: kind === 'releaseEntity' ? null : { kind: 'script' } },
    )
    if (kind !== 'chasePlayer')
      assert.deepEqual(
        authoredOwnership({ ...command, target: { ...target, scene: 'other' } }, start),
        {},
      )
  }
  assert.throws(
    () =>
      authoredOwnership(
        { kind: 'futureEffect' },
        { scene: 'room', occurrence: { self }, lifecycle: { authority: {} } },
      ),
    /unclassified-authority-command/,
  )
})

test('Game frame abstraction agrees with actual renderer pixels for directional and nondirectional layouts', async (t) => {
  const server = await runtime(t, 'game')
  const { presentFrame } = await server.ssrLoadModule('/src/present/present.ts')
  const { createFramebuffer } = await server.ssrLoadModule('/src/present/framebuffer.ts')
  const { createInitialGameState } = await server.ssrLoadModule('/src/core/game-state.ts')
  const sprite = (index) => ({
    width: 16,
    height: 24,
    indices: new Uint8Array(384).fill(index),
    opaque: new Uint8Array(384).fill(1),
    anchorX: 8,
    anchorY: 24,
  })
  const frames = Array.from({ length: 14 }, (_, index) => sprite(index + 10))
  for (const [layout, local, facing] of [
    [3, 2, 'left'],
    [3, 3, 'up'],
    [0, 2, 'right'],
    [0, 13, 'left'],
    [1, 0, 'up'],
  ]) {
    const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
    gs.npcs = [
      {
        id: 42,
        x: 100,
        y: 100,
        spriteNum: 193,
        sState: 1,
        nSpriteFrames: layout,
        scriptedFrame: local,
        facing,
      },
    ]
    const fb = createFramebuffer()
    presentFrame(fb, gs, {
      tilemap: {
        width: 20,
        height: 20,
        cells: Array.from({ length: 20 }, () =>
          Array.from({ length: 20 }, () => ({ lower: 0, upper: 0 })),
        ),
        tileset: 'fixture',
      },
      tileImages: { get: () => undefined },
      partyFrames: [sprite(250)],
      partyWalkFrames: 3,
      npcSprites: new Map([[193, frames[0]]]),
      npcSpriteFrames: new Map([[193, frames]]),
    })
    const colors = [...new Set(fb.indices)].filter((n) => n !== 0 && n !== 250)
    assert.deepEqual(colors, [gameNpcRequestedFrame(layout, local, facing) + 10])
  }
})

test('terminal subdivision is an exact, direction-independent relation over motion and every actual draw', async (t) => {
  const server = await runtime(t)
  const { walkTick } = await server.ssrLoadModule('/src/entity-walk.ts')
  const spec = {
    rule: 'normal-half-step',
    target: [0, 1],
    facing: 'down',
    sprite: 21,
    framesPerDirection: 3,
  }
  const middle = walkTick({ col: 0, row: 0.5, height: 0 }, { col: 0, row: 1, height: 0 }, 'normal')
  assert.deepEqual(middle, { pos: { col: 0, row: 0.875, height: 0 }, facing: 'down', done: false })
  assert.equal(walkTick(middle.pos, { col: 0, row: 1, height: 0 }, 'normal').done, true)
  const fixture = (split) => {
    const values = split ? [0.5, middle.pos.row, 1] : [0.5, 1]
    const moves = values.map((row, i) => ({
      scene: 'any',
      sceneVisit: 7,
      order: i * 10 + 1,
      tick: i + 1,
      from: [0, values[i - 1] ?? 0.125],
      to: [0, row],
    }))
    const renders = moves.map((m, i) => ({
      scene: m.scene,
      sceneVisit: m.sceneVisit,
      order: m.order + 1,
      renderId: i + 1,
      tick: m.tick,
      atMs: i * 100,
      position: m.to,
      facing: 'down',
      frame: split && i === 1 ? 1 : 0,
      visible: true,
      frameSource: 'drawn',
      drawStatus: 'drawn',
      geometry: { worldRect: [-16 * m.to[1] - 10, 8 * m.to[1] + 7 - 47, 20, 47] },
    }))
    return {
      moves,
      renders,
      states: moves.map((m) => ({
        ...m,
        state: { position: [...m.to, 0], sprite: 21, visible: true, facing: 'down' },
      })),
      worldRenders: renders.map((r) => ({
        ...r,
        view: { transform: [1, 0, 0, 1, 0, 0], camera: [-100, -100], canvasSize: [320, 200] },
      })),
    }
  }
  const game = fixture(false),
    reforge = fixture(true)
  const verify = (b) =>
    checkTerminalSubdivision({ ...game, sprite: (x) => x }, { ...b, sprite: (x) => x }, spec)
  assert.equal(verify(reforge).status, 'proved')
  for (const change of [
    (x) => {
      x.moves[1].to[1] += 0.125
    },
    (x) => {
      x.moves[1].tick++
    },
    (x) => {
      x.renders[1].frame = 0
    },
    (x) => {
      x.renders[1].position[0] = 1
    },
    (x) => {
      x.renders.splice(1, 1)
    },
    (x) => {
      x.states[1].state.visible = false
    },
  ]) {
    const copy = structuredClone(reforge)
    change(copy)
    assert.notEqual(verify(copy).status, 'proved')
  }
})

test('follow-camera evidence is tied to party commits, not to its own projected rectangles', async (t) => {
  const server = await runtime(t)
  const { WorldCamera } = await server.ssrLoadModule('/src/world-camera.ts')
  let position = { col: 40, row: 10, height: 0 }
  const camera = new WorldCamera(
    () => position,
    () => ({ minX: 0, minY: 0, maxX: 4096, maxY: 4096 }),
  )
  const trace = { events: [], worldRenders: [], renderScope: { afterOrder: -1, throughOrder: 8 } }
  const positions = [
    [40, 10],
    [41, 10],
    [0, 0],
    [600, 10],
  ]
  const profile = () => ({
    limits: [
      [0, 3776],
      [0, 3896],
    ],
    sources: {},
  })
  for (const [i, [col, row]] of positions.entries()) {
    position = { ...position, col, row }
    camera.update()
    trace.events.push({
      kind: 'actor',
      id: 'party',
      scene: 'room',
      sceneVisit: 1,
      order: i * 2 + 1,
      state: { position: [position.col, position.row, 0] },
    })
    trace.worldRenders.push({
      scene: 'room',
      sceneVisit: 1,
      order: i * 2 + 2,
      renderId: i + 1,
      view: {
        camera: { ...camera.position },
        transform: [4, 0, 0, 4, 0, 0],
        canvasSize: [1280, 800],
      },
    })
  }
  assert.equal(checkFollowCamera(trace, 'reforge', profile).status, 'proved')
  for (const change of [
    (x) => {
      x.worldRenders[1].view.camera.x += 16
    },
    (x) => {
      x.worldRenders[1].view.canvasSize[0]++
    },
    (x) => {
      x.events.pop()
    },
  ]) {
    const copy = structuredClone(trace)
    change(copy)
    assert.equal(checkFollowCamera(copy, 'reforge', profile).status, 'rejected')
  }
  assert.deepEqual(cameraProfile('s005', 'reforge').limits, [
    [-32, 1760],
    [-40, 1864],
  ])
  assert.deepEqual(cameraProfile('s005', 'game').limits, [
    [0, 2016],
    [0, 2032],
  ])
})

test('timed observation quotient ignores duplicate draws but preserves every pose change and its duration', () => {
  const pose = (frame) => ({ position: [1, 2], facing: 'left', frame })
  const a = {
    complete: true,
    duration: 200,
    samples: [
      { time: 0, state: pose(0) },
      { time: 100, state: pose(1) },
    ],
  }
  const b = {
    ...a,
    samples: [
      a.samples[0],
      { time: 20, state: pose(0) },
      a.samples[1],
      { time: 150, state: pose(1) },
    ],
  }
  const fields = ['position', 'facing', 'frame']
  assert.equal(compareTimedObservations(a, b, fields).status, 'proved')
  for (const mutate of [
    (copy) => {
      copy.samples[2].state.frame = 2
    },
    (copy) => {
      copy.samples[2].state.position[0]++
    },
    (copy) => {
      copy.samples[2].time++
    },
    (copy) => {
      copy.duration++
    },
  ]) {
    const copy = structuredClone(b)
    mutate(copy)
    assert.equal(compareTimedObservations(a, copy, fields).status, 'rejected')
  }
  const incomplete = structuredClone(b)
  delete incomplete.samples[1].state.frame
  assert.equal(compareTimedObservations(a, incomplete, fields).status, 'unknown')
  assert.equal(compareTimedObservations(a, { ...b, complete: false }, fields).status, 'unknown')
})
