/**
 * TEST-EDITOR-IMPORT-CODEC-1 C5：frame-animation-codec TPFS 合同（frame-animation-codec.ts）。
 * source 容器一律用产品 encodeFrameAnimationRequest 自产（真实 deflate + 真实 TPFS 守卫），
 * 不手写魔数。覆盖：sourceFrame 惰性恢复往返、块缓存 ≤2（DecompressionStream 计数见证）、
 * 缺源/越界/小数守卫、quantize 最近色与错误面。
 */

import { decodeFrameSequenceFrame, parseFrameSequence } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  encodeFrameAnimationRequest,
  type FrameAnimationEncodeRequest,
  quantizeFrameAnimationRequest,
} from './frame-animation-codec.js'

const W = 2
const H = 2
const FRAME_BYTES = W * H * 4

function rgbaFrame(value: number): ArrayBuffer {
  const out = new ArrayBuffer(FRAME_BYTES)
  new Uint8Array(out).fill(value)
  return out
}

async function buildSource(frameCount: number): Promise<Uint8Array> {
  const frames = Array.from({ length: frameCount }, (_, index) => ({
    rgba: rgbaFrame(index + 1),
  }))
  return encodeFrameAnimationRequest({
    width: W,
    height: H,
    defaultFrameMs: 100,
    colorTreatment: 'preserve',
    frames,
  })
}

/** 镜像产品 transform 的 inflate（decodeFrameSequenceFrame 的调用契约）。 */
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = bytes.slice().buffer
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decodeTpfsFrame(container: Uint8Array, index: number): Promise<Uint8Array> {
  return decodeFrameSequenceFrame(parseFrameSequence(container), index, inflate)
}

/** 拒绝见证取值形式（mutation 负控下 produces 纯 AssertionError，非 vitest 内部 Error）。 */
async function rejectionOf(promise: Promise<unknown>): Promise<string> {
  return promise.then(
    () => '<<resolved>>',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('C5 sourceFrame 惰性恢复往返', () => {
  test('新动画混排 rgba 新帧与 sourceFrame 旧帧：内容逐字节还原，durationMs 只落在声明帧', async () => {
    const source = await buildSource(40)
    const request: FrameAnimationEncodeRequest = {
      width: W,
      height: H,
      defaultFrameMs: 100,
      colorTreatment: 'preserve',
      source: source.slice().buffer,
      frames: [{ rgba: rgbaFrame(0xab) }, { sourceFrame: 39, durationMs: 50 }, { sourceFrame: 0 }],
    }
    const result = await encodeFrameAnimationRequest(request)
    const parsed = parseFrameSequence(result)
    expect(parsed.index.frames).toHaveLength(3)
    expect(parsed.index.frames[0]).toEqual({})
    expect(parsed.index.frames[1]).toEqual({ durationMs: 50 })
    expect(parsed.index.frames[2]).toEqual({})
    expect(await decodeTpfsFrame(result, 0)).toEqual(new Uint8Array(FRAME_BYTES).fill(0xab))
    expect(await decodeTpfsFrame(result, 1)).toEqual(await decodeTpfsFrame(source, 39))
    expect(await decodeTpfsFrame(result, 2)).toEqual(await decodeTpfsFrame(source, 0))
  })
  test('缺旧动画来源 / 越界 / 非整数 sourceFrame 各自拒绝', async () => {
    const source = await buildSource(4)
    const base = {
      width: W,
      height: H,
      defaultFrameMs: 100,
      colorTreatment: 'preserve' as const,
      source: source.slice().buffer,
    }
    expect(
      await rejectionOf(
        encodeFrameAnimationRequest({ ...base, source: undefined, frames: [{ sourceFrame: 0 }] }),
      ),
    ).toBe('保存帧 0: 缺旧动画来源')
    for (const bad of [4, -1, 1.5]) {
      expect(
        await rejectionOf(encodeFrameAnimationRequest({ ...base, frames: [{ sourceFrame: bad }] })),
      ).toBe(`保存帧来源索引 ${bad} 越界`)
    }
  })
})

describe('C5 块缓存 ≤2（按 DecompressionStream 构造计数见证）', () => {
  test('跨三块引用 5 帧只解码 4 块；命中帧不重解压', async () => {
    const source = await buildSource(65) // 3 块：0-31 / 32-63 / 64
    const RealDecompressionStream = DecompressionStream
    let decompressions = 0
    vi.stubGlobal(
      'DecompressionStream',
      class extends RealDecompressionStream {
        constructor(format: ConstructorParameters<typeof RealDecompressionStream>[0]) {
          decompressions += 1
          super(format)
        }
      },
    )
    const request: FrameAnimationEncodeRequest = {
      width: W,
      height: H,
      defaultFrameMs: 100,
      colorTreatment: 'preserve',
      source: source.slice().buffer,
      // 0→块0，32→块1，64→块2（逐出块0），33→块1命中，1→块0重解
      frames: [
        { sourceFrame: 0 },
        { sourceFrame: 32 },
        { sourceFrame: 64 },
        { sourceFrame: 33 },
        { sourceFrame: 1 },
      ],
    }
    const result = await encodeFrameAnimationRequest(request)
    expect(decompressions).toBe(4) // 无缓存=5；缓存=1 也是 5；容量 2 恰为 4
    vi.unstubAllGlobals()
    expect(await decodeTpfsFrame(result, 3)).toEqual(await decodeTpfsFrame(source, 33))
  })
  test('尾部块驻留后回到中间块命中：三块引用只解码 3 次', async () => {
    const source = await buildSource(65)
    const RealDecompressionStream = DecompressionStream
    let decompressions = 0
    vi.stubGlobal(
      'DecompressionStream',
      class extends RealDecompressionStream {
        constructor(format: ConstructorParameters<typeof RealDecompressionStream>[0]) {
          decompressions += 1
          super(format)
        }
      },
    )
    await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 100,
      colorTreatment: 'preserve',
      source: source.slice().buffer,
      // 0→块0，33→块1，64→块2（逐出块0），32→块1仍驻留
      frames: [{ sourceFrame: 0 }, { sourceFrame: 33 }, { sourceFrame: 64 }, { sourceFrame: 32 }],
    })
    expect(decompressions).toBe(3)
  })
})

describe('C5 quantizeFrameAnimationRequest 完整帧量化', () => {
  const colors = [
    [255, 0, 0],
    [0, 0, 255],
  ] as const

  test('最近色吸附、透明像素与 alpha 原样保留、输出为独立副本', () => {
    const input = new Uint8Array([255, 10, 10, 255, 250, 0, 0, 128, 9, 9, 250, 0, 7, 200, 7, 255])
    const inputBuffer = input.buffer as ArrayBuffer
    const inputBefore = input.slice() // 调用前快照实际传入的同一 buffer
    const out = quantizeFrameAnimationRequest({
      width: W,
      height: H,
      colors,
      mode: 'nearest',
      frames: [inputBuffer], // 传实际 buffer（非 slice 副本）
    })
    expect(out).toHaveLength(1)
    expect(out[0]!.byteLength).toBe(FRAME_BYTES)
    const snapshot = new Uint8Array(out[0]!)
    // alpha 255 像素吸附最近色；alpha 原样；alpha 0 透明像素整像素跳过（RGB 保持原值）
    expect(snapshot).toEqual(
      new Uint8Array([255, 0, 0, 255, 255, 0, 0, 128, 9, 9, 250, 0, 255, 0, 0, 255]),
    )
    snapshot[0] = (snapshot[0] ?? 0) ^ 0xff
    // 实参保真：改输出后，实际传入的同一 buffer 仍与调用前一致（原地污染即红）
    expect(input).toEqual(inputBefore)
    expect(new Uint8Array(inputBuffer)).toEqual(inputBefore)
  })
  test('未知量化方式与空色彩表拒绝；floyd-steinberg 单像素精确吸附', () => {
    const frame = new Uint8Array([250, 3, 3, 255]).buffer
    expect(() =>
      quantizeFrameAnimationRequest({
        width: 1,
        height: 1,
        colors,
        mode: 'bogus' as 'nearest',
        frames: [frame],
      }),
    ).toThrow('未知量化方式 bogus')
    expect(() =>
      quantizeFrameAnimationRequest({
        width: 1,
        height: 1,
        colors: [],
        mode: 'nearest',
        frames: [frame],
      }),
    ).toThrow('项目标准色彩不能为空')
    const [out] = quantizeFrameAnimationRequest({
      width: 1,
      height: 1,
      colors,
      mode: 'floyd-steinberg',
      frames: [frame],
    })
    expect(new Uint8Array(out!)).toEqual(new Uint8Array([255, 0, 0, 255]))
  })
})
