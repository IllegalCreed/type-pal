import { describe, expect, it } from 'vitest'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleBg } from '../draw-battle-bg.js'

describe('drawBattleBg', () => {
  it('整面 320×200 写入 framebuffer', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array(320 * 200)
    for (let i = 0; i < indices.length; i++) indices[i] = (i % 13) + 1
    drawBattleBg(fb, { width: 320, height: 200, indices })
    expect(Buffer.compare(fb.indices, indices)).toBe(0)
  })

  it('索引 0 也照画(背景不透明)', () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    const indices = new Uint8Array(320 * 200) // 全 0
    drawBattleBg(fb, { width: 320, height: 200, indices })
    expect(fb.indices.every((value) => value === 0)).toBe(true)
  })

  it('小于屏的素材不越界 / 不抛错', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array(2 * 2).fill(7)
    drawBattleBg(fb, { width: 2, height: 2, indices })
    const expected = Buffer.alloc(320 * 200)
    expected.fill(7, 0, 2)
    expected.fill(7, 320, 322)
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })
})
