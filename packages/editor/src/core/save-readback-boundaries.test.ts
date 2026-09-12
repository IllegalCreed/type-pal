/** Final readback and recovery boundaries; no product guards, private brands or decoders mocked. */
import { fsaSource, loadCurrentProjectFrom } from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
  findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
    for (const record of bindings.values())
      if (await record.handle.isSameEntry(handle)) return record
    return null
  },
}))

import { commitAuthorSave, prepareAuthorSave } from './author-save-journal.js'
import { openLocalProject } from './open-local.js'
import { type ProjectWriteResult, resumeOwnProjectSave, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import {
  createLocalWorkspaceContext,
  createPalDevelopmentWorkspaceContext,
  PAL_DEVELOPMENT_SENTINEL_PATH,
} from './workspace-context.js'
import {
  assertPalDevelopmentDirectory,
  authorizeBoundWorkspaceTarget,
  authorizedDirectory,
  beginAuthorizedWorkspaceMutation,
  planAuthorizedWorkspacePaths,
  recordAuthorizedWorkspaceWriteCompleted,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.restoreAllMocks())

type Disk = ReturnType<typeof memoryAuthorDirectory>
function evidence(disk: Disk) {
  return {
    files: [...disk.files].map(([path, bytes]) => [path, [...new Uint8Array(bytes)]]),
    io: structuredClone(disk.changes),
    bindings: [...bindings.values()].map((r) => ({ ...r })),
    receipts: [...authorSaveStorage.receipts.values()].map((r) =>
      structuredClone({ ...r, handle: undefined }),
    ),
  }
}
async function fixture(pal = false) {
  const files = await buildBlankProject(pal ? 'pal' : 'readback')
  if (pal)
    files[PAL_DEVELOPMENT_SENTINEL_PATH] = {
      kind: 'type-pal-editor-pal-development',
      version: 1,
      projectId: 'pal',
      workspaceId: crypto.randomUUID(),
    }
  // PAL proof is created from an independent trusted source BEFORE any target fault.
  const trusted = memoryAuthorDirectory(files)
  const context = pal
    ? await createPalDevelopmentWorkspaceContext(fsaSource(trusted.dir))
    : createLocalWorkspaceContext('readback', 'local-directory')
  const disk = memoryAuthorDirectory(files)
  const opened = await openLocalProject(disk.dir)
  bindings.set(context.workspaceId, {
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    mode: context.mode,
    source: context.source,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  return {
    files,
    disk,
    opened,
    context,
    target: () => authorizeBoundWorkspaceTarget(context, disk.dir, opened.authorBaseline),
  }
}

test.each([
  'journal',
  'writer',
] as const)('own recovery through %s never invents a missing project diff snapshot; recovered project can reopen and save again', async (entry) => {
  const { disk, opened, context, target } = await fixture()
  const actorsPath = opened.project.manifest.content.actors!
  const actors = disk.json(actorsPath)
  actors[0].battler.baseStats.maxHP = 237
  const stopped = new Error('actor close interrupted')
  let witnessed = 0
  disk.hooks.beforeClose = (path) => {
    if (path === actorsPath) {
      witnessed++
      throw stopped
    }
  }
  const input = { [actorsPath]: actors }
  const run =
    entry === 'writer'
      ? writeProject(await target(), input)
      : withAuthorizedWorkspaceMutation(await target(), async (mutation) => {
          // Public journal API, deliberately not writeProject: no project-io diff snapshot exists.
          // This is an API-boundary counterexample, NOT a claim that the normal UI bypasses writer.
          const prepared = await prepareAuthorSave(
            mutation,
            [
              {
                kind: 'write',
                path: actorsPath,
                read: async () => new Blob([`${JSON.stringify(actors, null, 2)}\n`]),
              },
            ],
            async (source) => {
              await loadCurrentProjectFrom(source)
            },
          )
          return commitAuthorSave(prepared)
        })
  await expect(run).rejects.toBe(stopped)
  expect(witnessed).toBe(1)
  expect(disk.json(actorsPath)[0].battler.baseStats.maxHP).not.toBe(237)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('pending')
  expect(authorSaveStorage.receipts.get(context.workspaceId)).toMatchObject({
    phase: 'applying',
    completed: 0,
    issued: true,
  })
  disk.hooks.beforeClose = undefined
  const onRecovering = vi.fn()
  let result: ProjectWriteResult | null = null
  const recovery = resumeOwnProjectSave(context, disk.dir, opened.authorBaseline, onRecovering)
  if (entry === 'journal') {
    await expect(recovery).rejects.toThrow('原页面的保存快照缺失，请重新打开已恢复的项目')
    expect(onRecovering).not.toHaveBeenCalled()
  } else {
    result = await recovery
    expect(onRecovering).toHaveBeenCalledOnce()
    expect(result?.snapshot).toBeInstanceOf(Map)
    expect(JSON.parse(result!.snapshot.get(actorsPath)!)[0].battler.baseStats.maxHP).toBe(237)
  }
  // The missing diff is a fail-loud UI handoff AFTER successful recovery, not lost content.
  expect(disk.json(actorsPath)[0].battler.baseStats.maxHP).toBe(237)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(authorSaveStorage.receipts.get(context.workspaceId)?.phase).toBe('committed')
  const settled = evidence(disk)
  await expect(resumeOwnProjectSave(context, disk.dir, opened.authorBaseline)).resolves.toBeNull()
  expect(evidence(disk)).toEqual(settled)
  const reopened = await openLocalProject(disk.dir)
  expect(Object.values(reopened.project.actorsById)[0]!.battler!.baseStats.maxHP).toBe(237)
  actors[0].battler.baseStats.maxHP = 238
  await writeProject(
    await authorizeBoundWorkspaceTarget(context, disk.dir, reopened.authorBaseline),
    { [actorsPath]: actors },
    result ? { prevSnapshot: result.snapshot } : undefined,
  )
  expect(
    Object.values((await openLocalProject(disk.dir)).project.actorsById)[0]!.battler!.baseStats
      .maxHP,
  ).toBe(238)
})

test.each([
  'unchanged',
  'missing',
  'invalid-json',
  'changed-json',
] as const)('PAL final readback sees %s after the last successful admission fingerprint; no stale-proof adoption', async (fault) => {
  const { disk, opened, context, target } = await fixture(true)
  const token = await target()
  const originalBytes = disk.files.get('manifest.json')!.slice(0)
  const originalText = new TextDecoder().decode(originalBytes)
  const originalManifest = JSON.parse(originalText)
  const getFileHandle = disk.dir.getFileHandle.bind(disk.dir)
  let textReads = 0,
    boundaryWitness = 0
  let afterExternal: ReturnType<typeof evidence> | undefined
  // Each verify fingerprints manifest via text(); author baseline uses arrayBuffer(). The
  // second text read returns its genuine old snapshot, then the external owner changes disk.
  // No fake decoded value or timing sleep; the next actual getFile observes the changed file.
  const spy = vi.spyOn(disk.dir, 'getFileHandle').mockImplementation(async (name, options) => {
    const handle = await getFileHandle(name, options)
    if (name !== 'manifest.json') return handle
    const getFile = handle.getFile.bind(handle)
    handle.getFile = async () => {
      const file = await getFile()
      const text = file.text.bind(file)
      file.text = async () => {
        const value = await text()
        textReads++
        if (textReads === 2) {
          boundaryWitness++
          expect(value).toBe(originalText)
          expect(evidence(disk).io).toEqual({ creates: [], closes: [], removes: [] })
          if (fault === 'missing') disk.files.delete('manifest.json')
          else if (fault === 'invalid-json') disk.set('manifest.json', '{broken')
          else if (fault === 'changed-json')
            disk.set('manifest.json', { ...originalManifest, name: 'External title' })
          afterExternal = evidence(disk)
        }
        return value
      }
      return file
    }
    return handle
  })
  const entered = vi.fn(async () => 'owner entered')
  const outcome = await withAuthorizedWorkspaceMutation(token, entered).then(
    (value) => ({ kind: 'resolved' as const, value }),
    (error) => ({ kind: 'rejected' as const, error }),
  )
  if (fault === 'unchanged') {
    expect(outcome).toEqual({ kind: 'resolved', value: 'owner entered' })
    expect(entered).toHaveBeenCalledOnce()
    expect(textReads).toBeGreaterThanOrEqual(3)
  } else {
    // Later baseline checks also reject drift, but cannot undo an already-entered callback.
    expect(entered).not.toHaveBeenCalled()
    expect(outcome.kind).toBe('rejected')
    if (outcome.kind !== 'rejected') throw new Error('unexpected successful admission')
    expect(outcome.error).toBeInstanceOf(Error)
    expect(outcome.error.message).toContain(
      fault === 'missing'
        ? 'PAL 开发基线指纹文件缺失：manifest.json'
        : fault === 'invalid-json'
          ? 'PAL 开发基线指纹文件无效：manifest.json'
          : '目标 PAL 开发基线关键快照与本次会话预期不一致',
    )
    expect(textReads).toBe(fault === 'missing' ? 2 : 3)
  }
  expect(boundaryWitness).toBe(1)
  expect(afterExternal).toBeDefined()
  expect(evidence(disk)).toEqual(afterExternal)
  expect(authorSaveStorage.receipts.size).toBe(0)
  spy.mockRestore()
  disk.set('manifest.json', originalBytes)
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).resolves.toBeUndefined()
  const actorsPath = opened.project.manifest.content.actors!
  const actors = disk.json(actorsPath)
  actors[0].battler.baseStats.maxHP = 237
  await writeProject(await target(), { [actorsPath]: actors })
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(
    Object.values((await openLocalProject(disk.dir)).project.actorsById)[0]!.battler!.baseStats
      .maxHP,
  ).toBe(237)
})

test.each([
  'object',
  'string',
  'blob',
] as const)('PAL controlled JSON readback accepts explicit %s evidence without changing identity', async (form) => {
  const { disk, context, target } = await fixture(true)
  const before = evidence(disk)
  const manifest = { ...disk.json('manifest.json'), name: `Author ${form} evidence` }
  const text = `${JSON.stringify(manifest, null, 2)}\n`
  const value = form === 'object' ? manifest : form === 'string' ? text : new Blob([text])
  await withAuthorizedWorkspaceMutation(await target(), async (mutation) => {
    await planAuthorizedWorkspacePaths(mutation, ['manifest.json'])
    await beginAuthorizedWorkspaceMutation(mutation)
    const handle = await authorizedDirectory(mutation).getFileHandle('manifest.json')
    const writable = await handle.createWritable()
    await writable.write(text)
    await writable.close()
    await recordAuthorizedWorkspaceWriteCompleted(mutation, 'manifest.json', value)
  })
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).resolves.toBeUndefined()
  const after = evidence(disk)
  expect(after.files.filter(([path]) => path !== 'manifest.json')).toEqual(
    before.files.filter(([path]) => path !== 'manifest.json'),
  )
  expect(after.io).toEqual({ creates: [], closes: ['manifest.json'], removes: [] })
  expect(after.bindings).toEqual(before.bindings)
  expect(after.receipts).toEqual(before.receipts)
  expect((await openLocalProject(disk.dir)).project.manifest.name).toBe(manifest.name)
  await expect(target()).resolves.toBeTruthy()
})

test('PAL controlled JSON rejects bare binary evidence even when the bytes contain valid unchanged JSON', async () => {
  const { disk, context, target } = await fixture(true)
  const before = evidence(disk)
  await withAuthorizedWorkspaceMutation(await target(), async (mutation) => {
    await expect(
      recordAuthorizedWorkspaceWriteCompleted(
        mutation,
        'manifest.json',
        disk.files.get('manifest.json')!.slice(0),
      ),
    ).rejects.toThrow('PAL 开发基线受控 JSON 不能写入二进制：manifest.json')
  })
  expect(evidence(disk)).toEqual(before)
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).resolves.toBeUndefined()
})
