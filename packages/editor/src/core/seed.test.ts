import type { CurrentManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { sha256Hex } from './binary-signature.js'
import { buildBlankProject, enumerateSeedFiles, relativizeManifest } from './seed.js'

const manifest = {
  id: 'pal',
  name: 'PAL',
  contentVersion: 20,
  minimumSaveVersion: 8,
  defaultEntryId: 'main',
  content: {
    actors: 'content/actors.json',
    skills: 'content/skills.json',
    scenes: 'content/scenes/',
  },
  assets: {
    catalog: 'assets/index.json',
    roles: {},
  },
  entryPoints: [
    {
      id: 'main',
      label: '主要入口',
      scene: 's1',
      startWorld: { party: [], money: 0, inventory: [] },
    },
  ],
} as unknown as CurrentManifest

describe('relativizeManifest', () => {
  test('当前 manifest 不做路径兼容转换', () => {
    expect(relativizeManifest(manifest)).toEqual(manifest)
  })
  test('不改原对象(深拷)', () => {
    const clone = relativizeManifest(manifest)
    clone.assets.roles['visual.standardColorTable'] = 'changed'
    expect(manifest.assets.roles['visual.standardColorTable']).toBeUndefined()
  })
})

describe('enumerateSeedFiles', () => {
  const sceneIndex = (ids: string[]) => ({
    version: 1 as const,
    scenes: ids.map((id) => ({ id, name: id, path: `content/scenes/${id}.json` })),
  })
  const catalog = {
    version: 1 as const,
    assets: {
      'portrait.pal.001': {
        kind: 'portrait' as const,
        path: 'assets/migrated/portraits/001.png',
        mediaType: 'image/png',
        bytes: 50,
        sha256: 'a'.repeat(64),
        origin: { kind: 'legacy-migrated' as const },
      },
    },
  }
  const seed = enumerateSeedFiles(manifest, sceneIndex(['s1', 's2']), undefined, catalog)

  test('汇总:内容表 + scenes index + 每场景 + catalog 静态图', () => {
    const rels = seed.map((f) => f.rel)
    expect(rels).toContain('content/actors.json')
    expect(rels).toContain('content/skills.json')
    expect(rels).toContain('content/scenes/index.json')
    expect(rels).toContain('content/scenes/s1.json')
    expect(rels).toContain('content/scenes/s2.json')
    expect(rels.indexOf('content/scenes/s2.json')).toBeLessThan(
      rels.indexOf('content/scenes/index.json'),
    )
    expect(rels).toContain('assets/migrated/portraits/001.png')
    expect(rels).not.toContain('content/scenes/') // scenes 是目录,不作文件
    expect(rels).toContain('assets/index.json')
    expect(seed).toHaveLength(7)
  })

  test('catalog 素材与内容项都只使用项目相对路径', () => {
    const portrait = seed.find((f) => f.rel === 'assets/migrated/portraits/001.png')
    expect(portrait).toMatchObject({
      src: 'assets/migrated/portraits/001.png',
      kind: 'binary',
      size: 50,
    })
    const actors = seed.find((f) => f.rel === 'content/actors.json')
    expect(actors).toMatchObject({ src: 'content/actors.json', kind: 'json' })
  })

  test('map index 登记的零引用地图也进入克隆文件集', () => {
    const withMaps: CurrentManifest = {
      ...manifest,
      content: { ...manifest.content, maps: 'content/maps/index.json' },
    }
    const files = enumerateSeedFiles(withMaps, sceneIndex(['s1']), {
      version: 1,
      maps: [{ id: 'unused', name: '未引用', path: 'content/maps/unused.json' }],
    })
    expect(files.map((f) => f.rel)).toEqual(
      expect.arrayContaining(['content/maps/index.json', 'content/maps/unused.json']),
    )
  })

  test('未登记在 catalog 的外部资源不会进入克隆文件集', () => {
    const files = enumerateSeedFiles(manifest, sceneIndex(['s1']))
    expect(files.map((file) => file.rel).some((path) => path.includes('extracted'))).toBe(false)
  })
})

describe('buildBlankProject(W-blank:开箱即玩)', () => {
  test('名字 → id(kebab)+ 可玩骨架(主角入队 + 自有地图场景 + 直接启动入口存在)', async () => {
    const files = await buildBlankProject('My Game')
    const m = files['manifest.json'] as {
      id: string
      contentVersion: number
      minimumSaveVersion: number
      defaultEntryId: string
      entryPoints: Array<{ id: string; scene: string; startWorld: { party: string[] } }>
      assets: {
        catalog: string
        roles: Record<string, string>
        legacy?: { root?: string; families?: string[]; palettes?: string }
      }
      content: Record<string, string>
    }
    expect(m.id).toBe('my-game')
    expect(m.contentVersion).toBe(20)
    expect(m.content.worldVariables).toBe('content/world-variables.json')
    expect(files['content/world-variables.json']).toEqual({})
    expect(m.minimumSaveVersion).toBe(8)
    expect(m.defaultEntryId).toBe('new-game')
    expect(m.entryPoints[0]?.scene).toBe('start')
    expect(m).not.toHaveProperty('entryScene')
    expect(m).not.toHaveProperty('startWorld')
    // 队伍非空(空 party → 引擎 boot 崩);assets 指项目内(不再指原版 extracted)
    expect(m.entryPoints[0]?.startWorld.party).toEqual(['hero'])
    expect(m.entryPoints[0]?.startWorld).not.toHaveProperty('learnedSkills')
    expect(m.assets.catalog).toBe('assets/index.json')
    expect(m.assets.roles['visual.standardColorTable']).toBe('color.project-standard')
    expect(m.assets.legacy).toBeUndefined()
    expect(m.content.sprites).toBe('content/sprites.json')
    expect(m.content.tilesets).toBe('content/tilesets.json')
    expect(m.content.stamps).toBe('content/stamps.json')
    expect(m.content.maps).toBe('content/maps/index.json')
    expect(m.content.sharedScripts).toBe('content/shared-scripts.json')
    expect(files['content/shared-scripts.json']).toEqual({})
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
    expect(map).toMatchObject({ version: 4, width: 12 })
    expect(files['content/maps/index.json']).toEqual({
      version: 1,
      maps: [{ id: 'start', name: '起始地图', path: 'content/maps/start.json' }],
    })
    expect(files['content/stamps.json']).toEqual([])
  })

  test('占位素材:合成色盘 JSON + 瓦片集/精灵 .rle 二进制(ArrayBuffer)', async () => {
    const files = await buildBlankProject('g')
    const colorPath = 'assets/generated/colors/project-standard.json'
    const pal = files[colorPath] as { colors: [number, number, number][] }
    expect(pal.colors.length).toBe(256)
    const colorBytes = new TextEncoder().encode(`${JSON.stringify(pal, null, 2)}\n`)
    const catalog = files['assets/index.json'] as {
      assets: Record<
        string,
        { kind: string; path: string; bytes: number; sha256: string; origin: { kind: string } }
      >
    }
    expect(catalog.assets['color.project-standard']).toEqual({
      kind: 'color-table',
      path: colorPath,
      mediaType: 'application/json',
      bytes: colorBytes.byteLength,
      sha256: await sha256Hex(colorBytes),
      label: '项目标准色彩',
      origin: { kind: 'generated' },
    })
    expect(files['assets/generated/tilesets/starter.rle']).toBeInstanceOf(ArrayBuffer)
    expect(files['assets/generated/sprites/starter.rle']).toBeInstanceOf(ArrayBuffer)
    expect(
      (files['assets/generated/tilesets/starter.rle'] as ArrayBuffer).byteLength,
    ).toBeGreaterThan(0)
    const spriteBytes = files['assets/generated/sprites/starter.rle'] as ArrayBuffer
    expect(catalog.assets['sprite.generated.starter']).toEqual({
      kind: 'sprite',
      path: 'assets/generated/sprites/starter.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: spriteBytes.byteLength,
      sha256: await sha256Hex(spriteBytes),
      label: '占位主角',
      origin: { kind: 'generated' },
    })
  })

  test('空名 → 兜底 id new-project', async () => {
    const files = await buildBlankProject('   ')
    expect((files['manifest.json'] as { id: string }).id).toBe('new-project')
  })
})
