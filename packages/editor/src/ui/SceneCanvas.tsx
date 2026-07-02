/**
 * 场景画布 —— 复用 reforge 的 renderSceneFrame。
 * B1.1 渲染 · B1.2 点选/高亮 · B1.3 拖动移位 + 添加放置 · C0 actor/布局数据化。
 *
 * 复用不重写:渲染器/资产加载/帧下标(sprite-anim)全来自 @type-pal/reforge;编辑器只组
 * SpriteDraw[]、定相机、命中/拖动、画高亮。实体精灵经 resolveEntitySpriteId(actor⊕sprite),
 * 帧 = idleFrameIndex(SpriteDef.layout, facing)——与引擎同一套数据与公式,零漂移。
 */
import { useEffect, useRef, useState } from 'react'
import {
  Canvas2DRenderer,
  idleFrameIndex,
  loadPalette,
  loadSprite,
  loadTileset,
  loadTilemap,
  renderSceneFrame,
} from '@type-pal/reforge'
import type { AssetBase, LoadedSprite, SpriteDraw } from '@type-pal/reforge'
import { gridToPixel, pixelToGrid, resolveEntitySpriteId, spriteScreenY } from '@type-pal/content'
import type { ActorDef, SceneDef, SpriteDef } from '@type-pal/content'

const TILE_W = 32
const TILE_H = 16
const WORLD_SCALE = 4
const VIEW_W = 320
const VIEW_H = 200
const PARTY_OX = 160
const PARTY_OY = 112

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
    onSelect,
    onMoveEntity,
    onAddAt,
  } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadedRef = useRef<Loaded | null>(null)
  const hitsRef = useRef<HitRect[]>([])
  const cameraRef = useRef({ x: 0, y: 0 })
  const downRef = useRef<Down | null>(null)
  const [drag, setDrag] = useState<{ id: string; col: number; row: number } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')

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
      [leaderDef?.spriteNum, ...scene.entities.map((e) => entitySpriteDef(e)?.spriteNum)].filter(
        (n): n is number => n != null,
      ),
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
        const entries = await Promise.all(spriteNums.map(async (n) => [n, await loadSprite(assetBase, n)] as const))
        if (!alive) return
        loadedRef.current = { renderer: new Canvas2DRenderer(ctx, palette, tiles), map, spritesByNum: new Map(entries) }
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

    const room = scene.map.room
    const roomMinX = room.col * TILE_W - TILE_W
    const roomMinY = room.row * TILE_H - 40
    const roomMaxX = (room.col + room.cols) * TILE_W + TILE_W
    const roomMaxY = (room.row + room.rows) * TILE_H + 16
    const ep = gridToPixel(scene.entry.pos)
    const camera = {
      x: clamp(ep.x - PARTY_OX, roomMinX, Math.max(roomMinX, roomMaxX - VIEW_W)),
      y: clamp(ep.y - PARTY_OY, roomMinY, Math.max(roomMinY, roomMaxY - VIEW_H)),
    }
    cameraRef.current = camera

    const physRect = (wx: number, wy: number, ax: number, ay: number, fw: number, fh: number): Omit<HitRect, 'id'> => ({
      x: (wx - ax - camera.x) * WORLD_SCALE,
      y: (wy - ay - camera.y) * WORLD_SCALE,
      w: fw * WORLD_SCALE,
      h: fh * WORLD_SCALE,
    })

    const draws: SpriteDraw[] = []
    const hits: HitRect[] = []
    // 进场点预览(玩家精灵,按 entry.facing 取站立帧;帧下标 = 引擎同款 idleFrameIndex)
    const ps = leaderDef ? spritesByNum.get(leaderDef.spriteNum) : undefined
    const pf = leaderDef
      ? (ps?.frames[idleFrameIndex(leaderDef.layout, scene.entry.facing)] ?? ps?.frames[0])
      : undefined
    if (ps && pf) {
      draws.push({ frame: pf, worldX: ep.x, worldY: spriteScreenY(scene.entry.pos), anchorX: ps.anchorX, anchorY: ps.anchorY })
    }
    // 各实体(站立帧 = layout × facing)+ 记命中盒
    for (const e of scene.entities) {
      const def = entitySpriteDef(e)
      const sp = def ? spritesByNum.get(def.spriteNum) : undefined
      const f = def ? (sp?.frames[idleFrameIndex(def.layout, e.facing ?? 'down')] ?? sp?.frames[0]) : undefined
      if (!sp || !f) continue
      // 拖动中的实体用预览格
      const pos = drag && drag.id === e.id ? { col: drag.col, row: drag.row, height: e.pos.height } : e.pos
      const p = gridToPixel(pos)
      const wy = spriteScreenY(pos)
      draws.push({ frame: f, worldX: p.x, worldY: wy, anchorX: sp.anchorX, anchorY: sp.anchorY })
      hits.push({ id: e.id, ...physRect(p.x, wy, sp.anchorX, sp.anchorY, f.width, f.height) })
    }
    hitsRef.current = hits

    renderSceneFrame(ctx, renderer, { map, room, camera, sprites: draws, worldScale: WORLD_SCALE })

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
  }, [status, scene, selectedId, drag, actorsById, leaderSpriteId])

  // —— 坐标 + 命中 ——
  const screenToCell = (clientX: number, clientY: number): { col: number; row: number } => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const cx = ((clientX - r.left) / r.width) * canvas.width
    const cy = ((clientY - r.top) / r.height) * canvas.height
    return pixelToGrid(cx / WORLD_SCALE + cameraRef.current.x, cy / WORLD_SCALE + cameraRef.current.y)
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
      downRef.current = null
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const d = downRef.current
    if (!d || !d.entityId) return
    const cell = screenToCell(e.clientX, e.clientY)
    d.moved = true
    setDrag({ id: d.entityId, col: cell.col + d.grabDcol, row: cell.row + d.grabDrow })
  }
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const d = downRef.current
    downRef.current = null
    if (tool === 'add') {
      onAddAt(screenToCell(e.clientX, e.clientY))
      return
    }
    if (d?.entityId && d.moved && drag) onMoveEntity(d.entityId, { col: drag.col, row: drag.row })
    setDrag(null)
  }

  return (
    <div className="viewport">
      <div className="canvas-note">场景画布 · 复用 reforge 渲染{status === 'loading' ? ' · 载入中…' : ''}</div>
      {status === 'error' && <div className="boot"><div className="err">场景渲染失败: {err}</div></div>}
      <canvas
        ref={canvasRef}
        width={VIEW_W * WORLD_SCALE}
        height={VIEW_H * WORLD_SCALE}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: tool === 'add' ? 'crosshair' : 'pointer', touchAction: 'none' }}
      />
    </div>
  )
}
