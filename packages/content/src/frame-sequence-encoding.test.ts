import { expect, test } from 'vitest'
import { deflateBytes, inflateBytes } from './__tests__/frame-sequence-test-codecs.mjs'
import {
  decodeFrameSequenceFrame,
  type EncodeFrameSequenceInput,
  encodeFrameSequenceSync,
  frameSequenceFrameDurationMs,
  parseFrameSequence,
} from './frame-sequence.js'

const first = Uint8Array.of(7, 19, 103, 211)
const second = Uint8Array.of(5, 13, 201, 127)

function frameInput(): EncodeFrameSequenceInput {
  return { width: 1, height: 1, defaultFrameMs: 40, frames: [{ rgba: first.slice() }] }
}

test.each([
  ['zero width', { width: 0 }, 'TPFS.encode.width: 期望不小于 1 的安全整数'],
  ['zero default duration', { defaultFrameMs: 0 }, 'TPFS.encode.defaultFrameMs: 期望正有限数'],
  ['no frames', { frames: [] }, 'TPFS.encode.frames: 期望非空数组'],
  [
    'short RGBA',
    { frames: [{ rgba: Uint8Array.of(1, 2, 3) }] },
    'TPFS.encode.frames[0].rgba: 期望 4 字节',
  ],
  [
    'negative frame duration',
    { frames: [{ rgba: first, durationMs: -1 }] },
    'TPFS.encode.frames[0].durationMs: 期望正有限数',
  ],
] satisfies Array<
  [string, Partial<EncodeFrameSequenceInput>, string]
>)('synchronous encoding rejects %s before compression', (_label, invalid, message) => {
  let compressed = false
  expect(() =>
    encodeFrameSequenceSync({ ...frameInput(), ...invalid }, (bytes) => {
      compressed = true
      return deflateBytes(bytes)
    }),
  ).toThrow(new Error(message))
  expect(compressed).toBe(false)
})

test('synchronous encoding rejects an unsupported color treatment from untyped input', () => {
  const input = frameInput()
  Reflect.set(input, 'colorTreatment', 'vivid')
  expect(() => encodeFrameSequenceSync(input, deflateBytes)).toThrow(
    new Error('TPFS.encode.colorTreatment: 期望 preserve 或 project-standard'),
  )
})

test('encoding preserves frame order, explicit timings and project color policy', async () => {
  const container = encodeFrameSequenceSync(
    {
      ...frameInput(),
      colorTreatment: 'project-standard',
      frames: [{ rgba: first }, { rgba: second, durationMs: 120 }],
    },
    deflateBytes,
  )
  const parsed = parseFrameSequence(container)
  expect(parsed.index.colorTreatment).toBe('project-standard')
  expect(parsed.index.frames).toEqual([{}, { durationMs: 120 }])
  expect(frameSequenceFrameDurationMs(parsed.index, 0)).toBe(40)
  expect(frameSequenceFrameDurationMs(parsed.index, 1)).toBe(120)
  expect(await decodeFrameSequenceFrame(parsed, 0, inflateBytes)).toEqual(first)
  expect(await decodeFrameSequenceFrame(parsed, 1, inflateBytes)).toEqual(second)
})

test('a synchronous encoder stores the compressed bytes of its supplied port', async () => {
  const compressed = deflateBytes(first)
  const checkedInput: Uint8Array[] = []
  const container = encodeFrameSequenceSync(frameInput(), (raw) => {
    checkedInput.push(raw.slice())
    return compressed
  })
  const parsed = parseFrameSequence(container)
  expect(checkedInput).toEqual([first])
  expect(parsed.payload).toEqual(compressed)
  expect(parsed.index.blocks[0]?.bytes).toBe(compressed.byteLength)
  expect(await decodeFrameSequenceFrame(parsed, 0, inflateBytes)).toEqual(first)
})
