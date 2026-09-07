// A-03 on the current author-baseline API. No real project writes or browser storage.
// Run: node --import tsx docs/ops/audits/pre-e2e/probe-editor-save-recovery.mjs
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

assert.equal(typeof globalThis.indexedDB, 'undefined', 'Refuse preexisting IndexedDB')
assert.equal(
  typeof globalThis.showDirectoryPicker,
  'undefined',
  'Refuse a browser directory picker',
)
const originalFetch = globalThis.fetch
const rejectExternalIO = () => {
  throw new Error('Probe forbids network and real directory pickers')
}
const records = new Map()
const database = {
  transaction() {
    const transaction = {
      objectStore() {
        const request = (result) => {
          const req = { result }
          queueMicrotask(() => {
            req.onsuccess?.()
            queueMicrotask(() => transaction.oncomplete?.())
          })
          return req
        }
        return {
          get: (key) => request(records.get(key)),
          getAll: () => request([...records.values()]),
          put: (value) => {
            records.set(value.workspaceId, value)
            return request(value.workspaceId)
          },
        }
      },
    }
    return transaction
  },
}
globalThis.fetch = rejectExternalIO
globalThis.showDirectoryPicker = rejectExternalIO
globalThis.indexedDB = {
  open() {
    const req = { result: database }
    queueMicrotask(() => req.onsuccess?.())
    return req
  },
}

const root = fileURLToPath(new URL('../../../../packages/editor/', import.meta.url))
const requireEditor = createRequire(
  new URL('../../../../packages/editor/package.json', import.meta.url),
)
const { createServer } = await import(requireEditor.resolve('vite'))
const cacheDir = mkdtempSync(join(tmpdir(), 'type-pal-a03-probe-'))
const server = await createServer({
  root,
  cacheDir,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
})
try {
  const { memoryAuthorDirectory } = await server.ssrLoadModule(
    '/src/core/__tests__/author-save-fixture.ts',
  )
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { openLocalProject } = await server.ssrLoadModule('/src/core/open-local.ts')
  const { writeProject, toEditorState, serializeProjectWithMapCopies } =
    await server.ssrLoadModule('/src/core/project-io.ts')
  const { createLocalWorkspaceContext } = await server.ssrLoadModule(
    '/src/core/workspace-context.ts',
  )
  const { authorizeFirstSaveTarget, authorizeBoundWorkspaceTarget } = await server.ssrLoadModule(
    '/src/core/workspace-persistence.ts',
  )
  const { saveWorkspaceHandle } = await server.ssrLoadModule('/src/core/handle-store.ts')
  const { createCanonicalPlacedEntity } = await server.ssrLoadModule(
    '/src/core/entity-placement.ts',
  )
  const files = await buildBlankProject('a03-current-recovery')
  const context = createLocalWorkspaceContext(files['manifest.json'].id, 'blank-project')
  const disk = memoryAuthorDirectory()
  await writeProject(await authorizeFirstSaveTarget(context, disk.dir), files)
  await saveWorkspaceHandle(context, 'a03-memory-only', disk.dir)
  const opened = await openLocalProject(disk.dir)
  const editor = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  const newActorId = 'a03-new-npc'
  const modified = structuredClone(editor)
  const newActor = structuredClone(modified.actors[0])
  newActor.id = newActorId
  newActor.battler.baseStats.maxHP = 237
  modified.actors.push(newActor)
  modified.scenes[0].entities.push(
    createCanonicalPlacedEntity(
      'a03-placed-npc',
      { col: 10, row: 0, height: 0 },
      { mode: 'actor', actorId: newActorId },
    ),
  )
  // Real serialization validates the complete desired state before the failure is injected.
  const intended = await serializeProjectWithMapCopies(modified, opened.project.source)
  const actorsPath = modified.manifest.content.actors
  const scenePath = modified.sceneIndex.scenes[0].path
  const recoverySnapshot = new Map()
  disk.resetChanges()
  disk.hooks.beforeClose = (path) => {
    if (path === actorsPath) throw new Error('A03 injected actors close failure')
  }
  await assert.rejects(
    writeProject(
      await authorizeBoundWorkspaceTarget(context, disk.dir, opened.authorBaseline),
      intended,
      { prevSnapshot: recoverySnapshot },
    ),
    /A03 injected actors close failure/,
  )
  disk.hooks.beforeClose = undefined
  const partial = {
    sceneActor: disk.json(scenePath).entities[0].actor,
    actorIds: disk.json(actorsPath).map((actor) => actor.id),
    completedCloses: [...disk.changes.closes],
  }
  assert.equal(partial.sceneActor, newActorId)
  assert(!partial.actorIds.includes(newActorId))
  // Fresh open deliberately does not consume the old in-memory editor/recoverySnapshot/baseline.
  const reopened = await openLocalProject(disk.dir)
  const freshState = toEditorState(reopened.project, reopened.scenes, {}, {}, reopened.stamps)
  let resaveError
  try {
    await serializeProjectWithMapCopies(freshState, reopened.project.source)
  } catch (error) {
    resaveError = error.message
  }
  assert.match(resaveError, /a03-new-npc/)
  assert(!freshState.actors.some((actor) => actor.id === newActorId))

  // Positive control: the original page still has the intended bytes and can finish saving.
  await writeProject(
    await authorizeBoundWorkspaceTarget(context, disk.dir, opened.authorBaseline),
    intended,
    { prevSnapshot: recoverySnapshot },
  )
  const repaired = await openLocalProject(disk.dir)
  await serializeProjectWithMapCopies(
    toEditorState(repaired.project, repaired.scenes, {}, {}, repaired.stamps),
    repaired.project.source,
  )
  const restoredMaxHP = disk.json(actorsPath).find((actor) => actor.id === newActorId).battler
    .baseStats.maxHP
  assert.equal(restoredMaxHP, 237)
  console.log(
    JSON.stringify(
      {
        id: 'A-03',
        api: 'current authorBaseline required',
        scope: 'memory FSA/IDB only',
        partial,
        freshOpen: 'succeeded',
        freshResaveError: resaveError,
        freshSessionLostNewActorDefinition: true,
        originalSessionRetryValid: true,
        restoredMaxHP,
        currentVersions: {
          content: repaired.project.manifest.contentVersion,
          save: repaired.project.manifest.minimumSaveVersion,
        },
      },
      null,
      2,
    ),
  )
} finally {
  await server.close()
  globalThis.fetch = originalFetch
  delete globalThis.indexedDB
  delete globalThis.showDirectoryPicker
}
