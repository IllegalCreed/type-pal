/**
 * 场景画布(B1.1)——复用 reforge 的 renderSceneFrame 把场景真渲染出来。
 *
 * 复用不重写:tilemap/tileset/palette/sprite 加载 + Canvas2DRenderer + renderSceneFrame 全来自
 * @type-pal/reforge;编辑器只负责「按当前 EditorState 组 SpriteDraw[] + 定相机 + 调它画」。
 * 相机/常量复刻自 reforge main.ts(让编辑器画面与游戏一致)。
 *
 * B1.1 只渲染(静态);选中/拖动/叠加层留 B1.2+。
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

// 复刻自 reforge main.ts(D16 + 相机)。
const TILE_W = 32
const TILE_H = 16
const WORLD_SCALE = 4
const VIEW_W = 320
const VIEW_H = 200
const PARTY_OX = 160
const PARTY_OY = 112
const WALK_FRAMES = 3
const FACING_TO_DIR: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }
// 进场点预览用玩家精灵号 2(同 main.ts;TODO 待 CharacterTemplate.sprite)。
const PLAYER_SPRITE_NUM = 2

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

interface Loaded {
  renderer: Canvas2DRenderer
  map: Awaited<ReturnType<typeof loadTilemap>>
  spritesByNum: Map<number, LoadedSprite>
}

export function SceneCanvas(props: {
  scene: SceneDef
  sprites: SpriteDef[]
  assetBase: AssetBase
}): React.JSX.Element {
  const { scene, sprites, assetBase } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadedRef = useRef<Loaded | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')

  const mapNum = scene.map.reuseOriginalMap
  const paletteId = scene.paletteId ?? 0
  const spriteById = new Map(sprites.map((s) => [s.id, s]))
  // 需加载的精灵号:进场点玩家(2)+ 各实体解析出的精灵号。
  const spriteNums = [
    ...new Set([
      PLAYER_SPRITE_NUM,
      ...scene.entities
        .map((e) => spriteById.get(e.sprite)?.spriteNum)
        .filter((n): n is number => n != null),
    ]),
  ]
  const spriteNumsKey = spriteNums.join(',')

  // 载资产 + 建 renderer(map/palette/精灵集变了才重跑;换调色板须重建 renderer——它按 palette 缓存烤图)。
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
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
        const spriteEntries = await Promise.all(
          spriteNums.map(async (n) => [n, await loadSprite(assetBase, n)] as const),
        )
        if (!alive) return
        loadedRef.current = {
          renderer: new Canvas2DRenderer(ctx, palette, tiles),
          map,
          spritesByNum: new Map(spriteEntries),
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

  // 渲染:按当前 scene(实体/进场点)组 SpriteDraw[] + 定相机 + renderSceneFrame。scene 变(编辑)→ 重画。
  useEffect(() => {
    if (status !== 'ready') return
    const loaded = loadedRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (!loaded || !ctx) return
    const { renderer, map, spritesByNum } = loaded

    const draws: SpriteDraw[] = []
    // 进场点预览(玩家精灵,按 entry.facing 取 idle 帧)
    const ps = spritesByNum.get(PLAYER_SPRITE_NUM)
    const pf = ps?.frames[FACING_TO_DIR[scene.entry.facing] * WALK_FRAMES] ?? ps?.frames[0]
    if (ps && pf) {
      const p = gridToPixel(scene.entry.pos)
      draws.push({ frame: pf, worldX: p.x, worldY: spriteScreenY(scene.entry.pos), anchorX: ps.anchorX, anchorY: ps.anchorY })
    }
    // 各实体(idle 帧 0;实体无 facing)
    for (const e of scene.entities) {
      const num = spriteById.get(e.sprite)?.spriteNum
      const sp = num != null ? spritesByNum.get(num) : undefined
      const f = sp?.frames[0]
      if (sp && f) {
        const p = gridToPixel(e.pos)
        draws.push({ frame: f, worldX: p.x, worldY: spriteScreenY(e.pos), anchorX: sp.anchorX, anchorY: sp.anchorY })
      }
    }

    // 相机:居中进场点,夹到房间包围盒(复刻 main.ts updateCamera)。
    const room = scene.map.room
    const roomMinX = room.col * TILE_W - TILE_W
    const roomMinY = room.row * TILE_H - 40
    const roomMaxX = (room.col + room.cols) * TILE_W + TILE_W
    const roomMaxY = (room.row + room.rows) * TILE_H + 16
    const pp = gridToPixel(scene.entry.pos)
    const camera = {
      x: clamp(pp.x - PARTY_OX, roomMinX, Math.max(roomMinX, roomMaxX - VIEW_W)),
      y: clamp(pp.y - PARTY_OY, roomMinY, Math.max(roomMinY, roomMaxY - VIEW_H)),
    }
    renderSceneFrame(ctx, renderer, { map, room, camera, sprites: draws, worldScale: WORLD_SCALE })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scene])

  return (
    <div className="viewport">
      <div className="canvas-note">场景画布 · 复用 reforge 渲染{status === 'loading' ? ' · 载入中…' : ''}</div>
      {status === 'error' && <div className="boot"><div className="err">场景渲染失败: {err}</div></div>}
      <canvas ref={canvasRef} width={VIEW_W * WORLD_SCALE} height={VIEW_H * WORLD_SCALE} />
    </div>
  )
}
