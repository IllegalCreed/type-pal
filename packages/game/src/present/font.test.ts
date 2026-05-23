import { describe, it, expect } from 'vitest'
import { renderText } from './font.js'
import { createFramebuffer } from './framebuffer.js'

describe('renderText(色块占位版)', () => {
  it('每个字符占 8×16 像素的占位框', () => {
    const fb = createFramebuffer()
    renderText(fb, '你好', 10, 10, 1)
    expect(fb.indices[10 * 320 + 10]).toBe(1)
    expect(fb.indices[10 * 320 + 18]).toBe(1)
  })

  it('空字符串 → no-op', () => {
    const fb = createFramebuffer()
    const ok = () => renderText(fb, '', 0, 0, 1)
    expect(ok).not.toThrow()
  })
})
