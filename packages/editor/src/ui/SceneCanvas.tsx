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
import type { AssetBase, SpriteDraw } from '@type-pal/reforge'
import { idleFrameIndex, renderSceneFrame, spriteBlitRect } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'
import {
  drawGridBlocked,
  mapBoxOf,
  type StageAssets,
  useSceneAssets,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'

const WORLD_SCALE = 4

export type Tool = 'select' | 'add'

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
  const hitsRef = useRef<HitRect[]>([])
  const downRef = useRef<Down | null>(null)
  const [drag, setDrag] = useState<{ id: string; col: number; row: number } | null>(null)
  // 共享层:容器自适应 + 视图态(缩放/平移,滚轮锚点缩放)—— 与预览/W7 同一套(scene-stage)
  const size = useStageSize(wrapRef)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef,
    initial: { zoom: WORLD_SCALE, panX: 0, panY: 0 },
  })
  const panDragRef = useRef<{ sx: number; sy: number; panX: number; panY: number } | null>(null)

  // 地图像素包围盒(菱形投影 AABB;room 缺省 = 整图)。
  const mapBox = (map: StageAssets['map']) => mapBoxOf(map, scene.map.room)
  /** fit 整图到容器:zoom 使整图可见(留 4% 边),pan 居中。 */
  const fitView = (map: StageAssets['map']): void => {
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
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    mapNum,
    paletteId,
    spriteNums,
  })

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
    ): Omit<HitRect, 'id'> => {
      // 与引擎同一 blit 矩形(spriteBlitRect = +7 资产下沉唯一收口;曾手写漏 +7 致选框偏高)
      const r = spriteBlitRect({
        worldX: wx,
        worldY: wy,
        anchorX: ax,
        anchorY: ay,
        frame: { width: fw, height: fh },
      })
      return { x: (r.x - panX) * zoom, y: (r.y - panY) * zoom, w: r.w * zoom, h: r.h * zoom }
    }

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

    // 叠加层:网格/禁入(共享层;预览/W7 同一套)
    drawGridBlocked(ctx, map, room, { zoom, panX, panY }, {
      grid: layers.grid,
      blocked: layers.blocked,
    })

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
