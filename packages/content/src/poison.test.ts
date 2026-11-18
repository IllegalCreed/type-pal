import { describe, expect, test } from 'vitest'
import type { ActivePoison, PoisonDef } from './poison.js'
import { applyPoisonSelf, collectPoisonDefinitionReferences, poisonCurableBy } from './poison.js'

const poison = (id: number, over: Partial<PoisonDef> = {}): PoisonDef => ({
  id,
  name: `poison.${id}`,
  curability: 'common',
  color: 0,
  ...over,
})

describe('poison definition references', () => {
  test('lethalWith 与 counters 各产一条带精确 where 的引用', () => {
    const refs = collectPoisonDefinitionReferences([
      poison(551, { lethalWith: 552, counters: 553 }),
    ])
    expect(refs).toEqual([
      {
        ownerId: 551,
        poisonId: 552,
        kind: 'poison-lethal-pair',
        where: 'poisons[0](551).lethalWith',
      },
      { ownerId: 551, poisonId: 553, kind: 'poison-counter', where: 'poisons[0](551).counters' },
    ])
  })

  test('无关系毒不产引用', () => {
    expect(collectPoisonDefinitionReferences([poison(1), poison(2)])).toEqual([])
  })
})

describe('curability order', () => {
  test('common 可被任一档解；incurable 不可被 common/severe 解', () => {
    expect(poisonCurableBy({ curability: 'common' }, 'common')).toBe(true)
    expect(poisonCurableBy({ curability: 'severe' }, 'common')).toBe(false)
    expect(poisonCurableBy({ curability: 'severe' }, 'severe')).toBe(true)
    expect(poisonCurableBy({ curability: 'incurable' }, 'severe')).toBe(false)
    expect(poisonCurableBy({ curability: 'incurable' }, 'incurable')).toBe(true)
  })
})

describe('direct poison application', () => {
  const defs: Record<number, PoisonDef> = {
    1: poison(1, { counters: 9 }),
    2: poison(2, { lethalWith: 8 }),
    3: poison(3),
    8: poison(8),
    9: poison(9),
  }

  test('身中 counters 毒 → 以毒攻毒解掉、不下本毒（cured）', () => {
    const host = { hp: 100, poisons: [{ poisonId: 9, tickIndex: 0 }] }
    expect(applyPoisonSelf(host, 1, defs)).toBe('cured')
    expect(host.poisons).toEqual([])
    expect(host.hp).toBe(100)
  })

  test('身中 lethalWith 毒 → hp 0 暴毙（lethal）', () => {
    const host = { hp: 100, poisons: [{ poisonId: 8, tickIndex: 0 }] }
    expect(applyPoisonSelf(host, 2, defs)).toBe('lethal')
    expect(host.hp).toBe(0)
  })

  test('毒抗只阻止新增毒槽，保留既有毒的续点', () => {
    const host = {
      hp: 100,
      poisons: [
        { poisonId: 9, tickIndex: 0 },
        { poisonId: 8, tickIndex: 2 },
      ],
    }
    let rolls = 0
    const resist = () => {
      rolls++
      return false
    }

    expect(applyPoisonSelf(host, 1, defs, resist)).toBe('cured')
    expect(applyPoisonSelf(host, 3, defs, resist)).toBe('resisted')
    expect(host).toEqual({ hp: 100, poisons: [{ poisonId: 8, tickIndex: 2 }] })
    expect(applyPoisonSelf(host, 2, defs, resist)).toBe('lethal')
    expect(host.hp).toBe(0)
    expect(rolls).toBe(1)
  })

  test('a new poison starts at the first tick', () => {
    const host: { hp: number; poisons?: { poisonId: number; tickIndex: number }[] } = { hp: 100 }
    expect(applyPoisonSelf(host, 3, defs)).toBe('applied')
    expect(host.poisons).toEqual([{ poisonId: 3, tickIndex: 0 }])
  })

  test('缺 defs 时 counters/lethalWith 关系不可判定 → 纯加毒', () => {
    const host: { hp: number; poisons?: ActivePoison[] } = { hp: 10 }
    expect(applyPoisonSelf(host, 9)).toBe('applied')
    expect(applyPoisonSelf(host, 8)).toBe('applied')
    expect(applyPoisonSelf(host, 1)).toBe('applied')
    expect(applyPoisonSelf(host, 2)).toBe('applied')
    expect(host.hp).toBe(10)
    expect(host.poisons).toEqual([
      { poisonId: 9, tickIndex: 0 },
      { poisonId: 8, tickIndex: 0 },
      { poisonId: 1, tickIndex: 0 },
      { poisonId: 2, tickIndex: 0 },
    ])
  })
})
