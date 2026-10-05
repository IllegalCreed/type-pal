import test from 'node:test'
import assert from 'node:assert/strict'
import { gameRouteActors } from './inn-observer.mjs'

test('game route actor projection excludes hidden and vanishing blockers, including stale scene copies', () => {
  const actors = gameRouteActors(
    [
      { id: 59, x: 2192, y: 584, sState: 2, sVanishTime: 800 },
      { id: 60, x: 2208, y: 592, sState: 2, sVanishTime: 0 },
      { id: 61, x: 2224, y: 600, sState: 2, sVanishTime: 0 },
      { id: 62, x: 2240, y: 608, sState: 1, sVanishTime: 0 },
    ],
    [{ id: 60, sState: 0, sVanishTime: 0 }],
  )
  assert.deepEqual(actors, [
    { col: (2224 / 16 + 600 / 8) / 2, row: (600 / 8 - 2224 / 16) / 2, collide: true },
  ])
})
