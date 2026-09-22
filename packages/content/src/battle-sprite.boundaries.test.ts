import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  type BattleSpriteDef,
  type EnemyBattleSpriteProfile,
  validateBattleSprites,
} from './battle-sprite.js'

function enemy(): BattleSpriteDef & { profile: EnemyBattleSpriteProfile } {
  const value = {
    id: 'enemy-main',
    label: '敌人',
    asset: 'battle.enemy-main',
    profile: {
      kind: 'enemy' as const,
      idle: { start: 0, count: 2 },
      magic: { start: 2, count: 1 },
      attack: { start: 3, count: 1 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    },
  }
  expect(validateBattleSprites([value])).toEqual([value])
  return value
}

test.each([
  [
    'idle empty',
    { idle: { start: 0, count: 0 }, magic: { start: 0, count: 1 }, attack: { start: 1, count: 1 } },
    'profile.idle.count: 敌人至少需要 1 个待机帧',
  ],
  [
    'idle offset',
    { idle: { start: 1, count: 2 }, magic: { start: 3, count: 1 }, attack: { start: 4, count: 1 } },
    'profile.idle.start: 敌人待机段必须从 0 开始',
  ],
  ['magic gap', { magic: { start: 3, count: 0 } }, 'profile.magic.start: 敌人施法段必须紧接待机段'],
  ['idle zero tick', { idleTicksPerFrame: 0 }, 'profile.idleTicksPerFrame: 期望正整数'],
  ['negative action tick', { actTicksPerFrame: -1 }, 'profile.actTicksPerFrame: 期望非负整数'],
  [
    'fractional section',
    { attack: { start: 3, count: 0.5 } },
    'profile.attack.count: 期望非负整数',
  ],
  ['section object', { magic: null }, 'profile.magic: 期望对象'],
  ['unknown profile', { kind: 'custom' }, 'profile.kind: 期望 player-fighter、enemy 或 summon'],
] as const)('battle sprite rejects %s without mutating the submitted profile', (_label, override, error) => {
  const base = enemy()
  const input = [{ ...base, profile: { ...base.profile, ...override } }]
  const before = deepSnapshot(input)
  expect(() => validateBattleSprites(input)).toThrow(`battleSprites[0].${error}`)
  expect(input).toEqual(before)
})

test.each([
  ['id slash', { id: 'enemy/main' }, 'id 不得含'],
  ['label blank', { label: '  ' }, 'label: 期望非空字符串'],
  ['asset type', { asset: 1 }, 'asset: 期望非空字符串'],
  ['profile null', { profile: null }, 'profile: 期望对象'],
] as const)('battle sprite rejects %s independently of catalog lookups', (_label, override, error) => {
  const input = [{ ...enemy(), ...override }]
  const before = deepSnapshot(input)
  expect(() => validateBattleSprites(input)).toThrow(error)
  expect(input).toEqual(before)
})

test('battle sprite container must be an array of records', () => {
  expect(() => validateBattleSprites({})).toThrow('battleSprites: 期望数组')
  expect(() => validateBattleSprites([null])).toThrow('battleSprites[0]: 期望对象')
  expect(validateBattleSprites([])).toEqual([])
})

test('parsed enemy sections are detached from the actual author input', () => {
  const input = [enemy()]
  const before = deepSnapshot(input)
  const [parsed] = validateBattleSprites(input)
  expect(parsed).toEqual(input[0])
  if (parsed?.profile.kind !== 'enemy') throw new Error('expected enemy fixture')
  parsed.profile.idle.count = 8
  parsed.profile.magic.start = 8
  parsed.profile.attack.start = 9
  expect(input).toEqual(before)
})
