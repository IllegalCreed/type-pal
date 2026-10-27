/** FIRE 的空/短/raw/压缩合同通过当前 blob writer 验证；不保留旧逐帧 PNG 接口。 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { parsePalSpriteChunk } from '@type-pal/shared'
import { expect, test } from 'vitest'
import {
  SPRITE_CHUNK_2X2,
  YJ2_SPRITE_CHUNK_2X2,
} from '../__tests__/glm-runtime-resource/yj2-sprite-chunk-vector.js'
import { mkfContainer } from '../__tests__/glm-tb04-fixtures.js'
import { writeFireAssets } from './animation-assets.js'

function publish(chunks: Uint8Array[], registerCleanup: (cleanup: () => void) => void) {
  const work = mkdtempSync(join(tmpdir(), 'type-pal-fire-publication-'))
  registerCleanup(() => rmSync(work, { recursive: true, force: true }))
  const raw = join(work, 'raw')
  const out = join(work, 'output')
  mkdirSync(raw)
  writeFileSync(join(raw, 'FIRE.MKF'), mkfContainer(chunks))
  writeFireAssets(raw, out)
  return out
}

test('writeFireAssets keeps empty and short slots in the manifest without publishing blobs', ({
  onTestFinished,
}) => {
  const out = publish(
    [
      new Uint8Array(),
      new Uint8Array([1]),
      new Uint8Array([0, 0]),
      new Uint8Array([1, 0, 0, 0, 253, 252, 0, 126]),
      new Uint8Array(),
      new Uint8Array(),
      new Uint8Array(),
      new Uint8Array(),
    ],
    onTestFinished,
  )
  expect(JSON.parse(readFileSync(join(out, 'data/fire-sprites.json'), 'utf8'))).toEqual({
    chunkCount: 8,
    chunks: Array.from({ length: 8 }, (_, chunkIndex) => ({
      chunkIndex,
      frameCount: 0,
      frames: [],
    })),
  })
  expect(readdirSync(join(out, 'data'))).toEqual(['fire-sprites.json'])
})

test('writeFireAssets decompresses the 2x2 vector and preserves transparent and opaque palette-zero pixels', ({
  onTestFinished,
}) => {
  const out = publish([YJ2_SPRITE_CHUNK_2X2], onTestFinished)
  expect(JSON.parse(readFileSync(join(out, 'data/fire-sprites.json'), 'utf8'))).toEqual({
    chunkCount: 1,
    chunks: [{ chunkIndex: 0, frameCount: 1, frames: [{ index: 0, width: 2, height: 2 }] }],
  })
  const bytes = gunzipSync(readFileSync(join(out, 'data/magic/fire-00.rle')))
  expect([...bytes]).toEqual(SPRITE_CHUNK_2X2)
  expect(parsePalSpriteChunk(bytes)).toEqual([
    {
      width: 2,
      height: 2,
      pixels: new Uint8Array([0, 0xaa, 0, 0]),
      opaque: new Uint8Array([0, 1, 1, 0]),
    },
  ])
})

test('writeFireAssets retains raw fallback bytes and two distinct frames in order', ({
  onTestFinished,
}) => {
  // 两word帧表指向byte4/10，随后两个1×1 literal；YJ2入口按现行策略拒绝后走raw。
  const raw = new Uint8Array([2, 0, 5, 0, 1, 0, 1, 0, 1, 0xaa, 1, 0, 1, 0, 1, 0xbb])
  const out = publish([raw], onTestFinished)
  expect(JSON.parse(readFileSync(join(out, 'data/fire-sprites.json'), 'utf8'))).toEqual({
    chunkCount: 1,
    chunks: [
      {
        chunkIndex: 0,
        frameCount: 2,
        frames: [
          { index: 0, width: 1, height: 1 },
          { index: 1, width: 1, height: 1 },
        ],
      },
    ],
  })
  const bytes = gunzipSync(readFileSync(join(out, 'data/magic/fire-00.rle')))
  expect(bytes).toEqual(Buffer.from(raw))
  expect(parsePalSpriteChunk(bytes)).toEqual([
    { width: 1, height: 1, pixels: new Uint8Array([0xaa]), opaque: new Uint8Array([1]) },
    { width: 1, height: 1, pixels: new Uint8Array([0xbb]), opaque: new Uint8Array([1]) },
  ])
})
