/**
 * Debug 工具:把 scene 1 整张 tilemap(64×128 cells, 2 layers × 2 sub-rows each)
 * 拼成 PNG。用我们 game/draw-tilemap.ts 的同一套渲染规则,作为 D29 流程里
 * "我们的渲染输出"那一侧 —— M3 原版 headless map dumper 写出来后跟这张
 * 像素 diff。
 *
 * 跑法(repo 根):pnpm -F @type-pal/pal-extract render-tilemap
 * 产物:build/scene-1-full.png (2064×2056)
 *
 * 也可作 module 被 import:Task M3.3 的 baseline pixel diff 测试就是这么用。
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { openMkf, readChunk } from '../src/io/mkf.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// scripts/ → packages/pal-extract/ → packages/ → repo root
const REPO_ROOT = resolve(HERE, '../../..')
const DATA = resolve(REPO_ROOT, 'data/extracted')
const RAW = resolve(REPO_ROOT, 'data/raw')
const DEFAULT_OUT_DIR = resolve(REPO_ROOT, 'build')
const DEFAULT_OUT_PATH = resolve(DEFAULT_OUT_DIR, 'scene-1-full.png')

const TILE_W = 32
const TILE_H = 16
const TILE_HALF_W = 16
// sdlpal map.c:398-414 真实公式:每 row 步进 16 px(2 个 h sub-row 各 +8)
const ROW_Y_STEP = TILE_H
const SUBROW_Y_STEP = TILE_H / 2

interface Tilemap { width: number; height: number; cells: { lower: number; upper: number }[][] }
interface TileImage {
  width: number
  height: number
  indices: Uint8Array  // palette index per pixel
  opaque: Uint8Array   // 0 = transparent (RLE skip), 1 = opaque (RLE written, even if index === 0)
}

/**
 * 直接从 GOP.MKF 把 sprite chunk 内一帧解码为 (indices, opaque) 对。
 *
 * 这里**不能**复用现有 io/rle.ts —— 它把 RLE 透明跳过和 opaque-zero
 * 合并成 indices[i] = 0,丢失透明 / 显式画 0 的区别。M3 T3 D29 像素 diff
 * 揪出的第 3 个 bug:tile 37 在 (col=15, row=14) 是显式 opaque idx 0
 * (RLE 走 opaque run 写了 0),会把 layer 0 已经画的 idx 180 给覆盖回 0。
 * 我们的 game/draw-tilemap.ts + 现有 PNG 抽取链都没保留这信息,所以
 * render-tilemap 看不到这覆盖。要做严格 sdlpal pixel 对拍 → 自己解 RLE。
 */
function decodeRleFrame(chunk: Uint8Array, frameIdx: number): TileImage | null {
  const off = ((chunk[frameIdx * 2]! | (chunk[frameIdx * 2 + 1]! << 8)) << 1)
  if (off === 0 || off + 4 > chunk.length) return null
  let p = off
  if (chunk[p] === 0x02 && chunk[p + 1] === 0x00 && chunk[p + 2] === 0x00 && chunk[p + 3] === 0x00) {
    p += 4
  }
  const width = chunk[p]! | (chunk[p + 1]! << 8)
  const height = chunk[p + 2]! | (chunk[p + 3]! << 8)
  p += 4
  const indices = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  const transThreshold = 0x80 + width
  let dst = 0
  while (dst < indices.length && p < chunk.length) {
    const T = chunk[p++]!
    // sdlpal palcommon.c:128 —— 透明 run 只在 (T & 0x80) && T <= 0x80 + uiWidth;
    // 否则按 opaque run 长度 T 处理。run 长度可跨行。
    if ((T & 0x80) && T <= transThreshold) {
      dst += T - 0x80
    } else {
      for (let i = 0; i < T && dst < indices.length; i++) {
        indices[dst] = chunk[p++]!
        opaque[dst] = 1
        dst++
      }
    }
  }
  return { width, height, indices, opaque }
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

export interface RenderTilemapOptions {
  /** sceneId,M2 当前固定 1 = scene 1 / mapNum 12。 */
  sceneId?: number
  /** 调色板号,默认 0(M2 当前固定 0)。 */
  paletteId?: number
  /** 输出 PNG 路径。默认 <repo>/build/scene-1-full.png。 */
  outPath?: string
}

export interface RenderTilemapResult {
  outPath: string
  width: number
  height: number
}

export function renderTilemap(opts: RenderTilemapOptions = {}): RenderTilemapResult {
  const sceneId = opts.sceneId ?? 1
  const paletteId = opts.paletteId ?? 0
  const outPath = opts.outPath ?? DEFAULT_OUT_PATH

  const tilemap = JSON.parse(
    readFileSync(resolve(DATA, 'data/tilemap', `${sceneId}.json`), 'utf-8'),
  ) as Tilemap

  const palette = JSON.parse(
    readFileSync(resolve(DATA, 'data/palette', `${paletteId}.json`), 'utf-8'),
  ) as { colors: [number, number, number][] }

  // sdlpal palette.c:75-77 用 `byte << 2` 把 6-bit VGA 升 8-bit,丢低 2 bit;
  // 我们的 extract 用 `(v<<2) | (v>>4)` 升到完整 0..255。这两条同源 6-bit
  // 值会差 0~3。D29 baseline 由 sdlpal 出,所以这里 mask 低 2 bit 去对齐。
  // 这是 M3 T3 找出的第二个 bug(第一个是 sub-row x/y 偏置错位)。
  const sdlpalColors: [number, number, number][] = palette.colors.map(
    ([r, g, b]) => [r & 0xfc, g & 0xfc, b & 0xfc] as [number, number, number],
  )

  // M3 T3 修正:不用 data/extracted/images/tile-scene-*-N.png(PNG 抽取丢
  // 了 RLE 透明 / opaque-zero 区分),直接读 GOP.MKF 第 mapNum chunk 解 RLE。
  // mapNum 从 scene-N.json 取真值(M2 era 曾 hardcode sceneId===1?12:sceneId,
  // scene 14/17 时 GOP chunk 错位 → M3.5 T6 baseline diff 暴露)。
  const sceneMeta = JSON.parse(
    readFileSync(resolve(DATA, 'data/scene', `${sceneId}.json`), 'utf-8'),
  ) as { mapNum: number }
  const mapNum = sceneMeta.mapNum
  const gop = openMkf(new Uint8Array(readFileSync(resolve(RAW, 'GOP.MKF'))))
  const gopChunk = readChunk(gop, mapNum)
  const tileImages = new Map<number, TileImage>()
  const tileFrameCount = gopChunk[0]! | (gopChunk[1]! << 8)
  for (let f = 0; f < tileFrameCount; f++) {
    const img = decodeRleFrame(gopChunk, f)
    if (img !== null) tileImages.set(f, img)
  }

  const W = tilemap.width * TILE_W + TILE_HALF_W
  const H = tilemap.height * ROW_Y_STEP + SUBROW_Y_STEP

  const fb = new Uint8Array(W * H)

  function blitTile(tile: TileImage, dstX: number, dstY: number): void {
    for (let y = 0; y < tile.height; y++) {
      const py = dstY + y
      if (py < 0 || py >= H) continue
      for (let x = 0; x < tile.width; x++) {
        const srcOff = y * tile.width + x
        if (tile.opaque[srcOff] === 0) continue // RLE-skip:不写入
        const px = dstX + x
        if (px < 0 || px >= W) continue
        fb[py * W + px] = tile.indices[srcOff]!
      }
    }
  }

  // sdlpal map.c:382-417 PAL_MapBlitToSurface 真实公式:
  //   yPos = -8 + 16*y + 8*h   (h=0 排在 row baseline 上方 8 px;h=1 在 row baseline)
  //   xPos = 32*x + 16*h - 16  (h=0 排在 col baseline 左 16 px;h=1 在 col baseline)
  // 我们的 cell.lower = Tiles[y][x][0] = h=0 DWORD,cell.upper = Tiles[y][x][1] = h=1 DWORD。
  // 早先版本把 cell.lower 当成 "下方/baseline" 处理 → 渲染整体偏 (+16, +8),
  // M3 T3 D29 baseline pixel diff 把这暴露出来(rows 152-1294 全错位)。
  //
  // **迭代顺序** 也要照 sdlpal:外 y → 中 h → 内 x。这样 row 内 h=0 的全 x
  // 先画完再轮 h=1,因为 h=0 (col c+1) 和 h=1 (col c) 在 col 方向上有 16 px 重叠,
  // 顺序不同会因 opaque 互相覆盖产生不同 pixel。
  //
  // **±1 fence**(M3.5 T6 修):sdlpal sy=lpSrcRect->y/16-1, dy=(y+h)/16+2 → y 跑
  // -1..130;x 同理跑 -1..65。fence 位置 PAL_MapGetTileBitmap 返回 NULL,layer 0
  // fallback 到 tile (0,0,h=0,layer=0)(map.c:412);layer 1 直接 continue。fence
  // 给 dense scene 右 16 col / 底 8 row 提供 fill;之前缺 fence → scene 14/17 暴露
  // ~74808 px diff(scene 1 tile(0,0,0,0)=透明所以巧合 0 diff)。
  function drawPass(layerFn: (d: number) => number, isLayer1: boolean): void {
    // layer 0 fence fallback:cells[0][0].lower 的 layer 0 tile id(永远 h=0)
    const fenceFill = isLayer1 ? -1 : layerFn(tilemap.cells[0]![0]!.lower)
    for (let r = -1; r <= tilemap.height; r++) {
      const row = (r >= 0 && r < tilemap.height) ? tilemap.cells[r]! : null
      // h=0 sub-row:所有 x。cell.lower → 左偏 16 / 上偏 8。
      for (let c = -1; c <= tilemap.width; c++) {
        const cell = (row && c >= 0 && c < tilemap.width) ? row[c]! : null
        const id = cell ? layerFn(cell.lower) : fenceFill
        if (id < 0) continue
        const img = tileImages.get(id)
        if (img) blitTile(img, c * TILE_W - TILE_HALF_W, r * ROW_Y_STEP - SUBROW_Y_STEP)
      }
      // h=1 sub-row:所有 x。cell.upper → 不偏。fence fallback 仍用 cells[0][0].lower。
      for (let c = -1; c <= tilemap.width; c++) {
        const cell = (row && c >= 0 && c < tilemap.width) ? row[c]! : null
        const id = cell ? layerFn(cell.upper) : fenceFill
        if (id < 0) continue
        const img = tileImages.get(id)
        if (img) blitTile(img, c * TILE_W, r * ROW_Y_STEP)
      }
    }
  }

  drawPass(layer0Id, false)
  drawPass(layer1Id, true)

  const png = new PNG({ width: W, height: H })
  for (let i = 0; i < fb.length; i++) {
    const idx = fb[i]!
    const c = sdlpalColors[idx] ?? [0, 0, 0]
    png.data[i * 4] = c[0]
    png.data[i * 4 + 1] = c[1]
    png.data[i * 4 + 2] = c[2]
    png.data[i * 4 + 3] = 255
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, PNG.sync.write(png))

  return { outPath, width: W, height: H }
}

// CLI 薄壳:tsx 直接跑此文件时触发(import 时不触发)
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = renderTilemap()
  console.log(`[render-tilemap] written → ${r.outPath} (${r.width}×${r.height})`)
}
