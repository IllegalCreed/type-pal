import * as content from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  deferred,
  digest,
  hero,
  hostOptions,
  mainApi,
  sceneFixture,
  worldFixture,
} from './__tests__/world-async-fixture.js'
import { AsyncIntentController, asyncIntentAbortError } from './async-intent.js'
import { expectDefined } from './defined.js'
import { Canvas2DRenderer } from './render.js'
import * as views from './runtime-project-view.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import * as deps from './scene-switch-transaction.js'
import { resolveSceneSpawn } from './scene-transition.js'

type Plan = {
  def: content.SceneDef
  dependencies: deps.SceneSwitchDependencies
  onEnterEntry?: content.SceneEntryPresentation
}
interface Api {
  prepareSceneSwitch(
    scene: string,
    world: content.WorldState,
    spawn?: undefined,
    useOverrides?: boolean,
    script?: content.WorldScriptState,
  ): Promise<Plan>
  assertSceneSwitchPlanCurrent(plan: Plan, world: content.WorldState): void
}

function harness() {
  const world = worldFixture(),
    definition = sceneFixture()
  const entered = deferred(),
    assets = deferred(),
    sceneEntered = deferred(),
    sceneReady = deferred()
  let pauseScene = false
  const reads: string[] = []
  const env = {
    ...content,
    ...views,
    ...deps,
    AsyncIntentController,
    asyncIntentAbortError,
    Canvas2DRenderer,
    resolveSceneSpawn,
    expectDefined,
    world,
    canonicalScript: world.script,
    ctx: {},
    project: { actorsById: { hero } },
    actorSpriteOverrides: new Map<string, { def: { id: string; asset: string } }>(),
    getCanonicalScene: async () => {
      sceneEntered.resolve()
      if (pauseScene) await sceneReady.promise
      return definition
    },
    requireSpriteDef: (id: string) => ({ id, asset: `${id}.asset` }),
    getMapAssets: async (id: string) => {
      reads.push(id)
      entered.resolve()
      await assets.promise
      return { map: { width: 2, height: 2 }, tilesets: new Map() }
    },
    getStandardPalette: async () => ({ colors: [] }),
    spriteCache: { load: vi.fn(async (_resolver: unknown, _asset: string) => ({ frames: [] })) },
    prepareSceneSounds: vi.fn(async () => {}),
  }
  const api = mainApi<Api>(
    [
      'getSceneDef',
      'runnableStages',
      'sceneScriptBinding',
      'bindingSceneEntry',
      'prepareSceneSwitch',
      'assertSceneSwitchPlanCurrent',
    ],
    [],
    env,
  )
  const runtime = new ScriptProjectRuntime(
    { sharedScripts: {} },
    world,
    digest,
    hostOptions(definition),
  )
  return {
    env,
    api,
    world,
    definition,
    runtime,
    entered,
    assets,
    reads,
    sceneEntered,
    sceneReady,
    pauseScene: () => {
      pauseScene = true
    },
  }
}

describe('WORLD-ASYNC-COMMIT-1 real main preflight consumes frozen canonical state', () => {
  test.each([
    'use',
    'disabled',
  ] as const)('canonical onEnter %s during map await invalidates the actual main plan', async (kind) => {
    const h = harness()
    const preparing = h.api.prepareSceneSwitch('target', h.world)
    await h.entered.promise
    await h.runtime.runCommands(
      [
        {
          kind: 'selectSceneHooks',
          scene: 'target',
          selection: { onEnter: kind === 'use' ? { kind, value: 'after' } : { kind } },
        },
      ],
      { signal: new AbortController().signal },
    )
    h.assets.resolve()
    const plan = await preparing
    expect(plan.onEnterEntry?.reveal.kind).toBe('fade')
    expect(() => h.api.assertSceneSwitchPlanCurrent(plan, h.world)).toThrow(/预检依赖已变化/)
  })

  test('entity page selection invalidates the prepared page/trigger view', async () => {
    const h = harness()
    const preparing = h.api.prepareSceneSwitch('target', h.world)
    await h.entered.promise
    await h.runtime.runCommands(
      [
        {
          kind: 'selectEntityPage',
          target: { scene: 'target', entity: 'entity' },
          selection: { kind: 'use', value: 'second' },
        },
      ],
      { signal: new AbortController().signal },
    )
    h.assets.resolve()
    const plan = await preparing
    expect(plan.def.entities[0]?.pages?.[0]?.trigger?.on).toBe('interact')
    expect(() => h.api.assertSceneSwitchPlanCurrent(plan, h.world)).toThrow(/预检依赖已变化/)
  })

  test.each([
    'stage',
    'state',
  ] as const)('%s cursor changes invalidate entry prepared at that cursor', async (kind) => {
    const h = harness()
    if (kind === 'state')
      await h.runtime.runCommands(
        [
          {
            kind: 'selectSceneHooks',
            scene: 'target',
            selection: { onEnter: { kind: 'use', value: 'after' } },
          },
        ],
        { signal: new AbortController().signal },
      )
    const preparing = h.api.prepareSceneSwitch('target', h.world)
    await h.entered.promise
    const activation = h.runtime.coordinator.beginSceneHook(
      h.world.script!,
      h.definition as unknown as content.BaseSceneDef,
      'onEnter',
    )
    expect(activation).toBeDefined()
    await activation!.lease.reachSafePoint(
      kind === 'stage' ? { kind, stage: 'two' } : { kind, machine: 'entry-machine', state: 'two' },
    )
    activation!.lease.close()
    h.assets.resolve()
    const plan = await preparing
    expect(() => h.api.assertSceneSwitchPlanCurrent(plan, h.world)).toThrow(/预检依赖已变化/)
  })

  test('first scene IO await cannot mix later live hook/map/follower changes into the frozen plan', async () => {
    const h = harness()
    h.pauseScene()
    const preparing = h.api.prepareSceneSwitch('target', h.world)
    await h.sceneEntered.promise
    h.world.script!.mapOverride = { target: 'map.changed' }
    h.world.script!.followers = ['sprite.follower']
    await h.runtime.runCommands(
      [
        {
          kind: 'selectSceneHooks',
          scene: 'target',
          selection: { onEnter: { kind: 'use', value: 'after' } },
        },
      ],
      { signal: new AbortController().signal },
    )
    h.sceneReady.resolve()
    h.assets.resolve()
    const plan = await preparing
    expect(h.reads).toEqual(['map.old'])
    expect(plan.onEnterEntry?.reveal.kind).toBe('fade')
    expect(() => h.api.assertSceneSwitchPlanCurrent(plan, h.world)).toThrow(/预检依赖已变化/)
  })

  test('unrelated money/flags/other scene state and same effective selection do not invalidate', async () => {
    const h = harness()
    const preparing = h.api.prepareSceneSwitch('target', h.world)
    await h.entered.promise
    h.world.money++
    h.world.script!.flags.unrelated = true
    h.world.script!.behaviors.scenes = {
      elsewhere: { onEnter: { selection: { kind: 'disabled' } } },
    }
    await h.runtime.runCommands(
      [
        {
          kind: 'selectSceneHooks',
          scene: 'target',
          selection: { onEnter: { kind: 'use', value: 'before' } },
        },
      ],
      { signal: new AbortController().signal },
    )
    h.assets.resolve()
    const plan = await preparing
    expect(() => h.api.assertSceneSwitchPlanCurrent(plan, h.world)).not.toThrow()
  })

  test('an explicit candidate script is the source for preparation and its dependency footprint', async () => {
    const h = harness(),
      candidate = structuredClone(h.world)
    candidate.script!.mapOverride = { target: 'map.saved' }
    candidate.script!.behaviors.scenes = {
      target: { onEnter: { selection: { kind: 'disabled' } } },
    }
    const preparing = h.api.prepareSceneSwitch(
      'target',
      h.world,
      undefined,
      false,
      candidate.script,
    )
    h.assets.resolve()
    const plan = await preparing
    expect(h.reads).toEqual(['map.saved'])
    expect(plan.onEnterEntry).toBeUndefined()
    expect(() => h.api.assertSceneSwitchPlanCurrent(plan, candidate)).not.toThrow()
    expect(h.world.script?.mapOverride).toBeUndefined()
  })

  test('actor override definitions are frozen before the first scene await', async () => {
    const h = harness(),
      override = { def: { id: 'sprite.old', asset: 'asset.old' } }
    h.env.actorSpriteOverrides.set('hero', override)
    h.pauseScene()
    const preparing = h.api.prepareSceneSwitch('target', h.world)
    await h.sceneEntered.promise
    override.def.asset = 'asset.changed'
    h.sceneReady.resolve()
    h.assets.resolve()
    const plan = await preparing
    expect(h.env.spriteCache.load.mock.calls.map((x) => x[1])).toEqual(['asset.old'])
    expect(() => h.api.assertSceneSwitchPlanCurrent(plan, h.world)).toThrow(/预检依赖已变化/)
  })

  test('world without a script prepares inherited bindings without mutating that world', async () => {
    const h = harness()
    delete h.world.script
    h.assets.resolve()
    const plan = await h.api.prepareSceneSwitch('target', h.world)
    expect(plan.onEnterEntry?.reveal.kind).toBe('fade')
    expect(h.world.script).toBeUndefined()
    expect(() => h.api.assertSceneSwitchPlanCurrent(plan, h.world)).not.toThrow()
  })
})
