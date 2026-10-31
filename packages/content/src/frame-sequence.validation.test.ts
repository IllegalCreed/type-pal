/** Index metadata only; compressed payload and decoded pixels belong to the codec suites. */
import { describe, expect, test } from 'vitest'
import { type FrameSequenceIndexV1, validateFrameSequenceIndex } from './frame-sequence.js'

function validFrameIndex(overrides: Partial<FrameSequenceIndexV1> = {}): FrameSequenceIndexV1 {
  return {
    version: 1,
    codec: 'deflate-rgba8-xor-v1',
    pixelFormat: 'rgba8',
    width: 8,
    height: 8,
    defaultFrameMs: 100,
    blockFrames: 32,
    blocks: [{ firstFrame: 0, frameCount: 3, offset: 0, bytes: 768, rawBytes: 768 }],
    frames: [{ durationMs: 50 }, { durationMs: 200 }, {}],
    ...overrides,
  }
}

describe('TPFS index metadata validation', () => {
  test('accepts a canonical index with a consistent single block', () => {
    // width*height*4 = 8*8*4 = 256 bytes/frame；3 帧 → rawBytes 768。
    const valid = validFrameIndex()
    expect(validateFrameSequenceIndex(valid, 768)).toEqual(valid)
  })

  test('rejects invalid metadata discriminants, dimensions, timing and empty frames', () => {
    // API 声明 value: unknown —— 非法字段以裸对象注入，不经类型压制。
    expect(() => validateFrameSequenceIndex({ ...validFrameIndex(), version: 2 }, 768)).toThrow(
      'version',
    )
    expect(() => validateFrameSequenceIndex({ ...validFrameIndex(), codec: 'other' }, 768)).toThrow(
      'codec',
    )
    expect(() =>
      validateFrameSequenceIndex({ ...validFrameIndex(), pixelFormat: 'rgb565' }, 768),
    ).toThrow('pixelFormat')
    expect(() =>
      validateFrameSequenceIndex({ ...validFrameIndex(), blockFrames: 33 }, 768),
    ).toThrow('blockFrames')
    expect(() => validateFrameSequenceIndex(validFrameIndex({ frames: [] }), 768)).toThrow(
      '非空数组',
    )
    expect(() => validateFrameSequenceIndex(validFrameIndex({ width: 0 }), 768)).toThrow('width')
    expect(() => validateFrameSequenceIndex(validFrameIndex({ defaultFrameMs: 0 }), 768)).toThrow(
      'defaultFrameMs',
    )
  })
})
