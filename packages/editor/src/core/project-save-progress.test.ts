import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  const save = async (
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const r of bindings.values()) if (await r.handle.isSameEntry(handle)) return r
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

import { finishOpen, type SaveAsProgress, saveProjectAs } from './open-actions.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.unstubAllGlobals())

test('public save-as reports durable staging, verified writing and actual reopen in order', async () => {
  const source = memoryAuthorDirectory(await buildBlankProject('save-progress'))
  source.set('notes/retained.txt', 'copied without editing')
  const opened = await finishOpen(source.dir)
  const sourceBefore = new Map(source.files)
  const target = memoryAuthorDirectory()
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { origin: 'http://localhost' },
    showDirectoryPicker: vi.fn(async () => target.dir),
  })
  const files = await serializeProjectWithMapCopies(
    toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps),
    opened.project.source,
  )
  const events: SaveAsProgress[] = []
  const authorCloses = () => target.changes.closes.filter((path) => !path.startsWith('.type-pal/'))
  const result = await saveProjectAs(
    opened.workspace,
    async () => files,
    source.dir,
    [],
    { source: opened.project.source, authorBaseline: opened.authorBaseline },
    (event) => {
      events.push(event)
      if (event.phase === 'staging') {
        expect(authorCloses()).toEqual([])
        if (event.completed > 0)
          expect([...target.files.keys()].some((path) => path.includes('/blobs/'))).toBe(true)
      }
      if (event.phase === 'writing' && event.completed === event.total) {
        expect(target.json('.type-pal/save-state.json').phase).toBe('committed')
        expect([...target.files.keys()].some((path) => path.includes('/save-recovery/'))).toBe(
          false,
        )
      }
      if (event.phase === 'reopening')
        expect(target.json('.type-pal/save-state.json').phase).toBe('committed')
    },
  )
  expect(result?.project.manifest.name).toBe('save-progress')
  expect(source.files).toEqual(sourceBefore)
  expect(new TextDecoder().decode(target.files.get('notes/retained.txt'))).toBe(
    'copied without editing',
  )
  const stages = events.filter((event) => event.phase === 'staging')
  const lastStage = stages.at(-1)!
  expect(lastStage.total).toBe(authorCloses().length)
  expect(stages.map((event) => event.completed)).toEqual(
    Array.from({ length: lastStage.total + 1 }, (_, i) => i),
  )
  expect(stages.every((event) => event.total === lastStage.total)).toBe(true)
  const writing = events.filter((event) => event.phase === 'writing')
  expect(writing[0]?.completed).toBe(0)
  expect(writing.at(-1)?.completed).toBe(writing.at(-1)?.total)
  expect(writing.every((event, i) => i === 0 || event.completed > writing[i - 1]!.completed)).toBe(
    true,
  )
  const phases = events
    .map((event) => event.phase)
    .filter((phase, i, all) => i === 0 || phase !== all[i - 1])
  expect(phases).toEqual(['preparing', 'staging', 'validating', 'writing', 'reopening'])
})
