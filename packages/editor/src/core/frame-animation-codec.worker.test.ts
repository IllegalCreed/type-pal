import { decodeFrameSequenceFrame, parseFrameSequence } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type {
  FrameAnimationEncodeRequest,
  FrameAnimationQuantizeRequest,
} from './frame-animation-codec.js'

type Request =
  | { id: number; kind: 'encode'; request: FrameAnimationEncodeRequest }
  | { id: number; kind: 'quantize'; request: FrameAnimationQuantizeRequest }

type Reply = { id: number; bytes?: ArrayBuffer; frames?: ArrayBuffer[]; error?: string }

afterEach(() => vi.unstubAllGlobals())

async function openCodecWorker() {
  const replies: { delivered: Reply; sent: Reply; transfer: Transferable[] }[] = []
  const scope: {
    onmessage: ((event: MessageEvent<Request>) => void) | null
    postMessage(reply: Reply, transfer?: Transferable[]): void
  } = {
    onmessage: null,
    postMessage(reply, transfer = []) {
      const delivered = structuredClone(reply, { transfer })
      replies.push({ delivered, sent: reply, transfer })
    },
  }
  vi.stubGlobal('self', scope)
  vi.resetModules()
  await import('./frame-animation-codec.worker.js')
  const receive = scope.onmessage
  if (!receive) throw new Error('Frame codec worker did not register its message handler')
  return {
    send(request: Request) {
      receive(new MessageEvent('message', { data: request }))
    },
    replies,
  }
}

const pixel = (shade: number, alpha = 255) => Uint8Array.of(shade, shade, shade, alpha)

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

test('quantize forwards the requested dithering mode and transfers both full frames in order', async () => {
  const wire = await openCodecWorker()
  wire.send({
    id: 7,
    kind: 'quantize',
    request: {
      width: 2,
      height: 1,
      colors: [
        [0, 0, 0],
        [255, 255, 255],
      ],
      mode: 'floyd-steinberg',
      frames: [
        Uint8Array.of(...pixel(100), ...pixel(100, 128)).buffer,
        Uint8Array.of(...pixel(190), ...pixel(190)).buffer,
      ],
    },
  })

  expect(wire.replies).toHaveLength(1)
  const reply = wire.replies[0]!
  expect(reply.delivered.id).toBe(7)
  expect(reply.delivered.error).toBeUndefined()
  expect(reply.delivered.frames?.map((frame) => [...new Uint8Array(frame)])).toEqual([
    [...pixel(0), ...pixel(255, 128)],
    [...pixel(255), ...pixel(255)],
  ])
  expect(reply.sent.frames?.map((frame) => frame.byteLength)).toEqual([0, 0])
  expect(reply.transfer[0]).toBe(reply.sent.frames?.[0])
  expect(reply.transfer[1]).toBe(reply.sent.frames?.[1])
})

test('encode returns the same request identity and a transferred container with recoverable frames and times', async () => {
  const wire = await openCodecWorker()
  const first = Uint8Array.of(1, 2, 3, 255)
  const second = Uint8Array.of(4, 5, 6, 128)
  wire.send({
    id: 9,
    kind: 'encode',
    request: {
      width: 1,
      height: 1,
      defaultFrameMs: 80,
      colorTreatment: 'preserve',
      frames: [{ rgba: first.buffer, durationMs: 40 }, { rgba: second.buffer }],
    },
  })

  await vi.waitFor(() => expect(wire.replies).toHaveLength(1))
  const reply = wire.replies[0]!
  expect(reply.delivered.id).toBe(9)
  expect(reply.delivered.error).toBeUndefined()
  expect(reply.sent.bytes?.byteLength).toBe(0)
  expect(reply.transfer).toHaveLength(1)
  expect(reply.transfer[0]).toBe(reply.sent.bytes)
  if (!reply.delivered.bytes) throw new Error('Missing encoded frame sequence')
  const container = parseFrameSequence(new Uint8Array(reply.delivered.bytes))
  expect(container.index).toMatchObject({
    width: 1,
    height: 1,
    defaultFrameMs: 80,
    colorTreatment: 'preserve',
  })
  expect(container.index.frames).toEqual([{ durationMs: 40 }, {}])
  await expect(decodeFrameSequenceFrame(container, 0, inflate)).resolves.toEqual(first)
  await expect(decodeFrameSequenceFrame(container, 1, inflate)).resolves.toEqual(second)
})

test('two requests on one worker keep their reply ids paired with their own pixels', async () => {
  const wire = await openCodecWorker()
  for (const [id, gray] of [
    [101, 0],
    [107, 255],
  ] as const) {
    wire.send({
      id,
      kind: 'quantize',
      request: {
        width: 1,
        height: 1,
        colors: [[gray, gray, gray]],
        mode: 'nearest',
        frames: [pixel(100).buffer],
      },
    })
  }
  expect(
    wire.replies.map(({ delivered }) => ({
      id: delivered.id,
      data: delivered.frames?.map((frame) => [...new Uint8Array(frame)]),
    })),
  ).toEqual([
    { id: 101, data: [[0, 0, 0, 255]] },
    { id: 107, data: [[255, 255, 255, 255]] },
  ])
})

test('an empty quantization palette replies with its error and transfers nothing', async () => {
  const wire = await openCodecWorker()
  wire.send({
    id: 8,
    kind: 'quantize',
    request: { width: 1, height: 1, colors: [], mode: 'nearest', frames: [pixel(8).buffer] },
  })
  expect(wire.replies).toEqual([
    {
      delivered: { id: 8, error: '项目标准色彩不能为空' },
      sent: { id: 8, error: '项目标准色彩不能为空' },
      transfer: [],
    },
  ])
})

test('encoding an unchanged frame without its source replies with the frame error and no bytes', async () => {
  const wire = await openCodecWorker()
  wire.send({
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
  await vi.waitFor(() => expect(wire.replies).toHaveLength(1))
  expect(wire.replies[0]?.delivered).toEqual({ id: 10, error: '保存帧 3: 缺旧动画来源' })
  expect(wire.replies[0]?.transfer).toEqual([])
})
