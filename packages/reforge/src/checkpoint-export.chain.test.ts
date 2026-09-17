// GLM batch-2 originally reported B11/B12; these regressions do not import audit probes.
import { afterEach, expect, test, vi } from 'vitest'
import { checkpointHarness as harness } from './__tests__/checkpoint-export-fixture.js'
import { confirm, machine } from './__tests__/save-lineage-fixture.js'
import { deferred, worldFixture } from './__tests__/world-async-fixture.js'
import { buildCurrentSavePayload } from './save/ops.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function pendingFlow(h: ReturnType<typeof harness>, entered: { promise: Promise<void> }) {
  const running = h.runtime.runCommands(
    [
      { kind: 'confirm', onNo: [] },
      { kind: 'setFlag', flag: 'complete', value: true },
    ],
    { signal: new AbortController().signal },
  )
  await entered.promise
  return { running }
}

test('actual DEV zero-argument export survives JSON and the current codec/restore chain', async () => {
  const h = harness()
  h.world.audio = { currentMusic: null }
  h.world.script!.flags.saved = true
  const before = structuredClone(h.world)
  const exported = h.hooks.dumpSave()
  expect(exported).toBeInstanceOf(Promise)
  const result = JSON.parse(JSON.stringify(await exported))
  expect(result).toMatchObject({
    version: 8,
    contentVersion: 20,
    projectId: 'checkpoint',
    world: { money: 10, party: [{ template: 'hero' }], audio: { currentMusic: null } },
    position: { sceneId: 'target', pos: { col: 1.5, row: 2.5, height: 0 }, facing: 'down' },
  })
  expect(h.world).toEqual(before)
  expect(h.capture).toHaveBeenCalledTimes(1)
  const normalized = await h.api.normalizeStoredPayload(result, 'checkpoint')
  expect(normalized.world.money).toBe(10)
  expect(normalized.world.script).toEqual(before.script)
  h.world.money = 99
  h.world.script!.flags.saved = false
  h.env.player.pos.col = 99
  expect(await h.api.restorePayload(normalized, h.env.loadIntent.begin(), 'checkpoint')).toBe(true)
  expect(h.world.money).toBe(10)
  expect(h.world.script!.flags.saved).toBe(true)
  expect(h.world.audio!.currentMusic).toBeNull()
  expect(h.env.scene.id).toBe('target')
  expect(h.env.player.pos).toEqual(result.position.pos)
  expect(h.env.facing).toBe('down')
})

test('export is deeply isolated in both directions, including absent optional actor fields', async () => {
  const h = harness(),
    result = await h.hooks.dumpSave(),
    before = structuredClone(result)
  h.world.party[0]!.hp = 1
  h.world.script!.flags.after = true
  h.env.player.pos.row = 99
  expect(result).toEqual(before)
  result.world.party[0]!.mp = 0
  result.world.script!.flags.fromOutput = true
  result.position.pos.col = 88
  expect(h.world.party[0]!.mp).toBe(5)
  expect(h.world.script!.flags.fromOutput).toBeUndefined()
  expect(h.env.player.pos.col).toBe(1.5)
  expect(Object.hasOwn(result.world.party[0]!, 'appearance')).toBe(false)
})

test('actual export waits for the real runtime safe point and includes the command tail', async () => {
  const entered = deferred(),
    answer = deferred<boolean>(),
    barrierEntered = deferred()
  const h = harness({
    confirm: async () => {
      entered.resolve()
      return answer.promise
    },
  })
  const { running } = await pendingFlow(h, entered)
  const original = h.runtime.withSaveBarrier.bind(h.runtime)
  vi.spyOn(h.runtime, 'withSaveBarrier').mockImplementation((capture) => {
    const result = original(capture)
    barrierEntered.resolve()
    return result
  })
  const exported = h.hooks.dumpSave()
  await barrierEntered.promise
  expect(h.capture).not.toHaveBeenCalled()
  expect(h.runtime.coordinator.gateClosed()).toBe(true)
  answer.resolve(true)
  await running
  expect((await exported).world.script!.flags.complete).toBe(true)
  expect(h.capture).toHaveBeenCalledTimes(1)
  expect(h.runtime.coordinator.gateClosed()).toBe(false)
})

test('persistent root exports its next cursor at the safe point, not a partial command stack', async () => {
  const entered = deferred(),
    answer = deferred<boolean>()
  const h = harness({
    currentSceneId: () => 'target',
    confirm: async () => {
      entered.resolve()
      return answer.promise
    },
  })
  h.env.scene.hooks!.onTeleport!.variants.exit!.flow = machine([confirm])
  const running = h.runtime.runSceneHook(h.env.scene, 'onTeleport', {
    signal: new AbortController().signal,
  })
  await entered.promise
  const exported = h.hooks.dumpSave()
  answer.resolve(true)
  await running
  const result = await exported
  expect(result.world.script!.flags).toEqual({ first: true })
  expect(result.world.script!.behaviors.scenes?.target?.onTeleport?.cursor?.at).toEqual({
    kind: 'state',
    machine: 'exit',
    state: 'last',
  })
  await h.runtime.runSceneHook(h.env.scene, 'onTeleport', { signal: new AbortController().signal })
  expect(h.world.script!.flags).toEqual({ first: true, childEnd: true })
  expect(result.world.script!.flags).toEqual({ first: true })
})

test.each([
  'export-export',
  'save-export',
  'export-save',
] as const)('shared queue preserves request order: %s', async (order) => {
  const entered = deferred(),
    answer = deferred<boolean>()
  const h = harness({
    confirm: async () => {
      entered.resolve()
      return answer.promise
    },
  })
  const { running } = await pendingFlow(h, entered)
  // Change the live world after each real capture to distinguish snapshot admission order.
  h.capture.mockImplementation((world, position, id) => {
    const payload = buildCurrentSavePayload(world, position, id)
    h.world.money += 10
    return payload
  })
  const invoke = (kind: string) =>
    kind === 'export' ? h.hooks.dumpSave() : h.api.doSave('quick', new Blob(['thumb']))
  const [first, second] = order.split('-')
  const results = Promise.allSettled([invoke(first!), invoke(second!)])
  answer.resolve(true)
  await running
  const settled = await results
  expect(settled.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled'])
  const exported = settled.map((result) =>
    result.status === 'fulfilled' ? result.value : undefined,
  )
  if (first === 'export') expect(exported[0]?.world.money).toBe(10)
  else expect((await h.store.getPayload('quick'))?.world.money).toBe(10)
  if (second === 'export') expect(exported[1]?.world.money).toBe(20)
  else expect((await h.store.getPayload('quick'))?.world.money).toBe(20)
  expect(h.capture.mock.results.map((result) => result.value.world.script.flags.complete)).toEqual([
    true,
    true,
  ])
  expect(h.env.committedSavedTimes).toBe(order === 'export-export' ? 0 : 1)
})

test('export timeout rejects without capture, and later export and save recover', async () => {
  vi.useFakeTimers()
  const entered = deferred(),
    answer = deferred<boolean>()
  const h = harness({
    confirm: async () => {
      entered.resolve()
      return answer.promise
    },
  })
  const { running } = await pendingFlow(h, entered)
  const settled = h.hooks.dumpSave().then(
    (value) => ({ value }),
    (error) => ({ error }),
  )
  await vi.advanceTimersByTimeAsync(10_000)
  expect(await settled).toEqual({ error: new Error('script save barrier 超时 10000ms') })
  expect(h.capture).not.toHaveBeenCalled()
  expect(h.io.put).not.toHaveBeenCalled()
  answer.resolve(true)
  await running
  expect((await h.hooks.dumpSave()).world.script!.flags.complete).toBe(true)
  await h.api.doSave('quick', new Blob(['ok']))
  expect(h.env.committedSavedTimes).toBe(1)
})

test('snapshot exception reaches caller, releases the gate and does not poison the queue', async () => {
  const h = harness(),
    failure = new Error('checkpoint clone failed')
  h.capture.mockImplementationOnce(() => {
    throw failure
  })
  await expect(h.hooks.dumpSave()).rejects.toBe(failure)
  expect(h.runtime.coordinator.gateClosed()).toBe(false)
  expect(h.io.put).not.toHaveBeenCalled()
  await expect(h.hooks.dumpSave()).resolves.toMatchObject({ world: { money: 10 } })
  await h.api.doSave('quick', new Blob(['ok']))
  expect(h.env.committedSavedTimes).toBe(1)
})

test('export performs zero slot/thumbnail IO and does not consume save numbers', async () => {
  const h = harness()
  await h.hooks.dumpSave()
  await h.hooks.dumpSave()
  for (const call of Object.values(h.io)) expect(call).not.toHaveBeenCalled()
  expect(h.env.createImageBitmap).not.toHaveBeenCalled()
  expect(h.env.captureThumbnail).not.toHaveBeenCalled()
  expect(h.env.committedSavedTimes).toBe(0)
  await h.api.doSave('m01', new Blob(['ok']))
  expect(h.io.put.mock.calls[0]![0].savedTimes).toBe(1)
  expect(h.io.put.mock.calls[0]![0].party[0]!.level).toBe(
    h.io.put.mock.calls[0]![1].world.party[0]!.level,
  )
})

test('slow slot IO does not hold the snapshot barrier or block an export', async () => {
  const entered = deferred(),
    commit = deferred(),
    h = harness()
  const original = h.store.putSlot.bind(h.store)
  h.io.put.mockImplementationOnce(async (...args) => {
    entered.resolve()
    await commit.promise
    await original(...args)
  })
  const saving = h.api.doSave('quick', new Blob(['ok']))
  await entered.promise
  expect(h.runtime.coordinator.gateClosed()).toBe(false)
  h.world.money = 77
  expect((await h.hooks.dumpSave()).world.money).toBe(77)
  expect(h.env.committedSavedTimes).toBe(0)
  commit.resolve()
  await saving
  expect((await h.store.getPayload('quick'))?.world.money).toBe(10)
  expect(h.env.committedSavedTimes).toBe(1)
})

test('slot failure preserves write ordering and numbering while export remains independent', async () => {
  const h = harness()
  h.io.put.mockRejectedValueOnce(new Error('disk failed'))
  const first = h.api.doSave('quick', new Blob(['one'])),
    second = h.api.doSave('m01', new Blob(['two']))
  const results = await Promise.allSettled([first, h.hooks.dumpSave(), second])
  expect(results.map((result) => result.status)).toEqual(['rejected', 'fulfilled', 'fulfilled'])
  expect(h.io.put.mock.calls.map(([meta]) => [meta.slotId, meta.savedTimes])).toEqual([
    ['quick', 1],
    ['m01', 1],
  ])
  expect(await h.store.getPayload('quick')).toBeNull()
  expect((await h.store.getPayload('m01'))?.projectId).toBe('checkpoint')
  expect(h.env.committedSavedTimes).toBe(1)
})

test('slow thumbnail preserves matching metadata/payload and does not block export', async () => {
  const h = harness(),
    thumb = deferred<Blob>()
  const saving = h.api.doSave('quick', thumb.promise)
  await h.env.saveSnapshotQueue
  expect(h.capture).toHaveBeenCalledTimes(1)
  expect(h.io.put).not.toHaveBeenCalled()
  h.world.party[0]!.level = 10
  expect((await h.hooks.dumpSave()).world.party[0]!.level).toBe(10)
  thumb.resolve(new Blob(['ready']))
  await saving
  const [meta, payload] = h.io.put.mock.calls[0]!
  expect(meta.party[0]!.level).toBe(1)
  expect(payload.world.party[0]!.level).toBe(1)
  expect(meta.savedTimes).toBe(1)
})

test('queued export sees a whole later committed world and position, never a mixed snapshot', async () => {
  const h = harness(),
    gate = deferred()
  h.env.saveSnapshotQueue = gate.promise
  const exported = h.hooks.dumpSave()
  const raw = buildCurrentSavePayload(
    worldFixture(),
    {
      sceneId: 'loaded',
      pos: { col: 7, row: 8, height: 0 },
      facing: 'left',
    },
    'checkpoint',
  )
  raw.world.money = 321
  const normalized = await h.api.normalizeStoredPayload(raw, 'new world')
  expect(await h.api.restorePayload(normalized, h.env.loadIntent.begin(), 'new world')).toBe(true)
  expect(h.capture).not.toHaveBeenCalled()
  gate.resolve()
  const result = await exported
  expect(result.world.money).toBe(321)
  expect(result.position).toEqual(raw.position)
  expect(h.env.world).toBe(h.world)
})

test('DEV-only registration preserves all motion hook bindings', () => {
  expect(harness({}, false).env.window.__tpE2e).toBeUndefined()
  const h = harness(),
    trace = h.hooks.dumpMotionTrace()
  trace.push({ step: 2 })
  expect(h.env.motionTrace).toEqual([{ step: 1 }])
  expect(h.hooks.dumpMotionState()).toEqual({ scene: 'target' })
  h.hooks.clearMotionTrace()
  expect(h.env.motionTrace).toEqual([])
})

test.each([
  false,
  true,
])('real quickSave thumbnail callback success/failure (%s) preserves export independence', async (fail) => {
  const h = harness(),
    entered = deferred()
  let complete!: BlobCallback
  const drawImage = vi.fn()
  const offscreen = {
    width: 0,
    height: 0,
    getContext: () => ({ imageSmoothingEnabled: false, drawImage }),
    toBlob: (callback: BlobCallback, type: string) => {
      expect(type).toBe('image/png')
      complete = callback
      entered.resolve()
    },
  }
  const createElement = vi.fn(() => offscreen)
  vi.stubGlobal('document', { createElement })
  const saving = h.api.quickSave().then(
    () => ({ saved: true }),
    (error) => ({ error }),
  )
  await entered.promise
  await h.env.saveSnapshotQueue
  expect(h.io.put).not.toHaveBeenCalled()
  expect(h.env.showToast).not.toHaveBeenCalled()
  expect(offscreen.width).toBe(64)
  expect(offscreen.height).toBe(40)
  expect(drawImage).toHaveBeenCalledWith(h.env.canvas, 0, 0, 64, 40)
  expect((await h.hooks.dumpSave()).projectId).toBe('checkpoint')
  expect(createElement).toHaveBeenCalledTimes(1)
  expect(h.env.captureThumbnail).toHaveBeenCalledTimes(1)
  const blob = new Blob(['thumbnail'], { type: 'image/png' })
  complete(fail ? null : blob)
  expect(await saving).toEqual(
    fail ? { error: new Error('thumbnail: toBlob null') } : { saved: true },
  )
  if (fail) {
    expect(h.io.put).not.toHaveBeenCalled()
    expect(h.env.showToast).not.toHaveBeenCalled()
    expect(h.env.committedSavedTimes).toBe(0)
    const retry = h.api.quickSave()
    complete(blob)
    await retry
  }
  expect(h.env.committedSavedTimes).toBe(1)
  expect(h.env.showToast).toHaveBeenCalledExactlyOnceWith('已快速存档')
  expect(await h.store.getThumb('quick')).toBe(blob)
  expect((await h.store.getPayload('quick'))?.world.money).toBe(10)
})
