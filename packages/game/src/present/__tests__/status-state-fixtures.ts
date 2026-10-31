/** Fresh hydrated status state; canonical roles keep MP within maxMP. Callers own the returned state. */
import type { GameState } from '../../core/game-state.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../../core/game-state.js'
import { makeRoles } from './menu-state-fixtures.js'
export function createHydratedStatusState(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, makeRoles())
  return gs
}
