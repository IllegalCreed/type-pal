// TEST-COVERAGE85-GLM-REFORGE-1 — runtime-script-project/script-project-core/script-runner-core
// 残留分支臂合同测试。全部走公开 ScriptProjectRuntime/ProjectScriptRuntimeHost/
// ScriptRunnerCore.runFlow 入口;typed fixture,断言业务错误与状态。
import {
  type AutoScriptContinuation,
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  type RuntimeSceneDef,
  type WorldState,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { compileRuntimeScriptFlow, type RuntimeLeafCommand } from './runtime-script-compiler.js'
import {
  type ProjectScriptHostOptions,
  ProjectScriptRuntimeHost,
  ScriptProjectRuntime,
} from './runtime-script-project.js'
import { FlowRuntimeCoordinator } from './script-world.js'

const digest = 'a'.repeat(64)
const scene: RuntimeSceneDef = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [{ id: 'e001', pos: { col: 1, row: 1, height: 0 }, zone: true }],
}
const references = buildEntityLifecycleReferenceIndex([scene])

const makeWorld = (): WorldState => ({
  party: [],
  money: 0,
  learnedSkills: {},
  inventory: [],
  script: emptyWorldScriptState(),
})

function hostOptions(override: Partial<ProjectScriptHostOptions> = {}): ProjectScriptHostOptions {
  return {
    lifecycleReferences: references,
    executeEffect: (): void => {},
    scene: () => scene,
    currentSceneId: () => scene.id,
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: () => true,
      entitiesNear: () => false,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    ...override,
  }
}

const triggerCommand: RuntimeLeafCommand = {
  kind: 'runEntityTrigger',
  target: { scene: 's001', entity: 'e001' },
}

describe('C85 ProjectScriptRuntimeHost 桥臂', () => {
  test('runEntityTrigger 时机臂:auto 时机直接 fail-loud', async () => {
    const world = makeWorld()
    const host = new ProjectScriptRuntimeHost(world, new FlowRuntimeCoordinator(), hostOptions())
    await expect(
      host.execute(
        triggerCommand,
        { self: undefined, timing: 'auto' },
        new AbortController().signal,
      ),
    ).rejects.toThrow('runEntityTrigger 仅允许 interactive 执行')
  })

  test('runEntityTrigger 桥臂:宿主未提供调用桥时 fail-loud', async () => {
    const world = makeWorld()
    const host = new ProjectScriptRuntimeHost(world, new FlowRuntimeCoordinator(), hostOptions())
    await expect(
      host.execute(
        triggerCommand,
        { self: undefined, timing: 'interactive' },
        new AbortController().signal,
      ),
    ).rejects.toThrow('runEntityTrigger 缺少当前project runtime调用桥')
  })

  test('runEntityTrigger 派发臂:调用桥收到同 target 与 context', async () => {
    const world = makeWorld()
    const seen: string[] = []
    const host = new ProjectScriptRuntimeHost(
      world,
      new FlowRuntimeCoordinator(),
      hostOptions({
        invokeEntityTrigger: async (target) => {
          seen.push(`${target.scene}/${target.entity}`)
        },
      }),
    )
    const context = { self: undefined, timing: 'interactive' } as const
    await host.execute(triggerCommand, context, new AbortController().signal)
    expect(seen).toEqual(['s001/e001'])
  })

  test('lifecycle 拒收臂:lifecycle 命令不得进入基础 host,worldChanged 仍被通知', async () => {
    const world = makeWorld()
    const changes: string[] = []
    const host = new ProjectScriptRuntimeHost(
      world,
      new FlowRuntimeCoordinator(),
      hostOptions({
        worldChanged: (command) => {
          changes.push(command.kind)
        },
      }),
    )
    await host.execute(
      { kind: 'hideEntity', target: { scene: 's001', entity: 'e001' }, ticks: 2 },
      { self: undefined, timing: 'interactive' },
      new AbortController().signal,
    )
    expect(world.entityLifecycles?.s001?.e001).toEqual({
      phase: 'despawned',
      remainingTicks: 2,
    })
    expect(changes).toEqual(['hideEntity'])
  })

  test('守卫臂:已中止 signal 下的 execute 直接 AbortError', async () => {
    const world = makeWorld()
    const host = new ProjectScriptRuntimeHost(world, new FlowRuntimeCoordinator(), hostOptions())
    const controller = new AbortController()
    controller.abort()
    await expect(
      host.execute(triggerCommand, { self: undefined, timing: 'interactive' }, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('C85 ScriptProjectRuntime 装配臂', () => {
  test('摘要臂:非 64 位 hex canonicalContentDigest 构造即拒', () => {
    const world = makeWorld()
    expect(
      () => new ScriptProjectRuntime({ sharedScripts: {} }, world, 'not-a-digest', hostOptions()),
    ).toThrow('ScriptProjectRuntime: canonicalContentDigest 非法')
  })

  test('script 初始化臂:world 缺 script 时构造补空脚本态', () => {
    const world: WorldState = {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
    }
    const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, hostOptions())
    expect(runtime.coordinator).toBeDefined()
    expect(world.script?.flags).toEqual({})
  })

  test('私有脚本臂:物品私有脚本缺定义 fail-loud', async () => {
    const world = makeWorld()
    const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, hostOptions())
    await expect(
      runtime.runItemPrivateScript({}, 'item-1', 'use', {
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('item private script 不存在: item-1/use')
  })

  test('实体臂:runEntityBehavior 对缺席实体 fail-loud,对场景错位安静 false', async () => {
    const world = makeWorld()
    const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, hostOptions())
    await expect(
      runtime.runEntityBehavior(scene, 'ghost-entity', 'trigger', {
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('script entity 不存在: s001/ghost-entity')

    const otherScene: RuntimeSceneDef = { ...scene, id: 's999' }
    await expect(
      runtime.runEntityBehavior(otherScene, 'e001', 'trigger', {
        signal: new AbortController().signal,
      }),
    ).resolves.toBe(false)
  })

  test('场景钩子臂:runSceneHook 对场景错位安静 false', async () => {
    const world = makeWorld()
    const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, hostOptions())
    const otherScene: RuntimeSceneDef = { ...scene, id: 's999' }
    await expect(
      runtime.runSceneHook(otherScene, 'onEnter', { signal: new AbortController().signal }),
    ).resolves.toBe(false)
  })
})

describe('C85 ScriptRunnerCore 流臂', () => {
  const flowOf = (body: readonly RuntimeCommand[], complete = false) =>
    compileRuntimeScriptFlow(
      {
        kind: 'stages',
        initial: 'start',
        stages: [
          { id: 'start', body: [...body], ...(complete ? { next: { kind: 'complete' } } : {}) },
        ],
      },
      { canonicalContentDigest: digest, timing: 'interactive' },
    )

  interface FlowCaseOptions {
    signal: AbortSignal
    cursor?: { kind: 'stage'; stage: string } | { kind: 'completed' }
    cursorController?: { reachSafePoint: () => 'continue' }
    resume?: AutoScriptContinuation
    executable?: ReturnType<typeof flowOf>
    host?: ProjectScriptHostOptions
  }

  async function runFlowCase(options: FlowCaseOptions): Promise<void> {
    const world = makeWorld()
    const host = new ProjectScriptRuntimeHost(
      world,
      new FlowRuntimeCoordinator(),
      options.host ?? hostOptions(),
    )
    const { RuntimeScriptRunner } = await import('./runtime-script-runner.js')
    const executable = options.executable ?? flowOf([])
    await new RuntimeScriptRunner(host, options.signal).runFlow(executable, {
      cursor: options.cursor ?? { kind: 'stage', stage: 'start' },
      cursorController: options.cursorController ?? { reachSafePoint: () => 'continue' },
      ...(options.resume ? { resume: options.resume } : {}),
    })
  }

  test('完成游标臂:未声明 complete 的 flow 使用 completed cursor 即拒', async () => {
    await expect(
      runFlowCase({
        signal: new AbortController().signal,
        cursor: { kind: 'completed' },
        executable: flowOf([]),
      }),
    ).rejects.toThrow('flow 未声明 complete，不能使用 completed cursor')
  })

  test('完成游标臂:声明 complete 的 flow 使用 completed cursor 立即收尾零效果', async () => {
    const effects: string[] = []
    await runFlowCase({
      signal: new AbortController().signal,
      cursor: { kind: 'completed' },
      executable: flowOf([], true),
      host: hostOptions({
        executeEffect: (command) => {
          effects.push(command.kind)
        },
      }),
    })
    expect(effects).toEqual([])
  })

  test('auto 恢复臂:resume 无游标或控制器未开 checkpoint 即拒', async () => {
    await expect(
      runFlowCase({
        signal: new AbortController().signal,
        resume: { digest, frames: [] },
        cursorController: { reachSafePoint: () => 'continue' },
      }),
    ).rejects.toThrow('auto resume: 缺少自动flow执行游标')
  })

  test('游标缺失臂:flow 指针指向不存在的 stage 即拒', async () => {
    await expect(
      runFlowCase({
        signal: new AbortController().signal,
        cursor: { kind: 'stage', stage: 'ghost' },
      }),
    ).rejects.toThrow('stage cursor 不存在 ghost')
  })

  test('gate 停止臂:宿主 gate 返回 stop 时本次运行干净收尾不再执行后续叶', async () => {
    const effects: string[] = []
    await runFlowCase({
      signal: new AbortController().signal,
      executable: flowOf([{ kind: 'giveMoney', delta: 5 }, { kind: 'clearDialog' }]),
      host: hostOptions({
        executeEffect: (command) => {
          effects.push(command.kind)
        },
        gate: async () => 'stop' as const,
      }),
    })
    expect(effects).toEqual([])
  })
})

test('实体无行为臂:实体未声明 trigger 行为时 runEntityBehavior 安静 false', async () => {
  const world = makeWorld()
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, hostOptions())
  await expect(
    runtime.runEntityBehavior(scene, 'e001', 'trigger', {
      signal: new AbortController().signal,
    }),
  ).resolves.toBe(false)
})

test('钩子无变体臂:场景无 onTeleport 钩子时 runSceneHook 安静 false', async () => {
  const world = makeWorld()
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, hostOptions())
  await expect(
    runtime.runSceneHook(scene, 'onTeleport', { signal: new AbortController().signal }),
  ).resolves.toBe(false)
})

test('完成游标复入臂:行为游标已 completed 时不再取得租约', async () => {
  const world = makeWorld()
  const hooked: RuntimeSceneDef = {
    ...scene,
    hooks: {
      onEnter: {
        initial: 'main',
        variants: {
          main: {
            label: 'Main',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 's0',
              stages: [{ id: 's0', body: [], next: { kind: 'complete' } }],
            },
          },
        },
      },
    },
  }
  const scriptState = world.script
  if (!scriptState) throw new Error('world script missing')
  scriptState.behaviors.scenes = {
    s001: { onEnter: { cursor: { hook: 'main', at: { kind: 'completed' } } } },
  }
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, hostOptions())
  await expect(
    runtime.runSceneHook(hooked, 'onEnter', { signal: new AbortController().signal }),
  ).resolves.toBe(false)
})
