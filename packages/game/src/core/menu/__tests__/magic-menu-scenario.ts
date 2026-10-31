// Real public phase progression for the fixed three-member restorative catalog; specs own cursor-memory cleanup.
import { confirmCaster, confirmSpell, createInGameMagicMenu } from '../in-game-magic-menu.js'
import { restorativeMagics, restorativeRoles, restorativeSpells } from './magic-menu-catalog.js'
export function makePickedSpellMenu() {
  const menu = createInGameMagicMenu(
    restorativeRoles,
    [0, 1, 2],
    restorativeSpells,
    restorativeMagics,
  )
  menu.casterMenu.cursor = 0
  confirmCaster(menu, restorativeRoles, restorativeSpells, restorativeMagics)
  return menu
}
export function makeTargetMenu() {
  const menu = makePickedSpellMenu()
  menu.spellMenu!.cursor = 0
  confirmSpell(menu, restorativeSpells, restorativeMagics)
  return menu
}
