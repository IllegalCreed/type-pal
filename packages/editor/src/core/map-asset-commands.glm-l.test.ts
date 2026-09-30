import type { SceneDef } from '@type-pal/content'
import { MAP_INDEX_PATH } from '@type-pal/content'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  BindSceneMapCommand,
  CreateMapAssetCommand,
  CreateProjectMapCommand,
  DeleteMapAssetCommand,
  DuplicateMapAssetCommand,
  RenameMapAssetCommand,
} from './map-asset-commands.js'

function state(): EditorState {
  const scene: SceneDef = {
    id: 'scene-a',
    mapId: 'map-a',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
  return {
    manifest: { content: {} },
    scenes: [scene],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    entryPoints: [],
    maps: { 'map-a': buildBlankProjectMap(2, 1, 'tiles') },
    mapIndex: { version: 1, maps: [{ id: 'map-a', name: 'A', path: 'content/maps/map-a.json' }] },
    sceneIndex: { version: 1, scenes: [] },
    tilesets: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
  } as EditorState
}

describe('TEST-GLM-WAVE-L-1 L03 map asset command gaps', () => {
  test('首个地图资产登记时补写 manifest 的 maps 目录，undo 恢复原 manifest 引用', () => {
    const base = state()
    const command = new CreateMapAssetCommand(
      { id: 'map-b', name: 'B', path: 'content/maps/map-b.json' },
      buildBlankProjectMap(2, 1, 'tiles'),
    )
    const applied = command.apply(base)
    expect(applied.manifest.content.maps).toBe(MAP_INDEX_PATH)
    expect(applied.mapIndex.maps.map((asset) => asset.id)).toEqual(['map-a', 'map-b'])
    const undone = command.invert(applied)
    expect(undone.manifest).toBe(base.manifest)
    expect(undone.mapIndex.maps.map((asset) => asset.id)).toEqual(['map-a'])
    expect(undone.maps['map-b']).toBeUndefined()
  })

  test('maps 记录已存在（目录未登记）时创建同样拒绝', () => {
    const base = state()
    const command = new CreateMapAssetCommand(
      { id: 'map-a', name: '重复', path: 'content/maps/other.json' },
      buildBlankProjectMap(2, 1, 'tiles'),
    )
    expect(() => command.apply(base)).toThrow('地图 id "map-a" 已存在')
  })

  test('复制命令缺源地图零写；未 apply 的 invert 零写', () => {
    const base = state()
    const ghost = new DuplicateMapAssetCommand(
      'ghost',
      { id: 'copy', name: '副本', path: 'content/maps/copy.json' },
    )
    expect(ghost.apply(base)).toBe(base)
    expect(ghost.invert(base)).toBe(base)
  })

  test('改名先 trim 再比较：带空白名写入裁剪值，裁剪后同名零写', () => {
    const base = state()
    const rename = new RenameMapAssetCommand('map-a', '  湖畔  ')
    const applied = rename.apply(base)
    expect(applied.mapIndex.maps[0]?.name).toBe('湖畔')
    expect(rename.invert(applied).mapIndex.maps[0]?.name).toBe('A')

    const same = new RenameMapAssetCommand('map-a', ' A ')
    expect(same.apply(base)).toBe(base)
  })

  test('绑定与删除命令未 apply 的 invert 都是零写', () => {
    const base = state()
    const bind = new BindSceneMapCommand('scene-a', 'map-a')
    expect(bind.invert(base)).toBe(base)
    const del = new DeleteMapAssetCommand('map-a', () => {
      throw new Error('不应调用')
    })
    expect(del.invert(base)).toBe(base)
    const create = new CreateProjectMapCommand('ghost-scene', 'content/maps/new.json', buildBlankProjectMap(2, 1, 'tiles'), {
      col: 0,
      row: 0,
      height: 0,
    })
    expect(create.apply(base)).toBe(base)
    expect(create.invert(base)).toBe(base)
  })
})
