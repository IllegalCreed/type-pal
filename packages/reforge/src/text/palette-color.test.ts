import { describe, expect, test } from 'vitest'
import { colorIndex } from './palette-color.js'

describe('colorIndex', () => {
  test('色名 → palette index(GLM spec §3 真值)', () => {
    expect(colorIndex('default')).toBe(0x4f)
    expect(colorIndex('cyan')).toBe(0x8d)
    expect(colorIndex('red')).toBe(0x1a)
    expect(colorIndex('redAlt')).toBe(0x17)
    expect(colorIndex('yellow')).toBe(0x2d)
  })
})
