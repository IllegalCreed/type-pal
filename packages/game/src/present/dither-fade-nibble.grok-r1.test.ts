/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G04-C。
 * 调用方 present.ts 场景 fade 与 present-battle 入场 fade 都走 applyDitherSteps。
 * 不重复 dither-fade.test 的 step0→0xA2、outer1 的 +1→0xA3、72 步收敛。
 */
import { describe, expect, it } from 'vitest'
import { applyDitherSteps } from './dither-fade.js'

describe('G04-C dither 相位与低位回退', () => {
  it('G04-C01 step 1 到 5 按 RG_INDEX 依次碰到下标 3、1、5、2、4', () => {
    const target = new Uint8Array(6).fill(0xa5)
    const backup = new Uint8Array(6).fill(0x32)
    const order = [3, 1, 5, 2, 4]
    for (let n = 0; n < order.length; n++) {
      applyDitherSteps(target, backup, n + 1, n + 2)
      expect(backup[order[n]!] ?? -1).toBe(0xa2)
    }
    expect(Array.from(backup)).toEqual([0x32, 0xa2, 0xa2, 0xa2, 0xa2, 0xa2])
  })

  it('G04-C02 outer 1 的 step 6 把低位 9 减到 8，邻接下标不动', () => {
    const target = new Uint8Array(6).fill(0xa1)
    const backup = new Uint8Array(6).fill(0x39)
    applyDitherSteps(target, backup, 6, 7)
    expect(backup[0]).toBe(0xa8)
    expect(backup[1]).toBe(0x39)
  })

  it('G04-C03 低位已经相等时 outer 1 不加减，只换上 target 高位', () => {
    const target = new Uint8Array(6).fill(0xa5)
    const backup = new Uint8Array(6).fill(0x35)
    applyDitherSteps(target, backup, 6, 7)
    expect(backup[0]).toBe(0xa5)
    expect(backup[1]).toBe(0x35)
  })

  it('G04-C04 outer 0 把更高的 backup 高位直接换成 target 高位', () => {
    const target = new Uint8Array(6).fill(0x15)
    const backup = new Uint8Array(6).fill(0xa9)
    applyDitherSteps(target, backup, 0, 1)
    expect(backup[0]).toBe(0x19)
    expect(backup[1]).toBe(0xa9)
  })

  it('G04-C05 长度超过 6 时同一 step 继续处理 k+6', () => {
    const target = new Uint8Array(8).fill(0xa5)
    const backup = new Uint8Array(8).fill(0x32)
    applyDitherSteps(target, backup, 0, 1)
    expect(backup[0]).toBe(0xa2)
    expect(backup[6]).toBe(0xa2)
    expect(backup[1]).toBe(0x32)
    expect(backup[7]).toBe(0x32)
  })

  it('G04-C06 fromStep 等于 toStep 时不改 backup', () => {
    const target = new Uint8Array([0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa])
    const backup = new Uint8Array([1, 2, 3, 4, 5, 6])
    const before = backup.slice()
    applyDitherSteps(target, backup, 4, 4)
    expect(Array.from(backup)).toEqual(Array.from(before))
  })
})
