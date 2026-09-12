/** Public save admission with real policy/journal/loader; only storage boundaries are replaced. */
import { fsaSource } from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const record of bindings.values())
        if (await record.handle.isSameEntry(handle)) return record
      return null
    },
    saveWorkspaceHandleUnderLock: async (
      lock: import('./handle-store.js').WorkspaceRegistrationLock,
      context: import('./workspace-context.js').WorkspaceContext,
      name: string,
      handle: FileSystemDirectoryHandle,
    ) => {
      actual.assertWorkspaceRegistrationLock(lock, context.workspaceId)
      bind(context, handle, name)
    },
  }
})

import { openLocalProject } from './open-local.js'
import { writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import {
  createLocalWorkspaceContext,
  createPalDevelopmentWorkspaceContext,
  createSandboxWorkspaceContext,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  SANDBOX_WORKSPACE_MARKER_PATH,
  sandboxMarkerFor,
  type WorkspaceContext,
} from './workspace-context.js'
import {
  assertPalDevelopmentDirectory,
  authorizeBoundWorkspaceTarget,
  authorizeFirstSaveTarget,
  inspectWorkspaceMetadata,
  preflightFirstSaveTarget,
  registerAuthorizedWorkspaceMutation,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.restoreAllMocks())

function bind(context: WorkspaceContext, handle: FileSystemDirectoryHandle, name = handle.name) {
  bindings.set(context.workspaceId, {
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    mode: context.mode,
    source: context.source,
    name,
    handle,
    updatedAt: 1,
  })
}
const palMarker = () => ({
  kind: 'type-pal-editor-pal-development',
  version: 1,
  projectId: 'pal',
  workspaceId: crypto.randomUUID(),
})
type Disk = ReturnType<typeof memoryAuthorDirectory>
const snapshot = (disk: Disk) =>
  [...disk.files].map(([path, bytes]) => [path, Array.from(new Uint8Array(bytes))])
const changes = (disk: Disk) => structuredClone(disk.changes)
function expectNoAuthorChanges(disk: Disk) {
  for (const paths of Object.values(disk.changes))
    expect(paths.filter((path) => path !== '.type-pal' && !path.startsWith('.type-pal/'))).toEqual(
      [],
    )
}

test('first-save legal staging is not mistaken for a nonempty foreign target', async () => {
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext('p', 'blank-project')
  const files = await buildBlankProject('p')
  const result = await writeProject(await authorizeFirstSaveTarget(context, disk.dir), files)
  expect(result.snapshot).toBeInstanceOf(Map)
  expect(result.cleanupWarning).toBeUndefined()
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect((await openLocalProject(disk.dir)).project.manifest.id).toBe('p')
})

test.each([
  'directory',
  'file',
  'payload',
] as const)('first-save rejects late %s at the true pre-author enumeration, with no subsequent IO', async (fault) => {
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext('p', 'blank-project')
  const files = await buildBlankProject('p')
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  const entries = disk.dir.entries.bind(disk.dir)
  let witnessed = 0
  let before: ReturnType<typeof snapshot> | undefined
  let io: ReturnType<typeof changes> | undefined
  let receiptBefore: unknown
  let changedPath = ''
  vi.spyOn(disk.dir, 'entries').mockImplementation(async function* () {
    if (!witnessed && disk.files.has('.type-pal/save-state.json')) {
      witnessed++
      const receipt = authorSaveStorage.receipts.get(context.workspaceId)!
      expect(disk.json('.type-pal/save-state.json').phase).toBe('pending')
      expect(receipt.phase).toBe('ready')
      expect(receipt.planHash).toMatch(/^[a-f0-9]{64}$/)
      expectNoAuthorChanges(disk)
      if (fault === 'directory') {
        changedPath = 'external-directory'
        await disk.dir.getDirectoryHandle(changedPath, { create: true })
      } else if (fault === 'file') {
        changedPath = 'external.txt'
        disk.set(changedPath, 'external owner bytes')
      } else {
        const blob = Object.keys(receipt.staged).find((path) => path.startsWith('blobs/'))!
        changedPath = `.type-pal/save-recovery/${receipt.operationId}/${blob}`
        expect(disk.files.has(changedPath)).toBe(true)
        disk.set(changedPath, 'external payload tampering')
      }
      before = snapshot(disk)
      io = changes(disk)
      receiptBefore = structuredClone({ ...receipt, handle: null })
    }
    yield* entries()
    return undefined
  })
  await expect(writeProject(target, files)).rejects.toThrow('目标文件夹必须为空')
  expect(witnessed).toBe(1)
  expect(snapshot(disk)).toEqual(before)
  expect(disk.changes).toEqual(io)
  expect({ ...authorSaveStorage.receipts.get(context.workspaceId), handle: null }).toEqual(
    receiptBefore,
  )
  if (fault === 'directory')
    await expect(disk.dir.getDirectoryHandle(changedPath)).resolves.toBeTruthy()
  else expect(new TextDecoder().decode(disk.files.get(changedPath))).toContain('external')
  expect(disk.files.has('manifest.json')).toBe(false)
})

test('sandbox bootstrap and first save produce a valid restricted project', async () => {
  const disk = memoryAuthorDirectory()
  const context = createSandboxWorkspaceContext('p', 'review-copy')
  const result = await writeProject(
    await authorizeFirstSaveTarget(context, disk.dir),
    await buildBlankProject('p'),
  )
  expect(result.snapshot).toBeInstanceOf(Map)
  expect(result.cleanupWarning).toBeUndefined()
  expect(disk.json(SANDBOX_WORKSPACE_MARKER_PATH)).toEqual(sandboxMarkerFor(context))
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect((await openLocalProject(disk.dir)).project.manifest.id).toBe('p')
})

test.each([
  'missing',
  'invalid',
  'pal',
  'different-id',
] as const)('sandbox bootstrap detects %s immediately after the marker close and writes no author files', async (fault) => {
  const disk = memoryAuthorDirectory()
  const context = createSandboxWorkspaceContext('p', 'review-copy')
  const files = await buildBlankProject('p')
  let witnessed = 0
  let before: ReturnType<typeof snapshot> | undefined
  disk.hooks.afterClose = (path) => {
    if (path !== SANDBOX_WORKSPACE_MARKER_PATH) return
    witnessed++
    expect(disk.json(path)).toEqual(sandboxMarkerFor(context))
    if (fault === 'missing') disk.files.delete(path)
    if (fault === 'invalid') disk.set(path, '{')
    if (fault === 'pal') disk.set(PAL_DEVELOPMENT_SENTINEL_PATH, palMarker())
    if (fault === 'different-id')
      disk.set(path, { ...disk.json(path), workspaceId: crypto.randomUUID() })
    before = snapshot(disk)
  }
  await expect(
    writeProject(await authorizeFirstSaveTarget(context, disk.dir), files),
  ).rejects.toThrow(
    fault === 'missing'
      ? 'marker 缺失'
      : fault === 'invalid'
        ? 'marker 无效'
        : fault === 'pal'
          ? '含 PAL 开发基线 sentinel'
          : 'identity 不一致',
  )
  expect(witnessed).toBe(1)
  expect(snapshot(disk)).toEqual(before)
  expectNoAuthorChanges(disk)
  expect(authorSaveStorage.receipts.size).toBe(0)
  expect(bindings.size).toBe(0)
})

test('sandbox resumes a bootstrap-only failed caller without rewriting its original marker', async () => {
  const disk = memoryAuthorDirectory()
  const context = createSandboxWorkspaceContext('p', 'review-copy')
  const first = await authorizeFirstSaveTarget(context, disk.dir)
  await expect(
    withAuthorizedWorkspaceMutation(first, async (mutation) => {
      await registerAuthorizedWorkspaceMutation(mutation, context, disk.dir.name)
      throw new Error('caller failed after bootstrap')
    }),
  ).rejects.toThrow('caller failed after bootstrap')
  expect(disk.json(SANDBOX_WORKSPACE_MARKER_PATH)).toEqual(sandboxMarkerFor(context))
  expect(bindings.size).toBe(0)
  expect(authorSaveStorage.receipts.size).toBe(0)
  await expect(preflightFirstSaveTarget(context, disk.dir)).rejects.toThrow(
    '新沙盒只能保存到空文件夹',
  )
  const markerBefore = disk.files.get(SANDBOX_WORKSPACE_MARKER_PATH)!.slice(0)
  disk.resetChanges()
  const target = await authorizeFirstSaveTarget(context, disk.dir, {
    resumesInterruptedAttempt: true,
  })
  expect((await writeProject(target, await buildBlankProject('p'))).snapshot).toBeInstanceOf(Map)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(disk.files.get(SANDBOX_WORKSPACE_MARKER_PATH)).toEqual(markerBefore)
  expect(disk.changes.closes).not.toContain(SANDBOX_WORKSPACE_MARKER_PATH)
  expect((await openLocalProject(disk.dir)).project.manifest.id).toBe('p')
})

test('a sandbox retry hint without a marker still requires an empty directory', async () => {
  const context = createSandboxWorkspaceContext('p', 'review-copy')
  const foreign = memoryAuthorDirectory({ 'outside.txt': "not this editor's file" })
  const before = snapshot(foreign)
  await expect(
    authorizeFirstSaveTarget(context, foreign.dir, { resumesInterruptedAttempt: true }),
  ).rejects.toThrow('目标文件夹必须为空')
  expect(snapshot(foreign)).toEqual(before)
  expect(foreign.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
  const empty = memoryAuthorDirectory()
  const target = await authorizeFirstSaveTarget(context, empty.dir, {
    resumesInterruptedAttempt: true,
  })
  await writeProject(target, await buildBlankProject('p'))
  expect(empty.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(empty.json(SANDBOX_WORKSPACE_MARKER_PATH)).toEqual(sandboxMarkerFor(context))
})

test('PAL sentinel appearing after the initial additional verification blocks sandbox marker creation', async () => {
  const disk = memoryAuthorDirectory()
  const context = createSandboxWorkspaceContext('p', 'ui-samples')
  let entered = 0
  const target = await authorizeFirstSaveTarget(context, disk.dir, {
    additionalVerify: async () => {
      entered++
      expect(disk.files.size).toBe(0)
      disk.set(PAL_DEVELOPMENT_SENTINEL_PATH, palMarker())
    },
  })
  await expect(writeProject(target, await buildBlankProject('p'))).rejects.toThrow(
    '新沙盒目标含 PAL 开发基线 sentinel',
  )
  expect(entered).toBe(1)
  expect((await inspectWorkspaceMetadata(disk.dir)).palDevelopment.kind).toBe('valid')
  expect([...disk.files.keys()]).toEqual([PAL_DEVELOPMENT_SENTINEL_PATH])
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
})

test.each([
  'projectId',
  'mode',
  'source',
] as const)('first-save preflight rejects a changed existing binding %s; the same-directory valid binding saves', async (field) => {
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext('p', 'blank-project')
  bind(context, disk.dir)
  await expect(preflightFirstSaveTarget(context, disk.dir)).resolves.toBeUndefined()
  const valid = bindings.get(context.workspaceId)!
  bindings.set(context.workspaceId, {
    ...valid,
    ...(field === 'projectId'
      ? { projectId: 'another-project' }
      : field === 'mode'
        ? { mode: 'sandbox' as const }
        : { source: 'save-as' as const }),
  })
  await expect(preflightFirstSaveTarget(context, disk.dir)).rejects.toThrow(
    '当前工作区与既有绑定目录 identity 不一致',
  )
  expect(disk.files.size).toBe(0)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
  bindings.set(context.workspaceId, valid)
  expect(
    (
      await writeProject(
        await authorizeFirstSaveTarget(context, disk.dir),
        await buildBlankProject('p'),
      )
    ).snapshot,
  ).toBeInstanceOf(Map)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
})

test.each([
  'sandbox',
  'pal',
] as const)('a bound local project rejects a newly appeared %s marker instead of silently keeping local authority', async (mode) => {
  const disk = memoryAuthorDirectory(await buildBlankProject('p'))
  const context = createLocalWorkspaceContext('p', 'local-directory')
  const opened = await openLocalProject(disk.dir)
  bind(context, disk.dir)
  await expect(
    authorizeBoundWorkspaceTarget(context, disk.dir, opened.authorBaseline),
  ).resolves.toBeTruthy()
  disk.set(
    mode === 'sandbox' ? SANDBOX_WORKSPACE_MARKER_PATH : PAL_DEVELOPMENT_SENTINEL_PATH,
    mode === 'sandbox'
      ? sandboxMarkerFor(createSandboxWorkspaceContext('p', 'review-copy'))
      : palMarker(),
  )
  const before = snapshot(disk)
  await expect(
    authorizeBoundWorkspaceTarget(context, disk.dir, opened.authorBaseline),
  ).rejects.toThrow('普通本地项目的已绑定目录出现受限工作区 identity')
  expect(snapshot(disk)).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
})

async function palFixture() {
  const files = await buildBlankProject('pal')
  files[PAL_DEVELOPMENT_SENTINEL_PATH] = palMarker()
  const trusted = memoryAuthorDirectory(files)
  const context = await createPalDevelopmentWorkspaceContext(fsaSource(trusted.dir))
  const disk = memoryAuthorDirectory(files)
  const opened = await openLocalProject(disk.dir)
  return { files, context, disk, opened }
}

test('PAL directory validation rejects a non-PAL context before granting any capability', async () => {
  const { context, disk } = await palFixture()
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).resolves.toBeUndefined()
  const before = snapshot(disk)
  await expect(
    assertPalDevelopmentDirectory(createLocalWorkspaceContext('pal', 'local-directory'), disk.dir),
  ).rejects.toThrow('当前会话没有 PAL 开发基线目标证明')
  expect(snapshot(disk)).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
})

test('PAL directory validation itself rejects a newly appeared sandbox marker', async () => {
  const { context, disk } = await palFixture()
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).resolves.toBeUndefined()
  disk.set(
    SANDBOX_WORKSPACE_MARKER_PATH,
    sandboxMarkerFor(createSandboxWorkspaceContext('pal', 'review-copy')),
  )
  const metadata = await inspectWorkspaceMetadata(disk.dir)
  expect(metadata.sandbox.kind).toBe('valid')
  expect(metadata.palDevelopment.kind).toBe('valid')
  const before = snapshot(disk)
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).rejects.toThrow(
    'PAL 开发基线目标含沙盒 marker',
  )
  expect(snapshot(disk)).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
})

test('PAL first-save cannot fabricate a missing startup author baseline; an actual loaded baseline succeeds', async () => {
  const { files, context, disk, opened } = await palFixture()
  const before = snapshot(disk)
  await expect(authorizeFirstSaveTarget(context, disk.dir)).rejects.toThrow(
    '缺少启动时作者文件基线',
  )
  expect(snapshot(disk)).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
  const target = await authorizeFirstSaveTarget(context, disk.dir, {
    authorBaseline: opened.authorBaseline,
  })
  const authored = { ...files }
  delete authored[PAL_DEVELOPMENT_SENTINEL_PATH]
  expect((await writeProject(target, authored)).snapshot).toBeInstanceOf(Map)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(disk.json(PAL_DEVELOPMENT_SENTINEL_PATH)).toEqual(files[PAL_DEVELOPMENT_SENTINEL_PATH])
  expect(context.persistencePolicy).toBe('pal-bound')
})
