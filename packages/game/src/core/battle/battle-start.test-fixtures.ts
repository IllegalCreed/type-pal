import type { AbstractKey, Enemy, EnemyTeam, InputSnapshot, PlayerRole } from '@type-pal/shared'
import {
  makeBattleFieldRecord,
  makeEnemyRecord,
  makeRoleRecord,
} from '../../__tests__/battle-records.js'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState, hydratePlayerRolesRuntime } from '../game-state.js'
import { type StartBattleInput, startBattle } from './battle-system.js'

export function battleInput(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

/** Each caller owns a fresh hydrated state, explicit party and seeded startBattle resources. */
export function startTestBattle(
  options: Partial<
    Pick<
      StartBattleInput,
      'items' | 'spells' | 'magics' | 'objectMagics' | 'objectPoisons' | 'commands' | 'rngSeed'
    >
  > & {
    gs?: GameState
    roles?: PlayerRole[]
    enemies?: Enemy[]
    teamSlots?: EnemyTeam['enemies']
    partyMembers?: number[]
  } = {},
) {
  const gs = options.gs ?? createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const playerRoles = { roles: options.roles ?? [makeRoleRecord(0)] }
  gs.partyMembers = options.partyMembers ?? playerRoles.roles.map((role) => role.id)
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
    items: options.items ?? [],
    spells: options.spells ?? [],
    magics: options.magics ?? [],
    objectMagics: options.objectMagics ?? [],
    objectPoisons: options.objectPoisons ?? [],
    commands: options.commands ?? [{ op: 'end' }],
    rngSeed: options.rngSeed ?? 42,
  })
  return { gs, playerRoles, bus: createCommandBus() }
}
