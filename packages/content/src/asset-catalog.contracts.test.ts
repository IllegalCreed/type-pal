/**
 * TEST-CONTENT-CONTRACTS-1 A1-A3/A5：资源路径/目录/角色/引用闭包（asset.ts）。
 * 既有 asset.test.ts 已覆盖主体；本文件补：路径 fail-loud 与 map-index 规范化的**不同合同**、
 * catalog 单字段反例、manifest 角色 kind 门、reference closure severity/where 完整断言、深快照。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot, spriteAssetRecord } from './__tests__/glm-content-contract-fixtures.js'
import {
  type AssetCatalogV1,
  type AssetReference,
  validateAssetCatalog,
  validateAssetReferenceClosure,
  validateManifestAssetConfig,
  validateProjectRelativePath,
} from './asset.js'

const catalog = (): AssetCatalogV1 =>
  validateAssetCatalog({
    version: 1,
    assets: { 'sprite.x': spriteAssetRecord('sprite.x') },
  })

describe('A1 validateProjectRelativePath · fail-loud 且返回原值不规范化', () => {
  test('合法值原样返回（不 trim/不消除段）', () => {
    expect(validateProjectRelativePath('assets/a/b.png')).toBe('assets/a/b.png')
  })
  test.each([
    ['NUL', 'a\0b'],
    ['绝对路径', '/abs.png'],
    ['盘符', 'C:/x.png'],
    ['scheme', 'https://x/y'],
    ['反斜杠', 'a\\b'],
    ['query', 'a?b'],
    ['fragment', 'a#b'],
    ['空段', 'a//b'],
    ['点段', 'a/./b'],
    ['上跳段', 'a/../b'],
  ])('%s 拒绝且消息含类别', (_name, path) => {
    expect(() => validateProjectRelativePath(path)).toThrow(/禁止|NUL|路径不能为空/)
  })
  test('与 map-index 规范化合同不同：本 API 不接受带空格段的原值改造', () => {
    // asset 路径 API 明确不隐式规范化；' a ' 是合法原值（无空段），trim 不发生
    expect(validateProjectRelativePath(' a ')).toBe(' a ')
  })
})

describe('A2 validateAssetCatalog · 单字段反例 + origin 前缀门', () => {
  test('合法 sprite 记录通过并保真返回；深快照不改原输入', () => {
    const raw = { version: 1, assets: { 'sprite.x': spriteAssetRecord('sprite.x') } }
    const before = deepSnapshot(raw)
    const validated = validateAssetCatalog(raw)
    expect(validated).toBe(raw as AssetCatalogV1) // 合法值原引用返回
    expect(raw).toEqual(before) // 输入不被改写
  })
  test.each([
    ['非法 kind', { kind: 'movie' as never }, /非法 AssetKind/],
    ['空 mediaType', { mediaType: ' ' }, /mediaType: 期望非空字符串/],
    ['负 bytes', { bytes: -1 }, /bytes: 期望非负整数/],
    ['非整数 bytes', { bytes: 1.5 }, /bytes: 期望非负整数/],
    ['大写 sha', { sha256: 'A'.repeat(64) }, /sha256: 期望 64 位小写十六进制/],
    ['非字符串 label', { label: 3 }, /label: 期望字符串/],
    ['非法 origin', { origin: { kind: 'unknown' } }, /origin.kind: 非法来源/],
    ['origin 前缀违例', { path: 'assets/wrong/x.png' }, /资源必须位于 assets\/generated\//],
  ])('%s 拒绝', (_name, patch, pattern) => {
    const raw = {
      version: 1,
      assets: { 'sprite.x': { ...spriteAssetRecord('sprite.x'), ...patch } },
    }
    expect(() => validateAssetCatalog(raw)).toThrow(pattern)
  })
})

describe('A3 validateManifestAssetConfig · 角色 kind 门与音频要求', () => {
  test('无音频角色的最小配置通过；非音频角色+匹配 kind 通过；有音频 kind 时强制音频角色齐备', () => {
    expect(validateManifestAssetConfig({ catalog: 'assets/index.json', roles: {} })).toEqual({
      catalog: 'assets/index.json',
      roles: {},
    })
    const videoCatalog = validateAssetCatalog({
      version: 1,
      assets: {
        'video.intro': {
          ...spriteAssetRecord('video.intro'),
          kind: 'video',
          mediaType: 'video/mp4',
          path: 'assets/runtime/video.intro.mp4',
          origin: { kind: 'licensed' },
        },
      },
    })
    const ok = validateManifestAssetConfig(
      { catalog: 'assets/index.json', roles: { 'video.startupSplash': 'video.intro' } },
      videoCatalog,
    )
    expect(ok.roles).toEqual({ 'video.startupSplash': 'video.intro' })
    // 有 music kind 资产时强制所有音频角色齐备（现行合同）
    const musicCatalog = validateAssetCatalog({
      version: 1,
      assets: {
        'music.m': {
          ...spriteAssetRecord('music.m'),
          kind: 'music',
          mediaType: 'audio/midi',
          path: 'assets/runtime/music.m.mid',
          origin: { kind: 'licensed' },
        },
      },
    })
    expect(() => validateManifestAssetConfig({ catalog: 'a', roles: {} }, musicCatalog)).toThrow(
      /音乐切片缺角色/,
    )
  })
  test.each([
    ['未知角色拒绝', { catalog: 'a', roles: { 'audio.ghost': 'x' } }, undefined, /未知资源角色/],
    [
      '引用不存在 AssetId',
      { catalog: 'a', roles: { 'audio.defaultBattleMusic': 'ghost' } },
      () => catalog(),
      /AssetId "ghost" 不存在/,
    ],
    [
      'kind 不匹配',
      { catalog: 'a', roles: { 'video.startupSplash': 'sprite.x' } },
      () => catalog(), // sprite kind vs video 角色期望 video
      /期望 video，实际 sprite/,
    ],
  ])('%s', (_name, config, makeCatalog, pattern) => {
    expect(() =>
      validateManifestAssetConfig(config, makeCatalog ? makeCatalog() : undefined),
    ).toThrow(pattern)
  })
})

describe('A5 validateAssetReferenceClosure · severity/code/where 完整断言', () => {
  const ref = (
    asset: string,
    where: string,
    expectedKind: AssetReference['expectedKind'] = 'sprite',
  ): AssetReference => ({
    asset,
    expectedKind,
    where,
    site: '测试位置',
  })
  test('正常引用零 issue；未引用资产 warn；两者同时出现完整并列', () => {
    const issues = validateAssetReferenceClosure(catalog(), [ref('sprite.x', 'scene/s')])
    expect(issues).toEqual([]) // 单引用全覆盖 → 无 unused
    const two = validateAssetReferenceClosure(
      {
        version: 1,
        assets: {
          'sprite.x': spriteAssetRecord('sprite.x'),
          'sprite.y': spriteAssetRecord('sprite.y'),
        },
      },
      [ref('sprite.x', 'scene/s')],
    )
    expect(two).toEqual([
      {
        severity: 'warn',
        code: 'unused-asset',
        where: expect.stringContaining('sprite.y'),
        message: expect.any(String),
      },
    ])
  })
  test('missing-asset error 且 where 精确；kind-mismatch 与 unused 并列不吞并', () => {
    const missing = validateAssetReferenceClosure(catalog(), [
      ref('ghost', 'scene/e1'),
      ref('sprite.x', 'scene/keep'),
    ])
    expect(missing).toEqual([
      { severity: 'error', code: 'missing-asset', where: 'scene/e1', message: expect.any(String) },
    ])
    const mismatch = validateAssetReferenceClosure(catalog(), [
      ref('sprite.x', 'scene/e2', 'music' as AssetReference['expectedKind']),
    ])
    expect(mismatch).toEqual([
      { severity: 'error', code: 'kind-mismatch', where: 'scene/e2', message: expect.any(String) },
    ])
  })
})
