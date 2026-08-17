import {
  emptyWorldScriptStateV5,
  type LegacyManifestV12,
  type SceneDefV5,
  type WorldStateV7,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { asyncIntentAbortError } from './async-intent.js'
import type { LoadedProjectV5Core } from './loader-v5.js'
import { normalizePayloadV8, preflightSaveMigration } from './save/migration.js'
import { buildPayloadV8 } from './save/ops.js'
import {
  withRegisteredScriptActivityLineageV5,
  withScriptActivityLineageV5,
} from './script-activity-lineage-v5.js'
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

function currentManifest(): LegacyManifestV12 {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 12,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
    },
  }
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
    startBattle: async () => 'victory',
    teleportOut: async () => false,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  }
}

describe('canonical script v5 project runtime', () => {
  test('moveEntity persists only the successfully reached endpoint', async () => {
    const world = emptyWorldScriptStateV5()
    const reached = deferred<void>()
    const changed: string[] = []
    const runtimeHost = new ProjectScriptRuntimeHostV5(world, new FlowRuntimeCoordinatorV5(), {
      ...host(async (command) => {
        if (command.kind === 'moveEntity') await reached.promise
      }),
      worldChanged: (command) => {
        changed.push(command.kind)
      },
    })
    const command = {
      kind: 'moveEntity' as const,
      target: { scene: 's001', entity: 'e1' },
      to: { col: 7, row: 9, height: 0 },
      speed: 'normal' as const,
    }
    const moving = runtimeHost.execute(command, {}, new AbortController().signal)

    await Promise.resolve()
    expect(world.entityPos?.s001?.e1).toBeUndefined()
    reached.resolve()
    await moving
    expect(world.entityPos?.s001?.e1).toEqual(command.to)
    expect(changed).toEqual(['moveEntity'])
  })

  test('moveEntity commit control linearizes canonical endpoint before later same-actor writes', async () => {
    const world = emptyWorldScriptStateV5()
    const effectDone = deferred<void>()
    const changed: string[] = []
    const runtimeHost = new ProjectScriptRuntimeHostV5(world, new FlowRuntimeCoordinatorV5(), {
      ...host(async (command, _context, _signal, control) => {
        if (command.kind !== 'moveEntity') return
        expect(control?.moveEntityEndpointCommitted).toBe(false)
        control?.commitMoveEntityEndpoint()
        expect(control?.moveEntityEndpointCommitted).toBe(true)
        await effectDone.promise
      }),
      worldChanged: (command) => {
        changed.push(command.kind)
      },
    })
    const command = {
      kind: 'moveEntity' as const,
      target: { scene: 's001', entity: 'e1' },
      to: { col: 7, row: 9, height: 0 },
      speed: 'normal' as const,
    }
    const moving = runtimeHost.execute(command, {}, new AbortController().signal)

    await Promise.resolve()
    expect(world.entityPos?.s001?.e1).toEqual(command.to)
    // Models a touch script mutation that runs after the endpoint commit but before the old leaf
    // continuation resumes. The runtime must not replay the old endpoint over this newer truth.
    world.entityPos!.s001!.e1 = { col: 11, row: 12, height: 0 }
    effectDone.resolve()
    await moving
    expect(world.entityPos?.s001?.e1).toEqual({ col: 11, row: 12, height: 0 })
    expect(changed).toEqual(['moveEntity'])
  })

  test('post-commit abort stops continuation without rolling back the endpoint', async () => {
    const world = emptyWorldScriptStateV5()
    const abort = new AbortController()
    const runtimeHost = new ProjectScriptRuntimeHostV5(
      world,
      new FlowRuntimeCoordinatorV5(),
      host((command, _context, _signal, control) => {
        if (command.kind !== 'moveEntity') return
        control?.commitMoveEntityEndpoint()
        abort.abort()
      }),
    )
    const command = {
      kind: 'moveEntity' as const,
      target: { scene: 's001', entity: 'e1' },
      to: { col: 7, row: 9, height: 0 },
      speed: 'normal' as const,
    }
    await expect(runtimeHost.execute(command, {}, abort.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(world.entityPos?.s001?.e1).toEqual(command.to)
  })

  test('a superseding move commits only the latest endpoint', async () => {
    const world = emptyWorldScriptStateV5()
    const effects: Array<{ col: number; row: number; height: number }> = []
    const changed: Array<{ col: number; row: number; height: number }> = []
    const pending: ReturnType<typeof deferred<void>>[] = []
    let active: ReturnType<typeof deferred<void>> | undefined
    const runtimeHost = new ProjectScriptRuntimeHostV5(world, new FlowRuntimeCoordinatorV5(), {
      ...host(async (command) => {
        if (command.kind !== 'moveEntity') return
        effects.push(structuredClone(command.to))
        active?.reject(asyncIntentAbortError('旧走位已被新走位替换'))
        const next = deferred<void>()
        pending.push(next)
        active = next
        await next.promise
      }),
      worldChanged: (command) => {
        if (command.kind === 'moveEntity') changed.push(structuredClone(command.to))
      },
    })
    const oldCommand = {
      kind: 'moveEntity' as const,
      target: { scene: 's001', entity: 'e1' },
      to: { col: 7, row: 9, height: 0 },
      speed: 'normal' as const,
    }
    const newCommand = {
      ...oldCommand,
      to: { col: 3, row: 4, height: 0 },
    }

    const oldMove = runtimeHost.execute(oldCommand, {}, new AbortController().signal)
    const oldRejected = expect(oldMove).rejects.toMatchObject({ name: 'AbortError' })
    const newMove = runtimeHost.execute(newCommand, {}, new AbortController().signal)
    await oldRejected

    expect(world.entityPos?.s001?.e1).toBeUndefined()
    expect(changed).toEqual([])
    expect(pending).toHaveLength(2)

    pending[1]!.resolve()
    await newMove
    expect(effects).toEqual([oldCommand.to, newCommand.to])
    expect(world.entityPos?.s001?.e1).toEqual(newCommand.to)
    expect(world.entityPos?.s001?.e1).not.toEqual(oldCommand.to)
    expect(changed).toEqual([newCommand.to])
  })

  test('moveEntity does not persist a stale endpoint after abort or scene-session replacement', async () => {
    const abortedWorld = emptyWorldScriptStateV5()
    const abort = new AbortController()
    const abortedHost = new ProjectScriptRuntimeHostV5(
      abortedWorld,
      new FlowRuntimeCoordinatorV5(),
      host(async (command) => {
        if (command.kind !== 'moveEntity') return
        abort.abort()
        abort.signal.throwIfAborted()
      }),
    )
    const command = {
      kind: 'moveEntity' as const,
      target: { scene: 's001', entity: 'e1' },
      to: { col: 7, row: 9, height: 0 },
      speed: 'normal' as const,
    }

    await expect(abortedHost.execute(command, {}, abort.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(abortedWorld.entityPos?.s001?.e1).toBeUndefined()

    const replacedWorld = emptyWorldScriptStateV5()
    let session = 1
    const replacedHost = new ProjectScriptRuntimeHostV5(
      replacedWorld,
      new FlowRuntimeCoordinatorV5(),
      {
        ...host(async () => {
          session = 2
        }),
        currentSceneSessionId: () => session,
      },
    )
    await expect(
      replacedHost.execute(command, {}, new AbortController().signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(replacedWorld.entityPos?.s001?.e1).toBeUndefined()
  })

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

  test('SAVE6 resumes an opcode 0x09 cadence cursor without replaying elapsed ticks', async () => {
    const cadenceScene = structuredClone(scene)
    const auto = cadenceScene.entities[0]?.behaviors?.auto?.idle
    if (!auto) throw new Error('fixture auto behavior')
    auto.flow = {
      kind: 'stateMachine',
      machine: {
        id: 'auto-lifecycle-s001-e1-idle',
        label: '0x09 cadence fixture',
        initial: 'source-1',
        cadence: 'transition',
        states: {
          'source-1': {
            label: '源指令 1',
            body: [{ kind: 'setFlag', flag: 'started', value: true }],
            next: {
              kind: 'to',
              state: 'source-1-wait-2',
              yield: 'worldTick',
            },
          },
          'source-1-wait-2': {
            label: '源指令 1 · 等待 2/3',
            body: [],
            next: {
              kind: 'to',
              state: 'source-1-wait-3',
              yield: 'worldTick',
            },
          },
          'source-1-wait-3': {
            label: '源指令 1 · 等待 3/3',
            body: [],
            next: {
              kind: 'to',
              state: 'source-2',
              yield: 'worldTick',
            },
          },
          'source-2': {
            label: '源指令 2',
            body: [{ kind: 'setFlag', flag: 'after-wait', value: true }],
            next: { kind: 'stay' },
          },
        },
      },
    }

    const world = emptyWorldScriptStateV5()
    const enteredFirstTick = deferred<void>()
    const releaseFirstTick = deferred<void>()
    let firstTicks = 0
    const runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host(),
      scene: () => cadenceScene,
      waitWorldTick: async () => {
        firstTicks++
        if (firstTicks !== 1) return
        enteredFirstTick.resolve()
        await releaseFirstTick.promise
      },
    })
    const running = runtime.runEntityBehavior(cadenceScene, 'e1', 'auto', {
      signal: new AbortController().signal,
    })
    await enteredFirstTick.promise

    const savedWorld = runtime.withSaveBarrier<WorldStateV7>(() => ({
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
      script: structuredClone(world),
    }))
    releaseFirstTick.resolve()
    const saved = await savedWorld
    await expect(running).resolves.toBe(true)

    expect(firstTicks).toBe(1)
    expect(saved.script?.flags.started).toBe(true)
    expect(saved.script?.flags['after-wait']).toBeUndefined()
    expect(saved.script?.behaviors.entities?.s001?.e1?.auto?.cursor).toEqual({
      behavior: 'idle',
      at: {
        kind: 'state',
        machine: 'auto-lifecycle-s001-e1-idle',
        state: 'source-1-wait-3',
      },
    })

    const payload = buildPayloadV8(
      saved,
      {
        sceneId: 's001',
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down',
      },
      'demo',
    )
    const resolver = await preflightSaveMigration({
      manifest: currentManifest(),
      payload,
    })
    const restored = normalizePayloadV8(payload, resolver)
    expect(restored).not.toBe(payload)
    expect(restored.world.script?.behaviors.entities?.s001?.e1?.auto?.cursor).toEqual(
      saved.script?.behaviors.entities?.s001?.e1?.auto?.cursor,
    )

    let resumedTicks = 0
    const resumedEffects: string[] = []
    const resumed = new ScriptProjectRuntimeV5(project(), restored.world.script!, digest, {
      ...host((command) => {
        if (command.kind === 'setFlag') resumedEffects.push(command.flag)
      }),
      scene: () => cadenceScene,
      waitWorldTick: async () => {
        resumedTicks++
      },
    })
    await expect(
      resumed.runEntityBehavior(cadenceScene, 'e1', 'auto', {
        signal: new AbortController().signal,
      }),
    ).resolves.toBe(true)

    expect(resumedTicks).toBe(1)
    expect(resumedEffects).toEqual(['after-wait'])
    expect(restored.world.script?.flags).toMatchObject({
      started: true,
      'after-wait': true,
    })
    expect(restored.world.script?.behaviors.entities?.s001?.e1?.auto?.cursor).toEqual({
      behavior: 'idle',
      at: {
        kind: 'state',
        machine: 'auto-lifecycle-s001-e1-idle',
        state: 'source-2',
      },
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

  test('save barrier parks behind a transient confirm until the whole command chain finishes', async () => {
    const world = emptyWorldScriptStateV5()
    const answer = deferred<boolean>()
    const runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host(),
      confirm: () => answer.promise,
    })
    const running = runtime.runCommands(
      [
        { kind: 'confirm', onNo: [] },
        { kind: 'setFlag', flag: 'after-answer', value: true },
      ],
      { signal: new AbortController().signal },
    )
    await Promise.resolve()

    let snapshots = 0
    const save = runtime.withSaveBarrier(() => {
      snapshots += 1
      return structuredClone(world)
    })
    await Promise.resolve()
    expect(snapshots).toBe(0)

    answer.resolve(false)
    await running
    const snapshot = await save
    expect(snapshots).toBe(1)
    expect(snapshot.flags['after-answer']).toBe(true)
  })

  test('confirm 中请求保存后，startBattle/onDefeated 复用父 activity 且快照包含完整子链', async () => {
    const battleScene = structuredClone(scene)
    const flow = battleScene.entities[0]?.behaviors?.trigger?.talk?.flow
    if (!flow || flow.kind !== 'stages') throw new Error('fixture trigger flow')
    flow.stages[0]!.body = [
      { kind: 'confirm', onNo: [] },
      { kind: 'startBattle', enemyTeamId: 'team-1' },
      { kind: 'setFlag', flag: 'outer-after-battle', value: true },
    ]
    const world = emptyWorldScriptStateV5()
    const confirmEntered = deferred<void>()
    const answer = deferred<boolean>()
    let runtime!: ScriptProjectRuntimeV5
    runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host(),
      scene: () => battleScene,
      confirm: () => {
        confirmEntered.resolve()
        return answer.promise
      },
      startBattle: async (_request, signal) => {
        await runtime.runCommands([{ kind: 'setFlag', flag: 'battle-end', value: true }], {
          signal,
        })
        return 'victory'
      },
    })
    const signal = new AbortController().signal
    const running = runtime.runEntityBehavior(battleScene, 'e1', 'trigger', {
      signal,
    })
    await confirmEntered.promise

    let snapshots = 0
    const save = runtime.withSaveBarrier(() => {
      snapshots += 1
      return structuredClone(world)
    })
    await Promise.resolve()
    expect(snapshots).toBe(0)

    answer.resolve(true)
    await expect(running).resolves.toBe(true)
    const snapshot = await save
    expect(snapshots).toBe(1)
    expect(snapshot.flags).toMatchObject({
      'battle-end': true,
      'outer-after-battle': true,
    })
  })

  test('无父 flow 的 hostile/dev 战斗从开战起持有 transient activity', async () => {
    const world = emptyWorldScriptStateV5()
    const battleEntered = deferred<void>()
    const releaseBattle = deferred<void>()
    let runtime!: ScriptProjectRuntimeV5
    runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host(),
      startBattle: async (_request, signal) => {
        battleEntered.resolve()
        await releaseBattle.promise
        await runtime.runCommands([{ kind: 'setFlag', flag: 'hostile-battle-end', value: true }], {
          signal,
        })
        return 'victory'
      },
    })
    const running = runtime.host.startBattle(
      { enemyTeamId: 'team-2' },
      new AbortController().signal,
    )
    await battleEntered.promise

    let snapshots = 0
    const save = runtime.withSaveBarrier(() => {
      snapshots += 1
      return structuredClone(world)
    })
    await Promise.resolve()
    expect(snapshots).toBe(0)

    releaseBattle.resolve()
    await expect(running).resolves.toBe('victory')
    const snapshot = await save
    expect(snapshots).toBe(1)
    expect(snapshot.flags['hostile-battle-end']).toBe(true)
  })

  test('battle/onDefeated 错误向外传播并只关闭一次 activity', async () => {
    const world = emptyWorldScriptStateV5()
    let runtime!: ScriptProjectRuntimeV5
    runtime = new ScriptProjectRuntimeV5(project(), world, digest, {
      ...host((command) => {
        if (command.kind === 'setFlag' && command.flag === 'explode')
          throw new Error('onDefeated failed')
      }),
      startBattle: async (_request, signal) => {
        await runtime.runCommands([{ kind: 'setFlag', flag: 'explode', value: true }], { signal })
        return 'victory'
      },
    })
    await expect(
      runtime.host.startBattle({ enemyTeamId: 'team-3' }, new AbortController().signal),
    ).rejects.toThrow('onDefeated failed')

    const barrier = runtime.coordinator.requestSaveBarrier()
    await expect(barrier.ready).resolves.toBeUndefined()
    barrier.release()
  })

  test('共用 signal 的并行父 flow 以引用计数保留 activity lineage', async () => {
    const coordinator = new FlowRuntimeCoordinatorV5()
    const runtimeKey = {}
    const signal = new AbortController().signal
    const releaseFirst = deferred<void>()
    const releaseSecond = deferred<void>()
    const firstLease = coordinator.beginActivity()
    const secondLease = coordinator.beginActivity()
    if (!firstLease || !secondLease) throw new Error('fixture activity lease')

    const first = (async () => {
      try {
        await withRegisteredScriptActivityLineageV5(runtimeKey, signal, () => releaseFirst.promise)
      } finally {
        firstLease.close()
      }
    })()
    const second = (async () => {
      try {
        await withRegisteredScriptActivityLineageV5(runtimeKey, signal, async () => {
          await releaseSecond.promise
          await withScriptActivityLineageV5(runtimeKey, coordinator, signal, async () => {})
        })
      } finally {
        secondLease.close()
      }
    })()

    releaseFirst.resolve()
    await first
    const barrier = coordinator.requestSaveBarrier()
    releaseSecond.resolve()
    await second
    await expect(barrier.ready).resolves.toBeUndefined()
    barrier.release()
  })

  test('transient commands wait for an already-ready save barrier and abort cleanly', async () => {
    const runtime = new ScriptProjectRuntimeV5(project(), emptyWorldScriptStateV5(), digest, host())
    const barrier = runtime.coordinator.requestSaveBarrier()
    await barrier.ready
    const controller = new AbortController()
    const running = runtime.runCommands([{ kind: 'setFlag', flag: 'late', value: true }], {
      signal: controller.signal,
    })
    controller.abort()
    await expect(running).rejects.toMatchObject({ name: 'AbortError' })
    barrier.release()
    expect(runtime.world.flags.late).toBeUndefined()
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
