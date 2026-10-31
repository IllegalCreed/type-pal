import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { chunkCount, decodeRngFrames, openMkf, readChunk } from '@type-pal/shared'
import { expect, test } from 'vitest'
import { writeRngAssets } from './animation-assets.js'

// 原盘 offset 表由独立 Python struct 读取：各档最后一个 sub-slot 为空，帧号从0连续。
// 只核发布原字节/元数据与实际解码接线，不把 PNG 大小差异当像素 oracle。
test('writeRngAssets publishes all original chunks and exact frame identities', ({
  onTestFinished,
}) => {
  const work = mkdtempSync(join(tmpdir(), 'type-pal-rng-publication-'))
  onTestFinished(() => rmSync(work, { recursive: true, force: true }))
  const raw = join(work, 'raw')
  const out = join(work, 'output')
  mkdirSync(raw)
  const original = resolve(import.meta.dirname, '../../../../data/raw/RNG.MKF')
  copyFileSync(original, join(raw, 'RNG.MKF'))
  writeRngAssets(raw, out)
  const counts = [64, 410, 93, 140, 40, 82, 54, 70, 33, 256, 42, 180]
  const manifest = JSON.parse(readFileSync(join(out, 'data/rng-frames.json'), 'utf8'))
  expect(manifest).toEqual({
    chunks: counts.map((frameCount, chunkIndex) => ({
      chunkIndex,
      frameCount,
      frames: Array.from({ length: frameCount }, (_, index) => ({ index })),
    })),
  })
  const mkf = openMkf(new Uint8Array(readFileSync(original)))
  expect(chunkCount(mkf)).toBe(12)
  for (let chunk = 0; chunk < 12; chunk++) {
    const file = join(out, `data/animation/rng-${String(chunk).padStart(2, '0')}.rle`)
    expect(Buffer.compare(gunzipSync(readFileSync(file)), Buffer.from(readChunk(mkf, chunk)))).toBe(
      0,
    )
  }
  const frames = decodeRngFrames(gunzipSync(readFileSync(join(out, 'data/animation/rng-06.rle'))))
  expect(frames).toHaveLength(54)
  expect(frames.map((frame) => frame.index)).toEqual(
    Array.from({ length: 54 }, (_, index) => index),
  )
  for (const frame of frames) expect(frame.pixels).toHaveLength(320 * 200)
  // 当前原盘第0帧全黑；旧用例的“第一帧非黑”标题与事实相反。
  expect(frames[0]!.pixels.every((pixel) => pixel === 0)).toBe(true)
  expect(Buffer.compare(Buffer.from(frames[53]!.pixels), Buffer.from(frames[0]!.pixels))).not.toBe(
    0,
  )
})
