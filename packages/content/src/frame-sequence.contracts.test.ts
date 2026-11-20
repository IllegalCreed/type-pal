import { describe, expect, test } from 'vitest'
import { deflateBytes, inflateBytes } from './__tests__/frame-sequence-test-codecs.mjs'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  decodeFrameSequenceBlock,
  type EncodeFrameSequenceInput,
  encodeFrameSequenceFromProvider,
  encodeFrameSequenceSync,
  frameSequenceFrameDurationMs,
  parseFrameSequence,
  resolveFrameSequencePlayback,
} from './frame-sequence.js'

/** 1×1 像素帧（4 字节 RGBA）；像素值=帧号×10+alpha255。 */
const frame = (n: number, durationMs?: number) => ({
  rgba: new Uint8Array([(n * 10) % 256, (n * 10 + 1) % 256, (n * 10 + 2) % 256, 255]),
  ...(durationMs === undefined ? {} : { durationMs }),
})
const input = (frames: number, durationMs?: number): EncodeFrameSequenceInput => ({
  width: 1,
  height: 1,
  defaultFrameMs: 100,
  frames: Array.from({ length: frames }, (_, i) => frame(i, durationMs)),
})
const encode = (value: EncodeFrameSequenceInput) => encodeFrameSequenceSync(value, deflateBytes)
const parse = (bytes: Uint8Array) => parseFrameSequence(bytes)
const allFrames = async (value: EncodeFrameSequenceInput) => {
  const parsed = parse(encode(value))
  const out: Uint8Array[] = []
  for (let b = 0; b < parsed.index.blocks.length; b++)
    out.push(...(await decodeFrameSequenceBlock(parsed, b, inflateBytes)))
  return { parsed, frames: out }
}

describe('TPFS container header', () => {
  const good = encode(input(1))
  const corrupted = (mutate: (bytes: Uint8Array) => void) => {
    const copy = new Uint8Array(good)
    mutate(copy)
    return copy
  }
  test('截断 <12 字节拒绝', () => {
    expect(() => parseFrameSequence(good.subarray(0, 11))).toThrow(new Error('TPFS: 文件头被截断'))
  })
  test('magic 逐字节拒绝（改第 0-3 字节各一次）', () => {
    for (let i = 0; i < 4; i++) {
      expect(() => parseFrameSequence(corrupted((b) => (b[i] = b[i]! ^ 0xff)))).toThrow(
        new Error('TPFS.magic: 非法魔数'),
      )
    }
  })
  test('the header only accepts TPFS version one', () => {
    expect(() => parseFrameSequence(corrupted((bytes) => (bytes[4] = 2)))).toThrow(
      new Error('TPFS.version: 期望 1'),
    )
  })
  test.each([5, 6, 7])('reserved byte %i must be zero', (offset) => {
    expect(() => parseFrameSequence(corrupted((bytes) => (bytes[offset] = 1)))).toThrow(
      new Error('TPFS.reserved: 保留位必须为 0'),
    )
  })
  test('index 长度超界拒绝（指向文件外）', () => {
    expect(() => parseFrameSequence(corrupted((b) => b.set([0xff, 0xff, 0xff, 0xff], 8)))).toThrow(
      new Error('TPFS.indexLength: 索引越界或端序错误'),
    )
  })
})

describe('index and block boundaries', () => {
  test('35 帧跨两块（32+3）：block firstFrame/frameCount 精确、全部像素逐帧 oracle', async () => {
    const { parsed, frames } = await allFrames(input(35))
    expect(parsed.index.frames).toHaveLength(35)
    expect(parsed.index.blocks.map((b) => [b.firstFrame, b.frameCount])).toEqual([
      [0, 32],
      [32, 3],
    ])
    for (let i = 0; i < 35; i++) {
      expect([...frames[i]!]).toEqual([(i * 10) % 256, (i * 10 + 1) % 256, (i * 10 + 2) % 256, 255])
    }
  })
  test('空帧数组拒绝；单帧/双帧正常', () => {
    expect(() => encode(input(0))).toThrow(/非空/)
    expect(parse(encode(input(1))).index.frames).toHaveLength(1)
    expect(parse(encode(input(2))).index.frames).toHaveLength(2)
  })
  test('rgba 字节数不符拒绝（1×1 需要 4 字节）', () => {
    expect(() => encode({ ...input(1), frames: [{ rgba: new Uint8Array(3) }] })).toThrow(
      /期望 4 字节/,
    )
  })
})

describe('provider and typed array views', () => {
  test('帧提供器入口：encodeFrameSequenceFromProvider 逐帧取帧并完整解码一致', async () => {
    const value = input(3)
    // 帧提供器：按索引惰性给帧（记录调用顺序），deflate 回调只负责压缩
    const requested: number[] = []
    const bytes = await encodeFrameSequenceFromProvider(
      {
        width: 1,
        height: 1,
        defaultFrameMs: 100,
        frames: value.frames,
        frame: (i) => {
          requested.push(i)
          return Promise.resolve(value.frames[i]!.rgba)
        },
      },
      (raw) => deflateBytes(raw),
    )
    expect(requested).toEqual([0, 1, 2])
    const parsed = parse(bytes)
    expect(parsed.index.frames).toHaveLength(3)
    const frames: Uint8Array[] = []
    for (let b = 0; b < parsed.index.blocks.length; b++)
      frames.push(...(await decodeFrameSequenceBlock(parsed, b, (raw) => inflateBytes(raw))))
    for (let i = 0; i < 3; i++) expect([...frames[i]!]).toEqual([...value.frames[i]!.rgba])
    // 提供器给错字节数拒绝（帧提供器合同）
    await expect(
      encodeFrameSequenceFromProvider(
        {
          width: 1,
          height: 1,
          defaultFrameMs: 100,
          frames: value.frames,
          frame: () => Promise.resolve(new Uint8Array(3)),
        },
        (raw) => deflateBytes(raw),
      ),
    ).rejects.toThrow(/期望 4 字节/)
  })
  test('非零 byteOffset 视图完整解码：全部帧像素与输入一致（不借零 offset 用例背书）', async () => {
    const value = input(3)
    const bytes = encode(value)
    // 嵌入更大缓冲制造非零 offset
    const padded = new Uint8Array(bytes.byteLength + 16)
    padded.set(bytes, 16)
    const view = padded.subarray(16)
    expect(view.byteOffset).toBe(16)
    expect(view).toEqual(bytes)
    // 对该视图完整解码（parse + 全部 block + 全部帧像素）；拒绝或像素不一致均失败。
    const decodeAll = async (): Promise<number[][]> => {
      const parsed = parse(view)
      const out: Uint8Array[] = []
      for (let b = 0; b < parsed.index.blocks.length; b++)
        out.push(...(await decodeFrameSequenceBlock(parsed, b, (raw) => inflateBytes(raw))))
      return out.map((f) => [...f])
    }
    await expect(decodeAll()).resolves.toEqual([
      [...value.frames[0]!.rgba],
      [...value.frames[1]!.rgba],
      [...value.frames[2]!.rgba],
    ])
  })
  test('encode 不修改输入帧（深快照不变）；输出与输入无别名', () => {
    const value = input(2)
    const before = deepSnapshot(value.frames.map((f) => [...f.rgba]))
    const encoded = encode(value)
    expect(value.frames.map((f) => [...f.rgba])).toEqual(before)
    encoded[0] = 0xff
    expect(value.frames[0]!.rgba[0]).not.toBe(0xff)
  })
  test('deflate 返回空 Uint8Array 拒绝（provider 合同）', () => {
    expect(() => encodeFrameSequenceSync(input(1), () => new Uint8Array())).toThrow(
      /Deflate 必须返回非空/,
    )
  })
  test('inflate 失败传播（不吞错）', async () => {
    const parsed = parse(encode(input(1)))
    await expect(
      decodeFrameSequenceBlock(parsed, 0, () => {
        throw new Error('inflate crashed')
      }),
    ).rejects.toThrow('inflate crashed')
  })
})

describe('playback range and frame duration', () => {
  test('默认 start=0/end=last；显式范围/帧率往返', () => {
    const parsed = parse(encode(input(3)))
    expect(resolveFrameSequencePlayback(parsed.index)).toEqual({ startFrame: 0, endFrame: 2 })
    expect(resolveFrameSequencePlayback(parsed.index, { startFrame: 1 })).toEqual({
      startFrame: 1,
      endFrame: 2,
    })
    expect(
      resolveFrameSequencePlayback(parsed.index, { startFrame: 1, endFrame: 2, frameRate: 30 }),
    ).toEqual({ startFrame: 1, endFrame: 2, frameRate: 30 })
  })
  test.each([
    ['negative start', { startFrame: -1 }, 'TPFS.playback.startFrame: 帧索引 -1 越界'],
    ['start past end', { startFrame: 3 }, 'TPFS.playback.startFrame: 帧索引 3 越界'],
    ['end past last frame', { endFrame: 99 }, 'TPFS.playback.endFrame: 帧索引 99 越界'],
    [
      'reversed range',
      { startFrame: 2, endFrame: 1 },
      'TPFS.playback: startFrame 不能大于 endFrame',
    ],
    ['zero frame rate', { frameRate: 0 }, 'TPFS.playback.frameRate: 期望正有限数'],
    ['NaN frame rate', { frameRate: Number.NaN }, 'TPFS.playback.frameRate: 期望正有限数'],
  ] as const)('%s is rejected', (_name, options, message) => {
    const parsed = parse(encode(input(3)))
    expect(() => resolveFrameSequencePlayback(parsed.index, options)).toThrow(new Error(message))
  })
  test('帧时长优先级：显式 durationMs > defaultFrameMs', () => {
    const parsed = parse(encode(input(3, 250))) // 每帧 250ms
    expect(frameSequenceFrameDurationMs(parsed.index, 0)).toBe(250)
    const defaults = parse(encode(input(3))) // 默认 100ms
    expect(frameSequenceFrameDurationMs(defaults.index, 0)).toBe(100)
    expect(frameSequenceFrameDurationMs(defaults.index, 0, 50)).toBe(20) // 帧率换算 1000/50
  })
})
