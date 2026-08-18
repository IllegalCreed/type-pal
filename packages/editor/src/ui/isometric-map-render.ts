import type { IsometricMapContent } from '@type-pal/content'
import { renderSceneFrame, type TilesetFrameRegistry } from '@type-pal/reforge'
import { drawGridBlocked, type StageAssets, type StageView } from './scene-stage.js'

export interface IsometricMapBaseCache {
  canvas: HTMLCanvasElement
  map: IsometricMapContent<number | null>
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
  showGrid: boolean
  showCollision: boolean
  hiddenKey: string
  focusLayerId: string | undefined
  focusHeight: number | undefined
  dimAlpha: number
  revision: number
  renderer: StageAssets['renderer']
  tilesets: TilesetFrameRegistry
}

export interface DrawIsometricMapBaseOptions {
  map: IsometricMapContent<number | null>
  assets: { renderer: StageAssets['renderer']; tilesets: TilesetFrameRegistry }
  view: StageView
  showGrid: boolean
  showCollision: boolean
  hiddenLayerIds?: ReadonlySet<string>
  focus?: {
    layerId: string
    height?: number
    dimAlpha?: number
  }
  /** Explicit invalidation for data held outside the ProjectMap reference. */
  revision?: number
}

/**
 * Map and stamp workbenches share this viewport clipping rule. Keeping it here prevents the
 * stamp editor from materializing and scanning a private rectangle of lattice cells.
 */
export function visibleMapRoom(
  map: IsometricMapContent<number | null>,
  tilesets: TilesetFrameRegistry,
  canvas: HTMLCanvasElement,
  view: StageView,
): { col: number; row: number; cols: number; rows: number } {
  let maxTileWidth = 32
  let maxTileHeight = 16
  for (const tiles of tilesets.values())
    for (const frame of tiles.values()) {
      maxTileWidth = Math.max(maxTileWidth, frame.width)
      maxTileHeight = Math.max(maxTileHeight, frame.height)
    }
  const worldWidth = canvas.width / view.zoom
  const worldHeight = canvas.height / view.zoom
  const firstCol = Math.max(0, Math.floor((view.panX - maxTileWidth - 16) / 32))
  const lastCol = Math.min(map.width, Math.ceil((view.panX + worldWidth + maxTileWidth + 16) / 32))
  const firstRow = Math.max(0, Math.floor((view.panY - maxTileHeight - 8) / 16))
  const lastRow = Math.min(
    map.height,
    Math.ceil((view.panY + worldHeight + maxTileHeight + 8) / 16),
  )
  return {
    col: firstCol,
    row: firstRow,
    cols: Math.max(0, lastCol - firstCol),
    rows: Math.max(0, lastRow - firstRow),
  }
}

/**
 * The canonical cached base pass for every editable isometric map surface. Pointer hover and
 * selection repaint only copy this bitmap; tiles, palette frames and the grid are not rebuilt.
 */
export function drawIsometricMapBase(
  ctx: CanvasRenderingContext2D,
  options: DrawIsometricMapBaseOptions,
  previous?: IsometricMapBaseCache,
): IsometricMapBaseCache {
  const { map, assets, view, showGrid, showCollision } = options
  const hiddenKey = JSON.stringify([...(options.hiddenLayerIds ?? [])].sort())
  const focusLayerId = options.focus?.layerId
  const focusHeight = options.focus?.height
  const dimAlpha = options.focus?.dimAlpha ?? 0.22
  const revision = options.revision ?? 0
  const changed =
    !previous ||
    previous.map !== map ||
    previous.width !== ctx.canvas.width ||
    previous.height !== ctx.canvas.height ||
    previous.zoom !== view.zoom ||
    previous.panX !== view.panX ||
    previous.panY !== view.panY ||
    previous.showGrid !== showGrid ||
    previous.showCollision !== showCollision ||
    previous.hiddenKey !== hiddenKey ||
    previous.focusLayerId !== focusLayerId ||
    previous.focusHeight !== focusHeight ||
    previous.dimAlpha !== dimAlpha ||
    previous.revision !== revision ||
    previous.renderer !== assets.renderer ||
    previous.tilesets !== assets.tilesets

  if (!changed) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.drawImage(previous.canvas, 0, 0)
    return previous
  }

  const room = visibleMapRoom(map, assets.tilesets, ctx.canvas, view)
  renderSceneFrame(ctx, assets.renderer, {
    map,
    room,
    camera: { x: view.panX, y: view.panY },
    sprites: [],
    worldScale: view.zoom,
    layers: {
      hiddenLayerIds: [...(options.hiddenLayerIds ?? [])],
      ...(focusLayerId === undefined ? { showAll: true } : { focusLayerId, focusHeight, dimAlpha }),
    },
  })
  drawGridBlocked(ctx, map, room, view, { grid: showGrid, blocked: showCollision })

  const cacheCanvas = previous?.canvas ?? document.createElement('canvas')
  cacheCanvas.width = ctx.canvas.width
  cacheCanvas.height = ctx.canvas.height
  cacheCanvas.getContext('2d')?.drawImage(ctx.canvas, 0, 0)
  return {
    canvas: cacheCanvas,
    map,
    width: ctx.canvas.width,
    height: ctx.canvas.height,
    zoom: view.zoom,
    panX: view.panX,
    panY: view.panY,
    showGrid,
    showCollision,
    hiddenKey,
    focusLayerId,
    focusHeight,
    dimAlpha,
    revision,
    renderer: assets.renderer,
    tilesets: assets.tilesets,
  }
}
