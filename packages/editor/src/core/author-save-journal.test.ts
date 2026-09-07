import type { AssetCatalogV1, CurrentManifest } from '@type-pal/content'
import { beforeEach, expect, test, vi } from 'vitest'

const storage = vi.hoisted(() => ({
  receipts: new Map<string, import('./author-save-store.js').AuthorSaveReceipt>(),
  bindings: new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
  beforePut: undefined as
    | ((r: import('./author-save-store.js').AuthorSaveReceipt) => void)
    | undefined,
}))
vi.mock('./author-save-store.js', async (original) => {
  const actual = await original<typeof import('./author-save-store.js')>()
  const copy = (r: import('./author-save-store.js').AuthorSaveReceipt) => ({
    ...structuredClone({ ...r, handle: undefined }),
    handle: r.handle,
  })
  return {
    ...actual,
    storeAuthorSaveReceipt: async (r: import('./author-save-store.js').AuthorSaveReceipt) => {
      actual.parseAuthorSaveReceipt(r)
      storage.beforePut?.(r)
      storage.receipts.set(r.workspaceId, copy(r))
    },
    loadAuthorSaveReceipt: async (id: string) => {
      const r = storage.receipts.get(id)
      return r ? actual.parseAuthorSaveReceipt(copy(r)) : null
    },
    findAuthorSaveReceipt: async (handle: FileSystemDirectoryHandle) => {
      for (const r of storage.receipts.values())
        if (await r.handle.isSameEntry(handle)) return actual.parseAuthorSaveReceipt(copy(r))
      return null
    },
    deleteStagingAuthorSaveReceipt: async (
      r: import('./author-save-store.js').AuthorSaveReceipt,
    ) => {
      if (storage.receipts.get(r.workspaceId)?.operationId !== r.operationId)
        throw new Error('receipt changed')
      storage.receipts.delete(r.workspaceId)
    },
  }
})
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  const save = async (
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    storage.bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => storage.bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const r of storage.bindings.values()) if (await r.handle.isSameEntry(handle)) return r
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

import {
  type FileSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
  PROJECT_SAVE_STATE_PATH,
} from '@type-pal/reforge'
import { deferred, memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import {
  type AuthorSaveInput,
  commitAuthorSave,
  type PreparedAuthorSave,
  prepareAuthorSave,
  recoverInterruptedAuthorSave,
} from './author-save-journal.js'
import { createCanonicalPlacedEntity } from './entity-placement.js'
import { finishOpen } from './open-actions.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext, createSandboxWorkspaceContext } from './workspace-context.js'
import {
  type AuthorizedWorkspaceMutation,
  authorizeBoundWorkspaceTarget,
  authorizeFirstSaveTarget,
  registerAuthorizedWorkspaceMutation,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

beforeEach(() => {
  storage.receipts.clear()
  storage.bindings.clear()
  storage.beforePut = undefined
})
const blob = (value: unknown) =>
  new Blob([
    value instanceof ArrayBuffer
      ? value
      : typeof value === 'string'
        ? value
        : `${JSON.stringify(value, null, 2)}\n`,
  ])
const inputs = (files: Record<string, unknown>): AuthorSaveInput[] =>
  Object.entries(files).map(([path, value]) => ({
    kind: 'write',
    path,
    read: async () => blob(value),
  }))
async function validate(source: FileSource) {
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project),
    stamps = await loadStampTemplates(project)
  await serializeProjectWithMapCopies(toEditorState(project, scenes, {}, {}, stamps), source)
}
async function fixture(extra?: (files: Record<string, unknown>) => void) {
  const files = await buildBlankProject('journal-test')
  extra?.(files)
  const disk = memoryAuthorDirectory(files)
  const opened = await finishOpen(disk.dir)
  const scenes = structuredClone(opened.scenes)
  const state = toEditorState(opened.project, scenes, {}, {}, opened.stamps)
  const hero = state.actors[0]!
  const actor = structuredClone(hero)
  actor.id = 'new-npc'
  actor.battler!.baseStats.maxHP = 237
  state.actors.push(actor)
  scenes[0]!.entities.push(
    createCanonicalPlacedEntity(
      'journal-new-entity',
      { col: 1, row: 1, height: 0 },
      { mode: 'actor', actorId: actor.id },
    ),
  )
  const intended = await serializeProjectWithMapCopies(state, opened.project.source)
  return { disk, opened, intended }
}
async function save(f: Awaited<ReturnType<typeof fixture>>, steps = inputs(f.intended)) {
  const target = await authorizeBoundWorkspaceTarget(
    f.opened.workspace,
    f.disk.dir,
    f.opened.authorBaseline,
  )
  return withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, f.opened.workspace, f.disk.dir.name)
    const prepared = await prepareAuthorSave(mutation, steps, validate, {
      catalogPath: f.opened.project.manifest.assets.catalog,
    })
    return commitAuthorSave(prepared)
  })
}
function assertRestored(disk: ReturnType<typeof memoryAuthorDirectory>) {
  expect(
    disk.json('content/actors.json').find((actor: { id: string }) => actor.id === 'new-npc').battler
      .baseStats.maxHP,
  ).toBe(237)
  expect(
    disk
      .json('content/scenes/start.json')
      .entities.some((entity: { actor?: string }) => entity.actor === 'new-npc'),
  ).toBe(true)
  expect(disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('committed')
}

test('full target is staged before any author write, then published and reopened', async () => {
  const f = await fixture()
  let witnessed = false
  f.disk.hooks.beforeClose = async (path) => {
    if (!path.startsWith('.type-pal/')) {
      const receipt = storage.receipts.get(f.opened.workspace.workspaceId)!
      expect(receipt.issued).toBe(true)
      expect(receipt.phase).toBe('applying')
      expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('pending')
      witnessed = true
    }
  }
  const result = await save(f)
  expect(result.cleanupWarning).toBeUndefined()
  expect(witnessed).toBe(true)
  assertRestored(f.disk)
  expect([...f.disk.files.keys()].some((path) => path.includes('save-recovery/'))).toBe(false)
  await expect(finishOpen(f.disk.dir)).resolves.toMatchObject({
    workspace: { workspaceId: f.opened.workspace.workspaceId },
  })
})

test.each([
  'before',
  'after',
] as const)('new-page recovery reconciles actors close %s failure and retains 237', async (where) => {
  const f = await fixture()
  const fail = (path: string) => {
    if (path === 'content/actors.json') throw new Error('injected close failure')
  }
  if (where === 'before') f.disk.hooks.beforeClose = fail
  else f.disk.hooks.afterClose = fail
  await expect(save(f)).rejects.toThrow('injected close failure')
  expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('pending')
  await expect(finishOpen(f.disk.dir)).rejects.toThrow('未完成')
  f.disk.hooks.beforeClose = undefined
  f.disk.hooks.afterClose = undefined
  f.disk.resetChanges()
  vi.resetModules()
  const fresh = await import('./author-save-journal.js')
  await fresh.recoverInterruptedAuthorSave(f.disk.dir)
  assertRestored(f.disk)
  if (where === 'after') expect(f.disk.changes.closes).not.toContain('content/actors.json')
  await expect(fresh.recoverInterruptedAuthorSave(f.disk.dir)).resolves.toMatchObject({
    kind: 'committed',
  })
})

test('staging failure leaves author bytes unchanged and is safely cleaned without replay', async () => {
  const f = await fixture(),
    old = new Map(f.disk.files)
  f.disk.hooks.beforeClose = (path) => {
    if (path.includes('/blobs/')) throw new Error('staging failed')
  }
  await expect(save(f)).rejects.toThrow('staging failed')
  for (const [path, bytes] of old) expect(f.disk.files.get(path)).toEqual(bytes)
  expect(f.disk.changes.closes.filter((path) => !path.startsWith('.type-pal/'))).toEqual([])
  f.disk.hooks.beforeClose = undefined
  await recoverInterruptedAuthorSave(f.disk.dir)
  expect(storage.receipts.size).toBe(0)
  for (const [path, bytes] of old) expect(f.disk.files.get(path)).toEqual(bytes)
})

test('first save stages privately without weakening the empty-target author gate', async () => {
  const files = await buildBlankProject('first-journal'),
    disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext(
    (files['manifest.json'] as { id: string }).id,
    'blank-project',
  )
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  await withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, context, disk.dir.name)
    await commitAuthorSave(await prepareAuthorSave(mutation, inputs(files), validate))
  })
  expect(disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('committed')
  await expect(finishOpen(disk.dir)).resolves.toMatchObject({
    workspace: { workspaceId: context.workspaceId },
  })
})

function receiptOf(f: Awaited<ReturnType<typeof fixture>>) {
  return storage.receipts.get(f.opened.workspace.workspaceId)!
}
function stopAtActors(f: Awaited<ReturnType<typeof fixture>>) {
  f.disk.hooks.beforeClose = (path) => {
    if (path === 'content/actors.json') throw new Error('stop actors')
  }
}
const authorChanges = (disk: ReturnType<typeof memoryAuthorDirectory>) => ({
  creates: disk.changes.creates.filter((path) => !path.startsWith('.type-pal')),
  closes: disk.changes.closes.filter((path) => !path.startsWith('.type-pal')),
  removes: disk.changes.removes.filter((path) => !path.startsWith('.type-pal')),
})

test.each([
  'ready',
  'issued',
  'cursor',
  'data-complete',
  'committed',
] as const)('handles an IDB commit failure at %s without losing intent', async (phase) => {
  const f = await fixture()
  storage.beforePut = (r) => {
    if (
      (phase === 'ready' && r.phase === 'ready') ||
      (phase === 'issued' && r.phase === 'applying' && r.issued) ||
      (phase === 'cursor' && r.phase === 'applying' && !r.issued && r.completed > 0) ||
      (phase === 'data-complete' && r.phase === 'data-complete') ||
      (phase === 'committed' && r.phase === 'committed')
    )
      throw new Error(`IDB ${phase}`)
  }
  if (phase === 'committed') {
    await expect(save(f)).resolves.toMatchObject({
      kind: 'committed',
      cleanupWarning: expect.stringContaining('已保存'),
    })
    assertRestored(f.disk)
  } else await expect(save(f)).rejects.toThrow(`IDB ${phase}`)
  storage.beforePut = undefined
  f.disk.resetChanges()
  await recoverInterruptedAuthorSave(f.disk.dir)
  if (phase === 'ready') {
    expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
    expect(storage.receipts.size).toBe(0)
    expect(
      f.disk.json('content/actors.json').some((actor: { id: string }) => actor.id === 'new-npc'),
    ).toBe(false)
  } else {
    assertRestored(f.disk)
    if (phase === 'data-complete' || phase === 'committed')
      expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  }
})

test.each([
  'content/locale.json',
  'content/actors.json',
  'content/scenes/start.json',
])('foreign modification of %s stops recovery without further author IO', async (path) => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow('stop actors')
  f.disk.hooks.beforeClose = undefined
  f.disk.set(path, 'external owner bytes')
  f.disk.resetChanges()
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow(path)
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  expect(new TextDecoder().decode(f.disk.files.get(path))).toBe('external owner bytes')
})

test.each([
  'plan',
  'payload',
  'missing-payload',
  'marker',
  'version',
  'binding',
  'forceSandbox',
])('rejects %s corruption or authority drift before replay', async (fault) => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow('stop actors')
  f.disk.hooks.beforeClose = undefined
  const receipt = receiptOf(f),
    root = `.type-pal/save-recovery/${receipt.operationId}`
  const payload = [...f.disk.files.keys()].find((path) => path.startsWith(`${root}/blobs/`))!
  if (fault === 'plan') f.disk.set(`${root}/plan.json`, '{}')
  if (fault === 'payload') f.disk.set(payload, 'changed payload')
  if (fault === 'missing-payload') f.disk.files.delete(payload)
  if (fault === 'marker') f.disk.set(PROJECT_SAVE_STATE_PATH, '{}')
  if (fault === 'version')
    storage.receipts.set(receipt.workspaceId, {
      ...receipt,
      contentVersion: 19,
    } as unknown as typeof receipt)
  if (fault === 'binding')
    storage.bindings.set(receipt.workspaceId, {
      ...storage.bindings.get(receipt.workspaceId)!,
      handle: memoryAuthorDirectory().dir,
    })
  f.disk.resetChanges()
  await expect(
    recoverInterruptedAuthorSave(f.disk.dir, { forceSandbox: fault === 'forceSandbox' }),
  ).rejects.toThrow()
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('copied pending metadata cannot grant permission to a different directory', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow()
  const copy = memoryAuthorDirectory(Object.fromEntries(f.disk.files))
  await expect(recoverInterruptedAuthorSave(copy.dir)).rejects.toThrow('原浏览器')
  expect(copy.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('all desired content is validated before ready, not just its hash', async () => {
  const f = await fixture()
  f.intended['content/actors.json'] = []
  await expect(save(f)).rejects.toThrow()
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  expect(receiptOf(f).phase).toBe('staging')
})

test('target manifest cannot change the project identity covered by the original authorization', async () => {
  const f = await fixture()
  ;(f.intended['manifest.json'] as CurrentManifest).id = 'another-project'
  await expect(save(f)).rejects.toThrow('原授权项目身份')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('preparation sees a late foreign author change and writes no author files', async () => {
  const f = await fixture()
  f.disk.hooks.afterClose = (path) => {
    if (path.endsWith('/plan.json')) f.disk.set('content/locale.json', 'outside change')
  }
  await expect(save(f)).rejects.toThrow('content/locale.json')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('committed cleanup failure is nonfatal and later cleanup never overwrites newer content', async () => {
  const f = await fixture()
  f.disk.hooks.beforeRemove = (path) => {
    if (path.includes('/blobs/')) throw new Error('cleanup denied')
  }
  await expect(save(f)).resolves.toMatchObject({
    kind: 'committed',
    cleanupWarning: expect.stringContaining('已保存'),
  })
  assertRestored(f.disk)
  f.disk.hooks.beforeRemove = undefined
  f.disk.set('content/locale.json', { future: 'new content after commit' })
  f.disk.resetChanges()
  await recoverInterruptedAuthorSave(f.disk.dir)
  expect(f.disk.json('content/locale.json')).toEqual({ future: 'new content after commit' })
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('an unknown file inside the operation directory is preserved during cleanup', async () => {
  const f = await fixture()
  f.disk.hooks.afterClose = (path) => {
    if (path.endsWith('/plan.json')) f.disk.set(path.replace('plan.json', 'keep.txt'), 'unrelated')
  }
  await expect(save(f)).resolves.toMatchObject({ cleanupWarning: expect.any(String) })
  expect([...f.disk.files.keys()].some((path) => path.endsWith('/keep.txt'))).toBe(true)
  assertRestored(f.disk)
})

test('catalog double writes and a failed delete retain their exact prefix', async () => {
  const f = await fixture((files) => {
    ;(files['manifest.json'] as CurrentManifest).content.ambiences = 'content/ambiences.json'
    files['content/ambiences.json'] = []
  })
  delete (f.intended['manifest.json'] as CurrentManifest).content.ambiences
  delete f.intended['content/ambiences.json']
  const path = f.opened.project.manifest.assets.catalog
  const final = f.intended[path] as AssetCatalogV1
  const staged = structuredClone(final)
  const asset = Object.values(staged.assets)[0]!
  staged.assets['temporary.catalog.entry'] = asset
  const steps: AuthorSaveInput[] = [
    { kind: 'write', path, read: async () => blob(staged) },
    ...inputs(f.intended),
    { kind: 'remove', path: 'content/ambiences.json' },
  ]
  f.disk.hooks.beforeRemove = (candidate) => {
    if (candidate === 'content/ambiences.json') throw new Error('delete failed')
  }
  await expect(save(f, steps)).rejects.toThrow('delete failed')
  f.disk.hooks.beforeRemove = undefined
  f.disk.resetChanges()
  await recoverInterruptedAuthorSave(f.disk.dir)
  expect(f.disk.files.has('content/ambiences.json')).toBe(false)
  expect(f.disk.json(path)).toEqual(final)
  assertRestored(f.disk)
})

test('a first-save interruption is recoverable even before manifest exists', async () => {
  const files = await buildBlankProject('first-crash'),
    disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext(
    (files['manifest.json'] as CurrentManifest).id,
    'blank-project',
  )
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  const steps = inputs(files).filter((step) => step.path !== 'manifest.json')
  steps.push({
    kind: 'write',
    path: 'manifest.json',
    read: async () => blob(files['manifest.json']),
  })
  disk.hooks.beforeClose = (path) => {
    if (path === 'content/actors.json') throw new Error('first close failed')
  }
  await expect(
    withAuthorizedWorkspaceMutation(target, async (mutation) => {
      await registerAuthorizedWorkspaceMutation(mutation, context, disk.dir.name)
      await commitAuthorSave(await prepareAuthorSave(mutation, steps, validate))
    }),
  ).rejects.toThrow('first close failed')
  expect(disk.files.has('manifest.json')).toBe(false)
  disk.hooks.beforeClose = undefined
  await recoverInterruptedAuthorSave(disk.dir)
  await expect(finishOpen(disk.dir)).resolves.toMatchObject({
    workspace: { workspaceId: context.workspaceId },
  })
})

test('fake or expired mutation/prepared capabilities cannot write', async () => {
  await expect(prepareAuthorSave({} as AuthorizedWorkspaceMutation, [], validate)).rejects.toThrow(
    '授权',
  )
  await expect(commitAuthorSave({} as PreparedAuthorSave)).rejects.toThrow('授权')
  const f = await fixture()
  let prepared!: PreparedAuthorSave
  const target = await authorizeBoundWorkspaceTarget(
    f.opened.workspace,
    f.disk.dir,
    f.opened.authorBaseline,
  )
  await withAuthorizedWorkspaceMutation(target, async (mutation) => {
    prepared = await prepareAuthorSave(mutation, inputs(f.intended), validate)
  })
  await expect(commitAuthorSave(prepared)).rejects.toThrow('授权')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  // The sealed intent itself remains recoverable via its independent durable authorization.
  await recoverInterruptedAuthorSave(f.disk.dir)
  assertRestored(f.disk)
})

test('an unawaited commit still keeps the original authorization and lock alive until IO settles', async () => {
  const f = await fixture(),
    entered = deferred(),
    release = deferred()
  f.disk.hooks.beforeClose = async (path) => {
    if (path === 'content/actors.json') {
      entered.resolve()
      await release.promise
    }
  }
  let finished = false
  let commit!: ReturnType<typeof commitAuthorSave>
  const operation = withAuthorizedWorkspaceMutation(
    await authorizeBoundWorkspaceTarget(f.opened.workspace, f.disk.dir, f.opened.authorBaseline),
    async (mutation) => {
      await registerAuthorizedWorkspaceMutation(mutation, f.opened.workspace, f.disk.dir.name)
      const plan = await prepareAuthorSave(mutation, inputs(f.intended), validate)
      commit = commitAuthorSave(plan)
      return 'body returned without awaiting commit'
    },
  ).then((value) => {
    finished = true
    return value
  })
  try {
    await Promise.race([
      entered.promise,
      operation.then(() => {
        throw new Error('scope ended before commit')
      }),
    ])
    expect(finished).toBe(false)
  } finally {
    release.resolve()
  }
  await expect(operation).resolves.toBe('body returned without awaiting commit')
  await expect(commit).resolves.toMatchObject({ kind: 'committed' })
  assertRestored(f.disk)
})

test.each([
  'pending-before',
  'committed-before',
  'committed-after',
] as const)('resolves interrupted marker publication %s', async (fault) => {
  const f = await fixture()
  const fail = (path: string) => {
    if (path !== PROJECT_SAVE_STATE_PATH) return
    const r = receiptOf(f)
    if (
      (fault === 'pending-before' && r.phase === 'ready') ||
      (fault !== 'pending-before' && r.phase === 'data-complete')
    )
      throw new Error('marker close failed')
  }
  if (fault === 'committed-after') f.disk.hooks.afterClose = fail
  else f.disk.hooks.beforeClose = fail
  if (fault === 'committed-after')
    await expect(save(f)).resolves.toMatchObject({ kind: 'committed' })
  else await expect(save(f)).rejects.toThrow('marker close failed')
  f.disk.hooks.beforeClose = undefined
  f.disk.hooks.afterClose = undefined
  await recoverInterruptedAuthorSave(f.disk.dir)
  assertRestored(f.disk)
})

test('sandbox recovery preserves its restrictive marker and is allowed in forceSandbox mode', async () => {
  const files = await buildBlankProject('sandbox-journal'),
    disk = memoryAuthorDirectory()
  const context = createSandboxWorkspaceContext(
    (files['manifest.json'] as CurrentManifest).id,
    'ui-samples',
  )
  disk.hooks.beforeClose = (path) => {
    if (path === 'content/actors.json') throw new Error('sandbox stop')
  }
  await expect(
    withAuthorizedWorkspaceMutation(
      await authorizeFirstSaveTarget(context, disk.dir),
      async (mutation) => {
        await registerAuthorizedWorkspaceMutation(mutation, context, disk.dir.name)
        await commitAuthorSave(await prepareAuthorSave(mutation, inputs(files), validate))
      },
    ),
  ).rejects.toThrow('sandbox stop')
  const marker = disk.files.get('.type-pal/workspace.json')!.slice(0)
  disk.hooks.beforeClose = undefined
  await recoverInterruptedAuthorSave(disk.dir, { forceSandbox: true })
  expect(disk.files.get('.type-pal/workspace.json')).toEqual(marker)
  expect(storage.bindings.get(context.workspaceId)?.mode).toBe('sandbox')
  await expect(finishOpen(disk.dir, { forceSandbox: true })).resolves.toMatchObject({
    workspace: { workspaceId: context.workspaceId, mode: 'sandbox' },
  })
})

test('a later incremental save validates unchanged disk content and the previous committed generation', async () => {
  const f = await fixture()
  await save(f)
  const oldId = receiptOf(f).operationId
  const locale = { ...f.disk.json('content/locale.json'), 'name.hero': 'incremental edit' }
  const target = await authorizeBoundWorkspaceTarget(
    f.opened.workspace,
    f.disk.dir,
    f.opened.authorBaseline,
  )
  const staged: number[] = [],
    applied: string[] = []
  f.disk.resetChanges()
  await withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, f.opened.workspace, f.disk.dir.name)
    const plan = await prepareAuthorSave(
      mutation,
      [
        ...inputs({ 'content/locale.json': locale }),
        { kind: 'mkdir', path: 'kept-empty' },
        { kind: 'remove', path: 'already-absent.json' },
      ],
      async (view) => {
        await expect(view.readBytes('missing-unplanned.json')).rejects.toMatchObject({
          name: 'NotFoundError',
        })
        await expect(view.urlFor('content/locale.json')).rejects.toThrow('不能用于渲染')
        await validate(view)
      },
      { onStaged: (bytes) => staged.push(bytes) },
    )
    await commitAuthorSave(plan, (step) => applied.push(step.path))
  })
  expect(receiptOf(f).operationId).not.toBe(oldId)
  expect(staged).toHaveLength(1)
  expect(applied).toEqual(['content/locale.json', 'kept-empty', 'already-absent.json'])
  expect(authorChanges(f.disk).closes).toEqual(['content/locale.json'])
  expect(f.disk.json('content/locale.json')['name.hero']).toBe('incremental edit')
  await expect(f.disk.dir.getDirectoryHandle('kept-empty')).resolves.toBeDefined()
})

test('a changed identity marker and a file-as-directory collision cannot be recovered', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow()
  f.disk.hooks.beforeClose = undefined
  f.disk.set('.type-pal/workspace.json', 'foreign identity')
  f.disk.resetChanges()
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('workspace.json')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  const other = await fixture()
  other.disk.set('file-not-dir', 'keep')
  await expect(
    save(other, [...inputs(other.intended), { kind: 'mkdir', path: 'file-not-dir' }]),
  ).rejects.toMatchObject({ name: 'TypeMismatchError' })
  expect(authorChanges(other.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('missing receipt with no pending marker is a read-only no-op', async () => {
  const disk = memoryAuthorDirectory(await buildBlankProject('nothing-pending'))
  await expect(recoverInterruptedAuthorSave(disk.dir)).resolves.toBeNull()
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('a changed private payload is not erased while cleaning an unsealed attempt', async () => {
  const f = await fixture()
  f.disk.hooks.beforeClose = (path) => {
    if (path.endsWith('/plan.json')) throw new Error('seal stopped')
  }
  await expect(save(f)).rejects.toThrow('seal stopped')
  f.disk.hooks.beforeClose = undefined
  const path = [...f.disk.files.keys()].find((path) => path.includes('/blobs/'))!
  f.disk.set(path, 'external content in staging directory')
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('待清理')
  expect(new TextDecoder().decode(f.disk.files.get(path))).toBe(
    'external content in staging directory',
  )
  expect(storage.receipts.has(f.opened.workspace.workspaceId)).toBe(true)
})

test.each([
  'premature-committed',
  'unregistered-payload',
  'short-data-complete',
] as const)('typed but inconsistent recovery metadata is rejected: %s', async (fault) => {
  const f = await fixture()
  if (fault === 'short-data-complete')
    storage.beforePut = (r) => {
      if (r.phase === 'applying' && r.issued) throw new Error('stop before author IO')
    }
  else stopAtActors(f)
  await expect(save(f)).rejects.toThrow()
  storage.beforePut = undefined
  f.disk.hooks.beforeClose = undefined
  const r = receiptOf(f)
  if (fault === 'premature-committed')
    f.disk.set(PROJECT_SAVE_STATE_PATH, {
      ...f.disk.json(PROJECT_SAVE_STATE_PATH),
      phase: 'committed',
    })
  if (fault === 'unregistered-payload') {
    const staged = { ...r.staged }
    delete staged[Object.keys(staged).find((path) => path.startsWith('blobs/'))!]
    storage.receipts.set(r.workspaceId, { ...r, staged })
  }
  if (fault === 'short-data-complete')
    storage.receipts.set(r.workspaceId, {
      ...r,
      phase: 'data-complete',
      completed: 0,
      issued: false,
    })
  f.disk.resetChanges()
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow()
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('a pending save cannot be replaced by another plan', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow()
  f.disk.hooks.beforeClose = undefined
  f.disk.resetChanges()
  await expect(save(f)).rejects.toThrow('未完成')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('a cleanup-only retry finishes before a subsequent save, without hiding a cleanup failure', async () => {
  const f = await fixture()
  f.disk.hooks.beforeRemove = (path) => {
    if (path.includes('/blobs/')) throw new Error('cannot clean')
  }
  await expect(save(f)).resolves.toMatchObject({ cleanupWarning: expect.any(String) })
  f.disk.resetChanges()
  await expect(save(f)).rejects.toThrow('待清理')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  f.disk.hooks.beforeRemove = undefined
  await expect(save(f)).resolves.toMatchObject({ kind: 'committed' })
  assertRestored(f.disk)
})

test('an incremental staged view does not silently adopt a changed untouched author file', async () => {
  const f = await fixture()
  const target = await authorizeBoundWorkspaceTarget(
    f.opened.workspace,
    f.disk.dir,
    f.opened.authorBaseline,
  )
  await expect(
    withAuthorizedWorkspaceMutation(target, async (mutation) => {
      await prepareAuthorSave(mutation, inputs({ 'content/locale.json': {} }), async (view) => {
        f.disk.set('content/actors.json', 'foreign actors')
        await view.readText('content/actors.json')
      })
    }),
  ).rejects.toThrow('content/actors.json')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

// ─── GLM 并行测试分工（EDITOR-SAVE-RECOVERY-1）：身份/权限变化、重放再中断、提交后清理边界 ───

test('recovery refuses a directory that has since been rebound to another workspace', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow('stop actors')
  f.disk.resetChanges()
  // 原工作区记录消失、目录已登记到另一个 workspace：不可凭旧凭据重放。
  storage.bindings.delete(f.opened.workspace.workspaceId)
  const other = createLocalWorkspaceContext(f.opened.workspace.projectId, 'local-directory')
  storage.bindings.set(other.workspaceId, {
    ...other,
    name: 'other-window',
    handle: f.disk.dir,
    updatedAt: 2,
  })
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('另一个工作区')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  expect(receiptOf(f).phase).not.toBe('committed')
  expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('pending')
})

test('recovery refuses when the receipt workspace record drifted to another identity', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow('stop actors')
  f.disk.resetChanges()
  // 同 workspaceId 的登记记录被外部改为其他工程：身份冲突，零作者 IO。
  const drifted = {
    ...f.opened.workspace,
    projectId: 'drifted-project',
    name: 'drifted',
    handle: f.disk.dir,
    updatedAt: 3,
  }
  storage.bindings.set(f.opened.workspace.workspaceId, drifted)
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('已登记工作区冲突')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('a foreign change to the durable receipt mid-replay stops the save before further writes', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow('stop actors')
  f.disk.hooks.beforeClose = undefined
  f.disk.resetChanges()
  f.disk.hooks.afterClose = (path) => {
    // actors 之后才会重放的步骤：manifest 阶段外部改库（换合法 UUID），下一次持久化必须发现漂移。
    if (path === 'manifest.json') receiptOf(f).operationId = crypto.randomUUID()
  }
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('操作期间变化')
  f.disk.hooks.afterClose = undefined
  expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('pending')
  expect(authorChanges(f.disk).removes).toEqual([])
})

test('a crash between a step IO and its cursor commit resumes exactly from the durable prefix', async () => {
  const f = await fixture()
  let crashed = false
  f.disk.hooks.afterClose = (path) => {
    if (!crashed && path === 'content/scenes/start.json') {
      crashed = true
      throw new Error('crash after close')
    }
  }
  await expect(save(f)).rejects.toThrow('crash after close')
  f.disk.hooks.afterClose = undefined
  // 磁盘已领先凭据游标一步；重入必须先收编精确前缀，再继续剩余步骤。
  const sceneWrites = f.disk.changes.closes.filter((path) => path === 'content/scenes/start.json')
  await recoverInterruptedAuthorSave(f.disk.dir)
  assertRestored(f.disk)
  expect(f.disk.changes.closes.filter((path) => path === 'content/scenes/start.json').length).toBe(
    sceneWrites.length,
  )
})

test('replay survives two successive interruptions at different steps', async () => {
  const f = await fixture()
  let first = true
  f.disk.hooks.afterClose = (path) => {
    if (first && path === 'content/scenes/start.json') {
      first = false
      throw new Error('first crash')
    }
  }
  await expect(save(f)).rejects.toThrow('first crash')
  f.disk.hooks.afterClose = undefined
  f.disk.hooks.beforeClose = (path) => {
    if (path === 'content/actors.json') throw new Error('second crash')
  }
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('second crash')
  f.disk.hooks.beforeClose = undefined
  await recoverInterruptedAuthorSave(f.disk.dir)
  assertRestored(f.disk)
  expect(f.disk.changes.closes.filter((path) => path === 'content/actors.json')).toHaveLength(1)
})

test('exiting after the plan is sealed but before any publish still completes on reopen', async () => {
  const f = await fixture()
  const target = await authorizeBoundWorkspaceTarget(
    f.opened.workspace,
    f.disk.dir,
    f.opened.authorBaseline,
  )
  await withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, f.opened.workspace, f.disk.dir.name)
    await prepareAuthorSave(mutation, inputs(f.intended), validate, {
      catalogPath: f.opened.project.manifest.assets.catalog,
    })
    // 页面在 ready 后、执行前退出：不调用 commitAuthorSave。
  })
  expect(f.disk.files.has(PROJECT_SAVE_STATE_PATH)).toBe(false)
  f.disk.resetChanges()
  await recoverInterruptedAuthorSave(f.disk.dir)
  assertRestored(f.disk)
})

test('a forged committed marker cannot be adopted by a plan that never executed', async () => {
  const f = await fixture()
  const target = await authorizeBoundWorkspaceTarget(
    f.opened.workspace,
    f.disk.dir,
    f.opened.authorBaseline,
  )
  await withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, f.opened.workspace, f.disk.dir.name)
    await prepareAuthorSave(mutation, inputs(f.intended), validate, {
      catalogPath: f.opened.project.manifest.assets.catalog,
    })
  })
  const receipt = receiptOf(f)
  f.disk.set(
    PROJECT_SAVE_STATE_PATH,
    `${JSON.stringify({
      kind: 'type-pal-author-save',
      version: 1,
      operationId: receipt.operationId,
      phase: 'committed',
      planHash: receipt.planHash,
    })}\n`,
  )
  f.disk.resetChanges()
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('未经完成')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('forceSandbox never recovers a local project and treats committed local as nothing to do', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow('stop actors')
  f.disk.resetChanges()
  await expect(recoverInterruptedAuthorSave(f.disk.dir, { forceSandbox: true })).rejects.toThrow(
    '评审模式不能恢复源项目',
  )
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  f.disk.hooks.beforeClose = undefined
  await recoverInterruptedAuthorSave(f.disk.dir)
  assertRestored(f.disk)
  f.disk.resetChanges()
  await expect(recoverInterruptedAuthorSave(f.disk.dir, { forceSandbox: true })).resolves.toBeNull()
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('a committed reopen is cleanup-only and removes exactly its own verified staging', async () => {
  const f = await fixture()
  f.disk.hooks.beforeRemove = (path) => {
    if (path.includes('/blobs/')) throw new Error('cannot clean')
  }
  await expect(save(f)).resolves.toMatchObject({ cleanupWarning: expect.any(String) })
  f.disk.hooks.beforeRemove = undefined
  assertRestored(f.disk)
  const unknownPath = `.type-pal/save-recovery/${receiptOf(f).operationId}/unknown.json`
  f.disk.set(unknownPath, '{}\n')
  f.disk.resetChanges()
  const before = new Map(f.disk.files)
  const result = await recoverInterruptedAuthorSave(f.disk.dir)
  expect(result).toMatchObject({ kind: 'committed', operationId: receiptOf(f).operationId })
  expect(result?.cleanupWarning).toEqual(expect.any(String))
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  for (const [path, bytes] of before) {
    if (!path.startsWith('.type-pal/')) expect(f.disk.files.get(path)).toEqual(bytes)
  }
  expect(f.disk.files.has(unknownPath)).toBe(true)
  expect(
    [...f.disk.files.keys()].some(
      (path) => path.includes('/save-recovery/') && path.includes('/blobs/'),
    ),
  ).toBe(false)
})

test('a future step pre-written to its target value stops replay instead of continuing', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow('stop actors')
  f.disk.hooks.beforeClose = undefined
  f.disk.resetChanges()
  // 外部把尚未执行步骤的目标文件提前写成别的值：前缀校验必须拒绝，不收编。
  f.disk.set('content/actors.json', 'pre-written by another tool')
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('content/actors.json')
  expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('pending')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('a foreign edit landing right after our step close fails the post-write verification', async () => {
  const f = await fixture()
  f.disk.hooks.afterClose = (path) => {
    if (path === 'content/actors.json') f.disk.set(path, 'tampered after close')
  }
  await expect(save(f)).rejects.toThrow('content/actors.json')
  f.disk.hooks.afterClose = undefined
  expect(receiptOf(f).phase).not.toBe('committed')
  expect(f.disk.json(PROJECT_SAVE_STATE_PATH).phase).toBe('pending')
})

test('a committed operation with a forged pending marker refuses cleanup-only reopen', async () => {
  const f = await fixture()
  await save(f)
  assertRestored(f.disk)
  const receipt = receiptOf(f)
  f.disk.set(
    PROJECT_SAVE_STATE_PATH,
    `${JSON.stringify({
      kind: 'type-pal-author-save',
      version: 1,
      operationId: receipt.operationId,
      phase: 'pending',
      planHash: receipt.planHash,
    })}\n`,
  )
  f.disk.resetChanges()
  await expect(recoverInterruptedAuthorSave(f.disk.dir)).rejects.toThrow('已保存状态不符')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('cleanup resumes past staging files that an earlier partial cleanup already removed', async () => {
  const f = await fixture()
  f.disk.hooks.beforeRemove = (path) => {
    if (path.includes('/blobs/')) throw new Error('cannot clean')
  }
  await expect(save(f)).resolves.toMatchObject({ cleanupWarning: expect.any(String) })
  f.disk.hooks.beforeRemove = undefined
  const blobPaths = [...f.disk.files.keys()].filter(
    (path) => path.includes('/save-recovery/') && path.includes('/blobs/'),
  )
  expect(blobPaths.length).toBeGreaterThan(1)
  f.disk.files.delete(blobPaths[0]!)
  const result = await recoverInterruptedAuthorSave(f.disk.dir)
  expect(result?.cleanupWarning).toBeUndefined()
  expect(
    [...f.disk.files.keys()].some(
      (path) => path.includes('/save-recovery/') && path.includes('/blobs/'),
    ),
  ).toBe(false)
})

test('a committed receipt with a foreign on-disk state token blocks the next save', async () => {
  const f = await fixture()
  await save(f)
  const receipt = receiptOf(f)
  f.disk.set(
    PROJECT_SAVE_STATE_PATH,
    `${JSON.stringify({
      kind: 'type-pal-author-save',
      version: 1,
      operationId: crypto.randomUUID(),
      phase: 'committed',
      planHash: receipt.planHash,
    })}\n`,
  )
  f.disk.resetChanges()
  await expect(save(f)).rejects.toThrow('目录保存状态与原恢复凭据不一致')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('a consumed prepared token cannot commit a second time', async () => {
  const f = await fixture()
  const target = await authorizeBoundWorkspaceTarget(
    f.opened.workspace,
    f.disk.dir,
    f.opened.authorBaseline,
  )
  let token: PreparedAuthorSave | undefined
  await withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, f.opened.workspace, f.disk.dir.name)
    token = await prepareAuthorSave(mutation, inputs(f.intended), validate, {
      catalogPath: f.opened.project.manifest.assets.catalog,
    })
    await commitAuthorSave(token)
  })
  assertRestored(f.disk)
  f.disk.resetChanges()
  await expect(commitAuthorSave(token!)).rejects.toThrow('恢复计划未准备好或授权已消费')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('a new save cannot stack over an unfinished durable receipt', async () => {
  const f = await fixture()
  stopAtActors(f)
  await expect(save(f)).rejects.toThrow('stop actors')
  f.disk.hooks.beforeClose = undefined
  f.disk.resetChanges()
  await expect(save(f)).rejects.toThrow('项目有未完成的保存，请先完成恢复')
  expect(authorChanges(f.disk)).toEqual({ creates: [], closes: [], removes: [] })
  await recoverInterruptedAuthorSave(f.disk.dir)
  assertRestored(f.disk)
})
