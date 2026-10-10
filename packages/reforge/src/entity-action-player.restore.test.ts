import type { SpriteActionBinding, SpriteDef } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import {
  EntityActionPlayer,
  type EntityActionSnapshot,
  resolveSpriteActionBinding,
} from './entity-action-player.js'

const sprite: SpriteDef = {
  id: 'walker',
  asset: 'sprite.walker',
  label: 'Walker',
  layout: { kind: 'static' },
  poses: {
    forge: {
      label: 'Forge',
      loopFrom: 1,
      steps: [
        { frame: 0, durationMs: 100, cues: [{ kind: 'sound', asset: 'sound.intro' }] },
        { frame: 1, durationMs: 80, cues: [{ kind: 'sound', asset: 'sound.loop-a' }] },
        { frame: 2, durationMs: 120, cues: [{ kind: 'sound', asset: 'sound.loop-b' }] },
      ],
    },
    once: {
      label: 'Once',
      steps: [
        { frame: 7, durationMs: 60, cues: [{ kind: 'sound', asset: 'sound.once-start' }] },
        { frame: 8, durationMs: 140, cues: [{ kind: 'sound', asset: 'sound.once-end' }] },
      ],
    },
  },
}
const base: SpriteActionBinding = {
  sprite: 'walker',
  action: 'forge',
  loop: true,
  startAtMs: 90,
}
const once: SpriteActionBinding = { sprite: 'walker', action: 'once', loop: false }
const resolve = (_entity: string, binding: SpriteActionBinding) =>
  resolveSpriteActionBinding(sprite, binding, 9)
const resolved = (binding: SpriteActionBinding) => resolve('npc', binding)

test('base intro and loop snapshots resume exact phase without repeating historical cues', () => {
  const originalCue = vi.fn()
  const original = new EntityActionPlayer(originalCue)
  original.replaceScene([{ entity: 'npc', ...resolved(base) }])
  original.advance(40)
  expect(original.capture()).toEqual([
    {
      entity: 'npc',
      base: {
        binding: base,
        source: 'automatic',
        awaited: false,
        stepIndex: 0,
        elapsedInStepMs: 40,
        finished: false,
        pendingLoopStartAtMs: 90,
      },
    },
  ])

  const restoredCue = vi.fn()
  const restored = new EntityActionPlayer(restoredCue)
  restored.restore(original.capture(), resolve)
  expect(restoredCue).not.toHaveBeenCalled()
  originalCue.mockClear()
  original.advance(70)
  restored.advance(70)
  expect(restored.capture()).toEqual(original.capture())
  expect(restored.capture()[0]?.base).toMatchObject({ stepIndex: 2, elapsedInStepMs: 20 })
  expect(restored.capture()[0]?.base).not.toHaveProperty('pendingLoopStartAtMs')
  expect(restoredCue.mock.calls).toEqual(originalCue.mock.calls)

  restored.restore(restored.capture(), resolve)
  originalCue.mockClear()
  restoredCue.mockClear()
  original.advance(180)
  restored.advance(180)
  expect(restored.frame('npc')).toBe(2)
  expect(restored.capture()).toEqual(original.capture())
  expect(restoredCue.mock.calls).toEqual(originalCue.mock.calls)
  expect(restoredCue.mock.calls.map(([, cue]) => cue.asset)).toEqual([
    'sound.loop-a',
    'sound.loop-b',
  ])
})

test('a script override and the base hidden beneath it both resume without reviving the old waiter', async () => {
  const original = new EntityActionPlayer()
  original.replaceScene([{ entity: 'npc', ...resolved(base) }])
  original.advance(35)
  const oldWaiter = original.play('npc', resolved(once))
  original.advance(85)
  const snapshot = original.capture()
  expect(snapshot[0]?.base?.elapsedInStepMs).toBe(35)
  expect(snapshot[0]?.override).toEqual({
    binding: once,
    source: 'script',
    awaited: true,
    stepIndex: 1,
    elapsedInStepMs: 25,
    finished: false,
  })
  expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)

  const cue = vi.fn()
  const restored = new EntityActionPlayer(cue)
  restored.restore(snapshot, resolve)
  original.clearScene()
  await oldWaiter
  expect(cue).not.toHaveBeenCalled()
  restored.advance(114)
  expect(restored.frame('npc')).toBe(8)
  restored.advance(21)
  expect(restored.hasOverride('npc')).toBe(false)
  expect(restored.capture()[0]?.base?.elapsedInStepMs).toBe(55)
  expect(cue).not.toHaveBeenCalled()
  snapshot[0]!.base!.elapsedInStepMs = 0
  snapshot[0]!.override!.binding.action = 'forge'
  expect(restored.capture()[0]?.base?.elapsedInStepMs).toBe(55)
})

test('an automatic once action waits for the new runner then resumes its exact remaining duration', async () => {
  const original = new EntityActionPlayer()
  const oldOwner = new AbortController()
  const oldWaiter = original.play('npc', resolved(once), oldOwner.signal, 'automatic')
  original.advance(60)
  const cue = vi.fn()
  const restored = new EntityActionPlayer(cue)
  restored.restore(original.capture(), resolve)
  const newOwner = new AbortController()
  restored.attachRestoredOwner('npc', newOwner.signal)
  restored.advance(500)
  expect(restored.capture()[0]?.override?.elapsedInStepMs).toBe(0)
  expect(restored.frame('npc')).toBe(8)
  const completed = vi.fn()
  const resumed = restored.play('npc', resolved(once), newOwner.signal, 'automatic')
  void resumed.then(completed)
  expect(restored.play('npc', resolved(once), newOwner.signal, 'automatic')).toBe(resumed)
  original.clearScene()
  await oldWaiter
  oldOwner.abort()
  restored.advance(139)
  await Promise.resolve()
  expect(completed).not.toHaveBeenCalled()
  expect(restored.frame('npc')).toBe(8)
  restored.advance(1)
  await resumed
  expect(completed).toHaveBeenCalledOnce()
  expect(restored.hasOverride('npc')).toBe(false)
  expect(cue).not.toHaveBeenCalled()
})

test('rebinding a restored automatic owner detaches the replaced signal and aborts its new waiter', async () => {
  const original = new EntityActionPlayer()
  const oldWaiter = original.play('npc', resolved(once), undefined, 'automatic')
  original.advance(20)
  const restored = new EntityActionPlayer()
  restored.restore(original.capture(), resolve)
  const obsolete = new AbortController()
  const owner = new AbortController()
  restored.attachRestoredOwner('npc', obsolete.signal)
  restored.attachRestoredOwner('npc', owner.signal)
  const resumed = restored.play('npc', resolved(once), owner.signal, 'automatic')
  const rejected = expect(resumed).rejects.toMatchObject({ name: 'AbortError' })
  obsolete.abort()
  expect(restored.frame('npc')).toBe(7)
  owner.abort()
  await rejected
  expect(restored.hasOverride('npc')).toBe(false)
  expect(restored.capture({ includeCompleted: () => true })).toEqual([])
  original.clearScene()
  await oldWaiter
})

test('a restored looping override advances before runner reentry but belongs to its newly attached owner', async () => {
  const original = new EntityActionPlayer()
  original.replaceScene([{ entity: 'npc', ...resolved(once) }])
  original.advance(10)
  await original.play('npc', resolved(base), undefined, 'automatic')
  original.advance(40)
  const cue = vi.fn()
  const restored = new EntityActionPlayer(cue)
  restored.restore(original.capture(), resolve)
  restored.advance(70)
  expect(restored.frame('npc')).toBe(2)
  const owner = new AbortController()
  restored.attachRestoredOwner('npc', owner.signal)
  await restored.play('npc', resolved(base), owner.signal, 'automatic')
  expect(restored.capture()[0]?.override?.elapsedInStepMs).toBe(20)
  expect(cue).not.toHaveBeenCalled()
  owner.abort()
  expect(restored.hasOverride('npc')).toBe(false)
  expect(restored.capture()[0]?.base?.elapsedInStepMs).toBe(10)
})

test.each([
  'binding',
  'source',
] as const)('a different %s replaces a restored automatic action instead of adopting it', async (difference) => {
  const original = new EntityActionPlayer()
  const oldWaiter = original.play('npc', resolved(once), undefined, 'automatic')
  original.advance(85)
  const restored = new EntityActionPlayer()
  restored.restore(original.capture(), resolve)
  const binding = difference === 'binding' ? base : once
  const source = difference === 'source' ? 'script' : 'automatic'
  const replacement = restored.play('npc', resolved(binding), undefined, source)
  expect(restored.frame('npc')).toBe(difference === 'binding' ? 0 : 7)
  expect(restored.capture()[0]?.override?.elapsedInStepMs).toBe(0)
  original.clearScene()
  restored.clearScene()
  await Promise.all([oldWaiter, replacement])
})

test('preparation resolves and validates every track before commit, freezes inputs, and commits only once', () => {
  const current = new EntityActionPlayer()
  current.replaceScene([{ entity: 'old', ...resolved(base) }])
  const source = new EntityActionPlayer()
  source.replaceScene([{ entity: 'npc', ...resolved(base) }])
  source.advance(40)
  const snapshot = source.capture()
  const invalid = structuredClone(snapshot)
  invalid.push({
    entity: 'missing',
    base: { ...invalid[0]!.base!, binding: { ...base, action: 'missing' } },
  })
  expect(() => current.prepareRestore(invalid, resolve)).toThrow('不存在')
  expect(current.frame('old')).toBe(0)
  const resolver = vi.fn(resolve)
  const commit = current.prepareRestore(snapshot, resolver)
  snapshot[0]!.base!.elapsedInStepMs = 0
  expect(current.frame('old')).toBe(0)
  commit()
  expect(current.frame('old')).toBeUndefined()
  expect(current.capture()[0]?.base?.elapsedInStepMs).toBe(40)
  expect(resolver).toHaveBeenCalledTimes(1)
  expect(() => commit()).toThrow('已提交')
})

test.each([
  { stepIndex: -1 },
  { elapsedInStepMs: 100 },
  { elapsedInStepMs: Number.NaN },
  { finished: true },
  { pendingLoopStartAtMs: 12 },
  { awaited: undefined },
])('restore rejects an impossible action progress before disturbing active tracks: %j', (patch) => {
  const player = new EntityActionPlayer()
  player.replaceScene([{ entity: 'npc', ...resolved(base) }])
  player.advance(40)
  const before = player.capture()
  const malformed: EntityActionSnapshot[] = structuredClone(before)
  Object.assign(malformed[0]!.base!, patch)
  expect(() => player.restore(malformed, resolve)).toThrow('sprite action restore:')
  expect(player.capture()).toEqual(before)
})

test('a finished base action remains on its final frame and emits no cue on restore or later ticks', () => {
  const original = new EntityActionPlayer()
  original.replaceScene([{ entity: 'npc', ...resolved(once) }])
  original.advance(200)
  expect(original.capture()[0]?.base).toMatchObject({
    stepIndex: 1,
    elapsedInStepMs: 140,
    finished: true,
  })
  const cue = vi.fn()
  const restored = new EntityActionPlayer(cue)
  restored.restore(original.capture(), resolve)
  restored.advance(1000)
  expect(restored.frame('npc')).toBe(8)
  expect(restored.capture()).toEqual(original.capture())
  expect(cue).not.toHaveBeenCalled()
})

test('a synchronously completed automatic action survives save before its awaited continuation acknowledges it', async () => {
  const original = new EntityActionPlayer()
  original.replaceScene([{ entity: 'npc', ...resolved(base) }])
  original.advance(40)
  const oldOwner = new AbortController()
  const acknowledged = vi.fn()
  const oldWaiter = original.play('npc', resolved(once), oldOwner.signal, 'automatic')
  void oldWaiter.then(acknowledged)
  original.advance(200)
  expect(acknowledged).not.toHaveBeenCalled()
  expect(original.frame('npc')).toBe(0)
  expect(original.hasOverride('npc')).toBe(false)
  expect(original.capture()[0]).not.toHaveProperty('completed')
  const includeCompleted = vi.fn(
    (_entity: string, _binding: Readonly<SpriteActionBinding>, signal?: AbortSignal) =>
      signal === oldOwner.signal,
  )
  const snapshot = original.capture({ includeCompleted })
  expect(includeCompleted).toHaveBeenCalledWith('npc', once, oldOwner.signal, undefined)
  expect(snapshot[0]?.completed).toEqual([
    {
      binding: once,
      source: 'automatic',
      awaited: true,
      stepIndex: 1,
      elapsedInStepMs: 140,
      finished: true,
    },
  ])

  const cue = vi.fn()
  const restored = new EntityActionPlayer(cue)
  restored.restore(snapshot, resolve)
  restored.advance(10)
  expect(restored.frame('npc')).toBe(0)
  expect(restored.capture()[0]?.base?.elapsedInStepMs).toBe(50)
  const allReceipts = { includeCompleted: () => true }
  expect(restored.capture(allReceipts)[0]?.completed).toEqual(snapshot[0]?.completed)
  const owner = new AbortController()
  expect(restored.attachRestoredOwner('npc', owner.signal)).toBe(true)
  await restored.play('npc', resolved(once), owner.signal, 'automatic')
  expect(restored.hasOverride('npc')).toBe(false)
  expect(cue).not.toHaveBeenCalled()
  expect(restored.acknowledgeCompleted('npc', once, oldOwner.signal)).toBe(false)
  expect(restored.acknowledgeCompleted('npc', base, owner.signal)).toBe(false)
  expect(restored.capture(allReceipts)[0]?.completed).toBeDefined()
  expect(restored.acknowledgeCompleted('npc', once, owner.signal)).toBe(true)
  expect(restored.capture(allReceipts)[0]).not.toHaveProperty('completed')
  await oldWaiter
})

test('different automatic owners keep independent fulfilled receipts while a new override owns the image', async () => {
  const original = new EntityActionPlayer()
  const ownerA = new AbortController()
  const ownerB = new AbortController()
  const first = original.play('npc', resolved(once), ownerA.signal, 'automatic', 'owner-a')
  original.advance(70)
  const foreground = original.play('npc', resolved(once))
  const second = original.play('npc', resolved(once), ownerB.signal, 'automatic', 'owner-b')
  original.advance(200)
  const all = { includeCompleted: () => true }
  const snapshot = original.capture(all)
  expect(snapshot[0]?.completed).toEqual([
    {
      binding: once,
      source: 'automatic',
      awaited: true,
      owner: 'owner-a',
      stepIndex: 1,
      elapsedInStepMs: 10,
      finished: false,
    },
    {
      binding: once,
      source: 'automatic',
      awaited: true,
      owner: 'owner-b',
      stepIndex: 1,
      elapsedInStepMs: 140,
      finished: true,
    },
  ])
  expect(original.frame('npc')).toBeUndefined()
  expect(original.hasOverride('npc')).toBe(false)
  expect(original.capture()).toEqual([])
  expect(
    original
      .capture({ includeCompleted: (_entity, _binding, _signal, owner) => owner === 'owner-a' })[0]
      ?.completed?.map((track) => track.owner),
  ).toEqual(['owner-a'])
  const nextForeground = original.play('npc', resolved(once))
  expect(original.frame('npc')).toBe(7)
  expect(original.capture(all)[0]?.completed).toEqual(snapshot[0]?.completed)

  const cue = vi.fn()
  const restored = new EntityActionPlayer(cue)
  restored.restore(snapshot, resolve)
  const nextA = new AbortController()
  const nextB = new AbortController()
  expect(restored.attachRestoredOwner('npc', nextA.signal, 'unrelated')).toBe(false)
  expect(restored.attachRestoredOwner('npc', nextA.signal, 'owner-a')).toBe(true)
  expect(restored.attachRestoredOwner('npc', nextB.signal, 'owner-b')).toBe(true)
  await restored.play('npc', resolved(once), nextA.signal, 'automatic', 'owner-a')
  expect(restored.frame('npc')).toBeUndefined()
  expect(restored.hasOverride('npc')).toBe(false)
  expect(cue).not.toHaveBeenCalled()
  expect(restored.acknowledgeCompleted('npc', once, nextA.signal)).toBe(true)
  expect(restored.capture(all)[0]?.completed?.map((track) => track.owner)).toEqual(['owner-b'])
  nextB.abort()
  expect(restored.capture(all)).toEqual([])
  original.clearScene()
  await Promise.all([first, foreground, second, nextForeground])
})

test('stopping fulfills one automatic command, but fresh playback does not consume its historical receipt', async () => {
  const player = new EntityActionPlayer()
  const owner = new AbortController()
  const first = player.play('npc', resolved(once), owner.signal, 'automatic', 'owner')
  player.advance(20)
  player.stop('npc', false)
  await first
  const all = { includeCompleted: () => true }
  expect(player.capture(all)[0]?.completed?.[0]).toMatchObject({
    owner: 'owner',
    stepIndex: 0,
    elapsedInStepMs: 20,
    finished: false,
  })
  const next = player.play('npc', resolved(once), owner.signal, 'automatic', 'owner')
  expect(player.frame('npc')).toBe(7)
  expect(player.hasOverride('npc')).toBe(true)
  expect(player.capture(all)[0]?.override?.elapsedInStepMs).toBe(0)
  expect(player.acknowledgeCompleted('npc', once, owner.signal)).toBe(true)
  expect(player.capture(all)[0]).not.toHaveProperty('completed')
  player.clearEntity('npc')
  await next
  expect(player.capture(all)).toEqual([])
  const last = player.play('npc', resolved(once), owner.signal, 'automatic', 'owner')
  player.stop('npc', false)
  const active = player.play('npc', resolved(once), owner.signal, 'automatic', 'owner')
  player.clearScene()
  await Promise.all([last, active])
  expect(player.capture(all)).toEqual([])
})

test('restored automatic in-flight tracks attach and resume only through their stable owner', async () => {
  const original = new EntityActionPlayer()
  const oldWaiter = original.play('npc', resolved(once), undefined, 'automatic', 'owner-a')
  original.advance(85)
  const snapshot = original.capture()
  const restored = new EntityActionPlayer()
  restored.restore(snapshot, resolve)
  const owner = new AbortController()
  expect(restored.attachRestoredOwner('npc', owner.signal, 'other')).toBe(false)
  expect(restored.attachRestoredOwner('npc', owner.signal, 'owner-a')).toBe(true)
  const resumed = restored.play('npc', resolved(once), owner.signal, 'automatic', 'owner-a')
  expect(restored.frame('npc')).toBe(8)
  expect(restored.capture()[0]?.override?.elapsedInStepMs).toBe(25)
  const invalid = structuredClone(snapshot)
  invalid[0]!.override!.owner = ''
  expect(() => restored.prepareRestore(invalid, resolve)).toThrow('owner')
  expect(restored.frame('npc')).toBe(8)
  original.clearScene()
  restored.clearScene()
  await Promise.all([oldWaiter, resumed])
})

test('a non-awaited automatic once action resumes in the background without reentering its already passed leaf', async () => {
  const original = new EntityActionPlayer()
  const oldWaiter = original.play('npc', resolved(once), undefined, 'automatic', 'owner', false)
  original.advance(85)
  const snapshot = original.capture()
  const cue = vi.fn()
  const restored = new EntityActionPlayer(cue)
  restored.restore(snapshot, resolve)
  const owner = new AbortController()
  expect(restored.attachRestoredOwner('npc', owner.signal, 'owner')).toBe(true)
  restored.advance(115)
  expect(restored.hasOverride('npc')).toBe(false)
  expect(restored.capture({ includeCompleted: () => true })).toEqual([])
  expect(snapshot[0]?.override?.awaited).toBe(false)
  expect(cue).not.toHaveBeenCalled()

  restored.restore(snapshot, resolve)
  const stopped = new AbortController()
  restored.attachRestoredOwner('npc', stopped.signal, 'owner')
  stopped.abort()
  expect(restored.hasOverride('npc')).toBe(false)
  expect(restored.capture({ includeCompleted: () => true })).toEqual([])
  original.clearScene()
  await oldWaiter
})

test('syncing an unchanged base preserves its precise phase, active override and unacknowledged receipts', async () => {
  const cue = vi.fn()
  const player = new EntityActionPlayer(cue)
  player.replaceScene([{ entity: 'npc', ...resolved(base) }])
  player.advance(40)
  const completed = player.play('npc', resolved(once), undefined, 'automatic', 'owner')
  player.advance(200)
  await completed
  const foreground = player.play('npc', resolved(once))
  const foregroundFinished = vi.fn()
  void foreground.then(foregroundFinished)
  player.advance(25)
  const all = { includeCompleted: () => true }
  const before = player.capture(all)
  cue.mockClear()
  player.syncBases([{ entity: 'npc', ...resolved({ ...base }) }])
  expect(player.capture(all)).toEqual(before)
  expect(player.capture(all)[0]?.base?.elapsedInStepMs).toBe(40)
  expect(player.capture(all)[0]?.override?.elapsedInStepMs).toBe(25)
  expect(player.capture(all)[0]?.completed).toHaveLength(1)
  expect(cue).not.toHaveBeenCalled()
  await Promise.resolve()
  expect(foregroundFinished).not.toHaveBeenCalled()
  player.advance(175)
  await foreground
  expect(foregroundFinished).toHaveBeenCalledOnce()
  player.clearScene()
})

test('syncing changed, added and removed bases touches only those bases and emits only new visible start cues', async () => {
  const cue = vi.fn()
  const player = new EntityActionPlayer(cue)
  player.replaceScene(['keep', 'change', 'remove'].map((entity) => ({ entity, ...resolved(base) })))
  player.advance(40)
  const completed = player.play('remove', resolved(once), undefined, 'automatic', 'owner')
  player.advance(200, (entity) => entity !== 'remove')
  await completed
  await player.play('remove', resolved(base))
  player.advance(25, (entity) => entity !== 'remove')
  const all = { includeCompleted: () => true }
  const before = player.capture(all)
  const retained = before.find((entry) => entry.entity === 'remove')!
  cue.mockClear()
  player.syncBases([
    { entity: 'keep', ...resolved(base) },
    { entity: 'change', ...resolved(once) },
    { entity: 'add', ...resolved(base) },
  ])
  const after = player.capture(all)
  expect(after.find((entry) => entry.entity === 'keep')).toEqual(
    before.find((entry) => entry.entity === 'keep'),
  )
  expect(after.find((entry) => entry.entity === 'change')?.base).toMatchObject({
    binding: once,
    stepIndex: 0,
    elapsedInStepMs: 0,
  })
  expect(after.find((entry) => entry.entity === 'add')?.base).toMatchObject({
    binding: base,
    stepIndex: 0,
    elapsedInStepMs: 0,
  })
  expect(after.find((entry) => entry.entity === 'remove')).toEqual({
    entity: 'remove',
    override: retained.override,
    completed: retained.completed,
  })
  expect(cue.mock.calls).toEqual([
    ['change', { kind: 'sound', asset: 'sound.once-start' }],
    ['add', { kind: 'sound', asset: 'sound.intro' }],
  ])
  const stable = player.capture(all)
  cue.mockClear()
  expect(() =>
    player.syncBases([
      { entity: 'change', ...resolved(base) },
      { entity: 'duplicate', ...resolved(base) },
      { entity: 'duplicate', ...resolved(once) },
    ]),
  ).toThrow('重复')
  expect(player.capture(all)).toEqual(stable)
  expect(cue).not.toHaveBeenCalled()
  player.clearScene()
})
