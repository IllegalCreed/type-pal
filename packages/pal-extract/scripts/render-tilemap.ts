/**
 * Debug 工具:把 scene 1 整张 tilemap(64×128 cells, 2 layers × 2 sub-rows each)
 * 拼成 PNG。用我们 game/draw-tilemap.ts 的同一套渲染规则,作为 D29 流程里
 * "我们的渲染输出"那一侧 —— M3 sdlpal headless map dumper 写出来后跟这张
 * 像素 diff。
 *
 * 跑法(repo 根):pnpm -F @type-pal/pal-extract render-tilemap
 * 产物:build/scene-1-full.png (2064×2056)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const HERE = dirname(fileURLToPath(import.meta.url))
// scripts/ → packages/pal-extract/ → packages/ → repo root
const REPO_ROOT = resolve(HERE, '../../..')
const DATA = resolve(REPO_ROOT, 'data/extracted')
const OUT_DIR = resolve(REPO_ROOT, 'build')
const OUT_PATH = resolve(OUT_DIR, 'scene-1-full.png')

const TILE_W = 32
const TILE_H = 16
const TILE_HALF_W = 16
// sdlpal map.c:398-414 真实公式:每 row 步进 16 px(2 个 h sub-row 各 +8)
const ROW_Y_STEP = TILE_H
const SUBROW_Y_STEP = TILE_H / 2

interface Cell { lower: number; upper: number }
interface Tilemap { width: number; height: number; cells: Cell[][]; tilesetFiles: string[] }
interface TileImage { width: number; height: number; indices: Uint8Array }

function loadTilePng(filename: string): TileImage {
  const buf = readFileSync(resolve(DATA, 'images', filename))
  const png = PNG.sync.read(buf)
  const indices = new Uint8Array(png.width * png.height)
  for (let i = 0; i < indices.length; i++) {
    indices[i] = png.data[i * 4]!
  }
  return { width: png.width, height: png.height, indices }
}

/** sdlpal map.c:249 —— layer 0 tile id 从 d 低 16 bit 提取(9-bit 隔位拼接) */
function layer0Id(d: number): number {
  return (d & 0xff) | ((d >> 4) & 0x100)
}

/** sdlpal map.c:256 —— layer 1 tile id 从 d 高 16 bit 提取,再 -1。0 → -1 表示无顶层 tile。 */
function layer1Id(d: number): number {
  const hi = d >>> 16
  return ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1
}

function main(): void {
  console.log('[render-tilemap] loading tilemap-1.json...')
  const tilemap = JSON.parse(
    readFileSync(resolve(DATA, 'data/tilemap-1.json'), 'utf-8'),
  ) as Tilemap
  console.log(`[render-tilemap] ${tilemap.width}×${tilemap.height} cells, ${tilemap.tilesetFiles.length} tile PNGs`)

  const palette = JSON.parse(
    readFileSync(resolve(DATA, 'data/palette-0.json'), 'utf-8'),
  ) as { colors: [number, number, number][] }

  const tileImages = new Map<number, TileImage>()
  for (const fname of tilemap.tilesetFiles) {
    const m = /tile-scene-\d+-(\d+)\.png/.exec(fname)
    if (!m) continue
    tileImages.set(Number(m[1]), loadTilePng(fname))
  }
  console.log(`[render-tilemap] loaded ${tileImages.size} tile bitmaps`)

  const W = tilemap.width * TILE_W + TILE_HALF_W
  const H = tilemap.height * ROW_Y_STEP + SUBROW_Y_STEP
  console.log(`[render-tilemap] canvas: ${W}×${H} px`)

  const fb = new Uint8Array(W * H)

  function blitTile(tile: TileImage, dstX: number, dstY: number): void {
    for (let y = 0; y < tile.height; y++) {
      const py = dstY + y
      if (py < 0 || py >= H) continue
      for (let x = 0; x < tile.width; x++) {
        const idx = tile.indices[y * tile.width + x]!
        if (idx === 0) continue
        const px = dstX + x
        if (px < 0 || px >= W) continue
        fb[py * W + px] = idx
      }
    }
  }

  function drawPass(layerFn: (d: number) => number): void {
    for (let r = 0; r < tilemap.height; r++) {
      const row = tilemap.cells[r]!
      for (let c = 0; c < tilemap.width; c++) {
        const cell = row[c]!
        const cellPxX = c * TILE_W
        const rowPxY = r * ROW_Y_STEP

        const lowerId = layerFn(cell.lower)
        if (lowerId >= 0) {
          const img = tileImages.get(lowerId)
          if (img) blitTile(img, cellPxX, rowPxY)
        }
        const upperId = layerFn(cell.upper)
        if (upperId >= 0) {
          const img = tileImages.get(upperId)
          if (img) blitTile(img, cellPxX + TILE_HALF_W, rowPxY + SUBROW_Y_STEP)
        }
      }
    }
  }

  drawPass(layer0Id)
  drawPass(layer1Id)

  console.log('[render-tilemap] encoding PNG...')
  const png = new PNG({ width: W, height: H })
  for (let i = 0; i < fb.length; i++) {
    const idx = fb[i]!
    const c = palette.colors[idx] ?? [0, 0, 0]
    png.data[i * 4] = c[0]
    png.data[i * 4 + 1] = c[1]
    png.data[i * 4 + 2] = c[2]
    png.data[i * 4 + 3] = 255
  }

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_PATH, PNG.sync.write(png))
  console.log(`[render-tilemap] written → ${OUT_PATH}`)
}

main()
