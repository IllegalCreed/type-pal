/** E02: current-author callers exercise the shared core, not a revived base-only dialect. */
import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { checkAuthorCommands } from './author-script.js'
import type { AuthorCondition } from './author-script-core.js'

const target = { scene: 's', entity: 'e' }
const pairs: {
  label: string
  good: AuthorCondition
  field: string
  bad: unknown
  error: string
}[] = [
  {
    label: 'flag bool',
    good: { kind: 'flag', flag: 'f', is: false },
    field: 'is',
    bad: 0,
    error: '.is: 期望 boolean',
  },
  {
    label: 'var comparator',
    good: { kind: 'var', var: 'v', op: '!=', value: 0 },
    field: 'op',
    bad: '=',
    error: '.op: 期望',
  },
  {
    label: 'var finite',
    good: { kind: 'var', var: 'v', op: '<=', value: 0 },
    field: 'value',
    bad: Infinity,
    error: '.value: 期望有限数',
  },
  {
    label: 'current scene id',
    good: { kind: 'currentScene', scene: 's' },
    field: 'scene',
    bad: '',
    error: '.scene: 期望非空字符串',
  },
  {
    label: 'entity state finite',
    good: { kind: 'entityState', target, is: 0 },
    field: 'is',
    bad: NaN,
    error: '.is: 期望有限数',
  },
  {
    label: 'entity address',
    good: { kind: 'entityInScene', target },
    field: 'target',
    bad: { scene: 's' },
    error: '.target.entity: 期望非空字符串',
  },
  {
    label: 'facing range',
    good: { kind: 'facingEntity', target, range: 0 },
    field: 'range',
    bad: -1,
    error: '.range: 期望非负有限数',
  },
  {
    label: 'chance upper',
    good: { kind: 'chance', percent: 100 },
    field: 'percent',
    bad: 101,
    error: '.percent: 期望 0..100 有限数',
  },
  {
    label: 'has item count',
    good: { kind: 'hasItem', itemId: 'item', atLeast: 1 },
    field: 'atLeast',
    bad: 0,
    error: '.atLeast: 期望正整数',
  },
  {
    label: 'owns item count',
    good: { kind: 'ownsItem', itemId: 'item', atLeast: 1 },
    field: 'atLeast',
    bad: 1.5,
    error: '.atLeast: 期望正整数',
  },
  {
    label: 'equipped item id',
    good: { kind: 'itemEquipped', itemId: 'item' },
    field: 'itemId',
    bad: '',
    error: '.itemId: 期望非空字符串',
  },
  {
    label: 'money count',
    good: { kind: 'hasMoney', atLeast: 0 },
    field: 'atLeast',
    bad: -1,
    error: '.atLeast: 期望非负安全整数',
  },
  {
    label: 'party actor id',
    good: { kind: 'inParty', actorId: 'hero' },
    field: 'actorId',
    bad: '',
    error: '.actorId: 期望非空字符串',
  },
  {
    label: 'all list',
    good: { kind: 'all', of: [] },
    field: 'of',
    bad: null,
    error: '.of: 期望条件数组',
  },
  {
    label: 'any list',
    good: { kind: 'any', of: [] },
    field: 'of',
    bad: {},
    error: '.of: 期望条件数组',
  },
]
test.each(pairs)('current nested condition rejects $label and preserves the actual command tree', ({
  good,
  field,
  bad,
  error,
}) => {
  const valid = [
    { kind: 'branch', cond: { kind: 'not', cond: good }, then: [{ kind: 'wait', ms: 1 }] },
  ]
  checkAuthorCommands(valid, 'body')
  const input = [{ ...valid[0], cond: { kind: 'not', cond: { ...good, [field]: bad } } }]
  const before = deepSnapshot(input)
  expect(() => checkAuthorCommands(input, 'body')).toThrow(`body[0].cond.cond${error}`)
  expect(input).toEqual(before)
})
test('all six current comparison operators and optional item/facing defaults remain accepted', () => {
  const conditions: AuthorCondition[] = ['==', '!=', '<', '>', '<=', '>='].map(
    (op) => ({ kind: 'var', var: 'score', op, value: 0 }) as AuthorCondition,
  )
  conditions.push(
    { kind: 'allFullHp' },
    { kind: 'hasItem', itemId: 'item' },
    { kind: 'ownsItem', itemId: 'item' },
    { kind: 'facingEntity', target },
    { kind: 'chance', percent: 0 },
  )
  const input = [{ kind: 'branch', cond: { kind: 'all', of: conditions }, then: [] }],
    before = deepSnapshot(input)
  expect(() => checkAuthorCommands(input, 'body')).not.toThrow()
  expect(input).toEqual(before)
})
