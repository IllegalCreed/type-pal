/**
 * TEST-EDITOR-IMPORT-CODEC-1 C6：frame-animation-worker-client 边界。
 * 假 Worker 执行真实 structuredClone(message,{transfer})：证明传输列表里的副本
 * 真被 detach、而调用者原 buffer 完好（产品先 slice 再 transfer 的合同）。
 * 覆盖：请求 id 过滤、error 透传、缺结果、terminate、onerror、无 Worker 降级纯核。
 */

import { parseFrameSequence } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  encodeFrameAnimationInWorker,
  quantizeFrameAnimationInWorker,
} from './frame-animation-worker-client.js'

interface PostedMessage {
  id: number
  kind: 'encode' | 'quantize'
  request: {
    source?: ArrayBuffer
    frames: Array<{ rgba?: ArrayBuffer; sourceFrame?: number }>
  }
}

class FakeWorker {
  static instances: FakeWorker[] = []
  static reset(): void {
    FakeWorker.instances = []
  }
  url: URL
  /** original = 产品传入的原对象（transfer 后其缓冲应 detach）；message = worker 侧收到的克隆。 */
  posted: Array<{ original: PostedMessage; message: PostedMessage; transfer: Transferable[] }> = []
  terminated = 0
  onmessage:
    | ((event: {
        data: { id: number; bytes?: ArrayBuffer; frames?: ArrayBuffer[]; error?: string }
      }) => void)
    | null = null
  onerror: ((event: { message: string }) => void) | null = null

  constructor(url: URL, options: { type: string }) {
    this.url = url
    expect(url.pathname).toContain('frame-animation-codec.worker')
    expect(options.type).toBe('module')
    FakeWorker.instances.push(this)
  }
  postMessage(message: PostedMessage, transfer?: Transferable[]): void {
    // 真实 transfer 语义：传输列表内缓冲被移走（原对象 detach）、克隆持有字节
    const clone = structuredClone(message, { transfer: transfer ?? [] })
    this.posted.push({ original: message, message: clone, transfer: transfer ?? [] })
  }
  terminate(): void {
    this.terminated += 1
  }
  reply(data: { id: number; bytes?: ArrayBuffer; frames?: ArrayBuffer[]; error?: string }): void {
    this.onmessage?.({ data })
  }
  fail(message: string): void {
    this.onerror?.({ message })
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function installWorker(): void {
  FakeWorker.reset()
  vi.stubGlobal('Worker', FakeWorker)
}

const encodeRequest = () => ({
  width: 2,
  height: 2,
  defaultFrameMs: 100,
  colorTreatment: 'preserve' as const,
  source: new Uint8Array([1, 2, 3, 4]).buffer,
  frames: [{ rgba: new Uint8Array(16).fill(7).buffer }, { sourceFrame: 0 }] as Array<
    { rgba: ArrayBuffer } | { sourceFrame: number }
  >,
})

describe('C6 encodeFrameAnimationInWorker 传输与应答合同', () => {
  test('postMessage 传副本 detach、调用者原 buffer 完好；应答后 terminate 恰一次', async () => {
    installWorker()
    const request = encodeRequest()
    const sourceBytes = new Uint8Array(request.source).slice()
    const frameBytes = new Uint8Array((request.frames[0] as { rgba: ArrayBuffer }).rgba).slice()
    const promise = encodeFrameAnimationInWorker(request)
    const worker = FakeWorker.instances[0]!
    expect(worker.posted).toHaveLength(1)
    const { original, message, transfer } = worker.posted[0]!
    expect(message.kind).toBe('encode')
    // 原 postMessage 实参的缓冲被移走（真 transfer）；worker 侧克隆持有字节
    expect(original.request.source!.byteLength).toBe(0)
    expect(original.request.frames[0]!.rgba!.byteLength).toBe(0)
    expect(message.request.source!.byteLength).toBe(4)
    expect(message.request.frames[0]!.rgba!.byteLength).toBe(16)
    expect(transfer.length).toBe(2)
    // 调用者原 buffer 未 detach、内容未变
    expect(request.source.byteLength).toBe(4)
    expect(new Uint8Array(request.source)).toEqual(sourceBytes)
    expect((request.frames[0] as { rgba: ArrayBuffer }).rgba.byteLength).toBe(16)
    expect(new Uint8Array((request.frames[0] as { rgba: ArrayBuffer }).rgba)).toEqual(frameBytes)
    const answer = new Uint8Array([9, 9, 9, 9]).buffer
    worker.reply({ id: message.id, bytes: answer })
    const encoded = await promise
    expect(encoded).toEqual(new Uint8Array([9, 9, 9, 9]))
    expect(worker.terminated).toBe(1)
  })
  test('无关 id 应答被忽略不结算；正确 id 才 resolve', async () => {
    installWorker()
    let settled = false
    const promise = encodeFrameAnimationInWorker(encodeRequest()).finally(() => {
      settled = true
    })
    const worker = FakeWorker.instances[0]!
    worker.reply({ id: 999, bytes: new ArrayBuffer(4) })
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(worker.terminated).toBe(0)
    const id = worker.posted[0]!.message.id
    worker.reply({ id, bytes: new Uint8Array([1]).buffer })
    await promise
    expect(worker.terminated).toBe(1)
  })
  test('error 应答与缺 bytes 应答各自拒绝并 terminate', async () => {
    installWorker()
    const first = encodeFrameAnimationInWorker(encodeRequest())
    const w1 = FakeWorker.instances[0]!
    w1.reply({ id: w1.posted[0]!.message.id, error: '核心炸了' })
    await expect(first).rejects.toThrow('核心炸了')
    expect(w1.terminated).toBe(1)

    const second = encodeFrameAnimationInWorker(encodeRequest())
    const w2 = FakeWorker.instances[1]!
    const id = w2.posted[0]!.message.id
    w2.reply({ id })
    await expect(second).rejects.toThrow('帧动画编码 Worker 未返回数据')
    expect(w2.terminated).toBe(1)
  })
  test('onerror 透传消息并 terminate', async () => {
    installWorker()
    const promise = encodeFrameAnimationInWorker(encodeRequest())
    const worker = FakeWorker.instances[0]!
    worker.fail('SyntaxError: bad worker')
    await expect(promise).rejects.toThrow('SyntaxError: bad worker')
    expect(worker.terminated).toBe(1)
  })
})

describe('C6 quantizeFrameAnimationInWorker 传输与应答合同', () => {
  test('frames 副本传输 detach、原帧完好；应答转 Uint8Array；缺结果拒绝', async () => {
    installWorker()
    const frame = new Uint8Array(16).fill(3)
    const promise = quantizeFrameAnimationInWorker({
      width: 2,
      height: 2,
      colors: [[255, 0, 0]],
      mode: 'nearest',
      frames: [frame.buffer],
    })
    const worker = FakeWorker.instances[0]!
    const { original, message, transfer } = worker.posted[0]!
    expect(message.kind).toBe('quantize')
    const originalFrames = original.request.frames as ArrayBuffer[]
    const postedFrames = message.request.frames as ArrayBuffer[]
    expect(postedFrames).toHaveLength(1)
    expect(originalFrames[0]!.byteLength).toBe(0) // postMessage 实参缓冲被移走（真 transfer）
    expect(postedFrames[0]!.byteLength).toBe(16) // worker 侧克隆持有字节
    expect(transfer.length).toBe(1)
    expect(frame.buffer.byteLength).toBe(16) // 调用者原帧未 detach
    const answer = [new Uint8Array(16).fill(9).buffer]
    worker.reply({ id: message.id, frames: answer })
    const out = await promise
    expect(out).toEqual([new Uint8Array(16).fill(9)])
    expect(worker.terminated).toBe(1)

    const missing = quantizeFrameAnimationInWorker({
      width: 2,
      height: 2,
      colors: [[255, 0, 0]],
      mode: 'nearest',
      frames: [frame.buffer],
    })
    const w2 = FakeWorker.instances[1]!
    w2.reply({ id: w2.posted[0]!.message.id })
    await expect(missing).rejects.toThrow('帧动画量化 Worker 未返回完整帧')
  })
})

describe('C6 无 Worker 降级到相同纯核', () => {
  test('encode 降级产物是真实 TPFS；quantize 降级直接吸附', async () => {
    vi.stubGlobal('Worker', undefined)
    const encoded = await encodeFrameAnimationInWorker({
      width: 2,
      height: 2,
      defaultFrameMs: 100,
      colorTreatment: 'preserve',
      frames: [{ rgba: new Uint8Array(16).fill(5).buffer }],
    })
    const parsed = parseFrameSequence(encoded)
    expect(parsed.index.width).toBe(2)
    expect(parsed.index.frames).toHaveLength(1)
    expect([...encoded.slice(0, 4)]).toEqual([...'TPFS'].map((c) => c.charCodeAt(0)))

    const out = await quantizeFrameAnimationInWorker({
      width: 2,
      height: 2,
      colors: [
        [255, 0, 0],
        [0, 0, 255],
      ],
      mode: 'nearest',
      frames: [
        new Uint8Array([250, 1, 1, 255, 250, 1, 1, 255, 1, 1, 250, 255, 1, 1, 250, 255]).buffer,
      ],
    })
    expect(out).toHaveLength(1)
    expect(new Uint8Array(out[0]!)).toEqual(
      new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255]),
    )
  })
})
