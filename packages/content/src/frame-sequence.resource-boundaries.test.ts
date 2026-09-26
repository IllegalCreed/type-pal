// @ts-expect-error Node-only test host; production content has no Node/DOM library.
import { TextEncoder } from 'node:util'
import { expect, test, vi } from 'vitest'
import { resourceSnapshot } from './__tests__/codex-resource-contract-fixtures.js'
import {
  decodeFrameSequenceBlock,
  decodeFrameSequenceFrame,
  type EncodeFrameSequenceProviderInput,
  encodeFrameSequenceFromProvider,
  encodeFrameSequenceSync,
  parseFrameSequence,
  validateFrameSequenceIndex,
} from './frame-sequence.js'

const rgba = Uint8Array.of(7, 19, 103, 211)
const identity = (bytes: Uint8Array) => bytes.slice()
function container() {
  return encodeFrameSequenceSync(
    { width: 1, height: 1, defaultFrameMs: 40, frames: [{ rgba }] },
    identity,
  )
}

test.each([
  ['version', { version: 2 }, '.version: 期望 1'],
  ['pixel format', { pixelFormat: 'rgb8' }, '.pixelFormat: 期望 rgba8'],
  ['block frames', { blockFrames: 16 }, '.blockFrames: 期望 32'],
  [
    'color policy',
    { colorTreatment: 'guess' },
    '.colorTreatment: 期望 preserve 或 project-standard',
  ],
  ['frame list type', { frames: {} }, '.frames: 期望非空数组'],
  ['frame list empty', { frames: [] }, '.frames: 期望非空数组'],
  ['frame record', { frames: [null] }, '.frames[0]: 期望对象'],
  ['frame duration', { frames: [{ durationMs: 0 }] }, '.frames[0].durationMs: 期望正有限数'],
  ['default duration', { defaultFrameMs: -1 }, '.defaultFrameMs: 期望正有限数'],
  ['block list type', { blocks: {} }, '.blocks: 期望非空数组'],
  ['block list empty', { blocks: [] }, '.blocks: 期望非空数组'],
  ['safe dimensions overflow', { width: Number.MAX_SAFE_INTEGER }, ': 数值溢出'],
])('TPFS independent index boundary: %s', (_label, patch, message) => {
  const sequence = parseFrameSequence(container())
  expect(validateFrameSequenceIndex(sequence.index, 4)).toEqual(sequence.index)
  const input = { ...sequence.index, ...patch }
  const before = resourceSnapshot(input)
  expect(() => validateFrameSequenceIndex(input, 4)).toThrow(new Error(`TPFS.index${message}`))
  expect(input).toEqual(before)
})

test('TPFS rejects a missing second block and an oversized last frame count independently', () => {
  const sequence = parseFrameSequence(container())
  const missing = { ...sequence.index, frames: Array.from({ length: 33 }, () => ({})) }
  expect(() => validateFrameSequenceIndex(missing, 4)).toThrow(
    new Error('TPFS.index.blocks: 期望 2 块'),
  )
  const input = {
    ...sequence.index,
    blocks: sequence.index.blocks.map((b) => ({ ...b, frameCount: 2 })),
  }
  const before = resourceSnapshot(input)
  expect(() => validateFrameSequenceIndex(input, 4)).toThrow(
    new Error('TPFS.index.blocks[0].frameCount: 期望 1'),
  )
  expect(input).toEqual(before)
})

test('TPFS parses a four-byte Unicode extension without changing registered index or payload', async () => {
  const original = container()
  const sequence = parseFrameSequence(original)
  const indexBytes = new TextEncoder().encode(JSON.stringify({ ...sequence.index, '🧪': '𝄞' }))
  const input = new Uint8Array(12 + indexBytes.length + sequence.payload.length)
  input.set(original.subarray(0, 12))
  new DataView(input.buffer).setUint32(8, indexBytes.length, true)
  input.set(indexBytes, 12)
  input.set(sequence.payload, 12 + indexBytes.length)
  const before = input.slice()
  const parsed = parseFrameSequence(input)
  expect(parsed.index).toEqual(sequence.index)
  expect(await decodeFrameSequenceFrame(parsed, 0, identity)).toEqual(rgba)
  expect(input).toEqual(before)
})

test.each([
  -1,
  0.5,
  Number.NaN,
  1,
])('TPFS invalid index %s rejects before any inflation', async (index) => {
  const sequence = parseFrameSequence(container())
  const inflate = vi.fn(identity)
  for (const [pending, message] of [
    [decodeFrameSequenceBlock(sequence, index, inflate), `TPFS.block: 非法块索引 ${String(index)}`],
    [decodeFrameSequenceFrame(sequence, index, inflate), `TPFS.frame: 非法帧索引 ${String(index)}`],
  ] as const) {
    const outcome: unknown = await pending.then(
      () => undefined,
      (error: unknown) => error,
    )
    expect(outcome).toBeInstanceOf(Error)
    expect((outcome as Error).message).toBe(message)
  }
  expect(inflate).not.toHaveBeenCalled()
  expect(await decodeFrameSequenceBlock(sequence, 0, inflate)).toEqual([rgba])
  expect(inflate).toHaveBeenCalledOnce()
})

test('TPFS provider validates metadata before reads and preserves fractional timings and explicit color policy', async () => {
  const frame = vi.fn(async () => rgba.slice())
  const deflate = vi.fn(identity)
  const input: EncodeFrameSequenceProviderInput = {
    width: 1,
    height: 1,
    defaultFrameMs: 0.5,
    colorTreatment: 'project-standard',
    frames: [{ durationMs: 1.5 }],
    frame,
  }
  const good = parseFrameSequence(await encodeFrameSequenceFromProvider(input, deflate))
  expect(good.index).toMatchObject({
    defaultFrameMs: 0.5,
    colorTreatment: 'project-standard',
    frames: [{ durationMs: 1.5 }],
  })
  expect(await decodeFrameSequenceFrame(good, 0, identity)).toEqual(rgba)
  frame.mockClear()
  deflate.mockClear()
  await expect(encodeFrameSequenceFromProvider({ ...input, frames: [] }, deflate)).rejects.toThrow(
    new Error('TPFS.encode.frames: 期望非空数组'),
  )
  await expect(
    encodeFrameSequenceFromProvider({ ...input, frames: [{ durationMs: 0 }] }, deflate),
  ).rejects.toThrow(new Error('TPFS.encode.frames[0].durationMs: 期望正有限数'))
  expect(frame).not.toHaveBeenCalled()
  expect(deflate).not.toHaveBeenCalled()
})

test('TPFS provider failure preserves identity and stops before subsequent reads or compression', async () => {
  const failure = new Error('provider failed')
  const calls: number[] = []
  const deflate = vi.fn(identity)
  const input: EncodeFrameSequenceProviderInput = {
    width: 1,
    height: 1,
    defaultFrameMs: 40,
    frames: [{}, {}, {}],
    frame: async (index) => {
      calls.push(index)
      if (index === 1) throw failure
      return rgba.slice()
    },
  }
  await expect(encodeFrameSequenceFromProvider(input, deflate)).rejects.toBe(failure)
  expect(calls).toEqual([0, 1])
  expect(deflate).not.toHaveBeenCalled()
  expect(input.frames).toEqual([{}, {}, {}])
})
