/**
 * 场景画布(B1.1 渲染 + B1.2 点选/高亮)——复用 reforge 的 renderSceneFrame。
 *
 * 复用不重写:tilemap/tileset/palette/sprite 加载 + Canvas2DRenderer + renderSceneFrame 全来自
 * @type-pal/reforge;编辑器只负责组 SpriteDraw[]、定相机、点选命中、画选中高亮。
 * 相机/常量复刻自 reforge main.ts(画面与游戏一致)。
 *
 * 点选 = 精灵包围盒命中(点可见精灵即选中,比"点脚下格子"直观);坐标 屏幕→物理→世界→格。
 */
import { useEffect, useRef, useState } from 'react'
import {
  Canvas2DRenderer,
  loadPalette,
  loadSprite,
  loadTileset,
  loadTilemap,
  renderSceneFrame,
} from '@type-pal/reforge'
import type { AssetBase, LoadedSprite, SpriteDraw } from '@type-pal/reforge'
import { gridToPixel, spriteScreenY } from '@type-pal/content'
import type { Facing, SceneDef, SpriteDef } from '@type-pal/content'

const TILE_W = 32
const TILE_H = 16
const WORLD_SCALE = 4
const VIEW_W = 320
const VIEW_H = 200
const PARTY_OX = 160
const PARTY_OY = 112
const WALK_FRAMES = 3
const FACING_TO_DIR: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }
const PLAYER_SPRITE_NUM = 2 // 进场点预览(同 main.ts;TODO 待 CharacterTemplate.sprite)

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

interface Loaded {
  renderer: Canvas2DRenderer
  map: Awaited<ReturnType<typeof loadTilemap>>
  spritesByNum: Map<number, LoadedSprite>
}
/** 实体在物理 canvas 上的精灵包围盒(点选/高亮用)。 */
interface HitRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export function SceneCanvas(props: {
  scene: SceneDef
  sprites: SpriteDef[]
  assetBase: AssetBase
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { scene, sprites, assetBase, selectedId, onSelect } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadedRef = useRef<Loaded | null>(null)
  const hitsRef = useRef<HitRect[]>([]) // 每次渲染刷新;点选命中读它
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')

  const mapNum = scene.map.reuseOriginalMap
  const paletteId = scene.paletteId ?? 0
  const spriteById = new Map(sprites.map((s) => [s.id, s]))
  const spriteNums = [
    ...new Set([
      PLAYER_SPRITE_NUM,
      ...scene.entities.map((e) => spriteById.get(e.sprite)?.spriteNum).filter((n): n is number => n != null),
    ]),
  ]
  const spriteNumsKey = spriteNums.join(',')

  // 载资产 + 建 renderer(map/palette/精灵集变了才重跑)。
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

  // 渲染 + 刷新命中盒 + 画选中高亮。scene/selectedId 变即重画。
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!loaded || !ctx) return
    const { renderer, map, spritesByNum } = loaded

    // 相机:居中进场点,夹房间包围盒(复刻 main.ts updateCamera)。
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

    // 物理屏幕矩形(逻辑 → ×WORLD_SCALE)。
    const rect = (worldX: number, worldY: number, anchorX: number, anchorY: number, f: { width: number; height: number }): HitRect => ({
      id: '',
      x: (worldX - anchorX - camera.x) * WORLD_SCALE,
      y: (worldY - anchorY - camera.y) * WORLD_SCALE,
      w: f.width * WORLD_SCALE,
      h: f.height * WORLD_SCALE,
    })

    const draws: SpriteDraw[] = []
    const hits: HitRect[] = []
    // 进场点预览(玩家精灵,不可点选)
    const ps = spritesByNum.get(PLAYER_SPRITE_NUM)
    const pf = ps?.frames[FACING_TO_DIR[scene.entry.facing] * WALK_FRAMES] ?? ps?.frames[0]
    if (ps && pf) {
      draws.push({ frame: pf, worldX: ep.x, worldY: spriteScreenY(scene.entry.pos), anchorX: ps.anchorX, anchorY: ps.anchorY })
    }
    // 各实体(idle 帧 0)+ 记命中盒
    for (const e of scene.entities) {
      const num = spriteById.get(e.sprite)?.spriteNum
      const sp = num != null ? spritesByNum.get(num) : undefined
      const f = sp?.frames[0]
      if (!sp || !f) continue
      const p = gridToPixel(e.pos)
      const wy = spriteScreenY(e.pos)
      draws.push({ frame: f, worldX: p.x, worldY: wy, anchorX: sp.anchorX, anchorY: sp.anchorY })
      hits.push({ ...rect(p.x, wy, sp.anchorX, sp.anchorY, f), id: e.id })
    }
    hitsRef.current = hits

    renderSceneFrame(ctx, renderer, { map, room, camera, sprites: draws, worldScale: WORLD_SCALE })

    // 选中高亮:renderSceneFrame 已 restore,这里在物理坐标画虚线框(叠在最上)。
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
  }, [status, scene, selectedId])

  // 点选:屏幕坐标 → 物理 canvas 坐标 → 命中盒(取最上/最后一个命中)。
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const cx = ((e.clientX - r.left) / r.width) * canvas.width
    const cy = ((e.clientY - r.top) / r.height) * canvas.height
    let hitId: string | null = null
    for (const h of hitsRef.current) {
      if (cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h) hitId = h.id // 后者覆盖前者=取最上
    }
    onSelect(hitId)
  }

  return (
    <div className="viewport">
      <div className="canvas-note">场景画布 · 复用 reforge 渲染{status === 'loading' ? ' · 载入中…' : ''}</div>
      {status === 'error' && <div className="boot"><div className="err">场景渲染失败: {err}</div></div>}
      <canvas ref={canvasRef} width={VIEW_W * WORLD_SCALE} height={VIEW_H * WORLD_SCALE} onClick={handleClick} style={{ cursor: 'pointer' }} />
    </div>
  )
}
