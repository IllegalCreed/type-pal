import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { MENUITEM_COLOR, MENUITEM_COLOR_SELECTED_FIRST } from '../../core/menu/inventory-menu.js'
import { createBuyMenu, shopMoveDown, shopSelectItem } from '../../core/menu/shop-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { freezeNow, makeItem, makeLiveScene } from '../__tests__/menu-state-fixtures.js'
import {
  ITEMBOX_ID,
  makeUiFrames,
  rightDigitX,
  uiFramesWithoutSlot,
  yellowDigit,
} from '../__tests__/menu-ui-fixtures.js'
import {
  fillSentinel,
  iconImage,
  pixel,
  SENTINEL,
  sentinelFramebuffer,
} from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { shopSceneWithEquippedCopies, shopSword } from '../__tests__/shop-state-fixtures.js'
import { uniformDotGlyphs } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawShopMenu } from './draw-shop.js'

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Shop buying', () => {
  it('ownedCount = 库存2 + 队员[4,1]各一件 = 4，非队员装备不计入', () => {
    const gs = shopSceneWithEquippedCopies()
    const state = createBuyMenu([shopSword])
    const fb = sentinelFramebuffer()
    drawShopMenu({
      fb,
      state,
      gs,
      items: [shopSword],
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })
    // 「现有」数 right 6 位：个位在 rightDigitX(69,6,0)=99
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(0xb4)
  })

  it('空店铺列表：框与两单行框照画，owned 0、无图标、不崩', () => {
    const gs = shopSceneWithEquippedCopies()
    const state = createBuyMenu([])
    const fb = sentinelFramebuffer()
    drawShopMenu({
      fb,
      state,
      gs,
      items: [shopSword], // 全局目录有物品,但本店没有列表项
      itemIcons: new Map([[shopSword.bitmap, iconImage(0x82)]]),
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })
    expect(pixel(fb, 130, 16)).toBe(0x22) // style1 列表框内部
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(0xb0) // owned 0
    expect(pixel(fb, 48, 15)).toBe(0x5a) // 无选中 → 预览图标未画
  })

  it('G07-B01 目录与快照不一致的防御输入：列表价读 rightText 15，不读目录价 99', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(31, '甲', { price: 99, bitmap: 2, flags: { sellable: true } })
    const items = [item]
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
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 150, 21)
    expect(pixel(fb, rightDigitX(238, 6, 0), 26)).toBe(yellowDigit(5))
    expect(pixel(fb, rightDigitX(238, 6, 1), 26)).toBe(yellowDigit(1))
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
  })

  it('G07-B02 预览物品框阴影把底色 0x5A 的低四位右移一位，正色在 (40,8)', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(32, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
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
    expect(pixel(fb, 46, 14)).toBe(0x55)
    expect(pixel(fb, 47, 14)).toBe(SENTINEL)
    expect(pixel(fb, 40, 8)).toBe(ITEMBOX_ID)
  })

  it('G07-B03 缺少物品框帧时预览位保持底色，列表名仍画出', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(33, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
    const items = [item]
    const menu = createBuyMenu(items)
    const frames = uiFramesWithoutSlot(70)
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 150, 21)
    expect(pixel(fb, 40, 8)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-B04 图标表没有该 bitmap 时图标位保持底色，物品框照画', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(34, '甲', { bitmap: 4, price: 10, flags: { sellable: true } })
    const items = [item]
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
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 48, 15)).toBe(SENTINEL)
    expect(pixel(fb, 40, 8)).toBe(ITEMBOX_ID)
  })

  it('G07-B05 列表阶段不画确认框，选中名仍在', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(35, '甲', { price: 10, flags: { sellable: true } })
    const items = [item]
    const menu = createBuyMenu(items)
    expect(menu.phase).toBe('list')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 150, 21)
    expect(pixel(fb, 140, 104)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-B06 确认阶段 confirmYes 为真时闪烁色在「是」，「否」是未选中色', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(36, '甲', { price: 10, flags: { sellable: true } })
    const items = [item]
    const menu = createBuyMenu(items)
    gs.dwCash = 10
    expect(shopSelectItem(menu, items, gs.dwCash)).toBe(true)
    shopMoveDown(menu) // dispatchShopMenu 的 Right/Down 都走此入口
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const yes = textDot('是', 0, 220, 110)
    const no = textDot('否', 0, 145, 110)
    expect(pixel(fb, yes.x, yes.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, no.x, no.y)).toBe(MENUITEM_COLOR)
  })

  it('G07-B07 不传图标表时图标位保持底色，物品框照画', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(37, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
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
    expect(pixel(fb, 48, 15)).toBe(SENTINEL)
    expect(pixel(fb, 40, 8)).toBe(ITEMBOX_ID)
  })

  it('G07-B08 现有数只加选中物品，另一件的库存 9 不加进去', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(38, '甲', { price: 10, flags: { sellable: true } })
    const other = makeItem(39, '乙', { price: 10, flags: { sellable: true } })
    const items = [item, other]
    gs.partyMembers = [4]
    gs.inventory = [
      { itemId: item.id, count: 5 },
      { itemId: other.id, count: 9 },
    ]
    const menu = createBuyMenu(items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, frames })
    const restore = freezeNow(0)
    try {
      drawShopMenu({ fb, state: menu, gs, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(yellowDigit(5))
    expect(gs.inventory[1]?.count).toBe(9)
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
  })

  it('G07-B09 金钱为 0 时仍画出一位黄 0，十位保持底色', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(40, '甲', { price: 10, flags: { sellable: true } })
    const items = [item]
    gs.dwCash = 0
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
    expect(pixel(fb, rightDigitX(69, 6, 0), 156)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(69, 6, 1), 156)).toBe(SENTINEL)
  })

  it('G07-B10 列表项不在目录时名字照画，现有数是黄 0，图标不画', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(41, '甲', { bitmap: 2, price: 10, flags: { sellable: true } })
    const menu = createBuyMenu([item])
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
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 150, 21)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(yellowDigit(0))
    expect(pixel(fb, 48, 15)).toBe(SENTINEL)
  })

  it('G07-B12 无库存时两位队员的手部装备仍把现有数画成黄2', () => {
    const { gs } = makeLiveScene()
    const item = makeItem(43, '甲', {
      price: 10,
      flags: {
        sellable: true,
        equipable: true,
        equipableBy: [false, true, false, false, true, false],
      },
    })
    const items = [item]
    gs.partyMembers = [4, 1]
    gs.inventory = []
    gs.PlayerRolesRuntime.rgwEquipment[3]![4] = item.id
    gs.PlayerRolesRuntime.rgwEquipment[3]![1] = item.id
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
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(69, 6, 1), 115)).toBe(SENTINEL)
  })

  it('P04 买列表、确认层、现有量和金钱用不同哨兵', () => {
    const { gs } = makeLiveScene([4])
    const item = makeItem(31, '甲', {
      bitmap: 2,
      price: 123,
      flags: {
        sellable: true,
        equipable: true,
        equipableBy: [false, false, false, false, true, false],
      },
    })
    const otherItem = makeItem(32, '乙', { bitmap: 8, price: 45, flags: { sellable: true } })
    gs.dwCash = 500
    gs.inventory = [{ itemId: item.id, count: 2 }]
    gs.PlayerRolesRuntime.rgwEquipment[1]![4] = item.id
    const items = [item, otherItem]
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
      drawShopMenu({
        fb,
        state: menu,
        gs,
        items,
        uiSpriteFrames: frames,
        itemIcons: icons,
        glyphs: positionGlyphs,
      })
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
})
