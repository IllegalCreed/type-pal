import { expect, test } from 'vitest'
import { deferred, nextTestTask } from './__tests__/deferred.js'
import { AsyncIntentController } from './async-intent.js'
import { commitLatestPreparedSnapshot } from './latest-snapshot-transaction.js'

interface PartySnapshot {
  hp: number
  equipment: string
  sprite: string
  members: string[]
}

const currentParty = (): PartySnapshot => ({
  hp: 10,
  equipment: 'wood',
  sprite: 'a',
  members: ['hero'],
})

test('preloading preserves newer health and equipment before applying the party change', async () => {
  let current = currentParty()
  const requested = deferred<void>()
  const prepared = deferred<void>()
  const commits: PartySnapshot[] = []
  const pending = commitLatestPreparedSnapshot({
    assertCurrent: () => undefined,
    snapshot: () => structuredClone(current),
    mutate: (candidate) => candidate.members.push('friend'),
    requiredResources: (candidate) => [candidate.sprite],
    prepare: () => {
      requested.resolve()
      return prepared.promise
    },
    commit: (candidate) => commits.push(candidate),
  })

  await requested.promise
  expect(commits).toEqual([])
  current = { ...current, hp: 3, equipment: 'steel' }
  prepared.resolve()
  await pending

  expect(commits).toEqual([{ hp: 3, equipment: 'steel', sprite: 'a', members: ['hero', 'friend'] }])
})

test('a new sprite requested during preparation must also finish before commit', async () => {
  let current = currentParty()
  const first = { requested: deferred<void>(), prepared: deferred<void>() }
  const replacement = { requested: deferred<void>(), prepared: deferred<void>() }
  const assets = new Map([
    ['a', first],
    ['b', replacement],
  ])
  const requests: string[] = []
  const commits: PartySnapshot[] = []
  const pending = commitLatestPreparedSnapshot({
    assertCurrent: () => undefined,
    snapshot: () => structuredClone(current),
    mutate: () => undefined,
    requiredResources: (candidate) => [candidate.sprite, candidate.sprite],
    prepare: (sprite) => {
      const resource = assets.get(sprite)
      if (!resource) throw new Error(`unexpected sprite ${sprite}`)
      requests.push(sprite)
      resource.requested.resolve()
      return resource.prepared.promise
    },
    commit: (candidate) => commits.push(candidate),
  })

  await first.requested.promise
  current = { ...current, sprite: 'b' }
  first.prepared.resolve()
  const next = await Promise.race([
    replacement.requested.promise.then(() => 'preparing'),
    pending.then(() => 'committed'),
  ])
  expect(next).toBe('preparing')
  expect(commits).toEqual([])
  replacement.prepared.resolve()
  await pending
  expect(requests).toEqual(['a', 'b'])
  expect(commits).toEqual([current])
})

test('a blocked mutation samples the party only after the boundary reopens', async () => {
  let current = currentParty()
  const opened = deferred<void>()
  const commits: PartySnapshot[] = []
  const pending = commitLatestPreparedSnapshot({
    assertCurrent: () => undefined,
    snapshot: () => structuredClone(current),
    mutate: (candidate) => candidate.members.push('friend'),
    requiredResources: () => [],
    prepare: async () => {
      throw new Error('no resource may be prepared')
    },
    async runAtBoundary(action) {
      await opened.promise
      return action()
    },
    commit: (candidate) => commits.push(candidate),
  })

  current = { ...current, hp: 3 }
  await nextTestTask()
  expect(commits).toEqual([])
  opened.resolve()
  await pending
  expect(commits).toEqual([{ ...current, members: ['hero', 'friend'] }])
})

test.each([
  'supersession',
  'cancellation',
] as const)('%s during preparation prevents commit', async (cause) => {
  const intent = new AsyncIntentController()
  const token = intent.begin()
  const controller = new AbortController()
  const cancellation = new DOMException('runner cancelled', 'AbortError')
  const requested = deferred<void>()
  const prepared = deferred<void>()
  const commits: PartySnapshot[] = []
  const pending = commitLatestPreparedSnapshot({
    assertCurrent: () => {
      intent.assertCurrent(token, 'older party change')
      controller.signal.throwIfAborted()
    },
    snapshot: currentParty,
    mutate: () => undefined,
    requiredResources: (candidate) => [candidate.sprite],
    prepare: () => {
      requested.resolve()
      return prepared.promise
    },
    commit: (candidate) => commits.push(candidate),
  })

  await requested.promise
  if (cause === 'supersession') intent.begin()
  else controller.abort(cancellation)

  const rejected = expect(pending).rejects.toMatchObject({
    name: 'AbortError',
    message: cause === 'supersession' ? 'older party change' : cancellation.message,
  })
  prepared.resolve()
  await rejected
  expect(commits).toEqual([])
})
