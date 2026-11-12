/**
 * Player casualty sounds through physical playback and the legacy HP sweep.
 *
 * sdlpal 真值:
 *   - 阵亡音 rgwDeathSound:enemy 攻击致死处内联(fight.c:4816/4851/5110,HP→0)。
 *   - 濒死音 rgwDyingSound:PAL_BattlePostActionCheck(fight.c:834-850)—— HP<min(100,maxHP/5)
 *     前态门用未钳制的 maxHP/5；当前HP才用 min(100,maxHP/5)。
 * The sweep cases use explicit HP snapshots. Physical cases drive a complete
 * turn and check the sound commands against the fighter pose and timeline.
 */
import type { PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { createCommandBus } from '../../command-bus.js'
import { createInitialGameState } from '../../game-state.js'
import { battleInput, startTestBattle } from '../battle-start.test-fixtures.js'
import { emitPlayerCasualtySounds, getBattleLiveRoles, tickBattle } from '../battle-system.js'

function role(opts: {
  hp: number
  maxHP?: number
  deathSound?: number
  dyingSound?: number
}): PlayerRole {
  return makeRoleRecord(0, {
    hp: opts.hp,
    maxHP: opts.maxHP ?? 100,
    deathSound: opts.deathSound ?? 23,
    dyingSound: opts.dyingSound ?? 19,
  })
}

function run(
  roleOpts: Parameters<typeof role>[0],
  prevHp: number,
  prePoisonHp?: number,
): { sounds: number[]; prevHp: number } {
  const bus = createCommandBus()
  const players = [{ roleId: 0, prevHp }]
  const playerRoles: PlayerRoles = { roles: [role(roleOpts)] }
  const pre = prePoisonHp === undefined ? undefined : new Map([[0, prePoisonHp]])
  emitPlayerCasualtySounds(players, playerRoles, bus, pre)
  const sounds = bus
    .drain()
    .map(({ cmd }) => cmd)
    .filter((cmd) => cmd.op === 'playSound')
    .map((cmd) => cmd.soundId)
  return { sounds, prevHp: players[0]!.prevHp }
}

describe('player casualty sound sweep', () => {
  it('本回合阵亡(prevHp>0 → hp=0)→ deathSound,prevHp 快照为 0', () => {
    const r = run({ hp: 0, deathSound: 23 }, 100)
    expect(r.sounds).toEqual([23])
    expect(r.prevHp).toBe(0)
  })

  it('刚跨入濒死(prevHp>=min(100,maxHP/5),hp<阈值,hp>0)→ dyingSound', () => {
    // maxHP=100 → 阈值=20;prevHp=100>=20,hp=15<20 → 跨入
    expect(run({ hp: 15, dyingSound: 19 }, 100).sounds).toEqual([19])
  })

  it('回合初已濒死(prevHp<阈值)再掉血 → 不重播 dyingSound', () => {
    // prevHp=15<20 → 非"刚跨入" → 无音
    expect(run({ hp: 10 }, 15).sounds).toEqual([])
  })

  it('掉血但仍在阈值上(未濒死、未死)→ 无音', () => {
    expect(run({ hp: 60 }, 100).sounds).toEqual([])
  })

  it('HP unchanged: no sound and snapshot remains current', () => {
    const r = run({ hp: 80 }, 80)
    expect(r.sounds).toEqual([])
    expect(r.prevHp).toBe(80)
  })

  it('deathSound=0(无音数据)→ 阵亡也不 emit', () => {
    expect(run({ hp: 0, deathSound: 0 }, 100).sounds).toEqual([])
  })

  it('dyingSound=0 → 跨入濒死也不 emit', () => {
    expect(run({ hp: 15, dyingSound: 0 }, 100).sounds).toEqual([])
  })

  // M6 死因门控(2026-06-03 审计:sdlpal deathSound 仅敌攻致死播,毒杀不播,fight.c:4816/4851/5110 vs 毒 tick 无)。
  it('敌攻致死(prePoisonHp=0,毒前已死)→ 播 deathSound', () => {
    // prevHp=100(回合初活)→ hp=0;毒前已 0(死于动作)→ 播
    expect(run({ hp: 0, deathSound: 23 }, 100, 0).sounds).toEqual([23])
  })
  it('毒杀致死(prePoisonHp>0,毒后才→0)→ 不播 deathSound', () => {
    // prevHp=100(回合初活)→ hp=0,但毒前 hp=40(>0)→ 死于毒,不播
    expect(run({ hp: 0, deathSound: 23 }, 100, 40).sounds).toEqual([])
  })
  it('毒致濒死(非死)→ dyingSound 照播(不门控死因)', () => {
    // 毒前 hp=40,毒后 hp=15(<阈值20,>0),回合初 100 → 跨入濒死,dyingSound 播
    expect(run({ hp: 15, dyingSound: 19 }, 100, 40).sounds).toEqual([19])
  })

  it.each([
    { reason: 'previous HP was already below raw maxHP/5', hp: 99, previous: 150, sounds: [] },
    {
      reason: 'current HP is above the capped dying threshold',
      hp: 150,
      previous: 200,
      sounds: [],
    },
    { reason: 'both thresholds are crossed', hp: 99, previous: 2000, sounds: [19] },
  ])('$reason for maxHP 9999', ({ hp, previous, sounds }) => {
    expect(run({ hp, maxHP: 9999, dyingSound: 19 }, previous).sounds).toEqual(sounds)
  })
})

function playPhysicalRound({
  hp = 40,
  sleepingRole,
  auto = false,
}: {
  hp?: number
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
        maxHP: 40,
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

  it.each([
    { name: 'sleeping target', sleepingRole: 0, remainingHp: 4 },
    { name: 'sleeping off-roster guardian', sleepingRole: 2, remainingHp: 5 },
    { name: 'automatic battle', auto: true, remainingHp: 5 },
  ])('omits dying sound for $name', ({ remainingHp, ...options }) => {
    expect(playPhysicalRound(options)).toEqual({ hp: remainingHp, sounds: [impact] })
  })
})
