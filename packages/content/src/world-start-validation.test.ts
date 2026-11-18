import { describe, expect, test } from 'vitest'
import { expectRejectUnchanged } from './__tests__/validation-assertions.js'
import { validateStartWorld } from './validate.js'

function world() {
  return {
    party: ['actor-a', 'actor-b'],
    money: 0,
    inventory: [
      { itemId: 'item-1', count: 0 },
      { itemId: 'item-2', count: 3 },
    ],
  }
}

describe('starting world shape', () => {
  test('非对象拒绝', () => {
    expectRejectUnchanged(validateStartWorld, null, 'startWorld: 期望对象')
    expectRejectUnchanged(validateStartWorld, [], 'startWorld: 期望对象')
  })

  for (const key of ['party', 'money', 'inventory'] as const) {
    test(`rejects a missing ${key}`, () => {
      const { [key]: _missing, ...invalid } = world()
      expectRejectUnchanged(validateStartWorld, invalid, `startWorld: 缺键 "${key}"`)
    })
  }

  test('未知多余键拒绝（requireOnlyKeys）', () => {
    expectRejectUnchanged(
      validateStartWorld,
      { ...world(), unknownField: 1 },
      'startWorld.unknownField: 未知字段',
    )
  })
})

describe('starting party entries', () => {
  test('party 非数组拒绝', () => {
    expectRejectUnchanged(
      validateStartWorld,
      { ...world(), party: 'actor-a' },
      'startWorld.party: 期望数组',
    )
  })

  test.each(['  ', '', 42])('party entry %j is rejected at its own index', (invalid) => {
    expectRejectUnchanged(
      validateStartWorld,
      { ...world(), party: ['actor-a', invalid] },
      'startWorld.party[1]: 期望非空角色 id',
    )
  })

  test('shape validation retains an empty party for the later runtime admission check', () => {
    const input = { ...world(), party: [] }
    expect(validateStartWorld(input).party).toEqual([])
  })
})

describe('starting money and inventory', () => {
  test('accepts zero money and independently retains a zero-count inventory entry', () => {
    const input = world()
    const result = validateStartWorld(input)
    expect(result.money).toBe(0)
    expect(result.inventory).toEqual([
      { itemId: 'item-1', count: 0 },
      { itemId: 'item-2', count: 3 },
    ])
  })

  test.each([-1, 1.5, 'x'])('money %j is rejected as a nonnegative safe integer', (money) => {
    expectRejectUnchanged(
      validateStartWorld,
      { ...world(), money },
      'startWorld.money: 必须是非负安全整数',
    )
  })

  test('inventory 条目缺 count 拒绝且 where 精确', () => {
    const input = world()
    const { count: _count, ...itemWithoutCount } = input.inventory[1]!
    expectRejectUnchanged(
      validateStartWorld,
      { ...input, inventory: [input.inventory[0], itemWithoutCount] },
      'startWorld.inventory[1]: 缺键 "count"',
    )
  })

  test('inventory 条目未知键拒绝', () => {
    const input = world()
    expectRejectUnchanged(
      validateStartWorld,
      { ...input, inventory: [{ ...input.inventory[0], slot: 1 }, input.inventory[1]] },
      'startWorld.inventory[0].slot: 未知字段',
    )
  })

  test('inventory rejects a blank item identity', () => {
    const input = world()
    expectRejectUnchanged(
      validateStartWorld,
      { ...input, inventory: [{ ...input.inventory[0], itemId: ' ' }, input.inventory[1]] },
      'startWorld.inventory[0].itemId: 期望非空物品 id',
    )
  })
})

describe('starting actor overrides', () => {
  test('preserves optional resources, current HP/MP, and condition seed fields', () => {
    const input = {
      ...world(),
      resources: { coins: 0 },
      seedStats: { 'actor-a': { hp: 10, mp: 0 } },
      seedConditions: { 'actor-b': {} },
    }
    expect(validateStartWorld(input)).toBe(input)
  })

  test.each([
    [
      { seedStats: { 'actor-a': { hp: -1, mp: 0 } } },
      'startWorld.seedStats.actor-a.hp: 必须是非负安全整数',
    ],
    [
      { seedStats: { 'actor-a': { hp: 1, power: 1 } } },
      'startWorld.seedStats.actor-a.power: 未知字段',
    ],
    [
      { seedConditions: { 'actor-z': {} } },
      'startWorld.seedConditions.actor-z: 只能配置该入口已入队角色',
    ],
    [
      { seedConditions: { ' actor-a': {} } },
      'startWorld.seedConditions: 角色 id 必须非空且无首尾空格',
    ],
    [{ seedConditions: { ' ': {} } }, 'startWorld.seedConditions: 角色 id 必须非空且无首尾空格'],
  ] as const)('rejects invalid overrides at their own field: %j', (overrides, message) => {
    expectRejectUnchanged(validateStartWorld, { ...world(), ...overrides }, message)
  })
})
