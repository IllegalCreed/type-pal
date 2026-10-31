import { describe, expect, it } from 'vitest'
import { mixedInventoryItems } from './__tests__/inventory-fixture.js'
import { pickItemRowColor } from './inventory-menu.js'
import { matchesFilter } from './item-select.js'

describe('Inventory eligibility and row colors', () => {
  describe('pickItemRowColor — sdlpal itemmenu.c:135-181 6-case 真值', () => {
    // 闪烁色固定 tick=0 → SELECTED_FIRST + 0 = 0xF9
    const tick0 = 0

    it('selected + usable + non-equipped → SELECTED_FIRST 闪烁起始', () => {
      expect(
        pickItemRowColor({
          isSelected: true,
          isUsable: true,
          isEquipped: false,
          selectedFlashTickMs: tick0,
        }),
      ).toBe(0xf9)
    })

    it('selected + usable + equipped → EQUIPPEDITEM 0xC8', () => {
      expect(
        pickItemRowColor({
          isSelected: true,
          isUsable: true,
          isEquipped: true,
          selectedFlashTickMs: tick0,
        }),
      ).toBe(0xc8)
    })

    it('selected + !usable(filter 不命中)→ SELECTED_INACTIVE 0x1C', () => {
      expect(pickItemRowColor({ isSelected: true, isUsable: false, isEquipped: false })).toBe(0x1c)
    })

    it('!selected + usable + non-equipped → MENUITEM_COLOR 0x4F', () => {
      expect(pickItemRowColor({ isSelected: false, isUsable: true, isEquipped: false })).toBe(0x4f)
    })

    it('!selected + usable + equipped → EQUIPPEDITEM 0xC8', () => {
      expect(pickItemRowColor({ isSelected: false, isUsable: true, isEquipped: true })).toBe(0xc8)
    })

    it('!selected + !usable(filter 不命中)→ INACTIVE 0x18(防 EquipMenu 装备类全红 bug)', () => {
      // 装备菜单复用绘制器时，是否可选由入口 filter 判定，不能仅看 flags.usable。
      expect(pickItemRowColor({ isSelected: false, isUsable: false, isEquipped: false })).toBe(0x18)
    })

    it('selected + flash tick 推进 → cycle 0xF9..0xFE', () => {
      expect(
        pickItemRowColor({
          isSelected: true,
          isUsable: true,
          isEquipped: false,
          selectedFlashTickMs: 100,
        }),
      ).toBe(0xfa)
      expect(
        pickItemRowColor({
          isSelected: true,
          isUsable: true,
          isEquipped: false,
          selectedFlashTickMs: 500,
        }),
      ).toBe(0xfe)
      // cycle 回 0
      expect(
        pickItemRowColor({
          isSelected: true,
          isUsable: true,
          isEquipped: false,
          selectedFlashTickMs: 600,
        }),
      ).toBe(0xf9)
    })
  })
  describe('matchesFilter — sdlpal kItemFlag* 真值', () => {
    const wooden = mixedInventoryItems[0]!
    // 木剑 equipable only
    const charm = mixedInventoryItems[2]!
    // 观音符 usable only
    const lingZhu = mixedInventoryItems[4]!
    // 风灵珠 usable + equipable

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
})
