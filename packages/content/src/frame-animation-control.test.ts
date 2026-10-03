import { expect, test } from 'vitest'
import { checkAuthorCommands } from './author-script.js'

test('explicit frame hold, first-frame reveal and clear pass the current strict author guard', () => {
  expect(() =>
    checkAuthorCommands(
      [
        { kind: 'playFrameAnimation', asset: 'intro', holdLastFrame: true, initialFadeInMs: 600 },
        { kind: 'clearFrameAnimation' },
      ],
      'body',
    ),
  ).not.toThrow()
})
test.each([
  { kind: 'playFrameAnimation', asset: 'intro', holdLastFrame: 1 },
  { kind: 'playFrameAnimation', asset: 'intro', initialFadeInMs: -1 },
  { kind: 'playFrameAnimation', asset: 'intro', initialFadeInMs: Infinity },
  { kind: 'playFrameAnimation', asset: 'intro', initialFadeInMs: '600' },
  { kind: 'playFrameAnimation', asset: 'intro', unknown: true },
  { kind: 'clearFrameAnimation', asset: 'intro' },
])('new frame control rejects invalid or unrecognized parameters: %j', (command) => {
  expect(() => checkAuthorCommands([command], 'body')).toThrow()
})
