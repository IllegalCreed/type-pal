/**
 * 场景画布 —— 复用 reforge 的 renderSceneFrame。
 * B1.1 渲染 · B1.2 点选/高亮 · B1.3 拖动移位 + 添加放置 · C0 actor/布局数据化。
 *
 * 复用不重写:渲染器/资产加载/帧下标(sprite-anim)全来自 @type-pal/reforge;编辑器只组
 * SpriteDraw[]、定相机、命中/拖动、画高亮。实体精灵经 resolveEntitySpriteId(actor⊕sprite),
 * 帧 = idleFrameIndex(SpriteDef.layout, facing)——与引擎同一套数据与公式,零漂移。
 */

import type { ActorDef, MapIndexV1, SceneDef, SpriteDef } from '@type-pal/content'
import { gridToPixel, pixelToGrid, resolveEntitySpriteId, spriteScreenY } from '@type-pal/content'
import type { AssetBase, ProjectMap, SpriteDraw } from '@type-pal/reforge'
import { idleFrameIndex, renderSceneFrame, spriteBlitRect } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'
import {
  drawGridBlocked,
  drawTriggerHighlight,
  mapBoxOf,
  type StageAssets,
  useSceneAssets,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'

const WORLD_SCALE = 4
const PAN_DRAG_THRESHOLD_PX = 3

export type Tool = 'select' | 'add'

export type SceneAnchorSelection = { kind: 'default' } | { kind: 'named'; id: string }

type HitTarget = { kind: 'entity'; id: string } | { kind: 'anchor'; anchor: SceneAnchorSelection }

interface HitRect {
  target: HitTarget
  x: number
  y: number
  w: number
  h: number
}
/** pointerdown 记录:被抓实体 + 抓取格偏移(实体格 − 光标格),供拖动时保持相对。 */
interface Down {
  target: HitTarget | null
  grabDcol: number
  grabDrow: number
  moved: boolean
}

interface Drag {
  target: HitTarget
  col: number
  row: number
}

function sameAnchor(
  left: SceneAnchorSelection | null | undefined,
  right: SceneAnchorSelection | null | undefined,
): boolean {
  if (!left || !right || left.kind !== right.kind) return false
  return left.kind === 'default' || (right.kind === 'named' && left.id === right.id)
}

export function SceneCanvas(props: {
  scene: SceneDef
  sprites: SpriteDef[]
  actorsById: Record<string, ActorDef>
  /** 进场点预览用的玩家精灵(party[0] → ActorDef.spriteId;App 解析)。 */
  leaderSpriteId: string | undefined
  assetBase: AssetBase
  /** 自有地图实时副本(键 = 稳定 map id);own 场景从此渲染(不落磁盘)。 */
  projectMaps: Record<string, ProjectMap>
  mapIndex: MapIndexV1
  /** tileset 注册表。 */
  tilesets: readonly import('@type-pal/reforge').TilesetDef[]
  /** 上传未保存的 tileset 字节(内存优先)。 */
  tilesetBlobs: Record<string, ArrayBuffer>
  selectedEntityId: string | null
  selectedAnchor?: SceneAnchorSelection | null
  tool: Tool
  /** 图层显隐(布置模式左栏开关):base 地板 / cover 高物 / entities 实体 / grid 网格 / blocked 禁入格。 */
  layers: {
    base: boolean
    cover: boolean
    entities: boolean
    grid: boolean
    blocked: boolean
    /** 默认落点与命名落点锚点。 */
    entries: boolean
    /** 显隐透视:初始隐藏实体画半透明幽灵(可点选编排;剧情后期才出场的 NPC 全靠它可见)。 */
    ghosts: boolean
  }
  onSelectEntity: (id: string) => void
  onMoveEntity: (id: string, cell: { col: number; row: number }) => void
  onSelectAnchor: (anchor: SceneAnchorSelection) => void
  onMoveAnchor: (anchor: SceneAnchorSelection, cell: { col: number; row: number }) => void
  onAddAt: (cell: { col: number; row: number }) => void
}) {
  const {
    scene,
    sprites,
    actorsById,
    leaderSpriteId,
    assetBase,
    projectMaps,
    mapIndex,
    tilesets,
    tilesetBlobs,
    selectedEntityId,
    selectedAnchor,
    tool,
    layers,
    onSelectEntity,
    onMoveEntity,
    onSelectAnchor,
    onMoveAnchor,
    onAddAt,
  } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const hitsRef = useRef<HitRect[]>([])
  const downRef = useRef<Down | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  // 共享层:容器自适应 + 视图态(缩放/平移,滚轮锚点缩放)—— 与预览/W7 同一套(scene-stage)
  const size = useStageSize(wrapRef)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef,
    initial: { zoom: WORLD_SCALE, panX: 0, panY: 0 },
  })
  const panDragRef = useRef<{
    sx: number
    sy: number
    panX: number
    panY: number
    moved: boolean
  } | null>(null)

  // 地图像素包围盒(菱形投影 AABB;room 缺省 = 整图)。
  const mapBox = (map: StageAssets['map']) => mapBoxOf(map, undefined)
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
        layers.entries ? leaderDef?.spriteNum : undefined,
        // 全量含 hidden:显隐透视要画幽灵 —— 曾 filter(!hidden) 致幽灵素材未载、画了个寂寞
        ...scene.entities.map((e) => entitySpriteDef(e)?.spriteNum),
      ].filter((n): n is number => n != null),
    ),
  ]
  // A4 自有上传精灵源(path 双轨 + 未保存字节内存优先)
  const spriteSources = new Map(
    sprites
      .filter((s) => s.path)
      .map((s) => [s.spriteNum, { path: s.path, blob: tilesetBlobs?.[s.path!] }] as const),
  )
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    mapId: scene.mapId,
    spriteNums,
    projectMaps,
    mapIndex,
    tilesets,
    tilesetBlobs,
    spriteSources,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: canvas 重绘由列出的状态触发；ref 与派生值始终读取当前值。
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!loaded || !ctx) return
    const { renderer, map, spritesByNum } = loaded

    // M2a:视窗可选 —— 缺省整张图(迁移场景无 room;demo 保留)。整图编辑:room 决定 tile
    // 遍历范围,相机(camera)= 用户平移,worldScale = 用户缩放(renderScene 不夹相机)。
    const room = { col: 0, row: 0, cols: map.width, rows: map.height }
    const { zoom, panX, panY } = viewRef.current
    const camera = { x: panX, y: panY }

    const anchorDefs = layers.entries
      ? [
          { selection: { kind: 'default' } as const, entry: scene.entry },
          ...Object.entries(scene.entries ?? {}).map(([id, entry]) => ({
            selection: { kind: 'named', id } as const,
            entry,
          })),
        ]
      : []
    const anchorCell = (
      selection: SceneAnchorSelection,
      base: SceneDef['entry'] | NonNullable<SceneDef['entries']>[string],
    ) =>
      drag?.target.kind === 'anchor' && sameAnchor(drag.target.anchor, selection)
        ? { ...base.pos, col: drag.col, row: drag.row }
        : base.pos

    const physRect = (
      wx: number,
      wy: number,
      ax: number,
      ay: number,
      fw: number,
      fh: number,
    ): Omit<HitRect, 'target'> => {
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
    let selectedZoneHit: HitRect | null = null

    for (const { selection, entry } of anchorDefs) {
      const cell = anchorCell(selection, entry)
      const point = gridToPixel(cell)
      hits.push({
        target: { kind: 'anchor', anchor: selection },
        x: (point.x - panX - 16) * zoom,
        y: (point.y - panY - 10) * zoom,
        w: 32 * zoom,
        h: 20 * zoom,
      })
    }

    // 默认落点额外画半透明玩家身高参照；命名落点只画轻量锚点，避免误认成实体。
    const defaultCell = anchorCell({ kind: 'default' }, scene.entry)
    const defaultPoint = gridToPixel(defaultCell)
    const ps = leaderDef ? spritesByNum.get(leaderDef.spriteNum) : undefined
    const pf = leaderDef
      ? (ps?.frames[idleFrameIndex(leaderDef.layout, scene.entry.facing)] ?? ps?.frames[0])
      : undefined
    if (layers.entries && ps && pf) {
      // 每帧自锚(sdlpal 按当前帧宽高 blit;引擎侧同款,防变尺寸帧组错位)
      draws.push({
        frame: pf,
        worldX: defaultPoint.x,
        worldY: spriteScreenY(defaultCell),
        anchorX: Math.floor(pf.width / 2),
        anchorY: pf.height,
        alpha: 0.55,
      })
      hits.push({
        target: { kind: 'anchor', anchor: { kind: 'default' } },
        ...physRect(
          defaultPoint.x,
          spriteScreenY(defaultCell),
          Math.floor(pf.width / 2),
          pf.height,
          pf.width,
          pf.height,
        ),
      })
    }
    // 各实体(站立帧 = layout × facing)+ 记命中盒;实体图层关 → 不画不可点
    for (const e of layers.entities ? scene.entities : []) {
      const ghost = e.hidden === true
      if (ghost && !layers.ghosts) continue // 透视关:同引擎不渲染
      const pos =
        drag?.target.kind === 'entity' && drag.target.id === e.id
          ? { ...e.pos, col: drag.col, row: drag.row }
          : e.pos
      if ('zone' in e) {
        if (e.id === selectedEntityId) {
          const p = gridToPixel(pos)
          selectedZoneHit = {
            target: { kind: 'entity', id: e.id },
            x: (p.x - panX - 16) * zoom,
            y: (p.y - panY - 8) * zoom,
            w: 32 * zoom,
            h: 16 * zoom,
          }
        }
        continue
      }
      const def = entitySpriteDef(e)
      const sp = def ? spritesByNum.get(def.spriteNum) : undefined
      const f = def
        ? (sp?.frames[idleFrameIndex(def.layout, e.facing ?? 'down')] ?? sp?.frames[0])
        : undefined
      if (!sp || !f) continue
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
        ...(ghost ? { alpha: 0.45 } : {}),
      })
      hits.push({
        target: { kind: 'entity', id: e.id },
        ...physRect(p.x, wy, ax, ay, f.width, f.height),
      })
    }
    if (selectedZoneHit) hits.push(selectedZoneHit)
    hitsRef.current = hits

    renderSceneFrame(ctx, renderer, {
      map,
      room,
      camera,
      sprites: draws,
      worldScale: zoom,
      layers: {
        hiddenLayerIds: [
          ...(!layers.base && map.layers[0] ? [map.layers[0].id] : []),
          ...(!layers.cover ? map.layers.slice(1).map((layer) => layer.id) : []),
        ],
      },
    })

    // 叠加层:网格/禁入(共享层;预览/W7 同一套)
    drawGridBlocked(
      ctx,
      map,
      room,
      { zoom, panX, panY },
      {
        grid: layers.grid,
        blocked: layers.blocked,
      },
    )
    const selectedZoneBase = scene.entities.find((e) => e.id === selectedEntityId && 'zone' in e)
    const selectedZone =
      selectedZoneBase && drag?.target.kind === 'entity' && drag.target.id === selectedZoneBase.id
        ? {
            ...selectedZoneBase,
            pos: { ...selectedZoneBase.pos, col: drag.col, row: drag.row },
          }
        : selectedZoneBase
    if (layers.entities && selectedZone && (!selectedZone.hidden || layers.ghosts)) {
      drawTriggerHighlight(ctx, selectedZone, camera, zoom, performance.now(), {
        ghost: selectedZone.hidden === true,
        ownerDashed: true,
      })
    }
    // 空间锚点叠加层：默认落点为实线金菱形，命名落点为较小的蓝色虚线菱形。
    for (const { selection, entry } of anchorDefs) {
      const point = gridToPixel(anchorCell(selection, entry))
      const sx = (point.x - panX) * zoom
      const sy = (point.y - panY) * zoom
      const named = selection.kind === 'named'
      const selected = sameAnchor(selectedAnchor, selection)
      const halfWidth = (named ? 11 : 16) * zoom
      const halfHeight = (named ? 6 : 8) * zoom
      ctx.save()
      ctx.strokeStyle = selected
        ? 'rgba(255, 244, 200, 1)'
        : named
          ? 'rgba(93, 195, 255, 0.95)'
          : 'rgba(255, 214, 90, 0.95)'
      ctx.fillStyle = selected
        ? 'rgba(255, 214, 90, 0.2)'
        : named
          ? 'rgba(93, 195, 255, 0.12)'
          : 'rgba(255, 214, 90, 0.1)'
      ctx.lineWidth = selected ? 3 : named ? 1.5 : 2
      if (named) ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(sx, sy - halfHeight)
      ctx.lineTo(sx + halfWidth, sy)
      ctx.lineTo(sx, sy + halfHeight)
      ctx.lineTo(sx - halfWidth, sy)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      const ARROW: Record<string, [number, number]> = {
        up: [16, -8],
        down: [-16, 8],
        left: [-16, -8],
        right: [16, 8],
      }
      if (entry.facing) {
        const [adx, ady] = ARROW[entry.facing] ?? [0, 8]
        ctx.setLineDash([])
        ctx.strokeStyle = selected
          ? 'rgba(255, 244, 200, 1)'
          : named
            ? 'rgba(145, 218, 255, 0.9)'
            : 'rgba(255, 235, 170, 0.9)'
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + adx * zoom * 0.8, sy + ady * zoom * 0.8)
        ctx.stroke()
      }
      if (selected) {
        const label =
          selection.kind === 'default'
            ? '默认落点'
            : ('label' in entry && entry.label) || selection.id
        ctx.setLineDash([])
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif'
        const width = ctx.measureText(label).width + 10
        const labelX = sx - width / 2
        const labelY = sy - halfHeight - 22
        ctx.fillStyle = 'rgba(13, 17, 25, 0.88)'
        ctx.fillRect(labelX, labelY, width, 18)
        ctx.fillStyle = '#f5f7fb'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, sx, labelY + 9)
      }
      ctx.restore()
    }

    const sel = selectedZone
      ? undefined
      : hits.find((hit) => hit.target.kind === 'entity' && hit.target.id === selectedEntityId)
    if (sel) {
      ctx.save()
      ctx.strokeStyle = '#4c9aff'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(sel.x - 2, sel.y - 2, sel.w + 4, sel.h + 4)
      ctx.restore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    status,
    scene,
    selectedEntityId,
    selectedAnchor,
    drag,
    actorsById,
    leaderSpriteId,
    view,
    size,
    layers,
    tilesets,
  ])

  // —— 坐标 + 命中 ——（画布像素 = CSS 像素 1:1;world = screen/zoom + pan）
  const screenToCell = (clientX: number, clientY: number): { col: number; row: number } => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const sx = (clientX - r.left) * (canvas.width / r.width)
    const sy = (clientY - r.top) * (canvas.height / r.height)
    const { zoom, panX, panY } = viewRef.current
    return pixelToGrid(sx / zoom + panX, sy / zoom + panY)
  }
  const targetAt = (clientX: number, clientY: number): HitTarget | null => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const cx = ((clientX - r.left) / r.width) * canvas.width
    const cy = ((clientY - r.top) / r.height) * canvas.height
    let target: HitTarget | null = null
    for (const h of hitsRef.current) {
      if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) target = h.target // 取最上(后者覆盖)
    }
    return target
  }

  // —— 指针交互 ——
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (tool === 'add') {
      downRef.current = { target: null, grabDcol: 0, grabDrow: 0, moved: false }
      return
    }
    // select 工具
    const hit = targetAt(e.clientX, e.clientY)
    if (hit?.kind === 'anchor') {
      pickFromCanvasRef.current = true
      onSelectAnchor(hit.anchor)
      const cell = screenToCell(e.clientX, e.clientY)
      const entry = hit.anchor.kind === 'default' ? scene.entry : scene.entries?.[hit.anchor.id]
      if (!entry) return
      downRef.current = {
        target: hit,
        grabDcol: entry.pos.col - cell.col,
        grabDrow: entry.pos.row - cell.row,
        moved: false,
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* 边缘指针忽略 */
      }
      return
    }
    if (hit?.kind === 'entity') {
      pickFromCanvasRef.current = true // 画布点选:用户已看到它,选中定位不动镜头
      onSelectEntity(hit.id)
      const ent = scene.entities.find((x) => x.id === hit.id)
      const cell = screenToCell(e.clientX, e.clientY)
      downRef.current = {
        target: hit,
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
      // 空白只负责平移,不改变选中;场景节点必须在左树显式点选。
      downRef.current = null
      panDragRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        panX: viewRef.current.panX,
        panY: viewRef.current.panY,
        moved: false,
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
      const dx = e.clientX - pd.sx
      const dy = e.clientY - pd.sy
      if (!pd.moved) {
        if (dx * dx + dy * dy < PAN_DRAG_THRESHOLD_PX * PAN_DRAG_THRESHOLD_PX) return
        pd.moved = true
      }
      const { zoom } = viewRef.current
      setView((v) => ({
        ...v,
        panX: pd.panX - dx / zoom,
        panY: pd.panY - dy / zoom,
      }))
      return
    }
    const d = downRef.current
    if (!d?.target) return
    const cell = screenToCell(e.clientX, e.clientY)
    d.moved = true
    setDrag({
      target: d.target,
      col: cell.col + d.grabDcol,
      row: cell.row + d.grabDrow,
    })
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
    if (d?.target && d.moved && drag) {
      if (d.target.kind === 'anchor')
        onMoveAnchor(d.target.anchor, { col: drag.col, row: drag.row })
      else onMoveEntity(d.target.id, { col: drag.col, row: drag.row })
    }
    setDrag(null)
  }

  // 选中即定位(仅左树/外部点选;画布点选不动镜头):不在视野内 **或缩放小到看不清** →
  // 平移居中 + 提到 ≥1.5×。隐藏实体多停在房间外虚空(原版把待出场 NPC 藏场景外),
  // 没有这条根本找不到它们(作者:不能直观在地图上看到)。
  const pickFromCanvasRef = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在外部选中变化时定位，视口或尺寸变化不能抢回用户镜头。
  useEffect(() => {
    const fromCanvas = pickFromCanvasRef.current
    pickFromCanvasRef.current = false
    if (fromCanvas) return
    const selectedPos = selectedEntityId
      ? scene.entities.find((entity) => entity.id === selectedEntityId)?.pos
      : selectedAnchor?.kind === 'default'
        ? scene.entry.pos
        : selectedAnchor?.kind === 'named'
          ? scene.entries?.[selectedAnchor.id]?.pos
          : undefined
    if (!selectedPos) return
    const p = gridToPixel(selectedPos)
    const { zoom, panX, panY } = viewRef.current
    const vw = size.w / zoom
    const vh = size.h / zoom
    const inView =
      p.x > panX + vw * 0.08 &&
      p.x < panX + vw * 0.92 &&
      p.y > panY + vh * 0.08 &&
      p.y < panY + vh * 0.92
    if (!inView || zoom < 1.5) {
      const nz = Math.max(zoom, 1.5)
      setView({ zoom: nz, panX: p.x - size.w / nz / 2, panY: p.y - size.h / nz / 2 })
    }
  }, [selectedEntityId, selectedAnchor])

  // fit 整图:首次就绪 / 切场景 / 容器尺寸变 → 重新 fit(用户缩放平移不触发)。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 场景和容器尺寸是刻意的 fit 触发器，ref 读取当前载入结果。
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    if (loaded) fitView(loaded.map)
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
