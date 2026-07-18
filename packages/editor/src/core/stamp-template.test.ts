import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { MapSelection } from './map-selection.js'
import {
  buildStampTemplateFromSelection,
  collectStampTemplateUsage,
  defaultStampTemplateAnchor,
  nextStampTemplateId,
} from './stamp-template.js'

function fixture() {
  const base = buildBlankProjectMap(3, 2, 'tileset-003')
  const floor = {
    ...base.layers[0]!,
    tiles: base.layers[0]!.tiles.map((row) => [...row]),
  }
  floor.tiles[0]![0] = 1
  floor.tiles[1]![0] = 2
  const withFloor = { ...base, layers: [floor] }
  const objects = buildProjectMapLayer(withFloor, 'objects', '物件', 'height')
  objects.tiles[0]![1] = 3
  objects.heights![0]![1] = 8
  const map = insertProjectMapLayer(withFloor, objects)
  map.collision[0]![0] = 0
  map.collision[1]![0] = 2
  const selection: Extract<MapSelection, { kind: 'cells' }> = {
    kind: 'cells',
    hitScope: 'visible-unlocked-layers',
    visualSlots: [
      { layerId: 'objects', row: 0, col: 1 },
      { layerId: 'floor', row: 1, col: 0 },
      { layerId: 'floor', row: 0, col: 0 },
      { layerId: 'floor', row: 0, col: 2 },
    ],
    gridPoints: [
      { row: 1, col: 0 },
      { row: 0, col: 0 },
    ],
  }
  return { map, selection }
}

describe('buildStampTemplateFromSelection', () => {
  test('多层实例、height 和显式 collision 0 按错排 offset 精确快照', () => {
    const { map, selection } = fixture()
    const template = buildStampTemplateFromSelection({
      map,
      selection,
      id: 'house-corner',
      name: '屋角',
      category: 'building',
      anchor: { row: 0, col: 0 },
      includeCollision: true,
      layerSlotNames: { floor: '地基槽', objects: '立面槽' },
    })
    expect(template.tilesetId).toBe('tileset-003')
    expect(template.layerSlots.map((slot) => slot.id)).toEqual(['floor', 'objects'])
    expect(template.layerSlots.map((slot) => slot.name)).toEqual(['地基槽', '立面槽'])
    expect(template.visual).toEqual([
      { layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 },
      { layerSlotId: 'floor', offset: { dRow: 1, du: 1 }, tileId: 2, height: 0 },
      { layerSlotId: 'objects', offset: { dRow: 0, du: 2 }, tileId: 3, height: 8 },
    ])
    expect(template.collision).toEqual([
      { offset: { dRow: 0, du: 0 }, value: 0 },
      { offset: { dRow: 1, du: 1 }, value: 2 },
    ])
  })

  test('空视觉槽跳过；无非空视觉实例拒绝；collision 可显式排除', () => {
    const { map, selection } = fixture()
    const template = buildStampTemplateFromSelection({
      map,
      selection,
      id: 'visual-only',
      name: '仅视觉',
      anchor: defaultStampTemplateAnchor(selection)!,
      includeCollision: false,
    })
    expect(template.visual).toHaveLength(3)
    expect(template.collision).toEqual([])
    expect(defaultStampTemplateAnchor(selection)).toEqual({ row: 0, col: 0 })

    expect(() =>
      buildStampTemplateFromSelection({
        map,
        selection: {
          kind: 'cells',
          hitScope: 'active-layer',
          visualSlots: [{ layerId: 'floor', row: 0, col: 2 }],
          gridPoints: [{ row: 0, col: 2 }],
        },
        id: 'empty',
        name: '空',
        anchor: { row: 0, col: 2 },
        includeCollision: true,
      }),
    ).toThrow('非空视觉实例')
  })

  test('ID 建议可处理中文、空白与碰撞', () => {
    expect(nextStampTemplateId(' 大树 / 组合 ', [])).toBe('大树-组合')
    expect(nextStampTemplateId('tree', ['tree', 'tree-2'])).toBe('tree-3')
    expect(nextStampTemplateId('///', [])).toBe('stamp')
  })
})

test('collectStampTemplateUsage 统计已加载地图并把悬空来源作为软信息', () => {
  const { map, selection } = fixture()
  const template = buildStampTemplateFromSelection({
    map,
    selection,
    id: 'tree',
    name: '树',
    anchor: defaultStampTemplateAnchor(selection)!,
    includeCollision: false,
  })
  const placed = {
    ...map,
    version: 3 as const,
    authoring: {
      version: 1 as const,
      stampPlacements: [
        {
          id: 'p1',
          sourceStampId: 'tree',
          anchor: { row: 0, col: 0 },
          visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
          gridPoints: [],
        },
        {
          id: 'p2',
          sourceStampId: 'deleted',
          anchor: { row: 1, col: 0 },
          visualSlots: [{ layerId: 'floor', row: 1, col: 0 }],
          gridPoints: [],
        },
      ],
    },
  }
  const usage = collectStampTemplateUsage({ map: placed }, [template])
  expect(usage.byStampId.tree).toEqual({ placementCount: 1, mapIds: ['map'] })
  expect(usage.missingSources).toEqual([
    { sourceStampId: 'deleted', placementCount: 1, mapIds: ['map'] },
  ])
})
