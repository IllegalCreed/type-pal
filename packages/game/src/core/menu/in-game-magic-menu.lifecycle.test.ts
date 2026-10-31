import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  makeTargetingRoles,
  restorativeMagics,
  restorativeRoles,
  restorativeSpells,
  targetingMagics,
  targetingSpells,
} from './__tests__/magic-menu-catalog.js'

import {
  cancelInGameMagic,
  confirmCaster,
  confirmSpell,
  createInGameMagicMenu,
  refreshSpellMenu,
  rememberMagicCasterCursor,
} from './in-game-magic-menu.js'

beforeEach(() => rememberMagicCasterCursor(0))
afterEach(() => rememberMagicCasterCursor(0))

describe('Overworld magic lifecycle', () => {
  it('pick-target → pick-spell(保留 caster + spellMenu)', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    menu.casterMenu.cursor = 0
    confirmCaster(menu, restorativeRoles, restorativeSpells, restorativeMagics)
    menu.spellMenu!.cursor = 0
    confirmSpell(menu, restorativeSpells, restorativeMagics)
    expect(menu.phase).toBe('pick-target')
    cancelInGameMagic(menu)
    expect(menu.phase).toBe('pick-spell')
    expect(menu.selectedCasterId).toBe(0) // caster 不变
    expect(menu.spellMenu).toBeDefined()
  })

  it('pick-spell Cancel → done 关菜单回大世界(C 仙术列表 Cancel=break while=return,uigame.c:733-736)', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    menu.casterMenu.cursor = 0
    confirmCaster(menu, restorativeRoles, restorativeSpells, restorativeMagics)
    cancelInGameMagic(menu)
    // 直接关菜单(不退回「选施法人」);caster 框在 C 里只 PAL_ReadMenu 一次、循环外
    expect(menu.phase).toBe('done')
  })

  it('pick-caster → done(关菜单)', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    cancelInGameMagic(menu)
    expect(menu.phase).toBe('done')
  })

  it('MP 不足后 spell disabled,保留 cursor 在原 spell', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    menu.casterMenu.cursor = 0
    confirmCaster(menu, restorativeRoles, restorativeSpells, restorativeMagics)
    menu.spellMenu!.cursor = 0 // 气疗术(MP=6)
    menu.selectedSpellId = 296
    // 模拟 MP 减到 5(< 6 气疗 cost)
    refreshSpellMenu(menu, restorativeRoles, restorativeSpells, restorativeMagics, 5)
    const lowCostSpell = menu.spellMenu!.items.find((i) => i.id === 296)
    expect(lowCostSpell?.disabled).toBe(true)
    // cursor 落回 selectedSpellId(sdlpal magicmenu.c:402-409 wDefaultMagic)
    const cursorSpellId = menu.spellMenu!.items[menu.spellMenu!.cursor]?.id
    expect(cursorSpellId).toBe(296)
  })

  it('pick-spell Cancel 关菜单后 refreshSpellMenu 不复活 spellMenu（防御分支）', () => {
    const menu = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1],
      targetingSpells,
      targetingMagics,
    )
    menu.casterMenu.cursor = 0
    confirmCaster(menu, makeTargetingRoles(), targetingSpells, targetingMagics)
    cancelInGameMagic(menu) // pick-spell → done
    expect(menu.phase).toBe('done')
    expect(menu.spellMenu).toBeUndefined()
    refreshSpellMenu(menu, makeTargetingRoles(), targetingSpells, targetingMagics, 99)
    expect(menu.spellMenu).toBeUndefined() // selectedCasterId 已清 → 早退
    cancelInGameMagic(menu) // done 相再 cancel → 仍 done
    expect(menu.phase).toBe('done')
  })
})
