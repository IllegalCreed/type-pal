import { expect, test } from 'vitest'
import { runtimeScene } from './__tests__/coverage-wave2/e-enemy-author.js'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { checkRuntimeHostileBehavior } from './runtime-scene.js'

test.each([
  ['unknown victory', { onVictory: { kind: 'other' } }, 'onVictory.kind: 期望 hide|remove|remain'],
  ['unknown flee', { onPlayerFlee: { kind: 'other' } }, 'onPlayerFlee.kind: 期望 suspend|remain'],
  ['negative range', { chase: { range: -1, speed: 1 } }, 'chase.range: 期望非负有限数'],
  ['zero speed', { chase: { range: 0, speed: 0 } }, 'chase.speed: 期望正有限数'],
  [
    'floating type',
    { chase: { range: 0, speed: 0.5, floating: 0 } },
    'chase.floating: 期望 boolean',
  ],
  ['empty enemy team', { enemyTeamId: '' }, 'enemyTeamId: 期望非空字符串'],
  ['fractional field', { battleFieldId: 0.5 }, 'battleFieldId: 期望非负安全整数'],
  ['root null', null, 'hostile: 期望对象'],
] as const)('hostile rejects %s on a validated scene baseline', (_label, override, error) => {
  const good = runtimeScene().entities[0]!.hostile!
  checkRuntimeHostileBehavior(good, 'hostile')
  const input = override === null ? null : { ...good, ...override },
    before = deepSnapshot(input)
  expect(() => checkRuntimeHostileBehavior(input, 'hostile')).toThrow(error)
  expect(input).toEqual(before)
})
test('zero range, fractional positive speed, false floating and explicit field zero remain valid', () => {
  const input = {
      ...runtimeScene().entities[0]!.hostile!,
      battleFieldId: 0,
      chase: { range: 0, speed: 0.5, floating: false },
      onLose: 'gameOver',
    },
    before = deepSnapshot(input)
  expect(() => checkRuntimeHostileBehavior(input)).not.toThrow()
  expect(input).toEqual(before)
})
