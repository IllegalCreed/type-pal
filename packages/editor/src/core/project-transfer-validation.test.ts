/**
 * EDITOR-SAVE-RECOVERY-1 · GLM 并行资源校验测试分工。
 *
 * 真实调用 cloneFromPal / exportProjectZip / 正式校验器与保存 journal；仅替身环境边界：
 * FSA（memoryAuthorDirectory）、IndexedDB（memoryAuthorSaveStore / handle-store 记忆替身）、
 * 下载 DOM（node 环境最小 document 桩 + URL.createObjectURL 捕获）。
 *
 * 矩阵：克隆坏长度/同长异 hash/正确摘要但非 canonical gzip/maps 缺席（非法当前输入）；
 * ZIP 缺 catalog 声明/声明文件缺失/空目录；每项失败均断言零目标作者写入、零下载；
 * 同一 fixture 去掉坏字段作正控，防止“始终拒绝”冒充保护。
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
const ASSET_PATH = 'assets/migrated/tiles/glm-001.rle'

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

/**
 * 带一个 catalog 资产的合法种子；mutate 就地制造坏输入（catalog 与磁盘字节可对可错）。
 * 正控用 portrait（克隆深校验只对 tileset/battle-sprite 做 gzip/RLE 解码）；
 * 坏 gzip 用例用 tileset——clone 的魔数检查先于深解码。
 */
async function seedWithTileset(
  kind: 'portrait' | 'tileset' = 'tileset',
  mutate?: (files: Record<string, unknown>, catalog: AssetCatalogV1) => void | Promise<void>,
) {
  const files = await buildBlankProject('pal')
  const catalog = files['assets/index.json'] as AssetCatalogV1
  const payload = new Uint8Array(32)
  for (let index = 0; index < payload.length; index += 1) payload[index] = 0x1f
  payload[0] = 0x1f
  payload[1] = 0x8b
  const buffer = payload.buffer.slice(0) as ArrayBuffer
  catalog.assets['asset.glm.001'] =
    kind === 'portrait'
      ? {
          kind: 'portrait',
          path: ASSET_PATH,
          mediaType: 'image/png',
          bytes: buffer.byteLength,
          sha256: await sha256Hex(buffer),
          origin: { kind: 'legacy-migrated' },
        }
      : {
          kind: 'tileset',
          path: ASSET_PATH,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: buffer.byteLength,
          sha256: await sha256Hex(buffer),
          origin: { kind: 'legacy-migrated' },
        }
  files[ASSET_PATH] = buffer
  await mutate?.(files, catalog)
  return { files, source: memoryAuthorDirectory(files) }
}

async function cloneInto(source: ReturnType<typeof memoryAuthorDirectory>) {
  const target = memoryAuthorDirectory()
  const authorized = await authorizeFirstSaveTarget(
    createLocalWorkspaceContext('pal', 'pal-development-snapshot-clone'),
    target.dir,
  )
  return { target, run: () => cloneFromPal(fsaSource(source.dir), authorized, () => {}) }
}

function assertNoCommittedSave(target: ReturnType<typeof memoryAuthorDirectory>) {
  expect(target.files.has(STATE_PATH)).toBe(false)
  for (const receipt of authorSaveStorage.receipts.values())
    expect(receipt.phase).not.toBe('committed')
}

// ═══ 克隆资源校验失败路径 ═══

test('克隆正控：同一 fixture 未损坏时完整克隆成功（防止“始终拒绝”冒充保护）', async () => {
  const { source } = await seedWithTileset('portrait')
  const { target, run } = await cloneInto(source)
  await run()
  expect(target.files.has(ASSET_PATH)).toBe(true)
  expect(target.files.has('manifest.json')).toBe(true)
})

test('克隆资源长度与 catalog 不符：拒绝、零作者写入、不进入提交', async () => {
  const { source } = await seedWithTileset('tileset', (files) => {
    const good = files[ASSET_PATH] as ArrayBuffer
    files[ASSET_PATH] = good.slice(0, good.byteLength - 1)
  })
  const { target, run } = await cloneInto(source)
  await expect(run()).rejects.toThrow(/bytes\/sha256 与 catalog 不符/)
  expect(authorWrites(target)).toEqual([])
  assertNoCommittedSave(target)
})

test('克隆资源同长度但 hash 不符：拒绝、零作者写入、不进入提交', async () => {
  const { source } = await seedWithTileset('tileset', (files) => {
    const good = new Uint8Array(files[ASSET_PATH] as ArrayBuffer)
    good[good.length - 1]! ^= 0xff
    files[ASSET_PATH] = good.buffer.slice(0)
  })
  const { target, run } = await cloneInto(source)
  await expect(run()).rejects.toThrow(/bytes\/sha256 与 catalog 不符/)
  expect(authorWrites(target)).toEqual([])
  assertNoCommittedSave(target)
})

test('克隆资源摘要正确但非 canonical gzip：拒绝、零作者写入、不进入提交', async () => {
  const { source } = await seedWithTileset('tileset', async (files, catalog) => {
    const raw = new Uint8Array(32) // 全零：非 gzip 魔数，但 catalog 如实登记其长度/摘要
    const buffer = raw.buffer.slice(0) as ArrayBuffer
    files[ASSET_PATH] = buffer
    const record = catalog.assets['asset.glm.001']! as { bytes: number; sha256: string }
    record.bytes = buffer.byteLength
    record.sha256 = await sha256Hex(buffer)
  })
  const { target, run } = await cloneInto(source)
  await expect(run()).rejects.toThrow(/不是 canonical gzip/)
  expect(authorWrites(target)).toEqual([])
  assertNoCommittedSave(target)
})

test('manifest 缺地图索引声明是非法当前输入：克隆拒绝、零作者写入', async () => {
  const { source } = await seedWithTileset('tileset', (files) => {
    delete (files['manifest.json'] as { content: Record<string, unknown> }).content.maps
  })
  const { target, run } = await cloneInto(source)
  await expect(run()).rejects.toThrow(/缺 maps 路径|地图索引/)
  expect(authorWrites(target)).toEqual([])
  assertNoCommittedSave(target)
})

// ═══ ZIP 导出校验失败路径 ═══

test('导出正控：合法项目一次下载且命名正确', async () => {
  const { source } = await seedWithTileset()
  const count = await exportProjectZip(source.dir, 'pal')
  expect(count).toBeGreaterThan(0)
  expect(clicks).toBe(1)
  expect(downloads[0]?.name).toBe('pal.zip')
})

test('manifest 缺 assets.catalog 声明：拒绝导出、零下载、源目录不被写删', async () => {
  const { files, source } = await seedWithTileset('tileset', (files) => {
    delete (files['manifest.json'] as { assets: Record<string, unknown> }).assets.catalog
  })
  void files
  const before = new Map(source.files)
  await expect(exportProjectZip(source.dir, 'pal')).rejects.toThrow(/缺 assets\.catalog/)
  expect(clicks).toBe(0)
  expect(downloads).toHaveLength(0)
  expect(source.files).toEqual(before)
})

test('声明的 catalog 文件缺失：拒绝导出、零下载', async () => {
  const { files, source } = await seedWithTileset('tileset', (files) => {
    delete files['assets/index.json']
  })
  void files
  await expect(exportProjectZip(source.dir, 'pal')).rejects.toThrow(/assets\/index\.json/)
  expect(clicks).toBe(0)
  expect(downloads).toHaveLength(0)
})

test('空目录：拒绝导出、零下载', async () => {
  const empty = memoryAuthorDirectory()
  await expect(exportProjectZip(empty.dir, 'pal')).rejects.toThrow(/文件夹是空的/)
  expect(clicks).toBe(0)
  expect(downloads).toHaveLength(0)
})
