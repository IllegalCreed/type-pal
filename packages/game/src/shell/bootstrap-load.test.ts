import type { Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { cloneScreenPalette, makeBlackScreenPalette } from './bootstrap.js'

describe('load palette transition helpers', () => {
  it('读档黑屏 palette 不会污染存档恢复用的原 palette', () => {
    const palette: Palette = {
      colors: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      cycles: [],
      nightColors: [
        [7, 8, 9],
        [10, 11, 12],
      ],
    }

    const restored = cloneScreenPalette(palette)
    const black = makeBlackScreenPalette(restored)

    expect(restored.colors).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ])
    expect(black.colors).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ])
    expect(black.nightColors).toBe(restored.nightColors)
    expect(restored.colors).not.toBe(palette.colors)
  })
})
