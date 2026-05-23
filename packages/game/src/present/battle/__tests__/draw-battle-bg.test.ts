import { describe, expect, it } from 'vitest'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleBg } from '../draw-battle-bg.js'

describe('drawBattleBg', () => {
  it('整面 320×200 写入 framebuffer', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array(320 * 200)
    for (let i = 0; i < indices.length; i++) indices[i] = (i % 13) + 1
    drawBattleBg(fb, { width: 320, height: 200, indices })
    expect(fb.indices[0]).toBe(indices[0])
    expect(fb.indices[100 * 320 + 160]).toBe(indices[100 * 320 + 160])
    expect(fb.indices[199 * 320 + 319]).toBe(indices[199 * 320 + 319])
  })

  it('索引 0 也照画(背景不透明)', () => {
    const fb = createFramebuffer()
    fb.writePixel(5, 5, 99)
    const indices = new Uint8Array(320 * 200) // 全 0
    drawBattleBg(fb, { width: 320, height: 200, indices })
    expect(fb.indices[5 * 320 + 5]).toBe(0)
  })

  it('小于屏的素材不越界 / 不抛错', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array(2 * 2).fill(7)
    drawBattleBg(fb, { width: 2, height: 2, indices })
    expect(fb.indices[0]).toBe(7)
    expect(fb.indices[1]).toBe(7)
    expect(fb.indices[320]).toBe(7)
    expect(fb.indices[321]).toBe(7)
    // 屏外其他像素未触碰(仍是初始 0)
    expect(fb.indices[2]).toBe(0)
  })
})
