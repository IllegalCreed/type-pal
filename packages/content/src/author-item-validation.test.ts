import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { AuthorItemData } from './author-item.js'
import { validateAuthorItems } from './validate-author.js'

function item() {
  return {
    id: 'herb',
    name: '药草',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: { target: 'scene', consuming: true, effects: [] },
  } satisfies AuthorItemData
}

function scriptEffects() {
  return {
    shared: { kind: 'runScript', script: 'shared/user/teleport' },
    privateUse: {
      kind: 'itemPrivateScript',
      script: { id: 'use', body: [{ kind: 'setFlag', flag: 'used', value: true }] },
    },
  } satisfies Record<string, NonNullable<AuthorItemData['use']>['effects'][number]>
}

test('keeps stable shared scripts and one inline private script in the author document', () => {
  const base = item()
  const { shared, privateUse } = scriptEffects()
  const input = [
    { ...base, id: 'shared', use: { ...base.use, effects: [shared] } },
    { ...base, id: 'private', use: { ...base.use, effects: [privateUse] } },
  ]
  const before = deepSnapshot(input)
  expect(validateAuthorItems(input)).toEqual(before)
  expect(input).toEqual(before)
})

test('allows an empty draft and private scripts with character or scene effects', () => {
  const base = item()
  const { privateUse } = scriptEffects()
  const input = [
    base,
    {
      ...base,
      id: 'character-effect',
      use: { ...base.use, target: 'oneAlly', effects: [privateUse, { kind: 'healHp', amount: 1 }] },
    },
    {
      ...base,
      id: 'scene-effect',
      use: {
        ...base.use,
        effects: [
          privateUse,
          { kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 1 },
        ],
      },
    },
  ] satisfies AuthorItemData[]
  const before = deepSnapshot(input)
  expect(validateAuthorItems(input)).toEqual(before)
  expect(input).toEqual(before)
})

test('rejects runtime-shaped script refs and a differently named private slot', () => {
  const base = item()
  const { privateUse } = scriptEffects()
  expect(() =>
    validateAuthorItems([
      {
        ...base,
        use: { ...base.use, effects: [{ kind: 'runScript', script: { chunk: 'old', id: 's' } }] },
      },
    ]),
  ).toThrow(new Error('items[0].use.effects[0].script: 期望稳定 shared script id'))
  expect(() =>
    validateAuthorItems([
      {
        ...base,
        use: {
          ...base.use,
          effects: [{ ...privateUse, script: { ...privateUse.script, id: 'old' } }],
        },
      },
    ]),
  ).toThrow(new Error('items[0].use.effects[0].script.id: item-private 固定为 use'))
})

test('rejects more than one private use slot', () => {
  const base = item()
  const { privateUse } = scriptEffects()
  const duplicate = deepSnapshot(privateUse)
  expect(() =>
    validateAuthorItems([{ ...base, use: { ...base.use, effects: [privateUse, duplicate] } }]),
  ).toThrow(new Error('items[0].use.effects: item-private use 槽只能出现一次'))
})

test('requires a shared script effect to stand alone and target the scene', () => {
  const base = item()
  const { shared } = scriptEffects()
  expect(() =>
    validateAuthorItems([
      { ...base, use: { ...base.use, effects: [shared, { kind: 'healHp', amount: 1 }] } },
    ]),
  ).toThrow(
    new Error(
      'items[0].use.effects: 外部脚本/场景钩子必须作为唯一效果；复杂编排请放入被引用脚本，以免失败时提交半套世界修改',
    ),
  )
  expect(() =>
    validateAuthorItems([{ ...base, use: { ...base.use, target: 'oneAlly', effects: [shared] } }]),
  ).toThrow(new Error('items[0].use.target: 场景/剧情效果必须使用 scene'))
})

test('honors battle-only context for healing and rejects world-only scripts', () => {
  const base = item()
  const { shared } = scriptEffects()
  const control = [
    {
      ...base,
      use: {
        ...base.use,
        battleOnly: true,
        target: 'oneAlly',
        effects: [{ kind: 'healHp', amount: 1 }],
      },
    },
  ] satisfies AuthorItemData[]
  const before = deepSnapshot(control)
  expect(validateAuthorItems(control)).toEqual(before)
  expect(() =>
    validateAuthorItems([{ ...base, use: { ...base.use, battleOnly: true, effects: [shared] } }]),
  ).toThrow(new Error('items[0].use.effects: battleOnly 用途包含不可用于战斗的效果'))
})
