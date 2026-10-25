import type { Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { cloneScreenPalette, makeBlackScreenPalette } from './bootstrap.js'

describe('load palette transition helpers', () => {
  it('读档黑屏 palette 不会污染存档恢复用的原 palette', () => {
    const palette: Palette = {
      colors: Array.from({ length: 256 }, (_, i): [number, number, number] => [
        i,
        (i + 1) % 256,
        (i + 2) % 256,
      ]),
      cycles: [{ start: 0, length: 4, step: 1, frameInterval: 2 }],
      nightColors: Array.from({ length: 256 }, (): [number, number, number] => [7, 8, 9]),
    }

    const restored = cloneScreenPalette(palette)
    const black = makeBlackScreenPalette(restored)

    expect(restored.colors).toHaveLength(256)
    expect(restored.colors[0]).toEqual([0, 1, 2])
    expect(restored.colors[128]).toEqual([128, 129, 130])
    expect(restored.colors[255]).toEqual([255, 0, 1])
    expect(restored.cycles).toBe(palette.cycles)
    expect(restored.nightColors).toBe(palette.nightColors)
    expect(black.cycles).toBe(restored.cycles)
    expect(black.nightColors).toBe(restored.nightColors)
    expect(black.colors).toHaveLength(256)
    expect(new Set(black.colors.flat())).toEqual(new Set([0]))

    restored.colors[0]![0] = 99
    expect(palette.colors[0]).toEqual([0, 1, 2])
    black.colors[0]![1] = 33
    expect(black.colors[1]).toEqual([0, 0, 0])
    expect(restored.colors[0]).toEqual([99, 1, 2])
    expect(restored.colors[1]).toEqual([1, 2, 3])
    expect(restored.colors).not.toBe(palette.colors)
  })
})
