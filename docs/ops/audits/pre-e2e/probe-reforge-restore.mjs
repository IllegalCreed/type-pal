// Baseline 84434b8a. Executes original main.ts function bodies via AST extraction.
// Only scene/asset I/O, canvas and auto start/stop boundaries are stubs; not full bootstrap.
// node --import tsx docs/ops/audits/pre-e2e/probe-reforge-restore.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as content from '../../../../packages/content/src/index.ts'
import { clearRestoredWorldActorConditions } from '../../../../packages/reforge/src/actor-condition-lifecycle.ts'
import {
  AsyncIntentController,
  asyncIntentAbortError,
} from '../../../../packages/reforge/src/async-intent.ts'
import { collectSceneSoundAssets } from '../../../../packages/reforge/src/audio/sfx-readiness.ts'
import { expectDefined } from '../../../../packages/reforge/src/defined.ts'
import { seedFormationTrail } from '../../../../packages/reforge/src/follower.ts'
import { Canvas2DRenderer } from '../../../../packages/reforge/src/render.ts'
import {
  projectedWorldScriptScratch,
  refreshSceneViewBindings,
} from '../../../../packages/reforge/src/runtime-project-view.ts'
import {
  normalizeCurrentSave,
  preflightCurrentSave,
} from '../../../../packages/reforge/src/save/current-codec.ts'
import {
  buildCurrentSavePayload,
  resolveRestoredMusic,
} from '../../../../packages/reforge/src/save/ops.ts'
import { MemorySaveStore } from '../../../../packages/reforge/src/save/store.ts'
import {
  assertSceneSwitchDependenciesCurrent,
  captureSceneSwitchDependencies,
} from '../../../../packages/reforge/src/scene-switch-transaction.ts'
import { resolveSceneSpawn } from '../../../../packages/reforge/src/scene-transition.ts'

assert.equal(typeof globalThis.indexedDB, 'undefined', 'Refuse a real/preexisting IndexedDB')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Audit forbids network')
}
const source = readFileSync(
  new URL('../../../../packages/reforge/src/main.ts', import.meta.url),
  'utf8',
)
const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const names = new Set([
  'isAbortError',
  'assertRunnerActive',
  'awaitRunner',
  'replaceCanonicalScript',
  'syncRuntimeScriptScratch',
  'replaceWorld',
  'requireSpriteDef',
  'prepareSceneSounds',
  'runnableStages',
  'sceneScriptBinding',
  'bindingSceneEntry',
  'prepareSceneSwitch',
  'assertSceneSwitchPlanCurrent',
  'commitSceneSwitch',
  'switchScene',
  'abortScript',
  'currentWorldSnapshot',
  'captureCurrentSavePayload',
  'payloadBelongsToProject',
  'normalizeStoredPayload',
  'restorePayload',
  'doLoad',
  'quickLoad',
  'syncAmbience',
  'refreshCurrentCanonicalBindings',
  'applyWorldEntityGatesToScene',
  'applyWorldEntityPositionToScene',
  'applyWorldToScene',
])
const found = new Map()
function walk(node) {
  if (
    (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
    node.name &&
    ts.isIdentifier(node.name) &&
    names.has(node.name.text)
  ) {
    assert(!found.has(node.name.text), `ambiguous original function ${node.name.text}`)
    found.set(
      node.name.text,
      ts.isFunctionDeclaration(node) ? node.getText(ast) : `const ${node.getText(ast)};`,
    )
  }
  ts.forEachChild(node, walk)
}
walk(ast)
for (const name of names) assert(found.has(name), name)
const body = ts.transpileModule([...found.values()].join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText
const factory = new Function(
  'env',
  `with(env) { ${body}; return {doLoad, quickLoad, restorePayload, replaceWorld, captureCurrentSavePayload, switchScene}; }`,
)
const actor = {
  id: 'hero',
  name: 'name.hero',
  spriteId: 'sprite.hero',
  battler: {
    baseStats: {
      level: 1,
      hp: 10,
      maxHP: 10,
      mp: 5,
      maxMP: 5,
      attack: 1,
      defense: 1,
      magicAttack: 1,
      speed: 1,
      luck: 1,
    },
    initialEquipment: {},
    initialMagic: [],
    battleSprite: 'battle.hero',
  },
}
const makeWorld = () =>
  content.buildWorld({ party: ['hero'], money: 100, inventory: [] }, { hero: actor })
const makePayload = () => ({
  version: 8,
  contentVersion: 20,
  projectId: 'audit',
  world: makeWorld(),
  position: { sceneId: 'saved-scene', pos: { col: 2, row: 3, height: 0 }, facing: 'down' },
})
const sceneDef = (id) => ({
  id,
  mapId: `map.${id}`,
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
})
function harness(raw) {
  const events = [],
    toasts = [],
    warnings = [],
    oldAbort = new AbortController()
  const world = makeWorld()
  world.script.flags.live = true
  const canonicalScript = world.script
  const project = {
    manifest: { id: 'audit', name: 'audit', contentVersion: 20, minimumSaveVersion: 8 },
    actorsById: { hero: actor },
    spritesById: { 'sprite.hero': { id: 'sprite.hero', asset: 'sprite.asset' } },
    items: {},
    ambiences: [],
    assetResolver: {},
    sharedScripts: {},
  }
  const cache = new Map([
    ['saved-scene', sceneDef('saved-scene')],
    ['new-scene', sceneDef('new-scene')],
  ])
  const empty = () => {}
  const env = {
    ...content,
    normalizeCurrentSave,
    preflightCurrentSave,
    buildCurrentSavePayload,
    resolveRestoredMusic,
    AsyncIntentController,
    asyncIntentAbortError,
    captureSceneSwitchDependencies,
    assertSceneSwitchDependenciesCurrent,
    resolveSceneSpawn,
    clearRestoredWorldActorConditions,
    projectedWorldScriptScratch,
    refreshSceneViewBindings,
    seedFormationTrail,
    Canvas2DRenderer,
    collectSceneSoundAssets,
    expectDefined,
    project,
    inputProject: project,
    canonicalProject: project,
    world,
    canonicalScript,
    scene: sceneDef('live-scene'),
    runtimeScript: projectedWorldScriptScratch(canonicalScript, 'live-scene'),
    actorSpriteOverrides: new Map(),
    worldMutationIntent: new AsyncIntentController(),
    sceneSwitchIntent: new AsyncIntentController(),
    loadIntent: new AsyncIntentController(),
    battleLaunchIntent: new AsyncIntentController(),
    saveStore: { getPayload: async () => structuredClone(raw) },
    getLifecycleReferences: async () =>
      content.buildEntityLifecycleReferenceIndex([{ id: 'saved-scene', entities: [] }]),
    getSceneDef: async (id) => {
      events.push(`prepare:${id}`)
      if (!cache.has(id)) cache.set(id, sceneDef(id))
      return structuredClone(cache.get(id))
    },
    getCanonicalScene: async (id) => cache.get(id),
    canonicalSceneCache: cache,
    getMapAssets: async () => ({ map: { width: 10, height: 10 }, tilesets: new Map() }),
    getStandardPalette: async () => ({ colors: [] }),
    spriteCache: {
      load: async () => ({ frames: [] }),
      get: () => ({ frames: [] }),
      prune: () => events.push('prune'),
    },
    sfx: { prepare: async () => {} },
    bgm: { stop: () => events.push('bgm-stop'), play: () => events.push('bgm-play') },
    ctx: {},
    console: { warn: (...x) => warnings.push(x.map(String).join(' ')) },
    showToast: (text) => toasts.push(text),
    entityStaticBaseline: new Map(),
    entityActions: { replaceScene: empty },
    map: null,
    tiles: null,
    palette: null,
    renderer: null,
    waveRenderer: null,
    entitySpriteDefs: new Map(),
    room: null,
    viewMinX: 0,
    viewMinY: 0,
    viewMaxX: 0,
    viewMaxY: 0,
    TILE_W: 32,
    TILE_H: 16,
    player: { pos: { col: 0, row: 0, height: 0 } },
    facing: 'down',
    partyLayer: 0,
    walking: false,
    stepFrame: 0,
    trail: [],
    followerFrozen: [],
    followerPos: [],
    followerAuth: new Map(),
    worldMoveAcc: 0,
    updateCamera: () => events.push('camera'),
    resetFrameAnimationPresentation: empty,
    ambienceShown: null,
    ambienceFx: null,
    invalidatePendingScriptMutations: () => events.push('invalidate-script'),
    activeBattle: null,
    scriptAbort: oldAbort,
    itemUseAbort: null,
    runner: { running: true },
    runnerTriggerOwnerId: null,
    inlineTriggerOwners: new Map(),
    pendingOnEnter: null,
    pendingTouchTrigger: { clear: empty },
    preserveClosedDialogFrame: false,
    scriptConfirmModal: { cancelAll: empty },
    resumeScriptExecutionGates: empty,
    presentation: { cancelAll: empty },
    dismountParty: empty,
    releaseAllAuthority: empty,
    timers: [],
    screenHold: { cancel: empty },
    ditherTransition: { cancel: empty },
    sceneEntrySession: { cancel: empty },
    entityFrameOverride: new Map(),
    partyGesture: null,
    partyMove: null,
    stopAutoRunners: () => events.push('stop-auto'),
    startAutoRunners: () => events.push('start-auto'),
  }
  return { env, api: factory(env), oldAbort, events, toasts, warnings }
}
try {
  for (const [field, mutate] of [
    ['valid', () => {}],
    [
      'party=null',
      (p) => {
        p.world.party = null
      },
    ],
    [
      'position=null',
      (p) => {
        p.position = null
      },
    ],
    [
      'money=not-money',
      (p) => {
        p.world.money = 'not-money'
      },
    ],
    [
      'facing=invalid',
      (p) => {
        p.position.facing = 'sideways'
      },
    ],
  ]) {
    const raw = makePayload()
    raw.world.script.flags.saved = true
    mutate(raw)
    const h = harness(raw)
    let result, error
    try {
      result = await h.api.doLoad('quick')
    } catch (caught) {
      error = String(caught)
    }
    const row = {
      id: 'B-04',
      field,
      result,
      error,
      oldScriptAborted: h.oldAbort.signal.aborted,
      worldReplaced: h.env.world.script.flags.saved === true,
      scene: h.env.scene.id,
      money: h.env.world.money,
      facing: h.env.facing,
      events: h.events,
      toasts: h.toasts,
    }
    if (field === 'money=not-money' && result) {
      const bought = content.shopBuy(h.env.world, 'herb', {
        herb: { id: 'herb', name: 'herb', desc: [], buyPrice: 10, sellPrice: 5, sellable: true },
      })
      h.api.replaceWorld(bought)
      const store = new MemorySaveStore()
      await store.putSlot(
        { slotId: 'quick', kind: 'quick', party: [], mapName: 'audit', savedAt: 0 },
        h.api.captureCurrentSavePayload(),
        new Blob(),
      )
      row.purchase = {
        moneyIsNaN: Number.isNaN(bought.money),
        inventory: bought.inventory,
        persistedMoneyIsNaN: Number.isNaN((await store.getPayload('quick')).world.money),
      }
    }
    if (field === 'valid') assert.equal(result, true)
    if (field === 'party=null') {
      assert.match(error, /reading '0'/)
      assert.equal(row.oldScriptAborted, false)
      assert.equal(row.worldReplaced, false)
    }
    if (field === 'position=null') {
      assert.equal(result, false)
      assert.equal(row.worldReplaced, false)
    }
    if (field === 'money=not-money') {
      assert.equal(result, true)
      assert.equal(row.purchase.persistedMoneyIsNaN, true)
    }
    if (field === 'facing=invalid') {
      assert.match(error, /dcol/)
      assert.equal(row.worldReplaced, true)
      assert.equal(row.oldScriptAborted, true)
    }
    console.log(JSON.stringify(row))
  }
  {
    const h = harness(makePayload())
    let onUnhandled, timer
    const unhandled = new Promise((resolve, reject) => {
      onUnhandled = (error) => resolve(String(error))
      process.once('unhandledRejection', onUnhandled)
      timer = setTimeout(() => reject(new Error('Expected unhandled rejection not observed')), 500)
    })
    h.env.saveStore.getPayload = async () => {
      const p = makePayload()
      p.world.party = null
      return p
    }
    try {
      void h.api.quickLoad() // Matches the actual F9 callsite, not a new exception-catching wrapper.
      console.log(
        JSON.stringify({
          id: 'B-04-feedback',
          unhandledRejection: await unhandled,
          oldScriptAborted: h.oldAbort.signal.aborted,
          toasts: h.toasts,
        }),
      )
    } finally {
      clearTimeout(timer)
      process.removeListener('unhandledRejection', onUnhandled)
    }
  }
  const deferred = () => {
    let resolve
    const promise = new Promise((r) => {
      resolve = r
    })
    return { promise, resolve }
  }
  {
    const h = harness(makePayload()),
      entered = deferred(),
      gate = deferred()
    h.env.saveStore.getPayload = async (slot) => {
      const p = makePayload()
      p.position.sceneId = slot === 'old' ? 'old-save' : 'new-save'
      p.world.money = slot === 'old' ? 111 : 222
      return p
    }
    h.env.getMapAssets = async (id) => {
      if (id === 'map.old-save') {
        entered.resolve()
        await gate.promise
      }
      return { map: { width: 10, height: 10 }, tilesets: new Map() }
    }
    const old = h.api.doLoad('old')
    await entered.promise
    const newer = await h.api.doLoad('new')
    gate.resolve()
    const older = await old
    assert.equal(older, false)
    assert.equal(newer, true)
    assert.equal(h.env.world.money, 222)
    console.log(
      JSON.stringify({
        control: 'newer load supersedes old',
        oldResult: older,
        newResult: newer,
        money: h.env.world.money,
        scene: h.env.scene.id,
      }),
    )
  }
  {
    const h = harness(makePayload()),
      entered = deferred(),
      gate = deferred(),
      controller = new AbortController()
    h.env.getMapAssets = async () => {
      entered.resolve()
      await gate.promise
      return { map: { width: 10, height: 10 }, tilesets: new Map() }
    }
    const loading = h.api.doLoad('quick', controller.signal).then(
      (value) => ({ value }),
      (error) => ({ name: error.name }),
    )
    await entered.promise
    controller.abort()
    gate.resolve()
    const result = await loading
    assert.equal(result.name, 'AbortError')
    assert.equal(h.env.world.script.flags.live, true)
    assert.equal(h.oldAbort.signal.aborted, false)
    console.log(
      JSON.stringify({
        control: 'caller abort during prepare',
        result,
        oldScriptAborted: false,
        liveWorldPreserved: true,
        scene: h.env.scene.id,
      }),
    )
  }
} finally {
  globalThis.fetch = oldFetch
}
