import { describe, expect, test } from 'vitest'
import { openLocalProject } from './open-local.js'

/** 内存 mock 目录句柄:files 以全路径为键(字符串内容)+ name。 */
function mockDir(name: string, files: Record<string, string>): FileSystemDirectoryHandle {
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      name: prefix ? prefix.split('/').pop() : name,
      async getDirectoryHandle(n: string) {
        return make(prefix ? `${prefix}/${n}` : n)
      },
      async getFileHandle(n: string) {
        const full = prefix ? `${prefix}/${n}` : n
        if (!(full in files)) throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        return {
          async getFile() {
            return { text: async () => files[full] ?? '' }
          },
        }
      },
    }) as unknown as FileSystemDirectoryHandle
  return make('')
}

const J = (v: unknown): string => JSON.stringify(v)

const fullProject: Record<string, string> = {
  'manifest.json': J({
    id: 'proj',
    name: 'P',
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
    },
    assets: {
      root: 'assets/extracted/data',
      tilesets: 'tileset',
      sprites: 'sprite',
      palettes: 'palette',
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
})
