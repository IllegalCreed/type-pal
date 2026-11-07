import { expect, test } from 'vitest'
import { expectExactError } from './__tests__/guard-leaf-fixtures.js'
import {
  checkAuthorDialogueCue,
  type DialogueRow,
  type Locale,
  lookupText,
  resolveDialogueRowText,
  type TextId,
} from './index.js'

const locale: Locale = {
  'dlg.1575': '一朵空的莲蓬．．',
  'item.herb.name': '止血草',
}

test.each([
  { name: 'localized dialogue', row: { text: 'dlg.1575' }, expected: '一朵空的莲蓬．．' },
  {
    name: 'canonical literal item name',
    row: { reward: { kind: 'item', itemName: '止血草', count: 3 } },
    expected: '获得止血草 × 3',
  },
  {
    name: 'localized item name',
    row: { reward: { kind: 'item', itemName: 'item.herb.name', count: 2 } },
    expected: '获得止血草 × 2',
  },
  { name: 'money', row: { reward: { kind: 'money', amount: 50 } }, expected: '获得50文钱' },
] satisfies Array<{
  name: string
  row: DialogueRow
  expected: string
}>)('shared formatter resolves $name through a locale and a text resolver', ({ row, expected }) => {
  expect(resolveDialogueRowText(row, locale)).toBe(expected)
  const resolve = (id: TextId) => lookupText(id, locale)
  expect(resolveDialogueRowText(row, resolve)).toBe(expected)
})

test('reward item names are resolved at presentation using the selected locale', () => {
  const row: DialogueRow = { reward: { kind: 'item', itemName: 'item.herb.name', count: 2 } }
  const translated: Locale = { 'item.herb.name': 'Hemostatic Herb' }
  expect(resolveDialogueRowText(row, translated)).toBe('获得Hemostatic Herb × 2')
  expect(resolveDialogueRowText(row, (id) => lookupText(id, translated))).toBe(
    '获得Hemostatic Herb × 2',
  )
  expect(row).toEqual({ reward: { kind: 'item', itemName: 'item.herb.name', count: 2 } })
})

test.each([
  ['non-object reward', null, 'reward: 期望奖励对象'],
  ['unknown reward kind', { kind: 'equipment' }, 'reward.kind: 期望 item|money'],
  ['blank item name', { kind: 'item', itemName: ' ', count: 1 }, 'reward.itemName: 期望文本 ID'],
  [
    'zero item count',
    { kind: 'item', itemName: '止血草', count: 0 },
    'reward.count: 期望正安全整数',
  ],
  [
    'unsafe item count',
    { kind: 'item', itemName: '止血草', count: Number.MAX_SAFE_INTEGER + 1 },
    'reward.count: 期望正安全整数',
  ],
  ['string money', { kind: 'money', amount: '50' }, 'reward.amount: 期望正安全整数'],
  [
    'mixed item and money fields',
    { kind: 'item', itemName: '止血草', count: 1, amount: 50 },
    'reward.amount: 未知字段',
  ],
])('author dialogue JSON rejects %s at its reward row', (_name, reward, error) => {
  expectExactError(
    () => checkAuthorDialogueCue({ identity: { kind: 'narration' }, rows: [{ reward }] }, 'cue'),
    `cue.rows[0].${error}`,
  )
})
