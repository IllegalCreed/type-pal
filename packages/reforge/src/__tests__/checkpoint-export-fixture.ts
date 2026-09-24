import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type Facing,
  type GridPos,
  type WorldState,
} from '@type-pal/content'
import ts from 'typescript'
import { expect, vi } from 'vitest'
import { clearRestoredWorldActorConditions } from '../actor-condition-lifecycle.js'
import { AsyncIntentController } from '../async-intent.js'
import { expectDefined } from '../defined.js'
import { seedFormationTrail } from '../follower.js'
import { projectedWorldScriptScratch } from '../runtime-project-view.js'
import { type ProjectScriptHostOptions, ScriptProjectRuntime } from '../runtime-script-project.js'
import { normalizeCurrentSave, preflightCurrentSave } from '../save/current-codec.js'
import {
  buildCurrentSavePayload,
  buildMeta,
  captureThumbnail,
  resolveRestoredMusic,
} from '../save/ops.js'
import { MemorySaveStore } from '../save/store.js'
import type { SaveMeta, StoredSavePayload } from '../save/types.js'
import {
  digest,
  hostOptions,
  mainApi,
  mainSource,
  sceneFixture,
  worldFixture,
} from './world-async-fixture.js'

interface Hooks {
  dumpSave(): Promise<StoredSavePayload>
  dumpMotionTrace(): unknown[]
  dumpMotionState(): unknown
  clearMotionTrace(): void
}
interface Api {
  quickSave(): Promise<void>
  doSave(slot: string, thumb: Blob | Promise<Blob>): Promise<void>
  normalizeStoredPayload(raw: StoredSavePayload, where: string): Promise<StoredSavePayload>
  restorePayload(raw: StoredSavePayload, token: number, where: string): Promise<boolean>
}

let registerDevFactory: ((env: object) => void) | undefined

/** Compile the actual immutable source once; execute it afresh against every fixture environment. */
function compileDevRegistration() {
  const ast = ts.createSourceFile('main.ts', mainSource, ts.ScriptTarget.Latest, true)
  const matches: ts.IfStatement[] = []
  const walk = (node: ts.Node) => {
    if (ts.isIfStatement(node) && node.thenStatement.getText(ast).includes('.__tpE2e ='))
      matches.push(node)
    ts.forEachChild(node, walk)
  }
  walk(ast)
  expect(matches).toHaveLength(1)
  const source = expectDefined(matches[0]).getText(ast)
  expect(source.match(/import\.meta\.env\.DEV/g)).toHaveLength(1)
  const js = ts.transpileModule(source.replace('import.meta.env.DEV', 'dev'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  const compiled = new Function('env', `with(env) { ${js} }`)
  return (env: object): void => compiled(env)
}

/** Execute the actual DEV statement, not a test reconstruction of its property bindings. */
function registerDev(env: object) {
  registerDevFactory ??= compileDevRegistration()
  registerDevFactory(env)
}

/** Real runtime/codec/store/main bodies; only browser and resource preparation boundaries are substituted. */
export function checkpointHarness(overrides: Partial<ProjectScriptHostOptions> = {}, dev = true) {
  const world = worldFixture(),
    definition = sceneFixture()
  const project = {
    manifest: { id: 'checkpoint', name: 'checkpoint', contentVersion: 20, minimumSaveVersion: 8 },
    locale: {},
  }
  const store = new MemorySaveStore({ kind: 'project', projectId: 'checkpoint' })
  const io = {
    put: vi.spyOn(store, 'putSlot'),
    list: vi.spyOn(store, 'listMeta'),
    payload: vi.spyOn(store, 'getPayload'),
    thumb: vi.spyOn(store, 'getThumb'),
  }
  const runtime = new ScriptProjectRuntime(
    { sharedScripts: {} },
    world,
    digest,
    hostOptions(definition, overrides),
  )
  const capture = vi.fn(buildCurrentSavePayload),
    effects = vi.fn()
  const env = {
    dev,
    window: {} as { __tpE2e?: Hooks },
    world,
    canonicalScript: expectDefined(world.script),
    runtimeScript: {},
    scene: definition,
    player: { pos: { col: 1.5, row: 2.5, height: 0 } },
    facing: 'down' as Facing,
    inputProject: project,
    project,
    scriptRuntime: runtime,
    saveSnapshotQueue: Promise.resolve(),
    saveWriteQueue: Promise.resolve(),
    saveMetasReady: Promise.resolve(),
    saveMetasInitialized: false,
    committedSavedTimes: 0,
    saveMetas: [] as SaveMeta[],
    saveThumbs: new Map(),
    saveStore: store,
    MAP_NAME: 'checkpoint',
    lookupText: (key: string) => key,
    buildMeta,
    buildCurrentSavePayload: capture,
    expectDefined,
    createImageBitmap: vi.fn(async () => ({ width: 64, height: 40 })),
    captureThumbnail: vi.fn(captureThumbnail),
    canvas: { width: 320, height: 200 } as HTMLCanvasElement,
    motionTrace: [{ step: 1 }],
    captureMotionState: () => ({ scene: 'target' }),
    preflightCurrentSave,
    normalizeCurrentSave,
    emptyWorldScriptState,
    projectedWorldScriptScratch,
    clearRestoredWorldActorConditions,
    resolveRestoredMusic,
    seedFormationTrail,
    loadIntent: new AsyncIntentController(),
    worldMutationIntent: new AsyncIntentController(),
    getLifecycleReferences: async () => buildEntityLifecycleReferenceIndex([definition]),
    // No substitute restore algorithm: real restore/replaceWorld/commit consume this resource plan.
    prepareSceneSwitch: vi.fn(
      async (id: string, _world: WorldState, spawn: { pos: GridPos; facing: Facing }) => ({
        def: sceneFixture(id),
        sceneId: id,
        spawn,
        neededSprites: new Set(),
        assets: { map: { width: 10, height: 10 }, tilesets: new Map() },
        palette: [],
        renderer: {},
        entityDefs: new Map(),
        pageActions: [],
      }),
    ),
    assertSceneSwitchPlanCurrent: effects,
    assertRunnerActive: (signal?: AbortSignal) => signal?.throwIfAborted(),
    abortScript: effects,
    stopAutoRunners: effects,
    refreshCurrentCanonicalBindings: effects,
    syncAmbience: effects,
    applyWorldToScene: effects,
    startAutoRunners: effects,
    showToast: effects,
    bgm: { play: effects, stop: effects },
    spriteCache: { prune: effects },
    resetFrameAnimationPresentation: effects,
    entityStaticBaseline: new Map(),
    entityActions: { replaceScene: effects },
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
    partyLayer: 0,
    walking: false,
    stepFrame: 0,
    trail: [],
    followerFrozen: [],
    followerPos: [],
    followerAuth: new Map(),
    worldMoveAcc: 0,
    updateCamera: effects,
  }
  const api = mainApi<Api>(
    [
      'currentWorldSnapshot',
      'captureCurrentSavePayload',
      'enqueueSaveSnapshot',
      'doSave',
      'quickSave',
      'refreshSaveMetas',
      'payloadBelongsToProject',
      'normalizeStoredPayload',
      'restorePayload',
      'replaceCanonicalScript',
      'replaceWorld',
      'syncRuntimeScriptScratch',
      'isAbortError',
      'commitSceneSwitch',
    ],
    [],
    env,
  )
  Object.assign(env, api)
  registerDev(env)
  return {
    api,
    get hooks() {
      return expectDefined(env.window.__tpE2e)
    },
    env,
    world,
    runtime,
    capture,
    store,
    io,
  }
}
