/**
 * Canvas 2D 渲染（D10：渲染走 Renderer 接口、实现可换；本刀实现 = Canvas 2D + RGBA）。
 * 等距瓦片画法端口自 game/present/draw-tilemap.ts（32×16 菱形、lower/upper 两子行、
 * 每 DWORD 含 layer0/layer1）。原版 indexed 瓦片/精灵 → 经调色板烘成 RGBA → drawImage。
 * 遮挡：layer 0（地/墙基）→ 精灵 → layer 1（家具上沿/门）盖在精灵上。
 */
import type { Palette, RleFrame, Tilemap } from '@type-pal/shared'

const TILE_W = 32
const TILE_H = 16
const HALF_W = TILE_W / 2 // 16
const SUBROW = TILE_H / 2 // 8

// 每 u32 DWORD 编码两个 9-bit tile id（draw-tilemap.ts:46-53）
function tileIdLayer0(d: number): number {
  return (d & 0xff) | ((d >> 4) & 0x100)
}
function tileIdLayer1(d: number): number {
  const hi = d >>> 16
  return ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1 // -1 = 无瓦片
}

/** 一帧 indexed 像素 + 调色板 → 可 drawImage 的离屏 canvas。 */
function bakeFrame(frame: RleFrame, palette: Palette): HTMLCanvasElement {
  const { width, height, pixels, opaque } = frame
  const cvs = document.createElement('canvas')
  cvs.width = width
  cvs.height = height
  const ctx = cvs.getContext('2d')!
  const img = ctx.createImageData(width, height)
  const colors = palette.colors
  const n = width * height
  for (let i = 0; i < n; i++) {
    const c = colors[pixels[i]!] ?? [0, 0, 0]
    const o = i * 4
    img.data[o] = c[0]!
    img.data[o + 1] = c[1]!
    img.data[o + 2] = c[2]!
    img.data[o + 3] = opaque[i] ? 255 : 0 // 透明用 opaque mask，非 index===0
  }
  ctx.putImageData(img, 0, 0)
  return cvs
}

export interface Camera {
  x: number
  y: number
}

/** 只渲染地图的一个格子矩形窗口（= 切片取的那一间民居）。 */
export interface CellRect {
  col: number
  row: number
  cols: number
  rows: number
}

/** 渲染接口：实现可换（Canvas 2D 起步，日后可换 WebGL，D10）。 */
export interface Renderer {
  clear(): void
  /** 单层瓦片渲染。layer 0 在精灵下，layer 1 在精灵上（遮挡）。view 省略 = 整张图。 */
  renderTilemapLayer(map: Tilemap, layer: 0 | 1, camera: Camera, view?: CellRect): void
  /** 在世界坐标画一帧精灵，anchor = 脚下锚点（worldX/Y 为脚下点）。 */
  drawSprite(frame: RleFrame, worldX: number, worldY: number, anchorX: number, anchorY: number, camera: Camera): void
}

export class Canvas2DRenderer implements Renderer {
  private readonly tileCache = new Map<number, HTMLCanvasElement>()
  private readonly frameCache = new WeakMap<RleFrame, HTMLCanvasElement>()

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly palette: Palette,
    private readonly tiles: Map<number, RleFrame>,
  ) {}

  /** 任意 indexed 帧 → 烘焙 canvas（按帧对象缓存）。 */
  private bake(frame: RleFrame): HTMLCanvasElement {
    let b = this.frameCache.get(frame)
    if (!b) {
      b = bakeFrame(frame, this.palette)
      this.frameCache.set(frame, b)
    }
    return b
  }

  private bakedTile(id: number): HTMLCanvasElement | undefined {
    let b = this.tileCache.get(id)
    if (b) return b
    const f = this.tiles.get(id)
    if (!f) return undefined
    b = this.bake(f)
    this.tileCache.set(id, b)
    return b
  }

  clear(): void {
    const { canvas } = this.ctx
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  renderTilemapLayer(map: Tilemap, layer: 0 | 1, camera: Camera, view?: CellRect): void {
    const idFn = layer === 0 ? tileIdLayer0 : tileIdLayer1
    const ox = -camera.x
    const oy = -camera.y
    const r0 = view ? Math.max(0, view.row) : 0
    const r1 = view ? Math.min(map.height, view.row + view.rows) : map.height
    const c0 = view ? Math.max(0, view.col) : 0
    const c1 = view ? Math.min(map.width, view.col + view.cols) : map.width
    for (let r = r0; r < r1; r++) {
      const row = map.cells[r]!
      for (let c = c0; c < c1; c++) {
        const cell = row[c]!
        // lower 子行（h=0）：画在 (c*32 - 16, r*16 - 8)
        const lowerId = idFn(cell.lower)
        if (lowerId >= 0) {
          const t = this.bakedTile(lowerId)
          if (t) this.ctx.drawImage(t, c * TILE_W - HALF_W + ox, r * TILE_H - SUBROW + oy)
        }
        // upper 子行（h=1）：画在 (c*32, r*16)
        const upperId = idFn(cell.upper)
        if (upperId >= 0) {
          const t = this.bakedTile(upperId)
          if (t) this.ctx.drawImage(t, c * TILE_W + ox, r * TILE_H + oy)
        }
      }
    }
  }

  drawSprite(
    frame: RleFrame,
    worldX: number,
    worldY: number,
    anchorX: number,
    anchorY: number,
    camera: Camera,
  ): void {
    const b = this.bake(frame)
    this.ctx.drawImage(b, Math.round(worldX - anchorX - camera.x), Math.round(worldY - anchorY - camera.y))
  }
}
