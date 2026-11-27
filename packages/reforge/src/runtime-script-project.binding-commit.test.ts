import type { RuntimeCommand, WorldScriptState } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { deferred } from './__tests__/deferred.js'
import {
  digest,
  hostOptions,
  sceneFixture,
  worldFixture,
} from './__tests__/script-world-fixture.js'
import { expectDefined } from './defined.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'

const target = { scene: 'target', entity: 'entity' }
const cases = [
  {
    command: {
      kind: 'selectSceneHooks',
      scene: 'target',
      selection: { onEnter: { kind: 'use', value: 'after' } },
    },
    expected: { scenes: { target: { onEnter: { selection: { kind: 'use', value: 'after' } } } } },
  },
  {
    command: {
      kind: 'selectEntityBehavior',
      target,
      channel: 'trigger',
      selection: { kind: 'use', value: 'second' },
    },
    expected: {
      entities: {
        target: { entity: { trigger: { selection: { kind: 'use', value: 'second' } } } },
      },
    },
  },
  {
    command: { kind: 'selectEntityPage', target, selection: { kind: 'use', value: 'second' } },
    expected: { entities: { target: { entity: { page: 'second' } } } },
  },
  {
    command: {
      kind: 'setEntityTriggerActivation',
      target,
      selection: { kind: 'use', value: { on: 'touch', range: 2 } },
    },
    expected: {
      entities: {
        target: {
          entity: {
            triggerActivation: { kind: 'use', value: { on: 'touch', range: 2 } },
          },
        },
      },
    },
  },
] satisfies { command: RuntimeCommand; expected: WorldScriptState['behaviors'] }[]

describe.each(cases)('$command.kind during scene resolution', ({ command, expected }) => {
  test.each([
    false,
    true,
  ])('successful resolver then abort preserves canonical/epoch/notification (existing cursor=%s)', async (existing) => {
    const world = worldFixture(),
      scene = sceneFixture(),
      controller = new AbortController(),
      entered = deferred<void>(),
      resolved = deferred<typeof scene>(),
      changes = vi.fn()
    const runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      world,
      digest,
      hostOptions(scene, {
        scene: () => {
          entered.resolve()
          return resolved.promise
        },
        worldChanged: changes,
      }),
    )
    if (existing)
      expectDefined(world.script).behaviors = {
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
    resolved.resolve(scene)
    controller.abort()
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
      entered = deferred<void>(),
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
    expect(world.script?.behaviors).toMatchObject(expected)
    expect(changes).toHaveBeenCalledOnce()
  })
})
