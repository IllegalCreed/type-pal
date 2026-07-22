import { latticeCenter } from '@type-pal/reforge'
import type { MapSelection } from '../core/map-selection.js'
import { gridPointKey } from '../core/map-selection.js'

export interface MapOverlayView {
  zoom: number
  panX: number
  panY: number
}

export interface MapSelectionOverlayOptions {
  tone?: 'selected' | 'preview' | 'conflict' | 'locked'
}

interface OverlayPoint {
  x: number
  y: number
}

export interface MapSelectionBoundarySegment {
  from: OverlayPoint
  to: OverlayPoint
}

function pointKey(point: OverlayPoint): string {
  return `${point.x}:${point.y}`
}

function edgeKey(from: OverlayPoint, to: OverlayPoint): string {
  const left = pointKey(from)
  const right = pointKey(to)
  return left < right ? `${left}|${right}` : `${right}|${left}`
}

/** 相邻菱形的共享边互相抵消，只留下选区并集的外轮廓与孔洞轮廓。 */
export function mapSelectionBoundarySegments(
  points: readonly { row: number; col: number }[],
): MapSelectionBoundarySegment[] {
  const unique = new Map(points.map((point) => [gridPointKey(point), point]))
  const boundary = new Map<string, MapSelectionBoundarySegment>()
  for (const point of unique.values()) {
    const center = latticeCenter(point)
    const vertices: OverlayPoint[] = [
      { x: center.x, y: center.y - 8 },
      { x: center.x + 16, y: center.y },
      { x: center.x, y: center.y + 8 },
      { x: center.x - 16, y: center.y },
    ]
    for (let index = 0; index < vertices.length; index++) {
      const from = vertices[index]
      const to = vertices[(index + 1) % vertices.length]
      if (!from || !to) continue
      const key = edgeKey(from, to)
      if (boundary.has(key)) boundary.delete(key)
      else boundary.set(key, { from, to })
    }
  }
  return [...boundary.values()]
}

/** 大选区用单个 Path2D 填充，并仅描选区并集边界，避免逐格边框制造视觉噪音。 */
export function drawMapSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  selection: MapSelection,
  view: MapOverlayView,
  options: MapSelectionOverlayOptions = {},
): void {
  if (selection.kind !== 'cells') return
  const tone = options.tone ?? 'selected'
  const colors =
    tone === 'conflict'
      ? { fill: 'rgba(255,72,78,0.23)', outer: 'rgba(18,4,5,0.9)', inner: '#ff6870' }
      : tone === 'locked'
        ? { fill: 'rgba(255,196,95,0.16)', outer: 'rgba(24,15,3,0.92)', inner: '#ffc45f' }
        : tone === 'preview'
          ? { fill: 'rgba(87,224,166,0.18)', outer: 'rgba(3,18,12,0.9)', inner: '#62e6ad' }
          : { fill: 'rgba(59,155,255,0.22)', outer: 'rgba(2,10,22,0.92)', inner: '#77c8ff' }
  const { zoom, panX, panY } = view
  const uniquePoints = new Map<string, { row: number; col: number }>()
  for (const ref of selection.gridPoints) uniquePoints.set(gridPointKey(ref), ref)
  for (const ref of selection.visualSlots)
    uniquePoints.set(gridPointKey(ref), { row: ref.row, col: ref.col })

  const fillPath = new Path2D()
  for (const point of uniquePoints.values()) {
    const center = latticeCenter(point)
    const cx = (center.x - panX) * zoom
    const cy = (center.y - panY) * zoom
    const rx = 16 * zoom
    const ry = 8 * zoom
    if (cx + rx < 0 || cy + ry < 0 || cx - rx > ctx.canvas.width || cy - ry > ctx.canvas.height)
      continue
    fillPath.moveTo(cx, cy - ry)
    fillPath.lineTo(cx + rx, cy)
    fillPath.lineTo(cx, cy + ry)
    fillPath.lineTo(cx - rx, cy)
    fillPath.closePath()
  }
  const boundaryPath = new Path2D()
  for (const edge of mapSelectionBoundarySegments([...uniquePoints.values()])) {
    boundaryPath.moveTo((edge.from.x - panX) * zoom, (edge.from.y - panY) * zoom)
    boundaryPath.lineTo((edge.to.x - panX) * zoom, (edge.to.y - panY) * zoom)
  }
  ctx.save()
  ctx.fillStyle = colors.fill
  ctx.fill(fillPath)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = colors.outer
  ctx.lineWidth = 3
  ctx.stroke(boundaryPath)
  ctx.strokeStyle = colors.inner
  ctx.lineWidth = 1.25
  ctx.stroke(boundaryPath)
  ctx.restore()
}
