import { describe, expect, test, vi } from 'vitest'
import { deflateBytes, inflateBytes } from './__tests__/frame-sequence-test-codecs.mjs'
import {
  decodeFrameSequenceBlock,
  decodeFrameSequenceFrame,
  type EncodeFrameSequenceProviderInput,
  encodeFrameSequenceFromProvider,
  parseFrameSequence,
} from './frame-sequence.js'

interface ProviderJournal {
  frameReads: number[]
  deflatedRawByteLengths: number[]
}

const newJournal = (): ProviderJournal => ({ frameReads: [], deflatedRawByteLengths: [] })

function recordedDeflate(journal: ProviderJournal) {
  return (bytes: Uint8Array): Uint8Array => {
    journal.deflatedRawByteLengths.push(bytes.byteLength)
    return deflateBytes(bytes)
  }
}

function recordedProvider(
  frame: EncodeFrameSequenceProviderInput['frame'],
  journal: ProviderJournal,
): EncodeFrameSequenceProviderInput['frame'] {
  return (index) => {
    journal.frameReads.push(index)
    return frame(index)
  }
}

const tinyFrame = (index: number) => Uint8Array.of(index, index, index, 255)

const baseProvider = (
  frame: (index: number) => Uint8Array | Promise<Uint8Array>,
  frameCount = 1,
): EncodeFrameSequenceProviderInput => ({
  width: 1,
  height: 1,
  defaultFrameMs: 100,
  frames: Array.from({ length: frameCount }, () => ({})),
  frame,
})

describe('provider metadata validation', () => {
  test('width0 与 height0 分别在任意 frame/deflate 调用前精确拒收', async () => {
    const journal = newJournal()
    const frame = recordedProvider(() => tinyFrame(0), journal)
    for (const [field, value] of [
      ['width', 0],
      ['height', 0],
    ] as const) {
      const input = {
        ...baseProvider(frame),
        [field]: value,
      }
      await expect(
        encodeFrameSequenceFromProvider(input, recordedDeflate(journal)),
      ).rejects.toThrow(`TPFS.encode.${field}: 期望不小于 1 的安全整数`)
    }
    expect(journal.frameReads).toEqual([])
    expect(journal.deflatedRawByteLengths).toEqual([])
  })

  test('defaultFrameMs 0/NaN 同一数值时序域拒收且字段路径精确，零 IO', async () => {
    const journal = newJournal()
    const frame = recordedProvider(() => tinyFrame(0), journal)
    for (const bad of [0, Number.NaN]) {
      const input = { ...baseProvider(frame), defaultFrameMs: bad }
      await expect(
        encodeFrameSequenceFromProvider(input, recordedDeflate(journal)),
      ).rejects.toThrow('TPFS.encode.defaultFrameMs: 期望正有限数')
    }
    expect(journal.frameReads).toEqual([])
    expect(journal.deflatedRawByteLengths).toEqual([])
  })
})

describe('provider output size', () => {
  test('首帧返回 3 字节：精确 rgba 错误，后续帧与压缩均不发生', async () => {
    const journal = newJournal()
    const provider = recordedProvider(() => Uint8Array.from([1, 2, 3]), journal)
    await expect(
      encodeFrameSequenceFromProvider(baseProvider(provider, 2), recordedDeflate(journal)),
    ).rejects.toThrow('TPFS.encode.frames[0].rgba: 期望 4 字节')
    // 两帧合法 descriptors：读序恰 [0]，frame1 未被读，压缩零次。
    expect(journal.frameReads).toEqual([0])
    expect(journal.deflatedRawByteLengths).toEqual([])
  })

  test('第二 block 首帧（frame32）返回 3 字节：首 block 恰压缩一次，故障保持局部', async () => {
    const journal = newJournal()
    const provider = recordedProvider(
      (index) => (index === 32 ? Uint8Array.from([1, 2, 3]) : tinyFrame(index)),
      journal,
    )
    await expect(
      encodeFrameSequenceFromProvider(baseProvider(provider, 33), recordedDeflate(journal)),
    ).rejects.toThrow('TPFS.encode.frames[32].rgba: 期望 4 字节')
    expect(journal.frameReads).toEqual(Array.from({ length: 33 }, (_unused, i) => i))
    expect(journal.deflatedRawByteLengths).toEqual([4 * 32])
  })
})

describe('provider and compressor failure propagation', () => {
  test('首块完成后 provider 在 frame32 抛自有 Error：读序 0..32、恰一次先压缩、同一拒绝对象', async () => {
    const journal = newJournal()
    const owned = new Error('provider source lost at 32')
    const provider = recordedProvider((index) => {
      if (index === 32) throw owned
      return tinyFrame(index)
    }, journal)
    const rejection = encodeFrameSequenceFromProvider(
      baseProvider(provider, 65),
      recordedDeflate(journal),
    )
    await expect(rejection).rejects.toBe(owned)
    expect(journal.frameReads).toEqual(Array.from({ length: 33 }, (_unused, i) => i))
    expect(journal.deflatedRawByteLengths).toEqual([4 * 32])
  })

  test('deflate 拒绝自有 AbortError：同一对象与 name，下一 block 读取不发生', async () => {
    const journal = newJournal()
    const abort = Object.assign(new Error('deflate cancelled'), { name: 'AbortError' })
    const provider = recordedProvider((index) => tinyFrame(index), journal)
    const rejection = encodeFrameSequenceFromProvider(baseProvider(provider, 65), (bytes) => {
      journal.deflatedRawByteLengths.push(bytes.byteLength)
      return Promise.reject(abort)
    })
    await expect(rejection).rejects.toBe(abort)
    expect(journal.deflatedRawByteLengths).toEqual([4 * 32])
    expect(journal.frameReads).toEqual(Array.from({ length: 32 }, (_unused, i) => i))
  })

  test('首块压缩成功、第二块压缩失败：恰两次压缩、读满 0..63、永不读 frame64', async () => {
    const journal = newJournal()
    const compressorFailure = new Error('second block compressor failed')
    let compressions = 0
    const provider = recordedProvider((index) => tinyFrame(index), journal)
    const rejection = encodeFrameSequenceFromProvider(baseProvider(provider, 65), (bytes) => {
      compressions += 1
      journal.deflatedRawByteLengths.push(bytes.byteLength)
      if (compressions === 2) return Promise.reject(compressorFailure)
      return deflateBytes(bytes)
    })
    await expect(rejection).rejects.toBe(compressorFailure)
    expect(journal.deflatedRawByteLengths).toEqual([128, 128])
    expect(journal.frameReads).toEqual(Array.from({ length: 64 }, (_unused, i) => i))
  })
})

describe('provider sequencing and compression backpressure', () => {
  test('deferred frame0 未决时无 frame1/deflate；resolve 后产出完整合法输出', async () => {
    const journal = newJournal()
    let resolveFrame0: ((value: Uint8Array) => void) | undefined
    const provider = recordedProvider(
      (index) =>
        index === 0
          ? new Promise<Uint8Array>((resolve) => {
              resolveFrame0 = resolve
            })
          : tinyFrame(index),
      journal,
    )
    const pending = encodeFrameSequenceFromProvider(
      baseProvider(provider, 2),
      recordedDeflate(journal),
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(journal.frameReads).toEqual([0])
    expect(journal.deflatedRawByteLengths).toEqual([])
    resolveFrame0?.(tinyFrame(0))
    const bytes = await pending
    const parsed = parseFrameSequence(bytes)
    expect(parsed.index.frames).toHaveLength(2)
    const decoded = await decodeFrameSequenceBlock(parsed, 0, inflateBytes)
    expect(decoded).toEqual([tinyFrame(0), tinyFrame(1)])
  })

  test('首块 deflate 未决期间只读 0..31（无 read-ahead）；resolve 后读 32 并完整往返', async () => {
    const journal = newJournal()
    let releaseDeflate: (() => void) | undefined
    let markCompressionEntered: (() => void) | undefined
    const compressionEntered = new Promise<void>((resolve) => {
      markCompressionEntered = resolve
    })
    const provider = recordedProvider((index) => tinyFrame(index), journal)
    let deflates = 0
    const pending = encodeFrameSequenceFromProvider(baseProvider(provider, 33), (bytes) => {
      deflates += 1
      journal.deflatedRawByteLengths.push(bytes.byteLength)
      if (deflates > 1) return deflateBytes(bytes)
      return new Promise<Uint8Array>((resolve) => {
        releaseDeflate = () => resolve(deflateBytes(bytes))
        markCompressionEntered?.()
      })
    })
    await Promise.race([
      compressionEntered,
      pending.then(() => {
        throw new Error('encoding finished before the first compression gate')
      }),
    ])
    try {
      expect(journal.frameReads).toEqual(Array.from({ length: 32 }, (_unused, i) => i))
      expect(journal.deflatedRawByteLengths).toEqual([4 * 32])
    } finally {
      releaseDeflate?.()
    }
    const bytes = await pending
    const parsed = parseFrameSequence(bytes)
    expect(parsed.index.blocks).toHaveLength(2)
    expect(journal.frameReads).toEqual(Array.from({ length: 33 }, (_unused, i) => i))
    expect(journal.deflatedRawByteLengths).toEqual([4 * 32, 4])
    const block0 = await decodeFrameSequenceBlock(parsed, 0, inflateBytes)
    const block1 = await decodeFrameSequenceBlock(parsed, 1, inflateBytes)
    const all = [...block0, ...block1]
    expect(all).toHaveLength(33)
    for (let index = 0; index < 33; index++)
      expect([...all[index]!], `frame ${index}`).toEqual([...tinyFrame(index)])
  })
})

describe('decoder ownership and cancellation', () => {
  const realSequence = () => {
    const journal = newJournal()
    const provider = recordedProvider((index) => tinyFrame(index), journal)
    return encodeFrameSequenceFromProvider(baseProvider(provider, 2), recordedDeflate(journal))
  }

  test('解码帧各拥独立缓冲：改 frame0 不影响 frame1/inflate 原始输出/载荷', async () => {
    const sequence = parseFrameSequence(await realSequence())
    let rawFromInflate: Uint8Array | undefined
    const captureInflate = (bytes: Uint8Array): Uint8Array => {
      rawFromInflate = inflateBytes(bytes)
      return rawFromInflate
    }
    const payloadBefore = Uint8Array.from(sequence.payload)
    const frames = await decodeFrameSequenceBlock(sequence, 0, captureInflate)
    expect(frames).toEqual([tinyFrame(0), tinyFrame(1)])
    const rawBefore = Uint8Array.from(rawFromInflate!)
    frames[0]![0] = 255
    expect(frames[1]).toEqual(tinyFrame(1))
    expect([...rawFromInflate!]).toEqual([...rawBefore])
    expect([...sequence.payload]).toEqual([...payloadBefore])
  })

  test('inflate 拒绝自有 AbortError：取消分类器与同一对象身份保持', async () => {
    const sequence = parseFrameSequence(await realSequence())
    const abort = Object.assign(new Error('inflate cancelled'), { name: 'AbortError' })
    await expect(decodeFrameSequenceBlock(sequence, 0, () => Promise.reject(abort))).rejects.toBe(
      abort,
    )
  })
})

const rgba = Uint8Array.of(7, 19, 103, 211)

test('TPFS provider validates metadata before reads and preserves fractional timings and explicit color policy', async () => {
  const frame = vi.fn(async () => rgba.slice())
  const deflate = vi.fn(deflateBytes)
  const input: EncodeFrameSequenceProviderInput = {
    width: 1,
    height: 1,
    defaultFrameMs: 0.5,
    colorTreatment: 'project-standard',
    frames: [{ durationMs: 1.5 }],
    frame,
  }
  const good = parseFrameSequence(await encodeFrameSequenceFromProvider(input, deflate))
  expect(good.index).toMatchObject({
    defaultFrameMs: 0.5,
    colorTreatment: 'project-standard',
    frames: [{ durationMs: 1.5 }],
  })
  expect(await decodeFrameSequenceFrame(good, 0, inflateBytes)).toEqual(rgba)
  frame.mockClear()
  deflate.mockClear()
  await expect(encodeFrameSequenceFromProvider({ ...input, frames: [] }, deflate)).rejects.toThrow(
    new Error('TPFS.encode.frames: 期望非空数组'),
  )
  await expect(
    encodeFrameSequenceFromProvider({ ...input, frames: [{ durationMs: 0 }] }, deflate),
  ).rejects.toThrow(new Error('TPFS.encode.frames[0].durationMs: 期望正有限数'))
  expect(frame).not.toHaveBeenCalled()
  expect(deflate).not.toHaveBeenCalled()
})

test('TPFS provider failure preserves identity and stops before subsequent reads or compression', async () => {
  const failure = new Error('provider failed')
  const calls: number[] = []
  const deflate = vi.fn(deflateBytes)
  const input: EncodeFrameSequenceProviderInput = {
    width: 1,
    height: 1,
    defaultFrameMs: 40,
    frames: [{}, {}, {}],
    frame: async (index) => {
      calls.push(index)
      if (index === 1) throw failure
      return rgba.slice()
    },
  }
  await expect(encodeFrameSequenceFromProvider(input, deflate)).rejects.toBe(failure)
  expect(calls).toEqual([0, 1])
  expect(deflate).not.toHaveBeenCalled()
  expect(input.frames).toEqual([{}, {}, {}])
})
