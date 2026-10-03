/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C07-G03：frame-animation-codec 合成 TPFS 与边界 IO。
 * 排重：codec.test/tpfs.test/worker.test 已证重排往返与块缓存；C04 已证 UI 保存链。
 * 本组只补：纯 rgba 批量合成、metadata 边界、缺帧索引与 quantize 多帧独立副本。
 */
import { decodeFrameSequenceFrame, parseFrameSequence } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  encodeFrameAnimationRequest,
  quantizeFrameAnimationRequest,
} from './frame-animation-codec.js'

const W = 2
const H = 1

function rgba(r: number, g: number, b: number): ArrayBuffer {
  return Uint8Array.from([r, g, b, 255, r, g, b, 255]).buffer
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decodeFrame(container: Uint8Array, index: number): Promise<Uint8Array> {
  return decodeFrameSequenceFrame(parseFrameSequence(container), index, inflate)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('C07-G03 合成 rgba 编码', () => {
  test('C07-G03-01 三帧纯 rgba：帧数与 defaultFrameMs 写入 index', async () => {
    const encoded = await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 33,
      colorTreatment: 'preserve',
      frames: [
        { rgba: rgba(1, 0, 0) },
        { rgba: rgba(0, 1, 0), durationMs: 50 },
        { rgba: rgba(0, 0, 1) },
      ],
    })
    const parsed = parseFrameSequence(encoded)
    expect(parsed.index.frames).toEqual([{}, { durationMs: 50 }, {}])
    expect(parsed.index.defaultFrameMs).toBe(33)
    expect(await decodeFrame(encoded, 1)).toEqual(new Uint8Array(rgba(0, 1, 0)))
  })

  test('C07-G03-02 colorTreatment project-standard 写入 index', async () => {
    const encoded = await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 40,
      colorTreatment: 'project-standard',
      frames: [{ rgba: rgba(9, 9, 9) }],
    })
    expect(parseFrameSequence(encoded).index.colorTreatment).toBe('project-standard')
  })

  test('C07-G03-03 单帧最小合成：TPFS 魔数与宽高', async () => {
    const encoded = await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: rgba(2, 2, 2) }],
    })
    expect([...encoded.slice(0, 4)]).toEqual([...'TPFS'].map((c) => c.charCodeAt(0)))
    expect(parseFrameSequence(encoded).index.width).toBe(W)
  })

  test('C07-G03-04 缺旧源 sourceFrame 拒绝（合成边界）', async () => {
    await expect(
      encodeFrameAnimationRequest({
        width: W,
        height: H,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: [{ sourceFrame: 0 }],
      }),
    ).rejects.toThrow('缺旧动画来源')
  })

  test('C07-G03-05 越界 sourceFrame 带小数索引拒绝', async () => {
    const source = await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: rgba(1, 1, 1) }],
    })
    await expect(
      encodeFrameAnimationRequest({
        width: W,
        height: H,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        source: source.slice().buffer,
        frames: [{ sourceFrame: 1.2 }],
      }),
    ).rejects.toThrow('越界')
  })

  test('C07-G03-06 混排 sourceFrame 与 rgba：逐帧字节还原', async () => {
    const source = await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: rgba(4, 0, 0) }, { rgba: rgba(0, 4, 0) }],
    })
    const edited = await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      source: source.slice().buffer,
      frames: [{ sourceFrame: 1 }, { rgba: rgba(0, 0, 5) }],
    })
    expect(await decodeFrame(edited, 0)).toEqual(await decodeFrame(source, 1))
    expect(await decodeFrame(edited, 1)).toEqual(new Uint8Array(rgba(0, 0, 5)))
  })

  test('C07-G03-07 两次 encode 同输入：sha256 级 bytes 一致', async () => {
    const request = {
      width: W,
      height: H,
      defaultFrameMs: 40,
      colorTreatment: 'preserve' as const,
      frames: [{ rgba: rgba(7, 7, 7) }, { rgba: rgba(8, 8, 8) }],
    }
    const a = await encodeFrameAnimationRequest(request)
    const b = await encodeFrameAnimationRequest(request)
    expect(new Uint8Array(a)).toEqual(new Uint8Array(b))
  })

  test('C07-G03-08 quantize 两帧输出互异且输入 buffer 不被改写', () => {
    const f0 = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255])
    const f1 = new Uint8Array([0, 0, 255, 255, 0, 0, 255, 255])
    const snap0 = f0.slice()
    const snap1 = f1.slice()
    const out = quantizeFrameAnimationRequest({
      width: W,
      height: H,
      colors: [
        [255, 0, 0],
        [0, 0, 255],
      ],
      mode: 'nearest',
      frames: [f0.buffer, f1.buffer],
    })
    expect(new Uint8Array(out[0]!)).toEqual(snap0)
    expect(new Uint8Array(out[1]!)).toEqual(snap1)
    expect(f0).toEqual(snap0)
    expect(f1).toEqual(snap1)
    expect(out[0]).not.toBe(out[1])
  })

  test('C07-G03-09 quantize 输出改色不影响下一帧结果', () => {
    const frame = new Uint8Array([250, 1, 1, 255, 250, 1, 1, 255]).buffer
    const [a, b] = quantizeFrameAnimationRequest({
      width: W,
      height: H,
      colors: [[255, 0, 0]],
      mode: 'nearest',
      frames: [frame, frame],
    })
    new Uint8Array(a!)[0] = 0
    expect(new Uint8Array(b!)[0]).toBe(255)
  })

  test('C07-G03-10 DecompressionStream 构造计数：跨块 sourceFrame 引用触发解压 IO', async () => {
    const source = await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: Array.from({ length: 33 }, (_, index) => ({ rgba: rgba(index, 0, 0) })),
    })
    let decompressions = 0
    const Real = DecompressionStream
    vi.stubGlobal(
      'DecompressionStream',
      class extends Real {
        constructor(format: ConstructorParameters<typeof Real>[0]) {
          decompressions += 1
          super(format)
        }
      },
    )
    await encodeFrameAnimationRequest({
      width: W,
      height: H,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      source: source.slice().buffer,
      frames: [{ sourceFrame: 0 }, { sourceFrame: 32 }],
    })
    expect(decompressions).toBeGreaterThanOrEqual(1)
    expect(decompressions).toBeLessThanOrEqual(2)
  })
})
