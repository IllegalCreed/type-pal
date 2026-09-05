// Audit evidence only; do not use as a product fixture or a save converter.
// Run at repository root: node --import tsx docs/ops/audits/pre-e2e/probe-save-boundaries.mjs
import assert from 'node:assert/strict'
import { buildEntityLifecycleReferenceIndex } from '../../../../packages/content/src/index.ts'
import { createCommandBus } from '../../../../packages/game/src/core/command-bus.ts'
import { setSceneLoader, tickEventSystem } from '../../../../packages/game/src/core/event-system.ts'
import { createInitialGameState } from '../../../../packages/game/src/core/game-state.ts'
import { Save } from '../../../../packages/game/src/core/save/api.ts'
import {
  _resetDbConnectionForTest,
  IndexedDbSave,
} from '../../../../packages/game/src/core/save/indexed-db.ts'
import { tickSceneInput } from '../../../../packages/game/src/core/scene-system.ts'
import { canQuickSave } from '../../../../packages/game/src/tools/quick-save.ts'
import { parseImportedSave, serializeSave } from '../../../../packages/game/src/tools/save-io.ts'
import {
  normalizeCurrentSave,
  preflightCurrentSave,
} from '../../../../packages/reforge/src/save/current-codec.ts'
import { IndexedDbSaveStore } from '../../../../packages/reforge/src/save/store.ts'

assert.equal(
  typeof globalThis.indexedDB,
  'undefined',
  'Refuse a process with a real/preexisting IndexedDB',
)
const log = (value) => console.log(JSON.stringify(value))

try {
  const gs = createInitialGameState({ x: 160, y: 112, facing: 'right' })
  gs.wNumScene = 5
  gs.mode = 'event'
  gs.eventCursor = {
    commands: [{ op: 'loadScene', sceneId: 15 }, { op: 'end' }],
    labelMap: {},
    ip: 0,
  }
  setSceneLoader(() => new Promise(() => {}))
  tickEventSystem(gs, { held: new Set(), pressed: new Set(), frameNum: 0 }, createCommandBus())
  assert.equal(canQuickSave(gs), true)
  await Save.saveSlot(1, gs) // With no IndexedDB, this is the actual API's memory backend.
  const saved = await Save.loadSlot(1)
  log({
    id: 'A-04',
    mode: gs.mode,
    sceneLoading: gs.sceneLoading,
    target: gs.wNumScene,
    allowed: canQuickSave(gs),
    savedLoading: saved.sceneLoading,
    cursorCleared: saved.eventCursor === undefined,
  })
} finally {
  setSceneLoader(null)
  await Save._clearAllForTest()
}

try {
  const good = createInitialGameState({ x: 160, y: 112, facing: 'right' })
  good.mode = 'explore'
  await Save.saveSlot(1, good)
  const bad = JSON.parse(serializeSave(good))
  bad.gs.party = null // Keep the real format/version and all other exported fields.
  await Save.saveSlot(1, parseImportedSave(JSON.stringify(bad)))
  const loaded = await Save.loadSlot(1)
  assert.equal(loaded.party, null)
  const ctx = {
    tilemap: {
      width: 64,
      height: 128,
      tileset: 'probe',
      cells: Array.from({ length: 128 }, () =>
        Array.from({ length: 64 }, () => ({ lower: 0, upper: 0 })),
      ),
    },
    eventCommands: [],
    labelMap: {},
  }
  let failure
  try {
    tickSceneInput(
      loaded,
      { held: new Set(['Right']), pressed: new Set(), frameNum: 0 },
      createCommandBus(),
      ctx,
    )
  } catch (error) {
    failure = error.message
  }
  assert.match(failure, /null/)
  log({ id: 'A-06', importAccepted: true, overwrittenParty: loaded.party, runtimeFailure: failure })
} finally {
  await Save._clearAllForTest()
}

let writeTx
globalThis.indexedDB = {
  open() {
    const req = {
      result: {
        transaction() {
          writeTx = {
            state: 'pending',
            objectStore() {
              return {
                put() {
                  const request = { result: 1 }
                  queueMicrotask(() => request.onsuccess?.())
                  return request
                },
              }
            },
          }
          return writeTx
        },
      },
    }
    queueMicrotask(() => req.onsuccess?.())
    return req
  },
}
try {
  await IndexedDbSave.saveSlot(1, { dwCash: 123 }, {})
  log({
    id: 'A-05',
    promise: 'resolved',
    transaction: writeTx.state,
    completeHandler: typeof writeTx.oncomplete,
    abortHandler: typeof writeTx.onabort,
  })
  assert.equal(writeTx.state, 'pending')
  assert.equal(writeTx.oncomplete, undefined)
  writeTx.state = 'aborted'
  writeTx.onabort?.()
} finally {
  _resetDbConnectionForTest()
  delete globalThis.indexedDB
}

// Thin IDB boundary: database names and keys are chosen by the real Reforge store.
const databases = new Map()
const opened = []
const writes = []
globalThis.indexedDB = {
  open(name, version) {
    opened.push([name, version])
    const request = {}
    let db = databases.get(name)
    const fresh = !db
    if (!db) {
      const stores = new Map()
      db = {
        objectStoreNames: { contains: (key) => stores.has(key) },
        createObjectStore(key) {
          stores.set(key, new Map())
        },
        transaction(_names, mode) {
          const transaction = {
            objectStore(store) {
              return {
                put(value, key) {
                  writes.push([name, store, key])
                  stores.get(store).set(key, structuredClone(value))
                },
                get(key) {
                  const req = {}
                  queueMicrotask(() => {
                    req.result = structuredClone(stores.get(store).get(key))
                    req.onsuccess?.()
                  })
                  return req
                },
                getAll() {
                  const req = {}
                  queueMicrotask(() => {
                    req.result = structuredClone([...stores.get(store).values()])
                    req.onsuccess?.()
                  })
                  return req
                },
              }
            },
          }
          if (mode === 'readwrite') queueMicrotask(() => transaction.oncomplete?.())
          return transaction
        },
      }
      databases.set(name, db)
    }
    queueMicrotask(() => {
      request.result = db
      if (fresh) request.onupgradeneeded?.()
      request.onsuccess?.()
    })
    return request
  },
}
const payload = (id) => ({
  version: 8,
  projectId: id,
  contentVersion: 20,
  world: { party: [], inventory: [], money: 10, learnedSkills: {} },
  position: { sceneId: 's', pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
})
try {
  const a = new IndexedDbSaveStore(),
    b = new IndexedDbSaveStore()
  const meta = (id) => ({ slotId: 'quick', kind: 'quick', party: [], mapName: id, savedAt: 1 })
  await a.putSlot(meta('A'), payload('A'), new Blob(['A']))
  const before = await a.getPayload('quick')
  await b.putSlot(meta('B'), payload('B'), new Blob(['B']))
  const after = await a.getPayload('quick')
  assert.equal(before.projectId, 'A')
  assert.equal(after.projectId, 'B')
  await assert.rejects(
    preflightCurrentSave({
      manifest: { id: 'A', contentVersion: 20, minimumSaveVersion: 8 },
      payload: after,
    }),
  )
  log({
    id: 'A-01',
    opened,
    writes,
    beforeProject: before.projectId,
    afterProject: after.projectId,
    oldAOverwritten: true,
    AReadNowRejected: true,
  })
} finally {
  delete globalThis.indexedDB
}

// This is a boundary observation only, not an end-to-end restore/crash claim.
const resolver = await preflightCurrentSave({
  manifest: { id: 'A', contentVersion: 20, minimumSaveVersion: 8 },
  payload: payload('A'),
})
const refs = buildEntityLifecycleReferenceIndex([{ id: 's', entities: [] }])
for (const [field, alter] of [
  [
    'party=null',
    (p) => {
      p.world.party = null
    },
  ],
  [
    'money=string',
    (p) => {
      p.world.money = 'not-money'
    },
  ],
  [
    'position=null',
    (p) => {
      p.position = null
    },
  ],
]) {
  const p = payload('A')
  alter(p)
  normalizeCurrentSave(p, resolver, refs)
  log({ id: 'U-01', field, codecAccepted: true, fullRestoreNotRun: true })
}
