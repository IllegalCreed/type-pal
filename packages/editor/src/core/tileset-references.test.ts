import type { MapIndexV1, ProjectMap, StampTemplateV1 } from '@type-pal/content'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { describe, expect, test, vi } from 'vitest'
import { RemoveTilesetCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { scanTilesetReferences, TilesetRemovalProof } from './tileset-references.js'

const mapIndex: MapIndexV1 = {
  version: 1,
  maps: [
    { id: 'map-a', name: '地图 A', path: 'content/maps/map-a.json' },
    { id: 'map-b', name: '地图 B', path: 'content/maps/map-b.json' },
  ],
}

function stamp(tilesetId: string): StampTemplateV1 {
  return {
    id: 'tree',
    name: '树',
    tilesetId,
    origin: 'authored',
    layerSlots: [{ id: 'floor', name: '地面', depthMode: 'flat' }],
    visual: [{ layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 0, height: 0 }],
    collision: [],
  }
}

function state(maps: Record<string, ProjectMap>, stamps: StampTemplateV1[] = []): EditorState {
  return {
    manifest: { content: { maps: 'content/maps.json' } },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps,
    mapIndex,
    tilesets: [
      { id: 'tiles-a', name: '瓦片 A', category: 'test', path: 'assets/a.rle' },
      { id: 'tiles-b', name: '瓦片 B', category: 'test', path: 'assets/b.rle' },
    ],
    tilesetBlobs: { 'assets/a.rle': new Uint8Array([1, 2]).buffer },
    stamps,
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

describe('W7G-E tileset 删除引用扫描', () => {
  test('完整扫描已加载/未加载地图与组合模板，空图也是硬引用', async () => {
    const maps = {
      'map-a': buildBlankProjectMap(1, 1, 'tiles-b'),
      'map-b': buildBlankProjectMap(1, 1, 'tiles-a'),
    }
    const loadMap = vi.fn(async (id: string) => maps[id as keyof typeof maps])
    const progress = vi.fn()
    const scan = await scanTilesetReferences({
      tilesetId: 'tiles-a',
      mapIndex,
      stamps: [stamp('tiles-a')],
      loadMap,
      onProgress: progress,
    })
    expect(loadMap.mock.calls.map(([id]) => id)).toEqual(['map-a', 'map-b'])
    expect(scan).toMatchObject({ completed: 2, total: 2, done: true })
    expect(scan.mapReferences.map(({ mapId }) => mapId)).toEqual(['map-b'])
    expect(scan.stampReferences.map(({ id }) => id)).toEqual(['tree'])
    expect(progress).toHaveBeenCalled()
    expect(() => TilesetRemovalProof.fromScan(scan, mapIndex)).toThrow(/仍被/)
  })

  test('任一地图读取失败都不能生成删除许可', async () => {
    const scan = await scanTilesetReferences({
      tilesetId: 'tiles-a',
      mapIndex,
      stamps: [],
      loadMap: async (id) => {
        if (id === 'map-b') throw new Error('磁盘读取失败')
        return buildBlankProjectMap(1, 1, 'tiles-b')
      },
    })
    expect(scan.failures).toEqual([
      expect.objectContaining({ mapId: 'map-b', message: '磁盘读取失败' }),
    ])
    expect(() => TilesetRemovalProof.fromScan(scan, mapIndex)).toThrow(/不完整/)
  })

  test('Command 无 proof 或 proof 过期均 fail-closed；合法删除可撤销并恢复 blob', async () => {
    const maps = {
      'map-a': buildBlankProjectMap(1, 1, 'tiles-b'),
      'map-b': buildBlankProjectMap(1, 1, 'tiles-b'),
    }
    const scan = await scanTilesetReferences({
      tilesetId: 'tiles-a',
      mapIndex,
      stamps: [],
      loadMap: async (id) => maps[id as keyof typeof maps],
    })
    const proof = TilesetRemovalProof.fromScan(scan, mapIndex)
    const before = state(maps)
    expect(() => new RemoveTilesetCommand('tiles-a').apply(before)).toThrow(/全工程引用扫描/)
    expect(() =>
      new RemoveTilesetCommand('tiles-a', proof).apply({ ...before, stamps: [stamp('tiles-a')] }),
    ).toThrow(/组合模板/)
    expect(() =>
      new RemoveTilesetCommand('tiles-a', proof).apply({
        ...before,
        maps: { ...before.maps, 'map-b': buildBlankProjectMap(1, 1, 'tiles-a') },
      }),
    ).toThrow(/地图/)
    expect(() =>
      new RemoveTilesetCommand('tiles-a', proof).apply({
        ...before,
        mapIndex: {
          ...mapIndex,
          maps: [...mapIndex.maps, { id: 'map-c', name: 'C', path: 'content/maps/c.json' }],
        },
      }),
    ).toThrow(/索引已变化/)

    const command = new RemoveTilesetCommand('tiles-a', proof)
    const removed = command.apply(before)
    expect(removed.tilesets?.map(({ id }) => id)).toEqual(['tiles-b'])
    expect(removed.tilesetBlobs['assets/a.rle']).toBeUndefined()
    const restored = command.invert(removed)
    expect(restored.tilesets?.map(({ id }) => id)).toEqual(['tiles-a', 'tiles-b'])
    expect(new Uint8Array(restored.tilesetBlobs['assets/a.rle']!)).toEqual(new Uint8Array([1, 2]))
    expect(command.apply(restored).tilesets?.map(({ id }) => id)).toEqual(['tiles-b'])
  })
})
