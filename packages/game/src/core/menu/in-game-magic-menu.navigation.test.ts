// Public selection state and requests; dispatcher script execution and MP payment are separate contracts.
import type { PlayerRoles } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  makeTargetingCaster,
  makeTargetingRoles,
  targetingMagics,
  targetingSpells,
} from './__tests__/magic-menu-catalog.js'
import { makePickedSpellMenu, makeTargetMenu } from './__tests__/magic-menu-scenario.js'
import {
  confirmCaster,
  confirmSpell,
  createInGameMagicMenu,
  inGameMagicEnd,
  inGameMagicHome,
  inGameMagicMoveDown,
  inGameMagicMoveLeft,
  inGameMagicMoveRight,
  inGameMagicMoveUp,
  inGameMagicPageDown,
  inGameMagicPageUp,
  rememberMagicCasterCursor,
} from './in-game-magic-menu.js'

beforeEach(() => rememberMagicCasterCursor(0))
afterEach(() => rememberMagicCasterCursor(0))
function chooseTargetingSpell(state: ReturnType<typeof createInGameMagicMenu>, spellId: number) {
  confirmCaster(state, makeTargetingRoles(), targetingSpells, targetingMagics)
  const menu = state.spellMenu
  if (!menu) throw new Error('spellMenu 未建')
  const spellIndex = menu.items.findIndex((i) => i.id === spellId)
  if (spellIndex < 0) throw new Error(`spell ${spellId} 不在列表`)
  menu.cursor = spellIndex
  return confirmSpell(state, targetingSpells, targetingMagics)
}

describe('Overworld magic navigation', () => {
  it('Up 边界 noop(不 wrap;sdlpal `if (wPlayer > 0) wPlayer--`)', () => {
    const menu = makeTargetMenu()
    menu.targetCursor = 0
    inGameMagicMoveUp(menu)
    expect(menu.targetCursor).toBe(0)
  })

  it('Down 边界 noop(不 wrap;sdlpal `if (wPlayer < wMaxPartyMemberIndex) wPlayer++`)', () => {
    const menu = makeTargetMenu()
    menu.targetCursor = 2 // 最后一个
    inGameMagicMoveDown(menu)
    expect(menu.targetCursor).toBe(2)
  })

  it('Up 中间 → cursor--', () => {
    const menu = makeTargetMenu()
    menu.targetCursor = 1
    inGameMagicMoveUp(menu)
    expect(menu.targetCursor).toBe(0)
  })

  it('Down 中间 → cursor++', () => {
    const menu = makeTargetMenu()
    menu.targetCursor = 0
    inGameMagicMoveDown(menu)
    expect(menu.targetCursor).toBe(1)
  })

  it('Up/Down 按 3 列网格移动并 clamp,不 wrap', () => {
    const menu = makePickedSpellMenu()
    menu.spellMenu!.cursor = 0
    inGameMagicMoveUp(menu)
    expect(menu.spellMenu!.cursor).toBe(0)
    inGameMagicMoveDown(menu)
    expect(menu.spellMenu!.cursor).toBe(2)
  })

  it('Left/Right 逐项移动并 clamp,不跳 disabled', () => {
    const menu = makePickedSpellMenu()
    menu.spellMenu!.items[1]!.disabled = true
    menu.spellMenu!.cursor = 0
    inGameMagicMoveRight(menu)
    expect(menu.spellMenu!.cursor).toBe(1)
    inGameMagicMoveLeft(menu)
    expect(menu.spellMenu!.cursor).toBe(0)
    inGameMagicMoveLeft(menu)
    expect(menu.spellMenu!.cursor).toBe(0)
  })

  it('PgUp/PgDn/Home/End 按 magicmenu.c 网格语义 clamp', () => {
    const menu = makePickedSpellMenu()
    menu.spellMenu!.cursor = 0
    inGameMagicPageDown(menu)
    expect(menu.spellMenu!.cursor).toBe(2)
    inGameMagicPageUp(menu)
    expect(menu.spellMenu!.cursor).toBe(0)
    inGameMagicEnd(menu)
    expect(menu.spellMenu!.cursor).toBe(2)
    inGameMagicHome(menu)
    expect(menu.spellMenu!.cursor).toBe(0)
  })

  it('无法术 caster 进 pick-spell 后八向/翻页/Home/End 全不抛错、cursor 恒 0', () => {
    const noSpellsRoles: PlayerRoles = {
      roles: [makeTargetingCaster(0, 100, 20, []), makeTargetingCaster(1, 100, 6, [300])],
    }
    const menu = createInGameMagicMenu(noSpellsRoles, [0], targetingSpells, targetingMagics)
    expect(menu.phase).toBe('pick-spell')
    expect(menu.spellMenu!.items).toHaveLength(0)
    inGameMagicMoveUp(menu)
    inGameMagicMoveDown(menu)
    inGameMagicMoveLeft(menu)
    inGameMagicMoveRight(menu)
    inGameMagicPageUp(menu)
    inGameMagicPageDown(menu)
    inGameMagicHome(menu)
    inGameMagicEnd(menu)
    expect(menu.spellMenu!.cursor).toBe(0)
    expect(menu.phase).toBe('pick-spell')
  })

  it('pick-target：Left/Right 移动且边界 noop（与 Up/Down 同合同）', () => {
    const menu = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1],
      targetingSpells,
      targetingMagics,
    )
    expect(chooseTargetingSpell(menu, 300)).not.toBeNull() // 单体 → pick-target
    expect(menu.phase).toBe('pick-target')
    inGameMagicMoveRight(menu)
    expect(menu.targetCursor).toBe(1)
    inGameMagicMoveRight(menu)
    expect(menu.targetCursor).toBe(1) // 末位 noop
    inGameMagicMoveLeft(menu)
    expect(menu.targetCursor).toBe(0)
    inGameMagicMoveLeft(menu)
    expect(menu.targetCursor).toBe(0) // 首位 noop
  })

  it('pick-caster 相 PageUp/PageDown/Home/End 不动 casterMenu', () => {
    const menu = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1],
      targetingSpells,
      targetingMagics,
    )
    menu.casterMenu.cursor = 1
    inGameMagicPageUp(menu)
    inGameMagicPageDown(menu)
    inGameMagicHome(menu)
    inGameMagicEnd(menu)
    expect(menu.casterMenu.cursor).toBe(1)
  })

  it('pick-target 相 Home/End 不动 targetCursor', () => {
    const menu = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1],
      targetingSpells,
      targetingMagics,
    )
    chooseTargetingSpell(menu, 300)
    menu.targetCursor = 1
    inGameMagicHome(menu)
    inGameMagicEnd(menu)
    expect(menu.targetCursor).toBe(1)
  })
})
