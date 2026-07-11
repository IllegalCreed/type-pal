import { describe, expect, test } from 'vitest'
import { advanceWave, waveTable } from './screen-wave.js'

describe('0x71 世界屏波(一阶段 applyScreenWave 表/推进 1:1)', () => {
  test('32 相位表:a/b 递推峰值 wave[7]=W、谷 wave[15]=0、后半镜像 320−前半', () => {
    const w = 64
    const t = waveTable(w)
    // a 累积序列 60,112,…,256(峰)…,0:wave[i] = trunc(a×W/256)
    expect(t[0]).toBe(Math.trunc((60 * w) / 256)) // 15
    expect(t[7]).toBe(w) // a=256 → 恰为波幅
    expect(t[15]).toBe(0) // a 归零
    for (let i = 0; i < 16; i++) expect(t[i + 16]).toBe(320 - t[i]!) // 镜像
  })

  test('推进:W += 推进量;==0 或 ≥256 → 双清零关闭(scene.c:391-398)', () => {
    const vars: Record<string, number> = { 'sys:screenWave': 255, 'sys:waveProgression': -4 }
    expect(advanceWave(vars)).toBe(251) // 渐弱(蛤蟆谷 [255,−4])
    expect(vars['sys:screenWave']).toBe(251)
    // 静态波(推进 0)恒持
    const still: Record<string, number> = { 'sys:screenWave': 2, 'sys:waveProgression': 0 }
    expect(advanceWave(still)).toBe(2)
    // 越界 ≥256 → 关闭 + 双清零
    const over: Record<string, number> = { 'sys:screenWave': 255, 'sys:waveProgression': 4 }
    expect(advanceWave(over)).toBe(0)
    expect(over['sys:screenWave']).toBe(0)
    expect(over['sys:waveProgression']).toBe(0)
    // 渐弱到 0 → 自灭
    const dying: Record<string, number> = { 'sys:screenWave': 4, 'sys:waveProgression': -4 }
    expect(advanceWave(dying)).toBe(0)
    expect(dying['sys:waveProgression']).toBe(0)
    // 未设 → 0(无脚本世界)
    expect(advanceWave({})).toBe(0)
  })
})
