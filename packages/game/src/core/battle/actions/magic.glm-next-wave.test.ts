/**
 * TEST-GLM-NEW-H-1 / H02 — actions/magic 当前公开合同补测。
 *
 * DM6(fight.c:4719-4775):敌方法术的 1/3 法术自动防御掷骰在 scriptOnUse(4761)/
 * scriptOnSuccess(4768)**之前**完成 —— 「先催眠再伤害」的复合法术不剥夺目标减伤资格,
 * 且 RNG 抽取序固定。battle/__tests__ 无任何 DM6 直测,本文件补:
 *  1. 抽取序:range(0,3) 先于 scriptOnUse
 *  2. 脚本施睡不改预掷结果(与"不施睡"孪生战斗伤害逐位一致)
 *  3. 预掷未中 → 无 +1 除数,伤害更高(可证伪对照)
 */
import type { Magic, ObjectMagicView, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeHBattle, makeHRole, recordingRng } from '../../../__tests__/glm-next-wave/H/harness.js'
import type { RunScriptOptions } from '../../event-system.js'
import { performMagic } from './magic.js'

const SLEEP_SPELL: Spell = {
  id: 5,
  _name: '催眠攻击',
  magicNumber: 2,
  scriptOnSuccess: 0,
  scriptOnUse: 9, // commands[9](测试假 runScript 按 ip 识别)
  scriptDesc: 0,
  flags: {
    usableOutsideBattle: false,
    usableInBattle: true,
    usableToEnemy: true,
    applyToAll: false,
  },
}

const ATTACK_MAGIC: Magic = {
  id: 2,
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
  costMP: 0,
  baseDamage: 45,
  elemental: 1,
  sound: 0,
}

const OBJ_MAGICS: ObjectMagicView[] = []

interface CastResult {
  hpAfter: number
  rngCalls: string[]
}

/** 敌方施 SLEEP_SPELL 打队员 0;scriptOnUse 按 sleepByScript 决定是否给目标上睡眠。 */
function castEnemyMagic(opts: { sleepByScript: boolean; autoDefendRoll: number }): CastResult {
  const role = makeHRole(0, { hp: 500, maxHP: 500, defense: 30 })
  const battle = makeHBattle({ roles: [role] })
  const { state, playerRoles, gs, bus } = battle
  const rng = recordingRng([opts.autoDefendRoll], [10, 10, 10])
  state.rng = rng
  const log: string[] = []
  const runScript = (o: RunScriptOptions): number => {
    log.push(`script@${o.ip}`)
    if (o.ip === SLEEP_SPELL.scriptOnUse && opts.sleepByScript) {
      // 模拟 scriptOnUse 的 0x2D:先给目标上睡眠(再结算伤害)
      state.players[0]!.status.sleep = 2
    }
    return 0
  }
  const hpBefore = playerRoles.roles[0]!.hp
  performMagic({
    state,
    casterIsEnemy: true,
    casterIdx: 0,
    spellId: SLEEP_SPELL.id,
    targetIsEnemy: false,
    targetIdx: 0,
    spells: [SLEEP_SPELL],
    magics: [ATTACK_MAGIC],
    objectMagics: OBJ_MAGICS,
    playerRoles,
    bus,
    commands: [{ op: 'end' }],
    runScript,
    gs,
  })
  expect(playerRoles.roles[0]!.hp).toBeLessThan(hpBefore) // 完整业务结果:目标真掉血
  return {
    hpAfter: playerRoles.roles[0]!.hp,
    rngCalls: [...rng.calls, ...log],
  }
}

describe('DM6:敌方法术自动防御预掷先于脚本(fight.c:4719-4775 → 4761/4768)', () => {
  it('抽取序:range(0,3) 在 scriptOnUse 之前(RNG 序对齐 C)', () => {
    const r = castEnemyMagic({ sleepByScript: true, autoDefendRoll: 0 })
    expect(r.rngCalls[0]).toBe('range(0,3)')
    expect(r.rngCalls.indexOf('script@9')).toBeGreaterThan(0)
    expect(r.rngCalls.indexOf('range(0,3)')).toBeLessThan(r.rngCalls.indexOf('script@9'))
  })

  it('脚本施睡不剥夺预掷资格:与「不施睡」孪生战斗伤害逐位一致', () => {
    const slept = castEnemyMagic({ sleepByScript: true, autoDefendRoll: 0 })
    const awake = castEnemyMagic({ sleepByScript: false, autoDefendRoll: 0 })
    expect(slept.hpAfter).toBe(awake.hpAfter) // 同一预掷结果 → 同一伤害
  })

  it('预掷未中(range(0,3)!=0)→ 无 +1 减伤除数,伤害高于预掷命中(可证伪对照)', () => {
    const hit = castEnemyMagic({ sleepByScript: false, autoDefendRoll: 0 })
    const miss = castEnemyMagic({ sleepByScript: false, autoDefendRoll: 1 })
    expect(miss.hpAfter).toBeLessThan(hit.hpAfter) // 掉血更多 = 减伤更少
  })
})
