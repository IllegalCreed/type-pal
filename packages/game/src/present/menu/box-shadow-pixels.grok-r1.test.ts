/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G07-C。
 * 九宫格透明孔、单行框的节数和默认阴影，以及列数取最长一项。
 * 不重复旧测的 1×1 九帧、0xAB 阴影和 style 0 缺帧，也不重复 glm 的越界裁剪。
 */
import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../../assets/png.js'
import { fixtureGlyphs } from '../__tests__/grok-present/font.js'
import {
  BOX_STYLE0,
  fillSentinel,
  makeUiFrames,
  pixel,
  SENTINEL,
  solidImage,
} from '../__tests__/grok-present/images.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawBox, drawSingleLineBox, menuTextMaxCols } from './draw-box.js'

const glyphs = fixtureGlyphs()

function holeFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 9; i++) frames[i] = solidImage(8, 8, BOX_STYLE0)
  const hole = solidImage(8, 8, BOX_STYLE0)
  hole.opaque[1] = 0
  hole.indices[1] = 0
  frames[0] = hole
  return frames
}

/** 右下角块的最末一点透明。它的阴影会落到框外，相邻实点的阴影仍在。 */
function cornerHoleFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 9; i++) frames[i] = solidImage(8, 8, BOX_STYLE0)
  const hole = solidImage(8, 8, BOX_STYLE0)
  hole.opaque[7 * 8 + 7] = 0
  hole.indices[7 * 8 + 7] = 0
  frames[8] = hole
  return frames
}

function lineFrames(left: number, mid: number, right: number): IndexedImage[] {
  const frames: IndexedImage[] = []
  frames[44] = solidImage(8, 8, left)
  frames[45] = solidImage(8, 8, mid)
  frames[46] = solidImage(8, 8, right)
  return frames
}

describe('G07-C 菜单框像素', () => {
  it('G07-C01 角块透明孔不写像素，旁边的不透明点仍是框色', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBox({
      fb,
      x: 0,
      y: 0,
      rows: 1,
      cols: 1,
      style: 0,
      shadowOffset: 0,
      uiSpriteFrames: holeFrames(),
    })
    expect(pixel(fb, 1, 0)).toBe(SENTINEL)
    expect(pixel(fb, 0, 0)).toBe(BOX_STYLE0)
    expect(pixel(fb, 2, 0)).toBe(BOX_STYLE0)
  })

  it('G07-C02 单行框 len 为 2 时中段重复两次，右帽在 x=24', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSingleLineBox({
      fb,
      x: 0,
      y: 0,
      len: 2,
      shadowOffset: 0,
      uiSpriteFrames: lineFrames(1, 2, 3),
    })
    expect(pixel(fb, 8, 0)).toBe(2)
    expect(pixel(fb, 16, 0)).toBe(2)
    expect(pixel(fb, 24, 0)).toBe(3)
    expect(pixel(fb, 32, 0)).toBe(SENTINEL)
  })

  it('G07-C03 单行框 shadowOffset 为 0 时 (6,8) 保持底色', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSingleLineBox({
      fb,
      x: 0,
      y: 0,
      len: 1,
      shadowOffset: 0,
      uiSpriteFrames: makeUiFrames(),
    })
    expect(pixel(fb, 6, 8)).toBe(SENTINEL)
    expect(pixel(fb, 0, 0)).toBe(BOX_STYLE0)
  })

  it('G07-C04 单行框默认阴影落在框身下方，低四位右移一位', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSingleLineBox({
      fb,
      x: 0,
      y: 0,
      len: 1,
      uiSpriteFrames: makeUiFrames(),
    })
    expect(pixel(fb, 6, 8)).toBe(0x55)
    expect(pixel(fb, 6, 14)).toBe(SENTINEL)
    expect(pixel(fb, 0, 0)).toBe(BOX_STYLE0)
  })

  it('G07-C05 右下角透明孔不投下阴影，旁边实点的阴影仍把底色变暗', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBox({
      fb,
      x: 0,
      y: 0,
      rows: 1,
      cols: 1,
      style: 0,
      shadowOffset: 6,
      uiSpriteFrames: cornerHoleFrames(),
    })
    expect(pixel(fb, 29, 29)).toBe(SENTINEL)
    expect(pixel(fb, 28, 29)).toBe(0x55)
  })

  it('G07-C06 style 1 缺少 frame 9 时抛错并指名该帧', () => {
    const fb = createFramebuffer()
    const frames = holeFrames()
    expect(() =>
      drawBox({
        fb,
        x: 0,
        y: 0,
        rows: 1,
        cols: 1,
        style: 1,
        shadowOffset: 0,
        uiSpriteFrames: frames,
      }),
    ).toThrow(/uiSpriteFrames\[9\] missing/)
  })

  it('G07-C07 八个半角 E 的列数是 3，不按缺字 16 像素计成 7', () => {
    expect(menuTextMaxCols(['EEEEEEEE'], glyphs)).toBe(3)
    expect(menuTextMaxCols(['EEEEEEEE'], glyphs)).not.toBe(7)
  })

  it('G07-C08 内容行数为 0 时只留上下两边，y=16 保持底色', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBox({
      fb,
      x: 0,
      y: 0,
      rows: 0,
      cols: 1,
      style: 0,
      shadowOffset: 0,
      uiSpriteFrames: makeUiFrames(),
    })
    expect(pixel(fb, 0, 16)).toBe(SENTINEL)
    expect(pixel(fb, 0, 0)).toBe(BOX_STYLE0)
    expect(pixel(fb, 0, 8)).toBe(BOX_STYLE0)
  })

  it('G07-C09 内容列数为 0 时只留左右两边，x=16 保持底色', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBox({
      fb,
      x: 0,
      y: 0,
      rows: 1,
      cols: 0,
      style: 0,
      shadowOffset: 0,
      uiSpriteFrames: makeUiFrames(),
    })
    expect(pixel(fb, 16, 0)).toBe(SENTINEL)
    expect(pixel(fb, 0, 0)).toBe(BOX_STYLE0)
    expect(pixel(fb, 8, 0)).toBe(BOX_STYLE0)
  })

  it('G07-C10 不透明且索引为 0 的块仍覆盖底色', () => {
    const frames: IndexedImage[] = []
    for (let i = 0; i < 9; i++) frames[i] = solidImage(8, 8, 0)
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBox({
      fb,
      x: 0,
      y: 0,
      rows: 1,
      cols: 1,
      style: 0,
      shadowOffset: 0,
      uiSpriteFrames: frames,
    })
    expect(pixel(fb, 0, 0)).toBe(0)
    expect(pixel(fb, 24, 0)).toBe(SENTINEL)
  })

  it('G07-C11 列数取最长的一项，短项不把列数抬高', () => {
    expect(menuTextMaxCols(['甲', '甲甲甲甲'], glyphs)).toBe(3)
    expect(menuTextMaxCols(['甲甲甲甲', '甲'], glyphs)).toBe(3)
    expect(menuTextMaxCols(['甲'], glyphs)).toBe(1)
  })

  it('G07-C12 单行框 len 为 0 时没有中段，右帽紧跟左帽', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSingleLineBox({
      fb,
      x: 0,
      y: 0,
      len: 0,
      shadowOffset: 0,
      uiSpriteFrames: lineFrames(1, 2, 3),
    })
    expect(pixel(fb, 0, 0)).toBe(1)
    expect(pixel(fb, 8, 0)).toBe(3)
    expect(pixel(fb, 16, 0)).toBe(SENTINEL)
  })
})
