// Independent review probe; no product or official test/baseline modification.
// Run: pnpm exec tsx docs/ops/evidence/CODE-QUALITY-94/codex-r2-idb-counter.mts
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createInitialGameState } from '../../../../packages/game/src/core/game-state.js'
import { Save } from '../../../../packages/game/src/core/save/api.js'
import { _resetDbConnectionForTest } from '../../../../packages/game/src/core/save/indexed-db.js'

// Reuse the already installed reforge test dependency without adding a dependency.
const requireReforge = createRequire(
  new URL('../../../../packages/reforge/package.json', import.meta.url),
)
const { IDBFactory, IDBObjectStore } = requireReforge('fake-indexeddb')
Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
_resetDbConnectionForTest()
const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
gs.dwCash = 321

// Positive control: the same real API/driver successfully persists a legal state.
await Save.saveSlot(1, gs)
assert.equal((await Save.loadSlot(1))?.dwCash, 321)

const originalPut = IDBObjectStore.prototype.put
let abortObserved = false
let abortFinished: () => void = () => {}
const aborted = new Promise<void>((resolve) => {
  abortFinished = resolve
})
IDBObjectStore.prototype.put = function (...args: unknown[]) {
  const req = originalPut.apply(this, args)
  req.transaction.addEventListener('abort', () => {
    abortObserved = true
    abortFinished()
  })
  // W3C allows abort after request success and before transaction completion.
  req.addEventListener('success', () => req.transaction.abort())
  return req
}
let apiResolved = false
try {
  await Save.saveSlot(2, gs)
  apiResolved = true
  await aborted
} finally {
  IDBObjectStore.prototype.put = originalPut
}
const stored = await Save.loadSlot(2)
assert.equal(abortObserved, true)
assert.equal(apiResolved, true)
assert.equal(stored, null)
console.log(
  JSON.stringify(
    {
      positiveControlSlot1: true,
      abortedSlot2: abortObserved,
      saveSlotResolvedDespiteAbort: apiResolved,
      slot2Persisted: stored !== null,
      conclusion: 'COUNTER: request success was reported as save success before transaction commit',
      limitation:
        'spec-compatible fake-indexeddb 6.2.5 fault injection; no claim of natural browser quota reproduction',
    },
    null,
    2,
  ),
)
