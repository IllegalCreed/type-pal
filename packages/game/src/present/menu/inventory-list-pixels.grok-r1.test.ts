/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G06-A。
 * 物品列表的阴影半字节、数量差额、缺帧，以及用物层在目录和光标上的早退。
 * 不重复 P01 的选中色、翻页和已装备色，也不重复 P02 的现行数量 7 与攻击数字。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { legalPalette } from '../../__tests__/grok-render-r1/legal-host.js'
import type { IndexedImage } from '../../assets/png.js'
import {
  confirmInventoryItem,
  createInventoryMenu,
  MENUITEM_COLOR,
  MENUITEM_COLOR_SELECTED_FIRST,
} from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/grok-present/font.js'
import {
  BOX_STYLE0,
  BOX_STYLE1,
  cyanDigit,
  fillSentinel,
  ITEMBOX_ID,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
  SLASH_ID,
  yellowDigit,
} from '../__tests__/grok-present/images.js'
import {
  cloneInputs,
  freezeNow,
  makeGs,
  makeItem,
  makeRoles,
  resetHostSingletons,
} from '../__tests__/grok-present/world.js'
import { createFramebuffer } from '../framebuffer.js'
import { flushToCanvas } from '../present.js'
import { drawInventoryMenu } from './draw-inventory.js'

const glyphs = fixtureGlyphs()
const EQUIPMENT_NAME = 0xbe
const STAT_LABEL = 0xbb

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

function amountX(column: number, placeFromRight: number): number {
  return rightDigitX(15 + 81 + column * 100, 2, placeFromRight)
}

describe('G06-A 物品列表像素', () => {
  it('G06-A01 物品框阴影把底色 0x5A 的低四位右移一位，正色框仍在 (0,140)', () => {
    const gs = makeGs()
    const item = makeItem(11, '甲', { bitmap: 3, flags: { usable: true } })
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
    expect(pixel(fb, 5, 145)).toBe(0x55)
    expect(pixel(fb, 6, 145)).toBe(SENTINEL)
    expect(pixel(fb, 0, 140)).toBe(ITEMBOX_ID)
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, amountX(0, 0), 17)).toBe(BOX_STYLE1)
    expect(pixel(fb, amountX(0, 0), 17)).not.toBe(cyanDigit(1))
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, amountX(0, 0), 17)).toBe(cyanDigit(2))
    expect(pixel(fb, amountX(0, 1), 17)).toBe(BOX_STYLE1)
    expect(pixel(fb, amountX(0, 0), 17)).not.toBe(cyanDigit(4))
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
        glyphs,
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
    const frames = withoutFrame(69)
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, 42, 22)).toBe(BOX_STYLE1)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G06-A06 用物层现行数量为 0 时不画青色数字，物品名仍是 0xBE', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const item = makeItem(16, '甲', { flags: { usable: true } })
    const items = [item]
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    const entry = gs.inventory[0]
    if (!entry) throw new Error('inventory entry missing')
    entry.count = 0
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
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 116, 143)
    expect(pixel(fb, rightDigitX(170, 2, 0), 133)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(170, 2, 0), 133)).not.toBe(cyanDigit(0))
    expect(pixel(fb, name.x, name.y)).toBe(EQUIPMENT_NAME)
  })

  it('G06-A07 用物层选中 id 不在目录时不画属性标签，列表名仍在', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const item = makeItem(17, '甲', { flags: { usable: true } })
    const items = [item]
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    menu.selectedItemId = 999
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
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    const label = textDot('修', 0, 200, 16)
    const listed = textDot('甲', 0, 15, 12)
    expect(pixel(fb, label.x, label.y)).toBe(SENTINEL)
    expect(pixel(fb, 110, 2)).toBe(BOX_STYLE1)
    expect(pixel(fb, 110, 2)).not.toBe(BOX_STYLE0)
    expect(pixel(fb, listed.x, listed.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, label.x, label.y)).not.toBe(STAT_LABEL)
  })

  it('G06-A08 用物层光标越过队伍时不画体力，队员名仍按未选中色画出', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const item = makeItem(18, '乙', { flags: { usable: true } })
    const items = [item]
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    gs.PlayerRolesRuntime.rgwHP[0] = 12
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    const target = menu.targetMenu
    if (!target) throw new Error('target menu missing')
    target.cursor = 9
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
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 125, 16)
    expect(pixel(fb, rightDigitX(240, 4, 0), 37)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(240, 4, 0), 37)).not.toBe(yellowDigit(2))
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR)
  })

  it('G06-A09 缺少斜杠帧 39 时体力数字仍在，斜杠位保持底色', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const item = makeItem(19, '甲', { flags: { usable: true } })
    const items = [item]
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    gs.PlayerRolesRuntime.rgwHP[0] = 12
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    const frames = withoutFrame(39)
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
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 263, 38)).toBe(SENTINEL)
    expect(pixel(fb, 263, 38)).not.toBe(SLASH_ID)
    expect(pixel(fb, rightDigitX(240, 4, 0), 37)).toBe(yellowDigit(2))
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
    } finally {
      restore()
    }
    const name = textDot('丙', 0, 15, 12)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, name.x, name.y)).not.toBe(0x1c)
  })

  it('G06-A11 用物层灵力是基础加装备效果，武术行仍是武术值', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const item = makeItem(21, '甲', { flags: { usable: true } })
    const items = [item]
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 4
    gs.PlayerRolesRuntime.rgwMagicStrength[0] = 11
    gs.rgEquipmentEffect[1]!.rgwMagicStrength[0] = 6
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
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
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(240, 4, 0), 92)).toBe(yellowDigit(7))
    expect(pixel(fb, rightDigitX(240, 4, 1), 92)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(240, 4, 0), 74)).toBe(yellowDigit(4))
  })

  it('G06-A12 物品框索引 0x6E 经 flushToCanvas 写成调色板 RGB，缓冲仍是 0x6E', () => {
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs })
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
  })
})
