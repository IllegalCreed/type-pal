import { guijieMinjuScene } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { type LoadedSprite, loadPalette, loadSprite, loadTileset, loadTilemap } from './assets.js'
import { buildIsBlocked } from './collision.js'
import { Keyboard } from './input.js'
import { resolveMove } from './movement.js'
import { Canvas2DRenderer } from './render.js'

// 切片 1 · 第一步：把真实 map 56（黑水镇民居）整张渲染出来，看清里头几间民居、挑一间。
// 下一步：定裁剪矩形（只取一间）+ 放李逍遥/鬼 + 走路/对话。
const TILE_W = 32
const TILE_H = 16
const MARGIN = 32

const canvas = document.getElementById('screen') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

const mapNum = guijieMinjuScene.map.reuseOriginalMap // 56

// 调色板编号由 scene 进入脚本 setPalette 决定，demo 未跑脚本 → 先试 0；颜色不对再换号。
const PALETTE_ID = Number(new URLSearchParams(location.search).get('pal') ?? 0)

async function main(): Promise<void> {
  const [map, tiles, palette] = await Promise.all([
    loadTilemap(mapNum),
    loadTileset(mapNum),
    loadPalette(PALETTE_ID),
  ])

  // 调试：?gallery 渲染精灵速查图（确认哪个 spriteNum 是人/物），不进场景。
  if (new URLSearchParams(location.search).has('gallery')) {
    await renderSpriteGallery(palette)
    return
  }

  // 切片：只取 room#0（黑水镇民居其中一间）。camera 聚焦该房，canvas 仅这一间大小。
  const room = guijieMinjuScene.map.room
  const TOP_PAD = 56 // 上方多留，容纳画在格子上方的高家具
  const camX = room.col * TILE_W - TILE_W
  const camY = room.row * TILE_H - TOP_PAD
  canvas.width = room.cols * TILE_W + TILE_W * 2
  canvas.height = room.rows * TILE_H + TOP_PAD + MARGIN

  const renderer = new Canvas2DRenderer(ctx, palette, tiles)
  const camera = { x: camX, y: camY }

  // 精灵：李逍遥 = 原版 spriteNum 2；鬼 = 占位 sprite 16（原版一老者，比箱子像样；鬼气化留后续 polish）。
  const [playerSprite, ghostSprite] = await Promise.all([loadSprite(2), loadSprite(16)])
  const ghost = guijieMinjuScene.entities[0]!
  const player = { pos: { ...guijieMinjuScene.entry.pos } }

  function render(): void {
    renderer.clear()
    renderer.renderTilemapLayer(map, 0, camera, room) // 地 / 墙基（精灵之下）
    // 精灵按脚下 y 排序：远（y 小）的先画
    const sprites = [
      { s: ghostSprite, x: ghost.pos.x, y: ghost.pos.y },
      { s: playerSprite, x: player.pos.x, y: player.pos.y },
    ].sort((a, b) => a.y - b.y)
    for (const sp of sprites) {
      const f = sp.s.frames[0]
      if (f) renderer.drawSprite(f, sp.x, sp.y, sp.s.anchorX, sp.s.anchorY, camera)
    }
    renderer.renderTilemapLayer(map, 1, camera, room) // 家具上沿 / 门（盖在精灵上 = 遮挡）
  }
  // 移动：键盘 → 意图 → resolveMove(注入碰撞) → 结果。相机固定（整间屋上屏）。
  const isBlocked = buildIsBlocked(map, room)
  const keyboard = new Keyboard()
  const SPEED = 2

  // 调试 / 验证：暴露活动态
  ;(window as unknown as { __reforge?: unknown }).__reforge = { player, ghost, room }

  function tick(): void {
    let dx = 0
    let dy = 0
    if (keyboard.isDown('ArrowRight')) dx += SPEED
    if (keyboard.isDown('ArrowLeft')) dx -= SPEED
    if (keyboard.isDown('ArrowDown')) dy += SPEED
    if (keyboard.isDown('ArrowUp')) dy -= SPEED
    if (dx !== 0 || dy !== 0) {
      player.pos = resolveMove(player.pos, { dx, dy }, isBlocked)
    }
    render()
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  console.log('[reforge] room#0 可玩：方向键移动 + 撞墙（资源全复用原版）')
}

/** 调试速查：把 spriteNum 0..47 的第 0 帧排成网格 + 标号，肉眼分辨人 / 物。 */
async function renderSpriteGallery(palette: Palette): Promise<void> {
  const COLS = 8
  const CELL = 80
  const MAX = 47
  canvas.width = COLS * CELL
  canvas.height = (Math.floor(MAX / COLS) + 1) * CELL
  const renderer = new Canvas2DRenderer(ctx, palette, new Map())
  renderer.clear()
  for (let id = 0; id <= MAX; id++) {
    let sp: LoadedSprite | undefined
    try {
      sp = await loadSprite(id)
    } catch {
      sp = undefined
    }
    const col = id % COLS
    const rowI = Math.floor(id / COLS)
    ctx.fillStyle = '#7a9'
    ctx.font = '10px monospace'
    ctx.fillText(String(id), col * CELL + 4, rowI * CELL + 12)
    const f = sp?.frames[0]
    if (f) renderer.drawSprite(f, col * CELL + CELL / 2, rowI * CELL + CELL - 14, sp!.anchorX, sp!.anchorY, { x: 0, y: 0 })
  }
  console.log('[reforge] sprite gallery 0..47 rendered')
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e)
  ctx.fillStyle = '#200'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f55'
  ctx.font = '12px monospace'
  ctx.fillText('reforge ERR: ' + msg, 10, 24)
  console.error('[reforge]', e)
})
