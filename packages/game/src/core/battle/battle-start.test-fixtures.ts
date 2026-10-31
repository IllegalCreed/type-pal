import type { AbstractKey, Enemy, EnemyTeam, InputSnapshot, PlayerRole } from '@type-pal/shared'
import {
  makeBattleFieldRecord,
  makeEnemyRecord,
  makeRoleRecord,
} from '../../__tests__/battle-records.js'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState, hydratePlayerRolesRuntime } from '../game-state.js'
import { startBattle } from './battle-system.js'

export function battleInput(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

/** Each caller owns a fresh hydrated state, explicit party and seeded startBattle resources. */
export function startTestBattle(
  options: {
    gs?: GameState
    roles?: PlayerRole[]
    enemies?: Enemy[]
    teamSlots?: EnemyTeam['enemies']
  } = {},
) {
  const gs = options.gs ?? createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const playerRoles = { roles: options.roles ?? [makeRoleRecord(0)] }
  gs.partyMembers = playerRoles.roles.map((role) => role.id)
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 0,
    isBoss: false,
    enemies: options.enemies ?? [makeEnemyRecord()],
    enemyTeams: [{ id: 0, enemies: options.teamSlots ?? [100, 0xffff, 0xffff, 0xffff, 0xffff] }],
    battleFields: [makeBattleFieldRecord()],
    playerRoles,
    items: [],
    spells: [],
    magics: [],
    commands: [{ op: 'end' }],
    rngSeed: 42,
  })
  return { gs, playerRoles, bus: createCommandBus() }
}
