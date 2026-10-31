/**
 * RNG 动画 blob 真值对拍(资源管线优化 · 补 GLM 审查缺口)。
 *
 * 不变式:每个 RNG chunk 的 `.rle` 解压字节，必须等于原 RNG.MKF 对应 chunk。
 * 原盘帧数只用于核 extractor 是否应输出 blob；不把同一 codec 两次调用当独立像素真值。
 *
 * 真值源:`data/raw/RNG.MKF` 的 chunk → shared `decodeRngFrames`
 * 新链路:`data/extracted/data/animation/rng-{NN}.rle` → decompressGzip → 原 chunk 字节
 *
 * 可选整组输入缺席时显式 skip（且不读文件）；已提供输入中的坏包/缺帧 blob 必须失败。
 * 此约定仅限本套件，不代表整个仓库 check 无需 PAL 数据。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunkCount, decodeRngFrames, openMkf, readChunk } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { decompressGzip } from './tileset-blob.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// src/assets → src → game → packages → repo root
const REPO_ROOT = resolve(HERE, '../../../..')
const RAW_RNG = resolve(REPO_ROOT, 'data/raw/RNG.MKF')
const BLOB_DIR = resolve(REPO_ROOT, 'data/extracted/data/animation')

const hasData = existsSync(RAW_RNG) && existsSync(BLOB_DIR)

describe.skipIf(!hasData)('RNG blob 真值对拍(raw RNG.MKF vs extracted .rle)', () => {
  // skipIf 仍会执行收集回调；必须在读取之前检查，不能先 ENOENT 再声称 skip。
  const rng = hasData ? openMkf(new Uint8Array(readFileSync(RAW_RNG))) : undefined
  const n = rng ? chunkCount(rng) : 0

  it('原 RNG.MKF 必须有可核对的 chunk（缺整组输入时显式跳过）', () => {
    expect(n, '原 RNG.MKF 不含任何 chunk，不能进行对拍').toBeGreaterThan(0)
  })
  if (!rng) return

  for (let i = 0; i < n; i++) {
    it(`chunk ${i}: gzip 解压字节等于原 RNG.MKF chunk`, async () => {
      const raw = readChunk(rng, i)
      const truth = decodeRngFrames(raw)
      const blobPath = resolve(BLOB_DIR, `rng-${i.toString().padStart(2, '0')}.rle`)
      if (!existsSync(blobPath)) {
        // extractor 只在 frames.length>0 时写 blob；缺文件只能对应没有可解帧的 chunk。
        expect(truth.length).toBe(0)
        return
      }

      const blobBytes = new Uint8Array(readFileSync(blobPath))
      expect(blobBytes[0]).toBe(0x1f) // gzip 魔数
      expect(blobBytes[1]).toBe(0x8b)
      const decompressed = await decompressGzip(new Blob([Buffer.from(blobBytes)]))

      // 包括未影响画面的 padding；相同字节交给同一 codec 必然产生相同帧，无需重解一遍。
      expect(Buffer.compare(Buffer.from(decompressed), Buffer.from(raw))).toBe(0)
    }, 30_000)
  }
})

if (!hasData) {
  console.warn('[rng-blob-snapshot skip] data/raw/RNG.MKF 或 data/extracted/data/animation 缺失')
}
