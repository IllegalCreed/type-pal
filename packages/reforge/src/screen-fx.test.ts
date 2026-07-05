import { describe, expect, test } from 'vitest'
import { type ScreenShake, shakeOffsetY, waveOffsets, wavePhase } from './screen-fx.js'

describe('screen-fx(scene.c:364-450 / video.c:571-616 RGBA 等效)', () => {
  test('waveOffsets 偏移表(scene.c:404-417 递推 oracle,amp=128)', () => {
    // a/b 递推:b 从 68 起每次 −8,a 累加;wave[i]=trunc(a·amp/256);后 16 镜像 320−wave[i]
    const w = waveOffsets(128)
    expect(w[0]).toBe(30) // a=60
    expect(w[1]).toBe(56) // a=112
    expect(w[2]).toBe(78) // a=156
    expect(w[3]).toBe(96) // a=192
    expect(w[16]).toBe(320 - 30)
    expect(w[17]).toBe(320 - 56)
    expect(w).toHaveLength(32)
  })

  test('waveOffsets amp 线性缩放(amp=8 鬼降级:首相位 trunc(60·8/256)=1;a 递推末位收敛 0)', () => {
    const w = waveOffsets(8)
    expect(w[0]).toBe(1)
    expect(w[15]).toBe(0) // a 序列 60,112,…,256,…,112,60,0 → 末相位恒 0
    expect(w[7]).toBe(8) // a=256 峰值:trunc(256·8/256)=8
  })

  test('wavePhase:40ms 一拍,32 相位循环(原版 static index 的 time-based 等效)', () => {
    expect(wavePhase(0)).toBe(0)
    expect(wavePhase(39)).toBe(0)
    expect(wavePhase(40)).toBe(1)
    expect(wavePhase(40 * 32)).toBe(0)
  })

  test('shakeOffsetY:活跃期 40ms 拍奇偶交替 ±level,过期/空 = 0', () => {
    const shake: ScreenShake = { untilMs: 1000, level: 3 }
    expect(shakeOffsetY(null, 100)).toBe(0)
    expect(shakeOffsetY(shake, 1000)).toBe(0) // 到期
    expect(shakeOffsetY(shake, 0)).toBe(3) // 偶拍 +
    expect(shakeOffsetY(shake, 40)).toBe(-3) // 奇拍 −
    expect(shakeOffsetY(shake, 80)).toBe(3)
  })
})
