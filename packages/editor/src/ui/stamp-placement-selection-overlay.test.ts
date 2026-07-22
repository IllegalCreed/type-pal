import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { drawMapSelectionOverlay } from './map-selection-overlay.js'
import { drawStampPlacementSelectionOverlay } from './stamp-placement-selection-overlay.js'

vi.mock('./map-selection-overlay.js', () => ({ drawMapSelectionOverlay: vi.fn() }))

function mapFixture() {
  let map = buildBlankProjectMap(2, 2, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件', 'height'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
    { layerId: 'objects', row: 0, col: 0, tileId: 2, height: 3 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-1',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 0, col: 0 },
      ],
      gridPoints: [{ row: 0, col: 0 }],
    },
  ])
}

function context() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

describe('stamp placement selection overlay', () => {
  beforeEach(() => vi.clearAllMocks())

  test('hidden visual 不画但 collision=0 membership 仍画，并标 anchor', () => {
    const ctx = context()
    const map = mapFixture()
    drawStampPlacementSelectionOverlay(ctx, {
      map,
      placementIds: ['tree-1'],
      view: { zoom: 1, panX: 0, panY: 0 },
      hiddenLayerIds: new Set(['objects']),
      lockedLayerIds: new Set(),
      showCollision: true,
      activeLayerId: 'floor',
    })
    expect(vi.mocked(drawMapSelectionOverlay)).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      }),
      expect.anything(),
      expect.anything(),
    )
    expect(ctx.arc).toHaveBeenCalled()
  })

  test('组内模式先画整组轮廓，再只突出活动层视觉与独立碰撞', () => {
    const ctx = context()
    const map = mapFixture()
    drawStampPlacementSelectionOverlay(ctx, {
      map,
      placementIds: ['tree-1'],
      view: { zoom: 1, panX: 0, panY: 0 },
      hiddenLayerIds: new Set(),
      lockedLayerIds: new Set(),
      showCollision: true,
      editingPlacementId: 'tree-1',
      activeLayerId: 'objects',
    })
    expect(vi.mocked(drawMapSelectionOverlay)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(drawMapSelectionOverlay).mock.calls[1]?.[1]).toMatchObject({
      visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
      gridPoints: [{ row: 0, col: 0 }],
    })
  })
})
