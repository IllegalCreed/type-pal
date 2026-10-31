import { describe, expect, it } from 'vitest'
import { applyScreenShake } from './screen-shake.js'

const SCREEN_WIDTH = 320

const SCREEN_HEIGHT = 200

/** 造一个每行像素值 = 行号(0..199)的 320×200 framebuffer,便于断言"哪一行搬到哪一行"。 */
function rowMarkedPixels(): Uint8Array {
  const indices = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT)
  for (let y = 0; y < SCREEN_HEIGHT; y++) {
    // 行号 0..199 全落 8-bit 范围,直接当像素值标记。
    indices.fill(y, y * SCREEN_WIDTH, (y + 1) * SCREEN_WIDTH)
  }
  return indices
}

function rowStartColor(indices: Uint8Array, y: number): number {
  return indices[y * SCREEN_WIDTH] ?? -1
}

describe('vertical screen shake', () => {
  it('奇帧(shakeTime=3,level=4):整幅上移 4 行,底部 4 行填黑,shakeTime→2', () => {
    const indices = rowMarkedPixels()
    const gs = { shakeTime: 3, shakeLevel: 4 }
    applyScreenShake(indices, gs)

    const expected = Buffer.concat([
      Buffer.from(rowMarkedPixels().subarray(4 * SCREEN_WIDTH)),
      Buffer.alloc(4 * SCREEN_WIDTH),
    ])
    expect(Buffer.compare(indices, expected)).toBe(0)
    expect(gs.shakeTime).toBe(2)
  })

  it('偶帧(shakeTime=2,level=4):整幅下移 4 行,顶部 4 行填黑,shakeTime→1', () => {
    const indices = rowMarkedPixels()
    const gs = { shakeTime: 2, shakeLevel: 4 }
    applyScreenShake(indices, gs)

    const expected = Buffer.concat([
      Buffer.alloc(4 * SCREEN_WIDTH),
      Buffer.from(rowMarkedPixels().subarray(0, 196 * SCREEN_WIDTH)),
    ])
    expect(Buffer.compare(indices, expected)).toBe(0)
    expect(gs.shakeTime).toBe(1)
  })

  it('shakeTime 从 N 连调 N 次后归 0(video.c:614 末尾 g_wShakeTime--)', () => {
    const indices = rowMarkedPixels()
    const N = 5
    const gs = { shakeTime: N, shakeLevel: 4 }
    for (let i = 0; i < N; i++) {
      applyScreenShake(indices, gs)
    }
    expect(gs.shakeTime).toBe(0)
  })

  it('level=0:无可见偏移(整幅不变),但 shakeTime 仍递减', () => {
    const indices = rowMarkedPixels()
    const before = Uint8Array.from(indices)
    const gs = { shakeTime: 3, shakeLevel: 0 }
    applyScreenShake(indices, gs)
    expect(Buffer.compare(indices, before)).toBe(0)
    expect(gs.shakeTime).toBe(2)
  })
})

describe('screen shake boundaries and supplemental frames', () => {
  it('shakeLevel=200 不搬移像素，shakeTime 仍减 1', () => {
    const indices = rowMarkedPixels()
    const gs = { shakeTime: 5, shakeLevel: 200 }
    applyScreenShake(indices, gs, true)
    expect(rowStartColor(indices, 10)).toBe(10)
    expect(rowStartColor(indices, 199)).toBe(199)
    expect(gs.shakeTime).toBe(4)
  })

  it('奇数帧 level=199 只把最后一行抬到顶，其余行填黑', () => {
    const indices = rowMarkedPixels()
    const gs = { shakeTime: 1, shakeLevel: 199 }
    applyScreenShake(indices, gs, true)
    expect(rowStartColor(indices, 0)).toBe(199)
    expect(rowStartColor(indices, 1)).toBe(0)
    expect(rowStartColor(indices, 199)).toBe(0)
    expect(gs.shakeTime).toBe(0)
  })

  it('advance=false 的奇数帧仍上移，shakeTime 保持原值', () => {
    const indices = rowMarkedPixels()
    const gs = { shakeTime: 3, shakeLevel: 4 }
    applyScreenShake(indices, gs, false)
    expect(rowStartColor(indices, 0)).toBe(4)
    expect(rowStartColor(indices, 195)).toBe(199)
    expect(rowStartColor(indices, 196)).toBe(0)
    expect(gs.shakeTime).toBe(3)
  })

  it('偶数帧 level=199 顶上 199 行填黑，底行等于改写后的第 0 行', () => {
    const indices = rowMarkedPixels()
    indices.fill(8, 0, SCREEN_WIDTH)
    const gs = { shakeTime: 2, shakeLevel: 199 }
    applyScreenShake(indices, gs, true)
    expect(rowStartColor(indices, 0)).toBe(0)
    expect(rowStartColor(indices, 198)).toBe(0)
    expect(rowStartColor(indices, 199)).toBe(8)
    expect(gs.shakeTime).toBe(1)
  })

  it('level=1 的奇数帧上移一行，底行填黑', () => {
    const indices = rowMarkedPixels()
    const gs = { shakeTime: 7, shakeLevel: 1 }
    applyScreenShake(indices, gs, true)
    expect(rowStartColor(indices, 0)).toBe(1)
    expect(rowStartColor(indices, 198)).toBe(199)
    expect(rowStartColor(indices, 199)).toBe(0)
    expect(gs.shakeTime).toBe(6)
  })

  it('level=256 且 advance=false 时像素和 shakeTime 都不变', () => {
    const indices = rowMarkedPixels()
    const gs = { shakeTime: 9, shakeLevel: 256 }
    applyScreenShake(indices, gs, false)
    expect(rowStartColor(indices, 10)).toBe(10)
    expect(rowStartColor(indices, 199)).toBe(199)
    expect(gs.shakeTime).toBe(9)
  })
})
