/** Menu input/data fixture only. No automatic hooks, IO mocks or shared mutable state.
 * Catalog flags/names are synthetic; OBJECT ids stay in the item's legal domain. */
import type { AbstractKey, Command, InputSnapshot, Item, PlayerRoles } from '@type-pal/shared'
import { makeRoleRecord as makeRole } from '../../__tests__/battle-records.js'
import { setGlobalEvents } from '../event-system.js'
import { createInitialGameState, type GameState, hydratePlayerRolesRuntime } from '../game-state.js'
import { inventoryItem } from './__tests__/inventory-fixture.js'
import type { setMenuCatalogs } from './menu-driver.js'
export function menuInput(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}
export function createMenuGameState(party = [0, 1]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = party
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, menuRoleRecords())
  return gs
}
export function menuItem(
  id: number,
  overrides: Partial<Omit<Item, 'flags'>> & { flags?: Partial<Item['flags']> } = {},
): Item {
  const { flags, ...fields } = overrides
  return {
    ...inventoryItem(id, {
      name: `Item${id}`,
      bitmap: 0,
      price: 10,
      flags: { equipableBy: [true, true, true, true, true, true], ...flags },
    }),
    ...fields,
  }
}

export function menuRoleRecords(): PlayerRoles {
  return {
    roles: ['甲', '乙'].map((_name, id) =>
      makeRole(id, {
        _name,
        level: 5,
        maxHP: 100,
        hp: 50,
        attackStrength: 10,
        magicStrength: 10,
        defense: 10,
        dexterity: 10,
      }),
    ),
  }
}
export function installNoopMenuScripts(): void {
  const commands: Command[] = [
    { op: 'end', label: 'L_5' },
    { op: 'end', label: 'L_6' },
    { op: 'end', label: 'L_7' },
    { op: 'end', label: 'L_8' },
    { op: 'end', label: 'L_9' },
  ]
  setGlobalEvents(commands)
}
export const defaultMenuCatalogs = (): Parameters<typeof setMenuCatalogs>[0] => ({
  items: [menuItem(105), menuItem(106)],
  spells: [],
  magics: [],
  playerRoles: menuRoleRecords(),
})
