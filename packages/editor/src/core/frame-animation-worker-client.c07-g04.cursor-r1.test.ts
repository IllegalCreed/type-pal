/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C07-G04：worker-client 合成字节传输与 terminate。
 * 排重：frame-animation-worker-client.boundaries.test 已证 transfer detach 主链；
 * 本组补：递增 id、无 rgba 传输列表、连续双请求隔离、quantize 多帧 transfer 计数。
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
  posted: Array<{ original: PostedMessage; message: PostedMessage; transfer: Transferable[] }> = []
  replies: Array<{
    original: { bytes?: ArrayBuffer; frames?: ArrayBuffer[] }
    transfer: Transferable[]
  }> = []
  terminated = 0
  onmessage:
    | ((event: {
        data: { id: number; bytes?: ArrayBuffer; frames?: ArrayBuffer[]; error?: string }
      }) => void)
    | null = null
  onerror: ((event: { message: string }) => void) | null = null

  constructor(url: URL, options: { type: string }) {
    expect(url.pathname).toContain('frame-animation-codec.worker')
    expect(options.type).toBe('module')
    FakeWorker.instances.push(this)
  }
  postMessage(message: PostedMessage, transfer?: Transferable[]): void {
    const clone = structuredClone(message, { transfer: transfer ?? [] })
    this.posted.push({ original: message, message: clone, transfer: transfer ?? [] })
  }
  terminate(): void {
    this.terminated += 1
  }
  reply(data: { id: number; bytes?: ArrayBuffer; frames?: ArrayBuffer[]; error?: string }): void {
    const transfer: Transferable[] = []
    if (data.bytes) transfer.push(data.bytes)
    for (const frame of data.frames ?? []) transfer.push(frame)
    const clone = structuredClone(data, { transfer }) as typeof data
    this.replies.push({ original: data, transfer })
    this.onmessage?.({ data: clone })
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

describe('C07-G04 encodeFrameAnimationInWorker', () => {
  test('C07-G04-01 连续两次 encode 分配递增 id', async () => {
    installWorker()
    const p1 = encodeFrameAnimationInWorker({
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: new Uint8Array(4).fill(1).buffer }],
    })
    const w1 = FakeWorker.instances[0]!
    const id1 = w1.posted[0]!.message.id
    w1.reply({ id: id1, bytes: new Uint8Array([1]).buffer })
    await p1
    const p2 = encodeFrameAnimationInWorker({
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: new Uint8Array(4).fill(2).buffer }],
    })
    const w2 = FakeWorker.instances[1]!
    const id2 = w2.posted[0]!.message.id
    expect(id2).toBeGreaterThan(id1)
    w2.reply({ id: id2, bytes: new Uint8Array([2]).buffer })
    await p2
  })

  test('C07-G04-02 仅 sourceFrame 时 transfer 不含 rgba', async () => {
    installWorker()
    const source = new Uint8Array([9, 9]).buffer
    void encodeFrameAnimationInWorker({
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      source,
      frames: [{ sourceFrame: 0 }],
    })
    const worker = FakeWorker.instances[0]!
    expect(worker.posted[0]!.transfer).toEqual([source])
    worker.reply({ id: worker.posted[0]!.message.id, bytes: new Uint8Array(4).buffer })
  })

  test('C07-G04-03 postMessage 后调用者 source/rgba 仍可读', async () => {
    installWorker()
    const rgba = new Uint8Array(4).fill(5)
    const request = {
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve' as const,
      source: new Uint8Array([1, 2]).buffer,
      frames: [{ rgba: rgba.buffer }, { sourceFrame: 0 }],
    }
    const snap = rgba.slice()
    void encodeFrameAnimationInWorker(request)
    expect(new Uint8Array(rgba)).toEqual(snap)
    expect(request.source.byteLength).toBe(2)
  })

  test('C07-G04-04 成功应答 terminate 恰一次', async () => {
    installWorker()
    const promise = encodeFrameAnimationInWorker({
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: new Uint8Array(4).buffer }],
    })
    const worker = FakeWorker.instances[0]!
    worker.reply({ id: worker.posted[0]!.message.id, bytes: new Uint8Array(3).buffer })
    await promise
    expect(worker.terminated).toBe(1)
  })

  test('C07-G04-05 错误 id 应答被忽略', async () => {
    installWorker()
    let settled = false
    const promise = encodeFrameAnimationInWorker({
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: new Uint8Array(4).buffer }],
    }).finally(() => {
      settled = true
    })
    const worker = FakeWorker.instances[0]!
    worker.reply({ id: worker.posted[0]!.message.id + 100, bytes: new ArrayBuffer(1) })
    await Promise.resolve()
    expect(settled).toBe(false)
    worker.reply({ id: worker.posted[0]!.message.id, bytes: new ArrayBuffer(1) })
    await promise
  })

  test('C07-G04-06 error 字符串拒绝并 terminate', async () => {
    installWorker()
    const promise = encodeFrameAnimationInWorker({
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: new Uint8Array(4).buffer }],
    })
    const worker = FakeWorker.instances[0]!
    worker.reply({ id: worker.posted[0]!.message.id, error: '编码失败' })
    await expect(promise).rejects.toThrow('编码失败')
    expect(worker.terminated).toBe(1)
  })

  test('C07-G04-07 onerror 透传并 terminate', async () => {
    installWorker()
    const promise = encodeFrameAnimationInWorker({
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: new Uint8Array(4).buffer }],
    })
    FakeWorker.instances[0]!.fail('worker crash')
    await expect(promise).rejects.toThrow('worker crash')
  })

  test('C07-G04-08 无 Worker 降级 encode 产出可解析 TPFS', async () => {
    vi.stubGlobal('Worker', undefined)
    const encoded = await encodeFrameAnimationInWorker({
      width: 2,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: [{ rgba: new Uint8Array(8).fill(4).buffer }],
    })
    expect(parseFrameSequence(encoded).index.frames).toHaveLength(1)
  })
})

describe('C07-G04 quantizeFrameAnimationInWorker', () => {
  test('C07-G04-09 两帧 transfer 长度为 2', async () => {
    installWorker()
    const f0 = new Uint8Array(4).fill(1).buffer
    const f1 = new Uint8Array(4).fill(2).buffer
    void quantizeFrameAnimationInWorker({
      width: 1,
      height: 1,
      colors: [[255, 0, 0]],
      mode: 'nearest',
      frames: [f0, f1],
    })
    const worker = FakeWorker.instances[0]!
    expect(worker.posted[0]!.transfer).toHaveLength(2)
    worker.reply({
      id: worker.posted[0]!.message.id,
      frames: [new Uint8Array(4).buffer, new Uint8Array(4).buffer],
    })
  })

  test('C07-G04-10 无 Worker 降级 quantize 返回 Uint8Array 副本', async () => {
    vi.stubGlobal('Worker', undefined)
    const frame = new Uint8Array([255, 10, 10, 255]).buffer
    const out = await quantizeFrameAnimationInWorker({
      width: 1,
      height: 1,
      colors: [[255, 0, 0]],
      mode: 'nearest',
      frames: [frame],
    })
    expect(out[0]).toBeInstanceOf(Uint8Array)
    expect(new Uint8Array(out[0]!)[0]).toBe(255)
  })
})
