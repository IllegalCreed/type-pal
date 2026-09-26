import { type AssetCatalogV1, validateAssetCatalog } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { imageRecord, png, put, readOnly, tempRepo } from './__tests__/pal-asset-fixtures.js'
import { planPalAssetRetirements } from './pal-assets.js'

function fixture() {
  const repo = tempRepo()
  const bytes = Uint8Array.from(png())
  const previousCatalog: AssetCatalogV1 = {
    version: 1,
    assets: {
      z: imageRecord('assets/migrated/z.png', bytes),
      b: imageRecord('assets/migrated/a.png', bytes),
      a: imageRecord('assets/migrated/a.png', bytes),
    },
  }
  const targetCatalog: AssetCatalogV1 = { version: 1, assets: {} }
  for (const record of Object.values(previousCatalog.assets))
    put(repo, `projects/pal/${record.path}`, bytes)
  const args = { repo, previousCatalog, targetCatalog }
  const run = () => {
    validateAssetCatalog(previousCatalog)
    validateAssetCatalog(targetCatalog)
    const before = structuredClone(args)
    try {
      return readOnly(repo, () => planPalAssetRetirements(args))
    } finally {
      expect(args).toEqual(before)
    }
  }
  return { ...args, bytes, run }
}
describe('PAL retirement planning boundaries', () => {
  test('sorts by path then stable ID without changing source insertion order or files', () => {
    const f = fixture()
    expect(f.run()).toEqual(
      ['a', 'b', 'z'].map((id) => ({
        id,
        path: f.previousCatalog.assets[id]!.path,
        expectedSha256: f.previousCatalog.assets[id]!.sha256,
      })),
    )
    expect(Object.keys(f.previousCatalog.assets)).toEqual(['z', 'b', 'a'])
  })
  test('already absent legacy file is not scheduled for deletion', () => {
    const f = fixture()
    f.previousCatalog.assets.missing = imageRecord('assets/migrated/missing.png', f.bytes)
    expect(f.run().map((row) => row.id)).toEqual(['a', 'b', 'z'])
  })
  test('same-length changed old file rejects instead of authorizing deletion by size alone', () => {
    const f = fixture()
    const bad = f.bytes.slice()
    bad[bad.length - 1] = bad[bad.length - 1]! ^ 1
    put(f.repo, 'projects/pal/assets/migrated/z.png', bad)
    expect(f.run).toThrow('资源 sha256 不符')
  })
  test('new stable ID retaining a path protects every old alias without reading changed retained bytes', () => {
    const f = fixture()
    f.targetCatalog.assets.newId = structuredClone(f.previousCatalog.assets.a!)
    put(
      f.repo,
      'projects/pal/assets/migrated/a.png',
      'retained bytes now belong to the target plan',
    )
    expect(f.run()).toEqual([
      {
        id: 'z',
        path: 'assets/migrated/z.png',
        expectedSha256: f.previousCatalog.assets.z!.sha256,
      },
    ])
  })
  test.each([
    'generated',
    'licensed',
  ] as const)('does not claim %s ownership even when old file is absent', (kind) => {
    const f = fixture()
    f.previousCatalog.assets.other = imageRecord(
      `assets/${kind === 'licensed' ? 'runtime' : kind}/other.png`,
      f.bytes,
      { kind },
    )
    expect(f.run().map((row) => row.id)).toEqual(['a', 'b', 'z'])
  })
})
