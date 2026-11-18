import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { type AuthorCommand, checkAuthorCommands } from './author-script.js'

test('accepts explicit first-frame fade and last-frame hold before an explicit clear', () => {
  const commands: AuthorCommand[] = [
    { kind: 'playFrameAnimation', asset: 'intro', holdLastFrame: true, initialFadeInMs: 600 },
    { kind: 'clearFrameAnimation' },
  ]
  const before = deepSnapshot(commands)
  checkAuthorCommands(commands, 'body')
  expect(commands).toEqual(before)
})

test.each([
  ['a numeric hold flag', { holdLastFrame: 1 }, 'holdLastFrame: 期望 boolean'],
  ['a negative fade delay', { initialFadeInMs: -1 }, 'initialFadeInMs: 期望非负有限数'],
  ['an infinite fade delay', { initialFadeInMs: Infinity }, 'initialFadeInMs: 期望非负有限数'],
  ['a string fade delay', { initialFadeInMs: '600' }, 'initialFadeInMs: 期望非负有限数'],
  ['an unknown field', { extra: true }, 'extra: 未知字段'],
] as const)('rejects %s at the frame animation field', (_label, override, message) => {
  const input = { kind: 'playFrameAnimation', asset: 'intro', ...override }
  expect(() => checkAuthorCommands([input], 'body')).toThrow(new Error(`body[0].${message}`))
})

test('rejects an asset argument on clear', () => {
  expect(() =>
    checkAuthorCommands([{ kind: 'clearFrameAnimation', asset: 'intro' }], 'body'),
  ).toThrow(new Error('body[0].asset: 未知字段'))
})
