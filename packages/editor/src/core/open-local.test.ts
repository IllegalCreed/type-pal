import { describe, expect, test } from 'vitest'
import { openLocalProject } from './open-local.js'

/** 内存 mock 目录句柄:覆盖 FSA 读、写、删，供 v2 一次性升级集成测试。 */
function mockDir(
  name: string,
  files: Record<string, string | ArrayBuffer>,
): FileSystemDirectoryHandle {
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      name: prefix ? prefix.split('/').pop() : name,
      async getDirectoryHandle(n: string) {
        return make(prefix ? `${prefix}/${n}` : n)
      },
      async getFileHandle(n: string, options?: { create?: boolean }) {
        const full = prefix ? `${prefix}/${n}` : n
        if (!(full in files) && !options?.create)
          throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        if (!(full in files)) files[full] = ''
        return {
          async getFile() {
            return {
              text: async () => {
                const value = files[full] ?? ''
                return typeof value === 'string' ? value : new TextDecoder().decode(value)
              },
              arrayBuffer: async () => {
                const value = files[full] ?? ''
                return typeof value === 'string' ? new TextEncoder().encode(value).buffer : value
              },
            }
          },
          async createWritable() {
            let pending: string | ArrayBuffer = ''
            return {
              async write(value: string | Blob) {
                pending = typeof value === 'string' ? value : await value.arrayBuffer()
              },
              async close() {
                files[full] = pending
              },
            }
          },
        }
      },
      async removeEntry(n: string) {
        const full = prefix ? `${prefix}/${n}` : n
        if (!(full in files)) throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        delete files[full]
      },
    }) as unknown as FileSystemDirectoryHandle
  return make('')
}

const J = (v: unknown): string => JSON.stringify(v)

const fullProject: Record<string, string | ArrayBuffer> = {
  'manifest.json': J({
    id: 'proj',
    name: 'P',
    contentVersion: 3,
    entryScene: 's1',
    content: {
      actors: 'content/actors.json',
      skills: 'content/skills.json',
      items: 'content/items.json',
      locale: 'content/locale.json',
      scenes: 'content/scenes/',
      maps: 'content/maps/index.json',
      tilesets: 'content/tilesets.json',
    },
    assets: {
      catalog: 'assets/index.json',
      roles: {},
      legacy: {
        families: ['tileset', 'sprite', 'color-table'],
        root: 'assets/extracted/data',
        tilesets: 'tileset',
        sprites: 'sprite',
        palettes: 'palette',
      },
    },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  }),
  'content/actors.json': J([{ id: 'a', name: 'name.a', spriteId: 'gs' }]),
  'content/skills.json': J({ skills: [], levelUp: {} }),
  'content/items.json': J([]),
  'content/locale.json': J({}),
  'content/scenes/index.json': J(['s1']),
  'content/scenes/s1.json': J({
    id: 's1',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }),
  'content/maps/index.json': J({
    version: 1,
    maps: [{ id: 'map-001', name: '地图 1', path: 'content/maps/map-001.json' }],
  }),
  'content/tilesets.json': J([
    { id: 'tileset-001', name: '瓦片集 1', category: 'builtin', path: 'tileset/1.rle' },
  ]),
  'assets/index.json': J({ version: 1, assets: {} }),
}

describe('openLocalProject', () => {
  test('有效工程夹 → 装配 project + 全量场景', async () => {
    const { project, scenes } = await openLocalProject(mockDir('my-proj', fullProject))
    expect(project.manifest.id).toBe('proj')
    expect(project.entryScene.id).toBe('s1')
    expect(scenes.map((s) => s.id)).toEqual(['s1'])
    expect(project.source).toBeDefined()
  })

  test('无 manifest.json → 友好报错(带夹名)', async () => {
    await expect(openLocalProject(mockDir('空夹', {}))).rejects.toThrow('空夹')
  })

  test('v2 音乐工程在打开边界一次性升级为 v3，并保留别名、引用与字节', async () => {
    const midi = new Uint8Array([0x4d, 0x54, 0x68, 0x64]).buffer
    const soundfont = new Uint8Array([1, 2, 3]).buffer
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J({
        id: 'old',
        name: '旧工程',
        contentVersion: 2,
        entryScene: 's1',
        content: {
          actors: 'content/actors.json',
          skills: 'content/skills.json',
          items: 'content/items.json',
          locale: 'content/locale.json',
          scenes: 'content/scenes/',
          maps: 'content/maps/index.json',
          tilesets: 'content/tilesets.json',
          music: 'content/music.json',
        },
        assets: {
          root: 'assets/extracted/data',
          tilesets: 'tileset',
          sprites: 'sprite',
          palettes: 'palette',
          music: 'assets/extracted/music',
        },
        startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      }),
      'content/music.json': J([{ id: 1, name: '蝶恋' }]),
      'content/scenes/s1.json': J({
        id: 's1',
        mapId: 'map-001',
        musicId: 1,
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
      }),
      'assets/extracted/music/001.mid': midi,
    }
    const opened = await openLocalProject(mockDir('old', files), {
      readSoundfont: async () => soundfont,
    })

    expect(opened.project.manifest.contentVersion).toBe(3)
    expect(opened.scenes[0]?.music).toBe('music.pal.001')
    expect(opened.project.assetCatalog.assets['music.pal.001']?.label).toBe('蝶恋')
    expect(opened.project.assetCatalog.assets['music.pal.001']?.bytes).toBe(4)
    expect(files['content/music.json']).toBeUndefined()
    expect(files['assets/migrated/music/001.mid']).toEqual(midi)
    expect(files['assets/runtime/soundfont.sf3']).toEqual(soundfont)
  })
})
