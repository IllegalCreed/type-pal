// @ts-expect-error Node digest oracle in the ES-only content package.
import { createHash } from 'node:crypto'
import { describe, expect, test, vi } from 'vitest'
import { spriteAssetRecord } from './__tests__/asset-catalog-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  type AssetCatalogV1,
  type AssetReference,
  collectAssetReferences,
  groupAssetReferencesBySite,
  validateAssetCatalog,
  validateAssetFileClosure,
  validateAssetReferenceClosure,
  validateManifestAssetConfig,
} from './asset.js'
import type { AuthorSceneDef } from './author-scene.js'
import { validateAuthorScenes, validateAuthorSharedScripts } from './validate-author.js'

function spriteReference(asset: string, where: string): AssetReference {
  return { asset, where, expectedKind: 'sprite', site: where }
}

test('groups repeated music commands at the same author site and preserves distinct scene slots', () => {
  const scene = {
    id: 's',
    music: 'music.m1',
    battleMusic: 'music.m1',
    mapId: 'map-s',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    hooks: {
      onEnter: {
        initial: 'main',
        variants: {
          main: {
            label: '进场',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'arrival',
              stages: [
                {
                  id: 'arrival',
                  body: [
                    { kind: 'playMusic', asset: 'music.m1' },
                    { kind: 'setFlag', flag: 'music.m1', value: true },
                    { kind: 'playMusic', asset: 'music.m1' },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    entities: [],
  } satisfies AuthorSceneDef
  validateAuthorScenes([scene])
  const references = collectAssetReferences({ scenes: [scene] })
  const hookBody = 'scenes[0].hooks.onEnter.variants["main"].flow.stages[0].body'

  expect(references.map(({ asset, expectedKind, where }) => [asset, expectedKind, where])).toEqual([
    ['music.m1', 'music', 'scenes[0].music'],
    ['music.m1', 'music', 'scenes[0].battleMusic'],
    ['music.m1', 'music', `${hookBody}[0].asset`],
    ['music.m1', 'music', `${hookBody}[2].asset`],
  ])
  expect(
    groupAssetReferencesBySite(references).map(({ site, occurrences }) => [site, occurrences]),
  ).toEqual([
    ['scenes[0].music', 1],
    ['scenes[0].battleMusic', 1],
    ['scene:s:hook:onEnter:main', 2],
  ])
})

test('an external author visitor can own shared roots while the asset scan still includes manifest roles', () => {
  const catalog = validateAssetCatalog({
    version: 1,
    assets: {
      'video.intro': {
        kind: 'video',
        path: 'assets/runtime/intro.mp4',
        mediaType: 'video/mp4',
        bytes: 3,
        sha256: 'a'.repeat(64),
        origin: { kind: 'licensed' },
      },
    },
  })
  const assets = validateManifestAssetConfig(
    { catalog: 'assets/index.json', roles: { 'video.startupSplash': 'video.intro' } },
    catalog,
  )
  const sharedScripts = validateAuthorSharedScripts({
    'shared/user/sound-cue': {
      name: '出场音效',
      self: 'none',
      body: [{ kind: 'playSound', asset: 'sound.shared' }],
    },
  })
  const source = { assets, sharedScripts }
  const before = deepSnapshot(source)
  const manifest = {
    asset: 'video.intro',
    expectedKind: 'video',
    where: 'manifest.assets.roles.video.startupSplash',
    site: 'manifest.assets.roles.video.startupSplash',
    origin: { kind: 'manifest-role', role: 'video.startupSplash' },
  }
  expect(collectAssetReferences(source)).toEqual([
    manifest,
    {
      asset: 'sound.shared',
      expectedKind: 'sound',
      where: 'sharedScripts["shared/user/sound-cue"].body[0].asset',
      site: 'sharedScript:shared/user/sound-cue',
      origin: { kind: 'shared-script', id: 'shared/user/sound-cue' },
    },
  ])
  expect(collectAssetReferences({ ...source, includeCanonicalAuthorCommands: false })).toEqual([
    manifest,
  ])
  expect(source).toEqual(before)
})

describe('asset reference closure', () => {
  test('reports no issues for a reference to the only registered asset of the required kind', () => {
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: { 'sprite.x': spriteAssetRecord('sprite.x') },
    }
    expect(
      validateAssetReferenceClosure(catalog, [spriteReference('sprite.x', 'scene/s')]),
    ).toEqual([])
  })

  test('preserves missing and wrong-kind references alongside the unused asset warning', () => {
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        'sprite.x': spriteAssetRecord('sprite.x'),
        'sprite.y': spriteAssetRecord('sprite.y'),
      },
    }
    expect(
      validateAssetReferenceClosure(catalog, [
        spriteReference('ghost', 'scene/e1'),
        { ...spriteReference('sprite.x', 'scene/e2'), expectedKind: 'music' },
      ]),
    ).toEqual([
      {
        severity: 'error',
        code: 'missing-asset',
        where: 'scene/e1',
        message: 'AssetId "ghost" 不在 catalog',
      },
      {
        severity: 'error',
        code: 'kind-mismatch',
        where: 'scene/e2',
        message: 'AssetId "sprite.x" 期望 music，实际 sprite',
      },
      {
        severity: 'warn',
        code: 'unused-asset',
        where: 'assets["sprite.y"]',
        message: 'AssetId "sprite.y" 当前未被引用',
      },
    ])
  })
})

describe('asset file closure', () => {
  const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
  const references = [spriteReference('sprite.x', 'scene/s')]

  function spriteFile() {
    const bytes = Uint8Array.of(1, 2, 3, 4)
    const record = { ...spriteAssetRecord('sprite.x', sha256(bytes)), bytes: bytes.byteLength }
    return { bytes, record }
  }

  test('reads the registered path and verifies the returned bytes', async () => {
    const { bytes, record } = spriteFile()
    const input = validateAssetCatalog({ version: 1, assets: { 'sprite.x': record } })
    const readBytes = vi.fn(async () => bytes)
    const digest = vi.fn(sha256)
    expect(
      await validateAssetFileClosure(input, references, { readBytes, sha256: digest }),
    ).toEqual([])
    expect(readBytes.mock.calls).toEqual([['assets/generated/sprite.x.png']])
    expect(digest.mock.calls).toEqual([[bytes]])
  })

  test('reports only the byte mismatch when the digest is correct', async () => {
    const { bytes, record } = spriteFile()
    const input = validateAssetCatalog({
      version: 1,
      assets: { 'sprite.x': { ...record, bytes: 99 } },
    })
    expect(
      await validateAssetFileClosure(input, references, { readBytes: async () => bytes, sha256 }),
    ).toEqual([
      {
        severity: 'error',
        code: 'bytes-mismatch',
        where: 'assets["sprite.x"].bytes',
        message: '登记 99，实际 4',
      },
    ])
  })

  test('reports only the digest mismatch when the byte count is correct', async () => {
    const { bytes, record } = spriteFile()
    const wrongHash = 'b'.repeat(64)
    const input = validateAssetCatalog({
      version: 1,
      assets: { 'sprite.x': { ...record, sha256: wrongHash } },
    })
    expect(
      await validateAssetFileClosure(input, references, { readBytes: async () => bytes, sha256 }),
    ).toEqual([
      {
        severity: 'error',
        code: 'hash-mismatch',
        where: 'assets["sprite.x"].sha256',
        message: `登记 ${wrongHash}，实际 ${record.sha256}`,
      },
    ])
  })

  test('validates later records after a read error on an unused asset', async () => {
    const { bytes, record } = spriteFile()
    const input = validateAssetCatalog({
      version: 1,
      assets: {
        'sprite.a': { ...record, path: 'assets/generated/missing.png' },
        'sprite.x': { ...record, bytes: 3 },
        'sprite.z': { ...record, path: 'assets/generated/sprite.z.png', sha256: 'b'.repeat(64) },
      },
    })
    expect(
      await validateAssetFileClosure(
        input,
        [...references, spriteReference('sprite.z', 'scene/z')],
        {
          readBytes: async (path) => {
            if (path === 'assets/generated/missing.png') throw new Error('disk gone')
            return bytes
          },
          sha256,
        },
      ),
    ).toEqual([
      {
        severity: 'warn',
        code: 'unused-asset',
        where: 'assets["sprite.a"]',
        message: 'AssetId "sprite.a" 当前未被引用',
      },
      {
        severity: 'error',
        code: 'missing-file',
        where: 'assets["sprite.a"].path',
        message: '无法读取 "assets/generated/missing.png": disk gone',
      },
      {
        severity: 'error',
        code: 'bytes-mismatch',
        where: 'assets["sprite.x"].bytes',
        message: '登记 3，实际 4',
      },
      {
        severity: 'error',
        code: 'hash-mismatch',
        where: 'assets["sprite.z"].sha256',
        message: `登记 ${'b'.repeat(64)}，实际 ${record.sha256}`,
      },
    ])
  })

  test('keeps non-Error read failures local and verifies bytes when a later scan succeeds', async () => {
    const { bytes, record } = spriteFile()
    const input = validateAssetCatalog({ version: 1, assets: { 'sprite.x': record } })
    const before = deepSnapshot(input)
    const readBytes = vi
      .fn<(path: string) => Promise<Uint8Array>>()
      .mockRejectedValueOnce('offline')
      .mockResolvedValue(bytes)
    const digest = vi.fn(sha256)
    expect(
      await validateAssetFileClosure(input, references, { readBytes, sha256: digest }),
    ).toEqual([
      {
        severity: 'error',
        code: 'missing-file',
        where: 'assets["sprite.x"].path',
        message: '无法读取 "assets/generated/sprite.x.png": offline',
      },
    ])
    expect(readBytes.mock.calls).toEqual([['assets/generated/sprite.x.png']])
    expect(digest).not.toHaveBeenCalled()
    expect(
      await validateAssetFileClosure(input, references, { readBytes, sha256: digest }),
    ).toEqual([])
    expect(digest.mock.calls).toEqual([[bytes]])
    expect(input).toEqual(before)
  })

  test('propagates a digest failure for a readable asset', async () => {
    const { bytes, record } = spriteFile()
    const input = validateAssetCatalog({ version: 1, assets: { 'sprite.x': record } })
    const digestFailure = new Error('sha crashed')
    await expect(
      validateAssetFileClosure(input, references, {
        readBytes: async () => bytes,
        sha256: async () => {
          throw digestFailure
        },
      }),
    ).rejects.toBe(digestFailure)
  })
})
