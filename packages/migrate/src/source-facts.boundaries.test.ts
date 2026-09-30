import { describe, expect, test } from 'vitest'
import { sceneSlug } from './source-facts.js'

describe('stable source scene identity', () => {
  test('source IDs remain opaque zero-padded strings', () => {
    expect(sceneSlug(0)).toBe('s000')
    expect(sceneSlug(42)).toBe('s042')
    expect(sceneSlug(293)).toBe('s293')
  })
})
