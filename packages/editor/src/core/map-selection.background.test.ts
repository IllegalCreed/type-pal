/**
 * TEST-CURSOR-MAP-LOGIC-2 M2：选区 reducer/摘要/全选精确槽。
 * 不去重 map-selection.test 主干长度断言与 boundaries 空 reset。
 */
import { paintProjectMapCollision, paintProjectMapTiles } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  legalBlankMap,
  legalGroupMap,
  legalPaintedMap,
} from './__tests__/cursor-map-logic-fixtures.js'
import {
  createMapWorkspaceState,
  mapWorkspaceDocument,
  mapWorkspaceReducer,
  selectAllMapContent,
  summarizeMapSelection,
} from './map-selection.js'

describe('M2 map-selection 剩余合同', () => {
  test('clip-map 精确保留现存 placementId，并丢掉已删层 hidden/locked', () => {
    const map = legalGroupMap()
    let state = createMapWorkspaceState()
    state = mapWorkspaceReducer(state, {
      type: 'change-stamp-selection',
      mapId: 'start',
      placementIds: ['tree-a', 'tree-b', 'ghost'],
      mode: 'replace',
    })
    state = mapWorkspaceReducer(state, {
      type: 'toggle-hidden-layer',
      mapId: 'start',
      layerId: 'gone',
    })
    state = mapWorkspaceReducer(state, {
      type: 'toggle-locked-layer',
      mapId: 'start',
      layerId: 'objects',
    })
    const next = mapWorkspaceReducer(state, { type: 'clip-map', mapId: 'start', map })
    const doc = mapWorkspaceDocument(next, 'start')
    expect(doc.selection).toEqual({ kind: 'stamp-placements', placementIds: ['tree-a', 'tree-b'] })
    expect(doc.hiddenLayerIds).toEqual([])
    expect(doc.lockedLayerIds).toEqual(['objects'])
  })

  test('toggle-hidden/locked 再拨回恢复精确层 id 列表', () => {
    let state = createMapWorkspaceState()
    state = mapWorkspaceReducer(state, {
      type: 'toggle-hidden-layer',
      mapId: 'start',
      layerId: 'objects',
    })
    expect(mapWorkspaceDocument(state, 'start').hiddenLayerIds).toEqual(['objects'])
    state = mapWorkspaceReducer(state, {
      type: 'toggle-hidden-layer',
      mapId: 'start',
      layerId: 'objects',
    })
    expect(mapWorkspaceDocument(state, 'start').hiddenLayerIds).toEqual([])
    state = mapWorkspaceReducer(state, {
      type: 'toggle-locked-layer',
      mapId: 'start',
      layerId: 'floor',
    })
    expect(mapWorkspaceDocument(state, 'start').lockedLayerIds).toEqual(['floor'])
    state = mapWorkspaceReducer(state, {
      type: 'toggle-locked-layer',
      mapId: 'start',
      layerId: 'floor',
    })
    expect(mapWorkspaceDocument(state, 'start').lockedLayerIds).toEqual([])
  })

  test('summarizeMapSelection 统计空槽与现存 layerIds，不把悬空层计入', () => {
    const map = paintProjectMapTiles(legalBlankMap(), [
      { layerId: 'floor', row: 1, col: 1, tileId: 2, tilesetId: 'tiles', height: 0 },
    ])
    const summary = summarizeMapSelection(
      {
        kind: 'cells',
        visualSlots: [
          { layerId: 'floor', row: 1, col: 1 },
          { layerId: 'floor', row: 2, col: 1 },
          { layerId: 'ghost', row: 0, col: 0 },
        ],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      map,
    )
    expect(summary).toMatchObject({
      visualSlotCount: 2,
      visualInstanceCount: 1,
      emptySlotCount: 1,
      layerIds: ['floor'],
      tileId: { kind: 'mixed' },
    })
  })

  test('selectAllMapContent 给出精确 visualSlots/gridPoints，不是只比长度', () => {
    let map = paintProjectMapTiles(legalPaintedMap(), [
      { layerId: 'floor', row: 2, col: 1, tileId: 8, tilesetId: 'tiles', height: 0 },
    ])
    map = paintProjectMapCollision(map, [{ row: 2, col: 1, value: 3 }])
    const selection = selectAllMapContent(map, {
      activeLayerId: 'floor',
      hitScope: 'visible-unlocked-layers',
    })
    expect(selection).toEqual({
      kind: 'cells',
      visualSlots: [{ layerId: 'floor', row: 2, col: 1 }],
      gridPoints: [
        { row: 0, col: 0 },
        { row: 2, col: 1 },
      ],
      hitScope: 'visible-unlocked-layers',
    })
  })

  test('change-selection 在组内编辑后清掉 stampGroupEditContext', () => {
    let state = createMapWorkspaceState()
    state = mapWorkspaceReducer(state, {
      type: 'change-stamp-selection',
      mapId: 'start',
      placementIds: ['tree-a'],
      mode: 'replace',
    })
    state = mapWorkspaceReducer(state, {
      type: 'enter-stamp-group-edit',
      mapId: 'start',
      placementId: 'tree-a',
      selection: {
        kind: 'cells',
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
        hitScope: 'active-layer',
      },
    })
    expect(mapWorkspaceDocument(state, 'start').stampGroupEditContext?.placementId).toBe('tree-a')
    state = mapWorkspaceReducer(state, {
      type: 'change-selection',
      mapId: 'start',
      mode: 'replace',
      input: {
        visualSlots: [{ layerId: 'floor', row: 2, col: 2 }],
        gridPoints: [],
        hitScope: 'active-layer',
      },
    })
    const doc = mapWorkspaceDocument(state, 'start')
    expect(doc.stampGroupEditContext).toBeUndefined()
    expect(doc.selection).toEqual({
      kind: 'cells',
      visualSlots: [{ layerId: 'floor', row: 2, col: 2 }],
      gridPoints: [],
      hitScope: 'active-layer',
    })
  })
})
