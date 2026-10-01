/**
 * G03-A。旧 draw-tilemap 测了子行坐标、fence 的 get 次数、9-bit id、全不透明 coverage，
 * 以及接缝在邻居同值时能填上。本组补缺失帧回落、半裁剪的 coverage、行/列剔除和邻居顺序。
 */
import type { Tilemap } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  blitTileAt,
  drawTilemap,
  repairTilemapSeams,
  type TileImage,
  type TileImages,
} from './draw-tilemap.js'
import { createFramebuffer } from './framebuffer.js'

function tile(index: number, width = 1, height = 1, opaque?: number): TileImage {
  const count = width * height
  return {
    width,
    height,
    indices: new Uint8Array(count).fill(index),
    opaque: new Uint8Array(count).fill(opaque ?? 1),
  }
}

function mapOf(cells: Tilemap['cells']): Tilemap {
  return { width: cells[0]?.length ?? 0, height: cells.length, cells, tileset: 'g03' }
}

describe('G03-A drawTilemap 像素与接缝', () => {
  it('G03-A01 layer 0 的 lower 图缺失时，画面用 tile 0，upper 仍用自己的图', () => {
    const fb = createFramebuffer()
    const tiles: TileImages = {
      get(idx) {
        if (idx === 0) return tile(9)
        if (idx === 2) return tile(3)
        return undefined
      },
    }
    drawTilemap(fb, mapOf([[{ lower: 5, upper: 2 }]]), tiles, { x: -26, y: -18 }, 0)
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
        if (idx === 0) return tile(9)
        return undefined
      },
    }
    drawTilemap(fb, mapOf([[{ lower: 0, upper: 0x00050000 }]]), tiles, { x: -20, y: -20 }, 1)
    expect(fb.indices[20 * 320 + 20]).toBe(6)
    expect(seen).not.toContain(0)
    expect(seen).toContain(4)
  })

  it('G03-A03 layer 1 的 lower 图缺失时仍回落 tile 0，upper 的 -1 不画', () => {
    const fb = createFramebuffer()
    fb.writePixel(24, 16, 6)
    const tiles: TileImages = {
      get(idx) {
        if (idx === 0) return tile(9)
        return undefined
      },
    }
    drawTilemap(fb, mapOf([[{ lower: 0x00050000, upper: 0 }]]), tiles, { x: -24, y: -16 }, 1)
    expect(fb.indices[8 * 320 + 8]).toBe(9)
    expect(fb.indices[16 * 320 + 24]).toBe(6)
  })

  it('G03-A04 透明像素不记 coverage，不透明的 index 0 会写入并记 coverage', () => {
    const fb = createFramebuffer()
    fb.writePixel(30, 30, 4)
    const image = tile(0, 2, 1)
    image.indices[0] = 7
    image.opaque[0] = 0
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return image
        return undefined
      },
    }
    const coverage = new Uint8Array(320 * 200)
    drawTilemap(fb, mapOf([[{ lower: 1, upper: 0 }]]), tiles, { x: -46, y: -38 }, 0, coverage)
    expect(fb.indices[30 * 320 + 30]).toBe(4)
    expect(coverage[30 * 320 + 30]).toBe(0)
    expect(fb.indices[30 * 320 + 31]).toBe(0)
    expect(coverage[30 * 320 + 31]).toBe(1)
  })

  it('G03-A05 瓦片跨过 x=0 时，负列不记 coverage，屏内列写入 9', () => {
    const fb = createFramebuffer()
    const image = tile(0, 2, 1)
    image.indices[0] = 8
    image.indices[1] = 9
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return image
        return undefined
      },
    }
    const coverage = new Uint8Array(320 * 200)
    drawTilemap(fb, mapOf([[{ lower: 1, upper: 0 }]]), tiles, { x: -15, y: -13 }, 0, coverage)
    expect(fb.indices[5 * 320]).toBe(9)
    expect(coverage[5 * 320]).toBe(1)
    expect(coverage[5 * 320 - 1]).toBe(0)
  })

  it('G03-A06 瓦片跨过 y=0 时，屏内那一行写入 9，再下一行保持空白', () => {
    const fb = createFramebuffer()
    const image = tile(0, 1, 2)
    image.indices[0] = 8
    image.indices[1] = 9
    const tiles: TileImages = {
      get(idx) {
        if (idx === 1) return image
        return undefined
      },
    }
    drawTilemap(fb, mapOf([[{ lower: 1, upper: 0 }]]), tiles, { x: -19, y: -7 }, 0)
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
    drawTilemap(createFramebuffer(), mapOf(cells), tiles, { x: 0, y: 0 }, 0)
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
    drawTilemap(createFramebuffer(), mapOf(cells), tiles, { x: 0, y: 0 }, 0)
    expect(seen).not.toContain(3)
    expect(seen).toContain(4)
  })

  it('G03-A09 接缝先取扫描顺序里的西北邻居，不取东边更晚的邻居', () => {
    const fb = createFramebuffer(3, 3)
    const coverage = new Uint8Array(9)
    fb.writePixel(0, 0, 4)
    coverage[0] = 1
    fb.writePixel(2, 1, 9)
    coverage[5] = 1
    repairTilemapSeams(fb, coverage, 1)
    expect(fb.indices[4]).toBe(4)
  })

  it('G03-A10 maxPasses 为 1 时只填到紧邻已覆盖像素的一圈', () => {
    const fb = createFramebuffer(5, 1)
    const coverage = new Uint8Array(5)
    fb.writePixel(0, 0, 3)
    coverage[0] = 1
    fb.writePixel(4, 0, 3)
    coverage[4] = 1
    repairTilemapSeams(fb, coverage, 1)
    expect(Array.from(fb.indices)).toEqual([3, 3, 0, 3, 3])
  })

  it('G03-A11 blitTileAt 把屏内 1×1 写成给定索引', () => {
    const fb = createFramebuffer()
    blitTileAt(fb, tile(12), 4, 6)
    expect(fb.indices[6 * 320 + 4]).toBe(12)
  })
})
