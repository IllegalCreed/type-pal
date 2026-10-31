import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { legalPalette } from '../../__tests__/asset-fixtures.js'
import { dumpFramebuffer } from '../../__tests__/grok-render-r1/dump-evidence.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createBuyMenu } from '../../core/menu/shop-menu.js'
import { fixtureGlyphs } from '../__tests__/glyph-fixtures.js'
import { freezeNow, makeItem, makeLiveScene } from '../__tests__/menu-state-fixtures.js'
import { ITEMBOX_ID, makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel } from '../__tests__/raster-fixtures.js'
import { createFramebuffer } from '../framebuffer.js'
import { flushToCanvas } from '../present.js'
import { drawShopMenu } from './draw-shop.js'

const positionGlyphs = fixtureGlyphs()

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Shop canvas output', () => {
  it('G07-B13 预览物品框索引 0x6E 经 flushToCanvas 写成调色板 RGB，缓冲仍是 0x6E', async () => {
    const { gs } = makeLiveScene()
    const item = makeItem(44, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
    const items = [item]
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const palette = legalPalette((colors) => {
      colors[ITEMBOX_ID] = [40, 18, 70]
    })
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) throw new Error('2d context unavailable')
    flushToCanvas(fb, ctx2d, palette)
    expect(Array.from(ctx2d.getImageData(40, 8, 1, 1).data)).toEqual([40, 18, 70, 255])
    expect(pixel(fb, 40, 8)).toBe(ITEMBOX_ID)
    const snap = ctx2d.getImageData(0, 0, 320, 200)
    await dumpFramebuffer('G07-B13', 320, 200, snap.data, [
      { x: 40, y: 8, rgba: [40, 18, 70, 255] },
    ])
  })
})
