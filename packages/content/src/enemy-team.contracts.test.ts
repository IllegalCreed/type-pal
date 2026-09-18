/**
 * TEST-CONTENT-CONTRACTS-1 D5/D6：enemy-team 结构/引用/合并（enemy-team.ts:15-55）。
 * 0%→值得直接核边界；空/非空/null 槽、上限 5、重复 ID、坏槽、缺敌人；输入不污染。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { validateEnemyTeams } from './enemy-team.js'

describe('D5 validateEnemyTeams · 结构边界', () => {
  test('合法列表通过（含 null 槽）；输入不变', () => {
    const raw = [
      { id: 'team-a', slots: ['enemy-1', null, 'enemy-2'] },
      { id: 'team-b', slots: [] },
    ]
    const before = deepSnapshot(raw)
    expect(validateEnemyTeams(raw)).toEqual(raw)
    expect(raw).toEqual(before)
  })
  test.each([
    ['非数组', 'not-array', /期望数组/],
    [
      '重复 id',
      [
        { id: 't', slots: [] },
        { id: 't', slots: [] },
      ],
      /重复敌队 id "t"/,
    ],
    ['槽位超上限 5', [{ id: 't', slots: ['a', 'b', 'c', 'd', 'e', 'f'] }], /槽位数超上限 5/],
    ['坏槽（数字）', [{ id: 't', slots: [1] }], /期望 string\|null/],
    ['坏槽（空串）', [{ id: 't', slots: [''] }], /期望 string\|null/],
    ['未知字段', [{ id: 't', slots: [], extra: 1 }], /未知字段/],
    ['空 id', [{ id: '', slots: [] }], /期望非空 string/],
  ])('%s 拒绝', (_name, value, pattern) => {
    const input = value === 'not-array' ? {} : value
    expect(() => validateEnemyTeams(input)).toThrow(pattern)
  })
})

describe('D6 validateEnemyTeamReferences · 引用分层与可选 enemyIds', () => {
  const teams = () => [{ id: 'team-a', slots: ['enemy-1', null] }]
  test('缺省 enemyIds：不校验引用（传入时语义不同）', () => {
    expect(validateEnemyTeams(teams())).toEqual(teams()) // 无集合 → 零校验
  })
  test('传入 enemyIds：悬空槽引用精确拒绝（路径含槽位）', () => {
    expect(() => validateEnemyTeams(teams(), new Set(['enemy-2']))).toThrow(/enemy-1" 不在 enemies/)
    // null 槽不触发
    expect(validateEnemyTeams([{ id: 't', slots: [null] }], new Set())).toEqual([
      { id: 't', slots: [null] },
    ])
  })
  test('全部命中时通过；原数组/槽位不污染', () => {
    const raw = teams()
    const before = deepSnapshot(raw)
    validateEnemyTeams(raw, new Set(['enemy-1']))
    expect(raw).toEqual(before)
  })
})
