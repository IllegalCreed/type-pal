import { expect, test, vi } from 'vitest'
import { deflateBytes, encodeText, inflateBytes } from './__tests__/frame-sequence-test-codecs.mjs'
import { expectRejectUnchanged } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  decodeFrameSequenceBlock,
  decodeFrameSequenceFrame,
  encodeFrameSequenceSync,
  parseFrameSequence,
  validateFrameSequenceIndex,
} from './frame-sequence.js'

const rgba = Uint8Array.of(7, 19, 103, 211)
function container() {
  return encodeFrameSequenceSync(
    { width: 1, height: 1, defaultFrameMs: 40, frames: [{ rgba }] },
    deflateBytes,
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
  expectRejectUnchanged(
    (value) => validateFrameSequenceIndex(value, sequence.payload.length),
    { ...sequence.index, ...patch },
    `TPFS.index${message}`,
  )
})

test('TPFS rejects a missing second block and an oversized last frame count independently', () => {
  const sequence = parseFrameSequence(container())
  const missing = { ...sequence.index, frames: Array.from({ length: 33 }, () => ({})) }
  expect(() => validateFrameSequenceIndex(missing, sequence.payload.length)).toThrow(
    new Error('TPFS.index.blocks: 期望 2 块'),
  )
  const input = {
    ...sequence.index,
    blocks: sequence.index.blocks.map((b) => ({ ...b, frameCount: 2 })),
  }
  const before = deepSnapshot(input)
  expect(() => validateFrameSequenceIndex(input, sequence.payload.length)).toThrow(
    new Error('TPFS.index.blocks[0].frameCount: 期望 1'),
  )
  expect(input).toEqual(before)
})

// Replace only the externally serialized index. The actual deflate payload stays valid.
function replaceIndex(container: Uint8Array, indexBytes: Uint8Array): Uint8Array {
  const { payload } = parseFrameSequence(container)
  const result = new Uint8Array(12 + indexBytes.byteLength + payload.byteLength)
  result.set(container.subarray(0, 12))
  new DataView(result.buffer).setUint32(8, indexBytes.byteLength, true)
  result.set(indexBytes, 12)
  result.set(payload, 12 + indexBytes.byteLength)
  return result
}

test('TPFS accepts a multibyte Unicode extension without changing registered index or pixels', async () => {
  const original = container()
  const sequence = parseFrameSequence(original)
  const input = replaceIndex(
    original,
    encodeText(JSON.stringify({ ...sequence.index, '扩展🧪': 'é中𝄞' })),
  )
  const before = input.slice()
  const parsed = parseFrameSequence(input)
  expect(parsed.index).toEqual(sequence.index)
  expect(parsed.payload).toEqual(sequence.payload)
  expect(await decodeFrameSequenceFrame(parsed, 0, inflateBytes)).toEqual(rgba)
  expect(input).toEqual(before)
})

test.each([
  ['isolated leading continuation', [0x80, 0x7b, 0x7d], '非法 UTF-8 起始字节'],
  ['truncated multibyte sequence', [0xe4, 0xb8], 'UTF-8 序列被截断'],
  ['ASCII where a continuation is required', [0xe4, 0x41, 0x41], '非法 UTF-8 延续字节'],
  ['encoded surrogate', [0xed, 0xa0, 0x80], '非法 UTF-8 码点'],
] as const)('index UTF-8 rejects %s', (_label, bytes, message) => {
  const input = replaceIndex(container(), Uint8Array.from(bytes))
  const before = input.slice()
  expect(() => parseFrameSequence(input)).toThrow(new Error(`TPFS.index: ${message}`))
  expect(input).toEqual(before)
})

test('valid UTF-8 distinguishes malformed JSON from invalid index shape', () => {
  const original = container()
  expect(() => parseFrameSequence(replaceIndex(original, encodeText('{not-json')))).toThrow(
    /^TPFS\.index: 非法 JSON:/,
  )
  expect(() => parseFrameSequence(replaceIndex(original, encodeText('[1,2]')))).toThrow(
    new Error('TPFS.index: 期望对象'),
  )
  expect(() => parseFrameSequence(replaceIndex(original, encodeText('{"version":1}')))).toThrow(
    new Error('TPFS.index.codec: 期望 deflate-rgba8-xor-v1'),
  )
})

test.each([
  -1,
  0.5,
  Number.NaN,
  1,
])('TPFS invalid index %s rejects before any inflation', async (index) => {
  const sequence = parseFrameSequence(container())
  const inflate = vi.fn(inflateBytes)
  await expect(decodeFrameSequenceBlock(sequence, index, inflate)).rejects.toThrow(
    new Error(`TPFS.block: 非法块索引 ${String(index)}`),
  )
  await expect(decodeFrameSequenceFrame(sequence, index, inflate)).rejects.toThrow(
    new Error(`TPFS.frame: 非法帧索引 ${String(index)}`),
  )
  expect(inflate).not.toHaveBeenCalled()
  expect(await decodeFrameSequenceBlock(sequence, 0, inflate)).toEqual([rgba])
  expect(inflate).toHaveBeenCalledOnce()
})

test('single-block coverage starts at frame zero and payload consists of exactly the registered bytes', () => {
  const { index, payload } = parseFrameSequence(container())
  const block = index.blocks[0]!
  const panels = [
    [{ ...block, bytes: payload.length + 1 }, 'TPFS.index.blocks[0]: payload 越界'],
    [{ ...block, firstFrame: 1 }, 'TPFS.index.blocks[0].firstFrame: 帧覆盖不连续，期望 0'],
    [
      { ...block, bytes: payload.length - 1 },
      'TPFS.index.blocks: payload 存在尾随数据或未登记字节',
    ],
  ] as const
  for (const [invalid, message] of panels)
    expectRejectUnchanged(
      (value) => validateFrameSequenceIndex(value, payload.length),
      { ...index, blocks: [invalid] },
      message,
    )
})
