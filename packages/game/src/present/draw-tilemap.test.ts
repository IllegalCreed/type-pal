import { describe, it, expect } from 'vitest'
import type { Tilemap } from '@type-pal/shared'
import { createFramebuffer } from './framebuffer.js'
import { drawTilemap, type TileImages } from './draw-tilemap.js'

describe('drawTilemap', () => {
  it('单 cell 单 tile bitmap 渲染到帧缓冲', () => {
    const fb = createFramebuffer()
    const tilePixels = new Uint8Array(4 * 4).fill(1)
    const tiles: TileImages = {
      get(_idx) {
        return { width: 4, height: 4, indices: tilePixels }
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 1, upper: 0 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 }, 0)
    // (0,0) cell 居中在屏幕中心 (160, 100);其内首像素就在 (160, 100)
    expect(fb.indices[100 * 320 + 160]).toBe(1)
  })

  it('upper (h=1) 画在 (+16,+8) 子行,与 lower (h=0) 不重叠', () => {
    const fb = createFramebuffer()
    const lower = new Uint8Array(4 * 4).fill(1)
    const upper = new Uint8Array(4 * 4).fill(2)
    const tiles: TileImages = {
      get(idx) {
        return idx === 1
          ? { width: 4, height: 4, indices: lower }
          : { width: 4, height: 4, indices: upper }
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 1, upper: 2 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 }, 0)
    // lower 在屏幕中心 (160, 100);upper 偏移到 (176, 108)
    expect(fb.indices[100 * 320 + 160]).toBe(1)
    expect(fb.indices[108 * 320 + 176]).toBe(2)
  })

  it('layer 0:9-bit tile id 从低 16 bit 提取 (d & 0xff) | ((d >> 4) & 0x100)', () => {
    const fb = createFramebuffer()
    const captured: number[] = []
    const tiles: TileImages = {
      get(idx) { captured.push(idx); return undefined },
    }
    // d=0x1010 → low8=0x10, (d>>4)&0x100=0x100 → id=0x110
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 0x1010, upper: 0 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 }, 0)
    expect(captured).toContain(0x110)
  })

  it('layer 1:tile id 从高 16 bit 提取且 -1;高 16 bit = 0 → id < 0 → skip', () => {
    const fb = createFramebuffer()
    const captured: number[] = []
    const tiles: TileImages = {
      get(idx) { captured.push(idx); return undefined },
    }
    // d=0x10100000:高 16 = 0x1010 → 同上算 id 0x110,再 -1 = 0x10F
    const cellWithTop = { lower: 0x10100000, upper: 0 }
    const cellNoTop = { lower: 0x10, upper: 0 } // 高 16 = 0 → id = -1 skip
    const map: Tilemap = {
      width: 2, height: 1,
      cells: [[cellWithTop, cellNoTop]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 }, 1)
    expect(captured).toContain(0x10f)
    expect(captured).not.toContain(-1) // 跳过,不调 tiles.get
  })
})
