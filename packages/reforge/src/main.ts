import { guijieMinjuScene } from '@type-pal/content'
import { loadPalette, loadSprite, loadTileset, loadTilemap } from './assets.js'
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

  // 切片：只取 room#0（黑水镇民居其中一间）。camera 聚焦该房，canvas 仅这一间大小。
  const room = guijieMinjuScene.map.room
  const TOP_PAD = 56 // 上方多留，容纳画在格子上方的高家具
  const camX = room.col * TILE_W - TILE_W
  const camY = room.row * TILE_H - TOP_PAD
  canvas.width = room.cols * TILE_W + TILE_W * 2
  canvas.height = room.rows * TILE_H + TOP_PAD + MARGIN

  const renderer = new Canvas2DRenderer(ctx, palette, tiles)
  const camera = { x: camX, y: camY }

  // 精灵：李逍遥 = 原版 spriteNum 2；鬼 = 占位 sprite 10（黑水镇村民）。
  const [playerSprite, ghostSprite] = await Promise.all([loadSprite(2), loadSprite(10)])
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
  render()

  console.log(
    `[reforge] room#0 + sprites: 李逍遥@${player.pos.x},${player.pos.y} 鬼@${ghost.pos.x},${ghost.pos.y}`,
  )
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
