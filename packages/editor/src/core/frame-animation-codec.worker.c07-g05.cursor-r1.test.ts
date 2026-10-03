/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C07-G05：frame-animation-codec.worker 真实 handler。
 * 排重：frame-animation-codec.worker.test 已证 quantize/encode 主链 transfer；
 * 本组补：多 id 顺序、双帧 quantize transfer 计数、encode 错误回帖不 transfer。
 */
import { decodeFrameSequenceFrame, parseFrameSequence } from '@type-pal/content'
import { beforeAll, describe, expect, test, vi } from 'vitest'

type WorkerResult = { id: number; bytes?: ArrayBuffer; frames?: ArrayBuffer[]; error?: string }
type WorkerMessage = { id: number; kind: 'encode' | 'quantize'; request: unknown }

const posts: Array<{
  message: WorkerResult
  transfer: Transferable[]
  original: WorkerResult
}> = []
const scope = {
  onmessage: null as ((event: { data: WorkerMessage }) => void) | null,
  postMessage: (message: WorkerResult, transfer?: Transferable[]): void => {
    posts.push({ message: structuredClone(message), transfer: transfer ?? [], original: message })
    structuredClone(message, { transfer: transfer ?? [] })
  },
}

beforeAll(async () => {
  vi.stubGlobal('self', scope)
  vi.resetModules()
  posts.length = 0
  await import('./frame-animation-codec.worker.js')
})

function send(message: WorkerMessage): void {
  scope.onmessage?.({ data: message })
}

async function nextPost(): Promise<(typeof posts)[number]> {
  await vi.waitFor(() => {
    if (posts.length === 0) throw new Error('等待 worker 回帖')
  })
  return posts.shift()!
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

describe('C07-G05 worker handler', () => {
  test('C07-G05-01 quantize 单帧：id 回显且 transfer detach 原缓冲', async () => {
    const frame = new Uint8Array(4).fill(11).buffer
    send({
      id: 101,
      kind: 'quantize',
      request: {
        width: 1,
        height: 1,
        colors: [[255, 0, 0]],
        mode: 'nearest',
        frames: [frame],
      },
    })
    const post = await nextPost()
    expect(post.message.id).toBe(101)
    expect(post.message.frames).toHaveLength(1)
    expect(post.transfer).toHaveLength(1)
    expect(post.original.frames![0]!.byteLength).toBe(0)
  })

  test('C07-G05-02 quantize 双帧：transfer 两条', async () => {
    send({
      id: 102,
      kind: 'quantize',
      request: {
        width: 1,
        height: 1,
        colors: [[0, 255, 0]],
        mode: 'nearest',
        frames: [new Uint8Array(4).fill(1).buffer, new Uint8Array(4).fill(2).buffer],
      },
    })
    const post = await nextPost()
    expect(post.transfer).toHaveLength(2)
    expect(post.message.frames).toHaveLength(2)
  })

  test('C07-G05-03 quantize 空色彩表：error 无 transfer', async () => {
    send({
      id: 103,
      kind: 'quantize',
      request: { width: 1, height: 1, colors: [], mode: 'nearest', frames: [new ArrayBuffer(4)] },
    })
    const post = await nextPost()
    expect(post.message).toEqual({ id: 103, error: '项目标准色彩不能为空' })
    expect(post.transfer).toEqual([])
  })

  test('C07-G05-04 encode 异步回 TPFS：bytes transfer detach', async () => {
    send({
      id: 104,
      kind: 'encode',
      request: {
        width: 1,
        height: 1,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: [{ rgba: new Uint8Array([1, 2, 3, 255]).buffer }],
      },
    })
    const post = await nextPost()
    expect(post.message.error).toBeUndefined()
    expect(post.transfer).toHaveLength(1)
    expect(post.original.bytes!.byteLength).toBe(0)
    const parsed = parseFrameSequence(new Uint8Array(post.message.bytes!))
    expect(parsed.index.frames).toHaveLength(1)
  })

  test('C07-G05-05 encode 缺源 sourceFrame：error 字符串', async () => {
    send({
      id: 105,
      kind: 'encode',
      request: {
        width: 1,
        height: 1,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: [{ sourceFrame: 0 }],
      },
    })
    const post = await nextPost()
    expect(post.message).toEqual({ id: 105, error: '保存帧 0: 缺旧动画来源' })
    expect(post.transfer).toEqual([])
  })

  test('C07-G05-06 encode 两 rgba 帧：durationMs 写入 index', async () => {
    send({
      id: 106,
      kind: 'encode',
      request: {
        width: 1,
        height: 1,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: [
          { rgba: new Uint8Array([9, 9, 9, 255]).buffer, durationMs: 12 },
          { rgba: new Uint8Array([8, 8, 8, 255]).buffer },
        ],
      },
    })
    const post = await nextPost()
    const parsed = parseFrameSequence(new Uint8Array(post.message.bytes!))
    expect(parsed.index.frames).toEqual([{ durationMs: 12 }, {}])
  })

  test('C07-G05-07 encode 回帖 bytes 可解码首帧像素', async () => {
    const pixel = new Uint8Array([3, 4, 5, 255])
    send({
      id: 107,
      kind: 'encode',
      request: {
        width: 1,
        height: 1,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: [{ rgba: pixel.buffer }],
      },
    })
    const post = await nextPost()
    const container = parseFrameSequence(new Uint8Array(post.message.bytes!))
    await expect(decodeFrameSequenceFrame(container, 0, inflate)).resolves.toEqual(pixel)
  })

  test('C07-G05-08 连续 quantize 消息 id 各自回显', async () => {
    send({
      id: 108,
      kind: 'quantize',
      request: {
        width: 1,
        height: 1,
        colors: [[255, 0, 0]],
        mode: 'nearest',
        frames: [new Uint8Array(4).fill(1).buffer],
      },
    })
    send({
      id: 109,
      kind: 'quantize',
      request: {
        width: 1,
        height: 1,
        colors: [[0, 0, 255]],
        mode: 'nearest',
        frames: [new Uint8Array(4).fill(2).buffer],
      },
    })
    const first = await nextPost()
    const second = await nextPost()
    expect(first.message.id).toBe(108)
    expect(second.message.id).toBe(109)
  })

  test('C07-G05-09 quantize floyd-steinberg 单像素吸附', async () => {
    send({
      id: 110,
      kind: 'quantize',
      request: {
        width: 1,
        height: 1,
        colors: [
          [255, 0, 0],
          [0, 0, 255],
        ],
        mode: 'floyd-steinberg',
        frames: [new Uint8Array([250, 3, 3, 255]).buffer],
      },
    })
    const post = await nextPost()
    expect(new Uint8Array(post.message.frames![0]!)).toEqual(new Uint8Array([255, 0, 0, 255]))
  })

  test('C07-G05-10 encode 失败回帖不含 bytes 字段', async () => {
    send({
      id: 111,
      kind: 'encode',
      request: {
        width: 1,
        height: 1,
        defaultFrameMs: 40,
        colorTreatment: 'preserve',
        frames: [{ sourceFrame: 99 }],
      },
    })
    const post = await nextPost()
    expect(post.message.bytes).toBeUndefined()
    expect(post.message.error).toContain('缺旧动画来源')
  })
})
