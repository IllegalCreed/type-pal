import { fsaSource } from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { deferred, memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
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

import {
  type AuthorSavePlan,
  copySaveBatchEnd,
  parseAuthorSavePlan,
  savePrefix,
} from './author-save-plan.js'
import { reconcileSaveCursor } from './author-save-prefix.js'
import { finishOpen, saveProjectAs } from './open-actions.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.unstubAllGlobals())
const authorChanges = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  [...disk.changes.creates, ...disk.changes.closes, ...disk.changes.removes].filter(
    (p) => p !== '.type-pal' && !p.startsWith('.type-pal/'),
  )
async function fixture() {
  const source = memoryAuthorDirectory(await buildBlankProject('parallel-copy'))
  for (let i = 0; i < 96; i++)
    source.set(`notes/copy-${String(i).padStart(3, '0')}.txt`, `note-${i}-exact-source`)
  const opened = await finishOpen(source.dir)
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
  const receipt = () =>
    [...authorSaveStorage.receipts.values()].find((row) => row.handle === target.dir)!
  const save = (progress?: Parameters<typeof saveProjectAs>[5]) =>
    saveProjectAs(
      opened.workspace,
      async () => files,
      source.dir,
      [],
      { source: opened.project.source, authorBaseline: opened.authorBaseline },
      progress,
    )
  return { source, target, receipt, save }
}

test('public Save As declares bounded private groups before creation, then reopens all exact bytes', async () => {
  const f = await fixture()
  const sourceBefore = new Map(f.source.files)
  let active = 0,
    maximum = 0,
    privateChecks = 0,
    authorChecks = 0
  f.target.hooks.beforeClose = async (path) => {
    const row = f.receipt()
    if (path.includes('/blobs/')) {
      expect(row.version).toBe(2)
      expect(row.staged[path.split(`/${row.operationId}/`)[1]!]).toBeTruthy()
      privateChecks++
    } else if (!path.startsWith('.type-pal/')) {
      expect(row.phase).toBe('applying')
      expect(row.issued).toBe(true)
      const plan = f.target.json(
        `.type-pal/save-recovery/${row.operationId}/plan.json`,
      ) as AuthorSavePlan
      const index = plan.steps.findIndex((step) => step.path === path && step.kind === 'write')
      expect(index).toBeGreaterThanOrEqual(row.completed)
      expect(index).toBeLessThan(row.batchEnd ?? row.completed + 1)
      if (row.batchEnd != null) expect(row.batchEnd).toBe(copySaveBatchEnd(plan, row.completed))
      authorChecks++
    }
    active++
    maximum = Math.max(maximum, active)
    await Promise.resolve()
    active--
  }
  const result = await f.save()
  expect(result?.workspace.source).toBe('save-as')
  expect(maximum).toBeGreaterThan(1)
  expect(maximum).toBeLessThanOrEqual(128)
  expect(privateChecks).toBeGreaterThanOrEqual(96)
  expect(authorChecks).toBeGreaterThanOrEqual(96)
  for (let i = 0; i < 96; i++)
    expect(
      await fsaSource(f.target.dir).readText(`notes/copy-${String(i).padStart(3, '0')}.txt`),
    ).toBe(`note-${i}-exact-source`)
  expect(f.source.files).toEqual(sourceBefore)
  expect(f.receipt()).toMatchObject({
    version: 2,
    phase: 'committed',
    batchEnd: null,
    issued: false,
    staged: {},
  })
  const reopened = await finishOpen(f.target.dir)
  expect(reopened.project.manifest.id).toBe(result?.project.manifest.id)
})

test('failed private group drains its other native streams before returning; no author IO is published', async () => {
  const f = await fixture(),
    held = deferred()
  let entered = 0,
    settled = false
  f.target.hooks.beforeClose = async (path) => {
    if (!path.includes('/blobs/')) return
    const index = entered++
    if (index === 0) await held.promise
    if (index === 1) throw new Error('injected private close')
  }
  const saved = f.save().finally(() => {
    settled = true
  })
  await vi.waitFor(() => expect(entered).toBeGreaterThan(2))
  expect(settled).toBe(false)
  expect(authorChanges(f.target)).toEqual([])
  const rejected = expect(saved).rejects.toThrow('injected private close')
  held.resolve()
  await rejected
  expect(f.receipt()).toMatchObject({
    version: 2,
    phase: 'staging',
    planHash: null,
    completed: 0,
    issued: false,
    batchEnd: null,
  })
  expect(f.target.files.has('.type-pal/save-state.json')).toBe(false)
  expect(authorChanges(f.target)).toEqual([])
})

async function interrupted() {
  const f = await fixture(),
    held = deferred()
  let entered = 0,
    settled = false
  f.target.hooks.beforeClose = async (path) => {
    if (path.startsWith('.type-pal/') || f.receipt().batchEnd == null) return
    const index = entered++
    if (index === 0) await held.promise
    if (index === 1) throw new Error('injected author close')
  }
  const saved = f.save().finally(() => {
    settled = true
  })
  await vi.waitFor(() => expect(entered).toBeGreaterThan(2))
  expect(settled).toBe(false)
  expect(f.receipt()).toMatchObject({ version: 2, phase: 'applying', issued: true })
  const rejected = expect(saved).rejects.toThrow('injected author close')
  held.resolve()
  await rejected
  f.target.hooks.beforeClose = undefined
  expect(f.target.json('.type-pal/save-state.json').phase).toBe('pending')
  return f
}

test('normal Open recovers a partially closed issued group without accepting a future foreign file', async () => {
  const f = await interrupted()
  const future = 'notes/copy-095.txt'
  expect(f.target.files.has(future)).toBe(false)
  f.target.set(future, 'foreign')
  f.target.resetChanges()
  await expect(finishOpen(f.target.dir)).rejects.toThrow(future)
  expect(f.target.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(await fsaSource(f.target.dir).readText(future)).toBe('foreign')
  f.target.files.delete(future) // explicit counter repair in the IO fixture, never production recovery
  const result = await finishOpen(f.target.dir)
  expect(result.project.manifest.id).toBe('parallel-copy')
  for (let i = 0; i < 96; i++)
    expect(
      await fsaSource(f.target.dir).readText(`notes/copy-${String(i).padStart(3, '0')}.txt`),
    ).toBe(`note-${i}-exact-source`)
  expect(f.receipt()).toMatchObject({
    phase: 'committed',
    issued: false,
    batchEnd: null,
    staged: {},
  })
})

test('missing durable payload stops grouped recovery before any overwrite or cleanup', async () => {
  const f = await interrupted(),
    row = f.receipt()
  const path = `.type-pal/save-recovery/${row.operationId}/${Object.keys(row.staged).find((p) => p.startsWith('blobs/'))!}`
  f.target.files.delete(path)
  f.target.resetChanges()
  await expect(finishOpen(f.target.dir)).rejects.toThrow('恢复数据缺失或损坏')
  expect(f.target.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(f.receipt()).toMatchObject({ phase: 'applying', issued: true })
})

test('source drift after one durable staging group still stops before the first author write', async () => {
  const f = await fixture()
  let changed = false
  await expect(
    f.save((progress) => {
      if (!changed && progress.phase === 'staging' && progress.completed >= 32) {
        changed = true
        f.source.set('notes/copy-000.txt', 'external edit')
      }
    }),
  ).rejects.toThrow('修改')
  expect(changed).toBe(true)
  expect(authorChanges(f.target)).toEqual([])
  expect(f.receipt().phase).toBe('staging')
})

function batchPlan(): AuthorSavePlan {
  const identity = {
    workspaceId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
    projectId: 'p',
    mode: 'local-project',
    source: 'save-as',
  } as const
  const paths = [
    'assets/catalog.json',
    ...Array.from({ length: 64 }, (_, i) => `file-${i}.bin`),
    'manifest.json',
  ]
  return parseAuthorSavePlan(
    {
      kind: 'type-pal-author-save-plan',
      version: 2,
      contentVersion: 23,
      operationId: crypto.randomUUID(),
      identity,
      barriers: ['manifest.json', 'assets/catalog.json'],
      copyLimits: { files: 64, bytes: 16 * 1024 * 1024 },
      before: Object.fromEntries(paths.map((p) => [p, null])),
      directories: { assets: false },
      steps: [
        { kind: 'mkdir', path: 'assets' },
        ...paths.map((path, i) => ({
          kind: 'write',
          path,
          signature: `bin:1:${i.toString(16).padStart(64, '0')}`,
        })),
      ],
    },
    identity,
  )
}

test('V2 issuance preserves serial barriers and rejects every out-of-range or malformed pending range', () => {
  const plan = batchPlan(),
    start = 2,
    end = 66
  expect(copySaveBatchEnd(plan, 0)).toBe(1)
  expect(copySaveBatchEnd(plan, 1)).toBe(2)
  expect(copySaveBatchEnd(plan, start)).toBe(end)
  expect(copySaveBatchEnd(plan, plan.steps.length - 1)).toBe(plan.steps.length)
  const frozen32 = parseAuthorSavePlan(
    { ...plan, copyLimits: { files: 32, bytes: 16 * 1024 * 1024 } },
    plan.identity,
  )
  expect(copySaveBatchEnd(frozen32, start)).toBe(start + 32)
  expect(
    reconcileSaveCursor(
      frozen32,
      { completed: start, issued: true, batchEnd: start + 32 },
      savePrefix(frozen32, start),
    ),
  ).toEqual({ completed: start, issued: true, batchEnd: start + 32 })
  const disk = savePrefix(plan, start)
  const first = plan.steps[start]!,
    last = plan.steps[end - 1]!
  if (first.kind !== 'write' || last.kind !== 'write') throw new Error('fixture')
  disk.files.set(first.path, first.signature)
  disk.files.set(last.path, last.signature)
  const cursor = { completed: start, issued: true, batchEnd: end }
  expect(reconcileSaveCursor(plan, cursor, disk)).toEqual(cursor)
  for (const batchEnd of [null, end - 1, end + 1, plan.steps.length])
    expect(() => reconcileSaveCursor(plan, { ...cursor, batchEnd }, disk)).toThrow('恢复批次')
  const future = plan.steps[end]!
  if (future.kind !== 'write') throw new Error('fixture')
  disk.files.set(future.path, future.signature)
  expect(() => reconcileSaveCursor(plan, cursor, disk)).toThrow(future.path)
  disk.files.set(future.path, null)
  for (let i = start; i < end; i++) {
    const step = plan.steps[i]!
    if (step.kind === 'write') disk.files.set(step.path, step.signature)
  }
  expect(reconcileSaveCursor(plan, cursor, disk)).toEqual({
    completed: end,
    issued: false,
    batchEnd: null,
  })
})

test('V2 rejects nonempty targets, repeated paths, wrong identity and missing publication barriers', () => {
  const plan = batchPlan()
  const bad = [
    { ...plan, before: { ...plan.before, 'file-0.bin': `bin:1:${'a'.repeat(64)}` } },
    { ...plan, directories: { assets: true } },
    { ...plan, identity: { ...plan.identity, source: 'local-directory' as const } },
    { ...plan, barriers: ['manifest.json'] },
    { ...plan, copyLimits: { files: 65, bytes: 16 * 1024 * 1024 } },
    { ...plan, copyLimits: { files: 64, bytes: 32 * 1024 * 1024 } },
    { ...plan, steps: [...plan.steps, plan.steps[2]] },
  ]
  for (const value of bad) expect(() => parseAuthorSavePlan(value, value.identity)).toThrow()
  const large = batchPlan()
  const first = large.steps[2]!
  if (first.kind !== 'write') throw new Error('fixture')
  first.signature = `bin:16777217:${'a'.repeat(64)}`
  expect(copySaveBatchEnd(large, 2)).toBe(3)
})
