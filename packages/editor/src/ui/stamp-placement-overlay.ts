import type { Palette, RleFrame } from '@type-pal/reforge'
import { bakeFrame, latticeCenter, projectMapTileBlitRect } from '@type-pal/reforge'
import type { GridPointRef } from '../core/map-selection.js'
import { gridPointKey } from '../core/map-selection.js'
import type { StampPlacementPlan } from '../core/stamp-placement.js'
import type { MapOverlayView } from './map-selection-overlay.js'

export interface StampPlacementOverlayOptions {
  plan: StampPlacementPlan
  tiles: ReadonlyMap<number, RleFrame>
  palette: Palette
  view: MapOverlayView
  alpha?: number
}

const bakedByPalette = new WeakMap<Palette, WeakMap<RleFrame, HTMLCanvasElement>>()

function bakedFrame(frame: RleFrame, palette: Palette): HTMLCanvasElement {
  let byFrame = bakedByPalette.get(palette)
  if (!byFrame) {
    byFrame = new WeakMap()
    bakedByPalette.set(palette, byFrame)
  }
  let baked = byFrame.get(frame)
  if (!baked) {
    baked = bakeFrame(frame, palette)
    byFrame.set(frame, baked)
  }
  return baked
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  point: GridPointRef,
  view: MapOverlayView,
  colors: { fill: string; stroke: string },
  dashed = false,
): void {
  const center = latticeCenter(point)
  const cx = (center.x - view.panX) * view.zoom
  const cy = (center.y - view.panY) * view.zoom
  const rx = 16 * view.zoom
  const ry = 8 * view.zoom
  ctx.save()
  if (dashed) ctx.setLineDash([Math.max(2, 5 * view.zoom), Math.max(2, 3 * view.zoom)])
  ctx.beginPath()
  ctx.moveTo(cx, cy - ry)
  ctx.lineTo(cx + rx, cy)
  ctx.lineTo(cx, cy + ry)
  ctx.lineTo(cx - rx, cy)
  ctx.closePath()
  ctx.fillStyle = colors.fill
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = Math.max(1.25, 1.5 * view.zoom)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/**
 * 图章落笔前的最终值 ghost。只消费 planner 的 resolved 结果，不再次解释模板或 mapping。
 */
export function drawStampPlacementOverlay(
  ctx: CanvasRenderingContext2D,
  options: StampPlacementOverlayOptions,
): void {
  const { plan, tiles, palette, view } = options
  const visual = [...plan.resolvedVisual].sort(
    (left, right) =>
      left.targetLayerIndex - right.targetLayerIndex ||
      left.ref.row - right.ref.row ||
      left.ref.col - right.ref.col,
  )

  ctx.save()
  ctx.globalAlpha = options.alpha ?? 0.68
  ctx.imageSmoothingEnabled = false
  for (const member of visual) {
    const frame = tiles.get(member.tileId)
    if (!frame) continue
    const rect = projectMapTileBlitRect(member.ref, frame)
    ctx.drawImage(
      bakedFrame(frame, palette),
      Math.round((rect.x - view.panX) * view.zoom),
      Math.round((rect.y - view.panY) * view.zoom),
      Math.max(1, Math.round(rect.width * view.zoom)),
      Math.max(1, Math.round(rect.height * view.zoom)),
    )
  }
  ctx.restore()

  for (const member of plan.resolvedCollision)
    drawDiamond(
      ctx,
      member.ref,
      view,
      member.value === 0
        ? { fill: 'rgba(67, 151, 255, 0.16)', stroke: '#72b7ff' }
        : { fill: 'rgba(255, 137, 79, 0.24)', stroke: '#ff9b67' },
      true,
    )

  const conflictPoints = new Map<string, GridPointRef>()
  for (const conflict of plan.conflicts)
    conflictPoints.set(gridPointKey(conflict.ref), {
      row: conflict.ref.row,
      col: conflict.ref.col,
    })
  for (const point of conflictPoints.values())
    drawDiamond(ctx, point, view, { fill: 'rgba(255, 76, 83, 0.24)', stroke: '#ff6870' }, true)

  const issuePoints = new Map<string, GridPointRef>()
  for (const item of plan.issues) {
    const ref = item.ref
    if (!ref) continue
    issuePoints.set(gridPointKey(ref), { row: ref.row, col: ref.col })
  }
  for (const point of issuePoints.values())
    drawDiamond(ctx, point, view, { fill: 'rgba(255, 54, 74, 0.18)', stroke: '#ff5364' }, true)

  const anchor = latticeCenter(plan.anchor)
  const anchorX = (anchor.x - view.panX) * view.zoom
  const anchorY = (anchor.y - view.panY) * view.zoom
  ctx.save()
  ctx.beginPath()
  ctx.arc(anchorX, anchorY, Math.max(4, 5 * view.zoom), 0, Math.PI * 2)
  ctx.fillStyle = plan.issues.length ? '#ff5364' : plan.conflicts.length ? '#ffc45f' : '#59d8ff'
  ctx.strokeStyle = '#07131d'
  ctx.lineWidth = 2
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
