import { describe, expect, test } from 'vitest'
import {
  FRAME_SEQUENCE_BLOCK_FRAMES,
  FRAME_SEQUENCE_CODEC,
  FRAME_SEQUENCE_VERSION,
  type FrameSequenceIndexV1,
  frameSequenceFrameDurationMs,
  resolveFrameSequencePlayback,
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
    blocks: [],
    frames: [{ durationMs: 50 }, { durationMs: 200 }, {}],
    ...overrides,
  }
}

describe('resolveFrameSequencePlayback 剩余合同', () => {
  test('defaults cover the full frame range and explicit bounds are echoed', () => {
    const play = resolveFrameSequencePlayback(index())
    expect(play).toEqual({ startFrame: 0, endFrame: 2 })
    expect(resolveFrameSequencePlayback(index(), { startFrame: 1, endFrame: 1 })).toEqual({
      startFrame: 1,
      endFrame: 1,
    })
  })

  test('out-of-range, reversed and non-positive frameRate inputs are rejected', () => {
    expect(() => resolveFrameSequencePlayback(index(), { startFrame: 3 })).toThrow('越界')
    expect(() => resolveFrameSequencePlayback(index(), { endFrame: -1 })).toThrow('越界')
    expect(() => resolveFrameSequencePlayback(index(), { startFrame: 2, endFrame: 1 })).toThrow(
      'startFrame 不能大于 endFrame',
    )
    expect(() => resolveFrameSequencePlayback(index(), { frameRate: 0 })).toThrow('frameRate')
    expect(() => resolveFrameSequencePlayback(index(), { frameRate: Number.NaN })).toThrow(
      'frameRate',
    )
  })
})

describe('frameSequenceFrameDurationMs 剩余合同', () => {
  test('per-frame override wins over default and frameRate overrides both', () => {
    const seq = index()
    expect(frameSequenceFrameDurationMs(seq, 0)).toBe(50)
    expect(frameSequenceFrameDurationMs(seq, 2)).toBe(100)
    expect(frameSequenceFrameDurationMs(seq, 0, 40)).toBe(25)
    expect(frameSequenceFrameDurationMs(seq, 2, 40)).toBe(25)
  })
})

describe('validateFrameSequenceIndex 剩余合同', () => {
  test('accepts a canonical index with a consistent single block', () => {
    // width*height*4 = 8*8*4 = 256 bytes/frame；3 帧 → rawBytes 768。
    const valid = index({
      blocks: [{ firstFrame: 0, frameCount: 3, offset: 0, bytes: 768, rawBytes: 768 }],
    })
    expect(validateFrameSequenceIndex(valid, 768)).toEqual(valid)
  })

  test('rejects wrong version/codec/pixelFormat/blockFrames and empty frames', () => {
    // API 声明 value: unknown —— 非法字段以裸对象注入，不经类型压制。
    expect(() => validateFrameSequenceIndex({ ...index(), version: 2 }, 0)).toThrow('version')
    expect(() => validateFrameSequenceIndex({ ...index(), codec: 'other' }, 0)).toThrow('codec')
    expect(() => validateFrameSequenceIndex({ ...index(), pixelFormat: 'rgb565' }, 0)).toThrow(
      'pixelFormat',
    )
    expect(() => validateFrameSequenceIndex({ ...index(), blockFrames: 33 }, 0)).toThrow(
      'blockFrames',
    )
    expect(() => validateFrameSequenceIndex(index({ frames: [] }), 0)).toThrow('非空数组')
    expect(() => validateFrameSequenceIndex(index({ width: 0 }), 0)).toThrow('width')
    expect(() => validateFrameSequenceIndex(index({ defaultFrameMs: 0 }), 0)).toThrow(
      'defaultFrameMs',
    )
  })
})
