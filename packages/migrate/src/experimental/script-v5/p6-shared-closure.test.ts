import { describe, expect, test } from 'vitest'
import { allocateP6LocalFlowId } from './p6-shared-closure.js'

describe('N3 P6 stable local flow allocation', () => {
  test('owner-local continuation ids are explicit upgrade allocations', () => {
    expect([0, 1, 11].map(allocateP6LocalFlowId)).toEqual([
      'legacy-continuation-001',
      'legacy-continuation-002',
      'legacy-continuation-012',
    ])
    expect(() => allocateP6LocalFlowId(-1)).toThrow('invalid owner-local index')
    expect(() => allocateP6LocalFlowId(1.5)).toThrow('invalid owner-local index')
  })
})
