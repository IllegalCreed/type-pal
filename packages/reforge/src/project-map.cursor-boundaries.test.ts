/**
 * TEST-CURSOR-PURE-WAVE-1 B03：隐藏层不进入 tilesInView。
 * 几何/涂色/图层 CRUD 见 project-map.test.ts。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './cursor-pure-fixtures.js'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
  projectMapTilesInView,
} from './project-map.js'

const SOURCE = 'tileset-001'

describe('B03 project-map 剩余合同', () => {
  test('隐藏层不进入 tilesInView，同格可见层完整保留 layerId/tileset/height', () => {
    let map = buildBlankProjectMap(2, 1, SOURCE)
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', col: 0, row: 0, tileId: 1, tilesetId: SOURCE, height: 0 },
      { layerId: 'objects', col: 0, row: 0, tileId: 2, tilesetId: SOURCE, height: 3 },
    ])
    const hidden = new Set(['floor'])
    const mapSnap = inputSnap(map)
    const hiddenSnap = [...hidden]
    const draws = projectMapTilesInView(map, { col: 0, row: 0, cols: 2, rows: 1 }, hidden)
    expect(map).toEqual(mapSnap)
    expect([...hidden]).toEqual(hiddenSnap)
    expect(draws).toEqual([
      expect.objectContaining({
        layerId: 'objects',
        tileId: 2,
        tilesetId: SOURCE,
        height: 3,
        col: 0,
        row: 0,
      }),
    ])
    expect(draws.some((draw) => draw.layerId === 'floor')).toBe(false)
    expect(map.layers.find((layer) => layer.id === 'floor')!.tiles[0]![0]).toBe(1)
  })
})
