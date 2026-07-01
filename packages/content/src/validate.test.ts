import { describe, expect, test } from 'vitest'
import { validateSprites } from './validate.js'

describe('validateSprites', () => {
  test('合法数组 → 原样返回', () => {
    const sprites = [
      { id: 'ghost', spriteNum: 16, label: '游魂' },
      { id: 'oldman', spriteNum: 2, label: '老者' },
    ]
    expect(validateSprites(sprites)).toEqual(sprites)
  })

  test('非数组 → throw', () => {
    expect(() => validateSprites({})).toThrow('期望数组')
  })

  test('缺 spriteNum → throw', () => {
    expect(() => validateSprites([{ id: 'ghost', label: '游魂' }])).toThrow('缺键 "spriteNum"')
  })

  test('spriteNum 非数字 → throw', () => {
    expect(() =>
      validateSprites([{ id: 'ghost', spriteNum: '16', label: '游魂' }]),
    ).toThrow('spriteNum 非number')
  })
})
