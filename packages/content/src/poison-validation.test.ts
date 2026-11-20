import { describe, expect, test } from 'vitest'
import { expectExactError, expectRejectUnchanged } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { PoisonDef } from './poison.js'
import { validatePoisons } from './validate.js'

function minimalPoison(id = 551) {
  return { id, name: `毒${id}`, curability: 'common', color: 16 } satisfies PoisonDef
}

describe('poison definitions', () => {
  test('loads both tick tables and relationship IDs from complete poison records', () => {
    const poisons = [
      {
        ...minimalPoison(551),
        playerTicks: [
          { hpDelta: -7 },
          { mpDelta: -3, grantItem: 'item-1' },
          { halveHp: 2 },
          { selfCure: true },
        ],
        enemyTicks: [{}, { hpDelta: -5 }, { grantItem: 'item-2', grantNarration: 'dlg.hatch' }],
        lethalWith: 552,
        counters: 553,
      },
      minimalPoison(552),
      minimalPoison(553),
    ]
    const before = deepSnapshot(poisons)
    const out = validatePoisons(poisons)
    expect(out).toEqual(before)
    expect(poisons).toEqual(before)
  })
  test('非数组输入拒绝', () => {
    expectExactError(() => validatePoisons({}), 'poisons: 期望数组')
  })
})

describe('poison record field validation', () => {
  const cases: Array<[string, unknown, string]> = [
    ['id 非正', [{ ...minimalPoison(0) }], 'poisons[0].id: 期望正安全整数 PoisonDef.id'],
    ['id 非整数', [{ ...minimalPoison(1.5) }], 'poisons[0].id: 期望正安全整数 PoisonDef.id'],
    ['name 空白', [{ ...minimalPoison(), name: ' ' }], 'poisons[0].name: 期望非空名称'],
    [
      'curability 非法值',
      [{ ...minimalPoison(), curability: 'rare' }],
      'poisons[0].curability: 期望 common|severe|incurable',
    ],
    ['color 负数', [{ ...minimalPoison(), color: -1 }], 'poisons[0].color: 期望非负安全整数'],
    [
      'lethalWith 非正',
      [{ ...minimalPoison(), lethalWith: 0 }],
      'poisons[0].lethalWith: 期望正安全整数 PoisonDef.id',
    ],
    [
      'counters 非整数',
      [{ ...minimalPoison(), counters: 1.5 }],
      'poisons[0].counters: 期望正安全整数 PoisonDef.id',
    ],
    [
      'playerTicks 空数组',
      [{ ...minimalPoison(), playerTicks: [] }],
      'poisons[0].playerTicks: 不得为空',
    ],
    [
      'tick 未知键',
      [{ ...minimalPoison(), playerTicks: [{ power: 1 }] }],
      'poisons[0].playerTicks[0].power: 未知字段',
    ],
    [
      'hpDelta 非整数（负数本身合法）',
      [{ ...minimalPoison(), playerTicks: [{ hpDelta: -1.5 }] }],
      'poisons[0].playerTicks[0].hpDelta: 期望安全整数',
    ],
    [
      'halveHp 非正',
      [{ ...minimalPoison(), playerTicks: [{ halveHp: 0 }] }],
      'poisons[0].playerTicks[0].halveHp: 期望正安全整数',
    ],
    [
      'grantItem 空串',
      [{ ...minimalPoison(), playerTicks: [{ grantItem: '' }] }],
      'poisons[0].playerTicks[0].grantItem: 期望非空物品 id',
    ],
    [
      'grantNarration 需要同拍 grantItem',
      [{ ...minimalPoison(), enemyTicks: [{ grantNarration: 'dlg.hatch' }] }],
      'poisons[0].enemyTicks[0].grantNarration: 期望非空文本 id，并同时提供 grantItem',
    ],
    [
      'grantNarration 需要正文',
      [{ ...minimalPoison(), enemyTicks: [{ grantItem: 'item-1', grantNarration: ' ' }] }],
      'poisons[0].enemyTicks[0].grantNarration: 期望非空文本 id，并同时提供 grantItem',
    ],
    [
      'selfCure 非 boolean',
      [{ ...minimalPoison(), playerTicks: [{ selfCure: 1 }] }],
      'poisons[0].playerTicks[0].selfCure: 期望 boolean',
    ],
    [
      'enemyTicks 同门（hpDelta 非整数）',
      [{ ...minimalPoison(), enemyTicks: [{ hpDelta: 'x' }] }],
      'poisons[0].enemyTicks[0].hpDelta: 期望安全整数',
    ],
    ['未知顶层键', [{ ...minimalPoison(), extra: 1 }], 'poisons[0].extra: 未知字段'],
  ]
  test.each(cases)('%s', (_name, input, message) => {
    expectRejectUnchanged(validatePoisons, input, message)
  })
  test('同 id 重复拒绝（禁止 loader 静默覆盖）', () => {
    expectExactError(
      () => validatePoisons([minimalPoison(551), minimalPoison(551)]),
      'poisons[1].id: 毒 551 重复',
    )
  })
})
