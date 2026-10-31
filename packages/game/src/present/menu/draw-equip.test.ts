/** Equipment inventory, role selection and read-only pixel contracts. Synthetic glyphs distinguish positions, not original artwork. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { freezeMenuClock } from '../../__tests__/menu-clock-fixture.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import type { GameState } from '../../core/game-state.js'
import {
  confirmEquipItem,
  createEquipMenu,
  type EquipMenuState,
  equipMoveDown,
} from '../../core/menu/equip-menu.js'
import {
  MENUITEM_COLOR,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
} from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import {
  freezeNow,
  makeGs,
  makeItem,
  makeLiveScene,
  makeRoles,
} from '../__tests__/menu-state-fixtures.js'
import { BOX_STYLE0, cyanDigit, makeUiFrames, rightDigitX } from '../__tests__/menu-ui-fixtures.js'
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
import { drawEquipMenu } from './draw-equip.js'

const uniformGlyphs = uniformDotGlyphs()
const positionGlyphs = fixtureGlyphs()
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
const BY_FIRST: [boolean, boolean, boolean, boolean, boolean, boolean] = [
  true,
  false,
  false,
  false,
  false,
  false,
]
const roleThreeSword = makeItem(500, '丁', {
  flags: { equipable: true, equipableBy: [false, false, false, true, false, false] }, // 仅 role 3 可装
})
function sceneWithRoleThreeSword() {
  const { gs, roles } = makeLiveScene([3, 1])
  gs.inventory = [{ itemId: 500, count: 1 }]
  return { gs, roles }
}
function firstRoleSword() {
  return makeItem(60, '甲', {
    bitmap: 6,
    flags: { equipable: true, equipableBy: BY_FIRST },
  })
}
function openFirstRolePicker(gs: GameState, party: number[]): EquipMenuState {
  gs.partyMembers = party
  gs.inventory = [{ itemId: 60, count: 3 }]
  const items = [firstRoleSword()]
  const menu = createEquipMenu(gs, items)
  confirmEquipItem(menu, items)
  return menu
}
let restoreMenuText: () => void
beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})
afterEach(() => {
  restoreMenuText()
})
describe('Equipment menu rendering', () => {
  describe('Role identity and missing role data', () => {
    it('pick-role 非顺序 party [3,1]：equipableBy 按 roleId 位着色，选中高亮按 party 序', () => {
      const { gs, roles } = sceneWithRoleThreeSword()
      const state = createEquipMenu(gs, [roleThreeSword])
      state.list.cursor = 0
      confirmEquipItem(state, [roleThreeSword])
      expect(state.phase).toBe('pick-role')
      expect(state.selectedItemId).toBe(500)
      const fb = sentinelFramebuffer()
      const restore = freezeMenuClock(0)
      try {
        drawEquipMenu({
          fb,
          state,
          gs,
          playerRoles: roles,
          items: [roleThreeSword],
          uiSpriteFrames: makeUiFrames(),
          glyphs: uniformGlyphs,
        })
      } finally {
        restore()
      }
      // role list: party[0]=role3(丁) 可装且选中 → 0xF9；party[1]=role1(乙) 位 false → 0x18
      const dingDot = uniformTextDot(0, 15, 95 + 13)
      const yiDot = uniformTextDot(0, 15, 95 + 13 + 18)
      expect(pixel(fb, dingDot.x, dingDot.y)).toBe(0xf9)
      expect(pixel(fb, yiDot.x, yiDot.y)).toBe(0x18)
    })
    it('已装备槽 itemId 不在 catalog → `?id` tofu；空槽（0）不画', () => {
      const { gs, roles } = sceneWithRoleThreeSword()
      gs.PlayerRolesRuntime.rgwEquipment[0]![3] = 777 // 未知装备
      // slot 1..5 保持 0
      const state = createEquipMenu(gs, [roleThreeSword])
      state.list.cursor = 0
      confirmEquipItem(state, [roleThreeSword])
      const fb = sentinelFramebuffer()
      const restore = freezeMenuClock(0)
      try {
        drawEquipMenu({
          fb,
          state,
          gs,
          playerRoles: roles,
          items: [roleThreeSword],
          uiSpriteFrames: makeUiFrames(),
          glyphs: uniformGlyphs,
        })
      } finally {
        restore()
      }
      // slot0 名字位 (130,11)：tofu 顶行非 sentinel（画了 ?777）
      expect(pixel(fb, 130, 11)).not.toBe(0x5a)
      // slot1 名字位 (130,33)：空槽不画 → 保持 sentinel
      expect(pixel(fb, 130, 33)).toBe(0x5a)
    })
    it('roles 缺 party 中某 roleId：该行跳过不崩，另一行正常', () => {
      const { gs, roles: fullRoles } = sceneWithRoleThreeSword()
      const base = fullRoles.roles
      const roles: import('@type-pal/shared').PlayerRoles = { roles: [] }
      roles.roles[0] = base[0]! // 稀疏数组：roleId 1..5 缺（index 语义）
      roles.roles[3] = base[3]!
      const state = createEquipMenu(gs, [roleThreeSword])
      state.list.cursor = 0
      confirmEquipItem(state, [roleThreeSword])
      const fb = sentinelFramebuffer()
      const restore = freezeMenuClock(0)
      try {
        drawEquipMenu({
          fb,
          state,
          gs,
          playerRoles: roles,
          items: [roleThreeSword],
          uiSpriteFrames: makeUiFrames(),
          glyphs: uniformGlyphs,
        })
      } finally {
        restore()
      }
      const dingDot = uniformTextDot(0, 15, 95 + 13)
      expect(pixel(fb, dingDot.x, dingDot.y)).toBe(0xf9)
      expect(pixel(fb, 15, 95 + 13 + 18)).toBe(0x5a) // 乙行未画
    })
  })
})

describe('Equipment menu rendering', () => {
  describe('Geometry and live values', () => {
    it('G06-C01 一人队伍不加空白内容行，底边在 y=103', () => {
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      const menu = openFirstRolePicker(gs, [0])
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
          glyphs: positionGlyphs,
        })
      } finally {
        restore()
      }
      const name = textDot('甲', 0, 15, 108)
      expect(menu.phase).toBe('pick-role')
      expect(pixel(fb, 2, 103)).toBe(BOX_STYLE0)
      expect(pixel(fb, 2, 111)).toBe(SENTINEL)
      expect(pixel(fb, name.x, name.y)).toBe(0xf9)
    })
    it('G06-C02 phase 为 done 时整屏保持底色', () => {
      const { gs, roles } = makeLiveScene()
      const item = firstRoleSword()
      const items = [item]
      gs.inventory = [{ itemId: item.id, count: 2 }]
      const menu = createEquipMenu(gs, items)
      menu.phase = 'done'
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
        glyphs: positionGlyphs,
      })

      expect(fb.indices.every((index) => index === SENTINEL)).toBe(true)
      expect(cloneInputs({ gs, menu, items, roles, frames })).toEqual(before)
    })
    it('G06-C03 selectedItemId 未定义时不铺装备背景', () => {
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      gs.partyMembers = [0, 1]
      gs.inventory = [{ itemId: 60, count: 1 }]
      const menu = createEquipMenu(gs, items)
      menu.phase = 'pick-role'
      const frames = makeUiFrames()
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
        glyphs: positionGlyphs,
        equipBg,
      })
      expect(menu.selectedItemId).toBeUndefined()
      expect(pixel(fb, 1, 1)).toBe(SENTINEL)
    })
    it('G06-C04 选中 id 不在目录时同样不铺背景也不画图标', () => {
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      gs.partyMembers = [0, 1]
      gs.inventory = [{ itemId: 60, count: 1 }]
      const menu = createEquipMenu(gs, items)
      menu.phase = 'pick-role'
      menu.selectedItemId = 404
      const frames = makeUiFrames()
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
        glyphs: positionGlyphs,
        equipBg,
        itemIcons: icons,
      })
      expect(pixel(fb, 1, 1)).toBe(SENTINEL)
      expect(pixel(fb, 16, 16)).toBe(SENTINEL)
    })
    it('G06-C05 角色光标越过队伍时图标已画，攻击数字不画', () => {
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      const menu = openFirstRolePicker(gs, [0, 1])
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
          glyphs: positionGlyphs,
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
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      const menu = openFirstRolePicker(gs, [0, 1])
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
          glyphs: positionGlyphs,
        })
      } finally {
        restore()
      }
      const name = textDot('甲', 0, 5, 70)
      expect(pixel(fb, rightDigitX(51, 2, 0), 57)).toBe(SENTINEL)

      expect(pixel(fb, name.x, name.y)).toBe(CONFIRMED)
    })
    it('G06-C07 灵力预览在 y=36，是基础加效果；武术行仍是武术值', () => {
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      const menu = openFirstRolePicker(gs, [0, 1])
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
          glyphs: positionGlyphs,
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
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      const menu = openFirstRolePicker(gs, [0, 1])
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
        glyphs: positionGlyphs,
      })
      expect(pixel(fb, rightDigitX(260, 4, 0), 58)).toBe(cyanDigit(1))
      expect(pixel(fb, rightDigitX(260, 4, 1), 58)).toBe(cyanDigit(3))
    })
    it('G06-C09 身法为一位数时只画个位，高位保持底色', () => {
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      const menu = openFirstRolePicker(gs, [0, 1])
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
        glyphs: positionGlyphs,
      })
      expect(pixel(fb, rightDigitX(260, 4, 0), 80)).toBe(cyanDigit(8))
      expect(pixel(fb, rightDigitX(260, 4, 1), 80)).toBe(SENTINEL)
    })
    it('G06-C10 吉运预览在 y=102', () => {
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      const menu = openFirstRolePicker(gs, [0, 1])
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
        glyphs: positionGlyphs,
      })
      expect(pixel(fb, rightDigitX(260, 4, 0), 102)).toBe(cyanDigit(6))
      expect(pixel(fb, rightDigitX(260, 4, 1), 102)).toBe(cyanDigit(4))
    })
    it('G06-C11 数量读 gs 现行库存 8，列表快照仍是确认时的 3', () => {
      const { gs, roles } = makeLiveScene()
      const items = [firstRoleSword()]
      const menu = openFirstRolePicker(gs, [0, 1])
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
        glyphs: positionGlyphs,
      })
      expect(pixel(fb, rightDigitX(51, 2, 0), 57)).toBe(cyanDigit(8))

      expect(snap.count).toBe(3)
      expect(entry.count).toBe(8)
      expect(cloneInputs({ gs, menu, items, roles, frames })).toEqual(before)
    })
  })
})

describe('Equipment menu rendering', () => {
  describe('Inventory and worn equipment', () => {
    it('P03 装备列表里不可装备项是暗色，可装备项保持可选色', () => {
      const gs = makeGs()
      const roles = makeRoles()
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
      const before = cloneInputs({ gs, menu, items, roles, frames })
      const restore = freezeNow(0)
      try {
        drawEquipMenu({
          fb,
          state: menu,
          gs,
          playerRoles: roles,
          items,
          uiSpriteFrames: frames,
          glyphs: positionGlyphs,
        })
      } finally {
        restore()
      }
      expect(cloneInputs({ gs, menu, items, roles, frames })).toEqual(before)
      expect(pixel(fb, textDot('甲', 0, 15, 12).x, textDot('甲', 0, 15, 12).y)).toBe(
        MENUITEM_COLOR_SELECTED_FIRST,
      )
      expect(pixel(fb, textDot('乙', 0, 115, 12).x, textDot('乙', 0, 115, 12).y)).toBe(
        MENUITEM_COLOR_INACTIVE,
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
      confirmEquipItem(menu, items)
      expect(menu.phase).toBe('pick-role')
      const frames = makeUiFrames()
      const icons = new Map([[6, iconImage(0x86)]])
      const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x55) }
      const fb = createFramebuffer()
      fillSentinel(fb)
      const plain = { gs, menu, items, roles, frames, icons }
      const beforePlain = cloneInputs(plain)
      const restore = freezeNow(0)
      try {
        drawEquipMenu({
          fb,
          state: menu,
          gs,
          playerRoles: roles,
          items,
          uiSpriteFrames: frames,
          glyphs: positionGlyphs,
          itemIcons: icons,
        })
        expect(cloneInputs(plain)).toEqual(beforePlain)
        expect(pixel(fb, 1, 1)).toBe(SENTINEL)
        fillSentinel(fb)
        const painted = { ...plain, equipBg: bg }
        const beforeBg = cloneInputs(painted)
        drawEquipMenu({
          fb,
          state: menu,
          gs,
          playerRoles: roles,
          items,
          uiSpriteFrames: frames,
          glyphs: positionGlyphs,
          itemIcons: icons,
          equipBg: bg,
        })
        expect(cloneInputs(painted)).toEqual(beforeBg)
        const beforeRepeat = cloneInputs(painted)
        drawEquipMenu({
          fb,
          state: menu,
          gs,
          playerRoles: roles,
          items,
          uiSpriteFrames: frames,
          glyphs: positionGlyphs,
          itemIcons: icons,
          equipBg: bg,
        })
        expect(cloneInputs(painted)).toEqual(beforeRepeat)
      } finally {
        restore()
      }
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

      equipMoveDown(menu)
      fillSentinel(fb)
      const movedInputs = { gs, menu, items, roles, frames, icons, equipBg: bg }
      const moved = cloneInputs(movedInputs)
      drawEquipMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        items,
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
        itemIcons: icons,
        equipBg: bg,
      })
      expect(cloneInputs(movedInputs)).toEqual(moved)
      expect(pixel(fb, textDot('午', 0, 130, 11).x, textDot('午', 0, 130, 11).y)).toBe(
        MENUITEM_COLOR,
      )
      expect(pixel(fb, textDot('子', 0, 130, 11).x, textDot('子', 0, 130, 11).y)).not.toBe(
        MENUITEM_COLOR,
      )
      expect(pixel(fb, rightDigitX(260, 4, 0), 14)).toBe(cyanDigit(5))
      expect(pixel(fb, textDot('乙', 0, 15, 126).x, textDot('乙', 0, 15, 126).y)).toBe(
        MENUITEM_COLOR_SELECTED_INACTIVE,
      )
      expect(pixel(fb, textDot('戊', 0, 15, 108).x, textDot('戊', 0, 15, 108).y)).toBe(
        MENUITEM_COLOR,
      )
      expect(gs.PlayerRolesRuntime.rgwEquipment[0]![4]).toBe(worn[0]!.id)
    })
  })
})
