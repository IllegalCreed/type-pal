import type { ProjectMap, RleFrame } from '@type-pal/reforge'
import { latticeCenter } from '@type-pal/reforge'
import type { MapSelection, StampGroupCellSelection } from '../core/map-selection.js'
import { buildStampPlacementIndex } from '../core/stamp-ownership.js'
import { drawMapSelectionOverlay, type MapOverlayView } from './map-selection-overlay.js'

export interface StampPlacementSelectionOverlayOptions {
  map: ProjectMap
  placementIds: readonly string[]
  tiles: ReadonlyMap<number, RleFrame>
  view: MapOverlayView
  hiddenLayerIds: ReadonlySet<string>
  lockedLayerIds: ReadonlySet<string>
  showCollision: boolean
  editingPlacementId?: string
  editingSelection?: StampGroupCellSelection
  activeLayerId: string
}

function cells(
  visualSlots: Extract<MapSelection, { kind: 'cells' }>['visualSlots'],
  gridPoints: Extract<MapSelection, { kind: 'cells' }>['gridPoints'],
): Extract<MapSelection, { kind: 'cells' }> {
  return { kind: 'cells', visualSlots, gridPoints, hitScope: 'visible-unlocked-layers' }
}

/** 每个 placement 独立成组绘制；collision=0 仍按 membership 标识。 */
export function drawStampPlacementSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  options: StampPlacementSelectionOverlayOptions,
): void {
  const index = buildStampPlacementIndex(options.map)
  for (const placementId of options.placementIds) {
    const placement = index.byId.get(placementId)
    if (!placement) continue
    const visibleVisual = placement.visualSlots.filter(
      (ref) => !options.hiddenLayerIds.has(ref.layerId),
    )
    const gridPoints = options.showCollision ? placement.gridPoints.map((ref) => ({ ...ref })) : []
    const hasLockedMember = visibleVisual.some((ref) => options.lockedLayerIds.has(ref.layerId))
    const outer = cells(
      visibleVisual.map((ref) => ({ ...ref })),
      gridPoints,
    )
    if (placement.id === options.editingPlacementId) {
      const selectedVisualKeys = new Set(
        options.editingSelection?.kind === 'cells'
          ? options.editingSelection.visualSlots.map(
              (ref) => `${ref.layerId}:${ref.row}:${ref.col}`,
            )
          : visibleVisual.map((ref) => `${ref.layerId}:${ref.row}:${ref.col}`),
      )
      const selectedGridKeys = new Set(
        options.editingSelection?.kind === 'cells'
          ? options.editingSelection.gridPoints.map((ref) => `${ref.row}:${ref.col}`)
          : gridPoints.map((ref) => `${ref.row}:${ref.col}`),
      )
      drawMapSelectionOverlay(ctx, options.map, outer, options.tiles, options.view, {
        tone: 'preview',
        dashed: true,
        showImageBounds: false,
      })
      drawMapSelectionOverlay(
        ctx,
        options.map,
        cells(
          visibleVisual
            .filter(
              (ref) =>
                ref.layerId === options.activeLayerId &&
                selectedVisualKeys.has(`${ref.layerId}:${ref.row}:${ref.col}`),
            )
            .map((ref) => ({ ...ref })),
          gridPoints.filter((ref) => selectedGridKeys.has(`${ref.row}:${ref.col}`)),
        ),
        options.tiles,
        options.view,
        { showImageBounds: true },
      )
    } else {
      drawMapSelectionOverlay(ctx, options.map, outer, options.tiles, options.view, {
        dashed: hasLockedMember,
        showImageBounds: true,
      })
    }

    const center = latticeCenter(placement.anchor)
    const x = (center.x - options.view.panX) * options.view.zoom
    const y = (center.y - options.view.panY) * options.view.zoom
    ctx.save()
    ctx.fillStyle = '#0b1728'
    ctx.strokeStyle = '#80ceff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 7, y)
    ctx.lineTo(x + 7, y)
    ctx.moveTo(x, y - 7)
    ctx.lineTo(x, y + 7)
    ctx.stroke()
    ctx.restore()
  }
}
