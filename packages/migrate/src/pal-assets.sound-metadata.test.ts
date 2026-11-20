import { unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  assertSources,
  json,
  soundFixture,
  soundMetadataPath,
} from './__tests__/pal-asset-fixtures.js'

describe('PAL sound metadata boundaries', () => {
  test('sparse nonempty chunks produce exact source identity and byte totals without touching extracted files', () => {
    const f = soundFixture()
    const result = f.run()
    assertSources(result.binaries)
    expect(result.report).toEqual({ sounds: 2, emptySounds: 503, soundBytes: 96 })
    expect(
      result.binaries.map((s) => [
        s.id,
        s.record.path,
        s.record.origin,
        s.record.kind,
        s.record.mediaType,
      ]),
    ).toEqual([
      [
        'sound.pal.001',
        'assets/migrated/sounds/001.wav',
        { kind: 'legacy-migrated', ref: 'sounds/1.wav' },
        'sound',
        'audio/wav',
      ],
      [
        'sound.pal.045',
        'assets/migrated/sounds/045.wav',
        { kind: 'legacy-migrated', ref: 'sounds/45.wav' },
        'sound',
        'audio/wav',
      ],
    ])
  })
  test.each([
    { value: [1, 2] },
    { value: { chunkCount: '505', chunks: [] } },
    { value: { chunkCount: 505.5, chunks: [] } },
    { value: { chunkCount: 505, chunks: {} } },
  ])('rejects noncanonical root shape $value', ({ value }) => {
    const f = soundFixture()
    json(f.repo, soundMetadataPath, value)
    expect(f.run).toThrow('PAL sounds metadata 期望 {chunkCount,chunks} 对象')
  })
  test('accepts a consistent empty sound corpus without inventing a file', () => {
    const f = soundFixture()
    for (const index of [1, 45]) {
      f.metadata.chunks[index] = { index, size: 0, isEmpty: true }
      unlinkSync(resolve(f.repo, `data/extracted/sounds/${index}.wav`))
    }
    f.manifest.files = []
    f.save()
    expect(f.run()).toEqual({
      binaries: [],
      report: { sounds: 0, emptySounds: 505, soundBytes: 0 },
    })
  })
  test('rejects declared count mismatch independently of fixed census', () => {
    const f = soundFixture()
    f.metadata.chunkCount = 504
    f.save()
    expect(f.run).toThrow('chunkCount=504，chunks=505')
  })
  test('rejects internally consistent but wrong total', () => {
    const f = soundFixture()
    f.metadata.chunkCount = 504
    f.metadata.chunks.pop()
    f.save()
    expect(f.run).toThrow('期望 505 段，收到 504')
  })
  test('rejects an empty chunk whose index does not match its source slot', () => {
    const f = soundFixture()
    f.metadata.chunks[2]!.index = 3
    f.save()
    expect(f.run).toThrow('段号不连续，期望 2，实际 3')
  })
  test.each([-1, 0.5])('rejects illegal chunk size %s', (size) => {
    const f = soundFixture()
    f.metadata.chunks[2]!.size = size
    f.save()
    expect(f.run).toThrow('PAL sound 2: size 非法')
  })
  test.each([0, 'true', true])('rejects invalid nonempty isEmpty flag %j', (isEmpty) => {
    const f = soundFixture()
    const raw = structuredClone(f.metadata)
    json(f.repo, soundMetadataPath, {
      ...raw,
      chunks: raw.chunks.map((c) => (c.index === 1 ? { ...c, isEmpty } : c)),
    })
    expect(f.run).toThrow('PAL sound 1: isEmpty 与 size 不一致')
  })
  test('rejects an empty chunk falsely marked nonempty', () => {
    const f = soundFixture()
    f.metadata.chunks[2]!.isEmpty = false
    f.save()
    expect(f.run).toThrow('PAL sound 2: isEmpty 与 size 不一致')
  })
})
