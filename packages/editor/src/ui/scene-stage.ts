/**
 * 场景舞台共享层 —— 「一个地图控件,多种模式」的地基(作者定调,2026-07-08)。
 *
 * 消费者:SceneCanvas(布置模式:选/拖/放)、PreviewCanvas(预览模式:playback 演出)、
 * 将来 W7 地图编辑器(tile 绘制)。三者共享的是**偶然重复**的部分:资产加载、
 * 缩放/平移视图态、网格/禁入叠加、触发高亮;各自保留**真实分歧**(交互语义/渲染驱动)。
 * 没有这层,每个模式就是重写一遍地图渲染 —— 缩放/叠加分叉(预览曾不能缩放、网格无效)
 * 即恶果。
 */

import type {
  AssetCatalogV1,
  AssetId,
  IsometricMapContent,
  MapIndexV1,
  SceneDef,
} from '@type-pal/content'
import { gridToPixel, mapAssetById, resolveTilesetAsset } from '@type-pal/content'
import type {
  AssetBase,
  LoadedSprite,
  Palette,
  ProjectMap,
  SceneMapAssets,
  TilesetDef,
} from '@type-pal/reforge'
import {
  Canvas2DRenderer,
  loadProjectMap,
  loadStandardPalette,
  loadTilesetAsset,
  pixelToLattice,
} from '@type-pal/reforge'
import { type RefObject, useEffect, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { loadEditorSprite } from '../core/sprite-assets.js'

export const TILE_W = 32
export const TILE_H = 16

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

export interface StageAssets {
  renderer: Canvas2DRenderer
  map: SceneMapAssets['map']
  spritesByAsset: Map<AssetId, LoadedSprite>
  /** 地图所引用的全部瓦片集；渲染按实例来源解析。 */
  tilesets: SceneMapAssets['tilesets']
  /** 当前瓦片面板来源；MapMode 会按用户选择切换。 */
  tiles: Map<number, import('@type-pal/reforge').RleFrame>
  palette: Palette
}

/** 容器尺寸 → 画布物理尺寸(自适应;ResizeObserver)。 */
export function useStageSize(
  wrapRef: RefObject<HTMLDivElement | null>,
  min = 100,
): { w: number; h: number } {
  const [size, setSize] = useState({ w: 800, h: 600 })
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = (): void => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(min, Math.floor(r.width)), h: Math.max(min, Math.floor(r.height)) })
    }
    if (typeof ResizeObserver === 'undefined') {
      measure()
      return
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [wrapRef, min])
  return size
}

/** 场景资产加载(map/tileset/palette + 指定 world-sprite AssetId)。 */
export function useSceneAssets(opts: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  assetBase: AssetBase
  mapId: string
  spriteAssets: AssetId[]
  /** 编辑器实时自有地图(键 = 稳定 map id)。 */
  projectMaps?: Record<string, ProjectMap>
  /** 稳定 map id → 文件路径；实时副本缺失时用于磁盘回退。 */
  mapIndex?: MapIndexV1
  /** tileset 注册表；ProjectMap 只保存稳定 tilesetId。 */
  tilesets: readonly TilesetDef[]
  /** 作者模式可额外预载尚未写入地图、但可用于下一笔绘制的瓦片集。 */
  authoringTilesetIds?: readonly string[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
}): {
  status: 'loading' | 'ready' | 'error'
  err: string
  loadedRef: RefObject<StageAssets | null>
} {
  const {
    canvasRef,
    assetBase,
    mapId,
    spriteAssets,
    projectMaps,
    mapIndex,
    tilesets,
    authoringTilesetIds,
    assetCatalog,
    assetReader,
  } = opts
  const loadedRef = useRef<StageAssets | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')
  const spriteAssetsKey = [...new Set(spriteAssets)]
    .sort()
    .map((asset) => `${asset}:${assetCatalog.assets[asset]?.sha256 ?? 'missing'}`)
    .join(',')
  const liveMap = projectMaps?.[mapId]
  const projectMapPath = mapAssetById(mapIndex ?? { version: 1, maps: [] }, mapId)?.path ?? ''
  // 换绑 tileset 时 mapKey 不变 → 定义引用与 catalog record sha 单独进入依赖。
  const requestedTilesetIds = [
    ...new Set([...(liveMap?.tilesetRefs ?? []), ...(authoringTilesetIds ?? [])]),
  ].sort()
  const tilesetRef = requestedTilesetIds.join(',')
  const tilesetRevision = liveMap
    ? requestedTilesetIds
        .map((tilesetId) => {
          const asset = resolveTilesetAsset(tilesetId, tilesets)
          return `${tilesetId}:${assetCatalog.assets[asset]?.sha256 ?? 'missing'}`
        })
        .join(',')
    : 'unloaded'
  // 已加载地图的编辑态更新只换 map 引用，不重读 tileset/精灵资产。
  useEffect(() => {
    if (!liveMap || !loadedRef.current) return
    loadedRef.current = { ...loadedRef.current, map: liveMap }
  }, [liveMap])

  // biome-ignore lint/correctness/useExhaustiveDependencies: spriteAssets 以 AssetId+SHA 稳定 key 比较。
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let alive = true
    setStatus('loading')
    void (async () => {
      try {
        const [{ map, tilesets: loadedTilesets }, palette] = await Promise.all([
          // 有实时副本 → 直接用它；否则按 mapId 从磁盘懒加载。
          (async () => {
            const map = liveMap ?? (await loadProjectMap(assetBase, projectMapPath))
            const loaded = await Promise.all(
              requestedTilesetIds.map(
                async (tilesetId) =>
                  [
                    tilesetId,
                    await loadTilesetAsset(assetReader, resolveTilesetAsset(tilesetId, tilesets)),
                  ] as const,
              ),
            )
            return { map, tilesets: new Map(loaded) }
          })(),
          loadStandardPalette(assetBase), // 只留盘 0(W7a-3:调色板概念退役)
        ])
        const entries = await Promise.all(
          [...new Set(spriteAssets)].map(
            async (asset) => [asset, await loadEditorSprite(assetReader, asset)] as const,
          ),
        )
        if (!alive) return
        const tiles = loadedTilesets.get(map.tilesetRefs[0]!) ?? new Map()
        loadedRef.current = {
          renderer: new Canvas2DRenderer(ctx, palette, loadedTilesets),
          map,
          spritesByAsset: new Map(entries),
          tilesets: loadedTilesets,
          tiles,
          palette,
        }
        setStatus('ready')
      } catch (e) {
        if (alive) {
          setErr(e instanceof Error ? e.message : String(e))
          setStatus('error')
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [
    assetBase,
    assetReader,
    mapId,
    projectMapPath,
    spriteAssetsKey,
    canvasRef,
    tilesetRef,
    tilesetRevision,
  ])
  return { status, err, loadedRef }
}

export interface StageView {
  zoom: number
  panX: number
  panY: number
}

/**
 * 缩放/平移视图态 + 滚轮锚点缩放(non-passive)。pan 语义由消费者定
 * (布置=绝对相机;预览=相对导演相机的偏移),wheel 缩放两者通用。
 */
export function useViewZoomPan(opts: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  initial: StageView
  /** 预览模式:缩放围绕屏幕中心(导演相机在动,光标锚意义不大);缺省 false = 光标锚。 */
  centerAnchor?: boolean
}): {
  view: StageView
  viewRef: RefObject<StageView>
  setView: (v: StageView | ((p: StageView) => StageView)) => void
} {
  const { canvasRef, initial, centerAnchor } = opts
  const [view, setView] = useState<StageView>(initial)
  const viewRef = useRef(view)
  viewRef.current = view
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const { zoom, panX, panY } = viewRef.current
      const nz = clamp(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.04, 16)
      if (centerAnchor) {
        // 围绕屏幕中心缩放:pan 是偏移量,中心不动 → pan 不变
        setView((v) => ({ ...v, zoom: nz }))
        return
      }
      const r = canvas.getBoundingClientRect()
      const mx = (e.clientX - r.left) * (canvas.width / r.width)
      const my = (e.clientY - r.top) * (canvas.height / r.height)
      const wx = mx / zoom + panX
      const wy = my / zoom + panY
      setView({ zoom: nz, panX: wx - mx / nz, panY: wy - my / nz })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [canvasRef, centerAnchor])
  return { view, viewRef, setView }
}

/** 地图像素包围盒(菱形投影 AABB;room 缺省 = 整图)。 */
export function mapBoxOf(
  map: { width: number; height: number },
  room: { col: number; row: number; cols: number; rows: number } | undefined,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const r = room ?? { col: 0, row: 0, cols: map.width, rows: map.height }
  return {
    minX: r.col * TILE_W - TILE_W,
    minY: r.row * TILE_H - 40,
    maxX: (r.col + r.cols) * TILE_W + TILE_W,
    maxY: (r.row + r.rows) * TILE_H + 16,
  }
}

/** 编辑器碰撞遮罩只标记显式非零值；nullable 组合中的 null 是“没有碰撞记录”。 */
export function isCollisionOverlayMarked(
  map: IsometricMapContent<number | null>,
  point: { row: number; col: number },
): boolean {
  const value = map.collision[point.row]?.[point.col]
  return value !== null && value !== undefined && value !== 0
}

/**
 * 网格/禁入格叠加(世界坐标系;调用方不需预先 scale)。
 * ⚠ room 是矩形 cell 坐标;站立格是菱形轴 —— 像素域遍历:格中心 = (16a, 8b) 且 a+b 为偶。
 */
export function drawGridBlocked(
  ctx: CanvasRenderingContext2D,
  map: IsometricMapContent<number | null>,
  room: { col: number; row: number; cols: number; rows: number },
  view: StageView,
  show: { grid: boolean; blocked: boolean },
): void {
  if (!show.grid && !show.blocked) return
  ctx.save()
  ctx.scale(view.zoom, view.zoom)
  ctx.translate(-view.panX, -view.panY)
  const diamond = (path: Path2D, cx: number, cy: number): void => {
    path.moveTo(cx - 16, cy)
    path.lineTo(cx, cy - 8)
    path.lineTo(cx + 16, cy)
    path.lineTo(cx, cy + 8)
    path.closePath()
  }
  // 视口裁剪:只遍历「房间 ∩ 可见世界矩形」内的格 —— 否则大图每帧重建整图 Path2D,
  // 网格开着拖动即卡(作者报)。加一格余量防边缘格半隐时弹跳。
  const vw = ctx.canvas.width / view.zoom
  const vh = ctx.canvas.height / view.zoom
  const px0 = Math.max(room.col * TILE_W - TILE_W, view.panX - TILE_W)
  const px1 = Math.min((room.col + room.cols) * TILE_W + TILE_W, view.panX + vw + TILE_W)
  const py0 = Math.max(room.row * TILE_H, view.panY - TILE_H)
  const py1 = Math.min((room.row + room.rows) * TILE_H + TILE_H, view.panY + vh + TILE_H)
  if (show.blocked) {
    const blockedPath = new Path2D()
    for (let b = Math.ceil(py0 / 8); b * 8 <= py1; b++) {
      for (let a = Math.ceil(px0 / 16); a * 16 <= px1; a++) {
        if (((a + b) & 1) !== 0) continue // 非格中心
        const cx = a * 16
        const cy = b * 8
        // 禁入红只画图内显式非零碰撞。组合的 nullable collision 中 null 表示“未记录”，
        // 不能复用运行时 fail-closed 判定，否则扩展出来的空画布会整片标红。
        const inRoom =
          cx >= room.col * TILE_W &&
          cx < (room.col + room.cols) * TILE_W &&
          cy >= room.row * TILE_H &&
          cy < (room.row + room.rows) * TILE_H
        if (inRoom && isCollisionOverlayMarked(map, pixelToLattice(cx, cy)))
          diamond(blockedPath, cx, cy)
      }
    }
    ctx.fillStyle = 'rgba(255, 70, 70, 0.3)'
    ctx.fill(blockedPath)
  }
  if (show.grid) {
    // 网格 = 两组贯穿平行斜线。合法 lattice 中心满足 a+b 为偶，因此格边只落在
    // y = ±x/2 + 8k 的奇数 k 上；偶数 k 会穿过格心，把一个真实菱形误切成两个“半格”。
    // 条数 O(可见宽+高) 而非 O(可见格数) 个菱形。低倍率大图上菱形法每帧构建/描边数十万个
    // Path2D 段(实测 40 次缩放帧 31.6s),贯穿线法只有千级段,且视觉上与逐格菱形完全等价。
    // px0..py1 含视口防弹跳余量，只用于生成足够长的斜线；真正可见的网格必须裁在
    // 非倾斜的地图画布矩形内，不能把 culling 余量画成额外一圈格子。
    const clipX0 = Math.max(0, view.panX)
    const clipX1 = Math.min(map.width * TILE_W, view.panX + vw)
    const clipY0 = Math.max(0, view.panY)
    const clipY1 = Math.min(map.height * TILE_H, view.panY + vh)
    if (clipX1 <= clipX0 || clipY1 <= clipY0) {
      ctx.restore()
      return
    }
    ctx.save()
    ctx.beginPath()
    ctx.rect(clipX0, clipY0, clipX1 - clipX0, clipY1 - clipY0)
    ctx.clip()
    const gridPath = new Path2D()
    for (const m of [0.5, -0.5] as const) {
      // y = m·x + 8k 与 [px0,px1]×[py0,py1] 相交的 k:min(y)≤py1 且 max(y)≥py0
      const lo = Math.min(m * px0, m * px1)
      const hi = Math.max(m * px0, m * px1)
      for (let k = Math.ceil((py0 - hi) / 8); k <= Math.floor((py1 - lo) / 8); k++) {
        if (Math.abs(k % 2) !== 1) continue
        gridPath.moveTo(px0, m * px0 + 8 * k)
        gridPath.lineTo(px1, m * px1 + 8 * k)
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 1 / view.zoom // 屏幕恒 1px
    ctx.stroke(gridPath)
    ctx.restore()
  }
  ctx.restore()
}

function diamondPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  camera: { x: number; y: number },
  zoom: number,
): void {
  const sx = (wx: number): number => (wx - camera.x) * zoom
  const sy = (wy: number): number => (wy - camera.y) * zoom
  ctx.beginPath()
  ctx.moveTo(sx(cx), sy(cy - 8))
  ctx.lineTo(sx(cx + 16), sy(cy))
  ctx.lineTo(sx(cx), sy(cy + 8))
  ctx.lineTo(sx(cx - 16), sy(cy))
  ctx.closePath()
}

/**
 * 选中事件的触发点/面高亮:owner 格金色描边(呼吸)+ 触发范围淡金面
 * (range = max(trigger.range, interact?1:0),切比雪夫盒 —— 与引擎 findTrigger 同源)。
 * zone/隐藏实体无精灵,此标记是它们在预览里唯一的可见形态;ghost = 隐藏实体淡显。
 * 布置模式可用 ownerDashed 将中心格改成虚线,范围语义保持一致。
 */
export function drawTriggerHighlight(
  ctx: CanvasRenderingContext2D,
  e: SceneDef['entities'][number],
  camera: { x: number; y: number },
  zoom: number,
  now: number,
  options: { ghost?: boolean; ownerDashed?: boolean } = {},
): void {
  const { ghost = false, ownerDashed = false } = options
  const t = e.pages?.[0]?.trigger
  const range = t ? Math.max(t.range ?? 0, t.on === 'interact' ? 1 : 0) : 0
  const height = e.pos.height ?? 0
  const breath = 0.55 + 0.35 * Math.sin(now / 280)
  const alpha = ghost ? 0.35 : 1
  ctx.save()
  if (range > 0) {
    ctx.fillStyle = `rgba(255, 203, 113, ${0.2 * alpha})`
    ctx.strokeStyle = `rgba(255, 214, 90, ${0.35 * alpha})`
    ctx.lineWidth = 1
    for (let dc = -range; dc <= range; dc++) {
      for (let dr = -range; dr <= range; dr++) {
        if (dc === 0 && dr === 0) continue
        const p = gridToPixel({ col: e.pos.col + dc, row: e.pos.row + dr, height })
        diamondPath(ctx, p.x, p.y, camera, zoom)
        ctx.fill()
        ctx.stroke()
      }
    }
  }
  const c = gridToPixel(e.pos)
  diamondPath(ctx, c.x, c.y, camera, zoom)
  ctx.fillStyle = `rgba(255, 203, 113, ${0.28 * alpha})`
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = `rgba(255, 214, 90, ${breath * alpha})`
  if (ownerDashed) ctx.setLineDash([6, 4])
  ctx.stroke()
  ctx.setLineDash([])
  const sx = (c.x - camera.x) * zoom
  const sy = (c.y - camera.y) * zoom
  ctx.strokeStyle = `rgba(255, 235, 170, ${0.9 * alpha})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(sx - 5, sy)
  ctx.lineTo(sx + 5, sy)
  ctx.moveTo(sx, sy - 5)
  ctx.lineTo(sx, sy + 5)
  ctx.stroke()
  ctx.restore()
}
