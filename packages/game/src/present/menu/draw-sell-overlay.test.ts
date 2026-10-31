import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createSellMenu } from '../../core/menu/sell-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { makeItem, makeLiveScene } from '../__tests__/menu-state-fixtures.js'
import {
  BOX_STYLE0,
  makeUiFrames,
  rightDigitX,
  yellowDigit,
} from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel, SENTINEL, sentinelFramebuffer } from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { shopSceneWithEquippedCopies, shopSword } from '../__tests__/shop-state-fixtures.js'
import { uniformDotGlyphs } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawSellOverlay } from './draw-shop.js'

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Sale overlay', () => {
  it('光标项非 sellable：两框照画，售价 label 与数字不画', () => {
    const gs = shopSceneWithEquippedCopies()
    const unsellable = makeItem(401, '乙', { price: 30 }) // sellable=false
    const fb = sentinelFramebuffer()
    drawSellOverlay({
      fb,
      gs,
      items: [unsellable],
      cursorItemId: 401,
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })
    // 金钱框 @(100,150) 内部 style0；金钱 label 黑点
    expect(pixel(fb, 110, 154)).toBe(BOX_STYLE0)
    // 售价框 @(224,150) 内部照画，但 label 位（字形亮点 y=164 在阴影带 156..163 之外）无字
    expect(pixel(fb, 234, 154)).toBe(BOX_STYLE0)
    expect(pixel(fb, 238, 164)).toBe(0x5a)
    expect(pixel(fb, rightDigitX(272, 6, 0), 165)).toBe(0x5a)
    // 金钱数字照画：cash 7 个位在 rightDigitX(148,6,0)=178
    expect(pixel(fb, rightDigitX(148, 6, 0), 165)).toBe(0xb7)
  })

  it('cursorItemId 缺省：售价框照画，目录有可卖物品也不画售价', () => {
    const gs = shopSceneWithEquippedCopies()
    const fb = sentinelFramebuffer()
    drawSellOverlay({
      fb,
      gs,
      items: [shopSword],
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })
    expect(pixel(fb, 238, 164)).toBe(0x5a) // 无 cursorItemId → 不画售价
    expect(pixel(fb, rightDigitX(272, 6, 0), 165)).toBe(0x5a)
  })

  it('G07-B11 售价 1 向下取整成黄 0，十位保持底色', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(42, '甲', { price: 1, flags: { sellable: true } })
    gs.dwCash = 8
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSellOverlay({
      fb,
      gs,
      items: [item],
      cursorItemId: item.id,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
    })
    expect(pixel(fb, rightDigitX(272, 6, 0), 165)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(272, 6, 1), 165)).toBe(SENTINEL)
  })

  it('P04 卖overlay画售价的一半，不执行买卖', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(31, '甲', { price: 81, flags: { sellable: true } })
    const items = [item]
    gs.dwCash = 500
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createSellMenu(gs, items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const inputs = { gs, menu, items, frames }
    const before = cloneInputs(inputs)
    drawSellOverlay({
      fb,
      gs,
      items,
      cursorItemId: menu.grid.inventory[menu.grid.cursor]?.itemId,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
    })
    expect(cloneInputs(inputs)).toEqual(before)
    expect(pixel(fb, textDot('售', 0, 234, 160).x, textDot('售', 0, 234, 160).y)).toBe(0)
    expect(pixel(fb, rightDigitX(272, 6, 0), 165)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(272, 6, 1), 165)).toBe(yellowDigit(4))

    expect(pixel(fb, rightDigitX(148, 6, 2), 165)).toBe(yellowDigit(5))
    expect(gs.inventory[0]?.count).toBe(1)
    expect(gs.dwCash).toBe(500)
  })
})
