/**
 * EDITOR-SAVE-RECOVERY-1 · preflight-r1 · A组：保存前校验（P01–P05）。
 * preflightProjectWriteSet 为真实生产校验器；writeProject 为真实 writer。
 * 失败输入均来自合法 seed 资产的单字段/单字节破坏，正控为同条件合法输入。
 */
import { beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'
import {
  preflightAssets,
  singleAssetInput,
  withRecord,
} from './__tests__/save-preflight-fixture.js'

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
  saveWorkspaceHandle: async () => undefined,
  saveWorkspaceHandleUnderLock: async (
    _lock: unknown,
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  },
}))
beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})

import { loadAllAuthorScenes } from '@type-pal/reforge'
import { finishOpen } from './open-actions.js'
import {
  preflightProjectWriteSet,
  serializeProjectWithMapCopies,
  toEditorState,
  writeProject,
} from './project-io.js'
import { buildBlankProject } from './seed.js'
import { authorizeBoundWorkspaceTarget } from './workspace-persistence.js'

const IO_TRACK = () =>
  ({ creates: [], closes: [], removes: [] }) as {
    creates: string[]
    closes: string[]
    removes: string[]
  }

test('P01: 大小不符独立拒绝（摘要保持相符）；合法原字节正控通过', async () => {
  const assets = await preflightAssets()
  const { files, catalogPath } = await singleAssetInput(assets.sprite)
  await expect(preflightProjectWriteSet(files)).resolves.toBeUndefined()

  const sizeMismatch = withRecord(files, catalogPath, {
    bytes: (files[assets.sprite.path] as ArrayBuffer).byteLength + 1,
  })
  await expect(preflightProjectWriteSet(sizeMismatch)).rejects.toThrow(
    `资源二进制与 catalog 不符: ${assets.sprite.path}`,
  )
})

test('P01: 摘要不符独立拒绝（大小保持相符；同输入合法对照通过）', async () => {
  const assets = await preflightAssets()
  const { files, catalogPath } = await singleAssetInput(assets.sprite)
  await expect(preflightProjectWriteSet(files)).resolves.toBeUndefined()
  const hashMismatch = withRecord(files, catalogPath, {
    sha256: 'f'.repeat(64),
  })
  await expect(preflightProjectWriteSet(hashMismatch)).rejects.toThrow(
    `资源二进制与 catalog 不符: ${assets.sprite.path}`,
  )
})

test('P02: tileset 非 canonical gzip（魔数不符，摘要如实更新）独立于 RLE 损坏拒绝', async () => {
  const assets = await preflightAssets()
  const { files, catalogPath } = await singleAssetInput(assets.tileset)
  // 同 kind 合法 tileset 预检正控。
  await expect(preflightProjectWriteSet(files)).resolves.toBeUndefined()
  const { sha256Hex } = await import('./binary-signature.js')
  // 非 gzip：全 0xFF 首字节破坏魔数，bytes/sha 如实更新 → 先被魔数检查拒绝。
  const notGzip = new ArrayBuffer(32)
  new Uint8Array(notGzip).fill(0xff)
  const badMagic = withRecord(files, catalogPath, {
    bytes: notGzip.byteLength,
    sha256: await sha256Hex(notGzip),
  })
  const magicInput = { ...badMagic, [assets.tileset.path]: notGzip }
  await expect(preflightProjectWriteSet(magicInput)).rejects.toThrow(
    `瓦片集资源不是 canonical gzip: ${assets.tileset.path}`,
  )

  // gzip 魔数合法但内部 RLE 损坏：真实 gzip 包裹垃圾 deflate 尾 → 摘要如实更新后被 RLE 解析拒绝。
  const garbage = new Uint8Array(32)
  garbage.fill(0x00)
  const { compressGzip } = await import('@type-pal/reforge')
  const gz = await compressGzip(garbage)
  const gzBuffer = new ArrayBuffer(gz.byteLength)
  new Uint8Array(gzBuffer).set(gz)
  const badRle = withRecord(files, catalogPath, {
    bytes: gzBuffer.byteLength,
    sha256: await sha256Hex(gzBuffer),
  })
  const rleInput = { ...badRle, [assets.tileset.path]: gzBuffer }
  await expect(preflightProjectWriteSet(rleInput)).rejects.toThrow(
    `瓦片集资源 RLE 损坏: ${assets.tileset.path}`,
  )
})

test('P03: 删除 catalog 仍引用的资源拒绝；解除引用后删除合法通过', async () => {
  const assets = await preflightAssets()
  const { files, catalogPath } = await singleAssetInput(assets.sprite)
  const withoutAsset = { ...files }
  delete withoutAsset[assets.sprite.path]
  await expect(preflightProjectWriteSet(withoutAsset)).resolves.toBeUndefined()
  // 删除被引用资源（磁盘存在但本次输入不再包含）→ 拒绝。
  await expect(preflightProjectWriteSet(withoutAsset, [assets.sprite.path])).rejects.toThrow(
    `保存不能删除当前 catalog 仍引用的资源：${assets.sprite.path}`,
  )
  // 解除引用（catalog 移除该记录）后同一删除 → 合法通过。
  const freed = structuredClone(files[catalogPath]) as { assets: Record<string, unknown> }
  delete freed.assets[assets.sprite.id]
  const unrefInput = { ...files, [catalogPath]: freed }
  delete (unrefInput as Record<string, unknown>)[assets.sprite.path]
  await expect(preflightProjectWriteSet(unrefInput, [assets.sprite.path])).resolves.toBeUndefined()
})

test('P04: 非 catalog 管理的附属二进制不参与资源记录校验（合法部分写集保留）', async () => {
  const assets = await preflightAssets()
  const { files } = await singleAssetInput(assets.sprite)
  // 附属二进制：路径不在 catalog 记录中 → 不校验 bytes/sha，也不得被当作非法 pending。
  const ancillary = new ArrayBuffer(16)
  new Uint8Array(ancillary).fill(0xab)
  const ancillaryPath = 'assets/raw-notes/extra.bin'
  const withAncillary = { ...files, [ancillaryPath]: ancillary }
  await expect(preflightProjectWriteSet(withAncillary)).resolves.toBeUndefined()
})

test('P05 正控: 同项目同 kind 合法新精灵经真实 writer 完整提交并落盘', async () => {
  const disk = memoryAuthorDirectory(await buildBlankProject('preflight-p05'))
  const opened = await finishOpen(disk.dir)
  bindings.set(opened.workspace.workspaceId, {
    ...opened.workspace,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  const state = toEditorState(opened.project, await loadAllAuthorScenes(opened.project), {}, {}, [])
  const assets = await preflightAssets()
  const good = assets.sprite.bytes
  const { sha256Hex } = await import('./binary-signature.js')
  state.assetCatalog = structuredClone(state.assetCatalog)
  state.assetCatalog.assets['p05-target-sprite'] = {
    ...state.assetCatalog.assets['sprite.generated.starter']!,
    path: 'assets/generated/sprites/p05-target.rle',
    bytes: good.byteLength,
    sha256: await sha256Hex(good),
  }
  state.assetBlobs = { 'assets/generated/sprites/p05-target.rle': good }
  const goodInputs = (await serializeProjectWithMapCopies(state, opened.project.source)) as Record<
    string,
    unknown
  >
  disk.resetChanges()
  const saved = await writeProject(
    await authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
    goodInputs,
  )
  expect(saved).toBeTruthy()
  expect(new Uint8Array(disk.files.get('assets/generated/sprites/p05-target.rle')!)).toEqual(
    new Uint8Array(good),
  )
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
})

test('P05 负控: 序列化后输入仅 catalog bytes+1（kind/字节合法）→ 真实 writeProject 拒绝且零凭据零副作用', async () => {
  // 独立新鲜 fixture（不与正控共用目录/授权/凭据），同 seed 基线保证同构。
  const disk = memoryAuthorDirectory(await buildBlankProject('preflight-p05'))
  const opened = await finishOpen(disk.dir)
  bindings.set(opened.workspace.workspaceId, {
    ...opened.workspace,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  const state = toEditorState(opened.project, await loadAllAuthorScenes(opened.project), {}, {}, [])
  const assets = await preflightAssets()
  const bytes = assets.sprite.bytes
  const { sha256Hex } = await import('./binary-signature.js')
  state.assetCatalog = structuredClone(state.assetCatalog)
  state.assetCatalog.assets['p05-target-sprite'] = {
    ...state.assetCatalog.assets['sprite.generated.starter']!,
    path: 'assets/generated/sprites/p05-target.rle',
    bytes: bytes.byteLength,
    sha256: await sha256Hex(bytes),
  }
  state.assetBlobs = { 'assets/generated/sprites/p05-target.rle': bytes }
  // 第一步：合法 state 正常序列化，确认输出含目标 ArrayBuffer 且 catalog 相符。
  const legal = (await serializeProjectWithMapCopies(state, opened.project.source)) as Record<
    string,
    unknown
  >
  expect(legal['assets/generated/sprites/p05-target.rle']).toBeInstanceOf(ArrayBuffer)
  expect(new Uint8Array(legal['assets/generated/sprites/p05-target.rle'] as ArrayBuffer)).toEqual(
    new Uint8Array(bytes),
  )
  // 第二步：克隆序列化结果，仅把目标记录 bytes+1（kind 与实际字节保持合法）。
  const badInputs = structuredClone(legal) as Record<string, unknown>
  const catalogPath = state.manifest.assets.catalog
  const clonedCatalog = badInputs[catalogPath] as {
    assets: Record<string, { bytes: number }>
  }
  clonedCatalog.assets['p05-target-sprite']!.bytes = bytes.byteLength + 1
  // 第三步：坏输入直接进入 writeProject，断言在 catch 之外。
  const byteSnapshot = () =>
    [...disk.files].map(([path, value]) => [path, Array.from(new Uint8Array(value))])
  const before = byteSnapshot()
  disk.resetChanges()
  await expect(
    writeProject(
      await authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
      badInputs,
    ),
  ).rejects.toThrow('资源二进制与 catalog 不符')
  // 零副作用：整份快照逐字节不变 + 全 IO 轨迹为空。
  expect(byteSnapshot()).toEqual(before)
  expect(disk.changes).toEqual(IO_TRACK())
  // 直接断言：本工作区无任何恢复凭据（不靠空循环冒充检查）。
  expect(authorSaveStorage.receipts.get(opened.workspace.workspaceId)).toBeUndefined()
  expect(authorSaveStorage.receipts.size).toBe(0)
})
