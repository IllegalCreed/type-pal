/** Magic-menu input factories return owned data/state; shared uniform catalogs are borrowed read-only. */
import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { makeRoles as makeBaseRoles } from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import {
  createInitialGameState,
  type GameState,
  hydratePlayerRolesRuntime,
  projectRuntimeToBattleRoles,
} from '../../core/game-state.js'
import { magicWithCost } from '../../core/menu/__tests__/magic-cost-fixture.js'
import type { InGameMagicMenuState } from '../../core/menu/in-game-magic-menu.js'
export function uniformCasterRoles(): ReturnType<typeof makeBaseRoles> {
  const roles = makeBaseRoles()
  for (const role of roles.roles) role.mp = 20
  return roles
}
export function createHydratedUniformState(
  roles: ReturnType<typeof uniformCasterRoles>,
  party = [0, 1],
) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [...party]
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, roles)
  return gs
}
export const uniformSpells: Spell[] = [menuSpell(300, '甲', 1), menuSpell(301, '乙', 2)]
export const uniformMagics: Magic[] = [magicWithCost(1, 0), magicWithCost(2, 999)]
export function setRuntimeMagicAndProjectRoles(
  gs: GameState,
  staticRoles: PlayerRoles,
  roleId: number,
  spellIds: number[],
  mp: number,
): PlayerRoles {
  gs.PlayerRolesRuntime.rgwMP[roleId] = mp
  spellIds.forEach((id, slot) => {
    gs.PlayerRolesRuntime.rgwMagic[slot]![roleId] = id
  })
  return projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, staticRoles)
}
export function spellSnapshot(
  party: number[],
  spells: Spell[],
  casterId: number | undefined,
): InGameMagicMenuState {
  return {
    phase: 'pick-spell',
    casterMenu: {
      items: party.map((id) => ({ id, label: '甲', disabled: false })),
      cursor: 0,
      pageSize: 4,
      pageOffset: 0,
    },
    selectedCasterId: casterId,
    spellMenu: {
      items: spells.map((spell) => ({
        id: spell.id,
        label: spell._name ?? '甲',
        disabled: false,
      })),
      cursor: 0,
      pageSize: 15,
      pageOffset: 0,
    },
    targetCursor: 0,
    partyMembers: [...party],
  }
}
export function menuMagic(id: number, costMP: number): Magic {
  return {
    id,
    effect: 0,
    type: 'applyToPlayer',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  }
}
export function menuSpell(id: number, name: string, magicNumber: number, scriptDesc = 0): Spell {
  return {
    id,
    _name: name,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
  }
}
