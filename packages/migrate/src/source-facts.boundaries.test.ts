import { describe, expect, test } from 'vitest'
import { sceneSlug } from './source-facts.js'

describe('stable source scene identity', () => {
  test('uses the fixed PAL scene-ID prefix and three decimal digits', () => {
    expect(sceneSlug(0)).toBe('s000')
    expect(sceneSlug(42)).toBe('s042')
    expect(sceneSlug(293)).toBe('s293')
  })
})
