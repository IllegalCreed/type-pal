/** Real loader, writer, recovery and copy. Only browser FSA/IDB/picker boundaries are replaced. */
import {
  fsaSource,
  httpSource,
  loadCurrentProjectFrom,
  PROJECT_SAVE_STATE_PATH,
} from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'
import { simulatorLibrary } from './__tests__/battle-simulator-fixture.js'

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
      for (const record of bindings.values())
        if (await record.handle.isSameEntry(handle)) return record
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (
      lock: import('./handle-store.js').WorkspaceRegistrationLock,
      ...args: Parameters<typeof save>
    ) => {
      actual.assertWorkspaceRegistrationLock(lock, args[0].workspaceId)
      await save(...args)
    },
  }
})

import {
  AuthorSaveConflictError,
  authorBaselineSummary,
  observeAuthorSource,
} from './author-disk-baseline.js'
import {
  BATTLE_SIMULATOR_PATH,
  battleSimulatorRemovalPaths,
  emptyBattleSimulatorLibrary,
  loadBattleSimulatorLibrary,
} from './battle-simulator-library.js'
import { cloneFromPal } from './clone.js'
import { collectProjectZipEntries } from './export-zip.js'
import { finishOpen, saveProjectAs } from './open-actions.js'
import { openLocalProject } from './open-local.js'
import { observeProjectCopySource } from './project-copy-source.js'
import { serializeProjectWithMapCopies, toEditorState, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import { authorizeBoundWorkspaceTarget, authorizeFirstSaveTarget } from './workspace-persistence.js'

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.unstubAllGlobals())
const authors = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  new Map([...disk.files].filter(([path]) => !path.startsWith('.type-pal/')))
const writes = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  Object.values(disk.changes)
    .flat()
    .filter((path) => path !== '.type-pal' && !path.startsWith('.type-pal/'))
async function fixture(withLibrary = false) {
  const disk = memoryAuthorDirectory(await buildBlankProject('trial-project'))
  if (withLibrary) disk.set(BATTLE_SIMULATOR_PATH, simulatorLibrary())
  const opened = await finishOpen(disk.dir)
  const state = toEditorState(
    opened.project,
    opened.scenes,
    {},
    {},
    opened.stamps,
    opened.battleSimulator,
  )
  const files = () => serializeProjectWithMapCopies(state, opened.project.source)
  const save = async () =>
    writeProject(
      await authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
      await files(),
      { removePaths: battleSimulatorRemovalPaths(state.battleSimulator) },
    )
  return { disk, opened, state, files, save }
}
function picker(target: ReturnType<typeof memoryAuthorDirectory>) {
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { origin: 'http://localhost' },
    showDirectoryPicker: vi.fn(async () => target.dir),
  })
}

test('first use writes into the normal author transaction and formal reopen retains all four directories', async () => {
  const f = await fixture()
  expect(f.opened.battleSimulator).toBeUndefined()
  expect(authorBaselineSummary(f.opened.authorBaseline).paths).toContain(BATTLE_SIMULATOR_PATH)
  expect(await f.files()).not.toHaveProperty(BATTLE_SIMULATOR_PATH)
  f.state.battleSimulator = simulatorLibrary()
  const before = structuredClone(f.state)
  await f.save()
  expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('committed')
  expect(authorSaveStorage.receipts.get(f.opened.workspace.workspaceId)?.phase).toBe('committed')
  expect(f.disk.json(BATTLE_SIMULATOR_PATH)).toEqual(simulatorLibrary())
  expect((await finishOpen(f.disk.dir)).battleSimulator).toEqual(simulatorLibrary())
  expect(f.state).toEqual(before)
})
test('deleting every preset immediately after reopen removes the file without requiring a prior save snapshot', async () => {
  const f = await fixture(true)
  expect(f.state.battleSimulator).toEqual(simulatorLibrary())
  f.state.battleSimulator = emptyBattleSimulatorLibrary()
  await f.save()
  expect(f.disk.files.has(BATTLE_SIMULATOR_PATH)).toBe(false)
  expect(f.disk.changes.removes).toContain(BATTLE_SIMULATOR_PATH)
  expect((await finishOpen(f.disk.dir)).battleSimulator).toBeUndefined()
  f.state.battleSimulator = simulatorLibrary()
  await f.save()
  expect((await finishOpen(f.disk.dir)).battleSimulator).toEqual(simulatorLibrary())
})
test.each([
  false,
  true,
])('external %s -> file change is rejected before any author IO', async (existing) => {
  const f = await fixture(existing)
  f.state.battleSimulator = simulatorLibrary()
  const external = simulatorLibrary()
  external.plans[0]!.name = 'edited elsewhere'
  f.disk.set(BATTLE_SIMULATOR_PATH, external)
  const before = authors(f.disk)
  f.disk.resetChanges()
  await expect(f.save()).rejects.toThrow('其他位置修改')
  expect(authors(f.disk)).toEqual(before)
  expect(writes(f.disk)).toEqual([])
})
test('malformed sidecar fails visibly before binding, while the ordinary game loader ignores editor data', async () => {
  const disk = memoryAuthorDirectory(await buildBlankProject('trial-project'))
  disk.set(BATTLE_SIMULATOR_PATH, '<html>fallback</html>')
  const before = authors(disk)
  await expect(finishOpen(disk.dir)).rejects.toThrow(`战斗模拟器配置 ${BATTLE_SIMULATOR_PATH}`)
  expect(bindings.size).toBe(0)
  expect(authorSaveStorage.receipts.size).toBe(0)
  expect(authors(disk)).toEqual(before)
  expect(writes(disk)).toEqual([])
  expect((await loadCurrentProjectFrom(fsaSource(disk.dir))).manifest.id).toBe('trial-project')
})
test('invalid direct write set is rejected before journal preparation and its legitimate control commits', async () => {
  const f = await fixture()
  f.state.battleSimulator = simulatorLibrary()
  const valid = await f.files(),
    invalid = structuredClone(valid)
  invalid[BATTLE_SIMULATOR_PATH] = { ...simulatorLibrary(), version: 900 }
  const before = authors(f.disk)
  f.disk.resetChanges()
  await expect(
    writeProject(
      await authorizeBoundWorkspaceTarget(f.opened.workspace, f.disk.dir, f.opened.authorBaseline),
      invalid,
    ),
  ).rejects.toThrow('version/1')
  expect(authorSaveStorage.receipts.size).toBe(0)
  expect(f.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authors(f.disk)).toEqual(before)
  await writeProject(
    await authorizeBoundWorkspaceTarget(f.opened.workspace, f.disk.dir, f.opened.authorBaseline),
    valid,
  )
  expect((await finishOpen(f.disk.dir)).battleSimulator).toEqual(simulatorLibrary())
})
test('prepared-copy validation rejects malformed sidecar bytes omitted from the initial JSON write set', async () => {
  const source = await fixture(),
    target = memoryAuthorDirectory()
  const files = await source.files()
  await expect(
    writeProject(
      await authorizeFirstSaveTarget(
        createLocalWorkspaceContext('trial-project', 'local-directory'),
        target.dir,
      ),
      files,
      {
        copies: [{ path: BATTLE_SIMULATOR_PATH, read: async () => new Blob(['{"version":999}']) }],
        verifySource: async () => {},
      },
    ),
  ).rejects.toThrow(BATTLE_SIMULATOR_PATH)
  expect(writes(target)).toEqual([])
  expect([...authorSaveStorage.receipts.values()][0]?.phase).toBe('staging')
})
test('interrupted sidecar commit restores through the real new-page recovery path', async () => {
  const f = await fixture()
  f.state.battleSimulator = simulatorLibrary()
  f.disk.hooks.beforeClose = (path) => {
    if (path === BATTLE_SIMULATOR_PATH) throw new Error('interrupt simulator close')
  }
  await expect(f.save()).rejects.toThrow('interrupt simulator close')
  expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('pending')
  f.disk.hooks.beforeClose = undefined
  const reopened = await finishOpen(f.disk.dir)
  expect(reopened.battleSimulator).toEqual(simulatorLibrary())
  expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('committed')
})
test.each([
  false,
  true,
])('Save As carries edits or intentional deletion (%s) and leaves the source untouched', async (remove) => {
  const f = await fixture(true),
    target = memoryAuthorDirectory()
  const before = authors(f.disk)
  f.state.battleSimulator = remove ? emptyBattleSimulatorLibrary() : simulatorLibrary()
  if (!remove) f.state.battleSimulator.plans[0]!.name = 'Saved copy'
  picker(target)
  const result = await saveProjectAs(
    f.opened.workspace,
    f.files,
    f.disk.dir,
    battleSimulatorRemovalPaths(f.state.battleSimulator),
    { source: f.opened.project.source, authorBaseline: f.opened.authorBaseline },
  )
  expect(result).not.toBeNull()
  expect(result!.workspace.workspaceId).not.toBe(f.opened.workspace.workspaceId)
  expect(result!.battleSimulator).toEqual(remove ? undefined : f.state.battleSimulator)
  expect(target.files.has(BATTLE_SIMULATOR_PATH)).toBe(!remove)
  expect(authors(f.disk)).toEqual(before)
  expect(writes(f.disk)).toEqual([])
})
test('clone and author ZIP carry exact configuration bytes, including noncanonical formatting', async () => {
  const f = await fixture(true),
    target = memoryAuthorDirectory()
  const raw = `${JSON.stringify(simulatorLibrary())}\n\n`
  f.disk.set(BATTLE_SIMULATOR_PATH, raw)
  const source = fsaSource(f.disk.dir)
  await cloneFromPal(
    source,
    await authorizeFirstSaveTarget(
      createLocalWorkspaceContext('trial-project', 'local-directory'),
      target.dir,
    ),
    () => {},
  )
  expect(await fsaSource(target.dir).readText(BATTLE_SIMULATOR_PATH)).toBe(raw)
  expect((await openLocalProject(target.dir)).battleSimulator).toEqual(simulatorLibrary())
  const zip = await collectProjectZipEntries(target.dir)
  expect(
    new TextDecoder().decode(zip.find((entry) => entry.path === BATTLE_SIMULATOR_PATH)!.data),
  ).toBe(raw)
  expect(zip.some((entry) => entry.path.includes('/save-recovery/'))).toBe(false)
})
test('HTTP editor reads record genuine absence and reject missing-to-present races in copy evidence', async () => {
  const f = await fixture()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request) => {
      const bytes = f.disk.files.get(String(url).replace('https://test.invalid/project/', ''))
      return bytes === undefined
        ? new Response(null, { status: 404 })
        : new Response(bytes.slice(0))
    }),
  )
  const source = httpSource('https://test.invalid/project'),
    observed = observeAuthorSource(source)
  const project = await loadCurrentProjectFrom(observed.source)
  expect(await loadBattleSimulatorLibrary(observed.source)).toBeUndefined()
  const copied = await observeProjectCopySource(source)
  expect(await loadBattleSimulatorLibrary(copied.source)).toBeUndefined()
  f.disk.set(BATTLE_SIMULATOR_PATH, simulatorLibrary())
  const finish = await observed.finish(project).then(
    () => null,
    (error) => error,
  )
  expect(finish).toBeInstanceOf(AuthorSaveConflictError)
  expect(finish).toMatchObject({ path: BATTLE_SIMULATOR_PATH })
  await expect(copied.verify()).rejects.toThrow('其他位置修改')
})
test('reserved sidecar path collisions are rejected even when no library is being saved', async () => {
  const f = await fixture()
  f.state.manifest.content.locale = 'EDITOR/battle-simulator.json'
  await expect(f.files()).rejects.toThrow('保留路径冲突')
  expect(writes(f.disk)).toEqual([])
})
