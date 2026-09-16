/**
 * TEST-FOUNDATION-COVERAGE-1 B1：validateStartWorld 字段级边界（validate.ts:94-160）。
 * 既有 validate.test.ts:1149-1212 已覆盖 resources 零值与 seed carrier 稀疏形态；
 * 本文件补 requireKeys/requireOnlyKeys/party/money/inventory/seedStats/seedConditions
 * 的逐字段损坏矩阵与合法丰富正控。字段自身合法零值（money=0、count=0）与已定义
 * 非法值（负数/非整数/空白串）分开断言。
 */
import { describe, expect, test } from 'vitest'
import { validateStartWorld } from './validate.js'
import { minimalStartWorld } from './__tests__/glm-foundation-fixtures.js'

const damage = (base: unknown, mutate: (w: Record<string, unknown>) => void) => {
  const world = JSON.parse(JSON.stringify(base)) as Record<string, unknown>
  mutate(world)
  return world
}

describe('validateStartWorld · 顶层形状', () => {
  test('非对象拒绝', () => {
    expect(() => validateStartWorld(null)).toThrow(/期望对象/)
    expect(() => validateStartWorld([])).toThrow(/期望对象/)
  })
  for (const key of ['party', 'money', 'inventory']) {
    test(`缺 ${key} 拒绝（requireKeys）`, () => {
      const world = damage(minimalStartWorld(), (w) => delete w[key])
      expect(() => validateStartWorld(world)).toThrow(new RegExp(`缺键 "${key}"`))
    })
  }
  test('未知多余键拒绝（requireOnlyKeys）', () => {
    const world = damage(minimalStartWorld(), (w) => {
      w.unknownField = 1
    })
    expect(() => validateStartWorld(world)).toThrow(/未知字段|unknown/)
  })
})

describe('validateStartWorld · party', () => {
  test('party 非数组拒绝', () => {
    const world = damage(minimalStartWorld(), (w) => {
      w.party = 'actor-a'
    })
    expect(() => validateStartWorld(world)).toThrow(/party.*期望/)
  })
  test('party 元素空白串/非字符串逐项拒绝，错误 where 含下标', () => {
    for (const bad of ['  ', '', 42]) {
      const world = damage(minimalStartWorld(), (w) => {
        w.party = ['actor-a', bad]
      })
      expect(() => validateStartWorld(world)).toThrow(/party\[1\]: 期望非空角色 id/)
    }
  })
  test('party 空数组合法（零队员边界）', () => {
    const world = damage(minimalStartWorld(), (w) => {
      w.party = []
    })
    expect(() => validateStartWorld(world)).not.toThrow()
  })
})

describe('validateStartWorld · money / inventory', () => {
  test('money=0 合法（字段自身合法零值）', () => {
    expect(() => validateStartWorld(minimalStartWorld())).not.toThrow()
  })
  for (const bad of [-1, 1.5, 'x']) {
    test(`money=${JSON.stringify(bad)} 拒绝`, () => {
      const world = damage(minimalStartWorld(), (w) => {
        w.money = bad
      })
      expect(() => validateStartWorld(world)).toThrow(/money: 必须是非负安全整数/)
    })
  }
  test('inventory 条目缺 count 拒绝且 where 精确', () => {
    const world = damage(minimalStartWorld(), (w) => {
      delete (w.inventory as Array<Record<string, unknown>>)[1]!.count
    })
    expect(() => validateStartWorld(world)).toThrow(/inventory\[1\].*count/)
  })
  test('inventory 条目未知键拒绝', () => {
    const world = damage(minimalStartWorld(), (w) => {
      ;(w.inventory as Array<Record<string, unknown>>)[0]!.slot = 1
    })
    expect(() => validateStartWorld(world)).toThrow(/inventory\[0\]/)
  })
  test('inventory count=0 合法（合法零值）；itemId 空白拒绝', () => {
    expect(() => validateStartWorld(minimalStartWorld())).not.toThrow()
    const world = damage(minimalStartWorld(), (w) => {
      ;(w.inventory as Array<Record<string, unknown>>)[0]!.itemId = ' '
    })
    expect(() => validateStartWorld(world)).toThrow(/inventory\[0\]\.itemId: 期望非空物品 id/)
  })
})

describe('validateStartWorld · seedStats / seedConditions 可选域', () => {
  test('丰富正控：全可选域齐备通过并原样返回', () => {
    const world = {
      ...minimalStartWorld(),
      seedStats: { 'actor-a': { hp: 10, mp: 0 } },
      seedConditions: { 'actor-b': {} },
    }
    expect(validateStartWorld(world)).toBe(world)
  })
  test('seedStats hp 负数拒绝（mp 合法零值对照不触发）', () => {
    const world = damage(
      { ...minimalStartWorld(), seedStats: { 'actor-a': { hp: -1 } } },
      () => {},
    )
    expect(() => validateStartWorld(world)).toThrow(/seedStats\.actor-a\.hp: 必须是非负安全整数/)
  })
  test('seedStats 未知键拒绝（只允许 hp/mp）', () => {
    const world = { ...minimalStartWorld(), seedStats: { 'actor-a': { power: 1 } } }
    expect(() => validateStartWorld(world)).toThrow(/seedStats\.actor-a/)
  })
  test('seedConditions 非入队角色拒绝', () => {
    const world = { ...minimalStartWorld(), seedConditions: { 'actor-z': {} } }
    expect(() => validateStartWorld(world)).toThrow(
      /seedConditions\.actor-z: 只能配置该入口已入队角色/,
    )
  })
  test('seedConditions 角色空白/带首尾空格拒绝', () => {
    const world = { ...minimalStartWorld(), seedConditions: { ' ': {} } }
    expect(() => validateStartWorld(world)).toThrow(/seedConditions: 角色 id 必须非空/)
  })
})
