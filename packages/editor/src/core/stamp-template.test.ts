import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import type { MapSelection } from './map-selection.js'
import {
  buildStampTemplateFromSelection,
  defaultStampTemplateAnchor,
  nextStampTemplateId,
} from './stamp-template.js'

function fixture() {
  const base = buildBlankProjectMap(3, 2, 'tileset-003')
  const withObjects = insertProjectMapLayer(base, buildProjectMapLayer(base, 'objects', '物件'))
  const map = paintProjectMapTiles(withObjects, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tileset-003', height: 0 },
    { layerId: 'floor', row: 1, col: 0, tileId: 2, tilesetId: 'tileset-003', height: 0 },
    { layerId: 'objects', row: 0, col: 1, tileId: 3, tilesetId: 'tileset-003', height: 8 },
  ])
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
    expect(template.tilesetRefs).toEqual(['tileset-003'])
    expect(template.layers.map((layer) => layer.id)).toEqual(['floor', 'objects'])
    expect(template.layers.map((layer) => layer.name)).toEqual(['地基槽', '立面槽'])
    expect(template.layers[0]?.tiles).toEqual([
      [1, null],
      [2, null],
    ])
    expect(template.layers[0]?.sources).toEqual([
      [0, null],
      [0, null],
    ])
    expect(template.layers[1]?.tiles).toEqual([
      [null, 3],
      [null, null],
    ])
    expect(template.layers[1]?.heights).toEqual([
      [0, 8],
      [0, 0],
    ])
    expect(template.collision).toEqual([
      [0, null],
      [2, null],
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
    expect(
      template.layers.flatMap((layer) => layer.tiles.flat()).filter((tile) => tile !== null),
    ).toHaveLength(3)
    expect(template.collision).toEqual([
      [null, null],
      [null, null],
    ])
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
