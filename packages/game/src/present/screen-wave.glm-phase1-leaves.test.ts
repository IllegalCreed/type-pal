/** 原盘负 progression 收尾、循环回卷和跨帧推进；补帧冻结由 mirror A06/A08 精确断言。 */
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
  it('真实 0x71 raw 的负 progression 跨过 0 时立即关断，不用负波幅卷动', () => {
    resetScreenWavePhase()
    const indices = rowPattern()
    const before = indices.slice()
    const gs = waveGs(3, -4) // data/extracted/events/all.json raw operands [255,65532,0] 的收尾形态
    applyScreenWave(indices, gs, true)
    expect(indices).toEqual(before)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
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
