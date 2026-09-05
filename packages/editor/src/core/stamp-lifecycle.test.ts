import type { ProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  projectMapStampPlacements,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  DeleteMapAssetCommand,
  DuplicateMapAssetCommand,
  RemoveProjectMapLayerCommand,
  ResizeProjectMapCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'
import { buildProjectReferenceSnapshot, createProjectReferenceIndex } from './project-reference.js'
import { inspectStampStructureImpact, resolveStampStructureOperation } from './stamp-lifecycle.js'

function fixtureMap(): ProjectMap {
  let map: ProjectMap = buildBlankProjectMap(3, 2, 'tiles-a')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: 'tiles', height: 3 },
    { layerId: 'floor', row: 3, col: 2, tileId: 4, tilesetId: 'tiles', height: 0 },
  ])
  map = paintProjectMapCollision(map, [
    { row: 1, col: 0, value: 5 },
    { row: 3, col: 2, value: 6 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'span',
      sourceStampId: 'tree',
      sourceStampName: '跨层树',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 1, col: 0 },
      ],
      gridPoints: [{ row: 1, col: 0 }],
    },
    {
      id: 'edge',
      sourceStampId: 'edge',
      sourceStampName: '边缘组合',
      anchor: { row: 3, col: 2 },
      visualSlots: [{ layerId: 'floor', row: 3, col: 2 }],
      gridPoints: [{ row: 3, col: 2 }],
    },
  ])
}

function state(map = fixtureMap()): EditorState {
  return {
    manifest: { content: { maps: 'content/maps.json' } },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    maps: { 'map-a': map },
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-a', name: '地图 A', path: 'content/maps/map-a.json' }],
    },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
  } as unknown as EditorState
}

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }
const noReferences = () => createProjectReferenceIndex(buildProjectReferenceSnapshot([]))

describe('W7G-E stamp structure lifecycle', () => {
  test('impact 只包含真正受删层/缩图影响的 placement', () => {
    const map = fixtureMap()
    expect(
      inspectStampStructureImpact(map, { kind: 'remove-layer', layerId: 'objects' }).placementIds,
    ).toEqual(['span'])
    expect(
      inspectStampStructureImpact(map, { kind: 'resize', width: 2, height: 1 }).placementIds,
    ).toEqual(['edge'])
    expect(
      inspectStampStructureImpact(map, { kind: 'resize', width: 4, height: 3 }).placementIds,
    ).toEqual([])
  })

  test('默认删层 fail-loud；显式解组与删整组均和删层同一命令可逆', () => {
    const before = state()
    const beforeMap = before.maps['map-a']
    expect(() => new RemoveProjectMapLayerCommand('map-a', 'objects').apply(before)).toThrow(
      /先解组/,
    )
    expect(before.maps['map-a']).toBe(beforeMap)

    const ungroup = new RemoveProjectMapLayerCommand('map-a', 'objects', {
      resolution: 'ungroup',
      permission: writable,
    })
    const ungrouped = ungroup.apply(before)
    const ungroupedMap = ungrouped.maps['map-a']!
    expect(ungroupedMap.layers.map((layer) => layer.id)).toEqual(['floor'])
    expect(projectMapStampPlacements(ungroupedMap).map((placement) => placement.id)).toEqual([
      'edge',
    ])
    expect(ungroupedMap.layers[0]?.tiles[0]?.[0]).toBe(1)
    expect(ungroupedMap.collision[1]?.[0]).toBe(5)
    expect(ungroup.invert(ungrouped).maps['map-a']).toBe(before.maps['map-a'])

    const removeGroup = new RemoveProjectMapLayerCommand('map-a', 'objects', {
      resolution: 'delete-groups',
      permission: writable,
    })
    const deleted = removeGroup.apply(before)
    const deletedMap = deleted.maps['map-a']!
    expect(deletedMap.layers[0]?.tiles[0]?.[0]).toBeNull()
    expect(deletedMap.collision[1]?.[0]).toBe(0)
    expect(projectMapStampPlacements(deletedMap).map((placement) => placement.id)).toEqual(['edge'])
    expect(removeGroup.invert(deleted).maps['map-a']).toBe(before.maps['map-a'])
  })

  test('缩图默认阻止越界 anchor/visual/grid；扩图保持 placement', () => {
    const before = state()
    expect(() => new ResizeProjectMapCommand('map-a', 2, 1).apply(before)).toThrow(/1 个组合/)

    const shrink = new ResizeProjectMapCommand('map-a', 2, 1, {
      resolution: 'ungroup',
      permission: writable,
    })
    const shrunk = shrink.apply(before)
    expect(shrunk.maps['map-a']).toMatchObject({ width: 2, height: 1 })
    expect(projectMapStampPlacements(shrunk.maps['map-a']!).map(({ id }) => id)).toEqual(['span'])
    expect(shrink.invert(shrunk).maps['map-a']).toBe(before.maps['map-a'])

    const expand = new ResizeProjectMapCommand('map-a', 4, 3)
    const expanded = expand.apply(before)
    expect(projectMapStampPlacements(expanded.maps['map-a']!).map(({ id }) => id)).toEqual([
      'edge',
      'span',
    ])
  })

  test('显式解组/删组仍要求全部受影响视觉层可写', () => {
    const map = fixtureMap()
    expect(() =>
      resolveStampStructureOperation(
        map,
        { kind: 'remove-layer', layerId: 'objects' },
        {
          resolution: 'ungroup',
          permission: { hiddenLayerIds: [], lockedLayerIds: ['floor'] },
        },
      ),
    ).toThrow(/锁定/)
    expect(() =>
      resolveStampStructureOperation(map, { kind: 'remove-layer', layerId: 'objects' }, {
        resolution: 'ungroup',
      } as never),
    ).toThrow(/显式声明图层可写权限/)
  })

  test('对话确认持有 beforeMap 引用，任何中途地图变化都 fail-loud', () => {
    const map = fixtureMap()
    const changed = paintProjectMapCollision(map, [{ row: 0, col: 1, value: 2 }])
    expect(() =>
      resolveStampStructureOperation(
        changed,
        { kind: 'remove-layer', layerId: 'objects' },
        {
          resolution: 'ungroup',
          permission: writable,
          expectedMap: map,
        },
      ),
    ).toThrow(/确认已过期/)
  })

  test('地图 clone 保留 map-local groupId 且深复制；删除地图随图删除并可撤销', () => {
    const before = state()
    const duplicate = new DuplicateMapAssetCommand('map-a', {
      id: 'map-copy',
      name: '地图副本',
      path: 'content/maps/map-copy.json',
    })
    const copied = duplicate.apply(before)
    expect(projectMapStampPlacements(copied.maps['map-copy']!).map(({ id }) => id)).toEqual([
      'edge',
      'span',
    ])
    expect(copied.maps['map-copy']).not.toBe(before.maps['map-a'])
    expect(copied.maps['map-copy']?.layers).not.toBe(before.maps['map-a']?.layers)
    expect(duplicate.invert(copied).maps['map-copy']).toBeUndefined()

    const remove = new DeleteMapAssetCommand('map-a', noReferences)
    const removed = remove.apply(before)
    expect(removed.maps['map-a']).toBeUndefined()
    expect(
      projectMapStampPlacements(remove.invert(removed).maps['map-a']!).map(({ id }) => id),
    ).toEqual(['edge', 'span'])
  })
})
