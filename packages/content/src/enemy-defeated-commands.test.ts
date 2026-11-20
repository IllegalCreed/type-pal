import { describe, expect, test } from 'vitest'
import { createEnemyReferenceProject } from './__tests__/reference-project.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { checkEnemyOnDefeatedCommands } from './enemy-script.js'
import { validateAuthorEnemies } from './validate-author.js'

test('author enemy validation locates an unregistered defeated command', () => {
  const { enemy } = createEnemyReferenceProject({ onDefeated: [{ kind: 'returnScript' }] })
  expect(validateAuthorEnemies([enemy])).toEqual([enemy])
  expectExactError(
    () => validateAuthorEnemies([{ ...enemy, onDefeated: [{ kind: 'constructor' }] }]),
    'enemies[0].onDefeated[0].kind: onDefeated context 不支持命令 "constructor"',
  )
})

test('author enemy validation locates the dialogue cue at its actual command position', () => {
  const { enemy } = createEnemyReferenceProject()
  const cue = { identity: { kind: 'narration' }, rows: [{ text: 'line' }] }
  const onDefeated = [
    { kind: 'wait', ms: 0 },
    { kind: 'dialog', cue },
  ]
  expect(validateAuthorEnemies([{ ...enemy, onDefeated }])).toEqual([{ ...enemy, onDefeated }])
  expectExactError(
    () =>
      validateAuthorEnemies([
        { ...enemy, onDefeated: [onDefeated[0], { kind: 'dialog', cue: { ...cue, rows: [] } }] },
      ]),
    'enemies[0].onDefeated[1].cue.rows: 期望非空数组',
  )
})

test('onDefeated recursion reports exact count/number errors and does not rewrite nonempty branch arms', () => {
  const good = [
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'reward', is: true },
      then: [{ kind: 'giveItem', itemId: 'herb', count: 1 }],
      else: [
        { kind: 'giveMoney', delta: 0 },
        { kind: 'setFlag', flag: 'reward', value: false },
        { kind: 'returnScript' },
      ],
    },
  ]
  checkEnemyOnDefeatedCommands(good, 'defeated')
  const bad = [{ ...good[0], then: [{ kind: 'giveItem', itemId: 'herb', count: 0 }] }],
    before = deepSnapshot(bad)
  expectExactError(
    () => checkEnemyOnDefeatedCommands(bad, 'defeated'),
    'defeated[0].then[0].count: 期望正整数',
  )
  expect(bad).toEqual(before)
  expectExactError(
    () => checkEnemyOnDefeatedCommands([{ kind: 'giveMoney', delta: Infinity }], 'defeated'),
    'defeated[0]: 期望有限数',
  )
})

describe('defeated script input fields', () => {
  test('onDefeated 数组门、wait 叶与 setVar/addVar/setFlag 正负控', () => {
    expectAcceptsUnchanged(
      (value) => checkEnemyOnDefeatedCommands(value, 'defeated'),
      [
        { kind: 'setVar', var: 'k', value: 1 },
        { kind: 'addVar', var: 'k', delta: 1 },
        { kind: 'setFlag', flag: 'f', value: true },
        { kind: 'wait', ms: 0 },
      ],
    )
    const notAnArray: Record<string, unknown> = {}
    const notAnArrayBefore = deepSnapshot(notAnArray)
    expectExactError(
      () => checkEnemyOnDefeatedCommands(notAnArray, 'defeated'),
      'defeated: 期望 EnemyOnDefeatedCommand[]',
    )
    expect(notAnArray).toEqual(notAnArrayBefore)
    const badWait = [{ kind: 'wait', ms: -1 }]
    const waitBefore = deepSnapshot(badWait)
    expectExactError(
      () => checkEnemyOnDefeatedCommands(badWait, 'defeated'),
      'defeated[0].ms: 期望非负有限数',
    )
    expect(badWait).toEqual(waitBefore)
    const badValue = [{ kind: 'setVar', var: 'k', value: 'x' }]
    const badValueBefore = deepSnapshot(badValue)
    expectExactError(
      () => checkEnemyOnDefeatedCommands(badValue, 'defeated'),
      'defeated[0]: 期望有限数',
    )
    expect(badValue).toEqual(badValueBefore)
    const badFlag = [{ kind: 'setFlag', flag: 'f', value: 'yes' }]
    const badFlagBefore = deepSnapshot(badFlag)
    expectExactError(
      () => checkEnemyOnDefeatedCommands(badFlag, 'defeated'),
      'defeated[0].value: 期望 boolean',
    )
    expect(badFlag).toEqual(badFlagBefore)
  })
})
