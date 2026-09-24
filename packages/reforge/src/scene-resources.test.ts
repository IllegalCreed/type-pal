import { expect, test, vi } from 'vitest'
import { deferredScene, scenePreparationFixture } from './__tests__/scene-preparation-fixture.js'

test('scene resource owner seeds the real entry and caches successful canonical reads only', async () => {
  const f = await scenePreparationFixture()
  expect(f.resources.peek('a')).toBe(f.project.entryScene)
  expect(await f.resources.canonical('a')).toBe(f.project.entryScene)
  expect(f.readers.loadScene).not.toHaveBeenCalled()
  expect(f.resources.peek('missing')).toBeUndefined()
  const b = await f.resources.canonical('b')
  expect(await f.resources.canonical('b')).toBe(b)
  expect(f.readers.loadScene).toHaveBeenCalledExactlyOnceWith('b')
  f.assertInputs()
})

test.each([
  'scene',
  'map',
] as const)('%s failure is not cached and a fresh request can recover', async (kind) => {
  const f = await scenePreparationFixture(),
    failure = new Error('read failed')
  const read = kind === 'scene' ? f.readers.loadScene : f.readers.loadMap
  vi.mocked(read).mockRejectedValueOnce(failure)
  const request = () => (kind === 'scene' ? f.resources.canonical('b') : f.resources.map('map-b'))
  const observed = await request().then(
    () => undefined,
    (error) => error,
  )
  expect(observed).toBe(failure)
  if (kind === 'scene') expect(f.resources.peek('b')).toBeUndefined()
  expect(await request()).toBeDefined()
  expect(read).toHaveBeenCalledTimes(2)
  f.assertInputs()
})

test('palette has one project-scoped promise and repeated successful callers share its value', async () => {
  const f = await scenePreparationFixture()
  const a = f.resources.palette(),
    b = f.resources.palette()
  expect(a).toBe(b)
  const palette = await a
  expect(palette.colors).toHaveLength(256)
  expect(await f.resources.palette()).toBe(palette)
  expect(f.readers.loadPalette).toHaveBeenCalledTimes(1)
  f.assertInputs()
})

test.each([
  'palette',
  'references',
] as const)('%s rejection keeps the existing memo policy and exact error', async (kind) => {
  const f = await scenePreparationFixture(),
    error = new Error('project resource error')
  const reader = kind === 'palette' ? f.readers.loadPalette : f.readers.loadAllScenes
  vi.mocked(reader).mockRejectedValueOnce(error)
  const a = f.resources[kind](),
    b = f.resources[kind]()
  const observedA = a.then(
    () => undefined,
    (e) => e,
  )
  const observedB = b.then(
    () => undefined,
    (e) => e,
  )
  expect(a).toBe(b)
  expect(await observedA).toBe(error)
  expect(await observedB).toBe(error)
  expect(f.resources[kind]()).toBe(a)
  expect(reader).toHaveBeenCalledTimes(1)
  expect(f.resources.peek('a')).toBe(f.project.entryScene)
  expect(f.resources.peek('b')).toBeUndefined()
})

test('complete reference loading warms all canonical scenes without changing its returned index', async () => {
  const f = await scenePreparationFixture()
  const a = f.resources.references(),
    b = f.resources.references()
  expect(a).toBe(b)
  const refs = await a
  expect([...refs]).toEqual([
    ['a', new Set(['npc', 'zone'])],
    ['b', new Set()],
  ])
  expect(f.resources.peek('a')).not.toBe(f.project.entryScene)
  const cachedB = f.resources.peek('b')
  expect(cachedB?.id).toBe('b')
  expect(await f.resources.canonical('b')).toBe(cachedB)
  expect(f.readers.loadScene).not.toHaveBeenCalled()
  expect(f.readers.loadAllScenes).toHaveBeenCalledTimes(1)
  f.assertInputs()
})

test('map LRU touches hits and evicts the least recent key at the seventeenth completed map', async () => {
  const f = await scenePreparationFixture()
  for (let i = 0; i < 16; i++) await f.resources.map(`map-extra-${i}`)
  const first = await f.resources.map('map-extra-0')
  await f.resources.map('map-extra-16')
  expect(await f.resources.map('map-extra-0')).toBe(first)
  expect(
    vi.mocked(f.readers.loadMap).mock.calls.filter(([id]) => id === 'map-extra-0'),
  ).toHaveLength(1)
  await f.resources.map('map-extra-1')
  expect(
    vi.mocked(f.readers.loadMap).mock.calls.filter(([id]) => id === 'map-extra-1'),
  ).toHaveLength(2)
  expect(f.readers.loadMap).toHaveBeenCalledTimes(18)
  f.assertInputs()
})

test.each([
  'scene',
  'map',
] as const)('cold concurrent %s reads preserve completion-order caching rather than inventing coalescing', async (kind) => {
  const f = await scenePreparationFixture(),
    first = deferredScene<void>(),
    second = deferredScene<void>()
  const originalScene = f.readers.loadScene,
    originalMap = f.readers.loadMap
  if (kind === 'scene')
    f.readers.loadScene = vi
      .fn()
      .mockImplementationOnce(async (id) => {
        await first.promise
        return originalScene(id)
      })
      .mockImplementationOnce(async (id) => {
        await second.promise
        return originalScene(id)
      })
  else
    f.readers.loadMap = vi
      .fn()
      .mockImplementationOnce(async (id) => {
        await first.promise
        return originalMap(id)
      })
      .mockImplementationOnce(async (id) => {
        await second.promise
        return originalMap(id)
      })
  const request = () => (kind === 'scene' ? f.resources.canonical('b') : f.resources.map('map-b'))
  const a = request(),
    b = request()
  try {
    expect(kind === 'scene' ? f.readers.loadScene : f.readers.loadMap).toHaveBeenCalledTimes(2)
    second.resolve()
    const bValue = await b
    first.resolve()
    const aValue = await a
    expect(aValue).not.toBe(bValue)
    expect(await request()).toBe(aValue)
  } finally {
    first.resolve()
    second.resolve()
    await Promise.allSettled([a, b])
  }
})

test('separate project owners never reuse another project scene or map cache', async () => {
  const a = await scenePreparationFixture(),
    b = await scenePreparationFixture()
  const left = await a.resources.canonical('b'),
    right = await b.resources.canonical('b')
  expect(left).not.toBe(right)
  expect(a.resources.peek('a')).toBe(a.project.entryScene)
  expect(b.resources.peek('a')).toBe(b.project.entryScene)
  const lm = await a.resources.map('map-a'),
    rm = await b.resources.map('map-a')
  expect(lm).not.toBe(rm)
  expect(a.readers.loadMap).toHaveBeenCalledTimes(1)
  expect(b.readers.loadMap).toHaveBeenCalledTimes(1)
  a.assertInputs()
  b.assertInputs()
})
