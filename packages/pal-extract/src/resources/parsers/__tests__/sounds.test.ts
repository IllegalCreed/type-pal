import { describe, expect, it } from 'vitest'
import { dumpSoundsMetadata } from '../sounds.js'

describe('dumpSoundsMetadata', () => {
  it('returns count + per-chunk size array', () => {
    const result = dumpSoundsMetadata([new Uint8Array(100), new Uint8Array(200), new Uint8Array(0)])
    expect(result.chunkCount).toBe(3)
    expect(result.chunks[0]).toEqual({ index: 0, size: 100, isEmpty: false })
    expect(result.chunks[1]).toEqual({ index: 1, size: 200, isEmpty: false })
    expect(result.chunks[2]).toEqual({ index: 2, size: 0, isEmpty: true })
  })
})
