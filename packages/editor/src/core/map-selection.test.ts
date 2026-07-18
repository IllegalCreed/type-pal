import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  projectMapStampPlacements,
  type RleFrame,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  changeMapSelection,
  changeStampPlacementSelection,
  clipMapSelection,
  createMapWorkspaceState,
  hitTestMapContent,
  isMapSelectionDrag,
  type MapSelection,
  mapSelectionBounds,
  mapWorkspaceDocument,
  mapWorkspaceReducer,
  selectAllMapContent,
  selectionForGridPoints,
  selectionForStampPlacementGridPoints,
  selectionModeFromModifiers,
  stampPlacementAllMemberSelection,
  summarizeMapSelection,
} from './map-selection.js'

function twoLayerMap() {
  const base = buildBlankProjectMap(3, 2, 'tiles')
  return insertProjectMapLayer(base, buildProjectMapLayer(base, 'objects', '物件', 'height'))
}

const cells = (
  visualSlots: { layerId: string; row: number; col: number }[],
  gridPoints: { row: number; col: number }[],
): MapSelection => ({ kind: 'cells', visualSlots, gridPoints, hitScope: 'active-layer' })

describe('W8 selection reducer', () => {
  test('placement 复数选区增减去重，且与 cells domain 永不混合', () => {
    const selected = changeStampPlacementSelection({ kind: 'none' }, ['a', 'a'], 'replace')
    expect(selected).toEqual({ kind: 'stamp-placements', placementIds: ['a'] })
    const added = changeStampPlacementSelection(selected, ['b'], 'add')
    expect(added).toEqual({ kind: 'stamp-placements', placementIds: ['a', 'b'] })
    expect(changeStampPlacementSelection(added, ['a'], 'subtract')).toEqual({
      kind: 'stamp-placements',
      placementIds: ['b'],
    })
    expect(changeStampPlacementSelection(added, ['a', 'b'], 'subtract')).toEqual({ kind: 'none' })

    const cellInput = {
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
      hitScope: 'active-layer' as const,
    }
    expect(changeMapSelection(added, cellInput, 'add')).toEqual({ kind: 'cells', ...cellInput })
    expect(
      changeStampPlacementSelection(
        cells(cellInput.visualSlots, cellInput.gridPoints),
        ['a'],
        'add',
      ),
    ).toEqual({
      kind: 'stamp-placements',
      placementIds: ['a'],
    })
  })

  test('replace/add/subtract 分通道去重，减空归 none，且不修改输入', () => {
    const original = cells([{ layerId: 'floor', row: 0, col: 0 }], [{ row: 0, col: 0 }])
    const addInput = {
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 0, col: 0 },
        { layerId: 'objects', row: 0, col: 0 },
      ],
      gridPoints: [
        { row: 0, col: 0 },
        { row: 0, col: 0 },
      ],
      hitScope: 'visible-unlocked-layers' as const,
    }
    const added = changeMapSelection(original, addInput, 'add')
    expect(added).toEqual({
      kind: 'cells',
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 0, col: 0 },
      ],
      gridPoints: [{ row: 0, col: 0 }],
      hitScope: 'visible-unlocked-layers',
    })
    expect(original).toEqual(cells([{ layerId: 'floor', row: 0, col: 0 }], [{ row: 0, col: 0 }]))

    const onlyCollision = changeMapSelection(
      added,
      {
        visualSlots: [
          { layerId: 'floor', row: 0, col: 0 },
          { layerId: 'objects', row: 0, col: 0 },
        ],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      'subtract',
    )
    expect(onlyCollision).toEqual({
      kind: 'cells',
      visualSlots: [],
      gridPoints: [{ row: 0, col: 0 }],
      hitScope: 'visible-unlocked-layers',
    })
    expect(
      changeMapSelection(
        onlyCollision,
        { visualSlots: [], gridPoints: [{ row: 0, col: 0 }], hitScope: 'active-layer' },
        'subtract',
      ),
    ).toEqual({ kind: 'none' })
  })

  test('active 与跨层作用域保留空槽；跨层同格 collision 仍只有一份', () => {
    const map = twoLayerMap()
    expect(
      selectionForGridPoints(map, [{ row: 1, col: 1 }], {
        activeLayerId: 'floor',
        hitScope: 'active-layer',
      }),
    ).toEqual({
      visualSlots: [{ layerId: 'floor', row: 1, col: 1 }],
      gridPoints: [{ row: 1, col: 1 }],
      hitScope: 'active-layer',
    })
    expect(
      selectionForGridPoints(map, [{ row: 1, col: 1 }], {
        activeLayerId: 'floor',
        hitScope: 'visible-unlocked-layers',
      }),
    ).toEqual({
      visualSlots: [
        { layerId: 'floor', row: 1, col: 1 },
        { layerId: 'objects', row: 1, col: 1 },
      ],
      gridPoints: [{ row: 1, col: 1 }],
      hitScope: 'visible-unlocked-layers',
    })
  })

  test('隐藏/锁定/缺失活动层不产生普通命中，跨层排除不可写层', () => {
    const map = twoLayerMap()
    const hidden = new Set(['floor'])
    const locked = new Set(['objects'])
    expect(
      selectionForGridPoints(map, [{ row: 0, col: 0 }], {
        activeLayerId: 'floor',
        hitScope: 'active-layer',
        hiddenLayerIds: hidden,
      }),
    ).toEqual({ visualSlots: [], gridPoints: [], hitScope: 'active-layer' })
    expect(
      selectionForGridPoints(map, [{ row: 0, col: 0 }], {
        activeLayerId: 'missing',
        hitScope: 'active-layer',
      }).visualSlots,
    ).toEqual([])
    expect(
      selectionForGridPoints(map, [{ row: 0, col: 0 }], {
        activeLayerId: 'floor',
        hitScope: 'visible-unlocked-layers',
        lockedLayerIds: locked,
      }).visualSlots,
    ).toEqual([{ layerId: 'floor', row: 0, col: 0 }])
  })

  test('手势修饰键与屏幕阈值不受地图缩放影响', () => {
    expect(selectionModeFromModifiers({ shiftKey: false, ctrlKey: false, metaKey: false })).toBe(
      'replace',
    )
    expect(selectionModeFromModifiers({ shiftKey: true, ctrlKey: false, metaKey: false })).toBe(
      'add',
    )
    expect(selectionModeFromModifiers({ shiftKey: true, ctrlKey: true, metaKey: false })).toBe(
      'subtract',
    )
    expect(isMapSelectionDrag({ x: 10, y: 10 }, { x: 12, y: 12 })).toBe(false)
    expect(isMapSelectionDrag({ x: 10, y: 10 }, { x: 14, y: 10 })).toBe(true)
  })
})

describe('W8 selection workspace / clipping / summary', () => {
  test('普通 cells 在对应槽被 placement 接管后自动裁去，不能保留双重选择身份', () => {
    const populated = paintProjectMapCollision(
      paintProjectMapTiles(twoLayerMap(), [
        { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
        { layerId: 'floor', row: 0, col: 1, tileId: 2, height: 0 },
      ]),
      [
        { row: 0, col: 0, value: 1 },
        { row: 0, col: 1, value: 2 },
      ],
    )
    const map = withProjectMapStampPlacements(populated, [
      {
        id: 'owner',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
    ])
    expect(
      clipMapSelection(
        cells(
          [
            { layerId: 'floor', row: 0, col: 0 },
            { layerId: 'floor', row: 0, col: 1 },
          ],
          [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
        ),
        map,
      ),
    ).toEqual(cells([{ layerId: 'floor', row: 0, col: 1 }], [{ row: 0, col: 1 }]))
  })

  test('placement clip 按实时顺序去悬空 ID；组内 context 只随单组选区保留', () => {
    const populated = paintProjectMapTiles(twoLayerMap(), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
      { layerId: 'objects', row: 1, col: 1, tileId: 2, height: 0 },
    ])
    const map = withProjectMapStampPlacements(populated, [
      {
        id: 'a',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
      },
      {
        id: 'b',
        anchor: { row: 1, col: 1 },
        visualSlots: [{ layerId: 'objects', row: 1, col: 1 }],
        gridPoints: [],
      },
    ])
    expect(
      clipMapSelection({ kind: 'stamp-placements', placementIds: ['ghost', 'b', 'a'] }, map),
    ).toEqual({ kind: 'stamp-placements', placementIds: ['a', 'b'] })

    let state = createMapWorkspaceState()
    state = mapWorkspaceReducer(state, {
      type: 'set-selection',
      mapId: 'm',
      selection: { kind: 'stamp-placements', placementIds: ['a'] },
    })
    state = mapWorkspaceReducer(state, {
      type: 'enter-stamp-group-edit',
      mapId: 'm',
      placementId: 'a',
      selection: stampPlacementAllMemberSelection(
        projectMapStampPlacements(map).find((placement) => placement.id === 'a'),
      ),
    })
    expect(mapWorkspaceDocument(state, 'm').stampGroupEditContext).toEqual({
      placementId: 'a',
      selection: {
        kind: 'cells',
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [],
        hitScope: 'active-layer',
      },
    })
    state = mapWorkspaceReducer(state, {
      type: 'change-stamp-selection',
      mapId: 'm',
      placementIds: ['b'],
      mode: 'add',
    })
    expect(mapWorkspaceDocument(state, 'm').stampGroupEditContext).toBeUndefined()
  })

  test('按 mapId 隔离，scope 切换保留既有选区，删地图清对应 workspace', () => {
    let state = createMapWorkspaceState()
    state = mapWorkspaceReducer(state, {
      type: 'change-selection',
      mapId: 'a',
      input: {
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
        hitScope: 'active-layer',
      },
      mode: 'replace',
    })
    const before = mapWorkspaceDocument(state, 'a').selection
    state = mapWorkspaceReducer(state, {
      type: 'set-hit-scope',
      mapId: 'a',
      hitScope: 'visible-unlocked-layers',
    })
    expect(mapWorkspaceDocument(state, 'a').selection).toBe(before)
    expect(mapWorkspaceDocument(state, 'b').selection).toEqual({ kind: 'none' })
    state = mapWorkspaceReducer(state, { type: 'remove-map', mapId: 'a' })
    expect(state.maps.a).toBeUndefined()
    state = mapWorkspaceReducer(state, {
      type: 'set-hit-scope',
      mapId: 'b',
      hitScope: 'visible-unlocked-layers',
    })
    expect(mapWorkspaceReducer(state, { type: 'reset' })).toEqual({ maps: {} })
  })

  test('组内 cells 只从指定 placement 的当前层成员与碰撞 membership 派生', () => {
    let populated = paintProjectMapTiles(twoLayerMap(), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
      { layerId: 'objects', row: 0, col: 0, tileId: 2, height: 1 },
      { layerId: 'floor', row: 1, col: 0, tileId: 3, height: 0 },
    ])
    populated = paintProjectMapCollision(populated, [
      { row: 0, col: 0, value: 0 },
      { row: 1, col: 0, value: 1 },
    ])
    const map = withProjectMapStampPlacements(populated, [
      {
        id: 'a',
        anchor: { row: 0, col: 0 },
        visualSlots: [
          { layerId: 'floor', row: 0, col: 0 },
          { layerId: 'objects', row: 0, col: 0 },
        ],
        gridPoints: [{ row: 0, col: 0 }],
      },
      {
        id: 'b',
        anchor: { row: 1, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 1, col: 0 }],
        gridPoints: [{ row: 1, col: 0 }],
      },
    ])
    const placementA = projectMapStampPlacements(map).find((placement) => placement.id === 'a')
    expect(
      selectionForStampPlacementGridPoints(map, placementA, [{ row: 0, col: 0 }], 'floor'),
    ).toEqual({
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
      hitScope: 'active-layer',
    })
    expect(
      selectionForStampPlacementGridPoints(
        map,
        placementA,
        [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
        ],
        'objects',
      ),
    ).toEqual({
      visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
      hitScope: 'active-layer',
    })
  })

  test('删层只裁 visual；缩图同时裁 visual/grid；tile 变空与重排不裁 stable ref', () => {
    const map = twoLayerMap()
    const selection = cells(
      [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 3, col: 2 },
        { layerId: 'ghost', row: 0, col: 0 },
      ],
      [
        { row: 0, col: 0 },
        { row: 3, col: 2 },
      ],
    )
    const clipped = clipMapSelection(selection, map)
    expect(clipped).toEqual(
      cells(
        [
          { layerId: 'floor', row: 0, col: 0 },
          { layerId: 'objects', row: 3, col: 2 },
        ],
        [
          { row: 0, col: 0 },
          { row: 3, col: 2 },
        ],
      ),
    )
    expect(clipMapSelection(clipped, map)).toBe(clipped)
    const small = { ...map, width: 2, height: 1 }
    expect(clipMapSelection(clipped, small)).toEqual(
      cells([{ layerId: 'floor', row: 0, col: 0 }], [{ row: 0, col: 0 }]),
    )
  })

  test('全选固定只含活动层非空视觉槽和非零 collision；跨层开关不扩大范围', () => {
    let map = twoLayerMap()
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 2, height: 0 },
      { layerId: 'objects', row: 1, col: 1, tileId: 7, height: 3 },
      { layerId: 'objects', row: 2, col: 1, tileId: 8, height: 5 },
    ])
    map = paintProjectMapCollision(map, [{ row: 3, col: 2, value: 4 }])
    const all = selectAllMapContent(map, {
      activeLayerId: 'objects',
      hitScope: 'visible-unlocked-layers',
    })
    expect(all.kind).toBe('cells')
    if (all.kind !== 'cells') return
    expect(all.visualSlots).toHaveLength(2)
    expect(all.visualSlots.every((ref) => ref.layerId === 'objects')).toBe(true)
    expect(all.gridPoints).toEqual([{ row: 3, col: 2 }])
    const summary = summarizeMapSelection(all, map)
    expect(summary).toMatchObject({
      visualSlotCount: 2,
      visualInstanceCount: 2,
      emptySlotCount: 0,
      gridPointCount: 1,
      flatInstanceCount: 0,
      heightInstanceCount: 2,
      tileId: { kind: 'mixed' },
      height: { kind: 'mixed' },
      collision: { kind: 'single', value: 4 },
    })
  })

  test('最大规格密集选区计算 bounds 不依赖数组展开参数上限', () => {
    const gridPoints = Array.from({ length: 256 * 512 }, (_, index) => ({
      row: Math.floor(index / 256),
      col: index % 256,
    }))
    expect(
      mapSelectionBounds({
        kind: 'cells',
        visualSlots: [],
        gridPoints,
        hitScope: 'active-layer',
      }),
    ).toEqual({ minRow: 0, minCol: 0, maxRow: 511, maxCol: 255 })
  })
})

function frame(width: number, height: number, opaqueAt: [number, number][]): RleFrame {
  const opaque = new Uint8Array(width * height)
  for (const [x, y] of opaqueAt) opaque[y * width + x] = 1
  return { width, height, opaque, pixels: new Uint8Array(width * height) }
}

describe('W8 opaque hit policy (R1/R5)', () => {
  test('活动层越出源格的 opaque 像素优先于光标逻辑格；逻辑格仍在候选', () => {
    let map = buildBlankProjectMap(3, 1, 'tiles')
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
      { layerId: 'floor', row: 0, col: 1, tileId: 2, height: 0 },
    ])
    const tiles = new Map<number, RleFrame>([
      [1, frame(64, 16, [[48, 8]])],
      [2, frame(32, 16, [[16, 8]])],
    ])
    const hit = hitTestMapContent(map, tiles, 32, 0, { activeLayerId: 'floor' })
    expect(hit.logicalPoint).toEqual({ row: 0, col: 1 })
    // 同层有多个 opaque 重叠时与 renderer 的“后画在上”一致，逻辑格 tile #2 最后绘制。
    expect(hit.primary?.ref).toEqual({ layerId: 'floor', row: 0, col: 1 })
    expect(hit.candidates.map((item) => item.ref)).toEqual([
      { layerId: 'floor', row: 0, col: 0 },
      { layerId: 'floor', row: 0, col: 1 },
    ])

    // 让逻辑格像素透明后，仍命中越界可见像素的真实源格，而不是逻辑槽。
    tiles.set(2, frame(32, 16, []))
    const visible = hitTestMapContent(map, tiles, 32, 0, { activeLayerId: 'floor' })
    expect(visible.primary?.ref).toEqual({ layerId: 'floor', row: 0, col: 0 })
    expect(visible.candidates.some((item) => item.logicalHit && item.ref.col === 1)).toBe(true)
  })

  test('Alt 候选按面板顶层优先再 row/col；跨层像素不抢活动层，locked 灰显', () => {
    let map = twoLayerMap()
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
      { layerId: 'objects', row: 0, col: 0, tileId: 2, height: 2 },
    ])
    const solid = frame(32, 16, [[16, 8]])
    const hit = hitTestMapContent(
      map,
      new Map([
        [1, solid],
        [2, solid],
      ]),
      0,
      0,
      {
        activeLayerId: 'floor',
        lockedLayerIds: new Set(['objects']),
      },
    )
    expect(hit.primary?.ref.layerId).toBe('floor')
    expect(hit.candidates.map((item) => item.ref.layerId)).toEqual(['objects', 'floor'])
    expect(hit.candidates[0]).toMatchObject({ locked: true, selectable: false })
  })
})
