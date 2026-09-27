/**
 * TEST-CURSOR-PURE-WAVE-1 A03：仅 col 越界的锚点。
 * 行越界 / 往返 / 空格锚见 stamp.test.ts。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './cursor-pure-fixtures.js'
import { type StampTemplate, validateStampTemplates } from './stamp.js'

function legalStamp(): StampTemplate {
  return {
    id: 'bush',
    name: '灌木',
    origin: 'authored',
    width: 2,
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: ['tileset-003'],
    layers: [
      {
        id: 'base',
        name: '底',
        tiles: [
          [1, null],
          [null, null],
        ],
        sources: [
          [0, null],
          [null, null],
        ],
      },
    ],
    collision: [
      [1, null],
      [null, null],
    ],
  }
}

describe('A03 stamp 剩余合同', () => {
  test('anchor 仅 col 越界拒绝；同模板 row 合法空格锚通过', () => {
    const ok = legalStamp()
    ok.anchor = { row: 1, col: 1 }
    const okSnap = inputSnap(ok)
    expect(validateStampTemplates([ok])[0]!.anchor).toEqual({ row: 1, col: 1 })
    expect(ok).toEqual(okSnap)

    const overflow = legalStamp()
    overflow.anchor = { row: 0, col: 2 }
    const overflowSnap = inputSnap(overflow)
    expect(() => validateStampTemplates([overflow])).toThrow('锚点超出局部 surface')
    expect(overflow).toEqual(overflowSnap)
    expect(overflow.layers[0]!.tiles[0]![0]).toBe(1)
  })
})
