import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import { dirname, join } from 'node:path'
import { type AssetCatalogV1, validateAssetCatalog } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { guardFixture, put, tree } from './__tests__/migration-guard-fixture.js'
import { sha256 } from './migration-baseline.js'
import { materializePalAssets, type PalBinaryAssetSource } from './pal-assets.js'

vi.mock('node:fs', async (original) => ({ ...(await original<typeof fs>()) }))
vi.mock('node:crypto', async (original) => ({ ...(await original<typeof crypto>()) }))
const native = await vi.importActual<typeof fs>('node:fs')
const roots: string[] = []
afterEach(() => {
  vi.restoreAllMocks()
  for (const root of roots.splice(0)) native.rmSync(root, { recursive: true, force: true })
})
function fixture() {
  const f = guardFixture()
  roots.push(f.root)
  // The materializer's contract is opaque source bytes/catalog, not video decoding.
  const bytes = Buffer.from('exact source bytes')
  const record = {
    kind: 'video' as const,
    path: 'assets/migrated/videos/a.mp4',
    mediaType: 'video/mp4',
    bytes: bytes.length,
    sha256: sha256(bytes),
    origin: { kind: 'legacy-migrated' as const },
  }
  const catalog: AssetCatalogV1 = { version: 1, assets: { a: record } }
  validateAssetCatalog(catalog)
  const source: PalBinaryAssetSource = { id: 'a', record, bytes }
  const destination = join(f.repo, 'projects/pal', record.path)
  const run = () => materializePalAssets({ repo: f.repo, catalog, binaries: [source] })
  return { ...f, bytes, record, catalog, source, destination, run }
}

test.each([
  'parent',
  'deep-parent',
  'dangling-parent',
  'leaf',
  'dangling-leaf',
] as const)('rejects native %s links before resource mutation and preserves the whole fixture', (variant) => {
  const f = fixture()
  put(join(f.outside, 'a.mp4'), 'outside-original')
  const leaf = variant.endsWith('leaf')
  const link = leaf
    ? f.destination
    : variant === 'deep-parent'
      ? join(f.repo, 'projects')
      : dirname(f.destination)
  native.mkdirSync(dirname(link), { recursive: true })
  native.symlinkSync(
    variant.startsWith('dangling')
      ? join(f.outside, 'missing')
      : leaf
        ? join(f.outside, 'a.mp4')
        : f.outside,
    link,
  )
  const before = tree(f.root)
  const write = vi.spyOn(fs, 'writeFileSync')
  const mkdir = vi.spyOn(fs, 'mkdirSync')
  const rename = vi.spyOn(fs, 'renameSync')
  expect(f.run).toThrow(/符号链接/)
  expect(write).not.toHaveBeenCalled()
  expect(mkdir).not.toHaveBeenCalled()
  expect(rename).not.toHaveBeenCalled()
  expect(tree(f.root)).toEqual(before)
})

test('a bad later catalog path prevents writes of an earlier good resource', () => {
  const f = fixture()
  const second = { ...f.record, path: 'assets/migrated/linked/b.mp4' }
  const catalog = { version: 1 as const, assets: { a: f.record, b: second } }
  validateAssetCatalog(catalog)
  native.mkdirSync(join(f.repo, 'projects/pal/assets/migrated'), { recursive: true })
  native.symlinkSync(f.outside, join(f.repo, 'projects/pal/assets/migrated/linked'))
  const before = tree(f.root)
  expect(() =>
    materializePalAssets({
      repo: f.repo,
      catalog,
      binaries: [f.source, { id: 'b', record: second, bytes: f.bytes }],
    }),
  ).toThrow(/符号链接/)
  expect(tree(f.root)).toEqual(before)
})

test('normal write, unchanged replay, and authored ownership retain exact bytes', () => {
  const f = fixture()
  expect(f.run()).toEqual({
    written: 1,
    unchanged: 0,
    authored: 0,
    files: 1,
    bytes: f.bytes.length,
  })
  expect(native.readFileSync(f.destination)).toEqual(f.bytes)
  const before = tree(f.root)
  expect(f.run()).toEqual({
    written: 0,
    unchanged: 1,
    authored: 0,
    files: 1,
    bytes: f.bytes.length,
  })
  expect(tree(f.root)).toEqual(before)
  const authoredPath = 'assets/authored/videos/a.mp4'
  f.catalog.assets.a = { ...f.record, path: authoredPath, origin: { kind: 'authored' } }
  put(join(f.repo, 'projects/pal', authoredPath), f.bytes)
  const authoredBefore = tree(f.root)
  expect(f.run()).toEqual({
    written: 0,
    unchanged: 0,
    authored: 1,
    files: 1,
    bytes: f.bytes.length,
  })
  expect(tree(f.root)).toEqual(authoredBefore)
})

test('a native dangling temporary link is rejected without deleting the link or touching its target', () => {
  const f = fixture()
  const uuid = '00000000-0000-4000-8000-000000000001'
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(uuid)
  const temporary = `${f.destination}.tmp-${uuid}`
  native.mkdirSync(dirname(temporary), { recursive: true })
  native.symlinkSync(join(f.outside, 'missing'), temporary)
  const before = tree(f.root)
  expect(f.run).toThrow(/符号链接/)
  expect(tree(f.root)).toEqual(before)
})

test('a late directory swap after mkdir is detected before temporary write', () => {
  const f = fixture()
  let injected = false
  vi.spyOn(fs, 'mkdirSync').mockImplementation((...args) => {
    const result = native.mkdirSync(...args)
    if (String(args[0]) === dirname(f.destination) && !injected) {
      injected = true
      native.renameSync(dirname(f.destination), `${dirname(f.destination)}.original`)
      native.symlinkSync(f.outside, dirname(f.destination))
    }
    return result
  })
  const outsideBefore = tree(f.outside)
  expect(f.run).toThrow(/符号链接/)
  expect(injected).toBe(true)
  expect(tree(f.outside)).toEqual(outsideBefore)
})

test('a directory swap while reading the old target is rejected before mkdir', () => {
  const f = fixture()
  put(f.destination, 'old bytes')
  let injected = false
  vi.spyOn(fs, 'readFileSync').mockImplementation((...args) => {
    const result = native.readFileSync(...args)
    if (String(args[0]) === f.destination && !injected) {
      injected = true
      native.renameSync(dirname(f.destination), `${dirname(f.destination)}.original`)
      native.symlinkSync(f.outside, dirname(f.destination))
    }
    return result
  })
  const mkdir = vi.spyOn(fs, 'mkdirSync')
  expect(f.run).toThrow(/符号链接/)
  expect(injected).toBe(true)
  expect(mkdir).not.toHaveBeenCalled()
  expect(tree(f.outside)).toEqual({})
})

test('a swap after temporary write stops rename and never cleans through the replacement link', () => {
  const f = fixture()
  let injected = false
  const outsideBefore = tree(f.outside)
  vi.spyOn(fs, 'writeFileSync').mockImplementation((...args) => {
    const result = native.writeFileSync(...args)
    if (!injected) {
      injected = true
      native.renameSync(dirname(f.destination), `${dirname(f.destination)}.original`)
      native.symlinkSync(f.outside, dirname(f.destination))
    }
    return result
  })
  const rename = vi.spyOn(fs, 'renameSync')
  const unlink = vi.spyOn(fs, 'unlinkSync')
  const rm = vi.spyOn(fs, 'rmSync')
  expect(f.run).toThrow(/符号链接/)
  expect(injected).toBe(true)
  expect(rename).not.toHaveBeenCalled()
  expect(unlink).not.toHaveBeenCalled()
  expect(rm).not.toHaveBeenCalled()
  expect(tree(f.outside)).toEqual(outsideBefore)
  expect(native.readdirSync(`${dirname(f.destination)}.original`)).toHaveLength(1)
})

test('write failure closes the descriptor, removes only its own temporary file and preserves the original error', () => {
  const f = fixture()
  native.mkdirSync(dirname(f.destination), { recursive: true })
  const before = tree(f.root)
  const failure = new Error('injected write failure')
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
    throw failure
  })
  const close = vi.spyOn(fs, 'closeSync')
  const unlink = vi.spyOn(fs, 'unlinkSync')
  let caught: unknown
  try {
    f.run()
  } catch (error) {
    caught = error
  }
  expect(caught).toBe(failure)
  expect(close).toHaveBeenCalledTimes(1)
  expect(unlink).toHaveBeenCalledTimes(1)
  expect(tree(f.root)).toEqual(before)
})

test('exclusive temporary open does not delete a pre-existing regular file', () => {
  const f = fixture()
  const uuid = '00000000-0000-4000-8000-000000000002'
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(uuid)
  put(`${f.destination}.tmp-${uuid}`, 'not-owned')
  const before = tree(f.root)
  expect(f.run).toThrow(/EEXIST/)
  expect(tree(f.root)).toEqual(before)
})

test('cleanup does not delete a replacement inode after failure', () => {
  const f = fixture()
  const uuid = '00000000-0000-4000-8000-000000000003'
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(uuid)
  const temporary = `${f.destination}.tmp-${uuid}`
  const failure = new Error('write interrupted')
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
    native.renameSync(temporary, `${temporary}.ours`)
    native.writeFileSync(temporary, 'external replacement')
    throw failure
  })
  const unlink = vi.spyOn(fs, 'unlinkSync')
  expect(f.run).toThrow(failure)
  expect(unlink).not.toHaveBeenCalled()
  expect(native.readFileSync(temporary, 'utf8')).toBe('external replacement')
})
