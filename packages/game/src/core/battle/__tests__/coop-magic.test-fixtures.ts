/** Shared valid inputs for the cooperative action's mechanics and animation callers.
 * This direct-action fixture does not install startBattle resources or hydrate runtime.
 */
import type { Magic, ObjectMagicView, PlayerRole } from '@type-pal/shared'
import { makeBattleFixture } from '../../../__tests__/battle-fixture.js'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { recordingRng } from '../../../__tests__/scripted-rng.js'

export function makeRole(id: number, options: Partial<PlayerRole> = {}): PlayerRole {
  return makeRoleRecord(id, { attackStrength: 0, magicStrength: 0, maxMP: 30, mp: 30, ...options })
}

export const COOP_MAGIC: Magic = {
  id: 50,
  effect: 0,
  type: 'attackAll',
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
  costMP: 30,
  baseDamage: 80,
  elemental: 1,
  sound: 0,
}
// 虚构测试 object 9001 → magicNumber 50;避免占用真实 object 351(武神 summon)。
export const TEST_COOP_OBJ_ID = 9001
export const OBJ_MAGICS: ObjectMagicView[] = [
  {
    id: TEST_COOP_OBJ_ID,
    magicNumber: 50,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: true,
    },
  },
]

export function makeCoopState(
  roles: PlayerRole[],
  statuses: Array<{ sleep?: number }> = [],
  party: number[] = roles.map((role) => role.id),
) {
  const fixture = makeBattleFixture({
    roles,
    party,
    enemies: [makeEnemyRecord({ attackStrength: 0, magicStrength: 0, defense: 0 })],
    rng: recordingRng(),
  })
  fixture.state.players.forEach((player, index) => {
    player.status.sleep = statuses[index]?.sleep ?? 0
  })
  return fixture
}
