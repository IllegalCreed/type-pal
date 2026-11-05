/** Fresh hydrated inputs for direct actions. Rendering is absent unless a test supplies position anchors. */
import type { Enemy, Item, PlayerRole } from '@type-pal/shared'
import { makeBattleFixture } from '../../../__tests__/battle-fixture.js'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import { hydratePlayerRolesRuntime } from '../../game-state.js'
import type { BattleStatus } from '../battle-state.js'
import type { ActionQueueItem } from '../turn-queue.js'

export function makeRole(options: Partial<PlayerRole> = {}): PlayerRole {
  return makeRoleRecord(options.id ?? 0, {
    maxHP: Math.max(200, options.hp ?? 200),
    maxMP: Math.max(30, options.mp ?? 30),
    hp: 200,
    mp: 30,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    ...options,
  })
}

export function makeActionFixture(
  options: {
    role?: Partial<PlayerRole>
    enemies?: Partial<Enemy>[]
    defending?: boolean
    isBoss?: boolean
    rolls?: number[]
    factors?: number[]
    playerStatus?: Partial<BattleStatus>
    equipFleeRate?: number
  } = {},
) {
  const fixture = makeBattleFixture({
    roles: [makeRole(options.role)],
    enemies: (options.enemies ?? [{}]).map((enemy) =>
      makeEnemyRecord({
        health: 100,
        attackStrength: 0,
        magicStrength: 0,
        defense: 0,
        ...enemy,
      }),
    ),
    isBoss: options.isBoss,
    rng: recordingRng(options.rolls, options.factors),
  })
  const { state, gs, playerRoles } = fixture
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
  gs.mode = 'battle'
  state.phase = 'performAction'
  state.turn = 1
  state.players[0]!.defending = options.defending ?? false
  Object.assign(state.players[0]!.status, options.playerStatus)
  // These direct-action contracts do not install rendering resources/startBattle.
  for (const fighter of [...state.players, ...state.enemies]) {
    delete fighter.posOriginal
    delete fighter.pos
  }
  if (options.equipFleeRate !== undefined)
    gs.rgEquipmentEffect[0]!.rgwFleeRate[0] = options.equipFleeRate
  return fixture
}

export const playerActor: ActionQueueItem = { isEnemy: false, idx: 0, dex: 30, fIsSecond: false }
export const enemyActor: ActionQueueItem = { isEnemy: true, idx: 0, dex: 20, fIsSecond: false }

export function makeItem(options: Partial<Item> = {}): Item {
  return {
    id: 7,
    bitmap: 0,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: false,
      consuming: true,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
    ...options,
  }
}
