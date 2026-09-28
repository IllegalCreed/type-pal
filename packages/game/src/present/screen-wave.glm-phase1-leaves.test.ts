/**
 * TEST-GLM-PHASE1-LEAVES-3 L16（screen-wave.ts）— 去重表：
 *  - screen-wave.test（0 态/渐弱累加/自动清零/越界清零/活跃卷动守恒）→ 不重复
 *  - 新差异：advance=false（DM32 fade-only 补帧：像素扭曲但计数/相位不推进）、
 *    卷动循环性（卷出的像素接回行尾、独立手算 shift=trunc(60·w/256)）、
 *    相位跨帧推进（wave[0]→wave[1] 波形滚动）。
 */
import { describe, expect, it } from 'vitest'
import { applyScreenWave, resetScreenWavePhase } from './screen-wave.js'

function waveGs(wave: number, progression: number) {
  return { wScreenWave: wave, sWaveProgression: progression }
}

function rowPattern(): Uint8Array {
  const indices = new Uint8Array(320 * 200)
  for (let x = 0; x < 320; x++) indices[x] = x & 0xff // 行 0 可识别图案
  return indices
}

describe('L16 applyScreenWave 剩余合同', () => {
  it('advance=false（DM32 fade-only 补帧）：像素扭曲但 wScreenWave/progression/相位不推进', () => {
    resetScreenWavePhase()
    const indices = rowPattern()
    const gs = waveGs(64, 8)
    applyScreenWave(indices, gs, false)
    expect(gs.wScreenWave).toBe(64) // 不累加
    expect(gs.sWaveProgression).toBe(8)
    // 像素确实被卷动（行 0 不再是恒等图案）
    let shifted = false
    for (let x = 0; x < 320; x++)
      if (indices[x] !== (x & 0xff)) {
        shifted = true
        break
      }
    expect(shifted).toBe(true)
  })

  it('循环卷动：行 0 整体左移 shift=trunc(60·w/256)，卷出像素接回行尾', () => {
    resetScreenWavePhase()
    const indices = rowPattern()
    const gs = waveGs(128, 0) // 活跃、<256
    // 波形表首相位：b=68-8=60, a=60 → wave[0]=trunc(60*128/256)=30
    applyScreenWave(indices, gs, true)
    for (let x = 0; x < 320; x++) {
      expect(indices[x]).toBe(((x + 30) % 320) & 0xff)
    }
    expect(gs.wScreenWave).toBe(128) // progression 0 → 不变
  })

  it('相位跨帧推进：第二帧行 0 用 wave[1]=trunc(112·w/256)，图案继续滚动', () => {
    resetScreenWavePhase()
    const indices = rowPattern()
    const gs = waveGs(128, 0)
    applyScreenWave(indices, gs, true)
    const afterFirst = new Uint8Array(indices.subarray(0, 320))
    applyScreenWave(indices, gs, true)
    // 第二帧 index=1：b=52, a=112 → wave[1]=trunc(112*128/256)=56；在已左移 30 的内容上
    // 原地再卷 → 等价总左移 86
    for (let x = 0; x < 320; x++) expect(indices[x]).toBe(((x + 86) % 320) & 0xff)
    expect(Array.from(indices.subarray(0, 320))).not.toEqual(Array.from(afterFirst))
  })
})
