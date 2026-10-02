import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  type RuntimeSceneDef,
  type WorldState,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { RuntimeSharedScriptResolver } from './runtime-script-compiler.js'
import {
  type ProjectScriptHostOptions,
  ProjectScriptRuntimeHost,
  ScriptProjectRuntime,
} from './runtime-script-project.js'
import { BaseProjectScriptRuntimeHost } from './script-project-core.js'

const digest = 'd'.repeat(64)
const target = { scene: 'room', entity: 'b' }
function definition(id: string, body: RuntimeCommand[] = []) {
  return {
    id,
    zone: true as const,
    pos: { col: 2, row: 2, height: 0 },
    pages: [{ id: 'normal', label: 'normal', trigger: 'talk' }],
    initialPage: 'normal',
    behaviors: {
      trigger: {
        talk: {
          label: 'talk',
          order: 0,
          flow: {
            kind: 'stages' as const,
            initial: 'first',
            stages: [{ id: 'first', body, next: { kind: 'complete' as const } }],
          },
        },
      },
    },
  }
}
function fixture(
  commands: RuntimeCommand[] = [{ kind: 'setFlag', flag: 'child', value: true }],
  overrides: Partial<ProjectScriptHostOptions> = {},
) {
  const scene: RuntimeSceneDef = {
    id: 'room',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [definition('a'), definition('b', commands)],
  }
  const world: WorldState = {
    party: [],
    inventory: [],
    learnedSkills: {},
    money: 0,
    script: emptyWorldScriptState(),
  }
  const effects: Array<{
    kind: string
    self?: { scene: string; entity: string }
    signal: AbortSignal
  }> = []
  const host: ProjectScriptHostOptions = {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    currentSceneId: () => scene.id,
    currentSceneSessionId: () => 'room:session-1',
    scene: () => scene,
    executeEffect: (command, context, signal) => {
      effects.push({ kind: command.kind, self: context.self, signal })
    },
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => world.money,
      inParty: () => false,
      entityInScene: () => true,
      facingEntity: () => true,
    },
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
    ...overrides,
  }
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, digest, host)
  return { scene, world, runtime, effects }
}
const parentTail: RuntimeCommand = { kind: 'setFlag', flag: 'parent-tail', value: true }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}
async function settle() {
  for (let index = 0; index < 40; index++) await Promise.resolve()
}

test('entity call awaits a distinct current owner, inherits exact signal, and restores parent self', async () => {
  const { runtime, world, effects } = fixture()
  const signal = new AbortController().signal
  await runtime.runCommands([{ kind: 'runEntityTrigger', target }, parentTail], {
    signal,
    self: { scene: 'room', entity: 'a' },
  })
  expect(world.script!.flags).toEqual({ child: true, 'parent-tail': true })
  expect(
    effects.map(({ self, signal: received }) => ({ self, sameSignal: received === signal })),
  ).toEqual([
    { self: target, sameSignal: true },
    { self: { scene: 'room', entity: 'a' }, sameSignal: true },
  ])
  expect(world.script!.behaviors.entities?.room?.b?.trigger?.cursor?.at).toEqual({
    kind: 'completed',
  })
  await runtime.runCommands([{ kind: 'runEntityTrigger', target }], { signal })
  expect(effects).toHaveLength(2)
})

test('busy and A-to-B-to-A reject explicitly without completing caller tails, then release both owners', async () => {
  const { runtime, scene, world } = fixture([
    { kind: 'runEntityTrigger', target: { scene: 'room', entity: 'a' } },
    parentTail,
  ])
  scene.entities[0]!.behaviors!.trigger!.talk!.flow = {
    kind: 'stages',
    initial: 'first',
    stages: [
      {
        id: 'first',
        body: [
          { kind: 'runEntityTrigger', target },
          { kind: 'setFlag', flag: 'a-tail', value: true },
        ],
      },
    ],
  }
  await expect(
    runtime.runEntityBehavior(scene, 'a', 'trigger', { signal: new AbortController().signal }),
  ).rejects.toThrow(/busy|重入/)
  expect(world.script!.flags).toEqual({})
  expect(
    runtime.coordinator.isOwnerActive({ kind: 'entity-behavior', target, channel: 'trigger' }),
  ).toBe(false)
  expect(
    runtime.coordinator.isOwnerActive({
      kind: 'entity-behavior',
      target: { scene: 'room', entity: 'a' },
      channel: 'trigger',
    }),
  ).toBe(false)
})

test('disabled and unbound targets are no-op, but missing and foreign-scene calls fail before parent tails', async () => {
  const { runtime, scene, world } = fixture()
  delete scene.entities[1]!.pages![0]!.trigger
  await runtime.runCommands([{ kind: 'runEntityTrigger', target }, parentTail], {
    signal: new AbortController().signal,
  })
  expect(world.script!.flags).toEqual({ 'parent-tail': true })
  for (const wrong of [
    { scene: 'room', entity: 'missing' },
    { scene: 'other', entity: 'b' },
  ]) {
    await expect(
      runtime.runCommands(
        [
          { kind: 'runEntityTrigger', target: wrong },
          { kind: 'setFlag', flag: 'bad-tail', value: true },
        ],
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow(/不存在|场景/)
  }
  expect(world.script!.flags['bad-tail']).toBeUndefined()
  scene.entities[1]!.pages![0]!.trigger = 'talk'
  await runtime.runCommands(
    [
      { kind: 'selectEntityBehavior', target, channel: 'trigger', selection: { kind: 'disabled' } },
      { kind: 'runEntityTrigger', target },
    ],
    { signal: new AbortController().signal },
  )
  expect(world.script!.flags.child).toBeUndefined()
})

test('explicit calls use the selected scheme and advance its existing cursor without resetting', async () => {
  const f = fixture()
  f.scene.entities[1]!.behaviors!.trigger!.selected = {
    label: 'selected',
    order: 1,
    flow: {
      kind: 'stages',
      initial: 'first',
      stages: [
        { id: 'first', body: [{ kind: 'setFlag', flag: 'first', value: true }], next: 'repeat' },
        { id: 'repeat', body: [{ kind: 'setFlag', flag: 'repeat', value: true }] },
      ],
    },
  }
  const signal = new AbortController().signal
  await f.runtime.runCommands(
    [
      {
        kind: 'selectEntityBehavior',
        target,
        channel: 'trigger',
        selection: { kind: 'use', value: 'selected' },
      },
      { kind: 'runEntityTrigger', target },
    ],
    { signal },
  )
  expect(f.world.script!.flags).toEqual({ first: true })
  expect(f.world.script!.behaviors.entities!.room!.b!.trigger!.cursor!.at).toEqual({
    kind: 'stage',
    stage: 'repeat',
  })
  await f.runtime.runCommands([{ kind: 'runEntityTrigger', target }], { signal })
  expect(f.world.script!.flags).toEqual({ first: true, repeat: true })
  expect(f.effects.map((effect) => effect.kind)).toEqual([
    'selectEntityBehavior',
    'setFlag',
    'setFlag',
  ])
})

test.each([
  'hidden',
  'suspended',
  'despawned',
  'awaitingExit',
] as const)('explicit invocation permits temporary %s lifecycle', async (phase) => {
  const f = fixture()
  if (phase === 'hidden') f.scene.entities[1]!.hidden = true
  else
    f.world.entityLifecycles = {
      room: { b: phase === 'awaitingExit' ? { phase } : { phase, remainingTicks: 5 } },
    }
  await f.runtime.runCommands([{ kind: 'runEntityTrigger', target }], {
    signal: new AbortController().signal,
  })
  expect(f.world.script!.flags.child).toBe(true)
})

test('permanent removal fails before the child and caller tail', async () => {
  const f = fixture()
  f.world.entityLifecycles = { room: { b: { phase: 'removed' } } }
  await expect(
    f.runtime.runCommands([{ kind: 'runEntityTrigger', target }, parentTail], {
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow(/removed/)
  expect(f.world.script!.flags).toEqual({})
})

test('an independently busy target rejects immediately instead of silently skipping it', async () => {
  const held = deferred<void>()
  const f = fixture([{ kind: 'wait', ms: 10 }], {
    executeEffect: async () => {
      await held.promise
    },
  })
  const active = f.runtime.runEntityBehavior(f.scene, 'b', 'trigger', {
    signal: new AbortController().signal,
  })
  await settle()
  await expect(
    f.runtime.runCommands([{ kind: 'runEntityTrigger', target }, parentTail], {
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow(/busy/)
  expect(f.world.script!.flags).toEqual({})
  held.resolve()
  await active
  expect(f.runtime.isEntityTriggerActive(target)).toBe(false)
})

test('a direct host without the current factory bridge fails loudly', async () => {
  const f = fixture()
  const options: ProjectScriptHostOptions = {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([f.scene]),
    currentSceneId: () => 'room',
    scene: () => f.scene,
    executeEffect: () => {
      throw new Error('must not fall through')
    },
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: () => true,
      facingEntity: () => true,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  }
  const context = { self: target, timing: 'interactive' as const }
  const signal = new AbortController().signal
  await expect(
    new ProjectScriptRuntimeHost(f.world, f.runtime.coordinator, options).execute(
      { kind: 'runEntityTrigger', target },
      context,
      signal,
    ),
  ).rejects.toThrow(/缺少.*调用桥/)
  await expect(
    new BaseProjectScriptRuntimeHost(f.world.script!, f.runtime.coordinator, {
      ...options,
      executeEffect: () => {
        throw new Error('base effect must not run')
      },
      worldChanged: undefined,
      scene: () => {
        throw new Error('base scene must not be queried')
      },
    }).execute({ kind: 'runEntityTrigger', target }, context, signal),
  ).rejects.toThrow(/基础 host/)
  await expect(
    f.runtime.host.execute(
      { kind: 'runEntityTrigger', target },
      { ...context, timing: 'auto' },
      signal,
    ),
  ).rejects.toThrow(/interactive/)
})

test('automatic shared callers cannot obtain an interactive entity owner', () => {
  const resolver = new RuntimeSharedScriptResolver(
    { relay: { name: 'relay', self: 'none', body: [{ kind: 'runEntityTrigger', target }] } },
    digest,
  )
  expect(() => resolver.resolve('relay', 'auto')).toThrow(/runEntityTrigger.*interactive/)
  expect(() => resolver.resolve('relay', 'interactive')).not.toThrow()
})

test('canonical prepare cannot enter an NPC indirectly through a shared nested call', async () => {
  const f = fixture(undefined, { revealSceneEntry: async () => {} })
  f.runtime.project.sharedScripts.relay = {
    name: 'relay',
    self: 'none',
    body: [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'x', is: false },
        then: [{ kind: 'runEntityTrigger', target }],
      },
    ],
  }
  await expect(
    f.runtime.runPreviewFlow(
      {
        kind: 'stages',
        initial: 'first',
        stages: [
          {
            id: 'first',
            entry: {
              prepare: [{ kind: 'callScript', script: 'relay' }],
              reveal: { kind: 'cut' },
            },
            body: [parentTail],
          },
        ],
      },
      { signal: new AbortController().signal, allowSceneEntry: true, runSceneEntry: true },
    ),
  ).rejects.toThrow(/prepare.*runEntityTrigger/)
  expect(f.world.script!.flags).toEqual({})
  expect(f.effects).toEqual([])
})

test.each([
  { kind: 'loadScene', scene: 'other' },
  { kind: 'loadLastSave' },
  { kind: 'quitToTitle' },
  { kind: 'gameOver' },
  { kind: 'teleportOut' },
  { kind: 'startBattle', enemyTeamId: 'team' },
] satisfies RuntimeCommand[])('child direct/shared $kind is rejected before effects and root usage remains allowed', async (command) => {
  const f = fixture([command, parentTail])
  const signal = new AbortController().signal
  await expect(
    f.runtime.runCommands([{ kind: 'runEntityTrigger', target }], { signal }),
  ).rejects.toThrow(/当前场景演出禁止/)
  expect(f.effects).toEqual([])
  expect(f.world.script!.flags).toEqual({})
  f.runtime.project.sharedScripts.shared = { name: 'shared', self: 'none', body: [command] }
  f.scene.entities[1]!.behaviors!.trigger!.talk!.flow = {
    kind: 'stages',
    initial: 'first',
    stages: [{ id: 'first', body: [{ kind: 'callScript', script: 'shared' }, parentTail] }],
  }
  await expect(
    f.runtime.runCommands([{ kind: 'runEntityTrigger', target }], {
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow(/当前场景演出禁止/)
  expect(f.effects).toEqual([])
  expect(f.world.script!.flags).toEqual({})
  // Scope cleanup is observable through the same runtime's ordinary root dispatcher.
  await f.runtime.runCommands([command], { signal })
})

test('stop is local to child, while abort propagates and prevents its parent tail', async () => {
  const stopped = fixture([{ kind: 'stopScript' }, { kind: 'setFlag', flag: 'bad', value: true }])
  await stopped.runtime.runCommands([{ kind: 'runEntityTrigger', target }, parentTail], {
    signal: new AbortController().signal,
  })
  expect(stopped.world.script!.flags).toEqual({ 'parent-tail': true })
  const ac = new AbortController(),
    gate = deferred<void>()
  const canceled = fixture(
    [
      { kind: 'wait', ms: 10 },
      { kind: 'setFlag', flag: 'late', value: true },
    ],
    {
      executeEffect: async (command, _context, signal) => {
        if (command.kind === 'wait') {
          await gate.promise
          signal.throwIfAborted()
        }
      },
    },
  )
  const execution = canceled.runtime.runCommands(
    [{ kind: 'runEntityTrigger', target }, parentTail],
    { signal: ac.signal },
  )
  await settle()
  ac.abort()
  gate.resolve()
  await expect(execution).rejects.toHaveProperty('name', 'AbortError')
  expect(canceled.world.script!.flags).toEqual({})
  expect(canceled.runtime.isEntityTriggerActive(target)).toBe(false)
})

test.each([
  [{ kind: 'setFlag', flag: 'child', value: true }],
  [
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'x', is: false },
      then: [{ kind: 'setFlag', flag: 'child', value: true }],
    },
  ],
] satisfies RuntimeCommand[][])('same-id session replacement during a deferred child gate rejects both control and leaf final dispatch', async (...body) => {
  let session = 1,
    entered = false
  const gate = deferred<void>()
  const g = fixture(body, {
    currentSceneSessionId: () => session,
    // Only the child's gate is deferred, after its invocation captured session 1.
    gate: async () => {
      if (!entered && g.runtime.isEntityTriggerActive(target)) {
        entered = true
        await gate.promise
      }
    },
  })
  const execution = g.runtime.runCommands([{ kind: 'runEntityTrigger', target }, parentTail], {
    signal: new AbortController().signal,
  })
  await settle()
  expect(entered).toBe(true)
  session = 2
  gate.resolve()
  await expect(execution).rejects.toHaveProperty('name', 'AbortError')
  expect(g.world.script!.flags).toEqual({})
  expect(g.effects).toEqual([])
  expect(g.runtime.isEntityTriggerActive(target)).toBe(false)
})

test('external session replacement during the last awaited child effect prevents the parent tail', async () => {
  let session = 1
  const held = deferred<void>(),
    signal = new AbortController().signal
  const f = fixture([{ kind: 'wait', ms: 10 }], {
    currentSceneSessionId: () => session,
    executeEffect: async () => {
      await held.promise
    },
  })
  const execution = f.runtime.runCommands([{ kind: 'runEntityTrigger', target }, parentTail], {
    signal,
  })
  await settle()
  expect(f.runtime.isEntityTriggerActive(target)).toBe(true)
  session = 2
  held.resolve()
  await expect(execution).rejects.toHaveProperty('name', 'AbortError')
  expect(signal.aborted).toBe(false)
  expect(f.world.script!.flags).toEqual({})
  expect(f.runtime.isEntityTriggerActive(target)).toBe(false)
})

test('a save gate closed on the parent admits its exact-lineage child and awaits the complete chain', async () => {
  const held = deferred<void>()
  const f = fixture(undefined, {
    executeEffect: async (command) => {
      if (command.kind === 'wait') await held.promise
    },
  })
  const execution = f.runtime.runCommands(
    [{ kind: 'wait', ms: 1 }, { kind: 'runEntityTrigger', target }, parentTail],
    { signal: new AbortController().signal },
  )
  await settle()
  let captured = false
  const save = f.runtime.withSaveBarrier(() => {
    captured = true
    return structuredClone(f.world)
  })
  await settle()
  expect(captured).toBe(false)
  held.resolve()
  await execution
  expect((await save).script!.flags).toEqual({ child: true, 'parent-tail': true })
})

test('an implicit new entity runner inherits the same explicit-call scope', async () => {
  let runtime!: ScriptProjectRuntime
  const f = fixture(
    [{ kind: 'callScript', script: 'chase', self: { scene: 'room', entity: 'a' } }],
    {
      executeEffect: async (command, context, signal) => {
        if (command.kind === 'chasePlayer')
          await runtime.runEntityBehavior(f.scene, context.self!.entity, 'trigger', { signal })
        if (command.kind === 'loadScene') throw new Error('load effect must not run')
      },
    },
  )
  runtime = f.runtime
  f.runtime.project.sharedScripts.chase = {
    name: 'chase',
    self: 'required',
    body: [{ kind: 'chasePlayer' }],
  }
  f.scene.entities[0]!.behaviors!.trigger!.talk!.flow = {
    kind: 'stages',
    initial: 'first',
    stages: [{ id: 'first', body: [{ kind: 'loadScene', scene: 'other' }] }],
  }
  await expect(
    runtime.runCommands([{ kind: 'runEntityTrigger', target }, parentTail], {
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow(/当前场景演出禁止 loadScene/)
  expect(f.world.script!.flags).toEqual({})
  expect(runtime.isEntityTriggerActive(target)).toBe(false)
})
