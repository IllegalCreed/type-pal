import {
  buildEntityLifecycleReferenceIndexV13,
  emptyWorldScriptStateV5,
  type ManifestV13,
  type SceneDefV13,
  type WorldStateV13,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  compileAuthorCommandsV13,
  compileScriptFlowV13,
  MemorySharedScriptResolverV13,
  type RuntimeLeafCommandV13,
} from './script-compiler-v13.js'
import { compileAuthorCommandsV5 } from './script-compiler-v5.js'
import {
  ProjectScriptRuntimeHostV13,
  ScriptProjectRuntimeV13,
  type ProjectScriptHostOptionsV13,
} from './script-project-v13.js'
import { assembleProjectV13 } from './loader-v13.js'
import { ScriptRunnerV13 } from './script-runner-v13.js'
import { FlowRuntimeCoordinatorV5 } from './script-world-v5.js'

const digest = 'a'.repeat(64)
const target = { scene: 's001', entity: 'e001' } as const
const scene: SceneDefV13 = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [{ id: 'e001', pos: { col: 1, row: 1, height: 0 }, zone: true }],
}
const references = buildEntityLifecycleReferenceIndexV13([scene])

function assembleProjectFixture() {
  const manifest: ManifestV13 = {
    id: 'v13-runtime-fixture',
    name: 'v13 runtime fixture',
    contentVersion: 13,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {
      actors: 'content/actors.json',
      scenes: 'content/scenes/',
      skills: 'content/skills.json',
      items: 'content/items.json',
      locale: 'content/locale.json',
      sprites: 'content/sprites.json',
      battleSprites: 'content/battle-sprites.json',
      tilesets: 'content/tilesets.json',
      maps: 'content/maps/index.json',
      sharedScripts: 'content/shared-scripts.json',
    },
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  }
  return assembleProjectV13(manifest, {
    actors: [],
    sceneIds: ['s001'],
    entryScene: scene,
    skills: { skills: [], levelUp: {} },
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    tilesets: [],
    maps: {
      version: 1,
      maps: [{ id: 'map-001', name: 'fixture map', path: 'content/maps/map-001.json' }],
    },
    assetCatalog: { version: 1, assets: {} },
    sharedScripts: {},
  })
}

function makeWorld(): WorldStateV13 {
  return {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    script: emptyWorldScriptStateV5(),
  }
}

function hostOptions(
  effects: string[] = [],
  changes: string[] = [],
  override: Partial<ProjectScriptHostOptionsV13> = {},
): ProjectScriptHostOptionsV13 {
  return {
    lifecycleReferences: references,
    executeEffect: (command) => {
      effects.push(command.kind)
    },
    worldChanged: (command, _context, commit) => {
      changes.push(
        `${command.kind}:${commit?.resetFrameTarget ? 'reset-frame' : 'committed'}`,
      )
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
  world: WorldStateV13,
  commands: Parameters<typeof compileAuthorCommandsV13>[0],
  options: ProjectScriptHostOptionsV13,
  signal = new AbortController().signal,
  shared?: MemorySharedScriptResolverV13,
): Promise<void> {
  const host = new ProjectScriptRuntimeHostV13(
    world,
    new FlowRuntimeCoordinatorV5(),
    options,
  )
  const executable = compileScriptFlowV13(
    {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [...commands] }],
    },
    { canonicalContentDigest: digest, timing: 'interactive' },
  )
  await new ScriptRunnerV13(host, signal, shared).runFlow(executable, {
    cursor: { kind: 'stage', stage: 'start' },
    cursorController: { reachSafePoint: () => 'continue' },
  })
}

describe('content13 script compiler/runtime host', () => {
  test('preserves lifecycle leaves through branch, loop, and shared-script control flow', async () => {
    const world = makeWorld()
    world.script!.flags.branch = true
    const effects: string[] = []
    const changes: string[] = []
    const shared = new MemorySharedScriptResolverV13(
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
    await expect(
      run(
        afterCommit,
        [
          { kind: 'hideEntity', target, ticks: 2 },
          { kind: 'removeEntity', target },
        ],
        hostOptions(effects, [], {
          executeEffect(command: RuntimeLeafCommandV13) {
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
  })

  test('v5 entry remains closed while v13 rejects legacy vanishEntity', () => {
    expect(() =>
      compileAuthorCommandsV5(
        [{ kind: 'hideEntity', target, ticks: 2 }] as never,
        'interactive',
      ),
    ).toThrow(/未知|hideEntity/)
    expect(() =>
      compileAuthorCommandsV13(
        [{ kind: 'vanishEntity', target, seconds: 1 }] as never,
        'interactive',
      ),
    ).toThrow(/禁止 vanishEntity/)
  })

  test('loaded v13 project can be handed directly to ScriptProjectRuntimeV13', async () => {
    const world = makeWorld()
    const project = assembleProjectFixture()
    const effects: string[] = []
    const runtime = new ScriptProjectRuntimeV13(
      project,
      world,
      digest,
      hostOptions(effects),
    )
    await runtime.runCommands(
      [{ kind: 'hideEntity', target, ticks: 800 }],
      { signal: new AbortController().signal },
    )
    expect(world.entityLifecycles).toEqual({
      s001: { e001: { phase: 'despawned', remainingTicks: 800 } },
    })
    expect(effects).toEqual(['hideEntity'])
  })
})
