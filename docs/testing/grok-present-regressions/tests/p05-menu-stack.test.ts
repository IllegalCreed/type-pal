import { afterEach, describe, expect, it } from 'vitest'
import {
  confirmEquipItem,
  createEquipMenu,
} from '../../../../packages/game/src/core/menu/equip-menu.js'
import {
  confirmInventoryItem,
  createInventoryMenu,
  MENUITEM_COLOR_SELECTED_FIRST,
} from '../../../../packages/game/src/core/menu/inventory-menu.js'
import { openMenu } from '../../../../packages/game/src/core/menu/menu-mode.js'
import { createPlayerStatus } from '../../../../packages/game/src/core/menu/player-status.js'
import { setWordTable } from '../../../../packages/game/src/core/word-lookup.js'
import { createFramebuffer } from '../../../../packages/game/src/present/framebuffer.js'
import { drawMenuStack } from '../../../../packages/game/src/present/menu/draw-menu.js'
import { fixtureGlyphs, textDot } from '../fixtures/font.js'
import { fillSentinel, iconImage, makeUiFrames, pixel, SENTINEL } from '../fixtures/images.js'
import {
  cloneInputs,
  freezeNow,
  makeGs,
  makeItem,
  makeRoles,
  resetHostSingletons,
} from '../fixtures/world.js'

const glyphs = fixtureGlyphs()

afterEach(() => {
  resetHostSingletons()
})

describe('P05 菜单栈转发', () => {
  it('P05 物品、图标和角色经公开菜单栈传到真实下层', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const item = makeItem(21, '甲', { bitmap: 4, flags: { usable: true } })
    const items = [item]
    gs.partyMembers = [4, 1]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'usable')
    confirmInventoryItem(menu, items, roles, gs.partyMembers)
    openMenu(gs, { kind: 'inventory', state: menu })
    const frames = makeUiFrames()
    const icons = new Map([[4, iconImage(0x84)]])
    const name = textDot('戊', 0, 125, 16)
    const restore = freezeNow(0)
    try {
      const bare = createFramebuffer()
      fillSentinel(bare)
      const bareInputs = { gs, menu, frames }
      const beforeBare = cloneInputs(bareInputs)
      drawMenuStack(bare, gs, frames, glyphs)
      expect(cloneInputs(bareInputs)).toEqual(beforeBare)
      expect(pixel(bare, name.x, name.y)).not.toBe(MENUITEM_COLOR_SELECTED_FIRST)
      expect(pixel(bare, 127, 88)).not.toBe(0x84)

      const forwarded = createFramebuffer()
      fillSentinel(forwarded)
      const forwardedInputs = { gs, menu, items, roles, frames, icons }
      const before = cloneInputs(forwardedInputs)
      drawMenuStack(forwarded, gs, frames, glyphs, {
        items,
        itemIcons: icons,
        playerRoles: roles,
      })
      expect(cloneInputs(forwardedInputs)).toEqual(before)
      expect(pixel(forwarded, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
      expect(pixel(forwarded, textDot('甲', 0, 116, 143).x, textDot('甲', 0, 116, 143).y)).toBe(
        0xbe,
      )
      expect(pixel(forwarded, 127, 88)).toBe(0x84)
    } finally {
      restore()
    }
  })

  it('P05 装备背景只在extra.equipBg传入时写入', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const sword = makeItem(40, '剑', {
      flags: { equipable: true, equipableBy: [false, false, false, false, true, false] },
    })
    const items = [sword]
    gs.partyMembers = [4]
    gs.inventory = [{ itemId: sword.id, count: 1 }]
    const menu = createEquipMenu(gs, items)
    confirmEquipItem(menu, items, roles, gs.partyMembers)
    openMenu(gs, { kind: 'equip', state: menu })
    const frames = makeUiFrames()
    const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x55) }
    const restore = freezeNow(0)
    try {
      const without = createFramebuffer()
      fillSentinel(without)
      const plain = { gs, menu, items, roles, frames }
      const beforePlain = cloneInputs(plain)
      drawMenuStack(without, gs, frames, glyphs, { items, playerRoles: roles })
      expect(cloneInputs(plain)).toEqual(beforePlain)
      expect(pixel(without, 1, 1)).toBe(SENTINEL)

      const withBg = createFramebuffer()
      fillSentinel(withBg)
      const painted = { ...plain, equipBg: bg }
      const before = cloneInputs(painted)
      drawMenuStack(withBg, gs, frames, glyphs, {
        items,
        playerRoles: roles,
        equipBg: bg,
      })
      expect(cloneInputs(painted)).toEqual(before)
      expect(pixel(withBg, 1, 1)).toBe(0x55)
      expect(pixel(withBg, textDot('戊', 0, 15, 108).x, textDot('戊', 0, 15, 108).y)).toBe(
        MENUITEM_COLOR_SELECTED_FIRST,
      )
    } finally {
      restore()
    }
  })

  it('P05 状态背景和毒数据经extra传到真实状态页', () => {
    const words = Array<string>(80).fill('')
    words[77] = '瘟'
    setWordTable(words)
    const gs = makeGs()
    const roles = makeRoles()
    gs.partyMembers = [4, 1]
    gs.rgPoisonStatus['0_4'] = { wPoisonID: 77, wPoisonScript: 1 }
    const menu = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'player-status', state: menu })
    const frames = makeUiFrames()
    const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x56) }
    const poisons = new Map([[77, { level: 1, color: 3 }]])
    const items: ReturnType<typeof makeItem>[] = []
    const poison = textDot('瘟', 0, 185, 58)
    const without = createFramebuffer()
    fillSentinel(without)
    const plain = { gs, menu, items, roles, frames }
    const beforePlain = cloneInputs(plain)
    drawMenuStack(without, gs, frames, glyphs, { playerRoles: roles, items })
    expect(cloneInputs(plain)).toEqual(beforePlain)
    expect(pixel(without, 1, 1)).toBe(SENTINEL)
    expect(pixel(without, poison.x, poison.y)).toBe(SENTINEL)

    const withExtra = createFramebuffer()
    fillSentinel(withExtra)
    const extra = { ...plain, statusBg: bg, poisons }
    const before = cloneInputs(extra)
    drawMenuStack(withExtra, gs, frames, glyphs, {
      playerRoles: roles,
      items,
      statusBg: bg,
      objectPoisons: poisons,
    })
    expect(cloneInputs(extra)).toEqual(before)
    expect(pixel(withExtra, 1, 1)).toBe(0x56)
    expect(pixel(withExtra, poison.x, poison.y)).toBe(13)
    expect(pixel(withExtra, poison.x + 1, poison.y)).toBe(0)
  })

  it('P05 同一items数组增删或重排会使输入快照失败', () => {
    const gs = makeGs()
    const first = makeItem(1, '甲')
    const second = makeItem(2, '乙')
    const items = [first]
    const before = cloneInputs({ gs, items })
    items.push(second)
    expect(cloneInputs({ gs, items })).not.toEqual(before)
    const grown = cloneInputs({ gs, items })
    items.reverse()
    expect(cloneInputs({ gs, items })).not.toEqual(grown)
    const reversed = cloneInputs({ gs, items })
    items.pop()
    expect(cloneInputs({ gs, items })).not.toEqual(reversed)
    expect(items).toEqual([second])
  })
})
