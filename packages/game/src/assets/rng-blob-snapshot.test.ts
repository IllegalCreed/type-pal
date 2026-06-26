/**
 * RNG 动画 blob 真值对拍(资源管线优化 · 补 GLM 审查缺口)。
 *
 * 不变式:每个 RNG chunk 的 `.rle` blob 解出的帧,必须与原版 `data/raw/RNG.MKF`
 * 直接解出的帧逐字节一致。RNG 是五类 blob 里解码最复杂的(sub-MKF + YJ2 + RLE delta +
 * surface 累加),故端到端对拍价值最高。
 *
 * 真值源:`data/raw/RNG.MKF` 的 chunk → shared `decodeRngFrames`
 * 新链路:`data/extracted/data/animation/rng-{NN}.rle` → decompressGzip → 同一 `decodeRngFrames`
 *
 * data/raw 与 data/extracted gitignored → clean checkout skip + 不 block pnpm check
 * (同 tileset-blob-snapshot.test.ts 套路)。
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
  const rng = openMkf(new Uint8Array(readFileSync(RAW_RNG)))
  const n = chunkCount(rng)

  for (let i = 0; i < n; i++) {
    it(`chunk ${i}: blob 解出帧 == 原 RNG.MKF chunk 解出帧(逐字节)`, async () => {
      const raw = readChunk(rng, i)
      const truth = decodeRngFrames(raw)
      const blobPath = resolve(BLOB_DIR, `rng-${i.toString().padStart(2, '0')}.rle`)
      if (!existsSync(blobPath)) {
        // extractor 只在 frames.length>0 时写 blob;空/坏 chunk 无 blob 且 truth 应 0 帧
        expect(truth.length).toBe(0)
        return
      }

      const blobBytes = new Uint8Array(readFileSync(blobPath))
      expect(blobBytes[0]).toBe(0x1f) // gzip 魔数
      expect(blobBytes[1]).toBe(0x8b)
      const decompressed = await decompressGzip(new Blob([Buffer.from(blobBytes)]))

      // 第一层:gzip 往返无损(blob 解压 == 原 chunk 字节)
      expect(decompressed.byteLength).toBe(raw.byteLength)

      // 第二层:解出帧数 + 每帧 320×200 像素逐字节一致
      const blobFrames = decodeRngFrames(decompressed)
      expect(blobFrames.length).toBe(truth.length)
      let pixelDiffs = 0
      let firstDiffFrame = -1
      for (let f = 0; f < truth.length; f++) {
        const a = truth[f]!.pixels
        const b = blobFrames[f]!.pixels
        if (a.length !== b.length) throw new Error(`chunk ${i} frame ${f}: 尺寸不符`)
        for (let p = 0; p < a.length; p++) {
          if (a[p] !== b[p]) {
            pixelDiffs++
            if (firstDiffFrame === -1) firstDiffFrame = f
          }
        }
      }
      if (pixelDiffs > 0) {
        throw new Error(`chunk ${i}: ${pixelDiffs} 像素不一致(首个差异 frame=${firstDiffFrame})`)
      }
    }, 30_000)
  }
})

if (!hasData) {
  console.warn('[rng-blob-snapshot skip] data/raw/RNG.MKF 或 data/extracted/data/animation 缺失')
}
