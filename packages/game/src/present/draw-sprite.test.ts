import { describe, expect, it } from 'vitest'
import { drawSprite, toSpriteImages } from './draw-sprite.js'
import { createFramebuffer } from './framebuffer.js'

describe('toSpriteImages 逐帧 anchor(密道攀爬偏下根因回归)', () => {
  const mk = (w: number, h: number) => ({
    width: w,
    height: h,
    indices: new Uint8Array(w * h),
    opaque: new Uint8Array(w * h),
  })

  it('每帧 anchorY = 自身高度,anchorX = 自身宽度/2(非整组钉死 frame0)', () => {
    // chunk193 爬行精灵真实高度剖面:frame0=31,爬帧 frame3..6=54/56/65/73
    const sprites = toSpriteImages([
      mk(45, 31),
      mk(45, 63),
      mk(45, 41),
      mk(45, 54),
      mk(45, 56),
      mk(45, 65),
      mk(45, 73),
    ])
    expect(sprites[0]!.anchorY).toBe(31)
    expect(sprites[6]!.anchorY).toBe(73) // ← bug 时会是 31(frame0),脚底下溢 42px
    expect(sprites[5]!.anchorY).toBe(65)
    expect(sprites.map((s) => s.anchorX)).toEqual([22, 22, 22, 22, 22, 22, 22])
  })

  it('脚底对齐:任意高度帧在 drawSprite(cy) 处底边都落在同一行(sdlpal PAL_RLEGetHeight 逐帧)', () => {
    // anchorY=height → 底边 = cy - anchorY + (height-1) = cy - 1,与帧高无关
    const cy = 100
    for (const h of [31, 54, 73]) {
      const fb = createFramebuffer()
      const s = toSpriteImages([mk(2, h)])[0]!
      s.opaque.fill(1)
      s.indices.fill(7)
      drawSprite(fb, s, 10, cy)
      const bottomRow = cy - 1 // 底边像素行
      expect(fb.indices[bottomRow * 320 + (10 - 1)]).toBe(7)
      // 底边再往下一行必须空(没有向下溢出)
      expect(fb.indices[(bottomRow + 1) * 320 + (10 - 1)]).toBe(0)
    }
  })
})

describe('drawSprite', () => {
  it('画一个 2×2 精灵,anchor 在底部中心 (1, 2)', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array([1, 2, 3, 4])
    const opaque = new Uint8Array([1, 1, 1, 1])
    drawSprite(fb, { width: 2, height: 2, indices, opaque, anchorX: 1, anchorY: 2 }, 10, 10)
    expect(fb.indices[8 * 320 + 9]).toBe(1)
    expect(fb.indices[8 * 320 + 10]).toBe(2)
    expect(fb.indices[9 * 320 + 9]).toBe(3)
    expect(fb.indices[9 * 320 + 10]).toBe(4)
  })

  it('opaque=0 不覆盖底面(M3.5 fix:透明判定走 opaque mask,非 idx===0)', () => {
    const fb = createFramebuffer()
    fb.writePixel(10, 10, 99)
    const indices = new Uint8Array([0])
    const opaque = new Uint8Array([0])
    drawSprite(fb, { width: 1, height: 1, indices, opaque, anchorX: 0, anchorY: 0 }, 10, 10)
    expect(fb.indices[10 * 320 + 10]).toBe(99)
  })

  it('opaque=1 且 idx=0 仍画(palette index 0 是合法 opaque 像素,M3.5 fix)', () => {
    const fb = createFramebuffer()
    fb.writePixel(10, 10, 99)
    const indices = new Uint8Array([0])
    const opaque = new Uint8Array([1])
    drawSprite(fb, { width: 1, height: 1, indices, opaque, anchorX: 0, anchorY: 0 }, 10, 10)
    expect(fb.indices[10 * 320 + 10]).toBe(0)
  })

  it('屏幕外像素不抛错', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array(4).fill(5)
    const opaque = new Uint8Array(4).fill(1)
    const ok = () =>
      drawSprite(fb, { width: 2, height: 2, indices, opaque, anchorX: 0, anchorY: 0 }, -1, -1)
    expect(ok).not.toThrow()
  })
})
