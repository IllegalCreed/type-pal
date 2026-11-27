import {
  buildEntityLifecycleReferenceIndex,
  checkBaseAuthorCommands,
  checkRuntimeCommands,
  emptyWorldScriptState,
  type RuntimeCommand,
  type RuntimeSceneDef,
  type WorldState,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { shellProject, shellScene } from './__tests__/runtime-shell/project.js'
import { flag, fixture as saveLineageFixture, stage } from './__tests__/save-lineage-fixture.js'
import { expectDefined } from './defined.js'
import {
  compileRuntimeScriptFlow,
  type RuntimeLeafCommand,
  RuntimeSharedScriptResolver,
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

async function run(
  world: WorldState,
  commands: readonly RuntimeCommand[],
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
  test.each([
    'behavior',
    'hook',
  ] as const)('a missing authored %s cannot replace the selected flow or dirty the world', async (kind) => {
    const { runtime, world, scene, signal } = saveLineageFixture()
    const original = structuredClone(world.script)
    const command: RuntimeCommand =
      kind === 'behavior'
        ? {
            kind: 'selectEntityBehavior',
            target: { scene: scene.id, entity: 'e' },
            channel: 'trigger',
            selection: { kind: 'use', value: 'constructor' },
          }
        : {
            kind: 'selectSceneHooks',
            scene: scene.id,
            selection: { onTeleport: { kind: 'use', value: 'constructor' } },
          }
    await expect(runtime.runCommands([command], { signal })).rejects.toThrow(
      `${kind} 不存在 constructor`,
    )
    expect(world.script).toStrictEqual(original)
  })

  test('runs actual authored entity and scene flows with the name constructor', async () => {
    const { runtime, world, scene, signal } = saveLineageFixture()
    const trigger = scene.entities[0]?.behaviors?.trigger
    const hooks = scene.hooks?.onTeleport
    if (!trigger || !hooks) throw new Error('fixture requires an authored trigger and hook')
    const flowName: string = 'constructor'
    trigger[flowName] = { label: 'Gate guard', order: 1, flow: stage([flag('greeted')]) }
    hooks.variants[flowName] = { label: 'Exit', order: 1, flow: stage([flag('left')]) }
    const selection = { kind: 'use', value: flowName } as const
    await runtime.runCommands(
      [
        {
          kind: 'selectEntityBehavior',
          target: { scene: scene.id, entity: 'e' },
          channel: 'trigger',
          selection,
        },
        { kind: 'selectSceneHooks', scene: scene.id, selection: { onTeleport: selection } },
      ],
      { signal },
    )
    await runtime.runEntityBehavior(scene, 'e', 'trigger', { signal })
    await runtime.runSceneHook(scene, 'onTeleport', { signal })
    expect(world.script?.flags).toStrictEqual({ greeted: true, left: true })
  })

  test('registered scene and entity names store their own selected behavior', async () => {
    const { runtime, world, scene, signal } = saveLineageFixture()
    scene.id = 'constructor'
    const entity = expectDefined(scene.entities[0])
    entity.id = 'constructor'
    const script = expectDefined(world.script)
    script.behaviors.entities = {}
    await runtime.runCommands(
      [
        {
          kind: 'selectEntityBehavior',
          target: { scene: scene.id, entity: entity.id },
          channel: 'trigger',
          selection: { kind: 'disabled' },
        },
      ],
      { signal },
    )
    const rows = Object.entries(script.behaviors.entities).map(([id, records]) => [
      id,
      Object.entries(records),
    ])
    expect(rows).toStrictEqual([
      [scene.id, [[entity.id, { trigger: { selection: { kind: 'disabled' } } }]]],
    ])
    expect(await runtime.runEntityBehavior(scene, entity.id, 'trigger', { signal })).toBe(false)
  })

  test('a registered scene name stores the disabled hook using its own key', async () => {
    const { runtime, world, scene, signal } = saveLineageFixture()
    scene.id = 'constructor'
    const script = expectDefined(world.script)
    script.behaviors.scenes = {}
    await runtime.runCommands(
      [
        {
          kind: 'selectSceneHooks',
          scene: scene.id,
          selection: { onTeleport: { kind: 'disabled' } },
        },
      ],
      { signal },
    )
    expect(Object.entries(script.behaviors.scenes)).toStrictEqual([
      [scene.id, { onTeleport: { selection: { kind: 'disabled' } } }],
    ])
    expect(await runtime.runSceneHook(scene, 'onTeleport', { signal })).toBe(false)
  })

  test('a flag starts false and later reads its authored value', async () => {
    const { runtime, world, signal } = saveLineageFixture()
    await runtime.runCommands(
      [
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'constructor', is: false },
          then: [flag('initiallyClear')],
        },
        flag('constructor'),
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'constructor', is: true },
          then: [flag('setByScript')],
        },
      ],
      { signal },
    )
    expect(Object.entries(expectDefined(world.script).flags)).toStrictEqual([
      ['initiallyClear', true],
      ['constructor', true],
      ['setByScript', true],
    ])
  })

  test('a variable starts at zero and adds to the value it owns', async () => {
    const { runtime, world, signal } = saveLineageFixture()
    await runtime.runCommands(
      [
        {
          kind: 'branch',
          cond: { kind: 'var', var: 'constructor', op: '==', value: 0 },
          then: [flag('initiallyZero')],
        },
        { kind: 'addVar', var: 'constructor', delta: 4 },
        { kind: 'addVar', var: 'constructor', delta: -1 },
        {
          kind: 'branch',
          cond: { kind: 'var', var: 'constructor', op: '==', value: 3 },
          then: [flag('increased')],
        },
      ],
      { signal },
    )
    const script = expectDefined(world.script)
    expect(Object.entries(script.vars)).toStrictEqual([['constructor', 3]])
    expect(script.flags).toStrictEqual({ initiallyZero: true, increased: true })
  })

  test('a script battle has a presentation owner while a direct launch only acquires a save lease', async () => {
    const world = makeWorld()
    const launches: (string | undefined)[] = []
    const runtime = new ScriptProjectRuntime(
      assembleProjectFixture(),
      world,
      digest,
      hostOptions([], [], {
        startBattle: async (_request, _signal, source) => {
          launches.push(source)
          return 'defeat'
        },
      }),
    )
    const signal = new AbortController().signal
    expect(await runtime.host.startBattle({ enemyTeamId: 'encounter' }, signal)).toBe('defeat')
    await runtime.runCommands(
      [
        {
          kind: 'startBattle',
          enemyTeamId: 'encounter',
          onLose: [{ kind: 'setFlag', flag: 'retreated', value: true }],
        },
      ],
      { signal },
    )
    expect(await runtime.host.startBattle({ enemyTeamId: 'encounter' }, signal)).toBe('defeat')
    expect(launches).toEqual([undefined, 'script', undefined])
    expect(world.script?.flags.retreated).toBe(true)
  })

  test('retains actor condition leaves through the current compiler and host', async () => {
    const effects: string[] = []
    const changes: string[] = []
    await run(
      makeWorld(),
      [
        {
          kind: 'applyActorCondition',
          actor: 'li-xiaoyao',
          condition: { kind: 'status', status: 'protect', turns: 7 },
        },
        {
          kind: 'clearActorCondition',
          actor: 'li-xiaoyao',
          condition: { kind: 'poisonResistance' },
        },
      ],
      hostOptions(effects, changes),
    )

    expect(effects).toEqual(['applyActorCondition', 'clearActorCondition'])
    expect(changes).toEqual(['applyActorCondition:committed', 'clearActorCondition:committed'])
  })

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
          if (control?.kind !== 'moveEntity') throw new Error('missing move control')
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
      checkBaseAuthorCommands([{ kind: 'hideEntity', target, ticks: 2 }], 'commands', {
        rootScope: 'script',
      }),
    ).toThrow(/未知|hideEntity/)
    expect(() =>
      checkRuntimeCommands([{ kind: 'vanishEntity', target, seconds: 1 }], 'commands', {
        rootScope: 'script',
      }),
    ).toThrow(/禁止 vanishEntity/)
  })

  test('loaded current project can be handed directly to ScriptProjectRuntime', async () => {
    const world = makeWorld()
    const first = shellScene(scene.id)
    first.mapId = 'map-a'
    first.entities = [{ id: target.entity, pos: { col: 1, row: 1, height: 0 }, zone: true }]
    const { project } = await shellProject({ first })
    const effects: string[] = []
    const runtime = new ScriptProjectRuntime(
      project,
      world,
      digest,
      hostOptions(effects, [], {
        scene: () => project.entryScene,
        currentSceneId: () => project.entryScene.id,
        lifecycleReferences: buildEntityLifecycleReferenceIndex([project.entryScene]),
      }),
    )
    await runtime.runCommands([{ kind: 'hideEntity', target, ticks: 800 }], {
      signal: new AbortController().signal,
    })
    expect(world.entityLifecycles).toEqual({
      s001: { e001: { phase: 'despawned', remainingTicks: 800 } },
    })
    expect(effects).toEqual(['hideEntity'])
  })
})
