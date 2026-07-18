import type { AssetCatalogV1, LoadedManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { PAL_ASSET_ROLES } from './pal-assets.js'
import { closePalSoundManifest, preparePalManifest } from './pal-manifest.js'

const manifest = (): LoadedManifest => ({
  id: 'pal',
  name: 'PAL',
  contentVersion: 3,
  entryScene: 's000',
  content: {},
  assets: {
    catalog: 'assets/index.json',
    roles: { 'audio.battleEscapeSound': 'sound.authored.escape' },
    legacy: {
      families: ['sound', 'sprite'],
      root: '/extracted/data',
      sounds: '/extracted/sounds',
      sprites: 'sprite',
    },
  },
  startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
})

describe('PAL sound manifest closure', () => {
  test('只退役 legacy sound，保留其他字段并让工程角色覆盖默认值', () => {
    const current = manifest()
    const next = closePalSoundManifest(current)
    expect(next).not.toBe(current)
    expect(current.assets.legacy?.families).toEqual(['sound', 'sprite'])
    expect(next.assets.roles).toEqual({
      ...PAL_ASSET_ROLES,
      'audio.battleEscapeSound': 'sound.authored.escape',
    })
    expect(next.assets.legacy).toEqual({
      families: ['sprite'],
      root: '/extracted/data',
      sprites: 'sprite',
    })
  })

  test('传入 catalog 时立即拒绝不存在的作者角色', () => {
    const catalog: AssetCatalogV1 = { version: 1, assets: {} }
    expect(() => closePalSoundManifest(manifest(), catalog)).toThrow('不存在')
  })

  test('综合迁移 manifest 登记 stamps，保持 contentVersion 3 且不改输入', () => {
    const current = manifest()
    const next = preparePalManifest(current)
    expect(next.content.stamps).toBe('content/stamps.json')
    expect(next.contentVersion).toBe(3)
    expect(current.content.stamps).toBeUndefined()
  })
})
