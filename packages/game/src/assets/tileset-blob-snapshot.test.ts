/**
 * S5 像素一致性验证(tileset 资源管线优化)。
 *
 * 不变式 #1:新链路解出的每个 tile 的 pixels/opaque,必须与真值(原版 GOP.MKF chunk
 * 直接解出的)逐字节一致。
 *
 * 做法:对几个真实 mapNum,从两个独立来源各自解出 tile 像素,逐 tile 逐字节对比:
 *   - 真值源:data/raw/GOP.MKF 的 chunk(= extractor 写 blob 前的 readChunk(gopMkf, mapNum))
 *   - 新链路:data/extracted/data/tileset/{N}.rle → decompressGzip → parseSpriteChunk
 *
 * 两边都最终调同一份 shared/parseSpriteChunk,但新链路多了一道 gzip 往返。
 * 本测试钉死「gzip 往返 + DecompressionStream 解压」不丢字节。
 *
 * 注意:game 包不可依赖 pal-extract,所以测试内联了一个极简的 MKF chunk 读取
 * (MKF 格式 = N+1 个 u32 LE offset 头 + 子文件),仅用于读真值源做对比。
 *
 * data/raw 与 data/extracted 是 gitignored —— clean checkout 时 skip + warn,不 block pnpm check
 * (同 D29 tilemap-baseline.test.ts 套路)。
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSpriteChunk } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { decompressGzip } from './tileset-blob.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// src/assets → src → game → packages → repo root
const REPO_ROOT = resolve(HERE, '../../../..')
const RAW_GOP = resolve(REPO_ROOT, 'data/raw/GOP.MKF')
const EXTRACTED_BLOB_DIR = resolve(REPO_ROOT, 'data/extracted/data/tileset')

// 挑有代表性的 mapNum:小(tile 少)/ 中 / 大,覆盖不同 scene 类型。
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

describe.skipIf(!hasData)('S5 tileset blob 像素一致性(真实 GOP.MKF vs extracted blob)', () => {
  const gopBuffer = new Uint8Array(readFileSync(RAW_GOP))

  for (const mapNum of SAMPLE_MAP_NUMS) {
    const blobPath = resolve(EXTRACTED_BLOB_DIR, `${mapNum}.rle`)

    it(`mapNum=${mapNum}: blob 解出的 tile 像素 == 原 GOP.MKF chunk 直接解出`, async () => {
      expect(existsSync(blobPath)).toBe(true)

      // 真值源:直接从 raw GOP.MKF 读 chunk → parseSpriteChunk
      const rawChunk = readMkfChunk(gopBuffer, mapNum)
      expect(rawChunk.byteLength).toBeGreaterThan(0)
      const truthFrames = parseSpriteChunk(rawChunk)

      // 新链路:读 extracted blob → decompressGzip → parseSpriteChunk
      const blobBytes = new Uint8Array(readFileSync(blobPath))
      // 回归守卫:blob 必须是 gzip 格式(首字节 0x1f 0x8b)。
      // 后缀用 .rle 而非 .rle.gz —— 后者会让 Vite/静态服务器加 Content-Encoding: gzip,
      // 浏览器 fetch 自动解压一次,我们的 DecompressionStream 再解就报 "incorrect header check"。
      // 若这个断言失败,检查 extractor 是否误把后缀改回 .gz。
      expect(blobBytes[0]).toBe(0x1f)
      expect(blobBytes[1]).toBe(0x8b)
      const decompressed = await decompressGzip(new Blob([blobBytes]))

      // 第一层一致性:解压后字节 == 原 chunk 字节(gzip 往返无损)
      expect(decompressed.byteLength).toBe(rawChunk.byteLength)
      let byteDiffs = 0
      for (let i = 0; i < rawChunk.byteLength; i++) {
        if (decompressed[i] !== rawChunk[i]) byteDiffs++
      }
      expect(byteDiffs).toBe(0)

      // 第二层一致性:解出的 tile 帧数 + 每 tile 像素逐字节一致
      const blobFrames = parseSpriteChunk(decompressed)
      expect(blobFrames.length).toBe(truthFrames.length)
      let pixelDiffs = 0
      let firstDiffTile = -1
      for (let i = 0; i < truthFrames.length; i++) {
        const a = truthFrames[i]!
        const b = blobFrames[i]!
        if (a.width !== b.width || a.height !== b.height) {
          throw new Error(`mapNum=${mapNum} tile ${i}: 尺寸不符`)
        }
        for (let p = 0; p < a.pixels.length; p++) {
          if (a.pixels[p] !== b.pixels[p] || a.opaque[p] !== b.opaque[p]) {
            pixelDiffs++
            if (firstDiffTile === -1) firstDiffTile = i
          }
        }
      }
      if (pixelDiffs > 0) {
        throw new Error(
          `mapNum=${mapNum}: ${pixelDiffs} 像素不一致(首个差异 tile=${firstDiffTile})`,
        )
      }

      // 报告:tile 数 + 总像素数(便于人工核对规模)
      const totalPixels = truthFrames.reduce((s, f) => s + f.pixels.length, 0)
      console.log(
        `[S5] mapNum=${mapNum}: ${truthFrames.length} tiles, ${totalPixels} pixels, 0 diff ✓`,
      )
    }, 30_000)
  }
})

if (!hasData) {
  console.warn(
    '[S5 skip] data/raw/GOP.MKF 或 data/extracted/data/tileset/ 缺失 —— 跑 `pnpm extract` 后启用',
  )
}
