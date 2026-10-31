/** Partial battle fixture: fresh state and bus, production seed7 RNG by default.
 * Does not hydrate runtime or install startBattle resources; lifecycle tests own those prerequisites.
 */
import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { type BattleState, createBattleState } from '../core/battle/battle-state.js'
import { type BusEntry, type CommandBus, createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { createSeedableRng, type SeedableRng } from '../core/rng.js'
import { makeBattleFieldRecord, makeEnemyRecord, makeRoleRecord } from './battle-records.js'

interface BattleFixtureOptions {
  roles?: PlayerRole[]
  /** party roleIds；默认按roles顺序取id，未传roles时为[0]。 */
  party?: number[]
  /** 敌槽(已展开;null = 空敌槽)。默认 [makeEnemyRecord()]。 */
  enemies?: Array<Enemy | null>
  isBoss?: boolean
  rng?: SeedableRng
}

interface BattleFixture {
  gs: GameState
  state: BattleState
  playerRoles: PlayerRoles
  bus: CommandBus
  drain: () => BusEntry[]
}

/**
 * 公开工厂构造BattleState及直接角色输入；不hydrate运行态，也不安装完整startBattle资源。
 * 需要这些前提的结算/宿主测试须走真实初始化，不能把本helper当完整开战。
 */
export function makeBattleFixture(opts: BattleFixtureOptions = {}): BattleFixture {
  const roles = opts.roles ?? [makeRoleRecord(0)]
  const party = opts.party ?? roles.map((r) => r.id)
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = party
  const playerRoles: PlayerRoles = { roles }
  const state = createBattleState({
    gs,
    playerRoles,
    enemies: opts.enemies ?? [makeEnemyRecord()],
    field: makeBattleFieldRecord(),
    isBoss: opts.isBoss ?? false,
    rng: opts.rng ?? createSeedableRng(7),
  })
  gs.battleState = state // Partial fixture ownership: attach the state; startBattle resource installation is separate.
  const bus = createCommandBus()
  return { gs, state, playerRoles, bus, drain: () => bus.drain() }
}
