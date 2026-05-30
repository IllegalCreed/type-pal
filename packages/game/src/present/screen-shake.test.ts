import { describe, expect, it } from 'vitest'
import { applyScreenShake } from './screen-shake.js'

const SCREEN_W = 320
const SCREEN_H = 200

/** 造一个每行像素值 = 行号(0..199)的 320×200 framebuffer,便于断言"哪一行搬到哪一行"。 */
function makeRowMarkedFb(): Uint8Array {
  const indices = new Uint8Array(SCREEN_W * SCREEN_H)
  for (let y = 0; y < SCREEN_H; y++) {
    // 行号 0..199 全落 8-bit 范围,直接当像素值标记。
    indices.fill(y, y * SCREEN_W, (y + 1) * SCREEN_W)
  }
  return indices
}

/** 取第 y 行第 0 列像素(每行同值,代表整行)。 */
function rowVal(indices: Uint8Array, y: number): number {
  return indices[y * SCREEN_W] ?? -1
}

/** 断言第 y 行整行(320 像素)都等于 v。 */
function expectRowAll(indices: Uint8Array, y: number, v: number): void {
  for (let x = 0; x < SCREEN_W; x++) {
    expect(indices[y * SCREEN_W + x]).toBe(v)
  }
}

describe('applyScreenShake — port sdlpal video.c:571-616', () => {
  it('奇帧(shakeTime=3,level=4):整幅上移 4 行,底部 4 行填黑,shakeTime→2', () => {
    const indices = makeRowMarkedFb()
    const gs = { shakeTime: 3, shakeLevel: 4 }
    applyScreenShake(indices, gs)

    // 上移 4:第 0..195 行 = 旧第 4..199 行
    for (let y = 0; y <= 195; y++) {
      expect(rowVal(indices, y)).toBe(y + 4)
    }
    // 底部第 196..199 行全 0(填黑)
    for (let y = 196; y <= 199; y++) {
      expectRowAll(indices, y, 0)
    }
    expect(gs.shakeTime).toBe(2)
  })

  it('偶帧(shakeTime=2,level=4):整幅下移 4 行,顶部 4 行填黑,shakeTime→1', () => {
    const indices = makeRowMarkedFb()
    const gs = { shakeTime: 2, shakeLevel: 4 }
    applyScreenShake(indices, gs)

    // 顶部第 0..3 行全 0(填黑)
    for (let y = 0; y <= 3; y++) {
      expectRowAll(indices, y, 0)
    }
    // 下移 4:第 4..199 行 = 旧第 0..195 行
    for (let y = 4; y <= 199; y++) {
      expect(rowVal(indices, y)).toBe(y - 4)
    }
    expect(gs.shakeTime).toBe(1)
  })

  it('shakeTime 从 N 连调 N 次后归 0(video.c:614 末尾 g_wShakeTime--)', () => {
    const indices = makeRowMarkedFb()
    const N = 5
    const gs = { shakeTime: N, shakeLevel: 4 }
    for (let i = 0; i < N; i++) {
      applyScreenShake(indices, gs)
    }
    expect(gs.shakeTime).toBe(0)
  })

  it('level=0:无可见偏移(整幅不变),但 shakeTime 仍递减', () => {
    const indices = makeRowMarkedFb()
    const before = Uint8Array.from(indices)
    const gs = { shakeTime: 3, shakeLevel: 0 }
    applyScreenShake(indices, gs)
    expect(indices).toEqual(before)
    expect(gs.shakeTime).toBe(2)
  })

  it('奇帧上移搬运无残留:被搬走的源行被新内容覆盖(连续性自洽)', () => {
    // level=10 上移:第 0 行应 = 旧第 10 行,第 189 行 = 旧第 199 行,第 190..199 全 0。
    const indices = makeRowMarkedFb()
    const gs = { shakeTime: 1, shakeLevel: 10 }
    applyScreenShake(indices, gs)
    expect(rowVal(indices, 0)).toBe(10)
    expect(rowVal(indices, 189)).toBe(199)
    for (let y = 190; y <= 199; y++) {
      expectRowAll(indices, y, 0)
    }
    expect(gs.shakeTime).toBe(0)
  })

  it('偶帧下移搬运无残留:第 10 行 = 旧第 0 行,第 199 行 = 旧第 189 行,顶部 0..9 全 0', () => {
    const indices = makeRowMarkedFb()
    const gs = { shakeTime: 2, shakeLevel: 10 }
    applyScreenShake(indices, gs)
    for (let y = 0; y <= 9; y++) {
      expectRowAll(indices, y, 0)
    }
    expect(rowVal(indices, 10)).toBe(0)
    expect(rowVal(indices, 199)).toBe(189)
    expect(gs.shakeTime).toBe(1)
  })
})
