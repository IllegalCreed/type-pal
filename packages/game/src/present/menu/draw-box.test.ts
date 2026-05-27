import { describe, it, expect } from 'vitest'
import { createFramebuffer } from '../framebuffer.js'
import type { IndexedImage } from '../../assets/png.js'
import { drawBox } from './draw-box.js'

/**
 * 构造 9-slice 测试用 UI sprite frames。
 * 每个 tile 8×8,全 opaque,palette idx = base + i*3 + j(可识别区分)。
 * style 0 = idx 0-8;style 1 = idx 9-17。
 */
function mockUiFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let k = 0; k < 18; k++) {
    const w = 8, h = 8
    const indices = new Uint8Array(w * h).fill(k + 1) // 避开 0(0 在 Framebuffer 是 clear 色)
    const opaque = new Uint8Array(w * h).fill(1)
    frames.push({ width: w, height: h, indices, opaque })
  }
  // 余下 frame(18+)留 undefined,draw-box 越界检测应触发(但默认不进)
  return frames
}

describe('M5.6 W0.c drawBox', () => {
  it('画 1×1 内部 box(实际 3×3 tile)— 9 frame 全部 blit', () => {
    const fb = createFramebuffer()
    const frames = mockUiFrames()
    drawBox({ fb, x: 0, y: 0, rows: 1, cols: 1, style: 0, shadowOffset: 0, uiSpriteFrames: frames })
    // 左上 corner tile = frame 0(idx 1)
    expect(fb.indices[0]).toBe(1)
    // 上中 tile(8,0)= frame 1(idx 2)
    expect(fb.indices[8]).toBe(2)
    // 右上 corner tile(16,0)= frame 2(idx 3)
    expect(fb.indices[16]).toBe(3)
    // 中左(0,8)= frame 3(idx 4)
    expect(fb.indices[8 * fb.width]).toBe(4)
    // 中中(8,8)= frame 4(idx 5)
    expect(fb.indices[8 * fb.width + 8]).toBe(5)
    // 右下 corner(16,16)= frame 8(idx 9)
    expect(fb.indices[16 * fb.width + 16]).toBe(9)
  })

  it('shadowOffset 6 → 阴影在 (6,6) 偏移位置应用 PAL_CalcShadowColor 到当前 fb pixel', () => {
    const fb = createFramebuffer()
    const frames = mockUiFrames()
    // 起始 fb 全 0(idx 0)— shadow blit 时 PAL_CalcShadowColor(0) = (0 & 0xF0) | ((0 & 0x0F) >> 1) = 0
    drawBox({ fb, x: 10, y: 10, rows: 1, cols: 1, style: 0, shadowOffset: 6, uiSpriteFrames: frames })
    expect(fb.indices[10 * fb.width + 10]).toBe(1) // 正色 box 左上
    // 阴影右下 (39, 39):落在 fb 0 上 → shadow = 0,但需要测 shadow 是动态计算的
    // 改测:先 prefill fb (39,39) 为 0xAB,shadow 应改为 PAL_CalcShadowColor(0xAB) = 0xA5
    const fb2 = createFramebuffer()
    fb2.writePixel(39, 39, 0xAB)
    drawBox({ fb: fb2, x: 10, y: 10, rows: 1, cols: 1, style: 0, shadowOffset: 6, uiSpriteFrames: frames })
    // PAL_CalcShadowColor(0xAB) = (0xAB & 0xF0) | ((0xAB & 0x0F) >> 1) = 0xA0 | (0x0B >> 1) = 0xA0 | 0x05 = 0xA5
    expect(fb2.indices[39 * fb2.width + 39]).toBe(0xA5)
  })

  it('style 1 → 用 frame 9-17', () => {
    const fb = createFramebuffer()
    const frames = mockUiFrames()
    drawBox({ fb, x: 0, y: 0, rows: 1, cols: 1, style: 1, shadowOffset: 0, uiSpriteFrames: frames })
    // 左上 corner = frame 9(idx 10)
    expect(fb.indices[0]).toBe(10)
    expect(fb.indices[16 * fb.width + 16]).toBe(18) // 右下 corner = frame 17 idx 18
  })

  it('rows=2 cols=4 → 4×6 tile 网格', () => {
    const fb = createFramebuffer()
    const frames = mockUiFrames()
    drawBox({ fb, x: 0, y: 0, rows: 2, cols: 4, style: 0, shadowOffset: 0, uiSpriteFrames: frames })
    // 顶边中间应该是 frame 1(idx 2);取多个 x 验证
    expect(fb.indices[8]).toBe(2)   // 第二列顶 = m=0, n=1 = frame 1
    expect(fb.indices[16]).toBe(2)  // 第三列顶
    expect(fb.indices[40]).toBe(3)  // 最后列(第 6 个)顶 = m=0, n=2 = frame 2 idx 3
  })

  it('uiSpriteFrames 不足 9 个 → 抛错', () => {
    const fb = createFramebuffer()
    expect(() => drawBox({ fb, x: 0, y: 0, rows: 1, cols: 1, style: 0, uiSpriteFrames: [] })).toThrow(
      /uiSpriteFrames\[0\] missing/,
    )
  })
})
