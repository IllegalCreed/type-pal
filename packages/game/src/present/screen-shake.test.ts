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

describe('applyScreenShake — port sdlpal video.c:571-616', () => {
  it('奇帧(shakeTime=3,level=4):整幅上移 4 行,底部 4 行填黑,shakeTime→2', () => {
    const indices = makeRowMarkedFb()
    const gs = { shakeTime: 3, shakeLevel: 4 }
    applyScreenShake(indices, gs)

    const expected = Buffer.concat([
      Buffer.from(makeRowMarkedFb().subarray(4 * SCREEN_W)),
      Buffer.alloc(4 * SCREEN_W),
    ])
    expect(Buffer.compare(indices, expected)).toBe(0)
    expect(gs.shakeTime).toBe(2)
  })

  it('偶帧(shakeTime=2,level=4):整幅下移 4 行,顶部 4 行填黑,shakeTime→1', () => {
    const indices = makeRowMarkedFb()
    const gs = { shakeTime: 2, shakeLevel: 4 }
    applyScreenShake(indices, gs)

    const expected = Buffer.concat([
      Buffer.alloc(4 * SCREEN_W),
      Buffer.from(makeRowMarkedFb().subarray(0, 196 * SCREEN_W)),
    ])
    expect(Buffer.compare(indices, expected)).toBe(0)
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
    expect(Buffer.compare(indices, before)).toBe(0)
    expect(gs.shakeTime).toBe(2)
  })
})
