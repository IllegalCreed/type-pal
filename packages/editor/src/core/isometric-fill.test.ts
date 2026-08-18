import { describe, expect, test } from 'vitest'
import { floodFillIsometricTiles, type IsometricTileSample } from './isometric-fill.js'
import type { GridPointRef } from './map-selection.js'

function fixture(samples: Record<string, IsometricTileSample>) {
  const inside = new Set(['0:0', '1:0', '1:1', '2:0'])
  return floodFillIsometricTiles({
    start: { row: 0, col: 0 },
    isInside: (point) => inside.has(`${point.row}:${point.col}`),
    sampleAt: (point: GridPointRef) => samples[`${point.row}:${point.col}`],
  })
}

describe('floodFillIsometricTiles', () => {
  test('tileId 与实例高度共同构成连通边界', () => {
    expect(
      fixture({
        '0:0': { tileId: 7, tilesetId: 'tiles', height: 1 },
        '1:0': { tileId: 7, tilesetId: 'tiles', height: 1 },
        '1:1': { tileId: 7, tilesetId: 'tiles', height: 2 },
        '2:0': { tileId: 7, tilesetId: 'tiles', height: 2 },
      }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ])
  })

  test('空瓦片是 tileId=null、height=0 的普通可填充连通域', () => {
    expect(
      fixture({
        '0:0': { tileId: null, tilesetId: 'tiles', height: 0 },
        '1:0': { tileId: null, tilesetId: 'tiles', height: 0 },
        '1:1': { tileId: 3, tilesetId: 'tiles', height: 0 },
        '2:0': { tileId: 3, tilesetId: 'tiles', height: 0 },
      }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ])
  })
})
