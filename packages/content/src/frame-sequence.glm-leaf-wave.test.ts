import { describe, expect, test } from 'vitest'
import {
  FRAME_SEQUENCE_BLOCK_FRAMES,
  FRAME_SEQUENCE_CODEC,
  FRAME_SEQUENCE_VERSION,
  type FrameSequenceIndexV1,
  validateFrameSequenceIndex,
} from './frame-sequence.js'

function index(overrides: Partial<FrameSequenceIndexV1> = {}): FrameSequenceIndexV1 {
  return {
    version: FRAME_SEQUENCE_VERSION,
    codec: FRAME_SEQUENCE_CODEC,
    pixelFormat: 'rgba8',
    width: 8,
    height: 8,
    defaultFrameMs: 100,
    blockFrames: FRAME_SEQUENCE_BLOCK_FRAMES,
    blocks: [{ firstFrame: 0, frameCount: 3, offset: 0, bytes: 768, rawBytes: 768 }],
    frames: [{ durationMs: 50 }, { durationMs: 200 }, {}],
    ...overrides,
  }
}

describe('validateFrameSequenceIndex 剩余合同', () => {
  test('accepts a canonical index with a consistent single block', () => {
    // width*height*4 = 8*8*4 = 256 bytes/frame；3 帧 → rawBytes 768。
    const valid = index()
    expect(validateFrameSequenceIndex(valid, 768)).toEqual(valid)
  })

  test('rejects wrong version/codec/pixelFormat/blockFrames and empty frames', () => {
    // API 声明 value: unknown —— 非法字段以裸对象注入，不经类型压制。
    expect(() => validateFrameSequenceIndex({ ...index(), version: 2 }, 768)).toThrow('version')
    expect(() => validateFrameSequenceIndex({ ...index(), codec: 'other' }, 768)).toThrow('codec')
    expect(() => validateFrameSequenceIndex({ ...index(), pixelFormat: 'rgb565' }, 768)).toThrow(
      'pixelFormat',
    )
    expect(() => validateFrameSequenceIndex({ ...index(), blockFrames: 33 }, 768)).toThrow(
      'blockFrames',
    )
    expect(() => validateFrameSequenceIndex(index({ frames: [] }), 768)).toThrow('非空数组')
    expect(() => validateFrameSequenceIndex(index({ width: 0 }), 768)).toThrow('width')
    expect(() => validateFrameSequenceIndex(index({ defaultFrameMs: 0 }), 768)).toThrow(
      'defaultFrameMs',
    )
  })
})
