/**
 * Canvas 2D 渲染（D10）。**遮挡按 Y 深度**（你说的现代化模型）——正确实现 = 原版
 * 「高度感知的 baseY」cover-tile（port sdlpal present.ts + scene.c PAL_CalcCoverTiles）：
 *   1) 全图基底两层全画（地板 + 墙/家具，layer0 后 layer1）。
 *   2) 精灵 + 「会盖住该精灵的高瓦片」(cover tile) 入同一表，按 baseY 升序画。
 *      tile baseY = 行*16 + 子行*8 + 高度*8（= 把这块瓦片按高度投影回地板的 Y）；精灵 baseY = 脚 Y。
 *   于是投影靠前者后画、盖住投影靠后者 → 正确遮挡（堆叠高墙的每块小瓦片也对）。
 * 图层只是作画组织，与遮挡无关；遮挡纯看 baseY。等距位偏移端口自 game/draw-tilemap.ts。
 */
import type { ProjectMapV2 } from '@type-pal/content'
import type { Palette, RleFrame } from '@type-pal/shared'
import {
  type ProjectMapTileDraw,
  projectMapTileBlitRect,
  projectMapTilesInView,
} from './project-map.js'

const TILE_W = 32
const TILE_H = 16
const HALF_W = TILE_W / 2 // 16
const SUBROW = TILE_H / 2 // 8

/**
 * 索引帧 → RGBA canvas。colorShift ≠ 0 时做原版受击/演出染色
 * (一阶段 blitFrame / palcommon.c:398-411):每个像素低 4 位 + shift
 * clamp[0,0x0F]、高 4 位(色系 band)不动,再查盘 —— 各部位提到各自色系的
 * 亮档,层次保留(≠ 平涂白;作者原版行军丹截图为准)。
 */
export function bakeFrame(frame: RleFrame, palette: Palette, colorShift = 0): HTMLCanvasElement {
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
    let idx = pixels[i] ?? 0
    if (colorShift !== 0) {
      let low = (idx & 0x0f) + colorShift
      if (low > 0x0f) low = 0x0f
      else if (low < 0) low = 0
      idx = (low | (idx & 0xf0)) & 0xff
    }
    const c = colors[idx] ?? [0, 0, 0]
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
  /** 精灵类别的固定排序偏移：NPC=9，队伍=10（sdlpal scene.c:302/225）。 */
  sortOffset?: number
  /** PAL_CalcCoverTiles 的 iLayer；缺省表示普通 NPC 的兼容几何。 */
  coverILayer?: number
  /** PAL_CalcCoverTiles 的 sortY 偏移(队伍=10，NPC=9)。 */
  coverSortOffset?: number
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
  /** 编辑器本地显隐；不写入内容 schema。 */
  hiddenLayerIds?: readonly string[]
  /** 聚焦图层/实例高度；不匹配瓦片变暗但仍可见。 */
  focusLayerId?: string
  focusHeight?: number
  showAll?: boolean
  dimAlpha?: number
}

export interface Renderer {
  /** Renderer 实际落笔的 context；renderSceneFrame 用它阻止离屏/主画布错配。 */
  readonly context: CanvasRenderingContext2D
  clear(): void
  renderScene(
    map: ProjectMapV2,
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

  get context(): CanvasRenderingContext2D {
    return this.ctx
  }

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

  /**
   * PAL_CalcCoverTiles 的 sprite-specific 候选扫描。
   * ProjectMapV2 的 lattice 行 `2 * dy + dh` 正好对应旧地图 cell 的
   * `(dy, dh)`；保留原版的五邻 tile 候选和高度门，避免把视口内所有高瓦片
   * 都重画成“全屏遮罩”。
   */
  private coverTileCandidates(
    tilesByLattice: ReadonlyMap<string, readonly ProjectMapTileDraw[]>,
    sprite: SpriteDraw,
  ): { tile: ProjectMapTileDraw; image: HTMLCanvasElement; baseY: number }[] {
    const spriteW = sprite.frame.width
    const spriteH = sprite.frame.height
    const iLayer = sprite.coverILayer ?? 0
    const sx = sprite.worldX - Math.floor(spriteW / 2) - Math.floor(iLayer / 2)
    const sy = sprite.worldY + (sprite.coverSortOffset ?? 9) - iLayer
    const sh = ((sx % TILE_W) + TILE_W) % TILE_W !== 0 ? 1 : 0
    const yStart = Math.trunc((sy - spriteH - 15) / TILE_H)
    const yEnd = Math.trunc(sy / TILE_H)
    const xStart = Math.trunc((sx - Math.floor(spriteW / 2)) / TILE_W)
    const xEnd = Math.trunc((sx + Math.floor(spriteW / 2)) / TILE_W)
    const out: { tile: ProjectMapTileDraw; image: HTMLCanvasElement; baseY: number }[] = []
    const seen = new Set<string>()

    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        const iStart = x === xStart ? 0 : 3
        for (let i = iStart; i < 5; i++) {
          let dx = 0
          let dy = 0
          let dh = 0
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
              dh = 1 - sh
              break
            case 3:
              dx = x + 1
              dy = y
              dh = sh
              break
            default:
              dx = sh ? x + 1 : x
              dy = sh ? y + 1 : y
              dh = 1 - sh
              break
          }
          if (dy < 0 || dx < 0) continue
          const latticeRow = dy * 2 + dh
          const tileAt = tilesByLattice.get(`${dx}:${latticeRow}`) ?? []
          for (const tile of tileAt) {
            if (tile.depthMode !== 'height' || tile.height <= 0) continue
            // scene.c:156：瓦片投影深度必须到达精灵脚下。
            if ((dy + tile.height) * TILE_H + dh * SUBROW < sy) continue
            const key = `${tile.layerIndex}:${tile.row}:${tile.col}`
            if (seen.has(key)) continue
            const image = this.bakedTile(tile.tileId)
            if (!image) continue
            seen.add(key)
            out.push({
              tile,
              image,
              baseY: tile.centerY + 7 + tile.layerIndex + tile.height * SUBROW,
            })
          }
        }
      }
    }
    return out
  }

  clear(): void {
    const { canvas } = this.ctx
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  renderScene(
    map: ProjectMapV2,
    view: CellRect,
    camera: Camera,
    sprites: readonly SpriteDraw[],
    opts?: RenderLayerOpts,
  ): void {
    const ox = -camera.x
    const oy = -camera.y
    const tiles = projectMapTilesInView(map, view, new Set(opts?.hiddenLayerIds ?? []))
    const tilesByLattice = new Map<string, ProjectMapTileDraw[]>()
    for (const tile of tiles) {
      const key = `${tile.col}:${tile.row}`
      const bucket = tilesByLattice.get(key)
      if (bucket) bucket.push(tile)
      else tilesByLattice.set(key, [tile])
    }
    const tileAlpha = (tile: (typeof tiles)[number]): number => {
      if (opts?.showAll) return 1
      const layerMatches = opts?.focusLayerId === undefined || tile.layerId === opts.focusLayerId
      const heightMatches = opts?.focusHeight === undefined || tile.height === opts.focusHeight
      return layerMatches && heightMatches ? 1 : (opts?.dimAlpha ?? 0.25)
    }
    const drawTile = (image: HTMLCanvasElement, x: number, y: number, alpha: number): void => {
      if (alpha >= 1) {
        this.ctx.drawImage(image, x, y)
        return
      }
      this.ctx.save()
      this.ctx.globalAlpha = alpha
      this.ctx.drawImage(image, x, y)
      this.ctx.restore()
    }

    if (!opts?.skipBase) {
      for (const tile of tiles) {
        const image = this.bakedTile(tile.tileId)
        if (image) {
          const rect = projectMapTileBlitRect(tile, image)
          drawTile(image, rect.x + ox, rect.y + oy, tileAlpha(tile))
        }
      }
    }

    const entries: DrawEntry[] = []
    for (const sprite of sprites) {
      const image = this.bake(sprite.frame)
      const rect = spriteBlitRect(sprite)
      const x = Math.round(rect.x + ox)
      const y = Math.round(rect.y + oy)
      const alpha = sprite.alpha
      entries.push({
        baseY: sprite.worldY + (sprite.sortOffset ?? 9) + (sprite.baseYBias ?? 0) * 8,
        draw:
          alpha !== undefined && alpha < 1
            ? () => {
                this.ctx.save()
                this.ctx.globalAlpha = alpha
                this.ctx.drawImage(image, x, y)
                this.ctx.restore()
              }
            : () => this.ctx.drawImage(image, x, y),
      })
    }

    if (!opts?.skipCover) {
      for (const sprite of sprites) {
        for (const candidate of this.coverTileCandidates(tilesByLattice, sprite)) {
          const { tile, image, baseY } = candidate
          const x = tile.centerX - HALF_W + ox
          const y = tile.centerY + 7 - image.height + oy
          const alpha = tileAlpha(tile)
          entries.push({
            baseY,
            draw: () => drawTile(image, x, y, alpha),
          })
        }
      }
    }

    entries.sort((a, b) => a.baseY - b.baseY)
    for (const entry of entries) entry.draw()
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
