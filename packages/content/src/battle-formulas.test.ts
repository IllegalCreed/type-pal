import { describe, expect, test } from 'vitest'
import {
  buildActionQueue,
  calcBaseDamage,
  calcMagicDamage,
  calcPhysicalAttackDamage,
  canAct,
  canCastMagic,
  emptyBattleStatus,
  getEnemyDexterity,
  getPlayerActualDexterity,
  tickBattleStatus,
} from './battle-formulas.js'

// golden 向量复用一阶段 __tests__/formulas.test.ts + turn-queue.test.ts + status.test.ts
// （用户实测过的真值,对齐 sdlpal fight.c;M4 公式层是 1:1 移植,数值不许漂移）。
const ZERO = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }

describe('calcBaseDamage (fight.c:131-171)', () => {
  test('atk>def / 中间段 / 0 段 / SHORT 溢出', () => {
    expect(calcBaseDamage(100, 50)).toBe(120) // 200-80+.5 → 120
    expect(calcBaseDamage(50, 70)).toBe(8) // 50-42+.5 → 8
    expect(calcBaseDamage(50, 50)).toBe(20) // 中间段 50-30+.5 → 20
    expect(calcBaseDamage(60, 100)).toBe(0) // 60>60 false → 0
    expect(calcBaseDamage(65535, 0)).toBe(-2) // 131070 经 SHORT cast → -2
  })
})

describe('calcPhysicalAttackDamage (fight.c:253-285)', () => {
  test('resist 1/2/3/0', () => {
    expect(calcPhysicalAttackDamage(100, 50, 1)).toBe(120)
    expect(calcPhysicalAttackDamage(100, 50, 2)).toBe(60)
    expect(calcPhysicalAttackDamage(100, 50, 3)).toBe(40)
    expect(calcPhysicalAttackDamage(100, 50, 0)).toBe(120) // 0 不除
    expect(calcPhysicalAttackDamage(10, 100, 2)).toBe(0)
  })
})

describe('calcMagicDamage (fight.c:174-249)', () => {
  const base = { magStr: 100, def: 50, poisonRes: 0, resistMult: 10, fieldEffect: ZERO, rngFactor: 1.0 }
  test('非元素 base/4+magicBase', () => {
    expect(calcMagicDamage({ ...base, elemRes: ZERO, magicData: { baseDamage: 50, elemental: 0 } })).toBe(80)
  })
  test('元素 wind 无抗无场 → ×2', () => {
    expect(calcMagicDamage({ ...base, elemRes: ZERO, magicData: { baseDamage: 50, elemental: 1 } })).toBe(160)
  })
  test('半抗 50 → 减半;满抗 100 → 免疫 0', () => {
    expect(calcMagicDamage({ ...base, elemRes: { ...ZERO, wind: 50 }, magicData: { baseDamage: 50, elemental: 1 } })).toBe(80)
    expect(calcMagicDamage({ ...base, elemRes: { ...ZERO, wind: 100 }, magicData: { baseDamage: 50, elemental: 1 } })).toBe(0)
  })
})

describe('dexterity (fight.c:289-389)', () => {
  test('敌:(level+6)*3 + dex', () => {
    expect(getEnemyDexterity(4, 10)).toBe((4 + 6) * 3 + 10) // 40
    expect(getEnemyDexterity(1, -5)).toBe((1 + 6) * 3 - 5) // 16(SHORT 负 dex)
  })
  test('队员:haste ×3,上限 999', () => {
    expect(getPlayerActualDexterity(100, false)).toBe(100)
    expect(getPlayerActualDexterity(100, true)).toBe(300)
    expect(getPlayerActualDexterity(400, true)).toBe(999) // 1200 钳 999
  })
})

describe('buildActionQueue (fight.c:1451-1584)', () => {
  test('dex 降序;同 dex 敌人在前', () => {
    const q = buildActionQueue([{ idx: 0, dex: 50 }], [{ idx: 0, dex: 50, dualMove: false }])
    expect(q.map((i) => i.isEnemy)).toEqual([true, false]) // 同 dex 敌人先
  })
  test('dualMove:小 dex 二抽标 fIsSecond', () => {
    const q = buildActionQueue([], [{ idx: 0, dex: 60, dualMove: true, dex2: 30 }])
    expect(q).toHaveLength(2)
    expect(q[0]).toMatchObject({ dex: 60, fIsSecond: false })
    expect(q[1]).toMatchObject({ dex: 30, fIsSecond: true })
  })
  test('dualMove 无 dex2:回退 dex-1 恒第二动', () => {
    const q = buildActionQueue([], [{ idx: 2, dex: 40, dualMove: true }])
    expect(q[1]).toMatchObject({ idx: 2, dex: 39, fIsSecond: true })
  })
})

describe('status (fight.c:1632-1661)', () => {
  test('回合末全计数器 -1(含 boolean 类 haste/protect)', () => {
    const s = { ...emptyBattleStatus(), sleep: 2, haste: 1, protect: 3, silence: 0 }
    tickBattleStatus(s)
    expect(s.sleep).toBe(1)
    expect(s.haste).toBe(0)
    expect(s.protect).toBe(2)
    expect(s.silence).toBe(0) // 0 不动
  })
  test('canAct:sleep/paralyzed 阻断;canCastMagic:silence 阻断', () => {
    expect(canAct(emptyBattleStatus())).toBe(true)
    expect(canAct({ ...emptyBattleStatus(), sleep: 1 })).toBe(false)
    expect(canAct({ ...emptyBattleStatus(), paralyzed: 1 })).toBe(false)
    expect(canCastMagic(emptyBattleStatus())).toBe(true)
    expect(canCastMagic({ ...emptyBattleStatus(), silence: 1 })).toBe(false)
  })
})
