import type { ProjectMapV2, RleFrame } from '@type-pal/reforge'
import { latticeCenter, projectMapTileBlitRect } from '@type-pal/reforge'
import type { MapSelection } from '../core/map-selection.js'
import { gridPointKey } from '../core/map-selection.js'

export interface MapOverlayView {
  zoom: number
  panX: number
  panY: number
}

export interface MapSelectionOverlayOptions {
  tone?: 'selected' | 'preview' | 'conflict'
  dashed?: boolean
  showImageBounds?: boolean
}

/** 大选区用单个 Path2D 批量画，避免逐格 DOM/React 节点。 */
export function drawMapSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  map: ProjectMapV2,
  selection: MapSelection,
  tiles: ReadonlyMap<number, RleFrame>,
  view: MapOverlayView,
  options: MapSelectionOverlayOptions = {},
): void {
  if (selection.kind !== 'cells') return
  const tone = options.tone ?? 'selected'
  const colors =
    tone === 'conflict'
      ? { fill: 'rgba(255,72,78,0.23)', outer: 'rgba(18,4,5,0.9)', inner: '#ff6870' }
      : tone === 'preview'
        ? { fill: 'rgba(87,224,166,0.18)', outer: 'rgba(3,18,12,0.9)', inner: '#62e6ad' }
        : { fill: 'rgba(59,155,255,0.22)', outer: 'rgba(2,10,22,0.92)', inner: '#77c8ff' }
  const { zoom, panX, panY } = view
  const uniquePoints = new Map<string, { row: number; col: number }>()
  for (const ref of selection.gridPoints) uniquePoints.set(gridPointKey(ref), ref)
  for (const ref of selection.visualSlots)
    uniquePoints.set(gridPointKey(ref), { row: ref.row, col: ref.col })

  const path = new Path2D()
  for (const point of uniquePoints.values()) {
    const center = latticeCenter(point)
    const cx = (center.x - panX) * zoom
    const cy = (center.y - panY) * zoom
    const rx = 16 * zoom
    const ry = 8 * zoom
    if (cx + rx < 0 || cy + ry < 0 || cx - rx > ctx.canvas.width || cy - ry > ctx.canvas.height)
      continue
    path.moveTo(cx, cy - ry)
    path.lineTo(cx + rx, cy)
    path.lineTo(cx, cy + ry)
    path.lineTo(cx - rx, cy)
    path.closePath()
  }
  ctx.save()
  ctx.fillStyle = colors.fill
  ctx.fill(path)
  ctx.lineJoin = 'round'
  ctx.strokeStyle = colors.outer
  ctx.lineWidth = 3
  if (options.dashed) ctx.setLineDash([6, 4])
  ctx.stroke(path)
  ctx.strokeStyle = colors.inner
  ctx.lineWidth = 1.25
  ctx.stroke(path)
  ctx.restore()

  // 单/小选区同时标真实图像边界，明确越出源格的高大 tile 属于哪个源槽。
  if (!options.showImageBounds || selection.visualSlots.length > 24) return
  ctx.save()
  ctx.strokeStyle = colors.inner
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  for (const ref of selection.visualSlots) {
    const layer = map.layers.find((candidate) => candidate.id === ref.layerId)
    const tileId = layer?.tiles[ref.row]?.[ref.col]
    const frame = tileId === null || tileId === undefined ? undefined : tiles.get(tileId)
    if (!frame) continue
    const rect = projectMapTileBlitRect(ref, frame)
    ctx.strokeRect(
      (rect.x - panX) * zoom,
      (rect.y - panY) * zoom,
      rect.width * zoom,
      rect.height * zoom,
    )
  }
  ctx.restore()
}
