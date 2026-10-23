/**
 * S5 tileset gzip 运输一致性（六个固定原盘样本）。
 *
 * 独立 oracle 是从 data/raw/GOP.MKF 的 offset 表直接截取的 chunk 字节；
 * 与 extracted/data/tileset/{N}.rle 经运行时 decompressGzip 还原的字节比较。
 * 不用同一 parser 对相等字节再做像素自比，也不据此认证 RLE 解码算法或全部地图。
 *
 * 注意:game 包不可依赖 pal-extract,所以测试内联了一个极简的 MKF chunk 读取
 * (MKF 格式 = N+1 个 u32 LE offset 头 + 子文件),仅用于读真值源做对比。
 *
 * 可选整组输入缺席时 skip + warn，且不读取缺席文件；部分资源缺失仍失败。
 * 此约定仅限本套件，不代表整个仓库 check 无需 PAL 数据。
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { decompressGzip } from './tileset-blob.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// src/assets → src → game → packages → repo root
const REPO_ROOT = resolve(HERE, '../../../..')
const RAW_GOP = resolve(REPO_ROOT, 'data/raw/GOP.MKF')
const EXTRACTED_BLOB_DIR = resolve(REPO_ROOT, 'data/extracted/data/tileset')

// 保留历史固定样本；未据这些编号证明场景类型或全量地图覆盖。
const SAMPLE_MAP_NUMS = [1, 6, 12, 50, 100, 200]

/**
 * 极简 MKF chunk 读取(仅测试用)。MKF 格式:
 *   头 = N+1 个 u32 LE offset;chunkCount = head[0]/4 - 1;chunk i = buffer[offset[i]..offset[i+1]]
 * 参考 reference/sdlpal/palcommon.c::PAL_MKFReadChunk。
 */
function readMkfChunk(buffer: Uint8Array, index: number): Uint8Array {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const start = view.getUint32(index * 4, true)
  const end = view.getUint32((index + 1) * 4, true)
  return buffer.subarray(start, end)
}

const hasData = existsSync(RAW_GOP) && existsSync(EXTRACTED_BLOB_DIR)

describe.skipIf(!hasData)('S5 tileset blob 运输一致性(真实 GOP.MKF vs extracted blob)', () => {
  let gopBuffer: Uint8Array
  // 跳过的 suite 不执行 beforeAll；所有固定样本仍正常注册为 skipped。
  beforeAll(() => {
    gopBuffer = new Uint8Array(readFileSync(RAW_GOP))
  })

  for (const mapNum of SAMPLE_MAP_NUMS) {
    const blobPath = resolve(EXTRACTED_BLOB_DIR, `${mapNum}.rle`)

    it(`mapNum=${mapNum}: blob 解压字节 == 原 GOP.MKF chunk`, async () => {
      expect(existsSync(blobPath)).toBe(true)

      // 独立 MKF offset reader 提供期望字节，不调用提取器或 shared RLE parser。
      const rawChunk = readMkfChunk(gopBuffer, mapNum)
      expect(rawChunk.byteLength).toBeGreaterThan(0)

      // extracted blob 经与运行时相同的解压入口还原。
      const blobBytes = new Uint8Array(readFileSync(blobPath))
      // 回归守卫:blob 必须是 gzip 格式(首字节 0x1f 0x8b)。
      // 这里只读磁盘容器；HTTP Content-Encoding 取决于服务器配置，未在本套件验证。
      expect(blobBytes[0]).toBe(0x1f)
      expect(blobBytes[1]).toBe(0x8b)
      const decompressed = await decompressGzip(new Blob([blobBytes]))

      expect(decompressed).toEqual(rawChunk)
    }, 30_000)
  }
})

if (!hasData) {
  console.warn(
    '[S5 skip] data/raw/GOP.MKF 或 data/extracted/data/tileset/ 缺失 —— 跑 `pnpm extract` 后启用',
  )
}
