/**
 * TEST-GLM-PHASE1-LEAVES-3 L12（draw-box.ts）— 去重表：
 *  - draw-box.test（1×1 box/style1/2×4 网格/shadowOffset 6 阴影计算/9 帧缺失抛错）→ 不重复
 *  - 新差异：drawSingleLineBox 缺帧 fail-loud、shadowOffset 0 无阴影、box 越出 fb 右/下边裁剪
 *    不抛错、menuTextMaxCols 空表→1、ASCII 半角与 CJK 全角量化分叉。
 */
import { describe, expect, it } from 'vitest'
import {
  BOX_STYLE0,
  fixtureGlyphs,
  makeUiFrames,
  newFb,
  pixel,
  SENTINEL,
  solidImage,
  TILE,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawBox, drawSingleLineBox, menuTextMaxCols } from './draw-box.js'

describe('L12 drawBox / drawSingleLineBox 剩余合同', () => {
  it('drawSingleLineBox 缺 44-46 帧 → fail-loud 抛错（指名帧区间）', () => {
    const fb = newFb()
    expect(() => drawSingleLineBox({ fb, x: 0, y: 0, len: 2, uiSpriteFrames: [] })).toThrowError(
      /44/,
    )
  })

  it('shadowOffset 0：无阴影，(x+6,y+6) 保持底色', () => {
    const fb = newFb()
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
    // 阴影本应落在 box 区域右下 (+6)：style0 素色图无差异可辨 → 用 box 外一点验证未被改
    expect(pixel(fb, 10 + TILE * 4 + 2, 10 + 2)).toBe(SENTINEL) // box 右侧 2 列内容之外
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
    expect(pixel(fb, 31, 15)).toBe(BOX_STYLE0) // 界内
    // 越界部分不写（writePixel 边界检查），无异常即合同
    expect(fb.indices.every((v) => v === BOX_STYLE0 || v === SENTINEL)).toBe(true)
  })

  it('menuTextMaxCols：空表 → 1（下限）；全角 4 字 → 3；缺字形 ASCII 按 16px 计', () => {
    expect(menuTextMaxCols([], fixtureGlyphs)).toBe(1)
    expect(menuTextMaxCols(['甲甲甲甲'], fixtureGlyphs)).toBe(3) // (4*16+8)>>4=4 → 4-1
    expect(menuTextMaxCols(['甲甲'], fixtureGlyphs)).toBe(1) // (2*16+8)>>4=2 → 2-1，下限 1
    // 'abcdefgh' 不在 fixture 字形表 → measureText 缺字 fallback 16px/字 → (8*16+8)>>4=8 → 7
    expect(menuTextMaxCols(['abcdefgh'], fixtureGlyphs)).toBe(7)
  })
})

describe('L12 solidImage 语义（本队列 fixture 自检）', () => {
  it('素色图 opaque 全 1，blit 后整片覆盖', () => {
    const img = solidImage(TILE, TILE, BOX_STYLE0)
    expect(img.opaque.every((v) => v === 1)).toBe(true)
    expect(img.indices.every((v) => v === BOX_STYLE0)).toBe(true)
  })
})
