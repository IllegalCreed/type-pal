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
    drawTilemap(fb, map, tiles, { col: 0, row: 0 })
    // (0,0) cell 居中在屏幕中心 (160, 100);其内首像素就在 (160, 100)
    expect(fb.indices[100 * 320 + 160]).toBe(1)
  })

  it('upper 层覆盖 lower 层', () => {
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
    drawTilemap(fb, map, tiles, { col: 0, row: 0 })
    expect(fb.indices[100 * 320 + 160]).toBe(2)
  })
})
