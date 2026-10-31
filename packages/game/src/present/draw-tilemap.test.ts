import type { Tilemap } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { drawTilemap, type TileImage, type TileImages } from './draw-tilemap.js'
import { createFramebuffer } from './framebuffer.js'

function solidTileImage(index: number, width = 1, height = 1): TileImage {
  const count = width * height
  return {
    width,
    height,
    indices: new Uint8Array(count).fill(index),
    opaque: new Uint8Array(count).fill(1),
  }
}

function tilemapFromCells(cells: Tilemap['cells']): Tilemap {
  return { width: cells[0]?.length ?? 0, height: cells.length, cells, tileset: 'g03' }
}

describe('Tilemap base layer pixels', () => {
  it('lower (h=0) 画在 (-16,-8) 子行;upper (h=1) 画在 col/row baseline', () => {
    // sdlpal map.c:398-414 真实公式 + camera 语义 = sdlpal viewport(屏幕左上 world 坐标):
    //   screen = world - camera
    //   h=0:xPos = 32*x - 16 - camera.x, yPos = -8 + 16*y - camera.y
    //   h=1:xPos = 32*x - camera.x,      yPos =      16*y - camera.y
    // camera=(-160, -112) → cell(0,0) 落屏幕 (160, 112);lower 落 (144, 104)。
    const fb = createFramebuffer()
    const lower = new Uint8Array(4 * 4).fill(1)
    const upper = new Uint8Array(4 * 4).fill(2)
    const lowerOpaque = new Uint8Array(4 * 4).fill(1)
    const upperOpaque = new Uint8Array(4 * 4).fill(1)
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return { width: 4, height: 4, indices: lower, opaque: lowerOpaque }
        if (idx === 2) return { width: 4, height: 4, indices: upper, opaque: upperOpaque }
        return undefined
      },
    }
    const map: Tilemap = {
      width: 1,
      height: 1,
      cells: [[{ lower: 1, upper: 2 }]],
      tileset: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: -160, y: -112 }, 0)
    // lower (h=0) 落 (144, 104) → 该像素值 1
    expect(fb.indices[104 * 320 + 144]).toBe(1)
    // upper (h=1) 落 (160, 112) → 该像素值 2
    expect(fb.indices[112 * 320 + 160]).toBe(2)
  })

  it('±1 fence(M3.5 T6 修):layer 0 fence 位置回落到 tile(cells[0][0].lower 的 h=0)', () => {
    const fb = createFramebuffer()
    const tiles: TileImages = {
      get(index) {
        return index === 5 ? solidTileImage(9) : undefined
      },
    }
    const map: Tilemap = { width: 1, height: 1, cells: [[{ lower: 5, upper: 0 }]], tileset: 'fake' }
    drawTilemap(fb, map, tiles, { x: 0, y: 0 }, 0)
    // Literal visible fence points for a one-pixel tile; other pixels must remain clear.
    const expected = Buffer.alloc(320 * 200)
    expected[32] = 9
    expected[16 * 320] = 9
    expected[8 * 320 + 16] = 9
    expected[16 * 320 + 32] = 9
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })

  it('±1 fence:layer 1 fence 位置 fallback = -1,fence 不调 tiles.get', () => {
    // layer 1:fenceFill = -1。1×1 map, cells[0][0] = { lower: 0, upper: 0xff0000 }
    // → tileIdLayer1(0xff0000) = ((0xff & 0xff) | ((0xff >> 4) & 0x100)) - 1
    //                          = (0xff | 0x000) - 1 = 0xfe
    // 中心格 upper 调 tiles.get(0xfe) 一次;fence 位置 layer 1 跳过不调。
    const fb = createFramebuffer()
    const calls: number[] = []
    const tiles: TileImages = {
      get(idx) {
        calls.push(idx)
        return undefined
      },
    }
    const map: Tilemap = {
      width: 1,
      height: 1,
      cells: [[{ lower: 0, upper: 0xff0000 }]],
      tileset: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: 0, y: 0 }, 1)
    // 唯一调用应该是中心格 upper 的 0xfe;另外 lower 在 layer 1 下
    // tileIdLayer1(0)=-1 跳过;fence 全部跳过。
    expect(calls).toEqual([0xfe])
  })

  it('layer 0:9-bit tile id 从低 16 bit 提取 (d & 0xff) | ((d >> 4) & 0x100)', () => {
    const fb = createFramebuffer()
    const captured: number[] = []
    const tiles: TileImages = {
      get(idx) {
        captured.push(idx)
        return undefined
      },
    }
    // d=0x1010 → low8=0x10, (d>>4)&0x100=0x100 → id=0x110
    const map: Tilemap = {
      width: 1,
      height: 1,
      cells: [[{ lower: 0x1010, upper: 0 }]],
      tileset: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: 0, y: 0 }, 0)
    expect(captured).toContain(0x110)
  })

  it('layer 1:tile id 从高 16 bit 提取且 -1;高 16 bit = 0 → id < 0 → skip', () => {
    const fb = createFramebuffer()
    const captured: number[] = []
    const tiles: TileImages = {
      get(idx) {
        captured.push(idx)
        return undefined
      },
    }
    // d=0x10100000:高 16 = 0x1010 → 同上算 id 0x110,再 -1 = 0x10F
    const cellWithTop = { lower: 0x10100000, upper: 0 }
    const cellNoTop = { lower: 0x10, upper: 0 } // 高 16 = 0 → id = -1 skip
    const map: Tilemap = {
      width: 2,
      height: 1,
      cells: [[cellWithTop, cellNoTop]],
      tileset: 'fake',
    }
    drawTilemap(fb, map, tiles, { x: 0, y: 0 }, 1)
    expect(captured).toContain(0x10f)
    expect(captured).not.toContain(-1) // 跳过,不调 tiles.get
  })

  it('传入 coverage 时标记已画像素;远处未画处不标记', () => {
    // coverage 区分未画像素与已画的 index 0；接缝补偿只允许填前者。
    const fb = createFramebuffer()
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1)
          return {
            width: 4,
            height: 4,
            indices: new Uint8Array(16).fill(1),
            opaque: new Uint8Array(16).fill(1),
          }
        return undefined
      },
    }
    const map: Tilemap = {
      width: 1,
      height: 1,
      cells: [[{ lower: 1, upper: 0 }]],
      tileset: 'fake',
    }
    const coverage = new Uint8Array(320 * 200)
    // camera=(-160,-112) → cell(0,0) lower(h=0) 落 (144,104),4×4 不透明 tile 1。
    drawTilemap(fb, map, tiles, { x: -160, y: -112 }, 0, coverage)
    expect(coverage[104 * 320 + 144]).toBe(1) // 画过 → 标记
    expect(coverage[0]).toBe(0) // 远处未画 → 不标记
  })

  it('G03-A01 layer 0 的 lower 图缺失时，画面用 tile 0，upper 仍用自己的图', () => {
    const fb = createFramebuffer()
    const tiles: TileImages = {
      get(idx) {
        if (idx === 0) return solidTileImage(9)
        if (idx === 2) return solidTileImage(3)
        return undefined
      },
    }
    drawTilemap(fb, tilemapFromCells([[{ lower: 5, upper: 2 }]]), tiles, { x: -26, y: -18 }, 0)
    expect(fb.indices[10 * 320 + 10]).toBe(9)
    expect(fb.indices[18 * 320 + 26]).toBe(3)
  })

  it('G03-A02 layer 1 的 upper 有 id 但没有图时，不回落 tile 0', () => {
    const fb = createFramebuffer()
    fb.writePixel(20, 20, 6)
    const seen: number[] = []
    const tiles: TileImages = {
      get(idx) {
        seen.push(idx)
        if (idx === 0) return solidTileImage(9)
        return undefined
      },
    }
    drawTilemap(
      fb,
      tilemapFromCells([[{ lower: 0, upper: 0x00050000 }]]),
      tiles,
      { x: -20, y: -20 },
      1,
    )
    expect(fb.indices[20 * 320 + 20]).toBe(6)
    expect(seen).not.toContain(0)
    expect(seen).toContain(4)
  })

  it('G03-A03 layer 1 的 lower 图缺失时仍回落 tile 0，upper 的 -1 不画', () => {
    const fb = createFramebuffer()
    fb.writePixel(24, 16, 6)
    const tiles: TileImages = {
      get(idx) {
        if (idx === 0) return solidTileImage(9)
        return undefined
      },
    }
    drawTilemap(
      fb,
      tilemapFromCells([[{ lower: 0x00050000, upper: 0 }]]),
      tiles,
      { x: -24, y: -16 },
      1,
    )
    expect(fb.indices[8 * 320 + 8]).toBe(9)
    expect(fb.indices[16 * 320 + 24]).toBe(6)
  })

  it('G03-A04 透明像素不记 coverage，不透明的 index 0 会写入并记 coverage', () => {
    const fb = createFramebuffer()
    fb.writePixel(30, 30, 4)
    const image = solidTileImage(0, 2, 1)
    image.indices[0] = 7
    image.opaque[0] = 0
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return image
        return undefined
      },
    }
    const coverage = new Uint8Array(320 * 200)
    drawTilemap(
      fb,
      tilemapFromCells([[{ lower: 1, upper: 0 }]]),
      tiles,
      { x: -46, y: -38 },
      0,
      coverage,
    )
    expect(fb.indices[30 * 320 + 30]).toBe(4)
    expect(coverage[30 * 320 + 30]).toBe(0)
    expect(fb.indices[30 * 320 + 31]).toBe(0)
    expect(coverage[30 * 320 + 31]).toBe(1)
  })

  it('G03-A05 瓦片跨过 x=0 时，负列不记 coverage，屏内列写入 9', () => {
    const fb = createFramebuffer()
    const image = solidTileImage(0, 2, 1)
    image.indices[0] = 8
    image.indices[1] = 9
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return image
        return undefined
      },
    }
    const coverage = new Uint8Array(320 * 200)
    drawTilemap(
      fb,
      tilemapFromCells([[{ lower: 1, upper: 0 }]]),
      tiles,
      { x: -15, y: -13 },
      0,
      coverage,
    )
    expect(fb.indices[5 * 320]).toBe(9)
    expect(coverage[5 * 320]).toBe(1)
    expect(coverage[5 * 320 - 1]).toBe(0)
  })

  it('G03-A06 瓦片跨过 y=0 时，屏内那一行写入 9，再下一行保持空白', () => {
    const fb = createFramebuffer()
    const image = solidTileImage(0, 1, 2)
    image.indices[0] = 8
    image.indices[1] = 9
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return image
        return undefined
      },
    }
    drawTilemap(fb, tilemapFromCells([[{ lower: 1, upper: 0 }]]), tiles, { x: -19, y: -7 }, 0)
    expect(fb.indices[3]).toBe(9)
    expect(fb.indices[320 + 3]).toBe(0)
  })

  it('G03-A07 整行落在屏幕下方时不取该行的 tile id', () => {
    const seen: number[] = []
    const tiles: TileImages = {
      get(idx) {
        seen.push(idx)
        return undefined
      },
    }
    // 第 0 行在屏内（lower=4）。第 13 行 rowPxY-8=200，整行被剔除。
    // 右 fence 用的是 cells[0][0]，不能把禁取 id 放在那里。
    const cells = Array.from({ length: 14 }, (_, r) => [
      { lower: r === 13 ? 3 : r === 0 ? 4 : 0, upper: 0 },
    ])
    drawTilemap(createFramebuffer(), tilemapFromCells(cells), tiles, { x: 0, y: 0 }, 0)
    expect(seen).not.toContain(3)
    expect(seen).toContain(4)
  })

  it('G03-A08 整列落在屏幕右边界外时不取该列的 tile id', () => {
    const seen: number[] = []
    const tiles: TileImages = {
      get(idx) {
        seen.push(idx)
        return undefined
      },
    }
    // c=11 的 cellPxX-16=336≥320，整列剔除。底 fence 在第 14 行，同样出屏。
    const cells = Array.from({ length: 14 }, () =>
      Array.from({ length: 12 }, (_, c) => ({
        lower: c === 11 ? 3 : c === 0 ? 4 : 0,
        upper: 0,
      })),
    )
    drawTilemap(createFramebuffer(), tilemapFromCells(cells), tiles, { x: 0, y: 0 }, 0)
    expect(seen).not.toContain(3)
    expect(seen).toContain(4)
  })
})
