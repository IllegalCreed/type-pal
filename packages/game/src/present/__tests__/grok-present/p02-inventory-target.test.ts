import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { setGlobalEvents } from '../../../core/event-system.js'
import {
  confirmInventoryItem,
  createInventoryMenu,
  MENUITEM_COLOR,
  MENUITEM_COLOR_SELECTED_FIRST,
} from '../../../core/menu/inventory-menu.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawInventoryMenu } from '../../menu/draw-inventory.js'
import { fixtureGlyphs, textDot } from './font.js'
import {
  cyanDigit,
  fillSentinel,
  iconImage,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
  yellowDigit,
} from './images.js'
import {
  cloneInputs,
  freezeNow,
  makeGs,
  makeItem,
  makeRoles,
  resetHostSingletons,
} from './world.js'

const glyphs = fixtureGlyphs()
const DESC_COLOR = 0x3c
const EQUIPMENT_NAME_COLOR = 0xbe

afterEach(() => {
  resetHostSingletons()
})

describe('P02 物品目标', () => {
  it('P02 使用目标数量读gs现行库存而不是开菜单时的快照', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const item = makeItem(21, '甲', { bitmap: 4, flags: { usable: true, consuming: true } })
    const items = [item]
    gs.partyMembers = [4, 1]
    gs.inventory = [{ itemId: item.id, count: 4 }]
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    expect(menu.phase).toBe('use-target')
    expect(menu.inventory[0]?.count).toBe(4)
    const entry = gs.inventory[0]
    if (!entry) throw new Error('inventory entry missing')
    entry.count = 7

    const frames = makeUiFrames()
    const icons = new Map([[4, iconImage(0x84)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    const inputs = { gs, menu, items, roles, frames, icons }
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
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    expect(cloneInputs(inputs)).toEqual(before)
    expect(menu.inventory[0]?.count).toBe(4)
    expect(gs.inventory[0]?.count).toBe(7)

    const ones = rightDigitX(170, 2, 0)
    const tens = rightDigitX(170, 2, 1)
    expect(pixel(fb, ones, 133)).toBe(cyanDigit(7))
    expect(pixel(fb, tens, 133)).toBe(SENTINEL)
    expect(pixel(fb, ones, 133)).not.toBe(cyanDigit(4))
    expect(pixel(fb, 127, 88)).toBe(0x84)
  })

  it('P02 两人队按队伍顺序显示姓名、当前HP与含装备的攻击', () => {
    const gs = makeGs()
    const roles = makeRoles()
    roles.roles[4]!.attackStrength = 1
    roles.roles[1]!.attackStrength = 1
    const item = makeItem(21, '甲', { flags: { usable: true } })
    const items = [item]
    gs.partyMembers = [4, 1]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    gs.PlayerRolesRuntime.rgwMaxHP[4] = 80
    gs.PlayerRolesRuntime.rgwMP[4] = 7
    gs.PlayerRolesRuntime.rgwMaxMP[4] = 40
    gs.PlayerRolesRuntime.rgwLevel[4] = 6
    gs.PlayerRolesRuntime.rgwAttackStrength[4] = 20
    gs.rgEquipmentEffect[0]!.rgwAttackStrength[4] = 3
    gs.PlayerRolesRuntime.rgwHP[1] = 34
    gs.PlayerRolesRuntime.rgwAttackStrength[1] = 5
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    expect(menu.targetMenu?.items.map((member) => member.id)).toEqual([4, 1])

    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const inputs = { gs, menu, items, roles, frames }
    const before = cloneInputs(inputs)
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
    expect(cloneInputs(inputs)).toEqual(before)

    const first = textDot('戊', 0, 125, 16)
    const second = textDot('乙', 0, 125, 36)
    const swapped = textDot('乙', 0, 125, 16)
    expect(pixel(fb, first.x, first.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(pixel(fb, second.x, second.y)).toBe(MENUITEM_COLOR)
    expect(pixel(fb, swapped.x, swapped.y)).not.toBe(MENUITEM_COLOR_SELECTED_FIRST)

    expect(pixel(fb, rightDigitX(240, 4, 0), 37)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(240, 4, 1), 37)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(261, 4, 1), 40)).toBe(0xd8)
    expect(pixel(fb, rightDigitX(240, 4, 0), 55)).toBe(yellowDigit(7))
    expect(pixel(fb, rightDigitX(240, 4, 0), 74)).toBe(yellowDigit(3))
    expect(pixel(fb, rightDigitX(240, 4, 1), 74)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(240, 4, 0), 74)).not.toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(240, 4, 0), 20)).toBe(yellowDigit(6))
    const itemName = textDot('甲', 0, 116, 143)
    expect(pixel(fb, itemName.x, itemName.y)).toBe(EQUIPMENT_NAME_COLOR)
  })

  it('P02 noDesc不关闭目标层，只省略物品描述', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '诀', label: 'L_51001' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const roles = makeRoles()
    const item = makeItem(21, '甲', {
      scriptDesc: 51001,
      flags: { usable: true },
    })
    const items = [item]
    gs.partyMembers = [4, 1]
    gs.inventory = [{ itemId: item.id, count: 2 }]
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    const menu = createInventoryMenu(gs, items, 'usable')
    const frames = makeUiFrames()
    const desc = textDot('诀', 0, 71, 151)
    const listed = createFramebuffer()
    fillSentinel(listed)
    const restore = freezeNow(0)
    try {
      const listedInputs = { gs, menu, items, frames }
      const beforeListed = cloneInputs(listedInputs)
      drawInventoryMenu({
        fb: listed,
        state: menu,
        items,
        uiSpriteFrames: frames,
        glyphs,
        noDesc: false,
      })
      expect(cloneInputs(listedInputs)).toEqual(beforeListed)
      expect(pixel(listed, desc.x, desc.y)).toBe(DESC_COLOR)

      confirmInventoryItem(menu, items, roles, gs.partyMembers)
      expect(menu.phase).toBe('use-target')
      const targeted = createFramebuffer()
      fillSentinel(targeted)
      const targetedInputs = { gs, menu, items, roles, frames }
      const before = cloneInputs(targetedInputs)
      drawInventoryMenu({
        fb: targeted,
        state: menu,
        items,
        uiSpriteFrames: frames,
        glyphs,
        gs,
        playerRoles: roles,
        noDesc: true,
      })
      expect(cloneInputs(targetedInputs)).toEqual(before)
      expect(pixel(targeted, desc.x, desc.y)).toBe(SENTINEL)
      expect(pixel(targeted, textDot('戊', 0, 125, 16).x, textDot('戊', 0, 125, 16).y)).toBe(
        MENUITEM_COLOR_SELECTED_FIRST,
      )
      expect(pixel(targeted, rightDigitX(240, 4, 0), 37)).toBe(yellowDigit(2))
    } finally {
      restore()
    }
  })
})
