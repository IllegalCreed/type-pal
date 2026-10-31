/** Fresh battle state and bus with the legacy queued clamping RNG policy.
 * Base records are shared; runtime hydration and startBattle resources belong to callers.
 */
import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { type BattleState, createBattleState } from '../../core/battle/battle-state.js'
import { type CommandBus, createCommandBus } from '../../core/command-bus.js'
import { createInitialGameState, type GameState } from '../../core/game-state.js'
import type { SeedableRng } from '../../core/rng.js'
import { makeBattleFieldRecord, makeEnemyRecord, makeRoleRecord } from '../battle-records.js'

export function freshGs(): GameState {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

/** Queued integer stub with legacy clamping/default-low policy; not an LCG or seed replay. */
export function seqRng(seq: number[] = []): SeedableRng & { calls: string[] } {
  const calls: string[] = []
  let i = 0
  return {
    calls,
    next: () => 0,
    range: (lo: number, hi: number) => {
      calls.push(`range(${lo},${hi})`)
      const v = seq[i++] ?? lo
      return Math.min(hi - 1, Math.max(lo, v))
    },
    rangeInclusive: (lo: number, hi: number) => {
      calls.push(`rangeInclusive(${lo},${hi})`)
      const v = seq[i++] ?? lo
      return Math.min(hi, Math.max(lo, v))
    },
    rangeFloat: (lo: number, hi: number) => {
      calls.push(`rangeFloat(${lo},${hi})`)
      return lo
    },
    getState: () => 0,
  }
}

export interface BattleFixture {
  gs: GameState
  state: BattleState
  playerRoles: PlayerRoles
  bus: CommandBus
}

/** 公开工厂 createBattleState + 生产不变量 gs.battleState 挂接。 */
export function makeBattle(
  opts: {
    roles?: PlayerRole[]
    party?: number[]
    enemies?: Array<Enemy | null>
    isBoss?: boolean
    rng?: SeedableRng
  } = {},
): BattleFixture {
  const roles = opts.roles ?? [makeRoleRecord(0)]
  const party = opts.party ?? roles.map((r) => r.id)
  const gs = freshGs()
  gs.partyMembers = party
  const playerRoles: PlayerRoles = { roles }
  const state = createBattleState({
    gs,
    playerRoles,
    enemies: opts.enemies ?? [makeEnemyRecord()],
    field: makeBattleFieldRecord(),
    isBoss: opts.isBoss ?? false,
    rng: opts.rng ?? seqRng(),
  })
  gs.battleState = state
  return { gs, state, playerRoles, bus: createCommandBus() }
}
