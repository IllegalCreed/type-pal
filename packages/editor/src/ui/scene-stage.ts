/**
 * 场景舞台共享层 —— 「一个地图控件,多种模式」的地基(作者定调,2026-07-08)。
 *
 * 消费者:SceneCanvas(布置模式:选/拖/放)、PreviewCanvas(预览模式:playback 演出)、
 * 将来 W7 地图编辑器(tile 绘制)。三者共享的是**偶然重复**的部分:资产加载、
 * 缩放/平移视图态、网格/禁入叠加、触发高亮;各自保留**真实分歧**(交互语义/渲染驱动)。
 * 没有这层,每个模式就是重写一遍地图渲染 —— 缩放/叠加分叉(预览曾不能缩放、网格无效)
 * 即恶果。
 */

import type { SceneDef, SceneMap } from '@type-pal/content'
import { gridToPixel, isReuseMap, resolveTilesetPath, sceneMapKey } from '@type-pal/content'
import type { AssetBase, LoadedSprite, OwnMap, Palette, SceneMapAssets, TilesetDef } from '@type-pal/reforge'
import {
  buildIsBlocked,
  Canvas2DRenderer,
  decompressGzip,
  loadPalette,
  loadSceneMap,
  loadSprite,
  loadTilesetByPath,
  parseSpriteChunk,
  tilesFromChunkBytes,
} from '@type-pal/reforge'
import { type RefObject, useEffect, useRef, useState } from 'react'

export const TILE_W = 32
export const TILE_H = 16

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

export interface StageAssets {
  renderer: Canvas2DRenderer
  map: SceneMapAssets['map']
  spritesByNum: Map<number, LoadedSprite>
  /** tileset 帧(索引 → RleFrame)+ 调色板 —— W7c tile 面板缩略图用。 */
  tiles: SceneMapAssets['tiles']
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
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(min, Math.floor(r.width)), h: Math.max(min, Math.floor(r.height)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [wrapRef, min])
  return size
}

/** 场景资产加载(map/tileset/palette + 指定精灵号)。sceneMap/spriteNums 以 key 串比较防重载。 */
export function useSceneAssets(opts: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  assetBase: AssetBase
  sceneMap: SceneMap
  spriteNums: number[]
  /** 编辑器实时自有地图(键 = ownMap 路径)。own 场景从此读地图,不落磁盘(创建后未存磁盘上没有)。 */
  ownMaps?: Record<string, OwnMap>
  /** tileset 注册表(W7B:OwnMap.tileset 可为注册表 id;缺省 [] = 仅路径直通)。 */
  tilesets?: readonly TilesetDef[]
  /** 上传未保存的 tileset 字节(键 = 资产路径);命中则内存解码,不读磁盘。 */
  tilesetBlobs?: Record<string, ArrayBuffer>
  /** A4 自有上传精灵源(num → path/未保存字节);缺省全走原版号约定。 */
  spriteSources?: ReadonlyMap<number, { path?: string; blob?: ArrayBuffer }>
}): { status: 'loading' | 'ready' | 'error'; err: string; loadedRef: RefObject<StageAssets | null> } {
  const { canvasRef, assetBase, sceneMap, spriteNums, ownMaps, tilesets, tilesetBlobs, spriteSources } = opts
  const loadedRef = useRef<StageAssets | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')
  const spriteNumsKey = spriteNums.join(',')
  const mapKey = sceneMapKey(sceneMap) // 复用 `r:<号>` / 自有 `o:<路径>`,稳定串防对象身份误触重载
  // 自有地图:优先读实时 state(编辑中未存);无则 undefined → 落回 loadSceneMap 磁盘读(round-trip)
  const liveMap = !isReuseMap(sceneMap) ? ownMaps?.[sceneMap.ownMap] : undefined
  // 换绑 tileset 时 mapKey 不变 → 引用单独入依赖(W7B);注册表经 resolveTilesetPath 解析 id/路径
  const tilesetRef = liveMap?.tileset ?? ''
  // biome-ignore lint/correctness/useExhaustiveDependencies: sceneMap/spriteNums/liveMap 以 key 串比较(对象/数组身份每渲染变)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let alive = true
    setStatus('loading')
    void (async () => {
      try {
        const [{ map, tiles }, palette] = await Promise.all([
          // 自有地图有实时副本 → 直接用它 + 按其 tileset 取瓦片;否则走 loadSceneMap(复用/磁盘)
          liveMap
            ? (async () => {
                const path = resolveTilesetPath(liveMap.tileset, tilesets ?? [])
                const mem = tilesetBlobs?.[path] // 上传未保存:内存字节优先(磁盘尚无此文件)
                const tiles = mem
                  ? await tilesFromChunkBytes(mem)
                  : await loadTilesetByPath(assetBase, path)
                return { map: liveMap, tiles }
              })()
            : loadSceneMap(assetBase, sceneMap, tilesets), // 复用原版 ⊕ 自有(磁盘),分流内建
          loadPalette(assetBase, 0), // 只留盘 0(W7a-3:调色板概念退役)
        ])
        const entries = await Promise.all(
          spriteNums.map(async (n) => {
            const src = spriteSources?.get(n)
            if (src?.blob) {
              // 上传未保存:内存字节优先(磁盘尚无此文件;W7B tileset 同理)
              const frames = parseSpriteChunk(await decompressGzip(new Blob([src.blob])))
              const first = frames[0]
              return [n, { frames, anchorX: first ? Math.floor(first.width / 2) : 0, anchorY: first?.height ?? 0 }] as const
            }
            return [n, await loadSprite(assetBase, n, src?.path)] as const
          }),
        )
        if (!alive) return
        loadedRef.current = {
          renderer: new Canvas2DRenderer(ctx, palette, tiles),
          map,
          spritesByNum: new Map(entries),
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
  }, [assetBase, mapKey, spriteNumsKey, canvasRef, tilesetRef])
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

/**
 * 网格/禁入格叠加(世界坐标系;调用方不需预先 scale)。
 * ⚠ room 是矩形 cell 坐标;站立格是菱形轴 —— 像素域遍历:格中心 = (16a, 8b) 且 a+b 为偶。
 */
export function drawGridBlocked(
  ctx: CanvasRenderingContext2D,
  map: StageAssets['map'],
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
  const isBlocked = show.blocked ? buildIsBlocked(map) : null
  const blockedPath = new Path2D()
  const gridPath = new Path2D()
  for (let b = Math.ceil(py0 / 8); b * 8 <= py1; b++) {
    for (let a = Math.ceil(px0 / 16); a * 16 <= px1; a++) {
      if (((a + b) & 1) !== 0) continue // 非格中心
      const cx = a * 16
      const cy = b * 8
      if (show.grid) diamond(gridPath, cx, cy)
      // 禁入红只画图内子格(buildIsBlocked 界外恒 true 是游戏语义;编辑器画它 = 边缘一圈
      // 误导性红圈,空白图看似全边被标碰撞 —— W7C-3 复验发现,W7c-1 遗留)
      const inRoom =
        cx >= room.col * TILE_W &&
        cx < (room.col + room.cols) * TILE_W &&
        cy >= room.row * TILE_H &&
        cy < (room.row + room.rows) * TILE_H
      if (inRoom && isBlocked?.(cx, cy)) diamond(blockedPath, cx, cy)
    }
  }
  if (show.blocked) {
    ctx.fillStyle = 'rgba(255, 70, 70, 0.3)'
    ctx.fill(blockedPath)
  }
  if (show.grid) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 1 / view.zoom // 屏幕恒 1px
    ctx.stroke(gridPath)
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
 */
export function drawTriggerHighlight(
  ctx: CanvasRenderingContext2D,
  e: SceneDef['entities'][number],
  camera: { x: number; y: number },
  zoom: number,
  now: number,
  ghost = false,
): void {
  const t = e.pages?.[0]?.trigger
  const range = t ? Math.max(t.range ?? 0, t.on === 'interact' ? 1 : 0) : 0
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
        const p = gridToPixel({ col: e.pos.col + dc, row: e.pos.row + dr, height: 0 })
        diamondPath(ctx, p.x, p.y, camera, zoom)
        ctx.fill()
        ctx.stroke()
      }
    }
  }
  const c = gridToPixel({ col: e.pos.col, row: e.pos.row, height: 0 })
  diamondPath(ctx, c.x, c.y, camera, zoom)
  ctx.fillStyle = `rgba(255, 203, 113, ${0.28 * alpha})`
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = `rgba(255, 214, 90, ${breath * alpha})`
  ctx.stroke()
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
