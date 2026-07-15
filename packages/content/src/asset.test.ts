import { describe, expect, test } from 'vitest'
import {
  type AssetCatalogV1,
  collectAssetReferences,
  type ManifestAssetConfigV3,
  palMusicAssetId,
  validateAssetCatalog,
  validateAssetFileClosure,
  validateAssetReferenceClosure,
  validateManifestAssetConfigV3,
  validateProjectRelativePath,
} from './asset.js'

const hash = 'a'.repeat(64)
const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'music.pal.002': {
      kind: 'music',
      path: 'assets/migrated/music/002.mid',
      mediaType: 'audio/midi',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'music.pal.003': {
      kind: 'music',
      path: 'assets/migrated/music/003.mid',
      mediaType: 'audio/midi',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'music.pal.037': {
      kind: 'music',
      path: 'assets/migrated/music/037.mid',
      mediaType: 'audio/midi',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'legacy-migrated' },
    },
    'soundfont.default': {
      kind: 'soundfont',
      path: 'assets/runtime/soundfont.sf3',
      mediaType: 'audio/sf3',
      bytes: 3,
      sha256: hash,
      origin: { kind: 'licensed' },
    },
  },
}

const assets: ManifestAssetConfigV3 = {
  catalog: 'assets/index.json',
  roles: {
    'audio.midiSoundfont': 'soundfont.default',
    'audio.defaultBattleMusic': 'music.pal.037',
    'audio.bossVictoryMusic': 'music.pal.002',
    'audio.normalVictoryMusic': 'music.pal.003',
  },
  legacy: { families: ['sprite', 'tileset'] },
}

describe('validateProjectRelativePath', () => {
  test('规范工程相对路径通过', () => {
    expect(validateProjectRelativePath('assets/authored/a.mid')).toBe('assets/authored/a.mid')
  })

  test.each([
    '',
    '/assets/a.mid',
    'https://example.com/a.mid',
    'file:a.mid',
    'C:/assets/a.mid',
    'assets\\a.mid',
    'assets/../a.mid',
    'assets/./a.mid',
    'assets//a.mid',
    'assets/a.mid?raw',
    'assets/a.mid#x',
    'assets/\0a.mid',
  ])('拒绝 %j', (path) => {
    expect(() => validateProjectRelativePath(path)).toThrow()
  })
})

describe('catalog 与 manifest v3', () => {
  test('合法目录、四个封闭角色与 legacy 债务区通过', () => {
    expect(validateAssetCatalog(catalog)).toEqual(catalog)
    expect(validateManifestAssetConfigV3(assets, catalog)).toEqual(assets)
  })

  test('未知角色、角色 kind 错、缺角色均 fail-loud', () => {
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, roles: { ...assets.roles, 'audio.hidden': 'music.pal.002' } },
        catalog,
      ),
    ).toThrow('未知资源角色')
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, roles: { ...assets.roles, 'audio.midiSoundfont': 'music.pal.002' } },
        catalog,
      ),
    ).toThrow('期望 soundfont')
    expect(() =>
      validateManifestAssetConfigV3(
        {
          ...assets,
          roles: { ...assets.roles, 'audio.normalVictoryMusic': undefined },
        },
        catalog,
      ),
    ).toThrow('期望非空 AssetId')
  })

  test('同一资源族不得同时存在于 catalog 和 legacy', () => {
    expect(() =>
      validateManifestAssetConfigV3(
        { ...assets, legacy: { families: ['music', 'sprite'] } },
        catalog,
      ),
    ).toThrow('同时出现在 catalog 与 legacy')
  })
})

test('PAL 数字号只在迁移边界确定性映射', () => {
  expect(palMusicAssetId(31)).toBe('music.pal.031')
  expect(() => palMusicAssetId(0)).toThrow('正整数')
})

describe('音乐引用与文件闭包', () => {
  const scene = {
    id: 's',
    mapId: 'map-001',
    music: 'music.pal.002',
    battleMusic: null,
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
    entities: [],
    onEnter: [
      {
        body: [
          { kind: 'playMusic' as const, asset: 'music.pal.003' },
          {
            kind: 'startBattle' as const,
            team: 1,
            music: 'music.pal.037',
            onLose: [{ kind: 'playMusic' as const, asset: 'music.missing' }],
          },
        ],
      },
    ],
  }

  test('walker 覆盖 roles、场景、嵌套命令', () => {
    const refs = collectAssetReferences({ assets, scenes: [scene] })
    expect(refs.map((ref) => ref.asset)).toEqual([
      'soundfont.default',
      'music.pal.037',
      'music.pal.002',
      'music.pal.003',
      'music.pal.002',
      'music.pal.003',
      'music.pal.037',
      'music.missing',
    ])
    expect(validateAssetReferenceClosure(catalog, refs)).toContainEqual(
      expect.objectContaining({ code: 'missing-asset', severity: 'error' }),
    )
  })

  test('文件缺失、大小与 hash 不符均有独立错误', async () => {
    const refs = [
      { asset: 'music.pal.002', expectedKind: 'music' as const, where: 'scene.music' },
      { asset: 'music.pal.003', expectedKind: 'music' as const, where: 'script.asset' },
      { asset: 'music.pal.037', expectedKind: 'music' as const, where: 'battle.music' },
    ]
    const issues = await validateAssetFileClosure(catalog, refs, {
      readBytes: async (path) => {
        if (path.endsWith('002.mid')) throw new Error('ENOENT')
        return path.endsWith('003.mid') ? new Uint8Array(4) : new Uint8Array(3)
      },
      sha256: (bytes) => (bytes.byteLength === 3 ? 'b'.repeat(64) : hash),
    })
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['missing-file', 'bytes-mismatch', 'hash-mismatch']),
    )
  })
})
