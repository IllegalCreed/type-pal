import type { BaseSceneDef, WorldScriptState } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  confirm,
  deferred,
  fixture,
  flag,
  machine,
  stage,
} from './__tests__/save-lineage-fixture.js'
import { BaseScriptProjectRuntime } from './script-project-core.js'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SAVE-BARRIER-LINEAGE-1 current runtime', () => {
  test.each([
    'battle',
    'exit',
  ] as const)('confirm → save → %s → tail completes before the snapshot', async (kind) => {
    vi.useFakeTimers()
    const entered = deferred(),
      answer = deferred<boolean>()
    const f = fixture({
      confirm: async () => {
        entered.resolve()
        return answer.promise
      },
    })
    const running = f.runtime.runCommands(
      [
        confirm,
        kind === 'battle' ? { kind: 'startBattle', enemyTeamId: 'team' } : { kind: 'teleportOut' },
        flag('parentEnd'),
      ],
      { signal: f.signal },
    )
    await entered.promise
    const snapshot = vi.fn(() => structuredClone(f.world.script))
    const saving = f.runtime.withSaveBarrier(snapshot).then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    expect(snapshot).not.toHaveBeenCalled()
    answer.resolve(true)
    await vi.advanceTimersByTimeAsync(10_000)
    await running
    expect(await saving).toEqual({ value: f.world.script })
    expect(snapshot).toHaveBeenCalledTimes(1)
    expect(f.world.script?.flags).toEqual(
      kind === 'battle' ? { parentEnd: true } : { first: true, childEnd: true, parentEnd: true },
    )
    expect(f.runtime.coordinator.gateClosed()).toBe(false)
  })

  test('the same independent root stops at its checkpoint, then resumes after release', async () => {
    const entered = deferred(),
      answer = deferred<boolean>()
    const f = fixture({
      confirm: async () => {
        entered.resolve()
        return answer.promise
      },
    })
    f.scene.hooks!.onTeleport!.variants.exit!.flow = machine([confirm])
    const running = f.runtime.runSceneHook(f.scene, 'onTeleport', { signal: f.signal })
    await entered.promise
    const saving = f.runtime.withSaveBarrier(() => structuredClone(f.world.script))
    answer.resolve(true)
    await running
    const snapshot = await saving
    expect(snapshot?.flags).toEqual({ first: true })
    expect(snapshot?.behaviors.scenes?.s?.onTeleport?.cursor?.at).toEqual({
      kind: 'state',
      machine: 'exit',
      state: 'last',
    })
    await f.runtime.runSceneHook(f.scene, 'onTeleport', { signal: f.signal })
    expect(f.world.script?.flags).toEqual({ first: true, childEnd: true })
  })

  test.each([
    'battle',
    'exit',
  ] as const)('without a concurrent save, %s keeps normal semantics', async (kind) => {
    const f = fixture()
    await f.runtime.runCommands(
      [
        kind === 'battle' ? { kind: 'startBattle', enemyTeamId: 't' } : { kind: 'teleportOut' },
        flag('parentEnd'),
      ],
      { signal: f.signal },
    )
    expect(f.world.script?.flags).toEqual(
      kind === 'battle' ? { parentEnd: true } : { first: true, childEnd: true, parentEnd: true },
    )
  })

  test('same-owner inline hook returns busy without waiting on its own save', async () => {
    vi.useFakeTimers()
    const entered = deferred(),
      answer = deferred<boolean>()
    const f = fixture({
      confirm: async () => {
        entered.resolve()
        return answer.promise
      },
    })
    f.scene.hooks!.onTeleport!.variants.exit!.flow = stage([
      confirm,
      { kind: 'teleportOut', onFail: [flag('busy')] },
      flag('parentEnd'),
    ])
    const running = f.runtime.runSceneHook(f.scene, 'onTeleport', { signal: f.signal })
    await entered.promise
    const saving = f.runtime
      .withSaveBarrier(() => structuredClone(f.world.script))
      .catch((error: unknown) => error)
    answer.resolve(true)
    await vi.advanceTimersByTimeAsync(10_000)
    await running
    expect(await saving).toEqual(f.world.script)
    expect(f.world.script?.flags).toEqual({ busy: true, parentEnd: true })
  })

  test('transient → entity → scene hook nesting completes every tail before saving', async () => {
    vi.useFakeTimers()
    const entered = deferred(),
      answer = deferred<boolean>()
    let depth = 0
    const f = fixture({
      confirm: async () => {
        entered.resolve()
        return answer.promise
      },
      teleportOut: async (signal) => {
        expect(signal).toBe(f.signal)
        depth++
        try {
          return depth === 1
            ? await f.runtime.runEntityBehavior(f.scene, 'e', 'trigger', { signal })
            : await f.runtime.runSceneHook(f.scene, 'onTeleport', { signal })
        } finally {
          depth--
        }
      },
    })
    f.scene.entities[0]!.behaviors!.trigger!.b!.flow = stage([
      { kind: 'teleportOut' },
      flag('entityEnd'),
    ])
    const running = f.runtime.runCommands([confirm, { kind: 'teleportOut' }, flag('parentEnd')], {
      signal: f.signal,
    })
    await entered.promise
    const saving = f.runtime
      .withSaveBarrier(() => structuredClone(f.world.script))
      .catch((error: unknown) => error)
    answer.resolve(true)
    await vi.advanceTimersByTimeAsync(10_000)
    await running
    expect(await saving).toEqual(f.world.script)
    expect(f.world.script?.flags).toEqual({
      first: true,
      childEnd: true,
      entityEnd: true,
      parentEnd: true,
    })
  })

  test.each([
    'scene',
    'entity',
  ] as const)('independent %s root waits for release instead of dropping execution', async (entry) => {
    const f = fixture(),
      waitEntered = deferred()
    const barrier = f.runtime.coordinator.requestSaveBarrier()
    await barrier.ready
    const original = f.runtime.coordinator.waitForActivationGate.bind(f.runtime.coordinator)
    vi.spyOn(f.runtime.coordinator, 'waitForActivationGate').mockImplementation((signal) => {
      waitEntered.resolve()
      return original(signal)
    })
    f.scene.entities[0]!.behaviors!.trigger!.b!.flow = stage([flag('entityEnd')])
    const running =
      entry === 'scene'
        ? f.runtime.runSceneHook(f.scene, 'onTeleport', { signal: f.signal })
        : f.runtime.runEntityBehavior(f.scene, 'e', 'trigger', { signal: f.signal })
    await waitEntered.promise
    expect(f.world.script?.flags).toEqual({})
    barrier.release()
    expect(await running).toBe(true)
    expect(f.world.script?.flags).toEqual(
      entry === 'scene' ? { first: true, childEnd: true } : { entityEnd: true },
    )
  })

  test.each([
    ['scene', 'scene'],
    ['scene', 'session'],
    ['entity', 'scene'],
    ['entity', 'session'],
  ] as const)('queued %s root refuses a changed source %s', async (entry, changed) => {
    let currentScene = 's',
      session = 1
    const f = fixture({ currentSceneId: () => currentScene, currentSceneSessionId: () => session })
    f.scene.entities[0]!.behaviors!.trigger!.b!.flow = stage([flag('entityEnd')])
    const barrier = f.runtime.coordinator.requestSaveBarrier()
    await barrier.ready
    const wait = vi.spyOn(f.runtime.coordinator, 'waitForActivationGate')
    const running =
      entry === 'scene'
        ? f.runtime.runSceneHook(f.scene, 'onTeleport', { signal: f.signal })
        : f.runtime.runEntityBehavior(f.scene, 'e', 'trigger', { signal: f.signal })
    expect(wait).toHaveBeenCalledTimes(1)
    if (changed === 'scene') currentScene = 'elsewhere'
    else session++
    barrier.release()
    expect(await running).toBe(false)
    expect(f.world.script?.flags).toEqual({})
  })

  test('cancelled host await leaves no tail in the actual saved snapshot', async () => {
    const entered = deferred(),
      answer = deferred<boolean>()
    const f = fixture({
      confirm: async () => {
        entered.resolve()
        return answer.promise
      },
    })
    const running = f.runtime.runCommands([confirm, flag('afterCancel')], { signal: f.signal })
    await entered.promise
    const rejected = expect(running).rejects.toMatchObject({ name: 'AbortError' })
    const snapshot = vi.fn(() => structuredClone(f.world.script))
    const saving = f.runtime.withSaveBarrier(snapshot)
    f.controller.abort()
    answer.resolve(true)
    await rejected
    expect((await saving)?.flags).toEqual({})
    expect(snapshot).toHaveBeenCalledTimes(1)
    await expect(f.runtime.withSaveBarrier(() => 'retry')).resolves.toBe('retry')
  })

  test.each([
    'scene',
    'entity',
  ] as const)('%s entry rejects already cancelled signal before executing', async (entry) => {
    const f = fixture()
    f.controller.abort()
    const run =
      entry === 'scene'
        ? f.runtime.runSceneHook(f.scene, 'onTeleport', { signal: f.signal })
        : f.runtime.runEntityBehavior(f.scene, 'e', 'trigger', { signal: f.signal })
    await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    expect(f.world.script?.flags).toEqual({})
    await expect(f.runtime.withSaveBarrier(() => 'safe')).resolves.toBe('safe')
  })

  test('child failure closes both leases and permits a later successful attempt', async () => {
    let fail = true
    const f = fixture({
      yieldMacroTask: async () => {
        if (fail) throw new Error('child failed')
      },
    })
    await expect(
      f.runtime.runCommands([{ kind: 'teleportOut' }, flag('parentEnd')], { signal: f.signal }),
    ).rejects.toThrow('child failed')
    const snapshot = await f.runtime.withSaveBarrier(() => structuredClone(f.world.script))
    expect(snapshot?.flags).toEqual({ first: true })
    fail = false
    await f.runtime.runCommands([{ kind: 'teleportOut' }, flag('parentEnd')], { signal: f.signal })
    expect((await f.runtime.withSaveBarrier(() => structuredClone(f.world.script)))?.flags).toEqual(
      { first: true, childEnd: true, parentEnd: true },
    )
  })

  test('real hanging business still times out at 10 seconds and later saves recover', async () => {
    vi.useFakeTimers()
    const entered = deferred(),
      answer = deferred<boolean>()
    const f = fixture({
      confirm: async () => {
        entered.resolve()
        return answer.promise
      },
    })
    const running = f.runtime.runCommands([confirm, flag('end')], { signal: f.signal })
    await entered.promise
    const snapshot = vi.fn(() => structuredClone(f.world.script))
    const saving = f.runtime.withSaveBarrier(snapshot).catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(9999)
    expect(f.runtime.coordinator.gateClosed()).toBe(true)
    expect(snapshot).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(await saving).toEqual(new Error('script save barrier 超时 10000ms'))
    expect(snapshot).not.toHaveBeenCalled()
    answer.resolve(true)
    await running
    expect((await f.runtime.withSaveBarrier(snapshot))?.flags).toEqual({ end: true })
    expect(snapshot).toHaveBeenCalledTimes(1)
  })

  test('duplicate save and snapshot exceptions never strand the gate', async () => {
    const entered = deferred(),
      answer = deferred<boolean>()
    const f = fixture({
      confirm: async () => {
        entered.resolve()
        return answer.promise
      },
    })
    const running = f.runtime.runCommands([confirm], { signal: f.signal })
    await entered.promise
    const first = f.runtime.withSaveBarrier(() => 'first'),
      duplicate = vi.fn()
    await expect(f.runtime.withSaveBarrier(duplicate)).rejects.toThrow('已经关闭')
    expect(duplicate).not.toHaveBeenCalled()
    answer.resolve(true)
    await running
    expect(await first).toBe('first')
    await expect(
      f.runtime.withSaveBarrier(() => {
        throw new Error('snapshot failed')
      }),
    ).rejects.toThrow('snapshot failed')
    // Deliberately untyped caller: runtime must reject an async snapshot, not serialize a promise.
    await expect(
      f.runtime.withSaveBarrier(() => Promise.resolve('async') as unknown as string),
    ).rejects.toThrow('只允许同步快照')
    await expect(f.runtime.withSaveBarrier(() => 'retry')).resolves.toBe('retry')
  })

  test.each([
    'battle',
    'entity',
    'hook',
  ] as const)('the current shared base helper preserves %s family membership', async (entry) => {
    vi.useFakeTimers()
    const entered = deferred(),
      answer = deferred<boolean>(),
      f = fixture()
    const scene = f.scene as unknown as BaseSceneDef
    scene.entities[0]!.behaviors!.trigger!.b!.flow = scene.hooks!.onTeleport!.variants.exit!.flow
    const base: BaseScriptProjectRuntime = new BaseScriptProjectRuntime(
      { sharedScripts: {} },
      f.world.script!,
      'c'.repeat(64),
      {
        ...f.options,
        scene: () => scene,
        executeEffect() {},
        worldChanged() {},
        confirm: async () => {
          entered.resolve()
          return answer.promise
        },
        teleportOut: (signal) =>
          entry === 'entity'
            ? base.runEntityBehavior(scene, 'e', 'trigger', { signal })
            : base.runSceneHook(scene, 'onTeleport', { signal }),
      },
    )
    const running = base.runCommands(
      [
        confirm,
        entry === 'battle' ? { kind: 'startBattle', enemyTeamId: 't' } : { kind: 'teleportOut' },
        flag('parentEnd'),
      ],
      { signal: f.signal },
    )
    await entered.promise
    const saving = base
      .withSaveBarrier(() => structuredClone(f.world.script))
      .catch((error: unknown) => error)
    answer.resolve(true)
    await vi.advanceTimersByTimeAsync(10_000)
    await running
    expect(((await saving) as WorldScriptState).flags).toEqual(
      entry === 'battle' ? { parentEnd: true } : { first: true, childEnd: true, parentEnd: true },
    )
  })
})
