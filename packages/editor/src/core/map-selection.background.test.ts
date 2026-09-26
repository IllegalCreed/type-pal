/**
 * TEST-CURSOR-MAP-LOGIC-2 M2：选区 reducer/摘要/全选精确槽。
 * 不去重 map-selection.test 主干长度断言与 boundaries 空 reset。
 */
import { paintProjectMapCollision, paintProjectMapTiles } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  inputSnap,
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
    const stampAction = {
      type: 'change-stamp-selection' as const,
      mapId: 'start',
      placementIds: ['tree-a', 'tree-b', 'ghost'],
      mode: 'replace' as const,
    }
    const stampInput = state
    const stampSnap = inputSnap(stampInput)
    const stampActionSnap = inputSnap(stampAction)
    state = mapWorkspaceReducer(stampInput, stampAction)
    expect(stampInput).toEqual(stampSnap)
    expect(stampAction).toEqual(stampActionSnap)
    const hideAction = { type: 'toggle-hidden-layer' as const, mapId: 'start', layerId: 'gone' }
    const hideInput = state
    const hideSnap = inputSnap(hideInput)
    const hideActionSnap = inputSnap(hideAction)
    state = mapWorkspaceReducer(hideInput, hideAction)
    expect(hideInput).toEqual(hideSnap)
    expect(hideAction).toEqual(hideActionSnap)
    const lockAction = { type: 'toggle-locked-layer' as const, mapId: 'start', layerId: 'objects' }
    const lockInput = state
    const lockSnap = inputSnap(lockInput)
    const lockActionSnap = inputSnap(lockAction)
    state = mapWorkspaceReducer(lockInput, lockAction)
    expect(lockInput).toEqual(lockSnap)
    expect(lockAction).toEqual(lockActionSnap)
    const clipAction = { type: 'clip-map' as const, mapId: 'start', map }
    const clipInput = state
    const clipStateSnap = inputSnap(clipInput)
    const clipMapSnap = inputSnap(map)
    const clipActionSnap = inputSnap(clipAction)
    const next = mapWorkspaceReducer(clipInput, clipAction)
    expect(clipInput).toEqual(clipStateSnap)
    expect(map).toEqual(clipMapSnap)
    expect(clipAction).toEqual(clipActionSnap)
    const doc = mapWorkspaceDocument(next, 'start')
    expect(doc.selection).toEqual({ kind: 'stamp-placements', placementIds: ['tree-a', 'tree-b'] })
    expect(doc.hiddenLayerIds).toEqual([])
    expect(doc.lockedLayerIds).toEqual(['objects'])
  })

  test('toggle-hidden/locked 再拨回恢复精确层 id 列表', () => {
    let state = createMapWorkspaceState()
    const hide = { type: 'toggle-hidden-layer' as const, mapId: 'start', layerId: 'objects' }
    const hideInput = state
    const hideSnap = inputSnap(hideInput)
    const hideActionSnap = inputSnap(hide)
    state = mapWorkspaceReducer(hideInput, hide)
    expect(hideInput).toEqual(hideSnap)
    expect(hide).toEqual(hideActionSnap)
    expect(mapWorkspaceDocument(state, 'start').hiddenLayerIds).toEqual(['objects'])
    const hideBackInput = state
    const hideBackSnap = inputSnap(hideBackInput)
    state = mapWorkspaceReducer(hideBackInput, hide)
    expect(hideBackInput).toEqual(hideBackSnap)
    expect(hide).toEqual(hideActionSnap)
    expect(mapWorkspaceDocument(state, 'start').hiddenLayerIds).toEqual([])
    const lock = { type: 'toggle-locked-layer' as const, mapId: 'start', layerId: 'floor' }
    const lockInput = state
    const lockSnap = inputSnap(lockInput)
    const lockActionSnap = inputSnap(lock)
    state = mapWorkspaceReducer(lockInput, lock)
    expect(lockInput).toEqual(lockSnap)
    expect(lock).toEqual(lockActionSnap)
    expect(mapWorkspaceDocument(state, 'start').lockedLayerIds).toEqual(['floor'])
    const lockBackInput = state
    const lockBackSnap = inputSnap(lockBackInput)
    state = mapWorkspaceReducer(lockBackInput, lock)
    expect(lockBackInput).toEqual(lockBackSnap)
    expect(lock).toEqual(lockActionSnap)
    expect(mapWorkspaceDocument(state, 'start').lockedLayerIds).toEqual([])
  })

  test('summarizeMapSelection 统计空槽与现存 layerIds，不把悬空层计入', () => {
    const map = paintProjectMapTiles(legalBlankMap(), [
      { layerId: 'floor', row: 1, col: 1, tileId: 2, tilesetId: 'tiles', height: 0 },
    ])
    const selection = {
      kind: 'cells' as const,
      visualSlots: [
        { layerId: 'floor', row: 1, col: 1 },
        { layerId: 'floor', row: 2, col: 1 },
        { layerId: 'ghost', row: 0, col: 0 },
      ],
      gridPoints: [],
      hitScope: 'active-layer' as const,
    }
    const mapSnap = inputSnap(map)
    const selectionSnap = inputSnap(selection)
    const summary = summarizeMapSelection(selection, map)
    expect(map).toEqual(mapSnap)
    expect(selection).toEqual(selectionSnap)
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
    const options = { activeLayerId: 'floor', hitScope: 'visible-unlocked-layers' as const }
    const mapSnap = inputSnap(map)
    const optionsSnap = inputSnap(options)
    const selection = selectAllMapContent(map, options)
    expect(map).toEqual(mapSnap)
    expect(options).toEqual(optionsSnap)
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
    const stampAction = {
      type: 'change-stamp-selection' as const,
      mapId: 'start',
      placementIds: ['tree-a'],
      mode: 'replace' as const,
    }
    const stampInput = state
    const stampSnap = inputSnap(stampInput)
    const stampActionSnap = inputSnap(stampAction)
    state = mapWorkspaceReducer(stampInput, stampAction)
    expect(stampInput).toEqual(stampSnap)
    expect(stampAction).toEqual(stampActionSnap)
    const enterAction = {
      type: 'enter-stamp-group-edit' as const,
      mapId: 'start',
      placementId: 'tree-a',
      selection: {
        kind: 'cells' as const,
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
        hitScope: 'active-layer' as const,
      },
    }
    const enterInput = state
    const enterSnap = inputSnap(enterInput)
    const enterActionSnap = inputSnap(enterAction)
    state = mapWorkspaceReducer(enterInput, enterAction)
    expect(enterInput).toEqual(enterSnap)
    expect(enterAction).toEqual(enterActionSnap)
    expect(mapWorkspaceDocument(state, 'start').stampGroupEditContext?.placementId).toBe('tree-a')
    const changeAction = {
      type: 'change-selection' as const,
      mapId: 'start',
      mode: 'replace' as const,
      input: {
        visualSlots: [{ layerId: 'floor', row: 2, col: 2 }],
        gridPoints: [],
        hitScope: 'active-layer' as const,
      },
    }
    const changeInput = state
    const changeSnap = inputSnap(changeInput)
    const changeActionSnap = inputSnap(changeAction)
    state = mapWorkspaceReducer(changeInput, changeAction)
    expect(changeInput).toEqual(changeSnap)
    expect(changeAction).toEqual(changeActionSnap)
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
