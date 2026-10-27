import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { decodeRngFrames } from '@type-pal/shared'
import { expect, test } from 'vitest'
import { mkfContainer } from '../__tests__/binary-fixtures.js'
import { yj2EncodeLiterals } from '../__tests__/glm-q/yj2-encoder.js'
import { writeRngAssets } from './animation-assets.js'

// Fast owns self-contained writer/byte/index contracts. The unchanged original-disc
// conservation contract lives in animation-assets.rng.pal.test.ts (full/raw route).
test('writeRngAssets preserves chunk slots, sparse frame identities and exact delta bytes', ({
  onTestFinished,
}) => {
  const work = mkdtempSync(join(tmpdir(), 'type-pal-rng-writer-'))
  onTestFinished(() => rmSync(work, { recursive: true, force: true }))
  const raw = join(work, 'raw')
  const out = join(work, 'output')
  mkdirSync(raw)
  // SDLPal RNG op06 writes one literal pair, op02 skips one pair, op13 ends.
  // The encoder constructs input only; expected surfaces below are hand-written.
  const first = yj2EncodeLiterals(new Uint8Array([0x06, 0x31, 0x32, 0x13]))
  const later = yj2EncodeLiterals(new Uint8Array([0x02, 0x06, 0x71, 0x72, 0x13]))
  const other = yj2EncodeLiterals(new Uint8Array([0x06, 0xaa, 0xbb, 0x13]))
  const chunks = [
    mkfContainer([first, new Uint8Array(), later, new Uint8Array()]),
    new Uint8Array(),
    mkfContainer([other, new Uint8Array()]),
  ]
  writeFileSync(join(raw, 'RNG.MKF'), mkfContainer(chunks))
  writeRngAssets(raw, out)
  expect(JSON.parse(readFileSync(join(out, 'data/rng-frames.json'), 'utf8'))).toEqual({
    chunks: [
      { chunkIndex: 0, frameCount: 2, frames: [{ index: 0 }, { index: 2 }] },
      { chunkIndex: 1, frameCount: 0, frames: [] },
      { chunkIndex: 2, frameCount: 1, frames: [{ index: 0 }] },
    ],
  })
  for (const [index, bytes] of chunks.entries()) {
    const blob = readFileSync(join(out, `data/animation/rng-0${index}.rle`))
    expect(Buffer.compare(gunzipSync(blob), Buffer.from(bytes))).toBe(0)
  }
  const frames = decodeRngFrames(gunzipSync(readFileSync(join(out, 'data/animation/rng-00.rle'))))
  const firstSurface = new Uint8Array(320 * 200)
  firstSurface.set([0x31, 0x32])
  const laterSurface = new Uint8Array(320 * 200)
  laterSurface.set([0x31, 0x32, 0x71, 0x72])
  expect(frames).toEqual([
    { index: 0, pixels: firstSurface },
    { index: 2, pixels: laterSurface },
  ])
})
