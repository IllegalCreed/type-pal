import { type FileSource, loadCurrentProjectFrom } from '@type-pal/reforge'
import { expect, test, vi } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../../editor/src/core/__tests__/battle-trial-project.js'
import {
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from '../../editor/src/core/battle-simulator-library.js'
import { createTrialFileSnapshot, prepareBattleTrialAssets } from '../src/battle-trial-assets.js'

test('frozen bytes detach the source and every consumer; seal forbids uncached project IO', async () => {
  const bytes = new Uint8Array([1, 2, 3])
  const read = vi.fn(async () => bytes.buffer)
  const source: FileSource = {
    readBytes: read,
    readText: async () => '',
    readJson: async () => {
      throw Error('unexpected')
    },
    urlFor: async () => {
      throw Error('unexpected')
    },
  }
  const snapshot = createTrialFileSnapshot(source, new AbortController().signal)
  const first = await snapshot.source.readBytes('one')
  snapshot.seal()
  bytes[0] = 8
  new Uint8Array(first)[1] = 9
  expect([...new Uint8Array(await snapshot.source.readBytes('one'))]).toEqual([1, 2, 3])
  await expect(snapshot.source.readBytes('two')).rejects.toThrow('未冻结资源')
  await expect(snapshot.source.urlFor('one')).rejects.toThrow('仅消费已冻结')
  expect(read).toHaveBeenCalledTimes(1)
  snapshot.dispose()
  snapshot.dispose()
  await expect(snapshot.source.readBytes('one')).rejects.toMatchObject({ name: 'AbortError' })
  expect(read).toHaveBeenCalledTimes(1)
})
test('cancel in-flight IO settles before an ignoring reader; late bytes cannot revive the snapshot', async () => {
  let release!: (value: ArrayBuffer) => void
  let entered!: () => void
  const entry = new Promise<void>((r) => {
    entered = r
  })
  const source: FileSource = {
    readBytes: vi.fn(() => {
      entered()
      return new Promise<ArrayBuffer>((r) => {
        release = r
      })
    }),
    readText: async () => '',
    readJson: async () => {
      throw Error('unexpected')
    },
    urlFor: async () => {
      throw Error('unexpected')
    },
  }
  const controller = new AbortController(),
    snapshot = createTrialFileSnapshot(source, controller.signal)
  let outcome: unknown
  const pending = snapshot.source.readBytes('one').then(
    (v) => {
      outcome = v
    },
    (e) => {
      outcome = e
    },
  )
  await entry
  controller.abort()
  await pending
  expect(outcome).toMatchObject({ name: 'AbortError' })
  snapshot.dispose()
  release(new Uint8Array([4, 5]).buffer)
  await Promise.resolve()
  await expect(snapshot.source.readBytes('one')).rejects.toMatchObject({ name: 'AbortError' })
  expect(source.readBytes).toHaveBeenCalledTimes(1)
})
test.each([
  'bytes',
  'sha256',
] as const)('catalog %s mismatch fails, same original input succeeds', async (field) => {
  const files = await battleTrialProjectFiles()
  const source = fixtureSource(files),
    project = await loadCurrentProjectFrom(source)
  const record = Object.values(project.assetCatalog.assets).find((a) => a.kind === 'battle-sprite')!
  const expected = new Uint8Array(await source.readBytes(record.path))
  const bad = structuredClone(project.assetCatalog)
  const changed = Object.values(bad.assets).find((a) => a.path === record.path)!
  if (field === 'bytes') changed.bytes++
  else changed.sha256 = '0'.repeat(64)
  const badSnapshot = createTrialFileSnapshot(source, new AbortController().signal, bad)
  await expect(badSnapshot.source.readBytes(record.path)).rejects.toThrow('catalog登记不符')
  badSnapshot.dispose()
  const good = createTrialFileSnapshot(source, new AbortController().signal, project.assetCatalog)
  expect(new Uint8Array(await good.source.readBytes(record.path))).toEqual(expected)
  good.dispose()
})
test('pre-aborted preparation does no project IO or session preparation', async () => {
  const files = await battleTrialProjectFiles(),
    project = await loadCurrentProjectFrom(fixtureSource(files))
  const config = resolveBattleSimulatorPlan(
    parseBattleSimulatorLibrary(files['editor/battle-simulator.json']),
    'basic',
  )
  const readJson = vi.spyOn(project.source, 'readJson'),
    readBytes = vi.spyOn(project.source, 'readBytes')
  const controller = new AbortController()
  controller.abort()
  await expect(
    prepareBattleTrialAssets(project, config, 'unused', controller.signal, 'unused'),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(readJson).not.toHaveBeenCalled()
  expect(readBytes).not.toHaveBeenCalled()
})
