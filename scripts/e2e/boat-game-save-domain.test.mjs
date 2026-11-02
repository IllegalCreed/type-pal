import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { assertBoatGameRestore, assertBoatGameSaveCapture } from './boat-game-save-domain.mjs'

const require = createRequire(new URL('../../packages/game/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))
let server, cache, saved
before(async () => {
  cache = await mkdtemp(join(tmpdir(), 'boat-save-domain-'))
  server = await createServer({
    configFile: false,
    cacheDir: cache,
    root: fileURLToPath(new URL('../../packages/game', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  const { createInitialGameState } = await server.ssrLoadModule('/src/core/game-state.ts')
  const { Save } = await server.ssrLoadModule('/src/core/save/api.ts')
  // Real typed world + public save/load serialization; this tests proof IO, not a fabricated006 run.
  await Save.saveSlot(1, createInitialGameState({ x: 1344, y: 288, facing: 'down' }))
  const { serializeSave } = await server.ssrLoadModule('/src/tools/save-io.ts')
  saved = JSON.parse(serializeSave(await Save.loadSlot(1)))
})
after(async () => {
  await server?.close()
  if (cache) await rm(cache, { recursive: true, force: true })
})

const restored = () => ({
  ...structuredClone(saved),
  gs: { ...structuredClone(saved.gs), needToFadeIn: true },
})
test('public saved JSON is fully compared and only the explicit load fade is normalized', () => {
  const before = structuredClone(saved),
    loaded = restored()
  assertBoatGameSaveCapture(saved, structuredClone(saved))
  const result = assertBoatGameRestore(saved, loaded)
  assert.equal(result.fields, Object.keys(loaded.gs).length)
  assert.deepEqual(result.normalizedFields, ['needToFadeIn'])
  assert.deepEqual(saved, before)
  loaded.gs.needToFadeIn = false
  assert.throws(() => assertBoatGameRestore(saved, loaded), /lost complete GameState fields/)
})

test('save capture compares fields outside the old scene/party summary', () => {
  const changed = structuredClone(saved)
  changed.gs.wSavedTimes++
  assert.throws(
    () => assertBoatGameSaveCapture(saved, changed),
    /save capture lost GameState fields/,
  )
})

test('restoration compares a legal music value outside the old scene/party summary', () => {
  const changed = restored()
  changed.gs.wNumMusic++
  assert.throws(() => assertBoatGameRestore(saved, changed), /lost complete GameState fields/)
})

test('unlisted serialized fields are still part of the complete input domain', () => {
  const extended = structuredClone(saved)
  extended.gs.additionalSerializedState = { value: 7 }
  const loaded = { gs: { ...structuredClone(extended.gs), needToFadeIn: true } }
  assertBoatGameRestore(extended, loaded)
  delete loaded.gs.additionalSerializedState
  assert.throws(() => assertBoatGameRestore(extended, loaded), /lost complete GameState fields/)
})
