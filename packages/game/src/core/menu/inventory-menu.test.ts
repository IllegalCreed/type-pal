/**
 * InventoryMenu + pickItemRowColor 防回归单测。
 *
 * 覆盖范围:
 *  - pickItemRowColor 6-case 真值表(sdlpal itemmenu.c:135-181)
 *  - matchesFilter × 不同 ItemFilter 组合
 *  - createInventoryMenu filter='equip' vs 'usable' visible 列表正确
 *  - 8-key navigation cursor clamp([0, n-1] 不 wrap,sdlpal itemmenu.c:107-112)
 *  - confirmInventoryItem 切 phase / cancelInventoryMenu rollback
 *  - **regression**:filter color bug(2026-05-29 user 怒怼"李逍遥能装的木剑红色")
 */

import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import { matchesFilter, type ItemFilter } from './item-select.js'
import {
  cancelInventoryMenu,
  confirmInventoryItem,
  createInventoryMenu,
  inventoryEnd,
  inventoryHome,
  inventoryMoveDown,
  inventoryMoveLeft,
  inventoryMoveRight,
  inventoryMoveUp,
  inventoryPageDown,
  inventoryPageUp,
  MENUITEM_COLOR,
  MENUITEM_COLOR_EQUIPPEDITEM,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
  pickItemRowColor,
} from './inventory-menu.js'

// ── fixtures ────────────────────────────────────────────────────────────────
function mkItem(id: number, name: string, flagsPart: Partial<Item['flags']>): Item {
  return {
    id,
    bitmap: id,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
      ...flagsPart,
    },
    _name: name,
  } as unknown as Item
}

const ITEMS: Item[] = [
  mkItem(105, '木剑', { equipable: true, equipableBy: [true, false, true, false, false, false] }),
  mkItem(106, '短刀', { equipable: true, equipableBy: [true, false, true, false, false, false] }),
  mkItem(200, '观音符', { usable: true, applyToAll: true, consuming: true }),
  mkItem(201, '玉佛珠', { equipable: true, equipableBy: [false, true, false, false, false, false] }),
  mkItem(202, '风灵珠', { usable: true, equipable: true, applyToAll: true }),
]

// ── pickItemRowColor 6-case truth table(防 filter bug 回归)──────────────────

describe('pickItemRowColor — sdlpal itemmenu.c:135-181 6-case 真值', () => {
  // 闪烁色固定 tick=0 → SELECTED_FIRST + 0 = 0xF9
  const tick0 = 0

  it('selected + usable + non-equipped → SELECTED_FIRST 闪烁起始', () => {
    expect(pickItemRowColor({ isSelected: true, isUsable: true, isEquipped: false, selectedFlashTickMs: tick0 }))
      .toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('selected + usable + equipped → EQUIPPEDITEM 0xC8', () => {
    expect(pickItemRowColor({ isSelected: true, isUsable: true, isEquipped: true, selectedFlashTickMs: tick0 }))
      .toBe(MENUITEM_COLOR_EQUIPPEDITEM)
  })

  it('selected + !usable(filter 不命中)→ SELECTED_INACTIVE 0x1C', () => {
    expect(pickItemRowColor({ isSelected: true, isUsable: false, isEquipped: false }))
      .toBe(MENUITEM_COLOR_SELECTED_INACTIVE)
  })

  it('!selected + usable + non-equipped → MENUITEM_COLOR 0x4F', () => {
    expect(pickItemRowColor({ isSelected: false, isUsable: true, isEquipped: false }))
      .toBe(MENUITEM_COLOR)
  })

  it('!selected + usable + equipped → EQUIPPEDITEM 0xC8', () => {
    expect(pickItemRowColor({ isSelected: false, isUsable: true, isEquipped: true }))
      .toBe(MENUITEM_COLOR_EQUIPPEDITEM)
  })

  it('!selected + !usable(filter 不命中)→ INACTIVE 0x18(防 EquipMenu 装备类全红 bug)', () => {
    // 2026-05-29 user 怒怼场景:EquipMenu 复用 drawInventoryMenu 时 isUsable 取 flags.usable
    // 错误判定,equipable item 被当 "不可选" → INACTIVE 红色。修后用 matchesFilter 判命中。
    expect(pickItemRowColor({ isSelected: false, isUsable: false, isEquipped: false }))
      .toBe(MENUITEM_COLOR_INACTIVE)
  })

  it('selected + flash tick 推进 → cycle 0xF9..0xFE', () => {
    expect(pickItemRowColor({ isSelected: true, isUsable: true, isEquipped: false, selectedFlashTickMs: 100 }))
      .toBe(MENUITEM_COLOR_SELECTED_FIRST + 1)
    expect(pickItemRowColor({ isSelected: true, isUsable: true, isEquipped: false, selectedFlashTickMs: 500 }))
      .toBe(MENUITEM_COLOR_SELECTED_FIRST + 5)
    // cycle 回 0
    expect(pickItemRowColor({ isSelected: true, isUsable: true, isEquipped: false, selectedFlashTickMs: 600 }))
      .toBe(MENUITEM_COLOR_SELECTED_FIRST + 0)
  })
})

// ── matchesFilter regression(防 isUsable hardcode flags.usable 再发生)──────

describe('matchesFilter — sdlpal kItemFlag* 真值', () => {
  const wooden = ITEMS[0]! // 木剑 equipable only
  const charm = ITEMS[2]!  // 观音符 usable only
  const lingZhu = ITEMS[4]! // 风灵珠 usable + equipable

  it("filter='equip' 命中 equipable item", () => {
    expect(matchesFilter(wooden, 'equip')).toBe(true)
    expect(matchesFilter(charm, 'equip')).toBe(false)
    expect(matchesFilter(lingZhu, 'equip')).toBe(true)
  })

  it("filter='usable' 命中 usable item(EquipMenu 不该用此 filter)", () => {
    expect(matchesFilter(wooden, 'usable')).toBe(false)
    expect(matchesFilter(charm, 'usable')).toBe(true)
    expect(matchesFilter(lingZhu, 'usable')).toBe(true)
  })

  it("filter='all' 全命中", () => {
    expect(matchesFilter(wooden, 'all')).toBe(true)
    expect(matchesFilter(charm, 'all')).toBe(true)
  })
})

// ── createInventoryMenu visible 列表 ──────────────────────────────────────
//
// sdlpal `PAL_ItemSelectMenuInit`(itemmenu.c:331-377)**不按 wItemFlags 过滤列表** —
// while 循环把整个库存全部计入 g_iNumInventory,g_wItemFlags 只在 PAL_ItemSelectMenuUpdate
// (itemmenu.c:148/171)决定颜色:不匹配 filter 的物品**照样显示**,只是画成 INACTIVE 红色
// (0x18 暗红 / 光标停其上 0x1C 橙红)。所以「使用/装备/卖」菜单都是全显示 + 非匹配项红色,
// 不是把非匹配项从列表里删掉。

describe('createInventoryMenu — sdlpal itemmenu.c:331-377 全库存入列,不按 flag 过滤', () => {
  // 渲染层颜色判定复刻(draw-inventory.ts:276 真值):isUsable = filter 命中 + 可用数量>0。
  function rowColor(item: Item, slot: { count: number; inUse?: number }, filter: ItemFilter, isSelected: boolean) {
    const diff = slot.count - (slot.inUse ?? 0)
    const isUsable = diff > 0 && matchesFilter(item, filter)
    return pickItemRowColor({ isSelected, isUsable, isEquipped: slot.count === 0, selectedFlashTickMs: 0 })
  }

  it("filter='equip':非可装备项(观音符)仍入列表,不被剔除", () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [
      { itemId: 105, count: 2 }, // 木剑 equipable
      { itemId: 200, count: 1 }, // 观音符 usable only — 不可装备但仍显示
      { itemId: 201, count: 1 }, // 玉佛珠 equipable
    ]
    const state = createInventoryMenu(gs, ITEMS, 'equip')
    expect(state.inventory.map((e) => e.itemId)).toEqual([105, 200, 201])
    expect(state.filter).toBe('equip')
  })

  it("filter='usable':非可用项(木剑)仍入列表 + 渲染成红色 INACTIVE 0x18", () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [
      { itemId: 105, count: 1 }, // 木剑 not usable — 红色显示
      { itemId: 200, count: 1 }, // 观音符 usable
      { itemId: 202, count: 1 }, // 风灵珠 usable
    ]
    const state = createInventoryMenu(gs, ITEMS, 'usable')
    // 全部 3 项都在列表(原版全显示)
    expect(state.inventory.map((e) => e.itemId)).toEqual([105, 200, 202])
    // 非可用(木剑,inv[0])非选中 → INACTIVE 0x18 暗红;可用(观音符,inv[1])→ MENUITEM_COLOR 0x4F
    expect(rowColor(ITEMS[0]!, state.inventory[0]!, 'usable', false)).toBe(MENUITEM_COLOR_INACTIVE)
    expect(rowColor(ITEMS[2]!, state.inventory[1]!, 'usable', false)).toBe(MENUITEM_COLOR)
    // 非可用 + 光标停其上 → SELECTED_INACTIVE 0x1C 橙红
    expect(rowColor(ITEMS[0]!, state.inventory[0]!, 'usable', true)).toBe(MENUITEM_COLOR_SELECTED_INACTIVE)
  })
})

// ── 8-key navigation cursor clamp(sdlpal itemmenu.c:107-112)─────────────────

describe('inventoryMove* navigation', () => {
  function mkState(n: number) {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = Array.from({ length: n }, (_, i) => ({ itemId: 105 + i, count: 1 }))
    // 加足够 items 让 createInventoryMenu visible n 个
    const items: Item[] = Array.from({ length: n }, (_, i) =>
      mkItem(105 + i, `item${i}`, { equipable: true }),
    )
    return createInventoryMenu(gs, items, 'equip')
  }

  it('Up = -3(iItemsPerLine);clamp 0', () => {
    const s = mkState(10)
    s.cursor = 5
    inventoryMoveUp(s)
    expect(s.cursor).toBe(2)
    inventoryMoveUp(s)
    expect(s.cursor).toBe(0)
    inventoryMoveUp(s) // 再 up 不 wrap
    expect(s.cursor).toBe(0)
  })

  it('Down = +3(iItemsPerLine);clamp inventory.length - 1', () => {
    const s = mkState(10)
    s.cursor = 0
    inventoryMoveDown(s)
    expect(s.cursor).toBe(3)
    inventoryMoveDown(s)
    expect(s.cursor).toBe(6)
    inventoryMoveDown(s)
    expect(s.cursor).toBe(9)
    inventoryMoveDown(s) // 不 wrap
    expect(s.cursor).toBe(9)
  })

  it('Left/Right = ±1', () => {
    const s = mkState(10)
    s.cursor = 5
    inventoryMoveLeft(s)
    expect(s.cursor).toBe(4)
    inventoryMoveRight(s)
    expect(s.cursor).toBe(5)
    s.cursor = 0
    inventoryMoveLeft(s) // 不 wrap
    expect(s.cursor).toBe(0)
  })

  it('PgUp/PgDn = ±(3 * 7);clamp [0, length-1]', () => {
    const s = mkState(50) // 足够多让 +21 不被 clamp
    s.cursor = 15
    inventoryPageDown(s)
    expect(s.cursor).toBe(15 + 21)
    s.cursor = 25
    inventoryPageUp(s)
    expect(s.cursor).toBe(25 - 21)
    // Clamp 验证
    s.cursor = 45
    inventoryPageDown(s)
    expect(s.cursor).toBe(49) // clamp to length-1
    s.cursor = 5
    inventoryPageUp(s)
    expect(s.cursor).toBe(0)
  })

  it('Home/End = 0 / length - 1', () => {
    const s = mkState(10)
    s.cursor = 5
    inventoryHome(s)
    expect(s.cursor).toBe(0)
    inventoryEnd(s)
    expect(s.cursor).toBe(9)
  })

  it('inventory 空时 cursor 保 0', () => {
    const s = mkState(0)
    expect(s.cursor).toBe(0)
    inventoryMoveDown(s)
    expect(s.cursor).toBe(0)
  })
})

// ── phase 状态机 ─────────────────────────────────────────────────────────────

describe('confirmInventoryItem / cancelInventoryMenu phase', () => {
  function mkState() {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 200, count: 3 }]
    gs.partyMembers = [0]
    return { gs, state: createInventoryMenu(gs, ITEMS, 'usable') }
  }

  it('Confirm usable item → phase=use-target,selectedItemId 写;PlayerRoles 缺则 noop', () => {
    const { state } = mkState()
    // 用空 playerRoles 测 selectedItemId 不写(item 命中但无 target)
    confirmInventoryItem(state, ITEMS, { roles: [] } as never, [])
    // 目标 menu 应建好(无 role 也建空 targetMenu)
    expect(state.phase).toBe('use-target')
    expect(state.selectedItemId).toBe(200)
  })

  it('Cancel use-target → 回 list;Cancel list → done', () => {
    const { state } = mkState()
    state.phase = 'use-target'
    state.selectedItemId = 200
    cancelInventoryMenu(state)
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()

    cancelInventoryMenu(state)
    expect(state.phase).toBe('done')
  })
})
