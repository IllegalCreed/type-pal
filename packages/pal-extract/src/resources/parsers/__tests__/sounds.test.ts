import { describe, expect, it } from 'vitest'
import { dumpSoundsMetadata } from '../sounds.js'

describe('dumpSoundsMetadata', () => {
  it('returns count + per-chunk size array', () => {
    const result = dumpSoundsMetadata([new Uint8Array(100), new Uint8Array(200), new Uint8Array(0)])
    expect(result).toEqual({
      chunkCount: 3,
      chunks: [
        { index: 0, size: 100, isEmpty: false },
        { index: 1, size: 200, isEmpty: false },
        { index: 2, size: 0, isEmpty: true },
      ],
    })
  })
})
