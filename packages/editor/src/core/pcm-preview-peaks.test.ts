import { describe, expect, test } from 'vitest'
import { computePcmPeaks } from './pcm-preview-peaks.js'

describe('PCM peak buckets', () => {
  test('computes deterministic min/max peaks across all channels', () => {
    const peaks = computePcmPeaks(
      [Float32Array.from([-1, 0.5, 0.25, 0]), Float32Array.from([0.2, 1, -0.5, 0])],
      2,
      2,
    )
    expect(peaks.minimums).toEqual([-1, -0.5])
    expect(peaks.maximums).toEqual([1, 0.25])
  })

  test('preserves full-scale constant buckets instead of treating them as empty sentinels', () => {
    expect(computePcmPeaks([Float32Array.from([1, 1])], 1, 1)).toMatchObject({
      minimums: [1],
      maximums: [1],
    })
    expect(computePcmPeaks([Float32Array.from([-1, -1])], 1, 1)).toMatchObject({
      minimums: [-1],
      maximums: [-1],
    })
  })

  test('reports silence when a decoded buffer has no frames', () => {
    const peaks = computePcmPeaks([], 0, 4)
    expect(peaks).toEqual({
      kind: 'pcm-peaks',
      duration: 0,
      minimums: [0, 0, 0, 0],
      maximums: [0, 0, 0, 0],
    })
  })

  test('keeps a single frame visible across all display buckets', () => {
    const peaks = computePcmPeaks([Float32Array.from([0.75])], 0.1, 3)
    expect(peaks.minimums).toEqual([0.75, 0.75, 0.75])
    expect(peaks.maximums).toEqual([0.75, 0.75, 0.75])
  })
})
