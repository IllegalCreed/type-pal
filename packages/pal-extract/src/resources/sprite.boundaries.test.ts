import { describe, expect, test } from 'vitest'
import { encodeIndexedPng } from './sprite.js'

describe('encodeIndexedPng 输入边界', () => {
  test('非法尺寸显式失败', () => {
    expect(() => encodeIndexedPng(0, 1, new Uint8Array())).toThrow(
      'encodeIndexedPng: invalid dimensions 0x1',
    )
    expect(() => encodeIndexedPng(1.5, 1, new Uint8Array(2))).toThrow(
      'encodeIndexedPng: invalid dimensions 1.5x1',
    )
  })

  test('pixels/opaque 短于完整帧时显式失败', () => {
    expect(() => encodeIndexedPng(2, 2, new Uint8Array(3))).toThrow(
      'encodeIndexedPng: pixels length 3 < 4',
    )
    expect(() => encodeIndexedPng(2, 2, new Uint8Array(4), new Uint8Array(3))).toThrow(
      'encodeIndexedPng: opaque length 3 < 4',
    )
  })
})
