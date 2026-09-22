/** W2-B: production snapshot wrappers, controlled cancellation, no unreleaseable promises. */

import type { ActorDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  installTrialChromeHost,
  readyTrialFixture,
} from './__tests__/coverage-wave2/b-trial-catalog.js'
import { deferred } from './__tests__/glm-runtime-contract-fixtures.js'
import {
  abortableTrial,
  createTrialFileSnapshot,
  prepareBattleTrialAssets,
} from './battle-trial-assets.js'
import type { FileSource } from './file-source.js'
import { PROJECT_SAVE_STATE_PATH } from './project-save-state.js'

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

test('complete trial preparation freezes real project resources and dispose closes only project-owned bitmaps', async () => {
  const f = await readyTrialFixture(),
    host = installTrialChromeHost(f.faceHash)
  const before = structuredClone({ files: f.files, config: f.config, actors: f.project.actorsById })
  let ready: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    ready = await prepareBattleTrialAssets(
      f.project,
      f.config,
      f.token,
      new AbortController().signal,
      f.revision,
    )
    expect(ready.prepared.world.party.map((member) => member.id)).toEqual(['hero'])
    expect(ready.prepared.world.money).toBe(100)
    expect(ready.prepared.players[0]!.skills).toEqual(['trial-spark'])
    expect(ready.prepared.players[0]!.mp).toBe(20)
    expect(Object.keys(ready.assets.fireSprites)).toEqual(['0'])
    expect(ready.assets.glyphs.size).toBeGreaterThan(0)
    expect(ready.project.source).not.toBe(f.project.source)
    const face = host.bitmaps.filter((bitmap) => bitmap.face)
    expect(face).toHaveLength(1)
    expect(face[0]!.close).not.toHaveBeenCalled()
    const frozen = new Uint8Array(await ready.project.source.readBytes(f.facePath))
    expect(frozen).toEqual(new Uint8Array(f.files[f.facePath] as ArrayBuffer))
    expect({ files: f.files, config: f.config, actors: f.project.actorsById }).toEqual(before)
    ready.dispose()
    expect(face[0]!.close).toHaveBeenCalledTimes(1)
    expect(
      host.bitmaps
        .filter((bitmap) => !bitmap.face)
        .every((bitmap) => bitmap.close.mock.calls.length === 0),
    ).toBe(true)
    const closed = await ready.project.source.readBytes(f.facePath).then(
      () => 'accepted',
      (error) => error.name,
    )
    expect(closed).toBe('AbortError')
  } finally {
    ready?.dispose()
    host.restore()
  }
})
test.each([
  'save-token',
  'revision',
] as const)('trial preparation rejects wrong %s before any asset IO', async (axis) => {
  const f = await readyTrialFixture(),
    host = installTrialChromeHost(f.faceHash)
  try {
    const outcome = await prepareBattleTrialAssets(
      f.project,
      f.config,
      axis === 'save-token' ? 'wrong-token' : f.token,
      new AbortController().signal,
      axis === 'revision' ? 'wrong-revision' : f.revision,
    ).then(
      (ready) => {
        ready.dispose()
        return 'accepted'
      },
      (error) => error.message,
    )
    expect(outcome).toBe(
      axis === 'save-token'
        ? '工程已变化，请保存后重新发起试打'
        : '工程战斗数据已变化，请从编辑器重新开始',
    )
    expect(f.binaryReads).toEqual([])
    expect(host.bitmaps).toEqual([])
  } finally {
    host.restore()
  }
})
test.each([
  'save-token',
  'data',
] as const)('post-resource %s drift rejects and releases already-created project bitmaps', async (axis) => {
  const f = await readyTrialFixture(),
    originalAttack = f.project.actorsById.hero!.battler!.baseStats.attack
  let mutations = 0
  const host = installTrialChromeHost(f.faceHash, () => {
    mutations++
    if (axis === 'save-token')
      f.files[PROJECT_SAVE_STATE_PATH] = {
        kind: 'type-pal-author-save',
        version: 1,
        operationId: '11111111-1111-4111-8111-111111111111',
        phase: 'committed',
        planHash: 'a'.repeat(64),
      }
    else (f.files['content/actors.json'] as ActorDef[])[0]!.battler!.baseStats.attack++
  })
  let accepted: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    const outcome = await prepareBattleTrialAssets(
      f.project,
      f.config,
      f.token,
      new AbortController().signal,
      f.revision,
    ).then(
      (ready) => {
        accepted = ready
        return 'accepted'
      },
      (error) => error.message,
    )
    expect(mutations).toBe(1)
    expect(outcome).toBe(
      axis === 'save-token'
        ? '资源准备期间工程已变化，请重新试打'
        : '资源准备期间战斗数据已被修改，请重新试打',
    )
    const faces = host.bitmaps.filter((bitmap) => bitmap.face)
    expect(faces).toHaveLength(1)
    expect(faces[0]!.close).toHaveBeenCalledTimes(1)
    expect(f.project.actorsById.hero!.battler!.baseStats.attack).toBe(originalAttack)
  } finally {
    accepted?.dispose()
    host.restore()
  }
})
test('real project resource IO rejection never returns a prepared trial', async () => {
  const f = await readyTrialFixture(),
    host = installTrialChromeHost(f.faceHash)
  const before = structuredClone(f.files)
  f.hooks.read = (path) => {
    if (path === f.facePath) throw new Error('face IO unavailable')
  }
  let accepted: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    const outcome = await prepareBattleTrialAssets(
      f.project,
      f.config,
      f.token,
      new AbortController().signal,
      f.revision,
    ).then(
      (ready) => {
        accepted = ready
        return 'accepted'
      },
      (error) => error.message,
    )
    expect(outcome).toContain('face IO unavailable')
    expect(accepted).toBeUndefined()
    expect(host.bitmaps.filter((bitmap) => bitmap.face)).toEqual([])
    expect(f.files).toEqual(before)
  } finally {
    accepted?.dispose()
    host.restore()
  }
})
