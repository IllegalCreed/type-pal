import { describe, expect, it } from 'vitest'
import { recordingRng } from './scripted-rng.js'

describe('scripted RNG fixture contracts', () => {
  it.each([
    { name: 'exclusive integer upper bound', read: () => recordingRng([3]).range(0, 3) },
    { name: 'inclusive integer upper bound', read: () => recordingRng([4]).rangeInclusive(0, 3) },
    { name: 'fractional integer roll', read: () => recordingRng([1.5]).rangeInclusive(0, 3) },
    {
      name: 'exclusive float upper bound',
      read: () => recordingRng([], [1.125]).rangeFloat(1, 1.125),
    },
  ])('rejects $name instead of silently changing the scripted input', ({ read }) => {
    expect(read).toThrow(RangeError)
  })

  it('preserves legal scripted draws and their immediate interleaving with script events', () => {
    const trace = ['script:before']
    const rng = recordingRng([2, 3], [1.0625], trace)
    expect(rng.range(0, 3)).toBe(2)
    trace.push('script:middle')
    expect(rng.rangeInclusive(0, 3)).toBe(3)
    expect(rng.rangeFloat(1, 1.125)).toBe(1.0625)
    expect(rng.next()).toBe(0)
    expect(trace).toEqual([
      'script:before',
      'rng:range(0,3)',
      'script:middle',
      'rng:rangeInclusive(0,3)',
      'rng:rangeFloat(1,1.125)',
      'rng:next',
    ])
    expect(rng.calls).toEqual(['range(0,3)', 'rangeInclusive(0,3)', 'rangeFloat(1,1.125)', 'next'])
  })

  it('degenerate bounds preserve queued draws for the next nondegenerate call', () => {
    const rng = recordingRng([2], [1.0625])
    expect(rng.range(5, 5)).toBe(5)
    expect(rng.rangeInclusive(9, 8)).toBe(9)
    expect(rng.rangeFloat(4, 4)).toBe(4)
    expect(rng.range(0, 3)).toBe(2)
    expect(rng.rangeFloat(1, 1.125)).toBe(1.0625)
  })
})
