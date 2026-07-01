import { describe, expect, test } from 'vitest'
import { validateScenes, validateSprites } from './validate.js'

const mkScene = (over: Record<string, unknown> = {}): unknown => ({
  id: 's',
  map: { reuseOriginalMap: 1, room: { col: 0, row: 0, cols: 1, rows: 1 } },
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  dialogues: [],
  ...over,
})

describe('validateScenes · paletteId', () => {
  test('无 paletteId → 通过(可选,缺省 0 由调用方兜)', () => {
    expect(() => validateScenes([mkScene()])).not.toThrow()
  })
  test('paletteId 是 number → 通过', () => {
    expect(() => validateScenes([mkScene({ paletteId: 0 })])).not.toThrow()
  })
  test('paletteId 非 number → throw', () => {
    expect(() => validateScenes([mkScene({ paletteId: '0' })])).toThrow('paletteId 非number')
  })
})

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
