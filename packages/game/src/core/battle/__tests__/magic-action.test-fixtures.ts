/** Direct magic-action inputs. Public battle construction and runtime hydration are real;
 * startBattle's resource/phase loop is not installed by this fixture.
 */
import type { BattleField, Enemy, Magic, PlayerRole, Spell } from '@type-pal/shared'
import { makeBattleFixture } from '../../../__tests__/battle-fixture.js'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import { hydratePlayerRolesRuntime } from '../../game-state.js'

export function makeRole(options: Partial<PlayerRole> = {}): PlayerRole {
  return makeRoleRecord(options.id ?? 0, {
    maxHP: 200,
    hp: 200,
    maxMP: 30,
    mp: 30,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    ...options,
  })
}

export function makeEnemy(options: Partial<Enemy> = {}): Enemy {
  return makeEnemyRecord({
    health: 100,
    attackStrength: 0,
    magicStrength: 0,
    defense: 30,
    ...options,
  })
}

export function makeMagic(options: Partial<Magic> = {}): Magic {
  return {
    id: 3,
    effect: 0,
    type: 'normal',
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
    costMP: 5,
    baseDamage: 45,
    elemental: 1,
    sound: 0,
    ...options,
  }
}

export function makeSpell(options: Partial<Spell> = {}): Spell {
  return {
    id: 7,
    _name: 'TestSpell',
    magicNumber: 3,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    ...options,
  }
}

export function makePartyMagicState(
  roles: Partial<PlayerRole>[],
  enemies: Partial<Enemy>[],
  fieldEffect?: BattleField['magicEffect'],
) {
  const fixture = makeBattleFixture({
    roles: roles.map((role, id) => makeRole({ id, ...role })),
    enemies: enemies.map(makeEnemy),
    rng: recordingRng(),
  })
  hydratePlayerRolesRuntime(fixture.gs.PlayerRolesRuntime, fixture.playerRoles)
  fixture.state.phase = 'performAction'
  if (fieldEffect) fixture.state.field.magicEffect = fieldEffect
  return fixture
}

export function makeState(
  role: Partial<PlayerRole>,
  enemies: Partial<Enemy>[],
  fieldEffect?: BattleField['magicEffect'],
) {
  return makePartyMagicState([role], enemies, fieldEffect)
}
