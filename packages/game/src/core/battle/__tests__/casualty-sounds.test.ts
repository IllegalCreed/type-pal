/**
 * M6 玩家濒死/阵亡音 —— emitPlayerCasualtySounds 单测。
 *
 * sdlpal 真值:
 *   - 阵亡音 rgwDeathSound:enemy 攻击致死处内联(fight.c:4816/4851/5110,HP→0)。
 *   - 濒死音 rgwDyingSound:PAL_BattlePostActionCheck(fight.c:834-850)—— HP<maxHP/5 且回合初 >= 阈值(刚跨入)。
 * ts 集中到每回合后处理一次,比对本回合初 prevHp。
 */
import type { PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from '../../command-bus.js'
import { emitPlayerCasualtySounds } from '../battle-system.js'

/** 最小 role(只用到 hp/maxHP/deathSound/dyingSound)。 */
function role(opts: { hp: number; maxHP?: number; deathSound?: number; dyingSound?: number }): PlayerRole {
  return { hp: opts.hp, maxHP: opts.maxHP ?? 100, deathSound: opts.deathSound ?? 23, dyingSound: opts.dyingSound ?? 19 } as unknown as PlayerRole
}

function run(roleOpts: Parameters<typeof role>[0], prevHp: number): { sounds: number[]; prevHp: number } {
  const bus = createCommandBus()
  const players = [{ roleId: 0, prevHp }]
  const playerRoles: PlayerRoles = { roles: [role(roleOpts)] }
  emitPlayerCasualtySounds(players, playerRoles, bus)
  const sounds = bus.drain().filter(c => c.cmd.op === 'playSound').map(c => (c.cmd as { soundId: number }).soundId)
  return { sounds, prevHp: players[0]!.prevHp }
}

describe('M6 emitPlayerCasualtySounds', () => {
  it('本回合阵亡(prevHp>0 → hp=0)→ deathSound,prevHp 快照为 0', () => {
    const r = run({ hp: 0, deathSound: 23 }, 100)
    expect(r.sounds).toEqual([23])
    expect(r.prevHp).toBe(0)
  })

  it('刚跨入濒死(prevHp>=maxHP/5,hp<maxHP/5,hp>0)→ dyingSound', () => {
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

  it('未掉血(hp>=prevHp)→ 无音,prevHp 跟到当前 hp', () => {
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
})
