import assert from 'node:assert/strict'
import test from 'node:test'
import { readGame, readWorld } from './game-observer.mjs'

test('read-only adapter includes real persistent fields, fails on missing fields and ignores animation counters', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const gs = {
    wNumScene: 2,
    party: { x: 10, y: 20, facing: 'south' },
    partyMembers: [0],
    PlayerRolesRuntime: { rgwLevel: [1] },
    dwCash: 10,
    inventory: [{ id: 1, count: 2 }],
    rgScene: { 1: { wScriptOnEnter: 0 } },
    rgObject: {},
    rgEventObject: { 10: { sState: 0 } },
    allEventObjects: [
      { id: 10, x: 4, y: 5, sState: 0, triggerResume: { ip: 15 }, scriptedFrame: 3 },
    ],
  }
  const before = structuredClone(gs)
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { __tpgs: gs } })
  try {
    const result = readWorld()
    assert.deepEqual(gs, before)
    assert.deepEqual(result.scenes, gs.rgScene)
    assert.deepEqual(result.eventObjects, gs.rgEventObject)
    assert.deepEqual(result.actors, [{ id: 10, x: 4, y: 5, sState: 0, triggerResume: { ip: 15 } }])
    result.roles.rgwLevel[0] = 99
    assert.deepEqual(gs, before, 'adapter must deliver an independent snapshot')
    delete gs.allEventObjects
    assert.throws(readWorld, /missing world field: allEventObjects/)
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else delete globalThis.window
  }
})

test('pending auto fade counts as non-controllable even before paletteFadeState is installed', () => {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const gs = { needToFadeIn: true, menuStack: [], wNumScene: 2, mode: 'explore' }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { __tpgs: gs } })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { querySelector: () => null },
  })
  try {
    assert.equal(readGame().fading, true)
    gs.needToFadeIn = false
    assert.equal(readGame().fading, false)
  } finally {
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow)
    else delete globalThis.window
    if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument)
    else delete globalThis.document
  }
})
