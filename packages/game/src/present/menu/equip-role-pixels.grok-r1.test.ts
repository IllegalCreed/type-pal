/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G06-C。
 * 装备选人页的单人框高、结束相、缺目录、越界光标、数量 0 和灵力预览。
 * 不重复 P03 的攻击预览与六槽名，也不重复 glm 的未知已装备 `?id`。
 */
import { afterEach, describe, expect, it } from 'vitest'
import type { GameState } from '../../core/game-state.js'
import {
  confirmEquipItem,
  createEquipMenu,
  type EquipMenuState,
} from '../../core/menu/equip-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/grok-present/font.js'
import {
  BOX_STYLE0,
  cyanDigit,
  fillSentinel,
  iconImage,
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
  makeRoles,
  resetHostSingletons,
} from '../__tests__/grok-present/world.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawEquipMenu } from './draw-equip.js'

const glyphs = fixtureGlyphs()
const CONFIRMED = 0x2c
const BY_FIRST: [boolean, boolean, boolean, boolean, boolean, boolean] = [
  true,
  false,
  false,
  false,
  false,
  false,
]

afterEach(() => {
  resetHostSingletons()
})

function sword() {
  return makeItem(60, '甲', {
    bitmap: 6,
    flags: { equipable: true, equipableBy: BY_FIRST },
  })
}

function openPick(gs: GameState, party: number[]): EquipMenuState {
  gs.partyMembers = party
  gs.inventory = [{ itemId: 60, count: 3 }]
  const items = [sword()]
  const roles = makeRoles()
  const menu = createEquipMenu(gs, items)
  confirmEquipItem(menu, items, roles, gs.partyMembers)
  return menu
}

describe('G06-C 装备选人像素', () => {
  it('G06-C01 一人队伍仍画出一行内容框，底边在 y=111', () => {
    const gs = makeGs()
    const items = [sword()]
    const roles = makeRoles()
    const menu = openPick(gs, [0])
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
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
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 15, 108)
    expect(pixel(fb, 2, 111)).toBe(BOX_STYLE0)
    expect(pixel(fb, 2, 119)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(0xf9)
  })

  it('G06-C02 phase 为 done 时整屏保持底色', () => {
    const gs = makeGs()
    const item = sword()
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 2 }]
    const menu = createEquipMenu(gs, items)
    menu.phase = 'done'
    const frames = makeUiFrames()
    const roles = makeRoles()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, roles, frames })
    drawEquipMenu({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs,
    })
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, name.x, name.y)).toBe(SENTINEL)
    expect(pixel(fb, 42, 22)).toBe(SENTINEL)
    expect(pixel(fb, 16, 16)).toBe(SENTINEL)
    expect(cloneInputs({ gs, menu, items, roles, frames })).toEqual(before)
  })

  it('G06-C03 selectedItemId 未定义时不铺装备背景', () => {
    const gs = makeGs()
    const items = [sword()]
    gs.partyMembers = [0, 1]
    gs.inventory = [{ itemId: 60, count: 1 }]
    const menu = createEquipMenu(gs, items)
    menu.phase = 'pick-role'
    const frames = makeUiFrames()
    const roles = makeRoles()
    const equipBg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x55) }
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawEquipMenu({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs,
      equipBg,
    })
    expect(menu.selectedItemId).toBeUndefined()
    expect(pixel(fb, 1, 1)).toBe(SENTINEL)
    expect(pixel(fb, 1, 1)).not.toBe(0x55)
  })

  it('G06-C04 选中 id 不在目录时同样不铺背景也不画图标', () => {
    const gs = makeGs()
    const items = [sword()]
    gs.partyMembers = [0, 1]
    gs.inventory = [{ itemId: 60, count: 1 }]
    const menu = createEquipMenu(gs, items)
    menu.phase = 'pick-role'
    menu.selectedItemId = 404
    const frames = makeUiFrames()
    const roles = makeRoles()
    const equipBg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x55) }
    const icons = new Map([[6, iconImage(0x86)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawEquipMenu({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs,
      equipBg,
      itemIcons: icons,
    })
    expect(pixel(fb, 1, 1)).toBe(SENTINEL)
    expect(pixel(fb, 16, 16)).toBe(SENTINEL)
  })

  it('G06-C05 角色光标越过队伍时图标已画，攻击数字不画', () => {
    const gs = makeGs()
    const items = [sword()]
    const roles = makeRoles()
    const menu = openPick(gs, [0, 1])
    menu.playerCursor = 5
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 23
    const frames = makeUiFrames()
    const icons = new Map([[6, iconImage(0x86)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
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
    } finally {
      restore()
    }
    expect(pixel(fb, 16, 16)).toBe(0x86)
    expect(pixel(fb, rightDigitX(260, 4, 0), 14)).toBe(SENTINEL)
    expect(pixel(fb, 2, 95)).toBe(SENTINEL)
  })

  it('G06-C06 现行数量为 0 时不画青色数字，物品名仍是确认色', () => {
    const gs = makeGs()
    const items = [sword()]
    const roles = makeRoles()
    const menu = openPick(gs, [0, 1])
    const entry = gs.inventory[0]
    if (!entry) throw new Error('inventory entry missing')
    entry.count = 0
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
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
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 5, 70)
    expect(pixel(fb, rightDigitX(51, 2, 0), 57)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(51, 2, 0), 57)).not.toBe(cyanDigit(0))
    expect(pixel(fb, name.x, name.y)).toBe(CONFIRMED)
  })

  it('G06-C07 灵力预览在 y=36，是基础加效果；武术行仍是武术值', () => {
    const gs = makeGs()
    const items = [sword()]
    const roles = makeRoles()
    const menu = openPick(gs, [0, 1])
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 20
    gs.PlayerRolesRuntime.rgwMagicStrength[0] = 11
    gs.rgEquipmentEffect[1]!.rgwMagicStrength[0] = 6
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
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
      })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(260, 4, 0), 36)).toBe(cyanDigit(7))
    expect(pixel(fb, rightDigitX(260, 4, 1), 36)).toBe(cyanDigit(1))
    expect(pixel(fb, rightDigitX(260, 4, 0), 14)).toBe(cyanDigit(0))
    expect(pixel(fb, rightDigitX(260, 4, 1), 14)).toBe(cyanDigit(2))
  })

  it('G06-C08 防御预览在 y=58，取防御基础值', () => {
    const gs = makeGs()
    const items = [sword()]
    const roles = makeRoles()
    const menu = openPick(gs, [0, 1])
    gs.PlayerRolesRuntime.rgwDefense[0] = 31
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawEquipMenu({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(pixel(fb, rightDigitX(260, 4, 0), 58)).toBe(cyanDigit(1))
    expect(pixel(fb, rightDigitX(260, 4, 1), 58)).toBe(cyanDigit(3))
  })

  it('G06-C09 身法为一位数时只画个位，高位保持底色', () => {
    const gs = makeGs()
    const items = [sword()]
    const roles = makeRoles()
    const menu = openPick(gs, [0, 1])
    gs.PlayerRolesRuntime.rgwDexterity[0] = 8
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawEquipMenu({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(pixel(fb, rightDigitX(260, 4, 0), 80)).toBe(cyanDigit(8))
    expect(pixel(fb, rightDigitX(260, 4, 1), 80)).toBe(SENTINEL)
  })

  it('G06-C10 吉运预览在 y=102', () => {
    const gs = makeGs()
    const items = [sword()]
    const roles = makeRoles()
    const menu = openPick(gs, [0, 1])
    gs.PlayerRolesRuntime.rgwFleeRate[0] = 46
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawEquipMenu({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(pixel(fb, rightDigitX(260, 4, 0), 102)).toBe(cyanDigit(6))
    expect(pixel(fb, rightDigitX(260, 4, 1), 102)).toBe(cyanDigit(4))
  })

  it('G06-C11 数量读 gs 现行库存 8，列表快照仍是确认时的 3', () => {
    const gs = makeGs()
    const items = [sword()]
    const roles = makeRoles()
    const menu = openPick(gs, [0, 1])
    const entry = gs.inventory[0]
    const snap = menu.list.inventory[0]
    if (!entry || !snap) throw new Error('inventory entry missing')
    entry.count = 8
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, roles, frames })
    drawEquipMenu({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(pixel(fb, rightDigitX(51, 2, 0), 57)).toBe(cyanDigit(8))
    expect(pixel(fb, rightDigitX(51, 2, 0), 57)).not.toBe(cyanDigit(3))
    expect(snap.count).toBe(3)
    expect(entry.count).toBe(8)
    expect(cloneInputs({ gs, menu, items, roles, frames })).toEqual(before)
  })
})
