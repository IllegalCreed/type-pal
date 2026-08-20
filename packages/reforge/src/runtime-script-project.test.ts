import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeSceneDef,
  type WorldState,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { compileBaseCommands } from './script-compiler-core.js'
import {
  compileRuntimeCommands,
  compileRuntimeScriptFlow,
  RuntimeSharedScriptResolver,
  type RuntimeLeafCommand,
} from './runtime-script-compiler.js'
import {
  type ProjectScriptHostOptions,
  ProjectScriptRuntimeHost,
  ScriptProjectRuntime,
} from './runtime-script-project.js'
import { RuntimeScriptRunner } from './runtime-script-runner.js'
import { FlowRuntimeCoordinator } from './script-world.js'

const digest = 'a'.repeat(64)
const target = { scene: 's001', entity: 'e001' } as const
const scene: RuntimeSceneDef = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [{ id: 'e001', pos: { col: 1, row: 1, height: 0 }, zone: true }],
}
const references = buildEntityLifecycleReferenceIndex([scene])

function assembleProjectFixture() {
  return { sharedScripts: {} }
}

function makeWorld(): WorldState {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    script: emptyWorldScriptState(),
  }
}

function hostOptions(
  effects: string[] = [],
  changes: string[] = [],
  override: Partial<ProjectScriptHostOptions> = {},
): ProjectScriptHostOptions {
  return {
    lifecycleReferences: references,
    executeEffect: (command) => {
      effects.push(command.kind)
    },
    worldChanged: (command, _context, commit) => {
      changes.push(`${command.kind}:${commit?.resetFrameTarget ? 'reset-frame' : 'committed'}`)
    },
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

async function run(
  world: WorldState,
  commands: Parameters<typeof compileRuntimeCommands>[0],
  options: ProjectScriptHostOptions,
  signal = new AbortController().signal,
  shared?: RuntimeSharedScriptResolver,
): Promise<void> {
  const host = new ProjectScriptRuntimeHost(world, new FlowRuntimeCoordinator(), options)
  const executable = compileRuntimeScriptFlow(
    {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [...commands] }],
    },
    { canonicalContentDigest: digest, timing: 'interactive' },
  )
  await new RuntimeScriptRunner(host, signal, shared).runFlow(executable, {
    cursor: { kind: 'stage', stage: 'start' },
    cursorController: { reachSafePoint: () => 'continue' },
  })
}

describe('current script compiler/runtime host', () => {
  test('retained moveEntity forwards the endpoint commit control through the current host', async () => {
    const world = makeWorld()
    const endpoint = { col: 7, row: 9, height: 0 }
    let committedInEffect = false
    await run(
      world,
      [{ kind: 'moveEntity', target, to: endpoint, speed: 'normal' }],
      hostOptions([], [], {
        executeEffect: (command, _context, _signal, control) => {
          if (command.kind !== 'moveEntity') return
          expect(control?.moveEntityEndpointCommitted).toBe(false)
          control?.commitMoveEntityEndpoint()
          committedInEffect = control?.moveEntityEndpointCommitted === true
        },
      }),
    )
    expect(committedInEffect).toBe(true)
    expect(world.script?.entityPos?.[target.scene]?.[target.entity]).toEqual(endpoint)
  })

  test('preserves lifecycle leaves through branch, loop, and shared-script control flow', async () => {
    const world = makeWorld()
    world.script!.flags.branch = true
    const effects: string[] = []
    const changes: string[] = []
    const shared = new RuntimeSharedScriptResolver(
      {
        finish: {
          name: 'finish',
          self: 'none',
          body: [
            { kind: 'restoreEntity', target },
            { kind: 'removeEntity', target },
          ],
        },
      },
      digest,
    )

    await run(
      world,
      [
        { kind: 'suspendEntity', target, ticks: 15 },
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'branch', is: true },
          then: [{ kind: 'hideEntity', target, ticks: 2 }],
        },
        {
          kind: 'loop',
          mode: 'until',
          cond: { kind: 'flag', flag: 'loop-done', is: true },
          body: [
            { kind: 'suspendEntity', target, ticks: 1 },
            { kind: 'setFlag', flag: 'loop-done', value: true },
          ],
          yield: 'worldTick',
          maxIterations: 2,
        },
        { kind: 'callScript', script: 'finish' },
      ],
      hostOptions(effects, changes),
      new AbortController().signal,
      shared,
    )

    expect(world.entityLifecycles).toEqual({ s001: { e001: { phase: 'removed' } } })
    expect(world.script?.flags['loop-done']).toBe(true)
    expect(effects).toEqual([
      'suspendEntity',
      'hideEntity',
      'suspendEntity',
      'setFlag',
      'restoreEntity',
      'removeEntity',
    ])
    expect(changes).toContain('restoreEntity:reset-frame')
  })

  test('rejects unknown targets before mutating any world authority', async () => {
    const world = makeWorld()
    const before = structuredClone(world)
    await expect(
      run(
        world,
        [{ kind: 'removeEntity', target: { scene: 's001', entity: 'missing' } }],
        hostOptions(),
      ),
    ).rejects.toThrow(/未知 entity/)
    expect(world).toEqual(before)
  })

  test('abort before commit writes nothing; abort after commit prevents the next leaf', async () => {
    const beforeCommit = makeWorld()
    const alreadyAborted = new AbortController()
    alreadyAborted.abort()
    await expect(
      run(
        beforeCommit,
        [{ kind: 'hideEntity', target, ticks: 2 }],
        hostOptions(),
        alreadyAborted.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(beforeCommit.entityLifecycles).toBeUndefined()

    const afterCommit = makeWorld()
    const controller = new AbortController()
    const effects: string[] = []
    const changes: string[] = []
    await expect(
      run(
        afterCommit,
        [
          { kind: 'hideEntity', target, ticks: 2 },
          { kind: 'removeEntity', target },
        ],
        hostOptions(effects, changes, {
          executeEffect(command: RuntimeLeafCommand) {
            effects.push(command.kind)
            controller.abort()
          },
        }),
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(afterCommit.entityLifecycles).toEqual({
      s001: { e001: { phase: 'despawned', remainingTicks: 2 } },
    })
    expect(effects).toEqual(['hideEntity'])
    expect(changes).toEqual(['hideEntity:committed'])
  })

  test('base author compiler stays closed while runtime rejects removed vanishEntity', () => {
    expect(() =>
      compileBaseCommands([{ kind: 'hideEntity', target, ticks: 2 }] as never, 'interactive'),
    ).toThrow(/未知|hideEntity/)
    expect(() =>
      compileRuntimeCommands(
        [{ kind: 'vanishEntity', target, seconds: 1 }] as never,
        'interactive',
      ),
    ).toThrow(/禁止 vanishEntity/)
  })

  test('loaded current project can be handed directly to ScriptProjectRuntime', async () => {
    const world = makeWorld()
    const project = assembleProjectFixture()
    const effects: string[] = []
    const runtime = new ScriptProjectRuntime(project, world, digest, hostOptions(effects))
    await runtime.runCommands([{ kind: 'hideEntity', target, ticks: 800 }], {
      signal: new AbortController().signal,
    })
    expect(world.entityLifecycles).toEqual({
      s001: { e001: { phase: 'despawned', remainingTicks: 800 } },
    })
    expect(effects).toEqual(['hideEntity'])
  })
})
