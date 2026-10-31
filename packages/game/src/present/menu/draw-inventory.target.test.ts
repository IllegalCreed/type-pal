import type { Command } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { freezeMenuClock } from '../../__tests__/menu-clock-fixture.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { setGlobalEvents } from '../../core/event-system.js'
import {
  confirmInventoryItem,
  createInventoryMenu,
  MENUITEM_COLOR,
  MENUITEM_COLOR_SELECTED_FIRST,
} from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import {
  freezeNow,
  makeGs,
  makeItem,
  makeLiveScene,
  makeRoles,
} from '../__tests__/menu-state-fixtures.js'
import {
  BOX_STYLE1,
  CURSOR_ID,
  cyanDigit,
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
import { uniformDotGlyphs } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInventoryMenu } from './draw-inventory.js'

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

const DESC_COLOR = 0x3c

const EQUIPMENT_NAME_COLOR = 0xbe

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
  setGlobalEvents([])
})

afterEach(() => {
  try {
    setGlobalEvents([])
  } finally {
    restoreMenuText()
  }
})

describe('Inventory use targets', () => {
  it('use-target 相缺 gs/playerRoles：只画 list，不叠选人层（防御组合不崩）', () => {
    const herb = makeItem(10, '甲', { flags: { usable: true } })
    const { gs, roles } = makeLiveScene()
    gs.inventory = [{ itemId: 10, count: 2 }]
    const state = createInventoryMenu(gs, [herb], 'usable')
    confirmInventoryItem(state, [herb], roles, gs.partyMembers)
    expect(state.phase).toBe('use-target')
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawInventoryMenu({
        fb,
        state,
        items: [herb],
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
        // 故意不传 gs / playerRoles → 选人层不画
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 120, 10)).toBe(BOX_STYLE1)
    expect(pixel(fb, 2, 0)).toBe(BOX_STYLE1)
    expect(pixel(fb, 19, 16)).toBe(0xf9)
    expect(pixel(fb, 42, 22)).toBe(CURSOR_ID) // 缺目标参数仍保留列表框、名称和光标
  })

  it('G06-A01 列表物品框保留阴影，使用目标框只画正色不加阴影', () => {
    const { gs, roles } = makeLiveScene()
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
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    expect(pixel(fb, 5, 145)).toBe(0x55)
    expect(pixel(fb, 6, 145)).toBe(SENTINEL)
    expect(pixel(fb, 0, 140)).toBe(ITEMBOX_ID)
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)

    // 同一物品经真实确认进入目标层；SDLPal 此处只 blit ITEMBOX，不画偏移阴影。
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    expect(menu.phase).toBe('use-target')
    fillSentinel(fb)
    drawInventoryMenu({
      fb,
      state: menu,
      items,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
      gs,
      playerRoles: roles,
    })
    expect(pixel(fb, 120, 80)).toBe(ITEMBOX_ID)
    expect(pixel(fb, 125, 85)).toBe(SENTINEL)
    expect(pixel(fb, 126, 85)).toBe(SENTINEL)
  })

  it('G06-A06 大世界目标层数量归零时按 SDLPal 隐藏图标/名称/数字', () => {
    const { gs, roles } = makeLiveScene()
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
    const icons = new Map([[item.bitmap, iconImage(0x86)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({
        fb,
        state: menu,
        items,
        uiSpriteFrames: frames,
        itemIcons: icons,
        glyphs: positionGlyphs,
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 116, 143)
    expect(pixel(fb, rightDigitX(170, 2, 0), 133)).toBe(SENTINEL)

    expect(pixel(fb, 127, 88)).not.toBe(0x86)
    expect(pixel(fb, name.x, name.y)).toBe(SENTINEL)
  })

  it('G06-A07 用物层选中 id 不在目录时不画属性标签，列表名仍在', () => {
    const { gs, roles } = makeLiveScene()
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
        glyphs: positionGlyphs,
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

    expect(pixel(fb, listed.x, listed.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G06-A08 用物层光标越过队伍时不画体力，队员名仍按未选中色画出', () => {
    const { gs, roles } = makeLiveScene()
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
        glyphs: positionGlyphs,
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 125, 16)
    expect(pixel(fb, rightDigitX(240, 4, 0), 37)).toBe(SENTINEL)

    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR)
  })

  it('G06-A09 缺少斜杠帧 39 时体力数字仍在，斜杠位保持底色', () => {
    const { gs, roles } = makeLiveScene()
    const item = makeItem(19, '甲', { flags: { usable: true } })
    const items = [item]
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    gs.PlayerRolesRuntime.rgwHP[0] = 12
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    const frames = uiFramesWithoutSlot(39)
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({
        fb,
        state: menu,
        items,
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
        gs,
        playerRoles: roles,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 263, 38)).toBe(SENTINEL)

    expect(pixel(fb, rightDigitX(240, 4, 0), 37)).toBe(yellowDigit(2))
  })

  it('G06-A11 用物层灵力是基础加装备效果，武术行仍是武术值', () => {
    const { gs, roles } = makeLiveScene()
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
        glyphs: positionGlyphs,
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
        glyphs: positionGlyphs,
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
        glyphs: positionGlyphs,
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
        glyphs: positionGlyphs,
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
        glyphs: positionGlyphs,
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
