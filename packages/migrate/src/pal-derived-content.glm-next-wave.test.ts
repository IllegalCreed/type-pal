/** TEST-GLM-NEW-J-1 J06：pal-derived-content 毒 overlay 全表冻结与提取表缺失反馈。
 * 旧证：pal-derived-content.test.ts 只盖 migratePalShops（id 0 过滤）；
 * `migratePalPoisons`（13 毒数据 overlay：一阶段实测/反汇编结论，颜色从提取表读取）
 * 在旧测试零直接断言。合成输入，颜色透传，不冒称原版实测。纯函数。
 */
import { describe, expect, test } from 'vitest'
import { migratePalPoisons, type SourceObjectPoison } from './pal-derived-content.js'

const source = (overrides: Partial<SourceObjectPoison> = {}): SourceObjectPoison => ({
  id: 551,
  level: 0,
  color: 9,
  playerScript: 0,
  enemyScript: 0,
  ...overrides,
})

const fullTable: SourceObjectPoison[] = [
  source({ id: 551, color: 21 }),
  source({ id: 552, color: 22 }),
  source({ id: 553, color: 23 }),
  source({ id: 554, color: 24 }),
  source({ id: 555, color: 25 }),
  source({ id: 556, color: 26 }),
  source({ id: 557, color: 27 }),
  source({ id: 558, color: 28 }),
  source({ id: 559, color: 29 }),
  source({ id: 560, color: 30 }),
  source({ id: 137, color: 31 }),
  source({ id: 561, color: 32 }),
  source({ id: 562, color: 33 }),
]

describe('migratePalPoisons：受保护迁移 overlay 的全表冻结', () => {
  test('13 条毒：id/名/可解性/每回合数值/相克配对逐条深等，颜色透传提取表', () => {
    const before = structuredClone(fullTable)
    const poisons = migratePalPoisons(fullTable)
    expect(poisons).toHaveLength(13)
    expect(poisons.map((poison) => poison.id)).toEqual([
      551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 137, 561, 562,
    ])
    expect(poisons.map((poison) => [poison.id, poison.color])).toEqual(
      fullTable.map((row) => [row.id, row.color]),
    )
    expect(poisons[0]).toEqual({
      id: 551,
      name: '赤毒',
      curability: 'common',
      color: 21,
      playerTicks: [{ hpDelta: -7 }],
      enemyTicks: [{ hpDelta: -7 }],
    })
    expect(poisons[4]).toEqual({
      id: 555,
      name: '三尸蛊毒',
      curability: 'severe',
      color: 25,
      playerTicks: [
        { hpDelta: 0 },
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -3 },
        { hpDelta: -200, selfCure: true },
      ],
      enemyTicks: [{ hpDelta: -111 }, { hpDelta: -222 }, { hpDelta: -333, selfCure: true }],
      lethalWith: 558,
      counters: 557,
    })
    expect(poisons[10]).toEqual({
      id: 137,
      name: '无影毒',
      curability: 'incurable',
      color: 31,
      enemyTicks: [{ halveHp: 1000, selfCure: true }],
    })
    expect(poisons[11]).toEqual({
      id: 561,
      name: '食妖虫附',
      curability: 'incurable',
      color: 32,
      enemyTicks: [
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -3 },
        { hpDelta: -4 },
        { hpDelta: -5 },
        { hpDelta: -6 },
        { hpDelta: -7 },
        { hpDelta: -8, grantItem: '145', selfCure: true },
      ],
    })
    expect(fullTable).toEqual(before)
  })

  test('严重毒 lethal 配对两两互指；counters（解毒）指向存在的他毒且不自指', () => {
    const poisons = migratePalPoisons(fullTable)
    const byId = new Map(poisons.map((poison) => [poison.id, poison]))
    for (const poison of poisons) {
      if (poison.lethalWith === undefined) continue
      expect(byId.get(poison.lethalWith)?.lethalWith).toBe(poison.id)
      expect(poison.lethalWith).not.toBe(poison.id)
    }
    for (const poison of poisons) {
      if (poison.counters === undefined) continue
      expect(byId.get(poison.counters)?.curability).toBe('severe')
      expect(poison.counters).not.toBe(poison.id)
    }
    expect(poisons.filter((poison) => poison.lethalWith !== undefined)).toHaveLength(6)
  })

  test('提取表缺 id → 毒提取表缺 id fail-loud，不静默取色', () => {
    expect(() => migratePalPoisons(fullTable.filter((row) => row.id !== 554))).toThrow(
      '毒提取表缺 id 554',
    )
  })
})
