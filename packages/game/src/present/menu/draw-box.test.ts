import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../../assets/png.js'
import { fixtureGlyphs, glyphsOf } from '../__tests__/glyph-fixtures.js'
import { BOX_STYLE0, makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import {
  fillSentinel,
  pixel,
  SENTINEL,
  sentinelFramebuffer,
  solidIndexedImage,
} from '../__tests__/raster-fixtures.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawBox, drawSingleLineBox, menuTextMaxCols } from './draw-box.js'

/**
 * 构造 9-slice 测试用 UI sprite frames。
 * 每个 tile 8×8、全不透明，颜色索引为 k+1，可区分每个槽位。
 * style 0 = idx 1-9;style 1 = idx 10-18。
 */
function distinctTileFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let k = 0; k < 18; k++) {
    const w = 8,
      h = 8
    const indices = new Uint8Array(w * h).fill(k + 1) // 以1..18区分tile，也与初始背景0区分
    const opaque = new Uint8Array(w * h).fill(1)
    frames.push({ width: w, height: h, indices, opaque })
  }
  // 仅提供两种九宫格样式的0..17帧；单行框使用独立帧准备。
  return frames
}

const widthGlyphs = glyphsOf(['甲'])

function topLeftHoleFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 9; i++) frames[i] = solidIndexedImage(8, 8, BOX_STYLE0)
  const hole = solidIndexedImage(8, 8, BOX_STYLE0)
  hole.opaque[1] = 0
  hole.indices[1] = 0
  frames[0] = hole
  return frames
}

function singleLineFrames(left: number, mid: number, right: number): IndexedImage[] {
  const frames: IndexedImage[] = []
  frames[44] = solidIndexedImage(8, 8, left)
  frames[45] = solidIndexedImage(8, 8, mid)
  frames[46] = solidIndexedImage(8, 8, right)
  return frames
}

/** 右下角块的最末一点透明。它的阴影会落到框外，相邻实点的阴影仍在。 */
function bottomRightHoleFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 9; i++) frames[i] = solidIndexedImage(8, 8, BOX_STYLE0)
  const hole = solidIndexedImage(8, 8, BOX_STYLE0)
  hole.opaque[7 * 8 + 7] = 0
  hole.indices[7 * 8 + 7] = 0
  frames[8] = hole
  return frames
}

const glyphs = fixtureGlyphs()

describe('Nine-slice geometry and frame availability', () => {
  it('画 1×1 内部 box(实际 3×3 tile)— 9 frame 全部 blit', () => {
    const fb = createFramebuffer()
    const frames = distinctTileFrames()
    drawBox({ fb, x: 0, y: 0, rows: 1, cols: 1, style: 0, shadowOffset: 0, uiSpriteFrames: frames })
    // 左上 corner tile = frame 0(idx 1)
    expect(fb.indices[0]).toBe(1)
    // 上中 tile(8,0)= frame 1(idx 2)
    expect(fb.indices[8]).toBe(2)
    // 右上 corner tile(16,0)= frame 2(idx 3)
    expect(fb.indices[16]).toBe(3)
    // 中左(0,8)= frame 3(idx 4)
    expect(fb.indices[8 * fb.width]).toBe(4)
    // 中中(8,8)= frame 4(idx 5)
    expect(fb.indices[8 * fb.width + 8]).toBe(5)
    // 右下 corner(16,16)= frame 8(idx 9)
    expect(fb.indices[16 * fb.width + 16]).toBe(9)
    expect(fb.indices[8 * fb.width + 16]).toBe(6)
    expect(fb.indices[16 * fb.width]).toBe(7)
    expect(fb.indices[16 * fb.width + 8]).toBe(8)
  })
  it('shadowOffset 6 → 阴影在 (6,6) 偏移位置应用 PAL_CalcShadowColor 到当前 fb pixel', () => {
    const fb = createFramebuffer()
    const frames = distinctTileFrames()
    fb.writePixel(39, 39, 0xab)
    drawBox({
      fb,
      x: 10,
      y: 10,
      rows: 1,
      cols: 1,
      style: 0,
      shadowOffset: 6,
      uiSpriteFrames: frames,
    })
    expect(fb.indices[10 * fb.width + 10]).toBe(1) // 正色 box 左上
    // PAL_CalcShadowColor(0xAB) = (0xAB & 0xF0) | ((0xAB & 0x0F) >> 1) = 0xA0 | (0x0B >> 1) = 0xA0 | 0x05 = 0xA5
    expect(fb.indices[39 * fb.width + 39]).toBe(0xa5)
  })
  it('style 1 → 用 frame 9-17', () => {
    const fb = createFramebuffer()
    const frames = distinctTileFrames()
    drawBox({ fb, x: 0, y: 0, rows: 1, cols: 1, style: 1, shadowOffset: 0, uiSpriteFrames: frames })
    // 左上 corner = frame 9(idx 10)
    expect(fb.indices[0]).toBe(10)
    expect(fb.indices[16 * fb.width + 16]).toBe(18) // 右下 corner = frame 17 idx 18
  })
  it('rows=2 cols=4 → 4×6 tile 网格', () => {
    const fb = createFramebuffer()
    const frames = distinctTileFrames()
    drawBox({ fb, x: 0, y: 0, rows: 2, cols: 4, style: 0, shadowOffset: 0, uiSpriteFrames: frames })
    // 顶边中间应该是 frame 1(idx 2);取多个 x 验证
    expect(fb.indices[8]).toBe(2) // 第二列顶 = m=0, n=1 = frame 1
    expect(fb.indices[16]).toBe(2) // 第三列顶
    expect(fb.indices[40]).toBe(3) // 最后列(第 6 个)顶 = m=0, n=2 = frame 2 idx 3
  })
  it('uiSpriteFrames 不足 9 个 → 抛错', () => {
    const fb = createFramebuffer()
    expect(() =>
      drawBox({ fb, x: 0, y: 0, rows: 1, cols: 1, style: 0, uiSpriteFrames: [] }),
    ).toThrow(/uiSpriteFrames\[0\] missing/)
  })
})

describe('Single-line frames and shadows', () => {
  it('drawSingleLineBox 缺 44-46 帧 → fail-loud 抛错（指名帧区间）', () => {
    const fb = sentinelFramebuffer()
    expect(() => drawSingleLineBox({ fb, x: 0, y: 0, len: 2, uiSpriteFrames: [] })).toThrowError(
      /44/,
    )
  })
  it('单行框 len 为 2 时中段重复两次，右帽在 x=24', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSingleLineBox({
      fb,
      x: 0,
      y: 0,
      len: 2,
      shadowOffset: 0,
      uiSpriteFrames: singleLineFrames(1, 2, 3),
    })
    expect(pixel(fb, 8, 0)).toBe(2)
    expect(pixel(fb, 16, 0)).toBe(2)
    expect(pixel(fb, 24, 0)).toBe(3)
    expect(pixel(fb, 32, 0)).toBe(SENTINEL)
  })
  it('单行框 shadowOffset 为 0 时 (6,8) 保持底色', () => {
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
  it('单行框默认阴影落在框身下方，低四位右移一位', () => {
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
  it('单行框 len 为 0 时没有中段，右帽紧跟左帽', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSingleLineBox({
      fb,
      x: 0,
      y: 0,
      len: 0,
      shadowOffset: 0,
      uiSpriteFrames: singleLineFrames(1, 2, 3),
    })
    expect(pixel(fb, 0, 0)).toBe(1)
    expect(pixel(fb, 8, 0)).toBe(3)
    expect(pixel(fb, 16, 0)).toBe(SENTINEL)
  })
})

describe('Nine-slice clipping and shadow control', () => {
  it('shadowOffset 0：无阴影，框右侧的阴影域保持底色', () => {
    const fb = sentinelFramebuffer()
    drawBox({
      fb,
      x: 10,
      y: 10,
      rows: 1,
      cols: 2,
      style: 0,
      shadowOffset: 0,
      uiSpriteFrames: makeUiFrames(),
    })
    expect(pixel(fb, 11, 11)).toBe(BOX_STYLE0)
    // 框到x=41；若误画offset=6的阴影，会覆盖(44,18)，但不会覆盖旧采样(44,12)。
    expect(pixel(fb, 44, 18)).toBe(SENTINEL)
  })
  it('box 越出 fb 右/下边界：裁剪不抛错，界内像素照画', () => {
    const fb = createFramebuffer(40, 24)
    fb.indices.fill(SENTINEL)
    drawBox({
      fb,
      x: 30,
      y: 14,
      rows: 2,
      cols: 4,
      style: 0,
      shadowOffset: 0,
      uiSpriteFrames: makeUiFrames(),
    })
    // 整缓冲oracle同时约束界内完整区域与框外底色。
    const expected = new Uint8Array(40 * 24).fill(SENTINEL)
    for (const y of [14, 15, 16, 17, 18, 19, 20, 21, 22, 23])
      expected.fill(BOX_STYLE0, y * 40 + 30, y * 40 + 40)
    expect(fb.indices).toEqual(expected)
  })
})

describe('Text width and glyph availability', () => {
  it('menuTextMaxCols：空表 → 1（下限）；全角 4 字 → 3；缺字形 ASCII 按 16px 计', () => {
    expect(menuTextMaxCols([], widthGlyphs)).toBe(1)
    expect(menuTextMaxCols(['甲甲甲甲'], widthGlyphs)).toBe(3) // (4*16+8)>>4=4 → 4-1
    expect(menuTextMaxCols(['甲甲'], widthGlyphs)).toBe(1) // (2*16+8)>>4=2 → 2-1，下限 1
    // 'abcdefgh' 不在 fixture 字形表 → measureText 缺字 fallback 16px/字 → (8*16+8)>>4=8 → 7
    expect(menuTextMaxCols(['abcdefgh'], widthGlyphs)).toBe(7)
  })
  it('八个半角 E 的列数是 3，不按缺字 16 像素计成 7', () => {
    expect(menuTextMaxCols(['EEEEEEEE'], glyphs)).toBe(3)
  })
  it('列数取最长的一项，短项不把列数抬高', () => {
    expect(menuTextMaxCols(['甲', '甲甲甲甲'], glyphs)).toBe(3)
    expect(menuTextMaxCols(['甲甲甲甲', '甲'], glyphs)).toBe(3)
    expect(menuTextMaxCols(['甲'], glyphs)).toBe(1)
  })
})

describe('Nine-slice masks and zero-size content', () => {
  it('角块透明孔不写像素，旁边的不透明点仍是框色', () => {
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
      uiSpriteFrames: topLeftHoleFrames(),
    })
    expect(pixel(fb, 1, 0)).toBe(SENTINEL)
    expect(pixel(fb, 0, 0)).toBe(BOX_STYLE0)
    expect(pixel(fb, 2, 0)).toBe(BOX_STYLE0)
  })
  it('右下角透明孔不投下阴影，旁边实点的阴影仍把底色变暗', () => {
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
      uiSpriteFrames: bottomRightHoleFrames(),
    })
    expect(pixel(fb, 29, 29)).toBe(SENTINEL)
    expect(pixel(fb, 28, 29)).toBe(0x55)
  })
  it('style 1 缺少 frame 9 时抛错并指名该帧', () => {
    const fb = createFramebuffer()
    const frames = topLeftHoleFrames()
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
  it('内容行数为 0 时只留上下两边，y=16 保持底色', () => {
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
  it('内容列数为 0 时只留左右两边，x=16 保持底色', () => {
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
  it('不透明且索引为 0 的块仍覆盖底色', () => {
    const frames: IndexedImage[] = []
    for (let i = 0; i < 9; i++) frames[i] = solidIndexedImage(8, 8, 0)
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
})
