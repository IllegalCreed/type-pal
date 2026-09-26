import * as fs from 'node:fs'
import { resolve } from 'node:path'
import { validateAssetCatalog } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { diskTree, imageRecord, ownedFixture, png, put } from './__tests__/pal-asset-fixtures.js'
import { materializePalAssets } from './pal-assets.js'

// Real filesystem operations, only observations on its public boundary; product core is not mocked.
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
}))
afterEach(() => vi.restoreAllMocks())
function writeObservers() {
  return [
    vi.spyOn(fs, 'mkdirSync'),
    vi.spyOn(fs, 'openSync'),
    vi.spyOn(fs, 'writeFileSync'),
    vi.spyOn(fs, 'renameSync'),
    vi.spyOn(fs, 'unlinkSync'),
  ]
}
function rejectUnchanged(f: ReturnType<typeof ownedFixture>, message: string | RegExp) {
  validateAssetCatalog(f.catalog)
  const args = { repo: f.repo, catalog: f.catalog, binaries: f.sources }
  const input = structuredClone(args)
  const disk = diskTree(f.repo)
  const writes = writeObservers()
  expect(() => materializePalAssets(args)).toThrow(message)
  expect(args).toEqual(input)
  expect(diskTree(f.repo)).toEqual(disk)
  for (const spy of writes) expect(spy).not.toHaveBeenCalled()
}

describe('PAL asset materialization ownership boundaries', () => {
  test('source IDs must be unique even for equal records and bytes', () => {
    const f = ownedFixture()
    f.sources.push(structuredClone(f.sources[0]!))
    rejectUnchanged(f, 'PAL 二进制迁移源存在重复 AssetId')
  })
  test('a source absent from the target catalog rejects the whole batch', () => {
    const f = ownedFixture()
    delete f.catalog.assets.b
    rejectUnchanged(f, 'PAL catalog 缺迁移资源 b')
  })
  test.each([
    'kind',
    'mediaType',
    'bytes',
    'sha256',
  ] as const)('rejects target-controlled %s drift before writing the valid first source', (key) => {
    const f = ownedFixture()
    const record = f.catalog.assets.b!
    switch (key) {
      case 'kind':
        record.kind = 'face'
        break
      case 'mediaType':
        record.mediaType = 'image/x-png'
        break
      case 'bytes':
        record.bytes++
        break
      case 'sha256':
        record.sha256 = '0'.repeat(64)
        break
    }
    rejectUnchanged(f, `迁移资源 b.${key} 被非 authored 记录改写`)
  })
  test('a presentation label change is allowed without replacing source ownership', () => {
    const f = ownedFixture()
    f.catalog.assets.b!.label = '作者显示名'
    const args = { repo: f.repo, catalog: f.catalog, binaries: f.sources }
    const before = structuredClone(args)
    expect(materializePalAssets(args)).toEqual({
      written: 2,
      unchanged: 0,
      authored: 0,
      files: 2,
      bytes: 2 * f.bytes.length,
    })
    for (const record of Object.values(f.catalog.assets))
      expect(fs.readFileSync(resolve(f.repo, 'projects/pal', record.path))).toEqual(
        Buffer.from(f.bytes),
      )
    expect(args).toEqual(before)
  })
  test('same-length second source hash corruption rejects before any first-source write', () => {
    const f = ownedFixture()
    const second = f.sources[1]!
    if (second.bytes === undefined) throw new Error('fixture must be generated source')
    second.bytes[second.bytes.length - 1] = second.bytes[second.bytes.length - 1]! ^ 1
    rejectUnchanged(f, '迁移源 b 的 bytes/hash 与 catalog 记录不符')
  })
  test('file-backed second source is re-read and hash-checked, not trusted by recorded length', () => {
    const f = ownedFixture()
    const sourcePath = put(f.repo, 'extracted/b.png', f.bytes)
    f.sources[1] = { id: 'b', sourcePath, record: f.sources[1]!.record }
    const changed = f.bytes.slice()
    changed[changed.length - 1] = changed[changed.length - 1]! ^ 1
    put(f.repo, 'extracted/b.png', changed)
    rejectUnchanged(f, '迁移源 b 的 bytes/hash 与 catalog 记录不符')
  })
  test('missing file-backed source rejects before any target write', () => {
    const f = ownedFixture()
    f.sources[1] = {
      id: 'b',
      sourcePath: resolve(f.repo, 'absent.png'),
      record: f.sources[1]!.record,
    }
    rejectUnchanged(f, /ENOENT/)
  })
  test.each([
    'authored',
    'generated',
  ] as const)('catalog-only %s data survives and contributes to final closure', (kind) => {
    const f = ownedFixture()
    const bytes = png(1, 1, [9, 8, 7, 255])
    const record = imageRecord(`assets/${kind}/only.png`, bytes, { kind })
    f.catalog.assets.only = record
    put(f.repo, `projects/pal/${record.path}`, bytes)
    const args = { repo: f.repo, catalog: f.catalog, binaries: f.sources }
    const before = structuredClone(args)
    expect(materializePalAssets(args)).toEqual({
      written: 2,
      unchanged: 0,
      authored: 0,
      files: 3,
      bytes: 2 * f.bytes.length + bytes.length,
    })
    expect(fs.readFileSync(resolve(f.repo, 'projects/pal', record.path))).toEqual(bytes)
    expect(args).toEqual(before)
  })
  test.each([
    'legacy-migrated',
    'licensed',
  ] as const)('catalog-only %s has no authority to materialize', (kind) => {
    const f = ownedFixture()
    const record = imageRecord(
      `assets/${kind === 'licensed' ? 'runtime' : 'migrated'}/only.png`,
      f.bytes,
      { kind },
    )
    f.catalog.assets.only = record
    put(f.repo, `projects/pal/${record.path}`, f.bytes)
    rejectUnchanged(f, '未知迁移所有权资源 only')
  })
  test.each([
    'absent',
    'length',
    'hash',
  ] as const)('catalog-only generated %s failure rejects before source writes', (axis) => {
    const f = ownedFixture()
    const record = imageRecord('assets/generated/only.png', f.bytes, { kind: 'generated' })
    f.catalog.assets.only = record
    const changed = f.bytes.slice()
    changed[changed.length - 1] = changed[changed.length - 1]! ^ 1
    if (axis !== 'absent')
      put(f.repo, `projects/pal/${record.path}`, axis === 'length' ? changed.subarray(1) : changed)
    rejectUnchanged(
      f,
      axis === 'absent'
        ? '资源文件不存在'
        : axis === 'length'
          ? '资源 bytes 不符'
          : '资源 sha256 不符',
    )
  })
  test('authored takeover does not even read a missing migration source', () => {
    const f = ownedFixture()
    const authored = png(1, 1, [9, 8, 7, 255])
    f.catalog.assets.b = imageRecord('assets/authored/replacement.png', authored, {
      kind: 'authored',
    })
    put(f.repo, 'projects/pal/assets/authored/replacement.png', authored)
    f.sources[1] = {
      id: 'b',
      sourcePath: resolve(f.repo, 'missing-migration-source.png'),
      record: f.sources[1]!.record,
    }
    const args = { repo: f.repo, catalog: f.catalog, binaries: f.sources }
    const before = structuredClone(args)
    const reads = vi.spyOn(fs, 'readFileSync')
    expect(materializePalAssets(args)).toEqual({
      written: 1,
      unchanged: 0,
      authored: 1,
      files: 2,
      bytes: f.bytes.length + authored.length,
    })
    expect(
      reads.mock.calls.some((call) => String(call[0]).endsWith('missing-migration-source.png')),
    ).toBe(false)
    expect(
      fs.readFileSync(resolve(f.repo, 'projects/pal/assets/authored/replacement.png')),
    ).toEqual(authored)
    expect(args).toEqual(before)
  })
  test('authored takeover still validates the authored bytes before writing other sources', () => {
    const f = ownedFixture()
    f.catalog.assets.b = imageRecord('assets/authored/replacement.png', f.bytes, {
      kind: 'authored',
    })
    const bad = f.bytes.slice()
    bad[bad.length - 1] = bad[bad.length - 1]! ^ 1
    put(f.repo, 'projects/pal/assets/authored/replacement.png', bad)
    rejectUnchanged(f, '资源 sha256 不符')
  })
  test('same-size stale target is replaced, then replay performs no writing IO', () => {
    const f = ownedFixture()
    const bad = f.bytes.slice()
    bad[bad.length - 1] = bad[bad.length - 1]! ^ 1
    put(f.repo, 'projects/pal/assets/migrated/a.png', bad)
    const args = { repo: f.repo, catalog: f.catalog, binaries: f.sources }
    const before = structuredClone(args)
    expect(materializePalAssets(args).written).toBe(2)
    expect(fs.readFileSync(resolve(f.repo, 'projects/pal/assets/migrated/a.png'))).toEqual(
      Buffer.from(f.bytes),
    )
    const disk = diskTree(f.repo)
    const writes = writeObservers()
    expect(materializePalAssets(args)).toEqual({
      written: 0,
      unchanged: 2,
      authored: 0,
      files: 2,
      bytes: 2 * f.bytes.length,
    })
    for (const spy of writes) expect(spy).not.toHaveBeenCalled()
    expect(diskTree(f.repo)).toEqual(disk)
    expect(args).toEqual(before)
  })
  test('empty catalog produces exact zero totals and no IO mutation', () => {
    const f = ownedFixture()
    const disk = diskTree(f.repo)
    const writes = writeObservers()
    expect(
      materializePalAssets({ repo: f.repo, catalog: { version: 1, assets: {} }, binaries: [] }),
    ).toEqual({ written: 0, unchanged: 0, authored: 0, files: 0, bytes: 0 })
    expect(diskTree(f.repo)).toEqual(disk)
    for (const spy of writes) expect(spy).not.toHaveBeenCalled()
  })
})
