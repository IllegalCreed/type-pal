import { describe, expect, test } from 'vitest'
import { encodeIndexedPng } from './sprite.js'

describe('encodeIndexedPng 输入边界', () => {
  test('width 必须为正数', () => {
    expect(() => encodeIndexedPng(0, 1, new Uint8Array())).toThrow(
      'encodeIndexedPng: invalid dimensions 0x1',
    )
  })

  test('width 必须为整数', () => {
    expect(() => encodeIndexedPng(1.5, 1, new Uint8Array(2))).toThrow(
      'encodeIndexedPng: invalid dimensions 1.5x1',
    )
  })

  test('height 必须为正数', () => {
    expect(() => encodeIndexedPng(1, 0, new Uint8Array())).toThrow(
      'encodeIndexedPng: invalid dimensions 1x0',
    )
  })

  test('height 必须为整数', () => {
    expect(() => encodeIndexedPng(1, 1.5, new Uint8Array(2))).toThrow(
      'encodeIndexedPng: invalid dimensions 1x1.5',
    )
  })

  test('pixels 短于完整帧时显式失败', () => {
    expect(() => encodeIndexedPng(2, 2, new Uint8Array(3))).toThrow(
      'encodeIndexedPng: pixels length 3 < 4',
    )
  })

  test('opaque 短于完整帧时显式失败', () => {
    expect(() => encodeIndexedPng(2, 2, new Uint8Array(4), new Uint8Array(3))).toThrow(
      'encodeIndexedPng: opaque length 3 < 4',
    )
  })
})
