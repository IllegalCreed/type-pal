import { describe, expect, it } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { dialogGlyphs } from '../__tests__/dialog-fixtures.js'
import { dumpFramebuffer } from '../__tests__/grok-render-r1/dump-evidence.js'
import { pixel } from './__tests__/raster-fixtures.js'
import { drawDialogBox, FONT_COLOR_CYAN_ALT, startDialogLine } from './dialog-box.js'
import { createFramebuffer } from './framebuffer.js'
import { flushToCanvas } from './present.js'

const wideGlyphs = dialogGlyphs({ 李: 16, ':': 16, 甲: 16, 乙: 16, 丙: 16 })

describe('Dialogue canvas and PNG output', () => {
  it('G05-A11 姓名索引 0x8C 经 flushToCanvas 写成调色板 RGB，缓冲仍是 0x8C', async () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'top' })
    drawDialogBox(fb, state, wideGlyphs)
    const palette = legalPalette((colors) => {
      colors[FONT_COLOR_CYAN_ALT] = [1, 2, 140]
    })
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) throw new Error('2d context unavailable')
    flushToCanvas(fb, ctx2d, palette)
    expect(Array.from(ctx2d.getImageData(12, 8, 1, 1).data)).toEqual([1, 2, 140, 255])
    expect(pixel(fb, 12, 8)).toBe(FONT_COLOR_CYAN_ALT)
    const snap = ctx2d.getImageData(0, 0, 320, 200)
    await dumpFramebuffer('G05-A11', 320, 200, snap.data, [{ x: 12, y: 8, rgba: [1, 2, 140, 255] }])
  })
})
