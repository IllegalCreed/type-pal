/**
 * TEST-EDITOR-MAP-DATA-1 M01：map-selection reducer 与全选/摘要边界（map-selection.ts）。
 * 既有 map-selection.test 已覆盖接管裁剪/clip 顺序/map 隔离/全选范围/双身份——不重复。
 * 本文件：空 reset 与删不存在 map 的身份不变、组编辑 context 错配 no-op、隐藏活动层全选为
 * none 与排除 key 精确集合、摘要对已删层只统计现存数据。
 */
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  createMapWorkspaceState,
  gridPointKey,
  type MapSelection,
  mapWorkspaceReducer,
  selectAllMapContent,
  summarizeMapSelection,
  visualSlotKey,
} from './map-selection.js'

const TILESET = 'ts'
const paint = (map: ReturnType<typeof buildBlankProjectMap>) =>
  paintProjectMapCollision(
    paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: TILESET, height: 0 },
      { layerId: 'floor', row: 1, col: 0, tileId: 2, tilesetId: TILESET, height: 3 },
      { layerId: 'floor', row: 0, col: 1, tileId: null, tilesetId: null, height: 0 },
    ]),
    [
      { row: 0, col: 0, value: 1 },
      { row: 2, col: 0, value: 2 },
    ],
  )

describe('M01 mapWorkspaceReducer 空操作与 context 错配', () => {
  test('空 state reset / 删不存在 map / 无 context 组操作均返回原状态身份', () => {
    const empty = createMapWorkspaceState()
    expect(mapWorkspaceReducer(empty, { type: 'reset' })).toBe(empty) // 空 maps → 原状态
    expect(mapWorkspaceReducer(empty, { type: 'remove-map', mapId: 'nope' })).toBe(empty)
    const withMap = mapWorkspaceReducer(empty, {
      type: 'set-selection',
      mapId: 'm1',
      selection: { kind: 'none' },
    })
    expect(mapWorkspaceReducer(withMap, { type: 'remove-map', mapId: 'absent' })).toBe(withMap)
    // 无 context：set/exit 组选区 no-op（身份不变）
    expect(
      mapWorkspaceReducer(withMap, {
        type: 'set-stamp-group-selection',
        mapId: 'm1',
        selection: { kind: 'cells', visualSlots: [], gridPoints: [], hitScope: 'active-layer' },
      }),
    ).toBe(withMap)
    expect(mapWorkspaceReducer(withMap, { type: 'exit-stamp-group-edit', mapId: 'm1' })).toBe(
      withMap,
    )
    // context 错配：placementId 与单选不一致 → no-op
    expect(
      mapWorkspaceReducer(withMap, {
        type: 'enter-stamp-group-edit',
        mapId: 'm1',
        placementId: 'p1',
        selection: { kind: 'cells', visualSlots: [], gridPoints: [], hitScope: 'active-layer' },
      }),
    ).toBe(withMap)
  })
  test('隐藏活动层全选为 none；排除 key 精确集合（非空 remain）', () => {
    const map = paint(buildBlankProjectMap(2, 2, TILESET))
    expect(
      selectAllMapContent(map, {
        activeLayerId: 'floor',
        hitScope: 'active-layer',
        hiddenLayerIds: new Set(['floor']),
      }),
    ).toEqual({ kind: 'none' })
    const excluded = selectAllMapContent(map, {
      activeLayerId: 'floor',
      hitScope: 'active-layer',
      excludedVisualSlotKeys: new Set([visualSlotKey({ layerId: 'floor', row: 0, col: 0 })]),
      excludedGridPointKeys: new Set([gridPointKey({ row: 2, col: 0 })]),
    })
    expect(excluded.kind).toBe('cells')
    if (excluded.kind !== 'cells') return
    expect(excluded.visualSlots).toEqual([{ layerId: 'floor', row: 1, col: 0 }])
    expect(excluded.gridPoints).toEqual([{ row: 0, col: 0 }])
  })
  test('摘要对已删层只统计现存数据：悬空 ref 不进 layerIds/tileId/计数', () => {
    const painted = paint(buildBlankProjectMap(2, 2, TILESET))
    const stale: MapSelection = {
      kind: 'cells',
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'ghost', row: 0, col: 0 }, // 已删层
      ],
      gridPoints: [{ row: 0, col: 0 }],
      hitScope: 'active-layer',
    }
    const summary = summarizeMapSelection(stale, painted)
    expect(summary.layerIds).toEqual(['floor'])
    expect(summary.visualSlotCount).toBe(1)
    expect(summary.tileId).toEqual({ kind: 'single', value: 1 })
    expect(summary.gridPointCount).toBe(1)
    expect(summary.collision).toEqual({ kind: 'single', value: 1 })
    // 多层真实正控：第二层同格不同 tile → mixed
    const two = insertProjectMapLayer(
      paintProjectMapTiles(painted, [
        { layerId: 'extra', row: 0, col: 0, tileId: 9, tilesetId: TILESET, height: 0 },
      ]),
      buildProjectMapLayer(painted, 'extra', '加层'),
      0,
    )
    const both = summarizeMapSelection(
      {
        kind: 'cells',
        visualSlots: [
          { layerId: 'floor', row: 0, col: 0 },
          { layerId: 'extra', row: 0, col: 0 },
        ],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      two,
    )
    expect(both.tileId).toEqual({ kind: 'mixed' })
    expect(both.layerIds.sort()).toEqual(['extra', 'floor'])
  })
})
