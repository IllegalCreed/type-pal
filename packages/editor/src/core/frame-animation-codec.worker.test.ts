/**
 * TEST-EDITOR-IMPORT-CODEC-1 C7：frame-animation-codec.worker 真实 handler。
 * 隔离 self 后动态 import 真实 worker 文件（零产品导出改动）：quantize 同步回帧、
 * encode 异步回 bytes（真实 deflate），两者都真 transfer（回帖缓冲 detach）；
 * 错误以 error 字符串回帖，不抛崩 worker。
 */

import { decodeFrameSequenceFrame, parseFrameSequence } from '@type-pal/content'
import { beforeAll, describe, expect, test, vi } from 'vitest'

type WorkerResult = { id: number; bytes?: ArrayBuffer; frames?: ArrayBuffer[]; error?: string }
type WorkerMessage = { id: number; kind: 'encode' | 'quantize'; request: unknown }

const posts: Array<{
  message: WorkerResult
  transfer: Transferable[]
  /** 产品回帖时的原对象：真实 transfer 后其缓冲应 detach（byteLength 0）。 */
  original: WorkerResult
}> = []
const scope = {
  onmessage: null as ((event: { data: WorkerMessage }) => void) | null,
  postMessage: (message: WorkerResult, transfer?: Transferable[]): void => {
    // 先留一份可检查的克隆，再按真实 transfer 语义移走原缓冲（保留原对象见证 detach）
    posts.push({ message: structuredClone(message), transfer: transfer ?? [], original: message })
    structuredClone(message, { transfer: transfer ?? [] })
  },
}

beforeAll(async () => {
  vi.stubGlobal('self', scope)
  vi.resetModules()
  await import('./frame-animation-codec.worker.js')
  expect(scope.onmessage).toBeTypeOf('function')
})

function send(message: WorkerMessage): void {
  scope.onmessage?.({ data: message })
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function nextPost(): Promise<{
  message: WorkerResult
  transfer: Transferable[]
  original: WorkerResult
}> {
  await vi.waitFor(() => {
    if (posts.length === 0) throw new Error('等待 worker 回帖')
  })
  return posts.shift()!
}

describe('C7 quantize 消息：同步量化、整帧 transfer', () => {
  test('合法请求回完整帧且 transfer detach 原缓冲；错误请求回 error 字符串', async () => {
    const frame = new Uint8Array([250, 1, 1, 255, 1, 1, 250, 255, 250, 1, 1, 255, 1, 1, 250, 255])
      .buffer
    send({
      id: 7,
      kind: 'quantize',
      request: {
        width: 2,
        height: 2,
        colors: [
          [255, 0, 0],
          [0, 0, 255],
        ],
        mode: 'nearest',
        frames: [frame],
      },
    })
    const post = await nextPost()
    expect(post.message.id).toBe(7)
    expect(post.message.error).toBeUndefined()
    expect(post.message.frames).toHaveLength(1)
    expect(new Uint8Array(post.message.frames![0]!)).toEqual(
      new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255]),
    )
    expect(post.transfer.length).toBe(1) // 回帖帧走真 transfer
    // 真实 transfer 见证：产品创建的回帖帧缓冲被移走（detach → byteLength 0）
    expect(post.original.frames![0]!.byteLength).toBe(0)

    send({
      id: 8,
      kind: 'quantize',
      request: { width: 2, height: 2, colors: [], mode: 'nearest', frames: [new ArrayBuffer(16)] },
    })
    const failure = await nextPost()
    expect(failure.message).toEqual({ id: 8, error: '项目标准色彩不能为空' })
    expect(failure.transfer).toEqual([])
  })
})

describe('C7 encode 消息：异步编码、TPFS 往返、错误回帖', () => {
  test('合法请求异步回真实 TPFS bytes（可解析、帧内容还原）', async () => {
    const first = new Uint8Array(16).fill(0x11)
    const second = new Uint8Array(16).fill(0x22)
    send({
      id: 9,
      kind: 'encode',
      request: {
        width: 2,
        height: 2,
        defaultFrameMs: 80,
        colorTreatment: 'preserve',
        frames: [{ rgba: first.slice().buffer, durationMs: 40 }, { rgba: second.slice().buffer }],
      },
    })
    const post = await nextPost()
    expect(post.message.id).toBe(9)
    expect(post.message.error).toBeUndefined()
    expect(post.transfer.length).toBe(1)
    // 真实 transfer 见证：产品回帖的 TPFS bytes 缓冲被移走（detach → byteLength 0）
    expect(post.original.bytes!.byteLength).toBe(0)
    const bytes = post.message.bytes!
    const parsed = parseFrameSequence(new Uint8Array(bytes.slice(0)))
    expect(parsed.index.width).toBe(2)
    expect(parsed.index.frames).toEqual([{ durationMs: 40 }, {}])
    expect(await decodeFrameSequenceFrame(parsed, 0, inflate)).toEqual(first)
    expect(await decodeFrameSequenceFrame(parsed, 1, inflate)).toEqual(second)
  })
  test('encode 内核失败回 error 字符串（缺旧源）', async () => {
    send({
      id: 10,
      kind: 'encode',
      request: {
        width: 2,
        height: 2,
        defaultFrameMs: 80,
        colorTreatment: 'preserve',
        frames: [{ sourceFrame: 3 }],
      },
    })
    const failure = await nextPost()
    expect(failure.message).toEqual({ id: 10, error: '保存帧 3: 缺旧动画来源' })
  })
})
