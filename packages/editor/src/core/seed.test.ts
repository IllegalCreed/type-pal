import type { LoadedManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildBlankProject, enumerateSeedFiles, relativizeManifest } from './seed.js'

const manifest = {
  id: 'pal',
  name: 'PAL',
  contentVersion: 1,
  entryScene: 's1',
  content: {
    actors: 'content/actors.json',
    skills: 'content/skills.json',
    scenes: 'content/scenes/',
  },
  assets: {
    root: '/extracted/data',
    maps: 'tilemap',
    tilesets: 'tileset',
    sprites: 'sprite',
    palettes: 'palette',
    sounds: '/extracted/sounds',
    music: '/extracted/music',
    portraits: '/baked/portraits',
    faces: '/baked/ui/face',
    itemIcons: '/baked/ui/items',
  },
  startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
} as unknown as LoadedManifest

describe('relativizeManifest', () => {
  test('assets 的 /extracted、/baked 绝对前缀 → assets/ 相对;子目录不变', () => {
    const a = relativizeManifest(manifest).assets
    expect(a.root).toBe('assets/extracted/data')
    expect(a.sounds).toBe('assets/extracted/sounds')
    expect(a.music).toBe('assets/extracted/music')
    expect(a.portraits).toBe('assets/baked/portraits')
    expect(a.faces).toBe('assets/baked/ui/face')
    expect(a.itemIcons).toBe('assets/baked/ui/items')
    expect(a.maps).toBe('tilemap') // 相对子目录不动
    expect(a.tilesets).toBe('tileset')
  })
  test('不改原对象(深拷)', () => {
    relativizeManifest(manifest)
    expect(manifest.assets.root).toBe('/extracted/data')
  })
})

describe('enumerateSeedFiles', () => {
  const assetManifest = { files: [{ path: 'data/tileset/1.rle', size: 100 }] }
  const bakedManifest = { files: [{ path: 'portraits/1.png', size: 50 }] }
  const seed = enumerateSeedFiles(manifest, ['s1', 's2'], assetManifest, bakedManifest)

  test('汇总:内容表 + scenes index + 每场景 + 素材(extracted/baked)', () => {
    const rels = seed.map((f) => f.rel)
    expect(rels).toContain('content/actors.json')
    expect(rels).toContain('content/skills.json')
    expect(rels).toContain('content/scenes/index.json')
    expect(rels).toContain('content/scenes/s1.json')
    expect(rels).toContain('content/scenes/s2.json')
    expect(rels).toContain('assets/extracted/data/tileset/1.rle')
    expect(rels).toContain('assets/baked/portraits/1.png')
    expect(rels).not.toContain('content/scenes/') // scenes 是目录,不作文件
    expect(seed).toHaveLength(7)
  })

  test('素材项带 src(绝对透传)+ size(进度用);内容项 src=rel', () => {
    const tile = seed.find((f) => f.rel === 'assets/extracted/data/tileset/1.rle')
    expect(tile).toMatchObject({ src: '/extracted/data/tileset/1.rle', kind: 'binary', size: 100 })
    const baked = seed.find((f) => f.rel === 'assets/baked/portraits/1.png')
    expect(baked).toMatchObject({ src: '/baked/portraits/1.png', kind: 'binary', size: 50 })
    const actors = seed.find((f) => f.rel === 'content/actors.json')
    expect(actors).toMatchObject({ src: 'content/actors.json', kind: 'json' })
  })
})

describe('buildBlankProject', () => {
  test('名字 → id(kebab)+ 最小骨架(空内容表 + 占位场景 + entryScene 存在)', () => {
    const files = buildBlankProject('My Game')
    const m = files['manifest.json'] as { id: string; entryScene: string }
    expect(m.id).toBe('my-game')
    expect(m.entryScene).toBe('start')
    expect(files['content/scenes/index.json']).toEqual(['start'])
    expect((files['content/scenes/start.json'] as { id: string }).id).toBe('start')
    expect(files['content/actors.json']).toEqual([])
    expect(files['content/items.json']).toEqual([])
  })

  test('空名 → 兜底 id new-project', () => {
    expect((buildBlankProject('   ')['manifest.json'] as { id: string }).id).toBe('new-project')
  })
})
