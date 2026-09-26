import type { RuntimeCommand } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  deferred,
  digest,
  hostOptions,
  mainApi,
  sceneFixture,
  worldFixture,
} from './__tests__/world-async-fixture.js'
import { ActiveScene } from './active-scene.js'
import { AsyncIntentController, asyncIntentAbortError } from './async-intent.js'
import { buildBlankProjectMap } from './project-map.js'
import { Canvas2DRenderer } from './render.js'
import { runtimeSceneView } from './runtime-project-view.js'
import { type ProjectScriptHostOptions, ScriptProjectRuntime } from './runtime-script-project.js'
import type { BaseRuntimeLeafCommand } from './script-compiler-core.js'
import { executeScriptHostEffect } from './script-host-adapter.js'
import type { ScriptHost } from './script-runner.js'

function mapHarness(initial: string | undefined) {
  const world = worldFixture()
  if (initial) world.script!.mapOverride = { source: initial }
  const scene = sceneFixture('source')
  const oldMap = buildBlankProjectMap(1, 1, 'tiles'),
    oldRenderer = { old: true }
  const next = { map: buildBlankProjectMap(3, 2, 'tiles'), tilesets: new Map() }
  const activeScene = new ActiveScene<object>(runtimeSceneView(scene, world.script!), () => {})
  const initialPlan = {
    sceneId: scene.id,
    def: activeScene.scene,
    assets: { map: oldMap, tilesets: new Map() },
    palette: { colors: [], cycles: [] },
    renderer: oldRenderer,
    entityDefs: new Map(),
    pageActions: [],
  }
  activeScene.commit(initialPlan)
  activeScene.rendererForWave(() => oldRenderer)
  const adapterHost = {} as ScriptHost
  const env = {
    world,
    canonicalScript: world.script,
    activeScene,
    get scene() {
      return activeScene.scene
    },
    set scene(value) {
      activeScene.commit({ ...initialPlan, def: value })
    },
    get map() {
      return activeScene.map
    },
    get renderer() {
      return activeScene.renderer
    },
    get tiles() {
      return activeScene.tiles
    },
    get waveRenderer() {
      return activeScene.waveRenderer
    },
    get room() {
      return activeScene.room
    },
    scriptMutationIntent: new AsyncIntentController(),
    Canvas2DRenderer,
    ctx: {},
    palette: { colors: [] },
    asyncIntentAbortError,
    getMapAssets: vi.fn(async () => next),
    executeScriptHostEffect,
    scriptHost: adapterHost,
    autoHost: adapterHost,
  }
  const api = mainApi<{
    reloadMap: NonNullable<ScriptHost['reloadMap']>
    executeProjectScriptEffect: ProjectScriptHostOptions['executeEffect']
  }>(['assertRunnerActive', 'awaitRunner', 'executeProjectScriptEffect'], ['reloadMap'], env)
  adapterHost.reloadMap = api.reloadMap
  const changes = vi.fn(() => {
    expect(world.script?.mapOverride?.source).toBe('map.new')
    expect(env.map).toBe(next.map)
  })
  const runtime = new ScriptProjectRuntime(
    { sharedScripts: {} },
    world,
    digest,
    hostOptions(scene, {
      currentSceneId: () => env.scene.id,
      executeEffect: api.executeProjectScriptEffect,
      worldChanged: changes,
    }),
  )
  return { env, api, runtime, world, changes, next, oldMap, oldRenderer, adapterHost }
}

describe('WORLD-ASYNC-COMMIT-1 current map: real canonical runtime → adapter → main reloadMap', () => {
  test('main rejects a missing commit control before IO instead of creating a second canonical writer', async () => {
    const h = mapHarness(undefined),
      before = structuredClone(h.world)
    await expect(h.api.reloadMap('map.new', new AbortController().signal)).rejects.toThrow(
      '缺 canonical 同步提交控制',
    )
    expect(h.env.getMapAssets).not.toHaveBeenCalled()
    expect(h.world).toEqual(before)
    expect(h.env.map).toBe(h.oldMap)
  })
  test.each([
    'map.old',
    undefined,
  ])('success commits live/canonical/snapshot together from %s', async (initial) => {
    const h = mapHarness(initial)
    await h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
      signal: new AbortController().signal,
    })
    expect(h.env.map).toBe(h.next.map)
    expect(h.env.tiles).toBe(h.next.tilesets)
    expect(h.env.renderer).not.toBe(h.oldRenderer)
    expect(h.env.waveRenderer).toBeNull()
    expect(h.env.room).toEqual({ col: 0, row: 0, cols: 3, rows: 2 })
    expect(await h.runtime.withSaveBarrier(() => structuredClone(h.world.script))).toMatchObject({
      mapOverride: { source: 'map.new' },
    })
    expect(h.changes).toHaveBeenCalledOnce()
  })

  test.each([
    'map.old',
    undefined,
  ])('resource failure preserves live/canonical/snapshot and retry from %s', async (initial) => {
    const h = mapHarness(initial),
      before = structuredClone(h.world)
    h.env.getMapAssets.mockRejectedValueOnce(new Error('resource failed'))
    await expect(
      h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('resource failed')
    expect(h.world).toEqual(before)
    expect(h.env.map).toBe(h.oldMap)
    expect(h.env.renderer).toBe(h.oldRenderer)
    expect(h.changes).not.toHaveBeenCalled()
    expect(await h.runtime.withSaveBarrier(() => structuredClone(h.world))).toEqual(before)
    await h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
      signal: new AbortController().signal,
    })
    expect(h.changes).toHaveBeenCalledOnce()
  })

  test('cancel after resource entered keeps absent override absent and permits retry', async () => {
    const h = mapHarness(undefined),
      before = structuredClone(h.world)
    const gate = deferred<typeof h.next>(),
      entered = deferred(),
      controller = new AbortController()
    h.env.getMapAssets.mockImplementationOnce(() => {
      entered.resolve()
      return gate.promise
    })
    const running = h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
      signal: controller.signal,
    })
    const rejected = expect(running).rejects.toMatchObject({ name: 'AbortError' })
    await entered.promise
    const during = structuredClone(h.world)
    controller.abort()
    gate.resolve(h.next)
    await rejected
    expect(during).toEqual(before)
    expect(h.world).toEqual(before)
    expect(h.env.map).toBe(h.oldMap)
    expect(h.changes).not.toHaveBeenCalled()
    await h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
      signal: new AbortController().signal,
    })
    expect(h.changes).toHaveBeenCalledOnce()
  })

  test('renderer preparation throws before either state commits', async () => {
    const h = mapHarness(undefined),
      before = structuredClone(h.world)
    h.env.Canvas2DRenderer = class extends Canvas2DRenderer {
      constructor(...args: ConstructorParameters<typeof Canvas2DRenderer>) {
        super(...args)
        throw new Error('renderer failed')
      }
    }
    await expect(
      h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('renderer failed')
    expect(h.world).toEqual(before)
    expect(h.env.map).toBe(h.oldMap)
    expect(h.env.renderer).toBe(h.oldRenderer)
    expect(h.changes).not.toHaveBeenCalled()
  })

  test.each([
    'scene',
    'world-intent',
  ] as const)('%s invalidation while loading blocks old commit despite same ID/object identity', async (mode) => {
    const h = mapHarness(undefined),
      gate = deferred<typeof h.next>(),
      entered = deferred()
    h.env.getMapAssets.mockImplementationOnce(() => {
      entered.resolve()
      return gate.promise
    })
    const running = h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
      signal: new AbortController().signal,
    })
    const rejected = expect(running).rejects.toMatchObject({ name: 'AbortError' })
    await entered.promise
    if (mode === 'scene') h.env.scene = structuredClone(h.env.scene)
    else {
      h.world.money = 99
      h.env.scriptMutationIntent.invalidate()
    }
    const afterReplacement = structuredClone(h.world)
    gate.resolve(h.next)
    await rejected
    expect(h.world).toEqual(afterReplacement)
    expect(h.env.map).toBe(h.oldMap)
    expect(h.changes).not.toHaveBeenCalled()
  })

  test.each([
    'abort',
    'reject',
  ] as const)('post-commit %s preserves both states and publishes once, stopping later commands', async (mode) => {
    const h = mapHarness(undefined),
      controller = new AbortController()
    h.adapterHost.reloadMap = async (...args) => {
      await h.api.reloadMap(...args)
      if (mode === 'abort') queueMicrotask(() => controller.abort())
      else throw new Error('post-commit effect failure')
    }
    const running = h.runtime.runCommands(
      [
        { kind: 'setSceneMapOverride', mapId: 'map.new' },
        { kind: 'setFlag', flag: 'later', value: true },
      ],
      { signal: controller.signal },
    )
    if (mode === 'abort') await expect(running).rejects.toMatchObject({ name: 'AbortError' })
    else await expect(running).rejects.toThrow('post-commit effect failure')
    expect(h.world.script?.mapOverride?.source).toBe('map.new')
    expect(h.env.map).toBe(h.next.map)
    expect(h.world.script?.flags.later).toBeUndefined()
    expect(h.changes).toHaveBeenCalledOnce()
  })

  test('an old cancelled resource completion cannot overwrite a later successful commit', async () => {
    const h = mapHarness(undefined),
      gate = deferred<typeof h.next>(),
      entered = deferred(),
      controller = new AbortController()
    h.env.getMapAssets.mockImplementationOnce(() => {
      entered.resolve()
      return gate.promise
    })
    const old = h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.old-request' }], {
      signal: controller.signal,
    })
    const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' })
    await entered.promise
    controller.abort()
    await rejected
    await h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
      signal: new AbortController().signal,
    })
    gate.resolve({ ...h.next, map: buildBlankProjectMap(9, 9, 'tiles') })
    await gate.promise
    await Promise.resolve()
    expect(h.world.script?.mapOverride?.source).toBe('map.new')
    expect(h.env.map).toBe(h.next.map)
    expect(h.changes).toHaveBeenCalledOnce()
  })

  test('a live host must commit explicitly; a detached late callback cannot write after effect exit', async () => {
    const h = mapHarness(undefined),
      before = structuredClone(h.world)
    let late: (() => void) | undefined
    h.adapterHost.reloadMap = async (_id, _signal, commit) => {
      late = commit
    }
    await expect(
      h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('未完成同步提交')
    expect(late).toBeTypeOf('function')
    expect(() => late!()).toThrow('effect 已结束')
    expect(h.world).toEqual(before)
    expect(h.changes).not.toHaveBeenCalled()
  })

  test('duplicate accepted commit control is idempotent and cannot restore an old value', async () => {
    const h = mapHarness(undefined)
    let accepted: (() => void) | undefined
    h.adapterHost.reloadMap = async (id, signal, commit) => {
      accepted = commit
      await h.api.reloadMap(id, signal, () => {
        commit!()
        commit!()
      })
    }
    await h.runtime.runCommands([{ kind: 'setSceneMapOverride', mapId: 'map.new' }], {
      signal: new AbortController().signal,
    })
    h.world.script!.mapOverride!.source = 'map.later'
    accepted!()
    expect(h.world.script?.mapOverride?.source).toBe('map.later')
    expect(h.changes).toHaveBeenCalledOnce()
  })

  test.each([
    undefined,
    'source',
    'elsewhere',
  ])('state-only adapter explicitly commits without reload, scene=%s', async (sceneId) => {
    const world = worldFixture(),
      scene = sceneFixture(),
      changed = vi.fn()
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      world,
      digest,
      hostOptions(scene, {
        executeEffect: (command, context, signal, commitControl) =>
          executeScriptHostEffect(
            {} as ScriptHost,
            command as BaseRuntimeLeafCommand,
            context,
            signal,
            { currentSceneId: () => 'source', commitControl },
          ),
        worldChanged: changed,
      }),
    )
    await runtime.runCommands(
      [
        {
          kind: 'setSceneMapOverride',
          ...(sceneId === undefined ? {} : { scene: sceneId }),
          mapId: 'map.new',
        },
      ],
      { signal: new AbortController().signal },
    )
    expect(world.script?.mapOverride).toEqual({ [sceneId ?? 'source']: 'map.new' })
    expect(changed).toHaveBeenCalledOnce()
  })

  test.each([
    'source',
    'elsewhere',
  ])('explicit scene %s writes the override without reloading the live map', async (sceneId) => {
    const h = mapHarness(undefined)
    h.changes.mockImplementation(() => {})
    await h.runtime.runCommands(
      [{ kind: 'setSceneMapOverride', scene: sceneId, mapId: 'map.new' }],
      { signal: new AbortController().signal },
    )
    expect(h.world.script?.mapOverride).toEqual({ [sceneId]: 'map.new' })
    expect(h.env.getMapAssets).not.toHaveBeenCalled()
    expect(h.env.map).toBe(h.oldMap)
    expect(h.changes).toHaveBeenCalledOnce()
  })
})

const target = { scene: 'target', entity: 'entity' }
const selections = [
  {
    kind: 'selectSceneHooks',
    scene: 'target',
    selection: { onEnter: { kind: 'use', value: 'after' } },
  },
  {
    kind: 'selectEntityBehavior',
    target,
    channel: 'trigger',
    selection: { kind: 'use', value: 'second' },
  },
  { kind: 'selectEntityPage', target, selection: { kind: 'use', value: 'second' } },
  {
    kind: 'setEntityTriggerActivation',
    target,
    selection: { kind: 'use', value: { on: 'touch', range: 2 } },
  },
] satisfies RuntimeCommand[]

describe.each(selections)('WORLD-ASYNC-COMMIT-1 $kind async selection', (command) => {
  test.each([
    false,
    true,
  ])('successful resolver then abort preserves canonical/epoch/notification (existing cursor=%s)', async (existing) => {
    const world = worldFixture(),
      scene = sceneFixture(),
      controller = new AbortController(),
      entered = deferred(),
      changes = vi.fn()
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      world,
      digest,
      hostOptions(scene, {
        scene: async () => {
          entered.resolve()
          return scene
        },
        worldChanged: changes,
      }),
    )
    if (existing)
      world.script!.behaviors = {
        scenes: {
          target: {
            onEnter: {
              selection: { kind: 'use', value: 'before' },
              cursor: { hook: 'before', at: { kind: 'stage', stage: 'two' } },
            },
          },
        },
        entities: {
          target: {
            entity: {
              page: 'first',
              trigger: {
                selection: { kind: 'use', value: 'first' },
                cursor: { behavior: 'first', at: { kind: 'stage', stage: 'two' } },
              },
              triggerActivation: { kind: 'use', value: { on: 'interact', range: 1 } },
            },
          },
        },
      }
    const before = structuredClone(world)
    const running = runtime.runCommands([command], { signal: controller.signal })
    const rejected = expect(running).rejects.toMatchObject({ name: 'AbortError' })
    await entered.promise
    queueMicrotask(() => controller.abort())
    await rejected
    expect(world).toEqual(before)
    expect(changes).not.toHaveBeenCalled()
    expect(
      runtime.coordinator.epoch({ kind: 'scene-hook', scene: 'target', slot: 'onEnter' }),
    ).toBe(0)
    expect(runtime.coordinator.epoch({ kind: 'entity-behavior', target, channel: 'trigger' })).toBe(
      0,
    )
    expect(runtime.coordinator.epoch({ kind: 'entity-behavior', target, channel: 'auto' })).toBe(0)
  })
  test('same scene ID but newer source session rejects, without confusing source and target', async () => {
    const world = worldFixture(),
      scene = sceneFixture(),
      gate = deferred<typeof scene>(),
      entered = deferred(),
      changes = vi.fn()
    let session = 1
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      world,
      digest,
      hostOptions(scene, {
        scene: () => {
          entered.resolve()
          return gate.promise
        },
        currentSceneSessionId: () => session,
        worldChanged: changes,
      }),
    )
    const before = structuredClone(world)
    const running = runtime.runCommands([command], { signal: new AbortController().signal })
    const rejected = expect(running).rejects.toMatchObject({ name: 'AbortError' })
    await entered.promise
    session++
    gate.resolve(scene)
    await rejected
    expect(world).toEqual(before)
    expect(changes).not.toHaveBeenCalled()
  })
  test('unchanged source session can select a different target scene', async () => {
    const world = worldFixture(),
      scene = sceneFixture(),
      changes = vi.fn()
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      world,
      digest,
      hostOptions(scene, { scene: async () => scene, worldChanged: changes }),
    )
    await runtime.runCommands([command], { signal: new AbortController().signal })
    expect(world.script?.behaviors).not.toEqual({})
    expect(changes).toHaveBeenCalledOnce()
  })
})
