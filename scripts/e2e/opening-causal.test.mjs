import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { sourceAutomaticLanguage } from './automatic-language-contract.mjs'
import { verifyBoundAutomaticRuns, verifyBoundSourceCalls } from './automatic-language-receipts.mjs'
import { checkGameDialogueCausality, checkOccurrenceLineage } from './causal-recording-contract.mjs'
import { verifyDialoguePresentation } from './dialogue-presentation-contract.mjs'
import { evidenceObserverScript } from './evidence-recorder.mjs'
import { verifyGameAutoBatches, verifyGameAutoCycles } from './game-auto-contract.mjs'
import { checkLoopControl } from './loop-control-contract.mjs'
import {
  verifyDialoguePreparation,
  verifyOpeningDialogue,
  verifyOpeningDrawClocks,
  verifyOpeningGameDialogue,
  verifyOpeningMotionCadence,
  verifyOpeningWaitReceipt,
} from './opening-hold-intent.mjs'
import { installOpeningMatrix } from './opening-matrix-observer.mjs'
import { instrumentOpeningTrace, openingTracePlugin } from './opening-trace-plugin.mjs'
import { checkPersistentEffects } from './persistent-effect-model.mjs'
import { verifyRestoredPosition } from './restored-automatic-cycle.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { checkScriptInvocations } from './script-invocation-contract.mjs'
import { verifyScriptTerminalReceipt } from './script-terminal-intent.mjs'
import { checkStoryExecutions } from './story-execution-contract.mjs'
import {
  verifyStoryHolds,
  verifyStoryWaits,
  verifyStoryWorkIO,
} from './story-presentation-intent.mjs'

const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))

test('actual Game overlay records a full-page witness only after successful drawing', async () => {
  const file = 'packages/game/src/present/present.ts'
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = instrumentOpeningTrace(source, file).code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const declaration = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'drawDialogOverlay',
  )
  assert(declaration)
  const js = ts.transpile(declaration.getText(ast), { target: ts.ScriptTarget.ES2022 })
  const failure = new Error('actual overlay failed')
  let witnesses = 0,
    failDraw = false
  const overlay = new Function('globalThis', 'drawDialogBox', `${js}; return drawDialogOverlay;`)(
    { __openingMatrixGameRendered: () => witnesses++ },
    () => {
      if (failDraw) throw failure
    },
  )
  const state = { dialogBox: { phase: 'waiting-end-key', shownLines: ['你好'] } }
  overlay({}, state, {})
  assert.equal(witnesses, 1)
  failDraw = true
  assert.throws(
    () => overlay({}, state, {}),
    (error) => error === failure,
  )
  assert.equal(witnesses, 1, 'failed draw must not acquire a successful page witness')
  assert.throws(
    () =>
      instrumentOpeningTrace(
        source.replace('const dialogCtx:', 'return;\n const dialogCtx:'),
        file,
      ),
    /unobserved early return/,
  )
})

test('automatic wait receipts preserve remaining time across a real take/release, rejecting lost time and missing ownership', () => {
  const self = { scene: 's003', entity: 'e62' }
  const occurrence = {
    id: 7,
    self,
    timing: 'auto',
    command: { kind: 'leaf', command: { kind: 'wait', ms: 1300 } },
  }
  const start = {
    phase: 'wait-start',
    engine: 'reforge',
    order: 1,
    runId: 1,
    waitId: 3,
    ms: 1300,
    now: 100,
    deadline: 1400,
    clock: { frameId: 1, now: 100 },
    occurrence,
  }
  const authority = (kind, order) => ({
    phase: 'command',
    order,
    runId: 2,
    occurrence: { command: { kind: 'leaf', command: { kind, target: self } } },
  })
  const events = [
    start,
    authority('takeEntity', 3),
    {
      phase: 'wait-pause',
      order: 4,
      runId: 1,
      waitId: 3,
      occurrence,
      now: 400,
      remainingMs: 1000,
      clock: { frameId: 2, now: 400 },
    },
    { phase: 'clock', order: 5, now: 2400, frozen: false, clock: { frameId: 3, now: 2400 } },
    authority('releaseEntity', 6),
    {
      phase: 'wait-resume',
      order: 7,
      runId: 1,
      waitId: 3,
      occurrence,
      now: 2400,
      deadline: 3400,
      clock: { frameId: 3, now: 2400 },
    },
    { phase: 'clock', order: 8, now: 3300, frozen: false, clock: { frameId: 4, now: 3300 } },
    { phase: 'clock', order: 9, now: 3400, frozen: false, clock: { frameId: 5, now: 3400 } },
    {
      phase: 'wait-end',
      order: 10,
      runId: 1,
      waitId: 3,
      reason: 'deadline',
      now: 3400,
      clock: { frameId: 5, now: 3400 },
    },
    { phase: 'command', order: 11, runId: 1 },
  ]
  const draws = [{ order: 2 }, { order: 12 }]
  verifyOpeningWaitReceipt(start, events, draws)
  for (const corrupt of [
    (e) => {
      e[2].remainingMs = 1300
    },
    (e) => {
      e[5].deadline = 2400
    },
    (e) => {
      e[2].runId = 9
    },
    (e) => {
      e[4].occurrence.command.command.kind = 'takeEntity'
    },
    (e) => {
      e.splice(2, 1)
    },
    (e) => {
      e[8].clock.frameId = 4
    },
  ]) {
    const copy = structuredClone(events)
    corrupt(copy)
    assert.throws(() => verifyOpeningWaitReceipt(copy[0], copy, draws))
  }
})

test('dialogue cold IO permits only pending draws, never a draw after real wake or a fabricated resource', () => {
  const command = {
    order: 1,
    runId: 7,
    clock: { frameId: 1 },
    occurrence: {
      id: 9,
      command: {
        kind: 'leaf',
        command: { kind: 'dialog', cue: { portrait: { asset: 'portrait.pal.055' } } },
      },
    },
  }
  const opened = { order: 9, clock: { frameId: 3 } }
  const events = ['io-start', 'io-wake', 'io-end'].map((phase, i) => ({
    phase,
    order: [2, 7, 8][i],
    runId: 7,
    occurrence: { id: 9 },
    clock: { frameId: i ? 3 : 1 },
    io: { kind: 'dialog-portrait', asset: 'portrait.pal.055' },
  }))
  const draws = [{ order: 3 }, { order: 6 }]
  assert.deepEqual(verifyDialoguePreparation(command, opened, events, draws).draws, [3, 6])
  for (const mutate of [
    (e) => e.splice(1, 1),
    (e) => {
      e[1].order = 5
    },
    (e) => {
      e[1].runId = 8
    },
    (e) => {
      e[1].io.asset = 'portrait.pal.001'
    },
    (e) => {
      e[1].clock.frameId = 2
    },
  ]) {
    const copy = structuredClone(events)
    mutate(copy)
    assert.throws(() => verifyDialoguePreparation(command, opened, copy, draws))
  }
  const cached = { order: 2, clock: command.clock }
  verifyDialoguePreparation(command, cached, [], [])
  assert.throws(() =>
    verifyDialoguePreparation(command, { ...cached, order: 4 }, [], [{ order: 3 }]),
  )
})

function collector() {
  const host = {}
  new Function(
    'globalThis',
    evidenceObserverScript(installOpeningMatrix, createScriptCausalObserver),
  )(host)
  return host
}

async function pageLifecycleRuntime(t) {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-page-lifecycle-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [openingTracePlugin()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  const host = collector(),
    old = new Map()
  for (const [key, value] of Object.entries(host)) {
    old.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    globalThis[key] = value
  }
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
    for (const [key, descriptor] of old) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  return { server, host }
}

test('actual parent/child invocation, sequential runner reuse and inherited effect retain distinct causal identities', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { ScriptProjectRuntime } = await server.ssrLoadModule(
    '/packages/reforge/src/runtime-script-project.ts',
  )
  const { ScriptRunnerCore } = await server.ssrLoadModule(
    '/packages/reforge/src/script-runner-core.ts',
  )
  const { compileBaseScriptFlow } = await server.ssrLoadModule(
    '/packages/reforge/src/script-compiler-core.ts',
  )
  const { RuntimeFrameSession } = await server.ssrLoadModule(
    '/packages/reforge/src/runtime-frame-session.ts',
  )
  const { inheritScriptWork } = await server.ssrLoadModule(
    '/packages/reforge/src/script-work-queue.ts',
  )
  const { buildEntityLifecycleReferenceIndex, emptyWorldScriptState } = await server.ssrLoadModule(
    '/packages/content/src/index.ts',
  )
  const target = { scene: 's001', entity: 'e11' },
    parent = { scene: 's001', entity: 'e10' },
    signal = new AbortController().signal,
    childSignal = new AbortController().signal,
    frames = new RuntimeFrameSession(100),
    digest = 'd'.repeat(64)
  host.__e2eSceneBoundary({ scene: 's001' })
  const scene = {
    id: 's001',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e11',
        zone: true,
        pos: { col: 2, row: 2, height: 0 },
        pages: [{ id: 'normal', label: 'normal', trigger: 'talk' }],
        initialPage: 'normal',
        behaviors: {
          trigger: {
            talk: {
              label: 'talk',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'first',
                stages: [
                  {
                    id: 'first',
                    body: [{ kind: 'setFlag', flag: 'capture', value: true }],
                    next: 'again',
                  },
                  {
                    id: 'again',
                    body: [
                      {
                        kind: 'branch',
                        cond: { kind: 'flag', flag: 'capture', is: true },
                        then: [{ kind: 'setEntityState', target, state: 0 }],
                        else: [{ kind: 'setEntityState', target, state: 2 }],
                      },
                    ],
                    next: { kind: 'complete' },
                  },
                ],
              },
            },
          },
        },
      },
    ],
  }
  const world = {
    party: [],
    inventory: [],
    learnedSkills: {},
    money: 0,
    script: emptyWorldScriptState(),
  }
  let detach, timer
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    currentSceneId: () => scene.id,
    currentSceneSessionId: () => 1,
    scene: () => scene,
    executeEffect(command, _context, receivedSignal) {
      assert.equal(receivedSignal, signal)
      if (command.kind === 'setFlag' && command.flag === 'capture')
        detach = inheritScriptWork(receivedSignal, childSignal)
      if (command.kind === 'setFlag' && command.flag === 'tail') {
        timer = frames.wait(10, childSignal)
        detach()
      }
    },
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: () => true,
      entitiesNear: () => false,
      facingEntity: () => true,
    },
    wait: (ms, owner) => frames.wait(ms, owner),
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  })
  await runtime.runCommands(
    [
      { kind: 'runEntityTrigger', target },
      { kind: 'setFlag', flag: 'tail', value: true },
    ],
    { signal, self: parent },
  )
  assert.deepEqual(world.script.flags, { capture: true, tail: true })
  assert(timer)
  frames.clearWaits()
  await timer
  const nested = host.__readOpeningMatrix()
  assert.deepEqual(nested.errors, [])
  const starts = nested.causes.filter((e) => e.phase === 'run-started'),
    commands = nested.causes.filter((e) => e.phase === 'command'),
    wait = nested.causes.filter((e) => e.phase.startsWith('wait-'))
  assert.equal(starts.length, 2)
  assert.equal(starts[0].activityId, starts[1].activityId)
  assert.notEqual(starts[0].runId, starts[1].runId)
  assert.notEqual(starts[0].runnerId, starts[1].runnerId)
  assert.equal(starts[1].parentRunId, starts[0].runId)
  assert.equal(starts[1].parentOccurrence, commands[0].occurrence.id)
  assert.deepEqual(
    commands.map((e) => e.occurrence.self),
    [parent, target, parent],
  )
  assert.deepEqual(
    wait.map((e) => e.runId),
    [starts[1].runId, starts[1].runId],
  )
  assert(wait.every((e) => e.occurrence.id === commands[1].occurrence.id))
  const check = (trace) => {
    for (const proof of [checkScriptInvocations(trace), checkOccurrenceLineage(trace)])
      assert.equal(proof.status, 'proved', JSON.stringify(proof))
  }
  check(nested)
  const completion = nested.causes.find(
    (e) => e.phase === 'leaf-completed' && e.runId === starts[0].runId,
  )
  assert(completion)
  for (const insertBefore of [
    nested.causes.find((e) => e.phase === 'run-ended' && e.runId === starts[1].runId).order,
    nested.causes.at(-1).order + 2,
    completion.order + 1,
  ]) {
    const wrong = structuredClone(nested)
    for (const e of wrong.causes) e.order *= 4
    wrong.causes.push({ ...structuredClone(completion), order: insertBefore * 4 - 1 })
    wrong.causes.sort((a, b) => a.order - b.order)
    assert.equal(
      checkScriptInvocations(wrong).status,
      'rejected',
      `invalid completion at ${insertBefore}`,
    )
  }
  for (const corrupt of [
    (events) =>
      events.splice(
        events.findIndex((e) => e.phase === 'run-started'),
        1,
      ),
    (events) =>
      events.splice(
        events.findIndex((e) => e.phase === 'call-started'),
        1,
      ),
    (events) => {
      events.find((e) => e.phase === 'run-ended').runId = starts[0].runId
    },
    (events) => {
      events.find((e) => e.phase === 'wait-end').runId = starts[0].runId
    },
    (events) => {
      for (const event of events.filter((e) => e.runId === starts[1].runId))
        for (const key of ['parentRunId', 'parentOccurrence', 'callId']) event[key] = null
    },
    (events) => {
      for (const event of events) {
        if (['call-started', 'call-ended'].includes(event.phase)) event.target = parent
        if (event.phase === 'run-started' && event.runId === starts[1].runId) event.self = parent
      }
    },
    (events) => {
      const end = events.find((e) => e.phase === 'wait-end')
      for (const key of [
        'runId',
        'activityId',
        'runnerId',
        'parentRunId',
        'parentOccurrence',
        'callId',
        'occurrence',
      ])
        end[key] = structuredClone(commands[2][key])
    },
  ]) {
    const copy = structuredClone(nested)
    corrupt(copy.causes)
    assert(
      [checkScriptInvocations(copy), checkOccurrenceLineage(copy)].some(
        (p) => p.status !== 'proved',
      ),
    )
  }
  // Same runner and signal may start a new invocation, including a legal empty stage.
  const runner = new ScriptRunnerCore({ execute() {} }, signal)
  const flow = compileBaseScriptFlow(
    {
      kind: 'stages',
      initial: 'empty',
      stages: [{ id: 'empty', body: [], next: { kind: 'complete' } }],
    },
    { timing: 'auto', canonicalContentDigest: digest },
  )
  const options = { cursorController: { reachSafePoint: () => 'continue' } }
  await runner.runFlow(flow, options)
  await runner.runFlow(flow, options)
  const repeat = host.__readOpeningMatrix(),
    reused = repeat.causes.filter((e) => e.phase === 'run-started').slice(-2)
  assert.notEqual(reused[0].runId, reused[1].runId)
  assert.equal(reused[0].runnerId, reused[1].runnerId)
  assert(reused.every((e) => e.occurrence === null && e.parentRunId === null))
  check(repeat)
  await runner.runFlow(flow, { ...options, cursor: { kind: 'completed' } })
  assert.equal(
    host.__readOpeningMatrix().causes.length,
    repeat.causes.length,
    'completed cursor does not invent a runner invocation',
  )
  await runtime.runEntityBehavior(scene, target.entity, 'trigger', { signal })
  const privateBody = [
    {
      kind: 'branch',
      cond: { kind: 'not', cond: { kind: 'flag', flag: 'capture', is: true } },
      then: [{ kind: 'setEntityState', target, state: 2 }],
      else: [{ kind: 'setEntityState', target, state: 1 }],
    },
  ]
  await runtime.runItemPrivateScript(
    {
      test: {
        use: { effects: [{ kind: 'itemPrivateScript', script: { id: 'use', body: privateBody } }] },
      },
    },
    'test',
    'use',
    { signal },
  )
  assert.equal(world.script.entityState.s001.e11, 1)
  const specifications = [
    {
      name: 'second trigger stage',
      scene: scene.id,
      self: target,
      timing: 'interactive',
      stage: 'again',
      flow: scene.entities[0].behaviors.trigger.talk.flow,
      author: {
        kind: 'entity-behavior',
        scene: scene.id,
        entity: target.entity,
        channel: 'trigger',
        behavior: 'talk',
      },
      branches: { '["again",0]': 'then' },
    },
    {
      name: 'private successful branch',
      scene: scene.id,
      self: null,
      timing: 'interactive',
      scope: 'script',
      flow: { initial: '__script', stages: [{ id: '__script', body: privateBody }] },
      author: { kind: 'item-private', item: 'test', script: 'use' },
      branches: { '["__script",0]': 'else' },
    },
  ]
  const complete = host.__readOpeningMatrix()
  check(complete)
  const proof = checkStoryExecutions(complete, 'fixture', specifications)
  assert.equal(proof.status, 'proved', JSON.stringify(proof))
  for (const execution of proof.final.executions) {
    for (const mutate of [
      (events) => events.filter((e) => e.runId !== execution.runId),
      (events) => events.filter((e) => e.order !== execution.last),
      (events) => {
        events.find((e) => e.order === execution.end).resolved = false
        return events
      },
      (events) => {
        events.find((e) => e.runId === execution.runId && e.phase === 'run-started').author.kind =
          'wrong'
        return events
      },
    ]) {
      const copy = structuredClone(complete)
      copy.causes = mutate(copy.causes)
      assert.notEqual(checkStoryExecutions(copy, 'fixture', specifications).status, 'proved')
    }
  }
})

test('actual Game append/reset preserves equal-text lines, deduplicates redraws and rejects borrowed page identities', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const api = await server.ssrLoadModule('/packages/game/src/present/dialog-box.ts')
  const { createInitialGameState } = await server.ssrLoadModule(
    '/packages/game/src/core/game-state.ts',
  )
  const { presentFrame } = await server.ssrLoadModule('/packages/game/src/present/present.ts')
  const { createFramebuffer } = await server.ssrLoadModule(
    '/packages/game/src/present/framebuffer.ts',
  )
  const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' }),
    owner = {}
  gs.wNumScene = 1
  const fb = createFramebuffer()
  const context = {
    tilemap: {
      width: 20,
      height: 20,
      cells: Array.from({ length: 20 }, () =>
        Array.from({ length: 20 }, () => ({ lower: 0, upper: 0 })),
      ),
      tileset: 'fixture',
    },
    tileImages: { get: () => undefined },
    partyFrames: [],
    partyWalkFrames: 3,
    glyphs: new Map(),
    npcSprites: new Map(),
    npcSpriteFrames: new Map(),
  }
  const draw = () => presentFrame(fb, gs, context)
  const command = (row) =>
    host.__openingCauseGame(gs, 'command', owner, {
      ip: row,
      command: { op: 'showDialog', messageIndex: row, text: '甲' },
    })
  host.__openingCauseGame(gs, 'command', owner, {
    ip: 0,
    command: { op: 'setDialogStyleBottom' },
  })
  command(1)
  gs.dialogBox = api.startDialogLine('甲', { now: 0, style: 'bottom' })
  api.tickDialog(gs.dialogBox, 10000)
  host.__openingCauseGame(gs, 'event-after', owner, {})
  draw()
  draw()
  command(2)
  api.appendDialogLine(gs.dialogBox, '甲', 10001)
  api.tickDialog(gs.dialogBox, 20000)
  host.__openingCauseGame(gs, 'event-after', owner, {})
  draw()
  api.resetDialogBody(gs.dialogBox)
  command(3)
  api.appendDialogLine(gs.dialogBox, '甲', 20001)
  api.tickDialog(gs.dialogBox, 30000)
  host.__openingCauseGame(gs, 'event-after', owner, {})
  draw()
  const game = host.__readOpeningMatrix()
  assert.deepEqual(game.errors, [])
  assert.deepEqual(
    game.pages.map((p) => p.page.lines),
    [['甲'], ['甲', '甲'], ['甲']],
  )
  assert.equal(game.pages[0].page.instance, game.pages[1].page.instance)
  assert.notEqual(game.pages[1].page.instance, game.pages[2].page.instance)
  const proof = checkGameDialogueCausality(game, { pagePolicy: 'instance' })
  assert.equal(proof.status, 'proved', JSON.stringify(proof))
  assert.deepEqual(
    proof.groups.map((g) => g.rows),
    [[1, 2], [3]],
  )
  for (const corrupt of [
    (trace) => {
      trace.pages.splice(1, 1)
    },
    (trace) => {
      trace.pages[2].page.instance = trace.pages[0].page.instance
    },
    (trace) => {
      trace.pages[2].sceneVisit++
    },
  ]) {
    const broken = structuredClone(game)
    corrupt(broken)
    assert.equal(checkGameDialogueCausality(broken, { pagePolicy: 'instance' }).status, 'rejected')
  }
})

test('native Game trigger completion resets dialogue style to top before the next unstyled dialogue', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { createInitialGameState } = await server.ssrLoadModule(
    '/packages/game/src/core/game-state.ts',
  )
  const api = await server.ssrLoadModule('/packages/game/src/core/event-system.ts')
  const { createCommandBus } = await server.ssrLoadModule('/packages/game/src/core/command-bus.ts')
  const { tickDialog } = await server.ssrLoadModule('/packages/game/src/present/dialog-box.ts')
  const { presentFrame } = await server.ssrLoadModule('/packages/game/src/present/present.ts')
  const { createFramebuffer } = await server.ssrLoadModule(
    '/packages/game/src/present/framebuffer.ts',
  )
  const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
  gs.wNumScene = 1
  const context = {
    tilemap: {
      width: 20,
      height: 20,
      cells: Array.from({ length: 20 }, () =>
        Array.from({ length: 20 }, () => ({ lower: 0, upper: 0 })),
      ),
      tileset: 'fixture',
    },
    tileImages: { get: () => undefined },
    partyFrames: [],
    partyWalkFrames: 3,
    glyphs: new Map(),
    npcSprites: new Map(),
    npcSpriteFrames: new Map(),
  }
  const fb = createFramebuffer()
  const bus = createCommandBus()
  for (const [index, styled] of [false, true, false].entries()) {
    const commands = [
      ...(styled ? [{ op: 'setDialogStyleBottom' }] : []),
      { op: 'showDialog', messageIndex: index + 1, text: `正文${index}` },
      { op: 'end' },
    ]
    gs.eventCursor = { commands, labelMap: {}, ip: 0 }
    gs.mode = 'event'
    const tick = (pressed = []) =>
      api.tickEventSystem(gs, { held: new Set(), pressed: new Set(pressed), frameNum: index }, bus)
    tick()
    tickDialog(gs.dialogBox, 10000 * (index + 1))
    tick()
    presentFrame(fb, gs, context)
    tick(['Confirm'])
    assert.equal(gs.eventCursor, undefined)
    assert.equal(gs.currentDialogStyle, 'top')
  }
  const trace = host.__readOpeningMatrix()
  assert.deepEqual(
    trace.pages.filter((e) => e.page).map((e) => e.page.slot),
    ['top', 'bottom', 'top'],
  )
  const proof = checkGameDialogueCausality(trace, { pagePolicy: 'instance' })
  assert.equal(proof.status, 'proved', JSON.stringify(proof))
  const withoutEnd = structuredClone(trace)
  withoutEnd.causes = withoutEnd.causes.filter((e) => e.occurrence?.command?.op !== 'end')
  assert.equal(
    checkGameDialogueCausality(withoutEnd, { pagePolicy: 'instance' }).witness.rule,
    'dialogue-source-style',
  )
  const wrong = structuredClone(trace)
  wrong.pages.findLast((e) => e.page).page.slot = 'bottom'
  assert.equal(
    checkGameDialogueCausality(wrong, { pagePolicy: 'instance' }).witness.rule,
    'dialogue-source-style',
  )
})

test('actual Game style switch records kept and active slots through explicit clearing', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { createInitialGameState } = await server.ssrLoadModule(
    '/packages/game/src/core/game-state.ts',
  )
  const api = await server.ssrLoadModule('/packages/game/src/core/event-system.ts')
  const { createCommandBus } = await server.ssrLoadModule('/packages/game/src/core/command-bus.ts')
  const { tickDialog } = await server.ssrLoadModule('/packages/game/src/present/dialog-box.ts')
  const { presentFrame } = await server.ssrLoadModule('/packages/game/src/present/present.ts')
  const { createFramebuffer } = await server.ssrLoadModule(
    '/packages/game/src/present/framebuffer.ts',
  )
  const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
  gs.wNumScene = 1
  gs.eventCursor = {
    commands: [
      { op: 'setDialogStyleTop' },
      { op: 'showDialog', messageIndex: 1, text: '甲' },
      { op: 'setDialogStyleBottom' },
      { op: 'showDialog', messageIndex: 2, text: '乙' },
      { op: 'end' },
    ],
    labelMap: {},
    ip: 0,
  }
  gs.mode = 'event'
  const fb = createFramebuffer(),
    bus = createCommandBus()
  const context = {
    tilemap: {
      width: 20,
      height: 20,
      cells: Array.from({ length: 20 }, () =>
        Array.from({ length: 20 }, () => ({ lower: 0, upper: 0 })),
      ),
      tileset: 'fixture',
    },
    tileImages: { get: () => undefined },
    partyFrames: [],
    partyWalkFrames: 3,
    glyphs: new Map(),
    npcSprites: new Map(),
    npcSpriteFrames: new Map(),
  }
  const tick = (pressed = []) =>
    api.tickEventSystem(gs, { held: new Set(), pressed: new Set(pressed), frameNum: 0 }, bus)
  tick()
  tickDialog(gs.dialogBox, 10000)
  tick()
  presentFrame(fb, gs, context)
  tick(['Confirm'])
  tickDialog(gs.dialogBox, 20000)
  tick()
  presentFrame(fb, gs, context)
  const coexist = host
    .__readOpeningMatrix()
    .causes.find((event) => event.phase === 'dialogue-presentation' && event.slots.length === 2)
  assert(coexist, 'actual kept-slot draw was not recorded')
  assert.deepEqual(
    coexist.slots.map(({ slot, active, visibleText }) => ({ slot, active, visibleText })),
    [
      { slot: 'top', active: false, visibleText: '甲' },
      { slot: 'bottom', active: true, visibleText: '乙' },
    ],
  )
  assert.notEqual(coexist.slots[0].owner.occurrence.id, coexist.slots[1].owner.occurrence.id)
  tick(['Confirm'])
  presentFrame(fb, gs, context)
  const trace = host.__readOpeningMatrix()
  assert.deepEqual(trace.errors, [])
  assert.deepEqual(
    trace.causes.filter((event) => event.phase === 'dialogue-presentation').at(-1).slots,
    [],
  )
  assert.equal(
    verifyDialoguePresentation(trace.causes, trace.worldRenders, 'game').status,
    'proved',
  )
})

test('actual Reforge reopening identical dialogue at the same timestamp is a new page, not a redraw', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  host.__openingMatrixPoint('render:world', { scene: 's001', actors: {} })
  const { DialogBox } = await server.ssrLoadModule('/packages/reforge/src/dialog/dialog-box.ts')
  const { startDialogue } = await server.ssrLoadModule('/packages/reforge/src/dialogue.ts')
  const { ScriptRunnerCore } = await server.ssrLoadModule(
    '/packages/reforge/src/script-runner-core.ts',
  )
  const { compileBaseScriptFlow } = await server.ssrLoadModule(
    '/packages/reforge/src/script-compiler-core.ts',
  )
  const box = new DialogBox({ drawImage() {} }, new Map(), [])
  const before = host.__readOpeningMatrix().pages.length
  // The real runner provides each source occurrence; no fabricated caller for this oracle.
  const runner = new ScriptRunnerCore(
    {
      execute(command) {
        box.open(startDialogue({ id: 'same', cues: [command.cue] }), 100)
        for (let draw = 0; draw < 2; draw++) {
          host.__openingMatrixPoint('render:world', { scene: 's001', actors: {} })
          box.render(100)
        }
        box.advance(100)
      },
    },
    new AbortController().signal,
  )
  await runner.runFlow(
    compileBaseScriptFlow(
      {
        kind: 'stages',
        initial: 'once',
        stages: [
          {
            id: 'once',
            body: Array.from({ length: 2 }, () => ({
              kind: 'dialog',
              cue: { rows: [{ text: '甲', speed: 0 }] },
            })),
            next: { kind: 'complete' },
          },
        ],
      },
      { timing: 'interactive', canonicalContentDigest: 'a'.repeat(64) },
    ),
    { cursorController: { reachSafePoint: () => 'continue' } },
  )
  const rf = host.__readOpeningMatrix()
  assert.deepEqual(rf.errors, [])
  const pages = rf.pages.slice(before)
  assert.equal(pages.length, 2)
  assert.notEqual(pages[0].page.instance, pages[1].page.instance)
  assert.equal(pages[0].page.pageText, pages[1].page.pageText)
})

test('real script-cue draws retain source identity and reject early disappearance or missing presentation evidence', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { CutsceneController } = await server.ssrLoadModule(
    '/packages/reforge/src/cutscene-controller.ts',
  )
  const { executeScriptHostEffect } = await server.ssrLoadModule(
    '/packages/reforge/src/script-host-adapter.ts',
  )
  const { ScriptRunnerCore } = await server.ssrLoadModule(
    '/packages/reforge/src/script-runner-core.ts',
  )
  const { compileBaseScriptFlow } = await server.ssrLoadModule(
    '/packages/reforge/src/script-compiler-core.ts',
  )
  const { DialogBox } = await server.ssrLoadModule('/packages/reforge/src/dialog/dialog-box.ts')
  const { startDialogue } = await server.ssrLoadModule('/packages/reforge/src/dialogue.ts')
  const portraitDraws = []
  const box = new DialogBox(
    { drawImage: (image) => portraitDraws.push(image) },
    new Map(),
    [],
    new Map([
      ['first', { width: 1, height: 1 }],
      ['second', { width: 2, height: 2 }],
    ]),
  )
  let finish,
    now = 100
  const frame = () => {
    host.__openingCauseFrame({
      now,
      realNow: now,
      frozen: false,
      stepping: false,
      requested: false,
    })
    host.__openingMatrixPoint('render:world', {
      scene: 's001',
      actors: {},
      renderEvidence: { atMs: now },
    })
    if (box.visible) box.render(now)
    else host.__openingCauseDialogueDraw('reforge', [])
    now++
  }
  const controller = new AbortController()
  const presentation = new CutsceneController(
    {
      clearDialog() {
        host.__openingCauseDialogClear('clearDialog')
        box.close()
      },
    },
    { isRunnerActive: () => true },
  )
  const runner = new ScriptRunnerCore(
    {
      execute(command) {
        if (command.kind === 'releaseEntity') {
          assert.equal(box.visible, false, 'actual release still has visible dialogue')
          return
        }
        if (command.kind === 'clearDialog') {
          return executeScriptHostEffect(
            {
              clearDialog() {
                // Actual main creates an effect-only signal; the adapter retains its caller.
                void presentation.run([{ kind: 'clearDialog' }], new AbortController().signal)
              },
            },
            command,
            { self: null, timing: 'interactive' },
            controller.signal,
            { currentSceneId: () => 's001' },
          )
        }
        assert.equal(command.kind, 'dialog')
        box.open(startDialogue({ id: '__script', cues: [command.cue] }), now, 'script')
        return new Promise((resolve) => {
          finish = resolve
        })
      },
    },
    controller.signal,
  )
  const flow = compileBaseScriptFlow(
    {
      kind: 'stages',
      initial: 'once',
      stages: [
        {
          id: 'once',
          body: [
            {
              kind: 'dialog',
              cue: { slot: 'top', portrait: { asset: 'first' }, rows: [{ text: '甲', speed: 0 }] },
            },
            {
              kind: 'dialog',
              cue: {
                slot: 'bottom',
                portrait: { asset: 'second' },
                rows: [{ text: '乙', speed: 0 }],
              },
            },
            { kind: 'clearDialog' },
            { kind: 'releaseEntity', target: { scene: 's001', entity: 'e10' } },
          ],
          next: { kind: 'complete' },
        },
      ],
    },
    { timing: 'interactive', canonicalContentDigest: 'a'.repeat(64) },
  )
  frame()
  const execution = runner.runFlow(flow, { cursorController: { reachSafePoint: () => 'continue' } })
  await new Promise(setImmediate)
  frame()
  box.advance(now)
  frame() // confirmed top remains drawn before the next command is ready
  finish()
  await new Promise(setImmediate)
  frame()
  assert.deepEqual(
    portraitDraws.map((image) => image.width),
    [1, 1, 2, 1],
  )
  box.advance(now)
  finish()
  await execution
  frame()
  const trace = host.__readOpeningMatrix()
  assert.deepEqual(trace.errors, [])
  const clear = trace.causes.find((event) => event.phase === 'dialogue-clear-request')
  assert.equal(clear.occurrence.command.command.kind, 'clearDialog')
  assert.equal(checkOccurrenceLineage(trace).status, 'proved')
  const wrongClear = structuredClone(trace)
  wrongClear.causes.find((event) => event.order === clear.order).occurrence = trace.causes.find(
    (event) => event.phase === 'command' && event.occurrence.command.command.kind === 'dialog',
  ).occurrence
  assert.equal(checkOccurrenceLineage(wrongClear).status, 'rejected')
  const check = (copy) => verifyDialoguePresentation(copy.causes, copy.worldRenders)
  assert.equal(check(trace).status, 'proved')
  const missingBoundary = structuredClone(trace)
  // Remove the actual clear operation and its successful close: root completion still
  // exists, but cannot establish that the intermediate release had a cleared screen.
  missingBoundary.causes = missingBoundary.causes.filter(
    (event) =>
      !(
        event.phase === 'dialogue-clear-request' ||
        (event.phase === 'dialogue' && event.source === 'close') ||
        (event.phase === 'command' && event.occurrence.command.command?.kind === 'clearDialog')
      ),
  )
  assert.throws(() => check(missingBoundary), /foreground releaseEntity before clearing/)
  const together = trace.causes.find(
    (event) => event.phase === 'dialogue-presentation' && event.slots.length === 2,
  )
  assert(together)
  assert.notEqual(together.slots[0].owner.occurrence.id, together.slots[1].owner.occurrence.id)
  for (const corrupt of [
    (copy) => {
      copy.causes.find((event) => event.order === together.order).slots.pop()
    },
    (copy) => {
      copy.causes.find((event) => event.order === together.order).slots[1].owner =
        together.slots[0].owner
    },
    (copy) => {
      copy.causes = copy.causes.filter((event) => event.order !== together.order)
    },
    (copy) => {
      copy.causes.find(
        (event) => event.phase === 'dialogue' && event.source === 'advance',
      ).afterSlots = []
    },
    (copy) => {
      for (const event of copy.causes) {
        delete event.beforeSlots
        delete event.afterSlots
      }
    },
  ]) {
    const copy = structuredClone(trace)
    corrupt(copy)
    assert.throws(() => check(copy))
  }
})

test('actual main position writer and sparse collector prove an unchanged factory restoration without inventing a change', async () => {
  const file = 'packages/reforge/src/main.ts'
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = instrumentOpeningTrace(source, file).code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  let declaration
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'applyWorldEntityPositionToScene')
      declaration = node
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert(declaration)
  for (const dx of [0, 1]) {
    const host = collector(),
      rootPosition = [60, -23, 0],
      capturedPosition = [60 + dx, -23, 0],
      entity = { id: 'e11', pos: { col: 60, row: -23, height: 0 } },
      canonical = { col: capturedPosition[0], row: -23, height: 0 },
      world = { script: { entityPos: { s001: { e11: canonical } } } },
      snapshot = (source) =>
        host.__openingMatrixPoint(source, {
          scene: 's001',
          actors: { e11: { position: Object.values(entity.pos) } },
        })
    snapshot('commit:scene-materialized')
    snapshot('before:scene-projection')
    const actual = new Function(
      'activeScene',
      'runtimeScript',
      'syncRuntimeScriptScratch',
      'clearEntityGait',
      'motion',
      'clearMotionStick',
      '__openingPoint',
      ts.transpile(`${declaration.getText(ast)};return applyWorldEntityPositionToScene;`, {
        target: ts.ScriptTarget.ES2022,
      }),
    )(
      { scene: { id: 's001', entities: [entity] } },
      { entityPos: { e11: canonical } },
      () => {},
      () => {},
      { discardRestoredMove() {} },
      () => {},
      snapshot,
    )
    actual('e11')
    snapshot('commit:scene-ready')
    const trace = host.__readOpeningMatrix(),
      staging = trace.actors.filter((event) => event.id === 'e11'),
      projecting = trace.lifecycle.find((event) => event.phase === 'projecting'),
      ready = trace.lifecycle.find((event) => event.phase === 'ready'),
      inputs = {
        entity: 'e11',
        scene: 's001',
        rootPosition,
        capturedPosition,
        projecting,
        projection: { order: ready.order, world },
        ownOrder: ready.order,
      }
    assert.deepEqual(trace.errors, [])
    assert.deepEqual(Object.values(entity.pos), capturedPosition)
    assert.equal(staging.filter((event) => event.source === 'commit:entity.pos').length, dx)
    assert.equal(
      verifyRestoredPosition(staging, inputs).kind,
      dx ? 'position-change' : 'unchanged-factory-position',
    )
    if (dx)
      assert.throws(
        () =>
          verifyRestoredPosition(
            staging.filter((event) => event.source !== 'commit:entity.pos'),
            inputs,
          ),
        /lacks own position restoration/,
      )
    else {
      const wrong = structuredClone(inputs)
      wrong.projection.world.script.entityPos.s001.e11.col++
      assert.throws(() => verifyRestoredPosition(staging, wrong), /canonical position/)
      const moved = structuredClone(staging)
      moved[0].state.position[0]++
      assert.throws(() => verifyRestoredPosition(moved, inputs), /moved during staging/)
    }
  }
})

test('a settled real timer gates on an authored take and resumes before the first release draw', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const load = (name) => server.ssrLoadModule(`/packages/reforge/src/${name}.ts`)
  const { ScriptRunnerCore } = await load('script-runner-core')
  const { BaseProjectScriptRuntimeHost } = await load('script-project-core')
  const { compileBaseScriptFlow } = await load('script-compiler-core')
  const { ScriptWakeGate } = await load('script-wake-gate')
  const { MotionRuntimeCoordinator } = await load('motion-runtime-coordinator')
  const { RuntimeFrameSession } = await load('runtime-frame-session')
  const { ScriptWorkQueue } = await load('script-work-queue')
  const { emptyWorldScriptState } = await server.ssrLoadModule(
    '/packages/content/src/author-script-core.ts',
  )
  const target = { scene: 's001', entity: 'zone' },
    world = { script: emptyWorldScriptState() },
    gate = new ScriptWakeGate(),
    motion = new MotionRuntimeCoordinator(),
    frames = new RuntimeFrameSession(100),
    queue = new ScriptWorkQueue(),
    auto = new AbortController(),
    foreground = new AbortController()
  world.script.entityState.s001 = { zone: 1 }
  const snapshot = () => {
    host.__openingCauseWorld(world)
    host.__openingMatrixPoint('observe:causal', { scene: 's001', actors: {} })
  }
  const lifecycle = () => ({
    scene: 's001',
    sceneSession: motion.currentSceneSessionId('s001'),
    authority: Object.fromEntries(motion.authority),
    epochs: Object.fromEntries(motion.authorityEpoch),
    activations: [
      {
        entity: 'zone',
        signal: auto.signal,
        epoch: 1,
        sceneSession: motion.currentSceneSessionId('s001'),
      },
    ],
    restored: [],
  })
  for (const [key, value] of Object.entries({
    __openingCauseSnapshot: snapshot,
    __openingCauseLifecycleSnapshot: lifecycle,
  })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key)
    globalThis[key] = value
    host[key] = value
    t.after(() => {
      if (old) Object.defineProperty(globalThis, key, old)
      else delete globalThis[key]
    })
  }
  host.__e2eSceneBoundary({ scene: 's001' })
  const allowed = (signal, boundary) =>
    signal !== auto.signal ||
    boundary?.kind === 'settlement' ||
    !motion.authority.has(target.entity)
  const projectHost = new BaseProjectScriptRuntimeHost(
    world.script,
    {},
    {
      currentSceneId: () => 's001',
      gameplayNow: () => frames.now,
      gateOpen: allowed,
      gate: (signal, boundary) => gate.wait(signal, () => allowed(signal, boundary)),
      executeEffect(command, _context, signal) {
        if (command.kind === 'wait') return frames.wait(command.ms, signal)
        if (command.kind === 'takeEntity') motion.setAuthority(target.entity, { kind: 'script' })
        else if (command.kind === 'releaseEntity') {
          motion.releaseAuthority(target.entity)
          gate.notify()
        } else assert.equal(command.kind, 'setEntityState')
      },
    },
  )
  const flow = (body, timing) =>
    compileBaseScriptFlow(
      {
        kind: 'stages',
        initial: 'initial',
        stages: [{ id: 'initial', body, next: { kind: 'complete' } }],
      },
      { timing, canonicalContentDigest: 'a'.repeat(64) },
    )
  const run = (body, timing, controller) => {
    const done = queue.begin(controller.signal)
    return new ScriptRunnerCore(projectHost, controller.signal)
      .runFlow(flow(body, timing), {
        ...(timing === 'auto' ? { self: target } : {}),
        cursorController: { reachSafePoint: () => 'continue' },
      })
      .finally(done)
  }
  let takeover
  const ports = {
    afterScriptWork: (action) => queue.whenIdle(action),
    activateConfirm() {},
    resumeScriptGates: () => gate.notify(),
    gameplayFrozen: () => false,
    advanceFade() {},
    settleClosedDialogue() {},
    consumePressed: () => new Set(),
    tickHostiles() {},
    advanceMoves() {},
    deriveMounts() {},
    advanceLifecycle() {
      if (frames.now === 100 && !takeover)
        takeover = run(
          [
            { kind: 'takeEntity', target },
            { kind: 'wait', ms: 100 },
            { kind: 'releaseEntity', target },
            { kind: 'wait', ms: 1 },
          ],
          'interactive',
          foreground,
        )
    },
    advanceEntityActions() {},
    clearWorldTicks() {},
    presentBattle: () => false,
    routeInput() {},
    presentWorld() {
      host.__openingMatrixPoint('render:world', { scene: 's001', actors: {} })
    },
  }
  await frames.tick(0, ports)
  const pending = run(
    [
      { kind: 'wait', ms: 100 },
      { kind: 'setEntityState', target, state: 2 },
      { kind: 'wait', ms: 1 },
    ],
    'auto',
    auto,
  )
  await frames.tick(1, ports)
  await frames.tick(100, ports)
  assert(motion.authority.has(target.entity))
  await frames.tick(150, ports)
  await frames.tick(200, ports)
  await frames.tick(201, ports)
  await Promise.all([pending, takeover])
  const trace = host.__readOpeningMatrix(),
    events = trace.causes,
    start = events.find(
      (event) => event.phase === 'wait-start' && event.occurrence?.timing === 'auto',
    )
  assert.deepEqual(trace.errors, [])
  const receipt = verifyOpeningWaitReceipt(start, events, trace.worldRenders)
  assert.equal(receipt.end.now, 100)
  assert.equal(receipt.wakeGate.ready.clock.now, 200)
  for (const corrupt of [
    (copy) =>
      copy.splice(
        copy.findIndex((event) => event.phase === 'gate-wait'),
        1,
      ),
    (copy) => {
      copy.find((event) => event.phase === 'gate-ready').signalActivityId++
    },
    (copy) => {
      copy.find(
        (event) =>
          event.phase === 'command' && event.occurrence.command.command.kind === 'releaseEntity',
      ).occurrence.command.command.target.entity = 'other'
    },
    (copy) => {
      copy.find((event) => event.phase === 'authority-changed' && event.after === null).epochAfter++
    },
    (copy) => {
      copy.find((event) => event.phase === 'clock' && event.now === 150).lifecycle.authority.zone =
        undefined
    },
    (copy) => {
      copy.find((event) => event.phase === 'gate-ready').clock.frameId++
    },
    (copy) => {
      copy.find((event) => event.order === receipt.resumed.order).order = receipt.after.order + 1
    },
  ]) {
    const copy = structuredClone(events)
    corrupt(copy)
    assert.throws(() => verifyOpeningWaitReceipt(start, copy, trace.worldRenders))
  }
})

test('a real self-hiding leaf completes before its next effect blocks at the actual wake gate', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { ScriptRunnerCore } = await server.ssrLoadModule(
    '/packages/reforge/src/script-runner-core.ts',
  )
  const { BaseProjectScriptRuntimeHost } = await server.ssrLoadModule(
    '/packages/reforge/src/script-project-core.ts',
  )
  const { compileBaseScriptFlow } = await server.ssrLoadModule(
    '/packages/reforge/src/script-compiler-core.ts',
  )
  const { ScriptWakeGate } = await server.ssrLoadModule('/packages/reforge/src/script-wake-gate.ts')
  const { emptyWorldScriptState } = await server.ssrLoadModule(
    '/packages/content/src/author-script-core.ts',
  )
  const target = { scene: 's001', entity: 'zone' },
    world = { script: emptyWorldScriptState() },
    gate = new ScriptWakeGate(),
    controller = new AbortController()
  world.script.entityState.s001 = { zone: 1 }
  const snapshot = () => {
    host.__openingCauseWorld(world)
    host.__openingMatrixPoint('observe:causal', {
      scene: 's001',
      actors: { zone: { position: [0, 0, 0], state: world.script.entityState.s001.zone } },
    })
  }
  const old = Object.getOwnPropertyDescriptor(globalThis, '__openingCauseSnapshot')
  globalThis.__openingCauseSnapshot = snapshot
  host.__openingCauseSnapshot = snapshot
  t.after(() => {
    if (old) Object.defineProperty(globalThis, '__openingCauseSnapshot', old)
    else delete globalThis.__openingCauseSnapshot
  })
  snapshot()
  let failEffect = false
  const allowed = (_signal, boundary) =>
    boundary?.kind === 'settlement' || world.script.entityState.s001.zone > 0
  const projectHost = new BaseProjectScriptRuntimeHost(
    world.script,
    {},
    {
      currentSceneId: () => 's001',
      gateOpen: allowed,
      gate: (signal, boundary) => gate.wait(signal, () => allowed(signal, boundary)),
      executeEffect(command) {
        assert.equal(
          command.kind,
          'setEntityState',
          'the hidden owner must not execute its next wait',
        )
        if (failEffect) throw new Error('host effect failed')
      },
    },
  )
  const flow = compileBaseScriptFlow(
    {
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [
            { kind: 'setEntityState', target, state: 0 },
            { kind: 'wait', ms: 100 },
          ],
          next: { kind: 'complete' },
        },
      ],
    },
    { timing: 'auto', canonicalContentDigest: 'a'.repeat(64) },
  )
  const options = { self: target, cursorController: { reachSafePoint: () => 'continue' } }
  const pending = new ScriptRunnerCore(projectHost, controller.signal).runFlow(flow, options)
  await new Promise(setImmediate)
  const trace = host.__readOpeningMatrix(),
    completed = trace.causes.filter((e) => e.phase === 'leaf-completed')
  assert.deepEqual(trace.errors, [])
  assert.equal(completed.length, 1)
  assert.equal(completed[0].world.script.entityState.s001.zone, 0)
  assert.equal(trace.causes.at(-1).phase, 'gate-wait')
  assert.equal(
    trace.causes.some((e) => e.phase === 'run-ended'),
    false,
  )
  assert.equal(
    checkPersistentEffects(trace, [target]).status,
    'proved',
    JSON.stringify(checkPersistentEffects(trace, [target])),
  )
  const missing = structuredClone(trace)
  missing.causes = missing.causes.filter((e) => e.phase !== 'leaf-completed')
  assert.equal(checkPersistentEffects(missing, [target]).status, 'unknown')
  const wrong = structuredClone(trace)
  wrong.causes.find((e) => e.phase === 'leaf-completed').world.script.entityState.s001.zone = 1
  assert.equal(checkPersistentEffects(wrong, [target]).status, 'rejected')
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  world.script.entityState.s001.zone = 1
  failEffect = true
  await assert.rejects(
    new ScriptRunnerCore(projectHost, new AbortController().signal).runFlow(flow, options),
    /host effect failed/,
  )
  assert.equal(
    host.__readOpeningMatrix().causes.filter((e) => e.phase === 'leaf-completed').length,
    1,
    'a rejected host effect cannot publish a successful completion',
  )
})

for (const terminalDialogue of [false, true])
  test(`actual automatic narration closes on its authored deadline frame (terminal=${terminalDialogue})`, async (t) => {
    const { server, host } = await pageLifecycleRuntime(t)
    const { ScriptRunnerCore } = await server.ssrLoadModule(
      '/packages/reforge/src/script-runner-core.ts',
    )
    const { compileBaseScriptFlow } = await server.ssrLoadModule(
      '/packages/reforge/src/script-compiler-core.ts',
    )
    const { DialogBox } = await server.ssrLoadModule('/packages/reforge/src/dialog/dialog-box.ts')
    const { startDialogue } = await server.ssrLoadModule('/packages/reforge/src/dialogue.ts')
    const box = new DialogBox({ drawImage() {} }, new Map(), [])
    let now = 100,
      finish
    const frame = (time) => {
      now = time
      host.__openingCauseFrame({
        now,
        realNow: now,
        frozen: false,
        stepping: false,
        requested: false,
      })
      host.__openingMatrixPoint('render:world', {
        scene: 's001',
        actors: {},
        renderEvidence: { atMs: now },
      })
      box.render(now)
      if (!box.active && finish) {
        finish()
        finish = null
      }
    }
    frame(now)
    const cue = { slot: 'narration', rows: [{ text: 'Reward' }], autoAdvance: 1400 }
    const runner = new ScriptRunnerCore(
      {
        gameplayNow: () => now,
        execute(command) {
          if (command.kind !== 'dialog') {
            assert.equal(command.kind, 'clearDialog')
            return
          }
          box.open(startDialogue({ id: 'reward', cues: [command.cue] }), now)
          return new Promise((resolve) => {
            finish = resolve
          })
        },
      },
      new AbortController().signal,
    )
    const authored = {
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [
            { kind: 'dialog', cue: { ...cue, identity: { kind: 'unbound' } } },
            ...(terminalDialogue ? [] : [{ kind: 'clearDialog' }]),
          ],
          next: { kind: 'complete' },
        },
      ],
    }
    const resolved = structuredClone(authored)
    delete resolved.stages[0].body[0].cue.identity
    const flow = compileBaseScriptFlow(resolved, {
      timing: 'interactive',
      canonicalContentDigest: 'a'.repeat(64),
    })
    const execution = runner.runFlow(flow, {
      cursorController: { reachSafePoint: () => 'continue' },
    })
    await new Promise(setImmediate)
    frame(100)
    frame(1499)
    assert.equal(box.active, true)
    frame(1500)
    await execution
    frame(1501)
    const trace = host.__readOpeningMatrix()
    assert.deepEqual(trace.errors, [])
    assert(!trace.causes.some((e) => e.phase === 'dialogue' && e.source === 'advance'))
    const specifications = [
      {
        name: 'native narration',
        scene: 's001',
        self: null,
        timing: 'interactive',
        flow: authored,
      },
    ]
    const verify = (copy, specs = specifications) =>
      verifyOpeningDialogue(copy.causes, copy.worldRenders, copy.pages, specs)
    assert.equal(verify(trace)[0].automatic.deadline, 1500)
    if (terminalDialogue) {
      assert.equal(verify(trace)[0].terminal.decision, 'continue')
      const unfinished = structuredClone(specifications)
      unfinished[0].flow.stages[0].body.push({ kind: 'clearDialog' })
      assert.throws(() => verify(trace, unfinished), /execution-complete/)
      for (const corrupt of [
        (copy) => {
          copy.causes.find((e) => e.phase === 'run-ended').resolved = false
        },
        (copy) => {
          copy.causes.find((e) => e.phase === 'run-ended').aborted = true
        },
        (copy) => {
          copy.causes.find((e) => e.phase === 'run-ended').runId++
        },
        (copy) => {
          copy.causes.find((e) => e.phase === 'run-ended').order =
            copy.worldRenders.at(-1).order + 1
        },
      ]) {
        const copy = structuredClone(trace)
        corrupt(copy)
        assert.throws(() => verify(copy))
      }
    }
    for (const corrupt of [
      (copy) => {
        copy.causes = copy.causes.filter((e) => !(e.phase === 'dialogue' && e.source === 'update'))
      },
      (copy) => {
        copy.pages.length = 0
      },
      (copy) => {
        copy.causes.find(
          (e) => e.phase === 'command' && e.occurrence.command.command?.kind === 'dialog',
        ).occurrence.command.command.cue.autoAdvance = 1401
      },
      (copy) => {
        copy.causes.find(
          (e) => e.phase === 'command' && e.occurrence.command.command?.kind === 'dialog',
        ).occurrence.command.command.cue.autoAdvance = 1399
      },
    ]) {
      const copy = structuredClone(trace)
      corrupt(copy)
      assert.throws(() => verify(copy))
    }
  })

test('native automatic animation cycles and probabilistic control words obey the source transition relation', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { createInitialGameState } = await server.ssrLoadModule(
    '/packages/game/src/core/game-state.ts',
  )
  const api = await server.ssrLoadModule('/packages/game/src/core/event-system.ts')
  t.after(() => api.setGlobalEvents([]))
  const capture = (
    commands,
    { layout = 3, autoFrames = 0, frame = 0, sample = 0, targetActive = false } = {},
    ticks = 1,
  ) => {
    const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
    gs.wNumScene = 2
    const actor = {
      id: 10,
      x: 100,
      y: 100,
      spriteNum: 1,
      sState: 1,
      facing: 'left',
      scriptedFrame: frame,
      nSpriteFrames: layout,
      nSpriteFramesAuto: autoFrames,
      autoLabel: 'L_0',
      autoCursor: { ip: 0 },
    }
    gs.npcs = [actor]
    gs.allEventObjects = Array.from({ length: 12 }, (_, id) =>
      id === actor.id ? actor : { ...actor, id, sState: 0, autoCursor: undefined },
    )
    if (targetActive) {
      gs.allEventObjects[11].sState = 1
      gs.npcs.push(gs.allEventObjects[11])
    }
    api.setGlobalEvents(commands)
    const before = host.__readOpeningMatrix().causes.length
    const random = Math.random
    try {
      Math.random = () => sample
      for (let i = 0; i < ticks; i++) api.tickAutoScripts(gs)
    } finally {
      Math.random = random
    }
    return { causes: host.__readOpeningMatrix().causes.slice(before) }
  }
  const prove = (trace, commands) =>
    verifyGameAutoCycles(
      trace,
      [{ scene: 's001', entity: 'e10' }],
      verifyGameAutoBatches(trace, commands, { requireCaller: false }),
      commands,
    )
  const selecting = [
    { op: 'raw', opcode: 0x24, operands: [12, 2, 0], label: 'L_0' },
    { op: 'end' },
    { op: 'end', label: 'L_2' },
  ]
  const selected = capture(selecting)
  assert.equal(prove(selected, selecting).length, 1)
  const missingRestart = structuredClone(selected)
  missingRestart.causes = missingRestart.causes.filter(
    (event) => event.phase !== 'auto-selection-committed',
  )
  assert.throws(() => prove(missingRestart, selecting), /automatic selection/)
  const retainedCursor = structuredClone(selected)
  retainedCursor.causes.find((event) => event.phase === 'auto-selection-committed').cursor = {
    ip: 1,
    idleFrameCount: 9,
  }
  assert.throws(() => prove(retainedCursor, selecting), /actual target cursor/)
  const installedTarget = capture(selecting, { targetActive: true }),
    targetCycles = verifyGameAutoCycles(
      installedTarget,
      [{ scene: 's001', entity: 'e11' }],
      verifyGameAutoBatches(installedTarget, selecting, { requireCaller: false }),
      selecting,
    ),
    otherBinding = { scene: 's001', entity: 'e11' },
    otherGraph = { label: 'L_0', source: sourceAutomaticLanguage([selecting[2]], 0) }
  assert.deepEqual(
    verifyBoundSourceCalls(installedTarget, otherBinding, otherGraph, targetCycles, selecting),
    [],
  )
  for (const change of [
    (event) => {
      event.cursor = { ip: 1 }
    },
    (event) => {
      event.entry = 1
    },
    (event) => {
      event.operand = 11
    },
  ]) {
    const wrongInstallation = structuredClone(installedTarget)
    change(wrongInstallation.causes.find((event) => event.phase === 'auto-selection-committed'))
    assert.throws(
      () =>
        verifyBoundSourceCalls(
          wrongInstallation,
          otherBinding,
          otherGraph,
          targetCycles,
          selecting,
        ),
      /installation (cursor|entry|operand) differs/,
    )
  }
  const twoEntries = [
    { op: 'raw', opcode: 0x87, operands: [0, 0, 0], label: 'L_0' },
    { op: 'end', advance: true },
    { op: 'raw', opcode: 0x87, operands: [0, 0, 0], label: 'L_2' },
    { op: 'end' },
  ]
  const actualEntries = capture(twoEntries, {}, 3),
    cycles = prove(actualEntries, twoEntries),
    binding = { scene: 's001', entity: 'e10' }
  assert.equal(
    verifyBoundSourceCalls(
      actualEntries,
      binding,
      {
        label: 'L_0',
        source: sourceAutomaticLanguage(twoEntries, 0),
      },
      cycles,
    ).length,
    3,
  )
  assert.throws(
    () =>
      verifyBoundSourceCalls(
        actualEntries,
        binding,
        {
          label: 'L_0',
          source: sourceAutomaticLanguage([twoEntries[0], { op: 'end' }], 0),
        },
        cycles,
      ),
    /escapes proved source graph/,
  )
  for (const [layout, autoFrames, frame] of [
    [3, 0, 3],
    [2, 18, 1],
    [0, 8, 7],
    [0, 0, 2],
  ]) {
    for (const returnCommand of [
      { op: 'goto', to: 'L_0' },
      { op: 'end', reset: true, resetTo: 0 },
    ]) {
      const commands = [
        { op: 'raw', opcode: 0x87, operands: [0, 0, 0], label: 'L_0' },
        returnCommand,
      ]
      const trace = capture(commands, { layout, autoFrames, frame }, 3)
      assert.equal(prove(trace, commands).length, 3)
      for (const field of ['frame', 'position', 'facing']) {
        const wrong = structuredClone(trace)
        const end = wrong.causes.find((event) => event.phase === 'auto-step')
        const changed =
          field === 'position' ? [101, 100] : field === 'facing' ? 'up' : end.after.frame + 1
        end.after[field] = changed
        end.poses.e10.state[field === 'frame' ? 'localFrame' : field] = changed
        assert.throws(() => prove(wrong, commands), /source state\/pose/)
      }
    }
  }
  for (const rate of [0, 1, 50, 100, 101])
    for (const sample of [0, 0.99])
      for (const target of [0, 2, 90]) {
        const commands = [
          { op: 'raw', opcode: 6, operands: [rate, target, 0], label: 'L_0' },
          { op: 'end' },
          { op: 'goto', to: 'L_3', label: 'L_90' },
          { op: 'raw', opcode: 0x87, operands: [0, 0, 0], label: 'L_3' },
        ]
        const trace = capture(commands, { sample })
        assert.equal(prove(trace, commands).length, 1)
        const wrong = structuredClone(trace)
        wrong.causes.find((e) => e.phase === 'auto-step').after.ip = 99
        assert.throws(() => prove(wrong, commands), /source state\/pose/)
        if (target === 0 && [0, 1, 101].includes(rate)) {
          const impossible = structuredClone(trace)
          impossible.causes.find((e) => e.phase === 'auto-step').after.ip = rate <= 1 ? 1 : 0
          assert.throws(() => prove(impossible, commands), /source state\/pose/)
        }
        if (target && Math.floor(sample * 100) + 1 >= rate) {
          const missing = structuredClone(trace)
          const dispatch = missing.causes.find(
            (e) => e.phase === 'command' && e.occurrence.ip === 3,
          )
          missing.causes = missing.causes.filter((e) => e !== dispatch)
          assert.throws(() => prove(missing, commands))
        }
      }
})

test('native loop words preserve lexical transfers, ambiguous branches, restored frames and end kinds', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { RuntimeFrameSession } = await server.ssrLoadModule(
    '/packages/reforge/src/runtime-frame-session.ts',
  )
  const { ScriptRunnerCore } = await server.ssrLoadModule(
    '/packages/reforge/src/script-runner-core.ts',
  )
  const { compileBaseScriptFlow } = await server.ssrLoadModule(
    '/packages/reforge/src/script-compiler-core.ts',
  )
  const self = { scene: 's001', entity: 'e10' },
    digest = 'a'.repeat(64)
  host.__openingMatrixPoint('render:world', { scene: 's001', actors: {} })
  const wait = (ms) => ({ kind: 'wait', ms })
  const loop = (body) => ({ kind: 'loop', mode: 'forever', body })
  let world = {},
    activation = null
  for (const [key, value] of Object.entries({
    __openingCauseSnapshot: () => host.__openingCauseWorld(world),
    __openingCauseLifecycleSnapshot: () => ({
      activations: activation ? [activation] : [],
      restored: [],
    }),
  })) {
    const before = Object.getOwnPropertyDescriptor(globalThis, key)
    globalThis[key] = value
    host[key] = value
    t.after(() => {
      if (before) Object.defineProperty(globalThis, key, before)
      else delete globalThis[key]
    })
  }
  async function record(body, { resume = null, live = false } = {}) {
    const flow = {
      kind: 'stages',
      initial: 'initial',
      stages: [{ id: 'initial', body, next: { kind: 'complete' } }],
    }
    const scenes = {
      s001: { entities: [{ id: 'e10', behaviors: { auto: { default: { flow } } } }] },
    }
    const controller = new AbortController()
    const frames = new RuntimeFrameSession(100)
    activation = { ...self, sceneSession: 'test-session', epoch: 1, signal: controller.signal }
    world = {
      script: {
        entityState: {},
        behaviors: {
          entities: {
            s001: {
              e10: {
                auto: {
                  cursor: {
                    behavior: 'default',
                    at: { kind: 'stage', stage: 'initial' },
                    ...(resume ? { resume } : {}),
                  },
                },
              },
            },
          },
        },
      },
    }
    const runner = new ScriptRunnerCore(
      {
        gameplayNow: () => 0,
        evalCondition: () => false,
        yieldMacroTask: async () => {},
        execute: (command, _context, signal) =>
          live ? frames.wait(command.ms, signal) : undefined,
      },
      controller.signal,
    )
    host.__openingCauseBinding(runner, {
      kind: 'entity-behavior',
      ...self,
      channel: 'auto',
      behavior: 'default',
      sceneSession: 'test-session',
    })
    const before = host.__readOpeningMatrix().causes.length
    host.__openingCauseAuto('auto-started', controller.signal, {
      entity: self.entity,
      epoch: 1,
      sceneSession: 'test-session',
    })
    const execution = runner.runFlow(
      compileBaseScriptFlow(flow, { timing: 'auto', canonicalContentDigest: digest }),
      {
        self,
        cursor: { kind: 'stage', stage: 'initial' },
        ...(resume ? { resume } : {}),
        cursorController: {
          reachSafePoint: () => 'continue',
          checkpointEnabled: true,
          checkpoint: () => 'continue',
        },
      },
    )
    if (live) {
      await new Promise(setImmediate)
      host.__openingMatrixPoint('render:world', {
        scene: 's001',
        actors: {},
        renderEvidence: { atMs: 0 },
      })
    } else await execution
    const observed = host.__readOpeningMatrix()
    const trace = {
      causes: observed.causes.slice(before),
      worldRenders: live ? observed.worldRenders.slice(-1) : [],
      renderScope: {
        afterOrder: -1,
        throughOrder: live ? observed.worldRenders.at(-1).order : observed.causes.at(-1).order,
      },
    }
    let aborted
    if (live) {
      controller.abort()
      await assert.rejects(execution, { name: 'AbortError' })
      aborted = { causes: host.__readOpeningMatrix().causes.slice(before) }
    }
    return { trace, aborted, scenes }
  }
  const { trace, scenes } = await record([
    {
      kind: 'repeat',
      id: 'outer',
      count: 2,
      body: [
        loop([
          {
            kind: 'branch',
            cond: { kind: 'chance', percent: 50 },
            then: [wait(0), wait(1), { kind: 'breakLoop' }],
            else: [wait(0), wait(2), { kind: 'breakLoop' }],
          },
        ]),
        wait(3),
        loop([{ kind: 'continueLoop', loop: 'outer' }]),
        wait(999),
      ],
    },
    { kind: 'finishStep', next: { kind: 'complete' } },
  ])
  const verify = (raw, definitions = scenes) => checkLoopControl(raw, definitions)
  // An explicitly bound automatic language owes its complete control word even
  // when it contains only repeat, with no forever-loop command to select it.
  const repeated = await record([
    { kind: 'repeat', count: 2, body: [wait(100)] },
    { kind: 'finishStep', next: { kind: 'complete' } },
  ])
  const verifyRepeat = (raw) =>
    checkLoopControl(raw, repeated.scenes, {
      requiredAuthors: [{ ...self, channel: 'auto', behavior: 'default' }],
    })
  assert.equal(verifyRepeat(repeated.trace).checked, 1)
  const binding = { ...self, channel: 'auto', behavior: 'default', stage: 'initial' }
  assert.equal(
    verifyBoundAutomaticRuns(repeated.trace, [binding], repeated.scenes).starts.length,
    1,
  )
  assert.throws(
    () =>
      verifyBoundAutomaticRuns(
        repeated.trace,
        [{ ...binding, stage: 'another-canonical-stage' }],
        repeated.scenes,
      ),
    /unproved stage/,
  )
  const missingIteration = structuredClone(repeated.trace)
  const secondWait = missingIteration.causes.filter(
    (event) => event.phase === 'command' && event.occurrence.command.command?.kind === 'wait',
  )[1]
  missingIteration.causes = missingIteration.causes.filter(
    (event) => event.occurrence?.id !== secondWait.occurrence.id,
  )
  assert.equal(verifyRepeat(missingIteration).status, 'rejected')
  assert.equal(verify(trace).status, 'proved')
  assert.equal(verify(trace).checked, 1)
  for (const corrupt of [
    (copy) => {
      const e = copy.causes.find(
        (e) => e.phase === 'command' && e.occurrence.command.kind === 'breakLoop',
      )
      copy.causes = copy.causes.filter((x) => x !== e)
    },
    (copy) => {
      copy.causes.find(
        (e) => e.phase === 'command' && e.occurrence.command.kind === 'continueLoop',
      ).occurrence.command.loop = 'missing'
    },
    (copy) => {
      copy.causes.find(
        (e) => e.phase === 'command' && e.occurrence.command.command?.ms === 3,
      ).occurrence.path = ['initial', 1]
    },
    (copy) => {
      copy.causes = copy.causes.filter((e) => e.phase !== 'stage-settled')
    },
    (copy) => {
      const e = copy.causes.findLast((e) => e.phase === 'leaf-completed')
      copy.causes = copy.causes.filter((x) => x !== e)
    },
    (copy) => {
      copy.causes.find((e) => e.phase === 'run-ended').aborted = true
    },
    (copy) => {
      copy.causes.find(
        (e) => e.phase === 'command' && e.occurrence.command.kind === 'branch',
      ).engine = 'game'
    },
    (copy) => {
      copy.causes.find((e) => e.phase === 'command' && e.occurrence.command.kind === 'branch')
        .activityId++
    },
  ]) {
    const copy = structuredClone(trace)
    corrupt(copy)
    assert.equal(verify(copy).status, 'rejected', String(corrupt))
  }
  for (const count of [1, 3]) {
    const changed = structuredClone(scenes)
    changed.s001.entities[0].behaviors.auto.default.flow.stages[0].body[0].count = count
    assert.equal(verify(trace, changed).status, 'rejected')
  }
  const resumedBody = [
    { kind: 'repeat', count: 2, body: [loop([wait(11), { kind: 'breakLoop' }]), wait(33)] },
  ]
  for (const index of [0, 2]) {
    const resume = {
      digest,
      frames: [
        { index: 0, control: { kind: 'repeat', iteration: 2 } },
        { index: 0, control: { kind: 'loop', phase: 'body' } },
        { index },
      ],
    }
    const result = await record(resumedBody, { resume })
    assert.equal(verify(result.trace, result.scenes).status, 'proved')
    const wrong = structuredClone(result.trace)
    const start = wrong.causes.find((e) => e.phase === 'run-started')
    start.resume.frames[0].control.iteration = 1
    start.world.script.behaviors.entities.s001.e10.auto.cursor.resume.frames[0].control.iteration = 1
    assert.equal(verify(wrong, result.scenes).status, 'rejected')
  }
  const deepBody = [
    {
      kind: 'repeat',
      count: 2,
      body: [
        loop([
          {
            kind: 'branch',
            cond: { kind: 'chance', percent: 50 },
            then: [
              loop([
                {
                  kind: 'branch',
                  cond: { kind: 'chance', percent: 50 },
                  then: [wait(11), { kind: 'breakLoop' }],
                  else: [wait(12), { kind: 'breakLoop' }],
                },
              ]),
              { kind: 'breakLoop' },
            ],
            else: [{ kind: 'breakLoop' }],
          },
        ]),
        wait(33),
      ],
    },
  ]
  const deepResume = {
    digest,
    frames: [
      { index: 0, control: { kind: 'repeat', iteration: 2 } },
      { index: 0, control: { kind: 'loop', phase: 'body' } },
      { index: 0, control: { kind: 'branch', arm: 'then' } },
      { index: 0, control: { kind: 'loop', phase: 'body' } },
      { index: 0, control: { kind: 'branch', arm: 'else' } },
      { index: 0 },
    ],
  }
  const deep = await record(deepBody, { resume: deepResume })
  assert.equal(verify(deep.trace, deep.scenes).status, 'proved')
  for (const mutate of [
    (resume) => {
      resume.digest = 'b'.repeat(64)
    },
    (resume) => {
      resume.frames.at(-1).index = 1
    },
    (resume) => {
      resume.frames[2].control.arm = 'else'
    },
    (resume) => {
      resume.frames.at(-1).index = 99
    },
    (resume) => {
      resume.frames.at(-1).control = { kind: 'leaf', command: 'wait', phase: 'wait' }
    },
    (resume) => {
      resume.frames.push(...Array.from({ length: 257 }, () => ({ index: 0 })))
    },
    (resume) => {
      resume.frames[0].control.extra = true
    },
  ]) {
    const changed = structuredClone(deep.trace),
      start = changed.causes.find((e) => e.phase === 'run-started')
    mutate(start.resume)
    start.world.script.behaviors.entities.s001.e10.auto.cursor.resume = structuredClone(
      start.resume,
    )
    assert.equal(verify(changed, deep.scenes).status, 'rejected')
  }
  const lostResume = structuredClone(trace)
  lostResume.causes.find(
    (e) => e.phase === 'run-started',
  ).world.script.behaviors.entities.s001.e10.auto.cursor.resume = deepResume
  assert.equal(verify(lostResume).status, 'rejected')
  const prefix = await record([loop([wait(10)])], { live: true })
  const holds = {
    waits: verifyStoryWaits(prefix.trace),
    dialogues: [],
    motion: [],
    partyMotion: [],
  }
  const mixed = { ...prefix.trace, causes: [...trace.causes, ...prefix.trace.causes] }
  // Evaluate the identical predicates over the original full stream as a reference
  // for the run index. These inputs came from actual runner/frame-session calls.
  const unindexed = new Function(
    'assert',
    'leaf',
    'within',
    `return (${verifyStoryHolds.toString().replaceAll('runEvents.find', 'events.find')})`,
  )(
    assert,
    (e) => e.occurrence?.command?.command,
    (raw, e) => e.order > raw.renderScope.afterOrder && e.order <= raw.renderScope.throughOrder,
  )
  const held = verifyStoryHolds(mixed, [self], holds)
  assert.deepEqual(held, unindexed(mixed, [self], holds))
  assert.equal(held.length, 1)
  assert.equal(held[0].reasons[0].kind, 'wait')
  assert.throws(() => verifyStoryHolds(mixed, [self], { ...holds, waits: [] }), /unexplained draw/)
  assert.equal(verify(prefix.trace, prefix.scenes).final.runs[0].outcome, 'proved-prefix')
  assert.equal(verify(prefix.aborted, prefix.scenes).final.runs[0].outcome, 'proved-aborted-prefix')
  const noActivation = structuredClone(prefix.trace)
  noActivation.causes.at(-1).lifecycle.activations = []
  assert.equal(verify(noActivation, prefix.scenes).status, 'rejected')
  const noAbort = structuredClone(prefix.aborted)
  noAbort.causes = noAbort.causes.filter((e) => e.phase !== 'auto-aborted')
  assert.equal(verify(noAbort, prefix.scenes).status, 'rejected')
})

test('a loadScene occurrence cannot authorize an extra gameplay wait after its fade', () => {
  const base = {
    events: [{ kind: 'scene-lifecycle', phase: 'ready', scene: 's004', sceneVisit: 4, order: 5 }],
    causes: [
      {
        phase: 'wait-start',
        scene: 's004',
        sceneVisit: 4,
        order: 10,
        runId: 7,
        waitId: 3,
        ms: 340,
        deadline: 350,
        occurrence: {
          id: 9,
          path: ['initial', 0],
          command: { kind: 'leaf', command: { kind: 'loadScene', scene: 's004' } },
        },
      },
      { phase: 'wait-end', waitId: 3, order: 20, reason: 'deadline' },
      {
        phase: 'run-started',
        runId: 8,
        order: 30,
        sceneVisit: 4,
        author: { channel: 'auto', scene: 's004', entity: 'e76' },
      },
    ],
  }
  // Legal timer/run/occurrence fields do not make the old un-authored 340ms wait intentional.
  // The positive producer runs through the actual fade in main.auto-pose-authority.test.ts.
  assert.throws(() => verifyStoryWaits(base), /un-authored scene-load gameplay wait/)
})

test('native automatic state synchronization uses the addressed pre-state, including signed state operands', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { createInitialGameState } = await server.ssrLoadModule(
    '/packages/game/src/core/game-state.ts',
  )
  const api = await server.ssrLoadModule('/packages/game/src/core/event-system.ts')
  t.after(() => api.setGlobalEvents([]))
  for (const [targetState, operand, expectedState] of [
    [2, 2, 2],
    [2, 0, 1],
    [-1, 65535, -1],
  ]) {
    const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
    gs.wNumScene = 2
    const actor = {
      id: 10,
      x: 100,
      y: 100,
      spriteNum: 1,
      sState: 1,
      facing: 'down',
      scriptedFrame: 0,
      nSpriteFrames: 3,
      autoCursor: { ip: 0 },
    }
    const target = { ...actor, id: 11, sState: targetState, autoCursor: undefined }
    gs.npcs = [actor, target]
    gs.allEventObjects = [actor, target, ...[3, 8].map((id) => ({ ...target, id, sState: 0 }))]
    const commands = [
      { op: 'raw', opcode: api.OP_SYNC_OBJ_STATE, operands: [12, operand, 0], label: 'L_0' },
    ]
    api.setGlobalEvents(commands)
    const before = host.__readOpeningMatrix().causes.length
    api.tickAutoScripts(gs)
    const trace = { causes: host.__readOpeningMatrix().causes.slice(before) }
    assert.equal(actor.sState, expectedState)
    const prove = (raw) =>
      verifyGameAutoCycles(
        raw,
        [{ scene: 's001', entity: 'e10' }],
        verifyGameAutoBatches(raw, commands, { requireCaller: false }),
        commands,
      )
    assert.equal(prove(trace).length, 1)
    const wrong = structuredClone(trace)
    wrong.causes.find((event) => event.phase === 'auto-step').poses.e10.state.state =
      expectedState + 1
    assert.throws(() => prove(wrong), /conditional state synchronization/)
    const absent = structuredClone(trace)
    delete absent.causes.find((event) => event.phase === 'auto-before').poses.e11
    assert.throws(() => prove(absent), /state sync lacks source state/)
  }
})

test('actual Game automatic recursion records every dispatch and keeps its native owner', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { createInitialGameState } = await server.ssrLoadModule(
    '/packages/game/src/core/game-state.ts',
  )
  const api = await server.ssrLoadModule('/packages/game/src/core/event-system.ts')
  const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
  gs.wNumScene = 2
  const npc = {
    id: 10,
    x: 100,
    y: 100,
    spriteNum: 1,
    sState: 1,
    facing: 'down',
    scriptedFrame: 0,
    nSpriteFrames: 3,
    autoCursor: { ip: 0 },
  }
  gs.npcs = [npc]
  gs.allEventObjects = [
    npc,
    ...[3, 8, 11].map((id) => ({
      id,
      x: 0,
      y: 0,
      spriteNum: 0,
      sState: 0,
      facing: 'down',
      scriptedFrame: 0,
    })),
  ]
  const sourceCommands = [
    { op: 'raw', opcode: api.OP_MOVE_OBJECT, operands: [0, 4, 0xfffe], label: 'L_0' },
    { op: 'goto', to: 'L_0', label: 'L_1' },
  ]
  api.setGlobalEvents(sourceCommands)
  t.after(() => api.setGlobalEvents([]))
  const file = 'packages/game/src/core/scene-system.ts',
    source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = instrumentOpeningTrace(source, file).code,
    ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const fn = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'tickScenePreInput',
  )
  const deps = {
    tickAutoScripts: api.tickAutoScripts,
    requireSceneContext: () => ({}),
    updateEventObjectsAndTrigger() {},
    pushPartyAwayFromBlockingNpcs() {},
    tickChaseTimer() {},
    globalThis: host,
  }
  const tick = new Function(
    'deps',
    ts.transpile(
      `const {${Object.keys(deps)}}=deps;${fn.getText(ast).replace('export ', '')};return tickScenePreInput`,
      { target: ts.ScriptTarget.ES2022 },
    ),
  )(deps)
  gs.mode = 'explore'
  tick(gs)
  tick(gs)
  const trace = host.__readOpeningMatrix()
  assert.deepEqual(trace.errors, [])
  assert.deepEqual([npc.x, npc.y], [108, 96])
  const commands = trace.causes.filter((e) => e.phase === 'command')
  assert.deepEqual(
    commands.map((e) => [e.channel, e.actor, e.occurrence.ip]),
    [
      ['auto', 10, 0],
      ['auto', 10, 1],
      ['auto', 10, 0],
    ],
  )
  assert.equal(new Set(commands.map((e) => e.runId)).size, 1)
  assert.equal(new Set(commands.map((e) => e.occurrence.id)).size, 3)
  const steps = trace.causes.filter((e) => e.phase === 'auto-step')
  assert.deepEqual(
    steps.map((e) => e.occurrence.id),
    [commands[0].occurrence.id, commands[2].occurrence.id],
  )
  assert(steps.every((e) => e.runId === commands[0].runId))
  const batches = verifyGameAutoBatches(trace, sourceCommands)
  assert.equal(batches.length, 2)
  assert.equal(
    verifyGameAutoCycles(trace, [{ scene: 's001', entity: 'e10' }], batches, sourceCommands).length,
    2,
  )
  for (const remove of [
    (e) => e.phase === 'auto-owed' || e.batchId !== null,
    (e) => e.batchId === batches[1].start.batchId,
    (e) => e.autoCallId === batches[0].calls[0].start.autoCallId,
    (e) => e.phase === 'command' && e.occurrence.ip === 1,
  ]) {
    const corrupt = { ...trace, causes: trace.causes.filter((e) => !remove(e)) }
    assert.throws(() =>
      verifyGameAutoCycles(
        corrupt,
        [{ scene: 's001', entity: 'e10' }],
        verifyGameAutoBatches(corrupt, sourceCommands),
        sourceCommands,
      ),
    )
  }
  const modeFile = 'packages/game/src/core/mode.ts',
    modeSource = await readFile(new URL(`../../${modeFile}`, import.meta.url), 'utf8')
  const modeAst = ts.createSourceFile(
    modeFile,
    instrumentOpeningTrace(modeSource, modeFile).code,
    ts.ScriptTarget.Latest,
    true,
  )
  const modeFn = modeAst.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'tickByMode',
  )
  const modeDeps = {
    globalThis: host,
    tickSceneAutoFadeIn() {},
    tickAutoScripts: api.tickAutoScripts,
    tickChaseTimer() {},
    tickSceneSystem: tick,
    tickEventSystem() {},
    tickBattle() {},
    tickMenu() {},
  }
  const tickMode = new Function(
    'deps',
    ts.transpile(
      `const {${Object.keys(modeDeps)}}=deps;${modeFn.getText(modeAst).replace('export ', '')};return tickByMode`,
      { target: ts.ScriptTarget.ES2022 },
    ),
  )(modeDeps)
  gs.mode = 'event'
  gs.eventCursor = { waiting: 'frame-wait', ip: 99 }
  tickMode(gs, {}, {})
  gs.mode = 'explore'
  gs.sceneLoading = true
  tickMode(gs, {}, {})
  gs.sceneLoading = false
  tickMode(gs, {}, {})
  const withCallers = host.__readOpeningMatrix()
  assert.deepEqual(withCallers.errors, [])
  assert.equal(verifyGameAutoBatches(withCallers, sourceCommands).length, 4)
  const omittedExplore = {
    ...withCallers,
    causes: withCallers.causes.filter(
      (event) =>
        event.tick !== gs.frameNum ||
        ['auto-event-decision', 'clock', 'auto-mode-dispatch'].includes(event.phase),
    ),
  }
  assert.throws(() => verifyGameAutoBatches(omittedExplore, sourceCommands), /explore dispatch/)
})

test('actual Game synchronous entry records writes and termination, with a fresh owner for each invocation', async (t) => {
  const { server, host } = await pageLifecycleRuntime(t)
  const { createInitialGameState } = await server.ssrLoadModule(
    '/packages/game/src/core/game-state.ts',
  )
  const api = await server.ssrLoadModule('/packages/game/src/core/event-system.ts')
  const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
  gs.wNumScene = 1
  const commands = [{ op: 'raw', opcode: 0x46, operands: [2, 3, 0] }, { op: 'end' }]
  api.runEnterScript(gs, commands, {}, 0, 1)
  api.runEnterScript(gs, commands, {}, 0, 1)
  assert.deepEqual([gs.party.x, gs.party.y], [64, 48])
  const trace = host.__readOpeningMatrix()
  assert.deepEqual(trace.errors, [])
  const receipts = trace.causes.filter((e) => e.phase === 'command')
  assert.deepEqual(
    receipts.map((e) => [e.channel, e.occurrence.ip]),
    [
      ['onEnter', 0],
      ['onEnter', 1],
      ['onEnter', 0],
      ['onEnter', 1],
    ],
  )
  assert.equal(receipts[0].runId, receipts[1].runId)
  assert.equal(receipts[2].runId, receipts[3].runId)
  assert.notEqual(receipts[0].runId, receipts[2].runId)
  assert.equal(new Set(receipts.map((e) => e.occurrence.id)).size, 4)
})

test('Game dialogue phase cannot overwrite the causal event discriminator', () => {
  const host = collector(),
    cursor = {}
  host.__e2eSceneBoundary({ scene: 's001', tick: 10 })
  host.__openingMatrixGame = () => {}
  const gs = { dialogBox: { phase: 'waiting-input', shownLines: [] } }
  host.__openingCauseGame(gs, 'clock', cursor, { frameId: 10, now: 1000 })
  host.__openingCauseGame(gs, 'event-before', cursor, {
    phase: 'typing',
    waiting: 'dialog',
    pressed: ['Enter'],
  })
  host.__openingCauseGame(gs, 'dialog-input', cursor, { phase: 'waiting-input', result: 'skip' })
  const trace = host.__readOpeningMatrix()
  assert.deepEqual(trace.errors, [])
  assert.deepEqual(
    trace.causes.map((e) => [e.phase, e.dialogPhase]),
    [
      ['clock', undefined],
      ['event-before', 'typing'],
      ['dialog-input', 'waiting-input'],
    ],
  )
  assert.deepEqual(trace.causes.at(-1).clock, trace.causes[0].clock)
})

test('every Game dialogue input is paired with its real dispatch, not just one example', () => {
  const events = [0, 1].flatMap((frame) => [
    {
      phase: 'event-before',
      order: frame * 3,
      runId: 1,
      waiting: 'dialog',
      dialogue: { phase: 'waiting-page-key' },
      pressed: ['Confirm'],
      clock: { frameId: frame },
    },
    {
      phase: 'dialog-input',
      order: frame * 3 + 1,
      runId: 1,
      result: 'page-advance',
      clock: { frameId: frame },
    },
    { phase: 'event-after', order: frame * 3 + 2, runId: 1 },
  ])
  assert.equal(verifyOpeningGameDialogue(events).length, 2)
  assert.throws(
    () => verifyOpeningGameDialogue(events.filter((event) => event.order !== 4)),
    /missing\/duplicate consumption/,
  )
})

test('normal motion must commit on every actual eligible frame, without a time tolerance', () => {
  const clock = (frameId, now) => ({
    engine: 'reforge',
    frameId,
    now,
    realNow: now,
    frozen: false,
    stepping: false,
  })
  const c0 = clock(0, 1000),
    c1 = clock(1, 1050),
    c2 = clock(2, 1100)
  const events = [
    { phase: 'clock', order: 0, clock: c0 },
    { phase: 'clock', order: 2, clock: c1 },
    {
      phase: 'cadence',
      order: 3,
      clock: c1,
      dt: 50,
      frozen: false,
      stepMs: 100,
      before: { tick: 0, accumulator: 0 },
      after: { tick: 0, accumulator: 50 },
    },
    { phase: 'clock', order: 5, clock: c2 },
    {
      phase: 'cadence',
      order: 6,
      clock: c2,
      dt: 50,
      frozen: false,
      stepMs: 100,
      before: { tick: 0, accumulator: 50 },
      after: { tick: 1, accumulator: 0 },
    },
  ]
  const draws = [
    { order: 4, causalFrame: c1 },
    { order: 8, causalFrame: c2 },
  ]
  const moves = [{ order: 7, tick: 1 }]
  assert.equal(verifyOpeningMotionCadence(events, draws, moves, 1, 9).steps, 1)
  assert.throws(() => verifyOpeningMotionCadence(events, draws, [], 1, 9), /eligible step/)
  const slow = structuredClone(events)
  for (const event of slow) {
    event.clock.now = 1000 + (event.clock.now - 1000) * 2
    event.clock.realNow = event.clock.now
  }
  assert.throws(() => verifyOpeningMotionCadence(slow, draws, moves, 1, 9), /elapsed time/)
  const delayed = structuredClone(events)
  delayed.at(-1).after = { tick: 0, accumulator: 100 }
  assert.throws(() => verifyOpeningMotionCadence(delayed, draws, moves, 1, 9), /world step skipped/)
})

test('instrumented real runner, frame timer and dialogue produce causal receipts, not synthetic elapsed totals', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-causal-test-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../packages/reforge', import.meta.url)),
    plugins: [openingTracePlugin()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  })
  const host = collector(),
    old = new Map()
  for (const [key, value] of Object.entries(host)) {
    old.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    globalThis[key] = value
  }
  t.after(() => {
    for (const [key, descriptor] of old) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  const { RuntimeFrameSession } = await server.ssrLoadModule('/src/runtime-frame-session.ts')
  const { ScriptWorkQueue, scriptWorkWait } = await server.ssrLoadModule(
    '/src/script-work-queue.ts',
  )
  const { ScriptRunnerCore } = await server.ssrLoadModule('/src/script-runner-core.ts')
  const { compileBaseScriptFlow } = await server.ssrLoadModule('/src/script-compiler-core.ts')
  const { DialogBox } = await server.ssrLoadModule('/src/dialog/dialog-box.ts')
  const { startDialogue } = await server.ssrLoadModule('/src/dialogue.ts')
  // Empty glyph resources are legal; real layout, pagination, typing and input consumers execute.
  const box = new DialogBox({ drawImage() {} }, new Map(), [])
  const frames = new RuntimeFrameSession(100),
    queue = new ScriptWorkQueue()
  let finishDialogue,
    press = false,
    completed = false,
    testScene = 's001'
  const render = () => host.__openingMatrixPoint('render:world', { scene: testScene, actors: {} })
  host.__e2eSceneBoundary({ scene: 's001' })
  const ports = {
    afterScriptWork: (action) => queue.whenIdle(action),
    activateConfirm() {},
    resumeScriptGates() {},
    gameplayFrozen: () => false,
    advanceFade() {},
    settleClosedDialogue() {
      if (!box.active && finishDialogue) {
        const finish = finishDialogue
        finishDialogue = null
        finish()
      }
    },
    consumePressed: () => new Set(),
    tickHostiles() {},
    advanceMoves() {},
    deriveMounts() {},
    advanceLifecycle() {},
    advanceEntityActions() {},
    clearWorldTicks() {},
    presentBattle: () => false,
    routeInput() {
      if (press) {
        press = false
        box.advance(frames.now)
      }
    },
    presentWorld() {
      render()
      box.render(frames.now)
      host.__openingMatrixRendered(box.observe())
    },
  }
  await frames.tick(0, ports)
  const signal = new AbortController().signal,
    done = queue.begin(signal)
  const runner = new ScriptRunnerCore(
    {
      gameplayNow: () => frames.now,
      execute(command, _context, owner) {
        if (command.kind === 'wait') return frames.wait(command.ms, owner)
        if (command.kind === 'dialog') {
          box.open(startDialogue({ id: 'test-dialogue', cues: [command.cue] }), frames.now)
          return scriptWorkWait(owner, (resolve) => {
            finishDialogue = resolve
          })
        }
        assert.equal(command.kind, 'clearDialog')
        completed = true
      },
    },
    signal,
  )
  const flow = compileBaseScriptFlow(
    {
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [
            { kind: 'wait', ms: 100 },
            {
              kind: 'dialog',
              cue: { rows: ['A', 'B', 'C', 'D', 'E'].map((text) => ({ text, speed: 10 })) },
            },
            { kind: 'clearDialog' },
          ],
          next: { kind: 'complete' },
        },
      ],
    },
    { timing: 'interactive', canonicalContentDigest: 'a'.repeat(64) },
  )
  const execution = runner
    .runFlow(flow, { cursorController: { reachSafePoint: () => 'continue' } })
    .finally(done)
  await frames.tick(1, ports)
  await frames.tick(99, ports)
  assert.equal(box.active, false)
  await frames.tick(100, ports)
  assert.equal(box.observe().phase, 'typing')
  press = true
  await frames.tick(101, ports) // skip typing, not a page/end consumption
  assert.equal(box.observe().pageIndex, 0)
  assert.equal(box.observe().phase, 'waiting-input')
  press = true
  await frames.tick(102, ports)
  assert.equal(box.observe().pageIndex, 1)
  await frames.tick(112, ports) // natural typing completion must be observed too
  press = true
  await frames.tick(113, ports)
  await execution
  assert.equal(completed, true)
  const trace = host.__readOpeningMatrix(),
    events = trace.causes
  assert.deepEqual(trace.errors, [])
  verifyOpeningDrawClocks(events, trace.worldRenders)
  const wrongFrame = structuredClone(trace.worldRenders)
  wrongFrame[1].causalFrame.frameId++
  assert.throws(() => verifyOpeningDrawClocks(events, wrongFrame), /different causal frame/)
  const start = events.find((e) => e.phase === 'wait-start')
  const receipt = verifyOpeningWaitReceipt(start, events, trace.worldRenders)
  assert.equal(receipt.end.now, 100)
  for (const phase of ['wait-start', 'wait-end']) {
    const copy = structuredClone(events)
    copy.find((e) => e.phase === phase).now += 100
    assert.throws(
      () =>
        verifyOpeningWaitReceipt(
          copy.find((e) => e.phase === 'wait-start'),
          copy,
          trace.worldRenders,
        ),
      /actual gameplay clock/,
    )
  }
  assert.equal(receipt.resumed.occurrence.command.command.kind, 'dialog')
  assert.equal(verifyOpeningDialogue(events, trace.worldRenders, trace.pages).length, 1)
  const missingPageTurn = events.filter(
    (e) => !(e.phase === 'dialogue' && e.source === 'advance' && e.after?.pageIndex === 1),
  )
  assert.throws(
    () => verifyOpeningDialogue(missingPageTurn, trace.worldRenders, trace.pages),
    /phase chain|page consumption/,
  )
  const automaticPageTurn = structuredClone(events)
  automaticPageTurn.find(
    (e) => e.phase === 'dialogue' && e.source === 'advance' && e.after?.pageIndex === 1,
  ).source = 'update'
  assert.throws(
    () => verifyOpeningDialogue(automaticPageTurn, trace.worldRenders, trace.pages),
    /phase chain|page consumption/,
  )
  const missingPage = trace.pages.slice(1)
  assert.throws(
    () => verifyOpeningDialogue(events, trace.worldRenders, missingPage),
    /rendered full page/,
  )
  const missingCommand = events.filter((e) => e.occurrence?.command?.command?.kind !== 'dialog')
  assert.throws(
    () => verifyOpeningDialogue(missingCommand, trace.worldRenders, trace.pages),
    /missing dialogue/,
  )

  const mutateWait = (change, pattern) => {
    const changed = structuredClone(events)
    change(
      changed.find((e) => e.phase === 'wait-end'),
      changed,
    )
    assert.throws(() => verifyOpeningWaitReceipt(start, changed, trace.worldRenders), pattern)
  }
  mutateWait((end) => {
    end.clock.frameId++
  }, /first eligible frame/)
  mutateWait((end) => {
    end.reason = 'clear'
  }, /aborted\/cleared/)
  mutateWait((_end, copy) => {
    copy.splice(
      copy.findIndex((e) => e.phase === 'wait-end'),
      1,
    )
  }, /missing\/duplicate/)
  const skipped = structuredClone(events)
  skipped.find(
    (e) => e.phase === 'dialogue' && e.source === 'advance' && e.before.phase === 'typing',
  ).after = null
  assert.throws(
    () => verifyOpeningDialogue(skipped, trace.worldRenders, trace.pages),
    /skip-typing/,
  )
  const late = structuredClone(events)
  late.find(
    (e) => e.phase === 'command' && e.occurrence.command.command?.kind === 'clearDialog',
  ).order = trace.worldRenders.at(-1).order + 1
  assert.throws(
    () => verifyOpeningDialogue(late, trace.worldRenders, trace.pages),
    /first available draw/,
  )

  // Execute every inserted settle form, including one-line loop/arrow callers (ASI regression).
  const aborted = new AbortController()
  const cancellation = frames.wait(10, aborted.signal)
  aborted.abort()
  await assert.rejects(cancellation, { name: 'AbortError' })
  const cleared = frames.wait(10, new AbortController().signal)
  frames.clearWaits()
  await cleared
  const settlements = host.__readOpeningMatrix().causes.filter((e) => e.phase === 'wait-end')
  assert.deepEqual(
    settlements.map((e) => e.reason),
    ['deadline', 'abort', 'clear'],
  )

  // Execute the actual transformed main dialogue closure: the old direct box.open fixture
  // could not detect main's early return dropping portrait-IO instrumentation.
  const file = 'packages/reforge/src/main.ts'
  const code = instrumentOpeningTrace(
    await readFile(new URL(`../../${file}`, import.meta.url), 'utf8'),
    file,
  ).code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const initializers = new Map()
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ['assertRunnerActive', 'awaitRunner', 'atScriptMutation'].includes(node.name.getText(ast))
    )
      initializers.set(node.name.getText(ast), node.initializer.getText(ast))
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'presentationOps') {
      const dialog = node.initializer.properties.find((p) => p.name?.getText(ast) === 'dialog')
      initializers.set('dialog', dialog.initializer.getText(ast))
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(initializers.size, 4)
  const { atScriptExecutionGate } = await server.ssrLoadModule('/src/script-execution-gate.ts')
  const { AsyncIntentController, asyncIntentAbortError } =
    await server.ssrLoadModule('/src/async-intent.ts')
  const { scriptWorkIO } = await server.ssrLoadModule('/src/script-work-queue.ts')
  let loadCount = 0,
    releaseImage
  const imagePending = new Promise((resolve) => {
    releaseImage = resolve
  })
  const scope = {
    atScriptExecutionGate,
    asyncIntentAbortError,
    scriptWorkIO,
    scriptWorkWait,
    scriptMutationIntent: new AsyncIntentController(),
    portraits: new Map(),
    project: {
      imageCache: {
        load() {
          loadCount++
          return imagePending
        },
      },
    },
    waitForScriptGameplay() {},
    scriptExecutionGateOpen: () => true,
    dialogBox: box,
    startDialogue,
    scriptDialogResolve: null,
    preserveClosedDialogFrame: false,
    frameAnimationPresentation: { enterDialogue() {} },
  }
  for (const [name, initializer] of initializers) {
    const js = ts.transpile(`const actual = ${initializer}`, { target: ts.ScriptTarget.ES2022 })
    scope[name] = new Function('scope', `with(scope) { ${js}; return actual; }`)(scope)
  }
  ports.settleClosedDialogue = () => {
    if (!box.active && scope.scriptDialogResolve) {
      const finish = scope.scriptDialogResolve
      scope.scriptDialogResolve = null
      finish()
    }
  }
  const coldSignal = new AbortController().signal,
    finishCold = queue.begin(coldSignal)
  const second = new ScriptRunnerCore(
    {
      gameplayNow: () => frames.now,
      execute(command, _context, owner) {
        if (command.kind === 'dialog') return scope.dialog(command.cue, owner)
        assert.equal(command.kind, 'wait')
        return frames.wait(command.ms, owner)
      },
    },
    coldSignal,
  )
  const cue = {
    rows: [{ text: 'A', speed: 0 }],
    portrait: { asset: 'cold-portrait', side: 'left' },
  }
  const secondFlow = compileBaseScriptFlow(
    {
      kind: 'stages',
      initial: 'initial',
      stages: [
        {
          id: 'initial',
          body: [
            { kind: 'dialog', cue },
            { kind: 'dialog', cue },
            { kind: 'wait', ms: 50 },
          ],
          next: { kind: 'complete' },
        },
      ],
    },
    { timing: 'interactive', canonicalContentDigest: 'b'.repeat(64) },
  )
  const beforeCold = host.__readOpeningMatrix().causes.at(-1).order
  const pendingExecution = second
    .runFlow(secondFlow, { cursorController: { reachSafePoint: () => 'continue' } })
    .finally(finishCold)
  await new Promise((resolve) => setTimeout(resolve, 5)) // allow real unresolved IO to park at its task boundary
  let now = 114
  await frames.tick(now++, ports)
  assert.equal(loadCount, 1)
  assert.equal(box.active, false)
  releaseImage({ width: 1, height: 1 })
  await frames.tick(now++, ports)
  assert.equal(box.active, true)
  const opens = () =>
    host
      .__readOpeningMatrix()
      .causes.filter((e) => e.order > beforeCold && e.phase === 'dialogue' && e.source === 'open')
  for (let i = 0; i < 4 && opens().length < 2; i++) {
    press = true
    await frames.tick(now++, ports)
  }
  assert.equal(opens().length, 2)
  assert.equal(loadCount, 1, 'cached second dialogue reloaded portrait')
  for (let i = 0; i < 4 && box.active; i++) {
    press = true
    await frames.tick(now++, ports)
  }
  assert.equal(box.active, false)
  await frames.tick(now + 50, ports)
  await pendingExecution
  const observed = host.__readOpeningMatrix()
  assert(verifyStoryWorkIO(observed).completed.length > 0)
  const lostIOEnd = {
    ...observed,
    causes: observed.causes.filter((event) => event.phase !== 'work-io-end'),
  }
  assert.throws(() => verifyStoryWorkIO(lostIOEnd), /unclosed work IO/)
  const commands = observed.causes.filter(
    (e) =>
      e.order > beforeCold &&
      e.phase === 'command' &&
      e.occurrence.command.command?.kind === 'dialog',
  )
  const cold = verifyDialoguePreparation(
    commands[0],
    opens()[0],
    observed.causes,
    observed.worldRenders,
  )
  const cached = verifyDialoguePreparation(
    commands[1],
    opens()[1],
    observed.causes,
    observed.worldRenders,
  )
  assert(cold.io && cold.draws.length, 'cold main caller must record actual IO and a pending draw')
  assert.deepEqual(cached, { draws: [], io: null })
  const lastWait = observed.causes.findLast((e) => e.phase === 'wait-start')
  const terminal = verifyOpeningWaitReceipt(lastWait, observed.causes, observed.worldRenders, {
    kind: 'completed',
  })
  assert.equal(terminal.resumed.phase, 'stage-settled')
  const finalCommand = observed.causes.find(
    (e) =>
      e.phase === 'command' &&
      e.runId === lastWait.runId &&
      e.occurrence.id === lastWait.occurrence.id,
  )
  const finiteExpected = {
    cursor: { kind: 'completed' },
    decision: 'continue',
    ready: terminal.end,
  }
  const finite = verifyScriptTerminalReceipt(
    finalCommand,
    observed.causes,
    observed.worldRenders,
    finiteExpected,
  )
  for (const phase of ['stage-settled', 'run-ended']) {
    const missing = observed.causes.filter(
      (e) => !(e.phase === phase && e.runId === finalCommand.runId),
    )
    assert.throws(
      () =>
        verifyScriptTerminalReceipt(finalCommand, missing, observed.worldRenders, finiteExpected),
      /unique/,
    )
  }
  const lateEnd = structuredClone(observed.causes)
  lateEnd.find((e) => e.order === finite.ended).order = finite.draw + 1
  assert.throws(
    () => verifyScriptTerminalReceipt(finalCommand, lateEnd, observed.worldRenders, finiteExpected),
    /first available draw/,
  )
  for (const mutate of [
    (e) => {
      e.cursor = { kind: 'stage' }
    },
    (e) => {
      e.decision = 'stop'
    },
    (e) => {
      e.sceneVisit = 99
    },
    (e) => {
      e.clock.frameId++
    },
    (e) => {
      e.timing = 'auto'
    },
  ]) {
    const copy = structuredClone(observed.causes)
    mutate(copy.find((e) => e.order === terminal.resumed.order))
    assert.throws(() =>
      verifyOpeningWaitReceipt(lastWait, copy, observed.worldRenders, { kind: 'completed' }),
    )
  }

  // A due timer can be cancelled by a same-frame scene exit before its runner resumes.
  // Exercise real timer -> world mutation -> aborted runner -> new-scene draw ordering.
  const departing = new AbortController(),
    finishDeparture = queue.begin(departing.signal)
  const third = new ScriptRunnerCore(
    {
      execute(command, _context, owner) {
        assert.equal(command.kind, 'wait', 'cancelled owner executed another command')
        return frames.wait(command.ms, owner)
      },
    },
    departing.signal,
  )
  const auto = compileBaseScriptFlow(
    {
      kind: 'stages',
      initial: 'initial',
      stages: [{ id: 'initial', body: [{ kind: 'wait', ms: 100 }, { kind: 'clearDialog' }] }],
    },
    { timing: 'auto', canonicalContentDigest: 'c'.repeat(64) },
  )
  const departure = third
    .runFlow(auto, {
      self: { scene: 's001', entity: 'owner' },
      cursorController: { reachSafePoint: () => 'continue' },
    })
    .finally(finishDeparture)
  const rejected = assert.rejects(departure, { name: 'AbortError' })
  const departureAt = frames.now
  await frames.tick(departureAt + 1, ports)
  ports.advanceMoves = () => {
    if (frames.now >= departureAt + 100) {
      departing.abort()
      testScene = 's000'
      host.__e2eSceneBoundary({ scene: testScene })
    }
  }
  await frames.tick(departureAt + 100, ports)
  await rejected
  const exitTrace = host.__readOpeningMatrix()
  const exitWait = exitTrace.causes.findLast((e) => e.phase === 'wait-start')
  const exitReceipt = verifyOpeningWaitReceipt(exitWait, exitTrace.causes, exitTrace.worldRenders)
  assert.equal(exitReceipt.resumed.phase, 'run-ended')
  for (const corrupt of [
    (events) => {
      events.find((e) => e.order === exitReceipt.resumed.order).aborted = false
    },
    (events) => {
      events.find((e) => e.order === exitReceipt.resumed.order).clock.frameId++
    },
  ]) {
    const events = structuredClone(exitTrace.causes)
    corrupt(events)
    assert.throws(() => verifyOpeningWaitReceipt(exitWait, events, exitTrace.worldRenders))
  }
  const wrongScene = structuredClone(exitTrace.worldRenders)
  Object.assign(
    wrongScene.find((e) => e.order === exitReceipt.after.order),
    { scene: exitWait.scene, sceneVisit: exitWait.sceneVisit },
  )
  assert.throws(
    () => verifyOpeningWaitReceipt(exitWait, exitTrace.causes, wrongScene),
    /same-scene draw/,
  )
})
