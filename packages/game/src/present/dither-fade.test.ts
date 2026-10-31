import { describe, expect, it } from 'vitest'
import { applyDitherSteps, DITHER_TOTAL_STEPS } from './dither-fade.js'

describe('nibble dither steps', () => {
  it('step 0(outer 0)仅取 target 高 nibble + backup 低 nibble(rgIndex[0]=0 那条 stride)', () => {
    // 6 像素:target=0xA5,backup=0x32。step 0 处理 k=rgIndex[0]=0,stride 6 → 仅 k=0。
    const target = new Uint8Array([0xa5, 0xa5, 0xa5, 0xa5, 0xa5, 0xa5])
    const backup = new Uint8Array([0x32, 0x32, 0x32, 0x32, 0x32, 0x32])
    applyDitherSteps(target, backup, 0, 1)
    expect(backup[0]).toBe(0xa2) // (0xA5 & 0xF0)=A0 | (0x32 & 0x0F)=2 → 0xA2;outer0 不动低 nibble
    expect(backup[1]).toBe(0x32) // 未到这条 stride
  })

  it('outer>0 低 nibble 朝 target ±1(a低 > b低 → b低+1)', () => {
    // 跑满前 6 step(outer 0 全 6 stride)再 1 step(outer 1, rgIndex[0]=0)。
    const target = new Uint8Array(6).fill(0xa5) // 低 nibble 5
    const backup = new Uint8Array(6).fill(0x32) // 低 nibble 2
    applyDitherSteps(target, backup, 0, 6) // outer 0:全像素 → 0xA2(高 A,低 2)
    expect(Array.from(backup)).toEqual([0xa2, 0xa2, 0xa2, 0xa2, 0xa2, 0xa2])
    applyDitherSteps(target, backup, 6, 7) // outer 1, k=0:低 2<5 → +1 → 3
    expect(backup[0]).toBe(0xa3)
  })

  it('跑满 72 step:低 nibble 差 ≤ 11(11 outer 趟 ±1)→ backup 收敛 = target', () => {
    // sdlpal 只 outer 1-11 做 ±1(11 次)→ 低 nibble 差 ≤ 11 才完全收敛(大差不全收,真值如此)。
    const target = new Uint8Array([0xa5, 0x1a, 0x70, 0xc8]) // 低 5/10/0/8
    const backup = new Uint8Array([0xa0, 0x10, 0x77, 0xc0]) // 低 0/0/7/0,差 ≤ 10
    applyDitherSteps(target, backup, 0, DITHER_TOTAL_STEPS)
    expect(Array.from(backup)).toEqual(Array.from(target))
  })
})

describe('nibble dither phases and interval boundaries', () => {
  it('step 1 到 5 按 RG_INDEX 依次碰到下标 3、1、5、2、4', () => {
    const target = new Uint8Array(6).fill(0xa5)
    const backup = new Uint8Array(6).fill(0x32)
    const expectedByStep = [
      [0x32, 0x32, 0x32, 0xa2, 0x32, 0x32],
      [0x32, 0xa2, 0x32, 0xa2, 0x32, 0x32],
      [0x32, 0xa2, 0x32, 0xa2, 0x32, 0xa2],
      [0x32, 0xa2, 0xa2, 0xa2, 0x32, 0xa2],
      [0x32, 0xa2, 0xa2, 0xa2, 0xa2, 0xa2],
    ]
    for (const [n, expected] of expectedByStep.entries()) {
      applyDitherSteps(target, backup, n + 1, n + 2)
      expect(Array.from(backup)).toEqual(expected)
    }
  })

  it('outer 1 的 step 6 把低位 9 减到 8，邻接下标不动', () => {
    const target = new Uint8Array(6).fill(0xa1)
    const backup = new Uint8Array(6).fill(0x39)
    applyDitherSteps(target, backup, 6, 7)
    expect(backup[0]).toBe(0xa8)
    expect(backup[1]).toBe(0x39)
  })

  it('低位已经相等时 outer 1 不加减，只换上 target 高位', () => {
    const target = new Uint8Array(6).fill(0xa5)
    const backup = new Uint8Array(6).fill(0x35)
    applyDitherSteps(target, backup, 6, 7)
    expect(backup[0]).toBe(0xa5)
    expect(backup[1]).toBe(0x35)
  })

  it('outer 0 把更高的 backup 高位直接换成 target 高位', () => {
    const target = new Uint8Array(6).fill(0x15)
    const backup = new Uint8Array(6).fill(0xa9)
    applyDitherSteps(target, backup, 0, 1)
    expect(backup[0]).toBe(0x19)
    expect(backup[1]).toBe(0xa9)
  })

  it('长度超过 6 时同一 step 继续处理 k+6', () => {
    const target = new Uint8Array(8).fill(0xa5)
    const backup = new Uint8Array(8).fill(0x32)
    applyDitherSteps(target, backup, 0, 1)
    expect(backup[0]).toBe(0xa2)
    expect(backup[6]).toBe(0xa2)
    expect(backup[1]).toBe(0x32)
    expect(backup[7]).toBe(0x32)
  })

  it('fromStep 等于 toStep 时不改 backup', () => {
    const target = new Uint8Array([0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa])
    const backup = new Uint8Array([1, 2, 3, 4, 5, 6])
    const before = backup.slice()
    applyDitherSteps(target, backup, 4, 4)
    expect(Array.from(backup)).toEqual(Array.from(before))
  })
})
