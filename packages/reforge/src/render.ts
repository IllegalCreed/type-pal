/**
 * Canvas 2D 渲染（D10）。**遮挡按 Y 深度**（你说的现代化模型）——正确实现 = 原版
 * 「高度感知的 baseY」cover-tile（port sdlpal present.ts + scene.c PAL_CalcCoverTiles）：
 *   1) 全图基底两层全画（地板 + 墙/家具，layer0 后 layer1）。
 *   2) 精灵 + 「会盖住该精灵的高瓦片」(cover tile) 入同一表，按 baseY 升序画。
 *      tile baseY = 行*16 + 子行*8 + 高度*8（= 把这块瓦片按高度投影回地板的 Y）；精灵 baseY = 脚 Y。
 *   于是投影靠前者后画、盖住投影靠后者 → 正确遮挡（堆叠高墙的每块小瓦片也对）。
 * 图层只是作画组织，与遮挡无关；遮挡纯看 baseY。等距位偏移端口自 game/draw-tilemap.ts。
 */
import type { IsometricMapContent } from '@type-pal/content'
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

/** 局部透视中保留的前景权重；角色像素权重为 1 - OCCLUSION_ALPHA。 */
export const OCCLUSION_ALPHA = 0.8
/** 贴墙边界迟滞：候选短暂消失时只保持当前队伍覆盖区域，防闪烁。 */
export const OCCLUSION_LATCH_MS = 120

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
  /** 是否允许局部前景透视：大世界仅主角队伍 true；普通遮挡/深度排序与此标记无关。 */
  occlusionTrigger?: boolean
}

/**
 * 精灵世界域 blit 矩形。脚底中点(anchorX=w/2, anchorY=h)对准格中心，
 * 当前二阶段素材采用统一7px绘制偏移，不要求与Game队伍的4px逐像素一致。
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

interface SpriteEntry extends DrawEntry {
  sprite: SpriteDraw
  image: HTMLCanvasElement
  x: number
  y: number
  coverKeys: ReadonlySet<string>
}

/** 保留短暂消失的前景关系，不保存角色帧或坐标；透视始终来自本帧队伍像素。 */
class OcclusionLatch {
  private readonly entries = new Map<string, { until: number; candidate: CoverCandidate }>()

  constructor(private readonly now: () => number = () => performance.now()) {}

  /** 记住进入遮挡集合的完整绘制载荷，候选暂时消失时仍可完成迟滞帧。 */
  remember(candidate: CoverCandidate): void {
    const t = this.now()
    this.entries.set(candidate.key, { until: t + OCCLUSION_LATCH_MS, candidate })
  }

  /** 返回尚在迟滞窗口内的载荷，并顺手清理到期项。 */
  retained(): readonly CoverCandidate[] {
    const t = this.now()
    const retained: CoverCandidate[] = []
    for (const [key, entry] of this.entries) {
      if (entry.until <= t) this.entries.delete(key)
      else retained.push(entry.candidate)
    }
    return retained
  }

  reset(): void {
    this.entries.clear()
  }
}

/** cover 瓦片候选(已算遮挡关系的待画项)。 */
interface CoverCandidate {
  tile: ProjectMapTileDraw
  image: HTMLCanvasElement
  baseY: number
  /** 跨 sprite 去重键(同瓦片同 baseY)。 */
  key: string
}

function coverKey(tile: ProjectMapTileDraw): string {
  return `${tile.layerId}:${tile.row}:${tile.col}:${coverBaseY(tile)}`
}

function coverBaseY(tile: ProjectMapTileDraw): number {
  return tile.centerY + 7 + tile.layerIndex + tile.height * SUBROW
}

function intersectsCover(
  entry: SpriteEntry,
  cover: CoverCandidate,
  ox: number,
  oy: number,
): boolean {
  const x = cover.tile.centerX - HALF_W + ox
  const y = cover.tile.centerY + 7 - cover.image.height + oy
  return (
    entry.x < x + cover.image.width &&
    entry.x + entry.image.width > x &&
    entry.y < y + cover.image.height &&
    entry.y + entry.image.height > y
  )
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
    map: IsometricMapContent<number | null>,
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

/** tileId 仅在来源内唯一；渲染器始终通过稳定 tileset id 解析。 */
export type TilesetFrameRegistry = ReadonlyMap<string, ReadonlyMap<number, RleFrame>>

export class Canvas2DRenderer implements Renderer {
  private readonly tileCache = new Map<string, HTMLCanvasElement>()
  private readonly frameCache = new WeakMap<RleFrame, HTMLCanvasElement>()
  private readonly occlusionLatch: OcclusionLatch
  private revealCanvas: HTMLCanvasElement | null = null
  private retainedWallCanvas: HTMLCanvasElement | null = null

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly palette: Palette,
    private readonly tilesets: TilesetFrameRegistry,
    now: () => number = () => performance.now(),
  ) {
    this.occlusionLatch = new OcclusionLatch(now)
  }

  get context(): CanvasRenderingContext2D {
    return this.ctx
  }

  /** D6-1(K3):清空遮挡迟滞 latch(渲染器按场景重建时天然清空,编辑器可显式调用)。 */
  resetOcclusionLatch(): void {
    this.occlusionLatch.reset()
  }

  private bake(frame: RleFrame): HTMLCanvasElement {
    let b = this.frameCache.get(frame)
    if (!b) {
      b = bakeFrame(frame, this.palette)
      this.frameCache.set(frame, b)
    }
    return b
  }

  private bakedTile(tilesetId: string, id: number): HTMLCanvasElement | undefined {
    const key = `${tilesetId}\u0000${id}`
    let b = this.tileCache.get(key)
    if (b) return b
    const f = this.tilesets.get(tilesetId)?.get(id)
    if (!f) return undefined
    b = this.bake(f)
    this.tileCache.set(key, b)
    return b
  }

  /**
   * A normal opaque foreground is already painted. Restore only visible party pixels inside its
   * opaque footprint. Sprite order is unchanged: front NPCs erase the party mask, rear NPCs do not.
   * Device-resolution scratch uses the exact host transform, including camera rounding and scale.
   */
  private revealParty(
    cover: CoverCandidate,
    sprites: readonly SpriteEntry[],
    eligible: ReadonlySet<SpriteEntry>,
    x: number,
    y: number,
    retainedOnly: boolean,
  ): void {
    const transform = this.ctx.getTransform()
    const corners = [
      { x, y },
      { x: x + cover.image.width, y },
      { x, y: y + cover.image.height },
      { x: x + cover.image.width, y: y + cover.image.height },
    ]
    const xs = corners.map((point) => transform.a * point.x + transform.c * point.y + transform.e)
    const ys = corners.map((point) => transform.b * point.x + transform.d * point.y + transform.f)
    const left = Math.floor(Math.min(...xs))
    const top = Math.floor(Math.min(...ys))
    const width = Math.ceil(Math.max(...xs)) - left
    const height = Math.ceil(Math.max(...ys)) - top
    if (width <= 0 || height <= 0) return
    this.revealCanvas ??= document.createElement('canvas')
    const canvas = this.revealCanvas
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('reforge: 2d context 不可用')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.setTransform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.e - left,
      transform.f - top,
    )
    ctx.imageSmoothingEnabled = this.ctx.imageSmoothingEnabled
    for (const entry of sprites) {
      if (entry.baseY > cover.baseY) break
      if (
        entry.x >= x + cover.image.width ||
        entry.x + entry.image.width <= x ||
        entry.y >= y + cover.image.height ||
        entry.y + entry.image.height <= y
      )
        continue
      ctx.globalCompositeOperation = eligible.has(entry) ? 'source-over' : 'destination-out'
      ctx.globalAlpha = entry.sprite.alpha ?? 1
      ctx.drawImage(entry.image, entry.x, entry.y)
    }
    ctx.globalCompositeOperation = 'destination-in'
    ctx.globalAlpha = 1
    ctx.drawImage(cover.image, x, y)
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (retainedOnly) {
      // A vanished candidate is not a normal cover. Repainting its whole tile would change NPC
      // visibility. Retain foreground colour only inside the current visible party mask instead.
      this.retainedWallCanvas ??= document.createElement('canvas')
      const wall = this.retainedWallCanvas
      if (wall.width !== width) wall.width = width
      if (wall.height !== height) wall.height = height
      const wallContext = wall.getContext('2d')
      if (!wallContext) throw new Error('reforge: 2d context 不可用')
      wallContext.setTransform(1, 0, 0, 1, 0, 0)
      wallContext.clearRect(0, 0, width, height)
      wallContext.globalCompositeOperation = 'source-over'
      wallContext.drawImage(canvas, 0, 0)
      wallContext.globalCompositeOperation = 'source-in'
      wallContext.setTransform(
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.e - left,
        transform.f - top,
      )
      wallContext.imageSmoothingEnabled = this.ctx.imageSmoothingEnabled
      wallContext.drawImage(cover.image, x, y)
      this.ctx.drawImage(wall, left, top)
    }
    this.ctx.globalAlpha *= 1 - OCCLUSION_ALPHA
    this.ctx.drawImage(canvas, left, top)
    this.ctx.restore()
  }

  /**
   * PAL_CalcCoverTiles 的 sprite-specific 候选扫描。
   * ProjectMap 的 lattice 行 `2 * dy + dh` 正好对应旧地图 cell 的
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
            if (tile.height <= 0) continue
            // scene.c:156：瓦片投影深度必须到达精灵脚下。
            if ((dy + tile.height) * TILE_H + dh * SUBROW < sy) continue
            const key = `${tile.layerIndex}:${tile.row}:${tile.col}`
            if (seen.has(key)) continue
            const image = this.bakedTile(tile.tilesetId, tile.tileId)
            if (!image) continue
            seen.add(key)
            out.push({
              tile,
              image,
              baseY: coverBaseY(tile),
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
    map: IsometricMapContent<number | null>,
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
        const image = this.bakedTile(tile.tilesetId, tile.tileId)
        if (image) {
          const rect = projectMapTileBlitRect(tile, image)
          drawTile(image, rect.x + ox, rect.y + oy, tileAlpha(tile))
        }
      }
    }

    const entries: DrawEntry[] = []
    const spriteEntries: SpriteEntry[] = []
    const covers = new Map<string, CoverCandidate>()
    const occlusionActive =
      !opts?.skipCover &&
      !opts?.showAll &&
      opts?.focusLayerId === undefined &&
      opts?.focusHeight === undefined
    if (!occlusionActive) this.occlusionLatch.reset()
    for (const sprite of sprites) {
      const image = this.bake(sprite.frame)
      const rect = spriteBlitRect(sprite)
      const x = Math.round(rect.x + ox)
      const y = Math.round(rect.y + oy)
      const alpha = sprite.alpha
      const candidates = opts?.skipCover ? [] : this.coverTileCandidates(tilesByLattice, sprite)
      const coverKeys = new Set<string>()
      for (const candidate of candidates) {
        const key = coverKey(candidate.tile)
        coverKeys.add(key)
        covers.set(key, { ...candidate, key })
      }
      const entry: SpriteEntry = {
        sprite,
        image,
        x,
        y,
        coverKeys,
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
      }
      entries.push(entry)
      spriteEntries.push(entry)
    }
    spriteEntries.sort((a, b) => a.baseY - b.baseY)
    if (!spriteEntries.some((entry) => entry.sprite.occlusionTrigger === true))
      this.occlusionLatch.reset()

    if (!opts?.skipCover) {
      const retained = new Set<string>()
      const ordinaryCoverKeys = new Set(covers.keys())
      const retainedCandidates = occlusionActive ? this.occlusionLatch.retained() : []
      if (retainedCandidates.length > 0) {
        const currentTiles = new Map(tiles.map((tile) => [coverKey(tile), tile]))
        for (const candidate of retainedCandidates) {
          const current = currentTiles.get(candidate.key)
          if (
            !current ||
            current.tileId !== candidate.tile.tileId ||
            current.tilesetId !== candidate.tile.tilesetId
          )
            continue
          if (
            !spriteEntries.some(
              (entry) =>
                entry.sprite.occlusionTrigger === true &&
                entry.baseY <= candidate.baseY &&
                intersectsCover(entry, candidate, ox, oy),
            )
          )
            continue
          retained.add(candidate.key)
          if (!covers.has(candidate.key)) covers.set(candidate.key, candidate)
        }
      }
      for (const cover of covers.values()) {
        const { tile, image, baseY } = cover
        const x = tile.centerX - HALF_W + ox
        const y = tile.centerY + 7 - image.height + oy
        const eligible = new Set(
          spriteEntries.filter(
            (entry) =>
              occlusionActive &&
              entry.sprite.occlusionTrigger === true &&
              entry.baseY <= baseY &&
              (entry.coverKeys.has(cover.key) || retained.has(cover.key)) &&
              intersectsCover(entry, cover, ox, oy),
          ),
        )
        if (eligible.size > 0 && [...eligible].some((entry) => entry.coverKeys.has(cover.key)))
          this.occlusionLatch.remember(cover)
        entries.push({
          baseY,
          draw: () => {
            const retainedOnly = !ordinaryCoverKeys.has(cover.key)
            if (!retainedOnly) drawTile(image, x, y, tileAlpha(tile))
            if (eligible.size > 0)
              this.revealParty(cover, spriteEntries, eligible, x, y, retainedOnly)
          },
        })
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
