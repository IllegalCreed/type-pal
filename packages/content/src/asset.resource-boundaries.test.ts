import { expect, test, vi } from 'vitest'
import { resourceSnapshot } from './__tests__/codex-resource-contract-fixtures.js'
import {
  collectAssetReferences,
  collectCanonicalCommandAssetTaggedReferences,
  collectCommandAssetTaggedReferences,
  validateAssetCatalog,
  validateAssetFileClosure,
  validateManifestAssetConfig,
} from './asset.js'
import { type Command, checkCommands } from './script.js'

function catalog() {
  return validateAssetCatalog({
    version: 1,
    assets: {
      'video.intro': {
        kind: 'video',
        path: 'assets/generated/intro.bin',
        mediaType: 'video/test',
        bytes: 1,
        sha256: 'a'.repeat(64),
        origin: { kind: 'generated', ref: '' },
      },
    },
  })
}

test.each([
  ['root array', () => [], 'assets/index.json: 期望对象'],
  ['wrong version', () => ({ ...catalog(), version: 0 }), 'assets/index.json.version: 期望 1'],
  [
    'asset table null',
    () => ({ ...catalog(), assets: null }),
    'assets/index.json.assets: 期望对象',
  ],
  [
    'whitespace id',
    () => ({ ...catalog(), assets: { ' ': catalog().assets['video.intro'] } }),
    'assets/index.json.assets: AssetId 不能为空',
  ],
  [
    'record array',
    () => ({ ...catalog(), assets: { x: [] } }),
    'assets/index.json.assets["x"]: 期望对象',
  ],
  [
    'origin ref type',
    () => ({
      ...catalog(),
      assets: {
        'video.intro': {
          ...catalog().assets['video.intro'],
          origin: { kind: 'generated', ref: 7 },
        },
      },
    }),
    'assets/index.json.assets["video.intro"].origin.ref: 期望字符串',
  ],
])('asset metadata boundary: %s', (_label, invalid, message) => {
  expect(() => validateAssetCatalog(catalog())).not.toThrow()
  const input = invalid()
  const before = resourceSnapshot(input)
  expect(() => validateAssetCatalog(input)).toThrow(new Error(message))
  expect(input).toEqual(before)
})

test.each(['', null, 1])('manifest role rejects non-ID %s even without a catalog', (id) => {
  const assets = catalog()
  const good = { catalog: 'assets/index.json', roles: { 'video.startupSplash': 'video.intro' } }
  expect(validateManifestAssetConfig(good, assets)).toBe(good)
  const input = { ...good, roles: { 'video.startupSplash': id } }
  const before = resourceSnapshot(input)
  expect(() => validateManifestAssetConfig(input)).toThrow(
    new Error('manifest.assets.roles.video.startupSplash: 期望非空 AssetId'),
  )
  expect(input).toEqual(before)
})

test('canonical single-node asset visit includes choreography but leaves normal nested arms to its caller', () => {
  const command: Command = {
    kind: 'startBattle',
    enemyTeamId: 'team',
    music: 'music.battle',
    choreography: [{ at: 'battleStart', body: [{ kind: 'playSound', asset: 'sound.intro' }] }],
    onLose: [{ kind: 'playMusic', asset: 'music.lost' }],
  }
  checkCommands([command], 'fixture')
  const before = resourceSnapshot(command)
  const expected = [
    { asset: 'music.battle', expectedKind: 'music', where: 'body[0].music' },
    { asset: 'sound.intro', expectedKind: 'sound', where: 'body[0].choreography[0].body[0].asset' },
  ]
  expect(collectCanonicalCommandAssetTaggedReferences(command, 'body[0]')).toEqual(expected)
  expect(collectCommandAssetTaggedReferences(command, 'body[0]')).toEqual([
    ...expected,
    { asset: 'music.lost', expectedKind: 'music', where: 'body[0].onLose[0].asset' },
  ])
  expect(command).toEqual(before)
  const silent: Command = { kind: 'startBattle', enemyTeamId: 'team', music: null }
  checkCommands([silent], 'silent')
  expect(collectCanonicalCommandAssetTaggedReferences(silent, 'silent')).toEqual([])
})

test('canonical visit rejects no input on its unknown boundary and does not recurse a branch twice', () => {
  const branch: Command = {
    kind: 'branch',
    cond: { kind: 'chance', percent: 50 },
    then: [{ kind: 'playSound', asset: 'sound.child' }],
  }
  checkCommands([branch], 'fixture')
  expect(collectCanonicalCommandAssetTaggedReferences(branch, 'branch')).toEqual([])
  expect(collectCanonicalCommandAssetTaggedReferences(branch.then[0], 'branch.then[0]')).toEqual([
    { asset: 'sound.child', expectedKind: 'sound', where: 'branch.then[0].asset' },
  ])
  // Defensive unknown-input interface, not canonical JSON claims.
  for (const input of [null, 0, [], { kind: 'dialog', cue: null }]) {
    const before = resourceSnapshot(input)
    expect(collectCanonicalCommandAssetTaggedReferences(input, 'unknown')).toEqual([])
    expect(input).toEqual(before)
  }
})

test('canonical ownership flag suppresses shared-script recursion without suppressing manifest roles', () => {
  const body: Command[] = [{ kind: 'playSound', asset: 'sound.shared' }]
  checkCommands(body, 'shared.body')
  const source = {
    assets: { catalog: 'assets/index.json', roles: { 'video.startupSplash': 'video.intro' } },
    sharedScripts: { 'shared/a': { body } },
  }
  validateManifestAssetConfig(source.assets, catalog())
  const before = resourceSnapshot(source)
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
      where: 'sharedScripts["shared/a"].body[0].asset',
      site: 'sharedScript:shared/a',
      origin: { kind: 'shared-script', id: 'shared/a' },
    },
  ])
  const input = { ...source, includeCanonicalAuthorCommands: false }
  expect(collectAssetReferences(input)).toEqual([manifest])
  expect(source).toEqual(before)
})

test('file-closure reports a non-Error IO rejection without calling the digest and keeps the actual catalog intact', async () => {
  const input = catalog()
  const before = resourceSnapshot(input)
  const readBytes = vi.fn(async (_path: string): Promise<Uint8Array> => {
    throw 'offline'
  })
  const sha256 = vi.fn(async () => 'a'.repeat(64))
  const refs = [
    { asset: 'video.intro', expectedKind: 'video' as const, where: 'intro', site: 'intro' },
  ]
  expect(await validateAssetFileClosure(input, refs, { readBytes, sha256 })).toEqual([
    {
      severity: 'error',
      code: 'missing-file',
      where: 'assets["video.intro"].path',
      message: '无法读取 "assets/generated/intro.bin": offline',
    },
  ])
  expect(readBytes.mock.calls).toEqual([['assets/generated/intro.bin']])
  expect(sha256).not.toHaveBeenCalled()
  expect(input).toEqual(before)
  readBytes.mockResolvedValue(Uint8Array.of(3))
  expect(await validateAssetFileClosure(input, refs, { readBytes, sha256 })).toEqual([])
  expect(sha256).toHaveBeenCalledWith(Uint8Array.of(3))
})
