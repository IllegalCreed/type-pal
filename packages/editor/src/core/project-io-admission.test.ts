/** Current project serialization/write boundaries; independent of GLM's open-identity slice. */
import type { AssetCatalogV1, CurrentManifest, StampTemplate } from '@type-pal/content'
import { fsaSource, loadAllProjectMaps } from '@type-pal/reforge'
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
  }
})

import { openLocalProject } from './open-local.js'
import {
  diffFiles,
  resumeOwnProjectSave,
  serializeProject,
  serializeProjectWithMapCopies,
  toEditorState,
  writeProject,
} from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import {
  authorizeBoundWorkspaceTarget,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.restoreAllMocks())

async function fixture(
  prepare?: (files: Record<string, unknown>, manifest: CurrentManifest) => void,
) {
  const files = await buildBlankProject('pio-admission')
  prepare?.(files, files['manifest.json'] as CurrentManifest)
  const disk = memoryAuthorDirectory(files)
  const opened = await openLocalProject(disk.dir)
  const context = createLocalWorkspaceContext(opened.project.manifest.id, 'local-directory')
  bindings.set(context.workspaceId, {
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    mode: context.mode,
    source: context.source,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  return {
    files,
    disk,
    opened,
    context,
    state,
    target: () => authorizeBoundWorkspaceTarget(context, disk.dir, opened.authorBaseline),
  }
}
type Disk = ReturnType<typeof memoryAuthorDirectory>
const authorPaths = (paths: string[]) =>
  paths.filter((p) => p !== '.type-pal' && !p.startsWith('.type-pal/'))
const authorSnapshot = (disk: Disk) =>
  [...disk.files]
    .filter(([path]) => authorPaths([path]).length)
    .map(([path, bytes]) => [path, Array.from(new Uint8Array(bytes))])
function expectNoAuthorIO(disk: Disk) {
  for (const paths of Object.values(disk.changes)) expect(authorPaths(paths)).toEqual([])
}

test('declared stamps must be loaded explicitly, and the loaded nonempty table survives serialization/reopen', async () => {
  const { opened, files, disk } = await fixture((files, manifest) => {
    const stamp: StampTemplate = {
      id: 'kept-stamp',
      name: 'Kept stamp',
      origin: 'authored',
      width: 1,
      height: 1,
      anchor: { row: 0, col: 0 },
      tilesetRefs: ['starter'],
      layers: [{ id: 'ground', name: 'Ground', tiles: [[0], [null]], sources: [[0], [null]] }],
      collision: [[null], [null]],
    }
    files[manifest.content.stamps!] = [stamp]
  })
  expect(opened.stamps).toHaveLength(1)
  expect(() => toEditorState(opened.project, opened.scenes)).toThrow('调用方未加载图章模板表')
  const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  const serialized = await serializeProjectWithMapCopies(state, fsaSource(disk.dir))
  const reopened = await openLocalProject(memoryAuthorDirectory({ ...files, ...serialized }).dir)
  expect(reopened.stamps).toEqual(opened.stamps)
})

test('a custom map-index path is legal, but no map body may overwrite that exact path', async () => {
  const { state, opened, files } = await fixture((files, manifest) => {
    const old = manifest.content.maps!
    const custom = 'content/map-catalog.json'
    files[custom] = files[old]
    delete files[old]
    manifest.content.maps = custom
  })
  const healthy = await serializeProjectWithMapCopies(state, opened.project.source)
  expect(
    (await openLocalProject(memoryAuthorDirectory({ ...files, ...healthy }).dir)).project.mapIndex,
  ).toEqual(state.mapIndex)
  // Unlike the default index path, this custom path is not rejected by validateMapIndex itself.
  state.mapIndex = structuredClone(state.mapIndex)
  state.mapIndex.maps[0]!.path = state.manifest.content.maps!
  expect(() => serializeProject(state)).toThrow('覆盖 map index 文件')
})

test('loaded map bodies not present in the index cannot be silently omitted from saved output', async () => {
  const { state, opened } = await fixture()
  const loaded = await loadAllProjectMaps(opened.project)
  const id = state.mapIndex.maps[0]!.id
  state.maps = loaded
  expect(() => serializeProject(state)).not.toThrow()
  state.maps = { ...loaded, 'unregistered-map': structuredClone(loaded[id]!) }
  expect(() => serializeProject(state)).toThrow('maps 存在未登记资产: unregistered-map')
})

test.each([
  'maps',
  'worldVariables',
] as const)('missing mandatory %s path is rejected before output is produced', async (key) => {
  const { state } = await fixture()
  expect(() => serializeProject(state)).not.toThrow()
  delete state.manifest.content[key]
  expect(() => serializeProject(state)).toThrow(
    key === 'maps' ? '项目缺 manifest.content.maps' : 'manifest 缺 worldVariables',
  )
})

test.each([
  'sharedScripts',
  'scenes',
] as const)('missing %s never becomes a committed current project, even if the serializer returns a partial set', async (key) => {
  const { disk, state, opened, context, target } = await fixture()
  const before = authorSnapshot(disk)
  delete state.manifest.content[key]
  // This is deliberately invalid current metadata, NOT a valid old-project round-trip.
  const serialized = await serializeProjectWithMapCopies(state, opened.project.source)
  await expect(writeProject(await target(), serialized)).rejects.toThrow(`manifest 缺 ${key}`)
  expect(authorSnapshot(disk)).toEqual(before)
  expectNoAuthorIO(disk)
  const receipt = authorSaveStorage.receipts.get(context.workspaceId)!
  expect(receipt.phase).toBe('staging')
  expect(receipt.planHash).toBeNull()
  expect(disk.files.has('.type-pal/save-state.json')).toBe(false)
})

test.each([
  'permission',
  'other-io',
] as const)('catalog %s failure after scope admission is propagated, never treated as a missing catalog', async (kind) => {
  const { disk, state, opened, target } = await fixture()
  const files = await serializeProjectWithMapCopies(state, opened.project.source)
  const before = authorSnapshot(disk)
  const catalogPath = state.manifest.assets.catalog
  const segments = catalogPath.split('/')
  const name = segments.pop()!
  let directory = disk.dir
  for (const segment of segments) directory = await directory.getDirectoryHandle(segment)
  const original = directory.getFileHandle.bind(directory)
  const reason =
    kind === 'permission'
      ? new DOMException('catalog permission denied', 'NotAllowedError')
      : new Error('catalog read failed')
  let armed = false,
    seen = 0
  const spy = vi.spyOn(directory, 'getFileHandle').mockImplementation(async (file, options) => {
    if (armed && file === name) {
      seen++
      throw reason
    }
    return original(file, options)
  })
  await expect(
    withAuthorizedWorkspaceMutation(await target(), async (mutation) => {
      armed = true
      return writeProject(mutation, files)
    }),
  ).rejects.toBe(reason)
  expect(seen).toBeGreaterThan(0)
  expect(authorSnapshot(disk)).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
  spy.mockRestore()
  await writeProject(await target(), files)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
})

test('a diff hint already matching the target catalog cannot suppress the required disk catalog write', async () => {
  const { disk, state, opened, target } = await fixture()
  const id = Object.keys(state.assetCatalog.assets)[0]!
  const catalogPath = state.manifest.assets.catalog
  state.assetCatalog = structuredClone(state.assetCatalog)
  state.assetCatalog.assets[id]!.label = 'Author label from this save'
  const files = await serializeProjectWithMapCopies(state, opened.project.source)
  const hint = new Map<string, string>()
  await diffFiles(new Map(), files, hint)
  expect((await diffFiles(hint, files)).write).toEqual([])
  expect(disk.json(catalogPath).assets[id].label).not.toBe('Author label from this save')
  await writeProject(await target(), files, { prevSnapshot: hint })
  expect(disk.changes.closes).toContain(catalogPath)
  expect(disk.json(catalogPath).assets[id].label).toBe('Author label from this save')
  expect(hint.get(catalogPath)).toBe(`${JSON.stringify(files[catalogPath], null, 2)}\n`)
  expect((await openLocalProject(disk.dir)).project.assetCatalog).toEqual(state.assetCatalog)
})

test.each([
  false,
  true,
])('own-page resume preserves committed data and cleanup warning=%s, then permits the next save', async (denyCleanup) => {
  const { disk, state, opened, context, target } = await fixture()
  const actorsPath = state.manifest.content.actors!
  state.actors[0]!.battler!.baseStats.maxHP = 237
  let interrupted = false
  disk.hooks.beforeClose = (path) => {
    if (path === actorsPath && !interrupted) {
      interrupted = true
      throw new Error('io interrupted')
    }
  }
  await expect(
    writeProject(await target(), await serializeProjectWithMapCopies(state, opened.project.source)),
  ).rejects.toThrow('io interrupted')
  expect(interrupted).toBe(true)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('pending')
  disk.hooks.beforeClose = undefined
  let cleanupAttempts = 0
  disk.hooks.beforeRemove = (path) => {
    if (path.startsWith('.type-pal/save-recovery/') && path.includes('/blobs/')) {
      cleanupAttempts++
      if (denyCleanup) throw new Error('cleanup denied')
    }
  }
  let recovering = 0
  const result = await resumeOwnProjectSave(context, disk.dir, opened.authorBaseline, () => {
    recovering++
  })
  expect(recovering).toBe(1)
  expect(cleanupAttempts).toBeGreaterThan(0)
  expect(result?.snapshot).toBeInstanceOf(Map)
  expect(JSON.parse(result!.snapshot.get(actorsPath)!)[0].battler.baseStats.maxHP).toBe(237)
  if (denyCleanup) expect(result?.cleanupWarning).toContain('cleanup denied')
  else expect(result?.cleanupWarning).toBeUndefined()
  expect(disk.json(actorsPath)[0].battler.baseStats.maxHP).toBe(237)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(authorSaveStorage.receipts.get(context.workspaceId)?.phase).toBe('committed')
  disk.hooks.beforeRemove = undefined
  state.actors[0]!.battler!.baseStats.maxHP = 238
  const next = await writeProject(
    await target(),
    await serializeProjectWithMapCopies(state, opened.project.source),
    { prevSnapshot: result!.snapshot },
  )
  expect(next.cleanupWarning).toBeUndefined()
  expect(
    (await openLocalProject(disk.dir)).project.actorsById[state.actors[0]!.id]!.battler!.baseStats
      .maxHP,
  ).toBe(238)
})

test.each([
  'json',
  'binary',
] as const)('partial %s writes preserve the complete current project without an input manifest/catalog', async (kind) => {
  const { disk, state, target } = await fixture()
  const path = kind === 'json' ? state.manifest.content.locale! : 'attachments/notes.bin'
  const value =
    kind === 'json'
      ? { ...state.locale, 'name.hero': 'Partial JSON save' }
      : new Uint8Array([7, 0, 255]).buffer
  const before = authorSnapshot(disk).filter(([key]) => key !== path)
  const result = await writeProject(await target(), { [path]: value })
  expect(authorPaths(disk.changes.closes)).toEqual([path])
  expect(authorSnapshot(disk).filter(([key]) => key !== path)).toEqual(before)
  expect([...result.snapshot.keys()]).toEqual([path])
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  const reopened = await openLocalProject(disk.dir)
  expect(reopened.project.manifest.id).toBe('pio-admission')
  if (kind === 'json') expect(reopened.project.locale['name.hero']).toBe('Partial JSON save')
  else expect(new Uint8Array(disk.files.get(path)!)).toEqual(new Uint8Array([7, 0, 255]))
})

test('partial asset writes still undergo the complete catalog hash check before any author IO', async () => {
  const good = await fixture()
  const catalog = good.files[good.state.manifest.assets.catalog] as AssetCatalogV1
  const record = Object.values(catalog.assets).find((record) => record.kind === 'tileset')!
  const original = await good.opened.project.source.readBytes(record.path)
  expect(original).toBeInstanceOf(ArrayBuffer)
  expect([...new Uint8Array(original).slice(0, 2)]).toEqual([0x1f, 0x8b])
  await writeProject(await good.target(), { [record.path]: original })
  expect(good.disk.json('.type-pal/save-state.json').phase).toBe('committed')
  const bad = await fixture()
  const corrupted = original.slice(0)
  const view = new Uint8Array(corrupted)
  expect(view.byteLength).toBeGreaterThan(0)
  view[0] = view[0]! ^ 1
  const before = authorSnapshot(bad.disk)
  await expect(writeProject(await bad.target(), { [record.path]: corrupted })).rejects.toThrow(
    '资源二进制与 catalog 不符',
  )
  expect(authorSnapshot(bad.disk)).toEqual(before)
  expectNoAuthorIO(bad.disk)
  expect(authorSaveStorage.receipts.get(bad.context.workspaceId)?.phase).toBe('staging')
  expect(authorSaveStorage.receipts.get(bad.context.workspaceId)?.planHash).toBeNull()
})
