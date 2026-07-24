import { describe, expect, test } from 'vitest'
import { allocateP4StageId, classifyP4OwnerCardinality } from './p4-owner-allocation.js'

describe('N3 P4 stable owner allocation primitives', () => {
  test('旧 stage 下标只作为升级证据并显式分配稳定 id', () => {
    expect(allocateP4StageId(0)).toBe('initial')
    expect(allocateP4StageId(1)).toBe('legacy-002')
    expect(allocateP4StageId(27)).toBe('legacy-028')
    expect(() => allocateP4StageId(-1)).toThrow('invalid legacy index')
    expect(() => allocateP4StageId(1.5)).toThrow('invalid legacy index')
  })

  test('单 owner 可吸收，跨 owner 必须转交 P6 且零 owner fail-loud', () => {
    expect(classifyP4OwnerCardinality(1)).toBe('resolved-owner')
    expect(classifyP4OwnerCardinality(2)).toBe('deferred-cross-owner')
    expect(classifyP4OwnerCardinality(3)).toBe('deferred-cross-owner')
    expect(() => classifyP4OwnerCardinality(0)).toThrow('invalid owner count')
  })
})
