/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G04-B。
 * 调用方 present.ts:714 applyScreenShake(fb.indices, gs, advanceEffects)。
 * 不重复 screen-shake.test 的奇偶 level 4/10、连减到 0、level 0 仍递减。
 */
import { describe, expect, it } from 'vitest'
import { applyScreenShake } from './screen-shake.js'

const W = 320
const H = 200

function marked(): Uint8Array {
  const indices = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) indices.fill(y, y * W, (y + 1) * W)
  return indices
}

function row(indices: Uint8Array, y: number): number {
  return indices[y * W] ?? -1
}

describe('G04-B screen-shake 边界与补帧', () => {
  it('G04-B01 shakeLevel=200 不搬移像素，shakeTime 仍减 1', () => {
    const indices = marked()
    const gs = { shakeTime: 5, shakeLevel: 200 }
    applyScreenShake(indices, gs, true)
    expect(row(indices, 10)).toBe(10)
    expect(row(indices, 199)).toBe(199)
    expect(gs.shakeTime).toBe(4)
  })

  it('G04-B02 奇数帧 level=199 只把最后一行抬到顶，其余行填黑', () => {
    const indices = marked()
    const gs = { shakeTime: 1, shakeLevel: 199 }
    applyScreenShake(indices, gs, true)
    expect(row(indices, 0)).toBe(199)
    expect(row(indices, 1)).toBe(0)
    expect(row(indices, 199)).toBe(0)
    expect(gs.shakeTime).toBe(0)
  })

  it('G04-B03 advance=false 的奇数帧仍上移，shakeTime 保持原值', () => {
    const indices = marked()
    const gs = { shakeTime: 3, shakeLevel: 4 }
    applyScreenShake(indices, gs, false)
    expect(row(indices, 0)).toBe(4)
    expect(row(indices, 195)).toBe(199)
    expect(row(indices, 196)).toBe(0)
    expect(gs.shakeTime).toBe(3)
  })

  it('G04-B04 偶数帧 level=199 顶上 199 行填黑，底行等于改写后的第 0 行', () => {
    const indices = marked()
    indices.fill(8, 0, W)
    const gs = { shakeTime: 2, shakeLevel: 199 }
    applyScreenShake(indices, gs, true)
    expect(row(indices, 0)).toBe(0)
    expect(row(indices, 198)).toBe(0)
    expect(row(indices, 199)).toBe(8)
    expect(gs.shakeTime).toBe(1)
  })

  it('G04-B05 level=1 的奇数帧上移一行，底行填黑', () => {
    const indices = marked()
    const gs = { shakeTime: 7, shakeLevel: 1 }
    applyScreenShake(indices, gs, true)
    expect(row(indices, 0)).toBe(1)
    expect(row(indices, 198)).toBe(199)
    expect(row(indices, 199)).toBe(0)
    expect(gs.shakeTime).toBe(6)
  })

  it('G04-B06 level=256 且 advance=false 时像素和 shakeTime 都不变', () => {
    const indices = marked()
    const gs = { shakeTime: 9, shakeLevel: 256 }
    applyScreenShake(indices, gs, false)
    expect(row(indices, 10)).toBe(10)
    expect(row(indices, 199)).toBe(199)
    expect(gs.shakeTime).toBe(9)
  })
})
