import { beforeEach, describe, expect, it } from 'vitest'
import { applyScreenWave, resetScreenWavePhase } from './screen-wave.js'

const W = 320
const H = 200

/** 造一个每行 = 行号(mod 256)填充的 320×200 fb,便于检测横向卷动。 */
function makeFb(): Uint8Array {
  const fb = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) fb[y * W + x] = (x + y) & 0xff
  }
  return fb
}

describe('特效 B screen-wave(PAL_ApplyWave port)', () => {
  beforeEach(() => resetScreenWavePhase())

  it('wScreenWave=0 且 sWaveProgression=0 → 无效果,不改像素', () => {
    const fb = makeFb()
    const before = fb.slice()
    const gs = { wScreenWave: 0, sWaveProgression: 0 }
    applyScreenWave(fb, gs)
    expect(fb).toEqual(before)
    expect(gs.wScreenWave).toBe(0)
  })

  it('每帧 wScreenWave += sWaveProgression(渐弱)', () => {
    const fb = makeFb()
    const gs = { wScreenWave: 40, sWaveProgression: -8 }
    applyScreenWave(fb, gs)
    expect(gs.wScreenWave).toBe(32) // 40 + (-8)
  })

  it('wScreenWave 累加到 0 → 自动清零关闭(wave + progression 都归 0)', () => {
    const fb = makeFb()
    const before = fb.slice()
    const gs = { wScreenWave: 8, sWaveProgression: -8 } // += -8 → 0 → 关闭
    applyScreenWave(fb, gs)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
    expect(fb).toEqual(before) // 关闭那帧不卷动
  })

  it('wScreenWave>=256 → 越界清零关闭', () => {
    const fb = makeFb()
    const gs = { wScreenWave: 300, sWaveProgression: 0 }
    applyScreenWave(fb, gs)
    expect(gs.wScreenWave).toBe(0)
  })

  it('活跃波动 → 像素被横向卷动(至少一行发生左移,且像素值集合守恒=循环卷动)', () => {
    const fb = makeFb()
    const before = fb.slice()
    const gs = { wScreenWave: 255, sWaveProgression: 0 }
    applyScreenWave(fb, gs)
    // 整体应有改变(某些行 shift>0)
    expect(fb).not.toEqual(before)
    // 循环卷动 = 每行像素值是原行的旋转 → 整帧像素值多重集守恒(逐行 sort 后相等)
    for (let y = 0; y < H; y++) {
      const a = Array.from(before.subarray(y * W, y * W + W)).sort((p, q) => p - q)
      const b = Array.from(fb.subarray(y * W, y * W + W)).sort((p, q) => p - q)
      expect(b).toEqual(a)
    }
  })
})
