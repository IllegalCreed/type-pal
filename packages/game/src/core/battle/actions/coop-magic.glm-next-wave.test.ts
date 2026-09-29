/**
 * TEST-GLM-NEW-H-1 / H05 — actions/coop-magic 当前公开合同补测。
 *
 * coop-magic.test.ts 的「退化普攻」用例不传 gs,DL6(fight.c:3374-3378 退化改 ActionType 后
 * 从头跑 attack case → 3756-3757 隐藏经验累计)无直测。本文件钉:
 *  - healthy≤1 退化普攻 → rgAttackExp.wCount +1、rgHealthExp.wCount += R(2,3)
 *  - RNG 抽取序:普攻修饰(1,2)/(0,5)/(0,11)/float 先、(2,3) 收尾(fight.c 顺序)
 *  - 退化不付协力 HP 代价(fight.c:3961-3967 只对 contributors)
 */
import type { Magic, ObjectMagicView } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  makeHBattle,
  makeHEnemy,
  makeHRole,
  recordingRng,
} from '../../../__tests__/glm-next-wave/H/harness.js'
import type { ActionQueueItem } from '../turn-queue.js'
import { performCoopMagic } from './coop-magic.js'

const COOP_MAGIC: Magic = {
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

const COOP_OBJ_ID = 9001
const OBJ_MAGICS: ObjectMagicView[] = [
  {
    id: COOP_OBJ_ID,
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

describe('performCoopMagic 退化普攻 × DL6 隐藏经验(fight.c:3374-3378 → 3756-3757)', () => {
  it('healthy≤1(仅发起者活)→ 退化普攻:敌掉血、不付 HP 代价、attackExp+1/healthExp+=R(2,3)', () => {
    const roles = [makeHRole(0, { attackStrength: 40, magicStrength: 60 }), makeHRole(1, { hp: 0 })]
    const battle = makeHBattle({
      roles,
      enemies: [makeHEnemy({ id: 100, health: 9000 })],
    })
    const { state, playerRoles, bus, gs } = battle
    const actor: ActionQueueItem = { isEnemy: false, idx: 0, dex: 30, fIsSecond: false }
    const enemyBefore = state.enemies[0]!.e.health
    const rng = recordingRng([1, 1, 1, 2], [1])
    state.rng = rng

    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: COOP_OBJ_ID,
      targetIdx: 0,
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus,
      gs,
      actor,
    })

    expect(state.enemies[0]!.e.health).toBeLessThan(enemyBefore) // 真打了普攻
    expect(playerRoles.roles[0]!.hp).toBe(500) // 退化不付协力 HP 代价(fight.c:3961 只对 contributors)
    expect(gs.Exp.rgAttackExp[0]!.wCount).toBe(1) // fight.c:3756
    expect(gs.Exp.rgHealthExp[0]!.wCount).toBe(2) // fight.c:3757 R(2,3)=2(脚本化)
  })

  it('RNG 序:普攻修饰(jitter→crit→李逍遥→float)先消耗,(2,3) 隐藏经验最后(C 同序)', () => {
    const roles = [makeHRole(0, { attackStrength: 40 }), makeHRole(1, { hp: 0 })]
    const battle = makeHBattle({
      roles,
      enemies: [makeHEnemy({ id: 100, health: 9000 })],
    })
    const { state, playerRoles, bus, gs } = battle
    const rng = recordingRng([1, 1, 1, 3], [1])
    state.rng = rng
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: COOP_OBJ_ID,
      targetIdx: 0,
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus,
      gs,
      actor: { isEnemy: false, idx: 0, dex: 30, fIsSecond: false },
    })
    expect(rng.calls).toEqual([
      'rangeInclusive(1,2)', // jitter
      'rangeInclusive(0,5)', // crit roll
      'rangeInclusive(0,11)', // 李逍遥(role 0)会心 roll
      'rangeFloat(1,1.125)', // 末浮动
      'rangeInclusive(2,3)', // DL6:healthExp += R(2,3)
    ])
    expect(gs.Exp.rgHealthExp[0]!.wCount).toBe(3)
  })

  it('双人健康(≥2 contributors)→ 正常合击,无 attackExp 累计、付 HP 代价', () => {
    const roles = [makeHRole(0, { attackStrength: 40, magicStrength: 60 }), makeHRole(1)]
    const battle = makeHBattle({
      roles,
      enemies: [makeHEnemy({ id: 100, health: 9000 })],
    })
    const { state, playerRoles, bus, gs } = battle
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus,
    })
    expect(gs.Exp.rgAttackExp[0]!.wCount ?? 0).toBe(0) // 合击不积普攻隐藏经验
    expect(playerRoles.roles[0]!.hp).toBe(470) // 付 costMP=30(fight.c:3961-3967)
    expect(playerRoles.roles[1]!.hp).toBe(470)
  })
})
