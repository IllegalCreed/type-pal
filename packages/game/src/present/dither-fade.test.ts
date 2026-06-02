import { describe, it, expect } from 'vitest'
import { applyDitherSteps, DITHER_TOTAL_STEPS } from './dither-fade.js'

// sdlpal nibble-dither(video.c:1130 / battle.c:609):高 nibble 立即取 target,低 nibble 逐 outer 趟 ±1。
describe('applyDitherSteps(nibble dither,video.c:1178 / battle.c:630)', () => {
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
