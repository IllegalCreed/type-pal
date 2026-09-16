/**
 * TEST-FOUNDATION-COVERAGE-1 B4：validatePoisons 全矩阵 + validateSkills 顶层形状边界。
 * 毒定义此前零直测（validate.test.ts 无 validatePoisons 用例）；技能执行/cost/lifetimeLimit/
 * 音效已覆盖，此处补顶层 requireKeys 与 effects 非数组门。
 * 注意：schema 允许的 target/effects 组合按 schema 合同断言，不按运行时 C-03 现状写"应拒绝"。
 */
import { describe, expect, test } from 'vitest'
import { minimalPoison, minimalSkill } from './__tests__/glm-foundation-fixtures.js'
import { validatePoisons, validateSkills } from './validate.js'

describe('validatePoisons · 正控', () => {
  test('丰富毒定义（含双 tick/grantItem/halveHp/关系字段）通过并原样返回', () => {
    const poisons = [
      {
        ...minimalPoison(551),
        playerTicks: [
          { hpDelta: -7 },
          { mpDelta: -3, grantItem: 'item-1' },
          { halveHp: 2 },
          { selfCure: true },
        ],
        enemyTicks: [{ hpDelta: -5 }],
        lethalWith: 552,
        counters: 553,
      },
      minimalPoison(552),
    ]
    const out = validatePoisons(poisons)
    expect(out.map((x) => x.id)).toEqual([551, 552])
    expect(out[0]!.playerTicks).toHaveLength(4)
  })
  test('非数组输入拒绝', () => {
    expect(() => validatePoisons({})).toThrow(/期望/)
  })
})

describe('validatePoisons · 字段损坏矩阵', () => {
  const cases: Array<[string, unknown, RegExp]> = [
    ['id 非正', [{ ...minimalPoison(0) }], /id: 期望正安全整数/],
    ['id 非整数', [{ ...minimalPoison(1.5) }], /id: 期望正安全整数/],
    ['name 空白', [{ ...minimalPoison(), name: ' ' }], /name: 期望非空名称/],
    ['curability 非法值', [{ ...minimalPoison(), curability: 'rare' }], /curability/],
    ['color 负数', [{ ...minimalPoison(), color: -1 }], /color: 期望非负安全整数/],
    ['lethalWith 非正', [{ ...minimalPoison(), lethalWith: 0 }], /lethalWith: 期望正安全整数/],
    ['counters 非整数', [{ ...minimalPoison(), counters: 1.5 }], /counters: 期望正安全整数/],
    ['playerTicks 空数组', [{ ...minimalPoison(), playerTicks: [] }], /playerTicks: 不得为空/],
    ['tick 未知键', [{ ...minimalPoison(), playerTicks: [{ power: 1 }] }], /playerTicks\[0\]/],
    [
      'hpDelta 非整数（负数本身合法）',
      [{ ...minimalPoison(), playerTicks: [{ hpDelta: -1.5 }] }],
      /hpDelta: 期望安全整数/,
    ],
    [
      'halveHp 非正',
      [{ ...minimalPoison(), playerTicks: [{ halveHp: 0 }] }],
      /halveHp: 期望正安全整数/,
    ],
    [
      'grantItem 空串',
      [{ ...minimalPoison(), playerTicks: [{ grantItem: '' }] }],
      /grantItem: 期望非空物品 id/,
    ],
    ['selfCure 非 boolean', [{ ...minimalPoison(), playerTicks: [{ selfCure: 1 }] }], /selfCure/],
    [
      'enemyTicks 同门（hpDelta 非整数）',
      [{ ...minimalPoison(), enemyTicks: [{ hpDelta: 'x' }] }],
      /enemyTicks\[0\]\.hpDelta/,
    ],
    ['未知顶层键', [{ ...minimalPoison(), extra: 1 }], /poisons\[0\]/],
  ]
  for (const [name, input, pattern] of cases) {
    test(name, () => {
      expect(() => validatePoisons(input)).toThrow(pattern)
    })
  }
  test('同 id 重复拒绝（禁止 loader 静默覆盖）', () => {
    expect(() => validatePoisons([minimalPoison(551), minimalPoison(551)])).toThrow(/毒 551 重复/)
  })
})

describe('validateSkills · 顶层形状边界', () => {
  test('最小合法技能文件通过并返回结构', () => {
    const file = { skills: [minimalSkill()], levelUp: {} }
    const out = validateSkills(file)
    expect(out.skills[0]!.id).toBe('370')
    expect(out.levelUp).toEqual({})
  })
  test('缺 levelUp 拒绝（requireKeys）', () => {
    const file = { skills: [minimalSkill()] }
    expect(() => validateSkills(file)).toThrow(/skills/)
  })
  test('技能缺 target/effects/animation 任一拒绝且 where 精确', () => {
    for (const key of ['target', 'effects', 'animation'] as const) {
      const skill = minimalSkill() as Record<string, unknown>
      delete skill[key]
      expect(() => validateSkills({ skills: [skill], levelUp: {} })).toThrow(
        new RegExp(`skills\\[0\\].*${key}`),
      )
    }
  })
})
