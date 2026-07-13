import { describe, expect, it } from 'vitest'
import {
  calcBaseDamage,
  calcMagicDamage,
  calcPhysicalAttackDamage,
  getEnemyDexterity,
  getPlayerActualDexterity,
} from '../formulas.js'

/**
 * 公式测试 —— D29 + D30 数值忠诚度。手算输入 → 期望输出,
 * 与 sdlpal `fight.c` 行号一一对照。具体 1:1 数值由 T23 baseline 跑 sdlpal harness 校验。
 */

describe('calcBaseDamage (fight.c:131-171)', () => {
  it('atk > def → trunc(atk*2 - def*1.6 + 0.5)', () => {
    // atk=100, def=50: 200 - 80 + 0.5 = 120.5 → trunc → 120
    expect(calcBaseDamage(100, 50)).toBe(120)
  })

  it('atk > def*0.6 但 atk <= def → trunc(atk - def*0.6 + 0.5)', () => {
    // atk=50, def=70: 50 > 42 ✓, 50 < 70 → 50 - 42 + 0.5 = 8.5 → trunc → 8
    expect(calcBaseDamage(50, 70)).toBe(8)
  })

  it('atk <= def*0.6 → 0', () => {
    expect(calcBaseDamage(30, 100)).toBe(0)
    expect(calcBaseDamage(0, 10)).toBe(0)
    // atk=60, def=100, def*0.6=60: 60 > 60 是 false → 0
    expect(calcBaseDamage(60, 100)).toBe(0)
  })

  it('atk == def → 走中间分支(50 - 30 + 0.5 = 20.5 → 20)', () => {
    // atk=50, def=50: 50 > 50 false; 50 > 30 true → 50 - 30 + 0.5 = 20.5 → 20
    expect(calcBaseDamage(50, 50)).toBe(20)
  })

  it('SHORT cast 行为(大值溢出有限数,不抛)', () => {
    const result = calcBaseDamage(65535, 0)
    expect(Number.isFinite(result)).toBe(true)
    // 131070 经 (n<<16)>>16 截到 -2
    expect(result).toBe(-2)
  })
})

describe('calcPhysicalAttackDamage (fight.c:253-285)', () => {
  it('resist=1 时 = baseDamage', () => {
    expect(calcPhysicalAttackDamage(100, 50, 1)).toBe(120)
  })

  it('resist > 1 时 = baseDamage / resist (整数除)', () => {
    // base = 120, 120 / 2 = 60
    expect(calcPhysicalAttackDamage(100, 50, 2)).toBe(60)
    // base = 120, 120 / 3 = 40
    expect(calcPhysicalAttackDamage(100, 50, 3)).toBe(40)
  })

  it('resist = 0 时不除(防 div by zero)', () => {
    expect(calcPhysicalAttackDamage(100, 50, 0)).toBe(120)
  })

  it('base 为 0 时 resist 不影响 → 0', () => {
    expect(calcPhysicalAttackDamage(10, 100, 2)).toBe(0)
  })
})

describe('calcMagicDamage (fight.c:174-249)', () => {
  const ZERO_ELEM = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }

  it('非元素 (elemental=0) → base/4 + magicBase', () => {
    // magStr=100, def=50 → calcBase=120; /4=30; +baseDamage 50 = 80
    const result = calcMagicDamage({
      magStr: 100,
      def: 50,
      elemRes: ZERO_ELEM,
      poisonRes: 0,
      resistMult: 10,
      magicData: { baseDamage: 50, elemental: 0 },
      fieldEffect: ZERO_ELEM,
      rngFactor: 1.0,
    })
    expect(result).toBe(80)
  })

  it('元素=wind (1), 无 resistance, 无 field → base * 2 (10/5)', () => {
    // damage 进 elem 分支前 = 80; multiplier = 10 - 0/10 = 10
    // *= 10 → 800; /= 5 → 160; field 0 → *=10 /=10 → 160
    const result = calcMagicDamage({
      magStr: 100,
      def: 50,
      elemRes: ZERO_ELEM,
      poisonRes: 0,
      resistMult: 10,
      magicData: { baseDamage: 50, elemental: 1 },
      fieldEffect: ZERO_ELEM,
      rngFactor: 1.0,
    })
    expect(result).toBe(160)
  })

  it('高 elemental resistance (50) → 低伤害', () => {
    // damage 进 elem 分支前 = 80; multiplier = 10 - 50/10 = 5
    // *= 5 → 400; /= 5 → 80; field 0 → 80
    const result = calcMagicDamage({
      magStr: 100,
      def: 50,
      elemRes: { ...ZERO_ELEM, wind: 50 },
      poisonRes: 0,
      resistMult: 10,
      magicData: { baseDamage: 50, elemental: 1 },
      fieldEffect: ZERO_ELEM,
      rngFactor: 1.0,
    })
    expect(result).toBe(80)
  })

  it('满 elemental resistance (100) → 免疫,damage = 0', () => {
    // multiplier = 10 - 100/10 = 0; sDamage *= 0 → 0
    const result = calcMagicDamage({
      magStr: 100,
      def: 50,
      elemRes: { ...ZERO_ELEM, wind: 100 },
      poisonRes: 0,
      resistMult: 10,
      magicData: { baseDamage: 50, elemental: 1 },
      fieldEffect: ZERO_ELEM,
      rngFactor: 1.0,
    })
    expect(result).toBe(0)
  })

  it('poison (elemental=6, > NUM_MAGIC_ELEMENTAL) → 用 poisonRes', () => {
    // damage 前 = 80; multiplier = 10 - 0/10 = 10; *= 10 → 800; /= 5 → 160
    // elem > 5 → 跳过 field 修正
    const result = calcMagicDamage({
      magStr: 100,
      def: 50,
      elemRes: ZERO_ELEM,
      poisonRes: 0,
      resistMult: 10,
      magicData: { baseDamage: 50, elemental: 6 },
      fieldEffect: ZERO_ELEM,
      rngFactor: 1.0,
    })
    expect(result).toBe(160)
  })

  it('field bonus 加 (+10) → damage * 2 (20/10)', () => {
    // 不加 field 时 = 160; field +10 → 160 * 20 = 3200; /=10 → 320
    const result = calcMagicDamage({
      magStr: 100,
      def: 50,
      elemRes: ZERO_ELEM,
      poisonRes: 0,
      resistMult: 10,
      magicData: { baseDamage: 50, elemental: 1 },
      fieldEffect: { ...ZERO_ELEM, wind: 10 },
      rngFactor: 1.0,
    })
    expect(result).toBe(320)
  })

  it('rngFactor 1.1 ≥ 1.0 (放大 magStr → 不减伤)', () => {
    const base = calcMagicDamage({
      magStr: 100,
      def: 0,
      elemRes: ZERO_ELEM,
      poisonRes: 0,
      resistMult: 10,
      magicData: { baseDamage: 0, elemental: 0 },
      fieldEffect: ZERO_ELEM,
      rngFactor: 1.0,
    })
    const higher = calcMagicDamage({
      magStr: 100,
      def: 0,
      elemRes: ZERO_ELEM,
      poisonRes: 0,
      resistMult: 10,
      magicData: { baseDamage: 0, elemental: 0 },
      fieldEffect: ZERO_ELEM,
      rngFactor: 1.1,
    })
    expect(higher).toBeGreaterThanOrEqual(base)
    // base: magStr=100, calcBase(100,0)=trunc(200+0.5)=200; /4=50
    // higher: magStr=trunc(110)=110, calcBase=trunc(220+0.5)=220; /4=55
    expect(base).toBe(50)
    expect(higher).toBe(55)
  })

  it('elem 1-5 对应 wind/thunder/water/fire/earth 索引', () => {
    const make = (elemental: number, elemRes: typeof ZERO_ELEM) =>
      calcMagicDamage({
        magStr: 100,
        def: 50,
        elemRes,
        poisonRes: 0,
        resistMult: 10,
        magicData: { baseDamage: 50, elemental },
        fieldEffect: ZERO_ELEM,
        rngFactor: 1.0,
      })
    // 给 thunder (索引 1) 一个高 resist,只有 elem=2 受影响
    const resThunder = { ...ZERO_ELEM, thunder: 100 }
    expect(make(2, resThunder)).toBe(0)
    expect(make(1, resThunder)).toBe(160) // wind 不受 thunder resist 影响
    expect(make(5, resThunder)).toBe(160) // earth 不受影响
  })
})

describe('getEnemyDexterity (fight.c:289-332 PAL_CLASSIC)', () => {
  it('公式 (level + 6) * 3 + (SHORT)dexterity', () => {
    // (10 + 6) * 3 + 20 = 48 + 20 = 68
    expect(getEnemyDexterity({ level: 10, dexterity: 20 })).toBe(68)
  })

  it('signed dexterity 负数', () => {
    // (10 + 6) * 3 + (-1) = 48 - 1 = 47
    expect(getEnemyDexterity({ level: 10, dexterity: -1 })).toBe(47)
  })

  it('SHORT cast 65535 → -1', () => {
    // 0xFFFF → -1 after SHORT cast → 48 - 1 = 47
    expect(getEnemyDexterity({ level: 10, dexterity: 65535 })).toBe(47)
  })

  it('level 0 → (0 + 6) * 3 = 18', () => {
    expect(getEnemyDexterity({ level: 0, dexterity: 0 })).toBe(18)
  })

  it('M3 不实现 non-classic lowerbound 20 (level=0,dex=-19 = -1,不夹到 20)', () => {
    // PAL_CLASSIC 不做 < 20 → 20 的 lowerbound
    expect(getEnemyDexterity({ level: 0, dexterity: -19 })).toBe(-1)
  })
})

describe('getPlayerActualDexterity (fight.c:336-389 PAL_CLASSIC)', () => {
  it('无 status → 原值', () => {
    expect(getPlayerActualDexterity(30, { haste: false, slow: false })).toBe(30)
  })

  it('haste → *3 (PAL_CLASSIC 路径)', () => {
    expect(getPlayerActualDexterity(30, { haste: true, slow: false })).toBe(90)
  })

  it('haste 后超 999 → 上限 999', () => {
    // 500 * 3 = 1500 → 999
    expect(getPlayerActualDexterity(500, { haste: true, slow: false })).toBe(999)
  })

  it('刚好 999 不夹', () => {
    expect(getPlayerActualDexterity(333, { haste: true, slow: false })).toBe(999)
    // 333 * 3 = 999;不超过上限
  })

  it('M3 不实现 slow modifier (non-classic 分支)', () => {
    // PAL_CLASSIC 路径下 slow 不生效;dexterity 不变
    expect(getPlayerActualDexterity(30, { haste: false, slow: true })).toBe(30)
  })

  it('baseDexterity 0 → 0', () => {
    expect(getPlayerActualDexterity(0, { haste: true, slow: false })).toBe(0)
  })
})
