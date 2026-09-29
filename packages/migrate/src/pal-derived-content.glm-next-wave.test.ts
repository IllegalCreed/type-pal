/** TEST-GLM-NEW-J-1 J06：pal-derived-content 毒 overlay 的一手核实范围与提取表缺失反馈。
 * 旧证：pal-derived-content.test.ts 只盖 migratePalShops（id 0 过滤）；
 * `migratePalPoisons` 在旧测试零直接断言。
 * Oracle：docs/phase1/game-mechanics.md 一手毒机制真值——
 *   :1187-1201 等级/每回合表（551 −7/−7、552 −12、553 −20、554 −32、556-560 −50/−100、
 *   561/562 自身 tick 脚本为空且寄生在投掷道具脚本）、:1210-1216 三尸蛊逐回合
 *   （我方 0→−1→−2→−3→−200 后 0x2B 自解；敌方 −111→−222→−333 后 0x2A 自解）、
 *   :1219 无影毒 0x5B 半血上限 1000（script.c:1895-1905）且 level 173 谁都解不了、
 *   :1227-1232 相克单向 6 元环逐边与三对致死双向组合、:1246-1253 解毒 0x2C 等级上限
 *   （灵血咒/九节菖蒲只解 ≤2，复活解 ≤3，故 0-2 级 common、3 级 severe、173/4 级 incurable）。
 * 561/562 的精确 tick 数据化（每回合 −1×7 + 末回合 −8 + grantItem '145'/'149' + selfCure）
 * 仅有 doc 的「寄生、每回合 −1、到期掉道具（灵蛊/赤血蚕）」形状描述，数值无一手锚——
 * 按 r1 审核意见移出深等、登记未证，不为覆盖率保留来源不明 golden。合成输入，纯函数。
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

const byId = (
  poisons: ReturnType<typeof migratePalPoisons>,
): Map<number, (typeof poisons)[number]> => new Map(poisons.map((poison) => [poison.id, poison]))

describe('migratePalPoisons：一手核实的逐条深等（game-mechanics 锚定）', () => {
  test('常规四毒 551-554：名/可解性 common/敌我同值 −7/−12/−20/−32（:1187-1191 表）', () => {
    const poisons = byId(migratePalPoisons(fullTable))
    expect(poisons.get(551)).toEqual({
      id: 551,
      name: '赤毒',
      curability: 'common',
      color: 21,
      playerTicks: [{ hpDelta: -7 }],
      enemyTicks: [{ hpDelta: -7 }],
    })
    expect(poisons.get(552)).toEqual({
      id: 552,
      name: '尸毒',
      curability: 'common',
      color: 22,
      playerTicks: [{ hpDelta: -12 }],
      enemyTicks: [{ hpDelta: -12 }],
    })
    expect(poisons.get(553)).toEqual({
      id: 553,
      name: '瘴毒',
      curability: 'common',
      color: 23,
      playerTicks: [{ hpDelta: -20 }],
      enemyTicks: [{ hpDelta: -20 }],
    })
    expect(poisons.get(554)).toEqual({
      id: 554,
      name: '毒丝',
      curability: 'common',
      color: 24,
      playerTicks: [{ hpDelta: -32 }],
      enemyTicks: [{ hpDelta: -32 }],
    })
  })

  test('三尸蛊 555：逐回合推进 + 末回合自解（:1210-1216 逐回合段）', () => {
    expect(byId(migratePalPoisons(fullTable)).get(555)).toEqual({
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
  })

  test('六级 3 级毒 556-560：名/敌我 −50/−100/lethal/counters 逐边深等（:1195 表 + :1227-1232）', () => {
    const poisons = byId(migratePalPoisons(fullTable))
    const severeFixed = (
      id: number,
      name: string,
      color: number,
      lethalWith: number,
      counters: number,
    ) => ({
      id,
      name,
      curability: 'severe' as const,
      color,
      playerTicks: [{ hpDelta: -50 }],
      enemyTicks: [{ hpDelta: -100 }],
      lethalWith,
      counters,
    })
    expect(poisons.get(556)).toEqual(severeFixed(556, '鹤顶红', 26, 557, 558))
    expect(poisons.get(557)).toEqual(severeFixed(557, '孔雀胆', 27, 556, 560))
    expect(poisons.get(558)).toEqual(severeFixed(558, '血海棠', 28, 555, 559))
    expect(poisons.get(559)).toEqual(severeFixed(559, '断肠草', 29, 560, 555))
    expect(poisons.get(560)).toEqual(severeFixed(560, '金蚕蛊毒', 30, 559, 556))
  })

  test('无影毒 137：一次性半血上限 1000、incurable（:1219 + script.c:1895-1905）', () => {
    expect(byId(migratePalPoisons(fullTable)).get(137)).toEqual({
      id: 137,
      name: '无影毒',
      curability: 'incurable',
      color: 31,
      enemyTicks: [{ halveHp: 1000, selfCure: true }],
    })
  })

  test('561/562 仅断言一手可证身份字段；精确 tick 数据化登记未证，不深等', () => {
    const poisons = byId(migratePalPoisons(fullTable))
    for (const [id, name, color] of [
      [561, '食妖虫附', 32],
      [562, '碧血蚕附', 33],
    ] as const) {
      const poison = poisons.get(id)!
      expect(poison.name).toBe(name)
      expect(poison.curability).toBe('incurable')
      expect(poison.color).toBe(color)
      expect(poison.lethalWith).toBeUndefined()
      expect(poison.counters).toBeUndefined()
    }
  })
})

describe('migratePalPoisons：全表结构与提取表反馈', () => {
  test('13 条、id 序冻结、颜色透传合成提取表；输入深保真', () => {
    const before = structuredClone(fullTable)
    const poisons = migratePalPoisons(fullTable)
    expect(poisons).toHaveLength(13)
    expect(poisons.map((poison) => poison.id)).toEqual([
      551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 137, 561, 562,
    ])
    expect(poisons.map((poison) => [poison.id, poison.color])).toEqual(
      fullTable.map((row) => [row.id, row.color]),
    )
    expect(fullTable).toEqual(before)
  })

  test('相克单向 6 元环逐边 = :1227-1231 脚本实证（鹤顶红→血海棠→断肠草→三尸蛊→孔雀胆→金蚕蛊→鹤顶红）', () => {
    const poisons = byId(migratePalPoisons(fullTable))
    expect([...poisons.values()].filter((poison) => poison.counters !== undefined)).toHaveLength(6)
    expect(poisons.get(556)!.counters).toBe(558)
    expect(poisons.get(558)!.counters).toBe(559)
    expect(poisons.get(559)!.counters).toBe(555)
    expect(poisons.get(555)!.counters).toBe(557)
    expect(poisons.get(557)!.counters).toBe(560)
    expect(poisons.get(560)!.counters).toBe(556)
  })

  test('三对致死组合双向互指 = :1232（556↔557、555↔558、559↔560），其余毒不携带', () => {
    const poisons = byId(migratePalPoisons(fullTable))
    for (const [left, right] of [
      [556, 557],
      [555, 558],
      [559, 560],
    ] as const) {
      expect(poisons.get(left)!.lethalWith).toBe(right)
      expect(poisons.get(right)!.lethalWith).toBe(left)
    }
    expect([...poisons.values()].filter((poison) => poison.lethalWith !== undefined)).toHaveLength(
      6,
    )
  })

  test('提取表缺 id → 毒提取表缺 id fail-loud，不静默取色', () => {
    expect(() => migratePalPoisons(fullTable.filter((row) => row.id !== 554))).toThrow(
      '毒提取表缺 id 554',
    )
  })
})
