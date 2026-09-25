import { afterEach, describe, expect, it } from 'vitest'
import {
  MENUITEM_COLOR,
  MENUITEM_COLOR_SELECTED_FIRST,
} from '../../../../packages/game/src/core/menu/inventory-menu.js'
import { createSellMenu } from '../../../../packages/game/src/core/menu/sell-menu.js'
import { createBuyMenu, shopSelectItem } from '../../../../packages/game/src/core/menu/shop-menu.js'
import { createFramebuffer } from '../../../../packages/game/src/present/framebuffer.js'
import {
  drawSellOverlay,
  drawShopMenu,
} from '../../../../packages/game/src/present/menu/draw-shop.js'
import { fixtureGlyphs, textDot } from '../fixtures/font.js'
import {
  fillSentinel,
  iconImage,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
  yellowDigit,
} from '../fixtures/images.js'
import { cloneInputs, freezeNow, makeGs, makeItem, resetHostSingletons } from '../fixtures/world.js'

const glyphs = fixtureGlyphs()

afterEach(() => {
  resetHostSingletons()
})

describe('P04 商店', () => {
  it('P04 买列表、确认层、现有量和金钱用不同哨兵', () => {
    const gs = makeGs()
    const bead = makeItem(31, '甲', { bitmap: 2, price: 123, flags: { sellable: true } })
    const herb = makeItem(32, '乙', { bitmap: 8, price: 45, flags: { sellable: true } })
    gs.partyMembers = [4]
    gs.dwCash = 500
    gs.inventory = [{ itemId: bead.id, count: 2 }]
    gs.PlayerRolesRuntime.rgwEquipment[1]![4] = bead.id
    const items = [bead, herb]
    const menu = createBuyMenu(items)
    expect(shopSelectItem(menu, items, gs.dwCash)).toBe(true)
    expect(menu.phase).toBe('confirm')
    expect(menu.confirmYes).toBe(false)
    const frames = makeUiFrames()
    const icons = new Map([[2, iconImage(0x82)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, frames, icons })
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, itemIcons: icons, glyphs })
    } finally {
      restore()
    }
    expect(cloneInputs({ gs, menu, items, frames, icons })).toEqual(before)
    expect(gs.dwCash).toBe(500)
    expect(gs.inventory[0]?.count).toBe(2)

    expect(pixel(fb, textDot('甲', 0, 150, 21).x, textDot('甲', 0, 150, 21).y)).toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
    expect(pixel(fb, textDot('乙', 0, 150, 39).x, textDot('乙', 0, 150, 39).y)).toBe(MENUITEM_COLOR)
    expect(pixel(fb, rightDigitX(238, 6, 0), 26)).toBe(yellowDigit(3))
    expect(pixel(fb, rightDigitX(238, 6, 1), 26)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(238, 6, 2), 26)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(238, 6, 0), 44)).toBe(yellowDigit(5))
    expect(pixel(fb, 48, 15)).toBe(0x82)
    expect(pixel(fb, textDot('现', 0, 30, 110).x, textDot('现', 0, 30, 110).y)).toBe(0)
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(yellowDigit(3))
    expect(pixel(fb, textDot('金', 0, 30, 151).x, textDot('金', 0, 30, 151).y)).toBe(0)
    expect(pixel(fb, rightDigitX(69, 6, 2), 156)).toBe(yellowDigit(5))
    expect(pixel(fb, textDot('否', 0, 145, 110).x, textDot('否', 0, 145, 110).y)).toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
    expect(pixel(fb, textDot('是', 0, 220, 110).x, textDot('是', 0, 220, 110).y)).toBe(
      MENUITEM_COLOR,
    )
    expect(pixel(fb, 300, 190)).toBe(SENTINEL)
  })

  it('P04 卖overlay画售价的一半，不执行买卖', () => {
    const gs = makeGs()
    const bead = makeItem(31, '甲', { price: 81, flags: { sellable: true } })
    const items = [bead]
    gs.dwCash = 500
    gs.inventory = [{ itemId: bead.id, count: 1 }]
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
      glyphs,
    })
    expect(cloneInputs(inputs)).toEqual(before)
    expect(pixel(fb, textDot('售', 0, 234, 160).x, textDot('售', 0, 234, 160).y)).toBe(0)
    expect(pixel(fb, rightDigitX(272, 6, 0), 165)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(272, 6, 1), 165)).toBe(yellowDigit(4))
    expect(pixel(fb, rightDigitX(272, 6, 1), 165)).not.toBe(yellowDigit(8))
    expect(pixel(fb, rightDigitX(148, 6, 2), 165)).toBe(yellowDigit(5))
    expect(gs.inventory[0]?.count).toBe(1)
    expect(gs.dwCash).toBe(500)
  })
})
