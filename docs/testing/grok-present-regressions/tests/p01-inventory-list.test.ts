import { afterEach, describe, expect, it } from 'vitest'
import {
  createInventoryMenu,
  inventoryMoveRight,
  inventoryPageDown,
  MENUITEM_COLOR,
  MENUITEM_COLOR_EQUIPPEDITEM,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
} from '../../../../packages/game/src/core/menu/inventory-menu.js'
import { createFramebuffer } from '../../../../packages/game/src/present/framebuffer.js'
import { drawInventoryMenu } from '../../../../packages/game/src/present/menu/draw-inventory.js'
import { fixtureGlyphs, textDot } from '../fixtures/font.js'
import {
  BOX_STYLE1,
  CURSOR_HOLE,
  CURSOR_ID,
  cyanDigit,
  fillSentinel,
  ITEMBOX_ID,
  iconImage,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
} from '../fixtures/images.js'
import {
  cloneInputs,
  freezeNow,
  makeGs,
  makeItem,
  makeRoles,
  resetHostSingletons,
} from '../fixtures/world.js'

const NAMES = '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥'
const glyphs = fixtureGlyphs()

afterEach(() => {
  resetHostSingletons()
})

function labelOf(name: string, column: number, row: number) {
  return textDot(name, 0, 15 + column * 100, 12 + row * 18)
}

describe('P01 物品列表', () => {
  it('P01 非空列表把可用物品名、光标不透明0与透明孔画进真实Framebuffer', () => {
    const gs = makeGs()
    const item = makeItem(11, '甲', { bitmap: 3, flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const icons = new Map([[3, iconImage(0x83)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    const inputs = { gs, menu, items, frames, icons }
    const before = cloneInputs(inputs)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({
        fb,
        state: menu,
        items,
        uiSpriteFrames: frames,
        itemIcons: icons,
        glyphs,
      })
    } finally {
      restore()
    }
    expect(cloneInputs(inputs)).toEqual(before)

    const name = labelOf('甲', 0, 0)
    const other = textDot('乙', 0, 15, 12)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, name.x + 1, name.y)).toBe(0)
    expect(pixel(fb, other.x, other.y)).not.toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, 40, 22)).toBe(0)
    expect(pixel(fb, 41, 22)).toBe(BOX_STYLE1)
    expect(pixel(fb, 41, 22)).not.toBe(CURSOR_HOLE)
    expect(pixel(fb, 42, 22)).toBe(CURSOR_ID)
    expect(pixel(fb, 0, 140)).toBe(ITEMBOX_ID)
    expect(pixel(fb, 8, 147)).toBe(0x83)
    expect(pixel(fb, 300, 190)).toBe(SENTINEL)
  })

  it('P01 空列表不画物品名，光标仍停在默认格', () => {
    const gs = makeGs()
    const items: ReturnType<typeof makeItem>[] = []
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const inputs = { gs, menu, items, frames }
    const before = cloneInputs(inputs)
    drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    expect(cloneInputs(inputs)).toEqual(before)

    const name = labelOf('甲', 0, 0)
    expect(pixel(fb, name.x, name.y)).toBe(BOX_STYLE1)
    expect(pixel(fb, 42, 22)).toBe(CURSOR_ID)
    expect(pixel(fb, 8, 147)).toBe(SENTINEL)
  })

  it('P01 多于一页后首页物品让出左上格，右移光标换到下一列', () => {
    const gs = makeGs()
    const items = [...NAMES].map((name, index) =>
      makeItem(100 + index, name, { bitmap: 1, flags: { usable: true } }),
    )
    gs.inventory = items.map((item) => ({ itemId: item.id, count: 1 }))
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    const inputs = { gs, menu, items, frames }
    try {
      const beforeFirst = cloneInputs(inputs)
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
      expect(cloneInputs(inputs)).toEqual(beforeFirst)
      const first = labelOf('甲', 0, 0)
      const ninth = labelOf('癸', 0, 0)
      expect(pixel(fb, first.x, first.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
      expect(pixel(fb, ninth.x, ninth.y)).not.toBe(MENUITEM_COLOR)

      inventoryMoveRight(menu)
      fillSentinel(fb)
      const beforeMove = cloneInputs(inputs)
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
      expect(cloneInputs(inputs)).toEqual(beforeMove)
      const second = labelOf('乙', 1, 0)
      expect(pixel(fb, second.x, second.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
      expect(pixel(fb, first.x, first.y)).toBe(MENUITEM_COLOR)
      expect(pixel(fb, 42, 22)).not.toBe(CURSOR_ID)
      expect(pixel(fb, 142, 22)).toBe(CURSOR_ID)

      inventoryPageDown(menu)
      fillSentinel(fb)
      const beforePage = cloneInputs(inputs)
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
      expect(cloneInputs(inputs)).toEqual(beforePage)
    } finally {
      restore()
    }
    const paged = labelOf('癸', 0, 0)
    const hidden = labelOf('甲', 0, 0)
    expect(menu.cursor).toBe(21)
    expect(pixel(fb, paged.x, paged.y)).toBe(MENUITEM_COLOR)
    expect(pixel(fb, hidden.x, hidden.y)).not.toBe(MENUITEM_COLOR)
    expect(pixel(fb, hidden.x, hidden.y)).not.toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('P01 不可用、可用数量与已装备虚拟条目用不同色和数字', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const blocked = makeItem(10, '甲')
    const potion = makeItem(11, '乙', { flags: { usable: true } })
    const bead = makeItem(12, '丙', { flags: { usable: true } })
    gs.partyMembers = [1]
    gs.inventory = [
      { itemId: blocked.id, count: 1 },
      { itemId: potion.id, count: 5 },
    ]
    gs.PlayerRolesRuntime.rgwEquipment[0]![1] = bead.id
    const items = [blocked, potion, bead]
    const menu = createInventoryMenu(gs, items, 'usable')
    expect(menu.inventory.map((slot) => slot.itemId)).toEqual([10, 11, 12])
    expect(menu.inventory[2]).toEqual({ itemId: 12, count: 0, inUse: -1 })

    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, roles, frames })
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(cloneInputs({ gs, menu, items, roles, frames })).toEqual(before)

    expect(pixel(fb, labelOf('甲', 0, 0).x, labelOf('甲', 0, 0).y)).toBe(
      MENUITEM_COLOR_SELECTED_INACTIVE,
    )
    expect(pixel(fb, labelOf('乙', 1, 0).x, labelOf('乙', 1, 0).y)).toBe(MENUITEM_COLOR)
    expect(pixel(fb, labelOf('丙', 2, 0).x, labelOf('丙', 2, 0).y)).toBe(
      MENUITEM_COLOR_EQUIPPEDITEM,
    )
    const ones = rightDigitX(15 + 81 + 100, 2, 0)
    const tens = rightDigitX(15 + 81 + 100, 2, 1)
    expect(pixel(fb, ones, 17)).toBe(cyanDigit(5))
    expect(pixel(fb, tens, 17)).toBe(SENTINEL)
    expect(pixel(fb, labelOf('乙', 1, 0).x, labelOf('乙', 1, 0).y)).not.toBe(
      MENUITEM_COLOR_INACTIVE,
    )
  })
})
