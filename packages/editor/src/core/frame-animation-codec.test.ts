import {
  decodeFrameSequenceFrame,
  encodeFrameSequence,
  parseFrameSequence,
} from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import {
  encodeFrameAnimationRequest,
  type FrameAnimationEncodeRequest,
  quantizeFrameAnimationRequest,
} from './frame-animation-codec.js'

const width = 2
const height = 1
const defaults = { width, height, defaultFrameMs: 40, colorTreatment: 'preserve' } as const

const strip = (r: number, g: number, b: number) => Uint8Array.of(r, g, b, 255, b, r, g, 128)
const oldFrame = (index: number) => strip(index + 1, 0, 0)

async function sourceBytes(frameCount: number): Promise<ArrayBuffer> {
  const sequence = await encodeFrameSequence(
    {
      ...defaults,
      frames: Array.from({ length: frameCount }, (_, index) => ({ rgba: oldFrame(index) })),
    },
    async (raw) => {
      const compressed = new Blob([raw.slice().buffer])
        .stream()
        .pipeThrough(new CompressionStream('deflate'))
      return new Uint8Array(await new Response(compressed).arrayBuffer())
    },
  )
  return sequence.slice().buffer
}

function decodeFrames(container: Uint8Array, count: number): Promise<Uint8Array[]> {
  const parsed = parseFrameSequence(container)
  return Promise.all(
    Array.from({ length: count }, (_, index) =>
      decodeFrameSequenceFrame(parsed, index, async (bytes) => {
        const decoded = new Blob([bytes.slice().buffer])
          .stream()
          .pipeThrough(new DecompressionStream('deflate'))
        return new Uint8Array(await new Response(decoded).arrayBuffer())
      }),
    ),
  )
}

afterEach(() => vi.unstubAllGlobals())

test('packs new full frames and their timing into stable bytes without an old container', async () => {
  const pixels = [strip(1, 0, 0), strip(0, 1, 0), strip(0, 0, 1)]
  const request: FrameAnimationEncodeRequest = {
    ...defaults,
    defaultFrameMs: 33,
    frames: pixels.map((rgba, index) => ({
      rgba: rgba.buffer,
      ...(index === 1 ? { durationMs: 50 } : {}),
    })),
  }
  const file = await encodeFrameAnimationRequest(request)
  expect([...file.subarray(0, 4)]).toEqual([84, 80, 70, 83])
  expect(parseFrameSequence(file).index).toMatchObject({
    width,
    height,
    defaultFrameMs: 33,
    colorTreatment: 'preserve',
    frames: [{}, { durationMs: 50 }, {}],
  })
  await expect(decodeFrames(file, 3)).resolves.toEqual(pixels)
  await expect(encodeFrameAnimationRequest(request)).resolves.toEqual(file)
})

function watchDecompressions(): () => number {
  const NativeStream = DecompressionStream
  let decompressions = 0
  vi.stubGlobal(
    'DecompressionStream',
    class extends NativeStream {
      constructor(format: ConstructorParameters<typeof NativeStream>[0]) {
        super(format)
        decompressions++
      }
    },
  )
  return () => decompressions
}

test('reorders old frames across blocks, reuses a retained block, and inserts replacement pixels', async () => {
  const source = await sourceBytes(65)
  const replacement = strip(255, 255, 0)
  const countDecompressions = watchDecompressions()
  const edited = await encodeFrameAnimationRequest({
    ...defaults,
    defaultFrameMs: 50,
    colorTreatment: 'project-standard',
    source,
    frames: [
      { sourceFrame: 0 },
      { sourceFrame: 32 },
      { sourceFrame: 64 },
      { rgba: replacement.buffer, durationMs: 75 },
      { sourceFrame: 33 },
      { sourceFrame: 1 },
    ],
  })
  // 0, 32, 64 visit separate blocks; 33 hits the retained middle block, 1 reopens the first.
  expect(countDecompressions()).toBe(4)
  vi.unstubAllGlobals()
  expect(parseFrameSequence(edited).index).toMatchObject({
    defaultFrameMs: 50,
    colorTreatment: 'project-standard',
    frames: [{}, {}, {}, { durationMs: 75 }, {}, {}],
  })
  await expect(decodeFrames(edited, 6)).resolves.toEqual([
    oldFrame(0),
    oldFrame(32),
    oldFrame(64),
    replacement,
    oldFrame(33),
    oldFrame(1),
  ])
})

test('loading a third source block keeps the middle block available', async () => {
  const source = await sourceBytes(65)
  const countDecompressions = watchDecompressions()
  const edited = await encodeFrameAnimationRequest({
    ...defaults,
    source,
    frames: [{ sourceFrame: 0 }, { sourceFrame: 33 }, { sourceFrame: 64 }, { sourceFrame: 32 }],
  })
  expect(countDecompressions()).toBe(3)
  vi.unstubAllGlobals()
  await expect(decodeFrames(edited, 4)).resolves.toEqual([
    oldFrame(0),
    oldFrame(33),
    oldFrame(64),
    oldFrame(32),
  ])
})

test('an unchanged frame without its container cannot be encoded', async () => {
  await expect(
    encodeFrameAnimationRequest({ ...defaults, frames: [{ sourceFrame: 0 }] }),
  ).rejects.toMatchObject({ message: '保存帧 0: 缺旧动画来源' })
})

test.each([4, -1, 1.5])('rejects unavailable source frame index %s', async (index) => {
  await expect(
    encodeFrameAnimationRequest({
      ...defaults,
      source: await sourceBytes(4),
      frames: [{ sourceFrame: index }],
    }),
  ).rejects.toMatchObject({ message: `保存帧来源索引 ${index} 越界` })
})

test('nearest-color quantization preserves alpha and input pixels and returns separate complete frames', () => {
  const red = Uint8Array.of(250, 1, 0, 128, 4, 6, 8, 0)
  const blue = Uint8Array.of(0, 1, 250, 255, 2, 1, 250, 64)
  const [first, second, repeated] = quantizeFrameAnimationRequest({
    width,
    height,
    colors: [
      [255, 0, 0],
      [0, 0, 255],
    ],
    mode: 'nearest',
    frames: [red.buffer, blue.buffer, red.buffer],
  })
  expect(first && [...new Uint8Array(first)]).toEqual([255, 0, 0, 128, 4, 6, 8, 0])
  expect(second && [...new Uint8Array(second)]).toEqual([0, 0, 255, 255, 0, 0, 255, 64])
  new Uint8Array(first!)[0] = 0
  expect(repeated && [...new Uint8Array(repeated)]).toEqual([255, 0, 0, 128, 4, 6, 8, 0])
  expect([...red]).toEqual([250, 1, 0, 128, 4, 6, 8, 0])
  expect([...blue]).toEqual([0, 1, 250, 255, 2, 1, 250, 64])
})

test('a quantization request with no palette cannot produce asset bytes', () => {
  expect(() =>
    quantizeFrameAnimationRequest({
      width,
      height,
      colors: [],
      mode: 'nearest',
      frames: [strip(1, 1, 1).buffer],
    }),
  ).toThrow('项目标准色彩不能为空')
})

test('an unknown quantization mode from an untyped host is rejected', () => {
  const rawMessage = {
    width,
    height,
    colors: [[255, 0, 0]],
    mode: 'bogus',
    frames: [strip(1, 1, 1).buffer],
  }
  expect(() => Reflect.apply(quantizeFrameAnimationRequest, undefined, [rawMessage])).toThrow(
    '未知量化方式 bogus',
  )
})
