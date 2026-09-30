import type { ProjectMap, RleFrame } from '@type-pal/reforge'
import {
  buildBlankProjectMap,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  changeMapSelection,
  clipMapSelection,
  hitTestMapContent,
  type MapSelection,
  mapSelectionBounds,
  mapWorkspaceReducer,
  selectionForStampPlacementGridPoints,
  stampPlacementAllMemberSelection,
} from './map-selection.js'

function placedMap(): ProjectMap {
  let map = buildBlankProjectMap(3, 1, 'tiles')
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'duo',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 1, col: 0 }],
    },
  ])
}

function frame(width: number, height: number, opaqueAt: [number, number][]): RleFrame {
  const opaque = new Uint8Array(width * height)
  for (const [x, y] of opaqueAt) opaque[y * width + x] = 1
  return { width, height, opaque, pixels: new Uint8Array(width * height) }
}

describe('TEST-GLM-WAVE-L-1 L01 map selection gaps', () => {
  test('组内派生与全成员选区对已删除的 placement 都安全回退', () => {
    const map = placedMap()
    expect(
      selectionForStampPlacementGridPoints(map, undefined, [{ row: 1, col: 0 }], 'floor'),
    ).toEqual({ visualSlots: [], gridPoints: [], hitScope: 'active-layer' })
    expect(stampPlacementAllMemberSelection(undefined)).toEqual({ kind: 'none' })

    // 已知 placement：只取选中点上的成员，跨点普通格不进选区。
    const placement = {
      id: 'duo',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 1, col: 0 }],
    }
    const derived = selectionForStampPlacementGridPoints(
      map,
      placement,
      [
        { row: 1, col: 0 },
        { row: 2, col: 0 },
      ],
      'floor',
    )
    expect(derived.visualSlots).toEqual([])
    expect(derived.gridPoints).toEqual([{ row: 1, col: 0 }])
  })

  test('空 incoming 的 toggle 按 subtract 处理：内容与 hitScope 原样保留', () => {
    const before: MapSelection = {
      kind: 'cells',
      visualSlots: [{ layerId: 'floor', row: 0, col: 1 }],
      gridPoints: [{ row: 1, col: 1 }],
      hitScope: 'visible-unlocked-layers',
    }
    const next = changeMapSelection(
      before,
      { visualSlots: [], gridPoints: [], hitScope: 'active-layer' },
      'toggle',
    )
    expect(next).toEqual(before)
    expect(next).not.toBe(before)
  })

  test('clipMapSelection 在无需裁剪时返回原选区身份', () => {
    const map = placedMap()
    const selection: MapSelection = {
      kind: 'cells',
      visualSlots: [{ layerId: 'floor', row: 1, col: 2 }],
      gridPoints: [{ row: 1, col: 2 }],
      hitScope: 'active-layer',
    }
    expect(clipMapSelection(selection, map)).toBe(selection)
    const placements: MapSelection = { kind: 'stamp-placements', placementIds: ['duo'] }
    expect(clipMapSelection(placements, map)).toBe(placements)
  })

  test('bounds 只对 cells 选区存在；非空 reset 返回全新空工作区', () => {
    expect(mapSelectionBounds({ kind: 'none' })).toBeUndefined()
    expect(mapSelectionBounds({ kind: 'stamp-placements', placementIds: ['duo'] })).toBeUndefined()

    const populated = mapWorkspaceReducer(
      {
        maps: {
          'map-a': {
            selection: { kind: 'cells', visualSlots: [], gridPoints: [], hitScope: 'active-layer' },
            hitScope: 'active-layer',
            hiddenLayerIds: ['floor'],
            lockedLayerIds: [],
          },
        },
      },
      { type: 'reset' },
    )
    expect(populated.maps).toEqual({})
    expect(mapWorkspaceReducer({ maps: {} }, { type: 'reset' })).toEqual({ maps: {} })
  })

  test('命中候选携带非空实例的真实绘制边界，空槽候选没有 imageBounds', () => {
    let map = buildBlankProjectMap(3, 1, 'tiles')
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    ])
    const registry = new Map([['tiles', new Map([[1, frame(64, 16, [[32, 8]])]])]])
    const hit = hitTestMapContent(map, registry, 0, 0, { activeLayerId: 'floor' })
    const primary = hit.candidates.find((item) => item.ref.col === 0)
    expect(primary?.imageBounds).toMatchObject({ width: 64, height: 16 })
    expect(hit.logicalPoint).toEqual({ row: 0, col: 0 })

    const emptySlotHit = hitTestMapContent(placedMap(), new Map(), 32, 0, {
      activeLayerId: 'floor',
    })
    const emptyCandidate = emptySlotHit.candidates.find((item) => item.ref.col === 1)
    expect(emptyCandidate?.tileId).toBeNull()
    expect(emptyCandidate?.imageBounds).toBeUndefined()
  })
})
