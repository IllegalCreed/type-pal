import { guijieMinjuScene } from '@type-pal/content'
import { loadPalette, loadTileset, loadTilemap } from './assets.js'
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

  // 整图尺寸：width*32 × height*16，四周留 32 边距（防 lower 子行 -16/-8 越界）。
  canvas.width = map.width * TILE_W + MARGIN * 2
  canvas.height = map.height * TILE_H + MARGIN * 2

  const renderer = new Canvas2DRenderer(ctx, palette, tiles)
  renderer.clear()
  renderer.renderTilemap(map, { x: -MARGIN, y: -MARGIN })

  console.log(
    `[reforge] map ${mapNum} ${map.width}x${map.height} cells, tileset ${tiles.size} frames, palette ${PALETTE_ID}`,
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
