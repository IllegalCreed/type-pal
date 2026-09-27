/**
 * TEST-CURSOR-PURE-WAVE-1 A01：正式 deflate 链上的保留位 [5]/[7]。
 * [6] 已由 frame-sequence.test.ts / .contracts.test.ts 证明。
 */
// @ts-expect-error Node-only test host; content production type environment is DOM-only.
import { deflateSync, inflateSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import { inputSnap } from './cursor-pure-fixtures.js'
import {
  decodeFrameSequenceFrame,
  encodeFrameSequenceSync,
  parseFrameSequence,
} from './frame-sequence.js'

const rgba = Uint8Array.of(1, 2, 3, 255)

function legalBytes() {
  return encodeFrameSequenceSync(
    {
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      frames: [{ rgba }],
    },
    (bytes) => deflateSync(bytes),
  )
}

describe('A01 frame-sequence 剩余合同', () => {
  test('encode→parse→decode：deflate 正帧可还原，保留位 [5] 与 [7] 各自拒绝', async () => {
    const bytes = legalBytes()
    const bytesSnap = inputSnap(bytes)
    const parsed = parseFrameSequence(bytes)
    expect(bytes).toEqual(bytesSnap)
    expect(parsed.index.frames).toHaveLength(1)
    expect(parsed.index.codec).toBe('deflate-rgba8-xor-v1')
    expect(parsed.index.blocks[0]?.rawBytes).toBe(4)
    expect(await decodeFrameSequenceFrame(parsed, 0, (block) => inflateSync(block))).toEqual(rgba)

    for (const offset of [5, 7] as const) {
      const corrupted = bytes.slice()
      const corruptedSnap = inputSnap(corrupted)
      corrupted[offset] = 1
      expect(() => parseFrameSequence(corrupted)).toThrow('TPFS.reserved: 保留位必须为 0')
      expect(corrupted.slice(0, offset)).toEqual(corruptedSnap.slice(0, offset))
      expect(corrupted.slice(offset + 1)).toEqual(corruptedSnap.slice(offset + 1))
      expect(bytes).toEqual(bytesSnap)
    }
    expect(parseFrameSequence(bytes).index.codec).toBe(parsed.index.codec)
    expect(
      await decodeFrameSequenceFrame(parseFrameSequence(bytes), 0, (block) => inflateSync(block)),
    ).toEqual(rgba)
  })
})
