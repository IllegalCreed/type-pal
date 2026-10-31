import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { legalPalette } from '../../__tests__/asset-fixtures.js'
import { dumpFramebuffer } from '../../__tests__/grok-render-r1/dump-evidence.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createInventoryMenu } from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs } from '../__tests__/glyph-fixtures.js'
import { freezeNow, makeGs, makeItem } from '../__tests__/menu-state-fixtures.js'
import { ITEMBOX_ID, makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel } from '../__tests__/raster-fixtures.js'
import { createFramebuffer } from '../framebuffer.js'
import { flushToCanvas } from '../present.js'
import { drawInventoryMenu } from './draw-inventory.js'

const positionGlyphs = fixtureGlyphs()

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Inventory canvas output', () => {
  it('G06-A12 物品框索引 0x6E 经 flushToCanvas 写成调色板 RGB，缓冲仍是 0x6E', async () => {
    const gs = makeGs()
    const item = makeItem(22, '甲', { flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const palette = legalPalette((colors) => {
      colors[ITEMBOX_ID] = [110, 7, 14]
    })
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) throw new Error('2d context unavailable')
    flushToCanvas(fb, ctx2d, palette)
    expect(Array.from(ctx2d.getImageData(0, 140, 1, 1).data)).toEqual([110, 7, 14, 255])
    expect(pixel(fb, 0, 140)).toBe(ITEMBOX_ID)
    const snap = ctx2d.getImageData(0, 0, 320, 200)
    await dumpFramebuffer('G06-A12', 320, 200, snap.data, [
      { x: 0, y: 140, rgba: [110, 7, 14, 255] },
    ])
  })
})
