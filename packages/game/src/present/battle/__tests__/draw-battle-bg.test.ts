import type { Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { fillSentinel, pixel, SENTINEL } from '../../__tests__/raster-fixtures.js'
import { cloneInputs } from '../../__tests__/render-input-snapshots.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleBg } from '../draw-battle-bg.js'

function paletteWithColors(entries: Readonly<Record<number, [number, number, number]>>): Palette {
  const colors = Array.from({ length: 256 }, (): [number, number, number] => [0, 0, 0])
  for (const [index, rgb] of Object.entries(entries)) colors[Number(index)] = rgb
  return { colors, cycles: [] }
}

describe('Battle background indices and RGBA', () => {
  it('P09 正负色阶在低半字节边界钳制并保留高半字节', () => {
    const raised = createFramebuffer(6, 3)
    fillSentinel(raised)
    const raisedBg = {
      width: 8,
      height: 4,
      indices: Uint8Array.from([
        0xa3, 0xaf, 0x00, 0xf0, 0x20, 0x25, 0x20, 0xab, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20, 0x20,
      ]),
    }
    const beforeRaised = cloneInputs({ battleBg: raisedBg })
    drawBattleBg(raised, raisedBg, 1)
    expect(cloneInputs({ battleBg: raisedBg })).toEqual(beforeRaised)
    expect(Array.from(raised.indices)).toEqual([
      0xa4, 0xaf, 0x01, 0xf1, 0x21, 0x26, 0x21, 0x21, 0x21, 0x21, 0x21, 0x21, 0x21, 0x21, 0x21,
      0x21, 0x21, 0x21,
    ])

    const lowered = createFramebuffer(4, 1)
    fillSentinel(lowered)
    const loweredBg = {
      width: 4,
      height: 1,
      indices: Uint8Array.from([0xa1, 0xa0, 0x05, 0x1f]),
    }
    const beforeLowered = cloneInputs({ battleBg: loweredBg })
    drawBattleBg(lowered, loweredBg, -1)
    expect(cloneInputs({ battleBg: loweredBg })).toEqual(beforeLowered)
    expect(pixel(lowered, 0, 0)).toBe(0xa0)
    expect(pixel(lowered, 1, 0)).toBe(0xa0)
    expect(pixel(lowered, 2, 0)).toBe(0x04)
    expect(pixel(lowered, 3, 0)).toBe(0x1e)
  })

  it('P09 小图裁剪保留未覆盖像素，索引经toImageData变成RGBA', () => {
    const fb = createFramebuffer(6, 3)
    fillSentinel(fb)
    const smallBg = { width: 2, height: 2, indices: Uint8Array.from([0x00, 0xa3, 0x10, 0x01]) }
    const beforeSmall = cloneInputs({ battleBg: smallBg })
    drawBattleBg(fb, smallBg, 0)
    expect(cloneInputs({ battleBg: smallBg })).toEqual(beforeSmall)
    expect(pixel(fb, 0, 0)).toBe(0)
    expect(pixel(fb, 1, 0)).toBe(0xa3)
    expect(pixel(fb, 2, 0)).toBe(SENTINEL)
    expect(pixel(fb, 0, 2)).toBe(SENTINEL)

    const palette = paletteWithColors({
      0: [8, 0, 0],
      0xa3: [0, 9, 0],
      [SENTINEL]: [1, 2, 3],
    })
    const view = fb.toImageData(palette)
    expect(view.width).toBe(6)
    expect(view.height).toBe(3)
    expect([view.data[0], view.data[1], view.data[2], view.data[3]]).toEqual([8, 0, 0, 255])
    expect([view.data[4], view.data[5], view.data[6], view.data[7]]).toEqual([0, 9, 0, 255])
    const sentinel = 2 * 4
    expect([
      view.data[sentinel],
      view.data[sentinel + 1],
      view.data[sentinel + 2],
      view.data[sentinel + 3],
    ]).toEqual([1, 2, 3, 255])
  })

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
