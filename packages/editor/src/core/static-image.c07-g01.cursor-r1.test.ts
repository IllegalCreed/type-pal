/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C07-G01：static-image 与 imageAssets 目录身份。
 * 排重：ImageTab.test 已证 UI 级 kind Tab；本组只证 STATIC_IMAGE_KINDS 常量与 imageAssets 纯函数。
 */
import type { AssetCatalogV1, AssetKind } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { imageAssetLabel, imageAssets } from '../ui/ImageAssetPicker.js'
import { STATIC_IMAGE_KINDS, type StaticImageKind } from './static-image.js'

function catalogOf(entries: Array<[string, StaticImageKind, string?]>): AssetCatalogV1 {
  const assets: AssetCatalogV1['assets'] = {}
  for (const [id, kind, label] of entries) {
    assets[id] = {
      kind,
      path: `assets/${id}.png`,
      mediaType: 'image/png',
      bytes: 1,
      sha256: 'a'.repeat(64),
      label: label ?? id,
      origin: { kind: 'authored' },
    }
  }
  return { version: 1, assets }
}

describe('C07-G01 static-image 与 imageAssets', () => {
  test('C07-G01-01 STATIC_IMAGE_KINDS 恰为四种静态图像 kind', () => {
    expect(STATIC_IMAGE_KINDS).toEqual(['portrait', 'face', 'item-icon', 'battle-background'])
  })

  test('C07-G01-02 各 kind 唯一且满足 AssetKind', () => {
    const set = new Set(STATIC_IMAGE_KINDS)
    expect(set.size).toBe(4)
    for (const kind of STATIC_IMAGE_KINDS) {
      const probe: AssetKind = kind
      expect(probe).toBe(kind)
    }
  })

  test('C07-G01-03 imageAssets(portrait) 只保留 portrait 记录', () => {
    const catalog = catalogOf([
      ['portrait.a', 'portrait'],
      ['face.b', 'face'],
      ['item-icon.c', 'item-icon'],
    ])
    expect(imageAssets(catalog, 'portrait').map((entry) => entry.id)).toEqual(['portrait.a'])
  })

  test('C07-G01-04 imageAssets 按 AssetId 字典序排序', () => {
    const catalog = catalogOf([
      ['face.z', 'face'],
      ['face.a', 'face'],
      ['face.m', 'face'],
    ])
    expect(imageAssets(catalog, 'face').map((entry) => entry.id)).toEqual([
      'face.a',
      'face.m',
      'face.z',
    ])
  })

  test('C07-G01-05 空 catalog 返回空列表', () => {
    expect(imageAssets({ version: 1, assets: {} }, 'item-icon')).toEqual([])
  })

  test('C07-G01-06 imageAssetLabel 有 label 时带括号 id', () => {
    const catalog = catalogOf([['portrait.hero', 'portrait', '主角']])
    const [asset] = imageAssets(catalog, 'portrait')
    expect(imageAssetLabel(asset!)).toBe('主角 (portrait.hero)')
  })

  test('C07-G01-07 imageAssetLabel 无 label 时仅 id', () => {
    const catalog = catalogOf([['face.raw', 'face', '']])
    catalog.assets['face.raw']!.label = ''
    const [asset] = imageAssets(catalog, 'face')
    expect(imageAssetLabel(asset!)).toBe('face.raw')
  })

  test('C07-G01-08 battle-background 过滤不含其它 kind', () => {
    const catalog = catalogOf([
      ['battle-background.bg', 'battle-background'],
      ['portrait.p', 'portrait'],
    ])
    expect(imageAssets(catalog, 'battle-background').map((entry) => entry.id)).toEqual([
      'battle-background.bg',
    ])
  })

  test('C07-G01-09 item-icon 与 face 互不串 kind', () => {
    const catalog = catalogOf([
      ['face.one', 'face'],
      ['item-icon.two', 'item-icon'],
    ])
    expect(imageAssets(catalog, 'face')).toHaveLength(1)
    expect(imageAssets(catalog, 'item-icon')).toHaveLength(1)
    expect(imageAssets(catalog, 'face')[0]!.id).toBe('face.one')
  })

  test('C07-G01-10 STATIC_IMAGE_KINDS 不含 frame-animation / video', () => {
    const forbidden: AssetKind[] = ['frame-animation', 'video', 'music']
    for (const kind of forbidden) {
      expect(STATIC_IMAGE_KINDS.includes(kind as StaticImageKind)).toBe(false)
    }
  })
})
