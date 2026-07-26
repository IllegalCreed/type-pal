import { emptyWorldScriptStateV5, type SceneDefV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { LoadedProjectV5Core } from './loader-v5.js'
import {
  type ProjectScriptHostOptionsV5,
  ProjectScriptRuntimeHostV5,
  ScriptProjectRuntimeV5,
} from './script-project-v5.js'
import { FlowRuntimeCoordinatorV5 } from './script-world-v5.js'

const digest = 'a'.repeat(64)

const scene: SceneDefV5 = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [
    {
      id: 'e1',
      sprite: 'npc',
      pos: { col: 1, row: 1, height: 0 },
      initialPage: 'default',
      pages: [
        { id: 'default', label: '默认', trigger: 'talk', auto: 'idle' },
        { id: 'quiet', label: '安静', trigger: 'alternate' },
      ],
      behaviors: {
        trigger: {
          talk: {
            label: '交谈',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                {
                  id: 'start',
                  body: [
                    { kind: 'setFlag', flag: 'talked', value: true },
                    {
                      kind: 'setEntityState',
                      target: { scene: 's001', entity: 'e1' },
                      state: 2,
                    },
                  ],
                },
              ],
            },
          },
          alternate: {
            label: '另一段',
            order: 1,
            flow: {
              kind: 'stages',
              initial: 'alternate',
              stages: [
                {
                  id: 'alternate',
                  body: [{ kind: 'setFlag', flag: 'alternate', value: true }],
                },
              ],
            },
          },
        },
        auto: {
          idle: {
            label: '待机',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                {
                  id: 'start',
                  body: [{ kind: 'setFlag', flag: 'auto-ran', value: true }],
                },
              ],
            },
          },
        },
      },
    },
  ],
  hooks: {
    onEnter: {
      initial: 'default',
      variants: {
        default: {
          label: '默认进场',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'start',
            stages: [
              {
                id: 'start',
                body: [{ kind: 'setFlag', flag: 'entered', value: true }],
              },
            ],
          },
        },
      },
    },
  },
}

function project(): LoadedProjectV5Core {
  return { sharedScripts: {} } as unknown as LoadedProjectV5Core
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}

function host(
  effect: ProjectScriptHostOptionsV5['executeEffect'] = () => {},
): ProjectScriptHostOptionsV5 {
  return {
    executeEffect: effect,
    scene: (sceneId) => {
      if (sceneId !== scene.id) throw new Error(`missing scene ${sceneId}`)
      return scene
    },
    currentSceneId: () => scene.id,
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: (target) => target.scene === scene.id,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'win',
    teleportOut: async () => false,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  }
}

describe('canonical script v5 project runtime', () => {
  test('activation owns world mutations and commits a stable behavior cursor', async () => {
    const world = emptyWorldScriptStateV5()
    const effects: string[] = []
    const runtime = new ScriptProjectRuntimeV5(
      project(),
      world,
      digest,
      host((command) => {
        effects.push(command.kind)
      }),
    )
    await expect(
      runtime.runEntityBehavior(scene, 'e1', 'trigger', {
        signal: new AbortController().signal,
      }),
    ).resolves.toBe(true)
    expect(world.flags.talked).toBe(true)
    expect(world.entityState.s001?.e1).toBe(2)
    expect(world.behaviors.entities?.s001?.e1?.trigger?.cursor).toEqual({
      behavior: 'talk',
      at: { kind: 'stage', stage: 'start' },
    })
    expect(effects).toEqual(['setFlag', 'setEntityState'])
  })

  test('selection is a named three-state write and invalidates the old activation lease', async () => {
    const world = emptyWorldScriptStateV5()
    let releaseWait!: () => void
    const entered = deferred<void>()
    const pending = new Promise<void>((resolve) => {
      releaseWait = resolve
    })
    const runtime = new ScriptProjectRuntimeV5(
      project(),
      world,
      digest,
      host(async (command) => {
        if (command.kind !== 'setFlag' || command.flag !== 'talked') return
        entered.resolve()
        await pending
      }),
    )
    const running = runtime.runEntityBehavior(scene, 'e1', 'trigger', {
      signal: new AbortController().signal,
    })
    await entered.promise
    await runtime.host.execute(
      {
        kind: 'selectEntityBehavior',
        target: { scene: 's001', entity: 'e1' },
        channel: 'trigger',
        selection: { kind: 'use', value: 'alternate' },
      },
      {},
      new AbortController().signal,
    )
    releaseWait()
    await running
    expect(world.behaviors.entities?.s001?.e1?.trigger).toEqual({
      selection: { kind: 'use', value: 'alternate' },
    })
    await runtime.runEntityBehavior(scene, 'e1', 'trigger', {
      signal: new AbortController().signal,
    })
    expect(world.flags.alternate).toBe(true)
    expect(world.behaviors.entities?.s001?.e1?.trigger?.cursor).toEqual({
      behavior: 'alternate',
      at: { kind: 'stage', stage: 'alternate' },
    })
  })

  test('save barrier waits for a live flow safe-point before exposing the snapshot', async () => {
    const waitingScene = structuredClone(scene)
    const flow = waitingScene.entities[0]!.behaviors!.trigger!.talk!.flow
    if (flow.kind !== 'stages') throw new Error('fixture flow')
    flow.stages[0]!.body = [{ kind: 'wait', ms: 10 }]
    const world = emptyWorldScriptStateV5()
    const entered = deferred<void>()
    const wait = deferred<void>()
    const runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host(),
      scene: () => waitingScene,
      executeEffect: async (command) => {
        if (command.kind !== 'wait') return
        entered.resolve()
        await wait.promise
      },
    })
    const running = runtime.runEntityBehavior(waitingScene, 'e1', 'trigger', {
      signal: new AbortController().signal,
    })
    await entered.promise
    let snapped = false
    const snapshot = runtime.withSaveBarrier(() => {
      snapped = true
      return structuredClone(world)
    })
    await Promise.resolve()
    expect(snapped).toBe(false)
    wait.resolve()
    const saved = await snapshot
    await running
    expect(snapped).toBe(true)
    expect(saved.behaviors.entities?.s001?.e1?.trigger?.cursor).toEqual({
      behavior: 'talk',
      at: { kind: 'stage', stage: 'start' },
    })
  })

  test('interactive trigger waits for a closed save gate and runs exactly once after release', async () => {
    const world = emptyWorldScriptStateV5()
    const effects: string[] = []
    const runtime = new ScriptProjectRuntimeV5(
      project(),
      world,
      digest,
      host((command) => {
        effects.push(command.kind)
      }),
    )
    const barrier = runtime.coordinator.requestSaveBarrier()
    await barrier.ready

    const running = runtime.runEntityBehavior(scene, 'e1', 'trigger', {
      signal: new AbortController().signal,
    })
    await Promise.resolve()
    expect(effects).toEqual([])
    expect(world.flags.talked).toBeUndefined()

    barrier.release()
    await expect(running).resolves.toBe(true)
    expect(effects).toEqual(['setFlag', 'setEntityState'])
    expect(world.flags.talked).toBe(true)
  })

  test('interactive trigger waits while a live auto flow reaches the save safe-point', async () => {
    const waitingScene = structuredClone(scene)
    const entity = waitingScene.entities[0]!
    const autoFlow = entity.behaviors!.auto!.idle!.flow
    const triggerFlow = entity.behaviors!.trigger!.talk!.flow
    if (autoFlow.kind !== 'stages' || triggerFlow.kind !== 'stages') throw new Error('fixture flow')
    autoFlow.stages[0]!.body = [{ kind: 'wait', ms: 10 }]
    triggerFlow.stages[0]!.body = [{ kind: 'addVar', var: 'hits', delta: 1 }]
    const world = emptyWorldScriptStateV5()
    const autoEntered = deferred<void>()
    const releaseAuto = deferred<void>()
    const runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host(),
      scene: () => waitingScene,
      executeEffect: async (command) => {
        if (command.kind !== 'wait') return
        autoEntered.resolve()
        await releaseAuto.promise
      },
    })
    const auto = runtime.runEntityBehavior(waitingScene, 'e1', 'auto', {
      signal: new AbortController().signal,
    })
    await autoEntered.promise

    let snapshots = 0
    const save = runtime.withSaveBarrier(() => {
      snapshots += 1
      return structuredClone(world)
    })
    const trigger = runtime.runEntityBehavior(waitingScene, 'e1', 'trigger', {
      signal: new AbortController().signal,
    })
    await Promise.resolve()
    expect(snapshots).toBe(0)
    expect(world.vars.hits).toBeUndefined()

    releaseAuto.resolve()
    await save
    await expect(auto).resolves.toBe(true)
    await expect(trigger).resolves.toBe(true)
    expect(snapshots).toBe(1)
    expect(world.vars.hits).toBe(1)
  })

  test('scene hook and auto behavior wait without a lease, then resume when the save gate opens', async () => {
    const world = emptyWorldScriptStateV5()
    const runtime = new ScriptProjectRuntimeV5(project(), world, digest, host())
    const barrier = runtime.coordinator.requestSaveBarrier()
    await barrier.ready

    const auto = runtime.runEntityBehavior(scene, 'e1', 'auto', {
      signal: new AbortController().signal,
    })
    const hook = runtime.runSceneHook(scene, 'onEnter', {
      signal: new AbortController().signal,
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(world.flags['auto-ran']).toBeUndefined()
    expect(world.flags.entered).toBeUndefined()

    barrier.release()
    await expect(auto).resolves.toBe(true)
    await expect(hook).resolves.toBe(true)
    expect(world.flags['auto-ran']).toBe(true)
    expect(world.flags.entered).toBe(true)
  })

  test('an absent auto behavior returns false even while the save gate is closed', async () => {
    const noAutoScene = structuredClone(scene)
    const entity = noAutoScene.entities[0]
    if (!entity?.pages?.[0]?.auto || !entity.behaviors?.auto) throw new Error('fixture auto')
    delete entity.pages[0].auto
    delete entity.behaviors.auto
    const runtime = new ScriptProjectRuntimeV5(project(), emptyWorldScriptStateV5(), digest, host())
    const barrier = runtime.coordinator.requestSaveBarrier()
    await barrier.ready

    await expect(
      runtime.runEntityBehavior(noAutoScene, 'e1', 'auto', {
        signal: new AbortController().signal,
      }),
    ).resolves.toBe(false)
    barrier.release()
  })

  test('interactive trigger is discarded when its source scene changes while waiting', async () => {
    const world = emptyWorldScriptStateV5()
    let currentSceneId = scene.id
    const effects: string[] = []
    const runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host((command) => {
        effects.push(command.kind)
      }),
      currentSceneId: () => currentSceneId,
    })
    const barrier = runtime.coordinator.requestSaveBarrier()
    await barrier.ready

    const running = runtime.runEntityBehavior(scene, 'e1', 'trigger', {
      signal: new AbortController().signal,
    })
    currentSceneId = 's002'
    barrier.release()

    await expect(running).resolves.toBe(false)
    expect(effects).toEqual([])
    expect(world.flags.talked).toBeUndefined()
  })

  test('interactive trigger is discarded after a same-id scene session replacement', async () => {
    const world = emptyWorldScriptStateV5()
    let sceneSession = 1
    const effects: string[] = []
    const runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host((command) => {
        effects.push(command.kind)
      }),
      currentSceneSessionId: () => sceneSession,
    })
    const barrier = runtime.coordinator.requestSaveBarrier()
    await barrier.ready

    const running = runtime.runEntityBehavior(scene, 'e1', 'trigger', {
      signal: new AbortController().signal,
    })
    sceneSession += 1
    barrier.release()

    await expect(running).resolves.toBe(false)
    expect(effects).toEqual([])
    expect(world.flags.talked).toBeUndefined()
  })

  test('auto behavior waiting for a save gate can be cancelled without running later', async () => {
    const world = emptyWorldScriptStateV5()
    const effects: string[] = []
    const runtime = new ScriptProjectRuntimeV5(
      project(),
      world,
      digest,
      host((command) => {
        effects.push(command.kind)
      }),
    )
    const barrier = runtime.coordinator.requestSaveBarrier()
    await barrier.ready
    const controller = new AbortController()

    const running = runtime.runEntityBehavior(scene, 'e1', 'auto', {
      signal: controller.signal,
    })
    controller.abort()
    await expect(running).rejects.toMatchObject({ name: 'AbortError' })
    barrier.release()
    await Promise.resolve()

    expect(effects).toEqual([])
    expect(world.flags['auto-ran']).toBeUndefined()
  })

  test('interactive trigger waiting for a save gate can be cancelled without running later', async () => {
    const world = emptyWorldScriptStateV5()
    const effects: string[] = []
    const runtime = new ScriptProjectRuntimeV5(
      project(),
      world,
      digest,
      host((command) => {
        effects.push(command.kind)
      }),
    )
    const barrier = runtime.coordinator.requestSaveBarrier()
    await barrier.ready
    const controller = new AbortController()

    const running = runtime.runEntityBehavior(scene, 'e1', 'trigger', {
      signal: controller.signal,
    })
    controller.abort()
    await expect(running).rejects.toMatchObject({ name: 'AbortError' })
    barrier.release()
    await Promise.resolve()

    expect(effects).toEqual([])
    expect(world.flags.talked).toBeUndefined()
  })

  test('save barrier rejects asynchronous snapshot work and reopens the activation gate', async () => {
    const runtime = new ScriptProjectRuntimeV5(project(), emptyWorldScriptStateV5(), digest, host())

    await expect(
      runtime.withSaveBarrier((() => Promise.resolve('disk write')) as unknown as () => string),
    ).rejects.toThrow(/同步快照/)

    const activation = runtime.coordinator.begin(
      {
        kind: 'entity-behavior',
        target: { scene: 's001', entity: 'e1' },
        channel: 'trigger',
      },
      () => {},
    )
    expect(activation).toBeDefined()
    activation?.close()
  })

  test('standalone host rejects selection targets absent from canonical scene definitions', async () => {
    const world = emptyWorldScriptStateV5()
    const runtimeHost = new ProjectScriptRuntimeHostV5(
      world,
      new FlowRuntimeCoordinatorV5(),
      host(),
    )
    await expect(
      runtimeHost.execute(
        {
          kind: 'selectEntityPage',
          target: { scene: 's001', entity: 'missing' },
          selection: { kind: 'inherit' },
        },
        {},
        new AbortController().signal,
      ),
    ).rejects.toThrow(/entity 不存在/)
  })

  test('runs stable shared and item-private scripts through the same v5 runner', async () => {
    const world = emptyWorldScriptStateV5()
    const runtime = new ScriptProjectRuntimeV5(
      {
        sharedScripts: {
          'shared/test': {
            name: '共享',
            self: 'none',
            body: [{ kind: 'setFlag', flag: 'shared', value: true }],
          },
        },
      } as unknown as LoadedProjectV5Core,
      world,
      digest,
      host(),
    )
    await runtime.runSharedScript('shared/test', {
      signal: new AbortController().signal,
    })
    await runtime.runItemPrivateScript(
      {
        item: {
          id: 'item',
          name: '物品',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'itemPrivateScript',
                script: {
                  id: 'use',
                  body: [{ kind: 'setFlag', flag: 'private', value: true }],
                },
              },
            ],
          },
        },
      },
      'item',
      'use',
      { signal: new AbortController().signal },
    )
    expect(world.flags).toMatchObject({ shared: true, private: true })
  })

  test('notifies the projection only after a canonical mutation succeeds', async () => {
    const world = emptyWorldScriptStateV5()
    const changed: string[] = []
    const runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host(),
      worldChanged: (command) => {
        changed.push(command.kind)
      },
    })
    await runtime.runCommands(
      [
        { kind: 'setFlag', flag: 'ready', value: true },
        { kind: 'setFollowers', sprites: ['sprite-1'] },
      ],
      { signal: new AbortController().signal },
    )
    expect(world.flags.ready).toBe(true)
    expect(world.followers).toEqual(['sprite-1'])
    expect(changed).toEqual(['setFlag', 'setFollowers'])
  })
})
