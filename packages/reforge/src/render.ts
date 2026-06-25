/**
 * Canvas 2D 渲染（D10：渲染走 Renderer 接口、实现可换；本刀实现 = Canvas 2D + RGBA）。
 * 等距瓦片画法端口自 game/present/draw-tilemap.ts（32×16 菱形、lower/upper 两子行、
 * 每 DWORD 含 layer0/layer1）。原版 indexed 瓦片 → 经调色板烘成 RGBA → drawImage。
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

/** 一帧 indexed 瓦片 + 调色板 → 可 drawImage 的离屏 canvas（一次性烘焙、缓存）。 */
function bakeTile(frame: RleFrame, palette: Palette): HTMLCanvasElement {
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
    img.data[o + 3] = opaque[i] ? 255 : 0 // 透明 = 跳过（用 opaque mask，非 index===0）
  }
  ctx.putImageData(img, 0, 0)
  return cvs
}

export interface Camera {
  x: number
  y: number
}

/** 渲染接口：实现可换（Canvas 2D 起步，日后可换 WebGL，D10）。 */
export interface Renderer {
  clear(): void
  renderTilemap(map: Tilemap, camera: Camera): void
}

export class Canvas2DRenderer implements Renderer {
  private readonly baked = new Map<number, HTMLCanvasElement>()

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly palette: Palette,
    private readonly tiles: Map<number, RleFrame>,
  ) {}

  private bakedTile(id: number): HTMLCanvasElement | undefined {
    let b = this.baked.get(id)
    if (b) return b
    const f = this.tiles.get(id)
    if (!f) return undefined
    b = bakeTile(f, this.palette)
    this.baked.set(id, b)
    return b
  }

  clear(): void {
    const { canvas } = this.ctx
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  renderTilemap(map: Tilemap, camera: Camera): void {
    // layer 0（地砖/墙基，画在精灵之下）→ [精灵] → layer 1（门/柜面，遮挡精灵）
    this.drawLayer(map, 0, camera)
    this.drawLayer(map, 1, camera)
  }

  private drawLayer(map: Tilemap, layer: 0 | 1, camera: Camera): void {
    const idFn = layer === 0 ? tileIdLayer0 : tileIdLayer1
    const ox = -camera.x
    const oy = -camera.y
    for (let r = 0; r < map.height; r++) {
      const row = map.cells[r]!
      for (let c = 0; c < map.width; c++) {
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
}
