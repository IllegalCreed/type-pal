import { expect, test } from 'vitest'
import { deferred } from './__tests__/glm-runtime-contract-fixtures.js'
import { abortableTrial, createTrialFileSnapshot } from './battle-trial-assets.js'
import type { FileSource } from './file-source.js'

const utf8 = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer as ArrayBuffer
const drain = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}
function memorySource(files: Record<string, string>): FileSource {
  return {
    readBytes: async (path) => {
      if (!(path in files)) throw new Error(`ENOENT ${path}`)
      return utf8(files[path]!)
    },
    readText: async (path) => files[path] ?? '',
    readJson: async <T>(path: string): Promise<T> => JSON.parse(files[path] ?? 'null') as T,
    urlFor: async () => 'blob:x',
  }
}
test.each([
  'pre-aborted',
  'in-flight',
] as const)('abortableTrial %s rejects before its original source is released', async (mode) => {
  const controller = new AbortController()
  const source = deferred<string>()
  const observation = { value: 'pending' }
  if (mode === 'pre-aborted') controller.abort()
  const pending = abortableTrial(source.promise, controller.signal)
  const consumed = pending.then(
    () => {
      observation.value = 'resolved'
    },
    (error) => {
      observation.value = error.name
    },
  )
  try {
    if (mode === 'in-flight') controller.abort()
    await drain()
    expect(observation.value).toBe('AbortError')
    expect(source.settled()).toBe(false)
  } finally {
    controller.abort()
    source.resolve('late')
    await source.promise
    await consumed
  }
  expect(observation.value).toBe('AbortError')
})
test('abortableTrial preserves success and the exact source rejection', async () => {
  const value = { answer: 42 },
    failure = new Error('source failed')
  await expect(abortableTrial(Promise.resolve(value), new AbortController().signal)).resolves.toBe(
    value,
  )
  await expect(abortableTrial(Promise.reject(failure), new AbortController().signal)).rejects.toBe(
    failure,
  )
})
test('readText/readJson use frozen bytes after source mutation and seal rejects uncached paths', async () => {
  const files = { 'a.txt': 'hello', 'b.json': '{"n":7}' }
  const snapshot = createTrialFileSnapshot(memorySource(files), new AbortController().signal)
  try {
    expect(await snapshot.source.readText('a.txt')).toBe('hello')
    expect(await snapshot.source.readJson('b.json')).toEqual({ n: 7 })
    files['a.txt'] = 'changed'
    files['b.json'] = '{"n":99}'
    snapshot.seal()
    const cachedBytes = await snapshot.source.readBytes('a.txt').then(
      (bytes) => ({ value: new TextDecoder().decode(bytes) }),
      (error) => ({ error: error.message }),
    )
    expect(cachedBytes).toEqual({ value: 'hello' })
    expect(await snapshot.source.readText('a.txt')).toBe('hello')
    expect(await snapshot.source.readJson('b.json')).toEqual({ n: 7 })
    await expect(snapshot.source.readText('new.txt')).rejects.toThrow('未冻结资源 new.txt')
    await expect(snapshot.source.readJson('new.json')).rejects.toThrow('未冻结资源 new.json')
  } finally {
    snapshot.dispose()
  }
  await expect(snapshot.source.readText('a.txt')).rejects.toMatchObject({ name: 'AbortError' })
})
test('readText aborts while the same byte read is pending and late bytes never restore access', async () => {
  const controller = new AbortController(),
    gate = deferred<ArrayBuffer>(),
    entered = deferred<void>()
  const events: string[] = []
  const sourceRead = gate.promise.then((bytes) => {
    events.push('read-completed')
    return bytes
  })
  const source: FileSource = {
    ...memorySource({}),
    readBytes: () => {
      events.push('read-entered')
      entered.resolve()
      return sourceRead
    },
  }
  const snapshot = createTrialFileSnapshot(source, controller.signal)
  const observation = { value: 'pending' }
  const pending = snapshot.source.readText('slow.txt')
  const consumed = pending.then(
    () => {
      observation.value = 'resolved'
    },
    (error) => {
      observation.value = error.name
    },
  )
  try {
    expect(entered.settled()).toBe(true)
    controller.abort()
    await drain()
    expect(events).toEqual(['read-entered'])
    expect(observation.value).toBe('AbortError')
    expect(gate.settled()).toBe(false)
  } finally {
    controller.abort()
    snapshot.dispose()
    gate.resolve(utf8('late'))
    await sourceRead
    await consumed
    await drain()
  }
  expect(events).toEqual(['read-entered', 'read-completed'])
  expect(observation.value).toBe('AbortError')
  await expect(snapshot.source.readText('slow.txt')).rejects.toMatchObject({ name: 'AbortError' })
})
