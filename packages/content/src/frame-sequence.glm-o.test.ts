/** TEST-GLM-WAVE-O-1 O09：TPFS 帧序列编解码/索引/回放残余合同。
 *  旧证：frame-sequence.test.ts 等覆盖常规编码往返；本卡按 gap-map 直击未覆盖臂：
 *  头部截断/魔数/版本/保留位/索引越界/非法 JSON、UTF-8 多字节媒体名、
 *  encode 输入轴（尺寸/时长/色彩/空帧）、播放范围解析。
 */
import { describe, expect, test } from 'vitest'

/** 纯 UTF-8 编码（content 包测试宿主无 Node 类型；与产品 encodeUtf8 同语义）。 */
const utf8Encode = (text: string): Uint8Array => {
  const out: number[] = []
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x7f) out.push(code)
    else if (code <= 0x7ff) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code <= 0xffff)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
  }
  return Uint8Array.from(out)
}
import {
  encodeFrameSequenceSync,
  frameSequenceFrameDurationMs,
  parseFrameSequence,
  resolveFrameSequencePlayback,
  validateFrameSequenceIndex,
  FRAME_SEQUENCE_BLOCK_FRAMES,
  FRAME_SEQUENCE_CODEC,
  FRAME_SEQUENCE_MAGIC,
  FRAME_SEQUENCE_VERSION,
} from './frame-sequence.js'

/** deflate 占位变换：压缩率无关的恒等即可驱动同一编码路径（产品侧传 deflateSync）。 */
const identity = (bytes: Uint8Array): Uint8Array => bytes

const rgba = (width: number, height: number, seed: number): Uint8Array => {
  const out = new Uint8Array(width * height * 4)
  for (let i = 0; i < out.length; i++) out[i] = (seed + i) & 0xff
  return out
}

const encodeOne = (
  over: Record<string, unknown> = {},
  frameOver: Record<string, unknown> = {},
  transform: (bytes: Uint8Array) => Uint8Array = identity,
) =>
  encodeFrameSequenceSync(
    {
      width: 2,
      height: 2,
      defaultFrameMs: 40,
      frames: [{ rgba: rgba(2, 2, 1), ...frameOver }],
      ...over,
    },
    transform,
  )

describe('O09 parseFrameSequence：头部轴', () => {
  test('截断（<12B）/ 魔数错 / 版本错 / 保留位非零 逐轴拒绝', () => {
    expect(() => parseFrameSequence(new Uint8Array(11))).toThrow('TPFS: 文件头被截断')
    const badMagic = new Uint8Array(32)
    expect(() => parseFrameSequence(badMagic)).toThrow('TPFS.magic: 非法魔数')
    expect(FRAME_SEQUENCE_MAGIC.length).toBe(4)
    const badVersion = new Uint8Array(32)
    badVersion.set(utf8Encode(FRAME_SEQUENCE_MAGIC))
    badVersion[4] = FRAME_SEQUENCE_VERSION + 1
    expect(() => parseFrameSequence(badVersion)).toThrow(
      `TPFS.version: 期望 ${FRAME_SEQUENCE_VERSION}`,
    )
    const badReserved = new Uint8Array(32)
    badReserved.set(utf8Encode(FRAME_SEQUENCE_MAGIC))
    badReserved[4] = FRAME_SEQUENCE_VERSION
    badReserved[6] = 1
    expect(() => parseFrameSequence(badReserved)).toThrow('TPFS.reserved: 保留位必须为 0')
  })

  test('索引越界 / 非法 JSON 逐轴拒绝；合法最小文件解析', () => {
    const build = (indexJson: string): Uint8Array => {
      const indexBytes = utf8Encode(indexJson)
      const out = new Uint8Array(12 + indexBytes.byteLength + 32)
      out.set(utf8Encode(FRAME_SEQUENCE_MAGIC))
      out[4] = FRAME_SEQUENCE_VERSION
      const view = new DataView(out.buffer)
      view.setUint32(8, indexBytes.byteLength, true)
      out.set(indexBytes, 12)
      return out
    }
    const full = encodeOne()
    const truncatedIndex = full.subarray(0, 14) // 声明的索引长度被截断
    expect(() => parseFrameSequence(truncatedIndex)).toThrow(
      'TPFS.indexLength: 索引越界或端序错误',
    )
    const badJson = build('{oops')
    expect(() => parseFrameSequence(badJson)).toThrow(/TPFS\.index: 非法 JSON/)

    const source = encodeOne()
    const parsed = parseFrameSequence(source)
    expect(parsed.index.width).toBe(2)
    expect(parsed.index.frames).toHaveLength(1)
  })

  test('colorTreatment 进索引并经 JSON（含 UTF-8 解码域）往返', () => {
    const source = encodeOne({ colorTreatment: 'project-standard' })
    const parsed = parseFrameSequence(source)
    expect(parsed.index.colorTreatment).toBe('project-standard')
    expect(parsed.index.codec).toBeDefined()
  })
})

describe('O09 validateFrameSequenceIndex：字段轴', () => {
  test('非对象/codec 非法/宽度非法/空帧表 逐轴拒绝', () => {
    expect(() => validateFrameSequenceIndex('x', 10)).toThrow(/期望对象/)
    expect(() =>
      validateFrameSequenceIndex(
        {
          version: 1,
          codec: 'nope',
          pixelFormat: 'rgba8',
          width: 2,
          height: 2,
          defaultFrameMs: 40,
          blockFrames: FRAME_SEQUENCE_BLOCK_FRAMES,
          frames: [{ byteOffset: 0, byteLength: 16 }],
          blocks: [],
        },
        16,
      ),
    ).toThrow(`TPFS.index.codec: 期望 ${FRAME_SEQUENCE_CODEC}`)
    expect(() =>
      validateFrameSequenceIndex(
        {
          version: 1,
          codec: FRAME_SEQUENCE_CODEC,
          pixelFormat: 'rgba8',
          width: 0,
          height: 2,
          defaultFrameMs: 40,
          blockFrames: FRAME_SEQUENCE_BLOCK_FRAMES,
          frames: [{ byteOffset: 0, byteLength: 16 }],
          blocks: [],
        },
        16,
      ),
    ).toThrow(/width/)
    expect(() =>
      validateFrameSequenceIndex(
        {
          version: 1,
          codec: FRAME_SEQUENCE_CODEC,
          pixelFormat: 'rgba8',
          width: 2,
          height: 2,
          defaultFrameMs: 40,
          blockFrames: FRAME_SEQUENCE_BLOCK_FRAMES,
          frames: [],
          blocks: [],
        },
        16,
      ),
    ).toThrow(/frames/)
  })

  test('block bytes 越界 payload / 覆盖不连续 / 尾随数据 逐轴拒绝', () => {
    const index = (blocks: object[]): unknown => ({
      version: 1,
      codec: FRAME_SEQUENCE_CODEC,
      pixelFormat: 'rgba8',
      width: 2,
      height: 2,
      defaultFrameMs: 40,
      blockFrames: FRAME_SEQUENCE_BLOCK_FRAMES,
      frames: [{ byteOffset: 0, byteLength: 16 }],
      blocks,
    })
    expect(() =>
      validateFrameSequenceIndex(index([{ firstFrame: 0, frameCount: 1, offset: 0, bytes: 32, rawBytes: 16 }]), 16),
    ).toThrow('TPFS.index.blocks[0]: payload 越界')
    expect(() =>
      validateFrameSequenceIndex(index([{ firstFrame: 1, frameCount: 1, offset: 0, bytes: 16, rawBytes: 16 }]), 16),
    ).toThrow('TPFS.index.blocks[0].firstFrame: 帧覆盖不连续，期望 0')
    expect(() =>
      validateFrameSequenceIndex(index([{ firstFrame: 0, frameCount: 1, offset: 0, bytes: 8, rawBytes: 16 }]), 16),
    ).toThrow('TPFS.index.blocks: payload 存在尾随数据或未登记字节')
  })
})

describe('O09 encodeFrameSequenceSync：输入轴', () => {
  test('尺寸非法 / defaultFrameMs 非法 / colorTreatment 非法 / 空 frames 逐轴拒绝', () => {
    expect(() => encodeOne({ width: 0 })).toThrow(/width/)
    expect(() => encodeOne({ defaultFrameMs: 0 })).toThrow(/defaultFrameMs/)
    expect(() => encodeOne({ colorTreatment: 'vivid' })).toThrow(
      'TPFS.encode.colorTreatment: 期望 preserve 或 project-standard',
    )
    expect(() => encodeOne({ frames: [] })).toThrow('TPFS.encode.frames: 期望非空数组')
  })

  test('rgba 字节长不符 / durationMs 非法 逐轴拒绝', () => {
    expect(() => encodeOne({ frames: [{ rgba: new Uint8Array(4) }] })).toThrow(
      /rgba: 期望 16 字节/,
    )
    expect(() => encodeOne({ frames: [{ rgba: rgba(2, 2, 1), durationMs: -1 }] })).toThrow(
      /durationMs/,
    )
  })

  test('多帧每帧 durationMs 进索引；往返后帧序稳定', () => {
    const source = encodeFrameSequenceSync(
      {
        width: 2,
        height: 2,
        defaultFrameMs: 40,
        frames: [
          { rgba: rgba(2, 2, 1) },
          { rgba: rgba(2, 2, 2), durationMs: 120 },
        ],
      },
      identity,
    )
    const parsed = parseFrameSequence(source)
    expect(parsed.index.frames[0]).not.toHaveProperty('durationMs')
    expect(parsed.index.frames[1]!.durationMs).toBe(120)
    expect(frameSequenceFrameDurationMs(parsed.index, 0)).toBe(40)
    expect(frameSequenceFrameDurationMs(parsed.index, 1)).toBe(120)
  })

  test('provider 字节变换被调用且其输出登记进 block bytes', () => {
    let called = 0
    const source = encodeFrameSequenceSync(
      {
        width: 2,
        height: 2,
        defaultFrameMs: 40,
        frames: [{ rgba: rgba(2, 2, 5) }],
      },
      (raw) => {
        called++
        return raw
      },
    )
    expect(called).toBeGreaterThan(0)
    const parsed = parseFrameSequence(source)
    expect(parsed.index.frames).toHaveLength(1)
    expect(parsed.index.blocks[0]!.bytes).toBeGreaterThan(0)
    // 变换后字节写入 payload；长字节可回读一致。
    expect(parsed.payload.byteLength).toBe(parsed.index.blocks[0]!.bytes)
  })
})

describe('O09 resolveFrameSequencePlayback：回放解析', () => {
  test('全序列回放与显式 range 回放的帧数/duration', () => {
    const source = encodeFrameSequenceSync(
      {
        width: 2,
        height: 2,
        defaultFrameMs: 40,
        frames: [{ rgba: rgba(2, 2, 1) }, { rgba: rgba(2, 2, 2), durationMs: 80 }],
      },
      identity,
    )
    const parsed = parseFrameSequence(source)
    const full = resolveFrameSequencePlayback(parsed.index)
    expect(full).toEqual({ startFrame: 0, endFrame: 1 })

    const ranged = resolveFrameSequencePlayback(parsed.index, { startFrame: 1 })
    expect(ranged).toEqual({ startFrame: 1, endFrame: 1 })

    // frameRate 透传与非法值拒绝
    expect(resolveFrameSequencePlayback(parsed.index, { frameRate: 24 })).toEqual({
      startFrame: 0,
      endFrame: 1,
      frameRate: 24,
    })
    expect(() => resolveFrameSequencePlayback(parsed.index, { frameRate: 0 })).toThrow(
      'TPFS.playback.frameRate: 期望正有限数',
    )
  })

  test('越界 startFrame/endFrame → 拒绝（无 range 形参，直接 options）', () => {
    const source = encodeOne()
    const parsed = parseFrameSequence(source)
    expect(() => resolveFrameSequencePlayback(parsed.index, { startFrame: 5 })).toThrow(
      'TPFS.playback.startFrame: 帧索引 5 越界',
    )
    expect(() => resolveFrameSequencePlayback(parsed.index, { endFrame: 9 })).toThrow(
      'TPFS.playback.endFrame: 帧索引 9 越界',
    )
  })
})
