import { expect, test } from 'vitest'
import { DeferredTouchTrigger, type DeferredTouchTriggerClaim } from './deferred-trigger.js'

type Landing = { pos: { col: number; row: number }; triggerRevision: number }

const sceneSessionId = 's001:1'

function touchClaim(): DeferredTouchTriggerClaim<Landing> {
  return {
    sceneSessionId,
    entityId: 'door',
    landingTick: 12,
    landing: { pos: { col: 4, row: 7 }, triggerRevision: 3 },
  }
}

function fixture() {
  const pending = new DeferredTouchTrigger<Landing>()
  const delivered: DeferredTouchTriggerClaim<Landing>[] = []
  const options: Parameters<typeof pending.drain>[0] = {
    sceneSessionId,
    busy: false,
    disposition: () => 'ready',
    fire: (claim) => {
      delivered.push(claim)
      return true
    },
  }
  return { pending, delivered, options }
}

test('a busy runner holds the first landing and delivers it only once after it frees the slot', () => {
  const { pending, delivered, options } = fixture()
  const accepted = touchClaim()
  expect(pending.enqueue(accepted)).toBe(true)
  expect(pending.enqueue({ ...touchClaim(), entityId: 'another-door' })).toBe(false)

  expect(pending.drain({ ...options, busy: true })).toBe('held')
  expect(pending.pending).toBe(true)
  expect(delivered).toEqual([])

  expect(pending.drain(options)).toBe('started')
  expect(delivered).toEqual([accepted])
  expect(pending.pending).toBe(false)
  expect(pending.blocksAutoSafePoint).toBe(true)
  pending.releaseDeliveryFence()
  expect(pending.blocksAutoSafePoint).toBe(false)
  expect(pending.drain(options)).toBe('empty')
  expect(delivered).toEqual([accepted])
})

test('a change of scene session discards the landing before consulting its disposition', () => {
  const { pending, delivered, options } = fixture()
  const checked: string[] = []
  pending.enqueue(touchClaim())
  expect(
    pending.drain({
      ...options,
      sceneSessionId: 's001:2',
      disposition(claim) {
        checked.push(claim.entityId)
        return 'ready'
      },
    }),
  ).toBe('dropped')
  expect(checked).toEqual([])
  expect(pending.drain(options)).toBe('empty')
  expect(delivered).toEqual([])
})

test('invalidating one target only discards a claim for that entity', () => {
  const { pending, delivered, options } = fixture()
  pending.enqueue(touchClaim())
  expect(pending.clearEntity('other')).toBe(false)
  expect(pending.pending).toBe(true)
  expect(pending.clearEntity('door')).toBe(true)
  expect(pending.drain(options)).toBe('empty')
  expect(delivered).toEqual([])
})

test('a landing that fails the live disposition check is never delivered', () => {
  const { pending, delivered, options } = fixture()
  pending.enqueue(touchClaim())
  expect(pending.drain({ ...options, disposition: () => 'drop' })).toBe('dropped')
  expect(pending.drain(options)).toBe('empty')
  expect(delivered).toEqual([])
})

test('a temporarily suspended target keeps the same landing until it can trigger', () => {
  const { pending, delivered, options } = fixture()
  const accepted = touchClaim()
  pending.enqueue(accepted)
  expect(pending.drain({ ...options, disposition: () => 'hold' })).toBe('held')
  expect(pending.pending).toBe(true)
  expect(delivered).toEqual([])
  expect(pending.drain(options)).toBe('started')
  expect(delivered).toEqual([accepted])
})

test('delivery preserves the landing and binding revision supplied by the caller', () => {
  const { pending, delivered, options } = fixture()
  const playerPos = { col: 4, row: 7 }
  const accepted = { ...touchClaim(), landing: { pos: { ...playerPos }, triggerRevision: 3 } }
  pending.enqueue(accepted)
  playerPos.col = 20
  expect(pending.drain(options)).toBe('started')
  expect(delivered).toEqual([
    {
      entityId: 'door',
      sceneSessionId,
      landingTick: 12,
      landing: { pos: { col: 4, row: 7 }, triggerRevision: 3 },
    },
  ])
})

test('teardown clears a queued landing so the next scene can accept a new one', () => {
  const { pending, delivered, options } = fixture()
  pending.enqueue(touchClaim())
  expect(pending.drain({ ...options, busy: true })).toBe('held')
  expect(pending.blocksAutoSafePoint).toBe(true)
  pending.clear()
  expect(pending.drain(options)).toBe('empty')
  expect(pending.blocksAutoSafePoint).toBe(false)
  expect(delivered).toEqual([])

  const nextScene = { ...touchClaim(), sceneSessionId: 's002:1' }
  expect(pending.enqueue(nextScene)).toBe(true)
  expect(pending.drain({ ...options, sceneSessionId: nextScene.sceneSessionId })).toBe('started')
  expect(delivered).toEqual([nextScene])
})

test('teardown also releases the fence for an already delivered landing', () => {
  const { pending, delivered, options } = fixture()
  const accepted = touchClaim()
  pending.enqueue(accepted)
  expect(pending.drain(options)).toBe('started')
  expect(pending.pending).toBe(false)
  expect(pending.blocksAutoSafePoint).toBe(true)

  pending.clear()
  expect(pending.blocksAutoSafePoint).toBe(false)
  expect(pending.drain(options)).toBe('empty')
  expect(delivered).toEqual([accepted])
})

test('a target that cannot start releases the landing without adding a delivery fence', () => {
  const { pending, delivered, options } = fixture()
  const attempts: number[] = []
  pending.enqueue(touchClaim())
  expect(
    pending.drain({
      ...options,
      fire: ({ landingTick }) => {
        attempts.push(landingTick)
        return false
      },
    }),
  ).toBe('dropped')
  expect(attempts).toEqual([12])
  expect(pending.blocksAutoSafePoint).toBe(false)
  expect(pending.drain(options)).toBe('empty')
  expect(delivered).toEqual([])
})
