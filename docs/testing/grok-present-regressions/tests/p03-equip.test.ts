import { afterEach, describe, expect, it } from 'vitest'
import {
  confirmEquipItem,
  createEquipMenu,
  equipMoveDown,
} from '../../../../packages/game/src/core/menu/equip-menu.js'
import {
  MENUITEM_COLOR,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
} from '../../../../packages/game/src/core/menu/inventory-menu.js'
import { createFramebuffer } from '../../../../packages/game/src/present/framebuffer.js'
import { drawEquipMenu } from '../../../../packages/game/src/present/menu/draw-equip.js'
import { fixtureGlyphs, textDot } from '../fixtures/font.js'
import {
  cyanDigit,
  fillSentinel,
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

const glyphs = fixtureGlyphs()
const CONFIRMED = 0x2c
const SLOT_NAMES = ['子', '丑', '寅', '卯', '辰', '巳'] as const
const SLOT_POS = [
  { x: 130, y: 11 },
  { x: 130, y: 33 },
  { x: 130, y: 55 },
  { x: 130, y: 77 },
  { x: 130, y: 99 },
  { x: 130, y: 121 },
] as const

afterEach(() => {
  resetHostSingletons()
})

describe('P03 装备绘制', () => {
  it('P03 装备列表里不可装备项是暗色，可装备项保持可选色', () => {
    const gs = makeGs()
    const sword = makeItem(41, '甲', { flags: { equipable: true, usable: true } })
    const herb = makeItem(42, '乙', { flags: { usable: true } })
    gs.inventory = [
      { itemId: sword.id, count: 2 },
      { itemId: herb.id, count: 2 },
    ]
    const items = [sword, herb]
    const menu = createEquipMenu(gs, items)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, frames })
    const restore = freezeNow(0)
    try {
      drawEquipMenu({
        fb,
        state: menu,
        gs,
        playerRoles: makeRoles(),
        items,
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
    expect(pixel(fb, textDot('甲', 0, 15, 12).x, textDot('甲', 0, 15, 12).y)).toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
    expect(pixel(fb, textDot('乙', 0, 115, 12).x, textDot('乙', 0, 115, 12).y)).toBe(
      MENUITEM_COLOR_INACTIVE,
    )
    expect(pixel(fb, textDot('乙', 0, 115, 12).x, textDot('乙', 0, 115, 12).y)).not.toBe(
      MENUITEM_COLOR,
    )
  })

  it('P03 选人页画出六槽名称、选中图标、数量、预览攻击和背景', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const worn = SLOT_NAMES.map((name, slot) =>
      makeItem(50 + slot, name, { bitmap: 7, flags: { equipable: true } }),
    )
    const other = makeItem(58, '午', { bitmap: 7, flags: { equipable: true } })
    const sword = makeItem(40, '剑', {
      bitmap: 6,
      flags: {
        equipable: true,
        equipableBy: [false, false, false, false, true, false],
      },
    })
    gs.partyMembers = [4, 1]
    gs.inventory = [{ itemId: sword.id, count: 3 }]
    for (let slot = 0; slot < 6; slot++)
      gs.PlayerRolesRuntime.rgwEquipment[slot]![4] = worn[slot]!.id
    gs.PlayerRolesRuntime.rgwEquipment[0]![1] = other.id
    gs.PlayerRolesRuntime.rgwAttackStrength[4] = 20
    gs.rgEquipmentEffect[2]!.rgwAttackStrength[4] = 3
    gs.PlayerRolesRuntime.rgwAttackStrength[1] = 5
    const items = [...worn, other, sword]
    const menu = createEquipMenu(gs, items)
    confirmEquipItem(menu, items, roles, gs.partyMembers)
    expect(menu.phase).toBe('pick-role')
    const frames = makeUiFrames()
    const icons = new Map([[6, iconImage(0x86)]])
    const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x55) }
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, roles, frames, icons })
    const restore = freezeNow(0)
    try {
      drawEquipMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        items,
        uiSpriteFrames: frames,
        glyphs,
        itemIcons: icons,
      })
      expect(pixel(fb, 1, 1)).toBe(SENTINEL)
      fillSentinel(fb)
      drawEquipMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        items,
        uiSpriteFrames: frames,
        glyphs,
        itemIcons: icons,
        equipBg: bg,
      })
      drawEquipMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        items,
        uiSpriteFrames: frames,
        glyphs,
        itemIcons: icons,
        equipBg: bg,
      })
    } finally {
      restore()
    }
    expect(cloneInputs({ gs, menu, items, roles, frames, icons })).toEqual(before)
    expect(pixel(fb, 1, 1)).toBe(0x55)
    expect(pixel(fb, 16, 16)).toBe(0x86)
    expect(pixel(fb, textDot('剑', 0, 5, 70).x, textDot('剑', 0, 5, 70).y)).toBe(CONFIRMED)
    expect(pixel(fb, rightDigitX(51, 2, 0), 57)).toBe(cyanDigit(3))
    for (let slot = 0; slot < 6; slot++) {
      const pos = SLOT_POS[slot]!
      const dot = textDot(SLOT_NAMES[slot]!, 0, pos.x, pos.y)
      expect(pixel(fb, dot.x, dot.y)).toBe(MENUITEM_COLOR)
    }
    expect(pixel(fb, rightDigitX(260, 4, 0), 14)).toBe(cyanDigit(3))
    expect(pixel(fb, rightDigitX(260, 4, 1), 14)).toBe(cyanDigit(2))
    const can = textDot('戊', 0, 15, 108)
    const cannot = textDot('乙', 0, 15, 126)
    expect(pixel(fb, can.x, can.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, cannot.x, cannot.y)).toBe(MENUITEM_COLOR_INACTIVE)

    equipMoveDown(menu)
    fillSentinel(fb)
    const moved = cloneInputs({ gs, menu, items, roles, frames, icons })
    drawEquipMenu({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs,
      itemIcons: icons,
      equipBg: bg,
    })
    expect(cloneInputs({ gs, menu, items, roles, frames, icons })).toEqual(moved)
    expect(pixel(fb, textDot('午', 0, 130, 11).x, textDot('午', 0, 130, 11).y)).toBe(MENUITEM_COLOR)
    expect(pixel(fb, textDot('子', 0, 130, 11).x, textDot('子', 0, 130, 11).y)).not.toBe(
      MENUITEM_COLOR,
    )
    expect(pixel(fb, rightDigitX(260, 4, 0), 14)).toBe(cyanDigit(5))
    expect(pixel(fb, textDot('乙', 0, 15, 126).x, textDot('乙', 0, 15, 126).y)).toBe(
      MENUITEM_COLOR_SELECTED_INACTIVE,
    )
    expect(pixel(fb, textDot('戊', 0, 15, 108).x, textDot('戊', 0, 15, 108).y)).toBe(MENUITEM_COLOR)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![4]).toBe(worn[0]!.id)
  })
})
