/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G05-A。
 * 不重复 dialog-box.test 的控制符/翻页/时序，也不重复 P16 的底框立绘像素。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/grok-render-r1/legal-host.js'
import type { DialogBoxState } from '../core/game-state.js'
import {
  appendDialogLine,
  drawDialogBox,
  FONT_COLOR_CYAN_ALT,
  FONT_COLOR_RED,
  FONT_COLOR_YELLOW,
  resetDialogBody,
  startDialogLine,
} from './dialog-box.js'
import type { Glyph, GlyphTable } from './font.js'
import { createFramebuffer, type Framebuffer } from './framebuffer.js'
import { flushToCanvas } from './present.js'

function at(fb: Framebuffer, x: number, y: number): number {
  return fb.indices[y * 320 + x] ?? 0
}

function glyphs(specs: Record<string, number>): GlyphTable {
  const map = new Map<number, Glyph>()
  for (const [ch, width] of Object.entries(specs)) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    const bytesPerRow = Math.ceil(width / 8)
    const bitmap = new Uint8Array(bytesPerRow * 16)
    bitmap[0] = 0x80
    map.set(cp, { width, height: 16, bitmap })
  }
  return {
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}

function reveal(state: DialogBoxState): void {
  if (state.currentLineText === null) return
  state.charsRevealed = state.currentLineText.length
  state.phase = 'line-done'
}

const wide = glyphs({ 李: 16, ':': 16, 甲: 16, 乙: 16, 丙: 16 })

describe('G05-A dialog 可见文字', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('G05-A01 上框无头像时姓名在 (12,8) 为 0x8C，正文在 (44,26)', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'top', fontColor: 200 })
    appendDialogLine(state, '甲')
    reveal(state)
    drawDialogBox(fb, state, wide)
    expect(at(fb, 12, 8)).toBe(FONT_COLOR_CYAN_ALT)
    expect(at(fb, 44, 26)).toBe(200)
  })

  it('G05-A02 上框有头像时姓名改到 (80,8)，正文改到 (96,26)', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'top', portraitIcon: 3, fontColor: 200 })
    appendDialogLine(state, '甲')
    reveal(state)
    drawDialogBox(fb, state, wide)
    expect(at(fb, 80, 8)).toBe(FONT_COLOR_CYAN_ALT)
    expect(at(fb, 96, 26)).toBe(200)
    expect(at(fb, 12, 8)).toBe(0)
  })

  it('G05-A03 居中框的冒号句画在 (80,40)，不画到姓名位 (12,8)', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'center', fontColor: 200 })
    reveal(state)
    drawDialogBox(fb, state, wide)
    expect(at(fb, 80, 40)).toBe(200)
    expect(at(fb, 12, 8)).toBe(0)
  })

  it('G05-A04 charsRevealed 为 1 时只画第一个字，第二个字的位置保持 0', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('甲乙', { style: 'bottom', fontColor: 200 })
    state.charsRevealed = 1
    drawDialogBox(fb, state, wide)
    expect(at(fb, 44, 126)).toBe(200)
    expect(at(fb, 60, 126)).toBe(0)
  })

  it('G05-A05 已沉入的第二行在首行之下 18 像素，黄字与红字分行', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('"甲"', { style: 'bottom' })
    reveal(state)
    appendDialogLine(state, "'乙'")
    reveal(state)
    appendDialogLine(state, '丙')
    drawDialogBox(fb, state, wide)
    expect(at(fb, 44, 144)).toBe(FONT_COLOR_RED)
    expect(at(fb, 44, 126)).toBe(FONT_COLOR_YELLOW)
  })

  it('G05-A06 普通对话引号里的字画成黄色 0x2D，不是默认 0x4F', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('"甲"', { style: 'bottom' })
    reveal(state)
    drawDialogBox(fb, state, wide)
    expect(at(fb, 44, 126)).toBe(FONT_COLOR_YELLOW)
  })

  it('G05-A07 清正文后姓名像素还在 (12,8)，正文位回到 0', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'top', fontColor: 200 })
    appendDialogLine(state, '甲')
    reveal(state)
    resetDialogBody(state)
    drawDialogBox(fb, state, wide)
    expect(at(fb, 12, 8)).toBe(FONT_COLOR_CYAN_ALT)
    expect(at(fb, 44, 26)).toBe(0)
  })

  it('G05-A08 带引号的姓名仍画成 0x8C，不使用引号切出的黄色', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('"李":', { style: 'top', fontColor: 200 })
    drawDialogBox(fb, state, wide)
    expect(at(fb, 12, 8)).toBe(FONT_COLOR_CYAN_ALT)
    expect(at(fb, 44, 26)).toBe(0)
  })

  it('G05-A09 当前行没有逐字色时，像素用 state.fontColor 而不是 0x4F', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('甲', { style: 'bottom', fontColor: 200 })
    state.currentLineColors = undefined
    state.charsRevealed = 1
    drawDialogBox(fb, state, wide)
    expect(at(fb, 44, 126)).toBe(200)
  })

  it('G05-A10 半角字形宽 8 时，第二个字从 x+8 起画，不落到 x+16', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('AB', { style: 'bottom', fontColor: 200 })
    reveal(state)
    drawDialogBox(fb, state, glyphs({ A: 8, B: 8 }))
    expect(at(fb, 44, 126)).toBe(200)
    expect(at(fb, 52, 126)).toBe(200)
    expect(at(fb, 60, 126)).toBe(0)
  })

  it('G05-A11 姓名索引 0x8C 经 flushToCanvas 写成调色板 RGB，缓冲仍是 0x8C', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('李:', { style: 'top' })
    drawDialogBox(fb, state, wide)
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
    expect(at(fb, 12, 8)).toBe(FONT_COLOR_CYAN_ALT)
  })
})
