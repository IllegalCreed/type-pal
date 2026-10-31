import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { freezeMenuClock } from '../../__tests__/menu-clock-fixture.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createInitialGameState, type GameState } from '../../core/game-state.js'
import {
  createInventoryMenu,
  inventoryMoveRight,
  inventoryPageDown,
  MENUITEM_COLOR,
  MENUITEM_COLOR_EQUIPPEDITEM,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
} from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { freezeNow, makeGs, makeItem } from '../__tests__/menu-state-fixtures.js'
import {
  BOX_STYLE1,
  CURSOR_ID,
  cyanDigit,
  ITEMBOX_ID,
  makeUiFrames,
  rightDigitX,
  uiFramesWithoutSlot,
} from '../__tests__/menu-ui-fixtures.js'
import {
  fillSentinel,
  iconImage,
  pixel,
  SENTINEL,
  sentinelFramebuffer,
} from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { uniformDotGlyphs, uniformTextDot } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInventoryMenu } from './draw-inventory.js'

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

const NAMES = '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥'

function inventoryWithEntries(entries: { itemId: number; count: number }[]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = entries
  return gs
}

function quantityDigitX(column: number, placeFromRight: number): number {
  return rightDigitX(15 + 81 + column * 100, 2, placeFromRight)
}

function labelOf(name: string, column: number, row: number) {
  return textDot(name, 0, 15 + column * 100, 12 + row * 18)
}

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Inventory list and filters', () => {
  it('库存条目 itemId 不在 catalog 且被选中：label ?id（tofu 顶行）+ SELECTED_INACTIVE 0x1C', () => {
    const gs = inventoryWithEntries([{ itemId: 999, count: 3 }])
    const state = createInventoryMenu(gs, [], 'all')
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawInventoryMenu({
        fb,
        state,
        items: [],
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
      })
    } finally {
      restore()
    }
    // 光标默认在 0（该未知条目）：isUsable false + isSelected → 0x1C；label 首 tofu 像素 (15,12)
    expect(pixel(fb, 15, 12)).toBe(0x1c)
  })

  it('未知项与可用项混列：未知 0x18（未选中），可用项被选中 0xF9', () => {
    const herb = makeItem(10, '甲', { flags: { usable: true, consuming: true } })
    const gs = inventoryWithEntries([
      { itemId: 999, count: 1 },
      { itemId: 10, count: 1 },
    ])
    const state = createInventoryMenu(gs, [herb], 'usable')
    state.cursor = 1
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawInventoryMenu({
        fb,
        state,
        items: [herb],
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
        itemIcons: new Map(),
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 15, 12)).toBe(0x18) // 未知项未选中 → INACTIVE
    const herbDot = uniformTextDot(0, 15 + 100, 12) // 第 2 列
    expect(pixel(fb, herbDot.x, herbDot.y)).toBe(0xf9)
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, quantityDigitX(2, 0), 17)).toBe(cyanDigit(8))
    expect(pixel(fb, quantityDigitX(0, 0), 17)).toBe(BOX_STYLE1)
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_INACTIVE)
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, quantityDigitX(0, 0), 17)).toBe(cyanDigit(0))
    expect(pixel(fb, quantityDigitX(0, 1), 17)).toBe(cyanDigit(1))
  })

  it('G06-A02 差额等于 1 时不画青色数量，选中名仍用闪烁色', () => {
    const gs = makeGs()
    const item = makeItem(12, '甲', { flags: { usable: true } })
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
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, quantityDigitX(0, 0), 17)).toBe(BOX_STYLE1)

    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G06-A03 列表数量用 count 减 inUse，4 件占用 2 件只画青色 2', () => {
    const gs = makeGs()
    const item = makeItem(13, '甲', { flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 4 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const slot = menu.inventory[0]
    if (!slot) throw new Error('slot missing')
    slot.inUse = 2
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, frames })
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, quantityDigitX(0, 0), 17)).toBe(cyanDigit(2))
    expect(pixel(fb, quantityDigitX(0, 1), 17)).toBe(BOX_STYLE1)

    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
  })

  it('G06-A04 图标表没有 bitmap 时图标位保持底色，物品框照画', () => {
    const gs = makeGs()
    const item = makeItem(14, '甲', { bitmap: 9, flags: { usable: true } })
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
        itemIcons: new Map(),
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 8, 147)).toBe(SENTINEL)
    expect(pixel(fb, 0, 140)).toBe(ITEMBOX_ID)
  })

  it('G06-A05 缺少光标帧 69 时名字照画，光标位留着列表框色', () => {
    const gs = makeGs()
    const item = makeItem(15, '甲', { flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = uiFramesWithoutSlot(69)
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, 42, 22)).toBe(BOX_STYLE1)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G06-A10 过滤为 all 时 usable 为假的物品仍按可选色画，不进暗色', () => {
    const gs = makeGs()
    const item = makeItem(20, '丙', { flags: { usable: false } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 2 }]
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
    const name = textDot('丙', 0, 15, 12)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

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
        glyphs: positionGlyphs,
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
    drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
      expect(cloneInputs(inputs)).toEqual(beforeFirst)
      const first = labelOf('甲', 0, 0)
      const ninth = labelOf('癸', 0, 0)
      expect(pixel(fb, first.x, first.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
      expect(pixel(fb, ninth.x, ninth.y)).not.toBe(MENUITEM_COLOR)

      inventoryMoveRight(menu)
      fillSentinel(fb)
      const beforeMove = cloneInputs(inputs)
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
      expect(cloneInputs(inputs)).toEqual(beforeMove)
      const second = labelOf('乙', 1, 0)
      expect(pixel(fb, second.x, second.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
      expect(pixel(fb, first.x, first.y)).toBe(MENUITEM_COLOR)
      expect(pixel(fb, 42, 22)).not.toBe(CURSOR_ID)
      expect(pixel(fb, 142, 22)).toBe(CURSOR_ID)

      inventoryPageDown(menu)
      fillSentinel(fb)
      const beforePage = cloneInputs(inputs)
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
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
    const blocked = makeItem(10, '甲')
    const potion = makeItem(11, '乙', { flags: { usable: true } })
    const bead = makeItem(12, '丙', {
      flags: {
        usable: true,
        equipable: true,
        equipableBy: [false, true, false, false, false, false],
      },
    })
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
    const before = cloneInputs({ gs, menu, items, frames })
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)

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
  })
})
