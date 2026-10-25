import { expect, test } from 'vitest'
import {
  decodePalRle,
  parseIndexedRleChunk,
  parsePalSpriteChunk,
  parsePalSpriteChunkStrict,
  parseSpriteChunk,
  parseSpriteChunkStrict,
} from './rle.js'
import { encodeRleFrame, encodeSpriteChunk } from './rle-encode.js'

test('PAL来源的0x18444偏移按WORD回绕，正常sentinel不吞掉第二帧', () => {
  // PAL_SpriteGetFrame's source-specific WORD assignment maps 0x18444 to 0x8444.
  const chunk = new Uint8Array(0x8444 + 6)
  const view = new DataView(chunk.buffer)
  view.setUint16(0, 3, true)
  view.setUint16(2, 0xc222, true)
  chunk.set([1, 0, 1, 0, 1, 17], 6)
  chunk.set([1, 0, 1, 0, 1, 68], 0x8444)
  expect(parseIndexedRleChunk(chunk, 'legacy-migrated')).toEqual({
    frames: [17, 68].map((pixel) => ({
      width: 1,
      height: 1,
      pixels: Uint8Array.of(pixel),
      opaque: Uint8Array.of(1),
    })),
    declaredSlots: 3,
    trailingSentinel: true,
    skippedLegacyTailSlots: 0,
  })
  const frames = [17, 68].map((pixel) => ({
    width: 1,
    height: 1,
    pixels: Uint8Array.of(pixel),
    opaque: Uint8Array.of(1),
  }))
  expect(parsePalSpriteChunk(chunk)).toEqual(frames)
  expect(parsePalSpriteChunkStrict(chunk)).toEqual(frames)
})

test('PAL来源的高位指令超过128加帧宽时仍是literal', () => {
  // Native PAL_RLEBlitToSurfaceWithShadow independently produced 132 opaque palette17 pixels.
  const chunk = new Uint8Array([1, 0, 2, 0, 66, 0, 132, ...new Uint8Array(132).fill(17)])
  expect(() => parseIndexedRleChunk(chunk, 'legacy-migrated')).not.toThrow()
  const frames = [
    {
      width: 2,
      height: 66,
      pixels: new Uint8Array(132).fill(17),
      opaque: new Uint8Array(132).fill(1),
    },
  ]
  expect(parseIndexedRleChunk(chunk, 'legacy-migrated').frames).toEqual(frames)
  expect(parsePalSpriteChunk(chunk)).toEqual(frames)
  expect(decodePalRle(chunk.subarray(2))).toEqual(frames[0])
})

test('自建容器的合法0x18444偏移不套PAL特殊规则，保留两个完整帧', () => {
  const frames = [
    {
      width: 285,
      height: 346,
      pixels: new Uint8Array(98610).fill(17),
      opaque: new Uint8Array(98610).fill(1),
    },
    { width: 1, height: 1, pixels: Uint8Array.of(68), opaque: Uint8Array.of(1) },
  ]
  const chunk = encodeSpriteChunk(frames)
  expect(new DataView(chunk.buffer).getUint16(2, true) * 2).toBe(0x18444)
  expect(chunk.byteLength).toBe(99402)
  expect(parseSpriteChunk(chunk)).toEqual(frames)
  expect(parseSpriteChunkStrict(chunk)).toEqual(frames)
  expect(parseIndexedRleChunk(chunk, 'canonical').frames).toEqual(frames)
})

test('自建窄帧允许跨行透明游程，不按PAL帧宽把它改成literal', () => {
  const frame = { width: 2, height: 66, pixels: new Uint8Array(132), opaque: new Uint8Array(132) }
  const encoded = encodeRleFrame(frame)
  expect(encoded).toEqual(Uint8Array.of(2, 0, 66, 0, 255, 133))
  expect(parseSpriteChunkStrict(encodeSpriteChunk([frame]))).toEqual([frame])
})
