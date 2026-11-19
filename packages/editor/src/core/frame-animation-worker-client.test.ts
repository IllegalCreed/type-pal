import { decodeFrameSequenceBlock, parseFrameSequence } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import {
  encodeFrameAnimationRequest,
  type FrameAnimationEncodeRequest,
  type FrameAnimationQuantizeRequest,
} from './frame-animation-codec.js'
import {
  encodeFrameAnimationInWorker,
  quantizeFrameAnimationInWorker,
} from './frame-animation-worker-client.js'

type Request =
  | { id: number; kind: 'encode'; request: FrameAnimationEncodeRequest }
  | { id: number; kind: 'quantize'; request: FrameAnimationQuantizeRequest }
type Reply = { id: number; bytes?: ArrayBuffer; frames?: ArrayBuffer[]; error?: string }

/** Use real transfer/detachment; replace browser worker scheduling only. */
class WorkerPort {
  static instances: WorkerPort[] = []
  sent?: { original: Request; delivered: Request; transfer: readonly Transferable[] }
  terminated = 0
  onmessage?: (event: { data: Reply }) => void
  onerror?: (event: { message: string }) => void

  constructor(
    readonly url: URL,
    readonly options: WorkerOptions,
  ) {
    WorkerPort.instances.push(this)
  }

  postMessage(original: Request, transfer: Transferable[]): void {
    if (this.sent) throw new Error('Unexpected second request on one worker')
    this.sent = { original, delivered: structuredClone(original, { transfer }), transfer }
  }

  terminate(): void {
    this.terminated++
  }

  reply(data: Reply): void {
    const transfer = data.bytes ? [data.bytes] : (data.frames ?? [])
    this.onmessage?.({ data: structuredClone(data, { transfer }) })
  }

  request() {
    if (!this.sent) throw new Error('Worker did not receive a request')
    return this.sent
  }
}

function installWorker(): void {
  WorkerPort.instances = []
  vi.stubGlobal('Worker', WorkerPort)
}

function worker(index = 0): WorkerPort {
  const result = WorkerPort.instances[index]
  if (!result) throw new Error(`Missing worker ${index}`)
  return result
}

afterEach(() => vi.unstubAllGlobals())

function rgba(red: number, green = 0, blue = 0): ArrayBuffer {
  return Uint8Array.of(red, green, blue, 255).buffer
}

function encodeRequest(pixel = rgba(9)): FrameAnimationEncodeRequest {
  return {
    width: 1,
    height: 1,
    defaultFrameMs: 40,
    colorTreatment: 'preserve',
    frames: [{ rgba: pixel }],
  }
}

function quantizeRequest(frames: readonly ArrayBuffer[]): FrameAnimationQuantizeRequest {
  return {
    width: 1,
    height: 1,
    mode: 'nearest',
    colors: [
      [255, 0, 0],
      [0, 0, 255],
    ],
    frames,
  }
}

function ownBytes(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer
}

test('encode transfers copies of the old sequence and new pixels, preserving the caller and reply bytes', async () => {
  const old = await encodeFrameAnimationRequest(encodeRequest(rgba(11)))
  const source = ownBytes(old)
  const pixel = rgba(23)
  const input = { ...encodeRequest(pixel), source, frames: [{ sourceFrame: 0 }, { rgba: pixel }] }
  installWorker()
  const result = encodeFrameAnimationInWorker(input)
  const port = worker()
  expect(port.url.pathname.endsWith('/frame-animation-codec.worker.ts')).toBe(true)
  expect(port.options.type).toBe('module')
  const { original, delivered, transfer } = port.request()
  if (original.kind !== 'encode' || delivered.kind !== 'encode') throw new Error('Expected encode')
  const forwarded = delivered.request.frames[1]
  if (!forwarded || !('rgba' in forwarded)) throw new Error('Missing forwarded rgba frame')
  expect(
    transfer.map((buffer) => (buffer instanceof ArrayBuffer ? buffer.byteLength : -1)),
  ).toEqual([0, 0])
  expect(new Uint8Array(source)).toEqual(old)
  expect(delivered.request.source && new Uint8Array(delivered.request.source)).toEqual(old)
  expect(new Uint8Array(pixel)).toEqual(Uint8Array.of(23, 0, 0, 255))
  expect(new Uint8Array(forwarded.rgba)).toEqual(Uint8Array.of(23, 0, 0, 255))
  expect(delivered.request.frames[0]).toEqual({ sourceFrame: 0 })
  const encodedReply = await encodeFrameAnimationRequest(delivered.request)
  const bytes = ownBytes(encodedReply)
  port.reply({ id: delivered.id, bytes })
  expect(bytes.byteLength).toBe(0)
  expect(await result).toEqual(encodedReply)
  expect(port.terminated).toBe(1)
})

test('a sequence containing only untouched frames transfers its old container once', async () => {
  const source = ownBytes(await encodeFrameAnimationRequest(encodeRequest(rgba(11))))
  installWorker()
  const result = encodeFrameAnimationInWorker({
    ...encodeRequest(),
    source,
    frames: [{ sourceFrame: 0 }],
  })
  const port = worker()
  const { delivered, transfer } = port.request()
  expect(transfer).toHaveLength(1)
  expect(transfer[0]).not.toBe(source)
  expect(source.byteLength).toBeGreaterThan(0)
  port.reply({ id: delivered.id, bytes: source.slice(0) })
  expect(await result).toEqual(new Uint8Array(source))
})

test('a foreign reply cannot release or settle either of two independent requests', async () => {
  installWorker()
  const settled: number[] = []
  const first = encodeFrameAnimationInWorker(encodeRequest()).then((value) => {
    settled.push(0)
    return value
  })
  const second = encodeFrameAnimationInWorker(encodeRequest(rgba(25))).then((value) => {
    settled.push(1)
    return value
  })
  const a = worker()
  const b = worker(1)
  const aId = a.request().delivered.id
  const bId = b.request().delivered.id
  expect(aId).not.toBe(bId)
  a.reply({ id: bId, bytes: Uint8Array.of(91).buffer })
  await Promise.resolve()
  expect(settled).toEqual([])
  expect([a.terminated, b.terminated]).toEqual([0, 0])
  b.reply({ id: bId, bytes: Uint8Array.of(23).buffer })
  expect(await second).toEqual(Uint8Array.of(23))
  expect(settled).toEqual([1])
  a.reply({ id: aId, bytes: Uint8Array.of(19).buffer })
  expect(await first).toEqual(Uint8Array.of(19))
  expect([a.terminated, b.terminated]).toEqual([1, 1])
})

test('quantize transfers both frames in order and returns both frames without detaching input', async () => {
  installWorker()
  const first = rgba(230, 10, 0)
  const second = rgba(0, 8, 220)
  const result = quantizeFrameAnimationInWorker(quantizeRequest([first, second]))
  const port = worker()
  const { delivered, transfer } = port.request()
  if (delivered.kind !== 'quantize') throw new Error('Expected quantize')
  expect(
    transfer.map((buffer) => (buffer instanceof ArrayBuffer ? buffer.byteLength : -1)),
  ).toEqual([0, 0])
  expect(delivered.request.frames.map((frame) => new Uint8Array(frame))).toEqual([
    Uint8Array.of(230, 10, 0, 255),
    Uint8Array.of(0, 8, 220, 255),
  ])
  expect(new Uint8Array(first)).toEqual(Uint8Array.of(230, 10, 0, 255))
  expect(new Uint8Array(second)).toEqual(Uint8Array.of(0, 8, 220, 255))
  const response = [rgba(255), rgba(0, 0, 255)]
  port.reply({ id: delivered.id, frames: response })
  expect(response.map((frame) => frame.byteLength)).toEqual([0, 0])
  expect(await result).toEqual([Uint8Array.of(255, 0, 0, 255), Uint8Array.of(0, 0, 255, 255)])
  expect(port.terminated).toBe(1)
})

for (const operation of [
  {
    name: 'encode',
    start: () => encodeFrameAnimationInWorker(encodeRequest()),
    missing: '帧动画编码 Worker 未返回数据',
  },
  {
    name: 'quantize',
    start: () => quantizeFrameAnimationInWorker(quantizeRequest([rgba(8)])),
    missing: '帧动画量化 Worker 未返回完整帧',
  },
]) {
  test.each([
    'error reply',
    'missing output',
    'worker error',
  ] as const)(`%s releases a failed pending ${operation.name} worker`, async (failure) => {
    installWorker()
    const result = operation.start()
    const port = worker()
    const id = port.request().delivered.id
    const message = failure === 'missing output' ? operation.missing : 'host halted'
    const rejected = expect(result).rejects.toThrow(message)
    if (failure === 'worker error') port.onerror?.({ message })
    else port.reply(failure === 'error reply' ? { id, error: message } : { id })
    await rejected
    expect(port.terminated).toBe(1)
  })
}

test('without worker support encoding produces an actual sequence containing the original pixel', async () => {
  vi.stubGlobal('Worker', undefined)
  const encoded = await encodeFrameAnimationInWorker(encodeRequest(rgba(9)))
  const sequence = parseFrameSequence(encoded)
  expect(sequence.index).toMatchObject({ width: 1, height: 1, defaultFrameMs: 40, frames: [{}] })
  const decoded = await decodeFrameSequenceBlock(
    sequence,
    0,
    async (data) =>
      new Uint8Array(
        await new Response(
          new Blob([ownBytes(data)]).stream().pipeThrough(new DecompressionStream('deflate')),
        ).arrayBuffer(),
      ),
  )
  expect(decoded).toEqual([Uint8Array.of(9, 0, 0, 255)])
})

test('without worker support quantization snaps an opaque pixel and leaves the input alone', async () => {
  vi.stubGlobal('Worker', undefined)
  const frame = rgba(250, 1, 1)
  const out = await quantizeFrameAnimationInWorker(quantizeRequest([frame]))
  expect(new Uint8Array(frame)).toEqual(Uint8Array.of(250, 1, 1, 255))
  expect(out).toEqual([Uint8Array.of(255, 0, 0, 255)])
})
