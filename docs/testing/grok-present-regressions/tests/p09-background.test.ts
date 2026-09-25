import type { Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { drawBattleBg } from '../../../../packages/game/src/present/battle/draw-battle-bg.js'
import { createFramebuffer } from '../../../../packages/game/src/present/framebuffer.js'
import { fillSentinel, pixel, SENTINEL } from '../fixtures/images.js'
import { cloneInputs } from '../fixtures/world.js'

function paletteWith(entries: Readonly<Record<number, [number, number, number]>>): Palette {
  const colors = Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number])
  for (const [index, rgb] of Object.entries(entries)) colors[Number(index)] = rgb
  return { colors, cycles: [] }
}

function image(width: number, height: number, paint: (x: number, y: number) => number): Uint8Array {
  const indices = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) indices[y * width + x] = paint(x, y)
  }
  return indices
}

describe('P09 背景索引链', () => {
  it('P09 正负色阶在低半字节边界钳制并保留高半字节', () => {
    const raised = createFramebuffer(6, 3)
    fillSentinel(raised)
    const raisedBg = {
      width: 8,
      height: 4,
      indices: image(8, 4, (x, y) => {
        if (y !== 0) return 0x20
        if (x === 0) return 0xa3
        if (x === 1) return 0xaf
        if (x === 2) return 0x00
        if (x === 3) return 0xf0
        if (x === 5) return 0x25
        if (x === 7) return 0xab
        return 0x20
      }),
    }
    const beforeRaised = cloneInputs({ battleBg: raisedBg })
    drawBattleBg(raised, raisedBg, 1)
    expect(cloneInputs({ battleBg: raisedBg })).toEqual(beforeRaised)
    expect(pixel(raised, 0, 0)).toBe(0xa4)
    expect(pixel(raised, 1, 0)).toBe(0xaf)
    expect(pixel(raised, 2, 0)).toBe(0x01)
    expect(pixel(raised, 3, 0)).toBe(0xf1)
    expect(pixel(raised, 5, 0)).toBe(0x26)
    expect(pixel(raised, 4, 0)).toBe(0x21)
    for (let y = 0; y < raised.height; y++) {
      for (let x = 0; x < raised.width; x++) {
        expect(pixel(raised, x, y)).not.toBe(0xab)
        expect(pixel(raised, x, y)).not.toBe(0xac)
      }
    }

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

  it('P09 小图裁剪保留未覆盖像素，移位索引经toImageData变成RGBA', () => {
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

    const palette = paletteWith({
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
})
