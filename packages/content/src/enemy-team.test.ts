import { describe, expect, test } from 'vitest'
import { validateEnemyTeams } from './enemy-team.js'

describe('enemy team loading', () => {
  test('retains ordered slots and returns an independently owned formation', () => {
    const input = [
      { id: 'patrol', slots: ['scout', null, 'guard'] },
      { id: 'reserve', slots: [] },
    ]
    const teams = validateEnemyTeams(input)
    expect(teams).toEqual([
      { id: 'patrol', slots: ['scout', null, 'guard'] },
      { id: 'reserve', slots: [] },
    ])
    expect(teams[0]).not.toBe(input[0])
    expect(teams[0]?.slots).not.toBe(input[0]?.slots)
    expect(input).toEqual([
      { id: 'patrol', slots: ['scout', null, 'guard'] },
      { id: 'reserve', slots: [] },
    ])
  })

  const invalidFormations: { label: string; input: unknown; message: string }[] = [
    { label: 'an object instead of a list', input: {}, message: 'enemyTeams: 期望数组' },
    {
      label: 'a duplicate team ID',
      input: [
        { id: 'patrol', slots: [] },
        { id: 'patrol', slots: [] },
      ],
      message: 'enemyTeams[1].id: 重复敌队 id "patrol"',
    },
    {
      label: 'six formation slots',
      input: [{ id: 'patrol', slots: ['scout', null, 'guard', null, null, 'guard'] }],
      message: 'enemyTeams[0].slots: 槽位数超上限 5',
    },
    {
      label: 'a numeric enemy slot',
      input: [{ id: 'patrol', slots: [null, 1] }],
      message: 'enemyTeams[0].slots[1]: 期望 string|null',
    },
    {
      label: 'an empty enemy ID',
      input: [{ id: 'patrol', slots: [null, ''] }],
      message: 'enemyTeams[0].slots[1]: 期望 string|null',
    },
    {
      label: 'an unknown team field',
      input: [{ id: 'patrol', slots: [], extra: 1 }],
      message: 'enemyTeams[0].extra: 未知字段',
    },
    {
      label: 'an empty team ID',
      input: [{ id: '', slots: [] }],
      message: 'enemyTeams[0].id: 期望非空 string',
    },
  ]
  test.each(invalidFormations)('rejects $label at its specific path', ({ input, message }) => {
    expect(() => validateEnemyTeams(input)).toThrow(new Error(message))
  })

  test('joins enemy IDs only when the caller supplies a registry', () => {
    const input = [{ id: 'patrol', slots: ['scout', null, 'guard'] }]
    expect(validateEnemyTeams(input)).toEqual([{ id: 'patrol', slots: ['scout', null, 'guard'] }])
    expect(() => validateEnemyTeams(input, new Set(['scout']))).toThrow(
      new Error('enemyTeams[0](patrol).slots[2]: 敌人 "guard" 不在 enemies'),
    )
    expect(validateEnemyTeams(input, new Set(['scout', 'guard']))).toEqual([
      { id: 'patrol', slots: ['scout', null, 'guard'] },
    ])
  })
})
