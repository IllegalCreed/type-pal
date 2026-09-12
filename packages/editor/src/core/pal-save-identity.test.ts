/** PAL写侧身份/指纹边界；仅替换存储边界，授权、锁、loader和writer均为生产代码。 */
import { fsaSource } from '@type-pal/reforge'
import { beforeEach, expect, test, vi } from 'vitest'
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
      bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
    },
  }
})
beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})

import { openLocalProject } from './open-local.js'
import { serializeProjectWithMapCopies, toEditorState, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import {
  createPalDevelopmentWorkspaceContext,
  createSandboxWorkspaceContext,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  SANDBOX_WORKSPACE_MARKER_PATH,
  sandboxMarkerFor,
} from './workspace-context.js'
import {
  assertPalDevelopmentDirectory,
  authorizeBoundWorkspaceTarget,
  inspectWorkspaceMetadata,
} from './workspace-persistence.js'

async function palFixture() {
  const files = await buildBlankProject('pal')
  files[PAL_DEVELOPMENT_SENTINEL_PATH] = {
    kind: 'type-pal-editor-pal-development',
    version: 1,
    projectId: 'pal',
    workspaceId: crypto.randomUUID(),
  }
  // 独立可信源固定初始字节；不能用被修改的目标自己给自己签发新proof。
  const trusted = memoryAuthorDirectory(files)
  const context = await createPalDevelopmentWorkspaceContext(fsaSource(trusted.dir))
  const disk = memoryAuthorDirectory(files)
  const opened = await openLocalProject(disk.dir)
  bindings.set(context.workspaceId, {
    ...context,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  const authorize = () => authorizeBoundWorkspaceTarget(context, disk.dir, opened.authorBaseline)
  return { files, trusted, context, disk, opened, authorize }
}

const snapshot = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  [...disk.files].map(([path, bytes]) => [path, Array.from(new Uint8Array(bytes))])
function expectUntouched(disk: ReturnType<typeof memoryAuthorDirectory>, before: unknown) {
  expect(snapshot(disk)).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
}

test('PAL合法保存推进本会话指纹；重开作者基线后可继续保存且身份不降级', async () => {
  const { context, disk, opened, authorize } = await palFixture()
  const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  state.actors[0]!.battler!.baseStats.maxHP = 237
  state.manifest = { ...state.manifest, name: 'PAL第一次编辑' }
  expect(context.palProof!.paths).toContain('manifest.json')
  await writeProject(
    await authorize(),
    await serializeProjectWithMapCopies(state, opened.project.source),
  )
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(disk.json(state.manifest.content.actors!).at(0).battler.baseStats.maxHP).toBe(237)

  const reopened = await openLocalProject(disk.dir)
  const next = toEditorState(reopened.project, reopened.scenes, {}, {}, reopened.stamps)
  next.actors[0]!.battler!.baseStats.maxHP = 238
  next.manifest = { ...next.manifest, name: 'PAL第二次编辑' }
  await writeProject(
    await authorizeBoundWorkspaceTarget(context, disk.dir, reopened.authorBaseline),
    await serializeProjectWithMapCopies(next, reopened.project.source),
  )
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).resolves.toBeUndefined()
  expect(disk.json(next.manifest.content.actors!).at(0).battler.baseStats.maxHP).toBe(238)
  expect(disk.json('manifest.json').name).toBe('PAL第二次编辑')
  expect(bindings.get(context.workspaceId)?.mode).toBe('pal-development')
  expect(context.persistencePolicy).toBe('pal-bound')
})

test('双标记均能合法解析，但公开绑定授权必须拒绝，不覆盖任何文件', async () => {
  const { disk, authorize } = await palFixture()
  await expect(authorize()).resolves.toBeTruthy()
  disk.set(
    SANDBOX_WORKSPACE_MARKER_PATH,
    sandboxMarkerFor(createSandboxWorkspaceContext('pal', 'ui-samples')),
  )
  const metadata = await inspectWorkspaceMetadata(disk.dir)
  expect(metadata.sandbox.kind).toBe('valid')
  expect(metadata.palDevelopment.kind).toBe('valid')
  const before = snapshot(disk)
  disk.resetChanges()
  await expect(authorize()).rejects.toThrow('目录同时含沙盒 marker 与 PAL 开发 sentinel')
  expectUntouched(disk, before)
})

test.each([
  'missing',
  'invalid',
  'rebound',
] as const)('PAL目录验证拒绝sentinel %s；同一合法目录正控通过', async (kind) => {
  const { disk, context } = await palFixture()
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).resolves.toBeUndefined()
  const marker = disk.json(PAL_DEVELOPMENT_SENTINEL_PATH)
  if (kind === 'missing') disk.files.delete(PAL_DEVELOPMENT_SENTINEL_PATH)
  else
    disk.set(PAL_DEVELOPMENT_SENTINEL_PATH, {
      ...marker,
      ...(kind === 'invalid' ? { version: 2 } : { workspaceId: crypto.randomUUID() }),
    })
  const before = snapshot(disk)
  disk.resetChanges()
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).rejects.toThrow(
    kind === 'missing'
      ? 'sentinel 缺失'
      : kind === 'invalid'
        ? 'sentinel 无效'
        : 'sentinel 与当前会话不一致',
  )
  expectUntouched(disk, before)
})

test.each([
  'missing',
  'invalid-json',
  'changed-json',
] as const)('PAL受控JSON %s在真实指纹读取拒绝，不能以目标新字节重建授权', async (kind) => {
  const { disk, context, authorize } = await palFixture()
  await expect(authorize()).resolves.toBeTruthy()
  const path = 'manifest.json'
  expect(context.palProof!.paths).toContain(path)
  if (kind === 'missing') disk.files.delete(path)
  else if (kind === 'invalid-json') disk.set(path, '{')
  else {
    disk.set(path, { ...disk.json(path), name: '外部修改的标题' })
  }
  const before = snapshot(disk)
  disk.resetChanges()
  await expect(authorize()).rejects.toThrow(
    kind === 'missing'
      ? '指纹文件缺失'
      : kind === 'invalid-json'
        ? '指纹文件无效'
        : '关键快照与本次会话预期不一致',
  )
  expectUntouched(disk, before)
})

test('已取得target后外部修改PAL指纹文件，writer仍在创建恢复凭据前拒绝', async () => {
  const { disk, opened, authorize } = await palFixture()
  const target = await authorize()
  const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  const inputs = await serializeProjectWithMapCopies(state, opened.project.source)
  disk.set('manifest.json', { ...disk.json('manifest.json'), name: '授权后的外部标题' })
  const before = snapshot(disk)
  disk.resetChanges()
  await expect(writeProject(target, inputs)).rejects.toThrow('关键快照与本次会话预期不一致')
  expectUntouched(disk, before)
})

test('PAL指纹之外的人物表仍受作者基线保护，不因结构指纹未变而允许覆盖', async () => {
  const { disk, opened, context, authorize } = await palFixture()
  const target = await authorize()
  const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  const inputs = await serializeProjectWithMapCopies(state, opened.project.source)
  const path = state.manifest.content.actors!
  expect(context.palProof!.paths).not.toContain(path)
  const actors = disk.json(path)
  actors[0].battler.baseStats.maxHP = 777
  disk.set(path, actors)
  await expect(assertPalDevelopmentDirectory(context, disk.dir)).resolves.toBeUndefined()
  const before = snapshot(disk)
  disk.resetChanges()
  await expect(writeProject(target, inputs)).rejects.toThrow('项目文件已在其他位置修改')
  expectUntouched(disk, before)
})

test.each([
  'missing',
  'different-project',
  'different-mode',
] as const)('当前绑定记录%s拒绝PAL保存；不以projectId相同收编错误identity', async (kind) => {
  const { context, disk, authorize } = await palFixture()
  await expect(authorize()).resolves.toBeTruthy()
  const record = bindings.get(context.workspaceId)!
  if (kind === 'missing') bindings.delete(context.workspaceId)
  else
    bindings.set(context.workspaceId, {
      ...record,
      ...(kind === 'different-project'
        ? { projectId: 'another-project' }
        : { mode: 'local-project' }),
    })
  const before = snapshot(disk)
  disk.resetChanges()
  await expect(authorize()).rejects.toThrow(
    kind === 'missing' ? '没有已登记的绑定目录' : '当前工作区与已登记目录 identity 不一致',
  )
  expectUntouched(disk, before)
})
