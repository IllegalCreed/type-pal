import { describe, it, expect } from 'vitest'
import type { Tilemap } from '@type-pal/shared'
import { createFramebuffer } from './framebuffer.js'
import { drawTilemap, type TileImages } from './draw-tilemap.js'

describe('drawTilemap', () => {
  it('lower (h=0) 画在 (-16,-8) 子行;upper (h=1) 画在 col/row baseline', () => {
    // sdlpal map.c:398-414 真实公式:
    //   h=0:xPos = 32*x - 16, yPos = -8 + 16*y
    //   h=1:xPos = 32*x,      yPos =      16*y
    // 以 cameraCell (0,0) 居中到屏幕 (160,100):
    //   cell(0,0) 的 lower 落在 (144, 92);upper 落在 (160, 100)。
    const fb = createFramebuffer()
    const lower = new Uint8Array(4 * 4).fill(1)
    const upper = new Uint8Array(4 * 4).fill(2)
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return { width: 4, height: 4, indices: lower }
        if (idx === 2) return { width: 4, height: 4, indices: upper }
        return undefined
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      // cells[0][0].lower=1 → fenceFill = tileIdLayer0(1) = 1;为避免 fence 干扰
      // 周围像素断言,这里只断言 (0,0) 自己的中心格 sub-row 像素。
      cells: [[{ lower: 1, upper: 2 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 }, 0)
    // lower (h=0) 落 (144, 92) → 该像素值 1
    expect(fb.indices[92 * 320 + 144]).toBe(1)
    // upper (h=1) 落 (160, 100) → 该像素值 2
    expect(fb.indices[100 * 320 + 160]).toBe(2)
  })

  it('±1 fence(M3.5 T6 修):layer 0 fence 位置回落到 tile(cells[0][0].lower 的 h=0)', () => {
    // 给 1×1 map,设 cells[0][0] = { lower: 5, upper: 0 }(tileIdLayer0(5)=5)。
    // fence(r=-1/height, c=-1/width)位置 cell=null,layer 0 应 fallback 到 id 5。
    // 验证手段:tiles.get 被调用时记录 id,fence 触发 id 5 多次调用。
    const fb = createFramebuffer()
    const callCounts = new Map<number, number>()
    const tiles: TileImages = {
      get(idx) {
        callCounts.set(idx, (callCounts.get(idx) ?? 0) + 1)
        return undefined
      },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 5, upper: 0 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 }, 0)
    // 中心格 lower id 5 + fence 8 圈每圈 lower+upper 都 fenceFill=5。
    // 调用次数远 > 1 即证明 fence 触发(无 fence 时 layer 0 只会拿 1 次 id 5)。
    expect((callCounts.get(5) ?? 0)).toBeGreaterThan(1)
  })

  it('±1 fence:layer 1 fence 位置 fallback = -1,fence 不调 tiles.get', () => {
    // layer 1:fenceFill = -1。1×1 map, cells[0][0] = { lower: 0, upper: 0xff0000 }
    // → tileIdLayer1(0xff0000) = ((0xff & 0xff) | ((0xff >> 4) & 0x100)) - 1
    //                          = (0xff | 0x000) - 1 = 0xfe
    // 中心格 upper 调 tiles.get(0xfe) 一次;fence 位置 layer 1 跳过不调。
    const fb = createFramebuffer()
    const calls: number[] = []
    const tiles: TileImages = {
      get(idx) { calls.push(idx); return undefined },
    }
    const map: Tilemap = {
      width: 1, height: 1,
      cells: [[{ lower: 0, upper: 0xff0000 }]],
      tilesetImage: 'fake',
    }
    drawTilemap(fb, map, tiles, { col: 0, row: 0 }, 1)
    // 唯一调用应该是中心格 upper 的 0xfe;另外 lower 在 layer 1 下
    // tileIdLayer1(0)=-1 跳过;fence 全部跳过。
    expect(calls).toEqual([0xfe])
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
