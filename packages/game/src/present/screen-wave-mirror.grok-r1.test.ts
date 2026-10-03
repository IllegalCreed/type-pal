/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G04-A。
 * 调用方 present.ts:316 applyScreenWave(fb.indices, gs, advanceEffects)。
 * 不重复 screen-wave.test 的 0 态/渐弱/到 0 清零/300 清 w/多集守恒，
 * 也不重复 glm 行 0 左移 30、第二帧累计 86、advance=false 在波幅 64 的布尔卷动。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { applyScreenWave, resetScreenWavePhase } from './screen-wave.js'

const W = 320

function rowPattern(): Uint8Array {
  const indices = new Uint8Array(W * 200)
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < W; x++) indices[y * W + x] = x & 0xff
  }
  return indices
}

function expectRowShift(indices: Uint8Array, y: number, shift: number): void {
  const row = y * W
  for (let x = 0; x < W; x++) {
    expect(indices[row + x]).toBe(((x + shift) % W) & 0xff)
  }
}

describe('G04-A screen-wave 镜像与关断', () => {
  beforeEach(() => resetScreenWavePhase())

  it('G04-A01 相位 0 波幅 128 时第 16 行是 320 减 wave[0] 的镜像左移 290', () => {
    const indices = rowPattern()
    const gs = { wScreenWave: 128, sWaveProgression: 0 }
    applyScreenWave(indices, gs, true)
    expectRowShift(indices, 16, 290)
    expect(gs.wScreenWave).toBe(128)
  })

  it('G04-A02 波幅 255 仍卷动，行 0 左移 trunc(60*255/256)=59', () => {
    const indices = rowPattern()
    const gs = { wScreenWave: 255, sWaveProgression: 0 }
    applyScreenWave(indices, gs, true)
    expectRowShift(indices, 0, 59)
    expect(gs.wScreenWave).toBe(255)
  })

  it('G04-A03 波幅 4 时行 0 的偏移表为 0 故不卷，行 7 左移 4', () => {
    const indices = rowPattern()
    const gs = { wScreenWave: 4, sWaveProgression: 0 }
    applyScreenWave(indices, gs, true)
    expectRowShift(indices, 0, 0)
    expectRowShift(indices, 7, 4)
  })

  it('G04-A04 advance=false 且波幅已经是 256 时不卷动也不清零', () => {
    const indices = rowPattern()
    const before = indices.slice()
    const gs = { wScreenWave: 256, sWaveProgression: 7 }
    applyScreenWave(indices, gs, false)
    expect(indices).toEqual(before)
    expect(gs.wScreenWave).toBe(256)
    expect(gs.sWaveProgression).toBe(7)
  })

  it('G04-A05 波幅恰好 256 且 advance=true 时波幅和 progression 都归 0，像素不动', () => {
    const indices = rowPattern()
    const before = indices.slice()
    const gs = { wScreenWave: 256, sWaveProgression: 4 }
    applyScreenWave(indices, gs, true)
    expect(indices).toEqual(before)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
  })

  it('G04-A06 推进一次后 advance=false 停在 wave[1]，连卷两次是 56 再 112', () => {
    const gs = { wScreenWave: 128, sWaveProgression: 0 }
    applyScreenWave(new Uint8Array(W * 200), gs, true)
    const indices = rowPattern()
    applyScreenWave(indices, gs, false)
    expectRowShift(indices, 0, 56)
    applyScreenWave(indices, gs, false)
    expectRowShift(indices, 0, 112)
    expect(gs.wScreenWave).toBe(128)
    expect(gs.sWaveProgression).toBe(0)
  })

  it('G04-A07 先累加再判断，250+10 越过 256 则清零且本帧不卷', () => {
    const indices = rowPattern()
    const before = indices.slice()
    const gs = { wScreenWave: 250, sWaveProgression: 10 }
    applyScreenWave(indices, gs, true)
    expect(indices).toEqual(before)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
  })

  it('G04-A08 advance=false 的活跃波幅 200 行 0 精确左移 46，计数不累加', () => {
    const indices = rowPattern()
    const gs = { wScreenWave: 200, sWaveProgression: 8 }
    applyScreenWave(indices, gs, false)
    expectRowShift(indices, 0, 46)
    expect(gs.wScreenWave).toBe(200)
    expect(gs.sWaveProgression).toBe(8)
  })
})
