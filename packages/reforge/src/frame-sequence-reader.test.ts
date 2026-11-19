import { expect, test, vi } from 'vitest'
import {
  exampleFrameAsset,
  frameGate,
  frameSequenceBytes,
  listedFrameSequence,
} from './__tests__/frame-sequence-fixture.js'
import { decompressFrameSequenceBlock, FrameSequenceReader } from './frame-animation-player.js'

const longTimeline = Array.from({ length: 70 }, (_, index) => index)

function source(files: ReadonlyMap<string, ArrayBuffer>) {
  return {
    async readBytes(asset: string) {
      const bytes = files.get(asset)
      if (!bytes) throw new DOMException(asset, 'NotFoundError')
      return bytes.slice(0)
    },
  }
}

test('parallel metadata requests share a single catalog read', async () => {
  const bytes = await frameSequenceBytes([0, 1])
  const gate = frameGate()
  const readBytes = vi.fn(async () => {
    await gate.promise
    return bytes.slice(0)
  })
  const reader = new FrameSequenceReader(await listedFrameSequence(bytes, readBytes))
  const first = reader.sequence(exampleFrameAsset)
  const latest = reader.sequence(exampleFrameAsset)
  try {
    expect(latest).toBe(first)
    expect(readBytes).toHaveBeenCalledExactlyOnceWith('assets/authored/opening.tpfs')
    gate.release()
    await expect(first).resolves.toMatchObject({
      index: { width: 1, height: 1, frames: [{}, { durationMs: 75 }] },
    })
  } finally {
    gate.release()
    await Promise.allSettled([first, latest])
  }
})

test('parallel seeks in one block share inflation and still return different frame pixels', async () => {
  const bytes = await frameSequenceBytes(longTimeline)
  const entered = frameGate(),
    release = frameGate()
  const inflate = vi.fn(async (compressed: Uint8Array) => {
    entered.release()
    await release.promise
    return decompressFrameSequenceBlock(compressed)
  })
  const reader = new FrameSequenceReader(await listedFrameSequence(bytes), inflate)
  const first = reader.frame(exampleFrameAsset, 0)
  const seventh = reader.frame(exampleFrameAsset, 7)
  try {
    await entered.promise
    release.release()
    await expect(first).resolves.toMatchObject({ rgba: Uint8Array.of(0, 1, 2, 255) })
    await expect(seventh).resolves.toMatchObject({ rgba: Uint8Array.of(7, 8, 9, 255) })
    expect(inflate).toHaveBeenCalledTimes(1)
    expect(reader.inflightBlockCount).toBe(0)
  } finally {
    release.release()
    await Promise.allSettled([first, seventh])
  }
})

test('loading the third block enforces the default 64 completed frame limit', async () => {
  const files = new Map([['opening', await frameSequenceBytes(longTimeline)]])
  const inflate = vi.fn(decompressFrameSequenceBlock)
  const reader = new FrameSequenceReader(source(files), inflate)
  for (const index of [0, 32, 64]) {
    expect([...(await reader.frame('opening', index)).rgba]).toEqual([
      index,
      index + 1,
      index + 2,
      255,
    ])
  }
  expect(reader.cachedFrameCount).toBe(64)
  expect(inflate).toHaveBeenCalledTimes(3)
})

test('a failed container read is not cached after the file becomes available', async () => {
  const files = new Map<string, ArrayBuffer>()
  const bytes = await frameSequenceBytes(longTimeline)
  const read = vi.fn(source(files).readBytes)
  const reader = new FrameSequenceReader({ readBytes: read })
  await expect(reader.sequence('opening')).rejects.toMatchObject({ name: 'NotFoundError' })
  files.set('opening', bytes)
  expect([...(await reader.frame('opening', 5)).rgba]).toEqual([5, 6, 7, 255])
  expect(read.mock.calls.map(([id]) => id)).toEqual(['opening', 'opening'])
})

test('a failed inflation releases the in-flight slot, letting the same block decode on retry', async () => {
  const files = new Map([['opening', await frameSequenceBytes([0, 1])]])
  const failure = new Error('transient inflater failure')
  const inflate = vi.fn(decompressFrameSequenceBlock).mockRejectedValueOnce(failure)
  const reader = new FrameSequenceReader(source(files), inflate)
  await expect(reader.frame('opening', 0)).rejects.toBe(failure)
  expect(reader.inflightBlockCount).toBe(0)
  expect([...(await reader.frame('opening', 0)).rgba]).toEqual([0, 1, 2, 255])
  expect(inflate).toHaveBeenCalledTimes(2)
  expect(reader.inflightBlockCount).toBe(0)
})

test('rejects invalid cache sizes and out-of-range indexes but reads both ends of the timeline', async () => {
  const files = new Map([['opening', await frameSequenceBytes(longTimeline)]])
  const fileReader = source(files)
  for (const limit of [0, 1.5]) {
    expect(() => new FrameSequenceReader(fileReader, undefined, limit)).toThrow(
      `frameLimit 必须是正整数，收到 ${limit}`,
    )
  }
  const reader = new FrameSequenceReader(fileReader)
  for (const badIndex of [-1, 0.5, 70]) {
    await expect(reader.frame('opening', badIndex)).rejects.toThrow(`帧索引 ${badIndex} 越界`)
  }
  expect([...(await reader.frame('opening', 0)).rgba]).toEqual([0, 1, 2, 255])
  expect([...(await reader.frame('opening', 69)).rgba]).toEqual([69, 70, 71, 255])
})

test('invalidating one completed asset reloads only its replacement; invalidating all discards both', async () => {
  const files = new Map([
    ['a', await frameSequenceBytes([1, 2])],
    ['b', await frameSequenceBytes([4, 5])],
  ])
  const read = vi.fn(source(files).readBytes)
  const reader = new FrameSequenceReader({ readBytes: read })
  expect([...(await reader.frame('a', 0)).rgba]).toEqual([1, 2, 3, 255])
  await reader.frame('b', 0)
  expect(reader.cachedFrameCount).toBe(4)
  files.set('a', await frameSequenceBytes([9]))
  reader.invalidate('a')
  expect(reader.cachedFrameCount).toBe(2)
  expect([...(await reader.frame('b', 0)).rgba]).toEqual([4, 5, 6, 255])
  expect([...(await reader.frame('a', 0)).rgba]).toEqual([9, 10, 11, 255])
  expect(read.mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'a'])
  reader.invalidate()
  expect(reader.cachedFrameCount).toBe(0)
  expect(reader.inflightBlockCount).toBe(0)
  expect([...(await reader.frame('b', 0)).rgba]).toEqual([4, 5, 6, 255])
  expect(read.mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'a', 'b'])
})

test('a hit refreshes LRU recency, leaving the older frame to be decoded again', async () => {
  const files = new Map([
    ['a', await frameSequenceBytes([1, 2])],
    ['b', await frameSequenceBytes([3, 4])],
    ['c', await frameSequenceBytes([5, 6])],
  ])
  const inflate = vi.fn(decompressFrameSequenceBlock)
  const reader = new FrameSequenceReader(source(files), inflate, 3)
  await reader.frame('a', 0)
  await reader.frame('b', 0)
  await reader.frame('a', 1)
  await reader.frame('b', 0)
  expect(inflate).toHaveBeenCalledTimes(2)
  await reader.frame('c', 0)
  expect([...(await reader.frame('b', 0)).rgba]).toEqual([3, 4, 5, 255])
  expect(inflate).toHaveBeenCalledTimes(3)
  expect([...(await reader.frame('a', 0)).rgba]).toEqual([1, 2, 3, 255])
  expect(inflate).toHaveBeenCalledTimes(4)
  expect(reader.cachedFrameCount).toBe(3)
})
