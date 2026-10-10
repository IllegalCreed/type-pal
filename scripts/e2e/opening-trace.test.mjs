import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'
import { parseSpriteChunk } from '../../packages/shared/src/rle.ts'
import { instrumentErrandTrace } from './errand-trace-plugin.mjs'
import { instrumentInnTrace } from './inn-trace-plugin.mjs'
import { instrumentKitchenTrace } from './kitchen-trace-plugin.mjs'
import { instrumentMealTrace } from './meal-trace-plugin.mjs'
import { installOpeningTrace } from './opening-trace.mjs'
import { instrumentOpeningTrace, TRACE_TARGETS } from './opening-trace-plugin.mjs'

const source = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
const gameFile = TRACE_TARGETS[0]
function actualFunction(code, name) {
  const ast = ts.createSourceFile('real.ts', code, ts.ScriptTarget.Latest, true)
  const matches = []
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(matches.length, 1, `real function ${name}`)
  return ts.transpile(
    matches[0]
      .getText(ast)
      .replace(/^export /, '')
      .replaceAll('import.meta', 'testImportMeta'),
    {
      target: ts.ScriptTarget.ES2022,
    },
  )
}
function withTrace(run) {
  // Execute the same serializable initializer as Playwright, on a fresh object per test.
  const host = {}
  new Function('globalThis', `(${installOpeningTrace.toString()})()`)(host)
  return run(host)
}

test('native boat steering leaves the primary down picture intact; real opposite frame changes drawn pixels', () => {
  const primary = JSON.parse(source('data/extracted/events/all.json')).segments[0].commands
  const eventSource = source('packages/game/src/core/event-system.ts')
  const presentFile = 'packages/game/src/present/present.ts'
  const rendered = []
  const frames = parseSpriteChunk(
    gunzipSync(readFileSync(new URL('../../data/extracted/data/sprite/2.rle', import.meta.url))),
  ).map((frame) => ({
    ...frame,
    indices: frame.pixels,
    anchorX: Math.floor(frame.width / 2),
    anchorY: frame.height,
  }))
  const scope = {
    ...Object.fromEntries(
      [...eventSource.matchAll(/export const (OP_\w+) = (0x[\da-f]+|\d+)/gu)].map((match) => [
        match[1],
        Number(match[2]),
      ]),
    ),
    SDLPAL_DIR_TO_FACING: { 0: 'down', 1: 'left', 2: 'up', 3: 'right' },
    FACING_TO_DIRECTION: { down: 0, left: 1, up: 2, right: 3 },
    applyPlayerOpcode: () => false,
    runPlayerPoisonEntrySync() {},
    SCREEN_W: 320,
    SCREEN_H: 200,
    getSeamCoverage: () => new Uint8Array(320 * 200),
    drawTilemap() {},
    repairTilemapSeams() {},
    addCoverTileEntries() {},
    drawDialogOverlay() {},
    getPartyWalkFrames: () => 3,
    getOverworldSpriteNum: () => 2,
    computeFollowerRenderItems: () => [],
    globalThis: {
      __openingMatrixGame: (_gs, point, evidence) => {
        if (point === 'render:world') rendered.push(evidence)
      },
    },
  }
  const native = new Function(
    'scope',
    `with(scope) {
    ${actualFunction(eventSource, 'applyRawOpcode')};
    ${actualFunction(eventSource, 'partyRideEventObject')};
    ${actualFunction(source('packages/game/src/present/draw-sprite.ts'), 'drawSprite')};
    ${actualFunction(source('packages/game/src/present/framebuffer.ts'), 'createFramebuffer')};
    ${actualFunction(source(presentFile), 'pixelToScreen')};
    ${actualFunction(instrumentOpeningTrace(source(presentFile), presentFile).code, 'presentFrame')};
    return { applyRawOpcode, partyRideEventObject, presentFrame, createFramebuffer };
  }`,
  )(scope)
  const gs = {
    frameNum: 1,
    wNumScene: 6,
    npcs: [],
    party: { x: 1216, y: 1376, facing: 'up' },
    camera: { x: 1056, y: 1264 },
    partyMembers: [0],
    partyScriptedFrame: [],
    walkingFrame: { walking: true, stepFrame: 0 },
    trail: [],
    followers: [],
    wLayer: 0,
    wScreenWave: 0,
    sWaveProgression: 0,
    menuStack: [],
    shakeTime: 0,
  }
  const setter = primary[1513]
  assert.deepEqual(setter.operands, [0, 0, 0])
  native.applyRawOpcode(gs, setter.opcode, setter.operands)
  const ride = primary[1516]
  native.partyRideEventObject(gs, { x: 1184, y: 1424 }, ...ride.operands, 2)
  assert.equal(gs.party.facing, 'up')
  assert.equal(gs.partyScriptedFrame[0], 0)
  const fb = native.createFramebuffer()
  const ctx = {
    partyFrames: frames,
    npcSprites: new Map(),
    npcSpriteFrames: new Map([[2, frames]]),
  }
  native.presentFrame(fb, gs, ctx)
  assert.equal(rendered[0].actors.party.frame, 0)
  const correctPixels = new Uint8Array(fb.indices)
  gs.partyScriptedFrame[0] = 6 // Legal resource, unchanged steering, position and draw count.
  native.presentFrame(fb, gs, ctx)
  assert.equal(rendered[1].actors.party.frame, 6)
  assert.equal(rendered[1].actors.party.facing, rendered[0].actors.party.facing)
  assert.notDeepEqual(fb.indices, correctPixels)
})
const snapshot = (position = [0, 0]) => ({
  engine: 'game',
  instance: 'room',
  npc: 10,
  position,
  facing: 'up',
  visible: true,
  dialogue: null,
  control: false,
})

test('real world projection records readiness after both successful exits, never after failure', () => {
  const file = 'packages/reforge/src/main.ts'
  const code = actualFunction(instrumentOpeningTrace(source(file), file).code, 'applyWorldToScene')
  const order = []
  // This is an instrumentation boundary test, not a mock oracle for projection semantics.
  // Execute the complete production function; collaborators expose its call order and errors.
  const scope = {
    __openingPoint: (point) => order.push(point),
    applyWorldEntityGatesToScene: () => order.push('gates'),
    activeScene: { scene: { id: 's001', entities: [] } },
    worldPresentation: { clearEntityFrames: () => order.push('frames') },
    restoredWaits: { clear: () => order.push('waits') },
    sceneRuntimeStates: {},
  }
  const project = new Function('scope', `with(scope) { ${code}; return applyWorldToScene; }`)(scope)
  const expected = ['before:scene-projection', 'gates', 'frames', 'waits', 'commit:scene-ready']
  project()
  assert.deepEqual(order, expected, 'no saved scene uses a successful early return')
  order.length = 0
  scope.sceneRuntimeStates.s001 = { entities: {}, automatic: {} }
  project()
  assert.deepEqual(order, expected, 'restored scene uses the normal successful tail')
  order.length = 0
  const failure = new Error('projection failed')
  scope.worldPresentation.clearEntityFrames = () => {
    throw failure
  }
  assert.throws(project, (error) => error === failure)
  assert.deepEqual(order, ['before:scene-projection', 'gates', 'failed:scene-projection'])
})

test('real Game scene loader emits readiness only after awaited resources and restored actor binding', async () => {
  const file = 'packages/game/src/shell/bootstrap.ts'
  for (const [instrument, hook] of [
    [instrumentOpeningTrace, '__openingMatrixGame'],
    [instrumentInnTrace, '__innGame'],
    [instrumentKitchenTrace, '__kitchenGame'],
    [instrumentMealTrace, '__mealGame'],
    [instrumentErrandTrace, '__errandGame'],
  ]) {
    const code = actualFunction(instrument(source(file), file).code, 'loadSceneCommon')
    const boundActors = [{ id: 19, sState: 2 }],
      points = []
    let release, entered
    const pending = new Promise((resolve) => {
      release = resolve
    })
    const resourcesEntered = new Promise((resolve) => {
      entered = resolve
    })
    const scope = {
      gs: { wNumScene: 4, npcs: [], sceneOnEnterOverride: {} },
      sceneAssetsCache: {
        loadScene: async () => ({
          mapNum: 12,
          eventCommands: [],
          labelMap: {},
          eventObjects: [],
          palette: {},
        }),
      },
      setCurrentMapNum() {},
      sliceSceneEventObjects: () => boundActors,
      hydrateNpcStaticDefaults() {},
      applySceneAssetsToPresent() {},
      preloadCutsceneSprites: async () => {},
      ensurePlayerSpritesLoaded: () => {
        entered()
        return pending
      },
      globalThis: {
        [hook]: (gs, source) => points.push({ source, scene: gs.wNumScene, actors: gs.npcs }),
      },
    }
    const load = new Function('scope', `with(scope) { ${code}; return loadSceneCommon; }`)(scope)
    const loading = load(2, { fromSavedGame: true })
    await resourcesEntered
    assert.deepEqual(
      points.map((point) => point.source),
      ['commit:scene-materialized'],
    )
    assert.equal(points[0].actors, boundActors, 'materialized scene must own the new NPC slice')
    release()
    await loading
    assert.deepEqual(
      points.map((point) => point.source),
      ['commit:scene-materialized', 'commit:scene-ready'],
    )
    assert.equal(points[1].scene, 2)
    assert.equal(points[1].actors, boundActors)
    points.length = 0
    const failure = new Error('sprite resources failed')
    scope.ensurePlayerSpritesLoaded = async () => {
      throw failure
    }
    await assert.rejects(load(2, { fromSavedGame: true }), (error) => error === failure)
    assert.deepEqual(
      points.map((point) => point.source),
      ['commit:scene-materialized'],
    )
  }
})

test('all real source modules match exact trace anchors, source drift fails closed', () => {
  for (const file of TRACE_TARGETS) {
    const code = source(file)
    const result = instrumentOpeningTrace(code, file)
    assert(result.code.length > code.length)
  }
  assert.throws(
    () =>
      instrumentOpeningTrace(
        source(gameFile).replace('function npcWalkTo(', 'function renamedWalk('),
        gameFile,
      ),
    /NPC write census changed/,
  )
  assert.throws(() => instrumentOpeningTrace('', 'unknown.ts'), /unexpected trace source/)
})

test('real render early returns and failed draws never claim a freshly rendered world', () => {
  const file = 'packages/reforge/src/main.ts'
  const code = instrumentOpeningTrace(source(file), file).code
  const points = []
  const completed = []
  const emptyPages = []
  let continueAfterWorld = false
  const stop = new Error('stop after world pass')
  const scope = {
    globalThis: { __openingMatrixRendered: (page) => emptyPages.push(page) },
    __openingPoint: (point, evidence) => {
      points.push(point)
      if (evidence) completed.push(evidence)
    },
    scriptConfirmModal: { view: null },
    preserveClosedDialogFrame: true,
    sceneEntrySession: { heldFrame: null },
    ctx: { putImageData() {}, save() {}, scale() {}, restore() {} },
    drawFadeCurtain() {},
    syncDitherDebugDataset() {},
    updateCamera() {},
    deriveFollowers() {},
    worldPresentation: { sprites: () => [], renderWorld() {} },
    activeScene: { scene: { entities: [] } },
    runtimeScript: {},
    world: { party: [] },
    partyVisual() {},
    player: {},
    facing: 'down',
    walking: false,
    stepFrame: 0,
    partyLayer: 0,
    followerPos: [],
    camera: {},
    frames: {},
    WORLD_SCALE: 4,
    shop: null,
    drawCinematicLayer: () => false,
    dialogBox: {
      active: false,
      get visible() {
        return this.active
      },
      render() {
        this.active = false
      },
    },
    motion: { worldTicksThisFrame: 0, worldTick: 31 },
    get debugLayers() {
      if (continueAfterWorld) return {}
      throw stop
    },
    get menus() {
      throw stop
    },
  }
  const renderSource = actualFunction(code, 'render')
  const render = new Function('scope', `with(scope) { ${renderSource}; return render; }`)(scope)
  render()
  assert.deepEqual(points, ['before:render'])
  points.length = 0
  scope.preserveClosedDialogFrame = false
  scope.sceneEntrySession.heldFrame = {}
  render()
  assert.deepEqual(points, ['before:render'])
  points.length = 0
  scope.sceneEntrySession.heldFrame = null
  scope.worldPresentation.renderWorld = () => {
    throw stop
  }
  assert.throws(render, (error) => error === stop)
  assert.deepEqual(points, ['before:render'])
  points.length = 0
  scope.worldPresentation.renderWorld = () => {}
  assert.throws(render, (error) => error === stop)
  assert.deepEqual(points, ['before:render', 'render:world'])
  assert.equal(completed.length, 1)
  assert.equal(completed[0].tick, 31)
  assert(Number.isFinite(completed[0].atMs))
  assert.deepEqual(emptyPages, [], 'early returns and failed world paths cannot clear dialogue')
  continueAfterWorld = true
  assert.throws(render, (error) => error === stop)
  assert.deepEqual(emptyPages, [null], 'successful world pass with inactive dialogue clears it')
  emptyPages.length = 0
  scope.dialogBox.active = true
  assert.throws(render, (error) => error === stop)
  assert.equal(scope.dialogBox.active, false)
  assert.deepEqual(emptyPages, [], 'auto-advance closure retains the page already drawn this frame')
  assert.throws(render, (error) => error === stop)
  assert.deepEqual(emptyPages, [null], 'only the following successful world pass clears that page')

  const game = 'packages/game/src/present/present.ts'
  const gamePoints = []
  const present = new Function(
    'globalThis',
    `${actualFunction(instrumentOpeningTrace(source(game), game).code, 'presentFrame')}; return presentFrame;`,
  )({
    __openingMatrixGame: (_state, point) => gamePoints.push(point),
  })
  present({}, { suspendRaf: true }, {})
  assert.deepEqual(gamePoints, [])
})

test('opening matrix observes bootstrap placement before the story runner is initialized', () => {
  const file = 'packages/reforge/src/main.ts',
    hook = actualFunction(instrumentOpeningTrace(source(file), file).code, '__openingPoint'),
    errors = [],
    points = [],
    worlds = []
  const host = {
    __openingMatrixPoint: (_source, state) => points.push(state),
    __openingTraceError: (error) => errors.push(error),
    __openingCauseWorld: (world) => worlds.push(structuredClone(world)),
  }
  new Function(
    'globalThis',
    `
    const activeScene = {scene:{id:'s000'}}, player = {pos:{col:0,row:0,height:0}},
      facing = 'down', world = {party:[]}, worldPresentation = {partyGesture:null};
    ${hook}
    __openingPoint('commit:player.pos');
    __openingPoint('observe:causal');
    world.party.push('changed-after-snapshot');
    let runner = null;
  `,
  )(host)
  assert.deepEqual(errors, [])
  assert.equal(points.length, 2)
  assert.equal(points[0].control, false)
  assert.deepEqual(worlds, [{ party: [] }])
})

test('real npcWalkTo outward/return commits in one sample window cannot disappear; return and state equal uninstrumented implementation', () =>
  withTrace((host) => {
    const raw = source(gameFile)
    const transformed = instrumentOpeningTrace(raw, gameFile).code
    const compile = (code, targetHost) =>
      new Function(
        'globalThis',
        `${actualFunction(code, 'walkFrameMod')}\n${actualFunction(code, 'npcWalkTo')}\nreturn npcWalkTo;`,
      )(targetHost)
    const watched = { id: 10, x: 0, y: 0, facing: 'up', nSpriteFrames: 4, sState: 2 }
    const plain = structuredClone(watched)
    const gs = {
      wNumScene: 2,
      allEventObjects: [watched],
      frameNum: 1,
      mode: 'script',
      dialogBox: null,
    }
    host.__tpgs = gs
    const real = compile(raw, {}),
      observed = compile(transformed, host)
    for (const args of [
      [1, 1, 0, 32],
      [0, 0, 0, 32],
      [10, 10, 0, 2],
    ]) {
      assert.equal(observed(watched, ...args), real(plain, ...args))
      assert.deepEqual(watched, plain)
    }
    const trace = host.__readOpeningTrace()
    assert.deepEqual(trace.errors, [])
    assert.deepEqual(
      trace.events.filter((e) => e.kind === 'move').map((e) => [e.from, e.position]),
      [
        [
          [0, 0],
          [32, 16],
        ],
        [
          [32, 16],
          [0, 0],
        ],
        [
          [0, 0],
          [4, 2],
        ],
      ],
    )
    watched.x = 999
    assert.equal(trace.events.at(-1).position[0], 4, 'events must not retain engine aliases')
  }))

test('noncommitted plans produce no move; changed position first seen at render is evidence loss', () =>
  withTrace((host) => {
    const s = snapshot()
    host.__openingTracePoint('before:plan', s)
    host.__openingTracePoint('render:world', s)
    assert.equal(host.__readOpeningTrace().events.length, 1)
    host.__openingTracePoint('render:world', snapshot([1, 0]))
    assert.match(host.__readOpeningTrace().errors[0], /unobserved movement/)
  }))

test('dialogue context is captured at commit and own DTOs survive caller mutation', () =>
  withTrace((host) => {
    const s = snapshot()
    host.__openingTracePoint('before:move', s)
    s.dialogue = { phase: 'waiting-input', text: '还不快过来帮忙' }
    host.__openingTracePoint('render:dialogue', s)
    s.position = [1, 1]
    host.__openingTracePoint('commit:move', s)
    s.dialogue.text = 'changed'
    const trace = host.__readOpeningTrace()
    assert.equal(trace.events.at(-1).dialogue.text, '还不快过来帮忙')
    trace.events.length = 0
    assert.equal(host.__readOpeningTrace().events.length, 3)
  }))

test('bounded collector flags overflow and malformed points without throwing into gameplay', () =>
  withTrace((host) => {
    assert.doesNotThrow(() => host.__openingTracePoint('commit:bad', snapshot([NaN, 1])))
    assert.equal(host.__readOpeningTrace().errors.length, 1)
    for (let i = 0; i < 1602; i++) host.__openingTracePoint('commit:move', snapshot([i, 0]))
    assert.equal(host.__readOpeningTrace().events.length, 1600)
    assert.equal(host.__readOpeningTrace().overflow, true)
  }))

test('instrumented real function preserves original thrown error identity', () => {
  const code = instrumentOpeningTrace(source(gameFile), gameFile).code
  const error = new Error('original operand read')
  const npc = {
    get x() {
      throw error
    },
  }
  const host = { __openingTraceGame() {} }
  const call = new Function(
    'globalThis',
    `${actualFunction(code, 'npcWalkTo')}\nreturn npcWalkTo;`,
  )(host)
  assert.throws(
    () => call(npc, 1, 1, 0, 2),
    (e) => e === error,
  )
})

test('removing real npcWalkTo commit hook is detected by next boundary, not accepted as stationary', () =>
  withTrace((host) => {
    const code = instrumentOpeningTrace(source(gameFile), gameFile).code
    const needle = 'globalThis.__openingTraceGame?.(globalThis.__tpgs, "commit:npcWalkTo");'
    assert.equal(code.split(needle).length, 2)
    const missed = code.replace(needle, '')
    const fn = new Function(
      'globalThis',
      `${actualFunction(missed, 'npcWalkTo')}\nreturn npcWalkTo;`,
    )(host)
    const npc = { id: 10, x: 0, y: 0, facing: 'up', sState: 2 }
    host.__tpgs = { wNumScene: 2, allEventObjects: [npc], dialogBox: null }
    fn(npc, 1, 1, 0, 32)
    fn(npc, 0, 0, 0, 32)
    assert.match(host.__readOpeningTrace().errors[0], /unobserved movement at before:npcWalkTo/)
  }))

test('real Game world pass records every selected resource once after all entries; a later failed draw publishes nothing', () => {
  const file = 'packages/game/src/present/present.ts'
  const raw = source(file),
    code = instrumentOpeningTrace(raw, file).code
  const rendered = [],
    draws = []
  const fallback = { width: 8, height: 8, anchorX: 4, anchorY: 8, label: 'fallback-zero' }
  const second = { width: 8, height: 8, anchorX: 4, anchorY: 8, label: 'second-actor' }
  const originalError = new Error('actual draw failed')
  const scope = {
    globalThis: {
      __openingMatrixGame: (_gs, point, evidence) => {
        if (point === 'render:world') rendered.push(evidence)
      },
    },
    FACING_TO_DIRECTION: { down: 0, left: 1, up: 2, right: 3 },
    SCREEN_W: 320,
    SCREEN_H: 200,
    getSeamCoverage: () => new Uint8Array(1),
    drawTilemap() {},
    repairTilemapSeams() {},
    getPartyWalkFrames: () => 3,
    partyFrameIndex: () => 0,
    getOverworldSpriteNum: () => undefined,
    computeFollowerRenderItems: () => [],
    addCoverTileEntries() {},
    drawDialogOverlay() {},
    drawSprite: (_fb, sprite) => {
      draws.push(sprite)
      if (scope.throwDraw && sprite === second) throw originalError
    },
    throwDraw: false,
  }
  const compile = (text) =>
    new Function(
      'scope',
      `with(scope) { ${actualFunction(raw, 'pixelToScreen')}; ${actualFunction(text, 'presentFrame')}; return presentFrame; }`,
    )(scope)
  const npc = {
    id: 56,
    x: 40,
    y: 40,
    sState: 2,
    facing: 'right',
    spriteNum: 55,
    nSpriteFrames: 3,
    scriptedFrame: 1,
  }
  const gs = {
    frameNum: 17,
    wNumScene: 4,
    npcs: [npc, { ...npc, id: 57, spriteNum: 56, x: 44, y: 42 }],
    party: { x: 10, y: 10, facing: 'down' },
    camera: { x: 0, y: 0 },
    partyMembers: [0],
    partyScriptedFrame: [],
    walkingFrame: { walking: false, stepFrame: 0 },
    trail: [],
    followers: [],
    wLayer: 0,
    wScreenWave: 0,
    sWaveProgression: 0,
    menuStack: [],
    shakeTime: 0,
  }
  const ctx = {
    partyFrames: [],
    npcSprites: new Map(),
    npcSpriteFrames: new Map([
      [55, [fallback]],
      [56, [second]],
    ]),
  }
  const fb = { width: 320, height: 200, clear() {} }
  compile(raw)(fb, structuredClone(gs), ctx)
  assert.deepEqual(draws, [fallback, second])
  draws.length = 0
  const present = compile(code)
  present(fb, gs, ctx)
  assert.deepEqual(draws, [fallback, second], 'instrumentation does not replace selected resource')
  assert.equal(rendered.length, 1)
  assert(rendered[0], 'successful real draw must provide renderer evidence')
  assert.equal(rendered[0].tick, 17)
  assert.equal(rendered[0].actors.e56.frame, 0)
  assert.equal(rendered[0].actors.e56.fallback, true)
  assert.equal(rendered[0].actors.e56.drawStatus, 'drawn')
  assert.equal(rendered[0].actors.e56.drawOrder, 0)
  assert.deepEqual(rendered[0].actors.e56.position, [40, 40])
  assert.equal(rendered[0].actors.e57.drawOrder, 1)
  assert.deepEqual(rendered[0].actors.e57.position, [44, 42])
  assert.deepEqual(Object.keys(rendered[0].actors), ['e56', 'e57'])
  assert.deepEqual(rendered[0].actors.e56.geometry, { worldRect: [36, 39, 8, 8] })
  assert.deepEqual(rendered[0].view, {
    camera: { x: 0, y: 0 },
    canvasSize: [320, 200],
    transform: [1, 0, 0, 1, 0, 0],
    pixelRounding: 'unrounded',
  })
  const offscreen = structuredClone(gs)
  offscreen.camera = { x: 500, y: 500 }
  draws.length = 0
  present(fb, offscreen, ctx)
  assert.deepEqual(draws, [], 'real Game culling skips offscreen sprite callbacks')
  assert.deepEqual(rendered[1].actors, {})
  assert.deepEqual(rendered[1].candidates.e56.geometry, { worldRect: [36, 39, 8, 8] })
  assert.equal(rendered[1].candidates.e56.frame, 0, 'culled selection is not a drawn frame')
  assert.deepEqual(rendered[1].view.camera, offscreen.camera)
  draws.length = 0
  scope.throwDraw = true
  assert.throws(
    () => present(fb, gs, ctx),
    (error) => error === originalError,
  )
  assert.equal(rendered.length, 2)
  assert.deepEqual(draws, [fallback, second], 'failure occurred after the first successful entry')
})
