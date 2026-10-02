/** TEST-GLM-WAVE-O-1 O-NEXT2（O-NEXT2-01～12）：TPFS 完整帧提供器的 IO 顺序、
 *  压缩背压/失败身份、解码输出所有权与取消、非法公开块索引零 IO。
 *  旧证不重领：旧 35 帧正常/UTF-8/provider 首块 throw/同步空 deflate/同步宽度/
 *  bad-payload/正常 roundtrip/inflate 泛型 toThrow 均不在本文件范围（packet
 *  oldProofLimit 逐条钉住）；本文件只测未证臂：
 *  - 元数据在 IO 前拒收（01/02）与返回短字节的 provider 拒收域（03/04）；
 *  - 跨 block 渐进 IO 状态（05/07）、压缩 AbortError/失败身份与背压（06/08/09）；
 *  - 解码帧独立所有权（10）、inflate AbortError 身份保持（11）、非法块索引零 IO（12）。
 *  压缩/解压为产品声明的 port：真实 zlib 用于往返，记录/延迟/故障为声明式包装。
 */
import { describe, expect, test } from 'vitest'
import { bridgeDeflate } from './__tests__/glm-o/next2/node-zlib-bridge.mjs'
import {
  descriptors,
  newJournal,
  recordedDeflate,
  recordedInflate,
  recordedProvider,
  tinyFrame,
} from './__tests__/glm-o/next2/provider-ports.js'
import {
  decodeFrameSequenceBlock,
  type EncodeFrameSequenceProviderInput,
  encodeFrameSequenceFromProvider,
  parseFrameSequence,
} from './frame-sequence.js'

const baseProvider = (
  frame: (index: number) => Uint8Array | Promise<Uint8Array>,
  frameCount = 1,
): EncodeFrameSequenceProviderInput => ({
  width: 1,
  height: 1,
  defaultFrameMs: 100,
  frames: descriptors(frameCount),
  frame,
})

describe('O-NEXT2 provider 输入在 IO 前拒收（01/02）', () => {
  test('01 width0 与 height0 分别在任意 frame/deflate 调用前精确拒收', async () => {
    const journal = newJournal()
    const frame = recordedProvider(() => tinyFrame(0), journal)
    for (const [field, value] of [
      ['width', 0],
      ['height', 0],
    ] as const) {
      const input = {
        ...baseProvider(frame),
        [field]: value,
      } as EncodeFrameSequenceProviderInput
      await expect(
        encodeFrameSequenceFromProvider(input, recordedDeflate(journal)),
      ).rejects.toThrow(`TPFS.encode.${field}: 期望不小于 1 的安全整数`)
    }
    expect(journal.frameReads).toEqual([])
    expect(journal.deflatedRawByteLengths).toEqual([])
  })

  test('02 defaultFrameMs 0/NaN 同一数值时序域拒收且字段路径精确，零 IO', async () => {
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

describe('O-NEXT2 provider 返回短字节的拒收域（03/04）', () => {
  test('03 首帧返回 3 字节：精确 rgba 错误，后续帧与压缩均不发生', async () => {
    const journal = newJournal()
    const provider = recordedProvider(() => Uint8Array.from([1, 2, 3]), journal)
    await expect(
      encodeFrameSequenceFromProvider(baseProvider(provider, 2), recordedDeflate(journal)),
    ).rejects.toThrow('TPFS.encode.frames[0].rgba: 期望 4 字节')
    // 两帧合法 descriptors：读序恰 [0]，frame1 未被读，压缩零次。
    expect(journal.frameReads).toEqual([0])
    expect(journal.deflatedRawByteLengths).toEqual([])
  })

  test('04 第二 block 首帧（frame32）返回 3 字节：首 block 恰压缩一次，故障保持局部', async () => {
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

describe('O-NEXT2 跨 block 渐进 IO 与压缩失败身份（05/06/07）', () => {
  test('05 首块完成后 provider 在 frame32 抛自有 Error：读序 0..32、恰一次先压缩、同一拒绝对象', async () => {
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

  test('06 deflate 拒绝自有 AbortError：同一对象与 name，下一 block 读取不发生', async () => {
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

  test('07 首块压缩成功、第二块压缩失败：恰两次压缩、读满 0..63、永不读 frame64', async () => {
    const journal = newJournal()
    const compressorFailure = new Error('second block compressor failed')
    let compressions = 0
    const provider = recordedProvider((index) => tinyFrame(index), journal)
    const rejection = encodeFrameSequenceFromProvider(baseProvider(provider, 65), (bytes) => {
      compressions += 1
      journal.deflatedRawByteLengths.push(bytes.byteLength)
      if (compressions === 2) return Promise.reject(compressorFailure)
      return new Uint8Array(bytes)
    })
    await expect(rejection).rejects.toBe(compressorFailure)
    expect(compressions).toBe(2)
    expect(journal.frameReads).toEqual(Array.from({ length: 64 }, (_unused, i) => i))
    expect(journal.frameReads).not.toContain(64)
  })
})

describe('O-NEXT2 串行化与压缩背压（08/09）', () => {
  test('08 deferred frame0 未决时无 frame1/deflate；resolve 后产出完整合法输出', async () => {
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
    const decoded = await decodeFrameSequenceBlock(parsed, 0, recordedInflate(newJournal()))
    expect([...decoded[0]!]).toEqual([...tinyFrame(0)])
    expect([...decoded[1]!]).toEqual([...tinyFrame(1)])
  })

  test('09 首块 deflate 未决期间只读 0..31（无 read-ahead）；resolve 后读 32 并完整往返', async () => {
    const journal = newJournal()
    let releaseDeflate: (() => void) | undefined
    const provider = recordedProvider((index) => tinyFrame(index), journal)
    let deflates = 0
    const pending = encodeFrameSequenceFromProvider(baseProvider(provider, 33), (bytes) => {
      deflates += 1
      journal.deflatedRawByteLengths.push(bytes.byteLength)
      // 仅首块压缩挂起（背压观测点）；放行与后续块均走真实 zlib 压缩（R1-03）。
      if (deflates > 1) return bridgeDeflate(bytes)
      return new Promise<Uint8Array>((resolve) => {
        releaseDeflate = () => resolve(bridgeDeflate(bytes))
      })
    })
    // 同步 frame() 的 32 次串行 await 各占一个微任务；冲刷足够轮次让首块读满并进入 deflate。
    for (let flush = 0; flush < 100; flush++) await Promise.resolve()
    expect(journal.frameReads).toEqual(Array.from({ length: 32 }, (_unused, i) => i))
    expect(journal.deflatedRawByteLengths).toEqual([4 * 32])
    releaseDeflate?.()
    const bytes = await pending
    const parsed = parseFrameSequence(bytes)
    expect(parsed.index.blocks).toHaveLength(2)
    // 放行后第二块被读取并真实压缩：读序扩展到 32，压缩恰两次。
    expect(journal.frameReads).toEqual(Array.from({ length: 33 }, (_unused, i) => i))
    expect(journal.deflatedRawByteLengths).toEqual([4 * 32, 4])
    // 真实解压全部 33 帧并逐字节比较独立输入（R1-03 完整往返）。
    const decodeJournal = newJournal()
    const inflate = recordedInflate(decodeJournal)
    const block0 = await decodeFrameSequenceBlock(parsed, 0, inflate)
    const block1 = await decodeFrameSequenceBlock(parsed, 1, inflate)
    const all = [...block0, ...block1]
    expect(all).toHaveLength(33)
    for (let index = 0; index < 33; index++)
      expect([...all[index]!], `frame ${index}`).toEqual([...tinyFrame(index)])
  })
})

describe('O-NEXT2 解码所有权与取消（10/11/12）', () => {
  const realSequence = () => {
    const journal = newJournal()
    const provider = recordedProvider((index) => tinyFrame(index), journal)
    return encodeFrameSequenceFromProvider(baseProvider(provider, 2), recordedDeflate(journal))
  }

  test('10 解码帧各拥独立缓冲：改 frame0 不影响 frame1/inflate 原始输出/载荷', async () => {
    const sequence = parseFrameSequence(await realSequence())
    const journal = newJournal()
    let rawFromInflate: Uint8Array | undefined
    const captureInflate = (bytes: Uint8Array): Uint8Array => {
      journal.inflatedBlockBytes.push(bytes.byteLength)
      rawFromInflate = recordedInflate(journal)(bytes)
      return rawFromInflate
    }
    const payloadBefore = Uint8Array.from(sequence.payload)
    const frames = await decodeFrameSequenceBlock(sequence, 0, captureInflate)
    const frame1Before = Uint8Array.from(frames[1]!)
    const rawBefore = Uint8Array.from(rawFromInflate!)
    frames[0]![0] = (frames[0]![0]! ^ 0xff) | 0
    expect([...frames[1]!]).toEqual([...frame1Before])
    expect([...rawFromInflate!]).toEqual([...rawBefore])
    expect([...sequence.payload]).toEqual([...payloadBefore])
  })

  test('11 inflate 拒绝自有 AbortError：取消分类器与同一对象身份保持', async () => {
    const sequence = parseFrameSequence(await realSequence())
    const abort = Object.assign(new Error('inflate cancelled'), { name: 'AbortError' })
    await expect(decodeFrameSequenceBlock(sequence, 0, () => Promise.reject(abort))).rejects.toBe(
      abort,
    )
  })

  test('12 非法公开块索引零 IO（cross-check：旧 resource-boundaries:83-106 四 fullName 已更强直证，不计净新）', async () => {
    const sequence = parseFrameSequence(await realSequence())
    const journal = newJournal()
    for (const bad of [-1, 0.5, 2]) {
      await expect(
        decodeFrameSequenceBlock(sequence, bad, recordedInflate(journal)),
        `index ${String(bad)}`,
      ).rejects.toThrow(`TPFS.block: 非法块索引 ${String(bad)}`)
    }
    expect(journal.inflatedBlockBytes).toEqual([])
  })
})
