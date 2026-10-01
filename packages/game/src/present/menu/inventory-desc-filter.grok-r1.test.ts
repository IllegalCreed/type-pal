/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G06-B。
 * 物品描述的第二行行距、scriptDesc 0、noDesc，以及 sellable / potion / important 过滤色。
 * 不重复 P02 的单行「诀」，也不重复 P01 的 usable 过滤六色。
 */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { setGlobalEvents } from '../../core/event-system.js'
import {
  createInventoryMenu,
  MENUITEM_COLOR_EQUIPPEDITEM,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
} from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/grok-present/font.js'
import {
  BOX_STYLE1,
  cyanDigit,
  fillSentinel,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
} from '../__tests__/grok-present/images.js'
import {
  cloneInputs,
  freezeNow,
  makeGs,
  makeItem,
  resetHostSingletons,
} from '../__tests__/grok-present/world.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInventoryMenu } from './draw-inventory.js'

const glyphs = fixtureGlyphs()
const DESC = 0x3c

afterEach(() => {
  resetHostSingletons()
})

function amountX(column: number, placeFromRight: number): number {
  return rightDigitX(15 + 81 + column * 100, 2, placeFromRight)
}

describe('G06-B 物品描述与过滤', () => {
  it('G06-B01 第二条描述在 y=167，第一条仍在 y=151', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '甲', label: 'L_52001' },
      { op: 'showDialog', messageIndex: 2, text: '乙' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const item = makeItem(31, '丙', { scriptDesc: 52001, flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const first = textDot('甲', 0, 71, 151)
    const second = textDot('乙', 0, 71, 167)
    expect(pixel(fb, second.x, second.y)).toBe(DESC)
    expect(pixel(fb, first.x, first.y)).toBe(DESC)
  })

  it('G06-B02 scriptDesc 为 0 时不画 L_0 上的描述，物品名照画', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '甲', label: 'L_0' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const item = makeItem(32, '乙', { scriptDesc: 0, flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, frames })
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const desc = textDot('甲', 0, 71, 151)
    const name = textDot('乙', 0, 15, 12)
    expect(pixel(fb, desc.x, desc.y)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
  })

  it('G06-B03 列表相 noDesc 为真时省略描述，选中名仍在', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '诀', label: 'L_52003' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const item = makeItem(33, '甲', { scriptDesc: 52003, flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({
        fb,
        state: menu,
        items,
        uiSpriteFrames: frames,
        glyphs,
        noDesc: true,
      })
    } finally {
      restore()
    }
    const desc = textDot('诀', 0, 71, 151)
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, desc.x, desc.y)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(menu.phase).toBe('list')
  })

  it('G06-B04 描述跟光标上的物品走，不画另一件的脚本', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '丙', label: 'L_52011' },
      { op: 'end' },
      { op: 'showDialog', messageIndex: 2, text: '丁', label: 'L_52012' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const first = makeItem(34, '甲', { scriptDesc: 52011, flags: { usable: true } })
    const second = makeItem(35, '乙', { scriptDesc: 52012, flags: { usable: true } })
    const items = [first, second]
    gs.inventory = [
      { itemId: first.id, count: 1 },
      { itemId: second.id, count: 1 },
    ]
    const menu = createInventoryMenu(gs, items, 'all')
    menu.cursor = 1
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const other = textDot('丙', 0, 71, 151)
    const current = textDot('丁', 0, 71, 151)
    expect(pixel(fb, current.x, current.y)).toBe(DESC)
    expect(pixel(fb, other.x, other.y)).toBe(SENTINEL)
  })

  it('G06-B05 sellable 过滤把可卖项画成可选色，不可卖项画成暗色', () => {
    const gs = makeGs()
    const sold = makeItem(36, '甲', { flags: { sellable: true } })
    const kept = makeItem(37, '乙', { flags: { sellable: false } })
    const items = [sold, kept]
    gs.inventory = [
      { itemId: sold.id, count: 1 },
      { itemId: kept.id, count: 1 },
    ]
    const menu = createInventoryMenu(gs, items, 'sellable')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const yes = textDot('甲', 0, 15, 12)
    const no = textDot('乙', 0, 115, 12)
    expect(pixel(fb, yes.x, yes.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, no.x, no.y)).toBe(MENUITEM_COLOR_INACTIVE)
  })

  it('G06-B06 第三列数量起点含两格 100 像素，个位落在 x=302', () => {
    const gs = makeGs()
    const names = ['甲', '乙', '丙'] as const
    const items = names.map((name, index) =>
      makeItem(40 + index, name, { flags: { usable: true } }),
    )
    gs.inventory = items.map((item, index) => ({
      itemId: item.id,
      count: index === 2 ? 8 : 1,
    }))
    const menu = createInventoryMenu(gs, items, 'all')
    menu.cursor = 2
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, amountX(2, 0), 17)).toBe(cyanDigit(8))
    expect(pixel(fb, amountX(0, 0), 17)).toBe(BOX_STYLE1)
    expect(pixel(fb, textDot('丙', 0, 215, 12).x, textDot('丙', 0, 215, 12).y)).toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
  })

  it('G06-B07 potion 过滤只把可用且非投掷的物品画成可选色', () => {
    const gs = makeGs()
    const potion = makeItem(46, '甲', { flags: { usable: true } })
    const thrown = makeItem(47, '乙', { flags: { usable: true, throwable: true } })
    const items = [potion, thrown]
    gs.inventory = [
      { itemId: potion.id, count: 1 },
      { itemId: thrown.id, count: 1 },
    ]
    const menu = createInventoryMenu(gs, items, 'potion')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const yes = textDot('甲', 0, 15, 12)
    const no = textDot('乙', 0, 115, 12)
    expect(pixel(fb, yes.x, yes.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, no.x, no.y)).toBe(MENUITEM_COLOR_INACTIVE)
  })

  it('G06-B08 important 过滤把可卖物品画成暗色，不可卖且不可装备的画成可选色', () => {
    const gs = makeGs()
    const quest = makeItem(48, '甲')
    const sold = makeItem(49, '乙', { flags: { sellable: true } })
    const items = [quest, sold]
    gs.inventory = [
      { itemId: quest.id, count: 1 },
      { itemId: sold.id, count: 1 },
    ]
    const menu = createInventoryMenu(gs, items, 'important')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const yes = textDot('甲', 0, 15, 12)
    const no = textDot('乙', 0, 115, 12)
    expect(pixel(fb, yes.x, yes.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, no.x, no.y)).toBe(MENUITEM_COLOR_INACTIVE)
  })

  it('G06-B09 件数等于占用且不为 0 时选中项是暗选色，不是已装备色', () => {
    const gs = makeGs()
    const item = makeItem(50, '甲', { flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 3 }]
    const menu = createInventoryMenu(gs, items, 'usable')
    const slot = menu.inventory[0]
    if (!slot) throw new Error('slot missing')
    slot.inUse = 3
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_INACTIVE)
    expect(pixel(fb, name.x, name.y)).not.toBe(MENUITEM_COLOR_EQUIPPEDITEM)
    expect(pixel(fb, name.x, name.y)).not.toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G06-B10 差额 10 在第一列同时画出青色十位和个位', () => {
    const gs = makeGs()
    const item = makeItem(51, '甲', { flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 10 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, amountX(0, 0), 17)).toBe(cyanDigit(0))
    expect(pixel(fb, amountX(0, 1), 17)).toBe(cyanDigit(1))
    expect(pixel(fb, amountX(0, 1), 17)).not.toBe(BOX_STYLE1)
  })
})
