/**
 * EDITOR-SAVE-RECOVERY-1 · GLM 并行资源校验测试分工（R1–R3 返工版）。
 *
 * 真实调用 cloneFromPal / exportProjectZip / 正式校验器与保存 journal；仅替身环境边界：
 * FSA（memoryAuthorDirectory）、IndexedDB（memoryAuthorSaveStore / handle-store 记忆替身）、
 * 下载 DOM（node 环境最小 document 桩 + URL.createObjectURL 捕获）。
 *
 * R1：正控使用 buildBlankProject 自带的**真实合法 tileset**（generated starter，真实 gzip/RLE），
 * 失败用例只改动该资产的磁盘字节或对应 catalog 记录，同 kind/格式/路径合同。
 * R2：失败用例断言凭据若存在只能是 staging 且未封存（planHash null）、无 save-state、
 * 进度从未进入 writing、未报告落盘完成。
 * R3：ZIP 三种拒绝均对比源目录前后快照并断言 fixture.changes 全空（零创建/关闭/删除）。
 */
import type { AssetCatalogV1 } from '@type-pal/content'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  loadWorkspaceRecord: async () => null,
  findWorkspaceRecordByHandle: async () => null,
  saveWorkspaceHandleUnderLock: async () => undefined,
}))
beforeEach(() => authorSaveStorage.receipts.clear())

import { fsaSource } from '@type-pal/reforge'
import { sha256Hex } from './binary-signature.js'
import { cloneFromPal } from './clone.js'
import { exportProjectZip } from './export-zip.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import { authorizeFirstSaveTarget } from './workspace-persistence.js'

const STATE_PATH = '.type-pal/save-state.json'
/** buildBlankProject 自带的合法 tileset：真实 gzip/RLE，catalog 登记 tileset.generated.starter。 */
const TILESET_PATH = 'assets/generated/tilesets/starter.rle'
const TILESET_ID = 'tileset.generated.starter'

// ── 下载 DOM 边界（node 环境最小桩） ──
const downloads: { blob: Blob; name: string }[] = []
let clicks = 0
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL
beforeEach(() => {
  downloads.length = 0
  clicks = 0
  URL.createObjectURL = (blob: Blob) => {
    downloads.push({ blob, name: '' })
    return 'blob:transfer-validation'
  }
  URL.revokeObjectURL = () => {}
  vi.stubGlobal('document', {
    createElement: () => {
      const anchor = {
        href: '',
        download: '',
        click: () => {
          clicks += 1
          const last = downloads[downloads.length - 1]
          if (last) last.name = anchor.download
        },
      }
      return anchor
    },
  })
})
afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
  vi.unstubAllGlobals()
})

const authorWrites = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  [...disk.changes.creates, ...disk.changes.closes, ...disk.changes.removes].filter(
    (path) => path !== '.type-pal' && !path.startsWith('.type-pal/'),
  )

/** 合法种子 = 原样 buildBlankProject（含真实 tileset）；mutate 每次只制造一个目标坏条件。 */
async function seed(
  mutate?: (files: Record<string, unknown>, catalog: AssetCatalogV1) => void | Promise<void>,
) {
  const files = await buildBlankProject('pal')
  const catalog = files['assets/index.json'] as AssetCatalogV1
  await mutate?.(files, catalog)
  return { files, source: memoryAuthorDirectory(files) }
}

async function cloneInto(source: ReturnType<typeof memoryAuthorDirectory>) {
  const target = memoryAuthorDirectory()
  const authorized = await authorizeFirstSaveTarget(
    createLocalWorkspaceContext('pal', 'pal-development-snapshot-clone'),
    target.dir,
  )
  const progress: Array<[number, number, string]> = []
  return {
    target,
    progress,
    run: () =>
      cloneFromPal(fsaSource(source.dir), authorized, (done, total, phase) =>
        progress.push([done, total, phase]),
      ),
  }
}

/** R2：目标凭据若存在只能是未封存的 staging；无 save-state；从未进入 writing/未报告完成。 */
function assertNeverSealedOrCompleted(
  target: ReturnType<typeof memoryAuthorDirectory>,
  progress: Array<[number, number, string]>,
) {
  expect(target.files.has(STATE_PATH)).toBe(false)
  for (const receipt of authorSaveStorage.receipts.values()) {
    expect(receipt.phase).toBe('staging')
    expect(receipt.planHash).toBeNull()
  }
  expect(progress.filter(([, , phase]) => phase === 'writing')).toEqual([])
}

// ═══ 克隆资源校验失败路径 ═══

test('克隆正控：原样合法项目（真实 tileset）完整克隆并提交，字节逐份复制', async () => {
  const { files, source } = await seed()
  const { target, progress, run } = await cloneInto(source)
  await run()
  expect(target.files.has(TILESET_PATH)).toBe(true)
  expect(target.files.get(TILESET_PATH)).toEqual(files[TILESET_PATH])
  expect(target.files.has('manifest.json')).toBe(true)
  expect(target.json(STATE_PATH).phase).toBe('committed')
  expect(progress.at(-1)).toEqual([progress.at(-1)![0], progress.at(-1)![1], 'writing'])
})

test('克隆资源长度与 catalog 不符：拒绝、零作者写入、未封存未报告完成', async () => {
  const { source } = await seed((files) => {
    const good = files[TILESET_PATH] as ArrayBuffer
    files[TILESET_PATH] = good.slice(0, good.byteLength - 1)
  })
  const { target, progress, run } = await cloneInto(source)
  await expect(run()).rejects.toThrow(/bytes\/sha256 与 catalog 不符/)
  expect(authorWrites(target)).toEqual([])
  assertNeverSealedOrCompleted(target, progress)
})

test('克隆资源同长度但 hash 不符：拒绝、零作者写入、未封存未报告完成', async () => {
  const { source } = await seed((files) => {
    const good = new Uint8Array(files[TILESET_PATH] as ArrayBuffer)
    good[good.length - 1]! ^= 0xff
    files[TILESET_PATH] = good.buffer.slice(0)
  })
  const { target, progress, run } = await cloneInto(source)
  await expect(run()).rejects.toThrow(/bytes\/sha256 与 catalog 不符/)
  expect(authorWrites(target)).toEqual([])
  assertNeverSealedOrCompleted(target, progress)
})

test('克隆资源摘要正确但非 canonical gzip：拒绝、零作者写入、未封存未报告完成', async () => {
  const { source } = await seed(async (files, catalog) => {
    const raw = new Uint8Array(32) // 非 gzip 魔数；catalog 如实登记其长度/摘要
    const buffer = raw.buffer.slice(0) as ArrayBuffer
    files[TILESET_PATH] = buffer
    const record = catalog.assets[TILESET_ID]! as { bytes: number; sha256: string }
    record.bytes = buffer.byteLength
    record.sha256 = await sha256Hex(buffer)
  })
  const { target, progress, run } = await cloneInto(source)
  await expect(run()).rejects.toThrow(/不是 canonical gzip/)
  expect(authorWrites(target)).toEqual([])
  assertNeverSealedOrCompleted(target, progress)
})

test('manifest 缺地图索引声明是非法当前输入：克隆拒绝、零作者写入、未封存未报告完成', async () => {
  const { source } = await seed((files) => {
    delete (files['manifest.json'] as { content: Record<string, unknown> }).content.maps
  })
  const { target, progress, run } = await cloneInto(source)
  await expect(run()).rejects.toThrow(/缺 maps 路径|地图索引/)
  expect(authorWrites(target)).toEqual([])
  assertNeverSealedOrCompleted(target, progress)
})

// ═══ ZIP 导出校验失败路径 ═══

/** R3：导出拒绝必须同时证明源目录零写删：前后快照一致 + fixture 变更记录全空。 */
async function assertExportRejects(
  source: ReturnType<typeof memoryAuthorDirectory>,
  pattern: RegExp,
) {
  const before = new Map(source.files)
  source.resetChanges()
  await expect(exportProjectZip(source.dir, 'pal')).rejects.toThrow(pattern)
  expect(clicks).toBe(0)
  expect(downloads).toHaveLength(0)
  expect(source.files).toEqual(before)
  expect(source.changes).toEqual({ creates: [], closes: [], removes: [] })
}

test('导出正控：原样合法项目一次下载且命名正确', async () => {
  const { source } = await seed()
  const count = await exportProjectZip(source.dir, 'pal')
  expect(count).toBeGreaterThan(0)
  expect(clicks).toBe(1)
  expect(downloads[0]?.name).toBe('pal.zip')
})

test('manifest 缺 assets.catalog 声明：拒绝导出、零下载、源目录零写删', async () => {
  const { source } = await seed((files) => {
    delete (files['manifest.json'] as { assets: Record<string, unknown> }).assets.catalog
  })
  await assertExportRejects(source, /缺 assets\.catalog/)
})

test('声明的 catalog 文件缺失：拒绝导出、零下载、源目录零写删', async () => {
  const { source } = await seed((files) => {
    delete files['assets/index.json']
  })
  await assertExportRejects(source, /assets\/index\.json/)
})

test('空目录：拒绝导出、零下载、零写删', async () => {
  const empty = memoryAuthorDirectory()
  await assertExportRejects(empty, /文件夹是空的/)
})
