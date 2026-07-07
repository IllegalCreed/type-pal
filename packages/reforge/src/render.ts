/**
 * Canvas 2D 渲染（D10）。**遮挡按 Y 深度**（你说的现代化模型）——正确实现 = 原版
 * 「高度感知的 baseY」cover-tile（port sdlpal present.ts + scene.c PAL_CalcCoverTiles）：
 *   1) 全图基底两层全画（地板 + 墙/家具，layer0 后 layer1）。
 *   2) 精灵 + 「会盖住该精灵的高瓦片」(cover tile) 入同一表，按 baseY 升序画。
 *      tile baseY = 行*16 + 子行*8 + 高度*8（= 把这块瓦片按高度投影回地板的 Y）；精灵 baseY = 脚 Y。
 *   于是投影靠前者后画、盖住投影靠后者 → 正确遮挡（堆叠高墙的每块小瓦片也对）。
 * 图层只是作画组织，与遮挡无关；遮挡纯看 baseY。等距位偏移端口自 game/draw-tilemap.ts。
 */
import type { Palette, RleFrame, Tilemap } from '@type-pal/shared'

const TILE_W = 32
const TILE_H = 16
const HALF_W = TILE_W / 2 // 16
const SUBROW = TILE_H / 2 // 8

function tileIdLayer0(d: number): number {
  return (d & 0xff) | ((d >> 4) & 0x100)
}
function tileIdLayer1(d: number): number {
  const hi = d >>> 16
  return ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1 // -1 = 无瓦片
}

export function bakeFrame(frame: RleFrame, palette: Palette): HTMLCanvasElement {
  const { width, height, pixels, opaque } = frame
  const cvs = document.createElement('canvas')
  cvs.width = width
  cvs.height = height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('reforge: 2d context 不可用')
  const img = ctx.createImageData(width, height)
  const colors = palette.colors
  const n = width * height
  for (let i = 0; i < n; i++) {
    const c = colors[pixels[i] ?? 0] ?? [0, 0, 0]
    const o = i * 4
    img.data[o] = c[0] ?? 0
    img.data[o + 1] = c[1] ?? 0
    img.data[o + 2] = c[2] ?? 0
    img.data[o + 3] = opaque[i] ? 255 : 0
  }
  ctx.putImageData(img, 0, 0)
  return cvs
}

export interface Camera {
  x: number
  y: number
}

export interface CellRect {
  col: number
  row: number
  cols: number
  rows: number
}

/** 一个待画精灵：脚下锚点 + 世界坐标（worldX = 中心，worldY = 脚的深度）。 */
export interface SpriteDraw {
  frame: RleFrame
  worldX: number
  worldY: number
  anchorX: number
  anchorY: number
  /** 画序偏置(原版 sLayer 人工覆盖;加进 baseY 排序键,不动 blit 位置)。 */
  baseYBias?: number
  /** 不透明度(编辑器幽灵渲染等;缺省 1)。 */
  alpha?: number
}

/**
 * 精灵世界域 blit 矩形 —— **+7 资产级下沉的唯一收口**。
 * 语义:脚底中点(anchorX=w/2, anchorY=h)对准格中心,整帧再下沉 7px(原版素材坐标约定,
 * 贴地素材逐像素咬合地图;新素材包届时把 7 参数化归零)。
 * 所有画/命中消费点(引擎 blit、编辑器选中框/命中盒)必须走这里 —— 别在调用侧手写
 * `worldY − anchorY + 7`(编辑器曾漏 +7 致选中框偏高,2026-07-07 作者报)。
 */
export function spriteBlitRect(s: {
  worldX: number
  worldY: number
  anchorX: number
  anchorY: number
  frame: { width: number; height: number }
}): { x: number; y: number; w: number; h: number } {
  return {
    x: s.worldX - s.anchorX,
    y: s.worldY - s.anchorY + 7,
    w: s.frame.width,
    h: s.frame.height,
  }
}

interface DrawEntry {
  baseY: number
  draw: () => void
}

/** 渲染层开关(编辑器图层显隐;引擎不传 = 全画)。 */
export interface RenderLayerOpts {
  /** 跳过基底 tile(地板)。 */
  skipBase?: boolean
  /** 跳过 cover-tiles(高物:墙/家具遮挡片;精灵仍画)。 */
  skipCover?: boolean
}

export interface Renderer {
  clear(): void
  /** 一帧场景：基底两层 + 精灵/cover-tile 按 baseY 深度排序（遮挡）。 */
  renderScene(
    map: Tilemap,
    view: CellRect,
    camera: Camera,
    sprites: readonly SpriteDraw[],
    opts?: RenderLayerOpts,
  ): void
  drawSprite(
    frame: RleFrame,
    worldX: number,
    worldY: number,
    anchorX: number,
    anchorY: number,
    camera: Camera,
  ): void
}

export class Canvas2DRenderer implements Renderer {
  private readonly tileCache = new Map<number, HTMLCanvasElement>()
  private readonly frameCache = new WeakMap<RleFrame, HTMLCanvasElement>()

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly palette: Palette,
    private readonly tiles: Map<number, RleFrame>,
  ) {}

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

  private blit(id: number, x: number, y: number): void {
    const img = this.bakedTile(id)
    if (img) this.ctx.drawImage(img, x, y)
  }

  clear(): void {
    const { canvas } = this.ctx
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  renderScene(
    map: Tilemap,
    view: CellRect,
    camera: Camera,
    sprites: readonly SpriteDraw[],
    opts?: RenderLayerOpts,
  ): void {
    const ox = -camera.x
    const oy = -camera.y
    const r0 = Math.max(0, view.row)
    const r1 = Math.min(map.height, view.row + view.rows)
    const c0 = Math.max(0, view.col)
    const c1 = Math.min(map.width, view.col + view.cols)

    // 1) 基底：layer0 全画，再 layer1 全画（present.ts:282-285）;编辑器图层开关可跳过
    if (!opts?.skipBase)
    for (let layer = 0; layer <= 1; layer++) {
      const id = layer === 0 ? tileIdLayer0 : tileIdLayer1
      for (let r = r0; r < r1; r++) {
        const row = map.cells[r]
        if (!row) continue
        for (let c = c0; c < c1; c++) {
          const cell = row[c]
          if (!cell) continue
          const loId = id(cell.lower)
          if (loId >= 0) this.blit(loId, c * TILE_W - HALF_W + ox, r * TILE_H - SUBROW + oy)
          const upId = id(cell.upper)
          if (upId >= 0) this.blit(upId, c * TILE_W + ox, r * TILE_H + oy)
        }
      }
    }

    // 2) 精灵 + cover-tile 入深度表
    // 资产坐标系约定(sdlpal scene.c:301-316,一阶段 present.ts:540-546 已考证):
    //   blit y = eo.y − height **+ 7**(sLayer×8 在原式中相消,不进 blit);
    //   排序 key = eo.y + sLayer×8 + 9。
    // 精灵资产(尤其密道盖板这类须与地图纹理逐像素咬合的贴片)是按这套坐标画的,+7 是
    // 资产级约定不是引擎怪癖 —— 漏掉则全体精灵高 7px:人物间看不出,贴片对地板错半格
    // (2026-07-03 用户报,一阶段同坑已修过)。zBias 存 sLayer 源值,排序按 ×8 换算。
    const entries: DrawEntry[] = []
    for (const s of sprites) {
      const img = this.bake(s.frame)
      const r = spriteBlitRect(s)
      const bx = Math.round(r.x + ox)
      const by = Math.round(r.y + oy)
      const alpha = s.alpha
      entries.push({
        baseY: s.worldY + 9 + (s.baseYBias ?? 0) * 8,
        draw:
          alpha !== undefined && alpha < 1
            ? () => {
                this.ctx.save()
                this.ctx.globalAlpha = alpha
                this.ctx.drawImage(img, bx, by)
                this.ctx.restore()
              }
            : () => this.ctx.drawImage(img, bx, by),
      })
      if (!opts?.skipCover)
        this.addCoverTiles(entries, map, s.worldX, s.worldY, s.frame.width, s.frame.height, ox, oy)
    }

    // 3) 按 baseY 升序画（同 baseY 稳定）
    entries.sort((a, b) => a.baseY - b.baseY)
    for (const e of entries) e.draw()
  }

  /** port sdlpal scene.c PAL_CalcCoverTiles：找出会盖住该精灵的高瓦片，作为 cover-tile 入表。 */
  private addCoverTiles(
    entries: DrawEntry[],
    map: Tilemap,
    spriteWorldX: number,
    spriteWorldY: number,
    spriteW: number,
    spriteH: number,
    ox: number,
    oy: number,
  ): void {
    const sx = spriteWorldX - Math.floor(spriteW / 2)
    const sy = spriteWorldY
    const sh: 0 | 1 = sx % TILE_W !== 0 ? 1 : 0
    const yStart = Math.trunc((sy - spriteH - 15) / TILE_H)
    const yEnd = Math.trunc(sy / TILE_H)
    const xStart = Math.trunc((sx - Math.floor(spriteW / 2)) / TILE_W)
    const xEnd = Math.trunc((sx + Math.floor(spriteW / 2)) / TILE_W)

    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        const iStart = x === xStart ? 0 : 3
        for (let i = iStart; i < 5; i++) {
          let dx = 0
          let dy = 0
          let dh: 0 | 1 = 0
          switch (i) {
            case 0:
              dx = x
              dy = y
              dh = sh
              break
            case 1:
              dx = x - 1
              dy = y
              dh = sh
              break
            case 2:
              dx = sh ? x : x - 1
              dy = sh ? y + 1 : y
              dh = sh ? 0 : 1
              break
            case 3:
              dx = x + 1
              dy = y
              dh = sh
              break
            default:
              dx = sh ? x + 1 : x
              dy = sh ? y + 1 : y
              dh = sh ? 0 : 1
              break
          }
          if (dy < 0 || dy >= map.height || dx < 0 || dx >= map.width) continue
          const cell = map.cells[dy]?.[dx]
          if (!cell) continue
          const d = dh === 0 ? cell.lower : cell.upper
          for (let l = 0; l < 2; l++) {
            const tileId = l === 0 ? tileIdLayer0(d) : tileIdLayer1(d)
            const iTileHeight = l === 0 ? (d >> 8) & 0xf : (d >>> 24) & 0xf
            if (tileId < 0) continue
            if (iTileHeight <= 0) continue
            if ((dy + iTileHeight) * TILE_H + dh * SUBROW < sy) continue
            const img = this.bakedTile(tileId)
            if (!img) continue
            const baseY = dy * TILE_H + dh * SUBROW + 7 + l + iTileHeight * SUBROW
            const screenX = dx * TILE_W + dh * HALF_W - HALF_W + ox
            const screenY = dy * TILE_H + dh * SUBROW + 7 - img.height + oy
            entries.push({ baseY, draw: () => this.ctx.drawImage(img, screenX, screenY) })
          }
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
    this.ctx.drawImage(
      b,
      Math.round(worldX - anchorX - camera.x),
      Math.round(worldY - anchorY - camera.y),
    )
  }
}
