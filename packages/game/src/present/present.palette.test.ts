import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { createInitialGameState } from '../core/game-state.js'
import { setWaitingEndKey, startDialogLine } from './dialog-box.js'
import { applyDialogIconPaletteShift } from './present.js'

function channelPalette(channel: 0 | 1): { colors: Array<[number, number, number]>; cycles: [] } {
  return {
    colors: Array.from({ length: 256 }, (_, index) => {
      const color: [number, number, number] = [0, 0, 0]
      color[channel] = index
      return color
    }),
    cycles: [],
  }
}

describe('Dialogue palette output', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('applyDialogIconPaletteShift(dialog 箭头 palette 轮转)', () => {
    function grayscalePalette(): Palette {
      return {
        colors: Array.from({ length: 256 }, (_, i) => [i, i, i] as [number, number, number]),
        cycles: [],
      }
    }

    it('非等键 phase(typing)→ 原样返回 base 同引用', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dialogBox = startDialogLine('A', { style: 'bottom' }) // phase = typing
      const base = grayscalePalette()
      expect(applyDialogIconPaletteShift(gs, base)).toBe(base)
    })

    it('blackScreenHold + dialog → 保持背景黑色,恢复对话文字色槽', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.blackScreenHold = true
      gs.dialogBox = startDialogLine('"一夜过去．．"~40', { style: 'center' })
      gs.basePalette = grayscalePalette()
      const black: Palette = {
        colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
        cycles: [],
      }

      const out = applyDialogIconPaletteShift(gs, black)

      expect(out).not.toBe(black)
      expect(out.colors[0]).toEqual([0, 0, 0])
      expect(out.colors[0x2d]).toEqual([0x2d, 0x2d, 0x2d])
      expect(out.colors[0x4f]).toEqual([0x4f, 0x4f, 0x4f])
      expect(out.colors[0x42]).toEqual([0, 0, 0])
    })

    it('blackScreenHold 文字色不受 nightPalette/nightColors 影响', () => {
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.blackScreenHold = true
      gs.nightPalette = true
      gs.dialogBox = startDialogLine('"一夜过去．．"~40', { style: 'center' })
      gs.basePalette = {
        ...grayscalePalette(),
        nightColors: Array.from({ length: 256 }, () => [1, 2, 3] as [number, number, number]),
      }
      const black: Palette = {
        colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
        cycles: [],
      }

      const out = applyDialogIconPaletteShift(gs, black)

      expect(out.colors[0x2d]).toEqual([0x2d, 0x2d, 0x2d])
      expect(out.colors[0x4f]).toEqual([0x4f, 0x4f, 0x4f])
    })

    it('等键 phase + step=1(t=100ms)→ 0xF9-0xFE 左轮转 1 格,区间外不动', () => {
      vi.spyOn(performance, 'now').mockReturnValue(100) // floor(100/100)%6 = 1
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dialogBox = startDialogLine('A', { style: 'bottom' })
      setWaitingEndKey(gs.dialogBox)
      const base = grayscalePalette()
      const before = structuredClone(base)
      const out = applyDialogIconPaletteShift(gs, base)
      expect(base).toEqual(before)
      expect(out).not.toBe(base)
      // 左轮转 1:out[0xF9]=base[0xFA] … out[0xFD]=base[0xFE],out[0xFE]=base[0xF9](回绕)
      expect(out.colors[0xf9]).toEqual([0xfa, 0xfa, 0xfa])
      expect(out.colors[0xfd]).toEqual([0xfe, 0xfe, 0xfe])
      expect(out.colors[0xfe]).toEqual([0xf9, 0xf9, 0xf9])
      // 区间外像素不变
      expect(out.colors[0xf8]).toEqual(base.colors[0xf8])
      expect(out.colors[0x42]).toEqual(base.colors[0x42])
    })

    it('等键 phase + step=0(整圈起点 t=600ms)→ 原样返回 base', () => {
      vi.spyOn(performance, 'now').mockReturnValue(600) // floor(600/100)%6 = 0
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dialogBox = startDialogLine('A', { style: 'bottom' })
      setWaitingEndKey(gs.dialogBox)
      const base = grayscalePalette()
      expect(applyDialogIconPaletteShift(gs, base)).toBe(base)
    })
  })

  describe('G04-D present 冻屏归属与调色板', () => {
    it('G04-D06 center 等键在 step 1 仍返回同一调色板引用', () => {
      vi.spyOn(performance, 'now').mockReturnValue(100)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.dialogBox = startDialogLine('A', { style: 'center' })
      setWaitingEndKey(gs.dialogBox)
      const base = legalPalette()
      expect(applyDialogIconPaletteShift(gs, base)).toBe(base)
    })

    it('G04-D07 黑屏 center 等键恢复文字色，但不轮转 0xF9', () => {
      vi.spyOn(performance, 'now').mockReturnValue(100)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.blackScreenHold = true
      gs.basePalette = channelPalette(0)
      gs.dialogBox = startDialogLine('A', { style: 'center' })
      setWaitingEndKey(gs.dialogBox)
      const out = applyDialogIconPaletteShift(gs, channelPalette(1))
      expect(out.colors[0x2d]).toEqual([0x2d, 0, 0])
      expect(out.colors[0xf9]).toEqual([0, 0xf9, 0])
      expect(out.colors[0xfe]).toEqual([0, 0xfe, 0])
    })
  })
})
