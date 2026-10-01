import type { RuntimeCommand, RuntimeScriptLibrary, WorldState } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { deferred, fixture, stage } from './__tests__/save-lineage-fixture.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'

test('an unfinished auto move is snapshot-ready and resumes without repeating earlier rewards', async () => {
  const moving = deferred(),
    arrived = deferred()
  const f = fixture({
    executeEffect: async (command) => {
      if (command.kind === 'giveMoney') f.world.money += command.delta
      if (command.kind === 'moveEntity') {
        moving.resolve()
        await arrived.promise
      }
    },
  })
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'walk'
  const body: RuntimeCommand[] = [
    { kind: 'giveMoney', delta: 7 },
    {
      kind: 'moveEntity',
      target: { scene: 's', entity: 'e' },
      to: { col: 10, row: 10, height: 0 },
      speed: 'normal',
    },
    { kind: 'giveMoney', delta: 9 },
  ]
  e.behaviors!.auto = { walk: { label: 'Walk', order: 0, flow: stage(body) } }
  const running = f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  await moving.promise
  const snapshot = vi.fn(() => structuredClone(f.world))
  let saved = false
  const saving = f.runtime.withSaveBarrier(snapshot).then((value) => {
    saved = true
    return value
  })
  for (let turn = 0; turn < 30; turn++) await Promise.resolve()
  // Prove readiness without completing the movement or advancing any world timer.
  expect(saved).toBe(true)
  const payload = await saving
  expect(payload.money).toBe(7)
  expect(payload.script?.behaviors.entities?.s?.e?.auto?.cursor?.at).toEqual({
    kind: 'stage',
    stage: 'first',
  })
  const restored = new ScriptProjectRuntime({ sharedScripts: {} }, payload, 'c'.repeat(64), {
    ...f.options,
    executeEffect: (command) => {
      if (command.kind === 'giveMoney') payload.money += command.delta
    },
  })
  await restored.runEntityBehavior(f.scene, 'e', 'auto', { signal: new AbortController().signal })
  expect(payload.money).toBe(16)
  arrived.resolve()
  await running
})

test('an automatic activation suspended before its first command does not block saving', async () => {
  const gated = deferred(),
    release = deferred()
  const effect = vi.fn()
  const f = fixture({
    gate: async () => {
      gated.resolve()
      await release.promise
    },
    executeEffect: effect,
  })
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'idle'
  e.behaviors!.auto = {
    idle: { label: 'Idle', order: 0, flow: stage([{ kind: 'giveMoney', delta: 1 }]) },
  }
  const running = f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  await gated.promise
  const saved = await f.runtime.withSaveBarrier(() => structuredClone(f.world))
  expect(saved.money).toBe(0)
  expect(effect).not.toHaveBeenCalled()
  release.resolve()
  await running
})

test('a save requested between an async gate check and command dispatch cannot begin a new effect', async () => {
  const entered = deferred()
  const effect = vi.fn((command: RuntimeCommand) => {
    if (command.kind === 'giveMoney') f.world.money += command.delta
  })
  const f = fixture({ executeEffect: effect })
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'once'
  e.behaviors!.auto = {
    once: { label: 'Once', order: 0, flow: stage([{ kind: 'giveMoney', delta: 7 }]) },
  }
  const originalGate = f.runtime.coordinator.waitForActivationGate.bind(f.runtime.coordinator)
  let calls = 0
  let barrier: ReturnType<typeof f.runtime.coordinator.requestSaveBarrier> | undefined
  vi.spyOn(f.runtime.coordinator, 'waitForActivationGate').mockImplementation((signal) => {
    const checked = originalGate(signal)
    if (++calls === 2) {
      barrier = f.runtime.coordinator.requestSaveBarrier()
      entered.resolve()
    }
    return checked
  })
  const running = f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  await entered.promise
  await barrier!.ready
  for (let turn = 0; turn < 30; turn++) await Promise.resolve()
  expect(f.world.money).toBe(0)
  expect(effect).not.toHaveBeenCalled()
  expect(f.world.script?.behaviors.entities?.s?.e?.auto?.cursor?.resume?.frames).toEqual([
    { index: 0 },
  ])
  barrier!.release()
  await running
  expect(f.world.money).toBe(7)
})

test('nested chance branch, loop and shared call retain decisions and iteration without money/item replay', async () => {
  const parked = deferred(),
    release = deferred()
  let waits = 0
  const applyRewards = (world: WorldState, command: RuntimeCommand) => {
    if (command.kind === 'giveMoney') world.money += command.delta
    if (command.kind === 'giveItem') {
      const slot = world.inventory.find((item) => item.itemId === command.itemId)
      if (slot) slot.count += command.count ?? 1
      else world.inventory.push({ itemId: command.itemId, count: command.count ?? 1 })
    }
  }
  const f = fixture({
    random: () => 0,
    executeEffect: async (command) => {
      applyRewards(f.world, command)
      if (command.kind === 'wait' && ++waits === 2) {
        parked.resolve()
        await release.promise
      }
    },
  })
  const library: RuntimeScriptLibrary = {
    reward: {
      name: 'Reward',
      self: 'required',
      body: [
        { kind: 'giveMoney', delta: 2 },
        { kind: 'giveItem', itemId: 'gift' },
        { kind: 'wait', ms: 500_000 },
      ],
    },
  }
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'walk'
  e.behaviors!.auto = {
    walk: {
      label: 'Walk',
      order: 0,
      flow: stage([
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 50 },
          then: [
            { kind: 'giveMoney', delta: 100 },
            {
              kind: 'loop',
              mode: 'while',
              cond: { kind: 'var', var: 'iterations', op: '<', value: 3 },
              yield: 'worldTick',
              maxIterations: 10,
              body: [
                { kind: 'giveMoney', delta: 1 },
                { kind: 'addVar', var: 'iterations', delta: 1 },
                { kind: 'callScript', script: 'reward' },
              ],
            },
          ],
          else: [{ kind: 'giveMoney', delta: 999 }],
        },
      ]),
    },
  }
  const runtime = new ScriptProjectRuntime(
    { sharedScripts: library },
    f.world,
    'c'.repeat(64),
    f.options,
  )
  const running = runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  await parked.promise
  const saved = await runtime.withSaveBarrier(() => structuredClone(f.world))
  expect(saved.money).toBe(106)
  expect(saved.inventory).toEqual([{ itemId: 'gift', count: 2 }])
  const resume = saved.script?.behaviors.entities?.s?.e?.auto?.cursor?.resume
  expect(resume?.frames).toEqual([
    { index: 0, control: { kind: 'branch', arm: 'then' } },
    { index: 1, control: { kind: 'loop', iteration: 2, phase: 'body' } },
    { index: 2 },
    { index: 2 },
  ])
  const dormant = structuredClone(saved)
  dormant.script!.behaviors.entities!.s!.e!.auto!.selection = { kind: 'disabled' }
  await runtime.validateAutomaticContinuations(dormant, new AbortController().signal)
  const restored = new ScriptProjectRuntime({ sharedScripts: library }, saved, 'c'.repeat(64), {
    ...f.options,
    random: () => 0.99,
    executeEffect: (command) => applyRewards(saved, command),
  })
  await restored.validateAutomaticContinuations(saved, new AbortController().signal)
  await restored.runEntityBehavior(f.scene, 'e', 'auto', { signal: new AbortController().signal })
  expect(saved.money).toBe(109)
  expect(saved.inventory).toEqual([{ itemId: 'gift', count: 3 }])
  expect(saved.script?.vars.iterations).toBe(3)
  expect(saved.script?.behaviors.entities?.s?.e?.auto?.cursor?.resume).toBeUndefined()
  release.resolve()
  await running
})

test('multiple permanent auto waits are immediately saveable and an aborted save does not stop their live work', async () => {
  const entered = deferred(),
    finish = deferred()
  let waiting = 0
  const f = fixture({
    executeEffect: async (command) => {
      if (command.kind === 'wait') {
        if (++waiting === 2) entered.resolve()
        await finish.promise
      }
    },
  })
  const first = f.scene.entities[0]!
  first.pages![0]!.auto = 'idle'
  first.behaviors!.auto = {
    idle: { label: 'Idle', order: 0, flow: stage([{ kind: 'wait', ms: 500_000 }]) },
  }
  const second = structuredClone(first)
  second.id = 'second'
  f.scene.entities.push(second)
  const controllers = [new AbortController(), new AbortController()]
  const runs = [first, second].map((entity, i) =>
    f.runtime.runEntityBehavior(f.scene, entity.id, 'auto', { signal: controllers[i]!.signal }),
  )
  await entered.promise
  const snapshot = await f.runtime.withSaveBarrier(() => structuredClone(f.world))
  expect(waiting).toBe(2)
  expect(snapshot.script?.behaviors.entities?.s?.e?.auto?.cursor?.resume?.frames).toEqual([
    { index: 0 },
  ])
  expect(snapshot.script?.behaviors.entities?.s?.second?.auto?.cursor?.resume?.frames).toEqual([
    { index: 0 },
  ])
  await expect(
    f.runtime.withSaveBarrier(() => {
      throw new Error('storage refused')
    }),
  ).rejects.toThrow('storage refused')
  expect(f.runtime.coordinator.gateClosed()).toBe(false)
  const rejected = runs.map((run) => expect(run).rejects.toMatchObject({ name: 'AbortError' }))
  for (const controller of controllers) controller.abort()
  finish.resolve()
  await Promise.all(rejected)
})

test('a non-reentrant reward effect is settled before checkpoint capture, not replayed from its commit gap', async () => {
  const entered = deferred(),
    finish = deferred()
  const f = fixture({
    executeEffect: async (command) => {
      if (command.kind === 'giveMoney') {
        f.world.money += command.delta
        entered.resolve()
        await finish.promise
      }
    },
  })
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'reward'
  e.behaviors!.auto = {
    reward: { label: 'Reward', order: 0, flow: stage([{ kind: 'giveMoney', delta: 7 }]) },
  }
  const running = f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  await entered.promise
  const capture = vi.fn(() => structuredClone(f.world))
  const saving = f.runtime.withSaveBarrier(capture)
  for (let i = 0; i < 20; i++) await Promise.resolve()
  expect(capture).not.toHaveBeenCalled()
  finish.resolve()
  const saved = await saving
  expect(saved.money).toBe(7)
  // The settled frame is at the end, or the whole activation has already settled its cursor.
  const frame = saved.script?.behaviors.entities?.s?.e?.auto?.cursor?.resume?.frames[0]
  if (frame) expect(frame.index).toBe(1)
  await running
})

test('a permanently cycling auto state machine snapshots at its tick without finishing the patrol', async () => {
  const entered = deferred(),
    tick = deferred()
  const f = fixture({
    waitWorldTick: async () => {
      entered.resolve()
      await tick.promise
    },
  })
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'patrol'
  e.behaviors!.auto = {
    patrol: {
      label: 'Patrol',
      order: 0,
      flow: {
        kind: 'stateMachine',
        machine: {
          id: 'patrol',
          label: 'Patrol',
          initial: 'walk',
          states: {
            walk: {
              label: 'Walk',
              body: [{ kind: 'addVar', var: 'laps', delta: 1 }],
              next: { kind: 'to', state: 'walk', yield: 'worldTick' },
            },
          },
        },
      },
    },
  }
  const running = f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  await entered.promise
  const snapshot = await f.runtime.withSaveBarrier(() => structuredClone(f.world))
  expect(snapshot.script?.vars.laps).toBe(1)
  expect(snapshot.script?.behaviors.entities?.s?.e?.auto?.cursor?.at).toEqual({
    kind: 'state',
    machine: 'patrol',
    state: 'walk',
  })
  expect(snapshot.script?.behaviors.entities?.s?.e?.auto?.cursor?.at.kind).not.toBe('completed')
  const rejected = expect(running).rejects.toMatchObject({ name: 'AbortError' })
  f.controller.abort()
  tick.resolve()
  await rejected
})

test.each([
  'digest',
  'index',
  'control',
  'child',
  'outcome',
] as const)('restore preflight refuses corrupt %s without executing anything', async (kind) => {
  const entered = deferred(),
    arrive = deferred()
  const effect = vi.fn(async (command: RuntimeCommand) => {
    if (command.kind === 'moveEntity') {
      entered.resolve()
      await arrive.promise
    }
  })
  const f = fixture({ executeEffect: effect })
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'walk'
  e.behaviors!.auto = {
    walk: {
      label: 'Walk',
      order: 0,
      flow: stage([
        {
          kind: 'moveEntity',
          target: { scene: 's', entity: 'e' },
          to: { col: 10, row: 10, height: 0 },
          speed: 'normal',
        },
      ]),
    },
  }
  const running = f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  await entered.promise
  const snapshot = await f.runtime.withSaveBarrier(() => structuredClone(f.world))
  const resume = snapshot.script!.behaviors.entities!.s!.e!.auto!.cursor!.resume!
  if (kind === 'digest') resume.digest = 'a'.repeat(64)
  if (kind === 'index') resume.frames[0]!.index = 2
  if (kind === 'control') resume.frames[0]!.control = { kind: 'branch', arm: 'then' }
  if (kind === 'child') resume.frames.push({ index: 0 })
  if (kind === 'outcome') resume.outcomes.missing = { command: 'confirm', no: false }
  const before = structuredClone(f.world)
  await expect(
    f.runtime.validateAutomaticContinuations(snapshot, new AbortController().signal),
  ).rejects.toThrow(/auto resume/)
  expect(f.world).toEqual(before)
  expect(effect).toHaveBeenCalledTimes(1)
  arrive.resolve()
  await running
})

test('normal stopScript returns do not turn a later activation into a saved continuation', async () => {
  const f = fixture()
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'once-per-activation'
  e.behaviors!.auto = {
    'once-per-activation': {
      label: 'Once',
      order: 0,
      flow: stage([
        { kind: 'addVar', var: 'activations', delta: 1 },
        { kind: 'stopScript' },
        { kind: 'setFlag', flag: 'tail', value: true },
      ]),
    },
  }
  for (let i = 0; i < 2; i++)
    await f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  expect(f.world.script?.vars.activations).toBe(2)
  expect(f.world.script?.flags.tail).toBeUndefined()
  expect(f.world.script?.behaviors.entities?.s?.e?.auto?.cursor?.resume).toBeUndefined()
})

test('restore preflight rejects excessive shared depth and a mismatched scene before effects', async () => {
  const f = fixture()
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'walk'
  e.behaviors!.auto = {
    walk: { label: 'Walk', order: 0, flow: stage([{ kind: 'callScript', script: 'recursive' }]) },
  }
  const snapshot = structuredClone(f.world)
  snapshot.script!.behaviors.entities = {
    s: {
      e: {
        auto: {
          cursor: {
            behavior: 'walk',
            at: { kind: 'stage', stage: 'first' },
            resume: {
              digest: 'c'.repeat(64),
              frames: Array.from({ length: 130 }, () => ({ index: 0 })),
              outcomes: {},
            },
          },
        },
      },
    },
  }
  const runtime = new ScriptProjectRuntime(
    {
      sharedScripts: {
        recursive: {
          name: 'Recursive',
          self: 'none',
          body: [{ kind: 'callScript', script: 'recursive' }],
        },
      },
    },
    f.world,
    'c'.repeat(64),
    f.options,
  )
  await expect(runtime.validateAutomaticContinuations(snapshot, f.signal)).rejects.toThrow(
    '调用深度越界',
  )
  snapshot.script!.behaviors.entities!.wrong = snapshot.script!.behaviors.entities!.s!
  delete snapshot.script!.behaviors.entities!.s
  await expect(runtime.validateAutomaticContinuations(snapshot, f.signal)).rejects.toThrow(
    'scene地址不匹配',
  )
  expect(f.world.money).toBe(0)
})

test('an already selected random state transition is committed before snapshot readiness', async () => {
  const selecting = deferred(),
    commit = deferred(),
    walking = deferred(),
    arrived = deferred()
  const f = fixture({
    random: () => 0,
    gate: async (_signal, boundary) => {
      if (boundary?.kind === 'settlement') {
        selecting.resolve()
        await commit.promise
      }
    },
    executeEffect: async (command) => {
      if (command.kind === 'wait') {
        walking.resolve()
        await arrived.promise
      }
    },
  })
  const e = f.scene.entities[0]!
  e.pages![0]!.auto = 'choose'
  e.behaviors!.auto = {
    choose: {
      label: 'Choose',
      order: 0,
      flow: {
        kind: 'stateMachine',
        machine: {
          id: 'route',
          label: 'Route',
          initial: 'choose',
          states: {
            choose: {
              label: 'Choose',
              body: [],
              next: {
                kind: 'branch',
                cond: { kind: 'chance', percent: 50 },
                then: { kind: 'to', state: 'left', yield: 'worldTick' },
                else: { kind: 'to', state: 'right', yield: 'worldTick' },
              },
            },
            left: {
              label: 'Left',
              body: [
                { kind: 'wait', ms: 500_000 },
                { kind: 'giveMoney', delta: 1 },
              ],
              next: { kind: 'complete' },
            },
            right: {
              label: 'Right',
              body: [{ kind: 'giveMoney', delta: 999 }],
              next: { kind: 'complete' },
            },
          },
        },
      },
    },
  }
  const running = f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  await selecting.promise
  const snapshot = vi.fn(() => structuredClone(f.world))
  const saving = f.runtime.withSaveBarrier(snapshot)
  for (let turn = 0; turn < 30; turn++) await Promise.resolve()
  expect(snapshot).not.toHaveBeenCalled()
  commit.resolve()
  const saved = await saving
  expect(saved.script?.behaviors.entities?.s?.e?.auto?.cursor?.at).toEqual({
    kind: 'state',
    machine: 'route',
    state: 'left',
  })
  const restored = new ScriptProjectRuntime({ sharedScripts: {} }, saved, 'c'.repeat(64), {
    ...f.options,
    gate: () => {},
    random: () => 0.99,
    executeEffect: (command) => {
      if (command.kind === 'giveMoney') saved.money += command.delta
    },
  })
  await restored.runEntityBehavior(f.scene, 'e', 'auto', { signal: new AbortController().signal })
  expect(saved.money).toBe(1)
  await walking.promise
  arrived.resolve()
  await running
})
