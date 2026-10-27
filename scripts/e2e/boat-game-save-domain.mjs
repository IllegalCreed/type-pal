import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

function state(payload) {
  assert(
    payload?.gs && typeof payload.gs === 'object' && !Array.isArray(payload.gs),
    '006 Game checkpoint lacks its complete saved GameState',
  )
  return payload.gs
}

/** F5's actual synchronous deep-clone input must equal every field in the delivered file. */
export function assertBoatGameSaveCapture(saved, captured) {
  assert.deepEqual(state(captured), state(saved), '006 Game save capture lost GameState fields')
}

/** Full saved JSON domain, not the older scene/party/inventory summary projection. */
export function assertBoatGameRestore(saved, restored) {
  const expected = structuredClone(state(saved)),
    actual = state(restored)
  assert(
    expected.needToFadeIn === undefined || typeof expected.needToFadeIn === 'boolean',
    '006 Game saved fade flag must be boolean when present',
  )
  // loadGameFromSlot (bootstrap.ts) sets this true after loading scene assets. This is the
  // sole admitted reset, not permission to drop other transient-looking or future fields.
  expected.needToFadeIn = true
  assert.deepEqual(actual, expected, '006 Game restore lost complete GameState fields')
  return {
    contract: '006-game-complete-save-domain/1',
    fields: Object.keys(expected).length,
    normalizedFields: ['needToFadeIn'],
    stateSHA256: createHash('sha256').update(JSON.stringify(expected)).digest('hex'),
  }
}
