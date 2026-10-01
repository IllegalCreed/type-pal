/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G07-B。
 * 商店列表价读菜单快照、预览阴影和缺帧，以及卖价向下取整到 0。
 * 不重复 P04 的 123/45、现有 3 和半价 40，也不重复 glm 的空店与不可卖。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { legalPalette } from '../../__tests__/grok-render-r1/legal-host.js'
import type { IndexedImage } from '../../assets/png.js'
import { MENUITEM_COLOR, MENUITEM_COLOR_SELECTED_FIRST } from '../../core/menu/inventory-menu.js'
import { createBuyMenu } from '../../core/menu/shop-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/grok-present/font.js'
import {
  fillSentinel,
  ITEMBOX_ID,
  iconImage,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
  yellowDigit,
} from '../__tests__/grok-present/images.js'
import {
  cloneInputs,
  freezeNow,
  makeGs,
  makeItem,
  resetHostSingletons,
} from '../__tests__/grok-present/world.js'
import { createFramebuffer } from '../framebuffer.js'
import { flushToCanvas } from '../present.js'
import { drawSellOverlay, drawShopMenu } from './draw-shop.js'

const glyphs = fixtureGlyphs()

afterEach(() => {
  resetHostSingletons()
})

function withoutFrame(index: number): IndexedImage[] {
  const source = makeUiFrames()
  const frames: IndexedImage[] = []
  for (let i = 0; i < source.length; i++) {
    if (i !== index) frames[i] = source[i]!
  }
  return frames
}

describe('G07-B 商店预览像素', () => {
  it('G07-B01 列表价读 rightText 15，不读目录价 99', () => {
    const gs = makeGs()
    const bead = makeItem(31, '甲', { price: 99, bitmap: 2, flags: { sellable: true } })
    const items = [bead]
    const menu = createBuyMenu(items)
    const row = menu.list.items[0]
    if (!row) throw new Error('row missing')
    row.rightText = '15'
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, frames })
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 150, 21)
    expect(pixel(fb, rightDigitX(238, 6, 0), 26)).toBe(yellowDigit(5))
    expect(pixel(fb, rightDigitX(238, 6, 1), 26)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(238, 6, 0), 26)).not.toBe(yellowDigit(9))
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
  })

  it('G07-B02 预览物品框阴影把底色 0x5A 的低四位右移一位，正色在 (40,8)', () => {
    const gs = makeGs()
    const bead = makeItem(32, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
    const items = [bead]
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, 46, 14)).toBe(0x55)
    expect(pixel(fb, 47, 14)).toBe(SENTINEL)
    expect(pixel(fb, 40, 8)).toBe(ITEMBOX_ID)
  })

  it('G07-B03 缺少物品框帧时预览位保持底色，列表名仍画出', () => {
    const gs = makeGs()
    const bead = makeItem(33, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
    const items = [bead]
    const menu = createBuyMenu(items)
    const frames = withoutFrame(70)
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 150, 21)
    expect(pixel(fb, 40, 8)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-B04 图标表没有该 bitmap 时图标位保持底色，物品框照画', () => {
    const gs = makeGs()
    const bead = makeItem(34, '甲', { bitmap: 4, price: 10, flags: { sellable: true } })
    const items = [bead]
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const icons = new Map([[2, iconImage(0x82)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({
        fb,
        state: menu,
        gs,
        items,
        uiSpriteFrames: frames,
        itemIcons: icons,
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 48, 15)).toBe(SENTINEL)
    expect(pixel(fb, 40, 8)).toBe(ITEMBOX_ID)
  })

  it('G07-B05 列表阶段不画确认框，选中名仍在', () => {
    const gs = makeGs()
    const bead = makeItem(35, '甲', { price: 10, flags: { sellable: true } })
    const items = [bead]
    const menu = createBuyMenu(items)
    expect(menu.phase).toBe('list')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 150, 21)
    expect(pixel(fb, 140, 104)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-B06 确认阶段 confirmYes 为真时闪烁色在「是」，「否」是未选中色', () => {
    const gs = makeGs()
    const bead = makeItem(36, '甲', { price: 10, flags: { sellable: true } })
    const items = [bead]
    const menu = createBuyMenu(items)
    menu.phase = 'confirm'
    menu.confirmYes = true
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const yes = textDot('是', 0, 220, 110)
    const no = textDot('否', 0, 145, 110)
    expect(pixel(fb, yes.x, yes.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, no.x, no.y)).toBe(MENUITEM_COLOR)
  })

  it('G07-B07 不传图标表时图标位保持底色，物品框照画', () => {
    const gs = makeGs()
    const bead = makeItem(37, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
    const items = [bead]
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, 48, 15)).toBe(SENTINEL)
    expect(pixel(fb, 40, 8)).toBe(ITEMBOX_ID)
  })

  it('G07-B08 现有数只加选中物品，另一件的库存 9 不加进去', () => {
    const gs = makeGs()
    const bead = makeItem(38, '甲', { price: 10, flags: { sellable: true } })
    const other = makeItem(39, '乙', { price: 10, flags: { sellable: true } })
    const items = [bead, other]
    gs.partyMembers = [4]
    gs.inventory = [
      { itemId: bead.id, count: 5 },
      { itemId: other.id, count: 9 },
    ]
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, frames })
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(yellowDigit(5))
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).not.toBe(yellowDigit(4))
    expect(gs.inventory[1]?.count).toBe(9)
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
  })

  it('G07-B09 金钱为 0 时仍画出一位黄 0，十位保持底色', () => {
    const gs = makeGs()
    const bead = makeItem(40, '甲', { price: 10, flags: { sellable: true } })
    const items = [bead]
    gs.dwCash = 0
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(69, 6, 0), 156)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(69, 6, 1), 156)).toBe(SENTINEL)
  })

  it('G07-B10 列表项不在目录时名字照画，现有数是黄 0，图标不画', () => {
    const gs = makeGs()
    const bead = makeItem(41, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
    const menu = createBuyMenu([bead])
    const frames = makeUiFrames()
    const icons = new Map([[2, iconImage(0x82)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({
        fb,
        state: menu,
        gs,
        items: [],
        uiSpriteFrames: frames,
        itemIcons: icons,
        glyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 150, 21)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(yellowDigit(0))
    expect(pixel(fb, 48, 15)).toBe(SENTINEL)
  })

  it('G07-B11 售价 1 向下取整成黄 0，十位保持底色', () => {
    const gs = makeGs()
    const bead = makeItem(42, '甲', { price: 1, flags: { sellable: true } })
    gs.dwCash = 8
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSellOverlay({
      fb,
      gs,
      items: [bead],
      cursorItemId: bead.id,
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(pixel(fb, rightDigitX(272, 6, 0), 165)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(272, 6, 1), 165)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(272, 6, 0), 165)).not.toBe(yellowDigit(1))
  })

  it('G07-B12 库存为 0 时两个装备槽仍把现有数画成黄 2', () => {
    const gs = makeGs()
    const bead = makeItem(43, '甲', { price: 10, flags: { sellable: true, equipable: true } })
    const items = [bead]
    gs.partyMembers = [4]
    gs.inventory = []
    gs.PlayerRolesRuntime.rgwEquipment[0]![4] = bead.id
    gs.PlayerRolesRuntime.rgwEquipment[2]![4] = bead.id
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(69, 6, 1), 115)).toBe(SENTINEL)
  })

  it('G07-B13 预览物品框索引 0x6E 经 flushToCanvas 写成调色板 RGB，缓冲仍是 0x6E', () => {
    const gs = makeGs()
    const bead = makeItem(44, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
    const items = [bead]
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs })
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
  })
})
