import { expect, test } from 'vitest'
import { AsyncIntentController } from './async-intent.js'

test('capturing a generation does not take it over; a second begin invalidates the old launch and its captures', () => {
  const owner = new AsyncIntentController()
  const launch = owner.begin()
  const first = owner.capture()
  const second = owner.capture()

  expect([first, second]).toEqual([launch, launch])
  expect(() => owner.assertCurrent(launch, 'scene launch')).not.toThrow()
  const winner = owner.begin()
  expect(owner.isCurrent(winner)).toBe(true)
  expect(owner.isCurrent(launch)).toBe(false)
  expect(() => owner.assertCurrent(first, 'old launch')).toThrowError(
    expect.objectContaining({ name: 'AbortError', message: 'old launch' }),
  )
})

test('invalidation denies a pending continuation but leaves a newly captured generation usable', async () => {
  const owner = new AsyncIntentController()
  const previous = owner.capture()
  const published: string[] = []
  const pending = Promise.resolve().then(() => {
    owner.assertCurrent(previous, 'expired world')
    published.push('old world')
  })
  owner.invalidate()
  const replacement = owner.capture()
  owner.assertCurrent(replacement, 'new world')
  published.push('new world')

  await expect(pending).rejects.toMatchObject({ name: 'AbortError', message: 'expired world' })
  expect(published).toEqual(['new world'])
})
