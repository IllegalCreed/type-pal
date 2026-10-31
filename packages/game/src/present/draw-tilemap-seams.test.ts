import { describe, expect, it } from 'vitest'
import { repairTilemapSeams } from './draw-tilemap.js'
import { createFramebuffer } from './framebuffer.js'

describe('Tilemap seam repair pixels', () => {
  it('未覆盖像素从同值的已覆盖邻居填充', () => {
    const fb = createFramebuffer(3, 3)
    const coverage = new Uint8Array(9)
    // 覆盖除中心(1,1)外的 8 格,像素值都设 5。
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue
      fb.writePixel(i % 3, Math.floor(i / 3), 5)
      coverage[i] = 1
    }
    expect(fb.indices[4]).toBe(0) // clear 后中心为 0(漏黑)
    repairTilemapSeams(fb, coverage)
    expect(fb.indices[4]).toBe(5) // 用邻居 5 填充
  })

  it('已覆盖像素保持不变,即使其值为 0(合法的不透明 index-0,不能当漏黑)', () => {
    const fb = createFramebuffer(2, 1)
    const coverage = new Uint8Array(2)
    fb.writePixel(0, 0, 0)
    coverage[0] = 1 // 瓦片真画的 opaque index-0
    fb.writePixel(1, 0, 9)
    coverage[1] = 1
    repairTilemapSeams(fb, coverage)
    expect(fb.indices[0]).toBe(0) // 不被邻居 9 污染
    expect(fb.indices[1]).toBe(9)
  })

  it('填宽接缝:逐圈向内扩散直到填满', () => {
    // 5×1:两端覆盖(值 3),中间 3 px 未覆盖 → 需多趟扩散填满。
    const fb = createFramebuffer(5, 1)
    const coverage = new Uint8Array(5)
    fb.writePixel(0, 0, 3)
    coverage[0] = 1
    fb.writePixel(4, 0, 3)
    coverage[4] = 1
    repairTilemapSeams(fb, coverage)
    expect([...fb.indices]).toEqual([3, 3, 3, 3, 3])
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
})
