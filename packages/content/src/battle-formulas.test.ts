import { describe, expect, test } from 'vitest'
import {
  applyEnemyStatus,
  applyPlayerStatus,
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
  // elemRes 补进 base(毒系用例不覆写它;GLM oracle 首版漏 → content 包 typecheck 挂)
  const base = { magStr: 100, def: 50, poisonRes: 0, resistMult: 10, fieldEffect: ZERO, elemRes: ZERO, rngFactor: 1.0 }
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
  test('各元素类型(thunder/water/fire/earth)无抗 → ×2(对齐 fight.c:193-201)', () => {
    // oracle: 一阶段 magic-damage.test 各元素等价(无抗无场 = ×2)
    for (let elem = 1; elem <= 5; elem++) {
      expect(calcMagicDamage({ ...base, elemRes: ZERO, magicData: { baseDamage: 50, elemental: elem } })).toBe(160)
    }
  })
  test('毒系(elem=6)走 poisonRes 非 elemRes(对齐 fight.c:189-192)', () => {
    // oracle: elem>NUM_ELEM(5) = 毒系,mult = 10 - poisonRes/resistMult
    expect(calcMagicDamage({ ...base, poisonRes: 0, magicData: { baseDamage: 50, elemental: 6 } })).toBe(160) // 无毒抗=×2
    expect(calcMagicDamage({ ...base, poisonRes: 50, magicData: { baseDamage: 50, elemental: 6 } })).toBe(80) // 半毒抗减半
    expect(calcMagicDamage({ ...base, poisonRes: 100, magicData: { baseDamage: 50, elemental: 6 } })).toBe(0) // 满毒抗免疫
  })
  test('元素场效加成(fieldEffect.wind=5 → ×1.5,对齐 fight.c:206-213)', () => {
    // oracle: 一阶段 magic-damage.test 场效加成;field ×(10+field)/10
    expect(calcMagicDamage({
      ...base, elemRes: ZERO,
      fieldEffect: { ...ZERO, wind: 5 },
      magicData: { baseDamage: 50, elemental: 1 },
    })).toBe(240) // 160基础 × (10+5)/10 = 240
  })
  test('rngFactor=0.5 法术强度折半(对齐 fight.c:182)', () => {
    // magStr=100×0.5=50;calcBaseDamage(50,50)=20(中间段 50-30+.5);20/4=5;5+50=55
    expect(calcMagicDamage({ ...base, rngFactor: 0.5, elemRes: ZERO, magicData: { baseDamage: 50, elemental: 0 } })).toBe(55)
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
  test('全部 10 种 status 逐回合 -1(对齐一阶段 status.test 真值)', () => {
    // oracle: 一阶段 __tests__/status.test.ts「全部 9 种 status 逐回合 -1」
    // reforge 多一个 dualAttack,共 10 种;fight.c:1632-1638 遍历 kStatusAll 统一递减
    const s = {
      ...emptyBattleStatus(),
      confused: 2, paralyzed: 1, sleep: 3, silence: 1, puppet: 1,
      bravery: 5, protect: 5, haste: 5, slow: 0, dualAttack: 5,
    }
    tickBattleStatus(s)
    expect(s.confused).toBe(1)
    expect(s.paralyzed).toBe(0)
    expect(s.sleep).toBe(2)
    expect(s.silence).toBe(0)
    expect(s.puppet).toBe(0)
    expect(s.bravery).toBe(4)
    expect(s.protect).toBe(4)
    expect(s.haste).toBe(4)
    expect(s.slow).toBe(0) // 0 不变负
    expect(s.dualAttack).toBe(4)
  })
  test('sleep=3 → 2 → 1 → 0 → 0(到 0 不再衰减,一阶段 status.test 真值)', () => {
    const s = { ...emptyBattleStatus(), sleep: 3 }
    tickBattleStatus(s); expect(s.sleep).toBe(2)
    tickBattleStatus(s); expect(s.sleep).toBe(1)
    tickBattleStatus(s); expect(s.sleep).toBe(0)
    tickBattleStatus(s); expect(s.sleep).toBe(0) // 不变负
  })
  test('paralyzed 同 sleep 衰减(一阶段 status.test 真值)', () => {
    const s = { ...emptyBattleStatus(), paralyzed: 2 }
    tickBattleStatus(s); expect(s.paralyzed).toBe(1)
    tickBattleStatus(s); expect(s.paralyzed).toBe(0)
  })
  test('canAct:sleep/paralyzed 阻断;canCastMagic:silence 阻断', () => {
    expect(canAct(emptyBattleStatus())).toBe(true)
    expect(canAct({ ...emptyBattleStatus(), sleep: 1 })).toBe(false)
    expect(canAct({ ...emptyBattleStatus(), paralyzed: 1 })).toBe(false)
    expect(canCastMagic(emptyBattleStatus())).toBe(true)
    expect(canCastMagic({ ...emptyBattleStatus(), silence: 1 })).toBe(false)
  })
})

describe('applyPlayerStatus (global.c:2221-2276 PAL_SetPlayerStatus)', () => {
  test('坏状态已有不刷新(global.c:2234)', () => {
    const st = emptyBattleStatus()
    expect(applyPlayerStatus(st, 'sleep', 3, true)).toBe(true)
    expect(st.sleep).toBe(3)
    expect(applyPlayerStatus(st, 'sleep', 9, true)).toBe(false) // 已有 → 不刷新
    expect(st.sleep).toBe(3)
  })
  test('好状态取较长且仅活人', () => {
    const st = emptyBattleStatus()
    expect(applyPlayerStatus(st, 'bravery', 5, true)).toBe(true)
    expect(applyPlayerStatus(st, 'bravery', 3, true)).toBe(true) // 取长:5 保持
    expect(st.bravery).toBe(5)
    expect(applyPlayerStatus(st, 'protect', 4, false)).toBe(false) // 死人不受 buff
    expect(st.protect).toBe(0)
  })
  test('傀儡仅死者可设(global.c:2240-2255)', () => {
    const st = emptyBattleStatus()
    expect(applyPlayerStatus(st, 'puppet', 999, true)).toBe(false)
    expect(applyPlayerStatus(st, 'puppet', 999, false)).toBe(true)
    expect(st.puppet).toBe(999)
  })
  test('加速↔迟缓互斥(非 CLASSIC 语义;引擎超集)', () => {
    const st = emptyBattleStatus()
    applyPlayerStatus(st, 'haste', 5, true)
    applyPlayerStatus(st, 'slow', 4, true)
    expect(st.haste).toBe(0)
    expect(st.slow).toBe(4)
    applyPlayerStatus(st, 'haste', 2, true)
    expect(st.slow).toBe(0)
    expect(st.haste).toBe(2)
  })
  test('敌方状态 = 直接赋值(script.c:1391;短回合可覆写长回合)', () => {
    const st = emptyBattleStatus()
    applyEnemyStatus(st, 'sleep', 9)
    applyEnemyStatus(st, 'sleep', 2)
    expect(st.sleep).toBe(2)
  })
})
