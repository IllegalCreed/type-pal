import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from './framebuffer.js'
import { drawNumber } from './draw-number.js'

/** mock SPRITEUI frame:每 frame 6×8 全 opaque,palette index = (base + digit)。
 *  yellow 19+0 = 19('0' digit color 19),19+1 = 20('1' digit color 20),... */
function mockUiFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let k = 0; k < 80; k++) {
    const w = 6, h = 8
    const indices = new Uint8Array(w * h).fill(k)
    const opaque = new Uint8Array(w * h).fill(1)
    frames.push({ width: w, height: h, indices, opaque })
  }
  return frames
}

describe('drawNumber — sdlpal ui.c:640-732 PAL_DrawNumber port', () => {
  it('num=0,nLength=6,right-align 到 (49, 14) — 1 个 0 digit 在 (79, 14)', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 0, 6, { x: 49, y: 14 }, 'yellow', 'right', mockUiFrames())
    // sdlpal 真值:x = 49 - 6 + 6*6 = 79,blit yellow '0' frame 19(index 19)at (79, 14)
    expect(fb.indices[14 * 320 + 79]).toBe(19) // top-left digit pixel
    expect(fb.indices[14 * 320 + 80]).toBe(19) // 紧邻
    expect(fb.indices[14 * 320 + 78]).toBe(0)  // 79 之前应为 0
  })

  it('num=123,nLength=6,right-align — 3 digits 末位 3 在 (79, 14),2 在 (73, 14),1 在 (67, 14)', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 123, 6, { x: 49, y: 14 }, 'yellow', 'right', mockUiFrames())
    // R-to-L: digit 3 at x=79 (yellow base 19 + 3 = 22)
    expect(fb.indices[14 * 320 + 79]).toBe(22)
    // digit 2 at x=73 (19+2=21)
    expect(fb.indices[14 * 320 + 73]).toBe(21)
    // digit 1 at x=67 (19+1=20)
    expect(fb.indices[14 * 320 + 67]).toBe(20)
  })

  it('num=0,nLength=4,right-align 到 (270, 21) — saved times slot 真值', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 0, 4, { x: 270, y: 21 }, 'yellow', 'right', mockUiFrames())
    // sdlpal 真值:x = 270 - 6 + 6*4 = 288,blit '0' at (288, 21)
    expect(fb.indices[21 * 320 + 288]).toBe(19)
  })

  it('blue color → base frame 29', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 5, 1, { x: 100, y: 50 }, 'blue', 'right', mockUiFrames())
    // x = 100 - 6 + 6 = 100, digit 5,frame 29+5=34
    expect(fb.indices[50 * 320 + 100]).toBe(34)
  })

  it('cyan color → base frame 56', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 7, 1, { x: 100, y: 50 }, 'cyan', 'right', mockUiFrames())
    expect(fb.indices[50 * 320 + 100]).toBe(63) // 56+7
  })

  it('left-align num=42,nLength=6 — digit 起 (49 - 6 + 6*2 = 55) — 2 在 55,4 在 49', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 42, 6, { x: 49, y: 14 }, 'yellow', 'left', mockUiFrames())
    expect(fb.indices[14 * 320 + 55]).toBe(21) // 2
    expect(fb.indices[14 * 320 + 49]).toBe(23) // 4
  })

  it('num 超过 nLength → truncate(actualLength = nLength)', () => {
    const fb = createFramebuffer()
    // num=12345,nLength=3 → 只画 3 位最低位 345
    drawNumber(fb, 12345, 3, { x: 49, y: 14 }, 'yellow', 'right', mockUiFrames())
    // x = 49 - 6 + 18 = 61
    expect(fb.indices[14 * 320 + 61]).toBe(24) // 5
    expect(fb.indices[14 * 320 + 55]).toBe(23) // 4
    expect(fb.indices[14 * 320 + 49]).toBe(22) // 3
    // 高位 1, 2 不画
    expect(fb.indices[14 * 320 + 43]).toBe(0)
  })

  it('uiSpriteFrames 缺失对应 base+digit 时跳过 blit 不抛', () => {
    const fb = createFramebuffer()
    const empty: IndexedImage[] = []
    expect(() => drawNumber(fb, 0, 1, { x: 49, y: 14 }, 'yellow', 'right', empty)).not.toThrow()
    // fb 应全 0
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })
})
