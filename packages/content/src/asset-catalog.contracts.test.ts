import { describe, expect, test } from 'vitest'
import { audioProjectAssetFixture, spriteAssetRecord } from './__tests__/asset-catalog-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  type AssetCatalogV1,
  type AssetRecordV1,
  collectAssetReferences,
  type ManifestAssetConfig,
  validateAssetCatalog,
  validateManifestAssetConfig,
  validateProjectRelativePath,
} from './asset.js'

function spriteCatalog(): AssetCatalogV1 {
  return { version: 1, assets: { 'sprite.x': spriteAssetRecord('sprite.x') } }
}

describe('project-relative asset paths', () => {
  test.each(['assets/a/b.png', ' a / b '])('preserves the accepted path %j', (path) => {
    expect(validateProjectRelativePath(path)).toBe(path)
  })

  test.each([
    ['empty path', '', '路径不能为空'],
    ['NUL', 'a\0b', '路径包含 NUL'],
    ['absolute path', '/abs.png', '禁止绝对路径 "/abs.png"'],
    ['drive path', 'C:/x.png', '禁止盘符路径 "C:/x.png"'],
    ['URL', 'https://x/y', '禁止 URL scheme "https://x/y"'],
    ['local URL scheme', 'file:a.mid', '禁止 URL scheme "file:a.mid"'],
    ['backslash', 'a\\b', '禁止反斜杠 "a\\b"'],
    ['query', 'a?b', '禁止 query/fragment "a?b"'],
    ['fragment', 'a#b', '禁止 query/fragment "a#b"'],
    ['empty segment', 'a//b', '禁止空段、. 或 .. "a//b"'],
    ['dot segment', 'a/./b', '禁止空段、. 或 .. "a/./b"'],
    ['parent segment', 'a/../b', '禁止空段、. 或 .. "a/../b"'],
  ])('rejects %s with its path diagnostic', (_name, path, message) => {
    expect(() => validateProjectRelativePath(path, 'catalog path')).toThrow(
      new Error(`catalog path: ${message}`),
    )
  })
})

describe('asset catalog records', () => {
  test.each([
    ['an array root', () => [], 'assets/index.json: 期望对象'],
    [
      'an unsupported version',
      () => ({ ...spriteCatalog(), version: 0 }),
      'assets/index.json.version: 期望 1',
    ],
    [
      'a null asset table',
      () => ({ ...spriteCatalog(), assets: null }),
      'assets/index.json.assets: 期望对象',
    ],
    [
      'a blank asset id',
      () => ({ version: 1, assets: { ' ': spriteAssetRecord('sprite.x') } }),
      'assets/index.json.assets: AssetId 不能为空',
    ],
    [
      'an array record',
      () => ({ version: 1, assets: { 'sprite.x': [] } }),
      'assets/index.json.assets["sprite.x"]: 期望对象',
    ],
    [
      'a numeric origin reference',
      () => ({
        version: 1,
        assets: {
          'sprite.x': { ...spriteAssetRecord('sprite.x'), origin: { kind: 'generated', ref: 7 } },
        },
      }),
      'assets/index.json.assets["sprite.x"].origin.ref: 期望字符串',
    ],
  ])('rejects %s at the corresponding catalog boundary', (_name, invalid, message) => {
    const input = invalid()
    const before = deepSnapshot(input)
    expect(() => validateAssetCatalog(input)).toThrow(new Error(message))
    expect(input).toEqual(before)
  })

  test('validates generated sprite metadata without rewriting the caller input', () => {
    const input = spriteCatalog()
    const before = deepSnapshot(input)
    expect(validateAssetCatalog(input)).toBe(input)
    expect(input).toEqual(before)
  })

  test.each([
    ['invalid kind', { kind: 'movie' }, 'kind: 非法 AssetKind'],
    [
      'migrated source outside its owned directory',
      { origin: { kind: 'legacy-migrated', ref: 'sprite/1.rle' } },
      'path: legacy-migrated 资源必须位于 assets/migrated/',
    ],
    ['blank media type', { mediaType: ' ' }, 'mediaType: 期望非空字符串'],
    ['negative byte count', { bytes: -1 }, 'bytes: 期望非负整数'],
    ['fractional byte count', { bytes: 1.5 }, 'bytes: 期望非负整数'],
    ['uppercase digest', { sha256: 'A'.repeat(64) }, 'sha256: 期望 64 位小写十六进制'],
    ['non-string label', { label: 3 }, 'label: 期望字符串'],
    ['invalid origin', { origin: { kind: 'unknown' } }, 'origin.kind: 非法来源'],
    [
      'path outside the origin directory',
      { path: 'assets/wrong/x.png' },
      'path: generated 资源必须位于 assets/generated/',
    ],
  ])('rejects %s at the record field', (_name, patch, message) => {
    const input = {
      version: 1,
      assets: { 'sprite.x': { ...spriteAssetRecord('sprite.x'), ...patch } },
    }
    expect(() => validateAssetCatalog(input)).toThrow(
      new Error(`assets/index.json.assets["sprite.x"].${message}`),
    )
  })
})

describe('manifest asset roles', () => {
  const catalogPath = 'assets/index.json'

  test.each(['', null, 1])('rejects the role asset id %j before catalog resolution', (id) => {
    const input = { catalog: catalogPath, roles: { 'video.startupSplash': id } }
    const before = deepSnapshot(input)
    expect(() => validateManifestAssetConfig(input)).toThrow(
      new Error('manifest.assets.roles.video.startupSplash: 期望非空 AssetId'),
    )
    expect(input).toEqual(before)
  })

  test('accepts a manifest without audio roles for an empty asset catalog', () => {
    const input = { catalog: catalogPath, roles: {} }
    expect(validateManifestAssetConfig(input)).toEqual(input)
    expect(validateManifestAssetConfig(input, { version: 1, assets: {} })).toEqual(input)
  })

  test('requires a registered video for a splash role, including for constructor', () => {
    const video: AssetRecordV1 = {
      kind: 'video',
      mediaType: 'video/mp4',
      path: 'assets/runtime/constructor.mp4',
      bytes: 3,
      sha256: 'a'.repeat(64),
      origin: { kind: 'licensed' },
    }
    const input = { catalog: catalogPath, roles: { 'video.startupSplash': 'constructor' } }
    const catalog = validateAssetCatalog({ version: 1, assets: { constructor: video } })
    expect(validateManifestAssetConfig(input, catalog).roles).toEqual(input.roles)
    expect(() => validateManifestAssetConfig(input, { version: 1, assets: {} })).toThrow(
      new Error('manifest.assets.roles.video.startupSplash: AssetId "constructor" 不存在'),
    )
  })

  test('requires music slice roles when a music asset is registered', () => {
    const music: AssetRecordV1 = {
      kind: 'music',
      mediaType: 'audio/midi',
      path: 'assets/runtime/music.m.mid',
      bytes: 3,
      sha256: 'a'.repeat(64),
      origin: { kind: 'licensed' },
    }
    const catalog = validateAssetCatalog({ version: 1, assets: { 'music.m': music } })
    expect(() => validateManifestAssetConfig({ catalog: catalogPath, roles: {} }, catalog)).toThrow(
      new Error('manifest.assets.roles: 音乐切片缺角色 "audio.midiSoundfont"'),
    )
  })

  test.each([
    ['unknown role', { 'audio.ghost': 'sprite.x' }, 'audio.ghost: 未知资源角色'],
    [
      'missing asset',
      { 'audio.defaultBattleMusic': 'ghost' },
      'audio.defaultBattleMusic: AssetId "ghost" 不存在',
    ],
    [
      'wrong resource kind',
      { 'video.startupSplash': 'sprite.x' },
      'video.startupSplash: 期望 video，实际 sprite',
    ],
  ])('rejects %s', (_name, roles, message) => {
    expect(() =>
      validateManifestAssetConfig({ catalog: catalogPath, roles }, spriteCatalog()),
    ).toThrow(new Error(`manifest.assets.roles.${message}`))
  })
})

describe('catalog 与当前 manifest', () => {
  test('合法目录、音频与视觉角色通过', () => {
    const { catalog, assets } = audioProjectAssetFixture()
    const before = deepSnapshot({ catalog, assets })
    expect(validateAssetCatalog(catalog)).toBe(catalog)
    expect(validateManifestAssetConfig(assets, catalog)).toBe(assets)
    expect({ catalog, assets }).toEqual(before)
  })

  test('战败音乐可省略；配置时必须引用已登记的音乐', () => {
    const { catalog, assets } = audioProjectAssetFixture()
    expect(validateManifestAssetConfig(assets, catalog).roles['audio.defeatMusic']).toBeUndefined()
    const withDefeatMusic = (asset: string): ManifestAssetConfig => ({
      ...assets,
      roles: { ...assets.roles, 'audio.defeatMusic': asset },
    })
    const configured = validateManifestAssetConfig(withDefeatMusic('music.pal.002'), catalog)
    expect(collectAssetReferences({ assets: configured })).toContainEqual({
      asset: 'music.pal.002',
      expectedKind: 'music',
      where: 'manifest.assets.roles.audio.defeatMusic',
      site: 'manifest.assets.roles.audio.defeatMusic',
      origin: { kind: 'manifest-role', role: 'audio.defeatMusic' },
    })
    expect(() => validateManifestAssetConfig(withDefeatMusic('music.missing'), catalog)).toThrow(
      new Error('manifest.assets.roles.audio.defeatMusic: AssetId "music.missing" 不存在'),
    )
    expect(() => validateManifestAssetConfig(withDefeatMusic('sound.pal.045'), catalog)).toThrow(
      new Error('manifest.assets.roles.audio.defeatMusic: 期望 music，实际 sound'),
    )
  })

  test('validates kind constraints and each required audio role on an installed catalog', () => {
    const { catalog, assets } = audioProjectAssetFixture()
    expect(() =>
      validateManifestAssetConfig(
        { ...assets, roles: { ...assets.roles, 'audio.midiSoundfont': 'music.pal.002' } },
        catalog,
      ),
    ).toThrow('期望 soundfont')
    expect(() =>
      validateManifestAssetConfig(
        { ...assets, roles: { ...assets.roles, 'audio.openingMenuMusic': 'soundfont.default' } },
        catalog,
      ),
    ).toThrow('期望 music')
    expect(() =>
      validateManifestAssetConfig(
        {
          ...assets,
          roles: { ...assets.roles, 'visual.standardColorTable': 'music.pal.002' },
        },
        catalog,
      ),
    ).toThrow('期望 color-table')
    expect(() =>
      validateManifestAssetConfig(
        {
          ...assets,
          roles: { ...assets.roles, 'video.startupSplash': 'music.pal.002' },
        },
        catalog,
      ),
    ).toThrow('期望 video')
    expect(() =>
      validateManifestAssetConfig(
        { ...assets, roles: { ...assets.roles, 'audio.battleEscapeSound': 'music.pal.002' } },
        catalog,
      ),
    ).toThrow('期望 sound')
    const { 'audio.openingMenuMusic': _openingMenuMusic, ...rolesWithoutOpeningMenu } = assets.roles
    expect(() =>
      validateManifestAssetConfig({ ...assets, roles: rolesWithoutOpeningMenu }, catalog),
    ).toThrow('音乐切片缺角色 "audio.openingMenuMusic"')
  })

  test('rejects extra fields in the manifest asset settings', () => {
    const { catalog, assets } = audioProjectAssetFixture()
    expect(() => validateManifestAssetConfig({ ...assets, ui: 'assets/ui' }, catalog)).toThrow(
      new Error('manifest.assets.ui: 当前工程资源配置只允许 catalog 与 roles'),
    )
  })
})

test('项目 schema 不再接受 catalog 外资源族', () => {
  expect(() =>
    validateManifestAssetConfig({
      catalog: 'assets/index.json',
      roles: {},
      legacy: { families: ['glyph-table'] },
    }),
  ).toThrow('manifest.assets.legacy')
  expect(() =>
    validateAssetCatalog({
      version: 1,
      assets: {
        ghost: {
          kind: 'ui-image',
          path: 'assets/migrated/ui/ghost.png',
          mediaType: 'image/png',
          bytes: 0,
          sha256: 'a'.repeat(64),
          origin: { kind: 'legacy-migrated' },
        },
      },
    }),
  ).toThrow('非法 AssetKind')
})
