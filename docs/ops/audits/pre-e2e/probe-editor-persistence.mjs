// Run from repository root: node --import tsx docs/ops/audits/pre-e2e/probe-editor-persistence.mjs
// Product FSA and IndexedDB are memory-only. Vite may use its normal module cache;
// there are no real directory handles, directory pickers or network fetches here.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const rootPath = fileURLToPath(new URL('../../../../packages/editor/', import.meta.url))
const requireEditor = createRequire(
  new URL('../../../../packages/editor/package.json', import.meta.url),
)
const { createServer } = await import(requireEditor.resolve('vite'))
assert.equal(typeof globalThis.indexedDB, 'undefined', 'Refuse a real/preexisting IndexedDB')
const originalFetch = globalThis.fetch
const rejectExternalIO = () => {
  throw new Error('Audit probe forbids directory pickers and network IO')
}
globalThis.fetch = rejectExternalIO
globalThis.showDirectoryPicker = rejectExternalIO
const records = new Map()
const db = {
  transaction() {
    const txn = {
      objectStore() {
        const request = (result) => {
          const req = { result }
          queueMicrotask(() => {
            req.onsuccess?.()
            queueMicrotask(() => txn.oncomplete?.())
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
    return txn
  },
}
globalThis.indexedDB = {
  open() {
    const req = { result: db }
    queueMicrotask(() => req.onsuccess?.())
    return req
  },
}
const disk = new Map(),
  directories = new Set(['']),
  memoryHandles = new WeakSet()
let failClose = ''
function assertMemoryDirectory(handle) {
  assert(memoryHandles.has(handle), 'Refuse non-memory directory')
}
const makeFile = (path) => ({
  kind: 'file',
  name: path.split('/').at(-1),
  async getFile() {
    return new Blob([disk.get(path)])
  },
  async createWritable() {
    let pending
    return {
      async write(value) {
        pending = new Uint8Array(await new Blob([value]).arrayBuffer())
      },
      async close() {
        if (path === failClose) throw new Error(`fault before close ${path}`)
        disk.set(path, pending)
      },
    }
  },
})
function makeDir(prefix = '') {
  const handle = {
    kind: 'directory',
    name: prefix.split('/').at(-1) || 'audit-memory',
    __prefix: prefix,
    async isSameEntry(other) {
      assertMemoryDirectory(other)
      return other.__prefix === prefix
    },
    async *entries() {
      const found = new Set()
      for (const path of [...directories, ...disk.keys()]) {
        if (path === prefix || !path.startsWith(prefix ? `${prefix}/` : '')) continue
        const name = path.slice(prefix ? prefix.length + 1 : 0).split('/')[0]
        if (found.has(name)) continue
        found.add(name)
        const child = prefix ? `${prefix}/${name}` : name
        yield [name, directories.has(child) ? makeDir(child) : makeFile(child)]
      }
    },
    async getDirectoryHandle(name, options) {
      const path = prefix ? `${prefix}/${name}` : name
      if (!directories.has(path)) {
        if (!options?.create) throw new DOMException(path, 'NotFoundError')
        directories.add(path)
      }
      return makeDir(path)
    },
    async getFileHandle(name, options) {
      const path = prefix ? `${prefix}/${name}` : name
      if (!disk.has(path)) {
        if (!options?.create) throw new DOMException(path, 'NotFoundError')
        disk.set(path, new Uint8Array())
      }
      return makeFile(path)
    },
    async removeEntry(name) {
      const path = prefix ? `${prefix}/${name}` : name
      if (!disk.delete(path)) throw new DOMException(path, 'NotFoundError')
    },
  }
  memoryHandles.add(handle)
  return handle
}
const readMemoryJson = (path) => JSON.parse(new TextDecoder().decode(disk.get(path)))
const server = await createServer({
  root: rootPath,
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
try {
  const { writeProject, toEditorState, serializeProjectWithMapCopies } =
    await server.ssrLoadModule('/src/core/project-io.ts')
  const { createLocalWorkspaceContext } = await server.ssrLoadModule(
    '/src/core/workspace-context.ts',
  )
  const { authorizeFirstSaveTarget, authorizeBoundWorkspaceTarget } = await server.ssrLoadModule(
    '/src/core/workspace-persistence.ts',
  )
  const { saveWorkspaceHandle } = await server.ssrLoadModule('/src/core/handle-store.ts')
  const { openLocalProject } = await server.ssrLoadModule('/src/core/open-local.ts')
  const { createCanonicalPlacedEntity } = await server.ssrLoadModule(
    '/src/core/entity-placement.ts',
  )
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { UpdateLocaleCommand, RenameProjectCommand } =
    await server.ssrLoadModule('/src/core/commands.ts')
  const root = makeDir(),
    context = createLocalWorkspaceContext('audit-memory', 'blank-project')
  assertMemoryDirectory(root)
  await writeProject(
    await authorizeFirstSaveTarget(context, root),
    await buildBlankProject('audit-memory'),
  )
  await saveWorkspaceHandle(context, 'audit-memory', root)
  const opened = await openLocalProject(root)
  const base = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  const saveState = async (state, snapshot = new Map()) => {
    assertMemoryDirectory(root)
    return writeProject(
      await authorizeBoundWorkspaceTarget(context, root),
      await serializeProjectWithMapCopies(state, opened.project.source),
      { prevSnapshot: snapshot },
    )
  }
  const a = new UpdateLocaleCommand(base.actors[0].name, 'Saved by A').apply(structuredClone(base))
  await saveState(a)
  const b = new RenameProjectCommand('Edited by B').apply(structuredClone(base))
  await saveState(b)
  const after = readMemoryJson('content/locale.json')['name.hero']
  assert.notEqual(after, 'Saved by A')
  console.log(
    JSON.stringify({
      id: 'A-02',
      expectedLocale: 'Saved by A',
      actualLocale: after,
      manifestName: readMemoryJson('manifest.json').name,
    }),
  )

  await saveState(base)
  const next = structuredClone(base)
  next.actors.push({ ...structuredClone(next.actors[0]), id: 'new-npc' })
  next.scenes[0].entities.push(
    createCanonicalPlacedEntity(
      'placed-npc',
      { col: 10, row: 0, height: 0 },
      { mode: 'actor', actorId: 'new-npc' },
    ),
  )
  failClose = 'content/actors.json'
  await assert.rejects(saveState(next), /fault before close/)
  failClose = ''
  const sceneActor = readMemoryJson('content/scenes/start.json').entities[0]?.actor
  const actors = readMemoryJson('content/actors.json').map((actor) => actor.id)
  const reopened = await openLocalProject(root)
  let failure
  try {
    await serializeProjectWithMapCopies(
      toEditorState(reopened.project, reopened.scenes, {}, {}, reopened.stamps),
      reopened.project.source,
    )
  } catch (error) {
    failure = error.message
  }
  assert.equal(sceneActor, 'new-npc')
  assert(!actors.includes('new-npc'))
  assert.match(failure, /new-npc/)
  console.log(
    JSON.stringify({
      id: 'A-03',
      sceneActor,
      actors,
      reopen: 'succeeded',
      resaveWithoutRepair: failure,
    }),
  )
} finally {
  await server.close()
  globalThis.fetch = originalFetch
  delete globalThis.indexedDB
  delete globalThis.showDirectoryPicker
}
