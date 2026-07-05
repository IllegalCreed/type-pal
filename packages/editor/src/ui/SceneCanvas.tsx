/**
 * 场景画布 —— 复用 reforge 的 renderSceneFrame。
 * B1.1 渲染 · B1.2 点选/高亮 · B1.3 拖动移位 + 添加放置 · C0 actor/布局数据化。
 *
 * 复用不重写:渲染器/资产加载/帧下标(sprite-anim)全来自 @type-pal/reforge;编辑器只组
 * SpriteDraw[]、定相机、命中/拖动、画高亮。实体精灵经 resolveEntitySpriteId(actor⊕sprite),
 * 帧 = idleFrameIndex(SpriteDef.layout, facing)——与引擎同一套数据与公式,零漂移。
 */

import type { ActorDef, SceneDef, SpriteDef } from '@type-pal/content'
import { gridToPixel, pixelToGrid, resolveEntitySpriteId, spriteScreenY } from '@type-pal/content'
import type { AssetBase, LoadedSprite, SpriteDraw } from '@type-pal/reforge'
import {
  buildIsBlocked,
  Canvas2DRenderer,
  idleFrameIndex,
  loadPalette,
  loadSprite,
  loadTilemap,
  loadTileset,
  renderSceneFrame,
} from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'

const TILE_W = 32
const TILE_H = 16
const WORLD_SCALE = 4

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

export type Tool = 'select' | 'add'

interface Loaded {
  renderer: Canvas2DRenderer
  map: Awaited<ReturnType<typeof loadTilemap>>
  spritesByNum: Map<number, LoadedSprite>
}
interface HitRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}
/** pointerdown 记录:被抓实体 + 抓取格偏移(实体格 − 光标格),供拖动时保持相对。 */
interface Down {
  entityId: string | null
  grabDcol: number
  grabDrow: number
  moved: boolean
}

export function SceneCanvas(props: {
  scene: SceneDef
  sprites: SpriteDef[]
  actorsById: Record<string, ActorDef>
  /** 进场点预览用的玩家精灵(party[0] → ActorDef.spriteId;App 解析)。 */
  leaderSpriteId: string | undefined
  assetBase: AssetBase
  selectedId: string | null
  tool: Tool
  /** 图层显隐(布置模式左栏开关):base 地板 / cover 高物 / entities 实体 / grid 网格 / blocked 禁入格。 */
  layers: { base: boolean; cover: boolean; entities: boolean; grid: boolean; blocked: boolean }
  onSelect: (id: string | null) => void
  onMoveEntity: (id: string, cell: { col: number; row: number }) => void
  onAddAt: (cell: { col: number; row: number }) => void
}) {
  const {
    scene,
    sprites,
    actorsById,
    leaderSpriteId,
    assetBase,
    selectedId,
    tool,
    layers,
    onSelect,
    onMoveEntity,
    onAddAt,
  } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef<Loaded | null>(null)
  const hitsRef = useRef<HitRect[]>([])
  const downRef = useRef<Down | null>(null)
  const [drag, setDrag] = useState<{ id: string; col: number; row: number } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')
  // 画布视图态:zoom(缩放,worldScale)+ pan(相机左上角对应的世界像素)。整图编辑,非引擎固定摄像机。
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState({ zoom: WORLD_SCALE, panX: 0, panY: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const panDragRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)

  // 容器尺寸 → 画布物理尺寸(自适应,非固定 1280×800)。
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(100, Math.floor(r.width)), h: Math.max(100, Math.floor(r.height)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 地图像素包围盒(菱形投影 AABB;room 缺省 = 整图)。
  const mapBox = (
    map: Loaded['map'],
  ): { minX: number; minY: number; maxX: number; maxY: number } => {
    const room = scene.map.room ?? { col: 0, row: 0, cols: map.width, rows: map.height }
    return {
      minX: room.col * TILE_W - TILE_W,
      minY: room.row * TILE_H - 40,
      maxX: (room.col + room.cols) * TILE_W + TILE_W,
      maxY: (room.row + room.rows) * TILE_H + 16,
    }
  }
  /** fit 整图到容器:zoom 使整图可见(留 4% 边),pan 居中。 */
  const fitView = (map: Loaded['map']): void => {
    const b = mapBox(map)
    const mw = b.maxX - b.minX
    const mh = b.maxY - b.minY
    const zoom = Math.min(size.w / mw, size.h / mh) * 0.96
    setView({
      zoom,
      panX: b.minX - (size.w / zoom - mw) / 2,
      panY: b.minY - (size.h / zoom - mh) / 2,
    })
  }

  const mapNum = scene.map.reuseOriginalMap
  const paletteId = scene.paletteId ?? 0
  const spriteById = new Map(sprites.map((s) => [s.id, s]))
  /** 实体 → SpriteDef(actor⊕sprite 统一解析;解析不到 undefined,画布跳过该实体)。 */
  const entitySpriteDef = (e: SceneDef['entities'][number]): SpriteDef | undefined => {
    const sid = resolveEntitySpriteId(e, actorsById)
    return sid ? spriteById.get(sid) : undefined
  }
  const leaderDef = leaderSpriteId ? spriteById.get(leaderSpriteId) : undefined
  const spriteNums = [
    ...new Set(
      [
        leaderDef?.spriteNum,
        ...scene.entities.filter((e) => !e.hidden).map((e) => entitySpriteDef(e)?.spriteNum),
      ].filter((n): n is number => n != null),
    ),
  ]
  const spriteNumsKey = spriteNums.join(',')

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let alive = true
    setStatus('loading')
    void (async () => {
      try {
        const [map, tiles, palette] = await Promise.all([
          loadTilemap(assetBase, mapNum),
          loadTileset(assetBase, mapNum),
          loadPalette(assetBase, paletteId),
        ])
        const entries = await Promise.all(
          spriteNums.map(async (n) => [n, await loadSprite(assetBase, n)] as const),
        )
        if (!alive) return
        loadedRef.current = {
          renderer: new Canvas2DRenderer(ctx, palette, tiles),
          map,
          spritesByNum: new Map(entries),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetBase, mapNum, paletteId, spriteNumsKey])

  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!loaded || !ctx) return
    const { renderer, map, spritesByNum } = loaded

    // M2a:视窗可选 —— 缺省整张图(迁移场景无 room;demo 保留)。整图编辑:room 决定 tile
    // 遍历范围,相机(camera)= 用户平移,worldScale = 用户缩放(renderScene 不夹相机)。
    const room = scene.map.room ?? { col: 0, row: 0, cols: map.width, rows: map.height }
    const ep = gridToPixel(scene.entry.pos)
    const { zoom, panX, panY } = viewRef.current
    const camera = { x: panX, y: panY }

    const physRect = (
      wx: number,
      wy: number,
      ax: number,
      ay: number,
      fw: number,
      fh: number,
    ): Omit<HitRect, 'id'> => ({
      x: (wx - ax - panX) * zoom,
      y: (wy - ay - panY) * zoom,
      w: fw * zoom,
      h: fh * zoom,
    })

    const draws: SpriteDraw[] = []
    const hits: HitRect[] = []
    // 进场点预览(玩家精灵,按 entry.facing 取站立帧;帧下标 = 引擎同款 idleFrameIndex)
    const ps = leaderDef ? spritesByNum.get(leaderDef.spriteNum) : undefined
    const pf = leaderDef
      ? (ps?.frames[idleFrameIndex(leaderDef.layout, scene.entry.facing)] ?? ps?.frames[0])
      : undefined
    if (ps && pf) {
      // 每帧自锚(sdlpal 按当前帧宽高 blit;引擎侧同款,防变尺寸帧组错位)
      draws.push({
        frame: pf,
        worldX: ep.x,
        worldY: spriteScreenY(scene.entry.pos),
        anchorX: Math.floor(pf.width / 2),
        anchorY: pf.height,
      })
    }
    // 各实体(站立帧 = layout × facing)+ 记命中盒;实体图层关 → 不画不可点
    for (const e of layers.entities ? scene.entities : []) {
      if (e.hidden) continue // 初始隐藏(M2a):编辑器画布同引擎不渲染(后续可加"显隐透视"开关)
      const def = entitySpriteDef(e)
      const sp = def ? spritesByNum.get(def.spriteNum) : undefined
      const f = def
        ? (sp?.frames[idleFrameIndex(def.layout, e.facing ?? 'down')] ?? sp?.frames[0])
        : undefined
      if (!sp || !f) continue
      // 拖动中的实体用预览格
      const pos =
        drag && drag.id === e.id ? { col: drag.col, row: drag.row, height: e.pos.height } : e.pos
      const p = gridToPixel(pos)
      const wy = spriteScreenY(pos)
      const ax = Math.floor(f.width / 2) // 每帧自锚(同引擎;命中盒同款防错位)
      const ay = f.height
      draws.push({
        frame: f,
        worldX: p.x,
        worldY: wy,
        anchorX: ax,
        anchorY: ay,
        baseYBias: e.zBias,
      })
      hits.push({ id: e.id, ...physRect(p.x, wy, ax, ay, f.width, f.height) })
    }
    hitsRef.current = hits

    renderSceneFrame(ctx, renderer, {
      map,
      room,
      camera,
      sprites: draws,
      worldScale: zoom,
      layers: { skipBase: !layers.base, skipCover: !layers.cover },
    })

    // 叠加层:禁入格(碰撞数据,与引擎同一套 buildIsBlocked)+ 菱形网格。世界坐标系画(scale+平移)。
    if (layers.blocked || layers.grid) {
      ctx.save()
      ctx.scale(zoom, zoom)
      ctx.translate(-panX, -panY)
      const diamond = (path: Path2D, cx: number, cy: number): void => {
        path.moveTo(cx - 16, cy)
        path.lineTo(cx, cy - 8)
        path.lineTo(cx + 16, cy)
        path.lineTo(cx, cy + 8)
        path.closePath()
      }
      // ⚠ room 是矩形 cell 坐标;站立格是菱形轴(gridToPixel 参数化)。两者参数化不同 —— 在
      // **像素域**遍历:菱形格中心 = (16a, 8b) 且 a+b 为偶(pixelToGrid 精确往返的格点)。
      const px0 = room.col * TILE_W - TILE_W
      const px1 = (room.col + room.cols) * TILE_W + TILE_W
      const py0 = room.row * TILE_H
      const py1 = (room.row + room.rows) * TILE_H + TILE_H
      const isBlocked = layers.blocked ? buildIsBlocked(map) : null
      const blockedPath = new Path2D()
      const gridPath = new Path2D()
      for (let b = Math.ceil(py0 / 8); b * 8 <= py1; b++) {
        for (let a = Math.ceil(px0 / 16); a * 16 <= px1; a++) {
          if (((a + b) & 1) !== 0) continue // 非格中心
          const cx = a * 16
          const cy = b * 8
          if (layers.grid) diamond(gridPath, cx, cy)
          if (isBlocked?.(cx, cy)) diamond(blockedPath, cx, cy)
        }
      }
      if (layers.blocked) {
        ctx.fillStyle = 'rgba(255, 70, 70, 0.3)'
        ctx.fill(blockedPath)
      }
      if (layers.grid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
        ctx.lineWidth = 1 / zoom // 屏幕恒 1px
        ctx.stroke(gridPath)
      }
      ctx.restore()
    }

    const sel = hits.find((h) => h.id === selectedId)
    if (sel) {
      ctx.save()
      ctx.strokeStyle = '#4c9aff'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(sel.x - 2, sel.y - 2, sel.w + 4, sel.h + 4)
      ctx.restore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scene, selectedId, drag, actorsById, leaderSpriteId, view, size, layers])

  // —— 坐标 + 命中 ——（画布像素 = CSS 像素 1:1;world = screen/zoom + pan）
  const screenToCell = (clientX: number, clientY: number): { col: number; row: number } => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const sx = (clientX - r.left) * (canvas.width / r.width)
    const sy = (clientY - r.top) * (canvas.height / r.height)
    const { zoom, panX, panY } = viewRef.current
    return pixelToGrid(sx / zoom + panX, sy / zoom + panY)
  }
  const entityAt = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const cx = ((clientX - r.left) / r.width) * canvas.width
    const cy = ((clientY - r.top) / r.height) * canvas.height
    let id: string | null = null
    for (const h of hitsRef.current) {
      if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) id = h.id // 取最上(后者覆盖)
    }
    return id
  }

  // —— 指针交互 ——
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (tool === 'add') {
      downRef.current = { entityId: null, grabDcol: 0, grabDrow: 0, moved: false }
      return
    }
    // select 工具
    const hitId = entityAt(e.clientX, e.clientY)
    onSelect(hitId)
    if (hitId) {
      const ent = scene.entities.find((x) => x.id === hitId)
      const cell = screenToCell(e.clientX, e.clientY)
      downRef.current = {
        entityId: hitId,
        grabDcol: (ent?.pos.col ?? cell.col) - cell.col,
        grabDrow: (ent?.pos.row ?? cell.row) - cell.row,
        moved: false,
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* 合成/边缘指针可能抛 InvalidPointerId,忽略即可(拖动仍在画布内可用) */
      }
    } else {
      // 点空白(select 工具)→ 拖动平移画布
      downRef.current = null
      panDragRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        panX: viewRef.current.panX,
        panY: viewRef.current.panY,
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* 忽略边缘指针 */
      }
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const pd = panDragRef.current
    if (pd) {
      const { zoom } = viewRef.current
      setView((v) => ({
        ...v,
        panX: pd.panX - (e.clientX - pd.sx) / zoom,
        panY: pd.panY - (e.clientY - pd.sy) / zoom,
      }))
      return
    }
    const d = downRef.current
    if (!d || !d.entityId) return
    const cell = screenToCell(e.clientX, e.clientY)
    d.moved = true
    setDrag({ id: d.entityId, col: cell.col + d.grabDcol, row: cell.row + d.grabDrow })
  }
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (panDragRef.current) {
      panDragRef.current = null
      return
    }
    const d = downRef.current
    downRef.current = null
    if (tool === 'add') {
      onAddAt(screenToCell(e.clientX, e.clientY))
      return
    }
    if (d?.entityId && d.moved && drag) onMoveEntity(d.entityId, { col: drag.col, row: drag.row })
    setDrag(null)
  }

  // 滚轮缩放(以光标为锚点);non-passive 阻止页面滚动。
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      const mx = (e.clientX - r.left) * (canvas.width / r.width)
      const my = (e.clientY - r.top) * (canvas.height / r.height)
      const { zoom, panX, panY } = viewRef.current
      const wx = mx / zoom + panX
      const wy = my / zoom + panY
      const nz = clamp(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.04, 16)
      setView({ zoom: nz, panX: wx - mx / nz, panY: wy - my / nz })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  // fit 整图:首次就绪 / 切场景 / 容器尺寸变 → 重新 fit(用户缩放平移不触发)。
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    if (loaded) fitView(loaded.map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scene.id, size.w, size.h])

  return (
    <div className="viewport" ref={wrapRef}>
      <div className="canvas-note">
        整图 · 滚轮缩放 · 拖空白平移 · {Math.round(view.zoom * 100)}%
        {status === 'loading' ? ' · 载入中…' : ''}
      </div>
      {status === 'error' && (
        <div className="boot">
          <div className="err">场景渲染失败: {err}</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: tool === 'add' ? 'crosshair' : 'grab',
          touchAction: 'none',
        }}
      />
    </div>
  )
}
