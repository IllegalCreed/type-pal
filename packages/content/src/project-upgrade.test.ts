import { describe, expect, test } from 'vitest'
import type { AssetCatalogV1 } from './asset.js'
import {
  applyV2MusicLabels,
  upgradeManifestV2ToV3,
  upgradeV2MusicReferences,
} from './project-upgrade.js'

const record = (track: number) => ({
  kind: 'music' as const,
  path: `assets/migrated/music/${String(track).padStart(3, '0')}.mid`,
  mediaType: 'audio/midi',
  bytes: 1,
  sha256: String(track % 10).repeat(64),
  origin: { kind: 'legacy-migrated' as const },
})

test('v2 manifest 单向产出 v3，删除 music 清单与 music legacy 双轨', () => {
  const catalog: AssetCatalogV1 = { version: 1, assets: {} }
  const upgraded = upgradeManifestV2ToV3({
    manifest: {
      id: 'old',
      name: '旧工程',
      contentVersion: 2,
      entryScene: 's0',
      content: { scenes: 'content/scenes/', music: 'content/music.json' },
      assets: { root: 'assets', music: 'music', sprites: 'sprites' },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    },
    catalog,
  })
  expect(upgraded.contentVersion).toBe(3)
  expect(upgraded.content.music).toBeUndefined()
  expect(upgraded.assets).toEqual({
    catalog: 'assets/index.json',
    roles: {},
    legacy: {
      families: [
        'battle-sprite',
        'effect-sprite',
        'battle-background',
        'rng',
        'video',
        'glyph-table',
        'ui-image',
        'image',
        'sprite',
      ],
      root: 'assets',
      sprites: 'sprites',
    },
  })
})

describe('v2 音乐引用升级', () => {
  test('区分缺省、指定、显式停止，且递归处理分支', () => {
    expect(
      upgradeV2MusicReferences({
        id: 's',
        musicId: 31,
        battleMusicId: 0,
        body: [
          { kind: 'playMusic', musicId: 1 },
          { kind: 'playMusic', musicId: 0 },
          { kind: 'startBattle', team: 2, musicId: 37 },
        ],
      }),
    ).toEqual({
      id: 's',
      music: 'music.pal.031',
      battleMusic: null,
      body: [
        { kind: 'playMusic', asset: 'music.pal.001' },
        { kind: 'stopMusic' },
        { kind: 'startBattle', team: 2, music: 'music.pal.037' },
      ],
    })
  })

  test('旧别名只进入对应 catalog label', () => {
    const catalog: AssetCatalogV1 = { version: 1, assets: { 'music.pal.001': record(1) } }
    expect(applyV2MusicLabels(catalog, [{ id: 1, name: '蝶恋' }]).assets).toEqual({
      'music.pal.001': { ...record(1), label: '蝶恋' },
    })
    expect(catalog.assets['music.pal.001']?.label).toBeUndefined()
  })
})
