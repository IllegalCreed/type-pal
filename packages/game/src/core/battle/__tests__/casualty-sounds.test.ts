/**
 * Player casualty sounds through actual physical attack playback.
 *
 * sdlpal 真值:
 *   - 阵亡音 rgwDeathSound:enemy 攻击致死处内联(fight.c:4816/4851/5110,HP→0)。
 *   - 濒死音 rgwDyingSound:PAL_BattlePostActionCheck(fight.c:834-850)—— HP<min(100,maxHP/5)
 *     前态门用未钳制的 maxHP/5；当前HP才用 min(100,maxHP/5)。
 * Complete turns check each sound command against the fighter pose and timeline.
 */
import { describe, expect, it } from 'vitest'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { createInitialGameState } from '../../game-state.js'
import { battleInput, startTestBattle } from '../battle-start.test-fixtures.js'
import { getBattleLiveRoles, tickBattle } from '../battle-system.js'

function playPhysicalRound({
  hp = 40,
  maxHP = 40,
  sleepingRole,
  auto = false,
}: {
  hp?: number
  maxHP?: number
  sleepingRole?: number
  auto?: boolean
} = {}) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.fAutoBattle = auto
  if (sleepingRole !== undefined) gs.rgPlayerStatus[sleepingRole]![2] = 1
  const { bus } = startTestBattle({
    gs,
    partyMembers: [0, 1],
    roles: [
      makeRoleRecord(0, {
        hp,
        maxHP,
        defense: 9,
        dexterity: 3,
        coveredBy: 2,
        deathSound: 23,
        dyingSound: 19,
      }),
      makeRoleRecord(1, { defense: 466, dexterity: 1 }),
      makeRoleRecord(2),
    ],
    enemies: [makeEnemyRecord({ level: 1, attackStrength: 0, dexterity: 0, callSound: 352 })],
    // Sleep removes the target's queue draw. These seeds both select slot 0.
    rngSeed: sleepingRole === 0 ? 15 : 6,
  })
  const state = gs.battleState!
  const player = state.players[0]!
  const home = player.posOriginal!
  const input = battleInput(auto ? [] : ['Defend'])
  const sounds = []
  for (let frame = 0; frame < 120 && state.turn === 0; frame++) {
    tickBattle(gs, input, bus)
    for (const { cmd } of bus.drain()) {
      if (cmd.op !== 'playSound') continue
      sounds.push({
        id: cmd.soundId,
        frame: player.currentFrame,
        offset: [player.pos!.x - home.x, player.pos!.y - home.y],
        playing: Boolean(state.battleAnim),
      })
    }
  }
  expect(state.turn).toBe(1)
  return { hp: getBattleLiveRoles(gs)!.roles[0]!.hp, sounds }
}

describe('enemy physical casualty sounds', () => {
  const impact = { id: 352, frame: 4, offset: [0, 0], playing: true }

  it('plays the new dying sound once after returning to the dying pose with the guardian off-roster', () => {
    expect(playPhysicalRound()).toEqual({
      hp: 5,
      sounds: [impact, { id: 19, frame: 1, offset: [0, 0], playing: false }],
    })
  })

  it('plays the direct death sound once at the second knockback while the hit pose is still drawn', () => {
    expect(playPhysicalRound({ hp: 5 })).toEqual({
      hp: 0,
      sounds: [impact, { id: 23, frame: 4, offset: [10, 5], playing: true }],
    })
  })

  it('uses the uncapped previous HP threshold before announcing a new dying pose', () => {
    expect(playPhysicalRound({ hp: 125, maxHP: 750 })).toEqual({ hp: 90, sounds: [impact] })
  })

  it.each([
    { name: 'sleeping target', sleepingRole: 0, remainingHp: 4 },
    { name: 'sleeping off-roster guardian', sleepingRole: 2, remainingHp: 5 },
    { name: 'automatic battle', auto: true, remainingHp: 5 },
  ])('omits dying sound for $name', ({ remainingHp, ...options }) => {
    expect(playPhysicalRound(options)).toEqual({ hp: remainingHp, sounds: [impact] })
  })
})
