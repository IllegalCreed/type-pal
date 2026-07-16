import { describe, expect, test } from 'vitest'
import {
  decodeFrameSequenceBlock,
  decodeFrameSequenceFrame,
  encodeFrameSequence,
  encodeFrameSequenceFromProvider,
  encodeFrameSequenceSync,
  type FrameSequenceIndexV1,
  frameSequenceFrameDurationMs,
  parseFrameSequence,
  resolveFrameSequencePlayback,
} from './frame-sequence.js'

const identity = (bytes: Uint8Array): Uint8Array => bytes.slice()

function makeFrames(count: number): Array<{ rgba: Uint8Array; durationMs?: number }> {
  return Array.from({ length: count }, (_, frame) => ({
    rgba: Uint8Array.from([
      frame & 0xff,
      (frame * 3) & 0xff,
      (255 - frame) & 0xff,
      frame % 2 === 0 ? 255 : 127,
      (frame * 7) & 0xff,
      42,
      99,
      255,
    ]),
    ...(frame === 3 ? { durationMs: 77 } : {}),
  }))
}

async function validContainer(frameCount = 35): Promise<Uint8Array> {
  return encodeFrameSequence(
    {
      width: 2,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: makeFrames(frameCount),
    },
    identity,
  )
}

function withIndex(
  source: Uint8Array,
  mutate: (index: FrameSequenceIndexV1) => void,
  payloadTransform: (payload: Uint8Array) => Uint8Array = identity,
): Uint8Array {
  const parsed = parseFrameSequence(source)
  const index = JSON.parse(JSON.stringify(parsed.index)) as FrameSequenceIndexV1
  mutate(index)
  const encodedIndex = Uint8Array.from(JSON.stringify(index), (char) => char.charCodeAt(0))
  const payload = payloadTransform(parsed.payload)
  const result = new Uint8Array(12 + encodedIndex.byteLength + payload.byteLength)
  result.set([0x54, 0x50, 0x46, 0x53, 1, 0, 0, 0])
  new DataView(result.buffer).setUint32(8, encodedIndex.byteLength, true)
  result.set(encodedIndex, 12)
  result.set(payload, 12 + encodedIndex.byteLength)
  return result
}

describe('TPFS v1 完整帧 round-trip', () => {
  test('跨 32 帧块逐像素恢复，alpha 与逐帧时长不丢失', async () => {
    const sourceFrames = makeFrames(35)
    const bytes = await validContainer()
    const parsed = parseFrameSequence(bytes)
    expect(parsed.index.blocks).toHaveLength(2)
    expect(parsed.index.blocks.map((block) => block.frameCount)).toEqual([32, 3])
    expect(parsed.index.frames[3]?.durationMs).toBe(77)

    const firstBlock = await decodeFrameSequenceBlock(parsed, 0, identity)
    expect(firstBlock).toHaveLength(32)
    for (const frame of [0, 1, 3, 31, 32, 34])
      await expect(decodeFrameSequenceFrame(parsed, frame, identity)).resolves.toEqual(
        sourceFrames[frame]?.rgba,
      )
  })

  test('编码同输入两次字节完全一致', async () => {
    await expect(validContainer()).resolves.toEqual(await validContainer())
    const input = {
      width: 2,
      height: 1,
      defaultFrameMs: 40,
      frames: makeFrames(35),
    }
    expect(encodeFrameSequenceSync(input, identity)).toEqual(
      await encodeFrameSequence(input, identity),
    )
  })

  test('完整帧提供器逐块编码且与普通编码器产出相同字节', async () => {
    const frames = makeFrames(35)
    const direct = await encodeFrameSequence(
      { width: 2, height: 1, defaultFrameMs: 40, frames },
      identity,
    )
    const requested: number[] = []
    const provided = await encodeFrameSequenceFromProvider(
      {
        width: 2,
        height: 1,
        defaultFrameMs: 40,
        frames: frames.map(({ durationMs }) => (durationMs === undefined ? {} : { durationMs })),
        frame(index) {
          requested.push(index)
          return frames[index]!.rgba
        },
      },
      identity,
    )
    expect(provided).toEqual(direct)
    expect(requested).toEqual(Array.from({ length: 35 }, (_value, index) => index))
  })

  test('播放区间 fail-loud，frameRate 优先于逐帧和默认时长', async () => {
    const { index } = parseFrameSequence(await validContainer())
    expect(resolveFrameSequencePlayback(index)).toEqual({ startFrame: 0, endFrame: 34 })
    expect(
      resolveFrameSequencePlayback(index, { startFrame: 3, endFrame: 8, frameRate: 20 }),
    ).toEqual({ startFrame: 3, endFrame: 8, frameRate: 20 })
    expect(frameSequenceFrameDurationMs(index, 3)).toBe(77)
    expect(frameSequenceFrameDurationMs(index, 4)).toBe(40)
    expect(frameSequenceFrameDurationMs(index, 3, 25)).toBe(40)
    expect(() => resolveFrameSequencePlayback(index, { startFrame: -1 })).toThrow('越界')
    expect(() => resolveFrameSequencePlayback(index, { endFrame: 35 })).toThrow('越界')
    expect(() => resolveFrameSequencePlayback(index, { startFrame: 8, endFrame: 3 })).toThrow(
      '不能大于',
    )
    expect(() => resolveFrameSequencePlayback(index, { frameRate: 0 })).toThrow('正有限数')
  })
})

describe('TPFS v1 坏容器 fail-loud', () => {
  test.each([
    ['魔数', (bytes: Uint8Array) => (bytes[0] = 0), '魔数'],
    ['版本', (bytes: Uint8Array) => (bytes[4] = 2), 'version'],
    ['保留位', (bytes: Uint8Array) => (bytes[6] = 1), '保留位'],
    [
      '索引长度端序或越界',
      (bytes: Uint8Array) => {
        bytes[8] = 0
        bytes[9] = 0
        bytes[10] = 0x10
        bytes[11] = 0
      },
      '索引越界',
    ],
  ])('%s', async (_name, mutate, message) => {
    const bytes = await validContainer()
    mutate(bytes)
    expect(() => parseFrameSequence(bytes)).toThrow(message)
  })

  test.each([
    [
      '坏尺寸',
      (index: FrameSequenceIndexV1) => {
        index.width = 0
      },
      'width',
    ],
    [
      '帧覆盖断裂',
      (index: FrameSequenceIndexV1) => {
        const second = index.blocks[1]
        if (second) second.firstFrame++
      },
      '帧覆盖不连续',
    ],
    [
      'payload 空洞',
      (index: FrameSequenceIndexV1) => {
        const second = index.blocks[1]
        if (second) second.offset++
      },
      'payload 必须连续',
    ],
    [
      'rawBytes 不符',
      (index: FrameSequenceIndexV1) => {
        const first = index.blocks[0]
        if (first) first.rawBytes--
      },
      'rawBytes',
    ],
  ])('%s', async (_name, mutate, message) => {
    const bytes = await validContainer()
    expect(() => parseFrameSequence(withIndex(bytes, mutate))).toThrow(message)
  })

  test('payload 越界、尾随数据和解压长度不符各自失败', async () => {
    const bytes = await validContainer()
    expect(() =>
      parseFrameSequence(
        withIndex(bytes, (index) => {
          const last = index.blocks.at(-1)
          if (last) last.bytes += 1
        }),
      ),
    ).toThrow('payload 越界')
    expect(() =>
      parseFrameSequence(
        withIndex(
          bytes,
          () => {},
          (payload) => {
            const expanded = new Uint8Array(payload.byteLength + 1)
            expanded.set(payload)
            return expanded
          },
        ),
      ),
    ).toThrow('尾随数据')

    const parsed = parseFrameSequence(bytes)
    await expect(
      decodeFrameSequenceBlock(parsed, 0, (compressed) => compressed.subarray(1)),
    ).rejects.toThrow('解压长度')
  })
})
