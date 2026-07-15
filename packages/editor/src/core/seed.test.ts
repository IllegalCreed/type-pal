import type { LoadedManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildBlankProject, enumerateSeedFiles, relativizeManifest } from './seed.js'

const manifest = {
  id: 'pal',
  name: 'PAL',
  contentVersion: 3,
  entryScene: 's1',
  content: {
    actors: 'content/actors.json',
    skills: 'content/skills.json',
    scenes: 'content/scenes/',
  },
  assets: {
    catalog: 'assets/index.json',
    roles: {},
    legacy: {
      families: ['tileset', 'sprite', 'color-table', 'sound', 'portrait', 'face', 'item-icon'],
      root: '/extracted/data',
      tilesets: 'tileset',
      sprites: 'sprite',
      palettes: 'palette',
      sounds: '/extracted/sounds',
      portraits: '/baked/portraits',
      faces: '/baked/ui/face',
      itemIcons: '/baked/ui/items',
    },
  },
  startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
} as unknown as LoadedManifest

describe('relativizeManifest', () => {
  test('assets 的 /extracted、/baked 绝对前缀 → assets/ 相对;子目录不变', () => {
    const a = relativizeManifest(manifest).assets
    expect(a.legacy?.root).toBe('assets/extracted/data')
    expect(a.legacy?.sounds).toBe('assets/extracted/sounds')
    expect(a.legacy?.portraits).toBe('assets/baked/portraits')
    expect(a.legacy?.faces).toBe('assets/baked/ui/face')
    expect(a.legacy?.itemIcons).toBe('assets/baked/ui/items')
    expect(a.legacy?.tilesets).toBe('tileset')
  })
  test('不改原对象(深拷)', () => {
    relativizeManifest(manifest)
    expect(manifest.assets.legacy?.root).toBe('/extracted/data')
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
    expect(rels).toContain('assets/index.json')
    expect(seed).toHaveLength(8)
  })

  test('素材项带 src(绝对透传)+ size(进度用);内容项 src=rel', () => {
    const tile = seed.find((f) => f.rel === 'assets/extracted/data/tileset/1.rle')
    expect(tile).toMatchObject({ src: '/extracted/data/tileset/1.rle', kind: 'binary', size: 100 })
    const baked = seed.find((f) => f.rel === 'assets/baked/portraits/1.png')
    expect(baked).toMatchObject({ src: '/baked/portraits/1.png', kind: 'binary', size: 50 })
    const actors = seed.find((f) => f.rel === 'content/actors.json')
    expect(actors).toMatchObject({ src: 'content/actors.json', kind: 'json' })
  })

  test('scripts 是目录：复制 index 与全部 chunk，不把目录当单文件', () => {
    const withScripts = {
      ...manifest,
      content: { ...manifest.content, scripts: 'content/scripts/' },
    }
    const files = enumerateSeedFiles(
      withScripts,
      ['s1'],
      { files: [] },
      { files: [] },
      {
        version: 1,
        shards: { shared: 1, global: {} },
        chunks: { 'scene/s1': { path: 'chunks/scene/s1.json', bytes: 10 } },
      },
    )
    expect(files.map((f) => f.rel)).toContain('content/scripts/index.json')
    expect(files.map((f) => f.rel)).toContain('content/scripts/chunks/scene/s1.json')
    expect(files.map((f) => f.rel)).not.toContain('content/scripts/')
  })

  test('map index 登记的零引用地图也进入克隆文件集', () => {
    const withMaps: LoadedManifest = {
      ...manifest,
      contentVersion: 3,
      content: { ...manifest.content, maps: 'content/maps/index.json' },
    }
    const files = enumerateSeedFiles(withMaps, ['s1'], { files: [] }, { files: [] }, undefined, {
      version: 1,
      maps: [{ id: 'unused', name: '未引用', path: 'content/maps/unused.json' }],
    })
    expect(files.map((f) => f.rel)).toEqual(
      expect.arrayContaining(['content/maps/index.json', 'content/maps/unused.json']),
    )
  })
})

describe('buildBlankProject(W-blank:开箱即玩)', () => {
  test('名字 → id(kebab)+ 可玩骨架(主角入队 + 自有地图场景 + entryScene 存在)', async () => {
    const files = await buildBlankProject('My Game')
    const m = files['manifest.json'] as {
      id: string
      contentVersion: number
      entryScene: string
      startWorld: { party: string[] }
      assets: { catalog: string; legacy?: { root?: string } }
      content: Record<string, string>
    }
    expect(m.id).toBe('my-game')
    expect(m.contentVersion).toBe(3)
    expect(m.entryScene).toBe('start')
    // 队伍非空(空 party → 引擎 boot 崩);assets 指工程内(不再指原版 extracted)
    expect(m.startWorld.party).toEqual(['hero'])
    expect(m.assets.catalog).toBe('assets/index.json')
    expect(m.assets.legacy?.root).toBe('assets')
    expect(m.content.sprites).toBe('content/sprites.json')
    expect(m.content.tilesets).toBe('content/tilesets.json')
    expect(m.content.maps).toBe('content/maps/index.json')
    // 场景只保存稳定 mapId；entry 落房间中心(方形 12×12 → (12,0))
    const scene = files['content/scenes/start.json'] as {
      id: string
      mapId: string
      entry: { pos: { col: number; row: number } }
    }
    expect(scene.mapId).toBe('start')
    expect(scene.entry.pos).toMatchObject({ col: 12, row: 0 })
    // 主角带 battler(否则不能入队);地图存在
    const actors = files['content/actors.json'] as { id: string; battler?: unknown }[]
    expect(actors[0]?.battler).toBeDefined()
    const map = JSON.parse(files['content/maps/start.json'] as string) as {
      version: number
      width: number
    }
    expect(map).toMatchObject({ version: 2, width: 12 })
    expect(files['content/maps/index.json']).toEqual({
      version: 1,
      maps: [{ id: 'start', name: '起始地图', path: 'content/maps/start.json' }],
    })
  })

  test('占位素材:合成色盘 JSON + 瓦片集/精灵 .rle 二进制(ArrayBuffer)', async () => {
    const files = await buildBlankProject('g')
    const pal = files['assets/palettes/0.json'] as { colors: [number, number, number][] }
    expect(pal.colors.length).toBe(256)
    expect(files['assets/tilesets/starter.rle']).toBeInstanceOf(ArrayBuffer)
    expect(files['assets/sprites/0.rle']).toBeInstanceOf(ArrayBuffer)
    expect((files['assets/tilesets/starter.rle'] as ArrayBuffer).byteLength).toBeGreaterThan(0)
  })

  test('空名 → 兜底 id new-project', async () => {
    const files = await buildBlankProject('   ')
    expect((files['manifest.json'] as { id: string }).id).toBe('new-project')
  })
})
